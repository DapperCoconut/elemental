import Phaser from 'phaser';
import { Sfx } from '../../audio';
import { Fighter } from '../../entities/Fighter';
import { CastContext } from '../Ability';
import type { CustomStatus } from './StatusHudKit';
import { Projectile } from '../../combat/Projectile';
import {
  DRM, DreamAvatar, DreamColorFn, DreamFx, DreamPortal, OasisView, TrancePendulum,
  angryRam, cosmicCannon, dreamCrown, dreamOrb, dreamcatcherShape, ekgTrace, hauntBolt,
  leashRing, nightTerror, pendulumBob, pillowFort, sleepMeter, sleepyZ, spiritForm,
  spiritThread, star, spiritTearShape, tearMoon, wishCounter,
} from './DreamVisuals';
import { meterGain } from '../../combat/Meters';
import { DreamBoon, dreamBoons } from '../../data/DreamBuffs';
import { DreamElementPicker } from './DreamPicker';
import { findElementDef } from '../../data/ElementRoster';

type Owner = 'player' | 'npc';

// ── Sleepiness ───────────────────────────────────────────────────────────────
const SLEEP_MAX = 100;
/** Drowsiness bleeds off whenever nobody is swinging a pendulum at you. */
const SLEEP_DECAY_PER_SEC = 6;
const SLEEP_MS = 8000;

// ── The cursor passive ───────────────────────────────────────────────────────
const CURSOR_DAMAGE = 5;
/** A body's worth of hitbox. The cursor has to leave this and come back to score again. */
const CURSOR_HITBOX = 24;

// ── Rest (the second passive) ────────────────────────────────────────────────
/**
 * The pendulum's opposite number: standing perfectly still hands health back. Trance wants
 * you pacing and Rest wants you planted, so the element is always asking which one you need.
 */
const REST_HEAL = 5;
const REST_TICK_MS = 1000;
/** Body speed (px/s) below which a fighter counts as standing still. */
const REST_STILL_SPEED = 6;

// ── Trance (Click) ───────────────────────────────────────────────────────────
const PEND_LEN = 68;
const PEND_G = 1600;
const PEND_DAMP = 0.7;
/** Anchor acceleration is a second derivative of a position sampled once a frame — cap it. */
const PEND_MAX_DRIVE = 5200;
/**
 * How far out from the body the hand holding the chain sits. This is the whole rework: the
 * pivot is carried around by the *cursor*, not by the feet, so circling the mouse whips the
 * pivot in a circle and the pendulum is driven by that circle's acceleration. A player who
 * circles at roughly the pendulum's own √(g/L) ≈ 4.85 rad/s is driving it on resonance.
 */
const HAND_R = 26;
/** Tip speed (px/s) at which the drowsy field is at full strength. */
const TRANCE_MAX_TIP = 380;
/**
 * Cursor spin (rad/s) below which winding counts as fidgeting, and the rate at which it alone
 * guarantees a full-strength field. The physics above is the *feel*; this is the promise —
 * spin harder and the aura is bigger, whatever phase the bob happens to be caught at.
 */
const SPIN_DEADZONE = 1.2;
const SPIN_FULL = 8.4;
/** Cap on the bob's angular rate, so a hard wind never turns it into a strobing blur. */
const OMEGA_MAX = 8;
const TRANCE_R_MIN = 92;
/** The reach at a full wind. It grew with the gain — a hard-won swing should also be wider. */
const TRANCE_R_MAX = 210;
/**
 * Sleepiness per second at a full-strength swing, and the curve it is paid on.
 *
 * The exponent is the whole shape of the ability. At 2.0 a half-wound pendulum pays a quarter of
 * a full one rather than four tenths, so the top of the meter is worth far more than the middle
 * and the reward for holding a hard wind is a cliff rather than a slope. The gain went up with
 * it: a full swing is now materially better than the old one, and everything below about 70% is
 * worse. Winding badly is meant to be close to pointless.
 */
const TRANCE_GAIN = 26;
const TRANCE_CURVE = 2.0;

/**
 * How the wind becomes swing.
 *
 * The pendulum used to read as hot the instant the cursor moved fast, which made "charged" a
 * state you flicked into. It is now a stored charge that fills while you wind well and drains
 * when you do not: about three seconds of good circling to reach full, where it used to be about
 * one. `CHARGE_FILL` is charge per second at a perfect wind, and it is scaled by the quality of
 * the wind, so a mediocre circle both fills slower *and* stops lower.
 *
 * Draining stops at whatever the current wind supports rather than at zero, so easing off costs
 * you the top of the bar and not the whole thing.
 */
const CHARGE_FILL = 0.34;
const CHARGE_DRAIN = 0.55;
/** Below this the pendulum is just hanging there, and hanging is not hypnotism. */
const TRANCE_MIN_SWING = 0.06;
/**
 * The AI has no mouse to circle, so it is handed a spin rate directly. Enough to matter,
 * not enough to match a player who is actually winding.
 */
const NPC_SPIN = 4.6;

// ── Knocked Out (Click+) ─────────────────────────────────────────────────────
/** Below this heat, switching the pendulum off just puts it away. */
const THROW_MIN_HEAT = 0.4;
const THROW_SPEED = 620;
const THROW_BASE_DAMAGE = 14;
const THROW_HEAT_DAMAGE = 46;
const THROW_R = 20;
const THROW_LIFE_MS = 900;
/** Sleepiness at which a hit from the flying bob puts them straight under. */
const THROW_KO_AT = 75;

// ── Pillow Fort (E+) ─────────────────────────────────────────────────────────
const FORT_BASE_HP = 75;
const FORT_HEAL = 25;
const FORT_MAX_LEVEL = 5;
const FORT_R = 46;
/** L3 and L5 each add this to the footprint and to the pool. */
const FORT_GROW_R = 11;
const FORT_GROW_HP = 50;
/** Rest inside a fort of level ≥2 is worth this much more a second, again at level 5. */
const FORT_REST_BONUS = 2;
const RAM_EVERY_MS = 12000;
const RAM_LIFE_MS = 5000;
const RAM_SPEED = 290;
const RAM_DAMAGE = 22;
const RAM_KNOCK = 240;
const RAM_HIT_R = 22;
const CANNON_COOLDOWN_MS = 15000;
const CANNON_DAMAGE = 25;
const CANNON_SLEEP = 20;
const CANNON_SPEED = 700;
const CANNON_R = 22;
/** Knockback is played out as a position shove — see `Shove`. */
const SHOVE_MS = 260;

// ── Good Dreams (R+) ─────────────────────────────────────────────────────────
const GOOD_DREAM_CHANCE = 0.2;
const GOOD_BUFF_MS = 40000;

// ── Phobia (F+) ──────────────────────────────────────────────────────────────
const PHOBIA_PER_STACK = 0.15;

// ── Night Terrors (Q+) ───────────────────────────────────────────────────────
/** How long the victim is held inside the nightmare before it lets them out. */
const TERROR_HOLD_MS = 4000;
const TERROR_EXHAUST_MS = 12000;
const TERROR_EXHAUST_MULT = 0.67;
const TERROR_STUN_MS = 5000;
const TERROR_BLEED_MS = 10000;
const TERROR_BLEED_TICK_MS = 1000;
const TERROR_BLEED_DAMAGE = 5;

// ── Pillow Fight (E) ─────────────────────────────────────────────────────────
const PILLOW_DAMAGE = 10;
/** Added on top at full sleepiness — a pillow to a sleeping head is the whole element. */
const PILLOW_SLEEP_BONUS = 60;
const PILLOW_REACH = 84;
const PILLOW_ARC = Math.PI / 2.1;
const PILLOW_SLEEP_MULT = 1.25;

// ── Dreamcatcher (R) ─────────────────────────────────────────────────────────
const CATCHER_MS = 12000;
const CATCHER_MAX = 3;
const CATCHER_RADIUS = 22;
const DRAIN_MS = 2000;
const DREAM_CAP = 5;
const DREAM_HEAL = 10;
/** Every dream torn out of a sleeper pushes all of their cooldowns back by this much. */
const DREAM_COOLDOWN_PENALTY = 2000;
const PICKUP_RADIUS = 32;

// ── Nightmare (F) ────────────────────────────────────────────────────────────
const NIGHTMARE_MS = 10000;
const NIGHTMARE_TICK_MS = 1000;
const NIGHTMARE_TICK_DAMAGE = 5;
/** The jolt: whatever wakes a nightmare-ridden sleeper lands twice. */
const NIGHTMARE_WAKE_MULT = 2;

// ── Oasis (Q) ────────────────────────────────────────────────────────────────
const OASIS_MS = 15000;
const OASIS_HEAL = 10;
const OASIS_HEAL_TICK_MS = 1000;
const PORTAL_LIFE_MS = 12000;
const PORTAL_RX = 46;
const PORTAL_RY = 58;
/** How far behind the caster the doorway opens. */
const PORTAL_BACK = 78;
const PORTAL_ENTER_R = 40;
/** How often the waterfall bed is retriggered. Shorter than the sound, so it never gaps. */
const FALLS_LOOP_MS = 1500;

const ARENA_PAD = 32;

// ── Dream Duel (Dream Mastery — passive) ─────────────────────────────────────
export const DUEL_ID = 'dream-duel';
/** How much longer the sleeper stays under because a duel was called on them. */
const DUEL_SLEEP_BONUS_MS = 3000;
/** How far either spirit may get from the body it stepped out of. */
const DUEL_LEASH = 168;
/** Body speed (px/s) below which the caller counts as standing still enough to call one. */
const DUEL_STILL_SPEED = 8;
/** A duel cannot be re-opened straight after the last one ended. */
const DUEL_COOLDOWN_MS = 6000;

const HAUNT_DAMAGE = 5;
const HAUNT_SHOTS = 3;
const HAUNT_GAP_MS = 500;
const HAUNT_SPEED = 560;
const HAUNT_R = 13;
const HAUNT_LIFE_MS = 1600;

const TEAR_DAMAGE = 10;
const TEAR_MOON_DAMAGE = 5;
const TEAR_SPEED = 86;
const TEAR_R = 26;
const TEAR_MOON_R = 11;
const TEAR_ORBIT = 46;
const TEAR_LIFE_MS = 7000;
/** A pierced body cannot be cut by the same tear again inside this window. */
const TEAR_REHIT_MS = 900;

// ── Lifelong Dream (Dream Mastery — bindable) ────────────────────────────────
export const LIFELONG_ID = 'lifelong-dream';
const LIFELONG_COOLDOWN_MS = 40000;
/** How long the wish takes to come true, with nobody interfering. */
const WISH_MS = 10000;
/** How much every hit taken puts back on it. */
const WISH_HIT_PENALTY_MS = 2000;
/** How long the counter flashes red after a hit put time back on it. */
const WISH_JOLT_MS = 420;

// ── World objects ────────────────────────────────────────────────────────────

interface Dreamcatcher {
  owner: Owner;
  x: number; y: number;
  bornAt: number;
  until: number;
  /** Dreams currently held, waiting to be walked over. */
  dreams: number;
  /** Good Dreams (R+): how many of the above came out golden. */
  good: number;
  drainAccum: number;
  /** Who it is currently pulling from, for the thread — recomputed each frame. */
  draining: Fighter | null;
}

/** Knocked Out (Click+): the bob, off its chain and on its way to the cursor. */
interface Thrown {
  owner: Owner;
  x: number; y: number;
  vx: number; vy: number;
  until: number;
  /** 0–1 swing strength at the moment it was released. Scales the damage. */
  heat: number;
  seed: number;
}

/**
 * Pillow Fort (E+). One per side, and the only structure Dream ever builds — a piece of cover
 * that eats what the enemy shoots at it, heals whoever rests inside it, and grows teeth as it
 * is fed more pillows.
 */
interface Fort {
  owner: Owner;
  x: number; y: number;
  r: number;
  hp: number;
  maxHp: number;
  level: number;
  nextRamAt: number;
  /** `scene.time.now` the cannon may next be loaded. */
  cannonReadyAt: number;
  /** True once Space has loaded the cannon and the next click is the shot. */
  cannonArmed: boolean;
  bornAt: number;
}

/** A ram sheep charging out of a level-4 fort. */
interface Ram {
  owner: Owner;
  x: number; y: number;
  /** Where it is currently pointed. Latched so the painter and the sim agree. */
  ang: number;
  until: number;
  /** Bodies it has already hit — a ram is a charge, not a lawnmower. */
  hit: Set<Fighter>;
}

/** A cosmic cannon shell in flight. */
interface Shell {
  owner: Owner;
  x: number; y: number;
  vx: number; vy: number;
  until: number;
  seed: number;
}

/** A knockback in progress, played out as position because velocity is stomped every frame. */
interface Shove {
  target: Fighter;
  vx: number; vy: number;
  until: number;
}

/** One Good Dream buff riding on the Dream player. */
type GoodBuffKind = 'swift' | 'fierce' | 'tough' | 'mending';

interface GoodBuff {
  kind: GoodBuffKind;
  until: number;
}

const GOOD_BUFFS: Record<GoodBuffKind, { emoji: string; name: string; blurb: string }> = {
  swift: { emoji: '💨', name: 'Light Sleeper', blurb: '12% move speed' },
  fierce: { emoji: '🗡️', name: 'Lucid', blurb: '15% more damage dealt' },
  tough: { emoji: '🛡️', name: 'Well Rested', blurb: '15% less damage taken' },
  mending: { emoji: '🌿', name: 'Deep Sleep', blurb: '2 HP a second' },
};

/** Night Terrors (Q+): which of the three a victim is living through, and its aftermath. */
interface Terror {
  victim: Fighter;
  by: Owner;
  kind: 0 | 1 | 2;
  /** `scene.time.now` the cutscene lets them go and the after-effect lands. */
  endsAt: number;
}

// ── Dream Duel ───────────────────────────────────────────────────────────────

/**
 * A duel in progress. There is only ever one, and only ever called by the local player: it is
 * a mastery passive, and a bot has no mastery loadout to switch it on with.
 *
 * Neither fighter is replaced by anything — both keep driving their own bodies, which *are*
 * the spirits for the duration. What is pinned is where each of them stepped out of: the
 * abandoned body stays at `*AnchorX/Y`, the thread is drawn back to it, and neither side may
 * travel further from their own anchor than {@link DUEL_LEASH}.
 */
interface Duel {
  victim: Fighter;
  /** `scene.time.now` the duel ends on its own — tied to the sleep that opened it. */
  until: number;
  myAnchorX: number; myAnchorY: number;
  foeAnchorX: number; foeAnchorY: number;
  /** The caster's own `isInvincible`, so a Stealthy mutation survives the duel. */
  wasInvincible: boolean;
  /** Haunt volleys still paying out, oldest first. */
  volleys: { angle: number; left: number; nextAt: number }[];
}

/** One Haunt bolt in flight. */
interface Bolt {
  x: number; y: number;
  vx: number; vy: number;
  until: number;
  seed: number;
}

/** One Spirit Tear, drifting, with its two moons. */
interface Tear {
  x: number; y: number;
  vx: number; vy: number;
  until: number;
  /** Orbit phase of the leading moon; the trailing one is half a turn behind it. */
  phase: number;
  /** `scene.time.now` each body it has already cut may be cut again. */
  hit: Map<Fighter, number>;
}

// ── Lifelong Dream ───────────────────────────────────────────────────────────

/** The wish that is currently being held, or the one that has already come true. */
interface Wish {
  elementId: string;
  /** `scene.time.now` it lands on. Pushed forward every time the dreamer is hit. */
  dueAt: number;
  /** True once it has landed and the boons are being held. */
  granted: boolean;
  /** `scene.time.now` the counter stops flashing red. */
  joltUntil: number;
  /** Last seen `rawDamageTaken`, for the +2s. Its own tally: the sleep ledger is per-victim. */
  lastRaw: number;
  /** The boons, resolved once at grant so a table edit mid-match cannot half-apply. */
  boons: DreamBoon[];
  /** What was handed over once and has to be handed back — see `undoOneShots`. */
  gaveMaxHp: number;
  /** The caster's own flags before the dream touched them. */
  hadKnockbackImmune: boolean;
  hadUnstoppable: boolean;
  hadLevitating: boolean;
}

/**
 * Everything Dream is doing *to* one fighter. Held per-victim rather than per-caster because
 * sleepiness, sleep and a nightmare all belong to the body they are happening in — in a
 * Dream-versus-Dream match both sides write into the same three records.
 */
interface SleepState {
  drowsy: number;
  /** `scene.time.now` this fighter wakes up on its own. 0 = awake. */
  asleepUntil: number;
  by: Owner;
  nightmareUntil: number;
  nightmareAccum: number;
  nightmareBy: Owner;
  /**
   * Last seen `rawDamageTaken`. Waking is "you were damaged", and this is how that is
   * detected without claiming the fighter's damage callback, which ArenaScene already owns.
   */
  lastRaw: number;
  /**
   * Phobia (F+): how many times each named attack has torn this body out of its sleep. The
   * key is a kit tag for Dream's own damage and the waker's `lastCastAbilityId` for anything
   * else — either way it is "the exact thing that woke them", which is what the fear is of.
   */
  phobia: Map<string, number>;
  /** Night Terrors (Q+): a bleed still running after the horde caught them. */
  bleedUntil: number;
  bleedAccum: number;
  bleedBy: Owner;
  /** Night Terrors (Q+): exhausted after the corridor. */
  exhaustedUntil: number;
}

function makeSleep(): SleepState {
  return {
    drowsy: 0, asleepUntil: 0, by: 'player',
    nightmareUntil: 0, nightmareAccum: 0, nightmareBy: 'player',
    lastRaw: 0, phobia: new Map(),
    bleedUntil: 0, bleedAccum: 0, bleedBy: 'player', exhaustedUntil: 0,
  };
}

// ── Per-side state ───────────────────────────────────────────────────────────

interface Side {
  owner: Owner;

  // ── Trance ──
  tranceOn: boolean;
  /** Radians from straight down, positive toward +x. */
  theta: number;
  omega: number;
  /** Last frame's *hand* position — the pivot the cursor drags around. */
  prevX: number; prevY: number;
  prevVx: number; prevVy: number;
  smoothAx: number; smoothAy: number;
  /**
   * The stored swing, 0–1. The wind no longer *is* the heat — it fills this, and this is what
   * every reader downstream sees. Kept on the Side rather than recomputed so it can survive a
   * moment of bad circling instead of collapsing the instant the cursor wobbles.
   */
  charge: number;
  /** Last frame's cursor bearing from the body, and the smoothed rate it is turning at. */
  curAng: number;
  spin: number;
  /** Where the hand is this frame. Latched so the painter and the sim agree. */
  handX: number; handY: number;
  pendulum: TrancePendulum | null;

  // ── Oasis ──
  portalX: number; portalY: number;
  /** `scene.time.now` the unentered doorway closes on its own. 0 = no portal standing. */
  portalUntil: number;
  portalOpen: number;
  portal: DreamPortal | null;
  /** `scene.time.now` the rest ends. 0 = not inside. */
  oasisUntil: number;
  oasisHealAccum: number;
  /** HP the place has actually given back this stay. Gates the "healed up" early exit. */
  oasisHealed: number;
  /** Eased 0→1 so the oasis opens and collapses instead of blinking. */
  oasisGrow: number;
  oasis: OasisView | null;
  /** What the fighter's own flags were before the oasis took them, to hand back on exit. */
  savedInvincible: boolean;
  savedInvisible: boolean;

  // ── Rest passive ──
  /** Time held still since the last heal tick. Reset to 0 the moment the body moves. */
  restAccum: number;
  /** `scene.time.now` this stillness began. 0 = moving, which is also the HUD's tell. */
  restSince: number;

  // ── Cursor passive ──
  /** Who the cursor is currently resting on — a hit scores on entry, never while inside. */
  cursorInside: Set<Fighter>;
  /** The NPC's stand-in for a mouse: a drifting eye that pokes at whatever it is chasing. */
  ghostX: number; ghostY: number;
  ghostVx: number; ghostVy: number;

