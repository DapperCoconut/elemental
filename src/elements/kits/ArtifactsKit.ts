import Phaser from 'phaser';
import type { Player } from '../../entities/Player';
import type { Fighter } from '../../entities/Fighter';
import { Projectile } from '../../combat/Projectile';
import { ARTIFACTS, ArtifactPowerId, getArtifact } from '../../data/Artifacts';

export interface ArtifactsArenaApi {
  get scene(): Phaser.Scene;
  get player(): Player;
  get npc(): Fighter;
  get projectiles(): Phaser.Physics.Arcade.Group;
  /** Same chokepoint ItemsKit writes through, so speed sources compose. */
  applyPlayerSpeedMult(f: number): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
}

const HUD_DEPTH = 22;
/** Ground effects (halo, trail, snare) sit under the fighters, which are depth 5. */
const GROUND_DEPTH = 4;
const FX_DEPTH = 18;

const MAX_BOUNCES = 10;
const SPLIT_DELAY_MS = 250;
const HOMING_RATE = (260 * Math.PI) / 180; // rad/sec
const MOLASSES_MULT = 0.4;
const BRAID_EVERY = 4;
const HALO_RADIUS = 180;
const HALO_DPS = 7;
const RIME_TO_FREEZE = 6;
const RIME_FADE_MS = 6000;
const FREEZE_MS = 1400;
const FREEZE_VULN = 1.4;
const LEDGER_PERIOD_MS = 12000;
const LEDGER_SHARE = 0.45;
const WRATH_PER_MISSING = 1.4;
const WRATH_CAP = 0.70;
const GRACE_RADIUS = 34;
const GRACE_CLEAR = 46;
const GRACE_MAX = 5;
const GRACE_MS = 4000;
const SNARE_PERIOD_MS = 9000;
const SNARE_ROOT_MS = 1100;
const BULWARK_PERIOD_MS = 10000;
const BULWARK_REFUND_MS = 2500;
const RECURSION_CHANCE = 0.35;
const TRAIL_PATCH_MS = 3000;
const TRAIL_DPS = 16;
const TRAIL_RADIUS = 30;
const CROWN_PERIOD_MS = 20000;

interface TrailPatch { x: number; y: number; bornAt: number }

/**
 * Runs the Vault's artifacts for one match.
 *
 * Sibling of `ItemsKit`, and deliberately not folded into it: an item is a bag of numbers
 * that `applyEffect` pours into fighter fields once at the bell, while an artifact is a rule
 * that has to be enforced every frame. The two share nothing but the arming step.
 *
 * Every power is opt-in — `has()` gates each block, so a match with one artifact armed pays
 * for one artifact's worth of work. Fighter callbacks are **chained**, never replaced, in the
 * same way `ItemsKit` chains them, so an element kit that already owns `damageAbsorber` or
 * `onDamaged` keeps working underneath.
 */
export class ArtifactsKit {
  private active = new Set<ArtifactPowerId>();
  private elapsedMs = 0;
  private hudText: Phaser.GameObjects.Text | null = null;

  // Projectile bookkeeping. WeakSet/WeakMap throughout: a destroyed projectile must not be
  // kept alive by our own record of it.
  private bounces = new WeakMap<Phaser.GameObjects.GameObject, number>();
  private seenPlayerShots = new WeakSet<Phaser.GameObjects.GameObject>();
  private noFork = new WeakSet<Phaser.GameObjects.GameObject>();
  private pendingSplits: { proj: Projectile; at: number }[] = [];
  private slowedShots = new WeakSet<Phaser.GameObjects.GameObject>();
  private graceNear = new WeakSet<Phaser.GameObjects.GameObject>();
  private graceCredited = new WeakSet<Phaser.GameObjects.GameObject>();

  // Static Braid
  private hitCount = 0;
  private pendingNovas = 0;

  // Leech Halo
  private leechPool = 0;
  private haloG: Phaser.GameObjects.Graphics | null = null;

  // Rime Brand
  private rimeStacks = 0;
  private rimeLastAt = -Infinity;
  private frozenUntil = 0;
  private rimeG: Phaser.GameObjects.Graphics | null = null;

  // Grudge Ledger
  private ledger = 0;
  private ledgerNextAt = LEDGER_PERIOD_MS;

