import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { CastContext } from '../Ability';
import {
  SHADOW, ShadowAvatar, ShadowColorFn, ShadowFx, ShadowShroud,
  shadowTendril, shadowTendrilLayered,
} from './ShadowVisuals';

/**
 * Every shadow ability — the player's and the NPC's alike — is cast through the `do*` methods
 * below, so each one drives its own arm gesture right where it fires. That covers the local
 * player, the AI opponent and an online peer's replayed casts from one place, which is why
 * this kit has no separate npc-cast-id gesture table.
 */

// ── Hopelessness tuning ─────────────────────────────────────────────────
/** Gained per second while standing in an enemy shadow pool. */
const HOPELESS_POOL_PER_SEC = 3;
/** Bled off per second, always. */
const HOPELESS_DRAIN_PER_SEC = 1;
/** Every 2% of hopelessness costs 1% outgoing damage, capped at 50%. */
const HOPELESS_DAMAGE_PER_POINT = 0.005;
const HOPELESS_DAMAGE_CAP = 0.5;

// ── Tentacle Wall (F) tuning ────────────────────────────────────────────
const WALL_TENTACLE_COUNT = 8;
const WALL_SPACING = 34;
const WALL_DURATION_MS = 6000;
/** A single wall can only hit the same target this often. */
const WALL_HIT_CD_MS = 1000;
const WALL_TENTACLE_DAMAGE = 5;
const WALL_TENTACLE_HOPELESS = 10;
const WALL_HIT_RADIUS = 28;
const WALL_GROW_MS = 200;
/** Delay between one tentacle erupting and the next — the window you can steer the wall in. */
const WALL_STEP_MS = 55;
/** F+ Watchers: chance for a tentacle to grow red eyes and lob hopelessness amplifiers. */
const WATCHER_CHANCE = 0.2;
const WATCHER_LOB_INTERVAL_MS = 1500;
const WATCHER_HOPELESS_MULT = 1.25;

// ── String perk (Snap Stakes) tuning ────────────────────────────────────
const STAKE_LIFETIME_MS = 24000;
const TRIPLINE_DAMAGE = 5;
const TRIPLINE_HOPELESS = 10;
const TRIPLINE_SLOW_MULT = 0.5;
const TRIPLINE_SLOW_MS = 3000;
const TRIPLINE_HIT_CD_MS = 1500;

// ── Shadow Mastery tuning ───────────────────────────────────────────────
/** Shared Suffering: every this much damage taken spreads hopelessness. */
const SHARED_SUFFERING_DAMAGE = 30;
const SHARED_SUFFERING_HOPELESS = 5;
const BEACON_COOLDOWN_MS = 35000;
const BEACON_LIFETIME_MS = 20000;
const BEACON_DAMAGE = 20;
const BEACON_HOPELESS = 10;
const BEACON_BLAST_RADIUS = 70;

// ── Shadow world-object types ───────────────────────────────────────────

interface DarkCloud {
  /** Redrawn every frame — the rim crawls, filaments grope and eyes surface inside it. */
  gfx: Phaser.GameObjects.Graphics;
  expiresAt: number;
  spawnAt: number;
  /** Per-pool offset so a field of pools never breathes in lockstep. */
  seed: number;
  x: number;
  y: number;
  radius: number;
  tickAccum: number;
  owner: 'player' | 'npc';
}

/**
 * Something dark in flight — a writhing orb of void trailing a tail of tendrils. One flight
 * model covers all three shapes shadow throws:
 *  - `bomb`    the Click detonation: blast damage, then a pool
 *  - `watcher` an F+ eyed tentacle's despair amplifier: no damage, multiplies hopelessness
 *  - `shell`   a Shadow Beacon mortar round: the beacon owns its own impact, this just flies
 */
interface DarkBomb {
  gfx: Phaser.GameObjects.Graphics;
  x: number; y: number;
  fromX: number; fromY: number;
  toX: number; toY: number;
  spawnAt: number;
  arriveAt: number;
  owner: 'player' | 'npc';
  mode: 'bomb' | 'watcher' | 'shell';
  mark: Fighter | null;
}

interface SnapTrap {
  /** Redrawn every frame — jaws quiver, stakes flutter their tie-off rags. */
  gfx: Phaser.GameObjects.Graphics;
  expiresAt: number;
  spawnAt: number;
  /** Per-object offset so a field of traps never twitches in lockstep. */
  phase: number;
  x: number;
  y: number;
  triggered: boolean;
  radius: number;
  owner: 'player' | 'npc';
  /** String perk: this is a Snap Stake — inert on its own, dangerous once strung to a partner. */
  isStake?: boolean;
}

/** String perk: the tripline strung between a pair of stakes. */
interface Tripline {
  a: SnapTrap;
  b: SnapTrap;
  owner: 'player' | 'npc';
  gfx: Phaser.GameObjects.Graphics;
  lastTripAt: number;
}

interface WallTentacle {
  x: number;
  y: number;
  gfx: Phaser.GameObjects.Graphics;
  spawnAt: number;
  /** Sway phase offset so neighbouring tentacles don't move in lockstep. */
  phase: number;
  eyed: boolean;
  nextLobAt: number;
}

interface TentacleWall {
  tentacles: WallTentacle[];
  expiresAt: number;
  owner: 'player' | 'npc';
  /** Per-target hit timestamps — the whole wall shares one 1s cooldown per victim. */
  lastHit: Map<Fighter, number>;
  /** Tentacles still to erupt. Each one aims from the last at wherever the cursor is *now*. */
  pending: number;
  nextSpawnAt: number;
  /** Where the previous tentacle went up — the next one grows beside it. */
  lastX: number;
  lastY: number;
  watchers: boolean;
}

interface ShadowBeacon {
  /** The emplacement: plate, bolts and a barrel that tracks the dot. */
  gfx: Phaser.GameObjects.Graphics;
  /** The marked impact point: spinning reticle around a pulsing core. */
  dotGfx: Phaser.GameObjects.Graphics;
  spawnAt: number;
  x: number;
  y: number;
  dotX: number;
  dotY: number;
  expiresAt: number;
  owner: 'player' | 'npc';
  /** False while the owner is still standing on the mortar — they must step off to re-fire. */
  armed: boolean;
}

// ── ShadowArenaApi ───────────────────────────────────────────────────────

export interface ShadowArenaApi {
  readonly player: Fighter;
  readonly npc: Fighter;
  readonly enemies: Fighter[];
  readonly scene: Phaser.Scene;
  readonly eKey: Phaser.Input.Keyboard.Key;
  readonly fKey: Phaser.Input.Keyboard.Key;
  readonly rKey: Phaser.Input.Keyboard.Key;
  readonly qKey: Phaser.Input.Keyboard.Key;
  readonly nukeChanneling: boolean;
  readonly pointerWasDown: boolean;
  readonly elementId: string;
  readonly npcElementId: string;
  readonly width: number;
  readonly height: number;
  readonly hpBarY: number;
  readonly hpBarW: number;
  readonly hpBarH: number;
  get npcSpeedMult(): number;
  get npcNukeChanneling(): boolean;
  set npcNukeChanneling(v: boolean);
  hasUpgrade(slot: string): boolean;
  hasNpcUpgrade(slot: string): boolean;
  hasPerk(owner: 'player' | 'npc', perkId: string): boolean;
  /** Cosmetics: maps a shadow visual color through the owner's color cosmetic. */
  shadowColor(owner: 'player' | 'npc', base: number): number;
  spawnHitFlash(x: number, y: number, color: number): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  buildPlayerContext(x: number, y: number): CastContext;
  /** True only when the player is shadow AND Shadow Mastery is switched on. */
  get masteryActive(): boolean;
  /** Mastery enhancement id bound over the given ability slot, or null if that slot is unchanged. */
  masteryBindFor(slot: string): string | null;
  /** Online: broadcast a bindable mastery cast so the peer's sim replays it. */
  broadcastMasteryCast(enhId: string): void;
  recordMasteryStat(key: string, amount: number): void;
}

// ── ShadowKit ────────────────────────────────────────────────────────────

export class ShadowKit {
  // ── Visuals ───────────────────────────────────────────────────────────
  /** Colour mappers + effect painters, one per owner so a colour cosmetic recolours one side. */
  private readonly pcol: ShadowColorFn;
  private readonly ncol: ShadowColorFn;
  private readonly pfx: ShadowFx;
  private readonly nfx: ShadowFx;
  /** The shadow character rig (ball arms, eyes, tendril crown) for each shadow-element fighter. */
  private playerAvatar: ShadowAvatar | null = null;
  private npcAvatar: ShadowAvatar | null = null;
  /** Last aim point, cached in handleInput so the per-frame avatar update can face it. */
  private aimX = 0;
  private aimY = 0;
  /** Shadow Mastery passive shroud. Sits under the Consume shroud so the two stack. */
  private masteryShroud: ShadowShroud | null = null;
  private consumeShroud: ShadowShroud | null = null;
  private darkBombs: DarkBomb[] = [];

  // ── Player shadow ────────────────────────────────────────────────────
  private shadowDrainHoldAccum = 0;
  private shadowDrainCloudAccum = 0;
  private shadowTentacleActive = false;
  private shadowTentacleEnd = 0;
  private shadowTentacleX = 0;
  private shadowTentacleY = 0;
  private shadowTentacleHooked = false; // true when NPC is hooked and being dragged
  private shadowTentacleSprite: Phaser.GameObjects.Graphics | null = null;
  private shadowNpcSnaredUntil = 0;
  private shadowNpcStunnedUntil = 0;
  private shadowNpcThrowUntil = 0;
  private shadowBlackHoleActive = false;
  private shadowBlackHoleEnd = 0;
  private shadowBlackHoleX = 0;
  private shadowBlackHoleY = 0;
  private shadowBlackHoleDamageAccum = 0;
  private shadowBlackHoleHealAccum = 0;
  private shadowBlackHoleSprite: Phaser.GameObjects.Graphics | null = null;
  // Shared cloud/trap arrays
  private shadowDarkClouds: DarkCloud[] = [];
  private shadowSnapTraps: SnapTrap[] = [];
  private triplines: Tripline[] = [];
  /** Most recent stake still waiting for a partner, per owner. */
  private pendingStake: { player: SnapTrap | null; npc: SnapTrap | null } = { player: null, npc: null };
  private walls: TentacleWall[] = [];
  /** Cast-time aim per wall, used only for its first tentacle (before the cursor takes over). */
  private wallAim = new Map<TentacleWall, { x: number; y: number }>();
  private beacons: ShadowBeacon[] = [];
  /** Fighters currently slowed by a tripline → expiry timestamp. */
  private slowedUntil = new Map<Fighter, number>();
  /** Fighters this kit has tinted for hopelessness, so it only clears its own tint. */
  private tinted = new Set<Fighter>();
  private oozeAccum = 0;

  // ── NPC shadow ───────────────────────────────────────────────────────
  private npcShadowTentacleActive = false;
  private npcShadowTentacleHooked = false;
  private npcShadowTentacleEnd = 0;
  private npcShadowTentacleX = 0;
  private npcShadowTentacleY = 0;
  private npcShadowTentacleSprite: Phaser.GameObjects.Graphics | null = null;
  private npcShadowDragTargetX = 0;
  private npcShadowDragTargetY = 0;
  private npcShadowDragNextChangeAt = 0;
  private shadowPlayerSnaredUntil = 0;
  private shadowPlayerStunnedUntil = 0;
  private npcShadowBlackHoleActive = false;
  private npcShadowBlackHoleEnd = 0;
  private npcShadowBlackHoleSprite: Phaser.GameObjects.Graphics | null = null;

