import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { CastContext } from '../Ability';
import type { CustomStatus } from './StatusHudKit';
import { Sfx } from '../../audio';
import {
  FOR, FortuneAvatar, FortuneColorFn, FortuneFx, Jewel, StatKind, advanceCard, goldFuse, goldenHeart, grassBlade,
  jewelGem, jitter,
} from './FortuneVisuals';
import { bloodBlot, cueSight, paintTycoon, poolBall } from './FortuneTycoonVisuals';
import {
  DROP_MS, DROP_VALUE, FLAT_BONUS, GLORIES, GLORY_NAME, GloryId, HEAVY_MS, HEAVY_VALUE, LIFE_SUPPORT_RATE, MULT_BONUS,
  PAD_H, PAD_W, PARTS, PadId, PartId, REFINER_MULT, SHARD_DROPPER_MULT, TYCOON_H, TYCOON_W, Tycoon, TycoonPad,
} from './FortuneTycoon';
import { BALL_R, Ball, BodyCircle, cueTarget, rackSpots, stepBalls } from './FortuneBilliards';
import { FONT_DISPLAY, FONT_UI } from '../../ui/Theme';

type Owner = 'player' | 'npc';

const ARENA_PAD = 32;
const BOTH: Owner[] = ['player', 'npc'];

// ── The purse ────────────────────────────────────────────────────────────────
/** Gold pops are pooled over this long, so a drill paying every piece is one "+2" rather than eight. */
const POP_MS = 600;

// ── Click: Fray ──────────────────────────────────────────────────────────────
const FRAY_BLADES = 7;
/** Half-angle of the clump as it leaves the hand. */
const FRAY_SPREAD = 0.24;
const FRAY_SPEED_MIN = 430;
const FRAY_SPEED_MAX = 540;
/** Pixels per second per second, straight down the screen. */
const FRAY_GRAVITY = 900;
/** How long the grass is grass. After this every blade is solid gold. */
const FRAY_GILD_MS = 180;
const FRAY_LIFE_MS = 1800;
const FRAY_DAMAGE = 2;
const FRAY_HIT_R = 7;
const FRAY_BLADE_LEN = 15;

// ── E: Advance ───────────────────────────────────────────────────────────────
const ADVANCE_COST = 10;
const OFFER_COUNT = 3;
/** An offer nobody answers is answered for them — the gold is already spent. */
const OFFER_MS = 10_000;
const CARD_W = 58;
const CARD_H = 70;
const CARD_GAP = 8;
/** How far above the alchemist's centre the middle of the cards sits. */
const CARD_LIFT = 96;
/** The bot reads the cards for about this long before it takes one. */
const NPC_PICK_MS = 700;
/** Online: a replica's offer is shown for this long; which card they took never crosses the wire. */
const REPLICA_OFFER_MS = 1200;

interface StatDef { kind: StatKind; name: string; line: string; color: number }
const STATS: StatDef[] = [
  { kind: 'might', name: 'MIGHT', line: '+10% damage', color: 0xff9a3c },
  { kind: 'hide', name: 'GILDED HIDE', line: '-7% dmg taken', color: 0xd8c27a },
  { kind: 'stride', name: 'STRIDE', line: '+7% speed', color: 0x9fe28a },
  { kind: 'haste', name: 'HASTE', line: '-8% cooldowns', color: 0x8fd3ff },
  { kind: 'vigor', name: 'VIGOR', line: '+30 max HP', color: 0xff6b6b },
  { kind: 'greed', name: 'GREED', line: '+25% gold', color: 0xffe066 },
  { kind: 'sheaf', name: 'SHEAF', line: '+2 blades', color: 0x7ccf5a },
  { kind: 'mend', name: 'MEND', line: '+1.5 HP/s', color: 0x6fe3b0 },
];
const STAT_BY_KIND = new Map(STATS.map((s) => [s.kind, s]));
const MIGHT_STEP = 0.10;
const HIDE_STEP = 0.93;
const STRIDE_STEP = 0.07;
const HASTE_STEP = 0.92;
const VIGOR_HP = 30;
const GREED_STEP = 0.25;
const SHEAF_BLADES = 2;
const MEND_HPS = 1.5;

// ── R: Billiards ─────────────────────────────────────────────────────────────
const RACK_BALLS = 5;
/** How far ahead the handful lands: at the cursor, inside these limits. */
const RACK_MIN = 62;
const RACK_MAX = 150;
const TOSS_MS = 380;
const BALL_LIFE_MS = 14_000;
const BALL_FADE_MS = 600;
/** Most balls one side keeps on the floor; the oldest goes first. */
const BALL_MAX = 10;
/** The cane stays out this long waiting for a shot. */
const CUE_MS = 8000;
/** From the body's centre to as far as the cane's tip reaches on a thrust. */
const CUE_REACH = 112;
const CUE_HALF_W = 5;
/** Mouse travel, from where the button went down, that draws the cane all the way back. */
/** Holding the button draws the cane back: full power after this long. */
const CUE_PULL_MS = 1000;
const CUE_POWER_MIN = 0.18;
const CUE_SPEED_MIN = 300;
const CUE_SPEED_MAX = 1050;
/** The cane itself, on anybody standing in the line of the thrust. */
const CUE_WHACK_MIN = 8;
const CUE_WHACK_MAX = 18;
/** A ball has to be moving at least this fast (along the line of the hit) to hurt. */
const BALL_HIT_SPEED = 130;
const BALL_DMG_MIN = 5;
const BALL_DMG_MAX = 22;
const BALL_DMG_FULL_SPEED = 900;
/** One ball cannot hit the same body twice inside this. */
const BALL_REHIT_MS = 350;
/** Clacks closer together than this share one sound. */
const CLACK_SOUND_MS = 45;

// ── F: Heart of Gold ─────────────────────────────────────────────────────────
const LUNGE_DIST = 150;
const LUNGE_MS = 180;
/** From the alchemist's centre to the tip of the cane. */
const CANE_REACH = 46;
const CANE_HIT_R = 20;
const LUNGE_DAMAGE = 16;
const HEART_MS = 6000;
/** Pixels of travel it takes to fill the heart from calm to a heart attack. */
const HEART_TRAVEL = 420;
/** Standing still lets the heart settle, a little. Per second, out of 1. */
const HEART_CALM_PER_SEC = 0.12;
/** A single frame of movement is clamped to this, so one teleport is not a death sentence. */
const HEART_STEP_CAP = 60;
const HEART_ATTACK_DAMAGE = 28;
const HEART_STUN_MS = 1400;
const DAMAGE_PER_GOLD = 20;

// ── Q: Rebirth ───────────────────────────────────────────────────────────────
const REBIRTH_MAX = 3;
const REBIRTH_GOLD = 0.25;
const REBIRTH_MIGHT = 0.15;
const REBIRTH_HIDE = 0.85;
const REBIRTH_GOLD_HP = 150;
const REBIRTH_FLASH_MS = 900;
/** Gold health pays its owner as it is cut away: one coin for every this much lost. */
const GOLD_HP_PER_COIN = 10;
/** Body plates that turn to raw gold ore with each rebirth (the rig has eight, then a full sheen). */
const REBIRTH_PLATES = 3;

// ── The tycoon ───────────────────────────────────────────────────────────────
// What the machines do is in FortuneTycoon; this is only where the strip sits and how the bot shops.
/**
 * The strip is drawn at this scale. Yours sits top-left, just under the HP bar and clear of the
 * status tray on the right; an opponent's sits bottom-right, just above the ability tray.
 */
const TYCOON_SCALE = 0.75;
const TYCOON_X = 36;
const TYCOON_Y = 38;
const TYCOON_BOTTOM_GAP = 62;
/** The bot looks at its pads this often. */
const NPC_BUY_MS = 500;
/** The bot's shard pad is free (it has no shards), but it waits this long into the match for it. */
const NPC_SHARD_PAD_MS = 8000;
const PAD_BLURB: Record<PadId, string> = {
  drop2: `${DROP_VALUE} gold every ${DROP_MS / 1000}s`,
  drop3: `${DROP_VALUE} gold every ${DROP_MS / 1000}s`,
  drop4: `${HEAVY_VALUE} gold every ${HEAVY_MS / 1000}s`,
  up1: `+${FLAT_BONUS} to every piece`,
  up2: `+${FLAT_BONUS} to every piece`,
  up3: `x${MULT_BONUS} to every piece`,
  ref2: `refiner pays +${Math.round((REFINER_MULT[1] - 1) * 100)}%`,
  ref3: `refiner pays +${Math.round((REFINER_MULT[2] - 1) * 100)}%`,
  shard: `first dropper x${SHARD_DROPPER_MULT}`,
};

// ── Shop upgrades ────────────────────────────────────────────────────────────
// Click+ Life-support — right click turns the refiner's output into health. (How much slower the
// droppers run, and the shard pad's numbers, live with the tycoon.)
const LIFE_HP_PER_GOLD = 1.5;
/** The bot switches life-support on under this share of its health, and off again above the other. */
const NPC_LIFE_ON = 0.45;
const NPC_LIFE_OFF = 0.8;

// E+ Artisan — two jeweled cards on every offer, each with a price of its own.
const JEWELED_CARDS = 2;
const JEWELS: Jewel[] = ['pearl', 'diamond', 'ruby', 'sapphire', 'jade'];
const JEWEL_NAME: Record<Jewel, string> = { pearl: 'PEARL', diamond: 'DIAMOND', ruby: 'RUBY', sapphire: 'SAPPHIRE', jade: 'JADE' };
const JEWEL_PRICE: Record<Jewel, number> = { pearl: 8, diamond: 20, ruby: 10, sapphire: 8, jade: 12 };
const PEARL_WORTH = 2;
const DIAMOND_WORTH = 4;
/** A sapphire pick starts at one pick's worth and grows by one more every 20 seconds, up to six. */
const SAPPHIRE_GROW_MS = 20_000;
const SAPPHIRE_MAX = 6;
/** Ruby turns a card on the enemy. Greed and Sheaf have nothing to turn, so they never carry one. */
const RUBY_KINDS: StatKind[] = ['might', 'hide', 'stride', 'haste', 'vigor', 'mend'];
const RUBY_MIGHT = 0.9;
const RUBY_HIDE = 1.07;
const RUBY_STRIDE = 0.93;
const RUBY_HASTE = 1.08;
const RUBY_VIGOR = 30;
const RUBY_BLEED_HPS = 1.5;

// R+ Billiard Blitz — a ball that hits an enemy hands the cane back.
/** Balls get at least this much longer on the floor when the cane comes back. */
const BLITZ_BALL_MS = 6000;
const BLITZ_READY_MS = 180;

// F+ Gold Hex
const HEX_TAIL_MS = 5000;
/** The share of every frame the hexed body's cooldowns lose: half speed. */
const HEX_DRAG = 0.5;

// Q+ Golden Glory — every rebirth bolts one of six machines onto the tycoon for good (FortuneTycoon).

// ── Mastery ──────────────────────────────────────────────────────────────────
// Gilded Augment (passive): low on health, the purse buys you gold health — dearer every second it runs.
const AUGMENT_AT = 0.3;
const AUGMENT_TO = 0.55;
const AUGMENT_HPS = 16;
/** Gold a second when it starts; the price grows by this much again every `AUGMENT_RAMP_SEC`. */
const AUGMENT_GOLD_PER_SEC = 2;
const AUGMENT_RAMP_SEC = 2.5;
const AUGMENT_SPEED = 1.3;
// No Pain, No Gain (bindable): a dagger in your own side, and the blood it throws turns to gold.
const PAIN_ID = 'no-pain-no-gain';
const PAIN_COOLDOWN_MS = 7000;
const PAIN_SELF_DAMAGE = 18;
/** Never the killing blow: the dagger leaves at least this much. */
const PAIN_MIN_HP = 2;
const PAIN_BLOTS = 11;
const PAIN_STRAYS = 3;
const PAIN_REACH = 165;
/** Blood lies wet this long, then sets into gold from the near end of the splatter outward. */
const PAIN_WET_MS = 450;
const PAIN_GILD_MS = 700;
/** Standing on the gold: a coin every other second. */
const FLOOR_GOLD_MS = 2000;
const FLOOR_MAX = 140;

// ── Bot ──────────────────────────────────────────────────────────────────────
/** The bot studies the table this long before it shoots, and has shot at something by the second. */
const NPC_CUE_THINK_MS = 350;
const NPC_CUE_GIVE_UP_MS = 2600;
/** How well a ball has to line up with the target before the bot takes the shot (cosine). */
const NPC_CUE_ALIGN = 0.86;
/** Where the bot stands to shoot: this far behind the ball, on the line through the target. */
const NPC_CUE_STANCE = 44;
const NPC_FLOOR_SEEK_R = 220;
/** The bot only stabs itself for gold above this share of its health. */
const NPC_PAIN_HP = 0.6;

// ── Types ────────────────────────────────────────────────────────────────────

interface Blade {
  owner: Owner;
  x: number;
  y: number;
  vx: number;
  vy: number;
  born: number;
  seed: number;
  dmg: number;
}

/** R: a handful of balls in the air, on its way to the floor. */
interface Toss {
  owner: Owner;
  fx: number;
  fy: number;
  spots: { x: number; y: number }[];
  start: number;
}

/** R: the cane, out and waiting for a shot. */
interface Cue {
  /** Not before the balls have landed. */
  readyAt: number;
  until: number;
  /** Where the button went down — the point the shot is aimed through. Null until it does. */
  /** When the button went down to start drawing the cane back. Null until it does. */
  pullFrom: number | null;
}

/** What the bot makes of the table. */
interface CuePlan {
  ang: number;
  /** A ball (or the target itself) is inside the cane's reach along `ang`. */
  inReach: boolean;
  /** ...and it lines up with the target well enough to take. */
  shoot: boolean;
  /** Where to stand for a better one. */
  stance: { x: number; y: number } | null;
}

interface Lunge {
  owner: Owner;
  fx: number;
  fy: number;
  tx: number;
  ty: number;
  start: number;
  /** The cane tip last frame, so the hit test sweeps instead of sampling. */
  tipX: number;
  tipY: number;
  hit: Set<Fighter>;
  /** Online replica lunges are drawn, never resolved — the attacker's own machine does that. */
  ghost: boolean;
}