  // Wrath Engine + Kingmaker + Bullet Ballet all push multipliers, so each keeps the
  // factor it last applied and divides it back out before applying the next one.
  private wrathApplied = 1;
  private graceStacks = 0;
  private graceUntil = 0;
  private graceDmgApplied = 1;
  private graceSpeedApplied = 1;
  private crownNextAt = CROWN_PERIOD_MS;
  private crownStacks = 0;

  // Gravity Snare
  private snareNextAt = SNARE_PERIOD_MS;
  private snareG: Phaser.GameObjects.Graphics | null = null;
  private snareFlashUntil = 0;

  // Mirror Bulwark
  private shellReady = false;
  private shellNextAt = 0;
  private pendingReflect = 0;
  private shellG: Phaser.GameObjects.Graphics | null = null;

  // Ember Trail
  private trail: TrailPatch[] = [];
  private trailNextAt = 0;
  private trailPool = 0;
  private trailG: Phaser.GameObjects.Graphics | null = null;

  constructor(private api: ArtifactsArenaApi) {}

  reset(): void {
    this.active.clear();
    this.elapsedMs = 0;
    // GameObjects do not survive a scene restart — drop every handle so the next arm()
    // rebuilds them rather than writing to dead Graphics.
    this.hudText = null;
    this.haloG = null;
    this.rimeG = null;
    this.snareG = null;
    this.shellG = null;
    this.trailG = null;
    this.bounces = new WeakMap();
    this.seenPlayerShots = new WeakSet();
    this.noFork = new WeakSet();
    this.pendingSplits = [];
    this.slowedShots = new WeakSet();
    this.graceNear = new WeakSet();
    this.graceCredited = new WeakSet();
    this.hitCount = 0;
    this.pendingNovas = 0;
    this.leechPool = 0;
    this.rimeStacks = 0;
    this.rimeLastAt = -Infinity;
    this.frozenUntil = 0;
    this.ledger = 0;
    this.ledgerNextAt = LEDGER_PERIOD_MS;
    this.wrathApplied = 1;
    this.graceStacks = 0;
    this.graceUntil = 0;
    this.graceDmgApplied = 1;
    this.graceSpeedApplied = 1;
    this.crownNextAt = CROWN_PERIOD_MS;
    this.crownStacks = 0;
    this.snareNextAt = SNARE_PERIOD_MS;
    this.snareFlashUntil = 0;
    this.shellReady = false;
    this.shellNextAt = 0;
    this.pendingReflect = 0;
    this.trail = [];
    this.trailNextAt = 0;
    this.trailPool = 0;
  }

  /** True when this power is armed for the match. */
  private has(power: ArtifactPowerId): boolean {
    return this.active.has(power);
  }

  /**
   * Arms a set of artifact ids for this match. The twin of `ItemsKit.applyConsumed`, and
   * called from the same place in `ArenaScene.create()`.
   */
  arm(armed: Set<string>): void {
    if (armed.size === 0) return;
    for (const id of armed) {
      const def = getArtifact(id);
      if (def) this.active.add(def.power);
    }
    if (this.active.size === 0) return;

    if (this.has('staticBraid') || this.has('rimeBrand')) this.hookHitsDealt();
    if (this.has('grudgeLedger')) this.hookHitsTaken();
    if (this.has('mirrorBulwark')) {
      this.hookBulwark();
      this.shellReady = true;
    }
    if (this.has('recursionLoop')) this.hookRecursion();
    if (this.has('leechHalo')) this.haloG = this.api.scene.add.graphics().setDepth(GROUND_DEPTH);
    if (this.has('emberTrail')) this.trailG = this.api.scene.add.graphics().setDepth(GROUND_DEPTH);
    if (this.has('gravitySnare')) this.snareG = this.api.scene.add.graphics().setDepth(FX_DEPTH);
    if (this.has('mirrorBulwark')) this.shellG = this.api.scene.add.graphics().setDepth(FX_DEPTH);
    if (this.has('rimeBrand')) this.rimeG = this.api.scene.add.graphics().setDepth(FX_DEPTH);

    this.buildHud();

    const label = [...armed].map((id) => getArtifact(id)?.emoji ?? '').filter(Boolean).join(' ');
    const { player } = this.api;
    this.api.showFloatingText(player.x, player.y - 62, label, '#ffd970');
  }

  // ── Callback hooks (chained, never replaced) ──────────────────────

