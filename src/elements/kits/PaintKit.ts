import Phaser from 'phaser';
import { Sfx } from '../../audio';
import { Fighter } from '../../entities/Fighter';
import { Projectile } from '../../combat/Projectile';
import type { SummonPurgeTarget } from '../../combat/SummonPurge';
import type { NetPaintMsg } from '../../network/NetworkManager';
import { CastContext } from '../Ability';
import type { CustomStatus } from './StatusHudKit';
import {
  PAINT_TONE, PNT, PaintAvatar, PaintColorFn, PaintFx, PaintKind, paintBrush, paintChip,
  PaintSeg, paintDab, paintLayer, paintRing, paintStroke, yinYang,
} from './PaintVisuals';
import { FONT_DISPLAY } from '../../ui/Theme';

/**
 * Paint — the messy painter. The element id is still `chalk` (the element this replaced), so
 * every save, unlock and campaign world keyed on it carries straight over.
 *
 * Two kinds of painting run through the whole kit:
 *
 *  - **Canvases** (Splotch's right-click, Still Life) open a sheet of paper over the arena and
 *    whatever is painted on it becomes a *thing*: the shape every Splotch flies as, or what the
 *    enemy turns into. Canvas paint is in canvas pixels about the sheet's centre and is scaled
 *    into the world only when it is used.
 *  - **The floor** (E, R, Q) opens a timed window during which the cursor lays dabs of paint
 *    behind it. What the dabs do is the only difference between the three.
 *
 * Red, blue and green mean the same on every ability that unlocks them: hurt, haste, heal.
 *
 * The bot has no mouse: canvases are filled from templates and the floor is painted by a
 * phantom cursor. Online, the remote painter's canvases and strokes arrive as `pnt` messages,
 * so what lands on this sim is what they actually painted rather than a guess.
 */

type Owner = 'player' | 'npc';
type Slot = 'e' | 'r' | 'f' | 'q';
const SLOTS: Slot[] = ['e', 'r', 'f', 'q'];
const OWNERS: Owner[] = ['player', 'npc'];
/** Index order for paint kinds on the wire. */
const KINDS: PaintKind[] = ['black', 'orange', 'congeal', 'red', 'blue', 'green', 'white'];

// ── Tuning ───────────────────────────────────────────────────────────────────

const ARENA_PAD = 32;
const MAX_DABS = 760;
/** Cursor travel past this between two dabs lifts the brush instead of drawing a stripe. */
const LIFT = 96;
/** Per-victim blast immunity, so a dense line cannot chain-delete anyone. */
const BLAST_GATE_MS = 180;

// Click — Splotch, and the canvas behind it.
const SPLOTCH_SPEED = 420;
const SPLOTCH_LIFE_MS = 1250;
/**
 * Contact damage accrues continuously while a blob overlaps a body, at one `SPLOTCH_TICK_DMG` per
 * this many ms (with fractions carried) — effectively every frame.
 */
const SPLOTCH_TICK_MS = 16;
/** Contact damage per tick for a reference-sized shape. */
const SPLOTCH_TICK_DMG = 3.5;
/** The dab count a "normal" shape has — fewer concentrates the damage, more spreads it. */
const SPLOTCH_REF_DABS = 10;
const SPLOTCH_CONC_MIN = 0.3;
const SPLOTCH_CONC_MAX = 1.6;
const SPLOTCH_MAX_ALIVE = 14;
/** Click+: an all-red shape hits this much harder. */
const SPLOTCH_RED_BONUS = 0.9;
/** Click+: an all-blue shape slows by this much. */
const SPLOTCH_BLUE_SLOW = 0.5;
const SPLOTCH_SLOW_MS = 1400;
/** Click+: an all-green shape leaves this much poison a second. */
const SPLOTCH_GREEN_DPS = 10;
const SPLOTCH_DOT_MS = 4000;
const SHAPE_DAB_R = 5;
const CANVAS_PX = 220;
/** Canvas pixels → world pixels, for both canvases. */
const CANVAS_SCALE = 0.55;
const CANVAS_STEP = 6;
const CANVAS_LIFT = 40;
const BRUSH_INK = 55;

// E — Volatile Orange.
const ORANGE_DRAW_MS = 2000;
const ORANGE_FUSE_MS = 800;
const ORANGE_STAGGER_MS = 50;
const ORANGE_DAMAGE = 10;
const ORANGE_RADIUS = 38;
const ORANGE_STEP = 16;
const ORANGE_W = 18;
// E+ — Paint Bucket.
const BUCKET_CLOSE_DIST = 40;
const BUCKET_MIN_SPAN = 8;
const BUCKET_MIN_AREA = 2500;
const BUCKET_SPACING = 24;
const BUCKET_MAX_DABS = 70;
const BUCKET_FLIGHT_MS = 450;
const BUCKET_FUSE_MS = 400;
const BUCKET_WAVE_MS = 500;
const BUCKET_RADIUS = 30;
const BUCKET_DAB_R = 11;

// R — Congealed Paint.
const WALL_DRAW_MS = 1500;
const WALL_LIFE_MS = 6000;
const WALL_STEP = 8;
const WALL_W = 6;
/** How close a shot has to come to a wall dab to die on it. */
const WALL_BLOCK_R = 10;
const WALL_BODY_PAD = 5;
/** How close the painter has to be to a wall dab to be "touching" it. */
const WALL_TOUCH_R = 24;
// R+.
const WALL_RED_DPS = 14;
const WALL_RED_THROWER_DMG = 8;
const WALL_BLUE_MULT = 1.35;
const WALL_BLUE_TOUCH_MS = 600;
const WALL_BLUE_HIT_MS = 2500;
const WALL_GREEN_HPS = 8;
const WALL_GREEN_HIT_HEAL = 6;

// F — Still Life.
const STILL_DRAW_MS = 5000;
const STILL_MS = 7000;
const STILL_INK = 160;
const STILL_MIN_DABS = 3;
const STILL_MIN_R = 12;
const STILL_MAX_R = 95;
/** An empty canvas gives most of the cooldown back — it leaves this much still to run. */
const STILL_REFUND_LEFT_MS = 2000;
const STILL_NPC_DRAW_MS = 2200;
// F+.
const STILL_RED_ZONE_MULT = 1.5;
const STILL_RED_FLAT = 0.15;
const STILL_BLUE_SLOW = 0.55;
const STILL_GREEN_WEAK = 0.4;

// Q — Masterpiece.
const MP_MS = 8000;
const MP_LIFE_MS = 30000;
const MP_STEP = 36;
const MP_BRUSH = 78;
/** Half the brush plus a little — standing anywhere on the paint counts. */
const MP_TOUCH_R = 44;
const MP_MAX = 340;
/**
 * The Masterpiece canvas is a map of the whole arena: the same 3:2 shape as the screen, so a
 * sheet painted edge to edge covers the floor edge to edge. Its scale is worked out from the
 * arena size (`mpScale`).
 */
const MP_CANVAS_W = 330;
const MP_CANVAS_H = 220;
/** Enough ink to cover the whole sheet — and so the whole floor — with the big brush. */
const MP_INK = 320;
const MP_RED_DPS = 18;
const MP_GREEN_HPS = 10;
const MP_GREEN_RESIST = 0.7;
const MP_BLUE_SPEED = 1.4;
/** Blue Masterpiece paint: cooldowns run this much faster on top of real time. */
const MP_BLUE_CD_RATE = 0.6;
// Q+ — Paint Chips.
const CHIP_EVERY_MS = 1400;
const CHIP_MAX = 6;
const CHIP_LIFE_MS = 5000;
const CHIP_R = 7;
const CHIP_RED_SPEED = 200;
const CHIP_RED_DMG = 5;
const CHIP_RED_ATK_MS = 350;
const CHIP_RED_REACH = 16;
const CHIP_BLUE_SPEED = 55;
const CHIP_BLUE_RANGE = 200;
const CHIP_BLUE_ATK_MS = 1100;
const PELLET_SPEED = 320;
const PELLET_DMG = 10;
const PELLET_LIFE_MS = 1200;
const CHIP_GREEN_SPEED = 170;
const CHIP_GREEN_HPS = 4;

// Mastery — Yin-Yang.
const YY_COOLDOWN_MS = 40000;
const YY_DRAW_MS = 3500;
const YY_LIFE_MS = 30000;
const YY_DAB_R = 7;
const YY_STEP = 7;
/** A fully white bar recharges this much faster than real time (1 = twice as fast). */
const YY_OWN_RATE = 1.0;
/** A fully black bar recharges this much slower. */
const YY_FOE_RATE = 0.5;
const YY_MAX_PER_SLOT = 70;
const STRIP_CARD_W = 104;
const STRIP_CARD_H = 30;
const STRIP_GAP = 6;
const STRIP_Y = 70;
/** Invasion has no opponent tray — black paint goes on the horde's one bar instead. */
const HORDE_BAR_W = 300;
const HORDE_SLOW = 0.6;

// ── World objects ────────────────────────────────────────────────────────────

type Role = 'orange' | 'fill' | 'wall' | 'mp';

/** One dab of paint on the floor. Never moves once laid. */
interface Dab {
  owner: Owner;
  role: Role;
  kind: PaintKind;
  x: number;
  y: number;
  px: number;
  py: number;
  linked: boolean;
  /** Expiry, or 0 for paint that only goes when it goes off. */
  until: number;
  /** 0 = no fuse; Infinity = armed, waiting for its window to close; otherwise when it blows. */
  fuseAt: number;
  seed: number;
  stroke: number;
  /** Brush width (strokes) / blob radius (fill). */
  w: number;
}

/** One blob of a Splotch shape, in the shot's own frame: `f` forward, `l` to its right. */
interface ShapeDab { f: number; l: number; kind: PaintKind; seed: number }

interface Shape {
  dabs: ShapeDab[];
  /** Furthest any dab reaches from the centre, plus its radius — the broad-phase circle. */
  reach: number;
  red: number;
  blue: number;
  green: number;
  /** Contact damage a tick, before red. */
  tick: number;
}

interface Splotch {
  owner: Owner;
  x: number;
  y: number;
  vx: number;
  vy: number;
  ang: number;
  shape: Shape;
  until: number;
  seed: number;
}

/** A point on a canvas, in canvas pixels about the sheet's centre. */
interface CanvasPt { cx: number; cy: number; kind: PaintKind; linked: boolean }

/** The player's open canvas. There is only ever one, and only the player has one. */
interface Canvas {
  mode: 'brush' | 'still' | 'mp';
  pts: CanvasPt[];
  kind: PaintKind;
  /** Still Life only: when the sheet is taken off the easel whether you are done or not. */
  until: number;
  total: number;
  lastX: number;
  lastY: number;
  started: boolean;
}

/** A dab of a Still Life, held relative to its subject's centre. */
interface StillDab { dx: number; dy: number; pdx: number; pdy: number; linked: boolean; kind: PaintKind; seed: number }

interface StillLife {
  owner: Owner;
  target: Fighter;
  dabs: StillDab[];
  radius: number;
  until: number;
  red: number;
  blue: number;
  green: number;
  hitboxApplied: number;
  outApplied: number;
  savedInvisible: boolean;
  seed: number;
}

/** A live floor-painting window. */
interface Session {
  role: 'orange' | 'wall' | 'mp' | 'yy';
  kind: PaintKind;
  until: number;
  total: number;
  stroke: number;
  lastX: number;
  lastY: number;
  started: boolean;
  requireHold: boolean;
  step: number;
  width: number;
  /** Online: the remote painter's strokes arrive over the wire instead of off a cursor. */
  remote: boolean;
}

interface Chip {
  owner: Owner;
  kind: 'red' | 'blue' | 'green';
  x: number;
  y: number;
  ang: number;
  gait: number;
  until: number;
  nextAtk: number;
  latched: boolean;
  orbit: number;
  seed: number;
}

interface Pellet { owner: Owner; x: number; y: number; vx: number; vy: number; until: number }

/** A dab of Yin-Yang paint on an ability bar, in that bar's own 0–1 coordinates. */
interface BarDab { slot: number; u: number; v: number; until: number; seed: number }

interface BarRect { x: number; y: number; w: number; h: number; abilityId: string | null }

interface Side {
  owner: Owner;
  session: Session | null;
  shape: Shape;
  mpOn: boolean;
  mpUntil: number;
  mpPaint: PaintKind;
  mpSavedInvincible: boolean;
  mpCount: number;
  nextChipAt: number;
  /** Painter footing, read before anything deals damage each frame. */
  onMpRed: boolean;
  onMpBlue: boolean;
  onMpGreen: boolean;
  onWallGreen: boolean;
  /** Blue wall haste runs on a clock — touching it tops it up, shots hitting it top it up longer. */
  hasteUntil: number;
  healAccum: number;
  // The bot's phantom cursor.
  curAng: number;
  curX: number;
  curY: number;
  /** The bot's Still Life, painted from a template over its head. */
  stillDraw: { until: number; total: number; pts: CanvasPt[] } | null;
  /** The bot's Masterpiece, painted from a template on its easel, then projected round it. */
  mpDraw: { until: number; total: number; pts: CanvasPt[] } | null;
  // Yin-Yang.
  yyCastAt: number;
  yyOwn: BarDab[];
  yyFoe: BarDab[];
  /** Online: strokes that arrived before the window they belong to was opened. */
  netQueue: { x: number; y: number; kind: PaintKind; linked: boolean }[];
}

function polyArea(poly: { x: number; y: number }[]): number {
  let sum = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    sum += a.x * b.y - b.x * a.y;
  }
  return Math.abs(sum) / 2;
}

/** The plain round splotch every painter starts a match with. */
function defaultShape(): Shape {
  const pts: CanvasPt[] = [{ cx: 0, cy: 0, kind: 'black', linked: false }];
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    pts.push({ cx: Math.cos(a) * 11, cy: Math.sin(a) * 11, kind: 'black', linked: true });
  }
  return shapeFrom(pts);
}

/** Canvas paint → a Splotch shape: recentred on its bounding box and scaled into the world. */
function shapeFrom(pts: CanvasPt[]): Shape {
  if (!pts.length) return defaultShape();
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const p of pts) {
    x0 = Math.min(x0, p.cx); x1 = Math.max(x1, p.cx);
    y0 = Math.min(y0, p.cy); y1 = Math.max(y1, p.cy);
  }
  const mx = (x0 + x1) / 2;
  const my = (y0 + y1) / 2;
  const dabs = pts.map((p, i) => ({
    f: (p.cx - mx) * CANVAS_SCALE, l: (p.cy - my) * CANVAS_SCALE, kind: p.kind, seed: i * 17.3 + 5,
  }));
  return shapeFromDabs(dabs);
}

/**
 * What a picture actually *shows*: its points rasterised onto a fine grid as discs of radius
 * `r`, each cell taking the colour of the last disc laid over it — paint on paint is just the
 * top coat. Returns the painted area in "dabs' worth" and the share of it in each primary, so
 * dabbing the same spot twice adds nothing.
 */
function paintedArea(pts: { x: number; y: number; kind: PaintKind }[], r: number): { dabs: number; red: number; blue: number; green: number } {
  if (!pts.length) return { dabs: 0, red: 0, blue: 0, green: 0 };
  const cell = r / 2;
  const cells = new Map<number, PaintKind>();
  const rc = Math.ceil(r / cell);
  for (const p of pts) {
    const ci = Math.round(p.x / cell);
    const cj = Math.round(p.y / cell);
    for (let i = -rc; i <= rc; i++) {
      for (let j = -rc; j <= rc; j++) {
        if ((i * cell) ** 2 + (j * cell) ** 2 > r * r) continue;
        cells.set((ci + i) * 100003 + (cj + j), p.kind);
      }
    }
  }
  let one = 0;
  for (let i = -rc; i <= rc; i++) for (let j = -rc; j <= rc; j++) if ((i * cell) ** 2 + (j * cell) ** 2 <= r * r) one++;
  let red = 0, blue = 0, green = 0;
  for (const k of cells.values()) {
    if (k === 'red') red++;
    else if (k === 'blue') blue++;
    else if (k === 'green') green++;
  }
  const n = cells.size;
  return { dabs: n / one, red: red / n, blue: blue / n, green: green / n };
}

function shapeFromDabs(dabs: ShapeDab[]): Shape {
  if (!dabs.length) return defaultShape();
  let reach = 0;
  for (const d of dabs) reach = Math.max(reach, Math.hypot(d.f, d.l));
  const area = paintedArea(dabs.map((d) => ({ x: d.f, y: d.l, kind: d.kind })), SHAPE_DAB_R);
  const conc = Phaser.Math.Clamp(SPLOTCH_REF_DABS / Math.max(1, area.dabs), SPLOTCH_CONC_MIN, SPLOTCH_CONC_MAX);
  return {
    dabs, reach: reach + SHAPE_DAB_R, red: area.red, blue: area.blue, green: area.green,
    tick: SPLOTCH_TICK_DMG * conc,
  };
}

/** Module-level so the player's brush survives from one match to the next. */
let savedBrush: CanvasPt[] | null = null;

