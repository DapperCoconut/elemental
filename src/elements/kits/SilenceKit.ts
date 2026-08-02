import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { Projectile } from '../../combat/Projectile';
import { CastContext } from '../Ability';
import type { HuskStatus } from '../../invasion/InvasionKit';
import type { NetSilenceMsg } from '../../network/NetworkManager';
import type { CustomStatus } from './StatusHudKit';
import {
  ArmGesture, SILENCE, SilenceAura, SilenceAuraStyle, SilenceAvatar, SilenceColorFn, SilenceFx,
  bloodSplat, clawFingerLayered, fogBank, silenceEye, toothRing,
} from './SilenceVisuals';

// ── SilenceArenaApi ────────────────────────────────────────────────────────

export interface SilenceArenaApi {
  readonly player: Fighter;
  readonly npc: Fighter;
  readonly scene: Phaser.Scene;
  readonly projectiles: Phaser.Physics.Arcade.Group;
  readonly spaceKey: Phaser.Input.Keyboard.Key;
  readonly eKey: Phaser.Input.Keyboard.Key;
  readonly rKey: Phaser.Input.Keyboard.Key;
  readonly fKey: Phaser.Input.Keyboard.Key;
  readonly qKey: Phaser.Input.Keyboard.Key;
  /** WASD — only read while Puppetmaster has you steering the possessed body. */
  readonly wKey: Phaser.Input.Keyboard.Key;
  readonly aKey: Phaser.Input.Keyboard.Key;
  readonly sKey: Phaser.Input.Keyboard.Key;
  readonly dKey: Phaser.Input.Keyboard.Key;
  readonly enemies: Fighter[];
  readonly width: number;
  readonly height: number;
  readonly isOnline: boolean;
  readonly isInvasion: boolean;
  /** Multiplies this frame's npc speed aggregate (call every frame the effect is live). */
  applyNpcSpeedMult(f: number): void;
  /** While in the future, WASD is blocked but kit-set velocities persist. */
  setPlayerYankUntil(t: number): void;
  spawnHitFlash(x: number, y: number, color: number): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  buildPlayerContext(x: number, y: number): CastContext;
  buildNpcContext(x: number, y: number): CastContext;
  /** Shop upgrades. Player side reads the local save; npc side is the online peer's synced list. */
  hasUpgrade(owner: Owner, slot: string): boolean;
  hasPerk(owner: Owner, perkId: string): boolean;
  /** Online: forward a silence upgrade event to the peer (no-op offline). */
  sendSilenceMsg(msg: NetSilenceMsg): void;
  /** Owner's skin applied to one Silence palette value. */
  silenceColor(owner: Owner, base: number): number;
  /** Silence Mastery is enabled and the local player is actually playing Silence. */
  readonly masteryActive: boolean;
  /** The mastery enhancement bound over an ability slot this match, or null. */
  masteryBindFor(slot: string): string | null;
  /** Requirement counters. The adapter gates these on `elementId === 'silence'`. */
  recordMasteryStat(key: string, amount: number): void;
  /**
   * Online: broadcast a mastery-cast id for the peer's sim to replay. Puppetmaster's
   * awakened actions ride this channel as their own `puppet-*` ids so both sims agree
   * on which branch was taken, rather than each re-deriving it from a cursor position.
   */
  broadcastMasteryCast(enhId: string): void;
  /**
   * Invasion co-op guest: tell the host to hold husk `id` still and place it here.
   * No-op when we are the host or offline (we own the husk sim in both those cases).
   */
  sendHuskPuppet(id: number, on: boolean, x: number, y: number): void;
  /** Top-right status tray (player side only). */
  setStatusIndicator(id: string, status: CustomStatus | null): void;
}

type Owner = 'player' | 'npc';

// ── Tuning ─────────────────────────────────────────────────────────────────

const FOG_WIDTH = 90;                 // px ring around the arena border
const STEALTH_MAX = 100;
const STEALTH_GAIN_PER_S = 10;
const STEALTH_DRAIN_PER_S = 10;
const STALKER_RATE_BONUS = 0.2;       // per stalker: +20% gain, -20% drain
const STALKER_DMG_BONUS = 0.1;        // per stalker: +10% outgoing kit damage

const STAB_CD_ID = 'silence-stab';
const STAB_BASE_DMG = 20;
const STAB_MAX_BONUS = 25;            // at 100 stealth → 45 total
const STAB_BACKSTAB_MULT = 1.5;
const STAB_SILENCE_MS = 12000;
const STAB_DASH_LEN = 170;
const STAB_LANE_HALF_W = 55;
const BACKSTAB_ARC_RAD = Math.PI * (120 / 180) / 2; // ±60° rear arc

const STALKER_MAX = 3;
const STALKER_MATURE_MS = 35000;
const STALKER_PULSE_MS = 15000;
const STALKER_RADIUS = 14;

const RITUAL_RANGE = 450;
const RITUAL_RADIUS = 75;
const RITUAL_DELAY_MS = 1000;
const RITUAL_DMG = 25;
const RITUAL_SILENCE_MS = 20000;

// Torture perk: the ritual stops being an execution and becomes a rack.
const TORTURE_MS = 6000;
const TORTURE_TICK_MS = 1000;
const TORTURE_BASE_DPS = 4;
const TORTURE_STACK_DPS = 2;
const TORTURE_MAX_STACKS = 3;
/** Every tick of the rack drags the victim's silence out another second. */
const TORTURE_SILENCE_PER_TICK_MS = 1000;

const GRABBER_LIFETIME_MS = 60000;
const GRABBER_FIRST_GRAB_MS = 10000;
const GRABBER_GRAB_EVERY_MS = 20000;
const GRABBER_DRAG_WINDOW_MS = 2500;
const GRABBER_DRAG_SPEED = 300;
const GRABBER_CATCH_DIST = 50;
const GRABBER_DMG = 50;
const GRABBER_CD_PENALTY = 1.2;       // permanent cooldownMult / attackIntervalMult factor
const GRAB_ESCAPE_PRESSES = 14;
const GRAB_BOT_ESCAPE_CHANCE = 0.33;

const FEAST_RADIUS = 110;
const FEAST_DURATION_MS = 8000;
const FEAST_REQUIRED_INSIDE_MS = 6000;
const FEAST_DMG = 35;
const FEAST_FOLLOW_OFFSET = 60;       // leans toward the caster's facing (cursor for players)
const HALLUCINATE_MS = 30000;

const RUN_ARM_RANGE = 500;
const RUN_ARM_MS = 350;
const RUN_HIT_RADIUS = 60;
const RUN_MISS_REFUND_MS = 45000;     // whiffed grab → only ~15s effective CD
const HALL_HALF_W = 110;
const HALL_TOP_Y = 50;
const HALL_EXIT_Y = 80;               // victim crossing above this escapes
const BLOB_SPEED = 380;
/** Dread: the victim runs at 80% speed inside the hallway — walk + dodge-spam
 *  loses to the blob, but real mobility kits (dashes, teleports) still escape. */
const HALL_VICTIM_SLOW = 0.8;
const BLOB_CATCH_DIST = 50;
/** The exit stays sealed this long — the victim must survive the blob first. */
const HALL_DOOR_OPEN_MS = 4500;
const BLOB_CATCH_DMG = 80;
const CHASE_TIMEOUT_MS = 14000;
const BOT_SURVIVE_BASE = 0.5;
const SPIT_DMG = 5;
const SPIT_SLOW_MS = 500;
const SPIT_SPEED = 430;
const SPIT_SURVIVAL_PENALTY = 0.02;

// Hallucination cadence (all ms)
const HALLUC_EYE_SCREEN_EVERY = 10000;
const HALLUC_EYE_SCREEN_DUR = 2000;
const HALLUC_FAKE_POS_EVERY = 8000;
const HALLUC_FAKE_POS_DUR = 3000;

// ── Upgrade tuning ─────────────────────────────────────────────────────────

// Click+ Sacrifice
const SACRIFICE_RADIUS = 130;
const SACRIFICE_DMG = 15;
const SACRIFICE_SILENCE_MS = 10000;
const SACRIFICE_MATURE_DELAY_MS = 5000;

// E+ Mutant: seekers, panic, vultures
const SEEKER_HITS = 3;
const SEEKER_SPEED = 120;
const SEEKER_TURN_EVERY_MS = 1500;
const SEEKER_CONE_LEN = 200;
const SEEKER_CONE_HALF_RAD = Math.PI / 6; // ±30°
const PANIC_MS = 8000;
const PANIC_STAB_DRAIN = 50;
const VULTURE_LIFETIME_MS = 60000;
const VULTURE_FIRST_CARRY_MS = 6000;
const VULTURE_CARRY_EVERY_MS = 20000;
const VULTURE_SPEED = 150;
const VULTURE_CARRY_UP_MS = 1200;
const VULTURE_CARRY_HOLD_MS = 1500;
const VULTURE_CARRY_DOWN_MS = 1200;
const VULTURE_DROP_DMG = 50;
const BLOOD_DECAL_MS = 10000;

// R+ Night Terror: terror bar + striker form
const TERROR_MAX = 100;
const STRIKER_BASE_MS = 20000;
const STRIKER_SELF_CAST_DIST = 50;
const STRIKER_EXTEND_MS_PER_DMG = 1000 / 5;   // +1s per 5 dmg dealt
const STRIKER_SHRINK_MS_PER_DMG = 1000 / 15;  // -1s per 15 dmg absorbed
const STRIKER_BURST_MULT = 0.75;              // un-transform burst: stored damage -25%
const SLASH_DMG = 15;
const SLASH_RANGE = 95;
const SLASH_ARC_HALF_RAD = Math.PI / 3;       // ±60° front arc
const SLASH_PULL_SPEED = 620;
const BOGGLE_CD_MS = 15000;
const BOGGLE_LIFETIME_MS = 8000;
const BOGGLE_EYES = 3;
const BOGGLE_ORBIT_R = 52;
const BOGGLE_SHOT_EVERY_MS = 1200;
const BOGGLE_SHOT_DMG = 5;
const BOGGLE_SHOT_SPEED = 380;
const ALLURE_MS = 3000;
const ALLURE_RESIST_MULT = 0.75;              // 25% resistance on absorbed damage
const SANGUINE_CHARGE_MS = 3000;
const SANGUINE_LEN = 360;
const SANGUINE_WID = 220;
const SANGUINE_SLASHES = 10;
const SANGUINE_SLASH_DMG = 6;
const SANGUINE_STAGGER_MS = 80;

// F+ Flesh Banquet
const MIDGET_COUNT = 5;
const MIDGET_SPEED = 140;
const MIDGET_DMG = 5;
const MIDGET_BITE_CD_MS = 500;
const FLESH_DECAL_COUNT = 26;

// Q+ The Labyrinth
const MAZE_COLS = 9;
const MAZE_ROWS = 6;
const MAZE_WALL_T = 12;
const MAZE_VICTIM_SCALE = 0.6;
const MAZE_VICTIM_SLOW = 0.7;                 // stacks on HALL_VICTIM_SLOW
const MAZE_ZOOM = 1.6;
const MAZE_EAT_MS = 1200;
const MAZE_VISION_RADIUS = 170;
const MAZE_BOT_SURVIVE_MULT = 0.5;
/** The blob lumbers in the maze — walls (and eating them) are its real weapon. */
const MAZE_BLOB_SPEED = 240;

// ── Mastery tuning ─────────────────────────────────────────────────────────

// Weep (passive)
const WEEP_SPEED_MULT = 1.5;
const WEEP_DRAIN_MULT = 0.75;
/** Half-angle of the cone an enemy counts as "looking at you" through. */
const WEEP_WATCH_ARC_RAD = Math.PI * (100 / 180) / 2;

// Puppetmaster (bindable)
const PUPPET_COOLDOWN_MS = 12000;
/** A stab must have landed on the enemy this recently for the doll to take. */
const PUPPET_STAB_WINDOW_MS = 5000;
const PUPPET_TERROR_COST = 25;
const DOLL_HP = 50;
const DOLL_RELAY_MULT = 1.25;
const DOLL_HIT_RADIUS = 22;

const AWAKEN_DURATION_MS = 15000;
const AWAKEN_UNPOSSESS_DMG = 20;
/** Matches OnlineKit's 20 Hz state cadence — the drive vector rides alongside it. */
const PUPPET_MOVE_SEND_MS = 50;
const AWAKEN_SLASH_DMG = 15;
const AWAKEN_SLASH_RANGE = 100;
const AWAKEN_SLASH_ARC_RAD = Math.PI / 3;
const AWAKEN_BITE_DMG = 10;
const AWAKEN_BITE_HEAL = 12;
/**
 * Kin are picked with the cursor, not with a cone off the host: they crawl in and huddle
 * against the body you are steering, so a host-relative angle to one is mostly noise and
 * you cannot see well enough through your own sprite to aim it. Point at the creature.
 */
const KIN_PICK_CURSOR_RADIUS = 48;
const KIN_PICK_MAX_DIST = 220;
const AWAKEN_CANNIBAL_DMG = 20;
const AWAKEN_CANNIBAL_HEAL = 20;
/** Trims off the borrowed base-slot cooldowns so the puppet moveset has its own pace. */
const AWAKEN_BITE_TRIM_MS = 2500;      // Watch 5s → 2.5s
const AWAKEN_CANNIBAL_TRIM_MS = 8000;  // Ritual 14s → 6s
const AWAKEN_SLAM_TRIM_MS = 12000;     // Feast 18s → 6s

const KIN_PER_SLAM = 3;
const KIN_LIFETIME_MS = 20000;
const KIN_SPEED = 44;
const KIN_STAB_DMG = 10;
const KIN_STAB_EVERY_MS = 2500;
/** They stop at the edge of the host's sprite rather than vanishing under it. */
const KIN_REACH = 46;

const CORRUPT_LIFETIME_MS = 20000;
const CORRUPT_SPEED = 150;
const CORRUPT_SHOT_EVERY_MS = 1400;
const CORRUPT_SHOT_DMG = 12;
const CORRUPT_SHOT_SPEED = 340;
const CORRUPT_MELEE_DMG = 8;
const CORRUPT_MELEE_EVERY_MS = 900;
const CORRUPT_MELEE_RANGE = 46;

// Depths
const DEPTH_GROUND_FX = 3;
const DEPTH_STALKER = 6;
const DEPTH_EYE = 7;
const DEPTH_BEAM = 9;
const DEPTH_FOG = 12;
const DEPTH_HALL_FLOOR = 4;
const DEPTH_HALL_MASK = 15;
const DEPTH_NOISE = 16;
const DEPTH_EYE_SCREEN = 30;

// ── World-object types ─────────────────────────────────────────────────────

interface Stalker {
  x: number;
  y: number;
  /** Fixed per-watcher wobble offset, so a row of them never boils in step. */
  seed: number;
  /** Set while it is soaking a hit — drives the white flash in the painter. */
  hitFlashUntil: number;
  owner: Owner;
  bornAt: number;
  nextPulseAt: number;
  /** E+ Mutant: seekers fly, gaze-cone, and soak 3 hits. */
  kind: 'watcher' | 'seeker';
  hitsLeft: number;
  heading: number;
  nextTurnAt: number;
  /** A pending ritual holds the seeker still so the 1s strike can land on it. */
  pinnedUntil: number;
}

interface VultureCarry {
  victim: Fighter;
  phase: 'up' | 'hold' | 'down';
  phaseEnd: number;
  fromX: number;   // pickup point — also the drop point
  fromY: number;
  holdX: number;   // off-screen point
  holdY: number;
}

interface Vulture {
  x: number;
  y: number;
  seed: number;
  owner: Owner;
  expiresAt: number;
  nextCarryAt: number;
  heading: number;
  nextTurnAt: number;
  carry: VultureCarry | null;
}

interface BoggleEye {
  x: number;
  y: number;
  angleOffset: number;
  nextShotAt: number;
}

interface EyeShot {
  x: number;
  y: number;
  vx: number;
  vy: number;
  owner: Owner;
  diesAt: number;
}

interface SanguineCharge {
  x: number;         // kill-box center
  y: number;
  ang: number;
  castAt: number;
  strikeAt: number;
  slashesLeft: number;
  nextSlashAt: number;
}

interface StrikerState {
  endsAt: number;
  storedDamage: number;
  allureUntil: number;
  boggleReadyAt: number;
  boggleUntil: number;
  eyes: BoggleEye[];
  sanguine: SanguineCharge | null;
  prevTexture: string;
  prevScale: number;
  prevAbsorber: ((amount: number) => boolean) | null;
  /** Online replica striker: visuals + cast routing only — no timer/absorber sim. */
  replica: boolean;
}

interface Midget {
  x: number;
  y: number;
  angle: number;
  nextBiteAt: number;
}

interface BloodDecal {
  target: Fighter;
  ox: number;
  oy: number;
  /** Size and splatter shape, fixed at application so the stain doesn't reshuffle each frame. */
  r: number;
  seed: number;
  until: number;
}

interface MazeWall {
  rect: Phaser.GameObjects.Rectangle;
  /** 0 while solid; set when the blob starts eating it (removed MAZE_EAT_MS later). */
  dyingAt: number;
}

/** Mastery — Puppetmaster: the stitched effigy standing in for one specific fighter. */
interface VoodooDoll {
  x: number;
  y: number;
  barBg: Phaser.GameObjects.Rectangle;
  barFill: Phaser.GameObjects.Rectangle;
  owner: Owner;
  /** Whoever the doll was stitched for — every hit on it is relayed here. */
  target: Fighter;
  damageTaken: number;
  /** Set on each relayed hit; the painter jolts the effigy while it runs. */
  hitFlashUntil: number;
  bornAt: number;
}

/** One of the things the awakened host hauls up out of the floor. */
interface AwakenedKin {
  x: number;
  y: number;
  facing: number;
  bornAt: number;
  owner: Owner;
  target: Fighter;
  expiresAt: number;
  nextStabAt: number;
}

/** A kin that was ritualled into a copy of the enemy, fighting on your side. */
interface CorruptClone {
  x: number;
  y: number;
  facing: number;
  bornAt: number;
  /** The copied fighter's element colour — the only thing that says whose face it wears. */
  borrowed: number;
  owner: Owner;
  target: Fighter;
  expiresAt: number;
  nextShotAt: number;
  nextMeleeAt: number;
}

/** Kit-owned bolt fired by a corrupted clone (styled after the element it copies). */
interface CorruptShot {
  x: number;
  y: number;
  vx: number;
  vy: number;
  borrowed: number;
  target: Fighter;
  diesAt: number;
}

/**
 * Mastery — Puppetmaster: someone is driving a fighter's cracked-open body.
 *
 * Both machines in an online match hold one of these. On the puppeteer's side
 * `owner` is 'player' and the host is the (possibly net-ghost) opponent, so the
 * form is drawn but its damage lands on a ghost and evaporates. On the victim's
 * side `owner` is 'npc' and the host is their own local fighter, which is where
 * the simulation that counts actually happens — the same victim-authoritative
 * split the hallway chase already uses.
 */
interface AwakenedState {
  owner: Owner;
  /** The possessed fighter — the body being steered *and* everything it hurts. */
  host: Fighter;
  endsAt: number;
  prevTexture: string;
  prevScale: number;
  /** Victim side: the drive vector + aim last streamed by the remote puppeteer. */
  netVx: number;
  netVy: number;
  netFa: number;
  /** Co-op: the net id of the possessed husk, so the host can be told to hold it. */
  huskNetId: number | null;
}

type GrabPhase = 'reaching' | 'dragging' | 'done';

interface GrabAttempt {
  victim: Fighter;
  phase: GrabPhase;
  phaseEnd: number;
  /** Bot victims roll once at grab start. */
  botEscapes: boolean;
  escapePresses: number;
  escaped: boolean;
}

interface Grabber {
  x: number;
  y: number;
  seed: number;
  bornAt: number;
  owner: Owner;
  expiresAt: number;
  nextGrabAt: number;
  grab: GrabAttempt | null;
}

interface RitualCircle {
  x: number;
  y: number;
  owner: Owner;
  castAt: number;
  strikeAt: number;
}

/** Torture perk: hooks and chains left in a victim by a Ritual, grinding on a 1s clock. */
interface TortureRack {
  target: Fighter;
  owner: Owner;
  stacks: number;
  until: number;
  nextTickAt: number;
  /** Fixed phase so each rack's chains sway on their own rhythm. */
  seed: number;
}

interface FeastCircle {
  x: number;
  y: number;
  owner: Owner;
  bornAt: number;
  endsAt: number;
  insideMs: Map<Fighter, number>;
  triggered: Set<Fighter>;
}

interface SpitGlob {
  x: number;
  y: number;
  vx: number;
  vy: number;
  owner: Owner;
  diesAt: number;
}

type RunPhase = 'arm' | 'chase';

interface RunState {
  phase: RunPhase;
  caster: Owner;
  victim: Fighter;
  /** True when the victim is the 1v1 fighter of a bot match / a husk — cosmetic runner + roll. */
  victimIsBot: boolean;
  armStart: number;         // arm animation start (arm phase)
  armEnd: number;           // arm animation end (arm phase)
  armTx: number;
  armTy: number;
  // chase
  floor: Phaser.GameObjects.Rectangle | null;
  maskGfx: Phaser.GameObjects.Graphics | null;
  exitGfx: Phaser.GameObjects.Rectangle | null;
  chaseEndsAt: number;
  /** Human victims can only leave once the door opens; bots' roll already decided. */
  doorOpensAt: number;
  /** Online: detect the remote (authoritative) catch via the synced hp drop. */
  victimStartHp: number;
  casterPrev: { x: number; y: number; texture: string; scale: number };
  victimPrev: { x: number; y: number };
  botRoll: number;          // compared against survival chance at resolution
  spitHits: number;
  victimSlowUntil: number;
  // Q+ The Labyrinth
  mazeSeed: number | null;  // set at doRun when the caster owns the upgrade
  mazeWalls: MazeWall[];
  mazePath: { x: number; y: number }[]; // solution waypoints for cosmetic bot runs
  mazePathIdx: number;
  vignetteRect: Phaser.GameObjects.Rectangle | null;
  vignetteHole: Phaser.GameObjects.Graphics | null;
  victimPrevScale: number;
  zoomed: boolean;
}

// ── SilenceKit ─────────────────────────────────────────────────────────────

/**
 * The remastered Silence kit: border-fog stealth + invisibility, backstabs,
 * stalkers, grabbers, hallucinations and the hallway chase. Handles both the
 * local player and the NPC mirror (offline bot or online replica — the replica
 * side only replays casts; its stealth/invisibility arrives via the net).
 */
/** Every ability drives an arm gesture, on the NPC rig as well as the player's. */
const CAST_GESTURES: Record<string, ArmGesture> = {
  'silence-stab': 'dash',
  'silence-watch': 'sweep',
  'silence-ritual': 'slam',
  'silence-feast': 'clap',
  'silence-run': 'punch',
};

export class SilenceKit {
  // ── Visuals ────────────────────────────────────────────────────────
  // One colour mapper and one effect painter per side, because the two fighters can have
  // different skins equipped.
  private readonly pcol: SilenceColorFn;
  private readonly ncol: SilenceColorFn;
  private readonly pfx: SilenceFx;
  private readonly nfx: SilenceFx;
  private playerAvatar: SilenceAvatar | null = null;
  private npcAvatar: SilenceAvatar | null = null;
  private auras = new Map<string, SilenceAura>();
  /** Shared per-frame paint layers, one per depth band. Rebuilt lazily after a reset. */
  private layers = new Map<number, Phaser.GameObjects.Graphics>();

  // Passive state (indexed by owner)
  private stealth: Record<Owner, number> = { player: 0, npc: 0 };
  private playerIsSilence = false;
  private npcIsSilence = false;

  // World objects
  private stalkers: Stalker[] = [];
  private grabbers: Grabber[] = [];
  private rituals: RitualCircle[] = [];
  private racks: TortureRack[] = [];   // Torture perk
  private feasts: FeastCircle[] = [];
  private spits: SpitGlob[] = [];
  private run: RunState | null = null;

  // Upgrade world objects / state
  private vultures: Vulture[] = [];
  private eyeShots: EyeShot[] = [];
  private bloodDecals: BloodDecal[] = [];
  private terror: Record<Owner, number> = { player: 0, npc: 0 };
  private strikers: Record<Owner, StrikerState | null> = { player: null, npc: null };
  private midgets = new Map<Fighter, Midget[]>();
  private fleshOverlay: Phaser.GameObjects.Rectangle | null = null;
  /** Flesh-arena dressing: fixed placements, repainted every frame so they pulse and blink. */
  private fleshDecals: Array<{ x: number; y: number; a: number; s: number; eye: boolean }> = [];
  private panicText: Phaser.GameObjects.Text | null = null;
  private terrorBarBg: Phaser.GameObjects.Rectangle | null = null;
  private terrorBarFill: Phaser.GameObjects.Rectangle | null = null;
  private terrorLabel: Phaser.GameObjects.Text | null = null;
  private strikerTimerText: Phaser.GameObjects.Text | null = null;
  private pendingMazeSeed: number | null = null;

  // Fog + HUD
  private stealthBarBg: Phaser.GameObjects.Rectangle | null = null;
  private stealthBarFill: Phaser.GameObjects.Rectangle | null = null;
  private stealthLabel: Phaser.GameObjects.Text | null = null;
  private stalkerPips: Phaser.GameObjects.Arc[] = [];

  // Facing eyes (silence player's screen only) — painted per frame, so they blink and track.
  private faceEyes: Fighter[] = [];

  // Hallucination FX (local player as victim)
  private eyeScreenRect: Phaser.GameObjects.Rectangle | null = null;
  private eyeScreenEyes: Array<{ x: number; y: number; a: number; s: number }> = [];
  private eyeScreenUntil = 0;
  private nextEyeScreenAt = 0;
  private fakePosGhost: Phaser.GameObjects.Image | null = null;
  private fakePosUntil = 0;
  private nextFakePosAt = 0;

  // Mastery — Weep + Puppetmaster. Weep is local-player only (it is your own passive);
  // Puppetmaster is owner-indexed, because online the victim's machine runs the copy
  // that owns the possessed body.
  private weepUnwatched = false;
  private dolls: Record<Owner, VoodooDoll | null> = { player: null, npc: null };
  private awakened: Record<Owner, AwakenedState | null> = { player: null, npc: null };
  private kin: AwakenedKin[] = [];
  private corrupts: CorruptClone[] = [];
  private corruptShots: CorruptShot[] = [];
  private puppetLastCastAt = -PUPPET_COOLDOWN_MS;
  private lastPuppetMoveSentAt = 0;
  /** `scene.time.now` of the last player stab that actually connected. */
  private lastStabLandedAt = -PUPPET_STAB_WINDOW_MS;
  /** Enemies already wired for the "killed while a Striker" requirement. */
  private masteryTrackedFoes = new WeakSet<Fighter>();

  // NPC mirror AI helpers
  private npcLockUntil = 0;

  // Input edge tracking
  private prevPointerDown = false;

  constructor(private readonly arena: SilenceArenaApi) {
    // Built here, not as field initialisers, so they see the injected arena.
    this.pcol = (base) => arena.silenceColor('player', base);
    this.ncol = (base) => arena.silenceColor('npc', base);
    this.pfx = new SilenceFx(arena.scene, this.pcol);
    this.nfx = new SilenceFx(arena.scene, this.ncol);
  }

  // ── Visual helpers ─────────────────────────────────────────────────

  /** Effect painter for a side. */
  private fx(owner: Owner): SilenceFx { return owner === 'player' ? this.pfx : this.nfx; }
  /** Colour mapper for a side. */
  private col(owner: Owner): SilenceColorFn { return owner === 'player' ? this.pcol : this.ncol; }
  /** The rig for a side, if that side is playing Silence. */
  private avatarFor(owner: Owner): SilenceAvatar | null {
    return owner === 'player' ? this.playerAvatar : this.npcAvatar;
  }