  private hookHitsDealt(): void {
    const { npc } = this.api;
    const prev = npc.onDamaged;
    npc.onDamaged = (amount: number) => {
      prev?.(amount);
      if (amount <= 0) return;
      if (this.has('staticBraid')) {
        this.hitCount++;
        if (this.hitCount % BRAID_EVERY === 0) this.pendingNovas++;
      }
      if (this.has('rimeBrand') && this.elapsedMs >= this.frozenUntil) {
        // Stacks expire as a block rather than individually — one timer, one read.
        if (this.elapsedMs - this.rimeLastAt > RIME_FADE_MS) this.rimeStacks = 0;
        this.rimeLastAt = this.elapsedMs;
        this.rimeStacks++;
        if (this.rimeStacks >= RIME_TO_FREEZE) this.freeze();
      }
    };
  }

  private hookHitsTaken(): void {
    const { player } = this.api;
    const prev = player.onDamaged;
    player.onDamaged = (amount: number) => {
      prev?.(amount);
      if (amount > 0) this.ledger += amount;
    };
  }

  private hookBulwark(): void {
    const { player } = this.api;
    const prev = player.damageAbsorber;
    player.damageAbsorber = (amount: number) => {
      if (prev && prev(amount)) return true;
      if (!this.shellReady || amount <= 0 || player.hp <= 0) return false;
      this.shellReady = false;
      this.shellNextAt = this.elapsedMs + BULWARK_PERIOD_MS;
      // The reflection is *deferred*: dealing damage from inside the victim's own absorber
      // re-enters `takeDamage` on the other fighter mid-hit, and that is how a kit ends up
      // reading half-written state. `update` pays it out on the next frame instead.
      this.pendingReflect += amount;
      player.reduceCooldowns(BULWARK_REFUND_MS);
      this.api.showFloatingText(player.x, player.y - 46, '🪞 MIRRORED', '#eef3fa');
      this.api.scene.cameras.main.flash(140, 220, 230, 245);
      return true;
    };
  }

  private hookRecursion(): void {
    const { player } = this.api;
    const prev = player.onCastStamp;
    player.onCastStamp = (abilityId, aim) => {
      prev?.(abilityId, aim);
      if (Math.random() > RECURSION_CHANCE) return;
      // Deferred by a frame so the stamp this cast just wrote is the one we clear.
      this.api.scene.time.delayedCall(0, () => {
        if (!player.active) return;
        player.resetCooldown(abilityId);
        this.api.showFloatingText(player.x, player.y - 54, '♾️ AGAIN', '#7cf5d8');
      });
    };
  }

  // ── Per-frame ─────────────────────────────────────────────────────

  update(dt: number): void {
    if (this.active.size === 0) return;
    this.elapsedMs += dt;
    const { player, npc } = this.api;
    const alive = player.active && player.hp > 0;

    this.updateProjectiles(dt);

    if (this.pendingReflect > 0) {
      const amount = Math.round(this.pendingReflect);
      this.pendingReflect = 0;
      if (npc.active && npc.hp > 0 && amount > 0) npc.takeDamage(amount);
    }

    while (this.pendingNovas > 0) {
      this.pendingNovas--;
      this.fireBraidNova();
    }

    if (this.has('leechHalo')) this.updateHalo(dt);
    if (this.has('rimeBrand')) this.updateRime();
    if (this.has('grudgeLedger') && alive) this.updateLedger();
    if (this.has('wrathEngine')) this.updateWrath();
    if (this.has('bulletBallet')) this.updateGrace();
    if (this.has('gravitySnare') && alive) this.updateSnare();
    if (this.has('mirrorBulwark')) this.updateBulwark();
    if (this.has('emberTrail')) this.updateTrail(dt);
    if (this.has('kingmaker') && alive) this.updateCrown();

    this.refreshHud();
  }