  /** NPC pacing, so the AI does not re-place a dreamcatcher the instant one expires. */
  nextCatcherAt: number;

  /** Good Dreams (R+): everything currently riding on this side. */
  buffs: GoodBuff[];
  /** Accumulator for the `mending` buff's per-second tick. */
  mendAccum: number;
}

function makeSide(owner: Owner): Side {
  return {
    owner,
    tranceOn: false,
    theta: 0.0001, omega: 0,
    prevX: 0, prevY: 0, prevVx: 0, prevVy: 0,
    smoothAx: 0, smoothAy: 0,
    charge: 0, curAng: 0, spin: 0, handX: 0, handY: 0,
    pendulum: null,
    portalX: 0, portalY: 0, portalUntil: 0, portalOpen: 0, portal: null,
    oasisUntil: 0, oasisHealAccum: 0, oasisHealed: 0, oasisGrow: 0, oasis: null,
    savedInvincible: false, savedInvisible: false,
    restAccum: 0, restSince: 0,
    cursorInside: new Set(),
    ghostX: 0, ghostY: 0, ghostVx: 0, ghostVy: 0,
    nextCatcherAt: 0,
    buffs: [], mendAccum: 0,
  };
}

// ── Arena API ────────────────────────────────────────────────────────────────

export interface DreamArenaApi {
  get scene(): Phaser.Scene;
  get player(): Fighter;
  get npc(): Fighter;
  /** Everything the player is allowed to hurt — husks in Invasion, the npc in a plain 1v1. */
  get enemies(): Fighter[];
  get eKey(): Phaser.Input.Keyboard.Key;
  get rKey(): Phaser.Input.Keyboard.Key;
  get fKey(): Phaser.Input.Keyboard.Key;
  get qKey(): Phaser.Input.Keyboard.Key;
  /** Pillow Fort (E+): Space loads the cosmic cannon while standing on a level-5 fort. */
  get spaceKey(): Phaser.Input.Keyboard.Key;
  get pointerWasDown(): boolean;
  get elementId(): string;
  get npcElementId(): string;
  get width(): number;
  get height(): number;
  /** Pillow Fort (E+): the fort eats enemy shots, so it has to be able to see them. */
  get projectiles(): Phaser.Physics.Arcade.Group;
  /** Skins: maps a Dream visual colour through that side's equipped skin. */
  dreamColor(owner: Owner, base: number): number;
  spawnHitFlash(x: number, y: number, color: number): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  getNearestEnemy(fromX: number, fromY: number): Fighter;
  buildPlayerContext(x: number, y: number): CastContext;
  setStatusIndicator(id: string, status: CustomStatus | null): void;
  /** Shop upgrades on the local player. */
  hasUpgrade(slot: string): boolean;
  /** Shop upgrades on the online opponent, replayed on this victim-side sim. */
  hasNpcUpgrade(slot: string): boolean;
  get masteryActive(): boolean;
  get npcMasteryActive(): boolean;
  /** Mastery: the enhancement bound over each of the player's slots this match. */
  masteryBindFor(slot: string): string | null;
  recordMasteryStat(key: string, amount: number): void;
  /** Dream Duel swaps the whole tray for the spirit's two keys. */
  setDuelHud(on: boolean): void;
}

// ── DreamKit ─────────────────────────────────────────────────────────────────

export class DreamKit {
  private api: DreamArenaApi;

  // ── Visuals ──
  private readonly pcol: DreamColorFn;
  private readonly ncol: DreamColorFn;
  private readonly pfx: DreamFx;
  private readonly nfx: DreamFx;
  private playerAvatar: DreamAvatar | null = null;
  private npcAvatar: DreamAvatar | null = null;
  /** Under the fighters: dreamcatchers on the floor. */
  private groundGfx: Phaser.GameObjects.Graphics | null = null;
  /** Over them: dream threads and the NPC's phantom cursor. */
  private airGfx: Phaser.GameObjects.Graphics | null = null;
  /** Sleep meters and heart traces, over everything in the world. */
  private overheadGfx: Phaser.GameObjects.Graphics | null = null;
  /** The NPC's dream pocket — its private version of the oasis. */
  private sceneGfx: Phaser.GameObjects.Graphics | null = null;
  /** The cosmic cursor. Above the oasis, because it never stops being yours. */
  private cursorGfx: Phaser.GameObjects.Graphics | null = null;
  private hudGfx: Phaser.GameObjects.Graphics | null = null;
  private hudLabel: Phaser.GameObjects.Text | null = null;
  /** Lifelong Dream's countdown, in world space over the dreamer's head. */
  private wishLabel: Phaser.GameObjects.Text | null = null;
  private cursorHidden = false;
  private vizT = 0;

  // ── Sim ──
  private sides: Record<Owner, Side> = { player: makeSide('player'), npc: makeSide('npc') };
  private sleep = new Map<Fighter, SleepState>();
  private catchers: Dreamcatcher[] = [];
  private thrown: Thrown[] = [];
  private forts: Fort[] = [];
  private rams: Ram[] = [];
  private shells: Shell[] = [];
  private shoves: Shove[] = [];
  private terrors: Terror[] = [];
  /**
   * Phobia (F+): the tag the kit is currently dealing damage under, so a hit from the pillow
   * is remembered as "the pillow" rather than as whatever the caster last pressed. Set around
   * every kit damage call and cleared straight afterwards.
   */
  private attackTag: string | null = null;
  /** This kit's current share of each fighter's shared `outgoingDamageMult`. */
  private outApplied = new Map<Fighter, number>();
  /**
   * Drowsiness handed out this frame, so a target being swung at gains instead of decaying.
   * Rebuilt every frame — a target that drops out of every field simply stops appearing.
   */
  private gained = new Map<Fighter, number>();
  private lastAimX = 0;
  private lastAimY = 0;
  /** Time since the waterfall bed was last retriggered, while the player is resting. */
  private fallsAccum = 0;
  /** Latched swing strength per side, for the HUD and the avatar. */
  private swing: Record<Owner, number> = { player: 0, npc: 0 };

  // ── Mastery ──
  /** Dream Duel: the duel in progress, or null. Only ever one, and only ever the player's. */
  private duel: Duel | null = null;
  /** `scene.time.now` a new duel may be called. Init to `-COOLDOWN` — see `reset()`. */
  private duelReadyAt = -DUEL_COOLDOWN_MS;
  /** Latched so the tray is only swapped when the duel actually starts or ends. */
  private duelHudOn = false;
  private bolts: Bolt[] = [];
  private tears: Tear[] = [];
  /** Lifelong Dream: the element picker overlay, built lazily on the first press. */
  private picker: DreamElementPicker | null = null;
  /** What the picker took from the player while it was open, to hand back on close. */
  private pickerWasInvincible = false;
  private wish: Wish | null = null;
  private lifelongAt = -LIFELONG_COOLDOWN_MS;
  /** Accumulators for the boons that pay out per second. */
  private boonRegenAccum = 0;
  private boonContactAccum = 0;
  /** Damage tallies the boons watch: the enemy's, for lifesteal, and ours, for thorns. */
  private boonFoeRaw = new Map<Fighter, number>();
  private boonSelfRaw = 0;
  /** Everything the boons have written onto the caster, so `reset()` hands all of it back. */
  private boonTouched = false;
  /** Once-per-match stats, so a single long fight cannot farm them. */
  private masteryStatsSeeded = false;
  /** Last frame's Space state — see the rising-edge note in `handleInput`. */
  private prevSpaceDown = false;
  /** The exact `healStopUntil` the duel last wrote, so only its own block is ever lifted. */
  private duelHealStop = 0;

  constructor(api: DreamArenaApi) {
    this.api = api;
    this.pcol = (base) => api.dreamColor('player', base);
    this.ncol = (base) => api.dreamColor('npc', base);
    this.pfx = new DreamFx(api.scene, this.pcol);
    this.nfx = new DreamFx(api.scene, this.ncol);
    // Leaving the arena with the system cursor still hidden would follow the player all the
    // way back to the menu, so the scene's own teardown hands it back.
    api.scene.events.on('shutdown', () => this.releaseCursor());
  }

  // ── Small helpers ──────────────────────────────────────────────────────────

  private get now(): number { return this.api.scene.time.now; }
  private side(owner: Owner): Side { return this.sides[owner]; }
  private fighter(owner: Owner): Fighter { return owner === 'player' ? this.api.player : this.api.npc; }
  private fx(owner: Owner): DreamFx { return owner === 'player' ? this.pfx : this.nfx; }
  private col(owner: Owner): DreamColorFn { return owner === 'player' ? this.pcol : this.ncol; }
  private body(f: Fighter): Phaser.Physics.Arcade.Body { return f.body as Phaser.Physics.Arcade.Body; }
  private isDream(owner: Owner): boolean {
    return owner === 'player' ? this.api.elementId === 'dream' : this.api.npcElementId === 'dream';
  }

  /** Shop upgrades, for whichever side is asking. */
  private up(owner: Owner, slot: string): boolean {
    return owner === 'player' ? this.api.hasUpgrade(slot) : this.api.hasNpcUpgrade(slot);
  }

  private hex(color: number): string {
    return `#${color.toString(16).padStart(6, '0')}`;
  }

  private alive(f: Fighter | null | undefined): boolean {
    return !!f && f.active && f.hp > 0;
  }

  private fortOf(owner: Owner): Fort | null {
    return this.forts.find((x) => x.owner === owner) ?? null;
  }

  /**
   * Damage dealt by the kit, tagged so Phobia can remember what it was. Every one of Dream's
   * own damage sources goes through here rather than calling `takeDamage` directly — that is
   * what makes "the exact attack that woke them" a real answer and not a guess.
   */
  private strike(t: Fighter, amount: number, tag: string): void {
    this.attackTag = tag;
    t.takeDamage(amount);
    this.attackTag = null;
  }

  /** The name the phobia ledger files a wake-up under. */
  private wakerTag(st: SleepState): string {
    if (this.attackTag) return this.attackTag;
    const caster = this.fighter(st.by);
    return caster?.lastCastAbilityId ?? 'something';
  }

  /** A readable name for a phobia tag, for the pop-up and the tray. */
  private tagLabel(tag: string): string {
    const kit: Record<string, string> = {
      'dream:pillow': 'the pillow',
      'dream:cursor': 'the cursor',
      'dream:pendulum': 'the pendulum',
      'dream:cannon': 'the cannon',
      'dream:ram': 'the rams',
      'dream:nightmare': 'the nightmare',
    };
    return kit[tag] ?? tag.replace(/^[a-z]+-/, '').replace(/-/g, ' ');
  }

  private get left(): number { return ARENA_PAD; }
  private get right(): number { return this.api.width - ARENA_PAD; }
  private get top(): number { return ARENA_PAD; }
  private get bottom(): number { return this.api.height - ARENA_PAD; }

  /** Everything this side is allowed to hurt. */
  private targetsOf(owner: Owner): Fighter[] {
    const list = owner === 'player' ? this.api.enemies : [this.api.player];
    return list.filter((f) => f && f.active && f.hp > 0);
  }

  private state(f: Fighter): SleepState {
    let st = this.sleep.get(f);
    if (!st) {
      st = makeSleep();
      // Seed from the fighter's running tally, or every existing point of damage would
      // read as one enormous hit on the first frame it is tracked.
      st.lastRaw = f.rawDamageTaken;
      this.sleep.set(f, st);
    }
    return st;
  }

  private avatar(owner: Owner): DreamAvatar | null {
    return owner === 'player' ? this.playerAvatar : this.npcAvatar;
  }

  /** Where this side is pointing. The npc's phantom eye stands in for a mouse. */
  private aimXFor(owner: Owner): number {
    if (owner === 'player') return this.lastAimX || this.api.player.x + 1;
    const s = this.sides.npc;
    return s.ghostX || this.api.player.x;
  }

  private aimYFor(owner: Owner): number {
    if (owner === 'player') return this.lastAimY || this.api.player.y;
    const s = this.sides.npc;
    return s.ghostY || this.api.player.y;
  }

  /**
   * The pendulum hangs off the caster's hand, and the hand is held out toward the cursor —
   * which is the whole of the Trance rework: circling the cursor circles the pivot, and a
   * circling pivot is what drives the bob.
   */
  private anchorOf(owner: Owner): { x: number; y: number } {
    const f = this.fighter(owner);
    if (!f) return { x: 0, y: 0 };
    const ang = Math.atan2(this.aimYFor(owner) - f.y, this.aimXFor(owner) - f.x);
    return { x: f.x + Math.cos(ang) * HAND_R, y: f.y + 4 + Math.sin(ang) * HAND_R * 0.8 };
  }

  /** Inside your own fort — the test for resting in it, and for reaching its cannon. */
  private standingOnFort(f: Fighter, fort: Fort): boolean {
    return this.alive(f) && Phaser.Math.Distance.Between(f.x, f.y, fort.x, fort.y) <= fort.r;
  }

