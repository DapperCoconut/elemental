import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { CastContext } from '../Ability';
import type { CustomStatus } from './StatusHudKit';
import { Sfx } from '../../audio';
import {
  FOOD, FORAGEABLE, FORAGEABLE_PLUS, FoodKind, GLT, GluttonyAvatar, GluttonyColorFn, GluttonyFx,
  RAT_LARDER, charcoalLump, chefCleaver, cookRing, foodColor, gobbet as drawGobbet, grillHeat,
  grillRig, hungerBar, itemShape, jitter, kitchenKnife, mawBody, mawTentacle, prepSlot,
  ratBody, ratHole, skewerShape, spatter, stewPot,
} from './GluttonyVisuals';
import { meterGain } from '../../combat/Meters';

type Owner = 'player' | 'npc';
export type GluttonyForm = 'chef' | 'butcher';

const ARENA_PAD = 32;

// ── The grill ────────────────────────────────────────────────────────────────
/** Drawing radius. The reach below is what actually matters in play. */
const GRILL_R = 30;
/** How close you have to stand to heat a blade or collect what is on the grate. */
const GRILL_REACH = 66;
const GRILL_SLOTS = 4;
const SUPERHEAT_MS = 6000;
/** Where the four things on the grate sit, relative to its centre. */
const SLOT_OFFSETS: Array<[number, number]> = [[-17, -7], [17, -7], [-17, 8], [17, 8]];

// ── Click: the knife ─────────────────────────────────────────────────────────
const KNIFE_HEAT_MS = 2000;
const KNIFE_DAMAGE = 25;
const KNIFE_HOT_DAMAGE = 35;
/** What a heated blade does to somebody Charcoal Chuck has already burnt. */
const BURNT_KNIFE_MULT = 1.5;
const KNIFE_SPEED = 780;
const KNIFE_LIFE_MS = 1500;
const KNIFE_HIT_R = 22;

// ── E: Forage ────────────────────────────────────────────────────────────────
const FORAGE_MS = 2000;
const FORAGE_SPEED_MULT = 0.5;
const INV_SLOTS = 6;

// ── R: Charcoal Chuck ────────────────────────────────────────────────────────
const COAL_SPEED = 560;
const COAL_LIFE_MS = 1900;
const COAL_DAMAGE = 15;
const COAL_HIT_R = 24;
const BURNT_MS = 8000;

// ── Thrown food and what is left on the floor ────────────────────────────────
const FOOD_SPEED = 540;
const FOOD_LIFE_MS = 1300;
const DROP_LIFE_MS = 30000;
const PICKUP_R = 36;

// ── Q: Feast ─────────────────────────────────────────────────────────────────
const FEAST_MS = 3000;
const FEAST_MULT = 2;

// ── F: Special Ingredient ────────────────────────────────────────────────────
const HUNGER_MAX = 30000;
/** Milliseconds off the hunger bar per point of damage the butcher refuses to feel. */
const HUNGER_PER_DAMAGE = 200;

// ── Butcher click: Cleave ────────────────────────────────────────────────────
const CLEAVE_DAMAGE = 30;
const CLEAVE_REACH = 110;
const CLEAVE_HALF_ARC = 1.15;

// ── Butcher E: Poach ─────────────────────────────────────────────────────────
const SKEWER_SPEED = 720;
const SKEWER_DAMAGE = 15;
const SKEWER_LEN = 84;
const SKEWER_HIT_R = 26;
/** How long a landed skewer waits to be walked over. */
const SKEWER_REST_MS = 22000;
const SKEWER_EMPTY_MS = 1800;

// ── Butcher R: Cannibalize ───────────────────────────────────────────────────
const BITE_REACH = 94;
const BITE_DASH_SPEED = 620;
const BITE_DASH_MS = 150;
const BITE_HEAL = 15;
const BITE_HUNGER_MS = 3000;
const FRENZY_MS = 6000;

// ── The maw ──────────────────────────────────────────────────────────────────
const MAW_SHOT_MS = 1000;
const MAW_DAMAGE = 5;
const MAW_FRENZY_DAMAGE = 10;
const GOBBET_SPEED = 390;
const GOBBET_LIFE_MS = 2800;
const GOBBET_HIT_R = 20;

// ── Butcher Q: Maw Awakening ─────────────────────────────────────────────────
const AWAKEN_BASE_MS = 3000;
const AWAKEN_BONUS: Record<FoodKind, number> = {
  mushroom: 3000, carrot: 1000, potato: 5000, meat: 10000,
  // Head Chef's four, priced the way the original four are: roughly a second per 5 HP the
  // maw would otherwise have had to earn. Leftovers are scraps and the maw knows it.
  berries: 1000, mint: 3000, pineapple: 6000, deathcap: 8000, leftovers: 1000,
  // Chef's Friend's three, priced off the same table. A pie is worth more than its healing
  // says because eating one is also a run speed, and the maw is buying the whole item.
  bread: 6000, cheese: 4000, pie: 7000,
};
const AWAKEN_SPEED = 165;
const AWAKEN_WHIP_MS = 1000;
const AWAKEN_WHIP_REACH = 120;
const AWAKEN_WHIP_DAMAGE = 15;
const AWAKEN_BARRAGE_MS = 1400;
const AWAKEN_BARRAGE_COUNT = 5;
const AWAKEN_BULLET_DAMAGE = 6;

// ── Click+: Cleave ───────────────────────────────────────────────────────────
/** How long a cleaver stays red once it comes off the coals — including in flight. */
const CLEAVER_HOT_MS = 4000;
const CLEAVE_HASTE_MS = 2000;
const CLEAVE_HASTE_MULT = 1.25;

// ── E+: Head Chef ────────────────────────────────────────────────────────────
/** Weight of a `rare` larder entry against 1 for everything else on the forage table. */
const RARE_WEIGHT = 0.34;
/** How long something sits on the maw before it is worth throwing at somebody. */
const ROT_MS = 6000;
const ROT_SLOTS = 4;
/** Winter Mint is the one rotten item priced off the target rather than off a table. */
const ROT_MINT_PCT = 0.15;

/**
 * What eating an ingredient does beyond healing. Head Chef's four are the only entries: the
 * original larder is pure sustain, and that is the point of paying for the upgrade.
 */
interface FoodBuff {
  /** Outgoing damage multiplier while it lasts. */
  dmg?: number;
  /** Incoming damage multiplier while it lasts. */
  resist?: number;
  /** Walk speed multiplier while it lasts. */
  speed?: number;
  ms: number;
  label: string;
  color: number;
}

const FOOD_BUFF: Partial<Record<FoodKind, { raw?: FoodBuff; cooked?: FoodBuff }>> = {
  berries: {
    raw: { dmg: 1.20, ms: 8000, label: '🫐 +20% DAMAGE', color: GLT.berry },
    cooked: { dmg: 1.35, ms: 8000, label: '🫐 +35% DAMAGE', color: GLT.berry },
  },
  mint: {
    // Cooking a winter mint is a mistake, and it has to be a visible one: the buff is gone.
    raw: { resist: 0.80, ms: 8000, label: '🍃 −20% DAMAGE TAKEN', color: GLT.mint },
  },
  deathcap: {
    raw: { speed: 1.25, ms: 8000, label: '☠️ +25% SPEED', color: GLT.venom },
    cooked: { speed: 1.35, ms: 8000, label: '☠️ +35% SPEED', color: GLT.venom },
  },
  // Chef's Friend's pie. The one entry whose raw and cooked halves are identical: what the oven
  // adds to a pie is 30 more healing, and the run is the pie itself.
  pie: {
    raw: { speed: 1.20, ms: 8000, label: '🥧 +20% SPEED', color: GLT.pieCrust },
    cooked: { speed: 1.20, ms: 8000, label: '🥧 +20% SPEED', color: GLT.pieCrust },
  },
};

// ── R+: Pit Master ───────────────────────────────────────────────────────────
/** Blue coals cook and heat at this rate instead of the orange 2×. */
const BLUE_SUPERHEAT_RATE = 3;
/**
 * The second pass, as a fraction of the ingredient's own cook time. Over-searing is a stage
 * *after* cooking, not a longer cook: the thing finishes, goes collectable, and only keeps
 * going if you leave it there — so the cost of the extra 25% is the walk you did not take.
 */
const OVERSEAR_EXTRA = 0.5;
const OVERSEAR_HEAL_MULT = 1.25;
const OVERSEAR_BUFF_BONUS_MS = 3000;
const ICHOR_MS = 5000;
/** Milliseconds of butcher form per point of ichorous cleaver damage — 25 damage = 1 second. */
const ICHOR_HUNGER_PER_DAMAGE = 40;

// ── F+: Murderous Intent ─────────────────────────────────────────────────────
/** Fraction of Special Ingredient's cooldown that transforming back knocks off. */
const RETURN_CD_REFUND = 0.2;
const MAW_CONE_COUNT = 5;
const MAW_CONE_SPREAD = 0.19;
/** The vulnerability a cone bullet stacks onto whatever it lands on. */
const MAW_VULN_MULT = 1.15;
const MAW_VULN_MS = 2000;
const MAW_GRAB_MS = 10000;
const MAW_GRAB_RANGE = 300;
const MAW_GRAB_STUN_MS = 2000;
const MAW_BITE_MS = 1600;
const MAW_BITE_REACH = 78;
const MAW_BITE_DAMAGE = 30;

// ── Q+: Resourceful ──────────────────────────────────────────────────────────
const LEFTOVER_COUNT = 2;
const LEFTOVER_FRESH_PCT = 0.12;
const LEFTOVER_RESTED_PCT = 0.25;
const LEFTOVER_REST_MS = 25000;
/** Everything a dread maw does hits this much harder. */
const DREAD_DAMAGE_MULT = 1.5;
/** The band along each screen edge the dread maw's tentacles fill. */
const TENDRIL_BAND = 30;
const TENDRIL_DAMAGE = 8;
const TENDRIL_TICK_MS = 500;
const SCREAM_MS = 5000;
const SCREAM_DAMAGE = 35;
const SCREAM_RADIUS = 240;
const SCREAM_STUN_MS = 2000;

// ── Mastery passive: Snacking ────────────────────────────────────────────────
/** Health a second with nothing at all on the strip. */
const SNACK_MIN_RATE = 1;
/** …and with a strip worth {@link SNACK_FULL_POOL} of healing or more. */
const SNACK_MAX_RATE = 9;
const SNACK_FULL_POOL = 200;

// ── Mastery ability: Chef's Friend ───────────────────────────────────────────
const RAT_COOLDOWN_MS = 14000;
/** Drawing radius of the hole in the wall. */
const HOLE_R = 17;
/** How close a thrown item has to land to go down the hole. */
const HOLE_CATCH_R = 44;
/** …and to go into the rat instead, once the rat is the one standing there. */
const RAT_CATCH_R = 36;
/** How long the rat is gone for while it turns something cooked into something else. */
const HOLE_SWAP_MS = 1200;
const RAT_FETCH_SPEED = 360;
const RAT_ROAM_SPEED = 175;
/** How close the rat has to get to pick a thing up or hand it over. */
const RAT_REACH = 26;
/** An errand that finds nothing where it was going gives up after this long. */
const RAT_FETCH_MS = 6000;
const RAT_SLASH_MS = 1100;
const RAT_SLASH_DAMAGE = 12;
const RAT_SLASH_REACH = 46;
/** How far out the rat will break off a fight to go and collect something. */
const RAT_ERRAND_RANGE = 280;
const RAT_FEED_MAX = 4;
const RAT_DAMAGE_PER_FEED = 0.25;
const RAT_SPEED_PER_FEED = 0.15;
/** What one mouthful buys it once butcher form is over. */
const RAT_STAY_MS = 12000;
/** A whistled sic doubles the next slash it lands. */
const RAT_SIC_MULT = 2;
const RAT_SIC_MS = 4000;
/** How often the bot considers whistling, or throwing something at its own rat. */
const NPC_RAT_CHECK_MS = 700;

/**
 * The eight ingredients "The Whole Larder" counts. Leftovers are a by-product of the Feast and
 * the rat's own three cannot be reached without the mastery that the requirement unlocks, so
 * neither belongs in a checklist you are asked to finish before you own any of it.
 */
const LARDER_KINDS: FoodKind[] = [
  'mushroom', 'carrot', 'potato', 'meat', 'berries', 'mint', 'pineapple', 'deathcap',
];

// ── HUD ──────────────────────────────────────────────────────────────────────
/** Screen space, top-left, clear of the centre health bar and the top-right status tray. */
const HUD_X = 16;
const HUD_Y = 46;
const SLOT_SIZE = 34;
const SLOT_GAP = 4;
const HUD_W = INV_SLOTS * SLOT_SIZE + (INV_SLOTS - 1) * SLOT_GAP;
/** The blade's own tile, set apart from the six ingredients by a wider gap. */
const KNIFE_TILE_X = HUD_X + HUD_W + 12;
const KNIFE_TILE = -2;
const HUNGER_Y = HUD_Y + SLOT_SIZE + 8;
const HUNGER_H = 15;

// ── World objects ────────────────────────────────────────────────────────────

interface InvItem {
  kind: FoodKind;
  cooked: boolean;
  /** Head Chef (E+): it spent time on the maw instead of the grill. A weapon, not a meal. */
  rotten?: boolean;
  /** Pit Master (R+): it went round the grate a second time. Worth 25% more, and 3s longer. */
  overseared?: boolean;
  /**
   * Resourceful (Q+) leftovers carry their own value, because it is a share of the Feast that
   * made them rather than anything the food table knows about.
   */
  healRaw?: number;
  healCooked?: number;
  /** Leftovers rest by themselves on the strip. `scene.time.now` at which they turn. */
  ripenAt?: number;
}

/** Something sitting on the grate, and how far through it is. */
interface Cooking {
  owner: Owner;
  kind: FoodKind;
  /** Milliseconds of heat it has taken. */
  progress: number;
  slot: number;
  seed: number;
  /**
   * Latched when it was put on rather than read every frame: shelving Pit Master mid-cook must
   * not silently retarget something already three quarters of the way through a longer run.
   */
  oversear: boolean;
  /**
   * 0 cooking, 1 cooked (collectable), 2 over-seared. Held rather than derived from `progress`
   * so each boundary can be announced exactly once, and so the ring knows which of its two
   * runs it is drawing.
   */
  stage: 0 | 1 | 2;
  /** Leftovers keep their own value across the grate too. */
  healRaw?: number;
  healCooked?: number;
}

/** Something left on the maw to spoil. */
interface Rotting {
  owner: Owner;
  item: InvItem;
  /** Milliseconds it has spent on the teeth. */
  progress: number;
  slot: number;
  seed: number;
}

interface KnifeProj {
  owner: Owner;
  x: number;
  y: number;
  vx: number;
  vy: number;
  ang: number;
  heated: boolean;
  diesAt: number;
  spin: number;
  /** Click upgrade: a cleaver goes through bodies rather than stopping in the first one. */
  cleaver: boolean;
  /** Everything a piercing throw has already cut, so it cannot cut the same body twice. */
  hit: Fighter[];
}

interface FoodProj {
  owner: Owner;
  item: InvItem;
  x: number;
  y: number;
  vx: number;
  vy: number;
  diesAt: number;
  spin: number;
}

/** An ingredient on the floor, waiting to be walked over. */
interface Drop {
  owner: Owner;
  item: InvItem;
  x: number;
  y: number;
  until: number;
  seed: number;
}

interface Coal {
  owner: Owner;
  x: number;
  y: number;
  vx: number;
  vy: number;
  diesAt: number;
  spin: number;
  /** Pit Master (R+): the lump burns blue, and the grill it lands on runs at 3× rather than 2×. */
  blue: boolean;
}

interface SkewerProj {
  owner: Owner;
  x: number;
  y: number;
  vx: number;
  vy: number;
  ang: number;
  meat: boolean;
  state: 'fly' | 'landed';
  until: number;
  hit: Fighter[];
}

interface Gobbet {
  owner: Owner;
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  hot: boolean;
  diesAt: number;
  spin: number;
  /** Murderous Intent (F+): this one leaves a 15% vulnerability behind it. */
  vuln: boolean;
}

/**
 * Chef's Friend. One of these per side, alive whether or not the enhancement is bound — a rat
 * that is not paid for simply never comes up the hole, which keeps every read on it total rather
 * than nullable.
 */
interface RatState {
  /** What it is doing above ground, or null while it is at home in the hole. */
  out: 'fetch' | 'roam' | null;
  x: number;
  y: number;
  ang: number;
  /** 0–1 ramp on the drawing's second face, so the butcher's rat grows rather than pops. */
  mutate: number;
  /** 0–1 how far up the hole the eyes have come. */
  eyes: number;
  /** What it is carrying home, or null. */
  carry: InvItem | null;
  /** The thing a fetch errand is walking towards, held by identity so an expiry cancels it. */
  target: Drop | SkewerProj | null;
  /** Mouthfuls it has been thrown, 0–{@link RAT_FEED_MAX}. */
  feed: number;
  /** Butcher form has ended, but a feeding bought it until this timestamp anyway. */
  stayUntil: number;
  nextSlashAt: number;
  /** A whistled sic: the next slash it lands is doubled. */
  sicUntil: number;
  /** …and who it was set on, so the charge goes where the cursor pointed. */
  sicTarget: Fighter | null;
  /** An errand that has found nothing by here is abandoned. */
  giveUpAt: number;
  /** The whistle's own cooldown. The enhancement is not an ability, so the kit owns the clock. */
  cdUntil: number;
  /** `scene.time.now` at which something cooked, posted down the hole, comes back up as bread. */
  swapAt: number;
}

function makeRat(): RatState {
  return {
    out: null, x: 0, y: 0, ang: Math.PI / 2, mutate: 0, eyes: 1, carry: null, target: null,
    feed: 0, stayUntil: 0, nextSlashAt: 0, sicUntil: 0, sicTarget: null, giveUpAt: 0,
    cdUntil: 0, swapAt: 0,
  };
}

interface Side {
  owner: Owner;
  form: GluttonyForm;
  /** How far through the transformation the rig is drawn — ramped, not switched. */
  formBlend: number;
  inv: InvItem[];
  /** The item in front of you instead of the knife, by identity rather than index. */
  held: InvItem | null;
  /** 0–1. A full bar is a 35-damage knife. */
  knifeHeat: number;
  /**
   * Click upgrade: `scene.time.now` at which a red cleaver goes cold again. Base Gluttony has
   * no such clock — the heat lives until it is thrown — so this is 0 without the upgrade.
   */
  knifeHotUntil: number;
  // E
  forageUntil: number;
  // F
  hunger: number;
  // Q (chef)
  potUntil: number;
  potHeal: number;
  // R (butcher)
  dashUntil: number;
  dashVx: number;
  dashVy: number;
  /** Latched so the damage absorber is handed back exactly once. */
  absorberOwned: boolean;
  prevAbsorber: ((amount: number) => boolean) | null;
  /** NPC pacing — it does not have a mouse, so the kit decides when it eats. */
  npcNextEat: number;
  // ── Head Chef (E+): what the second half of the larder does when you eat it ──
  /** Bristle Berries. Outgoing damage multiplier, and when it runs out. */
  dmgMult: number;
  dmgUntil: number;
  /** Winter Mint. Incoming damage multiplier, and when it runs out. */
  resistMult: number;
  resistUntil: number;
  /** Death Cap. Walk speed multiplier, and when it runs out. */
  foodSpeedMult: number;
  foodSpeedUntil: number;
  // ── Click+ / R+ (butcher halves) ──
  /** Cleave landed: 25% for two seconds, refreshed rather than stacked. */
  hasteUntil: number;
  /** Standing over the maw painted the blade. `scene.time.now` at which it dries. */
  ichorUntil: number;
}