  /** Fire one arm gesture on the rig of whichever side cast. */
  private gesture(owner: Owner, abilityId: string, angle?: number): void {
    const g = CAST_GESTURES[abilityId];
    if (g) this.avatarFor(owner)?.play(g, angle);
  }

  /** A shared paint layer at one depth. Cleared and repainted every frame by paintWorld. */
  private layer(depth: number): Phaser.GameObjects.Graphics {
    let g = this.layers.get(depth);
    if (!g || !g.active) {
      g = this.arena.scene.add.graphics().setDepth(depth);
      this.layers.set(depth, g);
    }
    return g;
  }

  /**
   * A persistent aura on one fighter, keyed by id. Built on first use and torn down by
   * `dropAura` — a scene restart kills the Graphics, so `layer`/`aura` both rebuild lazily.
   */
  private aura(id: string, style: SilenceAuraStyle, tint: SilenceColorFn, radius: number, depth: number): SilenceAura {
    let a = this.auras.get(id);
    if (!a) {
      a = new SilenceAura(this.arena.scene, tint, style, radius, depth);
      this.auras.set(id, a);
    }
    return a;
  }

  private dropAura(id: string): void {
    const a = this.auras.get(id);
    if (!a) return;
    a.destroy();
    this.auras.delete(id);
  }

  // ── Lifecycle ──────────────────────────────────────────────────────

  reset(): void {
    this.endAwakened('player', false, true);
    this.endAwakened('npc', false, true);
    this.clearDoll('player');
    this.clearDoll('npc');
    this.kin = [];
    this.corrupts = [];
    this.corruptShots = [];
    // Avatars and auras are GameObjects: a scene restart already killed the old ones, so they
    // are dropped here and rebuilt lazily by update().
    if (this.playerAvatar) { this.playerAvatar.destroy(); this.playerAvatar = null; }
    if (this.npcAvatar) { this.npcAvatar.destroy(); this.npcAvatar = null; }
    for (const a of this.auras.values()) a.destroy();
    this.auras.clear();
    for (const g of this.layers.values()) g.destroy();
    this.layers.clear();
    this.puppetLastCastAt = -PUPPET_COOLDOWN_MS;
    this.lastPuppetMoveSentAt = 0;
    this.lastStabLandedAt = -PUPPET_STAB_WINDOW_MS;
    this.masteryTrackedFoes = new WeakSet<Fighter>();
    this.weepUnwatched = false;
    this.arena.setStatusIndicator('silence-weep', null);
    this.arena.setStatusIndicator('silence-awakened', null);
    this.endStriker('player', true);
    this.endStriker('npc', true);
    this.endRunChase(false, true);
    this.stalkers = [];
    this.grabbers = [];
    for (const v of this.vultures) {
      if (v.carry) (v.carry.victim.body as Phaser.Physics.Arcade.Body | null)?.setCollideWorldBounds(true);
    }
    this.vultures = [];
    this.eyeShots = [];
    this.bloodDecals = [];
    this.midgets.clear();
    this.fleshOverlay?.destroy(); this.fleshOverlay = null;
    this.fleshDecals = [];
    this.panicText?.destroy(); this.panicText = null;
    this.terrorBarBg?.destroy(); this.terrorBarBg = null;
    this.terrorBarFill?.destroy(); this.terrorBarFill = null;
    this.terrorLabel?.destroy(); this.terrorLabel = null;
    this.strikerTimerText?.destroy(); this.strikerTimerText = null;
    this.terror = { player: 0, npc: 0 };
    this.pendingMazeSeed = null;
    this.rituals = [];
    this.racks = [];
    this.feasts = [];
    this.spits = [];
    this.stealthBarBg?.destroy(); this.stealthBarBg = null;
    this.stealthBarFill?.destroy(); this.stealthBarFill = null;
    this.stealthLabel?.destroy(); this.stealthLabel = null;
    for (const p of this.stalkerPips) p.destroy();
    this.stalkerPips = [];
    this.faceEyes = [];
    this.eyeScreenRect?.destroy(); this.eyeScreenRect = null;
    this.eyeScreenEyes = [];
    this.eyeScreenUntil = 0;
    this.nextEyeScreenAt = 0;
    this.fakePosGhost?.destroy(); this.fakePosGhost = null;
    this.fakePosUntil = 0;
    this.nextFakePosAt = 0;
    this.stealth = { player: 0, npc: 0 };
    this.npcLockUntil = 0;
    this.prevPointerDown = false;
    this.playerIsSilence = false;
    this.npcIsSilence = false;
  }

  // ── Public accessors (read by ArenaScene / fed into NpcAiState) ────

  /** True while `owner`'s silence fighter cannot be seen by its enemies. */
  isInvisible(owner: Owner): boolean {
    const f = owner === 'player' ? this.arena.player : this.arena.npc;
    if (!f || !f.active) return false;
    if (owner === 'player' && !this.playerIsSilence) return false;
    if (owner === 'npc' && !this.npcIsSilence) return false;
    // Online replica invisibility is network-driven (OnlineKit sets forceInvisible).
    if (owner === 'npc' && f.netGhost) return f.forceInvisible;
    // The hallway chase hides the caster from everyone else in the main arena.
    if (this.run?.phase === 'chase' && this.run.caster === owner) return true;
    return this.isInFog(f.x, f.y) || this.stealth[owner] > 0;
  }

  /** During the chase the victim is off in the pocket dimension too — untargetable. */
  isRunChaseActive(): boolean {
    return this.run?.phase === 'chase';
  }

  /** Movement lock ArenaScene feeds into NpcAiState.isLocked. */
  getNpcYankUntil(): number { return this.npcLockUntil; }

  /**
   * Everything this kit does to the local player's walking speed, as one factor.
   *
   * ArenaScene *pulls* this while it computes `playerSpeedMult`, rather than the kit
   * pushing through `applyNpcSpeedMult`'s player twin: player movement resolves earlier
   * in the same `update()` than this kit runs, and `playerSpeedMult` is reset to 1 at the
   * top of every frame — so anything pushed from `update()` would be wiped before it was
   * ever read. (The npc side has no such problem: its velocity scaling happens after.)
   */
  getPlayerSpeedMult(time: number): number {
    let mult = 1;
    // Mastery — Weep: unwatched, you move half again as fast.
    if (this.arena.masteryActive && this.weepUnwatched) mult *= WEEP_SPEED_MULT;
    const run = this.run;
    if (run?.phase === 'chase' && run.victim === this.arena.player) {
      mult *= HALL_VICTIM_SLOW;
      if (run.mazeSeed !== null) mult *= MAZE_VICTIM_SLOW;
      if (time < run.victimSlowUntil) mult *= 0.5;
    }
    return mult;
  }

  /**
   * True while the local player has no say over their own body — mid-grab, or with a
   * Puppetmaster driving them. ArenaScene gates dodging on this.
   */
  isPlayerControlLost(): boolean {
    return this.isPlayerGrabbed() || this.isPossessed();
  }

  /** True while the local player is being reeled in by a grabber — suppresses dodge. */
  isPlayerGrabbed(): boolean {
    return this.grabbers.some((g) => g.grab && g.grab.phase === 'dragging' && g.grab.victim === this.arena.player && !g.grab.escaped);
  }

  /** True while a vulture is carrying this fighter off screen — ArenaScene must not clamp it back in. */
  isCarriedByVulture(f: Fighter): boolean {
    return this.vultures.some((v) => v.carry !== null && v.carry.victim === f);
  }

  stalkersAlive(owner: Owner): number {
    return this.stalkers.filter((s) => s.owner === owner).length;
  }

  getStealth(owner: Owner): number { return this.stealth[owner]; }

  /** Online: the remote silence player's stealth meter, from the 20 Hz state stream. */
  setNetStealth(value: number): void { this.stealth.npc = value; }

  /**
   * Online: silence upgrade events from the peer. Every kind concerns the
   * peer's own fighter — which is our npc replica.
   */
  handleNetMsg(msg: NetSilenceMsg): void {
    switch (msg.k) {
      case 'panic':
        // The victim's sim caught its player in one of our seekers' cones.
        this.arena.npc.panickedUntil = Math.max(this.arena.npc.panickedUntil, Date.now() + msg.ms);
        break;
      case 'striker':
        if (msg.on) this.beginStriker('npc', true);
        else this.endStriker('npc', true);
        break;
      case 'maze':
        this.pendingMazeSeed = msg.seed;
        break;
      case 'vulture-drop':
        if (this.arena.npc.active) this.applyBloodDecals(this.arena.npc);
        break;
      // ── Mastery — Puppetmaster, all of it aimed at our own fighter ──
      case 'doll':
        this.netSpawnDoll(msg.x, msg.y);
        break;
      case 'doll-hit':
        this.netDollHit(msg.dmg, msg.left);
        break;
      case 'doll-gone':
        this.clearDoll('npc');
        break;
      case 'awaken':
        if (msg.on) {
          this.beginAwakened('npc');
        } else {
          this.endAwakened('npc', (msg.dmg ?? 0) > 0);
        }
        break;
      case 'puppet-move': {
        const a = this.awakened.npc;
        if (a) { a.netVx = msg.vx; a.netVy = msg.vy; a.netFa = msg.fa; }
        break;
      }
    }
  }

  /** Position of a fully-matured stalker owned by `owner`, if any (bot AI aims Ritual here). */
  getMatureStalkerPos(owner: Owner): { x: number; y: number } | null {
    const now = this.arena.scene.time.now;
    const s = this.stalkers.find((st) => st.owner === owner && now - st.bornAt >= STALKER_MATURE_MS);
    return s ? { x: s.x, y: s.y } : null;
  }

  /**
   * A shot/attack from `attacker` side landed at (x, y): kills one opposing
   * stalker in radius. Returns true if a stalker died (caller may consume the shot).
   */
  tryHitStalker(x: number, y: number, radius: number, attacker: Owner | 'husk'): boolean {
    // Husk shots hunt the player's stalkers; player attacks hunt the npc's.
    const targetOwner: Owner = attacker === 'player' ? 'npc' : 'player';
    for (let i = this.stalkers.length - 1; i >= 0; i--) {
      const s = this.stalkers[i];
      if (s.owner !== targetOwner) continue;
      if (Phaser.Math.Distance.Between(x, y, s.x, s.y) > radius + STALKER_RADIUS) continue;
      this.damageStalker(i);
      return true;
    }
    return false;
  }

  /** AoE damage hook — ArenaScene calls this from its shared AoE helper. */
  notifyAoeDamage(x: number, y: number, radius: number, owner: Owner): void {
    // AoE can wipe several stalkers at once.
    for (let i = this.stalkers.length - 1; i >= 0; i--) {
      const s = this.stalkers[i];
      if (s.owner === owner) continue;
      if (Phaser.Math.Distance.Between(x, y, s.x, s.y) <= radius + STALKER_RADIUS) this.damageStalker(i);
    }
  }

  // ── Input (local player as silence) ────────────────────────────────

  handleInput(time: number, pointer: Phaser.Input.Pointer, mouseX: number, mouseY: number): void {
    const player = this.arena.player;
    if (!player.active || player.hp <= 0) return;

    const clicked = pointer.isDown && !this.prevPointerDown;
    this.prevPointerDown = pointer.isDown;

    // While being reeled in by an enemy grabber you're busy mashing space.
    if (this.isPlayerGrabbed()) return;

    // Mastery — while you are wearing the enemy, the puppet moveset replaces everything.
    if (this.awakened.player) {
      this.handleAwakenedInput(clicked, mouseX, mouseY);
      return;
    }
    // …and while someone is wearing *you*, your own hands aren't yours (the disarm in
    // driveHost blocks the casts; this stops the click from even being attempted).
    if (this.isPossessed()) return;

    const ctx = () => this.arena.buildPlayerContext(mouseX, mouseY);

    // Click: Stab normally, spit volley while in blob form (doStab routes it).
    if (clicked) player.castAbility('silence-stab', ctx());

    // While we're the blob, every other ability is unavailable.
    if (this.run && this.run.caster === 'player') return;

    const kb = Phaser.Input.Keyboard;
    const bound = this.puppetSlot();
    const press = (slot: 'e' | 'r' | 'f' | 'q', key: Phaser.Input.Keyboard.Key, id: string): void => {
      if (!kb.JustDown(key)) return;
      if (bound === slot) this.tryCastPuppetmaster(time, mouseX, mouseY);
      else player.castAbility(id, ctx());
    };
    press('e', this.arena.eKey, 'silence-watch');
    press('r', this.arena.rKey, 'silence-ritual');
    press('f', this.arena.fKey, 'silence-feast');
    press('q', this.arena.qKey, 'silence-run');
  }

  /** The slot Puppetmaster is bound over this match, or null when it isn't bound. */
  private puppetSlot(): 'e' | 'r' | 'f' | 'q' | null {
    if (!this.arena.masteryActive) return null;
    for (const s of ['e', 'r', 'f', 'q'] as const) {
      if (this.arena.masteryBindFor(s) === 'puppetmaster') return s;
    }
    return null;
  }

  /**
   * The awakened moveset borrows the five base slots (and their cooldown bars), the same
   * way the Striker form does — the trims in `stamp` give each one its own pace.
   * Casts don't go through `castAbility`: the puppet isn't you, so being Silenced or
   * disarmed can't strand you inside someone else's body.
   */
  private handleAwakenedInput(clicked: boolean, mouseX: number, mouseY: number): void {
    const player = this.arena.player;
    const kb = Phaser.Input.Keyboard;
    const ready = (id: string): boolean => player.getCooldownRatio(id) >= 1;
    const stamp = (id: string, trimMs = 0): void => {
      player.triggerCooldown(id);
      if (trimMs > 0) player.reduceCooldown(id, trimMs);
    };

    const a = this.awakened.player!;
    // Each branch is decided here, once, and the decision is what goes on the wire.
    const send = (act: string): void => this.arena.broadcastMasteryCast(act);

    if (clicked && ready('silence-stab')) {
      stamp('silence-stab');
      this.awakenedSlash('player', mouseX, mouseY);
      send('puppet-slash');
    }
    if (kb.JustDown(this.arena.eKey) && ready('silence-watch')) {
      stamp('silence-watch', AWAKEN_BITE_TRIM_MS);
      const eat = this.kinAtCursor(a, mouseX, mouseY) >= 0;
      this.awakenedBite('player', mouseX, mouseY, eat);
      send(eat ? 'puppet-eat' : 'puppet-bite');
    }
    if (kb.JustDown(this.arena.rKey) && ready('silence-ritual')) {
      stamp('silence-ritual', AWAKEN_CANNIBAL_TRIM_MS);
      const raise = this.kinAtCursor(a, mouseX, mouseY) >= 0;
      this.awakenedCannibalize('player', mouseX, mouseY, raise);
      send(raise ? 'puppet-raise' : 'puppet-cannibal');
    }
    if (kb.JustDown(this.arena.fKey) && ready('silence-feast')) {
      stamp('silence-feast', AWAKEN_SLAM_TRIM_MS);
      this.awakenedSlam('player');
      send('puppet-slam');
    }
    // Q always answers — you can always give the body back.
    if (kb.JustDown(this.arena.qKey)) this.endAwakened('player', true);
  }

  /**
   * Online replay on the victim's sim: the remote puppeteer took one of the awakened
   * actions. `tx`/`ty` arrive already mirrored, and the branch was decided by the id.
   * Returns false for ids that aren't ours, so ArenaScene can keep looking.
   */
  doNpcPuppetAct(act: string, tx: number, ty: number): boolean {
    if (!this.awakened.npc) return act.startsWith('puppet-');
    switch (act) {
      case 'puppet-slash': this.awakenedSlash('npc', tx, ty); return true;
      case 'puppet-bite': this.awakenedBite('npc', tx, ty, false); return true;
      case 'puppet-eat': this.awakenedBite('npc', tx, ty, true); return true;
      case 'puppet-cannibal': this.awakenedCannibalize('npc', tx, ty, false); return true;
      case 'puppet-raise': this.awakenedCannibalize('npc', tx, ty, true); return true;
      case 'puppet-slam': this.awakenedSlam('npc'); return true;
      default: return false;
    }
  }

  // ── Cast entry points (from CastContext) ───────────────────────────

