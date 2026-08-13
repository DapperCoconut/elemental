import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { CastContext } from '../Ability';
import { Projectile } from '../../combat/Projectile';
import { HealthBar } from '../../combat/HealthBar';
import {
  CULTURE_TONES, GROWTH, GrowthAvatar, GrowthColorFn, GrowthCulture, GrowthFx,
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
  GROWTH_SICK_NODES,
  GROWTH_SICK_PATHS,
  GROWTH_SICK_ULTIMATE_PREREQ,
  GROWTH_SICK_ULTIMATE_IDS,
  GrowthNodeDef,
  GrowthEvolveNodeDef,
  growthEvolveNodeCost,
  growthEvolveUltimateCost,
  growthEvolveSellRefundFraction,
} from '../../data/GrowthEvolve';
import { meterGain } from '../../combat/Meters';

type Owner = 'player' | 'npc';
type CloneVariant = 'yellow' | 'blue' | 'red';

// ── Constants ────────────────────────────────────────────────────────────

const DNA_CAP = 10;
const DNA_PICKUP_RADIUS = 26;
const DNA_PICKUP_LIFESPAN = 8000;
const DNA_THRESHOLD = 25;

const BACT_DAMAGE = 12;
const BACT_SPEED = 460;
const BACT_HIT_RADIUS = 20;
const BACT_TIMEOUT = 2000;
const BACT_LOCATOR_RADIUS = 70;
const BACT_LOCATOR_TURN_RATE = 6; // steering strength per second (Click+ homing)

const CLAW_RANGE = 90;
const CLAW_DAMAGE = 35;
const CLAW_HALF_ARC = Math.PI / 3;

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

const EVOLVE_INVINCIBLE_DURATION = 5000;
const EVOLVE_INVINCIBLE_COOLDOWN = 20000;
const EVOLVE_INVINCIBLE_TINT = 0x888888;

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

// ── Mastery: Secret Upgrades passive + Syringe Shot bindable ─────────────
const BROOD_SPREAD = 0.1;             // radians between the two Brood bacteria
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

const SYRINGE_BASE_CD = 8000;
const SYRINGE_SPEED = 980;
const SYRINGE_HIT_RADIUS = 18;
const SYRINGE_TIMEOUT = 1600;
const SYRINGE_COLOR = 0xdd2233;

const SICK_BASE_MS = 10000;
const SICK_BASE_DPS = 2;
const SICK_TICK_MS = [1000, 800, 600, 500];   // indexed by Brutal tier
const SICK_CRIPPLE_EVERY = 5;                 // every Nth tick Crippling adds its bonus
const FATAL_HP_RATIO = 0.1;

const SNEEZE_INTERVAL_MS = 4000;
const SNEEZE_RANGE = 170;
const SNEEZE_HALF_ARC = Math.PI / 5;
const SNEEZE_BASE_MS = 6000;
const CONTACT_INFECT_BASE_MS = 3000;
const CONTACT_INFECT_RANGE = 44;
const BLOOD_DAMAGE_THRESHOLD = 50;
const BLOOD_LIFESPAN = 5000;
const BLOOD_RADIUS = 32;
const BLOOD_INFECT_BASE_MS = 3000;
const SHATTER_RADIUS = 120;
const COMPROMISE_RADIUS = 95;
const CARRIER_DPS = 1;
const CARRIER_SPEED_MULT = 0.95;
const CARRIER_DAMAGE_MULT = 0.95;

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
}

interface VirusProj {
  tri: Phaser.GameObjects.Triangle;
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
  tri: Phaser.GameObjects.Triangle;
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
}

interface PendingSpore {
  x: number; y: number;
  owner: Owner;
  spikedTier: number;
  gutTier: number;
  spawnAt: number;
}

interface DnaPickup {
  gfx: Phaser.GameObjects.Text;
  x: number; y: number;
  owner: Owner;
  expiresAt: number;
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

interface Syringe {
  container: Phaser.GameObjects.Container;
  owner: Owner;
  x: number; y: number; vx: number; vy: number;
  /** Sickness duration this syringe carries, snapshotted at launch. */
  durationMs: number;
  spawnedAt: number;
}

/**
 * One active Sickness. All of the Syringe tree's upgrades are folded into this single
 * effect — the tray only ever shows one 🩸 box no matter how deep the tree goes.
 */
interface Sickness {
  target: Fighter;
  owner: Owner;
  startedAt: number;
  until: number;
  nextTickAt: number;
  tickIndex: number;
  nextSneezeAt: number;
  /** Blood Spread accumulator: damage this target has taken while sick. */
  bloodAccum: number;
  /** Listener bound to the target's `damaged` event — detached when the sickness ends. */
  onDamaged: (amount: number) => void;
}

interface BloodPuddle {
  gfx: Phaser.GameObjects.Container;
  owner: Owner;
  x: number; y: number;
  infectMs: number;
  expiresAt: number;
}

/** Tracked multipliers this kit has written onto a fighter, so writes stay composable. */
interface SickMods {
  vuln: number;
  weaken: number;
  slow: number;
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
// Evolve menu each match) + Syringe Shot (bindable — inflicts Sickness and opens
// a second Evolve tree that upgrades that one effect).

export class GrowthKit {
  // ── Visuals ───────────────────────────────────────────────────────────
  /** Colour mappers + effect painters, one per owner so a skin recolours one side. */
  private readonly pcol: GrowthColorFn;
  private readonly ncol: GrowthColorFn;
  private readonly pfx: GrowthFx;
  private readonly nfx: GrowthFx;
  /** The growth character rig (cell arms, eyes, budding crown) for each growth fighter. */
  private playerAvatar: GrowthAvatar | null = null;
  private npcAvatar: GrowthAvatar | null = null;
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
  private dnaPickups: DnaPickup[] = [];
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
  /** Which tree the Evolve menu is showing. The sickness tab only exists with Syringe Shot bound. */
  private evolveTab: 'body' | 'sickness' = 'body';

  // ── Mastery state ───────────────────────────────────────────────────
  /** The Secret Upgrades rolled for this match (ids into GROWTH_SECRET_UPGRADES). */
  private secretRoll: string[] = [];
  private secretOwned: Set<string> = new Set();
  /** Sickness tree levels. Player-only, and shared across bodies — the syringe is yours, not your flesh's. */
  private sickLevels: Record<string, number> = {};
  private syringes: Syringe[] = [];
  private sicknesses: Sickness[] = [];
  private bloodPuddles: BloodPuddle[] = [];
  private syringeLastCastAt = -SYRINGE_BASE_CD;
  private sickMods: Map<Fighter, SickMods> = new Map();
  private carriers: Map<Fighter, number> = new Map();  // fighter -> tick accumulator (ms)
  private viralBoostUntil = 0;
  private cloneCycle = 0;
  /** Guards Compromising from chaining off its own eruption damage. */
  private compromiseBusy = false;

  private evolveInvincibleActive = false;
  private evolveInvincibleEndsAt = 0;
  private evolveInvincibleCooldownUntil = 0;

  private npcDnaBarGfx: Phaser.GameObjects.Graphics | null = null;
  private dnaHudBarBg: Phaser.GameObjects.Rectangle | null = null;
  private dnaHudBarFill: Phaser.GameObjects.Rectangle | null = null;
  private dnaHudBarText: Phaser.GameObjects.Text | null = null;
  private chargePips: Phaser.GameObjects.Arc[] = [];

  private fighterContactNext: Map<Fighter, number> = new Map();