function makeSide(owner: Owner): Side {
  return {
    owner, form: 'chef', formBlend: 0, inv: [], held: null, knifeHeat: 0, knifeHotUntil: 0,
    forageUntil: 0, hunger: 0, potUntil: 0, potHeal: 0,
    dashUntil: 0, dashVx: 0, dashVy: 0,
    absorberOwned: false, prevAbsorber: null, npcNextEat: 0,
    dmgMult: 1, dmgUntil: 0, resistMult: 1, resistUntil: 0,
    foodSpeedMult: 1, foodSpeedUntil: 0, hasteUntil: 0, ichorUntil: 0,
  };
}

// ── Arena API ────────────────────────────────────────────────────────────────

export interface GluttonyArenaApi {
  get scene(): Phaser.Scene;
  get player(): Fighter;
  get npc(): Fighter;
  /** Everything the player is allowed to hurt — husks in Invasion, the npc in a plain 1v1. */
  get enemies(): Fighter[];
  get eKey(): Phaser.Input.Keyboard.Key;
  get rKey(): Phaser.Input.Keyboard.Key;
  get fKey(): Phaser.Input.Keyboard.Key;
  get qKey(): Phaser.Input.Keyboard.Key;
  get pointerWasDown(): boolean;
  get rightPointerWasDown(): boolean;
  get elementId(): string;
  get npcElementId(): string;
  get width(): number;
  get height(): number;
  /** Skins: maps a Gluttony visual colour through that side's equipped skin. */
  gluttonyColor(owner: Owner, base: number): number;
  spawnHitFlash(x: number, y: number, color: number): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  getNearestEnemy(fromX: number, fromY: number): Fighter;
  buildPlayerContext(x: number, y: number): CastContext;
  setStatusIndicator(id: string, status: CustomStatus | null): void;
  /** Swaps the ability tray between the chef's five keys and the butcher's. */
  setHudForm(form: GluttonyForm): void;
  get masteryActive(): boolean;
  get npcMasteryActive(): boolean;
  /** Which mastery enhancement each side dropped over an E/R/F/Q slot, or null. */
  masteryBindFor(slot: string): string | null;
  npcMasteryBindFor(slot: string): string | null;
  /** Mastery progress. Gated on the element by the adapter, so the kit records unconditionally. */
  recordMasteryStat(key: string, amount: number): void;
  /** …and read back, for the one requirement that is a checklist rather than a counter. */
  getMasteryStat(key: string): number;
  recordMasteryBestStat(key: string, value: number): void;
  /** Shop upgrades: the local player's equipped slots. */
  hasUpgrade(slot: string): boolean;
  /** …and the online opponent's, so their upgraded kitchen reproduces on this sim. */
  hasNpcUpgrade(slot: string): boolean;
}

// ── GluttonyKit ──────────────────────────────────────────────────────────────

export class GluttonyKit {
  private api: GluttonyArenaApi;

  // ── Visuals ──
  private readonly pcol: GluttonyColorFn;
  private readonly ncol: GluttonyColorFn;
  private readonly pfx: GluttonyFx;
  private readonly nfx: GluttonyFx;
  private playerAvatar: GluttonyAvatar | null = null;
  private npcAvatar: GluttonyAvatar | null = null;
  /** The grill, the maw's body, drops and floor marks — under the fighters. */
  private groundGfx: Phaser.GameObjects.Graphics | null = null;
  /** Flames, teeth, tentacles and everything in flight — over them. */
  private airGfx: Phaser.GameObjects.Graphics | null = null;
  /** The prep strip and the hunger bar, pinned to the screen. */
  private hudGfx: Phaser.GameObjects.Graphics | null = null;
  private hudLabel: Phaser.GameObjects.Text | null = null;
  private vizT = 0;

  // ── Sim ──
  private sides: Record<Owner, Side> = { player: makeSide('player'), npc: makeSide('npc') };
  private cooking: Cooking[] = [];
  private superheatUntil = 0;
  /** Pit Master (R+): the coals that lit this superheat were blue, so it runs at 3× not 2×. */
  private superheatBlue = false;
  private knives: KnifeProj[] = [];
  private foods: FoodProj[] = [];
  private drops: Drop[] = [];
  private coals: Coal[] = [];
  private skewers: SkewerProj[] = [];
  private gobbets: Gobbet[] = [];
  /** Charcoal burn: fighter → the timestamp it wears off. */
  private burnt = new Map<Fighter, number>();

  // ── The maw ──
  /** Whoever is currently in butcher form, or null while the grill is a grill. */
  private mawOwner: Owner | null = null;
  private mawX = 0;
  private mawY = 0;
  private mawGape = 0;
  private mawNextShotAt = 0;
  private mawNextWhipAt = 0;
  private mawFrenzyUntil = 0;
  private mawAwakenUntil = 0;
  private mawAwakenTotal = 0;
  private mawNextBarrageAt = 0;
  /** Head Chef (E+): what is spoiling on the teeth. */
  private rotting: Rotting[] = [];
  /** Murderous Intent (F+): the maw's grab, its close bite, and the dread maw's scream. */
  private mawNextGrabAt = 0;
  private mawNextBiteAt = 0;
  private mawNextScreamAt = 0;
  /** Resourceful (Q+): 0–1 ramp on the awakened maw's second face, so it grows rather than pops. */
  private dreadBlend = 0;
  private nextTendrilAt = 0;

  /**
   * Murderous Intent's cone vulnerability: fighter → the timestamp it wears off. The kit owns
   * the timers and rewrites `Fighter.gluttonyIncomingMult` from scratch every frame, so a
   * match that ends mid-debuff cannot leave a multiplier behind on anybody.
   */
  private vulnerable = new Map<Fighter, number>();
  /** Every fighter this kit wrote `gluttonyIncomingMult` onto last frame. */
  private incomingTouched = new Set<Fighter>();
  /** The maw's grab and its scream. `earthStunnedUntil` is inert for a player, so we pin them. */
  private stunned = new Map<Fighter, number>();

  // ── Mastery ──
  /** Chef's Friend. One rat per side, whether or not either side has paid for one. */
  private rats: Record<Owner, RatState> = { player: makeRat(), npc: makeRat() };
  /** Snacking's fractional carry, so a 1.4/s regen is not silently rounded down to 1. */
  private snackAccum: Record<Owner, number> = { player: 0, npc: 0 };
  /** The bot has no key to whistle with, so the kit decides when it does. */
  private npcRatCheckAt = 0;

  /** Latched each frame from `handleInput` — the player's real cursor. */
  private aimX = 0;
  private aimY = 0;
  private npcAimX = 0;
  private npcAimY = 0;

  constructor(api: GluttonyArenaApi) {
    this.api = api;
    this.pcol = (base) => api.gluttonyColor('player', base);
    this.ncol = (base) => api.gluttonyColor('npc', base);
    this.pfx = new GluttonyFx(api.scene, this.pcol);
    this.nfx = new GluttonyFx(api.scene, this.ncol);
  }

  // ── Small helpers ──────────────────────────────────────────────────────────

  private get now(): number { return this.api.scene.time.now; }
  private side(owner: Owner): Side { return this.sides[owner]; }
  private fighter(owner: Owner): Fighter { return owner === 'player' ? this.api.player : this.api.npc; }
  private fx(owner: Owner): GluttonyFx { return owner === 'player' ? this.pfx : this.nfx; }
  private col(owner: Owner): GluttonyColorFn { return owner === 'player' ? this.pcol : this.ncol; }
  private body(f: Fighter): Phaser.Physics.Arcade.Body { return f.body as Phaser.Physics.Arcade.Body; }

  private get left(): number { return ARENA_PAD; }
  private get right(): number { return this.api.width - ARENA_PAD; }
  private get top(): number { return ARENA_PAD; }
  private get bottom(): number { return this.api.height - ARENA_PAD; }
  private get grillX(): number { return this.api.width / 2; }
  private get grillY(): number { return this.api.height / 2; }

  private hex(color: number): string {
    return `#${color.toString(16).padStart(6, '0')}`;
  }

  private alive(f: Fighter | null | undefined): boolean {
    return !!f && f.active && f.hp > 0;
  }

  private isGluttony(owner: Owner): boolean {
    return owner === 'player' ? this.api.elementId === 'gluttony' : this.api.npcElementId === 'gluttony';
  }

  /** Everything this side is allowed to hurt. */
  private targetsOf(owner: Owner): Fighter[] {
    const list = owner === 'player' ? this.api.enemies : [this.api.player];
    return list.filter((f) => this.alive(f));
  }

  private everyone(): Fighter[] {
    const out: Fighter[] = [];
    for (const f of [this.api.player, this.api.npc, ...this.api.enemies]) {
      if (this.alive(f) && !out.includes(f)) out.push(f);
    }
    return out;
  }

  /** Whoever the Feast is allowed to feed — the caster plus anybody it cannot hurt. */
  private alliesOf(owner: Owner): Fighter[] {
    if (owner === 'npc') return this.alive(this.api.npc) ? [this.api.npc] : [];
    const foes = this.targetsOf('player');
    return this.everyone().filter((f) => !foes.includes(f));
  }

  private enemyOf(owner: Owner): Fighter | null {
    if (owner === 'npc') return this.alive(this.api.player) ? this.api.player : null;
    const f = this.api.player;
    if (!f) return null;
    const t = this.api.getNearestEnemy(f.x, f.y);
    return this.alive(t) ? t : null;
  }

  private avatar(owner: Owner): GluttonyAvatar | null {
    return owner === 'player' ? this.playerAvatar : this.npcAvatar;
  }

  private get superheated(): boolean { return this.now < this.superheatUntil; }

  /**
   * Whether a side has a shop upgrade equipped. The npc branch only ever answers true online —
   * `hasNpcUpgrade` is gated on that inside ArenaScene — so a bot opponent plays the base kit
   * and a real one plays the kitchen they paid for.
   */
  private up(owner: Owner, slot: string): boolean {
    if (!this.isGluttony(owner)) return false;
    return owner === 'player' ? this.api.hasUpgrade(slot) : this.api.hasNpcUpgrade(slot);
  }

  // ── Mastery: shared ────────────────────────────────────────────────────────

  /** Whether Element Mastery is on for whichever side is asking, and they are the chef. */
  private masteryOn(owner: Owner): boolean {
    return this.isGluttony(owner)
      && (owner === 'player' ? this.api.masteryActive : this.api.npcMasteryActive);
  }

  /**
   * Which slot Chef's Friend was dropped on, or null. F is not scanned — `excludeSlots` refuses
   * it, because F is the door between the two halves of the element in both directions and a
   * mastery bound over it would delete the butcher form and the way back out of it at once.
   */
  private ratSlot(owner: Owner): 'e' | 'r' | 'q' | null {
    if (!this.masteryOn(owner)) return null;
    for (const s of ['e', 'r', 'q'] as const) {
      const bind = owner === 'player' ? this.api.masteryBindFor(s) : this.api.npcMasteryBindFor(s);
      if (bind === 'chefs-friend') return s;
    }
    return null;
  }

  /** True while this side actually owns a hole in the wall. */
  private hasRat(owner: Owner): boolean {
    return this.ratSlot(owner) !== null;
  }

  /** The player's key for a bound slot. */
  private keyFor(slot: 'e' | 'r' | 'q'): Phaser.Input.Keyboard.Key {
    return slot === 'e' ? this.api.eKey : slot === 'r' ? this.api.rKey : this.api.qKey;
  }

  /**
   * Mastery progress. Only ever recorded for the player — the grind is the human's, not the
   * bot's — and deliberately not gated on the mastery being *on*, since earning it is the point.
   */
  private record(owner: Owner, key: string, amount = 1): void {
    if (owner === 'player') this.api.recordMasteryStat(key, amount);
  }

  /**
   * "The Whole Larder". A checklist rather than a counter: one flag per ingredient, and the
   * requirement itself is the number of flags standing, ratcheted so it can only ever go up.
   */
  private recordCookedKind(owner: Owner, kind: FoodKind): void {
    if (owner !== 'player' || !LARDER_KINDS.includes(kind)) return;
    this.api.recordMasteryStat(`larder_${kind}`, 1);
    let n = 0;
    for (const k of LARDER_KINDS) if (this.api.getMasteryStat(`larder_${k}`) > 0) n++;
    this.api.recordMasteryBestStat('larderKinds', n);
  }

  /** Bristle Berries, applied at every damage site the kit owns. */
  private dmg(owner: Owner, amount: number): number {
    const s = this.side(owner);
    return s.dmgUntil > this.now ? Math.max(1, Math.round(amount * s.dmgMult)) : amount;
  }

  /** What a side's blade is currently worth as a name — the HUD and the tray both read it. */
  private bladeName(owner: Owner): string {
    return this.up(owner, 'click') ? 'CLEAVER' : 'KNIFE';
  }

  /** True while the maw is spilling down somebody's cleaver. */
  private ichored(owner: Owner): boolean {
    return this.side(owner).ichorUntil > this.now;
  }

  /** True while the awakened maw is wearing its second face. */
  private get dread(): boolean {
    return !!this.mawOwner && this.now < this.mawAwakenUntil && this.up(this.mawOwner, 'q');
  }

  /** Everything the maw's own attacks are multiplied by. */
  private mawDamage(owner: Owner, base: number): number {
    return this.dmg(owner, this.dread ? Math.round(base * DREAD_DAMAGE_MULT) : base);
  }

  // ── What a thing on the strip is worth ─────────────────────────────────────

  /**
   * Healing, in points, for one item eaten by one fighter. Three things layer here that
   * `foodHeal` alone cannot express: Winter Mint is a percentage of the eater, leftovers carry
   * a value copied off the Feast that made them, and an over-seared anything is worth a
   * quarter more. Rot halves whatever comes out of all that — it is a weapon, not a meal.
   */
  private healValue(f: Fighter, item: InvItem): number {
    const prof = FOOD[item.kind];
    let flat = item.cooked
      ? (item.healCooked ?? prof.healCooked)
      : (item.healRaw ?? prof.healRaw);
    const pct = item.cooked ? prof.healPctCooked : prof.healPctRaw;
    if (pct) flat += Math.round(f.maxHp * pct);
    if (item.overseared && flat > 0) flat = Math.round(flat * OVERSEAR_HEAL_MULT);
    if (item.rotten) flat = Math.round(flat / 2);
    return flat;
  }

  /**
   * What a rotten item does to whoever it lands on. The cooked value of the same ingredient,
   * which is why rotting a potato is worth so much more than rotting a carrot — except Winter
   * Mint, which has no cooked value worth speaking of and is priced off the target instead.
   */
  private rottenDamage(item: InvItem, target: Fighter): number {
    if (item.kind === 'mint') return Math.max(1, Math.round(target.maxHp * ROT_MINT_PCT));
    return Math.max(1, item.healCooked ?? FOOD[item.kind].healCooked);
  }

  /** The buff eating this item hands out, with Pit Master's three extra seconds folded in. */
  private buffOf(item: InvItem): FoodBuff | null {
    const entry = FOOD_BUFF[item.kind];
    if (!entry) return null;
    const base = item.cooked ? entry.cooked : entry.raw;
    if (!base) return null;
    if (!item.overseared) return base;
    return { ...base, ms: base.ms + OVERSEAR_BUFF_BONUS_MS };
  }

  private applyBuff(owner: Owner, buff: FoodBuff): void {
    const s = this.side(owner);
    const until = this.now + buff.ms;
    if (buff.dmg !== undefined) { s.dmgMult = buff.dmg; s.dmgUntil = Math.max(s.dmgUntil, until); }
    if (buff.resist !== undefined) {
      s.resistMult = buff.resist;
      s.resistUntil = Math.max(s.resistUntil, until);
    }
    if (buff.speed !== undefined) {
      s.foodSpeedMult = buff.speed;
      s.foodSpeedUntil = Math.max(s.foodSpeedUntil, until);
    }
    const f = this.fighter(owner);
    if (this.alive(f)) this.api.showFloatingText(f.x, f.y - 62, buff.label, this.hex(buff.color));
  }

  /** A short label for a tile or a pop-up: the state first, then the name. */
  private itemLabel(item: InvItem): string {
    const prefix = item.rotten ? 'ROTTEN ' : item.overseared ? 'SEARED ' : item.cooked ? 'COOKED ' : '';
    return `${FOOD[item.kind].emoji} ${prefix}${FOOD[item.kind].label}`;
  }

  /** A stun the kit pins itself, because `earthStunnedUntil` is inert for a player. */
  private stun(t: Fighter, ms: number, label: string): void {
    if (t.unstoppable) return;
    const until = this.now + ms;
    t.earthStunnedUntil = Math.max(t.earthStunnedUntil, until);
    this.stunned.set(t, Math.max(this.stunned.get(t) ?? 0, until));
    this.api.showFloatingText(t.x, t.y - 40, label, this.hex(GLT.flesh));
  }

  private isBurnt(f: Fighter): boolean {
    return (this.burnt.get(f) ?? 0) > this.now;
  }

  private nearGrill(f: Fighter): boolean {
    return Phaser.Math.Distance.Between(f.x, f.y, this.grillX, this.grillY) <= GRILL_REACH;
  }

  private freeSlot(): number {
    for (let i = 0; i < GRILL_SLOTS; i++) {
      if (!this.cooking.some((c) => c.slot === i)) return i;
    }
    return -1;
  }

  private freeRotSlot(): number {
    for (let i = 0; i < ROT_SLOTS; i++) {
      if (!this.rotting.some((r) => r.slot === i)) return i;
    }
    return -1;
  }

  /** Where a thing spoiling on the maw sits — a ring around the lip rather than a grate. */
  private rotPos(slot: number): { x: number; y: number } {
    const a = (slot / ROT_SLOTS) * Math.PI * 2 + Math.PI / 4;
    return { x: this.mawX + Math.cos(a) * GRILL_R * 1.1, y: this.mawY + Math.sin(a) * GRILL_R * 0.72 };
  }

  private slotPos(slot: number): { x: number; y: number } {
    const [ox, oy] = SLOT_OFFSETS[slot % SLOT_OFFSETS.length];
    return { x: this.grillX + ox, y: this.grillY + oy };
  }

  private cookMs(kind: FoodKind): number { return FOOD[kind].cookMs; }

  /** Add to the strip. Returns false when there is no room, which is a real refusal. */
  private stow(owner: Owner, item: InvItem): boolean {
    const s = this.side(owner);
    if (s.inv.length >= INV_SLOTS) return false;
    s.inv.push(item);
    return true;
  }

