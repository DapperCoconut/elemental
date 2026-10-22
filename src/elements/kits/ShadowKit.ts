import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { CastContext } from '../Ability';
import {
  SHADOW, ShadowAvatar, ShadowColorFn, ShadowFx, ShadowShroud,
  shadowTendril, shadowTendrilLayered,
} from './ShadowVisuals';
import { BaseAvatar } from './ElementVisuals';
import { FONT_DISPLAY } from '../../ui/Theme';
import { makeSkinAvatar } from './skins/SkinAvatars';

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

/** Unmitigated damage the player must soak in one fight for the Unkillable achievement. */
const UNKILLABLE_DAMAGE = 400;

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

// ── Shadow Caltrops (Click) tuning ──────────────────────────────────────
const CALTROP_RANGE = 340;
const CALTROP_FLIGHT_MS = 300;
const CALTROP_LIFETIME_MS = 8000;
const CALTROP_DAMAGE = 5;
const CALTROP_HOPELESS = 10;
/** How close a foot has to come to a lying caltrop to tread on it. */
const CALTROP_TRIGGER_R = 22;
/** Oldest caltrop of a side is swept away past this many on the floor. */
const CALTROP_MAX = 18;
/** Click+ Crippling Spikes: slow per stack, the stack cap, and the refreshing timer. */
const CRIPPLE_PER_STACK = 0.12;
const CRIPPLE_MAX_STACKS = 5;
const CRIPPLE_MS = 3000;

// ── Shinobi perk tuning ─────────────────────────────────────────────────
/** Angular error on each of the two thrown caltrops, and how far short/long they may land. */
const SHINOBI_SPREAD = 0.24;
const SHINOBI_RANGE_JITTER = 30;
/** Caltrops a sprung shinobi trap throws out, and the ring they land in. */
const SHINOBI_BURST = 7;
const SHINOBI_BURST_MIN = 38;
const SHINOBI_BURST_MAX = 92;
const SHINOBI_SLOW_MULT = 0.5;
const SHINOBI_SLOW_MS = 3000;

// ── Venom perk tuning ───────────────────────────────────────────────────
const VENOM_DAMAGE = 15;
const VENOM_HOPELESS = 40;
const VENOM_DOT_PER_SEC = 3;
const VENOM_DOT_MS = 5000;

// ── Vantablack perk (claymore) tuning ───────────────────────────────────
/** Half-width of the line of sight, and how far down it the mine can see. */
const CLAYMORE_HALF_ANGLE = 0.42;
const CLAYMORE_SIGHT = 120;
/** The blast goes down the same cone, a little deeper than the mine can see. */
const CLAYMORE_BLAST = 140;
const CLAYMORE_DAMAGE = 30;
const CLAYMORE_HOPELESS = 10;

// ── Abyss perk tuning ───────────────────────────────────────────────────
const ABYSS_WALL_TENTACLES = 14;
const ABYSS_SPIKE_DAMAGE = 6;
const ABYSS_SHOVE = 20;
const ABYSS_TENTACLE_REACH = 170;
const ABYSS_TENTACLE_HOOK = 187;
const ABYSS_TENTACLE_HOLD_MS = 4500;

// ── Grim Gloom (alt Q) tuning ───────────────────────────────────────────
const GLOOM_DURATION_MS = 8000;
const GLOOM_HOPELESS_PER_SEC = 4;
/** A foe who keeps inside this circle for this long has lingered too long. */
const GLOOM_LINGER_RADIUS = 55;
const GLOOM_LINGER_MS = 1100;
/** One strike: warning crack, rise, lash, sink. The hit lands at GLOOM_STRIKE_HIT_AT of it. */
const GLOOM_STRIKE_MS = 900;
const GLOOM_STRIKE_HIT_AT = 0.4;
const GLOOM_STRIKE_RADIUS = 36;
const GLOOM_STRIKE_DAMAGE = 14;
const GLOOM_STRIKE_HOPELESS = 8;

// ── Death perk (trap menu) tuning ───────────────────────────────────────
/** Mine: the charge goes off in a circle rather than biting one victim. */
const MINE_DAMAGE = 35;
const MINE_RADIUS = 92;
const MINE_HOPELESS = 10;
/** Grabber: how long the tentacle keeps hold, and how far it lets its catch stray. */
const GRABBER_HOLD_MS = 5000;
const GRABBER_TETHER = 62;
const GRABBER_HOPELESS = 15;
/** Plume: pools thrown out when the trap bursts, and how wide they scatter. */
const PLUME_CLOUDS = 10;
const PLUME_SPREAD = 78;

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
 * model covers both shapes shadow lobs:
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
  mode: 'watcher' | 'shell';
  mark: Fighter | null;
}

/**
 * What a planted trap is. `base` is the jaws Shadow has always placed; every other kind comes
 * from a perk — Death's mine/grabber/plume, Venom, String's stake, Vantablack's claymore and
 * Shinobi's caltrop pouch. Which one R plants is `trapKindFor`'s call.
 */
type TrapKind = 'base' | 'mine' | 'grabber' | 'plume' | 'venom' | 'stake' | 'claymore' | 'shinobi';

/**
 * A caltrop in flight or lying on the floor. Every caltrop shares one Graphics per kit (they
 * are tiny and numerous), so this is pure state.
 */
interface Caltrop {
  x: number; y: number;
  fromX: number; fromY: number;
  toX: number; toY: number;
  spawnAt: number;
  landAt: number;
  expiresAt: number;
  owner: 'player' | 'npc';
  /** Resting angle once it lands; it tumbles through a few turns on the way. */
  spin: number;
  landed: boolean;
}

/** Grim Gloom: a tentacle erupting under a foe who lingered. */
interface GloomStrike {
  x: number; y: number;
  target: Fighter;
  spawnAt: number;
  hit: boolean;
  seed: number;
}

interface GrimGloom {
  owner: 'player' | 'npc';
  spawnAt: number;
  until: number;
  gfx: Phaser.GameObjects.Graphics;
  strikeGfx: Phaser.GameObjects.Graphics;
  /** Per foe: the spot they have been keeping to, and since when. */
  watch: Map<Fighter, { ax: number; ay: number; since: number }>;
  strikes: GloomStrike[];
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
  /** What this trap does when something steps on it. */
  kind: TrapKind;
  /** Vantablack claymore: the way it faces — its line of sight runs out from here. */
  facing?: number;
  /** Grabber: who the tentacle has hold of, and until when. */
  grabbed?: Fighter | null;
  grabUntil?: number;
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
  /** Abyss perk: the limbs are studded with spikes that cut and shove whoever touches them. */
  abyss: boolean;
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
  /** Online PvP: the opponent's slows on us arrive through the status mirror instead. */
  readonly isOnline: boolean;
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
  /** Skins: maps a shadow visual color through the owner's skin. */
  shadowColor(owner: 'player' | 'npc', base: number): number;
  /** Equipped skin id for that side, or null — decides which character rig gets built. */
  skinId(owner: 'player' | 'npc'): string | null;
  /** Idempotent achievement unlock with in-arena popup. */
  unlockAchievement(id: string): void;
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
  /** Colour mappers + effect painters, one per owner so a skin recolours one side. */
  private readonly pcol: ShadowColorFn;
  private readonly ncol: ShadowColorFn;
  private readonly pfx: ShadowFx;
  private readonly nfx: ShadowFx;
  /**
   * The character rig for each shadow-element fighter — shadow's own by default, or whatever
   * that side's equipped skin installs instead. Typed as the base rig because the kit only
   * ever drives it through poses and gestures, which every rig has.
   */
  private playerAvatar: BaseAvatar | null = null;
  private npcAvatar: BaseAvatar | null = null;
  /** Last aim point, cached in handleInput so the per-frame avatar update can face it. */
  private aimX = 0;
  private aimY = 0;
  /** Shadow Mastery passive shroud. Sits under the Consume shroud so the two stack. */
  private masteryShroud: ShadowShroud | null = null;
  private consumeShroud: ShadowShroud | null = null;
  private darkBombs: DarkBomb[] = [];

  // ── Caltrops (both owners) ───────────────────────────────────────────
  private caltrops: Caltrop[] = [];
  /** One Graphics paints every caltrop in the arena. Built lazily; dies with the scene run. */
  private caltropGfx: Phaser.GameObjects.Graphics | null = null;
  /** Click+ Crippling Spikes: slow stacks per fighter and when they all fall off. */
  private crippled = new Map<Fighter, { stacks: number; until: number }>();
  /** Venom trap poison: per fighter, until when and the damage still owed this second. */
  private venomed = new Map<Fighter, { until: number; acc: number; owner: 'player' | 'npc' }>();
  /** Grim Gloom, at most one per owner. */
  private glooms: GrimGloom[] = [];

  // ── Player shadow ────────────────────────────────────────────────────
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
  /** Fighters currently slowed by a tripline or a shinobi trap → expiry timestamp. */
  private slowedUntil = new Map<Fighter, number>();
  /** Fighters whose walkSpeedMult this kit has lowered, so it can hand them it back. */
  private walkSlowed = new Set<Fighter>();
  /** Fighters this kit has tinted for hopelessness, so it only clears its own tint. */
  private tinted = new Set<Fighter>();
  private oozeAccum = 0;