  constructor(private arena: GrowthArenaApi) {
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
  private avatarOf(owner: Owner): GrowthAvatar | null {
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
    for (const p of this.dnaPickups) p.gfx.destroy();
    this.dnaPickups = [];
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
    for (const s of this.syringes) s.container.destroy();
    this.syringes = [];
    for (const s of this.sicknesses) this.detachSickness(s);
    this.sicknesses = [];
    for (const b of this.bloodPuddles) b.gfx.destroy();
    this.bloodPuddles = [];

    // Hand back every multiplier this kit wrote, then forget the fighters entirely.
    for (const [f, mods] of this.sickMods) {
      if (f.active) {
        f.incomingDamageMultiplier /= mods.vuln;
        f.outgoingDamageMult /= mods.weaken;
        if (f !== this.arena.player && f !== this.arena.npc) f.walkSpeedMult /= mods.slow;
      }
    }
    this.sickMods = new Map();
    for (const f of this.carriers.keys()) if (f.active) f.sicknessCarrier = false;
    this.carriers = new Map();
    this.arena.player.sicknessUntil = 0;
    this.arena.npc.sicknessUntil = 0;
    this.syringeLastCastAt = -SYRINGE_BASE_CD;
    this.viralBoostUntil = 0;
    this.cloneCycle = 0;
    this.compromiseBusy = false;
    this.sickLevels = {};
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
    this.evolveInvincibleCooldownUntil = 0;

    if (this.npcDnaBarGfx) { this.npcDnaBarGfx.destroy(); this.npcDnaBarGfx = null; }
    if (this.dnaHudBarBg) { this.dnaHudBarBg.destroy(); this.dnaHudBarBg = null; }
    if (this.dnaHudBarFill) { this.dnaHudBarFill.destroy(); this.dnaHudBarFill = null; }
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
    const factor = this.cdFactor(abilityId, this.fighterBody);
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
    return this.arena.scene.time.now < this.viralBoostUntil ? VIRAL_BOOST_MULT : 1;
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
      this.arena.showFloatingText(player.x, player.y - 30, 'Not enough DNA', '#ff6666');
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
    this.arena.showFloatingText(player.x, player.y - 30, `🧫 ${def.name}!`, '#ffdd66');
  }

  // ── Mastery: Syringe Shot / Sickness ─────────────────────────────────

  private syringeSlot(): 'r' | 'f' | 'q' | null {
    for (const s of ['r', 'f', 'q'] as const) {
      if (this.arena.masteryBindFor(s) === 'syringe-shot') return s;
    }
    return null;
  }

  /** Sickness-tree tier for an owner. Only the local player has a tree; the NPC's is flat. */
  private sickTier(owner: Owner, id: string): number {
    return owner === 'player' ? (this.sickLevels[id] ?? 0) : 0;
  }

  private syringeCooldown(): number {
    const cd = SYRINGE_BASE_CD - 1000 * this.sickTier('player', 'quick-fire');
    return Math.max(1000, cd * this.arena.player.cooldownMult);
  }

  getSyringeCooldownRatio(time: number): number {
    return Math.min(1, (time - this.syringeLastCastAt) / this.syringeCooldown());
  }

  private tryCastSyringe(time: number, mouseX: number, mouseY: number): void {
    if (time - this.syringeLastCastAt < this.syringeCooldown()) return;
    this.syringeLastCastAt = time;
    // triggerCooldown stamps the cast for the HUD and broadcasts it online, where the
    // peer routes the unknown id through ArenaScene.replayNpcMastery → doNpcSyringeShot.
    this.arena.player.triggerCooldown('syringe-shot');
    this.launchSyringe(mouseX, mouseY, 'player');
  }

  /** Online replay: the remote growth player fired a syringe at (tx, ty). */
  doNpcSyringeShot(tx: number, ty: number): void {
    this.launchSyringe(tx, ty, 'npc');
  }

  /** Full sickness duration a freshly-fired syringe carries (Remaining only boosts the syringe). */
  private syringeDuration(owner: Owner): number {
    return SICK_BASE_MS + 2000 * this.sickTier(owner, 'remaining');
  }

  private launchSyringe(tx: number, ty: number, owner: Owner): void {
    const { scene } = this.arena;
    const caster = this.fighterOf(owner);
    const ox = caster.x, oy = caster.y;
    const dx = tx - ox, dy = ty - oy;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const aim = Math.atan2(dy, dx);

    // A real syringe: glass barrel with a fluid column, plunger stem, thumb rest, steel needle.
    // Jabbed, not thrown — the arm drives it forward along the aim.
    this.avatarOf(owner)?.play('punch', aim);
    this.fx(owner).muzzleBud(ox + Math.cos(aim) * 18, oy + Math.sin(aim) * 18, aim, 1.2, 7, SICK_TONES);

    const container = scene.add.container(ox, oy).setDepth(7);
    const needle = scene.add.rectangle(16, 0, 16, 2, 0xdde4ee, 1);
    const tip = scene.add.triangle(25, 0, 0, -1.5, 5, 0, 0, 1.5, 0xffffff, 1);
    const barrel = scene.add.rectangle(2, 0, 22, 9, 0xf0f6ff, 0.55).setStrokeStyle(1, 0xaabbcc, 0.9);
    const fluid = scene.add.rectangle(4, 0, 15, 6, SYRINGE_COLOR, 0.95);
    const stem = scene.add.rectangle(-14, 0, 12, 2.5, 0xdddddd, 1);
    const thumb = scene.add.rectangle(-21, 0, 3, 11, 0xeeeeee, 1);
    container.add([needle, tip, barrel, fluid, stem, thumb]);
    container.setRotation(aim);

    this.syringes.push({
      container, owner,
      x: ox, y: oy,
      vx: (dx / len) * SYRINGE_SPEED, vy: (dy / len) * SYRINGE_SPEED,
      durationMs: this.syringeDuration(owner),
      spawnedAt: scene.time.now,
    });
    this.arena.showFloatingText(ox, oy - 34, '💉 SYRINGE', '#ff8899');
  }

  private updateSyringes(time: number, delta: number): void {
    const dt = delta / 1000;
    const W = this.arena.scene.scale.width, H = this.arena.scene.scale.height;
    for (let i = this.syringes.length - 1; i >= 0; i--) {
      const s = this.syringes[i];
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.container.setPosition(s.x, s.y);

      if (s.x < -30 || s.x > W + 30 || s.y < -30 || s.y > H + 30 || time - s.spawnedAt > SYRINGE_TIMEOUT) {
        s.container.destroy();
        this.syringes.splice(i, 1);
        continue;
      }
      // Spore walls stop syringes like any other projectile.
      if (this.hitOpposingSpore(s.owner, s.x, s.y, 0)) {
        s.container.destroy();
        this.syringes.splice(i, 1);
        continue;
      }

      let struck: Fighter | null = null;
      for (const t of this.targetsOf(s.owner)) {
        if (!t.active || t.hp <= 0) continue;
        if (Phaser.Math.Distance.Between(s.x, s.y, t.x, t.y) <= SYRINGE_HIT_RADIUS) { struck = t; break; }
      }
      if (!struck) continue;

      // No damage of its own — the syringe only ever delivers the plague.
      this.applySickness(struck, s.owner, s.durationMs, true, time);
      this.arena.spawnHitFlash(struck.x, struck.y, SYRINGE_COLOR);
      // Snap on application, so Sickness has a moment as well as a state.
      this.fx(s.owner).ring(struck.x, struck.y, 6, 34, GROWTH.flush, 320, 3, 8);
      this.fx(s.owner).motes(struck.x, struck.y, 6, {
        speed: 90, size: 2.4, life: 460, rise: 12, depth: 8, tones: SICK_TONES,
      });
      if (this.sickTier(s.owner, 'syringe-shatter') > 0) {
        this.shatterSyringe(struck, s, time);
      }
      s.container.destroy();
      this.syringes.splice(i, 1);
    }
  }

  /** Syringe Shatter (ultimate): the glass bursts, misting half the dose over everyone nearby. */
  private shatterSyringe(struck: Fighter, s: Syringe, time: number): void {
    const { scene } = this.arena;
    // The dose mists outward as a blood-toned bloom, and the glass goes with it.
    this.fx(s.owner).burst(struck.x, struck.y, SHATTER_RADIUS, {
      pods: 14, haze: 3, duration: 420, tones: SICK_TONES, depth: 6,
    });
    for (let k = 0; k < 7; k++) {
      const a = Math.random() * Math.PI * 2;
      const shard = scene.add.rectangle(struck.x, struck.y, 4, 1.5, 0xf0f6ff, 0.9).setDepth(7);
      shard.setRotation(a);
      scene.tweens.add({
        targets: shard, x: struck.x + Math.cos(a) * 46, y: struck.y + Math.sin(a) * 46, alpha: 0,
        duration: 300, onComplete: () => shard.destroy(),
      });
    }
    const splash = Math.round(s.durationMs * 0.5);
    for (const t of this.targetsOf(s.owner)) {
      if (t === struck || !t.active || t.hp <= 0) continue;
      if (Phaser.Math.Distance.Between(struck.x, struck.y, t.x, t.y) > SHATTER_RADIUS) continue;
      this.applySickness(t, s.owner, splash, false, time);
    }
  }

  /**
   * Put (or top up) Sickness on a target. `refresh` is reserved for the syringe itself —
   * every spread route (sneeze, contact, blood, shatter) leaves an existing timer alone.
   */
  private applySickness(target: Fighter, owner: Owner, durationMs: number, refresh: boolean, time: number): void {
    const existing = this.sicknesses.find((s) => s.target === target);
    if (existing) {
      if (!refresh) return;
      existing.until = Math.max(existing.until, time + durationMs);
      existing.owner = owner;
      target.sicknessUntil = existing.until;
      return;
    }
    const entry: Sickness = {
      target, owner,
      startedAt: time,
      until: time + durationMs,
      nextTickAt: time + this.sickTickInterval(owner),
      tickIndex: 0,
      nextSneezeAt: time + SNEEZE_INTERVAL_MS,
      bloodAccum: 0,
      onDamaged: () => {},
    };
    entry.onDamaged = (amount: number) => this.onSickTargetDamaged(entry, amount);
    target.on('damaged', entry.onDamaged);
    target.sicknessUntil = entry.until;
    this.sicknesses.push(entry);
    this.arena.showFloatingText(target.x, target.y - 44, '🩸 SICKNESS', '#ff5566');
  }

  private detachSickness(s: Sickness): void {
    s.target.off('damaged', s.onDamaged);
    if (s.target.active) s.target.sicknessUntil = 0;
  }

  private sickTickInterval(owner: Owner): number {
    return SICK_TICK_MS[Math.min(SICK_TICK_MS.length - 1, this.sickTier(owner, 'brutal'))];
  }

  private updateSickness(time: number, delta: number): void {
    for (let i = this.sicknesses.length - 1; i >= 0; i--) {
      const s = this.sicknesses[i];
      const t = s.target;
      if (!t.active || t.hp <= 0 || time >= s.until) {
        // Carrier: the plague never fully leaves a body that survived it.
        if (t.active && t.hp > 0 && this.sickTier(s.owner, 'carrier') > 0 && !t.sicknessCarrier) {
          t.sicknessCarrier = true;
          this.carriers.set(t, 0);
          this.arena.showFloatingText(t.x, t.y - 44, '🦠 CARRIER', '#aadd55');
        }
        this.detachSickness(s);
        this.sicknesses.splice(i, 1);
        continue;
      }

      if (time >= s.nextTickAt) {
        s.nextTickAt = time + this.sickTickInterval(s.owner);
        s.tickIndex++;
        this.tickSickness(s);
        if (!t.active || t.hp <= 0) continue;
      }

      // Sneeze: the host coughs a cone of plague down whatever they are facing.
      if (this.sickTier(s.owner, 'sneeze') > 0 && time >= s.nextSneezeAt) {
        s.nextSneezeAt = time + SNEEZE_INTERVAL_MS;
        this.doSneeze(s, time);
      }

      // Contact: bodies touching a sick host catch it.
      const contactTier = this.sickTier(s.owner, 'contact');
      if (contactTier > 0) {
        const dur = CONTACT_INFECT_BASE_MS + 2000 * (contactTier - 1);
        for (const other of this.targetsOf(s.owner)) {
          if (other === t || !other.active || other.hp <= 0) continue;
          if (Phaser.Math.Distance.Between(t.x, t.y, other.x, other.y) > CONTACT_INFECT_RANGE) continue;
          this.applySickness(other, s.owner, dur, false, time);
        }
      }
    }
    this.updateCarriers(delta);
    this.syncSickModifiers(time);
  }

  private tickSickness(s: Sickness): void {
    const t = s.target;
    const owner = s.owner;
    const crippling = this.sickTier(owner, 'crippling');
    let dmg = SICK_BASE_DPS + this.sickTier(owner, 'deadly') + crippling;
    if (crippling > 0 && s.tickIndex % SICK_CRIPPLE_EVERY === 0) dmg += 2 * crippling;
    dmg = Math.round(dmg * this.dmgBoost(owner));

    t.takeDamage(dmg);
    this.arena.spawnHitFlash(t.x, t.y, SYRINGE_COLOR);
    this.registerDamage(owner, t, dmg);

    // Fatal (ultimate): once sickness has them on the ropes, it finishes the job.
    if (this.sickTier(owner, 'fatal') > 0 && t.active && t.hp > 0 && t.hp <= t.maxHp * FATAL_HP_RATIO) {
      this.arena.showFloatingText(t.x, t.y - 40, '☠️ FATAL', '#ff2233');
      t.takeDamage(9999, { pierce: true });
    }
  }

  /**
   * Which way a fighter is "looking". `facingAngle` is only kept current in Silence matches
   * and online, so fall back to the direction they are actually travelling, then to whoever
   * poisoned them — a sneeze cone stuck pointing right would be worse than useless.
   */
  private facingOf(f: Fighter): number {
    const body = f.body as Phaser.Physics.Arcade.Body | null;
    if (body && (Math.abs(body.velocity.x) > 5 || Math.abs(body.velocity.y) > 5)) {
      return Math.atan2(body.velocity.y, body.velocity.x);
    }
    if (f.facingAngle !== 0) return f.facingAngle;
    const foe = this.nearestOf(f.x, f.y, f === this.arena.player ? [this.arena.npc] : [this.arena.player]);
    return foe ? Math.atan2(foe.y - f.y, foe.x - f.x) : 0;
  }

  /** Sneeze cone: infects anyone caught in it, but never resets a timer already running. */
  private doSneeze(s: Sickness, time: number): void {
    const t = s.target;
    const tier = this.sickTier(s.owner, 'sneeze');
    const dur = SNEEZE_BASE_MS + 2000 * (tier - 1);
    const aim = this.facingOf(t);

    // The cone expands out of the sneezer rather than appearing whole, and the droplets are
    // pods so the spray reads as living material rather than as confetti.
    const tint = this.col(s.owner);
    this.fx(s.owner).anim(6, 420, (g, ft) => {
      const fade = 1 - ft * ft;
      const punch = Math.min(1, ft * 2);
      const reach = SNEEZE_RANGE * (1 - (1 - punch) * (1 - punch));
      g.fillStyle(tint(GROWTH.spring), 0.28 * fade);
      g.slice(t.x, t.y, reach, aim - SNEEZE_HALF_ARC, aim + SNEEZE_HALF_ARC, false);
      g.fillPath();
      g.lineStyle(2 * fade, tint(GROWTH.pollen), 0.6 * fade);
      g.beginPath();
      g.arc(t.x, t.y, reach, aim - SNEEZE_HALF_ARC, aim + SNEEZE_HALF_ARC);
      g.strokePath();
    });
    this.fx(s.owner).motes(t.x, t.y, 10, {
      angle: aim, spread: SNEEZE_HALF_ARC, speed: SNEEZE_RANGE * 1.5,
      size: 2.6, life: 420, rise: 6, depth: 7, tones: SICK_TONES,
    });
    this.arena.showFloatingText(t.x, t.y - 30, '🤧', '#ccee88');

    for (const other of this.targetsOf(s.owner)) {
      if (other === t || !other.active || other.hp <= 0) continue;
      const d = Phaser.Math.Distance.Between(t.x, t.y, other.x, other.y);
      if (d > SNEEZE_RANGE) continue;
      const ang = Math.abs(Phaser.Math.Angle.Wrap(Math.atan2(other.y - t.y, other.x - t.x) - aim));
      if (ang > SNEEZE_HALF_ARC) continue;
      this.applySickness(other, s.owner, dur, false, time);
    }
  }

  /** Compromising + Blood Spread both key off damage a sick body takes, from any source. */
  private onSickTargetDamaged(s: Sickness, amount: number): void {
    if (amount <= 0 || this.compromiseBusy) return;
    const t = s.target;
    const time = this.arena.scene.time.now;

    const bloodTier = this.sickTier(s.owner, 'blood-spread');
    if (bloodTier > 0) {
      s.bloodAccum += amount;
      while (s.bloodAccum >= BLOOD_DAMAGE_THRESHOLD) {
        s.bloodAccum -= BLOOD_DAMAGE_THRESHOLD;
        this.spawnBloodPuddle(t.x, t.y, s.owner, BLOOD_INFECT_BASE_MS + 2000 * (bloodTier - 1), time);
      }
    }

    const compTier = this.sickTier(s.owner, 'compromising');
    if (compTier > 0) this.erupt(t, s.owner, amount, compTier);
  }

  /** The sick body bursts. Everything nearby eats it — except the body it came out of. */
  private erupt(source: Fighter, owner: Owner, amount: number, tier: number): void {
    const dmg = Math.round(amount * (1 + 0.1 * tier));
    // Higher tiers erupt harder rather than merely wider — the content scales, not the radius.
    this.fx(owner).burst(source.x, source.y, COMPROMISE_RADIUS, {
      pods: 10 + tier * 4, haze: 2 + tier, duration: 380 + tier * 80,
      tones: SICK_TONES, depth: 6,
    });

    this.compromiseBusy = true;
    for (const t of this.targetsOf(owner)) {
      if (t === source || !t.active || t.hp <= 0) continue;
      if (Phaser.Math.Distance.Between(source.x, source.y, t.x, t.y) > COMPROMISE_RADIUS) continue;
      t.takeDamage(dmg);
      this.arena.spawnHitFlash(t.x, t.y, GROWTH.flush);
      this.registerDamage(owner, t, dmg);
    }
    this.compromiseBusy = false;
  }

  private spawnBloodPuddle(x: number, y: number, owner: Owner, infectMs: number, time: number): void {
    const { scene } = this.arena;
    const container = scene.add.container(x, y).setDepth(2);
    container.add(scene.add.ellipse(0, 0, BLOOD_RADIUS * 2, BLOOD_RADIUS * 1.4, 0x8a0f1c, 0.75));
    container.add(scene.add.ellipse(-8, 4, BLOOD_RADIUS, BLOOD_RADIUS * 0.7, 0xb31624, 0.8));
    for (let i = 0; i < 4; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = BLOOD_RADIUS * (0.7 + Math.random() * 0.5);
      container.add(scene.add.circle(Math.cos(a) * d, Math.sin(a) * d * 0.6, 2 + Math.random() * 3, 0x8a0f1c, 0.7));
    }
    this.bloodPuddles.push({ gfx: container, owner, x, y, infectMs, expiresAt: time + BLOOD_LIFESPAN });
  }

  private updateBloodPuddles(time: number): void {
    for (let i = this.bloodPuddles.length - 1; i >= 0; i--) {
      const b = this.bloodPuddles[i];
      if (time >= b.expiresAt) {
        b.gfx.destroy();
        this.bloodPuddles.splice(i, 1);
        continue;
      }
      const left = b.expiresAt - time;
      b.gfx.setAlpha(left < 900 ? left / 900 : 1);
      for (const t of this.targetsOf(b.owner)) {
        if (!t.active || t.hp <= 0) continue;
        if (Phaser.Math.Distance.Between(b.x, b.y, t.x, t.y) > BLOOD_RADIUS) continue;
        this.applySickness(t, b.owner, b.infectMs, false, time);
      }
    }
  }

  /** Carrier's permanent 1 HP/s drain. The slow and damage cut ride in syncSickModifiers. */
  private updateCarriers(delta: number): void {
    for (const [f, accum] of this.carriers) {
      if (!f.active || f.hp <= 0) { this.carriers.delete(f); continue; }
      const next = accum + delta;
      if (next >= 1000) {
        this.carriers.set(f, next - 1000);
        f.takeDamage(CARRIER_DPS);
      } else {
        this.carriers.set(f, next);
      }
    }
  }

  /**
   * Recompute the three multiplier debuffs sickness owns and apply them as deltas, so other
   * systems writing the same fields keep composing. Speed for the player/npc is handed to
   * ArenaScene's speed chokepoint instead (see getSickSpeedMult).
   */
  private syncSickModifiers(time: number): void {
    const touched = new Set<Fighter>();
    for (const s of this.sicknesses) touched.add(s.target);
    for (const f of this.carriers.keys()) touched.add(f);
    for (const f of this.sickMods.keys()) touched.add(f);

    for (const f of touched) {
      const s = this.sicknesses.find((e) => e.target === f);
      const carrier = f.sicknessCarrier;
      let vuln = 1, weaken = 1, slow = 1;
      if (s) {
        const secs = Math.max(0, (time - s.startedAt) / 1000);
        vuln = 1 + 0.01 * this.sickTier(s.owner, 'sick-vuln') * secs;
        weaken = Math.max(0.1, 1 - 0.1 * this.sickTier(s.owner, 'sick-weaken'));
        slow = Math.max(0.1, 1 - 0.12 * this.sickTier(s.owner, 'slowing'));
      }
      if (carrier) { weaken *= CARRIER_DAMAGE_MULT; slow *= CARRIER_SPEED_MULT; }

      const prev = this.sickMods.get(f) ?? { vuln: 1, weaken: 1, slow: 1 };
      const isDuelist = f === this.arena.player || f === this.arena.npc;
      if (!f.active) { this.sickMods.delete(f); continue; }
      if (vuln !== prev.vuln) f.incomingDamageMultiplier *= vuln / prev.vuln;
      if (weaken !== prev.weaken) f.outgoingDamageMult *= weaken / prev.weaken;
      if (!isDuelist && slow !== prev.slow) f.walkSpeedMult *= slow / prev.slow;
      if (vuln === 1 && weaken === 1 && slow === 1) this.sickMods.delete(f);
      else this.sickMods.set(f, { vuln, weaken, slow });
    }
  }

  /** Sickness/Carrier move-speed factor for the two duelists, read by ArenaScene. */
  getSickSpeedMult(f: Fighter): number {
    return this.sickMods.get(f)?.slow ?? 1;
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

    // Syringe Shot (mastery) takes over one of R/F/Q — that slot's base ability is
    // suppressed below, so the kit owns the keypress for it.
    const syrSlot = this.arena.masteryActive ? this.syringeSlot() : null;
    if (syrSlot) {
      const key = syrSlot === 'r' ? rKey : syrSlot === 'f' ? fKey : qKey;
      if (Phaser.Input.Keyboard.JustDown(key)) this.tryCastSyringe(time, mouseX, mouseY);
    }

    // Cached for the avatar rig, which runs in update() and has no pointer of its own.
    this.aimX = mouseX;
    this.aimY = mouseY;

    const ctx = () => this.arena.buildPlayerContext(mouseX, mouseY);
    if (pointer.isDown && player.castAbility('growth-click', ctx())) this.shaveCooldown('growth-click');
    if (Phaser.Input.Keyboard.JustDown(eKey)) player.castAbility('growth-evolve', ctx());
    if (syrSlot !== 'r' && Phaser.Input.Keyboard.JustDown(rKey)) this.castChargeable('growth-virus', time, mouseX, mouseY);
    if (syrSlot !== 'f' && Phaser.Input.Keyboard.JustDown(fKey)) this.castChargeable('spore-spray', time, mouseX, mouseY);
    if (syrSlot !== 'q' && Phaser.Input.Keyboard.JustDown(qKey)) {
      if (this.playerDna < AUX_COST) {
        this.arena.showFloatingText(player.x, player.y - 30, 'Not enough DNA', '#ff6666');
      } else if (this.cloneSlotsFull('player')) {
        this.arena.showFloatingText(player.x, player.y - 30, 'Clone already active', '#ff6666');
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
        this.arena.showFloatingText(player.x, player.y - 30, 'No charges', '#ff6666');
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
    this.updateDnaPickups(time);
    this.updateNests(time, delta);
    this.updateClones(time, delta);
    this.updateContactDamage(time);
    this.updateChitin(time);
    this.updateSweatCharges(time);
    this.updateSyringes(time, delta);
    this.updateSickness(time, delta);
    this.updateBloodPuddles(time);
    this.updateEmesis(time, delta);
    if (this.evolveInvincibleActive && time >= this.evolveInvincibleEndsAt) this.endEvolveInvincibility();
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
      if (!this.playerAvatar) this.playerAvatar = new GrowthAvatar(scene, this.pcol, CULTURE_TONES);
      const aimX = this.aimX || player.x + 1;
      const aimY = this.aimY || player.y;
      this.playerAvatar.setFacing(Math.atan2(aimY - player.y, aimX - player.x));
      // Chitin up or a live clone means the colony is thriving; show it on the body.
      this.playerAvatar.setIntensity(
        this.fighterBody.chitinUp ? 1.35 : this.hasClone('player') ? 1.2 : 1,
      );
      this.playerAvatar.setMastered(this.arena.masteryActive);
      this.playerAvatar.update(delta, player.x, player.y, player.forceInvisible ? 0 : player.alpha);

      if (this.arena.masteryActive) {
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
      if (!this.npcAvatar) this.npcAvatar = new GrowthAvatar(scene, this.ncol, NPC_TONES);
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
      this.tryActivateEvolveInvincibility();
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
      this.arena.showFloatingText(fighter.x, fighter.y - 30, 'Not enough DNA', '#ff6666');
      return;
    }
    if (this.cloneSlotsFull(owner)) {
      this.arena.showFloatingText(fighter.x, fighter.y - 30, 'Clone already active', '#ff6666');
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
      this.arena.showFloatingText(nx, ny - 26, '🧬 Soup absorbed!', '#88ff88');
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
    this.arena.showFloatingText(fighter.x, fighter.y - 40, '🥚 Nest planted', '#88bb22');
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
    this.arena.showFloatingText(fighter.x, fighter.y - 40, '🧟 INHABITED CLONE!', '#88ff44');
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
    this.arena.showFloatingText(f.x, f.y - 56, '🔀 PUT BACK', '#aaff66');
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
      this.arena.showFloatingText(p.x, p.y - 40, '🔀 BODY SWAP', '#aaff66');
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
    const inMult = (1 - 0.1 * this.lvl(b, 'thick-flesh')) * (b.variant === 'blue' ? VARIANT_DR_MULT : 1);
    const spMult = b.variant === 'yellow' ? VARIANT_SPEED_MULT : 1;
    p.incomingDamageMultiplier *= inMult / this.appliedFighterInMult;
    this.appliedFighterInMult = inMult;
    p.speed *= spMult / this.appliedFighterSpeedMult;
    this.appliedFighterSpeedMult = spMult;
  }

  private applyFighterTint(): void {
    if (this.evolveInvincibleActive) return; // gray tint wins until it ends
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
    if (this.lvl(srcBody, 'claws') > 0) {
      const near = this.nearestOf(ox, oy, this.targetsOf(owner));
      if (near && Phaser.Math.Distance.Between(ox, oy, near.x, near.y) <= CLAW_RANGE) {
        this.clawSwipe(ox, oy, tx, ty, owner, srcBody);
        return;
      }
    }
    // Brood (secret): the culture splits, so every click puts two in the air.
    if (owner === 'player' && this.hasSecret('brood')) {
      const aim = Math.atan2(ty - oy, tx - ox);
      const dist = Phaser.Math.Distance.Between(ox, oy, tx, ty) || 1;
      for (const off of [-BROOD_SPREAD, BROOD_SPREAD]) {
        this.launchBacterium(ox, oy, ox + Math.cos(aim + off) * dist, oy + Math.sin(aim + off) * dist, owner, srcBody);
      }
      return;
    }
    this.launchBacterium(ox, oy, tx, ty, owner, srcBody);
  }

  private launchBacterium(ox: number, oy: number, tx: number, ty: number, owner: Owner, srcBody: BodyState): void {
    const { scene } = this.arena;
    const dx = tx - ox, dy = ty - oy;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const nx = dx / len, ny = dy / len;
    const speed = BACT_SPEED * (1 + 0.2 * this.lvl(srcBody, 'enhanced-flagellum'));

    // The cell pinches off a hand: arms jab, then a bud tears loose where it left.
    const aim = Math.atan2(ny, nx);
    const avatar = this.avatarOf(owner);
    avatar?.play('punch', aim);
    const hand = avatar?.castHand() ?? { x: ox, y: oy };
    this.fx(owner).muzzleBud(hand.x, hand.y, aim, 1, 7, tonesFor(owner));

    const color = owner === 'player' ? PLAYER_COLOR : NPC_COLOR;
    const container = scene.add.container(ox, oy).setDepth(6);
    const bodyGfx = scene.add.ellipse(0, 0, 16, 9, color, 0.95);
    const nucleus = scene.add.circle(2, 0, 2.5, 0x1a4a1a, 1) as Phaser.GameObjects.Arc;
    const tail: Phaser.GameObjects.Arc[] = [];
    for (let i = 0; i < 3; i++) {
      const seg = scene.add.circle(-10 - i * 4.5, 0, 2.4 - i * 0.5, color, 0.8) as Phaser.GameObjects.Arc;
      tail.push(seg);
    }
    container.add([...tail, bodyGfx, nucleus]);
    container.setRotation(Math.atan2(ny, nx));

    this.bacteria.push({
      container, tail, owner, srcBody,
      x: ox, y: oy, vx: nx * speed, vy: ny * speed,
      dmg: this.bacteriumDamage(srcBody, owner),
      spawnedAt: scene.time.now,
      wigglePhase: Math.random() * Math.PI * 2,
    });
  }

  private clawSwipe(ox: number, oy: number, tx: number, ty: number, owner: Owner, srcBody: BodyState): void {
    const aim = Math.atan2(ty - oy, tx - ox);
    const dmg = Math.round(CLAW_DAMAGE * (srcBody.variant === 'red' ? VARIANT_DMG_MULT : 1) * this.dmgBoost(owner));

    // Three claws raked across the arc, each leading its own wound trail. Drawn from scratch
    // every frame so the swipe travels rather than fading in place.
    const tones = tonesFor(owner);
    const tint = this.col(owner);
    this.avatarOf(owner)?.play('sweep', aim);
    this.fx(owner).anim(7, 240, (g, t) => {
      const fade = 1 - t * t;
      const sweep = aim - CLAW_HALF_ARC * 0.7 + t * CLAW_HALF_ARC * 1.4;
      g.fillStyle(tint(tones.spark), 0.35 * fade);
      g.slice(ox, oy, CLAW_RANGE, aim - CLAW_HALF_ARC * 0.7, sweep, false);
      g.fillPath();
      for (let i = -1; i <= 1; i++) {
        const a = sweep + i * 0.2;
        g.lineStyle(3.5 * fade, tint(i === 0 ? tones.spark : tones.lit), 0.9 * fade);
        g.beginPath();
        g.moveTo(ox + Math.cos(a) * 18, oy + Math.sin(a) * 18);
        g.lineTo(ox + Math.cos(a) * CLAW_RANGE, oy + Math.sin(a) * CLAW_RANGE);
        g.strokePath();
        // A bead of cytoplasm running off each claw tip.
        g.fillStyle(tint(tones.cyto), 0.8 * fade);
        growthPod(g, ox + Math.cos(a) * CLAW_RANGE * 0.75, oy + Math.sin(a) * CLAW_RANGE * 0.75, a, 16 * fade, 3 * fade, 0);
      }
    });

    for (const t of this.targetsOf(owner)) {
      if (!t.active || t.hp <= 0) continue;
      const d = Phaser.Math.Distance.Between(ox, oy, t.x, t.y);
      if (d > CLAW_RANGE + 16) continue;
      const angDiff = Math.abs(Phaser.Math.Angle.Wrap(Math.atan2(t.y - oy, t.x - ox) - aim));
      if (angDiff > CLAW_HALF_ARC) continue;
      t.takeDamage(dmg);
      this.arena.spawnHitFlash(t.x, t.y, GROWTH.pollen);
      this.fx(owner).motes(t.x, t.y, 5, { angle: aim, spread: 0.8, speed: 110, size: 2.4, life: 380, depth: 8, tones });
      this.registerDamage(owner, t, dmg);
      this.onClickDamage(owner, srcBody, dmg);
    }
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
    this.arena.showFloatingText(f.x, f.y - 40, '🤢 …', '#88cc44');

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
          this.arena.spawnHitFlash(t.x, t.y, GROWTH.lime);
          this.registerDamage(c.owner, t, EMESIS_TICK_DAMAGE);
          // Caught in it: they owe their own, and theirs will burn *us*.
          if (!this.forcedVomits.has(t)) {
            this.forcedVomits.set(t, {
              left: EMESIS_SPREAD_COUNT,
              nextAt: time + EMESIS_SPREAD_WINDOW_MS / (EMESIS_SPREAD_COUNT + 1),
            });
            this.arena.showFloatingText(t.x, t.y - 46, '🤮 Sick!', '#aadd44');
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
        if (nearest && Phaser.Math.Distance.Between(b.x, b.y, nearest.x, nearest.y) < BACT_LOCATOR_RADIUS) {
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
          this.arena.spawnHitFlash(t.x, t.y, PLAYER_COLOR);
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
      this.arena.showFloatingText(this.arena.player.x, this.arena.player.y - 30, `+${amount} HP`, '#66dd66');
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
    this.fx(owner).muzzleBud(ox + Math.cos(aim) * 16, oy + Math.sin(aim) * 16, aim, 1.4, 7, tones);
    const tri = scene.add.triangle(ox, oy, 0, -10, 9, 8, -9, 8, this.col(owner)(tones.cyto), 0.95).setDepth(6);
    tri.setStrokeStyle(2, this.col(owner)(tones.spark), 0.9);
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
          this.arena.spawnHitFlash(t.x, t.y, GROWTH.shoot);
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
    const icon = this.arena.scene.add.triangle(target.x, target.y - 34, 0, -6, 5, 4, -5, 4, 0x77dd33, 0.95).setDepth(9);
    icon.setStrokeStyle(1, 0xccffaa, 0.9);
    this.arena.scene.tweens.add({ targets: icon, scaleX: 1.35, scaleY: 1.35, yoyo: true, repeat: -1, duration: 380 });
    this.infections.push({ target, owner, srcBody, until: time + durationMs, nextExpelAt: time + this.expelIntervalFor(owner), icon });
    this.arena.showFloatingText(target.x, target.y - 44,
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
    this.arena.spawnHitFlash(t.x, t.y, 0x77dd33);

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
    const color = healing ? 0x22ee55 : owner === 'player' ? 0x99cc22 : 0xcc8833;
    const tri = scene.add.triangle(fromX, fromY, 0, -8, 7, 6, -7, 6, color, 0.9).setDepth(4);
    tri.setStrokeStyle(1.5, healing ? 0xaaffcc : 0xddffaa, 0.8);
    tri.setRotation(Math.random() * Math.PI * 2);
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
          this.arena.showFloatingText(caster.x, caster.y - 30, `+${HEAL_VIRUS_AMOUNT} HP`, '#44ff77');
          // Viral Consumption (secret): digesting a healthy virus fires you up briefly.
          if (fv.owner === 'player' && this.hasSecret('viral-consumption')) {
            this.viralBoostUntil = time + VIRAL_BOOST_MS;
            this.arena.showFloatingText(caster.x, caster.y - 46, '🧬 +20% SPD/DMG', '#aaff66');
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
          this.arena.spawnHitFlash(t.x, t.y, 0x99cc22);
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
    this.fx(owner).sporeJet(ox, oy, aim, 90, 5, tonesFor(owner));
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
      this.spawnSpore(p.x, p.y, p.owner, p.spikedTier, p.gutTier, time);
    }
  }

  private spawnSpore(x: number, y: number, owner: Owner, spikedTier: number, gutTier: number, time: number): void {
    if (this.spores.length >= SPORE_MAX_COUNT) return;
    const { scene } = this.arena;
    this.spores.push({
      gfx: scene.add.graphics().setDepth(5), owner, spikedTier, gutTier, x, y,
      hp: SPORE_BASE_HP, maxHp: SPORE_BASE_HP,
      spawnedAt: time, matured: false,
    });
    // The sac isn't placed — it erupts out of the floor.
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
        if (s.hp <= 0) {
          // A popped sac dumps its contents; one that simply timed out just dries up.
          this.arena.spawnHitFlash(s.x, s.y, GROWTH.lime);
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
          this.arena.showFloatingText(s.x, s.y - 20, '🍄 Spore Cloud', '#88ee66');
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
      GrowthFx.drawSporeWall(
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
    this.arena.spawnHitFlash(s.x, s.y, 0x66dd44);
    if (s.owner === 'player') this.arena.recordMasteryStat('sporeBlocks', 1);
    if (s.spikedTier > 0) {
      this.sporeSpikeAccum[s.owner] += damage;
      while (this.sporeSpikeAccum[s.owner] >= SPIKED_SPORE_THRESHOLD) {
        this.sporeSpikeAccum[s.owner] -= SPIKED_SPORE_THRESHOLD;
        const victim = this.nearestOf(s.x, s.y, this.targetsOf(s.owner));
        if (victim) {
          const dmg = 2 * s.spikedTier;
          victim.takeDamage(dmg);
          this.arena.spawnHitFlash(victim.x, victim.y, 0xaaff44);
          this.arena.showFloatingText(victim.x, victim.y - 26, `🌵 ${dmg}`, '#aaff66');
          this.registerDamage(s.owner, victim, dmg);
        }
      }
    }
  }

  /** Kit-internal projectiles (bacteria/viruses) also get stopped by opposing spore walls. */
  private hitOpposingSpore(owner: Owner, x: number, y: number, dmg: number): boolean {
    for (const s of this.spores) {
      if (s.owner === owner) continue;
      if (Phaser.Math.Distance.Between(x, y, s.x, s.y) <= this.sporeRadius(s) + 6) {
        this.absorbProjectileIntoSpore(s, dmg);
        return true;
      }
    }
    return false;
  }

  // ── DNA accumulation + pickups ─────────────────────────────────────

  private registerDamage(owner: Owner, target: Fighter, amount: number): void {
    if (amount <= 0) return;
    const map = owner === 'player' ? this.playerDmgAccum : this.npcDmgAccum;
    let total = (map.get(target) ?? 0) + amount;
    const threshold = this.dnaThreshold(owner);
    while (total >= threshold) {
      total -= threshold;
      this.spawnDnaPickup(target.x, target.y, owner);
    }
    map.set(target, total);
  }

  private spawnDnaPickup(x: number, y: number, owner: Owner): void {
    const { scene } = this.arena;
    const jx = x + (Math.random() * 30 - 15);
    const jy = y + (Math.random() * 30 - 15);
    const gfx = scene.add.text(jx, jy, '🧬', { fontSize: '16px' }).setOrigin(0.5).setDepth(9);

    // Sweating: DNA flies straight to you.
    if (owner === 'player' && this.lvl(this.fighterBody, 'sweating') > 0) {
      const p = this.arena.player;
      scene.tweens.add({
        targets: gfx, x: p.x, y: p.y, scale: 0.5, duration: 260, ease: 'Cubic.in',
        onComplete: () => { gfx.destroy(); this.addDna(owner, 1); },
      });
      return;
    }

    scene.tweens.add({ targets: gfx, y: jy - 6, yoyo: true, repeat: -1, duration: 500 });
    this.dnaPickups.push({ gfx, x: jx, y: jy, owner, expiresAt: scene.time.now + DNA_PICKUP_LIFESPAN });
  }

  private updateDnaPickups(time: number): void {
    const sweatingNow = this.lvl(this.fighterBody, 'sweating') > 0;
    for (let i = this.dnaPickups.length - 1; i >= 0; i--) {
      const p = this.dnaPickups[i];
      if (time >= p.expiresAt) { p.gfx.destroy(); this.dnaPickups.splice(i, 1); continue; }
      const collector = p.owner === 'player' ? this.arena.player : this.arena.npc;
      if (!collector.active) continue;
      const d = Phaser.Math.Distance.Between(p.x, p.y, collector.x, collector.y);
      if (d <= DNA_PICKUP_RADIUS || (p.owner === 'player' && sweatingNow)) {
        p.gfx.destroy();
        this.dnaPickups.splice(i, 1);
        this.addDna(p.owner, 1);
      }
    }
  }

  private addDna(owner: Owner, amount: number): void {
    // Mitosis (secret): the strand copies itself on the way in.
    if (owner === 'player' && this.hasSecret('mitosis') && Math.random() < MITOSIS_CHANCE) {
      amount *= 2;
      this.arena.showFloatingText(this.arena.player.x, this.arena.player.y - 36, '🧬 MITOSIS', '#66ffcc');
    }
    // Ruin's Combo Breaker halves every meter in the game — the DNA bar included.
    amount = meterGain(owner === 'player' ? this.arena.player : this.arena.npc, amount);
    if (owner === 'player') this.playerDna = Math.min(DNA_CAP, this.playerDna + amount);
    else this.npcDna = Math.min(DNA_CAP, this.npcDna + amount);
  }

  /** Floating DNA bar above the NPC's head — the player's own DNA lives on the HUD bar. */
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
    const w = 44, h = 5;
    const bx = fighter.x - w / 2;
    const by = fighter.y - 29;
    g.fillStyle(0x111111, 0.85);
    g.fillRect(bx - 1, by - 1, w + 2, h + 2);
    g.fillStyle(0x44ddaa, 1);
    g.fillRect(bx, by, w * (this.npcDna / DNA_CAP), h);
  }

  /** DNA bar pinned to the HUD, just below the top-of-screen HP bar (player only). */
  private drawDnaHudBar(): void {
    if (this.arena.elementId !== 'growth') {
      if (this.dnaHudBarBg) { this.dnaHudBarBg.destroy(); this.dnaHudBarBg = null; }
      if (this.dnaHudBarFill) { this.dnaHudBarFill.destroy(); this.dnaHudBarFill = null; }
      if (this.dnaHudBarText) { this.dnaHudBarText.destroy(); this.dnaHudBarText = null; }
      return;
    }
    const { scene, width } = this.arena;
    const barY = this.arena.hpBarY + this.arena.hpBarH / 2 + 8;
    const barH = 10;
    const left = width / 2 - this.arena.hpBarW / 2;
    if (!this.dnaHudBarBg) {
      this.dnaHudBarBg = scene.add.rectangle(width / 2, barY, this.arena.hpBarW + 4, barH + 4, 0x0a0a18, 0.9)
        .setStrokeStyle(2, 0x445577).setDepth(20);
      this.dnaHudBarFill = scene.add.rectangle(left, barY, 0, barH, 0x44ddaa, 1)
        .setOrigin(0, 0.5).setDepth(21);
      this.dnaHudBarText = scene.add
        .text(width / 2, barY, '', {
          fontSize: '11px',
          fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif',
          color: '#ffffff',
          stroke: '#000000',
          strokeThickness: 3,
        })
        .setOrigin(0.5)
        .setDepth(22);
    }
    if (this.dnaHudBarFill) {
      this.dnaHudBarFill.setSize(this.arena.hpBarW * Math.min(1, this.playerDna / DNA_CAP), barH);
    }
    if (this.dnaHudBarText) {
      const bodyTag = this.fighterBody.isCloneBody ? '  (clone body)' : '';
      this.dnaHudBarText.setText(`\u{1F9EC} ${this.playerDna} / ${DNA_CAP}${bodyTag}`);
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
        this.arena.showFloatingText(p.x, p.y - 40, '💔 Chitin shattered', '#cc8855');
        this.applyFighterTint();
      } else if (!fb.chitinUp && time - fb.chitinDownAt >= CHITIN_REGEN_MS) {
        fb.chitinUp = true;
        p.shieldHp += CHITIN_SHIELD_HP;
        this.arena.showFloatingText(p.x, p.y - 40, '🛡 Chitin regrown', '#ddaa66');
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
      this.arena.spawnHitFlash(t.x, t.y, 0x8a5a2b);
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
    this.arena.showFloatingText(caster.x, caster.y - 40, '🧬 Clone hatched!', '#88bb22');
  }

  private updateClones(time: number, delta: number): void {
    for (let i = this.clones.length - 1; i >= 0; i--) {
      const c = this.clones[i];
      if (c.hp <= 0) {
        this.arena.spawnHitFlash(c.sprite.x, c.sprite.y, GROWTH.lime);
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
          this.arena.spawnHitFlash(c.sprite.x, c.sprite.y, 0xff4444);
          break;
        }
      }

      // Chitin ring visual
      if (this.lvl(c.body, 'chitin-shell') > 0 && c.body.chitinUp) {
        if (!c.chitinRing) {
          c.chitinRing = this.arena.scene.add.circle(c.sprite.x, c.sprite.y, 24, 0x000000, 0)
            .setStrokeStyle(3, CHITIN_TINT, 0.85).setDepth(6) as Phaser.GameObjects.Arc;
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
    const base = scene.add.ellipse(0, 0, 62, 40, 0x3f7a1f, 0.85);
    const blob1 = scene.add.ellipse(-18, 6, 26, 16, 0x4f8a2a, 0.8);
    const blob2 = scene.add.ellipse(16, -8, 22, 14, 0x356a18, 0.8);
    container.add([base, blob1, blob2]);
    // Random eyes staring out of the soup…
    for (let i = 0; i < 3; i++) {
      const ex = Phaser.Math.Between(-20, 20);
      const ey = Phaser.Math.Between(-12, 12);
      const white = scene.add.circle(ex, ey, 3.2, 0xffffff, 0.95) as Phaser.GameObjects.Arc;
      const pupil = scene.add.circle(ex + Phaser.Math.Between(-1, 1), ey + Phaser.Math.Between(-1, 1), 1.4, 0x111111, 1) as Phaser.GameObjects.Arc;
      container.add([white, pupil]);
    }
    // …and stray teeth.
    for (let i = 0; i < 4; i++) {
      const tx = Phaser.Math.Between(-22, 22);
      const ty = Phaser.Math.Between(-13, 13);
      const tooth = scene.add.triangle(tx, ty, 0, -4, 3, 3, -3, 3, 0xf5f0dd, 0.95);
      tooth.setRotation(Math.random() * Math.PI * 2);
      container.add(tooth);
    }
    this.puddles.push({ container, x, y, owner, levels: { ...levels } });
    this.arena.showFloatingText(x, y - 24, '🍲 Primordial soup', '#77cc55');
  }

  // ── Evolve tree: buy / sell / UI ─────────────────────────────────────

  private tryActivateEvolveInvincibility(): void {
    const { player, scene } = this.arena;
    const now = scene.time.now;
    if (now < this.evolveInvincibleCooldownUntil) return;
    this.evolveInvincibleActive = true;
    this.evolveInvincibleEndsAt = now + EVOLVE_INVINCIBLE_DURATION;
    this.evolveInvincibleCooldownUntil = now + EVOLVE_INVINCIBLE_COOLDOWN;
    player.isInvincible = true;
    player.setTint(EVOLVE_INVINCIBLE_TINT);
    // The body goes dormant: a shell of pods folds inward over it.
    this.playerAvatar?.play('flex');
    this.pfx.bloom(player.x, player.y, 40, 11, 4, CULTURE_TONES);
    this.pfx.channelIncubate(player.x, player.y, 48, EVOLVE_INVINCIBLE_DURATION,
      () => (player.active ? { x: player.x, y: player.y } : null), 3, CULTURE_TONES);
    this.arena.showFloatingText(player.x, player.y - 40, '🛡 Invincible', '#cccccc');
  }

  private endEvolveInvincibility(): void {
    if (!this.evolveInvincibleActive) return;
    this.evolveInvincibleActive = false;
    this.arena.player.isInvincible = false;
    this.arena.player.clearTint();
    this.applyFighterTint();
  }

  private closeEvolve(): void {
    this.evolveOpen = false;
    this.endEvolveInvincibility();
    if (this.evolveGfx) { this.evolveGfx.destroy(); this.evolveGfx = null; }
    for (const l of this.evolveLabels) l.destroy();
    this.evolveLabels = [];
    this.evolveAreas = [];
  }

  /** True while a second, cyclable tree exists — i.e. Syringe Shot is bound this match. */
  private hasSickTree(): boolean {
    return this.arena.masteryActive && this.syringeSlot() !== null;
  }

  /** Apex (secret) shaves DNA off third tiers and Ultimates in both trees. */
  private apexOwned(): boolean {
    return this.hasSecret('apex');
  }

  private renderEvolve(): void {
    if (this.evolveGfx) this.evolveGfx.destroy();
    for (const l of this.evolveLabels) l.destroy();
    this.evolveLabels = [];
    this.evolveAreas = [];

    const { scene } = this.arena;
    const W = scene.scale.width, H = scene.scale.height;
    const gfx = scene.add.graphics().setDepth(40);
    this.evolveGfx = gfx;
    const body = this.fighterBody;

    gfx.fillStyle(0x000000, 0.78);
    gfx.fillRect(0, 0, W, H);

    const showTabs = this.hasSickTree();
    if (!showTabs) this.evolveTab = 'body';
    const sickTab = this.evolveTab === 'sickness';

    const panelW = Math.min(660, W - 30);
    const panelX = W / 2 - panelW / 2;
    const panelY = 34;
    const colW = panelW / 3;
    const cardW = colW - 14;
    const cardH = 58;
    const rowGap = 64;
    const hasUltimateUpgrade = this.arena.hasUpgrade('e');
    const rows = hasUltimateUpgrade ? 5 : 4;
    const extraRows = sickTab ? 0
      : (body.isCloneBody ? 1 : 0) + (this.arena.masteryActive && this.secretRoll.length > 0 ? 1 : 0);
    const panelH = 66 + (showTabs ? 26 : 0) + rows * rowGap + extraRows * (rowGap + 10) + 34;

    const accent = sickTab ? 0x8a2a2a : 0x4a8a2a;
    gfx.fillStyle(sickTab ? 0x1a0808 : 0x0c1808, 0.94);
    gfx.fillRoundedRect(panelX - 10, panelY - 6, panelW + 20, panelH, 14);
    gfx.lineStyle(2, accent, 0.9);
    gfx.strokeRoundedRect(panelX - 10, panelY - 6, panelW + 20, panelH, 14);

    const titleText = sickTab ? '🩸 SICKNESS'
      : body.isCloneBody ? '🧬 EVOLVE — CLONE BODY' : '🧬 EVOLVE';
    const title = scene.add.text(W / 2, panelY + 10, titleText, {
      fontSize: '17px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
      color: sickTab ? '#ff8899' : body.isCloneBody ? '#ffcc88' : '#aaffcc',
    }).setOrigin(0.5).setDepth(41);
    const dnaText = scene.add.text(W / 2, panelY + 30, `\u{1F9EC} DNA: ${this.playerDna}/${DNA_CAP}`, {
      fontSize: '13px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif', color: '#44ddaa',
    }).setOrigin(0.5).setDepth(41);
    this.evolveLabels.push(title, dnaText);

    let topY = panelY + 48;
    if (showTabs) {
      this.drawEvolveTabs(gfx, W, panelY + 50);
      topY += 26;
    }

    const bottomY = sickTab
      ? this.renderSickTree(gfx, panelX, topY, colW, cardW, cardH, rowGap, hasUltimateUpgrade)
      : this.renderBodyTree(gfx, panelX, topY, colW, cardW, cardH, rowGap, hasUltimateUpgrade, W);

    const hint = scene.add.text(W / 2, bottomY + 2,
      showTabs
        ? 'Click: buy   Right-click: sell (needs Fast Evolution)   Click a tab to swap trees   [E] Close'
        : 'Click: buy   Right-click: sell (needs Fast Evolution)   SPACE: swap bodies   [E] Close', {
        fontSize: '11px', fontFamily: 'Arial', color: '#cccccc',
      }).setOrigin(0.5).setDepth(41);
    this.evolveLabels.push(hint);
  }

  private drawEvolveTabs(gfx: Phaser.GameObjects.Graphics, W: number, y: number): void {
    const { scene } = this.arena;
    const tabW = 130, tabH = 22;
    const tabs: Array<{ id: 'body' | 'sickness'; label: string; color: number }> = [
      { id: 'body', label: '🧬 BODY', color: 0x4a8a2a },
      { id: 'sickness', label: '🩸 SICKNESS', color: 0x8a2a2a },
    ];
    tabs.forEach((t, i) => {
      const cx = W / 2 + (i - 0.5) * (tabW + 8);
      const bx = cx - tabW / 2;
      const on = this.evolveTab === t.id;
      gfx.fillStyle(on ? t.color : 0x1a1a1a, on ? 0.9 : 0.8);
      gfx.fillRoundedRect(bx, y - tabH / 2, tabW, tabH, 6);
      gfx.lineStyle(2, t.color, on ? 1 : 0.5);
      gfx.strokeRoundedRect(bx, y - tabH / 2, tabW, tabH, 6);
      const lbl = scene.add.text(cx, y, t.label, {
        fontSize: '11px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif', color: on ? '#ffffff' : '#999999',
      }).setOrigin(0.5).setDepth(41);
      this.evolveLabels.push(lbl);
      this.evolveAreas.push({ id: `__tab:${t.id}`, x: bx, y: y - tabH / 2, w: tabW, h: tabH });
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
    gfx.fillStyle(fillCol, 0.96);
    gfx.fillRoundedRect(bx, ny - cardH / 2, cardW, cardH, 8);
    gfx.lineStyle(2, node.isUltimate ? 0xffcc44 : affordable ? pathColor : 0x3a5a3a, node.isUltimate || affordable ? 1 : 0.7);
    gfx.strokeRoundedRect(bx, ny - cardH / 2, cardW, cardH, 8);

    const nameLabel = scene.add.text(bx + 7, ny - cardH / 2 + 5, `${node.isUltimate ? '★ ' : ''}${node.name}`, {
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
    const descLabel = scene.add.text(bx + 7, ny - cardH / 2 + 21, node.description, {
      fontSize: '9px', fontFamily: 'Arial', color: '#aaccaa',
      wordWrap: { width: cardW - 40 }, maxLines: 3,
    }).setOrigin(0, 0).setDepth(41);
    this.evolveLabels.push(nameLabel, costLabel, descLabel);

    // Tier pips (bottom-right)
    for (let t = 0; t < maxLevel; t++) {
      const px = bx + cardW - 10 - (maxLevel - 1 - t) * 10;
      const py = ny + cardH / 2 - 9;
      gfx.fillStyle(t < level ? 0x88ff66 : 0x2a442a, 1);
      gfx.fillCircle(px, py, 3.2);
      gfx.lineStyle(1, 0x5a8a4a, 0.9);
      gfx.strokeCircle(px, py, 3.2);
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
        fontSize: '13px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif', color: cssColor,
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

        // Connector down to the next node
        if (rowIdx < nodes.length - 1) {
          gfx.lineStyle(2, path.color, 0.35);
          gfx.lineBetween(cx, ny + cardH / 2, cx, ny + rowGap - cardH / 2);
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
        fontSize: '9px', fontFamily: 'Arial', color: '#ccaa88', wordWrap: { width: cardW - 40 }, maxLines: 3,
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
          fontSize: '9px', fontFamily: 'Arial', color: '#bbaacc',
          wordWrap: { width: cardW - 14 }, maxLines: 3,
        }).setOrigin(0, 0).setDepth(41);
        this.evolveLabels.push(nameLabel, costLabel, descLabel);
        this.evolveAreas.push({ id: `__secret:${id}`, x: bx, y: rowY - cardH / 2, w: cardW, h: cardH });
      });
      bottomY = rowY + cardH / 2 + 20;
    }

    return bottomY;
  }

  private renderSickTree(
    gfx: Phaser.GameObjects.Graphics,
    panelX: number, topY: number, colW: number, cardW: number, cardH: number,
    rowGap: number, hasUltimateUpgrade: boolean,
  ): number {
    const { scene } = this.arena;
    const fastTier = this.lvl(this.fighterBody, 'fast-evolution');
    const apex = this.apexOwned();

    GROWTH_SICK_PATHS.forEach((path, colIdx) => {
      const cx = panelX + colW * colIdx + colW / 2;
      const cssColor = `#${path.color.toString(16).padStart(6, '0')}`;
      const pathLabel = scene.add.text(cx, topY, path.name.toUpperCase(), {
        fontSize: '13px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif', color: cssColor,
      }).setOrigin(0.5).setDepth(41);
      this.evolveLabels.push(pathLabel);

      const prereqMaxed = (this.sickLevels[GROWTH_SICK_ULTIMATE_PREREQ[path.id]] ?? 0) >= GROWTH_EVOLVE_MAX_LEVEL;
      const nodes = GROWTH_SICK_NODES
        .filter((n) => n.path === path.id && (!n.isUltimate || hasUltimateUpgrade))
        .sort((a, b) => a.row - b.row);

      nodes.forEach((node, rowIdx) => {
        const ny = topY + 18 + rowIdx * rowGap;
        const level = this.sickLevels[node.id] ?? 0;
        const maxLevel = node.isUltimate ? 1 : GROWTH_EVOLVE_MAX_LEVEL;
        const cost = node.isUltimate
          ? growthEvolveUltimateCost(fastTier, apex)
          : growthEvolveNodeCost(level, node.row, fastTier, apex);

        if (rowIdx < nodes.length - 1) {
          gfx.lineStyle(2, path.color, 0.35);
          gfx.lineBetween(cx, ny + cardH / 2, cx, ny + rowGap - cardH / 2);
        }

        this.drawNodeCard(gfx, node, cx, ny, cardW, cardH, {
          level, maxLevel, cost,
          prereqLocked: !!node.isUltimate && level < maxLevel && !prereqMaxed,
          otherChosenLocked: !!node.isUltimate && level < maxLevel && prereqMaxed
            && GROWTH_SICK_ULTIMATE_IDS.some((oid) => oid !== node.id && (this.sickLevels[oid] ?? 0) > 0),
          pathColor: path.color,
        });
      });
    });

    return topY + 18 + (hasUltimateUpgrade ? 5 : 4) * rowGap;
  }

  private handleEvolveClick(px: number, py: number, isSell: boolean): void {
    for (const area of this.evolveAreas) {
      if (px < area.x || px > area.x + area.w || py < area.y || py > area.y + area.h) continue;
      if (area.id.startsWith('__tab:')) {
        if (!isSell) this.evolveTab = area.id.slice(6) as 'body' | 'sickness';
      } else if (area.id.startsWith('__secret:')) {
        if (isSell) {
          this.arena.showFloatingText(this.arena.player.x, this.arena.player.y - 30, 'Permanent — cannot sell', '#ff6666');
        } else {
          this.buySecretUpgrade(area.id.slice(9));
        }
      } else if (this.evolveTab === 'sickness') {
        if (isSell) this.sellSickNode(area.id);
        else this.buySickNode(area.id);
      } else if (isSell) {
        this.sellEvolveNode(area.id);
      } else {
        this.buyEvolveNode(area.id);
      }
      this.renderEvolve();
      return;
    }
  }

  // ── Sickness tree: buy / sell ────────────────────────────────────────

  private buySickNode(id: string): void {
    const { player } = this.arena;
    const def = GROWTH_SICK_NODES.find((n) => n.id === id);
    if (!def) return;
    const level = this.sickLevels[id] ?? 0;
    const fastTier = this.lvl(this.fighterBody, 'fast-evolution');
    const apex = this.apexOwned();

    if (def.isUltimate) {
      if (level > 0) return;
      if ((this.sickLevels[GROWTH_SICK_ULTIMATE_PREREQ[def.path]] ?? 0) < GROWTH_EVOLVE_MAX_LEVEL) {
        this.arena.showFloatingText(player.x, player.y - 30, 'Max Tier 4 first', '#ff6666');
        return;
      }
      if (GROWTH_SICK_ULTIMATE_IDS.some((oid) => oid !== id && (this.sickLevels[oid] ?? 0) > 0)) {
        this.arena.showFloatingText(player.x, player.y - 30, 'Already chose an Ultimate', '#ff6666');
        return;
      }
      const cost = growthEvolveUltimateCost(fastTier, apex);
      if (this.playerDna < cost) {
        this.arena.showFloatingText(player.x, player.y - 30, 'Not enough DNA', '#ff6666');
        return;
      }
      this.playerDna -= cost;
      this.sickLevels[id] = 1;
      this.arena.recordMasteryStat('upgrades', 1);
      this.arena.showFloatingText(player.x, player.y - 30, `${def.name} unlocked!`, '#ffdd44');
      return;
    }

    if (level >= GROWTH_EVOLVE_MAX_LEVEL) return;
    const cost = growthEvolveNodeCost(level, def.row, fastTier, apex);
    if (this.playerDna < cost) {
      this.arena.showFloatingText(player.x, player.y - 30, 'Not enough DNA', '#ff6666');
      return;
    }
    this.playerDna -= cost;
    this.sickLevels[id] = level + 1;
    this.arena.recordMasteryStat('upgrades', 1);
    this.arena.showFloatingText(player.x, player.y - 30, `${def.name} ${level + 1}/3`, '#ff8899');
  }

  private sellSickNode(id: string): void {
    const { player } = this.arena;
    const def = GROWTH_SICK_NODES.find((n) => n.id === id);
    if (!def) return;
    if (def.isUltimate) {
      this.arena.showFloatingText(player.x, player.y - 30, 'Permanent — cannot sell', '#ff6666');
      return;
    }
    const fastTier = this.lvl(this.fighterBody, 'fast-evolution');
    if (fastTier <= 0) {
      this.arena.showFloatingText(player.x, player.y - 30, 'Need Fast Evolution', '#ff6666');
      return;
    }
    const level = this.sickLevels[id] ?? 0;
    if (level <= 0) return;
    const cost = growthEvolveNodeCost(level - 1, def.row, fastTier, this.apexOwned());
    const refund = Math.floor(cost * growthEvolveSellRefundFraction(fastTier));
    this.sickLevels[id] = level - 1;
    this.playerDna = Math.min(DNA_CAP, this.playerDna + refund);
    this.arena.showFloatingText(player.x, player.y - 30, `Sold, +${refund} \u{1F9EC}`, '#ffdd66');
  }

  private buyEvolveNode(id: string): void {
    const { player } = this.arena;
    const body = this.fighterBody;

    if (id === GROWTH_CLONE_MATURITY_ID) {
      const level = this.lvl(body, id);
      if (level >= GROWTH_CLONE_MATURITY_MAX_LEVEL) return;
      if (this.playerDna < GROWTH_CLONE_MATURITY_COST) {
        this.arena.showFloatingText(player.x, player.y - 30, 'Not enough DNA', '#ff6666');
        return;
      }
      this.playerDna -= GROWTH_CLONE_MATURITY_COST;
      body.levels[id] = level + 1;
      player.increaseMaxHp(GROWTH_CLONE_MATURITY_HP_PER_TIER);
      player.heal(GROWTH_CLONE_MATURITY_HP_PER_TIER);
      this.arena.recordMasteryStat('upgrades', 1);
      this.arena.showFloatingText(player.x, player.y - 30, `${GROWTH_CLONE_MATURITY_NAME} ${level + 1}/3`, '#ffcc99');
      return;
    }

    const def = GROWTH_EVOLVE_NODES.find((n) => n.id === id);
    if (!def) return;
    if (def.isUltimate) { this.buyUltimateNode(def); return; }

    const level = this.lvl(body, id);
    if (level >= GROWTH_EVOLVE_MAX_LEVEL) return;
    const cost = growthEvolveNodeCost(level, def.row, this.lvl(body, 'fast-evolution'), this.apexOwned());
    if (this.playerDna < cost) {
      this.arena.showFloatingText(player.x, player.y - 30, 'Not enough DNA', '#ff6666');
      return;
    }
    this.playerDna -= cost;
    body.levels[id] = level + 1;
    this.onNodeChanged(id);
    this.arena.recordMasteryStat('upgrades', 1);
    this.arena.showFloatingText(player.x, player.y - 30, `${def.name} ${level + 1}/3`, '#88ffaa');
  }

  /** Ultimates: single tier, flat DNA cost, one per body per match, row-4 prereq maxed. */
  private buyUltimateNode(def: GrowthEvolveNodeDef): void {
    const { player } = this.arena;
    const body = this.fighterBody;
    if (this.lvl(body, def.id) > 0) return;
    if (this.lvl(body, GROWTH_EVOLVE_ULTIMATE_PREREQ[def.path]) < GROWTH_EVOLVE_MAX_LEVEL) {
      this.arena.showFloatingText(player.x, player.y - 30, 'Max Tier 4 first', '#ff6666');
      return;
    }
    if (GROWTH_EVOLVE_ULTIMATE_IDS.some((oid) => oid !== def.id && this.lvl(body, oid) > 0)) {
      this.arena.showFloatingText(player.x, player.y - 30, 'Already chose an Ultimate', '#ff6666');
      return;
    }
    const cost = growthEvolveUltimateCost(this.lvl(body, 'fast-evolution'), this.apexOwned());
    if (this.playerDna < cost) {
      this.arena.showFloatingText(player.x, player.y - 30, 'Not enough DNA', '#ff6666');
      return;
    }
    this.playerDna -= cost;
    body.levels[def.id] = 1;
    this.onNodeChanged(def.id);
    this.arena.recordMasteryStat('upgrades', 1);
    this.arena.recordMasteryBest(`finalUL_${def.id}`, 1);
    const distinctUltimates = GROWTH_EVOLVE_ULTIMATE_IDS.reduce((n, uid) => n + (this.arena.getMasteryStat(`finalUL_${uid}`) > 0 ? 1 : 0), 0);
    this.arena.recordMasteryBest('finalUpgrades', distinctUltimates);
    this.arena.showFloatingText(player.x, player.y - 30, `${def.name} unlocked!`, '#ffdd44');
  }

  private sellEvolveNode(id: string): void {
    const { player } = this.arena;
    const body = this.fighterBody;
    const def = GROWTH_EVOLVE_NODES.find((n) => n.id === id);
    if (def?.isUltimate || id === GROWTH_CLONE_MATURITY_ID) {
      this.arena.showFloatingText(player.x, player.y - 30, 'Permanent — cannot sell', '#ff6666');
      return;
    }
    if (!def) return;
    const fastTier = this.lvl(body, 'fast-evolution');
    if (fastTier <= 0) {
      this.arena.showFloatingText(player.x, player.y - 30, 'Need Fast Evolution', '#ff6666');
      return;
    }
    const level = this.lvl(body, id);
    if (level <= 0) return;
    const cost = growthEvolveNodeCost(level - 1, def.row, fastTier, this.apexOwned());
    const refund = Math.floor(cost * growthEvolveSellRefundFraction(fastTier));
    body.levels[id] = level - 1;
    this.onNodeChanged(id);
    this.playerDna = Math.min(DNA_CAP, this.playerDna + refund);
    this.arena.showFloatingText(player.x, player.y - 30, `Sold, +${refund} \u{1F9EC}`, '#ffdd66');
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
