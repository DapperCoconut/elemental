import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { Husk, HuskWorld } from '../../invasion/Husk';
import { HuskVariantDef } from '../../invasion/HuskVariants';
import { Sfx } from '../../audio';

/**
 * The hazard engine every world boss (and, later, The Amalgam) fights through.
 *
 * The Disgraced King keeps a dozen typed pools — bullets, rings, lanes, mines —
 * each with a cast that pushes entries, an update that resolves them and a draw
 * that paints them. This class is that machinery made generic: the pools live
 * here once, painted through whichever palette the boss def supplies, and both
 * library moves and bespoke signature moves spawn into the same pools.
 *
 * Dodgeability rules are enforced here, where the hazards are born:
 * • Ring waves outrun the player (they travel ≥300 px/s vs 200), so every ring
 *   shares one gap that drifts less than its own half-width per ring.
 * • A mine ring never seals: spawn spacing is kept above twice the trigger radius.
 * • A safe-circle blast places sanctuary at the candidate nearest an ideal
 *   distance, never simply far away — the warning has to cover the run.
 * • Suction is capped well under walk speed. It taxes crossing the room, it
 *   never takes the stick away.
 */

export interface BossPalette {
  main: number;
  lit: number;
  dark: number;
  accent: number;
}

/** The narrow surface the toolkit needs from whoever hosts the fight. */
export interface BossToolkitHost {
  scene: Phaser.Scene;
  readonly W: number;
  readonly H: number;
  player(): Fighter;
  bossX(): number;
  bossY(): number;
  /** Only the `charge` move uses this — hosts that root the body may ignore it. */
  setBossPos(x: number, y: number): void;
  /** True once the fight has stopped dealing damage (victory or defeat beat). */
  stopped(): boolean;
  addEnemy(f: Fighter): void;
  removeEnemy(f: Fighter): void;
  /** Bosses that feed. Capped at the current phase pool by the host. */
  healBoss(amount: number): void;
  spawnHitFlash(x: number, y: number, color: number): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
}

// Shared numbers — the King's tuned figures, kept as the framework's floor.
const RING_REHIT_MS = 420;
const SWEEP_REHIT_MS = 420;
const PLAYER_R = 20;
const MINE_TRIGGER_R = 52;
/** Top of the usable playfield — HUD owns the strip above. */
const FIELD_TOP = 96;
const FIELD_PAD = 44;

interface TBullet {
  x: number; y: number; vx: number; vy: number;
  r: number; damage: number; dieAt: number;
  /** Radians/sec of steering toward the player. 0 = ballistic. */
  turn: number;
  speed: number;
  color: number;
}
interface TLane {
  x: number; y: number; angle: number;
  halfW: number; firesAt: number; endsAt: number; damage: number; dealt: boolean;
}
interface TZone {
  x: number; y: number; radius: number; firesAt: number; damage: number;
  dealt: boolean; slowMult?: number; slowMs?: number;
  /** Falling-strike flavour: draw a plummeting spark above the ring. */
  fall?: boolean; bornAt: number;
  /** Leave a lingering pool on detonation. */
  poolMs?: number; poolDamage?: number;
}
interface TSafeBlast { x: number; y: number; safeR: number; firesAt: number; damage: number; dealt: boolean; bornAt: number }
interface TRing {
  cx: number; cy: number; radius: number; speed: number; maxRadius: number;
  gapCentre: number; gapHalf: number; band: number; damage: number; lastHitAt: number;
}
interface TMine { x: number; y: number; armedAt: number; dieAt: number; spent: boolean; blastR: number; damage: number }
interface TSweep {
  ox: number; oy: number; a0: number; a1: number;
  startsAt: number; endsAt: number; halfW: number; length: number; damage: number; lastHitAt: number;
}
interface TPool { x: number; y: number; radius: number; dieAt: number; damage: number; tickMs: number; lastHitAt: number }
interface TCharge {
  fromX: number; fromY: number; toX: number; toY: number;
  startsAt: number; arrivesAt: number; halfW: number; damage: number; dealt: boolean;
}
interface THealOrb { x: number; y: number; taken: boolean; dieAt: number; amount: number }

