import Phaser from 'phaser';
import { Sfx } from '../../audio';
import { Fighter } from '../../entities/Fighter';
import { Projectile } from '../../combat/Projectile';
import type { SummonPurgeTarget } from '../../combat/SummonPurge';
import { CastContext } from '../Ability';
import type { CustomStatus } from './StatusHudKit';
import {
  CHK, ChalkAvatar, ChalkColorFn, ChalkFx, chalkBlob, chalkEyes, chalkLegs, chalkLine, chalkStick,
  grain,
} from './ChalkVisuals';

type Owner = 'player' | 'npc';
type Slot = 'e' | 'r' | 'f' | 'q';
const SLOTS: Slot[] = ['e', 'r', 'f', 'q'];

/**
 * Every kind of chalk in the game. The first four are the four drawing abilities; the last
 * three are the Masterpiece palette. A mark's kind decides everything about it — colour,
 * lifetime, whether it detonates and what it does to whoever is standing on it.
 */
export type ChalkKind = 'ward' | 'boom' | 'perma' | 'shield' | 'green' | 'orange' | 'teal' | 'crimson';

/** The Masterpiece palette. Crimson is only ever in it with the Prodigy upgrade. */
type MpKind = 'green' | 'orange' | 'teal' | 'crimson';

/** The three sticks a Supreme Shield may be drawn with. */
type ShieldKind = 'shield' | 'boom' | 'perma';

const MP_KINDS: MpKind[] = ['green', 'orange', 'teal', 'crimson'];

function isMpKind(kind: ChalkKind): kind is MpKind {
  return kind === 'green' || kind === 'orange' || kind === 'teal' || kind === 'crimson';
}

const TONE: Record<ChalkKind, number> = {
  ward: CHK.white,
  boom: CHK.red,
  perma: CHK.blue,
  shield: CHK.white,
  green: CHK.green,
  orange: CHK.orange,
  teal: CHK.teal,
  crimson: CHK.crimson,
};

const LABEL: Record<ChalkKind, string> = {
  ward: 'WARD', boom: 'EXPLOSIVE', perma: 'PERMA', shield: 'SHIELD',
  green: 'GREEN — HEAL', orange: 'ORANGE — BURN', teal: 'TEAL — SPEED',
  crimson: 'CRIMSON — POWER',
};

// ── Drawing ──────────────────────────────────────────────────────────────────
/** How far the cursor must travel before another mark is laid. Also the stroke's resolution. */
const STEP = 12;
/** Masterpiece runs for eight seconds, so it draws coarser or it would carpet the floor. */
const STEP_MP = 17;
/** Past this the cursor is treated as having been lifted, and the next mark starts a new run. */
const LIFT = 96;
/** Hard ceiling on chalk on the floor at once. The oldest expiring mark is rubbed out first. */
const MAX_MARKS = 460;

// ── Chalk Ward (Click) ───────────────────────────────────────────────────────
const WARD_DRAW_MS = 1000;
/**
 * Counted from the moment the drawing window closes, not from each dab — the whole white run
 * goes up in one flash. That single sheet of white is the thing that tells Ward apart from
 * Explosive Chalk, which walks the same idea down the line one mark at a time.
 */
const WARD_FUSE_MS = 500;
const WARD_DAMAGE = 10;
/** Each further white mark covering the same body, so scribbling over their feet is worth it. */
const WARD_STACK_DAMAGE = 5;
const WARD_MAX_STACKS = 5;
const WARD_RADIUS = 34;
/** Bursts are thinned to this spacing — a hundred at once in one frame is a white screen. */
const WARD_BOOM_SPACING = 30;
const WARD_BOOM_MAX = 16;

// ── Explosive Chalk (E) ──────────────────────────────────────────────────────
const BOOM_DRAW_MS = 2000;
/** The wait after the last mark is drawn, before the line starts going up. */
const BOOM_FUSE_MS = 1000;
const BOOM_DAMAGE = 10;
const BOOM_RADIUS = 40;
/** Gap between consecutive blasts, so the line runs rather than flashing all at once. */
const BOOM_STAGGER_MS = 55;

/**
 * The one thing keeping a dense scribble honest: however many blasts overlap a body, it can
 * only be hurt by one of them every this-many milliseconds.
 */
const BLAST_GATE_MS = 180;

// ── Perma-Chalk (R) ──────────────────────────────────────────────────────────
const PERMA_DRAW_MS = 500;
const PERMA_DPS = 30;
const PERMA_RADIUS = 24;

// ── Chalk Shield (F) ─────────────────────────────────────────────────────────
const SHIELD_DRAW_MS = 1000;
/** Radius of the visible ring the shield may be drawn inside. */
const SHIELD_RANGE = 118;
const SHIELD_MIN_DIST = 30;
const SHIELD_HP = 125;
/** Radians per second the finished shield turns at. */
const SHIELD_SPIN = 0.9;
const SHIELD_NODE_R = 15;
/** What one blocked shot costs the shield. */
const SHIELD_PROJ_COST = 8;
/** What leaning on it costs, per second. */
const SHIELD_PUSH_DPS = 12;
const SHIELD_PUSH_PAD = 14;

// ── Masterpiece (Q) ──────────────────────────────────────────────────────────
const MP_MS = 8000;
/** How long the finished work stays on the floor after the artist stops drawing. */
const MP_LIFE_MS = 30000;
const MP_HEAL_DPS = 9;
const MP_DAMAGE_DPS = 18;
const MP_SPEED_MULT = 1.45;
const MP_TOUCH_R = 26;
/** Masterpiece chalk is the only thing Chalk can put down in bulk — cap it per side. */
const MP_MAX_MARKS = 200;

// ── Chalk Debris (Click+) ────────────────────────────────────────────────────
/** Clouds left standing where a ward went up. Few and wide rather than one per mark. */
const DEBRIS_MAX = 4;
const DEBRIS_RADIUS = 56;
const DEBRIS_MS = 4000;
/** What breathing a lungful of it costs. */
const DEBRIS_SLOW = 0.62;
/** …and what it costs to be hit by any chalk at all while standing in one. */
const DEBRIS_AMP = 1.5;

// ── Explosive Release (E+) ───────────────────────────────────────────────────
const RELEASE_DAMAGE = 25;
/** How near the line has to come back to an earlier part of itself to have closed. */
const RELEASE_CLOSE_DIST = 34;
/** Marks that must lie between the two ends, so a stroke doubling back is not a loop. */
const RELEASE_MIN_SPAN = 8;
/** Enclosing less floor than this is an accident, not a plan. */
const RELEASE_MIN_AREA = 3500;

// ── Perma-Block (R+) ─────────────────────────────────────────────────────────
/** How close a shot must pass to the blue line to be rubbed out by it. */
const PERMA_BLOCK_R = 20;

// ── Supreme Shield (F+) ──────────────────────────────────────────────────────
const SHIELD_DRAW_SUPREME_MS = 2500;
/** A shield drawn entirely in blue, against one drawn entirely in white. */
const SUPREME_PERMA_HP_MULT = 2.5;
/** Payback for touching a shield drawn entirely in red, per hit it takes. */
const SUPREME_BOOM_DAMAGE = 14;

// ── Prodigy (Q+) ─────────────────────────────────────────────────────────────
/** Crimson under your feet, and crimson-enhanced Perma-Chalk under your feet. */
const PRODIGY_BOOST = 1.5;
/** What an orange-enhanced blue line adds to its burn. */
const PRODIGY_PERMA_DPS = 2;

// ── Mastery passive: Chalk Smudge ────────────────────────────────────────────
/**
 * Marks of chalk between smudges. The whole point of counting marks rather than rolling a die
 * is that a smudge is paid for in *line*, so the long abilities shed and the short ones barely
 * do — Perma-Chalk draws for half a second and would otherwise be the best smudge generator in
 * the kit rather than the rarest.
 */
const SMUDGE_EVERY = 9;
/** …and the blue line pays four times over on top of that, because a blue smudge is forever. */
const SMUDGE_EVERY_RARE = 22;
const SMUDGE_MAX = 24;
/** A smudge that never finds anybody rubs itself out rather than joining a permanent crowd. */
const SMUDGE_LIFE_MS = 14000;
const SMUDGE_SPEED = 96;
/** How close its head has to get to a body to bite it. */
const SMUDGE_REACH = 24;
const SMUDGE_DAMAGE = 8;
const SMUDGE_BOOM_DAMAGE = 15;
const SMUDGE_BOOM_RADIUS = 46;
const SMUDGE_ORANGE_DAMAGE = 15;
const SMUDGE_ORANGE_BURN_MS = 3000;
const SMUDGE_CRIMSON_DAMAGE = 25;
const SMUDGE_TEAL_SPEED = 2.6;
const SMUDGE_CRIMSON_SPEED = 0.42;
/** Green smudges are the only ones on a clock of their own — they are a heal, not a hunter. */
const SMUDGE_GREEN_MS = 8000;
const SMUDGE_GREEN_HEAL = 5;
const SMUDGE_GREEN_RADIUS = 74;
const SMUDGE_GREEN_INTERVAL_MS = 1000;
/** A blue smudge does not die on its bite — it backs off and comes round again. */
const SMUDGE_PERMA_BITE_MS = 1400;
const SMUDGE_BODY_R = 7;
/** Shield smudges: the long bars. Length is the whole ability — they are a wall on legs. */
const SMUDGE_BAR_HALF = 23;
const SMUDGE_BAR_THICK = 7;
/** How far out from their owner the bars patrol. */
const SMUDGE_GUARD_R = 64;
const SMUDGE_GUARD_SPIN = 0.55;
const SMUDGE_SHIELD_BLOCKS = 3;
/** A red bar breaks formation for anything this close and goes off in its face. */
const SMUDGE_CHARGE_R = 132;

// ── Mastery bindable: Living Chalk ───────────────────────────────────────────
const LIVING_COOLDOWN_MS = 21000;
const LIVING_DRAW_MS = 3000;
/** The pause between the hand coming off the board and the drawing standing up. */
const LIVING_WAKE_MS = 900;
const LIVING_CIRCLE_R = 74;
/** How far in front of the caster the circle opens, along the cursor. */
const LIVING_CIRCLE_DIST = 104;
const LIVING_LIFE_MS = 30000;
const LIVING_HP = 35;
const LIVING_DAMAGE = 15;
const LIVING_SPEED = 92;
const LIVING_BITE_MS = 1100;
const LIVING_REACH = 30;
/** What each read shape is worth. */
const LIVING_TRI_DAMAGE = 10;
const LIVING_CIRCLE_SPEED = 34;
const LIVING_SQUARE_HP = 20;
/** …and what each stick is worth, as a fraction of the drawing done in it. */
const LIVING_BOOM_MULT = 0.6;
const LIVING_PERMA_MULT = 1;
const LIVING_SHIELD_HP = 45;
/** Shape reading. A loop this much of its own size away from its start still counts as closed. */
const LIVING_CLOSE_FRAC = 0.3;
/** Below this wobble in the radius it is a circle whatever its corners say. */
const LIVING_ROUND_MAX = 0.12;
/** …and below this the strongest corner count is not strong enough to be a corner count. */
const LIVING_HARMONIC_MIN = 0.05;

const ARENA_PAD = 32;

// ── World objects ────────────────────────────────────────────────────────────

/**
 * One dab of chalk. Marks are immutable once laid — they never move — which is what lets the
 * ground layer be repainted only when the set changes rather than every frame.
 */
interface Mark {
  owner: Owner;
  kind: ChalkKind;
  x: number;
  y: number;
  /** The previous point in the same run. Meaningless unless `linked`. */
  px: number;
  py: number;
  linked: boolean;
  bornAt: number;
  /** Expiry, or 0 for chalk that stays until something rubs it out. */
  until: number;
  /** Detonation time, or 0 for chalk that never goes off. */
  fuseAt: number;
  seed: number;
  stroke: number;
}

/**
 * Chalk Debris — a cloud of dust hanging where a ward went up. It belongs to whoever drew the
 * ward, and does nothing at all to them.
 */
interface Cloud {
  owner: Owner;
  x: number;
  y: number;
  until: number;
  seed: number;
}

/**
 * Explosive Release — the floor a closed red line drew a box around, waiting for the line to
 * finish running before it goes with it. The polygon is snapshotted at the moment the window
 * closes, because the marks that defined it are about to detonate and be deleted.
 */
interface AreaBlast {
  owner: Owner;
  poly: Phaser.Geom.Point[];
  at: number;
}

/**
 * Chalk Mastery — a smear that walked off the line. What it does is decided entirely by the
 * chalk it came off and whether that chalk was being drawn inside a shield window: `guard`
 * smudges are long bars that patrol and eat shots, everything else is a six-legged biter.
 */
interface Smudge {
  owner: Owner;
  /** The stick it was smudged off. Drives colour, damage, speed and whether it survives biting. */
  chalk: ChalkKind;
  guard: boolean;
  x: number;
  y: number;
  /** Body heading. For a guard this is the bar's long axis, held across its patrol circle. */
  ang: number;
  /** Free-running leg phase. */
  gait: number;
  /** Guards: where on their owner's ring this one walks. */
  orbit: number;
  seed: number;
  /** Expiry, or 0 for the blue ones, which never leave. */
  until: number;
  /** Guards: shots left before it crumbles. Infinity for a blue bar. */
  blocks: number;
  /** Blue biters come round again rather than dying, so their bite is on a clock. */
  nextBiteAt: number;
  nextHealAt: number;
  bornAt: number;
}

/** One dab of the drawing a Living Chalk is made of, held relative to its own centre. */
interface LivingPart {
  dx: number;
  dy: number;
  pdx: number;
  pdy: number;
  linked: boolean;
  seed: number;
  color: number;
}

/** Chalk Mastery — the drawing that stood up. */
interface Living {
  owner: Owner;
  x: number;
  y: number;
  ang: number;
  hp: number;
  maxHp: number;
  /** White chalk in the drawing: a pool that eats shots before its health does. */
  shield: number;
  shieldMax: number;
  damage: number;
  speed: number;
  /** How far out its own art reaches — its hitbox, and how big the legs have to be. */
  radius: number;
  parts: LivingPart[];
  shapes: { tri: number; round: number; square: number };
  /** Nothing moves or bites until the drawing has finished getting up. */
  wakeAt: number;
  diesAt: number;
  nextBiteAt: number;
  gait: number;
  seed: number;
}

/** A live drawing window: the cursor is laying `kind` until `until`. */
interface Session {
  kind: ChalkKind;
  until: number;
  /** How long the window was opened for — the ability tray reads its own clock off this. */
  total: number;
  stroke: number;
  lastX: number;
  lastY: number;
  started: boolean;
  /** Chalk Shield: nothing may be drawn outside `SHIELD_RANGE` of the caster. */
  confined: boolean;
  /**
   * Living Chalk: the small circle on the floor the drawing is pinned inside. Distinct from
   * `confined` because this ring does not move with the caster and does not become a shield —
   * everything drawn in it becomes a body instead.
   */
  living: { x: number; y: number } | null;
  /** Masterpiece: chalk only flows while the button is held. */
  requireHold: boolean;
  step: number;
  /** Chalk Smudge: marks laid since the last smear came off the line. */
  smudgeRun: number;
}

/** One piece of the shield, held in polar coordinates about its owner. */
interface ShieldNode {
  ang: number;
  dist: number;
  seed: number;
  /** Which stick drew it. Always 'shield' without the Supreme Shield upgrade. */
  kind: ShieldKind;
}

interface Side {
  owner: Owner;
  session: Session | null;
  /** Stroke id of the blue line currently on the floor, or −1 when there is none. */
  permaStroke: number;
  shieldHp: number;
  /** What this shield started at — blue pieces raise it, so it is not a constant. */
  shieldMax: number;
  /** Fraction of the shield drawn in red, which is what payback is scaled by. */
  shieldBoom: number;
  shieldNodes: ShieldNode[];
  shieldSpin: number;
  shieldGrindAccum: number;
  savedAbsorber: ((amount: number) => boolean) | null;
  absorberInstalled: boolean;
  mpUntil: number;
  mpOn: boolean;
  mpChalk: MpKind;
  mpSavedInvincible: boolean;
  mpMarks: number;
  /** Prodigy: how much of each colour went into the Masterpiece being drawn. */
  mpTally: Record<MpKind, number>;
  /** Prodigy: what the last finished Masterpiece left the blue line doing. */
  permaEnhance: MpKind | null;
  healAccum: number;
  /** True this frame if the owner is standing on their own teal. */
  onTeal: boolean;
  onGreen: boolean;
  /** Prodigy — standing on your own crimson, or on a crimson-enhanced blue line. */
  onCrimson: boolean;
  /** True this frame if the owner is standing on their own blue line. */
  onPerma: boolean;
  /** The NPC's phantom cursor — it has no mouse, so one is drawn for it. */
  curAng: number;
  curX: number;
  curY: number;
  /** Pacing gate so the AI does not redraw its blue line every time it comes off cooldown. */
  nextPermaAt: number;
  // ── Mastery: Living Chalk ──
  /** Private cast clock — the enhancement is not in `element.abilities`, so `Fighter` has none. */
  livingCastAt: number;
  /** Whichever stick the circle is being drawn in, kept across the window's own kind swaps. */
  livingStick: ChalkKind;
}

