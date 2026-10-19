import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { Projectile } from '../../combat/Projectile';
import { WaterColorFn, WaterFx, WaterSurf, WATER, waterRibbon } from './WaterVisuals';
import type { WaterArenaApi, WaterPuddleLike } from './WaterKit';

type Owner = 'player' | 'npc';

// ── Bubble Barrage (alt Q) ───────────────────────────────────────────────────

const BUBBLE_COUNT = 20;
/** Gap between bubbles leaving the caster — the volley streams out rather than appearing at once. */
const BUBBLE_STAGGER_MS = 28;
const BUBBLE_CONE_HALF = 0.55;            // ~31° either side of the aim line
const BUBBLE_SPEED_MIN = 240;
const BUBBLE_SPEED_MAX = 380;
/** Per-second exponential drag on a free bubble, so the cone slows and hangs in the air. */
const BUBBLE_DRAG = 1.3;
const BUBBLE_FLIGHT_MS = 1800;
const BUBBLE_R = 9;
const BUBBLE_LATCHED_R = 11;
/** How close a free bubble has to drift to a body to cling to it. */
const BUBBLE_CATCH = 20;
const BUBBLE_MAX_PER_FOE = 4;
const BUBBLE_HP = 75;
/** Share of the damage a bubble absorbs that passes on to whoever wears it. */
const BUBBLE_PASS = 0.5;
/** A bubble that reaches a foe already wearing four pops on them for this. */
const BUBBLE_POP_DAMAGE = 8;
const BUBBLE_LATCH_MS = 10000;
const BUBBLE_ORBIT = 22;

// ── Drippy / Splashy (perks) ─────────────────────────────────────────────────

const DRIP_SPACING = 46;
const DRIP_RADIUS = 20;
const DRIP_MS = 2600;
/** Oldest drips dry up early past this many, so a long walk can't carpet the arena. */
const DRIP_CAP = 16;
const SPLASHY_POOL_MULT = 1.5;
const SPLASHY_RADIUS = 64;
const SPLASHY_DAMAGE = 4;

// ── Poseidon (perk) ──────────────────────────────────────────────────────────

/** How far a wave-cut hit shoves its target, and over how long. */
const WAVE_CUT_SHOVE = 16;
const WAVE_CUT_SHOVE_MS = 140;
/** The ridden dodge: total length, speed, and what it does to whoever is in the way. */
const RIDE_MS = 560;
const RIDE_SPEED_MULT = 1.15;
const RIDE_DAMAGE = 12;
const RIDE_HIT_RANGE = 42;
/** The great wave every ultimate sends across the arena. */
const TIDE_DAMAGE = 25;
const TIDE_CROSS_MS = 1100;
const TIDE_WALL = 90;

interface Bubble {
  owner: Owner;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Free bubbles pop at this stamp; a latched bubble lets go and pops at it. */
  diesAt: number;
  host: Fighter | null;
  slot: number;
  hp: number;
  seed: number;
  /** 0–1, decays — a struck bubble flashes so a splash visibly landed on it. */
  flash: number;
}

interface Volley { owner: Owner; aim: number; next: number; left: number }

interface Tide {
  owner: Owner;
  dir: 1 | -1;
  front: number;
  speed: number;
  hit: Set<Fighter>;
  sprayAccum: number;
}

interface Shove { f: Fighter; vx: number; vy: number; until: number }

interface WaveRide {
  until: number;
  hit: Set<Fighter>;
  lastX: number;
  lastY: number;
  wakeAccum: number;
}

/**
 * Water's overhaul pieces that are not one of the five base abilities: the Bubble Barrage
 * alternate ultimate and the Drippy / Splashy / Poseidon perks. Owned by WaterKit, which
 * forwards the arena hooks — this class never talks to ArenaScene directly.
 */
export class WaterTides {
  private worldT = 0;