interface Heart {
  by: Owner;
  lx: number;
  ly: number;
  stress: number;
  raw: number;
  acc: number;
  /** True when this sim decides the heart (stress, attacks, gold); false for a mirror we only draw. */
  live: boolean;
  /** Mirror only: last stress we were told, to spot a heart attack on the far machine. */
  seen: number;
}

/** Mastery: one blot of No Pain, No Gain. Blood until `gildAt`, gold for good after it. */
interface Patch { owner: Owner; x: number; y: number; r: number; seed: number; born: number; gildAt: number }

/** One card on an offer. A jeweled card (E+ Artisan) has a stone and a price of its own. */
interface Card {
  kind: StatKind;
  jewel: Jewel | null;
  price: number;
}

/** A jeweled pick, kept as a pick so Sapphire can grow and Jade can count its siblings. */
interface Gem {
  kind: StatKind;
  jewel: Jewel;
  at: number;
}

interface Offer {
  cards: Card[];
  opened: number;
  until: number;
  /** Bot: when it takes a card. Replica: when the cards are put away unanswered. */
  decideAt: number;
  /** A replica's cards — drawn, never applied. */
  ghost: boolean;
}

interface Side {
  owner: Owner;
  gold: number;
  /** The fractional part of the purse, so 2 gold a second is not rounded away at 60fps. */
  frac: number;
  aimX: number;
  aimY: number;
  /** What the picks are worth right now — plain picks plus every jewel. Recomputed each frame. */
  stats: Record<StatKind, number>;
  /** Plain picks, one per card. */
  plain: Record<StatKind, number>;
  gems: Gem[];
  /** Ruby picks: these land on whoever this side is fighting, inverted. */
  ruby: Record<StatKind, number>;
  /** Max HP already granted for Vigor, so a growing Sapphire grants only the difference. */
  vigorApplied: number;
  /** The machinery along the top of the screen. */
  tycoon: Tycoon;
  /** Q: how many times this alchemist has been reborn this match, and when the last one was. */
  rebirths: number;
  rebirthAt: number;
  /** R: the cane, while it is out. */
  cue: Cue | null;
  /** R+: a shot has been taken and no ball has hit anybody since. */
  shotOpen: boolean;
  /** Bot: when it next looks at its pads. */
  buyAt: number;
  offer: Offer | null;
  floorMs: number;
  onFloor: boolean;
  pop: number;
  popAt: number;
  lunge: Lunge | null;
  glow: number;
  // ── Mastery ──
  /** Last No Pain, No Gain (scene time). Starts a cooldown in the past so it is ready. */
  painAt: number;
  /** Gilded Augment is paying out right now, and since when (the price climbs with it). */
  augment: boolean;
  augmentSince: number;
  /** Gold owed to the augment, paid a whole coin at a time. */
  augmentDebt: number;
  /** Gold the augment has spent since the last "-N" pop. */
  spent: number;
}

function emptyStats(): Record<StatKind, number> {
  return { might: 0, hide: 0, stride: 0, haste: 0, vigor: 0, greed: 0, sheaf: 0, mend: 0 };
}

function makeSide(owner: Owner): Side {
  return {
    owner, gold: 0, frac: 0, aimX: 0, aimY: 0, stats: emptyStats(), plain: emptyStats(), gems: [],
    ruby: emptyStats(), vigorApplied: 0, tycoon: new Tycoon(), rebirths: 0, rebirthAt: -REBIRTH_FLASH_MS,
    cue: null, shotOpen: false, buyAt: 0, offer: null,
    floorMs: 0, onFloor: false, pop: 0, popAt: 0, lunge: null, glow: 0,
    painAt: -PAIN_COOLDOWN_MS, augment: false, augmentSince: 0, augmentDebt: 0, spent: 0,
  };
}

// ── Arena API ────────────────────────────────────────────────────────────────

export interface FortuneArenaApi {
  get scene(): Phaser.Scene;
  get player(): Fighter;
  get npc(): Fighter;
  /** The player's enemies: `[npc]` in a duel, the husks in an Invasion. */
  get enemies(): Fighter[];
  get eKey(): Phaser.Input.Keyboard.Key;
  get rKey(): Phaser.Input.Keyboard.Key;
  get fKey(): Phaser.Input.Keyboard.Key;
  get qKey(): Phaser.Input.Keyboard.Key;
  get elementId(): string;
  get npcElementId(): string;
  get width(): number;
  get height(): number;
  get isOnline(): boolean;
  /** Invasion: the npc slot is a placeholder or a co-op *ally*, never an enemy. */
  get isInvasion(): boolean;
  isTargetable(f: Fighter): boolean;
  fortuneColor(owner: Owner, base: number): number;
  spawnHitFlash(x: number, y: number, color: number): void;
  buildPlayerContext(x: number, y: number): CastContext;
  setStatusIndicator(id: string, status: CustomStatus | null): void;
  /** Click+: the shard pad is paid for out of the player's real shards. False if they are short. */
  spendShards(amount: number): boolean;
  get shards(): number;
  /** Shop upgrades: the player's own, or the bot's loadout / the online opponent's handshake. */
  hasUpgrade(owner: Owner, slot: string): boolean;
  /** Online: a pseudo-cast id for an action that never goes through `castAbility`. */
  broadcastMasteryCast(id: string): void;
  // ── Mastery ──
  get masteryActive(): boolean;
  get npcMasteryActive(): boolean;
  /** Which mastery enhancement each side dropped over an R/F/Q slot, or null. */
  masteryBindFor(slot: string): string | null;
  npcMasteryBindFor(slot: string): string | null;
  /** Mastery progress. Gated on the element by the adapter, so the kit records unconditionally. */
  recordMasteryStat(key: string, amount: number): void;
}

// ── FortuneKit ───────────────────────────────────────────────────────────────

/**
 * Gold — the alchemist. (The element id is still `fortune`, so every save keeps working.)
 *
 * He owns a factory. A **tycoon** runs along the top of the screen for the whole match: droppers
 * let ore fall onto a belt, the belt carries it under whatever upgraders have been built, and the
 * refiner at the end pays it into the purse. The purse buys the next machine (click its pad), or
 * it buys **Advance** — and when every machine has been bought, **Rebirth** tears the whole thing
 * down in exchange for a better alchemist. The machinery itself is `FortuneTycoon`.
 *
 * - **Fray** throws a clump of grass that his other hand gilds in flight; the blades then fall
 *   down the screen as though the arena had a floor at the bottom. Small hits, lots of them.
 * - **Advance** spends 10 gold and floats three stat cards over his head. Click one.
 * - **Billiards** throws a handful of golden pool balls and brings out the cane as a cue: press,
 *   draw back, release. The balls are real (`FortuneBilliards`) — they hit each other, the walls
 *   and anybody in the way — and the cane itself hurts whoever it pokes.
 * - **Heart of Gold** is a lunge with the cane. A struck heart turns to gold, and a gold heart
 *   cannot take exercise — every step fills it, and a full one is a heart attack.
 * - **Rebirth** needs a complete tycoon, up to three times: the tycoon resets, and he comes back
 *   earning more, hitting harder, taking less, and wearing 150 **gold health** — a Fighter layer
 *   (`goldHp`) spent before his own that pays him as it is cut away.
 *
 * The victim-side state is Fighter fields (`goldHeartUntil`/`goldHeartStress`, `goldHexUntil`)
 * so the status tray and the online mirror pick them up without help; the kit treats those
 * fields as the truth and keeps only its bookkeeping beside them.
 *
 * Online, an opponent's tycoon is run here too, for show: what they bought, their life-support
 * switch, their cue shots and their dagger arrive as `gold-net:` pseudo-casts (`replayNet`).
 */
export class FortuneKit {
  private api: FortuneArenaApi;

  // ── Visuals ──
  private readonly pcol: FortuneColorFn;
  private readonly ncol: FortuneColorFn;
  private readonly pfx: FortuneFx;
  private readonly nfx: FortuneFx;
  private playerAvatar: FortuneAvatar | null = null;
  private npcAvatar: FortuneAvatar | null = null;
  /** Gilded blood — under everything. */
  private floorGfx: Phaser.GameObjects.Graphics | null = null;
  /** The tycoon: pinned to the screen, on the floor, so nobody is ever hidden behind it. */
  private tycoonGfx: Phaser.GameObjects.Graphics | null = null;
  private npcTycoonGfx: Phaser.GameObjects.Graphics | null = null;
  /** Pool balls, just under the fighters. */
  private ballGfx: Phaser.GameObjects.Graphics | null = null;
  /** Blades and tossed balls in flight, and the cue's sight — over the fighters. */
  private airGfx: Phaser.GameObjects.Graphics | null = null;
  /** Hearts and the Advance cards — over everything. */
  private hudGfx: Phaser.GameObjects.Graphics | null = null;
  /** Pooled card legends: name + line per card, three cards per side. */
  private labels: Phaser.GameObjects.Text[] = [];
  private priceLabels: Phaser.GameObjects.Text[] = [];
  /** Pooled pad prices, and one caption per tycoon for the pad under the cursor. */
  private padLabels: Phaser.GameObjects.Text[] = [];
  private padCaption: Phaser.GameObjects.Text | null = null;
  private vizT = 0;

  // ── Sim ──
  private sides: Record<Owner, Side> = { player: makeSide('player'), npc: makeSide('npc') };
  private blades: Blade[] = [];
  private tosses: Toss[] = [];
  private balls: Ball<Owner>[] = [];
  private ballSerial = 0;
  /** When each ball last hurt each body. */
  private ballHits = new WeakMap<Ball<Owner>, Map<Fighter, number>>();
  private clackAt = 0;
  private hearts = new Map<Fighter, Heart>();
  private stuns = new Map<Fighter, number>();
  /** Ruby Vigor already taken off each body, so only a change is applied. */
  private vigorCuts = new Map<Fighter, number>();
  /** Ruby Mend: fractional bleed carried between frames. */
  private bleedAcc = new Map<Fighter, number>();
  /** Mastery: the gilded blood. */
  private patches: Patch[] = [];
  /** Bodies wearing this kit's gold-health callback, so `reset()` can take it off again. */
  private hooked = new Set<Fighter>();
  /** Scene time of the first frame of the match, for the bot's shard pad. */
  private startAt = -1;
  private shardsSeen = 0;
  private shardsAt = 0;
  private wasDown = false;
  private wasRight = false;
  private pressSpent = false;

  constructor(api: FortuneArenaApi) {
    this.api = api;
    this.pcol = (base) => api.fortuneColor('player', base);
    this.ncol = (base) => api.fortuneColor('npc', base);
    this.pfx = new FortuneFx(api.scene, this.pcol);
    this.nfx = new FortuneFx(api.scene, this.ncol);
  }

  // ── Small helpers ──────────────────────────────────────────────────────────

  private get now(): number { return this.api.scene.time.now; }
  private side(owner: Owner): Side { return this.sides[owner]; }
  private fighter(owner: Owner): Fighter { return owner === 'player' ? this.api.player : this.api.npc; }
  private fx(owner: Owner): FortuneFx { return owner === 'player' ? this.pfx : this.nfx; }
  private col(owner: Owner): FortuneColorFn { return owner === 'player' ? this.pcol : this.ncol; }
  private bodyR(f: Fighter): number { return (f.body as Phaser.Physics.Arcade.Body | null)?.radius || 20; }
  private avatar(owner: Owner): FortuneAvatar | null {
    return owner === 'player' ? this.playerAvatar : this.npcAvatar;
  }

  private get left(): number { return ARENA_PAD; }
  private get right(): number { return this.api.width - ARENA_PAD; }
  private get top(): number { return ARENA_PAD; }
  private get bottom(): number { return this.api.height - ARENA_PAD; }
  private clampX(x: number): number { return Phaser.Math.Clamp(x, this.left, this.right); }
  private clampY(y: number): number { return Phaser.Math.Clamp(y, this.top, this.bottom); }

  private hex(color: number): string { return `#${color.toString(16).padStart(6, '0')}`; }

  private alive(f: Fighter | null | undefined): boolean { return !!f && f.active && f.hp > 0; }

  private isGold(owner: Owner): boolean {
    return owner === 'player' ? this.api.elementId === 'fortune' : this.api.npcElementId === 'fortune';
  }

  /** An online opponent's body: drawn here, simulated on their own machine. */
  private isReplica(owner: Owner): boolean {
    return owner === 'npc' && this.api.isOnline;
  }

  private targetsOf(owner: Owner): Fighter[] {
    // In an Invasion the npc slot is on the player's side; a co-op ally's attacks resolve on its
    // own machine. Here they must touch nobody.
    if (owner === 'npc' && this.api.isInvasion) return [];
    const list = owner === 'player' ? this.api.enemies : this.api.player.bodies();
    return list.filter((f) => this.alive(f) && this.api.isTargetable(f));
  }

  /** Everything this kit ever writes a field on, so a stale value can always be cleared. */
  private allFighters(): Fighter[] {
    const out: Fighter[] = [];
    for (const f of [this.api.player, this.api.npc, ...this.api.enemies]) {
      if (f && !out.includes(f)) out.push(f);
    }
    return out;
  }

  private segDist(ax: number, ay: number, bx: number, by: number, px: number, py: number): number {
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy;
    const u = len2 > 0 ? Phaser.Math.Clamp(((px - ax) * dx + (py - ay) * dy) / len2, 0, 1) : 0;
    return Phaser.Math.Distance.Between(ax + dx * u, ay + dy * u, px, py);
  }

  /** Might picks and rebirths: every point of damage the kit deals goes through here. */
  private might(owner: Owner): number {
    const s = this.side(owner);
    return (1 + MIGHT_STEP * s.stats.might) * (1 + REBIRTH_MIGHT * s.rebirths);
  }

  /** Greed picks and rebirths: what every source of gold is multiplied by. */
  private earnMult(owner: Owner): number {
    const s = this.side(owner);
    return 1 + GREED_STEP * s.stats.greed + REBIRTH_GOLD * s.rebirths;
  }

  /** A shop upgrade, only ever true for an alchemist. */
  private up(owner: Owner, slot: string): boolean {
    return this.isGold(owner) && this.api.hasUpgrade(owner, slot);
  }

