import Phaser from 'phaser';
import { Fighter } from '../entities/Fighter';
import { Husk, HuskWorld } from '../invasion/Husk';
import { HuskVariantDef } from '../invasion/HuskVariants';
import {
  DisgracedFx, KING, MechArmPose, MechPose,
  MECH_HEAD_CY, MECH_HEAD_HIT_R, MECH_FIST_REST_DX, MECH_FIST_REST_Y,
} from './DisgracedKingVisuals';
import { DevouredFx, DEVOUR } from './DevourerVisuals';
import * as PlayerData from '../data/PlayerData';
import { Sfx } from '../audio';

/**
 * The Disgraced King — the fight behind the shop's sealed door.
 *
 * Modelled on InvasionKit: a narrow arena API, a `reset()` and an `update()`,
 * and every scrap of fight state owned here rather than in ArenaScene.
 *
 * The one structural decision worth knowing: the boss's damageable body **is**
 * ArenaScene's `npc`. Invasion's husks live in `enemies[]`, which only AoE and
 * the projectile overlap can reach — every kit that aims at `arena.npc` misses
 * them. Parking the boss in the npc slot instead means all thirty-odd element
 * kits fight it correctly with no per-kit work. Phase one puts that body inside
 * the mech's head (nothing else on the machine can be hurt); phase two moves it
 * into the King himself.
 *
 * Every attack is choreographed: a fixed repeating cycle with a telegraph on
 * each move, so the fight is learnable rather than reactive.
 */

// ── Numbers ──────────────────────────────────────────────────────────
// HP is deliberately *not* multiplied by HP_SCALE. Three phases at roughly
// 700 apiece against a 400 HP player is about five ordinary opponents' worth
// of health, which is where the last fight in the game should sit. The
// difficulty is carried by the *pressure*, not the pool: every phase runs a
// main attack cycle and an independent harassment track at the same time, so
// there is never a beat where nothing is coming at you.

const MECH_HP = 720;
const KING_HP = 700;
/** Phase three. Shorter than the other two on purpose — it is meant to be lethal, not long. */
const WRAITH_HP = 520;
/** The King is a normal-sized fighter — same hitbox every other Fighter has. */
const KING_HIT_R = 22;

const INTRO_MS = 2600;
/**
 * Breathing room a tagged-in element gets before the body it inherited starts
 * swinging again. Shorter than the intro — the fight is already underway and the
 * floor may still be covered in the last element's mistakes.
 */
const RESUME_GRACE_MS = 2000;
/** Beat between moves. Tightens once the current body is under half health. */
const REST_MS = 780;
const REST_MS_ENRAGED = 430;

/** Independent background attack track — see `updateHarass`. */
const HARASS_GRACE_MS = 3600;
const HARASS_MS_MECH = 2800;
const HARASS_MS_KING = 2500;
const HARASS_MS_WRAITH = 2000;
const HARASS_ENRAGED_MULT = 0.68;

// Laser
const LASER_WARN_MS = 850;
const LASER_FIRE_MS = 250;
const LASER_HALF_W = 36;
const LASER_DAMAGE = 38;

// Rockets
const ROCKET_COUNT = 14;
const ROCKET_FALL_MS = 2400;
const ROCKET_RADIUS = 58;
const ROCKET_DAMAGE = 20;

// Machine gun
const MG_DURATION_MS = 4400;
const MG_SPINUP_MS = 500;
const MG_INTERVAL_MS = 62;
const MG_SPEED = 430;
const MG_DAMAGE = 4;

// Slam
const SLAM_WARN_MS = 1000;
/** How long the fist takes to come down, carved out of the warning window. */
const SLAM_STRIKE_MS = 220;
const SLAM_RADIUS = 155;
const SLAM_DAMAGE = 62;

// Judgement Arc — the head's lance, swept across the hall
const SWEEP_WARN_MS = 900;
const SWEEP_TRAVEL_MS = 1700;
const SWEEP_HALF_W = 26;
const SWEEP_DAMAGE = 34;
/** Per-sweep re-hit gate, so standing in the beam costs you repeatedly but fairly. */
const SWEEP_HIT_GAP_MS = 420;

// Scatter charges. Six at ~150px leaves ~157px between neighbours against a
// 52px trigger, so the ring always has gaps to weave out through — a sealed
// ring would be an unavoidable hit, which is not the same thing as a hard one.
const MINE_COUNT = 6;
const MINE_ARM_MS = 1100;
const MINE_LIFE_MS = 15000;
const MINE_TRIGGER_R = 52;
const MINE_BLAST_R = 86;
const MINE_DAMAGE = 30;
const MINE_RING_R = 150;

// Quake rings. The gap drifts one consistent direction by less than its own
// half-width per ring, so standing in the first wedge keeps you alive through
// the second and asks for one small step before the third — the wave outruns
// the player (330 vs 200 px/s), so a gap that jumped would be a guaranteed hit.
const QUAKE_RINGS = 3;
const QUAKE_GAP_MS = 620;
const QUAKE_SPEED = 330;
const QUAKE_BAND = 30;
const QUAKE_GAP_HALF = 0.52;
const QUAKE_GAP_DRIFT = 0.35;
const QUAKE_DAMAGE = 26;

// Wreck interlude
const WRECK_MS = 3200;
const HEAL_ORB_COUNT = 3;
const HEAL_ORB_AMOUNT = 15;
const HEAL_ORB_PICKUP_R = 34;
/** Repair cells rot. Standing off and regenerating between phases is not on offer. */
const HEAL_ORB_LIFE_MS = 9000;

// Dark magic
const DARK_ORB_COUNT = 4;
const DARK_ORB_SPEED = 158;
/** Radians per second the orbs may steer — low enough to be out-manoeuvred. */
const DARK_ORB_TURN = Math.PI / 1.7;
const DARK_ORB_DAMAGE = 16;
const DARK_ORB_LIFE_MS = 9000;

// Purge
const PURGE_LANES = 4;
const PURGE_WARN_MS = 1000;
const PURGE_FIRE_MS = 400;
const PURGE_HALF_SPAN = 48;
const PURGE_DAMAGE = 30;

// Dark shield
const SHIELD_BULLETS = 46;
const SHIELD_SPEED = 190;
const SHIELD_DAMAGE = 9;
/** Second, slower ring fired half a slot out of phase — the gaps no longer line up. */
const SHIELD_INNER_SPEED = 112;
const SHIELD_INNER_DELAY_MS = 620;

// Regicide — the blink and the cleave that follows it
const BLINK_VANISH_MS = 330;
const BLINK_WINDUP_MS = 430;
const BLINK_RANGE = 74;
const CLEAVE_RADIUS = 165;
const CLEAVE_HALF_ANGLE = Math.PI * 0.44;
const CLEAVE_DAMAGE = 46;
const CLEAVE_SLOW_MS = 1200;

// Grasping Court
const GRASP_COUNT = 4;
const GRASP_WARN_MS = 520;
const GRASP_GAP_MS = 360;
const GRASP_RADIUS = 52;
const GRASP_DAMAGE = 22;
const GRASP_SLOW_MS = 1500;
const GRASP_SLOW_MULT = 0.42;
/** How far ahead of you a hand reaches — running in a straight line is punished. */
const GRASP_LEAD_MS = 260;

// The King's Decree. The warning has to cover the run: base player speed is
// 200 px/s, so 2.6s buys ~520px and the sanctuary is placed ~380px out — far
// enough to be a sprint, close enough that it is never simply unreachable.
const DECREE_WARN_MS = 2600;
const DECREE_RADIUS = 132;
const DECREE_DAMAGE = 58;
const DECREE_IDEAL_DIST = 380;

// Wheel of the Crown
const SPIRAL_MS = 2600;
const SPIRAL_ARMS = 3;
const SPIRAL_INTERVAL_MS = 105;
const SPIRAL_SPEED = 205;
const SPIRAL_SPIN = 2.1;
const SPIRAL_DAMAGE = 11;

// Floor sigils (harassment)
const RUNE_WARN_MS = 1500;
const RUNE_RADIUS = 78;
const RUNE_DAMAGE = 24;

// Summon
const KNIGHT_HP = 85;
const KNIGHT_SPEED = 132;
const KNIGHT_DAMAGE = 26;
const KNIGHTS_PER_SUMMON = 3;
const MAX_KNIGHTS = 8;
const HERALD_HP = 60;
const HERALD_SPEED = 96;
const HERALD_DAMAGE = 13;
const LANCER_HP = 70;
const LANCER_SPEED = 128;
const LANCER_DAMAGE = 30;

// The Last Coronation
/** Fires later than it used to — there is a real stretch of fight left after it. */
const ULT_HP_FRACTION = 0.3;
const ULT_COURTIERS = 12;
const ULT_COURTIER_DAMAGE = 10;
const ULT_SHARDS = 7;
const ULT_SHARD_DAMAGE = 14;
const ULT_RING_DAMAGE = 20;
const ULT_CROWN_DAMAGE = 70;
const ULT_STAGGER_MS = 900;

// The Crowned Wraith
const ASCEND_MS = 2600;
const WRAITH_SPEED = 158;
const WRAITH_HOLD = 90;
/** Shards that orbit the hall for the whole phase — a floor you have to read. */
const WRAITH_SHARDS = 6;
const WRAITH_SHARDS_ENRAGED = 9;
const WRAITH_SHARD_DAMAGE = 14;
const WAIL_RINGS = 3;
const WAIL_GAP_MS = 520;
const WAIL_SPEED = 300;
const WAIL_BAND = 28;
const WAIL_DAMAGE = 30;
/**
 * The one lane the scream leaves quiet. Every ring of a wail shares it, and it
 * is never opened where the player already stands — the wave is faster than
 * they are, so the only honest answer is a lane to run into.
 */
const WAIL_GAP_HALF = 0.58;

// ── Hard mode: The Devourer of Kings ─────────────────────────────────
//
// Hard mode is the same choreography, turned up and then extended. Every attack
// keeps its telegraph, its radius and its safe lane — what changes is how much
// health each body carries, how little time there is between moves, how hard a
// mistake costs, and the fact that there is a fourth thing at the end of it.
//
// The one flat rule the user asked for and the fight now enforces: **no heals**.
// The repair cells the mech drops and the two the crown leaves behind are both
// skipped outright, so the only health you get in hard mode is the health you
// walked in with.

/** Bodies one through three, hard. Roughly +35% each. */
const MECH_HP_HARD = 980;
const KING_HP_HARD = 950;
const WRAITH_HP_HARD = 720;
/** The fourth body. Shorter than its health suggests — it never stops attacking. */
const DEVOURER_HP = 1050;
/** Its hitbox: bigger than a fighter, well inside the drawn mass. */
const DEVOURER_HIT_R = 40;

const REST_MS_HARD = 540;
const REST_MS_ENRAGED_HARD = 290;
const HARASS_MS_DEVOURER = 1500;
const HARASS_MULT_HARD = 0.72;
/** Every point of damage the fight deals, scaled once at `hitPlayer`. */
const HARD_DAMAGE_MULT = 1.25;

/** The crown coming apart and what steps out of it. */
const CONSUME_MS = 4200;
const DEVOURER_SPEED = 132;
const DEVOURER_HOLD = 150;

// The Gullet. It inhales for the whole wind-up and then bites: one ring of
// teeth outward with a single quiet wedge. The pull is deliberately well under
// the player's 200 px/s — it makes crossing the room cost something, it never
// makes it impossible — and the wedge is opened near where the player already
// stands, because the bite is faster than they are.
const MAW_WARN_MS = 1500;
const MAW_PULL = 108;
const MAW_GAP_HALF = 0.66;
const MAW_SPEED = 330;
const MAW_BAND = 34;
const MAW_DAMAGE = 40;

// The Chorus of Kings. Five of the eaten, propped on the rim, each firing a
// lane inward on a stagger. 0.95s of warning against a 34px half-width is one
// short step — the pressure is that there are five and they overlap.
const CHORUS_COUNT = 5;
const CHORUS_GAP_MS = 460;
const CHORUS_WARN_MS = 950;
const CHORUS_FIRE_MS = 320;
const CHORUS_HALF_W = 34;
const CHORUS_DAMAGE = 26;
const CHORUS_LIFE_MS = 2600;

// Bile. Globs thrown around the player that leave ground you cannot stand on.
// The pools are the point: they take the arena away a piece at a time.
const BILE_COUNT = 7;
const BILE_FALL_MS = 1900;
const BILE_BLAST_R = 62;
const BILE_DAMAGE = 22;
const BILE_POOL_R = 84;
const BILE_POOL_MS = 7000;
const BILE_POOL_DAMAGE = 9;
const BILE_POOL_TICK_MS = 600;

// The Feast — the Devourer's set piece, once, at 45%. It holds itself open and
// four hearts come out on a ring. Kill them and it ends early and staggered;
// let the clock run and it closes up with nothing gained.
const FEAST_HP_FRACTION = 0.45;
const FEAST_MS = 15000;
const FEAST_HEARTS = 4;
const FEAST_HEART_HP = 60;
const FEAST_HEART_R = 190;
const FEAST_HEART_SIZE = 26;
const FEAST_STAGGER_MS = 2600;

/** The brood: small, fast, and there are always more. */
const LARVA_HP = 46;
const LARVA_SPEED = 158;
const LARVA_DAMAGE = 15;
const LARVA_PER_SPAWN = 4;
const MAX_LARVAE = 10;

/** The Devourer's own floor: rib shards that never stop and never despawn. */
const DEVOUR_SHARDS = 8;
const DEVOUR_SHARDS_ENRAGED = 11;

/** How long it takes to slump once it is beaten, before the choice is offered. */
const KNEEL_MS = 3000;

/**
 * The King's household. Kept here rather than in HUSK_VARIANTS so Invasion's
 * roll tables, boss pool and co-op wire indices are all untouched — the Husk
 * class only ever reads the def it is handed.
 */
const DISGRACED_KNIGHT: HuskVariantDef = {
  id: 'knight', name: 'Disgraced Knight', color: 0x241d33, behavior: 'melee',
  hpMult: 1, speedMult: 1, damageMult: 1, sizeMult: 1.05,
  minWave: 9999, weight: 0, weightRamp: 0, weightCap: 0,
};

/** Stands off and throws cold fire. Punishes fighting the melee knights at range. */
const DISGRACED_HERALD: HuskVariantDef = {
  id: 'herald', name: 'Disgraced Herald', color: 0x2a1240, behavior: 'ranged',
  hpMult: 1, speedMult: 1, damageMult: 1, sizeMult: 1,
  minWave: 9999, weight: 0, weightRamp: 0, weightCap: 0,
  preferredRange: 300,
};

/** Telegraphs a lane and charges down it. Punishes standing still to duel. */
const DISGRACED_LANCER: HuskVariantDef = {
  id: 'lancer', name: 'Disgraced Lancer', color: 0x342a49, behavior: 'charger',
  hpMult: 1, speedMult: 1, damageMult: 1, sizeMult: 1,
  minWave: 9999, weight: 0, weightRamp: 0, weightCap: 0,
};

/**
 * The brood. Reuses the knight's melee behaviour — small, quick, and spawned in
 * fours, so the answer is crowd control rather than duelling one.
 */
const DEVOURER_LARVA: HuskVariantDef = {
  id: 'larva', name: 'Brood', color: 0x5a1e33, behavior: 'melee',
  hpMult: 1, speedMult: 1, damageMult: 1, sizeMult: 0.8,
  minWave: 9999, weight: 0, weightRamp: 0, weightCap: 0,
};

/** How the fight finished. Only hard mode ever produces one. */
export type BossOutcome = 'spare' | 'kill';

/**
 * Where a tagged-in element picks the fight up.
 *
 * Deliberately shaped like the Sovereigns' `BossResumeState` so both travel in
 * the same `TagTeamState.bossResume` slot, plus the one thing this fight needs
 * that they do not: whether the body being handed on has already spent its
 * once-per-fight set piece (the Last Coronation, or the Feast).
 */
export interface KingResumeState {
  /** 0 mech · 1 King · 2 wraith · 3 Devourer. Interludes resolve forward to the next body. */
  phaseIdx: number;
  hp: number;
  setPieceUsed?: boolean;
}

/** The narrow surface the fight needs from ArenaScene. */
export interface DisgracedKingArenaApi {
  get scene(): Phaser.Scene;
  get player(): Fighter;
  /** The boss body — the mech's head in phase one, the King in phase two. */
  get npc(): Fighter;
  get enemies(): Fighter[];
  get width(): number;
  get height(): number;
  addEnemy(f: Fighter): void;
  removeEnemy(f: Fighter): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  spawnHitFlash(x: number, y: number, color: number): void;
  spawnDamageNumber(x: number, y: number, amount: number): void;
  /**
   * The boss is dead — end the match as a win. Hard mode passes the ending the
   * player chose, which is what decides whether Justice or Dream is granted.
   */
  bossVictory(outcome?: BossOutcome): void;
  /**
   * Hard mode's ending offers two buttons over a live playfield. Latching the
   * pointer stops a click on one of them from also firing the player's click
   * ability. Optional so the interface stays back-compatible with any caller
   * that predates hard mode.
   */
  setPointerLatched?(latched: boolean): void;
}

type Phase =
  | 'intro' | 'mech' | 'wreck' | 'king' | 'ascend' | 'wraith'
  /** Hard mode only: the crown splits, the Devourer, and the choice after it. */
  | 'consume' | 'devourer' | 'kneel'
  | 'done';
type MechMove = 'laser' | 'rockets' | 'machinegun' | 'slam' | 'sweep' | 'mines' | 'quake' | 'pincer';
type KingMove = 'darkmagic' | 'purge' | 'shield' | 'summon' | 'blink' | 'grasp' | 'decree' | 'spiral';
type WraithMove = 'wail' | 'blink' | 'spiral' | 'grasp' | 'crownfall' | 'decree' | 'purge' | 'darkmagic';
type DevourMove =
  | 'maw' | 'chorus' | 'bile' | 'brood' | 'tendrils'
  | 'wail' | 'blink' | 'spiral' | 'grasp' | 'crownfall' | 'decree' | 'darkmagic';
type Harass = 'snipe' | 'dropmine' | 'flak' | 'orbpair' | 'rune' | 'lane' | 'goldflak' | 'spores' | 'bilespit';

/**
 * Fixed rotations. Learnable on purpose — the fight is a dance, not a dice roll.
 * Each list is long enough that the loop is not obvious inside a single attempt,
 * and every entry is separated from its neighbours by the kind of movement it
 * demands: a lane to leave, a circle to leave, a circle to *enter*, a thing to
 * out-range, a thing to close on.
 */
const MECH_CYCLE: MechMove[] = [
  'laser', 'rockets', 'mines', 'machinegun', 'slam', 'quake',
  'sweep', 'rockets', 'pincer', 'laser', 'machinegun', 'mines',
  'quake', 'sweep', 'slam', 'pincer',
];
const KING_CYCLE: KingMove[] = [
  'darkmagic', 'grasp', 'purge', 'spiral', 'summon', 'blink',
  'darkmagic', 'shield', 'decree', 'purge', 'grasp', 'blink',
  'spiral', 'shield', 'summon', 'decree',
];
const WRAITH_CYCLE: WraithMove[] = [
  'wail', 'blink', 'spiral', 'grasp', 'crownfall', 'darkmagic',
  'wail', 'purge', 'blink', 'decree', 'grasp', 'spiral',
];

/**
 * The fourth body's rotation. Longer than the others so the loop is not obvious
 * inside one attempt, and arranged so no two neighbours ask for the same kind of
 * movement: a circle to leave, a lane to leave, ground to give up, a crowd to
 * clear, a circle to enter.
 */
const DEVOUR_CYCLE: DevourMove[] = [
  'maw', 'tendrils', 'chorus', 'grasp', 'bile', 'wail',
  'maw', 'brood', 'blink', 'spiral', 'bile', 'decree',
  'chorus', 'tendrils', 'darkmagic', 'crownfall', 'maw', 'brood',
];

const MECH_HARASS: Harass[] = ['snipe', 'dropmine', 'flak', 'snipe', 'flak', 'dropmine'];
const KING_HARASS: Harass[] = ['orbpair', 'rune', 'lane', 'orbpair', 'rune'];
const WRAITH_HARASS: Harass[] = ['orbpair', 'goldflak', 'rune', 'lane', 'goldflak'];
const DEVOUR_HARASS: Harass[] = ['spores', 'bilespit', 'orbpair', 'rune', 'spores', 'lane'];

interface ArmState {
  side: -1 | 1;
  x: number;
  y: number;
  phase: 'rest' | 'raise' | 'aim' | 'strike' | 'recover';
  targetX: number;
  targetY: number;
  phaseEnd: number;
}

interface Laser { x: number; firesAt: number; endsAt: number; dealt: boolean }
interface Rocket {
  x: number; y: number; tx: number; ty: number; startedAt: number; landsAt: number; landed: boolean;
  /** Hard mode's bile: the impact leaves ground you cannot stand on. */
  pool?: boolean;
}
type BulletKind = 'mg' | 'shield' | 'spiral' | 'herald';
interface Bullet { x: number; y: number; vx: number; vy: number; dieAt: number; damage: number; kind: BulletKind }
interface Slam { x: number; y: number; landsAt: number; landed: boolean }
interface HealOrb { x: number; y: number; taken: boolean; dieAt: number }
interface DarkOrb { hitbox: Fighter; x: number; y: number; angle: number; dieAt: number; dead: boolean }
interface PurgeLane { horizontal: boolean; centre: number; firesAt: number; endsAt: number; dealt: boolean }
interface Courtier { x: number; y: number; firesAt: number; fired: boolean; bornAt: number }
interface Shard { angle: number; radius: number; spin: number; lastHitAt: number }

/** Judgement Arc: a beam pinned to the mech's head, swept from `a0` to `a1`. */
interface Sweep { ox: number; oy: number; a0: number; a1: number; startsAt: number; endsAt: number; lastHitAt: number }
interface Mine { x: number; y: number; armedAt: number; dieAt: number; spent: boolean }
/** A quake or wail front: a ring that grows, with an optional survivable wedge. */
interface Ring {
  cx: number; cy: number; radius: number; speed: number; maxRadius: number;
  gapCentre: number; gapHalf: number; band: number; damage: number;
  lastHitAt: number; kind: 'quake' | 'wail' | 'gullet';
}
interface Grasp { x: number; y: number; firesAt: number; endsAt: number; dealt: boolean }
interface Decree { x: number; y: number; radius: number; firesAt: number; dealt: boolean; endsAt: number }
interface Rune { x: number; y: number; firesAt: number; dealt: boolean }
/** Regicide: the vanish, the rift he steps out of, and the cleave. */
interface BlinkStrike {
  toX: number; toY: number; arriveAt: number; strikeAt: number; endsAt: number;
  angle: number; arrived: boolean; struck: boolean;
}
interface SpiralCast { until: number; nextShotAt: number; angle: number }