  // ── Trap picker (Death + the trap perks) ─────────────────────────────
  /** Which trap the picker is set to. Only read while the picker is up. */
  private selectedTrap: TrapKind = 'base';
  /** Online: the trap the remote shadow last told us it is planting (`shadow-trap:<kind>`). */
  private npcNetTrap: TrapKind | null = null;
  /** The kinds the bar was built for, so a loadout change rebuilds it. */
  private trapBarKey = '';
  private trapBarSlots: Array<{
    kind: TrapKind;
    bg: Phaser.GameObjects.Rectangle;
    /** The trap itself, drawn small — you pick by looking at what you are about to plant. */
    art: Phaser.GameObjects.Graphics;
    name: Phaser.GameObjects.Text;
    x: number;
    y: number;
  }> = [];
  /** Screen-space bounds of the trap bar; a click inside it must never become an attack. */
  private trapBarBounds = { x1: 0, y1: 0, x2: 0, y2: 0 };
  /** The void-pocket plates behind the trap icons, redrawn every frame. */
  private trapBarGfx: Phaser.GameObjects.Graphics | null = null;
  private trapBarHover: TrapKind | null = null;
  /** The current press began on the picker, so it must not throw a caltrop. */
  private pressOnTrapBar = false;

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
  /** Tripline / shinobi / crippling slow contribution for the NPC (1 = unslowed). */
  getNpcSpeedMult(time: number): number {
    return this.slowMultFor(this.arena.npc, time);
  }
  /**
   * Tripline / shinobi / crippling slow contribution for the player (1 = unslowed). Online,
   * the attacker's sim already slows its replica of us and relays it (`netSpeedMult`), so
   * applying our own copy as well would slow us twice.
   */
  getPlayerSpeedMult(time: number): number {
    return this.arena.isOnline ? 1 : this.slowMultFor(this.arena.player, time);
  }
  /** True while that side's Grim Gloom is up — ArenaScene attributes mastery kills with it. */
  isGloomActive(owner: 'player' | 'npc'): boolean {
    return this.glooms.some((g) => g.owner === owner);
  }
  /**
   * Bot synergy: while the bot's own Grim Gloom is up, caltrops thrown at the player's feet
   * make them stand still (Crippling Spikes stacks them into a crawl), and standing still is
   * what the gloom's tentacles feed on. Null when there is no gloom to feed.
   */
  npcGloomCaltropAim(): { x: number; y: number } | null {
    if (!this.isGloomActive('npc')) return null;
    const p = this.arena.player;
    return p.active && p.hp > 0 ? { x: p.x, y: p.y } : null;
  }

  /** Every slow this kit owns on one fighter, folded into a single walk multiplier. */
  private slowMultFor(f: Fighter, time: number): number {
    let m = time < (this.slowedUntil.get(f) ?? 0) ? Math.min(TRIPLINE_SLOW_MULT, SHINOBI_SLOW_MULT) : 1;
    const c = this.crippled.get(f);
    if (c && time < c.until) m = Math.min(m, 1 - c.stacks * CRIPPLE_PER_STACK);
    return m;
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

    this.caltrops = [];
    this.caltropGfx?.destroy();
    this.caltropGfx = null;
    this.crippled.clear();
    this.venomed.clear();
    for (const g of this.glooms) { g.gfx.destroy(); g.strikeGfx.destroy(); }
    this.glooms = [];
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
    for (const f of this.walkSlowed) if (f.active) f.walkSpeedMult = 1;
    this.walkSlowed.clear();
    this.slowedUntil.clear();
    for (const f of this.tinted) if (f.active) f.clearTint();
    this.tinted.clear();
    this.oozeAccum = 0;
    // Death perk: the bar's GameObjects died with the old scene run. It is rebuilt lazily by
    // update(), which is also the only place that knows whether this match wants one.
    this.teardownTrapBar();
    this.selectedTrap = 'base';
    this.npcNetTrap = null;
    this.pressOnTrapBar = false;
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

    // Tripline / shinobi slows and crippling stacks expire back to normal walk speed. The
    // 1v1 pair reads these through the speed-mult accessors; walkSpeedMult is for husks.
    for (const [f, until] of this.slowedUntil) {
      if (time >= until) this.slowedUntil.delete(f);
    }
    for (const [f, c] of this.crippled) {
      if (time >= c.until) this.crippled.delete(f);
    }
    for (const f of new Set([...this.slowedUntil.keys(), ...this.crippled.keys()])) {
      if (!f.active) continue;
      // Already ours: track the slow exactly, so a lifted tripline hands back the difference.
      const m = this.slowMultFor(f, time);
      f.walkSpeedMult = this.walkSlowed.has(f) ? m : Math.min(f.walkSpeedMult, m);
      this.walkSlowed.add(f);
    }
    for (const f of this.walkSlowed) {
      if (this.slowedUntil.has(f) || this.crippled.has(f)) continue;
      if (f.active) f.walkSpeedMult = 1;
      this.walkSlowed.delete(f);
    }

    // Venom trap poison ticks once a second.
    for (const [f, v] of this.venomed) {
      if (!f.active || f.hp <= 0 || time >= v.until) { this.venomed.delete(f); continue; }
      v.acc += VENOM_DOT_PER_SEC * dt;
      if (v.acc >= VENOM_DOT_PER_SEC) {
        v.acc -= VENOM_DOT_PER_SEC;
        f.takeDamage(VENOM_DOT_PER_SEC);
        this.arena.spawnHitFlash(f.x, f.y, SHADOW.venom);
      }
      if (Math.random() < dt * 6) {
        this.fx(v.owner).wisps(f.x + Phaser.Math.Between(-10, 10), f.y - 4, 1, {
          angle: Math.PI / 2, spread: 0.4, speed: 20, size: 2.4, life: 520, rise: -14, depth: 7, color: SHADOW.venom,
        });
      }
    }
  }