  private announce(_x: number, _y: number, _text: string, _color: number, _size = 12): void {
    // Battle text pop-ups are disabled — they cluttered every attack.
  }

  // ── The purse ──────────────────────────────────────────────────────────────

  /** Pay `owner`. Greed and rebirths multiply every source. */
  private earn(owner: Owner, amount: number): void {
    if (amount <= 0) return;
    const s = this.side(owner);
    s.frac += amount * this.earnMult(owner);
    const whole = Math.floor(s.frac);
    if (whole <= 0) return;
    s.frac -= whole;
    s.gold += whole;
    s.pop += whole;
    this.record(owner, 'goldMade', whole);
  }

  /** Flush pooled "+N" pops over each alchemist's head. */
  private flushPops(): void {
    for (const owner of BOTH) {
      const s = this.side(owner);
      if ((s.pop <= 0 && s.spent <= 0) || this.now < s.popAt) continue;
      const f = this.fighter(owner);
      if (this.alive(f) && this.isGold(owner)) {
        if (s.pop > 0) {
          this.announce(f.x + 18, f.y - 34, `+${s.pop} 🪙`, FOR.goldLit, 11);
          this.fx(owner).goldGain(f.x, f.y - 10, s.pop);
          Sfx.playAt('money', f.x, { rate: 1.3 + Math.random() * 0.2, volume: 0.35 });
        }
        // Mastery: what Gilded Augment just paid for your life.
        if (s.spent > 0) this.announce(f.x - 18, f.y - 34, `-${s.spent} 🪙`, FOR.gold, 11);
      }
      s.pop = 0;
      s.spent = 0;
      s.popAt = this.now + POP_MS;
    }
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  reset(): void {
    this.sides = { player: makeSide('player'), npc: makeSide('npc') };
    this.blades = [];
    this.tosses = [];
    this.balls = [];
    this.ballHits = new WeakMap();
    this.clackAt = 0;
    this.hearts.clear();
    this.stuns.clear();
    this.vigorCuts.clear();
    this.bleedAcc.clear();
    this.patches = [];
    this.startAt = -1;
    this.shardsAt = 0;
    this.wasDown = false;
    this.wasRight = false;
    this.pressSpent = false;
    this.vizT = 0;

    for (const f of this.hooked) {
      f.onGoldHpAbsorb = null;
      f.goldHp = 0;
    }
    this.hooked.clear();
    for (const f of this.allFighters()) {
      f.fortuneIncomingMult = 1;
      f.goldHeartUntil = 0;
      f.goldHeartStress = 0;
      f.goldHexUntil = 0;
      f.goldCooldownMult = 1;
      f.goldVigorCut = 0;
      f.goldSpeedMult = 1;
    }

    this.playerAvatar?.destroy(); this.playerAvatar = null;
    this.npcAvatar?.destroy(); this.npcAvatar = null;
    for (const g of [this.floorGfx, this.tycoonGfx, this.npcTycoonGfx, this.ballGfx, this.airGfx, this.hudGfx]) g?.destroy();
    this.floorGfx = this.tycoonGfx = this.npcTycoonGfx = this.ballGfx = this.airGfx = this.hudGfx = null;
    for (const t of [...this.labels, ...this.priceLabels, ...this.padLabels]) t.destroy();
    this.labels = [];
    this.priceLabels = [];
    this.padLabels = [];
    this.padCaption?.destroy();
    this.padCaption = null;

    for (const id of ['purse', 'floor', 'ruby', 'augment', 'rebirth', 'life', 'health']) {
      this.api.setStatusIndicator(`gold-${id}`, null);
    }
    for (const st of STATS) this.api.setStatusIndicator(`gold-stat-${st.kind}`, null);
  }

  private ensureLayers(): void {
    const { scene } = this.api;
    // Fighters sit at depth 5.
    if (!this.floorGfx) this.floorGfx = scene.add.graphics().setDepth(2);
    if (!this.tycoonGfx) this.tycoonGfx = scene.add.graphics().setDepth(2.6).setScrollFactor(0).setScale(TYCOON_SCALE);
    if (!this.npcTycoonGfx) this.npcTycoonGfx = scene.add.graphics().setDepth(2.6).setScrollFactor(0).setScale(TYCOON_SCALE);
    if (!this.ballGfx) this.ballGfx = scene.add.graphics().setDepth(4.5);
    if (!this.airGfx) this.airGfx = scene.add.graphics().setDepth(9);
    if (!this.hudGfx) this.hudGfx = scene.add.graphics().setDepth(16);
  }

  private ensureAvatars(): void {
    const { scene } = this.api;
    if (this.isGold('player') && !this.playerAvatar) this.playerAvatar = new FortuneAvatar(scene, this.pcol);
    if (this.isGold('npc') && !this.npcAvatar) this.npcAvatar = new FortuneAvatar(scene, this.ncol);
  }

  // ── Input ──────────────────────────────────────────────────────────────────

  /**
   * Called for every player regardless of element (the call site predates this element), so it
   * early-outs unless the player is the alchemist.
   *
   * One press does one thing, checked in this order: take an Advance card, buy a tycoon pad, or —
   * while the cane is out — start drawing it back. Only a press that did none of those throws
   * grass, and a held click keeps throwing on the cooldown.
   */
  handleInput(time: number, pointer: Phaser.Input.Pointer, mouseX: number, mouseY: number): void {
    void time;
    if (this.api.elementId !== 'fortune') return;
    const s = this.sides.player;
    s.aimX = mouseX;
    s.aimY = mouseY;
    const p = this.api.player;
    const down = pointer.isDown;
    const pressed = down && !this.wasDown;
    this.wasDown = down;
    const right = pointer.rightButtonDown();
    const rightPressed = right && !this.wasRight;
    this.wasRight = right;
    if (!down) this.pressSpent = false;
    if (!this.alive(p)) {
      if (s.cue) s.cue.pullFrom = null;
      return;
    }

    const ctx = this.api.buildPlayerContext(mouseX, mouseY);

    if (pressed && s.offer) {
      const i = this.cardUnder('player', mouseX, mouseY);
      if (i >= 0) {
        const card = s.offer.cards[i];
        if (s.gold >= card.price) this.pick('player', i);
        else Sfx.playAt('ui-denied', p.x, { volume: 0.4 });
        this.pressSpent = true;
      }
    }
    // The tycoon's pads.
    if (pressed && !this.pressSpent) {
      const pad = this.padUnder('player', mouseX, mouseY);
      if (pad) {
        this.pressPad('player', pad);
        this.pressSpent = true;
      }
    }
    // The cue aims at the cursor. Holding the button draws it back (the longer, the harder) and
    // releasing shoots. While the cane is out the click is the cane's, so no grass is thrown.
    const cue = s.cue;
    if (cue) {
      if (pressed && !this.pressSpent && this.now >= cue.readyAt) cue.pullFrom = this.now;
      if (cue.pullFrom !== null && !down) {
        const aim = this.cueAim('player');
        this.strike('player', p.x, p.y, aim.ang, aim.power);
      }
      if (down) this.pressSpent = true;
    }
    if (down && !this.pressSpent) p.castAbility('fortune-fray', ctx);

    // Click+ Life-support: right click throws the switch on the refiner.
    if (rightPressed && this.up('player', 'click')) this.setLifeSupport('player', !s.tycoon.lifeSupport);

    if (Phaser.Input.Keyboard.JustDown(this.api.eKey)) {
      // Checked before the cast: a refused cast still stamps its cooldown *and voices itself*.
      if (s.offer) {
        // Already choosing.
      } else if (s.gold < ADVANCE_COST) {
        Sfx.playAt('ui-denied', p.x, { volume: 0.4 });
      } else {
        p.castAbility('fortune-advance', ctx);
      }
    }
    // Mastery: whichever of R/F/Q No Pain, No Gain was dropped on stops being its own ability.
    const bound = this.painSlot('player');
    if (Phaser.Input.Keyboard.JustDown(this.api.rKey)) {
      if (bound === 'r') this.tryPain('player', mouseX, mouseY);
      else p.castAbility('fortune-billiards', ctx);
    }
    if (Phaser.Input.Keyboard.JustDown(this.api.fKey)) {
      if (bound === 'f') this.tryPain('player', mouseX, mouseY);
      else p.castAbility('fortune-heart', ctx);
    }
    if (Phaser.Input.Keyboard.JustDown(this.api.qKey)) {
      if (bound === 'q') this.tryPain('player', mouseX, mouseY);
      else if (this.canRebirth('player')) p.castAbility('fortune-rebirth', ctx);
      else Sfx.playAt('ui-denied', p.x, { volume: 0.4 });
    }
  }

  // ── Ability entry points (called from build*Context) ───────────────────────

  /** After a cast is stamped, Haste trims that cast's cooldown. */
  private hasten(owner: Owner, abilityId: string): void {
    const n = this.side(owner).stats.haste;
    if (n > 0) this.fighter(owner).scaleStampedCooldown(abilityId, Math.pow(HASTE_STEP, n));
  }

  /** Click — Fray. */
  doFray(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    this.ensureLayers();
    this.hasten(owner, 'fortune-fray');
    const s = this.side(owner);
    s.aimX = tx;
    s.aimY = ty;
    const ang = Math.atan2(ty - f.y, tx - f.x);
    const n = FRAY_BLADES + Math.floor(SHEAF_BLADES * s.stats.sheaf);
    const ox = f.x + Math.cos(ang) * 20;
    const oy = f.y + Math.sin(ang) * 20;
    const dmg = FRAY_DAMAGE * this.might(owner);
    for (let i = 0; i < n; i++) {
      const a = ang + (n > 1 ? (i / (n - 1) - 0.5) * 2 * FRAY_SPREAD : 0) + (Math.random() - 0.5) * 0.08;
      const v = Phaser.Math.FloatBetween(FRAY_SPEED_MIN, FRAY_SPEED_MAX);
      this.blades.push({
        owner, x: ox, y: oy, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
        born: this.now - Math.random() * 40, seed: Math.random() * 999, dmg,
      });
    }
    s.glow = 1;
    this.avatar(owner)?.play('punch', ang);
    // The other hand does the gilding: the clump leaves one hand and the flare is on the other.
    this.fx(owner).transmute(f.x + Math.cos(ang - 1.25) * 22, f.y + Math.sin(ang - 1.25) * 22);
    Sfx.playAt('whoosh', f.x, { rate: 1.6, volume: 0.35 });
  }

  /** E — Advance. The purse was checked at the press; it is charged here. */
  doAdvance(owner: Owner): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    this.ensureLayers();
    this.hasten(owner, 'fortune-advance');
    const s = this.side(owner);
    const ghost = this.isReplica(owner);
    if (s.offer && !s.offer.ghost) return;
    if (!ghost) {
      if (s.gold < ADVANCE_COST) return;
      s.gold -= ADVANCE_COST;
    }
    const pool = Phaser.Utils.Array.Shuffle(STATS.map((d) => d.kind));
    const cards: Card[] = pool.slice(0, OFFER_COUNT).map((kind) => ({ kind, jewel: null, price: 0 }));
    // E+ Artisan: two more cards, each set with a stone and priced on top of the ten already spent.
    if (this.up(owner, 'e')) {
      for (const kind of pool.slice(OFFER_COUNT, OFFER_COUNT + JEWELED_CARDS)) {
        const stones = RUBY_KINDS.includes(kind) ? JEWELS : JEWELS.filter((j) => j !== 'ruby');
        const jewel = Phaser.Utils.Array.GetRandom(stones);
        cards.push({ kind, jewel, price: JEWEL_PRICE[jewel] });
      }
    }
    s.offer = {
      cards,
      opened: this.now,
      until: this.now + OFFER_MS,
      decideAt: this.now + (ghost ? REPLICA_OFFER_MS : NPC_PICK_MS + Math.random() * 400),
      ghost,
    };
    this.fx(owner).advanceOpen(f.x, f.y - CARD_LIFT);
    this.avatar(owner)?.play('flex');
    Sfx.playAt('money', f.x, { rate: 0.8, volume: 0.6 });
    if (!ghost) this.announce(f.x, f.y - 40, `-${ADVANCE_COST} 🪙`, FOR.gold, 11);
  }

  /**
   * R — Billiards: a handful of balls lobbed to the floor ahead, and the cane comes out as a cue.
   * The rack is the same shape every time, so an online replica racks the same table.
   */
  doBilliards(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    this.ensureLayers();
    this.hasten(owner, 'fortune-billiards');
    const s = this.side(owner);
    const ang = Math.atan2(ty - f.y, tx - f.x);
    const d = Phaser.Math.Clamp(Phaser.Math.Distance.Between(f.x, f.y, tx, ty), RACK_MIN, RACK_MAX);
    const spots = rackSpots(f.x + Math.cos(ang) * d, f.y + Math.sin(ang) * d, ang, RACK_BALLS).map((p) => ({
      x: Phaser.Math.Clamp(p.x, this.left + BALL_R, this.right - BALL_R),
      y: Phaser.Math.Clamp(p.y, this.top + BALL_R, this.bottom - BALL_R),
    }));
    this.tosses.push({ owner, fx: f.x, fy: f.y, spots, start: this.now });
    s.cue = { readyAt: this.now + TOSS_MS, until: this.now + TOSS_MS + CUE_MS, pullFrom: null };
    s.shotOpen = false;
    this.avatar(owner)?.play('sweep', ang);
    Sfx.playAt('whoosh', f.x, { rate: 1.1, volume: 0.6 });
  }

  /** F — Heart of Gold: a lunge with the cane. */
  doHeart(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    this.ensureLayers();
    this.hasten(owner, 'fortune-heart');
    const ang = Math.atan2(ty - f.y, tx - f.x);
    const ex = this.clampX(f.x + Math.cos(ang) * LUNGE_DIST);
    const ey = this.clampY(f.y + Math.sin(ang) * LUNGE_DIST);
    this.side(owner).lunge = {
      owner, fx: f.x, fy: f.y, tx: ex, ty: ey, start: this.now,
      tipX: f.x + Math.cos(ang) * CANE_REACH, tipY: f.y + Math.sin(ang) * CANE_REACH,
      hit: new Set(), ghost: this.isReplica(owner),
    };
    this.fx(owner).caneLunge(f.x, f.y, ex, ey);
    this.avatar(owner)?.play('dash', ang);
    Sfx.playAt('whoosh', f.x, { rate: 1.25, volume: 0.8 });
  }