function makeSide(owner: Owner): Side {
  return {
    owner,
    session: null,
    shape: owner === 'player' && savedBrush ? shapeFrom(savedBrush) : defaultShape(),
    mpOn: false,
    mpUntil: 0,
    mpPaint: 'red',
    mpSavedInvincible: false,
    mpCount: 0,
    nextChipAt: 0,
    onMpRed: false,
    onMpBlue: false,
    onMpGreen: false,
    onWallGreen: false,
    hasteUntil: 0,
    healAccum: 0,
    curAng: 0,
    curX: 0,
    curY: 0,
    stillDraw: null,
    mpDraw: null,
    // Readiness is measured against the absolute clock; zero would lock the mastery out for the
    // first forty seconds of the first fight.
    yyCastAt: -YY_COOLDOWN_MS,
    yyOwn: [],
    yyFoe: [],
    netQueue: [],
  };
}

// ── Bot templates (canvas pixels) ────────────────────────────────────────────

function lineTpl(x0: number, y0: number, x1: number, y1: number, kind: PaintKind): CanvasPt[] {
  const n = Math.max(2, Math.round(Math.hypot(x1 - x0, y1 - y0) / CANVAS_STEP));
  const out: CanvasPt[] = [];
  for (let i = 0; i <= n; i++) {
    out.push({ cx: x0 + (x1 - x0) * (i / n), cy: y0 + (y1 - y0) * (i / n), kind, linked: i > 0 });
  }
  return out;
}

function ringTpl(r: number, kinds: (u: number) => PaintKind): CanvasPt[] {
  const n = Math.round((Math.PI * 2 * r) / CANVAS_STEP);
  const out: CanvasPt[] = [];
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    out.push({ cx: Math.cos(a) * r, cy: Math.sin(a) * r, kind: kinds(i / n), linked: i > 0 });
  }
  return out;
}

// ── Arena API ────────────────────────────────────────────────────────────────

export interface PaintArenaApi {
  get scene(): Phaser.Scene;
  get player(): Fighter;
  get npc(): Fighter;
  /** Everything the player is allowed to hurt — husks in Invasion, the npc in a plain 1v1. */
  get enemies(): Fighter[];
  /** Invasion: burrowed / phased husks are not there to be hit. */
  isTargetable(f: Fighter): boolean;
  get projectiles(): Phaser.Physics.Arcade.Group;
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
  get isInvasion(): boolean;
  /** The HUD ability cards — Yin-Yang paints straight onto them. */
  get abilityBars(): { fill: Phaser.GameObjects.Rectangle; abilityId: string; maxWidth: number }[];
  /** Skins: maps a Paint visual colour through that side's equipped skin. */
  paintColor(owner: Owner, base: number): number;
  spawnHitFlash(x: number, y: number, color: number): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  getNearestEnemy(fromX: number, fromY: number): Fighter;
  buildPlayerContext(x: number, y: number): CastContext;
  setStatusIndicator(id: string, status: CustomStatus | null): void;
  get masteryActive(): boolean;
  get npcMasteryActive(): boolean;
  masteryBindFor(slot: string): string | null;
  npcMasteryBindFor(slot: string): string | null;
  /** Progress towards the four Paint Mastery requirements. Recorded whether it is on or not. */
  recordMasteryStat(key: string, amount: number): void;
  get isOnline(): boolean;
  sendPaintMsg(msg: NetPaintMsg): void;
  hasUpgrade(slot: string): boolean;
  hasNpcUpgrade(slot: string): boolean;
}

// ── PaintKit ─────────────────────────────────────────────────────────────────

export class PaintKit implements SummonPurgeTarget {
  private api: PaintArenaApi;

  private readonly pcol: PaintColorFn;
  private readonly ncol: PaintColorFn;
  private readonly pfx: PaintFx;
  private readonly nfx: PaintFx;
  private playerAvatar: PaintAvatar | null = null;
  private npcAvatar: PaintAvatar | null = null;

  /** Paint that just sits there (walls, Masterpiece). Repainted only when the set changes. */
  private staticGfx: Phaser.GameObjects.Graphics | null = null;
  private staticDirty = true;
  /** Fuses, splotches, chips and pellets — everything that moves or pulses. */
  private liveGfx: Phaser.GameObjects.Graphics | null = null;
  /** Still Lifes stand where their subject stood, at the fighters' own depth. */
  private stillGfx: Phaser.GameObjects.Graphics | null = null;
  /** Above the fighters: the bot's easel, the brush ring. */
  private airGfx: Phaser.GameObjects.Graphics | null = null;
  /** Yin-Yang's paint on the ability bars, and the opponent's tray it paints on. */
  private barGfx: Phaser.GameObjects.Graphics | null = null;
  private hudGfx: Phaser.GameObjects.Graphics | null = null;
  private hudLabel: Phaser.GameObjects.Text | null = null;
  private stripLabels: Phaser.GameObjects.Text[] = [];
  /** The player's canvas, over everything. */
  private uiGfx: Phaser.GameObjects.Graphics | null = null;
  private uiTexts: Phaser.GameObjects.Text[] = [];
  private vizT = 0;

  private sides: Record<Owner, Side> = { player: makeSide('player'), npc: makeSide('npc') };
  private dabs: Dab[] = [];
  private splotches: Splotch[] = [];
  private stills: StillLife[] = [];
  private chips: Chip[] = [];
  private pellets: Pellet[] = [];
  private canvas: Canvas | null = null;
  private nextStroke = 1;
  private blastGate = new Map<Fighter, number>();
  private burnAccum = new Map<Fighter, number>();
  /** Click+ green: poison a body carries away from the shot. */
  private dots = new Map<Fighter, { dps: number; until: number; owner: Owner; acc: number }>();
  /** Click+ blue: the strongest slow wins and is refreshed, never stacked. */
  private slows = new Map<Fighter, { mult: number; until: number }>();
  /** Bodies whose paint fields this kit wrote last frame, so they can be handed back. */
  private touched = new Set<Fighter>();
  /** Bodies whose husk attack interval carries the horde's black paint. */
  private hordeApplied = new Map<Fighter, number>();
  /** Mastery: which victims each orange stroke has already counted. */
  private orangeCounted = new Map<number, Set<Fighter>>();
  /** Online: the player's dabs waiting to go out in the next batch. */
  private outbox: number[] = [];
  private nextFlushAt = 0;
  private brushSent = false;
  private aimX = 0;
  private aimY = 0;
  private holding = false;

  constructor(api: PaintArenaApi) {
    this.api = api;
    this.pcol = (base) => api.paintColor('player', base);
    this.ncol = (base) => api.paintColor('npc', base);
    this.pfx = new PaintFx(api.scene, this.pcol);
    this.nfx = new PaintFx(api.scene, this.ncol);
  }

  // ── Small helpers ──────────────────────────────────────────────────────────

  private get now(): number { return this.api.scene.time.now; }
  private side(owner: Owner): Side { return this.sides[owner]; }
  private fighter(owner: Owner): Fighter { return owner === 'player' ? this.api.player : this.api.npc; }
  private fx(owner: Owner): PaintFx { return owner === 'player' ? this.pfx : this.nfx; }
  private col(owner: Owner): PaintColorFn { return owner === 'player' ? this.pcol : this.ncol; }
  private bodyR(f: Fighter): number { return (f.body as Phaser.Physics.Arcade.Body | null)?.halfWidth ?? 22; }
  private hex(color: number): string { return `#${color.toString(16).padStart(6, '0')}`; }

  private isPaint(owner: Owner): boolean {
    return owner === 'player' ? this.api.elementId === 'chalk' : this.api.npcElementId === 'chalk';
  }

  private alive(f: Fighter | null | undefined): f is Fighter {
    return !!f && f.active && f.hp > 0;
  }

  private get left(): number { return ARENA_PAD; }
  private get right(): number { return this.api.width - ARENA_PAD; }
  private get top(): number { return ARENA_PAD; }
  private get bottom(): number { return this.api.height - ARENA_PAD; }

  private targetsOf(owner: Owner): Fighter[] {
    const list = owner === 'player' ? this.api.enemies : [this.api.player];
    return list.filter((f) => this.alive(f) && this.api.isTargetable(f));
  }

  private enemyOf(owner: Owner): Fighter | null {
    if (owner === 'npc') return this.alive(this.api.player) ? this.api.player : null;
    const f = this.api.player;
    const t = this.api.getNearestEnemy(f.x, f.y);
    return this.alive(t) ? t : null;
  }

  private avatar(owner: Owner): PaintAvatar | null {
    return owner === 'player' ? this.playerAvatar : this.npcAvatar;
  }

  private up(owner: Owner, slot: string): boolean {
    if (!this.isPaint(owner)) return false;
    return owner === 'player' ? this.api.hasUpgrade(slot) : this.api.hasNpcUpgrade(slot);
  }

  private masteryOn(owner: Owner): boolean {
    if (!this.isPaint(owner)) return false;
    return owner === 'player' ? this.api.masteryActive : this.api.npcMasteryActive;
  }

  /** The slot Yin-Yang is bound over for this side, or null. */
  private yySlot(owner: Owner): Slot | null {
    if (!this.masteryOn(owner)) return null;
    for (const s of SLOTS) {
      const bind = owner === 'player' ? this.api.masteryBindFor(s) : this.api.npcMasteryBindFor(s);
      if (bind === 'yin-yang') return s;
    }
    return null;
  }

  /** Online, the npc side is somebody else's hands — its strokes and canvases arrive by message. */
  private remote(owner: Owner): boolean {
    return owner === 'npc' && this.api.isOnline;
  }

  private note(owner: Owner, key: string, amount: number): void {
    if (owner !== 'player' || amount <= 0) return;
    this.api.recordMasteryStat(key, amount);
  }

  /** The paint on this side's brush right now. */
  private heldPaint(owner: Owner): PaintKind {
    const s = this.side(owner);
    if (owner === 'player' && this.canvas) return this.canvas.kind;
    if (s.session) return s.session.kind;
    if (s.mpOn) return s.mpPaint;
    return 'black';
  }

  /** Deal paint damage. Returns what actually came off. */
  private hurt(t: Fighter, amount: number): number {
    if (amount <= 0) return 0;
    const before = t.hp;
    t.takeDamage(amount);
    return Math.max(0, before - t.hp);
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  reset(): void {
    for (const owner of OWNERS) {
      const s = this.sides[owner];
      const f = this.fighter(owner);
      if (f && s.mpOn) f.isInvincible = s.mpSavedInvincible;
    }
    for (const sl of [...this.stills]) this.endStill(sl, false);
    for (const f of this.touched) this.clearPaintFields(f);
    this.touched.clear();
    for (const [h, m] of this.hordeApplied) h.attackIntervalMult /= m;
    this.hordeApplied.clear();
    this.api.player?.setMenuGuard('paint-canvas', false);

    this.sides = { player: makeSide('player'), npc: makeSide('npc') };
    this.dabs = [];
    this.splotches = [];
    this.stills = [];
    this.chips = [];
    this.pellets = [];
    this.nextStroke = 1;
    this.blastGate.clear();
    this.burnAccum.clear();
    this.contactAcc.clear();
    this.dots.clear();
    this.slows.clear();
    this.orangeCounted.clear();
    this.bucketsInFlight.clear();
    this.npcBrushPicked = false;
    this.outbox = [];
    this.nextFlushAt = 0;
    this.brushSent = false;
    this.vizT = 0;
    this.aimX = 0;
    this.aimY = 0;
    this.holding = false;
    this.closeCanvasUi();
    this.canvas = null;

    this.playerAvatar?.destroy(); this.playerAvatar = null;
    this.npcAvatar?.destroy(); this.npcAvatar = null;
    this.staticGfx?.destroy(); this.staticGfx = null;
    this.liveGfx?.destroy(); this.liveGfx = null;
    this.stillGfx?.destroy(); this.stillGfx = null;
    this.airGfx?.destroy(); this.airGfx = null;
    this.barGfx?.destroy(); this.barGfx = null;
    this.hudGfx?.destroy(); this.hudGfx = null;
    this.hudLabel?.destroy(); this.hudLabel = null;
    for (const t of this.stripLabels) t.destroy();
    this.stripLabels = [];
    this.staticDirty = true;
  }

  private clearPaintFields(f: Fighter): void {
    f.paintIncomingMult = 1;
    f.paintSlowMult = 1;
  }

  // ── Input ──────────────────────────────────────────────────────────────────

  handleInput(time: number, pointer: Phaser.Input.Pointer, mouseX: number, mouseY: number): void {
    if (this.api.elementId !== 'chalk') return;
    this.aimX = mouseX;
    this.aimY = mouseY;
    this.holding = pointer.isDown;

    const p = this.api.player;
    const s = this.sides.player;
    const clicked = pointer.isDown && !this.api.pointerWasDown;
    const rightClicked = pointer.rightButtonDown() && !this.api.rightPointerWasDown;

    // A canvas on the easel owns the mouse and the keyboard both.
    if (this.canvas) {
      this.canvasInput(pointer, clicked, rightClicked);
      return;
    }

    const jd = (k: Phaser.Input.Keyboard.Key) => Phaser.Input.Keyboard.JustDown(k);

    // Congealed Paint with R+: the window keeps the keyboard so the colour can change mid-wall.
    if (s.session?.role === 'wall' && this.up('player', 'r')) {
      if (jd(this.api.eKey)) this.pickPaint('player', 'red');
      if (jd(this.api.rKey)) this.pickPaint('player', 'blue');
      if (jd(this.api.fKey)) this.pickPaint('player', 'green');
      if (jd(this.api.qKey)) this.pickPaint('player', 'congeal');
      return;
    }

    // One hand, one brush: an open window swallows the input rather than being thrown away.
    // Gated here rather than in the `do*` methods, which run after the cooldown is stamped.
    if (s.session) return;

    // Right-click: the Splotch canvas.
    if (rightClicked) {
      this.openCanvas('brush');
      return;
    }

    const ctx = this.api.buildPlayerContext(mouseX, mouseY);
    // Mastery: read the bound key first — `JustDown` consumes the flag.
    const yy = this.yySlot('player');
    if (yy && jd(this.keyFor(yy))) this.tryCastYinYang('player');

    if (clicked) p.castAbility('paint-splotch', ctx);
    if (yy !== 'e' && jd(this.api.eKey)) p.castAbility('paint-orange', ctx);
    if (yy !== 'r' && jd(this.api.rKey)) p.castAbility('paint-congeal', ctx);
    if (yy !== 'f' && jd(this.api.fKey)) p.castAbility('paint-still-life', ctx);
    if (yy !== 'q' && jd(this.api.qKey)) p.castAbility('paint-masterpiece', ctx);
  }

  private keyFor(slot: Slot): Phaser.Input.Keyboard.Key {
    if (slot === 'e') return this.api.eKey;
    if (slot === 'r') return this.api.rKey;
    if (slot === 'f') return this.api.fKey;
    return this.api.qKey;
  }

  /** Change the paint on the brush mid-window. Each change starts a fresh stroke. */
  private pickPaint(owner: Owner, kind: PaintKind): void {
    const s = this.side(owner);
    if (s.mpOn) s.mpPaint = kind;
    if (!s.session || s.session.kind === kind) return;
    s.session.kind = kind;
    s.session.stroke = this.nextStroke++;
    s.session.started = false;
    const f = this.fighter(owner);
    this.avatar(owner)?.setPaint(kind);
    this.fx(owner).flecks(f.x, f.y - 8, 5, 18, kind);
    if (owner === 'player') this.api.showFloatingText(f.x, f.y - 46, `🖌️ ${kind.toUpperCase()}`, this.hex(PAINT_TONE[kind]));
  }

  // ── Ability entry points (called from build*Context) ───────────────────────

  /** Click — Splotch: throw one of whatever is on your canvas. */
  doSplotch(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    const s = this.side(owner);
    const ang = Math.atan2(ty - f.y, tx - f.x);
    const mine = this.splotches.filter((sp) => sp.owner === owner);
    if (mine.length >= SPLOTCH_MAX_ALIVE) this.splotches.splice(this.splotches.indexOf(mine[0]), 1);
    this.splotches.push({
      owner,
      x: f.x + Math.cos(ang) * 18,
      y: f.y + Math.sin(ang) * 18,
      vx: Math.cos(ang) * SPLOTCH_SPEED,
      vy: Math.sin(ang) * SPLOTCH_SPEED,
      ang,
      shape: s.shape,
      until: this.now + SPLOTCH_LIFE_MS,
      seed: Math.random() * 999,
    });
    this.avatar(owner)?.play('punch', ang);
    Sfx.playAt('slime-splat', f.x, { volume: 0.35, rate: 1.3 });
  }

  /** E — Volatile Orange: two seconds of fuse paint under the cursor. */
  doOrange(owner: Owner): void {
    this.openSession(owner, 'orange', 'orange', ORANGE_DRAW_MS, false, ORANGE_STEP, ORANGE_W);
    const f = this.fighter(owner);
    this.avatar(owner)?.play('sweep');
    this.fx(owner).ring(f.x, f.y, 10, 46, 'orange', 360);
    if (owner === 'player') this.api.showFloatingText(f.x, f.y - 44, '🧨 PAINT THE FUSE', this.hex(PNT.orange));
  }

  /** R — Congealed Paint: a second and a half of thick paint that sets into a wall. */
  doCongeal(owner: Owner): void {
    const kind: PaintKind = owner === 'npc' && this.up(owner, 'r') && !this.remote(owner) ? this.npcWallPaint() : 'congeal';
    this.openSession(owner, 'wall', kind, WALL_DRAW_MS, false, WALL_STEP, WALL_W);
    const f = this.fighter(owner);
    this.avatar(owner)?.play('slam');
    this.fx(owner).ring(f.x, f.y, 10, 44, 'congeal', 380);
    if (owner === 'player') {
      this.api.showFloatingText(f.x, f.y - 44, this.up('player', 'r') ? '🧱 WALL — E/R/F/Q' : '🧱 PAINT A WALL', this.hex(PNT.congeal));
    }
  }

  /** F — Still Life: the player gets a canvas; the bot paints a template over its head. */
  doStillLife(owner: Owner): void {
    const f = this.fighter(owner);
    this.avatar(owner)?.play('raise');
    if (owner === 'player') {
      this.openCanvas('still');
      return;
    }
    // Online the remote painter's finished picture arrives as a message.
    if (this.remote(owner)) return;
    const s = this.side(owner);
    s.stillDraw = { until: this.now + STILL_NPC_DRAW_MS, total: STILL_NPC_DRAW_MS, pts: this.npcStillTemplate() };
    this.fx(owner).ring(f.x, f.y - 40, 6, 30, 'black', 400);
  }

  /** Q — Masterpiece: untouchable for eight seconds with a brush four times the size. */
  doMasterpiece(owner: Owner): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    s.mpUntil = this.now + MP_MS;
    s.mpPaint = 'red';
    s.nextChipAt = this.now + 600;
    if (!s.mpOn) {
      s.mpOn = true;
      s.mpSavedInvincible = f.isInvincible;
      f.isInvincible = true;
    }
    if (owner === 'player') {
      // Painted on a canvas, then projected onto the floor round you when you finish.
      this.openCanvas('mp');
    } else if (this.remote(owner)) {
      // Online the projected work arrives as floor dabs, into a window opened for them.
      this.openSession(owner, 'mp', 'red', MP_MS, false, MP_STEP, MP_BRUSH);
    } else {
      s.mpDraw = { until: this.now + STILL_NPC_DRAW_MS, total: STILL_NPC_DRAW_MS, pts: this.npcMasterpieceTemplate() };
    }
    this.avatar(owner)?.play('raise');
    const fx = this.fx(owner);
    fx.ring(f.x, f.y, 14, 96, 'red', 520);
    fx.ring(f.x, f.y, 14, 120, 'blue', 620);
    fx.ring(f.x, f.y, 14, 144, 'green', 720);
    this.api.showFloatingText(f.x, f.y - 50, '🎨 MASTERPIECE', this.hex(PNT.rose));
  }

