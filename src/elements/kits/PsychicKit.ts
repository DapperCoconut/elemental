import Phaser from 'phaser';
import { FONT_UI } from '../../ui/Theme';
import { Fighter } from '../../entities/Fighter';
import { CastContext } from '../Ability';
import type { CustomStatus } from './StatusHudKit';
import type { NetPsychicMsg } from '../../network/NetworkManager';
import type { SummonPurgeTarget } from '../../combat/SummonPurge';
import type { FormRevertTarget } from '../../combat/FormRevert';
import { Sfx } from '../../audio';
import {
  ChessKind, OUTPLAY, PSY, PsychicAvatar, PsychicColorFn, PsychicFx, chessPiece, heavenlyAura,
  mightAura, moveGuide, outplayedAura, premoveClock, queenCrown, queueCard, rideWard, sightSquare,
  strideAura,
} from './PsychicVisuals';

type Owner = 'player' | 'npc';
type PieceKind = 'bishop' | 'knight' | 'rook';
/** Every key a Pre-move can be laid on. */
type PremoveKey = 'click' | 'e' | 'r' | 'f' | 'q' | 'space' | 'w' | 'a' | 's' | 'd';
const PREMOVE_KEYS: PremoveKey[] = ['click', 'e', 'r', 'f', 'q', 'space', 'w', 'a', 's', 'd'];
const MOVE_KEYS: PremoveKey[] = ['space', 'w', 'a', 's', 'd'];

const ARENA_PAD = 32;
const BOTH: Owner[] = ['player', 'npc'];

// ── Opened Eyes (passive) ────────────────────────────────────────────────────
/**
 * How long every ability cast at the psychic is held before it resolves. The queue over his
 * head is that hold, drawn.
 */
const FORESIGHT_MS = 2000;
/** How far ahead the shadow of the enemy stands. */
const GHOST_MS = 1000;
/** Below this the shadow would sit inside the real body, so it is not drawn at all. */
const GHOST_MIN_DIST = 14;
/** Cards shown in the queue over the psychic's head. The queue itself is unbounded. */
const CARDS_SHOWN = 4;
/** Online: how often the victim's own sim tells the psychic what is sitting in its queue. */
const QUEUE_RELAY_MS = 160;
/** A relayed queue older than this is treated as gone. */
const QUEUE_STALE_MS = 1200;
/** The dead-reckoning step for bodies with no AI plan to read. */
const PATH_STEP_MS = 100;

// ── Click: En Passant ────────────────────────────────────────────────────────
const PAWN_STEP = 130;
const PAWN_STEP_MS = 300;
const PAWN_LIFE_MS = 3000;
const PAWN_TOUCH_DAMAGE = 8;
const PAWN_TOUCH_R = 16;
/** The capture: forward-left and forward-right, like the real thing. */
const PAWN_STRIKE_DAMAGE = 16;
const PAWN_STRIKE_REACH = 48;
const PAWN_STRIKE_R = 24;
const PAWN_STRIKE_EVERY_MS = 1000;

// ── E / R / F: the pieces ────────────────────────────────────────────────────
const PIECE_LIFE_MS = 8000;
/** How close a click has to land to a piece to pick it up. */
const PIECE_PICK_R = 30;
const AURA_R = 110;
/** Every aura is 15%, and every one stacks multiplicatively with its own kind. */
const AURA_STEP = 0.15;
/**
 * A piece that has just moved has to settle before it can move again. Long enough that one
 * piece is worth a handful of slides over its eight seconds, not a machine gun.
 */
const PIECE_SETTLE_MS = 2000;
/** Bishop and rook slides. */
const SLIDE_SPEED = 1100;
const SLIDE_MIN = 40;
const SLIDE_MAX = 460;
/** Added to the victim's body radius when a sliding piece is tested against it. */
const SLIDE_HIT_R = 16;
const BISHOP_DAMAGE = 40;
const ROOK_DAMAGE = 45;
/** One knight "square". A jump is two of these one way and one the other. */
const KNIGHT_UNIT = 75;
const KNIGHT_LEAP_MS = 340;
const KNIGHT_BLAST_R = 80;
const KNIGHT_DAMAGE = 35;
/** A rook passing within this of another piece takes it. */
const CAPTURE_R = 26;
/** …and wears that piece's aura for this long, wherever it goes. */
const STOLEN_AURA_MS = 30_000;

// ── Q: Queen ─────────────────────────────────────────────────────────────────
const QUEEN_MS = 15_000;
/** Every aura at once, three times over. */
const QUEEN_MULT = 3;
const QUEEN_MOVE_MAX = 380;
const QUEEN_SLIDE_SPEED = 1300;
const QUEEN_SETTLE_MS = 1000;
const QUEEN_PATH_DAMAGE = 25;
const QUEEN_BLAST_R = 85;
const QUEEN_BLAST_DAMAGE = 20;

// ── Shop upgrades ────────────────────────────────────────────────────────────
/** Click+ Insight Move: a pawn whose first capture catches nobody takes one more step. */
const PAWN_MAX_STEPS = 2;
/** E+ Sight Lines: one lit board square, edge to edge, along a bishop's diagonal. */
const SIGHT_SQUARE = 30;
const SIGHT_DAMAGE = 5;
const SIGHT_MS = 5000;
/** Squares light up one after another down the diagonal, this far apart. */
const SIGHT_RIPPLE_MS = 22;
/**
 * One body is billed by a side's squares at most this often. Each square only ever bills a body
 * once, but walking straight down a diagonal crosses one every ~0.1s.
 */
const SIGHT_HIT_GAP_MS = 350;
/** R+ Mount Protect: the rider comes down just in front of the knight's foot, not inside it. */
const RIDE_LAND_DY = 24;
/** F+ Castle: the slam where the rook comes down. */
const CASTLE_R = 70;
const CASTLE_DAMAGE = 20;
/** Q+ Checkmate: below this fraction of their health, the end of the reign kills. */
const CHECKMATE_FRAC = 0.15;
/** The bot crowns early to set a checkmate up once its target is down to this. */
const NPC_CHECKMATE_SETUP = 0.4;
/** The bot castles out of melee when its target is this close. */
const NPC_CASTLE_TRIGGER = CASTLE_R * 0.9;
/** The bot rides a knight out of trouble below this much health. */
const NPC_RIDE_ESCAPE_HP = 0.5;
const NPC_RIDE_ESCAPE_RANGE = 160;

// ── Mastery ──────────────────────────────────────────────────────────────────
/**
 * Outplayed (passive): how many health-percentage points behind the psychic an enemy has to be,
 * and how much longer their cooldowns run once they are. Points, not raw HP — a tank on 300 of
 * 400 is as far behind as a duellist on 75 of 100.
 */
const OUTPLAYED_TIERS: { gap: number; mult: number }[] = [
  { gap: 75, mult: 1.33 },
  { gap: 50, mult: 1.25 },
  { gap: 25, mult: 1.1 },
];
const PREMOVE_ID = 'pre-move';
const PREMOVE_COOLDOWN_MS = 14_000;
/** How long the psychic has to choose the key before the pre-move lapses unspent. */
const PREMOVE_CHOOSE_MS = 4000;
/** How long the prediction stands once it is made. */
const PREMOVE_WINDOW_MS = 1500;
const PREMOVE_DAMAGE = 25;
const PREMOVE_STUN_MS = 600;
/** The ability they pressed: this much longer, now and for every cast of it for a while. */
const PREMOVE_CD_MULT = 1.5;
const PREMOVE_CD_MS = 8000;
/** A movement key (Space included): 30% slower for this long — `Fighter.premoveSlowMult`. */
const PREMOVE_SLOW_MS = 3000;
/** A body with no keys "presses" a direction when its velocity starts going that way this fast. */
const PRESS_SPEED = 45;
/** The bot's read of the player: presses older than this are forgotten. */
const PRESS_MEMORY_MS = 4000;
const NPC_PREMOVE_CHECK_MS = 300;
const NPC_PREMOVE_RANGE = 460;
/** The bot only predicts once it has seen at least this much (recency-weighted) pressing. */
const NPC_PREMOVE_MIN_READ = 1.5;

/** How often the bot re-plans which piece to move where. */
const NPC_PLAN_MS = 120;

// ── Types ────────────────────────────────────────────────────────────────────

interface Queued {
  id: string;
  /** Display key, for the card's badge. */
  key: string;
  name: string;
  big: boolean;
  /** Scene time at which it resolves. */
  at: number;
  /** Scene time at which it was pressed, for the fuse on its card. */
  pressed: number;
  fire: () => void;
}

/** A move in progress, for a piece or for the queen herself. */
interface Move {
  fx: number;
  fy: number;
  tx: number;
  ty: number;
  start: number;
  ms: number;
  /** Knights jump; everyone else slides and hits what they slide through. */
  leap: boolean;
  /** Bodies this move has already hit — one hit per body per move. */
  hit: Set<Fighter>;
}

interface Piece {
  /** Per-owner spawn serial. Online moves are addressed by it, so both sims must agree. */
  id: number;
  kind: PieceKind;
  owner: Owner;
  x: number;
  y: number;
  born: number;
  until: number;
  /** Scene time from which it may move again. */
  readyAt: number;
  move: Move | null;
  face: number;
  seed: number;
  /** F+ Castle: a rook castles once. */
  castled: boolean;
}

interface Pawn {
  owner: Owner;
  x: number;
  y: number;
  fx: number;
  fy: number;
  tx: number;
  ty: number;
  ang: number;
  born: number;
  until: number;
  touched: Set<Fighter>;
  nextStrikeAt: number;
  /** Steps taken so far, and when the current one began. Insight Move allows a second. */
  steps: number;
  stepAt: number;
}

/** E+ Sight Lines: one lit square of a diagonal a bishop slid down. */
interface SightSquare {
  owner: Owner;
  x: number;
  y: number;
  /** Lights up a moment after the square before it, so the line ripples on. */
  born: number;
  until: number;
  seed: number;
  /** Each square bills a body once. */
  hit: Set<Fighter>;
}

/** R+ Mount Protect: the psychic in a knight's saddle. */
interface Ride {
  /** The knight's serial, for drawing; the ride runs on its own clock either way. */
  piece: number;
  who: Fighter;
  fx: number;
  fy: number;
  tx: number;
  ty: number;
  start: number;
  ms: number;
  /** What `isInvincible` was before the leap — handed back on landing. */
  saved: boolean;
}

/** Edge state for one body's keys, so a press can be told from a hold. */
interface PressTrack {
  down: Record<PremoveKey, boolean>;
  /** `Fighter.lastPressAt` as last seen. */
  pressAt: number;
  /** A husk's attack clock as last seen — a husk's attack is its Click. */
  atk: number;
}

interface Side {
  owner: Owner;
  aimX: number;
  aimY: number;
  /** Next piece serial. */
  serial: number;
  /** The piece the player has picked up, by serial; -1 for none. */
  selected: number;
  /** Queen form: scene time it ends, 0 when not crowned. */
  queenUntil: number;
  queenReadyAt: number;
  queenMove: Move | null;
  /** Rook captures: auras worn without the piece, each with its own clock. */
  stolen: { kind: PieceKind; until: number }[];
  /** Pre-move: when it was last cast (its cooldown runs from here). */
  premoveCastAt: number;
  /** Cast and waiting for its key until this scene time; 0 when not choosing. */
  premoveChoosingUntil: number;
  /** The key predicted, and until when it stands. */
  premoveKey: PremoveKey | null;
  premoveUntil: number;
  npcPremoveCheckAt: number;
  ride: Ride | null;
  /** Sight Lines: when each body was last billed by this side's squares. */
  sightHitAt: Map<Fighter, number>;
}

function makeSide(owner: Owner): Side {
  return {
    owner, aimX: 0, aimY: 0, serial: 0, selected: -1,
    queenUntil: 0, queenReadyAt: 0, queenMove: null, stolen: [], ride: null, sightHitAt: new Map(),
    premoveCastAt: -PREMOVE_COOLDOWN_MS, premoveChoosingUntil: 0, premoveKey: null, premoveUntil: 0,
    npcPremoveCheckAt: 0,
  };
}

/** `NpcOpponent.movementPlan`, as far as this kit needs it. */
interface MovementPlan {
  closing: boolean;
  range: number;
  strafe: number;
  speed: number;
  frozen: boolean;
}

/** What the bot should do with a click this tick, worked out by the kit. */
interface NpcPlan {
  /** Piece serial, -1 for the queen herself, or -2 to castle with the rook standing at (x, y). */
  piece: number;
  x: number;
  y: number;
}

export interface PsychicArenaApi {
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
  /** True in online PvP, where the npc slot is a replica of a real opponent. */
  get isOnline(): boolean;
  /** Invasion: the npc slot is a placeholder or a co-op *ally*, never an enemy. */
  get isInvasion(): boolean;
  /** Invasion husks in another room share screen coordinates; this says whether one is really here. */
  isTargetable(f: Fighter): boolean;
  psychicColor(owner: Owner, base: number): number;
  spawnHitFlash(x: number, y: number, color: number): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  buildPlayerContext(x: number, y: number): CastContext;
  setStatusIndicator(id: string, status: CustomStatus | null): void;
  sendPsychicMsg(msg: NetPsychicMsg): void;
  /** The shop upgrade in `slot` — the player's own, or the opponent's loadout for 'npc'. */
  hasUpgrade(owner: Owner, slot: string): boolean;
  get masteryActive(): boolean;
  get npcMasteryActive(): boolean;
  masteryBindFor(slot: string): string | null;
  npcMasteryBindFor(slot: string): string | null;
  recordMasteryStat(key: string, amount: number): void;
  /** The rest of the local player's keys, for Pre-move — which has to read every one of them. */
  get wKey(): Phaser.Input.Keyboard.Key;
  get aKey(): Phaser.Input.Keyboard.Key;
  get sKey(): Phaser.Input.Keyboard.Key;
  get dKey(): Phaser.Input.Keyboard.Key;
  get spaceKey(): Phaser.Input.Keyboard.Key;
  get pointer(): Phaser.Input.Pointer;
}

// ── PsychicKit ───────────────────────────────────────────────────────────────

/**
 * Psychic — the grandmaster.
 *
 * Two halves that have nothing to do with each other mechanically and everything to do with
 * each other in play.
 *
 * **Opened Eyes** is the passive, and it is the old element's one good idea kept whole: while a
 * psychic is on the field every ability aimed at him is *queued* rather than resolved (the
 * generic `Fighter.castDelayMs`), and he is shown the queue. It is drawn over his own head now,
 * as a vertical stack of cards with the next one at the bottom, because that is where a player's
 * eyes already are. The enemy's route is no longer a thread on the floor — it is a shadow of the
 * enemy standing exactly where they will be in one second, and nothing else.
 *
 * **The board** is everything he presses. Click throws a pawn forward that captures on its
 * diagonals; E, R and F stand a bishop, knight or rook on the cursor for eight seconds, each
 * with an aura that is worth 15% of something to him while he stands in it (damage taken, speed,
 * damage dealt — all stacking). Click a standing piece to pick it up and click again to move it
 * the way that piece moves in chess, through anybody in the way. The rook takes any piece it
 * runs over and keeps that piece's aura for 30 seconds. Q makes him the queen: every aura three
 * times over, no legs, and a click that moves him like the strongest piece on the board.
 *
 * Damage-dealt is a victim-side multiplier (`psychicIncomingMult` on his targets) because
 * `takeDamage` has no attacker reference — the same arrangement Justice, Magma and Death use.
 * Damage-taken is the same field on his own body. Both are rewritten from scratch every frame.
 *
 * The netcode for the passive still runs *backwards*: a remote opponent delays their own casts
 * on their own sim and relays the queue back. Piece spawns ride the ordinary cast relay; piece
 * moves are kit messages addressed by a per-owner spawn serial.
 */
