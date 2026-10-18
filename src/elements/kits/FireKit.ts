import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { Projectile } from '../../combat/Projectile';
import { CastContext } from '../Ability';
import { CustomStatus } from './StatusHudKit';
import { Sfx } from '../../audio';
import { ArmGesture, FireAvatar, FireColorFn, FireFx, FireWreath, FIRE, bombMarker, flameTongue } from './FireVisuals';
import { BaseAvatar } from './ElementVisuals';
import { makeSkinAvatar } from './skins/SkinAvatars';

// ── Heatwave (Fire Mastery) constants ───────────────────────────────────
const HEATWAVE_COOLDOWN_MS = 6000;
const HEATWAVE_RANGE = 420;
const HEATWAVE_SPEED = 520;        // px/s
const HEATWAVE_HALF_WIDTH = 45;    // perpendicular half-extent of the rectangle
const HEATWAVE_HALF_THICKNESS = 13;
const HEATWAVE_HIT_PAD = 18;       // target body radius, forgives the sweep band
const EXPOSED_DURATION_MS = 5000;
const MOLTEN_DAMAGE_PER_SEC = 5;

/** A travelling Heatwave band. Pierces — `hit` tracks who it has already exposed. */
interface Heatwave {
  /** Stacked rectangles (outer haze → hot core) moved together each frame. */
  rects: Phaser.GameObjects.Rectangle[];
  x: number; y: number;
  cos: number; sin: number;
  travelled: number;
  hit: Set<Fighter>;
  /** 'player' waves expose enemies; 'npc' waves (online replay) expose the local player. */
  owner: 'player' | 'npc';
}

// ── Pressure Bomb ────────────────────────────────────────────────────────
/** The fuse on a planted charge: long enough to be walked out of, short enough to matter. */
const PRESSURE_FUSE_MS = 1500;
const PRESSURE_RADIUS = 100;
// Cluster Bomb (R+): the shell splits on detonation and throws bomblets around the crater.
const CLUSTER_COUNT = 6;
const CLUSTER_FUSE_MS = 700;
/** Staggered so the bomblets crackle off in sequence rather than as one flat thump. */
const CLUSTER_STAGGER_MS = 70;
const CLUSTER_DAMAGE = 12;
const CLUSTER_RADIUS = 55;
const CLUSTER_MIN_THROW = 30;
const CLUSTER_MAX_THROW = 85;

/**
 * A Pressure Bomb sitting on its fuse. Owner-agnostic: the marker is painted in the owner's
 * colours and only their enemies are caught by the blast, so the NPC's charges live here too.
 */
interface PressureCharge {
  x: number; y: number;
  /** Scene time the charge goes off. */
  fireAt: number;
  fuseMs: number;
  damage: number;
  radius: number;
  /** Cluster shells throw bomblets when they blow; the bomblets themselves do not. */
  cluster: boolean;
  /** Ash: the blast catches its own thrower too. */
  selfHarm: boolean;
  owner: 'player' | 'npc';
  /** Ground reticle, redrawn every frame from how much fuse is left. */
  marker: Phaser.GameObjects.Graphics;
  /** Marker scale — a bomblet gets a smaller reticle than the shell that threw it. */
  markerScale: number;
}

/** Which arm gesture the opponent's rig plays when the NPC lands each ability. */
const NPC_GESTURES: Record<string, ArmGesture> = {
  'fireball': 'punch',
  'flame-dash': 'dash',
  'pressure-bomb': 'slam',
  'flame-body': 'flex',
  'flame-nuke': 'raise',
  'supernova': 'raise',
};

// ── Supernova (alternate Q) ──────────────────────────────────────────────
const NOVA_DURATION_MS = 6000;
const NOVA_LENGTH = 470;
/** Palms sit this far out along the aim, so the beam leaves the hands rather than the chest. */
const NOVA_PALM_OFFSET = 24;
const NOVA_HALF_WIDTH = 20;
const NOVA_HIT_PAD = 16;
/** "Very poor turning radius": radians per second the beam may swing toward the aim. */
const NOVA_TURN_RATE = 0.85;
const NOVA_TICK_MS = 200;
const NOVA_TICK_DAMAGE = 9;           // 45 a second
/** Self-burn per second at full heat; heat climbs linearly over the 6s. */
const NOVA_SELF_DPS_MAX = 8;
const NOVA_BLAST_DAMAGE = 70;
const NOVA_BLAST_REACH = 60;          // perpendicular reach of the detonation either side of the beam
const NOVA_BLAST_SELF = 60;
const NOVA_POOLS = 4;
/** Online: how often the owner re-sends where the beam is being pulled. */
const NOVA_NET_AIM_MS = 150;
/** Bots let go once they drop under this share of their health. */
const NOVA_BOT_BAIL_HP = 0.3;

/** A live Supernova beam. Owner-agnostic: the NPC's (bot or online replica) runs here too. */
interface Nova {
  owner: 'player' | 'npc';
  angle: number;
  startedAt: number;
  /** Where the beam is being pulled toward — the cursor, the bot's target, or a relayed aim. */
  pullX: number; pullY: number;
  tickAccum: number;
  /** Fractional self-burn waiting to add up to a whole point. */
  selfAccum: number;
  netAccum: number;
  /** Beam body, redrawn every frame. */
  g: Phaser.GameObjects.Graphics;
}

// ── Flame pools (Melt's flamethrower and Supernova's detonation) ─────────
const MELT_RANGE = 240;               // 180 × 1.33
const MELT_POOL_EVERY_MS = 260;
const MELT_POOL_RADIUS = 30;
const MELT_POOL_LIFE_MS = 2600;
const MELT_POOL_CAP = 14;
const POOL_TICK_MS = 400;

/** A pool of standing flame. Burns anyone but its owner. */
interface FlamePool {
  x: number; y: number;
  radius: number;
  bornAt: number;
  expiresAt: number;
  tickAccum: number;
  damage: number;
  owner: 'player' | 'npc';
  /** Per-pool phase so neighbouring pools never flicker in step. */
  seed: number;
}

// ── Radiate ───────────────────────────────────────────────────────────────
const RADIATE_RADIUS = 90;
const RADIATE_TICK_MS = 333;           // 1 a tick = 3 a second; 2 a tick with mastery

// ── Alcohol (booze trail) ─────────────────────────────────────────────────
const BOOZE_PUDDLES = 4;
const BOOZE_RADIUS = 36;
const BOOZE_LIFE_MS = 7000;
/** Once lit, a puddle burns for at most this long before it is spent. */
const BOOZE_BURN_LIFE_MS = 4000;
const BOOZE_RESIST = 0.8;
/** Continuous time inside before the drink starts throwing your aim off. */
const BOOZE_DRIFT_AFTER_MS = 2000;
const BOOZE_DRIFT_DEG = 22;
const BOOZE_BURN_TICK_MS = 500;
const BOOZE_BURN_DAMAGE = 4;

interface BoozePuddle {
  x: number; y: number;
  radius: number;
  bornAt: number;
  expiresAt: number;
  ignited: boolean;
  tickAccum: number;
  owner: 'player' | 'npc';
  seed: number;
}

// ── Ash ───────────────────────────────────────────────────────────────────
const ASH_DAMAGE_MULT = 1.25;
const ASH_RANGE_MULT = 1.33;
/** Share of a charge's damage that comes back on the thrower if they stand in it. */
const ASH_SELF_SHARE = 0.5;

// ── FireArenaApi ──────────────────────────────────────────────────────────

export interface FireArenaApi {
  readonly player: Fighter;
  readonly npc: Fighter;
  readonly enemies: Fighter[];
  readonly scene: Phaser.Scene;
  /** Live projectile group — scanned each frame so fireballs can be given a burning trail. */
  readonly projectiles: Phaser.Physics.Arcade.Group;
  readonly eKey: Phaser.Input.Keyboard.Key;
  readonly fKey: Phaser.Input.Keyboard.Key;
  readonly rKey: Phaser.Input.Keyboard.Key;
  readonly qKey: Phaser.Input.Keyboard.Key;
  readonly nukeChanneling: boolean;
  readonly width: number;
  readonly height: number;
  readonly masteryActive: boolean;
  /** Online PvP: the npc is a remote human's replica, not a bot. */
  readonly isOnline: boolean;
  /** The player's burn lives on the arena (playerBurningUntil), not on the Fighter. */
  readonly playerBurning: boolean;
  /** Mastery enhancement id bound over the given ability slot, or null if that slot is unchanged. */
  masteryBindFor(slot: string): string | null;
  /** Online: broadcast a bindable mastery cast so the peer's sim replays it. */
  broadcastMasteryCast(enhId: string): void;
  lockCaster(durationMs: number): void;
  hasUpgrade(slot: string): boolean;
  hasPerk(owner: 'player' | 'npc', perkId: string): boolean;
  /** Skins: maps a fire visual color through the owner's equipped skin (Candle → violet). */
  fireColor(owner: 'player' | 'npc', base: number): number;
  /** Equipped skin id for that side, or null — decides which character rig gets built. */
  skinId(owner: 'player' | 'npc'): string | null;
  /** Idempotent achievement unlock with in-arena popup. */
  unlockAchievement(id: string): void;
  spawnHitFlash(x: number, y: number, color: number): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  buildPlayerContext(x: number, y: number): CastContext;
  damagePlayerTargets(cx: number, cy: number, radius: number, damage: number, color: number): void;
  dealFlameNukeDamage(cx: number, cy: number, radius: number, damage: number): void;
  recordMasteryStat(key: string, amount: number): void;
  /** Fire Mastery — Burning Body: instantly clears all DOT effects currently on the player. */
  clearPlayerDots(): void;
  /** Show/clear an element-specific effect in the top-right status tray (player-side only). */
  setStatusIndicator(id: string, status: CustomStatus | null): void;
}

// ── FireKit ───────────────────────────────────────────────────────────────

export class FireKit {
  // ── Visuals ───────────────────────────────────────────────────────────
  /** Colour mappers + effect painters, one per owner so a skin recolours the right side. */
  private readonly pcol: FireColorFn;
  private readonly ncol: FireColorFn;
  private readonly pfx: FireFx;
  private readonly nfx: FireFx;
  /**
   * The character rig for each fire-element fighter — fire's own by default, or whatever
   * that side's equipped skin installs instead. Typed as the base rig because the kit only
   * ever drives it through poses and gestures, which every rig has.
   */
  private playerAvatar: BaseAvatar | null = null;
  private npcAvatar: BaseAvatar | null = null;
  /** Last aim point, cached in handleInput so the per-frame avatar update can face it. */
  private aimX = 0;
  private aimY = 0;
  private projTrailAccum = 0;

  // ── Player state ─────────────────────────────────────────────────────
  private flameBodyActive = false;
  private flameBodyTickAccum = 0;
  private flameBodyWreath: FireWreath | null = null;
  private flamethrowerHoldMs = 0;
  private flamethrowerTickAccum = 0;
  private enhancedFlameBody = false;
  private flameChargeWaiting = false;
  private flameChargeWaitingSince = 0;
  private flameChargeWaitVisual: Phaser.GameObjects.Arc | null = null;
  private flameChargePending: { x: number; y: number; fireAt: number; visual: Phaser.GameObjects.Arc } | null = null;
  private playerLastMovedAt = 0;
  private firePointerWasDown = false;

  // ── Shared state ──────────────────────────────────────────────────────
  /** Live Pressure Bomb charges from either side, each waiting out its own fuse. */
  private pressureCharges: PressureCharge[] = [];