  // Bubble Barrage
  private bubbles: Bubble[] = [];
  private volleys: Volley[] = [];
  private bubbleGfx: Phaser.GameObjects.Graphics | null = null;
  /**
   * Damage owed to bubble wearers, batched to one hit per wearer per frame. A puddle tick under
   * four bubbles would otherwise land as four separate 1s; the fraction carries to the next frame.
   */
  private owed = new Map<Fighter, { amount: number; owner: Owner }>();

  // Drippy
  private dripLast: Record<Owner, { x: number; y: number } | null> = { player: null, npc: null };
  private drips: Record<Owner, WaterPuddleLike[]> = { player: [], npc: [] };

  // Poseidon
  private waveGfx: Phaser.GameObjects.Graphics | null = null;
  private tideGfx: Phaser.GameObjects.Graphics | null = null;
  private tides: Tide[] = [];
  private shoves: Shove[] = [];
  private ride: WaveRide | null = null;
  private rideSurf: WaterSurf | null = null;

  constructor(
    private readonly arena: WaterArenaApi,
    private readonly colFor: (owner: Owner) => WaterColorFn,
    private readonly fxFor: (owner: Owner) => WaterFx,
    /** Lays a painted, ticking water pool for that side (WaterKit owns the painting). */
    private readonly spawnPool: (owner: Owner, x: number, y: number, radius: number, ms: number) => WaterPuddleLike,
  ) {}

  reset(): void {
    this.bubbles = [];
    this.volleys = [];
    this.owed.clear();
    if (this.bubbleGfx) { this.bubbleGfx.destroy(); this.bubbleGfx = null; }
    this.dripLast = { player: null, npc: null };
    this.drips = { player: [], npc: [] };
    if (this.waveGfx) { this.waveGfx.destroy(); this.waveGfx = null; }
    if (this.tideGfx) { this.tideGfx.destroy(); this.tideGfx = null; }
    this.tides = [];
    this.shoves = [];
    this.ride = null;
    if (this.rideSurf) { this.rideSurf.destroy(); this.rideSurf = null; }
    this.worldT = 0;
  }

  update(time: number, delta: number): void {
    const dt = delta / 1000;
    this.worldT += dt;
    this.tickDrippy('player', time);
    this.tickDrippy('npc', time);
    this.tickVolleys(time);
    this.tickBubbles(time, dt);
    this.flushOwed();
    this.tickTides(time, dt);
    this.tickRide(time, delta);
    this.tickShoves(time, dt);
    this.paintBubbles();
    this.paintWaveCuts();
  }

  // ── Shared helpers ─────────────────────────────────────────────────────────

  /** True while that side is playing water with the given perk equipped. */
  has(owner: Owner, perkId: string): boolean {
    const isWater = owner === 'player' ? this.arena.isPlayerWater() : this.arena.isNpcWater();
    return isWater && this.arena.hasPerk(owner, perkId);
  }

  /** Splashy: every pool that side lays is half again as wide. */
  poolScale(owner: Owner): number {
    return this.has(owner, 'water-splashy') ? SPLASHY_POOL_MULT : 1;
  }

  private fighterOf(owner: Owner): Fighter {
    return owner === 'player' ? this.arena.player : this.arena.npc;
  }

  /** Who that side's water can touch. An npc-side caster in Invasion is a co-op ally — no one. */
  private targetsOf(owner: Owner): Fighter[] {
    if (owner === 'player') {
      return this.arena.enemies.filter((f) => f.active && f.hp > 0 && this.arena.isTargetable(f));
    }
    if (this.arena.isInvasion) return [];
    const p = this.arena.player;
    return p.active && p.hp > 0 ? [p] : [];
  }

  private bounds(): Phaser.Geom.Rectangle {
    return (this.arena.scene as unknown as { physics: { world: Phaser.Physics.Arcade.World } }).physics.world.bounds;
  }