  private releaseCursor(): void {
    if (!this.cursorHidden) return;
    this.cursorHidden = false;
    this.api.scene.input.setDefaultCursor('default');
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  reset(): void {
    // Before the state is thrown away: everything the mastery parked on a Fighter has to be
    // handed back, or the next element picked would walk out wearing somebody else's dream.
    this.endDuel('reset');
    this.undoBoons();
    this.picker?.destroy();
    this.picker = null;
    this.wish = null;
    this.bolts = [];
    this.tears = [];
    // `scene.time.now` does not restart between matches and readiness is absolute, so a plain 0
    // here would lock both of these for their whole cooldown at the start of the first match.
    this.duelReadyAt = -DUEL_COOLDOWN_MS;
    this.lifelongAt = -LIFELONG_COOLDOWN_MS;
    this.duelHudOn = false;
    this.boonRegenAccum = 0;
    this.boonContactAccum = 0;
    this.boonFoeRaw.clear();
    this.boonSelfRaw = 0;
    this.masteryStatsSeeded = false;
    this.prevSpaceDown = false;
    this.duelHealStop = 0;

    for (const owner of ['player', 'npc'] as Owner[]) {
      const s = this.sides[owner];
      s.pendulum?.destroy();
      s.portal?.destroy();
      s.oasis?.destroy();
    }
    this.sides = { player: makeSide('player'), npc: makeSide('npc') };
    this.sleep.clear();
    this.gained.clear();
    this.catchers = [];
    this.thrown = [];
    this.forts = [];
    this.rams = [];
    this.shells = [];
    this.shoves = [];
    this.terrors = [];
    this.attackTag = null;
    this.swing = { player: 0, npc: 0 };
    this.vizT = 0;
    this.fallsAccum = 0;

    this.playerAvatar?.destroy(); this.playerAvatar = null;
    this.npcAvatar?.destroy(); this.npcAvatar = null;
    this.groundGfx?.destroy(); this.groundGfx = null;
    this.airGfx?.destroy(); this.airGfx = null;
    this.overheadGfx?.destroy(); this.overheadGfx = null;
    this.sceneGfx?.destroy(); this.sceneGfx = null;
    this.cursorGfx?.destroy(); this.cursorGfx = null;
    this.hudGfx?.destroy(); this.hudGfx = null;
    this.hudLabel?.destroy(); this.hudLabel = null;
    this.wishLabel?.destroy(); this.wishLabel = null;
    this.releaseCursor();

    // Anything the oasis was holding on a fighter has to be handed back, or a Dream match
    // would leave the next element permanently invincible.
    for (const f of [this.api.player, this.api.npc]) {
      if (!f) continue;
      f.isInvincible = false;
      f.forceInvisible = false;
      // Phobia parks a multiplier on the Fighter; hand it back or the next match starts with
      // somebody permanently terrified.
      f.dreamIncomingMult = 1;
      // Lucid and the corridor's exhaustion both ride the shared outgoing multiplier, so
      // whatever this kit put on it is divided back out rather than stomped to 1.
      this.applyOutgoing(f, 1);
    }
    this.outApplied.clear();
  }

  /**
   * Write this kit's share of the *shared* outgoing-damage multiplier, dividing out whatever
   * it wrote last. Lust and the gauntlet cards live on the same field, so a flat assignment
   * here would quietly delete theirs.
   */
  private applyOutgoing(f: Fighter, mult: number): void {
    const prev = this.outApplied.get(f) ?? 1;
    if (Math.abs(prev - mult) < 1e-6) return;
    f.outgoingDamageMult = (f.outgoingDamageMult / prev) * mult;
    if (Math.abs(mult - 1) < 1e-6) this.outApplied.delete(f);
    else this.outApplied.set(f, mult);
  }

  // ── Mastery helpers ────────────────────────────────────────────────────────

  /** Whether Element Mastery is on for the local Dream player. */
  private get mastered(): boolean {
    return this.api.elementId === 'dream' && this.api.masteryActive;
  }

  /** Which slot Lifelong Dream was dropped on, or null. */
  private lifelongSlot(): 'e' | 'r' | 'f' | 'q' | null {
    if (!this.mastered) return null;
    for (const s of ['e', 'r', 'f', 'q'] as const) {
      if (this.api.masteryBindFor(s) === LIFELONG_ID) return s;
    }
    return null;
  }

  /** The player's key for a bound slot. */
  private keyFor(slot: 'e' | 'r' | 'f' | 'q'): Phaser.Input.Keyboard.Key {
    return slot === 'e' ? this.api.eKey
      : slot === 'r' ? this.api.rKey
      : slot === 'f' ? this.api.fKey : this.api.qKey;
  }

  /** Only ever recorded for the player: the grind is the human's, not the bot's. */
  private record(owner: Owner, key: string, amount = 1): void {
    if (owner === 'player') this.api.recordMasteryStat(key, amount);
  }

  // ── Input ──────────────────────────────────────────────────────────────────

  handleInput(time: number, pointer: Phaser.Input.Pointer, mouseX: number, mouseY: number): void {
    if (this.api.elementId !== 'dream') return;
    // Tracked before every early-out: the cursor is a passive, and a passive that switches
    // off because you are busy is not a passive.
    this.lastAimX = mouseX;
    this.lastAimY = mouseY;

    const s = this.sides.player;
    const p = this.api.player;
    // Space is read as a **rising edge on `isDown`**, never with `JustDown`.
    //
    // `JustDown` consumes the flag, and ArenaScene's dodge block — which runs after this — asks
    // the same question of the same key. Reading it here with `JustDown` would silently delete
    // the roll for every Dream player on every frame this method runs. `suppressesDodge()` is
    // what stops a press being both things; this is what stops it being neither.
    const spaceDown = this.api.spaceKey.isDown;
    const spacePressed = spaceDown && !this.prevSpaceDown;
    this.prevSpaceDown = spaceDown;

    // The picker owns the keyboard while it is up: every letter belongs to the search box.
    if (this.picker?.isOpen()) return;
    // Asleep or resting — either way the controls are not yours.
    if (s.oasisUntil > time) return;
    if (this.isAsleep(p)) return;

    const ctx = this.api.buildPlayerContext(mouseX, mouseY);
    const clicked = pointer.isDown && !this.api.pointerWasDown;

    // ── Dream Duel: the spirit's own two keys, and nothing else ──
    if (this.duel) {
      if (clicked) p.castAbility('dream-haunt', ctx);
      if (Phaser.Input.Keyboard.JustDown(this.api.eKey)) p.castAbility('dream-spirit-tear', ctx);
      return;
    }
    if (spacePressed && this.canCallDuel()) {
      this.beginDuel();
      return;
    }

    // ── Lifelong Dream, on whichever key it was bound to ──
    const lifelong = this.lifelongSlot();
    if (lifelong && Phaser.Input.Keyboard.JustDown(this.keyFor(lifelong))) {
      this.openLifelongPicker();
      return;
    }

    // ── The cosmic cannon (E+, level 5) ──
    // Space loads it, and the load has to be consumed here rather than in `doTrance`, because
    // a loaded click is not a Trance toggle at all — it is the shot.
    const fort = this.fortOf('player');
    if (fort && fort.level >= FORT_MAX_LEVEL && this.standingOnFort(p, fort) && spacePressed) {
      this.loadCannon(fort);
    }
    if (clicked && fort?.cannonArmed) {
      this.fireCannon(fort, mouseX, mouseY);
      return;
    }

    if (clicked) p.castAbility('dream-trance', ctx);
    if (lifelong !== 'e' && Phaser.Input.Keyboard.JustDown(this.api.eKey)) p.castAbility('dream-pillow-fight', ctx);
    if (lifelong !== 'r' && Phaser.Input.Keyboard.JustDown(this.api.rKey)) p.castAbility('dream-dreamcatcher', ctx);
    if (lifelong !== 'f' && Phaser.Input.Keyboard.JustDown(this.api.fKey)) p.castAbility('dream-nightmare', ctx);
    if (lifelong !== 'q' && Phaser.Input.Keyboard.JustDown(this.api.qKey)) p.castAbility('dream-oasis', ctx);
  }

  // ── Dream Duel (Dream Mastery — passive) ───────────────────────────────────

  /**
   * The three conditions, checked together: mastery on, feet planted, and somebody of yours
   * asleep within reach. Side-effect free — the HUD prompt asks the same question every frame.
   */
  private duelCandidate(): Fighter | null {
    if (!this.mastered || this.duel) return null;
    const p = this.api.player;
    if (!this.alive(p)) return null;
    const b = this.body(p);
    if (b && Math.hypot(b.velocity.x, b.velocity.y) > DUEL_STILL_SPEED) return null;
    let best: Fighter | null = null;
    let bestD = Infinity;
    for (const t of this.targetsOf('player')) {
      if (!this.isAsleep(t)) continue;
      const d = Phaser.Math.Distance.Between(p.x, p.y, t.x, t.y);
      if (d < bestD) { bestD = d; best = t; }
    }
    return best;
  }

  private canCallDuel(): boolean {
    return this.now >= this.duelReadyAt && !!this.duelCandidate();
  }

  private beginDuel(): void {
    const victim = this.duelCandidate();
    if (!victim) return;
    const p = this.api.player;
    const st = this.state(victim);
    // The duel does not merely happen during their nap — it lengthens it, and the duel runs
    // exactly as long as the sleep it is riding.
    st.asleepUntil = Math.max(st.asleepUntil, this.now) + DUEL_SLEEP_BONUS_MS;

    this.duel = {
      victim,
      until: st.asleepUntil,
      myAnchorX: p.x, myAnchorY: p.y,
      foeAnchorX: victim.x, foeAnchorY: victim.y,
      wasInvincible: p.isInvincible,
      volleys: [],
    };
    // Both keys come back the instant the duel opens: they are not the keys you were holding.
    p.resetCooldown('dream-haunt');
    p.resetCooldown('dream-spirit-tear');

    this.pfx.tear(p.x, p.y, 34, 44, false);
    this.pfx.tear(victim.x, victim.y, 34, 44, false);
    this.pfx.ring(p.x, p.y, 12, DUEL_LEASH, DRM.spirit, 700, 5, 8);
    Sfx.playAt('ghost-wail', p.x, { rate: 0.85, volume: 0.9 });
    this.api.showFloatingText(p.x, p.y - 56, '👻 DREAM DUEL', '#e4f1ff');
  }

  /** The single unwind path — a finished duel, a death, and `reset()` all come through here. */
  private endDuel(why: 'over' | 'reset'): void {
    const d = this.duel;
    if (!d) return;
    this.duel = null;
    this.bolts = [];
    this.tears = [];
    this.duelReadyAt = this.now + DUEL_COOLDOWN_MS;
    const p = this.api.player;
    if (p) {
      p.isInvincible = d.wasInvincible;
      // The heal block is a wall-clock stamp; letting it simply expire would leave a fraction
      // of a second of dead healing after the spirit is back in. Only lifted if the value on
      // the fighter is still the one *we* wrote — a Cursed mutation's own block outranks this.
      if (p.healStopUntil === this.duelHealStop) p.healStopUntil = 0;
    }
    if (why === 'reset') return;
    if (p && this.alive(p)) {
      this.pfx.tear(p.x, p.y, 34, 44, true);
      this.pfx.stardust(p.x, p.y, 12, 34, 800, 7);
      this.api.showFloatingText(p.x, p.y - 48, '🫥 BACK IN THE BODY', '#d8e2ff');
    }
  }

  /**
   * The duel's upkeep. Both bodies are still driven by their owners — what is enforced here is
   * the leash, the invulnerability, the ban on healing, and the fact that the other side cannot
   * cast anything at all.
   */
  private updateDuel(time: number, delta: number): void {
    const d = this.duel;
    if (!d) {
      if (this.duelHudOn) { this.duelHudOn = false; this.api.setDuelHud(false); }
      return;
    }
    const p = this.api.player;
    const v = d.victim;
    if (!this.alive(p) || !this.alive(v) || time >= d.until || !this.isAsleep(v)) {
      this.endDuel('over');
      if (this.duelHudOn) { this.duelHudOn = false; this.api.setDuelHud(false); }
      return;
    }
    if (!this.duelHudOn) { this.duelHudOn = true; this.api.setDuelHud(true); }

    // Nothing reaches a body nobody is standing in…
    p.isInvincible = true;
    // …and a spirit is not resting, so nothing heals it either. Never shortened: a longer
    // block somebody else is holding stays theirs.
    const stop = Date.now() + 400;
    if (stop > p.healStopUntil) { p.healStopUntil = stop; this.duelHealStop = stop; }
    // They have nothing to attack *with*. Refreshed rather than set long, so the disarm ends
    // with the duel instead of outliving it.
    v.applyDisarm(200);

    this.leash(p, d.myAnchorX, d.myAnchorY);
    this.leash(v, d.foeAnchorX, d.foeAnchorY);

    // The staggered half-second between Haunt's three bolts.
    for (let i = d.volleys.length - 1; i >= 0; i--) {
      const vol = d.volleys[i];
      if (time < vol.nextAt) continue;
      this.fireHaunt(vol.angle);
      vol.left--;
      vol.nextAt = time + HAUNT_GAP_MS;
      if (vol.left <= 0) d.volleys.splice(i, 1);
    }

    this.updateBolts(delta);
    this.updateTears(delta);
  }

  /** Hold a body inside the circle its own spirit may not leave. */
  private leash(f: Fighter, ax: number, ay: number): void {
    const d = Phaser.Math.Distance.Between(f.x, f.y, ax, ay);
    if (d <= DUEL_LEASH) return;
    const ang = Math.atan2(f.y - ay, f.x - ax);
    f.setPosition(ax + Math.cos(ang) * DUEL_LEASH, ay + Math.sin(ang) * DUEL_LEASH);
    const b = this.body(f);
    if (b) b.reset(f.x, f.y);
  }

  /** Click, in a duel. Three bolts, half a second apart — this only queues the volley. */
  doHaunt(tx: number, ty: number): void {
    const d = this.duel;
    if (!d) return;
    const p = this.api.player;
    d.volleys.push({
      angle: Math.atan2(ty - p.y, tx - p.x),
      left: HAUNT_SHOTS,
      nextAt: this.now,
    });
    this.playerAvatar?.play('punch', Math.atan2(ty - p.y, tx - p.x));
  }

  private fireHaunt(angle: number): void {
    const p = this.api.player;
    if (!this.alive(p)) return;
    this.bolts.push({
      x: p.x + Math.cos(angle) * 22,
      y: p.y + Math.sin(angle) * 22,
      vx: Math.cos(angle) * HAUNT_SPEED,
      vy: Math.sin(angle) * HAUNT_SPEED,
      until: this.now + HAUNT_LIFE_MS,
      seed: Math.random() * 999,
    });
    this.pfx.stardust(p.x + Math.cos(angle) * 24, p.y + Math.sin(angle) * 24, 3, 12, 340, 7);
    Sfx.playAt('ghost-wail', p.x, { rate: 1.4, volume: 0.45 });
  }

  private updateBolts(delta: number): void {
    const dt = Math.min(0.05, delta / 1000);
    for (let i = this.bolts.length - 1; i >= 0; i--) {
      const b = this.bolts[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      const out = b.x < this.left - 20 || b.x > this.right + 20
        || b.y < this.top - 20 || b.y > this.bottom + 20;
      if (this.now >= b.until || out) { this.bolts.splice(i, 1); continue; }

      const victim = this.targetsOf('player')
        .find((t) => Phaser.Math.Distance.Between(b.x, b.y, t.x, t.y) <= HAUNT_R + 12);
      if (!victim) continue;
      this.strike(victim, HAUNT_DAMAGE, 'dream:haunt');
      // Deliberately *not* `syncDamage`: the whole duel is riding on the victim staying
      // asleep, and this is the one damage source that must not be an alarm clock.
      this.state(victim).lastRaw = victim.rawDamageTaken;
      this.api.spawnHitFlash(victim.x, victim.y, DRM.haunt);
      this.pfx.ring(victim.x, victim.y, 6, 34, DRM.haunt, 320, 3, 7);
      this.api.showFloatingText(victim.x, victim.y - 40, `🩸 ${HAUNT_DAMAGE}`, '#ff8899');
      this.bolts.splice(i, 1);
    }
  }

  /** E, in a duel. One enormous slow tear, with two smaller ones going round it. */
  doSpiritTear(tx: number, ty: number): void {
    if (!this.duel) return;
    const p = this.api.player;
    const ang = Math.atan2(ty - p.y, tx - p.x);
    this.tears.push({
      x: p.x + Math.cos(ang) * 26,
      y: p.y + Math.sin(ang) * 26,
      vx: Math.cos(ang) * TEAR_SPEED,
      vy: Math.sin(ang) * TEAR_SPEED,
      until: this.now + TEAR_LIFE_MS,
      phase: 0,
      hit: new Map(),
    });
    this.playerAvatar?.play('raise');
    this.pfx.ring(p.x, p.y, 10, 70, DRM.spirit, 520, 5, 7);
    Sfx.playAt('beam-charge', p.x, { rate: 0.55, volume: 0.8 });
    this.api.showFloatingText(p.x, p.y - 48, '🕳️ SPIRIT TEAR', '#e4f1ff');
  }

  private updateTears(delta: number): void {
    const dt = Math.min(0.05, delta / 1000);
    for (let i = this.tears.length - 1; i >= 0; i--) {
      const t = this.tears[i];
      t.x += t.vx * dt;
      t.y += t.vy * dt;
      t.phase += dt * 2.4;
      const out = t.x < this.left - 40 || t.x > this.right + 40
        || t.y < this.top - 40 || t.y > this.bottom + 40;
      if (this.now >= t.until || out) { this.tears.splice(i, 1); continue; }

      // The head pierces, so it is a repeated hit on a timer rather than a one-shot removal.
      for (const f of this.targetsOf('player')) {
        const ready = (t.hit.get(f) ?? 0) <= this.now;
        const onHead = Phaser.Math.Distance.Between(t.x, t.y, f.x, f.y) <= TEAR_R + 12;
        const onMoon = this.moonPositions(t)
          .some((m) => Phaser.Math.Distance.Between(m.x, m.y, f.x, f.y) <= TEAR_MOON_R + 10);
        if (!ready || (!onHead && !onMoon)) continue;
        const dmg = onHead ? TEAR_DAMAGE : TEAR_MOON_DAMAGE;
        t.hit.set(f, this.now + TEAR_REHIT_MS);
        this.strike(f, dmg, 'dream:spirit-tear');
        this.state(f).lastRaw = f.rawDamageTaken;
        this.api.spawnHitFlash(f.x, f.y, DRM.spirit);
        this.pfx.stardust(f.x, f.y, 5, 20, 460, 7);
        this.api.showFloatingText(f.x, f.y - 42, `${onHead ? '🕳️' : '🌙'} ${dmg}`, '#e4f1ff');
      }
    }
  }

  /** Where a tear's two moons are this frame — half a turn apart, on the same ring. */
  private moonPositions(t: Tear): { x: number; y: number }[] {
    return [0, Math.PI].map((off) => ({
      x: t.x + Math.cos(t.phase + off) * TEAR_ORBIT,
      y: t.y + Math.sin(t.phase + off) * TEAR_ORBIT * 0.62,
    }));
  }

  // ── Lifelong Dream (Dream Mastery — bindable) ──────────────────────────────

  private openLifelongPicker(): void {
    if (this.wish) {
      this.api.showFloatingText(this.api.player.x, this.api.player.y - 40,
        this.wish.granted ? 'The dream already came true' : 'Already dreaming', '#6b6b88');
      return;
    }
    if (this.now < this.lifelongAt + LIFELONG_COOLDOWN_MS) return;
    this.lifelongAt = this.now;
    if (!this.picker) {
      this.picker = new DreamElementPicker(this.api.scene, this.pcol, (id) => this.beginWish(id));
    }
    // Standing in a menu in the middle of a fight would otherwise simply be a death sentence,
    // and the choice is the ability. Latched so a Stealthy mutation survives the menu.
    this.pickerWasInvincible = this.api.player.isInvincible;
    this.api.player.isInvincible = true;
    this.picker.show();
  }

  private beginWish(elementId: string): void {
    const p = this.api.player;
    p.isInvincible = this.pickerWasInvincible;
    const def = findElementDef(elementId);
    this.wish = {
      elementId,
      dueAt: this.now + WISH_MS,
      granted: false,
      joltUntil: 0,
      lastRaw: p.rawDamageTaken,
      boons: [],
      gaveMaxHp: 0,
      hadKnockbackImmune: p.knockbackImmune,
      hadUnstoppable: p.unstoppable,
      hadLevitating: p.levitating,
    };
    this.pfx.ring(p.x, p.y, 10, 90, DRM.wish, 620, 5, 8);
    this.pfx.stardust(p.x, p.y, 14, 40, 900, 7);
    this.api.showFloatingText(p.x, p.y - 56,
      `🌠 DREAMING OF ${(def?.name ?? elementId).toUpperCase()}`, '#ffd98a');
  }

  /** The counter, the +2s, and the moment it lands. */
  private updateWish(time: number, delta: number): void {
    this.picker?.update(delta);
    const w = this.wish;
    if (!w) return;
    const p = this.api.player;
    if (!this.alive(p)) return;

    if (!w.granted) {
      // Every hit puts two seconds back on. Read off the fighter's own running tally rather
      // than claiming its damage callback, which ArenaScene already owns.
      if (p.rawDamageTaken > w.lastRaw + 0.5) {
        w.dueAt += WISH_HIT_PENALTY_MS;
        w.joltUntil = time + WISH_JOLT_MS;
        this.pfx.ring(p.x, p.y, 8, 46, DRM.dread, 380, 3, 16);
        this.api.showFloatingText(p.x, p.y - 68, '⏳ +2s', '#ff3b6b');
      }
      w.lastRaw = p.rawDamageTaken;
      if (time >= w.dueAt) this.grantWish(w);
      return;
    }

    this.holdBoons(w, delta);
  }

  private grantWish(w: Wish): void {
    const p = this.api.player;
    w.granted = true;
    w.boons = dreamBoons(w.elementId);
    const def = findElementDef(w.elementId);

    // The one-shots, paid here and only here.
    for (const b of w.boons) {
      if (b.maxHp) {
        p.increaseMaxHp(b.maxHp);
        p.heal(b.maxHp);
        w.gaveMaxHp += b.maxHp;
      }
      if (b.shield) p.shieldHp += b.shield;
      if (b.charges) p.shieldCharges += b.charges;
    }
    this.boonTouched = true;

    this.pfx.ring(p.x, p.y, 12, 170, DRM.wish, 900, 7, 16);
    this.pfx.stardust(p.x, p.y, 24, 70, 1400, 16);
    Sfx.playAt('ui-purchase', p.x, { rate: 0.7, volume: 1 });
    this.api.showFloatingText(p.x, p.y - 60,
      `✨ ${(def?.name ?? w.elementId).toUpperCase()} — THE DREAM COMES TRUE`, '#ffd98a');
    // Named one at a time so the player can read what they were actually given.
    w.boons.forEach((b, i) => {
      this.api.scene.time.delayedCall(220 * (i + 1), () => {
        if (!this.alive(p) || this.wish !== w) return;
        this.api.showFloatingText(p.x, p.y - 44 - i * 4, `${b.emoji} ${b.name.toUpperCase()}`, '#ffe9a8');
      });
    });
  }

  /**
   * Everything a granted dream writes onto the body, rewritten from scratch every frame.
   *
   * The three multipliers it shares with other systems (`dreamIncomingMult`, the outgoing
   * multiplier and the speed aggregate) are folded in where those are already resolved, so this
   * only has to hold the fields nobody else is holding — plus the two that pay out per second.
   */
  private holdBoons(w: Wish, delta: number): void {
    const p = this.api.player;
    let cooldown = 1, size = 1, flat = 0, cap = 0, floor = 0;
    let dodge = 0, crit = 0, critMult = 0, regen = 0, contact = 0, lifesteal = 0, thorns = 0;
    let knockback = false, unstoppable = false, levitate = false, cleanse = false, phase = false;
    for (const b of w.boons) {
      if (b.cooldown) cooldown *= b.cooldown;
      if (b.size) size *= b.size;
      flat = Math.max(flat, b.flatCut ?? 0);
      cap = cap && b.cap ? Math.min(cap, b.cap) : Math.max(cap, b.cap ?? 0);
      floor = Math.max(floor, b.floor ?? 0);
      dodge += b.dodge ?? 0;
      crit += b.crit ?? 0;
      critMult = Math.max(critMult, b.critMult ?? 0);
      regen += b.regen ?? 0;
      contact += b.contact ?? 0;
      lifesteal += b.lifesteal ?? 0;
      thorns += b.thorns ?? 0;
      knockback ||= !!b.knockbackImmune;
      unstoppable ||= !!b.unstoppable;
      levitate ||= !!b.levitate;
      cleanse ||= !!b.cleanse;
      phase ||= !!b.phase;
    }

    p.dreamCooldownMult = cooldown;
    if (Math.abs(p.dreamSizeMult - size) > 1e-4) {
      p.dreamSizeMult = size;
      p.applySizeMult();
    }
    p.flatDamageReduction = Math.max(p.flatDamageReduction, flat);
    if (cap > 0) p.hardDamageCap = p.hardDamageCap > 0 ? Math.min(p.hardDamageCap, cap) : cap;
    if (floor > 0) p.minHpFloor = Math.max(p.minHpFloor, floor);
    // Re-asserted as a floor rather than added, so spending a dodge never empties the pool.
    if (dodge > 0) p.dodgeChance = Math.max(p.dodgeChance, dodge);
    if (crit > 0) p.critChance = Math.max(p.critChance, crit);
    if (critMult > 0) p.critMult = Math.max(p.critMult, critMult);
    if (knockback) p.knockbackImmune = true;
    if (unstoppable) p.unstoppable = true;
    if (levitate) p.levitating = true;
    if (phase) p.projectilePhase = true;
    if (cleanse) {
      // Nothing sticks: every tick in the game is scrubbed off as it lands.
      p.burningUntil = 0;
      p.moltenUntil = 0;
      p.toxicUntil = 0;
      p.oilyBurnUntil = 0;
      p.lavaRockBurnUntil = 0;
      p.bleedingUntil = 0;
      p.bleeding = false;
      p.sicknessUntil = 0;
      p.frostStacks = 0;
      p.frostStackTimers = [];
      p.voidFrostStacks = 0;
      p.voidFrostStackTimers = [];
    }

    if (regen > 0) {
      this.boonRegenAccum += delta;
      while (this.boonRegenAccum >= 1000) {
        this.boonRegenAccum -= 1000;
        const before = p.hp;
        p.heal(regen);
        const got = Math.round(p.hp - before);
        if (got > 0) this.api.showFloatingText(p.x, p.y - 28, `🌠 +${got}`, '#ffd98a');
      }
    }

    if (contact > 0) {
      this.boonContactAccum += delta;
      while (this.boonContactAccum >= 500) {
        this.boonContactAccum -= 500;
        for (const t of this.targetsOf('player')) {
          if (Phaser.Math.Distance.Between(p.x, p.y, t.x, t.y) > 46) continue;
          this.strike(t, Math.round(contact / 2), 'dream:lifelong');
          this.api.spawnHitFlash(t.x, t.y, DRM.wish);
        }
      }
    }

    // Lifesteal is read off what has actually landed on the people you are fighting, which is
    // the only tally the kit can honestly see without owning every damage path in the game.
    if (lifesteal > 0) {
      for (const t of this.targetsOf('player')) {
        const seen = this.boonFoeRaw.get(t);
        if (seen === undefined) { this.boonFoeRaw.set(t, t.rawDamageTaken); continue; }
        const dealt = t.rawDamageTaken - seen;
        this.boonFoeRaw.set(t, t.rawDamageTaken);
        if (dealt <= 0.5) continue;
        const back = Math.round(dealt * lifesteal);
        if (back > 0) p.heal(back);
      }
    }

    if (thorns > 0) {
      if (this.boonSelfRaw === 0) this.boonSelfRaw = p.rawDamageTaken;
      const took = p.rawDamageTaken - this.boonSelfRaw;
      this.boonSelfRaw = p.rawDamageTaken;
      if (took > 0.5) {
        const back = Math.round(took * thorns);
        const near = this.api.getNearestEnemy(p.x, p.y);
        if (back > 0 && this.alive(near) && this.targetsOf('player').includes(near)) {
          this.strike(near, back, 'dream:lifelong');
          this.api.spawnHitFlash(near.x, near.y, DRM.wish);
          this.api.showFloatingText(near.x, near.y - 40, `🌠 ${back}`, '#ffd98a');
        }
      }
    }
  }

  /** The share of the three shared multipliers a granted dream is holding. */
  private boonTotals(): { damage: number; armor: number; speed: number } {
    const w = this.wish;
    if (!w || !w.granted) return { damage: 1, armor: 1, speed: 1 };
    let damage = 1, armor = 1, speed = 1;
    for (const b of w.boons) {
      if (b.damage) damage *= b.damage;
      if (b.armor) armor *= b.armor;
      if (b.speed) speed *= b.speed;
    }
    return { damage, armor, speed };
  }

  /** Hand back everything a dream parked on the caster. Safe to call with no dream running. */
  private undoBoons(): void {
    if (!this.boonTouched) return;
    this.boonTouched = false;
    const p = this.api.player;
    const w = this.wish;
    if (!p) return;
    p.dreamCooldownMult = 1;
    if (p.dreamSizeMult !== 1) { p.dreamSizeMult = 1; p.applySizeMult(); }
    p.flatDamageReduction = 0;
    p.hardDamageCap = 0;
    p.minHpFloor = 0;
    p.projectilePhase = false;
    if (w) {
      p.knockbackImmune = w.hadKnockbackImmune;
      p.unstoppable = w.hadUnstoppable;
      p.levitating = w.hadLevitating;
      if (w.gaveMaxHp > 0) p.reduceMaxHp(w.gaveMaxHp);
    }
  }

  // ── Ability entry points (called from build*Context) ───────────────────────

  /**
   * Click — Trance. A toggle: the pendulum stays up until it is put away, and while it is up
   * the way you wind it is by circling the cursor around yourself.
   */
  doTrance(owner: Owner): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (s.tranceOn) {
      const heat = this.swing[owner];
      s.tranceOn = false;
      s.pendulum?.destroy();
      s.pendulum = null;
      // Knocked Out (Click+): a bob still travelling is not put away, it is let go of.
      if (this.up(owner, 'click') && heat >= THROW_MIN_HEAT) {
        this.releaseBob(owner, heat);
        return;
      }
      this.api.showFloatingText(f.x, f.y - 40, 'Pendulum stilled', '#9fb8ff');
      return;
    }
    s.tranceOn = true;
    s.theta = 0.55;
    s.omega = 0;
    const a = this.anchorOf(owner);
    s.prevX = a.x; s.prevY = a.y;
    s.handX = a.x; s.handY = a.y;
    s.prevVx = 0; s.prevVy = 0;
    s.smoothAx = 0; s.smoothAy = 0;
    s.spin = 0;
    s.curAng = Math.atan2(this.aimYFor(owner) - f.y, this.aimXFor(owner) - f.x);
    s.pendulum = new TrancePendulum(this.api.scene, this.col(owner));
    this.avatar(owner)?.play('flex');
    this.fx(owner).ring(a.x, a.y, 12, TRANCE_R_MIN, DRM.violet, 480, 5, 6);
    this.fx(owner).stardust(a.x, a.y, 10, 30, 800);
    this.api.showFloatingText(f.x, f.y - 42, '🌀 TRANCE — circle the cursor', '#8b5cf6');
  }

  // ── Knocked Out (Click+) ───────────────────────────────────────────────────

  /** The bob comes off the chain and goes where the cursor is, carrying its swing with it. */
  private releaseBob(owner: Owner, heat: number): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    const tx = this.aimXFor(owner);
    const ty = this.aimYFor(owner);
    const ang = Math.atan2(ty - f.y, tx - f.x);
    this.thrown.push({
      owner,
      x: s.handX || f.x, y: s.handY || f.y,
      vx: Math.cos(ang) * THROW_SPEED,
      vy: Math.sin(ang) * THROW_SPEED,
      until: this.now + THROW_LIFE_MS,
      heat,
      seed: Math.random() * 999,
    });
    this.avatar(owner)?.play('punch', ang);
    this.fx(owner).stardust(f.x, f.y, 10, 30, 620, 7);
    Sfx.playAt('whoosh', f.x, { rate: 0.8 + heat * 0.5, volume: 0.7 });
    this.api.showFloatingText(f.x, f.y - 44,
      `🌠 LET GO — ${Math.round(THROW_BASE_DAMAGE + THROW_HEAT_DAMAGE * heat)}`, '#8b5cf6');
  }

