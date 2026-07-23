import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';

// ── Air Mastery constants ─────────────────────────────────────────────────────

/** Swift as the Wind: each connecting snipe is worth this much move speed and dodge. */
const SWIFT_PER_STACK = 0.05;
const SWIFT_MAX_STACKS = 10;          // caps both bonuses at +50%
/** Snipes in a row needed to bank one "Deadeye" mastery streak. */
const SNIPE_STREAK_LEN = 5;
/** Enemies a single Charged Beam must run through to score a multi-hit. */
const BEAM_MULTI_HIT = 2;
/** Radius of the player's Wind Trap, mirrored from ArenaScene's trap logic. */
const WIND_TRAP_RADIUS = 80;

const TORNADO_COOLDOWN_MS = 12000;
const TORNADO_SPEED = 260;
const TORNADO_RADIUS = 95;
/** How fast captured enemies are reeled in toward the eye, in px/sec. */
const TORNADO_PULL_SPEED = 320;
/** Captured enemies orbit the eye at this rate (radians/sec) while being reeled in. */
const TORNADO_ORBIT_SPEED = 4;

// ── Arena API interface ────────────────────────────────────────────────────────

/** The live view of the player's Wind Trap, or null when no trap is up. */
export interface WindTrapLike {
  x: number;
  y: number;
}

export interface AirArenaApi {
  readonly player: Fighter;
  readonly npc: Fighter;
  readonly enemies: Fighter[];
  readonly scene: Phaser.Scene;
  readonly eKey: Phaser.Input.Keyboard.Key;
  readonly rKey: Phaser.Input.Keyboard.Key;
  readonly fKey: Phaser.Input.Keyboard.Key;
  readonly qKey: Phaser.Input.Keyboard.Key;
  readonly nukeChanneling: boolean;
  readonly width: number;
  readonly height: number;
  /** True only when the player is air AND Air Mastery is switched on. */
  readonly masteryActive: boolean;
  /** The player's Wind Trap centre while it is up, else null. */
  readonly windTrap: WindTrapLike | null;
  /** Mastery enhancement id bound over the given ability slot, or null if that slot is unchanged. */
  masteryBindFor(slot: string): string | null;
  /** Online: broadcast a bindable mastery cast so the peer's sim replays it. */
  broadcastMasteryCast(enhId: string): void;
  recordMasteryStat(key: string, amount: number): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
}

// ── AirKit ────────────────────────────────────────────────────────────────────

interface Tornado {
  gfx: Phaser.GameObjects.Arc;
  eye: Phaser.GameObjects.Text;
  x: number;
  y: number;
  vx: number;
  vy: number;
  spin: number;
  /** Each captive's polar offset from the eye, reeled inward every frame. */
  captured: Map<Fighter, { angle: number; dist: number }>;
  /** 'player' tornadoes sweep enemies; 'npc' (online replay) sweeps the local player. */
  owner: 'player' | 'npc';
}

/**
 * Air Mastery only. The base Air kit (snipe, quick shot, wind trap, grapple, beam)
 * still lives in ArenaScene; this owns the mastery passive, the Sweeping Tornado,
 * and every mastery progress counter.
 */
export class AirKit {
  // -- Swift as the Wind --
  private swiftStacks = 0;

  // -- Deadeye streak (counts toward mastery whether or not mastery is on) --
  private snipeStreak = 0;

  // -- Sweeping Tornado --
  private tornadoLastCastAt = -Infinity;
  private tornado: Tornado | null = null;
  /** Online mirror: the opponent's Sweeping Tornado replayed on this victim sim. */
  private npcTornado: Tornado | null = null;

  // last known aim, captured in handleInput so the tornado launches toward the cursor
  private lastMouseX = 0;
  private lastMouseY = 0;

  constructor(private readonly arena: AirArenaApi) {}

  reset(): void {
    this.swiftStacks = 0;
    this.snipeStreak = 0;
    this.tornadoLastCastAt = -Infinity;
    this.clearTornado('player');
    this.clearTornado('npc');
  }

  handleInput(time: number, mouseX: number, mouseY: number): void {
    this.lastMouseX = mouseX;
    this.lastMouseY = mouseY;
    if (!this.arena.masteryActive) return;

    const slot = this.tornadoSlot();
    if (!slot) return;
    const key = slot === 'e' ? this.arena.eKey
      : slot === 'r' ? this.arena.rKey
      : slot === 'q' ? this.arena.qKey
      : this.arena.fKey;
    if (Phaser.Input.Keyboard.JustDown(key) && !this.arena.nukeChanneling) {
      this.tryCastTornado(time, mouseX, mouseY);
    }
  }