export class PsychicKit implements SummonPurgeTarget, FormRevertTarget {
  private api: PsychicArenaApi;

  // ── Visuals ──
  private readonly pcol: PsychicColorFn;
  private readonly ncol: PsychicColorFn;
  private readonly pfx: PsychicFx;
  private readonly nfx: PsychicFx;
  private playerAvatar: PsychicAvatar | null = null;
  private npcAvatar: PsychicAvatar | null = null;
  /** Auras, runes and the meditation mandala — under the fighters. */
  private groundGfx: Phaser.GameObjects.Graphics | null = null;
  /** The pieces themselves — at fighter height, so they stand among the bodies. */
  private pieceGfx: Phaser.GameObjects.Graphics | null = null;
  /** Move guides, the crown and the queue cards — over everything. */
  private airGfx: Phaser.GameObjects.Graphics | null = null;
  /**
   * Pooled legends for the queue cards. Pooled because cards appear and vanish several times a
   * second and `setStyle` rebuilds a Text's canvas texture — `setText` on an unchanged string
   * does not.
   */
  private labels: Phaser.GameObjects.Text[] = [];
  private labelsUsed = 0;
  /** Pooled shadows of the enemy, one per target. */
  private ghosts: Phaser.GameObjects.Image[] = [];
  private ghostsUsed = 0;
  private vizT = 0;

  // ── Sim ──
  private sides: Record<Owner, Side> = { player: makeSide('player'), npc: makeSide('npc') };
  private queues = new Map<Fighter, Queued[]>();
  private foreseen = new Set<Fighter>();
  private pieces: Piece[] = [];
  private pawns: Pawn[] = [];
  private squares: SightSquare[] = [];
  /** Observed velocity per body, for bodies with no AI plan to replay (husks, replicas). */
  private seen = new Map<Fighter, { x: number; y: number; vx: number; vy: number; at: number }>();
  /** The mouse button last frame, so a press can be told from a hold. */
  private wasDown = false;
  /** What the press that is still held down was spent on. Only a pawn press repeats. */
  private pressMode: 'pawn' | 'spent' | null = null;
  private npcPlan: NpcPlan | null = null;
  private npcPlanAt = 0;

  // Mastery.
  /** Key edge state per watched body, refreshed every frame while anybody has Pre-move bound. */
  private tracks = new Map<Fighter, PressTrack>();
  /** This frame's fresh presses, per watched body. */
  private framePresses = new Map<Fighter, PremoveKey[]>();
  /** The bot psychic's read on the player: their recent presses. */
  private pressLog: { key: PremoveKey; at: number }[] = [];
  /** Pre-move's light stun: bodies this sim holds still, until scene time. */
  private stuns = new Map<Fighter, number>();
  /** Outplayed on husks: the share of `attackIntervalMult` this kit has folded in, per husk. */
  private outplayedHusk = new Map<Fighter, number>();
  /** Outplayed tier last frame, per body — for the call-out when it climbs. */
  private outplayedSeen = new Map<Fighter, number>();
  /** The local player's own sprung Pre-move: which ability is stretched, for the tray. */
  private premovedMe: { name: string; until: number } | null = null;
  /** Online: the opponent's own report of their queue, soonest first. */
  private netQueue: { id: string; left: number }[] = [];
  private netQueueAt = 0;
  private lastQueueRelayAt = 0;
  private lastQueueSentAt = 0;
  private lastRelayedQueue = '';

  constructor(api: PsychicArenaApi) {
    this.api = api;
    this.pcol = (base) => api.psychicColor('player', base);
    this.ncol = (base) => api.psychicColor('npc', base);
    this.pfx = new PsychicFx(api.scene, this.pcol);
    this.nfx = new PsychicFx(api.scene, this.ncol);
  }

  // ── Small helpers ──────────────────────────────────────────────────────────

  private get now(): number { return this.api.scene.time.now; }
  private side(owner: Owner): Side { return this.sides[owner]; }
  private fighter(owner: Owner): Fighter { return owner === 'player' ? this.api.player : this.api.npc; }
  private fx(owner: Owner): PsychicFx { return owner === 'player' ? this.pfx : this.nfx; }
  private col(owner: Owner): PsychicColorFn { return owner === 'player' ? this.pcol : this.ncol; }
  private body(f: Fighter): Phaser.Physics.Arcade.Body { return f.body as Phaser.Physics.Arcade.Body; }
  private bodyR(f: Fighter): number { return (f.body as Phaser.Physics.Arcade.Body | null)?.radius || 20; }

  private get left(): number { return ARENA_PAD; }
  private get right(): number { return this.api.width - ARENA_PAD; }
  private get top(): number { return ARENA_PAD; }
  private get bottom(): number { return this.api.height - ARENA_PAD; }

  private hex(color: number): string {
    return `#${color.toString(16).padStart(6, '0')}`;
  }

  private alive(f: Fighter | null | undefined): boolean {
    return !!f && f.active && f.hp > 0;
  }

  private isPsychic(owner: Owner): boolean {
    return owner === 'player' ? this.api.elementId === 'psychic' : this.api.npcElementId === 'psychic';
  }

  private avatar(owner: Owner): PsychicAvatar | null {
    return owner === 'player' ? this.playerAvatar : this.npcAvatar;
  }

  private targetsOf(owner: Owner): Fighter[] {
    // In an Invasion the npc slot is on the player's side. A co-op ally's pieces are resolved
    // on its own machine and forwarded; here they must touch nobody, least of all us.
    if (owner === 'npc' && this.api.isInvasion) return [];
    const list = owner === 'player' ? this.api.enemies : [this.api.player];
    return list.filter((f) => this.alive(f) && this.api.isTargetable(f));
  }

  /** Everything this kit ever writes a field on, so a stale multiplier can always be cleared. */
  private allFighters(): Fighter[] {
    const out: Fighter[] = [];
    for (const f of [this.api.player, this.api.npc, ...this.api.enemies]) {
      if (f && !out.includes(f)) out.push(f);
    }
    return out;
  }

  /** True for a body this machine is only rendering — its sim lives on the other machine. */
  private isNetReplica(f: Fighter): boolean {
    return this.api.isOnline && f === this.api.npc;
  }