  // ── Shadow — upgrade state ──────────────────────────────────────────
  private shadowConsumeActive = false;
  private shadowConsumeEnd = 0;
  private shadowConsumeTickAccum = 0;
  private shadowConfusionUntil = 0;
  private shadowConfusionAngle = 0;
  private shadowConfusionNextChange = 0;
  private shadowCloudExposureAccum = 0;
  private shadowBHPuddleAccum = 0;

  // ── Shadow Mastery ───────────────────────────────────────────────────
  /** Shared Suffering: damage taken since the last hopelessness pulse. */
  private sufferingAccum = 0;
  private lastPlayerHp = -1;
  private beaconLastCastAt = -Infinity;

  constructor(private arena: ShadowArenaApi) {
    this.pcol = (base) => arena.shadowColor('player', base);
    this.ncol = (base) => arena.shadowColor('npc', base);
    this.pfx = new ShadowFx(arena.scene, this.pcol);
    this.nfx = new ShadowFx(arena.scene, this.ncol);
  }

  /** Colour mapper for a side. */
  private col(owner: 'player' | 'npc'): ShadowColorFn { return owner === 'player' ? this.pcol : this.ncol; }
  /** Effect painter for a side. */
  private fx(owner: 'player' | 'npc'): ShadowFx { return owner === 'player' ? this.pfx : this.nfx; }

  // ── Public accessors for cross-cutting arena state ─────────────────────

  isConsumeActive(): boolean { return this.shadowConsumeActive; }
  getNpcThrowUntil(): number { return this.shadowNpcThrowUntil; }
  isPlayerSnared(time: number): boolean { return time < this.shadowPlayerSnaredUntil || time < this.shadowPlayerStunnedUntil; }
  isNpcTentacleDragging(): boolean { return this.npcShadowTentacleHooked && this.npcShadowTentacleActive; }
  getNpcDragTargetX(): number { return this.npcShadowDragTargetX; }
  getNpcDragTargetY(): number { return this.npcShadowDragTargetY; }
  /** True while the player's Black Hole is up — used by ArenaScene to attribute mastery kills. */
  isBlackHoleActive(): boolean { return this.shadowBlackHoleActive; }
  /** 0 = just cast, 1 = ready. Drives the HUD bar when Shadow Beacon is bound to a slot. */
  getShadowBeaconCooldownRatio(time: number): number {
    return Math.min(1, (time - this.beaconLastCastAt) / BEACON_COOLDOWN_MS);
  }
  /** Tripline slow contribution for the NPC (1 = unslowed). */
  getNpcSpeedMult(time: number): number {
    return time < (this.slowedUntil.get(this.arena.npc) ?? 0) ? TRIPLINE_SLOW_MULT : 1;
  }
  /** Tripline slow contribution for the player (1 = unslowed). */
  getPlayerSpeedMult(time: number): number {
    return time < (this.slowedUntil.get(this.arena.player) ?? 0) ? TRIPLINE_SLOW_MULT : 1;
  }

  reset(): void {
    // Visuals — every GameObject dies with the old scene run, so rebuild lazily in update().
    if (this.playerAvatar) { this.playerAvatar.destroy(); this.playerAvatar = null; }
    if (this.npcAvatar) { this.npcAvatar.destroy(); this.npcAvatar = null; }
    if (this.masteryShroud) { this.masteryShroud.destroy(); this.masteryShroud = null; }
    if (this.consumeShroud) { this.consumeShroud.destroy(); this.consumeShroud = null; }
    for (const b of this.darkBombs) b.gfx.destroy();
    this.darkBombs = [];
    this.aimX = 0;
    this.aimY = 0;

    this.shadowDrainHoldAccum = 0;
    this.shadowDrainCloudAccum = 0;
    this.shadowTentacleActive = false;
    this.shadowTentacleHooked = false;
    this.shadowTentacleEnd = 0;
    this.shadowTentacleX = 0;
    this.shadowTentacleY = 0;
    this.shadowTentacleSprite = null;
    this.shadowNpcSnaredUntil = 0;
    this.shadowNpcStunnedUntil = 0;
    this.shadowNpcThrowUntil = 0;
    this.shadowBlackHoleActive = false;
    this.shadowBlackHoleEnd = 0;
    this.shadowBlackHoleX = 0;
    this.shadowBlackHoleY = 0;
    this.shadowBlackHoleDamageAccum = 0;
    this.shadowBlackHoleHealAccum = 0;
    this.shadowBlackHoleSprite = null;
    for (const c of this.shadowDarkClouds) c.gfx.destroy();
    this.shadowDarkClouds = [];
    for (const t of this.shadowSnapTraps) t.gfx.destroy();
    this.shadowSnapTraps = [];
    for (const line of this.triplines) line.gfx.destroy();
    this.triplines = [];
    this.pendingStake = { player: null, npc: null };
    for (const wall of this.walls) for (const t of wall.tentacles) t.gfx.destroy();
    this.walls = [];
    this.wallAim.clear();
    for (const b of this.beacons) { b.gfx.destroy(); b.dotGfx.destroy(); }
    this.beacons = [];
    for (const f of this.slowedUntil.keys()) if (f.active) f.walkSpeedMult = 1;
    this.slowedUntil.clear();
    for (const f of this.tinted) if (f.active) f.clearTint();
    this.tinted.clear();
    this.oozeAccum = 0;
    this.npcShadowTentacleActive = false;
    this.npcShadowTentacleHooked = false;
    this.npcShadowTentacleEnd = 0;
    this.npcShadowTentacleX = 0;
    this.npcShadowTentacleY = 0;
    this.npcShadowTentacleSprite = null;
    this.npcShadowDragTargetX = 0;
    this.npcShadowDragTargetY = 0;
    this.npcShadowDragNextChangeAt = 0;
    this.shadowPlayerSnaredUntil = 0;
    this.shadowPlayerStunnedUntil = 0;
    this.npcShadowBlackHoleActive = false;
    this.npcShadowBlackHoleEnd = 0;
    this.npcShadowBlackHoleSprite = null;
    this.shadowConsumeActive = false;
    this.shadowConsumeEnd = 0;
    this.shadowConsumeTickAccum = 0;
    this.shadowConfusionUntil = 0;
    this.shadowConfusionAngle = 0;
    this.shadowConfusionNextChange = 0;
    this.shadowCloudExposureAccum = 0;
    this.shadowBHPuddleAccum = 0;
    this.sufferingAccum = 0;
    this.lastPlayerHp = -1;
    this.beaconLastCastAt = -Infinity;
    this.arena.player.hopelessness = 0;
    this.arena.player.hopelessIncomingMult = 1;
    this.arena.npc.hopelessness = 0;
    this.arena.npc.hopelessIncomingMult = 1;
  }

  // ── Hopelessness ──────────────────────────────────────────────────────

  /** Everything the player's shadow can afflict, plus the player themself (NPC shadow's victim). */
  private hopelessTargets(): Fighter[] {
    const out: Fighter[] = [];
    const seen = new Set<Fighter>();
    for (const f of [this.arena.player, this.arena.npc, ...this.arena.enemies]) {
      if (!f || !f.active || seen.has(f)) continue;
      seen.add(f);
      out.push(f);
    }
    return out;
  }

  /** Add hopelessness (clamped 0–100) and pop a floating readout. */
  private applyHopelessness(target: Fighter, amount: number, announce = true): void {
    if (!target.active || target.hp <= 0) return;
    const before = target.hopelessness;
    target.hopelessness = Phaser.Math.Clamp(before + amount, 0, 100);
    const gained = target.hopelessness - before;
    if (announce && gained >= 1) {
      this.arena.showFloatingText(target.x, target.y - 26, `🕳️ +${Math.round(gained)}%`, '#aa66dd');
    }
  }

  /** F+ Watchers: scale existing despair rather than adding a flat amount. */
  private multiplyHopelessness(target: Fighter, mult: number): void {
    if (!target.active || target.hp <= 0 || target.hopelessness <= 0) return;
    const before = target.hopelessness;
    target.hopelessness = Phaser.Math.Clamp(before * mult, 0, 100);
    const gained = target.hopelessness - before;
    if (gained >= 1) {
      this.arena.showFloatingText(target.x, target.y - 26, `👁️ x${mult}`, '#cc3355');
    }
  }

  /** Pool build-up, natural drain, damage suppression and the blackening/ooze visuals. */
  private updateHopelessness(time: number, delta: number): void {
    const dt = delta / 1000;
    const player = this.arena.player;

    for (const f of this.hopelessTargets()) {
      // Standing in an enemy shadow pool feeds despair; it always bleeds back off.
      const hostileOwner: 'player' | 'npc' = f === player ? 'npc' : 'player';
      const inPool = this.shadowDarkClouds.some(
        c => c.owner === hostileOwner && Phaser.Math.Distance.Between(c.x, c.y, f.x, f.y) <= c.radius + 14,
      );
      if (inPool) this.applyHopelessness(f, HOPELESS_POOL_PER_SEC * dt, false);
      if (f.hopelessness > 0) {
        f.hopelessness = Math.max(0, f.hopelessness - HOPELESS_DRAIN_PER_SEC * dt);
      }

      // Blacken with despair; the tint is cleared only for fighters this kit darkened.
      if (f.hopelessness > 0) {
        const k = Math.min(1, f.hopelessness / 100);
        const c = Math.round(255 * (1 - k * 0.85));
        f.setTint(Phaser.Display.Color.GetColor(c, Math.round(c * 0.92), Math.round(c * 0.98)));
        this.tinted.add(f);
      } else if (this.tinted.has(f)) {
        f.clearTint();
        this.tinted.delete(f);
      }
    }

    // Black ooze weeping off whoever is most consumed: motes that sink instead of rising, so
    // despair reads as something draining out of the victim rather than burning off them.
    this.oozeAccum += delta;
    if (this.oozeAccum >= 110) {
      this.oozeAccum -= 110;
      for (const f of this.hopelessTargets()) {
        if (f.hopelessness < 10) continue;
        if (Math.random() > f.hopelessness / 100) continue;
        // The despair belongs to the afflicted, so it uses their own side's palette.
        const fx = f === player ? this.pfx : this.nfx;
        fx.wisps(
          f.x + Phaser.Math.Between(-14, 14), f.y + Phaser.Math.Between(-8, 6), 1,
          { angle: Math.PI / 2, spread: 0.5, speed: 26, size: 3, life: 700, rise: -22, depth: 4 },
        );
      }
    }

    // Victim-side damage suppression: takeDamage has no attacker handle, so each fighter
    // carries "my attacker is hopeless" as an incoming multiplier (same as bribeIncomingMult).
    // Multi-enemy sims use the worst-afflicted enemy as the stand-in.
    let worstEnemy = 0;
    for (const e of this.arena.enemies) {
      if (e.active && e.hp > 0) worstEnemy = Math.max(worstEnemy, e.hopelessness);
    }
    worstEnemy = Math.max(worstEnemy, this.arena.npc.active ? this.arena.npc.hopelessness : 0);
    player.hopelessIncomingMult = 1 - Math.min(HOPELESS_DAMAGE_CAP, worstEnemy * HOPELESS_DAMAGE_PER_POINT);
    this.arena.npc.hopelessIncomingMult = 1 - Math.min(HOPELESS_DAMAGE_CAP, player.hopelessness * HOPELESS_DAMAGE_PER_POINT);

    // Tripline slows expire back to normal walk speed.
    for (const [f, until] of this.slowedUntil) {
      if (time >= until) {
        if (f.active) f.walkSpeedMult = 1;
        this.slowedUntil.delete(f);
      } else if (f.active) {
        f.walkSpeedMult = Math.min(f.walkSpeedMult, TRIPLINE_SLOW_MULT);
      }
    }
  }