/** Shoelace area of a closed run of marks — how much floor a red loop actually shut in. */
function polyArea(poly: Phaser.Geom.Point[]): number {
  let sum = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    sum += a.x * b.y - b.x * a.y;
  }
  return Math.abs(sum) / 2;
}

function makeSide(owner: Owner): Side {
  return {
    owner,
    session: null,
    permaStroke: -1,
    shieldHp: 0,
    shieldMax: SHIELD_HP,
    shieldBoom: 0,
    shieldNodes: [],
    shieldSpin: 0,
    shieldGrindAccum: 0,
    savedAbsorber: null,
    absorberInstalled: false,
    mpUntil: 0,
    mpOn: false,
    mpChalk: 'green',
    mpSavedInvincible: false,
    mpMarks: 0,
    mpTally: { green: 0, orange: 0, teal: 0, crimson: 0 },
    permaEnhance: null,
    healAccum: 0,
    onTeal: false,
    onGreen: false,
    onCrimson: false,
    onPerma: false,
    curAng: 0,
    curX: 0,
    curY: 0,
    nextPermaAt: 0,
    // The kit's constructor runs on the first match and `reset` on every one after it, and
    // readiness is measured against the absolute clock — so a zero here would lock the
    // ability out for the first twenty-one seconds of the first fight.
    livingCastAt: -LIVING_COOLDOWN_MS,
    livingStick: 'green',
  };
}

// ── Arena API ────────────────────────────────────────────────────────────────

export interface ChalkArenaApi {
  get scene(): Phaser.Scene;
  get player(): Fighter;
  get npc(): Fighter;
  /** Everything the player is allowed to hurt — husks in Invasion, the npc in a plain 1v1. */
  get enemies(): Fighter[];
  get projectiles(): Phaser.Physics.Arcade.Group;
  get eKey(): Phaser.Input.Keyboard.Key;
  get rKey(): Phaser.Input.Keyboard.Key;
  get fKey(): Phaser.Input.Keyboard.Key;
  get qKey(): Phaser.Input.Keyboard.Key;
  get pointerWasDown(): boolean;
  get elementId(): string;
  get npcElementId(): string;
  get width(): number;
  get height(): number;
  /** Skins: maps a Chalk visual colour through that side's equipped skin. */
  chalkColor(owner: Owner, base: number): number;
  spawnHitFlash(x: number, y: number, color: number): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  getNearestEnemy(fromX: number, fromY: number): Fighter;
  buildPlayerContext(x: number, y: number): CastContext;
  setStatusIndicator(id: string, status: CustomStatus | null): void;
  get masteryActive(): boolean;
  get npcMasteryActive(): boolean;
  /** Which enhancement each side has dropped over which ability slot. */
  masteryBindFor(slot: string): string | null;
  npcMasteryBindFor(slot: string): string | null;
  /** Progress towards the four Chalk Mastery requirements. Recorded whether it is on or not. */
  recordMasteryStat(key: string, amount: number): void;
  /** Living Chalk is cast off a private timer, so the peer only learns about it here. */
  broadcastMasteryCast(enhId: string): void;
  get isOnline(): boolean;
  /** Shop upgrades: the local player's equipped slots. */
  hasUpgrade(slot: string): boolean;
  /** …and the online opponent's, so their upgraded chalk reproduces on this sim. */
  hasNpcUpgrade(slot: string): boolean;
}

// ── ChalkKit ─────────────────────────────────────────────────────────────────

export class ChalkKit implements SummonPurgeTarget {
  private api: ChalkArenaApi;

  // ── Visuals ──
  private readonly pcol: ChalkColorFn;
  private readonly ncol: ChalkColorFn;
  private readonly pfx: ChalkFx;
  private readonly nfx: ChalkFx;
  private playerAvatar: ChalkAvatar | null = null;
  private npcAvatar: ChalkAvatar | null = null;
  /**
   * Chalk that just sits there. Repainted only when the mark set changes — with several
   * hundred grainy strokes on the floor, redrawing this every frame is the one thing that
   * would make the element expensive.
   */
  private staticGfx: Phaser.GameObjects.Graphics | null = null;
  private staticDirty = true;
  /** Chalk with a fuse burning. Few, short-lived, and has to pulse — so it is per-frame. */
  private liveGfx: Phaser.GameObjects.Graphics | null = null;
  /**
   * Chalk Mastery — the things that walked off the line, and whatever a Living Chalk was drawn
   * as. Its own layer because it is the one part of the element that moves every frame and is
   * neither ground chalk nor a fuse burning.
   */
  private crawlGfx: Phaser.GameObjects.Graphics | null = null;
  /** Above the fighters: the shield and the drawing ring. */
  private airGfx: Phaser.GameObjects.Graphics | null = null;
  private hudGfx: Phaser.GameObjects.Graphics | null = null;
  private hudLabel: Phaser.GameObjects.Text | null = null;
  private vizT = 0;

  // ── Sim ──
  private sides: Record<Owner, Side> = { player: makeSide('player'), npc: makeSide('npc') };
  private marks: Mark[] = [];
  /** Chalk Debris — dust hanging where a ward went up. */
  private clouds: Cloud[] = [];
  /** Explosive Release — floor a closed red line has boxed in, waiting on the line. */
  private areaBlasts: AreaBlast[] = [];
  /** Chalk Mastery — every smear currently on legs, both sides. */
  private smudges: Smudge[] = [];
  /** …and the drawings that stood up. At most one per side. */
  private livings: Living[] = [];
  private nextStroke = 1;
  /** Per-victim blast immunity, so overlapping detonations cannot chain-delete anyone. */
  private blastGate = new Map<Fighter, number>();
  /** Fractional damage carried between frames for the ground-burn chalks. */
  private burnAccum = new Map<Fighter, number>();
  /** Latched each frame from `handleInput` — the player's real cursor. */
  private aimX = 0;
  private aimY = 0;
  private holding = false;

  constructor(api: ChalkArenaApi) {
    this.api = api;
    this.pcol = (base) => api.chalkColor('player', base);
    this.ncol = (base) => api.chalkColor('npc', base);
    this.pfx = new ChalkFx(api.scene, this.pcol);
    this.nfx = new ChalkFx(api.scene, this.ncol);
  }

  // ── Small helpers ──────────────────────────────────────────────────────────

  private get now(): number { return this.api.scene.time.now; }
  private side(owner: Owner): Side { return this.sides[owner]; }
  private fighter(owner: Owner): Fighter { return owner === 'player' ? this.api.player : this.api.npc; }
  private fx(owner: Owner): ChalkFx { return owner === 'player' ? this.pfx : this.nfx; }
  private col(owner: Owner): ChalkColorFn { return owner === 'player' ? this.pcol : this.ncol; }
  private body(f: Fighter): Phaser.Physics.Arcade.Body { return f.body as Phaser.Physics.Arcade.Body; }