  private openSession(
    owner: Owner, role: Session['role'], kind: PaintKind, ms: number, requireHold: boolean, step: number, width: number,
  ): void {
    const s = this.side(owner);
    if (s.session) this.closeSession(owner);
    const remote = this.remote(owner) && role !== 'yy';
    s.session = {
      role, kind,
      until: this.now + ms + (remote ? 900 : 0),
      total: ms,
      stroke: this.nextStroke++,
      lastX: 0, lastY: 0, started: false,
      requireHold, step, width, remote,
    };
    s.curAng = Math.random() * Math.PI * 2;
    this.avatar(owner)?.setPaint(kind);
    if (remote) {
      // Strokes that beat the cast relay here are laid now.
      const queued = s.netQueue.splice(0);
      for (const q of queued) this.layRemote(owner, q.x, q.y, q.kind, q.linked);
    }
  }

  /** A window has closed — on its clock, or (online) when the remote painter said so. */
  private closeSession(owner: Owner): void {
    const s = this.side(owner);
    const sess = s.session;
    if (!sess) return;
    s.session = null;
    const t = this.now;
    if (sess.role === 'orange') {
      // The whole run is given its turn, counted from now, in the order it was painted.
      const run = this.dabs.filter((d) => d.owner === owner && d.role === 'orange' && d.fuseAt === Infinity);
      run.forEach((d, i) => { d.fuseAt = t + ORANGE_FUSE_MS + i * ORANGE_STAGGER_MS; });
      if (this.up(owner, 'e')) this.throwBuckets(owner, run);
    } else if (sess.role === 'yy') {
      if (owner === 'player' && this.api.isOnline) this.sendYinYang();
    }
    if (owner === 'player' && this.api.isOnline && sess.role !== 'yy') {
      this.flushOutbox(true);
      this.api.sendPaintMsg({ t: 'pnt', k: 'end' });
    }
  }

  // ── Canvas ─────────────────────────────────────────────────────────────────

  private openCanvas(mode: Canvas['mode']): void {
    this.closeCanvasUi();
    const until = mode === 'still' ? this.now + STILL_DRAW_MS : mode === 'mp' ? this.sides.player.mpUntil : Infinity;
    const total = mode === 'still' ? STILL_DRAW_MS : mode === 'mp' ? MP_MS : 0;
    this.canvas = {
      mode,
      pts: [],
      kind: mode === 'mp' ? 'red' : 'black',
      until,
      total,
      lastX: 0, lastY: 0, started: false,
    };
    Sfx.play('ui-open', { volume: 0.5 });
    const scene = this.api.scene;
    const style = (size: number, color = '#2b2133') => ({
      fontSize: `${size}px`, fontFamily: FONT_DISPLAY, color, stroke: '#f3ead6', strokeThickness: 2,
    });
    this.uiGfx = scene.add.graphics().setDepth(60);
    this.uiTexts = [
      scene.add.text(0, 0, '', style(12)).setOrigin(0.5).setDepth(61),
      scene.add.text(0, 0, 'CLEAR', style(11)).setOrigin(0.5).setDepth(61),
      scene.add.text(0, 0, 'DONE', style(11)).setOrigin(0.5).setDepth(61),
      scene.add.text(0, 0, '', style(9, '#5b4a3a')).setOrigin(0.5).setDepth(61),
    ];
  }

  private closeCanvasUi(): void {
    this.uiGfx?.destroy();
    this.uiGfx = null;
    for (const t of this.uiTexts) t.destroy();
    this.uiTexts = [];
  }

  /** Where the sheet sits: the brush canvas in the middle, Still Life off to the right. */
  /** Masterpiece canvas px → world px (the sheet maps onto the whole arena). */
  private mpScale(): number {
    return Math.max(this.api.width / MP_CANVAS_W, this.api.height / MP_CANVAS_H);
  }

  private canvasGeom(): { x: number; y: number; w: number; h: number } {
    // Logical screen space — the arena camera never scrolls, and `worldView` is in the
    // supersampled backbuffer's pixels, which is what put the sheet off the screen.
    const W = this.api.width;
    const H = this.api.height;
    const mode = this.canvas?.mode;
    const w = mode === 'mp' ? MP_CANVAS_W : CANVAS_PX;
    const h = mode === 'mp' ? MP_CANVAS_H : CANVAS_PX;
    // The easel reaches 34px above the sheet and ~112px below it (ink, swatches, buttons, hint).
    const y = Phaser.Math.Clamp(H / 2 - 40, h / 2 + 44, H - h / 2 - 118);
    const x = mode === 'still' ? Phaser.Math.Clamp(W - w / 2 - 40, w / 2 + 20, W - w / 2 - 20) : W / 2;
    return { x, y, w, h };
  }

  /** The colours this canvas may use. Black always; the primaries with the matching upgrade. */
  private canvasPalette(): { kind: PaintKind; key: string; open: boolean }[] {
    const c = this.canvas;
    if (c?.mode === 'mp') {
      return [
        { kind: 'red', key: 'E', open: true },
        { kind: 'blue', key: 'R', open: true },
        { kind: 'green', key: 'F', open: true },
      ];
    }
    const unlocked = c ? this.up('player', c.mode === 'brush' ? 'click' : 'f') : false;
    return [
      { kind: 'black', key: 'Q', open: true },
      { kind: 'red', key: 'E', open: unlocked },
      { kind: 'blue', key: 'R', open: unlocked },
      { kind: 'green', key: 'F', open: unlocked },
    ];
  }

  private canvasButtons(): { swatches: { x: number; y: number; kind: PaintKind; open: boolean }[]; clear: Phaser.Geom.Rectangle; done: Phaser.Geom.Rectangle } {
    const { x, y, w, h } = this.canvasGeom();
    const top = y - h / 2;
    const rowY = top + h + 30;
    const pal = this.canvasPalette();
    const swatches = pal.map((p, i) => ({ x: x - (pal.length - 1) * 18 + i * 36, y: rowY, kind: p.kind, open: p.open }));
    const btnY = rowY + 30;
    return {
      swatches,
      clear: new Phaser.Geom.Rectangle(x - w / 2, btnY - 11, 70, 22),
      done: new Phaser.Geom.Rectangle(x + w / 2 - 70, btnY - 11, 70, 22),
    };
  }

  private canvasInput(pointer: Phaser.Input.Pointer, clicked: boolean, rightClicked: boolean): void {
    const c = this.canvas!;
    const jd = (k: Phaser.Input.Keyboard.Key) => Phaser.Input.Keyboard.JustDown(k);
    const pal = this.canvasPalette();
    const keyMap: [Phaser.Input.Keyboard.Key, PaintKind][] = [
      [this.api.qKey, 'black'], [this.api.eKey, 'red'], [this.api.rKey, 'blue'], [this.api.fKey, 'green'],
    ];
    for (const [k, kind] of keyMap) {
      if (jd(k) && pal.find((p) => p.kind === kind)?.open) c.kind = kind;
    }
    if (rightClicked) { this.finishCanvas(); return; }

    const btn = this.canvasButtons();
    const mx = this.aimX;
    const my = this.aimY;
    if (clicked) {
      for (const sw of btn.swatches) {
        if (Phaser.Math.Distance.Between(sw.x, sw.y, mx, my) <= 13) {
          if (sw.open) c.kind = sw.kind;
          return;
        }
      }
      if (btn.clear.contains(mx, my)) { c.pts = []; c.started = false; Sfx.play('ui-click', { volume: 0.4 }); return; }
      if (btn.done.contains(mx, my)) { this.finishCanvas(); return; }
    }

    const { x, y, w, h } = this.canvasGeom();
    // The Masterpiece sheet is a map, so its very edge is the arena wall — paint right up to it.
    const pad = c.mode === 'mp' ? 0 : 4;
    const cx = mx - x;
    const cy = my - y;
    const inside = Math.abs(cx) <= w / 2 - pad && Math.abs(cy) <= h / 2 - pad;
    const ink = this.canvasInk(c);
    const step = c.mode === 'mp' ? MP_STEP / this.mpScale() : CANVAS_STEP;
    if (!pointer.isDown || !inside) { c.started = false; return; }
    if (c.pts.length >= ink) return;
    if (c.started && Phaser.Math.Distance.Between(c.lastX, c.lastY, cx, cy) < step) return;
    const linked = c.started && Phaser.Math.Distance.Between(c.lastX, c.lastY, cx, cy) <= CANVAS_LIFT;
    c.pts.push({ cx, cy, kind: c.kind, linked });
    c.lastX = cx;
    c.lastY = cy;
    c.started = true;
  }

  private canvasInk(c: Canvas): number {
    return c.mode === 'brush' ? BRUSH_INK : c.mode === 'mp' ? MP_INK : STILL_INK;
  }

  private finishCanvas(): void {
    const c = this.canvas;
    if (!c) return;
    this.canvas = null;
    this.closeCanvasUi();
    this.api.player.setMenuGuard('paint-canvas', false);
    Sfx.play('ui-close', { volume: 0.5 });
    const p = this.api.player;
    if (c.mode === 'brush') {
      savedBrush = c.pts.length ? c.pts.map((q) => ({ ...q })) : null;
      this.sides.player.shape = savedBrush ? shapeFrom(savedBrush) : defaultShape();
      this.pfx.ring(p.x, p.y, 8, 40, 'black', 360);
      this.api.showFloatingText(p.x, p.y - 46, savedBrush ? '🖌️ NEW SPLOTCH' : '🖌️ PLAIN SPLOTCH', this.hex(PNT.rose));
      if (this.api.isOnline) this.sendBrush();
      return;
    }
    if (c.mode === 'mp') {
      this.projectMasterpiece('player', c.pts);
      return;
    }
    // Still Life.
    if (c.pts.length < STILL_MIN_DABS) {
      // Hand most of the cooldown back — an empty sheet should not cost the whole ability.
      p.reduceCooldown('paint-still-life', Math.max(0, this.stillCooldown() - STILL_REFUND_LEFT_MS));
      this.api.showFloatingText(p.x, p.y - 46, '🖼️ BLANK CANVAS', this.hex(PNT.canvasDeep));
      return;
    }
    const target = this.api.getNearestEnemy(this.aimX, this.aimY);
    if (!this.alive(target)) return;
    const dabs = this.stillDabsFrom(c.pts);
    this.transform('player', target, dabs);
    if (this.api.isOnline) {
      const d: number[] = [];
      for (const q of dabs) d.push(Math.round(q.dx), Math.round(q.dy), KINDS.indexOf(q.kind), q.linked ? 1 : 0);
      this.api.sendPaintMsg({ t: 'pnt', k: 'still', d });
    }
  }

  /**
   * Q — the finished Masterpiece lands on the floor. The sheet is a map of the whole arena, so
   * every point lands on the spot it was painted over.
   */
  private projectMasterpiece(owner: Owner, pts: CanvasPt[]): void {
    const cx = this.api.width / 2;
    const cy = this.api.height / 2;
    const k = this.mpScale();
    const s = this.side(owner);
    const t = this.now;
    const stroke = this.nextStroke++;
    let prev: Dab | null = null;
    const laid: Dab[] = [];
    for (const p of pts) {
      if (s.mpCount >= MP_MAX) break;
      const x = Phaser.Math.Clamp(cx + p.cx * k, 0, this.api.width);
      const y = Phaser.Math.Clamp(cy + p.cy * k, 0, this.api.height);
      const linked = !!prev && p.linked && prev.kind === p.kind;
      const d: Dab = {
        owner, role: 'mp', kind: p.kind, x, y,
        px: prev ? prev.x : x, py: prev ? prev.y : y, linked,
        until: t + MP_LIFE_MS, fuseAt: 0, seed: Math.random() * 999, stroke, w: MP_BRUSH,
      };
      this.dabs.push(d);
      laid.push(d);
      s.mpCount++;
      prev = d;
      if (owner === 'player' && this.api.isOnline) this.outbox.push(Math.round(x), Math.round(y), KINDS.indexOf(p.kind), linked ? 1 : 0);
    }
    this.trimDabs();
    this.staticDirty = true;
    const fx = this.fx(owner);
    for (let i = 0; i < laid.length; i += 4) fx.splat(laid[i].x, laid[i].y, MP_BRUSH * 0.6, laid[i].kind, 420);
    fx.ring(cx, cy, 20, Math.max(cx, cy), 'red', 620);
    Sfx.playAt('oil-splash', cx, { volume: 0.6, rate: 0.8 });
    const f = this.fighter(owner);
    if (laid.length) this.api.showFloatingText(f.x, f.y - 52, '🖼️ UNVEILED', this.hex(PNT.rose));
    if (owner === 'player' && this.api.isOnline) {
      this.flushOutbox(true);
      this.api.sendPaintMsg({ t: 'pnt', k: 'end' });
    }
  }

  /**
   * The bot's Masterpiece, in map-canvas pixels: blue under its own feet, a red ring where the
   * player stands, and a green ring round itself when it is hurt.
   */
  private npcMasterpieceTemplate(): CanvasPt[] {
    const f = this.api.npc;
    const out: CanvasPt[] = [];
    const k = this.mpScale();
    const at = (wx: number, wy: number) => ({ x: (wx - this.api.width / 2) / k, y: (wy - this.api.height / 2) / k });
    const ring = (x: number, y: number, r: number, kind: PaintKind) => {
      const n = Math.max(4, Math.round((Math.PI * 2 * r) / (MP_STEP / k)));
      for (let i = 0; i <= n; i++) {
        const a = (i / n) * Math.PI * 2;
        out.push({ cx: x + Math.cos(a) * r, cy: y + Math.sin(a) * r, kind, linked: i > 0 });
      }
    };
    if (!f) return out;
    const me = at(f.x, f.y);
    out.push({ cx: me.x, cy: me.y, kind: 'blue', linked: false });
    ring(me.x, me.y, 22 / k, 'blue');
    const target = this.enemyOf('npc');
    if (target) {
      const t = at(target.x, target.y);
      out.push({ cx: t.x, cy: t.y, kind: 'red', linked: false });
      ring(t.x, t.y, 34 / k, 'red');
      ring(t.x, t.y, 80 / k, 'red');
    }
    if (f.hp / f.maxHp < 0.7) ring(me.x, me.y, 70 / k, 'green');
    return out;
  }

  private stillCooldown(): number {
    const ab = this.api.player.element.abilities.find((a) => a.id === 'paint-still-life');
    return ab?.cooldown ?? 0;
  }

