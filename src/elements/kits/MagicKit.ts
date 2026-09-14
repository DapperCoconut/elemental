import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import {
  ArmGesture, MAGIC, MagicAura, MagicAuraStyle, MagicAvatar, MagicColorFn, MagicFx,
  arcaneRing, runeOrb, sigilStarLayered, vineLash,
} from './MagicVisuals';
import { meterGain } from '../../combat/Meters';

// ── Arena API ─────────────────────────────────────────────────────────────────

export interface MagicArenaApi {
  get player(): Fighter;
  get npc(): Fighter;
  get enemies(): Fighter[];
  get scene(): Phaser.Scene;
  get projectiles(): Phaser.Physics.Arcade.Group;
  get eKey(): Phaser.Input.Keyboard.Key;
  get qKey(): Phaser.Input.Keyboard.Key;
  get fKey(): Phaser.Input.Keyboard.Key;
  get rKey(): Phaser.Input.Keyboard.Key;
  get leftKey(): Phaser.Input.Keyboard.Key;
  get rightKey(): Phaser.Input.Keyboard.Key;
  get nukeChanneling(): boolean;
  set nukeChanneling(v: boolean);
  get nukeChannelEnd(): number;
  set nukeChannelEnd(v: number);
  get npcNukeChanneling(): boolean;
  set npcNukeChanneling(v: boolean);
  get npcNukeChannelEnd(): number;
  set npcNukeChannelEnd(v: number);
  get playerSpeedMult(): number;
  set playerSpeedMult(v: number);
  get npcSpeedMult(): number;
  set npcSpeedMult(v: number);
  getSceneWidth(): number;
  getSceneHeight(): number;
  hasUpgrade(slot: string): boolean;
  hasPerk(owner: 'player' | 'npc', perkId: string): boolean;
  dealAoeDamageFromOwner(x: number, y: number, r: number, d: number, o: 'player' | 'npc'): void;
  spawnHitFlash(x: number, y: number, color: number): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  spawnDamageNumber(x: number, y: number, amount: number): void;
  /** True only when the player is magic AND Magic Mastery is switched on. */
  get masteryActive(): boolean;
  /** Mastery enhancement id bound over the given ability slot, or null if that slot is unchanged. */
  masteryBindFor(slot: string): string | null;
  /** Online: broadcast a bindable mastery cast so the peer's sim replays it. */
  broadcastMasteryCast(enhId: string): void;
  /** Cumulative (additive) mastery progress stat. */
  recordMasteryStat(key: string, amount: number): void;
  /** Current value of a mastery progress stat (0 if never recorded). */
  getMasteryStat(key: string): number;
  /** Ratchet a mastery progress stat up to `value` — no-op if the stored value is already >= value. */
  recordMasteryBestStat(key: string, value: number): void;
  /** True when the local player is Magic — drives their rig, auras and world art. */
  get isPlayerMagic(): boolean;
  /** True when the opponent is Magic. */
  get isNpcMagic(): boolean;
  /** `(owner, base) => displayed` — the owner's skin, or the identity. */
  magicColor(owner: 'player' | 'npc', base: number): number;
}

// ── Internal types ────────────────────────────────────────────────────────────

// Every world object below is plain data painted into the kit's own Graphics layers — nothing
// owns a sprite, so a cloud can boil, a funnel can turn and an orb can crack.

interface FlameCloud {
  /** Fixed wobble seed, so a cloud keeps its shape instead of reshuffling frame to frame. */
  seed: number;
  x: number; y: number;
  vx: number; vy: number;
  expireAt: number;
  tickAccum: number;
  radius: number;
  tickDmg: number;
  tickInterval: number;
  burnDuration: number;
  owner: 'player' | 'npc';
  /** Steers after the caster's cursor (the enemy stands in for it on a bot's Flare). */
  homing: boolean;
  /** Net angle swept around the cursor. One full lap (±2π) cuts the homing for good. */
  orbitAccum: number;
  prevAngle: number;
  speed: number;
  cursedFire?: boolean;   // Flare+: the burn it applies is the shadow DOT
  aura?: boolean;         // Flare+: paint (and damage through) the dark shell around it
}

interface StormCloud {
  seed: number;
  /** Painted radius — the pulse reach is separate and much wider. */
  radius: number;
  x: number; y: number;
  expireAt: number;
  nextPulseAt: number;
  pulseInterval: number;
  pulseRadius: number;
  pulseDmg: number;
  owner: 'player' | 'npc';
  isAcidCloud?: boolean; // if true, apply darkVuln stacks instead of slow
}

interface RockOrb {
  angle: number;
  /** Live world position, resolved each frame so hit checks and painting agree. */
  x: number; y: number;
  radius: number;
  cracked: boolean;
  lastHitAt: number;
  canCrack: boolean;
  dmg: number;
  owner: 'player' | 'npc';
}

interface RockOrbSet {
  orbs: RockOrb[];
  expireAt: number;
  orbitR: number;
}

interface Tornado {
  seed: number;
  radius: number;
  /** Hurricane Vacuum funnels are ash-dark; a plain Tornado Blast is grey. */
  dark: boolean;
  x: number; y: number;
  vx: number; vy: number;
  expireAt: number;
  nextDirAt: number;
  tickAccum: number;
  /** Damage per 200ms contact tick — the wind elemental's minis hit far harder than a hurricane. */
  tickDmg: number;
  owner: 'player' | 'npc';
}

interface ThornPrison {
  ex: number; ey: number;
  chainsHp: [number, number, number, number];
  owner: 'player' | 'npc';
  expireAt: number;
  dotAccum: number;
}

interface SparkleShot {
  proj: Phaser.GameObjects.Image;
  startX: number; startY: number;
  maxDist: number;
  stationaryAccum: number;
  exploded: boolean;
  owner: 'player' | 'npc';
  leaderId?: string; // id of the leader sparkle this one trails
  trailOffset?: number; // px behind leader
  damageMult?: number; // 0.75 for trailing sparkles
  angle?: number; // cached aim angle for trail positioning
  id?: string; // unique id for leader/follower linking
}

interface TempleSet {
  anchorX: number; anchorY: number;
  /** Monuments are bigger, darker stone than temples. */
  monument: boolean;
  orbs: RockOrb[];
  expireAt: number;
  orbitR: number;
  owner: 'player' | 'npc';
  contactDmg: number;
  slowMs: number;  // non-zero → apply dark80Slow instead of stun
  stunMs: number;  // non-zero → stun on contact
}

interface TortureTrapLink {
  target: Fighter;
  expireAt: number; // Date.now() based
  tickAccum: number;
  owner: 'player' | 'npc';
}

/** An instant vine arm, held for a few frames after the lash lands. */
interface VineFlash {
  x1: number; y1: number;
  x2: number; y2: number;
  hit: boolean;
  expireAt: number;
}

/**
 * Splash's pool. Plain data on the floor rather than a cloud in the air, because the whole point
 * of the spell is that you have to be standing *in* it — and of Splash+, that once you are you
 * cannot dash out.
 */
interface MagicPuddle {
  seed: number;
  x: number; y: number;
  radius: number;
  expireAt: number;
  tickAccum: number;
  tickDmg: number;
  /** Multiplier applied to the victim's move speed while they stand in it. */
  slowMult: number;
  /** Splash+ — dashes, blinks and the dodge roll are all refused inside. */
  putrid: boolean;
  owner: 'player' | 'npc';
}

/** One Spur barb lying on the floor, waiting to be stepped on. */
interface SpurBarb {
  x: number; y: number;
  seed: number;
  spin: number;
  expireAt: number;
  /** Spur+ barbs also stick a bur into whoever trod on them, feeding the 5-bur pin. */
  sticky: boolean;
  owner: 'player' | 'npc';
}

/** One Spur+ bur stuck in somebody, counting toward the 5-bur pin. */
interface Bur {
  x: number; y: number;
  vx: number; vy: number;
  /** Null while in flight; the victim once it has stuck. */
  stuck: Fighter | null;
  /** Offset from the victim's centre, so a clutch of burs reads as a clutch. */
  ox: number; oy: number;
  spin: number;
  expireAt: number;
  /** Spur+ burs stick and count toward the 5-bur stun; plain ones just hit and drop. */
  sticky: boolean;
  owner: 'player' | 'npc';
}

/** The five things the Necronomicon can call up — one per base element. */
type SummonKind = 'fire' | 'water' | 'life' | 'wind' | 'earth';

/**
 * A conjured familiar. It has health, it can be killed, and it fights on its own — the caster
 * only decides which one to call and when. `plus` is baked in at summon time rather than read
 * from the upgrade each frame, so a Dupe copy is always the same tier as the thing it copied.
 */
interface Summon {
  kind: SummonKind;
  x: number; y: number;
  hp: number; maxHp: number;
  expireAt: number;
  nextActAt: number;
  /** Q+ signature move, on its own much slower clock than the ordinary attack. */
  nextBigAt: number;
  plus: boolean;
  seed: number;
  bob: number;
  /** Patrol velocity along the top of the screen — the elementals assist from the gallery. */
  pvx: number;
  /** Alternates the elemental between its two assist behaviours. */
  alt: boolean;
  owner: 'player' | 'npc';
}

/** An ordinary familiar attack in flight — Fire and Water throw; the rest reach out and touch. */
interface SummonBolt {
  kind: SummonKind;
  x: number; y: number;
  vx: number; vy: number;
  owner: 'player' | 'npc';
}

/** Fire+ — a bomb that goes off as a cross of four long pillars. */
interface CrossBomb {
  x: number; y: number;
  armAt: number;
  expireAt: number;
  fired: boolean;
  owner: 'player' | 'npc';
}

/** Life+ — one spike of the root barrage. Individually trivial; there are a great many. */
interface RootSpike {
  x: number; y: number;
  armAt: number;
  expireAt: number;
  fired: boolean;
  seed: number;
  owner: 'player' | 'npc';
}

/** Earth+ — a hole in the arena floor. Whoever steps in falls, whichever side they are on. */
interface GroundCrack {
  x: number; y: number;
  radius: number;
  armAt: number;
  expireAt: number;
  seed: number;
  owner: 'player' | 'npc';
}

/** Somebody currently down a crack, and when the arena gives them back. */
interface FallenFighter {
  f: Fighter;
  returnAt: number;
}

/**
 * The R mark. A crosshair is a *machine you crank*: while it sits on the marked fighter, every
 * click on them conjures one small homing missile. Three seconds is the whole window, so the
 * spell rewards clicking as fast as the hand allows.
 */
interface Crosshair {
  target: Fighter;
  /** Missiles bought so far — painted as pips so the reticle shows the spell working. */
  clicks: number;
  expireAt: number;
  spin: number;
  owner: 'player' | 'npc';
}

/** A Magic Missile in flight: small, homing, and worth exactly 2 damage. */
interface MagicMissile {
  x: number; y: number;
  vx: number; vy: number;
  target: Fighter;
  owner: 'player' | 'npc';
}

/** The Gust+ electricity trail: a polyline laid down along the dash, live for 8 seconds. */
interface SparkTrail {
  pts: { x: number; y: number }[];
  expireAt: number;
  seed: number;
  owner: 'player' | 'npc';
}

/** Somebody caught in a Gust and being dragged back to where it was cast from. */
interface GustHaul {
  target: Fighter;
  toX: number; toY: number;
  expireAt: number;
  tickAccum: number;
  owner: 'player' | 'npc';
}

/** One rectangular link in a Ward+ barrier — part wall, part shrapnel once it lets go. */
interface WardLink {
  /** Angle around the ring while it is still part of the wall. */
  angle: number;
  x: number; y: number;
  /** Set once the link has torn free and is flying. */
  vx: number; vy: number;
  free: boolean;
  hit: boolean;
  spin: number;
}

/**
 * The Ward: a standing circle that armours its caster while they hold their ground in it —
 * +3 shield HP a second and a 25% damage cut, both of them loans that leaving claws back.
 * Ward+ stands the linked wall on the circle's edge.
 */
interface WardZone {
  x: number; y: number;
  radius: number;
  seed: number;
  expireAt: number;
  /** Empty on a plain Ward — the wall is what the upgrade buys. */
  links: WardLink[];
  /** When links start tearing free and flying off. */
  sheddingAt: number;
  nextShedAt: number;
  plus: boolean;
  owner: 'player' | 'npc';
}

/** What one F cast recorded: a kind tag, the offset from the square's centre, life left, data. */
interface ScrollItem {
  kind: 'flame' | 'puddle' | 'barb' | 'tornado' | 'trail' | 'summon' | 'ward';
  dx: number; dy: number;
  remaining: number;
  payload: any;
}

/** The Duplication scroll on the floor: everything the square recorded, waiting to be dropped. */
interface Scroll {
  x: number; y: number;
  items: ScrollItem[];
  expireAt: number;
  seed: number;
  owner: 'player' | 'npc';
}

/** The purple flash over the square F just recorded. */
interface CaptureFlash {
  x: number; y: number;
  half: number;
  expireAt: number;
  owner: 'player' | 'npc';
}

/** Fire elemental — a column of flame telegraphed on the floor, then lit. */
interface FirePillar {
  x: number; y: number;
  armAt: number;
  expireAt: number;
  fired: boolean;
  seed: number;
  owner: 'player' | 'npc';
}

/** Wind elemental — a strike telegraphed on the floor, then a bolt out of a clear sky. */
interface LightningStroke {
  x: number; y: number;
  strikeAt: number;
  owner: 'player' | 'npc';
}

/** Earth elemental — a straight run of linked slabs, solid to the enemy and their shots only. */
interface EarthWall {
  x1: number; y1: number;
  x2: number; y2: number;
  expireAt: number;
  owner: 'player' | 'npc';
}

/** Life elemental — a mote of green light homing back to the caster with health in it. */
interface HealOrb {
  x: number; y: number;
  vx: number; vy: number;
  owner: 'player' | 'npc';
}

/** Water elemental — a travelling wave front that carries whoever it hits toward the wall. */
interface Wave {
  x: number; y: number;
  vx: number; vy: number;
  seed: number;
  owner: 'player' | 'npc';
}

/** Somebody wave-carried, and owed a slam if the wall arrives before the ride ends. */
interface WaveSlam {
  target: Fighter;
  vx: number; vy: number;
  until: number;
  owner: 'player' | 'npc';
}

/** Every ability drives an arm gesture, on the NPC rig as well as the player's. */
const CAST_GESTURES: Record<string, ArmGesture> = {
  'magic-sparkle-shot': 'punch',
  'magic-grimoire': 'sweep',
  'magic-anchor': 'slam',
  'magic-meditate': 'flex',
  'magic-necronomicon': 'raise',
};

// ── Wheel data ────────────────────────────────────────────────────────────────

// Exported because the codex showcase opens the same two wheels the arena does.
export const GRIMOIRE_LABELS  = ['🔥 Flare', '🌊 Splash', '🌿 Spur', '💨 Gust', '🪨 Ward'];
export const GRIMOIRE_COLORS  = [0xff7733, 0x3388ff, 0x33aa44, 0x888888, 0x885522];
export const NECRO_LABELS     = ['🔥 Fire', '🌊 Water', '🌿 Life', '💨 Wind', '🪨 Earth'];
export const NECRO_COLORS     = [0xcc2200, 0x1144aa, 0x226622, 0x444444, 0x553311];

// ── Decay (divine perk) ───────────────────────────────────────────────────────
/**
 * What a corrupted spell charges to cast. These are the meter's only sources: Dupe is free, and
 * F+ Corrupted Data is the only thing that takes any of it back off. Buying a book upgrade is
 * therefore a decision about how many casts you have left before the bar kills you, not a
 * straight improvement — which is what makes F+ the third purchase rather than an optional one.
 */
const DARK_GRIMOIRE_COST = 25;
const DARK_NECRO_COST = 50;

/** Dark energy charged for buying the Grimoire's cooldown back. */
const DECAY_GRIMOIRE_COST = 25;
/** …and for the Necronomicon's. One point short of the 100 that kills you outright. */
const DECAY_NECRO_COST = 99;

/**
 * The upgraded wheels. These are not a mode you toggle any more — buying the E (or Q) upgrade
 * swaps the whole book over, so a wheel shows exactly the five spells it is actually going to
 * cast. Colours darken to match: every enhanced spell is the same spell gone corrupt.
 */
export const DARK_GRIMOIRE_LABELS = ['🔥 Flare+', '🌊 Splash+', '🌿 Spur+', '💨 Gust+', '🪨 Ward+'];
export const DARK_GRIMOIRE_COLORS = [0x662233, 0x336644, 0x22aa44, 0x6688aa, 0x775533];
export const DARK_NECRO_LABELS    = ['🔥 Fire+', '🌊 Water+', '🌿 Life+', '💨 Wind+', '🪨 Earth+'];
export const DARK_NECRO_COLORS    = [0xcc1100, 0x112255, 0x226633, 0x333333, 0x442200];

// ── MagicKit ──────────────────────────────────────────────────────────────────

export class MagicKit {
  // ── Visuals ────────────────────────────────────────────────────────────
  /** Colour mappers + effect painters, one per owner so a skin recolours one side. */
  private readonly pcol: MagicColorFn;
  private readonly ncol: MagicColorFn;
  private readonly pfx: MagicFx;
  private readonly nfx: MagicFx;
  /** The conjurer rig (rune hands, eyes, crown grimoire) for each magic fighter. */
  private playerAvatar: MagicAvatar | null = null;
  private npcAvatar: MagicAvatar | null = null;
  /** Stance tells, per side where both can run one. */
  private auras: Partial<Record<`${'player' | 'npc'}:${MagicAuraStyle}`, MagicAura>> = {};
  /**
   * Two layers, because these objects are not all in the same place. Anchors, temples, scorched
   * runes and prison chains lie on the floor and pass *under* the fighters; clouds, funnels,
   * orbiting stone, sparkles and vines are thrown out in front and pass over.
   */
  private groundGfx: Phaser.GameObjects.Graphics | null = null;
  private airGfx: Phaser.GameObjects.Graphics | null = null;
  /** Shared animation clock for every per-frame painter in this kit. */
  private vizT = 0;
  /** Last cursor position, cached in handleInput — `update` has no pointer of its own. */
  private lastAimX = 0;
  private lastAimY = 0;
  /** Instant vine arms (Draining Thorns / Torture Trap), held for a few frames. */
  private vineFlashes: VineFlash[] = [];

  // ── Player wheel state ────────────────────────────────────────────────────
  private grimoireMenuOpen = false;
  private grimoireMenuGfx: Phaser.GameObjects.Graphics | null = null;
  private grimoireMenuLabels: Phaser.GameObjects.Text[] = [];
  private grimoireSelectedIndex = 0;
  private grimoireHoldStart = 0;
  private grimoireKeyNavUsed = false;
  private grimoireLastPick = 0;

  private necronomiconMenuOpen = false;
  private necronomiconMenuGfx: Phaser.GameObjects.Graphics | null = null;
  private necronomiconMenuLabels: Phaser.GameObjects.Text[] = [];
  private necronomiconSelectedIndex = 0;
  private necronomiconHoldStart = 0;
  private necronomiconKeyNavUsed = false;
  private necronomiconLastPick = 0;

  private aimCountdownLabel: Phaser.GameObjects.Text | null = null;
  private aimCountdownEnd = 0;
  private aimCountdownFired = false;

  // ── R Crosshair / Magic Missiles ──────────────────────────────────────────
  /** At most one per side; the array keeps both without a pair of mirrored fields. */
  private crosshairs: Crosshair[] = [];
  private missiles: MagicMissile[] = [];
  /** Edge detector for the left mouse button — missiles and scroll grabs are per-click. */
  private leftHeld = false;
  /** The bot has no mouse: its crosshair clicks itself on this clock. */
  private npcNextMissileAt = 0;

  // ── F Duplication ─────────────────────────────────────────────────────────
  private scrolls: Scroll[] = [];
  private captureFlashes: CaptureFlash[] = [];
  /** The scroll currently on the player's cursor, if any. */
  private dragScroll: Scroll | null = null;
  /** F+ leavings: glitched copies of the caster shed by an enemy caught in the square. */
  private corruptData: { x: number; y: number; expireAt: number; seed: number }[] = [];

  // ── Chain bind (player bound by NPC's vine) ───────────────────────────────
  private playerBound = false;
  private playerBoundEnd = 0;

  // ── Sparkle shots ─────────────────────────────────────────────────────────
  private sparkleShots: SparkleShot[] = [];

  // ── Flame clouds ──────────────────────────────────────────────────────────
  private flameClouds: FlameCloud[] = [];

  // ── Storm clouds + slow timestamps ───────────────────────────────────────
  private stormClouds: StormCloud[] = [];
  private npcStormSlowUntil = 0;
  private playerStormSlowUntil = 0;

  // ── Rock orbs ─────────────────────────────────────────────────────────────
  private playerRockSet: RockOrbSet | null = null;
  private npcRockSet: RockOrbSet | null = null;

  // ── E1 Flare ──────────────────────────────────────────────────────────────
  /** Flares are flame clouds that keep their speed and burst; the array above holds them. */

  // ── E2 Splash ─────────────────────────────────────────────────────────────
  private puddles: MagicPuddle[] = [];
  /** Resolved once per frame in `update` from whichever pools each side is standing in. */
  private playerPuddleSlow = 1;
  private npcPuddleSlow = 1;

  // ── E3 Spur ───────────────────────────────────────────────────────────────
  private spurBarbs: SpurBarb[] = [];
  private burs: Bur[] = [];
  /** Victims mid-stun from a 5-bur clutch, and the payload owed when it lets go. */
  private burStuns: { target: Fighter; releaseAt: number; owner: 'player' | 'npc' }[] = [];

  // ── E4 Gust ───────────────────────────────────────────────────────────────
  private sparkTrails: SparkTrail[] = [];
  private gustHauls: GustHaul[] = [];
  /** Set each frame while the caster is standing on their own Gust+ trail. */
  private playerTrailBoost = false;

  // ── E5 Ward ───────────────────────────────────────────────────────────────
  private wardZones: WardZone[] = [];
  /** Shield HP this side's zones have granted and not yet clawed back, plus the fractional drip. */
  private wardShieldGranted = { player: 0, npc: 0 };
  private wardShieldAccum = { player: 0, npc: 0 };
  /** Resolved once per frame — feeds the resistance multiplier and the enter/leave book-keeping. */
  private wardInside = { player: false, npc: false };

  // ── Q Summons ─────────────────────────────────────────────────────────────
  private summons: Summon[] = [];
  private summonBolts: SummonBolt[] = [];
  private firePillars: FirePillar[] = [];
  private lightningStrokes: LightningStroke[] = [];
  private earthWalls: EarthWall[] = [];
  private healOrbs: HealOrb[] = [];
  private waves: Wave[] = [];
  private waveSlams: WaveSlam[] = [];
  private crossBombs: CrossBomb[] = [];
  private rootSpikes: RootSpike[] = [];
  private groundCracks: GroundCrack[] = [];
  private fallen: FallenFighter[] = [];
  /** Water+ — the arena-wide wash, one timestamp per side that is *suffering* it. */
  private playerFloodUntil = 0;
  private npcFloodUntil = 0;
  /** Wind+ — the tornado whose eye is currently buffing the player, if any. */
  private hurricaneEye: Tornado | null = null;

  // ── Tornadoes ─────────────────────────────────────────────────────────────
  private tornadoes: Tornado[] = [];

  // ── Thorn prisons ─────────────────────────────────────────────────────────
  private thornPrison: ThornPrison | null = null;
  private npcThornPrison: ThornPrison | null = null;

  // ── Darkness system (player only; NPC never uses upgrades) ────────────────
  private darkness = 0;
  /**
   * Dark Magic, per book. Owning the upgrade does not commit you to the corrupted five — it puts
   * a button at the hub of that wheel, and the mode it sets persists between casts. Keeping it a
   * choice is what stops the upgrade from being a four-cast clock you cannot opt out of.
   */
  private darkGrimoireMode = false;
  private darkNecroMode = false;
  /** Edge detector for the hub button, so holding the mouse down does not strobe the mode. */
  private darkCenterPressed = false;
  private darknessBarGfx: Phaser.GameObjects.Graphics | null = null;
  private darknessBarText: Phaser.GameObjects.Text | null = null;