/** Boss minions share one baked look (`husk-thrall`) across every Sovereign. */
const THRALL: HuskVariantDef = {
  id: 'thrall', name: 'Thrall', color: 0x2c2438, behavior: 'melee',
  hpMult: 1, speedMult: 1, damageMult: 1, sizeMult: 1,
  minWave: 9999, weight: 0, weightRamp: 0, weightCap: 0,
};
const THRALL_RANGED: HuskVariantDef = { ...THRALL, id: 'thrall', behavior: 'ranged', preferredRange: 290 };

export class BossToolkit {
  private bullets: TBullet[] = [];
  private lanesPool: TLane[] = [];
  private zones: TZone[] = [];
  private safeBlasts: TSafeBlast[] = [];
  private rings: TRing[] = [];
  private minesPool: TMine[] = [];
  private sweeps: TSweep[] = [];
  private pools: TPool[] = [];
  private charges: TCharge[] = [];
  private healOrbs: THealOrb[] = [];
  private adds: Husk[] = [];

  private pullX = 0;
  private pullY = 0;
  private pullUntil = 0;
  private pullStrength = 0;

  private playerSlowMult = 1;
  private playerSlowUntil = 0;

  /** The one knob over every point of damage — def scale × hard scale. */
  damageScale = 1;

  /**
   * Bumped by `clearHazards`. Multi-beat moves (a spiral's emitter, a barrage's
   * stagger) schedule through `schedule()`, which captures the generation at
   * cast time — so a phase transition orphans every pending beat instead of
   * letting it fire into the interlude.
   */
  private generation = 0;

  private readonly huskWorld: HuskWorld = {
    fireShot: (from, tx, ty, damage) => {
      const a = Math.atan2(ty - from.y, tx - from.x);
      this.spawnBullet({
        x: from.x + Math.cos(a) * 22, y: from.y + Math.sin(a) * 22,
        angle: a, speed: 240, damage, lifeMs: 5000,
      });
    },
    summon: () => {},
    healNearbyHusks: () => {},
    telegraph: (x1, y1, x2, y2, color, durationMs) => {
      const g = this.host.scene.add.graphics().setDepth(3);
      g.lineStyle(3, color, 0.75);
      g.lineBetween(x1, y1, x2, y2);
      g.lineStyle(9, color, 0.14);
      g.lineBetween(x1, y1, x2, y2);
      this.host.scene.tweens.add({ targets: g, alpha: 0, duration: durationMs, onComplete: () => g.destroy() });
    },
    findPossessTarget: () => null,
    possess: () => {},
  };

  constructor(
    public readonly host: BossToolkitHost,
    public readonly palette: BossPalette,
    public readonly hard: boolean,
  ) {}

  // ── Convenience reads ────────────────────────────────────────────

  get scene(): Phaser.Scene { return this.host.scene; }
  get W(): number { return this.host.W; }
  get H(): number { return this.host.H; }
  get player(): Fighter { return this.host.player(); }
  get bossX(): number { return this.host.bossX(); }
  get bossY(): number { return this.host.bossY(); }
  get now(): number { return this.host.scene.time.now; }

  /** Clamp a point into the playable field, clear of the HUD strip. */
  clampX(x: number, pad = FIELD_PAD): number { return Phaser.Math.Clamp(x, pad, this.W - pad); }
  clampY(y: number, pad = FIELD_PAD): number { return Phaser.Math.Clamp(y, FIELD_TOP, this.H - pad); }

  angleToPlayer(fromX = this.bossX, fromY = this.bossY): number {
    const p = this.player;
    return Math.atan2(p.y - fromY, p.x - fromX);
  }

  // ── Damage chokepoints ───────────────────────────────────────────

  /** Every point of damage the fight deals passes through here once. */
  hitPlayer(amount: number, x: number, y: number): void {
    const p = this.player;
    if (!p.active || p.hp <= 0 || this.host.stopped()) return;
    p.takeDamage(Math.max(1, Math.round(amount * this.damageScale)));
    this.host.spawnHitFlash(x, y, this.palette.lit);
  }