  private spawnDarkCloud(x: number, y: number, owner: 'player' | 'npc'): void {
    const scene = this.arena.scene;
    const voidOn = this.arena.hasPerk(owner, 'void-shade');
    const radius = voidOn ? 43 : 36;
    const duration = voidOn ? 9000 : 6000;
    this.shadowDarkClouds.push({
      gfx: scene.add.graphics().setDepth(3),
      expiresAt: scene.time.now + duration,
      spawnAt: scene.time.now,
      seed: Math.random() * Math.PI * 2,
      x, y, radius, tickAccum: 0, owner,
    });
    // The pool doesn't fade in — it wells up, so the arrival gets its own beat.
    const fx = this.fx(owner);
    fx.ring(x, y, radius * 0.2, radius * 1.1, SHADOW.lilac, 420, 3, 3);
    fx.wisps(x, y, 5, { speed: radius * 1.1, size: 2.6, life: 520, rise: 16, depth: 4 });
  }

  /** Every live dark pool repainted in one pass, plus its short spawn swell. */
  private drawDarkClouds(time: number): void {
    for (const c of this.shadowDarkClouds) {
      const g = c.gfx;
      g.clear();
      const grow = Math.min(1, (time - c.spawnAt) / 260);
      // Pools thin out over their last second rather than blinking off.
      const left = c.expiresAt - time;
      const alpha = left < 900 ? Math.max(0, left / 900) : 1;
      ShadowFx.drawPool(
        g, this.col(c.owner), c.x, c.y,
        c.radius * (0.5 + grow * 0.5), time / 1000, alpha, c.seed,
      );
    }
  }

  // ── Ability-cast methods (invoked via CastContext delegates) ──────────

  /**
   * The thrown bomb: a writhing orb of void that grows a tail of tendrils as it accelerates,
   * then implodes. Flight is stepped in `updateDarkBombs` rather than tweened, so the art can
   * react to the orb's own velocity.
   */
  doLaunchDarkBomb(x: number, y: number, isPlayer: boolean): void {
    const scene = this.arena.scene;
    const caster = isPlayer ? this.arena.player : this.arena.npc;
    const owner: 'player' | 'npc' = isPlayer ? 'player' : 'npc';
    const avatar = isPlayer ? this.playerAvatar : this.npcAvatar;
    const angle = Math.atan2(y - caster.y, x - caster.x);

    avatar?.play('punch', angle);
    // Fire the muzzle out of the hand that actually threw it.
    const hand = avatar?.castHand() ?? { x: caster.x, y: caster.y };
    this.fx(owner).muzzleUmbra(hand.x, hand.y, angle, 1, 8);

    this.darkBombs.push({
      gfx: scene.add.graphics().setDepth(8),
      x: caster.x, y: caster.y,
      fromX: caster.x, fromY: caster.y,
      toX: x, toY: y,
      spawnAt: scene.time.now,
      arriveAt: scene.time.now + 380,
      owner,
      mode: 'bomb',
      mark: null,
    });
  }

  /** Steps every bomb in flight, paints it, and detonates the ones that have arrived. */
  private updateDarkBombs(time: number): void {
    for (let i = this.darkBombs.length - 1; i >= 0; i--) {
      const b = this.darkBombs[i];
      const life = b.arriveAt - b.spawnAt;
      const t = Math.min(1, (time - b.spawnAt) / life);
      const prevX = b.x, prevY = b.y;
      // Accelerating arc: the orb leaves lazily and slams home, which reads as weight.
      const ease = t * t * (3 - 2 * t) * 0.4 + t * t * 0.6;
      b.x = b.fromX + (b.toX - b.fromX) * ease;
      b.y = b.fromY + (b.toY - b.fromY) * ease;

      const tint = this.col(b.owner);
      const g = b.gfx;
      g.clear();
      const back = Math.atan2(prevY - b.y, prevX - b.x);
      const speed = Math.hypot(b.x - prevX, b.y - prevY);
      const r = b.mode === 'watcher' ? 6.5 : b.mode === 'shell' ? 10 : 9;
      // Tail streams out of the back of the shot and lengthens with speed.
      for (let k = 0; k < 4; k++) {
        const off = (k - 1.5) * 0.34;
        shadowTendrilLayered(
          g, tint, b.x, b.y, back + off,
          r * 1.4 + speed * 1.5, r * 0.4, Math.sin(time * 0.01 + k) * 6,
          0.75, 4, k * 1.7, { barbs: 0, rim: false },
        );
      }
      g.fillStyle(tint(SHADOW.orchid), 0.42);
      g.fillCircle(b.x, b.y, r * 1.7);
      g.fillStyle(tint(SHADOW.abyss), 0.98);
      g.fillCircle(b.x, b.y, r);
      g.lineStyle(2, tint(b.mode === 'watcher' ? SHADOW.blood : SHADOW.mauve), 0.9);
      g.strokeCircle(b.x, b.y, r * (1.08 + Math.sin(time * 0.02) * 0.1));

      if (t < 1) continue;
      g.destroy();
      this.darkBombs.splice(i, 1);
      this.detonateDarkBomb(b);
    }
  }

  private detonateDarkBomb(b: DarkBomb): void {
    const { player, enemies, scene } = this.arena;
    const fx = this.fx(b.owner);

    // Beacon shells are only being flown here; `fireBeacon` owns their impact.
    if (b.mode === 'shell') return;

    if (b.mode === 'watcher') {
      // Watcher bolt: no blast, a despair amplifier that gropes for whoever it was aimed at.
      fx.implosion(b.toX, b.toY, 44, { tendrils: 7, gloom: 1, duration: 320, stain: false });
      const mark = b.mark;
      if (mark && mark.active && mark.hp > 0 && Phaser.Math.Distance.Between(b.toX, b.toY, mark.x, mark.y) <= 44) {
        this.multiplyHopelessness(mark, WATCHER_HOPELESS_MULT);
        this.arena.spawnHitFlash(mark.x, mark.y, SHADOW.blood);
      }
      return;
    }

    fx.implosion(b.toX, b.toY, 62, { tendrils: 10, gloom: 2, duration: 400 });
    scene.cameras.main.shake(90, 0.003);
    const victims: Fighter[] = b.owner === 'player' ? enemies : [player];
    for (const t of victims) {
      if (!t.active || t.hp <= 0) continue;
      if (Phaser.Math.Distance.Between(b.toX, b.toY, t.x, t.y) > 50) continue;
      t.takeDamage(10);
      this.arena.spawnHitFlash(t.x, t.y, SHADOW.amethyst);
    }
    this.spawnDarkCloud(b.toX, b.toY, b.owner);
  }

  doActivateTentacle(x: number, y: number, isPlayer: boolean): void {
    const scene = this.arena.scene;
    const { player, npc, enemies } = this.arena;
    if (isPlayer) {
      const hookDist = Phaser.Math.Distance.Between(player.x, player.y, npc.x, npc.y);
      this.shadowTentacleActive = true;
      this.shadowTentacleHooked = hookDist <= 110;
      // Trap drag: check if a trap/stake is near cursor — extend duration for the drag
      const hasTrapNearby = this.canDragTraps('player') && this.shadowSnapTraps.some(
        t => t.owner === 'player' && !t.triggered &&
             Phaser.Math.Distance.Between(t.x, t.y, x, y) <= 55,
      );
      this.shadowTentacleEnd = scene.time.now + (this.shadowTentacleHooked ? 3000 : hasTrapNearby ? 3000 : 600);
      // Tentacle endpoint: toward cursor but clamped to 100px range
      const angle = Math.atan2(y - player.y, x - player.x);
      const reach = Math.min(100, Phaser.Math.Distance.Between(player.x, player.y, x, y));
      this.shadowTentacleX = player.x + Math.cos(angle) * reach;
      this.shadowTentacleY = player.y + Math.sin(angle) * reach;
      if (!this.shadowTentacleSprite) {
        this.shadowTentacleSprite = scene.add.graphics().setDepth(6);
      }
      // The limb lashes out of the body before the tether takes over the drawing.
      this.playerAvatar?.play('sweep', angle);
      this.pfx.lash(player.x, player.y, angle, reach);
      for (const t of enemies) {
        if (!t.active || t.hp <= 0) continue;
        if (Phaser.Math.Distance.Between(player.x, player.y, t.x, t.y) <= 110) {
          t.takeDamage(10);
          this.applyHopelessness(t, WALL_TENTACLE_HOPELESS);
          this.arena.spawnHitFlash(t.x, t.y, SHADOW.amethyst);
          this.pfx.tendrilBurst(t.x, t.y, 34, 6, 7);
        }
      }
    } else {
      const hookDist = Phaser.Math.Distance.Between(npc.x, npc.y, player.x, player.y);
      this.npcShadowTentacleActive = true;
      this.npcShadowTentacleHooked = hookDist <= 110;
      this.npcShadowTentacleEnd = scene.time.now + (this.npcShadowTentacleHooked ? 3000 : 600);
      if (!this.npcShadowTentacleSprite) {
        this.npcShadowTentacleSprite = scene.add.graphics().setDepth(6);
      }
      const npcAim = Math.atan2(player.y - npc.y, player.x - npc.x);
      this.npcAvatar?.play('sweep', npcAim);
      this.nfx.lash(npc.x, npc.y, npcAim, Math.min(110, hookDist));
      if (this.npcShadowTentacleHooked) {
        player.takeDamage(10);
        this.applyHopelessness(player, WALL_TENTACLE_HOPELESS);
        this.arena.spawnHitFlash(player.x, player.y, SHADOW.violet);
        this.nfx.tendrilBurst(player.x, player.y, 34, 6, 7);
        // Pick initial random drag target
        const { width, height } = this.arena;
        this.npcShadowDragTargetX = Phaser.Math.Between(80, width - 80);
        this.npcShadowDragTargetY = Phaser.Math.Between(80, height - 80);
        this.npcShadowDragNextChangeAt = scene.time.now + 700;
      }
    }
  }

  /** Traps follow the tentacle for either shadow tentacle upgrade (E+ Consume or R+ Trap Drag). */
  private canDragTraps(owner: 'player' | 'npc'): boolean {
    const has = (slot: string) => (owner === 'player' ? this.arena.hasUpgrade(slot) : this.arena.hasNpcUpgrade(slot));
    return has('r') || has('e');
  }

  doPlaceSnapTrap(isPlayer: boolean): void {
    const scene = this.arena.scene;
    const { player, npc } = this.arena;
    const owner: 'player' | 'npc' = isPlayer ? 'player' : 'npc';
    const caster = isPlayer ? player : npc;
    const isStake = this.arena.hasPerk(owner, 'plume');
    const bigTraps = isPlayer ? this.arena.hasUpgrade('r') : this.arena.hasNpcUpgrade('r');

    // Hands come together low and shove the thing into the ground.
    (isPlayer ? this.playerAvatar : this.npcAvatar)?.play('clap');
    const fx = this.fx(owner);
    fx.ring(caster.x, caster.y, 4, bigTraps ? 34 : 24, SHADOW.lilac, 340, 3, 3);
    fx.wisps(caster.x, caster.y, 4, { speed: 45, size: 2.4, life: 420, rise: -10, depth: 4 });

    if (isStake) {
      // Snap Stake: a bare spike. Harmless until a second stake strings a tripline to it.
      const stake: SnapTrap = {
        gfx: scene.add.graphics().setDepth(4),
        expiresAt: scene.time.now + STAKE_LIFETIME_MS,
        spawnAt: scene.time.now,
        phase: Math.random() * Math.PI * 2,
        x: caster.x, y: caster.y,
        triggered: false, radius: 8, owner, isStake: true,
      };
      this.shadowSnapTraps.push(stake);
      const waiting = this.pendingStake[owner];
      if (waiting && !waiting.triggered && scene.time.now < waiting.expiresAt) {
        this.triplines.push({
          a: waiting, b: stake, owner,
          gfx: scene.add.graphics().setDepth(3),
          lastTripAt: -Infinity,
        });
        this.pendingStake[owner] = null;
        this.arena.showFloatingText(caster.x, caster.y - 24, '🧵 STRUNG', '#cc88ff');
      } else {
        this.pendingStake[owner] = stake;
      }
      return;
    }

    this.shadowSnapTraps.push({
      gfx: scene.add.graphics().setDepth(4),
      expiresAt: scene.time.now + 12000,
      spawnAt: scene.time.now,
      phase: Math.random() * Math.PI * 2,
      x: caster.x, y: caster.y,
      triggered: false, radius: bigTraps ? 27 : 18, owner,
    });
  }