  /**
   * Ricochet, Split Prism, Hunter's Eye and Molasses Lens all walk the same list, so they
   * share one pass over it. Runs *before* ArenaScene's out-of-bounds cull, which is what
   * lets a bounced shot survive the wall it just touched.
   */
  private updateProjectiles(dt: number): void {
    const ricochet = this.has('ricochet');
    const split = this.has('splitPrism');
    const homing = this.has('homing');
    const molasses = this.has('molasses');
    const ballet = this.has('bulletBallet');
    if (!ricochet && !split && !homing && !molasses && !ballet) return;

    const { scene, npc, projectiles } = this.api;
    const wb = scene.physics.world.bounds;
    const seconds = dt / 1000;

    for (const go of projectiles.getChildren() as Projectile[]) {
      if (!go.active || !go.body) continue;
      const body = go.body as Phaser.Physics.Arcade.Body;

      if (!go.isFromPlayer) {
        if (molasses && !this.slowedShots.has(go)) {
          this.slowedShots.add(go);
          body.velocity.scale(MOLASSES_MULT);
          go.setAlpha(0.85);
        }
        if (ballet) this.trackGrace(go);
        continue;
      }

      if (split && !this.seenPlayerShots.has(go)) {
        this.seenPlayerShots.add(go);
        if (!this.noFork.has(go)) this.pendingSplits.push({ proj: go, at: this.elapsedMs + SPLIT_DELAY_MS });
      }

      if (homing && npc.active && npc.hp > 0) {
        const speed = body.velocity.length();
        if (speed > 1) {
          const want = Math.atan2(npc.y - go.y, npc.x - go.x);
          const have = Math.atan2(body.velocity.y, body.velocity.x);
          const turn = Phaser.Math.Clamp(
            Phaser.Math.Angle.Wrap(want - have), -HOMING_RATE * seconds, HOMING_RATE * seconds,
          );
          const next = have + turn;
          body.velocity.set(Math.cos(next) * speed, Math.sin(next) * speed);
          go.setRotation(next);
        }
      }

      if (ricochet) this.tryBounce(go, body, wb);
    }

    if (split && this.pendingSplits.length > 0) {
      const due = this.pendingSplits.filter((s) => this.elapsedMs >= s.at);
      this.pendingSplits = this.pendingSplits.filter((s) => this.elapsedMs < s.at);
      for (const s of due) this.fork(s.proj);
    }
  }