  /** AoE against the player, plus the visual. */
  explode(x: number, y: number, radius: number, damage: number, color = this.palette.main): void {
    this.boom(x, y, radius, color);
    const p = this.player;
    if (Phaser.Math.Distance.Between(x, y, p.x, p.y) <= radius) this.hitPlayer(damage, p.x, p.y);
  }

  boom(x: number, y: number, radius: number, color = this.palette.main): void {
    const ring = this.scene.add.circle(x, y, radius, color, 0.4).setDepth(18).setScale(0.25);
    this.scene.tweens.add({
      targets: ring, scaleX: 1, scaleY: 1, alpha: 0, duration: 340,
      onComplete: () => ring.destroy(),
    });
  }

  /**
   * Held here and *pulled* by ArenaScene, never written onto the player —
   * ArenaScene rebuilds playerSpeedMult from scratch every frame.
   */
  slowPlayer(mult: number, durationMs: number): void {
    this.playerSlowMult = Math.min(this.playerSlowMult, mult);
    this.playerSlowUntil = Math.max(this.playerSlowUntil, this.now + durationMs);
  }

  getPlayerSpeedMult(): number { return this.playerSlowMult; }

  /** Suction toward a point. Capped well under the player's 200 px/s. */
  pull(x: number, y: number, strengthPxPerSec: number, durationMs: number): void {
    this.pullX = x;
    this.pullY = y;
    this.pullStrength = Math.min(strengthPxPerSec, 130);
    this.pullUntil = this.now + durationMs;
  }

  sfx(name: string): void { Sfx.playAt(name, this.bossX); }

  /** A boss taking some of its health back. Announced — never quietly. */
  healBoss(amount: number, x = this.bossX, y = this.bossY): void {
    if (this.host.stopped()) return;
    this.host.healBoss(amount);
    this.host.showFloatingText(x, y - 26, `+${Math.round(amount)}`, '#8affa0');
  }

  /** A delayed beat that dies with the current volley of hazards. */
  schedule(delayMs: number, fn: () => void): void {
    const gen = this.generation;
    this.scene.time.delayedCall(delayMs, () => {
      if (gen !== this.generation || this.host.stopped()) return;
      fn();
    });
  }

  // ── Spawners ─────────────────────────────────────────────────────

  spawnBullet(o: {
    x: number; y: number; angle: number; speed: number; damage: number;
    lifeMs?: number; r?: number; turn?: number; color?: number;
  }): void {
    this.bullets.push({
      x: o.x, y: o.y,
      vx: Math.cos(o.angle) * o.speed, vy: Math.sin(o.angle) * o.speed,
      r: o.r ?? 5, damage: o.damage, dieAt: this.now + (o.lifeMs ?? 6000),
      turn: o.turn ?? 0, speed: o.speed, color: o.color ?? this.palette.lit,
    });
  }

  /** A telegraphed beam through (x, y) at `angle`, spanning the whole field. */
  spawnLane(o: { x: number; y: number; angle: number; halfW: number; warnMs: number; fireMs?: number; damage: number }): void {
    this.lanesPool.push({
      x: o.x, y: o.y, angle: o.angle, halfW: o.halfW,
      firesAt: this.now + o.warnMs, endsAt: this.now + o.warnMs + (o.fireMs ?? 380),
      damage: o.damage, dealt: false,
    });
  }

  spawnZone(o: {
    x: number; y: number; radius: number; warnMs: number; damage: number;
    slowMult?: number; slowMs?: number; fall?: boolean; poolMs?: number; poolDamage?: number;
  }): void {
    this.zones.push({
      x: this.clampX(o.x), y: this.clampY(o.y), radius: o.radius,
      firesAt: this.now + o.warnMs, damage: o.damage, dealt: false,
      slowMult: o.slowMult, slowMs: o.slowMs, fall: o.fall, bornAt: this.now,
      poolMs: o.poolMs, poolDamage: o.poolDamage,
    });
  }