  /**
   * A sprung bear trap: quivering jaw teeth around a pressure plate, with a charge spark
   * breathing in the middle. Upgraded traps are simply bigger, so the art scales with radius.
   */
  private drawSnapTrap(t: SnapTrap, time: number): void {
    const g = t.gfx;
    g.clear();
    const grow = Math.min(1, (time - t.spawnAt) / 220);
    const r = t.radius * grow;
    const tint = this.col(t.owner);
    const accent = tint(t.owner === 'player' ? SHADOW.mauve : SHADOW.amethyst);

    g.fillStyle(tint(SHADOW.abyss), 0.3);
    g.fillEllipse(t.x, t.y + r * 0.35, r * 2.1, r * 0.8);

    // Jaw ring the teeth are seated in.
    g.fillStyle(tint(SHADOW.pitch), 0.9);
    g.fillCircle(t.x, t.y, r);

    // Jaw teeth: long enough to read at game scale, each breathing on its own beat.
    const teeth = 10;
    for (let i = 0; i < teeth; i++) {
      const a = (i / teeth) * Math.PI * 2 + t.phase * 0.1;
      const inner = r * 0.46;
      const outer = r * (1.08 + 0.08 * Math.sin(time * 0.01 + i + t.phase));
      const w = 0.13;
      g.fillStyle(tint(i % 2 ? SHADOW.orchid : SHADOW.plum), 0.98);
      g.lineStyle(1.5, accent, 0.9);
      g.beginPath();
      g.moveTo(t.x + Math.cos(a - w) * inner, t.y + Math.sin(a - w) * inner);
      g.lineTo(t.x + Math.cos(a) * outer, t.y + Math.sin(a) * outer);
      g.lineTo(t.x + Math.cos(a + w) * inner, t.y + Math.sin(a + w) * inner);
      g.closePath();
      g.fillPath();
      g.strokePath();
    }

    // Feeler tendrils groping outward from under the jaws — the tell that the trap is alive
    // and not a piece of scenery bolted to the floor.
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + t.phase + Math.sin(time * 0.0015 + i) * 0.4;
      g.fillStyle(tint(SHADOW.violet), 0.75);
      shadowTendril(g, t.x, t.y, a, r * (1.3 + 0.3 * Math.sin(time * 0.004 + i)), r * 0.13,
        Math.sin(time * 0.003 + i) * r * 0.4);
    }

    // Pressure plate + rim.
    g.fillStyle(tint(SHADOW.umbra), 0.97);
    g.fillCircle(t.x, t.y, r * 0.46);
    g.lineStyle(2, accent, 0.85);
    g.strokeCircle(t.x, t.y, r * 0.46);