  private updateThrown(dt: number): void {
    for (let i = this.thrown.length - 1; i >= 0; i--) {
      const b = this.thrown[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      const out = b.x < this.left - 30 || b.x > this.right + 30
        || b.y < this.top - 30 || b.y > this.bottom + 30;
      if (this.now >= b.until || out) {
        this.fx(b.owner).stardust(b.x, b.y, 6, 22, 480, 7);
        this.thrown.splice(i, 1);
        continue;
      }

      const victim = this.targetsOf(b.owner)
        .find((t) => Phaser.Math.Distance.Between(b.x, b.y, t.x, t.y) <= THROW_R + 12);
      if (!victim) continue;

      const dmg = Math.round(THROW_BASE_DAMAGE + THROW_HEAT_DAMAGE * b.heat);
      const st = this.state(victim);
      // Read *before* the hit, so a body sitting on 80% is knocked out by the blow that would
      // otherwise have woken them straight back up.
      const wasDeep = (st.asleepUntil > this.now ? 100 : st.drowsy) >= THROW_KO_AT;
      this.strike(victim, dmg, 'dream:pendulum');
      this.syncDamage(victim);
      this.api.spawnHitFlash(victim.x, victim.y, DRM.purple);
      this.fx(b.owner).ring(victim.x, victim.y, 10, 62, DRM.violet, 480, 5, 7);
      this.api.showFloatingText(victim.x, victim.y - 44, `🌠 ${dmg}`, '#c4b5fd');

      if (wasDeep && !victim.unstoppable) {
        st.drowsy = SLEEP_MAX;
        st.by = b.owner;
        st.asleepUntil = this.now + SLEEP_MS;
        this.record(b.owner, 'sleepsInduced');
        this.body(victim).setVelocity(0, 0);
        this.fx(b.owner).zzzPuff(victim.x, victim.y);
        this.api.showFloatingText(victim.x, victim.y - 60, '💫 KNOCKED OUT COLD', '#8b5cf6');
      }
      this.thrown.splice(i, 1);
    }
  }

  /** E — Pillow Fight. A wedge in front of you that hits like a truck on a sleeper. */
  doPillowFight(tx: number, ty: number, owner: Owner): void {
    const f = this.fighter(owner);
    const angle = Math.atan2(ty - f.y, tx - f.x);
    const fx = this.fx(owner);

    this.avatar(owner)?.play('sweep', angle);
    fx.pillowSwing(f.x, f.y, angle, PILLOW_REACH);

    let connected = false;
    for (const t of this.targetsOf(owner)) {
      const d = Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y);
      if (d > PILLOW_REACH + 20) continue;
      const off = Math.abs(Phaser.Math.Angle.Wrap(Math.atan2(t.y - f.y, t.x - f.x) - angle));
      if (off > PILLOW_ARC / 2) continue;
      connected = true;

      const st = this.state(t);
      // A sleeping target counts as fully drowsy — they are, by definition, all the way there.
      const ratio = st.asleepUntil > this.now ? 1 : Phaser.Math.Clamp(st.drowsy / SLEEP_MAX, 0, 1);
      const dmg = Math.round(PILLOW_DAMAGE + PILLOW_SLEEP_BONUS * ratio);
      this.strike(t, dmg, 'dream:pillow');
      // Resolved immediately rather than on the next frame's sweep, so the wake-up jolt is
      // part of this hit and the sleepiness multiplier below sees the post-wake number.
      this.attackTag = 'dream:pillow';
      this.syncDamage(t);
      this.attackTag = null;

      st.drowsy = Math.min(SLEEP_MAX, st.drowsy * PILLOW_SLEEP_MULT);
      st.by = owner;
      this.checkSleepThreshold(t, st, owner);

      this.api.spawnHitFlash(t.x, t.y, DRM.pillow);
      fx.feathers(t.x, t.y, 10, angle);
      if (ratio > 0.35) {
        this.api.showFloatingText(t.x, t.y - 46, `🛏️ ${dmg} — SWEET DREAMS`, '#bfd0ff');
      }
    }

    // Pillow Fort (E+): a swing that found nobody is not a wasted swing, it is masonry.
    if (!connected && this.up(owner, 'e')) {
      this.buildOrFeedFort(owner, angle);
      return;
    }

    if (!connected) fx.feathers(f.x + Math.cos(angle) * 50, f.y + Math.sin(angle) * 50, 4, angle);
  }

  // ── Pillow Fort (E+) ───────────────────────────────────────────────────────

  /** How big and how tough a fort of a given level is. L3 and L5 are the two growth spurts. */
  private fortSize(level: number): { r: number; maxHp: number } {
    const grows = (level >= 3 ? 1 : 0) + (level >= 5 ? 1 : 0);
    return {
      r: FORT_R + grows * FORT_GROW_R,
      maxHp: FORT_BASE_HP + grows * FORT_GROW_HP,
    };
  }

  /**
   * A pillow with nowhere to land builds. If your own fort is already in front of you the
   * pillow goes onto it — 25 HP back and a promotion — and otherwise a new one goes up.
   */
  private buildOrFeedFort(owner: Owner, angle: number): void {
    const f = this.fighter(owner);
    const fx = this.fx(owner);
    const existing = this.fortOf(owner);

    if (existing
      && Phaser.Math.Distance.Between(f.x, f.y, existing.x, existing.y) < existing.r + PILLOW_REACH) {
      const before = existing.level;
      existing.level = Math.min(FORT_MAX_LEVEL, existing.level + 1);
      const size = this.fortSize(existing.level);
      existing.r = size.r;
      existing.maxHp = size.maxHp;
      existing.hp = Math.min(existing.maxHp, existing.hp + FORT_HEAL
        + (existing.level > before ? size.maxHp - this.fortSize(before).maxHp : 0));
      if (existing.level >= 4 && before < 4) existing.nextRamAt = this.now + 1200;
      fx.feathers(existing.x, existing.y, 14, angle);
      fx.ring(existing.x, existing.y, 10, existing.r * 2, DRM.pillow, 480, 4, 6);
      Sfx.playAt('pillow', existing.x, { rate: 1.1, volume: 0.7 });
      this.api.showFloatingText(existing.x, existing.y - existing.r - 16,
        existing.level > before ? `🛏️ FORT LEVEL ${existing.level}` : `🛏️ +${FORT_HEAL} HP`,
        '#bfd0ff');
      return;
    }

    // A new fort, planted in front of you rather than under you — it is cover, and cover you
    // are standing inside the moment you make it is cover you cannot retreat to.
    const size = this.fortSize(1);
    const x = Phaser.Math.Clamp(f.x + Math.cos(angle) * (PILLOW_REACH * 0.8),
      this.left + size.r, this.right - size.r);
    const y = Phaser.Math.Clamp(f.y + Math.sin(angle) * (PILLOW_REACH * 0.8),
      this.top + size.r, this.bottom - size.r);
    this.forts = this.forts.filter((x2) => x2.owner !== owner);
    this.forts.push({
      owner, x, y, r: size.r, hp: size.maxHp, maxHp: size.maxHp, level: 1,
      nextRamAt: Infinity, cannonReadyAt: 0, cannonArmed: false, bornAt: this.now,
    });
    fx.feathers(x, y, 18, angle);
    fx.ring(x, y, 8, size.r * 2, DRM.pillow, 520, 5, 7);
    Sfx.playAt('pillow', x, { rate: 0.85, volume: 0.85 });
    this.api.showFloatingText(x, y - size.r - 16, '🏰 PILLOW FORT', '#bfd0ff');
  }

  /** Space, on a level-5 fort. Loads the next click. */
  private loadCannon(fort: Fort): void {
    if (fort.cannonArmed || this.now < fort.cannonReadyAt) return;
    fort.cannonArmed = true;
    this.fx(fort.owner).stardust(fort.x, fort.y - 12, 12, 30, 700, 7);
    Sfx.playAt('beam-charge', fort.x, { rate: 1.2, volume: 0.6 });
    this.api.showFloatingText(fort.x, fort.y - fort.r - 20, '🔭 CANNON LOADED', '#c4b5fd');
  }

  private fireCannon(fort: Fort, tx: number, ty: number): void {
    fort.cannonArmed = false;
    fort.cannonReadyAt = this.now + CANNON_COOLDOWN_MS;
    const ang = Math.atan2(ty - fort.y, tx - fort.x);
    this.shells.push({
      owner: fort.owner,
      x: fort.x + Math.cos(ang) * 22,
      y: fort.y + Math.sin(ang) * 22,
      vx: Math.cos(ang) * CANNON_SPEED,
      vy: Math.sin(ang) * CANNON_SPEED,
      until: this.now + 2000,
      seed: Math.random() * 999,
    });
    this.fx(fort.owner).ring(fort.x, fort.y, 8, 60, DRM.violet, 420, 4, 6);
    Sfx.playAt('mortar-launch', fort.x, { rate: 0.9, volume: 0.8 });
    this.api.showFloatingText(fort.x, fort.y - fort.r - 20, '🌌 COSMIC SHOT', '#8b5cf6');
  }

  /**
   * The fort's own frame: it eats whatever the enemy fires into it, spits rams once it is
   * angry enough, and falls over when its pillows run out.
   */
  private updateForts(time: number): void {
    for (let i = this.forts.length - 1; i >= 0; i--) {
      const fort = this.forts[i];

      // ── Enemy fire ──
      // Yours go straight through; theirs stop dead and are paid for out of the pillows.
      // Snapshotted: `destroy()` removes the child from the live group array, and iterating
      // that array while it shrinks silently skips every other shot.
      for (const child of [...this.api.projectiles.getChildren()]) {
        const proj = child as Projectile;
        if (!proj.active || !proj.body) continue;
        if (proj.isFromPlayer === (fort.owner === 'player')) continue;
        if (Phaser.Math.Distance.Between(proj.x, proj.y, fort.x, fort.y) > fort.r) continue;
        fort.hp -= Math.max(1, proj.damage);
        this.fx(fort.owner).feathers(proj.x, proj.y, 5, Math.atan2(proj.y - fort.y, proj.x - fort.x));
        proj.destroy();
      }

      if (fort.hp <= 0) {
        this.fx(fort.owner).feathers(fort.x, fort.y, 22, Math.random() * Math.PI * 2);
        this.fx(fort.owner).ring(fort.x, fort.y, 10, fort.r * 2.2, DRM.dread, 520, 5, 7);
        this.api.showFloatingText(fort.x, fort.y - 20, '🏚️ FORT DOWN', '#ff3b6b');
        this.forts.splice(i, 1);
        continue;
      }

      // ── Rams (level 4) ──
      if (fort.level >= 4 && time >= fort.nextRamAt) {
        fort.nextRamAt = time + RAM_EVERY_MS;
        this.rams.push({
          owner: fort.owner, x: fort.x, y: fort.y, ang: 0,
          until: time + RAM_LIFE_MS, hit: new Set(),
        });
        this.fx(fort.owner).feathers(fort.x, fort.y, 10, Math.random() * Math.PI * 2);
        Sfx.playAt('roar', fort.x, { rate: 1.5, volume: 0.5 });
        this.api.showFloatingText(fort.x, fort.y - fort.r - 16, '🐏 RAM!', '#f4f1e8');
      }
    }
  }

  /** A ram runs at the nearest enemy, hits once, and keeps going. */
  private updateRams(time: number, dt: number): void {
    for (let i = this.rams.length - 1; i >= 0; i--) {
      const r = this.rams[i];
      if (time >= r.until) {
        this.fx(r.owner).feathers(r.x, r.y, 6, Math.random() * Math.PI * 2);
        this.rams.splice(i, 1);
        continue;
      }

      let target: Fighter | null = null;
      let best = Infinity;
      for (const t of this.targetsOf(r.owner)) {
        if (r.hit.has(t)) continue;
        const d = Phaser.Math.Distance.Between(r.x, r.y, t.x, t.y);
        if (d >= best) continue;
        best = d;
        target = t;
      }
      if (target) {
        const ang = Math.atan2(target.y - r.y, target.x - r.x);
        r.ang = ang;
        r.x += Math.cos(ang) * RAM_SPEED * dt;
        r.y += Math.sin(ang) * RAM_SPEED * dt;
        if (best <= RAM_HIT_R) {
          r.hit.add(target);
          this.strike(target, RAM_DAMAGE, 'dream:ram');
          this.syncDamage(target);
          this.api.spawnHitFlash(target.x, target.y, DRM.wool);
          this.shove(target, ang, RAM_KNOCK);
          this.fx(r.owner).feathers(target.x, target.y, 12, ang);
          Sfx.playAt('hit-heavy', target.x, { rate: 0.9, volume: 0.7 });
          this.api.showFloatingText(target.x, target.y - 44, `🐏 ${RAM_DAMAGE}`, '#f4f1e8');
        }
      } else {
        // Nothing left to charge: it mills about outside the fort until its five seconds run out.
        r.x += Math.cos(time / 400 + r.until) * RAM_SPEED * 0.3 * dt;
        r.y += Math.sin(time / 400 + r.until) * RAM_SPEED * 0.3 * dt;
      }
      r.x = Phaser.Math.Clamp(r.x, this.left, this.right);
      r.y = Phaser.Math.Clamp(r.y, this.top, this.bottom);
    }
  }