  private drop(owner: Owner, item: InvItem, x: number, y: number): void {
    this.drops.push({
      owner, item,
      x: Phaser.Math.Clamp(x, this.left + 12, this.right - 12),
      y: Phaser.Math.Clamp(y, this.top + 12, this.bottom - 12),
      until: this.now + DROP_LIFE_MS, seed: Math.random() * 999,
    });
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  reset(): void {
    // The butcher writes a damage absorber onto its fighter; a match that ended mid-transform
    // would otherwise start the next one with every hit vanishing into a bar that is not there.
    for (const owner of ['player', 'npc'] as Owner[]) this.removeAbsorber(owner);

    // Same reasoning as the absorber above: a match that ended with a mint down somebody's
    // throat or a maw bullet in them would otherwise start the next one still carrying it.
    for (const f of this.incomingTouched) f.gluttonyIncomingMult = 1;
    this.incomingTouched.clear();
    this.vulnerable.clear();
    this.stunned.clear();

    this.sides = { player: makeSide('player'), npc: makeSide('npc') };
    this.rats = { player: makeRat(), npc: makeRat() };
    this.snackAccum = { player: 0, npc: 0 };
    this.npcRatCheckAt = 0;
    this.cooking = [];
    this.rotting = [];
    this.superheatUntil = 0;
    this.superheatBlue = false;
    this.knives = [];
    this.foods = [];
    this.drops = [];
    this.coals = [];
    this.skewers = [];
    this.gobbets = [];
    this.burnt.clear();
    this.mawOwner = null;
    this.mawX = 0;
    this.mawY = 0;
    this.mawGape = 0;
    this.mawNextShotAt = 0;
    this.mawNextWhipAt = 0;
    this.mawFrenzyUntil = 0;
    this.mawAwakenUntil = 0;
    this.mawAwakenTotal = 0;
    this.mawNextBarrageAt = 0;
    this.mawNextGrabAt = 0;
    this.mawNextBiteAt = 0;
    this.mawNextScreamAt = 0;
    this.nextTendrilAt = 0;
    this.dreadBlend = 0;
    this.aimX = 0;
    this.aimY = 0;
    this.npcAimX = 0;
    this.npcAimY = 0;
    this.vizT = 0;

    for (const id of ['glut-prep', 'glut-hot-knife', 'glut-butcher', 'glut-superheat',
      'glut-cooking', 'glut-pot', 'glut-maw', 'glut-burnt', 'glut-forage',
      'glut-berries', 'glut-mint', 'glut-deathcap', 'glut-haste', 'glut-ichor',
      'glut-rotting', 'glut-vuln', 'glut-snacking', 'glut-rat']) {
      this.api.setStatusIndicator(id, null);
    }

    this.playerAvatar?.destroy(); this.playerAvatar = null;
    this.npcAvatar?.destroy(); this.npcAvatar = null;
    this.groundGfx?.destroy(); this.groundGfx = null;
    this.airGfx?.destroy(); this.airGfx = null;
    this.hudGfx?.destroy(); this.hudGfx = null;
    this.hudLabel?.destroy(); this.hudLabel = null;
  }

  // ── Input ──────────────────────────────────────────────────────────────────

  handleInput(time: number, pointer: Phaser.Input.Pointer, mouseX: number, mouseY: number): void {
    if (this.api.elementId !== 'gluttony') return;
    void time;
    this.aimX = mouseX;
    this.aimY = mouseY;

    const p = this.api.player;
    if (!this.alive(p)) return;
    const s = this.sides.player;
    const clicked = pointer.isDown && !this.api.pointerWasDown;
    const rightClicked = pointer.rightButtonDown() && !this.api.rightPointerWasDown;

    // The prep strip eats the press. Clicking a slot is picking something up, not an attack,
    // and routing it through the click ability would throw whatever you just selected.
    if (clicked) {
      const slot = this.hitPrepSlot(pointer.worldX, pointer.worldY);
      if (slot === KNIFE_TILE) { this.selectKnife('player'); return; }
      if (slot >= 0) { this.selectSlot('player', slot); return; }
    }

    if (rightClicked) this.eatHeld('player');

    const ctx = this.api.buildPlayerContext(mouseX, mouseY);
    // Mastery: whichever of E/R/Q the whistle was dropped on stops being its own ability — in
    // *both* forms, because a Gluttony slot is two abilities and the mastery takes the slot.
    const bound = this.ratSlot('player');
    if (bound && Phaser.Input.Keyboard.JustDown(this.keyFor(bound))) {
      this.tryChefsFriend('player', mouseX, mouseY);
    }
    if (s.form === 'chef') {
      if (clicked) p.castAbility('glut-knife', ctx);
      if (bound !== 'e' && Phaser.Input.Keyboard.JustDown(this.api.eKey)) p.castAbility('glut-forage', ctx);
      if (bound !== 'r' && Phaser.Input.Keyboard.JustDown(this.api.rKey)) p.castAbility('glut-charcoal', ctx);
      if (Phaser.Input.Keyboard.JustDown(this.api.fKey)) p.castAbility('glut-butcher', ctx);
      if (bound !== 'q' && Phaser.Input.Keyboard.JustDown(this.api.qKey)) p.castAbility('glut-feast', ctx);
    } else {
      if (clicked) p.castAbility('glut-cleave', ctx);
      if (bound !== 'e' && Phaser.Input.Keyboard.JustDown(this.api.eKey)) p.castAbility('glut-poach', ctx);
      if (bound !== 'r' && Phaser.Input.Keyboard.JustDown(this.api.rKey)) p.castAbility('glut-cannibalize', ctx);
      if (Phaser.Input.Keyboard.JustDown(this.api.fKey)) p.castAbility('glut-return', ctx);
      if (bound !== 'q' && Phaser.Input.Keyboard.JustDown(this.api.qKey)) p.castAbility('glut-maw', ctx);
    }
  }

  /** Which prep tile a screen-space point is over: a slot index, `KNIFE_TILE`, or -1. */
  private hitPrepSlot(px: number, py: number): number {
    if (py < HUD_Y || py > HUD_Y + SLOT_SIZE) return -1;
    if (px >= KNIFE_TILE_X && px <= KNIFE_TILE_X + SLOT_SIZE) return KNIFE_TILE;
    const rel = px - HUD_X;
    if (rel < 0 || rel > HUD_W) return -1;
    const i = Math.floor(rel / (SLOT_SIZE + SLOT_GAP));
    if (i < 0 || i >= INV_SLOTS) return -1;
    // Reject the gap between two tiles rather than rounding it into the nearer one.
    return rel - i * (SLOT_SIZE + SLOT_GAP) <= SLOT_SIZE ? i : -1;
  }

  /** The tile at the end of the strip: put whatever you are carrying down and take the blade. */
  private selectKnife(owner: Owner): void {
    const s = this.side(owner);
    if (!s.held) return;
    s.held = null;
    const f = this.fighter(owner);
    if (this.alive(f)) {
      this.api.showFloatingText(f.x, f.y - 44, `🔪 ${this.bladeName(owner)}`, this.hex(GLT.steel));
    }
    Sfx.playAt('ui-click', this.alive(f) ? f.x : this.grillX, { volume: 0.4, rate: 1.2 });
  }

  /** Put a slot in your hand, or put it back down if it is already there. */
  private selectSlot(owner: Owner, index: number): void {
    const s = this.side(owner);
    const item = s.inv[index] ?? null;
    const f = this.fighter(owner);
    if (!item) {
      // An empty tile is how you go back to the knife.
      if (s.held) {
        s.held = null;
        if (this.alive(f)) {
          this.api.showFloatingText(f.x, f.y - 44, `🔪 ${this.bladeName(owner)}`, this.hex(GLT.steel));
        }
      }
      return;
    }
    s.held = s.held === item ? null : item;
    Sfx.playAt('ui-click', this.alive(f) ? f.x : this.grillX, { volume: 0.4, rate: 1.2 });
    if (this.alive(f)) {
      const label = s.held ? this.itemLabel(item) : `🔪 ${this.bladeName(owner)}`;
      this.api.showFloatingText(f.x, f.y - 44, label,
        this.hex(s.held ? (item.rotten ? GLT.rot : foodColor(item.kind, item.cooked)) : GLT.steel));
    }
  }

  // ── Eating ─────────────────────────────────────────────────────────────────

  /** Right-click. Heals what the item is worth, and buys butcher time on top of that. */
  private eatHeld(owner: Owner): void {
    const s = this.side(owner);
    if (!s.held) return;
    this.eatItem(owner, s.held);
  }

  private eatItem(owner: Owner, item: InvItem): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    const i = s.inv.indexOf(item);
    if (i < 0) return;
    s.inv.splice(i, 1);
    if (s.held === item) s.held = null;

    const heal = this.healValue(f, item);
    const col = item.rotten ? GLT.rot : foodColor(item.kind, item.cooked);
    if (heal >= 0) {
      f.heal(heal);
      this.api.showFloatingText(f.x, f.y - 46,
        `${FOOD[item.kind].emoji} +${heal}`, this.hex(col));
    } else {
      // A raw Death Cap. It is still food, it still feeds the bar, and it still costs you 30.
      f.applySelfDamage(-heal);
      this.api.spawnHitFlash(f.x, f.y, GLT.venom);
      this.fx(owner).splat(f.x, f.y, 20, GLT.venom);
      this.api.showFloatingText(f.x, f.y - 46,
        `${FOOD[item.kind].emoji} ${heal}`, this.hex(GLT.venom));
    }
    this.fx(owner).crumbs(f.x, f.y + 6, col);
    Sfx.playAt('potion-drink', f.x, { volume: 0.7, rate: item.cooked ? 0.95 : 1.1 });

    const buff = this.buffOf(item);
    if (buff) this.applyBuff(owner, buff);

    // The butcher's stomach is the clock. Eating is the only thing that puts time back on it.
    if (s.form === 'butcher') {
      const gain = FOOD[item.kind].hungerSec * 1000;
      s.hunger = Math.min(HUNGER_MAX, s.hunger + meterGain(f, gain));
      this.api.showFloatingText(f.x, f.y - 62, `🔴 +${FOOD[item.kind].hungerSec}s`, this.hex(GLT.blood));
      this.fx(owner).ring(f.x, f.y, 12, 46, GLT.blood, 380);
    }
  }

  // ── Ability entry points (called from build*Context) ───────────────────────

  /**
   * Click, chef form. One key doing two entirely different jobs depending on what is in your
   * hand — a 25-damage throw, or an ingredient being posted onto the grate from range.
   */
  doKnife(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    if (owner === 'npc') { this.npcAimX = tx; this.npcAimY = ty; }
    const s = this.side(owner);

    if (owner === 'npc') {
      // The bot has no strip to click, so the decision is made here: raw food goes on the
      // grill whenever there is room for it, and everything else is a knife.
      const raw = s.inv.find((it) => !it.cooked);
      if (raw && this.freeSlot() >= 0) {
        s.held = raw;
        this.throwFood(owner, raw, this.grillX, this.grillY);
        return;
      }
      s.held = null;
    }

    if (s.held) this.throwFood(owner, s.held, tx, ty);
    else this.throwKnife(owner, tx, ty);
  }

  private throwKnife(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    const s = this.side(owner);
    const cleaver = this.up(owner, 'click');
    const ang = Math.atan2(ty - f.y, tx - f.x);
    const heated = s.knifeHeat >= 0.999;
    this.knives.push({
      owner,
      x: f.x + Math.cos(ang) * 24,
      y: f.y + Math.sin(ang) * 24,
      vx: Math.cos(ang) * KNIFE_SPEED,
      vy: Math.sin(ang) * KNIFE_SPEED,
      ang, heated, diesAt: this.now + KNIFE_LIFE_MS, spin: 0,
      cleaver, hit: [],
    });
    // The heat goes with the blade, and the next one comes out of the block cold — unless it
    // is a cleaver, which holds its own four seconds of heat whether or not it is in your hand.
    if (!cleaver) s.knifeHeat = 0;

    this.avatar(owner)?.play('punch', ang);
    if (heated) {
      this.fx(owner).sizzle(f.x + Math.cos(ang) * 20, f.y + Math.sin(ang) * 20, 6, 18, 420);
      this.api.showFloatingText(f.x, f.y - 46, '🔥 RED HOT', this.hex(GLT.heat));
    }
  }

  private throwFood(owner: Owner, item: InvItem, tx: number, ty: number): void {
    const f = this.fighter(owner);
    const s = this.side(owner);
    const i = s.inv.indexOf(item);
    if (i < 0) return;
    s.inv.splice(i, 1);
    if (s.held === item) s.held = null;

    const ang = Math.atan2(ty - f.y, tx - f.x);
    this.foods.push({
      owner, item,
      x: f.x + Math.cos(ang) * 22,
      y: f.y + Math.sin(ang) * 22,
      vx: Math.cos(ang) * FOOD_SPEED,
      vy: Math.sin(ang) * FOOD_SPEED,
      diesAt: this.now + FOOD_LIFE_MS,
      spin: Math.random() * 6,
    });
    this.avatar(owner)?.play('punch', ang);
    Sfx.playAt('whoosh', f.x, { volume: 0.4, rate: 1.4 });
  }