    // Charge spark waiting to snap.
    const pulse = 0.5 + 0.5 * Math.sin(time * 0.008 + t.phase);
    g.fillStyle(accent, 0.3 + pulse * 0.55);
    g.fillCircle(t.x, t.y, r * 0.18 + pulse * 2.5);
  }

  /**
   * A Snap Stake: a leaning iron spike driven into the ground, with the knot and two loose
   * rag ends at its head fluttering — visibly something a string wants to be tied to.
   */
  private drawStake(t: SnapTrap, time: number): void {
    const g = t.gfx;
    g.clear();
    const grow = Math.min(1, (time - t.spawnAt) / 200);
    const h = 22 * grow;
    const lean = Math.sin(t.phase) * 3;
    const flutter = Math.sin(time * 0.005 + t.phase) * 3 * grow;
    const tint = this.col(t.owner);
    const accent = tint(t.owner === 'player' ? SHADOW.mauve : SHADOW.orchid);
    const tipX = t.x + lean;
    const tipY = t.y - h;

    g.fillStyle(tint(SHADOW.abyss), 0.32);
    g.fillEllipse(t.x, t.y + 3, 16 * grow, 6 * grow);

    g.fillStyle(tint(SHADOW.pitch), 0.97);
    g.lineStyle(1.5, accent, 0.85);
    g.beginPath();
    g.moveTo(t.x - 4.5 * grow, t.y + 2);
    g.lineTo(tipX - 1.7, tipY);
    g.lineTo(tipX + 1.7, tipY);
    g.lineTo(t.x + 4.5 * grow, t.y + 2);
    g.closePath();
    g.fillPath();
    g.strokePath();

    // Tie-off knot + trailing ends.
    g.fillStyle(accent, 0.9);
    g.fillCircle(tipX, tipY + 2, 2.7 * grow);
    g.lineStyle(1.5, accent, 0.7);
    g.lineBetween(tipX, tipY + 2, tipX - 5 + flutter, tipY + 9);
    g.lineBetween(tipX, tipY + 2, tipX + 4 + flutter * 0.6, tipY + 10);
  }

  /**
   * The jaws close: a stab of teeth converging on the victim, a shock front and a stain where
   * the trap tore itself apart. Fired from the trap's position rather than the victim's, so
   * the bite visibly comes from the thing that was lying in wait.
   */
  private snapTrapBite(trap: SnapTrap, victim: Fighter): void {
    const fx = this.fx(trap.owner);
    fx.implosion(trap.x, trap.y, trap.radius * 2.6, {
      tendrils: 12, gloom: 1, duration: 380, depth: 6,
    });
    // Teeth driven into whatever stepped on it.
    fx.tendrilBurst(victim.x, victim.y, 30, 8, 8);
    this.arena.scene.cameras.main.shake(140, 0.005);
  }

  /** Player-only: NPC never uses black hole. */
  doStartBlackHole(x: number, y: number): void {
    const scene = this.arena.scene;
    const player = this.arena.player;
    this.shadowBlackHoleActive = true;
    this.shadowBlackHoleEnd = scene.time.now + 3000;
    this.shadowBlackHoleX = x;
    this.shadowBlackHoleY = y;
    this.shadowBlackHoleDamageAccum = 0;
    this.shadowBlackHoleHealAccum = 0;
    if (this.shadowBlackHoleSprite) this.shadowBlackHoleSprite.destroy();
    this.shadowBlackHoleSprite = scene.add.graphics().setDepth(5);

    // Arms thrust up and hold for the whole ultimate, and the singularity is born out of a
    // gather rather than simply appearing at the cursor.
    this.playerAvatar?.play('raise', Math.atan2(y - player.y, x - player.x), 3000);
    this.pfx.channelGather(x, y, 90, 700);
    this.pfx.implosion(x, y, 90, { tendrils: 14, gloom: 3, duration: 520, depth: 5 });
    // Q+ Void Singularity is a bigger event, so the ground mark it leaves is bigger too.
    if (this.arena.hasUpgrade('q')) this.pfx.voidPillar(x, y, 26, 120, 6);
    scene.cameras.main.shake(260, 0.007);
  }

  // ── Tentacle Wall (F) ─────────────────────────────────────────────────

  /**
   * Erupt 8 spiked tentacles in a line: the first right beside the caster, each of the rest
   * next to the one before it. They rise one at a time and each aims at wherever the cursor
   * is when *it* erupts, so sweeping the mouse mid-cast curves the wall after it.
   */
  doSummonTentacleWall(x: number, y: number, isPlayer: boolean): void {
    const scene = this.arena.scene;
    const owner: 'player' | 'npc' = isPlayer ? 'player' : 'npc';
    const caster = isPlayer ? this.arena.player : this.arena.npc;
    this.walls.push({
      tentacles: [],
      expiresAt: scene.time.now + WALL_DURATION_MS + WALL_TENTACLE_COUNT * WALL_STEP_MS,
      owner,
      lastHit: new Map(),
      pending: WALL_TENTACLE_COUNT,
      nextSpawnAt: scene.time.now,
      lastX: caster.x,
      lastY: caster.y,
      watchers: isPlayer ? this.arena.hasUpgrade('f') : this.arena.hasNpcUpgrade('f'),
    });
    // First tentacle aims where the cast was pointed; the rest re-aim as they come up.
    this.wallAim.set(this.walls[this.walls.length - 1], { x, y });
    // Overhead, then driven into the ground — the wall is being pushed up out of the floor.
    (isPlayer ? this.playerAvatar : this.npcAvatar)?.play('slam', Math.atan2(y - caster.y, x - caster.x));
    this.fx(owner).ring(caster.x, caster.y, 10, 70, SHADOW.mauve, 420, 4, 3);
    this.arena.showFloatingText(caster.x, caster.y - 34, '🦑 TENTACLE WALL', '#aa44ff');
  }

  /** Grow the next tentacle in a wall, beside the last one, toward the current aim point. */
  private growWall(wall: TentacleWall, time: number): void {
    const scene = this.arena.scene;
    // The player steers with the live cursor; an NPC wall snakes toward the player instead.
    let aimX: number;
    let aimY: number;
    if (wall.owner === 'player') {
      const ptr = scene.input.activePointer;
      aimX = ptr.worldX;
      aimY = ptr.worldY;
    } else {
      aimX = this.arena.player.x;
      aimY = this.arena.player.y;
    }
    // Before the pointer has reported a position, fall back on the cast's aim point.
    const seed = this.wallAim.get(wall);
    if (seed && wall.tentacles.length === 0) { aimX = seed.x; aimY = seed.y; }

    const dx = aimX - wall.lastX;
    const dy = aimY - wall.lastY;
    // Cursor sitting on top of the last tentacle: keep the wall going the way it was headed.
    const angle = (dx * dx + dy * dy) < 1
      ? (wall.tentacles.length > 1
        ? Math.atan2(wall.lastY - wall.tentacles[wall.tentacles.length - 2].y,
                     wall.lastX - wall.tentacles[wall.tentacles.length - 2].x)
        : 0)
      : Math.atan2(dy, dx);
    const step = wall.tentacles.length === 0 ? 30 : WALL_SPACING;
    const nx = Phaser.Math.Clamp(wall.lastX + Math.cos(angle) * step, 16, this.arena.width - 16);
    const ny = Phaser.Math.Clamp(wall.lastY + Math.sin(angle) * step, 24, this.arena.height - 16);

    wall.tentacles.push({
      x: nx,
      y: ny,
      gfx: scene.add.graphics().setDepth(6),
      spawnAt: time,
      phase: Math.random() * Math.PI * 2,
      eyed: wall.watchers && Math.random() < WATCHER_CHANCE,
      nextLobAt: time + WATCHER_LOB_INTERVAL_MS,
    });
    // Each spike breaks the ground it comes up through.
    const fx = this.fx(wall.owner);
    fx.stain(nx, ny, 20, 2);
    fx.wisps(nx, ny + 4, 4, { speed: 60, size: 2.4, life: 380, rise: 22, depth: 5 });
    wall.lastX = nx;
    wall.lastY = ny;
    wall.pending--;
    wall.nextSpawnAt = time + WALL_STEP_MS;
    if (wall.pending <= 0) this.wallAim.delete(wall);
  }

  /** Online replay: the remote shadow player raised a wall — mirror it as an NPC-owned wall. */
  doNpcTentacleWall(x: number, y: number): void {
    this.doSummonTentacleWall(x, y, false);
  }

  private updateWalls(time: number, delta: number): void {
    void delta;
    const { player, enemies } = this.arena;
    for (let wi = this.walls.length - 1; wi >= 0; wi--) {
      const wall = this.walls[wi];
      if (time >= wall.expiresAt) {
        for (const t of wall.tentacles) t.gfx.destroy();
        this.wallAim.delete(wall);
        this.walls.splice(wi, 1);
        continue;
      }
      // Erupt the next tentacle(s) due this frame, each steering toward the live cursor.
      while (wall.pending > 0 && time >= wall.nextSpawnAt) this.growWall(wall, time);
      const victims: Fighter[] = wall.owner === 'player' ? enemies : [player];
      for (const t of wall.tentacles) {
        const grow = Math.min(1, (time - t.spawnAt) / WALL_GROW_MS);
        this.drawTentacle(t, time, grow, wall.owner);
        if (grow < 0.5) continue;

        for (const v of victims) {
          if (!v.active || v.hp <= 0) continue;
          if (Phaser.Math.Distance.Between(t.x, t.y, v.x, v.y) > WALL_HIT_RADIUS) continue;
          if (time - (wall.lastHit.get(v) ?? -Infinity) < WALL_HIT_CD_MS) continue;
          wall.lastHit.set(v, time);
          v.takeDamage(WALL_TENTACLE_DAMAGE);
          this.applyHopelessness(v, WALL_TENTACLE_HOPELESS);
          this.arena.spawnHitFlash(v.x, v.y, SHADOW.orchid);
          this.fx(wall.owner).wisps(v.x, v.y, 3, { speed: 70, size: 2.4, life: 340, rise: 14, depth: 7 });
        }

        // F+ Watchers: eyed tentacles lob despair amplifiers at whoever they can see.
        if (t.eyed && time >= t.nextLobAt) {
          t.nextLobAt = time + WATCHER_LOB_INTERVAL_MS;
          const mark = victims.find(v => v.active && v.hp > 0);
          if (mark) this.lobWatcherBolt(t, mark, wall.owner);
        }
      }
    }
  }

  /**
   * A watcher tentacle spits a despair amplifier at whoever it can see. It flies as a dark
   * bomb with a blood-lit rim, so the thing that is coming is unmistakably not a normal blast.
   */
  private lobWatcherBolt(t: WallTentacle, mark: Fighter, owner: 'player' | 'npc'): void {
    const scene = this.arena.scene;
    this.darkBombs.push({
      gfx: scene.add.graphics().setDepth(8),
      x: t.x, y: t.y - 40,
      fromX: t.x, fromY: t.y - 40,
      toX: mark.x, toY: mark.y,
      spawnAt: scene.time.now,
      arriveAt: scene.time.now + 520,
      owner,
      mode: 'watcher',
      mark,
    });
  }

  /**
   * A single writhing spike: a barbed tendril rooted in a spreading pool of dark, swaying on
   * its own beat. Watchers grow taller, carry an extra pair of barbs and open a blood-lit eye
   * near the tip that tracks whoever the wall is hunting.
   */
  private drawTentacle(t: WallTentacle, time: number, grow: number, owner: 'player' | 'npc'): void {
    const g = t.gfx;
    g.clear();
    const tint = this.col(owner);
    const height = (t.eyed ? 54 : 46) * grow;
    const sway = Math.sin(time * 0.005 + t.phase) * 0.16;
    const baseW = 10 * grow;

    // The pool it grew out of, spreading as the spike rises.
    g.fillStyle(tint(SHADOW.abyss), 0.42);
    g.fillEllipse(t.x, t.y + 4, 34 * grow, 12 * grow);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + t.phase;
      g.fillStyle(tint(SHADOW.pitch), 0.5);
      shadowTendril(g, t.x, t.y + 3, a, 18 * grow, 3 * grow, Math.sin(time * 0.002 + i) * 6);
    }

    shadowTendrilLayered(
      g, tint, t.x, t.y + 2,
      -Math.PI / 2 + sway, height, baseW,
      Math.sin(time * 0.0032 + t.phase) * 12 * grow, 1,
      9 * grow, time * 0.004 + t.phase,
      { barbs: t.eyed ? 5 : 3 },
    );

    if (t.eyed && grow > 0.7) {
      // The eye rides the tip, which moves with the sway — pinning it to the root would leave
      // it hanging in mid-air whenever the spike leaned.
      const tipX = t.x + Math.cos(-Math.PI / 2 + sway) * height * 0.8
        + -Math.sin(-Math.PI / 2 + sway) * Math.sin(time * 0.0032 + t.phase) * 12 * grow * 0.64;
      const tipY = t.y + 2 + Math.sin(-Math.PI / 2 + sway) * height * 0.8;
      const look = Math.sin(time * 0.002 + t.phase) * 1.5;
      g.fillStyle(tint(SHADOW.blood), 0.35);
      g.fillCircle(tipX, tipY, 7 * grow);
      g.fillStyle(tint(SHADOW.pale), 0.9);
      g.fillEllipse(tipX, tipY, 8.5 * grow, 5.5 * grow);
      g.fillStyle(tint(SHADOW.blood), 1);
      g.fillCircle(tipX + Math.cos(look) * 1.8, tipY, 2.6 * grow);
      g.fillStyle(tint(SHADOW.abyss), 1);
      g.fillCircle(tipX + Math.cos(look) * 2.2, tipY, 1.2 * grow);
    }
  }

  // ── Shadow Mastery: Shadow Beacon ─────────────────────────────────────

  /** The slot Shadow Beacon is bound over this match, or null when it isn't bound anywhere. */
  private beaconSlot(): 'e' | 'r' | 'f' | 'q' | null {
    for (const s of ['e', 'r', 'f', 'q'] as const) {
      if (this.arena.masteryBindFor(s) === 'shadow-beacon') return s;
    }
    return null;
  }

  private tryCastShadowBeacon(time: number, mouseX: number, mouseY: number): void {
    if (time - this.beaconLastCastAt < BEACON_COOLDOWN_MS) return;
    this.beaconLastCastAt = time;
    const player = this.arena.player;
    this.playerAvatar?.play('slam', Math.atan2(mouseY - player.y, mouseX - player.x));
    this.placeBeacon(player.x, player.y, mouseX, mouseY, 'player');
    this.arena.showFloatingText(player.x, player.y - 30, '🎯 SHADOW BEACON', '#aa44ff');
    // Online: the peer mirrors the emplacement and watches our ghost walk onto it.
    this.arena.broadcastMasteryCast('shadow-beacon');
  }

  /** Online replay: mirror the remote shadow player's beacon so it can shell us locally. */
  doNpcShadowBeacon(tx: number, ty: number): void {
    const npc = this.arena.npc;
    this.npcAvatar?.play('slam', Math.atan2(ty - npc.y, tx - npc.x));
    this.placeBeacon(npc.x, npc.y, tx, ty, 'npc');
  }

  private placeBeacon(x: number, y: number, dotX: number, dotY: number, owner: 'player' | 'npc'): void {
    const scene = this.arena.scene;
    const fx = this.fx(owner);
    // The emplacement is hauled up out of the ground, and the dot is painted onto its target.
    fx.tendrilBurst(x, y, 44, 8, 3);
    fx.stain(x, y, 26, 2);
    fx.ring(dotX, dotY, 4, 30, SHADOW.mauve, 420, 3, 3);
    this.beacons.push({
      gfx: scene.add.graphics().setDepth(4),
      dotGfx: scene.add.graphics().setDepth(3),
      spawnAt: scene.time.now,
      x, y, dotX, dotY,
      expiresAt: scene.time.now + BEACON_LIFETIME_MS,
      owner,
      // Placed under the caster's feet, so it only arms once they step clear.
      armed: false,
    });
  }

  /**
   * The mortar emplacement: a bolted plate with a tapered barrel that stays trained on its
   * dot, and a rune core that beats faster once the mortar is armed and waiting to be trodden on.
   */
  private drawBeacon(b: ShadowBeacon, time: number): void {
    const g = b.gfx;
    g.clear();
    const grow = Math.min(1, (time - b.spawnAt) / 250);
    const ang = Math.atan2(b.dotY - b.y, b.dotX - b.x);
    const cos = Math.cos(ang);
    const sin = Math.sin(ang);
    /** Local barrel-space (x forward, y across) → world, scaled by the deploy animation. */
    const px = (lx: number, ly: number): [number, number] =>
      [b.x + (lx * cos - ly * sin) * grow, b.y + (lx * sin + ly * cos) * grow];
    const poly = (pts: readonly (readonly [number, number])[]) => {
      g.beginPath();
      pts.forEach(([lx, ly], i) => {
        const [X, Y] = px(lx, ly);
        if (i === 0) g.moveTo(X, Y); else g.lineTo(X, Y);
      });
      g.closePath();
      g.fillPath();
      g.strokePath();
    };
    const live = b.armed ? 1 : 0.4;
    const tint = this.col(b.owner);
    const accent = tint(b.owner === 'player' ? SHADOW.amethyst : SHADOW.orchid);

    g.fillStyle(tint(SHADOW.abyss), 0.35);
    g.fillEllipse(b.x, b.y + 9 * grow, 50 * grow, 18 * grow);

    // Tendrils anchoring the plate to the ground, restless while the mortar is armed.
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + 0.4;
      const writhe = live * (2 + Math.sin(time * 0.004 + i) * 2);
      g.fillStyle(tint(SHADOW.pitch), 0.75);
      shadowTendril(g, b.x, b.y, a, (20 + writhe) * grow, 3.6 * grow, Math.sin(time * 0.003 + i) * 8);
    }

    // Base plate stays square to the world — only the barrel swivels, so the
    // emplacement never degenerates into an anonymous rotated diamond.
    const half = 16 * grow;
    g.fillStyle(tint(SHADOW.pitch), 0.96);
    g.lineStyle(2, accent, 0.9);
    g.fillRect(b.x - half, b.y - half, half * 2, half * 2);
    g.strokeRect(b.x - half, b.y - half, half * 2, half * 2);
    // Sandbag blocks stacked along the plate edges.
    g.fillStyle(tint(SHADOW.violet), 0.95);
    g.lineStyle(1, accent, 0.55);
    for (const [ox, oy, w, h] of [
      [-half, -half, half * 2, 5 * grow],
      [-half, half - 5 * grow, half * 2, 5 * grow],
    ] as const) {
      g.fillRect(b.x + ox, b.y + oy, w, h);
      g.strokeRect(b.x + ox, b.y + oy, w, h);
    }
    g.fillStyle(tint(SHADOW.lilac), 0.25 + live * 0.55);
    for (const [ox, oy] of [[-11, -11], [11, -11], [11, 11], [-11, 11]] as const) {
      g.fillCircle(b.x + ox * grow, b.y + oy * grow, 2 * grow);
    }

    // Barrel, trained on the dot and overhanging the plate so the aim is unmistakable.
    g.fillStyle(tint(SHADOW.abyss), 0.98);
    g.lineStyle(2, tint(SHADOW.amethyst), 0.95);
    poly([[-6, -7], [27, -4.5], [27, 4.5], [-6, 7]]);
    const [mx, my] = px(28, 0);
    g.lineStyle(2.5, tint(SHADOW.mauve), 0.95);
    g.strokeCircle(mx, my, 5.5 * grow);
    // Muzzle brake ribs.
    g.lineStyle(1.5, tint(SHADOW.amethyst), 0.8);
    for (const lx of [17, 21] as const) {
      const [ax, ay] = px(lx, -5);
      const [bx2, by2] = px(lx, 5);
      g.lineBetween(ax, ay, bx2, by2);
    }

    // Rune core — the tell for "step here and it fires".
    const pulse = 0.5 + 0.5 * Math.sin(time * (b.armed ? 0.012 : 0.004));
    g.fillStyle(tint(SHADOW.lilac), (0.2 + pulse * 0.6) * live);
    g.fillCircle(b.x, b.y, (3.5 + pulse * 3) * grow);
    g.lineStyle(1.5, tint(SHADOW.mauve), 0.5 * live);
    g.strokeCircle(b.x, b.y, (9 + pulse * 2) * grow);
  }

  /** The marked impact point: three reticle arcs orbiting a breathing core. */
  private drawBeaconDot(b: ShadowBeacon, time: number): void {
    const g = b.dotGfx;
    g.clear();
    const grow = Math.min(1, (time - b.spawnAt) / 250);
    const pulse = 0.5 + 0.5 * Math.sin(time * 0.006);
    const spin = time * 0.0015;
    const tint = this.col(b.owner);

    g.fillStyle(tint(SHADOW.abyss), 0.26);
    g.fillEllipse(b.dotX, b.dotY + 4, 24 * grow, 8 * grow);

    g.lineStyle(2, tint(SHADOW.mauve), 0.85);
    for (let i = 0; i < 3; i++) {
      const a = spin + i * (Math.PI * 2 / 3);
      g.beginPath();
      g.arc(b.dotX, b.dotY, (11 + pulse * 2) * grow, a, a + 0.75);
      g.strokePath();
    }

    g.lineStyle(1.5, tint(SHADOW.lilac), 0.65);
    for (let i = 0; i < 4; i++) {
      const a = i * (Math.PI / 2) - spin * 0.6;
      const r0 = 15 * grow;
      const r1 = 19 * grow;
      g.lineBetween(
        b.dotX + Math.cos(a) * r0, b.dotY + Math.sin(a) * r0,
        b.dotX + Math.cos(a) * r1, b.dotY + Math.sin(a) * r1,
      );
    }

    g.fillStyle(tint(SHADOW.lilac), 0.5 + pulse * 0.45);
    g.fillCircle(b.dotX, b.dotY, (4 + pulse * 1.5) * grow);
    g.fillStyle(tint(SHADOW.abyss), 0.9);
    g.fillCircle(b.dotX, b.dotY, 1.8 * grow);
  }

  private updateBeacons(time: number): void {
    const { player, npc } = this.arena;
    for (let i = this.beacons.length - 1; i >= 0; i--) {
      const b = this.beacons[i];
      if (time >= b.expiresAt) {
        b.gfx.destroy();
        b.dotGfx.destroy();
        this.beacons.splice(i, 1);
        continue;
      }
      this.drawBeacon(b, time);
      this.drawBeaconDot(b, time);
      const walker = b.owner === 'player' ? player : npc;
      if (!walker.active) continue;
      const dist = Phaser.Math.Distance.Between(b.x, b.y, walker.x, walker.y);
      if (!b.armed) {
        if (dist > 42) b.armed = true;
        continue;
      }
      if (dist <= 22) {
        b.armed = false;
        this.fireBeacon(b);
      }
    }
  }

  /**
   * The mortar fires: a muzzle blast out of the barrel, a shell that arcs over on its own
   * Graphics (so it can trail), and a full implosion with a void pillar where it lands.
   */
  private fireBeacon(b: ShadowBeacon): void {
    const scene = this.arena.scene;
    const fx = this.fx(b.owner);
    const ang = Math.atan2(b.dotY - b.y, b.dotX - b.x);

    fx.muzzleUmbra(b.x + Math.cos(ang) * 26, b.y + Math.sin(ang) * 26, ang, 1.6, 9);
    scene.cameras.main.shake(120, 0.004);

    const shell: DarkBomb = {
      gfx: scene.add.graphics().setDepth(9),
      x: b.x, y: b.y,
      fromX: b.x, fromY: b.y,
      toX: b.dotX, toY: b.dotY,
      spawnAt: scene.time.now,
      arriveAt: scene.time.now + 700,
      owner: b.owner,
      mode: 'shell',
      mark: null,
    };
    // Beacon shells detonate on their own terms, so the flight is stepped here and the impact
    // handled below rather than routed through the dark-bomb detonation.
    this.darkBombs.push(shell);
    scene.time.delayedCall(700, () => {
      fx.voidPillar(b.dotX, b.dotY, 22, 110, 8);
      const victims: Fighter[] = b.owner === 'player' ? this.arena.enemies : [this.arena.player];
      for (const v of victims) {
        if (!v.active || v.hp <= 0) continue;
        if (Phaser.Math.Distance.Between(b.dotX, b.dotY, v.x, v.y) > BEACON_BLAST_RADIUS) continue;
        v.takeDamage(BEACON_DAMAGE);
        this.applyHopelessness(v, BEACON_HOPELESS);
        this.arena.spawnHitFlash(v.x, v.y, SHADOW.lilac);
      }
    });
  }

  /** Shared Suffering: every 30 damage the shadow player soaks spreads 5% hopelessness. */
  private updateSharedSuffering(): void {
    const player = this.arena.player;
    if (this.lastPlayerHp < 0) { this.lastPlayerHp = player.hp; return; }
    const lost = this.lastPlayerHp - player.hp;
    this.lastPlayerHp = player.hp;
    if (lost <= 0) return;
    this.sufferingAccum += lost;
    while (this.sufferingAccum >= SHARED_SUFFERING_DAMAGE) {
      this.sufferingAccum -= SHARED_SUFFERING_DAMAGE;
      for (const e of this.arena.enemies) {
        if (!e.active || e.hp <= 0) continue;
        this.applyHopelessness(e, SHARED_SUFFERING_HOPELESS);
      }
      this.arena.showFloatingText(player.x, player.y - 46, '🖤 SHARED SUFFERING', '#8844cc');
    }
  }

  // ── String perk: triplines ───────────────────────────────────────────

  /**
   * A strung tripline: tied off at both stake heads, sagging under its own weight and
   * swaying, with barbs snagged along it. Sag is cosmetic — the trip check stays on the
   * straight ground line between the stakes.
   */
  private drawTripline(line: Tripline, time: number): void {
    const g = line.gfx;
    g.clear();
    const tint = this.col(line.owner);
    const accent = tint(line.owner === 'player' ? SHADOW.mauve : SHADOW.orchid);
    // Tie off at the stake heads rather than their feet.
    const ax = line.a.x;
    const ay = line.a.y - 20;
    const bx = line.b.x;
    const by = line.b.y - 20;
    const span = Phaser.Math.Distance.Between(ax, ay, bx, by);
    const sag = Math.min(11, span * 0.05);
    const SEGMENTS = 14;
    const pt = (f: number): [number, number] => {
      const droop = Math.sin(Math.PI * f) * sag;
      const sway = Math.sin(time * 0.003 + f * 3) * 1.6;
      return [Phaser.Math.Linear(ax, bx, f), Phaser.Math.Linear(ay, by, f) + droop + sway];
    };

    // Shadow of the string on the ground, then the string itself.
    g.lineStyle(2, tint(SHADOW.abyss), 0.22);
    g.beginPath();
    for (let i = 0; i <= SEGMENTS; i++) {
      const [x, y] = pt(i / SEGMENTS);
      if (i === 0) g.moveTo(x, y + 18); else g.lineTo(x, y + 18);
    }
    g.strokePath();

    g.lineStyle(2, accent, 0.8);
    g.beginPath();
    for (let i = 0; i <= SEGMENTS; i++) {
      const [x, y] = pt(i / SEGMENTS);
      if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.strokePath();

    // Barbs snagged along the run, alternating above and below the line.
    g.lineStyle(1.5, accent, 0.6);
    for (let i = 2; i < SEGMENTS - 1; i += 3) {
      const [x, y] = pt(i / SEGMENTS);
      const dir = i % 2 === 0 ? -1 : 1;
      g.lineBetween(x, y, x + dir * 2, y + dir * 5);
    }
  }

  private updateTriplines(time: number): void {
    const { player, enemies } = this.arena;
    for (let i = this.triplines.length - 1; i >= 0; i--) {
      const line = this.triplines[i];
      const dead = line.a.triggered || line.b.triggered
        || time >= line.a.expiresAt || time >= line.b.expiresAt;
      if (dead) {
        line.gfx.destroy();
        this.triplines.splice(i, 1);
        continue;
      }
      // The string follows the stakes, including while one is flying on a tentacle.
      this.drawTripline(line, time);

      if (time - line.lastTripAt < TRIPLINE_HIT_CD_MS) continue;
      const victims: Fighter[] = line.owner === 'player' ? enemies : [player];
      for (const v of victims) {
        if (!v.active || v.hp <= 0) continue;
        if (this.distToSegment(v.x, v.y, line.a.x, line.a.y, line.b.x, line.b.y) > 16) continue;
        line.lastTripAt = time;
        v.takeDamage(TRIPLINE_DAMAGE);
        this.applyHopelessness(v, TRIPLINE_HOPELESS);
        this.slowedUntil.set(v, time + TRIPLINE_SLOW_MS);
        v.walkSpeedMult = Math.min(v.walkSpeedMult, TRIPLINE_SLOW_MULT);
        this.arena.spawnHitFlash(v.x, v.y, SHADOW.mauve);
        // The string snaps taut and drags the victim's feet out from under them.
        this.fx(line.owner).tendrilBurst(v.x, v.y, 30, 6, 7);
        this.arena.showFloatingText(v.x, v.y - 38, '🧵 TRIPPED', '#cc88ff');
        this.arena.recordMasteryStat('trapped', 1);
        break;
      }
    }
  }

  // ── Shadow character rig ──────────────────────────────────────────────

  /**
   * Builds (on first frame) and drives the ball-arm avatar for whichever fighters are shadow.
   * The player faces the cursor; the NPC faces whoever it is fighting. The mastery passive's
   * shroud lives here too, at a lower depth than the Consume shroud so the two stack into one
   * silhouette rather than fighting each other.
   */
  private updateAvatars(delta: number, isPlayerShadow: boolean, isNpcShadow: boolean): void {
    const { player, npc, scene } = this.arena;

    if (isPlayerShadow && player?.active) {
      if (!this.playerAvatar) this.playerAvatar = new ShadowAvatar(scene, this.pcol);
      const aimX = this.aimX || player.x + 1;
      const aimY = this.aimY || player.y;
      this.playerAvatar.setFacing(Math.atan2(aimY - player.y, aimX - player.x));
      // Consuming or holding a singularity is the character working at full stretch.
      this.playerAvatar.setIntensity(
        this.shadowConsumeActive ? 1.5 : this.shadowBlackHoleActive ? 1.3 : 1,
      );
      this.playerAvatar.setMastered(this.arena.masteryActive);
      this.playerAvatar.update(delta, player.x, player.y, player.forceInvisible ? 0 : player.alpha);

      // Shadow Mastery — Shared Suffering: an always-on shroud while mastery is enabled.
      if (this.arena.masteryActive) {
        if (!this.masteryShroud) this.masteryShroud = new ShadowShroud(scene, this.pcol, 42, 0.8, 2, 7);
        this.masteryShroud.update(delta, player.x, player.y, player.alpha);
      } else if (this.masteryShroud) {
        this.masteryShroud.destroy();
        this.masteryShroud = null;
      }
    } else if (this.playerAvatar) {
      this.playerAvatar.destroy();
      this.playerAvatar = null;
      if (this.masteryShroud) { this.masteryShroud.destroy(); this.masteryShroud = null; }
    }

    if (isNpcShadow && npc?.active) {
      if (!this.npcAvatar) this.npcAvatar = new ShadowAvatar(scene, this.ncol);
      this.npcAvatar.setFacing(Math.atan2(player.y - npc.y, player.x - npc.x));
      this.npcAvatar.setIntensity(this.npcShadowBlackHoleActive ? 1.3 : 1);
      this.npcAvatar.update(delta, npc.x, npc.y, npc.forceInvisible ? 0 : npc.alpha);
    } else if (this.npcAvatar) {
      this.npcAvatar.destroy();
      this.npcAvatar = null;
    }
  }

  // ── Per-frame update (runs before NPC AI so cast state is fresh) ──────

  update(time: number, delta: number, isPlayerShadow: boolean, isNpcShadow: boolean): void {
    if (!isPlayerShadow && !isNpcShadow) return;
    const { player, npc, enemies, scene } = this.arena;

    this.updateAvatars(delta, isPlayerShadow, isNpcShadow);
    this.updateDarkBombs(time);
    this.drawDarkClouds(time);

    // Dark cloud ticks (both owners)
    for (let ci = this.shadowDarkClouds.length - 1; ci >= 0; ci--) {
      const cloud = this.shadowDarkClouds[ci];
      if (time >= cloud.expiresAt) {
        cloud.gfx.destroy();
        this.shadowDarkClouds.splice(ci, 1);
        continue;
      }
      cloud.tickAccum += delta;
      if (cloud.tickAccum >= 400) {
        cloud.tickAccum -= 400;
        if (cloud.owner === 'player') {
          // Heal player, damage NPC
          if (Phaser.Math.Distance.Between(cloud.x, cloud.y, player.x, player.y) <= cloud.radius + 14) {
            player.heal(1.5);
          }
          for (const t of enemies) {
            if (!t.active || t.hp <= 0) continue;
            if (Phaser.Math.Distance.Between(cloud.x, cloud.y, t.x, t.y) <= cloud.radius + 14) {
              t.takeDamage(2, { source: cloud, sourceX: cloud.x, sourceY: cloud.y });
              this.arena.spawnHitFlash(t.x, t.y, SHADOW.orchid);
            }
          }
        } else {
          // NPC cloud: heal NPC, damage player
          if (Phaser.Math.Distance.Between(cloud.x, cloud.y, npc.x, npc.y) <= cloud.radius + 14) {
            npc.heal(1.5);
          }
          if (Phaser.Math.Distance.Between(cloud.x, cloud.y, player.x, player.y) <= cloud.radius + 14) {
            player.takeDamage(2, { source: cloud, sourceX: cloud.x, sourceY: cloud.y });
          }
        }
      }
    }

    this.updateHopelessness(time, delta);
    this.updateWalls(time, delta);
    this.updateTriplines(time);
    this.updateBeacons(time);
    if (isPlayerShadow && this.arena.masteryActive) this.updateSharedSuffering();

    // Snap trap checks (stakes are inert — their tripline does the work)
    for (let ti = this.shadowSnapTraps.length - 1; ti >= 0; ti--) {
      const trap = this.shadowSnapTraps[ti];
      if (time >= trap.expiresAt || trap.triggered) {
        trap.gfx.destroy();
        if (this.pendingStake[trap.owner] === trap) this.pendingStake[trap.owner] = null;
        this.shadowSnapTraps.splice(ti, 1);
        continue;
      }
      if (trap.isStake) { this.drawStake(trap, time); continue; }
      this.drawSnapTrap(trap, time);
      if (trap.owner === 'player') {
        for (const t of enemies) {
          if (!t.active || t.hp <= 0) continue;
          if (Phaser.Math.Distance.Between(trap.x, trap.y, t.x, t.y) <= trap.radius + 10) {
            trap.triggered = true;
            this.arena.recordMasteryStat('trapped', 1);
            t.takeDamage(20);
            this.applyHopelessness(t, 20);
            this.arena.spawnHitFlash(t.x, t.y, SHADOW.mauve);
            this.snapTrapBite(trap, t);
            this.shadowNpcStunnedUntil = time + 2000;
            break;
          }
        }
      } else if (Phaser.Math.Distance.Between(trap.x, trap.y, player.x, player.y) <= trap.radius + 10) {
        trap.triggered = true;
        player.takeDamage(20);
        this.applyHopelessness(player, 20);
        this.arena.spawnHitFlash(player.x, player.y, SHADOW.mauve);
        this.snapTrapBite(trap, player);
        this.shadowPlayerStunnedUntil = time + 2000;
      }
    }

    // ── Player shadow per-frame ─────────────────────────────────────
    if (isPlayerShadow) {
      const ptr = scene.input.activePointer;

      // Tentacle draw + drag
      if (this.shadowTentacleActive) {
        if (time >= this.shadowTentacleEnd) {
          this.shadowTentacleActive = false;
          this.shadowTentacleHooked = false;
          this.playerAvatar?.setHold(null);
          if (this.shadowTentacleSprite) { this.shadowTentacleSprite.destroy(); this.shadowTentacleSprite = null; }
        } else {
          const tSpr = this.shadowTentacleSprite;
          if (tSpr) {
            tSpr.clear();
            // Hands stay hauled back along the limb for as long as it is out.
            const gripX = this.shadowTentacleHooked ? npc.x : this.shadowTentacleX;
            const gripY = this.shadowTentacleHooked ? npc.y : this.shadowTentacleY;
            if (!this.shadowTentacleHooked && this.canDragTraps('player')) {
              // Miss/drag: track cursor for trap drag
              this.shadowTentacleX = ptr.worldX;
              this.shadowTentacleY = ptr.worldY;
            }
            this.playerAvatar?.setHold('draw', Math.atan2(gripY - player.y, gripX - player.x));
            ShadowFx.drawTether(
              tSpr, this.pcol, player.x, player.y,
              this.shadowTentacleHooked ? npc.x : this.shadowTentacleX,
              this.shadowTentacleHooked ? npc.y : this.shadowTentacleY,
              time / 1000, 1, this.shadowTentacleHooked,
            );
          }
        }
      }

      // (NPC drag + stun handled in updateAfterAI so they take effect)

      // Black hole active: draw + tick damage + Q+ effects (enemy drag handled in updateAfterAI)
      if (this.shadowBlackHoleActive) {
        if (time >= this.shadowBlackHoleEnd) {
          this.shadowBlackHoleActive = false;
          this.playerAvatar?.setHold(null);
          // The hole doesn't switch off — it collapses.
          this.pfx.implosion(this.shadowBlackHoleX, this.shadowBlackHoleY, 110, { tendrils: 16, gloom: 4, duration: 560 });
          scene.cameras.main.shake(220, 0.006);
          if (this.shadowBlackHoleSprite) { this.shadowBlackHoleSprite.destroy(); this.shadowBlackHoleSprite = null; }
        } else {
          // Follow the live cursor for the duration of the effect
          const bhPtr = scene.input.activePointer;
          this.shadowBlackHoleX = bhPtr.worldX;
          this.shadowBlackHoleY = bhPtr.worldY;

          if (this.shadowBlackHoleSprite) {
            const g = this.shadowBlackHoleSprite;
            g.clear();
            // Q+ Void Singularity is a bigger, hungrier hole — the ultimate scales its content,
            // not just its numbers.
            const big = this.arena.hasUpgrade('q');
            const r = (big ? 22 : 17) + Math.sin(time * 0.006) * 3;
            ShadowFx.drawSingularity(g, this.pcol, this.shadowBlackHoleX, this.shadowBlackHoleY, r, time / 1000, 1);
          }
          // Arms held up for the whole channel — the hole is being carried, not thrown.
          this.playerAvatar?.setHold('charge');

          // Tick damage to enemy, 5/sec, regardless of position
          this.shadowBlackHoleDamageAccum += delta;
          if (this.shadowBlackHoleDamageAccum >= 1000) {
            this.shadowBlackHoleDamageAccum -= 1000;
            npc.takeDamage(5);
            this.arena.spawnHitFlash(npc.x, npc.y, SHADOW.amethyst);
            this.pfx.wisps(npc.x, npc.y, 4, {
              angle: Math.atan2(this.shadowBlackHoleY - npc.y, this.shadowBlackHoleX - npc.x),
              spread: 0.6, speed: 100, size: 2.6, life: 420, rise: 0, depth: 7,
            });
          }

          // Q+ Void Singularity: heal caster + spawn shadow clouds right on the black hole
          if (this.arena.hasUpgrade('q')) {
            this.shadowBlackHoleHealAccum += delta;
            if (this.shadowBlackHoleHealAccum >= 1000) {
              this.shadowBlackHoleHealAccum -= 1000;
              player.heal(15);
              this.arena.showFloatingText(player.x, player.y - 40, '+15', '#66ff99');
            }
            this.shadowBHPuddleAccum += delta;
            if (this.shadowBHPuddleAccum >= 500) {
              this.shadowBHPuddleAccum -= 500;
              this.spawnDarkCloud(this.shadowBlackHoleX, this.shadowBlackHoleY, 'player');
            }
          }
        }
      }

      // Click+ confusion: track NPC exposure to player clouds
      if (this.arena.hasUpgrade('click')) {
        const npcInCloud = this.shadowDarkClouds.some(
          c => c.owner === 'player' && Phaser.Math.Distance.Between(c.x, c.y, npc.x, npc.y) <= c.radius + 14,
        );
        if (npcInCloud) {
          this.shadowCloudExposureAccum += delta;
          if (this.shadowCloudExposureAccum >= 3000 && time > this.shadowConfusionUntil) {
            this.shadowConfusionUntil = time + 6000;
            this.shadowCloudExposureAccum = 0;
            this.arena.spawnHitFlash(npc.x, npc.y, SHADOW.amethyst);
            // Snap on application, so the debuff has a moment as well as a state.
            this.pfx.tendrilBurst(npc.x, npc.y, 36, 8, 8);
            this.pfx.gloom(npc.x, npc.y - 10, 2, 24, 7);
            const confTxt = scene.add.text(npc.x, npc.y - 30, '😵 CONFUSED', { fontSize: '11px', color: '#cc44ff', fontFamily: 'Arial Black' }).setOrigin(0.5).setDepth(12);
            scene.tweens.add({ targets: confTxt, y: confTxt.y - 20, alpha: 0, duration: 1200, onComplete: () => confTxt.destroy() });
          }
        } else {
          this.shadowCloudExposureAccum = Math.max(0, this.shadowCloudExposureAccum - delta * 0.5);
        }
      }

      // Trap/stake drag: anything near the tentacle endpoint follows it
      if (this.canDragTraps('player') && this.shadowTentacleActive) {
        const tipX = this.shadowTentacleHooked ? npc.x : this.shadowTentacleX;
        const tipY = this.shadowTentacleHooked ? npc.y : this.shadowTentacleY;
        for (const trap of this.shadowSnapTraps) {
          if (trap.owner !== 'player' || trap.triggered) continue;
          if (Phaser.Math.Distance.Between(trap.x, trap.y, tipX, tipY) <= 55) {
            // The draw routines read trap.x/y directly, so the art follows for free.
            trap.x = tipX;
            trap.y = tipY;
          }
        }
      }
    }

    // ── NPC shadow per-frame ────────────────────────────────────────
    if (isNpcShadow) {
      // NPC tentacle
      if (this.npcShadowTentacleActive) {
        if (time >= this.npcShadowTentacleEnd) {
          this.npcShadowTentacleActive = false;
          this.npcShadowTentacleHooked = false;
          this.npcAvatar?.setHold(null);
          if (this.npcShadowTentacleSprite) { this.npcShadowTentacleSprite.destroy(); this.npcShadowTentacleSprite = null; }
        } else {
          if (this.npcShadowTentacleSprite) {
            const angle = Math.atan2(player.y - npc.y, player.x - npc.x);
            const tipX = this.npcShadowTentacleHooked ? player.x : npc.x + Math.cos(angle) * 100;
            const tipY = this.npcShadowTentacleHooked ? player.y : npc.y + Math.sin(angle) * 100;
            this.npcShadowTentacleSprite.clear();
            this.npcAvatar?.setHold('draw', angle);
            ShadowFx.drawTether(
              this.npcShadowTentacleSprite, this.ncol,
              npc.x, npc.y, tipX, tipY, time / 1000, 1, this.npcShadowTentacleHooked,
            );
          }

          // Periodically pick a new random drag target
          if (this.npcShadowTentacleHooked && time >= this.npcShadowDragNextChangeAt) {
            const { width, height } = this.arena;
            this.npcShadowDragTargetX = Phaser.Math.Between(80, width - 80);
            this.npcShadowDragTargetY = Phaser.Math.Between(80, height - 80);
            this.npcShadowDragNextChangeAt = time + 700;
          }
        }
      }

      // Player stun from NPC snap trap
      if (time < this.shadowPlayerStunnedUntil) {
        (player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
      }

      // NPC black hole active: draw + pull player toward NPC
      if (this.npcShadowBlackHoleActive) {
        if (time >= this.npcShadowBlackHoleEnd) {
          this.npcShadowBlackHoleActive = false;
          this.npcAvatar?.setHold(null);
          this.nfx.implosion(npc.x, npc.y, 110, { tendrils: 16, gloom: 4, duration: 560 });
          if (this.npcShadowBlackHoleSprite) { this.npcShadowBlackHoleSprite.destroy(); this.npcShadowBlackHoleSprite = null; }
        } else {
          if (this.npcShadowBlackHoleSprite) {
            const g = this.npcShadowBlackHoleSprite;
            g.clear();
            ShadowFx.drawSingularity(g, this.ncol, npc.x, npc.y, 17 + Math.sin(time * 0.006) * 3, time / 1000, 1);
          }
          this.npcAvatar?.setHold('charge');
          // Pull player toward NPC
          const bDist = Phaser.Math.Distance.Between(npc.x, npc.y, player.x, player.y);
          if (bDist > 12) {
            const bAngle = Math.atan2(npc.y - player.y, npc.x - player.x);
            (player.body as Phaser.Physics.Arcade.Body).setVelocity(Math.cos(bAngle) * 67, Math.sin(bAngle) * 67);
          }
        }
      }
    }
  }

  // ── Post-AI overrides (must run after doAI so drag velocities win) ────

  updateAfterAI(time: number, delta: number): void {
    const { player, npc, enemies, scene } = this.arena;
    const nBody = npc.body as Phaser.Physics.Arcade.Body;

    // Black hole: violently drag the enemy to the cursor
    if (this.shadowBlackHoleActive && time < this.shadowBlackHoleEnd) {
      const bhDist = Phaser.Math.Distance.Between(this.shadowBlackHoleX, this.shadowBlackHoleY, npc.x, npc.y);
      if (bhDist > 12) {
        const bhAngle = Math.atan2(this.shadowBlackHoleY - npc.y, this.shadowBlackHoleX - npc.x);
        nBody.setVelocity(Math.cos(bhAngle) * 550, Math.sin(bhAngle) * 550);
      } else {
        nBody.setVelocity(0, 0);
      }
    }

    // Tentacle: drag NPC toward cursor
    if (this.shadowTentacleHooked && this.shadowTentacleActive) {
      // E+ consume trigger: NPC dragged to player
      if (this.arena.hasUpgrade('e') && !this.shadowConsumeActive) {
        const cDist = Phaser.Math.Distance.Between(player.x, player.y, npc.x, npc.y);
        if (cDist <= 22) {
          this.shadowConsumeActive = true;
          this.arena.recordMasteryStat('consumed', 1);
          this.shadowConsumeEnd = time + 3000;
          this.shadowConsumeTickAccum = 0;
          this.shadowTentacleActive = false;
          this.shadowTentacleHooked = false;
          this.playerAvatar?.setHold(null);
          if (this.shadowTentacleSprite) { this.shadowTentacleSprite.destroy(); this.shadowTentacleSprite = null; }
          // Limbs close over the victim and hold them there.
          if (this.consumeShroud) this.consumeShroud.destroy();
          this.consumeShroud = new ShadowShroud(scene, this.pcol, 34, 1.3, 7, 11);
          this.pfx.bloom(player.x, player.y, 70, 12);
          this.arena.showFloatingText(player.x, player.y - 40, '🕳️ CONSUMED', '#aa44ff');
        }
      }
      if (!this.shadowConsumeActive) {
        const tMx = scene.input.activePointer.worldX;
        const tMy = scene.input.activePointer.worldY;
        const dragDist = Phaser.Math.Distance.Between(npc.x, npc.y, tMx, tMy);
        if (dragDist > 20) {
          const dragAngle = Math.atan2(tMy - npc.y, tMx - npc.x);
          nBody.setVelocity(Math.cos(dragAngle) * 200, Math.sin(dragAngle) * 200);
        } else {
          nBody.setVelocity(0, 0);
        }
      }
    }

    // E+ consume: NPC held at player position, taking damage
    if (this.shadowConsumeActive) {
      const cBody = npc.body as Phaser.Physics.Arcade.Body;
      if (time >= this.shadowConsumeEnd) {
        this.shadowConsumeActive = false;
        if (this.consumeShroud) { this.consumeShroud.destroy(); this.consumeShroud = null; }
      } else {
        cBody.reset(player.x, player.y);
        cBody.setVelocity(0, 0);
        this.consumeShroud?.update(delta, player.x, player.y, player.alpha);
        this.shadowConsumeTickAccum += delta;
        if (this.shadowConsumeTickAccum >= 1000) {
          this.shadowConsumeTickAccum -= 1000;
          for (const t of enemies) {
            if (!t.active || t.hp <= 0) continue;
            t.takeDamage(2);
            this.arena.spawnHitFlash(t.x, t.y, SHADOW.amethyst);
          }
        }
      }
    }

    // Stun from snap trap
    if (time < this.shadowNpcStunnedUntil) nBody.setVelocity(0, 0);

    // Click+ confusion: random movement
    if (this.arena.hasUpgrade('click') && time < this.shadowConfusionUntil) {
      if (time >= this.shadowConfusionNextChange) {
        this.shadowConfusionAngle = Math.random() * Math.PI * 2;
        this.shadowConfusionNextChange = time + Phaser.Math.Between(400, 800);
      }
      const confBody = npc.body as Phaser.Physics.Arcade.Body;
      confBody.setVelocity(
        Math.cos(this.shadowConfusionAngle) * 130 * this.arena.npcSpeedMult,
        Math.sin(this.shadowConfusionAngle) * 130 * this.arena.npcSpeedMult,
      );
    }
  }

  private distToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
    const dx = bx - ax;
    const dy = by - ay;
    const lenSq = dx * dx + dy * dy;
    const t = lenSq > 0 ? Phaser.Math.Clamp(((px - ax) * dx + (py - ay) * dy) / lenSq, 0, 1) : 0;
    const cx = ax + t * dx;
    const cy = ay + t * dy;
    return Phaser.Math.Distance.Between(px, py, cx, cy);
  }

  // ── Input ────────────────────────────────────────────────────────────

  handleInput(time: number, delta: number, pointer: Phaser.Input.Pointer, mouseX: number, mouseY: number): void {
    if (this.arena.nukeChanneling) return;
    const { player, eKey, rKey, fKey, qKey } = this.arena;
    const playerCtx = this.arena.buildPlayerContext(mouseX, mouseY);
    // Cached for the avatar rig, which runs in update() and has no pointer of its own.
    this.aimX = mouseX;
    this.aimY = mouseY;

    if (pointer.isDown) {
      this.shadowDrainHoldAccum += delta;
      if (this.shadowDrainHoldAccum >= 300) {
        // Cloud mode: hands held out along the aim, pouring dark onto the ground.
        this.playerAvatar?.setHold('spray', Math.atan2(mouseY - player.y, mouseX - player.x));
        this.shadowDrainCloudAccum += delta;
        if (this.shadowDrainCloudAccum >= 600) {
          this.shadowDrainCloudAccum -= 600;
          this.spawnDarkCloud(mouseX, mouseY, 'player');
        }
      }
    } else {
      if (this.arena.pointerWasDown && this.shadowDrainHoldAccum < 300) {
        // Tap: launch dark bomb (the gesture fires inside doLaunchDarkBomb)
        player.castAbility('dark-drain', playerCtx);
      }
      // Only the drain hold owns 'spray'; the tentacle's 'draw' hold must survive this.
      if (this.shadowDrainHoldAccum >= 300) this.playerAvatar?.setHold(null);
      this.shadowDrainHoldAccum = 0;
      this.shadowDrainCloudAccum = 0;
    }
    // Shadow Mastery — Shadow Beacon may be bound over any of E/R/F/Q, suppressing that slot's base ability.
    const beaconSlot = this.arena.masteryActive ? this.beaconSlot() : null;

    if (beaconSlot === 'e') {
      if (Phaser.Input.Keyboard.JustDown(eKey)) this.tryCastShadowBeacon(time, mouseX, mouseY);
    } else if (Phaser.Input.Keyboard.JustDown(eKey)) {
      if (this.shadowConsumeActive && this.arena.hasUpgrade('e')) {
        // Throw NPC toward cursor — stun briefly so AI doesn't cancel velocity
        this.shadowConsumeActive = false;
        if (this.consumeShroud) { this.consumeShroud.destroy(); this.consumeShroud = null; }
        const throwAngle = Math.atan2(mouseY - player.y, mouseX - player.x);
        (this.arena.npc.body as Phaser.Physics.Arcade.Body).setVelocity(
          Math.cos(throwAngle) * 800, Math.sin(throwAngle) * 800,
        );
        this.playerAvatar?.play('punch', throwAngle);
        this.pfx.muzzleUmbra(player.x, player.y, throwAngle, 1.8, 7);
        this.pfx.smear(player.x, player.y, player.x + Math.cos(throwAngle) * 90, player.y + Math.sin(throwAngle) * 90);
        this.shadowNpcThrowUntil = Math.max(this.shadowNpcThrowUntil, time + 600);
      } else {
        player.castAbility('tentacle', playerCtx);
      }
    }
    if (beaconSlot === 'r') {
      if (Phaser.Input.Keyboard.JustDown(rKey)) this.tryCastShadowBeacon(time, mouseX, mouseY);
    } else if (Phaser.Input.Keyboard.JustDown(rKey)) {
      player.castAbility('snap-trap', playerCtx);
    }
    if (beaconSlot === 'f') {
      if (Phaser.Input.Keyboard.JustDown(fKey)) this.tryCastShadowBeacon(time, mouseX, mouseY);
    } else if (Phaser.Input.Keyboard.JustDown(fKey)) {
      player.castAbility('tentacle-wall', playerCtx);
    }
    if (beaconSlot === 'q') {
      if (Phaser.Input.Keyboard.JustDown(qKey)) this.tryCastShadowBeacon(time, mouseX, mouseY);
    } else if (Phaser.Input.Keyboard.JustDown(qKey)) {
      player.castAbility('black-hole', playerCtx);
    }
  }
}