  /** A short slide, applied as position over a few frames so the AI's velocity can't erase it. */
  private shove(f: Fighter, angle: number, dist: number, ms: number): void {
    if (f.knockbackImmune) return;
    const s = ms / 1000;
    this.shoves.push({ f, vx: Math.cos(angle) * dist / s, vy: Math.sin(angle) * dist / s, until: this.arena.scene.time.now + ms });
  }

  private tickShoves(time: number, dt: number): void {
    if (this.shoves.length === 0) return;
    const b = this.bounds();
    for (let i = this.shoves.length - 1; i >= 0; i--) {
      const s = this.shoves[i];
      if (time >= s.until || !s.f.active) { this.shoves.splice(i, 1); continue; }
      s.f.setPosition(
        Phaser.Math.Clamp(s.f.x + s.vx * dt, b.x + 20, b.right - 20),
        Phaser.Math.Clamp(s.f.y + s.vy * dt, b.y + 20, b.bottom - 20),
      );
    }
  }

  // ── Drippy ─────────────────────────────────────────────────────────────────

  /** Every DRIP_SPACING px walked drops a small pool behind the walker. */
  private tickDrippy(owner: Owner, time: number): void {
    if (!this.has(owner, 'water-drippy')) { this.dripLast[owner] = null; return; }
    const f = this.fighterOf(owner);
    if (!f.active || f.hp <= 0 || f.levitating) return;
    const last = this.dripLast[owner];
    if (!last) { this.dripLast[owner] = { x: f.x, y: f.y }; return; }
    const moved = Phaser.Math.Distance.Between(last.x, last.y, f.x, f.y);
    if (moved < DRIP_SPACING) return;
    // Dropped just behind the walker, never under them — a bot heals standing in its own water.
    const back = Math.atan2(last.y - f.y, last.x - f.x);
    last.x = f.x;
    last.y = f.y;

    const list = this.drips[owner];
    for (let i = list.length - 1; i >= 0; i--) if (time > list[i].expiresAt) list.splice(i, 1);
    // Over the cap, the oldest drip dries up now — ArenaScene culls anything past its expiry.
    while (list.length >= DRIP_CAP) list.shift()!.expiresAt = time;

    const radius = DRIP_RADIUS * this.poolScale(owner);
    const off = Math.min(moved, radius + 8);
    const dx = f.x + Math.cos(back) * off, dy = f.y + Math.sin(back) * off + 6;
    list.push(this.spawnPool(owner, dx, dy, radius, DRIP_MS));
    this.fxFor(owner).spray(dx, dy - 2, 3, { speed: 60, size: 2.2, life: 320, fall: 18, depth: 4 });
  }

  // ── Splashy + Poseidon on a Water Cut hit ─────────────────────────────────

  /** A Water Cut from `owner` has just landed on `target`. */
  onCutLanded(target: Fighter, owner: Owner, proj?: Projectile): void {
    if (this.has(owner, 'water-splashy') && !(owner === 'npc' && this.arena.isInvasion)) {
      // Everyone else near the target is caught — and so is every bubble on the target itself.
      this.arena.dealAoeDamageFromOwner(target.x, target.y, SPLASHY_RADIUS, SPLASHY_DAMAGE, owner, target);
      const fx = this.fxFor(owner);
      fx.ring(target.x, target.y, 10, SPLASHY_RADIUS, WATER.foam, 300, 3, 6);
      fx.spray(target.x, target.y, 9, { speed: 170, size: 2.6, life: 380, fall: 30, depth: 7 });
    }
    if (proj && (proj as Projectile & { waterWave?: boolean }).waterWave) {
      const body = proj.body as Phaser.Physics.Arcade.Body | null;
      const angle = body ? Math.atan2(body.velocity.y, body.velocity.x) : proj.rotation;
      this.shove(target, angle, WAVE_CUT_SHOVE, WAVE_CUT_SHOVE_MS);
      this.fxFor(owner).crown(target.x, target.y, 22, 7, 7);
    }
  }

