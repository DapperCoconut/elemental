import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { CastContext } from '../Ability';
import { Projectile } from '../../combat/Projectile';
import { HealthBar } from '../../combat/HealthBar';
import {
  CULTURE_TONES, GROWTH, GrowthAvatar, GrowthColorFn, GrowthCulture, GrowthFx, GrowthTones,
  NPC_TONES, SICK_TONES, growthPod, tonesFor,
} from './GrowthVisuals';
import {
  GROWTH_EVOLVE_NODES,
  GROWTH_EVOLVE_PATHS,
  GROWTH_EVOLVE_MAX_LEVEL,
  GROWTH_EVOLVE_ULTIMATE_PREREQ,
  GROWTH_EVOLVE_ULTIMATE_IDS,
  GROWTH_CLONE_MATURITY_ID,
  GROWTH_CLONE_MATURITY_NAME,
  GROWTH_CLONE_MATURITY_DESC,
  GROWTH_CLONE_MATURITY_COST,
  GROWTH_CLONE_MATURITY_MAX_LEVEL,
  GROWTH_CLONE_MATURITY_HP_PER_TIER,
  GROWTH_SECRET_UPGRADES,
  GROWTH_SECRET_COST,
  GROWTH_SECRET_ROLL_COUNT,
  GROWTH_PAL_NODES,
  GROWTH_PAL_PATHS,
  GROWTH_PAL_ULTIMATE_PREREQ,
  GROWTH_PAL_ULTIMATE_IDS,
  GrowthNodeDef,
  GrowthEvolveNodeDef,
  growthEvolveNodeCost,
  growthEvolveUltimateCost,
  growthEvolveSellRefundFraction,
} from '../../data/GrowthEvolve';
import { meterGain } from '../../combat/Meters';
import { FONT_DISPLAY, FONT_UI } from '../../ui/Theme';
import { BaseAvatar, easeOut } from './ElementVisuals';
import { makeSkinAvatar } from './skins/SkinAvatars';
import { MonkeyAvatar } from './skins/MonkeyAvatar';
import {
  MONKEY_NODES, MONKEY_PATH_LABEL, MONKEY_PATH_ORDER, MonkeyAnims, MonkeyExtraView, MonkeyPathView,
  bloonColor, bloonLayer, buildDart, buildSpikePile, buildTacks, drawBloon, drawBloontoniumGauge,
  drawTack, drawTackShooter, renderUpgradePanel, TACK_NODES, TACK_PATH_ORDER,
} from './skins/MonkeyFx';

// ── HUD drawing helpers (DNA helix chart) ───────────────────────────────

function lerpColor(a: number, b: number, t: number): number {
  const k = Math.max(0, Math.min(1, t));
  const r = ((a >> 16) & 0xff) + ((((b >> 16) & 0xff) - ((a >> 16) & 0xff)) * k);
  const gg = ((a >> 8) & 0xff) + ((((b >> 8) & 0xff) - ((a >> 8) & 0xff)) * k);
  const bl = (a & 0xff) + (((b & 0xff) - (a & 0xff)) * k);
  return (Math.round(r) << 16) | (Math.round(gg) << 8) | Math.round(bl);
}

/** A short vertical helix — the Evolve chart's connector from one node down to the next. */
function drawDnaHelixV(
  g: Phaser.GameObjects.Graphics, cx: number, y0: number, y1: number, amp: number, color: number, lit: boolean,
): void {
  const len = y1 - y0;
  if (len <= 2) return;
  const k = (Math.PI * 2) / Math.max(10, len / 1.25);
  for (let y = y0 + 3; y < y1; y += 4) {
    const sn = Math.sin((y - y0) * k);
    g.lineStyle(1, lit ? 0xffd060 : color, lit ? 0.8 : 0.25);
    g.lineBetween(cx - sn * amp, y, cx + sn * amp, y);
  }
  for (let y = y0; y < y1; y += 2) {
    const y2 = Math.min(y1, y + 2);
    const s1 = Math.sin((y - y0) * k), s2 = Math.sin((y2 - y0) * k);
    g.lineStyle(2, color, lit ? 0.95 : 0.4);
    g.lineBetween(cx + s1 * amp, y, cx + s2 * amp, y2);
    g.lineStyle(2, lit ? 0x8dffc9 : color, lit ? 0.85 : 0.3);
    g.lineBetween(cx - s1 * amp, y, cx - s2 * amp, y2);
  }
}

/** Base-pair colours, A–T and G–C, as each lit rung's two halves. */
const DNA_PAIRS: Array<[number, number]> = [[0x44ddaa, 0xffd060], [0xff6f8f, 0x66b8ff]];

/**
 * A horizontal DNA double helix from `x0` to `x0 + len`, centred on `cy`. Rungs left of
 * `frac` light up in base-pair colours, the rest stay a dim husk; the helix scrolls slowly
 * so the chart always feels alive. Strands fade where they twist behind each other.
 */
function drawDnaHelix(
  g: Phaser.GameObjects.Graphics, x0: number, cy: number, len: number, amp: number,
  frac: number, time: number, rungGap: number, lineW: number,
): void {
  const period = rungGap * 5;
  const k = (Math.PI * 2) / period;
  const ph = time / 520;
  const fillX = x0 + len * Math.max(0, Math.min(1, frac));
  // Rungs (base pairs) first, so the strands lace over them.
  let idx = 0;
  for (let x = x0 + rungGap / 2; x < x0 + len; x += rungGap, idx++) {
    const s = Math.sin((x - x0) * k + ph);
    const ya = cy + s * amp, yb = cy - s * amp;
    const lit = x <= fillX;
    const depth = 0.45 + 0.55 * Math.abs(Math.cos((x - x0) * k + ph));
    if (lit) {
      const [ca, cb] = DNA_PAIRS[idx % 2];
      g.lineStyle(Math.max(1, lineW - 0.5), ca, 0.95 * depth);
      g.lineBetween(x, ya, x, cy);
      g.lineStyle(Math.max(1, lineW - 0.5), cb, 0.95 * depth);
      g.lineBetween(x, cy, x, yb);
    } else {
      g.lineStyle(1, 0x1f4630, 0.75 * depth);
      g.lineBetween(x, ya, x, yb);
    }
  }
  // The two backbones, segment by segment so each can carry its own depth fade.
  const step = 2.5;
  for (let x = x0; x < x0 + len; x += step) {
    const x2 = Math.min(x0 + len, x + step);
    const s1 = Math.sin((x - x0) * k + ph), s2 = Math.sin((x2 - x0) * k + ph);
    const c = Math.cos((x - x0) * k + ph);
    const lit = x <= fillX;
    // Strand A is in front where cos > 0, strand B where cos < 0.
    const aA = lit ? (c > 0 ? 1 : 0.5) : (c > 0 ? 0.55 : 0.3);
    const aB = lit ? (c < 0 ? 1 : 0.5) : (c < 0 ? 0.55 : 0.3);
    g.lineStyle(lineW, lit ? 0x8dffc9 : 0x2a5a3c, aA);
    g.lineBetween(x, cy + s1 * amp, x2, cy + s2 * amp);
    g.lineStyle(lineW, lit ? 0x56d2ff : 0x24485a, aB);
    g.lineBetween(x, cy - s1 * amp, x2, cy - s2 * amp);
  }
  // Growth tip: a bright replication fork where the lit strand meets the dim one.
  if (frac > 0 && frac < 1) {
    const pulse = 0.6 + 0.4 * Math.sin(time / 110);
    g.fillStyle(0xeaffd0, 0.35 * pulse);
    g.fillCircle(fillX, cy, amp + 2);
    g.fillStyle(0xffffff, 0.85 * pulse);
    g.fillCircle(fillX, cy, 1.6);
  }
}

type Owner = 'player' | 'npc';
type EvolveTab = 'body' | 'pal';
type SideTab = 'pal';
type CloneVariant = 'yellow' | 'blue' | 'red';

// ── Constants ────────────────────────────────────────────────────────────

const DNA_CAP = 10;
/** How long a freshly precipitated strand takes to fly home and bank. */
const DNA_FLIGHT_MS = 320;
const DNA_THRESHOLD = 25;

const BACT_DAMAGE = 12;
const BACT_SPEED = 460;
const BACT_HIT_RADIUS = 20;
const BACT_TIMEOUT = 2000;
const BACT_LOCATOR_RADIUS = 70;
const BACT_LOCATOR_TURN_RATE = 6; // steering strength per second (Click+ homing)

/** Swarm (offensive ultimate): radians between the three bacteria of a click. */
const SWARM_SPREAD = 0.16;

const VIRUS_DAMAGE = 10;
const VIRUS_SPEED = 430;
const VIRUS_HIT_RADIUS = 20;
const VIRUS_TIMEOUT = 2000;
const INFECT_DURATION = 8000;
const INFECT_EXPEL_INTERVAL = 2000;
const INFECT_EXPEL_COUNT = 3;
const FLOOR_VIRUS_DAMAGE = 6;
const FLOOR_VIRUS_LIFESPAN = 12000;
const FLOOR_VIRUS_HIT_RADIUS = 16;
const HEAL_VIRUS_CHANCE = 0.5;
const HEAL_VIRUS_AMOUNT = 30;
const HEAL_VIRUS_PICKUP_RADIUS = 26;

// Virus perk: the outbreak runs longer, coughs harder, and reseeds itself off the floor.
const PERK_VIRUS_INFECT_DURATION = 12000;
const PERK_VIRUS_EXPEL_INTERVAL = 1400;
const PERK_VIRUS_EXPEL_COUNT = 5;
const PERK_VIRUS_RESEED_MS = 3000;

const SPORE_COUNT = 5;
const SPORE_BASE_HP = 50;
const SPORE_GROW_RATE = 10;      // max HP + HP per second while growing
const SPORE_GROW_MS = 5000;
const SPORE_LIFESPAN = 10000;
const SPORE_SPAWN_STAGGER = 130; // sprayed one after another
const SPORE_BLOCK_PAD = 20;      // extra body-block radius beyond the drawn circle
const SPORE_MAX_COUNT = 24;      // Spore Cloud runaway cap
const SPIKED_SPORE_THRESHOLD = 20;

const AUX_COST = 8;
const NEST_MAX_HP = 100;
const NEST_HEAL_PER_SEC = 5;
const CLONE_BASE_MAX_HP = 200;
const CLONE_SPEED = 140;
const CLONE_HIT_RADIUS = 18;
const CLONE_ENGAGE_RANGE = 400;
const CLONE_RETREAT_RANGE = 130;
const CLONE_STRAFE_SPEED_MULT = 0.55;
const CLONE_CLICK_COOLDOWN = 900;
const CLONE_VIRUS_COOLDOWN = 8000;
const CLONE_SPORE_COOLDOWN = 15000;
const CLONE_SPORE_CAST_RANGE = 450;
const PUDDLE_NEST_RADIUS = 46;

const CHITIN_SHIELD_HP = 75;
const CHITIN_REGEN_MS = 15000;
const CHITIN_TINT = 0x8a5a2b;

const SWEAT_MAX_CHARGES = 3;

const CONTACT_RADIUS_PAD = 24;
const CONTACT_TICK_MS = 1000;

const BASE_COOLDOWNS: Record<string, number> = {
  'growth-click': 750,
  'growth-virus': 8000,
  'spore-spray': 15000,
  'auxiliary-growth': 1000,
};

const VARIANT_COLORS: Record<CloneVariant, number> = { yellow: 0xffee44, blue: 0x4488ff, red: 0xff4444 };
const VARIANT_SPEED_MULT = 1.25;   // yellow
const VARIANT_DR_MULT = 0.75;      // blue
const VARIANT_DMG_MULT = 1.25;     // red

const PLAYER_COLOR = 0x55cc44;
const NPC_COLOR = 0xcc6644;

// ── Mastery: Secret Upgrades passive + Plague Pal bindable ───────────────
// Brood (secret): red bacteria — slow and heavy, and with Chemotaxis they lock on from far off.
const BROOD_SPEED_MULT = 0.6;
const BROOD_DAMAGE_MULT = 2;
const BROOD_LOCATOR_RADIUS = 220;
const BROOD_COLOR = 0xdd3030;
const RULER_CLONE_CAP = 2;
const VIRAL_BOOST_MS = 3000;
const VIRAL_BOOST_MULT = 1.2;
const MITOSIS_CHANCE = 0.2;
const CRAWL_SPEED = 26;               // px/s a Crawling Spore creeps at
const CRAWL_PUSH = 90;                // px/s spores shove each other apart with
const PANDEMIC_INFECT_MS = 3000;
const R_SPEC_SIZE = 0.75;
const R_SPEC_SPEED = 1.25;
const K_SPEC_SIZE = 1.3;
const K_SPEC_HP = 50;

// ── Mastery: Plague Pal ──────────────────────────────────────────────────
const PAL_BASE_CD = 7000;
const PAL_MIN_CD = 1500;
const PAL_DAMAGE = 18;
const PAL_RADIUS = 13;               // body radius before Shell growth
const PAL_LASH_RADIUS = 85;          // tentacle reach from the Pal's centre
const PAL_DASH_DIST = 150;
const PAL_DASH_SPEED = 620;
const PAL_FOLLOW_SPEED = 300;
const PAL_FOLLOW_GAP = 38;
const PAL_LASH_MS = 380;
const PAL_RAGE_MS = 6000;
const PAL_ZOO_MS = 2000;
const PAL_ZOO_RANGE = 520;
const PAL_BLAST_RADIUS = 70;
const PAL_DIGEST_MS = 3000;
const PAL_HELP_DELAY = 2000;
const PAL_SYM_DR = 0.75;
const PAL_SYM_DASH_SPEED = 900;
const PAL_SYM_DASH_MS = 260;
const PAL_SYM_RADIUS = 26;
const PAL_TENTACLES = 7;
/** The Pal's own shades: a bruised violet capsid with lime granules. */
const PAL_TONES: GrowthTones = {
  shell: 0x2a1438, body: 0x6a3a8a, cyto: 0x9a5fc4, lit: 0xc9a0ff, spark: 0xd8ffb0,
};
const PAL_RAGE_BODY = 0xb8325e;

// ── Types ────────────────────────────────────────────────────────────────

/**
 * One evolvable body. The player Fighter always hosts exactly one body; a live
 * clone entity hosts the other. Body-swapping (SPACE) exchanges the BodyState
 * (plus vitals/position) between the two hosts, so upgrades stay with the flesh
 * they were bought for and never overlap between the two.
 */
interface BodyState {
  isCloneBody: boolean;
  levels: Record<string, number>;
  variant: CloneVariant | null;
  chitinUp: boolean;
  chitinDownAt: number;
  digestAccum: number;
  sweatR: number;
  sweatF: number;
  sweatRStart: number;
  sweatFStart: number;
}

interface Bacterium {
  container: Phaser.GameObjects.Container;
  tail: Phaser.GameObjects.Arc[];
  owner: Owner;
  srcBody: BodyState;
  x: number; y: number; vx: number; vy: number;
  dmg: number;
  spawnedAt: number;
  wigglePhase: number;
  /** Brood (secret): a slow, heavy red bacterium. */
  red: boolean;
}

/** Body-tree nodes, longest name first — for swapping names inside a sentence. */
const NODES_LONGEST_FIRST = [...GROWTH_EVOLVE_NODES].sort((x, y) => y.name.length - x.name.length);

/** A virus's body: the stock capsid triangle, or the Monkey skin's drawn tacks / spike pile. */
type VirusBody = Phaser.GameObjects.Triangle | Phaser.GameObjects.Graphics;

interface VirusProj {
  tri: VirusBody;
  owner: Owner;
  srcBody: BodyState;
  x: number; y: number; vx: number; vy: number;
  spawnedAt: number;
}

interface Infection {
  target: Fighter;
  owner: Owner;
  srcBody: BodyState;
  until: number;
  nextExpelAt: number;
  icon: Phaser.GameObjects.Triangle;
}

interface FloorVirus {
  tri: VirusBody;
  owner: Owner;
  x: number; y: number;
  dmg: number;
  expiresAt: number;
  /** R+ green virus: heals the growth caster instead of damaging enemies. */
  healing: boolean;
}

/**
 * Emesis (divine perk): a cloud of thrown-up bile hanging where it landed. Owned by whoever
 * brought it up, and it only ever burns the *other* side — including when the other side is
 * the one heaving, which is how this spreads.
 */
interface VomitCloud {
  /** Redrawn every frame — it churns and sags, so it can't be a sprite with a tween on it. */
  gfx: Phaser.GameObjects.Graphics;
  x: number; y: number;
  vx: number; vy: number;
  owner: Owner;
  expiresAt: number;
  tickAccum: number;
  /** Fixes this cloud's lobe pattern so its edge boils in place. */
  seed: number;
}

/** How often a carrier's own stomach turns on it. */
const EMESIS_INTERVAL_MS = 7000;
const EMESIS_CLOUD_COUNT = 5;
const EMESIS_CLOUD_LIFE_MS = 3000;
/** Launched hard but braked hard — the clouds are meant to land just in front of you. */
const EMESIS_CLOUD_SPEED = 190;
const EMESIS_CLOUD_DRAG = 0.88;
const EMESIS_CONE_HALF = Math.PI / 5;
const EMESIS_CLOUD_RADIUS = 24;
const EMESIS_TICK_MS = 500;
const EMESIS_TICK_DAMAGE = 4;
/** Anything caught in a cloud brings up this many of its own, spread over the window. */
const EMESIS_SPREAD_COUNT = 2;
const EMESIS_SPREAD_WINDOW_MS = 10000;
/** Runaway cap: a chain of spreads can otherwise fill the arena. */
const EMESIS_MAX_CLOUDS = 40;

interface SporeWall {
  /** Redrawn every frame — the membrane pulses, hardens with maturity and recedes as it takes damage. */
  gfx: Phaser.GameObjects.Graphics;
  owner: Owner;
  spikedTier: number;
  gutTier: number;
  x: number; y: number;
  hp: number;
  maxHp: number;
  spawnedAt: number;
  matured: boolean;
  /** Flung out by a Spore Blast — never blasts again, so one dash can't chain the whole field. */
  noBlast: boolean;
  /** Monkey skin: the bloon layer it showed last frame, so dropping one pops it off. */
  bloonLayer?: number;
}

interface PendingSpore {
  x: number; y: number;
  owner: Owner;
  spikedTier: number;
  gutTier: number;
  spawnAt: number;
  noBlast?: boolean;
}


interface Nest {
  /** Redrawn every frame — the sac beats and its yolk brightens as the clone gestates. */
  gfx: Phaser.GameObjects.Graphics;
  spawnAt: number;
  x: number; y: number;
  hp: number;
  owner: Owner;
  inheritLevels: Record<string, number> | null;
}

interface SoupPuddle {
  container: Phaser.GameObjects.Container;
  x: number; y: number;
  owner: Owner;
  levels: Record<string, number>;
}

interface Clone {
  sprite: Phaser.GameObjects.Sprite;
  healthBar: HealthBar;
  hp: number;
  maxHp: number;
  shieldHp: number;
  owner: Owner;
  body: BodyState;
  lastClickAt: number;
  lastVirusAt: number;
  lastSporeAt: number;
  strafeDir: number;
  nextStrafeDirChangeAt: number;
  contactNext: Map<Fighter, number>;
  chitinRing: Phaser.GameObjects.Arc | null;
}

/** One Plague Pal — the player may field two (Mitosis); a remote growth player gets one. */
interface Pal {
  owner: Owner;
  index: number;
  gfx: Phaser.GameObjects.Graphics;
  x: number; y: number;
  mode: 'follow' | 'dash' | 'lash' | 'symDash';
  modeAt: number;
  fromX: number; fromY: number; toX: number; toY: number;
  dashMs: number;
  lastZooAt: number;
  /** Mouth: projectiles being eaten, and the heal each pays when it is done. */
  digest: { heal: number; doneAt: number; ang: number }[];
  /** Fixes this Pal's wobble so two Pals never move in lockstep. */
  seed: number;
}

// ── Arena API ────────────────────────────────────────────────────────────

export interface GrowthArenaApi {
  readonly player: Fighter;
  readonly npc: Fighter;
  readonly scene: Phaser.Scene;
  readonly enemies: Fighter[];
  readonly projectiles: Phaser.Physics.Arcade.Group;
  readonly elementId: string;
  readonly npcElementId: string;
  readonly width: number;
  readonly hpBarY: number;
  readonly hpBarW: number;
  readonly hpBarH: number;
  readonly eKey: Phaser.Input.Keyboard.Key;
  readonly rKey: Phaser.Input.Keyboard.Key;
  readonly fKey: Phaser.Input.Keyboard.Key;
  readonly qKey: Phaser.Input.Keyboard.Key;
  readonly spaceKey: Phaser.Input.Keyboard.Key;
  readonly pointerWasDown: boolean;
  readonly nukeChanneling: boolean;
  readonly abilityBars: ReadonlyArray<{ fill: Phaser.GameObjects.Rectangle; abilityId: string; maxWidth: number }>;
  hasUpgrade(slot: string): boolean;
  hasPerk(owner: 'player' | 'npc', perkId: string): boolean;
  /** Skins: maps a growth visual color through the owner's skin. */
  growthColor(owner: 'player' | 'npc', base: number): number;
  /** Skins: the equipped skin id for that side, so a skin can swap in its own rig and art. */
  skinId(owner: 'player' | 'npc'): string | null;
  getNearestEnemy(x: number, y: number): Fighter;
  spawnHitFlash(x: number, y: number, color: number): void;
  spawnDamageNumber(x: number, y: number, amount: number): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  buildPlayerContext(x: number, y: number): CastContext;
  buildNpcContext(x: number, y: number): CastContext;
  recordMasteryStat(key: string, amount: number): void;
  recordMasteryBest(key: string, value: number): void;
  getMasteryStat(key: string): number;
  /** True only when the player is growth AND Growth Mastery is switched on. */
  get masteryActive(): boolean;
  /** True only when the online opponent is growth AND has Growth Mastery on. */
  get npcMasteryActive(): boolean;
  masteryBindFor(slot: string): string | null;
}

// ── GrowthKit ────────────────────────────────────────────────────────────
// Growth Mastery: Secret Upgrades (passive — two single-tier rolls added to the
// Evolve menu each match) + Plague Pal (bindable — a virus pet with its own
// Evolve tree).

export class GrowthKit {
  // ── Visuals ───────────────────────────────────────────────────────────
  /** Colour mappers + effect painters, one per owner so a skin recolours one side. */
  private readonly pcol: GrowthColorFn;
  private readonly ncol: GrowthColorFn;
  private readonly pfx: GrowthFx;
  private readonly nfx: GrowthFx;
  /** The growth character rig (cell arms, eyes, budding crown) for each growth fighter. */
  private playerAvatar: BaseAvatar | null = null;
  private npcAvatar: BaseAvatar | null = null;
  /** Monkey skin: pops for the bloons. */
  private readonly monkeyAnims: MonkeyAnims;
  /** Last aim point, cached in handleInput so the per-frame avatar update can face it. */
  private aimX = 0;
  private aimY = 0;
  /** Growth Mastery — Secret Upgrades: an always-on culture mat while mastery is enabled. */
  private masteryCulture: GrowthCulture | null = null;

  private bacteria: Bacterium[] = [];
  private viruses: VirusProj[] = [];
  private infections: Infection[] = [];
  private floorViruses: FloorVirus[] = [];
  private spores: SporeWall[] = [];
  private pendingSpores: PendingSpore[] = [];
  /** Strands in flight to their owner's bank; destroyed on reset so a restart never pays stale DNA. */
  private dnaStrands: { gfx: Phaser.GameObjects.Text; tween: Phaser.Tweens.Tween }[] = [];
  private nests: Nest[] = [];
  private clones: Clone[] = [];
  private puddles: SoupPuddle[] = [];