  private isChalk(owner: Owner): boolean {
    return owner === 'player' ? this.api.elementId === 'chalk' : this.api.npcElementId === 'chalk';
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

  /** Whoever this side is drawing *at*. Drives the NPC's phantom cursor. */
  private enemyOf(owner: Owner): Fighter | null {
    if (owner === 'npc') {
      const p = this.api.player;
      return p && p.active && p.hp > 0 ? p : null;
    }
    const f = this.api.player;
    const t = this.api.getNearestEnemy(f.x, f.y);
    return t && t.active && t.hp > 0 ? t : null;
  }

  private avatar(owner: Owner): ChalkAvatar | null {
    return owner === 'player' ? this.playerAvatar : this.npcAvatar;
  }

  /**
   * Whether this side is drawing with the given shop upgrade equipped. The NPC only has any
   * online, where the slots come off the opponent's handshake.
   */
  private up(owner: Owner, slot: string): boolean {
    if (!this.isChalk(owner)) return false;
    return owner === 'player' ? this.api.hasUpgrade(slot) : this.api.hasNpcUpgrade(slot);
  }

  /**
   * Everything that scales a point of chalk damage, in one place: what the caster is standing
   * on (Prodigy) and what the victim is standing in (Chalk Debris). Every damage source in the
   * element goes through here, so the two upgrades stack the same way whatever landed the hit.
   */
  private chalkDamageMult(owner: Owner, target: Fighter): number {
    return this.outgoingMult(owner) * this.debrisAmp(owner, target);
  }

  /** Prodigy — crimson under the artist's own feet, direct or by way of the blue line. */
  private outgoingMult(owner: Owner): number {
    const s = this.side(owner);
    return s.onCrimson ? PRODIGY_BOOST : 1;
  }

  /** Chalk Debris — a body standing in this side's dust takes chalk harder. */
  private debrisAmp(owner: Owner, target: Fighter): number {
    return this.inCloud(owner, target.x, target.y) ? DEBRIS_AMP : 1;
  }

  private inCloud(owner: Owner, x: number, y: number): boolean {
    return this.clouds.some((c) => c.owner === owner
      && Phaser.Math.Distance.Between(c.x, c.y, x, y) <= DEBRIS_RADIUS);
  }

  /** Whether this side is fighting with Chalk Mastery switched on. */
  private masteryOn(owner: Owner): boolean {
    if (!this.isChalk(owner)) return false;
    return owner === 'player' ? this.api.masteryActive : this.api.npcMasteryActive;
  }

  /** The slot Living Chalk is bound over for this side, or null when it is not bound at all. */
  private livingSlot(owner: Owner): Slot | null {
    if (!this.masteryOn(owner)) return null;
    for (const s of SLOTS) {
      const bind = owner === 'player' ? this.api.masteryBindFor(s) : this.api.npcMasteryBindFor(s);
      if (bind === 'living-chalk') return s;
    }
    return null;
  }

  /** Requirement progress. Only ever the player's own doing — the adapter gates on the element. */
  private note(owner: Owner, key: string, amount: number): void {
    if (owner !== 'player' || amount <= 0) return;
    this.api.recordMasteryStat(key, amount);
  }

  /** The chalk this side is holding right now — the stick in the avatar's hand. */
  private heldChalk(owner: Owner): number {
    const s = this.side(owner);
    if (s.session) return TONE[s.session.kind];
    if (s.mpOn) return TONE[s.mpChalk];
    return CHK.white;
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  reset(): void {
    // Anything held on a fighter has to be handed back, or the next match starts with a
    // permanently invincible player and an absorber pointing at a dead shield.
    for (const owner of ['player', 'npc'] as Owner[]) {
      const s = this.sides[owner];
      const f = this.fighter(owner);
      if (f) {
        if (s.absorberInstalled) f.damageAbsorber = s.savedAbsorber;
        if (s.mpOn) f.isInvincible = s.mpSavedInvincible;
      }
    }

    this.sides = { player: makeSide('player'), npc: makeSide('npc') };
    this.marks = [];
    this.clouds = [];
    this.areaBlasts = [];
    this.smudges = [];
    this.livings = [];
    this.nextStroke = 1;
    this.blastGate.clear();
    this.burnAccum.clear();
    this.vizT = 0;
    this.aimX = 0;
    this.aimY = 0;
    this.holding = false;

    this.playerAvatar?.destroy(); this.playerAvatar = null;
    this.npcAvatar?.destroy(); this.npcAvatar = null;
    this.staticGfx?.destroy(); this.staticGfx = null;
    this.liveGfx?.destroy(); this.liveGfx = null;
    this.crawlGfx?.destroy(); this.crawlGfx = null;
    this.airGfx?.destroy(); this.airGfx = null;
    this.hudGfx?.destroy(); this.hudGfx = null;
    this.hudLabel?.destroy(); this.hudLabel = null;
    this.staticDirty = true;
  }

  // ── Input ──────────────────────────────────────────────────────────────────

  handleInput(time: number, pointer: Phaser.Input.Pointer, mouseX: number, mouseY: number): void {
    if (this.api.elementId !== 'chalk') return;
    // Latched before anything else: the cursor is the element's whole weapon, and a frame
    // where an ability happened to early-out still has to feed the live stroke.
    this.aimX = mouseX;
    this.aimY = mouseY;
    this.holding = pointer.isDown;

    const p = this.api.player;
    const s = this.sides.player;
    const ctx = this.api.buildPlayerContext(mouseX, mouseY);
    const clicked = pointer.isDown && !this.api.pointerWasDown;

    // While the Masterpiece is up, the whole keyboard belongs to the palette: the mouse
    // draws instead of casting, and E/R/F pick a colour instead of firing an ability.
    if (s.mpOn && s.mpUntil > time) {
      if (Phaser.Input.Keyboard.JustDown(this.api.eKey)) this.pickChalk('player', 'green');
      if (Phaser.Input.Keyboard.JustDown(this.api.rKey)) this.pickChalk('player', 'orange');
      if (Phaser.Input.Keyboard.JustDown(this.api.fKey)) this.pickChalk('player', 'teal');
      // Prodigy adds a fourth stick, and Q is the one key going spare while the work is up.
      if (this.up('player', 'q') && Phaser.Input.Keyboard.JustDown(this.api.qKey)) {
        this.pickChalk('player', 'crimson');
      }
      return;
    }

    // Mastery: inside the little circle the three keys you did *not* bind Living Chalk over
    // are the other three sticks, and the bound one closes the window early. Read before the
    // shield branch because a Living Chalk window is neither confined nor a shield.
    if (s.session?.living) {
      const bound = this.livingSlot('player');
      const pick = (slot: Slot, kind: ChalkKind): void => {
        if (slot === bound) return;
        if (Phaser.Input.Keyboard.JustDown(this.keyFor(slot))) this.pickLivingChalk('player', kind);
      };
      pick('e', 'boom');
      pick('r', 'perma');
      pick('f', 'shield');
      pick('q', 'green');
      if (bound && Phaser.Input.Keyboard.JustDown(this.keyFor(bound))) {
        // Finish early rather than cancel: whatever is in the circle still stands up.
        s.session.until = time;
      }
      return;
    }

    // Supreme Shield: two and a half seconds is long enough to be worth changing stick
    // part-way through, so the shield window keeps the keyboard instead of swallowing it.
    if (s.session?.confined && this.up('player', 'f')) {
      if (Phaser.Input.Keyboard.JustDown(this.api.eKey)) this.pickShieldChalk('player', 'boom');
      if (Phaser.Input.Keyboard.JustDown(this.api.rKey)) this.pickShieldChalk('player', 'perma');
      if (Phaser.Input.Keyboard.JustDown(this.api.fKey)) this.pickShieldChalk('player', 'shield');
      return;
    }

    // One hand, one stick: a window that is already open swallows the input rather than
    // being thrown away half-drawn. Gated here rather than inside the `do*` methods because
    // by the time a `cast` runs its cooldown has already been stamped.
    if (s.session) return;

    // Mastery: Living Chalk takes over whichever slot it was bound to, and is read before the
    // base keys because `JustDown` consumes the flag — testing the bind after would eat it.
    const living = this.livingSlot('player');
    if (living && Phaser.Input.Keyboard.JustDown(this.keyFor(living))) {
      this.tryCastLiving('player', mouseX, mouseY);
    }

    if (clicked) p.castAbility('chalk-ward', ctx);
    if (living !== 'e' && Phaser.Input.Keyboard.JustDown(this.api.eKey)) p.castAbility('chalk-explosive', ctx);
    if (living !== 'r' && Phaser.Input.Keyboard.JustDown(this.api.rKey)) p.castAbility('chalk-perma', ctx);
    if (living !== 'f' && Phaser.Input.Keyboard.JustDown(this.api.fKey)) p.castAbility('chalk-shield', ctx);
    if (living !== 'q' && Phaser.Input.Keyboard.JustDown(this.api.qKey)) p.castAbility('chalk-masterpiece', ctx);
  }

  private keyFor(slot: Slot): Phaser.Input.Keyboard.Key {
    if (slot === 'e') return this.api.eKey;
    if (slot === 'r') return this.api.rKey;
    if (slot === 'f') return this.api.fKey;
    return this.api.qKey;
  }

  /**
   * Living Chalk — change the stick inside the circle. The stroke id is deliberately kept, the
   * way Supreme Shield keeps it: the whole window is lifted off the floor as one drawing when
   * it closes, so a body drawn in three colours has to stay one run.
   */
  private pickLivingChalk(owner: Owner, kind: ChalkKind): void {
    const s = this.side(owner);
    if (!s.session || s.session.kind === kind) return;
    s.session.kind = kind;
    s.session.started = false;
    s.livingStick = kind;
    const f = this.fighter(owner);
    this.avatar(owner)?.setChalk(TONE[kind]);
    this.fx(owner).dust(f.x, f.y - 8, 5, 18, 420, TONE[kind]);
    this.api.showFloatingText(f.x, f.y - 46, `🖍️ ${LABEL[kind]}`, this.hex(TONE[kind]));
  }

  /**
   * Supreme Shield — change the stick mid-draw. The stroke id is deliberately kept: the whole
   * window is lifted off the floor by stroke when it closes, so a shield drawn in three
   * colours has to stay one run.
   */
  private pickShieldChalk(owner: Owner, kind: ShieldKind): void {
    const s = this.side(owner);
    if (!s.session || s.session.kind === kind) return;
    s.session.kind = kind;
    s.session.started = false;
    const f = this.fighter(owner);
    this.avatar(owner)?.setChalk(TONE[kind]);
    this.fx(owner).dust(f.x, f.y - 8, 5, 18, 420, TONE[kind]);
    this.api.showFloatingText(f.x, f.y - 46, `🛡️ ${LABEL[kind]}`, this.hex(TONE[kind]));
  }

  /** Swap the stick in hand mid-Masterpiece. Each swap starts a fresh run of chalk. */
  private pickChalk(owner: Owner, kind: MpKind): void {
    const s = this.side(owner);
    if (s.mpChalk === kind) return;
    s.mpChalk = kind;
    if (s.session) {
      s.session.kind = kind;
      s.session.stroke = this.nextStroke++;
      s.session.started = false;
    }
    const f = this.fighter(owner);
    this.avatar(owner)?.setChalk(TONE[kind]);
    this.fx(owner).dust(f.x, f.y - 8, 5, 18, 420, TONE[kind]);
    this.api.showFloatingText(f.x, f.y - 46, `🖍️ ${LABEL[kind]}`, this.hex(TONE[kind]));
  }

  private hex(color: number): string {
    return `#${color.toString(16).padStart(6, '0')}`;
  }

  // ── Ability entry points (called from build*Context) ───────────────────────

  /** Click — Chalk Ward. A second of white, then all of it at once half a second later. */
  doWard(owner: Owner): void {
    this.openSession(owner, 'ward', WARD_DRAW_MS, false, false, STEP);
    const f = this.fighter(owner);
    this.avatar(owner)?.play('punch');
    this.fx(owner).ring(f.x, f.y, 10, 40, CHK.white, 320);
  }

  /** E — Explosive Chalk. Two seconds of red, then the whole run goes off end to end. */
  doExplosive(owner: Owner): void {
    this.openSession(owner, 'boom', BOOM_DRAW_MS, false, false, STEP);
    const f = this.fighter(owner);
    this.avatar(owner)?.play('sweep');
    this.fx(owner).ring(f.x, f.y, 10, 46, CHK.red, 360);
    this.api.showFloatingText(f.x, f.y - 44, '🧨 FUSE LAID', this.hex(CHK.red));
  }

  /** R — Perma-Chalk. Half a second of blue that stays until it is drawn again. */
  doPerma(owner: Owner): void {
    const s = this.side(owner);
    // The old line is rubbed out the moment a new one is started — there is only ever one.
    if (s.permaStroke >= 0) this.eraseStroke(s.permaStroke, owner);
    this.openSession(owner, 'perma', PERMA_DRAW_MS, false, false, STEP);
    s.permaStroke = s.session!.stroke;
    const f = this.fighter(owner);
    this.avatar(owner)?.play('slam');
    this.fx(owner).ring(f.x, f.y, 10, 44, CHK.blue, 380);
    this.api.showFloatingText(f.x, f.y - 44, '🔵 PERMA-CHALK', this.hex(CHK.blue));
  }

  /** F — Chalk Shield. A second of white inside arm's reach, which then comes off the floor. */
  doShield(owner: Owner): void {
    const s = this.side(owner);
    const supreme = this.up(owner, 'f');
    if (s.shieldNodes.length) this.breakShield(owner, false);
    this.openSession(owner, 'shield', supreme ? SHIELD_DRAW_SUPREME_MS : SHIELD_DRAW_MS, true, false, STEP);
    s.shieldHp = SHIELD_HP;
    s.shieldMax = SHIELD_HP;
    s.shieldBoom = 0;
    s.shieldSpin = 0;
    s.shieldGrindAccum = 0;
    const f = this.fighter(owner);
    this.avatar(owner)?.play('flex');
    this.fx(owner).ring(f.x, f.y, 16, SHIELD_RANGE, CHK.white, 460);
    this.api.showFloatingText(f.x, f.y - 46,
      supreme ? '🛡️ DRAW IT — E/R/F' : '🛡️ DRAW YOUR SHIELD', this.hex(CHK.white));
  }

  /** Q — Masterpiece. Eight seconds where nothing can touch you and everything is a colour. */
  doMasterpiece(owner: Owner): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    s.mpUntil = this.now + MP_MS;
    s.mpChalk = 'green';
    s.mpMarks = 0;
    // Prodigy — a new work starts a fresh count, and whatever the last one taught the blue
    // line is forgotten the moment this one begins rather than when it finishes.
    s.mpTally = { green: 0, orange: 0, teal: 0, crimson: 0 };
    s.permaEnhance = null;
    if (!s.mpOn) {
      s.mpOn = true;
      s.mpSavedInvincible = f.isInvincible;
      f.isInvincible = true;
    }
    // Held rather than tapped: eight seconds of unbroken chalk would be a solid slab.
    this.openSession(owner, 'green', MP_MS, false, true, STEP_MP);
    this.avatar(owner)?.play('raise');
    this.avatar(owner)?.setChalk(CHK.green);
    const fx = this.fx(owner);
    fx.ring(f.x, f.y, 14, 96, CHK.green, 520);
    fx.ring(f.x, f.y, 14, 120, CHK.orange, 620);
    fx.ring(f.x, f.y, 14, 144, CHK.teal, 720);
    this.api.showFloatingText(f.x, f.y - 50, '🎨 MASTERPIECE', this.hex(CHK.teal));
  }

  private openSession(
    owner: Owner, kind: ChalkKind, ms: number, confined: boolean, requireHold: boolean, step: number,
    living: { x: number; y: number } | null = null,
  ): void {
    const s = this.side(owner);
    s.session = {
      kind,
      until: this.now + ms,
      total: ms,
      stroke: this.nextStroke++,
      lastX: 0,
      lastY: 0,
      started: false,
      confined,
      living,
      requireHold,
      step,
      smudgeRun: 0,
    };
    this.avatar(owner)?.setChalk(TONE[kind]);
  }

  // ── Update ─────────────────────────────────────────────────────────────────

  update(time: number, delta: number): void {
    const playerIs = this.api.elementId === 'chalk';
    const npcIs = this.api.npcElementId === 'chalk';
    if (!playerIs && !npcIs) return;

    this.vizT += delta / 1000;
    this.ensureLayers();

    for (const owner of ['player', 'npc'] as Owner[]) {
      if (!this.isChalk(owner)) continue;
      this.advanceCursor(owner, delta);
      this.feedSession(owner, time);
      this.updateMasterpiece(owner, time);
    }
    this.updateNpcLiving(time);

    this.expireMarks(time);
    this.updateClouds(time);
    this.updateFooting();
    this.updateFuses(time);
    this.updateAreaBlasts(time);
    this.updateGround(delta);
    this.updatePermaBlock();
    this.updateShields(delta);
    this.updateSmudges(time, delta);
    this.updateLivings(time, delta);
    this.updateAvatars(delta, playerIs, npcIs);

    this.paintStatic();
    this.paintLive(time);
    this.paintCrawlers(time);
    this.paintAir(time);
    this.paintHud(playerIs);
    this.pushStatuses(playerIs, time);
  }

  private ensureLayers(): void {
    const { scene } = this.api;
    if (!this.staticGfx) { this.staticGfx = scene.add.graphics().setDepth(2); this.staticDirty = true; }
    if (!this.liveGfx) this.liveGfx = scene.add.graphics().setDepth(3);
    // Level with the projectiles: above every chalk floor layer, below the fighters at 5 —
    // a smudge is a thing crawling about on the board, not a thing hanging over it.
    if (!this.crawlGfx) this.crawlGfx = scene.add.graphics().setDepth(4);
    if (!this.airGfx) this.airGfx = scene.add.graphics().setDepth(7);
    if (!this.hudGfx) this.hudGfx = scene.add.graphics().setDepth(20).setScrollFactor(0);
  }

  /**
   * The NPC has no mouse, so it gets a phantom one. Where it circles is the AI's entire
   * "aim": ward and explosive chalk are scribbled over the target's feet, the blue line is
   * drawn across the ground between the two of them, and the shield is drawn around itself.
   */
  private advanceCursor(owner: Owner, delta: number): void {
    const s = this.side(owner);
    if (owner === 'player') {
      s.curX = this.aimX;
      s.curY = this.aimY;
      return;
    }

    const f = this.fighter(owner);
    if (!f || !f.active) return;
    const target = this.enemyOf(owner);
    const kind = s.session?.kind ?? 'ward';

    s.curAng += (delta / 1000) * 2.6;

    // Mastery: inside a Living Chalk circle the phantom cursor walks a triangle rather than a
    // ring. A bot cannot decide what to draw, so what it draws is decided here — and a triangle
    // is the one shape whose payoff (more damage) a movement state machine can actually use.
    const ring = s.session?.living;
    if (ring) {
      const k = (((s.curAng * 0.9) % (Math.PI * 2)) / (Math.PI * 2)) * 3;
      const leg = Math.floor(k);
      const u = k - leg;
      const vertex = (n: number): { x: number; y: number } => ({
        x: ring.x + Math.cos(-Math.PI / 2 + (n % 3) * (Math.PI * 2 / 3)) * LIVING_CIRCLE_R * 0.8,
        y: ring.y + Math.sin(-Math.PI / 2 + (n % 3) * (Math.PI * 2 / 3)) * LIVING_CIRCLE_R * 0.8,
      });
      const a = vertex(leg);
      const b = vertex(leg + 1);
      s.curX = a.x + (b.x - a.x) * u;
      s.curY = a.y + (b.y - a.y) * u;
      return;
    }

    let cx = f.x;
    let cy = f.y;
    let radius = 60;
    if (s.session?.confined) {
      radius = SHIELD_RANGE * 0.72;
    } else if (isMpKind(kind)) {
      // Its own masterpiece is painted around its feet, where it will be standing.
      radius = kind === 'orange' && target ? 64 : 52;
      if (kind === 'orange' && target) { cx = target.x; cy = target.y; }
    } else if (kind === 'perma' && target) {
      cx = (f.x + target.x) / 2;
      cy = (f.y + target.y) / 2;
      radius = 72;
    } else if (target) {
      cx = target.x;
      cy = target.y;
      radius = 58;
    }

    s.curX = Phaser.Math.Clamp(cx + Math.cos(s.curAng) * radius, this.left, this.right);
    s.curY = Phaser.Math.Clamp(cy + Math.sin(s.curAng) * radius * 0.8, this.top, this.bottom);
  }

  /** Lay chalk under whichever cursor this side is driving. */
  private feedSession(owner: Owner, time: number): void {
    const s = this.side(owner);
    const sess = s.session;
    if (!sess) return;

    if (time >= sess.until) {
      s.session = null;
      // Chalk Shield's window closing is what actually builds the shield. `confined` rather
      // than the kind, because a Supreme Shield may have been finished in red or blue.
      if (sess.confined) this.raiseShield(owner, sess.stroke);
      // Mastery: and the little circle closing is what makes a body out of the drawing.
      else if (sess.living) this.hatchLiving(owner, sess);
      // Explosive Release works out what the line boxed in now, while the marks that drew it
      // are all still on the floor — in a second they will have gone off and been deleted.
      else if (sess.kind === 'boom' && this.up(owner, 'e')) this.armEnclosure(owner, sess);
      return;
    }

    // Masterpiece only flows while the button is down. The NPC has no button, so it draws
    // in bursts instead — otherwise it would lay one unbroken ring and nothing else.
    if (sess.requireHold) {
      const drawing = owner === 'player' ? this.holding : (Math.sin(s.curAng * 1.7) > -0.35);
      if (!drawing) { sess.started = false; return; }
    }

    const f = this.fighter(owner);
    if (!f || !f.active || f.hp <= 0) return;

    let x = Phaser.Math.Clamp(s.curX, this.left, this.right);
    let y = Phaser.Math.Clamp(s.curY, this.top, this.bottom);

    // The shield can only be drawn within reach — the cursor is pinned to the ring's edge
    // rather than ignored, so a player sweeping wide still gets a shield out of it.
    if (sess.confined) {
      const d = Phaser.Math.Distance.Between(f.x, f.y, x, y);
      if (d > SHIELD_RANGE) {
        const a = Math.atan2(y - f.y, x - f.x);
        x = f.x + Math.cos(a) * SHIELD_RANGE;
        y = f.y + Math.sin(a) * SHIELD_RANGE;
      }
    }

    // Living Chalk is pinned the same way, but to a circle standing still on the floor rather
    // than to one riding the caster — walking away does not drag the drawing with you.
    if (sess.living) {
      const d = Phaser.Math.Distance.Between(sess.living.x, sess.living.y, x, y);
      if (d > LIVING_CIRCLE_R) {
        const a = Math.atan2(y - sess.living.y, x - sess.living.x);
        x = sess.living.x + Math.cos(a) * LIVING_CIRCLE_R;
        y = sess.living.y + Math.sin(a) * LIVING_CIRCLE_R;
      }
    }

    if (sess.started) {
      const moved = Phaser.Math.Distance.Between(sess.lastX, sess.lastY, x, y);
      if (moved < sess.step) return;
    }

    const isMp = isMpKind(sess.kind);
    if (isMp && s.mpMarks >= MP_MAX_MARKS) return;

    const linked = sess.started
      && Phaser.Math.Distance.Between(sess.lastX, sess.lastY, x, y) <= LIFT;

    const mark: Mark = {
      owner,
      kind: sess.kind,
      x, y,
      px: sess.lastX,
      py: sess.lastY,
      linked,
      bornAt: time,
      until: isMp ? time + MP_LIFE_MS : 0,
      fuseAt: 0,
      seed: Math.random() * 1000,
      stroke: sess.stroke,
    };

    // A Supreme Shield drawn in red is a shield, not a minefield: chalk inside the ring is
    // about to be lifted off the floor, so nothing laid there is given a fuse. The same is
    // true of a Living Chalk — red in the circle is a hotter body, not a mine.
    if (sess.confined || sess.living) {
      /* no fuse — the whole run comes up when the window closes */
    } else if (sess.kind === 'ward') {
      // Every dab of the run shares one detonation time, so it all goes at once however long
      // ago it was laid — the first mark waits for the last.
      mark.fuseAt = sess.until + WARD_FUSE_MS;
    } else if (sess.kind === 'boom') {
      // Every mark in the run knows in advance when its turn comes, counted from the moment
      // the window closes — so the blast walks the line in the order it was drawn.
      const idx = this.marks.filter((m) => m.stroke === sess.stroke).length;
      mark.fuseAt = sess.until + BOOM_FUSE_MS + idx * BOOM_STAGGER_MS;
    }

    this.marks.push(mark);
    if (isMp) {
      s.mpMarks++;
      // Prodigy reads the finished work by counting what went into it, mark for mark.
      s.mpTally[sess.kind as MpKind]++;
    }
    sess.lastX = x;
    sess.lastY = y;
    sess.started = true;

    if (mark.fuseAt === 0) this.staticDirty = true;
    if (linked) this.fx(owner).lay(mark.px, mark.py, mark.x, mark.y, TONE[mark.kind]);

    // Mastery: the hand is not clean. Paid for in line rather than rolled for, so the long
    // abilities shed and the half-second blue line barely does — which is the entire reason a
    // blue smudge, the one that never dies, is the rarest thing the passive makes.
    if (this.masteryOn(owner) && !sess.living) {
      sess.smudgeRun++;
      const every = mark.kind === 'perma' ? SMUDGE_EVERY_RARE : SMUDGE_EVERY;
      if (sess.smudgeRun >= every) {
        sess.smudgeRun = 0;
        this.shedSmudge(owner, mark, sess.confined, time);
      }
    }

    this.trimMarks();
  }

  /** Keeps the floor from filling up. The oldest thing that can expire goes first. */
  private trimMarks(): void {
    if (this.marks.length <= MAX_MARKS) return;
    const idx = this.marks.findIndex((m) => m.kind !== 'perma');
    const victim = idx >= 0 ? idx : 0;
    const [gone] = this.marks.splice(victim, 1);
    if (gone && gone.fuseAt === 0) this.staticDirty = true;
    if (gone && isMpKind(gone.kind)) {
      this.side(gone.owner).mpMarks = Math.max(0, this.side(gone.owner).mpMarks - 1);
    }
  }

  /** Rubs out one run of chalk — used when Perma-Chalk is redrawn, and when a shield lifts. */
  private eraseStroke(stroke: number, owner: Owner): void {
    const doomed = this.marks.filter((m) => m.stroke === stroke);
    if (!doomed.length) return;
    const fx = this.fx(owner);
    // Only a scattering of puffs, not one per mark — a 40-dab line would be a smoke screen.
    for (let i = 0; i < doomed.length; i += 4) fx.dust(doomed[i].x, doomed[i].y, 2, 12, 420, TONE[doomed[i].kind]);
    this.marks = this.marks.filter((m) => m.stroke !== stroke);
    this.staticDirty = true;
  }

  private expireMarks(time: number): void {
    let removed = false;
    this.marks = this.marks.filter((m) => {
      if (m.until === 0 || time < m.until) return true;
      removed = true;
      if (isMpKind(m.kind)) {
        const s = this.side(m.owner);
        s.mpMarks = Math.max(0, s.mpMarks - 1);
      }
      return false;
    });
    if (removed) this.staticDirty = true;
  }

  /** Chalk Debris settles on its own clock — nothing rubs a cloud out early. */
  private updateClouds(time: number): void {
    if (this.clouds.length) this.clouds = this.clouds.filter((c) => time < c.until);
  }

  // ── Detonation ─────────────────────────────────────────────────────────────

  private updateFuses(time: number): void {
    if (!this.marks.some((m) => m.fuseAt > 0 && time >= m.fuseAt)) return;
    const going = this.marks.filter((m) => m.fuseAt > 0 && time >= m.fuseAt);
    this.marks = this.marks.filter((m) => !(m.fuseAt > 0 && time >= m.fuseAt));

    // Explosive chalk runs the line a mark at a time, so each of its blasts is resolved on its
    // own. A ward is one sheet going up together, so the whole run is resolved as a single hit
    // — otherwise the blast gate would throw away every mark but the first.
    const salvos = new Map<number, Mark[]>();
    for (const m of going) {
      if (m.kind !== 'ward') { this.detonate(m, time); continue; }
      const run = salvos.get(m.stroke);
      if (run) run.push(m);
      else salvos.set(m.stroke, [m]);
    }
    for (const run of salvos.values()) this.detonateWard(run, time);
  }

  /** One link of a red line going up. Wards never come through here — see `detonateWard`. */
  private detonate(m: Mark, time: number): void {
    this.fx(m.owner).boom(m.x, m.y, BOOM_RADIUS, TONE[m.kind]);

    for (const t of this.targetsOf(m.owner)) {
      if (Phaser.Math.Distance.Between(m.x, m.y, t.x, t.y) > BOOM_RADIUS) continue;
      // One blast per body per gate, however many marks overlap them.
      if (time < (this.blastGate.get(t) ?? 0)) continue;
      this.blastGate.set(t, time + BLAST_GATE_MS);
      const dmg = Math.round(BOOM_DAMAGE * this.chalkDamageMult(m.owner, t));
      t.takeDamage(dmg);
      this.note(m.owner, 'blastDamage', dmg);
      this.api.spawnHitFlash(t.x, t.y, TONE[m.kind]);
    }
  }

  /**
   * One white run going off as a single blast. A body caught by it is hit once, for more the
   * deeper into the scribble it was standing — so Ward rewards drawing tightly over someone's
   * feet, where Explosive Chalk rewards drawing a long line across where they are headed.
   */
  private detonateWard(run: Mark[], time: number): void {
    const owner = run[0].owner;
    const fx = this.fx(owner);

    // Thin the bursts out rather than firing one per dab — the whole run flashes in one frame.
    const shown: Mark[] = [];
    for (const m of run) {
      if (shown.length >= WARD_BOOM_MAX) break;
      if (shown.some((s) => Phaser.Math.Distance.Between(s.x, s.y, m.x, m.y) < WARD_BOOM_SPACING)) continue;
      shown.push(m);
    }
    for (const m of shown) fx.boom(m.x, m.y, WARD_RADIUS, TONE.ward);

    for (const t of this.targetsOf(owner)) {
      let covered = 0;
      for (const m of run) {
        if (Phaser.Math.Distance.Between(m.x, m.y, t.x, t.y) <= WARD_RADIUS) covered++;
      }
      if (covered === 0) continue;
      if (time < (this.blastGate.get(t) ?? 0)) continue;
      this.blastGate.set(t, time + BLAST_GATE_MS);
      const stacks = Math.min(covered, WARD_MAX_STACKS);
      const base = WARD_DAMAGE + (stacks - 1) * WARD_STACK_DAMAGE;
      const dmg = Math.round(base * this.chalkDamageMult(owner, t));
      t.takeDamage(dmg);
      this.note(owner, 'blastDamage', dmg);
      this.api.spawnHitFlash(t.x, t.y, TONE.ward);
      if (stacks > 1) {
        this.api.showFloatingText(t.x, t.y - 54, `💥 WARD ×${stacks}`, this.hex(CHK.white));
      }
    }

    // Chalk Debris — what the ward leaves behind after the flash.
    if (this.up(owner, 'click')) this.layDebris(owner, shown, time);
  }

  /**
   * Chalk Debris — the dust a ward throws up, hanging over the ground it just cleared. Seeded
   * from the thinned burst list so the clouds sit along the run rather than in a heap, and
   * spread across it rather than crowding its first few marks.
   */
  private layDebris(owner: Owner, shown: Mark[], time: number): void {
    if (!shown.length) return;
    const step = Math.max(1, Math.ceil(shown.length / DEBRIS_MAX));
    const fx = this.fx(owner);
    let laid = 0;
    for (let i = 0; i < shown.length && laid < DEBRIS_MAX; i += step) {
      const m = shown[i];
      this.clouds.push({ owner, x: m.x, y: m.y, until: time + DEBRIS_MS, seed: m.seed });
      fx.dust(m.x, m.y, 9, DEBRIS_RADIUS * 0.8, 900, CHK.dust);
      laid++;
    }
    const f = this.fighter(owner);
    if (f) this.api.showFloatingText(f.x, f.y - 52, `🌫️ DEBRIS ×${laid}`, this.hex(CHK.dust));
  }

  // ── Explosive Release ──────────────────────────────────────────────────────

  /**
   * Work out whether the red line came back to itself, and if it did, arm the ground it shut
   * in. Timed to land just after the last mark of the run goes off, so the shape is read as
   * the line's own conclusion rather than as a second, separate explosion.
   */
  private armEnclosure(owner: Owner, sess: Session): void {
    const run = this.marks.filter((m) => m.stroke === sess.stroke);
    if (run.length < RELEASE_MIN_SPAN + 2) return;

    // The biggest loop the line made, not the first — a scribble that closes twice should
    // blow up the whole shape, not the little knot it happened to tie first.
    let best: Phaser.Geom.Point[] | null = null;
    let bestArea = RELEASE_MIN_AREA;
    for (let j = run.length - 1; j >= RELEASE_MIN_SPAN; j--) {
      for (let i = 0; i <= j - RELEASE_MIN_SPAN; i++) {
        // Cheap test first: only pairs that actually meet are worth measuring.
        if (Phaser.Math.Distance.Between(run[i].x, run[i].y, run[j].x, run[j].y) > RELEASE_CLOSE_DIST) continue;
        const poly = run.slice(i, j + 1).map((m) => new Phaser.Geom.Point(m.x, m.y));
        const area = polyArea(poly);
        if (area > bestArea) { bestArea = area; best = poly; }
      }
    }
    if (!best) return;

    this.areaBlasts.push({
      owner,
      poly: best,
      at: sess.until + BOOM_FUSE_MS + run.length * BOOM_STAGGER_MS,
    });
    const f = this.fighter(owner);
    if (f) this.api.showFloatingText(f.x, f.y - 52, '⭕ CLOSED', this.hex(CHK.red));
  }

  private updateAreaBlasts(time: number): void {
    if (!this.areaBlasts.length) return;
    const going = this.areaBlasts.filter((a) => time >= a.at);
    if (!going.length) return;
    this.areaBlasts = this.areaBlasts.filter((a) => time < a.at);
    for (const a of going) this.fireEnclosure(a, time);
  }

  private fireEnclosure(blast: AreaBlast, time: number): void {
    const fx = this.fx(blast.owner);
    const poly = new Phaser.Geom.Polygon(blast.poly);

    // The shape goes up as itself: a burst on the outline, then the middle lifting.
    const stride = Math.max(1, Math.floor(blast.poly.length / 10));
    for (let i = 0; i < blast.poly.length; i += stride) {
      fx.boom(blast.poly[i].x, blast.poly[i].y, BOOM_RADIUS * 0.7, CHK.red, 380);
    }
    let cx = 0;
    let cy = 0;
    for (const p of blast.poly) { cx += p.x; cy += p.y; }
    cx /= blast.poly.length;
    cy /= blast.poly.length;
    fx.ring(cx, cy, 12, 120, CHK.redDeep, 520);
    fx.dust(cx, cy, 16, 130, 900, CHK.red);

    for (const t of this.targetsOf(blast.owner)) {
      if (!poly.contains(t.x, t.y)) continue;
      // Deliberately not gated: the line's own blasts fired moments ago, and the shape is one
      // hit by construction. It stamps the gate on the way out so nothing double-dips it.
      this.blastGate.set(t, time + BLAST_GATE_MS);
      const dmg = Math.round(RELEASE_DAMAGE * this.chalkDamageMult(blast.owner, t));
      t.takeDamage(dmg);
      this.note(blast.owner, 'blastDamage', dmg);
      this.api.spawnHitFlash(t.x, t.y, CHK.red);
      this.api.showFloatingText(t.x, t.y - 54, '⭕ ENCLOSED', this.hex(CHK.red));
    }
  }

  /**
   * What each artist is standing on. Runs before anything that deals damage, because Prodigy's
   * crimson boost multiplies chalk that goes off in the same frame — reading last frame's
   * footing would make a blast landing on the tick you stepped on quietly cheaper.
   *
   * Only the artist ever gets anything out of their own work; a blue line gives its owner
   * whatever the last Masterpiece taught it, and nothing at all before there was one.
   */
  private updateFooting(): void {
    for (const owner of ['player', 'npc'] as Owner[]) {
      const s = this.side(owner);
      s.onGreen = false;
      s.onTeal = false;
      s.onCrimson = false;
      s.onPerma = false;
      const f = this.fighter(owner);
      if (!f || !f.active || f.hp <= 0) continue;

      for (const m of this.marks) {
        if (m.owner !== owner) continue;
        const under = m.kind === 'green' || m.kind === 'teal' || m.kind === 'crimson' || m.kind === 'perma';
        if (!under) continue;
        const r = m.kind === 'perma' ? PERMA_RADIUS : MP_TOUCH_R;
        if (Phaser.Math.Distance.Between(m.x, m.y, f.x, f.y) > r) continue;
        if (m.kind === 'perma') s.onPerma = true;
        const gives = m.kind === 'perma' ? s.permaEnhance : m.kind;
        if (gives === 'green') s.onGreen = true;
        else if (gives === 'teal') s.onTeal = true;
        else if (gives === 'crimson') s.onCrimson = true;
      }
    }
  }

  // ── Ground chalk (Perma + Masterpiece) ─────────────────────────────────────

  /**
   * Everything standing on chalk. Burn rates are taken as a *maximum* rather than a sum: a
   * dense scribble is a wider trap, not a stronger one, or a two-second doodle would delete
   * anyone who walked through it.
   */
  private updateGround(delta: number): void {
    const dt = delta / 1000;
    const burn = new Map<Fighter, { dps: number; color: number; owner: Owner }>();
    for (const m of this.marks) {
      if (m.kind === 'perma' || m.kind === 'orange') {
        const r = m.kind === 'perma' ? PERMA_RADIUS : MP_TOUCH_R;
        // Prodigy: an orange-taught blue line burns harder than an untaught one.
        const bonus = m.kind === 'perma' && this.side(m.owner).permaEnhance === 'orange'
          ? PRODIGY_PERMA_DPS : 0;
        const dps = (m.kind === 'perma' ? PERMA_DPS : MP_DAMAGE_DPS) + bonus;
        for (const t of this.targetsOf(m.owner)) {
          if (Phaser.Math.Distance.Between(m.x, m.y, t.x, t.y) > r) continue;
          // Chalk Debris amplifies the burn as it does everything else, and the caster's own
          // crimson lifts it too — both fold in before the max, so the strongest mark wins.
          const scaled = dps * this.chalkDamageMult(m.owner, t);
          const cur = burn.get(t);
          if (!cur || scaled > cur.dps) burn.set(t, { dps: scaled, color: TONE[m.kind], owner: m.owner });
        }
      }
    }

    for (const [t, b] of burn) {
      if (!t.active || t.hp <= 0) continue;
      const acc = (this.burnAccum.get(t) ?? 0) + b.dps * dt;
      const whole = Math.floor(acc);
      this.burnAccum.set(t, acc - whole);
      if (whole > 0) {
        t.takeDamage(whole);
        this.note(b.owner, 'burnDamage', whole);
        if (Math.random() < 0.25) this.api.spawnHitFlash(t.x, t.y, b.color);
      }
    }
    // Anything not currently standing on chalk loses its part-tick rather than banking it.
    for (const t of [...this.burnAccum.keys()]) if (!burn.has(t)) this.burnAccum.delete(t);

    for (const owner of ['player', 'npc'] as Owner[]) {
      const s = this.side(owner);
      if (!s.onGreen) { s.healAccum = 0; continue; }
      const f = this.fighter(owner);
      if (!f || !f.active || f.hp <= 0) continue;
      s.healAccum += MP_HEAL_DPS * dt;
      const whole = Math.floor(s.healAccum);
      if (whole > 0) {
        s.healAccum -= whole;
        f.heal(whole);
      }
    }
  }

  // ── Perma-Block ────────────────────────────────────────────────────────────

  /**
   * Perma-Block — the blue line as a wall rather than a burn. A shot crossing it is rubbed
   * out where it touched; the line itself is not spent doing it, which is the whole appeal of
   * having drawn it somewhere useful.
   */
  private updatePermaBlock(): void {
    for (const owner of ['player', 'npc'] as Owner[]) {
      if (!this.up(owner, 'r')) continue;
      const line = this.marks.filter((m) => m.owner === owner && m.kind === 'perma');
      if (!line.length) continue;

      // Snapshotted for the same reason the shield's sweep is: destroy() splices the group.
      for (const child of [...this.api.projectiles.getChildren()]) {
        const proj = child as Projectile;
        if (!proj.active) continue;
        const hostile = owner === 'player' ? !proj.isFromPlayer : proj.isFromPlayer;
        if (!hostile) continue;
        const hit = line.find((m) => Phaser.Math.Distance.Between(m.x, m.y, proj.x, proj.y) <= PERMA_BLOCK_R);
        if (!hit) continue;
        this.fx(owner).snap(proj.x, proj.y, CHK.blue);
        this.api.spawnHitFlash(proj.x, proj.y, CHK.blue);
        proj.destroy();
        this.note(owner, 'permaBlocks', 1);
      }
    }
  }

  // ── Chalk Shield ───────────────────────────────────────────────────────────

  /** The drawing window has closed — peel that run off the floor and hang it around you. */
  private raiseShield(owner: Owner, stroke: number): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    const drawn = this.marks.filter((m) => m.stroke === stroke);
    this.marks = this.marks.filter((m) => m.stroke !== stroke);
    this.staticDirty = true;

    if (!drawn.length || !f || !f.active) {
      s.shieldHp = 0;
      this.api.showFloatingText(f?.x ?? 0, (f?.y ?? 0) - 44, 'Nothing drawn', '#8a8a8a');
      return;
    }

    s.shieldNodes = drawn.map((m) => ({
      ang: Math.atan2(m.y - f.y, m.x - f.x),
      dist: Phaser.Math.Clamp(Phaser.Math.Distance.Between(f.x, f.y, m.x, m.y), SHIELD_MIN_DIST, SHIELD_RANGE),
      seed: m.seed,
      // Anything that is not one of the three sticks was drawn as plain white.
      kind: (m.kind === 'boom' || m.kind === 'perma' ? m.kind : 'shield') as ShieldKind,
    }));

    // Supreme Shield — what it is made of decides how much of it there is, and what touching
    // it costs. Both are fractions of the whole rather than per-node, so a shield reads as one
    // object: half blue is half the bonus, however the halves are arranged around you.
    const permaFrac = s.shieldNodes.filter((n) => n.kind === 'perma').length / s.shieldNodes.length;
    s.shieldBoom = s.shieldNodes.filter((n) => n.kind === 'boom').length / s.shieldNodes.length;
    s.shieldMax = Math.round(SHIELD_HP * (1 + permaFrac * (SUPREME_PERMA_HP_MULT - 1)));
    s.shieldHp = s.shieldMax;

    this.installAbsorber(owner);
    this.fx(owner).ring(f.x, f.y, SHIELD_RANGE, SHIELD_RANGE * 0.72, CHK.white, 380);
    this.api.showFloatingText(f.x, f.y - 46, `🛡️ SHIELD ${s.shieldMax}`, this.hex(CHK.white));
    if (s.shieldBoom > 0) {
      this.api.showFloatingText(f.x, f.y - 64, '💥 ARMED', this.hex(CHK.red));
    }
  }