  /**
   * The whole arena detonates except one circle. The sanctuary is placed at the
   * candidate nearest `idealDist` from the player — 2.6s of warning buys about
   * 520px of run, so "far away" would be a sentence, not a mechanic.
   */
  spawnSanctuary(o: { warnMs: number; damage: number; safeR: number; idealDist?: number }): void {
    const p = this.player;
    const ideal = o.idealDist ?? 380;
    let best: { x: number; y: number } | null = null;
    let bestErr = Infinity;
    for (let i = 0; i < 10; i++) {
      const a = (Math.PI * 2 * i) / 10 + Math.random() * 0.5;
      const d = ideal * (0.75 + Math.random() * 0.5);
      const x = this.clampX(p.x + Math.cos(a) * d, 90);
      const y = this.clampY(p.y + Math.sin(a) * d, 90);
      const err = Math.abs(Phaser.Math.Distance.Between(p.x, p.y, x, y) - ideal);
      if (err < bestErr) { bestErr = err; best = { x, y }; }
    }
    if (!best) return;
    this.safeBlasts.push({
      x: best.x, y: best.y, safeR: o.safeR,
      firesAt: this.now + o.warnMs, damage: o.damage, dealt: false, bornAt: this.now,
    });
  }

  /**
   * One expanding shockwave ring. Callers spawning a volley of rings must share
   * one gap and drift it by less than its half-width per ring — the wave outruns
   * the player, so a gap that jumps is a guaranteed hit.
   *
   * A negative `speed` closes the ring inward instead; pass `startRadius` for
   * where it begins, and it dies once fully collapsed.
   */
  spawnRing(o: {
    cx: number; cy: number; delayMs: number; speed: number;
    gapCentre: number; gapHalf: number; band: number; damage: number;
    startRadius?: number;
  }): void {
    const start = this.now + o.delayMs;
    this.rings.push({
      cx: o.cx, cy: o.cy,
      radius: (o.startRadius ?? 0) - o.speed * (o.delayMs / 1000),
      speed: o.speed,
      maxRadius: Math.hypot(this.W, this.H) * 0.62,
      gapCentre: o.gapCentre, gapHalf: o.gapHalf, band: o.band, damage: o.damage,
      lastHitAt: start,
    });
  }

  spawnMine(o: { x: number; y: number; armMs?: number; lifeMs?: number; blastR?: number; damage: number }): void {
    this.minesPool.push({
      x: this.clampX(o.x), y: this.clampY(o.y),
      armedAt: this.now + (o.armMs ?? 1100), dieAt: this.now + (o.lifeMs ?? 15000),
      spent: false, blastR: o.blastR ?? 86, damage: o.damage,
    });
  }

  /** How many mines fit on a ring of `radius` without sealing it. */
  maxMinesOnRing(radius: number): number {
    return Math.max(3, Math.floor((Math.PI * 2 * radius) / (2 * MINE_TRIGGER_R + 46)));
  }

  spawnSweep(o: {
    ox: number; oy: number; a0: number; a1: number;
    warnMs: number; travelMs: number; halfW: number; damage: number; length?: number;
  }): void {
    this.sweeps.push({
      ox: o.ox, oy: o.oy, a0: o.a0, a1: o.a1,
      startsAt: this.now + o.warnMs, endsAt: this.now + o.warnMs + o.travelMs,
      halfW: o.halfW, length: o.length ?? Math.hypot(this.W, this.H),
      damage: o.damage, lastHitAt: 0,
    });
  }

  spawnPool(o: { x: number; y: number; radius: number; lifeMs: number; damage: number; tickMs?: number }): void {
    this.pools.push({
      x: o.x, y: o.y, radius: o.radius, dieAt: this.now + o.lifeMs,
      damage: o.damage, tickMs: o.tickMs ?? 600, lastHitAt: 0,
    });
  }

  /** The boss body itself, down a telegraphed lane. */
  spawnCharge(o: { toX: number; toY: number; warnMs: number; travelMs: number; halfW: number; damage: number }): void {
    this.charges.push({
      fromX: this.bossX, fromY: this.bossY,
      toX: this.clampX(o.toX, 90), toY: this.clampY(o.toY, 90),
      startsAt: this.now + o.warnMs, arrivesAt: this.now + o.warnMs + o.travelMs,
      halfW: o.halfW, damage: o.damage, dealt: false,
    });
  }

  spawnHealOrb(x: number, y: number, amount: number, lifeMs = 9000): void {
    this.healOrbs.push({
      x: this.clampX(x, 80), y: this.clampY(y, 80),
      taken: false, dieAt: this.now + lifeMs, amount,
    });
  }