/** The Gullet's wind-up: where the bite will come from and the lane it leaves. */
interface MawCast { cx: number; cy: number; gapCentre: number; gapHalf: number; startedAt: number; bitesAt: number }
/** One king of the chorus, and the lane it is about to put through the hall. */
interface ChorusKing {
  x: number; y: number;
  /** NaN until `armsAt` — each king picks its own lane when its turn comes up. */
  aim: number;
  armsAt: number;
  firesAt: number; endsAt: number; dieAt: number; dealt: boolean;
}
/** Ground the Devourer has taken away. Ticks rather than hitting once. */
interface BilePool { x: number; y: number; radius: number; bornAt: number; dieAt: number; lastHitAt: number }
/** A Feast heart: a destructible orbiting core, same trick as the dark orbs. */
interface Heart { hitbox: Fighter; angle: number; radius: number; x: number; y: number; dead: boolean; hurtUntil: number }

export class DisgracedKingKit {
  private phase: Phase = 'intro';
  private phaseStartedAt = 0;

  // ── Hard mode ──────────────────────────────────────────────────────
  /** Set by `reset(true)`. Everything below keys off it. */
  private hard = false;
  /**
   * The palette and the art the whole fight draws through. Swapping these two
   * references is what repaints every existing attack for hard mode — see
   * `DevourerVisuals`, which subclasses the normal fight's art rather than
   * replacing it, so anything not overridden falls back to the original.
   */
  private get P(): typeof KING { return this.hard ? DEVOUR : KING; }
  private get FX(): typeof DisgracedFx { return this.hard ? DevouredFx : DisgracedFx; }

  // The Devourer of Kings
  private devourStartedAt = 0;
  private maw: MawCast | null = null;
  /** Live suction: the player is dragged toward this point while it lasts. */
  private pullX = 0;
  private pullY = 0;
  private pullUntil = 0;
  private pullStrength = 0;
  private chorus: ChorusKing[] = [];
  private pools: BilePool[] = [];
  private larvae: Husk[] = [];
  private feastUsed = false;
  private feastActive = false;
  private feastStartedAt = 0;
  private hearts: Heart[] = [];
  private feastChorusAt = 0;
  /** The end: it is sat on the floor and the player has a decision to make. */
  private kneelStartedAt = 0;
  private choiceObjects: Phaser.GameObjects.GameObject[] = [];
  private choiceTaken: BossOutcome | null = null;

  // Choreographer
  private cycleIdx = 0;
  private busyUntil = 0;
  private nextMoveAt = 0;
  /**
   * The harassment track. Runs off its own clock and never touches `busyUntil`,
   * so a background attack can land in the middle of a scripted one — this is
   * what stops the fight from being a series of single, solvable puzzles.
   */
  private harassIdx = 0;
  private harassNextAt = 0;

  // Mech
  private arms: ArmState[] = [];
  private mgUntil = 0;
  private mgNextShotAt = 0;
  private mgArm: ArmState | null = null;
  private hurtFlashUntil = 0;

  // Hazards
  private lasers: Laser[] = [];
  private rockets: Rocket[] = [];
  private bullets: Bullet[] = [];
  private slams: Slam[] = [];
  private healOrbs: HealOrb[] = [];
  private darkOrbs: DarkOrb[] = [];
  private purges: PurgeLane[] = [];
  private knights: Husk[] = [];
  private sweeps: Sweep[] = [];
  private mines: Mine[] = [];
  private rings: Ring[] = [];
  private grasps: Grasp[] = [];
  private runes: Rune[] = [];
  private decree: Decree | null = null;
  private blink: BlinkStrike | null = null;
  private spiral: SpiralCast | null = null;

  // King
  private kingX = 0;
  private kingY = 0;
  private kingRise = 0;
  private kingCastingUntil = 0;
  /** Set while the King is mid-Regicide: he is off the board and must not be drawn. */
  private kingHiddenUntil = 0;
  private purgeHorizontalNext = true;
  private summonCount = 0;
  /** Slow the fight is applying to the player, read by ArenaScene each frame. */
  private playerSlowMult = 1;
  private playerSlowUntil = 0;

  // The Crowned Wraith
  private wraithStartedAt = 0;
  private orbitShards: Shard[] = [];

  // The Last Coronation
  private ultUsed = false;
  private ultStartedAt = 0;
  private ultActive = false;
  private courtiers: Courtier[] = [];
  private shards: Shard[] = [];
  private ringRadius = 0;
  private ringActive = false;
  private ringLastHitAt = 0;
  private crownX = 0;
  private crownY = 0;
  private crownLandsAt = 0;
  private crownLanded = false;
  private throneGrow = 0;
  private throneShatter = 0;
  private staggerUntil = 0;

  // Layers
  /** Hard mode only: the room the last phase happens inside. Sits over the hall. */
  private gulletG: Phaser.GameObjects.Graphics | null = null;
  private hallG: Phaser.GameObjects.Graphics | null = null;
  private groundG: Phaser.GameObjects.Graphics | null = null;
  private craterG: Phaser.GameObjects.Graphics | null = null;
  private mechBodyG: Phaser.GameObjects.Graphics | null = null;
  private mechHeadG: Phaser.GameObjects.Graphics | null = null;
  private throneG: Phaser.GameObjects.Graphics | null = null;
  private kingG: Phaser.GameObjects.Graphics | null = null;
  private armsG: Phaser.GameObjects.Graphics | null = null;
  private projG: Phaser.GameObjects.Graphics | null = null;
  private washG: Phaser.GameObjects.Graphics | null = null;
  private barG: Phaser.GameObjects.Graphics | null = null;
  private barLabel: Phaser.GameObjects.Text | null = null;

  /**
   * The slice of `HuskWorld` the King's court actually reaches. Heralds throw
   * (`fireShot`) and lancers mark a lane before charging it (`telegraph`);
   * nothing in the melee/ranged/charger behaviours touches the rest, so the
   * remaining hooks are honest no-ops rather than a second Invasion.
   */
  private readonly huskWorld: HuskWorld = {
    fireShot: (from, tx, ty, damage) => {
      const a = Math.atan2(ty - from.y, tx - from.x);
      this.bullets.push({
        x: from.x + Math.cos(a) * 22, y: from.y + Math.sin(a) * 22,
        vx: Math.cos(a) * 250, vy: Math.sin(a) * 250,
        dieAt: this.arena.scene.time.now + 5000,
        damage, kind: 'herald',
      });
    },
    summon: () => {},
    healNearbyHusks: () => {},
    telegraph: (x1, y1, x2, y2, color, durationMs) => {
      const g = this.arena.scene.add.graphics().setDepth(3);
      g.lineStyle(3, color, 0.75);
      g.lineBetween(x1, y1, x2, y2);
      g.lineStyle(9, color, 0.14);
      g.lineBetween(x1, y1, x2, y2);
      this.arena.scene.tweens.add({
        targets: g, alpha: 0, duration: durationMs, onComplete: () => g.destroy(),
      });
    },
    findPossessTarget: () => null,
    possess: () => {},
  };

  constructor(private arena: DisgracedKingArenaApi) {}

  // ── Lifecycle ──────────────────────────────────────────────────────

  /**
   * @param hard The Devourer of Kings. Same fight, harder numbers, no heals, a
   * fourth phase behind the third, and a completely repainted look.
   * @param resume A tag-team switch: the body, health and spent set piece the
   * element that just fell is handing on. Null starts the fight from the door.
   */
  reset(hard = false, resume: KingResumeState | null = null): void {
    const scene = this.arena.scene;
    const W = this.arena.width;
    const H = this.arena.height;
    const now = scene.time.now;

    // Set before `clearWorld` — the teardown draws nothing, but everything after
    // it reads `this.P` / `this.FX`, and those key off this flag.
    this.hard = hard;
    this.clearWorld();

    this.phase = 'intro';
    this.phaseStartedAt = now;
    this.cycleIdx = 0;
    this.busyUntil = 0;
    this.nextMoveAt = now + INTRO_MS;
    this.harassIdx = 0;
    this.harassNextAt = now + INTRO_MS + HARASS_GRACE_MS;
    this.hurtFlashUntil = 0;
    this.mgUntil = 0;
    this.mgArm = null;
    this.kingRise = 0;
    this.kingCastingUntil = 0;
    this.kingHiddenUntil = 0;
    this.purgeHorizontalNext = true;
    this.summonCount = 0;
    this.wraithStartedAt = 0;
    this.playerSlowMult = 1;
    this.playerSlowUntil = 0;
    this.decree = null;
    this.blink = null;
    this.spiral = null;
    this.ultUsed = false;
    this.ultActive = false;
    this.ultStartedAt = 0;
    this.throneGrow = 0;
    this.throneShatter = 0;
    this.staggerUntil = 0;
    this.ringActive = false;
    this.ringRadius = 0;
    this.ringLastHitAt = 0;
    this.crownLanded = false;
    this.crownLandsAt = 0;
    this.mgNextShotAt = 0;
    this.kingX = W / 2;
    this.kingY = H * 0.42;

    // Hard mode
    this.devourStartedAt = 0;
    this.maw = null;
    this.pullUntil = 0;
    this.pullStrength = 0;
    this.feastUsed = false;
    this.feastActive = false;
    this.feastStartedAt = 0;
    this.feastChorusAt = 0;
    this.kneelStartedAt = 0;
    this.choiceTaken = null;

    this.arms = ([-1, 1] as const).map((side) => ({
      side,
      x: W / 2 + side * MECH_FIST_REST_DX,
      y: MECH_FIST_REST_Y,
      phase: 'rest' as const,
      targetX: 0,
      targetY: 0,
      phaseEnd: 0,
    }));

    // ── Layers, back to front. Fighters sit at depth 5, so the machine's
    // body is behind them and its swinging arms are in front.
    this.hallG = scene.add.graphics().setDepth(-50);
    this.FX.drawHall(this.hallG, W, H);
    // The gullet is painted per-frame over the hall once the last phase starts,
    // so the room the fight began in is still under it.
    this.gulletG = scene.add.graphics().setDepth(-49);
    this.craterG = scene.add.graphics().setDepth(1);
    this.mechBodyG = scene.add.graphics().setDepth(2);
    this.groundG = scene.add.graphics().setDepth(3);
    this.throneG = scene.add.graphics().setDepth(4);
    this.mechHeadG = scene.add.graphics().setDepth(6);
    this.kingG = scene.add.graphics().setDepth(6);
    this.armsG = scene.add.graphics().setDepth(16);
    this.projG = scene.add.graphics().setDepth(17);
    this.washG = scene.add.graphics().setDepth(19);

    // ── The boss body. Hidden entirely — its art is drawn per-frame — and
    // pinned in place, since the choreographer decides where it is.
    const npc = this.arena.npc;
    npc.setMaxHp(hard ? MECH_HP_HARD : MECH_HP);
    npc.isInvincible = true;             // dropped when the intro ends
    npc.setAlpha(0);
    npc.forceInvisible = true;
    npc.hideHealthBar();
    npc.setActive(true).setVisible(false);
    const body = npc.body as Phaser.Physics.Arcade.Body;
    body.enable = true;
    body.setCollideWorldBounds(false);
    body.setImmovable(true);
    body.moves = false;
    this.setBodyRadius(MECH_HEAD_HIT_R);
    body.reset(W / 2, MECH_HEAD_CY);

    npc.on('damaged', (amount: number) => {
      if (amount > 0) this.hurtFlashUntil = this.arena.scene.time.now + 120;
    });
    npc.on('defeated', () => this.onBossBodyDefeated());

    // ── HUD: a boss bar just above the ability tray (which owns the bottom
    // 52px). The player's own bar owns the top of the arena (y=18), so this
    // never competes with it.
    this.barG = scene.add.graphics().setDepth(25);
    this.barLabel = scene.add.text(W / 2, H - 94, '', {
      fontSize: '13px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
      color: '#d8c4ff', stroke: '#0a0510', strokeThickness: 4, letterSpacing: 3,
    }).setOrigin(0.5).setDepth(26);

    // A tagged-in element walks into the fight already in progress, so the
    // opening announcement is not theirs to hear.
    if (resume) {
      this.resumeInto(resume, now);
      return;
    }

    if (hard) {
      this.banner('☠  THE DEVOURER OF KINGS  ☠', '#f0688f', 32);
      scene.time.delayedCall(1500, () => {
        if (this.phase === 'done') return;
        this.banner('NOTHING HERE WILL HEAL YOU', '#ffa0b2', 22);
      });
      scene.cameras.main.shake(700, 0.007);
    } else {
      this.banner('👑  THE DISGRACED KING', '#b98cff', 34);
      scene.cameras.main.shake(500, 0.004);
    }
  }

  /** The full pool of a resumable body, so an interlude hands the next one on whole. */
  private phasePoolHp(idx: number): number {
    switch (idx) {
      case 0: return this.hard ? MECH_HP_HARD : MECH_HP;
      case 1: return this.hard ? KING_HP_HARD : KING_HP;
      case 2: return this.hard ? WRAITH_HP_HARD : WRAITH_HP;
      default: return DEVOURER_HP;
    }
  }

  /**
   * What the element that just fell is handing on. Mid-interlude the current
   * pool is already spent and the next body has not been dealt yet, so the
   * handover resolves forward to that body at full health — which is exactly
   * where the fight would have picked up anyway.
   */
  getResumeState(): KingResumeState | null {
    const hp = Math.max(1, Math.round(this.arena.npc.hp));
    switch (this.phase) {
      case 'intro':    return { phaseIdx: 0, hp: this.phasePoolHp(0) };
      case 'mech':     return { phaseIdx: 0, hp };
      case 'wreck':    return { phaseIdx: 1, hp: this.phasePoolHp(1) };
      case 'king':     return { phaseIdx: 1, hp, setPieceUsed: this.ultUsed || this.ultActive };
      case 'ascend':   return { phaseIdx: 2, hp: this.phasePoolHp(2) };
      case 'wraith':   return { phaseIdx: 2, hp };
      case 'consume':  return { phaseIdx: 3, hp: this.phasePoolHp(3) };
      case 'devourer': return { phaseIdx: 3, hp, setPieceUsed: this.feastUsed || this.feastActive };
      // Beaten, mid-slump, with the choice not yet taken: hand the last body back
      // on its last point of health rather than replaying the whole phase.
      case 'kneel':    return { phaseIdx: 3, hp: 1, setPieceUsed: true };
      case 'done':     return null;
    }
  }

  /**
   * A tagged-in element picks the fight up where the last one dropped it: the
   * same body, the health it had left, and its set piece already spent.
   *
   * Deliberately *not* a replay of the phase handoffs. The wreck, the ascension
   * and the crown coming apart are one-time set pieces — sitting through one
   * again after a death would be the opposite of generous — so each branch here
   * does only the mechanical half of the handoff (pool, hitbox, position, floor)
   * and the fight resumes a beat later.
   */
  private resumeInto(resume: KingResumeState, now: number): void {
    const W = this.arena.width;
    const H = this.arena.height;
    const npc = this.arena.npc;
    // The fourth body exists only in hard mode; a stale state can never drop a
    // normal run into it.
    const idx = Phaser.Math.Clamp(Math.round(resume.phaseIdx), 0, this.hard ? 3 : 2);
    const hp = Phaser.Math.Clamp(Math.round(resume.hp), 1, this.phasePoolHp(idx));

    if (idx === 0) {
      // Still the machine. Everything the fresh-start setup did is right — only
      // the health it kept is different, and its intro doubles as the grace beat.
      npc.hp = hp;
      this.banner('IT IS STILL STANDING', '#ff9a4d', 26);
      return;
    }

    this.phase = idx === 1 ? 'king' : idx === 2 ? 'wraith' : 'devourer';
    this.phaseStartedAt = now;
    this.cycleIdx = 0;
    this.busyUntil = 0;
    this.hurtFlashUntil = 0;
    this.harassIdx = 0;
    this.harassNextAt = now + HARASS_GRACE_MS;
    this.nextMoveAt = now + RESUME_GRACE_MS;
    this.kingRise = 1;

    npc.setMaxHp(this.phasePoolHp(idx));
    npc.hp = hp;
    npc.isInvincible = false;

    if (idx === 1) {
      this.ultUsed = resume.setPieceUsed === true;
      this.setBodyRadius(KING_HIT_R);
      this.kingX = W / 2;
      this.kingY = H * 0.42;
      this.banner('👑  THE KING HIMSELF', '#b98cff', 30);
    } else if (idx === 2) {
      // The Coronation belonged to the body before this one.
      this.ultUsed = true;
      // Backdated so the pall the wraith drags over the hall is already fully up
      // rather than fading in on a fight that has been going for minutes.
      this.wraithStartedAt = now - 2000;
      this.setBodyRadius(KING_HIT_R);
      this.kingX = W / 2;
      this.kingY = H * 0.42;
      this.seedOrbitShards(WRAITH_SHARDS);
      this.banner('☠  THE CROWNED WRAITH  ☠', '#ffe9a8', 32);
    } else {
      this.ultUsed = true;
      this.feastUsed = resume.setPieceUsed === true;
      // Same trick as the veil: the gullet is already closed around the hall.
      this.devourStartedAt = now - 4000;
      this.setBodyRadius(DEVOURER_HIT_R);
      this.kingX = W / 2;
      this.kingY = H * 0.40;
      this.seedOrbitShards(DEVOUR_SHARDS);
      this.banner('☠  THE DEVOURER OF KINGS  ☠', '#bdfff0', 34);
    }

    this.driveKingBody();
    this.arena.scene.cameras.main.shake(500, 0.008);
  }

  /**
   * Sizes the boss body's hitbox, in real world pixels.
   *
   * Deliberately **not** `Fighter.sizeMult` + `applySizeMult()`. That pair does
   * `setScale(n)` *and* `setCircle(22 * n)`, and Phaser scales a circle body by
   * the sprite's scale as well — so the radius comes out multiplied twice. At
   * the head's size that turned an 84px hitbox into a ~320px one that swallowed
   * the torso and both arms. The body is invisible here anyway (the art is drawn
   * per-frame), so the sprite stays at scale 1 and the circle is set directly.
   */
  private setBodyRadius(r: number): void {
    const npc = this.arena.npc;
    npc.sizeMult = 1;
    npc.setScale(1);
    const body = npc.body as Phaser.Physics.Arcade.Body | null;
    // Offset places the circle's top-left relative to the 48×48 sprite's, so
    // `24 - r` centres it on the sprite.
    body?.setCircle(r, 24 - r, 24 - r);
  }

  /** Tears down everything the fight owns. Safe to call twice. */
  private clearWorld(): void {
    for (const g of [
      this.hallG, this.gulletG, this.groundG, this.craterG, this.mechBodyG, this.mechHeadG,
      this.throneG, this.kingG, this.armsG, this.projG, this.washG, this.barG,
    ]) g?.destroy();
    this.hallG = this.gulletG = this.groundG = this.craterG = this.mechBodyG = this.mechHeadG = null;
    this.throneG = this.kingG = this.armsG = this.projG = this.washG = this.barG = null;
    this.barLabel?.destroy();
    this.barLabel = null;
    this.teardownChoice();

    for (const o of this.darkOrbs) this.destroyDarkOrb(o);
    this.darkOrbs = [];
    for (const h of this.hearts) this.destroyHeart(h);
    this.hearts = [];
    for (const k of [...this.knights, ...this.larvae]) {
      this.arena.removeEnemy(k);
      if (k.scene) k.destroy();
    }
    this.knights = [];
    this.larvae = [];

    this.lasers = [];
    this.rockets = [];
    this.bullets = [];
    this.slams = [];
    this.healOrbs = [];
    this.purges = [];
    this.courtiers = [];
    this.shards = [];
    this.sweeps = [];
    this.mines = [];
    this.rings = [];
    this.grasps = [];
    this.runes = [];
    this.orbitShards = [];
    this.decree = null;
    this.blink = null;
    this.spiral = null;
    this.maw = null;
    this.chorus = [];
    this.pools = [];
    this.pullUntil = 0;
    this.pullStrength = 0;
    // The player keeps whatever the fight was doing to them otherwise.
    if (this.arena.player?.active) this.arena.player.walkSpeedMult = 1;
    this.playerSlowMult = 1;
    this.playerSlowUntil = 0;
  }

  update(time: number, delta: number): void {
    if (this.phase === 'done') return;
    const dt = delta / 1000;

    switch (this.phase) {
      case 'intro': this.updateIntro(time); break;
      case 'mech': this.updateMechPhase(time); break;
      case 'wreck': this.updateWreck(time); break;
      case 'king': this.updateKingPhase(time, dt); break;
      case 'ascend': this.updateAscend(time, dt); break;
      case 'wraith': this.updateWraithPhase(time, dt); break;
      case 'consume': this.updateConsume(time, dt); break;
      case 'devourer': this.updateDevourerPhase(time, dt); break;
      case 'kneel': this.updateKneel(time, dt); break;
    }

    this.updateHarass(time);
    this.updateArms(time, dt);
    this.updateLasers(time);
    this.updateRockets(time);
    this.updateBullets(time, dt);
    this.updateSlams(time);
    this.updateSweeps(time);
    this.updateMines(time);
    this.updateRings(time, dt);
    this.updateGrasps(time);
    this.updateRunes(time);
    this.updateDecree(time);
    this.updateBlink(time);
    this.updateSpiral(time);
    this.updateCrownFall(time);
    this.updateOrbitShards(time, dt);
    this.updateHealOrbs(time);
    this.updateDarkOrbs(time, dt);
    this.updatePurges(time);
    this.updateKnights(time, delta);
    this.updateMaw(time);
    this.updateChorus(time);
    this.updatePools(time);
    this.updateHearts(time, dt);
    this.updatePull(time, dt);
    this.updatePlayerSlow(time);
    if (this.ultActive) this.updateCoronation(time, dt);
    if (this.feastActive) this.updateFeast(time);

    this.draw(time);
    this.drawBossBar();
  }