  doStab(tx: number, ty: number, owner: Owner): void {
    // Mastery — Puppetmaster: while this owner is possessing, the base slots are only
    // borrowed for their cooldown bars. The real actions ride their own puppet-* ids,
    // so a replayed base cast here would be a phantom second hit.
    if (this.awakened[owner]) return;

    const caster = this.fighterOf(owner);
    if (!caster.active) return;

    // Striker form: click becomes Slash.
    if (this.strikers[owner]) {
      this.doStrikerSlash(tx, ty, owner);
      return;
    }

    // Blob form: click becomes the spit volley instead.
    if (this.run?.phase === 'chase' && this.run.caster === owner) {
      this.doSpit(tx, ty, owner);
      return;
    }

    const ang = Math.atan2(ty - caster.y, tx - caster.x);
    const startX = caster.x;
    const startY = caster.y;
    this.gesture(owner, 'silence-stab', ang);

    // Dash impulse — WASD/AI suppressed briefly so the impulse isn't overwritten.
    const body = caster.body as Phaser.Physics.Arcade.Body | null;
    if (body) {
      body.setVelocity(Math.cos(ang) * 1000, Math.sin(ang) * 1000);
      if (owner === 'player') this.arena.setPlayerYankUntil(this.arena.scene.time.now + 170);
      else this.npcLockUntil = Math.max(this.npcLockUntil, this.arena.scene.time.now + 170);
      this.arena.scene.time.delayedCall(170, () => {
        if (caster.active && caster.body) (caster.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
      });
    }

    // Hitscan along the dash lane — hits are collected first because a
    // panicked victim (E+ Mutant) changes how much stealth the strike drains.
    const endX = startX + Math.cos(ang) * STAB_DASH_LEN;
    const endY = startY + Math.sin(ang) * STAB_DASH_LEN;
    const laneDx = endX - startX;
    const laneDy = endY - startY;
    const laneLenSq = laneDx * laneDx + laneDy * laneDy || 1;
    const laneDistSq = (x: number, y: number): number => {
      const t = Phaser.Math.Clamp(((x - startX) * laneDx + (y - startY) * laneDy) / laneLenSq, 0, 1);
      const nearX = startX + laneDx * t;
      const nearY = startY + laneDy * t;
      return (nearX - x) * (nearX - x) + (nearY - y) * (nearY - y);
    };
    const hits: Array<{ foe: Fighter; isBackstab: boolean }> = [];
    for (const foe of this.foesOf(owner)) {
      if (!foe.active || foe.hp <= 0) continue;
      if (laneDistSq(foe.x, foe.y) > STAB_LANE_HALF_W * STAB_LANE_HALF_W) continue;
      // Backstab: attacker approaches from within the victim's rear arc.
      const toAttacker = Math.atan2(startY - foe.y, startX - foe.x);
      const rear = Phaser.Math.Angle.Wrap(foe.facingAngle + Math.PI);
      hits.push({ foe, isBackstab: Math.abs(Phaser.Math.Angle.Wrap(toAttacker - rear)) <= BACKSTAB_ARC_RAD });
    }

    // Stealth is consumed by the strike and fuels its damage. Panicked victims
    // only soak PANIC_STAB_DRAIN of it — the rest stays banked. For an online
    // replica the value arrives via the state stream (setNetStealth).
    const pool = this.stealth[owner];
    const now = Date.now();
    const anyPanicked = hits.some((h) => now < h.foe.panickedUntil);
    const spent = anyPanicked ? Math.min(pool, PANIC_STAB_DRAIN) : pool;
    this.stealth[owner] = pool - spent;
    let dmg = STAB_BASE_DMG + STAB_MAX_BONUS * (spent / STEALTH_MAX);
    dmg *= 1 + STALKER_DMG_BONUS * this.stalkersAlive(owner);
    if (anyPanicked && pool > spent) {
      this.arena.showFloatingText(caster.x, caster.y - 30, '👁 stealth held', '#aa66ee');
    }

    const fx = this.fx(owner);
    for (const { foe, isBackstab } of hits) {
      let final = dmg;
      if (isBackstab) {
        final *= STAB_BACKSTAB_MULT;
        this.applyStatus(foe, { k: 'silence', ms: STAB_SILENCE_MS });
        this.arena.showFloatingText(foe.x, foe.y - 34, '🔪 BACKSTAB — SILENCED', '#ff2244');
        if (owner === 'player') this.arena.recordMasteryStat('backstabs', 1);
        // A backstab is the whole element's payoff, so it gets its own art: a hand closing
        // over the mouth from behind, and the wound opening under it.
        fx.rupture(foe.x, foe.y, 44, { bloody: true, claws: 8, rings: 2, duration: 420 });
        this.arena.scene.cameras.main.shake(160, 0.004);
      } else {
        fx.slash(foe.x, foe.y, ang, 46, 0.9, { bloody: true, scores: 2, duration: 220 });
      }
      final = Math.round(final);
      foe.takeDamage(final);
      this.arena.spawnHitFlash(foe.x, foe.y, 0x882244);
    }
    // Mastery: Puppetmaster only takes on a fighter you have just had the knife into,
    // and the effigy answers to that same knife.
    if (owner === 'player') {
      if (hits.length > 0) this.lastStabLandedAt = this.arena.scene.time.now;
      const d = this.dolls.player;
      if (d) {
        const r = STAB_LANE_HALF_W + DOLL_HIT_RADIUS;
        if (laneDistSq(d.x, d.y) <= r * r) this.tryHitDoll(d.x, d.y, 0, Math.round(dmg));
      }
    }

    // Click+ Sacrifice: stabbing one of your own watchers detonates its scream.
    if (this.arena.hasUpgrade(owner, 'click')) {
      for (const s of this.stalkers) {
        if (s.owner !== owner) continue;
        const r = STAB_LANE_HALF_W + STALKER_RADIUS;
        if (laneDistSq(s.x, s.y) > r * r) continue;
        this.sacrificeWatcher(s, owner);
      }
    }

    // The lunge itself: fog dragged down the lane, scores raked out of the floor, and a
    // three-score claw sweep at the far end. Banked stealth widens the sweep, so a full
    // meter looks like the 45-damage strike it is.
    const charge = spent / STEALTH_MAX;
    fx.lunge(startX, startY, endX, endY, { color: SILENCE.plum, duration: 300 + charge * 140 });
    fx.slash(endX, endY, ang, STAB_LANE_HALF_W * (1 + charge * 0.5), 0.75 + charge * 0.35, {
      scores: 3 + Math.round(charge * 2), duration: 240 + charge * 120,
    });
  }

  /** Click+ Sacrifice: shockwave from a stabbed watcher + 5s maturity setback. */
  private sacrificeWatcher(s: Stalker, owner: Owner): void {
    const x = s.x;
    const y = s.y;
    s.bornAt += SACRIFICE_MATURE_DELAY_MS;
    // The watcher's eye bursts and its scream goes out as a ring of fingers.
    const fx = this.fx(owner);
    fx.watchPulse(x, y, 16, SILENCE.gore, DEPTH_EYE, 220);
    fx.rupture(x, y, SACRIFICE_RADIUS, { bloody: true, claws: 10, rings: 2, duration: 420 });
    this.arena.showFloatingText(x, y - 26, '🔪 SACRIFICE', '#ff2244');
    for (const foe of this.foesOf(owner)) {
      if (!foe.active || foe.hp <= 0) continue;
      if (Phaser.Math.Distance.Between(x, y, foe.x, foe.y) > SACRIFICE_RADIUS) continue;
      foe.takeDamage(SACRIFICE_DMG);
      this.applyStatus(foe, { k: 'silence', ms: SACRIFICE_SILENCE_MS });
      this.arena.spawnHitFlash(foe.x, foe.y, 0xff2233);
      this.arena.showFloatingText(foe.x, foe.y - 38, '🤫 SILENCED', '#ff5566');
    }
  }

  doSummonStalker(tx: number, ty: number, owner: Owner): void {
    // Mastery — Puppetmaster: while this owner is possessing, the base slots are only
    // borrowed for their cooldown bars. The real actions ride their own puppet-* ids,
    // so a replayed base cast here would be a phantom second hit.
    if (this.awakened[owner]) return;

    const scene = this.arena.scene;

    // Striker form: E becomes Boggle.
    if (this.strikers[owner]) {
      this.doBoggle(owner);
      return;
    }

    // E+ Mutant: placing a watcher on top of an existing one mutates it into a
    // seeker instead of spawning a new watcher.
    if (this.arena.hasUpgrade(owner, 'e')) {
      const target = this.stalkers.find((s) =>
        s.owner === owner && s.kind === 'watcher'
        && Phaser.Math.Distance.Between(tx, ty, s.x, s.y) <= STALKER_RADIUS * 2.2);
      if (target) {
        this.mutateIntoSeeker(target, owner);
        return;
      }
    }

    if (this.stalkersAlive(owner) >= STALKER_MAX) {
      const caster = this.fighterOf(owner);
      if (owner === 'player') this.arena.showFloatingText(caster.x, caster.y - 30, 'Max stalkers', '#8866aa');
      return;
    }
    const x = Phaser.Math.Clamp(tx, 20, this.arena.width - 20);
    const y = Phaser.Math.Clamp(ty, 20, this.arena.height - 20);
    const caster = this.fighterOf(owner);
    this.gesture(owner, 'silence-watch', Math.atan2(y - caster.y, x - caster.x));
    this.stalkers.push({
      x, y, owner,
      seed: Math.random() * Math.PI * 2,
      hitFlashUntil: 0,
      bornAt: scene.time.now,
      nextPulseAt: scene.time.now + STALKER_PULSE_MS,
      kind: 'watcher', hitsLeft: 1, heading: 0, nextTurnAt: 0, pinnedUntil: 0,
    });
    // It does not appear — it *opens*, out of a knot of fog that was already there.
    const fx = this.fx(owner);
    fx.motes(x, y, 7, { speed: 55, size: 5, life: 620, depth: DEPTH_STALKER - 1, color: SILENCE.void, drift: -4 });
    fx.watchPulse(x, y, 11, SILENCE.amethyst, DEPTH_EYE, 620);
  }

  /** E+ Mutant: a watcher sprouts wings and takes flight as a seeker. */
  private mutateIntoSeeker(s: Stalker, owner: Owner): void {
    s.kind = 'seeker';
    s.hitsLeft = SEEKER_HITS;
    s.heading = Math.random() * Math.PI * 2;
    s.nextTurnAt = 0;
    // The wings tear their way out — fingers thrown clear on both sides of the body.
    const fx = this.fx(owner);
    for (const side of [-1, 1]) {
      fx.claws(s.x + side * 8, s.y, 5, {
        angle: side > 0 ? 0 : Math.PI, spread: 0.7, speed: 190, size: 20,
        life: 480, depth: DEPTH_STALKER + 1, color: SILENCE.pitch,
      });
    }
    fx.rupture(s.x, s.y, 40, { claws: 0, rings: 1, mark: false, duration: 380 });
    this.arena.showFloatingText(s.x, s.y - 26, '🕊️ IT SEES', '#ff2244');
    this.arena.scene.cameras.main.shake(150, 0.003);
  }

  doRitual(tx: number, ty: number, owner: Owner): void {
    // Mastery — Puppetmaster: while this owner is possessing, the base slots are only
    // borrowed for their cooldown bars. The real actions ride their own puppet-* ids,
    // so a replayed base cast here would be a phantom second hit.
    if (this.awakened[owner]) return;

    const scene = this.arena.scene;
    const caster = this.fighterOf(owner);

    // Striker form: R becomes Allure.
    if (this.strikers[owner]) {
      this.doAllure(owner);
      return;
    }

    // R+ Night Terror: at max terror, a ritual cast on yourself transforms you.
    if (
      this.arena.hasUpgrade(owner, 'r')
      && Phaser.Math.Distance.Between(caster.x, caster.y, tx, ty) <= STRIKER_SELF_CAST_DIST
    ) {
      if (owner === 'npc' && caster.netGhost) {
        // Replica: terror isn't simulated for the ghost, so a self-targeted
        // ritual is (almost certainly) the transform — swallow it instead of
        // striking a phantom circle; the 'sil' striker message does the rest.
        return;
      }
      if (this.terror[owner] >= TERROR_MAX) {
        this.beginStriker(owner, false);
        return;
      }
    }

    // Clamp to cast range from the caster.
    const dist = Phaser.Math.Distance.Between(caster.x, caster.y, tx, ty);
    if (dist > RITUAL_RANGE) {
      const ang = Math.atan2(ty - caster.y, tx - caster.x);
      tx = caster.x + Math.cos(ang) * RITUAL_RANGE;
      ty = caster.y + Math.sin(ang) * RITUAL_RANGE;
    }
    const strikeAt = scene.time.now + RITUAL_DELAY_MS;
    this.gesture(owner, 'silence-ritual', Math.atan2(ty - caster.y, tx - caster.x));
    // The one-second wind-up is a tooth ring closing over the spot with fingers converging
    // on it, so the delay reads as something being cornered rather than as a pause.
    this.fx(owner).dread(tx, ty, RITUAL_RADIUS, RITUAL_DELAY_MS, { depth: DEPTH_GROUND_FX + 1 });
    // Matured seekers caught in the circle freeze mid-air so the strike can land.
    for (const s of this.stalkers) {
      if (s.owner !== owner || s.kind !== 'seeker') continue;
      if (scene.time.now - s.bornAt < STALKER_MATURE_MS) continue;
      if (Phaser.Math.Distance.Between(s.x, s.y, tx, ty) > RITUAL_RADIUS) continue;
      s.pinnedUntil = Math.max(s.pinnedUntil, strikeAt + 150);
    }
    this.rituals.push({ x: tx, y: ty, owner, castAt: scene.time.now, strikeAt });
  }

  doFeast(tx: number, ty: number, owner: Owner): void {
    // Mastery — Puppetmaster: while this owner is possessing, the base slots are only
    // borrowed for their cooldown bars. The real actions ride their own puppet-* ids,
    // so a replayed base cast here would be a phantom second hit.
    if (this.awakened[owner]) return;

    void tx; void ty;
    const scene = this.arena.scene;
    const caster = this.fighterOf(owner);

    // Striker form: F becomes Retreat — drop the form and vanish into the fog.
    if (this.strikers[owner]) {
      this.doStrikerRetreat(owner);
      return;
    }
    const x = caster.x + Math.cos(caster.facingAngle) * FEAST_FOLLOW_OFFSET;
    const y = caster.y + Math.sin(caster.facingAngle) * FEAST_FOLLOW_OFFSET;
    this.gesture(owner, 'silence-feast', caster.facingAngle);
    this.feasts.push({
      x, y, owner,
      bornAt: scene.time.now,
      endsAt: scene.time.now + FEAST_DURATION_MS,
      insideMs: new Map(),
      triggered: new Set(),
    });
    // The ground splits and the teeth come up through it.
    const fx = this.fx(owner);
    fx.motes(x, y, 12, { speed: FEAST_RADIUS * 1.4, size: 6, life: 700, depth: DEPTH_GROUND_FX, color: SILENCE.void });
    fx.graspRing(x, y, FEAST_RADIUS * 0.3, FEAST_RADIUS, SILENCE.bone, 520, DEPTH_GROUND_FX + 1, true);
    scene.cameras.main.shake(180, 0.003);
  }

  doRun(tx: number, ty: number, owner: Owner): void {
    // Mastery — Puppetmaster: while this owner is possessing, the base slots are only
    // borrowed for their cooldown bars. The real actions ride their own puppet-* ids,
    // so a replayed base cast here would be a phantom second hit.
    if (this.awakened[owner]) return;

    // Striker form: Q becomes Sanguine Elimination.
    if (this.strikers[owner]) {
      this.doSanguine(tx, ty, owner);
      return;
    }

    if (this.run) return; // one pocket dimension at a time
    const scene = this.arena.scene;
    const caster = this.fighterOf(owner);
    const ang = Math.atan2(ty - caster.y, tx - caster.x);
    const reach = Math.min(RUN_ARM_RANGE, Phaser.Math.Distance.Between(caster.x, caster.y, tx, ty) + RUN_HIT_RADIUS);
    this.gesture(owner, 'silence-run', ang);

    // Q+ The Labyrinth: pick the maze layout now so the seed reaches the peer
    // well before their replayed arm can land (messages are ordered).
    let mazeSeed: number | null = null;
    if (this.arena.hasUpgrade(owner, 'q')) {
      if (owner === 'npc' && caster.netGhost) {
        mazeSeed = this.pendingMazeSeed ?? Math.floor(Math.random() * 0x7fffffff);
      } else {
        mazeSeed = Math.floor(Math.random() * 0x7fffffff);
        if (owner === 'player' && this.arena.isOnline) {
          this.arena.sendSilenceMsg({ t: 'sil', k: 'maze', seed: mazeSeed });
        }
      }
      this.pendingMazeSeed = null;
    }

    // Victim is resolved when the arm finishes extending.
    this.run = {
      phase: 'arm',
      caster: owner,
      victim: caster, // placeholder until the arm lands
      victimIsBot: false,
      armStart: scene.time.now,
      armEnd: scene.time.now + RUN_ARM_MS,
      armTx: caster.x + Math.cos(ang) * reach,
      armTy: caster.y + Math.sin(ang) * reach,
      floor: null,
      maskGfx: null,
      exitGfx: null,
      chaseEndsAt: 0,
      doorOpensAt: 0,
      victimStartHp: 0,
      casterPrev: { x: caster.x, y: caster.y, texture: caster.texture.key, scale: caster.scaleX },
      victimPrev: { x: 0, y: 0 },
      botRoll: Math.random(),
      spitHits: 0,
      victimSlowUntil: 0,
      mazeSeed,
      mazeWalls: [],
      mazePath: [],
      mazePathIdx: 0,
      vignetteRect: null,
      vignetteHole: null,
      victimPrevScale: 1,
      zoomed: false,
    };
  }

  private doSpit(tx: number, ty: number, owner: Owner): void {
    const caster = this.fighterOf(owner);
    const scene = this.arena.scene;
    const base = Math.atan2(ty - caster.y, tx - caster.x);
    for (let i = -1; i <= 1; i++) {
      const ang = base + i * 0.12;
      this.spits.push({
        x: caster.x, y: caster.y,
        vx: Math.cos(ang) * SPIT_SPEED,
        vy: Math.sin(ang) * SPIT_SPEED,
        owner,
        diesAt: scene.time.now + 2000,
      });
    }
    // The maw opening to throw it — a splash of bile out of the muzzle.
    this.fx(owner).motes(caster.x + Math.cos(base) * 20, caster.y + Math.sin(base) * 20, 5, {
      angle: base, spread: 0.5, speed: 130, size: 4, life: 320, depth: DEPTH_BEAM - 1, color: SILENCE.bile, drift: 6,
    });
  }

  // ══ Mastery ═══════════════════════════════════════════════════════
  //
  // Weep is a purely local passive. Puppetmaster reaches across every mode:
  //
  //  · Offline 1v1      — the npc is ours to simulate; drive it directly.
  //  · Invasion (solo   — husks are ours to simulate; `Fighter.puppetControlledUntil`
  //    or co-op host)     makes `Husk.update` yield and we drive the body instead.
  //  · Invasion co-op   — the husk is the host's. We drive our local replica and
  //    guest              stream it back over `huskPuppet`; the host holds its AI off.
  //  · Online PvP       — the opponent is a net ghost we may never move. We stream an
  //                       intent, and *their* sim runs the possession on their own
  //                       body (owner 'npc' here) where the damage actually counts.
  //
  // Everything except movement falls out of that for free: `takeDamage` on a net
  // ghost is already feedback-only, so the puppeteer's copy of the form animates
  // and lands nothing while the victim's copy does the real work.

  // ── Weep ───────────────────────────────────────────────────────────

  /** True while nothing alive is pointed at you (drives the speed + drain bonus). */
  private updateWeep(): void {
    if (!this.arena.masteryActive) {
      if (this.weepUnwatched) {
        this.weepUnwatched = false;
        this.arena.setStatusIndicator('silence-weep', null);
      }
      return;
    }
    const player = this.arena.player;
    if (!player.active || player.hp <= 0) return;

    let watched = false;
    for (const foe of this.foesOf('player')) {
      if (!foe.active || foe.hp <= 0 || foe.downed) continue;
      const toPlayer = Math.atan2(player.y - foe.y, player.x - foe.x);
      if (Math.abs(Phaser.Math.Angle.Wrap(toPlayer - foe.facingAngle)) <= WEEP_WATCH_ARC_RAD) {
        watched = true;
        break;
      }
    }
    // A possessed host is looking out of your own eyes — it can't be watching you.
    if (this.awakened.player) watched = false;

    const wasUnwatched = this.weepUnwatched;
    // The speed half of Weep is read back out of getPlayerSpeedMult(), not pushed here.
    this.weepUnwatched = !watched;
    if (this.weepUnwatched !== wasUnwatched) {
      this.arena.setStatusIndicator('silence-weep', this.weepUnwatched ? {
        name: 'Weep',
        emoji: '😢',
        color: 0x8844cc,
        description: 'Nothing is looking at you. +50% movement speed, and stealth drains 25% slower.',
        priority: 118,
      } : null);
    }
  }

  /**
   * The fighter Puppetmaster takes hold of: the one nearest the cursor among your live
   * foes, which is the npc in a 1v1 and whichever husk you are pointing at in invasion.
   *
   * A net ghost is allowed — we can't move it ourselves, but there is a channel to the
   * machine that can (the peer in PvP, the co-op host for a husk), and `driveHost`
   * streams to it instead of touching the body.
   */
  private puppetTarget(tx: number, ty: number): Fighter | null {
    let best: Fighter | null = null;
    let bestD = Number.MAX_VALUE;
    for (const foe of this.foesOf('player')) {
      if (!foe.active || foe.hp <= 0 || foe.downed) continue;
      // A ghost we have no way to reach (offline replica) can't be driven at all.
      if (foe.netGhost && !this.arena.isOnline) continue;
      const d = Phaser.Math.Distance.Between(tx, ty, foe.x, foe.y);
      if (d < bestD) { bestD = d; best = foe; }
    }
    return best;
  }

  /** Co-op only: the net id of a husk replica, so the host can be told to hold it. */
  private huskNetIdOf(f: Fighter): number | null {
    const id = (f as Fighter & { netId?: number }).netId;
    return typeof id === 'number' ? id : null;
  }

  /**
   * True only in online 1v1. The Puppetmaster `sil` messages describe a possession of
   * *the other player*, which is meaningless in co-op — there the target is a husk, and
   * its damage and position already have their own channels (`huskDamage`,
   * `huskPuppet`). Sending both would double-apply every hit.
   */
  private isPvpNet(): boolean {
    return this.arena.isOnline && !this.arena.isInvasion;
  }

  // ── Puppetmaster: the doll ─────────────────────────────────────────

  /** 0 = just cast, 1 = ready. While you are possessing, the bar runs the form's timer. */
  getPuppetmasterCooldownRatio(time: number): number {
    const a = this.awakened.player;
    if (a) return Phaser.Math.Clamp((a.endsAt - time) / AWAKEN_DURATION_MS, 0, 1);
    return Math.min(1, (time - this.puppetLastCastAt) / PUPPET_COOLDOWN_MS);
  }

  private tryCastPuppetmaster(time: number, tx: number, ty: number): void {
    const player = this.arena.player;
    const deny = (msg: string): void => {
      this.arena.showFloatingText(player.x, player.y - 32, msg, '#8866aa');
    };
    if (this.dolls.player) { deny('A doll already stands'); return; }
    if (this.strikers.player || (this.run && this.run.caster === 'player')) return;
    if (time - this.puppetLastCastAt < PUPPET_COOLDOWN_MS) return;

    const target = this.puppetTarget(tx, ty);
    if (!target) { deny('Nothing here to stitch'); return; }
    if (time - this.lastStabLandedAt > PUPPET_STAB_WINDOW_MS) {
      deny('🔪 Stab them first');
      return;
    }
    if (this.terror.player < PUPPET_TERROR_COST) {
      deny(`Need ${PUPPET_TERROR_COST} terror`);
      return;
    }

    this.terror.player -= PUPPET_TERROR_COST;
    this.puppetLastCastAt = time;
    // Planted just in front of you, kept clear of the arena edge.
    const x = Phaser.Math.Clamp(player.x + Math.cos(player.facingAngle) * 46, 24, this.arena.width - 24);
    const y = Phaser.Math.Clamp(player.y + Math.sin(player.facingAngle) * 46, 24, this.arena.height - 34);
    this.spawnDoll('player', target, x, y);
    // The exact spot goes on the wire: the victim's Ritual check has to agree with ours.
    if (this.isPvpNet()) this.arena.sendSilenceMsg({ t: 'sil', k: 'doll', x, y });
  }

  private spawnDoll(owner: Owner, target: Fighter, x: number, y: number): void {
    const scene = this.arena.scene;
    this.clearDoll(owner);

    const barBg = scene.add.rectangle(x, y - 28, 32, 5, 0x1a0d08, 0.9)
      .setStrokeStyle(1, 0x7d6440).setDepth(DEPTH_EYE);
    const barFill = scene.add.rectangle(x - 15, y - 28, 30, 3, 0xcc1133, 0.95)
      .setOrigin(0, 0.5).setDepth(DEPTH_EYE + 1);
    this.dolls[owner] = {
      x, y, barBg, barFill, owner, target, damageTaken: 0,
      hitFlashUntil: 0, bornAt: scene.time.now,
    };

    // Stitched together on the spot: scraps of burlap dragged in, then the thread pulled tight.
    const fx = this.fx(owner);
    fx.shred(x, y, 8, { color: SILENCE.burlap, speed: -110, life: 320, depth: DEPTH_STALKER + 1 });
    fx.graspRing(x, y, 44, 12, SILENCE.twine, 340, DEPTH_STALKER + 1, true);
    // …and a thread visibly pulled out of whoever it was made for.
    fx.claws(target.x, target.y, 4, {
      angle: Math.atan2(y - target.y, x - target.x), spread: 0.5, speed: 200,
      size: 12, life: 380, depth: DEPTH_EYE, color: SILENCE.twine,
    });
    this.arena.showFloatingText(x, y - 40, '🎎 EFFIGY', '#ffddaa');
    this.arena.spawnHitFlash(target.x, target.y, 0xb49a6a);
    scene.cameras.main.shake(160, 0.003);
  }

  /** Online replay: the remote Silence player stitched an effigy of us, right here. */
  private netSpawnDoll(x: number, y: number): void {
    const player = this.arena.player;
    if (!player.active || player.hp <= 0) return;
    this.spawnDoll('npc', player, x, y);
  }

  /**
   * Something of yours landed on the doll. Relays it to whoever the doll was stitched
   * for, with the 25% bonus, and books the raw amount against the doll's own 50 HP.
   * Returns true when the hit was consumed by the doll.
   *
   * The puppeteer is the authority here — the effigy is their object and only their
   * attacks can reach it — so online the relayed amount is sent for the victim to
   * apply to itself rather than being re-derived from a replayed hitbox.
   */
  private tryHitDoll(x: number, y: number, radius: number, amount: number): boolean {
    const d = this.dolls.player;
    if (!d || amount <= 0) return false;
    if (Phaser.Math.Distance.Between(x, y, d.x, d.y) > radius + DOLL_HIT_RADIUS) return false;

    d.damageTaken += amount;
    const relayed = Math.round(amount * DOLL_RELAY_MULT);
    if (d.target.active && d.target.hp > 0) {
      d.target.takeDamage(relayed);
      this.arena.spawnHitFlash(d.target.x, d.target.y, 0xffddaa);
    }
    this.showDollHit(d, relayed);
    if (this.isPvpNet() && d.target.netGhost) {
      this.arena.sendSilenceMsg({
        t: 'sil', k: 'doll-hit', dmg: relayed, left: Math.max(0, DOLL_HP - d.damageTaken),
      });
    }
    if (d.damageTaken >= DOLL_HP) this.breakDoll('player');
    return true;
  }

  /** Victim side: the puppeteer put something into our effigy — take it. */
  private netDollHit(dmg: number, left: number): void {
    const player = this.arena.player;
    if (player.active && player.hp > 0) {
      player.takeDamage(dmg);
      this.arena.spawnHitFlash(player.x, player.y, 0xffddaa);
    }
    const d = this.dolls.npc;
    if (!d) return;
    d.damageTaken = Math.max(0, DOLL_HP - left);
    this.showDollHit(d, dmg);
    if (left <= 0) this.breakDoll('npc');
  }

  private showDollHit(d: VoodooDoll, relayed: number): void {
    this.arena.showFloatingText(d.x, d.y - 34, `🎎 ${relayed}`, '#ffddaa');
    d.hitFlashUntil = this.arena.scene.time.now + 110;
    // Pins jolt out of it, and a puff of stuffing goes with them.
    const fx = this.fx(d.owner);
    fx.shred(d.x, d.y, 3, { color: SILENCE.twine, speed: 170, size: 3, life: 340, depth: DEPTH_EYE + 2 });
    fx.claws(d.x, d.y, 2, {
      speed: 190, size: 9, life: 300, depth: DEPTH_EYE + 2, color: SILENCE.sclera,
    });
  }

  private breakDoll(owner: Owner): void {
    const d = this.dolls[owner];
    if (!d) return;
    const { x, y } = d;
    // It comes apart at the seams: burlap scraps, stuffing, and the thread whipping loose.
    const fx = this.fx(owner);
    fx.shred(x, y, 12, { color: SILENCE.burlap, speed: 210, size: 6, life: 520, depth: DEPTH_EYE });
    fx.shred(x, y, 8, { color: SILENCE.twine, speed: 140, size: 3, life: 620, depth: DEPTH_EYE });
    fx.graspRing(x, y, 8, 52, SILENCE.twine, 420, DEPTH_EYE);
    this.arena.showFloatingText(x, y - 34, '🎎 THE DOLL BREAKS', '#ffddaa');
    this.clearDoll(owner);
    if (owner === 'player' && this.isPvpNet()) {
      this.arena.sendSilenceMsg({ t: 'sil', k: 'doll-gone' });
    }
  }

  private clearDoll(owner: Owner): void {
    const d = this.dolls[owner];
    if (!d) return;
    d.barBg.destroy();
    d.barFill.destroy();
    this.dolls[owner] = null;
  }

  private updateDoll(owner: Owner, time: number): void {
    const d = this.dolls[owner];
    if (!d) return;
    if (!d.target.active || d.target.hp <= 0) { this.clearDoll(owner); return; }

    const ratio = Phaser.Math.Clamp(1 - d.damageTaken / DOLL_HP, 0, 1);
    d.barFill.width = 30 * ratio;
    d.barFill.setFillStyle(ratio > 0.5 ? 0xcc1133 : 0xff4455, 0.95);

    // Anything you shoot at the effigy counts too — but only your own doll answers to
    // you. The replica of someone else's effigy is scenery; its damage arrives on the
    // wire from the machine that owns it.
    if (owner !== 'player') return;
    for (const go of this.arena.projectiles.getChildren() as Projectile[]) {
      if (!go.active || !go.isFromPlayer) continue;
      if (Phaser.Math.Distance.Between(go.x, go.y, d.x, d.y) > DOLL_HIT_RADIUS + 8) continue;
      go.setActive(false).setVisible(false);
      (go.body as Phaser.Physics.Arcade.Body).stop();
      this.tryHitDoll(d.x, d.y, 0, go.damage);
      break;
    }
    void time;
  }

  // ── Puppetmaster: the awakening ────────────────────────────────────

  /** True while the local player is steering someone else's body. */
  isAwakened(): boolean { return this.awakened.player !== null; }

  /** True while the local player *is* the body someone else is steering. */
  isPossessed(): boolean {
    const a = this.awakened.npc;
    return a !== null && a.host === this.arena.player;
  }

  private beginAwakened(owner: Owner): void {
    const d = this.dolls[owner];
    if (!d || this.awakened[owner]) return;
    const host = d.target;
    if (!host.active || host.hp <= 0) return;

    const scene = this.arena.scene;
    this.awakened[owner] = {
      owner,
      host,
      // The victim's copy runs a little long on purpose: the puppeteer's explicit
      // hand-back should be what ends it, with this only as a lost-message backstop.
      endsAt: scene.time.now + AWAKEN_DURATION_MS + (owner === 'npc' ? 2500 : 0),
      prevTexture: host.texture.key,
      prevScale: host.scaleX,
      netVx: 0,
      netVy: 0,
      netFa: host.facingAngle,
      huskNetId: this.huskNetIdOf(host),
    };
    host.setTexture('silence-awakened');
    host.setScale(1);

    if (owner === 'player') {
      // The puppet moveset shares the base slots — start it clean so a recently-used
      // Feast or Ritual doesn't lock half the form out.
      const player = this.arena.player;
      for (const id of ['silence-stab', 'silence-watch', 'silence-ritual', 'silence-feast', 'silence-run']) {
        player.resetCooldown(id);
      }
      if (this.isPvpNet()) this.arena.sendSilenceMsg({ t: 'sil', k: 'awaken', on: true });
    }

    // Their eyes go white, the shell splits, and what comes out is all hands.
    const fx = this.fx(owner);
    fx.watchPulse(host.x, host.y - 4, 22, SILENCE.white, DEPTH_EYE + 3, 520);
    fx.rupture(host.x, host.y, 70, { claws: 12, rings: 2, duration: 560, mark: false });
    fx.claws(host.x, host.y, 8, {
      speed: 130, size: 30, life: 620, depth: DEPTH_EYE + 2, color: SILENCE.void,
    });
    this.arena.showFloatingText(host.x, host.y - 52, '🕷 AWAKENED', '#eeddff');
    scene.cameras.main.shake(420, 0.01);
    scene.cameras.main.flash(240, 40, 0, 50);
    this.showAwakenedIndicator(owner, this.awakened[owner]!.endsAt);
  }

  private showAwakenedIndicator(owner: Owner, until: number): void {
    // The tray shows what is happening to *you*, so the two sides read differently.
    this.arena.setStatusIndicator('silence-awakened', owner === 'player' ? {
      name: 'Awakened',
      emoji: '🕷',
      color: 0x8844cc,
      description: 'You are wearing the enemy. Click slash · E bite · R cannibalize · F slam · Q let go.',
      until,
      priority: 100,
    } : {
      name: 'Possessed',
      emoji: '🎎',
      color: 0x8844cc,
      description: 'Something has climbed inside you. It is steering your body and tearing it apart from within.',
      until,
      priority: 2,
    });
  }

  /** `withPenalty` = the voluntary Q hand-back, which costs the host 20 on the way out. */
  private endAwakened(owner: Owner, withPenalty: boolean, silent = false): void {
    const a = this.awakened[owner];
    if (!a) return;
    this.awakened[owner] = null;
    this.arena.setStatusIndicator('silence-awakened', null);

    const host = a.host;
    if (host.active) {
      host.setTexture(a.prevTexture);
      host.setScale(a.prevScale);
      host.puppetControlledUntil = 0;
      (host.body as Phaser.Physics.Arcade.Body | null)?.setVelocity(0, 0);
    }
    if (owner === 'player') {
      if (this.isPvpNet() && host.netGhost) {
        this.arena.sendSilenceMsg({
          t: 'sil', k: 'awaken', on: false, dmg: withPenalty ? AWAKEN_UNPOSSESS_DMG : 0,
        });
      }
      if (a.huskNetId !== null) this.arena.sendHuskPuppet(a.huskNetId, false, host.x, host.y);
    }
    if (silent) return;

    // It pulls back inside: a ring of fingers closing down to nothing over the host.
    const fx = this.fx(owner);
    fx.graspRing(host.x, host.y, 46, 6, SILENCE.void, 400, DEPTH_EYE, true);
    fx.motes(host.x, host.y, 8, { speed: 30, size: 6, life: 480, depth: DEPTH_EYE - 1, color: SILENCE.void, drift: 4 });
    if (withPenalty && host.active && host.hp > 0) {
      host.takeDamage(AWAKEN_UNPOSSESS_DMG);
      this.arena.spawnHitFlash(host.x, host.y, 0x8844cc);
      this.arena.showFloatingText(host.x, host.y - 46, '🕷 IT GOES BACK IN', '#cc99ff');
    }
  }

  /**
   * Keeps a possession alive: freezes the puppeteer's own body, drives the host, and
   * draws the tentacles. `driveHost` is where the four modes diverge; everything else
   * here is identical whichever machine is running it.
   */
  private updateAwakened(owner: Owner, time: number): void {
    const a = this.awakened[owner];
    if (!a) return;
    const caster = this.fighterOf(owner);
    const host = a.host;

    if (!host.active || host.hp <= 0 || !caster.active || caster.hp <= 0) {
      this.endAwakened(owner, false);
      return;
    }
    if (time >= a.endsAt) { this.endAwakened(owner, false); return; }

    // The puppeteer's own body stands vacant where they left it. Only ours is ours to
    // freeze — a ghost puppeteer is already frozen by whatever its own machine says.
    if (owner === 'player') {
      (caster.body as Phaser.Physics.Arcade.Body | null)?.setVelocity(0, 0);
      this.arena.setPlayerYankUntil(time + 60);
    }

    this.driveHost(a, time);
  }

  /**
   * Move the possessed body, by whichever route this machine actually has.
   *
   * Puppeteer side reads WASD. If the host is ours to move we set its velocity and hold
   * its AI off; if it is a ghost we send the intent to the machine that owns it. Victim
   * side ignores input entirely and replays the streamed vector onto its own body.
   */
  private driveHost(a: AwakenedState, time: number): void {
    const host = a.host;
    const body = host.body as Phaser.Physics.Arcade.Body | null;

    if (a.owner === 'npc') {
      // We are the puppet. Our keys do nothing; the wire drives us, and we can't cast.
      body?.setVelocity(a.netVx * host.speed, a.netVy * host.speed);
      host.facingAngle = a.netFa;
      if (host === this.arena.player) {
        this.arena.setPlayerYankUntil(time + 60);
        this.arena.player.disarmedUntil = Math.max(this.arena.player.disarmedUntil, Date.now() + 250);
      }
      return;
    }

    let vx = 0;
    let vy = 0;
    if (this.arena.aKey.isDown) vx -= 1;
    if (this.arena.dKey.isDown) vx += 1;
    if (this.arena.wKey.isDown) vy -= 1;
    if (this.arena.sKey.isDown) vy += 1;
    if (vx !== 0 && vy !== 0) { vx *= 0.7071; vy *= 0.7071; }

    // Aim comes from the cursor, not from where the body is drifting.
    const pointer = this.arena.scene.input.activePointer;
    const fa = Math.atan2(pointer.worldY - host.y, pointer.worldX - host.x);
    host.facingAngle = fa;

    if (!host.netGhost) {
      // Ours to move. Hold off both possible drivers: the 1v1 AI reads npcLockUntil
      // through NpcAiState, a husk reads puppetControlledUntil in its own update.
      if (host === this.arena.npc) this.npcLockUntil = Math.max(this.npcLockUntil, time + 60);
      host.puppetControlledUntil = time + 200;
      body?.setVelocity(vx * host.speed, vy * host.speed);
      // Co-op guest: our replica is only a puppet of the host's husk — tell it where to be.
      if (a.huskNetId !== null) this.arena.sendHuskPuppet(a.huskNetId, true, host.x, host.y);
      return;
    }

    // A ghost: never touch the body, stream the intent at the state-stream rate.
    if (a.huskNetId !== null) {
      // Co-op replica husk: we still move our own copy so it feels responsive, and the
      // host mirrors it. (applyHuskSnap skips the lerp while we are driving.)
      host.puppetControlledUntil = time + 200;
      body?.setVelocity(vx * host.speed, vy * host.speed);
      this.arena.sendHuskPuppet(a.huskNetId, true, host.x, host.y);
      return;
    }
    if (time - this.lastPuppetMoveSentAt >= PUPPET_MOVE_SEND_MS) {
      this.lastPuppetMoveSentAt = time;
      this.arena.sendSilenceMsg({ t: 'sil', k: 'puppet-move', vx, vy, fa });
    }
  }

  // ── Puppetmaster: the awakened moveset ─────────────────────────────
  //
  // Each action resolves locally and then goes out under its own `puppet-*` id (see
  // `doNpcPuppetAct`). Two of them — bite and cannibalize — branch on whether a kin
  // was under the cursor, and kin wander independently on each sim, so the *decision*
  // is what travels rather than the cursor position that produced it.

  private awakenedSlash(owner: Owner, tx: number, ty: number): void {
    const a = this.awakened[owner];
    if (!a) return;
    const host = a.host;
    const ang = Math.atan2(ty - host.y, tx - host.x);

    // Four of the limbs rake across the arc at once — this thing has more arms than a body.
    const fx = this.fx(owner);
    fx.slash(host.x, host.y, ang, AWAKEN_SLASH_RANGE, AWAKEN_SLASH_ARC_RAD, {
      color: SILENCE.lilac, scores: 4, duration: 240,
    });
    fx.claws(host.x + Math.cos(ang) * 40, host.y + Math.sin(ang) * 40, 5, {
      angle: ang, spread: AWAKEN_SLASH_ARC_RAD, speed: 210, size: 18, life: 340,
      depth: DEPTH_BEAM, color: SILENCE.void,
    });

    // A tentacle that finds the effigy first puts the relayed hit through instead.
    const d = this.dolls.player;
    if (owner === 'player' && d && this.inAwakenedArc(a, d.x, d.y, ang, AWAKEN_SLASH_RANGE)) {
      this.tryHitDoll(d.x, d.y, 0, AWAKEN_SLASH_DMG);
      return;
    }
    this.hurtHost(a, AWAKEN_SLASH_DMG, '🕷 SLASH');
  }

  private awakenedBite(owner: Owner, tx: number, ty: number, eatKin: boolean): void {
    const a = this.awakened[owner];
    if (!a) return;
    const host = a.host;
    const ang = Math.atan2(ty - host.y, tx - host.x);
    const mx = host.x + Math.cos(ang) * 38;
    const my = host.y + Math.sin(ang) * 38;
    // A ring of teeth snapping shut on the spot, rather than a circle that grows.
    const fx = this.fx(owner);
    fx.anim(DEPTH_BEAM, 240, (g, t) => {
      // Snaps shut over the first third, then hangs open bleeding out.
      toothRing(g, this.col(owner), mx, my, 20 * (1 - t * 0.35), 14, Math.min(1, t * 3), 1 - t, SILENCE.meat);
    });

    // Feasting on your own kin: it goes down whole and the puppeteer gets 12 back.
    if (eatKin) {
      const eaten = this.kinAtCursor(a, tx, ty);
      if (eaten >= 0) {
        const k = this.kin[eaten];
        this.arena.showFloatingText(k.x, k.y - 20, '😬 EATEN', '#ffcccc');
        fx.shred(k.x, k.y, 6, { color: SILENCE.void, speed: 130, size: 4, life: 380, depth: DEPTH_STALKER });
        this.kin.splice(eaten, 1);
      }
      this.healPuppeteer(a, AWAKEN_BITE_HEAL);
      return;
    }
    this.hurtHost(a, AWAKEN_BITE_DMG, '😬 BITE');
    this.healPuppeteer(a, AWAKEN_BITE_HEAL);
  }

  private awakenedCannibalize(owner: Owner, tx: number, ty: number, raiseKin: boolean): void {
    const a = this.awakened[owner];
    if (!a) return;
    const host = a.host;

    // Ritual on a kin instead of on yourself: it stands up wearing the enemy's face.
    if (raiseKin) {
      const chosen = this.kinAtCursor(a, tx, ty);
      if (chosen >= 0) {
        const k = this.kin[chosen];
        this.spawnCorruptClone(owner, k.x, k.y, k.target);
        this.kin.splice(chosen, 1);
      } else {
        // Our kin drifted elsewhere; honour the intent by raising one at the host.
        this.spawnCorruptClone(owner, host.x + 60, host.y, host);
      }
      return;
    }

    // It eats inward: the whole ring of fingers closes on the body it is riding.
    const fx = this.fx(owner);
    fx.graspRing(host.x, host.y, 34, 4, SILENCE.blood, 320, DEPTH_EYE, true);
    fx.stain(host.x, host.y, 18, DEPTH_GROUND_FX, true);
    this.hurtHost(a, AWAKEN_CANNIBAL_DMG, '🔴 CANNIBALIZE');
    this.healPuppeteer(a, AWAKEN_CANNIBAL_HEAL);
  }

  private awakenedSlam(owner: Owner): void {
    const a = this.awakened[owner];
    if (!a) return;
    const host = a.host;
    const scene = this.arena.scene;
    const fx = this.fx(owner);
    // The slam itself: a shockwave of fingers punching up out of the floor.
    fx.graspRing(host.x, host.y, 30, 126, SILENCE.amethyst, 480, DEPTH_GROUND_FX);
    fx.stain(host.x, host.y, 40, DEPTH_GROUND_FX - 1);
    scene.cameras.main.shake(260, 0.007);
    this.arena.showFloatingText(host.x, host.y - 50, '🕳 THEY CRAWL UP', '#cc99ff');

    for (let i = 0; i < KIN_PER_SLAM; i++) {
      const ang = (i / KIN_PER_SLAM) * Math.PI * 2 + Math.random();
      const x = Phaser.Math.Clamp(host.x + Math.cos(ang) * 90, 24, this.arena.width - 24);
      const y = Phaser.Math.Clamp(host.y + Math.sin(ang) * 90, 24, this.arena.height - 30);
      this.kin.push({
        x, y,
        facing: ang + Math.PI,
        bornAt: scene.time.now,
        owner,
        target: host,
        expiresAt: scene.time.now + KIN_LIFETIME_MS,
        nextStabAt: scene.time.now + KIN_STAB_EVERY_MS,
      });
      // Each one claws its own hole open on the way out.
      fx.motes(x, y, 4, { speed: 45, size: 5, life: 460, depth: DEPTH_GROUND_FX, color: SILENCE.void });
    }
  }

  /** Damage the possessed body — every awakened attack tears at the host it rode in on. */
  private hurtHost(a: AwakenedState, amount: number, label: string): void {
    const host = a.host;
    if (!host.active || host.hp <= 0) return;
    host.takeDamage(amount);
    this.arena.spawnHitFlash(host.x, host.y, 0x6622aa);
    this.arena.showFloatingText(host.x, host.y - 44, label, '#cc99ff');
  }

  /**
   * Heal whoever is doing the possessing. Only ever lands on the local player: on the
   * victim's sim the puppeteer is a ghost, and `heal` on a ghost is already a no-op,
   * so the caster's own machine is the single place the HP actually moves.
   */
  private healPuppeteer(a: AwakenedState, amount: number): void {
    this.fighterOf(a.owner).heal(amount);
  }

  private inAwakenedArc(a: AwakenedState, x: number, y: number, ang: number, range: number): boolean {
    const host = a.host;
    if (Phaser.Math.Distance.Between(host.x, host.y, x, y) > range) return false;
    const to = Math.atan2(y - host.y, x - host.x);
    return Math.abs(Phaser.Math.Angle.Wrap(to - ang)) <= AWAKEN_SLASH_ARC_RAD;
  }

  /**
   * Index of the kin nearest the cursor, or -1. Both the bite (eat it) and the ritual
   * (raise it) pick this way, so the same gesture — point at the thing, press the key —
   * works for either, whichever side of you the creature has scuttled around to.
   */
  private kinAtCursor(a: AwakenedState, tx: number, ty: number): number {
    const host = a.host;
    let best = -1;
    let bestD = KIN_PICK_CURSOR_RADIUS;
    for (let i = 0; i < this.kin.length; i++) {
      const k = this.kin[i];
      if (k.owner !== a.owner) continue;
      if (Phaser.Math.Distance.Between(host.x, host.y, k.x, k.y) > KIN_PICK_MAX_DIST) continue;
      const d = Phaser.Math.Distance.Between(tx, ty, k.x, k.y);
      if (d <= bestD) { bestD = d; best = i; }
    }
    return best;
  }

  // ── Puppetmaster: kin + corrupted clones ───────────────────────────

  private updateKin(time: number, dt: number): void {
    for (let i = this.kin.length - 1; i >= 0; i--) {
      const k = this.kin[i];
      if (time >= k.expiresAt || !k.target.active || k.target.hp <= 0) {
        // They do not fade — they go back down the hole they came out of.
        this.fx(k.owner).motes(k.x, k.y, 3, {
          speed: 20, size: 4, life: 300, depth: DEPTH_GROUND_FX, color: SILENCE.void, drift: 6,
        });
        this.kin.splice(i, 1);
        continue;
      }
      const ang = Math.atan2(k.target.y - k.y, k.target.x - k.x);
      const d = Phaser.Math.Distance.Between(k.x, k.y, k.target.x, k.target.y);
      if (d > KIN_REACH) {
        k.x += Math.cos(ang) * KIN_SPEED * dt;
        k.y += Math.sin(ang) * KIN_SPEED * dt;
      }
      k.facing = ang;

      if (d <= KIN_REACH && time >= k.nextStabAt) {
        k.nextStabAt = time + KIN_STAB_EVERY_MS;
        k.target.takeDamage(KIN_STAB_DMG);
        this.arena.spawnHitFlash(k.target.x, k.target.y, 0x2a1038);
        this.arena.showFloatingText(k.x, k.y - 20, '🗡', '#cc99ff');
        this.fx(k.owner).slash(k.x, k.y, ang, 26, 0.6, { scores: 1, duration: 180, bloody: true });
      }
    }
  }

  /**
   * While possessing, the kin your cursor has landed on is drawn with a halo — without it
   * there is no way to tell which one an E (eat) or R (raise) is about to take, since they
   * pile up against the host on every side. Returns that kin's index, or -1.
   */
  private aimedKinIndex(): number {
    const a = this.awakened.player;
    if (!a) return -1;
    const pointer = this.arena.scene.input.activePointer;
    return this.kinAtCursor(a, pointer.worldX, pointer.worldY);
  }

  private spawnCorruptClone(owner: Owner, x: number, y: number, target: Fighter): void {
    const scene = this.arena.scene;
    this.corrupts.push({
      x, y,
      facing: 0,
      bornAt: scene.time.now,
      borrowed: target.element.color,
      owner, target,
      expiresAt: scene.time.now + CORRUPT_LIFETIME_MS,
      nextShotAt: scene.time.now + 600,
      nextMeleeAt: 0,
    });
    // It stands up wearing their colour — the ring that raises it is theirs, not Silence's.
    const fx = this.fx(owner);
    fx.graspRing(x, y, 8, 60, SILENCE.void, 420, DEPTH_STALKER + 2);
    fx.claws(x, y, 7, { speed: 150, size: 16, life: 480, depth: DEPTH_STALKER + 2, color: SILENCE.void });
    fx.flash(x, y, 26, DEPTH_STALKER + 2, SILENCE.white);
    this.arena.showFloatingText(x, y - 32, '😁 CORRUPTED', '#ffffff');
    scene.cameras.main.shake(200, 0.005);
  }

  /**
   * The clone copies whoever it was made from: it chases them down and throws their own
   * element back at them. It is a stand-in for the real moveset, not a full second AI —
   * the colour and cadence carry the impression, the numbers are its own.
   */
  private updateCorrupts(time: number, dt: number): void {
    for (let i = this.corrupts.length - 1; i >= 0; i--) {
      const c = this.corrupts[i];
      const gone = time >= c.expiresAt || !c.target.active || c.target.hp <= 0;
      if (gone) {
        this.fx(c.owner).motes(c.x, c.y, 6, {
          speed: 40, size: 6, life: 420, depth: DEPTH_STALKER, color: SILENCE.void, drift: 4,
        });
        this.corrupts.splice(i, 1);
        continue;
      }

      const ang = Math.atan2(c.target.y - c.y, c.target.x - c.x);
      const d = Phaser.Math.Distance.Between(c.x, c.y, c.target.x, c.target.y);
      if (d > CORRUPT_MELEE_RANGE - 6) {
        c.x += Math.cos(ang) * CORRUPT_SPEED * dt;
        c.y += Math.sin(ang) * CORRUPT_SPEED * dt;
      }
      c.facing = ang;

      if (d <= CORRUPT_MELEE_RANGE && time >= c.nextMeleeAt) {
        c.nextMeleeAt = time + CORRUPT_MELEE_EVERY_MS;
        c.target.takeDamage(CORRUPT_MELEE_DMG);
        this.arena.spawnHitFlash(c.target.x, c.target.y, 0xffffff);
        this.fx(c.owner).slash(c.x, c.y, ang, CORRUPT_MELEE_RANGE, 0.7, { scores: 2, duration: 190 });
      } else if (d > CORRUPT_MELEE_RANGE && time >= c.nextShotAt) {
        c.nextShotAt = time + CORRUPT_SHOT_EVERY_MS;
        this.corruptShots.push({
          x: c.x, y: c.y,
          vx: Math.cos(ang) * CORRUPT_SHOT_SPEED,
          vy: Math.sin(ang) * CORRUPT_SHOT_SPEED,
          borrowed: c.borrowed,
          target: c.target,
          diesAt: time + 2400,
        });
        // Muzzle flare in the copied element's own colour.
        this.fx(c.owner).flash(c.x + Math.cos(ang) * 18, c.y + Math.sin(ang) * 18, 12, DEPTH_BEAM, c.borrowed);
      }
    }
  }

  private updateCorruptShots(time: number, dt: number): void {
    for (let i = this.corruptShots.length - 1; i >= 0; i--) {
      const s = this.corruptShots[i];
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      let dead = time >= s.diesAt;
      if (!dead && s.target.active && s.target.hp > 0
        && Phaser.Math.Distance.Between(s.x, s.y, s.target.x, s.target.y) <= 24) {
        s.target.takeDamage(CORRUPT_SHOT_DMG);
        this.arena.spawnHitFlash(s.target.x, s.target.y, s.target.element.color);
        this.pfx.rupture(s.x, s.y, 24, { color: s.borrowed, claws: 4, rings: 1, duration: 300, mark: false });
        dead = true;
      }
      if (dead) this.corruptShots.splice(i, 1);
    }
  }

  // ── Requirement tracking ───────────────────────────────────────────

  /** "Killed while a Striker" is booked at the moment of death, not at registration. */
  private trackStrikerKills(): void {
    for (const foe of this.foesOf('player')) {
      if (!foe.active || this.masteryTrackedFoes.has(foe)) continue;
      this.masteryTrackedFoes.add(foe);
      foe.once('defeated', () => {
        if (this.strikers.player) this.arena.recordMasteryStat('strikerKills', 1);
      });
    }
  }

  // ── Per-frame update ───────────────────────────────────────────────

  update(time: number, delta: number, playerIsSilence: boolean, npcIsSilence: boolean): void {
    this.playerIsSilence = playerIsSilence;
    this.npcIsSilence = npcIsSilence;
    const dt = delta / 1000;

    this.updateFacing();
    this.updateWeep();
    this.updateStealth('player', dt);
    this.updateStealth('npc', dt);
    this.renderInvisibility('player');
    this.renderInvisibility('npc');
    this.updateFaceEyes();
    this.updateStalkers(time, dt);
    this.updateGrabbers(time, delta);
    this.updateVultures(time, dt);
    this.updateRituals(time);
    this.updateRacks(time);
    this.updateFeasts(time, delta);
    this.updateSpits(time, dt);
    this.updateRunChase(time);
    this.updateHallucinations(time);
    this.updateTerror('player', dt);
    this.updateTerror('npc', dt);
    this.updateStriker('player', time, dt);
    this.updateStriker('npc', time, dt);
    this.updateEyeShots(time, dt);
    this.updateMidgets(time, dt);
    this.updatePanicOverlay(time);
    this.updateBloodDecals(time);
    // Mastery — both owners: 'player' is our own possession, 'npc' is a remote
    // Puppetmaster's, running here because this is the machine that owns the body.
    if (playerIsSilence) this.trackStrikerKills();
    this.updateDoll('player', time);
    this.updateDoll('npc', time);
    this.updateAwakened('player', time);
    this.updateAwakened('npc', time);
    this.updateKin(time, dt);
    this.updateCorrupts(time, dt);
    this.updateCorruptShots(time, dt);
    this.updateNpcMirrorAI(time);
    this.updateHud();
    // Everything the kit owns is repainted from scratch here, after the sim has moved it.
    this.paintWorld(time);
    this.updateAuras(delta);
    this.updateAvatars(delta);
  }

  // ── Painting ───────────────────────────────────────────────────────
  //
  // Every world object this kit owns is plain data, drawn per frame into a handful of shared
  // Graphics layers. That is what lets a watcher's eye track you, a grabber's arm sag under its
  // own weight and a wall of teeth chew — none of which a static texture can do.

  private paintWorld(time: number): void {
    const t = time / 1000;
    const ground = this.layer(DEPTH_GROUND_FX);
    const world = this.layer(DEPTH_STALKER);
    const air = this.layer(DEPTH_BEAM);
    ground.clear();
    world.clear();
    air.clear();

    this.paintFog(time);
    this.paintMazeWalls(ground, t);
    this.paintFeasts(ground, t);
    this.paintGazeCones(ground, time);
    this.paintStalkers(world, time, t);
    this.paintGrabbers(world, air, time, t);
    this.paintVultures(world, ground, time, t);
    this.paintPuppetry(world, air, t);
    this.paintMidgets(world, t);
    this.paintBloodDecals(world, time);
    this.paintProjectiles(air, t);
    this.paintStrikers(world, air, t);
    this.paintRacks(world, air, t);
    this.paintRunArm(air, time, t);
    this.paintBlob(world, t);
    this.paintFaceEyes(air, t);
    this.paintFleshDecals(ground, t);
    this.paintEyeScreen(t);
  }

  private paintFeasts(g: Phaser.GameObjects.Graphics, t: number): void {
    const now = this.arena.scene.time.now;
    for (const f of this.feasts) {
      const col = this.col(f.owner);
      const age = Phaser.Math.Clamp((now - f.bornAt) / 320, 0, 1);
      const life = Phaser.Math.Clamp((f.endsAt - now) / 600, 0, 1);
      const a = age * life;
      // A gullet, not a disc: a dark throat with a ring of teeth grinding round it.
      fogBank(g, f.x, f.y, FEAST_RADIUS * 0.85 * age, f.bornAt * 0.001, t, col(SILENCE.void), a * 0.7, 9);
      g.fillStyle(col(SILENCE.meat), a * 0.3);
      g.fillCircle(f.x, f.y, FEAST_RADIUS * 0.62 * age);
      // The bite cycles — it is always in the middle of chewing on something.
      const bite = 0.45 + 0.45 * Math.sin(t * 2.4 + f.bornAt);
      toothRing(g, col, f.x, f.y, FEAST_RADIUS * age, 24, bite, a);
      toothRing(g, col, f.x, f.y, FEAST_RADIUS * 0.6 * age, 16, 1 - bite, a * 0.8);
      // Anyone standing in it has fingers coming up round their ankles.
      for (const [foe, ms] of f.insideMs) {
        if (!foe.active || f.triggered.has(foe)) continue;
        const k = Phaser.Math.Clamp(ms / FEAST_REQUIRED_INSIDE_MS, 0, 1);
        for (let i = 0; i < 6; i++) {
          const ang = (i / 6) * Math.PI * 2 + t;
          clawFingerLayered(g, col, foe.x + Math.cos(ang) * 18, foe.y + Math.sin(ang) * 10 + 8,
            -Math.PI / 2 + Math.cos(ang) * 0.5, 10 + k * 18, 2.2,
            SILENCE.pitch, SILENCE.bone, a * (0.4 + k * 0.6), 0.4, false);
        }
      }
    }
  }

  /**
   * Q+ The Labyrinth: a wall the blob has started on. The alpha fade underneath says it is
   * dying; this says *how* — a mouth working its way through it, spitting out the pieces.
   */
  private paintMazeWalls(g: Phaser.GameObjects.Graphics, t: number): void {
    const run = this.run;
    if (!run || run.mazeWalls.length === 0) return;
    const now = this.arena.scene.time.now;
    for (const w of run.mazeWalls) {
      if (w.dyingAt === 0) continue;
      const k = Phaser.Math.Clamp(1 - (w.dyingAt - now) / MAZE_EAT_MS, 0, 1);
      const r = w.rect;
      const bite = 0.4 + 0.6 * Math.abs(Math.sin(t * 9));
      toothRing(g, this.col(run.caster), r.x, r.y, Math.max(r.width, r.height) * 0.5 * (0.5 + k * 0.5),
        12, bite, 1 - k * 0.4);
      // Masonry coming away in lumps.
      if (Math.random() < 0.25) {
        this.fx(run.caster).shred(r.x, r.y, 2, {
          color: SILENCE.plum, speed: 90, size: 4, life: 420, depth: DEPTH_HALL_FLOOR + 2,
        });
      }
    }
  }

  private paintGazeCones(g: Phaser.GameObjects.Graphics, time: number): void {
    const cone = (x: number, y: number, heading: number, col: SilenceColorFn): void => {
      // A cone of attention rather than a flat wedge: banded, and brightest at its throat.
      const pulse = 0.5 + 0.5 * Math.sin(time / 250);
      for (let i = 3; i >= 1; i--) {
        const r = SEEKER_CONE_LEN * (i / 3);
        g.fillStyle(col(SILENCE.gore), 0.05 + 0.045 * (4 - i) * pulse);
        g.beginPath();
        g.moveTo(x, y);
        g.arc(x, y, r, heading - SEEKER_CONE_HALF_RAD, heading + SEEKER_CONE_HALF_RAD);
        g.closePath();
        g.fillPath();
      }
      g.lineStyle(1.2, col(SILENCE.gore), 0.45 + 0.25 * pulse);
      g.beginPath();
      g.moveTo(x, y);
      g.arc(x, y, SEEKER_CONE_LEN, heading - SEEKER_CONE_HALF_RAD, heading + SEEKER_CONE_HALF_RAD);
      g.closePath();
      g.strokePath();
    };
    for (const s of this.stalkers) if (s.kind === 'seeker') cone(s.x, s.y, s.heading, this.col(s.owner));
    for (const v of this.vultures) if (!v.carry) cone(v.x, v.y, v.heading, this.col(v.owner));
  }

  private paintStalkers(g: Phaser.GameObjects.Graphics, time: number, t: number): void {
    for (const s of this.stalkers) {
      const maturity = Phaser.Math.Clamp((time - s.bornAt) / STALKER_MATURE_MS, 0, 1);
      // A young watcher is only fully open to whoever planted it; everyone else sees a squint.
      const ownerSees = s.owner === 'player' ? this.playerIsSilence : this.npcIsSilence;
      const flash = time < s.hitFlashUntil;
      SilenceFx.drawWatcher(g, flash ? () => SILENCE.white : this.col(s.owner),
        s.x, s.y, maturity, s.kind === 'seeker', t + s.seed, 1, ownerSees);
    }
  }

  private paintGrabbers(
    world: Phaser.GameObjects.Graphics, air: Phaser.GameObjects.Graphics, time: number, t: number,
  ): void {
    for (const gr of this.grabbers) {
      const col = this.col(gr.owner);
      const pop = Phaser.Math.Clamp((time - gr.bornAt) / 300, 0, 1);
      SilenceFx.drawGrabber(world, col, gr.x, gr.y, gr.seed, t, pop, gr.grab !== null);
      const grab = gr.grab;
      if (!grab || !grab.victim.active) continue;
      // The arm, and how tight the hand is: a reaching grab is open, a dragging one is shut.
      const closed = grab.phase === 'reaching'
        ? Phaser.Math.Clamp(1 - (grab.phaseEnd - time) / 450, 0, 1) * 0.5
        : 1;
      SilenceFx.drawReachingArm(air, col, gr.x, gr.y, grab.victim.x, grab.victim.y, t, 1, closed);
    }
  }

  private paintVultures(
    world: Phaser.GameObjects.Graphics, ground: Phaser.GameObjects.Graphics, time: number, t: number,
  ): void {
    for (const v of this.vultures) {
      const col = this.col(v.owner);
      const fade = Phaser.Math.Clamp((v.expiresAt - time) / 1200, 0, 1);
      // Wings first, behind the body: two big fans of clawed feathers on the downbeat.
      const beat = Math.sin(t * (v.carry ? 13 : 7) + v.seed);
      for (const side of [-1, 1]) {
        const facing = v.carry ? -Math.PI / 2 : v.heading;
        for (let i = 0; i < 5; i++) {
          const a = facing + side * (0.5 + i * 0.3) + side * beat * 0.42;
          clawFingerLayered(world, col, v.x + side * 6, v.y - 4, a,
            30 - i * 3.4, 4 - i * 0.4, SILENCE.void, SILENCE.violet, fade * 0.95, side * 0.34, false);
        }
      }
      // Hunched body, dead eyes, and the grin that is the whole point of the thing.
      fogBank(world, v.x, v.y, 17, v.seed, t, col(SILENCE.void), fade, 6);
      const look = v.carry ? 0 : Math.cos(v.heading) < 0 ? -0.9 : 0.9;
      silenceEye(world, col, v.x - 5, v.y - 4, 0, 4.4, look, 1, SILENCE.sclera, fade);
      silenceEye(world, col, v.x + 5, v.y - 4, 0, 4.4, look, 1, SILENCE.sclera, fade);
      world.fillStyle(col(SILENCE.bone), fade);
      for (let i = 0; i < 7; i++) {
        const gx = v.x - 9 + i * 3;
        const h = 4 + (i % 2) * 2.5;
        world.fillTriangle(gx - 1.4, v.y + 4, gx + 1.4, v.y + 4, gx, v.y + 4 + h);
      }
      // Talons hanging under it, and a shadow on the floor so the height reads.
      for (const side of [-1, 1]) {
        clawFingerLayered(world, col, v.x + side * 5, v.y + 8, Math.PI / 2 + side * 0.3,
          13, 2, SILENCE.void, SILENCE.violet, fade * 0.9, side * 0.5);
      }
      ground.fillStyle(col(SILENCE.void), fade * 0.3);
      ground.fillEllipse(v.x, v.y + 34, 30, 9);
    }
  }

  private paintPuppetry(
    world: Phaser.GameObjects.Graphics, air: Phaser.GameObjects.Graphics, t: number,
  ): void {
    const now = this.arena.scene.time.now;
    for (const owner of ['player', 'npc'] as Owner[]) {
      const d = this.dolls[owner];
      if (d) {
        const col = now < d.hitFlashUntil ? () => SILENCE.white : this.col(owner);
        const pop = Phaser.Math.Clamp((now - d.bornAt) / 320, 0, 1);
        SilenceFx.drawDoll(world, col, d.x, d.y, Phaser.Math.Clamp(1 - d.damageTaken / DOLL_HP, 0, 1), t, pop);
        // The thread back to whoever it was stitched for, so the relay is never a mystery.
        if (d.target.active && d.target.hp > 0) {
          air.lineStyle(1.2, this.col(owner)(SILENCE.twine), 0.35 + 0.2 * Math.sin(t * 3));
          air.lineBetween(d.x, d.y - 8, d.target.x, d.target.y);
        }
      }
      const a = this.awakened[owner];
      if (a && a.host.active) {
        SilenceFx.drawAwakened(world, this.col(owner), a.host.x, a.host.y, a.host.facingAngle, t,
          a.host.forceInvisible ? 0 : a.host.alpha);
      }
    }
    const aimed = this.aimedKinIndex();
    for (let i = 0; i < this.kin.length; i++) {
      const k = this.kin[i];
      const pop = Phaser.Math.Clamp((now - k.bornAt) / 380, 0, 1);
      SilenceFx.drawKin(world, this.col(k.owner), k.x, k.y, k.facing, t, pop, i === aimed);
    }
    for (const c of this.corrupts) {
      const pop = Phaser.Math.Clamp((now - c.bornAt) / 340, 0, 1);
      // Fades out over its last second.
      const fade = Math.min(pop, (c.expiresAt - now) / 1000);
      SilenceFx.drawCorrupt(world, this.col(c.owner), c.x, c.y, c.borrowed, t, Phaser.Math.Clamp(fade, 0, 1));
    }
  }

  private paintMidgets(g: Phaser.GameObjects.Graphics, t: number): void {
    for (const pack of this.midgets.values()) {
      for (const m of pack) SilenceFx.drawMidget(g, this.pcol, m.x, m.y, m.angle, t, 1);
    }
  }

  private paintBloodDecals(g: Phaser.GameObjects.Graphics, time: number): void {
    for (const b of this.bloodDecals) {
      if (!b.target.active) continue;
      // Drawn onto the victim, so it travels with them — it is on them, not on the floor.
      const a = Math.min(1, (b.until - time) / 3000);
      bloodSplat(g, this.pcol, b.target.x + b.ox, b.target.y + b.oy, b.r, b.seed, a);
    }
  }

  private paintProjectiles(g: Phaser.GameObjects.Graphics, t: number): void {
    for (const s of this.spits) {
      SilenceFx.drawSpit(g, this.col(s.owner), s.x, s.y, Math.atan2(s.vy, s.vx), t, 1);
    }
    for (const s of this.eyeShots) {
      const col = this.col(s.owner);
      const ang = Math.atan2(s.vy, s.vx);
      // A shot eye: the eyeball itself, flying, with the nerve streaming behind it.
      g.lineStyle(2, col(SILENCE.meat), 0.7);
      g.lineBetween(s.x - Math.cos(ang) * 16, s.y - Math.sin(ang) * 16, s.x, s.y);
      silenceEye(g, col, s.x, s.y, ang, 5.5, 0.9, 1, SILENCE.gore, 1);
    }
    for (const s of this.corruptShots) {
      // The clone throws the copied element's colour, wrapped in Silence's dark.
      g.fillStyle(s.borrowed, 0.28);
      g.fillCircle(s.x, s.y, 11);
      g.fillStyle(this.pcol(SILENCE.void), 0.9);
      g.fillCircle(s.x, s.y, 6);
      g.fillStyle(s.borrowed, 1);
      g.fillCircle(s.x, s.y, 3.4);
    }
  }

  private paintStrikers(
    world: Phaser.GameObjects.Graphics, air: Phaser.GameObjects.Graphics, t: number,
  ): void {
    const now = this.arena.scene.time.now;
    for (const owner of ['player', 'npc'] as Owner[]) {
      const st = this.strikers[owner];
      if (!st) continue;
      const caster = this.fighterOf(owner);
      const col = this.col(owner);
      if (caster.active) {
        SilenceFx.drawStrikerAura(world, col, caster.x, caster.y, st.storedDamage, t,
          caster.forceInvisible ? 0 : caster.alpha);
      }
      for (const e of st.eyes) SilenceFx.drawBoggleEye(air, col, caster.x, caster.y, e.x, e.y, t, 1);

      const sg = st.sanguine;
      if (!sg) continue;
      // The kill box: a marked-out rectangle that fills with dread, then empties as it is used.
      const charging = now < sg.strikeAt;
      const k = charging
        ? Phaser.Math.Clamp((now - sg.castAt) / SANGUINE_CHARGE_MS, 0, 1)
        : sg.slashesLeft / SANGUINE_SLASHES;
      const cos = Math.cos(sg.ang), sin = Math.sin(sg.ang);
      const corner = (lx: number, ly: number): { x: number; y: number } =>
        ({ x: sg.x + lx * cos - ly * sin, y: sg.y + lx * sin + ly * cos });
      const hw = SANGUINE_LEN / 2, hh = SANGUINE_WID / 2;
      const pts = [corner(-hw, -hh), corner(hw, -hh), corner(hw, hh), corner(-hw, hh)];
      world.fillStyle(col(SILENCE.blood), (charging ? 0.1 + k * 0.22 : 0.18) * (charging ? 1 : k));
      world.beginPath();
      world.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < 4; i++) world.lineTo(pts[i].x, pts[i].y);
      world.closePath();
      world.fillPath();
      world.lineStyle(2, col(SILENCE.gore), charging ? 0.5 + 0.4 * Math.sin(t * 14) : 0.6 * k);
      world.strokePath();
      // Fingers standing up along the long edges while it charges — the box is a mouth.
      if (!charging) continue;
      for (let i = 0; i <= 8; i++) {
        for (const side of [-1, 1]) {
          const p = corner(-hw + (i / 8) * SANGUINE_LEN, side * hh);
          clawFingerLayered(world, col, p.x, p.y, sg.ang + side * Math.PI / 2 + Math.PI,
            26 * k, 3, SILENCE.pitch, SILENCE.gore, 0.85 * k, 0.4, false);
        }
      }
    }
  }