  private updateShells(time: number, dt: number): void {
    for (let i = this.shells.length - 1; i >= 0; i--) {
      const sh = this.shells[i];
      sh.x += sh.vx * dt;
      sh.y += sh.vy * dt;
      const out = sh.x < this.left - 20 || sh.x > this.right + 20
        || sh.y < this.top - 20 || sh.y > this.bottom + 20;
      if (time >= sh.until || out) {
        this.fx(sh.owner).stardust(sh.x, sh.y, 6, 22, 460, 7);
        this.shells.splice(i, 1);
        continue;
      }
      const victim = this.targetsOf(sh.owner)
        .find((t) => Phaser.Math.Distance.Between(sh.x, sh.y, t.x, t.y) <= CANNON_R);
      if (!victim) continue;
      this.strike(victim, CANNON_DAMAGE, 'dream:cannon');
      this.syncDamage(victim);
      this.record(sh.owner, 'cannonHits');
      const st = this.state(victim);
      st.drowsy = Math.min(SLEEP_MAX,
        st.drowsy + meterGain(this.fighter(sh.owner), CANNON_SLEEP));
      st.by = sh.owner;
      this.checkSleepThreshold(victim, st, sh.owner);
      this.api.spawnHitFlash(victim.x, victim.y, DRM.purple);
      this.fx(sh.owner).ring(victim.x, victim.y, 10, 70, DRM.violet, 520, 5, 8);
      this.api.showFloatingText(victim.x, victim.y - 46,
        `🌌 ${CANNON_DAMAGE}  +${CANNON_SLEEP}%`, '#c4b5fd');
      this.shells.splice(i, 1);
    }
  }

  /**
   * Knockback, played out as position. Both movement systems rewrite a fighter's velocity every
   * frame, so a shove handed to the physics body is gone before it renders.
   */
  private shove(target: Fighter, ang: number, distance: number): void {
    if (target.knockbackImmune) return;
    const speed = distance / (SHOVE_MS / 1000);
    this.shoves = this.shoves.filter((s) => s.target !== target);
    this.shoves.push({
      target, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed, until: this.now + SHOVE_MS,
    });
  }

  private updateShoves(dt: number): void {
    if (!this.shoves.length) return;
    const now = this.now;
    for (const s of this.shoves) {
      const t = s.target;
      if (!t || !t.active) continue;
      const left = Phaser.Math.Clamp((s.until - now) / SHOVE_MS, 0, 1);
      t.setPosition(
        Phaser.Math.Clamp(t.x + s.vx * dt * left * 2, this.left, this.right),
        Phaser.Math.Clamp(t.y + s.vy * dt * left * 2, this.top, this.bottom),
      );
    }
    this.shoves = this.shoves.filter((s) => s.until > now && s.target?.active);
  }

  /** R — Dreamcatcher. Three on the floor at once; the oldest is cut loose for a fourth. */
  doDreamcatcher(owner: Owner): void {
    const f = this.fighter(owner);
    const mine = this.catchers.filter((c) => c.owner === owner);
    if (mine.length >= CATCHER_MAX) {
      // Fade the oldest rather than deleting it, so it sinks instead of blinking away.
      const oldest = mine.reduce((a, b) => (a.bornAt <= b.bornAt ? a : b));
      oldest.until = Math.min(oldest.until, this.now + 140);
    }

    const x = Phaser.Math.Clamp(f.x, this.left + 20, this.right - 20);
    const y = Phaser.Math.Clamp(f.y + 10, this.top + 20, this.bottom - 20);
    this.catchers.push({
      owner, x, y,
      bornAt: this.now,
      until: this.now + CATCHER_MS,
      dreams: 0,
      good: 0,
      drainAccum: 0,
      draining: null,
    });

    this.avatar(owner)?.play('slam');
    this.fx(owner).ring(x, y, 8, CATCHER_RADIUS * 2.2, DRM.web, 460, 4, 5);
    this.fx(owner).stardust(x, y, 8, 26, 700, 5);
    this.api.showFloatingText(f.x, f.y - 42, '🪶 DREAMCATCHER', '#e8ecff');
  }

  /** F — Nightmare. Ten seconds of something only they can see. */
  doNightmare(owner: Owner): void {
    const f = this.fighter(owner);
    const victim = owner === 'player' ? this.api.getNearestEnemy(f.x, f.y) : this.api.player;
    if (!victim || !victim.active || victim.hp <= 0) {
      this.api.showFloatingText(f.x, f.y - 40, 'Nobody to haunt', '#6b6b88');
      return;
    }

    const st = this.state(victim);
    st.nightmareUntil = this.now + NIGHTMARE_MS;
    st.nightmareAccum = 0;
    st.nightmareBy = owner;

    this.avatar(owner)?.play('punch', Math.atan2(victim.y - f.y, victim.x - f.x));
    const fx = this.fx(owner);
    fx.ring(victim.x, victim.y, 10, 60, DRM.dread, 520, 5, 7);
    fx.stardust(victim.x, victim.y, 9, 30, 760, 7);
    this.api.showFloatingText(victim.x, victim.y - 48, '💔 NIGHTMARE', '#ff3b6b');
  }

  /** Q — Oasis. Opens the doorway; walking into it is what actually takes you through. */
  doOasis(owner: Owner): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    // Behind you, relative to where you are pointing — the whole idea is to break away.
    const aim = owner === 'player'
      ? Math.atan2(this.lastAimY - f.y, this.lastAimX - f.x)
      : Math.atan2(this.api.player.y - f.y, this.api.player.x - f.x);
    const bx = Phaser.Math.Clamp(f.x - Math.cos(aim) * PORTAL_BACK, this.left + PORTAL_RX, this.right - PORTAL_RX);
    const by = Phaser.Math.Clamp(f.y - Math.sin(aim) * PORTAL_BACK, this.top + PORTAL_RY, this.bottom - PORTAL_RY);

    s.portal?.destroy();
    s.portal = new DreamPortal(this.api.scene, this.col(owner));
    s.portalX = bx;
    s.portalY = by;
    s.portalUntil = this.now + PORTAL_LIFE_MS;
    s.portalOpen = 0;