  // ── Dark status effects (internal to kit) ─────────────────────────────────
  private npcCursedFireUntil = 0;
  private npcCursedFireTickAccum = 0;
  private npcDark80SlowUntil = 0;

  // ── Dark Gale cone (E+ Recalling Gale / Q+ Hurricane initial pull) ─────────
  private playerHurricaneGaleUntil = 0;
  private playerHurricaneGaleAngle = 0;
  private playerHurricaneGaleOnce = false;

  // ── Temple/Monument orb sets (fixed-anchor orbits) ────────────────────────
  private templeSets: TempleSet[] = [];

  // ── Torture trap links ────────────────────────────────────────────────────
  private tortureTrapLinks: TortureTrapLink[] = [];

  // ── Thunder perk (abstract-triple) ────────────────────────────────────────
  private playerThunderECharged = false;
  private playerThunderQCharged = false;
  private npcThunderECharged = false;
  private npcThunderQCharged = false;

  // ── Magic Mastery — Transmogrify ────────────────────────────────────────
  private static readonly TRANSMOGRIFY_COOLDOWN_MS = 12000;
  private static readonly TRANSMOGRIFY_CHICKEN_MS = 8000;
  private transmogrifyLastCastAt = 0;
  private transmogrifyProjectiles: {
    x: number; y: number; vx: number; vy: number;
    owner: 'player' | 'npc';
  }[] = [];
  private chickenStates = new Map<Fighter, { angle: number; nextTurnAt: number; prevCooldownMult: number }>();

  constructor(private api: MagicArenaApi) {
    // Built here, not as field initialisers, so they see the injected api.
    this.pcol = (base) => api.magicColor('player', base);
    this.ncol = (base) => api.magicColor('npc', base);
    this.pfx = new MagicFx(api.scene, this.pcol);
    this.nfx = new MagicFx(api.scene, this.ncol);
  }

  // ── Visual helpers ─────────────────────────────────────────────────────

  /** Effect painter for a side. */
  private fx(owner: 'player' | 'npc'): MagicFx { return owner === 'player' ? this.pfx : this.nfx; }
  /** Colour mapper for a side. */
  private col(owner: 'player' | 'npc'): MagicColorFn { return owner === 'player' ? this.pcol : this.ncol; }
  /** The rig for a side, if that side is playing Magic. */
  private avatarFor(owner: 'player' | 'npc'): MagicAvatar | null {
    return owner === 'player' ? this.playerAvatar : this.npcAvatar;
  }
  private fighter(owner: 'player' | 'npc'): Fighter {
    return owner === 'player' ? this.api.player : this.api.npc;
  }
  /** Fire one arm gesture on the rig of whichever side cast. */
  private gesture(owner: 'player' | 'npc', abilityId: string, angle?: number): void {
    const g = CAST_GESTURES[abilityId];
    if (g) this.avatarFor(owner)?.play(g, angle);
  }

  /** The floor layer, under the fighters. Rebuilt lazily after a reset. */
  private ground(): Phaser.GameObjects.Graphics {
    if (!this.groundGfx || !this.groundGfx.active) {
      this.groundGfx = this.api.scene.add.graphics().setDepth(3);
    }
    return this.groundGfx;
  }

  /** The thrown-out-in-front layer, over the fighters. Rebuilt lazily after a reset. */
  private air(): Phaser.GameObjects.Graphics {
    if (!this.airGfx || !this.airGfx.active) {
      this.airGfx = this.api.scene.add.graphics().setDepth(9);
    }
    return this.airGfx;
  }

  /** Build/tear down one stance aura from a single "is it up?" flag. */
  private syncAura(
    owner: 'player' | 'npc', style: MagicAuraStyle, on: boolean,
    delta: number, intensity: number, angle: number, radius = 28,
  ): void {
    const key = `${owner}:${style}` as const;
    let aura = this.auras[key];
    const f = this.fighter(owner);
    if (!on || !f?.active) {
      if (aura) { aura.destroy(); delete this.auras[key]; }
      return;
    }
    if (!aura) {
      aura = new MagicAura(this.api.scene, this.col(owner), style, radius, style === 'darkness' ? 4 : 5);
      this.auras[key] = aura;
    }
    aura.setIntensity(intensity);
    aura.setAngle(angle);
    aura.update(delta, f.x, f.y, f.forceInvisible ? 0 : f.alpha);
  }

  private destroyAuras(): void {
    for (const a of Object.values(this.auras)) a?.destroy();
    this.auras = {};
  }

  // ── Public getters (queried by ArenaScene) ────────────────────────────────

  isPlayerBound(time: number): boolean {
    return this.playerBound && time < this.playerBoundEnd;
  }

  getPlayerSlowMult(): number {
    const now = this.api.scene.sys.game.loop.now;
    return (now < this.playerStormSlowUntil ? 0.5 : 1.0)
      * (now < this.playerFloodUntil ? 0.8 : 1.0)
      * this.playerPuddleSlow;
  }

  getNpcSlowMult(): number {
    const now = this.api.scene.sys.game.loop.now;
    return (now < this.npcStormSlowUntil ? 0.5 : 1.0)
      * (now < this.npcFloodUntil ? 0.8 : 1.0)
      * this.npcPuddleSlow;
  }

  /** Gust+ — your own electricity trail is a road, and roads are faster than fields. */
  getPlayerSpeedBoostMult(): number {
    return this.playerTrailBoost ? 1.25 : 1;
  }

  getNpcDark80SlowMult(): number {
    const now = this.api.scene.sys.game.loop.now;
    return now < this.npcDark80SlowUntil ? 0.2 : 1;
  }

  isThunderCharged(slot: 'e' | 'q'): boolean {
    return slot === 'e' ? this.playerThunderECharged : this.playerThunderQCharged;
  }

  // ── reset ─────────────────────────────────────────────────────────────────

  reset(): void {
    // Visuals — every GameObject dies with the old scene run, so rebuild lazily in update().
    if (this.playerAvatar) { this.playerAvatar.destroy(); this.playerAvatar = null; }
    if (this.npcAvatar) { this.npcAvatar.destroy(); this.npcAvatar = null; }
    this.destroyAuras();
    if (this.groundGfx) { this.groundGfx.destroy(); this.groundGfx = null; }
    if (this.airGfx) { this.airGfx.destroy(); this.airGfx = null; }
    this.vizT = 0;
    this.lastAimX = 0;
    this.lastAimY = 0;
    this.vineFlashes = [];

    this.grimoireMenuOpen = false;
    if (this.grimoireMenuGfx) { this.grimoireMenuGfx.destroy(); this.grimoireMenuGfx = null; }
    for (const l of this.grimoireMenuLabels) l.destroy();
    this.grimoireMenuLabels = [];
    this.grimoireSelectedIndex = 0; this.grimoireHoldStart = 0;
    this.grimoireKeyNavUsed = false; this.grimoireLastPick = 0;

    this.necronomiconMenuOpen = false;
    if (this.necronomiconMenuGfx) { this.necronomiconMenuGfx.destroy(); this.necronomiconMenuGfx = null; }
    for (const l of this.necronomiconMenuLabels) l.destroy();
    this.necronomiconMenuLabels = [];
    this.necronomiconSelectedIndex = 0; this.necronomiconHoldStart = 0;
    this.necronomiconKeyNavUsed = false; this.necronomiconLastPick = 0;

    if (this.aimCountdownLabel) { this.aimCountdownLabel.destroy(); this.aimCountdownLabel = null; }
    this.aimCountdownEnd = 0; this.aimCountdownFired = false;

    this.crosshairs = [];
    this.missiles = [];
    this.leftHeld = false;
    this.npcNextMissileAt = 0;

    this.scrolls = [];
    this.captureFlashes = [];
    this.dragScroll = null;
    this.corruptData = [];

    this.playerBound = false; this.playerBoundEnd = 0;

    for (const s of this.sparkleShots) { if ((s.proj as any).active) { s.proj.setActive(false).setVisible(false); } }
    this.sparkleShots = [];

    this.flameClouds = [];

    this.stormClouds = [];
    this.npcStormSlowUntil = 0; this.playerStormSlowUntil = 0;

    this.playerRockSet = null;
    this.npcRockSet = null;

    this.puddles = [];
    this.playerPuddleSlow = 1; this.npcPuddleSlow = 1;
    this.spurBarbs = [];
    this.burs = [];
    this.burStuns = [];
    this.sparkTrails = [];
    this.gustHauls = [];
    this.playerTrailBoost = false;
    this.wardZones = [];
    this.wardShieldGranted = { player: 0, npc: 0 };
    this.wardShieldAccum = { player: 0, npc: 0 };
    this.wardInside = { player: false, npc: false };

    this.summons = [];
    this.summonBolts = [];
    this.firePillars = [];
    this.lightningStrokes = [];
    this.earthWalls = [];
    this.healOrbs = [];
    this.waves = [];
    this.waveSlams = [];
    this.crossBombs = [];
    this.rootSpikes = [];
    this.groundCracks = [];
    // Anyone still down a hole when the match ends has to be handed their body back.
    for (const fa of this.fallen) if (fa.f) fa.f.forceInvisible = false;
    this.fallen = [];
    this.playerFloodUntil = 0; this.npcFloodUntil = 0;
    this.hurricaneEye = null;
    this.api.player.magicIncomingMult = 1;
    this.api.npc.magicIncomingMult = 1;

    this.tornadoes = [];

    this.thornPrison = null;
    this.npcThornPrison = null;

    // Dark magic state
    this.darkness = 0;
    this.darkGrimoireMode = false;
    this.darkNecroMode = false;
    this.darkCenterPressed = false;
    if (this.darknessBarGfx) { this.darknessBarGfx.destroy(); this.darknessBarGfx = null; }
    if (this.darknessBarText) { this.darknessBarText.destroy(); this.darknessBarText = null; }


    this.npcCursedFireUntil = 0; this.npcCursedFireTickAccum = 0;
    this.npcDark80SlowUntil = 0;
    this.playerHurricaneGaleUntil = 0;

    this.templeSets = [];

    this.tortureTrapLinks = [];

    this.playerThunderECharged = false;
    this.playerThunderQCharged = false;
    this.npcThunderECharged = false;
    this.npcThunderQCharged = false;

    this.transmogrifyLastCastAt = 0;
    this.transmogrifyProjectiles = [];
    for (const [f, st] of this.chickenStates) {
      if (f.active) { f.setTexture(`elem-${f.element.id}`); f.cooldownMult = st.prevCooldownMult; }
      f.chickenUntil = 0;
    }
    this.chickenStates.clear();
    this.api.player.levitating = false;
    this.api.npc.levitating = false;
  }

  /**
   * Ruin Mastery — Second Skin. Transmogrify is the one form in the game somebody else puts you
   * *in*: a different texture, a different cooldown multiplier, and no casting at all while it
   * holds. Ended exactly as `reset()` ends it — texture back to the element sprite, the stored
   * `cooldownMult` handed back, and the timestamp cleared so `Fighter.castAbility` stops
   * refusing.
   */
  revertForms(f: Fighter): string[] {
    const st = this.chickenStates.get(f);
    if (!st) return [];
    if (f.active) {
      f.setTexture(`elem-${f.element.id}`);
      f.cooldownMult = st.prevCooldownMult;
    }
    f.chickenUntil = 0;
    this.chickenStates.delete(f);
    return ['Transmogrify'];
  }

  private addDarkness(amount: number): void {
    const before = this.darkness;
    // Ruin's Combo Breaker halves every meter in the game — the corruption bar included.
    this.darkness = Math.min(100, this.darkness + meterGain(this.api.player, amount));
    this.api.recordMasteryStat('darkEnergyGained', amount);
    const { player } = this.api;
    // The corruption climbing you is the passive's whole cost, so it gets a moment.
    this.pfx.motes(player.x, player.y + 12, 5 + Math.round(amount / 8), {
      speed: 50, size: 2.4, life: 700, color: MAGIC.magenta, drift: -34,
    });
    this.api.showFloatingText(player.x, player.y - 44, `+${amount} ☠`, '#880088');
    if (before < 75 && this.darkness >= 75) {
      // Three-quarters gone: the arena is told, once, that this caster is close to the edge.
      this.pfx.ring(player.x, player.y, 14, 120, MAGIC.magenta, 700, 8, 3);
      this.api.scene.cameras.main.shake(180, 0.004);
    }
    if (this.darkness >= 100) {
      this.pfx.boom(player.x, player.y, 110, {
        color: MAGIC.magenta, sigils: 16, rings: 3, duration: 800,
      });
      this.api.scene.cameras.main.shake(400, 0.009);
      player.applySelfDamage(player.hp);
      this.api.showFloatingText(player.x, player.y - 28, '☠ Consumed by Darkness!', '#220022');
    }
  }

  private _pointToSegDist(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
    const dx = bx - ax, dy = by - ay;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return Phaser.Math.Distance.Between(px, py, ax, ay);
    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
    return Phaser.Math.Distance.Between(px, py, ax + t * dx, ay + t * dy);
  }

  /** Closest approach from a point to a Gust+ trail, measured segment by segment. */
  private _distToTrail(px: number, py: number, tr: SparkTrail): number {
    let best = Infinity;
    for (let i = 0; i < tr.pts.length - 1; i++) {
      const d = this._pointToSegDist(px, py, tr.pts[i].x, tr.pts[i].y, tr.pts[i + 1].x, tr.pts[i + 1].y);
      if (d < best) best = d;
    }
    return best;
  }

  /**
   * Wards: the standing circle, the Ward+ wall on its edge, and the wall coming apart.
   *
   * The buff is a loan, not a gift: +3 shield HP a second and a 25% damage cut while the caster
   * holds their ground inside, and stepping out — or outliving the circle — hands back whatever
   * shield damage has not already spent. The Ward+ wall is solid to people and open to bullets,
   * so an upgraded Ward also decides who is allowed to share the circle.
   */
  private _updateWards(time: number, delta: number, W: number, H: number): void {
    for (let wi = this.wardZones.length - 1; wi >= 0; wi--) {
      const w = this.wardZones[wi];
      const enemies = w.owner === 'player' ? this.api.enemies : [this.api.player];
      const expired = time >= w.expireAt;

      if (expired) {
        // Whatever the shed timer did not get to goes all at once when the ward dies.
        for (const l of w.links) {
          if (l.free) continue;
          l.free = true;
          const a = Math.atan2(l.y - w.y, l.x - w.x);
          l.vx = Math.cos(a) * 420; l.vy = Math.sin(a) * 420;
        }
        if (!w.links.some(l => l.free)) {
          this.fx(w.owner).motes(w.x, w.y, 7, { speed: 60, size: 2.4, life: 700, color: MAGIC.sand, drift: -20 });
          this.wardZones.splice(wi, 1);
          continue;
        }
      }

      // ── The linked wall ──
      if (!expired && time >= w.sheddingAt && time >= w.nextShedAt) {
        const standing = w.links.filter(l => !l.free);
        if (standing.length > 0) {
          const l = standing[Math.floor(Math.random() * standing.length)];
          l.free = true;
          const a = Math.atan2(l.y - w.y, l.x - w.x);
          l.vx = Math.cos(a) * 420; l.vy = Math.sin(a) * 420;
          this.fx(w.owner).sigils(l.x, l.y, 3, { speed: 90, size: 6, life: 360, color: MAGIC.granite, points: 4 });
        }
        w.nextShedAt = time + 190;
      }
      for (let li = w.links.length - 1; li >= 0; li--) {
        const l = w.links[li];
        if (!l.free) continue; // standing links hold their station — the circle does not move
        l.x += l.vx * (delta / 1000);
        l.y += l.vy * (delta / 1000);
        l.spin += delta * 0.006;
        if (l.x < -30 || l.x > W + 30 || l.y < -30 || l.y > H + 30) { w.links.splice(li, 1); continue; }
        if (l.hit) continue;
        for (const e of enemies) {
          if (!e.active || e.hp <= 0) continue;
          if (Phaser.Math.Distance.Between(l.x, l.y, e.x, e.y) > 24) continue;
          l.hit = true;
          e.takeDamage(10);
          this.api.spawnHitFlash(e.x, e.y, MAGIC.granite);
          if (!e.knockbackImmune) {
            const a = Math.atan2(l.vy, l.vx);
            (e.body as Phaser.Physics.Arcade.Body).setVelocity(Math.cos(a) * 520, Math.sin(a) * 520);
          }
          this.fx(w.owner).boom(l.x, l.y, 42, { color: MAGIC.stone, sigils: 5, rings: 1, duration: 340, mark: false });
          break;
        }
      }
      if (expired && w.links.length === 0) { this.wardZones.splice(wi, 1); continue; }

      // The wall is solid to people. Anyone straddling it gets put back on the side they came in
      // from — bullets pass through untouched, which is the trade the upgrade makes.
      if (!expired) {
        const wallR = w.radius + 16;
        for (const e of enemies) {
          if (!e.active || e.hp <= 0) continue;
          const d = Phaser.Math.Distance.Between(w.x, w.y, e.x, e.y);
          if (Math.abs(d - wallR) > 15) continue;
          if (!w.links.some(l => !l.free && Phaser.Math.Distance.Between(l.x, l.y, e.x, e.y) <= 34)) continue;
          const a = Math.atan2(e.y - w.y, e.x - w.x);
          const target = d >= wallR ? wallR + 16 : wallR - 16;
          e.setPosition(w.x + Math.cos(a) * target, w.y + Math.sin(a) * target);
        }
      }
    }

    // ── The buff, resolved once per side so overlapping or duped circles cannot stack ──
    for (const owner of ['player', 'npc'] as const) {
      const f = this.fighter(owner);
      const inside = f.active && f.hp > 0 && this.wardZones.some(z =>
        z.owner === owner && time < z.expireAt
        && Phaser.Math.Distance.Between(z.x, z.y, f.x, f.y) <= z.radius);
      if (inside) {
        if (!this.wardInside[owner]) {
          this.wardInside[owner] = true;
          this.api.showFloatingText(f.x, f.y - 34, '🪨 WARDED', '#cc9944');
        }
        this.wardShieldAccum[owner] += delta * (3 / 1000);
        const whole = Math.floor(this.wardShieldAccum[owner]);
        if (whole > 0) {
          this.wardShieldAccum[owner] -= whole;
          f.shieldHp += whole;
          this.wardShieldGranted[owner] += whole;
        }
      } else if (this.wardInside[owner]) {
        this.wardInside[owner] = false;
        this.wardShieldAccum[owner] = 0;
        // The circle takes its stone back — only what damage has not already spent.
        const back = Math.min(f.shieldHp, this.wardShieldGranted[owner]);
        if (back > 0) {
          f.shieldHp -= back;
          this.api.showFloatingText(f.x, f.y - 34, `🪨 -${Math.round(back)} ward`, '#997744');
        }
        this.wardShieldGranted[owner] = 0;
      }
    }
  }

  // ── handleInput (player only) ─────────────────────────────────────────────