  /** The tycoon is complete and there is a rebirth left to take. */
  private canRebirth(owner: Owner): boolean {
    const s = this.side(owner);
    return s.rebirths < REBIRTH_MAX && s.tycoon.complete;
  }

  /**
   * Q — Rebirth. Everything gold bought on the tycoon is gone; what comes back is a better
   * alchemist. A replica is taken at its word (its tycoon is only a picture here) and is given no
   * gold health — that arrives with its vitals.
   */
  doRebirth(owner: Owner): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    this.ensureLayers();
    this.hasten(owner, 'fortune-rebirth');
    const s = this.side(owner);
    const ghost = this.isReplica(owner);
    if (s.rebirths >= REBIRTH_MAX || (!ghost && !s.tycoon.complete)) return;
    s.rebirths++;
    s.rebirthAt = this.now;
    s.tycoon.rebirth();
    if (!ghost) {
      this.hook(owner);
      f.goldHp += REBIRTH_GOLD_HP;
      // Q+ Golden Glory: one machine nobody can buy, built before the first pad is.
      if (this.up(owner, 'q')) {
        const pool = GLORIES.filter((g) => !s.tycoon.glory.has(g));
        if (pool.length) {
          const g = Phaser.Utils.Array.GetRandom(pool);
          s.tycoon.glory.add(g);
          if (owner === 'player' && this.api.isOnline) this.api.broadcastMasteryCast(`gold-net:glory:${g}`);
        }
      }
    }
    this.record(owner, 'rebirths');
    this.fx(owner).rebirth(f.x, f.y, s.rebirths);
    this.avatar(owner)?.play('raise');
    Sfx.playAt('level-up', f.x, { rate: 0.8, volume: 0.9 });
    Sfx.playAt('money', f.x, { rate: 0.5, volume: 1 });
  }

  /** Gold health pays whoever is wearing it as it is cut away. Installed once per body. */
  private hook(owner: Owner): void {
    const f = this.fighter(owner);
    if (!f || this.hooked.has(f)) return;
    this.hooked.add(f);
    f.onGoldHpAbsorb = (spent) => this.earn(owner, spent / GOLD_HP_PER_COIN);
  }

  // ── Advance ────────────────────────────────────────────────────────────────

  /** Card centres for `owner`'s open offer, following the body. */
  private cardCentres(owner: Owner): { x: number; y: number }[] {
    const f = this.fighter(owner);
    const offer = this.side(owner).offer;
    if (!offer) return [];
    const n = offer.cards.length;
    const span = n * CARD_W + (n - 1) * CARD_GAP;
    const cy = Math.max(this.top + CARD_H / 2 + 4, f.y - CARD_LIFT);
    const x0 = Phaser.Math.Clamp(f.x, this.left + span / 2, this.right - span / 2) - span / 2 + CARD_W / 2;
    return offer.cards.map((_, i) => ({ x: x0 + i * (CARD_W + CARD_GAP), y: cy }));
  }

  private cardUnder(owner: Owner, x: number, y: number): number {
    const cs = this.cardCentres(owner);
    for (let i = 0; i < cs.length; i++) {
      if (Math.abs(x - cs[i].x) <= CARD_W / 2 + 2 && Math.abs(y - cs[i].y) <= CARD_H / 2 + 2) return i;
    }
    return -1;
  }

  /** Take card `i` of the open offer. A jeweled card is paid for here; the caller checked the purse. */
  private pick(owner: Owner, i: number): void {
    const s = this.side(owner);
    const offer = s.offer;
    const card = offer?.cards[i];
    if (!offer || !card) return;
    if (card.price > s.gold) return;
    const at = this.cardCentres(owner)[i];
    const line = this.cardLine(owner, card);
    s.gold -= card.price;
    s.offer = null;
    if (card.jewel) {
      s.gems.push({ kind: card.kind, jewel: card.jewel, at: this.now });
      this.record(owner, 'jewelsBought');
    } else {
      s.plain[card.kind]++;
    }
    this.recompute(owner);
    const f = this.fighter(owner);
    const def = STAT_BY_KIND.get(card.kind)!;
    this.fx(owner).advancePick(at?.x ?? f.x, at?.y ?? f.y - CARD_LIFT);
    const head = card.jewel ? `${JEWEL_NAME[card.jewel]} ${def.name}` : def.name;
    this.announce(f.x, f.y - 52, `${head}  ${line}`, card.jewel === 'ruby' ? FOR.bloodLit : def.color, 12);
    if (card.price > 0) this.announce(f.x, f.y - 38, `-${card.price} 🪙`, FOR.gold, 11);
    this.avatar(owner)?.play('flex');
    Sfx.playAt('ui-click', f.x, { rate: 1.4, volume: 0.6 });
    Sfx.playAt('money', f.x, { rate: card.jewel ? 1.5 : 1.1, volume: 0.5 });
  }

  // ── E+ Artisan: what a pick is worth ───────────────────────────────────────

  private gemWorth(g: Gem, jades: number): number {
    switch (g.jewel) {
      case 'pearl': return PEARL_WORTH;
      case 'diamond': return DIAMOND_WORTH;
      case 'sapphire': return Math.min(SAPPHIRE_MAX, 1 + (this.now - g.at) / SAPPHIRE_GROW_MS);
      // Every jade is worth double for every other jade owned: 1, then 2 each, then 4 each...
      case 'jade': return Math.pow(2, Math.max(0, jades - 1));
      case 'ruby': return 0;
    }
  }

  /** Fold plain picks and jewels into what the side's stats are worth this frame. */
  private recompute(owner: Owner): void {
    const s = this.side(owner);
    const stats = { ...s.plain };
    const ruby = emptyStats();
    const jades = s.gems.filter((g) => g.jewel === 'jade').length;
    for (const g of s.gems) {
      if (g.jewel === 'ruby') ruby[g.kind] += 1;
      else stats[g.kind] += this.gemWorth(g, jades);
    }
    s.stats = stats;
    s.ruby = ruby;
  }

  private fmt(v: number): string { return `${Math.round(v * 10) / 10}`; }

  /** The card's second line, at `m` picks' worth. */
  private statLine(kind: StatKind, m: number): string {
    switch (kind) {
      case 'might': return `+${this.fmt(MIGHT_STEP * 100 * m)}% damage`;
      case 'hide': return `-${Math.round((1 - Math.pow(HIDE_STEP, m)) * 100)}% dmg taken`;
      case 'stride': return `+${this.fmt(STRIDE_STEP * 100 * m)}% speed`;
      case 'haste': return `-${Math.round((1 - Math.pow(HASTE_STEP, m)) * 100)}% cooldowns`;
      case 'vigor': return `+${Math.round(VIGOR_HP * m)} max HP`;
      case 'greed': return `+${this.fmt(GREED_STEP * 100 * m)}% gold`;
      case 'sheaf': return `+${Math.floor(SHEAF_BLADES * m)} blades`;
      case 'mend': return `+${this.fmt(MEND_HPS * m)} HP/s`;
    }
  }

  private rubyLine(kind: StatKind): string {
    switch (kind) {
      case 'might': return `foe -${Math.round((1 - RUBY_MIGHT) * 100)}% damage`;
      case 'hide': return `foe +${Math.round((RUBY_HIDE - 1) * 100)}% taken`;
      case 'stride': return `foe -${Math.round((1 - RUBY_STRIDE) * 100)}% speed`;
      case 'haste': return `foe +${Math.round((RUBY_HASTE - 1) * 100)}% cooldowns`;
      case 'vigor': return `foe -${RUBY_VIGOR} max HP`;
      default: return `foe bleeds ${RUBY_BLEED_HPS}/s`;
    }
  }

  private cardLine(owner: Owner, card: Card): string {
    if (!card.jewel) return STAT_BY_KIND.get(card.kind)!.line;
    switch (card.jewel) {
      case 'pearl': return this.statLine(card.kind, PEARL_WORTH);
      case 'diamond': return this.statLine(card.kind, DIAMOND_WORTH);
      case 'sapphire': return `${this.statLine(card.kind, 1)} ▲`;
      case 'ruby': return this.rubyLine(card.kind);
      case 'jade': {
        // Taking it makes one more jade, and each jade is then worth this much.
        const jades = this.side(owner).gems.filter((g) => g.jewel === 'jade').length;
        return this.statLine(card.kind, Math.pow(2, jades));
      }
    }
  }

  /** The bot reads its cards and takes the one it wants most right now — a jewel only if it can pay. */
  private npcChoose(cards: Card[]): number {
    const f = this.api.npc;
    const hurt = f.hp / Math.max(1, f.maxHp);
    const s = this.sides.npc;
    const jades = s.gems.filter((g) => g.jewel === 'jade').length;
    const base: Record<StatKind, number> = {
      might: 1.2, hide: 1.0, stride: 0.8, haste: 1.1, vigor: 0.9, greed: 0.9, sheaf: 1.1, mend: 0.8,
    };
    const score = (c: Card): number => {
      if (c.price > s.gold) return -Infinity;
      const own = s.stats[c.kind];
      let v = base[c.kind] / (1 + own * 0.35);
      if (hurt < 0.5 && (c.kind === 'vigor' || c.kind === 'mend' || c.kind === 'hide')) v += 0.8;
      const worth = !c.jewel ? 1
        : c.jewel === 'pearl' ? PEARL_WORTH
          : c.jewel === 'diamond' ? DIAMOND_WORTH
            : c.jewel === 'sapphire' ? 2.5
              : c.jewel === 'jade' ? Math.pow(2, jades) * 1.2
                : 1.4;
      return v * worth - c.price * 0.02 + Math.random() * 0.3;
    };
    let best = 0;
    for (let i = 1; i < cards.length; i++) if (score(cards[i]) > score(cards[best])) best = i;
    return best;
  }

  private updateOffers(): void {
    for (const owner of BOTH) {
      const s = this.side(owner);
      const o = s.offer;
      if (!o) continue;
      if (!this.alive(this.fighter(owner))) { s.offer = null; continue; }
      if (o.ghost) {
        if (this.now >= o.decideAt) s.offer = null;
        continue;
      }
      if (owner === 'npc' && this.now >= o.decideAt) { this.pick('npc', this.npcChoose(o.cards)); continue; }
      // An unanswered offer takes a plain card for you — never one that costs more.
      if (this.now >= o.until) this.pick(owner, Phaser.Math.Between(0, Math.min(OFFER_COUNT, o.cards.length) - 1));
    }
  }

  // ── Per-frame ──────────────────────────────────────────────────────────────

  update(time: number, delta: number): void {
    void time;
    const playerIs = this.isGold('player');
    const npcIs = this.isGold('npc');
    const anyState = this.blades.length || this.balls.length || this.tosses.length || this.hearts.size
      || this.stuns.size || this.patches.length
      || this.api.player?.goldHeartUntil || this.api.player?.goldHexUntil || this.api.player?.goldVigorCut;
    if (!playerIs && !npcIs && !anyState) return;

    this.ensureLayers();
    this.ensureAvatars();
    if (this.startAt < 0) this.startAt = this.now;
    const dt = delta / 1000;
    this.vizT += dt;

    this.updateLunges();
    this.updateBlades(dt);
    this.updateBilliards(dt);
    this.updateHearts(dt);
    this.updateHex(delta);
    this.updateStuns();
    this.updateTycoons(delta);
    this.updateFloor(delta);
    this.updateOffers();
    this.updateAugment(delta);
    this.updateNpc();
    this.updateSelf(dt);
    this.flushPops();

    this.paint();
    this.updateAvatars(delta);
    this.pushStatuses(playerIs);
  }

  /** The cane: carried along the lunge (post-movement, so it is the last word) and swept for hits. */
  private updateLunges(): void {
    for (const owner of BOTH) {
      const s = this.side(owner);
      const l = s.lunge;
      if (!l) continue;
      const f = this.fighter(owner);
      if (!this.alive(f)) { s.lunge = null; continue; }
      const u = Phaser.Math.Clamp((this.now - l.start) / LUNGE_MS, 0, 1);
      const e = 1 - (1 - u) * (1 - u);
      const ang = Math.atan2(l.ty - l.fy, l.tx - l.fx);
      if (!l.ghost) {
        const x = l.fx + (l.tx - l.fx) * e;
        const y = l.fy + (l.ty - l.fy) * e;
        f.setPosition(x, y);
        (f.body as Phaser.Physics.Arcade.Body | null)?.reset(x, y);
      }
      const tipX = f.x + Math.cos(ang) * CANE_REACH;
      const tipY = f.y + Math.sin(ang) * CANE_REACH;
      if (!l.ghost) {
        for (const t of this.targetsOf(owner)) {
          if (l.hit.has(t)) continue;
          if (this.segDist(l.tipX, l.tipY, tipX, tipY, t.x, t.y) > CANE_HIT_R + this.bodyR(t)) continue;
          l.hit.add(t);
          t.takeDamage(LUNGE_DAMAGE * this.might(owner));
          this.installHeart(owner, t);
          this.api.spawnHitFlash(t.x, t.y, this.col(owner)(FOR.gold));
          Sfx.playAt('hit-heavy', t.x, { rate: 1.2, volume: 0.7 });
        }
      }
      l.tipX = tipX;
      l.tipY = tipY;
      if (u >= 1) s.lunge = null;
    }
  }

  private installHeart(by: Owner, t: Fighter): void {
    const was = this.now < t.goldHeartUntil;
    t.goldHeartUntil = this.now + HEART_MS;
    const h = this.hearts.get(t);
    if (h && h.live) {
      h.by = by;
    } else {
      this.hearts.set(t, {
        by, lx: t.x, ly: t.y, stress: was ? t.goldHeartStress : 0, raw: t.rawDamageTaken, acc: 0, live: true, seen: 0,
      });
    }
    this.fx(by).heartApply(t.x, t.y - 34);
    if (!was) this.announce(t.x, t.y - 54, '💛 HEART OF GOLD', FOR.goldLit, 12);
    // F+ Gold Hex: their bars charge at half speed for the heart and five seconds after it.
    if (this.up(by, 'f')) {
      const hexed = this.now < t.goldHexUntil;
      t.goldHexUntil = Math.max(t.goldHexUntil, t.goldHeartUntil + HEX_TAIL_MS);
      if (!hexed) this.announce(t.x, t.y - 68, '⏳ GOLD HEX', FOR.gold, 11);
    }
  }

  /**
   * F+ Gold Hex. The timer is the truth (mirrored online), and the drag is applied on the body's
   * own machine: an online opponent's cooldowns are theirs to slow, from the mirrored timer.
   */
  private updateHex(delta: number): void {
    for (const f of this.allFighters()) {
      if (this.now >= f.goldHexUntil || !this.alive(f)) continue;
      if (this.api.isOnline && f === this.api.npc) continue;
      f.delayCooldowns(delta * HEX_DRAG);
    }
  }

  private updateBlades(dt: number): void {
    const H = this.api.height;
    const W = this.api.width;
    for (let i = this.blades.length - 1; i >= 0; i--) {
      const b = this.blades[i];
      const px = b.x;
      const py = b.y;
      b.vy += FRAY_GRAVITY * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      let gone = this.now - b.born > FRAY_LIFE_MS || b.y > H + 20 || b.x < -20 || b.x > W + 20;
      if (!gone) {
        for (const t of this.targetsOf(b.owner)) {
          if (this.segDist(px, py, b.x, b.y, t.x, t.y) > FRAY_HIT_R + this.bodyR(t)) continue;
          t.takeDamage(b.dmg);
          this.fx(b.owner).bladeHit(b.x, b.y, Math.atan2(b.vy, b.vx));
          gone = true;
          break;
        }
      }
      if (gone) this.blades.splice(i, 1);
    }
  }

  // ── The tycoon ─────────────────────────────────────────────────────────────

  /** A tycoon is drawn and run for every alchemist, except the placeholder npc slot of an Invasion. */
  private tycoonShown(owner: Owner): boolean {
    return this.isGold(owner) && !(owner === 'npc' && this.api.isInvasion);
  }

  /** Top-left corner of `owner`'s strip, in screen pixels (the strip itself is drawn at TYCOON_SCALE). */
  private tycoonOrigin(owner: Owner): { x: number; y: number } {
    if (owner === 'player') return { x: TYCOON_X, y: TYCOON_Y };
    return {
      x: this.api.width - TYCOON_X - TYCOON_W * TYCOON_SCALE,
      y: this.api.height - TYCOON_BOTTOM_GAP - TYCOON_H * TYCOON_SCALE,
    };
  }

  /** The pads on show: the next link of each chain, and the shard pad for anyone with Click+. */
  private padsOf(owner: Owner): TycoonPad[] {
    return this.side(owner).tycoon.pads(this.up(owner, 'click'));
  }

  /** The pad under a world-space point. The strip is pinned to the screen, so the camera is taken off. */
  private padUnder(owner: Owner, wx: number, wy: number): TycoonPad | null {
    if (!this.tycoonShown(owner)) return null;
    const cam = this.api.scene.cameras.main;
    const sx = wx - cam.scrollX;
    const sy = wy - cam.scrollY;
    const o = this.tycoonOrigin(owner);
    for (const pad of this.padsOf(owner)) {
      const lx = (sx - o.x) / TYCOON_SCALE;
      const ly = (sy - o.y) / TYCOON_SCALE;
      if (Math.abs(lx - pad.x) <= PAD_W / 2 + 3 && Math.abs(ly - pad.y) <= PAD_H / 2 + 3) return pad;
    }
    return null;
  }

  private canPay(owner: Owner, pad: TycoonPad): boolean {
    if (pad.currency === 'shards') return owner === 'player' ? this.shardsNow() >= pad.price : true;
    return this.side(owner).gold >= pad.price;
  }

  /** The player's shards, re-read a couple of times a second rather than out of storage every frame. */
  private shardsNow(): number {
    if (this.now >= this.shardsAt) {
      this.shardsAt = this.now + 400;
      this.shardsSeen = this.api.shards;
    }
    return this.shardsSeen;
  }

  /** The player clicked a pad: pay for it if they can. */
  private pressPad(owner: Owner, pad: TycoonPad): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (pad.currency === 'shards') {
      if (owner === 'player' && !this.api.spendShards(pad.price)) {
        Sfx.playAt('ui-denied', f.x, { volume: 0.4 });
        return;
      }
    } else {
      if (s.gold < pad.price) {
        Sfx.playAt('ui-denied', f.x, { volume: 0.4 });
        return;
      }
      s.gold -= pad.price;
    }
    this.build(owner, pad.id);
    if (owner === 'player' && this.api.isOnline) this.api.broadcastMasteryCast(`gold-net:buy:${pad.id}`);
  }

  /** Put a bought machine on the strip. */
  private build(owner: Owner, id: PadId): void {
    const s = this.side(owner);
    if (id === 'shard') s.tycoon.shardDropper = true;
    else s.tycoon.buy(id);
    const f = this.fighter(owner);
    Sfx.playAt('ui-purchase', f?.x ?? 0, { rate: 1.1, volume: 0.5 });
    Sfx.playAt('gear-turn', f?.x ?? 0, { rate: 1.2, volume: 0.35 });
    if (s.tycoon.complete) Sfx.playAt('jackpot', f?.x ?? 0, { volume: 0.5 });
  }

  /** Click+ Life-support: the refiner pays health instead of gold, and the droppers slow down. */
  private setLifeSupport(owner: Owner, on: boolean): void {
    const s = this.side(owner);
    if (s.tycoon.lifeSupport === on) return;
    s.tycoon.lifeSupport = on;
    const f = this.fighter(owner);
    Sfx.playAt(on ? 'ui-toggle-on' : 'ui-toggle-off', f?.x ?? 0, { volume: 0.6 });
    if (owner === 'player' && this.api.isOnline) this.api.broadcastMasteryCast(`gold-net:life:${on ? 1 : 0}`);
  }

  /** A piece of ore reached the refiner. A replica's refiner only turns: its purse and health are its own. */
  private payOut(owner: Owner, value: number): void {
    const s = this.side(owner);
    if (!s.tycoon.lifeSupport) {
      this.earn(owner, value);
      return;
    }
    if (this.isReplica(owner)) return;
    const f = this.fighter(owner);
    if (this.alive(f)) f.heal(value * this.earnMult(owner) * LIFE_HP_PER_GOLD);
  }

  private updateTycoons(delta: number): void {
    for (const owner of BOTH) {
      if (!this.tycoonShown(owner) || !this.alive(this.fighter(owner))) continue;
      this.side(owner).tycoon.update(delta, { paid: (v) => this.payOut(owner, v) });
    }
  }

  // ── Billiards ──────────────────────────────────────────────────────────────

  /**
   * Where `owner`'s cue is pointing and how far back it is drawn. The player's points at the
   * cursor and is drawn back for as long as the button is held; the bot's follows its plan,
   * winding up as it thinks.
   */
  private cueAim(owner: Owner): { ang: number; power: number } {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (owner === 'npc' && !this.isReplica('npc')) {
      const plan = this.npcCuePlan();
      const wind = s.cue ? Phaser.Math.Clamp((this.now - s.cue.readyAt) / NPC_CUE_THINK_MS, 0, 1) : 0;
      return { ang: plan?.ang ?? Math.atan2(s.aimY - f.y, s.aimX - f.x), power: wind * 0.9 };
    }
    const ang = Math.atan2(s.aimY - f.y, s.aimX - f.x);
    const from = s.cue?.pullFrom;
    if (from === null || from === undefined) return { ang, power: 0 };
    return { ang, power: Phaser.Math.Clamp((this.now - from) / CUE_PULL_MS, CUE_POWER_MIN, 1) };
  }

  /**
   * The shot. The cane thrusts from `(ox, oy)` along `ang`: the first of the striker's balls in its
   * line leaves at a speed set by `power`, and anybody standing in the line (as far as that ball)
   * is poked. The cane goes away afterwards — Billiard Blitz is what brings it back.
   */
  private strike(owner: Owner, ox: number, oy: number, ang: number, power: number): void {
    const s = this.side(owner);
    s.cue = null;
    this.ensureLayers();
    const dx = Math.cos(ang);
    const dy = Math.sin(ang);
    const ball = cueTarget(this.balls, owner, ox, oy, dx, dy, CUE_REACH, CUE_HALF_W);
    const reach = ball ? Math.max(18, (ball.x - ox) * dx + (ball.y - oy) * dy - BALL_R) : CUE_REACH;
    if (ball) {
      const v = CUE_SPEED_MIN + (CUE_SPEED_MAX - CUE_SPEED_MIN) * power;
      ball.vx = dx * v;
      ball.vy = dy * v;
      s.shotOpen = true;
      this.fx(owner).cueHit(ball.x - dx * BALL_R, ball.y - dy * BALL_R, ang, power);
      Sfx.playAt('clang', ball.x, { rate: 1.9 + power * 0.5, volume: 0.35 + power * 0.35 });
    }
    if (!this.isReplica(owner)) {
      const dmg = (CUE_WHACK_MIN + (CUE_WHACK_MAX - CUE_WHACK_MIN) * power) * this.might(owner);
      for (const t of this.targetsOf(owner)) {
        if (this.segDist(ox, oy, ox + dx * reach, oy + dy * reach, t.x, t.y) > CUE_HALF_W + this.bodyR(t)) continue;
        t.takeDamage(dmg);
        this.api.spawnHitFlash(t.x, t.y, this.col(owner)(FOR.gold));
        Sfx.playAt('hit-medium', t.x, { rate: 1.3, volume: 0.6 });
      }
    }
    this.fx(owner).cueThrust(ox, oy, ang, reach);
    this.avatar(owner)?.jab(ang);
    Sfx.playAt('whoosh', ox, { rate: 1.7, volume: 0.4 });
    if (owner === 'player' && this.api.isOnline) {
      this.api.broadcastMasteryCast(
        `gold-net:cue:${Math.round(ox)}:${Math.round(oy)}:${Math.round(ang * 1000)}:${Math.round(power * 100)}`,
      );
    }
  }

  private updateBilliards(dt: number): void {
    for (const owner of BOTH) {
      const s = this.side(owner);
      if (s.cue && (this.now >= s.cue.until || !this.alive(this.fighter(owner)))) s.cue = null;
    }
    // The handful lands.
    for (let i = this.tosses.length - 1; i >= 0; i--) {
      const t = this.tosses[i];
      if (this.now - t.start < TOSS_MS) continue;
      this.tosses.splice(i, 1);
      for (const p of t.spots) {
        this.balls.push({
          owner: t.owner, x: p.x, y: p.y, vx: 0, vy: 0, n: (this.ballSerial++ % 15) + 1, roll: this.ballSerial * 1.7,
          born: this.now, until: this.now + BALL_LIFE_MS,
        });
      }
      let mine = 0;
      for (const b of this.balls) if (b.owner === t.owner) mine++;
      while (mine > BALL_MAX) {
        this.balls.splice(this.balls.findIndex((b) => b.owner === t.owner), 1);
        mine--;
      }
      Sfx.playAt('clang', t.spots[0]?.x ?? 0, { rate: 2.4, volume: 0.3 });
    }
    if (!this.balls.length) return;
    for (let i = this.balls.length - 1; i >= 0; i--) if (this.now >= this.balls[i].until) this.balls.splice(i, 1);

    const circles = (owner: Owner): BodyCircle<Fighter>[] => this.targetsOf(owner)
      .map((t) => ({ x: t.x, y: t.y, r: this.bodyR(t), ref: t }));
    const bodies: Record<Owner, BodyCircle<Fighter>[]> = { player: circles('player'), npc: circles('npc') };
    stepBalls(
      this.balls, dt, { left: this.left, right: this.right, top: this.top, bottom: this.bottom },
      (owner) => bodies[owner],
      {
        onClack: (x, y, speed) => this.clack(x, y, speed),
        onWall: (x, y, speed) => this.clack(x, y, speed * 0.6),
        onBody: (ball, t, speed) => this.ballHit(ball, t, speed),
      },
    );
  }

  private clack(x: number, y: number, speed: number): void {
    if (speed < 70) return;
    const k = Phaser.Math.Clamp(speed / 800, 0, 1);
    this.pfx.ballClack(x, y, k);
    if (this.now < this.clackAt) return;
    this.clackAt = this.now + CLACK_SOUND_MS;
    Sfx.playAt('clang', x, { rate: 2.1 + Math.random() * 0.5, volume: 0.15 + k * 0.4 });
  }

  /** A ball came off a body. Fast enough, it hurts — and with Billiard Blitz it hands the cane back. */
  private ballHit(ball: Ball<Owner>, t: Fighter, speed: number): void {
    if (speed < BALL_HIT_SPEED) return;
    let seen = this.ballHits.get(ball);
    if (!seen) {
      seen = new Map();
      this.ballHits.set(ball, seen);
    }
    if (this.now - (seen.get(t) ?? -1e9) < BALL_REHIT_MS) return;
    seen.set(t, this.now);
    const owner = ball.owner;
    const k = Phaser.Math.Clamp((speed - BALL_HIT_SPEED) / (BALL_DMG_FULL_SPEED - BALL_HIT_SPEED), 0, 1);
    this.fx(owner).ballHit(ball.x, ball.y, k);
    Sfx.playAt('hit-medium', t.x, { rate: 1.1 + k * 0.3, volume: 0.4 + k * 0.4 });
    // A replica's balls are a picture: its own machine decides what they did.
    if (this.isReplica(owner)) return;
    t.takeDamage((BALL_DMG_MIN + (BALL_DMG_MAX - BALL_DMG_MIN) * k) * this.might(owner));
    this.api.spawnHitFlash(t.x, t.y, this.col(owner)(FOR.gold));
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (!s.shotOpen || !this.up(owner, 'r') || !this.alive(f)) return;
    s.shotOpen = false;
    s.cue = { readyAt: this.now + BLITZ_READY_MS, until: this.now + BLITZ_READY_MS + CUE_MS, pullFrom: null };
    for (const b of this.balls) if (b.owner === owner) b.until = Math.max(b.until, this.now + BLITZ_BALL_MS);
    this.fx(owner).blitz(f.x, f.y);
    Sfx.playAt('ability-ready', f.x, { rate: 1.3, volume: 0.6 });
  }

  // ── Online ─────────────────────────────────────────────────────────────────

  /**
   * The opponent's actions that never go through `castAbility`: what they bought, their
   * life-support switch, which machine a rebirth left them, every cue shot and the dagger.
   */
  replayNet(id: string): void {
    const part = id.split(':');
    if (part[0] !== 'gold-net') return;
    const s = this.sides.npc;
    const nums = part.slice(2).map(Number);
    switch (part[1]) {
      case 'buy':
        if (part[2] === 'shard' || (PARTS as string[]).includes(part[2])) this.build('npc', part[2] as PadId);
        break;
      case 'life':
        s.tycoon.lifeSupport = part[2] === '1';
        break;
      case 'glory':
        if ((GLORIES as string[]).includes(part[2])) s.tycoon.glory.add(part[2] as GloryId);
        break;
      case 'cue':
        if (nums.length >= 4 && nums.every(Number.isFinite)) this.strike('npc', nums[0], nums[1], nums[2] / 1000, nums[3] / 100);
        break;
      case 'pain':
        if (nums.length >= 3 && nums.every(Number.isFinite)) this.tryPain('npc', nums[0], nums[1], nums[2]);
        break;
    }
  }

  /**
   * The gold heart. The Fighter fields are the truth (a cleanse that writes the timer to 0 ends
   * it); this map is the bookkeeping beside them. A heart this sim did not install — an online
   * mirror — is only drawn, and its stress is whatever the far machine says.
   */
  private updateHearts(dt: number): void {
    for (const f of this.allFighters()) {
      if (this.now < f.goldHeartUntil && !this.hearts.has(f)) {
        this.hearts.set(f, {
          by: f === this.api.player ? 'npc' : 'player', lx: f.x, ly: f.y, stress: f.goldHeartStress,
          raw: f.rawDamageTaken, acc: 0, live: false, seen: f.goldHeartStress,
        });
      }
    }
    for (const [f, h] of this.hearts) {
      if (!f.active || f.hp <= 0 || this.now >= f.goldHeartUntil) {
        this.hearts.delete(f);
        f.goldHeartUntil = 0;
        f.goldHeartStress = 0;
        continue;
      }
      if (!h.live) {
        // A mirrored heart that empties from nearly full has just had its attack on the far side.
        if (h.seen > 0.75 && f.goldHeartStress < 0.15) this.fx(h.by).heartAttack(f.x, f.y);
        h.seen = f.goldHeartStress;
        h.stress = f.goldHeartStress;
        continue;
      }
      const moved = Math.min(HEART_STEP_CAP, Phaser.Math.Distance.Between(h.lx, h.ly, f.x, f.y));
      h.lx = f.x;
      h.ly = f.y;
      if (!this.stunned(f)) {
        h.stress = Math.max(0, h.stress + moved / HEART_TRAVEL - HEART_CALM_PER_SEC * dt);
      }
      // Blood is money: every 20 the hearted body takes is a coin to whoever gilded it.
      const took = Math.max(0, f.rawDamageTaken - h.raw);
      h.raw = f.rawDamageTaken;
      h.acc += took;
      if (h.acc >= DAMAGE_PER_GOLD) {
        const coins = Math.floor(h.acc / DAMAGE_PER_GOLD);
        h.acc -= coins * DAMAGE_PER_GOLD;
        if (this.isGold(h.by)) this.earn(h.by, coins);
      }
      if (h.stress >= 1) {
        h.stress = 0;
        this.heartAttack(h.by, f);
      }
      f.goldHeartStress = h.stress;
    }
  }

  private heartAttack(by: Owner, f: Fighter): void {
    f.takeDamage(HEART_ATTACK_DAMAGE * this.might(by));
    this.record(by, 'heartAttacks');
    this.stun(f, HEART_STUN_MS);
    this.fx(by).heartAttack(f.x, f.y);
    this.announce(f.x, f.y - 56, '💔 HEART ATTACK', FOR.bloodLit, 15);
    Sfx.playAt('hit-heavy', f.x, { rate: 0.7, volume: 1 });
  }

  private stunned(f: Fighter): boolean { return this.now < (this.stuns.get(f) ?? 0); }

  /**
   * A heart attack stops the body dead and stops its hands. The player and the bot are held by
   * this kit's speed mults (pulled by ArenaScene — online that is also what reaches the victim,
   * through the replica's `spd`), husks and bots by the shared `earthStunnedUntil`, and casting
   * by the generic disarm, which the online mirror carries.
   */
  private stun(f: Fighter, ms: number): void {
    this.stuns.set(f, Math.max(this.stuns.get(f) ?? 0, this.now + ms));
    f.applyDisarm(ms);
    if (f !== this.api.player) f.earthStunnedUntil = Math.max(f.earthStunnedUntil, this.now + ms);
  }

  private updateStuns(): void {
    for (const [f, until] of this.stuns) {
      if (this.now < until && f.active) continue;
      this.stuns.delete(f);
    }
  }

  // ── Gold floor (mastery) ───────────────────────────────────────────────────

  /** The gilded blood of No Pain, No Gain: a coin every other second spent standing on your own. */
  private updateFloor(delta: number): void {
    for (const owner of BOTH) {
      const s = this.side(owner);
      const f = this.fighter(owner);
      s.onFloor = false;
      if (!this.isGold(owner) || !this.alive(f) || !this.patches.length) continue;
      for (const p of this.patches) {
        if (p.owner !== owner || this.now < p.gildAt + PAIN_GILD_MS) continue;
        if (Math.abs(p.x - f.x) > p.r || Math.abs(p.y - (f.y + 10)) > p.r) continue;
        if (Phaser.Math.Distance.Between(p.x, p.y, f.x, f.y + 10) <= p.r) { s.onFloor = true; break; }
      }
      if (!s.onFloor) continue;
      s.floorMs += delta;
      while (s.floorMs >= FLOOR_GOLD_MS) {
        s.floorMs -= FLOOR_GOLD_MS;
        this.earn(owner, 1);
      }
    }
  }

  /**
   * Everything the kit writes on bodies every frame, in one place so each field has one writer:
   * the alchemist's own hide, mend and vigor, a rebirth's thicker skin, and the Ruby picks landing
   * on whoever he fights. Values from an online replica's picks never
   * reach here (its machine applies them and they arrive through `dm`, `spd`, `cd` and `gvig`), so
   * the local player's slow, cooldown and vigor fields are left to the mirror when online.
   */
  private updateSelf(dt: number): void {
    const incoming = new Map<Fighter, number>();
    const speed = new Map<Fighter, number>();
    const cool = new Map<Fighter, number>();
    const vigor = new Map<Fighter, number>();
    const mul = (m: Map<Fighter, number>, f: Fighter, v: number): void => { m.set(f, (m.get(f) ?? 1) * v); };
    for (const owner of BOTH) {
      const s = this.side(owner);
      const f = this.fighter(owner);
      s.glow = Math.max(0, s.glow - dt * 2.2);
      if (!f || !this.isGold(owner) || this.isReplica(owner)) continue;
      this.recompute(owner);
      mul(incoming, f, Math.pow(HIDE_STEP, s.stats.hide) * Math.pow(RUBY_MIGHT, s.ruby.might) * Math.pow(REBIRTH_HIDE, s.rebirths));
      this.hook(owner);
      if (this.alive(f)) {
        if (s.stats.mend > 0) f.heal(MEND_HPS * s.stats.mend * dt);
        const want = Math.round(VIGOR_HP * s.stats.vigor);
        const d = want - s.vigorApplied;
        if (d !== 0) {
          f.increaseMaxHp(d);
          if (d > 0) f.heal(d);
          else if (f.hp > f.maxHp) f.hp = f.maxHp;
          s.vigorApplied = want;
        }
      }
      const r = s.ruby;
      if (r.hide + r.stride + r.haste + r.vigor + r.mend <= 0) continue;
      for (const t of this.targetsOf(owner)) {
        if (r.hide) mul(incoming, t, Math.pow(RUBY_HIDE, r.hide));
        if (r.stride) mul(speed, t, Math.pow(RUBY_STRIDE, r.stride));
        if (r.haste) mul(cool, t, Math.pow(RUBY_HASTE, r.haste));
        if (r.vigor) vigor.set(t, (vigor.get(t) ?? 0) + RUBY_VIGOR * r.vigor);
        if (r.mend) {
          const acc = (this.bleedAcc.get(t) ?? 0) + RUBY_BLEED_HPS * r.mend * dt;
          const whole = Math.floor(acc);
          this.bleedAcc.set(t, acc - whole);
          if (whole > 0) t.takeDamage(whole);
        }
      }
    }

    const mirrored = this.api.isOnline ? this.api.player : null;
    for (const f of this.allFighters()) {
      f.fortuneIncomingMult = incoming.get(f) ?? 1;
      if (f !== mirrored) {
        f.goldSpeedMult = speed.get(f) ?? 1;
        f.goldCooldownMult = cool.get(f) ?? 1;
        f.goldVigorCut = vigor.get(f) ?? 0;
      } else {
        f.goldSpeedMult = 1;
        f.goldCooldownMult = 1;
      }
      this.applyVigorCut(f);
    }
  }

  /** Ruby Vigor: take the cut off max HP as a change, so it can grow and come back. */
  private applyVigorCut(f: Fighter): void {
    const had = this.vigorCuts.get(f) ?? 0;
    const want = Math.max(0, f.goldVigorCut);
    if (want === had) return;
    const d = Math.min(want - had, f.maxHp - 1);
    f.increaseMaxHp(-d);
    if (f.hp > f.maxHp) f.hp = f.maxHp;
    this.vigorCuts.set(f, had + d);
  }

  // ── Mastery ────────────────────────────────────────────────────────────────

  /** Whether Element Mastery is on for whichever side is asking, and they are the alchemist. */
  private masteryOn(owner: Owner): boolean {
    return this.isGold(owner) && (owner === 'player' ? this.api.masteryActive : this.api.npcMasteryActive);
  }

  /** Which slot No Pain, No Gain was dropped on, or null. */
  private painSlot(owner: Owner): 'r' | 'f' | 'q' | null {
    if (!this.masteryOn(owner)) return null;
    for (const k of ['r', 'f', 'q'] as const) {
      const bind = owner === 'player' ? this.api.masteryBindFor(k) : this.api.npcMasteryBindFor(k);
      if (bind === PAIN_ID) return k;
    }
    return null;
  }

  /**
   * Mastery progress. Only ever the player's — the grind is the human's, not the bot's — and not
   * gated on the mastery being on, since earning it is the point.
   */
  private record(owner: Owner, key: string, amount = 1): void {
    if (owner === 'player' && this.isGold('player')) this.api.recordMasteryStat(key, amount);
  }

  /**
   * No Pain, No Gain, from the bound key, the bot, or an online peer's replay.
   *
   * It never goes through `castAbility` — the enhancement is not in the element's ability list —
   * so the refusals that gate every other key are repeated here. The dagger goes in on the cursor's
   * side and the blood leaves by the other. A replica is not cut (its health is its own machine's);
   * its splatter is laid from the seed it sent, so both floors are the same.
   */
  private tryPain(owner: Owner, tx: number, ty: number, seed?: number): boolean {
    const f = this.fighter(owner);
    if (!this.alive(f)) return false;
    const s = this.side(owner);
    const ghost = this.isReplica(owner);
    if (!ghost) {
      const wall = Date.now();
      if (wall < f.disarmedUntil || wall < f.chickenUntil || wall < f.silencedUntil || wall < f.stunnedUntil) return false;
      if (this.now - s.painAt < PAIN_COOLDOWN_MS) return false;
      if (f.hp + f.goldHp <= PAIN_MIN_HP) return false;
    }
    s.painAt = this.now;
    const sd = seed ?? 1 + Math.floor(Math.random() * 9000);
    const ang = Math.atan2(ty - f.y, tx - f.x);
    this.ensureLayers();
    if (!ghost) {
      const cut = Math.min(PAIN_SELF_DAMAGE, f.hp + f.goldHp - PAIN_MIN_HP);
      Fighter.asNonAllyDamage(() => f.takeDamage(cut, { selfInflicted: true }));
    }
    this.splatter(owner, f.x, f.y, ang + Math.PI, sd);
    this.fx(owner).painStab(f.x, f.y, ang);
    this.avatar(owner)?.play('clap', ang);
    Sfx.playAt('stab', f.x, { rate: 0.9, volume: 0.8 });
    Sfx.playAt('splash', f.x, { rate: 1.4, volume: 0.4 });
    if (owner === 'player' && this.api.isOnline) {
      this.api.broadcastMasteryCast(`gold-net:pain:${Math.round(tx)}:${Math.round(ty)}:${sd}`);
    }
    return true;
  }

  /**
   * The blood: a fan thrown out along `back` that is cone-like and no more than that — it widens
   * as it goes, the whole spray drifts to one side, each blot is thrown a little short or long, and
   * a few strays land well outside it. Laid entirely from `seed`.
   */
  private splatter(owner: Owner, x: number, y: number, back: number, seed: number): void {
    const drift = (jitter(seed, 99) - 0.5) * 0.5;
    for (let i = 0; i < PAIN_BLOTS + PAIN_STRAYS; i++) {
      const stray = i >= PAIN_BLOTS;
      const u = stray ? 0.35 + jitter(seed, i + 40) * 0.65 : (i + 0.5) / PAIN_BLOTS;
      const half = stray ? 0.75 : 0.14 + u * 0.4;
      const a = back + drift * u + (jitter(seed, i) * 2 - 1) * half;
      const d = 24 + Math.pow(u, 0.85) * PAIN_REACH * (0.82 + jitter(seed, i + 20) * 0.3);
      const r = stray ? 5 + jitter(seed, i + 60) * 4 : 23 - u * 10 + jitter(seed, i + 60) * 5;
      this.patches.push({
        owner, x: this.clampX(x + Math.cos(a) * d), y: this.clampY(y + Math.sin(a) * d), r, seed: seed + i * 7.3,
        born: this.now + u * 140, gildAt: this.now + PAIN_WET_MS + u * 500,
      });
    }
    while (this.patches.length > FLOOR_MAX) this.patches.shift();
  }

  /**
   * Gilded Augment: below 30% the purse starts buying gold health, until health and gold health
   * together are back to 55% or the purse is empty. The price per second climbs the longer one
   * stretch runs. Runs on the body's own machine — a replica's gold health arrives with its vitals.
   */
  private updateAugment(delta: number): void {
    const dt = delta / 1000;
    for (const owner of BOTH) {
      const s = this.side(owner);
      const f = this.fighter(owner);
      const was = s.augment;
      if (!this.masteryOn(owner) || this.isReplica(owner) || !this.alive(f) || f.passivesSealed()) {
        s.augment = false;
        continue;
      }
      const ratio = (f.hp + f.goldHp) / Math.max(1, f.maxHp);
      const broke = s.gold <= 0 && s.augmentDebt < 1;
      if (was) s.augment = ratio < AUGMENT_TO && !broke;
      else s.augment = ratio < AUGMENT_AT && s.gold > 0;
      if (!s.augment) {
        s.augmentDebt = 0;
        continue;
      }
      if (!was) {
        s.augmentSince = this.now;
        this.fx(owner).augmentStart(f.x, f.y);
        Sfx.playAt('money', f.x, { rate: 0.8, volume: 0.7 });
      }
      const running = (this.now - s.augmentSince) / 1000;
      s.augmentDebt += AUGMENT_GOLD_PER_SEC * (1 + running / AUGMENT_RAMP_SEC) * dt;
      while (s.augmentDebt >= 1 && s.gold > 0) {
        s.augmentDebt -= 1;
        s.gold -= 1;
        s.spent += 1;
      }
      this.hook(owner);
      f.goldHp += AUGMENT_HPS * dt;
      if (Math.random() < dt * 8) this.fx(owner).augmentMote(f.x, f.y);
    }
  }

  // ── Bot ────────────────────────────────────────────────────────────────────

  /**
   * Everything the bot does that is not a cast: shop the tycoon, throw the life-support switch,
   * take its cue shots and use its dagger. Driven here rather than from `NpcOpponent` because none
   * of it is an ability — the rotation only reads what this publishes and stays out of the way.
   */
  private updateNpc(): void {
    if (this.api.isOnline || this.api.isInvasion || !this.isGold('npc')) return;
    const n = this.api.npc;
    const s = this.sides.npc;
    if (!this.alive(n)) return;

    // The tycoon first: the cheapest pad the moment the purse covers it.
    if (this.now >= s.buyAt) {
      s.buyAt = this.now + NPC_BUY_MS;
      const pad = s.tycoon.cheapest();
      if (pad && s.gold >= pad.price) this.pressPad('npc', pad);
      else if (this.up('npc', 'click') && !s.tycoon.shardDropper && this.now - this.startAt >= NPC_SHARD_PAD_MS) this.build('npc', 'shard');
    }
    if (this.up('npc', 'click')) {
      const hp = n.hp / Math.max(1, n.maxHp);
      if (!s.tycoon.lifeSupport && hp < NPC_LIFE_ON) this.setLifeSupport('npc', true);
      else if (s.tycoon.lifeSupport && hp > NPC_LIFE_OFF) this.setLifeSupport('npc', false);
    }
    if (this.stunned(n) || Date.now() < n.disarmedUntil) return;

    // The cue: shoot when a ball lines up, shoot at whatever is in reach when time is short, and
    // put the cane away rather than stand there holding it.
    const c = s.cue;
    if (c) {
      if (this.now < c.readyAt + NPC_CUE_THINK_MS) return;
      const plan = this.npcCuePlan();
      const late = this.now >= c.readyAt + NPC_CUE_GIVE_UP_MS;
      if (plan && (plan.shoot || (late && plan.inReach))) this.strike('npc', n.x, n.y, plan.ang, plan.shoot ? 1 : 0.75);
      else if (late) s.cue = null;
      return;
    }

    // Mastery: the dagger, thrown away from the target so the gold lands behind the bot.
    if (!this.painSlot('npc') || s.offer || s.lunge) return;
    if (n.hp / Math.max(1, n.maxHp) < NPC_PAIN_HP || this.now - s.painAt < PAIN_COOLDOWN_MS) return;
    const t = this.targetsOf('npc')[0];
    if (t) this.tryPain('npc', t.x, t.y);
  }

  /**
   * The bot's reading of the table. It wants a ball that, struck from where the bot stands, runs
   * at the target: the ball whose shooting stance (behind it, on the line through the target) is
   * nearest. Inside the cane's reach of the target itself, the cane is the shot. Side-effect-free.
   */
  private npcCuePlan(): CuePlan | null {
    const n = this.api.npc;
    if (!this.sides.npc.cue || !this.alive(n)) return null;
    const p = this.targetsOf('npc')[0];
    if (!p) return null;
    const toP = Math.atan2(p.y - n.y, p.x - n.x);
    if (Phaser.Math.Distance.Between(n.x, n.y, p.x, p.y) <= CUE_REACH + this.bodyR(p) - 6) {
      return { ang: toP, inReach: true, shoot: true, stance: null };
    }
    let best: Ball<Owner> | null = null;
    let stance = { x: n.x, y: n.y };
    let bestD = Infinity;
    for (const b of this.balls) {
      if (b.owner !== 'npc') continue;
      const d = Phaser.Math.Distance.Between(b.x, b.y, p.x, p.y) || 1;
      const sx = b.x - ((p.x - b.x) / d) * NPC_CUE_STANCE;
      const sy = b.y - ((p.y - b.y) / d) * NPC_CUE_STANCE;
      const far = Phaser.Math.Distance.Between(n.x, n.y, sx, sy);
      if (far < bestD) { bestD = far; best = b; stance = { x: this.clampX(sx), y: this.clampY(sy) }; }
    }
    if (!best) return { ang: toP, inReach: false, shoot: false, stance: null };
    const nb = Phaser.Math.Distance.Between(n.x, n.y, best.x, best.y) || 1;
    const bp = Phaser.Math.Distance.Between(best.x, best.y, p.x, p.y) || 1;
    const align = ((best.x - n.x) / nb) * ((p.x - best.x) / bp) + ((best.y - n.y) / nb) * ((p.y - best.y) / bp);
    const inReach = nb > 8 && nb <= CUE_REACH + BALL_R - 2;
    return { ang: Math.atan2(best.y - n.y, best.x - n.x), inReach, shoot: inReach && align >= NPC_CUE_ALIGN, stance };
  }

  /** The mastery card: cooling down, and greyed while the dagger would be the killing blow. */
  getPainCooldownRatio(): number {
    return Phaser.Math.Clamp((this.now - this.sides.player.painAt) / PAIN_COOLDOWN_MS, 0, 1);
  }

  /** Which slot the bot gave up for No Pain, No Gain, so its rotation leaves that key alone. */
  npcPainSlot(): 'r' | 'f' | 'q' | undefined {
    return this.painSlot('npc') ?? undefined;
  }

  // ── Painting ───────────────────────────────────────────────────────────────

  private paint(): void {
    const fg = this.floorGfx;
    const tg = this.tycoonGfx;
    const bg = this.ballGfx;
    const ag = this.airGfx;
    const hg = this.hudGfx;
    if (!fg || !tg || !bg || !ag || !hg) return;
    fg.clear(); tg.clear(); bg.clear(); ag.clear(); hg.clear();
    this.npcTycoonGfx?.clear();

    // Mastery: blood, setting into gold.
    for (const p of this.patches) {
      const a = Phaser.Math.Clamp((this.now - p.born) / 140, 0, 1);
      const gild = Phaser.Math.Clamp((this.now - p.gildAt) / PAIN_GILD_MS, 0, 1);
      bloodBlot(fg, this.col(p.owner), p.x, p.y, p.r * (0.6 + 0.4 * a), p.seed, gild, this.vizT, 0.9 * a);
    }

    this.paintTycoons();

    for (const b of this.balls) {
      const fade = Phaser.Math.Clamp((b.until - this.now) / BALL_FADE_MS, 0, 1);
      poolBall(bg, this.col(b.owner), b.x, b.y, BALL_R, b.n, b.roll, fade);
    }
    for (const t of this.tosses) {
      const u = Phaser.Math.Clamp((this.now - t.start) / TOSS_MS, 0, 1);
      t.spots.forEach((p, i) => {
        const x = t.fx + (p.x - t.fx) * u;
        const y = t.fy + (p.y - t.fy) * u;
        poolBall(ag, this.col(t.owner), x, y, BALL_R, i + 1, u * 9 + i, 1, Math.sin(u * Math.PI));
      });
    }

    for (const b of this.blades) {
      const gild = Phaser.Math.Clamp((this.now - b.born) / FRAY_GILD_MS, 0, 1);
      const fade = Phaser.Math.Clamp((FRAY_LIFE_MS - (this.now - b.born)) / 300, 0, 1);
      grassBlade(ag, this.col(b.owner), b.x, b.y, Math.atan2(b.vy, b.vx), FRAY_BLADE_LEN, gild, fade);
    }

    // The cue's sight: yours in full, the enemy's faint — enough to see where it is pointing.
    for (const owner of BOTH) {
      const s = this.side(owner);
      const f = this.fighter(owner);
      if (!s.cue || this.now < s.cue.readyAt || !this.alive(f) || this.isReplica(owner)) continue;
      const aim = this.cueAim(owner);
      const ball = cueTarget(this.balls, owner, f.x, f.y, Math.cos(aim.ang), Math.sin(aim.ang), CUE_REACH, CUE_HALF_W);
      const left = Phaser.Math.Clamp((s.cue.until - this.now) / 600, 0, 1);
      cueSight(
        ag, this.col(owner), f.x, f.y, aim.ang, CUE_REACH, aim.power,
        ball ? { x: ball.x, y: ball.y, r: BALL_R } : null, (owner === 'player' ? 1 : 0.45) * left, this.vizT,
      );
    }

    for (const [f, h] of this.hearts) {
      if (!f.active || f.alpha <= 0.05) continue;
      goldenHeart(hg, this.col(h.by), f.x, f.y - 46, h.stress, this.vizT, Math.max(0.35, f.alpha));
    }

    this.paintOffers(hg);
  }

  /** Both strips, their pad prices, and a caption for whichever pad the cursor is on. */
  private paintTycoons(): void {
    let used = 0;
    let caption = '';
    let capX = 0;
    let capY = 0;
    for (const owner of BOTH) {
      if (!this.tycoonShown(owner)) continue;
      const s = this.side(owner);
      const o = this.tycoonOrigin(owner);
      const g = owner === 'player' ? this.tycoonGfx : this.npcTycoonGfx;
      if (!g) continue;
      g.setPosition(o.x, o.y);
      const pads = this.padsOf(owner);
      const hover = owner === 'player' ? this.padUnder('player', s.aimX, s.aimY) : null;
      // A dead alchemist's factory stands idle, dimmed.
      const alpha = this.alive(this.fighter(owner)) ? 1 : 0.45;
      paintTycoon(g, this.col(owner), s.tycoon, 0, 0, this.vizT, alpha, pads, (p) => this.canPay(owner, p), hover?.id ?? null);
      for (const pad of pads) {
        const t = this.padLabel(used++);
        const ok = this.canPay(owner, pad);
        t.setText(pad.currency === 'shards' ? `${pad.price}◆` : `${pad.price}`)
          .setPosition(o.x + pad.x * TYCOON_SCALE, o.y + (pad.y - 1) * TYCOON_SCALE).setAlpha(alpha).setVisible(true)
          .setColor(pad.currency === 'shards' ? '#eaf8ff' : ok ? '#f4fff0' : '#ffd0d0');
      }
      if (owner !== 'player') continue;
      capX = o.x + (TYCOON_W * TYCOON_SCALE) / 2;
      capY = o.y + TYCOON_H * TYCOON_SCALE + 8;
      if (hover) {
        const unit = hover.currency === 'shards' ? 'shards' : 'gold';
        caption = `${hover.name.toUpperCase()}  ·  ${PAD_BLURB[hover.id]}  ·  ${hover.price} ${unit}`;
      } else if (this.canRebirth('player') && !this.painBoundOverQ()) {
        caption = 'TYCOON COMPLETE  ·  Q: REBIRTH';
      } else if (s.tycoon.lifeSupport) {
        caption = 'LIFE-SUPPORT  ·  RIGHT CLICK TO EARN GOLD AGAIN';
      }
    }
    for (let i = used; i < this.padLabels.length; i++) this.padLabels[i].setVisible(false);
    if (!caption) {
      this.padCaption?.setVisible(false);
      return;
    }
    if (!this.padCaption) {
      this.padCaption = this.api.scene.add.text(0, 0, '', {
        fontSize: '9px', fontFamily: FONT_UI, fontStyle: 'bold', color: '#fff3c4', align: 'center',
        stroke: '#17110a', strokeThickness: 3,
      }).setOrigin(0.5).setDepth(15).setScrollFactor(0);
    }
    this.padCaption.setText(caption).setPosition(capX, capY).setVisible(true);
  }

  private painBoundOverQ(): boolean { return this.painSlot('player') === 'q'; }

  private padLabel(i: number): Phaser.GameObjects.Text {
    while (this.padLabels.length <= i) {
      this.padLabels.push(this.api.scene.add.text(0, 0, '', {
        fontSize: '8px', fontFamily: FONT_DISPLAY, color: '#f4fff0', align: 'center',
        stroke: '#17110a', strokeThickness: 2,
      }).setOrigin(0.5).setDepth(2.7).setScrollFactor(0).setVisible(false));
    }
    return this.padLabels[i];
  }

  private paintOffers(g: Phaser.GameObjects.Graphics): void {
    let used = 0;
    let priced = 0;
    for (const owner of BOTH) {
      const offer = this.side(owner).offer;
      if (!offer) continue;
      const f = this.fighter(owner);
      if (!this.alive(f)) continue;
      const cs = this.cardCentres(owner);
      const s = this.side(owner);
      const hover = owner === 'player' ? this.cardUnder('player', s.aimX, s.aimY) : -1;
      const appear = Phaser.Math.Clamp((this.now - offer.opened) / 220, 0, 1);
      const out = offer.ghost ? Phaser.Math.Clamp((offer.decideAt - this.now) / 250, 0, 1) : 1;
      const a = appear * out;
      let jeweled = false;
      for (let i = 0; i < cs.length; i++) {
        const card = offer.cards[i];
        const rise = (1 - appear) * 14;
        const cx = cs[i].x;
        const cy = cs[i].y + rise;
        // Only the alchemist's own purse is known; a replica's jewels are never greyed.
        const short = !offer.ghost && card.price > s.gold;
        advanceCard(g, this.col(owner), cx, cy, CARD_W, CARD_H, card.kind, hover === i && !short, a, this.vizT);
        const def = STAT_BY_KIND.get(card.kind)!;
        const name = this.label(used++);
        name.setText(def.name).setPosition(cx, cy + 16).setAlpha(a).setVisible(true);
        const line = this.label(used++);
        line.setText(this.cardLine(owner, card)).setPosition(cx, cy + 27).setAlpha(a).setVisible(true)
          .setColor(card.jewel === 'ruby' ? '#ff8a8a' : '#e6c46a');
        if (!card.jewel) continue;
        jeweled = true;
        jewelGem(g, this.col(owner), cx, cy - CARD_H / 2 - 1, 6, card.jewel, a, this.vizT + i);
        if (short) {
          g.fillStyle(this.col(owner)(FOR.ink), a * 0.5);
          g.fillRoundedRect(cx - CARD_W / 2, cy - CARD_H / 2, CARD_W, CARD_H, 6);
        }
        const price = this.priceLabel(priced++);
        price.setText(`${JEWEL_NAME[card.jewel]}  ${card.price}🪙`).setPosition(cx, cy + CARD_H / 2 + 7)
          .setAlpha(a).setVisible(true).setColor(short ? '#ff6b6b' : '#fff0a8');
      }
      // The fuse on an unanswered offer, under the cards (and under the prices, when there are any).
      if (!offer.ghost && owner === 'player') {
        const left = Phaser.Math.Clamp((offer.until - this.now) / OFFER_MS, 0, 1);
        const span = cs.length * CARD_W + (cs.length - 1) * CARD_GAP;
        const x0 = cs[0].x - CARD_W / 2;
        const y0 = cs[0].y + CARD_H / 2 + (jeweled ? 15 : 5);
        goldFuse(g, this.col(owner), x0, y0, span, left, a, this.vizT);
      }
    }
    for (let i = used; i < this.labels.length; i++) this.labels[i].setVisible(false);
    for (let i = priced; i < this.priceLabels.length; i++) this.priceLabels[i].setVisible(false);
  }

  private label(i: number): Phaser.GameObjects.Text {
    while (this.labels.length <= i) {
      const big = this.labels.length % 2 === 0;
      this.labels.push(this.api.scene.add.text(0, 0, '', {
        fontSize: big ? '8px' : '7px', fontFamily: big ? FONT_DISPLAY : FONT_UI, fontStyle: big ? 'normal' : 'bold',
        color: big ? '#fff3c4' : '#e6c46a', align: 'center',
        stroke: '#17110a', strokeThickness: big ? 2.5 : 2,
      }).setOrigin(0.5).setDepth(17).setVisible(false));
    }
    return this.labels[i];
  }

  /** E+ Artisan: the stone and its price, under a jeweled card. */
  private priceLabel(i: number): Phaser.GameObjects.Text {
    while (this.priceLabels.length <= i) {
      this.priceLabels.push(this.api.scene.add.text(0, 0, '', {
        fontSize: '7px', fontFamily: FONT_UI, fontStyle: 'bold', color: '#fff0a8', align: 'center',
        stroke: '#17110a', strokeThickness: 2,
      }).setOrigin(0.5).setDepth(17).setVisible(false));
    }
    return this.priceLabels[i];
  }

  // ── Avatars & HUD ──────────────────────────────────────────────────────────

  private updateAvatars(delta: number): void {
    for (const owner of BOTH) {
      const av = this.avatar(owner);
      if (!av) continue;
      const f = this.fighter(owner);
      if (!this.alive(f)) { av.update(delta, f?.x ?? 0, f?.y ?? 0, 0); continue; }
      const s = this.side(owner);
      if (owner === 'npc') {
        const t = this.targetsOf('npc')[0];
        if (t) { s.aimX = t.x; s.aimY = t.y; }
      }
      // With the cane out he faces down the shot.
      const cueOut = !!s.cue && this.now >= s.cue.readyAt;
      const aim = cueOut ? this.cueAim(owner) : null;
      av.setFacing(aim ? aim.ang : Math.atan2(s.aimY - f.y, s.aimX - f.x));
      av.setCue(aim ? aim.ang : null, aim ? aim.power : 0);
      av.setGlowHand(Math.max(s.glow, s.offer ? 0.7 : 0));
      av.setGold(Math.min(1, s.gold / 30));
      av.setMastered(this.masteryOn(owner));
      av.setGilding(s.rebirths * REBIRTH_PLATES);
      av.setRebirthFlash(Phaser.Math.Clamp(1 - (this.now - s.rebirthAt) / REBIRTH_FLASH_MS, 0, 1));
      av.update(delta, f.x, f.y, f.alpha);
    }
  }

  private pushStatuses(playerIs: boolean): void {
    const s = this.sides.player;
    const p = this.api.player;
    this.api.setStatusIndicator('gold-purse', playerIs ? {
      name: 'Gold', emoji: '🪙', color: FOR.gold, priority: 150,
      description: `Your purse. The tycoon along the top of the screen fills it: every piece of ore that reaches the refiner pays. Click a pad to buy the next machine with it, or spend ${ADVANCE_COST} on Advance (E). A gold-hearted enemy also pays 1 per ${DAMAGE_PER_GOLD} damage they take.`,
      count: s.gold,
    } : null);
    this.api.setStatusIndicator('gold-rebirth', playerIs && s.rebirths > 0 ? {
      name: 'Reborn', emoji: '👑', color: FOR.goldLit, priority: 150.5,
      description: `Reborn ${s.rebirths} of ${REBIRTH_MAX} times: +${Math.round(REBIRTH_GOLD * 100 * s.rebirths)}% gold, +${Math.round(REBIRTH_MIGHT * 100 * s.rebirths)}% damage, and ${Math.round((1 - Math.pow(REBIRTH_HIDE, s.rebirths)) * 100)}% less damage taken.`,
      count: s.rebirths,
    } : null);
    this.api.setStatusIndicator('gold-health', playerIs && p?.goldHp >= 1 ? {
      name: 'Gold Health', emoji: '💛', color: FOR.gold, priority: 150.6,
      description: `Health made of gold, spent before your own. Every ${GOLD_HP_PER_COIN} of it an enemy cuts away pays you 1 gold.`,
      count: Math.round(p.goldHp),
    } : null);
    this.api.setStatusIndicator('gold-life', playerIs && s.tycoon.lifeSupport ? {
      name: 'Life-support', emoji: '➕', color: FOR.bloodLit, priority: 150.7,
      description: `The refiner is paying health instead of gold — ${LIFE_HP_PER_GOLD} HP for every gold it would have made — and your droppers run ${Math.round((1 - LIFE_SUPPORT_RATE) * 100)}% slower. Right click to switch back.`,
    } : null);
    this.api.setStatusIndicator('gold-floor', playerIs && s.onFloor ? {
      name: 'Gold Floor', emoji: '✨', color: FOR.goldLit, priority: 151,
      description: `Standing on your own gilded blood: 1 gold every ${FLOOR_GOLD_MS / 1000} seconds.`,
    } : null);
    for (const st of STATS) {
      const n = playerIs ? s.stats[st.kind] : 0;
      const shown = Math.round(n * 10) / 10;
      this.api.setStatusIndicator(`gold-stat-${st.kind}`, n > 0 ? {
        name: `Advance: ${st.name[0]}${st.name.slice(1).toLowerCase()}`, emoji: '⬆️', color: st.color, priority: 152,
        description: `${st.line} per pick, for the rest of the match. Worth ${shown} picks right now: ${this.statLine(st.kind, n)}.`,
        count: shown,
      } : null);
    }
    this.api.setStatusIndicator('gold-augment', playerIs && s.augment ? {
      name: 'Gilded Augment', emoji: '✨', color: FOR.goldLit, priority: 151.2,
      description: `Gold Mastery: the purse is buying you gold health — ${AUGMENT_HPS} a second, and ${Math.round((AUGMENT_SPEED - 1) * 100)}% faster — until health and gold health together are back to ${Math.round(AUGMENT_TO * 100)}%. The price climbs the longer it runs.`,
    } : null);
    const rubies = RUBY_KINDS.filter((k) => s.ruby[k] > 0);
    this.api.setStatusIndicator('gold-ruby', playerIs && rubies.length ? {
      name: 'Ruby Curses', emoji: '♦️', color: FOR.bloodLit, priority: 152.5,
      description: `Your ruby picks, turned on whoever you fight: ${rubies.map((k) => `${this.rubyLine(k)} ×${s.ruby[k]}`).join(', ')}.`,
      count: rubies.reduce((n, k) => n + s.ruby[k], 0),
    } : null);
  }

  // ── Public accessors (read by ArenaScene / the AI) ─────────────────────────

  private speedFor(owner: Owner): number {
    const s = this.side(owner);
    return (1 + STRIDE_STEP * s.stats.stride) * (s.augment ? AUGMENT_SPEED : 1);
  }

  /** Memory's Rebirth: the struck side loses part of what it has built up. Returns a label, or null. */
  rebirthDrain(owner: Owner): string | null {
    const s = this.side(owner);
    const take = Math.ceil(s.gold * 0.4);
    if (take <= 0) return null;
    s.gold -= take;
    return `−${take} 🪙`;
  }

  /** Stride, Gilded Augment and a heart attack, pulled by ArenaScene's speed block. */
  getPlayerSpeedMult(): number {
    const p = this.api.player;
    if (!p) return 1;
    if (this.stunned(p)) return 0;
    // Ruby Stride, from the bot's picks (online it arrives through `spd` instead, and this is 1).
    return p.goldSpeedMult * (this.isGold('player') ? this.speedFor('player') : 1);
  }

  getNpcSpeedMult(): number {
    const n = this.api.npc;
    if (!n) return 1;
    if (this.stunned(n)) return 0;
    // Ruby Stride on the npc counts online too: it is what `spd` carries to the victim.
    const slow = n.goldSpeedMult;
    // An online replica's motion is streamed; its own boosts already happened on its machine.
    if (!this.isGold('npc') || this.api.isOnline) return slow;
    return slow * this.speedFor('npc');
  }

  coinsOf(owner: Owner): number { return this.side(owner).gold; }

  /**
   * True while the bot can afford Advance, is not already choosing, and would not be spending
   * the tycoon's money: until the tycoon is complete, the next pad's price is kept back.
   */
  npcCanAdvance(): boolean {
    const s = this.sides.npc;
    if (s.offer) return false;
    return s.gold >= ADVANCE_COST + (s.tycoon.cheapest()?.price ?? 0);
  }

  npcLunging(): boolean { return !!this.sides.npc.lunge; }

  /** The bot's target is wearing the bot's gold heart. */
  npcHeartLive(): boolean {
    const p = this.api.player;
    const h = p ? this.hearts.get(p) : undefined;
    return !!h && h.by === 'npc' && this.now < p.goldHeartUntil;
  }

  /** Synergy: the bot's tycoon is complete and it has a rebirth left. Side-effect-free. */
  npcCanRebirth(): boolean {
    return this.isGold('npc') && this.canRebirth('npc');
  }

  /** The bot's cane is out: the click is the cue's, and the kit takes the shot. */
  npcCueOut(): boolean { return !!this.sides.npc.cue; }

  /**
   * Fray falls, so aiming at the body throws under it. The aim point that puts the clump's middle
   * through the target, lifted by the drop over the flight time.
   */
  npcFrayAim(): { x: number; y: number } | undefined {
    const n = this.api.npc;
    const p = this.api.player;
    if (!this.alive(n) || !this.alive(p)) return undefined;
    const d = Phaser.Math.Distance.Between(n.x, n.y, p.x, p.y);
    const v = (FRAY_SPEED_MIN + FRAY_SPEED_MAX) / 2;
    const t = d / v;
    return { x: p.x, y: p.y - 0.5 * FRAY_GRAVITY * t * t };
  }

  /**
   * Somewhere worth standing: behind the ball it means to shoot while the cane is out, otherwise
   * on its own gilded blood. Side-effect-free.
   */
  npcSeekPoint(): { x: number; y: number } | undefined {
    const n = this.api.npc;
    if (!this.alive(n) || !this.isGold('npc')) return undefined;
    const s = this.sides.npc;
    if (s.cue) {
      const st = this.npcCuePlan()?.stance;
      return st && Phaser.Math.Distance.Between(n.x, n.y, st.x, st.y) > 8 ? st : undefined;
    }
    if (s.onFloor) return undefined;
    let best: { x: number; y: number } | undefined;
    let bestD = NPC_FLOOR_SEEK_R;
    for (const p of this.patches) {
      if (p.owner !== 'npc' || p.r < 12) continue;
      const d = Phaser.Math.Distance.Between(n.x, n.y, p.x, p.y - 10);
      if (d < bestD) { bestD = d; best = { x: p.x, y: p.y - 10 }; }
    }
    return best;
  }

  /**
   * Ability tray fill. Advance shows how close the purse is to the price, Billiards counts the
   * cane down while it is out, and Rebirth fills with the tycoon — and stays empty once the third
   * rebirth is spent.
   */
  getBarRatio(abilityId: string, time: number): number {
    const p = this.api.player;
    void time;
    const cd = p.getCooldownRatio(abilityId);
    const s = this.sides.player;
    if (abilityId === 'fortune-advance') {
      return Math.min(cd, Phaser.Math.Clamp(s.gold / ADVANCE_COST, 0, 1));
    }
    if (abilityId === 'fortune-billiards' && s.cue) {
      return 0.1 + 0.9 * Phaser.Math.Clamp((s.cue.until - this.now) / CUE_MS, 0, 1);
    }
    if (abilityId === 'fortune-rebirth') {
      if (s.rebirths >= REBIRTH_MAX) return 0;
      return s.tycoon.complete ? cd : Math.min(cd, s.tycoon.progress * 0.95);
    }
    return cd;
  }
}