  /**
   * The Gullet's inhale. Written straight onto the player's position rather
   * than their velocity: ArenaScene sets velocity from WASD every frame, and
   * `bossKit.update()` deliberately runs last, so a positional nudge here is the
   * only thing that survives to the next frame. Capped well under walk speed —
   * this makes crossing the room cost something, it never takes control away.
   */
  private updatePull(time: number, dt: number): void {
    if (time >= this.pullUntil || this.pullStrength <= 0) return;
    const p = this.arena.player;
    if (!p.active || p.hp <= 0) return;
    const dx = this.pullX - p.x;
    const dy = this.pullY - p.y;
    const d = Math.hypot(dx, dy);
    if (d < 30) return;
    const step = this.pullStrength * dt;
    p.x = Phaser.Math.Clamp(p.x + (dx / d) * step, 40, this.arena.width - 40);
    p.y = Phaser.Math.Clamp(p.y + (dy / d) * step, 40, this.arena.height - 40);
  }

  /**
   * Slows are held here rather than written straight onto the player, because
   * ArenaScene rebuilds `playerSpeedMult` from scratch every frame — see
   * `getPlayerSpeedMult`, which it folds in.
   */
  private updatePlayerSlow(time: number): void {
    if (this.playerSlowUntil > 0 && time >= this.playerSlowUntil) {
      this.playerSlowUntil = 0;
      this.playerSlowMult = 1;
    }
  }

  private slowPlayer(time: number, mult: number, durationMs: number): void {
    this.playerSlowMult = Math.min(this.playerSlowMult, mult);
    this.playerSlowUntil = Math.max(this.playerSlowUntil, time + durationMs);
  }

  // ── Phase flow ─────────────────────────────────────────────────────

  private updateIntro(time: number): void {
    if (time < this.nextMoveAt) return;
    this.phase = 'mech';
    this.phaseStartedAt = time;
    this.arena.npc.isInvincible = false;
    this.arena.showFloatingText(this.arena.width / 2, MECH_HEAD_CY + 130, 'STRIKE THE HEAD', '#ff8899');
    this.scheduleNext(time, 400);
  }

  private updateMechPhase(time: number): void {
    if (time < this.nextMoveAt || time < this.busyUntil) return;
    const move = MECH_CYCLE[this.cycleIdx % MECH_CYCLE.length];
    this.cycleIdx++;
    switch (move) {
      case 'laser':      this.castLaser(time); break;
      case 'rockets':    this.castRockets(time); break;
      case 'machinegun': this.castMachineGun(time); break;
      case 'slam':       this.castSlam(time); break;
      case 'sweep':      this.castSweep(time); break;
      case 'mines':      this.castMines(time); break;
      case 'quake':      this.castQuake(time); break;
      case 'pincer':     this.castPincer(time); break;
    }
  }

  /** The mech is dead: explosions, repair cells, and then the man inside it. */
  private updateWreck(time: number): void {
    const t = time - this.phaseStartedAt;
    if (t < WRECK_MS) return;

    this.phase = 'king';
    this.phaseStartedAt = time;
    this.cycleIdx = 0;

    const npc = this.arena.npc;
    npc.setMaxHp(this.hard ? KING_HP_HARD : KING_HP);
    npc.isInvincible = false;
    // Back to a player-sized target now the machine is off him.
    this.setBodyRadius(KING_HIT_R);
    this.kingX = this.arena.width / 2;
    this.kingY = this.arena.height * 0.42;
    (npc.body as Phaser.Physics.Arcade.Body).reset(this.kingX, this.kingY);

    this.banner('👑  THE KING HIMSELF', '#b98cff', 30);
    this.arena.scene.cameras.main.shake(400, 0.005);
    this.scheduleNext(time, 1400);
    this.harassIdx = 0;
    this.harassNextAt = time + HARASS_GRACE_MS;
  }

  private updateKingPhase(time: number, dt: number): void {
    const npc = this.arena.npc;
    this.kingRise = Math.min(1, this.kingRise + dt * 1.4);

    // The Last Coronation. Fired once, and he cannot die during it — the
    // invincibility flag stops ordinary hits and the HP clamp below stops
    // anything that pierces, so the whole set-piece always plays out.
    if (!this.ultUsed && !this.ultActive && npc.hp <= KING_HP * ULT_HP_FRACTION && npc.hp > 0) {
      this.beginCoronation(time);
    }
    if (this.ultActive) {
      npc.isInvincible = true;
      if (npc.hp < 1) npc.hp = 1;
      this.driveKingBody();
      return;
    }

    this.moveKing(time, dt);

    if (time < this.nextMoveAt || time < this.busyUntil) return;
    const move = KING_CYCLE[this.cycleIdx % KING_CYCLE.length];
    this.cycleIdx++;
    this.castKingMove(time, move);
  }

  /**
   * The King's attacks bypass the ability/cooldown system entirely, so they get
   * their voices here rather than through `Fighter.stampCast` like every element.
   */
  private static readonly MOVE_SOUNDS: Record<string, string> = {
    darkmagic: 'curse-cast', purge: 'dark-drain', shield: 'shield-up',
    summon: 'ghost-wail', blink: 'teleport', grasp: 'tentacle',
    decree: 'judgement', spiral: 'black-hole', wail: 'screech',
    crownfall: 'explosion-large',
    // Devourer phase.
    maw: 'roar', chorus: 'torment', bile: 'acid-spray',
    brood: 'spore', tendrils: 'tentacle', feast: 'nightmare',
  };

  private playMoveSound(move: string): void {
    const name = DisgracedKingKit.MOVE_SOUNDS[move];
    if (name) Sfx.playAt(name, this.arena.npc.x);
  }

  private castKingMove(time: number, move: KingMove | WraithMove): void {
    this.playMoveSound(move);
    switch (move) {
      case 'darkmagic':  this.castDarkMagic(time); break;
      case 'purge':      this.castPurge(time); break;
      case 'shield':     this.castDarkShield(time); break;
      case 'summon':     this.castSummon(time); break;
      case 'blink':      this.castBlink(time); break;
      case 'grasp':      this.castGrasp(time); break;
      case 'decree':     this.castDecree(time); break;
      case 'spiral':     this.castSpiral(time); break;
      case 'wail':       this.castWail(time); break;
      case 'crownfall':  this.castCrownfall(time); break;
    }
  }

  // ── Phase three: The Crowned Wraith ────────────────────────────────

  /**
   * The King's body gives out and the crown refuses the result. He comes back
   * up wearing it whole, and the hall goes out.
   */
  private beginAscend(time: number): void {
    const scene = this.arena.scene;
    const npc = this.arena.npc;

    this.phase = 'ascend';
    this.phaseStartedAt = time;
    this.wraithStartedAt = time;
    this.kingHiddenUntil = 0;
    // If a lingering hit killed him mid-Regicide he is parked off-screen; the
    // crown gathers him up in the middle of the hall regardless.
    if (this.kingX < 0 || this.kingY < 0) {
      this.kingX = this.arena.width / 2;
      this.kingY = this.arena.height * 0.42;
      this.driveKingBody();
    }

    npc.isInvincible = true;
    npc.hp = 0;
    npc.incomingDamageMultiplier = 1;

    // Everything he had out dies with the body — the court is dismissed too.
    this.bullets = [];
    this.purges = [];
    this.grasps = [];
    this.runes = [];
    this.decree = null;
    this.blink = null;
    this.spiral = null;
    this.rings = [];
    for (const o of this.darkOrbs) this.destroyDarkOrb(o);
    this.darkOrbs = [];
    for (const k of [...this.knights]) {
      this.boom(k.x, k.y, 40, this.P.gold);
      this.arena.removeEnemy(k);
      this.knights = this.knights.filter((o) => o !== k);
      if (k.scene) k.destroy();
    }

    this.banner('THE CROWN WILL NOT LET HIM DIE', '#ffc44d', 26);
    scene.cameras.main.shake(900, 0.014);
    scene.cameras.main.flash(500, 255, 200, 90);

    // The crown reassembles over the corpse, then hauls it upright.
    for (let i = 0; i < 5; i++) {
      scene.time.delayedCall(i * 260, () => {
        if (this.phase === 'done') return;
        const a = (i / 5) * Math.PI * 2;
        this.boom(this.kingX + Math.cos(a) * 60, this.kingY + Math.sin(a) * 44, 34, this.P.goldLit);
      });
    }
    scene.time.delayedCall(1500, () => {
      if (this.phase === 'done') return;
      scene.cameras.main.shake(500, 0.010);
      this.boom(this.kingX, this.kingY - 40, 150, this.P.gold);
      this.arena.showFloatingText(this.kingX, this.kingY - 90, 'RISE', '#ffe9a8');
    });

    // A last two repair cells — enough to matter, not enough to reset the fight.
    // Hard mode gets none: the whole run is on the health you brought.
    if (this.hard) return;
    scene.time.delayedCall(900, () => {
      if (this.phase === 'done') return;
      const W = this.arena.width;
      const H = this.arena.height;
      for (const side of [-1, 1] as const) {
        this.healOrbs.push({
          x: Phaser.Math.Clamp(W / 2 + side * 320, 60, W - 60),
          y: H * 0.78,
          taken: false,
          dieAt: this.arena.scene.time.now + HEAL_ORB_LIFE_MS,
        });
      }
    });
  }

  private updateAscend(time: number, dt: number): void {
    this.kingRise = Math.max(0, this.kingRise - dt * 0.9);
    this.driveKingBody();
    if (time - this.phaseStartedAt < ASCEND_MS) return;

    const W = this.arena.width;
    const H = this.arena.height;
    const npc = this.arena.npc;

    this.phase = 'wraith';
    this.phaseStartedAt = time;
    this.wraithStartedAt = time;
    this.cycleIdx = 0;
    this.kingRise = 0;
    npc.setMaxHp(this.hard ? WRAITH_HP_HARD : WRAITH_HP);
    npc.isInvincible = false;
    this.setBodyRadius(KING_HIT_R);
    this.kingX = W / 2;
    this.kingY = H * 0.42;
    this.driveKingBody();

    // The shard floor: a hazard that is simply always there from here on.
    this.orbitShards = [];
    this.seedOrbitShards(WRAITH_SHARDS);

    this.banner('☠  THE CROWNED WRAITH  ☠', '#ffe9a8', 32);
    this.arena.scene.cameras.main.shake(600, 0.012);
    this.scheduleNext(time, 1200);
    this.harassIdx = 0;
    this.harassNextAt = time + HARASS_GRACE_MS * 0.7;
  }

  private seedOrbitShards(count: number): void {
    const start = this.orbitShards.length;
    for (let i = start; i < count; i++) {
      this.orbitShards.push({
        angle: (i / count) * Math.PI * 2,
        radius: 130 + (i % 4) * 78,
        spin: (i % 2 === 0 ? 1 : -1) * (0.55 + (i % 3) * 0.18),
        lastHitAt: 0,
      });
    }
  }

  private updateWraithPhase(time: number, dt: number): void {
    this.kingRise = Math.min(1, this.kingRise + dt * 1.6);

    // Enrage adds shards to the floor rather than only speeding him up — the
    // room itself gets more dangerous as he gets closer to going out.
    if (this.isEnraged() && this.orbitShards.length < WRAITH_SHARDS_ENRAGED) {
      this.seedOrbitShards(WRAITH_SHARDS_ENRAGED);
      this.arena.showFloatingText(this.kingX, this.kingY - 60, 'THE CROWN SHATTERS AGAIN', '#ffc44d');
    }

    this.moveWraith(time, dt);

    if (time < this.nextMoveAt || time < this.busyUntil) return;
    const move = WRAITH_CYCLE[this.cycleIdx % WRAITH_CYCLE.length];
    this.cycleIdx++;
    this.castKingMove(time, move);
  }

  /** Unlike the King, the wraith closes. Standing off is not a strategy against it. */
  private moveWraith(time: number, dt: number): void {
    if (time < this.kingCastingUntil || time < this.kingHiddenUntil) { this.driveKingBody(); return; }
    const player = this.arena.player;
    const W = this.arena.width;
    const H = this.arena.height;

    const dx = player.x - this.kingX;
    const dy = player.y - this.kingY;
    const dist = Math.hypot(dx, dy) || 1;
    // Drifts in until it is on top of you, then circles rather than shoving.
    const closing = Phaser.Math.Clamp((dist - WRAITH_HOLD) / 90, -1, 1);
    const speed = WRAITH_SPEED * (this.isEnraged() ? 1.15 : 1);
    const tx = -dy / dist;
    const ty = dx / dist;

    this.kingX += ((dx / dist) * closing * 0.95 + tx * 0.35) * speed * dt;
    this.kingY += ((dy / dist) * closing * 0.95 + ty * 0.35) * speed * dt;
    this.kingX = Phaser.Math.Clamp(this.kingX, 60, W - 60);
    this.kingY = Phaser.Math.Clamp(this.kingY, H * 0.18, H - 60);
    this.driveKingBody();
  }

  // ══ Hard mode, phase four: The Devourer of Kings ═══════════════════

  /**
   * The crown splits, and it turns out nothing was wearing it — something was
   * living in it, and every king this fight has shown you was a course.
   *
   * Structurally this is the same handoff the other two phases use: the body is
   * made invincible, everything in the air is swept off the board, and the same
   * npc slot comes back with a new size and a new health pool. Nothing about the
   * damage plumbing changes, so every element kit still fights it correctly.
   */
  private beginConsume(time: number): void {
    const scene = this.arena.scene;
    const npc = this.arena.npc;
    const W = this.arena.width;
    const H = this.arena.height;

    this.phase = 'consume';
    this.phaseStartedAt = time;
    this.devourStartedAt = time;
    this.kingHiddenUntil = 0;
    if (this.kingX < 0 || this.kingY < 0) {
      this.kingX = W / 2;
      this.kingY = H * 0.42;
    }

    npc.isInvincible = true;
    npc.hp = 0;
    npc.incomingDamageMultiplier = 1;

    this.clearHazards();
    for (const k of [...this.knights]) {
      this.boom(k.x, k.y, 40, this.P.violetLit);
      this.arena.removeEnemy(k);
      this.knights = this.knights.filter((o) => o !== k);
      if (k.scene) k.destroy();
    }
    // The shard floor is pulled back in too — it belonged to the crown.
    this.orbitShards = [];

    this.banner('THE CROWN WAS NEVER HIS', '#f0688f', 26);
    scene.cameras.main.shake(1400, 0.016);
    scene.cameras.main.flash(600, 90, 20, 40);

    // Five beats of the crown coming apart over where he stood.
    for (let i = 0; i < 5; i++) {
      scene.time.delayedCall(400 + i * 420, () => {
        if (this.phase !== 'consume') return;
        const a = (i / 5) * Math.PI * 2;
        this.boom(this.kingX + Math.cos(a) * 70, this.kingY + Math.sin(a) * 50, 40, this.P.goldLit);
        scene.cameras.main.shake(240, 0.008);
      });
    }
    scene.time.delayedCall(2400, () => {
      if (this.phase !== 'consume') return;
      this.arena.showFloatingText(this.kingX, this.kingY - 100, 'IT WAS EATING THEM', '#ffa0b2');
    });
    scene.time.delayedCall(3500, () => {
      if (this.phase !== 'consume') return;
      scene.cameras.main.flash(700, 200, 255, 235);
      scene.cameras.main.shake(700, 0.020);
      this.boom(this.kingX, this.kingY, 260, this.P.emberLit);
    });
  }

  private updateConsume(time: number, dt: number): void {
    void dt;
    // Keep the body parked off the board for the whole set piece.
    this.kingRise = 0;
    if (time - this.phaseStartedAt < CONSUME_MS) return;

    const W = this.arena.width;
    const H = this.arena.height;
    const npc = this.arena.npc;

    this.phase = 'devourer';
    this.phaseStartedAt = time;
    this.cycleIdx = 0;
    this.kingRise = 0;
    npc.setMaxHp(DEVOURER_HP);
    npc.isInvincible = false;
    this.setBodyRadius(DEVOURER_HIT_R);
    this.kingX = W / 2;
    this.kingY = H * 0.40;
    this.driveKingBody();

    this.orbitShards = [];
    this.seedOrbitShards(DEVOUR_SHARDS);

    this.banner('☠  THE DEVOURER OF KINGS  ☠', '#bdfff0', 34);
    this.arena.scene.cameras.main.shake(900, 0.016);
    this.scheduleNext(time, 1300);
    this.harassIdx = 0;
    this.harassNextAt = time + HARASS_GRACE_MS * 0.6;
  }

  private updateDevourerPhase(time: number, dt: number): void {
    this.kingRise = Math.min(1, this.kingRise + dt * 1.5);
    const npc = this.arena.npc;

    // The Feast — the fourth body's one set piece, fired once, near the end.
    if (!this.feastUsed && !this.feastActive && npc.hp <= DEVOURER_HP * FEAST_HP_FRACTION && npc.hp > 0) {
      this.beginFeast(time);
    }
    if (this.feastActive) {
      npc.isInvincible = true;
      if (npc.hp < 1) npc.hp = 1;
      // Held still for the whole set piece — the hearts are the target, and a
      // ring of them tracking a moving centre would be miserable to chase.
      this.driveKingBody();
      return;
    }

    // Enrage thickens the shard floor, the same way the wraith's does.
    if (this.isEnraged() && this.orbitShards.length < DEVOUR_SHARDS_ENRAGED) {
      this.seedOrbitShards(DEVOUR_SHARDS_ENRAGED);
      this.arena.showFloatingText(this.kingX, this.kingY - 70, 'IT IS STILL HUNGRY', '#f0688f');
    }

    this.moveDevourer(time, dt, 1);

    if (time < this.nextMoveAt || time < this.busyUntil) return;
    const move = DEVOUR_CYCLE[this.cycleIdx % DEVOUR_CYCLE.length];
    this.cycleIdx++;
    switch (move) {
      case 'maw':      this.castMaw(time); break;
      case 'chorus':   this.castChorus(time); break;
      case 'bile':     this.castBile(time); break;
      case 'brood':    this.castBrood(time); break;
      case 'tendrils': this.castTendrils(time); break;
      default:         this.castKingMove(time, move); break;
    }
  }

  /**
   * It closes, but heavily — slower than the wraith and holding further out, so
   * the fourth phase is fought at mid range rather than in your face. `scale`
   * lets the Feast hold it nearly still while the hearts are the target.
   */
  private moveDevourer(time: number, dt: number, scale: number): void {
    if (time < this.kingCastingUntil || time < this.kingHiddenUntil) { this.driveKingBody(); return; }
    const player = this.arena.player;
    const W = this.arena.width;
    const H = this.arena.height;

    const dx = player.x - this.kingX;
    const dy = player.y - this.kingY;
    const dist = Math.hypot(dx, dy) || 1;
    const closing = Phaser.Math.Clamp((dist - DEVOURER_HOLD) / 110, -1, 1);
    const speed = DEVOURER_SPEED * (this.isEnraged() ? 1.14 : 1) * scale;
    const tx = -dy / dist;
    const ty = dx / dist;

    this.kingX += ((dx / dist) * closing * 0.9 + tx * 0.4) * speed * dt;
    this.kingY += ((dy / dist) * closing * 0.9 + ty * 0.4) * speed * dt;
    this.kingX = Phaser.Math.Clamp(this.kingX, 90, W - 90);
    this.kingY = Phaser.Math.Clamp(this.kingY, H * 0.20, H - 90);
    this.driveKingBody();
  }

  // ── The Gullet ─────────────────────────────────────────────────────

  /**
   * It opens and inhales, then bites: one ring of teeth outward with a single
   * quiet wedge cut out of it.
   *
   * The bite is faster than the player (330 vs 200 px/s), so the wedge cannot be
   * placed somewhere they have to sprint to — it opens within 0.8 rad of where
   * they already stand, is marked for the whole 1.5s wind-up, and the inhale is
   * only 108 px/s so walking out of the pull is always possible. What the move
   * actually costs you is the ground: it drags you back toward the middle of the
   * room while everything else on the floor is still live.
   */
  private castMaw(time: number): void {
    this.playMoveSound('maw');
    const player = this.arena.player;
    const toPlayer = Math.atan2(player.y - this.kingY, player.x - this.kingX);
    const gap = toPlayer + Phaser.Math.FloatBetween(-0.8, 0.8);

    this.maw = {
      cx: this.kingX, cy: this.kingY,
      gapCentre: gap, gapHalf: MAW_GAP_HALF,
      startedAt: time, bitesAt: time + MAW_WARN_MS,
    };
    this.pullX = this.kingX;
    this.pullY = this.kingY;
    this.pullUntil = time + MAW_WARN_MS;
    this.pullStrength = MAW_PULL;
    this.kingCastingUntil = time + MAW_WARN_MS + 300;
    this.arena.scene.cameras.main.shake(MAW_WARN_MS, 0.004);
    this.arena.showFloatingText(this.kingX, this.kingY - 80, '⚠ THE GULLET', '#ffa0b2');
    this.scheduleNext(time, MAW_WARN_MS + 900);
  }

  private updateMaw(time: number): void {
    const m = this.maw;
    if (!m || time < m.bitesAt) return;
    this.maw = null;
    this.pullUntil = 0;
    this.pullStrength = 0;

    const W = this.arena.width;
    const H = this.arena.height;
    this.rings.push({
      cx: m.cx, cy: m.cy, radius: 10, speed: MAW_SPEED,
      maxRadius: Math.hypot(W, H) + 120,
      gapCentre: m.gapCentre, gapHalf: m.gapHalf, band: MAW_BAND,
      damage: MAW_DAMAGE, lastHitAt: 0, kind: 'gullet',
    });
    this.boom(m.cx, m.cy, 120, this.P.bone);
    this.arena.scene.cameras.main.shake(420, 0.014);
  }

  // ── The Chorus of Kings ────────────────────────────────────────────