  // ── NPC state ─────────────────────────────────────────────────────────
  private npcFlameBodyActive = false;
  private npcFlameBodyTickAccum = 0;
  private npcFlameBodyWreath: FireWreath | null = null;
  private npcEnhancedFlameBody = false;

  /**
   * The kit's little in-world HUD — the sun seal over Exposed targets, the Supernova heat bar,
   * the Radiate haze. One Graphics, wiped at the top of every `update`, so nothing it shows can
   * outlive the frame that drew it.
   */
  private hudG: Phaser.GameObjects.Graphics | null = null;
  private hudT = 0;
  /** Ground layer for flame pools and booze — under the fighters, redrawn every frame. */
  private groundG: Phaser.GameObjects.Graphics | null = null;

  // ── Perk state ────────────────────────────────────────────────────────
  private flamePools: FlamePool[] = [];
  private meltPoolAccum = 0;
  private boozePuddles: BoozePuddle[] = [];
  /** Continuous time each fighter has spent wading in booze (cleared the moment they step out). */
  private boozeWade = new Map<Fighter, number>();
  private radiateAccum = 0;
  private npcRadiateAccum = 0;
  /** Which fighters this kit has written perk multipliers onto, so they can be handed back. */
  private perkMultsWritten = new Set<Fighter>();

  // ── Supernova state ───────────────────────────────────────────────────
  private playerNova: Nova | null = null;
  private npcNova: Nova | null = null;

  // ── Fire Mastery state ──────────────────────────────────────────────────
  private burningBodyWreath: FireWreath | null = null;
  private burningBodyTickAccum = 0;
  /** Shared throttle for the lava drips shed by molten targets. */
  private moltenDripAccum = 0;
  private heatwaveLastCastAt = 0;
  private heatwaves: Heatwave[] = [];

  constructor(private arena: FireArenaApi) {
    this.pcol = (base) => arena.fireColor('player', base);
    this.ncol = (base) => arena.fireColor('npc', base);
    this.pfx = new FireFx(arena.scene, this.pcol);
    this.nfx = new FireFx(arena.scene, this.ncol);
  }

  // ── Public accessors ──────────────────────────────────────────────────

  isFlameBodyActive(): boolean { return this.flameBodyActive; }

  /**
   * Ruin Mastery — Second Skin. Flame Body is a toggle rather than a timed buff, which makes it
   * a form: the fighter *is* the fire until they say otherwise, and nothing else in the game
   * turns it off for them.
   *
   * The two multipliers are handed back exactly as the F key hands them back, in the same
   * order — the Flame Affinity branch owns both of them and the base branch owns neither, so
   * only `enhancedFlameBody` may undo them or a plain toggle would be credited a doubling it
   * never paid for.
   */
  revertForms(f: Fighter): string[] {
    if (f !== this.arena.player || !this.flameBodyActive) return [];
    if (this.enhancedFlameBody) {
      this.arena.player.incomingDamageMultiplier = 1;
      this.arena.player.cardOutgoingDamageMult /= 2;
    }
    this.flameBodyActive = false;
    this.enhancedFlameBody = false;
    this.flameBodyTickAccum = 0;
    this.setFlameBodyWreath(false, 34, 1);
    return ['Flame Body'];
  }
  isEnhancedFlameBody(): boolean { return this.enhancedFlameBody; }
  isNpcFlameBodyActive(): boolean { return this.npcFlameBodyActive; }

  /** Player movement factor this kit owns: Flame Body doubles it, a Supernova roots it. */
  getPlayerSpeedMult(): number {
    if (this.playerNova) return 0;
    return this.flameBodyActive ? 2 : 1;
  }

  /** The npc's equivalent; null when the kit has no say (so the arena's own chain decides). */
  getNpcSpeedMult(): number | null {
    if (this.npcNova) return 0;
    return this.npcFlameBodyActive ? 2 : null;
  }

  isSupernovaActive(owner: 'player' | 'npc'): boolean {
    return (owner === 'player' ? this.playerNova : this.npcNova) !== null;
  }

  reset(): void {
    // Visuals — every GameObject dies with the old scene run, so rebuild lazily in update().
    if (this.playerAvatar) { this.playerAvatar.destroy(); this.playerAvatar = null; }
    if (this.npcAvatar) { this.npcAvatar.destroy(); this.npcAvatar = null; }
    this.aimX = 0;
    this.aimY = 0;
    this.projTrailAccum = 0;

    // Player
    this.flameBodyActive = false;
    this.flameBodyTickAccum = 0;
    if (this.flameBodyWreath) { this.flameBodyWreath.destroy(); this.flameBodyWreath = null; }
    this.flamethrowerHoldMs = 0;
    this.flamethrowerTickAccum = 0;
    this.enhancedFlameBody = false;
    this.flameChargeWaiting = false;
    this.flameChargeWaitingSince = 0;
    if (this.flameChargeWaitVisual) { this.flameChargeWaitVisual.destroy(); this.flameChargeWaitVisual = null; }
    this.flameChargePending = null;
    this.playerLastMovedAt = 0;
    this.firePointerWasDown = false;

    // Shared — a charge left ticking when the match ended never gets to go off.
    for (const c of this.pressureCharges) c.marker.destroy();
    this.pressureCharges = [];

    // NPC
    this.npcFlameBodyActive = false;
    this.npcFlameBodyTickAccum = 0;
    if (this.npcFlameBodyWreath) { this.npcFlameBodyWreath.destroy(); this.npcFlameBodyWreath = null; }
    this.npcEnhancedFlameBody = false;

    // Perks
    if (this.hudG) { this.hudG.destroy(); this.hudG = null; }
    if (this.groundG) { this.groundG.destroy(); this.groundG = null; }
    this.flamePools = [];
    this.meltPoolAccum = 0;
    this.boozePuddles = [];
    this.boozeWade.clear();
    this.radiateAccum = 0;
    this.npcRadiateAccum = 0;
    // Fighters are rebuilt every match, so the multipliers die with the old bodies; a bond
    // swap mid-match is handled in update() instead.
    this.perkMultsWritten.clear();

    // Supernova
    this.playerNova?.g.destroy();
    this.playerNova = null;
    this.npcNova?.g.destroy();
    this.npcNova = null;

    // Fire Mastery
    if (this.burningBodyWreath) { this.burningBodyWreath.destroy(); this.burningBodyWreath = null; }
    this.burningBodyTickAccum = 0;
    this.heatwaveLastCastAt = 0;
    for (const w of this.heatwaves) for (const r of w.rects) r.destroy();
    this.heatwaves = [];
  }

  update(time: number, delta: number, isPlayerFire: boolean, isNpcFire: boolean): void {
    const { player, npc, scene } = this.arena;

    this.hudT += delta / 1000;
    if (!this.hudG || !this.hudG.active) this.hudG = scene.add.graphics().setDepth(9);
    this.hudG.clear();
    if (!this.groundG || !this.groundG.active) this.groundG = scene.add.graphics().setDepth(2);
    this.groundG.clear();

    this.updateAvatars(delta, isPlayerFire, isNpcFire);
    this.updateFireballTrails(delta);
    // Owner-agnostic: pools, booze and beams outlive the frame either side set them down on.
    this.updateFlamePools(time, delta);
    this.updateBooze(time, delta);
    this.updateNova(this.playerNova, time, delta);
    this.updateNova(this.npcNova, time, delta);
    this.updatePerkMults(isPlayerFire, isNpcFire);
    this.updateRadiate(delta, isPlayerFire, isNpcFire);
    // Same for planted charges — a fuse belongs to whoever lit it, not to whoever is fire.
    this.updatePressureCharges(time);

    if (isPlayerFire) {
      // Status tray: Flame Body is a toggle with no expiry, so mirror it every frame.
      this.arena.setStatusIndicator('flame-body', this.flameBodyActive ? {
        name: 'Flame Body', emoji: '🔆', color: 0xff9900, priority: 118,
        description: this.enhancedFlameBody
          ? 'Wreathed in flame: double outgoing damage, but double damage taken.'
          : 'Wreathed in flame: burns anything you touch, at the cost of steady self-damage.',
      } : null);

      // Flame body ticks (self-damage every 250ms — only for unupgraded base form, not in flame puddle)
      if (this.flameBodyActive) {
        if (!this.enhancedFlameBody) {
          this.flameBodyTickAccum += delta;
          if (this.flameBodyTickAccum >= 250) {
            this.flameBodyTickAccum -= 250;
            player.applySelfDamage(2);
          }
        }
        this.flameBodyWreath?.update(delta, player.x, player.y, player.alpha);
      }

      // Waiting for 1s channel lock to expire, then commit charge location
      if (this.flameChargeWaiting) {
        if (this.flameChargeWaitVisual) this.flameChargeWaitVisual.setPosition(player.x, player.y);
        if (time >= this.flameChargeWaitingSince + 1000) {
          this.flameChargeWaiting = false;
          if (this.flameChargeWaitVisual) { this.flameChargeWaitVisual.destroy(); this.flameChargeWaitVisual = null; }
          const cx = player.x, cy = player.y;
          const fuseVis = scene.add.circle(cx, cy, 14, this.pcol(FIRE.core), 0.8).setDepth(7);
          fuseVis.setStrokeStyle(3, this.pcol(FIRE.yellow), 0.9);
          scene.tweens.add({ targets: fuseVis, alpha: 0.2, yoyo: true, repeat: -1, duration: 250 });
          // 3s fuse: fire gathers into the charge and the containment ring squeezes shut.
          this.pfx.channelCharge(cx, cy, 110, 3000);
          this.pfx.scorch(cx, cy, 30);
          this.flameChargePending = { x: cx, y: cy, fireAt: time + 3000, visual: fuseVis };
        }
      }

      // Fuse detonation
      if (this.flameChargePending && time >= this.flameChargePending.fireAt) {
        const { x: fx, y: fy, visual } = this.flameChargePending;
        this.flameChargePending = null;
        visual.destroy();
        // Ash: a fatter charge over a wider blast, and it bites its owner 25% harder.
        const ash = this.arena.hasPerk('player', 'fire-ash');
        const radius = Math.round(220 * (ash ? ASH_RANGE_MULT : 1));
        this.arena.dealFlameNukeDamage(fx, fy, radius, this.scaled('player', ash ? 100 : 80));
        this.igniteBooze('player', fx, fy, radius);
        if (Phaser.Math.Distance.Between(fx, fy, player.x, player.y) <= radius) {
          player.applySelfDamage(ash ? 100 : 80);
          this.arena.showFloatingText(player.x, player.y - 28, '🔥 Self-Dmg!', '#ff4400');
          // Oops achievement: blew yourself up with your own Flame Charge.
          if (player.hp <= 0) this.arena.unlockAchievement('oops');
        }
        this.pfx.explosion(fx, fy, radius, { shards: 30, smoke: 8, duration: 680 });
        this.pfx.firePillar(fx, fy, 52, 170);
        scene.cameras.main.shake(320, 0.010);
        this.arena.showFloatingText(fx, fy - 28, '💥 Flame Charge!', '#ff6600');
      }

      // Fire Mastery — Burning Body: always-on passive while mastery is enabled
      if (this.arena.masteryActive) {
        if (!this.burningBodyWreath) {
          // Sits under the Flame Body wreath (depth 2) so the two read as one bonfire.
          this.burningBodyWreath = new FireWreath(scene, this.pcol, 40, 0.85, 2, 8);
        }
        this.burningBodyWreath.update(delta, player.x, player.y, player.alpha);
        this.burningBodyTickAccum += delta;
        if (this.burningBodyTickAccum >= 500) {
          this.burningBodyTickAccum -= 500;
          for (const t of this.arena.enemies) {
            if (!t.active || t.hp <= 0) continue;
            if (Phaser.Math.Distance.Between(player.x, player.y, t.x, t.y) <= 50) {
              t.takeDamage(this.scaled('player', 3), { fireDot: true });
              this.arena.spawnHitFlash(t.x, t.y, this.pcol(FIRE.ember));
              this.pfx.embers(t.x, t.y, 2, { speed: 70, size: 2.6, life: 380 });
            }
          }
        }
        this.arena.clearPlayerDots();
      } else if (this.burningBodyWreath) {
        this.burningBodyWreath.destroy();
        this.burningBodyWreath = null;
        this.burningBodyTickAccum = 0;
      }

      // Fire Mastery — Heatwave projectiles and the Exposed / molten fire chain
      this.updateHeatwaves(time, delta);
      this.updateExposedAndMolten(time, delta);
    } else if (isNpcFire) {
      // Online: opponent is fire. Advance their replayed Heatwaves and keep the
      // Exposed/molten upkeep running so their debuff lands on our local fighter.
      this.updateHeatwaves(time, delta);
      this.updateExposedAndMolten(time, delta);
    }

    // NPC flame body tick (runs whenever NPC is fire regardless of player element)
    if (this.npcFlameBodyActive) {
      this.npcFlameBodyTickAccum += delta;
      if (this.npcFlameBodyTickAccum >= 250) this.npcFlameBodyTickAccum -= 250;
      this.npcFlameBodyWreath?.update(delta, npc.x, npc.y, npc.alpha);
    }
  }