  /** Poseidon wave cuts: a curling crest painted over each shot, bowed toward its travel. */
  private paintWaveCuts(): void {
    let g = this.waveGfx;
    let any = false;
    for (const child of this.arena.projectiles.getChildren()) {
      const proj = child as Projectile & { waterWave?: boolean };
      if (!proj.active || !proj.waterWave) continue;
      if (!g) g = this.waveGfx = this.arena.scene.add.graphics().setDepth(6);
      if (!any) { g.clear(); any = true; }
      const col = this.colFor(proj.isFromPlayer ? 'player' : 'npc');
      const body = proj.body as Phaser.Physics.Arcade.Body | null;
      const a = body ? Math.atan2(body.velocity.y, body.velocity.x) : proj.rotation;
      const c = Math.cos(a), s = Math.sin(a);
      const px = -s, py = c;
      const front: Phaser.Math.Vector2[] = [];
      const back: Phaser.Math.Vector2[] = [];
      for (let i = -4; i <= 4; i++) {
        const k = i / 4;
        const bow = (1 - k * k) * 8 + Math.sin(this.worldT * 18 + i) * 0.8;
        const ox = proj.x + px * i * 4.2, oy = proj.y + py * i * 4.2;
        front.push(new Phaser.Math.Vector2(ox + c * bow, oy + s * bow));
        back.push(new Phaser.Math.Vector2(ox + c * (bow - 7 - (1 - k * k) * 3), oy + s * (bow - 7 - (1 - k * k) * 3)));
      }
      g.fillStyle(col(WATER.ocean), 0.85);
      g.fillPoints([...front, ...back.reverse()], true);
      g.fillStyle(col(WATER.bright), 0.85);
      g.fillPoints([...front.slice(1, 8), ...front.slice(1, 8).map((v) => new Phaser.Math.Vector2(v.x - c * 3.5, v.y - s * 3.5)).reverse()], true);
      g.lineStyle(2, col(WATER.white), 0.9);
      g.strokePoints(front.slice(1, 8), false);
      // Spray thrown off both tips of the crest.
      g.fillStyle(col(WATER.foam), 0.75);
      waterRibbon(g, front[0].x, front[0].y, a + Math.PI * 0.8, 7, 1.6);
      waterRibbon(g, front[8].x, front[8].y, a - Math.PI * 0.8, 7, 1.6);
    }
    if (!any && g) g.clear();
  }

  // ── Poseidon: the ridden dodge ─────────────────────────────────────────────

  /** Called when the player dodges. True (and the ride starts) only with Poseidon on. */
  startWaveRide(): boolean {
    if (!this.has('player', 'water-poseidon')) return false;
    const p = this.arena.player;
    this.ride = { until: this.arena.scene.time.now + RIDE_MS, hit: new Set(), lastX: p.x, lastY: p.y, wakeAccum: 0 };
    this.fxFor('player').crown(p.x, p.y, 40, 10, 4);
    this.arena.showFloatingText(p.x, p.y - 40, '🔱 WAVE RIDE', '#88ddff');
    return true;
  }

  get rideSpeedMult(): number { return RIDE_SPEED_MULT; }
  get rideMs(): number { return RIDE_MS; }