  private paintRunArm(g: Phaser.GameObjects.Graphics, time: number, t: number): void {
    const run = this.run;
    if (!run || run.phase !== 'arm') return;
    const caster = this.fighterOf(run.caster);
    const k = Phaser.Math.Clamp(1 - (run.armEnd - time) / RUN_ARM_MS, 0, 1);
    const hx = caster.x + (run.armTx - caster.x) * k;
    const hy = caster.y + (run.armTy - caster.y) * k;
    SilenceFx.drawReachingArm(g, this.col(run.caster), caster.x, caster.y, hx, hy, t, 1, 0.1);
  }

  /**
   * The blob, painted over the mass the fighter texture provides. It is worth the extra layer:
   * the hands on its leading edge grope forward, its eyes track the victim and its maw chews,
   * none of which a stamped texture on a moving sprite can do — and this is the one thing in
   * the element the victim spends fourteen unbroken seconds looking at.
   */
  private paintBlob(g: Phaser.GameObjects.Graphics, t: number): void {
    const run = this.run;
    if (!run || run.phase !== 'chase') return;
    const caster = this.fighterOf(run.caster);
    if (!caster.active) return;
    SilenceFx.drawBlob(g, this.col(run.caster), caster.x, caster.y, 48 * caster.scaleX, t, 1);
  }