  /**
   * Five of the eaten, propped up round the rim, each firing a lane inward on a
   * stagger. Each lane warns for 0.95s against a 34px half-width — one short
   * step. The difficulty is that there are five of them and they overlap, so the
   * step has to be the right one.
   */
  private castChorus(time: number): void {
    this.playMoveSound('chorus');
    const W = this.arena.width;
    const H = this.arena.height;

    for (let i = 0; i < CHORUS_COUNT; i++) {
      // Spread round the rim. Each king takes its own aim when its turn comes
      // up rather than all five sharing one snapshot — five lanes all pointed at
      // where you stood a second ago is dodged by one step and never again.
      const a = (i / CHORUS_COUNT) * Math.PI * 2 + Phaser.Math.FloatBetween(-0.25, 0.25);
      const x = Phaser.Math.Clamp(W / 2 + Math.cos(a) * W * 0.44, 46, W - 46);
      const y = Phaser.Math.Clamp(H * 0.55 + Math.sin(a) * H * 0.36, H * 0.14, H - 46);
      const at = time + i * CHORUS_GAP_MS;
      this.chorus.push({
        x, y,
        aim: NaN,
        armsAt: at,
        firesAt: at + CHORUS_WARN_MS,
        endsAt: at + CHORUS_WARN_MS + CHORUS_FIRE_MS,
        dieAt: at + CHORUS_WARN_MS + CHORUS_LIFE_MS,
        dealt: false,
      });
    }
    this.kingCastingUntil = time + CHORUS_COUNT * CHORUS_GAP_MS;
    this.banner('THE CHORUS OF KINGS', '#bdfff0', 24);
    this.scheduleNext(time, CHORUS_COUNT * CHORUS_GAP_MS + CHORUS_WARN_MS + 400);
  }

  private updateChorus(time: number): void {
    if (this.chorus.length === 0) return;
    const player = this.arena.player;
    const len = Math.hypot(this.arena.width, this.arena.height);

    for (let i = this.chorus.length - 1; i >= 0; i--) {
      const c = this.chorus[i];
      if (time >= c.dieAt) { this.chorus.splice(i, 1); continue; }
      // Lock the lane in the instant the warning starts, so the 0.95s telegraph
      // covers the whole commitment — after this the aim never moves again.
      if (Number.isNaN(c.aim)) {
        if (time < c.armsAt) continue;
        c.aim = Math.atan2(player.y - c.y, player.x - c.x) + Phaser.Math.FloatBetween(-0.10, 0.10);
      }
      if (c.dealt || time < c.firesAt) continue;
      c.dealt = true;

      // Distance along the lane, then distance off it — a capsule, not a ray,
      // so standing behind the king that fired it is still safe.
      const nx = Math.cos(c.aim);
      const ny = Math.sin(c.aim);
      const rx = player.x - c.x;
      const ry = player.y - c.y;
      const along = rx * nx + ry * ny;
      const off = Math.abs(rx * -ny + ry * nx);
      if (along > 0 && along < len && off <= CHORUS_HALF_W + 14) {
        this.hitPlayer(CHORUS_DAMAGE, player.x, player.y);
      }
      this.arena.scene.cameras.main.shake(140, 0.005);
    }
  }

  // ── Bile, brood and tendrils ───────────────────────────────────────

  /** It is sick on the floor, and the floor stays sick. */
  private castBile(time: number): void {
    this.playMoveSound('bile');
    const W = this.arena.width;
    const H = this.arena.height;
    const player = this.arena.player;

    for (let i = 0; i < BILE_COUNT; i++) {
      // A loose ring around the player rather than on them: the pools take the
      // arena away a piece at a time, they do not open with a free hit.
      const a = (i / BILE_COUNT) * Math.PI * 2 + Math.random();
      const r = 90 + Phaser.Math.Between(0, 120);
      this.rockets.push({
        x: this.kingX, y: this.kingY,
        tx: Phaser.Math.Clamp(player.x + Math.cos(a) * r, 50, W - 50),
        ty: Phaser.Math.Clamp(player.y + Math.sin(a) * r * 0.8, H * 0.22, H - 40),
        startedAt: time + i * 90,
        landsAt: time + BILE_FALL_MS + i * 90,
        landed: false,
        pool: true,
      });
    }
    this.kingCastingUntil = time + 700;
    this.arena.showFloatingText(this.kingX, this.kingY - 70, '⚠ BILE', '#f0688f');
    this.scheduleNext(time, BILE_FALL_MS + BILE_COUNT * 90 + 300);
  }

  private updatePools(time: number): void {
    if (this.pools.length === 0) return;
    const player = this.arena.player;
    for (let i = this.pools.length - 1; i >= 0; i--) {
      const p = this.pools[i];
      if (time >= p.dieAt) { this.pools.splice(i, 1); continue; }
      if (time - p.lastHitAt < BILE_POOL_TICK_MS) continue;
      if (Phaser.Math.Distance.Between(p.x, p.y, player.x, player.y) > p.radius) continue;
      p.lastHitAt = time;
      this.hitPlayer(BILE_POOL_DAMAGE, player.x, player.y);
      this.slowPlayer(time, 0.72, BILE_POOL_TICK_MS + 120);
    }
  }

  /** The brood: four at a time, small and quick, answered by clearing not duelling. */
  private castBrood(time: number): void {
    this.playMoveSound('brood');
    const scene = this.arena.scene;
    const W = this.arena.width;
    const H = this.arena.height;
    const alive = this.larvae.filter((l) => l.active && l.hp > 0).length;
    const n = Math.min(LARVA_PER_SPAWN, MAX_LARVAE - alive);

    for (let i = 0; i < n; i++) {
      const a = (i / Math.max(1, n)) * Math.PI * 2 + Math.random();
      const x = Phaser.Math.Clamp(this.kingX + Math.cos(a) * 80, 50, W - 50);
      const y = Phaser.Math.Clamp(this.kingY + Math.sin(a) * 70, H * 0.22, H - 50);
      const larva = new Husk(scene, x, y, LARVA_HP, LARVA_SPEED, LARVA_DAMAGE, 900, DEVOURER_LARVA);
      larva.netId = 960 + this.larvae.length;
      larva.world = this.huskWorld;
      larva.onBite = (dm) => this.hitPlayer(dm, this.arena.player.x, this.arena.player.y);
      larva.on('damaged', (amount: number) => {
        if (amount > 0 && larva.active) this.arena.spawnDamageNumber(larva.x, larva.y - 18, amount);
      });
      larva.once('defeated', () => this.onLarvaDefeated(larva));
      this.arena.addEnemy(larva);
      this.larvae.push(larva);
      this.boom(x, y, 34, this.P.violet);
    }

    this.kingCastingUntil = time + 800;
    this.arena.showFloatingText(this.kingX, this.kingY - 70, 'IT SHEDS', '#f0688f');
    if (n === 0) this.arena.showFloatingText(this.kingX, this.kingY - 92, '(nothing left to shed)', '#5a5a7a');
    this.scheduleNext(time, 900);
  }

  private onLarvaDefeated(larva: Husk): void {
    this.arena.removeEnemy(larva);
    this.larvae = this.larvae.filter((l) => l !== larva);
    larva.hideHealthBar();
    this.boom(larva.x, larva.y, 26, this.P.violetLit);
    this.arena.scene.tweens.add({
      targets: larva, scaleX: 0.2, scaleY: 0.2, alpha: 0, duration: 260, ease: 'Power2',
      onComplete: () => { if (larva.scene) larva.destroy(); },
    });
  }

  /**
   * Tendrils — the Purge twice, on both axes, the second volley following the
   * first by a beat.
   *
   * Deliberately *not* "the Purge with more lanes in it". Four lanes across 720px
   * already leave only ~56px of clear floor between neighbours once the ±40 of
   * jitter is spent; a fifth lane closes that to nothing and the move becomes an
   * unavoidable hit rather than a hard one. Two four-lane volleys at right
   * angles is twice the work with every gap still real — you dodge, then you
   * dodge again, and the second dodge is constrained by where the first left you.
   */
  private castTendrils(time: number): void {
    this.playMoveSound('tendrils');
    const W = this.arena.width;
    const H = this.arena.height;
    const SECOND_DELAY = 900;

    const volley = (horizontal: boolean, at: number) => {
      const span = horizontal ? H : W;
      const slotSize = span / PURGE_LANES;
      for (let i = 0; i < PURGE_LANES; i++) {
        const centre = slotSize * i + slotSize / 2 + Phaser.Math.Between(-40, 40);
        this.purges.push({
          horizontal,
          centre: Phaser.Math.Clamp(centre, PURGE_HALF_SPAN + 10, span - PURGE_HALF_SPAN - 10),
          firesAt: at + PURGE_WARN_MS,
          endsAt: at + PURGE_WARN_MS + PURGE_FIRE_MS,
          dealt: false,
        });
      }
    };

    const first = this.purgeHorizontalNext;
    this.purgeHorizontalNext = !this.purgeHorizontalNext;
    volley(first, time);
    volley(!first, time + SECOND_DELAY);

    this.kingCastingUntil = time + SECOND_DELAY + PURGE_WARN_MS;
    this.arena.showFloatingText(this.kingX, this.kingY - 70, '⚠ TENDRILS  ×2', '#f0688f');
    this.scheduleNext(time, SECOND_DELAY + PURGE_WARN_MS + PURGE_FIRE_MS + 250);
  }

  // ── The Feast ──────────────────────────────────────────────────────

  /**
   * The Devourer's set piece. It holds itself open and four hearts come out on a
   * slow ring; it cannot be hurt while they are up. Kill all four and it closes
   * early, staggered and taking half again as much damage. Let the clock run out
   * and it simply shuts, having cost you fifteen seconds of chorus fire.
   *
   * The hearts use the dark orbs' trick — an alpha-0 `Fighter` in the enemies
   * list — so every damage path in the game pops them for free.
   */
  private beginFeast(time: number): void {
    this.playMoveSound('feast');
    const npc = this.arena.npc;
    this.feastUsed = true;
    this.feastActive = true;
    this.feastStartedAt = time;
    this.feastChorusAt = time + 1400;
    npc.isInvincible = true;

    // It takes the middle of the hall for the set piece. Without this the ring
    // of hearts can be spawned partly off-screen when it is beaten into a
    // corner — and a target you cannot reach is not a mechanic.
    this.kingX = this.arena.width / 2;
    this.kingY = this.arena.height * 0.46;
    this.driveKingBody();

    this.clearHazards();
    this.banner('☠  THE FEAST  ☠', '#ffa0b2', 30);
    this.arena.showFloatingText(this.kingX, this.kingY - 90, 'KILL THE HEARTS', '#ff2f52');
    this.arena.scene.cameras.main.shake(800, 0.012);
    this.arena.scene.cameras.main.flash(400, 160, 30, 60);

    for (let i = 0; i < FEAST_HEARTS; i++) {
      this.spawnHeart(time, (i / FEAST_HEARTS) * Math.PI * 2);
    }
  }

  private spawnHeart(time: number, angle: number): void {
    void time;
    const x = this.kingX + Math.cos(angle) * FEAST_HEART_R;
    const y = this.kingY + Math.sin(angle) * FEAST_HEART_R * 0.8;
    const hitbox = new Fighter(this.arena.scene, x, y, 'elem-king', {
      id: 'devourer-heart', name: 'Heart', color: DEVOUR.warn, emoji: '🫀', abilities: [],
    }, FEAST_HEART_HP, 0);
    hitbox.setAlpha(0);
    hitbox.forceInvisible = true;
    hitbox.hideHealthBar();
    hitbox.setDepth(4);
    const hb = hitbox.body as Phaser.Physics.Arcade.Body;
    hb.setCircle(FEAST_HEART_SIZE, 24 - FEAST_HEART_SIZE, 24 - FEAST_HEART_SIZE);
    hb.setCollideWorldBounds(false);
    hb.setImmovable(true);
    hb.moves = false;

    const heart: Heart = { hitbox, angle, radius: FEAST_HEART_R, x, y, dead: false, hurtUntil: 0 };
    // Flash only, no number: hearts are routed through `ownsEnemy`, and
    // ArenaScene's `applyProjectileToEnemy` already spawns the damage number for
    // anything it sends there. Adding one here would double every hit.
    hitbox.on('damaged', (amount: number) => {
      if (amount > 0) heart.hurtUntil = this.arena.scene.time.now + 110;
    });
    hitbox.once('defeated', () => {
      heart.dead = true;
      this.boom(heart.x, heart.y, 90, DEVOUR.warn);
      this.arena.scene.cameras.main.shake(300, 0.010);
      this.arena.showFloatingText(heart.x, heart.y - 40, 'BURST', '#ffa0b2');
    });
    this.arena.addEnemy(hitbox);
    this.hearts.push(heart);
  }

  private updateHearts(time: number, dt: number): void {
    if (this.hearts.length === 0) return;
    for (let i = this.hearts.length - 1; i >= 0; i--) {
      const h = this.hearts[i];
      if (h.dead) { this.destroyHeart(h); this.hearts.splice(i, 1); continue; }
      // The ring turns slowly — they are a target, not a dodge. Clamped inside
      // the arena so none of the four can ever be parked out of reach.
      h.angle += 0.5 * dt;
      h.x = Phaser.Math.Clamp(this.kingX + Math.cos(h.angle) * h.radius, 60, this.arena.width - 60);
      h.y = Phaser.Math.Clamp(this.kingY + Math.sin(h.angle) * h.radius * 0.8, 70, this.arena.height - 70);
      (h.hitbox.body as Phaser.Physics.Arcade.Body | null)?.reset(h.x, h.y);
    }
    void time;
  }

  private destroyHeart(h: Heart): void {
    this.arena.removeEnemy(h.hitbox);
    if (h.hitbox.scene) h.hitbox.destroy();
  }

  private updateFeast(time: number): void {
    // A slow chorus runs underneath it, so the hearts are not a free DPS window.
    if (time >= this.feastChorusAt) {
      this.feastChorusAt = time + 2400;
      const W = this.arena.width;
      const H = this.arena.height;
      for (let i = 0; i < 2; i++) {
        const a = Math.random() * Math.PI * 2;
        const x = Phaser.Math.Clamp(W / 2 + Math.cos(a) * W * 0.44, 46, W - 46);
        const y = Phaser.Math.Clamp(H * 0.55 + Math.sin(a) * H * 0.36, H * 0.14, H - 46);
        this.chorus.push({
          x, y,
          aim: NaN,
          armsAt: time + i * 260,
          firesAt: time + CHORUS_WARN_MS + i * 260,
          endsAt: time + CHORUS_WARN_MS + CHORUS_FIRE_MS + i * 260,
          dieAt: time + CHORUS_WARN_MS + CHORUS_LIFE_MS + i * 260,
          dealt: false,
        });
      }
    }

    const cleared = this.hearts.length === 0;
    if (!cleared && time - this.feastStartedAt < FEAST_MS) return;
    this.endFeast(time, cleared);
  }

  private endFeast(time: number, cleared: boolean): void {
    const npc = this.arena.npc;
    this.feastActive = false;
    for (const h of this.hearts) this.destroyHeart(h);
    this.hearts = [];
    this.chorus = [];
    npc.isInvincible = false;

    if (cleared) {
      this.staggerUntil = time + FEAST_STAGGER_MS;
      npc.incomingDamageMultiplier = 1.5;
      this.kingCastingUntil = time + FEAST_STAGGER_MS;
      this.banner('IT CANNOT CLOSE', '#67e8a0', 26);
      this.arena.showFloatingText(this.kingX, this.kingY - 80, 'OPEN — STRIKE NOW', '#67e8a0');
      this.busyUntil = time + FEAST_STAGGER_MS;
      this.nextMoveAt = this.busyUntil + 250;
      this.arena.scene.time.delayedCall(FEAST_STAGGER_MS, () => {
        if (this.phase === 'done') return;
        npc.incomingDamageMultiplier = 1;
      });
    } else {
      this.banner('IT SWALLOWS THEM BACK', '#f0688f', 24);
      this.busyUntil = time + 400;
      this.nextMoveAt = this.busyUntil + 200;
    }
    this.harassNextAt = Math.max(this.harassNextAt, time + 1200);
  }

  // ── The end: spare, or kill ────────────────────────────────────────

  /**
   * It is beaten. It does not die — it sits down.
   *
   * The body stays alive at 1 HP and invincible so nothing the player still has
   * in the air can finish it: the ending has to be a decision, not a stray
   * projectile. `hitPlayer` is gated on this phase too, so the reverse holds.
   */
  private beginKneel(time: number): void {
    const npc = this.arena.npc;
    const scene = this.arena.scene;

    this.phase = 'kneel';
    this.phaseStartedAt = time;
    this.kneelStartedAt = time;
    this.feastActive = false;
    npc.isInvincible = true;
    npc.hp = 1;
    npc.incomingDamageMultiplier = 1;

    this.clearHazards();
    for (const h of this.hearts) this.destroyHeart(h);
    this.hearts = [];
    for (const l of [...this.larvae]) this.onLarvaDefeated(l);
    for (const k of [...this.knights]) this.onKnightDefeated(k);
    this.orbitShards = [];

    this.banner('IT CANNOT RISE', '#e9f4ec', 30);
    scene.cameras.main.shake(900, 0.014);
    scene.cameras.main.flash(500, 230, 240, 235);
    this.boom(this.kingX, this.kingY, 260, this.P.bone);
    // The kings it was holding leave it, one at a time.
    for (let i = 0; i < 7; i++) {
      scene.time.delayedCall(i * 220, () => {
        if (this.phase !== 'kneel') return;
        const a = (i / 7) * Math.PI * 2;
        this.boom(this.kingX + Math.cos(a) * 80, this.kingY + Math.sin(a) * 56, 34, this.P.goldLit);
      });
    }
    scene.time.delayedCall(1600, () => {
      if (this.phase !== 'kneel') return;
      this.arena.showFloatingText(this.kingX, this.kingY - 110, 'IT LOOKS AT YOU', '#e9f4ec');
    });
  }

  private updateKneel(time: number, dt: number): void {
    void dt;
    // Settle it onto the floor over the first beat.
    this.kingRise = 1;
    this.driveKingBody();
    if (this.choiceTaken) return;
    if (time - this.kneelStartedAt < KNEEL_MS) return;
    if (this.choiceObjects.length === 0) this.buildChoice();
  }

  /**
   * Spare or kill. Built as plain Graphics + Text rather than the UI kit,
   * because the arena is not a menu scene and this has to sit over a live
   * playfield without disturbing the HUD's depth stack.
   */
  private buildChoice(): void {
    const scene = this.arena.scene;
    const W = this.arena.width;
    const H = this.arena.height;
    const y = H - 150;

    // Pointer clicks are latched off for as long as this is up, so choosing an
    // ending does not also fire the player's click ability into the floor.
    this.arena.setPointerLatched?.(true);

    const prompt = scene.add.text(W / 2, y - 92, 'IT IS NOT DEAD.', {
      fontSize: '30px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
      color: '#e9f4ec', stroke: '#0a0510', strokeThickness: 6, letterSpacing: 3,
    }).setOrigin(0.5).setDepth(28).setAlpha(0);
    const sub = scene.add.text(W / 2, y - 58, 'DECIDE.', {
      fontSize: '15px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
      color: '#9c6b78', letterSpacing: 6,
    }).setOrigin(0.5).setDepth(28).setAlpha(0);
    scene.tweens.add({ targets: [prompt, sub], alpha: 1, duration: 600 });
    this.choiceObjects.push(prompt, sub);

    const options: Array<{
      x: number; label: string; icon: string; sub: string;
      colour: number; hex: string; choice: BossOutcome;
    }> = [
      {
        x: W / 2 - 190, label: 'SPARE', icon: '🕊', sub: 'and take what it dreams',
        colour: 0x9fb8ff, hex: '#9fb8ff', choice: 'spare',
      },
      {
        x: W / 2 + 190, label: 'KILL', icon: '⚔', sub: 'and take what it owes',
        colour: 0xf0d68a, hex: '#f0d68a', choice: 'kill',
      },
    ];

    for (const o of options) {
      const w = 300;
      const h = 92;
      const g = scene.add.graphics().setDepth(27);
      const paint = (hot: boolean) => {
        g.clear();
        g.fillStyle(0x07050c, 0.92);
        g.fillRect(o.x - w / 2, y - h / 2, w, h);
        for (let k = 4; k >= 1; k--) {
          g.lineStyle(2 + k * 3, o.colour, hot ? 0.09 : 0.04);
          g.strokeRect(o.x - w / 2, y - h / 2, w, h);
        }
        g.lineStyle(2, o.colour, hot ? 1 : 0.6);
        g.strokeRect(o.x - w / 2, y - h / 2, w, h);
        // Corner cuts, so it reads as a plate rather than a browser button.
        g.lineStyle(3, o.colour, hot ? 1 : 0.75);
        for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) {
          g.beginPath();
          g.moveTo(o.x + sx * (w / 2) - sx * 18, y + sy * (h / 2));
          g.lineTo(o.x + sx * (w / 2), y + sy * (h / 2));
          g.lineTo(o.x + sx * (w / 2), y + sy * (h / 2) - sy * 18);
          g.strokePath();
        }
      };
      paint(false);

      const label = scene.add.text(o.x, y - 12, `${o.icon}   ${o.label}`, {
        fontSize: '30px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
        color: o.hex, stroke: '#07050c', strokeThickness: 5, letterSpacing: 4,
      }).setOrigin(0.5).setDepth(28);
      const note = scene.add.text(o.x, y + 24, o.sub.toUpperCase(), {
        fontSize: '11px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
        color: '#9c6b78', letterSpacing: 2,
      }).setOrigin(0.5).setDepth(28);

      const hit = scene.add.rectangle(o.x, y, w, h, 0xffffff, 0)
        .setDepth(29)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => { paint(true); note.setColor('#e9f4ec'); })
        .on('pointerout', () => { paint(false); note.setColor('#9c6b78'); })
        .on('pointerdown', () => this.resolveChoice(o.choice));