    this.avatar(owner)?.play('raise');
    this.fx(owner).tear(bx, by, PORTAL_RX, PORTAL_RY, false);
    this.api.showFloatingText(bx, by - PORTAL_RY - 14, '🌌 OASIS — step through', '#8b5cf6');
  }

  // ── Update ─────────────────────────────────────────────────────────────────

  update(time: number, delta: number): void {
    const playerIs = this.api.elementId === 'dream';
    const npcIs = this.api.npcElementId === 'dream';
    if (!playerIs && !npcIs) return;

    this.vizT += delta / 1000;
    this.ensureLayers();
    this.gained.clear();

    for (const owner of ['player', 'npc'] as Owner[]) {
      if (this.isDream(owner)) this.updateSide(owner, time, delta);
    }

    const dt = Math.min(0.05, delta / 1000);
    this.updateCatchers(time, delta);
    this.updateThrown(dt);
    this.updateForts(time);
    this.updateRams(time, dt);
    this.updateShells(time, dt);
    this.updateTerrors(time);
    this.updateSleepers(time, delta);
    this.updateShoves(dt);
    // Before the multiplier pass, because a granted dream is one of the things it folds in.
    this.updateDuel(time, delta);
    this.updateWish(time, delta);
    this.updateFighterMults();
    this.seedMasteryStats();
    this.updateAvatars(delta, playerIs, npcIs);
    this.paintWorld(delta);
    this.paintDuel();
    this.paintOverhead(playerIs);
    this.paintCursor(playerIs, delta);
    this.paintHud(playerIs);
    this.pushStatuses(playerIs);
  }

  /**
   * The once-per-match mastery bookkeeping: the heal counter is hooked here rather than in each
   * of the six places Dream hands health back, because `Fighter.onHeal` is the one place every
   * one of them passes through — and ArenaScene owns that callback, so it is wrapped rather
   * than claimed.
   */
  private seedMasteryStats(): void {
    if (this.masteryStatsSeeded || this.api.elementId !== 'dream') return;
    const p = this.api.player;
    if (!p) return;
    this.masteryStatsSeeded = true;
    const prev = p.onHeal;
    p.onHeal = (amount: number) => {
      prev?.(amount);
      this.record('player', 'healedHp', Math.round(amount));
    };
  }

  private ensureLayers(): void {
    const { scene } = this.api;
    if (!this.groundGfx) this.groundGfx = scene.add.graphics().setDepth(2);
    if (!this.airGfx) this.airGfx = scene.add.graphics().setDepth(7);
    if (!this.sceneGfx) this.sceneGfx = scene.add.graphics().setDepth(14);
    if (!this.overheadGfx) this.overheadGfx = scene.add.graphics().setDepth(16);
    if (!this.cursorGfx) this.cursorGfx = scene.add.graphics().setDepth(30);
    if (!this.hudGfx) this.hudGfx = scene.add.graphics().setDepth(20).setScrollFactor(0);
  }

  /** Pendulum physics, the drowsy field, the portal and the oasis, for one side. */
  private updateSide(owner: Owner, time: number, delta: number): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (!f || !f.active) return;
    const dt = Math.min(0.05, delta / 1000);
    if (dt <= 0) return;

    this.updatePendulum(s, f, owner, dt);
    this.updateRest(s, f, owner, delta);
    this.updateOasis(s, f, owner, time, delta);
    this.updateGoodBuffs(owner, delta);
  }

  /**
   * Pillow Fort (E+): what resting *inside* your own fort is worth on top of the passive.
   * +2/s from level 2, +4/s from level 5 — the two levels the promotion ladder promises it at.
   */
  private fortRestBonus(owner: Owner, f: Fighter): number {
    const fort = this.fortOf(owner);
    if (!fort || !this.standingOnFort(f, fort)) return 0;
    return (fort.level >= 2 ? FORT_REST_BONUS : 0) + (fort.level >= 5 ? FORT_REST_BONUS : 0);
  }

  /**
   * Rest: 5 HP a second for standing perfectly still, paid one whole second at a time so a
   * step-stop-step shuffle never collects. Not while asleep (that is a debuff, not a rest)
   * and not in the oasis, which is already handing out twice as much.
   */
  private updateRest(s: Side, f: Fighter, owner: Owner, delta: number): void {
    const body = this.body(f);
    const speed = body ? Math.hypot(body.velocity.x, body.velocity.y) : 0;
    if (speed > REST_STILL_SPEED || f.hp <= 0 || s.oasisUntil > this.now || this.isAsleep(f)) {
      s.restAccum = 0;
      s.restSince = 0;
      return;
    }

    if (s.restSince === 0) s.restSince = this.now;
    s.restAccum += delta;
    while (s.restAccum >= REST_TICK_MS) {
      s.restAccum -= REST_TICK_MS;
      const before = f.hp;
      f.heal(REST_HEAL + this.fortRestBonus(owner, f));
      const got = Math.round(f.hp - before);
      if (got > 0) {
        this.api.showFloatingText(f.x, f.y - 30, `💤 +${got}`, '#3fc7d6');
        this.fx(owner).stardust(f.x, f.y - 4, 4, 20, 620, 6);
      }
    }
  }

  /**
   * A driven pendulum whose pivot is the caster's *hand*, and whose hand is dragged around by
   * the cursor.
   *
   * θ is measured from straight down, positive toward +x, so with the pivot accelerating at
   * (Ax, Ay) the equation of motion is θ'' = −[sinθ·(g − Ay) + Ax·cosθ]/L − damping·θ'. Circle
   * the cursor around yourself and the hand traces the same circle at HAND_R, which is a
   * genuine centripetal drive — and because the bob's own √(g/L) is about 4.85 rad/s, circling
   * at roughly that rate is resonance and pumps it hard.
   *
   * On top of the physics the *spin rate itself* sets a floor on the field's strength, so
   * "wind harder, sleep faster" is a promise rather than something you have to find the beat
   * for. The physics is the feel; the floor is the contract.
   */
  private updatePendulum(s: Side, f: Fighter, owner: Owner, dt: number): void {
    if (!s.tranceOn) {
      this.swing[owner] = 0;
      s.spin = 0;
      // Putting the pendulum away spends the charge. Knocked Out still throws at whatever was
      // stored on the frame you toggled — what you cannot do is bank a wind, walk about with the
      // pendulum down, and bring it back out still hot.
      s.charge = 0;
      return;
    }

    // ── How fast the cursor is going round ──
    if (owner === 'npc') {
      // No mouse to circle: the AI is handed a steady wind instead.
      s.spin += (NPC_SPIN - s.spin) * Math.min(1, dt * 3);
      s.curAng += s.spin * dt;
    } else {
      const ang = Math.atan2(this.lastAimY - f.y, this.lastAimX - f.x);
      const rate = Phaser.Math.Angle.Wrap(ang - s.curAng) / dt;
      s.curAng = ang;
      // Sampled once a frame off a mouse, so it needs smoothing before it drives anything.
      s.spin += (Phaser.Math.Clamp(rate, -18, 18) - s.spin) * Math.min(1, dt * 9);
    }

    // ── The hand, and the acceleration it is putting into the chain ──
    const a = this.anchorOf(owner);
    s.handX = a.x;
    s.handY = a.y;
    const vx = (a.x - s.prevX) / dt;
    const vy = (a.y - s.prevY) / dt;
    const rawAx = Phaser.Math.Clamp((vx - s.prevVx) / dt, -PEND_MAX_DRIVE, PEND_MAX_DRIVE);
    const rawAy = Phaser.Math.Clamp((vy - s.prevVy) / dt, -PEND_MAX_DRIVE, PEND_MAX_DRIVE);
    s.prevX = a.x; s.prevY = a.y;
    s.prevVx = vx; s.prevVy = vy;
    // Position sampled once a frame differentiated twice is noisy; smooth before driving.
    s.smoothAx += (rawAx - s.smoothAx) * 0.3;
    s.smoothAy += (rawAy - s.smoothAy) * 0.3;

    const acc = -(Math.sin(s.theta) * (PEND_G - s.smoothAy) + s.smoothAx * Math.cos(s.theta)) / PEND_LEN
      - PEND_DAMP * s.omega;
    s.omega = Phaser.Math.Clamp(s.omega + acc * dt, -OMEGA_MAX, OMEGA_MAX);
    s.theta = Phaser.Math.Angle.Wrap(s.theta + s.omega * dt);

    const tip = Math.abs(s.omega) * PEND_LEN;
    const spinHeat = Phaser.Math.Clamp(
      (Math.abs(s.spin) - SPIN_DEADZONE) / (SPIN_FULL - SPIN_DEADZONE), 0, 1);
    // How good this frame's wind is. It is no longer the swing itself — it is what the swing is
    // filling toward, and the ceiling it will drain back to the moment the winding gets lazy.
    const drive = Math.max(Phaser.Math.Clamp(tip / TRANCE_MAX_TIP, 0, 1), spinHeat);
    if (drive > s.charge) s.charge = Math.min(drive, s.charge + CHARGE_FILL * drive * dt);
    else s.charge = Math.max(drive, s.charge - CHARGE_DRAIN * dt);
    const heat = s.charge;
    this.swing[owner] = heat;

    if (heat < TRANCE_MIN_SWING) return;
    const radius = TRANCE_R_MIN + (TRANCE_R_MAX - TRANCE_R_MIN) * heat;
    // Well faster than linear: a lazy swing is close to nothing and a full one is the threat.
    const gain = TRANCE_GAIN * Math.pow(heat, TRANCE_CURVE) * dt;
    for (const t of this.targetsOf(owner)) {
      if (Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y) > radius) continue;
      this.gained.set(t, (this.gained.get(t) ?? 0) + gain);
      this.state(t).by = owner;
    }
  }

  /** The standing doorway, walking into it, and the rest on the other side. */
  private updateOasis(s: Side, f: Fighter, owner: Owner, time: number, delta: number): void {
    // ── Inside ──
    if (s.oasisUntil > time) {
      this.body(f).setVelocity(0, 0);
      f.setPosition(s.portalX, s.portalY);
      f.isInvincible = true;
      f.forceInvisible = true;
      s.oasisGrow = Math.min(1, s.oasisGrow + delta / 420);

      // The falls, on a loop. Only for the side that is actually looking at the meadow.
      if (owner === 'player') {
        this.fallsAccum += delta;
        if (this.fallsAccum >= FALLS_LOOP_MS) {
          this.fallsAccum = 0;
          Sfx.play('meadow-falls');
        }
      }

      s.oasisHealAccum += delta;
      while (s.oasisHealAccum >= OASIS_HEAL_TICK_MS) {
        s.oasisHealAccum -= OASIS_HEAL_TICK_MS;
        const before = f.hp;
        f.heal(OASIS_HEAL);
        const got = Math.round(f.hp - before);
        if (got > 0) {
          s.oasisHealed += got;
          this.api.showFloatingText(f.x, f.y - 30, `+${got}`, '#3fc7d6');
        }
      }
      // Topped up ends it early — but only once the place has actually given something back.
      // Stepping through on full HP is an escape, not a wasted ultimate, so it does not throw
      // you straight out again. Clotted HP holds part of the pool, so "full" is hp + clot.
      if (s.oasisHealed > 0 && f.hp + f.clottedHp >= f.maxHp) this.exitOasis(s, f, owner, 'RESTED');
      return;
    }
    if (s.oasisUntil !== 0) this.exitOasis(s, f, owner, 'AWAKE');

    s.oasisGrow = Math.max(0, s.oasisGrow - delta / 380);
    if (s.oasisGrow <= 0.02 && s.oasis) { s.oasis.destroy(); s.oasis = null; }

    // ── The doorway, waiting ──
    if (s.portalUntil <= 0) return;
    if (time >= s.portalUntil) {
      s.portalOpen = Math.max(0, s.portalOpen - delta / 320);
      if (s.portalOpen <= 0.02) {
        s.portal?.destroy();
        s.portal = null;
        s.portalUntil = 0;
      }
      return;
    }
    s.portalOpen = Math.min(1, s.portalOpen + delta / 300);
    if (s.portalOpen > 0.6
      && Phaser.Math.Distance.Between(f.x, f.y, s.portalX, s.portalY) < PORTAL_ENTER_R) {
      this.enterOasis(s, f, owner);
    }
  }

  private enterOasis(s: Side, f: Fighter, owner: Owner): void {
    s.oasisUntil = this.now + OASIS_MS;
    s.oasisHealAccum = 0;
    s.oasisHealed = 0;
    s.savedInvincible = f.isInvincible;
    s.savedInvisible = f.forceInvisible;
    // The door shuts behind you — nothing else was ever getting through it anyway.
    s.portalUntil = 0;
    s.portalOpen = 0;
    s.portal?.destroy();
    s.portal = null;
    f.setPosition(s.portalX, s.portalY);
    this.body(f).reset(s.portalX, s.portalY);

    if (owner === 'player') {
      s.oasis?.destroy();
      s.oasis = new OasisView(this.api.scene, this.pcol, this.api.width, this.api.height);
      // Due on the first frame on the other side, so the falls are already running.
      this.fallsAccum = FALLS_LOOP_MS;
    }
    this.fx(owner).tear(s.portalX, s.portalY, PORTAL_RX, PORTAL_RY, true);
    this.api.showFloatingText(s.portalX, s.portalY - 40, '🏞️ OASIS', '#74d18c');

    // Night Terrors (Q+): your rest is their nightmare, and only if they were already under.
    if (this.up(owner, 'q')) this.beginTerror(owner);
  }

  /**
   * Whether the doorway should be showing red — the tell that stepping through it is also
   * going to do something to whoever is asleep out there.
   */
  private terrorReady(owner: Owner): boolean {
    if (!this.up(owner, 'q')) return false;
    const f = this.fighter(owner);
    if (!this.alive(f)) return false;
    const victim = owner === 'player' ? this.api.getNearestEnemy(f.x, f.y) : this.api.player;
    return this.alive(victim) && this.isAsleep(victim);
  }

  private exitOasis(s: Side, f: Fighter, owner: Owner, why: string): void {
    s.oasisUntil = 0;
    // Hand the flags back as they were found, so a Stealthy mutation survives the trip.
    f.isInvincible = s.savedInvincible;
    f.forceInvisible = s.savedInvisible;
    this.fx(owner).tear(f.x, f.y, PORTAL_RX, PORTAL_RY, false);
    this.fx(owner).stardust(f.x, f.y, 14, 40, 900, 7);
    this.api.showFloatingText(f.x, f.y - 44, `🌅 ${why}`, '#ffd98a');
  }

  /** Dreamcatchers: draining a sleeper, filling up, and being walked over. */
  private updateCatchers(time: number, delta: number): void {
    for (const c of this.catchers) {
      c.draining = null;

      // Any sleeper this side put under is fair game, wherever they are lying.
      if (c.dreams < DREAM_CAP) {
        const sleeper = this.targetsOf(c.owner).find((t) => this.isAsleep(t));
        if (sleeper) {
          c.draining = sleeper;
          c.drainAccum += delta;
          if (c.drainAccum >= DRAIN_MS) {
            c.drainAccum -= DRAIN_MS;
            c.dreams++;
            // Good Dreams (R+): one in five comes out golden and is worth keeping.
            const golden = this.up(c.owner, 'r') && Math.random() < GOOD_DREAM_CHANCE;
            if (golden) c.good++;
            // Every dream torn out costs them time on everything they know how to do.
            for (const ab of sleeper.element.abilities) {
              sleeper.reduceCooldown(ab.id, -DREAM_COOLDOWN_PENALTY);
            }
            this.fx(c.owner).stardust(sleeper.x, sleeper.y, golden ? 9 : 5, golden ? 28 : 20, 620, 7);
            this.api.showFloatingText(sleeper.x, sleeper.y - 52,
              golden ? '✨ GOOD DREAM  +2s CD' : '💤 DREAM TAKEN  +2s CD',
              golden ? '#ffd98a' : '#8b5cf6');
          }
        } else {
          c.drainAccum = 0;
        }
      }

      // Walking over it collects everything it is holding.
      const holder = this.fighter(c.owner);
      if (c.dreams > 0 && holder && holder.active && holder.hp > 0
        && Phaser.Math.Distance.Between(holder.x, holder.y, c.x, c.y) < PICKUP_RADIUS) {
        const healed = c.dreams * DREAM_HEAL;
        const golden = c.good;
        c.dreams = 0;
        c.good = 0;
        holder.heal(healed);
        this.fx(c.owner).ring(c.x, c.y, 6, 46, DRM.water, 420, 4, 6);
        this.fx(c.owner).stardust(holder.x, holder.y, 8, 24, 700, 7);
        this.api.showFloatingText(holder.x, holder.y - 44, `🌙 +${healed} HP`, '#3fc7d6');
        for (let i = 0; i < golden; i++) this.grantGoodBuff(c.owner);
      }
    }

    const dead = this.catchers.filter((c) => time >= c.until);
    for (const c of dead) this.fx(c.owner).stardust(c.x, c.y, 6, 22, 620, 5);
    if (dead.length) this.catchers = this.catchers.filter((c) => time < c.until);
  }

  // ── Good Dreams (R+) ───────────────────────────────────────────────────────

  /** One golden dream, cashed in. Rolled at pickup so the reward is a small surprise. */
  private grantGoodBuff(owner: Owner): void {
    const kinds: GoodBuffKind[] = ['swift', 'fierce', 'tough', 'mending'];
    const kind = kinds[Math.floor(Math.random() * kinds.length)];
    const s = this.side(owner);
    s.buffs.push({ kind, until: this.now + GOOD_BUFF_MS });
    const f = this.fighter(owner);
    const def = GOOD_BUFFS[kind];
    this.fx(owner).stardust(f.x, f.y, 10, 30, 800, 7);
    if (owner === 'player') {
      this.api.showFloatingText(f.x, f.y - 56, `${def.emoji} ${def.name.toUpperCase()}`, '#ffd98a');
    }
  }

  private countBuff(owner: Owner, kind: GoodBuffKind): number {
    return this.side(owner).buffs.filter((b) => b.kind === kind).length;
  }

  /**
   * The buffs, applied every frame. Two of the four are pulled by ArenaScene (speed) or by the
   * damage chain (`dreamIncomingMult`), so this only has to keep the timers honest and pay the
   * regen — but the outgoing multiplier is *shared*, so that one is divided out rather than set.
   */
  private updateGoodBuffs(owner: Owner, delta: number): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (!f) return;
    const before = s.buffs.length;
    s.buffs = s.buffs.filter((b) => b.until > this.now);
    if (s.buffs.length !== before && owner === 'player') {
      this.api.showFloatingText(f.x, f.y - 40, '✨ a dream fades', '#8a8a8a');
    }

    if (!this.alive(f)) return;
    const mend = this.countBuff(owner, 'mending');
    if (mend > 0) {
      s.mendAccum += delta;
      while (s.mendAccum >= 1000) {
        s.mendAccum -= 1000;
        const hp0 = f.hp;
        f.heal(2 * mend);
        const got = Math.round(f.hp - hp0);
        if (got > 0) this.api.showFloatingText(f.x, f.y - 26, `🌿 +${got}`, '#74d18c');
      }
    } else {
      s.mendAccum = 0;
    }
  }

  // ── Phobia (F+) ────────────────────────────────────────────────────────────

  /**
   * Everything this kit writes onto a Fighter's two damage multipliers, resolved in one pass so
   * the three things that want them cannot overwrite each other.
   *
   * Phobia is per-*attack*, and `takeDamage` has no idea what hit it — so the current attack is
   * resolved here, from the tag the kit is dealing under (its own damage) or from what the
   * attacker last cast (everything else), and the stack count for *that* attack is what lands.
   * Well Rested and Lucid come off the Good Dream ledger, and the corridor's exhaustion comes
   * off the Night Terror ledger; incoming is Dream's own field and is written flat, outgoing is
   * shared with Lust and the cards and is divided in.
   */
  private updateFighterMults(): void {
    const seen = new Set<Fighter>();
    const resolve = (f: Fighter): void => {
      if (!f || seen.has(f)) return;
      seen.add(f);
      const st = this.sleep.get(f);
      const owner = f === this.api.player ? 'player' : f === this.api.npc ? 'npc' : null;

      // ── Incoming: their phobia of whatever is currently swinging, times their own armour ──
      let incoming = 1;
      if (st?.phobia.size) {
        const stacks = st.phobia.get(this.wakerTag(st)) ?? 0;
        incoming *= 1 + stacks * PHOBIA_PER_STACK;
      }
      if (owner && this.isDream(owner)) {
        const tough = this.countBuff(owner, 'tough');
        if (tough > 0) incoming *= Math.max(0.4, 1 - 0.15 * tough);
      }
      // Lifelong Dream's armour, folded in here rather than written on its own so it cannot
      // stomp Phobia — the two are allowed to be true at once and to multiply.
      if (f === this.api.player) incoming *= this.boonTotals().armor;
      f.dreamIncomingMult = incoming;

      // ── Outgoing: Lucid lifts it, the corridor drops it ──
      let outgoing = 1;
      if (owner && this.isDream(owner)) outgoing *= 1 + 0.15 * this.countBuff(owner, 'fierce');
      if (st && st.exhaustedUntil > this.now) outgoing *= TERROR_EXHAUST_MULT;
      if (f === this.api.player) outgoing *= this.boonTotals().damage;
      this.applyOutgoing(f, outgoing);
    };

    resolve(this.api.player);
    resolve(this.api.npc);
    for (const f of [...this.sleep.keys()]) resolve(f);
  }

  // ── Night Terrors (Q+) ─────────────────────────────────────────────────────

  /**
   * Stepping through the doorway takes the sleeper somewhere too. They are held for the length
   * of the cutscene — genuinely held, because a nightmare you can walk out of is a debuff — and
   * then the specific thing that happened to them in it lands.
   */
  private beginTerror(owner: Owner): void {
    const f = this.fighter(owner);
    const victim = owner === 'player' ? this.api.getNearestEnemy(f.x, f.y) : this.api.player;
    if (!this.alive(victim) || !this.isAsleep(victim)) return;
    if (this.terrors.some((t) => t.victim === victim)) return;

    const kind = Math.floor(Math.random() * 3) as 0 | 1 | 2;
    this.terrors.push({ victim, by: owner, kind, endsAt: this.now + TERROR_HOLD_MS });
    const st = this.state(victim);
    // Held under for the whole of it: they do not get to wake up halfway down the corridor.
    st.asleepUntil = Math.max(st.asleepUntil, this.now + TERROR_HOLD_MS + 200);
    this.fx(owner).ring(victim.x, victim.y, 12, 90, DRM.dread, 620, 6, 8);
    Sfx.playAt('nightmare', victim.x, { rate: 0.7, volume: 0.9 });
    this.api.showFloatingText(victim.x, victim.y - 60,
      ['🏃 THE CORRIDOR', '🕳️ THE FALL', '🐺 THE HORDE'][kind], '#ff3b6b');
  }

  private updateTerrors(time: number): void {
    for (let i = this.terrors.length - 1; i >= 0; i--) {
      const tr = this.terrors[i];
      const v = tr.victim;
      if (!this.alive(v)) { this.terrors.splice(i, 1); continue; }

      if (time < tr.endsAt) {
        // The cutscene. Nothing about it is optional for the person inside it.
        this.body(v).setVelocity(0, 0);
        v.earthStunnedUntil = Math.max(v.earthStunnedUntil, time + 140);
        v.applyDisarm(160);
        // Their own damage tally is kept in step, so nothing that lands during the nightmare
        // counts as the thing that woke them out of it.
        this.state(v).lastRaw = v.rawDamageTaken;
        continue;
      }

      this.terrors.splice(i, 1);
      const st = this.state(v);
      const fx = this.fx(tr.by);
      if (tr.kind === 0) {
        st.exhaustedUntil = time + TERROR_EXHAUST_MS;
        fx.stardust(v.x, v.y, 10, 30, 700, 7);
        this.api.showFloatingText(v.x, v.y - 52, '😰 EXHAUSTED', '#ff3b6b');
      } else if (tr.kind === 1) {
        v.earthStunnedUntil = Math.max(v.earthStunnedUntil, time + TERROR_STUN_MS);
        v.applyDisarm(TERROR_STUN_MS);
        fx.ring(v.x, v.y, 10, 80, DRM.violet, 620, 6, 8);
        this.api.showFloatingText(v.x, v.y - 52, '💥 THE IMPACT', '#8b5cf6');
      } else {
        st.bleedUntil = time + TERROR_BLEED_MS;
        st.bleedAccum = 0;
        st.bleedBy = tr.by;
        fx.ring(v.x, v.y, 8, 60, DRM.dread, 520, 5, 7);
        this.api.showFloatingText(v.x, v.y - 52, '🩸 BITTEN', '#ff3b6b');
      }
      // Waking up out of the nightmare is a wake like any other.
      if (st.asleepUntil > time) st.asleepUntil = time;
    }
  }

  /**
   * Everything that happens *to* a body: waking, nightmares ticking, sleep expiring and
   * drowsiness rising or bleeding away. Runs over every fighter Dream has ever touched, so
   * an effect still resolves after the caster has stopped paying attention to it.
   */
  private updateSleepers(time: number, delta: number): void {
    const dt = delta / 1000;
    for (const [f, st] of [...this.sleep]) {
      if (!f.active || f.hp <= 0) { this.sleep.delete(f); continue; }

      // ── Woken by damage? (before the nightmare tick, so a real hit is never swallowed) ──
      this.syncDamage(f);

      // ── Night Terrors: the horde's bite. (The corridor's exhaustion is a multiplier, and
      // lands in `updateFighterMults` with everything else that writes one.) ──
      if (st.bleedUntil > time) {
        st.bleedAccum += delta;
        while (st.bleedAccum >= TERROR_BLEED_TICK_MS) {
          st.bleedAccum -= TERROR_BLEED_TICK_MS;
          this.strike(f, TERROR_BLEED_DAMAGE, 'dream:nightmare');
          st.lastRaw = f.rawDamageTaken;
          this.fx(st.bleedBy).stardust(f.x, f.y, 3, 14, 400, 7);
        }
      }

      // ── Nightmare ──
      if (st.nightmareUntil > time) {
        st.nightmareAccum += delta;
        while (st.nightmareAccum >= NIGHTMARE_TICK_MS) {
          st.nightmareAccum -= NIGHTMARE_TICK_MS;
          this.strike(f, NIGHTMARE_TICK_DAMAGE, 'dream:nightmare');
          // A nightmare is not an alarm clock: its own damage must not wake its host, so the
          // tally is re-synced right here rather than left for the next frame to notice.
          st.lastRaw = f.rawDamageTaken;
        }
      } else if (st.nightmareUntil !== 0) {
        st.nightmareUntil = 0;
        st.nightmareAccum = 0;
      }

      // ── Sleep upkeep ──
      if (st.asleepUntil > time) {
        // Dream Duel: the sleeper's spirit is out and walking. They are still asleep — the
        // meter, the wake rules and the nightmare all still apply — but the body they left
        // behind is not what is being held still any more, and dodging is the only thing the
        // duel leaves them. `updateDuel` owns their leash and their disarm instead.
        if (this.duel && this.duel.victim === f) continue;
        this.body(f).setVelocity(0, 0);
        f.earthStunnedUntil = Math.max(f.earthStunnedUntil, time + 140);
        f.applyDisarm(160);
        continue;
      }
      if (st.asleepUntil !== 0) this.wake(f, st, 0, 'natural');

      // ── Drowsiness ──
      const gain = this.gained.get(f) ?? 0;
      if (gain > 0) {
        // Combo Breaker: the sleep belongs to whoever is putting them under, so it is *their*
        // meter that is halved, not the sleeper's.
        st.drowsy = Math.min(SLEEP_MAX,
          st.drowsy + meterGain(st.by ? this.fighter(st.by) : null, gain));
        this.checkSleepThreshold(f, st, st.by);
      } else if (st.drowsy > 0) {
        st.drowsy = Math.max(0, st.drowsy - SLEEP_DECAY_PER_SEC * dt);
      }
    }
  }

  /**
   * Compare a fighter's damage tally against the last one we saw. Any increase while they
   * are asleep is what wakes them — and, if they were dreaming badly, what hits them twice.
   */
  private syncDamage(f: Fighter): void {
    const st = this.state(f);
    const delta = f.rawDamageTaken - st.lastRaw;
    st.lastRaw = f.rawDamageTaken;
    if (delta <= 0.5) return;
    if (st.asleepUntil <= this.now) return;
    this.wake(f, st, delta, 'damage');
  }

  private wake(f: Fighter, st: SleepState, jolt: number, why: 'damage' | 'natural'): void {
    const by = st.by;
    // Phobia (F+): they learn to fear the exact thing that did this, and only that thing.
    if (why === 'damage' && this.up(by, 'f')) {
      const tag = this.wakerTag(st);
      const stacks = (st.phobia.get(tag) ?? 0) + 1;
      st.phobia.set(tag, stacks);
      this.api.showFloatingText(f.x, f.y - 66,
        `😱 PHOBIA ×${stacks} — ${this.tagLabel(tag)}`, '#ff3b6b');
    }
    st.asleepUntil = 0;
    st.drowsy = 0;
    // Only lift the stun if it is the one sleep was renewing — something else may have a
    // longer hold on this body, and waking up is not a reason to break it.
    if (f.earthStunnedUntil <= this.now + 200) f.earthStunnedUntil = this.now;

    const hadNightmare = st.nightmareUntil > this.now;
    if (hadNightmare) {
      st.nightmareUntil = 0;
      st.nightmareAccum = 0;
    }

    if (why === 'damage' && hadNightmare && jolt > 0.5) {
      // The jolt: the hit that tore them out of it lands a second time. Applied as its own
      // strike rather than by pre-multiplying, because the first one has already resolved.
      const extra = Math.round(jolt * (NIGHTMARE_WAKE_MULT - 1));
      f.takeDamage(extra);
      st.lastRaw = f.rawDamageTaken;
      this.fx(by).ring(f.x, f.y, 8, 56, DRM.dread, 460, 5, 8);
      this.api.spawnHitFlash(f.x, f.y, DRM.dread);
      this.api.showFloatingText(f.x, f.y - 54, `💔 NIGHT TERROR ×${NIGHTMARE_WAKE_MULT}`, '#ff3b6b');
    }

    this.fx(by).stardust(f.x, f.y, 7, 26, 640, 7);
    this.api.showFloatingText(f.x, f.y - 40, why === 'damage' ? '⏰ AWAKE!' : '🥱 Woke up', '#d8e2ff');
  }

  /** Tips a fighter over into sleep once the meter is full. */
  private checkSleepThreshold(f: Fighter, st: SleepState, by: Owner): void {
    if (st.asleepUntil > this.now) return;
    if (st.drowsy < SLEEP_MAX) return;
    if (f.unstoppable) {
      // Nothing that ignores stuns is going to lie down for a pendulum either.
      st.drowsy = SLEEP_MAX * 0.99;
      this.api.showFloatingText(f.x, f.y - 44, '☕ WIDE AWAKE', '#ffd98a');
      return;
    }
    st.asleepUntil = this.now + SLEEP_MS;
    st.by = by;
    this.record(by, 'sleepsInduced');
    this.body(f).setVelocity(0, 0);
    this.fx(by).zzzPuff(f.x, f.y);
    this.fx(by).ring(f.x, f.y, 10, 70, DRM.purple, 620, 5, 7);
    this.api.showFloatingText(f.x, f.y - 48, '😴 ASLEEP', '#8b5cf6');
  }

  // ── Rig ────────────────────────────────────────────────────────────────────

  private updateAvatars(delta: number, playerIs: boolean, npcIs: boolean): void {
    const { player, npc, scene } = this.api;

    if (playerIs && player?.active) {
      if (!this.playerAvatar) this.playerAvatar = new DreamAvatar(scene, this.pcol);
      const s = this.sides.player;
      const ax = this.lastAimX || player.x + 1;
      const ay = this.lastAimY || player.y;
      this.playerAvatar.setFacing(Math.atan2(ay - player.y, ax - player.x));
      this.playerAvatar.setSwing(this.swing.player);
      this.playerAvatar.setDrowsy(this.drowsyRatio(player));
      this.playerAvatar.setIntensity(s.tranceOn ? 1.2 : 1);
      this.playerAvatar.setMastered(this.api.masteryActive);
      // Away in the oasis: the rig goes with the body, and neither is on this screen.
      const gone = s.oasisUntil > this.now;
      this.playerAvatar.update(delta, player.x, player.y, gone ? 0 : player.alpha);
    } else if (this.playerAvatar) {
      this.playerAvatar.destroy();
      this.playerAvatar = null;
    }

    if (npcIs && npc?.active) {
      if (!this.npcAvatar) this.npcAvatar = new DreamAvatar(scene, this.ncol);
      const s = this.sides.npc;
      this.npcAvatar.setFacing(Math.atan2(player.y - npc.y, player.x - npc.x));
      this.npcAvatar.setSwing(this.swing.npc);
      this.npcAvatar.setDrowsy(this.drowsyRatio(npc));
      this.npcAvatar.setIntensity(s.tranceOn ? 1.2 : 1);
      this.npcAvatar.setMastered(this.api.npcMasteryActive);
      const gone = s.oasisUntil > this.now;
      this.npcAvatar.update(delta, npc.x, npc.y, gone || npc.forceInvisible ? 0 : npc.alpha);
    } else if (this.npcAvatar) {
      this.npcAvatar.destroy();
      this.npcAvatar = null;
    }
  }

  private drowsyRatio(f: Fighter): number {
    const st = this.sleep.get(f);
    if (!st) return 0;
    if (st.asleepUntil > this.now) return 1;
    return Phaser.Math.Clamp(st.drowsy / SLEEP_MAX, 0, 1);
  }

  // ── Painters ───────────────────────────────────────────────────────────────

  private paintWorld(delta: number): void {
    const gg = this.groundGfx;
    const ag = this.airGfx;
    const sg = this.sceneGfx;
    if (!gg || !ag || !sg) return;
    gg.clear();
    ag.clear();
    sg.clear();
    const time = this.now;

    // ── Dreamcatchers ──
    for (const c of this.catchers) {
      const rise = Math.min(1, (time - c.bornAt) / 260);
      const fade = Math.min(1, (c.until - time) / 400);
      const a = Math.max(0, Math.min(rise, fade));
      if (a <= 0.02) continue;
      dreamcatcherShape(gg, this.col(c.owner), c.x, c.y, CATCHER_RADIUS * rise, this.vizT, c.dreams, a);
      // A full catcher pulses, because a full one is worth walking to.
      if (c.dreams >= DREAM_CAP) {
        gg.lineStyle(2, this.col(c.owner)(DRM.water), a * (0.35 + 0.3 * Math.sin(this.vizT * 6)));
        gg.strokeCircle(c.x, c.y, CATCHER_RADIUS + 8 + Math.sin(this.vizT * 6) * 3);
      }

      // ── The thread, while it is pulling ──
      const src = c.draining;
      if (!src || !src.active) continue;
      const tint = this.col(c.owner);
      ag.lineStyle(1.4, tint(DRM.pale), 0.55);
      ag.beginPath();
      ag.moveTo(src.x, src.y);
      const segs = 10;
      for (let i = 1; i <= segs; i++) {
        const f = i / segs;
        const wob = Math.sin(this.vizT * 5 + f * 7) * 9 * Math.sin(f * Math.PI);
        const nx = -(c.y - src.y), ny = c.x - src.x;
        const len = Math.hypot(nx, ny) || 1;
        ag.lineTo(
          src.x + (c.x - src.x) * f + (nx / len) * wob,
          src.y + (c.y - src.y) * f + (ny / len) * wob,
        );
      }
      ag.strokePath();
      // A bead of dream travelling down the thread.
      const p = (this.vizT * 0.55) % 1;
      dreamOrb(ag, tint, src.x + (c.x - src.x) * p, src.y + (c.y - src.y) * p, 2.4, 0.9, this.vizT);
    }

    // ── The NPC's dream pocket ──
    // It gets no full-screen meadow (that is the local player's view of their own rest), so
    // its version is a bubble of somewhere else standing where the portal was: a scrap of
    // grass, a pool, and the falls coming down into it.
    const ns = this.sides.npc;
    if (ns.oasisGrow > 0.02) {
      const tint = this.ncol;
      const g = ns.oasisGrow;
      const r = 62 * g;
      const cx = ns.portalX, cy = ns.portalY;
      sg.fillStyle(tint(DRM.night), 0.85 * g);
      sg.fillCircle(cx, cy, r);
      sg.fillStyle(tint(DRM.grassDark), 0.85 * g);
      sg.fillEllipse(cx, cy + r * 0.62, r * 1.8, r * 0.75);
      sg.fillStyle(tint(DRM.waterDeep), 0.85 * g);
      sg.fillEllipse(cx, cy + r * 0.38, r * 1.15, r * 0.42);
      // The falls: a sheet with one bright strand running down it.
      sg.fillStyle(tint(DRM.water), 0.8 * g);
      sg.fillRect(cx - r * 0.16, cy - r * 0.62, r * 0.32, r * 1.02);
      const p = (this.vizT * 1.1) % 1;
      sg.fillStyle(tint(DRM.foam), 0.75 * g * (1 - p));
      sg.fillEllipse(cx, cy - r * 0.62 + r * p, r * 0.12, r * 0.3);
      sg.fillStyle(tint(DRM.foam), 0.7 * g);
      sg.fillEllipse(cx, cy - r * 0.6, r * 0.34, r * 0.1);
      sg.fillEllipse(cx, cy + r * 0.36, r * 0.5, r * 0.12);
      for (let i = 0; i < 7; i++) {
        const a = this.vizT * 0.7 + (i / 7) * Math.PI * 2;
        star(sg, tint, cx + Math.cos(a) * r * 0.7, cy + Math.sin(a) * r * 0.55,
          2.4, 0.8 * g, DRM.star, a);
      }
      sg.lineStyle(3, tint(DRM.violet), 0.8 * g);
      sg.strokeCircle(cx, cy, r);
    }

    // ── Pillow forts, on the floor with the dreamcatchers ──
    for (const fort of this.forts) {
      const rise = Math.min(1, (time - fort.bornAt) / 280);
      pillowFort(gg, this.col(fort.owner), fort.x, fort.y, fort.r * rise,
        fort.level, Phaser.Math.Clamp(fort.hp / fort.maxHp, 0, 1), this.vizT, rise);
      if (fort.level >= 5) {
        const aim = fort.owner === 'player'
          ? Math.atan2(this.lastAimY - fort.y, this.lastAimX - fort.x)
          : Math.atan2(this.api.player.y - fort.y, this.api.player.x - fort.x);
        cosmicCannon(ag, this.col(fort.owner), fort.x, fort.y - fort.r * 0.45, aim,
          fort.cannonArmed ? 1 : 0, this.vizT, rise);
      }
      // The HP bar. A fort you cannot read the health of is a fort you cannot decide to defend.
      const bw = fort.r * 1.6;
      ag.fillStyle(this.col(fort.owner)(DRM.night), 0.8);
      ag.fillRect(fort.x - bw / 2, fort.y + fort.r * 0.75, bw, 5);
      ag.fillStyle(this.col(fort.owner)(fort.hp / fort.maxHp > 0.35 ? DRM.pillow : DRM.dread), 1);
      ag.fillRect(fort.x - bw / 2, fort.y + fort.r * 0.75,
        bw * Phaser.Math.Clamp(fort.hp / fort.maxHp, 0, 1), 5);
    }

    // ── Ram sheep, over the floor and under the fighters ──
    for (const r of this.rams) {
      const fade = Math.min(1, (r.until - time) / 400);
      ag.fillStyle(this.col(r.owner)(DRM.night), fade * 0.25);
      ag.fillEllipse(r.x, r.y + 12, 26, 9);
      angryRam(ag, this.col(r.owner), r.x, r.y, 22, r.ang, this.vizT, fade);
    }

    // ── The thrown bob and the cannon's shells ──
    for (const b of this.thrown) {
      const ang = Math.atan2(b.vy, b.vx);
      // A tail of chain links behind it, so the throw reads as a released pendulum.
      for (let i = 1; i <= 4; i++) {
        ag.fillStyle(this.col(b.owner)(DRM.pale), (1 - i / 5) * 0.5);
        ag.fillCircle(b.x - Math.cos(ang) * i * 7, b.y - Math.sin(ang) * i * 7, 2.4 - i * 0.3);
      }
      pendulumBob(ag, this.col(b.owner), b.x, b.y, 9 + b.heat * 3, this.vizT, b.heat, 1);
    }
    for (const sh of this.shells) {
      const ang = Math.atan2(sh.vy, sh.vx);
      for (let i = 1; i <= 5; i++) {
        star(ag, this.col(sh.owner), sh.x - Math.cos(ang) * i * 9, sh.y - Math.sin(ang) * i * 9,
          4 - i * 0.5, (1 - i / 6) * 0.7, DRM.star, this.vizT * 3 + i);
      }
      ag.fillStyle(this.col(sh.owner)(DRM.violet), 0.4);
      ag.fillCircle(sh.x, sh.y, 13);
      ag.fillStyle(this.col(sh.owner)(DRM.deep), 0.9);
      ag.fillCircle(sh.x, sh.y, 8);
      star(ag, this.col(sh.owner), sh.x, sh.y, 8, 1, DRM.white, this.vizT * 4);
    }

    // ── Pendulums, portals and the rest halo ──
    for (const owner of ['player', 'npc'] as Owner[]) {
      const s = this.side(owner);
      const f = this.fighter(owner);
      if (this.isDream(owner)) this.paintRest(gg, ag, s, f, owner);
      if (s.pendulum) {
        const hidden = !this.isDream(owner) || !f?.active || s.oasisUntil > time;
        if (hidden) {
          s.pendulum.update(delta, f?.x ?? 0, f?.y ?? 0, f?.x ?? 0, f?.y ?? 0, TRANCE_R_MIN, 0, 0);
        } else {
          const a = this.anchorOf(owner);
          const heat = this.swing[owner];
          const radius = TRANCE_R_MIN + (TRANCE_R_MAX - TRANCE_R_MIN) * heat;
          s.pendulum.update(
            delta, a.x, a.y,
            a.x + Math.sin(s.theta) * PEND_LEN, a.y + Math.cos(s.theta) * PEND_LEN,
            radius, heat, 1,
          );
        }
      }
      if (s.portal) {
        const standing = f && Phaser.Math.Distance.Between(f.x, f.y, s.portalX, s.portalY) < PORTAL_ENTER_R * 1.6;
        s.portal.update(delta, s.portalX, s.portalY, PORTAL_RX, PORTAL_RY, s.portalOpen, standing ? 1 : 0);
        // Night Terrors (Q+): the doorway goes red when there is somebody asleep to drag into
        // it. Painted over the portal rather than built into it, so the tell is unmissable
        // without the portal itself having to know about the upgrade.
        if (s.portalOpen > 0.1 && this.terrorReady(owner)) {
          const a = s.portalOpen;
          for (let i = 0; i < 3; i++) {
            ag.lineStyle(3 - i * 0.7, this.col(owner)(DRM.dread),
              a * (0.75 - i * 0.18) * (0.6 + 0.4 * Math.sin(this.vizT * 5 - i)));
            ag.strokeEllipse(s.portalX, s.portalY,
              PORTAL_RX * 2 * a * (1 + i * 0.11), PORTAL_RY * 2 * a * (1 + i * 0.11));
          }
          ag.fillStyle(this.col(owner)(DRM.dreadDeep), a * 0.28);
          ag.fillEllipse(s.portalX, s.portalY, PORTAL_RX * 1.7 * a, PORTAL_RY * 1.7 * a);
        }
      }
    }

    // ── The local oasis ──
    const ps = this.sides.player;
    if (ps.oasis) {
      const inside = ps.oasisUntil > time;
      const pulse = inside ? Math.max(0, 1 - (ps.oasisHealAccum / OASIS_HEAL_TICK_MS)) : 0;
      ps.oasis.update(delta, ps.oasisGrow, this.api.width * 0.38, this.bottom - 74, pulse);
    }
  }

  /**
   * The duel: two abandoned bodies, two leashes, two threads, two spirits, and whatever the
   * spirit has in the air. Painted on the overhead layer so it sits over the fighters — the
   * spirits *are* the fighters, and a duel that renders underneath them would be invisible.
   */
  private paintDuel(): void {
    const g = this.airGfx;
    if (!g) return;
    const d = this.duel;

    // Live tears and bolts survive a duel ending by a frame or two, so they are painted
    // whether or not there is still a duel to paint them inside.
    for (const b of this.bolts) {
      hauntBolt(g, this.pcol, b.x, b.y, Math.atan2(b.vy, b.vx), 9, this.vizT + b.seed);
    }
    for (const t of this.tears) {
      for (const m of this.moonPositions(t)) {
        tearMoon(g, this.pcol, m.x, m.y, TEAR_MOON_R, this.vizT);
      }
      spiritTearShape(g, this.pcol, t.x, t.y, TEAR_R, this.vizT);
    }

    if (!d) {
      // The prompt: a duel that can be called says so, or nobody would ever find it.
      if (this.duelCandidate() && this.now >= this.duelReadyAt) {
        const p = this.api.player;
        const pulse = 0.45 + 0.35 * Math.sin(this.vizT * 5);
        g.lineStyle(2, this.pcol(DRM.spirit), pulse);
        g.strokeCircle(p.x, p.y, 30 + Math.sin(this.vizT * 5) * 3);
        for (let i = 0; i < 5; i++) {
          const a = this.vizT * 1.4 + (i / 5) * Math.PI * 2;
          star(g, this.pcol, p.x + Math.cos(a) * 36, p.y + Math.sin(a) * 36, 2.6, pulse, DRM.spirit, a);
        }
      }
      return;
    }

    const p = this.api.player;
    const v = d.victim;
    const pairs: Array<[Fighter, number, number, boolean]> = [
      [p, d.myAnchorX, d.myAnchorY, false],
      [v, d.foeAnchorX, d.foeAnchorY, true],
    ];
    for (const [f, ax, ay, hostile] of pairs) {
      if (!this.alive(f)) continue;
      const press = Phaser.Math.Clamp(
        Phaser.Math.Distance.Between(f.x, f.y, ax, ay) / DUEL_LEASH, 0, 1);
      leashRing(g, this.pcol, ax, ay, DUEL_LEASH, this.vizT, press * press, 1, hostile);
      // The body they stepped out of: slumped, faint, and still there.
      g.fillStyle(this.pcol(DRM.night), 0.5);
      g.fillEllipse(ax, ay + 16, 34, 12);
      g.fillStyle(this.pcol(hostile ? DRM.hauntDeep : DRM.spiritDeep), 0.42);
      g.fillEllipse(ax, ay + 4, 26, 30);
      g.fillStyle(this.pcol(DRM.night), 0.35);
      g.fillCircle(ax, ay - 9, 11);
      spiritThread(g, this.pcol, ax, ay, f.x, f.y, DUEL_LEASH, this.vizT, 1, hostile);
      spiritForm(g, this.pcol, f.x, f.y - 6, 22, this.vizT, 0.92, hostile,
        f === p ? Math.atan2(this.lastAimY - f.y, this.lastAimX - f.x) : Math.atan2(p.y - f.y, p.x - f.x));
    }
  }

  /**
   * Rest, seen from outside: a slow breathing ring around the feet and three zs climbing off
   * the head. Fades in over the first half second so a momentary pause does not flash it on.
   */
  private paintRest(
    gg: Phaser.GameObjects.Graphics,
    ag: Phaser.GameObjects.Graphics,
    s: Side, f: Fighter, owner: Owner,
  ): void {
    if (s.restSince === 0 || !f?.active || f.hp <= 0) return;
    const tint = this.col(owner);
    const a = Phaser.Math.Clamp((this.now - s.restSince) / 500, 0, 1);
    // Breathing, and timed off the heal accumulator so the ring swells into every tick.
    const breathe = 0.5 - 0.5 * Math.cos((s.restAccum / REST_TICK_MS) * Math.PI * 2);
    const rx = 40 + breathe * 9;
    const ry = 14 + breathe * 3.5;

    gg.fillStyle(tint(DRM.water), a * 0.1);
    gg.fillEllipse(f.x, f.y + 20, rx * 2, ry * 2);
    gg.lineStyle(2, tint(DRM.water), a * (0.28 + 0.34 * breathe));
    gg.strokeEllipse(f.x, f.y + 20, rx * 2, ry * 2);
    gg.lineStyle(1, tint(DRM.foam), a * 0.35 * (1 - breathe));
    gg.strokeEllipse(f.x, f.y + 20, rx * 2.5, ry * 2.5);
    for (let i = 0; i < 5; i++) {
      const ang = this.vizT * 0.5 + (i / 5) * Math.PI * 2;
      star(ag, tint, f.x + Math.cos(ang) * rx, f.y + 20 + Math.sin(ang) * ry,
        2, a * 0.55, DRM.star, ang);
    }

    // Three zs on a slow climb, each a third of a cycle behind the one above it.
    for (let i = 0; i < 3; i++) {
      const p = (this.vizT * 0.45 + i / 3) % 1;
      sleepyZ(ag, tint,
        f.x + 17 + Math.sin(p * 3.2 + i) * 7,
        f.y - 32 - p * 28,
        4.5 + p * 3.5,
        a * (1 - p) * 0.95,
        -0.18 + Math.sin(p * 2 + i) * 0.12);
    }
  }

  /** Sleep meters and heart traces, over the heads of everyone Dream is working on. */
  private paintOverhead(playerIsDream: boolean): void {
    const g = this.overheadGfx;
    if (!g) return;
    g.clear();
    const time = this.now;
    // The oasis covers the arena; the fight it is covering must not poke through it.
    if (playerIsDream && this.sides.player.oasisUntil > time) return;

    for (const [f, st] of this.sleep) {
      if (!f.active || f.hp <= 0) continue;
      const asleep = st.asleepUntil > time;
      const ratio = asleep ? 1 : st.drowsy / SLEEP_MAX;
      const tint = this.col(st.by);

      if (ratio > 0.005 || asleep) {
        sleepMeter(g, tint, f.x, f.y - 60, ratio, this.vizT, asleep, 1);
      }
      if (st.nightmareUntil > time) {
        // Sits above the sleep meter, so a fighter carrying both reads top-to-bottom.
        ekgTrace(g, this.col(st.nightmareBy), f.x, f.y - (ratio > 0.005 || asleep ? 78 : 62),
          46, 14, this.vizT * 0.55, 1);
      }
    }

    // Night Terrors: the bubble of somewhere else, over whoever is inside one.
    for (const tr of this.terrors) {
      if (!this.alive(tr.victim)) continue;
      nightTerror(g, this.col(tr.by), tr.victim.x, tr.victim.y, tr.kind, this.vizT,
        Phaser.Math.Clamp((tr.endsAt - time) / 400, 0, 1));
    }

    // Lifelong Dream: the counter while it is running, the crown once it has landed.
    const w = this.wish;
    const p = this.api.player;
    if (w && this.alive(p)) {
      if (!w.granted) {
        const left = Math.max(0, w.dueAt - time);
        wishCounter(g, this.pcol, p.x, p.y - 64, 15,
          Phaser.Math.Clamp(left / WISH_MS, 0, 1), this.vizT,
          Phaser.Math.Clamp((w.joltUntil - time) / WISH_JOLT_MS, 0, 1));
        if (!this.wishLabel) {
          this.wishLabel = this.api.scene.add.text(0, 0, '', {
            fontSize: '11px',
            fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
            color: '#ffd98a', stroke: '#05040f', strokeThickness: 3,
          }).setOrigin(0.5).setDepth(17);
        }
        this.wishLabel.setVisible(true);
        this.wishLabel.setPosition(p.x, p.y - 64);
        this.wishLabel.setText((left / 1000).toFixed(1));
        this.wishLabel.setColor(w.joltUntil > time ? '#ff3b6b' : '#ffd98a');
      } else {
        this.wishLabel?.setVisible(false);
        const def = findElementDef(w.elementId);
        dreamCrown(g, this.pcol, p.x, p.y - 38, 22, w.boons.length, this.vizT, 1,
          def?.color ?? DRM.wish);
      }
    } else {
      this.wishLabel?.setVisible(false);
    }
  }

  /**
   * The cosmic cursor. Hides the system pointer and draws a piece of sky in its place —
   * and, on the frame it crosses into a body, takes five off them.
   */
  private paintCursor(playerIsDream: boolean, delta: number): void {
    const g = this.cursorGfx;
    if (!g) return;
    g.clear();

    if (!playerIsDream) {
      this.releaseCursor();
    } else if (!this.cursorHidden) {
      this.cursorHidden = true;
      this.api.scene.input.setDefaultCursor('none');
    }

    // ── The NPC's phantom, when the AI is the one dreaming ──
    if (this.api.npcElementId === 'dream') this.updateGhostCursor(delta);

    if (!playerIsDream) return;
    const s = this.sides.player;
    const busy = s.oasisUntil > this.now || this.isAsleep(this.api.player);
    const cx = this.lastAimX;
    const cy = this.lastAimY;
    let struck = false;
    if (!busy) struck = this.resolveCursorHits(s, cx, cy, 'player');
    else s.cursorInside.clear();

    // Nebula head with a starfield in it, and a pointer tail so it still reads as a cursor.
    const t = this.vizT;
    g.fillStyle(this.pcol(DRM.violet), 0.22);
    g.fillCircle(cx, cy, 15 + (struck ? 7 : 0));
    g.fillStyle(this.pcol(DRM.deep), 0.55);
    g.fillCircle(cx, cy, 9);
    g.fillStyle(this.pcol(DRM.blue), 0.5);
    g.fillCircle(cx - 2, cy - 2, 6);
    for (let i = 0; i < 4; i++) {
      const a = t * 1.6 + (i / 4) * Math.PI * 2;
      star(g, this.pcol, cx + Math.cos(a) * 6, cy + Math.sin(a) * 6, 1.6, 0.85, DRM.white, a * 2);
    }
    // Arrowhead: a slim wedge pointing up-left out of the head, the way a pointer does.
    g.fillStyle(this.pcol(DRM.pale), 0.95);
    g.fillTriangle(cx, cy, cx + 1, cy + 17, cx + 11, cy + 11);
    g.fillStyle(this.pcol(DRM.purple), 0.9);
    g.fillTriangle(cx + 1, cy + 2, cx + 2, cy + 14, cx + 8.5, cy + 9.5);
    star(g, this.pcol, cx, cy, 6.5, 0.95, DRM.star, t * 2.2);

    // The ready-ring: solid while the cursor is clear of everything, hollow while it is
    // parked inside a body and can no longer score.
    const parked = s.cursorInside.size > 0;
    g.lineStyle(1.6, this.pcol(parked ? DRM.dread : DRM.pale), parked ? 0.75 : 0.5);
    g.strokeCircle(cx, cy, parked ? 13 + Math.sin(t * 9) : 11);
  }

  /**
   * The enter-and-leave rule, shared by the player's mouse and the NPC's phantom: a body is
   * only ever hit on the frame the pointer crosses into it, so damage comes from flicking on
   * and off a target rather than from resting on one.
   */
  private resolveCursorHits(s: Side, cx: number, cy: number, owner: Owner): boolean {
    const still = new Set<Fighter>();
    let struck = false;
    for (const t of this.targetsOf(owner)) {
      if (Phaser.Math.Distance.Between(cx, cy, t.x, t.y) > CURSOR_HITBOX) continue;
      still.add(t);
      if (s.cursorInside.has(t)) continue;
      this.strike(t, CURSOR_DAMAGE, 'dream:cursor');
      this.attackTag = 'dream:cursor';
      this.syncDamage(t);
      this.attackTag = null;
      struck = true;
      this.api.spawnHitFlash(t.x, t.y, DRM.pale);
      this.fx(owner).stardust(t.x, t.y, 4, 16, 420, 8);
      this.api.showFloatingText(t.x, t.y - 34, `✨ ${CURSOR_DAMAGE}`, '#d8e2ff');
    }
    s.cursorInside = still;
    return struck;
  }

  /**
   * The AI has no mouse, so its passive is a drifting eye that hunts the player and shoves
   * itself back out again the moment it lands — which is exactly the in-and-out motion the
   * passive rewards a human for doing by hand.
   */
  private updateGhostCursor(delta: number): void {
    const s = this.sides.npc;
    const npc = this.api.npc;
    const target = this.api.player;
    if (!npc?.active || !target?.active || target.hp <= 0) return;
    if (s.oasisUntil > this.now || this.isAsleep(npc)) { s.cursorInside.clear(); return; }
    if (s.ghostX === 0 && s.ghostY === 0) { s.ghostX = npc.x; s.ghostY = npc.y; }

    const dt = Math.min(0.05, delta / 1000);
    const d = Phaser.Math.Distance.Between(s.ghostX, s.ghostY, target.x, target.y);
    const ang = Math.atan2(target.y - s.ghostY, target.x - s.ghostX);
    // Attracted from outside, repelled from within: the eye orbits in and out on its own.
    const pull = d < CURSOR_HITBOX ? -1500 : 900;
    s.ghostVx += Math.cos(ang) * pull * dt;
    s.ghostVy += Math.sin(ang) * pull * dt;
    s.ghostVx *= 0.93;
    s.ghostVy *= 0.93;
    s.ghostX += s.ghostVx * dt;
    s.ghostY += s.ghostVy * dt;

    const struck = this.resolveCursorHits(s, s.ghostX, s.ghostY, 'npc');
    const ag = this.airGfx;
    if (!ag) return;
    const t = this.vizT;
    ag.fillStyle(this.ncol(DRM.violet), 0.24);
    ag.fillCircle(s.ghostX, s.ghostY, 14 + (struck ? 6 : 0));
    ag.fillStyle(this.ncol(DRM.deep), 0.7);
    ag.fillEllipse(s.ghostX, s.ghostY, 20, 12);
    ag.fillStyle(this.ncol(DRM.pale), 0.95);
    ag.fillCircle(s.ghostX, s.ghostY, 5);
    ag.fillStyle(this.ncol(DRM.night), 1);
    ag.fillCircle(s.ghostX + Math.cos(t * 2) * 1.6, s.ghostY + Math.sin(t * 2) * 1.6, 2.4);
    star(ag, this.ncol, s.ghostX, s.ghostY, 8, 0.6, DRM.star, t * 2);
  }

  /** The swing gauge and the dreams currently hanging in your catchers. */
  private paintHud(playerIsDream: boolean): void {
    const g = this.hudGfx;
    if (!g) return;
    g.clear();
    if (!playerIsDream) {
      this.hudLabel?.setVisible(false);
      return;
    }

    const s = this.sides.player;
    const w = 190, h = 12;
    const x = this.left + 8;
    const y = this.top + 8;
    const heat = this.swing.player;

    g.fillStyle(0x05040f, 0.85);
    g.fillRoundedRect(x - 3, y - 3, w + 6, h + 6, 4);
    g.lineStyle(1.5, this.pcol(DRM.violet), 0.7);
    g.strokeRoundedRect(x - 3, y - 3, w + 6, h + 6, 4);
    g.fillStyle(this.pcol(DRM.deep), 0.9);
    g.fillRect(x, y, w, h);
    g.fillStyle(this.pcol(s.tranceOn ? DRM.purple : DRM.night), 1);
    g.fillRect(x, y, w * heat, h);
    g.fillStyle(this.pcol(DRM.pale), 0.5);
    g.fillRect(x, y, w * heat, h * 0.36);
    g.lineStyle(1, 0x05040f, 0.7);
    for (let i = 1; i < 4; i++) g.lineBetween(x + (w * i) / 4, y, x + (w * i) / 4, y + h);

    // Dream pips: one per dream sitting in a catcher, waiting to be walked over.
    const held = this.catchers
      .filter((c) => c.owner === 'player')
      .reduce((n, c) => n + c.dreams, 0);
    for (let i = 0; i < DREAM_CAP * CATCHER_MAX; i++) {
      const px = x + 5 + i * 12;
      const py = y + h + 16;
      if (i < held) dreamOrb(g, this.pcol, px, py, 2.6, 1, this.vizT + i);
      else {
        g.lineStyle(1, this.pcol(DRM.deep), 0.7);
        g.strokeCircle(px, py, 3);
      }
    }

    if (!this.hudLabel) {
      this.hudLabel = this.api.scene.add.text(x, y + h + 24, '', {
        fontSize: '10px',
        fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
        color: '#d8e2ff',
        stroke: '#05040f',
        strokeThickness: 3,
      }).setDepth(21).setScrollFactor(0);
    }
    this.hudLabel.setVisible(true);
    const fort = this.fortOf('player');
    const fortLine = fort
      ? `   FORT L${fort.level} ${Math.max(0, Math.round(fort.hp))}`
      : '';
    this.hudLabel.setText(
      s.tranceOn
        ? `SPIN ${Math.round(heat * 100)}%   DREAMS ${held}${fortLine}`
        : `PENDULUM DOWN — CLICK, THEN CIRCLE   DREAMS ${held}${fortLine}`,
    );
    this.hudLabel.setColor(s.tranceOn && heat > 0.6 ? '#8b5cf6' : '#d8e2ff');
  }

  /** Everything Dream is doing to the local player, for the top-right tray. */
  private pushStatuses(playerIsDream: boolean): void {
    const time = this.now;
    const p = this.api.player;
    const s = this.sides.player;
    const st = this.sleep.get(p);

    this.api.setStatusIndicator('dream-trance', playerIsDream && s.tranceOn ? {
      name: 'Trance', emoji: '🌀', color: DRM.purple,
      description: 'A pendulum is hanging off your hand, and your hand goes where the cursor does. Circle the cursor around yourself to wind it — the harder you spin, the wider the drowsy field and the faster anything in it goes under.',
      count: Math.round(this.swing.player * 100), suffix: '%', priority: 110,
    } : null);

    const fort = this.fortOf('player');
    this.api.setStatusIndicator('dream-fort', playerIsDream && fort ? {
      name: `Pillow Fort L${fort!.level}`, emoji: '🏰', color: DRM.pillow,
      description: [
        `${Math.max(0, Math.round(fort!.hp))} / ${fort!.maxHp} HP. Enemy shots stop dead in it; yours go straight through. Another pillow into it heals ${FORT_HEAL} and promotes it.`,
        fort!.level >= 2 ? `Resting inside pays +${this.fortRestBonus('player', this.api.player) || FORT_REST_BONUS} HP/s on top of the passive.` : '',
        fort!.level >= 4 ? 'A ram charges out of it every 12 seconds.' : '',
        fort!.level >= 5
          ? (fort!.cannonArmed
            ? 'The cannon is loaded — your next click is the shot.'
            : (time < fort!.cannonReadyAt
              ? `The cannon is cooling: ${Math.ceil((fort!.cannonReadyAt - time) / 1000)}s.`
              : 'Space while standing on it loads the cosmic cannon.'))
          : '',
      ].filter(Boolean).join(' '),
      count: Math.max(0, Math.round(fort!.hp)), priority: 111,
    } : null);

    const buffs = s.buffs;
    this.api.setStatusIndicator('dream-good', playerIsDream && buffs.length ? {
      name: 'Good Dreams', emoji: '✨', color: DRM.sun,
      description: (['swift', 'fierce', 'tough', 'mending'] as GoodBuffKind[])
        .filter((k) => this.countBuff('player', k) > 0)
        .map((k) => `${GOOD_BUFFS[k].emoji} ${GOOD_BUFFS[k].name} ×${this.countBuff('player', k)} — ${GOOD_BUFFS[k].blurb}`)
        .join('. ') + '.',
      count: buffs.length,
      until: Math.max(...buffs.map((b) => b.until)), priority: 109,
    } : null);

    const myTerror = this.terrors.find((tr) => tr.victim === p);
    this.api.setStatusIndicator('dream-terror', myTerror ? {
      name: 'Night Terror', emoji: '😱', color: DRM.dread,
      description: [
        'Something has you, and you do not get to act your way out of it. When it lets go: 12 seconds of dealing a third less and moving a third slower.',
        'Something has you, and you do not get to act your way out of it. When it lets go: 5 seconds stunned by the landing.',
        'Something has you, and you do not get to act your way out of it. When it lets go: 5 damage a second for 10 seconds.',
      ][myTerror.kind],
      until: myTerror.endsAt, priority: 10,
    } : null);

    const myState = this.sleep.get(p);
    this.api.setStatusIndicator('dream-exhausted', myState && myState.exhaustedUntil > time ? {
      name: 'Exhausted', emoji: '😰', color: DRM.dread,
      description: `Soaked through and out of breath. You deal ${Math.round((1 - TERROR_EXHAUST_MULT) * 100)}% less damage and move ${Math.round((1 - TERROR_EXHAUST_MULT) * 100)}% slower.`,
      until: myState!.exhaustedUntil, priority: 11,
    } : null);

    this.api.setStatusIndicator('dream-bleed', myState && myState.bleedUntil > time ? {
      name: 'Bitten', emoji: '🩸', color: DRM.dread,
      description: `${TERROR_BLEED_DAMAGE} damage a second from a bite that happened in a dream.`,
      until: myState!.bleedUntil, priority: 11,
    } : null);

    const phobias = myState?.phobia;
    this.api.setStatusIndicator('dream-phobia', phobias && phobias.size ? {
      name: 'Phobia', emoji: '😱', color: DRM.dreadDeep,
      description: [...phobias.entries()]
        .map(([tag, n]) => `${this.tagLabel(tag)}: +${Math.round(n * PHOBIA_PER_STACK * 100)}%`)
        .join(', ') + ' — for the rest of the match.',
      count: [...phobias.values()].reduce((a, b) => Math.max(a, b), 0), priority: 9,
    } : null);

    this.api.setStatusIndicator('dream-rest', playerIsDream && s.restSince > 0 ? {
      name: 'Rest', emoji: '💤', color: DRM.water,
      description: `Standing still. ${REST_HEAL} HP every second you stay put — the first step you take ends it and starts the count again.`,
      count: REST_HEAL, suffix: '/s', priority: 108,
    } : null);

    this.api.setStatusIndicator('dream-oasis', playerIsDream && s.oasisUntil > time ? {
      name: 'Oasis', emoji: '🏞️', color: DRM.water,
      description: `Asleep in a meadow under a waterfall. ${OASIS_HEAL} HP a second, untouchable, and out of sight until you are healed or the place collapses.`,
      until: s.oasisUntil, priority: 100,
    } : null);

    this.api.setStatusIndicator('dream-asleep', st && st.asleepUntil > time ? {
      name: 'Asleep', emoji: '😴', color: DRM.violet,
      description: 'Out cold — no moving, no casting. Any damage at all wakes you up instantly.',
      until: st.asleepUntil, priority: 12,
    } : null);

    this.api.setStatusIndicator('dream-drowsy', st && st.asleepUntil <= time && st.drowsy > 0.5 ? {
      name: 'Drowsy', emoji: '🥱', color: DRM.blue,
      description: 'Sleepiness is stacking up. At 100% you fall asleep for 8 seconds. Get out of the pendulum\'s reach and it wears off.',
      count: Math.round(st!.drowsy), suffix: '%', priority: 13,
    } : null);

    // ── Mastery ──
    this.api.setStatusIndicator('dream-duel', this.duel ? {
      name: 'Dream Duel', emoji: '👻', color: DRM.spirit,
      description: `Your spirit is out and theirs is too. Nothing can hurt you and nothing can heal you, they cannot cast at all, and neither of you may go more than ${DUEL_LEASH}px from the body you left. Click haunts for ${HAUNT_DAMAGE}×${HAUNT_SHOTS}; E tears for ${TEAR_DAMAGE}.`,
      until: this.duel.until, priority: 120,
    } : null);

    const w = this.wish;
    this.api.setStatusIndicator('dream-wish', w && !w.granted ? {
      name: 'Lifelong Dream', emoji: '🌠', color: DRM.wish,
      description: `Dreaming of ${findElementDef(w.elementId)?.name ?? w.elementId}. Every hit you take puts ${WISH_HIT_PENALTY_MS / 1000} seconds back on the counter — when it reaches zero you are given every buff that element could ever have.`,
      until: w.dueAt, priority: 119,
    } : null);

    this.api.setStatusIndicator('dream-granted', w && w.granted ? {
      name: `Dream of ${findElementDef(w!.elementId)?.name ?? w!.elementId}`, emoji: '✨', color: DRM.wish,
      description: w!.boons.map((b) => `${b.emoji} ${b.name} — ${b.blurb}`).join(' '),
      count: w!.boons.length, priority: 118,
    } : null);

    this.api.setStatusIndicator('dream-nightmare', st && st.nightmareUntil > time ? {
      name: 'Nightmare', emoji: '💔', color: DRM.dread,
      description: `${NIGHTMARE_TICK_DAMAGE} damage a second, and it will not wake you. Whatever does wake you while it lasts hits ${NIGHTMARE_WAKE_MULT}× as hard.`,
      until: st.nightmareUntil, priority: 14,
    } : null);
  }

  // ── Accessors read by ArenaScene / the NPC ─────────────────────────────────

  /**
   * Good Dreams' haste and the corridor's exhaustion, pulled by ArenaScene rather than pushed —
   * DreamKit.update() runs long after the frame's movement has already resolved.
   */
  private speedMultFor(owner: Owner): number {
    let mult = 1;
    if (this.isDream(owner)) mult *= 1 + 0.12 * this.countBuff(owner, 'swift');
    const st = this.sleep.get(this.fighter(owner));
    if (st && st.exhaustedUntil > this.now) mult *= TERROR_EXHAUST_MULT;
    // Lifelong Dream is the player's alone, and the picker holds them where they stand.
    if (owner === 'player') {
      mult *= this.boonTotals().speed;
      if (this.picker?.isOpen()) mult = 0;
    }
    return mult;
  }

  getPlayerSpeedMult(): number { return this.speedMultFor('player'); }
  getNpcSpeedMult(): number { return this.speedMultFor('npc'); }

  /**
   * Pillow Fort (E+): Space is the cannon's loader while you are standing on a level-5 fort,
   * so ArenaScene's dodge block stands down — one press can never be both a load and a roll.
   */
  suppressesDodge(): boolean {
    if (this.api.elementId !== 'dream') return false;
    // Dream Duel: Space calls a duel, and a duel is not a roll. Also while one is running —
    // a spirit that can dodge out of its own leash is not on a leash.
    if (this.duel || this.canCallDuel()) return true;
    const fort = this.fortOf('player');
    return !!fort && fort.level >= FORT_MAX_LEVEL && this.standingOnFort(this.api.player, fort);
  }

  /** True while a Dream Duel is running — ArenaScene swaps the ability tray on this. */
  isDuelling(): boolean { return !!this.duel; }

  /**
   * Whether the npc's AI must stand down because Dream has put it to sleep.
   *
   * Not the same question as `isAsleep`: a duel victim is asleep and *must still be able to
   * move*, because dodging is the only thing the duel leaves them. ArenaScene reads this
   * rather than `isAsleep` when it builds `NpcAiState.isLocked`.
   */
  locksNpcAi(): boolean {
    const npc = this.api.npc;
    if (!npc) return false;
    if (this.duel && this.duel.victim === npc) return false;
    return this.isAsleep(npc);
  }

  /** True while this fighter is out cold. */
  isAsleep(f: Fighter): boolean {
    const st = this.sleep.get(f);
    return !!st && st.asleepUntil > this.now;
  }

  /**
   * True while the local player is asleep, away in the oasis, or standing in the Lifelong
   * Dream picker — WASD is not part of any of the three, and in the picker's case those keys
   * are letters being typed into a search box.
   */
  isPlayerLocked(): boolean {
    return this.isAsleep(this.api.player)
      || this.sides.player.oasisUntil > this.now
      || !!this.picker?.isOpen()
      || this.terrors.some((t) => t.victim === this.api.player);
  }

  /** True while a side is resting. Its own AI must not act, and nothing can reach it. */
  isInOasis(owner: Owner): boolean { return this.side(owner).oasisUntil > this.now; }

  /** 0–100 sleepiness on a fighter. */
  getDrowsy(f: Fighter): number {
    const st = this.sleep.get(f);
    if (!st) return 0;
    return st.asleepUntil > this.now ? SLEEP_MAX : st.drowsy;
  }

  isTranceOn(owner: Owner): boolean { return this.side(owner).tranceOn; }

  getCatcherCount(owner: Owner): number {
    return this.catchers.filter((c) => c.owner === owner).length;
  }

  /** NPC pacing gate — the AI is not allowed to carpet the floor with dreamcatchers. */
  canPlaceCatcher(owner: Owner, time: number): boolean {
    const s = this.side(owner);
    if (time < s.nextCatcherAt) return false;
    s.nextCatcherAt = time + 2500;
    return true;
  }

  /**
   * Ability tray fill. Trance is a toggle, so its card reads "on" rather than counting down
   * a cooldown nobody is waiting for.
   */
  getBarRatio(abilityId: string, time: number): number {
    if (abilityId === 'dream-trance' && this.sides.player.tranceOn) return 1;
    if (abilityId === LIFELONG_ID) {
      // Once the dream has come true the card is spent for the rest of the match, and a bar
      // draining toward a cooldown nobody can spend would be a lie.
      if (this.wish) return this.wish.granted ? 1 : 1 - Phaser.Math.Clamp(
        (this.wish.dueAt - time) / WISH_MS, 0, 1);
      return Phaser.Math.Clamp((time - this.lifelongAt) / LIFELONG_COOLDOWN_MS, 0, 1);
    }
    void time;
    return this.api.player.getCooldownRatio(abilityId);
  }
}