  private tryBounce(p: Projectile, body: Phaser.Physics.Arcade.Body, wb: Phaser.Geom.Rectangle): void {
    let bounced = false;
    if (p.x <= wb.left + 2 && body.velocity.x < 0) { body.velocity.x *= -1; p.x = wb.left + 3; bounced = true; }
    else if (p.x >= wb.right - 2 && body.velocity.x > 0) { body.velocity.x *= -1; p.x = wb.right - 3; bounced = true; }
    if (p.y <= wb.top + 2 && body.velocity.y < 0) { body.velocity.y *= -1; p.y = wb.top + 3; bounced = true; }
    else if (p.y >= wb.bottom - 2 && body.velocity.y > 0) { body.velocity.y *= -1; p.y = wb.bottom - 3; bounced = true; }
    if (!bounced) return;

    const count = (this.bounces.get(p) ?? 0) + 1;
    if (count > MAX_BOUNCES) { p.destroy(); return; }
    this.bounces.set(p, count);
    // Each wall it survives makes the shot meaner — a shot that has crossed the room ten
    // times has earned its damage.
    p.damage = Math.max(1, Math.round(p.damage * 1.08));
    p.setRotation(Math.atan2(body.velocity.y, body.velocity.x));

    const scene = this.api.scene;
    const spark = scene.add.circle(p.x, p.y, 8, 0x8fd8ff, 0.85).setDepth(FX_DEPTH);
    scene.tweens.add({ targets: spark, scale: 2.4, alpha: 0, duration: 200, onComplete: () => spark.destroy() });
    const tag = scene.add.text(p.x, p.y - 14, `${count}`, {
      fontSize: '11px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
      color: '#a8e4ff', stroke: '#04121a', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(FX_DEPTH + 1);
    scene.tweens.add({ targets: tag, y: p.y - 30, alpha: 0, duration: 420, onComplete: () => tag.destroy() });
  }

  /** Two forks at ±20°, half strength, and barred from forking again. */
  private fork(p: Projectile): void {
    if (!p.active || !p.body) return;
    const { scene, projectiles } = this.api;
    const body = p.body as Phaser.Physics.Arcade.Body;
    const speed = body.velocity.length();
    if (speed < 1) return;
    const base = Math.atan2(body.velocity.y, body.velocity.x);
    const damage = Math.max(1, Math.round(p.damage * 0.55));

    for (const offset of [-0.35, 0.35]) {
      const angle = base + offset;
      const clone = new Projectile(scene, p.x, p.y, p.texture.key, damage, true);
      clone.setScale(p.scaleX * 0.8, p.scaleY * 0.8);
      clone.setAlpha(0.92);
      clone.setRotation(angle);
      this.noFork.add(clone);
      this.seenPlayerShots.add(clone);
      // Order is mandatory: the group's create-callback replaces the body on add, so
      // velocity set before this would be thrown away.
      projectiles.add(clone);
      clone.launch(Math.cos(angle) * speed, Math.sin(angle) * speed);
    }

    const flash = scene.add.circle(p.x, p.y, 10, 0xd8a5ff, 0.7).setDepth(FX_DEPTH);
    scene.tweens.add({ targets: flash, scale: 2.2, alpha: 0, duration: 220, onComplete: () => flash.destroy() });
  }

  private fireBraidNova(): void {
    const { scene, npc } = this.api;
    if (!npc.active || npc.hp <= 0) return;
    const x = npc.x;
    const y = npc.y;

    // Three forks of a bolt striking down onto the target, then the ring.
    const bolt = scene.add.graphics().setDepth(FX_DEPTH + 1);
    for (let f = 0; f < 3; f++) {
      let px = x + (f - 1) * 22;
      let py = y - 220;
      bolt.lineStyle(f === 1 ? 4 : 2, f === 1 ? 0xffffff : 0xffee00, 0.9);
      bolt.beginPath();
      bolt.moveTo(px, py);
      for (let s = 0; s < 6; s++) {
        px += (x - px) / (6 - s) + (Math.random() - 0.5) * 26;
        py += (y - py) / (6 - s);
        bolt.lineTo(px, py);
      }
      bolt.lineTo(x, y);
      bolt.strokePath();
    }
    scene.tweens.add({ targets: bolt, alpha: 0, duration: 260, onComplete: () => bolt.destroy() });

    const ring = scene.add.circle(x, y, 170, 0xffee00, 0.28).setDepth(FX_DEPTH).setScale(0.2);
    scene.tweens.add({ targets: ring, scale: 1, alpha: 0, duration: 340, onComplete: () => ring.destroy() });

    npc.takeDamage(45);
    npc.earthStunnedUntil = Math.max(npc.earthStunnedUntil, scene.time.now + 350);
    this.api.showFloatingText(x, y - 40, '⚡ BRAID', '#ffee66');
  }

  private updateHalo(dt: number): void {
    const { player, npc } = this.api;
    const g = this.haloG;
    if (!g || !g.active) return;
    g.clear();
    if (!player.active || player.hp <= 0) return;

    const inside = npc.active && npc.hp > 0
      && Phaser.Math.Distance.Between(player.x, player.y, npc.x, npc.y) <= HALO_RADIUS;

    // A ring of tendrils that reach further and redden when there is something to drain.
    const pulse = 1 + Math.sin(this.elapsedMs / 260) * 0.03;
    g.fillStyle(0xff4d6d, inside ? 0.10 : 0.05);
    g.fillCircle(player.x, player.y, HALO_RADIUS * pulse);
    g.lineStyle(2, 0xff4d6d, inside ? 0.7 : 0.32);
    g.strokeCircle(player.x, player.y, HALO_RADIUS * pulse);
    for (let i = 0; i < 16; i++) {
      const a = (Math.PI * 2 * i) / 16 + this.elapsedMs / 1400;
      const r0 = HALO_RADIUS * pulse - 14;
      const r1 = HALO_RADIUS * pulse + (inside ? 8 : 2);
      g.lineStyle(1.5, 0xff8095, inside ? 0.6 : 0.22);
      g.beginPath();
      g.moveTo(player.x + Math.cos(a) * r0, player.y + Math.sin(a) * r0);
      g.lineTo(player.x + Math.cos(a) * r1, player.y + Math.sin(a) * r1);
      g.strokePath();
    }

    if (!inside) return;
    // A thread from the victim back to the player while it drains.
    g.lineStyle(2.5, 0xff2a3c, 0.55);
    g.beginPath(); g.moveTo(npc.x, npc.y); g.lineTo(player.x, player.y); g.strokePath();

    this.leechPool += (HALO_DPS * dt) / 1000;
    const whole = Math.floor(this.leechPool);
    if (whole >= 1) {
      this.leechPool -= whole;
      npc.takeDamage(whole);
      player.heal(whole);
    }
  }

  private freeze(): void {
    const { scene, npc } = this.api;
    this.rimeStacks = 0;
    this.frozenUntil = this.elapsedMs + FREEZE_MS;
    npc.artifactIncomingMult = FREEZE_VULN;
    npc.earthStunnedUntil = Math.max(npc.earthStunnedUntil, scene.time.now + FREEZE_MS);
    this.api.showFloatingText(npc.x, npc.y - 44, '❄️ FROZEN SOLID', '#bfe9ff');
    scene.cameras.main.flash(160, 150, 210, 255);
  }

  private updateRime(): void {
    const { npc } = this.api;
    const g = this.rimeG;
    if (this.frozenUntil > 0 && this.elapsedMs >= this.frozenUntil) {
      this.frozenUntil = 0;
      npc.artifactIncomingMult = 1;
    }
    if (this.rimeStacks > 0 && this.elapsedMs - this.rimeLastAt > RIME_FADE_MS) this.rimeStacks = 0;
    if (!g || !g.active) return;
    g.clear();
    if (!npc.active || npc.hp <= 0) return;

    const frozen = this.elapsedMs < this.frozenUntil;
    if (frozen) {
      // A rough ice shell: six facets around the body, lit at the top.
      g.fillStyle(0x9fd8ff, 0.28);
      g.fillCircle(npc.x, npc.y, 34);
      g.lineStyle(2, 0xdcf3ff, 0.8);
      for (let i = 0; i < 6; i++) {
        const a0 = (Math.PI * 2 * i) / 6;
        const a1 = (Math.PI * 2 * (i + 1)) / 6;
        g.beginPath();
        g.moveTo(npc.x + Math.cos(a0) * 34, npc.y + Math.sin(a0) * 34);
        g.lineTo(npc.x, npc.y);
        g.lineTo(npc.x + Math.cos(a1) * 34, npc.y + Math.sin(a1) * 34);
        g.strokePath();
      }
      g.lineStyle(2.5, 0xffffff, 0.55);
      g.strokeCircle(npc.x, npc.y, 34);
      return;
    }
    // Unfrozen: one shard per stack, orbiting.
    for (let i = 0; i < this.rimeStacks; i++) {
      const a = (Math.PI * 2 * i) / RIME_TO_FREEZE + this.elapsedMs / 700;
      const sx = npc.x + Math.cos(a) * 30;
      const sy = npc.y + Math.sin(a) * 30;
      g.fillStyle(0xbfe9ff, 0.9);
      g.fillTriangle(sx - 4, sy + 4, sx + 4, sy + 4, sx, sy - 6);
    }
  }

  private updateLedger(): void {
    const { scene, npc } = this.api;
    if (this.elapsedMs < this.ledgerNextAt) return;
    this.ledgerNextAt = this.elapsedMs + LEDGER_PERIOD_MS;
    const owed = Math.round(this.ledger * LEDGER_SHARE);
    this.ledger = 0;
    if (owed <= 0 || !npc.active || npc.hp <= 0) return;

    // The page tears itself out and lands on them.
    const page = scene.add.rectangle(this.api.player.x, this.api.player.y, 22, 28, 0xf2ead6, 0.9)
      .setDepth(FX_DEPTH).setAngle(-20);
    scene.tweens.add({
      targets: page, x: npc.x, y: npc.y, angle: 340, duration: 240, ease: 'Quad.easeIn',
      onComplete: () => {
        page.destroy();
        const burst = scene.add.circle(npc.x, npc.y, 90, 0xc23a2e, 0.4).setDepth(FX_DEPTH).setScale(0.2);
        scene.tweens.add({ targets: burst, scale: 1, alpha: 0, duration: 320, onComplete: () => burst.destroy() });
        if (npc.active && npc.hp > 0) npc.takeDamage(owed);
        this.api.showFloatingText(npc.x, npc.y - 42, `📕 SETTLED ${owed}`, '#ff9b8a');
      },
    });
  }

  private updateWrath(): void {
    const { player } = this.api;
    const missing = 1 - Phaser.Math.Clamp(player.hp / Math.max(1, player.maxHp), 0, 1);
    const want = 1 + Math.min(WRATH_CAP, missing * WRATH_PER_MISSING);
    if (Math.abs(want - this.wrathApplied) < 0.001) return;
    player.cardOutgoingDamageMult = (player.cardOutgoingDamageMult / this.wrathApplied) * want;
    this.wrathApplied = want;
  }

  private trackGrace(p: Projectile): void {
    const { player } = this.api;
    if (this.graceCredited.has(p)) return;
    const d = Phaser.Math.Distance.Between(player.x, player.y, p.x, p.y);
    if (d <= GRACE_RADIUS) { this.graceNear.add(p); return; }
    if (d < GRACE_CLEAR || !this.graceNear.has(p)) return;
    // It came inside a hand's breadth and left again without touching us.
    this.graceCredited.add(p);
    this.graceStacks = Math.min(GRACE_MAX, this.graceStacks + 1);
    this.graceUntil = this.elapsedMs + GRACE_MS;
    this.api.showFloatingText(player.x, player.y - 44, `🩰 ×${this.graceStacks}`, '#ff9ecb');
  }

  private updateGrace(): void {
    const { player } = this.api;
    if (this.graceStacks > 0 && this.elapsedMs >= this.graceUntil) this.graceStacks = 0;
    const wantDmg = 1 + 0.09 * this.graceStacks;
    const wantSpeed = 1 + 0.10 * this.graceStacks;
    if (Math.abs(wantDmg - this.graceDmgApplied) > 0.001) {
      player.cardOutgoingDamageMult = (player.cardOutgoingDamageMult / this.graceDmgApplied) * wantDmg;
      this.graceDmgApplied = wantDmg;
    }
    if (Math.abs(wantSpeed - this.graceSpeedApplied) > 0.001) {
      this.api.applyPlayerSpeedMult(wantSpeed / this.graceSpeedApplied);
      this.graceSpeedApplied = wantSpeed;
    }
  }

  private updateSnare(): void {
    const { scene, player, npc } = this.api;
    const g = this.snareG;
    if (g && g.active) {
      g.clear();
      if (this.elapsedMs < this.snareFlashUntil && npc.active) {
        // A web tightening around them.
        const k = 1 - (this.snareFlashUntil - this.elapsedMs) / SNARE_ROOT_MS;
        g.lineStyle(2, 0xb98cff, 0.75);
        for (let i = 0; i < 10; i++) {
          const a = (Math.PI * 2 * i) / 10;
          g.beginPath();
          g.moveTo(npc.x, npc.y);
          g.lineTo(npc.x + Math.cos(a) * 60, npc.y + Math.sin(a) * 60);
          g.strokePath();
        }
        for (let r = 1; r <= 3; r++) {
          g.lineStyle(1.5, 0x8844cc, 0.55);
          g.strokeCircle(npc.x, npc.y, 20 * r * (1 - k * 0.3));
        }
      }
    }

    if (this.elapsedMs < this.snareNextAt) return;
    this.snareNextAt = this.elapsedMs + SNARE_PERIOD_MS;
    if (!npc.active || npc.hp <= 0) return;

    const nx = npc.x + (player.x - npc.x) * 0.5;
    const ny = npc.y + (player.y - npc.y) * 0.5;
    const body = npc.body as Phaser.Physics.Arcade.Body | null;
    npc.x = nx;
    npc.y = ny;
    body?.reset(nx, ny);
    npc.earthStunnedUntil = Math.max(npc.earthStunnedUntil, scene.time.now + SNARE_ROOT_MS);
    this.snareFlashUntil = this.elapsedMs + SNARE_ROOT_MS;
    this.api.showFloatingText(nx, ny - 44, '🕸️ SNARED', '#c9a8ff');
  }

  private updateBulwark(): void {
    const { player } = this.api;
    if (!this.shellReady && this.elapsedMs >= this.shellNextAt) {
      this.shellReady = true;
      this.api.showFloatingText(player.x, player.y - 50, '🪞 SHELL', '#eef3fa');
    }
    const g = this.shellG;
    if (!g || !g.active) return;
    g.clear();
    if (!this.shellReady || !player.active || player.hp <= 0) return;
    // Six mirror panes standing around the player, catching the light in sequence.
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI * 2 * i) / 6 + this.elapsedMs / 2200;
      const x0 = player.x + Math.cos(a) * 30;
      const y0 = player.y + Math.sin(a) * 30;
      const shimmer = 0.35 + 0.35 * Math.max(0, Math.sin(this.elapsedMs / 300 + i));
      g.fillStyle(0xeef3fa, shimmer * 0.5);
      g.fillTriangle(x0 - 7, y0 + 9, x0 + 7, y0 + 9, x0, y0 - 12);
      g.lineStyle(1, 0xffffff, shimmer);
      g.strokeCircle(player.x, player.y, 34);
    }
  }