  /** Canvas paint → a Still Life, recentred and scaled into the world. */
  private stillDabsFrom(pts: CanvasPt[]): StillDab[] {
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const p of pts) {
      x0 = Math.min(x0, p.cx); x1 = Math.max(x1, p.cx);
      y0 = Math.min(y0, p.cy); y1 = Math.max(y1, p.cy);
    }
    const mx = (x0 + x1) / 2;
    const my = (y0 + y1) / 2;
    const out: StillDab[] = [];
    pts.forEach((p, i) => {
      const dx = (p.cx - mx) * CANVAS_SCALE;
      const dy = (p.cy - my) * CANVAS_SCALE;
      const prev = out[out.length - 1];
      out.push({ dx, dy, pdx: prev ? prev.dx : dx, pdy: prev ? prev.dy : dy, linked: p.linked && !!prev, kind: p.kind, seed: i * 13.1 + 3 });
    });
    return out;
  }

  // ── Still Life ─────────────────────────────────────────────────────────────

  /** Turn `target` into the picture. One Still Life per painter; a new one ends the old. */
  private transform(owner: Owner, target: Fighter, dabs: StillDab[]): void {
    for (const sl of [...this.stills]) {
      if (sl.owner === owner || sl.target === target) this.endStill(sl, false);
    }
    if (!dabs.length) return;
    let reach = 0;
    for (const d of dabs) reach = Math.max(reach, Math.hypot(d.dx, d.dy));
    // Colour shares by visible area, top coat winning — painting over a spot adds nothing.
    const area = paintedArea(dabs.map((d) => ({ x: d.dx, y: d.dy, kind: d.kind })), SHAPE_DAB_R);
    const radius = Phaser.Math.Clamp(reach + 4, STILL_MIN_R, STILL_MAX_R);
    const cur = this.bodyR(target) || 22;
    const hitbox = radius / cur;
    target.hitboxMult *= hitbox;
    target.applySizeMult();
    const sl: StillLife = {
      owner, target, dabs, radius,
      until: this.now + STILL_MS,
      red: area.red, blue: area.blue, green: area.green,
      hitboxApplied: hitbox,
      outApplied: 1,
      savedInvisible: target.forceInvisible,
      seed: Math.random() * 999,
    };
    if (sl.green > 0) {
      sl.outApplied = 1 - STILL_GREEN_WEAK * sl.green;
      target.outgoingDamageMult *= sl.outApplied;
    }
    if (sl.red > 0) {
      target.paintZoneMult = (x, y) => {
        for (const d of sl.dabs) {
          if (d.kind !== 'red') continue;
          if (Phaser.Math.Distance.Between(target.x + d.dx, target.y + d.dy, x, y) <= SHAPE_DAB_R + 8) return STILL_RED_ZONE_MULT;
        }
        return 1;
      };
    }
    target.forceInvisible = true;
    target.setAlpha(0);
    this.stills.push(sl);
    this.fx(owner).ring(target.x, target.y, 8, radius + 20, 'black', 480);
    this.fx(owner).flecks(target.x, target.y, 10, radius, 'black', 520);
    Sfx.playAt('sparkle', target.x, { volume: 0.5, rate: 0.9 });
    this.api.showFloatingText(target.x, target.y - radius - 24, '🖼️ STILL LIFE', this.hex(PNT.rose));
    this.note(owner, 'stillLifes', 1);
  }

  private endStill(sl: StillLife, announce: boolean): void {
    const i = this.stills.indexOf(sl);
    if (i >= 0) this.stills.splice(i, 1);
    const t = sl.target;
    if (!t || !t.scene) return;
    t.hitboxMult /= sl.hitboxApplied;
    if (t.active) t.applySizeMult();
    if (sl.outApplied !== 1) t.outgoingDamageMult /= sl.outApplied;
    t.paintZoneMult = null;
    t.forceInvisible = sl.savedInvisible;
    if (t.active && !t.forceInvisible) t.setAlpha(1);
    if (announce && t.active) {
      this.fx(sl.owner).flecks(t.x, t.y, 12, sl.radius + 10, 'black', 520);
      this.api.showFloatingText(t.x, t.y - 46, '🖼️ UNFRAMED', this.hex(PNT.canvasDeep));
    }
  }

  private updateStills(): void {
    const t = this.now;
    for (const sl of [...this.stills]) {
      const f = sl.target;
      if (!f || !f.active || f.hp <= 0 || t >= sl.until) { this.endStill(sl, f?.active === true && f.hp > 0); continue; }
      // Kept hidden every frame: a hit's flash would otherwise put the sprite back for a frame.
      if (f.alpha !== 0) f.setAlpha(0);
      if (sl.green > 0) f.healStopUntil = Math.max(f.healStopUntil, Date.now() + 300);
    }
  }

  private stillOn(f: Fighter): StillLife | undefined {
    return this.stills.find((sl) => sl.target === f);
  }

  // ── Bot templates ──────────────────────────────────────────────────────────

  private npcBrushTemplate(): CanvasPt[] {
    const colored = this.up('npc', 'click');
    const roll = Math.random();
    let pts: CanvasPt[];
    if (roll < 0.34) pts = lineTpl(0, -60, 0, 60, 'black');        // a wall of paint: wide sweep
    else if (roll < 0.67) pts = lineTpl(-40, 0, 40, 0, 'black');   // a dart: long contact
    else return [];                                                   // the plain splotch
    if (colored) {
      pts.forEach((p, i) => {
        const u = i / pts.length;
        p.kind = u < 0.6 ? 'red' : u < 0.8 ? 'blue' : 'green';
      });
    }
    return pts;
  }

  private npcStillTemplate(): CanvasPt[] {
    const colored = this.up('npc', 'f');
    // A great hollow ring: the biggest hitbox for the least paint.
    return ringTpl(90, (u) => (!colored ? 'black' : u < 0.45 ? 'red' : u < 0.75 ? 'blue' : 'green'));
  }

  /** R+ for the bot: green to hide behind when hurt, red to punish when it is not. */
  private npcWallPaint(): PaintKind {
    const f = this.api.npc;
    return f && f.hp / f.maxHp < 0.5 ? 'green' : 'red';
  }

  // ── Update ─────────────────────────────────────────────────────────────────

  update(time: number, delta: number): void {
    const playerIs = this.api.elementId === 'chalk';
    const npcIs = this.api.npcElementId === 'chalk';
    const anyLive = this.dabs.length > 0 || this.splotches.length > 0 || this.stills.length > 0 || this.chips.length > 0;
    if (!playerIs && !npcIs && !anyLive) return;

    this.vizT += delta / 1000;
    this.ensureLayers();

    // The bot's brush is picked once a match, so it is a style rather than a dice roll per shot.
    if (npcIs && !this.remote('npc') && !this.npcBrushPicked) {
      this.npcBrushPicked = true;
      const tpl = this.npcBrushTemplate();
      if (tpl.length) this.sides.npc.shape = shapeFrom(tpl);
    }
    if (playerIs && this.api.isOnline && !this.brushSent) this.sendBrush();

    for (const owner of OWNERS) {
      if (!this.isPaint(owner)) continue;
      this.advanceCursor(owner, delta);
      this.feedSession(owner, time);
      this.updateMasterpiece(owner, time);
      this.updateNpcStillDraw(owner, time);
    }
    this.updateCanvas(time);
    this.updateNpcYinYang(time);

    this.expireDabs(time);
    this.updateFooting();
    this.updateFuses(time);
    this.updateGround(delta);
    this.updateWalls(delta);
    this.updateSplotches(time, delta);
    this.updateDots(delta);
    this.updateChips(time, delta);
    this.updatePellets(time, delta);
    this.updateStills();
    this.updateYinYang(delta);
    this.updateFields();
    this.updateAvatars(delta, playerIs, npcIs);
    if (this.api.isOnline && time >= this.nextFlushAt) this.flushOutbox(false);

    this.paintStatic();
    this.paintLive(time);
    this.paintStills();
    this.paintAir();
    this.paintBars();
    this.paintHud(playerIs);
    this.paintCanvas();
    this.pushStatuses(playerIs);
  }

  private npcBrushPicked = false;

  private ensureLayers(): void {
    const { scene } = this.api;
    if (!this.staticGfx) { this.staticGfx = scene.add.graphics().setDepth(2); this.staticDirty = true; }
    if (!this.liveGfx) this.liveGfx = scene.add.graphics().setDepth(4);
    if (!this.stillGfx) this.stillGfx = scene.add.graphics().setDepth(5.5);
    if (!this.airGfx) this.airGfx = scene.add.graphics().setDepth(7);
    if (!this.barGfx) this.barGfx = scene.add.graphics().setDepth(24);
    if (!this.hudGfx) this.hudGfx = scene.add.graphics().setDepth(20).setScrollFactor(0);
  }

  // ── The bot's cursor ───────────────────────────────────────────────────────

  /**
   * The bot has no mouse, so it gets a phantom one. Where it goes is the AI's whole aim: orange
   * is circled over the target's feet (all the way round when E+ will bucket the inside), the
   * wall is drawn across the line between them, and the Masterpiece is laid blue under itself,
   * red under the target and green under itself again when it is hurt.
   */
  private advanceCursor(owner: Owner, delta: number): void {
    const s = this.side(owner);
    if (owner === 'player') {
      s.curX = this.aimX;
      s.curY = this.aimY;
      return;
    }
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    const sess = s.session;
    const target = this.enemyOf(owner);
    if (!sess) {
      // Idle: the brush points at whoever it is fighting.
      if (target && !this.remote(owner)) { s.curX = target.x; s.curY = target.y; }
      return;
    }
    if (sess.remote || sess.role === 'yy') return;
    const dt = delta / 1000;
    const prog = Phaser.Math.Clamp(1 - (sess.until - this.now) / sess.total, 0, 1);
    let cx = f.x;
    let cy = f.y;
    let r = 50;

    if (sess.role === 'orange') {
      const full = this.up(owner, 'e');
      s.curAng += dt * (full ? 3.6 : 2.6);
      r = full ? 72 : 52;
      if (target) { cx = target.x; cy = target.y; }
    } else if (sess.role === 'wall') {
      const tx = target ? target.x : f.x + 100;
      const ty = target ? target.y : f.y;
      const a = Math.atan2(ty - f.y, tx - f.x);
      const mx = f.x + Math.cos(a) * Math.min(90, Phaser.Math.Distance.Between(f.x, f.y, tx, ty) * 0.4);
      const my = f.y + Math.sin(a) * Math.min(90, Phaser.Math.Distance.Between(f.x, f.y, tx, ty) * 0.4);
      const nx = -Math.sin(a);
      const ny = Math.cos(a);
      const u = prog * 2 - 1;
      s.curX = Phaser.Math.Clamp(mx + nx * 85 * u, this.left, this.right);
      s.curY = Phaser.Math.Clamp(my + ny * 85 * u, this.top, this.bottom);
      return;
    } else if (sess.role === 'mp') {
      s.curAng += dt * 2.4;
      const hurt = f.hp / f.maxHp < 0.7;
      let want: PaintKind = 'red';
      if (prog < 0.3) want = 'blue';
      else if (prog > 0.75 && hurt) want = 'green';
      if (want !== s.mpPaint) this.pickPaint(owner, want);
      if (want === 'red' && target) { cx = target.x; cy = target.y; r = 46; } else r = 38;
    }
    s.curX = Phaser.Math.Clamp(cx + Math.cos(s.curAng) * r, this.left, this.right);
    s.curY = Phaser.Math.Clamp(cy + Math.sin(s.curAng) * r * 0.85, this.top, this.bottom);
  }

  /** Lay paint under whichever cursor this side is driving. */
  private feedSession(owner: Owner, time: number): void {
    const s = this.side(owner);
    const sess = s.session;
    if (!sess) return;
    if (time >= sess.until) { this.closeSession(owner); return; }
    if (sess.remote) return;
    if (sess.role === 'yy') { this.feedYinYang(owner, time); return; }

    if (sess.requireHold) {
      const drawing = owner === 'player' ? this.holding : Math.sin(s.curAng * 1.7) > -0.35;
      if (!drawing) { sess.started = false; return; }
    }
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    const x = Phaser.Math.Clamp(s.curX, this.left, this.right);
    const y = Phaser.Math.Clamp(s.curY, this.top, this.bottom);
    if (sess.started && Phaser.Math.Distance.Between(sess.lastX, sess.lastY, x, y) < sess.step) return;
    if (sess.role === 'mp' && s.mpCount >= MP_MAX) return;
    const linked = sess.started && Phaser.Math.Distance.Between(sess.lastX, sess.lastY, x, y) <= LIFT;
    this.lay(owner, sess, x, y, sess.kind, linked);
    if (owner === 'player' && this.api.isOnline) {
      this.outbox.push(Math.round(x), Math.round(y), KINDS.indexOf(sess.kind), linked ? 1 : 0);
    }
  }

  private lay(owner: Owner, sess: Session, x: number, y: number, kind: PaintKind, linked: boolean): void {
    const t = this.now;
    const role: Role = sess.role === 'orange' ? 'orange' : sess.role === 'wall' ? 'wall' : 'mp';
    const dab: Dab = {
      owner, role, kind, x, y,
      px: sess.lastX, py: sess.lastY, linked,
      until: role === 'wall' ? sess.until - (sess.remote ? 900 : 0) + WALL_LIFE_MS : role === 'mp' ? t + MP_LIFE_MS : 0,
      fuseAt: role === 'orange' ? Infinity : 0,
      seed: Math.random() * 999,
      stroke: sess.stroke,
      w: sess.width,
    };
    this.dabs.push(dab);
    if (role === 'mp') this.side(owner).mpCount++;
    sess.lastX = x;
    sess.lastY = y;
    sess.started = true;
    if (dab.fuseAt === 0) this.staticDirty = true;
    this.trimDabs();
  }

  /** Online: lay one of the remote painter's dabs exactly where they put it. */
  private layRemote(owner: Owner, x: number, y: number, kind: PaintKind, linked: boolean): void {
    const sess = this.side(owner).session;
    if (!sess) return;
    if (sess.role === 'mp' && this.side(owner).mpCount >= MP_MAX) return;
    if (sess.kind !== kind) { sess.kind = kind; sess.stroke = this.nextStroke++; this.avatar(owner)?.setPaint(kind); }
    this.lay(owner, sess, x, y, kind, linked && sess.started);
    this.side(owner).curX = x;
    this.side(owner).curY = y;
  }

  private trimDabs(): void {
    if (this.dabs.length <= MAX_DABS) return;
    const idx = this.dabs.findIndex((d) => d.role === 'mp');
    const [gone] = this.dabs.splice(idx >= 0 ? idx : 0, 1);
    if (gone && gone.fuseAt === 0) this.staticDirty = true;
    if (gone?.role === 'mp') this.side(gone.owner).mpCount = Math.max(0, this.side(gone.owner).mpCount - 1);
  }

  private expireDabs(time: number): void {
    let removed = false;
    const fading: Dab[] = [];
    this.dabs = this.dabs.filter((d) => {
      if (d.until === 0 || time < d.until) return true;
      removed = true;
      if (d.role === 'mp') this.side(d.owner).mpCount = Math.max(0, this.side(d.owner).mpCount - 1);
      if (d.role === 'wall') fading.push(d);
      return false;
    });
    for (let i = 0; i < fading.length; i += 5) this.fx(fading[i].owner).flecks(fading[i].x, fading[i].y, 2, 10, fading[i].kind, 360);
    if (removed) this.staticDirty = true;
  }

  // ── E: fuses and buckets ───────────────────────────────────────────────────

  private updateFuses(time: number): void {
    if (!this.dabs.some((d) => d.fuseAt > 0 && d.fuseAt !== Infinity && time >= d.fuseAt)) return;
    const going = this.dabs.filter((d) => d.fuseAt > 0 && d.fuseAt !== Infinity && time >= d.fuseAt);
    this.dabs = this.dabs.filter((d) => !(d.fuseAt > 0 && d.fuseAt !== Infinity && time >= d.fuseAt));
    for (const d of going) this.detonate(d, time);
    // Forget the per-stroke tallies of lines that have finished going off.
    if (this.orangeCounted.size) {
      for (const stroke of [...this.orangeCounted.keys()]) {
        if (!this.dabs.some((d) => d.stroke === stroke) && !this.bucketsInFlight.has(stroke)) this.orangeCounted.delete(stroke);
      }
    }
  }

  private bucketsInFlight = new Set<number>();

  private detonate(d: Dab, time: number): void {
    const radius = d.role === 'fill' ? BUCKET_RADIUS : ORANGE_RADIUS;
    this.fx(d.owner).boom(d.x, d.y, radius);
    if (Math.random() < 0.3) Sfx.playAt('explosion-small', d.x, { volume: 0.35, rate: 1.2 });
    for (const t of this.targetsOf(d.owner)) {
      if (Phaser.Math.Distance.Between(d.x, d.y, t.x, t.y) > radius + this.bodyR(t) * 0.5) continue;
      if (time < (this.blastGate.get(t) ?? 0)) continue;
      this.blastGate.set(t, time + BLAST_GATE_MS);
      this.hurt(t, ORANGE_DAMAGE);
      this.api.spawnHitFlash(t.x, t.y, PNT.orange);
      let seen = this.orangeCounted.get(d.stroke);
      if (!seen) { seen = new Set(); this.orangeCounted.set(d.stroke, seen); }
      if (!seen.has(t)) { seen.add(t); this.note(d.owner, 'orangeHits', 1); }
    }
  }

  /**
   * E+ — every loop the line closed gets a bucket of orange thrown into it. Loops are found in
   * draw order: from each dab, the furthest later dab that comes back within reach of it closes
   * the biggest loop starting there; the scan resumes past it, so a figure-eight is two buckets.
   */
  private throwBuckets(owner: Owner, run: Dab[]): void {
    const loops: { x: number; y: number }[][] = [];
    let i = 0;
    while (i < run.length) {
      let closed = -1;
      for (let j = run.length - 1; j >= i + BUCKET_MIN_SPAN; j--) {
        if (Phaser.Math.Distance.Between(run[i].x, run[i].y, run[j].x, run[j].y) <= BUCKET_CLOSE_DIST) { closed = j; break; }
      }
      if (closed >= 0) {
        const poly = run.slice(i, closed + 1).map((d) => ({ x: d.x, y: d.y }));
        if (polyArea(poly) >= BUCKET_MIN_AREA) { loops.push(poly); i = closed + 1; continue; }
      }
      i++;
    }
    if (!loops.length) return;
    const f = this.fighter(owner);
    const stroke = run[0]?.stroke ?? 0;
    let budget = BUCKET_MAX_DABS;
    for (const poly of loops) {
      const geom = new Phaser.Geom.Polygon(poly.map((p) => new Phaser.Geom.Point(p.x, p.y)));
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
      for (const p of poly) { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y); }
      const cx = (x0 + x1) / 2;
      const cy = (y0 + y1) / 2;
      const fill: { x: number; y: number }[] = [];
      for (let gx = x0 + BUCKET_SPACING / 2; gx < x1; gx += BUCKET_SPACING) {
        for (let gy = y0 + BUCKET_SPACING / 2; gy < y1; gy += BUCKET_SPACING) {
          if (fill.length >= budget) break;
          if (Phaser.Geom.Polygon.Contains(geom, gx, gy)) fill.push({ x: gx, y: gy });
        }
      }
      budget -= fill.length;
      if (!fill.length) continue;
      const far = Math.max(1, ...fill.map((p) => Math.hypot(p.x - cx, p.y - cy)));
      this.bucketsInFlight.add(stroke);
      this.fx(owner).bucket(f.x, f.y - 10, cx, cy, BUCKET_FLIGHT_MS, () => {
        this.bucketsInFlight.delete(stroke);
        const landed = this.now;
        for (const p of fill) {
          this.dabs.push({
            owner, role: 'fill', kind: 'orange', x: p.x, y: p.y, px: p.x, py: p.y, linked: false,
            until: 0,
            fuseAt: landed + BUCKET_FUSE_MS + (Math.hypot(p.x - cx, p.y - cy) / far) * BUCKET_WAVE_MS,
            seed: Math.random() * 999, stroke, w: BUCKET_DAB_R,
          });
        }
        this.fx(owner).splat(cx, cy, 46, 'orange', 420);
        Sfx.playAt('oil-splash', cx, { volume: 0.5, rate: 1.1 });
      });
      if (budget <= 0) break;
    }
    if (owner === 'player') this.api.showFloatingText(f.x, f.y - 50, `🪣 BUCKET ×${loops.length}`, this.hex(PNT.orange));
  }

  // ── Footing ────────────────────────────────────────────────────────────────

  /** What each painter is standing on. Read before anything deals damage this frame. */
  /** The newest of `owner`'s Masterpiece dabs covering a point — the coat you are standing on. */
  private topCoat(owner: Owner, x: number, y: number, pad = 0): PaintKind | null {
    for (let i = this.dabs.length - 1; i >= 0; i--) {
      const d = this.dabs[i];
      if (d.role !== 'mp' || d.owner !== owner) continue;
      if (Phaser.Math.Distance.Between(d.x, d.y, x, y) <= MP_TOUCH_R + pad) return d.kind;
    }
    return null;
  }

  private updateFooting(): void {
    for (const owner of OWNERS) {
      const s = this.side(owner);
      s.onMpRed = s.onMpBlue = s.onMpGreen = s.onWallGreen = false;
      const f = this.fighter(owner);
      if (!this.alive(f)) continue;
      // Masterpiece: only the top coat under your feet counts.
      const top = this.topCoat(owner, f.x, f.y);
      if (top === 'red') s.onMpRed = true;
      else if (top === 'blue') s.onMpBlue = true;
      else if (top === 'green') s.onMpGreen = true;
      for (const d of this.dabs) {
        if (d.owner !== owner || d.role !== 'wall' || (d.kind !== 'blue' && d.kind !== 'green')) continue;
        if (Phaser.Math.Distance.Between(d.x, d.y, f.x, f.y) > WALL_TOUCH_R) continue;
        if (d.kind === 'blue') s.hasteUntil = Math.max(s.hasteUntil, this.now + WALL_BLUE_TOUCH_MS);
        else s.onWallGreen = true;
      }
    }
  }

  // ── Masterpiece ground ─────────────────────────────────────────────────────

  /**
   * Red Masterpiece paint burns whoever stands on it — the strongest single rate, never a sum.
   * Blue and green look after the painter.
   */
  private updateGround(delta: number): void {
    const dt = delta / 1000;
    const burn = new Map<Fighter, { dps: number; owner: Owner; kind: PaintKind }>();
    // Only the top coat under a body counts: red painted over with blue no longer burns.
    for (const owner of OWNERS) {
      for (const t of this.targetsOf(owner)) {
        if (burn.has(t)) continue;
        if (this.topCoat(owner, t.x, t.y, this.bodyR(t) * 0.4) === 'red') burn.set(t, { dps: MP_RED_DPS, owner, kind: 'red' });
      }
    }
    // Red walls bite whatever is pressed up against them.
    for (const d of this.dabs) {
      if (d.role !== 'wall' || d.kind !== 'red') continue;
      for (const t of this.targetsOf(d.owner)) {
        if (Phaser.Math.Distance.Between(d.x, d.y, t.x, t.y) > this.bodyR(t) + WALL_W + WALL_BODY_PAD + 3) continue;
        const cur = burn.get(t);
        if (!cur || cur.dps < WALL_RED_DPS) burn.set(t, { dps: Math.max(cur?.dps ?? 0, WALL_RED_DPS), owner: d.owner, kind: 'red' });
      }
    }
    for (const [t, b] of burn) {
      const acc = (this.burnAccum.get(t) ?? 0) + b.dps * dt;
      const whole = Math.floor(acc);
      this.burnAccum.set(t, acc - whole);
      if (whole <= 0) continue;
      const wasAlive = t.hp > 0;
      this.hurt(t, whole);
      if (Math.random() < 0.25) this.api.spawnHitFlash(t.x, t.y, PNT.red);
      // Mastery: a Masterpiece kill. Credited to red Masterpiece paint specifically.
      if (wasAlive && t.hp <= 0 && this.topCoat(b.owner, t.x, t.y, this.bodyR(t)) === 'red') {
        this.note(b.owner, 'mpKills', 1);
      }
    }
    for (const t of [...this.burnAccum.keys()]) if (!burn.has(t)) this.burnAccum.delete(t);

    for (const owner of OWNERS) {
      const s = this.side(owner);
      const f = this.fighter(owner);
      if (!this.alive(f)) continue;
      // Blue Masterpiece paint: the bars recharge faster while you stand in it.
      if (s.onMpBlue) f.reduceCooldowns(delta * MP_BLUE_CD_RATE);
      // Two greens under you are not twice the heal — the stronger one wins.
      let hps = 0;
      if (s.onMpGreen) hps = Math.max(hps, MP_GREEN_HPS);
      if (s.onWallGreen) hps = Math.max(hps, WALL_GREEN_HPS);
      if (hps <= 0) { s.healAccum = 0; continue; }
      s.healAccum += hps * dt;
      const whole = Math.floor(s.healAccum);
      if (whole > 0) { s.healAccum -= whole; f.heal(whole); }
    }
  }

  private updateMasterpiece(owner: Owner, time: number): void {
    const s = this.side(owner);
    if (s.mpOn && time >= s.mpUntil) {
      s.mpOn = false;
      const f = this.fighter(owner);
      if (f) f.isInvincible = s.mpSavedInvincible;
      if (s.session?.role === 'mp') this.closeSession(owner);
      if (owner === 'player' && this.canvas?.mode === 'mp') this.finishCanvas();
      if (f) {
        this.fx(owner).flecks(f.x, f.y, 12, 44, 'red', 620);
        this.api.showFloatingText(f.x, f.y - 48, '🖼️ FINISHED', this.hex(PNT.rose));
      }
    }
    // Q+ — Paint Chips crawl off the painting for as long as any of it is on the floor.
    if (!this.up(owner, 'q') || time < s.nextChipAt) return;
    s.nextChipAt = time + CHIP_EVERY_MS;
    const mine = this.dabs.filter((d) => d.owner === owner && d.role === 'mp');
    if (!mine.length) return;
    if (this.chips.filter((c) => c.owner === owner).length >= CHIP_MAX) return;
    const src = mine[Math.floor(Math.random() * mine.length)];
    const kind = src.kind === 'blue' ? 'blue' : src.kind === 'green' ? 'green' : 'red';
    this.chips.push({
      owner, kind, x: src.x, y: src.y, ang: Math.random() * Math.PI * 2, gait: 0,
      until: time + CHIP_LIFE_MS, nextAtk: time + 300, latched: false,
      orbit: Math.random() * Math.PI * 2, seed: Math.random() * 999,
    });
    this.fx(owner).flecks(src.x, src.y, 4, 12, src.kind, 300);
    Sfx.playAt('claw', src.x, { volume: 0.2, rate: 1.6 });
  }

  // ── R: walls ───────────────────────────────────────────────────────────────

  private updateWalls(delta: number): void {
    void delta;
    const walls = this.dabs.filter((d) => d.role === 'wall');
    if (!walls.length) return;

    // Shots die on hostile walls. Snapshotted — destroy() splices the group.
    for (const child of [...this.api.projectiles.getChildren()]) {
      const proj = child as Projectile;
      if (!proj.active) continue;
      for (const d of walls) {
        const hostile = d.owner === 'player' ? !proj.isFromPlayer : proj.isFromPlayer;
        if (!hostile) continue;
        if (Phaser.Math.Distance.Between(d.x, d.y, proj.x, proj.y) > WALL_BLOCK_R + d.w * 0.5) continue;
        const body = proj.body as Phaser.Physics.Arcade.Body | null;
        this.onWallBlocked(d, proj.x, proj.y, body ? body.velocity.x : 0, body ? body.velocity.y : 0);
        proj.destroy();
        break;
      }
    }

    // Bodies are held back by hostile walls.
    for (const owner of OWNERS) {
      const mine = walls.filter((d) => d.owner === owner);
      if (!mine.length) continue;
      for (const t of this.targetsOf(owner)) {
        const r = this.bodyR(t);
        for (let pass = 0; pass < 2; pass++) {
          for (const d of mine) {
            const need = r + d.w * 0.5 + WALL_BODY_PAD;
            const dist = Phaser.Math.Distance.Between(d.x, d.y, t.x, t.y);
            if (dist >= need) continue;
            const a = dist > 0.01 ? Math.atan2(t.y - d.y, t.x - d.x) : Math.random() * Math.PI * 2;
            t.setPosition(d.x + Math.cos(a) * need, d.y + Math.sin(a) * need);
            const b = t.body as Phaser.Physics.Arcade.Body | null;
            if (b) {
              // Cancel only the part of the velocity driving into the wall.
              const into = b.velocity.x * -Math.cos(a) + b.velocity.y * -Math.sin(a);
              if (into > 0) b.velocity.set(b.velocity.x + Math.cos(a) * into, b.velocity.y + Math.sin(a) * into);
            }
          }
        }
      }
    }
  }

  /** A shot died on a wall. Plain paint just stops it; R+ paint answers it. */
  private onWallBlocked(d: Dab, x: number, y: number, vx: number, vy: number): void {
    this.fx(d.owner).snap(x, y, d.kind);
    Sfx.playAt('shield-block', x, { volume: 0.35, rate: 1.2 });
    this.note(d.owner, 'wallBlocks', 1);
    const f = this.fighter(d.owner);
    if (d.kind === 'red') {
      const thrower = this.throwerOf(d.owner, x, y, vx, vy);
      if (thrower) {
        this.hurt(thrower, WALL_RED_THROWER_DMG);
        this.api.spawnHitFlash(thrower.x, thrower.y, PNT.red);
      }
    } else if (d.kind === 'blue' && this.alive(f)) {
      this.side(d.owner).hasteUntil = Math.max(this.side(d.owner).hasteUntil, this.now + WALL_BLUE_HIT_MS);
    } else if (d.kind === 'green' && this.alive(f)) {
      f.heal(WALL_GREEN_HIT_HEAL);
    }
  }

  /** Whoever fired the shot that just hit a red wall: the enemy the shot was coming from. */
  private throwerOf(owner: Owner, x: number, y: number, vx: number, vy: number): Fighter | null {
    const targets = this.targetsOf(owner);
    if (owner === 'npc' || (!this.api.isInvasion && targets.length === 1)) return targets[0] ?? null;
    const sp = Math.hypot(vx, vy);
    if (sp < 1) return null;
    let best: Fighter | null = null;
    let bestScore = Infinity;
    for (const t of targets) {
      const dx = t.x - x;
      const dy = t.y - y;
      const d = Math.hypot(dx, dy) || 1;
      const back = (dx * -vx + dy * -vy) / (d * sp);
      if (back < 0.8) continue;
      if (d < bestScore) { bestScore = d; best = t; }
    }
    return best;
  }

  // ── Click: splotches ───────────────────────────────────────────────────────

  private updateSplotches(time: number, delta: number): void {
    const dt = delta / 1000;
    // Two splotches over one body are not twice the paint: each frame a body takes the strongest
    // contact touching it, never the sum.
    const contact = new Map<Fighter, number>();
    for (let i = this.splotches.length - 1; i >= 0; i--) {
      const sp = this.splotches[i];
      sp.x += sp.vx * dt;
      sp.y += sp.vy * dt;
      const out = sp.x < -40 || sp.x > this.api.width + 40 || sp.y < -40 || sp.y > this.api.height + 40;
      if (time >= sp.until || out) {
        if (!out) this.fx(sp.owner).splat(sp.x, sp.y, Math.min(30, sp.shape.reach), sp.shape.dabs[0]?.kind ?? 'black', 320);
        this.splotches.splice(i, 1);
        continue;
      }
      const c = Math.cos(sp.ang);
      const s = Math.sin(sp.ang);
      const world = (d: ShapeDab) => ({ x: sp.x + d.f * c - d.l * s, y: sp.y + d.f * s + d.l * c });

      // Hostile walls stop splotches like any other shot.
      let blocked = false;
      for (const d of this.dabs) {
        if (d.role !== 'wall' || d.owner === sp.owner) continue;
        if (Phaser.Math.Distance.Between(d.x, d.y, sp.x, sp.y) > sp.shape.reach + d.w) continue;
        if (sp.shape.dabs.some((sd) => { const w = world(sd); return Phaser.Math.Distance.Between(w.x, w.y, d.x, d.y) <= SHAPE_DAB_R + d.w * 0.5 + 2; })) {
          this.onWallBlocked(d, sp.x, sp.y, sp.vx, sp.vy);
          blocked = true;
          break;
        }
      }
      if (blocked) { this.splotches.splice(i, 1); continue; }

      // Contact damage, ticking per body, through everything (it pierces).
      for (const t of this.targetsOf(sp.owner)) {
        const r = this.bodyR(t);
        if (Phaser.Math.Distance.Between(sp.x, sp.y, t.x, t.y) > sp.shape.reach + r) continue;
        let hit: { x: number; y: number } | null = null;
        for (const sd of sp.shape.dabs) {
          const w = world(sd);
          if (Phaser.Math.Distance.Between(w.x, w.y, t.x, t.y) <= r + SHAPE_DAB_R) { hit = w; break; }
        }
        if (!hit) continue;
        const zone = t.paintZoneMult?.(hit.x, hit.y) ?? 1;
        const raw = sp.shape.tick * (1 + SPLOTCH_RED_BONUS * sp.shape.red) * zone * (delta / SPLOTCH_TICK_MS);
        contact.set(t, Math.max(contact.get(t) ?? 0, raw));
        if (sp.shape.blue > 0) {
          const mult = 1 - SPLOTCH_BLUE_SLOW * sp.shape.blue;
          const cur = this.slows.get(t);
          if (!cur || cur.until < time || mult <= cur.mult) this.slows.set(t, { mult: Math.min(mult, cur && cur.until > time ? cur.mult : 1), until: time + SPLOTCH_SLOW_MS });
          else cur.until = time + SPLOTCH_SLOW_MS;
        }
        if (sp.shape.green > 0) {
          const dps = SPLOTCH_GREEN_DPS * sp.shape.green;
          const cur = this.dots.get(t);
          if (!cur || cur.dps <= dps) this.dots.set(t, { dps, until: time + SPLOTCH_DOT_MS, owner: sp.owner, acc: cur?.acc ?? 0 });
          else cur.until = time + SPLOTCH_DOT_MS;
        }
        if (Math.random() < 0.08) this.fx(sp.owner).flecks(hit.x, hit.y, 3, 12, sp.shape.dabs[0]?.kind ?? 'black', 280);
      }
    }
    for (const [t, raw] of contact) {
      const acc = (this.contactAcc.get(t) ?? 0) + raw;
      const whole = Math.floor(acc);
      this.contactAcc.set(t, acc - whole);
      if (whole > 0) this.hurt(t, whole);
    }
    for (const t of [...this.contactAcc.keys()]) if (!contact.has(t)) this.contactAcc.delete(t);
  }

  /** Fractional splotch contact damage carried between frames, per body. */
  private contactAcc = new Map<Fighter, number>();

  private updateDots(delta: number): void {
    const t = this.now;
    for (const [f, dot] of [...this.dots]) {
      if (!this.alive(f) || t >= dot.until) { this.dots.delete(f); continue; }
      dot.acc += dot.dps * (delta / 1000);
      const whole = Math.floor(dot.acc);
      if (whole > 0) { dot.acc -= whole; this.hurt(f, whole); }
    }
    for (const [f, sl] of [...this.slows]) if (!f.active || t >= sl.until) this.slows.delete(f);
  }

  // ── Q+: chips and pellets ──────────────────────────────────────────────────

  private nearest(owner: Owner, x: number, y: number): Fighter | null {
    let best: Fighter | null = null;
    let bd = Infinity;
    for (const t of this.targetsOf(owner)) {
      const d = Phaser.Math.Distance.Between(x, y, t.x, t.y);
      if (d < bd) { bd = d; best = t; }
    }
    return best;
  }

  private updateChips(time: number, delta: number): void {
    const dt = delta / 1000;
    for (let i = this.chips.length - 1; i >= 0; i--) {
      const c = this.chips[i];
      const painter = this.fighter(c.owner);
      if (time >= c.until || !this.alive(painter)) {
        this.fx(c.owner).flecks(c.x, c.y, 5, 14, c.kind, 360);
        this.chips.splice(i, 1);
        continue;
      }
      const step = (tx: number, ty: number, speed: number, stopAt: number) => {
        const d = Phaser.Math.Distance.Between(c.x, c.y, tx, ty);
        const a = Math.atan2(ty - c.y, tx - c.x);
        c.ang = a;
        if (d <= stopAt) return;
        const mv = Math.min(d - stopAt, speed * dt);
        c.x += Math.cos(a) * mv;
        c.y += Math.sin(a) * mv;
        c.gait += mv * 0.35;
      };
      if (c.kind === 'green') {
        if (!c.latched) {
          step(painter.x, painter.y, CHIP_GREEN_SPEED, 0);
          if (Phaser.Math.Distance.Between(c.x, c.y, painter.x, painter.y) < 14) c.latched = true;
        } else {
          c.orbit += dt * 2.2;
          c.x = painter.x + Math.cos(c.orbit) * 16;
          c.y = painter.y + Math.sin(c.orbit) * 10 + 4;
          c.ang = c.orbit + Math.PI / 2;
          c.gait += dt * 8;
          if (time >= c.nextAtk) { c.nextAtk = time + 1000; painter.heal(CHIP_GREEN_HPS); }
        }
        continue;
      }
      const t = this.nearest(c.owner, c.x, c.y);
      if (!t) continue;
      const d = Phaser.Math.Distance.Between(c.x, c.y, t.x, t.y);
      if (c.kind === 'red') {
        step(t.x, t.y, CHIP_RED_SPEED, this.bodyR(t) + CHIP_R * 0.5);
        if (d <= this.bodyR(t) + CHIP_R + CHIP_RED_REACH && time >= c.nextAtk) {
          c.nextAtk = time + CHIP_RED_ATK_MS;
          this.hurt(t, CHIP_RED_DMG);
          this.fx(c.owner).flecks(t.x, t.y, 2, 10, 'red', 240);
        }
      } else {
        if (d > CHIP_BLUE_RANGE + 30) step(t.x, t.y, CHIP_BLUE_SPEED, 0);
        else if (d < CHIP_BLUE_RANGE - 30) {
          const a = Math.atan2(c.y - t.y, c.x - t.x);
          step(c.x + Math.cos(a) * 40, c.y + Math.sin(a) * 40, CHIP_BLUE_SPEED, 0);
          c.ang = a + Math.PI;
        } else c.ang = Math.atan2(t.y - c.y, t.x - c.x);
        if (time >= c.nextAtk && d < CHIP_BLUE_RANGE + 80) {
          c.nextAtk = time + CHIP_BLUE_ATK_MS;
          const a = Math.atan2(t.y - c.y, t.x - c.x);
          this.pellets.push({ owner: c.owner, x: c.x, y: c.y, vx: Math.cos(a) * PELLET_SPEED, vy: Math.sin(a) * PELLET_SPEED, until: time + PELLET_LIFE_MS });
        }
      }
      c.x = Phaser.Math.Clamp(c.x, this.left, this.right);
      c.y = Phaser.Math.Clamp(c.y, this.top, this.bottom);
    }
  }

  private updatePellets(time: number, delta: number): void {
    const dt = delta / 1000;
    for (let i = this.pellets.length - 1; i >= 0; i--) {
      const p = this.pellets[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      let done = time >= p.until;
      if (!done) {
        const wall = this.dabs.find((d) => d.role === 'wall' && d.owner !== p.owner
          && Phaser.Math.Distance.Between(d.x, d.y, p.x, p.y) <= WALL_BLOCK_R + d.w * 0.5);
        if (wall) { this.onWallBlocked(wall, p.x, p.y, p.vx, p.vy); done = true; }
      }
      if (!done) {
        for (const t of this.targetsOf(p.owner)) {
          if (Phaser.Math.Distance.Between(p.x, p.y, t.x, t.y) > this.bodyR(t) + 4) continue;
          this.hurt(t, Math.round(PELLET_DMG * (t.paintZoneMult?.(p.x, p.y) ?? 1)));
          this.fx(p.owner).splat(p.x, p.y, 10, 'blue', 260);
          done = true;
          break;
        }
      }
      if (done) this.pellets.splice(i, 1);
    }
  }

  // ── Mastery: Yin-Yang ──────────────────────────────────────────────────────

  private tryCastYinYang(owner: Owner): boolean {
    const s = this.side(owner);
    if (this.now - s.yyCastAt < YY_COOLDOWN_MS) return false;
    if (s.session || s.mpOn) return false;
    s.yyCastAt = this.now;
    this.openSession(owner, 'yy', owner === 'player' ? 'white' : 'black', YY_DRAW_MS, true, YY_STEP, YY_DAB_R);
    const f = this.fighter(owner);
    this.avatar(owner)?.play('flex');
    Sfx.playAt('incantation', f.x, { volume: 0.5, rate: 1.1 });
    if (owner === 'player') this.api.showFloatingText(f.x, f.y - 48, '☯️ PAINT THE BARS', this.hex(PNT.white));
    return true;
  }

  /** The bars a side's own white goes on: the player's HUD cards, or the opponent's tray. */
  private ownBars(owner: Owner): BarRect[] {
    return owner === 'player' ? this.hudBars() : this.stripBars();
  }

  /** The bars a side's black goes on. In Invasion the player's black goes on the horde. */
  private foeBars(owner: Owner): BarRect[] {
    if (owner === 'npc') return this.hudBars();
    return this.api.isInvasion ? [this.hordeBar()] : this.stripBars();
  }

  private hudBars(): BarRect[] {
    const out: BarRect[] = [];
    for (const e of this.api.abilityBars) {
      if (out.length >= 5) break;
      if (!e.fill.visible) continue;
      const h = e.fill.height;
      out.push({ x: e.fill.x, y: e.fill.y - h / 2, w: e.maxWidth, h, abilityId: e.abilityId });
    }
    return out;
  }

  private stripBars(): BarRect[] {
    const npc = this.api.npc;
    const abilities = npc?.element?.abilities ?? [];
    const n = Math.min(5, abilities.length);
    const total = n * STRIP_CARD_W + (n - 1) * STRIP_GAP;
    const x0 = this.api.width / 2 - total / 2;
    const out: BarRect[] = [];
    for (let i = 0; i < n; i++) {
      out.push({ x: x0 + i * (STRIP_CARD_W + STRIP_GAP), y: STRIP_Y, w: STRIP_CARD_W, h: STRIP_CARD_H, abilityId: abilities[i].id });
    }
    return out;
  }

  private hordeBar(): BarRect {
    return { x: this.api.width / 2 - HORDE_BAR_W / 2, y: STRIP_Y, w: HORDE_BAR_W, h: STRIP_CARD_H, abilityId: null };
  }

  /** Whether the opponent tray should be on screen at all. */
  private stripShown(): boolean {
    for (const o of OWNERS) {
      const s = this.side(o);
      if (s.session?.role === 'yy') return true;
      if (o === 'player' && s.yyFoe.length) return true;
      if (o === 'npc' && s.yyOwn.length) return true;
    }
    return false;
  }

  private feedYinYang(owner: Owner, time: number): void {
    const s = this.side(owner);
    const sess = s.session!;
    let x = s.curX;
    let y = s.curY;
    if (owner === 'npc') {
      // The bot scribbles black over the player's longest bars first, then white over its own.
      const prog = Phaser.Math.Clamp(1 - (sess.until - time) / sess.total, 0, 1);
      const foe = this.foeBars('npc');
      const own = this.ownBars('npc');
      const onFoe = prog < 0.6 && foe.length > 0;
      const bars = onFoe ? foe : own;
      if (!bars.length) return;
      const pick = bars.length >= 5 ? [4, 3, 1][Math.floor(prog * 9) % 3] : 0;
      const r = bars[Math.min(pick, bars.length - 1)];
      s.curAng += 0.22;
      x = r.x + r.w * (0.5 + 0.44 * Math.sin(s.curAng * 1.3));
      y = r.y + r.h * (0.5 + 0.38 * Math.sin(s.curAng * 2.9));
      sess.kind = onFoe ? 'black' : 'white';
    } else if (!this.holding) {
      sess.started = false;
      return;
    }
    if (sess.started && Phaser.Math.Distance.Between(sess.lastX, sess.lastY, x, y) < sess.step) return;
    sess.lastX = x;
    sess.lastY = y;
    sess.started = true;
    const hitIn = (bars: BarRect[], list: BarDab[], kind: PaintKind): boolean => {
      for (let i = 0; i < bars.length; i++) {
        const r = bars[i];
        if (x < r.x - 2 || x > r.x + r.w + 2 || y < r.y - 2 || y > r.y + r.h + 2) continue;
        if (list.filter((d) => d.slot === i).length >= YY_MAX_PER_SLOT) return true;
        list.push({ slot: i, u: (x - r.x) / r.w, v: (y - r.y) / r.h, until: time + YY_LIFE_MS, seed: Math.random() * 999 });
        sess.kind = kind;
        return true;
      }
      return false;
    };
    if (!hitIn(this.ownBars(owner), s.yyOwn, 'white')) hitIn(this.foeBars(owner), s.yyFoe, 'black');
  }

  /** Coverage 0–1 of each slot, from the dabs on it. */
  /**
   * Coverage 0–1 of each slot: the share of the bar actually painted, sampled on a grid, so
   * painting the same patch twice adds nothing.
   */
  private coverage(list: BarDab[], bars: BarRect[]): number[] {
    return bars.map((r, i) => {
      const mine = list.filter((d) => d.slot === i);
      if (!mine.length) return 0;
      const nx = 16;
      const ny = 5;
      let hit = 0;
      for (let a = 0; a < nx; a++) {
        for (let b = 0; b < ny; b++) {
          const x = r.x + ((a + 0.5) / nx) * r.w;
          const y = r.y + ((b + 0.5) / ny) * r.h;
          if (mine.some((d) => Phaser.Math.Distance.Between(r.x + d.u * r.w, r.y + d.v * r.h, x, y) <= YY_DAB_R + 1)) hit++;
        }
      }
      return hit / (nx * ny);
    });
  }

  private updateYinYang(delta: number): void {
    const t = this.now;
    for (const owner of OWNERS) {
      const s = this.side(owner);
      s.yyOwn = s.yyOwn.filter((d) => t < d.until);
      s.yyFoe = s.yyFoe.filter((d) => t < d.until);

      // White on your own bars: those abilities recharge faster.
      if (s.yyOwn.length) {
        const f = this.fighter(owner);
        const bars = this.ownBars(owner);
        const cov = this.coverage(s.yyOwn, bars);
        if (this.alive(f)) {
          bars.forEach((r, i) => {
            if (!r.abilityId || cov[i] <= 0) return;
            if (!f.element.abilities.some((a) => a.id === r.abilityId)) return;
            if (f.getCooldownRatio(r.abilityId) >= 1) return;
            f.reduceCooldown(r.abilityId, delta * YY_OWN_RATE * cov[i]);
          });
        }
      }

      // Black on theirs: those recharge slower.
      const horde = owner === 'player' && this.api.isInvasion;
      if (horde) {
        const cov = s.yyFoe.length ? this.coverage(s.yyFoe, [this.hordeBar()])[0] : 0;
        const want = 1 + HORDE_SLOW * cov;
        for (const h of this.api.enemies) {
          if (!h || !h.active || h === this.api.npc) continue;
          const had = this.hordeApplied.get(h) ?? 1;
          if (Math.abs(had - want) < 0.001) continue;
          h.attackIntervalMult = (h.attackIntervalMult / had) * want;
          if (want === 1) this.hordeApplied.delete(h);
          else this.hordeApplied.set(h, want);
        }
      } else if (s.yyFoe.length) {
        const victim = owner === 'player' ? this.api.npc : this.api.player;
        const bars = this.foeBars(owner);
        const cov = this.coverage(s.yyFoe, bars);
        if (this.alive(victim)) {
          bars.forEach((r, i) => {
            if (!r.abilityId || cov[i] <= 0) return;
            victim.delayCooldown(r.abilityId, delta * YY_FOE_RATE * cov[i]);
          });
        }
      }
    }
  }

  /** The bot casts Yin-Yang itself, off a private clock, when there are bars worth painting. */
  private updateNpcYinYang(time: number): void {
    if (this.remote('npc') || !this.isPaint('npc') || !this.yySlot('npc')) return;
    const s = this.sides.npc;
    if (time - s.yyCastAt < YY_COOLDOWN_MS || s.session || s.mpOn || s.stillDraw || s.mpDraw) return;
    const p = this.api.player;
    if (!this.alive(p) || !this.alive(this.api.npc)) return;
    const cooling = p.element.abilities.filter((a) => p.getCooldownRatio(a.id) < 0.6).length;
    if (cooling < 2) return;
    this.tryCastYinYang('npc');
  }

  private sendYinYang(): void {
    const s = this.sides.player;
    const pack = (list: BarDab[]) => {
      const out: number[] = [];
      for (const d of list.slice(-150)) out.push(d.slot, Math.round(d.u * 100), Math.round(d.v * 100));
      return out;
    };
    this.api.sendPaintMsg({ t: 'pnt', k: 'yy', own: pack(s.yyOwn), foe: pack(s.yyFoe) });
  }

  // ── Bot Still Life ─────────────────────────────────────────────────────────

  private updateNpcStillDraw(owner: Owner, time: number): void {
    const s = this.side(owner);
    if (s.mpDraw && time >= s.mpDraw.until) {
      const pts = s.mpDraw.pts;
      s.mpDraw = null;
      const f = this.fighter(owner);
      if (this.alive(f)) this.projectMasterpiece(owner, pts);
    }
    if (!s.stillDraw || time < s.stillDraw.until) return;
    const pts = s.stillDraw.pts;
    s.stillDraw = null;
    const target = this.enemyOf(owner);
    if (!this.alive(target) || !this.alive(this.fighter(owner))) return;
    this.transform(owner, target, this.stillDabsFrom(pts));
  }

  // ── The player's canvas clock ──────────────────────────────────────────────

  private updateCanvas(time: number): void {
    const c = this.canvas;
    const p = this.api.player;
    const brushOpen = !!c && c.mode === 'brush';
    p?.setMenuGuard('paint-canvas', brushOpen);
    if (!c) return;
    if (!this.alive(p) || this.api.elementId !== 'chalk') { this.canvas = null; this.closeCanvasUi(); p?.setMenuGuard('paint-canvas', false); return; }
    if (c.mode !== 'brush' && time >= c.until) this.finishCanvas();
  }

  /** ArenaScene holds the player still while the Splotch canvas is open. */
  holdsPlayerStill(): boolean {
    return this.canvas?.mode === 'brush';
  }

  // ── Speed and armour ───────────────────────────────────────────────────────

  private slowFor(f: Fighter): number {
    let mult = 1;
    const sl = this.slows.get(f);
    if (sl && this.now < sl.until) mult *= sl.mult;
    const still = this.stillOn(f);
    if (still && still.blue > 0) mult *= 1 - STILL_BLUE_SLOW * still.blue;
    return mult;
  }

  private hasteFor(owner: Owner): number {
    if (!this.isPaint(owner)) return 1;
    const s = this.side(owner);
    // Blue on blue is not faster — the stronger haste wins.
    let mult = 1;
    if (s.onMpBlue) mult = Math.max(mult, MP_BLUE_SPEED);
    if (this.now < s.hasteUntil) mult = Math.max(mult, WALL_BLUE_MULT);
    return mult;
  }

  /** Writes the two single-writer paint fields on every body that needs one. */
  private updateFields(): void {
    const now = new Set<Fighter>();
    const write = (f: Fighter, inc: number, slow: number) => {
      f.paintIncomingMult = inc;
      f.paintSlowMult = slow;
      if (inc !== 1 || slow !== 1) now.add(f);
    };
    for (const owner of OWNERS) {
      const f = this.fighter(owner);
      if (!f) continue;
      let inc = 1;
      if (this.isPaint(owner) && this.side(owner).onMpGreen) inc *= MP_GREEN_RESIST;
      const still = this.stillOn(f);
      if (still && still.red > 0) inc *= 1 + STILL_RED_FLAT * still.red;
      // The 1v1 pair are slowed through the pulled speed multipliers, not this field.
      write(f, inc, 1);
    }
    for (const h of this.api.enemies) {
      if (!h || !h.active || h === this.api.npc) continue;
      const still = this.stillOn(h);
      const inc = still && still.red > 0 ? 1 + STILL_RED_FLAT * still.red : 1;
      write(h, inc, this.slowFor(h));
    }
    for (const f of this.touched) if (!now.has(f) && f.scene) this.clearPaintFields(f);
    this.touched = now;
  }

  getPlayerSpeedMult(): number { return this.hasteFor('player') * this.slowFor(this.api.player); }
  /**
   * Online the replica's own speed is streamed, and a slow this sim put on it is mirrored to the
   * victim through `spd` — while the victim's sim, replaying the same paint, slows itself. Returning
   * 1 here is what keeps a blue splotch from landing twice.
   */
  getNpcSpeedMult(): number {
    if (this.api.isOnline) return 1;
    return this.hasteFor('npc') * this.slowFor(this.api.npc);
  }

  // ── Avatars ────────────────────────────────────────────────────────────────

  private updateAvatars(delta: number, playerIs: boolean, npcIs: boolean): void {
    const { scene } = this.api;
    const run = (owner: Owner, on: boolean) => {
      const f = this.fighter(owner);
      let av = this.avatar(owner);
      if (!on) {
        av?.destroy();
        if (owner === 'player') this.playerAvatar = null; else this.npcAvatar = null;
        return;
      }
      if (!av) {
        av = new PaintAvatar(scene, this.col(owner));
        if (owner === 'player') this.playerAvatar = av; else this.npcAvatar = av;
      }
      const s = this.side(owner);
      const aimX = owner === 'player' ? this.aimX : s.curX;
      const aimY = owner === 'player' ? this.aimY : s.curY;
      av.setFacing(Math.atan2(aimY - f.y, aimX - f.x));
      av.setPaint(this.heldPaint(owner));
      const painting = (!!s.session && (!s.session.requireHold || owner !== 'player' || this.holding))
        || (owner === 'player' && !!this.canvas) || !!s.stillDraw || !!s.mpDraw;
      av.setDrawing(painting);
      av.setBrushSize(s.mpOn ? 1.6 : 1);
      av.setIntensity(s.mpOn ? 1.35 : 1);
      av.setMastered(owner === 'player' ? this.api.masteryActive : this.api.npcMasteryActive);
      // A painter turned into somebody else's Still Life is not drawn as themselves.
      const shown = f.active && f.hp > 0 && !this.stillOn(f);
      av.update(delta, f.x, f.y, shown ? f.alpha : 0);
    };
    run('player', playerIs);
    run('npc', npcIs);
  }

  // ── Painting ───────────────────────────────────────────────────────────────

  /** A floor dab as one segment of a paint layer. Fill blobs store their radius in `w`. */
  private segOf(d: Dab): PaintSeg {
    if (d.role === 'fill') return { x: d.x, y: d.y, px: d.x, py: d.y, linked: false, w: d.w * 2, kind: d.kind };
    return { x: d.x, y: d.y, px: d.px, py: d.py, linked: d.linked, w: d.w, kind: d.kind };
  }

  /** Canvas points as layer segments, at (`x`, `y`) and scale `k`. */
  private canvasSegs(pts: CanvasPt[], x: number, y: number, k: number, w: number): PaintSeg[] {
    const out: PaintSeg[] = [];
    let prev: CanvasPt | null = null;
    for (const p of pts) {
      out.push({
        x: x + p.cx * k, y: y + p.cy * k,
        px: prev ? x + prev.cx * k : x + p.cx * k, py: prev ? y + prev.cy * k : y + p.cy * k,
        linked: !!prev && p.linked, w, kind: p.kind,
      });
      prev = p;
    }
    return out;
  }

  /** Lay a set of floor dabs as flat paint layers, one per painter (each has its own skin tint). */
  private layDabs(g: Phaser.GameObjects.Graphics, list: Dab[]): void {
    for (const owner of OWNERS) {
      const mine = list.filter((d) => d.owner === owner);
      if (mine.length) paintLayer(g, this.col(owner), mine.map((d) => this.segOf(d)));
    }
  }

  private paintStatic(): void {
    const g = this.staticGfx;
    if (!g || !this.staticDirty) return;
    this.staticDirty = false;
    g.clear();
    // Masterpiece under the walls, so a wall painted across a painting reads on top of it.
    this.layDabs(g, this.dabs.filter((d) => d.fuseAt === 0 && d.role === 'mp'));
    const walls = this.dabs.filter((d) => d.fuseAt === 0 && d.role === 'wall');
    // A wall is thick paint standing proud of the floor: one soft shadow under the lot, then the paint.
    g.fillStyle(0x000000, 0.22);
    for (const d of walls) g.fillCircle(d.x + 2, d.y + 4, d.w * 0.75);
    this.layDabs(g, walls);
  }

  private paintLive(time: number): void {
    const g = this.liveGfx;
    if (!g) return;
    g.clear();
    const fused = this.dabs.filter((d) => d.fuseAt !== 0);
    this.layDabs(g, fused);
    // The fuse running hot: a spark on each dab as its turn comes.
    for (const d of fused) {
      if (d.fuseAt === Infinity) continue;
      const near = Phaser.Math.Clamp(1 - (d.fuseAt - time) / 900, 0, 1);
      if (near <= 0.4) continue;
      const pulse = 0.75 + 0.25 * Math.sin(this.vizT * 22 + d.seed);
      g.fillStyle(this.col(d.owner)(PNT.spark), (near - 0.4) * 1.4 * pulse);
      g.fillCircle(d.x, d.y, 2 + near * 3);
    }
    // Splotches: the drawing itself, flying, turned to face where it is going.
    for (const sp of this.splotches) {
      const c = Math.cos(sp.ang);
      const s = Math.sin(sp.ang);
      const tint = this.col(sp.owner);
      const segs: PaintSeg[] = [];
      let prev: { x: number; y: number } | null = null;
      for (const sd of sp.shape.dabs) {
        const x = sp.x + sd.f * c - sd.l * s;
        const y = sp.y + sd.f * s + sd.l * c;
        const linked = !!prev && Phaser.Math.Distance.Between(prev.x, prev.y, x, y) <= SHAPE_DAB_R * 2.6;
        segs.push({ x, y, px: prev ? prev.x : x, py: prev ? prev.y : y, linked, w: SHAPE_DAB_R * 2, kind: sd.kind });
        prev = { x, y };
      }
      paintLayer(g, tint, segs);
    }
    for (const c of this.chips) {
      const fade = Phaser.Math.Clamp((c.until - time) / 600, 0, 1);
      paintChip(g, this.col(c.owner), c.x, c.y, c.ang, CHIP_R, c.kind, c.gait, fade, c.seed);
    }
    for (const p of this.pellets) {
      paintDab(g, this.col(p.owner), p.x, p.y, 4, 'blue', 1, 7);
    }
  }

  /** Still Lifes: the picture, standing where its subject is. */
  private paintStills(): void {
    const g = this.stillGfx;
    if (!g) return;
    g.clear();
    for (const sl of this.stills) {
      const t = sl.target;
      if (!t.active) continue;
      const tint = this.col(sl.owner);
      const left = sl.until - this.now;
      const flick = left < 1200 ? (Math.sin(this.vizT * 20) > 0 ? 1 : 0.45) : 1;
      // A faint paper backing, so the picture reads as a thing and not as a stain.
      g.fillStyle(tint(PNT.canvas), 0.16 * flick);
      g.fillCircle(t.x, t.y, sl.radius);
      g.lineStyle(1, tint(PNT.canvasDeep), 0.35 * flick);
      g.strokeCircle(t.x, t.y, sl.radius);
      paintLayer(g, tint, sl.dabs.map((d) => ({
        x: t.x + d.dx, y: t.y + d.dy, px: t.x + d.pdx, py: t.y + d.pdy, linked: d.linked, w: SHAPE_DAB_R * 2, kind: d.kind,
      })), flick);
      // Two eyes painted on wherever the middle is — it is still somebody in there.
      g.fillStyle(tint(PNT.white), flick);
      g.fillCircle(t.x - 5, t.y - 3, 3);
      g.fillCircle(t.x + 5, t.y - 3, 3);
      g.fillStyle(tint(PNT.black), flick);
      g.fillCircle(t.x - 4.4, t.y - 2.6, 1.5);
      g.fillCircle(t.x + 5.6, t.y - 2.6, 1.5);
    }
  }

  /** Above the fighters: the bot's little easel while it paints a Still Life. */
  private paintAir(): void {
    const g = this.airGfx;
    if (!g) return;
    g.clear();
    for (const owner of OWNERS) {
      const s = this.side(owner);
      const draw = s.stillDraw ?? s.mpDraw;
      if (!draw) continue;
      const f = this.fighter(owner);
      if (!this.alive(f)) continue;
      const tint = this.col(owner);
      const x = f.x;
      const y = f.y - 62;
      const size = 44;
      g.lineStyle(2, tint(PNT.wood), 1);
      g.lineBetween(x - 14, y + size / 2 + 12, x - 6, y - size / 2);
      g.lineBetween(x + 14, y + size / 2 + 12, x + 6, y - size / 2);
      g.fillStyle(tint(PNT.woodDark), 1);
      g.fillRect(x - size / 2 - 2, y - size / 2 - 2, size + 4, size + 4);
      g.fillStyle(tint(PNT.canvas), 1);
      g.fillRect(x - size / 2, y - size / 2, size, size);
      const prog = Phaser.Math.Clamp(1 - (draw.until - this.now) / draw.total, 0, 1);
      const shown = Math.floor(draw.pts.length * prog);
      const k = size / (draw === s.mpDraw ? MP_CANVAS_W : CANVAS_PX);
      const bw = draw === s.mpDraw ? MP_BRUSH / this.mpScale() * k : SHAPE_DAB_R * 2 / CANVAS_SCALE * k;
      paintLayer(g, tint, this.canvasSegs(draw.pts.slice(0, shown), x, y, k, Math.max(1.5, bw)));
    }
  }

  /** Yin-Yang paint on the bars, and the opponent's tray while there is a reason to show it. */
  private paintBars(): void {
    const g = this.barGfx;
    if (!g) return;
    g.clear();
    const now = this.now;
    const showStrip = this.stripShown();
    const strip = this.api.isInvasion ? [] : this.stripBars();
    // The opponent's tray: plates with live cooldown fills, so the painter can see what to slow.
    let li = 0;
    if (showStrip) {
      const npc = this.api.npc;
      const bars = this.api.isInvasion ? [this.hordeBar()] : strip;
      bars.forEach((r, i) => {
        g.fillStyle(0x000000, 0.45);
        g.fillRoundedRect(r.x + 2, r.y + 3, r.w, r.h, 5);
        g.fillStyle(0x24202c, 0.92);
        g.fillRoundedRect(r.x, r.y, r.w, r.h, 5);
        const ratio = r.abilityId && npc ? npc.getCooldownRatio(r.abilityId) : 1;
        g.fillStyle(this.api.isInvasion ? 0x9b3b3b : 0x5a6a8a, 0.75);
        g.fillRoundedRect(r.x + 2, r.y + 2, Math.max(0, (r.w - 4) * ratio), r.h - 4, 4);
        g.lineStyle(1.5, 0xd8cbb0, 0.8);
        g.strokeRoundedRect(r.x, r.y, r.w, r.h, 5);
        let label = this.stripLabels[li];
        if (!label) {
          label = this.api.scene.add.text(0, 0, '', {
            fontSize: '9px', fontFamily: FONT_DISPLAY, color: '#f3ead6', stroke: '#14121a', strokeThickness: 3,
          }).setOrigin(0.5).setDepth(25);
          this.stripLabels[li] = label;
        }
        const ab = npc?.element?.abilities[i];
        label.setText(this.api.isInvasion ? 'THE HORDE' : `${ab?.displayKey ?? ''} ${ab?.name ?? ''}`.trim().slice(0, 18));
        label.setPosition(r.x + r.w / 2, r.y + r.h / 2).setVisible(true);
        li++;
        if (i === 0) yinYang(g, (c) => c, r.x - 14, r.y + r.h / 2, 8, 0.9, this.vizT);
      });
    }
    for (let i = li; i < this.stripLabels.length; i++) this.stripLabels[i].setVisible(false);

    const draw = (list: BarDab[], bars: BarRect[], kind: PaintKind, tint: PaintColorFn) => {
      // One flat coat per bar set, so overlapping dabs never pile up darker; it fades as a whole.
      const segs: PaintSeg[] = [];
      let newest = 0;
      for (const d of list) {
        const r = bars[d.slot];
        if (!r) continue;
        const x = r.x + d.u * r.w;
        const y = r.y + d.v * r.h;
        segs.push({ x, y, px: x, py: y, linked: false, w: YY_DAB_R * 2, kind });
        newest = Math.max(newest, d.until);
      }
      paintLayer(g, tint, segs, Phaser.Math.Clamp((newest - now) / 3000, 0, 1) * 0.9);
    };
    const ps = this.sides.player;
    const ns = this.sides.npc;
    draw(ps.yyOwn, this.hudBars(), 'white', this.pcol);
    draw(ns.yyFoe, this.hudBars(), 'black', this.ncol);
    if (showStrip) {
      draw(ps.yyFoe, this.api.isInvasion ? [this.hordeBar()] : strip, 'black', this.pcol);
      draw(ns.yyOwn, strip, 'white', this.ncol);
    }
    // The cursor ring while the player is painting bars.
    if (ps.session?.role === 'yy') {
      yinYang(g, this.pcol, this.aimX, this.aimY, 6, 0.85, this.vizT * 3);
      paintRing(g, this.pcol, this.aimX, this.aimY, YY_DAB_R + 3, 1.2, this.holding ? 'white' : 'black', 0.8, 9, this.vizT);
    }
  }

  /**
   * The palette in the corner: the brush in hand, a thumbnail of the Splotch shape, and what
   * the right mouse button does.
   */
  private paintHud(playerIs: boolean): void {
    const g = this.hudGfx;
    if (!g) return;
    g.clear();
    if (!playerIs) { this.hudLabel?.setVisible(false); return; }
    const s = this.sides.player;
    const P = this.pcol;
    const x = this.left + 2;
    const y = this.top + 2;
    const W = 190, H = 50;
    g.fillStyle(0x000000, 0.4);
    g.fillRoundedRect(x + 2, y + 3, W, H, 10);
    g.fillStyle(P(PNT.woodDark), 1);
    g.fillRoundedRect(x, y, W, H, 10);
    g.fillStyle(P(PNT.woodLit), 1);
    g.fillRoundedRect(x + 2, y + 2, W - 4, H - 4, 9);
    g.fillStyle(P(PNT.wood), 0.5);
    for (let i = 0; i < 3; i++) g.fillRect(x + 10 + i * 58, y + 6, 30, 1);
    // Wells.
    const wells: PaintKind[] = ['red', 'blue', 'green', 'orange', 'congeal'];
    wells.forEach((k, i) => paintDab(g, P, x + 64 + i * 13, y + H - 9, 4, k, 1, i * 5 + 2));
    // The Splotch thumbnail, in a little frame.
    const fx = x + 30, fy = y + 25;
    g.fillStyle(P(PNT.woodDark), 1);
    g.fillRect(fx - 20, fy - 20, 40, 40);
    g.fillStyle(P(PNT.canvas), 1);
    g.fillRect(fx - 18, fy - 18, 36, 36);
    const sh = s.shape;
    const k = Math.min(1, 15 / Math.max(1, sh.reach));
    for (const d of sh.dabs) paintDab(g, P, fx + d.f * k, fy + d.l * k, Math.max(1.2, SHAPE_DAB_R * k), d.kind, 1, d.seed);
    paintBrush(g, P, x + W - 22, y + 24, -0.7, 34, this.heldPaint('player'), 1);

    if (!this.hudLabel) {
      this.hudLabel = this.api.scene.add.text(x + 56, y + 6, '', {
        fontSize: '10px', fontFamily: FONT_DISPLAY, color: '#f3ead6', stroke: '#2a1a0e', strokeThickness: 3, lineSpacing: -1,
      }).setDepth(21).setScrollFactor(0);
    }
    const held = this.heldPaint('player');
    let line1 = 'PAINT';
    let line2 = 'RMB · SPLOTCH CANVAS';
    if (this.canvas) {
      line1 = this.canvas.mode === 'brush' ? 'SPLOTCH CANVAS' : this.canvas.mode === 'mp' ? `MASTERPIECE · ${held.toUpperCase()}` : 'STILL LIFE';
      line2 = this.canvas.mode === 'mp' ? 'E/R/F · RMB UNVEIL' : 'RMB · DONE';
    } else if (s.mpOn) { line1 = 'MASTERPIECE'; line2 = 'UNTOUCHABLE'; }
    else if (s.session?.role === 'yy') { line1 = 'YIN-YANG'; line2 = 'HOLD LMB ON THE BARS'; }
    else if (s.session) { line1 = s.session.role === 'orange' ? 'VOLATILE ORANGE' : `WALL · ${held.toUpperCase()}`; line2 = 'MOVE THE MOUSE'; }
    this.hudLabel.setVisible(true).setText(`${line1}\n${line2}`).setColor(held === 'black' ? '#f3ead6' : this.hex(PAINT_TONE[held]));
  }

  /** The player's canvas: an easel, the sheet, the paint so far, the swatches and two buttons. */
  private paintCanvas(): void {
    const g = this.uiGfx;
    const c = this.canvas;
    if (!g || !c) return;
    g.clear();
    const P = this.pcol;
    const { x, y, w, h } = this.canvasGeom();
    const hw = w / 2;
    const hh = h / 2;
    const brush = c.mode === 'brush';
    if (brush) {
      g.fillStyle(0x0b0910, 0.38);
      g.fillRect(0, 0, this.api.width, this.api.height);
    }
    // Easel legs and the board.
    g.fillStyle(P(PNT.woodDark), 1);
    g.fillRect(x - hw - 16, y - hh - 34, w + 32, h + 120);
    g.fillStyle(P(PNT.wood), 1);
    g.fillRect(x - hw - 12, y - hh - 30, w + 24, h + 112);
    g.fillStyle(P(PNT.woodLit), 0.6);
    g.fillRect(x - hw - 12, y - hh - 30, w + 24, 2);
    // The sheet.
    g.fillStyle(P(PNT.canvasDeep), 1);
    g.fillRect(x - hw - 2, y - hh - 2, w + 4, h + 4);
    g.fillStyle(P(PNT.canvas), brush ? 1 : 0.93);
    g.fillRect(x - hw, y - hh, w, h);
    g.lineStyle(1, P(PNT.canvasDeep), 0.4);
    for (let i = 1; i < 4; i++) {
      g.lineBetween(x - hw + (w * i) / 4, y - hh, x - hw + (w * i) / 4, y + hh);
      g.lineBetween(x - hw, y - hh + (h * i) / 4, x + hw, y - hh + (h * i) / 4);
    }
    if (brush) {
      // Which way the shot flies.
      g.lineStyle(2, P(PNT.rose), 0.5);
      g.lineBetween(x + hw - 44, y + hh - 12, x + hw - 12, y + hh - 12);
      g.fillStyle(P(PNT.rose), 0.5);
      g.fillTriangle(x + hw - 12, y + hh - 17, x + hw - 12, y + hh - 7, x + hw - 4, y + hh - 12);
    }
    const mp = c.mode === 'mp';
    const mk = this.mpScale();
    if (mp) {
      // The sheet is a map of the arena: you and every enemy, where you stand right now.
      const W2 = this.api.width / 2;
      const H2 = this.api.height / 2;
      const p = this.api.player;
      const px = x + (p.x - W2) / mk;
      const py = y + (p.y - H2) / mk;
      g.lineStyle(2, P(PNT.rose), 0.85);
      g.strokeCircle(px, py, 6);
      g.lineBetween(px - 10, py, px - 4, py);
      g.lineBetween(px + 4, py, px + 10, py);
      for (const t of this.targetsOf('player')) {
        const ex = x + (t.x - W2) / mk;
        const ey = y + (t.y - H2) / mk;
        const er = Math.max(4, this.bodyR(t) / mk);
        g.fillStyle(0x3c4254, 0.75);
        g.fillCircle(ex, ey, er);
        g.lineStyle(1.5, 0x11131b, 0.8);
        g.strokeCircle(ex, ey, er);
      }
    }
    // The paint.
    // Brush width on the sheet is exactly what it will be on the floor, scaled down.
    const bw = mp ? MP_BRUSH / mk : SHAPE_DAB_R * 2 / CANVAS_SCALE;
    const r = bw / 2;
    paintLayer(g, P, this.canvasSegs(c.pts, x, y, 1, bw));
    // The brush under the mouse.
    const mx = this.aimX - x;
    const my = this.aimY - y;
    if (Math.abs(mx) <= hw && Math.abs(my) <= hh) {
      g.lineStyle(1.5, P(PAINT_TONE[c.kind]), 0.8);
      g.strokeCircle(this.aimX, this.aimY, r);
    }
    // Ink.
    const ink = this.canvasInk(c);
    const used = c.pts.length / ink;
    const inkY = y + hh + 10;
    g.fillStyle(P(PNT.woodDark), 1);
    g.fillRect(x - hw, inkY - 3, w, 6);
    g.fillStyle(P(used > 0.85 ? PNT.red : PNT.rose), 1);
    g.fillRect(x - hw, inkY - 3, w * (1 - used), 6);
    // Swatches.
    const btn = this.canvasButtons();
    const pal = this.canvasPalette();
    btn.swatches.forEach((sw, i) => {
      g.fillStyle(P(PNT.woodDark), 1);
      g.fillCircle(sw.x, sw.y, 13);
      if (sw.open) paintDab(g, P, sw.x, sw.y, 9, sw.kind, 1, i * 9 + 1);
      else {
        g.fillStyle(0x5a5560, 1);
        g.fillCircle(sw.x, sw.y, 9);
        g.lineStyle(1.5, 0x2a2730, 1);
        g.lineBetween(sw.x - 5, sw.y - 5, sw.x + 5, sw.y + 5);
      }
      if (c.kind === sw.kind) {
        g.lineStyle(2, P(PNT.spark), 1);
        g.strokeCircle(sw.x, sw.y, 14);
      }
      void pal;
    });
    // Buttons.
    for (const rect of [btn.clear, btn.done]) {
      g.fillStyle(P(PNT.woodDark), 1);
      g.fillRoundedRect(rect.x, rect.y, rect.width, rect.height, 5);
      g.fillStyle(P(rect === btn.done ? PNT.rose : PNT.canvasDeep), 1);
      g.fillRoundedRect(rect.x + 2, rect.y + 2, rect.width - 4, rect.height - 4, 4);
    }
    // Still Life's and the Masterpiece's clock, as a strip of paint running out along the top.
    if (!brush) {
      const left = Phaser.Math.Clamp((c.until - this.now) / c.total, 0, 1);
      g.fillStyle(P(PNT.red), 1);
      g.fillRect(x - hw, y - hh - 10, w * left, 4);
    }
    const [title, clearLbl, doneLbl, hint] = this.uiTexts;
    const secs = Math.max(0, (c.until - this.now) / 1000).toFixed(1);
    title?.setPosition(x, y - hh - 20).setText(
      brush ? 'SPLOTCH — what you paint is what you throw'
        : mp ? `MASTERPIECE — ${secs}s · the sheet is the arena` : `STILL LIFE — ${secs}s`,
    );
    clearLbl?.setPosition(btn.clear.centerX, btn.clear.centerY);
    doneLbl?.setPosition(btn.done.centerX, btn.done.centerY);
    const unlocked = pal.some((p) => p.kind !== 'black' && p.open);
    hint?.setPosition(x, btn.clear.centerY + 22).setText(
      mp ? 'E red · R blue · F green · RMB unveil'
        : unlocked ? 'Q black · E red · R blue · F green · RMB done' : 'Q black · RMB done',
    );
  }

  // ── Status tray ────────────────────────────────────────────────────────────

  private pushStatuses(playerIs: boolean): void {
    const s = this.sides.player;
    const p = this.api.player;
    this.api.setStatusIndicator('paint-masterpiece', playerIs && s.mpOn ? {
      name: 'Masterpiece', emoji: '🎨', color: PNT.rose,
      description: 'Untouchable while it lasts. Paint on the canvas, then unveil it onto the floor around you: red burns them, blue speeds you and your cooldowns, green heals you and hardens you.',
      until: s.mpUntil, priority: 100,
    } : null);
    this.api.setStatusIndicator('paint-mp-blue', playerIs && s.onMpBlue ? {
      name: 'Blue Paint', emoji: '💨', color: PNT.blue,
      description: `On your own blue — ${Math.round((MP_BLUE_SPEED - 1) * 100)}% faster, and your cooldowns run ${Math.round(MP_BLUE_CD_RATE * 100)}% quicker.`,
      priority: 122,
    } : null);
    this.api.setStatusIndicator('paint-mp-green', playerIs && (s.onMpGreen || s.onWallGreen) ? {
      name: 'Green Paint', emoji: '💚', color: PNT.green,
      description: s.onMpGreen
        ? `On your own green — ${MP_GREEN_HPS} HP a second and ${Math.round((1 - MP_GREEN_RESIST) * 100)}% less damage taken.`
        : `Leaning on your green wall — ${WALL_GREEN_HPS} HP a second.`,
      priority: 123,
    } : null);
    this.api.setStatusIndicator('paint-haste', playerIs && this.now < s.hasteUntil ? {
      name: 'Blue Wall', emoji: '🧱', color: PNT.blue,
      description: `Your blue wall has you moving ${Math.round((WALL_BLUE_MULT - 1) * 100)}% faster.`,
      until: s.hasteUntil, priority: 121,
    } : null);
    const chips = this.chips.filter((c) => c.owner === 'player').length;
    this.api.setStatusIndicator('paint-chips', playerIs && chips > 0 ? {
      name: 'Paint Chips', emoji: '🐞', color: PNT.red,
      description: 'Flakes of your Masterpiece on legs. Red rush in, blue keep their distance and shoot, green ride on you and heal.',
      count: chips, priority: 108,
    } : null);
    const yyOn = this.yySlot('player') && (s.yyOwn.length > 0 || s.yyFoe.length > 0);
    this.api.setStatusIndicator('paint-yinyang', playerIs && yyOn ? {
      name: 'Yin-Yang', emoji: '☯️', color: PNT.white,
      description: 'White paint on your own bars makes those abilities recharge faster; black on theirs makes them recharge slower. It flakes off 30 seconds after it was painted.',
      priority: 102,
    } : null);

    // The victim side: whatever the opposing painter has done to the local player.
    const still = p ? this.stillOn(p) : undefined;
    this.api.setStatusIndicator('paint-still-life', still && still.owner === 'npc' ? {
      name: 'Still Life', emoji: '🖼️', color: PNT.rose,
      description: 'You have been painted into a picture — your hitbox is whatever they drew.'
        + (still.red > 0 ? ' The red parts of you take more from any shot that lands there.' : '')
        + (still.blue > 0 ? ' The blue in it slows you.' : '')
        + (still.green > 0 ? ' The green in it stops you healing and weakens your hits.' : ''),
      until: still.until, priority: 12,
    } : null);
    const slow = p ? this.slows.get(p) : undefined;
    this.api.setStatusIndicator('paint-slow', slow && this.now < slow.until ? {
      name: 'Blue Paint', emoji: '🐌', color: PNT.blue,
      description: `Splattered in blue — ${Math.round((1 - slow.mult) * 100)}% slower until it dries.`,
      until: slow.until, priority: 14,
    } : null);
    const dot = p ? this.dots.get(p) : undefined;
    this.api.setStatusIndicator('paint-dot', dot && this.now < dot.until ? {
      name: 'Green Paint', emoji: '🧪', color: PNT.green,
      description: `Splattered in green — ${dot.dps.toFixed(1)} damage a second until it dries.`,
      until: dot.until, priority: 15,
    } : null);
    const blacked = this.sides.npc.yyFoe.length > 0;
    this.api.setStatusIndicator('paint-black-bars', blacked ? {
      name: 'Black Paint', emoji: '☯️', color: PNT.black,
      description: 'Somebody painted black over your ability bars. The painted abilities recharge slower until it flakes off.',
      priority: 13,
    } : null);
  }

  // ── Online ─────────────────────────────────────────────────────────────────

  private sendBrush(): void {
    this.brushSent = true;
    const d: number[] = [];
    for (const sd of this.sides.player.shape.dabs) d.push(Math.round(sd.f * 10) / 10, Math.round(sd.l * 10) / 10, KINDS.indexOf(sd.kind));
    this.api.sendPaintMsg({ t: 'pnt', k: 'brush', d });
  }

  private flushOutbox(force: boolean): void {
    this.nextFlushAt = this.now + 100;
    if (!this.outbox.length) return;
    if (!force && this.outbox.length < 4) return;
    this.api.sendPaintMsg({ t: 'pnt', k: 'pts', d: this.outbox });
    this.outbox = [];
  }

  /** A paint message from the remote painter (already mirrored by OnlineKit). */
  handleNetMsg(msg: NetPaintMsg): void {
    const s = this.sides.npc;
    const kind = (i: number): PaintKind => KINDS[i] ?? 'black';
    switch (msg.k) {
      case 'brush': {
        const dabs: ShapeDab[] = [];
        for (let i = 0; i + 2 < msg.d.length; i += 3) dabs.push({ f: msg.d[i], l: msg.d[i + 1], kind: kind(msg.d[i + 2]), seed: i * 7.1 });
        s.shape = dabs.length ? shapeFromDabs(dabs) : defaultShape();
        break;
      }
      case 'pts': {
        for (let i = 0; i + 3 < msg.d.length; i += 4) {
          const q = { x: msg.d[i], y: msg.d[i + 1], kind: kind(msg.d[i + 2]), linked: msg.d[i + 3] === 1 };
          if (s.session?.remote) this.layRemote('npc', q.x, q.y, q.kind, q.linked);
          else if (s.netQueue.length < 300) s.netQueue.push(q);
        }
        break;
      }
      case 'end':
        if (s.session?.remote) this.closeSession('npc');
        s.netQueue = [];
        break;
      case 'still': {
        const dabs: StillDab[] = [];
        for (let i = 0; i + 3 < msg.d.length; i += 4) {
          const prev = dabs[dabs.length - 1];
          const dx = msg.d[i];
          const dy = msg.d[i + 1];
          dabs.push({ dx, dy, pdx: prev ? prev.dx : dx, pdy: prev ? prev.dy : dy, linked: msg.d[i + 3] === 1 && !!prev, kind: kind(msg.d[i + 2]), seed: i * 5.3 });
        }
        if (this.alive(this.api.player)) this.transform('npc', this.api.player, dabs);
        break;
      }
      case 'yy': {
        const until = this.now + YY_LIFE_MS;
        const unpack = (d: number[]) => {
          const out: BarDab[] = [];
          for (let i = 0; i + 2 < d.length; i += 3) out.push({ slot: d[i], u: d[i + 1] / 100, v: d[i + 2] / 100, until, seed: i * 3.7 });
          return out;
        };
        s.yyOwn = unpack(msg.own);
        s.yyFoe = unpack(msg.foe);
        break;
      }
      default:
        break;
    }
  }

  // ── Accessors read by ArenaScene / the NPC ─────────────────────────────────

  /** True while a side has its hands full — a window, a Masterpiece or a picture in progress. */
  isBusy(owner: Owner): boolean {
    const s = this.side(owner);
    return !!s.session || s.mpOn || !!s.stillDraw || !!s.mpDraw || (owner === 'player' && !!this.canvas);
  }

  isMasterpieceActive(owner: Owner): boolean { return this.side(owner).mpOn; }

  /** Bot synergy: the player is the bot's Still Life right now — big and maybe slowed. */
  npcTargetStilled(): boolean {
    const sl = this.stillOn(this.api.player);
    return !!sl && sl.owner === 'npc';
  }

  /** Bot synergy: how many hostile shots are bearing down on the bot — worth a wall. */
  npcShotsIncoming(): number {
    const npc = this.api.npc;
    if (!this.alive(npc)) return 0;
    let n = 0;
    for (const child of this.api.projectiles.getChildren()) {
      const proj = child as Projectile;
      if (!proj.active || !proj.isFromPlayer) continue;
      const b = proj.body as Phaser.Physics.Arcade.Body | null;
      if (!b) continue;
      const dx = npc.x - proj.x;
      const dy = npc.y - proj.y;
      const d = Math.hypot(dx, dy);
      if (d > 320) continue;
      const sp = Math.hypot(b.velocity.x, b.velocity.y) || 1;
      if ((dx * b.velocity.x + dy * b.velocity.y) / (d * sp) > 0.85) n++;
    }
    for (const sp of this.splotches) {
      if (sp.owner !== 'player') continue;
      const d = Phaser.Math.Distance.Between(sp.x, sp.y, npc.x, npc.y);
      if (d < 260) n++;
    }
    return n;
  }

  npcYinYangSlot(): Slot | null { return this.yySlot('npc'); }

  /** Ruin's Spikes of Ruin: Paint Chips are the only thing Paint summons. */
  purgeSummons(
    x: number, y: number, radius: number, exceptOwner: 'player' | 'npc',
    report?: (px: number, py: number) => void,
  ): number {
    let razed = 0;
    for (let i = this.chips.length - 1; i >= 0; i--) {
      const c = this.chips[i];
      if (c.owner === exceptOwner) continue;
      if (Phaser.Math.Distance.Between(x, y, c.x, c.y) > radius) continue;
      report?.(c.x, c.y);
      this.fx(c.owner).flecks(c.x, c.y, 5, 14, c.kind, 360);
      this.chips.splice(i, 1);
      razed++;
    }
    return razed;
  }

  /**
   * Ability tray fill. Paint's cards often show a window counting down, a picture in progress
   * or a Masterpiece's clock rather than a cooldown.
   */
  getBarRatio(abilityId: string, time: number): number {
    const s = this.sides.player;
    const p = this.api.player;
    if (abilityId === 'yin-yang') {
      if (s.session?.role === 'yy') return Phaser.Math.Clamp((s.session.until - time) / s.session.total, 0, 1);
      return Phaser.Math.Clamp((time - s.yyCastAt) / YY_COOLDOWN_MS, 0, 1);
    }
    if (abilityId === 'paint-still-life' && this.canvas?.mode === 'still') {
      return Phaser.Math.Clamp((this.canvas.until - time) / this.canvas.total, 0, 1);
    }
    if (abilityId === 'paint-masterpiece' && s.mpOn) return Phaser.Math.Clamp((s.mpUntil - time) / MP_MS, 0, 1);
    const sess = s.session;
    if (sess && ((abilityId === 'paint-orange' && sess.role === 'orange') || (abilityId === 'paint-congeal' && sess.role === 'wall'))) {
      return Phaser.Math.Clamp((sess.until - time) / sess.total, 0, 1);
    }
    return p.getCooldownRatio(abilityId);
  }
}