  handleInput(
    time: number,
    _delta: number,
    _pointer: Phaser.Input.Pointer,
    mouseX: number,
    mouseY: number,
  ): void {
    const { eKey, qKey, fKey, rKey, leftKey, rightKey } = this.api;
    // `update` has no pointer, and the rig has to keep facing the cursor between casts.
    this.lastAimX = mouseX;
    this.lastAimY = mouseY;

    // While wheel open — key nav, release detection, dark mode center toggle
    if (this.grimoireMenuOpen || this.necronomiconMenuOpen) {
      const isGrimoire = this.grimoireMenuOpen;
      const idx = isGrimoire ? this.grimoireSelectedIndex : this.necronomiconSelectedIndex;
      const count = 5;

      // The hub is the Dark Magic button, and only once that book's upgrade is bought. Clicking
      // it flips the whole wheel over in place — labels, colours and what release will cast.
      const ptr2 = this.api.scene.input.activePointer;
      const centerDist = Phaser.Math.Distance.Between(ptr2.worldX, ptr2.worldY, this.api.player.x, this.api.player.y);
      const upgradeSlot = isGrimoire ? 'e' : 'q';
      if (ptr2.isDown) {
        if (!this.darkCenterPressed && centerDist <= 28 && this.api.hasUpgrade(upgradeSlot)) {
          this.darkCenterPressed = true;
          if (isGrimoire) this.darkGrimoireMode = !this.darkGrimoireMode;
          else this.darkNecroMode = !this.darkNecroMode;
          const on = isGrimoire ? this.darkGrimoireMode : this.darkNecroMode;
          this.pfx.ring(this.api.player.x, this.api.player.y, 6, 44,
            on ? MAGIC.magenta : MAGIC.gold, 380, 33, 2.4);
          this.api.showFloatingText(this.api.player.x, this.api.player.y - 44,
            on ? '🖤 DARK MAGIC ON' : '📖 DARK MAGIC OFF', on ? '#cc44ff' : '#ffdd44');
          this._drawMenu(isGrimoire ? 'grimoire' : 'necronomicon', idx);
        }
      } else {
        this.darkCenterPressed = false;
      }

      // Mouse hover — select the wedge under the pointer
      if (centerDist > 28) {
        const rawAngle = Math.atan2(ptr2.worldY - this.api.player.y, ptr2.worldX - this.api.player.x);
        const angleStep = (Math.PI * 2) / count;
        const normalized = (((rawAngle + Math.PI / 2) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        const hoverIdx = Math.round(normalized / angleStep) % count;
        if (hoverIdx !== idx) {
          if (isGrimoire) { this.grimoireSelectedIndex = hoverIdx; this.grimoireKeyNavUsed = true; }
          else { this.necronomiconSelectedIndex = hoverIdx; this.necronomiconKeyNavUsed = true; }
          this._drawMenu(isGrimoire ? 'grimoire' : 'necronomicon', hoverIdx);
        }
      }

      if (Phaser.Input.Keyboard.JustDown(leftKey)) {
        const newIdx = (idx + count - 1) % count;
        if (isGrimoire) this.grimoireSelectedIndex = newIdx;
        else this.necronomiconSelectedIndex = newIdx;
        if (isGrimoire) this.grimoireKeyNavUsed = true;
        else this.necronomiconKeyNavUsed = true;
        this._drawMenu(isGrimoire ? 'grimoire' : 'necronomicon', newIdx);
      }
      if (Phaser.Input.Keyboard.JustDown(rightKey)) {
        const newIdx = (idx + 1) % count;
        if (isGrimoire) this.grimoireSelectedIndex = newIdx;
        else this.necronomiconSelectedIndex = newIdx;
        if (isGrimoire) this.grimoireKeyNavUsed = true;
        else this.necronomiconKeyNavUsed = true;
        this._drawMenu(isGrimoire ? 'grimoire' : 'necronomicon', newIdx);
      }

      if (Phaser.Input.Keyboard.JustUp(eKey) && isGrimoire) {
        const heldMs = time - this.grimoireHoldStart;
        const pick = (heldMs < 150 && !this.grimoireKeyNavUsed)
          ? this.grimoireLastPick
          : this.grimoireSelectedIndex;
        this.grimoireLastPick = pick;
        this._closeMenu('grimoire');
        const thunderCharged = this.playerThunderECharged;
        this.playerThunderECharged = false;
        this._spawnAimCountdown(() => {
          const ptr = this.api.scene.input.activePointer;
          this._dispatchGrimoireWedge(pick, ptr.worldX, ptr.worldY, 'player', thunderCharged);
          this.api.player.triggerCooldown('magic-grimoire');
        });
      }
      if (Phaser.Input.Keyboard.JustUp(qKey) && !isGrimoire) {
        const heldMs = time - this.necronomiconHoldStart;
        const pick = (heldMs < 150 && !this.necronomiconKeyNavUsed)
          ? this.necronomiconLastPick
          : this.necronomiconSelectedIndex;
        this.necronomiconLastPick = pick;
        this._closeMenu('necronomicon');
        const thunderQCharged = this.playerThunderQCharged;
        this.playerThunderQCharged = false;
        this._spawnAimCountdown(() => {
          const ptr = this.api.scene.input.activePointer;
          this._dispatchNecronomiconWedge(pick, ptr.worldX, ptr.worldY, 'player', thunderQCharged);
          this.api.player.triggerCooldown('magic-necronomicon');
          if (thunderQCharged) this.api.player.reduceCooldown('magic-necronomicon', 15000);
        });
      }
      return;
    }

    const ptr = this.api.scene.input.activePointer;
    const leftDown = ptr.leftButtonDown();
    const leftJust = leftDown && !this.leftHeld;
    this.leftHeld = leftDown;

    // A held Duplication scroll owns the mouse: it rides the cursor while the button is down
    // and is consumed where the button comes up. No sparkles fire out of the hand carrying it.
    if (this.dragScroll) {
      if (this.scrolls.indexOf(this.dragScroll) < 0) {
        this.dragScroll = null; // fizzled mid-drag
      } else if (leftDown) {
        this.dragScroll.x = mouseX;
        this.dragScroll.y = mouseY;
      } else {
        this.consumeScroll(this.dragScroll);
        this.dragScroll = null;
      }
    } else {
      if (leftJust) {
        const grab = this.scrolls.find(s =>
          s.owner === 'player' && Phaser.Math.Distance.Between(s.x, s.y, mouseX, mouseY) <= 30);
        if (grab) {
          this.dragScroll = grab;
          this.pfx.sigils(grab.x, grab.y, 4, { speed: 60, size: 5, life: 340, color: MAGIC.orchid, points: 4 });
        } else {
          // The R crosshair: every click on the marked enemy buys a missile.
          const c = this.crosshairFor('player');
          if (c && c.target.active && c.target.hp > 0
            && Phaser.Math.Distance.Between(mouseX, mouseY, c.target.x, c.target.y) <= 52) {
            this.fireMissiles('player');
          }
        }
      }
      // Click — Sparkle Shot
      if (leftDown && !this.dragScroll) {
        this.api.player.castAbility('magic-sparkle-shot', this._buildPlayerCtx(mouseX, mouseY));
      }
    }

    // Magic Mastery — Transmogrify may be bound over any of E/R/F/Q, suppressing that slot's base ability.
    const transSlot = this.transmogrifySlot();

    // E — open grimoire wheel (Thunder perk: first tap = Lightning Call / arm)
    if (transSlot === 'e') {
      if (Phaser.Input.Keyboard.JustDown(eKey)) this.tryCastTransmogrify(time, mouseX, mouseY);
    } else if (Phaser.Input.Keyboard.JustDown(eKey)) {
      if (this.api.player.getCooldownRatio('magic-grimoire') >= 1) {
        if (this.api.hasPerk('player', 'thunder') && !this.playerThunderECharged) {
          this._doLightningCall('player');
          this.playerThunderECharged = true;
          this.api.player.triggerCooldown('magic-grimoire');
        } else {
          this.grimoireHoldStart = time;
          this.grimoireKeyNavUsed = false;
          this._openMenu('grimoire', this.grimoireLastPick);
        }
      } else {
        // Decay (perk): the press that would have been wasted buys the cooldown back instead.
        this.tryDecayRefresh('magic-grimoire', DECAY_GRIMOIRE_COST, '📖');
      }
    }

    // R — Anchor
    if (transSlot === 'r') {
      if (Phaser.Input.Keyboard.JustDown(rKey)) this.tryCastTransmogrify(time, mouseX, mouseY);
    } else if (Phaser.Input.Keyboard.JustDown(rKey)) {
      this.api.player.castAbility('magic-anchor', this._buildPlayerCtx(mouseX, mouseY));
    }

    // F — Meditate (hold to channel; F+ mobile variant allows movement)
    if (transSlot === 'f') {
      if (Phaser.Input.Keyboard.JustDown(fKey)) this.tryCastTransmogrify(time, mouseX, mouseY);
    } else {
      if (Phaser.Input.Keyboard.JustDown(fKey)) {
        this.api.player.castAbility('magic-meditate', this._buildPlayerCtx(mouseX, mouseY));
      }
    }

    // Q — open necronomicon wheel (Thunder perk: first tap = Apocalypse Call / arm)
    if (transSlot === 'q') {
      if (Phaser.Input.Keyboard.JustDown(qKey)) this.tryCastTransmogrify(time, mouseX, mouseY);
    } else if (Phaser.Input.Keyboard.JustDown(qKey)) {
      if (this.api.player.getCooldownRatio('magic-necronomicon') >= 1) {
        if (this.api.hasPerk('player', 'thunder') && !this.playerThunderQCharged) {
          this._doApocalypseCall('player');
          this.playerThunderQCharged = true;
          this.api.player.triggerCooldown('magic-necronomicon');
        } else {
          this.necronomiconHoldStart = time;
          this.necronomiconKeyNavUsed = false;
          this._openMenu('necronomicon', this.necronomiconLastPick);
        }
      } else {
        this.tryDecayRefresh('magic-necronomicon', DECAY_NECRO_COST, '💀');
      }
    }
  }

  /**
   * Decay (perk): a press on a slot that is still cooling hands the cooldown straight back,
   * paid for in dark energy. The press itself does not then cast — the next one does, exactly
   * as if the ability had come off cooldown on its own.
   *
   * No affordability check: darkness is a debt, not a currency, and the Necronomicon's 99 is
   * meant to be a decision about whether you survive the next ten seconds.
   */
  private tryDecayRefresh(abilityId: string, cost: number, emoji: string): void {
    if (!this.api.hasPerk('player', 'decay')) return;
    const { player } = this.api;

    player.resetCooldown(abilityId);
    // The book rots forward through its own cooldown: sigils spinning off the caster and a
    // wash of corruption climbing them.
    this.pfx.ring(player.x, player.y, 10, 66, MAGIC.magenta, 460, 5, 6);
    this.pfx.motes(player.x, player.y + 10, 8, {
      speed: 70, size: 2.8, life: 640, color: MAGIC.magenta, drift: -30,
    });
    this.api.showFloatingText(player.x, player.y - 62, `${emoji} DECAY — READY`, '#cc66ff');
    // Charged last: at 100 darkness this kills, and the readout should land before the blast.
    this.addDarkness(cost);
  }

  // ── update (per-frame) ────────────────────────────────────────────────────

  update(time: number, delta: number): void {
    const W = this.api.getSceneWidth();
    const H = this.api.getSceneHeight();
    this.vizT += delta / 1000;

    // ── Magic Mastery — Levitate passive ────────────────────────────
    this.api.player.levitating = this.api.masteryActive;

    // ── Magic Mastery — Transmogrify projectiles ────────────────────
    this.updateTransmogrifyProjectiles(delta, W, H);

    // ── R Crosshair + the missiles it has bought ─────────────────────
    this.updateMissiles(delta, W, H);
    for (let i = this.crosshairs.length - 1; i >= 0; i--) {
      const c = this.crosshairs[i];
      c.spin += delta * 0.0016;
      if (!c.target.active || c.target.hp <= 0) { this.crosshairs.splice(i, 1); continue; }
      if (time >= c.expireAt) {
        this.fx(c.owner).motes(c.target.x, c.target.y, 5, {
          speed: 40, size: 2.2, life: 560, color: MAGIC.orchid, drift: -20,
        });
        this.crosshairs.splice(i, 1);
        continue;
      }
      // The bot does not have a mouse: its crosshair clicks itself on a steady clock.
      if (c.owner === 'npc' && time >= this.npcNextMissileAt) {
        this.npcNextMissileAt = time + 340;
        this.fireMissiles('npc');
      }
    }

    // ── Aim countdown label ───────────────────────────────────────────
    if (this.aimCountdownLabel?.active) {
      const remaining = Math.max(0, (this.aimCountdownEnd - time) / 1000);
      this.aimCountdownLabel.setText(`✨ ${remaining.toFixed(1)}`);
      this.aimCountdownLabel.setPosition(this.api.player.x, this.api.player.y - 54);
    }

    // ── Reposition open menus ─────────────────────────────────────────
    if (this.grimoireMenuOpen) {
      this._drawMenu('grimoire', this.grimoireSelectedIndex);
    }
    if (this.necronomiconMenuOpen) {
      this._drawMenu('necronomicon', this.necronomiconSelectedIndex);
    }

    // ── F+ corrupted data — the leavings of a duped enemy ─────────────
    for (let i = this.corruptData.length - 1; i >= 0; i--) {
      const cd = this.corruptData[i];
      if (time >= cd.expireAt) {
        this.pfx.motes(cd.x, cd.y, 4, { speed: 40, size: 2.2, life: 520, color: MAGIC.magenta, drift: -18 });
        this.corruptData.splice(i, 1);
        continue;
      }
      const p = this.api.player;
      if (!p.active || Phaser.Math.Distance.Between(cd.x, cd.y, p.x, p.y) > 26) continue;
      this.corruptData.splice(i, 1);
      // Reading your own corrupted copy back is the only way down the Darkness bar.
      const shed = Math.min(20, this.darkness);
      this.darkness = Math.max(0, this.darkness - 20);
      this.pfx.ring(p.x, p.y, 8, 52, MAGIC.orchid, 460, 9, 2.6);
      this.pfx.sigils(p.x, p.y, 7, { speed: 130, size: 7, life: 460, color: MAGIC.magenta });
      this.api.showFloatingText(p.x, p.y - 34, `⧉ -${Math.round(shed)} ☠`, '#cc88ff');
    }

    // ── F Duplication scrolls waiting on the floor ────────────────────
    for (let i = this.captureFlashes.length - 1; i >= 0; i--) {
      if (time >= this.captureFlashes[i].expireAt) this.captureFlashes.splice(i, 1);
    }
    for (let i = this.scrolls.length - 1; i >= 0; i--) {
      const s = this.scrolls[i];
      if (time < s.expireAt) continue;
      // An unread scroll fades — the recording was never the damage, only the chance of it.
      this.fx(s.owner).motes(s.x, s.y, 6, { speed: 50, size: 2.4, life: 640, color: MAGIC.orchid, drift: -20 });
      this.api.showFloatingText(s.x, s.y - 24, '📜 faded', '#775588');
      this.scrolls.splice(i, 1);
    }

    // ── Sparkle shots ─────────────────────────────────────────────────
    // First: update leader positions and track which leaders have exploded
    const explodedLeaders = new Set<string>();
    const leaderPositions = new Map<string, { x: number; y: number }>();
    for (const s of this.sparkleShots) {
      if (s.id && !s.leaderId) leaderPositions.set(s.id, { x: s.proj.x, y: s.proj.y });
    }

    for (let i = this.sparkleShots.length - 1; i >= 0; i--) {
      const s = this.sparkleShots[i];
      if (!s.proj.active) { this.sparkleShots.splice(i, 1); continue; }
      const body = (s.proj as any).body as Phaser.Physics.Arcade.Body;

      // Trailing sparkle: follow leader position offset
      if (s.leaderId && s.trailOffset !== undefined && s.angle !== undefined) {
        const leaderPos = leaderPositions.get(s.leaderId);
        if (!leaderPos) {
          // Leader gone — explode this trailer too
          if (!s.exploded) {
            s.exploded = true;
            const dmg = Math.round(14 * (s.damageMult ?? 0.75));
            this.api.dealAoeDamageFromOwner(s.proj.x, s.proj.y, 45, dmg, s.owner);
            this.fx(s.owner).boom(s.proj.x, s.proj.y, 45, {
              color: MAGIC.blush, sigils: 5, rings: 1, duration: 340, mark: false,
            });
          }
          s.proj.setActive(false).setVisible(false);
          body.stop();
          this.sparkleShots.splice(i, 1);
          continue;
        }
        // Position trailer behind leader
        const tx2 = leaderPos.x - Math.cos(s.angle) * s.trailOffset;
        const ty2 = leaderPos.y - Math.sin(s.angle) * s.trailOffset;
        s.proj.setPosition(tx2, ty2);
        body.setVelocity(0, 0);
        continue;
      }

      // Leader sparkle logic
      const speed = Math.sqrt(body.velocity.x ** 2 + body.velocity.y ** 2);
      const dist = Phaser.Math.Distance.Between(s.proj.x, s.proj.y, s.startX, s.startY);

      if (s.id) leaderPositions.set(s.id, { x: s.proj.x, y: s.proj.y });

      if (!s.exploded && (dist >= s.maxDist || speed < 5)) {
        body.setVelocity(0, 0);
        s.stationaryAccum += delta;
        if (s.stationaryAccum >= 1000) {
          s.exploded = true;
          if (s.id) explodedLeaders.add(s.id);
          this.api.dealAoeDamageFromOwner(s.proj.x, s.proj.y, 55, 14, s.owner);
          this.fx(s.owner).boom(s.proj.x, s.proj.y, 58, {
            color: MAGIC.blush, sigils: 8, rings: 2, duration: 440,
          });
          this.api.showFloatingText(s.proj.x, s.proj.y - 20, '✨ SPARKLE', '#ff99ff');
          s.proj.setActive(false).setVisible(false);
          body.stop();
          leaderPositions.delete(s.id!);
          this.sparkleShots.splice(i, 1);
        }
      }
    }

    // ── Flares ────────────────────────────────────────────────────────
    const ptr = this.api.scene.input.activePointer;
    for (let i = this.flameClouds.length - 1; i >= 0; i--) {
      const c = this.flameClouds[i];
      if (time >= c.expireAt) {
        this.fx(c.owner).motes(c.x, c.y, 5, {
          speed: 40, size: 2.4, life: 700, color: c.cursedFire ? MAGIC.cursed : MAGIC.ember, drift: -30,
        });
        this.flameClouds.splice(i, 1);
        continue;
      }
      // The cursor is the leash — the enemy stands in for it on a bot's Flare.
      const tx = c.owner === 'player' ? ptr.worldX : this.api.player.x;
      const ty = c.owner === 'player' ? ptr.worldY : this.api.player.y;
      if (c.homing) {
        const want = Math.atan2(ty - c.y, tx - c.x);
        let heading = Math.atan2(c.vy, c.vx);
        const turn = 4.2 * (delta / 1000);
        heading += Phaser.Math.Clamp(Phaser.Math.Angle.Wrap(want - heading), -turn, turn);
        c.vx = Math.cos(heading) * c.speed;
        c.vy = Math.sin(heading) * c.speed;
        // The lap counter: the bearing from cursor to orb, accumulated. One net full circle
        // means it has orbited the cursor once — after that it flies straight forever.
        const bearing = Math.atan2(c.y - ty, c.x - tx);
        c.orbitAccum += Phaser.Math.Angle.Wrap(bearing - c.prevAngle);
        c.prevAngle = bearing;
        if (Math.abs(c.orbitAccum) >= Math.PI * 2) {
          c.homing = false;
          this.fx(c.owner).sigils(c.x, c.y, 3, {
            speed: 70, size: 5, life: 360, color: c.cursedFire ? MAGIC.corrupt : MAGIC.emberHi, points: 4,
          });
          this.api.showFloatingText(c.x, c.y - 22, '🔥 loose!', '#ff8844');
        }
      }
      c.x += c.vx * (delta / 1000);
      c.y += c.vy * (delta / 1000);
      if (c.x < -70 || c.x > W + 70 || c.y < -70 || c.y > H + 70) {
        this.flameClouds.splice(i, 1);
        continue;
      }
      if (c.aura) {
        // Flare+ is a travelling no-go zone: tick damage, and the shadow DOT for a burn.
        const targets = (c.owner === 'player' ? this.api.enemies : [this.api.player])
          .filter(t => t.active && t.hp > 0 && Phaser.Math.Distance.Between(c.x, c.y, t.x, t.y) <= c.radius);
        if (targets.length > 0) {
          c.tickAccum += delta;
          while (c.tickAccum >= c.tickInterval) {
            for (const t of targets) {
              t.takeDamage(c.tickDmg, { source: c, sourceX: c.x, sourceY: c.y });
              this.api.spawnHitFlash(t.x, t.y, MAGIC.cursed);
              this.fx(c.owner).sigils(t.x, t.y, 2, {
                speed: 90, size: 5, life: 340, color: MAGIC.corrupt, points: 4,
              });
              // Flare+ replaces the ordinary burn outright with the shadow DOT — cursed fire
              // is what you are on fire *with*, not something on top of it.
              if (c.owner === 'player') {
                this.npcCursedFireUntil = Math.max(this.npcCursedFireUntil, time + 3000);
              } else {
                t.burningUntil = Math.max(t.burningUntil, time + c.burnDuration);
              }
            }
            c.tickAccum -= c.tickInterval;
          }
        } else {
          c.tickAccum = 0;
        }
      } else {
        // The base Flare is a projectile: 15 damage and fire to the first thing it touches.
        for (const t of (c.owner === 'player' ? this.api.enemies : [this.api.player])) {
          if (!t.active || t.hp <= 0) continue;
          if (Phaser.Math.Distance.Between(c.x, c.y, t.x, t.y) > c.radius + 14) continue;
          t.takeDamage(15, { source: c, sourceX: c.x, sourceY: c.y });
          t.burningUntil = Math.max(t.burningUntil, time + c.burnDuration);
          this.api.spawnHitFlash(t.x, t.y, MAGIC.ember);
          this.fx(c.owner).boom(c.x, c.y, 44, { color: MAGIC.ember, sigils: 7, rings: 1, duration: 420 });
          this.api.showFloatingText(t.x, t.y - 30, '🔥 BURNED', '#ff8844');
          this.flameClouds.splice(i, 1);
          break;
        }
      }
    }

    // ── Storm clouds ──────────────────────────────────────────────────
    for (let i = this.stormClouds.length - 1; i >= 0; i--) {
      const c = this.stormClouds[i];
      if (time >= c.expireAt) {
        this.fx(c.owner).motes(c.x, c.y, 5, {
          speed: 40, size: 2.2, life: 700, color: c.isAcidCloud ? MAGIC.acid : MAGIC.storm, drift: 20,
        });
        this.stormClouds.splice(i, 1);
        continue;
      }
      if (time >= c.nextPulseAt && c.nextPulseAt > 0) {
        c.nextPulseAt = time + c.pulseInterval;
        // The downpour lets go: a hard wash out to the full pulse reach.
        const fx = this.fx(c.owner);
        fx.flash(c.x, c.y, c.radius * 0.6, 9, c.isAcidCloud ? MAGIC.acid : MAGIC.stormHi);
        fx.ring(c.x, c.y, 10, c.pulseRadius, c.isAcidCloud ? MAGIC.acid : MAGIC.storm, 520, 8, 3);
        fx.sigils(c.x, c.y, 8, {
          speed: c.pulseRadius * 1.7, size: 7, life: 520,
          color: c.isAcidCloud ? MAGIC.acid : MAGIC.stormHi, points: 4,
        });
        // Apply slow / acid vuln + damage
        const targets = (c.owner === 'player' ? this.api.enemies : [this.api.player])
          .filter(t => t.active && t.hp > 0 && Phaser.Math.Distance.Between(c.x, c.y, t.x, t.y) <= c.pulseRadius);
        for (const t of targets) {
          if (c.isAcidCloud) {
            // Dark acid cloud: apply darkVuln stack (independent 3s timer via delayedCall)
            t.darkVulnStacks++;
            this.api.scene.time.delayedCall(3000, () => {
              if (t.active && t.darkVulnStacks > 0) t.darkVulnStacks--;
            });
            this.api.showFloatingText(t.x, t.y - 28, '⛈️ ACID -25%', '#44ff88');
          } else {
            if (c.owner === 'player') this.npcStormSlowUntil = Math.max(this.npcStormSlowUntil, time + 1500);
            else this.playerStormSlowUntil = Math.max(this.playerStormSlowUntil, time + 1500);
          }
          if (c.pulseDmg > 0) {
            t.takeDamage(c.pulseDmg, { source: c, sourceX: c.x, sourceY: c.y });
            this.api.spawnHitFlash(t.x, t.y, c.isAcidCloud ? MAGIC.acid : MAGIC.stormHi);
          }
        }
        if (c.nextPulseAt > c.expireAt) c.nextPulseAt = 0; // no more pulses
      }
    }

    // ── E2 Splash pools ───────────────────────────────────────────────
    // Slows are resolved to a single multiplier per side each frame rather than written onto the
    // fighter, so overlapping pools cannot stack into a standstill — the deepest one wins.
    this.playerPuddleSlow = 1;
    this.npcPuddleSlow = 1;
    for (let i = this.puddles.length - 1; i >= 0; i--) {
      const p = this.puddles[i];
      if (time >= p.expireAt) {
        this.fx(p.owner).motes(p.x, p.y, 6, {
          speed: 50, size: 2.4, life: 700, color: p.putrid ? MAGIC.acid : MAGIC.storm, drift: -14,
        });
        this.puddles.splice(i, 1);
        continue;
      }
      const victims = (p.owner === 'player' ? this.api.enemies : [this.api.player])
        .filter(t => t.active && t.hp > 0 && Phaser.Math.Distance.Between(p.x, p.y, t.x, t.y) <= p.radius);
      for (const t of victims) {
        if (p.owner === 'player') this.npcPuddleSlow = Math.min(this.npcPuddleSlow, p.slowMult);
        else this.playerPuddleSlow = Math.min(this.playerPuddleSlow, p.slowMult);
        // Re-stamped every frame with a short window, so it lapses the moment they are out.
        if (p.putrid) t.mobilityBlockedUntil = Math.max(t.mobilityBlockedUntil, time + 180);
      }
      // The water elemental's pools slow without biting — no zero-damage hit spam.
      if (victims.length === 0 || p.tickDmg <= 0) { p.tickAccum = 0; continue; }
      p.tickAccum += delta;
      while (p.tickAccum >= 500) {
        p.tickAccum -= 500;
        for (const t of victims) {
          t.takeDamage(p.tickDmg / 2, { source: p, sourceX: p.x, sourceY: p.y });
          this.api.spawnHitFlash(t.x, t.y, p.putrid ? MAGIC.acid : MAGIC.stormHi);
        }
      }
    }

    // ── E3 Spur barbs on the floor ────────────────────────────────────
    for (let i = this.spurBarbs.length - 1; i >= 0; i--) {
      const b = this.spurBarbs[i];
      if (time >= b.expireAt) {
        this.fx(b.owner).motes(b.x, b.y, 2, { speed: 30, size: 2, life: 480, color: MAGIC.leaf, drift: -12 });
        this.spurBarbs.splice(i, 1);
        continue;
      }
      let trodden = false;
      for (const t of (b.owner === 'player' ? this.api.enemies : [this.api.player])) {
        if (!t.active || t.hp <= 0) continue;
        if (Phaser.Math.Distance.Between(b.x, b.y, t.x, t.y) > 18) continue;
        trodden = true;
        t.takeDamage(3);
        this.api.spawnHitFlash(t.x, t.y, MAGIC.leaf);
        if (b.owner === 'player') this.npcStormSlowUntil = Math.max(this.npcStormSlowUntil, time + 1500);
        else this.playerStormSlowUntil = Math.max(this.playerStormSlowUntil, time + 1500);
        this.api.showFloatingText(t.x, t.y - 26, '🌿 SLOWED', '#66dd77');
        if (b.sticky) {
          // A Spur+ barb rides along: the trodden bur counts toward the 5-bur pin.
          const a2 = Math.random() * Math.PI * 2;
          const d2 = 6 + Math.random() * 12;
          this.burs.push({
            x: t.x, y: t.y, vx: 0, vy: 0, stuck: t,
            ox: Math.cos(a2) * d2, oy: Math.sin(a2) * d2,
            spin: Math.random() * Math.PI, expireAt: time + 2000, sticky: true, owner: b.owner,
          });
          const worn = this.burs.filter(bb => bb.stuck === t && bb.owner === b.owner).length;
          if (worn < 5) this.api.showFloatingText(t.x, t.y - 40, `🌿 ${worn}/5`, '#66dd77');
          this.checkBurClutch(t, b.owner);
        }
        break;
      }
      if (trodden) this.spurBarbs.splice(i, 1);
    }

    // ── E3 Spur+ burs riding their victims ────────────────────────────
    for (let i = this.burs.length - 1; i >= 0; i--) {
      const b = this.burs[i];
      if (time >= b.expireAt || !b.stuck || !b.stuck.active || b.stuck.hp <= 0) {
        this.burs.splice(i, 1);
        continue;
      }
      b.x = b.stuck.x + b.ox;
      b.y = b.stuck.y + b.oy;
      b.spin += delta * 0.002;
    }
    for (let i = this.burStuns.length - 1; i >= 0; i--) {
      const s = this.burStuns[i];
      if (time < s.releaseAt) continue;
      this.burStuns.splice(i, 1);
      if (!s.target.active || s.target.hp <= 0) continue;
      // The pin tearing loose is the payload — the stun was the delivery.
      s.target.takeDamage(12);
      this.api.spawnHitFlash(s.target.x, s.target.y, MAGIC.leaf);
      this.fx(s.owner).boom(s.target.x, s.target.y, 56, {
        color: MAGIC.leaf, sigils: 9, rings: 2, duration: 460,
      });
      this.api.showFloatingText(s.target.x, s.target.y - 30, '🌿 TORN FREE -12', '#44ff66');
    }

    // ── E4 Gust: trails, and the haul back to the cast point ──────────
    for (let i = this.sparkTrails.length - 1; i >= 0; i--) {
      if (time >= this.sparkTrails[i].expireAt) this.sparkTrails.splice(i, 1);
    }
    this.playerTrailBoost = false;
    for (const tr of this.sparkTrails) {
      if (tr.owner !== 'player') continue;
      if (this._distToTrail(this.api.player.x, this.api.player.y, tr) <= 30) {
        this.playerTrailBoost = true;
        break;
      }
    }
    for (let i = this.gustHauls.length - 1; i >= 0; i--) {
      const h = this.gustHauls[i];
      const d = Phaser.Math.Distance.Between(h.target.x, h.target.y, h.toX, h.toY);
      if (time >= h.expireAt || d <= 16 || !h.target.active || h.target.hp <= 0) {
        this.gustHauls.splice(i, 1);
        continue;
      }
      const a = Math.atan2(h.toY - h.target.y, h.toX - h.target.x);
      (h.target.body as Phaser.Physics.Arcade.Body).setVelocity(Math.cos(a) * 340, Math.sin(a) * 340);
      // Gust+: the road home is live. Only the ones actually being hauled pay for it.
      h.tickAccum += delta;
      while (h.tickAccum >= 300) {
        h.tickAccum -= 300;
        for (const tr of this.sparkTrails) {
          if (tr.owner !== h.owner) continue;
          if (this._distToTrail(h.target.x, h.target.y, tr) > 30) continue;
          h.target.takeDamage(4);
          this.api.spawnHitFlash(h.target.x, h.target.y, MAGIC.thunder);
          this.fx(h.owner).sigils(h.target.x, h.target.y, 2, {
            speed: 90, size: 5, life: 300, color: MAGIC.thunderHi, points: 4,
          });
          break;
        }
      }
    }

    // ── E5 Ward ───────────────────────────────────────────────────────
    this._updateWards(time, delta, W, H);

    // ── Q Summons and everything their signatures left behind ─────────
    this._updateSummons(time, delta, W, H);

    // ── One writer for the kit's incoming-damage multiplier ───────────
    // Two sources, resolved together so neither stomps the other: your own Ward circle
    // (25% off while you stand in it) and the Wind+ hurricane eye (30% extra on everything).
    this.api.player.magicIncomingMult = this.wardInside.player ? 0.75 : 1;
    for (const e of this.api.enemies) {
      let m = this.hurricaneEye ? 1.3 : 1;
      if (e === this.api.npc && this.wardInside.npc) m *= 0.75;
      e.magicIncomingMult = m;
    }

    // ── Rock orbs ─────────────────────────────────────────────────────
    for (const owner of ['player', 'npc'] as const) {
      const set = owner === 'player' ? this.playerRockSet : this.npcRockSet;
      if (!set) continue;
      if (time >= set.expireAt) {
        if (owner === 'player') this.playerRockSet = null;
        else this.npcRockSet = null;
        continue;
      }
      const caster = owner === 'player' ? this.api.player : this.api.npc;
      const enemies = owner === 'player' ? this.api.enemies : [this.api.player];
      const projGroup = this.api.projectiles;

      for (let ri = set.orbs.length - 1; ri >= 0; ri--) {
        const orb = set.orbs[ri];
        orb.angle += 0.003 * delta;
        const ox = caster.x + Math.cos(orb.angle) * set.orbitR;
        const oy = caster.y + Math.sin(orb.angle) * set.orbitR;
        orb.x = ox; orb.y = oy;

        // Contact with enemy
        if (time - orb.lastHitAt >= 300) {
          for (const enemy of enemies) {
            if (!enemy.active || enemy.hp <= 0) continue;
            if (Phaser.Math.Distance.Between(ox, oy, enemy.x, enemy.y) <= 22) {
              enemy.takeDamage(orb.dmg);
              this.api.spawnHitFlash(enemy.x, enemy.y, MAGIC.sand);
              orb.lastHitAt = time;
              if (orb.canCrack && !orb.cracked) {
                orb.cracked = true;
                this.fx(owner).sigils(ox, oy, 4, { speed: 90, size: 5, life: 380, color: MAGIC.granite, points: 4 });
              } else {
                this.shatterRock(owner, ox, oy);
                set.orbs.splice(ri, 1);
              }
              break;
            }
          }
        }

        if (ri >= set.orbs.length) continue;

        // Block hostile projectiles
        const projs = projGroup.getMatching('active', true) as Phaser.GameObjects.Image[];
        for (const p of projs) {
          const pAny = p as any;
          const isHostile = owner === 'player' ? !pAny.isFromPlayer : pAny.isFromPlayer;
          if (!isHostile) continue;
          if (Phaser.Math.Distance.Between(ox, oy, p.x, p.y) <= 18) {
            p.setActive(false).setVisible(false);
            (pAny.body as Phaser.Physics.Arcade.Body)?.stop();
            orb.lastHitAt = time;
            this.fx(owner).flash(p.x, p.y, 12, 10, MAGIC.granite);
            if (orb.canCrack && !orb.cracked) {
              orb.cracked = true;
              this.fx(owner).sigils(ox, oy, 3, { speed: 80, size: 4, life: 340, color: MAGIC.granite, points: 4 });
            } else {
              this.shatterRock(owner, ox, oy);
              set.orbs.splice(ri, 1);
            }
            break;
          }
          if (ri >= set.orbs.length) break;
        }
      }
      if (set.orbs.length === 0) {
        if (owner === 'player') this.playerRockSet = null;
        else this.npcRockSet = null;
      }
    }

    // ── Tornadoes ─────────────────────────────────────────────────────
    for (let i = this.tornadoes.length - 1; i >= 0; i--) {
      const t = this.tornadoes[i];
      if (time >= t.expireAt) {
        this.fx(t.owner).motes(t.x, t.y, 8, { speed: 120, size: 2.4, life: 700, color: MAGIC.gust, drift: -20 });
        this.tornadoes.splice(i, 1);
        continue;
      }
      // Erratic direction change
      if (time >= t.nextDirAt) {
        const targetFighter = t.owner === 'player' ? this.api.npc : this.api.player;
        const seekEnemy = Math.random() < 0.4;
        let angle: number;
        if (seekEnemy) {
          angle = Math.atan2(targetFighter.y - t.y, targetFighter.x - t.x);
        } else {
          angle = Math.random() * Math.PI * 2;
        }
        const spd = 150;
        t.vx = Math.cos(angle) * spd;
        t.vy = Math.sin(angle) * spd;
        t.nextDirAt = time + 400 + Math.random() * 400;
      }
      t.x += t.vx * (delta / 1000);
      t.y += t.vy * (delta / 1000);
      // Clamp to arena
      const pad = 40;
      if (t.x < pad) { t.x = pad; t.vx = Math.abs(t.vx); }
      if (t.x > W - pad) { t.x = W - pad; t.vx = -Math.abs(t.vx); }
      if (t.y < pad) { t.y = pad; t.vy = Math.abs(t.vy); }
      if (t.y > H - pad) { t.y = H - pad; t.vy = -Math.abs(t.vy); }

      // Periodic damage + push
      t.tickAccum += delta;
      if (t.tickAccum >= 200) {
        t.tickAccum -= 200;
        const targets = (t.owner === 'player' ? this.api.enemies : [this.api.player])
          .filter(e => e.active && e.hp > 0 && Phaser.Math.Distance.Between(t.x, t.y, e.x, e.y) <= t.radius + 28);
        for (const e of targets) {
          e.takeDamage(t.tickDmg);
          this.api.spawnHitFlash(e.x, e.y, MAGIC.wind);
          this.fx(t.owner).sigils(e.x, e.y, 2, {
            speed: 130, angle: Math.atan2(e.y - t.y, e.x - t.x), spread: 0.6,
            size: 5, life: 340, color: MAGIC.gust, points: 4,
          });
          const dx = e.x - t.x; const dy = e.y - t.y;
          const len = Math.sqrt(dx * dx + dy * dy) || 1;
          (e.body as Phaser.Physics.Arcade.Body).setVelocity((dx / len) * 450, (dy / len) * 450);
        }
      }
    }

    // ── Thorn prisons ─────────────────────────────────────────────────
    for (const owner of ['player', 'npc'] as const) {
      const tp = owner === 'player' ? this.thornPrison : this.npcThornPrison;
      if (!tp) continue;
      const pad2 = 32;
      const corners: [number, number][] = [
        [pad2, pad2], [W - pad2, pad2], [pad2, H - pad2], [W - pad2, H - pad2],
      ];
      const captive = owner === 'player'
        ? this.api.enemies.find(e => e.active && e.hp > 0) ?? this.api.npc
        : this.api.player;
      captive.setPosition(tp.ex, tp.ey);
      let allBroken = true;
      for (let c = 0; c < 4; c++) {
        if (tp.chainsHp[c] > 0) allBroken = false;
      }
      void corners;
      // Captive's projectiles damage chains
      const projArray = this.api.projectiles.getMatching('active', true) as Phaser.GameObjects.Image[];
      for (const p of projArray) {
        const pAny = p as any;
        const isFromCaptive = owner === 'player' ? !pAny.isFromPlayer : pAny.isFromPlayer;
        if (!isFromCaptive) continue;
        for (let c = 0; c < 4; c++) {
          if (tp.chainsHp[c] <= 0) continue;
          if (Phaser.Math.Distance.Between(p.x, p.y, corners[c][0], corners[c][1]) <= 40 ||
              Phaser.Math.Distance.Between(p.x, p.y, tp.ex, tp.ey) <= 30) {
            const before = tp.chainsHp[c];
            tp.chainsHp[c] -= (pAny.damage ?? 0);
            p.setActive(false).setVisible(false);
            (pAny.body as Phaser.Physics.Arcade.Body)?.stop();
            this.fx(owner).sigils(p.x, p.y, 3, { speed: 90, size: 5, life: 340, color: MAGIC.leaf, points: 4 });
            // A chain giving out is the captive's way out — it wants to be loud.
            if (before > 0 && tp.chainsHp[c] <= 0) {
              this.fx(owner).boom(corners[c][0], corners[c][1], 44, {
                color: MAGIC.vine, sigils: 6, rings: 1, duration: 380, mark: false,
              });
            }
          }
        }
      }
      // DoT
      tp.dotAccum += delta;
      while (tp.dotAccum >= 1000) {
        captive.takeDamage(3);
        this.api.spawnHitFlash(captive.x, captive.y, MAGIC.vine);
        tp.dotAccum -= 1000;
      }
      // End condition
      const elapsed = tp.expireAt - time;
      if (allBroken || elapsed <= 0) {
        captive.takeDamage(35);
        this.fx(owner).boom(tp.ex, tp.ey, 78, {
          color: MAGIC.vine, sigils: 11, rings: 2, duration: 520,
        });
        this.api.scene.cameras.main.shake(180, 0.005);
        this.api.showFloatingText(tp.ex, tp.ey - 44, allBroken ? '🌿 FREED!' : '🌿 ENSNARED', '#33ff66');
        if (owner === 'player') this.thornPrison = null;
        else this.npcThornPrison = null;
      }
    }

    // ── Chain-bound expiry ────────────────────────────────────────────
    if (this.playerBound && time >= this.playerBoundEnd) {
      this.playerBound = false;
    }
    if (this.api.npc.magicChainBound && time >= this.api.npc.magicChainBoundEnd) {
      this.api.npc.magicChainBound = false;
    }

    // ── Cursed fire tick (dark flame clouds) ──────────────────────────
    if (this.npcCursedFireUntil > time) {
      this.npcCursedFireTickAccum += delta;
      while (this.npcCursedFireTickAccum >= 500) {
        this.npcCursedFireTickAccum -= 500;
        const tgt = this.api.npc;
        if (tgt.active && tgt.hp > 0) {
          // Flare+'s shadow burn — the same shape as an ordinary burn, twice the bite.
          tgt.takeDamage(4);
          this.api.spawnHitFlash(tgt.x, tgt.y, MAGIC.cursed);
        }
      }
    } else {
      this.npcCursedFireTickAccum = 0;
    }

    // ── Hurricane vacuum initial pull (Q+ idx 3) ──────────────────────
    if (this.playerHurricaneGaleUntil > time) {
      if (!this.playerHurricaneGaleOnce) {
        this.playerHurricaneGaleOnce = true;
        const player3 = this.api.player;
        const coneR2 = 220;
        for (const enemy of this.api.enemies) {
          if (!enemy.active || enemy.hp <= 0) continue;
          const dist4 = Phaser.Math.Distance.Between(player3.x, player3.y, enemy.x, enemy.y);
          if (dist4 > coneR2) continue;
          const ang4 = Math.atan2(enemy.y - player3.y, enemy.x - player3.x);
          const diff4 = Phaser.Math.Angle.Wrap(ang4 - this.playerHurricaneGaleAngle);
          if (Math.abs(diff4) <= Math.PI / 4) {
            enemy.takeDamage(12);
            this.api.spawnHitFlash(enemy.x, enemy.y, MAGIC.ash);
          }
        }
      }
      const player4 = this.api.player;
      for (const enemy of this.api.enemies) {
        if (!enemy.active || enemy.hp <= 0) continue;
        const dist5 = Phaser.Math.Distance.Between(player4.x, player4.y, enemy.x, enemy.y);
        if (dist5 > 220 || dist5 < 1) continue;
        const ang5 = Math.atan2(enemy.y - player4.y, enemy.x - player4.x);
        const diff5 = Phaser.Math.Angle.Wrap(ang5 - this.playerHurricaneGaleAngle);
        if (Math.abs(diff5) <= Math.PI / 4) {
          const toPlayerAng2 = Math.atan2(player4.y - enemy.y, player4.x - enemy.x);
          (enemy.body as Phaser.Physics.Arcade.Body).setVelocity(
            Math.cos(toPlayerAng2) * 400, Math.sin(toPlayerAng2) * 400,
          );
        }
      }
    }

    // ── Instant vine arms ─────────────────────────────────────────────
    for (let i = this.vineFlashes.length - 1; i >= 0; i--) {
      if (time >= this.vineFlashes[i].expireAt) this.vineFlashes.splice(i, 1);
    }

    // ── Temple / Monument orb sets (fixed-anchor orbits) ──────────────
    for (let ti = this.templeSets.length - 1; ti >= 0; ti--) {
      const ts = this.templeSets[ti];
      if (time >= ts.expireAt || ts.orbs.length === 0) {
        // The structure comes down with it.
        this.fx(ts.owner).boom(ts.anchorX, ts.anchorY, ts.monument ? 84 : 62, {
          color: ts.monument ? MAGIC.granite : MAGIC.stone,
          sigils: ts.monument ? 12 : 8, rings: 2, duration: 520,
        });
        this.templeSets.splice(ti, 1);
        continue;
      }
      const enemies = ts.owner === 'player' ? this.api.enemies : [this.api.player];
      const projGroup = this.api.projectiles;

      for (let ri = ts.orbs.length - 1; ri >= 0; ri--) {
        const orb = ts.orbs[ri];
        orb.angle += 0.003 * delta;
        const ox = ts.anchorX + Math.cos(orb.angle) * ts.orbitR;
        const oy = ts.anchorY + Math.sin(orb.angle) * ts.orbitR;
        orb.x = ox; orb.y = oy;

        if (time - orb.lastHitAt >= 400) {
          for (const enemy of enemies) {
            if (!enemy.active || enemy.hp <= 0) continue;
            if (Phaser.Math.Distance.Between(ox, oy, enemy.x, enemy.y) <= 24) {
              enemy.takeDamage(ts.contactDmg);
              this.api.spawnHitFlash(enemy.x, enemy.y, MAGIC.sand);
              this.fx(ts.owner).ring(ox, oy, 6, 34, MAGIC.stone, 320, 9, 2);
              orb.lastHitAt = time;
              if (ts.stunMs > 0) {
                enemy.earthStunnedUntil = Math.max(enemy.earthStunnedUntil, time + ts.stunMs);
                this.api.showFloatingText(enemy.x, enemy.y - 42, '💥 STUNNED', '#ffcc44');
              } else if (ts.slowMs > 0) {
                this.npcDark80SlowUntil = Math.max(this.npcDark80SlowUntil, time + ts.slowMs);
              }
              if (orb.canCrack && !orb.cracked) {
                orb.cracked = true;
              } else {
                this.shatterRock(ts.owner, ox, oy);
                ts.orbs.splice(ri, 1);
              }
              break;
            }
          }
        }
        if (ri >= ts.orbs.length) continue;

        // Block hostile projectiles
        const projs = projGroup.getMatching('active', true) as Phaser.GameObjects.Image[];
        for (const p of projs) {
          const pAny = p as any;
          const isHostile = ts.owner === 'player' ? !pAny.isFromPlayer : pAny.isFromPlayer;
          if (!isHostile) continue;
          if (Phaser.Math.Distance.Between(ox, oy, p.x, p.y) <= 20) {
            p.setActive(false).setVisible(false);
            (pAny.body as Phaser.Physics.Arcade.Body)?.stop();
            orb.lastHitAt = time;
            this.fx(ts.owner).flash(p.x, p.y, 12, 10, MAGIC.granite);
            if (orb.canCrack && !orb.cracked) {
              orb.cracked = true;
            } else {
              this.shatterRock(ts.owner, ox, oy);
              ts.orbs.splice(ri, 1);
            }
            break;
          }
          if (ri >= ts.orbs.length) break;
        }
      }
    }

    // ── Torture trap links ────────────────────────────────────────────
    const nowMs = Date.now();
    for (let li = this.tortureTrapLinks.length - 1; li >= 0; li--) {
      const link = this.tortureTrapLinks[li];
      if (nowMs >= link.expireAt || !link.target.active || link.target.hp <= 0) {
        link.target.darkLinkedUntil = 0;
        link.target.darkLinkSource = null;
        this.tortureTrapLinks.splice(li, 1);
        continue;
      }
      // Tick 3 dmg per second (Fighter.takeDamage triggers heal via darkLinkSource); the thread
      // itself is painted in paintWorld.
      link.tickAccum += delta;
      while (link.tickAccum >= 1000) {
        link.tickAccum -= 1000;
        link.target.takeDamage(3);
        this.api.spawnHitFlash(link.target.x, link.target.y, MAGIC.blood);
      }
    }

    // ── Darkness HUD bar ──────────────────────────────────────────────
    // Only once a corrupted book is owned: without one there is nothing that charges the meter,
    // and an eternally empty bar is clutter.
    if (this.api.hasUpgrade('e') || this.api.hasUpgrade('q')) {
      if (!this.darknessBarGfx) {
        this.darknessBarGfx = this.api.scene.add.graphics().setDepth(25);
        this.darknessBarText = this.api.scene.add.text(0, 0, '', {
          fontSize: '9px', color: '#cc88ff', fontFamily: 'Arial',
          stroke: '#000000', strokeThickness: 2,
        }).setDepth(26).setOrigin(0.5, 1);
      }
      const bx = this.api.player.x - 30;
      const by = this.api.player.y + 40;
      const barW = 60; const barH = 6;
      this.darknessBarGfx.clear();
      this.darknessBarGfx.fillStyle(0x111111, 0.65);
      this.darknessBarGfx.fillRect(bx, by, barW, barH);
      const fillColor = this.darkness >= 75 ? 0xff0000 : this.darkness >= 40 ? 0x880088 : 0x550066;
      this.darknessBarGfx.fillStyle(fillColor, 0.9);
      this.darknessBarGfx.fillRect(bx, by, barW * (this.darkness / 100), barH);
      this.darknessBarText?.setPosition(this.api.player.x, by - 1);
      this.darknessBarText?.setText(`☠ ${Math.round(this.darkness)}/100`);
    }

    this.paintWorld(time);
    this.updateAuras(time, delta);
    this.updateAvatars(delta);
  }

  /**
   * Dismiss an orbit that is being replaced. Nothing to free any more — the orbs are plain data —
   * but the stone they were made of still has to visibly go somewhere.
   */
  private _destroyRockSet(set: RockOrbSet | null): void {
    if (!set) return;
    for (const o of set.orbs) {
      this.fx(o.owner).sigils(o.x, o.y, 3, { speed: 80, size: 5, life: 400, color: MAGIC.stone, points: 4 });
    }
  }

  /** Thunder-charged Gaia: bolt extra stones onto the temple that was just raised. */
  private _addTempleOrb(count: number): void {
    const ts = this.templeSets[this.templeSets.length - 1];
    if (!ts) return;
    for (let i = 0; i < count; i++) {
      const angle = (ts.orbs.length / (ts.orbs.length + 1)) * Math.PI * 2;
      const x = ts.anchorX + Math.cos(angle) * ts.orbitR;
      const y = ts.anchorY + Math.sin(angle) * ts.orbitR;
      this.pfx.bolt(x, y, 90, 12, MAGIC.thunder);
      ts.orbs.push({
        angle, radius: 10, x, y,
        cracked: false, lastHitAt: 0, canCrack: false, dmg: 15, owner: 'player',
      });
    }
  }

  /** A conjured stone coming apart — chips of it, and the rune that bound it letting go. */
  private shatterRock(owner: 'player' | 'npc', x: number, y: number): void {
    this.fx(owner).boom(x, y, 40, {
      color: MAGIC.stone, sigils: 6, rings: 1, duration: 360, mark: false,
    });
  }

  /**
   * Every per-frame painter in one pass. Both layers are cleared and redrawn from live state, so
   * a cloud boils, a funnel turns and a prison chain frays as it takes damage — none of which a
   * tweened sprite could do.
   */
  private paintWorld(time: number): void {
    const { player, npc } = this.api;
    const t = this.vizT;
    const W = this.api.getSceneWidth();
    const H = this.api.getSceneHeight();

    // ── Floor: anchors, temples, prison chains ──
    const g0 = this.ground();
    g0.clear();
    for (const ts of this.templeSets) {
      MagicFx.drawTemple(g0, this.col(ts.owner), ts.anchorX, ts.anchorY, ts.monument ? 20 : 14, ts.monument, t);
      arcaneRing(g0, this.col(ts.owner), ts.anchorX, ts.anchorY, ts.orbitR, t * 0.4,
        ts.monument ? MAGIC.granite : MAGIC.stone, 0.3, 1.4, 6, false);
    }
    for (const p of this.puddles) {
      const fade = Phaser.Math.Clamp((p.expireAt - time) / 800, 0, 1);
      MagicFx.drawPuddle(g0, this.col(p.owner), p.x, p.y, p.radius, p.putrid, p.seed, t, 0.45 + 0.5 * fade);
    }
    for (const z of this.wardZones) {
      if (time >= z.expireAt) continue;
      const fade = Phaser.Math.Clamp((z.expireAt - time) / 900, 0, 1);
      MagicFx.drawWardZone(g0, this.col(z.owner), z.x, z.y, z.radius, z.seed, t,
        0.45 + 0.55 * fade, this.wardInside[z.owner]);
    }
    for (const b of this.spurBarbs) {
      MagicFx.drawBur(g0, this.col(b.owner), b.x, b.y, b.spin + t * 0.3,
        Phaser.Math.Clamp((b.expireAt - time) / 700, 0, 1) * 0.9);
    }
    for (const l of this.lightningStrokes) {
      const u = Phaser.Math.Clamp(1 - (l.strikeAt - time) / 500, 0, 1);
      arcaneRing(g0, this.col(l.owner), l.x, l.y, 40 - 18 * u, t * 2, MAGIC.thunder, 0.25 + 0.6 * u, 2, 6, false);
    }
    for (const tr of this.sparkTrails) {
      const fade = Phaser.Math.Clamp((tr.expireAt - time) / 1200, 0, 1);
      MagicFx.drawSparkTrail(g0, this.col(tr.owner), tr.pts, tr.seed, t, 0.3 + 0.65 * fade);
    }
    for (const c of this.groundCracks) {
      MagicFx.drawGroundCrack(g0, this.col(c.owner), c.x, c.y, c.radius, c.seed, t,
        Phaser.Math.Clamp((time - c.armAt) / 500, 0, 1),
        Phaser.Math.Clamp((c.expireAt - time) / 900, 0, 1));
    }
    for (const r of this.rootSpikes) {
      MagicFx.drawRootSpike(g0, this.col(r.owner), r.x, r.y, r.seed, t,
        r.fired, Phaser.Math.Clamp((time - (r.armAt - 500)) / 500, 0, 1),
        Phaser.Math.Clamp((r.expireAt - time) / 600, 0, 1));
    }
    for (const b of this.crossBombs) {
      if (b.fired) continue;
      MagicFx.drawCrossBomb(g0, this.col(b.owner), b.x, b.y, 200, 26,
        Phaser.Math.Clamp(1 - (b.armAt - time) / 900, 0, 1));
    }
    // The flood is arena-wide and belongs under everything, so it is painted here and not as an
    // object with a position — the whole floor is the object.
    for (const owner of ['player', 'npc'] as const) {
      const until = owner === 'player' ? this.npcFloodUntil : this.playerFloodUntil;
      if (time >= until) continue;
      MagicFx.drawFlood(g0, this.col(owner), W, H, t, Phaser.Math.Clamp((until - time) / 700, 0, 1));
    }
    const pad2 = 32;
    const corners: [number, number][] = [
      [pad2, pad2], [W - pad2, pad2], [pad2, H - pad2], [W - pad2, H - pad2],
    ];
    for (const owner of ['player', 'npc'] as const) {
      const tp = owner === 'player' ? this.thornPrison : this.npcThornPrison;
      if (!tp) continue;
      for (let c = 0; c < 4; c++) {
        if (tp.chainsHp[c] <= 0) continue;
        MagicFx.drawPrisonChain(g0, this.col(owner), corners[c][0], corners[c][1],
          tp.ex, tp.ey, Phaser.Math.Clamp(tp.chainsHp[c] / 15, 0, 1), t);
      }
    }

    // ── Air: everything conjured ──
    const g = this.air();
    g.clear();

    for (const c of this.flameClouds) {
      const fade = Phaser.Math.Clamp((c.expireAt - time) / 600, 0, 1);
      const alpha = 0.35 + 0.55 * fade;
      if (c.aura) {
        // Flare+'s shell is drawn under the fire, so the flame reads as burning *inside* it.
        const tint = this.col(c.owner);
        g.fillStyle(tint(MAGIC.voidInk), alpha * 0.3);
        g.fillCircle(c.x, c.y, c.radius);
        arcaneRing(g, tint, c.x, c.y, c.radius, t * 0.7, MAGIC.magenta, alpha * 0.7, 2.4, 7, false);
        MagicFx.drawFlameCloud(g, tint, c.x, c.y, c.radius * 0.46, true, c.seed, t, alpha);
        continue;
      }
      MagicFx.drawFlameCloud(g, this.col(c.owner), c.x, c.y, c.radius, !!c.cursedFire, c.seed, t, alpha);
    }
    for (const w of this.wardZones) {
      const fade = Phaser.Math.Clamp((w.expireAt - time) / 900, 0, 1);
      // Chains first, slabs over them: consecutive standing links are physically joined.
      // Once shedding has eaten a gap wider than two stations the chain across it is gone too.
      const standing = w.links.filter(l => !l.free).sort((a, b) => a.angle - b.angle);
      if (standing.length >= 2) {
        const station = (Math.PI * 2) / 16;
        for (let i = 0; i < standing.length; i++) {
          const a = standing[i], b = standing[(i + 1) % standing.length];
          const gap = ((b.angle - a.angle) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
          if (gap > station * 1.6) continue;
          MagicFx.drawWardChain(g, this.col(w.owner), a.x, a.y, b.x, b.y, 0.45 + 0.55 * fade);
        }
      }
      for (const l of w.links) {
        MagicFx.drawWardLink(g, this.col(w.owner), l.x, l.y, l.spin, l.free,
          l.free ? 1 : 0.45 + 0.55 * fade);
      }
    }
    for (const w of this.earthWalls) {
      const fade = Phaser.Math.Clamp((w.expireAt - time) / 700, 0, 1);
      const segs = 5;
      const at = (u: number): { x: number; y: number } =>
        ({ x: w.x1 + (w.x2 - w.x1) * u, y: w.y1 + (w.y2 - w.y1) * u });
      for (let i = 0; i < segs - 1; i++) {
        const a = at((i + 0.5) / segs), b = at((i + 1.5) / segs);
        MagicFx.drawWardChain(g, this.col(w.owner), a.x, a.y, b.x, b.y, 0.45 + 0.55 * fade);
      }
      const wallSpin = Math.atan2(w.y2 - w.y1, w.x2 - w.x1) - Math.PI / 2;
      for (let i = 0; i < segs; i++) {
        const p = at((i + 0.5) / segs);
        MagicFx.drawWardLink(g, this.col(w.owner), p.x, p.y, wallSpin, false, 0.5 + 0.5 * fade);
      }
    }
    for (const b of this.burs) {
      MagicFx.drawBur(g, this.col(b.owner), b.x, b.y, b.spin,
        Phaser.Math.Clamp((b.expireAt - time) / 400, 0, 1));
    }
    for (const p of this.firePillars) {
      const armed01 = Phaser.Math.Clamp(1 - (p.armAt - time) / 700, 0, 1);
      MagicFx.drawFirePillar(g, this.col(p.owner), p.x, p.y, p.seed, t, armed01, p.fired,
        Phaser.Math.Clamp((p.expireAt - time) / 600, 0, 1));
    }
    for (const w of this.waves) {
      MagicFx.drawWave(g, this.col(w.owner), w.x, w.y, Math.atan2(w.vy, w.vx), w.seed, t, 0.9);
    }
    for (const o of this.healOrbs) {
      MagicFx.drawHealOrb(g, this.col(o.owner), o.x, o.y, Math.atan2(o.vy, o.vx), t);
    }
    for (const s of this.scrolls) {
      MagicFx.drawScroll(g, this.col(s.owner), s.x, s.y, s.seed, t,
        Phaser.Math.Clamp((s.expireAt - time) / 1200, 0.35, 1), s === this.dragScroll);
    }
    for (const cf of this.captureFlashes) {
      const u = Phaser.Math.Clamp((cf.expireAt - time) / 450, 0, 1);
      g.fillStyle(this.col(cf.owner)(MAGIC.magenta), 0.26 * u);
      g.fillRect(cf.x - cf.half, cf.y - cf.half, cf.half * 2, cf.half * 2);
      g.lineStyle(2.5, this.col(cf.owner)(MAGIC.orchid), 0.9 * u);
      g.strokeRect(cf.x - cf.half, cf.y - cf.half, cf.half * 2, cf.half * 2);
    }
    for (const b of this.summonBolts) {
      MagicFx.drawSummonBolt(g, this.col(b.owner), b.kind, b.x, b.y, Math.atan2(b.vy, b.vx), t);
    }
    for (const s of this.summons) {
      MagicFx.drawSummon(g, this.col(s.owner), s.kind, s.x, s.y, s.bob, s.plus, s.seed, t,
        s.hp / s.maxHp, Phaser.Math.Clamp((s.expireAt - time) / 900, 0, 1));
    }
    for (const c of this.stormClouds) {
      const fade = Phaser.Math.Clamp((c.expireAt - time) / 600, 0, 1);
      // Charge climbs toward the next pulse, so the cloud visibly winds up before it lets go.
      const charge = c.nextPulseAt > 0
        ? Phaser.Math.Clamp(1 - (c.nextPulseAt - time) / Math.max(1, c.pulseInterval), 0, 1)
        : 0;
      MagicFx.drawStormCloud(g, this.col(c.owner), c.x, c.y, c.radius, !!c.isAcidCloud,
        charge, c.seed, t, 0.4 + 0.55 * fade);
    }
    for (const tor of this.tornadoes) {
      const fade = Phaser.Math.Clamp((tor.expireAt - time) / 700, 0, 1);
      MagicFx.drawTornado(g, this.col(tor.owner), tor.x, tor.y, tor.radius, tor.dark, tor.seed, t, 0.4 + 0.55 * fade);
    }
    for (const owner of ['player', 'npc'] as const) {
      const set = owner === 'player' ? this.playerRockSet : this.npcRockSet;
      if (!set) continue;
      for (const orb of set.orbs) {
        runeOrb(g, this.col(owner), orb.x, orb.y, orb.radius, orb.angle * 2,
          orb.cracked ? MAGIC.granite : MAGIC.stone, orb.cracked ? MAGIC.gust : MAGIC.sand, 1, orb.cracked);
      }
    }
    for (const ts of this.templeSets) {
      for (const orb of ts.orbs) {
        runeOrb(g, this.col(ts.owner), orb.x, orb.y, orb.radius, orb.angle * 2,
          orb.cracked ? MAGIC.granite : MAGIC.stone, orb.cracked ? MAGIC.gust : MAGIC.sand, 1, orb.cracked);
      }
    }
    for (const cd of this.corruptData) {
      MagicFx.drawCorruptData(g, this.pcol, cd.x, cd.y, cd.seed, t,
        Phaser.Math.Clamp((cd.expireAt - time) / 1500, 0.4, 1));
    }
    for (const s of this.sparkleShots) {
      if (!s.proj.active) continue;
      const armed = s.leaderId ? 0 : Phaser.Math.Clamp(s.stationaryAccum / 1000, 0, 1);
      MagicFx.drawSparkle(g, this.col(s.owner), s.proj.x, s.proj.y, armed, t, !!s.leaderId);
    }
    for (const p of this.transmogrifyProjectiles) {
      MagicFx.drawChickenBolt(g, this.col(p.owner), p.x, p.y, Math.atan2(p.vy, p.vx), t);
    }
    for (const c of this.crosshairs) {
      MagicFx.drawCrosshair(g, this.col(c.owner), c.target.x, c.target.y, Math.min(5, c.clicks), c.spin,
        Phaser.Math.Clamp((c.expireAt - time) / 700, 0.35, 1));
    }
    for (const m of this.missiles) {
      MagicFx.drawMagicMissile(g, this.col(m.owner), m.x, m.y, Math.atan2(m.vy, m.vx), t);
    }
    for (const link of this.tortureTrapLinks) {
      const src = link.owner === 'player' ? player : npc;
      MagicFx.drawLifeLink(g, this.col(link.owner), src.x, src.y, link.target.x, link.target.y, t);
    }
    for (const v of this.vineFlashes) {
      vineLash(g, this.pcol, v.x1, v.y1, v.x2, v.y2, t,
        v.hit ? MAGIC.leaf : MAGIC.darkVine, MAGIC.vine,
        Phaser.Math.Clamp((v.expireAt - time) / 200, 0, 1), 4);
    }
  }

  /** Stance tells for both sides, rebuilt from the flags that are already the source of truth. */
  private updateAuras(time: number, delta: number): void {
    const { player, npc } = this.api;
    const pAim = Math.atan2((this.lastAimY || player.y) - player.y, (this.lastAimX || player.x + 1) - player.x);
    const body = player.body as Phaser.Physics.Arcade.Body | null;
    const moveAim = body && (body.velocity.x || body.velocity.y)
      ? Math.atan2(body.velocity.y, body.velocity.x) : pAim;

    // The channelling ring now marks a live Dupe field instead: same "something is being held
    // open here" read, on the ability that actually holds something open.
    this.syncAura('player', 'meditate', this.corruptData.length > 0, delta, 1, pAim, 30);
    this.syncAura('player', 'darkness', this.darkness > 1, delta, this.darkness / 100, pAim, 28);
    this.syncAura('player', 'boost', this.playerTrailBoost, delta, 0, moveAim, 26);
    this.syncAura('player', 'bound', this.playerBound && time < this.playerBoundEnd, delta, 1, pAim, 26);
    this.syncAura('player', 'chicken', player.chickenUntil > Date.now(), delta, 1, pAim, 24);

    this.syncAura('npc', 'bound', npc.magicChainBound && time < npc.magicChainBoundEnd, delta, 1, 0, 26);
    this.syncAura('npc', 'chicken', npc.chickenUntil > Date.now(), delta, 1, 0, 24);
  }

  /** Drive the rig for whichever sides are playing Magic. Built lazily; torn down when they aren't. */
  private updateAvatars(delta: number): void {
    const { player, npc, scene } = this.api;

    if (this.api.isPlayerMagic && player?.active) {
      if (!this.playerAvatar) this.playerAvatar = new MagicAvatar(scene, this.pcol, 'player');
      const aim = Math.atan2((this.lastAimY || player.y) - player.y, (this.lastAimX || player.x + 1) - player.x);
      this.playerAvatar.setFacing(aim);
      // An open wheel visibly swells the rig, so "I am mid-spell" reads off the character alone.
      this.playerAvatar.setIntensity(this.grimoireMenuOpen || this.necronomiconMenuOpen ? 1.35 : 1);
      this.playerAvatar.setMastered(this.api.masteryActive);
      this.playerAvatar.setCorruption(this.darkness / 100);
      this.playerAvatar.setHold((this.grimoireMenuOpen || this.necronomiconMenuOpen) ? 'draw' : null, aim);
      this.playerAvatar.update(delta, player.x, player.y, player.forceInvisible ? 0 : player.alpha);
    } else if (this.playerAvatar) {
      this.playerAvatar.destroy();
      this.playerAvatar = null;
    }

    if (this.api.isNpcMagic && npc?.active) {
      if (!this.npcAvatar) this.npcAvatar = new MagicAvatar(scene, this.ncol, 'npc');
      const aim = Math.atan2(player.y - npc.y, player.x - npc.x);
      this.npcAvatar.setFacing(aim);
      this.npcAvatar.update(delta, npc.x, npc.y, npc.forceInvisible ? 0 : npc.alpha);
    } else if (this.npcAvatar) {
      this.npcAvatar.destroy();
      this.npcAvatar = null;
    }
  }

  // ── Subterfuge Dark Treachery support ─────────────────────────────────────

  /** Magic-Q copy: open the necronomicon wheel for a non-magic player. While the
   * wheel is open, ArenaScene keeps routing input here (handleInput early-returns
   * into pure wheel-driving); the player taps Q to fire the selected wedge. */
  foreignOpenNecronomicon(time: number): void {
    this.necronomiconHoldStart = time;
    this.necronomiconKeyNavUsed = false;
    this._openMenu('necronomicon', this.necronomiconLastPick);
  }

  isNecroWheelOpen(): boolean { return this.necronomiconMenuOpen; }

  // ── Wheel UI helpers ──────────────────────────────────────────────────────

  private _openMenu(slot: 'grimoire' | 'necronomicon', selectedIndex: number): void {
    this._closeMenu(slot);
    const labels = slot === 'grimoire' ? GRIMOIRE_LABELS : NECRO_LABELS;
    const gfx = this.api.scene.add.graphics().setDepth(31);
    const cx = this.api.player.x;
    const cy = this.api.player.y;
    const R = 130;
    const count = 5;
    const colors = slot === 'grimoire' ? GRIMOIRE_COLORS : NECRO_COLORS;
    MagicFx.drawWheel(gfx, cx, cy, R, colors, selectedIndex);
    const lblObjs: Phaser.GameObjects.Text[] = [];
    for (let i = 0; i < count; i++) {
      const { x: lx, y: ly } = MagicFx.wheelLabelPos(cx, cy, R, i, count, selectedIndex);
      const t = this.api.scene.add.text(lx, ly, labels[i], { fontSize: '10px', color: '#ffffff', fontFamily: 'Arial', align: 'center', wordWrap: { width: 72 } })
        .setOrigin(0.5, 0.5).setDepth(32);
      lblObjs.push(t);
    }
    if (slot === 'grimoire') {
      this.grimoireMenuGfx = gfx;
      this.grimoireMenuLabels = lblObjs;
      this.grimoireMenuOpen = true;
      this.grimoireSelectedIndex = selectedIndex;
    } else {
      this.necronomiconMenuGfx = gfx;
      this.necronomiconMenuLabels = lblObjs;
      this.necronomiconMenuOpen = true;
      this.necronomiconSelectedIndex = selectedIndex;
    }
  }

  private _drawMenu(slot: 'grimoire' | 'necronomicon', selectedIndex: number): void {
    const gfx = slot === 'grimoire' ? this.grimoireMenuGfx : this.necronomiconMenuGfx;
    const lbls = slot === 'grimoire' ? this.grimoireMenuLabels : this.necronomiconMenuLabels;
    if (!gfx) return;
    const cx = this.api.player.x;
    const cy = this.api.player.y;
    const R = 130;
    const count = 5;
    const isDark = this.isDarkMode(slot);
    const colors = isDark
      ? (slot === 'grimoire' ? DARK_GRIMOIRE_COLORS : DARK_NECRO_COLORS)
      : (slot === 'grimoire' ? GRIMOIRE_COLORS : NECRO_COLORS);
    const labels = isDark
      ? (slot === 'grimoire' ? DARK_GRIMOIRE_LABELS : DARK_NECRO_LABELS)
      : (slot === 'grimoire' ? GRIMOIRE_LABELS : NECRO_LABELS);
    gfx.clear();
    // The hub button only exists once that book's upgrade is bought.
    const toggle = this.api.hasUpgrade(slot === 'grimoire' ? 'e' : 'q')
      ? (isDark ? 'dark' : 'light')
      : 'none';
    MagicFx.drawWheel(gfx, cx, cy, R, colors, selectedIndex, toggle);
    for (let i = 0; i < count; i++) {
      if (!lbls[i]) continue;
      const { x: lx, y: ly } = MagicFx.wheelLabelPos(cx, cy, R, i, count, selectedIndex);
      lbls[i].setPosition(lx, ly);
      lbls[i].setText(labels[i]);
    }
  }

  private _closeMenu(slot: 'grimoire' | 'necronomicon'): void {
    if (slot === 'grimoire') {
      if (this.grimoireMenuGfx) { this.grimoireMenuGfx.destroy(); this.grimoireMenuGfx = null; }
      for (const l of this.grimoireMenuLabels) l.destroy();
      this.grimoireMenuLabels = [];
      this.grimoireMenuOpen = false;
    } else {
      if (this.necronomiconMenuGfx) { this.necronomiconMenuGfx.destroy(); this.necronomiconMenuGfx = null; }
      for (const l of this.necronomiconMenuLabels) l.destroy();
      this.necronomiconMenuLabels = [];
      this.necronomiconMenuOpen = false;
    }
  }

  private _spawnAimCountdown(onFire: () => void): void {
    const DELAY = 2000;
    if (this.aimCountdownLabel) { this.aimCountdownLabel.destroy(); }
    this.aimCountdownLabel = this.api.scene.add.text(this.api.player.x, this.api.player.y - 54, '✨ 2.0', {
      fontSize: '18px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif', color: '#cc99ff',
      stroke: '#220044', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(30);
    this.aimCountdownEnd = this.api.scene.sys.game.loop.now + DELAY;
    this.aimCountdownFired = false;
    this.api.scene.time.delayedCall(DELAY, () => {
      if (this.aimCountdownLabel) { this.aimCountdownLabel.destroy(); this.aimCountdownLabel = null; }
      onFire();
    });
  }

  private _buildPlayerCtx(mx: number, my: number): any {
    return {
      targetX: mx, targetY: my,
      magicSparkleShot: (tx: number, ty: number) => this.doSparkleShot(tx, ty, 'player'),
      magicOpenGrimoire: () => {},
      magicAnchorToggle: () => this.doAnchorToggle('player'),
      magicMeditateBegin: () => this.doMeditateBegin('player'),
      magicOpenNecronomicon: () => {},
    };
  }

  // ── Dispatch helpers ──────────────────────────────────────────────────────

  /** Magic Mastery: track per-spell wheel usage and ratchet the "used every spell N times" requirement. */
  private _recordWheelSpellUse(wheel: 'grimoire' | 'necronomicon', pick: number): void {
    const subKey = `${wheel}Spell${pick}Uses`;
    this.api.recordMasteryStat(subKey, 1);
    let min = Infinity;
    for (let i = 0; i < 5; i++) {
      min = Math.min(min, this.api.getMasteryStat(`${wheel}Spell${i}Uses`));
    }
    this.api.recordMasteryBestStat(wheel === 'grimoire' ? 'grimoireAllSpellsUsed' : 'necroAllSpellsUsed', min);
  }

  /**
   * The Grimoire's five spells. Which *tier* is cast is decided by the upgrade rather than by a
   * mode the player toggles, so the wheel always shows exactly what pressing it will do.
   *
   * The Thunder perk's charge is spent here as a per-spell bonus, one line each, because what
   * "more" means is different for every one of them: a second Flare, a deeper pool, a second
   * volley of burs, a stun on the haul, more stone.
   */
  private _dispatchGrimoireWedge(pick: number, tx: number, ty: number, owner: 'player' | 'npc', thunderCharged = false): void {
    if (owner === 'player') this._recordWheelSpellUse('grimoire', pick);
    const caster = this.fighter(owner);
    const now = this.api.scene.sys.game.loop.now;
    switch (pick) {
      case 0:
        this.doFlare(tx, ty, owner);
        if (thunderCharged) this.doFlare(tx, ty, owner);
        break;
      case 1: {
        this.doSplash(tx, ty, owner);
        const p = this.puddles[this.puddles.length - 1];
        if (thunderCharged && p) { p.radius = Math.round(p.radius * 1.35); p.tickDmg *= 2; }
        break;
      }
      case 2:
        this.doSpur(tx, ty, owner);
        if (thunderCharged) this.doSpur(tx, ty, owner);
        break;
      case 3:
        this.doGust(tx, ty, owner);
        if (thunderCharged) {
          for (const h of this.gustHauls) {
            if (h.owner !== owner) continue;
            h.target.earthStunnedUntil = Math.max(h.target.earthStunnedUntil, now + 1200);
            this.pfx.bolt(h.target.x, h.target.y, 110, 12, MAGIC.thunder);
          }
        }
        break;
      case 4: {
        this.doWard(owner);
        const w = this.wardZones[this.wardZones.length - 1];
        if (thunderCharged && w) {
          // A charged circle is simply a bigger promise: wider, and four seconds longer.
          w.radius = Math.round(w.radius * 1.25);
          w.expireAt += 4000;
          this.fx(owner).bolt(w.x, w.y, 110, 12, MAGIC.thunder);
        }
        break;
      }
    }
    if (thunderCharged) this.api.showFloatingText(caster.x, caster.y - 38, '⚡ CHARGED!', '#ffee44');
  }

  /**
   * The Necronomicon's five familiars. The wheel picks which base element answers; the upgrade
   * decides whether what turns up has a signature move.
   *
   * A Thunder charge calls a second one of the same kind, which is by far the loudest thing the
   * perk does in this element — two hurricanes, or ten root barrages.
   */
  private _dispatchNecronomiconWedge(pick: number, tx: number, ty: number, owner: 'player' | 'npc', thunderCharged = false): void {
    if (owner === 'player') this._recordWheelSpellUse('necronomicon', pick);
    const kinds: SummonKind[] = ['fire', 'water', 'life', 'wind', 'earth'];
    const kind = kinds[Phaser.Math.Clamp(pick, 0, 4)];
    this.doSummon(kind, tx, ty, owner);
    if (!thunderCharged) return;
    this.doSummon(kind, tx + 40, ty + 40, owner);
    const caster = this.fighter(owner);
    this.api.showFloatingText(caster.x, caster.y - 38, '⚡ CHARGED — TWO!', '#ffee44');
  }

  // ── NPC dispatch (called from ArenaScene npc context) ─────────────────────

  npcCastGrimoireWedge(tx: number, ty: number): void {
    if (this.api.hasPerk('npc', 'thunder') && !this.npcThunderECharged) {
      this._doLightningCall('npc');
      this.npcThunderECharged = true;
      this.api.npc.triggerCooldown('magic-grimoire');
      return;
    }
    const { player, npc } = this.api;
    const dist = Phaser.Math.Distance.Between(player.x, player.y, npc.x, npc.y);
    const hpRatio = npc.hp / npc.maxHp;
    // Kit-owned reads, so the AI never re-derives this geometry. Order matters: the synergies
    // come first, the generic rotation after.
    const inMyPool = this.puddles.some(p =>
      p.owner === 'npc' && Phaser.Math.Distance.Between(p.x, p.y, player.x, player.y) <= p.radius);
    const hauling = this.gustHauls.some(h => h.owner === 'npc' && h.target === player);
    let pick: number;
    if (inMyPool || hauling) {
      // Somebody slowed in a pool, or being hauled back to where this bot stands, is about to
      // walk on whatever is scattered at its feet — which is exactly what a barb carpet is for.
      pick = 2;
    } else if (dist > 330) {
      pick = 3; // Gust — nothing else in the book reaches, and it brings them to us.
    } else if (hpRatio < 0.35 || dist < 130) {
      pick = 4; // Ward — stones between us, whether that is panic or melee.
    } else if (dist < 220) {
      pick = 1; // Splash — a pool underfoot at the range they are already fighting at.
    } else {
      pick = Math.random() < 0.5 ? 0 : 2;
    }
    const thunderCharged = this.npcThunderECharged;
    this.npcThunderECharged = false;
    this._dispatchGrimoireWedge(pick, tx, ty, 'npc', thunderCharged);
  }

  npcCastNecronomiconWedge(tx: number, ty: number): void {
    if (this.api.hasPerk('npc', 'thunder') && !this.npcThunderQCharged) {
      this._doApocalypseCall('npc');
      this.npcThunderQCharged = true;
      this.api.npc.triggerCooldown('magic-necronomicon');
      return;
    }
    const dist = Phaser.Math.Distance.Between(this.api.player.x, this.api.player.y, this.api.npc.x, this.api.npc.y);
    const hpRatio = this.api.npc.hp / this.api.npc.maxHp;
    // Which elemental suits the fight it is actually in: Life heals and Earth armours when
    // hurt, Earth's walls and Water's waves buy space up close, Fire and Wind pour on damage
    // at range. Never one it already has out — two of the same is a waste of the longest
    // cooldown in the kit.
    const has = (k: SummonKind): boolean => this.summons.some(s => s.owner === 'npc' && s.kind === k);
    const order: SummonKind[] = hpRatio < 0.35
      ? ['life', 'earth', 'water', 'wind', 'fire']
      : dist < 160
        ? ['earth', 'water', 'wind', 'fire', 'life']
        : dist > 340
          ? ['fire', 'wind', 'water', 'life', 'earth']
          : ['wind', 'fire', 'water', 'earth', 'life'];
    const kinds: SummonKind[] = ['fire', 'water', 'life', 'wind', 'earth'];
    const chosen = order.find(k => !has(k)) ?? order[0];
    const pick = kinds.indexOf(chosen);
    const thunderQCharged = this.npcThunderQCharged;
    this.npcThunderQCharged = false;
    this._dispatchNecronomiconWedge(pick, tx, ty, 'npc', thunderQCharged);
    if (thunderQCharged) this.api.npc.reduceCooldown('magic-necronomicon', 15000);
  }

  // ── Thunder perk: Lightning Call (E arm) / Apocalypse Call (Q arm) ─────────

  private _doLightningCall(owner: 'player' | 'npc'): void {
    const caster = owner === 'player' ? this.api.player : this.api.npc;
    const fx = this.fx(owner);
    // Something is called down out of the sky and stored — the arming, not the discharge.
    fx.bolt(caster.x, caster.y, 120, 12, MAGIC.thunder);
    fx.ring(caster.x, caster.y, 10, 64, MAGIC.thunder, 520, 8, 3);
    fx.motes(caster.x, caster.y, 8, { speed: 90, size: 2.4, life: 620, color: MAGIC.thunderHi });
    this.avatarFor(owner)?.play('raise');
    this.api.showFloatingText(caster.x, caster.y - 44, '⚡ LIGHTNING CALL', '#ffee44');
  }

  private _doApocalypseCall(owner: 'player' | 'npc'): void {
    const caster = owner === 'player' ? this.api.player : this.api.npc;
    const fx = this.fx(owner);
    // The bigger sibling: three bolts, two circles, and the ground remembers it.
    for (let i = 0; i < 3; i++) {
      this.api.scene.time.delayedCall(i * 90, () =>
        fx.bolt(caster.x + (i - 1) * 26, caster.y, 150, 12, i === 1 ? MAGIC.orchid : MAGIC.thunder));
    }
    fx.ring(caster.x, caster.y, 12, 92, MAGIC.orchid, 700, 8, 3.5);
    fx.mark(caster.x, caster.y, 40, 3, MAGIC.violet);
    fx.sigils(caster.x, caster.y, 10, { speed: 190, size: 9, life: 700, color: MAGIC.orchid });
    this.api.scene.cameras.main.shake(200, 0.005);
    this.avatarFor(owner)?.play('raise');
    this.api.showFloatingText(caster.x, caster.y - 44, '💥 APOCALYPSE CALL', '#cc44ff');
  }

  // ── Click: Sparkle Shot ───────────────────────────────────────────────────

  doSparkleShot(tx: number, ty: number, owner: 'player' | 'npc'): void {
    const caster = owner === 'player' ? this.api.player : this.api.npc;
    const angle = Math.atan2(ty - caster.y, tx - caster.x);
    const proj = this.api.projectiles.get(caster.x, caster.y, 'proj-sparkle-star') as any;
    if (!proj) return;
    proj.setActive(true).setVisible(true).setDepth(6);
    proj.isFromPlayer = (owner === 'player');
    proj.damage = 6;
    proj.setVisible(false); // the kit paints it — the texture is only there for collision
    (proj.body as Phaser.Physics.Arcade.Body).setVelocity(Math.cos(angle) * 450, Math.sin(angle) * 450);
    this.gesture(owner, 'magic-sparkle-shot', angle);
    this.fx(owner).sigils(caster.x, caster.y, 3, {
      speed: 70, angle, spread: 0.6, size: 6, life: 340, color: MAGIC.blush,
    });
    const leaderId = `sparkle-${Date.now()}-${Math.random()}`;
    this.sparkleShots.push({
      proj,
      startX: caster.x, startY: caster.y,
      maxDist: 180,
      stationaryAccum: 0,
      exploded: false,
      owner,
      id: leaderId,
      angle,
    });
    // Click+: spawn two trailing sparkles
    if (owner === 'player' && this.api.hasUpgrade('click')) {
      for (const trailOffset of [32, 64]) {
        const trailProj = this.api.projectiles.get(
          caster.x - Math.cos(angle) * trailOffset,
          caster.y - Math.sin(angle) * trailOffset,
          'proj-sparkle-star',
        ) as any;
        if (!trailProj) continue;
        trailProj.setActive(true).setVisible(false).setDepth(6);
        trailProj.isFromPlayer = true;
        trailProj.damage = 0; // damage handled by kit, not ArenaScene collision
        (trailProj.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
        this.sparkleShots.push({
          proj: trailProj,
          startX: caster.x, startY: caster.y,
          maxDist: 180, stationaryAccum: 0, exploded: false,
          owner: 'player',
          leaderId,
          trailOffset,
          damageMult: 0.75,
          angle,
        });
      }
    }
  }

  // ── R: Crosshair ──────────────────────────────────────────────────────────

  private crosshairFor(owner: 'player' | 'npc'): Crosshair | null {
    return this.crosshairs.find(c => c.owner === owner) ?? null;
  }

  /**
   * R — Magic Missiles. Paints a crosshair on the nearest enemy for three seconds; while it
   * holds, every click on them conjures a homing missile. Kept under the old ability id and
   * the old method name so ArenaScene's context, the cooldown bar and the online replay all
   * keep working untouched.
   */
  doAnchorToggle(owner: 'player' | 'npc'): void {
    const caster = this.fighter(owner);
    const now = this.api.scene.sys.game.loop.now;
    const candidates = (owner === 'player' ? this.api.enemies : [this.api.player])
      .filter(t => t.active && t.hp > 0);
    if (candidates.length === 0) return;
    let target = candidates[0];
    for (const t of candidates) {
      if (Phaser.Math.Distance.Between(caster.x, caster.y, t.x, t.y)
        < Phaser.Math.Distance.Between(caster.x, caster.y, target.x, target.y)) target = t;
    }
    // One mark per side — re-casting moves it rather than stacking a second.
    for (let i = this.crosshairs.length - 1; i >= 0; i--) {
      if (this.crosshairs[i].owner === owner) this.crosshairs.splice(i, 1);
    }
    this.crosshairs.push({ target, clicks: 0, expireAt: now + 3000, spin: 0, owner });
    if (owner === 'npc') this.npcNextMissileAt = now + 400;
    this.gesture(owner, 'magic-anchor');
    const fx = this.fx(owner);
    fx.ring(target.x, target.y, 60, 22, MAGIC.orchid, 420, 9, 2.6);
    fx.sigils(target.x, target.y, 6, { speed: 90, size: 6, life: 400, color: MAGIC.orchid });
    this.api.showFloatingText(target.x, target.y - 34,
      owner === 'player' ? '✛ MARKED — CLICK THEM' : '✛ MARKED', '#cc88ff');
  }

  /**
   * One click on the marked enemy: a missile (two with R+) slips out of the caster's hand and
   * hunts them down. 2 damage each — the spell is worth exactly as fast as you can click.
   */
  private fireMissiles(owner: 'player' | 'npc'): void {
    const c = this.crosshairFor(owner);
    if (!c || !c.target.active || c.target.hp <= 0) return;
    const caster = this.fighter(owner);
    const count = owner === 'player' && this.api.hasUpgrade('r') ? 2 : 1;
    const aim = Math.atan2(c.target.y - caster.y, c.target.x - caster.x);
    for (let i = 0; i < count; i++) {
      // Launched off-line so the volley visibly curls back onto the target.
      const a = aim + (Math.random() - 0.5) * 1.6;
      this.missiles.push({
        x: caster.x + Math.cos(a) * 14, y: caster.y + Math.sin(a) * 14,
        vx: Math.cos(a) * 480, vy: Math.sin(a) * 480,
        target: c.target, owner,
      });
    }
    c.clicks += count;
    this.gesture(owner, 'magic-sparkle-shot', aim);
    this.fx(owner).sigils(caster.x, caster.y, 2, {
      speed: 90, angle: aim, spread: 0.5, size: 5, life: 300, color: MAGIC.orchid, points: 4,
    });
  }

  /** Magic Missiles in flight: small, homing hard, 2 damage on arrival. */
  private updateMissiles(delta: number, W: number, H: number): void {
    for (let i = this.missiles.length - 1; i >= 0; i--) {
      const m = this.missiles[i];
      if (!m.target.active || m.target.hp <= 0
        || m.x < -40 || m.x > W + 40 || m.y < -40 || m.y > H + 40) {
        this.missiles.splice(i, 1);
        continue;
      }
      const want = Math.atan2(m.target.y - m.y, m.target.x - m.x);
      let heading = Math.atan2(m.vy, m.vx);
      const turn = 9 * (delta / 1000);
      heading += Phaser.Math.Clamp(Phaser.Math.Angle.Wrap(want - heading), -turn, turn);
      m.vx = Math.cos(heading) * 480;
      m.vy = Math.sin(heading) * 480;
      m.x += m.vx * (delta / 1000);
      m.y += m.vy * (delta / 1000);
      if (Phaser.Math.Distance.Between(m.x, m.y, m.target.x, m.target.y) > 20) continue;
      this.missiles.splice(i, 1);
      m.target.takeDamage(2);
      this.api.spawnHitFlash(m.target.x, m.target.y, MAGIC.orchid);
      this.fx(m.owner).sigils(m.x, m.y, 3, { speed: 80, size: 5, life: 320, color: MAGIC.blush, points: 4 });
    }
  }

  // ── Magic Mastery: Transmogrify ─────────────────────────────────────────

  /** The slot Transmogrify is bound over this match, or null when it isn't bound anywhere. */
  private transmogrifySlot(): 'e' | 'r' | 'f' | 'q' | null {
    for (const s of ['e', 'r', 'f', 'q'] as const) {
      if (this.api.masteryBindFor(s) === 'transmogrify') return s;
    }
    return null;
  }

  /** 0–1 cooldown fill for the Transmogrify HUD card. */
  getTransmogrifyCooldownRatio(time: number): number {
    return Math.min(1, (time - this.transmogrifyLastCastAt) / MagicKit.TRANSMOGRIFY_COOLDOWN_MS);
  }

  private tryCastTransmogrify(time: number, tx: number, ty: number): void {
    if (time - this.transmogrifyLastCastAt < MagicKit.TRANSMOGRIFY_COOLDOWN_MS) return;
    this.transmogrifyLastCastAt = time;
    this.doTransmogrify(tx, ty, 'player');
    this.api.broadcastMasteryCast('transmogrify');
  }

  /** Online replay: the remote magic player cast Transmogrify — launch the chicken bolt at us. */
  doNpcTransmogrify(tx: number, ty: number): void {
    this.doTransmogrify(tx, ty, 'npc');
  }

  private doTransmogrify(tx: number, ty: number, owner: 'player' | 'npc'): void {
    const caster = owner === 'player' ? this.api.player : this.api.npc;
    const angle = Math.atan2(ty - caster.y, tx - caster.x);
    const speed = 130;
    this.transmogrifyProjectiles.push({
      x: caster.x, y: caster.y,
      vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
      owner,
    });
    this.avatarFor(owner)?.play('punch', angle);
    this.fx(owner).ring(caster.x, caster.y, 6, 40, MAGIC.gold, 400, 9, 2.4);
    this.api.showFloatingText(caster.x, caster.y - 30, '🐔 Transmogrify!', '#ffffff');
  }

  private applyChicken(target: Fighter): void {
    const nowMs = Date.now();
    target.chickenUntil = Math.max(target.chickenUntil, nowMs + MagicKit.TRANSMOGRIFY_CHICKEN_MS);
    if (!this.chickenStates.has(target)) {
      target.setTexture('fx-chicken');
      this.chickenStates.set(target, { angle: Math.random() * Math.PI * 2, nextTurnAt: 0, prevCooldownMult: target.cooldownMult });
      target.cooldownMult *= 0.5;
    }
    this.api.spawnHitFlash(target.x, target.y, MAGIC.white);
    // The transformation itself: a summoning circle collapses onto them and feathers come out.
    this.pfx.flash(target.x, target.y, 30, 11, MAGIC.gold);
    this.pfx.ring(target.x, target.y, 46, 8, MAGIC.gold, 460, 9, 3);
    this.pfx.sigils(target.x, target.y, 9, { speed: 170, size: 8, life: 560, color: MAGIC.white });
    this.api.showFloatingText(target.x, target.y - 30, '🐔 CHICKEN!', '#ffffff');
  }

  private updateTransmogrifyProjectiles(delta: number, W: number, H: number): void {
    for (let i = this.transmogrifyProjectiles.length - 1; i >= 0; i--) {
      const p = this.transmogrifyProjectiles[i];
      p.x += p.vx * (delta / 1000);
      p.y += p.vy * (delta / 1000);
      if (p.x < 0 || p.x > W || p.y < 0 || p.y > H) {
        this.transmogrifyProjectiles.splice(i, 1);
        continue;
      }
      const targets = p.owner === 'player' ? this.api.enemies : [this.api.player];
      let hit = false;
      for (const t of targets) {
        if (!t.active || t.hp <= 0) continue;
        if (Phaser.Math.Distance.Between(p.x, p.y, t.x, t.y) <= 22) {
          this.applyChicken(t);
          hit = true;
          break;
        }
      }
      if (hit) this.transmogrifyProjectiles.splice(i, 1);
    }
  }

  /** Chicken wander: overrides movement post-AI so it wins over the frozen/decision-locked state, mirrors ShadowKit's drag pattern. */
  updateAfterAI(time: number, delta: number): void {
    void delta;
    const nowMs = Date.now();
    for (const f of Array.from(this.chickenStates.keys())) {
      const st = this.chickenStates.get(f)!;
      if (!f.active || f.chickenUntil <= nowMs) {
        if (f.active) { f.setTexture(`elem-${f.element.id}`); f.cooldownMult = st.prevCooldownMult; }
        this.chickenStates.delete(f);
        continue;
      }
      if (time >= st.nextTurnAt) {
        st.angle = Math.random() * Math.PI * 2;
        st.nextTurnAt = time + Phaser.Math.Between(400, 900);
      }
      (f.body as Phaser.Physics.Arcade.Body).setVelocity(
        Math.cos(st.angle) * f.speed * 0.6, Math.sin(st.angle) * f.speed * 0.6,
      );
    }
  }

  // ── F: Dupe ───────────────────────────────────────────────────────────────

  /**
   * Bot synergy — where a Duplication capture would actually pay, and how much.
   *
   * Side-effect free, as every AI read has to be: it counts this side's own conjurations around
   * each candidate centre and hands back the densest one. `count` is what the AI weighs before
   * spending the cast at all.
   */
  npcDupePoint(): { x: number; y: number; count: number } | null {
    const R = 110;
    const pts: { x: number; y: number }[] = [];
    for (const c of this.flameClouds) if (c.owner === 'npc') pts.push(c);
    for (const p of this.puddles) if (p.owner === 'npc') pts.push(p);
    for (const b of this.spurBarbs) if (b.owner === 'npc') pts.push(b);
    for (const w of this.wardZones) if (w.owner === 'npc') pts.push(w);
    for (const s of this.summons) if (s.owner === 'npc') pts.push(s);
    for (const tr of this.sparkTrails) {
      if (tr.owner === 'npc' && tr.pts.length > 0) pts.push(tr.pts[Math.floor(tr.pts.length / 2)]);
    }
    if (pts.length === 0) return null;
    let best: { x: number; y: number } | null = null;
    let bestN = 0;
    for (const c of pts) {
      let n = 0;
      for (const q of pts) if (Phaser.Math.Distance.Between(c.x, c.y, q.x, q.y) <= R) n++;
      if (n > bestN) { bestN = n; best = c; }
    }
    return best ? { x: best.x, y: best.y, count: bestN } : null;
  }

  /** Five burs on one victim knit into a pin, however the fifth one got there. */
  private checkBurClutch(target: Fighter, owner: 'player' | 'npc'): void {
    const now = this.api.scene.sys.game.loop.now;
    const worn = this.burs.filter(b => b.stuck === target && b.owner === owner).length;
    if (worn < 5) return;
    for (let i = this.burs.length - 1; i >= 0; i--) {
      if (this.burs[i].stuck === target && this.burs[i].owner === owner) this.burs.splice(i, 1);
    }
    target.earthStunnedUntil = Math.max(target.earthStunnedUntil, now + 3000);
    this.burStuns.push({ target, releaseAt: now + 3000, owner });
    this.fx(owner).boom(target.x, target.y, 62, { color: MAGIC.vine, sigils: 10, rings: 2, duration: 480 });
    this.api.scene.cameras.main.shake(160, 0.004);
    this.api.showFloatingText(target.x, target.y - 44, '🌿 PINNED — 3s', '#33ff66');
  }

  /**
   * F — Duplication. A square of the arena at the cursor is *recorded*: everything of yours
   * standing in it is written into a scroll that drops where the square was. The scroll is then
   * a thing in the world — drag it with the mouse and let go to read it out, and everything it
   * captured is conjured again around the drop point, offsets intact.
   *
   * Kept under the old ability id and method name so ArenaScene's context, the cooldown bar and
   * the online replay need no changes. It is free: Darkness is charged by the corrupted spells,
   * not by copying them — which is what makes F the pressure valve once F+ is bought.
   */
  doMeditateBegin(owner: 'player' | 'npc'): void {
    const now = this.api.scene.sys.game.loop.now;
    const caster = this.fighter(owner);
    // The bot does not aim a cursor. The kit picks its centre for it — the densest patch of its
    // own conjurations, falling back to the enemy so an empty capture still lands somewhere
    // useful for F+. Geometry stays owner-side; the AI only decides *when*.
    const npcAt = owner === 'npc' ? this.npcDupePoint() : null;
    const cx = owner === 'player' ? (this.lastAimX || caster.x) : (npcAt?.x ?? this.api.player.x);
    const cy = owner === 'player' ? (this.lastAimY || caster.y) : (npcAt?.y ?? this.api.player.y);
    const HALF = 110;
    const inside = (x: number, y: number): boolean =>
      Math.abs(x - cx) <= HALF && Math.abs(y - cy) <= HALF;
    const fx = this.fx(owner);

    this.gesture(owner, 'magic-meditate');
    this.captureFlashes.push({ x: cx, y: cy, half: HALF, expireAt: now + 450, owner });
    fx.ring(cx, cy, 12, HALF, MAGIC.magenta, 620, 8, 3.2);
    fx.conjure(cx, cy, HALF * 0.6, 420, { color: MAGIC.orchid });

    const items: ScrollItem[] = [];
    const rec = (kind: ScrollItem['kind'], x: number, y: number, remaining: number, payload: any): void => {
      items.push({ kind, dx: x - cx, dy: y - cy, remaining, payload });
    };
    for (const c of this.flameClouds) {
      if (c.owner === owner && inside(c.x, c.y)) rec('flame', c.x, c.y, c.expireAt - now, { ...c });
    }
    for (const p of this.puddles) {
      if (p.owner === owner && inside(p.x, p.y)) rec('puddle', p.x, p.y, p.expireAt - now, { ...p });
    }
    for (const b of this.spurBarbs) {
      if (b.owner === owner && inside(b.x, b.y)) rec('barb', b.x, b.y, b.expireAt - now, { sticky: b.sticky });
    }
    for (const tor of this.tornadoes) {
      if (tor.owner === owner && inside(tor.x, tor.y)) rec('tornado', tor.x, tor.y, tor.expireAt - now, { ...tor });
    }
    for (const tr of this.sparkTrails) {
      if (tr.owner !== owner || !tr.pts.some(pt => inside(pt.x, pt.y))) continue;
      rec('trail', cx, cy, tr.expireAt - now,
        { pts: tr.pts.map(pt => ({ x: pt.x - cx, y: pt.y - cy })) });
    }
    // An elemental in the square is written down whole — `plus` is baked in, so the copy keeps
    // its tier and its signature move.
    for (const s of this.summons) {
      if (s.owner === owner && inside(s.x, s.y)) {
        rec('summon', s.x, s.y, s.expireAt - now, { kind: s.kind, plus: s.plus, hp: s.hp, maxHp: s.maxHp });
      }
    }
    for (const w of this.wardZones) {
      if (w.owner === owner && inside(w.x, w.y)) {
        rec('ward', w.x, w.y, w.expireAt - now, { radius: w.radius, plus: w.plus });
      }
    }

    // F+: an enemy caught in the square is recorded too, badly. What comes out is not a fighter —
    // it is the leftover data, and it is worth something to whoever walks over it.
    if (owner === 'player' && this.api.hasUpgrade('f')) {
      for (const e of this.api.enemies) {
        if (!e.active || e.hp <= 0 || !inside(e.x, e.y)) continue;
        this.corruptData.push({
          x: e.x + (Math.random() - 0.5) * 46, y: e.y + (Math.random() - 0.5) * 46,
          expireAt: now + 14000, seed: Math.random() * 10,
        });
        fx.flash(e.x, e.y, 26, 10, MAGIC.magenta);
        this.api.showFloatingText(e.x, e.y - 34, '⧉ CORRUPTED', '#ff66ff');
      }
    }

    if (items.length === 0) {
      this.api.showFloatingText(cx, cy - 34, '⧉ nothing recorded', '#775588');
      return;
    }
    if (owner === 'npc') {
      // A bot has no hand to drag with: its scroll is read the moment it is written.
      this.consumeItems(items, cx, cy, owner);
      return;
    }
    this.scrolls.push({ x: cx, y: cy, items, expireAt: now + 20000, seed: Math.random() * 10, owner });
    this.api.showFloatingText(cx, cy - 34, `📜 RECORDED ×${items.length} — drag me`, '#cc88ff');
  }

  /** Drop the scroll: strike it from the world and conjure what it recorded around the point. */
  private consumeScroll(s: Scroll): void {
    const i = this.scrolls.indexOf(s);
    if (i >= 0) this.scrolls.splice(i, 1);
    this.consumeItems(s.items, s.x, s.y, s.owner);
  }

  /** Read a recording out at (nx, ny): every captured object comes back, offsets intact. */
  private consumeItems(items: ScrollItem[], nx: number, ny: number, owner: 'player' | 'npc'): void {
    const now = this.api.scene.sys.game.loop.now;
    const fx = this.fx(owner);
    const W = this.api.getSceneWidth();
    const H = this.api.getSceneHeight();
    for (const it of items) {
      const x = Phaser.Math.Clamp(nx + it.dx, 16, W - 16);
      const y = Phaser.Math.Clamp(ny + it.dy, 16, H - 16);
      // Whatever life the original had left at recording time is what the copy gets.
      const life = Math.max(600, it.remaining);
      const seed = Math.random() * 10;
      switch (it.kind) {
        case 'flame':
          this.flameClouds.push({
            ...it.payload, x, y, seed, expireAt: now + life, tickAccum: 0,
            orbitAccum: 0, prevAngle: Math.atan2(y - this.lastAimY, x - this.lastAimX),
          });
          break;
        case 'puddle':
          this.puddles.push({ ...it.payload, x, y, seed, expireAt: now + life, tickAccum: 0 });
          break;
        case 'barb':
          this.spurBarbs.push({
            x, y, seed, spin: Math.random() * Math.PI * 2,
            expireAt: now + life, sticky: it.payload.sticky, owner,
          });
          break;
        case 'tornado':
          this.tornadoes.push({
            ...it.payload, x, y, seed, expireAt: now + life, nextDirAt: now, tickAccum: 0,
          });
          break;
        case 'trail':
          this.sparkTrails.push({
            pts: it.payload.pts.map((pt: { x: number; y: number }) => ({ x: nx + pt.x, y: ny + pt.y })),
            expireAt: now + life, seed, owner,
          });
          break;
        case 'summon': {
          const st = MagicKit.SUMMON_STATS[it.payload.kind as SummonKind];
          this.summons.push({
            kind: it.payload.kind, x, y,
            hp: it.payload.hp, maxHp: it.payload.maxHp,
            expireAt: now + life,
            // Clocks are nudged so the pair don't fire the same move on the same frame.
            nextActAt: now + 400 + Math.random() * 500,
            nextBigAt: now + st.big * 0.5 + Math.random() * 1200,
            plus: it.payload.plus, seed, bob: Math.random() * Math.PI * 2,
            pvx: (Math.random() < 0.5 ? -1 : 1) * 150, alt: false,
            owner,
          });
          break;
        }
        case 'ward': {
          const links: WardLink[] = [];
          if (it.payload.plus) {
            const wallR = it.payload.radius + 16;
            for (let li = 0; li < 16; li++) {
              const angle = (li / 16) * Math.PI * 2;
              links.push({
                angle,
                x: x + Math.cos(angle) * wallR, y: y + Math.sin(angle) * wallR,
                vx: 0, vy: 0, free: false, hit: false, spin: angle,
              });
            }
          }
          this.wardZones.push({
            x, y, radius: it.payload.radius, seed, expireAt: now + life,
            links, sheddingAt: now + life - (it.payload.plus ? 3000 : 0),
            nextShedAt: now + life - (it.payload.plus ? 3000 : 0),
            plus: it.payload.plus, owner,
          });
          break;
        }
      }
    }
    fx.boom(nx, ny, 90, { color: MAGIC.orchid, sigils: 12, rings: 2, duration: 520 });
    fx.sigils(nx, ny, Math.min(14, 4 + items.length), { speed: 160, size: 8, life: 560, color: MAGIC.orchid });
    this.api.showFloatingText(nx, ny - 34, `⧉ DUPED ×${items.length}`, '#cc88ff');
    if (owner === 'player') this.api.recordMasteryStat('dupeCopies', items.length);
  }

  /**
   * True when this cast should be the corrupted version: the book is upgraded *and* Dark Magic is
   * switched on for it. Only the player ever owns upgrades, so the NPC always casts the plain
   * book.
   */
  private enhanced(slot: 'e' | 'q', owner: 'player' | 'npc'): boolean {
    if (owner !== 'player' || !this.api.hasUpgrade(slot)) return false;
    return slot === 'e' ? this.darkGrimoireMode : this.darkNecroMode;
  }

  /** Which five spells the given wheel is currently going to cast — read by the wheel painter. */
  isDarkMode(slot: 'grimoire' | 'necronomicon'): boolean {
    return slot === 'grimoire' ? this.darkGrimoireMode : this.darkNecroMode;
  }

  // ── E1: Flare ─────────────────────────────────────────────────────────────

  /**
   * A slow burning orb on a leash: it steers after the cursor, so the caster drives it — until
   * it has lapped the cursor once, at which point the leash snaps and it flies straight forever.
   * 15 damage and a burn to the first thing it touches.
   *
   * Flare+ halves the speed and wraps the orb in a dark aura that damages continuously, so the
   * upgraded version stops being a projectile at all and becomes a steerable no-go zone.
   */
  doFlare(tx: number, ty: number, owner: 'player' | 'npc'): void {
    const caster = this.fighter(owner);
    const angle = Math.atan2(ty - caster.y, tx - caster.x);
    const now = this.api.scene.sys.game.loop.now;
    const plus = this.enhanced('e', owner);
    const speed = plus ? 60 : 120;
    this.gesture(owner, 'magic-grimoire', angle);
    const fx = this.fx(owner);
    fx.ring(caster.x, caster.y, 8, plus ? 74 : 54, plus ? MAGIC.cursed : MAGIC.ember, 460, 9, 2.8);
    this.flameClouds.push({
      seed: Math.random() * 10,
      x: caster.x, y: caster.y,
      vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
      expireAt: now + (plus ? 7000 : 6000),
      tickAccum: 0,
      radius: plus ? 70 : 24,
      tickDmg: 3,
      tickInterval: 400,
      burnDuration: plus ? 4000 : 3000,
      owner,
      homing: true,
      orbitAccum: 0,
      prevAngle: Math.atan2(caster.y - ty, caster.x - tx),
      speed,
      cursedFire: plus,
      aura: plus,
    });
    this.api.showFloatingText(caster.x, caster.y - 34, plus ? '🔥 Flare+' : '🔥 Flare',
      plus ? '#772244' : '#ff8844');
    if (plus) this.addDarkness(DARK_GRIMOIRE_COST);
  }

  // ── E2: Splash ────────────────────────────────────────────────────────────

  /**
   * A pool on the floor at the cursor — Flame Burst gone to water: a third of the bite, twice
   * the floor, and it outstays everything else in the book. Plain Splash is a soft slow you walk
   * out of; Splash+ turns the water putrid and takes the walking-out away — dashes, blinks and
   * the dodge roll are all refused while you stand in it.
   */
  doSplash(tx: number, ty: number, owner: 'player' | 'npc'): void {
    const now = this.api.scene.sys.game.loop.now;
    const plus = this.enhanced('e', owner);
    const radius = plus ? 150 : 120;
    this.gesture(owner, 'magic-grimoire', Math.atan2(ty - this.fighter(owner).y, tx - this.fighter(owner).x));
    const fx = this.fx(owner);
    fx.ring(tx, ty, 10, radius, plus ? MAGIC.acid : MAGIC.storm, 560, 8, 3);
    fx.sigils(tx, ty, plus ? 10 : 7, {
      speed: radius * 1.4, size: 7, life: 520, color: plus ? MAGIC.acid : MAGIC.stormHi, points: 4,
    });
    this.puddles.push({
      seed: Math.random() * 10,
      x: tx, y: ty,
      radius,
      expireAt: now + (plus ? 16000 : 14000),
      tickAccum: 0,
      tickDmg: plus ? 6 : 3,
      slowMult: plus ? 0.3 : 0.6,
      putrid: plus,
      owner,
    });
    this.api.showFloatingText(tx, ty - 30, plus ? '🌊 Splash+' : '🌊 Splash',
      plus ? '#66cc55' : '#66aaff');
    if (plus) this.addDarkness(DARK_GRIMOIRE_COST);
  }

  // ── E3: Spur ──────────────────────────────────────────────────────────────

  /**
   * Fifteen barbs scattered on the floor around the caster. Each one is trivial — small damage
   * and a slow to whoever steps on it — but together they are a carpet, and the rest of the book
   * (Gust hauls, Splash pools) exists to make people walk on carpets. Spur+ barbs also stick a
   * bur into the victim for two seconds: five worn at once still knits into the 3s pin.
   */
  doSpur(tx: number, ty: number, owner: 'player' | 'npc'): void {
    const caster = this.fighter(owner);
    const now = this.api.scene.sys.game.loop.now;
    const plus = this.enhanced('e', owner);
    const baseAngle = Math.atan2(ty - caster.y, tx - caster.x);
    const W = this.api.getSceneWidth();
    const H = this.api.getSceneHeight();
    this.gesture(owner, 'magic-grimoire', baseAngle);
    for (let i = 0; i < 15; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = 30 + Math.random() * 130;
      this.spurBarbs.push({
        x: Phaser.Math.Clamp(caster.x + Math.cos(a) * d, 16, W - 16),
        y: Phaser.Math.Clamp(caster.y + Math.sin(a) * d, 16, H - 16),
        seed: Math.random() * 10,
        spin: Math.random() * Math.PI * 2,
        expireAt: now + 10000,
        sticky: plus,
        owner,
      });
    }
    this.fx(owner).sigils(caster.x, caster.y, 8, {
      speed: 150, size: 6, life: 420, color: plus ? MAGIC.darkVine : MAGIC.leaf, points: 4,
    });
    this.api.showFloatingText(caster.x, caster.y - 34, plus ? '🌿 Spur+' : '🌿 Spur', '#44ff66');
    if (plus) this.addDarkness(DARK_GRIMOIRE_COST);
  }

  /**
   * Legacy shim: Spur no longer throws thorn-vine projectiles, but ArenaScene still carries the
   * collision call sites. If one ever fires, treat it as a barb being trodden on.
   */
  onThornVineHit(target: Fighter, owner: 'player' | 'npc'): void {
    this.api.spawnHitFlash(target.x, target.y, MAGIC.leaf);
    this.fx(owner).sigils(target.x, target.y, 3, {
      speed: 80, size: 5, life: 340, color: MAGIC.leaf, points: 4,
    });
  }

  // ── E4: Gust ──────────────────────────────────────────────────────────────

  /**
   * You dash; anything the gust catches is dragged back to the spot you cast from. The recall is
   * the spell — Gust is how Magic collects an enemy who will not come to it.
   *
   * Gust+ paints the dash path with live electricity for eight seconds, so the haul back drags
   * them down a road that hurts, and so *you* have a road that is 25% faster to walk on.
   */
  doGust(tx: number, ty: number, owner: 'player' | 'npc'): void {
    const caster = this.fighter(owner);
    const now = this.api.scene.sys.game.loop.now;
    const plus = this.enhanced('e', owner);
    const angle = Math.atan2(ty - caster.y, tx - caster.x);
    const castX = caster.x, castY = caster.y;
    const reach = Math.min(240, Math.max(90, Phaser.Math.Distance.Between(castX, castY, tx, ty)));
    const endX = castX + Math.cos(angle) * reach;
    const endY = castY + Math.sin(angle) * reach;

    this.gesture(owner, 'magic-grimoire', angle);
    const fx = this.fx(owner);
    fx.gust(castX, castY, angle, reach, Math.PI / 5, {
      color: plus ? MAGIC.thunderHi : MAGIC.gust, duration: 520,
    });

    // The caster rides their own gale, unless something is holding them down.
    if (now >= caster.highGravityUntil && now >= caster.mobilityBlockedUntil) {
      (caster.body as Phaser.Physics.Arcade.Body).setVelocity(
        Math.cos(angle) * 620, Math.sin(angle) * 620,
      );
    }

    // Anything standing in the corridor is caught and owes a trip back to the cast point.
    for (const t of (owner === 'player' ? this.api.enemies : [this.api.player])) {
      if (!t.active || t.hp <= 0) continue;
      if (this._pointToSegDist(t.x, t.y, castX, castY, endX, endY) > 96) continue;
      t.takeDamage(6);
      this.api.spawnHitFlash(t.x, t.y, MAGIC.gust);
      this.gustHauls.push({
        target: t, toX: castX, toY: castY,
        expireAt: now + 1300, tickAccum: 0, owner,
      });
      this.api.showFloatingText(t.x, t.y - 30, '💨 CAUGHT', '#dddddd');
    }

    if (plus) {
      const pts: { x: number; y: number }[] = [];
      for (let i = 0; i <= 8; i++) {
        const u = i / 8;
        pts.push({ x: castX + (endX - castX) * u, y: castY + (endY - castY) * u });
      }
      this.sparkTrails.push({ pts, expireAt: now + 8000, seed: Math.random() * 10, owner });
    }

    // The landing. When the dash is spent, the air it dragged along arrives all at once —
    // a hard burst around wherever the caster ended up, and everyone near it thrown out of it.
    this.api.scene.time.delayedCall(430, () => {
      if (!caster.active || caster.hp <= 0) return;
      const lx = caster.x, ly = caster.y;
      this.api.dealAoeDamageFromOwner(lx, ly, 100, 15, owner);
      for (const t of (owner === 'player' ? this.api.enemies : [this.api.player])) {
        if (!t.active || t.hp <= 0 || t.knockbackImmune) continue;
        if (Phaser.Math.Distance.Between(lx, ly, t.x, t.y) > 100) continue;
        const a2 = Math.atan2(t.y - ly, t.x - lx);
        (t.body as Phaser.Physics.Arcade.Body).setVelocity(Math.cos(a2) * 720, Math.sin(a2) * 720);
        this.api.showFloatingText(t.x, t.y - 26, '💨 THROWN', '#dddddd');
      }
      fx.boom(lx, ly, 100, { color: plus ? MAGIC.thunderHi : MAGIC.gust, sigils: 10, rings: 2, duration: 480 });
      this.api.scene.cameras.main.shake(140, 0.004);
    });

    this.api.showFloatingText(castX, castY - 34, plus ? '💨 Gust+' : '💨 Gust',
      plus ? '#ffee88' : '#cccccc');
    if (plus) this.addDarkness(DARK_GRIMOIRE_COST);
  }

  // ── E5: Ward ──────────────────────────────────────────────────────────────

  /**
   * A standing circle laid down at the caster's feet: +3 shield HP a second and a 25% damage
   * cut while they hold their ground inside it, for eight seconds. Both are loans — leaving the
   * circle (or outliving it) claws the unspent shield back — so the spell is a commitment to
   * fight *here*, not a stat.
   *
   * Ward+ stands a linked wall of rectangular rock on the circle's edge. The wall is *solid to
   * people and open to bullets*, so an upgraded Ward keeps a melee enemy out of the circle while
   * doing nothing at all about a shooter. As it dies the links tear loose one at a time and fly.
   */
  doWard(owner: 'player' | 'npc'): void {
    const caster = this.fighter(owner);
    const now = this.api.scene.sys.game.loop.now;
    const plus = this.enhanced('e', owner);
    const life = plus ? 10000 : 8000;
    const radius = plus ? 120 : 110;

    // One Ward at a time per side — a second cast replaces the first.
    for (let i = this.wardZones.length - 1; i >= 0; i--) {
      if (this.wardZones[i].owner === owner) this.wardZones.splice(i, 1);
    }

    const links: WardLink[] = [];
    if (plus) {
      const wallR = radius + 16;
      for (let i = 0; i < 16; i++) {
        const angle = (i / 16) * Math.PI * 2;
        links.push({
          angle,
          x: caster.x + Math.cos(angle) * wallR,
          y: caster.y + Math.sin(angle) * wallR,
          vx: 0, vy: 0, free: false, hit: false,
          spin: angle,
        });
      }
    }
    this.wardZones.push({
      x: caster.x, y: caster.y,
      radius,
      seed: Math.random() * 10,
      expireAt: now + life,
      links,
      sheddingAt: now + life - (plus ? 3000 : 0),
      nextShedAt: now + life - (plus ? 3000 : 0),
      plus,
      owner,
    });

    const fx = this.fx(owner);
    fx.ring(caster.x, caster.y, 8, radius + (plus ? 26 : 10), MAGIC.stone, 560, 8, 2.8);
    fx.sigils(caster.x, caster.y, 8, { speed: radius * 1.2, size: 6, life: 440, color: MAGIC.sand, points: 4 });
    this.api.showFloatingText(caster.x, caster.y - 30, plus ? '🪨 Ward+' : '🪨 Ward', '#cc9944');
    if (plus) this.addDarkness(DARK_GRIMOIRE_COST);
  }

  private _spawnRockSet(owner: 'player' | 'npc', count: number, orbitR: number, expireAt: number, dmg: number, canCrack: boolean): RockOrbSet {
    const orbs: RockOrb[] = [];
    const radius = canCrack ? 13 : 9;
    const caster = this.fighter(owner);
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      orbs.push({
        angle, radius,
        x: caster.x + Math.cos(angle) * orbitR,
        y: caster.y + Math.sin(angle) * orbitR,
        cracked: false, lastHitAt: 0, canCrack, dmg, owner,
      });
    }
    // Stone hauled up out of nothing: a circle opens and each orb arrives on it.
    const fx = this.fx(owner);
    fx.ring(caster.x, caster.y, 8, orbitR + 12, MAGIC.stone, 520, 8, 2.6);
    for (const o of orbs) fx.sigils(o.x, o.y, 3, { speed: 70, size: 6, life: 400, color: MAGIC.sand, points: 4 });
    const now = this.api.scene.sys.game.loop.now;
    return { orbs, expireAt: expireAt > 1e9 ? expireAt : now + expireAt, orbitR };
  }

  // ── Q: Summons ────────────────────────────────────────────────────────────

  private static readonly SUMMON_STATS: Record<SummonKind, { hp: number; act: number; big: number; emoji: string; color: string }> = {
    fire:  { hp: 45, act: 1100, big: 7000,  emoji: '🔥', color: '#ff8844' },
    water: { hp: 50, act: 1600, big: 8000,  emoji: '🌊', color: '#66aaff' },
    life:  { hp: 60, act: 1300, big: 9000,  emoji: '🌿', color: '#66dd77' },
    wind:  { hp: 40, act: 1900, big: 10000, emoji: '💨', color: '#dddddd' },
    earth: { hp: 80, act: 2000, big: 9000,  emoji: '🪨', color: '#cc9944' },
  };

  /**
   * Q. Calls one base element up as an elemental that assists from the gallery: it climbs to
   * the top of the screen and paces left-right there for its eight seconds, throwing its help
   * down into the fight — each kind in its own two ways (see `summonAttack`).
   *
   * Upgraded elementals keep the same assists and gain a signature move on a long clock — so Q+
   * does not make them act faster, it makes them occasionally do something the plain book has
   * no answer to at all. They are ordinary conjured objects, so the Duplication scroll records
   * them.
   */
  doSummon(kind: SummonKind, tx: number, ty: number, owner: 'player' | 'npc'): void {
    const caster = this.fighter(owner);
    const now = this.api.scene.sys.game.loop.now;
    const plus = this.enhanced('q', owner);
    const st = MagicKit.SUMMON_STATS[kind];
    const angle = Math.atan2(ty - caster.y, tx - caster.x);
    const sx = caster.x + Math.cos(angle) * 54;
    const sy = caster.y + Math.sin(angle) * 54;
    const hp = plus ? Math.round(st.hp * 1.4) : st.hp;

    this.summons.push({
      kind, x: sx, y: sy,
      hp, maxHp: hp,
      expireAt: now + 8000,
      nextActAt: now + 700,
      nextBigAt: now + st.big * 0.5,
      plus, seed: Math.random() * 10, bob: Math.random() * Math.PI * 2,
      pvx: (Math.random() < 0.5 ? -1 : 1) * 150,
      alt: false,
      owner,
    });

    this.gesture(owner, 'magic-necronomicon', angle);
    const fx = this.fx(owner);
    fx.conjure(sx, sy, 46, 460, { color: MAGIC.orchid });
    fx.ring(sx, sy, 8, 60, plus ? MAGIC.magenta : MAGIC.orchid, 560, 8, 3);
    fx.sigils(sx, sy, plus ? 12 : 8, { speed: 150, size: 8, life: 560, color: MAGIC.lilac });
    this.api.scene.cameras.main.shake(140, 0.004);
    this.api.showFloatingText(caster.x, caster.y - 34,
      `${st.emoji} ${plus ? 'GREATER ' : ''}SUMMON`, st.color);
    if (plus) this.addDarkness(DARK_NECRO_COST);
  }

  /** Anything that damages a familiar routes through here, so one place handles it dying. */
  private hurtSummon(s: Summon, amount: number): void {
    s.hp -= amount;
    this.api.spawnHitFlash(s.x, s.y, MAGIC.lilac);
    if (s.hp > 0) return;
    const i = this.summons.indexOf(s);
    if (i >= 0) this.summons.splice(i, 1);
    this.fx(s.owner).boom(s.x, s.y, 56, { color: MAGIC.violet, sigils: 9, rings: 2, duration: 460 });
  }

  /**
   * The assists. Each elemental alternates between its two ways of helping — a thrown attack
   * and a placed one — so every kind reads as a *worker* up there rather than as a turret.
   */
  private summonAttack(s: Summon, time: number): void {
    const caster = this.fighter(s.owner);
    const enemies = (s.owner === 'player' ? this.api.enemies : [this.api.player])
      .filter(t => t.active && t.hp > 0);
    let target: Fighter | null = null;
    for (const t of enemies) {
      if (!target || Phaser.Math.Distance.Between(s.x, s.y, t.x, t.y)
        < Phaser.Math.Distance.Between(s.x, s.y, target.x, target.y)) target = t;
    }
    const fx = this.fx(s.owner);
    s.alt = !s.alt;

    switch (s.kind) {
      case 'fire': {
        if (!target) return;
        const angle = Math.atan2(target.y - s.y, target.x - s.x);
        if (s.alt) {
          // A burst of bolts in a cone.
          for (const off of [-0.22, -0.11, 0, 0.11, 0.22]) {
            this.summonBolts.push({
              kind: 'fire', x: s.x, y: s.y,
              vx: Math.cos(angle + off) * 360, vy: Math.sin(angle + off) * 360,
              owner: s.owner,
            });
          }
          fx.sigils(s.x, s.y, 3, { speed: 90, angle, spread: 0.5, size: 5, life: 320, color: MAGIC.ember, points: 4 });
        } else {
          // A pillar of fire lit under their feet.
          this.firePillars.push({
            x: target.x, y: target.y,
            armAt: time + 700, expireAt: time + 1900, fired: false,
            seed: Math.random() * 10, owner: s.owner,
          });
          this.api.showFloatingText(target.x, target.y - 36, '🔥 PILLAR', '#ff8844');
        }
        break;
      }
      case 'water': {
        if (!target) return;
        if (s.alt) {
          // A wave sent down at them — whoever it catches rides it toward the wall.
          const angle = Math.atan2(target.y - s.y, target.x - s.x);
          this.waves.push({
            x: s.x, y: s.y,
            vx: Math.cos(angle) * 260, vy: Math.sin(angle) * 260,
            seed: Math.random() * 10, owner: s.owner,
          });
        } else {
          // A slowing pool poured out under them. It slows; it does not bite.
          this.puddles.push({
            seed: Math.random() * 10, x: target.x, y: target.y, radius: 70,
            expireAt: time + 4000, tickAccum: 0, tickDmg: 0, slowMult: 0.6,
            putrid: false, owner: s.owner,
          });
        }
        break;
      }
      case 'life': {
        if (s.alt || !target) {
          // A mote of green light sent home with health in it.
          this.healOrbs.push({ x: s.x, y: s.y, vx: 0, vy: 240, owner: s.owner });
        } else {
          // A vine dart that slows what it sticks.
          const angle = Math.atan2(target.y - s.y, target.x - s.x);
          this.summonBolts.push({
            kind: 'life', x: s.x, y: s.y,
            vx: Math.cos(angle) * 330, vy: Math.sin(angle) * 330,
            owner: s.owner,
          });
        }
        break;
      }
      case 'wind': {
        if (!target) return;
        if (s.alt) {
          // A mini tornado dropped into the pit — huge damage, and it bounces on its own.
          this.tornadoes.push({
            seed: Math.random() * 10, radius: 44, dark: false,
            x: s.x, y: s.y, vx: 0, vy: 260,
            expireAt: time + 3500, nextDirAt: time + 400, tickAccum: 0, tickDmg: 9,
            owner: s.owner,
          });
          this.api.showFloatingText(s.x, s.y + 20, '💨 TWISTER', '#dddddd');
        } else {
          this.lightningStrokes.push({ x: target.x, y: target.y, strikeAt: time + 500, owner: s.owner });
        }
        break;
      }
      case 'earth': {
        if (s.alt && target) {
          // A wall thrown across the line between its caster and the enemy.
          const mx = (caster.x + target.x) / 2, my = (caster.y + target.y) / 2;
          const a = Math.atan2(target.y - caster.y, target.x - caster.x) + Math.PI / 2;
          const half = 70;
          this.earthWalls.push({
            x1: mx - Math.cos(a) * half, y1: my - Math.sin(a) * half,
            x2: mx + Math.cos(a) * half, y2: my + Math.sin(a) * half,
            expireAt: time + 4000, owner: s.owner,
          });
          this.api.showFloatingText(mx, my - 24, '🪨 WALL', '#cc9944');
        } else {
          // Stone pressed into its caster's guard.
          caster.shieldHp += 8;
          fx.flash(caster.x, caster.y, 24, 10, MAGIC.sand);
          this.api.showFloatingText(caster.x, caster.y - 34, '🪨 +8 shield', '#cc9944');
        }
        break;
      }
    }
  }

  /** The Q+ signature move. One per familiar, and each one is the reason to upgrade it. */
  private summonSignature(s: Summon, time: number, W: number, H: number): void {
    const enemies = (s.owner === 'player' ? this.api.enemies : [this.api.player])
      .filter(t => t.active && t.hp > 0);
    if (enemies.length === 0) return;
    const target = enemies[0];
    const fx = this.fx(s.owner);

    switch (s.kind) {
      case 'fire': {
        this.crossBombs.push({
          x: target.x, y: target.y,
          armAt: time + 900, expireAt: time + 1900, fired: false, owner: s.owner,
        });
        fx.ring(target.x, target.y, 10, 60, MAGIC.flameRed, 900, 8, 3);
        this.api.showFloatingText(target.x, target.y - 40, '🔥 BOMB', '#ff5522');
        break;
      }
      case 'water': {
        // The whole arena goes under. There is nowhere to stand this one out.
        if (s.owner === 'player') this.npcFloodUntil = Math.max(this.npcFloodUntil, time + 4000);
        else this.playerFloodUntil = Math.max(this.playerFloodUntil, time + 4000);
        for (let i = 0; i < 6; i++) {
          fx.ring(Math.random() * W, Math.random() * H, 10, 90, MAGIC.storm, 700, 3, 2.4);
        }
        this.api.scene.cameras.main.shake(300, 0.005);
        this.api.showFloatingText(W / 2, 60, '🌊 FLOOD — 20% slow', '#66aaff');
        break;
      }
      case 'life': {
        // Individually feeble; the point is that there are eighteen of them.
        for (let i = 0; i < 18; i++) {
          const a = Math.random() * Math.PI * 2;
          const r = Math.random() * 150;
          this.rootSpikes.push({
            x: Phaser.Math.Clamp(target.x + Math.cos(a) * r, 20, W - 20),
            y: Phaser.Math.Clamp(target.y + Math.sin(a) * r, 20, H - 20),
            armAt: time + 400 + Math.random() * 700,
            expireAt: time + 2600,
            fired: false, seed: Math.random() * 10, owner: s.owner,
          });
        }
        this.api.showFloatingText(target.x, target.y - 40, '🌿 ROOT BARRAGE', '#66dd77');
        break;
      }
      case 'wind': {
        this.tornadoes.push({
          seed: Math.random() * 10, radius: 52, dark: false,
          x: target.x, y: target.y, vx: 0, vy: 0,
          expireAt: time + 8000, nextDirAt: time, tickAccum: 0, tickDmg: 4, owner: s.owner,
        });
        this.api.scene.cameras.main.shake(260, 0.006);
        this.api.showFloatingText(target.x, target.y - 40, '💨 HURRICANE — stand in the eye', '#eeeeee');
        break;
      }
      case 'earth': {
        for (let i = 0; i < 5; i++) {
          this.groundCracks.push({
            x: Phaser.Math.Between(60, W - 60),
            y: Phaser.Math.Between(60, H - 60),
            radius: 34,
            armAt: time + 800, expireAt: time + 9000,
            seed: Math.random() * 10, owner: s.owner,
          });
        }
        this.api.scene.cameras.main.shake(320, 0.007);
        this.api.showFloatingText(W / 2, 60, '🪨 THE FLOOR OPENS', '#cc9944');
        break;
      }
    }
  }

  /**
   * Familiars, their shots, and everything their signature moves left lying in the arena.
   *
   * The cracks are the one thing in this kit that does not care whose side you are on: the
   * conjurer falls down their own hole exactly like the enemy does, unless Levitate is holding
   * them off the floor.
   */
  private _updateSummons(time: number, delta: number, W: number, H: number): void {
    // ── The familiars themselves ──
    for (let i = this.summons.length - 1; i >= 0; i--) {
      const s = this.summons[i];
      if (time >= s.expireAt) {
        this.fx(s.owner).motes(s.x, s.y, 7, { speed: 60, size: 2.6, life: 700, color: MAGIC.lilac, drift: -26 });
        this.summons.splice(i, 1);
        continue;
      }
      s.bob += delta * 0.005;

      // The gallery. An elemental climbs to the top of the screen and paces left-right there
      // for its eight seconds — it never wades into the pit, it throws its help down into it.
      const TOP_Y = 46;
      if (s.y > TOP_Y + 8) {
        s.y -= 300 * (delta / 1000);
        s.x += s.pvx * 0.3 * (delta / 1000);
      } else {
        s.y = TOP_Y + Math.sin(s.bob) * 6;
        s.x += s.pvx * (delta / 1000);
        if (s.x < 40) { s.x = 40; s.pvx = Math.abs(s.pvx); }
        if (s.x > W - 40) { s.x = W - 40; s.pvx = -Math.abs(s.pvx); }
      }
      s.x = Phaser.Math.Clamp(s.x, 14, W - 14);
      s.y = Phaser.Math.Clamp(s.y, 14, H - 14);

      const st = MagicKit.SUMMON_STATS[s.kind];
      if (time >= s.nextActAt) {
        s.nextActAt = time + st.act;
        this.summonAttack(s, time);
      }
      if (s.plus && time >= s.nextBigAt) {
        s.nextBigAt = time + st.big;
        this.summonSignature(s, time, W, H);
      }

      // Hostile shots can kill a familiar — it is a body on the field, not a decoration.
      const projs = this.api.projectiles.getMatching('active', true) as Phaser.GameObjects.Image[];
      for (const p of projs) {
        const pAny = p as any;
        const hostile = s.owner === 'player' ? !pAny.isFromPlayer : pAny.isFromPlayer;
        if (!hostile) continue;
        if (Phaser.Math.Distance.Between(s.x, s.y, p.x, p.y) > 20) continue;
        p.setActive(false).setVisible(false);
        (pAny.body as Phaser.Physics.Arcade.Body)?.stop();
        this.hurtSummon(s, pAny.damage ?? 5);
        break;
      }
    }

    // ── Familiar shots ──
    for (let i = this.summonBolts.length - 1; i >= 0; i--) {
      const b = this.summonBolts[i];
      b.x += b.vx * (delta / 1000);
      b.y += b.vy * (delta / 1000);
      if (b.x < -20 || b.x > W + 20 || b.y < -20 || b.y > H + 20) { this.summonBolts.splice(i, 1); continue; }
      const targets = b.owner === 'player' ? this.api.enemies : [this.api.player];
      let landed = false;
      for (const t of targets) {
        if (!t.active || t.hp <= 0) continue;
        if (Phaser.Math.Distance.Between(b.x, b.y, t.x, t.y) > 22) continue;
        landed = true;
        if (b.kind === 'fire') {
          t.takeDamage(8);
          t.burningUntil = Math.max(t.burningUntil, time + 2000);
          this.api.spawnHitFlash(t.x, t.y, MAGIC.ember);
        } else {
          // Life's vine dart: a light hit, and legs that stop working properly.
          t.takeDamage(4);
          this.api.spawnHitFlash(t.x, t.y, MAGIC.leaf);
          if (b.owner === 'player') this.npcStormSlowUntil = Math.max(this.npcStormSlowUntil, time + 1500);
          else this.playerStormSlowUntil = Math.max(this.playerStormSlowUntil, time + 1500);
          this.api.showFloatingText(t.x, t.y - 26, '🌿 SLOWED', '#66dd77');
        }
        this.fx(b.owner).boom(b.x, b.y, 34, {
          color: b.kind === 'fire' ? MAGIC.ember : MAGIC.vine, sigils: 4, rings: 1, duration: 300, mark: false,
        });
        break;
      }
      if (landed) this.summonBolts.splice(i, 1);
    }

    // ── Fire elemental: pillars of flame ──
    for (let i = this.firePillars.length - 1; i >= 0; i--) {
      const p = this.firePillars[i];
      if (time >= p.expireAt) { this.firePillars.splice(i, 1); continue; }
      if (p.fired || time < p.armAt) continue;
      p.fired = true;
      for (const t of (p.owner === 'player' ? this.api.enemies : [this.api.player])) {
        if (!t.active || t.hp <= 0) continue;
        if (Phaser.Math.Distance.Between(p.x, p.y, t.x, t.y) > 36) continue;
        t.takeDamage(12);
        t.burningUntil = Math.max(t.burningUntil, time + 2000);
        this.api.spawnHitFlash(t.x, t.y, MAGIC.ember);
        this.api.showFloatingText(t.x, t.y - 30, '🔥 -12', '#ff8844');
      }
      this.fx(p.owner).flash(p.x, p.y, 30, 10, MAGIC.flameHi);
    }

    // ── Wind elemental: lightning strokes ──
    for (let i = this.lightningStrokes.length - 1; i >= 0; i--) {
      const l = this.lightningStrokes[i];
      if (time < l.strikeAt) continue;
      const fx = this.fx(l.owner);
      fx.bolt(l.x, l.y, 150, 12, MAGIC.thunder);
      fx.flash(l.x, l.y, 34, 11, MAGIC.thunderHi);
      for (const t of (l.owner === 'player' ? this.api.enemies : [this.api.player])) {
        if (!t.active || t.hp <= 0) continue;
        if (Phaser.Math.Distance.Between(l.x, l.y, t.x, t.y) > 44) continue;
        t.takeDamage(12);
        this.api.spawnHitFlash(t.x, t.y, MAGIC.thunder);
        this.api.showFloatingText(t.x, t.y - 30, '⚡ -12', '#ffee44');
      }
      this.api.scene.cameras.main.shake(120, 0.003);
      this.lightningStrokes.splice(i, 1);
    }

    // ── Earth elemental: walls, solid only to the other side ──
    for (let i = this.earthWalls.length - 1; i >= 0; i--) {
      const w = this.earthWalls[i];
      if (time >= w.expireAt) {
        this.fx(w.owner).motes((w.x1 + w.x2) / 2, (w.y1 + w.y2) / 2, 6,
          { speed: 50, size: 2.4, life: 600, color: MAGIC.stone, drift: -14 });
        this.earthWalls.splice(i, 1);
        continue;
      }
      for (const e of (w.owner === 'player' ? this.api.enemies : [this.api.player])) {
        if (!e.active || e.hp <= 0) continue;
        const d = this._pointToSegDist(e.x, e.y, w.x1, w.y1, w.x2, w.y2);
        if (d > 20) continue;
        // Put them back out on their own side of the stone.
        const wx = w.x2 - w.x1, wy = w.y2 - w.y1;
        const len = Math.hypot(wx, wy) || 1;
        let nx = -wy / len, ny = wx / len;
        const mx = (w.x1 + w.x2) / 2, my = (w.y1 + w.y2) / 2;
        if ((e.x - mx) * nx + (e.y - my) * ny < 0) { nx = -nx; ny = -ny; }
        e.setPosition(e.x + nx * (22 - d), e.y + ny * (22 - d));
      }
      const wallProjs = this.api.projectiles.getMatching('active', true) as Phaser.GameObjects.Image[];
      for (const p of wallProjs) {
        const pAny = p as any;
        const hostile = w.owner === 'player' ? !pAny.isFromPlayer : pAny.isFromPlayer;
        if (!hostile) continue;
        if (this._pointToSegDist(p.x, p.y, w.x1, w.y1, w.x2, w.y2) > 14) continue;
        p.setActive(false).setVisible(false);
        (pAny.body as Phaser.Physics.Arcade.Body)?.stop();
        this.fx(w.owner).flash(p.x, p.y, 12, 10, MAGIC.granite);
      }
    }

    // ── Life elemental: heal orbs homing back to the caster ──
    for (let i = this.healOrbs.length - 1; i >= 0; i--) {
      const o = this.healOrbs[i];
      const caster = this.fighter(o.owner);
      if (!caster.active || caster.hp <= 0) { this.healOrbs.splice(i, 1); continue; }
      const want = Math.atan2(caster.y - o.y, caster.x - o.x);
      let heading = Math.atan2(o.vy, o.vx);
      const turn = 7 * (delta / 1000);
      heading += Phaser.Math.Clamp(Phaser.Math.Angle.Wrap(want - heading), -turn, turn);
      o.vx = Math.cos(heading) * 240;
      o.vy = Math.sin(heading) * 240;
      o.x += o.vx * (delta / 1000);
      o.y += o.vy * (delta / 1000);
      if (Phaser.Math.Distance.Between(o.x, o.y, caster.x, caster.y) > 22) continue;
      this.healOrbs.splice(i, 1);
      caster.heal(6);
      this.fx(o.owner).motes(caster.x, caster.y, 6, { speed: 60, size: 2.6, life: 600, color: MAGIC.leaf, drift: -24 });
      this.api.showFloatingText(caster.x, caster.y - 34, '🌿 +6', '#66dd77');
    }

    // ── Water elemental: waves, and the wall waiting at the end of the ride ──
    for (let i = this.waves.length - 1; i >= 0; i--) {
      const w = this.waves[i];
      w.x += w.vx * (delta / 1000);
      w.y += w.vy * (delta / 1000);
      if (w.x < -30 || w.x > W + 30 || w.y < -30 || w.y > H + 30) {
        this.fx(w.owner).motes(Phaser.Math.Clamp(w.x, 10, W - 10), Phaser.Math.Clamp(w.y, 10, H - 10),
          6, { speed: 60, size: 2.4, life: 520, color: MAGIC.stormHi, drift: -10 });
        this.waves.splice(i, 1);
        continue;
      }
      const wlen = Math.hypot(w.vx, w.vy) || 1;
      for (const t of (w.owner === 'player' ? this.api.enemies : [this.api.player])) {
        if (!t.active || t.hp <= 0) continue;
        if (Phaser.Math.Distance.Between(w.x, w.y, t.x, t.y) > 46) continue;
        if (this.waveSlams.some(ws => ws.target === t)) continue;
        t.takeDamage(4);
        this.api.spawnHitFlash(t.x, t.y, MAGIC.stormHi);
        this.waveSlams.push({
          target: t,
          vx: (w.vx / wlen) * 620, vy: (w.vy / wlen) * 620,
          until: time + 800, owner: w.owner,
        });
        this.api.showFloatingText(t.x, t.y - 30, '🌊 SWEPT', '#66aaff');
      }
    }
    for (let i = this.waveSlams.length - 1; i >= 0; i--) {
      const ws = this.waveSlams[i];
      const t = ws.target;
      if (time >= ws.until || !t.active || t.hp <= 0) { this.waveSlams.splice(i, 1); continue; }
      // Re-asserted every frame, exactly like a Gust haul — the ride is not optional.
      (t.body as Phaser.Physics.Arcade.Body).setVelocity(ws.vx, ws.vy);
      if (t.x > 30 && t.x < W - 30 && t.y > 30 && t.y < H - 30) continue;
      // The wall arrived first.
      this.waveSlams.splice(i, 1);
      t.takeDamage(10);
      this.api.spawnHitFlash(t.x, t.y, MAGIC.storm);
      this.fx(ws.owner).boom(t.x, t.y, 46, { color: MAGIC.storm, sigils: 6, rings: 1, duration: 380, mark: false });
      this.api.showFloatingText(t.x, t.y - 30, '🌊 SLAMMED', '#66aaff');
    }

    // ── Fire+ cross bombs ──
    for (let i = this.crossBombs.length - 1; i >= 0; i--) {
      const b = this.crossBombs[i];
      if (time >= b.expireAt) { this.crossBombs.splice(i, 1); continue; }
      if (b.fired || time < b.armAt) continue;
      b.fired = true;
      const fx = this.fx(b.owner);
      const ARM = 200, HALF = 26;
      for (const t of (b.owner === 'player' ? this.api.enemies : [this.api.player])) {
        if (!t.active || t.hp <= 0) continue;
        const dx = Math.abs(t.x - b.x), dy = Math.abs(t.y - b.y);
        // Inside either bar of the cross, not the bounding box — the diagonals are safe.
        if (!((dx <= ARM && dy <= HALF) || (dy <= ARM && dx <= HALF))) continue;
        t.takeDamage(18);
        t.burningUntil = Math.max(t.burningUntil, time + 3000);
        this.api.spawnHitFlash(t.x, t.y, MAGIC.flameHi);
      }
      fx.flash(b.x, b.y, 44, 10, MAGIC.flameHi);
      for (const ang of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
        fx.sigils(b.x + Math.cos(ang) * ARM * 0.5, b.y + Math.sin(ang) * ARM * 0.5, 6, {
          speed: 170, angle: ang, spread: 0.35, size: 9, life: 560, color: MAGIC.ember,
        });
      }
      this.api.scene.cameras.main.shake(280, 0.008);
    }

    // ── Life+ root spikes ──
    for (let i = this.rootSpikes.length - 1; i >= 0; i--) {
      const r = this.rootSpikes[i];
      if (time >= r.expireAt) { this.rootSpikes.splice(i, 1); continue; }
      if (r.fired || time < r.armAt) continue;
      r.fired = true;
      for (const t of (r.owner === 'player' ? this.api.enemies : [this.api.player])) {
        if (!t.active || t.hp <= 0) continue;
        if (Phaser.Math.Distance.Between(r.x, r.y, t.x, t.y) > 30) continue;
        t.takeDamage(3);
        t.earthStunnedUntil = Math.max(t.earthStunnedUntil, time + 2500);
        this.api.spawnHitFlash(t.x, t.y, MAGIC.leaf);
        this.api.showFloatingText(t.x, t.y - 34, '🌿 ROOTED', '#66dd77');
      }
      this.fx(r.owner).sigils(r.x, r.y, 3, { speed: 70, size: 6, life: 340, color: MAGIC.leaf, points: 4 });
    }

    // ── Earth+ cracks, and whoever is down one ──
    for (let i = this.groundCracks.length - 1; i >= 0; i--) {
      const c = this.groundCracks[i];
      if (time >= c.expireAt) { this.groundCracks.splice(i, 1); continue; }
      if (time < c.armAt) continue;
      for (const f of [this.api.player, ...this.api.enemies]) {
        if (!f.active || f.hp <= 0) continue;
        if (this.fallen.some(fa => fa.f === f)) continue;
        if (Phaser.Math.Distance.Between(c.x, c.y, f.x, f.y) > c.radius) continue;
        // Levitate is the one thing that reads the floor as optional.
        if (f.levitating) continue;
        f.takeDamage(20);
        f.forceInvisible = true;
        f.earthStunnedUntil = Math.max(f.earthStunnedUntil, time + 1000);
        this.fallen.push({ f, returnAt: time + 1000 });
        this.fx(c.owner).boom(c.x, c.y, 54, { color: MAGIC.ash, sigils: 8, rings: 2, duration: 460, mark: false });
        this.api.showFloatingText(c.x, c.y - 30, '🪨 FELL IN — 20', '#cc9944');
      }
    }
    for (let i = this.fallen.length - 1; i >= 0; i--) {
      const fa = this.fallen[i];
      if (time < fa.returnAt) {
        (fa.f.body as Phaser.Physics.Arcade.Body)?.setVelocity(0, 0);
        continue;
      }
      this.fallen.splice(i, 1);
      fa.f.forceInvisible = false;
      if (!fa.f.active) continue;
      fa.f.setPosition(W / 2, H / 2);
      this.pfx.boom(W / 2, H / 2, 60, { color: MAGIC.stone, sigils: 8, rings: 2, duration: 440 });
      this.api.showFloatingText(W / 2, H / 2 - 34, '🪨 back up', '#cc9944');
    }

    // ── Wind+ hurricane eye ──
    // Pulled fresh every frame from the tornadoes actually on the field, so a funnel expiring
    // takes the buff with it without anything having to remember to clear it.
    this.hurricaneEye = null;
    for (const t of this.tornadoes) {
      if (t.owner !== 'player') continue;
      if (Phaser.Math.Distance.Between(t.x, t.y, this.api.player.x, this.api.player.y) > 58) continue;
      this.hurricaneEye = t;
      break;
    }
    if (this.hurricaneEye) {
      // Cooldowns run down faster; the 30% damage bonus is applied by update()'s single
      // incoming-mult writer, alongside the Ward circle's cut.
      this.api.player.reduceCooldowns(delta * 0.7);
    }
  }


  /**
   * Ruin's Spikes of Ruin (see `combat/SummonPurge.ts`).
   * Temple and monument sets, and the tornadoes. Both are conjured objects with no health
   * of their own, and both are painted from their arrays, so splicing is the whole cleanup.
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
    for (let i = this.templeSets.length - 1; i >= 0; i--) {
      const ts = this.templeSets[i];
      if (ts.owner === exceptOwner || !near(ts.anchorX, ts.anchorY)) continue;
      this.templeSets.splice(i, 1);
      razed++;
    }
    for (let i = this.tornadoes.length - 1; i >= 0; i--) {
      const t = this.tornadoes[i];
      if (t.owner === exceptOwner || !near(t.x, t.y)) continue;
      this.tornadoes.splice(i, 1);
      razed++;
    }
    for (let i = this.summons.length - 1; i >= 0; i--) {
      const s = this.summons[i];
      if (s.owner === exceptOwner || !near(s.x, s.y)) continue;
      this.summons.splice(i, 1);
      razed++;
    }
    // Ward circles are conjured stone with no health of their own — razing one is splicing it.
    for (let i = this.wardZones.length - 1; i >= 0; i--) {
      const w = this.wardZones[i];
      if (w.owner === exceptOwner || !near(w.x, w.y)) continue;
      this.wardZones.splice(i, 1);
      razed++;
    }
    return razed;
  }
}