  // ── Fire character rig ────────────────────────────────────────────────

  /**
   * That side's rig: the skin's if one is equipped, fire's living flame otherwise. Built
   * lazily in `updateAvatars` and torn down in `reset`, so changing skin between matches
   * swaps the character.
   */
  private makeAvatar(owner: 'player' | 'npc'): BaseAvatar {
    const { scene } = this.arena;
    const col = owner === 'player' ? this.pcol : this.ncol;
    return makeSkinAvatar(this.arena.skinId(owner), scene) ?? new FireAvatar(scene, col);
  }

  /**
   * Builds (on first frame) and drives the ball-arm avatar for whichever fighters are fire.
   * The player faces the cursor; the NPC faces whoever it is fighting.
   */
  private updateAvatars(delta: number, isPlayerFire: boolean, isNpcFire: boolean): void {
    const { player, npc, scene } = this.arena;

    if (isPlayerFire && player?.active) {
      if (!this.playerAvatar) this.playerAvatar = this.makeAvatar('player');
      const aimX = this.aimX || player.x + 1;
      const aimY = this.aimY || player.y;
      this.playerAvatar.setFacing(Math.atan2(aimY - player.y, aimX - player.x));
      this.playerAvatar.setIntensity(this.enhancedFlameBody ? 1.5 : this.flameBodyActive ? 1.25 : 1);
      this.playerAvatar.setMastered(this.arena.masteryActive);
      this.playerAvatar.update(delta, player.x, player.y, player.forceInvisible ? 0 : player.alpha);
    } else if (this.playerAvatar) {
      this.playerAvatar.destroy();
      this.playerAvatar = null;
    }

    if (isNpcFire && npc?.active) {
      if (!this.npcAvatar) this.npcAvatar = this.makeAvatar('npc');
      this.npcAvatar.setFacing(Math.atan2(player.y - npc.y, player.x - npc.x));
      this.npcAvatar.setIntensity(this.npcEnhancedFlameBody ? 1.5 : this.npcFlameBodyActive ? 1.25 : 1);
      this.npcAvatar.update(delta, npc.x, npc.y, npc.forceInvisible ? 0 : npc.alpha);
    } else if (this.npcAvatar) {
      this.npcAvatar.destroy();
      this.npcAvatar = null;
    }
  }

  /** Every live fireball drags a shrinking tail of embers behind it. */
  private updateFireballTrails(delta: number): void {
    this.projTrailAccum += delta;
    if (this.projTrailAccum < 45) return;
    this.projTrailAccum = 0;
    for (const child of this.arena.projectiles.getChildren()) {
      const proj = child as Projectile;
      if (!proj.active || proj.texture?.key !== 'proj-fire') continue;
      const fx = proj.isFromPlayer ? this.pfx : this.nfx;
      const body = proj.body as Phaser.Physics.Arcade.Body | null;
      // Trail streams out of the back of the shot rather than puffing symmetrically.
      const back = body ? Math.atan2(-body.velocity.y, -body.velocity.x) : 0;
      fx.embers(proj.x, proj.y, 2, { angle: back, spread: 0.45, speed: 40, size: 2.8, life: 300, rise: 8, depth: 4 });
    }
  }

  handleInput(time: number, delta: number, pointer: Phaser.Input.Pointer, mouseX: number, mouseY: number): void {
    const { player, scene, eKey, fKey, rKey, qKey, nukeChanneling } = this.arena;
    const playerCtx = this.arena.buildPlayerContext(mouseX, mouseY);
    // Whichever slot the player bound Heatwave onto replaces that slot's normal ability.
    const hwSlot = this.arena.masteryActive ? this.heatwaveSlot() : null;
    // Cached for the avatar rig, which runs in update() and has no pointer of its own.
    this.aimX = mouseX;
    this.aimY = mouseY;
    const aimAngle = Math.atan2(mouseY - player.y, mouseX - player.x);

    if (!nukeChanneling) {
      // ── Supernova: while the beam is open, Q closes it and nothing else answers ──
      if (this.playerNova) {
        if (Phaser.Input.Keyboard.JustDown(qKey)) {
          this.stopNova('player');
          this.arena.broadcastMasteryCast('fire-nova-stop');
        }
        this.playerAvatar?.setHold('spray', this.playerNova.angle);
        this.firePointerWasDown = pointer.isDown;
        return;
      }

      // ── Click: Fireball / Flamethrower ────────────────────────────
      // Blaze drops the hold, Melt drops the tap; both together drop the click entirely.
      const blaze = this.arena.hasPerk('player', 'fire-blaze');
      const melt = this.arena.hasPerk('player', 'fire-melt');
      // Alcohol: a drink too many and the hands wander.
      const sprayAngle = aimAngle + this.aimJitter(player);
      if (pointer.isDown && !(blaze && melt)) {
        const justPressed = !this.firePointerWasDown;
        this.flamethrowerHoldMs += delta;
        if (justPressed && !melt) {
          // Arms jab first so the throw reads as coming out of a hand.
          if (player.castAbility('fireball', playerCtx)) this.playerAvatar?.play('punch', aimAngle);
        } else if (!blaze && (melt || this.flamethrowerHoldMs > 120)) {
          this.playerAvatar?.setHold('spray', sprayAngle);
          const range = melt ? MELT_RANGE : 180;
          this.flamethrowerTickAccum += delta;
          if (this.flamethrowerTickAccum >= 100) {
            this.flamethrowerTickAccum -= 100;
            const dirX = Math.cos(sprayAngle);
            const dirY = Math.sin(sprayAngle);
            for (const t of this.arena.enemies) {
              if (!t.active || t.hp <= 0) continue;
              const dist = Phaser.Math.Distance.Between(player.x, player.y, t.x, t.y);
              if (dist <= range) {
                const dot = dirX * ((t.x - player.x) / dist) + dirY * ((t.y - player.y) / dist);
                if (dot > 0.866) {
                  const ftDmg = this.enhancedFlameBody ? 8 : 4;
                  t.takeDamage(ftDmg);
                  this.arena.spawnHitFlash(t.x, t.y, this.arena.fireColor('player', 0xff5500));
                  if (this.arena.hasUpgrade('click')) {
                    const wasBurning = t.burningUntil > time;
                    t.burningUntil = Math.max(t.burningUntil, time + Math.round(3000 * t.statusDurMult));
                    if (!wasBurning) this.arena.recordMasteryStat('clickIgnites', 1);
                  }
                }
              }
            }
            this.pfx.flameJet(player.x, player.y, sprayAngle, (this.enhancedFlameBody ? 190 : 160) * (melt ? MELT_RANGE / 180 : 1));
          }
          // Melt: the spray leaves burning slag where it lands.
          if (melt) {
            this.meltPoolAccum += delta;
            if (this.meltPoolAccum >= MELT_POOL_EVERY_MS) {
              this.meltPoolAccum = 0;
              const reach = Math.min(range * 0.85, Phaser.Math.Distance.Between(player.x, player.y, mouseX, mouseY));
              this.dropMeltPool('player', player.x + Math.cos(sprayAngle) * reach, player.y + Math.sin(sprayAngle) * reach);
            }
          }
        }
      } else {
        this.flamethrowerHoldMs = 0;
        this.flamethrowerTickAccum = 0;
        this.meltPoolAccum = MELT_POOL_EVERY_MS;
        this.playerAvatar?.setHold(null);
      }

      // ── E: Flame Dash ─────────────────────────────────────────────
      const eJustDown = Phaser.Input.Keyboard.JustDown(eKey);

      if (hwSlot === 'e') {
        if (eJustDown) this.tryCastHeatwave(time, mouseX, mouseY);
      } else if (eJustDown) {
        const dashStartX = player.x;
        const dashStartY = player.y;
        const dashed = player.castAbility('flame-dash', playerCtx);
        if (dashed) this.playerAvatar?.play('dash', aimAngle);
        // Propulsion (E+): explosions sampled along the dash — unless Alcohol has swapped every
        // explosion on the dash for booze.
        if (dashed && this.arena.hasUpgrade('e') && !this.arena.hasPerk('player', 'fire-alcohol')) {
          for (let i = 1; i <= 4; i++) {
            scene.time.delayedCall(i * 70, () => {
              if (!player.active) return;
              const t = i / 4;
              const ex = dashStartX + (player.x - dashStartX) * t;
              const ey = dashStartY + (player.y - dashStartY) * t;
              for (const enemy of this.arena.enemies) {
                if (!enemy.active || enemy.hp <= 0) continue;
                if (Phaser.Math.Distance.Between(ex, ey, enemy.x, enemy.y) <= 50) {
                  enemy.takeDamage(this.scaled('player', Phaser.Math.Between(5, 8)));
                  this.arena.spawnHitFlash(enemy.x, enemy.y, this.pcol(FIRE.orange));
                }
              }
              this.pfx.explosion(ex, ey, 50, { shards: 6, smoke: 0, scorch: false, duration: 300, depth: 4 });
            });
          }
        }
      }

      // ── R: Pressure Bomb (Cluster Bomb with R+) ───────────────────
      // The upgrade changes what the charge does when it goes off, not how it is thrown,
      // so both paths are one cast — everything else happens on the fuse in update().
      if (Phaser.Input.Keyboard.JustDown(rKey)) {
        if (hwSlot === 'r') {
          this.tryCastHeatwave(time, mouseX, mouseY);
        } else if (player.castAbility('pressure-bomb', playerCtx)) {
          this.playerAvatar?.play('slam', aimAngle);
        }
      }

      // ── F: Flame Body / Flame Affinity upgrade ────────────────────
      if (Phaser.Input.Keyboard.JustDown(fKey)) {
        if (hwSlot === 'f') {
          this.tryCastHeatwave(time, mouseX, mouseY);
        } else if (this.arena.hasUpgrade('f')) {
          // Flame Affinity: toggle with enhanced effects
          this.flameBodyActive = !this.flameBodyActive;
          this.enhancedFlameBody = this.flameBodyActive;
          this.flameBodyTickAccum = 0;
          player.incomingDamageMultiplier = this.flameBodyActive ? 2 : 1;
          if (this.flameBodyActive) { player.cardOutgoingDamageMult *= 2; } else { player.cardOutgoingDamageMult /= 2; }
          this.setFlameBodyWreath(this.flameBodyActive, 44, 1.35);
        } else {
          // Base: original toggle
          this.flameBodyActive = !this.flameBodyActive;
          this.enhancedFlameBody = false;
          this.flameBodyTickAccum = 0;
          this.setFlameBodyWreath(this.flameBodyActive, 34, 1);
        }
      }

      // ── Q: Flame Nuke / Flame Charge upgrade ──────────────────────
      if (Phaser.Input.Keyboard.JustDown(qKey)) {
        if (hwSlot === 'q') {
          this.tryCastHeatwave(time, mouseX, mouseY);
        } else if (this.hasSupernova(player)) {
          // Alternate ultimate: Flame Nuke (and its Q+ Flame Charge) is not on this body at all.
          if (player.castAbility('supernova', playerCtx)) this.playerAvatar?.play('raise', aimAngle, 300);
        } else if (this.arena.hasUpgrade('q') && (this.flameBodyActive || this.enhancedFlameBody) && player.getCooldownRatio('flame-nuke') >= 1) {
          if (!this.flameChargeWaiting && !this.flameChargePending) {
            this.flameChargeWaiting = true;
            this.flameChargeWaitingSince = time;
            player.triggerCooldown('flame-nuke');
            this.arena.lockCaster(1000);
            this.playerAvatar?.play('raise', aimAngle, 1000);
            if (this.flameChargeWaitVisual) this.flameChargeWaitVisual.destroy();
            this.flameChargeWaitVisual = scene.add.circle(player.x, player.y, 20, this.pcol(FIRE.amber), 0.5).setDepth(6);
            scene.tweens.add({ targets: this.flameChargeWaitVisual, alpha: 0.1, yoyo: true, repeat: -1, duration: 200 });
            // The caster is locked in place, so the gather tracks them only for safety.
            this.pfx.channelCharge(player.x, player.y, 70, 1000, () => player.active ? { x: player.x, y: player.y } : null);
            this.arena.showFloatingText(player.x, player.y - 28, '🔥 Channeling...', '#ff8800');
          }
        } else if (!this.arena.hasUpgrade('q') || !(this.flameBodyActive || this.enhancedFlameBody)) {
          if (player.castAbility('flame-nuke', this.arena.buildPlayerContext(player.x, player.y))) {
            this.playerAvatar?.play('raise', aimAngle, 2000);
          }
        }
      }

    }

    this.firePointerWasDown = pointer.isDown;
  }