  private spawnDarkCloud(x: number, y: number, owner: 'player' | 'npc'): void {
    const scene = this.arena.scene;
    const radius = 36;
    const duration = 6000;
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

  // ── Shadow Caltrops (Click) ─────────────────────────────────────────────

  /**
   * Throw a caltrop at the point (clamped to range). Shinobi throws two, each a little off the
   * line and a little short or long. Every gesture fires here, so a bot's and an online peer's
   * throws animate exactly like the player's.
   */
  doThrowCaltrop(x: number, y: number, isPlayer: boolean): void {
    const owner: 'player' | 'npc' = isPlayer ? 'player' : 'npc';
    const caster = isPlayer ? this.arena.player : this.arena.npc;
    const avatar = isPlayer ? this.playerAvatar : this.npcAvatar;
    const angle = Math.atan2(y - caster.y, x - caster.x);
    const dist = Math.min(CALTROP_RANGE, Phaser.Math.Distance.Between(caster.x, caster.y, x, y));

    avatar?.play('punch', angle);
    const hand = avatar?.castHand() ?? { x: caster.x, y: caster.y };
    this.fx(owner).muzzleUmbra(hand.x, hand.y, angle, 0.6, 8);

    const throws = this.arena.hasPerk(owner, 'shadow-shinobi')
      ? [-1, 1].map((side) => ({
        a: angle + side * SHINOBI_SPREAD * (0.45 + Math.random() * 0.55),
        d: Math.max(30, dist + Phaser.Math.Between(-SHINOBI_RANGE_JITTER, SHINOBI_RANGE_JITTER)),
      }))
      : [{ a: angle, d: dist }];
    for (const t of throws) {
      this.spawnCaltrop(owner, hand.x, hand.y,
        caster.x + Math.cos(t.a) * t.d, caster.y + Math.sin(t.a) * t.d, CALTROP_FLIGHT_MS);
    }
  }

  /** Put one caltrop in the air. Past the per-side cap, the oldest one on the floor goes. */
  private spawnCaltrop(owner: 'player' | 'npc', fromX: number, fromY: number, toX: number, toY: number, flightMs: number): void {
    const now = this.arena.scene.time.now;
    const tx = Phaser.Math.Clamp(toX, 14, this.arena.width - 14);
    const ty = Phaser.Math.Clamp(toY, 24, this.arena.height - 14);
    const mine = this.caltrops.filter((c) => c.owner === owner);
    if (mine.length >= CALTROP_MAX) this.caltrops.splice(this.caltrops.indexOf(mine[0]), 1);
    this.caltrops.push({
      x: fromX, y: fromY, fromX, fromY, toX: tx, toY: ty,
      spawnAt: now, landAt: now + flightMs, expiresAt: now + flightMs + CALTROP_LIFETIME_MS,
      owner, spin: Math.random() * Math.PI * 2, landed: false,
    });
  }

  private cripplingFor(owner: 'player' | 'npc'): boolean {
    return owner === 'player' ? this.arena.hasUpgrade('click') : this.arena.hasNpcUpgrade('click');
  }

  /** Fly, land, trigger, expire and repaint every caltrop in one pass. */
  private updateCaltrops(time: number): void {
    const { player, enemies, scene } = this.arena;
    if (!this.caltropGfx) this.caltropGfx = scene.add.graphics().setDepth(4);
    const g = this.caltropGfx;
    g.clear();
    const t = time / 1000;
    for (let i = this.caltrops.length - 1; i >= 0; i--) {
      const c = this.caltrops[i];
      if (time >= c.expiresAt) { this.caltrops.splice(i, 1); continue; }
      const crippling = this.cripplingFor(c.owner);
      if (!c.landed) {
        const k = Math.min(1, (time - c.spawnAt) / Math.max(1, c.landAt - c.spawnAt));
        c.x = c.fromX + (c.toX - c.fromX) * k;
        c.y = c.fromY + (c.toY - c.fromY) * k;
        // A low lob: it tumbles over at the top of the arc.
        const lift = Math.sin(Math.PI * k) * 26;
        g.fillStyle(this.col(c.owner)(SHADOW.abyss), 0.25);
        g.fillEllipse(c.x, c.y + 4, 10, 4);
        ShadowFx.drawCaltrop(g, this.col(c.owner), c.x, c.y - lift, 6, c.spin + k * 9, 1, { crippling, t });
        if (k >= 1) {
          c.landed = true;
          c.x = c.toX; c.y = c.toY;
          this.fx(c.owner).wisps(c.x, c.y, 2, { speed: 30, size: 2, life: 300, rise: 6, depth: 4 });
        }
        continue;
      }
      // Lying caltrops thin out over their last second instead of popping off.
      const left = c.expiresAt - time;
      ShadowFx.drawCaltrop(g, this.col(c.owner), c.x, c.y, 6.5, c.spin, left < 900 ? left / 900 : 1,
        { crippling, grounded: true, t });

      const victims: Fighter[] = c.owner === 'player' ? enemies : [player];
      for (const v of victims) {
        if (!v.active || v.hp <= 0) continue;
        if (Phaser.Math.Distance.Between(c.x, c.y, v.x, v.y) > CALTROP_TRIGGER_R) continue;
        this.treadOnCaltrop(c, v, time, crippling);
        this.caltrops.splice(i, 1);
        break;
      }
    }
  }

  /** Someone stepped on one: a little damage, a lump of despair, and with Click+ a limp. */
  private treadOnCaltrop(c: Caltrop, v: Fighter, time: number, crippling: boolean): void {
    v.takeDamage(CALTROP_DAMAGE, { source: c, sourceX: c.x, sourceY: c.y });
    this.applyHopelessness(v, CALTROP_HOPELESS);
    this.arena.spawnHitFlash(v.x, v.y, this.col(c.owner)(SHADOW.mauve));
    this.fx(c.owner).tendrilBurst(c.x, c.y, 18, 4, 6);
    if (!crippling) return;
    const prev = this.crippled.get(v);
    const stacks = Math.min(CRIPPLE_MAX_STACKS, (prev && time < prev.until ? prev.stacks : 0) + 1);
    this.crippled.set(v, { stacks, until: time + Math.round(CRIPPLE_MS * v.statusDurMult) });
    this.arena.showFloatingText(v.x, v.y - 40, `🦶 CRIPPLED ×${stacks}`, '#cc3355');
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
    const fx = this.fx(b.owner);

    // Beacon shells are only being flown here; `fireBeacon` owns their impact.
    if (b.mode === 'shell') return;

    if (b.mode === 'watcher') {
      // Watcher bolt: no blast, a despair amplifier that gropes for whoever it was aimed at.
      fx.implosion(b.toX, b.toY, 44, { tendrils: 7, gloom: 1, duration: 320, stain: false });
      const mark = b.mark;
      if (mark && mark.active && mark.hp > 0 && Phaser.Math.Distance.Between(b.toX, b.toY, mark.x, mark.y) <= 44) {
        this.multiplyHopelessness(mark, WATCHER_HOPELESS_MULT);
        this.arena.spawnHitFlash(mark.x, mark.y, this.col(b.owner)(SHADOW.blood));
      }
    }
  }

  doActivateTentacle(x: number, y: number, isPlayer: boolean): void {
    const scene = this.arena.scene;
    const { player, npc, enemies } = this.arena;
    // Abyss: a longer limb that holds on for longer.
    const abyss = this.arena.hasPerk(isPlayer ? 'player' : 'npc', 'shadow-abyss');
    const hookRange = abyss ? ABYSS_TENTACLE_HOOK : 110;
    const reachMax = abyss ? ABYSS_TENTACLE_REACH : 100;
    const holdMs = abyss ? ABYSS_TENTACLE_HOLD_MS : 3000;
    if (isPlayer) {
      const hookDist = Phaser.Math.Distance.Between(player.x, player.y, npc.x, npc.y);
      this.shadowTentacleActive = true;
      this.shadowTentacleHooked = hookDist <= hookRange;
      // Trap drag: check if a trap/stake is near cursor — extend duration for the drag
      const hasTrapNearby = this.canDragTraps('player') && this.shadowSnapTraps.some(
        t => t.owner === 'player' && !t.triggered &&
             Phaser.Math.Distance.Between(t.x, t.y, x, y) <= 55,
      );
      this.shadowTentacleEnd = scene.time.now + (this.shadowTentacleHooked ? holdMs : hasTrapNearby ? 3000 : 600);
      // Tentacle endpoint: toward cursor but clamped to the limb's reach
      const angle = Math.atan2(y - player.y, x - player.x);
      const reach = Math.min(reachMax, Phaser.Math.Distance.Between(player.x, player.y, x, y));
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
        if (Phaser.Math.Distance.Between(player.x, player.y, t.x, t.y) <= hookRange) {
          t.takeDamage(10);
          this.applyHopelessness(t, WALL_TENTACLE_HOPELESS);
          this.arena.spawnHitFlash(t.x, t.y, this.pcol(SHADOW.amethyst));
          this.pfx.tendrilBurst(t.x, t.y, 34, 6, 7);
        }
      }
    } else {
      const hookDist = Phaser.Math.Distance.Between(npc.x, npc.y, player.x, player.y);
      this.npcShadowTentacleActive = true;
      this.npcShadowTentacleHooked = hookDist <= hookRange;
      this.npcShadowTentacleEnd = scene.time.now + (this.npcShadowTentacleHooked ? holdMs : 600);
      if (!this.npcShadowTentacleSprite) {
        this.npcShadowTentacleSprite = scene.add.graphics().setDepth(6);
      }
      const npcAim = Math.atan2(player.y - npc.y, player.x - npc.x);
      this.npcAvatar?.play('sweep', npcAim);
      this.nfx.lash(npc.x, npc.y, npcAim, Math.min(hookRange, hookDist));
      if (this.npcShadowTentacleHooked) {
        player.takeDamage(10);
        this.applyHopelessness(player, WALL_TENTACLE_HOPELESS);
        this.arena.spawnHitFlash(player.x, player.y, this.ncol(SHADOW.violet));
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

  // ── Trap picker: Death's traps and the trap perks ──────────────────────

  /** Every trap kind, in picker order, with the name and colour its tile carries. */
  private static readonly TRAP_MENU: Array<{ kind: TrapKind; name: string; color: number }> = [
    { kind: 'base',     name: 'Snap',    color: SHADOW.mauve },
    { kind: 'venom',    name: 'Venom',   color: SHADOW.venom },
    { kind: 'stake',    name: 'Stake',   color: SHADOW.lilac },
    { kind: 'claymore', name: 'Vanta',   color: SHADOW.blood },
    { kind: 'shinobi',  name: 'Shinobi', color: SHADOW.orchid },
    { kind: 'mine',     name: 'Mine',    color: SHADOW.blood },
    { kind: 'grabber',  name: 'Grabber', color: SHADOW.lilac },
    { kind: 'plume',    name: 'Plume',   color: SHADOW.amethyst },
  ];

  /** The trap each trap perk brings. Death is separate: it brings three at once. */
  private static readonly TRAP_PERKS: Array<{ perk: string; kind: TrapKind }> = [
    { perk: 'shadow-venom', kind: 'venom' },
    { perk: 'plume', kind: 'stake' },
    { perk: 'shadow-vantablack', kind: 'claymore' },
    { perk: 'shadow-shinobi', kind: 'shinobi' },
  ];

  /**
   * The traps a side can plant, in picker order. One trap perk simply replaces the snap trap.
   * Two or more (or Death, which brings three) put a picker under the health bar, and the
   * snap trap is always one of its choices.
   */
  private trapOptions(owner: 'player' | 'npc'): TrapKind[] {
    const kinds = ShadowKit.TRAP_PERKS.filter((t) => this.arena.hasPerk(owner, t.perk)).map((t) => t.kind);
    const death = this.arena.hasPerk(owner, 'death');
    if (!death && kinds.length === 1) return kinds;
    if (death) kinds.push('mine', 'grabber', 'plume');
    return ['base', ...kinds];
  }

  /** What R plants for this side right now. */
  private trapKindFor(owner: 'player' | 'npc'): TrapKind {
    const opts = this.trapOptions(owner);
    if (opts.length === 1) return opts[0];
    if (owner === 'player') return opts.includes(this.selectedTrap) ? this.selectedTrap : 'base';
    // Online, the remote shadow says what it is planting; a bot just picks.
    if (this.npcNetTrap && opts.includes(this.npcNetTrap)) return this.npcNetTrap;
    return opts[Phaser.Math.Between(0, opts.length - 1)];
  }

  /**
   * Online: the remote shadow's `shadow-trap:<kind>` pseudo-cast. It is sent after the R cast
   * it belongs to, so a trap the replay has only just planted is re-planted as the right kind.
   */
  noteNpcTrapKind(kind: string, tx: number, ty: number): void {
    const def = ShadowKit.TRAP_MENU.find((d) => d.kind === kind);
    if (!def) return;
    this.npcNetTrap = def.kind;
    const now = this.arena.scene.time.now;
    for (let i = this.shadowSnapTraps.length - 1; i >= 0; i--) {
      const t = this.shadowSnapTraps[i];
      if (t.owner !== 'npc' || t.triggered || now - t.spawnAt > 1000) continue;
      if (t.kind === def.kind) return;
      t.gfx.destroy();
      if (this.pendingStake.npc === t) this.pendingStake.npc = null;
      this.shadowSnapTraps.splice(i, 1);
      this.plantTrap('npc', t.x, t.y, def.kind, Math.atan2(ty - t.y, tx - t.x), false);
      return;
    }
  }

  private teardownTrapBar(): void {
    for (const s of this.trapBarSlots) { s.bg.destroy(); s.art.destroy(); s.name.destroy(); }
    this.trapBarSlots = [];
    this.trapBarGfx?.destroy(); this.trapBarGfx = null;
    this.trapBarHover = null;
    this.trapBarBounds = { x1: 0, y1: 0, x2: 0, y2: 0 };
    this.trapBarKey = '';
  }

  private static readonly TRAP_SLOT_W = 62;
  private static readonly TRAP_SLOT_H = 46;

  /** The picker, centred under the health bar. One tile per trap this loadout can plant. */
  private buildTrapBar(kinds: TrapKind[]): void {
    const scene = this.arena.scene;
    const slotW = ShadowKit.TRAP_SLOT_W;
    const slotH = ShadowKit.TRAP_SLOT_H;
    const gap = 6;
    const total = kinds.length * slotW + (kinds.length - 1) * gap;
    const startX = this.arena.width / 2 - total / 2 + slotW / 2;
    const y = this.arena.hpBarY + this.arena.hpBarH / 2 + 12 + slotH / 2;
    this.trapBarBounds = {
      x1: startX - slotW / 2, y1: y - slotH / 2,
      x2: startX - slotW / 2 + total, y2: y + slotH / 2,
    };
    this.trapBarKey = kinds.join(',');
    if (!kinds.includes(this.selectedTrap)) this.selectedTrap = 'base';

    this.trapBarGfx = scene.add.graphics().setDepth(199.5).setScrollFactor(0);
    for (let i = 0; i < kinds.length; i++) {
      const def = ShadowKit.TRAP_MENU.find((d) => d.kind === kinds[i])!;
      const x = startX + i * (slotW + gap);
      // The rect is only the hit area; the void-pocket plate is painted by paintTrapBar.
      const bg = scene.add.rectangle(x, y, slotW, slotH, SHADOW.pitch, 0.01)
        .setDepth(200)
        .setScrollFactor(0)
        .setInteractive({ useHandCursor: true });
      const art = scene.add.graphics().setDepth(201).setScrollFactor(0);
      const name = scene.add.text(x, y + 15, def.name.toUpperCase(), {
        fontSize: '8px', fontFamily: FONT_DISPLAY, color: '#ccaadd', stroke: '#08000f', strokeThickness: 3,
      }).setOrigin(0.5).setDepth(201).setScrollFactor(0);

      bg.on('pointerdown', () => {
        this.selectedTrap = def.kind;
        this.refreshTrapBar();
        // Online: tell the peer what our next trap will be before we plant it.
        this.arena.broadcastMasteryCast(`shadow-trap:${def.kind}`);
      });
      bg.on('pointerover', () => { this.trapBarHover = def.kind; });
      bg.on('pointerout', () => { if (this.trapBarHover === def.kind) this.trapBarHover = null; this.refreshTrapBar(); });

      this.trapBarSlots.push({ kind: def.kind, bg, art, name, x, y });
    }
    this.refreshTrapBar();
  }

  private refreshTrapBar(): void {
    for (const s of this.trapBarSlots) {
      s.name.setColor(s.kind === this.selectedTrap ? '#ffffff' : '#9977aa');
    }
  }

  /** Repaint the tiles, so each trap twitches in the bar exactly as it will on the floor. */
  private paintTrapBar(time: number): void {
    const g = this.trapBarGfx;
    const w = ShadowKit.TRAP_SLOT_W, h = ShadowKit.TRAP_SLOT_H;
    if (g) {
      g.clear();
      const b = this.trapBarBounds;
      // A torn strip of night the pockets hang in, with tendrils curling off each end.
      g.fillStyle(0x000000, 0.4);
      g.fillRoundedRect(b.x1 - 8, b.y1 - 3, b.x2 - b.x1 + 16, b.y2 - b.y1 + 10, 12);
      g.fillStyle(SHADOW.abyss, 0.88);
      g.fillRoundedRect(b.x1 - 10, b.y1 - 6, b.x2 - b.x1 + 20, b.y2 - b.y1 + 12, 12);
      g.lineStyle(1.5, SHADOW.violet, 1);
      g.strokeRoundedRect(b.x1 - 10, b.y1 - 6, b.x2 - b.x1 + 20, b.y2 - b.y1 + 12, 12);
      for (const side of [-1, 1]) {
        const ex = side < 0 ? b.x1 - 10 : b.x2 + 10;
        const ey = (b.y1 + b.y2) / 2;
        for (let k = 0; k < 3; k++) {
          const wave = Math.sin(time / 420 + k * 1.7 + side) * 4;
          g.lineStyle(2.4 - k * 0.6, k === 0 ? SHADOW.orchid : SHADOW.plum, 0.8 - k * 0.2);
          g.beginPath();
          g.moveTo(ex, ey - 10 + k * 10);
          g.lineTo(ex + side * 6, ey - 12 + k * 10 + wave);
          g.lineTo(ex + side * 11, ey - 8 + k * 10 - wave * 0.6);
          g.strokePath();
        }
      }
      for (const s of this.trapBarSlots) {
        const def = ShadowKit.TRAP_MENU.find((d) => d.kind === s.kind)!;
        const sel = s.kind === this.selectedTrap;
        const hov = s.kind === this.trapBarHover;
        const x0 = s.x - w / 2, y0 = s.y - h / 2;
        if (sel) {
          // A selected pocket breathes a violet aura out of its edges.
          const pulse = 0.5 + 0.5 * Math.sin(time / 240);
          g.fillStyle(def.color, 0.12 + pulse * 0.12);
          g.fillRoundedRect(x0 - 4, y0 - 4, w + 8, h + 8, 12);
        }
        g.fillStyle(sel ? SHADOW.violet : hov ? SHADOW.umbra : SHADOW.pitch, 0.95);
        g.fillRoundedRect(x0, y0, w, h, 9);
        // Inner vignette: the pocket is deeper in the middle.
        g.fillStyle(SHADOW.abyss, 0.55);
        g.fillEllipse(s.x, s.y - 3, w - 14, h - 16);
        // Wisps drifting up inside the pocket.
        for (let k = 0; k < 3; k++) {
          const ph = (time / 1600 + k / 3 + s.x * 0.001) % 1;
          g.fillStyle(def.color, (1 - ph) * (sel ? 0.5 : 0.22));
          g.fillCircle(x0 + 10 + k * 21 + Math.sin(ph * 6 + k) * 3, y0 + h - 6 - ph * (h - 12), 1.8);
        }
        g.lineStyle(sel ? 2.5 : 1.5, def.color, sel ? 1 : hov ? 0.85 : 0.5);
        g.strokeRoundedRect(x0, y0, w, h, 9);
        // Hooked thorn corners.
        g.lineStyle(1.5, sel ? SHADOW.pale : def.color, sel ? 0.9 : 0.5);
        for (const [cx, cy, dx, dy] of [[x0, y0, 1, 1], [x0 + w, y0, -1, 1], [x0, y0 + h, 1, -1], [x0 + w, y0 + h, -1, -1]]) {
          g.lineBetween(cx + dx * 2, cy + dy * 7, cx + dx * 2, cy + dy * 2);
          g.lineBetween(cx + dx * 2, cy + dy * 2, cx + dx * 7, cy + dy * 2);
        }
        // Name ribbon under the icon.
        g.fillStyle(sel ? def.color : SHADOW.umbra, sel ? 0.55 : 0.8);
        g.fillRoundedRect(x0 + 7, s.y + 10, w - 14, 11, 5);
      }
    }
    for (const s of this.trapBarSlots) {
      s.art.clear();
      this.drawTrapIcon(s.art, s.kind, s.x, s.y - 5, time + s.x * 3, s.kind === this.selectedTrap ? 1 : 0.65);
    }
  }

  /**
   * True when the pointer is picking a trap rather than attacking. Tested geometrically for the
   * same reason LifeKit's seed bar is: Phaser dispatches input before scene update, so a flag
   * set in the pointerdown handler would already have been cleared by the time this is read.
   */
  private pointerOnTrapBar(pointer: Phaser.Input.Pointer): boolean {
    if (this.trapBarSlots.length === 0) return false;
    const b = this.trapBarBounds;
    return pointer.worldX >= b.x1 && pointer.worldX <= b.x2 && pointer.worldY >= b.y1 && pointer.worldY <= b.y2;
  }

  /** One trap drawn small, for the bar. Shares the shapes the real traps use on the floor. */
  private drawTrapIcon(
    g: Phaser.GameObjects.Graphics, kind: TrapKind, x: number, y: number, time: number, alpha: number,
  ): void {
    const stub: SnapTrap = {
      gfx: g, expiresAt: 0, spawnAt: -1000, phase: x * 0.01,
      x, y, triggered: false, radius: kind === 'stake' ? 8 : 13, owner: 'player', kind,
      isStake: kind === 'stake', facing: -Math.PI / 2,
    };
    g.setAlpha(alpha);
    // The bar has no room for a claymore's line of sight; the icon is the mine alone.
    this.drawTrap(stub, time, true);
  }

  doPlaceSnapTrap(isPlayer: boolean, aimX?: number, aimY?: number): void {
    const { player, npc } = this.arena;
    const owner: 'player' | 'npc' = isPlayer ? 'player' : 'npc';
    const caster = isPlayer ? player : npc;
    const bigTraps = isPlayer ? this.arena.hasUpgrade('r') : this.arena.hasNpcUpgrade('r');

    // Hands come together low and shove the thing into the ground.
    (isPlayer ? this.playerAvatar : this.npcAvatar)?.play('clap');
    const fx = this.fx(owner);
    fx.ring(caster.x, caster.y, 4, bigTraps ? 34 : 24, SHADOW.lilac, 340, 3, 3);
    fx.wisps(caster.x, caster.y, 4, { speed: 45, size: 2.4, life: 420, rise: -10, depth: 4 });

    // A claymore faces where it was aimed; without an aim it watches the enemy.
    const foe = isPlayer ? npc : player;
    let ax = aimX ?? (isPlayer ? this.aimX : foe.x);
    let ay = aimY ?? (isPlayer ? this.aimY : foe.y);
    if (Math.hypot(ax - caster.x, ay - caster.y) < 4) { ax = foe.x; ay = foe.y; }
    const facing = Math.atan2(ay - caster.y, ax - caster.x);

    const kind = this.trapKindFor(owner);
    // Online: the peer replays this R as a plain trap; this tells it which kind it really is.
    if (isPlayer && (kind !== 'base' || this.trapOptions('player').length > 1)) {
      this.arena.broadcastMasteryCast(`shadow-trap:${kind}`);
    }
    this.plantTrap(owner, caster.x, caster.y, kind, facing, true);
  }

  /** Put a trap of the given kind in the floor. `announce` pops the "SET" readout. */
  private plantTrap(owner: 'player' | 'npc', x: number, y: number, kind: TrapKind, facing: number, announce: boolean): void {
    const scene = this.arena.scene;
    const bigTraps = owner === 'player' ? this.arena.hasUpgrade('r') : this.arena.hasNpcUpgrade('r');

    if (kind === 'stake') {
      // Snap Stake: a bare spike. Harmless until a second stake strings a tripline to it.
      const stake: SnapTrap = {
        gfx: scene.add.graphics().setDepth(4),
        expiresAt: scene.time.now + STAKE_LIFETIME_MS,
        spawnAt: scene.time.now,
        phase: Math.random() * Math.PI * 2,
        x, y,
        triggered: false, radius: 8, owner, isStake: true, kind: 'stake',
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
        this.arena.showFloatingText(x, y - 24, '🧵 STRUNG', '#cc88ff');
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
      x, y,
      // A grabber reaches further than a set of jaws.
      triggered: false,
      radius: kind === 'grabber' ? (bigTraps ? 40 : 30) : bigTraps ? 27 : 18,
      owner, kind, grabbed: null, grabUntil: 0, facing,
    });

    if (announce && kind !== 'base') {
      const label = ShadowKit.TRAP_MENU.find((d) => d.kind === kind)!.name;
      this.arena.showFloatingText(x, y - 30, `☠️ ${label.toUpperCase()} SET`, '#cc88ff');
    }
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
   * A Mine: a triangular charge sunk into the floor, ringed by the blast radius it will
   * clear. The plate is a hard-edged wedge rather than a circle — nothing else Shadow puts
   * on the ground has corners, so a mine is identifiable at a glance and from a distance.
   */
  private drawMine(t: SnapTrap, time: number): void {
    const g = t.gfx;
    g.clear();
    const grow = Math.min(1, (time - t.spawnAt) / 220);
    const r = t.radius * 1.35 * grow;
    const tint = this.col(t.owner);
    const warn = tint(SHADOW.blood);
    const pulse = 0.5 + 0.5 * Math.sin(time * 0.006 + t.phase);

    g.fillStyle(tint(SHADOW.abyss), 0.32);
    g.fillEllipse(t.x, t.y + r * 0.3, r * 2.1, r * 0.8);

    // The reach it will clear, breathing so it never reads as a decal.
    g.lineStyle(1.5, warn, 0.14 + pulse * 0.12);
    g.strokeCircle(t.x, t.y, MINE_RADIUS * 0.5 * grow * (0.97 + pulse * 0.03));

    // Body: three nested wedges, the innermost lit by the charge.
    const tri = (rr: number, rot: number) => {
      g.beginPath();
      for (let i = 0; i < 3; i++) {
        const a = rot + (i / 3) * Math.PI * 2 - Math.PI / 2;
        const px = t.x + Math.cos(a) * rr;
        const py = t.y + Math.sin(a) * rr;
        if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
      }
      g.closePath();
    };

    g.fillStyle(tint(SHADOW.pitch), 0.95);
    tri(r * 1.15, t.phase * 0.05); g.fillPath();
    g.lineStyle(2, tint(SHADOW.orchid), 0.9);
    tri(r * 1.15, t.phase * 0.05); g.strokePath();
    g.fillStyle(tint(SHADOW.umbra), 0.95);
    tri(r * 0.78, -t.phase * 0.05); g.fillPath();

    // Detonator: a bead of blood-red charge with prongs at each corner.
    for (let i = 0; i < 3; i++) {
      const a = t.phase * 0.05 + (i / 3) * Math.PI * 2 - Math.PI / 2;
      g.fillStyle(warn, 0.5 + pulse * 0.4);
      g.fillCircle(t.x + Math.cos(a) * r * 0.86, t.y + Math.sin(a) * r * 0.86, 2 + pulse);
    }
    g.fillStyle(warn, 0.35 + pulse * 0.5);
    g.fillCircle(t.x, t.y, r * 0.26 + pulse * 2);
    g.fillStyle(tint(SHADOW.white), 0.4 + pulse * 0.5);
    g.fillCircle(t.x, t.y, r * 0.1);
  }

  /**
   * A Grabber: a pit of limbs lying coiled and flat, waiting. Once it has hold of something
   * the same limbs are drawn stretched out to the victim, so the trap and its catch are one
   * object rather than a trap and a status effect.
   */
  private drawGrabber(t: SnapTrap, time: number): void {
    const g = t.gfx;
    g.clear();
    const grow = Math.min(1, (time - t.spawnAt) / 220);
    const r = t.radius * grow;
    const tint = this.col(t.owner);
    const holding = !!t.grabbed;

    g.fillStyle(tint(SHADOW.abyss), 0.45);
    g.fillEllipse(t.x, t.y, r * 2.2, r * 1.5);
    g.fillStyle(tint(SHADOW.pitch), 0.9);
    g.fillEllipse(t.x, t.y, r * 1.5, r * 1.0);

    // Coiled limbs around the rim, groping outward on their own beats.
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + t.phase + Math.sin(time * 0.002 + i) * 0.5;
      const reach = r * (0.9 + 0.5 * Math.sin(time * 0.004 + i * 1.3));
      g.fillStyle(tint(i % 2 ? SHADOW.orchid : SHADOW.amethyst), 0.85);
      shadowTendril(g, t.x, t.y, a, reach, r * 0.16, Math.sin(time * 0.003 + i) * r * 0.5);
    }

    // The eye in the pit — open only while it is holding something.
    const lid = holding ? 1 : 0.35 + 0.2 * Math.sin(time * 0.004 + t.phase);
    g.fillStyle(tint(SHADOW.white), 0.75 * lid);
    g.fillEllipse(t.x, t.y, r * 0.6, r * 0.42 * lid);
    g.fillStyle(tint(holding ? SHADOW.blood : SHADOW.violet), 0.95 * lid);
    g.fillCircle(t.x, t.y, r * 0.17);

    // The hold itself: a thick limb run out to the victim, barbed along its length.
    if (t.grabbed && t.grabbed.active) {
      const v = t.grabbed;
      const a = Math.atan2(v.y - t.y, v.x - t.x);
      const len = Phaser.Math.Distance.Between(t.x, t.y, v.x, v.y);
      const sway = Math.sin(time * 0.008 + t.phase) * Math.min(14, len * 0.16);
      shadowTendrilLayered(g, tint, t.x, t.y, a, len, 6.5, sway, 0.95, 4, t.phase, { barbs: 5 });
      // The grip: a knot of limb closed around them.
      g.fillStyle(tint(SHADOW.amethyst), 0.9);
      for (let i = 0; i < 5; i++) {
        const ga = a + Math.PI + (i - 2) * 0.55;
        shadowTendril(g, v.x, v.y, ga, 15, 3, Math.sin(time * 0.01 + i) * 5);
      }
    }
  }

  /**
   * A Plume trap: the jaws, but bloated with what it is carrying. Pools of dark visibly swirl
   * under the plate, which is the only warning that this one bursts rather than bites.
   */
  private drawPlumeTrap(t: SnapTrap, time: number): void {
    // The jaws underneath are the same trap, so the two read as a family.
    this.drawSnapTrap(t, time);

    const g = t.gfx;
    const grow = Math.min(1, (time - t.spawnAt) / 220);
    const r = t.radius * grow;
    const tint = this.col(t.owner);

    // Pools boiling up out of the plate, each on its own orbit.
    for (let i = 0; i < 5; i++) {
      const a = t.phase + (i / 5) * Math.PI * 2 + time * 0.0011;
      const d = r * (0.2 + 0.28 * ((i % 3) + 1) / 3);
      const bob = Math.sin(time * 0.005 + i * 1.7) * r * 0.12;
      const rr = r * (0.2 + 0.1 * Math.sin(time * 0.006 + i));
      g.fillStyle(tint(SHADOW.amethyst), 0.55);
      g.fillEllipse(t.x + Math.cos(a) * d, t.y + Math.sin(a) * d * 0.7 + bob, rr * 2, rr * 1.3);
      g.fillStyle(tint(SHADOW.lilac), 0.35);
      g.fillEllipse(t.x + Math.cos(a) * d, t.y + Math.sin(a) * d * 0.7 + bob, rr, rr * 0.7);
    }
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

  /** Whichever art this trap wears. Stakes are handled by their own branch upstream. */
  private drawTrap(t: SnapTrap, time: number, icon = false): void {
    if (t.isStake) this.drawStake(t, time);
    else if (t.kind === 'mine') this.drawMine(t, time);
    else if (t.kind === 'grabber') this.drawGrabber(t, time);
    else if (t.kind === 'plume') this.drawPlumeTrap(t, time);
    else if (t.kind === 'venom') this.drawVenomTrap(t, time);
    else if (t.kind === 'claymore') this.drawClaymore(t, time, icon);
    else if (t.kind === 'shinobi') this.drawShinobiTrap(t, time);
    else this.drawSnapTrap(t, time);
  }

  /**
   * A Venom Trap: the snap jaws, but the teeth are slick with poison and a sac of it swells
   * on the plate. It drips a little on its own beat — the tell that this one does not stun.
   */
  private drawVenomTrap(t: SnapTrap, time: number): void {
    this.drawSnapTrap(t, time);
    const g = t.gfx;
    const tint = this.col(t.owner);
    const r = t.radius * Math.min(1, (time - t.spawnAt) / 220);
    // Poison sheen over the teeth.
    g.lineStyle(1.6, tint(SHADOW.venom), 0.75);
    g.strokeCircle(t.x, t.y, r * 0.95);
    // The venom sac, swelling and easing back.
    const swell = 0.5 + 0.5 * Math.sin(time * 0.006 + t.phase);
    g.fillStyle(tint(SHADOW.bile), 0.95);
    g.fillCircle(t.x, t.y, r * (0.3 + swell * 0.06));
    g.fillStyle(tint(SHADOW.venom), 0.55 + swell * 0.35);
    g.fillCircle(t.x - r * 0.06, t.y - r * 0.08, r * 0.16);
    // Drips off three teeth, falling and fading.
    for (let i = 0; i < 3; i++) {
      const a = t.phase + i * 2.1;
      const ph = ((time / 900) + i / 3) % 1;
      const dx = t.x + Math.cos(a) * r * 0.9;
      const dy = t.y + Math.sin(a) * r * 0.9 + ph * 6;
      g.fillStyle(tint(SHADOW.venom), 0.8 * (1 - ph));
      g.fillEllipse(dx, dy, 2.4, 3.4);
    }
  }

  /**
   * A Vantablack claymore: a curved black plate on splayed legs, convex face toward the way it
   * watches, with a faint line of sight fanned out in front of it. `icon` drops the cone, which
   * would never fit a picker tile.
   */
  private drawClaymore(t: SnapTrap, time: number, icon: boolean): void {
    const g = t.gfx;
    g.clear();
    const tint = this.col(t.owner);
    const grow = Math.min(1, (time - t.spawnAt) / 220);
    const a = t.facing ?? 0;
    const cos = Math.cos(a), sin = Math.sin(a);
    const px = -sin, py = cos;
    const s = (icon ? 0.9 : 1) * grow;

    if (!icon) {
      // The line of sight: two dim edges and a sweeping scan line between them.
      const left = a - CLAYMORE_HALF_ANGLE, right = a + CLAYMORE_HALF_ANGLE;
      g.fillStyle(tint(SHADOW.blood), 0.06 * grow);
      g.beginPath();
      g.moveTo(t.x, t.y);
      for (let i = 0; i <= 8; i++) {
        const k = left + (right - left) * (i / 8);
        g.lineTo(t.x + Math.cos(k) * CLAYMORE_SIGHT, t.y + Math.sin(k) * CLAYMORE_SIGHT);
      }
      g.closePath();
      g.fillPath();
      g.lineStyle(1, tint(SHADOW.blood), 0.35 * grow);
      g.lineBetween(t.x, t.y, t.x + Math.cos(left) * CLAYMORE_SIGHT, t.y + Math.sin(left) * CLAYMORE_SIGHT);
      g.lineBetween(t.x, t.y, t.x + Math.cos(right) * CLAYMORE_SIGHT, t.y + Math.sin(right) * CLAYMORE_SIGHT);
      const scan = a + Math.sin(time * 0.004 + t.phase) * CLAYMORE_HALF_ANGLE;
      g.lineStyle(1.4, tint(SHADOW.blood), 0.5 * grow);
      g.lineBetween(t.x, t.y, t.x + Math.cos(scan) * CLAYMORE_SIGHT, t.y + Math.sin(scan) * CLAYMORE_SIGHT);
    }

    // Shadow under it, then the legs.
    g.fillStyle(tint(SHADOW.abyss), 0.35);
    g.fillEllipse(t.x, t.y + 4 * s, 26 * s, 8 * s);
    g.lineStyle(2, tint(SHADOW.violet), 0.95);
    for (const side of [-1, 1]) {
      g.lineBetween(t.x + px * side * 7 * s, t.y + py * side * 7 * s,
        t.x + px * side * 11 * s - cos * 6 * s, t.y + py * side * 11 * s - sin * 6 * s + 5 * s);
    }
    // The plate: a convex arc of pure black facing forward, with a lilac rim.
    g.fillStyle(tint(SHADOW.abyss), 1);
    g.beginPath();
    for (let i = 0; i <= 10; i++) {
      const f = i / 10 - 0.5;
      const bow = Math.cos(f * Math.PI) * 4 * s;
      g.lineTo(t.x + px * f * 24 * s + cos * bow, t.y + py * f * 24 * s + sin * bow);
    }
    for (let i = 10; i >= 0; i--) {
      const f = i / 10 - 0.5;
      const bow = Math.cos(f * Math.PI) * 4 * s - 5 * s;
      g.lineTo(t.x + px * f * 24 * s + cos * bow, t.y + py * f * 24 * s + sin * bow);
    }
    g.closePath();
    g.fillPath();
    g.lineStyle(1.4, tint(SHADOW.lilac), 0.7);
    g.strokePath();
    // "FRONT TOWARD ENEMY": a blood-lit eye on the face, blinking.
    const blink = 0.5 + 0.5 * Math.sin(time * 0.009 + t.phase);
    g.fillStyle(tint(SHADOW.blood), 0.5 + blink * 0.5);
    g.fillCircle(t.x + cos * 3 * s, t.y + sin * 3 * s, 2.2 * s);
  }

  /** A Shinobi Trap: a dark pouch on a plate, ringed by the caltrops it is about to throw. */
  private drawShinobiTrap(t: SnapTrap, time: number): void {
    const g = t.gfx;
    g.clear();
    const tint = this.col(t.owner);
    const r = t.radius * Math.min(1, (time - t.spawnAt) / 220);
    g.fillStyle(tint(SHADOW.abyss), 0.3);
    g.fillEllipse(t.x, t.y + r * 0.35, r * 2.2, r * 0.8);
    g.fillStyle(tint(SHADOW.pitch), 0.9);
    g.fillCircle(t.x, t.y, r);
    g.lineStyle(1.5, tint(SHADOW.orchid), 0.8);
    g.strokeCircle(t.x, t.y, r);
    // The caltrops it is loaded with, set round the rim, rocking slightly.
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + t.phase * 0.2;
      ShadowFx.drawCaltrop(g, tint, t.x + Math.cos(a) * r * 0.72, t.y + Math.sin(a) * r * 0.72 * 0.85,
        Math.max(2, r * 0.22), a + Math.sin(time * 0.004 + i) * 0.2, 1, { t: time / 1000 });
    }
    // The pouch, tied off at the top.
    const pulse = 0.5 + 0.5 * Math.sin(time * 0.007 + t.phase);
    g.fillStyle(tint(SHADOW.umbra), 1);
    g.fillCircle(t.x, t.y, r * 0.36);
    g.lineStyle(1.5, tint(SHADOW.mauve), 0.5 + pulse * 0.4);
    g.strokeCircle(t.x, t.y, r * 0.36);
    g.lineBetween(t.x - r * 0.12, t.y - r * 0.36, t.x + r * 0.12, t.y - r * 0.48);
  }

  /** True when a fighter stands in a claymore's line of sight. */
  private inClaymoreSight(trap: SnapTrap, v: Fighter, range: number): boolean {
    const d = Phaser.Math.Distance.Between(trap.x, trap.y, v.x, v.y);
    if (d > range) return false;
    if (d <= trap.radius + 10) return true;
    const ang = Math.atan2(v.y - trap.y, v.x - trap.x);
    return Math.abs(Phaser.Math.Angle.Wrap(ang - (trap.facing ?? 0))) <= CLAYMORE_HALF_ANGLE;
  }

  /**
   * Something stepped on a trap. Every kind lands its own way, but they share the ledger
   * entry and the stun the base jaws have always applied, so a Mine still counts as a catch
   * toward Ensnared and still leaves the victim reeling.
   */
  private springTrap(trap: SnapTrap, victim: Fighter, time: number): void {
    const owner = trap.owner;
    const fx = this.fx(owner);
    const stun = (ms: number) => {
      if (owner === 'player') this.shadowNpcStunnedUntil = Math.max(this.shadowNpcStunnedUntil, time + ms);
      else this.shadowPlayerStunnedUntil = Math.max(this.shadowPlayerStunnedUntil, time + ms);
    };
    if (owner === 'player') this.arena.recordMasteryStat('trapped', 1);

    switch (trap.kind) {
      // ── Mine: no bite, a blast. Everything in reach goes up with it. ──────
      case 'mine': {
        trap.triggered = true;
        const victims = owner === 'player' ? this.arena.enemies : [this.arena.player];
        for (const t of victims) {
          if (!t.active || t.hp <= 0) continue;
          if (Phaser.Math.Distance.Between(trap.x, trap.y, t.x, t.y) > MINE_RADIUS) continue;
          t.takeDamage(MINE_DAMAGE, { source: trap, sourceX: trap.x, sourceY: trap.y });
          this.applyHopelessness(t, MINE_HOPELESS);
          this.arena.spawnHitFlash(t.x, t.y, this.col(owner)(SHADOW.blood));
          fx.tendrilBurst(t.x, t.y, 34, 8, 8);
        }
        // The charge itself: a hard shock front, then the dark it was packed with.
        fx.ring(trap.x, trap.y, 10, MINE_RADIUS, SHADOW.blood, 340, 6, 5);
        fx.bloom(trap.x, trap.y, MINE_RADIUS * 0.8, 14);
        fx.wisps(trap.x, trap.y, 10, { speed: MINE_RADIUS * 1.4, size: 3, life: 620, rise: 14, depth: 6 });
        this.arena.scene.cameras.main.shake(220, 0.007);
        this.arena.showFloatingText(trap.x, trap.y - 34, '💥 MINE!', '#ff5577');
        stun(700);
        break;
      }

      // ── Grabber: the trap keeps hold instead of spending itself. ──────────
      case 'grabber': {
        trap.grabbed = victim;
        trap.grabUntil = time + Math.round(GRABBER_HOLD_MS * victim.statusDurMult);
        // Outlive the hold, so the limb never vanishes with its catch still on it.
        trap.expiresAt = Math.max(trap.expiresAt, trap.grabUntil + 400);
        this.applyHopelessness(victim, GRABBER_HOPELESS);
        fx.tendrilBurst(victim.x, victim.y, 36, 9, 8);
        fx.ring(trap.x, trap.y, 8, trap.radius * 2.2, SHADOW.lilac, 380, 4, 4);
        this.arena.spawnHitFlash(victim.x, victim.y, this.col(owner)(SHADOW.lilac));
        this.arena.showFloatingText(victim.x, victim.y - 34, '🦑 GRABBED!', '#cc88ff');
        break;
      }

      // ── Plume: the trap bites, then comes apart into pools. ───────────────
      case 'plume': {
        trap.triggered = true;
        victim.takeDamage(20, { source: trap, sourceX: trap.x, sourceY: trap.y });
        this.applyHopelessness(victim, 20);
        this.arena.spawnHitFlash(victim.x, victim.y, this.col(owner)(SHADOW.mauve));
        this.snapTrapBite(trap, victim);
        for (let i = 0; i < PLUME_CLOUDS; i++) {
          const a = (i / PLUME_CLOUDS) * Math.PI * 2 + trap.phase;
          const d = PLUME_SPREAD * (0.25 + 0.75 * Math.random());
          this.spawnDarkCloud(trap.x + Math.cos(a) * d, trap.y + Math.sin(a) * d * 0.85, owner);
        }
        this.arena.showFloatingText(trap.x, trap.y - 34, '🕳️ PLUME!', '#aa44ff');
        stun(2000);
        break;
      }

      // ── Venom: no stun — a flood of despair and a poison that lingers. ────
      case 'venom': {
        trap.triggered = true;
        victim.takeDamage(VENOM_DAMAGE, { source: trap, sourceX: trap.x, sourceY: trap.y });
        this.applyHopelessness(victim, VENOM_HOPELESS);
        this.venomed.set(victim, { until: time + Math.round(VENOM_DOT_MS * victim.statusDurMult), acc: 0, owner });
        this.arena.spawnHitFlash(victim.x, victim.y, this.col(owner)(SHADOW.venom));
        this.snapTrapBite(trap, victim);
        fx.wisps(victim.x, victim.y, 8, { speed: 70, size: 3, life: 600, rise: -10, depth: 7, color: SHADOW.venom });
        this.arena.showFloatingText(victim.x, victim.y - 34, '🐍 VENOMED!', '#88dd44');
        break;
      }

      // ── Vantablack: the claymore goes off down its line of sight. ─────────
      case 'claymore': {
        trap.triggered = true;
        const victims = owner === 'player' ? this.arena.enemies : [this.arena.player];
        for (const t of victims) {
          if (!t.active || t.hp <= 0 || !this.inClaymoreSight(trap, t, CLAYMORE_BLAST)) continue;
          t.takeDamage(CLAYMORE_DAMAGE, { source: trap, sourceX: trap.x, sourceY: trap.y });
          this.applyHopelessness(t, CLAYMORE_HOPELESS);
          this.arena.spawnHitFlash(t.x, t.y, this.col(owner)(SHADOW.blood));
          fx.tendrilBurst(t.x, t.y, 30, 7, 8);
        }
        // Shrapnel of night fanned down the cone.
        const a = trap.facing ?? 0;
        fx.wisps(trap.x, trap.y, 14, { angle: a, spread: CLAYMORE_HALF_ANGLE, speed: CLAYMORE_BLAST * 1.6, size: 3.2, life: 420, rise: 0, depth: 7 });
        fx.wisps(trap.x, trap.y, 8, { angle: a, spread: CLAYMORE_HALF_ANGLE * 0.6, speed: CLAYMORE_BLAST * 2, size: 2.4, life: 360, rise: 0, depth: 7, color: SHADOW.blood });
        fx.muzzleUmbra(trap.x, trap.y, a, 1.8, 7);
        this.arena.scene.cameras.main.shake(160, 0.006);
        this.arena.showFloatingText(trap.x, trap.y - 30, '⬛ CLAYMORE!', '#ff5577');
        break;
      }

      // ── Shinobi: the bite, then a ring of caltrops; a slow, never a stun. ──
      case 'shinobi': {
        trap.triggered = true;
        victim.takeDamage(20, { source: trap, sourceX: trap.x, sourceY: trap.y });
        this.applyHopelessness(victim, 20);
        this.arena.spawnHitFlash(victim.x, victim.y, this.col(owner)(SHADOW.mauve));
        this.snapTrapBite(trap, victim);
        this.slowedUntil.set(victim, Math.max(this.slowedUntil.get(victim) ?? 0, time + Math.round(SHINOBI_SLOW_MS * victim.statusDurMult)));
        for (let i = 0; i < SHINOBI_BURST; i++) {
          const a = (i / SHINOBI_BURST) * Math.PI * 2 + trap.phase + (Math.random() - 0.5) * 0.4;
          const d = Phaser.Math.Between(SHINOBI_BURST_MIN, SHINOBI_BURST_MAX);
          this.spawnCaltrop(owner, trap.x, trap.y, trap.x + Math.cos(a) * d, trap.y + Math.sin(a) * d * 0.85, 260);
        }
        this.arena.showFloatingText(victim.x, victim.y - 34, '🥷 SLOWED!', '#cc88ff');
        break;
      }

      // ── Base: the jaws Shadow has always set. ─────────────────────────────
      default: {
        trap.triggered = true;
        victim.takeDamage(20);
        this.applyHopelessness(victim, 20);
        this.arena.spawnHitFlash(victim.x, victim.y, this.col(owner)(SHADOW.mauve));
        this.snapTrapBite(trap, victim);
        stun(2000);
        break;
      }
    }
  }

  /** Let a grabber's catch go, whether the hold ran out or the trap died under it. */
  private releaseGrab(trap: SnapTrap): void {
    if (!trap.grabbed) return;
    const v = trap.grabbed;
    trap.grabbed = null;
    trap.grabUntil = 0;
    if (!v.active) return;
    this.fx(trap.owner).wisps(v.x, v.y, 5, { speed: 90, size: 2.4, life: 420, rise: 10, depth: 6 });
    if (v === this.arena.player) this.arena.showFloatingText(v.x, v.y - 34, '🦑 Free!', '#aaddaa');
  }

  /**
   * Keep every grabber's catch on its leash. Run after the AI and the movement pass, because
   * this works by clamping position: doing it earlier would just be overwritten, and doing it
   * with velocity would fight whatever else is pushing the victim around.
   */
  private updateGrabs(time: number): void {
    for (const trap of this.shadowSnapTraps) {
      const v = trap.grabbed;
      if (!v || !v.active || v.hp <= 0 || time >= (trap.grabUntil ?? 0)) continue;
      // Unstoppable (Light Mastery) and friends are immune to being held in place.
      if (v.unstoppable) { this.releaseGrab(trap); continue; }
      const d = Phaser.Math.Distance.Between(trap.x, trap.y, v.x, v.y);
      if (d <= GRABBER_TETHER) continue;
      const a = Math.atan2(v.y - trap.y, v.x - trap.x);
      const body = v.body as Phaser.Physics.Arcade.Body;
      // Snapped back to the end of the leash — they may still move, just not away.
      body.reset(trap.x + Math.cos(a) * GRABBER_TETHER, trap.y + Math.sin(a) * GRABBER_TETHER);
    }
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

  // ── Grim Gloom (alternate Q) ───────────────────────────────────────────

  /**
   * Lay the fog over the whole arena. A recast while one is still up just renews it. Everything
   * after this — the passive despair, the linger watch, the tentacles — is `updateGlooms`.
   */
  doGrimGloom(owner: 'player' | 'npc'): void {
    const scene = this.arena.scene;
    const caster = owner === 'player' ? this.arena.player : this.arena.npc;
    const now = scene.time.now;
    let gloom = this.glooms.find((g) => g.owner === owner);
    if (!gloom) {
      gloom = {
        owner, spawnAt: now, until: 0,
        gfx: scene.add.graphics().setDepth(2.5),
        strikeGfx: scene.add.graphics().setDepth(4.5),
        watch: new Map(), strikes: [],
      };
      this.glooms.push(gloom);
    }
    gloom.until = now + GLOOM_DURATION_MS;
    // Arms up, and the dark pours out of the caster in every direction at once.
    (owner === 'player' ? this.playerAvatar : this.npcAvatar)?.play('raise', -Math.PI / 2, 600);
    const fx = this.fx(owner);
    fx.ring(caster.x, caster.y, 20, Math.max(this.arena.width, this.arena.height) * 0.7, SHADOW.orchid, 900, 10, 3);
    fx.gloom(caster.x, caster.y, 8, 60, 6);
    fx.bloom(caster.x, caster.y, 90, 14);
    scene.cameras.main.shake(260, 0.006);
    scene.cameras.main.flash(220, 40, 0, 70);
    this.arena.showFloatingText(caster.x, caster.y - 40, '🌫️ GRIM GLOOM', '#aa66dd');
  }

  /** Fog, passive despair, the "you have stood there too long" watch, and the strikes. */
  private updateGlooms(time: number, delta: number): void {
    const dt = delta / 1000;
    const { player, enemies, width, height } = this.arena;
    for (let gi = this.glooms.length - 1; gi >= 0; gi--) {
      const gl = this.glooms[gi];
      const live = time < gl.until;
      // Strikes already in the air finish even after the fog lifts.
      if (!live && gl.strikes.length === 0) {
        gl.gfx.destroy();
        gl.strikeGfx.destroy();
        this.glooms.splice(gi, 1);
        continue;
      }

      // The fog rolls in over half a second and thins out over its last 800ms.
      const fade = live
        ? Math.min(1, (time - gl.spawnAt) / 500, (gl.until - time) / 800)
        : 0;
      gl.gfx.clear();
      if (fade > 0) ShadowFx.drawGloomFog(gl.gfx, this.col(gl.owner), width, height, time / 1000, fade);

      const victims: Fighter[] = gl.owner === 'player' ? enemies : [player];
      if (live) {
        for (const v of victims) {
          if (!v.active || v.hp <= 0) { gl.watch.delete(v); continue; }
          this.applyHopelessness(v, GLOOM_HOPELESS_PER_SEC * dt, false);
          // One strike at a time per foe; while it is coming the watch is paused.
          if (gl.strikes.some((st) => st.target === v)) continue;
          const w = gl.watch.get(v);
          if (!w || Phaser.Math.Distance.Between(w.ax, w.ay, v.x, v.y) > GLOOM_LINGER_RADIUS) {
            gl.watch.set(v, { ax: v.x, ay: v.y, since: time });
            continue;
          }
          if (time - w.since < GLOOM_LINGER_MS) continue;
          gl.strikes.push({ x: v.x, y: v.y, target: v, spawnAt: time, hit: false, seed: Math.random() });
          gl.watch.set(v, { ax: v.x, ay: v.y, since: time + GLOOM_STRIKE_MS });
        }
      }

      gl.strikeGfx.clear();
      for (let si = gl.strikes.length - 1; si >= 0; si--) {
        const st = gl.strikes[si];
        const k = (time - st.spawnAt) / GLOOM_STRIKE_MS;
        if (k >= 1) { gl.strikes.splice(si, 1); continue; }
        ShadowFx.drawGloomTentacle(gl.strikeGfx, this.col(gl.owner), st.x, st.y, k, time / 1000, st.seed);
        if (st.hit || k < GLOOM_STRIKE_HIT_AT) continue;
        st.hit = true;
        const v = st.target;
        this.fx(gl.owner).tendrilBurst(st.x, st.y, 30, 7, 6);
        if (!v.active || v.hp <= 0) continue;
        if (Phaser.Math.Distance.Between(st.x, st.y, v.x, v.y) > GLOOM_STRIKE_RADIUS) {
          // They read the crack and stepped out of it.
          continue;
        }
        v.takeDamage(GLOOM_STRIKE_DAMAGE, { source: st, sourceX: st.x, sourceY: st.y });
        this.applyHopelessness(v, GLOOM_STRIKE_HOPELESS);
        this.arena.spawnHitFlash(v.x, v.y, this.col(gl.owner)(SHADOW.blood));
        this.arena.showFloatingText(v.x, v.y - 36, '🦑 FROM BELOW!', '#cc3355');
      }
    }
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
    // Abyss: a much longer wall, every limb of it spiked.
    const abyss = this.arena.hasPerk(owner, 'shadow-abyss');
    const count = abyss ? ABYSS_WALL_TENTACLES : WALL_TENTACLE_COUNT;
    this.walls.push({
      tentacles: [],
      expiresAt: scene.time.now + WALL_DURATION_MS + count * WALL_STEP_MS,
      owner,
      lastHit: new Map(),
      pending: count,
      abyss,
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
        this.drawTentacle(t, time, grow, wall.owner, wall.abyss);
        if (grow < 0.5) continue;

        for (const v of victims) {
          if (!v.active || v.hp <= 0) continue;
          if (Phaser.Math.Distance.Between(t.x, t.y, v.x, v.y) > WALL_HIT_RADIUS) continue;
          if (time - (wall.lastHit.get(v) ?? -Infinity) < WALL_HIT_CD_MS) continue;
          wall.lastHit.set(v, time);
          v.takeDamage(WALL_TENTACLE_DAMAGE + (wall.abyss ? ABYSS_SPIKE_DAMAGE : 0));
          this.applyHopelessness(v, WALL_TENTACLE_HOPELESS);
          this.arena.spawnHitFlash(v.x, v.y, this.col(wall.owner)(wall.abyss ? SHADOW.blood : SHADOW.orchid));
          this.fx(wall.owner).wisps(v.x, v.y, 3, { speed: 70, size: 2.4, life: 340, rise: 14, depth: 7 });
          if (wall.abyss) this.abyssShove(v, t.x, t.y);
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

  /** Abyss: the spikes throw whoever touched them off the limb. */
  private abyssShove(v: Fighter, fromX: number, fromY: number): void {
    if (v.unstoppable || v.knockbackImmune) return;
    const a = Math.atan2(v.y - fromY, v.x - fromX);
    const body = v.body as Phaser.Physics.Arcade.Body;
    body.reset(
      Phaser.Math.Clamp(v.x + Math.cos(a) * ABYSS_SHOVE, 16, this.arena.width - 16),
      Phaser.Math.Clamp(v.y + Math.sin(a) * ABYSS_SHOVE, 24, this.arena.height - 16),
    );
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
  private drawTentacle(t: WallTentacle, time: number, grow: number, owner: 'player' | 'npc', abyss = false): void {
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
      { barbs: t.eyed || abyss ? 5 : 3 },
    );

    if (abyss && grow > 0.5) {
      // Abyss: bone-pale thorns jutting off the root, the part that actually cuts.
      g.lineStyle(2, tint(SHADOW.pale), 0.8 * grow);
      for (let i = 0; i < 4; i++) {
        const a = -Math.PI / 2 + sway + (i - 1.5) * 0.9;
        const r0 = 7 * grow, r1 = 16 * grow;
        const by = t.y + 2 - height * 0.25;
        g.lineBetween(t.x + Math.cos(a) * r0, by + Math.sin(a) * r0 * 0.6,
          t.x + Math.cos(a) * r1, by + Math.sin(a) * r1 * 0.6);
      }
    }

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
        this.arena.spawnHitFlash(v.x, v.y, this.col(b.owner)(SHADOW.lilac));
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
        this.arena.spawnHitFlash(v.x, v.y, this.col(line.owner)(SHADOW.mauve));
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
   * That side's rig: the skin's if one is equipped, shadow's umbral figure otherwise. Built
   * lazily in `updateAvatars` and torn down in `reset`, so changing skin between matches swaps
   * the character.
   */
  private makeAvatar(owner: 'player' | 'npc'): BaseAvatar {
    const { scene } = this.arena;
    const col = owner === 'player' ? this.pcol : this.ncol;
    return makeSkinAvatar(this.arena.skinId(owner), scene) ?? new ShadowAvatar(scene, col);
  }

  /**
   * Builds (on first frame) and drives the ball-arm avatar for whichever fighters are shadow.
   * The player faces the cursor; the NPC faces whoever it is fighting. The mastery passive's
   * shroud lives here too, at a lower depth than the Consume shroud so the two stack into one
   * silhouette rather than fighting each other.
   */
  private updateAvatars(delta: number, isPlayerShadow: boolean, isNpcShadow: boolean): void {
    const { player, npc, scene } = this.arena;

    if (isPlayerShadow && player?.active) {
      if (!this.playerAvatar) this.playerAvatar = this.makeAvatar('player');
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
      if (!this.npcAvatar) this.npcAvatar = this.makeAvatar('npc');
      this.npcAvatar.setFacing(Math.atan2(player.y - npc.y, player.x - npc.x));
      this.npcAvatar.setIntensity(this.npcShadowBlackHoleActive ? 1.3 : 1);
      this.npcAvatar.update(delta, npc.x, npc.y, npc.forceInvisible ? 0 : npc.alpha);
    } else if (this.npcAvatar) {
      this.npcAvatar.destroy();
      this.npcAvatar = null;
    }
  }

  /**
   * Achievement — Unkillable: soak 400 damage in a single fight and still be standing.
   *
   * Read off `Fighter.rawDamageTaken`, which is tallied *before* the incoming-damage
   * multipliers — so the Hopelessness reduction that makes surviving this possible in the
   * first place doesn't quietly stop the damage counting toward it.
   */
  private checkUnkillable(isPlayerShadow: boolean): void {
    const { player } = this.arena;
    if (!isPlayerShadow || !player?.active || player.hp <= 0) return;
    if (player.rawDamageTaken >= UNKILLABLE_DAMAGE) this.arena.unlockAchievement('unkillable');
  }

  // ── Per-frame update (runs before NPC AI so cast state is fresh) ──────

  update(time: number, delta: number, isPlayerShadow: boolean, isNpcShadow: boolean): void {
    if (!isPlayerShadow && !isNpcShadow) return;
    const { player, npc, enemies, scene } = this.arena;

    // The trap picker is built the first frame it is wanted, so it survives a restart without
    // reset() having to know what this match's loadout is — and rebuilt if the loadout changes.
    const trapKinds = isPlayerShadow ? this.trapOptions('player') : [];
    if (trapKinds.length > 1) {
      if (this.trapBarKey !== trapKinds.join(',')) { this.teardownTrapBar(); this.buildTrapBar(trapKinds); }
      this.paintTrapBar(time);
    } else if (this.trapBarSlots.length > 0) {
      this.teardownTrapBar();
    }

    this.updateAvatars(delta, isPlayerShadow, isNpcShadow);
    this.checkUnkillable(isPlayerShadow);
    this.updateDarkBombs(time);
    this.updateCaltrops(time);
    this.updateGlooms(time, delta);
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
              this.arena.spawnHitFlash(t.x, t.y, this.col(cloud.owner)(SHADOW.orchid));
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
        this.releaseGrab(trap);
        trap.gfx.destroy();
        if (this.pendingStake[trap.owner] === trap) this.pendingStake[trap.owner] = null;
        this.shadowSnapTraps.splice(ti, 1);
        continue;
      }
      this.drawTrap(trap, time);
      if (trap.isStake) continue;

      // A grabber that already has hold of something is busy until its hold runs out.
      if (trap.kind === 'grabber' && trap.grabbed) {
        if (!trap.grabbed.active || trap.grabbed.hp <= 0 || time >= (trap.grabUntil ?? 0)) {
          this.releaseGrab(trap);
          trap.triggered = true;
        }
        continue;
      }

      // A claymore does not wait to be stepped on: anything in its line of sight sets it off.
      const springs = (v: Fighter) => trap.kind === 'claymore'
        ? this.inClaymoreSight(trap, v, CLAYMORE_SIGHT)
        : Phaser.Math.Distance.Between(trap.x, trap.y, v.x, v.y) <= trap.radius + 10;
      const victims: Fighter[] = trap.owner === 'player' ? enemies : [player];
      for (const t of victims) {
        if (!t.active || t.hp <= 0 || !springs(t)) continue;
        this.springTrap(trap, t, time);
        break;
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
            this.arena.spawnHitFlash(npc.x, npc.y, this.pcol(SHADOW.amethyst));
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
            const reach = this.arena.hasPerk('npc', 'shadow-abyss') ? ABYSS_TENTACLE_REACH : 100;
            const tipX = this.npcShadowTentacleHooked ? player.x : npc.x + Math.cos(angle) * reach;
            const tipY = this.npcShadowTentacleHooked ? player.y : npc.y + Math.sin(angle) * reach;
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
            this.arena.spawnHitFlash(t.x, t.y, this.pcol(SHADOW.amethyst));
          }
        }
      }
    }

    // Death perk: grabbers hold their catch on a leash. Position-clamped, so it has to run
    // after everything that writes movement this frame.
    this.updateGrabs(time);

    // Stun from snap trap
    if (time < this.shadowNpcStunnedUntil) nBody.setVelocity(0, 0);
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
    void delta;
    if (this.arena.nukeChanneling) return;
    const { player, eKey, rKey, fKey, qKey } = this.arena;
    const playerCtx = this.arena.buildPlayerContext(mouseX, mouseY);
    // Cached for the avatar rig, which runs in update() and has no pointer of its own.
    this.aimX = mouseX;
    this.aimY = mouseY;

    // A press that lands on the trap picker is picking a trap, not attacking — and stays that
    // way until it is let go, even if it drags off the bar.
    if (pointer.isDown && !this.arena.pointerWasDown) this.pressOnTrapBar = this.pointerOnTrapBar(pointer);
    if (!pointer.isDown) this.pressOnTrapBar = false;
    // Held Click keeps throwing caltrops as fast as the cooldown allows.
    if (pointer.isDown && !this.pressOnTrapBar && !this.pointerOnTrapBar(pointer)) {
      player.castAbility('shadow-caltrop', playerCtx);
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
      // Black Hole, or Grim Gloom when the alternate ultimate is swapped in.
      const ult = player.element.abilities.find((a) => a.isUltimate)?.id ?? 'black-hole';
      player.castAbility(ult, playerCtx);
    }
  }

  /**
   * Ruin's Spikes of Ruin (see `combat/SummonPurge.ts`).
   * Tentacle walls, mortar beacons, caltrops and snap traps. A trap taken out takes its triplines
   * with it — a line with only one end left would hang in the air trailing off a dead stake.
   */
  purgeSummons(
    x: number, y: number, radius: number, exceptOwner: 'player' | 'npc',
    report?: (px: number, py: number) => void,
  ): number {
    const near = (px: number, py: number): boolean => {
      if (Phaser.Math.Distance.Between(x, y, px, py) > radius) return false;
      report?.(px, py);
      return true;
    };
    let razed = 0;
    for (let i = this.walls.length - 1; i >= 0; i--) {
      const w = this.walls[i];
      if (w.owner === exceptOwner) continue;
      const inside = w.tentacles.filter((t) => near(t.x, t.y));
      if (inside.length === 0) continue;
      for (const t of inside) {
        t.gfx.destroy();
        w.tentacles.splice(w.tentacles.indexOf(t), 1);
        razed++;
      }
      // A wall with nothing left standing stops trying to grow the rest of itself.
      if (w.tentacles.length === 0) { w.pending = 0; this.walls.splice(i, 1); }
    }
    for (let i = this.beacons.length - 1; i >= 0; i--) {
      const b = this.beacons[i];
      if (b.owner === exceptOwner || !near(b.x, b.y)) continue;
      b.gfx.destroy();
      b.dotGfx.destroy();
      this.beacons.splice(i, 1);
      razed++;
    }
    for (let i = this.caltrops.length - 1; i >= 0; i--) {
      const c = this.caltrops[i];
      if (c.owner === exceptOwner || !c.landed || !near(c.x, c.y)) continue;
      this.caltrops.splice(i, 1);
      razed++;
    }
    for (let i = this.shadowSnapTraps.length - 1; i >= 0; i--) {
      const t = this.shadowSnapTraps[i];
      if (t.owner === exceptOwner || !near(t.x, t.y)) continue;
      for (let j = this.triplines.length - 1; j >= 0; j--) {
        const line = this.triplines[j];
        if (line.a !== t && line.b !== t) continue;
        line.gfx.destroy();
        this.triplines.splice(j, 1);
      }
      t.gfx.destroy();
      this.shadowSnapTraps.splice(i, 1);
      razed++;
    }
    return razed;
  }
}