  update(_time: number, delta: number): void {
    this.tickTornado(this.tornado, delta);
  }

  // ── Reporting hooks (called from ArenaScene) ──────────────────────────────

  /**
   * One resolved Air Snipe. Runs regardless of whether mastery is switched on —
   * the counters are how the player earns the mastery in the first place.
   */
  onSnipeResult(hit: boolean, hitTargets?: Array<{ x: number; y: number }>): void {
    if (hit) {
      this.snipeStreak++;
      if (this.snipeStreak >= SNIPE_STREAK_LEN) {
        this.snipeStreak = 0;
        this.arena.recordMasteryStat('snipeStreaks', 1);
        this.arena.showFloatingText(this.arena.player.x, this.arena.player.y - 44, '🎯 DEADEYE!', '#ccddff');
      }

      const trap = this.arena.windTrap;
      if (trap && hitTargets) {
        const ensnared = hitTargets.filter(
          (t) => Phaser.Math.Distance.Between(trap.x, trap.y, t.x, t.y) <= WIND_TRAP_RADIUS,
        );
        if (ensnared.length > 0) {
          this.arena.recordMasteryStat('windTrapSnipes', ensnared.length);
          const t = ensnared[0];
          this.arena.showFloatingText(t.x, t.y - 44, '🌀 CAGED!', '#aaddff');
        }
      }

      if (this.arena.masteryActive && this.swiftStacks < SWIFT_MAX_STACKS) {
        this.swiftStacks++;
        this.arena.showFloatingText(
          this.arena.player.x, this.arena.player.y - 30,
          `💨 +${Math.round(this.swiftStacks * SWIFT_PER_STACK * 100)}%`, '#ccddff',
        );
      }
    } else {
      this.snipeStreak = 0;
      // A single miss blows the whole stack away.
      if (this.arena.masteryActive && this.swiftStacks > 0) {
        this.swiftStacks = 0;
        this.arena.showFloatingText(this.arena.player.x, this.arena.player.y - 30, '💨 SWIFTNESS LOST', '#8899aa');
      }
    }
  }

  /** One resolved Charged Beam, with the number of enemies it ran through. */
  onBeamHits(count: number): void {
    if (count < BEAM_MULTI_HIT) return;
    this.arena.recordMasteryStat('beamMultiHits', 1);
    this.arena.showFloatingText(this.arena.player.x, this.arena.player.y - 44, `⚡ ${count} SKEWERED!`, '#88ccff');
  }

  /** The player just spent a grapple dodge (charge or F-upgrade window) to avoid a hit. */
  onGrappleDodge(): void {
    this.arena.recordMasteryStat('grappleDodges', 1);
  }

  // ── Public accessors read by ArenaScene ───────────────────────────────────

  /** Swift as the Wind move speed. 1 when the passive isn't earning. */
  getPlayerSpeedMult(): number {
    return this.arena.masteryActive ? 1 + this.swiftStacks * SWIFT_PER_STACK : 1;
  }

  /** Swift as the Wind dodge roll — an independent roll so it stacks with other dodge sources. */
  rollMasteryDodge(): boolean {
    if (!this.arena.masteryActive || this.swiftStacks === 0) return false;
    return Math.random() < this.swiftStacks * SWIFT_PER_STACK;
  }

  /** 0–1 cooldown fill for the Sweeping Tornado HUD card. */
  getTornadoCooldownRatio(time: number): number {
    return Math.min(1, (time - this.tornadoLastCastAt) / TORNADO_COOLDOWN_MS);
  }

  // ── Sweeping Tornado ──────────────────────────────────────────────────────

  /** The ability slot Sweeping Tornado is bound over this match, or null. */
  private tornadoSlot(): string | null {
    for (const slot of ['e', 'r', 'f', 'q']) {
      if (this.arena.masteryBindFor(slot) === 'sweeping-tornado') return slot;
    }
    return null;
  }

  private tryCastTornado(time: number, mouseX: number, mouseY: number): void {
    if (time - this.tornadoLastCastAt < TORNADO_COOLDOWN_MS) return;
    this.tornadoLastCastAt = time;
    this.spawnTornado(mouseX, mouseY, 'player');
    this.arena.showFloatingText(this.arena.player.x, this.arena.player.y - 28, '🌪️ Sweeping Tornado!', '#c0c8d0');
    this.arena.broadcastMasteryCast('sweeping-tornado');
  }

  /** Online replay: the remote air player cast Sweeping Tornado — sweep our local fighter. */
  doNpcTornado(tx: number, ty: number): void {
    this.spawnTornado(tx, ty, 'npc');
  }