  /** The ability slot Heatwave is bound over this match, or null if it isn't bound anywhere. */
  private heatwaveSlot(): string | null {
    for (const slot of ['e', 'r', 'f', 'q']) {
      if (this.arena.masteryBindFor(slot) === 'heatwave') return slot;
    }
    return null;
  }

  /**
   * Raise or drop the Flame Body wreath. Toggling it on throws a burst of flame outward so the
   * transformation lands with some weight instead of a circle blinking into existence.
   */
  private setFlameBodyWreath(on: boolean, radius: number, intensity: number): void {
    const { player, scene } = this.arena;
    if (this.flameBodyWreath) { this.flameBodyWreath.destroy(); this.flameBodyWreath = null; }
    if (!on) return;
    this.flameBodyWreath = new FireWreath(scene, this.pcol, radius, intensity, 3);
    this.playerAvatar?.play('flex');
    this.pfx.bloom(player.x, player.y, radius * 2.1, 12);
    this.pfx.ring(player.x, player.y, 10, radius * 2.4, FIRE.pale, 380, 5, 4);
  }

  private tryCastHeatwave(time: number, mouseX: number, mouseY: number): void {
    if (time - this.heatwaveLastCastAt < HEATWAVE_COOLDOWN_MS) return;
    this.heatwaveLastCastAt = time;
    this.playerAvatar?.play('sweep', Math.atan2(mouseY - this.arena.player.y, mouseX - this.arena.player.x));
    this.castHeatwave(mouseX, mouseY, 'player');
    // Online: replay on the opponent's sim so their (locally-owned) fighter is Exposed.
    this.arena.broadcastMasteryCast('heatwave');
  }

  /** Online replay: the remote fire player cast Heatwave — send a wave from the npc replica. */
  doNpcHeatwave(tx: number, ty: number): void {
    const { npc } = this.arena;
    this.npcAvatar?.play('sweep', Math.atan2(ty - npc.y, tx - npc.x));
    this.castHeatwave(tx, ty, 'npc');
  }

  /** 0–1 cooldown fill for the Heatwave HUD card. */
  getHeatwaveCooldownRatio(time: number): number {
    return Math.min(1, (time - this.heatwaveLastCastAt) / HEATWAVE_COOLDOWN_MS);
  }

  /** Fire Mastery — Heatwave: a piercing yellow rectangle that deals no damage but Exposes everything it passes through. */
  private castHeatwave(aimX: number, aimY: number, owner: 'player' | 'npc'): void {
    const { player, npc, scene } = this.arena;
    const origin = owner === 'player' ? player : npc;
    const angle = Math.atan2(aimY - origin.y, aimX - origin.x);
    const col = owner === 'player' ? this.pcol : this.ncol;
    const fx = owner === 'player' ? this.pfx : this.nfx;

    // Three stacked bands — a wide soft haze, the yellow body, and a thin white-hot spine.
    const bands: { t: number; w: number; c: number; a: number }[] = [
      { t: 2.1, w: 1.25, c: FIRE.gold, a: 0.22 },
      { t: 1.0, w: 1.0, c: FIRE.yellow, a: 0.55 },
      { t: 0.35, w: 0.6, c: FIRE.white, a: 0.75 },
    ];
    const rects = bands.map(b => {
      const r = scene.add.rectangle(
        origin.x, origin.y,
        HEATWAVE_HALF_THICKNESS * 2 * b.t, HEATWAVE_HALF_WIDTH * 2 * b.w,
        col(b.c), b.a,
      ).setDepth(6);
      r.setRotation(angle);
      return r;
    });
    rects[1].setStrokeStyle(2, col(FIRE.pale), 0.9);

    this.heatwaves.push({
      rects,
      x: origin.x, y: origin.y,
      cos: Math.cos(angle), sin: Math.sin(angle),
      travelled: 0,
      hit: new Set(),
      owner,
    });

    fx.bloom(origin.x, origin.y, 60, 8);
    this.arena.showFloatingText(origin.x, origin.y - 28, '☀️ Heatwave!', '#ffdd33');
  }

  /** Advances every live Heatwave and Exposes any enemy inside its rectangle. Pierces — no despawn on hit. */
  private updateHeatwaves(time: number, delta: number): void {
    const step = HEATWAVE_SPEED * (delta / 1000);

    for (let i = this.heatwaves.length - 1; i >= 0; i--) {
      const w = this.heatwaves[i];
      w.x += w.cos * step;
      w.y += w.sin * step;
      w.travelled += step;
      // Bands shimmer out of phase with each other and fade as the wave loses heat.
      const fade = 1 - Math.pow(w.travelled / HEATWAVE_RANGE, 2);
      for (let b = 0; b < w.rects.length; b++) {
        const r = w.rects[b];
        r.setPosition(w.x, w.y);
        r.setScale(1, 1 + Math.sin(time / 55 + b * 1.9) * 0.09);
        r.setAlpha(fade);
      }

      const targets = w.owner === 'npc' ? [this.arena.player] : this.arena.enemies;
      for (const t of targets) {
        if (!t.active || t.hp <= 0 || w.hit.has(t)) continue;
        const dx = t.x - w.x;
        const dy = t.y - w.y;
        // Project into the wave's local frame: `along` is travel axis, `perp` is its width.
        const along = dx * w.cos + dy * w.sin;
        const perp = -dx * w.sin + dy * w.cos;
        if (Math.abs(along) > HEATWAVE_HALF_THICKNESS + HEATWAVE_HIT_PAD) continue;
        if (Math.abs(perp) > HEATWAVE_HALF_WIDTH + HEATWAVE_HIT_PAD) continue;

        w.hit.add(t);
        this.applyExposed(t, time);
      }

      if (w.travelled >= HEATWAVE_RANGE) {
        for (const r of w.rects) r.destroy();
        this.heatwaves.splice(i, 1);
      }
    }
  }

  private applyExposed(t: Fighter, time: number): void {
    t.exposedUntil = Math.max(t.exposedUntil, time + Math.round(EXPOSED_DURATION_MS * t.statusDurMult));
    // Sun-flare snap on the moment of exposure.
    this.pfx.ring(t.x, t.y, 6, 46, FIRE.pale, 340, 4, 7);
    this.pfx.embers(t.x, t.y, 5, { speed: 80, size: 2.4, life: 420, depth: 7 });
    this.arena.showFloatingText(t.x, t.y - 34, '☀️ Exposed!', '#ffdd33');
  }

  /**
   * The Exposed mark: a little sun seal hung over the target — a gold disc with a hot heart,
   * ringed by slowly turning rays, the whole thing quickening as the window runs out.
   * `left` is seconds remaining.
   */
  private paintSunSeal(g: Phaser.GameObjects.Graphics, x: number, y: number, left: number): void {
    const c = this.pcol;
    const urgent = left < 1.2;
    const pulse = 0.5 + 0.5 * Math.sin(this.hudT * (urgent ? 16 : 5));
    const bob = Math.sin(this.hudT * 3) * 1.2;
    y += bob;
    // Heat halo behind it so it reads over any floor.
    g.fillStyle(c(FIRE.gold), 0.16 + 0.1 * pulse);
    g.fillCircle(x, y, 15);
    // Twelve rays, long and short alternating, rotating.
    const spin = this.hudT * 0.9;
    for (let i = 0; i < 12; i++) {
      const a = spin + (i / 12) * Math.PI * 2;
      const long = i % 2 === 0;
      const r0 = 7.5, r1 = long ? 13.5 + pulse * 1.5 : 10.5;
      const w = long ? 0.2 : 0.14;
      g.fillStyle(c(long ? FIRE.amber : FIRE.yellow), 0.9);
      g.fillTriangle(
        x + Math.cos(a - w) * r0, y + Math.sin(a - w) * r0,
        x + Math.cos(a + w) * r0, y + Math.sin(a + w) * r0,
        x + Math.cos(a) * r1, y + Math.sin(a) * r1,
      );
    }
    // The disc: dark rim, gold body, pale heart offset up-left like a lit sphere.
    g.fillStyle(c(FIRE.deep), 0.95);
    g.fillCircle(x, y, 7.6);
    g.fillStyle(c(FIRE.gold), 1);
    g.fillCircle(x, y, 6.4);
    g.fillStyle(c(FIRE.yellow), 1);
    g.fillCircle(x - 0.8, y - 0.8, 4.4);
    g.fillStyle(c(FIRE.pale), 0.9);
    g.fillCircle(x - 1.8, y - 1.8, 2);
    // Countdown arc on the rim — the window draining as a sweep, not a number.
    const frac = Phaser.Math.Clamp(left / (EXPOSED_DURATION_MS / 1000), 0, 1);
    g.lineStyle(1.6, c(FIRE.white), 0.55 + 0.4 * pulse);
    g.beginPath();
    g.arc(x, y, 9.4, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2, false);
    g.strokePath();
  }