  private tickRide(time: number, delta: number): void {
    const p = this.arena.player;
    if (!this.ride || time >= this.ride.until || !p.active) {
      this.ride = null;
      if (this.rideSurf) { this.rideSurf.destroy(); this.rideSurf = null; }
      return;
    }
    const r = this.ride;
    const fx = this.fxFor('player');
    if (!this.rideSurf) this.rideSurf = new WaterSurf(this.arena.scene, this.colFor('player'), 40, 1.5, 4, 12);
    this.rideSurf.update(delta, p.x, p.y + 4, p.alpha);

    r.wakeAccum += delta;
    if (r.wakeAccum >= 40) {
      r.wakeAccum = 0;
      fx.wake(r.lastX, r.lastY, p.x, p.y, 3);
      const back = Math.atan2(r.lastY - p.y, r.lastX - p.x);
      fx.spray(p.x, p.y, 3, { angle: back, spread: 0.8, speed: 140, size: 2.8, life: 360, fall: 30, depth: 5 });
      r.lastX = p.x;
      r.lastY = p.y;
    }

    for (const t of this.targetsOf('player')) {
      if (r.hit.has(t) || Phaser.Math.Distance.Between(p.x, p.y, t.x, t.y) > RIDE_HIT_RANGE) continue;
      r.hit.add(t);
      t.lastDamageOwner = 'player';
      t.takeDamage(RIDE_DAMAGE);
      this.damageWornBubbles(t, 'player', RIDE_DAMAGE);
      this.shove(t, Math.atan2(t.y - p.y, t.x - p.x), 26, 180);
      fx.splash(t.x, t.y, 30, { drops: 8, mist: 0, wet: false, duration: 260, depth: 8 });
    }
  }

  // ── Poseidon: the great wave on every ultimate ─────────────────────────────

  /** That side just cast an ultimate. With Poseidon, a wave crosses the arena toward `aimX`. */
  onUltimate(owner: Owner, aimX: number): void {
    if (!this.has(owner, 'water-poseidon')) return;
    const f = this.fighterOf(owner);
    const b = this.bounds();
    const dir: 1 | -1 = aimX >= f.x ? 1 : -1;
    this.tides.push({
      owner, dir,
      front: dir > 0 ? b.x - 30 : b.right + 30,
      speed: (b.width + 60) / (TIDE_CROSS_MS / 1000),
      hit: new Set(),
      sprayAccum: 0,
    });
    this.arena.scene.cameras.main.shake(400, 0.006);
    this.arena.showFloatingText(f.x, f.y - 56, "🔱 POSEIDON'S WAVE", '#55ccff');
  }

  private tickTides(_time: number, dt: number): void {
    if (this.tides.length === 0) {
      if (this.tideGfx) { this.tideGfx.destroy(); this.tideGfx = null; }
      return;
    }
    if (!this.tideGfx) this.tideGfx = this.arena.scene.add.graphics().setDepth(8);
    const g = this.tideGfx;
    g.clear();
    const b = this.bounds();
    for (let i = this.tides.length - 1; i >= 0; i--) {
      const t = this.tides[i];
      t.front += t.dir * t.speed * dt;
      const fx = this.fxFor(t.owner);

      for (const f of this.targetsOf(t.owner)) {
        if (t.hit.has(f)) continue;
        if (t.dir > 0 ? f.x > t.front : f.x < t.front) continue;
        t.hit.add(f);
        f.lastDamageOwner = t.owner;
        f.takeDamage(TIDE_DAMAGE);
        this.damageWornBubbles(f, t.owner, TIDE_DAMAGE);
        this.shove(f, t.dir > 0 ? 0 : Math.PI, 34, 220);
        fx.splash(f.x, f.y, 40, { drops: 12, mist: 1, wet: false, duration: 320, depth: 9 });
      }

      t.sprayAccum += dt;
      if (t.sprayAccum >= 0.05) {
        t.sprayAccum = 0;
        const sy = b.y + Math.random() * b.height;
        fx.spray(t.front, sy, 3, { angle: t.dir > 0 ? 0 : Math.PI, spread: 1, speed: 160, size: 3, life: 380, fall: -20, depth: 9 });
      }
      this.paintTide(g, t, b);

      const gone = t.dir > 0 ? t.front > b.right + TIDE_WALL + 240 : t.front < b.x - TIDE_WALL - 240;
      if (gone) this.tides.splice(i, 1);
    }
  }

