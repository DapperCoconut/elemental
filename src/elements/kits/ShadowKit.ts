import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { CastContext } from '../Ability';

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
  sprite: Phaser.GameObjects.Arc;
  expiresAt: number;
  x: number;
  y: number;
  radius: number;
  tickAccum: number;
  owner: 'player' | 'npc';
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
  private npcShadowBlackHoleCharging = false;
  private npcShadowBlackHoleChargeStart = 0;
  private npcShadowBlackHoleChargeVisual: Phaser.GameObjects.Arc | null = null;
  private npcShadowBlackHoleActive = false;
  private npcShadowBlackHoleEnd = 0;
  private npcShadowBlackHoleSprite: Phaser.GameObjects.Graphics | null = null;

  // ── Shadow — upgrade state ──────────────────────────────────────────
  private shadowConsumeActive = false;
  private shadowConsumeEnd = 0;
  private shadowConsumeTickAccum = 0;
  private shadowConsumeAura: Phaser.GameObjects.Arc | null = null;
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

  constructor(private arena: ShadowArenaApi) {}

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
    this.npcShadowBlackHoleCharging = false;
    this.npcShadowBlackHoleChargeStart = 0;
    this.npcShadowBlackHoleChargeVisual = null;
    this.npcShadowBlackHoleActive = false;
    this.npcShadowBlackHoleEnd = 0;
    this.npcShadowBlackHoleSprite = null;
    this.shadowConsumeActive = false;
    this.shadowConsumeEnd = 0;
    this.shadowConsumeTickAccum = 0;
    if (this.shadowConsumeAura) { this.shadowConsumeAura.destroy(); this.shadowConsumeAura = null; }
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
    const scene = this.arena.scene;
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

    // Black ooze weeping off whoever is most consumed.
    this.oozeAccum += delta;
    if (this.oozeAccum >= 90) {
      this.oozeAccum -= 90;
      for (const f of this.hopelessTargets()) {
        if (f.hopelessness < 10) continue;
        if (Math.random() > f.hopelessness / 100) continue;
        const drop = scene.add.ellipse(
          f.x + Phaser.Math.Between(-14, 14), f.y + Phaser.Math.Between(-6, 10),
          Phaser.Math.Between(4, 7), Phaser.Math.Between(6, 11), 0x08000f, 0.85,
        ).setDepth(4);
        scene.tweens.add({
          targets: drop, y: drop.y + Phaser.Math.Between(16, 30), scaleX: 0.4, alpha: 0,
          duration: 600, onComplete: () => drop.destroy(),
        });
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
    const spr = scene.add.circle(x, y, radius, 0x330044, 0.55).setDepth(3);
    spr.setStrokeStyle(1, 0x8800cc, 0.5);
    scene.tweens.add({ targets: spr, scaleX: 1.2, scaleY: 1.2, alpha: 0.35, yoyo: true, repeat: -1, duration: 700 });
    this.shadowDarkClouds.push({ sprite: spr, expiresAt: scene.time.now + duration, x, y, radius, tickAccum: 0, owner });
  }

  // ── Ability-cast methods (invoked via CastContext delegates) ──────────

  doLaunchDarkBomb(x: number, y: number, isPlayer: boolean): void {
    const scene = this.arena.scene;
    const { player, npc, enemies } = this.arena;
    if (isPlayer) {
      const bomb = scene.add.circle(player.x, player.y, 10, 0x660088, 0.95)
        .setStrokeStyle(2, 0xcc44ff).setDepth(8);
      scene.tweens.add({
        targets: bomb, x, y, duration: 380, ease: 'Power2',
        onComplete: () => {
          const boom = scene.add.circle(x, y, 8, 0x8800cc, 0.8).setDepth(8);
          scene.tweens.add({ targets: boom, scaleX: 7, scaleY: 7, alpha: 0, duration: 350, onComplete: () => boom.destroy() });
          bomb.destroy();
          for (const t of enemies) {
            if (!t.active || t.hp <= 0) continue;
            if (Phaser.Math.Distance.Between(x, y, t.x, t.y) <= 50) {
              t.takeDamage(10);
              this.arena.spawnHitFlash(t.x, t.y, 0x8800cc);
            }
          }
          this.spawnDarkCloud(x, y, 'player');
        },
      });
    } else {
      const bomb = scene.add.circle(npc.x, npc.y, 10, 0x440066, 0.85)
        .setStrokeStyle(2, 0x8800cc).setDepth(8);
      scene.tweens.add({
        targets: bomb, x, y, duration: 380, ease: 'Power2',
        onComplete: () => {
          const boom = scene.add.circle(x, y, 8, 0x440066, 0.7).setDepth(8);
          scene.tweens.add({ targets: boom, scaleX: 7, scaleY: 7, alpha: 0, duration: 350, onComplete: () => boom.destroy() });
          bomb.destroy();
          if (Phaser.Math.Distance.Between(x, y, player.x, player.y) <= 50) {
            player.takeDamage(10);
            this.arena.spawnHitFlash(player.x, player.y, 0x8800cc);
          }
          this.spawnDarkCloud(x, y, 'npc');
        },
      });
    }
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
      for (const t of enemies) {
        if (!t.active || t.hp <= 0) continue;
        if (Phaser.Math.Distance.Between(player.x, player.y, t.x, t.y) <= 110) {
          t.takeDamage(10);
          this.applyHopelessness(t, WALL_TENTACLE_HOPELESS);
          this.arena.spawnHitFlash(t.x, t.y, 0x8800cc);
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
      if (this.npcShadowTentacleHooked) {
        player.takeDamage(10);
        this.applyHopelessness(player, WALL_TENTACLE_HOPELESS);
        this.arena.spawnHitFlash(player.x, player.y, 0x440066);
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
    const accent = t.owner === 'player' ? 0xcc44ff : 0x8800cc;

    g.fillStyle(0x000000, 0.3);
    g.fillEllipse(t.x, t.y + r * 0.35, r * 2.1, r * 0.8);

    // Jaw ring the teeth are seated in.
    g.fillStyle(0x0e0016, 0.9);
    g.fillCircle(t.x, t.y, r);

    // Jaw teeth: long enough to read at game scale, each breathing on its own beat.
    const teeth = 10;
    for (let i = 0; i < teeth; i++) {
      const a = (i / teeth) * Math.PI * 2 + t.phase * 0.1;
      const inner = r * 0.46;
      const outer = r * (1.08 + 0.08 * Math.sin(time * 0.01 + i + t.phase));
      const w = 0.13;
      g.fillStyle(i % 2 ? 0x7722aa : 0x4a1170, 0.98);
      g.lineStyle(1.5, accent, 0.9);
      g.beginPath();
      g.moveTo(t.x + Math.cos(a - w) * inner, t.y + Math.sin(a - w) * inner);
      g.lineTo(t.x + Math.cos(a) * outer, t.y + Math.sin(a) * outer);
      g.lineTo(t.x + Math.cos(a + w) * inner, t.y + Math.sin(a + w) * inner);
      g.closePath();
      g.fillPath();
      g.strokePath();
    }

    // Pressure plate + rim.
    g.fillStyle(0x160020, 0.97);
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
    const accent = t.owner === 'player' ? 0xcc88ff : 0x8844aa;
    const tipX = t.x + lean;
    const tipY = t.y - h;

    g.fillStyle(0x000000, 0.32);
    g.fillEllipse(t.x, t.y + 3, 16 * grow, 6 * grow);

    g.fillStyle(0x14001c, 0.97);
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

  /** Player-only: NPC never uses black hole. */
  doStartBlackHole(x: number, y: number): void {
    const scene = this.arena.scene;
    this.shadowBlackHoleActive = true;
    this.shadowBlackHoleEnd = scene.time.now + 3000;
    this.shadowBlackHoleX = x;
    this.shadowBlackHoleY = y;
    this.shadowBlackHoleDamageAccum = 0;
    this.shadowBlackHoleHealAccum = 0;
    if (this.shadowBlackHoleSprite) this.shadowBlackHoleSprite.destroy();
    this.shadowBlackHoleSprite = scene.add.graphics().setDepth(5);
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
          this.arena.spawnHitFlash(v.x, v.y, 0x6600aa);
        }

        // F+ Watchers: eyed tentacles lob despair amplifiers at whoever they can see.
        if (t.eyed && time >= t.nextLobAt) {
          t.nextLobAt = time + WATCHER_LOB_INTERVAL_MS;
          const mark = victims.find(v => v.active && v.hp > 0);
          if (mark) this.lobWatcherBolt(t, mark);
        }
      }
    }
  }

  /** Dark purple bolt from a watcher tentacle — multiplies the target's hopelessness on impact. */
  private lobWatcherBolt(t: WallTentacle, mark: Fighter): void {
    const scene = this.arena.scene;
    const bolt = scene.add.circle(t.x, t.y - 40, 7, 0x33004d, 0.95)
      .setStrokeStyle(2, 0xcc2244, 0.9).setDepth(8);
    const tx = mark.x;
    const ty = mark.y;
    scene.tweens.add({
      targets: bolt, x: tx, y: ty, duration: 520, ease: 'Sine.easeIn',
      onComplete: () => {
        const boom = scene.add.circle(tx, ty, 10, 0x33004d, 0.7).setDepth(8);
        scene.tweens.add({ targets: boom, scaleX: 3, scaleY: 3, alpha: 0, duration: 320, onComplete: () => boom.destroy() });
        bolt.destroy();
        if (mark.active && mark.hp > 0 && Phaser.Math.Distance.Between(tx, ty, mark.x, mark.y) <= 44) {
          this.multiplyHopelessness(mark, WATCHER_HOPELESS_MULT);
          this.arena.spawnHitFlash(mark.x, mark.y, 0xcc2244);
        }
      },
    });
  }

  /** A single writhing spike of corrupt energy: tapered body, hooked barbs, oily base pool. */
  private drawTentacle(t: WallTentacle, time: number, grow: number, owner: 'player' | 'npc'): void {
    const g = t.gfx;
    g.clear();
    const height = (t.eyed ? 52 : 46) * grow;
    const sway = Math.sin(time * 0.005 + t.phase) * 7 * grow;
    const baseW = 11 * grow;
    const tipX = t.x + sway;
    const tipY = t.y - height;
    const midX = t.x + sway * 0.35;
    const midY = t.y - height * 0.55;
    const body = t.eyed ? 0x14001e : 0x260033;
    const edge = t.eyed ? 0x5c0022 : 0x8800cc;
    const glowColor = owner === 'player' ? 0xcc66ff : 0x9944cc;

    g.fillStyle(0x000000, 0.35);
    g.fillEllipse(t.x, t.y + 4, 30 * grow, 11 * grow);

    g.fillStyle(body, 0.96);
    g.lineStyle(2, edge, 0.9);
    g.beginPath();
    g.moveTo(t.x - baseW, t.y + 2);
    g.lineTo(midX - baseW * 0.55, midY);
    g.lineTo(tipX, tipY);
    g.lineTo(midX + baseW * 0.55, midY);
    g.lineTo(t.x + baseW, t.y + 2);
    g.closePath();
    g.fillPath();
    g.strokePath();

    // Hooked barbs alternating down the shaft.
    g.lineStyle(2, glowColor, 0.85);
    for (let i = 1; i <= 3; i++) {
      const f = i / 4;
      const bx = Phaser.Math.Linear(t.x, tipX, f);
      const by = Phaser.Math.Linear(t.y, tipY, f);
      const dir = i % 2 === 0 ? 1 : -1;
      g.lineBetween(bx, by, bx + dir * (10 - i * 1.6), by - 6);
    }

    if (t.eyed && grow > 0.7) {
      const eyeY = tipY + 12;
      g.fillStyle(0xff1133, 0.95);
      g.fillCircle(tipX - 3.5, eyeY, 2.6);
      g.fillCircle(tipX + 3.5, eyeY, 2.6);
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
    this.placeBeacon(this.arena.player.x, this.arena.player.y, mouseX, mouseY, 'player');
    this.arena.showFloatingText(this.arena.player.x, this.arena.player.y - 30, '🎯 SHADOW BEACON', '#aa44ff');
    // Online: the peer mirrors the emplacement and watches our ghost walk onto it.
    this.arena.broadcastMasteryCast('shadow-beacon');
  }

  /** Online replay: mirror the remote shadow player's beacon so it can shell us locally. */
  doNpcShadowBeacon(tx: number, ty: number): void {
    this.placeBeacon(this.arena.npc.x, this.arena.npc.y, tx, ty, 'npc');
  }

  private placeBeacon(x: number, y: number, dotX: number, dotY: number, owner: 'player' | 'npc'): void {
    const scene = this.arena.scene;
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
    const accent = b.owner === 'player' ? 0x9933cc : 0x772299;

    g.fillStyle(0x000000, 0.35);
    g.fillEllipse(b.x, b.y + 9 * grow, 50 * grow, 18 * grow);

    // Base plate stays square to the world — only the barrel swivels, so the
    // emplacement never degenerates into an anonymous rotated diamond.
    const half = 16 * grow;
    g.fillStyle(0x150020, 0.96);
    g.lineStyle(2, accent, 0.9);
    g.fillRect(b.x - half, b.y - half, half * 2, half * 2);
    g.strokeRect(b.x - half, b.y - half, half * 2, half * 2);
    // Sandbag blocks stacked along the plate edges.
    g.fillStyle(0x2a0940, 0.95);
    g.lineStyle(1, accent, 0.55);
    for (const [ox, oy, w, h] of [
      [-half, -half, half * 2, 5 * grow],
      [-half, half - 5 * grow, half * 2, 5 * grow],
    ] as const) {
      g.fillRect(b.x + ox, b.y + oy, w, h);
      g.strokeRect(b.x + ox, b.y + oy, w, h);
    }
    g.fillStyle(0xaa44ff, 0.25 + live * 0.55);
    for (const [ox, oy] of [[-11, -11], [11, -11], [11, 11], [-11, 11]] as const) {
      g.fillCircle(b.x + ox * grow, b.y + oy * grow, 2 * grow);
    }

    // Barrel, trained on the dot and overhanging the plate so the aim is unmistakable.
    g.fillStyle(0x0d0014, 0.98);
    g.lineStyle(2, 0x9933cc, 0.95);
    poly([[-6, -7], [27, -4.5], [27, 4.5], [-6, 7]]);
    const [mx, my] = px(28, 0);
    g.lineStyle(2.5, 0xcc66ff, 0.95);
    g.strokeCircle(mx, my, 5.5 * grow);
    // Muzzle brake ribs.
    g.lineStyle(1.5, 0x9933cc, 0.8);
    for (const lx of [17, 21] as const) {
      const [ax, ay] = px(lx, -5);
      const [bx2, by2] = px(lx, 5);
      g.lineBetween(ax, ay, bx2, by2);
    }

    // Rune core — the tell for "step here and it fires".
    const pulse = 0.5 + 0.5 * Math.sin(time * (b.armed ? 0.012 : 0.004));
    g.fillStyle(0xaa44ff, (0.2 + pulse * 0.6) * live);
    g.fillCircle(b.x, b.y, (3.5 + pulse * 3) * grow);
    g.lineStyle(1.5, 0xcc88ff, 0.5 * live);
    g.strokeCircle(b.x, b.y, (9 + pulse * 2) * grow);
  }

  /** The marked impact point: three reticle arcs orbiting a breathing core. */
  private drawBeaconDot(b: ShadowBeacon, time: number): void {
    const g = b.dotGfx;
    g.clear();
    const grow = Math.min(1, (time - b.spawnAt) / 250);
    const pulse = 0.5 + 0.5 * Math.sin(time * 0.006);
    const spin = time * 0.0015;

    g.fillStyle(0x000000, 0.26);
    g.fillEllipse(b.dotX, b.dotY + 4, 24 * grow, 8 * grow);

    g.lineStyle(2, 0xcc88ff, 0.85);
    for (let i = 0; i < 3; i++) {
      const a = spin + i * (Math.PI * 2 / 3);
      g.beginPath();
      g.arc(b.dotX, b.dotY, (11 + pulse * 2) * grow, a, a + 0.75);
      g.strokePath();
    }

    g.lineStyle(1.5, 0xaa44ff, 0.65);
    for (let i = 0; i < 4; i++) {
      const a = i * (Math.PI / 2) - spin * 0.6;
      const r0 = 15 * grow;
      const r1 = 19 * grow;
      g.lineBetween(
        b.dotX + Math.cos(a) * r0, b.dotY + Math.sin(a) * r0,
        b.dotX + Math.cos(a) * r1, b.dotY + Math.sin(a) * r1,
      );
    }

    g.fillStyle(0xaa44ff, 0.5 + pulse * 0.45);
    g.fillCircle(b.dotX, b.dotY, (4 + pulse * 1.5) * grow);
    g.fillStyle(0x1a0026, 0.9);
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

  private fireBeacon(b: ShadowBeacon): void {
    const scene = this.arena.scene;
    const shell = scene.add.circle(b.x, b.y, 8, 0x120020, 0.95)
      .setStrokeStyle(2, 0xaa44ff).setDepth(9);
    const flash = scene.add.circle(b.x, b.y, 20, 0xaa44ff, 0.5).setDepth(4);
    scene.tweens.add({ targets: flash, scaleX: 2, scaleY: 2, alpha: 0, duration: 300, onComplete: () => flash.destroy() });
    scene.tweens.add({
      targets: shell, x: b.dotX, y: b.dotY, duration: 700, ease: 'Sine.easeOut',
      onComplete: () => {
        shell.destroy();
        const boom = scene.add.circle(b.dotX, b.dotY, BEACON_BLAST_RADIUS * 0.35, 0x220033, 0.75).setDepth(8);
        scene.tweens.add({ targets: boom, scaleX: 3, scaleY: 3, alpha: 0, duration: 420, onComplete: () => boom.destroy() });
        const victims: Fighter[] = b.owner === 'player' ? this.arena.enemies : [this.arena.player];
        for (const v of victims) {
          if (!v.active || v.hp <= 0) continue;
          if (Phaser.Math.Distance.Between(b.dotX, b.dotY, v.x, v.y) > BEACON_BLAST_RADIUS) continue;
          v.takeDamage(BEACON_DAMAGE);
          this.applyHopelessness(v, BEACON_HOPELESS);
          this.arena.spawnHitFlash(v.x, v.y, 0xaa44ff);
        }
      },
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
    const accent = line.owner === 'player' ? 0xcc88ff : 0x8844aa;
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
    g.lineStyle(2, 0x000000, 0.22);
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
        this.arena.spawnHitFlash(v.x, v.y, 0xcc88ff);
        this.arena.showFloatingText(v.x, v.y - 38, '🧵 TRIPPED', '#cc88ff');
        this.arena.recordMasteryStat('trapped', 1);
        break;
      }
    }
  }

  // ── Per-frame update (runs before NPC AI so cast state is fresh) ──────

  update(time: number, delta: number, isPlayerShadow: boolean, isNpcShadow: boolean): void {
    if (!isPlayerShadow && !isNpcShadow) return;
    const { player, npc, enemies, scene } = this.arena;

    // Dark cloud ticks (both owners)
    for (let ci = this.shadowDarkClouds.length - 1; ci >= 0; ci--) {
      const cloud = this.shadowDarkClouds[ci];
      if (time >= cloud.expiresAt) {
        cloud.sprite.destroy();
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
              this.arena.spawnHitFlash(t.x, t.y, 0x660088);
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
            this.arena.spawnHitFlash(t.x, t.y, 0xcc44ff);
            this.shadowNpcStunnedUntil = time + 2000;
            break;
          }
        }
      } else if (Phaser.Math.Distance.Between(trap.x, trap.y, player.x, player.y) <= trap.radius + 10) {
        trap.triggered = true;
        player.takeDamage(20);
        this.applyHopelessness(player, 20);
        this.arena.spawnHitFlash(player.x, player.y, 0xcc44ff);
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
          if (this.shadowTentacleSprite) { this.shadowTentacleSprite.destroy(); this.shadowTentacleSprite = null; }
        } else {
          const tSpr = this.shadowTentacleSprite;
          if (tSpr) {
            tSpr.clear();
            if (this.shadowTentacleHooked) {
              // Hooked: draw from player to NPC, show drag chain
              tSpr.lineStyle(6, 0x8800cc, 0.85);
              tSpr.lineBetween(player.x, player.y, npc.x, npc.y);
              tSpr.lineStyle(2, 0xcc44ff, 0.5);
              tSpr.lineBetween(player.x, player.y, npc.x, npc.y);
            } else {
              // Miss/drag: track cursor for trap drag
              if (this.canDragTraps('player')) {
                this.shadowTentacleX = ptr.worldX;
                this.shadowTentacleY = ptr.worldY;
              }
              tSpr.lineStyle(4, 0x8800cc, 0.6);
              tSpr.lineBetween(player.x, player.y, this.shadowTentacleX, this.shadowTentacleY);
            }
          }
        }
      }

      // (NPC drag + stun handled in updateAfterAI so they take effect)

      // Black hole active: draw + tick damage + Q+ effects (enemy drag handled in updateAfterAI)
      if (this.shadowBlackHoleActive) {
        if (time >= this.shadowBlackHoleEnd) {
          this.shadowBlackHoleActive = false;
          if (this.shadowBlackHoleSprite) { this.shadowBlackHoleSprite.destroy(); this.shadowBlackHoleSprite = null; }
        } else {
          // Follow the live cursor for the duration of the effect
          const bhPtr = scene.input.activePointer;
          this.shadowBlackHoleX = bhPtr.worldX;
          this.shadowBlackHoleY = bhPtr.worldY;

          if (this.shadowBlackHoleSprite) {
            const pulse = 18 + Math.sin(time * 0.006) * 4;
            this.shadowBlackHoleSprite.clear();
            this.shadowBlackHoleSprite.fillStyle(0x000000, 0.6);
            this.shadowBlackHoleSprite.fillCircle(this.shadowBlackHoleX, this.shadowBlackHoleY, pulse);
            this.shadowBlackHoleSprite.lineStyle(3, 0x8800cc, 0.85);
            this.shadowBlackHoleSprite.strokeCircle(this.shadowBlackHoleX, this.shadowBlackHoleY, pulse + 8);
          }

          // Tick damage to enemy, 5/sec, regardless of position
          this.shadowBlackHoleDamageAccum += delta;
          if (this.shadowBlackHoleDamageAccum >= 1000) {
            this.shadowBlackHoleDamageAccum -= 1000;
            npc.takeDamage(5);
            this.arena.spawnHitFlash(npc.x, npc.y, 0x8800cc);
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
            this.arena.spawnHitFlash(npc.x, npc.y, 0x8800cc);
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
          if (this.npcShadowTentacleSprite) { this.npcShadowTentacleSprite.destroy(); this.npcShadowTentacleSprite = null; }
        } else {
          if (this.npcShadowTentacleSprite) {
            this.npcShadowTentacleSprite.clear();
            if (this.npcShadowTentacleHooked) {
              // Draw tentacle from NPC to player
              this.npcShadowTentacleSprite.lineStyle(6, 0x440066, 0.9);
              this.npcShadowTentacleSprite.lineBetween(npc.x, npc.y, player.x, player.y);
              this.npcShadowTentacleSprite.lineStyle(2, 0x8800cc, 0.5);
              this.npcShadowTentacleSprite.lineBetween(npc.x, npc.y, player.x, player.y);
            } else {
              // Miss whip
              const angle = Math.atan2(player.y - npc.y, player.x - npc.x);
              this.npcShadowTentacleSprite.lineStyle(4, 0x440066, 0.6);
              this.npcShadowTentacleSprite.lineBetween(
                npc.x, npc.y,
                npc.x + Math.cos(angle) * 100,
                npc.y + Math.sin(angle) * 100,
              );
            }
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

      // NPC black hole (P2 shadow Q ability): chargeup → activation
      if (this.npcShadowBlackHoleCharging) {
        if (this.npcShadowBlackHoleChargeVisual) {
          this.npcShadowBlackHoleChargeVisual.setPosition(npc.x, npc.y);
        }
        if (time >= this.npcShadowBlackHoleChargeStart + 3000) {
          this.npcShadowBlackHoleCharging = false;
          this.arena.npcNukeChanneling = false;
          if (this.npcShadowBlackHoleChargeVisual) { this.npcShadowBlackHoleChargeVisual.destroy(); this.npcShadowBlackHoleChargeVisual = null; }
          this.npcShadowBlackHoleActive = true;
          this.npcShadowBlackHoleEnd = time + 10000;
          this.npcShadowBlackHoleSprite = scene.add.graphics().setDepth(5);
        }
      }

      // NPC black hole active: draw + pull player toward NPC
      if (this.npcShadowBlackHoleActive) {
        if (time >= this.npcShadowBlackHoleEnd) {
          this.npcShadowBlackHoleActive = false;
          if (this.npcShadowBlackHoleSprite) { this.npcShadowBlackHoleSprite.destroy(); this.npcShadowBlackHoleSprite = null; }
        } else {
          if (this.npcShadowBlackHoleSprite) {
            const pulse = 18 + Math.sin(time * 0.006) * 4;
            this.npcShadowBlackHoleSprite.clear();
            this.npcShadowBlackHoleSprite.fillStyle(0x000000, 0.6);
            this.npcShadowBlackHoleSprite.fillCircle(npc.x, npc.y, pulse);
            this.npcShadowBlackHoleSprite.lineStyle(3, 0x8800cc, 0.85);
            this.npcShadowBlackHoleSprite.strokeCircle(npc.x, npc.y, pulse + 8);
          }
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
          if (this.shadowTentacleSprite) { this.shadowTentacleSprite.destroy(); this.shadowTentacleSprite = null; }
          if (this.shadowConsumeAura) this.shadowConsumeAura.destroy();
          this.shadowConsumeAura = scene.add.circle(player.x, player.y, 30, 0x8800cc, 0.4).setDepth(7);
          scene.tweens.add({ targets: this.shadowConsumeAura, alpha: 0.85, yoyo: true, repeat: -1, duration: 180 });
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
        if (this.shadowConsumeAura) { this.shadowConsumeAura.destroy(); this.shadowConsumeAura = null; }
      } else {
        cBody.reset(player.x, player.y);
        cBody.setVelocity(0, 0);
        if (this.shadowConsumeAura) this.shadowConsumeAura.setPosition(player.x, player.y);
        this.shadowConsumeTickAccum += delta;
        if (this.shadowConsumeTickAccum >= 1000) {
          this.shadowConsumeTickAccum -= 1000;
          for (const t of enemies) {
            if (!t.active || t.hp <= 0) continue;
            t.takeDamage(2);
            this.arena.spawnHitFlash(t.x, t.y, 0x8800cc);
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

    if (pointer.isDown) {
      this.shadowDrainHoldAccum += delta;
      if (this.shadowDrainHoldAccum >= 300) {
        // Cloud mode: spawn dark cloud every 600ms
        this.shadowDrainCloudAccum += delta;
        if (this.shadowDrainCloudAccum >= 600) {
          this.shadowDrainCloudAccum -= 600;
          this.spawnDarkCloud(mouseX, mouseY, 'player');
        }
      }
    } else {
      if (this.arena.pointerWasDown && this.shadowDrainHoldAccum < 300) {
        // Tap: launch dark bomb
        player.castAbility('dark-drain', playerCtx);
      }
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
        if (this.shadowConsumeAura) { this.shadowConsumeAura.destroy(); this.shadowConsumeAura = null; }
        const throwAngle = Math.atan2(mouseY - player.y, mouseX - player.x);
        (this.arena.npc.body as Phaser.Physics.Arcade.Body).setVelocity(
          Math.cos(throwAngle) * 800, Math.sin(throwAngle) * 800,
        );
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