  private updateTrail(dt: number): void {
    const { player, npc } = this.api;
    if (player.active && player.hp > 0 && this.elapsedMs >= this.trailNextAt) {
      this.trailNextAt = this.elapsedMs + 180;
      this.trail.push({ x: player.x, y: player.y, bornAt: this.elapsedMs });
    }
    this.trail = this.trail.filter((p) => this.elapsedMs - p.bornAt < TRAIL_PATCH_MS);

    const g = this.trailG;
    if (g && g.active) {
      g.clear();
      for (const patch of this.trail) {
        const life = 1 - (this.elapsedMs - patch.bornAt) / TRAIL_PATCH_MS;
        const r = TRAIL_RADIUS * (0.55 + life * 0.45);
        g.fillStyle(0xff5a1e, 0.16 * life);
        g.fillCircle(patch.x, patch.y, r);
        g.fillStyle(0xffb347, 0.22 * life);
        g.fillCircle(patch.x, patch.y, r * 0.55);
        // Three tongues of flame off each patch, leaning with the clock.
        for (let i = 0; i < 3; i++) {
          const a = (Math.PI * 2 * i) / 3 + this.elapsedMs / 400 + patch.bornAt;
          const fx = patch.x + Math.cos(a) * r * 0.5;
          const fy = patch.y + Math.sin(a) * r * 0.5;
          g.fillStyle(0xffe066, 0.3 * life);
          g.fillTriangle(fx - 4, fy + 5, fx + 4, fy + 5, fx, fy - 9 - 5 * life);
        }
      }
    }

    if (!npc.active || npc.hp <= 0) return;
    const standing = this.trail.some(
      (p) => Phaser.Math.Distance.Between(p.x, p.y, npc.x, npc.y) <= TRAIL_RADIUS,
    );
    if (!standing) return;
    this.trailPool += (TRAIL_DPS * dt) / 1000;
    const whole = Math.floor(this.trailPool);
    if (whole >= 1) {
      this.trailPool -= whole;
      npc.takeDamage(whole);
    }
  }