  /** A wall of water: deep body, brighter face, foam lip and curling spray, with a fading sheet behind. */
  private paintTide(g: Phaser.GameObjects.Graphics, t: Tide, b: Phaser.Geom.Rectangle): void {
    const col = this.colFor(t.owner);
    const d = t.dir;
    const edge = (y: number): number => t.front + d * Math.sin(y * 0.035 + this.worldT * 6) * 9;
    const layers: Array<[number, number, number]> = [
      [TIDE_WALL, WATER.deep, 0.7],
      [TIDE_WALL * 0.62, WATER.ocean, 0.8],
      [TIDE_WALL * 0.3, WATER.bright, 0.85],
    ];
    for (const [w, c, a] of layers) {
      const front: Phaser.Math.Vector2[] = [];
      const back: Phaser.Math.Vector2[] = [];
      for (let y = b.y - 10; y <= b.bottom + 10; y += 14) {
        const x = edge(y);
        front.push(new Phaser.Math.Vector2(x, y));
        back.push(new Phaser.Math.Vector2(x - d * w * (0.85 + Math.sin(y * 0.02 + this.worldT * 3) * 0.15), y));
      }
      g.fillStyle(col(c), a);
      g.fillPoints([...front, ...back.reverse()], true);
    }
    // The fading sheet of water the wave drags behind it.
    for (let k = 0; k < 4; k++) {
      const x0 = t.front - d * (TIDE_WALL + k * 55);
      g.fillStyle(col(WATER.ocean), 0.22 - k * 0.05);
      g.fillRect(Math.min(x0, x0 - d * 55), b.y, 55, b.height);
    }
    // Foam lip and the crest curling over it.
    const lip: Phaser.Math.Vector2[] = [];
    for (let y = b.y - 10; y <= b.bottom + 10; y += 14) lip.push(new Phaser.Math.Vector2(edge(y), y));
    g.lineStyle(4, col(WATER.white), 0.9);
    g.strokePoints(lip, false);
    g.fillStyle(col(WATER.foam), 0.85);
    for (let y = b.y; y <= b.bottom; y += 30) {
      const curl = Math.sin(y * 0.05 + this.worldT * 8) * 0.5;
      waterRibbon(g, edge(y), y, (d > 0 ? 0 : Math.PI) + curl, 16, 4.2, d * 6);
    }
  }

  // ── Bubble Barrage ─────────────────────────────────────────────────────────

  /** The cast: queue the volley. Bubbles leave the caster one every BUBBLE_STAGGER_MS. */
  doBubbleBarrage(owner: Owner, tx: number, ty: number): void {
    const f = this.fighterOf(owner);
    this.volleys.push({ owner, aim: Math.atan2(ty - f.y, tx - f.x), next: this.arena.scene.time.now, left: BUBBLE_COUNT });
    this.arena.showFloatingText(f.x, f.y - 44, '🫧 BUBBLE BARRAGE', '#bbeeff');
  }

  private tickVolleys(time: number): void {
    for (let i = this.volleys.length - 1; i >= 0; i--) {
      const v = this.volleys[i];
      const f = this.fighterOf(v.owner);
      if (!f.active || f.hp <= 0) { this.volleys.splice(i, 1); continue; }
      while (v.left > 0 && time >= v.next) {
        const a = v.aim + (Math.random() * 2 - 1) * BUBBLE_CONE_HALF;
        const sp = BUBBLE_SPEED_MIN + Math.random() * (BUBBLE_SPEED_MAX - BUBBLE_SPEED_MIN);
        this.bubbles.push({
          owner: v.owner,
          x: f.x + Math.cos(a) * 24, y: f.y + Math.sin(a) * 24,
          vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
          diesAt: time + BUBBLE_FLIGHT_MS + Math.random() * 300,
          host: null, slot: -1, hp: BUBBLE_HP, seed: Math.random() * 10, flash: 0,
        });
        v.next += BUBBLE_STAGGER_MS;
        v.left--;
      }
      if (v.left <= 0) this.volleys.splice(i, 1);
    }
  }