  /**
   * The facing pip every fighter wears on a Silence player's screen. Backstabs are the whole
   * click ability, so knowing which way each body is pointed has to be readable at a glance —
   * and an eye that looks where its owner is looking says it better than an arrow would.
   */
  private paintFaceEyes(g: Phaser.GameObjects.Graphics, t: number): void {
    for (const f of this.faceEyes) {
      if (!f.active || f.alpha <= 0.01) continue;
      const r = 26 * (f.sizeMult || 1);
      silenceEye(g, this.pcol,
        f.x + Math.cos(f.facingAngle) * r, f.y + Math.sin(f.facingAngle) * r,
        f.facingAngle, 5, 0.9,
        // Blinks on a per-fighter clock derived from its position — cheap, and never in unison.
        Math.sin(t * 1.3 + f.x * 0.01) > 0.96 ? 0.1 : 1,
        f === this.arena.player ? SILENCE.amethyst : SILENCE.rust, 0.9);
    }
  }

  private paintFleshDecals(g: Phaser.GameObjects.Graphics, t: number): void {
    for (const d of this.fleshDecals) {
      if (d.eye) {
        // Set into puckered flesh, and it opens and closes on its own.
        g.fillStyle(this.pcol(SILENCE.meat), 0.75);
        g.fillCircle(d.x, d.y, 13 * d.s);
        silenceEye(g, this.pcol, d.x, d.y, d.a, 7 * d.s, Math.sin(t * 0.9 + d.x) * 0.9,
          Phaser.Math.Clamp(Math.sin(t * 0.7 + d.y * 0.05) * 2, 0, 1), SILENCE.gore, 0.9);
      } else {
        toothRing(g, this.pcol, d.x, d.y, 13 * d.s, 10, 0.4 + 0.4 * Math.sin(t * 1.6 + d.x * 0.05), 0.85);
      }
    }
  }

  private paintEyeScreen(t: number): void {
    if (this.eyeScreenEyes.length === 0 || !this.eyeScreenRect?.visible) {
      this.layers.get(DEPTH_EYE_SCREEN + 1)?.clear();
      return;
    }
    const g = this.layer(DEPTH_EYE_SCREEN + 1);
    g.clear();
    g.setScrollFactor(0);
    for (const e of this.eyeScreenEyes) {
      // Huge, bloodshot, and none of them blink together.
      const r = 26 * e.s;
      g.fillStyle(this.pcol(SILENCE.sclera), 0.95);
      g.fillEllipse(e.x, e.y, r * 2.1, r * 1.3);
      g.lineStyle(1.2, this.pcol(SILENCE.rust), 0.7);
      for (let i = 0; i < 7; i++) {
        const a = e.a + (i / 7) * Math.PI * 2;
        g.lineBetween(e.x + Math.cos(a) * r * 0.4, e.y + Math.sin(a) * r * 0.25,
          e.x + Math.cos(a) * r, e.y + Math.sin(a) * r * 0.62);
      }
      silenceEye(g, this.pcol, e.x, e.y, e.a, r * 0.62,
        Math.sin(t * 2.2 + e.x * 0.02) * 0.9,
        Math.sin(t * 1.1 + e.y * 0.03) > 0.93 ? 0.15 : 1, SILENCE.rust, 1);
    }
  }

  // ── Auras + rig ────────────────────────────────────────────────────

  /**
   * The persistent tells: what the fog is doing to each Silence user, and what has been done
   * to whoever is on the receiving end. Every one of them is keyed and dropped the frame its
   * condition lapses, so several can stack into one silhouette without leaking.
   */
  private updateAuras(delta: number): void {
    const now = Date.now();
    const live = new Set<string>();
    const run = (id: string, style: SilenceAuraStyle, f: Fighter, tint: SilenceColorFn,
      radius: number, depth: number, intensity: number, angle: number): void => {
      live.add(id);
      const a = this.aura(id, style, tint, radius, depth);
      a.setIntensity(intensity);
      a.setAngle(angle);
      a.update(delta, f.x, f.y, f.forceInvisible ? 0 : f.alpha);
    };

    for (const owner of ['player', 'npc'] as Owner[]) {
      const isSilence = owner === 'player' ? this.playerIsSilence : this.npcIsSilence;
      const f = this.fighterOf(owner);
      if (!isSilence || !f?.active || f.hp <= 0) continue;
      const tint = this.col(owner);
      // Stealth pools at your feet as it charges. Depth 2 — under the terror eyes, so a
      // mastered Silence player in the fog stacks into one silhouette instead of two.
      run(`${owner}-stealth`, 'stealth', f, tint, 26, 2, this.stealth[owner] / STEALTH_MAX, 0);
      if (this.hasTerrorBar(owner)) {
        run(`${owner}-terror`, 'terror', f, tint, 30, 3, this.terror[owner] / TERROR_MAX, 0);
      }
      const st = this.strikers[owner];
      if (st && now < st.allureUntil + 0) {
        run(`${owner}-allure`, 'allure', f, tint, 30, 3, 1, f.facingAngle);
      }
    }

    // Victim-side tells. These ride on whoever is suffering, whichever side put it there.
    const victims: Fighter[] = [this.arena.player, this.arena.npc, ...this.arena.enemies];
    for (const f of victims) {
      if (!f?.active || f.hp <= 0) continue;
      const id = f === this.arena.player ? 'p' : f === this.arena.npc ? 'n' : `e${f.x.toFixed(0)}`;
      const tint = this.pcol;
      if (now < f.silencedUntil) {
        run(`${id}-silenced`, 'silenced', f, tint, 26, 7, 1, f.facingAngle);
      }
      if (now < f.hallucinatingUntil) {
        run(`${id}-halluc`, 'halluc', f, tint, 24, 7, 1, 0);
      }
      const grabbed = this.grabbers.find((g) => g.grab?.victim === f && g.grab.phase === 'dragging');
      if (grabbed) {
        run(`${id}-grabbed`, 'grabbed', f, tint, 24, 7, 1,
          Math.atan2(grabbed.y - f.y, grabbed.x - f.x));
      }
      const possessed = (['player', 'npc'] as Owner[]).some((o) => this.awakened[o]?.host === f);
      if (possessed) run(`${id}-possessed`, 'possessed', f, tint, 22, 7, 1, f.facingAngle);
    }

    for (const id of [...this.auras.keys()]) if (!live.has(id)) this.dropAura(id);
  }

  /** Drive the rig for whichever sides are playing Silence. Built lazily; torn down when they aren't. */
  private updateAvatars(delta: number): void {
    const { player, npc, scene } = this.arena;

    if (this.playerIsSilence && player?.active && player.hp > 0) {
      if (!this.playerAvatar) this.playerAvatar = new SilenceAvatar(scene, this.pcol, 'player');
      const av = this.playerAvatar;
      av.setFacing(player.facingAngle);
      av.setMastered(this.arena.masteryActive);
      av.setStealth(this.stealth.player / STEALTH_MAX);
      av.setTerror(this.hasTerrorBar('player') ? this.terror.player / TERROR_MAX : 0);
      // A striker is visibly bigger and further gone; a blob or a possession is not the rig at all.
      av.setIntensity(this.strikers.player ? 1.4 : 1);
      av.setHold(this.isInvisible('player') ? 'brace' : null, player.facingAngle);
      const hideRig = (this.run?.caster === 'player' && this.run.phase === 'chase')
        || this.awakened.npc?.host === player;
      av.update(delta, player.x, player.y, hideRig ? 0 : player.forceInvisible ? 0 : player.alpha);
    } else if (this.playerAvatar) {
      this.playerAvatar.destroy();
      this.playerAvatar = null;
    }

    if (this.npcIsSilence && npc?.active && npc.hp > 0) {
      if (!this.npcAvatar) this.npcAvatar = new SilenceAvatar(scene, this.ncol, 'npc');
      const av = this.npcAvatar;
      av.setFacing(npc.facingAngle);
      av.setStealth(this.stealth.npc / STEALTH_MAX);
      av.setTerror(this.hasTerrorBar('npc') ? this.terror.npc / TERROR_MAX : 0);
      av.setIntensity(this.strikers.npc ? 1.4 : 1);
      av.setHold(this.isInvisible('npc') ? 'brace' : null, npc.facingAngle);
      const hideRig = (this.run?.caster === 'npc' && this.run.phase === 'chase')
        || this.awakened.player?.host === npc;
      av.update(delta, npc.x, npc.y, hideRig ? 0 : npc.forceInvisible ? 0 : npc.alpha);
    } else if (this.npcAvatar) {
      this.npcAvatar.destroy();
      this.npcAvatar = null;
    }
  }

  // ── Fog & stealth ──────────────────────────────────────────────────

  private hasSilenceUser(): boolean {
    return this.playerIsSilence || this.npcIsSilence;
  }

  /** Whether we simulate this owner's stealth locally (replicas get it over the net). */
  private hasOwnStealthSim(owner: Owner): boolean {
    if (owner === 'player') return this.playerIsSilence;
    return this.npcIsSilence && !this.arena.npc.netGhost;
  }

  isInFog(x: number, y: number): boolean {
    const W = this.arena.width;
    const H = this.arena.height;
    return x < FOG_WIDTH || x > W - FOG_WIDTH || y < FOG_WIDTH || y > H - FOG_WIDTH;
  }

  /**
   * The border fog: the element's home, and the one thing on screen for the whole match. It is
   * repainted every frame rather than stamped once, because a static frame of flat black reads
   * as a letterbox — and this is supposed to read as something you can hide *inside*.
   *
   * Four dense bands at the edge fading inward, boiling lobes crawling along the inner lip, and
   * fingers that occasionally feel their way out of it and withdraw.
   */
  private paintFog(time: number): void {
    if (!this.hasSilenceUser()) {
      this.layers.get(DEPTH_FOG)?.clear();
      return;
    }
    const g = this.layer(DEPTH_FOG);
    g.clear();
    const W = this.arena.width;
    const H = this.arena.height;
    const t = time / 1000;
    const breathe = 0.9 + 0.1 * Math.sin(t * 0.7);

    const bands = 5;
    const w = FOG_WIDTH / bands + 1;
    for (let i = 0; i < bands; i++) {
      const inset = (FOG_WIDTH / bands) * i;
      g.fillStyle(this.pcol(SILENCE.void), 0.55 * (1 - i / bands) * breathe);
      g.fillRect(0, inset, W, w);
      g.fillRect(0, H - inset - w, W, w);
      g.fillRect(inset, 0, w, H);
      g.fillRect(W - inset - w, 0, w, H);
    }

    // The inner lip, boiling. Lobes drift along each edge on their own phase so the four
    // sides never look like the same animation rotated.
    const perEdge = 9;
    for (let e = 0; e < 4; e++) {
      for (let i = 0; i < perEdge; i++) {
        const u = ((i / perEdge) + t * 0.03 * (e % 2 === 0 ? 1 : -1)) % 1;
        const bulge = FOG_WIDTH * (0.85 + 0.3 * Math.sin(t * 0.9 + e * 2.1 + i * 1.7));
        const px = e === 0 || e === 1 ? u * W : e === 2 ? bulge * 0.4 : W - bulge * 0.4;
        const py = e === 0 ? bulge * 0.4 : e === 1 ? H - bulge * 0.4 : u * H;
        fogBank(g, px, py, FOG_WIDTH * 0.5, e * 1.9 + i, t, this.pcol(SILENCE.void), 0.34, 5);
      }
    }

    // Every so often something in there reaches out, thinks better of it, and pulls back.
    for (let e = 0; e < 4; e++) {
      const phase = (t * 0.22 + e * 0.25) % 1;
      if (phase > 0.45) continue;
      const reach = Math.sin((phase / 0.45) * Math.PI);
      const u = (Math.sin(e * 7.3 + Math.floor(t * 0.22 + e * 0.25) * 2.7) * 0.5 + 0.5);
      const inward = e === 0 ? Math.PI / 2 : e === 1 ? -Math.PI / 2 : e === 2 ? 0 : Math.PI;
      const px = e === 0 || e === 1 ? u * W : e === 2 ? FOG_WIDTH * 0.8 : W - FOG_WIDTH * 0.8;
      const py = e === 0 ? FOG_WIDTH * 0.8 : e === 1 ? H - FOG_WIDTH * 0.8 : u * H;
      for (let f = 0; f < 3; f++) {
        clawFingerLayered(g, this.pcol, px, py, inward + (f - 1) * 0.32,
          52 * reach, 4, SILENCE.void, SILENCE.violet, 0.7 * reach, 0.45);
      }
    }
  }

  private updateStealth(owner: Owner, dt: number): void {
    if (!this.hasOwnStealthSim(owner)) return;
    const f = this.fighterOf(owner);
    if (!f.active || f.hp <= 0) return;
    const stalkerCount = this.stalkersAlive(owner);
    if (this.isInFog(f.x, f.y)) {
      // Mastery: a corrupted copy of the enemy walking around costs you the fog entirely.
      if (this.corrupts.some((c) => c.owner === owner)) return;
      this.stealth[owner] = Math.min(STEALTH_MAX, this.stealth[owner] + STEALTH_GAIN_PER_S * (1 + STALKER_RATE_BONUS * stalkerCount) * dt);
    } else {
      // Mastery — Weep: unwatched, you bleed stealth 25% slower.
      const weep = owner === 'player' && this.weepUnwatched ? WEEP_DRAIN_MULT : 1;
      this.stealth[owner] = Math.max(0, this.stealth[owner] - STEALTH_DRAIN_PER_S * weep * Math.max(0, 1 - STALKER_RATE_BONUS * stalkerCount) * dt);
    }
  }

  private renderInvisibility(owner: Owner): void {
    const f = this.fighterOf(owner);
    if (!f || !f.active) return;
    if (owner === 'player') {
      if (!this.playerIsSilence) return;
      const invis = this.isInvisible('player');
      f.forceInvisible = invis;
      // On your own screen you stay faintly visible.
      f.setAlpha(invis ? 0.35 : 1);
      return;
    }
    if (!this.npcIsSilence || f.netGhost) return; // replica handled by OnlineKit
    const invis = this.isInvisible('npc');
    f.forceInvisible = invis;
    f.setAlpha(invis ? 0 : 1);
    f.setHealthBarVisible(!invis);
  }

  // ── Facing + eye indicators ────────────────────────────────────────

  private updateFacing(): void {
    if (!this.hasSilenceUser()) return;
    const scene = this.arena.scene;
    const player = this.arena.player;
    const pointer = scene.input.activePointer;
    if (player.active) {
      player.facingAngle = Math.atan2(pointer.worldY - player.y, pointer.worldX - player.x);
    }
    const npc = this.arena.npc;
    if (npc.active && !npc.netGhost) {
      const body = npc.body as Phaser.Physics.Arcade.Body | null;
      if (body && (Math.abs(body.velocity.x) > 5 || Math.abs(body.velocity.y) > 5)) {
        npc.facingAngle = Math.atan2(body.velocity.y, body.velocity.x);
      }
    }
    for (const e of this.arena.enemies) {
      if (!e.active) continue;
      const body = e.body as Phaser.Physics.Arcade.Body | null;
      if (body && (Math.abs(body.velocity.x) > 5 || Math.abs(body.velocity.y) > 5)) {
        e.facingAngle = Math.atan2(body.velocity.y, body.velocity.x);
      }
    }
  }

  /** Rebuild the list of fighters wearing a facing pip. `paintFaceEyes` draws them. */
  private updateFaceEyes(): void {
    this.faceEyes.length = 0;
    if (!this.playerIsSilence) return;
    for (const f of [this.arena.player, this.arena.npc, ...this.arena.enemies]) {
      if (!f || !f.active || f.hp <= 0) continue;
      this.faceEyes.push(f);
    }
  }

  // ── Stalkers ───────────────────────────────────────────────────────

  private updateStalkers(time: number, dt: number): void {
    for (let i = this.stalkers.length - 1; i >= 0; i--) {
      const s = this.stalkers[i];
      const maturity = Phaser.Math.Clamp((time - s.bornAt) / STALKER_MATURE_MS, 0, 1);

      // Seekers fly around randomly, dragging their gaze cone with them.
      if (s.kind === 'seeker') {
        if (time >= s.nextTurnAt) {
          s.nextTurnAt = time + SEEKER_TURN_EVERY_MS * (0.6 + Math.random() * 0.8);
          s.heading = Math.random() * Math.PI * 2;
        }
        if (time >= s.pinnedUntil) {
          s.x = Phaser.Math.Clamp(s.x + Math.cos(s.heading) * SEEKER_SPEED * dt, 30, this.arena.width - 30);
          s.y = Phaser.Math.Clamp(s.y + Math.sin(s.heading) * SEEKER_SPEED * dt, 30, this.arena.height - 30);
        }
        this.checkGazeCone(s.x, s.y, s.heading, s.owner);
      }

      // The reminder pulse on everyone's screen: the eye snaps wide open, stares, and shuts.
      if (time >= s.nextPulseAt) {
        s.nextPulseAt = time + STALKER_PULSE_MS;
        this.fx(s.owner).watchPulse(s.x, s.y, 14 + maturity * 8,
          maturity > 0.7 ? SILENCE.gore : SILENCE.rust, DEPTH_EYE, 900);
      }

      // Projectile hits (enemy projectiles for player stalkers and vice versa).
      // Watchers die in one shot; seekers soak SEEKER_HITS.
      const wantFromPlayer = s.owner === 'npc';
      for (const go of this.arena.projectiles.getChildren() as Projectile[]) {
        if (!go.active || go.isFromPlayer !== wantFromPlayer) continue;
        if (Phaser.Math.Distance.Between(go.x, go.y, s.x, s.y) <= STALKER_RADIUS + 10) {
          go.setActive(false).setVisible(false);
          (go.body as Phaser.Physics.Arcade.Body).stop();
          this.damageStalker(i);
          break;
        }
      }
    }
  }

  /** One hit landed on a stalker/seeker: seekers flash and soak, watchers die outright. */
  private damageStalker(index: number): void {
    const s = this.stalkers[index];
    s.hitsLeft--;
    if (s.hitsLeft > 0) {
      s.hitFlashUntil = this.arena.scene.time.now + 90;
      this.fx(s.owner).claws(s.x, s.y, 3, {
        speed: 130, size: 10, life: 300, depth: DEPTH_EYE, color: SILENCE.pitch,
      });
      this.arena.showFloatingText(s.x, s.y - 18, `👁 ${s.hitsLeft} left`, '#aa88bb');
      return;
    }
    this.killStalker(index);
  }

  private killStalker(index: number): void {
    const s = this.stalkers[index];
    this.stalkers.splice(index, 1);
    // The eye bursts and the fog that was holding it together comes apart.
    const fx = this.fx(s.owner);
    fx.flash(s.x, s.y, 14, DEPTH_EYE, SILENCE.sclera);
    fx.claws(s.x, s.y, 6, { speed: 170, size: 12, life: 400, depth: DEPTH_EYE, color: SILENCE.pitch });
    fx.motes(s.x, s.y, 6, { speed: 90, size: 5, life: 520, depth: DEPTH_STALKER, color: SILENCE.void });
    this.arena.showFloatingText(s.x, s.y - 18, '👁 destroyed', '#aa88bb');
  }

  // ── Gaze cones (seekers + vultures) ────────────────────────────────

  private coneContains(cx: number, cy: number, heading: number, f: Fighter): boolean {
    const d = Phaser.Math.Distance.Between(cx, cy, f.x, f.y);
    if (d > SEEKER_CONE_LEN) return false;
    const ang = Math.atan2(f.y - cy, f.x - cx);
    return Math.abs(Phaser.Math.Angle.Wrap(ang - heading)) <= SEEKER_CONE_HALF_RAD;
  }

  /**
   * Apply panic to foes caught in a gaze cone. Only locally-simulated victims:
   * a PvP net ghost's own machine runs this same cone check against its local
   * player (seeker wander diverges between sims, so the victim's view rules —
   * the resulting panic comes back over the 'sil' panic message).
   */
  private checkGazeCone(cx: number, cy: number, heading: number, owner: Owner): void {
    const now = Date.now();
    for (const foe of this.foesOf(owner)) {
      if (!foe.active || foe.hp <= 0) continue;
      if (foe === this.arena.npc && foe.netGhost) continue;
      if (now < foe.panickedUntil) continue; // already panicking — no re-trigger spam
      if (!this.coneContains(cx, cy, heading, foe)) continue;
      this.applyStatus(foe, { k: 'panic', ms: PANIC_MS });
      this.arena.showFloatingText(foe.x, foe.y - 36, '👁 PANIC', '#ff2233');
      if (foe === this.arena.player && this.arena.isOnline) {
        this.arena.sendSilenceMsg({ t: 'sil', k: 'panic', ms: PANIC_MS });
      }
    }
  }