  // ── Emesis (divine perk) ────────────────────────────────────────────────
  private vomitClouds: VomitCloud[] = [];
  /** Next time each side's own stomach turns, per owner. */
  private emesisNextAt: Record<Owner, number> = { player: 0, npc: 0 };
  /** Fighters that have been made sick and owe some heaving, and when the next one is due. */
  private forcedVomits = new Map<Fighter, { left: number; nextAt: number }>();

  private playerDna = 0;
  private npcDna = 0;
  private playerDmgAccum: Map<Fighter, number> = new Map();
  private npcDmgAccum: Map<Fighter, number> = new Map();
  private sporeSpikeAccum: Record<Owner, number> = { player: 0, npc: 0 };

  /** The body the player Fighter currently embodies. A live clone hosts the other one. */
  private fighterBody: BodyState = this.freshBody(false);
  /** NPC fighters and their clones use un-upgraded bodies. */
  private npcBody: BodyState = this.freshBody(false);
  private appliedFighterInMult = 1;
  private appliedFighterSpeedMult = 1;

  // Evolve tree UI (player-only)
  private evolveOpen = false;
  private evolveGfx: Phaser.GameObjects.Graphics | null = null;
  private evolveLabels: Phaser.GameObjects.Text[] = [];
  private evolveAreas: Array<{ id: string; x: number; y: number; w: number; h: number }> = [];
  private evolveRightWasDown = false;
  /** Which tree the Evolve menu is showing. The Pal tab only exists with Plague Pal bound. */
  private evolveTab: EvolveTab = 'body';

  // ── Mastery state ───────────────────────────────────────────────────
  /** The Secret Upgrades rolled for this match (ids into GROWTH_SECRET_UPGRADES). */
  private secretRoll: string[] = [];
  private secretOwned: Set<string> = new Set();
  private viralBoostUntil = 0;
  private cloneCycle = 0;

  // ── Plague Pal (mastery bindable) ─────────────────────────────────────
  /** Pal tree levels. Player-only, shared across bodies — the pet follows you, not your flesh. */
  private palLevels: Record<string, number> = {};
  private pals: Pal[] = [];
  /** Banked casts, fractional while recharging. Big Brain 3 lets it bank 2. */
  private palCharge = 1;
  private palRageUntil = 0;
  /** Helping Hand: hp last frame (a drop means you were hurt) and when that last happened. */
  private palLastHp = 0;
  private palLastHurtAt = 0;
  private palHealAccum = 0;

  private npcDnaBarGfx: Phaser.GameObjects.Graphics | null = null;
  /** The DNA double-helix gauge pinned under the HP bar — one Graphics, redrawn per frame. */
  private dnaHudBarGfx: Phaser.GameObjects.Graphics | null = null;
  private dnaHudBarText: Phaser.GameObjects.Text | null = null;
  private chargePips: Phaser.GameObjects.Arc[] = [];

  private fighterContactNext: Map<Fighter, number> = new Map();

  constructor(private arena: GrowthArenaApi) {
    this.monkeyAnims = new MonkeyAnims(arena.scene);
    this.pcol = (base) => arena.growthColor('player', base);
    this.ncol = (base) => arena.growthColor('npc', base);
    this.pfx = new GrowthFx(arena.scene, this.pcol);
    this.nfx = new GrowthFx(arena.scene, this.ncol);
    // The kit is built lazily on the first growth match and only reset()s from the
    // second one on, so the opening roll has to happen here too.
    this.rollSecretUpgrades();
  }

  /** Colour mapper for a side. */
  private col(owner: Owner): GrowthColorFn { return owner === 'player' ? this.pcol : this.ncol; }
  /** Effect painter for a side. */
  private fx(owner: Owner): GrowthFx { return owner === 'player' ? this.pfx : this.nfx; }
  /** The rig that should react to a cast by this side, if that side is playing growth. */
  private avatarOf(owner: Owner): BaseAvatar | null {
    return owner === 'player' ? this.playerAvatar : this.npcAvatar;
  }

  private freshBody(isCloneBody: boolean, levels?: Record<string, number>): BodyState {
    return {
      isCloneBody,
      levels: { ...(levels ?? {}) },
      variant: null,
      chitinUp: (levels?.['chitin-shell'] ?? 0) > 0,
      chitinDownAt: 0,
      digestAccum: 0,
      sweatR: 1,
      sweatF: 1,
      sweatRStart: 0,
      sweatFStart: 0,
    };
  }

  // ── Reset ─────────────────────────────────────────────────────────────

  reset(): void {
    // Visuals — every GameObject dies with the old scene run, so rebuild lazily in update().
    if (this.playerAvatar) { this.playerAvatar.destroy(); this.playerAvatar = null; }
    if (this.npcAvatar) { this.npcAvatar.destroy(); this.npcAvatar = null; }
    if (this.masteryCulture) { this.masteryCulture.destroy(); this.masteryCulture = null; }
    this.aimX = 0;
    this.aimY = 0;

    for (const b of this.bacteria) b.container.destroy();
    this.bacteria = [];
    for (const v of this.viruses) v.tri.destroy();
    this.viruses = [];
    for (const inf of this.infections) inf.icon.destroy();
    this.infections = [];
    for (const fv of this.floorViruses) fv.tri.destroy();
    this.floorViruses = [];
    for (const s of this.spores) s.gfx.destroy();
    this.spores = [];
    this.pendingSpores = [];
    for (const s of this.dnaStrands) { s.tween.remove(); s.gfx.destroy(); }
    this.dnaStrands = [];
    for (const n of this.nests) n.gfx.destroy();
    this.nests = [];
    for (const c of this.clones) this.destroyCloneVisuals(c);
    this.clones = [];
    for (const p of this.puddles) p.container.destroy();
    this.puddles = [];
    for (const c of this.vomitClouds) c.gfx.destroy();
    this.vomitClouds = [];
    this.emesisNextAt = { player: 0, npc: 0 };
    this.forcedVomits = new Map<Fighter, { left: number; nextAt: number }>();
    this.viralBoostUntil = 0;
    this.cloneCycle = 0;
    for (const p of this.pals) p.gfx.destroy();
    this.pals = [];
    this.palLevels = {};
    this.palCharge = 1;
    this.palRageUntil = 0;
    this.palLastHp = 0;
    this.palLastHurtAt = 0;
    this.palHealAccum = 0;
    this.secretOwned = new Set();
    this.evolveTab = 'body';
    this.rollSecretUpgrades();

    this.playerDna = 0;
    this.npcDna = 0;
    this.playerDmgAccum = new Map();
    this.npcDmgAccum = new Map();
    this.sporeSpikeAccum = { player: 0, npc: 0 };
    this.fighterContactNext = new Map();

    // Fighters are recreated each match, so applied multipliers start clean.
    this.fighterBody = this.freshBody(false);
    this.npcBody = this.freshBody(false);
    this.appliedFighterInMult = 1;
    this.appliedFighterSpeedMult = 1;

    this.closeEvolve();
    this.evolveRightWasDown = false;

    if (this.npcDnaBarGfx) { this.npcDnaBarGfx.destroy(); this.npcDnaBarGfx = null; }
    if (this.dnaHudBarGfx) { this.dnaHudBarGfx.destroy(); this.dnaHudBarGfx = null; }
    if (this.dnaHudBarText) { this.dnaHudBarText.destroy(); this.dnaHudBarText = null; }
    for (const p of this.chargePips) p.destroy();
    this.chargePips = [];
  }

  private destroyCloneVisuals(c: Clone): void {
    c.sprite.destroy();
    c.healthBar.destroy();
    if (c.chitinRing) c.chitinRing.destroy();
  }

  // ── Small helpers ─────────────────────────────────────────────────────

  private lvl(body: BodyState, id: string): number { return body.levels[id] ?? 0; }

  /** That side is wearing the Monkey skin. Drawing and wording only — the sim never reads it. */
  private monkey(owner: Owner): boolean { return this.arena.skinId(owner) === 'monkey'; }

  /** The rig for a side: the equipped skin's, else growth's own. */
  private makeAvatar(owner: Owner): BaseAvatar {
    return makeSkinAvatar(this.arena.skinId(owner), this.arena.scene)
      ?? new GrowthAvatar(this.arena.scene, this.col(owner), owner === 'player' ? CULTURE_TONES : NPC_TONES);
  }

  /** Highest row bought on one body-tree path, 0–5 — the tier the Monkey rig dresses for. */
  private pathTier(body: BodyState, path: string): number {
    let tier = 0;
    for (const n of GROWTH_EVOLVE_NODES) if (n.path === path && this.lvl(body, n.id) > 0) tier = Math.max(tier, n.row);
    return tier;
  }

  private dressMonkey(av: BaseAvatar | null, body: BodyState): void {
    if (av instanceof MonkeyAvatar) {
      av.setPaths(this.pathTier(body, 'offense'), this.pathTier(body, 'efficiency'), this.pathTier(body, 'defense'));
    }
  }

  private floatText(_x: number, _y: number, _text: string, _color: string): void {
    // Battle text pop-ups are disabled — they cluttered every attack.
  }

  private bodyFor(owner: Owner): BodyState { return owner === 'player' ? this.fighterBody : this.npcBody; }

  private fighterOf(owner: Owner): Fighter { return owner === 'player' ? this.arena.player : this.arena.npc; }

  private targetsOf(owner: Owner): Fighter[] {
    return owner === 'player' ? this.arena.enemies : [this.arena.player];
  }

  private nearestOf(x: number, y: number, targets: Fighter[]): Fighter | null {
    let best: Fighter | null = null, bestD = Infinity;
    for (const t of targets) {
      if (!t.active || t.hp <= 0) continue;
      const d = Phaser.Math.Distance.Between(x, y, t.x, t.y);
      if (d < bestD) { bestD = d; best = t; }
    }
    return best;
  }

  /** Combined cooldown factor from a body's Efficiency nodes for one ability. */
  private cdFactor(abilityId: string, body: BodyState): number {
    let f = 1 - 0.1 * this.lvl(body, 'system-efficiency');
    if (abilityId === 'growth-click') f *= 1 - 0.15 * this.lvl(body, 'enhanced-flagellum');
    return Math.max(0.3, f);
  }

  /** After a successful castAbility, shave the cooldown down to the body's effective one. */
  private shaveCooldown(abilityId: string): void {
    const factor = this.cdFactor(abilityId, this.fighterBody) * this.assistCdMult();
    if (factor >= 1) return;
    const base = BASE_COOLDOWNS[abilityId];
    if (!base) return;
    this.arena.player.reduceCooldown(abilityId, base * this.arena.player.cooldownMult * (1 - factor));
  }

  private bacteriumDamage(body: BodyState, owner: Owner): number {
    const base = BACT_DAMAGE + 3 * this.lvl(body, 'teeth') + 4 * this.lvl(body, 'more-teeth');
    return Math.round(base * (body.variant === 'red' ? VARIANT_DMG_MULT : 1) * this.dmgBoost(owner));
  }

  private dnaThreshold(owner: Owner): number {
    if (owner === 'npc') return DNA_THRESHOLD;
    return DNA_THRESHOLD * (1 - 0.05 * this.lvl(this.fighterBody, 'enhanced-brain'));
  }

  // ── Mastery: Secret Upgrades ─────────────────────────────────────────

  /** Two of the pool are unlocked every time you load in — they are offers, not grants. */
  private rollSecretUpgrades(): void {
    const pool = GROWTH_SECRET_UPGRADES.map((s) => s.id);
    this.secretRoll = [];
    for (let i = 0; i < GROWTH_SECRET_ROLL_COUNT && pool.length > 0; i++) {
      this.secretRoll.push(...pool.splice(Math.floor(Math.random() * pool.length), 1));
    }
  }

  /** True once the player has actually paid the 8 DNA for a rolled Secret Upgrade. */
  private hasSecret(id: string): boolean {
    return this.arena.masteryActive && this.secretOwned.has(id);
  }

  /** Damage multiplier on everything this kit throws (Viral Consumption). */
  private dmgBoost(owner: Owner): number {
    if (owner !== 'player') return 1;
    return this.arena.scene.time.now < this.viralBoostUntil ? VIRAL_BOOST_MULT : 1;
  }

  /** Viral Consumption's +20% move speed, read by ArenaScene's speed chokepoint. */
  getPlayerSpeedMult(): number {
    let m = this.arena.scene.time.now < this.viralBoostUntil ? VIRAL_BOOST_MULT : 1;
    // Plague Pal — Assistance: the pet hurries you along.
    if (this.palOn()) m *= 1 + 0.05 * this.palTier('assistance');
    return m;
  }

  /** How many bodies this owner may field at once — Ruler lifts the player's cap to 2. */
  private cloneCap(owner: Owner): number {
    return owner === 'player' && this.hasSecret('ruler') ? RULER_CLONE_CAP : 1;
  }

  /** Nests already in the ground count against the cap, so you can't queue up extras. */
  private cloneSlotsFull(owner: Owner): boolean {
    const used = this.clones.filter((c) => c.owner === owner).length
      + this.nests.filter((n) => n.owner === owner).length;
    return used >= this.cloneCap(owner);
  }

  private buySecretUpgrade(id: string): void {
    const { player } = this.arena;
    const def = GROWTH_SECRET_UPGRADES.find((s) => s.id === id);
    if (!def || this.secretOwned.has(id)) return;
    if (this.playerDna < GROWTH_SECRET_COST) {
      this.floatText(player.x, player.y - 30, 'Not enough DNA', '#ff6666');
      return;
    }
    this.playerDna -= GROWTH_SECRET_COST;
    this.secretOwned.add(id);
    this.arena.recordMasteryStat('upgrades', 1);

    // The two body-shape secrets take effect the instant they are bought.
    if (id === 'r-specialized') {
      player.sizeMult *= R_SPEC_SIZE;
      player.applySizeMult();
      player.speed *= R_SPEC_SPEED;
    } else if (id === 'k-specialized') {
      player.sizeMult *= K_SPEC_SIZE;
      player.applySizeMult();
      player.increaseMaxHp(K_SPEC_HP);
      player.heal(K_SPEC_HP);
    }
    this.floatText(player.x, player.y - 30, `🧫 ${def.name}!`, '#ffdd66');
  }

  // ── Mastery: Plague Pal ──────────────────────────────────────────────
  // A virus pet that tags along behind you. The bound key sends it dashing ahead, where it
  // throws every tentacle out at once. Its own Evolve tab upgrades it; those levels are the
  // player's only (a remote growth player's Pal is the base one, like their other trees).

  private palSlot(): 'r' | 'f' | 'q' | null {
    for (const s of ['r', 'f', 'q'] as const) {
      if (this.arena.masteryBindFor(s) === 'plague-pal') return s;
    }
    return null;
  }

  /** Pal-tree tier. Only the local player has a tree. */
  private palTier(id: string, owner: Owner = 'player'): number {
    return owner === 'player' ? (this.palLevels[id] ?? 0) : 0;
  }

  /** The local player is fielding a Pal this match. */
  private palOn(): boolean {
    return this.arena.masteryActive && this.palSlot() !== null;
  }

  private palSymbiosis(): boolean {
    return this.palOn() && this.palTier('symbiosis') > 0;
  }

  /** Assistance: −5% on every one of your cooldowns per tier, while the Pal is with you. */
  private assistCdMult(): number {
    return this.palOn() ? 1 - 0.05 * this.palTier('assistance') : 1;
  }

  private palMaxCharges(): number {
    return this.palTier('big-brain') >= 3 ? 2 : 1;
  }

  private palCooldown(): number {
    const cd = PAL_BASE_CD * (1 - 0.12 * this.palTier('reflexes')) * this.assistCdMult();
    return Math.max(PAL_MIN_CD, cd * this.arena.player.cooldownMult);
  }

  /** HUD bar: full while a charge is banked, otherwise the next one's progress. */
  getPalCooldownRatio(): number {
    return Math.min(1, this.palCharge);
  }

  private palRaged(time: number): boolean {
    return time < this.palRageUntil;
  }

  private palRadius(pal: Pal): number {
    // Shell: buying it again grows the body — the first tier only hardens it.
    return PAL_RADIUS * (1 + 0.2 * Math.max(0, this.palTier('shell', pal.owner) - 1));
  }

  private palLashRadius(owner: Owner): number {
    return PAL_LASH_RADIUS + 15 * this.palTier('big-brain', owner);
  }

  private palDashDist(owner: Owner): number {
    return PAL_DASH_DIST + 40 * this.palTier('big-brain', owner);
  }

  private palDashSpeed(owner: Owner): number {
    return PAL_DASH_SPEED * (1 + 0.25 * this.palTier('big-brain', owner));
  }

  private palDamage(owner: Owner, time: number): number {
    let d = PAL_DAMAGE + 5 * this.palTier('beak', owner) + 7 * this.palTier('hardened-beak', owner);
    if (owner === 'player' && this.palRaged(time)) d *= 1 + 0.15 * this.palTier('viral-rage');
    return Math.round(d * this.dmgBoost(owner));
  }

  private palBlocks(pal: Pal): boolean {
    return pal.owner === 'player' && !this.palSymbiosis()
      && (this.palTier('shell') > 0 || this.palTier('mouth') > 0);
  }

  private tryCastPal(time: number, mouseX: number, mouseY: number): void {
    if (this.palCharge < 1) return;
    const mine = this.pals.filter((p) => p.owner === 'player');
    if (mine.length === 0) return;
    this.palCharge -= 1;
    const p = this.arena.player;
    // triggerCooldown stamps the cast for the HUD and broadcasts it online, where the
    // peer routes the unknown id through ArenaScene.replayNpcMastery → doNpcPlaguePal.
    p.triggerCooldown('plague-pal');

    let ax = mouseX, ay = mouseY;
    // Big Brain: it picks its own target if one is in reach.
    if (this.palTier('big-brain') > 0) {
      const reach = this.palDashDist('player') + this.palLashRadius('player') + 60;
      const t = this.nearestOf(p.x, p.y, this.targetsOf('player'));
      if (t && Phaser.Math.Distance.Between(p.x, p.y, t.x, t.y) <= reach) { ax = t.x; ay = t.y; }
    }

    if (this.palSymbiosis()) {
      // You are the Pal now: you get flung, and the tentacles come out of you.
      const a = Math.atan2(ay - p.y, ax - p.x);
      this.arena.buildPlayerContext(ax, ay).dashCaster(Math.cos(a) * PAL_SYM_DASH_SPEED, Math.sin(a) * PAL_SYM_DASH_SPEED);
      this.playerAvatar?.play('punch', a);
      const pal = mine[0];
      pal.mode = 'symDash';
      pal.modeAt = time;
      return;
    }
    mine.forEach((pal, i) => this.dashPal(pal, ax, ay, mine.length > 1 ? (i === 0 ? -0.3 : 0.3) : 0, time));
  }

  /** Online replay: the remote growth player sent their Pal at (tx, ty). */
  doNpcPlaguePal(tx: number, ty: number): void {
    if (this.arena.npcElementId !== 'growth') return;
    let pal = this.pals.find((p) => p.owner === 'npc');
    if (!pal) {
      pal = this.makePal('npc', 0);
      this.pals.push(pal);
    }
    this.dashPal(pal, tx, ty, 0, this.arena.scene.time.now);
  }

  private dashPal(pal: Pal, ax: number, ay: number, off: number, time: number): void {
    const host = this.fighterOf(pal.owner);
    const W = this.arena.scene.scale.width, H = this.arena.scene.scale.height;
    const a = Math.atan2(ay - host.y, ax - host.x) + off;
    const want = Phaser.Math.Distance.Between(host.x, host.y, ax, ay);
    const dist = Math.min(this.palDashDist(pal.owner), Math.max(70, want));
    pal.fromX = pal.x;
    pal.fromY = pal.y;
    pal.toX = Phaser.Math.Clamp(host.x + Math.cos(a) * dist, 20, W - 20);
    pal.toY = Phaser.Math.Clamp(host.y + Math.sin(a) * dist, 20, H - 20);
    const travel = Phaser.Math.Distance.Between(pal.fromX, pal.fromY, pal.toX, pal.toY);
    pal.dashMs = Math.max(120, (travel / this.palDashSpeed(pal.owner)) * 1000);
    pal.mode = 'dash';
    pal.modeAt = time;
    if (!this.monkey(pal.owner)) {
      this.fx(pal.owner).motes(pal.x, pal.y, 5, {
        angle: a + Math.PI, spread: 0.7, speed: 80, size: 2.2, life: 320, depth: 5, tones: PAL_TONES,
      });
    }
  }

  private makePal(owner: Owner, index: number): Pal {
    const host = this.fighterOf(owner);
    return {
      owner, index,
      gfx: this.arena.scene.add.graphics().setDepth(6),
      x: host.x - 30, y: host.y + 10,
      mode: 'follow', modeAt: 0,
      fromX: 0, fromY: 0, toX: 0, toY: 0, dashMs: 1,
      lastZooAt: 0,
      digest: [],
      seed: Math.random() * 10,
    };
  }

  /** Field the right number of Pals: none unbound, one normally, two with Mitosis. */
  private syncPals(): void {
    const want = this.palOn() ? (this.palTier('pal-mitosis') > 0 ? 2 : 1) : 0;
    const mine = this.pals.filter((p) => p.owner === 'player');
    for (let i = mine.length; i < want; i++) this.pals.push(this.makePal('player', i));
    for (let i = want; i < mine.length; i++) {
      mine[i].gfx.destroy();
      this.pals.splice(this.pals.indexOf(mine[i]), 1);
    }
    if (this.arena.npcElementId !== 'growth') {
      for (let i = this.pals.length - 1; i >= 0; i--) {
        if (this.pals[i].owner !== 'npc') continue;
        this.pals[i].gfx.destroy();
        this.pals.splice(i, 1);
      }
    }
  }

  private updatePals(time: number, delta: number): void {
    this.syncPals();
    const on = this.palOn();
    const p = this.arena.player;
    // Jelly Membrane: rolled by the victim in Fighter.takeDamage.
    p.growthPalDodge = on ? 0.04 * this.palTier('jelly-membrane') : 0;
    if (on) {
      const max = this.palMaxCharges();
      if (this.palCharge < max) {
        // Viral Rage: the Pal's own cooldown (and only that one) runs faster while enraged.
        const rate = 1 + (this.palRaged(time) ? 0.25 * this.palTier('viral-rage') : 0);
        this.palCharge = Math.min(max, this.palCharge + (delta * rate) / this.palCooldown());
      }
      this.updatePalHelpingHand(time, delta);
    }
    const dt = delta / 1000;
    for (const pal of this.pals) this.updatePal(pal, time, dt);
  }

  /** Helping Hand: 2s without a scratch and the Pal starts patching you up. */
  private updatePalHelpingHand(time: number, delta: number): void {
    const p = this.arena.player;
    if (p.hp < this.palLastHp) this.palLastHurtAt = time;
    this.palLastHp = p.hp;
    const tier = this.palTier('helping-hand');
    if (tier <= 0 || p.hp <= 0 || p.hp >= p.maxHp || time - this.palLastHurtAt < PAL_HELP_DELAY) return;
    this.palHealAccum += tier * (delta / 1000);
    // Paid out in 3s chunks so the heal numbers don't tick every frame.
    if (this.palHealAccum >= 3) {
      const amt = Math.floor(this.palHealAccum);
      this.palHealAccum -= amt;
      p.heal(amt);
      this.palLastHp = p.hp;
    }
  }