  /**
   * Supreme Shield — red pieces going off in the face of whoever just leaned on the shield.
   * The absorber never learns who hit it, so payback goes to the nearest body: at the range a
   * shield operates at, anything close enough to be picked is close enough to have done it.
   */
  private shieldPayback(owner: Owner, time: number): void {
    const s = this.side(owner);
    if (s.shieldBoom <= 0) return;
    const f = this.fighter(owner);
    if (!f) return;

    let victim: Fighter | null = null;
    let best = Infinity;
    for (const t of this.targetsOf(owner)) {
      const d = Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y);
      if (d < best) { best = d; victim = t; }
    }
    if (!victim || best > SHIELD_RANGE + SHIELD_PUSH_PAD + 40) return;
    // Same gate as everything else that explodes, so a burst of shots cannot chain payback.
    if (time < (this.blastGate.get(victim) ?? 0)) return;
    this.blastGate.set(victim, time + BLAST_GATE_MS);

    const dmg = Math.max(1, Math.round(SUPREME_BOOM_DAMAGE * s.shieldBoom * this.chalkDamageMult(owner, victim)));
    victim.takeDamage(dmg);
    this.fx(owner).boom(victim.x, victim.y, BOOM_RADIUS * 0.8, CHK.red, 360);
    this.api.spawnHitFlash(victim.x, victim.y, CHK.red);
    this.api.showFloatingText(victim.x, victim.y - 54, '💥 PAYBACK', this.hex(CHK.red));
  }

  private installAbsorber(owner: Owner): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (!f || s.absorberInstalled) return;
    s.savedAbsorber = f.damageAbsorber;
    s.absorberInstalled = true;
    // Looked up through `this.side` rather than captured, so a match restart that rebuilds
    // the side objects can never leave a live closure pointing at a dead shield.
    f.damageAbsorber = (amount: number) => {
      const st = this.side(owner);
      if (st.shieldHp <= 0 || !st.shieldNodes.length) return false;
      // Counted against what the board actually had left, so the hit that breaks it is not
      // credited with the whole of its overkill.
      this.note(owner, 'shieldAbsorbed', Math.round(Math.min(amount, st.shieldHp)));
      st.shieldHp -= amount;
      this.shieldPayback(owner, this.now);
      this.chipShield(owner);
      this.api.showFloatingText(f.x, f.y - 52, `🛡️ ${Math.max(0, Math.round(st.shieldHp))}`, this.hex(CHK.white));
      if (st.shieldHp <= 0) this.breakShield(owner, true);
      return true;
    };
  }

  /** Knock a piece off the shield — the visible cost of having absorbed something. */
  private chipShield(owner: Owner): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (!s.shieldNodes.length || !f) return;
    // Nodes go as the pool does, so a shield at 20% actually looks like one.
    const want = Math.max(1, Math.round((s.shieldNodes.length * Math.max(0, s.shieldHp)) / s.shieldMax));
    while (s.shieldNodes.length > want) {
      const i = Math.floor(Math.random() * s.shieldNodes.length);
      const [n] = s.shieldNodes.splice(i, 1);
      const a = n.ang + s.shieldSpin;
      this.fx(owner).snap(f.x + Math.cos(a) * n.dist, f.y + Math.sin(a) * n.dist, CHK.white);
    }
  }

  private breakShield(owner: Owner, announce: boolean): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (f && s.shieldNodes.length) {
      for (const n of s.shieldNodes) {
        const a = n.ang + s.shieldSpin;
        this.fx(owner).snap(f.x + Math.cos(a) * n.dist, f.y + Math.sin(a) * n.dist, CHK.white);
      }
    }
    s.shieldNodes = [];
    s.shieldHp = 0;
    s.shieldBoom = 0;
    s.shieldMax = SHIELD_HP;
    if (f && s.absorberInstalled) f.damageAbsorber = s.savedAbsorber;
    s.absorberInstalled = false;
    s.savedAbsorber = null;
    if (announce && f) this.api.showFloatingText(f.x, f.y - 48, '🛡️ SHIELD BROKEN', '#cfc9b8');
  }

  private updateShields(delta: number): void {
    const dt = delta / 1000;
    for (const owner of ['player', 'npc'] as Owner[]) {
      const s = this.side(owner);
      if (!s.shieldNodes.length) continue;
      const f = this.fighter(owner);
      if (!f || !f.active || f.hp <= 0) { this.breakShield(owner, false); continue; }

      s.shieldSpin += dt * SHIELD_SPIN;
      const reach = s.shieldNodes.reduce((m, n) => Math.max(m, n.dist), 0);

      // ── Shots die on it ──
      // Snapshotted: `destroy()` splices the group's live array, which would make a plain
      // walk skip whatever followed the shot that was just eaten.
      for (const child of [...this.api.projectiles.getChildren()]) {
        const proj = child as Projectile;
        if (!proj.active) continue;
        const hostile = owner === 'player' ? !proj.isFromPlayer : proj.isFromPlayer;
        if (!hostile) continue;
        if (Phaser.Math.Distance.Between(f.x, f.y, proj.x, proj.y) > reach + SHIELD_NODE_R) continue;
        const hit = s.shieldNodes.find((n) => {
          const a = n.ang + s.shieldSpin;
          return Phaser.Math.Distance.Between(
            f.x + Math.cos(a) * n.dist, f.y + Math.sin(a) * n.dist, proj.x, proj.y,
          ) <= SHIELD_NODE_R;
        });
        if (!hit) continue;
        const a = hit.ang + s.shieldSpin;
        this.fx(owner).snap(f.x + Math.cos(a) * hit.dist, f.y + Math.sin(a) * hit.dist, TONE[hit.kind]);
        this.api.spawnHitFlash(proj.x, proj.y, TONE[hit.kind]);
        proj.destroy();
        this.note(owner, 'shieldAbsorbed', Math.round(Math.min(SHIELD_PROJ_COST, s.shieldHp)));
        s.shieldHp -= SHIELD_PROJ_COST;
        this.shieldPayback(owner, this.now);
        this.chipShield(owner);
        if (s.shieldHp <= 0) { this.breakShield(owner, true); break; }
      }
      if (!s.shieldNodes.length) continue;

      // ── Bodies bounce off it ──
      const wall = reach + SHIELD_PUSH_PAD;
      let grinding = false;
      for (const t of this.targetsOf(owner)) {
        const d = Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y);
        if (d >= wall) continue;
        grinding = true;
        const a = Math.atan2(t.y - f.y, t.x - f.x);
        t.setPosition(f.x + Math.cos(a) * wall, f.y + Math.sin(a) * wall);
        this.body(t).stop();
      }
      if (grinding) {
        s.shieldGrindAccum += SHIELD_PUSH_DPS * dt;
        const whole = Math.floor(s.shieldGrindAccum);
        if (whole > 0) {
          s.shieldGrindAccum -= whole;
          this.note(owner, 'shieldAbsorbed', Math.round(Math.min(whole, s.shieldHp)));
          s.shieldHp -= whole;
          this.chipShield(owner);
          if (s.shieldHp <= 0) this.breakShield(owner, true);
        }
      } else {
        s.shieldGrindAccum = 0;
      }
    }
  }

  // ── Masterpiece ────────────────────────────────────────────────────────────

  private updateMasterpiece(owner: Owner, time: number): void {
    const s = this.side(owner);
    if (!s.mpOn || time < s.mpUntil) return;
    s.mpOn = false;
    const f = this.fighter(owner);
    if (f) f.isInvincible = s.mpSavedInvincible;
    if (s.session && isMpKind(s.session.kind)) {
      s.session = null;
    }
    if (f) {
      this.fx(owner).dust(f.x, f.y, 10, 40, 620, CHK.dust);
      this.api.showFloatingText(f.x, f.y - 48, '🖼️ FINISHED', this.hex(CHK.teal));
    }

    // Prodigy reads the finished work: whichever colour there is most of is what the artist
    // has been practising, and the blue line picks it up until the next Masterpiece.
    if (!this.up(owner, 'q')) return;
    let winner: MpKind | null = null;
    for (const k of MP_KINDS) {
      if (s.mpTally[k] > 0 && (!winner || s.mpTally[k] > s.mpTally[winner])) winner = k;
    }
    s.permaEnhance = winner;
    if (winner && f) {
      this.fx(owner).ring(f.x, f.y, 14, 90, TONE[winner], 620);
      this.api.showFloatingText(f.x, f.y - 66, `🔵 PERMA: ${LABEL[winner]}`, this.hex(TONE[winner]));
    }
  }

  // ── Mastery passive: Chalk Smudge ──────────────────────────────────────────

  /**
   * One smear comes off the line. What it becomes is decided entirely by the stick in hand and
   * by whether that stick was being held inside a shield window — the passive has no table of
   * its own, it only reads what the artist was already doing.
   */
  private shedSmudge(owner: Owner, mark: Mark, guard: boolean, time: number): void {
    if (this.smudges.filter((s) => s.owner === owner).length >= SMUDGE_MAX) return;
    const permanent = mark.kind === 'perma';
    const green = mark.kind === 'green';
    this.smudges.push({
      owner,
      chalk: mark.kind,
      guard,
      x: mark.x,
      y: mark.y,
      ang: Math.random() * Math.PI * 2,
      gait: Math.random() * Math.PI * 2,
      orbit: Math.random() * Math.PI * 2,
      seed: Math.random() * 999,
      until: permanent ? 0 : time + (green ? SMUDGE_GREEN_MS : SMUDGE_LIFE_MS),
      blocks: guard ? (permanent ? Infinity : SMUDGE_SHIELD_BLOCKS) : 0,
      nextBiteAt: 0,
      nextHealAt: time + SMUDGE_GREEN_INTERVAL_MS,
      bornAt: time,
    });
    this.fx(owner).dust(mark.x, mark.y, 4, 12, 380, TONE[mark.kind]);
    Sfx.playAt('claw', mark.x, { volume: 0.22, rate: 1.55 });
  }

  /** Teal is the fast one and crimson is the slow one — the two Masterpiece colours that are
   * purely a movement decision rather than a damage one. */
  private smudgeSpeed(sm: Smudge): number {
    if (sm.chalk === 'teal') return SMUDGE_SPEED * SMUDGE_TEAL_SPEED;
    if (sm.chalk === 'crimson') return SMUDGE_SPEED * SMUDGE_CRIMSON_SPEED;
    return sm.guard ? SMUDGE_SPEED * 1.1 : SMUDGE_SPEED;
  }

  /** What one bite is worth before the element's own multipliers. */
  private smudgeBite(sm: Smudge): number {
    if (sm.chalk === 'orange') return SMUDGE_ORANGE_DAMAGE;
    if (sm.chalk === 'crimson') return SMUDGE_CRIMSON_DAMAGE;
    return SMUDGE_DAMAGE;
  }

  /** Whether a point lies on a guard's bar. The bar *is* the hitbox — that is the whole idea. */
  private inBar(sm: Smudge, px: number, py: number): boolean {
    const dx = px - sm.x;
    const dy = py - sm.y;
    const c = Math.cos(-sm.ang);
    const s = Math.sin(-sm.ang);
    return Math.abs(dx * c - dy * s) <= SMUDGE_BAR_HALF + 4
      && Math.abs(dx * s + dy * c) <= SMUDGE_BAR_THICK + 4;
  }

  private nearestTarget(owner: Owner, x: number, y: number): Fighter | null {
    let best: Fighter | null = null;
    let bd = Infinity;
    for (const t of this.targetsOf(owner)) {
      const d = Phaser.Math.Distance.Between(x, y, t.x, t.y);
      if (d < bd) { bd = d; best = t; }
    }
    return best;
  }

  private updateSmudges(time: number, delta: number): void {
    if (!this.smudges.length) return;
    const dt = delta / 1000;
    // Backwards, because everything in here can rub itself out mid-pass.
    for (let i = this.smudges.length - 1; i >= 0; i--) {
      const sm = this.smudges[i];
      sm.gait += dt * (5.5 + this.smudgeSpeed(sm) / 24);
      const artist = this.fighter(sm.owner);
      if (!artist || !artist.active || artist.hp <= 0) { this.rubOut(sm, i, false); continue; }
      if (sm.until > 0 && time >= sm.until) { this.rubOut(sm, i, sm.guard && sm.chalk === 'boom'); continue; }
      if (sm.guard) this.updateGuard(sm, i, dt, artist);
      else this.updateBiter(sm, i, time, dt);
    }
  }

  /** Walk, and turn towards where you are walking. Turning is separate so a smudge banks. */
  private stepToward(sm: Smudge, tx: number, ty: number, speed: number, dt: number, stopAt: number): void {
    const d = Phaser.Math.Distance.Between(sm.x, sm.y, tx, ty);
    sm.ang = Phaser.Math.Angle.RotateTo(sm.ang, Math.atan2(ty - sm.y, tx - sm.x), dt * 7);
    if (d <= stopAt) return;
    sm.x = Phaser.Math.Clamp(sm.x + Math.cos(sm.ang) * speed * dt, this.left, this.right);
    sm.y = Phaser.Math.Clamp(sm.y + Math.sin(sm.ang) * speed * dt, this.top, this.bottom);
  }

  private updateBiter(sm: Smudge, i: number, time: number, dt: number): void {
    const speed = this.smudgeSpeed(sm);

    // Green is the one colour that never goes hunting. It walks at your heel and heals.
    if (sm.chalk === 'green') {
      const f = this.fighter(sm.owner);
      this.stepToward(sm, f.x, f.y + 6, speed, dt, 26);
      if (time < sm.nextHealAt) return;
      sm.nextHealAt = time + SMUDGE_GREEN_INTERVAL_MS;
      if (Phaser.Math.Distance.Between(sm.x, sm.y, f.x, f.y) > SMUDGE_GREEN_RADIUS || f.hp <= 0) return;
      f.heal(SMUDGE_GREEN_HEAL);
      this.fx(sm.owner).ring(sm.x, sm.y, 6, SMUDGE_GREEN_RADIUS * 0.6, CHK.green, 400);
      return;
    }

    const target = this.nearestTarget(sm.owner, sm.x, sm.y);
    if (!target) {
      // Nothing to walk at: it mills about rather than freezing mid-stride.
      this.stepToward(sm, sm.x + Math.cos(sm.gait * 0.4) * 60, sm.y + Math.sin(sm.gait * 0.4) * 60,
        speed * 0.35, dt, 0);
      return;
    }
    this.stepToward(sm, target.x, target.y, speed, dt, 0);
    if (Phaser.Math.Distance.Between(sm.x, sm.y, target.x, target.y) > SMUDGE_REACH) return;

    // Red does not bite at all — it bursts, and the burst is what kills it.
    if (sm.chalk === 'boom') { this.rubOut(sm, i, true); return; }

    // Blue is the one that survives its own bite, so it is the one on a clock.
    if (sm.chalk === 'perma') {
      if (time < sm.nextBiteAt) return;
      sm.nextBiteAt = time + SMUDGE_PERMA_BITE_MS;
      this.bite(sm, target);
      // Backs off a body length so the next one is an approach rather than a grind.
      sm.x -= Math.cos(sm.ang) * 30;
      sm.y -= Math.sin(sm.ang) * 30;
      return;
    }

    this.bite(sm, target);
    this.rubOut(sm, i, false);
  }

  private bite(sm: Smudge, target: Fighter): void {
    const dmg = Math.max(1, Math.round(this.smudgeBite(sm) * this.chalkDamageMult(sm.owner, target)));
    target.takeDamage(dmg);
    this.api.spawnHitFlash(target.x, target.y, TONE[sm.chalk]);
    this.fx(sm.owner).dust(sm.x, sm.y, 4, 15, 320, TONE[sm.chalk]);
    // Orange is the Masterpiece's burning colour, so its smudge leaves the same fire behind it.
    if (sm.chalk === 'orange') {
      target.burningUntil = Math.max(target.burningUntil,
        this.now + Math.round(SMUDGE_ORANGE_BURN_MS * target.statusDurMult));
      this.api.showFloatingText(target.x, target.y - 44, '🔥 SMUDGED', this.hex(CHK.orange));
    }
  }

  /**
   * A bar on legs. It patrols its owner's ring broadside-on, because a bar is only a wall when
   * it is across whatever is coming — and a red one abandons the ring entirely for anything
   * near enough to be worth going off in the face of.
   */
  private updateGuard(sm: Smudge, i: number, dt: number, artist: Fighter): void {
    const speed = this.smudgeSpeed(sm);
    const charge = sm.chalk === 'boom' ? this.nearestTarget(sm.owner, sm.x, sm.y) : null;
    if (charge && Phaser.Math.Distance.Between(sm.x, sm.y, charge.x, charge.y) <= SMUDGE_CHARGE_R) {
      this.stepToward(sm, charge.x, charge.y, speed * 1.15, dt, 0);
      if (Phaser.Math.Distance.Between(sm.x, sm.y, charge.x, charge.y) <= SMUDGE_REACH) {
        this.rubOut(sm, i, true);
        return;
      }
    } else {
      sm.orbit += dt * SMUDGE_GUARD_SPIN;
      const gx = artist.x + Math.cos(sm.orbit) * SMUDGE_GUARD_R;
      const gy = artist.y + Math.sin(sm.orbit) * SMUDGE_GUARD_R;
      const k = Math.min(1, dt * 6);
      sm.x = Phaser.Math.Linear(sm.x, gx, k);
      sm.y = Phaser.Math.Linear(sm.y, gy, k);
      sm.ang = sm.orbit + Math.PI / 2;
    }

    // Shots die on it. Snapshotted for the same reason the shield's own sweep is: `destroy()`
    // splices the group's live array under a plain walk.
    for (const child of [...this.api.projectiles.getChildren()]) {
      const proj = child as Projectile;
      if (!proj.active) continue;
      const hostile = sm.owner === 'player' ? !proj.isFromPlayer : proj.isFromPlayer;
      if (!hostile) continue;
      if (!this.inBar(sm, proj.x, proj.y)) continue;
      this.fx(sm.owner).snap(proj.x, proj.y, TONE[sm.chalk]);
      this.api.spawnHitFlash(proj.x, proj.y, TONE[sm.chalk]);
      proj.destroy();
      sm.blocks -= 1;
      if (sm.blocks <= 0) { this.rubOut(sm, i, sm.chalk === 'boom'); return; }
    }
  }

  /** A smudge leaves the board — as powder, or as a red one always does, as a hole. */
  private rubOut(sm: Smudge, index: number, explode: boolean): void {
    this.smudges.splice(index, 1);
    const fx = this.fx(sm.owner);
    if (!explode) {
      fx.dust(sm.x, sm.y, 5, 16, 420, TONE[sm.chalk]);
      return;
    }
    fx.boom(sm.x, sm.y, SMUDGE_BOOM_RADIUS, CHK.red);
    const time = this.now;
    for (const t of this.targetsOf(sm.owner)) {
      if (Phaser.Math.Distance.Between(sm.x, sm.y, t.x, t.y) > SMUDGE_BOOM_RADIUS) continue;
      // Same gate as every other chalk explosion, so a swarm cannot chain-delete anyone.
      if (time < (this.blastGate.get(t) ?? 0)) continue;
      this.blastGate.set(t, time + BLAST_GATE_MS);
      t.takeDamage(Math.max(1, Math.round(SMUDGE_BOOM_DAMAGE * this.chalkDamageMult(sm.owner, t))));
      this.api.spawnHitFlash(t.x, t.y, CHK.red);
    }
  }

  // ── Mastery bindable: Living Chalk ─────────────────────────────────────────

  /** The bound key, or the bot's own decision. Answers whether the circle actually opened. */
  private tryCastLiving(owner: Owner, tx: number, ty: number): boolean {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (!f || !f.active || f.hp <= 0) return false;
    // One hand, one stick — the same refusal every other cast in the element makes.
    if (s.session || s.mpOn) return false;
    if (this.now - s.livingCastAt < LIVING_COOLDOWN_MS) return false;
    s.livingCastAt = this.now;
    this.castLiving(owner, tx, ty);
    // Cast off a private timer rather than through `castAbility`, so the peer only learns
    // about it here.
    if (owner === 'player') this.api.broadcastMasteryCast('living-chalk');
    return true;
  }

  /**
   * Online: the opponent drew one on their machine. Only the fact of it crosses the wire — the
   * shapes and the sticks are three seconds of somebody else's mouse — so the replica is built
   * to the base statline and the same drawing everybody's first one is.
   */
  doNpcLivingChalk(tx: number, ty: number): void {
    this.sides.npc.livingCastAt = this.now;
    this.castLiving('npc', tx, ty);
  }

  private castLiving(owner: Owner, tx: number, ty: number): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    // Only one of yours may be standing; casting again rubs out the last one.
    this.killLiving(owner);
    const ang = Math.atan2(ty - f.y, tx - f.x);
    const cx = Phaser.Math.Clamp(f.x + Math.cos(ang) * LIVING_CIRCLE_DIST,
      this.left + LIVING_CIRCLE_R, this.right - LIVING_CIRCLE_R);
    const cy = Phaser.Math.Clamp(f.y + Math.sin(ang) * LIVING_CIRCLE_DIST,
      this.top + LIVING_CIRCLE_R, this.bottom - LIVING_CIRCLE_R);
    s.livingStick = 'green';
    this.openSession(owner, 'green', LIVING_DRAW_MS, false, false, STEP, { x: cx, y: cy });
    this.avatar(owner)?.play('raise');
    const fx = this.fx(owner);
    fx.ring(cx, cy, 8, LIVING_CIRCLE_R, CHK.green, 520);
    fx.dust(cx, cy, 8, LIVING_CIRCLE_R * 0.7, 700, CHK.dust);
    this.api.showFloatingText(f.x, f.y - 50, '⭕ DRAW IT', this.hex(CHK.green));
    Sfx.playAt('mutate', f.x, { volume: 0.5, rate: 1.1 });
  }

  /**
   * The window has closed. Peel the drawing off the floor, read what is in it, and stand it up.
   *
   * The shapes are the build and the sticks are the material — nothing here is a random roll,
   * which is the whole reason the ability is worth three seconds of standing still.
   */
  private hatchLiving(owner: Owner, sess: Session): void {
    const drawn = this.marks.filter((m) => m.stroke === sess.stroke);
    this.marks = this.marks.filter((m) => m.stroke !== sess.stroke);
    this.staticDirty = true;
    const f = this.fighter(owner);
    if (!f) return;
    if (drawn.length < 3) {
      this.api.showFloatingText(f.x, f.y - 44, 'Nothing drawn', '#8a8a8a');
      return;
    }

    let cx = 0;
    let cy = 0;
    for (const m of drawn) { cx += m.x; cy += m.y; }
    cx /= drawn.length;
    cy /= drawn.length;

    const shapes = this.readShapes(drawn);
    const frac = (k: ChalkKind): number => drawn.filter((m) => m.kind === k).length / drawn.length;
    const boomFrac = frac('boom');
    const permaFrac = frac('perma');
    const whiteFrac = frac('shield');

    let radius = 0;
    const parts: LivingPart[] = drawn.map((m) => {
      radius = Math.max(radius, Phaser.Math.Distance.Between(cx, cy, m.x, m.y));
      return {
        dx: m.x - cx, dy: m.y - cy, pdx: m.px - cx, pdy: m.py - cy,
        linked: m.linked, seed: m.seed, color: TONE[m.kind],
      };
    });

    const maxHp = Math.round((LIVING_HP + shapes.square * LIVING_SQUARE_HP)
      * (1 + permaFrac * LIVING_PERMA_MULT));
    const damage = Math.round((LIVING_DAMAGE + shapes.tri * LIVING_TRI_DAMAGE)
      * (1 + boomFrac * LIVING_BOOM_MULT));
    const shield = Math.round(LIVING_SHIELD_HP * whiteFrac);
    const wakeAt = this.now + LIVING_WAKE_MS;

    this.livings.push({
      owner,
      x: cx,
      y: cy,
      ang: Math.atan2(cy - f.y, cx - f.x),
      hp: maxHp,
      maxHp,
      shield,
      shieldMax: shield,
      damage,
      speed: LIVING_SPEED + shapes.round * LIVING_CIRCLE_SPEED,
      radius: Phaser.Math.Clamp(radius, 16, LIVING_CIRCLE_R),
      parts,
      shapes,
      wakeAt,
      diesAt: wakeAt + LIVING_LIFE_MS,
      nextBiteAt: 0,
      gait: 0,
      seed: Math.random() * 999,
    });

    const fx = this.fx(owner);
    fx.ring(cx, cy, 10, LIVING_CIRCLE_R * 0.8, CHK.green, 620);
    const read: string[] = [];
    if (shapes.tri) read.push(`△×${shapes.tri}`);
    if (shapes.round) read.push(`◯×${shapes.round}`);
    if (shapes.square) read.push(`▢×${shapes.square}`);
    this.api.showFloatingText(cx, cy - 52, `🕷️ ${maxHp} HP · ${damage} DMG`, this.hex(CHK.green));
    if (read.length) this.api.showFloatingText(cx, cy - 70, read.join(' '), this.hex(CHK.teal));
    if (shield > 0) this.api.showFloatingText(cx, cy - 88, `🛡️ ${shield}`, this.hex(CHK.white));
    Sfx.playAt('vine-grow', cx, { volume: 0.5, rate: 1.2 });
  }

  /**
   * Every closed loop in the drawing, sorted into the three builds. Split on pen lifts, because
   * two circles drawn without lifting are one wandering line and should read as one shape.
   */
  private readShapes(run: Mark[]): { tri: number; round: number; square: number } {
    const out = { tri: 0, round: 0, square: 0 };
    let cur: Mark[] = [];
    const flush = (): void => {
      const shape = this.readShape(cur);
      if (shape) out[shape]++;
      cur = [];
    };
    for (const m of run) {
      if (!m.linked && cur.length) flush();
      cur.push(m);
    }
    flush();
    return out;
  }

  /**
   * What one stroke is, near enough.
   *
   * Corners are deliberately *not* counted — a hand-drawn triangle at 12px resolution has a
   * dozen of them and a shaky circle has four. Instead the stroke's radius about its own centre
   * is read as a signal and its 3rd and 4th harmonics compared: a lumpy triangle still has
   * nearly all of its wobble at three-per-turn, and a squashed square at four, whatever the
   * hand did between the corners. A stroke whose radius barely wobbles at all is a circle
   * before either harmonic is even consulted.
   */
  private readShape(pts: Mark[]): 'tri' | 'round' | 'square' | null {
    if (pts.length < 6) return null;

    let cx = 0;
    let cy = 0;
    for (const p of pts) { cx += p.x; cy += p.y; }
    cx /= pts.length;
    cy /= pts.length;

    let rMean = 0;
    let maxR = 0;
    for (const p of pts) {
      const r = Phaser.Math.Distance.Between(cx, cy, p.x, p.y);
      rMean += r;
      maxR = Math.max(maxR, r);
    }
    rMean /= pts.length;
    if (rMean < 10) return null;

    // Closed enough. Nobody shuts a chalk circle exactly, so the tolerance scales with the
    // size of the thing rather than being a flat number of pixels.
    const gap = Phaser.Math.Distance.Between(
      pts[0].x, pts[0].y, pts[pts.length - 1].x, pts[pts.length - 1].y,
    );
    if (gap > Math.max(34, maxR * 2 * LIVING_CLOSE_FRAC)) return null;

    let variance = 0;
    for (const p of pts) {
      variance += (Phaser.Math.Distance.Between(cx, cy, p.x, p.y) - rMean) ** 2;
    }
    if (Math.sqrt(variance / pts.length) / rMean < LIVING_ROUND_MAX) return 'round';

    const harmonic = (k: number): number => {
      let re = 0;
      let im = 0;
      for (const p of pts) {
        const th = Math.atan2(p.y - cy, p.x - cx);
        const r = Phaser.Math.Distance.Between(cx, cy, p.x, p.y);
        re += r * Math.cos(k * th);
        im += r * Math.sin(k * th);
      }
      return Math.hypot(re, im) / (pts.length * rMean);
    };
    const h3 = harmonic(3);
    const h4 = harmonic(4);
    if (Math.max(h3, h4) < LIVING_HARMONIC_MIN) return 'round';
    return h3 >= h4 ? 'tri' : 'square';
  }

  private hurtLiving(lv: Living, amount: number): void {
    let left = amount;
    // White chalk in the drawing is a coat of shield on it, spent before its health is.
    if (lv.shield > 0) {
      const eaten = Math.min(lv.shield, left);
      lv.shield -= eaten;
      left -= eaten;
    }
    if (left > 0) lv.hp -= left;
  }

  private dropLiving(index: number): void {
    const lv = this.livings[index];
    this.livings.splice(index, 1);
    const fx = this.fx(lv.owner);
    // It comes apart into the marks it was made of, which is the only honest way for a
    // drawing to die.
    for (let i = 0; i < lv.parts.length; i += 3) {
      fx.dust(lv.x + lv.parts[i].dx, lv.y + lv.parts[i].dy, 2, 14, 520, lv.parts[i].color);
    }
    this.api.showFloatingText(lv.x, lv.y - 40, '🧹 RUBBED OUT', this.hex(CHK.whiteDim));
  }

  private killLiving(owner: Owner): void {
    const i = this.livings.findIndex((l) => l.owner === owner);
    if (i >= 0) this.dropLiving(i);
  }

  private updateLivings(time: number, delta: number): void {
    if (!this.livings.length) return;
    const dt = delta / 1000;
    for (let i = this.livings.length - 1; i >= 0; i--) {
      const lv = this.livings[i];
      const artist = this.fighter(lv.owner);
      if (!artist || !artist.active || artist.hp <= 0) { this.dropLiving(i); continue; }
      if (time >= lv.diesAt) { this.dropLiving(i); continue; }
      // Getting up. It shivers on the floor and does nothing at all until it is standing.
      if (time < lv.wakeAt) continue;
      lv.gait += dt * (4.5 + lv.speed / 30);

      const target = this.nearestTarget(lv.owner, lv.x, lv.y);
      if (target) {
        const d = Phaser.Math.Distance.Between(lv.x, lv.y, target.x, target.y);
        lv.ang = Phaser.Math.Angle.RotateTo(lv.ang, Math.atan2(target.y - lv.y, target.x - lv.x), dt * 5);
        if (d > LIVING_REACH) {
          lv.x = Phaser.Math.Clamp(lv.x + Math.cos(lv.ang) * lv.speed * dt, this.left, this.right);
          lv.y = Phaser.Math.Clamp(lv.y + Math.sin(lv.ang) * lv.speed * dt, this.top, this.bottom);
        } else if (time >= lv.nextBiteAt) {
          lv.nextBiteAt = time + LIVING_BITE_MS;
          const dmg = Math.max(1, Math.round(lv.damage * this.chalkDamageMult(lv.owner, target)));
          target.takeDamage(dmg);
          this.api.spawnHitFlash(target.x, target.y, CHK.green);
          this.fx(lv.owner).dust(lv.x, lv.y, 6, 20, 340, CHK.dust);
          this.api.showFloatingText(target.x, target.y - 46, '🕷️ BITE', this.hex(CHK.green));
          Sfx.playAt('claw', lv.x, { volume: 0.38, rate: 0.85 });
        }
      }

      // Shots hit it. It is not a `Fighter`, so nothing in ArenaScene's overlap can find it —
      // the kit is the only thing that can give it a body to be shot in.
      for (const child of [...this.api.projectiles.getChildren()]) {
        const proj = child as Projectile;
        if (!proj.active) continue;
        const hostile = lv.owner === 'player' ? !proj.isFromPlayer : proj.isFromPlayer;
        if (!hostile) continue;
        if (Phaser.Math.Distance.Between(lv.x, lv.y, proj.x, proj.y) > lv.radius + 10) continue;
        this.hurtLiving(lv, proj.damage);
        this.fx(lv.owner).snap(proj.x, proj.y, lv.shield > 0 ? CHK.white : CHK.green);
        this.api.spawnHitFlash(proj.x, proj.y, CHK.dust);
        proj.destroy();
        if (lv.hp <= 0) break;
      }
      if (lv.hp <= 0) this.dropLiving(i);
    }
  }

  /**
   * The bot's own trigger. It lives here rather than in `doChalkAbilities` because enhancement
   * ids are not in `element.abilities` — `castAbility('living-chalk')` would do nothing at all
   * — so the kit is the only thing that can pull it. The synergy the AI is handed instead is
   * the shape: its phantom cursor walks a triangle inside the circle (see `advanceCursor`), so
   * the bot's drawing is reliably the damage build rather than an accident.
   */
  private updateNpcLiving(time: number): void {
    // Online the npc is a remote player: their own client casts it and it arrives via replay.
    if (this.api.isOnline) return;
    const s = this.sides.npc;
    if (!this.livingSlot('npc')) return;
    if (s.session || s.mpOn) return;
    if (time - s.livingCastAt < LIVING_COOLDOWN_MS) return;
    const f = this.api.npc;
    const target = this.api.player;
    if (!f || !f.active || f.hp <= 0) return;
    if (!target || !target.active || target.hp <= 0) return;
    // Three seconds of drawing is only worth it if there is somebody for it to walk at.
    if (Phaser.Math.Distance.Between(f.x, f.y, target.x, target.y) > 520) return;
    this.tryCastLiving('npc', target.x, target.y);
  }

  // ── Avatars ────────────────────────────────────────────────────────────────

  private updateAvatars(delta: number, playerIs: boolean, npcIs: boolean): void {
    const { scene } = this.api;

    if (playerIs) {
      const f = this.api.player;
      if (!this.playerAvatar) this.playerAvatar = new ChalkAvatar(scene, this.pcol);
      const s = this.sides.player;
      this.playerAvatar.setFacing(Math.atan2(this.aimY - f.y, this.aimX - f.x));
      this.playerAvatar.setChalk(this.heldChalk('player'));
      this.playerAvatar.setDrawing(!!s.session && (!s.session.requireHold || this.holding));
      this.playerAvatar.setIntensity(s.mpOn ? 1.35 : 1);
      this.playerAvatar.setMastered(this.api.masteryActive);
      this.playerAvatar.update(delta, f.x, f.y, f.active && f.hp > 0 ? f.alpha : 0);
    } else if (this.playerAvatar) {
      this.playerAvatar.destroy();
      this.playerAvatar = null;
    }

    if (npcIs) {
      const f = this.api.npc;
      if (!this.npcAvatar) this.npcAvatar = new ChalkAvatar(scene, this.ncol);
      const s = this.sides.npc;
      this.npcAvatar.setFacing(Math.atan2(s.curY - f.y, s.curX - f.x));
      this.npcAvatar.setChalk(this.heldChalk('npc'));
      this.npcAvatar.setDrawing(!!s.session);
      this.npcAvatar.setIntensity(s.mpOn ? 1.35 : 1);
      this.npcAvatar.setMastered(this.api.npcMasteryActive);
      this.npcAvatar.update(delta, f.x, f.y, f.active && f.hp > 0 ? f.alpha : 0);
    } else if (this.npcAvatar) {
      this.npcAvatar.destroy();
      this.npcAvatar = null;
    }
  }

  // ── Painting ───────────────────────────────────────────────────────────────

  /** Chalk that is just lying there. Only redrawn when the set actually changes. */
  private paintStatic(): void {
    const g = this.staticGfx;
    if (!g || !this.staticDirty) return;
    this.staticDirty = false;
    g.clear();
    for (const m of this.marks) {
      if (m.fuseAt !== 0) continue;
      this.paintMark(g, m, 1);
    }
  }

  /** Chalk with a fuse burning — few, brief, and it has to be seen counting down. */
  private paintLive(time: number): void {
    const g = this.liveGfx;
    if (!g) return;
    g.clear();
    for (const m of this.marks) {
      if (m.fuseAt === 0) continue;
      // Brightens as its turn approaches, so a red line visibly runs hot from one end.
      const left = m.fuseAt - time;
      const near = Phaser.Math.Clamp(1 - left / (m.kind === 'boom' ? 900 : WARD_FUSE_MS), 0, 1);
      const pulse = 0.75 + 0.25 * Math.sin(this.vizT * 22 + m.seed);
      this.paintMark(g, m, 0.75 + near * 0.25);
      if (near > 0.45) {
        const gg = g;
        gg.fillStyle(this.col(m.owner)(CHK.spark), (near - 0.45) * 1.5 * pulse);
        gg.fillCircle(m.x, m.y, 2 + near * 3);
      }
    }

    this.paintEnclosures(g, time);
    this.paintClouds(g, time);
  }

  /**
   * Explosive Release — the shut-in floor, hatched while it waits. Drawn as chalk on chalk
   * rather than a coloured fill: what is dangerous here is the shape the player drew, and it
   * has to be obvious that the danger is *inside* it.
   */
  private paintEnclosures(g: Phaser.GameObjects.Graphics, time: number): void {
    for (const blast of this.areaBlasts) {
      const tint = this.col(blast.owner);
      const left = blast.at - time;
      const heat = Phaser.Math.Clamp(1 - left / 1200, 0, 1);
      const pulse = 0.55 + 0.45 * Math.sin(this.vizT * (6 + heat * 22));

      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;
      for (const p of blast.poly) {
        minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
        minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
      }
      // Hatching, clipped to the shape by testing each span's midpoint — cheaper than a mask
      // and it keeps the ragged, drawn-by-hand edge the rest of the element has.
      const poly = new Phaser.Geom.Polygon(blast.poly);
      g.lineStyle(1.5, tint(CHK.red), 0.16 + heat * 0.3 * pulse);
      for (let y = minY; y <= maxY; y += 14) {
        for (let x = minX; x <= maxX; x += 22) {
          if (!poly.contains(x + 8, y)) continue;
          g.lineBetween(x, y + 6, x + 12, y - 6);
        }
      }
      g.fillStyle(tint(CHK.red), 0.05 + heat * 0.12);
      g.fillPoints(blast.poly, true);
    }
  }

  /** Chalk Debris — powder still hanging in the air where a ward went off. */
  private paintClouds(g: Phaser.GameObjects.Graphics, time: number): void {
    for (const c of this.clouds) {
      const life = Phaser.Math.Clamp((c.until - time) / DEBRIS_MS, 0, 1);
      const tint = this.col(c.owner);
      // Puffs rather than a disc: a circle would read as a rune, and this is just dust.
      for (let i = 0; i < 9; i++) {
        const a = grain(c.seed, i) * Math.PI * 2 + this.vizT * 0.25;
        const d = DEBRIS_RADIUS * (0.25 + grain(c.seed, i + 40) * 0.7);
        const r = 7 + grain(c.seed, i + 80) * 11;
        const bob = Math.sin(this.vizT * 1.6 + i) * 3;
        chalkBlob(g, tint, c.x + Math.cos(a) * d, c.y + Math.sin(a) * d + bob, r,
          CHK.dust, 0.1 + life * 0.16, c.seed + i * 5);
      }
      g.lineStyle(1, tint(CHK.dust), 0.1 + life * 0.14);
      g.strokeCircle(c.x, c.y, DEBRIS_RADIUS);
    }
  }

  /**
   * Chalk Mastery — everything of this element's that walks.
   *
   * Both kinds are drawn as chalk that has been *given legs*, not as new creatures: a biter is
   * the same grainy blob a mark is, and a Living Chalk is literally the player's own strokes,
   * held in the pose they were drawn in and bobbing along on six legs underneath. Nothing here
   * is rotated to the heading — the legs and the eyes carry the direction, because a drawing
   * spun round to face east stops being the drawing you made.
   */
  private paintCrawlers(time: number): void {
    const g = this.crawlGfx;
    if (!g) return;
    g.clear();

    for (const sm of this.smudges) {
      const tint = this.col(sm.owner);
      const color = TONE[sm.chalk];
      // Fading out thins rather than blinking, and a fresh one swells into being.
      const life = sm.until > 0 ? Phaser.Math.Clamp((sm.until - time) / 900, 0, 1) : 1;
      const alpha = 0.45 + life * 0.5;
      const born = Phaser.Math.Clamp((time - sm.bornAt) / 260, 0, 1);

      if (sm.guard) {
        chalkLegs(g, tint, sm.x, sm.y, sm.ang, SMUDGE_BAR_HALF * 0.55, 14, sm.gait, color, alpha, sm.seed);
        const hx = Math.cos(sm.ang) * SMUDGE_BAR_HALF * born;
        const hy = Math.sin(sm.ang) * SMUDGE_BAR_HALF * born;
        chalkLine(g, tint, sm.x - hx, sm.y - hy, sm.x + hx, sm.y + hy,
          SMUDGE_BAR_THICK, color, alpha, sm.seed);
        // A bar looks the way it walks: eyes on the leading long edge, not on an end.
        chalkEyes(g, tint, sm.x, sm.y, sm.ang + Math.PI / 2, 7, 1.6, alpha);
        // How many shots are left in it. A blue bar has no count — it never runs out.
        if (Number.isFinite(sm.blocks)) {
          for (let b = 0; b < sm.blocks; b++) {
            g.fillStyle(tint(CHK.dust), alpha * 0.8);
            g.fillCircle(sm.x + Math.cos(sm.ang) * (b - 1) * 7 + Math.cos(sm.ang + Math.PI / 2) * 13,
              sm.y + Math.sin(sm.ang) * (b - 1) * 7 + Math.sin(sm.ang + Math.PI / 2) * 13, 1.6);
          }
        } else {
          g.lineStyle(1, tint(CHK.blue), 0.2 + 0.16 * Math.sin(this.vizT * 3 + sm.seed));
          g.strokeCircle(sm.x, sm.y, SMUDGE_BAR_HALF + 6);
        }
        continue;
      }

      chalkLegs(g, tint, sm.x, sm.y, sm.ang, 4.5, 12, sm.gait, color, alpha, sm.seed);
      chalkBlob(g, tint, sm.x, sm.y, SMUDGE_BODY_R * born, color, alpha, sm.seed);
      chalkEyes(g, tint, sm.x, sm.y, sm.ang, 6, 1.5, alpha);
      // The blue one is the only permanent thing the passive makes, so it is ringed.
      if (sm.chalk === 'perma') {
        g.lineStyle(1, tint(CHK.blue), 0.24 + 0.2 * Math.sin(this.vizT * 4 + sm.seed));
        g.strokeCircle(sm.x, sm.y, SMUDGE_BODY_R + 5);
      }
      // …and the green one shows the reach of what it is actually for.
      if (sm.chalk === 'green') {
        g.lineStyle(1, tint(CHK.green), 0.1 + 0.09 * Math.sin(this.vizT * 2.5 + sm.seed));
        g.strokeCircle(sm.x, sm.y, SMUDGE_GREEN_RADIUS);
      }
      // The red one is a fuse walking, so it burns brighter the closer it gets.
      if (sm.chalk === 'boom') {
        g.fillStyle(tint(CHK.spark), 0.3 + 0.3 * Math.abs(Math.sin(this.vizT * 9 + sm.seed)));
        g.fillCircle(sm.x, sm.y, 2.4);
      }
    }

    for (const lv of this.livings) {
      const tint = this.col(lv.owner);
      const waking = time < lv.wakeAt;
      const rise = Phaser.Math.Clamp(1 - (lv.wakeAt - time) / LIVING_WAKE_MS, 0, 1);
      const alpha = waking ? 0.45 + rise * 0.55 : 1;
      // Rising: it peels off the board and shivers before it is standing on anything.
      const lift = waking ? rise * 6 : 6 + Math.sin(lv.gait) * 1.7;
      const wob = waking ? (1 - rise) * Math.sin(time / 22) * 3 : Math.sin(lv.gait * 0.9) * 1.3;

      if (!waking) {
        chalkLegs(g, tint, lv.x, lv.y, lv.ang, lv.radius * 0.45, lv.radius * 0.8 + 6, lv.gait,
          CHK.dust, 0.85, lv.seed);
      }
      for (const p of lv.parts) {
        const x1 = lv.x + p.dx + wob;
        const y1 = lv.y + p.dy - lift;
        if (p.linked) {
          chalkLine(g, tint, lv.x + p.pdx + wob, lv.y + p.pdy - lift, x1, y1, 3, p.color, alpha, p.seed);
        } else {
          chalkBlob(g, tint, x1, y1, 2.6, p.color, alpha, p.seed);
        }
      }
      chalkEyes(g, tint,
        lv.x + Math.cos(lv.ang) * lv.radius * 0.5, lv.y + Math.sin(lv.ang) * lv.radius * 0.5 - lift,
        lv.ang, 9, 2.2, alpha);
      if (waking) continue;

      // A coat of white chalk reads as a coat: a hand-drawn ring that thins as it is spent.
      if (lv.shield > 0) {
        g.lineStyle(2, tint(CHK.white), 0.2 + 0.4 * (lv.shield / Math.max(1, lv.shieldMax)));
        g.strokeCircle(lv.x, lv.y - lift * 0.5, lv.radius + 7);
      }
      const w = Phaser.Math.Clamp(lv.radius * 1.3, 26, 70);
      const by = lv.y + lv.radius * 0.6 + 10;
      g.fillStyle(tint(CHK.slate), 0.8);
      g.fillRect(lv.x - w / 2, by, w, 3);
      g.fillStyle(tint(CHK.green), 0.95);
      g.fillRect(lv.x - w / 2, by, w * Phaser.Math.Clamp(lv.hp / lv.maxHp, 0, 1), 3);
    }
  }

  private paintMark(g: Phaser.GameObjects.Graphics, m: Mark, alpha: number): void {
    const tint = this.col(m.owner);
    const color = TONE[m.kind];
    // A run reads as one line; a lone dab reads as a dot. Both are chalk, neither is a shape.
    if (m.linked) chalkLine(g, tint, m.px, m.py, m.x, m.y, 3, color, alpha, m.seed);
    else chalkBlob(g, tint, m.x, m.y, 2.6, color, alpha, m.seed);
  }

  /** The shield in orbit, and the ring you are allowed to draw it inside. */
  private paintAir(time: number): void {
    const g = this.airGfx;
    if (!g) return;
    g.clear();

    for (const owner of ['player', 'npc'] as Owner[]) {
      if (!this.isChalk(owner)) continue;
      const s = this.side(owner);
      const f = this.fighter(owner);
      if (!f || !f.active || f.hp <= 0) continue;
      const tint = this.col(owner);

      // Drawing area — a dashed hand-drawn ring, cheap enough to run every frame. The shield's
      // rides the caster; Living Chalk's stands still on the floor where it was opened.
      const ring = s.session?.confined
        ? { x: f.x, y: f.y, r: SHIELD_RANGE, color: CHK.white }
        : s.session?.living
          ? { x: s.session.living.x, y: s.session.living.y, r: LIVING_CIRCLE_R, color: CHK.green }
          : null;
      if (ring && s.session) {
        const fade = Phaser.Math.Clamp((s.session.until - time) / 260, 0, 1);
        const dashes = 22;
        for (let i = 0; i < dashes; i++) {
          if (grain(i * 3.3, 1) > 0.82) continue;
          const a0 = (i / dashes) * Math.PI * 2 + this.vizT * 0.5;
          const a1 = a0 + (Math.PI * 2 / dashes) * 0.62;
          g.lineStyle(2, tint(ring.color), 0.5 * fade);
          g.lineBetween(
            ring.x + Math.cos(a0) * ring.r, ring.y + Math.sin(a0) * ring.r,
            ring.x + Math.cos(a1) * ring.r, ring.y + Math.sin(a1) * ring.r,
          );
        }
      }

      // The shield itself: every surviving node, joined into a ragged ring.
      if (!s.shieldNodes.length) continue;
      const ratio = Phaser.Math.Clamp(s.shieldHp / s.shieldMax, 0, 1);
      let prevX = 0;
      let prevY = 0;
      s.shieldNodes.forEach((n, i) => {
        const a = n.ang + s.shieldSpin;
        const wob = 1 + Math.sin(this.vizT * 3 + n.seed) * 0.03;
        const nx = f.x + Math.cos(a) * n.dist * wob;
        const ny = f.y + Math.sin(a) * n.dist * wob;
        // A mixed shield is drawn in the colours it was drawn in — which piece is which is
        // the difference between leaning on it and being burned for leaning on it.
        const tone = TONE[n.kind];
        if (i > 0 && Phaser.Math.Distance.Between(prevX, prevY, nx, ny) < 74) {
          chalkLine(g, tint, prevX, prevY, nx, ny, 3, tone, 0.45 + ratio * 0.45, n.seed);
        }
        chalkBlob(g, tint, nx, ny, 3.4, tone, 0.55 + ratio * 0.45, n.seed);
        prevX = nx;
        prevY = ny;
      });
    }
  }

  /** Chalk in hand, what is on the floor, and the shield's remaining board. */
  private paintHud(playerIsChalk: boolean): void {
    const g = this.hudGfx;
    if (!g) return;
    g.clear();
    if (!playerIsChalk) {
      this.hudLabel?.setVisible(false);
      return;
    }

    const s = this.sides.player;
    const x = this.left + 8;
    const y = this.top + 8;
    const held = this.heldChalk('player');

    g.fillStyle(0x05070a, 0.85);
    g.fillRoundedRect(x - 4, y - 4, 176, 34, 4);
    g.lineStyle(1.5, this.pcol(held), 0.7);
    g.strokeRoundedRect(x - 4, y - 4, 176, 34, 4);

    // The stick currently in hand, then the Masterpiece colours as a palette. Prodigy adds a
    // fourth stick to it, so the rack is only as wide as the palette actually is.
    chalkStick(g, this.pcol, x + 16, y + 13, -0.5, 26, held, 1);
    const palette: MpKind[] = this.up('player', 'q') ? MP_KINDS : ['green', 'orange', 'teal'];
    palette.forEach((k, i) => {
      const px = x + 118 + (i - (palette.length - 3)) * 18;
      const on = s.mpOn && s.mpChalk === k;
      chalkStick(g, this.pcol, px, y + 13, -1.2, on ? 22 : 15, TONE[k], s.mpOn ? (on ? 1 : 0.4) : 0.22);
    });

    // Shield board, only while there is one. Red pieces tint it, because a shield that hits
    // back is a different object to hide behind than one that only soaks.
    if (s.shieldNodes.length) {
      const w = 176;
      const by = y + 36;
      g.fillStyle(0x05070a, 0.85);
      g.fillRoundedRect(x - 4, by - 3, w, 12, 3);
      g.fillStyle(this.pcol(CHK.slate), 0.9);
      g.fillRect(x, by, w - 8, 6);
      g.fillStyle(this.pcol(s.shieldBoom > 0.5 ? CHK.red : CHK.white), 1);
      g.fillRect(x, by, (w - 8) * Phaser.Math.Clamp(s.shieldHp / s.shieldMax, 0, 1), 6);
    }

    if (!this.hudLabel) {
      this.hudLabel = this.api.scene.add.text(x + 34, y + 6, '', {
        fontSize: '10px',
        fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
        color: '#f4f1e6',
        stroke: '#05070a',
        strokeThickness: 3,
      }).setDepth(21).setScrollFactor(0);
    }
    const perma = this.marks.filter((m) => m.owner === 'player' && m.kind === 'perma').length;
    // What the blue line has been taught matters more than how many dabs of it there are.
    const permaLine = s.permaEnhance ? `PERMA ${LABEL[s.permaEnhance].split(' ')[0]}` : `PERMA ${perma}`;
    this.hudLabel.setVisible(true);
    this.hudLabel.setText(
      // Just the colour while the work is up — the palette rack sits where the long form of
      // the label would run into it, and the sticks say the rest anyway.
      s.mpOn ? `${LABEL[s.mpChalk].split(' ')[0]}\nHOLD LMB · ${this.up('player', 'q') ? 'E/R/F/Q' : 'E/R/F'}`
        // Inside the little circle the stick in hand is the *material*, not the ability, so
        // the label says both — which stick, and what it is being spent on.
        : s.session?.living ? `LIVING · ${LABEL[s.session.kind].split(' ')[0]}\nDRAW IN THE CIRCLE`
          : `${s.session ? LABEL[s.session.kind] : 'CHALK'}\n${permaLine}`,
    );
    this.hudLabel.setColor(this.hex(held));
  }

  // ── Status tray ────────────────────────────────────────────────────────────

  private pushStatuses(playerIsChalk: boolean, time: number): void {
    const s = this.sides.player;

    this.api.setStatusIndicator('chalk-drawing', playerIsChalk && s.session ? {
      name: s.session.living ? 'Drawing a body' : `${LABEL[s.session.kind]} chalk`,
      emoji: '🖍️', color: TONE[s.session.kind],
      description: s.session.living
        ? 'Your cursor is pinned inside the circle. Triangles make it hit harder, circles make it faster, squares make it tougher — and the three keys you did not bind Living Chalk over are the other three sticks.'
        : 'Your cursor is laying chalk. Where you move the mouse is where the chalk goes.',
      until: s.session.until, priority: 118,
    } : null);

    this.api.setStatusIndicator('chalk-masterpiece', playerIsChalk && s.mpOn ? {
      name: 'Masterpiece', emoji: '🎨', color: CHK.teal,
      description: 'Untouchable while it lasts. Hold the mouse to draw and press E, R or F to change chalk.',
      until: s.mpUntil, priority: 100,
    } : null);

    this.api.setStatusIndicator('chalk-shield', playerIsChalk && s.shieldNodes.length > 0 ? {
      name: s.shieldBoom > 0 ? 'Armed Shield' : 'Chalk Shield',
      emoji: '🛡️', color: s.shieldBoom > 0.5 ? CHK.red : CHK.white,
      description: s.shieldBoom > 0
        ? 'A ring of chalk turning around you, with red in it. It eats shots and hits, and the red pieces go off in the face of whoever landed them.'
        : 'A ring of chalk turning around you. It eats shots, hits and anything that walks into it until its board runs out.',
      count: Math.max(0, Math.round(s.shieldHp)), suffix: ' HP', priority: 104,
    } : null);

    this.api.setStatusIndicator('chalk-crimson', playerIsChalk && s.onCrimson ? {
      name: 'Crimson Chalk', emoji: '🩸', color: CHK.crimson,
      description: `Standing on crimson — every kind of chalk you own hits ${PRODIGY_BOOST}× as hard while you stay on it.`,
      priority: 124,
    } : null);

    this.api.setStatusIndicator('chalk-perma-taught', playerIsChalk && s.permaEnhance ? {
      name: `Perma: ${LABEL[s.permaEnhance!].split(' ')[0].toLowerCase()}`,
      emoji: '🔵', color: TONE[s.permaEnhance!],
      description: 'Your last Masterpiece taught the blue line a colour. It keeps it until you start another one.',
      priority: 96,
    } : null);

    this.api.setStatusIndicator('chalk-teal', playerIsChalk && s.onTeal ? {
      name: 'Teal Chalk', emoji: '💨', color: CHK.teal,
      description: `Standing on your own teal — ${Math.round((MP_SPEED_MULT - 1) * 100)}% faster while you stay on it.`,
      priority: 122,
    } : null);

    this.api.setStatusIndicator('chalk-green', playerIsChalk && s.onGreen ? {
      name: 'Green Chalk', emoji: '💚', color: CHK.green,
      description: `Standing on your own green — ${MP_HEAL_DPS} HP a second while you stay on it.`,
      priority: 123,
    } : null);

    // The victim side: whatever hostile chalk the local player is currently standing in.
    const burning = this.marks.some((m) => (m.kind === 'perma' || m.kind === 'orange')
      && m.owner === 'npc'
      && Phaser.Math.Distance.Between(m.x, m.y, this.api.player.x, this.api.player.y)
        <= (m.kind === 'perma' ? PERMA_RADIUS : MP_TOUCH_R));
    this.api.setStatusIndicator('chalk-burn', burning ? {
      name: 'On Their Chalk', emoji: '🔥', color: CHK.orange,
      description: 'You are standing on somebody else\'s chalk, and it is taking it out of you. Step off it.',
      priority: 16,
    } : null);

    // Mastery: the swarm, counted rather than listed — twenty-four of them would be a wall of
    // boxes, and what actually matters is how many are out and whether any of them are blue.
    const mine = this.smudges.filter((sm) => sm.owner === 'player');
    // Blue is the only chalk that makes something permanent, biter or bar alike.
    const permanent = mine.filter((sm) => sm.chalk === 'perma').length;
    this.api.setStatusIndicator('chalk-smudges', playerIsChalk && mine.length > 0 ? {
      name: permanent > 0 ? `Smudges (${permanent} blue)` : 'Smudges',
      emoji: '🕷️', color: CHK.smudge,
      description: 'Smears that came off your own chalk and grew legs. What each one does is whatever it was smudged off — white bites, red bursts, blue never dies, and the ones from a shield window are bars that eat shots.',
      count: mine.length, priority: 108,
    } : null);

    const living = this.livings.find((lv) => lv.owner === 'player');
    this.api.setStatusIndicator('chalk-living', playerIsChalk && living ? {
      name: 'Living Chalk', emoji: '🖍️', color: CHK.green,
      description: `Your drawing, on legs — ${living!.damage} damage a bite every ${(LIVING_BITE_MS / 1000).toFixed(1)}s. It dies when its health runs out or ${Math.ceil(LIVING_LIFE_MS / 1000)} seconds after it stood up.`,
      count: Math.max(0, Math.round(living!.hp)), suffix: ' HP', until: living!.diesAt, priority: 106,
    } : null);

    const p = this.api.player;
    this.api.setStatusIndicator('chalk-debris', this.inCloud('npc', p.x, p.y) ? {
      name: 'Chalk Debris', emoji: '🌫️', color: CHK.dust,
      description: `Dust in your lungs — ${Math.round((1 - DEBRIS_SLOW) * 100)}% slower, and every piece of their chalk hits you ${DEBRIS_AMP}× as hard. Get out of the cloud.`,
      priority: 14,
    } : null);

    void time;
  }

  // ── Accessors read by ArenaScene / the NPC ─────────────────────────────────

  /**
   * Chalk's two movement effects, pulled by ArenaScene rather than pushed. Teal is the
   * artist's own; debris is done *to* whoever is standing in it, so it applies whether or not
   * that side is a chalk fighter at all.
   */
  private speedMultFor(owner: Owner): number {
    let mult = this.isChalk(owner) && this.side(owner).onTeal ? MP_SPEED_MULT : 1;
    const f = this.fighter(owner);
    const enemy: Owner = owner === 'player' ? 'npc' : 'player';
    if (f && this.inCloud(enemy, f.x, f.y)) mult *= DEBRIS_SLOW;
    return mult;
  }

  getPlayerSpeedMult(): number { return this.speedMultFor('player'); }
  getNpcSpeedMult(): number { return this.speedMultFor('npc'); }

  /** True while a side has a drawing window open — the AI must not start a second one. */
  isDrawing(owner: Owner): boolean { return !!this.side(owner).session; }

  getShieldHp(owner: Owner): number { return this.side(owner).shieldHp; }

  isMasterpieceActive(owner: Owner): boolean { return this.side(owner).mpOn; }

  /** Whether this side has a blue line down, so the AI redraws rather than duplicates. */
  hasPerma(owner: Owner): boolean {
    const stroke = this.side(owner).permaStroke;
    return stroke >= 0 && this.marks.some((m) => m.stroke === stroke);
  }

  /**
   * The slot Living Chalk has taken over on the bot's side, or null. `doChalkAbilities` reads
   * this and skips that slot's base ability — the enhancement replaces it outright, exactly as
   * it does for the player, and a bot casting Explosive Chalk off a key it no longer owns would
   * be the only sim on which the bind does nothing.
   */
  npcLivingSlot(): 'e' | 'r' | 'f' | 'q' | null {
    return this.livingSlot('npc');
  }

  /**
   * Ruin's Spikes of Ruin (see `combat/SummonPurge.ts`). Smudges and a Living Chalk are the
   * only things Chalk *summons* — marks on the floor are decals and the shield is worn, so
   * neither is touched here.
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
    for (let i = this.smudges.length - 1; i >= 0; i--) {
      const sm = this.smudges[i];
      if (sm.owner === exceptOwner) continue;
      if (!near(sm.x, sm.y)) continue;
      // Razed, not detonated — a red smudge scrubbed off the board does not get to go off.
      this.rubOut(sm, i, false);
      razed++;
    }
    for (let i = this.livings.length - 1; i >= 0; i--) {
      const lv = this.livings[i];
      if (lv.owner === exceptOwner) continue;
      if (!near(lv.x, lv.y)) continue;
      this.dropLiving(i);
      razed++;
    }
    return razed;
  }

  /** AI pacing gate — the blue line is not worth redrawing every time R comes back up. */
  mayRedrawPerma(owner: Owner, time: number): boolean {
    const s = this.side(owner);
    if (time < s.nextPermaAt) return false;
    s.nextPermaAt = time + 9000;
    return true;
  }

  /**
   * Ability tray fill. Chalk's cards spend most of their time showing something other than a
   * cooldown: a window counting down while it is being drawn, a shield's remaining board, or
   * the Masterpiece's own clock.
   */
  getBarRatio(abilityId: string, time: number): number {
    const s = this.sides.player;
    const p = this.api.player;

    // Mastery: the card counts the drawing window, then whatever it made, then the cooldown —
    // the enhancement has no `Fighter` cooldown at all, so this is its only clock.
    if (abilityId === 'living-chalk') {
      if (s.session?.living) return Phaser.Math.Clamp((s.session.until - time) / s.session.total, 0, 1);
      const alive = this.livings.find((lv) => lv.owner === 'player');
      if (alive) return Phaser.Math.Clamp(alive.hp / alive.maxHp, 0, 1);
      return Phaser.Math.Clamp((time - s.livingCastAt) / LIVING_COOLDOWN_MS, 0, 1);
    }

    if (abilityId === 'chalk-shield' && s.shieldNodes.length) {
      return Phaser.Math.Clamp(s.shieldHp / SHIELD_HP, 0, 1);
    }
    if (abilityId === 'chalk-masterpiece' && s.mpOn) {
      return Phaser.Math.Clamp((s.mpUntil - time) / MP_MS, 0, 1);
    }
    if (abilityId === 'chalk-perma' && this.hasPerma('player') && !s.session) return 1;

    const sess = s.session;
    if (sess) {
      // A Supreme Shield window may be holding any of three sticks, so the card it belongs to
      // is decided by `confined` rather than by what is in hand at the moment you look.
      const owns = sess.confined
        ? abilityId === 'chalk-shield'
        : (abilityId === 'chalk-ward' && sess.kind === 'ward')
          || (abilityId === 'chalk-explosive' && sess.kind === 'boom')
          || (abilityId === 'chalk-perma' && sess.kind === 'perma');
      if (owns) return Phaser.Math.Clamp((sess.until - time) / sess.total, 0, 1);
    }

    return p.getCooldownRatio(abilityId);
  }
}