  private wornBy(host: Fighter, owner: Owner): Bubble[] {
    return this.bubbles.filter((b) => b.host === host && b.owner === owner);
  }

  private tickBubbles(time: number, dt: number): void {
    if (this.bubbles.length === 0) return;
    const bounds = this.bounds();
    const drag = Math.exp(-BUBBLE_DRAG * dt);
    const targets: Record<Owner, Fighter[] | null> = { player: null, npc: null };

    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      const b = this.bubbles[i];
      b.flash = Math.max(0, b.flash - dt * 4);

      if (b.host) {
        if (!b.host.active || b.host.hp <= 0 || time >= b.diesAt) { this.pop(i, false); continue; }
        const a = (b.slot / BUBBLE_MAX_PER_FOE) * Math.PI * 2 + this.worldT * 0.8;
        b.x = b.host.x + Math.cos(a) * BUBBLE_ORBIT;
        b.y = b.host.y + Math.sin(a) * BUBBLE_ORBIT * 0.85 + Math.sin(this.worldT * 3 + b.seed) * 2;
        continue;
      }

      b.vx *= drag;
      b.vy *= drag;
      b.x += b.vx * dt + Math.sin(this.worldT * 4 + b.seed) * 12 * dt;
      b.y += b.vy * dt - 10 * dt;
      if (time >= b.diesAt || !Phaser.Geom.Rectangle.Contains(bounds, b.x, b.y)) { this.pop(i, false); continue; }

      const list = targets[b.owner] ?? (targets[b.owner] = this.targetsOf(b.owner));
      for (const t of list) {
        if (Phaser.Math.Distance.Between(b.x, b.y, t.x, t.y) > BUBBLE_R + BUBBLE_CATCH) continue;
        const worn = this.wornBy(t, b.owner);
        if (worn.length >= BUBBLE_MAX_PER_FOE) {
          // No room left on them: it bursts against them instead.
          t.lastDamageOwner = b.owner;
          t.takeDamage(BUBBLE_POP_DAMAGE);
          this.arena.showFloatingText(t.x, t.y - 36, '🫧 POP', '#ddf6ff');
          this.pop(i, true);
        } else {
          const used = new Set(worn.map((w) => w.slot));
          let slot = 0;
          while (used.has(slot)) slot++;
          b.host = t;
          b.slot = slot;
          b.diesAt = time + BUBBLE_LATCH_MS;
          this.fxFor(b.owner).ring(b.x, b.y, 4, 18, WATER.foam, 200, 2, 7);
          if (worn.length + 1 === BUBBLE_MAX_PER_FOE) {
            this.arena.showFloatingText(t.x, t.y - 46, '🫧 BUBBLED ×4', '#bbeeff');
          }
        }
        break;
      }
    }
  }

  /** Bursts bubble `i`. `loud` is a pop with a hit behind it, not a bubble just letting go. */
  private pop(i: number, loud: boolean): void {
    const b = this.bubbles[i];
    this.bubbles.splice(i, 1);
    const fx = this.fxFor(b.owner);
    const r = b.host ? BUBBLE_LATCHED_R : BUBBLE_R;
    fx.ring(b.x, b.y, r * 0.6, r * (loud ? 3 : 2.2), WATER.foam, loud ? 260 : 200, loud ? 3 : 2, 7);
    fx.spray(b.x, b.y, loud ? 8 : 4, { speed: loud ? 150 : 90, size: 2, life: 300, fall: 20, depth: 7 });
  }

  /** A bubble takes `dmg`; half of what it absorbs is owed to whoever wears it. */
  private hurtBubble(b: Bubble, dmg: number): void {
    if (!b.host || dmg <= 0) return;
    const absorbed = Math.min(dmg, b.hp);
    b.hp -= absorbed;
    b.flash = 1;
    const o = this.owed.get(b.host);
    if (o) o.amount += absorbed * BUBBLE_PASS;
    else this.owed.set(b.host, { amount: absorbed * BUBBLE_PASS, owner: b.owner });
    if (b.hp <= 0) {
      const i = this.bubbles.indexOf(b);
      if (i !== -1) this.pop(i, true);
    }
  }

  /** Every bubble `owner` put on `host` takes `dmg` — a hit that washes over the whole body. */
  private damageWornBubbles(host: Fighter, owner: Owner, dmg: number): void {
    for (const b of this.wornBy(host, owner)) this.hurtBubble(b, dmg);
  }

  /**
   * An area hit from `owner` landed: every bubble that side has latched inside it takes the
   * damage too. Fed from every arena AoE chokepoint and the shared puddle tick.
   */
  notifyAoe(cx: number, cy: number, radius: number, damage: number, owner: Owner): void {
    if (this.bubbles.length === 0) return;
    for (const b of this.bubbles.slice()) {
      if (!b.host || b.owner !== owner) continue;
      if (Phaser.Math.Distance.Between(cx, cy, b.x, b.y) <= radius + BUBBLE_LATCHED_R) this.hurtBubble(b, damage);
    }
  }

  private flushOwed(): void {
    for (const [host, o] of this.owed) {
      const whole = Math.floor(o.amount);
      if (whole < 1) continue;
      o.amount -= whole;
      if (!host.active || host.hp <= 0) { this.owed.delete(host); continue; }
      host.lastDamageOwner = o.owner;
      host.takeDamage(whole);
    }
  }

  /** Bot synergy: the bot has bubbled the player enough that a splash is worth double. */
  npcBubbleSplashReady(): boolean {
    return this.wornBy(this.arena.player, 'npc').length >= 2;
  }

  /** One Graphics paints every bubble: a thin soap film, a rim, a highlight and an HP arc. */
  private paintBubbles(): void {
    if (this.bubbles.length === 0) {
      if (this.bubbleGfx) { this.bubbleGfx.destroy(); this.bubbleGfx = null; }
      return;
    }
    if (!this.bubbleGfx) this.bubbleGfx = this.arena.scene.add.graphics().setDepth(7);
    const g = this.bubbleGfx;
    g.clear();
    for (const b of this.bubbles) {
      const col = this.colFor(b.owner);
      const r = (b.host ? BUBBLE_LATCHED_R : BUBBLE_R) + Math.sin(this.worldT * 5 + b.seed) * 0.8;
      if (b.host) {
        // A wet filament tethering the bubble to its wearer.
        g.lineStyle(1, col(WATER.cyan), 0.35);
        g.lineBetween(b.host.x, b.host.y, b.x, b.y);
      }
      g.fillStyle(col(b.flash > 0 ? WATER.pale : WATER.cyan), 0.16 + b.flash * 0.35);
      g.fillCircle(b.x, b.y, r);
      g.lineStyle(1.6, col(WATER.foam), 0.85);
      g.strokeCircle(b.x, b.y, r);
      // The film's colour swirl: a sky-blue sheen sliding round the lower edge.
      const sw = this.worldT * 2 + b.seed;
      g.lineStyle(1.2, col(WATER.sky), 0.55);
      g.beginPath();
      g.arc(b.x, b.y, r * 0.72, sw, sw + 1.4);
      g.strokePath();
      g.fillStyle(0xffffff, 0.85);
      g.fillEllipse(b.x - r * 0.38, b.y - r * 0.42, r * 0.55, r * 0.32);
      g.fillStyle(0xffffff, 0.5);
      g.fillCircle(b.x + r * 0.35, b.y + r * 0.3, r * 0.12);
      if (b.host && b.hp < BUBBLE_HP) {
        g.lineStyle(2, col(WATER.pale), 0.85);
        g.beginPath();
        g.arc(b.x, b.y, r + 3, -Math.PI / 2, -Math.PI / 2 + (b.hp / BUBBLE_HP) * Math.PI * 2);
        g.strokePath();
      }
    }
  }
}