  private updatePal(pal: Pal, time: number, dt: number): void {
    const host = this.fighterOf(pal.owner);
    if (!host.active || host.hp <= 0) { pal.gfx.clear(); return; }
    const sym = pal.owner === 'player' && this.palSymbiosis();

    if (sym) {
      pal.x = host.x;
      pal.y = host.y;
      if (pal.mode === 'dash') pal.mode = 'follow';
      if (pal.mode === 'symDash' && time - pal.modeAt >= PAL_SYM_DASH_MS) {
        pal.mode = 'lash';
        pal.modeAt = time;
        this.palLash(pal, time);
      }
    } else if (pal.mode === 'dash') {
      const k = Math.min(1, (time - pal.modeAt) / pal.dashMs);
      const e = easeOut(k);
      pal.x = pal.fromX + (pal.toX - pal.fromX) * e;
      pal.y = pal.fromY + (pal.toY - pal.fromY) * e;
      if (pal.owner === 'player') this.palSporeBlast(pal, time);
      if (k >= 1) {
        pal.mode = 'lash';
        pal.modeAt = time;
        this.palLash(pal, time);
      }
    } else if (pal.mode === 'follow' || pal.mode === 'symDash') {
      pal.mode = 'follow';
      // Tag along just behind you, off to one side (Mitosis Pals take a side each).
      const foe = pal.owner === 'player' ? null : this.arena.player;
      const face = foe
        ? Math.atan2(foe.y - host.y, foe.x - host.x)
        : Math.atan2((this.aimY || host.y) - host.y, (this.aimX || host.x + 1) - host.x);
      const twins = this.pals.filter((o) => o.owner === pal.owner).length > 1;
      const side = twins && pal.index === 1 ? -1 : 1;
      const ang = face + Math.PI - 0.75 * side;
      const tx = host.x + Math.cos(ang) * PAL_FOLLOW_GAP;
      const ty = host.y + Math.sin(ang) * PAL_FOLLOW_GAP + Math.sin(time / 380 + pal.seed) * 4;
      const dx = tx - pal.x, dy = ty - pal.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d > 0.5) {
        const spd = PAL_FOLLOW_SPEED * (1 + 0.25 * this.palTier('big-brain', pal.owner));
        // Catches up harder the further it has fallen behind.
        const step = Math.min(d, Math.max(spd, d * 5) * dt);
        pal.x += (dx / d) * step;
        pal.y += (dy / d) * step;
      }
    } else if (pal.mode === 'lash' && time - pal.modeAt >= PAL_LASH_MS) {
      pal.mode = 'follow';
    }