  /** E — Forage. Two seconds at half speed, and then something to cook. */
  doForage(owner: Owner): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    const s = this.side(owner);
    s.forageUntil = this.now + FORAGE_MS;
    this.avatar(owner)?.setHold('sow', this.facingOf(owner));
    this.api.showFloatingText(f.x, f.y - 46, '🌿 FORAGING', this.hex(GLT.frond));
    Sfx.playAt('burrow', f.x, { volume: 0.5, rate: 1.2 });
  }

  /** R — Charcoal Chuck. Fuel if it lands on the grill, a burn if it lands on somebody. */
  doCharcoal(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    if (owner === 'npc') { this.npcAimX = tx; this.npcAimY = ty; }

    const ang = Math.atan2(ty - f.y, tx - f.x);
    this.coals.push({
      owner,
      x: f.x + Math.cos(ang) * 22,
      y: f.y + Math.sin(ang) * 22,
      vx: Math.cos(ang) * COAL_SPEED,
      vy: Math.sin(ang) * COAL_SPEED,
      diesAt: this.now + COAL_LIFE_MS,
      spin: Math.random() * 6,
      blue: this.up(owner, 'r'),
    });
    this.avatar(owner)?.play('slam', ang);
    this.fx(owner).sizzle(f.x + Math.cos(ang) * 20, f.y + Math.sin(ang) * 20, 5, 16, 380);
  }

  /** F — Special Ingredient. */
  doButcher(owner: Owner): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    if (this.side(owner).form === 'butcher') return;
    this.setForm(owner, 'butcher');
  }

  /** Q — Feast. Everything you own, doubled, three seconds from now. */
  doFeast(owner: Owner): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    const s = this.side(owner);

    let total = 0;
    for (const item of s.inv) total += Math.max(0, this.healValue(f, item));
    s.inv = [];
    s.held = null;
    s.potHeal = Math.round(total * FEAST_MULT);
    s.potUntil = this.now + FEAST_MS;

    // Resourceful, chef half. Two parcels off the bottom of the pot, worth a share of what the
    // pot itself is about to pay — and worth twice that again if you can leave them alone.
    if (this.up(owner, 'q') && s.potHeal > 0) {
      const fresh = Math.max(1, Math.round(s.potHeal * LEFTOVER_FRESH_PCT));
      const rested = Math.max(1, Math.round(s.potHeal * LEFTOVER_RESTED_PCT));
      for (let i = 0; i < LEFTOVER_COUNT; i++) {
        const item: InvItem = {
          kind: 'leftovers', cooked: false,
          healRaw: fresh, healCooked: rested, ripenAt: this.now + LEFTOVER_REST_MS,
        };
        // A strip with no room still gets them — they land at your feet like a full forage.
        if (!this.stow(owner, item)) this.drop(owner, item, f.x + (i ? 22 : -22), f.y + 20);
      }
      this.api.showFloatingText(f.x, f.y - 70,
        `🥡 ${LEFTOVER_COUNT} LEFTOVERS — ${fresh} → ${rested}`, this.hex(GLT.parcel));
    }

    this.avatar(owner)?.play('raise');
    this.fx(owner).ring(f.x, f.y, 14, 90, GLT.stew, 560);
    this.api.showFloatingText(f.x, f.y - 54,
      total > 0 ? `🍲 FEAST — ${s.potHeal}` : '🍲 EMPTY POT', this.hex(GLT.stewLit));
    Sfx.playAt('craft-complete', f.x, { volume: 0.7, rate: 0.85 });
  }

  /** Click, butcher form. No travel time, no projectile, nothing to dodge but the man. */
  doCleave(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    if (owner === 'npc') { this.npcAimX = tx; this.npcAimY = ty; }

    const s = this.side(owner);

    // Head Chef, butcher half. The butcher's click is a swing, not a throw — but the moment
    // there is a rot rack to load and a spoiled potato to sling, he needs the chef's hand
    // back. Only with the upgrade: base Gluttony's cleave never stops being a cleave.
    if (s.held && this.up(owner, 'e')) { this.throwFood(owner, s.held, tx, ty); return; }

    const ang = Math.atan2(ty - f.y, tx - f.x);
    const ichor = this.ichored(owner) && this.up(owner, 'r');
    let landed = false;
    let dealt = 0;
    for (const t of this.targetsOf(owner)) {
      const d = Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y);
      if (d > CLEAVE_REACH) continue;
      const off = Math.abs(Phaser.Math.Angle.Wrap(Math.atan2(t.y - f.y, t.x - f.x) - ang));
      if (off > CLEAVE_HALF_ARC) continue;
      const amount = this.dmg(owner, CLEAVE_DAMAGE);
      t.takeDamage(amount);
      dealt += amount;
      this.api.spawnHitFlash(t.x, t.y, ichor ? GLT.ichorLit : GLT.blood);
      this.fx(owner).splat(t.x, t.y, 24, ichor ? GLT.ichor : GLT.blood);
      landed = true;
    }

    this.avatar(owner)?.play('sweep', ang);
    this.fx(owner).slashArc(f.x, f.y, ang, CLEAVE_REACH * 0.85,
      landed ? (ichor ? GLT.ichorLit : GLT.blood) : GLT.steel);
    Sfx.playAt(landed ? 'slash' : 'whoosh', f.x, { volume: landed ? 0.85 : 0.45, rate: 0.95 });
    if (!landed) return;

    // Click upgrade, butcher half: connecting is what makes you fast, so a whiffed swing is
    // still a whiffed swing.
    if (this.up(owner, 'click')) {
      s.hasteUntil = this.now + CLEAVE_HASTE_MS;
      this.api.showFloatingText(f.x, f.y - 58, '🏃 +25% SPEED', this.hex(GLT.steel));
    }
    // R upgrade, butcher half: an ichorous blade feeds the bar with what it cuts.
    if (ichor && dealt > 0) {
      const gain = Math.round(dealt * ICHOR_HUNGER_PER_DAMAGE);
      s.hunger = Math.min(HUNGER_MAX, s.hunger + meterGain(f, gain));
      this.api.showFloatingText(f.x, f.y - 72, `🩸 +${(gain / 1000).toFixed(1)}s`, this.hex(GLT.ichorLit));
    }
  }

  /** E, butcher form — Poach. The damage is small; the meat is the ability. */
  doPoach(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    if (owner === 'npc') { this.npcAimX = tx; this.npcAimY = ty; }

    const ang = Math.atan2(ty - f.y, tx - f.x);
    this.skewers.push({
      owner,
      x: f.x + Math.cos(ang) * 26,
      y: f.y + Math.sin(ang) * 26,
      vx: Math.cos(ang) * SKEWER_SPEED,
      vy: Math.sin(ang) * SKEWER_SPEED,
      ang, meat: false, state: 'fly', until: 0, hit: [],
    });
    this.avatar(owner)?.play('punch', ang);
    Sfx.playAt('spear-throw', f.x, { volume: 0.75, rate: 1.05 });
  }

  /** R, butcher form — Cannibalize. A lunge, a bite, and the maw wakes up a little. */
  doCannibalize(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    if (owner === 'npc') { this.npcAimX = tx; this.npcAimY = ty; }
    const s = this.side(owner);

    const ang = Math.atan2(ty - f.y, tx - f.x);
    s.dashUntil = this.now + BITE_DASH_MS;
    s.dashVx = Math.cos(ang) * BITE_DASH_SPEED;
    s.dashVy = Math.sin(ang) * BITE_DASH_SPEED;

    const bx = f.x + Math.cos(ang) * BITE_REACH * 0.55;
    const by = f.y + Math.sin(ang) * BITE_REACH * 0.55;
    let landed = false;
    for (const t of this.targetsOf(owner)) {
      if (Phaser.Math.Distance.Between(bx, by, t.x, t.y) > BITE_REACH * 0.7) continue;
      t.takeDamage(this.dmg(owner, 20));
      this.api.spawnHitFlash(t.x, t.y, GLT.blood);
      landed = true;
    }

    this.avatar(owner)?.play('dash', ang);
    this.fx(owner).bite(bx, by, ang, 32);

    if (!landed) {
      this.api.showFloatingText(f.x, f.y - 46, '😬 NOTHING TO BITE', this.hex(GLT.linenDark));
      return;
    }
    f.heal(BITE_HEAL);
    s.hunger = Math.min(HUNGER_MAX, s.hunger + meterGain(f, BITE_HUNGER_MS));
    this.mawFrenzyUntil = Math.max(this.mawFrenzyUntil, this.now + FRENZY_MS);
    this.api.showFloatingText(f.x, f.y - 50, `🔴 +${BITE_HEAL}  +3s`, this.hex(GLT.blood));
    this.fx(owner).ring(this.mawX, this.mawY, 20, 90, GLT.blood, 520);
    Sfx.playAt('roar', f.x, { volume: 0.8, rate: 1.15 });
  }

  /** F, butcher form — Return. */
  doReturn(owner: Owner): void {
    if (this.side(owner).form !== 'butcher') return;
    this.setForm(owner, 'chef');

    // Murderous Intent, chef half. Walking back into the kitchen is worth a fifth of the wait
    // for the next transformation — the cheaper the exit, the more often you take the door.
    if (!this.up(owner, 'f')) return;
    const f = this.fighter(owner);
    const ability = f?.element.abilities.find((a) => a.id === 'glut-butcher');
    if (!ability) return;
    const off = ability.cooldown * RETURN_CD_REFUND;
    f.reduceCooldown('glut-butcher', off);
    if (this.alive(f)) {
      this.api.showFloatingText(f.x, f.y - 68,
        `🔪 −${(off / 1000).toFixed(1)}s`, this.hex(GLT.blood));
    }
  }

  /** Q, butcher form — Maw Awakening. Worth exactly as much as the larder you built. */
  doMawAwakening(owner: Owner): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    const s = this.side(owner);
    if (this.mawOwner !== owner) return;

    let ms = AWAKEN_BASE_MS;
    for (const item of s.inv) ms += AWAKEN_BONUS[item.kind];
    const eaten = s.inv.length;
    s.inv = [];
    s.held = null;

    this.mawAwakenTotal = ms;
    this.mawAwakenUntil = this.now + ms;
    this.mawNextBarrageAt = this.now + 500;
    this.mawNextWhipAt = this.now + 400;
    this.mawNextScreamAt = this.now + 1200;
    this.nextTendrilAt = this.now;

    this.avatar(owner)?.play('raise');
    this.fx(owner).ring(this.mawX, this.mawY, 24, 190, GLT.blood, 700);
    this.fx(owner).splat(this.mawX, this.mawY, 60, GLT.bloodDark);
    this.api.showFloatingText(this.mawX, this.mawY - 60,
      `👄 AWAKENED — ${(ms / 1000).toFixed(1)}s`, this.hex(GLT.flesh));
    if (eaten > 0) {
      this.api.showFloatingText(f.x, f.y - 50, `🍽️ ${eaten} FED IN`, this.hex(GLT.stewLit));
    }
    if (this.up(owner, 'q')) {
      this.fx(owner).ring(this.mawX, this.mawY, 40, 320, GLT.bone, 900);
      this.api.showFloatingText(this.mawX, this.mawY - 84, '💀 IT HAS A FACE NOW', this.hex(GLT.bone));
    }
    Sfx.playAt('roar', this.mawX, { volume: 1, rate: 0.55 });
  }

  /**
   * Ruin Mastery — Second Skin. The butcher is a whole second tray of five keys and a body that
   * pays for damage out of a stomach instead of a health bar; `setForm(owner, 'chef')` is the
   * kit's own way back, and it is the only thing that takes the absorber off safely.
   *
   * Deliberately no Murderous Intent refund: this is not walking back into the kitchen, it is
   * being thrown out of it.
   */
  revertForms(f: Fighter): string[] {
    const owner: Owner | null = f === this.api.player ? 'player'
      : f === this.api.npc ? 'npc' : null;
    if (!owner || this.side(owner).form !== 'butcher') return [];
    this.setForm(owner, 'chef');
    return ['Butcher'];
  }

  // ── Form ───────────────────────────────────────────────────────────────────

  private setForm(owner: Owner, form: GluttonyForm): void {
    const s = this.side(owner);
    if (s.form === form) return;
    s.form = form;
    const f = this.fighter(owner);

    if (form === 'butcher') {
      s.hunger = HUNGER_MAX;
      this.installAbsorber(owner);
      this.mawFrenzyUntil = 0;
      if (this.alive(f)) {
        this.fx(owner).ring(f.x, f.y, 16, 110, GLT.blood, 620);
        this.fx(owner).splat(f.x, f.y + 8, 34, GLT.blood);
        this.fx(owner).smoke(f.x, f.y - 10, 6, 46, 0x6d5a58, 900);
        this.api.showFloatingText(f.x, f.y - 56, '🔪 SPECIAL INGREDIENT', this.hex(GLT.blood));
        Sfx.playAt('beast-transform', f.x, { volume: 0.95, rate: 0.7 });
      }
    } else {
      s.hunger = 0;
      this.removeAbsorber(owner);
      // The maw only ever belongs to somebody who is transformed, so it goes back with him.
      if (this.mawOwner === owner) {
        this.mawAwakenUntil = 0;
        this.mawFrenzyUntil = 0;
      }
      if (this.alive(f)) {
        this.fx(owner).ring(f.x, f.y, 10, 70, GLT.white, 480);
        this.api.showFloatingText(f.x, f.y - 52, '👨‍🍳 BACK TO THE KITCHEN', this.hex(GLT.white));
        Sfx.playAt('beast-transform', f.x, { volume: 0.7, rate: 1.35 });
      }
    }

    if (owner === 'player') this.api.setHudForm(form);
  }

  /**
   * The butcher's damage absorber. Installed on the fighter rather than checked at every damage
   * site because `damageAbsorber` is the one hook that runs before shields, invincibility and
   * health alike — the whole point of the form is that nothing gets past it to the health bar.
   */
  private installAbsorber(owner: Owner): void {
    const f = this.fighter(owner);
    const s = this.side(owner);
    if (!f || s.absorberOwned) return;
    s.prevAbsorber = f.damageAbsorber;
    s.absorberOwned = true;
    f.damageAbsorber = (amount: number) => {
      const side = this.side(owner);
      // Anything that arrives after the form has ended falls through to whatever was
      // installed before us, rather than being silently eaten.
      if (side.form !== 'butcher') return side.prevAbsorber ? side.prevAbsorber(amount) : false;
      this.spendHunger(owner, amount);
      return true;
    };
  }

  private removeAbsorber(owner: Owner): void {
    const s = this.sides[owner];
    if (!s || !s.absorberOwned) return;
    const f = this.fighter(owner);
    if (f) f.damageAbsorber = s.prevAbsorber;
    s.prevAbsorber = null;
    s.absorberOwned = false;
  }

  /**
   * A hit landing on the bar instead of the health. Never reverts from in here — `takeDamage`
   * is halfway through its own pipeline, so the form change is left for the next `update`.
   */
  private spendHunger(owner: Owner, amount: number): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    const cost = amount * HUNGER_PER_DAMAGE;
    s.hunger = Math.max(0, s.hunger - cost);
    if (!this.alive(f)) return;
    this.api.spawnHitFlash(f.x, f.y, GLT.blood);
    this.fx(owner).splat(f.x, f.y, 16, GLT.bloodDark);
    this.api.showFloatingText(f.x, f.y - 40, `-${(cost / 1000).toFixed(1)}s`, this.hex(GLT.blood));
  }

  private facingOf(owner: Owner): number {
    const f = this.fighter(owner);
    if (!f) return 0;
    return owner === 'player'
      ? Math.atan2(this.aimY - f.y, this.aimX - f.x)
      : Math.atan2(this.npcAimY - f.y, this.npcAimX - f.x);
  }

  // ── Update ─────────────────────────────────────────────────────────────────

  update(time: number, delta: number): void {
    const playerIs = this.api.elementId === 'gluttony';
    const npcIs = this.api.npcElementId === 'gluttony';
    if (!playerIs && !npcIs) return;

    this.vizT += delta / 1000;
    this.ensureLayers();
    if (this.mawX === 0 && this.mawY === 0) { this.mawX = this.grillX; this.mawY = this.grillY; }

    for (const owner of ['player', 'npc'] as Owner[]) {
      if (!this.isGluttony(owner)) continue;
      this.updateDash(owner, time);
      this.updateForage(owner, time, delta);
      this.updateKnifeHeat(owner, delta);
      this.updateForm(owner, time, delta);
      this.updateFeast(owner, time);
      this.updateCollection(owner);
      this.updateIchor(owner, time);
      this.updateRipen(owner, time);
      this.updateSnacking(owner, delta);
      if (owner === 'npc') this.updateNpcBrain(time);
    }

    this.updateGrill(delta);
    this.updateRotting(delta);
    this.updateKnives(time, delta);
    this.updateFoodProjectiles(time, delta);
    this.updateDrops(time);
    this.updateCoals(time, delta);
    this.updateSkewers(time, delta);
    this.updateRats(time, delta);
    this.updateMaw(time, delta);
    this.updateGobbets(time, delta);
    this.updateTendrils(time, delta);
    this.updateBurnt(time);
    this.updateStuns();
    this.refreshIncoming(time);
    this.updateAvatars(delta, playerIs, npcIs);

    this.paintGround();
    this.paintAir();
    this.paintHud(playerIs);
    this.pushStatuses(playerIs, time);
  }

  private ensureLayers(): void {
    const { scene } = this.api;
    // Fighters are depth 5. The grill is furniture and goes under them; flames, teeth and
    // anything in flight go over, because they have to be readable across a body.
    if (!this.groundGfx) this.groundGfx = scene.add.graphics().setDepth(4);
    if (!this.airGfx) this.airGfx = scene.add.graphics().setDepth(8);
    if (!this.hudGfx) this.hudGfx = scene.add.graphics().setDepth(20).setScrollFactor(0);
  }

  /** The Cannibalize lunge. Applied post-movement, so WASD can't cancel it mid-flight. */
  private updateDash(owner: Owner, time: number): void {
    const s = this.side(owner);
    if (s.dashUntil <= time) return;
    const f = this.fighter(owner);
    if (!this.alive(f)) { s.dashUntil = 0; return; }
    this.body(f).setVelocity(s.dashVx, s.dashVy);
  }

  private updateForage(owner: Owner, time: number, delta: number): void {
    void delta;
    const s = this.side(owner);
    if (!s.forageUntil) return;
    const f = this.fighter(owner);
    if (!this.alive(f)) { s.forageUntil = 0; return; }
    if (time < s.forageUntil) return;

    s.forageUntil = 0;
    this.avatar(owner)?.setHold(null);
    const kind = this.rollForage(owner);
    const got = this.stow(owner, { kind, cooked: false });
    if (got) {
      this.api.showFloatingText(f.x, f.y - 48,
        `${FOOD[kind].emoji} ${FOOD[kind].label}`, this.hex(FOOD[kind].color));
      this.fx(owner).crumbs(f.x, f.y + 8, FOOD[kind].color);
      if (FOOD[kind].rare) {
        this.fx(owner).ring(f.x, f.y, 10, 60, GLT.venom, 620);
        Sfx.playAt('unlock', f.x, { volume: 0.5, rate: 1.2 });
      }
      Sfx.playAt('vine-grow', f.x, { volume: 0.6, rate: 1.15 });
    } else {
      // Full strip: it still came out of the ground, it just lands at your feet.
      this.drop(owner, { kind, cooked: false }, f.x, f.y + 18);
      this.api.showFloatingText(f.x, f.y - 48, '📦 STRIP FULL', this.hex(GLT.linenDark));
    }
  }

  /**
   * What comes out of the ground. Head Chef widens the table from three to seven, and the one
   * rare entry on it is weighted rather than gated — a Death Cap is roughly one dig in twenty,
   * which is often enough to plan around and rare enough to be worth seeing.
   */
  private rollForage(owner: Owner): FoodKind {
    const table = this.up(owner, 'e') ? FORAGEABLE_PLUS : FORAGEABLE;
    let total = 0;
    for (const k of table) total += FOOD[k].rare ? RARE_WEIGHT : 1;
    let roll = Math.random() * total;
    for (const k of table) {
      roll -= FOOD[k].rare ? RARE_WEIGHT : 1;
      if (roll <= 0) return k;
    }
    return table[0];
  }

  /** Two seconds over the coals, or one if somebody threw charcoal on them. */
  private updateKnifeHeat(owner: Owner, delta: number): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    const cleaver = this.up(owner, 'click');

    // A cleaver holds its heat on a clock rather than until it is thrown, so the clock has to
    // run everywhere — mid-flight, in butcher form, and nowhere near the grill.
    if (cleaver && s.knifeHotUntil && this.now >= s.knifeHotUntil) {
      s.knifeHotUntil = 0;
      s.knifeHeat = 0;
      if (this.alive(f)) this.api.showFloatingText(f.x, f.y - 48, '🧊 GONE COLD', this.hex(GLT.steelMid));
    }

    if (!this.alive(f) || s.form !== 'chef' || s.held) return;
    if (this.mawOwner) return;
    if (!this.nearGrill(f)) return;

    const before = s.knifeHeat;
    s.knifeHeat = Math.min(1, s.knifeHeat + (delta / KNIFE_HEAT_MS) * this.heatRate);
    if (before < 1 && s.knifeHeat >= 1) {
      if (cleaver) s.knifeHotUntil = this.now + CLEAVER_HOT_MS;
      this.api.showFloatingText(f.x, f.y - 48,
        `🔥 ${this.bladeName(owner)} HEATED`, this.hex(GLT.heat));
      this.fx(owner).sizzle(f.x, f.y, 8, 22, 500);
      Sfx.playAt('sizzle', f.x, { volume: 0.7, rate: 1.05 });
    }
  }

  /** How fast the coals are working: 1 cold, 2 orange-hot, 3 with Pit Master's blue in them. */
  private get heatRate(): number {
    if (!this.superheated) return 1;
    return this.superheatBlue ? BLUE_SUPERHEAT_RATE : 2;
  }

  /** Pit Master, butcher half: the maw paints whatever blade is standing over it. */
  private updateIchor(owner: Owner, time: number): void {
    if (!this.up(owner, 'r')) return;
    const s = this.side(owner);
    if (s.form !== 'butcher' || this.mawOwner !== owner) return;
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    if (Phaser.Math.Distance.Between(f.x, f.y, this.mawX, this.mawY) > GRILL_REACH) return;
    const fresh = s.ichorUntil <= time;
    s.ichorUntil = time + ICHOR_MS;
    if (fresh) {
      this.api.showFloatingText(f.x, f.y - 54, '🩸 ICHOROUS BLADE', this.hex(GLT.ichorLit));
      this.fx(owner).splat(f.x, f.y + 6, 18, GLT.ichor);
      Sfx.playAt('slime-splat', f.x, { volume: 0.55, rate: 0.7 });
    }
  }

  /** Resourceful leftovers rest on the strip rather than on the grate. */
  private updateRipen(owner: Owner, time: number): void {
    const s = this.side(owner);
    for (const item of s.inv) {
      if (!item.ripenAt || item.cooked || time < item.ripenAt) continue;
      item.cooked = true;
      item.ripenAt = 0;
      const f = this.fighter(owner);
      if (this.alive(f)) {
        this.api.showFloatingText(f.x, f.y - 52,
          `🥡 RESTED — ${item.healCooked ?? 0}`, this.hex(FOOD.leftovers.cookedColor));
      }
    }
  }

  /** The transformation ramp, and the clock running out on it. */
  private updateForm(owner: Owner, time: number, delta: number): void {
    void time;
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (s.form === 'butcher') {
      if (!this.alive(f)) { this.setForm(owner, 'chef'); return; }
      s.hunger = Math.max(0, s.hunger - delta);
      if (s.hunger <= 0) {
        this.api.showFloatingText(f.x, f.y - 54, '🍽️ STARVED', this.hex(GLT.bloodDark));
        this.setForm(owner, 'chef');
      }
    }
    const want = s.form === 'butcher' ? 1 : 0;
    const step = delta / 320;
    s.formBlend = Phaser.Math.Clamp(s.formBlend + (want ? step : -step), 0, 1);
  }

  private updateFeast(owner: Owner, time: number): void {
    const s = this.side(owner);
    if (!s.potUntil) return;
    const f = this.fighter(owner);
    if (!this.alive(f)) { s.potUntil = 0; s.potHeal = 0; return; }
    if (time < s.potUntil) return;

    s.potUntil = 0;
    const heal = s.potHeal;
    s.potHeal = 0;
    const px = f.x;
    const py = f.y - 26;
    this.fx(owner).ring(px, py, 18, 130, GLT.stewLit, 640);
    this.fx(owner).smoke(px, py, 7, 60, 0xd8cfba, 1100);
    if (heal <= 0) {
      this.api.showFloatingText(px, py - 20, '🍲 NOTHING IN IT', this.hex(GLT.linenDark));
      return;
    }
    for (const ally of this.alliesOf(owner)) {
      ally.heal(heal);
      this.api.showFloatingText(ally.x, ally.y - 46, `🍲 +${heal}`, this.hex(GLT.stewLit));
      this.fx(owner).crumbs(ally.x, ally.y + 6, GLT.stew);
    }
    Sfx.playAt('heal', px, { volume: 1, rate: 0.8 });
  }

  /** Walking over the grate, a landed skewer or a dropped ingredient picks it up. */
  private updateCollection(owner: Owner): void {
    const f = this.fighter(owner);
    const s = this.side(owner);
    if (!this.alive(f)) return;

    // ── Off the grill ──
    if (!this.mawOwner && this.nearGrill(f)) {
      for (let i = this.cooking.length - 1; i >= 0; i--) {
        const c = this.cooking[i];
        if (c.owner !== owner) continue;
        // Collectable the moment the first pass finishes. Taking it now is a cooked item;
        // leaving it is what buys the over-sear, and that choice is the whole upgrade.
        if (c.stage < 1) continue;
        if (s.inv.length >= INV_SLOTS) break;
        this.cooking.splice(i, 1);
        const done: InvItem = {
          kind: c.kind, cooked: true, overseared: c.stage >= 2 || undefined,
          healRaw: c.healRaw, healCooked: c.healCooked,
        };
        s.inv.push(done);
        const pos = this.slotPos(c.slot);
        this.fx(owner).sizzle(pos.x, pos.y, 6, 18, 400);
        this.api.showFloatingText(f.x, f.y - 48, this.itemLabel(done),
          this.hex(done.overseared ? GLT.blueHot : FOOD[c.kind].cookedColor));
        Sfx.playAt('craft-complete', f.x, { volume: 0.6, rate: done.overseared ? 0.95 : 1.2 });
      }
    }

    // ── Off the maw ──
    if (this.mawOwner === owner
      && Phaser.Math.Distance.Between(f.x, f.y, this.mawX, this.mawY) <= GRILL_REACH) {
      for (let i = this.rotting.length - 1; i >= 0; i--) {
        const r = this.rotting[i];
        if (r.owner !== owner || r.progress < ROT_MS) continue;
        if (s.inv.length >= INV_SLOTS) break;
        this.rotting.splice(i, 1);
        r.item.rotten = true;
        s.inv.push(r.item);
        this.api.showFloatingText(f.x, f.y - 48, this.itemLabel(r.item), this.hex(GLT.rot));
        this.fx(owner).splat(f.x, f.y + 6, 14, GLT.rotDark);
        Sfx.playAt('slime-splat', f.x, { volume: 0.5, rate: 0.75 });
      }
    }

    // ── Off the floor ──
    for (let i = this.drops.length - 1; i >= 0; i--) {
      const d = this.drops[i];
      if (d.owner !== owner) continue;
      if (Phaser.Math.Distance.Between(f.x, f.y, d.x, d.y) > PICKUP_R) continue;
      if (s.inv.length >= INV_SLOTS) continue;
      this.drops.splice(i, 1);
      s.inv.push(d.item);
      this.api.showFloatingText(f.x, f.y - 44,
        `${FOOD[d.item.kind].emoji} PICKED UP`, this.hex(foodColor(d.item.kind, d.item.cooked)));
      Sfx.playAt('ui-drop', f.x, { volume: 0.5, rate: 1.2 });
    }

    // ── Off a skewer ──
    for (let i = this.skewers.length - 1; i >= 0; i--) {
      const k = this.skewers[i];
      if (k.owner !== owner || k.state !== 'landed' || !k.meat) continue;
      if (Phaser.Math.Distance.Between(f.x, f.y, k.x, k.y) > PICKUP_R + 12) continue;
      if (s.inv.length >= INV_SLOTS) continue;
      k.meat = false;
      k.until = Math.min(k.until, this.now + 500);
      s.inv.push({ kind: 'meat', cooked: false });
      this.fx(owner).splat(k.x, k.y, 18, GLT.blood);
      this.api.showFloatingText(f.x, f.y - 46, '🍖 MEAT', this.hex(GLT.meat));
      Sfx.playAt('slime-splat', f.x, { volume: 0.5, rate: 0.9 });
    }
  }

  // ── The grill ──────────────────────────────────────────────────────────────

  /** Heat needed to finish the first pass — the point at which it becomes collectable food. */
  private cookFull(c: Cooking): number {
    return this.cookMs(c.kind);
  }

  /** Heat needed to finish the second pass. The same as the first without Pit Master. */
  private searFull(c: Cooking): number {
    return this.cookMs(c.kind) * (c.oversear ? 1 + OVERSEAR_EXTRA : 1);
  }

  /**
   * How full the ring around one thing on the grate is, and what colour it runs in. The two
   * passes each get their own sweep from empty: an over-searing item is not "still cooking",
   * it is cooked and doing something else, and one continuous ring would say otherwise.
   */
  private cookRingState(c: Cooking): { ratio: number; done: boolean; blue: boolean } {
    if (c.stage >= 2) return { ratio: 1, done: true, blue: true };
    if (c.stage >= 1) {
      if (!c.oversear) return { ratio: 1, done: true, blue: false };
      const cooked = this.cookFull(c);
      const span = Math.max(1, this.searFull(c) - cooked);
      return { ratio: (c.progress - cooked) / span, done: false, blue: true };
    }
    return { ratio: c.progress / this.cookFull(c), done: false, blue: false };
  }

  private updateGrill(delta: number): void {
    const rate = this.heatRate;
    for (const c of this.cooking) {
      const total = this.searFull(c);
      if (c.progress >= total) continue;
      c.progress = Math.min(total, c.progress + delta * rate);
      const pos = this.slotPos(c.slot);

      // First pass: it is food now, and walking over the grill will take it.
      if (c.stage === 0 && c.progress >= this.cookFull(c)) {
        c.stage = 1;
        // Mastery — "Fifty Covers" and "The Whole Larder". The ring filling is what counts,
        // whether or not anybody ever walks back to collect it.
        this.record(c.owner, 'foodsCooked');
        this.recordCookedKind(c.owner, c.kind);
        this.fx(c.owner).sizzle(pos.x, pos.y, 7, 20, 480);
        this.fx(c.owner).smoke(pos.x, pos.y, 3, 30, 0xa89a86, 800);
        this.api.showFloatingText(pos.x, pos.y - 26,
          `${FOOD[c.kind].emoji} DONE`, this.hex(FOOD[c.kind].cookedColor));
        Sfx.playAt('sizzle', pos.x, { volume: 0.55, rate: 0.9 });
        if (c.oversear) {
          this.api.showFloatingText(pos.x, pos.y - 44, '🔵 SEARING', this.hex(GLT.blueCoal));
        }
      }

      // Second pass, and only for somebody who left it alone through the first.
      if (c.stage === 1 && c.oversear && c.progress >= total) {
        c.stage = 2;
        this.fx(c.owner).sizzle(pos.x, pos.y, 9, 24, 520);
        this.fx(c.owner).ring(pos.x, pos.y, 8, 34, GLT.blueHot, 480);
        this.api.showFloatingText(pos.x, pos.y - 26,
          `${FOOD[c.kind].emoji} OVER-SEARED`, this.hex(GLT.blueHot));
        Sfx.playAt('sizzle', pos.x, { volume: 0.7, rate: 0.7 });
      }
    }
  }

  /** The maw's own grate. Nothing here needs heat — it just needs to be left alone. */
  private updateRotting(delta: number): void {
    if (!this.mawOwner) {
      // The kitchen came back. Whatever was spoiling falls off the teeth onto the floor.
      for (const r of this.rotting) this.drop(r.owner, r.item, this.grillX, this.grillY + 26);
      this.rotting = [];
      return;
    }
    for (const r of this.rotting) {
      if (r.progress >= ROT_MS) continue;
      r.progress = Math.min(ROT_MS, r.progress + delta);
      if (r.progress >= ROT_MS) {
        const pos = this.rotPos(r.slot);
        this.fx(r.owner).splat(pos.x, pos.y, 16, GLT.rot);
        this.api.showFloatingText(pos.x, pos.y - 24,
          `${FOOD[r.item.kind].emoji} ROTTEN`, this.hex(GLT.rot));
        Sfx.playAt('slime-splat', pos.x, { volume: 0.5, rate: 0.65 });
      }
    }
  }

  // ── Projectiles ────────────────────────────────────────────────────────────

  private updateKnives(time: number, delta: number): void {
    const dt = delta / 1000;
    for (let i = this.knives.length - 1; i >= 0; i--) {
      const k = this.knives[i];
      k.x += k.vx * dt;
      k.y += k.vy * dt;
      k.spin += dt * 22;

      // A cleaver keeps its heat as long as the side that threw it does — the four-second
      // clock in `updateKnifeHeat` runs whether the blade is in a hand or in the air.
      if (k.cleaver) k.heated = this.side(k.owner).knifeHotUntil > time;

      let hit: Fighter | null = null;
      for (const t of this.targetsOf(k.owner)) {
        if (k.hit.includes(t)) continue;
        if (Phaser.Math.Distance.Between(k.x, k.y, t.x, t.y) <= KNIFE_HIT_R) { hit = t; break; }
      }

      if (hit) {
        let dmg = k.heated ? KNIFE_HOT_DAMAGE : KNIFE_DAMAGE;
        // The burn bonus is a heated-blade bonus specifically — a cold knife is a cold knife
        // whatever the target has been through.
        const seared = k.heated && this.isBurnt(hit);
        if (seared) dmg = Math.round(dmg * BURNT_KNIFE_MULT);
        k.hit.push(hit);
        hit.takeDamage(this.dmg(k.owner, dmg));
        // Mastery — "Searing Service". A blade that came off the coals, and only that.
        if (k.heated) this.record(k.owner, 'hotKnifeHits');
        this.api.spawnHitFlash(hit.x, hit.y, k.heated ? GLT.heat : GLT.steel);
        this.fx(k.owner).splat(hit.x, hit.y, 20, GLT.blood);
        if (k.heated) this.fx(k.owner).sizzle(hit.x, hit.y, 7, 22, 460);
        if (seared) this.api.showFloatingText(hit.x, hit.y - 48, '🔥 SEARED', this.hex(GLT.ember));
        // The whole point of the slab: it does not stop in the first body it finds.
        if (!k.cleaver) {
          this.knives.splice(i, 1);
          continue;
        }
        this.api.showFloatingText(hit.x, hit.y - 34, '🪓 THROUGH', this.hex(GLT.steel));
      }

      if (time >= k.diesAt || k.x < this.left || k.x > this.right || k.y < this.top || k.y > this.bottom) {
        this.knives.splice(i, 1);
        this.fx(k.owner).sizzle(k.x, k.y, 3, 10, 300);
      }
    }
  }

  private updateFoodProjectiles(time: number, delta: number): void {
    const dt = delta / 1000;
    for (let i = this.foods.length - 1; i >= 0; i--) {
      const p = this.foods[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.spin += dt * 7;

      // Onto the grate, which is the whole point of throwing it.
      if (!this.mawOwner
        && Phaser.Math.Distance.Between(p.x, p.y, this.grillX, this.grillY) <= GRILL_R * 1.4) {
        const slot = this.freeSlot();
        this.foods.splice(i, 1);
        if (slot >= 0 && !p.item.cooked && !p.item.rotten) {
          const oversear = this.up(p.owner, 'r');
          this.cooking.push({
            owner: p.owner, kind: p.item.kind, progress: 0, slot, seed: Math.random() * 999,
            oversear, stage: 0, healRaw: p.item.healRaw, healCooked: p.item.healCooked,
          });
          const pos = this.slotPos(slot);
          this.fx(p.owner).sizzle(pos.x, pos.y, 8, 20, 520);
          this.api.showFloatingText(pos.x, pos.y - 26,
            `${FOOD[p.item.kind].emoji} ON THE GRILL`, this.hex(oversear ? GLT.blueCoal : GLT.ember));
          Sfx.playAt('sizzle', pos.x, { volume: 0.75, rate: 1.1 });
        } else {
          // Grate full, or it was cooked already — it bounces off onto the floor.
          this.drop(p.owner, p.item, p.x + (Math.random() - 0.5) * 60, p.y + 40);
          this.fx(p.owner).crumbs(p.x, p.y, foodColor(p.item.kind, p.item.cooked));
        }
        continue;
      }

      // Onto the teeth. Head Chef's butcher half: the maw is the second cooker, and what it
      // does to food is not cooking.
      if (this.mawOwner === p.owner && this.up(p.owner, 'e')
        && Phaser.Math.Distance.Between(p.x, p.y, this.mawX, this.mawY) <= GRILL_R * 1.4) {
        const slot = this.freeRotSlot();
        this.foods.splice(i, 1);
        if (slot >= 0 && !p.item.rotten) {
          this.rotting.push({
            owner: p.owner, item: p.item, progress: 0, slot, seed: Math.random() * 999,
          });
          const pos = this.rotPos(slot);
          this.api.showFloatingText(pos.x, pos.y - 24,
            `${FOOD[p.item.kind].emoji} LEFT TO ROT`, this.hex(GLT.rotDark));
          Sfx.playAt('slime-splat', pos.x, { volume: 0.6, rate: 0.8 });
        } else {
          this.drop(p.owner, p.item, p.x + (Math.random() - 0.5) * 60, p.y + 40);
        }
        continue;
      }

      // Chef's Friend. Checked after the two cookers on purpose: a rat that happens to be
      // standing over the maw must not steal the rot rack out from under Head Chef.
      if (this.hasRat(p.owner)) {
        const rat = this.rats[p.owner];
        if (rat.out === 'roam'
          && Phaser.Math.Distance.Between(p.x, p.y, rat.x, rat.y) <= RAT_CATCH_R) {
          this.foods.splice(i, 1);
          this.feedRat(p.owner, p.item);
          continue;
        }
        const hole = this.holePos(p.owner);
        if (!rat.out && rat.swapAt <= time
          && Phaser.Math.Distance.Between(p.x, p.y, hole.x, hole.y) <= HOLE_CATCH_R) {
          // Cooked only. He is not an animal.
          if (p.item.cooked && !p.item.rotten) {
            this.foods.splice(i, 1);
            rat.swapAt = time + HOLE_SWAP_MS;
            this.fx(p.owner).crumbs(hole.x, hole.y + 14, foodColor(p.item.kind, true));
            this.api.showFloatingText(hole.x, hole.y + 40,
              `${FOOD[p.item.kind].emoji} TAKEN`, this.hex(GLT.ratFur));
            Sfx.playAt('burrow', hole.x, { volume: 0.5, rate: 1.5 });
            continue;
          }
          if (!p.item.rotten) {
            this.foods.splice(i, 1);
            this.drop(p.owner, p.item, hole.x + (Math.random() - 0.5) * 50, hole.y + 44);
            this.api.showFloatingText(hole.x, hole.y + 40, '🐀 COOKED ONLY', this.hex(GLT.linenDark));
            continue;
          }
        }
      }

      // A body stops it, and there is a joke in being hit with a raw potato — right up until
      // somebody throws a fortnight-old potato instead.
      let hit: Fighter | null = null;
      for (const t of this.targetsOf(p.owner)) {
        if (Phaser.Math.Distance.Between(p.x, p.y, t.x, t.y) <= 24) { hit = t; break; }
      }
      if (hit) {
        if (p.item.rotten) {
          const amount = this.dmg(p.owner, this.rottenDamage(p.item, hit));
          hit.takeDamage(amount);
          this.api.spawnHitFlash(hit.x, hit.y, GLT.rot);
          this.fx(p.owner).splat(hit.x, hit.y, 28, GLT.rot);
          this.api.showFloatingText(hit.x, hit.y - 46,
            `${FOOD[p.item.kind].emoji} SPOILED`, this.hex(GLT.rot));
          Sfx.playAt('slime-splat', hit.x, { volume: 0.85, rate: 0.7 });
        } else {
          hit.takeDamage(this.dmg(p.owner, 3));
          this.api.spawnHitFlash(hit.x, hit.y, foodColor(p.item.kind, p.item.cooked));
          this.fx(p.owner).crumbs(hit.x, hit.y, foodColor(p.item.kind, p.item.cooked));
          this.drop(p.owner, p.item, hit.x + (Math.random() - 0.5) * 50, hit.y + 34);
        }
        this.foods.splice(i, 1);
        continue;
      }

      const wall = p.x <= this.left || p.x >= this.right || p.y <= this.top || p.y >= this.bottom;
      if (time >= p.diesAt || wall) {
        this.drop(p.owner, p.item, p.x, p.y);
        this.foods.splice(i, 1);
      }
    }
  }

  private updateDrops(time: number): void {
    for (let i = this.drops.length - 1; i >= 0; i--) {
      if (time >= this.drops[i].until) this.drops.splice(i, 1);
    }
  }

  private updateCoals(time: number, delta: number): void {
    const dt = delta / 1000;
    for (let i = this.coals.length - 1; i >= 0; i--) {
      const c = this.coals[i];
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      c.spin += dt * 9;

      // Fuel. The grill has to be a grill — a maw does not take charcoal.
      if (!this.mawOwner
        && Phaser.Math.Distance.Between(c.x, c.y, this.grillX, this.grillY) <= GRILL_R * 1.5) {
        this.coals.splice(i, 1);
        this.superheatUntil = Math.max(this.superheatUntil, this.now + SUPERHEAT_MS);
        // Blue wins a tie: the last lump in is the one whose colour the coals take.
        this.superheatBlue = c.blue;
        this.fx(c.owner).flare(this.grillX, this.grillY, GRILL_R * 1.7);
        this.api.showFloatingText(this.grillX, this.grillY - 46,
          c.blue ? '🔵 BLUE COALS' : '🔥 SUPERHEATED',
          this.hex(c.blue ? GLT.blueHot : GLT.emberHot));
        Sfx.playAt('flame-burst', this.grillX, { volume: 0.9, rate: c.blue ? 1.25 : 0.9 });
        continue;
      }

      let hit: Fighter | null = null;
      for (const t of this.targetsOf(c.owner)) {
        if (Phaser.Math.Distance.Between(c.x, c.y, t.x, t.y) <= COAL_HIT_R) { hit = t; break; }
      }
      if (hit) {
        hit.takeDamage(this.dmg(c.owner, COAL_DAMAGE));
        this.burnt.set(hit, this.now + BURNT_MS);
        this.api.spawnHitFlash(hit.x, hit.y, GLT.heat);
        this.fx(c.owner).flare(hit.x, hit.y, 34);
        this.api.showFloatingText(hit.x, hit.y - 44, '🌳 BURNT', this.hex(GLT.char));
        this.coals.splice(i, 1);
        continue;
      }

      const wall = c.x <= this.left || c.x >= this.right || c.y <= this.top || c.y >= this.bottom;
      if (time >= c.diesAt || wall) {
        this.fx(c.owner).sizzle(c.x, c.y, 5, 16, 420);
        this.coals.splice(i, 1);
      }
    }
  }

  private updateSkewers(time: number, delta: number): void {
    const dt = delta / 1000;
    for (let i = this.skewers.length - 1; i >= 0; i--) {
      const k = this.skewers[i];

      if (k.state === 'landed') {
        if (time >= k.until) this.skewers.splice(i, 1);
        continue;
      }

      k.x += k.vx * dt;
      k.y += k.vy * dt;

      for (const t of this.targetsOf(k.owner)) {
        if (k.hit.includes(t)) continue;
        if (Phaser.Math.Distance.Between(k.x, k.y, t.x, t.y) > SKEWER_HIT_R) continue;
        k.hit.push(t);
        t.takeDamage(this.dmg(k.owner, SKEWER_DAMAGE));
        this.api.spawnHitFlash(t.x, t.y, GLT.steel);
        this.fx(k.owner).splat(t.x, t.y, 26, GLT.blood);
        // It takes a cut out of them on the way past, and carries it to the wall.
        if (!k.meat) {
          k.meat = true;
          this.api.showFloatingText(t.x, t.y - 48, '🍖 A CUT TAKEN', this.hex(GLT.meat));
          Sfx.playAt('stab', t.x, { volume: 0.8, rate: 0.9 });
        }
      }

      const wall = k.x <= this.left || k.x >= this.right || k.y <= this.top || k.y >= this.bottom;
      if (!wall) continue;

      k.state = 'landed';
      k.x = Phaser.Math.Clamp(k.x, this.left + 6, this.right - 6);
      k.y = Phaser.Math.Clamp(k.y, this.top + 6, this.bottom - 6);
      k.until = time + (k.meat ? SKEWER_REST_MS : SKEWER_EMPTY_MS);
      this.fx(k.owner).sizzle(k.x, k.y, 4, 14, 320);
      Sfx.playAt('clang', k.x, { volume: 0.5, rate: 1.3 });
    }
  }

  // ── The maw ────────────────────────────────────────────────────────────────

  private updateMaw(time: number, delta: number): void {
    // Whoever is transformed owns it. The player wins a tie, because a maw the player cannot
    // aim is worse than no maw at all.
    const owner: Owner | null = this.sides.player.form === 'butcher' && this.isGluttony('player')
      ? 'player'
      : this.sides.npc.form === 'butcher' && this.isGluttony('npc') ? 'npc' : null;

    if (owner !== this.mawOwner) {
      this.mawOwner = owner;
      this.mawX = this.grillX;
      this.mawY = this.grillY;
      this.mawNextShotAt = time + MAW_SHOT_MS;
      this.mawNextGrabAt = time + MAW_GRAB_MS;
      this.mawNextBiteAt = time + MAW_BITE_MS;
      if (!owner) { this.mawAwakenUntil = 0; this.mawFrenzyUntil = 0; }
    }
    if (!owner) {
      this.mawGape = Phaser.Math.Linear(this.mawGape, 0, Math.min(1, delta / 200));
      this.dreadBlend = Phaser.Math.Linear(this.dreadBlend, 0, Math.min(1, delta / 260));
      return;
    }

    const awake = time < this.mawAwakenUntil;
    this.dreadBlend = Phaser.Math.Linear(this.dreadBlend, this.dread ? 1 : 0,
      Math.min(1, delta / 420));
    this.mawGape = Phaser.Math.Linear(this.mawGape, awake ? 1 : 0.3 + 0.2 * Math.sin(time / 300),
      Math.min(1, delta / 220));

    const target = this.enemyOf(owner);

    if (awake && target) {
      // Off the floor and hunting. It moves at walking pace, so it is a problem you have to
      // solve rather than a problem you outrun.
      const a = Math.atan2(target.y - this.mawY, target.x - this.mawX);
      const d = Phaser.Math.Distance.Between(this.mawX, this.mawY, target.x, target.y);
      if (d > 40) {
        this.mawX += Math.cos(a) * AWAKEN_SPEED * (delta / 1000);
        this.mawY += Math.sin(a) * AWAKEN_SPEED * (delta / 1000);
      }
      this.mawX = Phaser.Math.Clamp(this.mawX, this.left + 20, this.right - 20);
      this.mawY = Phaser.Math.Clamp(this.mawY, this.top + 20, this.bottom - 20);

      if (time >= this.mawNextWhipAt) {
        this.mawNextWhipAt = time + AWAKEN_WHIP_MS;
        let landed = false;
        for (const t of this.targetsOf(owner)) {
          if (Phaser.Math.Distance.Between(this.mawX, this.mawY, t.x, t.y) > AWAKEN_WHIP_REACH) continue;
          t.takeDamage(this.mawDamage(owner, AWAKEN_WHIP_DAMAGE));
          if (t.hp <= 0) this.record(owner, 'mawKills');
          this.api.spawnHitFlash(t.x, t.y, GLT.flesh);
          this.fx(owner).splat(t.x, t.y, 22, GLT.fleshDark);
          landed = true;
        }
        if (landed) {
          this.fx(owner).slashArc(this.mawX, this.mawY, a, AWAKEN_WHIP_REACH * 0.9, GLT.flesh);
          Sfx.playAt('whip', this.mawX, { volume: 0.7, rate: 0.85 });
        }
      }

      if (time >= this.mawNextBarrageAt) {
        this.mawNextBarrageAt = time + AWAKEN_BARRAGE_MS;
        for (let i = 0; i < AWAKEN_BARRAGE_COUNT; i++) {
          const spread = (i - (AWAKEN_BARRAGE_COUNT - 1) / 2) * 0.16;
          this.spitGobbet(owner, a + spread, this.mawDamage(owner, AWAKEN_BULLET_DAMAGE), true);
        }
        Sfx.playAt('musket', this.mawX, { volume: 0.6, rate: 0.75 });
      }

      // Resourceful, butcher half. The scream is the dread maw's whole reason to exist: an
      // unaimed 35 through the middle of the arena that leaves everyone in it standing still.
      if (this.dread && time >= this.mawNextScreamAt) {
        this.mawNextScreamAt = time + SCREAM_MS;
        this.doScream(owner);
      }
    } else {
      // Back on the grill, and back to one lazy shot a second.
      if (!awake) {
        this.mawX = Phaser.Math.Linear(this.mawX, this.grillX, Math.min(1, delta / 260));
        this.mawY = Phaser.Math.Linear(this.mawY, this.grillY, Math.min(1, delta / 260));
      }
    }

    // ── The regular spit ──
    const cone = this.up(owner, 'f');
    if (time >= this.mawNextShotAt) {
      this.mawNextShotAt = time + MAW_SHOT_MS;
      if (target) {
        const hot = time < this.mawFrenzyUntil;
        const base = this.mawDamage(owner, hot ? MAW_FRENZY_DAMAGE : MAW_DAMAGE);
        const aim = Math.atan2(target.y - this.mawY, target.x - this.mawX);
        // Murderous Intent, butcher half: one gobbet a second becomes a fan of five, each of
        // them carrying the vulnerability that makes everything else you own hit harder.
        const shots = cone ? MAW_CONE_COUNT : 1;
        for (let i = 0; i < shots; i++) {
          const off = cone ? (i - (shots - 1) / 2) * MAW_CONE_SPREAD : 0;
          this.spitGobbet(owner, aim + off, base, hot, cone);
        }
        if (cone) Sfx.playAt('musket', this.mawX, { volume: 0.45, rate: 1.1 });
      }
    }

    if (!cone) return;

    // ── The reach ──
    if (time >= this.mawNextGrabAt) {
      this.mawNextGrabAt = time + MAW_GRAB_MS;
      const grab = this.targetsOf(owner)
        .filter((t) => Phaser.Math.Distance.Between(this.mawX, this.mawY, t.x, t.y) <= MAW_GRAB_RANGE)
        .sort((p, q) => Phaser.Math.Distance.Between(this.mawX, this.mawY, p.x, p.y)
          - Phaser.Math.Distance.Between(this.mawX, this.mawY, q.x, q.y))[0];
      if (grab) {
        const ga = Math.atan2(grab.y - this.mawY, grab.x - this.mawX);
        this.stun(grab, MAW_GRAB_STUN_MS, '🖐️ GRABBED');
        this.fx(owner).slashArc(this.mawX, this.mawY, ga,
          Phaser.Math.Distance.Between(this.mawX, this.mawY, grab.x, grab.y), GLT.fleshDark);
        this.fx(owner).ring(grab.x, grab.y, 8, 44, GLT.flesh, 480);
        Sfx.playAt('whip', grab.x, { volume: 0.8, rate: 0.7 });
      }
    }

    // ── The close bite ──
    if (time >= this.mawNextBiteAt) {
      const near = this.targetsOf(owner)
        .find((t) => Phaser.Math.Distance.Between(this.mawX, this.mawY, t.x, t.y) <= MAW_BITE_REACH);
      if (near) {
        this.mawNextBiteAt = time + MAW_BITE_MS;
        const ba = Math.atan2(near.y - this.mawY, near.x - this.mawX);
        near.takeDamage(this.mawDamage(owner, MAW_BITE_DAMAGE));
        if (near.hp <= 0) this.record(owner, 'mawKills');
        this.api.spawnHitFlash(near.x, near.y, GLT.tooth);
        this.fx(owner).bite(near.x, near.y, ba, 38);
        this.api.showFloatingText(near.x, near.y - 50, '🦷 BITTEN', this.hex(GLT.tooth));
        Sfx.playAt('stab', near.x, { volume: 0.9, rate: 0.7 });
      }
    }
  }

  /** The dread maw's scream. Nothing to dodge and nothing to block — only distance works. */
  private doScream(owner: Owner): void {
    this.fx(owner).ring(this.mawX, this.mawY, 30, SCREAM_RADIUS, GLT.bone, 780);
    this.fx(owner).ring(this.mawX, this.mawY, 14, SCREAM_RADIUS * 0.7, GLT.blood, 620);
    this.api.showFloatingText(this.mawX, this.mawY - 70, '😱 SCREAM', this.hex(GLT.bone));
    Sfx.playAt('roar', this.mawX, { volume: 1, rate: 0.45 });
    for (const t of this.targetsOf(owner)) {
      if (Phaser.Math.Distance.Between(this.mawX, this.mawY, t.x, t.y) > SCREAM_RADIUS) continue;
      t.takeDamage(this.dmg(owner, SCREAM_DAMAGE));
      if (t.hp <= 0) this.record(owner, 'mawKills');
      this.api.spawnHitFlash(t.x, t.y, GLT.bone);
      this.stun(t, SCREAM_STUN_MS, '💫 DEAFENED');
    }
  }

  private spitGobbet(owner: Owner, ang: number, damage: number, hot: boolean, vuln = false): void {
    this.gobbets.push({
      owner,
      x: this.mawX + Math.cos(ang) * 20,
      y: this.mawY + Math.sin(ang) * 14,
      vx: Math.cos(ang) * GOBBET_SPEED,
      vy: Math.sin(ang) * GOBBET_SPEED,
      damage, hot, diesAt: this.now + GOBBET_LIFE_MS, spin: Math.random() * 6, vuln,
    });
  }

  private updateGobbets(time: number, delta: number): void {
    const dt = delta / 1000;
    for (let i = this.gobbets.length - 1; i >= 0; i--) {
      const b = this.gobbets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.spin += dt * 10;

      let hit: Fighter | null = null;
      for (const t of this.targetsOf(b.owner)) {
        if (Phaser.Math.Distance.Between(b.x, b.y, t.x, t.y) <= GOBBET_HIT_R) { hit = t; break; }
      }
      if (hit) {
        hit.takeDamage(b.damage);
        if (hit.hp <= 0) this.record(b.owner, 'mawKills');
        this.api.spawnHitFlash(hit.x, hit.y, b.hot ? GLT.blood : GLT.meat);
        this.fx(b.owner).splat(hit.x, hit.y, 16, GLT.blood);
        if (b.vuln) {
          const fresh = (this.vulnerable.get(hit) ?? 0) <= time;
          this.vulnerable.set(hit, time + MAW_VULN_MS);
          if (fresh) this.api.showFloatingText(hit.x, hit.y - 44, '🦷 TENDERISED', this.hex(GLT.flesh));
        }
        this.gobbets.splice(i, 1);
        continue;
      }

      const wall = b.x <= this.left || b.x >= this.right || b.y <= this.top || b.y >= this.bottom;
      if (time >= b.diesAt || wall) {
        this.fx(b.owner).splat(b.x, b.y, 12, GLT.bloodDark);
        this.gobbets.splice(i, 1);
      }
    }
  }

  /**
   * Resourceful, butcher half: the dread maw's limbs go up the walls. A band along every edge
   * of the arena that hurts anybody standing in it — anybody except the butcher, who is the
   * only person in the room the thing recognises.
   */
  private updateTendrils(time: number, delta: number): void {
    void delta;
    const owner = this.mawOwner;
    if (!owner || !this.dread) return;
    if (time < this.nextTendrilAt) return;
    this.nextTendrilAt = time + TENDRIL_TICK_MS;

    for (const t of this.targetsOf(owner)) {
      const inBand = t.x <= this.left + TENDRIL_BAND || t.x >= this.right - TENDRIL_BAND
        || t.y <= this.top + TENDRIL_BAND || t.y >= this.bottom - TENDRIL_BAND;
      if (!inBand) continue;
      t.takeDamage(this.dmg(owner, TENDRIL_DAMAGE));
      if (t.hp <= 0) this.record(owner, 'mawKills');
      this.api.spawnHitFlash(t.x, t.y, GLT.fleshDark);
      this.fx(owner).splat(t.x, t.y, 14, GLT.fleshDark);
    }
  }

  // ── Mastery: Chef's Friend ─────────────────────────────────────────────────

  /**
   * Where a side's hole is. Centred on the top wall, and only pushed off centre in the one case
   * where it would otherwise be ambiguous: a Gluttony mirror in which both chefs own a rat.
   */
  private holePos(owner: Owner): { x: number; y: number } {
    const both = this.hasRat('player') && this.hasRat('npc');
    const off = both ? (owner === 'player' ? -110 : 110) : 0;
    return { x: this.api.width / 2 + off, y: this.top + 6 };
  }

  /** Anything of this side's lying about that the rat is willing to carry home. */
  private fetchableAt(owner: Owner, x: number, y: number, range: number): Drop | SkewerProj | null {
    let best: Drop | SkewerProj | null = null;
    let bestD = range;
    for (const d of this.drops) {
      if (d.owner !== owner) continue;
      const dist = Phaser.Math.Distance.Between(x, y, d.x, d.y);
      if (dist < bestD) { bestD = dist; best = d; }
    }
    for (const k of this.skewers) {
      if (k.owner !== owner || k.state !== 'landed' || !k.meat) continue;
      const dist = Phaser.Math.Distance.Between(x, y, k.x, k.y);
      if (dist < bestD) { bestD = dist; best = k; }
    }
    return best;
  }

  /** Whether an errand's prize is still there to be collected. */
  private fetchValid(owner: Owner, t: Drop | SkewerProj | null): boolean {
    if (!t) return false;
    if ('item' in t) return this.drops.includes(t) && t.owner === owner;
    return this.skewers.includes(t) && t.owner === owner && t.state === 'landed' && t.meat;
  }

  /** Take the prize off the floor and put it in the rat's mouth. */
  private ratGrab(owner: Owner, rat: RatState, t: Drop | SkewerProj): void {
    if ('item' in t) {
      const i = this.drops.indexOf(t);
      if (i >= 0) this.drops.splice(i, 1);
      rat.carry = t.item;
    } else {
      t.meat = false;
      t.until = Math.min(t.until, this.now + 500);
      rat.carry = { kind: 'meat', cooked: false };
    }
    rat.target = null;
    rat.giveUpAt = this.now + RAT_FETCH_MS;
    this.fx(owner).crumbs(rat.x, rat.y, foodColor(rat.carry.kind, rat.carry.cooked));
    Sfx.playAt('ui-drop', rat.x, { volume: 0.45, rate: 1.5 });
  }

  /** The rat arrives with something. Onto the strip if there is room, at your feet if not. */
  private ratDeliver(owner: Owner, rat: RatState): void {
    const item = rat.carry;
    if (!item) return;
    rat.carry = null;
    const f = this.fighter(owner);
    if (!this.alive(f)) { this.drop(owner, item, rat.x, rat.y); return; }
    if (!this.stow(owner, item)) this.drop(owner, item, f.x, f.y + 18);
    this.api.showFloatingText(f.x, f.y - 50,
      `🐀 ${this.itemLabel(item)}`, this.hex(foodColor(item.kind, item.cooked)));
    this.fx(owner).crumbs(f.x, f.y + 6, foodColor(item.kind, item.cooked));
    Sfx.playAt('ui-drop', f.x, { volume: 0.55, rate: 1.25 });
  }

  /** Something cooked went down the hole. What comes back up is one of the rat's own three. */
  private popFromHole(owner: Owner): void {
    const rat = this.rats[owner];
    rat.swapAt = 0;
    const hole = this.holePos(owner);
    const kind = RAT_LARDER[Math.floor(Math.random() * RAT_LARDER.length)];
    this.drop(owner, { kind, cooked: false }, hole.x, hole.y + 40);
    this.fx(owner).crumbs(hole.x, hole.y + 24, FOOD[kind].color);
    this.fx(owner).ring(hole.x, hole.y + 20, 6, 34, FOOD[kind].color, 460);
    this.api.showFloatingText(hole.x, hole.y + 52,
      `${FOOD[kind].emoji} ${FOOD[kind].label}`, this.hex(FOOD[kind].color));
    Sfx.playAt('unlock', hole.x, { volume: 0.6, rate: 1.15 });
  }

  /** Throwing food at the rat rather than at the hole. It gets bigger. */
  private feedRat(owner: Owner, item: InvItem): void {
    const rat = this.rats[owner];
    const before = rat.feed;
    rat.feed = Math.min(RAT_FEED_MAX, rat.feed + 1);
    rat.stayUntil = Math.max(rat.stayUntil, this.now + RAT_STAY_MS);
    this.fx(owner).crumbs(rat.x, rat.y, foodColor(item.kind, item.cooked));
    this.fx(owner).ring(rat.x, rat.y, 8, 40, GLT.ratMutant, 460);
    this.api.showFloatingText(rat.x, rat.y - 32,
      before < RAT_FEED_MAX ? `🐀 FED ${rat.feed}/${RAT_FEED_MAX}` : '🐀 FULL — 12s',
      this.hex(GLT.stewLit));
    Sfx.playAt('potion-drink', rat.x, { volume: 0.6, rate: 1.3 });
  }

  /**
   * The whistle. Nothing here goes through `castAbility` — the enhancement is not in the
   * element's ability list — so the refusals that gate every other key in the game have to be
   * repeated by hand, or a disarm would stop mattering the moment the mastery was bound.
   */
  private tryChefsFriend(owner: Owner, tx: number, ty: number): boolean {
    const f = this.fighter(owner);
    if (!this.alive(f) || !this.hasRat(owner)) return false;
    const rat = this.rats[owner];
    const wall = Date.now();
    if (wall < f.disarmedUntil || wall < f.chickenUntil || wall < f.silencedUntil) return false;
    if (this.now < rat.cdUntil) return false;

    // ── Butcher half: the rat is already out, so the whistle is a sic ──
    if (rat.out === 'roam') {
      const prey = this.targetsOf(owner)
        .filter((t) => Phaser.Math.Distance.Between(tx, ty, t.x, t.y) <= 420)
        .sort((p, q) => Phaser.Math.Distance.Between(tx, ty, p.x, p.y)
          - Phaser.Math.Distance.Between(tx, ty, q.x, q.y))[0];
      if (!prey) {
        if (owner === 'player') {
          this.api.showFloatingText(f.x, f.y - 48, '🐀 NOTHING TO SET IT ON', this.hex(GLT.linenDark));
        }
        return false;
      }
      rat.sicUntil = this.now + RAT_SIC_MS;
      rat.sicTarget = prey;
      rat.nextSlashAt = Math.min(rat.nextSlashAt, this.now + 150);
      rat.cdUntil = this.now + RAT_COOLDOWN_MS;
      // A sic drops whatever it was carrying — it is not a delivery run any more.
      if (rat.carry) { this.drop(owner, rat.carry, rat.x, rat.y); rat.carry = null; }
      this.fx(owner).ring(rat.x, rat.y, 8, 46, GLT.ratEye, 420);
      this.api.showFloatingText(rat.x, rat.y - 34, '🐀 SIC', this.hex(GLT.ratEye));
      Sfx.playAt('roar', rat.x, { volume: 0.65, rate: 1.9 });
      return true;
    }

    // Already out on an errand, or busy down there with a swap.
    if (rat.out === 'fetch' || rat.swapAt > this.now) return false;

    // ── Kitchen half: a fetch, or a trade when there is nothing to fetch ──
    const hole = this.holePos(owner);
    rat.cdUntil = this.now + RAT_COOLDOWN_MS;
    const prize = this.fetchableAt(owner, tx, ty, 100000);
    if (prize) {
      rat.out = 'fetch';
      rat.x = hole.x;
      rat.y = hole.y + HOLE_R;
      rat.target = prize;
      rat.carry = null;
      rat.giveUpAt = this.now + RAT_FETCH_MS;
      this.fx(owner).crumbs(hole.x, hole.y + HOLE_R, GLT.ratFur);
      this.api.showFloatingText(hole.x, hole.y + 40, '🐀 FETCH', this.hex(GLT.ratFur));
      Sfx.playAt('burrow', hole.x, { volume: 0.5, rate: 1.6 });
      return true;
    }
    rat.swapAt = this.now + HOLE_SWAP_MS;
    this.api.showFloatingText(hole.x, hole.y + 40, '🐀 NOTHING OUT THERE', this.hex(GLT.linenDark));
    Sfx.playAt('burrow', hole.x, { volume: 0.45, rate: 1.4 });
    return true;
  }

  /** The rat's one attack. Feeding it multiplies this; a whistle doubles the next one outright. */
  private ratSlash(owner: Owner, rat: RatState, target: Fighter): void {
    rat.nextSlashAt = this.now + RAT_SLASH_MS / (1 + rat.feed * RAT_SPEED_PER_FEED);
    const sic = this.now < rat.sicUntil && (!rat.sicTarget || rat.sicTarget === target);
    let amount = RAT_SLASH_DAMAGE * (1 + rat.feed * RAT_DAMAGE_PER_FEED);
    if (sic) { amount *= RAT_SIC_MULT; rat.sicUntil = 0; rat.sicTarget = null; }
    const dealt = this.dmg(owner, Math.max(1, Math.round(amount)));
    target.takeDamage(dealt);
    const ang = Math.atan2(target.y - rat.y, target.x - rat.x);
    this.api.spawnHitFlash(target.x, target.y, GLT.ratMutant);
    this.fx(owner).slashArc(rat.x, rat.y, ang, RAT_SLASH_REACH, GLT.ratEye);
    this.fx(owner).splat(target.x, target.y, 16, GLT.blood);
    if (sic) this.api.showFloatingText(target.x, target.y - 44, '🐀 SIC', this.hex(GLT.ratEye));
    Sfx.playAt('slash', target.x, { volume: 0.55, rate: 1.6 });
  }

  private updateRats(time: number, delta: number): void {
    for (const owner of ['player', 'npc'] as Owner[]) {
      const rat = this.rats[owner];
      if (!this.hasRat(owner)) {
        // The enhancement was never bound, or the match is not this element's any more.
        rat.out = null;
        rat.carry = null;
        rat.target = null;
        rat.feed = 0;
        rat.swapAt = 0;
        continue;
      }
      this.updateRat(owner, rat, time, delta);
    }
    if (this.isGluttony('npc')) this.updateNpcMastery(time);
  }

  private updateRat(owner: Owner, rat: RatState, time: number, delta: number): void {
    const hole = this.holePos(owner);
    const f = this.fighter(owner);
    const s = this.side(owner);
    const dt = delta / 1000;

    // The trade downstairs runs whether or not anybody is watching it.
    if (rat.swapAt > 0 && time >= rat.swapAt) this.popFromHole(owner);

    // Butcher form is what brings it out as itself; a feeding is what keeps it out afterwards.
    const wantRoam = this.alive(f) && (s.form === 'butcher' || time < rat.stayUntil);
    if (wantRoam && rat.out !== 'roam') {
      rat.out = 'roam';
      rat.x = hole.x;
      rat.y = hole.y + HOLE_R;
      rat.target = null;
      rat.nextSlashAt = time + 600;
      rat.swapAt = 0;
      this.fx(owner).ring(hole.x, hole.y + HOLE_R, 8, 52, GLT.ratMutant, 560);
      this.fx(owner).splat(hole.x, hole.y + HOLE_R, 20, GLT.ratMutantDark);
      this.api.showFloatingText(hole.x, hole.y + 46, '🐀 IT COMES OUT', this.hex(GLT.ratMutant));
      Sfx.playAt('roar', hole.x, { volume: 0.75, rate: 1.7 });
    } else if (!wantRoam && rat.out === 'roam') {
      // Not thrown out — walked home. Whatever it was carrying still gets delivered on the way.
      rat.out = 'fetch';
      rat.target = null;
      rat.giveUpAt = time + RAT_FETCH_MS;
      rat.sicUntil = 0;
      rat.feed = 0;
    }

    // The drawing ramps rather than switching, in both directions.
    rat.mutate = Phaser.Math.Clamp(
      rat.mutate + (rat.out === 'roam' ? 1 : -1) * (delta / 500), 0, 1);
    rat.eyes = Phaser.Math.Clamp(
      rat.eyes + (rat.out || rat.swapAt > time ? -1 : 1) * (delta / 260), 0, 1);

    if (!rat.out) return;

    const move = (tx: number, ty: number, speed: number): number => {
      const d = Phaser.Math.Distance.Between(rat.x, rat.y, tx, ty);
      if (d > 1) {
        const a = Math.atan2(ty - rat.y, tx - rat.x);
        rat.ang = a;
        const step = Math.min(d, speed * dt);
        rat.x += Math.cos(a) * step;
        rat.y += Math.sin(a) * step;
      }
      return d;
    };
    const speedMult = 1 + rat.feed * RAT_SPEED_PER_FEED;

    if (rat.out === 'fetch') {
      const speed = RAT_FETCH_SPEED * speedMult;
      if (rat.carry && this.alive(f)) {
        if (move(f.x, f.y, speed) <= RAT_REACH) this.ratDeliver(owner, rat);
        return;
      }
      if (time >= rat.giveUpAt) {
        // Gave up, or the cook it was walking to is dead. Whatever it had goes on the floor
        // rather than out of the world — it was a real ingredient and somebody paid for it.
        if (rat.carry) { this.drop(owner, rat.carry, rat.x, rat.y); rat.carry = null; }
        rat.target = null;
      }
      if (this.fetchValid(owner, rat.target)) {
        const t = rat.target as Drop | SkewerProj;
        if (move(t.x, t.y, speed) <= RAT_REACH) this.ratGrab(owner, rat, t);
        return;
      }
      rat.target = null;
      // Nothing left to do above ground.
      if (move(hole.x, hole.y + HOLE_R, speed) <= RAT_REACH) {
        rat.out = null;
        rat.feed = 0;
        rat.sicUntil = 0;
      }
      return;
    }

    // ── Roaming, which is the whole butcher half of the enhancement ──
    const speed = RAT_ROAM_SPEED * speedMult;
    if (rat.carry) {
      if (this.alive(f) && move(f.x, f.y, speed) <= RAT_REACH) this.ratDeliver(owner, rat);
      return;
    }
    // A whistled rat has one job and it is not tidying up.
    const sicked = time < rat.sicUntil && this.alive(rat.sicTarget) ? rat.sicTarget : null;
    if (!sicked) {
      // Between swings it tidies up: anything of yours on the floor nearby is collected first.
      const errand = this.fetchableAt(owner, rat.x, rat.y, RAT_ERRAND_RANGE);
      if (errand) {
        if (move(errand.x, errand.y, speed) <= RAT_REACH) this.ratGrab(owner, rat, errand);
        return;
      }
    }
    const prey = sicked ?? this.enemyOf(owner);
    if (!prey) {
      if (this.alive(f)) move(f.x, f.y - 34, speed);
      return;
    }
    const d = move(prey.x, prey.y, speed);
    if (d <= RAT_SLASH_REACH && time >= rat.nextSlashAt) this.ratSlash(owner, rat, prey);
  }

  // ── Mastery: Snacking ──────────────────────────────────────────────────────

  /** What the strip would be worth to this side if they ate all of it. */
  private snackPool(owner: Owner): number {
    const f = this.fighter(owner);
    if (!this.alive(f)) return 0;
    let total = 0;
    for (const item of this.side(owner).inv) total += Math.max(0, this.healValue(f, item));
    return total;
  }

  /** Health a second, on a straight line from an empty strip to a full one. */
  private snackRate(owner: Owner): number {
    const ratio = Phaser.Math.Clamp(this.snackPool(owner) / SNACK_FULL_POOL, 0, 1);
    return SNACK_MIN_RATE + (SNACK_MAX_RATE - SNACK_MIN_RATE) * ratio;
  }

  /**
   * The regeneration itself. Accumulated in fractions and spent in whole points, because
   * `Fighter.heal` rounds into the batched heal number and a 1.4/s trickle paid one frame at a
   * time would otherwise be silently discarded.
   */
  private updateSnacking(owner: Owner, delta: number): void {
    if (!this.masteryOn(owner)) { this.snackAccum[owner] = 0; return; }
    const f = this.fighter(owner);
    if (!this.alive(f) || f.hp >= f.maxHp) { this.snackAccum[owner] = 0; return; }
    this.snackAccum[owner] += (this.snackRate(owner) * delta) / 1000;
    const whole = Math.floor(this.snackAccum[owner]);
    if (whole < 1) return;
    this.snackAccum[owner] -= whole;
    f.heal(whole);
  }

  // ── Mastery: the bot ───────────────────────────────────────────────────────

  /**
   * Everything the bot's rat does that has no key behind it. The bot never re-derives any of
   * this — the kit owns the geometry — and the reads it makes here are the same ones the human's
   * key press makes.
   */
  private updateNpcMastery(time: number): void {
    if (!this.hasRat('npc') || time < this.npcRatCheckAt) return;
    this.npcRatCheckAt = time + NPC_RAT_CHECK_MS;
    const rat = this.rats.npc;
    const s = this.sides.npc;
    const f = this.api.npc;
    if (!this.alive(f)) return;

    // Roaming: feed it whatever is spare, because a fed rat outlives the transformation.
    if (rat.out === 'roam') {
      if (rat.feed < RAT_FEED_MAX && s.inv.length >= 3) {
        const spare = [...s.inv].sort((a, b) => this.healValue(f, a) - this.healValue(f, b))[0];
        if (spare) { this.throwFood('npc', spare, rat.x, rat.y); return; }
      }
      const prey = this.enemyOf('npc');
      if (prey) this.tryChefsFriend('npc', prey.x, prey.y);
      return;
    }

    // In the kitchen: post something cooked down the hole whenever the strip can spare it, and
    // otherwise send the rat out after anything of its own it has left lying around.
    if (!rat.out && rat.swapAt <= this.now) {
      const spare = s.inv.filter((it) => it.cooked && !it.rotten);
      if (spare.length >= 2) {
        const hole = this.holePos('npc');
        this.throwFood('npc', spare[0], hole.x, hole.y);
        return;
      }
    }
    const prize = this.fetchableAt('npc', f.x, f.y, 100000);
    if (prize) this.tryChefsFriend('npc', prize.x, prize.y);
  }

  private updateStuns(): void {
    for (const [t, until] of [...this.stunned]) {
      if (!this.alive(t) || this.now >= until || t.unstoppable) { this.stunned.delete(t); continue; }
      this.body(t).setVelocity(0, 0);
    }
  }

  /**
   * The one place `Fighter.gluttonyIncomingMult` is written. Rewritten from scratch every
   * frame off the kit's own timers — a mint on the cook and a cone bullet in whoever it hit
   * are allowed to multiply, and nobody the kit is no longer touching keeps a multiplier.
   */
  private refreshIncoming(time: number): void {
    const next = new Map<Fighter, number>();

    for (const owner of ['player', 'npc'] as Owner[]) {
      if (!this.isGluttony(owner)) continue;
      const s = this.side(owner);
      if (s.resistUntil <= time) continue;
      const f = this.fighter(owner);
      if (!this.alive(f)) continue;
      next.set(f, (next.get(f) ?? 1) * s.resistMult);
    }

    for (const [f, until] of [...this.vulnerable]) {
      if (!this.alive(f) || time >= until) { this.vulnerable.delete(f); continue; }
      next.set(f, (next.get(f) ?? 1) * MAW_VULN_MULT);
    }

    for (const f of this.incomingTouched) if (!next.has(f)) f.gluttonyIncomingMult = 1;
    this.incomingTouched.clear();
    for (const [f, m] of next) { f.gluttonyIncomingMult = m; this.incomingTouched.add(f); }
  }

  private updateBurnt(time: number): void {
    for (const [f, until] of [...this.burnt]) {
      if (time >= until || !this.alive(f)) this.burnt.delete(f);
    }
  }

  // ── The bot's own kitchen sense ────────────────────────────────────────────

  /**
   * Everything the bot does that has no key: choosing when to eat, and remembering to put the
   * knife back in its hand once whatever it was carrying is gone.
   */
  private updateNpcBrain(time: number): void {
    const s = this.sides.npc;
    const f = this.api.npc;
    if (!this.alive(f)) return;
    if (s.held && !s.inv.includes(s.held)) s.held = null;
    if (time < s.npcNextEat) return;

    const hurt = f.hp < f.maxHp * 0.62;
    const starving = s.form === 'butcher' && s.hunger < 9000;
    if (!hurt && !starving) return;
    if (!s.inv.length) return;

    // Cooked first, and the biggest of them — a bot that eats a raw carrot at 20% health is
    // throwing away the only thing on the strip that could have saved it. Anything worth
    // nothing or less (a rotten scrap, a raw Death Cap) is skipped outright: those are
    // weapons, and a bot swallowing one at 20% health would be finishing the job for you.
    const best = [...s.inv]
      .filter((it) => this.healValue(f, it) > 0)
      .sort((a, b) => (Number(b.cooked) - Number(a.cooked))
        || (this.healValue(f, b) - this.healValue(f, a)))[0];
    if (!best) return;
    this.eatItem('npc', best);
    s.npcNextEat = time + 1200;
  }

  // ── Avatars ────────────────────────────────────────────────────────────────

  private updateAvatars(delta: number, playerIs: boolean, npcIs: boolean): void {
    const { scene } = this.api;

    if (playerIs && this.alive(this.api.player)) {
      const f = this.api.player;
      const s = this.sides.player;
      if (!this.playerAvatar) this.playerAvatar = new GluttonyAvatar(scene, this.pcol);
      this.dressAvatar(this.playerAvatar, s, Math.atan2(this.aimY - f.y, this.aimX - f.x), 'player');
      this.playerAvatar.setMastered(this.api.masteryActive);
      this.playerAvatar.update(delta, f.x, f.y, 1);
    } else if (this.playerAvatar) {
      this.playerAvatar.destroy();
      this.playerAvatar = null;
    }

    if (npcIs && this.alive(this.api.npc)) {
      const f = this.api.npc;
      const s = this.sides.npc;
      if (!this.npcAvatar) this.npcAvatar = new GluttonyAvatar(scene, this.ncol);
      this.dressAvatar(this.npcAvatar, s, Math.atan2(this.npcAimY - f.y, this.npcAimX - f.x), 'npc');
      this.npcAvatar.setMastered(this.api.npcMasteryActive);
      this.npcAvatar.update(delta, f.x, f.y, 1);
    } else if (this.npcAvatar) {
      this.npcAvatar.destroy();
      this.npcAvatar = null;
    }
  }

  private dressAvatar(av: GluttonyAvatar, s: Side, facing: number, owner: Owner): void {
    av.setFacing(facing);
    av.setButcher(s.formBlend);
    av.setKnifeHeat(s.knifeHeat);
    av.setCleaver(this.up(owner, 'click'));
    av.setIchor(this.ichored(owner) ? Phaser.Math.Clamp((s.ichorUntil - this.now) / 900, 0, 1) : 0);
    av.setHeld(s.held);
    av.setFed(s.inv.length / INV_SLOTS);
    av.setIntensity(s.form === 'butcher' ? 1.25 : 1);
  }

  // ── Painting ───────────────────────────────────────────────────────────────

  /** The grill or the maw, the floor drops, and the skewers stuck in the walls. */
  private paintGround(): void {
    const g = this.groundGfx;
    if (!g) return;
    g.clear();
    const t = this.vizT;
    const tint = this.mawOwner ? this.col(this.mawOwner) : this.pcol;

    if (this.mawOwner) {
      const rage = Phaser.Math.Clamp(
        (this.now < this.mawFrenzyUntil ? 0.6 : 0) + (this.now < this.mawAwakenUntil ? 0.4 : 0), 0, 1);
      // Tentacles go under the mouth so the lip covers where they root.
      const arms = this.now < this.mawAwakenUntil ? 7 : 4;
      for (let i = 0; i < arms; i++) {
        const a = (i / arms) * Math.PI * 2 + t * 0.35;
        mawTentacle(g, tint, this.mawX + Math.cos(a) * GRILL_R * 0.8,
          this.mawY + Math.sin(a) * GRILL_R * 0.5, a,
          GRILL_R * (1.5 + rage * 1.5 + this.dreadBlend), t, i * 3.1,
          4.4 + rage * 2 + this.dreadBlend * 2, 0.95, rage);
      }
      mawBody(g, tint, this.mawX, this.mawY, GRILL_R, t, this.mawGape, rage, 1, this.dreadBlend);
      this.paintEdgeTendrils(g, tint, t);
    } else {
      const superheat = this.superheated
        ? Phaser.Math.Clamp((this.superheatUntil - this.now) / 900, 0, 1)
        : 0;
      grillRig(g, tint, this.grillX, this.grillY, GRILL_R, t, superheat, 1, this.superheatBlue);
    }

    // Dropped ingredients, with the shadow that says they are on the floor.
    for (const d of this.drops) {
      const fade = Phaser.Math.Clamp((d.until - this.now) / 1500, 0, 1);
      g.fillStyle(this.col(d.owner)(0x000000), 0.3 * fade);
      g.fillEllipse(d.x, d.y + 8, 22, 8);
      itemShape(g, this.col(d.owner), d.x, d.y, d.item, 22, fade, this.vizT * 1.6 + d.seed);
    }

    // Skewers, and the mess where they landed.
    for (const k of this.skewers) {
      if (k.state !== 'landed') continue;
      const fade = Phaser.Math.Clamp((k.until - this.now) / 800, 0, 1);
      spatter(g, this.col(k.owner), k.x, k.y, 12, GLT.blood, 4, fade * 0.7);
    }

    // Chef's Friend: the hole is cut into the wall, so it belongs under everything that walks.
    for (const owner of ['player', 'npc'] as Owner[]) {
      if (!this.hasRat(owner)) continue;
      const rat = this.rats[owner];
      const hole = this.holePos(owner);
      const pending = rat.swapAt > this.now
        ? Phaser.Math.Clamp((rat.swapAt - this.now) / HOLE_SWAP_MS, 0, 1)
        : 0;
      ratHole(g, this.col(owner), hole.x, hole.y, HOLE_R, t, rat.eyes, pending, 1);
    }
  }

  /**
   * The band of limbs a dread maw puts up the four walls. Drawn as a run of tapering tentacles
   * rooted just off-screen and reaching inward, so the hazard's depth is honestly the band the
   * kit actually tests against rather than a decorative fringe.
   */
  private paintEdgeTendrils(g: Phaser.GameObjects.Graphics, tint: GluttonyColorFn, t: number): void {
    if (this.dreadBlend < 0.02) return;
    const a = this.dreadBlend;
    const reach = TENDRIL_BAND * (0.9 + 0.35 * a);
    const edges: Array<{ n: number; at: (s: number) => [number, number]; ang: number }> = [
      { n: 9, at: (s) => [this.left, this.top + s * (this.bottom - this.top)], ang: 0 },
      { n: 9, at: (s) => [this.right, this.top + s * (this.bottom - this.top)], ang: Math.PI },
      { n: 12, at: (s) => [this.left + s * (this.right - this.left), this.top], ang: Math.PI / 2 },
      { n: 12, at: (s) => [this.left + s * (this.right - this.left), this.bottom], ang: -Math.PI / 2 },
    ];
    // The band itself, so a player can see exactly where standing becomes a mistake.
    g.fillStyle(tint(GLT.fleshDark), a * 0.16);
    g.fillRect(this.left, this.top, this.right - this.left, TENDRIL_BAND);
    g.fillRect(this.left, this.bottom - TENDRIL_BAND, this.right - this.left, TENDRIL_BAND);
    g.fillRect(this.left, this.top, TENDRIL_BAND, this.bottom - this.top);
    g.fillRect(this.right - TENDRIL_BAND, this.top, TENDRIL_BAND, this.bottom - this.top);

    for (const e of edges) {
      for (let i = 0; i < e.n; i++) {
        const s = (i + 0.5) / e.n;
        const [x, y] = e.at(s);
        const sway = Math.sin(t * 2.2 + i * 1.7) * 0.35;
        mawTentacle(g, tint, x, y, e.ang + sway, reach * (0.8 + 0.4 * jitter(41, i)),
          t, i * 2.7, 3.4 * a, 0.9 * a, 0.8);
      }
    }
  }

  /** Everything in flight, plus the fire on top of the grill. */
  private paintAir(): void {
    const g = this.airGfx;
    if (!g) return;
    g.clear();
    const t = this.vizT;

    // ── Fire and what is on the grate ──
    if (!this.mawOwner) {
      const superheat = this.superheated
        ? Phaser.Math.Clamp((this.superheatUntil - this.now) / 900, 0, 1)
        : 0;
      grillHeat(g, this.pcol, this.grillX, this.grillY, GRILL_R, t, superheat, 1, this.superheatBlue);
    }
    for (const c of this.cooking) {
      const pos = this.slotPos(c.slot);
      const ring = this.cookRingState(c);
      const bob = Math.sin(t * 3 + c.seed) * 1.4;
      itemShape(g, this.col(c.owner), pos.x, pos.y + bob,
        { kind: c.kind, cooked: c.stage >= 1, overseared: c.stage >= 2 }, 21, 1, t * 2 + c.seed);
      cookRing(g, this.col(c.owner), pos.x, pos.y + bob, 15, ring.ratio, 0.9, ring.done, ring.blue);
    }

    // ── What is spoiling on the teeth ──
    for (const r of this.rotting) {
      const pos = this.rotPos(r.slot);
      const done = r.progress >= ROT_MS;
      const bob = Math.sin(t * 2.2 + r.seed) * 1.6;
      itemShape(g, this.col(r.owner), pos.x, pos.y + bob,
        { ...r.item, rotten: done }, 20, 1, t * 1.6 + r.seed);
      cookRing(g, this.col(r.owner), pos.x, pos.y + bob, 14, r.progress / ROT_MS, 0.85, done);
    }

    // ── Blades in flight ──
    for (const k of this.knives) {
      const ang = Math.atan2(k.vy, k.vx) + Math.sin(k.spin) * 0.5;
      if (k.cleaver) {
        chefCleaver(g, this.col(k.owner), k.x, k.y, ang, 32, k.heated ? 1 : 0, 1,
          this.ichored(k.owner) ? 1 : 0, t);
      } else {
        kitchenKnife(g, this.col(k.owner), k.x, k.y, ang, 30, k.heated ? 1 : 0, 1);
      }
    }

    // ── Thrown food ──
    for (const p of this.foods) {
      itemShape(g, this.col(p.owner), p.x, p.y, p.item, 22, 1, p.spin);
    }

    // ── Charcoal ──
    for (const c of this.coals) {
      charcoalLump(g, this.col(c.owner), c.x, c.y, c.spin * 0.4, 15, 0.85, 1, 5, c.blue);
    }

    // ── Skewers ──
    for (const k of this.skewers) {
      const fade = k.state === 'landed'
        ? Phaser.Math.Clamp((k.until - this.now) / 800, 0, 1)
        : 1;
      const ang = k.state === 'landed' ? k.ang : Math.atan2(k.vy, k.vx);
      skewerShape(g, this.col(k.owner), k.x, k.y, ang, SKEWER_LEN, k.meat, fade, t);
    }

    // ── Meat the maw has spat ──
    for (const b of this.gobbets) {
      drawGobbet(g, this.col(b.owner), b.x, b.y, b.hot ? 9 : 7, b.spin, 1, b.hot);
    }

    // ── Feast pots ──
    for (const owner of ['player', 'npc'] as Owner[]) {
      const s = this.sides[owner];
      if (!s.potUntil) continue;
      const f = this.fighter(owner);
      if (!this.alive(f)) continue;
      const left = (s.potUntil - this.now) / FEAST_MS;
      stewPot(g, this.col(owner), f.x, f.y - 34, 17, t, 1 - left, 1);
    }

    // ── The rat, and whatever it is bringing back ──
    for (const owner of ['player', 'npc'] as Owner[]) {
      const rat = this.rats[owner];
      if (!rat.out || !this.hasRat(owner)) continue;
      const col = this.col(owner);
      // The sic ring goes under it, so a whistled rat is readable from across the arena.
      if (this.now < rat.sicUntil) {
        g.lineStyle(1.6, col(GLT.ratEye), 0.35 + 0.25 * Math.sin(t * 9));
        g.strokeCircle(rat.x, rat.y, 16 + 3 * Math.sin(t * 6));
      }
      g.fillStyle(col(0x000000), 0.28);
      g.fillEllipse(rat.x, rat.y + 8, 22 + rat.mutate * 10, 7);
      ratBody(g, col, rat.x, rat.y, rat.ang, 22, rat.mutate, rat.feed / RAT_FEED_MAX, t, 1);
      if (rat.carry) {
        itemShape(g, col, rat.x - Math.cos(rat.ang) * 14, rat.y - Math.sin(rat.ang) * 14 - 10,
          rat.carry, 16, 1, t * 2);
      }
    }

    // ── Burn marks on whoever is carrying one ──
    for (const [f, until] of this.burnt) {
      if (!this.alive(f)) continue;
      const fade = Phaser.Math.Clamp((until - this.now) / 900, 0, 1);
      for (let i = 0; i < 4; i++) {
        const a = t * 2.4 + i * 1.6;
        const r = 18 + Math.sin(t * 3 + i) * 3;
        g.fillStyle(this.pcol(i % 2 ? GLT.ember : GLT.heat), fade * 0.75);
        g.fillCircle(f.x + Math.cos(a) * r, f.y + Math.sin(a) * r * 0.6 - 4, 2 - i * 0.2);
      }
      g.lineStyle(1.4, this.pcol(GLT.char), fade * 0.5);
      g.strokeCircle(f.x, f.y, 22);
    }
  }

  /** The prep strip, and the hunger bar under it. */
  private paintHud(playerIsGluttony: boolean): void {
    const g = this.hudGfx;
    if (!g) return;
    g.clear();
    if (!playerIsGluttony) {
      this.hudLabel?.setVisible(false);
      return;
    }
    const s = this.sides.player;

    // ── The strip ──
    for (let i = 0; i < INV_SLOTS; i++) {
      const x = HUD_X + i * (SLOT_SIZE + SLOT_GAP);
      const item = s.inv[i] ?? null;
      prepSlot(g, this.pcol, x, HUD_Y, SLOT_SIZE, item !== null && item === s.held, !item, 1);
      if (!item) continue;
      itemShape(g, this.pcol, x + SLOT_SIZE / 2, HUD_Y + SLOT_SIZE / 2,
        item, SLOT_SIZE * 0.72, 1, this.vizT * 1.4 + i);
      // A pip in the corner is the fastest read on what state a tile is in: green cooked,
      // blue over-seared, and the rotten green of something that is not food any more.
      const pip = item.rotten ? GLT.rot : item.overseared ? GLT.blueHot : item.cooked ? 0x7ada6a : 0;
      if (pip) {
        g.fillStyle(this.pcol(pip), 0.95);
        g.fillCircle(x + SLOT_SIZE - 6, HUD_Y + 6, 3);
      }
      // Leftovers rest on their own clock, so the tile carries it.
      if (item.ripenAt && item.ripenAt > this.now) {
        const left = 1 - (item.ripenAt - this.now) / LEFTOVER_REST_MS;
        g.fillStyle(this.pcol(GLT.char), 0.8);
        g.fillRect(x + 3, HUD_Y + SLOT_SIZE - 6, SLOT_SIZE - 6, 3);
        g.fillStyle(this.pcol(GLT.parcel), 1);
        g.fillRect(x + 3, HUD_Y + SLOT_SIZE - 6, (SLOT_SIZE - 6) * Phaser.Math.Clamp(left, 0, 1), 3);
      }
    }

    // The blade tile: what you are holding when you are not holding food.
    const kx = KNIFE_TILE_X;
    const cleaver = this.up('player', 'click');
    prepSlot(g, this.pcol, kx, HUD_Y, SLOT_SIZE, s.held === null, false, 1);
    if (cleaver) {
      chefCleaver(g, this.pcol, kx + SLOT_SIZE / 2 - 3, HUD_Y + SLOT_SIZE / 2, -0.35, 24,
        s.knifeHeat, 1, this.ichored('player') ? 1 : 0, this.vizT);
    } else {
      kitchenKnife(g, this.pcol, kx + SLOT_SIZE / 2 - 4, HUD_Y + SLOT_SIZE / 2, -0.5, 26,
        s.knifeHeat, 1);
    }
    // Cold: how far through heating you are. Red: how long you have left before it goes out.
    const heatBar = s.knifeHotUntil > this.now
      ? (s.knifeHotUntil - this.now) / CLEAVER_HOT_MS
      : (s.knifeHeat > 0 && s.knifeHeat < 1 ? s.knifeHeat : 0);
    if (heatBar > 0) {
      g.fillStyle(this.pcol(GLT.char), 0.85);
      g.fillRect(kx + 3, HUD_Y + SLOT_SIZE - 7, SLOT_SIZE - 6, 4);
      g.fillStyle(this.pcol(s.knifeHotUntil > this.now ? GLT.emberHot : GLT.heat), 1);
      g.fillRect(kx + 3, HUD_Y + SLOT_SIZE - 7, (SLOT_SIZE - 6) * Phaser.Math.Clamp(heatBar, 0, 1), 4);
    }

    // ── The hunger bar ──
    if (s.form === 'butcher' || s.formBlend > 0.02) {
      hungerBar(g, this.pcol, HUD_X, HUNGER_Y, HUD_W + SLOT_SIZE + 12, HUNGER_H,
        s.hunger / HUNGER_MAX, this.vizT, Math.max(0.15, s.formBlend));
    }

    if (!this.hudLabel) {
      this.hudLabel = this.api.scene.add.text(HUD_X, HUD_Y - 15, '', {
        fontSize: '10px',
        fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
        color: '#f6f2e8',
        stroke: '#0a0508',
        strokeThickness: 3,
      }).setDepth(21).setScrollFactor(0);
    }
    this.hudLabel.setVisible(true);
    if (s.form === 'butcher') {
      const rot = this.rotting.filter((r) => r.owner === 'player').length;
      this.hudLabel.setText(`BUTCHER · ${(s.hunger / 1000).toFixed(1)}s`
        + (rot ? `   ·   ${rot} ON THE MAW` : '')
        + (this.ichored('player') ? '   ·   ICHOROUS' : ''));
      this.hudLabel.setColor(this.hex(this.ichored('player') ? GLT.ichorLit : GLT.blood));
    } else {
      const cooking = this.cooking.filter((c) => c.owner === 'player').length;
      this.hudLabel.setText(
        `PREP · CLICK A TILE${cooking ? `   ·   ${cooking} ON THE GRILL` : ''}${this.superheated ? (this.superheatBlue ? '   ·   BLUE COALS' : '   ·   SUPERHEATED') : ''}`,
      );
      this.hudLabel.setColor(this.hex(
        this.superheated ? (this.superheatBlue ? GLT.blueHot : GLT.ember) : GLT.white));
    }
  }

  // ── Status tray ────────────────────────────────────────────────────────────

  private pushStatuses(playerIsGluttony: boolean, time: number): void {
    const s = this.sides.player;
    const p = this.api.player;

    this.api.setStatusIndicator('glut-butcher', playerIsGluttony && s.form === 'butcher' ? {
      name: 'Butcher', emoji: '🔪', color: GLT.blood,
      description: 'Damage comes off the hunger bar instead of your health. Eat anything to put time back on it — and the grill is a maw until you change back.',
      until: time + s.hunger, priority: 96,
    } : null);

    this.api.setStatusIndicator('glut-hot-knife', playerIsGluttony && s.knifeHeat >= 1 ? {
      name: 'Red Hot', emoji: '🔥', color: GLT.heat,
      description: 'The blade came off the coals. 35 damage instead of 25, and half again on anything Charcoal Chuck has burnt. Throwing it spends the heat.',
      priority: 104,
    } : null);

    this.api.setStatusIndicator('glut-forage', playerIsGluttony && s.forageUntil > time ? {
      name: 'Foraging', emoji: '🌿', color: GLT.frond,
      description: 'Head down and half speed while you dig. Something comes up at the end of it.',
      until: s.forageUntil, priority: 118,
    } : null);

    this.api.setStatusIndicator('glut-pot', playerIsGluttony && s.potUntil > time ? {
      name: 'Feast', emoji: '🍲', color: GLT.stewLit,
      description: `The pot is on. ${s.potHeal} HP to you and every ally when it finishes swirling.`,
      until: s.potUntil, priority: 100,
    } : null);

    const cooking = this.cooking.filter((c) => c.owner === 'player');
    const done = cooking.filter((c) => c.stage >= 1).length;
    const searing = cooking.filter((c) => c.stage === 1 && c.oversear).length;
    this.api.setStatusIndicator('glut-cooking', playerIsGluttony && cooking.length ? {
      name: searing ? 'Over-Searing' : done ? 'Ready to Collect' : 'On the Grill',
      emoji: searing ? '🔵' : done ? '🍽️' : '♨️',
      color: searing ? GLT.blueCoal : done ? 0x7ada6a : GLT.ember,
      description: searing
        ? 'Cooked, collectable, and still on the fire. Leave it through the second pass and it comes off worth 25% more with 3 more seconds on its buff — walk over the grill now and you take it as it is.'
        : 'Ingredients on the grate. Walk over the grill to take back whatever has finished — cooked is worth double what raw is.',
      count: cooking.length, priority: 112,
    } : null);

    const rotting = this.rotting.filter((r) => r.owner === 'player');
    this.api.setStatusIndicator('glut-rotting', playerIsGluttony && rotting.length ? {
      name: 'Left to Rot', emoji: '🪰', color: GLT.rot,
      description: 'Ingredients on the maw. Six seconds and they spoil: half the healing of a raw one, and thrown at somebody they do what the cooked one would have healed.',
      count: rotting.length, priority: 111,
    } : null);

    this.api.setStatusIndicator('glut-superheat', playerIsGluttony && this.superheated ? {
      name: this.superheatBlue ? 'Blue Coals' : 'Superheated', emoji: '🔥',
      color: this.superheatBlue ? GLT.blueHot : GLT.emberHot,
      description: this.superheatBlue
        ? 'Pit Master charcoal. Everything on the grate cooks at triple speed, and the blade heats at triple speed with it.'
        : 'Charcoal on the coals. Everything on the grate cooks at double speed, and the knife heats at double speed with it.',
      until: this.superheatUntil, priority: 110,
    } : null);

    // ── Head Chef's larder, and what the maw does to a blade ──
    this.api.setStatusIndicator('glut-berries', playerIsGluttony && s.dmgUntil > time ? {
      name: 'Bristling', emoji: '🫐', color: GLT.berry,
      description: `Bristle Berries. Everything you deal is worth ${Math.round((s.dmgMult - 1) * 100)}% more while it lasts.`,
      until: s.dmgUntil, priority: 106,
    } : null);

    this.api.setStatusIndicator('glut-mint', playerIsGluttony && s.resistUntil > time ? {
      name: 'Minted', emoji: '🍃', color: GLT.mint,
      description: `Winter Mint. Everything aimed at you is worth ${Math.round((1 - s.resistMult) * 100)}% less while it lasts.`,
      until: s.resistUntil, priority: 105,
    } : null);

    this.api.setStatusIndicator('glut-deathcap', playerIsGluttony && s.foodSpeedUntil > time ? {
      name: 'Death Cap', emoji: '☠️', color: GLT.venom,
      description: `A poisonous mushroom does exactly one good thing: +${Math.round((s.foodSpeedMult - 1) * 100)}% walk speed.`,
      until: s.foodSpeedUntil, priority: 103,
    } : null);

    this.api.setStatusIndicator('glut-haste', playerIsGluttony && s.hasteUntil > time ? {
      name: 'Carving', emoji: '🏃', color: GLT.steel,
      description: 'The cleaver landed. +25% walk speed for 2 seconds, refreshed every time it lands again.',
      until: s.hasteUntil, priority: 102,
    } : null);

    this.api.setStatusIndicator('glut-ichor', playerIsGluttony && s.ichorUntil > time ? {
      name: 'Ichorous Blade', emoji: '🩸', color: GLT.ichorLit,
      description: 'The maw is running down your cleaver. Every 25 damage it deals buys a second of butcher form back.',
      until: s.ichorUntil, priority: 101,
    } : null);

    this.api.setStatusIndicator('glut-maw', playerIsGluttony && this.mawOwner === 'player'
      && time < this.mawAwakenUntil ? {
      name: 'Maw Awakened', emoji: '👄', color: GLT.flesh,
      description: 'It is off the floor and hunting on its own — tentacle whips at close range and barrages of meat at any range.',
      until: this.mawAwakenUntil, priority: 94,
    } : null);

    // ── Mastery ──
    const snacking = playerIsGluttony && this.masteryOn('player');
    this.api.setStatusIndicator('glut-snacking', snacking ? {
      name: 'Snacking', emoji: '🍪', color: GLT.stewLit,
      description: `A full larder is a slow heal. ${this.snackRate('player').toFixed(1)} health a second right now — ${Math.round(this.snackPool('player'))} of healing on the strip, and it runs from 1/s empty to 9/s at 200.`,
      priority: 98,
    } : null);

    const rat = this.rats.player;
    this.api.setStatusIndicator('glut-rat', playerIsGluttony && this.hasRat('player') && rat.out ? {
      name: rat.out === 'roam' ? 'The Friend' : 'Fetching', emoji: '🐀',
      color: rat.out === 'roam' ? GLT.ratMutant : GLT.ratFur,
      description: rat.out === 'roam'
        ? `Out and hunting. ${Math.round(RAT_SLASH_DAMAGE * (1 + rat.feed * RAT_DAMAGE_PER_FEED))} a slash at ${rat.feed}/${RAT_FEED_MAX} feeds, and it collects anything of yours it passes. Throw food at it to feed it — each mouthful buys 12 seconds of staying out after the transformation ends.`
        : 'Out on an errand. It will bring back whatever it went for and put it straight on the strip.',
      until: rat.out === 'roam' && rat.stayUntil > time && s.form !== 'butcher'
        ? rat.stayUntil : undefined,
      priority: 97,
    } : null);

    // ── Victim side: the burn and the maw's mark can be on the player whoever is Gluttony. ──
    const burn = this.burnt.get(p);
    this.api.setStatusIndicator('glut-burnt', burn && burn > time ? {
      name: 'Burnt', emoji: '🌳', color: GLT.char,
      description: 'Charcoal caught you. A heated kitchen knife does 50% more damage to you until it wears off.',
      until: burn, priority: 24,
    } : null);

    const vuln = this.vulnerable.get(p);
    this.api.setStatusIndicator('glut-vuln', vuln && vuln > time ? {
      name: 'Tenderised', emoji: '🦷', color: GLT.flesh,
      description: 'The maw spat on you. Everything aimed at you does 15% more until it wears off, and its cone refreshes it every second.',
      until: vuln, priority: 23,
    } : null);
  }

  // ── Accessors read by ArenaScene / the NPC ─────────────────────────────────

  /**
   * Forage's half speed. Pulled by ArenaScene rather than pushed from `update()`, which runs
   * after the frame's movement has already resolved.
   */
  private speedMultFor(owner: Owner): number {
    if (!this.isGluttony(owner)) return 1;
    const s = this.side(owner);
    let mult = s.forageUntil > this.now ? FORAGE_SPEED_MULT : 1;
    // A Death Cap and a landed Cleave are separate things and both are worth having at once.
    if (s.foodSpeedUntil > this.now) mult *= s.foodSpeedMult;
    if (s.hasteUntil > this.now) mult *= CLEAVE_HASTE_MULT;
    return mult;
  }

  getPlayerSpeedMult(): number { return this.speedMultFor('player'); }
  getNpcSpeedMult(): number { return this.speedMultFor('npc'); }

  /** Which tray ArenaScene should be showing — read once on match start. */
  playerForm(): GluttonyForm { return this.sides.player.form; }

  isButcher(owner: Owner): boolean { return this.side(owner).form === 'butcher'; }
  hungerMs(owner: Owner): number { return this.side(owner).hunger; }
  foodCount(owner: Owner): number { return this.side(owner).inv.length; }
  hasMeat(owner: Owner): boolean { return this.side(owner).inv.some((i) => i.kind === 'meat'); }
  isForaging(owner: Owner): boolean { return this.side(owner).forageUntil > this.now; }
  /** True while the grate has room, so the bot stops throwing food at a full grill. */
  grillHasRoom(): boolean { return !this.mawOwner && this.freeSlot() >= 0; }
  cookingCount(owner: Owner): number {
    return this.cooking.filter((c) => c.owner === owner).length;
  }
  /** Where the grill is. The bot aims charcoal at it as fuel rather than as a weapon. */
  grillPoint(): { x: number; y: number } { return { x: this.grillX, y: this.grillY }; }
  isMawAwake(owner: Owner): boolean {
    return this.mawOwner === owner && this.now < this.mawAwakenUntil;
  }

  /**
   * Where the bot's feet should be going, or null to let its own state machine drive. Only ever
   * a collection: something of its own is finished and sitting somewhere it is not.
   */
  npcSeekPoint(): { x: number; y: number } | null {
    if (!this.isGluttony('npc')) return null;
    const npc = this.api.npc;
    const s = this.sides.npc;
    if (!this.alive(npc) || s.inv.length >= INV_SLOTS) return null;

    if (!this.mawOwner && this.cooking.some((c) => c.owner === 'npc' && c.stage >= 1)) {
      return { x: this.grillX, y: this.grillY };
    }
    const skewer = this.skewers.find((k) => k.owner === 'npc' && k.state === 'landed' && k.meat);
    if (skewer) return { x: skewer.x, y: skewer.y };
    const drop = this.drops.find((d) => d.owner === 'npc');
    if (drop) return { x: drop.x, y: drop.y };
    return null;
  }

  /**
   * Ability tray fill. Four of the ten cards spend most of their life showing something that is
   * not a cooldown — the blade coming up to heat, the hunger bar, the pot and the maw's clock.
   */
  getBarRatio(abilityId: string, time: number): number {
    const p = this.api.player;
    const s = this.sides.player;

    if (abilityId === 'glut-knife' && !s.held && s.knifeHeat > 0
      && p.getCooldownRatio('glut-knife') >= 1) {
      return s.knifeHeat;
    }
    if (abilityId === 'glut-butcher' && s.form === 'butcher') {
      return Phaser.Math.Clamp(s.hunger / HUNGER_MAX, 0, 1);
    }
    if (abilityId === 'glut-feast' && s.potUntil > time) {
      return Phaser.Math.Clamp((s.potUntil - time) / FEAST_MS, 0, 1);
    }
    if (abilityId === 'glut-maw' && this.mawOwner === 'player' && time < this.mawAwakenUntil) {
      return Phaser.Math.Clamp((this.mawAwakenUntil - time) / Math.max(1, this.mawAwakenTotal), 0, 1);
    }
    if (abilityId === 'glut-poach'
      && this.skewers.some((k) => k.owner === 'player' && k.state === 'landed' && k.meat)) {
      return 1;
    }
    // The mastery is not an ability, so its card counts a clock the kit owns. A rat that is out
    // reads as full: what you are waiting on is not the whistle, it is the rat coming home.
    if (abilityId === 'chefs-friend') {
      const rat = this.rats.player;
      if (rat.out) return 1;
      const left = rat.cdUntil - time;
      return left <= 0 ? 1 : Phaser.Math.Clamp(1 - left / RAT_COOLDOWN_MS, 0, 1);
    }
    return p.getCooldownRatio(abilityId);
  }
}