  /**
   * Per-frame upkeep for the Heatwave debuff chain: the sun icon over exposed targets,
   * the burn → molten upgrade, and the molten DOT tick.
   */
  private updateExposedAndMolten(time: number, delta: number): void {
    const { scene } = this.arena;

    // Player is included because an online opponent's Heatwave Exposes our own fighter.
    for (const t of [this.arena.player, ...this.arena.enemies]) {
      if (!t.active) continue;

      // Exposed icon — a drawn sun seal; the old emoji text is only ever cleaned up now.
      if (t.exposedUntil > time) {
        if (this.hudG && t.alpha > 0.05) this.paintSunSeal(this.hudG, t.x, t.y - 40, (t.exposedUntil - time) / 1000);
      } else if (t.exposedIcon) {
        t.exposedIcon.destroy();
        t.exposedIcon = null;
      }

      // Igniting an exposed target burns molten instead of normal. The grace window catches
      // the common case where the same hit both consumed exposed and applied the burn.
      const justConsumed = t.exposedConsumedAt > 0 && time - t.exposedConsumedAt <= 200;
      if (t.burningUntil > time && (t.exposedUntil > time || justConsumed)) {
        t.moltenUntil = Math.max(t.moltenUntil, t.burningUntil);
        t.burningUntil = 0;
        t.burnTickAccum = 0;
        if (t.burnAura) { t.burnAura.destroy(); t.burnAura = null; }
        t.exposedUntil = 0;
        t.exposedConsumedAt = 0;
        if (t.exposedIcon) { t.exposedIcon.destroy(); t.exposedIcon = null; }
        this.arena.showFloatingText(t.x, t.y - 34, '🌋 Molten!', '#ff9900');
      }

      // Molten DOT
      if (t.moltenUntil > time) {
        if (!t.moltenAura) {
          t.moltenAura = scene.add.circle(t.x, t.y, 28, 0xff9900, 0.38).setDepth(7);
        }
        t.moltenAura.setPosition(t.x, t.y);
        // Molten targets steam constantly, not just on the tick, so the debuff reads at a glance.
        t.moltenAura.setScale(1 + Math.sin(time / 90) * 0.08);
        t.moltenTickAccum += delta;
        if (t.moltenTickAccum >= 1000) {
          t.moltenTickAccum -= 1000;
          t.takeDamage(Math.round(MOLTEN_DAMAGE_PER_SEC * t.statusDmgMult), { fireDot: true });
          this.arena.spawnHitFlash(t.x, t.y, 0xff9900);
        }
        this.moltenDripAccum += delta;
        if (this.moltenDripAccum >= 140) {
          this.moltenDripAccum = 0;
          this.pfx.embers(t.x + (Math.random() - 0.5) * 24, t.y + 8, 1, { speed: 12, size: 3, life: 620, rise: -18, depth: 6 });
        }
      } else {
        t.moltenTickAccum = 0;
        if (t.moltenAura) { t.moltenAura.destroy(); t.moltenAura = null; }
      }
    }
  }

  handleNpcCastId(npcCastId: string | null, time: number): void {
    const { player, npc, scene } = this.arena;
    if (!npcCastId) return;

    // Flame body toggle for NPC
    if (npcCastId === 'flame-body') {
      this.npcFlameBodyActive = !this.npcFlameBodyActive;
      this.npcFlameBodyTickAccum = 0;
      if (this.npcFlameBodyWreath) { this.npcFlameBodyWreath.destroy(); this.npcFlameBodyWreath = null; }
      if (this.npcFlameBodyActive) {
        this.npcFlameBodyWreath = new FireWreath(scene, this.ncol, 34, 1, 3);
        this.nfx.bloom(npc.x, npc.y, 70, 12);
      }
    }

    // Mirror the player's cast gestures on the opponent's rig.
    const gesture = NPC_GESTURES[npcCastId];
    if (gesture) {
      this.npcAvatar?.play(
        gesture,
        Math.atan2(player.y - npc.y, player.x - npc.x),
        npcCastId === 'flame-nuke' ? 2000 : undefined,
      );
    }

    void time;
  }

  // ── Perk plumbing ─────────────────────────────────────────────────────

  private fighterOf(owner: 'player' | 'npc'): Fighter {
    return owner === 'player' ? this.arena.player : this.arena.npc;
  }

  /** Who a fire effect owned by `owner` is allowed to hurt. */
  private victimsOf(owner: 'player' | 'npc'): Fighter[] {
    return owner === 'player' ? this.arena.enemies : [this.arena.player];
  }

  /** Blaze + Melt together: no click at all, in exchange for a faster, harder-hitting kit. */
  private hasInferno(owner: 'player' | 'npc'): boolean {
    return this.arena.hasPerk(owner, 'fire-blaze') && this.arena.hasPerk(owner, 'fire-melt');
  }

  /** Outgoing damage factor fire's abilities use for this owner (CastContext.fireDamageMult). */
  damageMult(owner: 'player' | 'npc'): number {
    return this.hasInferno(owner) ? 1.5 : 1;
  }

  private scaled(owner: 'player' | 'npc', base: number): number {
    return Math.round(base * this.damageMult(owner));
  }

  /** True when this body carries Supernova in its Q slot instead of Flame Nuke. */
  private hasSupernova(f: Fighter): boolean {
    return f.element.abilities.some((a) => a.id === 'supernova');
  }

  /**
   * Alcohol's drift as an aim error in radians — 0 for a sober fighter. Read off the same
   * aimOffsetBonus fields every other "your aim is off" effect uses, so the status tray and the
   * bots' own aim already understand it.
   */
  private aimJitter(f: Fighter): number {
    if (this.arena.scene.time.now >= f.aimOffsetBonusUntil || f.aimOffsetBonusDeg <= 0) return 0;
    return (Math.random() * 2 - 1) * f.aimOffsetBonusDeg * (Math.PI / 180);
  }

  /** CastContext.fireAimJitter — only the owning sim jitters, so a relayed cast never jitters twice. */
  castAimJitter(owner: 'player' | 'npc'): number {
    if (owner === 'npc') return 0;   // the bot's aim already folds the drift in; a replica's aim is relayed
    return this.aimJitter(this.arena.player);
  }

  /**
   * Blaze + Melt halve every cooldown and Alcohol's resistance — written onto the fighters
   * every frame by their owning side, and handed back the frame that side stops being fire.
   */
  private updatePerkMults(isPlayerFire: boolean, isNpcFire: boolean): void {
    const time = this.arena.scene.time.now;
    const sides: Array<['player' | 'npc', boolean]> = [['player', isPlayerFire], ['npc', isNpcFire]];
    for (const [owner, isFire] of sides) {
      const f = this.fighterOf(owner);
      if (!f) continue;
      if (!isFire) {
        if (this.perkMultsWritten.has(f)) {
          f.perkCooldownMult = 1;
          f.perkIncomingMult = 1;
          this.perkMultsWritten.delete(f);
        }
        continue;
      }
      this.perkMultsWritten.add(f);
      f.perkCooldownMult = this.hasInferno(owner) ? 0.5 : 1;
      const inBooze = this.arena.hasPerk(owner, 'fire-alcohol') && this.boozePuddles.some((p) =>
        p.owner === owner && time < p.expiresAt && Phaser.Math.Distance.Between(p.x, p.y, f.x, f.y) <= p.radius);
      f.perkIncomingMult = inBooze ? BOOZE_RESIST : 1;
    }
    if (isPlayerFire && this.arena.player) {
      const p = this.arena.player;
      this.arena.setStatusIndicator('fire-inferno', this.hasInferno('player') ? {
        name: 'Inferno', emoji: '🔥', color: 0xff5500, priority: 117,
        description: 'Blaze + Melt: no click at all, but every ability recharges twice as fast and hits 50% harder.',
      } : null);
      this.arena.setStatusIndicator('fire-booze', p.perkIncomingMult < 1 ? {
        name: 'Liquid Courage', emoji: '🍺', color: 0xc97a3a, priority: 116,
        description: 'Standing in your own booze: 20% less damage taken. Stay more than 2 seconds and your aim starts to drift.',
      } : null);
    }
  }

  // ── Blaze: the fireball's on-hit side ─────────────────────────────────

  /**
   * Called for every fireball that lands (either side's). Returns the damage it should deal and
   * applies its burn: Blaze hits burning targets 50% harder, and with Flameshredder (Click+) a
   * Blaze fireball ignites molten fire instead of a normal burn.
   */
  onFireballHit(proj: Projectile, target: Fighter, damage: number, clickUpgrade: boolean): number {
    const time = this.arena.scene.time.now;
    const blaze = !!(proj as Projectile & { fireBlaze?: boolean }).fireBlaze;
    const alight = target.burningUntil > time || target.moltenUntil > time
      || (target === this.arena.player && this.arena.playerBurning);
    const out = blaze && alight ? Math.round(damage * 1.5) : damage;
    if (clickUpgrade) {
      const until = time + Math.round(3000 * target.statusDurMult);
      if (blaze) {
        target.moltenUntil = Math.max(target.moltenUntil, until);
      } else {
        target.burningUntil = Math.max(target.burningUntil, until);
      }
    }
    if (blaze && alight) {
      (proj.isFromPlayer ? this.pfx : this.nfx).embers(target.x, target.y, 5, { speed: 150, size: 3, life: 380 });
    }
    return out;
  }

  // ── Melt: flame pools ─────────────────────────────────────────────────

  private dropMeltPool(owner: 'player' | 'npc', x: number, y: number): void {
    const mine = this.flamePools.filter((p) => p.owner === owner && p.radius === MELT_POOL_RADIUS);
    if (mine.length >= MELT_POOL_CAP) this.flamePools.splice(this.flamePools.indexOf(mine[0]), 1);
    this.spawnFlamePool(owner, x, y, MELT_POOL_RADIUS, MELT_POOL_LIFE_MS, this.scaled(owner, 2));
  }

  private spawnFlamePool(owner: 'player' | 'npc', x: number, y: number, radius: number, lifeMs: number, damage: number): void {
    const time = this.arena.scene.time.now;
    const pad = 16;
    x = Phaser.Math.Clamp(x, pad, this.arena.width - pad);
    y = Phaser.Math.Clamp(y, pad, this.arena.height - pad);
    this.flamePools.push({
      x, y, radius, bornAt: time, expiresAt: time + lifeMs, tickAccum: 0, damage, owner,
      seed: Math.random() * 100,
    });
  }

  /**
   * A bot with Melt has no hold to spray with, so each "click" is a short gout instead: a cone
   * puff that drops one pool where it lands. Owner-agnostic, but only bots ever reach it.
   */
  doMeltPuff(owner: 'player' | 'npc', tx: number, ty: number): void {
    const caster = this.fighterOf(owner);
    if (!caster?.active) return;
    const time = this.arena.scene.time.now;
    const ang = Math.atan2(ty - caster.y, tx - caster.x);
    const cos = Math.cos(ang), sin = Math.sin(ang);
    for (const t of this.victimsOf(owner)) {
      if (!t?.active || t.hp <= 0) continue;
      const d = Phaser.Math.Distance.Between(caster.x, caster.y, t.x, t.y);
      if (d > MELT_RANGE || d === 0) continue;
      if (cos * ((t.x - caster.x) / d) + sin * ((t.y - caster.y) / d) <= 0.866) continue;
      t.takeDamage(this.scaled(owner, 8));
      t.burningUntil = Math.max(t.burningUntil, time + Math.round(2000 * t.statusDurMult));
      this.arena.spawnHitFlash(t.x, t.y, this.arena.fireColor(owner, 0xff5500));
    }
    const fx = owner === 'player' ? this.pfx : this.nfx;
    fx.flameJet(caster.x, caster.y, ang, 200);
    const reach = Math.min(MELT_RANGE * 0.85, Phaser.Math.Distance.Between(caster.x, caster.y, tx, ty));
    this.dropMeltPool(owner, caster.x + cos * reach, caster.y + sin * reach);
  }