  /** Online: opponent is air — advance their replayed tornado (which drags our local fighter). */
  updateNpc(_time: number, delta: number): void {
    this.tickTornado(this.npcTornado, delta);
  }

  private spawnTornado(aimX: number, aimY: number, owner: 'player' | 'npc'): void {
    this.clearTornado(owner);
    const { player, npc, scene } = this.arena;
    const origin = owner === 'player' ? player : npc;
    const ang = Math.atan2(aimY - origin.y, aimX - origin.x);
    const gfx = scene.add.circle(origin.x, origin.y, TORNADO_RADIUS, 0x4a4a52, 0.3).setDepth(4);
    gfx.setStrokeStyle(3, 0x9aa4b0, 0.8);
    const eye = scene.add.text(origin.x, origin.y, '🌪️', { fontSize: '40px' }).setOrigin(0.5).setDepth(5);

    const tornado: Tornado = {
      gfx, eye,
      x: origin.x, y: origin.y,
      vx: Math.cos(ang) * TORNADO_SPEED,
      vy: Math.sin(ang) * TORNADO_SPEED,
      spin: 0,
      captured: new Map<Fighter, { angle: number; dist: number }>(),
      owner,
    };
    if (owner === 'player') this.tornado = tornado; else this.npcTornado = tornado;
  }

  /**
   * The tornado rolls forward, vacuuming up anything it touches and dragging it along.
   * Reaching any arena edge bursts it and drops everything it was holding.
   */
  private tickTornado(t: Tornado | null, delta: number): void {
    if (!t) return;
    const dt = delta / 1000;

    t.x += t.vx * dt;
    t.y += t.vy * dt;
    t.spin += dt * 6;
    t.gfx.setPosition(t.x, t.y);
    t.eye.setPosition(t.x, t.y);
    t.eye.setRotation(t.spin);

    // 'npc' tornadoes (online replay) sweep the local player; 'player' ones sweep enemies.
    const sweepTargets = t.owner === 'npc' ? [this.arena.player] : this.arena.enemies;
    // Vacuum: anything inside the funnel this frame is caught for the rest of the ride.
    for (const e of sweepTargets) {
      if (!e.active || e.hp <= 0 || t.captured.has(e)) continue;
      const d = Phaser.Math.Distance.Between(t.x, t.y, e.x, e.y);
      if (d > TORNADO_RADIUS) continue;
      t.captured.set(e, { angle: Math.atan2(e.y - t.y, e.x - t.x), dist: d });
      this.arena.showFloatingText(e.x, e.y - 38, '🌪️ SUCKED IN!', '#c0c8d0');
    }

    // Drag: captives are pinned by position, not velocity. Enemy AI rewrites its own
    // velocity every frame, so anything short of an outright position write loses the
    // tug of war — this is the same approach the base Wind Trap uses.
    for (const [e, hold] of t.captured) {
      if (!e.active || e.hp <= 0) { t.captured.delete(e); continue; }
      hold.dist = Math.max(0, hold.dist - TORNADO_PULL_SPEED * dt);
      hold.angle += TORNADO_ORBIT_SPEED * dt;
      const body = e.body as Phaser.Physics.Arcade.Body;
      body.setVelocity(0, 0);
      // reset() teleports the body with the sprite; a bare setPosition leaves them desynced.
      body.reset(t.x + Math.cos(hold.angle) * hold.dist, t.y + Math.sin(hold.angle) * hold.dist);
    }

    const { width, height } = this.arena;
    if (t.x <= TORNADO_RADIUS || t.x >= width - TORNADO_RADIUS
      || t.y <= TORNADO_RADIUS || t.y >= height - TORNADO_RADIUS) {
      this.burstTornado(t);
    }
  }

  private burstTornado(t: Tornado): void {
    for (const e of t.captured.keys()) {
      if (!e.active || e.hp <= 0) continue;
      (e.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
      this.arena.showFloatingText(e.x, e.y - 38, 'RELEASED', '#8899aa');
    }
    const burst = this.arena.scene.add.circle(t.x, t.y, TORNADO_RADIUS, 0x9aa4b0, 0.4).setDepth(4);
    this.arena.scene.tweens.add({
      targets: burst, scaleX: 1.6, scaleY: 1.6, alpha: 0, duration: 320,
      onComplete: () => burst.destroy(),
    });
    this.clearTornado(t.owner);
  }

  private clearTornado(owner: 'player' | 'npc'): void {
    const t = owner === 'player' ? this.tornado : this.npcTornado;
    if (!t) return;
    t.gfx.destroy();
    t.eye.destroy();
    if (owner === 'player') this.tornado = null; else this.npcTornado = null;
  }
}
