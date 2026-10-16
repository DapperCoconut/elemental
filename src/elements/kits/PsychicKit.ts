import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { CastContext } from '../Ability';
import type { CustomStatus } from './StatusHudKit';
import type { NetPsychicMsg } from '../../network/NetworkManager';
import type { SummonPurgeTarget } from '../../combat/SummonPurge';
import type { FormRevertTarget } from '../../combat/FormRevert';
import { Sfx } from '../../audio';
import {
  ChessKind, PSY, PsychicAvatar, PsychicColorFn, PsychicFx, chessPiece, focusMandala, heavenlyAura,
  mightAura, moveGuide, queenCrown, queueCard, snareRune, strideAura,
} from './PsychicVisuals';

type Owner = 'player' | 'npc';
type PieceKind = 'bishop' | 'knight' | 'rook';

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

// ── Mastery ──────────────────────────────────────────────────────────────────
/** Predictor's Snare: what a closed eye deals to whoever walks over it. */
const SNARE_DAMAGE = 15;
const SNARE_R = 20;
const SNARE_LIFE_MS = 14_000;
const SNARE_ARM_MS = 260;
const SNARE_MAX = 6;
/** Below this a route is not worth teleporting onto. */
const SNARE_MIN_DIST = 24;
const UTTER_ID = 'utter-focus';
const UTTER_MS = 8000;
const UTTER_FORESIGHT_MS = 5000;
const UTTER_HIT_COST_MS = 500;
const UTTER_COOLDOWN_MS = 26_000;
const UTTER_RELAY_MS = 500;
const ROUTE_RELAY_MS = 160;
const ROUTE_POINTS = 10;
const ROUTE_STALE_MS = 700;
const NPC_UTTER_CHECK_MS = 250;
const NPC_UTTER_RANGE = 300;

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
}

interface Snare {
  x: number;
  y: number;
  by: Owner;
  until: number;
  armedAt: number;
  seed: number;
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
  utterUntil: number;
  utterCastAt: number;
  utterRaw: number;
  utterRelayAt: number;
  npcUtterCheckAt: number;
}