  spawnAdd(o: { x: number; y: number; hp: number; speed: number; damage: number; ranged?: boolean; maxAlive?: number }): Husk | null {
    if (this.adds.length >= (o.maxAlive ?? 6)) return null;
    const husk = new Husk(
      this.scene, this.clampX(o.x, 70), this.clampY(o.y, 70),
      o.hp, o.speed, o.damage, 950, o.ranged ? THRALL_RANGED : THRALL,
    );
    husk.world = this.huskWorld;
    this.host.addEnemy(husk);
    this.adds.push(husk);
    husk.once('defeated', () => this.removeAdd(husk));
    this.boom(husk.x, husk.y, 30, this.palette.dark);
    return husk;
  }

  get addCount(): number { return this.adds.length; }

  private removeAdd(husk: Husk): void {
    this.adds = this.adds.filter((h) => h !== husk);
    this.host.removeEnemy(husk);
    if (husk.scene) {
      this.boom(husk.x, husk.y, 26, this.palette.main);
      husk.destroy();
    }
  }

  // ── Update ───────────────────────────────────────────────────────

  update(time: number, delta: number): void {
    const dt = delta / 1000;
    const p = this.player;
    const stopped = this.host.stopped();

    // Bullets — steer, move, cull, hit.
    for (const b of this.bullets) {
      if (b.turn > 0 && p.active) {
        const want = Math.atan2(p.y - b.y, p.x - b.x);
        const cur = Math.atan2(b.vy, b.vx);
        const turned = Phaser.Math.Angle.RotateTo(cur, want, b.turn * dt);
        b.vx = Math.cos(turned) * b.speed;
        b.vy = Math.sin(turned) * b.speed;
      }
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (!stopped && p.active && Phaser.Math.Distance.Between(b.x, b.y, p.x, p.y) < PLAYER_R + b.r) {
        this.hitPlayer(b.damage, b.x, b.y);
        b.dieAt = 0;
      }
    }
    this.bullets = this.bullets.filter((b) =>
      time < b.dieAt && b.x > -60 && b.x < this.W + 60 && b.y > -60 && b.y < this.H + 60);

    // Lanes.
    for (const l of this.lanesPool) {
      if (l.dealt || time < l.firesAt) continue;
      if (time <= l.endsAt && this.pointNearLane(p.x, p.y, l.x, l.y, l.angle) < l.halfW + PLAYER_R * 0.6) {
        l.dealt = true;
        this.hitPlayer(l.damage, p.x, p.y);
      }
    }
    this.lanesPool = this.lanesPool.filter((l) => time < l.endsAt + 220);

    // Zones.
    for (const z of this.zones) {
      if (z.dealt || time < z.firesAt) continue;
      z.dealt = true;
      this.explode(z.x, z.y, z.radius, z.damage);
      if (z.slowMult && z.slowMs && Phaser.Math.Distance.Between(z.x, z.y, p.x, p.y) <= z.radius) {
        this.slowPlayer(z.slowMult, z.slowMs);
      }
      if (z.poolMs && z.poolDamage) {
        this.spawnPool({ x: z.x, y: z.y, radius: z.radius * 1.15, lifeMs: z.poolMs, damage: z.poolDamage });
      }
    }
    this.zones = this.zones.filter((z) => !z.dealt);

    // Sanctuary blasts.
    for (const s of this.safeBlasts) {
      if (s.dealt || time < s.firesAt) continue;
      s.dealt = true;
      this.scene.cameras.main.flash(260, 255, 255, 255);
      this.scene.cameras.main.shake(360, 0.008);
      this.boom(s.x, s.y, s.safeR + 40, this.palette.lit);
      if (Phaser.Math.Distance.Between(s.x, s.y, p.x, p.y) > s.safeR) this.hitPlayer(s.damage, p.x, p.y);
    }
    this.safeBlasts = this.safeBlasts.filter((s) => !s.dealt);

    // Rings.
    for (const r of this.rings) {
      r.radius += r.speed * dt;
      if (stopped || !p.active || r.radius <= 0) continue;
      const d = Phaser.Math.Distance.Between(r.cx, r.cy, p.x, p.y);
      if (Math.abs(d - r.radius) < r.band && time - r.lastHitAt > RING_REHIT_MS) {
        const a = Math.atan2(p.y - r.cy, p.x - r.cx);
        const off = Math.abs(Phaser.Math.Angle.Wrap(a - r.gapCentre));
        if (off > r.gapHalf) {
          r.lastHitAt = time;
          this.hitPlayer(r.damage, p.x, p.y);
        }
      }
    }
    this.rings = this.rings.filter((r) => r.radius < r.maxRadius && r.radius > -r.band);

    // Mines.
    for (const m of this.minesPool) {
      if (m.spent || time < m.armedAt) continue;
      if (Phaser.Math.Distance.Between(m.x, m.y, p.x, p.y) < MINE_TRIGGER_R) {
        m.spent = true;
        this.explode(m.x, m.y, m.blastR, m.damage);
      }
    }
    this.minesPool = this.minesPool.filter((m) => !m.spent && time < m.dieAt);

    // Sweeps.
    for (const s of this.sweeps) {
      if (time < s.startsAt || time > s.endsAt) continue;
      const t = (time - s.startsAt) / (s.endsAt - s.startsAt);
      const a = s.a0 + (s.a1 - s.a0) * t;
      const ex = s.ox + Math.cos(a) * s.length;
      const ey = s.oy + Math.sin(a) * s.length;
      const d = this.pointToSegment(p.x, p.y, s.ox, s.oy, ex, ey);
      if (d < s.halfW + PLAYER_R * 0.6 && time - s.lastHitAt > SWEEP_REHIT_MS) {
        s.lastHitAt = time;
        this.hitPlayer(s.damage, p.x, p.y);
      }
    }
    this.sweeps = this.sweeps.filter((s) => time < s.endsAt + 150);

    // Pools.
    for (const pool of this.pools) {
      if (stopped || !p.active) break;
      if (Phaser.Math.Distance.Between(pool.x, pool.y, p.x, p.y) < pool.radius
        && time - pool.lastHitAt > pool.tickMs) {
        pool.lastHitAt = time;
        this.hitPlayer(pool.damage, p.x, p.y);
      }
    }
    this.pools = this.pools.filter((pool) => time < pool.dieAt);

    // Charges — the body travels, and the travel is the hit.
    for (const c of this.charges) {
      if (time < c.startsAt) continue;
      const t = Phaser.Math.Clamp((time - c.startsAt) / (c.arrivesAt - c.startsAt), 0, 1);
      const bx = c.fromX + (c.toX - c.fromX) * t;
      const by = c.fromY + (c.toY - c.fromY) * t;
      this.host.setBossPos(bx, by);
      if (!c.dealt && Phaser.Math.Distance.Between(bx, by, p.x, p.y) < c.halfW + PLAYER_R) {
        c.dealt = true;
        this.hitPlayer(c.damage, p.x, p.y);
        this.slowPlayer(0.6, 700);
      }
    }
    this.charges = this.charges.filter((c) => time < c.arrivesAt);

    // Heal orbs.
    for (const o of this.healOrbs) {
      if (o.taken) continue;
      if (p.active && Phaser.Math.Distance.Between(o.x, o.y, p.x, p.y) < 34) {
        o.taken = true;
        p.heal(o.amount);
        this.host.showFloatingText(o.x, o.y, `+${o.amount}`, '#7cf58a');
      }
    }
    this.healOrbs = this.healOrbs.filter((o) => !o.taken && time < o.dieAt);

    // Suction.
    if (time < this.pullUntil && this.pullStrength > 0 && p.active && p.hp > 0 && !stopped) {
      const dx = this.pullX - p.x;
      const dy = this.pullY - p.y;
      const d = Math.hypot(dx, dy);
      if (d > 30) {
        const step = this.pullStrength * dt;
        p.x = Phaser.Math.Clamp(p.x + (dx / d) * step, 40, this.W - 40);
        p.y = Phaser.Math.Clamp(p.y + (dy / d) * step, 40, this.H - 40);
      }
    }

    // Slow expiry.
    if (this.playerSlowUntil > 0 && time >= this.playerSlowUntil) {
      this.playerSlowUntil = 0;
      this.playerSlowMult = 1;
    }
  }