  // ── Rituals ────────────────────────────────────────────────────────

  private updateRituals(time: number): void {
    for (let i = this.rituals.length - 1; i >= 0; i--) {
      const r = this.rituals[i];
      if (time < r.strikeAt) continue;
      this.rituals.splice(i, 1);
      this.strikeRitual(r);
    }
  }

  private strikeRitual(r: RitualCircle): void {
    const fx = this.fx(r.owner);

    // Mastery — Puppetmaster: a ritual laid over your own effigy spares the doll and
    // wakes what is wearing the enemy instead. Nothing else in the circle resolves —
    // which is why the victim's sim has to recognise it too, or their replay of this
    // same ritual would land 25 damage the caster's screen never showed.
    const ownDoll = this.dolls[r.owner];
    if (ownDoll && !this.awakened[r.owner]
      && Phaser.Math.Distance.Between(ownDoll.x, ownDoll.y, r.x, r.y) <= RITUAL_RADIUS) {
      // A pale column instead of a red one — this ritual gives rather than takes.
      fx.beam(r.x, r.y, RITUAL_RADIUS * 0.5, { color: SILENCE.pale, duration: 540 });
      // The awakening itself is only ever begun by the machine doing the possessing;
      // the other side gets an explicit 'awaken' message so both agree on the moment.
      if (r.owner === 'player') this.beginAwakened('player');
      return;
    }

    // The column comes down as a hand and lands as a rupture.
    fx.beam(r.x, r.y, RITUAL_RADIUS * 0.55);
    fx.rupture(r.x, r.y, RITUAL_RADIUS, { bloody: true, claws: 10, rings: 2, duration: 480 });
    this.arena.scene.cameras.main.shake(220, 0.005);

    const dmg = Math.round(RITUAL_DMG * (1 + STALKER_DMG_BONUS * this.stalkersAlive(r.owner)));
    for (const foe of this.foesOf(r.owner)) {
      if (!foe.active || foe.hp <= 0) continue;
      if (Phaser.Math.Distance.Between(foe.x, foe.y, r.x, r.y) > RITUAL_RADIUS + 20) continue;
      foe.takeDamage(dmg);
      this.applyStatus(foe, { k: 'silence', ms: RITUAL_SILENCE_MS });
      this.arena.spawnHitFlash(foe.x, foe.y, 0xff1133);
      this.arena.showFloatingText(foe.x, foe.y - 38, '🤫 SILENCED', '#ff5566');
      // Torture perk: the beam leaves hooks in whoever it found.
      if (this.arena.hasPerk(r.owner, 'torture')) this.rackVictim(foe, r.owner);
    }

    // A fully-matured stalker in the circle ascends — watchers become
    // Grabbers, seekers (E+ Mutant) become Vultures.
    const now = this.arena.scene.time.now;
    for (let i = this.stalkers.length - 1; i >= 0; i--) {
      const s = this.stalkers[i];
      if (s.owner !== r.owner) continue;
      if (now - s.bornAt < STALKER_MATURE_MS) continue;
      if (Phaser.Math.Distance.Between(s.x, s.y, r.x, r.y) > RITUAL_RADIUS) continue;
      if (s.kind === 'seeker') this.spawnVulture(s.x, s.y, r.owner);
      else this.spawnGrabber(s.x, s.y, r.owner);
      this.stalkers.splice(i, 1);
      break;
    }
  }

  // ── Torture perk: the rack ─────────────────────────────────────────

  /**
   * Hook a victim onto the rack, or tighten the one already in them. Re-ritualling a
   * racked victim is the only way to stack it, so the perk rewards patience over burst.
   */
  private rackVictim(target: Fighter, owner: Owner): void {
    const now = this.arena.scene.time.now;
    const existing = this.racks.find((k) => k.target === target && k.owner === owner);
    if (existing) {
      existing.until = now + TORTURE_MS;
      if (existing.stacks < TORTURE_MAX_STACKS) {
        existing.stacks++;
        this.arena.showFloatingText(target.x, target.y - 56, `⛓️ RACK ×${existing.stacks}`, '#ff3355');
      }
      return;
    }
    this.racks.push({
      target, owner, stacks: 1,
      until: now + TORTURE_MS,
      nextTickAt: now + TORTURE_TICK_MS,
      seed: Math.random() * Math.PI * 2,
    });
    this.arena.showFloatingText(target.x, target.y - 56, '⛓️ TORTURED', '#ff3355');
  }

  private updateRacks(time: number): void {
    for (let i = this.racks.length - 1; i >= 0; i--) {
      const k = this.racks[i];
      const t = k.target;
      if (!t.active || t.hp <= 0 || time >= k.until) {
        this.racks.splice(i, 1);
        continue;
      }
      if (time < k.nextTickAt) continue;
      k.nextTickAt += TORTURE_TICK_MS;
      const dps = TORTURE_BASE_DPS + TORTURE_STACK_DPS * (k.stacks - 1);
      t.takeDamage(dps);
      // The point of the rack: it keeps them quiet for longer than the ritual alone would.
      this.applyStatus(t, { k: 'silence', ms: TORTURE_SILENCE_PER_TICK_MS });
      this.arena.spawnHitFlash(t.x, t.y, 0xcc1133);
    }
  }

  /**
   * Chains dragged taut from the victim out to four hooks planted in the floor, sagging
   * and jerking on the tick. More stacks means more hooks biting and a redder pull.
   */
  private paintRacks(world: Phaser.GameObjects.Graphics, air: Phaser.GameObjects.Graphics, t: number): void {
    const now = this.arena.scene.time.now;
    for (const k of this.racks) {
      const target = k.target;
      if (!target.active || target.hp <= 0) continue;
      const col = this.col(k.owner);
      // Fresh off a tick the chains snap tight, then sag again over the second.
      const sinceTick = Phaser.Math.Clamp((now - (k.nextTickAt - TORTURE_TICK_MS)) / TORTURE_TICK_MS, 0, 1);
      const jerk = 1 - sinceTick;
      const hooks = 2 + k.stacks;
      const reach = 46 + 8 * k.stacks;

      for (let h = 0; h < hooks; h++) {
        const ang = k.seed + (h / hooks) * Math.PI * 2 + Math.sin(t * 0.7 + h) * 0.12;
        const slack = (1 - jerk) * 7;
        const ax = target.x + Math.cos(ang) * reach;
        const ay = target.y + Math.sin(ang) * reach;
        // The chain: links stepped along the span, drooping in the middle when slack.
        const links = 6;
        for (let l = 0; l <= links; l++) {
          const f = l / links;
          const droop = Math.sin(f * Math.PI) * slack;
          const lx = target.x + (ax - target.x) * f + Math.cos(ang + Math.PI / 2) * droop;
          const ly = target.y + (ay - target.y) * f + Math.sin(ang + Math.PI / 2) * droop + droop * 0.4;
          world.fillStyle(col(l % 2 === 0 ? SILENCE.bone : SILENCE.rust), 0.55 + 0.3 * jerk);
          world.fillCircle(lx, ly, 2.1 - f * 0.5);
        }
        // The hook itself, bitten into the ground and straining outward.
        world.lineStyle(2, col(SILENCE.gore), 0.6 + 0.3 * jerk);
        world.beginPath();
        world.moveTo(ax, ay);
        world.lineTo(ax + Math.cos(ang) * 7, ay + Math.sin(ang) * 7 - 3);
        world.strokePath();
        world.fillStyle(col(SILENCE.blood), 0.5);
        world.fillCircle(ax, ay, 3 + jerk * 1.5);
      }

      // A wet ring where the hooks all pull toward at once.
      air.lineStyle(1.5, col(SILENCE.gore), 0.25 + 0.35 * jerk);
      air.strokeCircle(target.x, target.y, 20 + jerk * 6);
    }
  }

  // ── Grabbers ───────────────────────────────────────────────────────