function makeSide(owner: Owner): Side {
  return {
    owner, aimX: 0, aimY: 0, serial: 0, selected: -1,
    queenUntil: 0, queenReadyAt: 0, queenMove: null, stolen: [],
    utterUntil: 0, utterCastAt: -UTTER_COOLDOWN_MS, utterRaw: 0, utterRelayAt: 0, npcUtterCheckAt: 0,
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
  /** Piece serial, or -1 for the queen herself. */
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
  get masteryActive(): boolean;
  get npcMasteryActive(): boolean;
  masteryBindFor(slot: string): string | null;
  npcMasteryBindFor(slot: string): string | null;
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
  private snares: Snare[] = [];
  /** Observed velocity per body, for bodies with no AI plan to replay (husks, replicas). */
  private seen = new Map<Fighter, { x: number; y: number; vx: number; vy: number; at: number }>();
  /** The mouse button last frame, so a press can be told from a hold. */
  private wasDown = false;
  /** What the press that is still held down was spent on. Only a pawn press repeats. */
  private pressMode: 'pawn' | 'spent' | null = null;
  private npcPlan: NpcPlan | null = null;
  private npcPlanAt = 0;

  // Utter Focus, on the machine being read.
  private moveBuffer: { at: number; vx: number; vy: number }[] = [];
  private movePlayed = { vx: 0, vy: 0 };
  private lastRouteRelayAt = 0;
  private netRoute: { x: number; y: number }[] = [];
  private netRouteAt = 0;
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
    // Hand every borrowed cast back before dropping the queues, or an ability paid for on the
    // last frame of a match would simply vanish along with the kit's state.
    for (const f of [...this.foreseen]) this.releaseForesight(f, false);
    this.foreseen.clear();
    this.queues.clear();
    this.pieces = [];
    this.pawns = [];
    this.snares = [];
    this.seen.clear();
    this.wasDown = false;
    this.pressMode = null;
    this.npcPlan = null;
    this.npcPlanAt = 0;
    this.moveBuffer = [];
    this.movePlayed = { vx: 0, vy: 0 };
    this.lastRouteRelayAt = 0;
    this.netRoute = [];
    this.netRouteAt = 0;
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
      f.moveInputDelayMs = 0;
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
      'psychic-queen', 'psychic-utter', 'psychic-held']) {
      this.api.setStatusIndicator(id, null);
    }
  }

  // ── Mastery helpers ────────────────────────────────────────────────────────

  private masteryOn(owner: Owner): boolean {
    return this.isPsychic(owner)
      && (owner === 'player' ? this.api.masteryActive : this.api.npcMasteryActive);
  }

  /** Which of R/F/Q Utter Focus was dropped on, or null. */
  private utterSlot(owner: Owner): 'r' | 'f' | 'q' | null {
    if (!this.masteryOn(owner)) return null;
    for (const s of ['r', 'f', 'q'] as const) {
      const bind = owner === 'player' ? this.api.masteryBindFor(s) : this.api.npcMasteryBindFor(s);
      if (bind === UTTER_ID) return s;
    }
    return null;
  }

  private keyFor(slot: 'r' | 'f' | 'q'): Phaser.Input.Keyboard.Key {
    return slot === 'r' ? this.api.rKey : slot === 'f' ? this.api.fKey : this.api.qKey;
  }

  private focused(owner: Owner): boolean {
    return this.now < this.side(owner).utterUntil;
  }

  /** How long everything aimed at that psychic is held for right now. */
  private foresightMs(owner: Owner): number {
    return this.focused(owner) ? UTTER_FORESIGHT_MS : FORESIGHT_MS;
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

    const bound = this.utterSlot('player');
    if (bound && Phaser.Input.Keyboard.JustDown(this.keyFor(bound))) this.tryCastUtter('player');

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
    if (bound !== 'f' && Phaser.Input.Keyboard.JustDown(this.api.fKey)) p.castAbility('psychic-rook', ctx);
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
      face: x >= f.x ? 1 : -1, seed: Math.random() * 999,
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
    if (!this.alive(f) || s.queenMove || this.now < s.queenReadyAt) return false;
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
      const k = Phaser.Math.Clamp((this.now - pw.born) / PAWN_STEP_MS, 0, 1);
      if (k < 1 || pw.x !== pw.tx || pw.y !== pw.ty) {
        const e = 1 - (1 - k) * (1 - k);
        const nx = pw.fx + (pw.tx - pw.fx) * e;
        const ny = pw.fy + (pw.ty - pw.fy) * e;
        for (const t of this.targetsOf(pw.owner)) {
          if (pw.touched.has(t)) continue;
          if (this.segDist(pw.x, pw.y, nx, ny, t.x, t.y) > PAWN_TOUCH_R + this.bodyR(t)) continue;
          pw.touched.add(t);
          t.takeDamage(PAWN_TOUCH_DAMAGE);
          this.api.spawnHitFlash(t.x, t.y, this.col(pw.owner)(PSY.violetLit));
        }
        pw.x = nx;
        pw.y = ny;
      }
      if (this.now < pw.nextStrikeAt) continue;
      pw.nextStrikeAt += PAWN_STRIKE_EVERY_MS;
      this.pawnStrike(pw);
    }
  }

  /** The capture, on both forward diagonals at once. One hit per body however it is caught. */
  private pawnStrike(pw: Pawn): void {
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
      t.takeDamage(PAWN_STRIKE_DAMAGE);
      this.fx(pw.owner).pieceHit(t.x, t.y, pw.ang);
      this.api.spawnHitFlash(t.x, t.y, this.col(pw.owner)(PSY.gold));
    }
  }

  private updateQueens(): void {
    for (const owner of BOTH) {
      const s = this.side(owner);
      if (!s.queenUntil) continue;
      const f = this.fighter(owner);
      if (!this.alive(f) || this.now >= s.queenUntil || !this.isPsychic(owner)) {
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
      want.set(this.api.player, this.foresightMs('npc'));
    }
    if (this.isPsychic('player') && this.alive(this.api.player) && !this.api.isOnline) {
      for (const f of this.targetsOf('player')) want.set(f, this.foresightMs('player'));
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
          left: ms / this.foresightMs('player'), secs: ms / 1000, at: ms,
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
      case 'utter': {
        const s = this.sides.npc;
        if (msg.ms <= 0) { this.endUtter('npc'); break; }
        const wasOpen = s.utterUntil > 0;
        s.utterUntil = this.now + msg.ms;
        if (!wasOpen) this.beginUtter('npc', msg.ms);
        break;
      }
      case 'route':
        this.netRoute = [];
        for (let i = 0; i + 1 < msg.pts.length; i += 2) {
          this.netRoute.push({ x: msg.pts[i], y: msg.pts[i + 1] });
        }
        this.netRouteAt = this.now;
        break;
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
   * velocity it has actually been moving at — unless Utter Focus is holding a remote
   * opponent's feet, in which case their own machine has sent the route and it is used verbatim.
   */
  private projectPath(f: Fighter, ms: number): { x: number; y: number }[] {
    if (this.isNetReplica(f) && this.now - this.netRouteAt < ROUTE_STALE_MS && this.netRoute.length > 2) {
      const n = Math.max(2, Math.round((ms / UTTER_FORESIGHT_MS) * this.netRoute.length));
      return [{ x: f.x, y: f.y }, ...this.netRoute.slice(0, n)];
    }
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

  // ── Predictor's Snare (mastery passive) ────────────────────────────────────

  /**
   * The dash, replaced: Space puts the psychic on the spot the nearest enemy's route ends at
   * (the end of the foresight window), and leaves a closed eye there. Refuses — leaving an
   * ordinary dash — when nobody has a route worth arriving at.
   */
  trySnareDash(): boolean {
    if (!this.masteryOn('player')) return false;
    const p = this.api.player;
    if (!this.alive(p)) return false;

    let dest: { x: number; y: number } | null = null;
    let bestD = Infinity;
    for (const t of this.targetsOf('player')) {
      const d = this.futureOf(t, this.foresightMs('player'), SNARE_MIN_DIST);
      if (!d) continue;
      const dist = Phaser.Math.Distance.Between(p.x, p.y, t.x, t.y);
      if (dist >= bestD) continue;
      bestD = dist;
      dest = d;
    }
    if (!dest) return false;

    this.ensureLayers();
    const x = this.clampX(dest.x);
    const y = this.clampY(dest.y);
    const fromX = p.x;
    const fromY = p.y;
    this.body(p).reset(x, y);
    this.pfx.snare(fromX, fromY, x, y);
    Sfx.playAt('teleport', x, { rate: 1.2, volume: 0.8 });
    this.plantSnare('player', x, y);
    this.api.showFloatingText(x, y - 50, '🧿 SNARE SET', this.hex(PSY.gold));
    return true;
  }

  private plantSnare(owner: Owner, x: number, y: number): void {
    const mine = this.snares.filter((s) => s.by === owner);
    if (mine.length >= SNARE_MAX) this.snares.splice(this.snares.indexOf(mine[0]), 1);
    this.snares.push({
      x, y, by: owner,
      until: this.now + SNARE_LIFE_MS,
      armedAt: this.now + SNARE_ARM_MS,
      seed: Math.random() * 999,
    });
  }

  private updateSnares(): void {
    for (let i = this.snares.length - 1; i >= 0; i--) {
      const s = this.snares[i];
      if (this.now >= s.until) { this.snares.splice(i, 1); continue; }
      if (this.now < s.armedAt) continue;
      for (const v of this.targetsOf(s.by)) {
        if (Phaser.Math.Distance.Between(s.x, s.y, v.x, v.y) > SNARE_R + this.bodyR(v)) continue;
        this.snares.splice(i, 1);
        this.ensureLayers();
        this.fx(s.by).snareTrip(s.x, s.y);
        Sfx.playAt('torment', s.x, { rate: 1.5, volume: 0.6 });
        v.takeDamage(SNARE_DAMAGE);
        this.api.spawnHitFlash(v.x, v.y, this.col(s.by)(PSY.gold));
        this.api.showFloatingText(v.x, v.y - 46, '🧿 SNARED', this.hex(PSY.gold));
        break;
      }
    }
  }

  // ── Utter Focus (mastery ability) ──────────────────────────────────────────

  private tryCastUtter(owner: Owner): void {
    const f = this.fighter(owner);
    const s = this.side(owner);
    if (!this.alive(f)) return;
    const wall = Date.now();
    if (wall < f.disarmedUntil || wall < f.silencedUntil || wall < f.chickenUntil) return;
    if (this.focused(owner)) {
      if (owner === 'player') {
        this.api.showFloatingText(f.x, f.y - 46, 'ALREADY FOCUSED', this.hex(PSY.violetLit));
      }
      return;
    }
    if (this.now - s.utterCastAt < UTTER_COOLDOWN_MS) return;
    this.beginUtter(owner);
    // `triggerCooldown` is both what the ability card counts down from and what puts the cast on
    // the wire — online it reaches the opponent as an unknown id and lands in `replayNpcMastery`.
    if (owner === 'player') f.triggerCooldown(UTTER_ID);
  }

  private beginUtter(owner: Owner, ms = UTTER_MS): void {
    const f = this.fighter(owner);
    const s = this.side(owner);
    s.utterUntil = this.now + ms;
    s.utterCastAt = this.now;
    s.utterRaw = f?.rawDamageTaken ?? 0;
    s.utterRelayAt = 0;
    if (!this.alive(f)) return;
    this.ensureLayers();
    this.avatar(owner)?.setBlind(true);
    this.avatar(owner)?.play('raise');
    this.fx(owner).focus(f.x, f.y);
    Sfx.playAt('status-curse', f.x, { rate: 0.6, volume: 0.9 });
    this.api.showFloatingText(f.x, f.y - 54, '🧿 UTTER FOCUS', this.hex(PSY.gold));
    this.api.showFloatingText(f.x, f.y - 36, `${UTTER_FORESIGHT_MS / 1000}s AHEAD`, this.hex(PSY.violetLit));
  }

  /** Online replay: the remote psychic pressed their bound key. */
  doNpcUtterFocus(): void {
    if (this.focused('npc')) return;
    this.beginUtter('npc');
  }

  private endUtter(owner: Owner): void {
    const s = this.side(owner);
    if (!s.utterUntil) return;
    s.utterUntil = 0;
    const f = this.fighter(owner);
    if (this.alive(f)) {
      this.avatar(owner)?.setBlind(false);
      this.api.showFloatingText(f.x, f.y - 46, '👁️ EYES OPEN', this.hex(PSY.violetLit));
      Sfx.playAt('status-expire', f.x, { rate: 1.1, volume: 0.6 });
    }
    if (owner === 'npc') this.releaseHeldMovement();
    if (this.shouldRelayUtter(owner)) {
      this.api.sendPsychicMsg({ t: 'psy', k: 'utter', ms: 0 });
      s.utterRelayAt = this.now;
    }
  }

  private shouldRelayUtter(owner: Owner): boolean {
    return owner === 'player' && this.api.isOnline && this.alive(this.api.npc);
  }

  /** The window per frame: every frame he is hit costs half a second, and online it heartbeats. */
  private updateUtter(): void {
    for (const owner of BOTH) {
      const s = this.side(owner);
      if (!s.utterUntil) continue;
      const f = this.fighter(owner);
      if (!this.alive(f) || !this.isPsychic(owner)) { this.endUtter(owner); continue; }
      const raw = f.rawDamageTaken;
      if (raw > s.utterRaw + 0.5) {
        s.utterUntil -= UTTER_HIT_COST_MS;
        this.fx(owner).mote(f.x, f.y - 20);
        this.api.showFloatingText(f.x + 22, f.y - 40, `−${UTTER_HIT_COST_MS / 1000}s FOCUS`, this.hex(PSY.stress));
      }
      s.utterRaw = raw;
      if (this.now >= s.utterUntil) { this.endUtter(owner); continue; }
      if (this.shouldRelayUtter(owner) && this.now - s.utterRelayAt >= UTTER_RELAY_MS) {
        s.utterRelayAt = this.now;
        this.api.sendPsychicMsg({ t: 'psy', k: 'utter', ms: Math.round(s.utterUntil - this.now) });
      }
    }
  }

  /** The bot opens the window when the target is close, or already has something queued. */
  private updateNpcMastery(): void {
    const s = this.sides.npc;
    if (!this.utterSlot('npc') || this.api.isOnline) return;
    if (this.now < s.npcUtterCheckAt) return;
    s.npcUtterCheckAt = this.now + NPC_UTTER_CHECK_MS;
    const f = this.api.npc;
    if (!this.alive(f)) return;
    if (this.focused('npc') || this.now - s.utterCastAt < UTTER_COOLDOWN_MS) return;
    const t = this.nearestTarget('npc');
    if (!t) return;
    const near = Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y) <= NPC_UTTER_RANGE;
    if (!near && !this.queues.get(t)?.length) return;
    this.tryCastUtter('npc');
  }

  // ── Utter Focus, on the machine being read ─────────────────────────────────

  private moveDelayMs(): number {
    if (!this.api.isOnline || this.api.isInvasion || !this.isPsychic('npc') || !this.focused('npc')) return 0;
    return UTTER_FORESIGHT_MS;
  }

  /** Hold this frame's movement, and hand back whatever was pressed a window ago. */
  delayMovement(vx: number, vy: number): { vx: number; vy: number } {
    const delay = this.moveDelayMs();
    if (delay <= 0) {
      this.releaseHeldMovement();
      return { vx, vy };
    }
    this.api.player.moveInputDelayMs = delay;
    this.moveBuffer.push({ at: this.now, vx, vy });
    while (this.moveBuffer.length && this.now - this.moveBuffer[0].at >= delay) {
      const done = this.moveBuffer.shift() as { at: number; vx: number; vy: number };
      this.movePlayed = { vx: done.vx, vy: done.vy };
    }
    return this.movePlayed;
  }

  private releaseHeldMovement(): void {
    if (this.api.player) this.api.player.moveInputDelayMs = 0;
    if (!this.moveBuffer.length && !this.movePlayed.vx && !this.movePlayed.vy) return;
    this.moveBuffer.length = 0;
    this.movePlayed = { vx: 0, vy: 0 };
  }

  /** …and tell the psychic where those held keys are taking us. */
  private relayRoute(): void {
    const delay = this.moveDelayMs();
    if (delay <= 0) return;
    if (this.now - this.lastRouteRelayAt < ROUTE_RELAY_MS) return;
    this.lastRouteRelayAt = this.now;
    const p = this.api.player;
    if (!this.alive(p)) return;

    const buf = this.moveBuffer;
    const segs: { vx: number; vy: number; until: number }[] = [];
    const end = this.now + delay;
    if (!buf.length) {
      segs.push({ vx: this.movePlayed.vx, vy: this.movePlayed.vy, until: end });
    } else {
      segs.push({ vx: this.movePlayed.vx, vy: this.movePlayed.vy, until: buf[0].at + delay });
      for (let i = 0; i < buf.length - 1; i++) {
        segs.push({ vx: buf[i].vx, vy: buf[i].vy, until: buf[i + 1].at + delay });
      }
      const last = buf[buf.length - 1];
      segs.push({ vx: last.vx, vy: last.vy, until: end });
    }

    const pts: number[] = [];
    const step = delay / ROUTE_POINTS;
    let x = p.x;
    let y = p.y;
    let t = this.now;
    let si = 0;
    for (let i = 1; i <= ROUTE_POINTS; i++) {
      const to = this.now + step * i;
      while (t < to) {
        const seg = segs[si];
        const cut = Math.min(to, seg.until);
        if (cut > t) {
          x = this.clampX(x + seg.vx * ((cut - t) / 1000));
          y = this.clampY(y + seg.vy * ((cut - t) / 1000));
          t = cut;
        }
        if (t < seg.until) break;
        if (si >= segs.length - 1) { t = to; break; }
        si++;
      }
      pts.push(Math.round(x), Math.round(y));
    }
    this.api.sendPsychicMsg({ t: 'psy', k: 'route', pts });
  }

  // ── Per-frame ──────────────────────────────────────────────────────────────

  update(time: number, delta: number): void {
    void time;
    const playerIs = this.isPsychic('player');
    const npcIs = this.isPsychic('npc');
    const anyState = this.queues.size || this.foreseen.size || this.pieces.length || this.pawns.length
      || this.snares.length || this.sides.player.utterUntil || this.sides.npc.utterUntil
      || this.sides.player.queenUntil || this.sides.npc.queenUntil;
    if (!playerIs && !npcIs && !anyState) return;

    this.ensureLayers();
    this.ensureAvatars();
    this.vizT += delta / 1000;

    this.observe();
    this.updateUtter();
    this.updateNpcMastery();
    this.updateForesight();
    this.updateQueues();
    this.updatePieces();
    this.updatePawns();
    this.updateQueens();
    this.applyAuras();
    this.updateSnares();
    this.planNpc();
    this.relayQueue();
    this.relayRoute();

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

    // Predictor's Snare (mastery): both sides' runes.
    for (const s of this.snares) {
      const life = Phaser.Math.Clamp((s.until - this.now) / 1200, 0, 1);
      const arm = Phaser.Math.Clamp(1 - (s.armedAt - this.now) / SNARE_ARM_MS, 0, 1);
      snareRune(g, this.col(s.by), s.x, s.y, SNARE_R, 0.9 * life, this.vizT + s.seed, arm);
    }

    // Utter Focus (mastery): the mandala under whoever has his eyes shut.
    for (const owner of BOTH) {
      if (!this.focused(owner)) continue;
      const f = this.fighter(owner);
      if (!this.alive(f)) continue;
      focusMandala(g, this.col(owner), f.x, f.y, 52,
        (this.side(owner).utterUntil - this.now) / UTTER_MS, this.vizT);
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
        fontFamily: 'monospace', fontSize: `${size}px`, color,
        fontStyle: bold ? 'bold' : 'normal',
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
      av.setBlind(this.focused(owner));
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
      description: `Everything they press is held ${secs(this.foresightMs('player'))} seconds before it happens. The cards over your head are what is coming — the bottom one goes off first.`,
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

    const ps = this.sides.player;
    this.api.setStatusIndicator('psychic-utter', playerIs && this.focused('player') ? {
      name: 'Utter Focus', emoji: '🧿', color: PSY.gold, priority: 153,
      description: `Your eyes are shut and everything they press is held ${UTTER_FORESIGHT_MS / 1000} seconds instead of ${FORESIGHT_MS / 1000}. Online their movement keys are held the same ${UTTER_FORESIGHT_MS / 1000} seconds. Every hit that lands on you takes ${UTTER_HIT_COST_MS / 1000}s off it.`,
      until: ps.utterUntil,
    } : null);

    this.api.setStatusIndicator('psychic-held', npcIs && this.focused('npc') ? {
      name: 'Held', emoji: '🧿', color: PSY.stress, priority: 3,
      description: p.moveInputDelayMs > 0
        ? `They have closed their eyes. Everything you press — abilities *and* movement — is being held for ${UTTER_FORESIGHT_MS / 1000} seconds before your body does it. Hit them: every hit shortens it by ${UTTER_HIT_COST_MS / 1000}s.`
        : `They have closed their eyes. Everything you cast is held ${UTTER_FORESIGHT_MS / 1000} seconds. Hit them: every hit shortens it by ${UTTER_HIT_COST_MS / 1000}s.`,
      until: this.sides.npc.utterUntil,
    } : null);
  }

  // ── Public accessors (read by ArenaScene / the AI) ──────────────────────────

  /** Knight auras, pulled by ArenaScene. The queen has no legs at all. */
  getPlayerSpeedMult(): number {
    if (!this.isPsychic('player')) return 1;
    return this.queen('player') ? 0 : this.speedMult('player');
  }

  getNpcSpeedMult(): number {
    // An online replica's movement is streamed from the machine that owns it, which has
    // already applied its own auras (and its own lack of legs). Applying them again here would
    // freeze the copy of a crowned queen where she was standing.
    if (!this.isPsychic('npc') || this.api.isOnline) return 1;
    return this.queen('npc') ? 0 : this.speedMult('npc');
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

  npcMasterySlot(): 'r' | 'f' | 'q' | undefined {
    return this.utterSlot('npc') ?? undefined;
  }

  /**
   * Ability tray fill. The Queen card shows the crown's remaining time while it is worn, and
   * Utter Focus its window and then its cooldown.
   */
  getBarRatio(abilityId: string, time: number): number {
    const s = this.sides.player;
    if (abilityId === UTTER_ID) {
      if (time < s.utterUntil) return 0.1 + 0.9 * Phaser.Math.Clamp((s.utterUntil - time) / UTTER_MS, 0, 1);
      return Phaser.Math.Clamp((time - s.utterCastAt) / UTTER_COOLDOWN_MS, 0, 1);
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