  private updateFlamePools(time: number, delta: number): void {
    const g = this.groundG;
    for (let i = this.flamePools.length - 1; i >= 0; i--) {
      const p = this.flamePools[i];
      if (time >= p.expiresAt) { this.flamePools.splice(i, 1); continue; }
      if (g) this.paintFlamePool(g, p, time);
      p.tickAccum += delta;
      if (p.tickAccum < POOL_TICK_MS) continue;
      p.tickAccum -= POOL_TICK_MS;
      for (const v of this.victimsOf(p.owner)) {
        if (!v?.active || v.hp <= 0) continue;
        if (Phaser.Math.Distance.Between(p.x, p.y, v.x, v.y) > p.radius + 10) continue;
        v.takeDamage(p.damage, { source: p, sourceX: p.x, sourceY: p.y, fireDot: true });
        v.burningUntil = Math.max(v.burningUntil, time + Math.round(1500 * v.statusDurMult));
        this.arena.spawnHitFlash(v.x, v.y, 0xff6600);
      }
    }
  }

  /**
   * A pool of standing fire: a charred rim, a molten bed that cools to embers over its last
   * third, and a ring of flame tongues licking up out of it, each on its own flicker.
   */
  private paintFlamePool(g: Phaser.GameObjects.Graphics, p: FlamePool, time: number): void {
    const c = p.owner === 'player' ? this.pcol : this.ncol;
    const life = (p.expiresAt - time) / (p.expiresAt - p.bornAt);
    const grow = Math.min(1, (time - p.bornAt) / 160);
    const fade = Math.min(1, life * 3);
    const r = p.radius * grow;
    const t = time / 1000 + p.seed;
    // Scorched rim, then the bed.
    g.fillStyle(0x1a0804, 0.45 * fade);
    g.fillEllipse(p.x, p.y + 2, r * 2.15, r * 1.5);
    g.fillStyle(c(FIRE.ember), 0.75 * fade);
    g.fillEllipse(p.x, p.y, r * 1.9, r * 1.3);
    g.fillStyle(c(FIRE.core), 0.6 * fade);
    g.fillEllipse(p.x, p.y, r * 1.35, r * 0.9);
    g.fillStyle(c(FIRE.gold), (0.35 + 0.15 * Math.sin(t * 7)) * fade);
    g.fillEllipse(p.x - r * 0.1, p.y - r * 0.05, r * 0.7, r * 0.42);
    // Tongues: rising out of the bed, swaying, longest at the back so it reads as depth.
    const n = Math.max(4, Math.round(r / 6));
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2 + p.seed;
      const bx = p.x + Math.cos(a) * r * 0.55;
      const by = p.y + Math.sin(a) * r * 0.35;
      const flick = 0.6 + 0.4 * Math.sin(t * 9 + k * 2.3);
      const len = (6 + r * 0.45) * flick * fade;
      g.fillStyle(c(k % 2 ? FIRE.orange : FIRE.amber), 0.8 * fade);
      flameTongue(g, bx, by, -Math.PI / 2 + Math.sin(t * 3 + k) * 0.25, len, 3 + r * 0.06, Math.sin(t * 5 + k) * 3);
      g.fillStyle(c(FIRE.yellow), 0.7 * fade);
      flameTongue(g, bx, by, -Math.PI / 2, len * 0.5, 1.6 + r * 0.03, 0);
    }
  }

  // ── Radiate: the heat aura ────────────────────────────────────────────

  private updateRadiate(delta: number, isPlayerFire: boolean, isNpcFire: boolean): void {
    const sides: Array<['player' | 'npc', boolean]> = [['player', isPlayerFire], ['npc', isNpcFire]];
    for (const [owner, isFire] of sides) {
      if (!isFire || !this.arena.hasPerk(owner, 'fire-radiate')) continue;
      const f = this.fighterOf(owner);
      if (!f?.active || f.hp <= 0) continue;
      const hot = owner === 'player' && this.arena.masteryActive;
      if (this.hudG && f.alpha > 0.05) this.paintRadiate(this.hudG, owner, f.x, f.y, hot);
      const acc = (owner === 'player' ? this.radiateAccum : this.npcRadiateAccum) + delta;
      const ticks = Math.floor(acc / RADIATE_TICK_MS);
      if (owner === 'player') this.radiateAccum = acc - ticks * RADIATE_TICK_MS;
      else this.npcRadiateAccum = acc - ticks * RADIATE_TICK_MS;
      if (ticks === 0) continue;
      const fx = owner === 'player' ? this.pfx : this.nfx;
      for (const t of this.victimsOf(owner)) {
        if (!t?.active || t.hp <= 0) continue;
        if (Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y) > RADIATE_RADIUS) continue;
        t.takeDamage(this.scaled(owner, (hot ? 2 : 1) * ticks), { fireDot: true });
        fx.embers(t.x, t.y - 6, 1, { speed: 40, size: 2.2, life: 360, rise: 22 });
      }
    }
  }

  /**
   * Radiate's haze: a faint heat disc with a wavering rim that breathes, and motes of heat
   * drifting up through it. With mastery the rim runs hotter and doubles up.
   */
  private paintRadiate(g: Phaser.GameObjects.Graphics, owner: 'player' | 'npc', x: number, y: number, hot: boolean): void {
    const c = owner === 'player' ? this.pcol : this.ncol;
    const t = this.hudT;
    g.fillStyle(c(FIRE.amber), hot ? 0.09 : 0.06);
    g.fillCircle(x, y, RADIATE_RADIUS);
    const rims = hot ? 2 : 1;
    for (let k = 0; k < rims; k++) {
      const R = RADIATE_RADIUS - k * 9;
      g.lineStyle(k === 0 ? 2 : 1.4, c(k === 0 ? FIRE.gold : FIRE.red), hot ? 0.5 : 0.32);
      g.beginPath();
      for (let i = 0; i <= 48; i++) {
        const a = (i / 48) * Math.PI * 2;
        const w = Math.sin(a * 6 + t * (3 + k)) * 2.6 + Math.sin(a * 11 - t * 4.2) * 1.4;
        const px = x + Math.cos(a) * (R + w), py = y + Math.sin(a) * (R + w);
        if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
      }
      g.strokePath();
    }
    // Heat motes: rise from the floor of the aura and fade out near the top.
    for (let i = 0; i < 8; i++) {
      const ph = (t * 0.55 + i / 8) % 1;
      const a = i * 2.4;
      const mx = x + Math.cos(a) * RADIATE_RADIUS * 0.7 + Math.sin(t * 2 + i) * 4;
      const my = y + Math.sin(a) * RADIATE_RADIUS * 0.45 - ph * 34;
      g.fillStyle(c(i % 2 ? FIRE.yellow : FIRE.amber), 0.55 * (1 - ph));
      g.fillCircle(mx, my, 1.6 + (1 - ph) * 1.4);
    }
  }

  // ── Alcohol: the booze trail ──────────────────────────────────────────

  /** CastContext.fireBoozeTrail — Flame Dash's path, soaked in spirits. */
  layBoozeTrail(owner: 'player' | 'npc', x0: number, y0: number, x1: number, y1: number): void {
    const time = this.arena.scene.time.now;
    const pad = 20;
    for (let i = 0; i < BOOZE_PUDDLES; i++) {
      const t = i / (BOOZE_PUDDLES - 1);
      this.boozePuddles.push({
        x: Phaser.Math.Clamp(x0 + (x1 - x0) * t + (Math.random() - 0.5) * 10, pad, this.arena.width - pad),
        y: Phaser.Math.Clamp(y0 + (y1 - y0) * t + (Math.random() - 0.5) * 10, pad, this.arena.height - pad),
        radius: BOOZE_RADIUS * (0.85 + Math.random() * 0.3),
        bornAt: time + i * 50, expiresAt: time + BOOZE_LIFE_MS, ignited: false, tickAccum: 0, owner,
        seed: Math.random() * 100,
      });
    }
    const f = this.fighterOf(owner);
    if (f) this.arena.showFloatingText(x0, y0 - 24, '🍺 Splash!', '#c97a3a');
  }

  /** A blast from `owner` at (x, y) lights every puddle of their booze it reaches. */
  igniteBooze(owner: 'player' | 'npc', x: number, y: number, radius: number): void {
    const time = this.arena.scene.time.now;
    let lit = 0;
    for (const p of this.boozePuddles) {
      if (p.owner !== owner || p.ignited || time >= p.expiresAt) continue;
      if (Phaser.Math.Distance.Between(x, y, p.x, p.y) > radius + p.radius) continue;
      p.ignited = true;
      p.expiresAt = Math.min(p.expiresAt, time + BOOZE_BURN_LIFE_MS);
      p.tickAccum = BOOZE_BURN_TICK_MS;   // the first lick lands the moment it catches
      (owner === 'player' ? this.pfx : this.nfx).bloom(p.x, p.y, p.radius * 1.6, 8);
      lit++;
    }
    if (lit > 0) this.arena.showFloatingText(x, y - 40, '🔥 Booze ignited!', '#ff8833');
  }

  private updateBooze(time: number, delta: number): void {
    const g = this.groundG;
    const inside = new Set<Fighter>();
    for (let i = this.boozePuddles.length - 1; i >= 0; i--) {
      const p = this.boozePuddles[i];
      if (time >= p.expiresAt) { this.boozePuddles.splice(i, 1); continue; }
      if (time < p.bornAt) continue;
      if (g) this.paintBooze(g, p, time);
      // Anyone wading in it — owner and enemies alike — is drinking.
      for (const f of [this.arena.player, this.arena.npc, ...this.arena.enemies]) {
        if (!f?.active || f.hp <= 0) continue;
        if (Phaser.Math.Distance.Between(p.x, p.y, f.x, f.y) <= p.radius) inside.add(f);
      }
      if (!p.ignited) continue;
      p.tickAccum += delta;
      if (p.tickAccum < BOOZE_BURN_TICK_MS) continue;
      p.tickAccum -= BOOZE_BURN_TICK_MS;
      for (const v of this.victimsOf(p.owner)) {
        if (!v?.active || v.hp <= 0) continue;
        if (Phaser.Math.Distance.Between(p.x, p.y, v.x, v.y) > p.radius) continue;
        v.takeDamage(this.scaled(p.owner, BOOZE_BURN_DAMAGE), { source: p, sourceX: p.x, sourceY: p.y, fireDot: true });
        v.burningUntil = Math.max(v.burningUntil, time + Math.round(2000 * v.statusDurMult));
        this.arena.spawnHitFlash(v.x, v.y, 0xff6600);
      }
    }
    // The drift: continuous time inside, reset the moment they step out.
    for (const f of [...this.boozeWade.keys()]) if (!inside.has(f)) this.boozeWade.delete(f);
    for (const f of inside) {
      const was = this.boozeWade.get(f) ?? 0;
      const now = was + delta;
      this.boozeWade.set(f, now);
      if (now < BOOZE_DRIFT_AFTER_MS) continue;
      f.aimOffsetBonusDeg = Math.max(f.aimOffsetBonusUntil > time ? f.aimOffsetBonusDeg : 0, BOOZE_DRIFT_DEG);
      f.aimOffsetBonusUntil = Math.max(f.aimOffsetBonusUntil, time + 1500);
      if (was < BOOZE_DRIFT_AFTER_MS) this.arena.showFloatingText(f.x, f.y - 30, '🥴 Tipsy!', '#c97a3a');
    }
  }

  /**
   * A puddle of spirits: a glossy amber spill with a darker edge, slow ripples crossing it and a
   * highlight sliding over the surface. Once lit it burns blue at the base and orange above.
   */
  private paintBooze(g: Phaser.GameObjects.Graphics, p: BoozePuddle, time: number): void {
    const c = p.owner === 'player' ? this.pcol : this.ncol;
    const grow = Math.min(1, (time - p.bornAt) / 200);
    const fade = Math.min(1, (p.expiresAt - time) / 900);
    const r = p.radius * grow;
    const t = time / 1000 + p.seed;
    g.fillStyle(0x5a3510, 0.4 * fade);
    g.fillEllipse(p.x, p.y + 1, r * 2.1, r * 1.45);
    g.fillStyle(0xc97a3a, 0.45 * fade);
    g.fillEllipse(p.x, p.y, r * 1.9, r * 1.28);
    // Ripples spreading from the middle.
    for (let k = 0; k < 2; k++) {
      const ph = (t * 0.6 + k * 0.5) % 1;
      g.lineStyle(1.2, 0xffd9a0, 0.35 * (1 - ph) * fade);
      g.strokeEllipse(p.x, p.y, r * 1.8 * ph, r * 1.2 * ph);
    }
    // Sheen.
    g.fillStyle(0xfff0d0, 0.35 * fade);
    g.fillEllipse(p.x - r * 0.3 + Math.sin(t) * r * 0.15, p.y - r * 0.2, r * 0.55, r * 0.18);
    if (!p.ignited) return;
    // Burning: a blue alcohol flame hugging the surface, orange tongues above it.
    g.fillStyle(0x4466ff, (0.28 + 0.1 * Math.sin(t * 11)) * fade);
    g.fillEllipse(p.x, p.y, r * 1.7, r * 1.1);
    const n = Math.max(5, Math.round(r / 6));
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2 + p.seed;
      const bx = p.x + Math.cos(a) * r * 0.6;
      const by = p.y + Math.sin(a) * r * 0.4;
      const len = (8 + r * 0.5) * (0.55 + 0.45 * Math.sin(t * 10 + k * 1.7)) * fade;
      g.fillStyle(c(k % 2 ? FIRE.orange : FIRE.gold), 0.75 * fade);
      flameTongue(g, bx, by, -Math.PI / 2 + Math.sin(t * 4 + k) * 0.3, len, 3.2, Math.sin(t * 6 + k) * 3);
    }
  }

  /**
   * Bot synergy (Alcohol → Pressure Bomb): where to plant a charge so it lights the bot's own
   * booze with its target standing in it, or null. Side-effect-free.
   */
  npcBoozeBombTarget(): { x: number; y: number } | null {
    if (!this.arena.hasPerk('npc', 'fire-alcohol')) return null;
    const time = this.arena.scene.time.now;
    const target = this.arena.player;
    if (!target?.active) return null;
    for (const p of this.boozePuddles) {
      if (p.owner !== 'npc' || p.ignited || time >= p.expiresAt - 800) continue;
      if (Phaser.Math.Distance.Between(p.x, p.y, target.x, target.y) <= p.radius + 20) return { x: p.x, y: p.y };
    }
    return null;
  }

  // ── Supernova (alternate ultimate) ────────────────────────────────────

  /** CastContext.fireSupernova — open the beam. Cooldown was already stamped by castAbility. */
  startNova(owner: 'player' | 'npc', aimX: number, aimY: number): void {
    const f = this.fighterOf(owner);
    if (!f?.active) return;
    if (owner === 'player' ? this.playerNova : this.npcNova) return;
    const scene = this.arena.scene;
    const nova: Nova = {
      owner,
      angle: Math.atan2(aimY - f.y, aimX - f.x),
      startedAt: scene.time.now,
      pullX: aimX, pullY: aimY,
      tickAccum: 0, selfAccum: 0, netAccum: 0,
      g: scene.add.graphics().setDepth(6),
    };
    if (owner === 'player') this.playerNova = nova; else this.npcNova = nova;
    (f.body as Phaser.Physics.Arcade.Body | null)?.setVelocity(0, 0);
    const fx = owner === 'player' ? this.pfx : this.nfx;
    fx.bloom(f.x, f.y, 80, 12);
    fx.ring(f.x, f.y, 10, 90, FIRE.pale, 320, 5, 7);
    this.arena.showFloatingText(f.x, f.y - 46, '☄️ SUPERNOVA', '#ffcc44');
  }

  /** End a beam early (Q again, a bot bailing, a relayed stop, or its caster going down). */
  stopNova(owner: 'player' | 'npc'): void {
    const nova = owner === 'player' ? this.playerNova : this.npcNova;
    if (!nova) return;
    nova.g.destroy();
    if (owner === 'player') {
      this.playerNova = null;
      this.playerAvatar?.setHold(null);
      this.arena.setStatusIndicator('fire-supernova', null);
    } else {
      this.npcNova = null;
      this.npcAvatar?.setHold(null);
    }
  }

  /** Beam endpoints for this frame: palms → tip. */
  private novaSegment(nova: Nova, f: Fighter): { x0: number; y0: number; x1: number; y1: number } {
    const cos = Math.cos(nova.angle), sin = Math.sin(nova.angle);
    const x0 = f.x + cos * NOVA_PALM_OFFSET, y0 = f.y + sin * NOVA_PALM_OFFSET;
    return { x0, y0, x1: x0 + cos * NOVA_LENGTH, y1: y0 + sin * NOVA_LENGTH };
  }

  /** Distance from a point to the beam's centre line, and how far along it the point sits. */
  private beamLocal(nova: Nova, f: Fighter, x: number, y: number): { along: number; perp: number } {
    const seg = this.novaSegment(nova, f);
    const cos = Math.cos(nova.angle), sin = Math.sin(nova.angle);
    const dx = x - seg.x0, dy = y - seg.y0;
    return { along: dx * cos + dy * sin, perp: Math.abs(-dx * sin + dy * cos) };
  }

  private updateNova(nova: Nova | null, time: number, delta: number): void {
    if (!nova) return;
    const owner = nova.owner;
    const f = this.fighterOf(owner);
    // A felled, stunned or frozen caster lets go.
    if (!f?.active || f.hp <= 0 || f.stunnedUntil > time || f.frozenUntil > time) { this.stopNova(owner); return; }
    const isReplica = owner === 'npc' && this.arena.isOnline;

    // Where the beam is being pulled: the cursor, or the bot's quarry. A replica's pull point
    // arrives over the wire (fire-nova-aim).
    if (owner === 'player') { nova.pullX = this.aimX; nova.pullY = this.aimY; }
    else if (!isReplica) { nova.pullX = this.arena.player.x; nova.pullY = this.arena.player.y; }
    const want = Math.atan2(nova.pullY - f.y, nova.pullX - f.x);
    const diff = Phaser.Math.Angle.Wrap(want - nova.angle);
    const maxTurn = NOVA_TURN_RATE * (delta / 1000);
    nova.angle += Phaser.Math.Clamp(diff, -maxTurn, maxTurn);
    (f.body as Phaser.Physics.Arcade.Body | null)?.setVelocity(0, 0);

    const elapsed = time - nova.startedAt;
    const heat = Phaser.Math.Clamp(elapsed / NOVA_DURATION_MS, 0, 1);
    this.paintNova(nova, f, heat, time);
    (owner === 'player' ? this.playerAvatar : this.npcAvatar)?.setHold('spray', nova.angle);

    // Online: keep the peer's replica of the beam pointing where ours points.
    if (owner === 'player' && this.arena.isOnline) {
      nova.netAccum += delta;
      if (nova.netAccum >= NOVA_NET_AIM_MS) { nova.netAccum = 0; this.arena.broadcastMasteryCast('fire-nova-aim'); }
    }

    // Damage ticks.
    nova.tickAccum += delta;
    while (nova.tickAccum >= NOVA_TICK_MS) {
      nova.tickAccum -= NOVA_TICK_MS;
      for (const t of this.victimsOf(owner)) {
        if (!t?.active || t.hp <= 0) continue;
        const { along, perp } = this.beamLocal(nova, f, t.x, t.y);
        if (along < -NOVA_HIT_PAD || along > NOVA_LENGTH + NOVA_HIT_PAD) continue;
        if (perp > NOVA_HALF_WIDTH + NOVA_HIT_PAD) continue;
        t.takeDamage(this.scaled(owner, NOVA_TICK_DAMAGE));
        t.burningUntil = Math.max(t.burningUntil, time + Math.round(1500 * t.statusDurMult));
        this.arena.spawnHitFlash(t.x, t.y, this.arena.fireColor(owner, FIRE.amber));
      }
    }

    // The heat: self-burn climbs with the bar. The replica's body is owned by the other sim.
    if (!isReplica) {
      nova.selfAccum += NOVA_SELF_DPS_MAX * heat * (delta / 1000);
      if (nova.selfAccum >= 1) {
        const n = Math.floor(nova.selfAccum);
        nova.selfAccum -= n;
        f.applySelfDamage(n);
      }
    }
    if (owner === 'player') {
      this.arena.setStatusIndicator('fire-supernova', {
        name: 'Supernova', emoji: '☄️', color: 0xffaa22, priority: 119,
        description: `Rooted, beam open — heat ${Math.round(heat * 100)}%. Press Q to stop; hold to 6s and it detonates.`,
      });
    }
    // Bots let go before the heat kills them.
    if (owner === 'npc' && !isReplica && f.hp / f.maxHp < NOVA_BOT_BAIL_HP) { this.stopNova(owner); return; }

    if (elapsed >= NOVA_DURATION_MS) this.detonateNova(nova, f);
  }

  /** The full six seconds: the beam bursts along its whole length and leaves fire behind. */
  private detonateNova(nova: Nova, f: Fighter): void {
    const owner = nova.owner;
    const scene = this.arena.scene;
    const time = scene.time.now;
    const seg = this.novaSegment(nova, f);
    const fx = owner === 'player' ? this.pfx : this.nfx;
    const isReplica = owner === 'npc' && this.arena.isOnline;

    for (const t of this.victimsOf(owner)) {
      if (!t?.active || t.hp <= 0) continue;
      const { along, perp } = this.beamLocal(nova, f, t.x, t.y);
      if (along < -NOVA_BLAST_REACH || along > NOVA_LENGTH + NOVA_BLAST_REACH || perp > NOVA_BLAST_REACH) continue;
      t.takeDamage(this.scaled(owner, NOVA_BLAST_DAMAGE), { aoe: true });
      t.burningUntil = Math.max(t.burningUntil, time + Math.round(3000 * t.statusDurMult));
      this.arena.spawnHitFlash(t.x, t.y, this.arena.fireColor(owner, FIRE.orange));
    }
    // A chain of blasts racing out from the palms to the tip.
    const steps = 6;
    for (let i = 0; i <= steps; i++) {
      const k = i / steps;
      const ex = seg.x0 + (seg.x1 - seg.x0) * k, ey = seg.y0 + (seg.y1 - seg.y0) * k;
      scene.time.delayedCall(i * 55, () => fx.explosion(ex, ey, 58, { shards: 10, smoke: 2, duration: 420 }));
    }
    for (let i = 0; i < NOVA_POOLS; i++) {
      const k = (i + 0.5) / NOVA_POOLS;
      this.spawnFlamePool(owner, seg.x0 + (seg.x1 - seg.x0) * k, seg.y0 + (seg.y1 - seg.y0) * k, 46, 5000, this.scaled(owner, 5));
    }
    // Booze along the beam goes up with it.
    for (let i = 0; i <= 4; i++) {
      const k = i / 4;
      this.igniteBooze(owner, seg.x0 + (seg.x1 - seg.x0) * k, seg.y0 + (seg.y1 - seg.y0) * k, NOVA_BLAST_REACH);
    }
    fx.firePillar(seg.x1, seg.y1, 50, 180);
    fx.bloom(f.x, f.y, 110, 14);
    scene.cameras.main.shake(380, 0.012);
    scene.cameras.main.flash(140, 255, 200, 120);
    Sfx.playAt('explosion-large', f.x, { volume: 0.9 });
    if (!isReplica) {
      Fighter.asNonAllyDamage(() => f.takeDamage(NOVA_BLAST_SELF, { selfInflicted: true }));
      this.arena.showFloatingText(f.x, f.y - 40, '☄️ SUPERNOVA!', '#ffcc44');
    }
    this.stopNova(owner);
  }

  /**
   * The beam: four stacked bands from a wide red haze to a white-hot spine, each breathing at
   * its own rate, a corona at the palms, a splash where it ends, sparks peeling off its length —
   * and the heat bar hung over the caster, yellow running to red and flashing near the end.
   */
  private paintNova(nova: Nova, f: Fighter, heat: number, time: number): void {
    const g = nova.g;
    const c = nova.owner === 'player' ? this.pcol : this.ncol;
    const fx = nova.owner === 'player' ? this.pfx : this.nfx;
    const seg = this.novaSegment(nova, f);
    const t = time / 1000;
    g.clear();
    const swell = 1 + heat * 0.35;
    const bands: Array<[number, number, number]> = [
      [46, FIRE.deep, 0.2],
      [30, FIRE.orange, 0.5],
      [17, FIRE.yellow, 0.85],
      [6, FIRE.white, 0.95],
    ];
    bands.forEach(([w, col, a], i) => {
      const width = w * swell * (1 + Math.sin(t * (14 + i * 5) + i) * 0.08);
      g.lineStyle(width, c(col), a);
      g.lineBetween(seg.x0, seg.y0, seg.x1, seg.y1);
    });
    // Ripples travelling down the beam.
    const cos = Math.cos(nova.angle), sin = Math.sin(nova.angle);
    for (let k = 0; k < 6; k++) {
      const d = ((t * 620 + k * (NOVA_LENGTH / 6)) % NOVA_LENGTH);
      const px = seg.x0 + cos * d, py = seg.y0 + sin * d;
      g.fillStyle(c(FIRE.pale), 0.55);
      g.fillEllipse(px, py, 10 * swell, 26 * swell);
    }
    // Palm corona and tip splash.
    g.fillStyle(c(FIRE.gold), 0.5);
    g.fillCircle(seg.x0, seg.y0, 18 * swell + Math.sin(t * 20) * 2);
    g.fillStyle(c(FIRE.white), 0.9);
    g.fillCircle(seg.x0, seg.y0, 8 * swell);
    g.fillStyle(c(FIRE.amber), 0.45);
    g.fillCircle(seg.x1, seg.y1, 26 * swell + Math.sin(t * 17) * 4);
    g.fillStyle(c(FIRE.yellow), 0.6);
    g.fillCircle(seg.x1, seg.y1, 13 * swell);
    if (Math.random() < 0.35) {
      const d = Math.random() * NOVA_LENGTH;
      fx.embers(seg.x0 + cos * d, seg.y0 + sin * d, 1, { angle: nova.angle + (Math.random() < 0.5 ? 1.57 : -1.57), spread: 0.5, speed: 90, size: 2.6, life: 340, depth: 7 });
    }

    // Heat bar over the caster.
    const hud = this.hudG;
    if (!hud) return;
    const bw = 56, bh = 7, bx = f.x - bw / 2, by = f.y - 58;
    const hot = heat > 0.8 && Math.sin(t * 24) > 0;
    hud.fillStyle(0x000000, 0.6);
    hud.fillRoundedRect(bx - 2, by - 2, bw + 4, bh + 4, 3);
    const col = Phaser.Display.Color.Interpolate.ColorWithColor(
      Phaser.Display.Color.ValueToColor(c(FIRE.yellow)), Phaser.Display.Color.ValueToColor(c(FIRE.red)), 100, Math.round(heat * 100));
    hud.fillStyle(hot ? 0xffffff : Phaser.Display.Color.GetColor(col.r, col.g, col.b), 1);
    hud.fillRoundedRect(bx, by, Math.max(2, bw * heat), bh, 2);
    // Tick marks for each second, and a little flame riding the leading edge.
    hud.lineStyle(1, 0x000000, 0.5);
    for (let i = 1; i < 6; i++) hud.lineBetween(bx + (bw * i) / 6, by, bx + (bw * i) / 6, by + bh);
    hud.fillStyle(c(FIRE.amber), 0.95);
    flameTongue(hud, bx + bw * heat, by + 1, -Math.PI / 2, 9 + Math.sin(t * 18) * 2, 3, 0);
  }

  /**
   * Online replay of the peer's fire actions that bypass `castAbility` (pseudo-casts prefixed
   * `fire-`): where their beam is being pulled, and the press that closes it.
   */
  replayNet(id: string, tx: number, ty: number): void {
    if (id === 'fire-nova-aim' && this.npcNova) { this.npcNova.pullX = tx; this.npcNova.pullY = ty; }
    else if (id === 'fire-nova-stop') this.stopNova('npc');
  }

  // ── Pressure Bomb ───────────────────────────────────────────────────────

  /**
   * Plant a Pressure Bomb at the cursor. Called from the ability itself, so the NPC's charges
   * run the same fuse the player's do. Cluster Bomb (R+) turns the player's shells into
   * cluster shells, which split into bomblets when they go off.
   */
  lobPressureBomb(x: number, y: number, damage: number, owner: 'player' | 'npc'): void {
    const cluster = owner === 'player' && this.arena.hasUpgrade('r');
    const fx = owner === 'player' ? this.pfx : this.nfx;
    // Ash: a heavier charge over a wider blast that no longer cares who planted it.
    const ash = this.arena.hasPerk(owner, 'fire-ash');
    this.plantCharge(
      x, y, ash ? Math.round(damage * ASH_DAMAGE_MULT) : damage,
      Math.round(PRESSURE_RADIUS * (ash ? ASH_RANGE_MULT : 1)), PRESSURE_FUSE_MS, cluster, ash, owner, 1,
    );
    // The charge landing: a puff of embers where it comes to rest.
    fx.embers(x, y, 7, { speed: 95, size: 2.8, life: 420, rise: 12, depth: 4 });
  }

  private plantCharge(
    x: number, y: number, damage: number, radius: number, fuseMs: number,
    cluster: boolean, selfHarm: boolean, owner: 'player' | 'npc', markerScale: number,
  ): void {
    const marker = this.arena.scene.add.graphics().setDepth(3);
    this.pressureCharges.push({
      x, y, fireAt: this.arena.scene.time.now + fuseMs, fuseMs,
      damage, radius, cluster, selfHarm, owner, marker, markerScale,
    });
  }

  private updatePressureCharges(time: number): void {
    for (let i = this.pressureCharges.length - 1; i >= 0; i--) {
      const c = this.pressureCharges[i];
      if (time >= c.fireAt) {
        c.marker.destroy();
        this.pressureCharges.splice(i, 1);
        this.detonateCharge(c);
        continue;
      }
      const t = 1 - (c.fireAt - time) / c.fuseMs;
      bombMarker(c.marker, c.owner === 'player' ? this.pcol : this.ncol, c.x, c.y, t, c.markerScale);
    }
  }

  private detonateCharge(c: PressureCharge): void {
    const { scene } = this.arena;
    const fx = c.owner === 'player' ? this.pfx : this.nfx;
    const col = c.owner === 'player' ? this.pcol : this.ncol;

    if (c.owner === 'player') {
      this.arena.damagePlayerTargets(c.x, c.y, c.radius, c.damage, col(FIRE.amber));
    } else {
      const v = this.arena.player;
      if (v?.active && v.hp > 0 && Phaser.Math.Distance.Between(c.x, c.y, v.x, v.y) <= c.radius) {
        v.takeDamage(c.damage, { source: c, sourceX: c.x, sourceY: c.y });
        this.arena.spawnHitFlash(v.x, v.y, col(FIRE.amber));
      }
    }

    // Alcohol: the blast lights any of the thrower's spirits pooled inside it.
    this.igniteBooze(c.owner, c.x, c.y, c.radius);
    // Ash: the thrower is not exempt. Their own sim decides — a replica's body is the peer's.
    if (c.selfHarm && !(c.owner === 'npc' && this.arena.isOnline)) {
      const self = this.fighterOf(c.owner);
      if (self?.active && self.hp > 0 && Phaser.Math.Distance.Between(c.x, c.y, self.x, self.y) <= c.radius) {
        Fighter.asNonAllyDamage(() => self.takeDamage(Math.round(c.damage * ASH_SELF_SHARE), { selfInflicted: true }));
        this.arena.showFloatingText(self.x, self.y - 30, '🌫️ Caught in it!', '#bbaa99');
      }
    }

    const big = c.radius >= PRESSURE_RADIUS;
    fx.explosion(c.x, c.y, c.radius, {
      shards: big ? 16 : 9, smoke: big ? 3 : 1, duration: big ? 400 : 320,
    });
    scene.cameras.main.shake(big ? 150 : 90, big ? 0.005 : 0.002);
    Sfx.playAt(big ? 'explosion-medium' : 'explosion-small', c.x, {
      rate: big ? 1 : 1.2, volume: big ? 0.9 : 0.55,
    });

    if (c.cluster) this.scatterBomblets(c);
  }

  /** Cluster Bomb (R+): the shell breaks up and throws bomblets clear of its own crater. */
  private scatterBomblets(c: PressureCharge): void {
    const fx = c.owner === 'player' ? this.pfx : this.nfx;
    const pad = 24;
    for (let i = 0; i < CLUSTER_COUNT; i++) {
      // Evenly spaced around the crater with a little wobble, so the spread is reliable
      // to play around but never lands twice the same way.
      const ang = (i / CLUSTER_COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.7;
      const dist = CLUSTER_MIN_THROW + Math.random() * (CLUSTER_MAX_THROW - CLUSTER_MIN_THROW);
      const bx = Phaser.Math.Clamp(c.x + Math.cos(ang) * dist, pad, this.arena.width - pad);
      const by = Phaser.Math.Clamp(c.y + Math.sin(ang) * dist, pad, this.arena.height - pad);
      // The throw itself: a spray of embers out of the crater along each bomblet's line.
      fx.embers(c.x, c.y, 4, { angle: ang, spread: 0.22, speed: dist * 2.2, size: 2.6, life: 300, rise: 10, depth: 5 });
      // Ash: bigger, stronger bomblets that carry the same disregard for their thrower.
      this.plantCharge(bx, by,
        this.scaled(c.owner, Math.round(CLUSTER_DAMAGE * (c.selfHarm ? ASH_DAMAGE_MULT : 1))),
        Math.round(CLUSTER_RADIUS * (c.selfHarm ? ASH_RANGE_MULT : 1)),
        CLUSTER_FUSE_MS + i * CLUSTER_STAGGER_MS, false, c.selfHarm, c.owner, 0.72);
    }
    if (c.owner === 'player') this.arena.showFloatingText(c.x, c.y - 36, '💣 Cluster!', '#ff7733');
  }
}