  private spawnGrabber(x: number, y: number, owner: Owner): void {
    const scene = this.arena.scene;
    this.grabbers.push({
      x, y, owner,
      seed: Math.random() * Math.PI * 2,
      bornAt: scene.time.now,
      expiresAt: scene.time.now + GRABBER_LIFETIME_MS,
      nextGrabAt: scene.time.now + GRABBER_FIRST_GRAB_MS,
      grab: null,
    });
    // It swells up out of the watcher — every eye it has snapping open at once.
    const fx = this.fx(owner);
    fx.rupture(x, y, 70, { claws: 9, rings: 2, duration: 520, mark: false });
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      fx.watchPulse(x + Math.cos(a) * 12, y + Math.sin(a) * 12, 6, SILENCE.gore, DEPTH_EYE, 700);
    }
    this.arena.showFloatingText(x, y - 30, 'IT GRABS NOW', '#ff2244');
    scene.cameras.main.shake(250, 0.004);
    if (owner === 'player') this.arena.recordMasteryStat('grabbers', 1);
  }

  private updateGrabbers(time: number, delta: number): void {
    void delta;
    for (let i = this.grabbers.length - 1; i >= 0; i--) {
      const g = this.grabbers[i];

      if (time >= g.expiresAt && !g.grab) {
        this.fx(g.owner).motes(g.x, g.y, 8, {
          speed: 50, size: 8, life: 520, depth: DEPTH_STALKER, color: SILENCE.void, drift: 6,
        });
        this.grabbers.splice(i, 1);
        continue;
      }

      if (!g.grab && time >= g.nextGrabAt) this.startGrab(g, time);
      if (g.grab) this.updateGrab(g, time);
    }
  }

  private startGrab(g: Grabber, time: number): void {
    const foes = this.foesOf(g.owner).filter((f) => f.active && f.hp > 0 && !f.downed);
    if (foes.length === 0) { g.nextGrabAt = time + 3000; return; }
    // Nearest foe — arena-wide reach.
    let victim = foes[0];
    let best = Number.MAX_VALUE;
    for (const f of foes) {
      const d = Phaser.Math.Distance.Between(f.x, f.y, g.x, g.y);
      if (d < best) { best = d; victim = f; }
    }
    const victimIsLocalPlayer = victim === this.arena.player;
    g.grab = {
      victim,
      phase: 'reaching',
      phaseEnd: time + 450,
      botEscapes: !victimIsLocalPlayer && Math.random() < GRAB_BOT_ESCAPE_CHANCE,
      escapePresses: 0,
      escaped: false,
    };
    g.nextGrabAt = time + GRABBER_GRAB_EVERY_MS;
    if (victimIsLocalPlayer) {
      this.arena.showFloatingText(victim.x, victim.y - 40, '✋ GRABBED — SPAM SPACE!', '#ff4455');
    }
  }

  private updateGrab(g: Grabber, time: number): void {
    const grab = g.grab!;
    const victim = grab.victim;
    if (!victim.active || victim.hp <= 0) { this.finishGrab(g); return; }

    // The arm itself is painted by paintGrabbers, off this same grab state.
    if (grab.phase === 'reaching') {
      if (time >= grab.phaseEnd) {
        grab.phase = 'dragging';
        grab.phaseEnd = time + GRABBER_DRAG_WINDOW_MS;
      }
      return;
    }

    // Dragging.
    const isLocalPlayer = victim === this.arena.player;
    if (isLocalPlayer) {
      // Count escape mashes.
      if (Phaser.Input.Keyboard.JustDown(this.arena.spaceKey)) {
        grab.escapePresses++;
        if (grab.escapePresses >= GRAB_ESCAPE_PRESSES) {
          grab.escaped = true;
          this.arena.showFloatingText(victim.x, victim.y - 30, 'BROKE FREE!', '#88ff88');
          this.finishGrab(g);
          return;
        }
      }
      this.arena.setPlayerYankUntil(this.arena.scene.time.now + 60);
    } else if (grab.botEscapes && time >= grab.phaseEnd - GRABBER_DRAG_WINDOW_MS + 900) {
      // Bots that win their roll shake loose early.
      this.arena.showFloatingText(victim.x, victim.y - 26, 'broke free', '#88ff88');
      this.finishGrab(g);
      return;
    }
    if (victim === this.arena.npc) this.npcLockUntil = Math.max(this.npcLockUntil, this.arena.scene.time.now + 60);

    // Reel the victim in. Online replicas aren't force-dragged — their own
    // machine runs the authoritative grab and streams the resulting position.
    const ang = Math.atan2(g.y - victim.y, g.x - victim.x);
    const body = victim.body as Phaser.Physics.Arcade.Body | null;
    if (body && !victim.knockbackImmune && !victim.netGhost) {
      body.setVelocity(Math.cos(ang) * GRABBER_DRAG_SPEED, Math.sin(ang) * GRABBER_DRAG_SPEED);
    }

    const dist = Phaser.Math.Distance.Between(victim.x, victim.y, g.x, g.y);
    if (dist <= GRABBER_CATCH_DIST || time >= grab.phaseEnd) {
      // Caught: damage + permanent slow-down of everything they do.
      victim.takeDamage(GRABBER_DMG);
      this.applyStatus(victim, { k: 'atkslow', mult: GRABBER_CD_PENALTY });
      this.arena.spawnHitFlash(victim.x, victim.y, 0xff1133);
      this.arena.showFloatingText(victim.x, victim.y - 42, '💀 CONSUMED — 20% SLOWER FOREVER', '#ff2244');
      this.arena.scene.cameras.main.shake(300, 0.006);
      // The hand closes: a bloody rupture where the victim was pulled in.
      this.fx(g.owner).rupture(victim.x, victim.y, 60, { bloody: true, claws: 10, rings: 2, duration: 520 });
      this.finishGrab(g);
    }
  }

  private finishGrab(g: Grabber): void {
    g.grab = null;
  }

  // ── Vultures (E+ Mutant) ───────────────────────────────────────────

  private spawnVulture(x: number, y: number, owner: Owner): void {
    const scene = this.arena.scene;
    this.vultures.push({
      x, y, owner,
      seed: Math.random() * Math.PI * 2,
      expiresAt: scene.time.now + VULTURE_LIFETIME_MS,
      nextCarryAt: scene.time.now + VULTURE_FIRST_CARRY_MS,
      heading: Math.random() * Math.PI * 2,
      nextTurnAt: 0,
      carry: null,
    });
    // Wings tearing open on both sides, and the grin arriving with them.
    const fx = this.fx(owner);
    for (const side of [-1, 1]) {
      fx.claws(x + side * 10, y, 6, {
        angle: side > 0 ? 0 : Math.PI, spread: 0.8, speed: 230, size: 24,
        life: 520, depth: DEPTH_STALKER + 2, color: SILENCE.void,
      });
    }
    fx.rupture(x, y, 64, { claws: 0, rings: 2, duration: 460, mark: false });
    this.arena.showFloatingText(x, y - 30, 'IT SMILES', '#ff2244');
    scene.cameras.main.shake(250, 0.004);
  }

  private updateVultures(time: number, dt: number): void {
    for (let i = this.vultures.length - 1; i >= 0; i--) {
      const v = this.vultures[i];
      if (time >= v.expiresAt && !v.carry) {
        this.fx(v.owner).motes(v.x, v.y, 6, {
          speed: 60, size: 6, life: 480, depth: DEPTH_STALKER, color: SILENCE.void,
        });
        this.vultures.splice(i, 1);
        continue;
      }

      if (v.carry) {
        this.updateVultureCarry(v, time);
        continue;
      }

      // Wander like a seeker, gaze cone leading the way.
      if (time >= v.nextTurnAt) {
        v.nextTurnAt = time + SEEKER_TURN_EVERY_MS * (0.6 + Math.random() * 0.8);
        v.heading = Math.random() * Math.PI * 2;
      }
      v.x = Phaser.Math.Clamp(v.x + Math.cos(v.heading) * VULTURE_SPEED * dt, 30, this.arena.width - 30);
      v.y = Phaser.Math.Clamp(v.y + Math.sin(v.heading) * VULTURE_SPEED * dt, 30, this.arena.height - 30);

      // Carry detection — position authority stays with the victim's machine,
      // so net ghosts (PvP replicas, co-op husk replicas) are never grabbed here.
      if (time < v.nextCarryAt) continue;
      for (const foe of this.foesOf(v.owner)) {
        if (!foe.active || foe.hp <= 0 || foe.downed || foe.netGhost) continue;
        if (!this.coneContains(v.x, v.y, v.heading, foe)) continue;
        v.carry = {
          victim: foe,
          phase: 'up',
          phaseEnd: time + VULTURE_CARRY_UP_MS,
          fromX: foe.x,
          fromY: foe.y,
          holdX: Phaser.Math.Clamp(foe.x, 80, this.arena.width - 80),
          holdY: -140,
        };
        // World bounds would pin the victim on-screen mid-abduction.
        (foe.body as Phaser.Physics.Arcade.Body | null)?.setCollideWorldBounds(false);
        v.nextCarryAt = time + VULTURE_CARRY_EVERY_MS;
        this.arena.showFloatingText(foe.x, foe.y - 40, '🦅 TAKEN', '#ff2244');
        this.arena.scene.cameras.main.shake(200, 0.005);
        break;
      }
    }
  }

  private updateVultureCarry(v: Vulture, time: number): void {
    const carry = v.carry!;
    const victim = carry.victim;
    if (!victim.active || victim.hp <= 0) {
      v.carry = null;
      (victim.body as Phaser.Physics.Arcade.Body | null)?.setCollideWorldBounds(true);
      return;
    }

    // The victim dangles from the vulture — both are position-driven.
    const place = (x: number, y: number): void => {
      v.x = x;
      v.y = y - 26;
      (victim.body as Phaser.Physics.Arcade.Body | null)?.reset(x, y);
    };
    if (victim === this.arena.player) this.arena.setPlayerYankUntil(this.arena.scene.time.now + 60);
    else if (victim === this.arena.npc) this.npcLockUntil = Math.max(this.npcLockUntil, this.arena.scene.time.now + 60);

    if (carry.phase === 'up') {
      const t = 1 - Math.max(0, (carry.phaseEnd - time) / VULTURE_CARRY_UP_MS);
      place(carry.fromX + (carry.holdX - carry.fromX) * t, carry.fromY + (carry.holdY - carry.fromY) * t);
      if (time >= carry.phaseEnd) {
        carry.phase = 'hold';
        carry.phaseEnd = time + VULTURE_CARRY_HOLD_MS;
      }
      return;
    }
    if (carry.phase === 'hold') {
      place(carry.holdX, carry.holdY);
      if (time >= carry.phaseEnd) {
        carry.phase = 'down';
        carry.phaseEnd = time + VULTURE_CARRY_DOWN_MS;
      }
      return;
    }
    // down
    const t = 1 - Math.max(0, (carry.phaseEnd - time) / VULTURE_CARRY_DOWN_MS);
    place(carry.holdX + (carry.fromX - carry.holdX) * t, carry.holdY + (carry.fromY - carry.holdY) * t);
    if (time < carry.phaseEnd) return;

    // Drop: the victim comes back wrong.
    v.carry = null;
    (victim.body as Phaser.Physics.Arcade.Body | null)?.setCollideWorldBounds(true);
    victim.takeDamage(VULTURE_DROP_DMG);
    this.applyBloodDecals(victim);
    this.arena.spawnHitFlash(victim.x, victim.y, 0x991122);
    this.arena.showFloatingText(victim.x, victim.y - 42, '🦅 DROPPED', '#ff2244');
    this.arena.scene.cameras.main.shake(300, 0.006);
    // They land hard, and they land wet.
    this.fx(v.owner).rupture(victim.x, victim.y, 56, { bloody: true, claws: 8, rings: 2, duration: 480 });
    if (victim === this.arena.player && this.arena.isOnline) {
      this.arena.sendSilenceMsg({ t: 'sil', k: 'vulture-drop', x: victim.x, y: victim.y });
    }
  }

  // ── Blood (vulture drops) ──────────────────────────────────────────

  applyBloodDecals(target: Fighter): void {
    const scene = this.arena.scene;
    for (let i = 0; i < 8; i++) {
      this.bloodDecals.push({
        target,
        ox: Phaser.Math.Between(-16, 16),
        oy: Phaser.Math.Between(-18, 14),
        r: 3.5 + Math.random() * 4,
        seed: Math.random() * Math.PI * 2,
        until: scene.time.now + BLOOD_DECAL_MS,
      });
    }
  }

  private updateBloodDecals(time: number): void {
    for (let i = this.bloodDecals.length - 1; i >= 0; i--) {
      const b = this.bloodDecals[i];
      if (time >= b.until || !b.target.active) {
        this.bloodDecals.splice(i, 1);
        continue;
      }
      // Still fresh — some of it runs off onto the floor and stays there.
      if (Math.random() < 0.02) {
        this.pfx.stain(b.target.x + b.ox, b.target.y + b.oy + 14, b.r * 0.6, DEPTH_GROUND_FX, true);
      }
    }
  }

  // ── Terror + Striker (R+ Night Terror) ─────────────────────────────

  /**
   * Terror accrues for anyone running Night Terror — and, since Puppetmaster is priced in
   * terror, for a mastered Silence player whether or not they bought the R+ upgrade.
   */
  private hasTerrorBar(owner: Owner): boolean {
    return this.arena.hasUpgrade(owner, 'r') || (owner === 'player' && this.arena.masteryActive);
  }

  private updateTerror(owner: Owner, dt: number): void {
    if (!this.hasOwnStealthSim(owner)) return;
    if (!this.hasTerrorBar(owner)) return;
    if (this.strikers[owner]) return; // no farming terror while transformed
    const now = Date.now();
    let afflicted = 0;
    for (const foe of this.foesOf(owner)) {
      if (!foe.active || foe.hp <= 0) continue;
      if (now < foe.silencedUntil || now < foe.panickedUntil || now < foe.hallucinatingUntil) afflicted++;
    }
    if (afflicted === 0) return;
    const before = this.terror[owner];
    this.terror[owner] = Math.min(TERROR_MAX, before + afflicted * dt);
    if (before < TERROR_MAX && this.terror[owner] >= TERROR_MAX && this.arena.hasUpgrade(owner, 'r')) {
      const caster = this.fighterOf(owner);
      this.arena.showFloatingText(caster.x, caster.y - 36, '🐺 TERROR FULL — RITUAL YOURSELF', '#ff2233');
    }
  }

  private beginStriker(owner: Owner, replica: boolean): void {
    if (this.strikers[owner]) return;
    const scene = this.arena.scene;
    const caster = this.fighterOf(owner);
    if (!caster.active) return;
    this.terror[owner] = 0;
    const st: StrikerState = {
      endsAt: scene.time.now + STRIKER_BASE_MS,
      storedDamage: 0,
      allureUntil: 0,
      boggleReadyAt: 0,
      boggleUntil: 0,
      eyes: [],
      sanguine: null,
      prevTexture: caster.texture.key,
      prevScale: caster.scaleX,
      prevAbsorber: caster.damageAbsorber ?? null,
      replica,
    };
    this.strikers[owner] = st;
    caster.setTexture('silence-striker');
    caster.setScale(1.25);
    scene.cameras.main.shake(350, 0.008);
    scene.cameras.main.flash(180, 30, 0, 0);
    // The transformation: the old body comes apart and the claws arrive through it.
    const fx = this.fx(owner);
    fx.rupture(caster.x, caster.y, 90, { bloody: true, claws: 14, rings: 3, duration: 620, mark: false });
    fx.claws(caster.x, caster.y, 10, {
      speed: 110, size: 34, life: 700, depth: DEPTH_EYE, color: SILENCE.void,
    });
    this.arena.showFloatingText(caster.x, caster.y - 46, '🐺 THE STRIKER', '#ff2233');
    if (!replica) {
      // The striker moveset shares the base ability slots — start it fresh so a
      // recently-used Run/Feast doesn't lock Sanguine/Retreat for the whole form.
      for (const id of ['silence-stab', 'silence-watch', 'silence-ritual', 'silence-feast', 'silence-run']) {
        caster.reduceCooldown(id, 120000);
      }
      // Every hit is deferred until the form drops — then it lands all at once.
      caster.damageAbsorber = (amount: number) => {
        const cur = this.strikers[owner];
        if (!cur) return false;
        const stored = amount * (this.arena.scene.time.now < cur.allureUntil ? ALLURE_RESIST_MULT : 1);
        cur.storedDamage += stored;
        cur.endsAt -= stored * STRIKER_SHRINK_MS_PER_DMG;
        return true;
      };
      if (owner === 'player' && this.arena.isOnline) {
        this.arena.sendSilenceMsg({ t: 'sil', k: 'striker', on: true });
      }
    }
  }

  /** Drop the striker form. `silent` skips the deferred-damage burst (match reset). */
  private endStriker(owner: Owner, silent = false): void {
    const st = this.strikers[owner];
    if (!st) return;
    this.strikers[owner] = null;
    const caster = this.fighterOf(owner);
    st.eyes = [];
    st.sanguine = null;
    if (caster.active) {
      caster.setTexture(st.prevTexture);
      caster.setScale(st.prevScale);
    }
    if (owner === 'player') {
      this.strikerTimerText?.destroy();
      this.strikerTimerText = null;
    }
    if (st.replica) return;
    caster.damageAbsorber = st.prevAbsorber;
    if (owner === 'player' && this.arena.isOnline) {
      this.arena.sendSilenceMsg({ t: 'sil', k: 'striker', on: false });
    }
    const burst = Math.round(st.storedDamage * STRIKER_BURST_MULT);
    if (!silent && burst > 0 && caster.active) {
      // Fully lethal — reckless striker play settles its account here.
      caster.takeDamage(burst);
      this.arena.spawnHitFlash(caster.x, caster.y, 0xff1133);
      this.arena.showFloatingText(caster.x, caster.y - 46, `💥 ${burst} DEFERRED DAMAGE`, '#ff2244');
      this.arena.scene.cameras.main.shake(300, 0.007);
      // The bill comes due all at once, and it scales with what was held back.
      const r = 50 + Math.min(90, burst);
      this.fx(owner).rupture(caster.x, caster.y, r, {
        bloody: true, claws: 8 + Math.round(burst / 8), rings: 3, duration: 520 + burst * 3,
      });
    }
  }

  /** Striker damage dealt extends the transformation (+1s per 5 dmg). */
  private grantStrikerTime(owner: Owner, dmg: number): void {
    const st = this.strikers[owner];
    if (st && !st.replica) st.endsAt += dmg * STRIKER_EXTEND_MS_PER_DMG;
  }

  private updateStriker(owner: Owner, time: number, dt: number): void {
    void dt;
    const st = this.strikers[owner];
    if (!st) return;
    const caster = this.fighterOf(owner);
    if (!caster.active || caster.hp <= 0) { this.endStriker(owner, true); return; }
    if (!st.replica && time >= st.endsAt) { this.endStriker(owner); return; }

    // Allure: locally-simulated foes are compelled to walk into the claws.
    if (time < st.allureUntil) {
      for (const foe of this.foesOf(owner)) {
        if (!foe.active || foe.hp <= 0 || foe.netGhost) continue;
        const ang = Math.atan2(caster.y - foe.y, caster.x - foe.x);
        (foe.body as Phaser.Physics.Arcade.Body | null)
          ?.setVelocity(Math.cos(ang) * foe.speed, Math.sin(ang) * foe.speed);
        if (foe === this.arena.player) this.arena.setPlayerYankUntil(this.arena.scene.time.now + 60);
        else if (foe === this.arena.npc) this.npcLockUntil = Math.max(this.npcLockUntil, this.arena.scene.time.now + 60);
      }
    }

    // Boggle eyes: orbit on fleshy strings, shoot, retreat when hit.
    if (st.eyes.length > 0) {
      if (time >= st.boggleUntil) {
        for (const e of st.eyes) {
          this.fx(owner).motes(e.x, e.y, 2, { speed: 30, size: 3, life: 280, depth: DEPTH_EYE, color: SILENCE.meat });
        }
        st.eyes = [];
      } else {
        this.updateBoggleEyes(st, caster, owner, time);
      }
    }

    // Sanguine Elimination: rooted while the dread builds, then the slashes.
    const sg = st.sanguine;
    if (sg) {
      if (time < sg.strikeAt) {
        (caster.body as Phaser.Physics.Arcade.Body | null)?.setVelocity(0, 0);
        if (owner === 'player') this.arena.setPlayerYankUntil(this.arena.scene.time.now + 60);
        else this.npcLockUntil = Math.max(this.npcLockUntil, this.arena.scene.time.now + 60);
      } else if (sg.slashesLeft > 0) {
        if (time >= sg.nextSlashAt) {
          sg.nextSlashAt = time + SANGUINE_STAGGER_MS;
          sg.slashesLeft--;
          this.sanguineSlash(sg, owner);
        }
      } else {
        st.sanguine = null;
      }
    }
  }

  private updateBoggleEyes(st: StrikerState, caster: Fighter, owner: Owner, time: number): void {
    const foes = this.foesOf(owner).filter((f) => f.active && f.hp > 0);
    const wantFromPlayer = owner === 'npc';
    for (let i = st.eyes.length - 1; i >= 0; i--) {
      const e = st.eyes[i];
      const ang = e.angleOffset + time / 900;
      e.x = caster.x + Math.cos(ang) * BOGGLE_ORBIT_R;
      e.y = caster.y + Math.sin(ang) * BOGGLE_ORBIT_R;

      // Any incoming projectile scares the eye back in.
      let retreated = false;
      for (const go of this.arena.projectiles.getChildren() as Projectile[]) {
        if (!go.active || go.isFromPlayer !== wantFromPlayer) continue;
        if (Phaser.Math.Distance.Between(go.x, go.y, e.x, e.y) <= 18) { retreated = true; break; }
      }
      if (retreated) {
        this.arena.showFloatingText(e.x, e.y - 14, 'eye retreats', '#cc8899');
        // It snaps back down the nerve it came out on.
        this.fx(owner).motes(e.x, e.y, 3, {
          angle: Math.atan2(caster.y - e.y, caster.x - e.x), spread: 0.4, speed: 220,
          size: 3, life: 260, depth: DEPTH_EYE, color: SILENCE.meat, drift: 0,
        });
        st.eyes.splice(i, 1);
        continue;
      }

      if (time >= e.nextShotAt && foes.length > 0) {
        e.nextShotAt = time + BOGGLE_SHOT_EVERY_MS;
        let target = foes[0];
        let best = Number.MAX_VALUE;
        for (const f of foes) {
          const d = Phaser.Math.Distance.Between(f.x, f.y, e.x, e.y);
          if (d < best) { best = d; target = f; }
        }
        const sAng = Math.atan2(target.y - e.y, target.x - e.x);
        this.eyeShots.push({
          x: e.x, y: e.y,
          vx: Math.cos(sAng) * BOGGLE_SHOT_SPEED,
          vy: Math.sin(sAng) * BOGGLE_SHOT_SPEED,
          owner,
          diesAt: time + 2200,
        });
      }
    }
  }

  private updateEyeShots(time: number, dt: number): void {
    for (let i = this.eyeShots.length - 1; i >= 0; i--) {
      const s = this.eyeShots[i];
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      let dead = time >= s.diesAt;
      if (!dead) {
        for (const foe of this.foesOf(s.owner)) {
          if (!foe.active || foe.hp <= 0) continue;
          if (Phaser.Math.Distance.Between(s.x, s.y, foe.x, foe.y) > 24) continue;
          foe.takeDamage(BOGGLE_SHOT_DMG);
          this.arena.spawnHitFlash(foe.x, foe.y, 0xdd1133);
          this.grantStrikerTime(s.owner, BOGGLE_SHOT_DMG);
          this.fx(s.owner).rupture(s.x, s.y, 22, { bloody: true, claws: 3, rings: 1, duration: 280, mark: false });
          dead = true;
          break;
        }
      }
      if (dead) this.eyeShots.splice(i, 1);
    }
  }

  // ── Striker moveset (routed from the base ability entry points) ────

  private doStrikerSlash(tx: number, ty: number, owner: Owner): void {
    const caster = this.fighterOf(owner);
    const scene = this.arena.scene;
    const ang = Math.atan2(ty - caster.y, tx - caster.x);

    // Three curved claw scores raked through the front arc, plus the claws themselves.
    const fx = this.fx(owner);
    fx.slash(caster.x, caster.y, ang, SLASH_RANGE, SLASH_ARC_HALF_RAD, {
      bloody: true, scores: 3, duration: 230,
    });
    fx.claws(caster.x + Math.cos(ang) * 30, caster.y + Math.sin(ang) * 30, 4, {
      angle: ang, spread: SLASH_ARC_HALF_RAD, speed: 240, size: 20, life: 300,
      depth: DEPTH_BEAM, color: SILENCE.void,
    });

    // Mastery: claws find the effigy too.
    const d = owner === 'player' ? this.dolls.player : null;
    if (d) {
      const toDoll = Math.atan2(d.y - caster.y, d.x - caster.x);
      if (Phaser.Math.Distance.Between(caster.x, caster.y, d.x, d.y) <= SLASH_RANGE + 18
        && Math.abs(Phaser.Math.Angle.Wrap(toDoll - ang)) <= SLASH_ARC_HALF_RAD) {
        this.tryHitDoll(d.x, d.y, 0, SLASH_DMG);
      }
    }

    for (const foe of this.foesOf(owner)) {
      if (!foe.active || foe.hp <= 0) continue;
      if (Phaser.Math.Distance.Between(caster.x, caster.y, foe.x, foe.y) > SLASH_RANGE + 18) continue;
      const toFoe = Math.atan2(foe.y - caster.y, foe.x - caster.x);
      if (Math.abs(Phaser.Math.Angle.Wrap(toFoe - ang)) > SLASH_ARC_HALF_RAD) continue;
      foe.takeDamage(SLASH_DMG);
      this.arena.spawnHitFlash(foe.x, foe.y, 0xff2233);
      this.grantStrikerTime(owner, SLASH_DMG);
      // The claw drags them in (their own sim replays the pull for net ghosts).
      if (!foe.netGhost && !foe.knockbackImmune) {
        const pull = Math.atan2(caster.y - foe.y, caster.x - foe.x);
        (foe.body as Phaser.Physics.Arcade.Body | null)
          ?.setVelocity(Math.cos(pull) * SLASH_PULL_SPEED, Math.sin(pull) * SLASH_PULL_SPEED);
        if (foe === this.arena.player) this.arena.setPlayerYankUntil(scene.time.now + 150);
        else if (foe === this.arena.npc) this.npcLockUntil = Math.max(this.npcLockUntil, scene.time.now + 150);
        scene.time.delayedCall(150, () => {
          if (foe.active && foe.body) (foe.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
        });
      }
    }
  }

  private doBoggle(owner: Owner): void {
    const st = this.strikers[owner]!;
    const scene = this.arena.scene;
    const caster = this.fighterOf(owner);
    const time = scene.time.now;
    if (time < st.boggleReadyAt) {
      if (owner === 'player') {
        this.arena.showFloatingText(caster.x, caster.y - 30, `Boggle in ${Math.ceil((st.boggleReadyAt - time) / 1000)}s`, '#cc8899');
      }
      return;
    }
    st.boggleReadyAt = time + BOGGLE_CD_MS;
    st.boggleUntil = time + BOGGLE_LIFETIME_MS;
    st.eyes = [];
    const fx = this.fx(owner);
    for (let i = 0; i < BOGGLE_EYES; i++) {
      const a = (i * Math.PI * 2) / BOGGLE_EYES;
      st.eyes.push({
        x: caster.x, y: caster.y,
        angleOffset: a,
        nextShotAt: time + 400 + i * 220,
      });
      // Each one is squeezed out of the body — the eye opens as it clears the skin.
      fx.watchPulse(caster.x + Math.cos(a) * 18, caster.y + Math.sin(a) * 18, 7, SILENCE.gore, DEPTH_EYE + 1, 480);
    }
    this.arena.showFloatingText(caster.x, caster.y - 34, '👁👁👁 BOGGLE', '#ff5566');
  }

  private doAllure(owner: Owner): void {
    const st = this.strikers[owner]!;
    const scene = this.arena.scene;
    const caster = this.fighterOf(owner);
    st.allureUntil = scene.time.now + ALLURE_MS;
    // A call that goes out as three rings of fingers beckoning inward.
    const fx = this.fx(owner);
    for (let i = 0; i < 3; i++) {
      scene.time.delayedCall(i * 110, () =>
        fx.graspRing(caster.x, caster.y, 40, 340, SILENCE.gore, 620, DEPTH_GROUND_FX, true));
    }
    this.arena.showFloatingText(caster.x, caster.y - 36, '💋 ALLURE', '#ff2244');
  }

  private doStrikerRetreat(owner: Owner): void {
    const caster = this.fighterOf(owner);
    const scene = this.arena.scene;
    const fromX = caster.x;
    const fromY = caster.y;
    // Melt into a random spot inside the border fog, then settle the account.
    const W = this.arena.width;
    const H = this.arena.height;
    const side = Math.floor(Math.random() * 4);
    const m = FOG_WIDTH / 2;
    const spots = [
      { x: m, y: Phaser.Math.Between(m, H - m) },
      { x: W - m, y: Phaser.Math.Between(m, H - m) },
      { x: Phaser.Math.Between(m, W - m), y: m },
      { x: Phaser.Math.Between(m, W - m), y: H - m },
    ];
    (caster.body as Phaser.Physics.Arcade.Body | null)?.reset(spots[side].x, spots[side].y);
    // It does not vanish — it *unravels*, and something reassembles over in the fog.
    const fx = this.fx(owner);
    fx.motes(fromX, fromY, 12, { speed: 120, size: 8, life: 520, depth: DEPTH_EYE, color: SILENCE.void });
    fx.graspRing(fromX, fromY, 34, 4, SILENCE.void, 340, DEPTH_EYE, true);
    fx.motes(spots[side].x, spots[side].y, 8, {
      speed: 70, size: 7, life: 460, depth: DEPTH_EYE, color: SILENCE.void, drift: 0,
    });
    void scene;
    this.endStriker(owner);
  }

  private doSanguine(tx: number, ty: number, owner: Owner): void {
    const st = this.strikers[owner]!;
    if (st.sanguine) return;
    const scene = this.arena.scene;
    const caster = this.fighterOf(owner);
    const ang = Math.atan2(ty - caster.y, tx - caster.x);
    const cx = caster.x + Math.cos(ang) * (SANGUINE_LEN / 2 + 30);
    const cy = caster.y + Math.sin(ang) * (SANGUINE_LEN / 2 + 30);
    st.sanguine = {
      x: cx, y: cy, ang,
      castAt: scene.time.now,
      strikeAt: scene.time.now + SANGUINE_CHARGE_MS,
      slashesLeft: SANGUINE_SLASHES,
      nextSlashAt: 0,
    };
    this.arena.showFloatingText(caster.x, caster.y - 36, '🔴 SANGUINE ELIMINATION', '#ff1133');
  }

  private sanguineContains(sg: SanguineCharge, f: Fighter): boolean {
    const dx = f.x - sg.x;
    const dy = f.y - sg.y;
    const lx = dx * Math.cos(-sg.ang) - dy * Math.sin(-sg.ang);
    const ly = dx * Math.sin(-sg.ang) + dy * Math.cos(-sg.ang);
    return Math.abs(lx) <= SANGUINE_LEN / 2 + 18 && Math.abs(ly) <= SANGUINE_WID / 2 + 18;
  }

  private sanguineSlash(sg: SanguineCharge, owner: Owner): void {
    const rx = (Math.random() - 0.5) * SANGUINE_LEN * 0.85;
    const ry = (Math.random() - 0.5) * SANGUINE_WID * 0.85;
    const wx = sg.x + Math.cos(sg.ang) * rx - Math.sin(sg.ang) * ry;
    const wy = sg.y + Math.sin(sg.ang) * rx + Math.cos(sg.ang) * ry;
    // Ten of these land a frame apart from random angles — the box fills with cuts.
    const fx = this.fx(owner);
    fx.slash(wx, wy, sg.ang + (Math.random() - 0.5) * 2.4, 60, 0.8, {
      bloody: true, scores: 2, duration: 220,
    });
    fx.stain(wx, wy, 9, DEPTH_GROUND_FX, true);
    for (const foe of this.foesOf(owner)) {
      if (!foe.active || foe.hp <= 0) continue;
      if (!this.sanguineContains(sg, foe)) continue;
      foe.takeDamage(SANGUINE_SLASH_DMG);
      this.arena.spawnHitFlash(foe.x, foe.y, 0xff1133);
      this.grantStrikerTime(owner, SANGUINE_SLASH_DMG);
    }
  }

  // ── Flesh Banquet (F+): flesh arena + midgets ──────────────────────

  private updateMidgets(time: number, dt: number): void {
    const now = Date.now();
    const scene = this.arena.scene;

    // Victims: hallucinating, locally simulated, and the opposing silence
    // caster owns the upgrade. Net ghosts run their own midgets at home.
    const wanted = new Set<Fighter>();
    const consider = (foe: Fighter, casterOwner: Owner, casterIsSilence: boolean): void => {
      if (!casterIsSilence || !this.arena.hasUpgrade(casterOwner, 'f')) return;
      if (!foe.active || foe.hp <= 0 || foe.netGhost) return;
      if (now < foe.hallucinatingUntil) wanted.add(foe);
    };
    for (const foe of this.foesOf('player')) consider(foe, 'player', this.playerIsSilence);
    for (const foe of this.foesOf('npc')) consider(foe, 'npc', this.npcIsSilence);

    for (const f of wanted) {
      if (this.midgets.has(f)) continue;
      const pack: Midget[] = [];
      for (let i = 0; i < MIDGET_COUNT; i++) {
        const edge = Math.floor(Math.random() * 4);
        const x = edge === 0 ? -20 : edge === 1 ? this.arena.width + 20 : Phaser.Math.Between(0, this.arena.width);
        const y = edge === 2 ? -20 : edge === 3 ? this.arena.height + 20 : Phaser.Math.Between(0, this.arena.height);
        pack.push({ x, y, angle: 0, nextBiteAt: 0 });
      }
      this.midgets.set(f, pack);
      this.arena.showFloatingText(f.x, f.y - 44, '😬 THEY COME', '#ffaaaa');
    }

    for (const [f, pack] of this.midgets) {
      if (!wanted.has(f)) {
        this.midgets.delete(f);
        continue;
      }
      for (const m of pack) {
        const ang = Math.atan2(f.y - m.y, f.x - m.x);
        m.x += Math.cos(ang) * MIDGET_SPEED * dt;
        m.y += Math.sin(ang) * MIDGET_SPEED * dt;
        m.angle = ang; // teeth face the meal
        if (time >= m.nextBiteAt && Phaser.Math.Distance.Between(m.x, m.y, f.x, f.y) < 24) {
          m.nextBiteAt = time + MIDGET_BITE_CD_MS;
          f.takeDamage(MIDGET_DMG);
          this.arena.spawnHitFlash(f.x, f.y, 0xffaa99);
          this.pfx.stain(m.x, m.y, 5, DEPTH_GROUND_FX, true);
        }
      }
    }

    // Flesh arena dressing — the local player's screen only, purely visual.
    const localFlesh = this.arena.player.active
      && now < this.arena.player.hallucinatingUntil
      && this.npcIsSilence && this.arena.hasUpgrade('npc', 'f');
    if (localFlesh && !this.fleshOverlay) {
      this.fleshOverlay = scene.add.rectangle(
        this.arena.width / 2, this.arena.height / 2, this.arena.width, this.arena.height, 0x661122, 0.22,
      ).setDepth(DEPTH_FOG + 1);
      scene.tweens.add({ targets: this.fleshOverlay, alpha: 0.34, yoyo: true, repeat: -1, duration: 900 });
      for (let i = 0; i < FLESH_DECAL_COUNT; i++) {
        this.fleshDecals.push({
          x: Phaser.Math.Between(30, this.arena.width - 30),
          y: Phaser.Math.Between(30, this.arena.height - 30),
          a: Math.random() * Math.PI * 2,
          s: 0.8 + Math.random() * 0.9,
          eye: i % 2 === 0,
        });
      }
    } else if (!localFlesh && this.fleshOverlay) {
      this.fleshOverlay.destroy();
      this.fleshOverlay = null;
      this.fleshDecals = [];
    }
  }

  // ── Panic overlay ("I see you" — multiplayer victims only) ─────────

  private updatePanicOverlay(time: number): void {
    const player = this.arena.player;
    const active = this.arena.isOnline && player.active && Date.now() < player.panickedUntil;
    if (active) {
      if (!this.panicText) {
        this.panicText = this.arena.scene.add.text(
          this.arena.width / 2, this.arena.height * 0.3, 'I see you', {
            fontSize: '46px', color: '#ff1122', fontFamily: 'Georgia, serif', fontStyle: 'italic',
          },
        ).setOrigin(0.5).setDepth(DEPTH_EYE_SCREEN + 2).setScrollFactor(0);
      }
      this.panicText.setAlpha(0.45 + 0.45 * Math.abs(Math.sin(time / 260)));
      this.panicText.setRotation(Math.sin(time / 700) * 0.03);
    } else if (this.panicText) {
      this.panicText.destroy();
      this.panicText = null;
    }
  }

  // ── Feasts ─────────────────────────────────────────────────────────

  private updateFeasts(time: number, delta: number): void {
    for (let i = this.feasts.length - 1; i >= 0; i--) {
      const f = this.feasts[i];
      if (time >= f.endsAt) {
        this.feasts.splice(i, 1);
        continue;
      }

      const caster = this.fighterOf(f.owner);
      if (caster.active) {
        f.x = caster.x + Math.cos(caster.facingAngle) * FEAST_FOLLOW_OFFSET;
        f.y = caster.y + Math.sin(caster.facingAngle) * FEAST_FOLLOW_OFFSET;
      }

      for (const foe of this.foesOf(f.owner)) {
        if (!foe.active || foe.hp <= 0 || f.triggered.has(foe)) continue;
        if (Phaser.Math.Distance.Between(foe.x, foe.y, f.x, f.y) > FEAST_RADIUS) continue;
        const acc = (f.insideMs.get(foe) ?? 0) + delta;
        f.insideMs.set(foe, acc);
        if (acc >= FEAST_REQUIRED_INSIDE_MS) {
          f.triggered.add(foe);
          const dmg = Math.round(FEAST_DMG * (1 + STALKER_DMG_BONUS * this.stalkersAlive(f.owner)));
          foe.takeDamage(dmg);
          this.applyStatus(foe, { k: 'halluc', ms: HALLUCINATE_MS });
          this.arena.spawnHitFlash(foe.x, foe.y, 0x99aa88);
          this.arena.showFloatingText(foe.x, foe.y - 40, '🌀 HALLUCINATING', '#aaffaa');
          // The jaws finally close, and the victim's picture of the world tears.
          this.fx(f.owner).rupture(foe.x, foe.y, 64, { bloody: true, claws: 9, rings: 2, duration: 480 });
          this.fx(f.owner).staticBurst(foe.x, foe.y, 60, DEPTH_NOISE, 420);
        }
      }
    }
  }

  // ── Spit globs ─────────────────────────────────────────────────────

  private updateSpits(time: number, dt: number): void {
    for (let i = this.spits.length - 1; i >= 0; i--) {
      const s = this.spits[i];
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      let dead = time >= s.diesAt;

      const run = this.run;
      if (!dead && run?.phase === 'chase' && run.caster === s.owner) {
        const victim = run.victim;
        if (victim.active && Phaser.Math.Distance.Between(s.x, s.y, victim.x, victim.y) < 26) {
          dead = true;
          run.spitHits++;
          run.victimSlowUntil = this.arena.scene.time.now + SPIT_SLOW_MS;
          victim.takeDamage(SPIT_DMG);
          this.arena.spawnHitFlash(victim.x, victim.y, 0x99bb88);
        }
      }
      if (dead) this.spits.splice(i, 1);
    }
  }

  // ── Run: hallway chase ─────────────────────────────────────────────

  private updateRunChase(time: number): void {
    const run = this.run;
    if (!run) return;
    const scene = this.arena.scene;
    const caster = this.fighterOf(run.caster);

    if (run.phase === 'arm') {
      const t = 1 - Math.max(0, (run.armEnd - time) / RUN_ARM_MS);
      const ax = caster.x + (run.armTx - caster.x) * t;
      const ay = caster.y + (run.armTy - caster.y) * t;
      // The arm itself is painted by paintRunArm off this same state.

      // Did the hand reach a victim?
      const foes = this.foesOf(run.caster).filter((f) => f.active && f.hp > 0 && !f.downed);
      let hit: Fighter | null = null;
      for (const f of foes) {
        if (Phaser.Math.Distance.Between(ax, ay, f.x, f.y) <= RUN_HIT_RADIUS) { hit = f; break; }
      }
      if (hit) {
        this.startChase(run, hit, time);
        return;
      }
      if (time >= run.armEnd) {
        // Whiffed: the hand closes on nothing and is withdrawn.
        this.fx(run.caster).claws(ax, ay, 4, {
          angle: Math.atan2(caster.y - ay, caster.x - ax), spread: 0.6, speed: 260,
          size: 16, life: 300, depth: DEPTH_BEAM, color: SILENCE.pitch,
        });
        caster.reduceCooldown('silence-run', RUN_MISS_REFUND_MS);
        if (run.caster === 'player') this.arena.showFloatingText(caster.x, caster.y - 28, 'Missed…', '#8866aa');
        this.run = null;
      }
      return;
    }

    // ── Chase phase ──
    const victim = run.victim;
    const W = this.arena.width;
    const H = this.arena.height;
    const cx = W / 2;

    if (!victim.active || !caster.active || caster.hp <= 0) {
      this.endRunChase(false);
      return;
    }

    const maze = run.mazeSeed !== null;

    // Victim slows: constant hallway dread + spit hits (+ maze smallness). The player
    // side is pulled by ArenaScene through getPlayerSpeedMult() instead — see there.
    if (victim === this.arena.npc && time < run.victimSlowUntil) {
      this.arena.applyNpcSpeedMult(0.5);
    }

    // Blob movement: homing on the victim with an upward bias (locally-simulated caster only).
    const casterIsLocal = !(run.caster === 'npc' && caster.netGhost);
    if (casterIsLocal) {
      const body = caster.body as Phaser.Physics.Arcade.Body | null;
      if (body) {
        const blobSpeed = maze ? MAZE_BLOB_SPEED : BLOB_SPEED;
        const ang = Math.atan2(victim.y - caster.y - 20, victim.x - caster.x);
        body.setVelocity(Math.cos(ang) * blobSpeed, Math.sin(ang) * blobSpeed);
      }
      if (run.caster === 'player') this.arena.setPlayerYankUntil(scene.time.now + 60);
      else this.npcLockUntil = Math.max(this.npcLockUntil, scene.time.now + 60);
    }

    // Bot victim: cosmetic run toward the exit; pace decided by the roll.
    // Survivors outrun the blob; doomed bots stumble slowly enough to be caught
    // well before the exit line. In the maze the roll is half as generous.
    if (run.victimIsBot) {
      const base = BOT_SURVIVE_BASE * (maze ? MAZE_BOT_SURVIVE_MULT : 1);
      const survive = run.botRoll < base - SPIT_SURVIVAL_PENALTY * run.spitHits;
      const slowMult = time < run.victimSlowUntil ? 0.5 : 1;
      const vBody = victim.body as Phaser.Physics.Arcade.Body | null;
      if (maze) {
        // Follow the maze solution corridor waypoint by waypoint.
        const pace = (survive ? 260 : 90) * slowMult;
        let wp = run.mazePath[run.mazePathIdx];
        while (wp && Phaser.Math.Distance.Between(victim.x, victim.y, wp.x, wp.y) < 24 && run.mazePathIdx < run.mazePath.length - 1) {
          run.mazePathIdx++;
          wp = run.mazePath[run.mazePathIdx];
        }
        if (wp) {
          const ang = Math.atan2(wp.y - victim.y, wp.x - victim.x);
          vBody?.setVelocity(Math.cos(ang) * pace, Math.sin(ang) * pace);
        }
      } else {
        const pace = survive ? BLOB_SPEED + 50 : 150;
        vBody?.setVelocity((cx - victim.x) * 2, -pace * slowMult);
      }
      if (victim === this.arena.npc) this.npcLockUntil = Math.max(this.npcLockUntil, scene.time.now + 60);
    }

    if (maze) {
      // The maze spans the whole pocket dimension — arena bounds + walls.
      this.clampToArena(caster);
      this.clampToArena(victim);
      this.collideMazeWalls(caster, true, time);
      if (!victim.netGhost) this.collideMazeWalls(victim, false, time);
      this.updateMazeDread(run, victim, time);
    } else {
      // Both stay clamped inside the corridor.
      this.clampToCorridor(caster);
      this.clampToCorridor(victim);
    }

    // Door opens partway through the chase — survive the blob until then.
    const doorOpen = time >= run.doorOpensAt;
    if (doorOpen && run.exitGfx && run.exitGfx.fillColor !== 0x77ccff) {
      run.exitGfx.setFillStyle(0x77ccff, 1).setStrokeStyle(2, 0xbbeeff);
    }

    // Resolution. A remote victim's machine is the sole catch authority — the
    // caster resolving locally would teleport the blob home mid-stream and rob
    // the victim's sim of its catch. The caster instead reads the synced hp.
    const dist = Phaser.Math.Distance.Between(caster.x, caster.y, victim.x, victim.y);
    if (victim.netGhost) {
      if (victim.hp <= run.victimStartHp - BLOB_CATCH_DMG + 10) {
        this.arena.showFloatingText(victim.x, victim.y - 42, '💀 CONSUMED', '#ff2244');
        scene.cameras.main.shake(350, 0.008);
        if (run.caster === 'player') this.arena.recordMasteryStat('runCatches', 1);
        this.endRunChase(true);
        return;
      }
    } else if (dist <= BLOB_CATCH_DIST && !victim.isInvincible) {
      // Dodge i-frames let the victim phase through the blob instead of dying in it.
      victim.takeDamage(BLOB_CATCH_DMG);
      this.arena.spawnHitFlash(victim.x, victim.y, 0xff1133);
      this.arena.showFloatingText(victim.x, victim.y - 42, '💀 CONSUMED', '#ff2244');
      scene.cameras.main.shake(350, 0.008);
      if (run.caster === 'player') this.arena.recordMasteryStat('runCatches', 1);
      this.endRunChase(true);
      return;
    }
    // Bots ignore the door — their survival roll already decided the outcome.
    if (victim.y <= HALL_EXIT_Y && (run.victimIsBot || doorOpen)) {
      this.arena.showFloatingText(victim.x, victim.y + 20, 'ESCAPED', '#88ff88');
      this.endRunChase(false);
      return;
    }
    if (time >= run.chaseEndsAt) {
      this.endRunChase(false);
    }
  }

  private startChase(run: RunState, victim: Fighter, time: number): void {
    const scene = this.arena.scene;
    const W = this.arena.width;
    const H = this.arena.height;
    const cx = W / 2;
    const caster = this.fighterOf(run.caster);

    run.phase = 'chase';
    run.victim = victim;
    run.victimIsBot = victim !== this.arena.player && !victim.netGhost;
    run.chaseEndsAt = time + CHASE_TIMEOUT_MS;
    run.doorOpensAt = time + HALL_DOOR_OPEN_MS;
    run.victimStartHp = victim.hp;
    run.victimPrev = { x: victim.x, y: victim.y };

    const casterBody = caster.body as Phaser.Physics.Arcade.Body | null;
    const victimBody = victim.body as Phaser.Physics.Arcade.Body | null;

    if (run.mazeSeed !== null) {
      // Q+ The Labyrinth: the pocket dimension is a giant dark maze.
      run.floor = scene.add.rectangle(W / 2, H / 2, W, H, 0x0b0612, 1).setDepth(DEPTH_HALL_FLOOR);
      this.buildMaze(run);
      // Blob at the maze entrance, the shrunken victim a few corridors ahead.
      const start = run.mazePath[0] ?? { x: cx, y: H - 70 };
      const headStart = Math.min(3, Math.max(1, run.mazePath.length - 2));
      const ahead = run.mazePath[headStart] ?? { x: cx, y: H - 270 };
      casterBody?.reset(start.x, Math.min(H - 40, start.y + 30));
      victimBody?.reset(ahead.x, ahead.y);
      run.mazePathIdx = headStart;
      run.victimPrevScale = victim.scaleX;
      victim.setScale(run.victimPrevScale * MAZE_VICTIM_SCALE);
    } else {
      // Pocket dimension dressing: black mask with a corridor cut out.
      const mask = scene.add.graphics().setDepth(DEPTH_HALL_MASK);
      mask.fillStyle(0x000000, 0.97);
      mask.fillRect(0, 0, cx - HALL_HALF_W, H);
      mask.fillRect(cx + HALL_HALF_W, 0, W - cx - HALL_HALF_W, H);
      mask.fillRect(cx - HALL_HALF_W, 0, HALL_HALF_W * 2, HALL_TOP_Y);
      run.maskGfx = mask;
      run.floor = scene.add.rectangle(cx, H / 2, HALL_HALF_W * 2, H, 0x0b0612, 1).setDepth(DEPTH_HALL_FLOOR);
      // The exit door starts sealed (blood-red); it lights up when it opens.
      run.exitGfx = scene.add.rectangle(cx, HALL_TOP_Y + 8, HALL_HALF_W * 2, 16, 0x551111, 1)
        .setStrokeStyle(2, 0x882222).setDepth(DEPTH_HALL_FLOOR + 0.5);

      // Positions: blob at the bottom, victim a head start up the corridor.
      casterBody?.reset(cx, H - 70);
      victimBody?.reset(cx, H - 270);
    }

    // The caster becomes the horror.
    caster.setTexture('silence-blob');
    caster.setScale(1.7);
    this.arena.showFloatingText(victim.x, victim.y + 60, 'R U N', '#ff2244');
    scene.cameras.main.shake(400, 0.01);
    scene.cameras.main.flash(200, 10, 0, 20);
  }

  private clampToArena(f: Fighter): void {
    const body = f.body as Phaser.Physics.Arcade.Body | null;
    const nx = Phaser.Math.Clamp(f.x, 24, this.arena.width - 24);
    const ny = Phaser.Math.Clamp(f.y, 24, this.arena.height - 30);
    if (nx !== f.x || ny !== f.y) body?.reset(nx, ny);
  }

  private clampToCorridor(f: Fighter): void {
    const W = this.arena.width;
    const H = this.arena.height;
    const cx = W / 2;
    const body = f.body as Phaser.Physics.Arcade.Body | null;
    const nx = Phaser.Math.Clamp(f.x, cx - HALL_HALF_W + 20, cx + HALL_HALF_W - 20);
    const ny = Phaser.Math.Clamp(f.y, HALL_TOP_Y + 10, H - 30);
    if (nx !== f.x || ny !== f.y) body?.reset(nx, ny);
  }

  // ── The Labyrinth (Q+) ─────────────────────────────────────────────

  /** Deterministic PRNG — the same seed builds the same maze on both sims. */
  private mulberry32(seed: number): () => number {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /** Recursive-backtracker maze over the arena + BFS solution path for bots. */
  private buildMaze(run: RunState): void {
    const scene = this.arena.scene;
    const W = this.arena.width;
    const H = this.arena.height;
    const rand = this.mulberry32(run.mazeSeed!);
    const cols = MAZE_COLS;
    const rows = MAZE_ROWS;
    const left = 20;
    const right = W - 20;
    const top = HALL_TOP_Y + 16;
    const bottom = H - 20;
    const cw = (right - left) / cols;
    const ch = (bottom - top) / rows;

    // vWall[c][r]: wall between cells (c-1,r) and (c,r). hWall[c][r]: between (c,r-1) and (c,r).
    const vWall: boolean[][] = Array.from({ length: cols + 1 }, () => Array<boolean>(rows).fill(true));
    const hWall: boolean[][] = Array.from({ length: cols }, () => Array<boolean>(rows + 1).fill(true));
    const visited: boolean[][] = Array.from({ length: cols }, () => Array<boolean>(rows).fill(false));
    const entranceCol = Math.floor(rand() * cols);
    const stack: Array<[number, number]> = [[entranceCol, rows - 1]];
    visited[entranceCol][rows - 1] = true;
    while (stack.length > 0) {
      const [x, y] = stack[stack.length - 1];
      const opts: Array<[number, number]> = [];
      if (x > 0 && !visited[x - 1][y]) opts.push([x - 1, y]);
      if (x < cols - 1 && !visited[x + 1][y]) opts.push([x + 1, y]);
      if (y > 0 && !visited[x][y - 1]) opts.push([x, y - 1]);
      if (y < rows - 1 && !visited[x][y + 1]) opts.push([x, y + 1]);
      if (opts.length === 0) { stack.pop(); continue; }
      const [nx, ny] = opts[Math.floor(rand() * opts.length)];
      if (nx !== x) vWall[Math.max(x, nx)][y] = false;
      else hWall[x][Math.max(y, ny)] = false;
      visited[nx][ny] = true;
      stack.push([nx, ny]);
    }
    const exitCol = Math.floor(rand() * cols);
    hWall[exitCol][0] = false; // the only breach in the top boundary

    const addWall = (x: number, y: number, w: number, h: number): void => {
      const rect = scene.add.rectangle(x, y, w, h, 0x1a0a22, 1)
        .setStrokeStyle(1, 0x3a1450, 0.9).setDepth(DEPTH_HALL_FLOOR + 1);
      run.mazeWalls.push({ rect, dyingAt: 0 });
    };
    for (let c = 0; c <= cols; c++) {
      for (let r = 0; r < rows; r++) {
        if (vWall[c][r]) addWall(left + c * cw, top + (r + 0.5) * ch, MAZE_WALL_T, ch + MAZE_WALL_T);
      }
    }
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r <= rows; r++) {
        if (hWall[c][r]) addWall(left + (c + 0.5) * cw, top + r * ch, cw + MAZE_WALL_T, MAZE_WALL_T);
      }
    }
    // Exit marker — sealed until the door timer opens it (same rules as the hallway).
    run.exitGfx = scene.add.rectangle(left + (exitCol + 0.5) * cw, top - 4, cw - MAZE_WALL_T, 12, 0x551111, 1)
      .setStrokeStyle(2, 0x882222).setDepth(DEPTH_HALL_FLOOR + 0.5);

    // BFS from the entrance cell to the exit cell → waypoints for bot victims.
    const key = (c: number, r: number): number => r * cols + c;
    const prev = new Map<number, number>();
    const seen = new Set<number>([key(entranceCol, rows - 1)]);
    const queue: Array<[number, number]> = [[entranceCol, rows - 1]];
    while (queue.length > 0) {
      const [c, r] = queue.shift()!;
      if (c === exitCol && r === 0) break;
      const push = (nc: number, nr: number, open: boolean): void => {
        if (!open || seen.has(key(nc, nr))) return;
        seen.add(key(nc, nr));
        prev.set(key(nc, nr), key(c, r));
        queue.push([nc, nr]);
      };
      if (c > 0) push(c - 1, r, !vWall[c][r]);
      if (c < cols - 1) push(c + 1, r, !vWall[c + 1][r]);
      if (r > 0) push(c, r - 1, !hWall[c][r]);
      if (r < rows - 1) push(c, r + 1, !hWall[c][r + 1]);
    }
    const cells: Array<[number, number]> = [];
    let k: number | undefined = key(exitCol, 0);
    while (k !== undefined) {
      cells.unshift([k % cols, Math.floor(k / cols)]);
      k = prev.get(k);
    }
    run.mazePath = cells.map(([c, r]) => ({ x: left + (c + 0.5) * cw, y: top + (r + 0.5) * ch }));
    run.mazePath.push({ x: left + (exitCol + 0.5) * cw, y: HALL_EXIT_Y - 20 });
    run.mazePathIdx = 0;
  }

  /** Push a fighter out of solid walls; the blob starts eating whatever it hits. */
  private collideMazeWalls(f: Fighter, isBlob: boolean, time: number): void {
    const run = this.run;
    if (!run) return;
    const half = 15 * Math.max(0.4, f.scaleX || 1);
    for (const w of run.mazeWalls) {
      if (w.dyingAt !== 0 && time >= w.dyingAt) continue; // already chewed through
      const r = w.rect;
      const leftEdge = r.x - r.width / 2 - half;
      const rightEdge = r.x + r.width / 2 + half;
      const topEdge = r.y - r.height / 2 - half;
      const bottomEdge = r.y + r.height / 2 + half;
      if (f.x <= leftEdge || f.x >= rightEdge || f.y <= topEdge || f.y >= bottomEdge) continue;
      if (isBlob && w.dyingAt === 0) {
        w.dyingAt = time + MAZE_EAT_MS;
        this.arena.scene.tweens.add({ targets: r, alpha: 0.25, duration: MAZE_EAT_MS });
      }
      const dl = f.x - leftEdge;
      const dr = rightEdge - f.x;
      const du = f.y - topEdge;
      const dd = bottomEdge - f.y;
      const m = Math.min(dl, dr, du, dd);
      let nx = f.x;
      let ny = f.y;
      if (m === dl) nx = leftEdge; else if (m === dr) nx = rightEdge;
      else if (m === du) ny = topEdge; else ny = bottomEdge;
      (f.body as Phaser.Physics.Arcade.Body | null)?.reset(nx, ny);
    }
  }

  /** Per-frame maze atmosphere: chewed walls crumble, the victim sees almost nothing. */
  private updateMazeDread(run: RunState, victim: Fighter, time: number): void {
    const scene = this.arena.scene;
    for (let i = run.mazeWalls.length - 1; i >= 0; i--) {
      const w = run.mazeWalls[i];
      if (w.dyingAt !== 0 && time >= w.dyingAt) {
        const r = w.rect;
        scene.tweens.add({ targets: r, alpha: 0, scaleY: 0.2, duration: 180, onComplete: () => r.destroy() });
        run.mazeWalls.splice(i, 1);
      }
    }

    // Fog-of-war vignette + zoomed camera: only the local player suffers it.
    if (victim !== this.arena.player) return;
    if (!run.vignetteRect) {
      run.vignetteRect = scene.add.rectangle(
        this.arena.width / 2, this.arena.height / 2, this.arena.width, this.arena.height, 0x020007, 0.94,
      ).setDepth(DEPTH_NOISE + 2);
      run.vignetteHole = scene.make.graphics({}, false);
      const mask = run.vignetteHole.createGeometryMask();
      mask.invertAlpha = true;
      run.vignetteRect.setMask(mask);
    }
    run.vignetteHole!.clear();
    run.vignetteHole!.fillStyle(0xffffff, 1);
    run.vignetteHole!.fillCircle(victim.x, victim.y, MAZE_VISION_RADIUS);
    const cam = scene.cameras.main;
    cam.setZoom(MAZE_ZOOM);
    cam.centerOn(victim.x, victim.y);
    run.zoomed = true;
  }

  /** Tear down the hallway/maze and put both fighters back. Safe to call when idle. */
  private endRunChase(caught: boolean, silent = false): void {
    const run = this.run;
    if (!run) return;
    this.run = null;
    void caught;
    run.maskGfx?.destroy();
    run.floor?.destroy();
    run.exitGfx?.destroy();
    for (const w of run.mazeWalls) w.rect.destroy();
    run.mazeWalls = [];
    run.vignetteRect?.destroy();
    run.vignetteHole?.destroy();
    if (run.zoomed) {
      const cam = this.arena.scene.cameras.main;
      cam.setZoom(1);
      cam.centerOn(this.arena.width / 2, this.arena.height / 2);
    }
    if (run.phase !== 'chase') return;

    const caster = this.fighterOf(run.caster);
    if (caster.active) {
      caster.setTexture(run.casterPrev.texture);
      caster.setScale(run.casterPrev.scale);
      (caster.body as Phaser.Physics.Arcade.Body | null)?.reset(run.casterPrev.x, run.casterPrev.y);
    }
    const victim = run.victim;
    if (run.mazeSeed !== null && victim.active) {
      victim.setScale(run.victimPrevScale);
    }
    if (victim.active && victim.hp > 0) {
      (victim.body as Phaser.Physics.Arcade.Body | null)?.reset(run.victimPrev.x, run.victimPrev.y);
    }
    this.spits = [];
    if (!silent) this.arena.scene.cameras.main.flash(250, 5, 0, 10);
  }

  // ── Hallucination FX (local player is the victim) ──────────────────

  private updateHallucinations(time: number): void {
    const player = this.arena.player;
    const active = Date.now() < player.hallucinatingUntil;
    const scene = this.arena.scene;

    const noise = this.layer(DEPTH_NOISE);
    noise.clear();
    if (!active) {
      this.hideEyeScreen();
      this.clearFakePos();
      this.nextEyeScreenAt = 0;
      this.nextFakePosAt = 0;
      return;
    }

    // 1) Dead-channel static tearing across every fighter and projectile. Painted rather
    // than stamped from a texture, so it actually crawls instead of flickering between
    // three fixed frames.
    const targets: Array<{ x: number; y: number }> = [];
    const npc = this.arena.npc;
    if (npc.active && npc.alpha > 0.01) targets.push(npc);
    for (const e of this.arena.enemies) if (e.active && e.hp > 0) targets.push(e);
    for (const go of this.arena.projectiles.getChildren() as Projectile[]) {
      if (go.active) targets.push(go);
      if (targets.length >= 40) break;
    }
    for (const t of targets) {
      for (let i = 0; i < 9; i++) {
        const w = 6 + Math.random() * 26;
        noise.fillStyle(Math.random() > 0.5 ? this.pcol(SILENCE.pale) : this.pcol(SILENCE.void),
          0.3 + Math.random() * 0.55);
        noise.fillRect(t.x - w / 2 + Phaser.Math.Between(-8, 8), t.y - 16 + i * 4, w, 2 + Math.random() * 2);
      }
      // Every so often an eye surfaces where the fighter should be.
      if (Math.random() < 0.04) {
        silenceEye(noise, this.pcol, t.x, t.y, 0, 7, Math.sin(time / 300) * 0.9, 1, SILENCE.gore, 0.85);
      }
    }

    // 2) Eye-screen popup.
    if (this.nextEyeScreenAt === 0) this.nextEyeScreenAt = time + HALLUC_EYE_SCREEN_EVERY / 2;
    if (time >= this.nextEyeScreenAt && this.eyeScreenUntil === 0) {
      this.eyeScreenUntil = time + HALLUC_EYE_SCREEN_DUR;
      this.nextEyeScreenAt = time + HALLUC_EYE_SCREEN_EVERY;
      this.showEyeScreen();
    }
    if (this.eyeScreenUntil > 0 && time >= this.eyeScreenUntil) this.hideEyeScreen();

    // 3) Fake position of the silence enemy (only meaningful while it's visible).
    const silenceEnemy = this.npcIsSilence ? npc : null;
    if (silenceEnemy && silenceEnemy.active) {
      if (this.nextFakePosAt === 0) this.nextFakePosAt = time + HALLUC_FAKE_POS_EVERY;
      if (time >= this.nextFakePosAt && this.fakePosUntil === 0 && !this.isInvisible('npc')) {
        this.fakePosUntil = time + HALLUC_FAKE_POS_DUR;
        this.nextFakePosAt = time + HALLUC_FAKE_POS_EVERY;
        const ghost = scene.add.image(
          silenceEnemy.x + Phaser.Math.Between(-180, 180),
          silenceEnemy.y + Phaser.Math.Between(-140, 140),
          silenceEnemy.texture.key,
        ).setDepth(DEPTH_NOISE).setAlpha(1);
        this.fakePosGhost = ghost;
      }
      if (this.fakePosUntil > 0) {
        if (time >= this.fakePosUntil || this.isInvisible('npc')) {
          this.clearFakePos();
        } else {
          // The hitbox stays where it really is — can't hurt what is not there.
          silenceEnemy.setAlpha(0);
          this.fakePosGhost?.setPosition(
            this.fakePosGhost.x + Math.sin(time / 300) * 0.6,
            this.fakePosGhost.y + Math.cos(time / 340) * 0.6,
          );
        }
      }
    }
  }

  private showEyeScreen(): void {
    const scene = this.arena.scene;
    const W = this.arena.width;
    const H = this.arena.height;
    if (!this.eyeScreenRect) {
      this.eyeScreenRect = scene.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.94).setDepth(DEPTH_EYE_SCREEN);
    }
    this.eyeScreenRect.setVisible(true);
    // Reshuffled every time it opens — the same seven eyes in the same seven places would
    // stop being frightening on the second showing.
    this.eyeScreenEyes = Array.from({ length: 7 }, () => ({
      x: Phaser.Math.Between(60, W - 60),
      y: Phaser.Math.Between(60, H - 60),
      a: Math.random() * 0.6 - 0.3,
      s: 0.7 + Math.random(),
    }));
  }

  private hideEyeScreen(): void {
    this.eyeScreenUntil = 0;
    this.eyeScreenRect?.setVisible(false);
    this.eyeScreenEyes = [];
    this.layers.get(DEPTH_EYE_SCREEN + 1)?.clear();
  }

  private clearFakePos(): void {
    this.fakePosUntil = 0;
    if (this.fakePosGhost) { this.fakePosGhost.destroy(); this.fakePosGhost = null; }
    // renderInvisibility / normal alpha handling restores the real sprite next frame.
    const npc = this.arena.npc;
    if (npc.active && this.npcIsSilence && !this.isInvisible('npc')) npc.setAlpha(1);
  }

  // ── NPC mirror AI (offline bot playing silence) ────────────────────

  private updateNpcMirrorAI(time: number): void {
    if (!this.npcIsSilence || this.arena.npc.netGhost || this.arena.isOnline) return;
    const npc = this.arena.npc;
    const player = this.arena.player;
    if (!npc.active || npc.hp <= 0 || !player.active || player.hp <= 0) return;
    if (this.run) return; // chase logic owns movement
    if (time < this.npcLockUntil) return;
    const body = npc.body as Phaser.Physics.Arcade.Body | null;
    if (!body) return;

    const invis = this.isInvisible('npc');
    const stealth = this.stealth.npc;

    if (invis && npc.getCooldownRatio(STAB_CD_ID) >= 1 && stealth > 30) {
      // Ambush: slide to a point behind the player's facing, then backstab.
      const behindX = player.x + Math.cos(player.facingAngle + Math.PI) * 60;
      const behindY = player.y + Math.sin(player.facingAngle + Math.PI) * 60;
      const d = Phaser.Math.Distance.Between(npc.x, npc.y, behindX, behindY);
      if (d > 40) {
        const ang = Math.atan2(behindY - npc.y, behindX - npc.x);
        body.setVelocity(Math.cos(ang) * npc.speed * 1.05, Math.sin(ang) * npc.speed * 1.05);
      } else {
        npc.castAbility('silence-stab', this.arena.buildNpcContext(player.x, player.y));
      }
      return;
    }

    if (!invis && stealth < 35) {
      // Slink to the nearest fog edge to recharge.
      const W = this.arena.width;
      const H = this.arena.height;
      const candidates = [
        { x: FOG_WIDTH / 2, y: npc.y },
        { x: W - FOG_WIDTH / 2, y: npc.y },
        { x: npc.x, y: FOG_WIDTH / 2 },
        { x: npc.x, y: H - FOG_WIDTH / 2 },
      ];
      let target = candidates[0];
      let best = Number.MAX_VALUE;
      for (const c of candidates) {
        const d = Phaser.Math.Distance.Between(npc.x, npc.y, c.x, c.y);
        if (d < best) { best = d; target = c; }
      }
      const ang = Math.atan2(target.y - npc.y, target.x - npc.x);
      body.setVelocity(Math.cos(ang) * npc.speed, Math.sin(ang) * npc.speed);
    }
  }

  // ── HUD ────────────────────────────────────────────────────────────

  private updateHud(): void {
    if (!this.playerIsSilence) return;
    const scene = this.arena.scene;
    if (!this.stealthBarBg) {
      const x = 26;
      const y = 66;
      this.stealthBarBg = scene.add.rectangle(x, y, 150, 12, 0x0a0a18, 0.9)
        .setOrigin(0, 0.5).setStrokeStyle(1, 0x553377).setDepth(23).setScrollFactor(0);
      this.stealthBarFill = scene.add.rectangle(x + 1, y, 0, 10, 0x8844cc, 0.95)
        .setOrigin(0, 0.5).setDepth(24).setScrollFactor(0);
      this.stealthLabel = scene.add.text(x, y - 14, 'STEALTH', {
        fontSize: '10px', color: '#9977bb', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif',
      }).setOrigin(0, 0.5).setDepth(24).setScrollFactor(0);
      for (let i = 0; i < STALKER_MAX; i++) {
        this.stalkerPips.push(
          scene.add.circle(x + 160 + i * 16, y, 5, 0x110016, 1)
            .setStrokeStyle(1, 0x553377).setDepth(24).setScrollFactor(0),
        );
      }
    }
    const ratio = this.stealth.player / STEALTH_MAX;
    this.stealthBarFill!.width = 148 * ratio;
    this.stealthBarFill!.setFillStyle(this.isInvisible('player') ? 0xaa66ee : 0x663399, 0.95);
    const count = this.stalkersAlive('player');
    this.stalkerPips.forEach((p, i) => p.setFillStyle(i < count ? 0xff2244 : 0x110016, 1));

    // R+ Night Terror (and Silence Mastery, which spends terror on Puppetmaster):
    // the TERROR bar lives just under the stealth bar.
    if (this.hasTerrorBar('player')) {
      if (!this.terrorBarBg) {
        const x = 26;
        const y = 94;
        this.terrorBarBg = scene.add.rectangle(x, y, 150, 12, 0x180404, 0.9)
          .setOrigin(0, 0.5).setStrokeStyle(1, 0x772222).setDepth(23).setScrollFactor(0);
        this.terrorBarFill = scene.add.rectangle(x + 1, y, 0, 10, 0xcc1122, 0.95)
          .setOrigin(0, 0.5).setDepth(24).setScrollFactor(0);
        this.terrorLabel = scene.add.text(x, y - 14, 'TERROR', {
          fontSize: '10px', color: '#cc5555', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif',
        }).setOrigin(0, 0.5).setDepth(24).setScrollFactor(0);
      }
      const tRatio = this.terror.player / TERROR_MAX;
      this.terrorBarFill!.width = 148 * tRatio;
      // Lit whenever the bar can actually buy something: a Striker at full, or —
      // with the mastery — a voodoo doll at a quarter.
      const spendable = tRatio >= 1
        || (this.arena.masteryActive && this.terror.player >= PUPPET_TERROR_COST);
      this.terrorBarFill!.setFillStyle(spendable ? 0xff2233 : 0x991122, 0.95);
      this.terrorLabel!.setColor(spendable ? '#ff4455' : '#cc5555');
    }

    // Striker countdown, just below the top HP bar.
    const st = this.strikers.player;
    if (st) {
      if (!this.strikerTimerText) {
        this.strikerTimerText = scene.add.text(this.arena.width / 2, 58, '', {
          fontSize: '15px', color: '#ff3344', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif', fontStyle: 'bold',
        }).setOrigin(0.5).setDepth(24).setScrollFactor(0);
      }
      const remain = Math.max(0, st.endsAt - scene.time.now) / 1000;
      this.strikerTimerText.setText(`🐺 ${remain.toFixed(1)}s   💥 ${Math.round(st.storedDamage)} stored`);
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────

  private fighterOf(owner: Owner): Fighter {
    return owner === 'player' ? this.arena.player : this.arena.npc;
  }

  /**
   * Apply a silence status to a foe. Local fighters/husks get the field set
   * directly; co-op guest husk replicas don't simulate, so the status is
   * forwarded to the host over the existing ghost-status channel.
   */
  private applyStatus(foe: Fighter, status: Extract<HuskStatus, { k: 'silence' | 'halluc' | 'atkslow' | 'panic' }>): void {
    if (status.k === 'silence') foe.silencedUntil = Math.max(foe.silencedUntil, Date.now() + status.ms);
    else if (status.k === 'halluc') foe.hallucinatingUntil = Math.max(foe.hallucinatingUntil, Date.now() + status.ms);
    else if (status.k === 'panic') foe.panickedUntil = Math.max(foe.panickedUntil, Date.now() + status.ms);
    else {
      foe.attackIntervalMult *= status.mult;
      foe.cooldownMult *= status.mult;
    }
    const ghost = foe as Fighter & { onGhostStatus?: ((s: HuskStatus) => void) | null };
    if (foe.netGhost && ghost.onGhostStatus) ghost.onGhostStatus(status);
  }

  /**
   * Live enemies of `owner`. In invasion BOTH sides fight husks — the npc slot
   * holds the co-op ally there, never an opponent.
   */
  private foesOf(owner: Owner): Fighter[] {
    if (this.arena.isInvasion) {
      return this.arena.enemies.filter((e) => e.element.id === 'husk');
    }
    if (owner === 'npc') return [this.arena.player];
    return this.arena.npc && this.arena.npc.active ? [this.arena.npc] : [];
  }

  /**
   * Ruin's Spikes of Ruin (see `combat/SummonPurge.ts`).
   * Watchers, seekers, grabbers, vultures, corrupt clones, ritual circles and feasts. A
   * grabber or vulture with somebody in its hands is skipped: it is the only thing holding that
   * fighter's body, and deleting it mid-carry would strand them.
   */
  purgeSummons(x: number, y: number, radius: number, exceptOwner: 'player' | 'npc'): number {
    const near = (px: number, py: number): boolean => Phaser.Math.Distance.Between(x, y, px, py) <= radius;
    let razed = 0;
    for (let i = this.stalkers.length - 1; i >= 0; i--) {
      const s = this.stalkers[i];
      if (s.owner === exceptOwner || !near(s.x, s.y)) continue;
      this.killStalker(i);
      razed++;
    }
    for (let i = this.grabbers.length - 1; i >= 0; i--) {
      const g = this.grabbers[i];
      if (g.owner === exceptOwner || g.grab || !near(g.x, g.y)) continue;
      this.grabbers.splice(i, 1);
      razed++;
    }
    for (let i = this.vultures.length - 1; i >= 0; i--) {
      const v = this.vultures[i];
      if (v.owner === exceptOwner || v.carry || !near(v.x, v.y)) continue;
      this.vultures.splice(i, 1);
      razed++;
    }
    for (let i = this.corrupts.length - 1; i >= 0; i--) {
      const c = this.corrupts[i];
      if (c.owner === exceptOwner || !near(c.x, c.y)) continue;
      this.corrupts.splice(i, 1);
      razed++;
    }
    for (let i = this.rituals.length - 1; i >= 0; i--) {
      const r = this.rituals[i];
      if (r.owner === exceptOwner || !near(r.x, r.y)) continue;
      this.rituals.splice(i, 1);
      razed++;
    }
    for (let i = this.feasts.length - 1; i >= 0; i--) {
      const f = this.feasts[i];
      if (f.owner === exceptOwner || !near(f.x, f.y)) continue;
      this.feasts.splice(i, 1);
      razed++;
    }
    return razed;
  }
}