  private nearestTarget(owner: Owner): Fighter | null {
    const f = this.fighter(owner);
    let best: Fighter | null = null;
    let bestD = Infinity;
    for (const t of this.targetsOf(owner)) {
      const d = Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y);
      if (d < bestD) { bestD = d; best = t; }
    }
    return best;
  }

  private clampX(x: number): number { return Phaser.Math.Clamp(x, this.left, this.right); }
  private clampY(y: number): number { return Phaser.Math.Clamp(y, this.top, this.bottom); }

  private segDist(ax: number, ay: number, bx: number, by: number, px: number, py: number): number {
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy;
    const u = len2 > 0 ? Phaser.Math.Clamp(((px - ax) * dx + (py - ay) * dy) / len2, 0, 1) : 0;
    return Phaser.Math.Distance.Between(ax + dx * u, ay + dy * u, px, py);
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  reset(): void {
    // A rider still in the saddle gets its own invincibility back before the sides are dropped.
    for (const owner of BOTH) this.endRide(owner);
    // Hand every borrowed cast back before dropping the queues, or an ability paid for on the
    // last frame of a match would simply vanish along with the kit's state.
    for (const f of [...this.foreseen]) this.releaseForesight(f, false);
    this.foreseen.clear();
    this.queues.clear();
    this.pieces = [];
    this.pawns = [];
    this.squares = [];
    this.seen.clear();
    this.wasDown = false;
    this.pressMode = null;
    this.npcPlan = null;
    this.npcPlanAt = 0;
    for (const [f, k] of this.outplayedHusk) if (f.active && k > 0) f.attackIntervalMult /= k;
    this.outplayedHusk.clear();
    this.outplayedSeen.clear();
    this.tracks.clear();
    this.framePresses.clear();
    this.pressLog = [];
    this.stuns.clear();
    this.premovedMe = null;
    this.sides = { player: makeSide('player'), npc: makeSide('npc') };
    this.netQueue = [];
    this.netQueueAt = 0;
    this.lastQueueRelayAt = 0;
    this.lastQueueSentAt = 0;
    this.lastRelayedQueue = '';
    this.vizT = 0;

    for (const f of this.allFighters()) {
      if (!f) continue;
      f.psychicIncomingMult = 1;
      f.castDelayMs = 0;
      f.queueDelayedCast = null;
      f.psychicCooldownMult = 1;
    }

    this.playerAvatar?.destroy(); this.playerAvatar = null;
    this.npcAvatar?.destroy(); this.npcAvatar = null;
    this.groundGfx?.destroy(); this.groundGfx = null;
    this.pieceGfx?.destroy(); this.pieceGfx = null;
    this.airGfx?.destroy(); this.airGfx = null;
    for (const t of this.labels) t.destroy();
    this.labels = [];
    this.labelsUsed = 0;
    for (const g of this.ghosts) g.destroy();
    this.ghosts = [];
    this.ghostsUsed = 0;

    for (const id of ['psychic-foresight', 'psychic-grace', 'psychic-stride', 'psychic-might',
      'psychic-queen', 'psychic-premove', 'psychic-outplayed', 'psychic-outplayed-me', 'psychic-premoved',
      'psychic-premove-threat']) {
      this.api.setStatusIndicator(id, null);
    }
  }

  // ── Mastery helpers ────────────────────────────────────────────────────────

  private masteryOn(owner: Owner): boolean {
    return this.isPsychic(owner)
      && (owner === 'player' ? this.api.masteryActive : this.api.npcMasteryActive);
  }

  /** Which of R/F/Q Pre-move was dropped on, or null. */
  private premoveSlot(owner: Owner): 'r' | 'f' | 'q' | null {
    if (!this.masteryOn(owner)) return null;
    for (const s of ['r', 'f', 'q'] as const) {
      const bind = owner === 'player' ? this.api.masteryBindFor(s) : this.api.npcMasteryBindFor(s);
      if (bind === PREMOVE_ID) return s;
    }
    return null;
  }

  private keyFor(slot: 'r' | 'f' | 'q'): Phaser.Input.Keyboard.Key {
    return slot === 'r' ? this.api.rKey : slot === 'f' ? this.api.fKey : this.api.qKey;
  }

  /** That side's psychic owns the shop upgrade in `slot`. */
  private up(owner: Owner, slot: string): boolean {
    return this.isPsychic(owner) && this.api.hasUpgrade(owner, slot);
  }

  private queen(owner: Owner): boolean {
    return this.isPsychic(owner) && this.now < this.side(owner).queenUntil;
  }

  private ensureLayers(): void {
    const { scene } = this.api;
    // Fighters sit at depth 5: auras just under them, pieces among them, readouts over them.
    if (!this.groundGfx) this.groundGfx = scene.add.graphics().setDepth(3);
    if (!this.pieceGfx) this.pieceGfx = scene.add.graphics().setDepth(5);
    if (!this.airGfx) this.airGfx = scene.add.graphics().setDepth(16);
  }

  private ensureAvatars(): void {
    const { scene } = this.api;
    if (this.isPsychic('player') && !this.playerAvatar) {
      this.playerAvatar = new PsychicAvatar(scene, this.pcol);
    }
    if (this.isPsychic('npc') && !this.npcAvatar) {
      this.npcAvatar = new PsychicAvatar(scene, this.ncol);
    }
  }

  // ── Input ──────────────────────────────────────────────────────────────────

  /**
   * One button does three jobs, decided at the moment it goes down:
   *
   * 1. Down on one of your own standing pieces — pick it up (or put it back down).
   * 2. Down anywhere with a piece in hand — move it there, the way that piece moves.
   * 3. Otherwise — throw a pawn, or as the queen, move yourself.
   *
   * Only the third repeats while the button is held, and only as a pawn: a held click that
   * picked something up must not start spraying pawns the moment the piece is put down.
   */
  handleInput(time: number, pointer: Phaser.Input.Pointer, mouseX: number, mouseY: number): void {
    void time;
    if (this.api.elementId !== 'psychic') return;
    const s = this.sides.player;
    s.aimX = mouseX;
    s.aimY = mouseY;

    const p = this.api.player;
    const down = pointer.isDown;
    const pressed = down && !this.wasDown;
    this.wasDown = down;
    if (!down) this.pressMode = null;
    if (!this.alive(p)) return;

    // A selection whose piece has gone (expired, captured, purged) is dropped quietly.
    if (s.selected >= 0 && !this.pieceById('player', s.selected)) s.selected = -1;

    const ctx = this.api.buildPlayerContext(mouseX, mouseY);

    const bound = this.premoveSlot('player');
    if (bound && Phaser.Input.Keyboard.JustDown(this.keyFor(bound))) this.tryCastPremove('player');

    if (pressed) {
      this.pressMode = 'spent';
      const under = this.pieceAt('player', mouseX, mouseY);
      if (under && under.id === s.selected) {
        s.selected = -1;
      } else if (under && !under.move) {
        s.selected = under.id;
        Sfx.playAt('ui-click', under.x, { rate: 1.3, volume: 0.5 });
      } else if (s.selected >= 0) {
        const pc = this.pieceById('player', s.selected);
        if (pc && this.movePiece(pc, mouseX, mouseY)) s.selected = -1;
      } else if (this.queen('player')) {
        this.queenMove('player', mouseX, mouseY);
      } else {
        this.pressMode = 'pawn';
      }
    }
    if (this.pressMode === 'pawn' && !this.queen('player')) {
      p.castAbility('psychic-en-passant', ctx);
    }

    if (Phaser.Input.Keyboard.JustDown(this.api.eKey)) p.castAbility('psychic-bishop', ctx);
    if (bound !== 'r' && Phaser.Input.Keyboard.JustDown(this.api.rKey)) p.castAbility('psychic-knight', ctx);
    if (bound !== 'f' && Phaser.Input.Keyboard.JustDown(this.api.fKey) && !this.tryCastle('player')) {
      p.castAbility('psychic-rook', ctx);
    }
    if (bound !== 'q' && Phaser.Input.Keyboard.JustDown(this.api.qKey)) p.castAbility('psychic-queen', ctx);
  }

  /** Space is not a dash while crowned — the queen only moves the way a queen moves. */
  suppressesDodge(): boolean {
    return this.queen('player');
  }

  // ── Ability entry points (called from build*Context) ───────────────────────

  /**
   * Click — En Passant. A pawn is thrown out of the psychic's hand one decent step toward the
   * cursor, hitting anything it walks into. When it stops it captures like a pawn: on the two
   * diagonals in front of it, harder than the step, and again every second until it goes.
   */
  doEnPassant(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    this.ensureLayers();
    const s = this.side(owner);
    s.aimX = tx;
    s.aimY = ty;
    const ang = Math.atan2(ty - f.y, tx - f.x);
    const fx = this.clampX(f.x + Math.cos(ang) * 18);
    const fy = this.clampY(f.y + Math.sin(ang) * 18);
    const step = Math.min(PAWN_STEP, Math.max(30, Phaser.Math.Distance.Between(fx, fy, tx, ty)));
    this.pawns.push({
      owner, x: fx, y: fy, fx, fy,
      tx: this.clampX(fx + Math.cos(ang) * step),
      ty: this.clampY(fy + Math.sin(ang) * step),
      ang, born: this.now, until: this.now + PAWN_LIFE_MS,
      touched: new Set(), nextStrikeAt: this.now + PAWN_STEP_MS,
      steps: 1, stepAt: this.now,
    });
    this.avatar(owner)?.play('punch', ang);
  }

  doBishop(owner: Owner, tx: number, ty: number): void { this.summon(owner, 'bishop', tx, ty); }
  doKnight(owner: Owner, tx: number, ty: number): void { this.summon(owner, 'knight', tx, ty); }
  doRook(owner: Owner, tx: number, ty: number): void { this.summon(owner, 'rook', tx, ty); }

  /** E/R/F — stand a piece on the cursor. No limit; the cooldowns are the limit. */
  private summon(owner: Owner, kind: PieceKind, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    this.ensureLayers();
    const s = this.side(owner);
    s.aimX = tx;
    s.aimY = ty;
    const x = this.clampX(tx);
    const y = this.clampY(ty);
    this.pieces.push({
      id: s.serial++, kind, owner, x, y,
      born: this.now, until: this.now + PIECE_LIFE_MS,
      readyAt: this.now + 250, move: null,
      face: x >= f.x ? 1 : -1, seed: Math.random() * 999, castled: false,
    });
    this.fx(owner).summonPiece(x, y, kind === 'bishop');
    this.avatar(owner)?.play('slam', Math.atan2(y - f.y, x - f.x));
    const name = kind === 'bishop' ? '✝ BISHOP' : kind === 'knight' ? '♞ KNIGHT' : '♜ ROOK';
    this.api.showFloatingText(x, y - 44, name, this.hex(kind === 'bishop' ? PSY.gold : PSY.violetLit));
  }

  /** Q — become the queen. */
  doQueen(owner: Owner): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    this.ensureLayers();
    const s = this.side(owner);
    s.queenUntil = this.now + QUEEN_MS;
    s.queenReadyAt = this.now + 200;
    s.queenMove = null;
    if (owner === 'player') s.selected = -1;
    this.fx(owner).coronation(f.x, f.y);
    this.avatar(owner)?.play('raise');
    this.api.scene.cameras.main.shake(160, 0.003);
    this.api.showFloatingText(f.x, f.y - 60, '♛ QUEEN', this.hex(PSY.gold));
  }

  /**
   * The bot's click, when the kit has worked out that a move is worth more than a pawn. The
   * plan was made in `update` (where the geometry lives); this only carries it out, and refuses
   * anything that has gone stale since.
   */
  doNpcCommand(tx: number, ty: number): void {
    const plan = this.npcPlan;
    if (!plan || Math.abs(plan.x - tx) > 1 || Math.abs(plan.y - ty) > 1) return;
    this.npcPlan = null;
    if (plan.piece === -2) {
      this.castle('npc');
      return;
    }
    if (plan.piece < 0) {
      this.queenMove('npc', plan.x, plan.y);
      return;
    }
    const pc = this.pieceById('npc', plan.piece);
    if (pc) this.movePiece(pc, plan.x, plan.y);
  }

  // ── The board ──────────────────────────────────────────────────────────────

  private pieceById(owner: Owner, id: number): Piece | null {
    return this.pieces.find((p) => p.owner === owner && p.id === id) ?? null;
  }

  /** The owner's own standing piece under a point, nearest first. */
  private pieceAt(owner: Owner, x: number, y: number): Piece | null {
    let best: Piece | null = null;
    let bestD = PIECE_PICK_R;
    for (const p of this.pieces) {
      if (p.owner !== owner) continue;
      // The hitbox is the piece's body, which stands up off its foot.
      const d = Phaser.Math.Distance.Between(x, y, p.x, p.y - 10);
      if (d <= bestD) { bestD = d; best = p; }
    }
    return best;
  }

  /**
   * How far along a ray a slide can go before leaving the arena.
   */
  private rayRoom(x: number, y: number, dx: number, dy: number): number {
    let room = Infinity;
    if (dx > 1e-6) room = Math.min(room, (this.right - x) / dx);
    if (dx < -1e-6) room = Math.min(room, (this.left - x) / dx);
    if (dy > 1e-6) room = Math.min(room, (this.bottom - y) / dy);
    if (dy < -1e-6) room = Math.min(room, (this.top - y) / dy);
    return Math.max(0, room);
  }

  /**
   * The legal move a piece of `kind` standing at (x, y) would make toward a point.
   *
   * Sliders snap the cursor onto the nearest of their lines — diagonals for a bishop, ranks and
   * files for a rook, all eight for the queen — and travel the cursor's distance along it,
   * clamped to the arena and to the piece's reach. A knight picks whichever of its eight jumps
   * lands nearest the cursor. Null when there is no room to move at all.
   */
  private legalDest(kind: ChessKind, x: number, y: number, tx: number, ty: number): { x: number; y: number } | null {
    if (kind === 'knight') {
      const u = KNIGHT_UNIT;
      let best: { x: number; y: number } | null = null;
      let bestD = Infinity;
      for (const [a, b] of [[2, 1], [1, 2], [-1, 2], [-2, 1], [-2, -1], [-1, -2], [1, -2], [2, -1]]) {
        const lx = x + a * u;
        const ly = y + b * u;
        if (lx < this.left || lx > this.right || ly < this.top || ly > this.bottom) continue;
        const d = Phaser.Math.Distance.Between(lx, ly, tx, ty);
        if (d < bestD) { bestD = d; best = { x: lx, y: ly }; }
      }
      return best;
    }
    const dirs: [number, number][] = [];
    const D = Math.SQRT1_2;
    if (kind !== 'bishop') dirs.push([1, 0], [-1, 0], [0, 1], [0, -1]);
    if (kind !== 'rook') dirs.push([D, D], [D, -D], [-D, D], [-D, -D]);
    const vx = tx - x;
    const vy = ty - y;
    let bestDir: [number, number] | null = null;
    let bestDot = -Infinity;
    for (const d of dirs) {
      const dot = (vx * d[0] + vy * d[1]) / (Math.hypot(vx, vy) || 1);
      if (dot > bestDot && this.rayRoom(x, y, d[0], d[1]) >= SLIDE_MIN) { bestDot = dot; bestDir = d; }
    }
    if (!bestDir) return null;
    const max = kind === 'queen' ? QUEEN_MOVE_MAX : SLIDE_MAX;
    const along = vx * bestDir[0] + vy * bestDir[1];
    const len = Math.min(Phaser.Math.Clamp(along, SLIDE_MIN, max), this.rayRoom(x, y, bestDir[0], bestDir[1]));
    return { x: x + bestDir[0] * len, y: y + bestDir[1] * len };
  }

  /** Pick a piece up and put it down somewhere legal. Returns false when it could not move. */
  private movePiece(pc: Piece, tx: number, ty: number, relayed = false): boolean {
    if (pc.move || this.now < pc.readyAt) return false;
    const dest = this.legalDest(pc.kind, pc.x, pc.y, tx, ty);
    if (!dest) return false;
    const d = Phaser.Math.Distance.Between(pc.x, pc.y, dest.x, dest.y);
    const leap = pc.kind === 'knight';
    pc.move = {
      fx: pc.x, fy: pc.y, tx: dest.x, ty: dest.y, start: this.now,
      ms: leap ? KNIGHT_LEAP_MS : Math.max(120, (d / SLIDE_SPEED) * 1000),
      leap, hit: new Set(),
    };
    if (Math.abs(dest.x - pc.x) > 1) pc.face = dest.x > pc.x ? 1 : -1;
    if (leap) this.tryMount(pc, pc.move);
    // A piece's eight seconds are the piece's, not the move's — moving does not buy it time.
    Sfx.playAt(leap ? 'jump' : 'whoosh', pc.x, { rate: leap ? 1.1 : 1.3, volume: 0.6 });
    if (pc.owner === 'player' && this.api.isOnline && !relayed) {
      this.api.sendPsychicMsg({ t: 'psy', k: 'move', id: pc.id, x: Math.round(dest.x), y: Math.round(dest.y) });
    }
    return true;
  }

  /** The queen moving herself — the psychic's own body sliding along one of eight lines. */
  private queenMove(owner: Owner, tx: number, ty: number): boolean {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (!this.alive(f) || s.queenMove || s.ride || this.now < s.queenReadyAt) return false;
    const dest = this.legalDest('queen', f.x, f.y, tx, ty);
    if (!dest) return false;
    const d = Phaser.Math.Distance.Between(f.x, f.y, dest.x, dest.y);
    // The queen's speed aura is three knights' worth, and it is spent here — she has no legs.
    const speed = QUEEN_SLIDE_SPEED * this.speedMult(owner);
    s.queenMove = {
      fx: f.x, fy: f.y, tx: dest.x, ty: dest.y, start: this.now,
      ms: Math.max(110, (d / speed) * 1000), leap: false, hit: new Set(),
    };
    this.avatar(owner)?.play('dash', Math.atan2(dest.y - f.y, dest.x - f.x));
    Sfx.playAt('whoosh', f.x, { rate: 1.1, volume: 0.8 });
    if (owner === 'player' && this.api.isOnline) {
      this.api.sendPsychicMsg({ t: 'psy', k: 'qmove', x: Math.round(dest.x), y: Math.round(dest.y) });
    }
    return true;
  }

  /** Everything a slide passes through this frame, from `(ax, ay)` to `(bx, by)`. */
  private sweepHits(owner: Owner, m: Move, ax: number, ay: number, bx: number, by: number, dmg: number): void {
    const ang = Math.atan2(m.ty - m.fy, m.tx - m.fx);
    for (const t of this.targetsOf(owner)) {
      if (m.hit.has(t)) continue;
      if (this.segDist(ax, ay, bx, by, t.x, t.y) > SLIDE_HIT_R + this.bodyR(t)) continue;
      m.hit.add(t);
      t.takeDamage(dmg);
      this.smash(owner);
      this.fx(owner).pieceHit(t.x, t.y, ang);
      this.api.spawnHitFlash(t.x, t.y, this.col(owner)(PSY.gold));
      Sfx.playAt('hit-heavy', t.x, { rate: 1.1, volume: 0.7 });
    }
  }

  /**
   * A landing: the knight's, or the queen's. `spared` are bodies the same move already hit on
   * the way through — one move is one hit per body, so a queen slide that ends on top of
   * somebody is not two hits.
   */
  private blast(owner: Owner, x: number, y: number, r: number, dmg: number, spared?: Set<Fighter>): void {
    this.fx(owner).landing(x, y, r);
    Sfx.playAt('explosion-small', x, { rate: 1.15, volume: 0.8 });
    this.api.scene.cameras.main.shake(90, 0.002);
    for (const t of this.targetsOf(owner)) {
      if (spared?.has(t)) continue;
      if (Phaser.Math.Distance.Between(x, y, t.x, t.y) > r + this.bodyR(t) * 0.5) continue;
      t.takeDamage(dmg);
      this.smash(owner);
      this.api.spawnHitFlash(t.x, t.y, this.col(owner)(PSY.violetLit));
    }
  }

  /**
   * The rook taking a piece. Any piece on the board — the enemy's, or your own — except your own
   * pawns, which are too short-lived to be worth stepping on. A bishop, knight or rook taken
   * hands its aura to the rook's owner for 30 seconds, worn wherever they go.
   */
  private captureAlong(rook: Piece, ax: number, ay: number, bx: number, by: number): void {
    for (let i = this.pieces.length - 1; i >= 0; i--) {
      const o = this.pieces[i];
      if (o === rook) continue;
      if (this.segDist(ax, ay, bx, by, o.x, o.y) > CAPTURE_R) continue;
      this.pieces.splice(i, 1);
      this.dropSelection(o);
      if (rook.owner === 'player') this.api.recordMasteryStat('rookCaptures', 1);
      const s = this.side(rook.owner);
      s.stolen.push({ kind: o.kind, until: this.now + STOLEN_AURA_MS });
      this.fx(rook.owner).capture(o.x, o.y);
      Sfx.playAt('crystal-shatter', o.x, { rate: 0.9, volume: 0.8 });
      const what = o.kind === 'bishop' ? "BISHOP'S GRACE" : o.kind === 'knight' ? "KNIGHT'S STRIDE" : "ROOK'S MIGHT";
      const who = this.fighter(rook.owner);
      this.api.showFloatingText(o.x, o.y - 40, '♜ CAPTURED', this.hex(PSY.stress));
      if (this.alive(who)) this.api.showFloatingText(who.x, who.y - 58, `+${what} 30s`, this.hex(PSY.gold));
    }
    for (let i = this.pawns.length - 1; i >= 0; i--) {
      const pw = this.pawns[i];
      if (pw.owner === rook.owner) continue;
      if (this.segDist(ax, ay, bx, by, pw.x, pw.y) > CAPTURE_R) continue;
      this.pawns.splice(i, 1);
      if (rook.owner === 'player') this.api.recordMasteryStat('rookCaptures', 1);
      this.fx(rook.owner).capture(pw.x, pw.y);
    }
  }

  private dropSelection(p: Piece): void {
    const s = this.side(p.owner);
    if (s.selected === p.id) s.selected = -1;
  }

  private updatePieces(): void {
    for (let i = this.pieces.length - 1; i >= 0; i--) {
      const pc = this.pieces[i];
      // A piece outlives nothing of its owner's but its own clock — a dead psychic's board goes.
      if (this.now >= pc.until || !this.alive(this.fighter(pc.owner))) {
        this.pieces.splice(i, 1);
        this.dropSelection(pc);
        this.fx(pc.owner).vanish(pc.x, pc.y);
        continue;
      }
      const m = pc.move;
      if (!m) continue;
      const k = Phaser.Math.Clamp((this.now - m.start) / m.ms, 0, 1);
      const e = m.leap ? k : 1 - (1 - k) * (1 - k);
      const nx = m.fx + (m.tx - m.fx) * e;
      const ny = m.fy + (m.ty - m.fy) * e;
      if (!m.leap) {
        const dmg = pc.kind === 'rook' ? ROOK_DAMAGE : BISHOP_DAMAGE;
        this.sweepHits(pc.owner, m, pc.x, pc.y, nx, ny, dmg);
        if (pc.kind === 'rook') this.captureAlong(pc, pc.x, pc.y, nx, ny);
      }
      pc.x = nx;
      pc.y = ny;
      if (k < 1) continue;
      pc.move = null;
      pc.readyAt = this.now + PIECE_SETTLE_MS;
      if (m.leap) this.blast(pc.owner, pc.x, pc.y, KNIGHT_BLAST_R, KNIGHT_DAMAGE);
      else this.fx(pc.owner).slide(m.fx, m.fy, m.tx, m.ty);
      if (pc.kind === 'bishop' && this.up(pc.owner, 'e')) this.lightDiagonal(pc.owner, m.fx, m.fy, m.tx, m.ty);
    }
  }

  private updatePawns(): void {
    for (let i = this.pawns.length - 1; i >= 0; i--) {
      const pw = this.pawns[i];
      if (this.now >= pw.until || !this.alive(this.fighter(pw.owner))) {
        this.pawns.splice(i, 1);
        this.fx(pw.owner).vanish(pw.x, pw.y);
        continue;
      }
      const k = Phaser.Math.Clamp((this.now - pw.stepAt) / PAWN_STEP_MS, 0, 1);
      if (k < 1 || pw.x !== pw.tx || pw.y !== pw.ty) {
        const e = 1 - (1 - k) * (1 - k);
        const nx = pw.fx + (pw.tx - pw.fx) * e;
        const ny = pw.fy + (pw.ty - pw.fy) * e;
        for (const t of this.targetsOf(pw.owner)) {
          if (pw.touched.has(t)) continue;
          if (this.segDist(pw.x, pw.y, nx, ny, t.x, t.y) > PAWN_TOUCH_R + this.bodyR(t)) continue;
          pw.touched.add(t);
          t.takeDamage(PAWN_TOUCH_DAMAGE);
          this.smash(pw.owner);
          this.api.spawnHitFlash(t.x, t.y, this.col(pw.owner)(PSY.violetLit));
        }
        pw.x = nx;
        pw.y = ny;
      }
      if (this.now < pw.nextStrikeAt) continue;
      pw.nextStrikeAt += PAWN_STRIKE_EVERY_MS;
      const caught = this.pawnStrike(pw);
      // Insight Move: a first capture on empty squares means they are further on — step again.
      if (!caught && pw.steps < PAWN_MAX_STEPS && this.up(pw.owner, 'click')) this.stepAgain(pw);
    }
  }

  /** Insight Move: another full step down the same file, then capture from there. */
  private stepAgain(pw: Pawn): void {
    pw.steps++;
    pw.fx = pw.x;
    pw.fy = pw.y;
    pw.tx = this.clampX(pw.x + Math.cos(pw.ang) * PAWN_STEP);
    pw.ty = this.clampY(pw.y + Math.sin(pw.ang) * PAWN_STEP);
    pw.stepAt = this.now;
    pw.nextStrikeAt = this.now + PAWN_STEP_MS;
    // A fresh step: whoever the first one walked through can be walked through again.
    pw.touched.clear();
    this.fx(pw.owner).insight(pw.x, pw.y - 6, pw.ang);
    Sfx.playAt('whoosh', pw.x, { rate: 1.6, volume: 0.35 });
  }

  /**
   * The capture, on both forward diagonals at once. One hit per body however it is caught.
   * Returns whether it caught anybody.
   */
  private pawnStrike(pw: Pawn): boolean {
    let any = false;
    this.fx(pw.owner).pawnStrike(pw.x, pw.y - 6, pw.ang, PAWN_STRIKE_REACH);
    Sfx.playAt('stab', pw.x, { rate: 1.35, volume: 0.45 });
    for (const t of this.targetsOf(pw.owner)) {
      let caught = false;
      for (const side of [-1, 1]) {
        const a = pw.ang + side * Math.PI / 4;
        const sx = pw.x + Math.cos(a) * PAWN_STRIKE_REACH;
        const sy = pw.y + Math.sin(a) * PAWN_STRIKE_REACH;
        if (this.segDist(pw.x, pw.y, sx, sy, t.x, t.y) <= PAWN_STRIKE_R + this.bodyR(t) * 0.5) caught = true;
      }
      if (!caught) continue;
      any = true;
      t.takeDamage(PAWN_STRIKE_DAMAGE);
      this.smash(pw.owner);
      this.fx(pw.owner).pieceHit(t.x, t.y, pw.ang);
      this.api.spawnHitFlash(t.x, t.y, this.col(pw.owner)(PSY.gold));
    }
    return any;
  }

  private updateQueens(): void {
    for (const owner of BOTH) {
      const s = this.side(owner);
      if (!s.queenUntil) continue;
      const f = this.fighter(owner);
      if (!this.alive(f) || this.now >= s.queenUntil || !this.isPsychic(owner)) {
        // Only a reign that runs its full course ends in checkmate — not a death, not a purge.
        if (this.alive(f) && this.isPsychic(owner) && this.now >= s.queenUntil) this.checkmate(owner);
        this.endQueen(owner);
        continue;
      }
      const m = s.queenMove;
      if (!m) continue;
      const k = Phaser.Math.Clamp((this.now - m.start) / m.ms, 0, 1);
      const e = 1 - (1 - k) * (1 - k);
      const nx = m.fx + (m.tx - m.fx) * e;
      const ny = m.fy + (m.ty - m.fy) * e;
      const ox = f.x;
      const oy = f.y;
      this.sweepHits(owner, m, ox, oy, nx, ny, QUEEN_PATH_DAMAGE);
      // A replica's position is streamed from its own machine; the slide there is the real one.
      if (!this.isNetReplica(f)) this.body(f).reset(nx, ny);
      if (k < 1) continue;
      s.queenMove = null;
      s.queenReadyAt = this.now + QUEEN_SETTLE_MS;
      this.fx(owner).slide(m.fx, m.fy, m.tx, m.ty);
      this.blast(owner, m.tx, m.ty, QUEEN_BLAST_R, QUEEN_BLAST_DAMAGE, m.hit);
    }
  }

  private endQueen(owner: Owner): void {
    const s = this.side(owner);
    if (!s.queenUntil) return;
    s.queenUntil = 0;
    s.queenMove = null;
    const f = this.fighter(owner);
    if (this.alive(f)) {
      this.fx(owner).vanish(f.x, f.y - 30);
      this.api.showFloatingText(f.x, f.y - 50, 'CROWN LIFTED', this.hex(PSY.violetLit));
    }
  }

  // ── Shop upgrades ──────────────────────────────────────────────────────────

  /**
   * R+ Mount Protect: a knight moved while its owner stands in its aura carries them. The rider
   * leaves from where they stand and comes down just in front of the knight's landing, over the
   * same leap, and cannot be hurt until they are down.
   */
  private tryMount(pc: Piece, m: Move): void {
    const owner = pc.owner;
    if (!this.up(owner, 'r')) return;
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (!this.alive(f) || s.ride || s.queenMove) return;
    if (Phaser.Math.Distance.Between(pc.x, pc.y, f.x, f.y) > AURA_R) return;
    s.ride = {
      piece: pc.id, who: f, fx: f.x, fy: f.y,
      tx: m.tx, ty: this.clampY(m.ty + RIDE_LAND_DY),
      start: m.start, ms: m.ms, saved: f.isInvincible,
    };
    // A replica's body and its invincibility both belong to the machine that owns it: the leap
    // there is the real one, and this copy only draws the saddle.
    if (!this.isNetReplica(f)) f.isInvincible = true;
    this.avatar(owner)?.play('dash', Math.atan2(m.ty - f.y, m.tx - f.x));
    this.api.showFloatingText(f.x, f.y - 50, '🐎 MOUNTED', this.hex(PSY.gold));
  }

  /** Carry each rider along their leap on its own clock — the knight being taken mid-air does not drop them. */
  private updateRides(): void {
    for (const owner of BOTH) {
      const r = this.side(owner).ride;
      if (!r) continue;
      if (!this.alive(r.who) || this.fighter(owner) !== r.who) { this.endRide(owner); continue; }
      const k = Phaser.Math.Clamp((this.now - r.start) / r.ms, 0, 1);
      if (!this.isNetReplica(r.who)) {
        this.body(r.who).reset(r.fx + (r.tx - r.fx) * k, r.fy + (r.ty - r.fy) * k);
      }
      if (k >= 1) this.endRide(owner);
    }
  }

  private endRide(owner: Owner): void {
    const s = this.side(owner);
    const r = s.ride;
    if (!r) return;
    s.ride = null;
    if (!this.isNetReplica(r.who) && r.who.active) r.who.isInvincible = r.saved;
  }

  /**
   * E+ Sight Lines: the diagonal a bishop just slid down, lit square by square from where it
   * started to where it landed. Squares sit corner to corner, so the line is a real diagonal.
   */
  private lightDiagonal(owner: Owner, fx: number, fy: number, tx: number, ty: number): void {
    const d = Phaser.Math.Distance.Between(fx, fy, tx, ty);
    const n = Math.max(1, Math.round(d / (SIGHT_SQUARE * Math.SQRT2)));
    for (let i = 0; i <= n; i++) {
      const k = i / n;
      const born = this.now + i * SIGHT_RIPPLE_MS;
      this.squares.push({
        owner, x: fx + (tx - fx) * k, y: fy + (ty - fy) * k,
        born, until: born + SIGHT_MS, seed: Math.random() * 999, hit: new Set(),
      });
    }
  }

  private updateSquares(): void {
    for (let i = this.squares.length - 1; i >= 0; i--) {
      const q = this.squares[i];
      if (this.now >= q.until) { this.squares.splice(i, 1); continue; }
      if (this.now < q.born) continue;
      const side = this.side(q.owner);
      for (const t of this.targetsOf(q.owner)) {
        if (q.hit.has(t)) continue;
        const reach = SIGHT_SQUARE / 2 + this.bodyR(t) * 0.4;
        if (Math.abs(t.x - q.x) > reach || Math.abs(t.y - q.y) > reach) continue;
        q.hit.add(t);
        if (this.now - (side.sightHitAt.get(t) ?? -Infinity) < SIGHT_HIT_GAP_MS) continue;
        side.sightHitAt.set(t, this.now);
        t.takeDamage(SIGHT_DAMAGE);
        this.api.spawnHitFlash(t.x, t.y, this.col(q.owner)(PSY.gold));
      }
    }
  }

  /** F+ Castle: the newest rook of that side's that has not castled yet and is standing still. */
  private castleRook(owner: Owner): Piece | null {
    let best: Piece | null = null;
    for (const p of this.pieces) {
      if (p.owner !== owner || p.kind !== 'rook' || p.castled || p.move) continue;
      if (!best || p.id > best.id) best = p;
    }
    return best;
  }

  /** The F key with Castle owned: true when it was spent on castling rather than on a new rook. */
  private tryCastle(owner: Owner): boolean {
    if (!this.up(owner, 'f') || !this.castleRook(owner)) return false;
    this.castle(owner);
    return true;
  }

  /**
   * Castle: king and rook trade squares. Bypasses `castAbility` (it costs no cooldown), so the
   * refusals that would stop a rook cast are repeated here.
   */
  private castle(owner: Owner): boolean {
    const f = this.fighter(owner);
    const s = this.side(owner);
    const rook = this.castleRook(owner);
    if (!rook || !this.alive(f) || s.ride || s.queenMove) return false;
    const wall = Date.now();
    if (wall < f.disarmedUntil || wall < f.chickenUntil || wall < f.silencedUntil
      || wall < f.stunnedUntil || f.lockRemaining('psychic-rook') > 0) return false;
    const kx = f.x;
    const ky = f.y;
    if (!this.isNetReplica(f)) this.body(f).reset(rook.x, rook.y);
    this.fx(owner).summonPiece(rook.x, rook.y);
    this.landCastle(owner, rook, kx, ky);
    if (owner === 'player') this.api.recordMasteryStat('castles', 1);
    if (owner === 'player' && this.api.isOnline) {
      this.api.sendPsychicMsg({ t: 'psy', k: 'castle', id: rook.id, x: Math.round(kx), y: Math.round(ky) });
    }
    return true;
  }

  /** The rook coming down where the king stood, and the slam it makes. */
  private landCastle(owner: Owner, rook: Piece, x: number, y: number): void {
    const fromX = rook.x;
    const fromY = rook.y;
    rook.x = this.clampX(x);
    rook.y = this.clampY(y);
    rook.move = null;
    rook.castled = true;
    rook.readyAt = Math.max(rook.readyAt, this.now + 400);
    if (Math.abs(rook.x - fromX) > 1) rook.face = rook.x > fromX ? 1 : -1;
    this.ensureLayers();
    this.fx(owner).castle(fromX, fromY, rook.x, rook.y, CASTLE_R);
    Sfx.playAt('explosion-small', rook.x, { rate: 0.9, volume: 0.8 });
    this.api.scene.cameras.main.shake(110, 0.0025);
    this.avatar(owner)?.play('slam', Math.atan2(rook.y - fromY, rook.x - fromX));
    this.api.showFloatingText(rook.x, rook.y - 44, '♜ CASTLED', this.hex(PSY.stress));
    for (const t of this.targetsOf(owner)) {
      if (Phaser.Math.Distance.Between(rook.x, rook.y, t.x, t.y) > CASTLE_R + this.bodyR(t) * 0.5) continue;
      t.takeDamage(CASTLE_DAMAGE);
      this.smash(owner);
      this.api.spawnHitFlash(t.x, t.y, this.col(owner)(PSY.stress));
    }
  }

  /**
   * Q+ Checkmate: a reign that runs its full course ends every enemy below 15% health. Online the
   * psychic's own machine resolves it against the replica and the kill is relayed, so the
   * victim's copy of the opponent's queen does not try it a second time.
   */
  private checkmate(owner: Owner): void {
    if (!this.up(owner, 'q') || this.isNetReplica(this.fighter(owner))) return;
    let any = false;
    for (const t of this.targetsOf(owner)) {
      if (t.maxHp <= 0 || t.hp / t.maxHp >= CHECKMATE_FRAC) continue;
      any = true;
      this.ensureLayers();
      this.fx(owner).checkmate(t.x, t.y);
      this.api.showFloatingText(t.x, t.y - 72, '♚ CHECKMATE', this.hex(PSY.gold));
      t.takeDamage(t.hp, { trueDamage: true });
      // The reign ran its course, so every checkmate is one delivered as the queen.
      if (owner === 'player') this.api.recordMasteryStat('queenCheckmates', 1);
    }
    if (!any) return;
    Sfx.playAt('status-curse', this.fighter(owner).x, { rate: 0.8, volume: 0.9 });
    this.api.scene.cameras.main.shake(220, 0.004);
  }

  // ── The auras ──────────────────────────────────────────────────────────────

  /** How many of `kind`'s auras are on that side's psychic right now, stolen ones included. */
  private stacks(owner: Owner, kind: PieceKind): number {
    const f = this.fighter(owner);
    if (!this.isPsychic(owner) || !this.alive(f)) return 0;
    let n = 0;
    for (const p of this.pieces) {
      if (p.owner !== owner || p.kind !== kind) continue;
      if (Phaser.Math.Distance.Between(p.x, p.y, f.x, f.y) <= AURA_R) n++;
    }
    for (const st of this.side(owner).stolen) if (st.kind === kind && st.until > this.now) n++;
    return n;
  }

  /** The queen is every aura at three times the size, multiplied onto whatever else is up. */
  private queenStep(owner: Owner): number {
    return this.queen(owner) ? AURA_STEP * QUEEN_MULT : 0;
  }

  /** Damage taken, ×. The bishop's light. */
  private guardMult(owner: Owner): number {
    return Math.pow(1 - AURA_STEP, this.stacks(owner, 'bishop')) * (1 - this.queenStep(owner));
  }

  /** Movement speed, ×. The knight's stride. */
  private speedMult(owner: Owner): number {
    return Math.pow(1 + AURA_STEP, this.stacks(owner, 'knight')) * (1 + this.queenStep(owner));
  }

  /** Damage dealt, ×. The rook's might. */
  private mightMult(owner: Owner): number {
    return Math.pow(1 + AURA_STEP, this.stacks(owner, 'rook')) * (1 + this.queenStep(owner));
  }

  /**
   * Rewritten from scratch onto every body each frame — the Justice pattern — so an aura that
   * is walked out of between two ticks can never leave a stale multiplier behind.
   */
  private applyAuras(): void {
    for (const f of this.allFighters()) if (f) f.psychicIncomingMult = 1;
    for (const owner of BOTH) {
      const s = this.side(owner);
      s.stolen = s.stolen.filter((st) => st.until > this.now);
      if (!this.isPsychic(owner)) continue;
      const f = this.fighter(owner);
      if (!this.alive(f)) continue;
      f.psychicIncomingMult *= this.guardMult(owner);
      const might = this.mightMult(owner);
      if (might !== 1) for (const t of this.targetsOf(owner)) t.psychicIncomingMult *= might;
    }
  }

  // ── The bot's board sense ──────────────────────────────────────────────────

  /**
   * Work out the best thing the bot's click could do with the board this tick, owner-side, so
   * the AI never has to re-derive a single line of chess. In order:
   *
   * 1. As the queen, a line that runs through the target (or as close to them as a line goes).
   * 2. Any piece whose legal move passes through the target, or (a knight) lands its blast on
   *    them — the target's position is led by a fraction of the move's own travel time.
   * 3. A rook that can take one of the bot's own bishops or knights for the 30-second aura,
   *    when it has nothing better to hit.
   *
   * Read by ArenaScene into `NpcAiState` and side-effect-free from there on.
   */
  private planNpc(): void {
    if (this.now - this.npcPlanAt < NPC_PLAN_MS) return;
    this.npcPlanAt = this.now;
    this.npcPlan = null;
    if (!this.isPsychic('npc') || this.api.isOnline) return;
    const f = this.api.npc;
    const t = this.nearestTarget('npc');
    if (!this.alive(f) || !t) return;
    const vel = this.velocityOf(t);
    const lead = (s: number): { x: number; y: number } => ({
      x: this.clampX(t.x + vel.x * s), y: this.clampY(t.y + vel.y * s),
    });
    const reach = SLIDE_HIT_R + this.bodyR(t) - 6;
    const s = this.sides.npc;
    const gap = Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y);

    // Castle (F+): the target is on top of us — trade squares with the rook, and the slam comes
    // down on them where we were standing. Worth it only when the rook is somewhere else.
    if (this.up('npc', 'f') && !s.ride && !s.queenMove && gap <= NPC_CASTLE_TRIGGER) {
      const rook = this.castleRook('npc');
      if (rook && Phaser.Math.Distance.Between(rook.x, rook.y, t.x, t.y) > 150) {
        this.npcPlan = { piece: -2, x: rook.x, y: rook.y };
        return;
      }
    }

    if (this.queen('npc')) {
      if (s.queenMove || this.now < s.queenReadyAt) return;
      const at = lead(0.2);
      const dest = this.legalDest('queen', f.x, f.y, at.x + (at.x - f.x) * 0.15, at.y + (at.y - f.y) * 0.15);
      if (!dest) return;
      const onLine = this.segDist(f.x, f.y, dest.x, dest.y, at.x, at.y) <= reach;
      const lands = Phaser.Math.Distance.Between(dest.x, dest.y, at.x, at.y) <= QUEEN_BLAST_R;
      // Off any line, the queen still walks: she has no other way to close.
      if (onLine || lands || Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y) > 140) {
        this.npcPlan = { piece: -1, x: dest.x, y: dest.y };
      }
      return;
    }

    // Mount Protect (R+): hurt and crowded — ride a knight away from them, untouchable in the air.
    if (this.up('npc', 'r') && !s.ride && f.hp / f.maxHp < NPC_RIDE_ESCAPE_HP && gap <= NPC_RIDE_ESCAPE_RANGE) {
      const away = Math.atan2(f.y - t.y, f.x - t.x);
      for (const pc of this.pieces) {
        if (pc.owner !== 'npc' || pc.kind !== 'knight' || pc.move || this.now < pc.readyAt) continue;
        if (Phaser.Math.Distance.Between(pc.x, pc.y, f.x, f.y) > AURA_R) continue;
        const dest = this.legalDest('knight', pc.x, pc.y, pc.x + Math.cos(away) * 300, pc.y + Math.sin(away) * 300);
        if (dest && Phaser.Math.Distance.Between(dest.x, dest.y, t.x, t.y) > gap + 40) {
          this.npcPlan = { piece: pc.id, x: dest.x, y: dest.y };
          return;
        }
      }
    }

    for (const pc of this.pieces) {
      if (pc.owner !== 'npc' || pc.move || this.now < pc.readyAt) continue;
      const at = lead(pc.kind === 'knight' ? KNIGHT_LEAP_MS / 1000 : 0.25);
      if (pc.kind === 'knight') {
        const dest = this.legalDest('knight', pc.x, pc.y, at.x, at.y);
        if (dest && Phaser.Math.Distance.Between(dest.x, dest.y, at.x, at.y) <= KNIGHT_BLAST_R * 0.8) {
          this.npcPlan = { piece: pc.id, x: dest.x, y: dest.y };
          return;
        }
        continue;
      }
      // Aim past them so the slide goes all the way through rather than stopping short.
      const ang = Math.atan2(at.y - pc.y, at.x - pc.x);
      const dest = this.legalDest(pc.kind, pc.x, pc.y, at.x + Math.cos(ang) * 60, at.y + Math.sin(ang) * 60);
      if (dest && this.segDist(pc.x, pc.y, dest.x, dest.y, at.x, at.y) <= reach) {
        this.npcPlan = { piece: pc.id, x: dest.x, y: dest.y };
        return;
      }
    }

    // Nothing to hit: a rook eats one of the bot's own pieces for its aura, if one is on a line.
    for (const rook of this.pieces) {
      if (rook.owner !== 'npc' || rook.kind !== 'rook' || rook.move || this.now < rook.readyAt) continue;
      for (const o of this.pieces) {
        if (o === rook || o.owner !== 'npc' || o.kind === 'rook') continue;
        // Only once the piece has done most of its job — a fresh bishop is worth more standing.
        if (o.until - this.now > PIECE_LIFE_MS * 0.5) continue;
        const dest = this.legalDest('rook', rook.x, rook.y, o.x, o.y);
        if (dest && this.segDist(rook.x, rook.y, dest.x, dest.y, o.x, o.y) <= CAPTURE_R - 4) {
          this.npcPlan = { piece: rook.id, x: dest.x, y: dest.y };
          return;
        }
      }
    }
  }

  /**
   * Where the bot should stand a fresh piece, so that the move after it is already lined up.
   *
   * A bishop goes on a diagonal through the target, a rook on a rank or file through them and a
   * knight one jump away from them — each at the candidate nearest the bot, so the aura it
   * brings is also somewhere the bot can stand in.
   */
  npcPlaceFor(kind: PieceKind): { x: number; y: number } | undefined {
    const f = this.api.npc;
    const t = this.nearestTarget('npc');
    if (!this.alive(f) || !t) return undefined;
    const cands: { x: number; y: number }[] = [];
    if (kind === 'knight') {
      const u = KNIGHT_UNIT;
      for (const [a, b] of [[2, 1], [1, 2], [-1, 2], [-2, 1], [-2, -1], [-1, -2], [1, -2], [2, -1]]) {
        cands.push({ x: t.x + a * u, y: t.y + b * u });
      }
    } else {
      const D = Math.SQRT1_2;
      const dirs: [number, number][] = kind === 'bishop'
        ? [[D, D], [D, -D], [-D, D], [-D, -D]]
        : [[1, 0], [-1, 0], [0, 1], [0, -1]];
      for (const d of dirs) for (const r of [130, 190]) cands.push({ x: t.x + d[0] * r, y: t.y + d[1] * r });
    }
    let best: { x: number; y: number } | undefined;
    let bestD = Infinity;
    for (const c of cands) {
      if (c.x < this.left + 8 || c.x > this.right - 8 || c.y < this.top + 8 || c.y > this.bottom - 8) continue;
      const d = Phaser.Math.Distance.Between(f.x, f.y, c.x, c.y);
      if (d < bestD) { bestD = d; best = c; }
    }
    return best;
  }

  // ── Opened Eyes: the queue ─────────────────────────────────────────────────

  /**
   * Install or remove the delayed-cast hook on everyone who should be under it. Online the
   * psychic never touches the replica — the person behind it delays their own casts on their
   * own machine and sends the queue back.
   */
  private updateForesight(): void {
    const want = new Map<Fighter, number>();
    if (this.isPsychic('npc') && this.alive(this.api.npc) && !this.api.isInvasion) {
      want.set(this.api.player, FORESIGHT_MS);
    }
    if (this.isPsychic('player') && this.alive(this.api.player) && !this.api.isOnline) {
      for (const f of this.targetsOf('player')) want.set(f, FORESIGHT_MS);
    }
    for (const f of [...this.foreseen]) {
      if (!want.has(f)) this.releaseForesight(f, true);
    }
    for (const [f, ms] of want) {
      f.castDelayMs = ms;
      if (this.foreseen.has(f)) continue;
      f.queueDelayedCast = (id, delay, fire) => this.enqueue(f, id, delay, fire);
      this.foreseen.add(f);
    }
  }

  /**
   * Give a fighter its casts back. Anything still queued fires immediately rather than being
   * dropped: it was paid for at the press.
   */
  private releaseForesight(f: Fighter, fire: boolean): void {
    f.castDelayMs = 0;
    f.queueDelayedCast = null;
    this.foreseen.delete(f);
    const q = this.queues.get(f);
    this.queues.delete(f);
    if (!fire || !q || !this.alive(f)) return;
    for (const e of q) e.fire();
  }

  private enqueue(f: Fighter, abilityId: string, ms: number, fire: () => void): boolean {
    if (!this.alive(f)) return false;
    const ability = f.element.abilities.find((a) => a.id === abilityId);
    const q = this.queues.get(f) ?? [];
    q.push({
      id: abilityId,
      key: ability?.displayKey ?? '?',
      name: ability?.name ?? abilityId,
      big: !!ability?.isUltimate,
      at: this.now + ms,
      pressed: this.now,
      fire,
    });
    q.sort((a, b) => a.at - b.at);
    this.queues.set(f, q);
    return true;
  }

  private updateQueues(): void {
    for (const [f, q] of [...this.queues]) {
      if (!this.alive(f)) { this.queues.delete(f); continue; }
      while (q.length && q[0].at <= this.now) {
        const e = q.shift() as Queued;
        e.fire();
      }
      if (!q.length) this.queues.delete(f);
    }
  }

  /**
   * Everything the psychic is holding, across every enemy, as cards soonest-first. `left` is the
   * fraction of the hold still to run, which is what the fuse on each card shows.
   */
  private cardsFor(owner: Owner): { key: string; name: string; big: boolean; left: number; secs: number }[] {
    const out: { key: string; name: string; big: boolean; left: number; secs: number; at: number }[] = [];
    if (owner === 'player' && this.isNetReplica(this.api.npc)) {
      if (this.now - this.netQueueAt > QUEUE_STALE_MS) return [];
      const since = this.now - this.netQueueAt;
      for (const e of this.netQueue) {
        const a = this.api.npc.element.abilities.find((ab) => ab.id === e.id);
        const ms = Math.max(0, e.left - since);
        out.push({
          key: a?.displayKey ?? '?', name: a?.name ?? e.id, big: !!a?.isUltimate,
          left: ms / FORESIGHT_MS, secs: ms / 1000, at: ms,
        });
      }
    } else {
      for (const t of this.targetsOf(owner)) {
        for (const e of this.queues.get(t) ?? []) {
          const ms = Math.max(0, e.at - this.now);
          out.push({
            key: e.key, name: e.name, big: e.big,
            left: ms / Math.max(1, e.at - e.pressed), secs: ms / 1000, at: e.at,
          });
        }
      }
    }
    out.sort((a, b) => a.at - b.at);
    return out.slice(0, CARDS_SHOWN);
  }

  /** Online: tell the psychic what our own sim is holding, soonest first, with time left. */
  private relayQueue(): void {
    if (!this.api.isOnline || !this.isPsychic('npc')) return;
    if (this.now - this.lastQueueRelayAt < QUEUE_RELAY_MS) return;
    this.lastQueueRelayAt = this.now;
    const q = (this.queues.get(this.api.player) ?? []).slice(0, CARDS_SHOWN);
    const ids = q.map((e) => e.id);
    const ms = q.map((e) => Math.max(0, Math.round(e.at - this.now)));
    const sig = ids.join(',');
    // Resent on a heartbeat as well as on change: the receiver treats a mirror older than
    // 1.2 s as gone, so a queue that happens to sit unchanged must not go quiet.
    if (sig === this.lastRelayedQueue && this.now - this.lastQueueSentAt < 700) return;
    this.lastRelayedQueue = sig;
    this.lastQueueSentAt = this.now;
    this.api.sendPsychicMsg({ t: 'psy', k: 'queue', ids, ms });
  }

  // ── Online ─────────────────────────────────────────────────────────────────

  handleNetMsg(msg: NetPsychicMsg): void {
    switch (msg.k) {
      case 'queue':
        this.netQueue = msg.ids.slice(0, CARDS_SHOWN).map((id, i) => ({ id, left: msg.ms[i] ?? 0 }));
        this.netQueueAt = this.now;
        break;
      case 'move': {
        // Their piece, on our board. Spawns arrived through the ordinary cast relay, so the
        // serial on it is the same one their machine gave it.
        const pc = this.pieceById('npc', msg.id);
        if (pc) {
          // A move that lands while the replayed piece is still settling is honoured anyway —
          // their machine already allowed it.
          pc.readyAt = 0;
          if (pc.move) { pc.x = pc.move.tx; pc.y = pc.move.ty; pc.move = null; }
          this.movePiece(pc, msg.x, msg.y, true);
        }
        break;
      }
      case 'qmove': {
        const f = this.api.npc;
        if (!this.alive(f)) break;
        const s = this.sides.npc;
        // The body is streamed; this slide is only here so its hits and its landing are drawn
        // (and resolved, attacker-side, by the machine that owns them).
        s.queenMove = {
          fx: f.x, fy: f.y, tx: msg.x, ty: msg.y, start: this.now,
          ms: Math.max(110, (Phaser.Math.Distance.Between(f.x, f.y, msg.x, msg.y) / QUEEN_SLIDE_SPEED) * 1000),
          leap: false, hit: new Set(),
        };
        break;
      }
      case 'castle': {
        // Their castle: their body teleport is streamed; the rook and its slam are ours to draw.
        const rook = this.pieceById('npc', msg.id);
        if (rook) this.landCastle('npc', rook, msg.x, msg.y);
        break;
      }
      case 'premove': {
        // Their prediction, armed against us on our own sim — the one that can read our keys.
        const s = this.sides.npc;
        if (!this.isPsychic('npc')) break;
        s.premoveChoosingUntil = 0;
        s.premoveKey = PREMOVE_KEYS.includes(msg.key as PremoveKey) ? msg.key as PremoveKey : null;
        s.premoveUntil = this.now + Math.min(PREMOVE_WINDOW_MS, Math.max(0, msg.ms));
        // Primed now, so a key we were already holding does not count as a press.
        this.tracks.delete(this.api.player);
        break;
      }
      case 'premoved': {
        // Our prediction caught them on their machine. The stun, the slow and the cooldown are
        // already theirs; the burst is ours to deal, so it rides the normal damage relay.
        const t = this.api.npc;
        const s = this.sides.player;
        s.premoveKey = null;
        s.premoveUntil = 0;
        if (!this.alive(t) || !this.isPsychic('player')) break;
        this.premoveBurst('player', t, msg.key as PremoveKey);
        break;
      }
      default:
        break;
    }
  }

  // ── Projection ─────────────────────────────────────────────────────────────

  /** Track every body's velocity from where it actually went, for anything with no plan. */
  private observe(): void {
    for (const f of this.allFighters()) {
      if (!this.alive(f)) { this.seen.delete(f); continue; }
      const o = this.seen.get(f);
      if (!o) { this.seen.set(f, { x: f.x, y: f.y, vx: 0, vy: 0, at: this.now }); continue; }
      const dt = (this.now - o.at) / 1000;
      if (dt <= 0) continue;
      // Smoothed, so a replica's 20 Hz position stream does not make the shadow stutter.
      const k = Math.min(1, dt * 8);
      o.vx += ((f.x - o.x) / dt - o.vx) * k;
      o.vy += ((f.y - o.y) / dt - o.vy) * k;
      o.x = f.x;
      o.y = f.y;
      o.at = this.now;
    }
  }

  private velocityOf(f: Fighter): { x: number; y: number } {
    const o = this.seen.get(f);
    if (o && !this.isNetReplica(f) && f.body) {
      const b = this.body(f);
      return { x: b.velocity.x, y: b.velocity.y };
    }
    return o ? { x: o.vx, y: o.vy } : { x: 0, y: 0 };
  }

  /**
   * The next `ms` of a body's movement, as a polyline.
   *
   * For a bot this is not a guess: `NpcOpponent.movementPlan` hands over the exact locomotion
   * rule it is following this tick, and it is replayed forward against the player's current
   * position. A body with no plan (a replica, a husk) falls back to dead reckoning off the
   * velocity it has actually been moving at.
   */
  private projectPath(f: Fighter, ms: number): { x: number; y: number }[] {
    const steps = Math.max(4, Math.round(ms / PATH_STEP_MS));
    const dt = ms / 1000 / steps;
    const pts: { x: number; y: number }[] = [{ x: f.x, y: f.y }];
    const plan = (f as unknown as { movementPlan?: MovementPlan }).movementPlan;
    const px = this.api.player.x;
    const py = this.api.player.y;
    let x = f.x;
    let y = f.y;

    if (plan && !this.isNetReplica(f)) {
      if (plan.frozen) return pts;
      for (let i = 0; i < steps; i++) {
        const d = Phaser.Math.Distance.Between(x, y, px, py);
        const toward = Math.atan2(py - y, px - x);
        const closing = d > plan.range;
        const a = closing ? toward : toward + plan.strafe * (Math.PI / 2);
        const sp = plan.speed * (closing ? 1 : 0.6);
        x = this.clampX(x + Math.cos(a) * sp * dt);
        y = this.clampY(y + Math.sin(a) * sp * dt);
        pts.push({ x, y });
      }
      return pts;
    }

    let { x: vx, y: vy } = this.velocityOf(f);
    if (Math.hypot(vx, vy) < 8) return pts;
    for (let i = 0; i < steps; i++) {
      x = this.clampX(x + vx * dt);
      y = this.clampY(y + vy * dt);
      vx *= 0.97;
      vy *= 0.97;
      pts.push({ x, y });
    }
    return pts;
  }

  /** Where a body will be standing `ms` from now, or null when it is not going anywhere. */
  private futureOf(f: Fighter, ms: number, minDist: number): { x: number; y: number } | null {
    const pts = this.projectPath(f, ms);
    const end = pts[pts.length - 1];
    return Phaser.Math.Distance.Between(end.x, end.y, f.x, f.y) < minDist ? null : end;
  }

  // ── Mastery: requirements ──────────────────────────────────────────────────

  /** Every hit a piece, a pawn or the queen lands for the player is one smash. */
  private smash(owner: Owner): void {
    if (owner === 'player') this.api.recordMasteryStat('pieceSmashes', 1);
  }

  // ── Outplayed (mastery passive) ────────────────────────────────────────────

  /** 0 when they are not far enough behind, else 1–3. */
  private outplayedTier(owner: Owner, t: Fighter): number {
    const f = this.fighter(owner);
    if (!this.masteryOn(owner) || !this.alive(f) || !this.alive(t) || f.maxHp <= 0 || t.maxHp <= 0) return 0;
    const gap = (f.hp / f.maxHp - t.hp / t.maxHp) * 100;
    for (let i = 0; i < OUTPLAYED_TIERS.length; i++) {
      if (gap >= OUTPLAYED_TIERS[i].gap) return OUTPLAYED_TIERS.length - i;
    }
    return 0;
  }

  private outplayedMult(tier: number): number {
    return tier > 0 ? OUTPLAYED_TIERS[OUTPLAYED_TIERS.length - tier].mult : 1;
  }

  /**
   * Rewritten onto every body each frame. A fighter's cooldowns read `psychicCooldownMult`; a
   * husk has no cooldowns, only an attack cadence, so its share of `attackIntervalMult` is
   * tracked and swapped rather than written over (other kits own the rest of that field).
   *
   * Online, the victim's sim never writes it on itself: the psychic's machine writes it on its
   * replica of us and it arrives as the `cd` vital, the same way every attacker-side cooldown
   * factor does. The tier is still worked out here, for the aura and the tray.
   */
  private applyOutplayed(): void {
    const want = new Map<Fighter, number>();
    for (const owner of BOTH) {
      if (!this.masteryOn(owner)) continue;
      for (const t of this.targetsOf(owner)) {
        const tier = this.outplayedTier(owner, t);
        const prev = this.outplayedSeen.get(t) ?? 0;
        if (tier > prev && this.alive(t)) {
          this.ensureLayers();
          const pct = Math.round((this.outplayedMult(tier) - 1) * 100);
          this.api.showFloatingText(t.x, t.y - 62, `♟ OUTPLAYED +${pct}% CD`, this.hex(OUTPLAY.lit));
          this.fx(owner).mote(t.x, t.y - 10);
        }
        this.outplayedSeen.set(t, tier);
        if (owner === 'npc' && this.api.isOnline) continue;
        want.set(t, Math.max(want.get(t) ?? 1, this.outplayedMult(tier)));
      }
    }
    for (const f of this.allFighters()) {
      if (!f) continue;
      const m = want.get(f) ?? 1;
      if (f === this.api.player || f === this.api.npc) {
        f.psychicCooldownMult = m;
        continue;
      }
      const had = this.outplayedHusk.get(f) ?? 1;
      if (had !== m && f.active) f.attackIntervalMult *= m / had;
      if (m === 1) this.outplayedHusk.delete(f);
      else this.outplayedHusk.set(f, m);
    }
    // Husks that have left the field take their share with them.
    for (const f of [...this.outplayedHusk.keys()]) if (!f.active) this.outplayedHusk.delete(f);
    for (const f of [...this.outplayedSeen.keys()]) if (!f.active) this.outplayedSeen.delete(f);
  }

  // ── Pre-move (mastery ability): reading keys ───────────────────────────────

  /**
   * The keys a body is holding this frame. The local player's are their real keys; anything else
   * (a bot, a husk) has no keys, so its "keys" are read off what it is doing — the direction it
   * is moving, and a bot's projectile dodge for Space. Its ability presses come in separately
   * through `Fighter.lastPressAt`, which is stamped at the press, before any Opened Eyes queue.
   */
  private keysDown(f: Fighter): Record<PremoveKey, boolean> {
    if (f === this.api.player) {
      const { api } = this;
      return {
        click: api.pointer.leftButtonDown(), e: api.eKey.isDown, r: api.rKey.isDown, f: api.fKey.isDown,
        q: api.qKey.isDown, space: api.spaceKey.isDown,
        w: api.wKey.isDown, a: api.aKey.isDown, s: api.sKey.isDown, d: api.dKey.isDown,
      };
    }
    const v = this.velocityOf(f);
    return {
      click: false, e: false, r: false, f: false, q: false,
      space: Date.now() - f.dodgingAt < 120,
      w: v.y < -PRESS_SPEED, a: v.x < -PRESS_SPEED, s: v.y > PRESS_SPEED, d: v.x > PRESS_SPEED,
    };
  }

  /** A husk's attack clock. Husks are not `NpcOpponent`s and press nothing; their attack is their Click. */
  private huskAttackClock(f: Fighter): number {
    if (f === this.api.player || f === this.api.npc) return 0;
    const h = f as unknown as { nextAttackAt?: number; nextBiteAt?: number };
    return Math.max(h.nextAttackAt ?? 0, h.nextBiteAt ?? 0);
  }

  /** The key an ability of this body's is pressed on. */
  private keyOfAbility(f: Fighter, abilityId: string): PremoveKey | null {
    const a = f.element.abilities.find((ab) => ab.id === abilityId);
    const k = a?.displayKey.toLowerCase();
    return k && PREMOVE_KEYS.includes(k as PremoveKey) ? k as PremoveKey : null;
  }

  /** Fresh presses since last frame. A body seen for the first time is only primed. */
  private readPresses(f: Fighter): PremoveKey[] {
    const down = this.keysDown(f);
    const atk = this.huskAttackClock(f);
    const tr = this.tracks.get(f);
    if (!tr) {
      this.tracks.set(f, { down, pressAt: f.lastPressAt, atk });
      return [];
    }
    const out: PremoveKey[] = [];
    for (const k of PREMOVE_KEYS) if (down[k] && !tr.down[k]) out.push(k);
    if (f !== this.api.player) {
      if (f.lastPressAt > tr.pressAt) {
        const k = this.keyOfAbility(f, f.lastPressAbilityId);
        if (k && !out.includes(k)) out.push(k);
      }
      if (atk > tr.atk && !out.includes('click')) out.push('click');
    }
    tr.down = down;
    tr.pressAt = f.lastPressAt;
    tr.atk = atk;
    return out;
  }

  /**
   * Who needs their keys read this frame: the local psychic (to choose), and whoever a psychic
   * with Pre-move bound could be predicting. A body that drops out of the watch loses its edge
   * state, so it is primed afresh — a key held across the gap is never mistaken for a press.
   */
  private trackPresses(): void {
    this.framePresses.clear();
    const watch = new Set<Fighter>();
    if (this.premoveSlot('player')) {
      watch.add(this.api.player);
      for (const t of this.targetsOf('player')) if (!this.isNetReplica(t)) watch.add(t);
    }
    if (this.premoveSlot('npc')) for (const t of this.targetsOf('npc')) watch.add(t);
    for (const f of [...this.tracks.keys()]) if (!watch.has(f) || !this.alive(f)) this.tracks.delete(f);
    for (const f of watch) {
      if (!this.alive(f)) continue;
      const keys = this.readPresses(f);
      if (keys.length) this.framePresses.set(f, keys);
    }
    // The bot's read on the player, offline only — online there is no bot.
    if (this.premoveSlot('npc') && !this.api.isOnline) {
      for (const k of this.framePresses.get(this.api.player) ?? []) this.pressLog.push({ key: k, at: this.now });
      while (this.pressLog.length && this.now - this.pressLog[0].at > PRESS_MEMORY_MS) this.pressLog.shift();
    }
  }

  // ── Pre-move (mastery ability): the cast ───────────────────────────────────

  private premoveReady(owner: Owner): boolean {
    const s = this.side(owner);
    return this.now - s.premoveCastAt >= PREMOVE_COOLDOWN_MS && !s.premoveChoosingUntil && !s.premoveKey;
  }

  private tryCastPremove(owner: Owner): boolean {
    const f = this.fighter(owner);
    if (!this.alive(f) || !this.premoveReady(owner)) return false;
    const wall = Date.now();
    if (wall < f.disarmedUntil || wall < f.silencedUntil || wall < f.chickenUntil || wall < f.stunnedUntil) return false;
    this.beginPremove(owner);
    // The cooldown is the kit's own; `triggerCooldown` is only how the cast gets onto the wire.
    // Online it reaches the opponent as an unknown id and lands in `replayNpcMastery`.
    if (owner === 'player') f.triggerCooldown(PREMOVE_ID);
    return true;
  }

  private beginPremove(owner: Owner): void {
    const f = this.fighter(owner);
    const s = this.side(owner);
    s.premoveCastAt = this.now;
    s.premoveChoosingUntil = this.now + PREMOVE_CHOOSE_MS;
    s.premoveKey = null;
    s.premoveUntil = 0;
    if (!this.alive(f)) return;
    this.ensureLayers();
    this.avatar(owner)?.play('raise');
    Sfx.playAt('clock-tick', f.x, { rate: 1.3, volume: 0.8 });
    this.api.showFloatingText(f.x, f.y - 70, '♟ PRE-MOVE', this.hex(OUTPLAY.lit));
  }

  /** Online replay: the remote psychic cast Pre-move and is choosing. Only the tell is drawn. */
  doNpcPremoveCast(): void {
    if (!this.isPsychic('npc') || this.sides.npc.premoveKey) return;
    this.beginPremove('npc');
  }

  /** The prediction is made: from now, the first press of `key` is punished. */
  private choosePremove(owner: Owner, key: PremoveKey): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    s.premoveChoosingUntil = 0;
    s.premoveKey = key;
    s.premoveUntil = this.now + PREMOVE_WINDOW_MS;
    // Primed now: a key the enemy is already holding has not been pressed.
    for (const t of this.targetsOf(owner)) this.tracks.delete(t);
    if (this.alive(f)) {
      this.fx(owner).premoveSet(f.x, f.y);
      Sfx.playAt('clock-tick', f.x, { rate: 0.8, volume: 0.9 });
      // Only the psychic who made it is told which key it is.
      if (owner === 'player') {
        this.api.showFloatingText(f.x, f.y - 70, `♟ PREDICTED: ${this.keyLabel(key)}`, this.hex(PSY.gold));
      }
    }
    if (owner === 'player' && this.api.isOnline && this.alive(this.api.npc)) {
      this.api.sendPsychicMsg({ t: 'psy', k: 'premove', key, ms: PREMOVE_WINDOW_MS });
    }
  }

  private keyLabel(key: PremoveKey): string {
    return key === 'click' ? 'CLICK' : key === 'space' ? 'SPACE' : key.toUpperCase();
  }

  /**
   * The punishment, on the sim that owns the victim: the light stun, and either a slow (a
   * movement key) or the ability they pressed running long. The burst itself is dealt by the
   * psychic's sim — locally that is this one; online the victim reports back with `premoved`.
   */
  private springPremove(owner: Owner, v: Fighter, key: PremoveKey): void {
    const s = this.side(owner);
    s.premoveKey = null;
    s.premoveUntil = 0;
    this.ensureLayers();
    const wall = Date.now();
    this.stun(v, PREMOVE_STUN_MS);
    if (MOVE_KEYS.includes(key)) {
      if (!v.unstoppable) v.premoveSlowUntil = Math.max(v.premoveSlowUntil, wall + PREMOVE_SLOW_MS);
      this.api.showFloatingText(v.x, v.y - 44, '🐌 −30% SPEED', this.hex(OUTPLAY.lit));
    } else {
      const hit = v.element.abilities.filter((a) => a.displayKey.toLowerCase() === key);
      for (const a of hit) v.penalizeCooldown(a.id, PREMOVE_CD_MULT, PREMOVE_CD_MS);
      if (hit.length) {
        this.api.showFloatingText(v.x, v.y - 44, `⏳ ${hit[0].name.toUpperCase()} +50% CD`, this.hex(OUTPLAY.lit));
        if (v === this.api.player) this.premovedMe = { name: hit[0].name, until: this.now + PREMOVE_CD_MS };
      }
    }
    if (owner === 'npc' && this.api.isOnline) {
      // Their sim deals the burst against its copy of us; we only draw it.
      this.fx(owner).premovePunish(v.x, v.y);
      this.api.showFloatingText(v.x, v.y - 64, `♟ PRE-MOVED: ${this.keyLabel(key)}`, this.hex(OUTPLAY.hot));
      Sfx.playAt('status-curse', v.x, { rate: 1.2, volume: 0.9 });
      this.api.sendPsychicMsg({ t: 'psy', k: 'premoved', key });
      return;
    }
    this.premoveBurst(owner, v, key);
  }

  /** The damage half of a sprung Pre-move, always on the psychic's own sim. */
  private premoveBurst(owner: Owner, v: Fighter, key: PremoveKey): void {
    this.ensureLayers();
    this.fx(owner).premovePunish(v.x, v.y);
    Sfx.playAt('status-curse', v.x, { rate: 1.2, volume: 0.9 });
    this.api.scene.cameras.main.shake(120, 0.003);
    this.api.showFloatingText(v.x, v.y - 64, `♟ PRE-MOVED: ${this.keyLabel(key)}`, this.hex(OUTPLAY.hot));
    v.takeDamage(PREMOVE_DAMAGE);
    this.api.spawnHitFlash(v.x, v.y, this.col(owner)(OUTPLAY.hot));
  }

  /**
   * The light stun: a cast lock, the generic `stunnedUntil` and, for a body this sim moves, a
   * post-movement hold. A replica's stun belongs to its own machine.
   */
  private stun(f: Fighter, ms: number): void {
    if (this.isNetReplica(f) || f.unstoppable) return;
    this.stuns.set(f, Math.max(this.stuns.get(f) ?? 0, this.now + ms));
    f.applyDisarm(ms);
    f.stunnedUntil = Math.max(f.stunnedUntil, Date.now() + ms);
    if (f !== this.api.player) f.earthStunnedUntil = Math.max(f.earthStunnedUntil, this.now + ms);
  }

  private updateStuns(): void {
    for (const [f, until] of [...this.stuns]) {
      if (this.now < until && f.active) { (f.body as Phaser.Physics.Arcade.Body | null)?.setVelocity(0, 0); continue; }
      this.stuns.delete(f);
    }
  }

  /** Choosing, arming and springing — for both sides, every frame. */
  private updatePremove(): void {
    for (const owner of BOTH) {
      const s = this.side(owner);
      const f = this.fighter(owner);
      if (!this.isPsychic(owner) || !this.alive(f)) {
        s.premoveChoosingUntil = 0;
        s.premoveKey = null;
        continue;
      }
      if (s.premoveChoosingUntil) {
        if (this.now >= s.premoveChoosingUntil) {
          s.premoveChoosingUntil = 0;
          if (owner === 'player') this.api.showFloatingText(f.x, f.y - 60, 'PRE-MOVE LAPSED', this.hex(PSY.violet));
        } else if (owner === 'player' && this.now > s.premoveCastAt) {
          // The first key pressed after the cast is the prediction. The press still does what
          // it always does — Pre-move only listens to it.
          const k = this.framePresses.get(f)?.[0];
          if (k) this.choosePremove('player', k);
        }
        continue;
      }
      if (!s.premoveKey) continue;
      if (this.now >= s.premoveUntil) {
        s.premoveKey = null;
        if (owner === 'player') this.api.showFloatingText(f.x, f.y - 60, 'NOT THIS TIME', this.hex(PSY.violet));
        continue;
      }
      for (const t of this.targetsOf(owner)) {
        // A replica's keys are read on its own machine, which reports back with `premoved`.
        if (this.isNetReplica(t)) continue;
        if (!this.framePresses.get(t)?.includes(s.premoveKey)) continue;
        this.springPremove(owner, t, s.premoveKey);
        break;
      }
    }
  }

  /**
   * The bot casts Pre-move off its own clock, and predicts from what it has watched the player
   * do: every press of the last few seconds, weighted toward the recent ones. A player who
   * strafes on A/D gets A or D called; one who spams Click gets Click called.
   */
  private updateNpcMastery(): void {
    const s = this.sides.npc;
    if (!this.premoveSlot('npc') || this.api.isOnline) return;
    if (this.now < s.npcPremoveCheckAt) return;
    s.npcPremoveCheckAt = this.now + NPC_PREMOVE_CHECK_MS;
    const f = this.api.npc;
    const t = this.nearestTarget('npc');
    if (!this.alive(f) || !t || !this.premoveReady('npc')) return;
    if (Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y) > NPC_PREMOVE_RANGE) return;
    const key = this.npcPremovePrediction();
    if (!key) return;
    if (!this.tryCastPremove('npc')) return;
    this.choosePremove('npc', key);
  }

  /** The bot's best guess at the player's next key, or null when it has not seen enough. */
  private npcPremovePrediction(): PremoveKey | null {
    const weight = new Map<PremoveKey, number>();
    let total = 0;
    for (const e of this.pressLog) {
      const w = 1 - (this.now - e.at) / PRESS_MEMORY_MS;
      if (w <= 0) continue;
      weight.set(e.key, (weight.get(e.key) ?? 0) + w);
      total += w;
    }
    if (total < NPC_PREMOVE_MIN_READ) return null;
    let best: PremoveKey | null = null;
    let bestW = 0;
    for (const [k, w] of weight) if (w > bestW) { bestW = w; best = k; }
    return best;
  }

  // ── Per-frame ──────────────────────────────────────────────────────────────

  update(time: number, delta: number): void {
    void time;
    const playerIs = this.isPsychic('player');
    const npcIs = this.isPsychic('npc');
    const anyState = this.queues.size || this.foreseen.size || this.pieces.length || this.pawns.length
      || this.stuns.size || this.outplayedHusk.size || this.sides.player.premoveKey || this.sides.npc.premoveKey
      || this.sides.player.queenUntil || this.sides.npc.queenUntil || this.squares.length
      || this.sides.player.ride || this.sides.npc.ride;
    if (!playerIs && !npcIs && !anyState) return;

    this.ensureLayers();
    this.ensureAvatars();
    this.vizT += delta / 1000;

    this.observe();
    this.trackPresses();
    this.updatePremove();
    this.updateNpcMastery();
    this.updateForesight();
    this.updateQueues();
    this.updatePieces();
    this.updateRides();
    this.updatePawns();
    this.updateSquares();
    this.updateQueens();
    this.applyAuras();
    this.applyOutplayed();
    this.updateStuns();
    this.planNpc();
    this.relayQueue();

    this.paintGround();
    this.paintPieces();
    this.paintAir();
    this.updateAvatars(delta);
    this.pushStatuses(playerIs, npcIs);
  }

  // ── Painting ───────────────────────────────────────────────────────────────

  private paintGround(): void {
    const g = this.groundGfx;
    if (!g) return;
    g.clear();

    // Sight Lines (E upgrade): the lit diagonals, under everything else on the floor.
    for (const q of this.squares) {
      if (this.now < q.born) continue;
      const a = Phaser.Math.Clamp((this.now - q.born) / 160, 0, 1)
        * Phaser.Math.Clamp((q.until - this.now) / 800, 0, 1);
      sightSquare(g, this.col(q.owner), q.x, q.y, SIGHT_SQUARE, a, this.vizT, q.seed);
    }

    // Auras: every piece's, both sides' — a buff your opponent cannot see is a buff they
    // cannot play around, and walking the queen out of a bishop's light is half of the game.
    for (const pc of this.pieces) {
      const life = Phaser.Math.Clamp((pc.until - this.now) / 600, 0, 1);
      const born = Phaser.Math.Clamp((this.now - pc.born) / 250, 0, 1);
      const a = 0.9 * life * born;
      const tint = this.col(pc.owner);
      if (pc.kind === 'bishop') heavenlyAura(g, tint, pc.x, pc.y, AURA_R, a, this.vizT, pc.seed);
      else if (pc.kind === 'knight') strideAura(g, tint, pc.x, pc.y, AURA_R, a, this.vizT + pc.seed);
      else mightAura(g, tint, pc.x, pc.y, AURA_R, a, this.vizT + pc.seed);
    }

    // Outplayed (mastery): the purple aura on every enemy who is far enough behind.
    for (const owner of BOTH) {
      if (!this.masteryOn(owner)) continue;
      for (const t of this.targetsOf(owner)) {
        const tier = this.outplayedSeen.get(t) ?? 0;
        if (tier > 0) outplayedAura(g, this.col(owner), t.x, t.y, tier, 0.9, this.vizT, owner === 'player' ? 1.7 : 4.1);
      }
    }

    // The queen: a gold court under her, in every one of the eight directions she can go.
    for (const owner of BOTH) {
      if (!this.queen(owner)) continue;
      const f = this.fighter(owner);
      if (!this.alive(f)) continue;
      const tint = this.col(owner);
      g.fillStyle(tint(PSY.gold), 0.1);
      g.fillEllipse(f.x, f.y + 12, 84, 34);
      g.lineStyle(1.4, tint(PSY.gold), 0.5);
      g.strokeEllipse(f.x, f.y + 12, 84, 34);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        g.lineStyle(1, tint(PSY.gold), 0.22);
        g.lineBetween(f.x + Math.cos(a) * 30, f.y + 12 + Math.sin(a) * 12,
          f.x + Math.cos(a) * 58, f.y + 12 + Math.sin(a) * 23);
      }
    }

    this.paintGhosts();
  }

  /**
   * Where they will be in one second: a shadow of their own body, standing there. Only for the
   * local psychic — the bot's foreknowledge is real but private, and drawing it would hand the
   * player its routing for free.
   */
  private paintGhosts(): void {
    this.ghostsUsed = 0;
    if (this.isPsychic('player') && this.alive(this.api.player)) {
      const g = this.groundGfx;
      for (const t of this.targetsOf('player')) {
        const at = this.futureOf(t, GHOST_MS, GHOST_MIN_DIST);
        if (!at) continue;
        const key = t.texture?.key;
        if (!key || key === '__MISSING') continue;
        let img = this.ghosts[this.ghostsUsed];
        if (!img) {
          img = this.api.scene.add.image(0, 0, key).setDepth(4);
          this.ghosts.push(img);
        }
        this.ghostsUsed++;
        if (img.texture.key !== key) img.setTexture(key);
        const flicker = 0.5 + 0.08 * Math.sin(this.vizT * 5 + this.ghostsUsed);
        // Their own body, sunk into violet: recognisably them, unmistakably not solid.
        img.setPosition(at.x, at.y)
          .setScale(t.scaleX, t.scaleY)
          .setFlipX(t.flipX)
          .setTint(this.pcol(PSY.robe))
          .setAlpha(flicker)
          .setVisible(true);
        // A lit rim, a haze and the shadow it would cast, so it reads as "them, but not yet"
        // against a dark floor rather than as a hole in it.
        if (g) {
          const r = 22 * t.scaleX;
          g.fillStyle(this.pcol(PSY.violet), 0.16);
          g.fillCircle(at.x, at.y, r + 6);
          g.lineStyle(1.6, this.pcol(PSY.violetLit), 0.55 + 0.15 * Math.sin(this.vizT * 4));
          g.strokeCircle(at.x, at.y, r);
          g.fillStyle(this.pcol(PSY.ink), 0.3);
          g.fillEllipse(at.x, at.y + 18 * t.scaleY, 30 * t.scaleX, 8);
        }
      }
    }
    for (let i = this.ghostsUsed; i < this.ghosts.length; i++) this.ghosts[i].setVisible(false);
  }

  private paintPieces(): void {
    const g = this.pieceGfx;
    if (!g) return;
    g.clear();
    const sel = this.sides.player.selected;
    const hover = this.isPsychic('player')
      ? this.pieceAt('player', this.sides.player.aimX, this.sides.player.aimY) : null;

    for (const pw of this.pawns) {
      const life = Phaser.Math.Clamp((pw.until - this.now) / 300, 0, 1);
      chessPiece(g, this.col(pw.owner), 'pawn', pw.owner === 'player' ? 'white' : 'black',
        pw.x, pw.y - 6, 0.72, life, { glow: 0.4 });
    }

    for (const pc of this.pieces) {
      const tint = this.col(pc.owner);
      const life = Phaser.Math.Clamp((pc.until - this.now) / 400, 0, 1);
      const born = Phaser.Math.Clamp((this.now - pc.born) / 200, 0, 1);
      let lift = 0;
      if (pc.move?.leap) {
        const k = Phaser.Math.Clamp((this.now - pc.move.start) / pc.move.ms, 0, 1);
        lift = Math.sin(k * Math.PI) * 46;
      }
      const isSel = pc.owner === 'player' && pc.id === sel;
      if (isSel || (hover === pc && pc.owner === 'player')) {
        g.lineStyle(isSel ? 2.4 : 1.4, tint(PSY.gold), isSel ? 0.95 : 0.55);
        g.strokeEllipse(pc.x, pc.y + 12, 44, 16);
      }
      chessPiece(g, tint, pc.kind, pc.owner === 'player' ? 'white' : 'black',
        pc.x, pc.y - 8 - (1 - born) * 18, 1, life * (0.4 + 0.6 * born), { face: pc.face, lift, glow: isSel ? 1 : 0.5 });
      // Its eight seconds, as a ring that empties round its foot.
      const left = Phaser.Math.Clamp((pc.until - this.now) / PIECE_LIFE_MS, 0, 1);
      g.lineStyle(2, tint(PSY.violetLit), 0.55 * life);
      g.beginPath();
      g.arc(pc.x, pc.y + 6, 19, -Math.PI / 2, -Math.PI / 2 + left * Math.PI * 2, false);
      g.strokePath();
      // Still settling from its last move: dimmed foot.
      if (this.now < pc.readyAt && !pc.move) {
        g.fillStyle(tint(PSY.ink), 0.35);
        g.fillEllipse(pc.x, pc.y + 6, 28, 9);
      }
    }
  }

  private paintAir(): void {
    const g = this.airGfx;
    if (!g) return;
    g.clear();
    this.labelsUsed = 0;
    const s = this.sides.player;

    // ── The move you are about to make ──
    if (this.isPsychic('player') && this.alive(this.api.player)) {
      const pc = s.selected >= 0 ? this.pieceById('player', s.selected) : null;
      const from = pc ? { x: pc.x, y: pc.y } : this.queen('player') && !s.queenMove ? this.api.player : null;
      const kind: ChessKind | null = pc ? pc.kind : from ? 'queen' : null;
      // The queen's guide only shows when the cursor is not on one of her pieces.
      const overPiece = !pc && this.pieceAt('player', s.aimX, s.aimY);
      if (from && kind && !overPiece) {
        const dest = this.legalDest(kind, from.x, from.y, s.aimX, s.aimY);
        if (dest) {
          const leap = kind === 'knight';
          let hot = false;
          for (const t of this.targetsOf('player')) {
            if (leap || kind === 'queen') {
              if (Phaser.Math.Distance.Between(dest.x, dest.y, t.x, t.y) <= (leap ? KNIGHT_BLAST_R : QUEEN_BLAST_R)) hot = true;
            }
            if (!leap && this.segDist(from.x, from.y, dest.x, dest.y, t.x, t.y) <= SLIDE_HIT_R + this.bodyR(t)) hot = true;
          }
          const ready = pc ? this.now >= pc.readyAt : this.now >= s.queenReadyAt;
          moveGuide(g, this.pcol, from.x, from.y, dest.x, dest.y, leap, hot, ready ? 0.95 : 0.4, this.vizT,
            leap ? KNIGHT_BLAST_R : kind === 'queen' ? QUEEN_BLAST_R : 0);
        }
      }
    }

    // ── Mount Protect: the rider's ward ──
    for (const owner of BOTH) {
      const r = this.side(owner).ride;
      if (r && this.alive(r.who)) rideWard(g, this.col(owner), r.who.x, r.who.y, 0.9, this.vizT);
    }

    // ── Pre-move: the chess clock beside the head ──
    // To the left, clear of the queue cards stacked above. Only its own psychic sees the key;
    // everybody else sees that a key has been called and how long it stands.
    for (const owner of BOTH) {
      const ps = this.side(owner);
      if (!ps.premoveChoosingUntil && !ps.premoveKey) continue;
      const f = this.fighter(owner);
      if (!this.alive(f)) continue;
      const cx = f.x - 50;
      const cy = f.y - 40;
      const choosing = !!ps.premoveChoosingUntil;
      const fuse = choosing ? 1 : Phaser.Math.Clamp((ps.premoveUntil - this.now) / PREMOVE_WINDOW_MS, 0, 1);
      premoveClock(g, this.col(owner), cx, cy, fuse, choosing, 0.95, this.vizT);
      const k = !choosing && owner === 'player' ? ps.premoveKey : null;
      const text = !k ? '?' : k === 'click' ? 'M1' : k === 'space' ? 'SP' : k.toUpperCase();
      this.label(text, cx + 11, cy, text.length > 1 ? 8 : 10, this.hex(choosing ? OUTPLAY.lit : PSY.gold), true);
    }

    // ── The crown ──
    for (const owner of BOTH) {
      if (!this.queen(owner)) continue;
      const f = this.fighter(owner);
      if (!this.alive(f)) continue;
      // Above the health bar, which sits at about y-30 and would otherwise cut the crown in half.
      queenCrown(g, this.col(owner), f.x, f.y - 50, 1.1, 0.95, this.vizT);
    }

    // ── The queue, over the psychic's own head ──
    // Next at the bottom, nearest the head; everything after it stacks upward. The crown, when
    // there is one, pushes the stack up out of its way.
    if (this.isPsychic('player') && this.alive(this.api.player)) {
      const p = this.api.player;
      const cards = this.cardsFor('player');
      let y = p.y - (this.queen('player') ? 80 : 54);
      for (let i = 0; i < cards.length; i++) {
        const c = cards[i];
        const next = i === 0;
        const w = next ? 104 : 88;
        const h = next ? 20 : 16;
        const a = next ? 1 : 0.85 - i * 0.12;
        queueCard(g, this.pcol, p.x, y, w, h, a, c.left, next, c.big);
        const bw = h - 4;
        const kx = p.x - w / 2 + 3 + bw / 2;
        this.label(c.key === 'Click' ? 'M1' : c.key, kx, y - 0.5, c.key.length > 1 ? 8 : (next ? 11 : 9),
          this.hex(c.big ? PSY.ink : PSY.aether), true);
        const name = c.name.length > 13 ? `${c.name.slice(0, 12)}…` : c.name;
        this.label(name, p.x + bw / 2 + 1, y - 1, next ? 10 : 8,
          this.hex(next ? PSY.gold : PSY.violetLit), next);
        y -= h + 3;
      }
      if (cards.length) {
        this.label('NEXT ▾', p.x + 70, p.y - (this.queen('player') ? 80 : 54), 8, this.hex(PSY.gold), true);
      }
    }

    for (let i = this.labelsUsed; i < this.labels.length; i++) this.labels[i].setVisible(false);
  }

  /** A pooled label. Size and colour are only rewritten when they actually change. */
  private label(text: string, x: number, y: number, size: number, color: string, bold: boolean): void {
    let t = this.labels[this.labelsUsed];
    if (!t) {
      t = this.api.scene.add.text(0, 0, '', {
        fontFamily: FONT_UI, fontSize: `${size}px`, color,
        fontStyle: bold ? 'bold' : 'normal',
        stroke: '#0b0b0d', strokeThickness: 2,
      }).setOrigin(0.5).setDepth(17);
      this.labels.push(t);
    }
    this.labelsUsed++;
    const style = t.style as unknown as { fontSize: string; color: string; fontStyle: string };
    const fs = bold ? 'bold' : 'normal';
    if (style.fontSize !== `${size}px` || style.color !== color || style.fontStyle !== fs) {
      t.setStyle({ fontSize: `${size}px`, color, fontStyle: fs });
    }
    t.setText(text);
    t.setPosition(x, y);
    t.setVisible(true);
  }

  private heldCount(owner: Owner): number {
    if (owner === 'player' && this.isNetReplica(this.api.npc)) {
      return this.now - this.netQueueAt < QUEUE_STALE_MS ? this.netQueue.length : 0;
    }
    let n = 0;
    for (const t of this.targetsOf(owner)) n += this.queues.get(t)?.length ?? 0;
    return n;
  }

  // ── Avatars & HUD ──────────────────────────────────────────────────────────

  private updateAvatars(delta: number): void {
    for (const owner of BOTH) {
      const av = this.avatar(owner);
      if (!av) continue;
      const f = this.fighter(owner);
      if (!this.alive(f)) { av.update(delta, f?.x ?? 0, f?.y ?? 0, 0); continue; }
      const s = this.side(owner);
      av.setFacing(Math.atan2(s.aimY - f.y, s.aimX - f.x));
      const mine = this.pieces.filter((p) => p.owner === owner).length;
      av.setFocus(Math.min(1, 0.2 + this.heldCount(owner) * 0.2 + mine * 0.12 + (this.queen(owner) ? 0.4 : 0)));
      av.setMastered(owner === 'player' ? this.api.masteryActive : this.api.npcMasteryActive);
      av.update(delta, f.x, f.y, f.alpha);
    }
  }

  private pushStatuses(playerIs: boolean, npcIs: boolean): void {
    const p = this.api.player;
    const pct = (m: number): number => Math.round(Math.abs(m - 1) * 100);

    const held = playerIs ? this.heldCount('player') : 0;
    const secs = (ms: number): string => `${Math.round(ms / 100) / 10}`;
    this.api.setStatusIndicator('psychic-foresight', playerIs && held > 0 ? {
      name: 'Opened Eyes', emoji: '👁️', color: PSY.gold, priority: 152,
      description: `Everything they press is held ${secs(FORESIGHT_MS)} seconds before it happens. The cards over your head are what is coming — the bottom one goes off first.`,
      count: held,
    } : (npcIs && p.castDelayMs > 0 ? {
      name: 'Foreseen', emoji: '👁️', color: PSY.violet, priority: 8,
      description: `Something is reading you. Everything you cast is paid for on the press and only happens ${secs(p.castDelayMs)} seconds later — and they can see it coming the whole way.`,
      count: this.queues.get(p)?.length ?? 0,
    } : null));

    const grace = playerIs ? this.guardMult('player') : 1;
    const stride = playerIs ? this.speedMult('player') : 1;
    const might = playerIs ? this.mightMult('player') : 1;
    const crowned = playerIs && this.queen('player');
    this.api.setStatusIndicator('psychic-grace', !crowned && grace < 0.999 ? {
      name: "Bishop's Grace", emoji: '✝️', color: PSY.gold, priority: 154,
      description: `Standing in heavenly light: ${pct(grace)}% less damage taken. Every bishop's light you stand in (and every one a rook has taken for you) is another 15%.`,
      count: this.stacks('player', 'bishop'),
    } : null);
    this.api.setStatusIndicator('psychic-stride', !crowned && stride > 1.001 ? {
      name: "Knight's Stride", emoji: '🐎', color: PSY.violetLit, priority: 155,
      description: `${pct(stride)}% faster. Every knight's aura you stand in (and every one a rook has taken for you) is another 15%.`,
      count: this.stacks('player', 'knight'),
    } : null);
    this.api.setStatusIndicator('psychic-might', !crowned && might > 1.001 ? {
      name: "Rook's Might", emoji: '🏰', color: PSY.stress, priority: 156,
      description: `${pct(might)}% more damage dealt. Every rook's aura you stand in (and every one a rook has taken for you) is another 15%.`,
      count: this.stacks('player', 'rook'),
    } : null);
    this.api.setStatusIndicator('psychic-queen', crowned ? {
      name: 'Queen', emoji: '♛', color: PSY.gold, priority: 157,
      description: `Every aura three times over, on top of any pieces you stand in: ${pct(grace)}% less damage taken, ${pct(stride)}% faster slides and ${pct(might)}% more damage. You have no legs — click to move like a queen, in any of eight directions, through anyone in the way, landing in an explosion.`,
      until: this.sides.player.queenUntil,
    } : null);

    // ── Mastery ──
    const ps = this.sides.player;
    const ns = this.sides.npc;
    this.api.setStatusIndicator('psychic-premove', playerIs && (ps.premoveChoosingUntil || ps.premoveKey) ? (
      ps.premoveKey ? {
        name: 'Pre-move', emoji: '♟️', color: OUTPLAY.lit, priority: 153,
        description: `You have called ${this.keyLabel(ps.premoveKey)}. The first time they press it before the clock runs out, they take ${PREMOVE_DAMAGE} damage, are stunned, and either slow down (a movement key) or have that ability's cooldown run 50% longer.`,
        until: ps.premoveUntil,
      } : {
        name: 'Pre-move', emoji: '♟️', color: OUTPLAY.lit, priority: 153,
        description: 'Press the key you think they will press next — any of Click, E, R, F, Q, Space or W/A/S/D. Your press still does what it always does.',
        until: ps.premoveChoosingUntil,
      }) : null);

    let worst = 0;
    if (playerIs && this.masteryOn('player')) {
      for (const t of this.targetsOf('player')) worst = Math.max(worst, this.outplayedSeen.get(t) ?? 0);
    }
    this.api.setStatusIndicator('psychic-outplayed', worst > 0 ? {
      name: 'Outplayed', emoji: '♟️', color: OUTPLAY.mid, priority: 151,
      description: `They are losing harder than you are. Their cooldowns run ${Math.round((this.outplayedMult(worst) - 1) * 100)}% longer — 10% at 25 points of health behind you, 25% at 50, 33% at 75.`,
    } : null);

    const meTier = npcIs && this.masteryOn('npc') ? this.outplayedSeen.get(p) ?? 0 : 0;
    this.api.setStatusIndicator('psychic-outplayed-me', meTier > 0 ? {
      name: 'Outplayed', emoji: '♟️', color: OUTPLAY.mid, priority: 9,
      description: `You are far enough behind the psychic on health that your cooldowns run ${Math.round((this.outplayedMult(meTier) - 1) * 100)}% longer. Close the gap and it lifts.`,
    } : null);

    this.api.setStatusIndicator('psychic-premove-threat', npcIs && (ns.premoveChoosingUntil || ns.premoveKey) ? {
      name: 'Pre-move', emoji: '♟️', color: OUTPLAY.hot, priority: 7,
      description: ns.premoveKey
        ? 'They have called one of your keys. Press it before their clock runs out and you are punished — but they will not tell you which.'
        : 'They are choosing which of your keys to call. Whatever you press next is what they are trying to read.',
      until: ns.premoveKey ? ns.premoveUntil : ns.premoveChoosingUntil,
    } : null);

    const pm = this.premovedMe && this.now < this.premovedMe.until ? this.premovedMe : null;
    if (!pm) this.premovedMe = null;
    this.api.setStatusIndicator('psychic-premoved', pm ? {
      name: 'Pre-moved', emoji: '⏳', color: OUTPLAY.hot, priority: 10,
      description: `They read your ${pm.name}. Its cooldown runs 50% longer until this ends.`,
      until: pm.until,
    } : null);
  }

  // ── Public accessors (read by ArenaScene / the AI) ──────────────────────────

  /** Knight auras, pulled by ArenaScene. The queen has no legs at all. */
  getPlayerSpeedMult(): number {
    // A sprung Pre-move on a movement key. Ours to apply even online: it was sprung on this sim.
    const slow = this.api.player?.premoveSlowMult() ?? 1;
    if (!this.isPsychic('player')) return slow;
    return this.queen('player') ? 0 : this.speedMult('player') * slow;
  }

  getNpcSpeedMult(): number {
    // An online replica's movement is streamed from the machine that owns it, which has
    // already applied its own auras (and its own lack of legs). Applying them again here would
    // freeze the copy of a crowned queen where she was standing.
    if (this.api.isOnline) return 1;
    const slow = this.api.npc?.premoveSlowMult() ?? 1;
    if (!this.isPsychic('npc')) return slow;
    return this.queen('npc') ? 0 : this.speedMult('npc') * slow;
  }

  /** The move the bot's click should make this tick, if any. */
  npcMove(): { x: number; y: number } | undefined {
    return this.npcPlan ? { x: this.npcPlan.x, y: this.npcPlan.y } : undefined;
  }

  npcIsQueen(): boolean {
    return this.queen('npc');
  }

  npcPieceCount(): number {
    return this.pieces.filter((p) => p.owner === 'npc').length;
  }

  /**
   * Checkmate (Q+): the bot's target is low enough that crowning now should leave them under the
   * line when the reign runs out. Side-effect-free.
   */
  npcCheckmateSetup(): boolean {
    if (!this.up('npc', 'q') || this.queen('npc') || this.api.isOnline) return false;
    const t = this.nearestTarget('npc');
    return !!t && t.maxHp > 0 && t.hp / t.maxHp <= NPC_CHECKMATE_SETUP;
  }

  npcMasterySlot(): 'r' | 'f' | 'q' | undefined {
    return this.premoveSlot('npc') ?? undefined;
  }

  /**
   * Ability tray fill. The Queen card shows the crown's remaining time while it is worn, and
   * Pre-move its choosing/armed window and then its cooldown.
   */
  getBarRatio(abilityId: string, time: number): number {
    const s = this.sides.player;
    if (abilityId === PREMOVE_ID) {
      if (s.premoveChoosingUntil) return 0.1 + 0.9 * Phaser.Math.Clamp((s.premoveChoosingUntil - time) / PREMOVE_CHOOSE_MS, 0, 1);
      if (s.premoveKey) return 0.1 + 0.9 * Phaser.Math.Clamp((s.premoveUntil - time) / PREMOVE_WINDOW_MS, 0, 1);
      return Phaser.Math.Clamp((time - s.premoveCastAt) / PREMOVE_COOLDOWN_MS, 0, 1);
    }
    if (abilityId === 'psychic-queen' && time < s.queenUntil) {
      return 0.1 + 0.9 * Phaser.Math.Clamp((s.queenUntil - time) / QUEEN_MS, 0, 1);
    }
    return this.api.player.getCooldownRatio(abilityId);
  }

  // ── SummonPurgeTarget / FormRevertTarget ───────────────────────────────────

  /** Pieces and pawns are things somebody summoned; auras and runes are not. */
  purgeSummons(
    x: number, y: number, radius: number, exceptOwner: Owner,
    report?: (px: number, py: number) => void,
  ): number {
    let razed = 0;
    const near = (px: number, py: number): boolean => {
      if (Phaser.Math.Distance.Between(x, y, px, py) > radius) return false;
      razed++;
      report?.(px, py);
      return true;
    };
    for (let i = this.pieces.length - 1; i >= 0; i--) {
      const pc = this.pieces[i];
      if (pc.owner === exceptOwner || !near(pc.x, pc.y)) continue;
      this.pieces.splice(i, 1);
      this.dropSelection(pc);
      this.fx(pc.owner).vanish(pc.x, pc.y);
    }
    for (let i = this.pawns.length - 1; i >= 0; i--) {
      const pw = this.pawns[i];
      if (pw.owner === exceptOwner || !near(pw.x, pw.y)) continue;
      this.pawns.splice(i, 1);
      this.fx(pw.owner).vanish(pw.x, pw.y);
    }
    return razed;
  }

  /** The queen is a form. Ending it gives her legs back. */
  revertForms(f: Fighter): string[] {
    for (const owner of BOTH) {
      if (this.fighter(owner) !== f || !this.queen(owner)) continue;
      this.endQueen(owner);
      return ['Queen'];
    }
    return [];
  }
}