      this.choiceObjects.push(g, label, note, hit);
    }
  }

  private teardownChoice(): void {
    if (this.choiceObjects.length === 0) return;
    for (const o of this.choiceObjects) o.destroy();
    this.choiceObjects = [];
    // Only released because *this* put it on. Clearing unconditionally would
    // also drop the latch ArenaScene sets in `create()` against the menu click
    // that started the match — see [[project_menu_click_bleed]].
    this.arena.setPointerLatched?.(false);
  }

  /**
   * The ending. Grants the element here rather than on the results screen, so
   * the reward is written to the save the moment it is earned even if the run
   * is closed on the outro.
   */
  private resolveChoice(choice: BossOutcome): void {
    if (this.choiceTaken) return;
    this.choiceTaken = choice;
    const scene = this.arena.scene;
    this.teardownChoice();

    PlayerData.unlockElement(choice === 'kill' ? 'justice' : 'dream');

    if (choice === 'kill') {
      this.banner('⚖️  JUSTICE', '#f0d68a', 34);
      scene.cameras.main.flash(700, 255, 240, 200);
      scene.cameras.main.shake(900, 0.018);
      this.boom(this.kingX, this.kingY, 300, 0xf0d68a);
      this.arena.showFloatingText(this.kingX, this.kingY - 120, 'FOR EVERY KING IT ATE', '#f7f1dc');
      for (let i = 0; i < 8; i++) {
        scene.time.delayedCall(i * 130, () => {
          const a = (i / 8) * Math.PI * 2;
          this.boom(this.kingX + Math.cos(a) * 90, this.kingY + Math.sin(a) * 60, 44, 0xf0d68a);
        });
      }
    } else {
      this.banner('🌙  DREAM', '#9fb8ff', 34);
      scene.cameras.main.flash(900, 150, 180, 255);
      this.boom(this.kingX, this.kingY, 300, 0x9fb8ff);
      this.arena.showFloatingText(this.kingX, this.kingY - 120, 'IT CLOSES ITS EYES', '#cfe0ff');
      for (let i = 0; i < 8; i++) {
        scene.time.delayedCall(i * 190, () => {
          const a = (i / 8) * Math.PI * 2;
          this.boom(this.kingX + Math.cos(a) * 70, this.kingY - i * 14, 34, 0x9fb8ff);
        });
      }
    }

    scene.time.delayedCall(2600, () => {
      this.phase = 'done';
      this.arena.bossVictory(choice);
    });
  }

  /** Everything currently in the air, off the board. Used by every handoff. */
  private clearHazards(): void {
    this.lasers = [];
    this.rockets = [];
    this.bullets = [];
    this.slams = [];
    this.purges = [];
    this.sweeps = [];
    this.rings = [];
    this.grasps = [];
    this.runes = [];
    this.mines = [];
    this.courtiers = [];
    this.shards = [];
    this.chorus = [];
    this.pools = [];
    this.decree = null;
    this.blink = null;
    this.spiral = null;
    this.maw = null;
    this.pullUntil = 0;
    this.pullStrength = 0;
    this.crownLandsAt = 0;
    this.mgArm = null;
    this.mgUntil = 0;
    for (const o of this.darkOrbs) this.destroyDarkOrb(o);
    this.darkOrbs = [];
  }

  /** Queue the next move once the current one finishes, plus the rest beat. */
  private scheduleNext(time: number, moveDurationMs: number): void {
    this.busyUntil = time + moveDurationMs;
    const enraged = this.isEnraged();
    const rest = this.hard
      ? (enraged ? REST_MS_ENRAGED_HARD : REST_MS_HARD)
      : (enraged ? REST_MS_ENRAGED : REST_MS);
    this.nextMoveAt = this.busyUntil + rest;
  }

  private isEnraged(): boolean {
    const npc = this.arena.npc;
    return npc.maxHp > 0 && npc.hp / npc.maxHp <= 0.5;
  }

  private onBossBodyDefeated(): void {
    const time = this.arena.scene.time.now;
    if (this.phase === 'mech') {
      this.beginWreck(time);
    } else if (this.phase === 'king') {
      this.beginAscend(time);
    } else if (this.phase === 'wraith') {
      // Normal mode ends here. Hard mode does not: the crown was never his.
      if (this.hard) this.beginConsume(time);
      else { this.phase = 'done'; this.onKingDead(); }
    } else if (this.phase === 'devourer') {
      this.beginKneel(time);
    }
  }

  // ── The harassment track ───────────────────────────────────────────

  /**
   * One light attack on its own clock, chosen from the current phase's pool.
   * Nothing here blocks or is blocked by the main cycle: the point is that the
   * scripted move you are solving is never the only thing in the air.
   */
  private updateHarass(time: number): void {
    if (this.phase !== 'mech' && this.phase !== 'king'
      && this.phase !== 'wraith' && this.phase !== 'devourer') return;
    if (this.ultActive || this.feastActive || time < this.harassNextAt) return;
    // Mid-Regicide he is off the board, and everything here fires from where he
    // stands — hold the beat rather than spawning it at his parking spot.
    if (time < this.kingHiddenUntil) { this.harassNextAt = this.kingHiddenUntil + 150; return; }

    const pool = this.phase === 'mech' ? MECH_HARASS
      : this.phase === 'king' ? KING_HARASS
      : this.phase === 'wraith' ? WRAITH_HARASS
      : DEVOUR_HARASS;
    const move = pool[this.harassIdx % pool.length];
    this.harassIdx++;

    switch (move) {
      case 'snipe':    this.harassSnipe(time); break;
      case 'dropmine': this.harassMines(time); break;
      case 'flak':     this.harassFlak(time, 'mg'); break;
      case 'goldflak': this.harassFlak(time, 'spiral'); break;
      case 'orbpair':  this.harassOrbs(time); break;
      case 'rune':     this.harassRune(time); break;
      case 'lane':     this.harassLane(time); break;
      case 'spores':   this.harassFlak(time, 'shield'); break;
      case 'bilespit': this.harassBile(time); break;
    }

    const base = this.phase === 'mech' ? HARASS_MS_MECH
      : this.phase === 'king' ? HARASS_MS_KING
      : this.phase === 'wraith' ? HARASS_MS_WRAITH
      : HARASS_MS_DEVOURER;
    this.harassNextAt = time
      + base * (this.isEnraged() ? HARASS_ENRAGED_MULT : 1) * (this.hard ? HARASS_MULT_HARD : 1);
  }

  /** Two globs at the player's feet, on the harassment clock. */
  private harassBile(time: number): void {
    const W = this.arena.width;
    const H = this.arena.height;
    const player = this.arena.player;
    for (let i = 0; i < 2; i++) {
      this.rockets.push({
        x: this.kingX, y: this.kingY,
        tx: Phaser.Math.Clamp(player.x + Phaser.Math.Between(-90, 90), 50, W - 50),
        ty: Phaser.Math.Clamp(player.y + Phaser.Math.Between(-80, 80), H * 0.24, H - 40),
        startedAt: time + i * 240,
        landsAt: time + BILE_FALL_MS * 0.8 + i * 240,
        landed: false,
        pool: true,
      });
    }
  }

  /** Two rockets onto the player's feet, on a shorter fuse than the barrage. */
  private harassSnipe(time: number): void {
    const W = this.arena.width;
    const H = this.arena.height;
    const player = this.arena.player;
    for (let i = 0; i < 2; i++) {
      this.rockets.push({
        x: W / 2 + Phaser.Math.Between(-200, 200),
        y: 200,
        tx: Phaser.Math.Clamp(player.x + Phaser.Math.Between(-70, 70), 50, W - 50),
        ty: Phaser.Math.Clamp(player.y + Phaser.Math.Between(-60, 60), H * 0.34, H - 40),
        startedAt: time + i * 260,
        landsAt: time + ROCKET_FALL_MS * 0.72 + i * 260,
        landed: false,
      });
    }
  }

  private harassMines(time: number): void {
    const W = this.arena.width;
    const H = this.arena.height;
    const player = this.arena.player;
    for (let i = 0; i < 2; i++) {
      const a = Math.random() * Math.PI * 2;
      this.mines.push({
        x: Phaser.Math.Clamp(player.x + Math.cos(a) * Phaser.Math.Between(90, 190), 50, W - 50),
        y: Phaser.Math.Clamp(player.y + Math.sin(a) * Phaser.Math.Between(80, 160), H * 0.34, H - 40),
        armedAt: time + MINE_ARM_MS,
        dieAt: time + MINE_LIFE_MS,
        spent: false,
      });
    }
  }

  /** A loose ring of shots off the boss, spaced wide enough to walk through. */
  private harassFlak(time: number, kind: BulletKind): void {
    const mech = this.phase === 'mech';
    const ox = mech ? this.arena.width / 2 : this.kingX;
    const oy = mech ? MECH_HEAD_CY : this.kingY;
    const player = this.arena.player;
    const aim = Math.atan2(player.y - oy, player.x - ox);
    const COUNT = 9;
    const speed = mech ? 250 : 215;
    for (let i = 0; i < COUNT; i++) {
      const a = aim + (i - (COUNT - 1) / 2) * 0.20;
      this.bullets.push({
        x: ox + Math.cos(a) * 34, y: oy + Math.sin(a) * 34,
        vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
        dieAt: time + 6000,
        damage: kind === 'spiral' ? SPIRAL_DAMAGE : MG_DAMAGE * 2,
        kind,
      });
    }
  }

  private harassOrbs(time: number): void {
    const player = this.arena.player;
    for (let i = 0; i < 2; i++) {
      const angle = Math.atan2(player.y - this.kingY, player.x - this.kingX) + (i === 0 ? 0.4 : -0.4);
      this.spawnDarkOrb(time, angle);
    }
  }

  private harassRune(time: number): void {
    const player = this.arena.player;
    this.runes.push({ x: player.x, y: player.y, firesAt: time + RUNE_WARN_MS, dealt: false });
  }

  private harassLane(time: number): void {
    const W = this.arena.width;
    const H = this.arena.height;
    const player = this.arena.player;
    const horizontal = Math.random() < 0.5;
    const span = horizontal ? H : W;
    const along = horizontal ? player.y : player.x;
    this.purges.push({
      horizontal,
      centre: Phaser.Math.Clamp(along, PURGE_HALF_SPAN + 10, span - PURGE_HALF_SPAN - 10),
      firesAt: time + PURGE_WARN_MS,
      endsAt: time + PURGE_WARN_MS + PURGE_FIRE_MS,
      dealt: false,
    });
  }

  // ── Mech attacks ───────────────────────────────────────────────────

  private castLaser(time: number): void {
    const px = this.arena.player.x;
    this.lasers.push({
      x: px,
      firesAt: time + LASER_WARN_MS,
      endsAt: time + LASER_WARN_MS + LASER_FIRE_MS,
      dealt: false,
    });
    this.arena.showFloatingText(px, 150, '⚠ LANCE', '#ff6688');
    this.scheduleNext(time, LASER_WARN_MS + LASER_FIRE_MS);
  }

  private castRockets(time: number): void {
    const W = this.arena.width;
    const H = this.arena.height;
    const player = this.arena.player;
    const landsAt = time + ROCKET_FALL_MS;

    for (let i = 0; i < ROCKET_COUNT; i++) {
      // Two of every three rockets crowd the player; the rest scatter, so
      // standing still is punished but running blind is too.
      const nearPlayer = i % 3 !== 2;
      const tx = nearPlayer
        ? Phaser.Math.Clamp(player.x + Phaser.Math.Between(-150, 150), 50, W - 50)
        : Phaser.Math.Between(60, W - 60);
      const ty = nearPlayer
        ? Phaser.Math.Clamp(player.y + Phaser.Math.Between(-120, 120), H * 0.34, H - 40)
        : Phaser.Math.Between(Math.round(H * 0.34), H - 40);
      this.rockets.push({
        x: W / 2 + Phaser.Math.Between(-220, 220),
        y: 200,
        tx, ty,
        startedAt: time + i * 55,
        landsAt: landsAt + i * 55,
        landed: false,
      });
    }
    this.arena.showFloatingText(W / 2, 200, '⚠ BARRAGE', '#ff9a4d');
    this.scheduleNext(time, ROCKET_FALL_MS + ROCKET_COUNT * 55 + 300);
  }

  private castMachineGun(time: number): void {
    // The gun is an arm: it comes up, points, and stays up for the burst.
    const arm = this.arms[0];
    arm.phase = 'aim';
    arm.phaseEnd = time + MG_SPINUP_MS + MG_DURATION_MS;
    this.mgArm = arm;
    this.mgUntil = time + MG_SPINUP_MS + MG_DURATION_MS;
    this.mgNextShotAt = time + MG_SPINUP_MS;
    this.arena.showFloatingText(this.arena.width / 2, 220, '⚠ SUPPRESSING FIRE', '#ff9a4d');
    this.scheduleNext(time, MG_SPINUP_MS + MG_DURATION_MS + 400);
  }

  private castSlam(time: number): void {
    const player = this.arena.player;
    // Whichever fist is nearer the player, so the swing reads as deliberate.
    const arm = player.x < this.arena.width / 2 ? this.arms[0] : this.arms[1];
    arm.phase = 'raise';
    arm.targetX = player.x;
    arm.targetY = player.y;
    // The fist must *arrive* as the circle closes, so the hold ends a strike's
    // length early and the drop lands exactly on `landsAt`.
    arm.phaseEnd = time + SLAM_WARN_MS - SLAM_STRIKE_MS;
    this.slams.push({ x: player.x, y: player.y, landsAt: time + SLAM_WARN_MS, landed: false });
    this.arena.showFloatingText(player.x, player.y - 70, '⚠ FIST', '#ff2244');
    this.scheduleNext(time, SLAM_WARN_MS + 700);
  }

  /**
   * Judgement Arc. The head's lance sweeps a wedge of the hall, always starting
   * on the side the player is standing and travelling *across* them, so the only
   * answer is to run through the beam early or get behind its trailing edge.
   */
  private castSweep(time: number): void {
    const W = this.arena.width;
    const ox = W / 2;
    const oy = MECH_HEAD_CY;
    const player = this.arena.player;
    const aim = Math.atan2(player.y - oy, player.x - ox);
    // Everything below the head is an angle in (0, π) — y grows downward — so
    // the sweep has to travel *toward* the middle of that range or it spends
    // half its arc pointing off the top of the screen. Start just outside the
    // player on the near edge and finish well past them on the far one.
    const dir = player.x < ox ? -1 : 1;
    const a0 = Phaser.Math.Clamp(aim - dir * 0.34, 0.08, Math.PI - 0.08);
    const a1 = Phaser.Math.Clamp(aim + dir * 1.5, 0.08, Math.PI - 0.08);

    this.sweeps.push({
      ox, oy, a0, a1,
      startsAt: time + SWEEP_WARN_MS,
      endsAt: time + SWEEP_WARN_MS + SWEEP_TRAVEL_MS,
      lastHitAt: 0,
    });
    this.arena.showFloatingText(ox, 200, '⚠ JUDGEMENT ARC', '#ff6688');
    this.scheduleNext(time, SWEEP_WARN_MS + SWEEP_TRAVEL_MS + 250);
  }

  /**
   * Scatter charges. Dropped in a loose ring *around* the player rather than on
   * them: the mine field is a shrinking box, not an instant hit.
   */
  private castMines(time: number): void {
    const W = this.arena.width;
    const H = this.arena.height;
    const player = this.arena.player;
    const base = Math.random() * Math.PI * 2;
    for (let i = 0; i < MINE_COUNT; i++) {
      const a = base + (i / MINE_COUNT) * Math.PI * 2;
      const r = MINE_RING_R + Phaser.Math.Between(-25, 65);
      this.mines.push({
        x: Phaser.Math.Clamp(player.x + Math.cos(a) * r, 50, W - 50),
        y: Phaser.Math.Clamp(player.y + Math.sin(a) * r * 0.8, H * 0.32, H - 40),
        armedAt: time + MINE_ARM_MS,
        dieAt: time + MINE_LIFE_MS,
        spent: false,
      });
    }
    this.arena.showFloatingText(player.x, player.y - 80, '⚠ SCATTER CHARGES', '#ff9a4d');
    this.scheduleNext(time, MINE_ARM_MS + 500);
  }

  /**
   * The mech stamps and the floor answers: three rings out of its stance, each
   * with one wedge left intact. The wedge rotates between rings, so the safe
   * side of the room moves while you are standing in it.
   */
  private castQuake(time: number): void {
    const W = this.arena.width;
    const H = this.arena.height;
    const cx = W / 2;
    const cy = 310;
    const player = this.arena.player;
    // First gap is put where the player already is — the punishment is for
    // staying there through all three.
    let gap = Math.atan2(player.y - cy, player.x - cx);
    const drift = (Math.random() < 0.5 ? -1 : 1) * QUAKE_GAP_DRIFT;
    const maxR = Math.hypot(Math.max(cx, W - cx), Math.max(cy, H - cy)) + 90;

    for (let i = 0; i < QUAKE_RINGS; i++) {
      if (i > 0) gap += drift;
      this.rings.push({
        cx, cy, radius: i * -QUAKE_GAP_MS * QUAKE_SPEED / 1000, speed: QUAKE_SPEED,
        maxRadius: maxR, gapCentre: gap, gapHalf: QUAKE_GAP_HALF, band: QUAKE_BAND,
        damage: QUAKE_DAMAGE, lastHitAt: 0, kind: 'quake',
      });
    }

    // The fists come down together on the stamp, purely as staging.
    for (const arm of this.arms) { arm.phase = 'recover'; arm.phaseEnd = time + 600; }
    this.arena.scene.cameras.main.shake(500, 0.012);
    this.arena.showFloatingText(cx, 260, '⚠ STAMP', '#ff9a4d');
    this.scheduleNext(time, QUAKE_GAP_MS * QUAKE_RINGS + 900);
  }

  /**
   * Both fists at once: one on where you are, one on where you would be if you
   * ran. Dodging a pincer means changing direction, not just moving.
   */
  private castPincer(time: number): void {
    const W = this.arena.width;
    const H = this.arena.height;
    const player = this.arena.player;
    const body = player.body as Phaser.Physics.Arcade.Body | null;
    const vx = body?.velocity.x ?? 0;
    const vy = body?.velocity.y ?? 0;
    const lead = SLAM_WARN_MS / 1000 * 0.8;

    const spots: Array<{ x: number; y: number }> = [
      { x: player.x, y: player.y },
      {
        x: Phaser.Math.Clamp(player.x + vx * lead, 50, W - 50),
        y: Phaser.Math.Clamp(player.y + vy * lead, H * 0.3, H - 40),
      },
    ];
    // If the player is standing still the two marks would stack — split them.
    if (Phaser.Math.Distance.Between(spots[0].x, spots[0].y, spots[1].x, spots[1].y) < 90) {
      const a = Math.random() * Math.PI * 2;
      spots[1] = {
        x: Phaser.Math.Clamp(player.x + Math.cos(a) * 130, 50, W - 50),
        y: Phaser.Math.Clamp(player.y + Math.sin(a) * 110, H * 0.3, H - 40),
      };
    }

    this.arms.forEach((arm, i) => {
      const spot = spots[i] ?? spots[0];
      arm.phase = 'raise';
      arm.targetX = spot.x;
      arm.targetY = spot.y;
      arm.phaseEnd = time + SLAM_WARN_MS - SLAM_STRIKE_MS;
      this.slams.push({ x: spot.x, y: spot.y, landsAt: time + SLAM_WARN_MS, landed: false });
    });
    this.arena.showFloatingText(player.x, player.y - 80, '⚠ PINCER', '#ff2244');
    this.scheduleNext(time, SLAM_WARN_MS + 650);
  }

  // ── Mech attack updates ────────────────────────────────────────────

  private updateArms(time: number, dt: number): void {
    const W = this.arena.width;
    const player = this.arena.player;

    for (const arm of this.arms) {
      const restX = W / 2 + arm.side * MECH_FIST_REST_DX;
      let goalX = restX;
      let goalY = MECH_FIST_REST_Y;
      let speed = 3;

      switch (arm.phase) {
        case 'raise':
          // Hangs over the marked spot, high, while the circle closes.
          goalX = arm.targetX;
          goalY = 210;
          speed = 5;
          if (time >= arm.phaseEnd) { arm.phase = 'strike'; arm.phaseEnd = time + SLAM_STRIKE_MS; }
          break;
        case 'strike':
          goalX = arm.targetX;
          goalY = arm.targetY;
          speed = 22;
          if (time >= arm.phaseEnd) { arm.phase = 'recover'; arm.phaseEnd = time + 700; }
          break;
        case 'aim':
          // Machine gun: tracks the player so the muzzle is where the stream is.
          goalX = Phaser.Math.Clamp(player.x, 60, W - 60);
          goalY = 300;
          speed = 6;
          if (time >= arm.phaseEnd) { arm.phase = 'recover'; arm.phaseEnd = time + 500; }
          break;
        case 'recover':
          if (time >= arm.phaseEnd) arm.phase = 'rest';
          break;
        default:
          break;
      }

      const k = 1 - Math.exp(-speed * dt);
      arm.x += (goalX - arm.x) * k;
      arm.y += (goalY - arm.y) * k;
    }

    if (this.mgArm && time >= this.mgUntil) this.mgArm = null;
    if (!this.mgArm || time < this.mgNextShotAt || time > this.mgUntil) return;

    // Zero spread, by design: aimed exactly at the player at the instant of
    // firing. The stream is dodged by moving across it, not by hoping.
    while (this.mgNextShotAt <= time && this.mgNextShotAt <= this.mgUntil) {
      const arm = this.mgArm;
      const a = Math.atan2(player.y - arm.y, player.x - arm.x);
      this.bullets.push({
        x: arm.x, y: arm.y,
        vx: Math.cos(a) * MG_SPEED, vy: Math.sin(a) * MG_SPEED,
        dieAt: this.mgNextShotAt + 3000, damage: MG_DAMAGE, kind: 'mg',
      });
      this.mgNextShotAt += MG_INTERVAL_MS;
    }
  }

  private updateLasers(time: number): void {
    for (let i = this.lasers.length - 1; i >= 0; i--) {
      const l = this.lasers[i];
      if (!l.dealt && time >= l.firesAt) {
        l.dealt = true;
        this.arena.scene.cameras.main.shake(220, 0.006);
        if (Math.abs(this.arena.player.x - l.x) <= LASER_HALF_W + 16) {
          this.hitPlayer(LASER_DAMAGE, this.arena.player.x, this.arena.player.y);
        }
      }
      if (time >= l.endsAt) this.lasers.splice(i, 1);
    }
  }

  private updateRockets(time: number): void {
    for (let i = this.rockets.length - 1; i >= 0; i--) {
      const r = this.rockets[i];
      if (time < r.startedAt) continue;
      if (!r.landed && time >= r.landsAt) {
        r.landed = true;
        if (r.pool) {
          this.explode(r.tx, r.ty, BILE_BLAST_R, BILE_DAMAGE, this.P.violetLit);
          this.pools.push({
            x: r.tx, y: r.ty, radius: BILE_POOL_R,
            bornAt: time, dieAt: time + BILE_POOL_MS, lastHitAt: 0,
          });
        } else {
          this.explode(r.tx, r.ty, ROCKET_RADIUS, ROCKET_DAMAGE, this.P.ember);
        }
        this.rockets.splice(i, 1);
      }
    }
  }

  private updateBullets(time: number, dt: number): void {
    const player = this.arena.player;
    const W = this.arena.width;
    const H = this.arena.height;

    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;

      let done = time >= b.dieAt || b.x < -30 || b.x > W + 30 || b.y < -30 || b.y > H + 30;
      if (!done && Phaser.Math.Distance.Between(b.x, b.y, player.x, player.y) <= 20 * player.sizeMult + 6) {
        this.hitPlayer(b.damage, b.x, b.y);
        done = true;
      }
      if (done) this.bullets.splice(i, 1);
    }
  }

  private updateSlams(time: number): void {
    for (let i = this.slams.length - 1; i >= 0; i--) {
      const s = this.slams[i];
      if (time < s.landsAt) continue;
      if (!s.landed) {
        s.landed = true;
        this.explode(s.x, s.y, SLAM_RADIUS, SLAM_DAMAGE, this.P.warn);
        this.arena.scene.cameras.main.shake(420, 0.014);
        // The crater stays for the rest of the fight — the hall keeps score.
        if (this.craterG) this.FX.drawCrater(this.craterG, s.x, s.y, SLAM_RADIUS * 0.8);
      }
      this.slams.splice(i, 1);
    }
  }

  private updateSweeps(time: number): void {
    const player = this.arena.player;
    for (let i = this.sweeps.length - 1; i >= 0; i--) {
      const s = this.sweeps[i];
      if (time >= s.endsAt) { this.sweeps.splice(i, 1); continue; }
      if (time < s.startsAt) continue;

      const t = (time - s.startsAt) / (s.endsAt - s.startsAt);
      const angle = Phaser.Math.Linear(s.a0, s.a1, t);
      const dx = player.x - s.ox;
      const dy = player.y - s.oy;
      const dist = Math.hypot(dx, dy);
      if (dist < 50) continue;
      // The beam is a fixed width in pixels, so its angular reach shrinks with
      // distance — standing far out really is safer, as the art implies.
      const halfAngle = Math.atan2(SWEEP_HALF_W + 14, dist);
      const off = Math.abs(Phaser.Math.Angle.Wrap(Math.atan2(dy, dx) - angle));
      if (off <= halfAngle && time - s.lastHitAt >= SWEEP_HIT_GAP_MS) {
        s.lastHitAt = time;
        this.hitPlayer(SWEEP_DAMAGE, player.x, player.y);
        this.arena.scene.cameras.main.shake(160, 0.005);
      }
    }
  }

  private updateMines(time: number): void {
    const player = this.arena.player;
    for (let i = this.mines.length - 1; i >= 0; i--) {
      const m = this.mines[i];
      if (m.spent) { this.mines.splice(i, 1); continue; }
      const armed = time >= m.armedAt;
      const expired = time >= m.dieAt;
      const tripped = armed
        && Phaser.Math.Distance.Between(m.x, m.y, player.x, player.y) <= MINE_TRIGGER_R;
      if (!tripped && !expired) continue;
      m.spent = true;
      // An expiring charge still goes off — it just does it where nobody is.
      this.explode(m.x, m.y, MINE_BLAST_R, MINE_DAMAGE, this.P.emberLit);
      this.arena.scene.cameras.main.shake(200, 0.006);
      this.mines.splice(i, 1);
    }
  }

  private updateRings(time: number, dt: number): void {
    const player = this.arena.player;
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      r.radius += r.speed * dt;
      if (r.radius > r.maxRadius) { this.rings.splice(i, 1); continue; }
      if (r.radius <= 8) continue;

      const dx = player.x - r.cx;
      const dy = player.y - r.cy;
      const dist = Math.hypot(dx, dy);
      if (Math.abs(dist - r.radius) > r.band / 2 + 14) continue;
      // A gap of zero means the whole ring is live (the wraith's wail).
      if (r.gapHalf > 0) {
        const off = Math.abs(Phaser.Math.Angle.Wrap(Math.atan2(dy, dx) - r.gapCentre));
        if (off <= r.gapHalf) continue;
      }
      if (time - r.lastHitAt < 400) continue;
      r.lastHitAt = time;
      this.hitPlayer(r.damage, player.x, player.y);
      this.arena.scene.cameras.main.shake(240, 0.008);
    }
  }

  // ── The wreck ──────────────────────────────────────────────────────

  private beginWreck(time: number): void {
    const scene = this.arena.scene;
    const W = this.arena.width;
    const H = this.arena.height;

    this.phase = 'wreck';
    this.phaseStartedAt = time;

    const npc = this.arena.npc;
    npc.isInvincible = true;
    npc.hp = 0;
    // Park the body out of the way — nothing may be hit until the King stands up.
    (npc.body as Phaser.Physics.Arcade.Body).reset(W / 2, -400);

    // Everything the machine had in the air dies with it — the charges it left
    // on the floor included, since the King has no use for them.
    this.lasers = [];
    this.rockets = [];
    this.bullets = [];
    this.slams = [];
    this.sweeps = [];
    this.rings = [];
    for (const m of this.mines) this.boom(m.x, m.y, 40, this.P.ember);
    this.mines = [];
    this.mgArm = null;
    for (const arm of this.arms) { arm.phase = 'recover'; arm.phaseEnd = time + 400; }

    this.banner('THE MECH IS BROKEN', '#ff9a4d', 26);

    // Three staged detonations walking across the chassis.
    for (let i = 0; i < 3; i++) {
      scene.time.delayedCall(i * 480, () => {
        if (this.phase === 'done') return;
        const ex = W / 2 + Phaser.Math.Between(-180, 180);
        const ey = 180 + Phaser.Math.Between(-60, 140);
        this.boom(ex, ey, 90 + i * 30, this.P.emberLit);
        scene.cameras.main.shake(300, 0.008 + i * 0.003);
      });
    }
    scene.time.delayedCall(1500, () => {
      if (this.phase === 'done') return;
      scene.cameras.main.flash(420, 255, 200, 140);
      scene.cameras.main.shake(600, 0.018);
      this.boom(W / 2, 220, 280, 0xffffff);
    });

    // Repair cells thrown clear of the wreck, in a ring around the hall. They
    // rot: the interlude is a scramble, not a free top-up. Hard mode drops none
    // at all — the wreck is just a wreck, and the interlude is only a breath.
    if (this.hard) {
      scene.time.delayedCall(1200, () => {
        if (this.phase === 'done') return;
        this.arena.showFloatingText(W / 2, H * 0.55, 'NOTHING CRAWLS OUT OF IT FOR YOU', '#f0688f');
      });
      return;
    }
    scene.time.delayedCall(1200, () => {
      if (this.phase === 'done') return;
      const now = scene.time.now;
      for (let i = 0; i < HEAL_ORB_COUNT; i++) {
        const a = (i / HEAL_ORB_COUNT) * Math.PI * 2 - Math.PI / 2;
        this.healOrbs.push({
          x: Phaser.Math.Clamp(W / 2 + Math.cos(a) * 340, 60, W - 60),
          y: Phaser.Math.Clamp(H * 0.66 + Math.sin(a) * 170, H * 0.4, H - 50),
          taken: false,
          dieAt: now + HEAL_ORB_LIFE_MS,
        });
      }
      this.arena.showFloatingText(W / 2, H * 0.55, 'REPAIR CELLS — THEY WILL NOT KEEP', '#67e8a0');
    });
  }

  private updateHealOrbs(time: number): void {
    const player = this.arena.player;
    for (let i = this.healOrbs.length - 1; i >= 0; i--) {
      const orb = this.healOrbs[i];
      if (orb.taken || time >= orb.dieAt) {
        if (!orb.taken) this.boom(orb.x, orb.y, 26, 0x2a4a34);
        this.healOrbs.splice(i, 1);
        continue;
      }
      if (Phaser.Math.Distance.Between(orb.x, orb.y, player.x, player.y) > HEAL_ORB_PICKUP_R) continue;
      orb.taken = true;
      player.heal(HEAL_ORB_AMOUNT);
      this.arena.showFloatingText(orb.x, orb.y - 24, `+${HEAL_ORB_AMOUNT} HP`, '#67e8a0');
      this.boom(orb.x, orb.y, 42, 0x4ade80);
    }
  }

  // ── King attacks ───────────────────────────────────────────────────

  /** Slow orbiting drift, holding range and stopping dead while he casts. */
  private moveKing(time: number, dt: number): void {
    const player = this.arena.player;
    const W = this.arena.width;
    const H = this.arena.height;
    const HOLD = 200;

    if (time < this.kingCastingUntil || time < this.kingHiddenUntil) { this.driveKingBody(); return; }

    const dx = this.kingX - player.x;
    const dy = this.kingY - player.y;
    const dist = Math.hypot(dx, dy) || 1;
    const speed = this.isEnraged() ? 145 : 118;

    // Radial correction toward the held range, plus a constant tangential drift.
    const radial = Phaser.Math.Clamp((dist - HOLD) / 120, -1, 1);
    const rx = -(dx / dist) * radial;
    const ry = -(dy / dist) * radial;
    const tx = -dy / dist;
    const ty = dx / dist;

    this.kingX += (rx * 0.8 + tx * 0.6) * speed * dt;
    this.kingY += (ry * 0.8 + ty * 0.6) * speed * dt;
    this.kingX = Phaser.Math.Clamp(this.kingX, 60, W - 60);
    this.kingY = Phaser.Math.Clamp(this.kingY, H * 0.22, H - 70);
    this.driveKingBody();
  }

  /** The npc body has `moves = false`, so its position is written, not driven. */
  private driveKingBody(): void {
    const body = this.arena.npc.body as Phaser.Physics.Arcade.Body | null;
    body?.reset(this.kingX, this.kingY);
  }

  private castDarkMagic(time: number): void {
    const player = this.arena.player;
    this.kingCastingUntil = time + 600;

    for (let i = 0; i < DARK_ORB_COUNT; i++) {
      const spread = (i - (DARK_ORB_COUNT - 1) / 2) * 0.42;
      const angle = Math.atan2(player.y - this.kingY, player.x - this.kingX) + spread;
      this.spawnDarkOrb(time, angle);
    }

    this.arena.showFloatingText(this.kingX, this.kingY - 46, 'DARK MAGIC', '#b98cff');
    this.scheduleNext(time, 750);
  }

  /**
   * One homing orb. The 1 HP hitbox parked in the enemies list is what makes it
   * destructible by *anything* the player has — projectiles, AoE, melee — for free.
   */
  private spawnDarkOrb(time: number, angle: number): void {
    const x = this.kingX + Math.cos(angle) * 30;
    const y = this.kingY + Math.sin(angle) * 30;

    const hitbox = new Fighter(this.arena.scene, x, y, 'elem-king', {
      id: 'dark-orb', name: 'Dark Magic', color: this.P.violet, emoji: '🔮', abilities: [],
    }, 1, 0);
    hitbox.setAlpha(0);
    hitbox.forceInvisible = true;
    hitbox.hideHealthBar();
    hitbox.setDepth(4);
    const hb = hitbox.body as Phaser.Physics.Arcade.Body;
    hb.setCircle(15, 9, 9);
    hb.setCollideWorldBounds(false);
    hb.setImmovable(true);
    hb.moves = false;

    const orb: DarkOrb = { hitbox, x, y, angle, dieAt: time + DARK_ORB_LIFE_MS, dead: false };
    hitbox.once('defeated', () => {
      orb.dead = true;
      this.boom(orb.x, orb.y, 30, this.P.violetLit);
    });
    this.arena.addEnemy(hitbox);
    this.darkOrbs.push(orb);
  }

  private updateDarkOrbs(time: number, dt: number): void {
    const player = this.arena.player;
    const W = this.arena.width;
    const H = this.arena.height;

    for (let i = this.darkOrbs.length - 1; i >= 0; i--) {
      const o = this.darkOrbs[i];
      if (o.dead || time >= o.dieAt) {
        this.destroyDarkOrb(o);
        this.darkOrbs.splice(i, 1);
        continue;
      }

      // Capped turn rate: it steers toward you but can always be outrun round
      // a corner, which is the whole point of a slow homing shot.
      const want = Math.atan2(player.y - o.y, player.x - o.x);
      const diff = Phaser.Math.Angle.Wrap(want - o.angle);
      const maxTurn = DARK_ORB_TURN * dt;
      o.angle += Phaser.Math.Clamp(diff, -maxTurn, maxTurn);
      o.x += Math.cos(o.angle) * DARK_ORB_SPEED * dt;
      o.y += Math.sin(o.angle) * DARK_ORB_SPEED * dt;
      (o.hitbox.body as Phaser.Physics.Arcade.Body | null)?.reset(o.x, o.y);

      if (o.x < -40 || o.x > W + 40 || o.y < -40 || o.y > H + 40) {
        this.destroyDarkOrb(o);
        this.darkOrbs.splice(i, 1);
        continue;
      }

      if (Phaser.Math.Distance.Between(o.x, o.y, player.x, player.y) <= 20 * player.sizeMult + 10) {
        this.hitPlayer(DARK_ORB_DAMAGE, o.x, o.y);
        this.boom(o.x, o.y, 34, this.P.violet);
        this.destroyDarkOrb(o);
        this.darkOrbs.splice(i, 1);
      }
    }
  }

  private destroyDarkOrb(o: DarkOrb): void {
    this.arena.removeEnemy(o.hitbox);
    if (o.hitbox.scene) o.hitbox.destroy();
  }

  private castPurge(time: number): void {
    const W = this.arena.width;
    const H = this.arena.height;
    const horizontal = this.purgeHorizontalNext;
    this.purgeHorizontalNext = !this.purgeHorizontalNext;
    this.kingCastingUntil = time + PURGE_WARN_MS;

    // Lanes are spread across the axis with jitter, so there is always a gap
    // but never the same gap twice.
    const span = horizontal ? H : W;
    const slotSize = span / PURGE_LANES;
    for (let i = 0; i < PURGE_LANES; i++) {
      const centre = slotSize * i + slotSize / 2 + Phaser.Math.Between(-40, 40);
      this.purges.push({
        horizontal,
        centre: Phaser.Math.Clamp(centre, PURGE_HALF_SPAN + 10, span - PURGE_HALF_SPAN - 10),
        firesAt: time + PURGE_WARN_MS,
        endsAt: time + PURGE_WARN_MS + PURGE_FIRE_MS,
        dealt: false,
      });
    }
    this.arena.showFloatingText(this.kingX, this.kingY - 46, 'PURGE', '#b98cff');
    this.scheduleNext(time, PURGE_WARN_MS + PURGE_FIRE_MS + 200);
  }

  private updatePurges(time: number): void {
    const player = this.arena.player;
    for (let i = this.purges.length - 1; i >= 0; i--) {
      const p = this.purges[i];
      if (!p.dealt && time >= p.firesAt) {
        p.dealt = true;
        const along = p.horizontal ? player.y : player.x;
        if (Math.abs(along - p.centre) <= PURGE_HALF_SPAN + 14) {
          this.hitPlayer(PURGE_DAMAGE, player.x, player.y);
        }
        this.arena.scene.cameras.main.shake(180, 0.005);
      }
      if (time >= p.endsAt) this.purges.splice(i, 1);
    }
  }

  private castDarkShield(time: number): void {
    this.kingCastingUntil = time + 700;
    // Evenly spaced by construction, so the wall has readable, consistent gaps
    // to step through rather than random holes — and then a second, slower ring
    // offset by half a slot, so the gaps in the two walls never line up.
    for (let i = 0; i < SHIELD_BULLETS; i++) {
      const a = (i / SHIELD_BULLETS) * Math.PI * 2;
      this.bullets.push({
        x: this.kingX + Math.cos(a) * 26,
        y: this.kingY + Math.sin(a) * 26,
        vx: Math.cos(a) * SHIELD_SPEED,
        vy: Math.sin(a) * SHIELD_SPEED,
        dieAt: time + 8000,
        damage: SHIELD_DAMAGE,
        kind: 'shield',
      });
    }
    const innerX = this.kingX;
    const innerY = this.kingY;
    this.arena.scene.time.delayedCall(SHIELD_INNER_DELAY_MS, () => {
      // The second wall belongs to whoever cast the first — if the body it came
      // out of has since broken, it does not arrive.
      if (this.ultActive || (this.phase !== 'king' && this.phase !== 'wraith')) return;
      const now = this.arena.scene.time.now;
      for (let i = 0; i < SHIELD_BULLETS; i++) {
        const a = ((i + 0.5) / SHIELD_BULLETS) * Math.PI * 2;
        this.bullets.push({
          x: innerX + Math.cos(a) * 26,
          y: innerY + Math.sin(a) * 26,
          vx: Math.cos(a) * SHIELD_INNER_SPEED,
          vy: Math.sin(a) * SHIELD_INNER_SPEED,
          dieAt: now + 10000,
          damage: SHIELD_DAMAGE,
          kind: 'shield',
        });
      }
      this.boom(innerX, innerY, 50, this.P.violetLit);
    });
    this.boom(this.kingX, this.kingY, 70, this.P.violet);
    this.arena.showFloatingText(this.kingX, this.kingY - 46, 'DARK SHIELD', '#b98cff');
    this.scheduleNext(time, 900);
  }

  /**
   * Regicide. He steps out of the world, opens a rift at arm's length from the
   * player, and comes through it swinging. The whole point is that range is not
   * a safe place to stand against him.
   */
  private castBlink(time: number): void {
    const W = this.arena.width;
    const H = this.arena.height;
    const player = this.arena.player;
    // Arrive on the side he is already on, so the cleave sweeps across the
    // player rather than shoving them into the middle of the room.
    const a = Math.atan2(this.kingY - player.y, this.kingX - player.x) + Phaser.Math.FloatBetween(-0.9, 0.9);
    const toX = Phaser.Math.Clamp(player.x + Math.cos(a) * BLINK_RANGE, 55, W - 55);
    const toY = Phaser.Math.Clamp(player.y + Math.sin(a) * BLINK_RANGE, H * 0.2, H - 55);

    this.blink = {
      toX, toY,
      arriveAt: time + BLINK_VANISH_MS,
      strikeAt: time + BLINK_VANISH_MS + BLINK_WINDUP_MS,
      endsAt: time + BLINK_VANISH_MS + BLINK_WINDUP_MS + 460,
      angle: Math.atan2(player.y - toY, player.x - toX),
      arrived: false,
      struck: false,
    };
    this.kingHiddenUntil = time + BLINK_VANISH_MS;
    this.kingCastingUntil = time + BLINK_VANISH_MS + BLINK_WINDUP_MS;
    this.boom(this.kingX, this.kingY, 60, this.P.violet);
    // Genuinely off the board for the vanish: not drawn, and not hittable
    // either — the same trick the wreck uses to park the body between phases.
    this.kingX = -800;
    this.kingY = -800;
    this.driveKingBody();
    this.arena.showFloatingText(this.kingX, this.kingY - 46, 'REGICIDE', '#b98cff');
    this.scheduleNext(time, BLINK_VANISH_MS + BLINK_WINDUP_MS + 500);
  }

  private updateBlink(time: number): void {
    const b = this.blink;
    if (!b) return;

    if (!b.arrived && time >= b.arriveAt) {
      b.arrived = true;
      this.kingX = b.toX;
      this.kingY = b.toY;
      this.driveKingBody();
      // Re-aim on arrival — you had the vanish to move, and he saw you do it.
      const player = this.arena.player;
      b.angle = Math.atan2(player.y - this.kingY, player.x - this.kingX);
      this.boom(this.kingX, this.kingY, 54, this.P.violetLit);
    }
    if (b.arrived && !b.struck && time >= b.strikeAt) {
      b.struck = true;
      const player = this.arena.player;
      const d = Phaser.Math.Distance.Between(this.kingX, this.kingY, player.x, player.y);
      const off = Math.abs(Phaser.Math.Angle.Wrap(
        Math.atan2(player.y - this.kingY, player.x - this.kingX) - b.angle,
      ));
      if (d <= CLEAVE_RADIUS && off <= CLEAVE_HALF_ANGLE) {
        this.hitPlayer(CLEAVE_DAMAGE, player.x, player.y);
        this.slowPlayer(time, 0.55, CLEAVE_SLOW_MS);
        this.arena.showFloatingText(player.x, player.y - 46, 'CLEAVED', '#ff8899');
      }
      this.arena.scene.cameras.main.shake(280, 0.010);
    }
    if (time >= b.endsAt) this.blink = null;
  }

  /**
   * Grasping Court. Four hands, each reaching for where you will be rather than
   * where you are, and each leaving whoever it catches wading.
   */
  private castGrasp(time: number): void {
    const W = this.arena.width;
    const H = this.arena.height;
    const player = this.arena.player;
    const body = player.body as Phaser.Physics.Arcade.Body | null;

    for (let i = 0; i < GRASP_COUNT; i++) {
      const at = time + i * GRASP_GAP_MS;
      const lead = (GRASP_WARN_MS + GRASP_LEAD_MS) / 1000;
      const vx = body?.velocity.x ?? 0;
      const vy = body?.velocity.y ?? 0;
      // Later hands lead further, so a straight sprint walks into the last one.
      const k = lead * (0.5 + i * 0.25);
      this.grasps.push({
        x: Phaser.Math.Clamp(player.x + vx * k + Phaser.Math.Between(-24, 24), 45, W - 45),
        y: Phaser.Math.Clamp(player.y + vy * k + Phaser.Math.Between(-24, 24), H * 0.22, H - 45),
        firesAt: at + GRASP_WARN_MS,
        endsAt: at + GRASP_WARN_MS + 700,
        dealt: false,
      });
    }
    this.kingCastingUntil = time + GRASP_COUNT * GRASP_GAP_MS;
    this.arena.showFloatingText(this.kingX, this.kingY - 46, 'GRASPING COURT', '#b98cff');
    this.scheduleNext(time, GRASP_COUNT * GRASP_GAP_MS + GRASP_WARN_MS + 300);
  }

  private updateGrasps(time: number): void {
    const player = this.arena.player;
    for (let i = this.grasps.length - 1; i >= 0; i--) {
      const h = this.grasps[i];
      if (!h.dealt && time >= h.firesAt) {
        h.dealt = true;
        if (Phaser.Math.Distance.Between(h.x, h.y, player.x, player.y) <= GRASP_RADIUS) {
          this.hitPlayer(GRASP_DAMAGE, player.x, player.y);
          this.slowPlayer(time, GRASP_SLOW_MULT, GRASP_SLOW_MS);
          this.arena.showFloatingText(player.x, player.y - 40, 'HELD', '#b98cff');
        }
      }
      if (time >= h.endsAt) this.grasps.splice(i, 1);
    }
  }

  /**
   * The King's Decree: one circle of the hall is pardoned and the rest is not.
   * The only attack in the fight that asks you to run *toward* something.
   */
  private castDecree(time: number): void {
    const W = this.arena.width;
    const H = this.arena.height;
    const player = this.arena.player;
    // Placed a sprint away — the candidate nearest the ideal distance, not the
    // furthest one, so the decree is always a race you can actually win.
    let x = W / 2;
    let y = H * 0.6;
    let best = Infinity;
    for (let i = 0; i < 8; i++) {
      const cx = Phaser.Math.Between(Math.round(DECREE_RADIUS + 50), Math.round(W - DECREE_RADIUS - 50));
      const cy = Phaser.Math.Between(Math.round(H * 0.3), Math.round(H - DECREE_RADIUS - 20));
      const err = Math.abs(Phaser.Math.Distance.Between(cx, cy, player.x, player.y) - DECREE_IDEAL_DIST);
      if (err < best) { best = err; x = cx; y = cy; }
    }

    this.decree = {
      x, y, radius: DECREE_RADIUS,
      firesAt: time + DECREE_WARN_MS,
      endsAt: time + DECREE_WARN_MS + 500,
      dealt: false,
    };
    this.kingCastingUntil = time + DECREE_WARN_MS;
    this.banner('KNEEL WHERE YOU ARE TOLD', '#ffc44d', 22);
    this.arena.showFloatingText(x, y - DECREE_RADIUS - 20, 'SANCTUARY', '#ffe9a8');
    this.scheduleNext(time, DECREE_WARN_MS + 600);
  }

  private updateDecree(time: number): void {
    const d = this.decree;
    if (!d) return;
    if (!d.dealt && time >= d.firesAt) {
      d.dealt = true;
      const player = this.arena.player;
      const scene = this.arena.scene;
      if (Phaser.Math.Distance.Between(d.x, d.y, player.x, player.y) > d.radius) {
        this.hitPlayer(DECREE_DAMAGE, player.x, player.y);
        this.arena.showFloatingText(player.x, player.y - 50, 'CONDEMNED', '#ff2244');
        scene.cameras.main.flash(280, 180, 40, 60);
      } else {
        this.arena.showFloatingText(player.x, player.y - 50, 'PARDONED', '#67e8a0');
      }
      scene.cameras.main.shake(420, 0.012);
      this.boom(d.x, d.y, d.radius, this.P.gold);
    }
    if (time >= d.endsAt) this.decree = null;
  }

  /** Wheel of the Crown: three arms of gold turning out of him for a few seconds. */
  private castSpiral(time: number): void {
    this.spiral = {
      until: time + SPIRAL_MS,
      nextShotAt: time + 260,
      angle: Math.random() * Math.PI * 2,
    };
    this.kingCastingUntil = time + SPIRAL_MS;
    this.arena.showFloatingText(this.kingX, this.kingY - 46, 'WHEEL OF THE CROWN', '#ffc44d');
    this.scheduleNext(time, SPIRAL_MS + 350);
  }

  private updateSpiral(time: number): void {
    const s = this.spiral;
    if (!s) return;
    if (time >= s.until) { this.spiral = null; return; }

    while (s.nextShotAt <= time) {
      s.angle += SPIRAL_SPIN * (SPIRAL_INTERVAL_MS / 1000);
      for (let i = 0; i < SPIRAL_ARMS; i++) {
        const a = s.angle + (i / SPIRAL_ARMS) * Math.PI * 2;
        this.bullets.push({
          x: this.kingX + Math.cos(a) * 24,
          y: this.kingY + Math.sin(a) * 24,
          vx: Math.cos(a) * SPIRAL_SPEED,
          vy: Math.sin(a) * SPIRAL_SPEED,
          dieAt: s.nextShotAt + 7000,
          damage: SPIRAL_DAMAGE,
          kind: 'spiral',
        });
      }
      s.nextShotAt += SPIRAL_INTERVAL_MS;
    }
  }

  private updateRunes(time: number): void {
    const player = this.arena.player;
    for (let i = this.runes.length - 1; i >= 0; i--) {
      const r = this.runes[i];
      if (time < r.firesAt) continue;
      if (!r.dealt) {
        r.dealt = true;
        this.explode(r.x, r.y, RUNE_RADIUS, RUNE_DAMAGE, this.P.violetLit);
      }
      this.runes.splice(i, 1);
    }
  }

  /**
   * The wraith's scream: three rings off it in every direction but one. The
   * quiet lane opens roughly opposite where the player is standing, so a wail
   * is always a run — and always a run across the room.
   */
  private castWail(time: number): void {
    const W = this.arena.width;
    const H = this.arena.height;
    const player = this.arena.player;
    const maxR = Math.max(W, H) + 120;
    const toPlayer = Math.atan2(player.y - this.kingY, player.x - this.kingX);
    const gap = toPlayer + Math.PI + Phaser.Math.FloatBetween(-0.7, 0.7);

    for (let i = 0; i < WAIL_RINGS; i++) {
      this.rings.push({
        cx: this.kingX, cy: this.kingY,
        radius: i * -WAIL_GAP_MS * WAIL_SPEED / 1000,
        speed: WAIL_SPEED, maxRadius: maxR,
        gapCentre: gap, gapHalf: WAIL_GAP_HALF, band: WAIL_BAND,
        damage: WAIL_DAMAGE, lastHitAt: 0, kind: 'wail',
      });
    }
    this.kingCastingUntil = time + 700;
    this.arena.scene.cameras.main.shake(700, 0.011);
    this.arena.showFloatingText(this.kingX, this.kingY - 52, 'WAIL', '#cfc4e8');
    this.scheduleNext(time, WAIL_GAP_MS * WAIL_RINGS + 700);
  }

  /** The crown comes down on you again — the coronation's finisher, on its own. */
  private castCrownfall(time: number): void {
    const player = this.arena.player;
    this.crownX = player.x;
    this.crownY = player.y;
    this.crownLandsAt = time + 1100;
    this.crownLanded = false;
    this.kingCastingUntil = time + 700;
    this.arena.showFloatingText(this.crownX, this.crownY - 70, '⚠ THE CROWN FALLS', '#ffc44d');
    this.scheduleNext(time, 1500);
  }

  private castSummon(time: number): void {
    this.kingCastingUntil = time + 800;
    const spawned = this.spawnKnights(KNIGHTS_PER_SUMMON);
    this.summonCount++;
    this.arena.showFloatingText(this.kingX, this.kingY - 46, 'ATTEND ME!', '#d8c4ff');
    if (spawned === 0) this.arena.showFloatingText(this.kingX, this.kingY - 66, '(the court is full)', '#5a5a7a');
    this.scheduleNext(time, 900);
  }

  /**
   * The court, in three kinds. A knight walks at you, a herald stands off and
   * throws, and a lancer picks a lane and charges it — so the summon can never
   * be answered by one positioning habit.
   */
  private spawnKnights(count: number): number {
    const scene = this.arena.scene;
    const W = this.arena.width;
    const H = this.arena.height;
    const alive = this.knights.filter((k) => k.active && k.hp > 0).length;
    const n = Math.min(count, MAX_KNIGHTS - alive);

    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const x = Phaser.Math.Clamp(this.kingX + Math.cos(a) * 90, 50, W - 50);
      const y = Phaser.Math.Clamp(this.kingY + Math.sin(a) * 90, H * 0.24, H - 50);

      // First of each summon is a herald, second (from the second summon on) a
      // lancer; the rest are line knights.
      const kind = i === 0 ? 'herald' : (i === 1 && this.summonCount >= 1) ? 'lancer' : 'knight';
      const def = kind === 'herald' ? DISGRACED_HERALD : kind === 'lancer' ? DISGRACED_LANCER : DISGRACED_KNIGHT;
      const hp = kind === 'herald' ? HERALD_HP : kind === 'lancer' ? LANCER_HP : KNIGHT_HP;
      const spd = kind === 'herald' ? HERALD_SPEED : kind === 'lancer' ? LANCER_SPEED : KNIGHT_SPEED;
      const dmg = kind === 'herald' ? HERALD_DAMAGE : kind === 'lancer' ? LANCER_DAMAGE : KNIGHT_DAMAGE;

      const knight = new Husk(scene, x, y, hp, spd, dmg, 1000, def);
      knight.netId = 900 + this.knights.length;
      // A minimal world: heralds throw, lancers telegraph, and nothing else in
      // the HuskWorld surface is reachable from these three behaviours.
      knight.world = this.huskWorld;
      knight.onBite = (dm) => this.hitPlayer(dm, this.arena.player.x, this.arena.player.y);
      knight.on('damaged', (amount: number) => {
        if (amount > 0 && knight.active) this.arena.spawnDamageNumber(knight.x, knight.y - 22, amount);
      });
      knight.once('defeated', () => this.onKnightDefeated(knight));
      this.arena.addEnemy(knight);
      this.knights.push(knight);

      // Rises out of the floor rather than popping in.
      const puff = scene.add.circle(x, y, 30, this.P.violet, 0.45).setDepth(4);
      scene.tweens.add({
        targets: puff, scaleX: 0.2, scaleY: 0.2, alpha: 0, duration: 380,
        onComplete: () => puff.destroy(),
      });
    }
    return n;
  }

  private onKnightDefeated(knight: Husk): void {
    this.arena.removeEnemy(knight);
    this.knights = this.knights.filter((k) => k !== knight);
    knight.hideHealthBar();
    this.arena.scene.tweens.add({
      targets: knight, scaleX: 0.3, scaleY: 0.3, alpha: 0, duration: 320, ease: 'Power2',
      onComplete: () => { if (knight.scene) knight.destroy(); },
    });
  }

  private updateKnights(time: number, delta: number): void {
    if (this.knights.length === 0 && this.larvae.length === 0) return;
    const targets = [this.arena.player];
    for (const k of [...this.knights, ...this.larvae]) {
      if (!k.active || k.hp <= 0) continue;
      k.update(targets, time, delta);
    }
  }

  /**
   * The wraith's floor: crown shards on fixed elliptical tracks that never stop
   * and never despawn. They are not an attack you dodge once — they are terrain.
   */
  private updateOrbitShards(time: number, dt: number): void {
    if (this.orbitShards.length === 0) return;
    const W = this.arena.width;
    const H = this.arena.height;
    const player = this.arena.player;

    for (const s of this.orbitShards) {
      s.angle += s.spin * dt;
      const sx = W / 2 + Math.cos(s.angle) * s.radius;
      const sy = H * 0.55 + Math.sin(s.angle) * s.radius * 0.72;
      if (time - s.lastHitAt < 700) continue;
      if (Phaser.Math.Distance.Between(sx, sy, player.x, player.y) > 22 * player.sizeMult + 14) continue;
      s.lastHitAt = time;
      this.hitPlayer(WRAITH_SHARD_DAMAGE, sx, sy);
    }
  }

  /**
   * The crown landing. Shared by the coronation's fourth beat and the wraith's
   * standalone Crownfall, so both land identically; only the coronation sweeps
   * the rest of the board on impact.
   */
  private updateCrownFall(time: number): void {
    if (this.crownLandsAt <= 0 || this.crownLanded || time < this.crownLandsAt) return;
    const scene = this.arena.scene;
    this.crownLanded = true;
    this.explode(this.crownX, this.crownY, 130, ULT_CROWN_DAMAGE, this.P.goldLit);
    scene.cameras.main.shake(600, 0.020);
    scene.cameras.main.flash(300, 255, 220, 150);
    if (this.ultActive) {
      // The board clears on the impact frame — nothing survives the crown.
      this.bullets = [];
      this.shards = [];
      this.courtiers = [];
      this.ringActive = false;
    }
  }

  // ── The Last Coronation ────────────────────────────────────────────

  /**
   * The ultimate. Five beats over nine seconds, every one of them telegraphed,
   * with the King untouchable throughout — the fight's one guaranteed
   * set-piece — and a deliberate opening at the end of it.
   */
  private beginCoronation(time: number): void {
    const scene = this.arena.scene;
    const W = this.arena.width;

    this.ultUsed = true;
    this.ultActive = true;
    this.ultStartedAt = time;
    this.throneGrow = 0;
    this.throneShatter = 0;
    this.ringActive = false;
    this.crownLanded = false;
    this.courtiers = [];
    this.shards = [];

    const npc = this.arena.npc;
    npc.isInvincible = true;

    // Beat 1 — Dethroning. The court is called in and the crown goes up.
    this.banner('☠  THE LAST CORONATION  ☠', '#ffe9a8', 30);
    scene.cameras.main.shake(700, 0.010);
    for (const k of [...this.knights]) {
      // Consumed, not killed — motes of them stream back into him.
      this.boom(k.x, k.y, 40, this.P.violetLit);
      this.arena.removeEnemy(k);
      this.knights = this.knights.filter((o) => o !== k);
      if (k.scene) k.destroy();
    }
    // Everything he already had in the air is swept off the board.
    this.bullets = this.bullets.filter((b) => b.kind !== 'shield');
    this.purges = [];
    for (const o of this.darkOrbs) this.destroyDarkOrb(o);
    this.darkOrbs = [];

    // He takes the middle of the hall — the throne rises where he stands.
    this.kingX = W / 2;
    this.kingY = this.arena.height * 0.36;
    this.driveKingBody();
  }

  private updateCoronation(time: number, dt: number): void {
    const W = this.arena.width;
    const H = this.arena.height;
    const player = this.arena.player;
    const t = time - this.ultStartedAt;

    // Beat 2 (1.2s) — the throne unfolds and he ascends it.
    if (t >= 1200) this.throneGrow = Math.min(1, this.throneGrow + dt * 1.1);

    // Beat 3 (2.4s) — the court arrives, the shards start their sweep.
    if (t >= 2400 && this.courtiers.length === 0) {
      for (let i = 0; i < ULT_COURTIERS; i++) {
        const a = Math.PI + (i / (ULT_COURTIERS - 1)) * Math.PI;
        this.courtiers.push({
          x: Phaser.Math.Clamp(W / 2 + Math.cos(a) * (W * 0.46), 40, W - 40),
          y: Phaser.Math.Clamp(H * 0.55 + Math.sin(a) * (H * 0.34), 60, H - 60),
          firesAt: time + 700 + i * 350,
          fired: false,
          bornAt: time + i * 120,
        });
      }
      for (let i = 0; i < ULT_SHARDS; i++) {
        this.shards.push({
          angle: (i / ULT_SHARDS) * Math.PI * 2,
          radius: 120 + i * 52,
          spin: (i % 2 === 0 ? 1 : -1) * (0.9 + i * 0.12),
          lastHitAt: 0,
        });
      }
      this.arena.showFloatingText(W / 2, H * 0.5, 'THE COURT ATTENDS', '#ffe9a8');
    }

    // Courtiers: fade in, then take a shot every time their turn comes round —
    // twelve of them on a rolling 2.4s beat is a floor that keeps moving.
    for (const c of this.courtiers) {
      if (time < c.firesAt) continue;
      c.fired = true;
      c.firesAt = time + 2400;
      const a = Math.atan2(player.y - c.y, player.x - c.x);
      this.bullets.push({
        x: c.x, y: c.y,
        vx: Math.cos(a) * 165, vy: Math.sin(a) * 165,
        dieAt: time + 7000, damage: ULT_COURTIER_DAMAGE, kind: 'shield',
      });
    }

    // Crown shards sweeping the floor.
    for (const s of this.shards) {
      s.angle += s.spin * dt;
      const sx = W / 2 + Math.cos(s.angle) * s.radius;
      const sy = H * 0.55 + Math.sin(s.angle) * s.radius * 0.72;
      if (time - s.lastHitAt >= 600
        && Phaser.Math.Distance.Between(sx, sy, player.x, player.y) <= 22 * player.sizeMult + 14) {
        s.lastHitAt = time;
        this.hitPlayer(ULT_SHARD_DAMAGE, sx, sy);
      }
    }

    // Beat 3b (5.0s) — the coronation ring closes on the throne.
    if (t >= 5000 && !this.ringActive) {
      this.ringActive = true;
      this.ringRadius = Math.max(W, H) * 0.62;
      this.arena.showFloatingText(W / 2, H * 0.75, 'KNEEL', '#ffe9a8');
    }
    if (this.ringActive) {
      this.ringRadius = Math.max(96, this.ringRadius - (Math.max(W, H) * 0.62 - 96) / 1.5 * dt);
      const d = Phaser.Math.Distance.Between(W / 2, this.kingY, player.x, player.y);
      if (time - this.ringLastHitAt >= 500 && Math.abs(d - this.ringRadius) <= 22) {
        this.ringLastHitAt = time;
        this.hitPlayer(ULT_RING_DAMAGE, player.x, player.y);
      }
    }

    // Beat 4 (7.4s) — the crown he threw comes down where the player stands.
    if (t >= 7400 && this.crownLandsAt === 0) {
      this.crownX = player.x;
      this.crownY = player.y;
      this.crownLandsAt = time + 1000;
      this.arena.showFloatingText(this.crownX, this.crownY - 70, '⚠ THE CROWN FALLS', '#ffc44d');
    }

    // Beat 5 (9.0s) — spent. Throne shatters, and he is open.
    if (t >= 9000) {
      this.throneShatter = Math.min(1, this.throneShatter + dt * 2);
      if (this.throneShatter >= 1) this.endCoronation(time);
    }
  }

  private endCoronation(time: number): void {
    const npc = this.arena.npc;
    this.ultActive = false;
    this.crownLandsAt = 0;
    this.throneGrow = 0;
    this.throneShatter = 0;
    npc.isInvincible = false;

    // The opening: he is staggered and takes a quarter again as much damage.
    // Short and modest on purpose — surviving the coronation is the reward.
    this.staggerUntil = time + ULT_STAGGER_MS;
    npc.incomingDamageMultiplier = 1.25;
    this.kingCastingUntil = time + ULT_STAGGER_MS;
    this.arena.showFloatingText(this.kingX, this.kingY - 54, 'SPENT — STRIKE NOW', '#67e8a0');
    this.banner('THE CROWN IS SPENT', '#67e8a0', 24);

    // Back to the cycle afterwards, twice as urgent.
    this.busyUntil = time + ULT_STAGGER_MS;
    this.nextMoveAt = this.busyUntil + 300;
    this.arena.scene.time.delayedCall(ULT_STAGGER_MS, () => {
      if (this.phase === 'done') return;
      npc.incomingDamageMultiplier = 1;
    });
  }

  // ── Victory ────────────────────────────────────────────────────────

  private onKingDead(): void {
    const scene = this.arena.scene;
    const W = this.arena.width;
    const H = this.arena.height;

    this.ultActive = false;
    this.arena.npc.incomingDamageMultiplier = 1;
    this.bullets = [];
    this.purges = [];
    this.shards = [];
    this.courtiers = [];
    this.sweeps = [];
    this.rings = [];
    this.grasps = [];
    this.runes = [];
    this.mines = [];
    this.orbitShards = [];
    this.decree = null;
    this.blink = null;
    this.spiral = null;
    this.crownLandsAt = 0;
    this.playerSlowMult = 1;
    this.playerSlowUntil = 0;
    for (const o of this.darkOrbs) this.destroyDarkOrb(o);
    this.darkOrbs = [];
    for (const k of [...this.knights]) this.onKnightDefeated(k);

    this.banner('THE CROWN IS BROKEN', '#ffe9a8', 34);
    scene.cameras.main.flash(600, 255, 255, 255);
    scene.cameras.main.shake(700, 0.012);
    this.boom(this.kingX, this.kingY, 220, this.P.goldLit);
    // The crown comes apart above him, one shard at a time.
    for (let i = 0; i < 6; i++) {
      scene.time.delayedCall(i * 110, () => {
        const a = (i / 6) * Math.PI * 2;
        this.boom(this.kingX + Math.cos(a) * 44, this.kingY - 40 + Math.sin(a) * 30, 30, this.P.gold);
      });
    }
    this.arena.showFloatingText(W / 2, H * 0.5, '👑', '#ffc44d');

    scene.time.delayedCall(1600, () => this.arena.bossVictory());
  }

  // ── Shared effects ─────────────────────────────────────────────────

  /**
   * The single chokepoint every scrap of the fight's damage runs through, which
   * is why hard mode's multiplier is applied here and nowhere else — each attack
   * keeps its own tuned figure and the mode scales all of them together.
   */
  private hitPlayer(amount: number, x: number, y: number): void {
    const p = this.arena.player;
    if (!p.active || p.hp <= 0) return;
    // Once it is on the floor it has stopped. Nothing lands during the choice.
    if (this.phase === 'kneel' || this.phase === 'done') return;
    p.takeDamage(this.hard ? Math.round(amount * HARD_DAMAGE_MULT) : amount);
    this.arena.spawnHitFlash(x, y, this.P.violetLit);
  }

  /** AoE against the player plus the visual. */
  private explode(x: number, y: number, radius: number, damage: number, color: number): void {
    this.boom(x, y, radius, color);
    const p = this.arena.player;
    if (Phaser.Math.Distance.Between(x, y, p.x, p.y) <= radius) this.hitPlayer(damage, p.x, p.y);
  }

  private boom(x: number, y: number, radius: number, color: number): void {
    const scene = this.arena.scene;
    const ring = scene.add.circle(x, y, radius, color, 0.4).setDepth(18).setScale(0.25);
    scene.tweens.add({
      targets: ring, scaleX: 1, scaleY: 1, alpha: 0, duration: 340,
      onComplete: () => ring.destroy(),
    });
  }

  private banner(text: string, color: string, size: number): void {
    const scene = this.arena.scene;
    const t = scene.add.text(this.arena.width / 2, 132, text, {
      fontSize: `${size}px`, fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
      color, stroke: '#0a0510', strokeThickness: 6, letterSpacing: 2,
    }).setOrigin(0.5).setDepth(27).setAlpha(0);
    scene.tweens.add({ targets: t, alpha: 1, duration: 220 });
    scene.tweens.add({
      targets: t, alpha: 0, scaleX: 1.18, scaleY: 1.18, delay: 1500, duration: 700,
      onComplete: () => t.destroy(),
    });
  }

  // ── Rendering ──────────────────────────────────────────────────────

  private draw(time: number): void {
    const W = this.arena.width;
    const H = this.arena.height;
    const npc = this.arena.npc;
    const mechAlive = this.phase === 'intro' || this.phase === 'mech';

    const pose: MechPose = {
      cx: W / 2,
      hpRatio: mechAlive ? Math.max(0, npc.hp / (this.hard ? MECH_HP_HARD : MECH_HP)) : 0,
      enraged: mechAlive && this.isEnraged(),
      dead: !mechAlive,
      time,
    };

    if (this.mechBodyG) this.FX.drawMechBody(this.mechBodyG, pose);
    if (this.mechHeadG) {
      this.FX.drawMechHead(this.mechHeadG, pose, time < this.hurtFlashUntil ? 1 : 0);
    }
    if (this.armsG) {
      const arms: MechArmPose[] = this.arms.map((a) => ({
        side: a.side, fistX: a.x, fistY: a.y, hot: a.phase !== 'rest',
      }));
      this.FX.drawMechArms(this.armsG, pose, arms);
    }

    // Head hitbox tracks the drawn head, sway included.
    if (mechAlive) {
      (npc.body as Phaser.Physics.Arcade.Body | null)?.reset(
        W / 2 + Math.sin(time / 1100) * 5, MECH_HEAD_CY + Math.sin(time / 800) * 3,
      );
    }

    // ── Ground layer: telegraphs and floor hazards.
    const g = this.groundG;
    if (g) {
      g.clear();
      for (const l of this.lasers) {
        const charge = l.dealt ? 0 : 1 - (l.firesAt - time) / LASER_WARN_MS;
        const fire = l.dealt ? (l.endsAt - time) / LASER_FIRE_MS : 0;
        this.FX.drawLaserColumn(g, l.x, 0, H, LASER_HALF_W,
          Phaser.Math.Clamp(charge, 0, 1), Phaser.Math.Clamp(fire, 0, 1), time);
      }
      // Pools first, so a fresh marker still reads on top of old ground.
      for (const p of this.pools) {
        DevouredFx.drawBilePool(g, p.x, p.y, p.radius,
          Phaser.Math.Clamp((time - p.bornAt) / (p.dieAt - p.bornAt), 0, 1), time);
      }
      for (const r of this.rockets) {
        if (time < r.startedAt) continue;
        const fall = r.pool ? BILE_FALL_MS : ROCKET_FALL_MS;
        const t = 1 - (r.landsAt - time) / fall;
        this.FX.drawRocketMarker(g, r.tx, r.ty, r.pool ? BILE_BLAST_R : ROCKET_RADIUS,
          Phaser.Math.Clamp(t, 0, 1));
      }
      // The Gullet's wind-up: the wedge it will leave, marked for the full 1.5s.
      const m = this.maw;
      if (m) {
        DevouredFx.drawMawWarn(g, m.cx, m.cy, Math.hypot(W, H) * 0.62,
          m.gapCentre, m.gapHalf,
          Phaser.Math.Clamp((time - m.startedAt) / (m.bitesAt - m.startedAt), 0, 1), time);
      }
      // The chorus's lanes — warning band, then the discharge. A king that has
      // not taken aim yet has no lane to draw.
      for (const c of this.chorus) {
        if (Number.isNaN(c.aim)) continue;
        const warn = c.dealt ? 0 : 1 - (c.firesAt - time) / CHORUS_WARN_MS;
        const fire = c.dealt ? (c.endsAt - time) / CHORUS_FIRE_MS : 0;
        if (warn <= 0 && fire <= 0) continue;
        DevouredFx.drawChorusBeam(g, c.x, c.y, c.aim, Math.hypot(W, H), CHORUS_HALF_W,
          Phaser.Math.Clamp(warn, 0, 1), Phaser.Math.Clamp(fire, 0, 1), time);
      }
      for (const s of this.slams) {
        const t = 1 - (s.landsAt - time) / SLAM_WARN_MS;
        this.FX.drawSlamMarker(g, s.x, s.y, SLAM_RADIUS, Phaser.Math.Clamp(t, 0, 1), time);
      }
      for (const p of this.purges) {
        const charge = p.dealt ? 0 : 1 - (p.firesAt - time) / PURGE_WARN_MS;
        const fire = p.dealt ? (p.endsAt - time) / PURGE_FIRE_MS : 0;
        this.FX.drawPurgeLane(g, p.horizontal, p.centre, PURGE_HALF_SPAN,
          0, p.horizontal ? W : H,
          Phaser.Math.Clamp(charge, 0, 1), Phaser.Math.Clamp(fire, 0, 1), time);
      }
      // Judgement Arc telegraph, drawn on the floor so the beam itself (which
      // is in the air, on the projectile layer) reads as a separate thing.
      for (const s of this.sweeps) {
        if (time >= s.startsAt) continue;
        const charge = 1 - (s.startsAt - time) / SWEEP_WARN_MS;
        this.FX.drawSweepFan(g, s.ox, s.oy, s.a0, s.a1, Math.hypot(W, H),
          Phaser.Math.Clamp(charge, 0, 1), time);
      }
      for (const m of this.mines) {
        this.FX.drawMine(g, m.x, m.y,
          Phaser.Math.Clamp(1 - (m.armedAt - time) / MINE_ARM_MS, 0, 1), MINE_TRIGGER_R, time);
      }
      for (const r of this.rings) {
        if (r.kind === 'quake') {
          this.FX.drawShockRing(g, r.cx, r.cy, r.radius, r.gapCentre, r.gapHalf, time);
        } else if (r.kind === 'gullet') {
          DevouredFx.drawGulletRing(g, r.cx, r.cy, r.radius, r.gapCentre, r.gapHalf, time);
        } else {
          this.FX.drawWailRing(g, r.cx, r.cy, r.radius, r.gapCentre, r.gapHalf, time);
        }
      }
      for (const h of this.grasps) {
        if (time < h.firesAt) {
          this.FX.drawGraspHand(g, h.x, h.y,
            Phaser.Math.Clamp(1 - (h.firesAt - time) / GRASP_WARN_MS, 0, 1), 0, time);
        } else {
          // Never exactly 0 — that is the warning branch, and the hand is out.
          this.FX.drawGraspHand(g, h.x, h.y, 1,
            Phaser.Math.Clamp((time - h.firesAt) / (h.endsAt - h.firesAt), 0.02, 1), time);
        }
      }
      for (const r of this.runes) {
        this.FX.drawRune(g, r.x, r.y, RUNE_RADIUS,
          Phaser.Math.Clamp(1 - (r.firesAt - time) / RUNE_WARN_MS, 0, 1), time);
      }
      if (this.ringActive) this.FX.drawCoronationRing(g, W / 2, this.kingY, this.ringRadius, time);
      if (this.crownLandsAt > 0 && !this.crownLanded) {
        const t = 1 - (this.crownLandsAt - time) / 1000;
        this.FX.drawCrownFall(g, this.crownX, this.crownY, 130, Phaser.Math.Clamp(t, 0, 1), time);
      }
      for (const orb of this.healOrbs) {
        if (!orb.taken) this.FX.drawHealOrb(g, orb.x, orb.y, time);
      }
    }

    // ── Projectile layer.
    const pg = this.projG;
    if (pg) {
      pg.clear();
      for (const r of this.rockets) {
        if (time < r.startedAt) continue;
        const t = Phaser.Math.Clamp((time - r.startedAt) / (r.pool ? BILE_FALL_MS : ROCKET_FALL_MS), 0, 1);
        // Up and off the top for the first third, then back down onto the mark.
        if (t < 0.32) {
          const k = t / 0.32;
          const x = Phaser.Math.Linear(r.x, r.x + (r.tx - r.x) * 0.2, k);
          const y = Phaser.Math.Linear(r.y, -60, k);
          this.FX.drawRocket(pg, x, y, -Math.PI / 2, time);
        } else if (t > 0.72) {
          const k = (t - 0.72) / 0.28;
          const y = Phaser.Math.Linear(-60, r.ty, k);
          this.FX.drawRocket(pg, r.tx, y, Math.PI / 2, time);
        }
      }
      for (const b of this.bullets) {
        if (b.kind === 'mg') this.FX.drawBullet(pg, b.x, b.y, Math.atan2(b.vy, b.vx));
        else if (b.kind === 'spiral') this.FX.drawSpiralBolt(pg, b.x, b.y, time);
        else if (b.kind === 'herald') this.FX.drawHeraldBolt(pg, b.x, b.y, Math.atan2(b.vy, b.vx));
        else this.FX.drawShieldBullet(pg, b.x, b.y, time);
      }
      // The lance itself, in the air, plus the rift he steps out of.
      for (const s of this.sweeps) {
        if (time < s.startsAt) continue;
        const t = (time - s.startsAt) / (s.endsAt - s.startsAt);
        this.FX.drawSweepBeam(pg, s.ox, s.oy, Phaser.Math.Linear(s.a0, s.a1, t),
          Math.hypot(W, H), SWEEP_HALF_W, time);
      }
      const bl = this.blink;
      if (bl) {
        if (!bl.arrived) {
          this.FX.drawBlinkRift(pg, bl.toX, bl.toY,
            Phaser.Math.Clamp(1 - (bl.arriveAt - time) / BLINK_VANISH_MS, 0, 1), time);
        } else if (time >= bl.strikeAt) {
          this.FX.drawCleave(pg, this.kingX, this.kingY, bl.angle,
            CLEAVE_HALF_ANGLE, CLEAVE_RADIUS,
            Phaser.Math.Clamp((time - bl.strikeAt) / (bl.endsAt - bl.strikeAt), 0, 1));
        } else {
          // Wind-up: the arc he is about to swing, drawn faintly.
          this.FX.drawCleave(pg, this.kingX, this.kingY, bl.angle,
            CLEAVE_HALF_ANGLE, CLEAVE_RADIUS * 0.55,
            0.28 * Phaser.Math.Clamp((time - bl.arriveAt) / BLINK_WINDUP_MS, 0, 1));
        }
      }
      for (const o of this.darkOrbs) this.FX.drawDarkOrb(pg, o.x, o.y, o.angle, time);
      for (const s of this.orbitShards) {
        const sx = W / 2 + Math.cos(s.angle) * s.radius;
        const sy = H * 0.55 + Math.sin(s.angle) * s.radius * 0.72;
        this.FX.drawCrownShard(pg, sx, sy, s.angle + Math.PI / 2, time);
      }
      for (const c of this.courtiers) {
        const a = Phaser.Math.Clamp((time - c.bornAt) / 600, 0, 1);
        this.FX.drawCourtier(pg, c.x, c.y, a, time);
      }
      for (const s of this.shards) {
        const sx = W / 2 + Math.cos(s.angle) * s.radius;
        const sy = H * 0.55 + Math.sin(s.angle) * s.radius * 0.72;
        this.FX.drawCrownShard(pg, sx, sy, s.angle + Math.PI / 2, time);
      }
      // The chorus's kings, and the Devourer's hearts.
      for (const c of this.chorus) {
        const t = Phaser.Math.Clamp(1 - (c.firesAt - time) / CHORUS_WARN_MS, 0, 1);
        // Before it takes aim it is just standing there — draw it looking down.
        DevouredFx.drawChorusKing(pg, c.x, c.y, Number.isNaN(c.aim) ? Math.PI / 2 : c.aim,
          Number.isNaN(c.aim) ? 0 : t, c.dealt, time);
      }
      for (const h of this.hearts) {
        DevouredFx.drawHeart(pg, h.x, h.y, FEAST_HEART_SIZE, time,
          time < h.hurtUntil ? 1 : 0);
      }
    }

    // ── The King and his throne.
    if (this.throneG) {
      this.FX.drawThrone(this.throneG, W / 2, this.kingY + 40, this.throneGrow, this.throneShatter, time);
    }
    const kg = this.kingG;
    // Hard mode's last three phases all draw the Devourer; the wraith art only
    // owns phase three, and only up to the moment the crown comes apart.
    const devourPhase = this.phase === 'consume' || this.phase === 'devourer'
      || this.phase === 'kneel' || (this.phase === 'done' && this.devourStartedAt > 0);
    const wraithPhase = !devourPhase
      && (this.phase === 'wraith' || (this.phase === 'done' && this.wraithStartedAt > 0));
    if (kg) {
      kg.clear();
      if (devourPhase) {
        // During `consume` it is still assembling — hold it off-screen until the
        // set piece hands over, which is what `devourer`/`kneel` gate on.
        if (this.phase !== 'consume') {
          const brokenT = this.phase === 'kneel'
            ? Phaser.Math.Clamp((time - this.kneelStartedAt) / 1400, 0, 1)
            : 0;
          DevouredFx.drawDevourer(kg, this.kingX, this.kingY, time, {
            rise: this.kingRise,
            casting: time < this.kingCastingUntil,
            enraged: this.isEnraged() && this.phase === 'devourer',
            feasting: this.feastActive,
            broken: brokenT,
          });
        }
      } else if (wraithPhase) {
        this.FX.drawWraith(kg, this.kingX, this.kingY, time, {
          rise: this.kingRise,
          casting: time < this.kingCastingUntil,
          enraged: this.isEnraged(),
        });
      } else if (this.phase === 'king' || this.phase === 'ascend') {
        // Enthroned, he sits up on the seat rather than standing in front of it.
        // Mid-Regicide he is off the board entirely and simply is not drawn.
        const seatLift = this.ultActive ? 26 * Math.min(1, this.throneGrow) : 0;
        if (time >= this.kingHiddenUntil) {
          this.FX.drawKing(kg, this.kingX, this.kingY - seatLift, time, {
            rise: this.phase === 'ascend' ? this.kingRise : Math.max(this.kingRise, 0.001),
            casting: time < this.kingCastingUntil,
            enthroned: this.ultActive,
            staggered: time < this.staggerUntil,
          });
        }
      }
    }

    // ── Full-screen layers: the decree's condemned ground, the coronation's
    // wash, and the pall the wraith drags over the hall.
    // The gullet: painted over the hall from the moment the crown splits, and
    // held right through the ending so the room the choice happens in is its
    // insides, not the throne room.
    const gg = this.gulletG;
    if (gg) {
      if (devourPhase) {
        const t = Phaser.Math.Clamp((time - this.devourStartedAt - 1200) / 2200, 0, 1);
        DevouredFx.drawGullet(gg, W, H, t, time);
      } else if (this.hard) {
        gg.clear();
      }
    }

    const wg = this.washG;
    if (wg) {
      wg.clear();
      if (devourPhase) {
        if (this.phase === 'consume') {
          // The set piece owns the whole screen for its four seconds.
          DevouredFx.drawConsume(wg, W, H, this.kingX, this.kingY,
            Phaser.Math.Clamp((time - this.phaseStartedAt) / CONSUME_MS, 0, 1), time);
        } else if (this.phase === 'kneel' || this.phase === 'done') {
          // The room comes back up as it goes out.
          DevouredFx.drawAftermath(wg, W, H,
            Phaser.Math.Clamp((time - this.kneelStartedAt) / 2400, 0, 1), time);
        } else {
          DevouredFx.drawDevourerVeil(wg, W, H, 1, this.feastActive ? 1 : 0, time);
        }
      } else if (this.phase === 'ascend' || wraithPhase) {
        const t = Phaser.Math.Clamp((time - this.wraithStartedAt) / 1600, 0, 1);
        this.FX.drawWraithVeil(wg, W, H, t, time);
      }
      if (this.ultActive) {
        const t = Phaser.Math.Clamp((time - this.ultStartedAt) / 900, 0, 1);
        wg.fillStyle(this.P.gloom, 0.30 * t * (1 - this.throneShatter));
        wg.fillRect(0, 0, W, H);
        wg.lineStyle(4, this.P.violetLit, 0.45 * t * (1 - this.throneShatter));
        wg.strokeRect(6, 6, W - 12, H - 12);
      }
      const d = this.decree;
      if (d && !d.dealt) {
        this.FX.drawDecree(wg, d.x, d.y, d.radius,
          Phaser.Math.Clamp(1 - (d.firesAt - time) / DECREE_WARN_MS, 0, 1), time);
      }
    }
  }

  /** Boss health, across the foot of the arena. */
  private drawBossBar(): void {
    const g = this.barG;
    if (!g || !this.barLabel) return;
    const W = this.arena.width;
    const H = this.arena.height;
    const npc = this.arena.npc;

    const barW = 560;
    const barH = 16;
    const x = W / 2 - barW / 2;
    const y = H - 78;
    const interlude = this.phase === 'wreck' || this.phase === 'ascend' || this.phase === 'consume';
    const devourPhase = this.phase === 'consume' || this.phase === 'devourer'
      || this.phase === 'kneel' || (this.phase === 'done' && this.devourStartedAt > 0);
    const ratio = interlude ? 0 : Phaser.Math.Clamp(npc.hp / Math.max(1, npc.maxHp), 0, 1);
    const wraithPhase = !devourPhase
      && (this.phase === 'wraith' || (this.phase === 'done' && this.wraithStartedAt > 0));
    const kingPhase = this.phase === 'king' || this.phase === 'ascend';
    const accent = devourPhase ? this.P.warn : wraithPhase ? this.P.gold : kingPhase ? this.P.violet : this.P.ember;
    const accentLit = devourPhase ? this.P.warnLit
      : wraithPhase ? this.P.goldLit : kingPhase ? this.P.violetLit : this.P.emberLit;
    // Hard mode has a fourth body, so the pip strip grows to match.
    const pips = this.hard ? 4 : 3;

    g.clear();
    g.fillStyle(this.P.voidBlack, 0.85);
    g.fillRect(x - 3, y - 3, barW + 6, barH + 6);
    g.lineStyle(2, accent, 0.9);
    g.strokeRect(x - 3, y - 3, barW + 6, barH + 6);

    if (ratio > 0) {
      const fillW = barW * ratio;
      g.fillStyle(accent, 1);
      g.fillRect(x, y, fillW, barH);
      g.fillStyle(accentLit, 0.7);
      g.fillRect(x, y, fillW, barH / 2);
      // The ultimate threshold, marked so the last stretch is no surprise.
      if (this.phase === 'king' && !this.ultUsed) {
        const tx = x + barW * ULT_HP_FRACTION;
        g.lineStyle(2, this.P.gold, 0.9);
        g.lineBetween(tx, y - 4, tx, y + barH + 4);
      }
      if (this.phase === 'devourer' && !this.feastUsed) {
        const tx = x + barW * FEAST_HP_FRACTION;
        g.lineStyle(2, this.P.warnLit, 0.9);
        g.lineBetween(tx, y - 4, tx, y + barH + 4);
      }
    }

    // Segment ticks, so chunks of damage are legible.
    g.lineStyle(1, this.P.voidBlack, 0.6);
    for (let i = 1; i < 10; i++) g.lineBetween(x + (barW / 10) * i, y, x + (barW / 10) * i, y + barH);

    // Three pips to the left of the bar — one per body, filled as they break.
    // Without them a bar that refills twice reads as the fight going backwards.
    const stage = devourPhase ? 4 : wraithPhase ? 3 : kingPhase ? 2 : 1;
    for (let i = 1; i <= pips; i++) {
      const px = x - 22 - (pips - i) * 15;
      const done = i < stage;
      g.fillStyle(done ? this.P.gold : i === stage ? accentLit : this.P.iron, done ? 0.55 : 1);
      g.fillCircle(px, y + barH / 2, i === stage ? 5.5 : 4);
      g.lineStyle(1.5, this.P.voidBlack, 0.9);
      g.strokeCircle(px, y + barH / 2, i === stage ? 5.5 : 4);
    }

    const hearts = this.hearts.length;
    const label = this.feastActive ? `THE FEAST  —  ${hearts} HEART${hearts === 1 ? '' : 'S'} LEFT`
      : this.ultActive ? 'THE LAST CORONATION  —  UNTOUCHABLE'
      : this.phase === 'wreck' ? 'THE MECH IS BROKEN'
      : this.phase === 'ascend' ? 'THE CROWN GATHERS HIM UP'
      : this.phase === 'consume' ? 'THE CROWN IS COMING APART'
      : this.phase === 'kneel' ? 'IT IS SITTING ON THE FLOOR'
      : devourPhase ? `THE DEVOURER OF KINGS   ${Math.ceil(npc.hp)} / ${npc.maxHp}`
      : wraithPhase ? `THE CROWNED WRAITH   ${Math.ceil(npc.hp)} / ${npc.maxHp}`
      : kingPhase ? `THE DISGRACED KING   ${Math.ceil(npc.hp)} / ${npc.maxHp}`
      : `${this.hard ? 'DEVOURED' : 'DISGRACED'} WAR-MECH   ${Math.ceil(npc.hp)} / ${npc.maxHp}`;
    this.barLabel.setText(label);
    this.barLabel.setColor(this.feastActive ? '#ff2f52'
      : this.ultActive ? '#ffe9a8'
      : devourPhase ? '#ffa0b2'
      : wraithPhase ? '#ffc44d' : kingPhase ? '#d8c4ff' : '#ff9a4d');
  }

  // ── Queries for ArenaScene ─────────────────────────────────────────

  /**
   * True for the hitboxes this fight owns (destructible dark orbs). The arena's
   * projectile overlap otherwise routes any non-husk enemy to `npc`, which
   * would send shots meant for an orb into the boss.
   */
  ownsEnemy(f: Fighter): boolean {
    return this.darkOrbs.some((o) => o.hitbox === f)
      || this.hearts.some((h) => h.hitbox === f);
  }

  /**
   * The fight's contribution to the player's movement speed. ArenaScene rebuilds
   * `playerSpeedMult` from scratch every frame, so a slow written onto the player
   * would be gone by the next one — it reads this instead.
   */
  getPlayerSpeedMult(): number {
    return this.playerSlowUntil > 0 ? this.playerSlowMult : 1;
  }

  /** Suppresses the arena's normal win/loss handling while the fight runs. */
  get isFinished(): boolean {
    return this.phase === 'done';
  }
}