    if (pal.owner === 'player') {
      this.palViralRage(pal, time);
      if (this.palBlocks(pal)) this.palBlockProjectiles(pal, time);
      this.palDigest(pal, time);
      this.palZoochosis(pal, time);
    }
    this.drawPal(pal, time, sym);
  }

  /** The payoff: every tentacle out at once, hitting everything in reach. */
  private palLash(pal: Pal, time: number): void {
    const owner = pal.owner;
    const r = this.palLashRadius(owner);
    const dmg = this.palDamage(owner, time);
    const monkey = this.monkey(owner);
    let dealt = 0;
    for (const t of this.targetsOf(owner)) {
      if (!t.active || t.hp <= 0) continue;
      if (Phaser.Math.Distance.Between(pal.x, pal.y, t.x, t.y) > r + 16) continue;
      t.takeDamage(dmg);
      this.arena.spawnHitFlash(t.x, t.y, monkey ? 0xe6ecf2 : this.col(owner)(PAL_TONES.lit));
      this.registerDamage(owner, t, dmg);
      dealt += dmg;
      if (!monkey) {
        const a = Math.atan2(t.y - pal.y, t.x - pal.x);
        this.fx(owner).motes(t.x, t.y, 5, { angle: a, spread: 0.8, speed: 100, size: 2.3, life: 360, depth: 8, tones: PAL_TONES });
      }
    }
    // Blood Drink: the tentacles feed you.
    const drink = this.palTier('blood-drink', owner);
    if (owner === 'player' && drink > 0 && dealt > 0) {
      this.arena.player.heal(Math.max(1, Math.round(dealt * (0.05 + 0.1 * drink))));
    }

    if (monkey) {
      // Tack Shooter: a full ring of tacks spat out to the edge of its reach.
      const n = 8 + 4 * Math.min(2, Math.floor(this.palTier('reflexes', owner) / 2 + this.palTier('assistance', owner) / 2));
      const ox = pal.x, oy = pal.y;
      const raged = owner === 'player' && this.palRaged(time);
      this.fx(owner).anim(8, 230, (g, t) => {
        const d = 10 + (r - 10) * easeOut(t);
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2;
          const x = ox + Math.cos(a) * d, y = oy + Math.sin(a) * d;
          if (raged) {
            g.fillStyle(0xff8a2a, 0.35 * (1 - t));
            g.fillCircle(x, y, 5);
          }
          drawTack(g, x, y, a, 10, 1 - t * 0.6);
        }
      });
    } else {
      this.fx(owner).ring(pal.x, pal.y, 8, r, PAL_TONES.lit, 300, 3, 5);
    }
  }

  /** Viral Rage: brushing through one of your own viruses sets the Pal off for 6s. */
  private palViralRage(pal: Pal, time: number): void {
    if (this.palTier('viral-rage') <= 0) return;
    const reach = this.palRadius(pal) + FLOOR_VIRUS_HIT_RADIUS;
    const touches = this.floorViruses.some((fv) => fv.owner === 'player'
      && Phaser.Math.Distance.Between(pal.x, pal.y, fv.x, fv.y) <= reach)
      || this.viruses.some((v) => v.owner === 'player'
      && Phaser.Math.Distance.Between(pal.x, pal.y, v.x, v.y) <= reach);
    if (!touches) return;
    if (!this.palRaged(time)) {
      if (!this.monkey('player')) this.fx('player').ring(pal.x, pal.y, 4, 36, PAL_RAGE_BODY, 280, 3, 7);
    }
    this.palRageUntil = time + PAL_RAGE_MS;
  }

  /** Spore Blast: a dash through your own spore wall pops it into a ring of new ones. */
  private palSporeBlast(pal: Pal, time: number): void {
    const tier = this.palTier('spore-blast');
    if (tier <= 0) return;
    for (let i = this.spores.length - 1; i >= 0; i--) {
      const s = this.spores[i];
      if (s.owner !== 'player' || s.noBlast) continue;
      const sr = this.sporeRadius(s);
      if (Phaser.Math.Distance.Between(pal.x, pal.y, s.x, s.y) > sr + this.palRadius(pal)) continue;

      const dmg = Math.round((8 + 4 * tier) * this.dmgBoost('player'));
      for (const t of this.targetsOf('player')) {
        if (!t.active || t.hp <= 0) continue;
        if (Phaser.Math.Distance.Between(s.x, s.y, t.x, t.y) > PAL_BLAST_RADIUS + sr) continue;
        t.takeDamage(dmg);
        this.arena.spawnHitFlash(t.x, t.y, this.col('player')(GROWTH.lime));
        this.registerDamage('player', t, dmg);
      }
      if (this.monkey('player')) {
        this.monkeyAnims.pop(s.x, s.y, sr * 1.4, bloonColor(Math.max(1, s.hp)));
      } else {
        this.fx('player').burst(s.x, s.y, PAL_BLAST_RADIUS + sr, { pods: 12, haze: 2, duration: 380, tones: CULTURE_TONES });
      }
      const n = 2 + tier;
      const spin = Math.random() * Math.PI * 2;
      for (let k = 0; k < n; k++) {
        const a = spin + (k / n) * Math.PI * 2;
        const d = 56 + Math.random() * 22;
        this.pendingSpores.push({
          x: s.x + Math.cos(a) * d, y: s.y + Math.sin(a) * d,
          owner: 'player', spikedTier: s.spikedTier, gutTier: s.gutTier,
          spawnAt: time + 40 + k * 50, noBlast: true,
        });
      }
      s.gfx.destroy();
      this.spores.splice(i, 1);
    }
  }

  /** Shell: opposing arena projectiles stop dead against the Pal's body. */
  private palBlockProjectiles(pal: Pal, time: number): void {
    const r = this.palRadius(pal);
    for (const child of this.arena.projectiles.getChildren()) {
      const p = child as Projectile;
      if (!p.active || p.isFromPlayer) continue;
      const body = p.body as Phaser.Physics.Arcade.Body;
      const pr = body.isCircle ? body.radius : Math.max(body.halfWidth, body.halfHeight);
      if (Phaser.Math.Distance.Between(p.x, p.y, pal.x, pal.y) > r + pr) continue;
      this.palEat(pal, p.damage, Math.atan2(p.y - pal.y, p.x - pal.x), time);
      p.setActive(false).setVisible(false);
      body.stop();
    }
  }

  /** A hostile shot at (x, y) against any of the player's blocking Pals. */
  private palCatchAt(x: number, y: number, radius: number, dmg: number): boolean {
    const time = this.arena.scene.time.now;
    for (const pal of this.pals) {
      if (!this.palBlocks(pal)) continue;
      if (Phaser.Math.Distance.Between(x, y, pal.x, pal.y) > this.palRadius(pal) + radius) continue;
      this.palEat(pal, dmg, Math.atan2(y - pal.y, x - pal.x), time);
      return true;
    }
    return false;
  }

  /** Mouth: what the shell stops goes down the hatch, and pays out as a heal 3s later. */
  private palEat(pal: Pal, dmg: number, ang: number, time: number): void {
    this.arena.spawnHitFlash(pal.x + Math.cos(ang) * this.palRadius(pal), pal.y + Math.sin(ang) * this.palRadius(pal),
      this.monkey('player') ? 0xe6ecf2 : this.col('player')(PAL_TONES.lit));
    const mouth = this.palTier('mouth');
    if (mouth <= 0 || dmg <= 0) return;
    pal.digest.push({ heal: Math.max(2, Math.round(dmg * (0.15 + 0.15 * mouth))), doneAt: time + PAL_DIGEST_MS, ang });
  }

  private palDigest(pal: Pal, time: number): void {
    for (let i = pal.digest.length - 1; i >= 0; i--) {
      if (time < pal.digest[i].doneAt) continue;
      this.arena.player.heal(pal.digest[i].heal);
      pal.digest.splice(i, 1);
    }
  }

  /** Zoochosis: the Pal fires bacteria of its own at whoever is closest. */
  private palZoochosis(pal: Pal, time: number): void {
    if (this.palTier('zoochosis') <= 0 || time - pal.lastZooAt < PAL_ZOO_MS) return;
    const t = this.nearestOf(pal.x, pal.y, this.targetsOf('player'));
    if (!t || Phaser.Math.Distance.Between(pal.x, pal.y, t.x, t.y) > PAL_ZOO_RANGE) return;
    pal.lastZooAt = time;
    this.launchBacterium(pal.x, pal.y, t.x, t.y, 'player', this.fighterBody, true);
  }

  // ── Plague Pal: drawing ──────────────────────────────────────────────

  private drawPal(pal: Pal, time: number, sym: boolean): void {
    const g = pal.gfx;
    g.clear();
    const host = this.fighterOf(pal.owner);
    const alpha = host.forceInvisible ? 0 : host.alpha;
    if (alpha <= 0.01) return;
    const owner = pal.owner;
    const raged = owner === 'player' && this.palRaged(time);
    const lashK = pal.mode === 'lash' ? Math.min(1, (time - pal.modeAt) / PAL_LASH_MS) : -1;
    const foe = this.nearestOf(pal.x, pal.y, this.targetsOf(owner));
    const look = foe ? Math.atan2(foe.y - pal.y, foe.x - pal.x) : 0;
    const r = sym ? PAL_SYM_RADIUS : this.palRadius(pal);

    if (this.monkey(owner)) {
      this.drawTackPal(g, pal, time, sym, r, raged, lashK, alpha, look);
      return;
    }

    const tint = this.col(owner);
    const T = PAL_TONES;
    const t = time / 1000 + pal.seed;
    g.setAlpha(alpha);

    // Rage: a hot aura boiling off it.
    if (raged) {
      g.fillStyle(tint(PAL_RAGE_BODY), 0.18 + 0.08 * Math.sin(t * 9));
      g.fillCircle(pal.x, pal.y, r * 1.9);
    }

    // Tentacles, behind the body: dangling and curling at rest, whipped out straight on a lash.
    const reach = this.palLashRadius(owner);
    for (let i = 0; i < PAL_TENTACLES; i++) {
      const base = (i / PAL_TENTACLES) * Math.PI * 2 + t * 0.4;
      let len: number, curl: number;
      if (lashK >= 0) {
        const ext = lashK < 0.3 ? easeOut(lashK / 0.3) : 1 - ((lashK - 0.3) / 0.7) * 0.85;
        len = r + (reach - r) * ext;
        curl = 0.12;
      } else {
        len = r * 1.75 + Math.sin(t * 3 + i * 1.3) * 3;
        curl = 0.55;
      }
      const segs = 9;
      let px = pal.x + Math.cos(base) * r * 0.7;
      let py = pal.y + Math.sin(base) * r * 0.7;
      for (let k = 1; k <= segs; k++) {
        const f = k / segs;
        const a = base + Math.sin(t * 4 + i * 1.7 + f * 3) * curl * f;
        const d = r * 0.7 + (len - r * 0.7) * f;
        const nx = pal.x + Math.cos(a) * d, ny = pal.y + Math.sin(a) * d;
        const w = Math.max(1, (1 - f * 0.8) * 4.2 * (r / PAL_RADIUS) * (sym ? 0.8 : 1));
        g.lineStyle(w + 1.5, tint(T.shell), 0.8);
        g.lineBetween(px, py, nx, ny);
        g.lineStyle(w, tint(raged ? PAL_RAGE_BODY : f < 0.5 ? T.body : T.cyto), 0.95);
        g.lineBetween(px, py, nx, ny);
        px = nx; py = ny;
      }
      // Suckers along a lashing tentacle, and a barbed tip that does the damage.
      if (lashK >= 0) {
        g.fillStyle(tint(T.spark), 0.9);
        g.fillCircle(px, py, 2.6);
        g.fillStyle(tint(T.lit), 0.7);
        g.fillCircle((px + pal.x) / 2 + Math.cos(base) * 2, (py + pal.y) / 2 + Math.sin(base) * 2, 1.6);
      }
    }

    // Symbiosis: the Pal is a translucent membrane over you, not a second creature.
    const bodyAlpha = sym ? 0.32 : 1;
    const pts: Phaser.Geom.Point[] = [];
    const outer: Phaser.Geom.Point[] = [];
    for (let k = 0; k < 22; k++) {
      const a = (k / 22) * Math.PI * 2;
      const rr = r * (1 + 0.08 * Math.sin(a * 3 + t * 5) + 0.05 * Math.sin(a * 5 - t * 3));
      pts.push(new Phaser.Geom.Point(pal.x + Math.cos(a) * rr, pal.y + Math.sin(a) * rr));
      outer.push(new Phaser.Geom.Point(pal.x + Math.cos(a) * rr * 1.13, pal.y + Math.sin(a) * rr * 1.13));
    }
    g.fillStyle(tint(T.shell), 0.95 * bodyAlpha);
    g.fillPoints(outer, true);
    g.fillStyle(tint(raged ? PAL_RAGE_BODY : T.body), bodyAlpha);
    g.fillPoints(pts, true);

    // Capsid knobs: little stalked spikes all the way round — what makes it read as a virus.
    for (let k = 0; k < 9; k++) {
      const a = (k / 9) * Math.PI * 2 - t * 0.3;
      const x0 = pal.x + Math.cos(a) * r * 1.05, y0 = pal.y + Math.sin(a) * r * 1.05;
      const x1 = pal.x + Math.cos(a) * r * 1.42, y1 = pal.y + Math.sin(a) * r * 1.42;
      g.lineStyle(1.6, tint(T.cyto), 0.9 * (sym ? 0.6 : 1));
      g.lineBetween(x0, y0, x1, y1);
      g.fillStyle(tint(T.spark), 0.95 * (sym ? 0.6 : 1));
      g.fillCircle(x1, y1, 2.1 * (r / PAL_RADIUS) * (sym ? 0.7 : 1));
    }
    if (sym) return;

    // Shell: a hard, faceted rim.
    if (this.palTier('shell', owner) > 0) {
      g.lineStyle(2.5, tint(0xe6d8ff), 0.75);
      g.strokeCircle(pal.x, pal.y, r * 1.02);
      g.lineStyle(1, tint(T.shell), 0.6);
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2 + 0.3;
        g.lineBetween(pal.x + Math.cos(a) * r * 0.62, pal.y + Math.sin(a) * r * 0.62,
          pal.x + Math.cos(a) * r * 1.0, pal.y + Math.sin(a) * r * 1.0);
      }
    }
    // Granules floating in the cytoplasm, and a membrane sheen on top.
    for (let k = 0; k < 4; k++) {
      const a = pal.seed * 3 + k * 1.9 + t * 0.6;
      g.fillStyle(tint(T.spark), 0.55);
      g.fillCircle(pal.x + Math.cos(a) * r * 0.5, pal.y + Math.sin(a) * r * 0.5 + 2, 1.4);
    }
    g.fillStyle(0xffffff, 0.16);
    g.fillEllipse(pal.x - r * 0.3, pal.y - r * 0.42, r * 0.9, r * 0.45);

    // Mouth: a little maw that works while it is eating something.
    if (this.palTier('mouth', owner) > 0) {
      const chew = pal.digest.length > 0 ? 0.5 + 0.5 * Math.abs(Math.sin(t * 8)) : 0.25;
      const mx = pal.x + Math.cos(look) * r * 0.35, my = pal.y + r * 0.42;
      g.fillStyle(tint(T.shell), 1);
      g.fillEllipse(mx, my, r * 0.62, r * 0.42 * chew + 1);
      g.fillStyle(0xf5f0dd, 0.9);
      g.fillTriangle(mx - r * 0.2, my - 1, mx - r * 0.1, my - 1, mx - r * 0.15, my + 2);
      g.fillTriangle(mx + r * 0.1, my - 1, mx + r * 0.2, my - 1, mx + r * 0.15, my + 2);
    }
    // Whatever it is eating, shrinking inside it.
    for (const d of pal.digest) {
      const left = Phaser.Math.Clamp((d.doneAt - time) / PAL_DIGEST_MS, 0, 1);
      g.fillStyle(0x221122, 0.55);
      g.fillCircle(pal.x + Math.cos(d.ang) * r * 0.3 * left, pal.y + Math.sin(d.ang) * r * 0.3 * left, 1 + 3.5 * left);
    }

    // Eyes, tracking whoever it is about to hit. Angry brows while enraged.
    const ex = Math.cos(look), ey = Math.sin(look);
    for (const side of [-1, 1]) {
      const cx = pal.x + ex * r * 0.18 + side * r * 0.32;
      const cy = pal.y - r * 0.12 + ey * r * 0.1;
      g.fillStyle(0xffffff, 1);
      g.fillCircle(cx, cy, r * 0.26);
      g.fillStyle(0x140a1a, 1);
      g.fillCircle(cx + ex * r * 0.1, cy + ey * r * 0.1, r * 0.13);
      if (raged) {
        g.lineStyle(2, tint(T.shell), 1);
        g.lineBetween(cx - side * r * 0.28, cy - r * 0.36, cx + side * r * 0.12, cy - r * 0.22);
      }
    }
  }

  /** Monkey skin: the Pal is a Tack Shooter on little wheels that rolls after you. */
  private drawTackPal(
    g: Phaser.GameObjects.Graphics, pal: Pal, time: number, sym: boolean, r: number,
    raged: boolean, lashK: number, alpha: number, look: number,
  ): void {
    g.setAlpha(sym ? 0.5 * alpha : alpha);
    const owner = pal.owner;
    const nozzles = 8 + 2 * Math.min(4, Math.floor((this.palTier('reflexes', owner) + this.palTier('assistance', owner)
      + this.palTier('jelly-membrane', owner) + this.palTier('big-brain', owner)) / 3));
    const heat = raged ? 0.75 + 0.25 * Math.sin(time / 90) : Math.min(0.5, 0.12 * this.palTier('hardened-beak', owner));
    const recoil = lashK >= 0 ? 1 - lashK : 0;
    const spin = pal.mode === 'dash' ? time / 60 : look * 0.1;
    drawTackShooter(g, pal.x, pal.y, (sym ? r * 1.1 : r) / 11, 1, spin, heat, recoil, nozzles);
    if (sym) return;
    // Long Range Tacks: a scope ring. Blade Maelstrom: its catch tray grinding what it stopped.
    if (this.palTier('shell', owner) > 0) {
      g.lineStyle(2, 0xe6ecf2, 0.7);
      g.strokeCircle(pal.x, pal.y, r * 1.35);
    }
    for (const d of pal.digest) {
      const left = Phaser.Math.Clamp((d.doneAt - time) / PAL_DIGEST_MS, 0, 1);
      drawTack(g, pal.x + Math.cos(d.ang + time / 120) * r * 0.5, pal.y + Math.sin(d.ang + time / 120) * r * 0.5,
        d.ang + time / 80, 4 + 6 * left, 0.9);
    }
  }

  // ── Input ─────────────────────────────────────────────────────────────

  handleInput(time: number, pointer: Phaser.Input.Pointer, mouseX: number, mouseY: number): void {
    if (this.arena.nukeChanneling) return;
    const { player, eKey, rKey, fKey, qKey, spaceKey, pointerWasDown } = this.arena;

    if (this.evolveOpen) {
      if (pointer.leftButtonDown() && !pointerWasDown) {
        this.handleEvolveClick(pointer.worldX, pointer.worldY, false);
      } else if (pointer.rightButtonDown() && !this.evolveRightWasDown) {
        this.handleEvolveClick(pointer.worldX, pointer.worldY, true);
      }
      this.evolveRightWasDown = pointer.rightButtonDown();
      if (Phaser.Input.Keyboard.JustDown(eKey)) this.closeEvolve();
      return;
    }

    // SPACE swaps bodies with a live clone; with Ruler's second clone it cycles
    // through them. Only consume the key when a swap is possible — otherwise
    // ArenaScene's dodge (which runs later this frame and also calls JustDown)
    // must still see the press.
    const playerClones = this.clones.filter((c) => c.owner === 'player');
    if (playerClones.length > 0 && Phaser.Input.Keyboard.JustDown(spaceKey)) {
      this.cloneCycle = (this.cloneCycle + 1) % playerClones.length;
      this.swapBodies(playerClones[this.cloneCycle]);
    }

    // Plague Pal (mastery) takes over one of R/F/Q — that slot's base ability is
    // suppressed below, so the kit owns the keypress for it.
    const palSlot = this.arena.masteryActive ? this.palSlot() : null;
    if (palSlot) {
      const key = palSlot === 'r' ? rKey : palSlot === 'f' ? fKey : qKey;
      if (Phaser.Input.Keyboard.JustDown(key)) this.tryCastPal(time, mouseX, mouseY);
    }
    const taken = (slot: 'r' | 'f' | 'q') => palSlot === slot;

    // Cached for the avatar rig, which runs in update() and has no pointer of its own.
    this.aimX = mouseX;
    this.aimY = mouseY;

    const ctx = () => this.arena.buildPlayerContext(mouseX, mouseY);
    if (pointer.isDown && player.castAbility('growth-click', ctx())) this.shaveCooldown('growth-click');
    if (Phaser.Input.Keyboard.JustDown(eKey)) player.castAbility('growth-evolve', ctx());
    if (!taken('r') && Phaser.Input.Keyboard.JustDown(rKey)) this.castChargeable('growth-virus', time, mouseX, mouseY);
    if (!taken('f') && Phaser.Input.Keyboard.JustDown(fKey)) this.castChargeable('spore-spray', time, mouseX, mouseY);
    if (!taken('q') && Phaser.Input.Keyboard.JustDown(qKey)) {
      if (this.playerDna < AUX_COST) {
        this.floatText(player.x, player.y - 30, 'Not enough DNA', '#ff6666');
      } else if (this.cloneSlotsFull('player')) {
        this.floatText(player.x, player.y - 30, 'Clone already active', '#ff6666');
      } else {
        player.castAbility('auxiliary-growth', ctx());
      }
    }
  }

  /** R/F casting: normal cooldown cast, or charge-banked when this body has Sweating. */
  private castChargeable(abilityId: string, time: number, mouseX: number, mouseY: number): void {
    const { player } = this.arena;
    const body = this.fighterBody;
    if (this.lvl(body, 'sweating') > 0) {
      const isR = abilityId === 'growth-virus';
      const charges = isR ? body.sweatR : body.sweatF;
      if (charges <= 0) {
        this.floatText(player.x, player.y - 30, 'No charges', '#ff6666');
        return;
      }
      if (isR) {
        body.sweatR--;
        if (body.sweatRStart === 0) body.sweatRStart = time;
      } else {
        body.sweatF--;
        if (body.sweatFStart === 0) body.sweatFStart = time;
      }
      // triggerCooldown stamps the cast for the ability bar and broadcasts it online.
      player.triggerCooldown(abilityId);
      if (isR) this.doVirus(mouseX, mouseY, 'player');
      else this.doSporeSpray(mouseX, mouseY, 'player');
    } else {
      const ctx = this.arena.buildPlayerContext(mouseX, mouseY);
      if (player.castAbility(abilityId, ctx)) this.shaveCooldown(abilityId);
    }
  }

  // ── Per-frame update ─────────────────────────────────────────────────

  update(time: number, delta: number): void {
    this.updateAvatars(delta);
    this.updateBacteria(time, delta);
    this.updateViruses(time, delta);
    this.updateInfections(time);
    this.updateFloorViruses(time);
    this.updatePendingSpores(time);
    this.updateSpores(time, delta);
    this.updateNests(time, delta);
    this.updateClones(time, delta);
    this.updateContactDamage(time);
    this.updateChitin(time);
    this.updateSweatCharges(time);
    this.updatePals(time, delta);
    this.updateEmesis(time, delta);
    // The open tree is a menu: while it is up, incoming damage lands at 5% (Fighter.menuGuards).
    this.arena.player.setMenuGuard('growth-evolve', this.evolveOpen);
    this.drawDnaBar();
    this.drawDnaHudBar();
    this.drawChargePips();
  }

  // ── Growth character rig ──────────────────────────────────────────────

  /**
   * Builds (on first frame) and drives the cell-arm avatar for whichever fighters are growth.
   * The player faces the cursor; the NPC faces whoever it is fighting. The mastery passive's
   * culture mat lives here too, at a lower depth than anything a cast raises, so the two stack
   * into one silhouette rather than fighting each other.
   */
  private updateAvatars(delta: number): void {
    const { player, npc, scene, elementId, npcElementId } = this.arena;

    if (elementId === 'growth' && player?.active) {
      if (!this.playerAvatar) this.playerAvatar = this.makeAvatar('player');
      this.dressMonkey(this.playerAvatar, this.fighterBody);
      const aimX = this.aimX || player.x + 1;
      const aimY = this.aimY || player.y;
      this.playerAvatar.setFacing(Math.atan2(aimY - player.y, aimX - player.x));
      // Chitin up or a live clone means the colony is thriving; show it on the body.
      this.playerAvatar.setIntensity(
        this.fighterBody.chitinUp ? 1.35 : this.hasClone('player') ? 1.2 : 1,
      );
      this.playerAvatar.setMastered(this.arena.masteryActive);
      this.playerAvatar.update(delta, player.x, player.y, player.forceInvisible ? 0 : player.alpha);

      if (this.arena.masteryActive && !this.monkey('player')) {
        if (!this.masteryCulture) this.masteryCulture = new GrowthCulture(scene, this.pcol, CULTURE_TONES, 44, 0.75, 2, 7);
        this.masteryCulture.update(delta, player.x, player.y, player.alpha);
      } else if (this.masteryCulture) {
        this.masteryCulture.destroy();
        this.masteryCulture = null;
      }
    } else if (this.playerAvatar) {
      this.playerAvatar.destroy();
      this.playerAvatar = null;
      if (this.masteryCulture) { this.masteryCulture.destroy(); this.masteryCulture = null; }
    }

    if (npcElementId === 'growth' && npc?.active) {
      if (!this.npcAvatar) this.npcAvatar = this.makeAvatar('npc');
      this.dressMonkey(this.npcAvatar, this.npcBody);
      this.npcAvatar.setFacing(Math.atan2(player.y - npc.y, player.x - npc.x));
      this.npcAvatar.setIntensity(this.npcBody.chitinUp ? 1.35 : 1);
      this.npcAvatar.setMastered(this.arena.npcMasteryActive);
      this.npcAvatar.update(delta, npc.x, npc.y, npc.forceInvisible ? 0 : npc.alpha);
    } else if (this.npcAvatar) {
      this.npcAvatar.destroy();
      this.npcAvatar = null;
    }
  }

  // ── Public do* methods (wired from CastContext) ─────────────────────

  doBacterium(tx: number, ty: number, owner: Owner): void {
    const caster = this.fighterOf(owner);
    this.launchClickAttack(caster.x, caster.y, tx, ty, owner, this.bodyFor(owner));
  }

  doToggleEvolve(owner: Owner): void {
    if (owner !== 'player') return;
    if (this.evolveOpen) {
      this.closeEvolve();
    } else {
      this.evolveOpen = true;
      this.renderEvolve();
    }
  }

  doVirus(tx: number, ty: number, owner: Owner): void {
    const caster = this.fighterOf(owner);
    this.launchVirus(caster.x, caster.y, tx, ty, owner, this.bodyFor(owner));
  }

  doSporeSpray(tx: number, ty: number, owner: Owner): void {
    const caster = this.fighterOf(owner);
    this.spraySpores(caster.x, caster.y, tx, ty, owner, this.bodyFor(owner));
  }

  doAuxiliaryGrowth(tx: number, ty: number, owner: Owner): void {
    const fighter = this.fighterOf(owner);
    const dna = owner === 'player' ? this.playerDna : this.npcDna;
    if (dna < AUX_COST) {
      this.floatText(fighter.x, fighter.y - 30, 'Not enough DNA', '#ff6666');
      return;
    }
    if (this.cloneSlotsFull(owner)) {
      this.floatText(fighter.x, fighter.y - 30, 'Clone already active', '#ff6666');
      return;
    }
    if (owner === 'player') this.playerDna -= AUX_COST; else this.npcDna -= AUX_COST;

    const { scene } = this.arena;
    const nx = Phaser.Math.Clamp(tx, 40, scene.scale.width - 40);
    const ny = Phaser.Math.Clamp(ty, 40, scene.scale.height - 40);

    // Nesting on a primordial soup puddle passes the dead clone's upgrades on.
    let inherit: Record<string, number> | null = null;
    const pi = this.puddles.findIndex((p) => p.owner === owner && Phaser.Math.Distance.Between(p.x, p.y, nx, ny) <= PUDDLE_NEST_RADIUS);
    if (pi !== -1) {
      inherit = { ...this.puddles[pi].levels };
      this.puddles[pi].container.destroy();
      this.puddles.splice(pi, 1);
      this.floatText(nx, ny - 26, '🧬 Soup absorbed!', '#88ff88');
    }

    // Both arms thrust out and hold — the ultimate plants something, and the nest is
    // incubated into existence rather than dropped there.
    this.avatarOf(owner)?.play('raise', Math.atan2(ny - fighter.y, nx - fighter.x), 900);
    const fx = this.fx(owner);
    fx.channelIncubate(nx, ny, 54, 700, undefined, 4, tonesFor(owner));
    fx.stalk(nx, ny, 16, 60, 6, tonesFor(owner));
    this.nests.push({
      gfx: scene.add.graphics().setDepth(5),
      spawnAt: scene.time.now,
      x: nx, y: ny, hp: 10, owner, inheritLevels: inherit,
    });
    this.floatText(fighter.x, fighter.y - 40, '🥚 Nest planted', '#88bb22');
    if (owner === 'player') this.arena.recordMasteryStat('auxClones', 1);
  }

  // ── Second life: inhabit the clone if a lethal hit lands ─────────────

  onPlayerDamaged(): void { this.tryInhabitClone('player'); }
  onNpcDamaged(): void { this.tryInhabitClone('npc'); }

  private tryInhabitClone(owner: Owner): void {
    const fighter = this.fighterOf(owner);
    if (fighter.hp > 0) return;
    const idx = this.clones.findIndex((c) => c.owner === owner);
    if (idx === -1) return;
    const clone = this.clones[idx];
    if (owner === 'player') {
      this.swapBodies(clone, true);
      this.arena.player.hp = Math.max(1, this.arena.player.hp);
    } else {
      fighter.hp = Math.max(1, Math.min(fighter.maxHp, clone.hp));
      (fighter.body as Phaser.Physics.Arcade.Body).reset(clone.sprite.x, clone.sprite.y);
    }
    this.clones.splice(this.clones.indexOf(clone), 1);
    this.destroyCloneVisuals(clone);
    this.floatText(fighter.x, fighter.y - 40, '🧟 INHABITED CLONE!', '#88ff44');
    // Dying into a clone is the biggest thing this element does, so it gets the whole stack.
    const fx = this.fx(owner);
    fx.burst(fighter.x, fighter.y, 96, { pods: 16, haze: 3, duration: 560, tones: tonesFor(owner) });
    fx.stalk(fighter.x, fighter.y, 18, 80, 10, tonesFor(owner));
    this.avatarOf(owner)?.play('raise', 0, 800);
    this.arena.scene.cameras.main.shake(240, 0.006);
  }

  // ── Body swapping (SPACE) ────────────────────────────────────────────

  /**
   * Exchange the player Fighter with a clone entity: positions, vitals, shield,
   * and the BodyState (upgrade tree, variant, chitin, banked charges).
   */
  /**
   * Ruin Mastery — Second Skin. Body Swap puts the player inside one of their own clones and
   * leaves their real body walking around as one — a whole different statline, tint and
   * evolution tree. Being shot back out of it is a swap like any other, so it goes through
   * `swapBodies` rather than trying to unpick the two BodyStates by hand.
   *
   * The clone it swaps back with is whichever one is carrying the body that was never a clone's
   * to begin with. If it has been killed since, there is nothing to go back to and the fold
   * stands — the shard still landed and still hurt.
   */
  revertForms(f: Fighter): string[] {
    if (f !== this.arena.player || !this.fighterBody.isCloneBody) return [];
    const home = this.clones.find((c) => c.owner === 'player' && !c.body.isCloneBody);
    if (!home) return [];
    this.swapBodies(home);
    this.floatText(f.x, f.y - 56, '🔀 PUT BACK', '#aaff66');
    return ['Body Swap'];
  }

  private swapBodies(clone: Clone, silent = false): void {
    const p = this.arena.player;
    const px = p.x, py = p.y;
    const pHp = p.hp, pMax = p.maxHp, pShield = p.shieldHp;

    (p.body as Phaser.Physics.Arcade.Body).reset(clone.sprite.x, clone.sprite.y);
    clone.sprite.setPosition(px, py);

    p.increaseMaxHp(clone.maxHp - pMax);
    p.hp = Math.min(clone.hp, p.maxHp);
    clone.maxHp = pMax;
    clone.hp = pHp;
    p.shieldHp = clone.shieldHp;
    clone.shieldHp = pShield;

    const b = this.fighterBody;
    this.fighterBody = clone.body;
    clone.body = b;

    this.syncFighterMods();
    this.applyFighterTint();
    this.applyCloneTint(clone);

    if (!silent) {
      this.floatText(p.x, p.y - 40, '🔀 BODY SWAP', '#aaff66');
      // Both ends of the swap bloom, and a creep of biofilm marks the line between them.
      this.pfx.bloom(p.x, p.y, 40, 10, 6, CULTURE_TONES);
      this.pfx.bloom(clone.sprite.x, clone.sprite.y, 40, 10, 6, CULTURE_TONES);
      this.pfx.creep(px, py, p.x, p.y, 4, CULTURE_TONES);
      this.playerAvatar?.play('clap');
    }
  }

  /** Recompute the fighter's incoming-damage and speed multipliers from its current body. */
  private syncFighterMods(): void {
    const p = this.arena.player;
    const b = this.fighterBody;
    const inMult = (1 - 0.1 * this.lvl(b, 'thick-flesh')) * (b.variant === 'blue' ? VARIANT_DR_MULT : 1)
      * (this.palSymbiosis() ? PAL_SYM_DR : 1);
    const spMult = b.variant === 'yellow' ? VARIANT_SPEED_MULT : 1;
    p.incomingDamageMultiplier *= inMult / this.appliedFighterInMult;
    this.appliedFighterInMult = inMult;
    p.speed *= spMult / this.appliedFighterSpeedMult;
    this.appliedFighterSpeedMult = spMult;
  }

  private applyFighterTint(): void {
    const p = this.arena.player;
    const b = this.fighterBody;
    if (this.lvl(b, 'chitin-shell') > 0 && b.chitinUp) p.setTint(CHITIN_TINT);
    else if (b.variant) p.setTint(VARIANT_COLORS[b.variant]);
    else p.clearTint();
  }

  private applyCloneTint(c: Clone): void {
    if (this.lvl(c.body, 'chitin-shell') > 0 && c.body.chitinUp) c.sprite.setTint(CHITIN_TINT);
    else if (c.body.variant) c.sprite.setTint(VARIANT_COLORS[c.body.variant]);
    else c.sprite.clearTint();
  }

  // ── AI query helpers ──────────────────────────────────────────────────

  /** Memory's Rebirth: the struck side loses part of what it has built up. Returns a label, or null. */
  rebirthDrain(owner: Owner): string | null {
    const have = owner === 'player' ? this.playerDna : this.npcDna;
    const take = Math.ceil(have * 0.4);
    if (take <= 0) return null;
    if (owner === 'player') this.playerDna -= take; else this.npcDna -= take;
    return `−${take} DNA`;
  }

  getDna(owner: Owner): number { return owner === 'player' ? this.playerDna : this.npcDna; }
  hasClone(owner: Owner): boolean { return this.clones.some((c) => c.owner === owner); }
  hasNest(owner: Owner): boolean { return this.nests.some((n) => n.owner === owner); }
  hasSweating(): boolean { return this.lvl(this.fighterBody, 'sweating') > 0; }

  /** Ability-bar fill for R/F while Sweating banks charges: recharge progress, full when capped. */
  getChargeBarRatio(abilityId: string, time: number): number {
    const b = this.fighterBody;
    const isR = abilityId === 'growth-virus';
    const charges = isR ? b.sweatR : b.sweatF;
    if (charges >= SWEAT_MAX_CHARGES) return 1;
    const start = isR ? b.sweatRStart : b.sweatFStart;
    if (start === 0) return 0;
    const cd = BASE_COOLDOWNS[abilityId] * this.arena.player.cooldownMult * this.cdFactor(abilityId, b);
    return Phaser.Math.Clamp((time - start) / cd, 0, 1);
  }

  /**
   * Called from ArenaScene's projectile-vs-fighter overlap before damage lands:
   * a spore wall adjacent to the fighter eats the hit even if the projectile
   * touched both bodies in the same physics step.
   */
  trySporeBlock(defender: Owner, proj: Projectile): boolean {
    const body = proj.body as Phaser.Physics.Arcade.Body;
    const projRadius = body.isCircle ? body.radius : Math.max(body.halfWidth, body.halfHeight);
    if (defender === 'player' && this.palCatchAt(proj.x, proj.y, projRadius, proj.damage)) {
      proj.setActive(false).setVisible(false);
      body.stop();
      return true;
    }
    for (const s of this.spores) {
      if (s.owner !== defender) continue;
      const r = this.sporeRadius(s) + projRadius;
      if (Phaser.Math.Distance.Between(proj.x, proj.y, s.x, s.y) <= r) {
        this.absorbProjectileIntoSpore(s, proj.damage);
        proj.setActive(false).setVisible(false);
        body.stop();
        return true;
      }
    }
    return false;
  }

  // ── Click attack: bacterium / claw ───────────────────────────────────

  private launchClickAttack(ox: number, oy: number, tx: number, ty: number, owner: Owner, srcBody: BodyState): void {
    // Swarm (offensive ultimate): every click is a fan of three.
    if (this.lvl(srcBody, 'swarm') > 0) {
      const aim = Math.atan2(ty - oy, tx - ox);
      const dist = Phaser.Math.Distance.Between(ox, oy, tx, ty) || 1;
      for (const off of [-SWARM_SPREAD, 0, SWARM_SPREAD]) {
        this.launchBacterium(ox, oy, ox + Math.cos(aim + off) * dist, oy + Math.sin(aim + off) * dist, owner, srcBody);
      }
      return;
    }
    this.launchBacterium(ox, oy, tx, ty, owner, srcBody);
  }

  /** `fromPal`: Zoochosis — the Pal spits it, so the caster's arms stay still. */
  private launchBacterium(
    ox: number, oy: number, tx: number, ty: number, owner: Owner, srcBody: BodyState, fromPal = false,
  ): void {
    const { scene } = this.arena;
    const dx = tx - ox, dy = ty - oy;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const nx = dx / len, ny = dy / len;
    const red = owner === 'player' && this.hasSecret('brood');
    const speed = BACT_SPEED * (1 + 0.2 * this.lvl(srcBody, 'enhanced-flagellum')) * (red ? BROOD_SPEED_MULT : 1);
    const dmg = Math.round(this.bacteriumDamage(srcBody, owner) * (red ? BROOD_DAMAGE_MULT : 1));

    // The cell pinches off a hand: arms jab, then a bud tears loose where it left.
    const aim = Math.atan2(ny, nx);
    const avatar = fromPal ? null : this.avatarOf(owner);
    avatar?.play('punch', aim);
    const hand = avatar?.castHand() ?? { x: ox, y: oy };
    const container = scene.add.container(ox, oy).setDepth(6);
    if (this.monkey(owner)) {
      // A dart: no flagellum to wiggle, so the tail list stays empty.
      const dart = buildDart(scene);
      // Brood: a heavy red dart, a size up.
      if (red) dart.setScale(1.3);
      container.add(dart);
      container.setRotation(aim);
      this.bacteria.push({
        container, tail: [], owner, srcBody,
        x: ox, y: oy, vx: nx * speed, vy: ny * speed,
        dmg,
        spawnedAt: scene.time.now,
        wigglePhase: 0,
        red,
      });
      return;
    }
    this.fx(owner).muzzleBud(hand.x, hand.y, aim, 1, 7, tonesFor(owner));

    const color = this.col(owner)(red ? BROOD_COLOR : owner === 'player' ? PLAYER_COLOR : NPC_COLOR);
    // Brood bacteria are bigger, darker-cored and lumber along on a heavier tail.
    const k = red ? 1.35 : 1;
    const bodyGfx = scene.add.ellipse(0, 0, 16 * k, 9 * k, color, 0.95);
    const nucleus = scene.add.circle(2 * k, 0, 2.5 * k, this.col(owner)(red ? 0x4a0a0a : 0x1a4a1a), 1) as Phaser.GameObjects.Arc;
    const tail: Phaser.GameObjects.Arc[] = [];
    for (let i = 0; i < 3; i++) {
      const seg = scene.add.circle((-10 - i * 4.5) * k, 0, (2.4 - i * 0.5) * k, color, 0.8) as Phaser.GameObjects.Arc;
      tail.push(seg);
    }
    container.add([...tail, bodyGfx, nucleus]);
    container.setRotation(Math.atan2(ny, nx));

    this.bacteria.push({
      container, tail, owner, srcBody,
      x: ox, y: oy, vx: nx * speed, vy: ny * speed,
      dmg,
      spawnedAt: scene.time.now,
      wigglePhase: Math.random() * Math.PI * 2,
      red,
    });
  }

  // ── Emesis (divine perk) ──────────────────────────────────────────────

  /** True while that side is playing growth with Emesis equipped. */
  private hasEmesis(owner: Owner): boolean {
    const elementId = owner === 'player' ? this.arena.elementId : this.arena.npcElementId;
    return elementId === 'growth' && this.arena.hasPerk(owner, 'emesis');
  }

  /**
   * Emesis: the carrier's own stomach turns every few seconds, and anything caught in the
   * result owes two of its own within ten. Nothing here is aimed or cast — it is a condition,
   * and the spread is the point.
   */
  private updateEmesis(time: number, delta: number): void {
    // ── The carrier's own heaves ──
    for (const owner of ['player', 'npc'] as const) {
      if (!this.hasEmesis(owner)) { this.emesisNextAt[owner] = 0; continue; }
      if (this.emesisNextAt[owner] === 0) { this.emesisNextAt[owner] = time + EMESIS_INTERVAL_MS; continue; }
      if (time < this.emesisNextAt[owner]) continue;
      this.emesisNextAt[owner] = time + EMESIS_INTERVAL_MS;
      const f = owner === 'player' ? this.arena.player : this.arena.npc;
      if (f?.active && f.hp > 0) this.heave(f, owner, time);
    }

    // ── Heaves owed by whoever has been caught in one ──
    for (const [f, owed] of this.forcedVomits) {
      if (!f.active || f.hp <= 0 || owed.left <= 0) { this.forcedVomits.delete(f); continue; }
      if (time < owed.nextAt) continue;
      owed.left--;
      owed.nextAt = time + EMESIS_SPREAD_WINDOW_MS / (EMESIS_SPREAD_COUNT + 1);
      // Whose clouds are these? Theirs — which is why being sicked on is dangerous to the
      // person who did it. A husk belongs to nobody, so its bile is npc-owned by convention.
      const owner: Owner = f === this.arena.player ? 'player' : 'npc';
      this.heave(f, owner, time);
      if (owed.left <= 0) this.forcedVomits.delete(f);
    }

    this.updateVomitClouds(time, delta);
  }

  /** One bout: a cone of clouds thrown out in front of `f`, braking almost immediately. */
  private heave(f: Fighter, owner: Owner, time: number): void {
    const aim = owner === 'player'
      ? Math.atan2((this.aimY || f.y) - f.y, (this.aimX || f.x + 1) - f.x)
      : Math.atan2(this.arena.player.y - f.y, this.arena.player.x - f.x);
    this.avatarOf(owner)?.play('sweep', aim);
    this.fx(owner).motes(f.x, f.y, 6, {
      angle: aim, spread: EMESIS_CONE_HALF, speed: 150, size: 3, life: 420, depth: 8,
      tones: SICK_TONES,
    });
    this.floatText(f.x, f.y - 40, '🤢 …', '#88cc44');

    for (let i = 0; i < EMESIS_CLOUD_COUNT; i++) {
      if (this.vomitClouds.length >= EMESIS_MAX_CLOUDS) break;
      const spread = ((i / (EMESIS_CLOUD_COUNT - 1)) - 0.5) * 2 * EMESIS_CONE_HALF;
      const a = aim + spread;
      const speed = EMESIS_CLOUD_SPEED * (0.7 + Math.random() * 0.5);
      this.vomitClouds.push({
        gfx: this.arena.scene.add.graphics().setDepth(4),
        x: f.x + Math.cos(a) * 18, y: f.y + Math.sin(a) * 18,
        vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
        owner,
        expiresAt: time + EMESIS_CLOUD_LIFE_MS,
        tickAccum: 0,
        seed: Math.random() * Math.PI * 2,
      });
    }
  }

  private updateVomitClouds(time: number, delta: number): void {
    const dt = delta / 1000;
    for (let i = this.vomitClouds.length - 1; i >= 0; i--) {
      const c = this.vomitClouds[i];
      if (time >= c.expiresAt) {
        c.gfx.destroy();
        this.vomitClouds.splice(i, 1);
        continue;
      }
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      const drag = Math.pow(EMESIS_CLOUD_DRAG, delta / 16.67);
      c.vx *= drag;
      c.vy *= drag;

      c.tickAccum += delta;
      if (c.tickAccum >= EMESIS_TICK_MS) {
        c.tickAccum -= EMESIS_TICK_MS;
        for (const t of this.targetsOf(c.owner)) {
          if (!t.active || t.hp <= 0) continue;
          if (Phaser.Math.Distance.Between(c.x, c.y, t.x, t.y) > EMESIS_CLOUD_RADIUS) continue;
          t.takeDamage(EMESIS_TICK_DAMAGE, { source: c, sourceX: c.x, sourceY: c.y });
          this.arena.spawnHitFlash(t.x, t.y, this.col(c.owner)(GROWTH.lime));
          this.registerDamage(c.owner, t, EMESIS_TICK_DAMAGE);
          // Caught in it: they owe their own, and theirs will burn *us*.
          if (!this.forcedVomits.has(t)) {
            this.forcedVomits.set(t, {
              left: EMESIS_SPREAD_COUNT,
              nextAt: time + EMESIS_SPREAD_WINDOW_MS / (EMESIS_SPREAD_COUNT + 1),
            });
            this.floatText(t.x, t.y - 46, '🤮 Sick!', '#aadd44');
          }
        }
      }

      this.drawVomitCloud(c, time);
    }
  }

  /**
   * A cloud of bile: a sagging body of overlapping lobes, a few heavier drips settling out of
   * the bottom of it, and a slick of it on the floor underneath.
   */
  private drawVomitCloud(c: VomitCloud, time: number): void {
    const g = c.gfx;
    const t = time / 1000;
    const life = Phaser.Math.Clamp((c.expiresAt - time) / EMESIS_CLOUD_LIFE_MS, 0, 1);
    const col = this.col(c.owner);
    g.clear();

    // The slick it is settling into.
    g.fillStyle(col(GROWTH.humus), 0.22 * life);
    g.fillEllipse(c.x, c.y + 8, EMESIS_CLOUD_RADIUS * 1.8, EMESIS_CLOUD_RADIUS * 0.7);

    // Body: five lobes boiling around a centre, each on its own phase.
    for (let i = 0; i < 5; i++) {
      const a = c.seed + i * (Math.PI * 2 / 5) + Math.sin(t * 2 + i) * 0.3;
      const d = EMESIS_CLOUD_RADIUS * (0.32 + 0.16 * Math.sin(t * 3 + i * 1.7));
      const r = EMESIS_CLOUD_RADIUS * (0.5 + 0.12 * Math.sin(t * 4 + i));
      g.fillStyle(col(i % 2 === 0 ? GROWTH.moss : GROWTH.leaf), 0.6 * life);
      g.fillCircle(c.x + Math.cos(a) * d, c.y + Math.sin(a) * d, r);
    }
    g.fillStyle(col(GROWTH.lime), 0.5 * life);
    g.fillCircle(c.x, c.y, EMESIS_CLOUD_RADIUS * 0.44);
    // Bright flecks in it — the bits that make it read as sick rather than as smoke.
    for (let i = 0; i < 4; i++) {
      const a = c.seed * 2 + i * 1.9 + t * 1.4;
      const d = EMESIS_CLOUD_RADIUS * 0.5;
      g.fillStyle(col(GROWTH.sprout), 0.8 * life);
      g.fillCircle(c.x + Math.cos(a) * d, c.y + Math.sin(a) * d * 0.7, 1.8);
    }
    // Two drips running out of the underside.
    g.lineStyle(2, col(GROWTH.leaf), 0.55 * life);
    for (const side of [-1, 1]) {
      const dx = c.x + side * EMESIS_CLOUD_RADIUS * 0.42;
      const sag = 5 + 4 * Math.abs(Math.sin(t * 2.2 + side));
      g.beginPath();
      g.moveTo(dx, c.y + EMESIS_CLOUD_RADIUS * 0.34);
      g.lineTo(dx + side, c.y + EMESIS_CLOUD_RADIUS * 0.34 + sag);
      g.strokePath();
    }
  }

  private updateBacteria(time: number, delta: number): void {
    const dt = delta / 1000;
    const W = this.arena.scene.scale.width, H = this.arena.scene.scale.height;
    for (let i = this.bacteria.length - 1; i >= 0; i--) {
      const b = this.bacteria[i];

      // Click+ : bacteria that barely miss curve back onto a nearby foe.
      if (b.owner === 'player' && this.arena.hasUpgrade('click')) {
        const nearest = this.nearestOf(b.x, b.y, this.targetsOf(b.owner));
        // Brood's red bacteria smell prey from much farther off.
        const sense = b.red ? BROOD_LOCATOR_RADIUS : BACT_LOCATOR_RADIUS;
        if (nearest && Phaser.Math.Distance.Between(b.x, b.y, nearest.x, nearest.y) < sense) {
          const dx = nearest.x - b.x, dy = nearest.y - b.y;
          const dlen = Math.sqrt(dx * dx + dy * dy) || 1;
          const speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
          const turn = Math.min(1, BACT_LOCATOR_TURN_RATE * dt);
          b.vx += ((dx / dlen) * speed - b.vx) * turn;
          b.vy += ((dy / dlen) * speed - b.vy) * turn;
        }
      }

      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.wigglePhase += dt * 22;
      b.container.setPosition(b.x, b.y);
      b.container.setRotation(Math.atan2(b.vy, b.vx));
      b.tail.forEach((seg, ti) => seg.setY(Math.sin(b.wigglePhase + ti * 1.1) * (2 + ti)));

      if (b.x < -20 || b.x > W + 20 || b.y < -20 || b.y > H + 20 || time - b.spawnedAt > BACT_TIMEOUT) {
        b.container.destroy();
        this.bacteria.splice(i, 1);
        continue;
      }

      // Enemy spore walls eat bacteria.
      if (this.hitOpposingSpore(b.owner, b.x, b.y, b.dmg)) {
        b.container.destroy();
        this.bacteria.splice(i, 1);
        continue;
      }

      let hit = false;
      for (const t of this.targetsOf(b.owner)) {
        if (!t.active || t.hp <= 0) continue;
        if (Phaser.Math.Distance.Between(b.x, b.y, t.x, t.y) <= BACT_HIT_RADIUS) {
          t.takeDamage(b.dmg);
          this.arena.spawnHitFlash(t.x, t.y, this.col(b.owner)(b.red ? BROOD_COLOR : PLAYER_COLOR));
          this.registerDamage(b.owner, t, b.dmg);
          this.onClickDamage(b.owner, b.srcBody, b.dmg);
          hit = true;
          break;
        }
      }
      if (hit) {
        b.container.destroy();
        this.bacteria.splice(i, 1);
      }
    }
  }

  /** Digestive System: click damage accumulates into 2 HP/tier heals per 20 dealt. */
  private onClickDamage(owner: Owner, srcBody: BodyState, dmg: number): void {
    const tier = this.lvl(srcBody, 'digestive-system');
    if (tier <= 0) return;
    srcBody.digestAccum += dmg;
    while (srcBody.digestAccum >= 20) {
      srcBody.digestAccum -= 20;
      this.healBody(owner, srcBody, 2 * tier);
    }
  }

  /** Heal whichever entity currently hosts this body. */
  private healBody(owner: Owner, body: BodyState, amount: number): void {
    if (owner === 'player' && body === this.fighterBody) {
      this.arena.player.heal(amount);
      this.floatText(this.arena.player.x, this.arena.player.y - 30, `+${amount} HP`, '#66dd66');
      return;
    }
    if (owner === 'npc' && body === this.npcBody) {
      this.arena.npc.heal(amount);
      return;
    }
    const clone = this.clones.find((c) => c.body === body);
    if (clone) clone.hp = Math.min(clone.maxHp, clone.hp + amount);
  }

  // ── Virus (R) ────────────────────────────────────────────────────────

  private launchVirus(ox: number, oy: number, tx: number, ty: number, owner: Owner, srcBody: BodyState): void {
    const { scene } = this.arena;
    const dx = tx - ox, dy = ty - oy;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const tones = tonesFor(owner);
    const aim = Math.atan2(dy, dx);
    // Hurled overhead — the virus is thrown down at the target, not flicked.
    this.avatarOf(owner)?.play('slam', aim);
    let tri: VirusBody;
    if (this.monkey(owner)) {
      tri = buildTacks(scene).setPosition(ox, oy).setDepth(6);
    } else {
      this.fx(owner).muzzleBud(ox + Math.cos(aim) * 16, oy + Math.sin(aim) * 16, aim, 1.4, 7, tones);
      const capsid = scene.add.triangle(ox, oy, 0, -10, 9, 8, -9, 8, this.col(owner)(tones.cyto), 0.95).setDepth(6);
      capsid.setStrokeStyle(2, this.col(owner)(tones.spark), 0.9);
      tri = capsid;
    }
    tri.setRotation(aim + Math.PI / 2);
    this.viruses.push({
      tri, owner, srcBody,
      x: ox, y: oy, vx: (dx / len) * VIRUS_SPEED, vy: (dy / len) * VIRUS_SPEED,
      spawnedAt: scene.time.now,
    });
  }

  private updateViruses(time: number, delta: number): void {
    const dt = delta / 1000;
    const W = this.arena.scene.scale.width, H = this.arena.scene.scale.height;
    for (let i = this.viruses.length - 1; i >= 0; i--) {
      const v = this.viruses[i];
      v.x += v.vx * dt;
      v.y += v.vy * dt;
      v.tri.setPosition(v.x, v.y);
      v.tri.rotation += dt * 6;

      if (v.x < -20 || v.x > W + 20 || v.y < -20 || v.y > H + 20 || time - v.spawnedAt > VIRUS_TIMEOUT) {
        v.tri.destroy();
        this.viruses.splice(i, 1);
        continue;
      }

      const hitDmg = this.virusHitDamage(v.owner, v.srcBody);
      if (this.hitOpposingSpore(v.owner, v.x, v.y, hitDmg)) {
        v.tri.destroy();
        this.viruses.splice(i, 1);
        continue;
      }

      let hit = false;
      for (const t of this.targetsOf(v.owner)) {
        if (!t.active || t.hp <= 0) continue;
        if (Phaser.Math.Distance.Between(v.x, v.y, t.x, t.y) <= VIRUS_HIT_RADIUS) {
          t.takeDamage(hitDmg);
          this.arena.spawnHitFlash(t.x, t.y, this.col(v.owner)(GROWTH.shoot));
          // The capsid ruptures and the payload takes root in the victim.
          this.fx(v.owner).burst(v.x, v.y, 54, {
            pods: 9, haze: 1, duration: 380, tones: tonesFor(v.owner),
          });
          this.registerDamage(v.owner, t, hitDmg);
          this.infect(t, v.owner, v.srcBody, time);
          hit = true;
          break;
        }
      }
      if (hit) {
        v.tri.destroy();
        this.viruses.splice(i, 1);
      }
    }
  }

  private virusHitDamage(owner: Owner, srcBody: BodyState): number {
    const base = VIRUS_DAMAGE + 2 * this.lvl(srcBody, 'viral-spikes');
    return Math.round(base * (srcBody.variant === 'red' ? VARIANT_DMG_MULT : 1) * this.dmgBoost(owner));
  }

  /** Virus perk: a plague strain runs longer and coughs more often than a plain infection. */
  private hasVirusPerk(owner: Owner): boolean {
    return this.arena.hasPerk(owner, 'virus');
  }

  private expelIntervalFor(owner: Owner): number {
    return this.hasVirusPerk(owner) ? PERK_VIRUS_EXPEL_INTERVAL : INFECT_EXPEL_INTERVAL;
  }

  private infect(target: Fighter, owner: Owner, srcBody: BodyState, time: number, durationMs = INFECT_DURATION): void {
    // Only the stock infection is stretched — Pandemic's short reseed keeps its own clock.
    if (durationMs === INFECT_DURATION && this.hasVirusPerk(owner)) durationMs = PERK_VIRUS_INFECT_DURATION;
    const existing = this.infections.find((inf) => inf.target === target && inf.owner === owner);
    if (existing) {
      existing.until = Math.max(existing.until, time + durationMs);
      existing.srcBody = srcBody;
      return;
    }
    const icon = this.arena.scene.add.triangle(target.x, target.y - 34, 0, -6, 5, 4, -5, 4, this.col(owner)(0x77dd33), 0.95).setDepth(9);
    icon.setStrokeStyle(1, this.col(owner)(0xccffaa), 0.9);
    this.arena.scene.tweens.add({ targets: icon, scaleX: 1.35, scaleY: 1.35, yoyo: true, repeat: -1, duration: 380 });
    this.infections.push({ target, owner, srcBody, until: time + durationMs, nextExpelAt: time + this.expelIntervalFor(owner), icon });
    this.floatText(target.x, target.y - 44,
      this.hasVirusPerk(owner) ? '🦠 PLAGUED' : '🦠 INFECTED', '#99ee55');
  }

  private updateInfections(time: number): void {
    for (let i = this.infections.length - 1; i >= 0; i--) {
      const inf = this.infections[i];
      const t = inf.target;
      if (!t.active || t.hp <= 0 || time >= inf.until) {
        inf.icon.destroy();
        this.infections.splice(i, 1);
        continue;
      }
      inf.icon.setPosition(t.x, t.y - 34);
      if (time >= inf.nextExpelAt) {
        inf.nextExpelAt = time + this.expelIntervalFor(inf.owner);
        this.expelViruses(inf, time);
      }
    }
  }

  /** The infected host coughs up floor viruses that lie in wait around it. */
  private expelViruses(inf: Infection, time: number): void {
    const { scene } = this.arena;
    const t = inf.target;
    const dropDmg = Math.round((FLOOR_VIRUS_DAMAGE + 2 * this.lvl(inf.srcBody, 'viral-spikes'))
      * (inf.srcBody.variant === 'red' ? VARIANT_DMG_MULT : 1));
    const expelCount = this.hasVirusPerk(inf.owner) ? PERK_VIRUS_EXPEL_COUNT : INFECT_EXPEL_COUNT;
    for (let k = 0; k < expelCount; k++) {
      const ang = Math.random() * Math.PI * 2;
      const dist = 40 + Math.random() * 70;
      const fx = Phaser.Math.Clamp(t.x + Math.cos(ang) * dist, 20, scene.scale.width - 20);
      const fy = Phaser.Math.Clamp(t.y + Math.sin(ang) * dist, 20, scene.scale.height - 20);
      this.spawnFloorVirus(t.x, t.y, fx, fy, inf.owner, dropDmg, false, time);
    }
    this.arena.spawnHitFlash(t.x, t.y, this.col(inf.owner)(0x77dd33));

    // R+ : expulsions can also cough up a healing virus only the caster can take.
    if (inf.owner === 'player' && this.arena.hasUpgrade('r') && Math.random() < HEAL_VIRUS_CHANCE) {
      const ang = Math.random() * Math.PI * 2;
      const fx = Phaser.Math.Clamp(t.x + Math.cos(ang) * 80, 20, scene.scale.width - 20);
      const fy = Phaser.Math.Clamp(t.y + Math.sin(ang) * 80, 20, scene.scale.height - 20);
      this.spawnFloorVirus(t.x, t.y, fx, fy, inf.owner, 0, true, time);
    }
  }

  private spawnFloorVirus(fromX: number, fromY: number, x: number, y: number, owner: Owner, dmg: number, healing: boolean, time: number): void {
    const { scene } = this.arena;
    let tri: VirusBody;
    if (this.monkey(owner)) {
      // A spike-factory pile: always lands point-up, so no spin.
      tri = buildSpikePile(scene, healing).setPosition(fromX, fromY).setDepth(4);
    } else {
      const color = this.col(owner)(healing ? 0x22ee55 : owner === 'player' ? 0x99cc22 : 0xcc8833);
      const capsid = scene.add.triangle(fromX, fromY, 0, -8, 7, 6, -7, 6, color, 0.9).setDepth(4);
      capsid.setStrokeStyle(1.5, healing ? this.col(owner)(0xaaffcc) : this.col(owner)(0xddffaa), 0.8);
      capsid.setRotation(Math.random() * Math.PI * 2);
      tri = capsid;
    }
    scene.tweens.add({ targets: tri, x, y, duration: 180, ease: 'Cubic.out' });
    if (healing) {
      scene.tweens.add({ targets: tri, alpha: 0.55, yoyo: true, repeat: -1, duration: 420 });
    }
    this.floorViruses.push({ tri, owner, x, y, dmg, expiresAt: time + FLOOR_VIRUS_LIFESPAN, healing });
  }

  private updateFloorViruses(time: number): void {
    for (let i = this.floorViruses.length - 1; i >= 0; i--) {
      const fv = this.floorViruses[i];
      if (time >= fv.expiresAt) {
        fv.tri.destroy();
        this.floorViruses.splice(i, 1);
        continue;
      }

      if (fv.healing) {
        const caster = this.fighterOf(fv.owner);
        if (caster.active && caster.hp > 0
            && Phaser.Math.Distance.Between(fv.x, fv.y, caster.x, caster.y) <= HEAL_VIRUS_PICKUP_RADIUS) {
          caster.heal(HEAL_VIRUS_AMOUNT);
          this.floatText(caster.x, caster.y - 30, `+${HEAL_VIRUS_AMOUNT} HP`, '#44ff77');
          // Viral Consumption (secret): digesting a healthy virus fires you up briefly.
          if (fv.owner === 'player' && this.hasSecret('viral-consumption')) {
            this.viralBoostUntil = time + VIRAL_BOOST_MS;
            this.floatText(caster.x, caster.y - 46, '🧬 +20% SPD/DMG', '#aaff66');
          }
          fv.tri.destroy();
          this.floorViruses.splice(i, 1);
        }
        continue;
      }

      for (const t of this.targetsOf(fv.owner)) {
        if (!t.active || t.hp <= 0) continue;
        if (Phaser.Math.Distance.Between(fv.x, fv.y, t.x, t.y) <= FLOOR_VIRUS_HIT_RADIUS + 16) {
          t.takeDamage(fv.dmg, { source: fv, sourceX: fv.x, sourceY: fv.y });
          this.arena.spawnHitFlash(t.x, t.y, this.col(fv.owner)(0x99cc22));
          this.registerDamage(fv.owner, t, fv.dmg);
          // Pandemic (secret): the dropped virus takes hold, so the victim starts dropping their own.
          if (fv.owner === 'player' && this.hasSecret('pandemic')) {
            this.infect(t, fv.owner, this.fighterBody, time, PANDEMIC_INFECT_MS);
          } else if (this.hasVirusPerk(fv.owner)) {
            // Virus perk: the strain on the floor is still live, so it reseeds the host it touches.
            this.infect(t, fv.owner, this.bodyFor(fv.owner), time, PERK_VIRUS_RESEED_MS);
          }
          fv.tri.destroy();
          this.floorViruses.splice(i, 1);
          break;
        }
      }
    }
  }

  // ── Spore Spray (F) ──────────────────────────────────────────────────

  private spraySpores(ox: number, oy: number, tx: number, ty: number, owner: Owner, srcBody: BodyState): void {
    const now = this.arena.scene.time.now;
    const aim = Math.atan2(ty - oy, tx - ox);
    // A spray, not a throw: hands forward along the aim, jetting spores out ahead.
    this.avatarOf(owner)?.play('sweep', aim);
    if (!this.monkey(owner)) this.fx(owner).sporeJet(ox, oy, aim, 90, 5, tonesFor(owner));
    const count = SPORE_COUNT + this.lvl(srcBody, 'gut-bacteria');
    const gutTier = this.lvl(srcBody, 'gut-bacteria');
    const spikedTier = this.lvl(srcBody, 'spiked-spores');
    for (let i = 0; i < count; i++) {
      const spread = (i - (count - 1) / 2) * (0.85 / Math.max(1, count - 1)) * 2;
      const dist = 68 + Math.random() * 26;
      const a = aim + spread;
      this.pendingSpores.push({
        x: ox + Math.cos(a) * dist,
        y: oy + Math.sin(a) * dist,
        owner, spikedTier, gutTier,
        spawnAt: now + i * SPORE_SPAWN_STAGGER,
      });
    }
  }

  private updatePendingSpores(time: number): void {
    for (let i = this.pendingSpores.length - 1; i >= 0; i--) {
      const p = this.pendingSpores[i];
      if (time < p.spawnAt) continue;
      this.pendingSpores.splice(i, 1);
      this.spawnSpore(p.x, p.y, p.owner, p.spikedTier, p.gutTier, time, !!p.noBlast);
    }
  }

  private spawnSpore(
    x: number, y: number, owner: Owner, spikedTier: number, gutTier: number, time: number, noBlast = false,
  ): void {
    if (this.spores.length >= SPORE_MAX_COUNT) return;
    const { scene } = this.arena;
    this.spores.push({
      gfx: scene.add.graphics().setDepth(5), owner, spikedTier, gutTier, x, y,
      hp: SPORE_BASE_HP, maxHp: SPORE_BASE_HP,
      spawnedAt: time, matured: false, noBlast,
    });
    // The sac isn't placed — it erupts out of the floor. (A bloon just appears, inflated.)
    if (this.monkey(owner)) return;
    this.fx(owner).ring(x, y, 3, 24, tonesFor(owner).lit, 340, 3, 4);
    this.fx(owner).motes(x, y, 4, { speed: 50, size: 2.2, life: 420, rise: 14, depth: 6, tones: tonesFor(owner) });
  }

  private sporeRadius(s: SporeWall): number {
    return 9 + Math.min(26, (s.maxHp - SPORE_BASE_HP) * 0.16 + s.hp * 0.06);
  }

  private updateSpores(time: number, delta: number): void {
    const dt = delta / 1000;
    for (let i = this.spores.length - 1; i >= 0; i--) {
      const s = this.spores[i];
      const age = time - s.spawnedAt;

      if (age >= SPORE_LIFESPAN || s.hp <= 0) {
        if (s.hp <= 0 && this.monkey(s.owner)) {
          this.monkeyAnims.pop(s.x, s.y, this.sporeRadius(s), bloonColor(1));
        } else if (s.hp <= 0) {
          // A popped sac dumps its contents; one that simply timed out just dries up.
          this.arena.spawnHitFlash(s.x, s.y, this.col(s.owner)(GROWTH.lime));
          this.fx(s.owner).burst(s.x, s.y, this.sporeRadius(s) * 2.4, {
            pods: 8, haze: 1, duration: 340, tones: tonesFor(s.owner),
          });
        }
        s.gfx.destroy();
        this.spores.splice(i, 1);
        continue;
      }

      // Growth: +rate max HP and HP per second until mature.
      if (age < SPORE_GROW_MS) {
        const rate = SPORE_GROW_RATE + 5 * s.gutTier;
        s.maxHp += rate * dt;
        s.hp = Math.min(s.maxHp, s.hp + rate * dt);
      } else if (!s.matured) {
        s.matured = true;
        // F+ Spore Cloud: a matured spore may bud a fresh one nearby.
        if (s.owner === 'player' && this.arena.hasUpgrade('f') && Math.random() < 0.25) {
          const ang = Math.random() * Math.PI * 2;
          this.spawnSpore(s.x + Math.cos(ang) * 34, s.y + Math.sin(ang) * 34, s.owner, s.spikedTier, s.gutTier, time);
          this.floatText(s.x, s.y - 20, '🍄 Spore Cloud', '#88ee66');
        }
      }

      // Crawling Spores (secret): the colony creeps toward whoever is nearest.
      if (s.owner === 'player' && this.hasSecret('crawling-spores')) {
        const prey = this.nearestOf(s.x, s.y, this.targetsOf(s.owner));
        if (prey) {
          const d = Phaser.Math.Distance.Between(s.x, s.y, prey.x, prey.y) || 1;
          s.x += ((prey.x - s.x) / d) * CRAWL_SPEED * dt;
          s.y += ((prey.y - s.y) / d) * CRAWL_SPEED * dt;
        }
      }

      const radius = this.sporeRadius(s);
      s.gfx.clear();
      s.gfx.setAlpha(age > SPORE_LIFESPAN - 1000 ? (SPORE_LIFESPAN - age) / 1000 : 1);
      if (this.monkey(s.owner)) {
        // A bloon: its colour is its health, so a hit that drops a layer pops one off.
        const layer = bloonLayer(s.hp);
        if (s.bloonLayer !== undefined && layer < s.bloonLayer) {
          this.monkeyAnims.pop(s.x, s.y, radius * 0.8, bloonColor(s.bloonLayer * 25 + 1), 220);
        }
        s.bloonLayer = layer;
        drawBloon(s.gfx, s.x, s.y, radius, time / 1000, s.hp, s.spikedTier > 0);
      } else GrowthFx.drawSporeWall(
        s.gfx, this.col(s.owner), tonesFor(s.owner), s.x, s.y, radius,
        time / 1000, Math.min(1, age / SPORE_GROW_MS), Phaser.Math.Clamp(s.hp / s.maxHp, 0, 1),
        s.spikedTier > 0,
      );

      // Eat opposing arena projectiles on contact.
      for (const child of this.arena.projectiles.getChildren()) {
        const p = child as Projectile;
        if (!p.active) continue;
        const isOpposing = s.owner === 'player' ? !p.isFromPlayer : p.isFromPlayer;
        if (!isOpposing) continue;
        const body = p.body as Phaser.Physics.Arcade.Body;
        const projRadius = body.isCircle ? body.radius : Math.max(body.halfWidth, body.halfHeight);
        if (Phaser.Math.Distance.Between(p.x, p.y, s.x, s.y) <= radius + projRadius) {
          this.absorbProjectileIntoSpore(s, p.damage);
          p.setActive(false).setVisible(false);
          body.stop();
        }
      }

      // Body-block enemy fighters: shove them back out of the wall.
      for (const t of this.targetsOf(s.owner)) {
        if (!t.active || t.hp <= 0) continue;
        if (t.soulWalking) continue; // Bind's Blackened Eyes walks through.
        const d = Phaser.Math.Distance.Between(s.x, s.y, t.x, t.y);
        const minD = radius + SPORE_BLOCK_PAD;
        if (d < minD && d > 0.001) {
          const nx = (t.x - s.x) / d, ny = (t.y - s.y) / d;
          (t.body as Phaser.Physics.Arcade.Body).reset(s.x + nx * minD, s.y + ny * minD);
        }
      }
    }
    this.separateCrawlingSpores(delta);
  }

  /** Crawling spores are solid to each other — they jostle apart instead of stacking up. */
  private separateCrawlingSpores(delta: number): void {
    if (!this.hasSecret('crawling-spores')) return;
    const dt = delta / 1000;
    for (let i = 0; i < this.spores.length; i++) {
      const a = this.spores[i];
      if (a.owner !== 'player') continue;
      for (let j = i + 1; j < this.spores.length; j++) {
        const b = this.spores[j];
        if (b.owner !== 'player') continue;
        const dx = b.x - a.x, dy = b.y - a.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        const minD = this.sporeRadius(a) + this.sporeRadius(b);
        if (d >= minD || d < 0.001) continue;
        const step = Math.min((minD - d) * 0.5, CRAWL_PUSH * dt);
        const nx = dx / d, ny = dy / d;
        a.x -= nx * step; a.y -= ny * step;
        b.x += nx * step; b.y += ny * step;
        a.gfx.setPosition(a.x, a.y);
        b.gfx.setPosition(b.x, b.y);
      }
    }
  }

  private absorbProjectileIntoSpore(s: SporeWall, damage: number): void {
    s.hp -= damage;
    this.arena.spawnHitFlash(s.x, s.y, this.col(s.owner)(0x66dd44));
    if (s.owner === 'player') this.arena.recordMasteryStat('sporeBlocks', 1);
    if (s.spikedTier > 0) {
      this.sporeSpikeAccum[s.owner] += damage;
      while (this.sporeSpikeAccum[s.owner] >= SPIKED_SPORE_THRESHOLD) {
        this.sporeSpikeAccum[s.owner] -= SPIKED_SPORE_THRESHOLD;
        const victim = this.nearestOf(s.x, s.y, this.targetsOf(s.owner));
        if (victim) {
          const dmg = 2 * s.spikedTier;
          victim.takeDamage(dmg);
          this.arena.spawnHitFlash(victim.x, victim.y, this.col(s.owner)(0xaaff44));
          this.floatText(victim.x, victim.y - 26, `🌵 ${dmg}`, '#aaff66');
          this.registerDamage(s.owner, victim, dmg);
        }
      }
    }
  }

  /** Kit-internal projectiles (bacteria/viruses) also get stopped by opposing spore walls. */
  private hitOpposingSpore(owner: Owner, x: number, y: number, dmg: number): boolean {
    // Plague Pal — Shell: the pet's body is a wall too.
    if (owner === 'npc' && this.palCatchAt(x, y, 6, dmg)) return true;
    for (const s of this.spores) {
      if (s.owner === owner) continue;
      if (Phaser.Math.Distance.Between(x, y, s.x, s.y) <= this.sporeRadius(s) + 6) {
        this.absorbProjectileIntoSpore(s, dmg);
        return true;
      }
    }
    return false;
  }

  // ── DNA accumulation ─────────────────────────────────────────────────

  private registerDamage(owner: Owner, target: Fighter, amount: number): void {
    if (amount <= 0) return;
    const map = owner === 'player' ? this.playerDmgAccum : this.npcDmgAccum;
    let total = (map.get(target) ?? 0) + amount;
    const threshold = this.dnaThreshold(owner);
    while (total >= threshold) {
      total -= threshold;
      this.spawnDnaStrand(target.x, target.y, owner);
    }
    map.set(target, total);
  }

  /**
   * A strand precipitates where the damage landed and flies straight into its owner's bank —
   * nothing lies on the floor, nothing has to be walked to, nothing rots. The flight chases the
   * owner's live position so a moving fighter is still met.
   */
  private spawnDnaStrand(x: number, y: number, owner: Owner): void {
    const { scene } = this.arena;
    const sx = x + (Math.random() * 30 - 15);
    const sy = y + (Math.random() * 30 - 15);
    const gfx = scene.add.text(sx, sy, this.monkey(owner) ? '🧪' : '🧬', { fontSize: '16px' }).setOrigin(0.5).setDepth(9);
    const home = owner === 'player' ? this.arena.player : this.arena.npc;
    const flight = { t: 0 };
    const finish = () => {
      const i = this.dnaStrands.findIndex((s) => s.gfx === gfx);
      if (i >= 0) this.dnaStrands.splice(i, 1);
      gfx.destroy();
      this.addDna(owner, 1);
    };
    const tween = scene.tweens.add({
      targets: flight, t: 1, duration: DNA_FLIGHT_MS, ease: 'Cubic.in',
      onUpdate: () => {
        if (!gfx.active) return;
        const k = flight.t;
        gfx.setPosition(sx + (home.x - sx) * k, sy + (home.y - 8 - sy) * k);
        gfx.setScale(1 - 0.5 * k);
      },
      onComplete: finish,
    });
    this.dnaStrands.push({ gfx, tween });
  }

  private addDna(owner: Owner, amount: number): void {
    // Memory's Rebirth: no DNA while the passive is sealed.
    if ((owner === 'player' ? this.arena.player : this.arena.npc).passivesSealed()) return;
    // Mitosis (secret): the strand copies itself on the way in.
    if (owner === 'player' && this.hasSecret('mitosis') && Math.random() < MITOSIS_CHANCE) {
      amount *= 2;
      this.floatText(this.arena.player.x, this.arena.player.y - 36, '🧬 MITOSIS', '#66ffcc');
    }
    // Plague Pal — Jelly Membrane: the pet's goo copies strands too.
    if (owner === 'player' && this.palOn() && Math.random() < 0.08 * this.palTier('jelly-membrane')) {
      amount *= 2;
    }
    // Ruin's Combo Breaker halves every meter in the game — the DNA bar included.
    amount = meterGain(owner === 'player' ? this.arena.player : this.arena.npc, amount);
    if (owner === 'player') this.playerDna = Math.min(DNA_CAP, this.playerDna + amount);
    else this.npcDna = Math.min(DNA_CAP, this.npcDna + amount);
  }

  /** Floating DNA helix above the NPC's head — the player's own DNA lives on the HUD bar. */
  private drawDnaBar(): void {
    if (this.arena.npcElementId !== 'growth') {
      if (this.npcDnaBarGfx) this.npcDnaBarGfx.clear();
      return;
    }
    const fighter = this.arena.npc;
    let g = this.npcDnaBarGfx;
    if (!g) {
      g = this.arena.scene.add.graphics().setDepth(10);
      this.npcDnaBarGfx = g;
    }
    g.clear();
    const w = 46;
    const bx = fighter.x - w / 2;
    const by = fighter.y - 27;
    g.fillStyle(0x061208, 0.78);
    g.fillRoundedRect(bx - 3, by - 5, w + 6, 10, 4);
    g.lineStyle(1, 0x2f6a44, 0.9);
    g.strokeRoundedRect(bx - 3, by - 5, w + 6, 10, 4);
    if (this.monkey('npc')) {
      g.clear();
      drawBloontoniumGauge(g, bx + 6, by, w - 12, 4, this.npcDna / DNA_CAP, this.arena.scene.time.now);
    } else {
      drawDnaHelix(g, bx, by, w, 3.2, this.npcDna / DNA_CAP, this.arena.scene.time.now, 7, 1);
    }
  }

  /** DNA gauge pinned to the HUD, just below the top-of-screen HP bar (player only) — a
   *  double-helix growth chart: each collected strand lights one more base-pair rung. */
  private drawDnaHudBar(): void {
    if (this.arena.elementId !== 'growth') {
      if (this.dnaHudBarGfx) { this.dnaHudBarGfx.destroy(); this.dnaHudBarGfx = null; }
      if (this.dnaHudBarText) { this.dnaHudBarText.destroy(); this.dnaHudBarText = null; }
      return;
    }
    const { scene, width } = this.arena;
    const barW = this.arena.hpBarW;
    const barH = 16;
    const barY = this.arena.hpBarY + this.arena.hpBarH / 2 + 11;
    const left = width / 2 - barW / 2;
    if (!this.dnaHudBarGfx) {
      this.dnaHudBarGfx = scene.add.graphics().setDepth(20);
      this.dnaHudBarText = scene.add
        .text(width / 2, barY + barH / 2 + 7, '', {
          fontSize: '11px',
          fontFamily: FONT_DISPLAY,
          color: '#c8ffe6',
          stroke: '#04140a',
          strokeThickness: 4,
        })
        .setOrigin(0.5)
        .setDepth(22);
    }
    const g = this.dnaHudBarGfx;
    const now = scene.time.now;
    const frac = Math.min(1, this.playerDna / DNA_CAP);
    const full = frac >= 1;
    g.clear();

    if (this.monkey('player')) {
      drawBloontoniumGauge(g, left, barY, barW, barH, frac, now, DNA_CAP);
      if (this.dnaHudBarText) {
        const bodyTag = this.fighterBody.isCloneBody ? '  \u00B7 CLONE BODY' : '';
        this.dnaHudBarText.setText(`BLOONTONIUM ${this.playerDna} / ${DNA_CAP}${bodyTag}`);
        this.dnaHudBarText.setColor(full ? '#e0ffd0' : '#9dff6a');
      }
      return;
    }

    // Specimen-slide backing plate: dark glass with a lab-chart grid and bevelled rim.
    const px = left - 10, py = barY - barH / 2 - 4, pw = barW + 20, ph = barH + 8;
    g.fillStyle(0x000000, 0.35);
    g.fillRoundedRect(px + 2, py + 3, pw, ph, 7);
    g.fillStyle(0x07160d, 0.94);
    g.fillRoundedRect(px, py, pw, ph, 7);
    g.lineStyle(1, 0x173a24, 0.8);
    for (let gx = left; gx <= left + barW; gx += barW / DNA_CAP) {
      g.lineBetween(gx, py + 3, gx, py + ph - 3);
    }
    g.lineBetween(left, barY, left + barW, barY);
    // Glass sheen across the top half.
    g.fillStyle(0xffffff, 0.05);
    g.fillRoundedRect(px + 3, py + 2, pw - 6, ph / 2 - 2, 5);
    const rim = full ? lerpColor(0x44ffaa, 0xeaffd0, 0.5 + 0.5 * Math.sin(now / 160)) : 0x3f8a5c;
    g.lineStyle(2, rim, 1);
    g.strokeRoundedRect(px, py, pw, ph, 7);
    g.lineStyle(1, 0x0b2a16, 1);
    g.strokeRoundedRect(px + 2, py + 2, pw - 4, ph - 4, 5);

    // The helix itself.
    drawDnaHelix(g, left, barY, barW, barH / 2 - 1, frac, now, 9, 2);

    // Strand caps: little nucleus end-knobs at each end of the chart.
    for (const ex of [px + 3, px + pw - 3]) {
      g.fillStyle(0x0b2a16, 1);
      g.fillCircle(ex, barY, 5);
      g.fillStyle(full ? 0x9cffcf : 0x44ddaa, 1);
      g.fillCircle(ex, barY, 3);
      g.fillStyle(0xffffff, 0.6);
      g.fillCircle(ex - 1, barY - 1, 1.2);
    }

    if (full) {
      // Ready to evolve: a soft pulse over the whole chart.
      const pulse = 0.5 + 0.5 * Math.sin(now / 200);
      g.lineStyle(3, 0x66ffbb, 0.18 + pulse * 0.22);
      g.strokeRoundedRect(px - 3, py - 3, pw + 6, ph + 6, 9);
    }

    if (this.dnaHudBarText) {
      const bodyTag = this.fighterBody.isCloneBody ? '  \u00B7 CLONE BODY' : '';
      this.dnaHudBarText.setText(`DNA ${this.playerDna} / ${DNA_CAP}${bodyTag}`);
      this.dnaHudBarText.setColor(full ? '#eaffd0' : '#c8ffe6');
    }
  }

  // ── Sweating charges + pips ──────────────────────────────────────────

  private updateSweatCharges(time: number): void {
    const b = this.fighterBody;
    if (this.lvl(b, 'sweating') <= 0) return;
    const p = this.arena.player;
    const rCd = BASE_COOLDOWNS['growth-virus'] * p.cooldownMult * this.cdFactor('growth-virus', b);
    const fCd = BASE_COOLDOWNS['spore-spray'] * p.cooldownMult * this.cdFactor('spore-spray', b);
    if (b.sweatR < SWEAT_MAX_CHARGES) {
      if (b.sweatRStart === 0) b.sweatRStart = time;
      if (time - b.sweatRStart >= rCd) {
        b.sweatR++;
        b.sweatRStart = b.sweatR < SWEAT_MAX_CHARGES ? time : 0;
      }
    }
    if (b.sweatF < SWEAT_MAX_CHARGES) {
      if (b.sweatFStart === 0) b.sweatFStart = time;
      if (time - b.sweatFStart >= fCd) {
        b.sweatF++;
        b.sweatFStart = b.sweatF < SWEAT_MAX_CHARGES ? time : 0;
      }
    }
  }

  /** Charge pips over the R/F cards on the reload bar while Sweating is owned. */
  private drawChargePips(): void {
    const owned = this.arena.elementId === 'growth' && this.lvl(this.fighterBody, 'sweating') > 0;
    if (!owned) {
      if (this.chargePips.length > 0) {
        for (const p of this.chargePips) p.destroy();
        this.chargePips = [];
      }
      return;
    }
    if (this.chargePips.length === 0) {
      const bars = this.arena.abilityBars;
      for (const abilityId of ['growth-virus', 'spore-spray']) {
        const entry = bars.find((e) => e.abilityId === abilityId);
        if (!entry) continue;
        for (let i = 0; i < SWEAT_MAX_CHARGES; i++) {
          const pip = this.arena.scene.add.circle(
            entry.fill.x + entry.maxWidth - 10 - i * 10,
            entry.fill.y - entry.fill.height / 2 + 7,
            3.5, 0x335522, 1,
          ).setStrokeStyle(1, 0xaaff66, 0.9).setDepth(24) as Phaser.GameObjects.Arc;
          (pip as Phaser.GameObjects.Arc & { pipMeta?: { abilityId: string; idx: number } }).pipMeta = { abilityId, idx: i };
          this.chargePips.push(pip);
        }
      }
    }
    const b = this.fighterBody;
    for (const pip of this.chargePips) {
      const meta = (pip as Phaser.GameObjects.Arc & { pipMeta?: { abilityId: string; idx: number } }).pipMeta;
      if (!meta) continue;
      const charges = meta.abilityId === 'growth-virus' ? b.sweatR : b.sweatF;
      pip.setFillStyle(meta.idx < charges ? 0xaaff66 : 0x335522, 1);
    }
  }

  // ── Chitin Shell ─────────────────────────────────────────────────────

  private updateChitin(time: number): void {
    // Fighter-hosted body
    const fb = this.fighterBody;
    if (this.lvl(fb, 'chitin-shell') > 0) {
      const p = this.arena.player;
      if (fb.chitinUp && p.shieldHp <= 0) {
        fb.chitinUp = false;
        fb.chitinDownAt = time;
        this.floatText(p.x, p.y - 40, '💔 Chitin shattered', '#cc8855');
        this.applyFighterTint();
      } else if (!fb.chitinUp && time - fb.chitinDownAt >= CHITIN_REGEN_MS) {
        fb.chitinUp = true;
        p.shieldHp += CHITIN_SHIELD_HP;
        this.floatText(p.x, p.y - 40, '🛡 Chitin regrown', '#ddaa66');
        this.applyFighterTint();
      }
    }
    // Clone-hosted bodies
    for (const c of this.clones) {
      if (this.lvl(c.body, 'chitin-shell') <= 0) continue;
      if (c.body.chitinUp && c.shieldHp <= 0) {
        c.body.chitinUp = false;
        c.body.chitinDownAt = time;
        this.applyCloneTint(c);
      } else if (!c.body.chitinUp && time - c.body.chitinDownAt >= CHITIN_REGEN_MS) {
        c.body.chitinUp = true;
        c.shieldHp += CHITIN_SHIELD_HP;
        this.applyCloneTint(c);
      }
    }
  }

  // ── Spiked Shell contact damage ──────────────────────────────────────

  private updateContactDamage(time: number): void {
    const fb = this.fighterBody;
    const tier = this.lvl(fb, 'spiked-shell');
    if (tier > 0 && this.arena.elementId === 'growth') {
      const p = this.arena.player;
      this.tickContact(p.x, p.y, 22 * p.sizeMult, tier, 'player', this.fighterContactNext, time);
    }
    for (const c of this.clones) {
      const cloneTier = this.lvl(c.body, 'spiked-shell');
      if (cloneTier > 0) {
        this.tickContact(c.sprite.x, c.sprite.y, CLONE_HIT_RADIUS, cloneTier, c.owner, c.contactNext, time);
      }
    }
  }

  private tickContact(x: number, y: number, radius: number, tier: number, owner: Owner, nextMap: Map<Fighter, number>, time: number): void {
    for (const t of this.targetsOf(owner)) {
      if (!t.active || t.hp <= 0) continue;
      if (Phaser.Math.Distance.Between(x, y, t.x, t.y) > radius + CONTACT_RADIUS_PAD) continue;
      if (time < (nextMap.get(t) ?? 0)) continue;
      nextMap.set(t, time + CONTACT_TICK_MS);
      const dmg = 5 * tier;
      t.takeDamage(dmg);
      this.arena.spawnHitFlash(t.x, t.y, this.col(owner)(0x8a5a2b));
      this.registerDamage(owner, t, dmg);
    }
  }

  // ── Nest / Clone / Puddle ────────────────────────────────────────────

  private updateNests(time: number, delta: number): void {
    for (let i = this.nests.length - 1; i >= 0; i--) {
      const n = this.nests[i];
      n.hp = Math.min(NEST_MAX_HP, n.hp + (NEST_HEAL_PER_SEC * delta) / 1000);
      const ratio = n.hp / NEST_MAX_HP;
      const grow = Math.min(1, (time - n.spawnAt) / 300);
      n.gfx.clear();
      GrowthFx.drawNest(
        n.gfx, this.col(n.owner), tonesFor(n.owner),
        n.x, n.y, (12 + ratio * 14) * grow, time / 1000, ratio,
      );
      if (n.hp >= NEST_MAX_HP) {
        n.gfx.destroy();
        this.nests.splice(i, 1);
        // Hatching splits the sac open.
        this.fx(n.owner).burst(n.x, n.y, 66, { pods: 12, haze: 2, duration: 460, tones: tonesFor(n.owner) });
        this.spawnClone(n.x, n.y, n.owner, n.inheritLevels);
      }
    }
  }

  private spawnClone(x: number, y: number, owner: Owner, inheritLevels: Record<string, number> | null): void {
    const { scene } = this.arena;
    const caster = this.fighterOf(owner);
    const sprite = scene.add.sprite(x, y, 'elem-growth').setScale(caster.scale).setDepth(5);
    const body = this.freshBody(true, inheritLevels ?? {});
    if (owner === 'player' && this.arena.hasUpgrade('q')) {
      const variants: CloneVariant[] = ['yellow', 'blue', 'red'];
      body.variant = variants[Math.floor(Math.random() * variants.length)];
    }
    const maturity = body.levels[GROWTH_CLONE_MATURITY_ID] ?? 0;
    const maxHp = CLONE_BASE_MAX_HP + GROWTH_CLONE_MATURITY_HP_PER_TIER * maturity;
    const healthBar = new HealthBar(scene, maxHp);
    healthBar.update(x, y, maxHp);
    const clone: Clone = {
      sprite, healthBar, hp: maxHp, maxHp,
      shieldHp: body.chitinUp ? CHITIN_SHIELD_HP : 0,
      owner, body,
      lastClickAt: 0, lastVirusAt: 0, lastSporeAt: 0,
      strafeDir: Math.random() < 0.5 ? 1 : -1, nextStrafeDirChangeAt: 0,
      contactNext: new Map(),
      chitinRing: null,
    };
    this.clones.push(clone);
    this.applyCloneTint(clone);
    this.floatText(caster.x, caster.y - 40, '🧬 Clone hatched!', '#88bb22');
  }

  private updateClones(time: number, delta: number): void {
    for (let i = this.clones.length - 1; i >= 0; i--) {
      const c = this.clones[i];
      if (c.hp <= 0) {
        this.arena.spawnHitFlash(c.sprite.x, c.sprite.y, this.col(c.owner)(GROWTH.lime));
        // A dying clone doesn't pop — it liquefies into the soup it leaves behind.
        this.fx(c.owner).burst(c.sprite.x, c.sprite.y, 80, {
          pods: 14, haze: 3, duration: 520, tones: tonesFor(c.owner),
        });
        this.spawnSoupPuddle(c.sprite.x, c.sprite.y, c.owner, c.body.levels);
        this.destroyCloneVisuals(c);
        this.clones.splice(i, 1);
        continue;
      }

      const targets = this.targetsOf(c.owner);
      const target = this.nearestOf(c.sprite.x, c.sprite.y, targets);
      if (target) {
        const d = Phaser.Math.Distance.Between(c.sprite.x, c.sprite.y, target.x, target.y);
        const speed = c.body.variant === 'yellow' ? CLONE_SPEED * VARIANT_SPEED_MULT : CLONE_SPEED;
        const nx = (target.x - c.sprite.x) / (d || 1), ny = (target.y - c.sprite.y) / (d || 1);

        if (time > c.nextStrafeDirChangeAt) {
          c.strafeDir *= -1;
          c.nextStrafeDirChangeAt = time + Phaser.Math.Between(1200, 2800);
        }

        let mx: number, my: number, moveSpeed: number;
        if (d > CLONE_ENGAGE_RANGE) {
          mx = nx; my = ny; moveSpeed = speed;
        } else if (d < CLONE_RETREAT_RANGE) {
          mx = -nx; my = -ny; moveSpeed = speed;
        } else {
          mx = -ny * c.strafeDir; my = nx * c.strafeDir; moveSpeed = speed * CLONE_STRAFE_SPEED_MULT;
        }
        c.sprite.x += mx * moveSpeed * delta / 1000;
        c.sprite.y += my * moveSpeed * delta / 1000;

        // Ability cadence: viruses > spores in range > bacteria by default.
        const clickCd = CLONE_CLICK_COOLDOWN * this.cdFactor('growth-click', c.body);
        const virusCd = CLONE_VIRUS_COOLDOWN * this.cdFactor('growth-virus', c.body);
        const sporeCd = CLONE_SPORE_COOLDOWN * this.cdFactor('spore-spray', c.body);
        if (time - c.lastVirusAt >= virusCd) {
          c.lastVirusAt = time;
          this.launchVirus(c.sprite.x, c.sprite.y, target.x, target.y, c.owner, c.body);
        } else if (d <= CLONE_SPORE_CAST_RANGE && time - c.lastSporeAt >= sporeCd) {
          c.lastSporeAt = time;
          this.spraySpores(c.sprite.x, c.sprite.y, target.x, target.y, c.owner, c.body);
        } else if (time - c.lastClickAt >= clickCd) {
          c.lastClickAt = time;
          this.launchClickAttack(c.sprite.x, c.sprite.y, target.x, target.y, c.owner, c.body);
        }
      }

      // Incoming arena projectiles
      for (const child of this.arena.projectiles.getChildren()) {
        const p = child as Projectile;
        if (!p.active) continue;
        const isEnemyProjectile = c.owner === 'player' ? !p.isFromPlayer : p.isFromPlayer;
        if (!isEnemyProjectile) continue;
        if (Phaser.Math.Distance.Between(p.x, p.y, c.sprite.x, c.sprite.y) <= CLONE_HIT_RADIUS) {
          let dmg = p.damage;
          if (c.body.variant === 'blue') dmg *= VARIANT_DR_MULT;
          dmg *= 1 - 0.1 * this.lvl(c.body, 'thick-flesh');
          if (c.shieldHp > 0) {
            const absorbed = Math.min(c.shieldHp, dmg);
            c.shieldHp -= absorbed;
            dmg -= absorbed;
          }
          c.hp -= dmg;
          p.setActive(false).setVisible(false);
          (p.body as Phaser.Physics.Arcade.Body).stop();
          this.arena.spawnHitFlash(c.sprite.x, c.sprite.y, this.col(c.owner)(0xff4444));
          break;
        }
      }

      // Chitin ring visual
      if (this.lvl(c.body, 'chitin-shell') > 0 && c.body.chitinUp) {
        if (!c.chitinRing) {
          c.chitinRing = this.arena.scene.add.circle(c.sprite.x, c.sprite.y, 24, 0x000000, 0)
            .setStrokeStyle(3, this.col(c.owner)(CHITIN_TINT), 0.85).setDepth(6) as Phaser.GameObjects.Arc;
        }
        c.chitinRing.setPosition(c.sprite.x, c.sprite.y);
      } else if (c.chitinRing) {
        c.chitinRing.destroy();
        c.chitinRing = null;
      }

      c.healthBar.update(c.sprite.x, c.sprite.y, Math.max(0, c.hp), c.shieldHp);
    }
  }

  /** A dead clone melts into primordial soup that remembers its upgrades. */
  private spawnSoupPuddle(x: number, y: number, owner: Owner, levels: Record<string, number>): void {
    const { scene } = this.arena;
    const container = scene.add.container(x, y).setDepth(2);
    const base = scene.add.ellipse(0, 0, 62, 40, this.col(owner)(0x3f7a1f), 0.85);
    const blob1 = scene.add.ellipse(-18, 6, 26, 16, this.col(owner)(0x4f8a2a), 0.8);
    const blob2 = scene.add.ellipse(16, -8, 22, 14, this.col(owner)(0x356a18), 0.8);
    container.add([base, blob1, blob2]);
    // Random eyes staring out of the soup…
    for (let i = 0; i < 3; i++) {
      const ex = Phaser.Math.Between(-20, 20);
      const ey = Phaser.Math.Between(-12, 12);
      const white = scene.add.circle(ex, ey, 3.2, this.col(owner)(0xffffff), 0.95) as Phaser.GameObjects.Arc;
      const pupil = scene.add.circle(ex + Phaser.Math.Between(-1, 1), ey + Phaser.Math.Between(-1, 1), 1.4, this.col(owner)(0x111111), 1) as Phaser.GameObjects.Arc;
      container.add([white, pupil]);
    }
    // …and stray teeth.
    for (let i = 0; i < 4; i++) {
      const tx = Phaser.Math.Between(-22, 22);
      const ty = Phaser.Math.Between(-13, 13);
      const tooth = scene.add.triangle(tx, ty, 0, -4, 3, 3, -3, 3, this.col(owner)(0xf5f0dd), 0.95);
      tooth.setRotation(Math.random() * Math.PI * 2);
      container.add(tooth);
    }
    this.puddles.push({ container, x, y, owner, levels: { ...levels } });
    this.floatText(x, y - 24, '🍲 Primordial soup', '#77cc55');
  }

  // ── Evolve tree: buy / sell / UI ─────────────────────────────────────

  private closeEvolve(): void {
    this.evolveOpen = false;
    if (this.evolveGfx) { this.evolveGfx.destroy(); this.evolveGfx = null; }
    for (const l of this.evolveLabels) l.destroy();
    this.evolveLabels = [];
    this.evolveAreas = [];
  }

  /** Every tab the Evolve screen offers right now — the body tree, plus one per bound mastery tree. */
  private evolveTabs(): EvolveTab[] {
    const tabs: EvolveTab[] = ['body'];
    if (this.palOn()) tabs.push('pal');
    return tabs;
  }

  /** A mastery tree beside the body tree — today only Plague Pal's. */
  private sideTree(tab: SideTab): {
    nodes: GrowthNodeDef[];
    paths: { id: string; name: string; color: number }[];
    prereq: Record<string, string>;
    ultIds: string[];
    levels: Record<string, number>;
  } {
    void tab;
    return { nodes: GROWTH_PAL_NODES, paths: GROWTH_PAL_PATHS, prereq: GROWTH_PAL_ULTIMATE_PREREQ, ultIds: GROWTH_PAL_ULTIMATE_IDS, levels: this.palLevels };
  }

  /** Apex (secret) shaves DNA off third tiers and Ultimates in every tree. */
  private apexOwned(): boolean {
    return this.hasSecret('apex');
  }

  private renderEvolve(): void {
    if (this.evolveGfx) this.evolveGfx.destroy();
    for (const l of this.evolveLabels) l.destroy();
    this.evolveLabels = [];
    this.evolveAreas = [];
    if (this.monkey('player')) { this.renderMonkeyPanel(); return; }

    const { scene } = this.arena;
    const W = scene.scale.width, H = scene.scale.height;
    const gfx = scene.add.graphics().setDepth(40);
    this.evolveGfx = gfx;
    const body = this.fighterBody;

    gfx.fillStyle(0x000000, 0.78);
    gfx.fillRect(0, 0, W, H);

    const tabs = this.evolveTabs();
    const showTabs = tabs.length > 1;
    if (!tabs.includes(this.evolveTab)) this.evolveTab = 'body';
    const tab = this.evolveTab;
    const sideTab = tab !== 'body';

    const theme = tab === 'pal'
      ? { accent: 0x6a3a8a, bg: 0x0f0816, grid: 0x231430, band: 0x24102e, rim: 0xd9a8ff, title: '🦠 PLAGUE PAL', titleColor: '#d9a8ff' }
      : {
          accent: 0x4a8a2a, bg: 0x08140a, grid: 0x10261a, band: 0x0f2a16, rim: 0x9cffcf,
          title: body.isCloneBody ? '🧬 EVOLVE — CLONE BODY' : '🧬 EVOLVE',
          titleColor: body.isCloneBody ? '#ffcc88' : '#aaffcc',
        };

    const panelW = Math.min(660, W - 30);
    const panelX = W / 2 - panelW / 2;
    const panelY = 34;
    const colW = panelW / 3;
    const cardW = colW - 14;
    const cardH = 58;
    const rowGap = 64;
    const hasUltimateUpgrade = this.arena.hasUpgrade('e');
    const rows = hasUltimateUpgrade ? 5 : 4;
    const extraRows = sideTab ? 0
      : (body.isCloneBody ? 1 : 0) + (this.arena.masteryActive && this.secretRoll.length > 0 ? 1 : 0);
    const panelH = 66 + (showTabs ? 26 : 0) + rows * rowGap + extraRows * (rowGap + 10) + 34;

    const accent = theme.accent;
    const ppx = panelX - 10, ppy = panelY - 6, ppw = panelW + 20;
    // Drop shadow, then the chart sheet itself.
    gfx.fillStyle(0x000000, 0.45);
    gfx.fillRoundedRect(ppx + 4, ppy + 6, ppw, panelH, 14);
    gfx.fillStyle(theme.bg, 0.97);
    gfx.fillRoundedRect(ppx, ppy, ppw, panelH, 14);
    // Lab-chart graph paper: fine grid plus a heavier line every fifth cell.
    for (let gx = ppx + 12, i = 0; gx < ppx + ppw - 6; gx += 12, i++) {
      gfx.lineStyle(1, theme.grid, i % 5 === 0 ? 0.9 : 0.45);
      gfx.lineBetween(gx, ppy + 8, gx, ppy + panelH - 8);
    }
    for (let gy = ppy + 12, i = 0; gy < ppy + panelH - 6; gy += 12, i++) {
      gfx.lineStyle(1, theme.grid, i % 5 === 0 ? 0.9 : 0.45);
      gfx.lineBetween(ppx + 8, gy, ppx + ppw - 8, gy);
    }
    // Header band with a helix running behind the title.
    gfx.fillStyle(theme.band, 0.95);
    gfx.fillRoundedRect(ppx + 6, ppy + 4, ppw - 12, 40, 10);
    drawDnaHelix(gfx, ppx + 18, panelY + 20, ppw - 36, 9,
      sideTab ? 0 : Math.min(1, this.playerDna / DNA_CAP), 0, 11, 2);
    gfx.fillStyle(theme.band, 0.82);
    gfx.fillRoundedRect(W / 2 - 120, panelY - 2, 240, 42, 10);
    // Double rim — bright outer, dark inner bevel.
    gfx.lineStyle(3, accent, 1);
    gfx.strokeRoundedRect(ppx, ppy, ppw, panelH, 14);
    gfx.lineStyle(1, theme.rim, 0.35);
    gfx.strokeRoundedRect(ppx + 4, ppy + 4, ppw - 8, panelH - 8, 11);
    // Corner nucleus rivets.
    for (const [rx, ry] of [[ppx + 10, ppy + 10], [ppx + ppw - 10, ppy + 10], [ppx + 10, ppy + panelH - 10], [ppx + ppw - 10, ppy + panelH - 10]]) {
      gfx.fillStyle(accent, 1);
      gfx.fillCircle(rx, ry, 4);
      gfx.fillStyle(0xffffff, 0.45);
      gfx.fillCircle(rx - 1, ry - 1, 1.5);
    }

    const title = scene.add.text(W / 2, panelY + 10, theme.title, {
      fontSize: '18px', fontFamily: FONT_DISPLAY,
      color: theme.titleColor,
      stroke: '#020a04', strokeThickness: 5,
    }).setOrigin(0.5).setDepth(41);
    const dnaText = scene.add.text(W / 2, panelY + 30, `\u{1F9EC} DNA: ${this.playerDna}/${DNA_CAP}`, {
      fontSize: '13px', fontFamily: FONT_DISPLAY, color: '#66ffc4',
      stroke: '#020a04', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(41);
    this.evolveLabels.push(title, dnaText);

    let topY = panelY + 48;
    if (showTabs) {
      this.drawEvolveTabs(gfx, W, panelY + 50, tabs);
      topY += 26;
    }

    const bottomY = tab !== 'body'
      ? this.renderSideTree(tab, gfx, panelX, topY, colW, cardW, cardH, rowGap, hasUltimateUpgrade)
      : this.renderBodyTree(gfx, panelX, topY, colW, cardW, cardH, rowGap, hasUltimateUpgrade, W);

    const hint = scene.add.text(W / 2, bottomY + 2,
      showTabs
        ? 'Click: buy   Right-click: sell (needs Fast Evolution)   Click a tab to swap trees   [E] Close'
        : 'Click: buy   Right-click: sell (needs Fast Evolution)   SPACE: swap bodies   [E] Close', {
        fontSize: '11px', fontFamily: FONT_UI, color: '#bfe8cf', stroke: '#000000', strokeThickness: 3,
      }).setOrigin(0.5).setDepth(41);
    this.evolveLabels.push(hint);
  }

  /**
   * Monkey skin: the same trees, drawn as the monkeys' three-path upgrade panel — the dart
   * monkey's for the body, the Tack Shooter's for Plague Pal. Every cost, lock and click id is
   * computed exactly as the stock chart computes them, so `handleEvolveClick` and the buy/sell
   * rules run unchanged underneath it.
   */
  private renderMonkeyPanel(): void {
    const { scene } = this.arena;
    const W = scene.scale.width, H = scene.scale.height;
    const gfx = scene.add.graphics().setDepth(40);
    this.evolveGfx = gfx;
    const body = this.fighterBody;
    const tabList = this.evolveTabs();
    const showTabs = tabList.length > 1;
    if (!tabList.includes(this.evolveTab)) this.evolveTab = 'body';
    const tab = this.evolveTab;
    const side = tab !== 'body' ? this.sideTree(tab) : null;
    const palTab = tab === 'pal';
    const hasUlt = this.arena.hasUpgrade('e');
    const fastTier = this.lvl(body, 'fast-evolution');
    const apex = this.apexOwned();

    const levelOf = (id: string) => (side ? side.levels[id] ?? 0 : this.lvl(body, id));
    const nodes: GrowthNodeDef[] = side ? side.nodes : GROWTH_EVOLVE_NODES;
    const ultIds = side ? side.ultIds : GROWTH_EVOLVE_ULTIMATE_IDS;
    const prereqOf = (path: string) => (side
      ? side.prereq[path]
      : GROWTH_EVOLVE_ULTIMATE_PREREQ[path as keyof typeof GROWTH_EVOLVE_ULTIMATE_PREREQ]);
    const pathDefs: { id: string; name: string; color: number }[] = palTab
      ? TACK_PATH_ORDER.map((id) => GROWTH_PAL_PATHS.find((p) => p.id === id)!)
      : side ? side.paths
        : MONKEY_PATH_ORDER.map((id) => GROWTH_EVOLVE_PATHS.find((p) => p.id === id)!);
    const rename = (id: string) => (palTab ? TACK_NODES[id] : side ? undefined : MONKEY_NODES[id]);

    const paths: MonkeyPathView[] = pathDefs.map((path, pi) => {
      const prereqMaxed = levelOf(prereqOf(path.id)) >= GROWTH_EVOLVE_MAX_LEVEL;
      const tiers = nodes.filter((n) => n.path === path.id).sort((a, b) => a.row - b.row).map((node) => {
        const level = levelOf(node.id);
        const maxLevel = node.isUltimate ? 1 : GROWTH_EVOLVE_MAX_LEVEL;
        const cost = node.isUltimate
          ? growthEvolveUltimateCost(fastTier, apex)
          : growthEvolveNodeCost(level, node.row, fastTier, apex);
        const prereqLocked = !!node.isUltimate && level < maxLevel && !prereqMaxed;
        const otherChosen = !!node.isUltimate && level < maxLevel && prereqMaxed
          && ultIds.some((oid) => oid !== node.id && levelOf(oid) > 0);
        const m = rename(node.id);
        return {
          id: node.id,
          name: m?.name ?? node.name,
          desc: m?.desc ?? node.description,
          level, maxLevel, cost,
          lockText: prereqLocked ? '🔒 T4' : otherChosen ? '🔒' : null,
          isUltimate: !!node.isUltimate,
          offered: !node.isUltimate || hasUlt,
        };
      });
      return {
        key: palTab ? `tack-${path.id}` : side ? 'sick' : path.id,
        label: palTab ? ['TOP', 'MIDDLE', 'BOTTOM'][pi] : side ? path.name.toUpperCase() : MONKEY_PATH_LABEL[path.id],
        color: path.color,
        tiers,
      };
    });

    const extras: MonkeyExtraView[] = [];
    if (!side && body.isCloneBody) {
      const level = this.lvl(body, GROWTH_CLONE_MATURITY_ID);
      const maxed = level >= GROWTH_CLONE_MATURITY_MAX_LEVEL;
      extras.push({
        id: GROWTH_CLONE_MATURITY_ID, name: `Monkey Village ${level}/${GROWTH_CLONE_MATURITY_MAX_LEVEL}`,
        desc: GROWTH_CLONE_MATURITY_DESC.replace('clone bodies', 'sidekick monkeys'),
        costText: maxed ? 'MAX' : `${GROWTH_CLONE_MATURITY_COST} 🧪`,
        owned: maxed, affordable: !maxed && this.playerDna >= GROWTH_CLONE_MATURITY_COST,
      });
    }
    if (!side && this.arena.masteryActive) {
      for (const id of this.secretRoll) {
        const def = GROWTH_SECRET_UPGRADES.find((x) => x.id === id);
        if (!def) continue;
        const owned = this.secretOwned.has(id);
        extras.push({
          id: `__secret:${id}`, name: def.name, desc: def.description,
          costText: owned ? 'OWNED' : `${GROWTH_SECRET_COST} 🧪`,
          owned, affordable: !owned && this.playerDna >= GROWTH_SECRET_COST,
        });
      }
    }

    const tabLabel: Record<EvolveTab, string> = { body: '🐒 MONKEY', pal: '📌 TACKS' };
    const code = palTab
      ? TACK_PATH_ORDER.map((p) => this.sideTierOf('pal', p)).join('-')
      : MONKEY_PATH_ORDER.map((p) => this.pathTier(body, p)).join('-');
    const { labels, areas } = renderUpgradePanel(scene, gfx, W, H, {
      title: palTab ? 'TACK SHOOTER' : body.isCloneBody ? 'SIDEKICK MONKEY' : 'DART MONKEY',
      currency: this.playerDna, cap: DNA_CAP,
      tabs: showTabs ? tabList.map((id) => ({ id, label: tabLabel[id], on: id === tab })) : null,
      paths,
      extrasTitle: body.isCloneBody ? 'SIDEKICK' : 'MONKEY KNOWLEDGE',
      extras,
      hint: showTabs
        ? 'Click: buy   Right-click: sell (needs Super Monkey Fan Club)   Click a tab to swap   [E] Close'
        : 'Click: buy   Right-click: sell (needs Super Monkey Fan Club)   SPACE: swap monkeys   [E] Close',
      crosspath: code,
    });
    this.evolveLabels = labels;
    this.evolveAreas = areas;
  }

  /** Highest row bought on one path of a side tree, 0–5 (the Tack Shooter's crosspath code). */
  private sideTierOf(tab: SideTab, path: string): number {
    const tree = this.sideTree(tab);
    let tier = 0;
    for (const n of tree.nodes) if (n.path === path && (tree.levels[n.id] ?? 0) > 0) tier = Math.max(tier, n.row);
    return tier;
  }

  private drawEvolveTabs(gfx: Phaser.GameObjects.Graphics, W: number, y: number, ids: EvolveTab[]): void {
    const { scene } = this.arena;
    const tabW = 130, tabH = 22;
    const all: Record<EvolveTab, { label: string; color: number }> = {
      body: { label: '🧬 BODY', color: 0x4a8a2a },
      pal: { label: '🦠 PLAGUE PAL', color: 0x6a3a8a },
    };
    ids.forEach((id, i) => {
      const t = all[id];
      const cx = W / 2 + (i - (ids.length - 1) / 2) * (tabW + 8);
      const bx = cx - tabW / 2;
      const on = this.evolveTab === id;
      gfx.fillStyle(on ? t.color : 0x111611, on ? 0.95 : 0.85);
      gfx.fillRoundedRect(bx, y - tabH / 2, tabW, tabH, 11);
      if (on) {
        gfx.fillStyle(0xffffff, 0.14);
        gfx.fillRoundedRect(bx + 3, y - tabH / 2 + 2, tabW - 6, tabH / 2 - 2, 8);
      }
      gfx.lineStyle(2, t.color, on ? 1 : 0.5);
      gfx.strokeRoundedRect(bx, y - tabH / 2, tabW, tabH, 11);
      const lbl = scene.add.text(cx, y, t.label, {
        fontSize: '11px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif', color: on ? '#ffffff' : '#999999',
      }).setOrigin(0.5).setDepth(41);
      this.evolveLabels.push(lbl);
      this.evolveAreas.push({ id: `__tab:${id}`, x: bx, y: y - tabH / 2, w: tabW, h: tabH });
    });
  }

  /**
   * One upgrade card. Both trees draw identical cards, so the only thing that varies is
   * the pre-computed state handed in — level, cost and why (if at all) it is locked.
   */
  private drawNodeCard(
    gfx: Phaser.GameObjects.Graphics,
    node: GrowthNodeDef,
    cx: number, ny: number, cardW: number, cardH: number,
    state: { level: number; maxLevel: number; cost: number; prereqLocked: boolean; otherChosenLocked: boolean; pathColor: number },
  ): void {
    const { scene } = this.arena;
    const { level, maxLevel, cost, prereqLocked, otherChosenLocked, pathColor } = state;
    const maxed = level >= maxLevel;
    const lockedOut = prereqLocked || otherChosenLocked;
    const affordable = !maxed && !lockedOut && this.playerDna >= cost;

    const bx = cx - cardW / 2;
    const fillCol = node.isUltimate
      ? (maxed ? 0x554411 : lockedOut ? 0x2a2214 : 0x3a3018)
      : maxed ? 0x1e4d2a : level > 0 ? 0x1a3d22 : 0x14281a;
    const by = ny - cardH / 2;
    gfx.fillStyle(0x000000, 0.4);
    gfx.fillRoundedRect(bx + 2, by + 3, cardW, cardH, 8);
    gfx.fillStyle(fillCol, 0.97);
    gfx.fillRoundedRect(bx, by, cardW, cardH, 8);
    // Cell-membrane sheen and a faint nucleus in the lower-right corner.
    gfx.fillStyle(0xffffff, level > 0 ? 0.08 : 0.04);
    gfx.fillRoundedRect(bx + 3, by + 2, cardW - 6, cardH * 0.38, 6);
    gfx.fillStyle(pathColor, level > 0 ? 0.16 : 0.07);
    gfx.fillCircle(bx + cardW - 22, ny + 4, 14);
    // Path-colour spine down the left edge, like a gel-lane marker.
    gfx.fillStyle(node.isUltimate ? 0xffcc44 : pathColor, lockedOut ? 0.35 : level > 0 ? 1 : 0.6);
    gfx.fillRoundedRect(bx + 2, by + 6, 3, cardH - 12, 1.5);
    gfx.lineStyle(2, node.isUltimate ? 0xffcc44 : affordable ? pathColor : 0x3a5a3a, node.isUltimate || affordable ? 1 : 0.7);
    gfx.strokeRoundedRect(bx, by, cardW, cardH, 8);
    if (maxed) {
      gfx.lineStyle(1, 0xeaffd0, 0.5);
      gfx.strokeRoundedRect(bx + 2, by + 2, cardW - 4, cardH - 4, 6);
    }

    const nameLabel = scene.add.text(bx + 9, ny - cardH / 2 + 5, `${node.isUltimate ? '★ ' : ''}${node.name}`, {
      fontSize: '11px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
      color: node.isUltimate ? '#ffdd66' : '#eeffee',
    }).setOrigin(0, 0).setDepth(41);
    const costText = maxed ? 'MAX'
      : prereqLocked ? '🔒 T4'
      : otherChosenLocked ? '🔒'
      : `${cost}\u{1F9EC}`;
    const costLabel = scene.add.text(bx + cardW - 7, ny - cardH / 2 + 5, costText, {
      fontSize: '11px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
      color: maxed ? '#88ffaa' : lockedOut ? '#dd8888' : affordable ? '#ffee88' : '#997755',
    }).setOrigin(1, 0).setDepth(41);
    const descLabel = scene.add.text(bx + 9, ny - cardH / 2 + 21, node.description, {
      fontSize: '9px', fontFamily: FONT_UI, color: '#b4d6b8',
      wordWrap: { width: cardW - 40 }, maxLines: 3,
    }).setOrigin(0, 0).setDepth(41);
    this.evolveLabels.push(nameLabel, costLabel, descLabel);

    // Tier pips (bottom-right) — one base-pair rung per tier, lit in its pair colours.
    for (let t = 0; t < maxLevel; t++) {
      const px = bx + cardW - 10 - (maxLevel - 1 - t) * 10;
      const py = ny + cardH / 2 - 9;
      const on = t < level;
      const [ca, cb] = DNA_PAIRS[t % 2];
      gfx.lineStyle(2, on ? ca : 0x2a442a, 1);
      gfx.lineBetween(px, py - 5, px, py);
      gfx.lineStyle(2, on ? cb : 0x2a442a, 1);
      gfx.lineBetween(px, py, px, py + 5);
      gfx.fillStyle(on ? 0xeaffd0 : 0x3a5a3a, 1);
      gfx.fillCircle(px, py - 5, 1.6);
      gfx.fillCircle(px, py + 5, 1.6);
    }

    this.evolveAreas.push({ id: node.id, x: bx, y: ny - cardH / 2, w: cardW, h: cardH });
  }

  /** Returns the y the panel's content ended at, so the hint line can sit under it. */
  private renderBodyTree(
    gfx: Phaser.GameObjects.Graphics,
    panelX: number, topY: number, colW: number, cardW: number, cardH: number,
    rowGap: number, hasUltimateUpgrade: boolean, W: number,
  ): number {
    const { scene } = this.arena;
    const body = this.fighterBody;
    const fastTier = this.lvl(body, 'fast-evolution');
    const apex = this.apexOwned();

    GROWTH_EVOLVE_PATHS.forEach((path, colIdx) => {
      const cx = panelX + colW * colIdx + colW / 2;
      const cssColor = `#${path.color.toString(16).padStart(6, '0')}`;
      const pathLabel = scene.add.text(cx, topY, path.name.toUpperCase(), {
        fontSize: '13px', fontFamily: FONT_DISPLAY, color: cssColor, stroke: '#020a04', strokeThickness: 4,
      }).setOrigin(0.5).setDepth(41);
      this.evolveLabels.push(pathLabel);

      const prereqId = GROWTH_EVOLVE_ULTIMATE_PREREQ[path.id];
      const prereqMaxed = this.lvl(body, prereqId) >= GROWTH_EVOLVE_MAX_LEVEL;
      const nodes = GROWTH_EVOLVE_NODES
        .filter((n) => n.path === path.id && (!n.isUltimate || hasUltimateUpgrade))
        .sort((a, b) => a.row - b.row);

      nodes.forEach((node, rowIdx) => {
        const ny = topY + 18 + rowIdx * rowGap;
        const level = this.lvl(body, node.id);
        const maxLevel = node.isUltimate ? 1 : GROWTH_EVOLVE_MAX_LEVEL;
        const cost = node.isUltimate
          ? growthEvolveUltimateCost(fastTier, apex)
          : growthEvolveNodeCost(level, node.row, fastTier, apex);

        // Connector down to the next node — a little helix, lit once this tier is bought.
        if (rowIdx < nodes.length - 1) {
          drawDnaHelixV(gfx, cx, ny + cardH / 2, ny + rowGap - cardH / 2, 4, path.color, level > 0);
        }

        this.drawNodeCard(gfx, node, cx, ny, cardW, cardH, {
          level, maxLevel, cost,
          prereqLocked: !!node.isUltimate && level < maxLevel && !prereqMaxed,
          otherChosenLocked: !!node.isUltimate && level < maxLevel && prereqMaxed
            && GROWTH_EVOLVE_ULTIMATE_IDS.some((oid) => oid !== node.id && this.lvl(body, oid) > 0),
          pathColor: path.color,
        });
      });
    });

    const rows = hasUltimateUpgrade ? 5 : 4;
    let bottomY = topY + 18 + rows * rowGap;

    // Clone bodies get the pathless Physical Maturity node.
    if (body.isCloneBody) {
      const level = this.lvl(body, GROWTH_CLONE_MATURITY_ID);
      const maxed = level >= GROWTH_CLONE_MATURITY_MAX_LEVEL;
      const affordable = !maxed && this.playerDna >= GROWTH_CLONE_MATURITY_COST;
      const bx = W / 2 - cardW / 2;
      gfx.fillStyle(maxed ? 0x4d3a1e : 0x3a2c14, 0.96);
      gfx.fillRoundedRect(bx, bottomY - cardH / 2, cardW, cardH, 8);
      gfx.lineStyle(2, affordable ? 0xffaa55 : 0x7a5a3a, 1);
      gfx.strokeRoundedRect(bx, bottomY - cardH / 2, cardW, cardH, 8);
      const nameLabel = scene.add.text(bx + 7, bottomY - cardH / 2 + 5, `💪 ${GROWTH_CLONE_MATURITY_NAME}`, {
        fontSize: '11px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif', color: '#ffcc99',
      }).setOrigin(0, 0).setDepth(41);
      const costLabel = scene.add.text(bx + cardW - 7, bottomY - cardH / 2 + 5, maxed ? 'MAX' : `${GROWTH_CLONE_MATURITY_COST}\u{1F9EC}`, {
        fontSize: '11px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif', color: maxed ? '#88ffaa' : affordable ? '#ffee88' : '#997755',
      }).setOrigin(1, 0).setDepth(41);
      const descLabel = scene.add.text(bx + 7, bottomY - cardH / 2 + 21, GROWTH_CLONE_MATURITY_DESC, {
        fontSize: '9px', fontFamily: FONT_UI, color: '#ccaa88', wordWrap: { width: cardW - 40 }, maxLines: 3,
      }).setOrigin(0, 0).setDepth(41);
      this.evolveLabels.push(nameLabel, costLabel, descLabel);
      for (let t = 0; t < GROWTH_CLONE_MATURITY_MAX_LEVEL; t++) {
        const px = bx + cardW - 10 - (GROWTH_CLONE_MATURITY_MAX_LEVEL - 1 - t) * 10;
        const py = bottomY + cardH / 2 - 9;
        gfx.fillStyle(t < level ? 0xffaa55 : 0x443322, 1);
        gfx.fillCircle(px, py, 3.2);
      }
      this.evolveAreas.push({ id: GROWTH_CLONE_MATURITY_ID, x: bx, y: bottomY - cardH / 2, w: cardW, h: cardH });
      bottomY += rowGap + 10;
    }

    // Growth Mastery — Secret Upgrades: this match's two rolls, side by side.
    if (this.arena.masteryActive && this.secretRoll.length > 0) {
      // The clone row already leaves 10 more slack than the ultimate row does, so normalise
      // the two before carving out space for this section's header.
      const rowY = bottomY + (body.isCloneBody ? 0 : 10) + 8;
      const label = scene.add.text(W / 2, rowY - cardH / 2 - 12, 'SECRET UPGRADES', {
        fontSize: '10px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif', color: '#ccaaff',
      }).setOrigin(0.5).setDepth(41);
      this.evolveLabels.push(label);

      this.secretRoll.forEach((id, i) => {
        const def = GROWTH_SECRET_UPGRADES.find((s) => s.id === id);
        if (!def) return;
        const cx = W / 2 + (i - (this.secretRoll.length - 1) / 2) * (cardW + 12);
        const bx = cx - cardW / 2;
        const owned = this.secretOwned.has(id);
        const affordable = !owned && this.playerDna >= GROWTH_SECRET_COST;
        gfx.fillStyle(owned ? 0x33224d : 0x1e1633, 0.96);
        gfx.fillRoundedRect(bx, rowY - cardH / 2, cardW, cardH, 8);
        gfx.lineStyle(2, owned ? 0xbb99ff : affordable ? 0x8866cc : 0x443366, 1);
        gfx.strokeRoundedRect(bx, rowY - cardH / 2, cardW, cardH, 8);
        const nameLabel = scene.add.text(bx + 7, rowY - cardH / 2 + 5, `🧫 ${def.name}`, {
          fontSize: '11px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif', color: '#ddccff',
        }).setOrigin(0, 0).setDepth(41);
        const costLabel = scene.add.text(bx + cardW - 7, rowY - cardH / 2 + 5,
          owned ? 'OWNED' : `${GROWTH_SECRET_COST}\u{1F9EC}`, {
            fontSize: '11px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
            color: owned ? '#bb99ff' : affordable ? '#ffee88' : '#776699',
          }).setOrigin(1, 0).setDepth(41);
        const descLabel = scene.add.text(bx + 7, rowY - cardH / 2 + 21, def.description, {
          fontSize: '9px', fontFamily: FONT_UI, color: '#bbaacc',
          wordWrap: { width: cardW - 14 }, maxLines: 3,
        }).setOrigin(0, 0).setDepth(41);
        this.evolveLabels.push(nameLabel, costLabel, descLabel);
        this.evolveAreas.push({ id: `__secret:${id}`, x: bx, y: rowY - cardH / 2, w: cardW, h: cardH });
      });
      bottomY = rowY + cardH / 2 + 20;
    }

    return bottomY;
  }

  /** The Plague Pal tree — same cards and rules as the body tree, its own levels. */
  private renderSideTree(
    tab: SideTab,
    gfx: Phaser.GameObjects.Graphics,
    panelX: number, topY: number, colW: number, cardW: number, cardH: number,
    rowGap: number, hasUltimateUpgrade: boolean,
  ): number {
    const { scene } = this.arena;
    const tree = this.sideTree(tab);
    const fastTier = this.lvl(this.fighterBody, 'fast-evolution');
    const apex = this.apexOwned();

    tree.paths.forEach((path, colIdx) => {
      const cx = panelX + colW * colIdx + colW / 2;
      const cssColor = `#${path.color.toString(16).padStart(6, '0')}`;
      const pathLabel = scene.add.text(cx, topY, path.name.toUpperCase(), {
        fontSize: '13px', fontFamily: FONT_DISPLAY, color: cssColor, stroke: '#020a04', strokeThickness: 4,
      }).setOrigin(0.5).setDepth(41);
      this.evolveLabels.push(pathLabel);

      const prereqMaxed = (tree.levels[tree.prereq[path.id]] ?? 0) >= GROWTH_EVOLVE_MAX_LEVEL;
      const nodes = tree.nodes
        .filter((n) => n.path === path.id && (!n.isUltimate || hasUltimateUpgrade))
        .sort((a, b) => a.row - b.row);

      nodes.forEach((node, rowIdx) => {
        const ny = topY + 18 + rowIdx * rowGap;
        const level = tree.levels[node.id] ?? 0;
        const maxLevel = node.isUltimate ? 1 : GROWTH_EVOLVE_MAX_LEVEL;
        const cost = node.isUltimate
          ? growthEvolveUltimateCost(fastTier, apex)
          : growthEvolveNodeCost(level, node.row, fastTier, apex);

        if (rowIdx < nodes.length - 1) {
          drawDnaHelixV(gfx, cx, ny + cardH / 2, ny + rowGap - cardH / 2, 4, path.color, level > 0);
        }

        this.drawNodeCard(gfx, node, cx, ny, cardW, cardH, {
          level, maxLevel, cost,
          prereqLocked: !!node.isUltimate && level < maxLevel && !prereqMaxed,
          otherChosenLocked: !!node.isUltimate && level < maxLevel && prereqMaxed
            && tree.ultIds.some((oid) => oid !== node.id && (tree.levels[oid] ?? 0) > 0),
          pathColor: path.color,
        });
      });
    });

    return topY + 18 + (hasUltimateUpgrade ? 5 : 4) * rowGap;
  }

  private handleEvolveClick(px: number, py: number, isSell: boolean): void {
    for (const area of this.evolveAreas) {
      if (px < area.x || px > area.x + area.w || py < area.y || py > area.y + area.h) continue;
      const tab = this.evolveTab;
      if (area.id.startsWith('__tab:')) {
        if (!isSell) this.evolveTab = area.id.slice(6) as EvolveTab;
      } else if (area.id.startsWith('__secret:')) {
        if (isSell) {
          this.floatText(this.arena.player.x, this.arena.player.y - 30, 'Permanent — cannot sell', '#ff6666');
        } else {
          this.buySecretUpgrade(area.id.slice(9));
        }
      } else if (tab !== 'body') {
        if (isSell) this.sellSideNode(tab, area.id);
        else this.buySideNode(tab, area.id);
      } else if (isSell) {
        this.sellEvolveNode(area.id);
      } else {
        this.buyEvolveNode(area.id);
      }
      this.renderEvolve();
      return;
    }
  }

  // ── Plague Pal tree: buy / sell ─────────────────────────────────

  private buySideNode(tab: SideTab, id: string): void {
    const { player } = this.arena;
    const tree = this.sideTree(tab);
    const def = tree.nodes.find((n) => n.id === id);
    if (!def) return;
    const level = tree.levels[id] ?? 0;
    const fastTier = this.lvl(this.fighterBody, 'fast-evolution');
    const apex = this.apexOwned();

    if (def.isUltimate) {
      if (level > 0) return;
      if (!this.arena.hasUpgrade('e')) return;
      if ((tree.levels[tree.prereq[def.path]] ?? 0) < GROWTH_EVOLVE_MAX_LEVEL) {
        this.floatText(player.x, player.y - 30, 'Max Tier 4 first', '#ff6666');
        return;
      }
      if (tree.ultIds.some((oid) => oid !== id && (tree.levels[oid] ?? 0) > 0)) {
        this.floatText(player.x, player.y - 30, 'Already chose an Ultimate', '#ff6666');
        return;
      }
      const cost = growthEvolveUltimateCost(fastTier, apex);
      if (this.playerDna < cost) {
        this.floatText(player.x, player.y - 30, 'Not enough DNA', '#ff6666');
        return;
      }
      this.playerDna -= cost;
      tree.levels[id] = 1;
      this.onSideNodeChanged(tab, id);
      this.arena.recordMasteryStat('upgrades', 1);
      this.floatText(player.x, player.y - 30, `${def.name} unlocked!`, '#ffdd44');
      return;
    }

    if (level >= GROWTH_EVOLVE_MAX_LEVEL) return;
    const cost = growthEvolveNodeCost(level, def.row, fastTier, apex);
    if (this.playerDna < cost) {
      this.floatText(player.x, player.y - 30, 'Not enough DNA', '#ff6666');
      return;
    }
    this.playerDna -= cost;
    tree.levels[id] = level + 1;
    this.onSideNodeChanged(tab, id);
    this.arena.recordMasteryStat('upgrades', 1);
    this.floatText(player.x, player.y - 30, `${def.name} ${level + 1}/3`, '#ff8899');
  }

  private sellSideNode(tab: SideTab, id: string): void {
    const { player } = this.arena;
    const tree = this.sideTree(tab);
    const def = tree.nodes.find((n) => n.id === id);
    if (!def) return;
    if (def.isUltimate) {
      this.floatText(player.x, player.y - 30, 'Permanent — cannot sell', '#ff6666');
      return;
    }
    const fastTier = this.lvl(this.fighterBody, 'fast-evolution');
    if (fastTier <= 0) {
      this.floatText(player.x, player.y - 30, 'Need Fast Evolution', '#ff6666');
      return;
    }
    const level = tree.levels[id] ?? 0;
    if (level <= 0) return;
    const cost = growthEvolveNodeCost(level - 1, def.row, fastTier, this.apexOwned());
    const refund = Math.floor(cost * growthEvolveSellRefundFraction(fastTier));
    tree.levels[id] = level - 1;
    this.onSideNodeChanged(tab, id);
    this.playerDna = Math.min(DNA_CAP, this.playerDna + refund);
    this.floatText(player.x, player.y - 30, `Sold, +${refund} \u{1F9EC}`, '#ffdd66');
  }

  /** Immediate side effects of a Pal-tree change. */
  private onSideNodeChanged(tab: SideTab, id: string): void {
    if (tab !== 'pal') return;
    if (id === 'symbiosis') this.syncFighterMods();
    // Big Brain 3 can bank a second charge; selling it back drops any extra.
    if (id === 'big-brain') this.palCharge = Math.min(this.palCharge, this.palMaxCharges());
  }

  private buyEvolveNode(id: string): void {
    const { player } = this.arena;
    const body = this.fighterBody;

    if (id === GROWTH_CLONE_MATURITY_ID) {
      const level = this.lvl(body, id);
      if (level >= GROWTH_CLONE_MATURITY_MAX_LEVEL) return;
      if (this.playerDna < GROWTH_CLONE_MATURITY_COST) {
        this.floatText(player.x, player.y - 30, 'Not enough DNA', '#ff6666');
        return;
      }
      this.playerDna -= GROWTH_CLONE_MATURITY_COST;
      body.levels[id] = level + 1;
      player.increaseMaxHp(GROWTH_CLONE_MATURITY_HP_PER_TIER);
      player.heal(GROWTH_CLONE_MATURITY_HP_PER_TIER);
      this.arena.recordMasteryStat('upgrades', 1);
      this.floatText(player.x, player.y - 30, `${GROWTH_CLONE_MATURITY_NAME} ${level + 1}/3`, '#ffcc99');
      return;
    }

    const def = GROWTH_EVOLVE_NODES.find((n) => n.id === id);
    if (!def) return;
    if (def.isUltimate) { this.buyUltimateNode(def); return; }

    const level = this.lvl(body, id);
    if (level >= GROWTH_EVOLVE_MAX_LEVEL) return;
    const cost = growthEvolveNodeCost(level, def.row, this.lvl(body, 'fast-evolution'), this.apexOwned());
    if (this.playerDna < cost) {
      this.floatText(player.x, player.y - 30, 'Not enough DNA', '#ff6666');
      return;
    }
    this.playerDna -= cost;
    body.levels[id] = level + 1;
    this.onNodeChanged(id);
    this.arena.recordMasteryStat('upgrades', 1);
    this.floatText(player.x, player.y - 30, `${def.name} ${level + 1}/3`, '#88ffaa');
  }

  /** Ultimates: single tier, flat DNA cost, one per body per match, row-4 prereq maxed. */
  private buyUltimateNode(def: GrowthEvolveNodeDef): void {
    const { player } = this.arena;
    const body = this.fighterBody;
    if (this.lvl(body, def.id) > 0) return;
    if (this.lvl(body, GROWTH_EVOLVE_ULTIMATE_PREREQ[def.path]) < GROWTH_EVOLVE_MAX_LEVEL) {
      this.floatText(player.x, player.y - 30, 'Max Tier 4 first', '#ff6666');
      return;
    }
    if (GROWTH_EVOLVE_ULTIMATE_IDS.some((oid) => oid !== def.id && this.lvl(body, oid) > 0)) {
      this.floatText(player.x, player.y - 30, 'Already chose an Ultimate', '#ff6666');
      return;
    }
    const cost = growthEvolveUltimateCost(this.lvl(body, 'fast-evolution'), this.apexOwned());
    if (this.playerDna < cost) {
      this.floatText(player.x, player.y - 30, 'Not enough DNA', '#ff6666');
      return;
    }
    this.playerDna -= cost;
    body.levels[def.id] = 1;
    this.onNodeChanged(def.id);
    this.arena.recordMasteryStat('upgrades', 1);
    this.arena.recordMasteryBest(`finalUL_${def.id}`, 1);
    const distinctUltimates = GROWTH_EVOLVE_ULTIMATE_IDS.reduce((n, uid) => n + (this.arena.getMasteryStat(`finalUL_${uid}`) > 0 ? 1 : 0), 0);
    this.arena.recordMasteryBest('finalUpgrades', distinctUltimates);
    this.floatText(player.x, player.y - 30, `${def.name} unlocked!`, '#ffdd44');
  }

  private sellEvolveNode(id: string): void {
    const { player } = this.arena;
    const body = this.fighterBody;
    const def = GROWTH_EVOLVE_NODES.find((n) => n.id === id);
    if (def?.isUltimate || id === GROWTH_CLONE_MATURITY_ID) {
      this.floatText(player.x, player.y - 30, 'Permanent — cannot sell', '#ff6666');
      return;
    }
    if (!def) return;
    const fastTier = this.lvl(body, 'fast-evolution');
    if (fastTier <= 0) {
      this.floatText(player.x, player.y - 30, 'Need Fast Evolution', '#ff6666');
      return;
    }
    const level = this.lvl(body, id);
    if (level <= 0) return;
    const cost = growthEvolveNodeCost(level - 1, def.row, fastTier, this.apexOwned());
    const refund = Math.floor(cost * growthEvolveSellRefundFraction(fastTier));
    body.levels[id] = level - 1;
    this.onNodeChanged(id);
    this.playerDna = Math.min(DNA_CAP, this.playerDna + refund);
    this.floatText(player.x, player.y - 30, `Sold, +${refund} \u{1F9EC}`, '#ffdd66');
  }

  /** Apply immediate side effects of a node level change on the controlled body. */
  private onNodeChanged(id: string): void {
    const body = this.fighterBody;
    if (id === 'thick-flesh') this.syncFighterMods();
    if (id === 'chitin-shell' && this.lvl(body, 'chitin-shell') > 0 && !body.chitinUp) {
      body.chitinUp = true;
      this.arena.player.shieldHp += CHITIN_SHIELD_HP;
      this.applyFighterTint();
    }
    if (id === 'sweating' && this.lvl(body, 'sweating') > 0) {
      body.sweatR = Math.max(body.sweatR, 1);
      body.sweatF = Math.max(body.sweatF, 1);
    }
  }

  /**
   * Ruin's Spikes of Ruin (see `combat/SummonPurge.ts`).
   * Clones, the nests that gestate them and the spore walls. A clone is a grown body rather
   * than a fighter — it has no `Fighter` behind it — so it counts as a summon and dies with the rest.
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
    for (let i = this.clones.length - 1; i >= 0; i--) {
      const c = this.clones[i];
      if (c.owner === exceptOwner || !near(c.sprite.x, c.sprite.y)) continue;
      this.destroyCloneVisuals(c);
      this.clones.splice(i, 1);
      razed++;
    }
    for (let i = this.nests.length - 1; i >= 0; i--) {
      const n = this.nests[i];
      if (n.owner === exceptOwner || !near(n.x, n.y)) continue;
      n.gfx.destroy();
      this.nests.splice(i, 1);
      razed++;
    }
    for (let i = this.spores.length - 1; i >= 0; i--) {
      const s = this.spores[i];
      if (s.owner === exceptOwner || !near(s.x, s.y)) continue;
      s.gfx.destroy();
      this.spores.splice(i, 1);
      razed++;
    }
    return razed;
  }
}