  private pointNearLane(px: number, py: number, lx: number, ly: number, angle: number): number {
    // Distance from a point to an infinite line through (lx, ly) at `angle`.
    const nx = -Math.sin(angle);
    const ny = Math.cos(angle);
    return Math.abs((px - lx) * nx + (py - ly) * ny);
  }

  private pointToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len2 = dx * dx + dy * dy;
    if (len2 === 0) return Math.hypot(px - x1, py - y1);
    const t = Phaser.Math.Clamp(((px - x1) * dx + (py - y1) * dy) / len2, 0, 1);
    return Math.hypot(px - (x1 + dx * t), py - (y1 + dy * t));
  }

  // ── Drawing ──────────────────────────────────────────────────────

  /** Telegraphs and floor hazards — painted under the fighters. */
  drawGround(g: Phaser.GameObjects.Graphics, time: number): void {
    const P = this.palette;

    for (const pool of this.pools) {
      const left = (pool.dieAt - time) / 1000;
      const a = Math.min(0.34, 0.1 + left * 0.05);
      g.fillStyle(P.dark, a);
      g.fillCircle(pool.x, pool.y, pool.radius);
      g.lineStyle(1.5, P.main, a + 0.15);
      g.strokeCircle(pool.x, pool.y, pool.radius * (0.86 + Math.sin(time / 300) * 0.06));
    }

    for (const z of this.zones) {
      const charge = Phaser.Math.Clamp(1 - (z.firesAt - time) / Math.max(1, z.firesAt - z.bornAt), 0, 1);
      g.lineStyle(2, P.lit, 0.3 + charge * 0.55);
      g.strokeCircle(z.x, z.y, z.radius);
      g.fillStyle(P.main, 0.08 + charge * 0.2);
      g.fillCircle(z.x, z.y, z.radius * charge);
      if (z.fall) {
        const h = (1 - charge) * 160;
        g.fillStyle(P.lit, 0.9);
        g.fillCircle(z.x, z.y - h - 8, 4.5);
      }
    }

    for (const s of this.safeBlasts) {
      const charge = Phaser.Math.Clamp(1 - (s.firesAt - time) / Math.max(1, s.firesAt - s.bornAt), 0, 1);
      g.fillStyle(P.dark, 0.1 + charge * 0.24);
      g.fillRect(0, 0, this.W, this.H);
      const pulse = 1 + Math.sin(time / 120) * 0.02;
      g.fillStyle(0x000000, 0);
      g.lineStyle(3, 0xd8ffd8, 0.5 + charge * 0.5);
      g.strokeCircle(s.x, s.y, s.safeR * pulse);
      g.lineStyle(1.5, 0xd8ffd8, 0.35);
      g.strokeCircle(s.x, s.y, s.safeR * 0.72);
    }

    for (const l of this.lanesPool) {
      const live = time >= l.firesAt;
      const dx = Math.cos(l.angle) * 1400;
      const dy = Math.sin(l.angle) * 1400;
      if (!live) {
        g.lineStyle(2, P.lit, 0.55);
        g.lineBetween(l.x - dx, l.y - dy, l.x + dx, l.y + dy);
        g.lineStyle(l.halfW * 2, P.main, 0.1);
        g.lineBetween(l.x - dx, l.y - dy, l.x + dx, l.y + dy);
      } else {
        g.lineStyle(l.halfW * 2, P.lit, 0.75);
        g.lineBetween(l.x - dx, l.y - dy, l.x + dx, l.y + dy);
        g.lineStyle(l.halfW * 0.7, 0xffffff, 0.8);
        g.lineBetween(l.x - dx, l.y - dy, l.x + dx, l.y + dy);
      }
    }

    for (const m of this.minesPool) {
      const armed = time >= m.armedAt;
      const blink = armed && Math.floor(time / 240) % 2 === 0;
      g.fillStyle(armed ? P.lit : P.dark, armed ? 0.9 : 0.6);
      g.fillCircle(m.x, m.y, 7);
      g.lineStyle(1.5, blink ? 0xffffff : P.main, armed ? 0.9 : 0.4);
      g.strokeCircle(m.x, m.y, 11 + Math.sin(time / 200) * 1.5);
    }

    for (const r of this.rings) {
      if (r.radius <= 0) continue;
      g.lineStyle(r.band, P.main, 0.4);
      this.strokeGappedRing(g, r);
      g.lineStyle(2, P.lit, 0.85);
      this.strokeGappedRing(g, r);
    }

    for (const c of this.charges) {
      if (time >= c.startsAt) continue;
      g.lineStyle(2, P.lit, 0.6);
      g.lineBetween(c.fromX, c.fromY, c.toX, c.toY);
      g.lineStyle(c.halfW * 2, P.main, 0.1);
      g.lineBetween(c.fromX, c.fromY, c.toX, c.toY);
    }

    for (const s of this.sweeps) {
      const warming = time < s.startsAt;
      const t = warming ? 0 : Phaser.Math.Clamp((time - s.startsAt) / (s.endsAt - s.startsAt), 0, 1);
      const a = s.a0 + (s.a1 - s.a0) * t;
      const ex = s.ox + Math.cos(a) * s.length;
      const ey = s.oy + Math.sin(a) * s.length;
      if (warming) {
        g.lineStyle(2, P.lit, 0.5);
        g.lineBetween(s.ox, s.oy, s.ox + Math.cos(s.a0) * s.length, s.oy + Math.sin(s.a0) * s.length);
      } else if (time <= s.endsAt) {
        g.lineStyle(s.halfW * 2, P.main, 0.5);
        g.lineBetween(s.ox, s.oy, ex, ey);
        g.lineStyle(s.halfW * 0.6, 0xffffff, 0.85);
        g.lineBetween(s.ox, s.oy, ex, ey);
      }
    }
  }

  private strokeGappedRing(g: Phaser.GameObjects.Graphics, r: TRing): void {
    const from = r.gapCentre + r.gapHalf;
    const to = r.gapCentre - r.gapHalf + Math.PI * 2;
    g.beginPath();
    g.arc(r.cx, r.cy, r.radius, from, to, false);
    g.strokePath();
  }

  /** Projectiles and pickups — painted over the fighters. */
  drawAir(g: Phaser.GameObjects.Graphics, time: number): void {
    const P = this.palette;
    for (const b of this.bullets) {
      if (b.turn > 0) {
        g.fillStyle(P.accent, 0.25);
        g.fillCircle(b.x, b.y, b.r * 2.1);
        g.fillStyle(P.accent, 0.95);
        g.fillCircle(b.x, b.y, b.r);
        g.fillStyle(0xffffff, 0.85);
        g.fillCircle(b.x - b.r * 0.25, b.y - b.r * 0.25, b.r * 0.35);
      } else {
        g.fillStyle(b.color, 0.28);
        g.fillCircle(b.x, b.y, b.r * 1.8);
        g.fillStyle(b.color, 0.95);
        g.fillCircle(b.x, b.y, b.r);
      }
    }
    for (const o of this.healOrbs) {
      const rot = Math.floor(time / 500) % 2 === 0;
      const pulse = 1 + Math.sin(time / 260) * 0.12;
      g.fillStyle(0x2c6b3a, 0.85);
      g.fillCircle(o.x, o.y, 9 * pulse);
      g.fillStyle(rot ? 0x9df5a8 : 0x7cf58a, 1);
      g.fillCircle(o.x, o.y, 5.5 * pulse);
    }
  }

  // ── Teardown ─────────────────────────────────────────────────────

  /** Drop every live hazard — phase transitions and the victory beat. */
  clearHazards(): void {
    this.generation++;
    this.bullets = [];
    this.lanesPool = [];
    this.zones = [];
    this.safeBlasts = [];
    this.rings = [];
    this.minesPool = [];
    this.sweeps = [];
    this.pools = [];
    this.charges = [];
    this.pullUntil = 0;
    this.pullStrength = 0;
    this.playerSlowMult = 1;
    this.playerSlowUntil = 0;
    for (const h of [...this.adds]) this.removeAdd(h);
  }

  destroy(): void {
    this.clearHazards();
    this.healOrbs = [];
    if (this.player?.active) this.playerSlowMult = 1;
  }
}