  private updateCrown(): void {
    const { player } = this.api;
    if (this.elapsedMs < this.crownNextAt) return;
    this.crownNextAt = this.elapsedMs + CROWN_PERIOD_MS;
    this.crownStacks++;
    player.cardOutgoingDamageMult *= 1.08;
    this.api.applyPlayerSpeedMult(1.05);
    player.setMaxHp(player.maxHp + 30);
    player.heal(30);
    this.api.showFloatingText(player.x, player.y - 56, `👑 ×${this.crownStacks}`, '#ffe9a8');
    this.api.scene.cameras.main.flash(120, 240, 214, 138);
  }

  // ── HUD ───────────────────────────────────────────────────────────

  private buildHud(): void {
    const { scene } = this.api;
    this.hudText = scene.add.text(14, scene.scale.height - 34, '', {
      fontSize: '15px',
      fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
      color: '#ffd970',
      stroke: '#1a1204',
      strokeThickness: 3,
    }).setOrigin(0, 1).setDepth(HUD_DEPTH).setScrollFactor(0);
    this.refreshHud();
  }

  /** One glyph per armed artifact, annotated with whatever counter that one is running. */
  private refreshHud(): void {
    if (!this.hudText || !this.hudText.active) return;
    const parts: string[] = [];
    for (const def of ARTIFACTS) {
      if (!this.active.has(def.power)) continue;
      let tag = '';
      switch (def.power) {
        case 'staticBraid': tag = `${this.hitCount % BRAID_EVERY}/${BRAID_EVERY}`; break;
        case 'rimeBrand':
          tag = this.elapsedMs < this.frozenUntil ? '❄' : `${this.rimeStacks}/${RIME_TO_FREEZE}`;
          break;
        case 'grudgeLedger': tag = `${Math.round(this.ledger * LEDGER_SHARE)}`; break;
        case 'wrathEngine': tag = `+${Math.round((this.wrathApplied - 1) * 100)}%`; break;
        case 'bulletBallet': tag = `×${this.graceStacks}`; break;
        case 'mirrorBulwark': tag = this.shellReady ? '●' : '○'; break;
        case 'kingmaker': tag = `×${this.crownStacks}`; break;
        default: break;
      }
      parts.push(tag ? `${def.emoji}${tag}` : def.emoji);
    }
    this.hudText.setText(parts.length ? `✦ ${parts.join('  ')}` : '');
  }
}
