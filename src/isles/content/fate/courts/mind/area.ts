import type { AreaDef, AreaPainter, Pt, Rect, Solid } from '../../../../IslesTypes';
import { flagstones, glow, lit, tree, type G } from '../../../../art/IsleArt';
import {
  arbiterChair, baizeLawn, balustrade, billKiosk, chequerRoad, crystalBall, deepThink, deepThinkEyeOpen, eye,
  gamingLamp, livingPiece, mindWaystone, planchette, playhouse, readingBooth, seanceParlour, seanceWellKerb,
  spiralDisc, spiritBoard, suitTopiary, thoughtExchange, wellHoop, type ParlourOpts, type PieceKind, type Suit,
} from './art';
import {
  BAIZE_DARK, BAIZE_DEEP, BAIZE_LIT, CANDLE, CARD_RED, CRYSTAL, EBONY, GILT, GILT_DARK, GILT_LIT, IVORY, LAMP_GREEN,
  MIND, MIND_COLOR, MIND_LIT, SEA, SEA_LIT, STONE, STONE_DARK, VELVET, WELL, WELL_DEEP, WELL_LIT, WOOD, WOOD_DARK,
} from './palette';
import { MIND_CROWD, MIND_NPCS } from './npcs';

/**
 * The Mind Court — the mentalists' town, last stop on the Tosswater road before the sea wall.
 *
 * Read it from the Tosswater road in:
 * • **the west road** comes in through the suit-hedges past the waystone, with Orsola Glass's
 *   crystal stall and a lawn of clipped spades and hearts to the south of it;
 * • **the Plaza Board** at the heart: an eight-by-eight chessboard let into the paving, its
 *   pieces played by the busted in tall piece-hats, the Arbiter's chair at its corner;
 * • **the Swoon Playhouse** (north-west), its spiral turning over the marquee;
 * • **the north road** to the Remembrance Court, and off it **the Deep Think** (north-east),
 *   Prince Gambit's chequered tower with a crystal ball on its roof in a gilt claw;
 * • **the booth road** (east), where bets are read under green lamps;
 * • **Séance Row** (south): parlours with their curtains drawn, the spirit board laid out on
 *   the lane's south side, **the Thought Exchange** at the lane's east end, and **the séance
 *   well** beside the sea wall, where the drowned's last thoughts settle.
 */

export const MIND_W = 2400;
export const MIND_H = 1600;

const ROAD_Y = 760; // the west and booth roads: y ROAD_Y..ROAD_Y+80
const NORTH_X = 1160; // the north and south roads: x NORTH_X..NORTH_X+80
const LANE: Rect = { x: 200, y: 1290, w: 2000, h: 70 };

/** The Plaza Board: 8×8 squares of 60. */
export const BOARD: Rect = { x: 960, y: 580, w: 480, h: 480 };
const SQ = 60;
const APRON: Rect = { x: 920, y: 540, w: 560, h: 560 };
/** The white king's starting square (e1): fourth file, near rank. */
export const BOARD_KING_SQUARE: Pt = { x: BOARD.x + 4 * SQ + SQ / 2, y: BOARD.y + 7 * SQ + SQ / 2 };
/** The spirit board laid out on Séance Row's south side. */
export const SPIRIT_BOARD: Pt = { x: 640, y: 1440 };
/** The séance well: the court's fishing water. */
export const SEANCE_WELL: Rect = { x: 1400, y: 1400, w: 220, h: 90 };
const WELL_C: Pt = { x: SEANCE_WELL.x + SEANCE_WELL.w / 2, y: SEANCE_WELL.y + SEANCE_WELL.h / 2 };
/** Prince Gambit's Deep Think: the middle of its door step. */
export const DEEP_THINK: Pt = { x: 1800, y: 470 };
const PLAYHOUSE: Pt = { x: 560, y: 440 };
const EXCHANGE: Pt = { x: 1910, y: 1180 };

type Piece = NonNullable<AreaPainter['pieces']>[number];
const pieces: Piece[] = [];
const solids: Solid[] = [];
/** Lit windows and lamps that flicker in `animate`. */
const lamps: Pt[] = [];
const balls: { x: number; y: number; r: number }[] = [];

function addPiece(x: number, y: number, w: number, h: number, draw: (g: G, rng: () => number) => void, solid?: Solid, when?: Piece['when']): void {
  pieces.push(when ? { x, y, w, h, draw, when } : { x, y, w, h, draw });
  if (solid) solids.push(solid);
}

// ── Layout ───────────────────────────────────────────────────────────

// The Deep Think, its eye opening once the Prince has fallen.
addPiece(DEEP_THINK.x, DEEP_THINK.y, 460, 500, (g) => deepThink(g, DEEP_THINK.x, DEEP_THINK.y, 380, 250),
  { kind: 'rect', x: DEEP_THINK.x - 196, y: DEEP_THINK.y - 36, w: 392, h: 36 });
addPiece(DEEP_THINK.x, DEEP_THINK.y + 1, 80, 300, (g) => deepThinkEyeOpen(g, DEEP_THINK.x, DEEP_THINK.y, 380, 250), undefined, { prince: 'gambit' });

// The Swoon Playhouse and its playbill kiosk.
addPiece(PLAYHOUSE.x, PLAYHOUSE.y, 420, 300, (g) => playhouse(g, PLAYHOUSE.x, PLAYHOUSE.y, 380, 230),
  { kind: 'rect', x: PLAYHOUSE.x - 186, y: PLAYHOUSE.y - 32, w: 372, h: 32 });
addPiece(700, 600, 50, 110, (g, rng) => billKiosk(g, 700, 600, rng), { kind: 'circle', x: 700, y: 594, r: 17 });
addPiece(1060, 1200, 50, 110, (g, rng) => billKiosk(g, 1060, 1200, rng), { kind: 'circle', x: 1060, y: 1194, r: 17 });

// The Thought Exchange at the east end of Séance Row.
addPiece(EXCHANGE.x, EXCHANGE.y, 480, 420, (g, rng) => thoughtExchange(g, EXCHANGE.x, EXCHANGE.y, 420, 210, rng),
  { kind: 'rect', x: EXCHANGE.x - 222, y: EXCHANGE.y - 34, w: 444, h: 34 });

// Séance Row: parlours along the lane's north side.
const PARLOURS: [number, ParlourOpts][] = [
  [320, { wall: 0xc9a0a4, curtain: VELVET, door: 0x3a1e4a, sign: 'eye' }],
  [500, { wall: 0xe0d4b8, curtain: CARD_RED, door: 0x4a1a20, sign: 'hand' }],
  [680, { wall: 0x9fb4a0, curtain: VELVET, door: 0x23352a, sign: 'moon' }],
  [860, { wall: 0x8e9cb8, curtain: 0x8a2a3a, door: 0x242a40, sign: 'card' }],
  [1360, { wall: 0xd8c09a, curtain: VELVET, door: 0x402418, sign: 'moon' }],
  [1530, { wall: 0xb4a0c0, curtain: LAMP_GREEN, door: 0x2a1a3a, sign: 'eye' }],
];
for (const [x, o] of PARLOURS) {
  addPiece(x, 1270, 180, 290, (g, rng) => seanceParlour(g, x, 1270, 150, 200, o, rng), { kind: 'rect', x: x - 78, y: 1242, w: 156, h: 28 });
  balls.push({ x: x - 27, y: 1270 - 100 + 37, r: 9 });
}

// The reading booths along the booth road.
for (const [x, stripe] of [[1580, LAMP_GREEN], [2180, CARD_RED]] as [number, number][]) {
  addPiece(x, 745, 140, 130, (g, rng) => readingBooth(g, x, 745, stripe, rng), { kind: 'rect', x: x - 56, y: 722, w: 112, h: 23 });
  lamps.push({ x, y: 745 - 50 });
}

// The Arbiter's chair at the board's north-east corner.
addPiece(1525, 590, 60, 170, (g) => arbiterChair(g, 1525, 590), { kind: 'circle', x: 1525, y: 584, r: 18 });

// Orsola Glass's crystal stall on the west lawn.
addPiece(430, 975, 160, 140, (g) => crystalStall(g, 430, 975), { kind: 'rect', x: 368, y: 953, w: 124, h: 22 });

// The waystone by the west road.
addPiece(210, 900, 60, 100, (g) => mindWaystone(g, 210, 900), { kind: 'circle', x: 210, y: 894, r: 18 });

// The séance well's hoop, behind the basin.
addPiece(WELL_C.x, SEANCE_WELL.y + 6, 240, 210, (g) => wellHoop(g, WELL_C.x, SEANCE_WELL.y + 6, SEANCE_WELL.w / 2));
solids.push({ kind: 'rect', x: SEANCE_WELL.x - 10, y: SEANCE_WELL.y - 8, w: SEANCE_WELL.w + 20, h: SEANCE_WELL.h + 16 });

// Gaming lamps along the roads.
const LAMPS: Pt[] = [
  { x: 160, y: 752 }, { x: 420, y: 752 }, { x: 760, y: 752 }, { x: 1700, y: 752 }, { x: 1980, y: 752 }, { x: 2320, y: 752 },
  { x: 1150, y: 220 }, { x: 1150, y: 420 }, { x: 1252, y: 1180 }, { x: 260, y: 1282 }, { x: 1100, y: 1282 },
  { x: 1700, y: 1376 }, { x: 2160, y: 1376 }, { x: 920, y: 1376 },
];
for (const l of LAMPS) {
  addPiece(l.x, l.y, 40, 100, (g) => gamingLamp(g, l.x, l.y), { kind: 'circle', x: l.x, y: l.y - 3, r: 6 });
  lamps.push({ x: l.x + 14, y: l.y - 66 });
}

// Suit topiary: a lawn of clipped suits south of the west road, and a walk of them north-east.
const TOPIARY: [number, number, Suit][] = [
  [110, 1050, 'spade'], [230, 1050, 'heart'], [110, 1180, 'diamond'], [230, 1180, 'club'],
  [620, 1050, 'heart'], [740, 1050, 'spade'], [620, 1170, 'club'], [740, 1170, 'diamond'],
  [2080, 230, 'spade'], [2200, 230, 'heart'], [2320, 230, 'diamond'], [2080, 640, 'club'], [2200, 640, 'spade'], [2320, 640, 'heart'],
  [960, 470, 'diamond'], [1440, 470, 'club'], [960, 1160, 'heart'], [1440, 1160, 'spade'],
];
for (const [x, y, s] of TOPIARY) addPiece(x, y, 60, 90, (g) => suitTopiary(g, x, y, s, 1), { kind: 'circle', x, y: y - 6, r: 17 });

// Crystal balls on plinths round the plaza apron.
for (const [x, y] of [[920, 540], [1480, 1100], [920, 1100]] as [number, number][]) {
  addPiece(x, y, 40, 70, (g) => { g.fillStyle(EBONY, 1); g.fillRect(x - 14, y - 10, 28, 12); crystalBall(g, x, y - 10, 12, 0); }, { kind: 'circle', x, y: y - 4, r: 14 });
  balls.push({ x, y: y - 10 - 12 * 1.55, r: 12 });
}

// Old chestnuts in the quiet north-west corner, behind the Playhouse.
for (const [x, y, s] of [[130, 250, 1.1], [260, 160, 0.9], [880, 180, 1], [990, 330, 0.85], [120, 520, 0.9], [2320, 1000, 1], [2200, 1120, 0.9]] as [number, number, number][]) {
  addPiece(x, y, 120, 160, (g, rng) => tree(g, x, y, s, 'round', BAIZE_DARK, WOOD_DARK, rng), { kind: 'circle', x, y: y - 4, r: 14 });
}

// ── Edges: suit-hedges round three sides, the sea wall to the south ──

const GAP = 80;
addPiece(600, 56, 1200, 70, (g) => hedgeWall(g, 0, 56, NORTH_X + 40 - GAP), { kind: 'rect', x: 0, y: 0, w: NORTH_X + 40 - GAP, h: 56 });
addPiece(1800, 56, 1200, 70, (g) => hedgeWall(g, NORTH_X + 40 + GAP, 56, MIND_W - (NORTH_X + 40 + GAP)), { kind: 'rect', x: NORTH_X + 40 + GAP, y: 0, w: MIND_W - (NORTH_X + 40 + GAP), h: 56 });
solids.push({ kind: 'rect', x: 0, y: 0, w: 36, h: ROAD_Y + 40 - GAP });
solids.push({ kind: 'rect', x: 0, y: ROAD_Y + 40 + GAP, w: 36, h: MIND_H - (ROAD_Y + 40 + GAP) });
solids.push({ kind: 'rect', x: MIND_W - 36, y: 0, w: 36, h: MIND_H });
addPiece(MIND_W / 2, 1530, MIND_W, 60, (g) => balustrade(g, 0, MIND_W, 1530), { kind: 'rect', x: 0, y: 1505, w: MIND_W, h: 95 });

/** A low clipped hedge along the north edge, with a suit cut into its top every so often. */
function hedgeWall(g: G, x0: number, y: number, w: number): void {
  g.fillStyle(BAIZE_DEEP, 1); g.fillRect(x0, y - 44, w, 46);
  g.fillStyle(BAIZE_DARK, 1); g.fillRect(x0, y - 48, w, 38);
  g.fillStyle(BAIZE_LIT, 0.4); g.fillRect(x0, y - 48, w, 5);
  for (let x = x0 + 60; x < x0 + w - 30; x += 160) {
    const s = (['spade', 'heart', 'diamond', 'club'] as Suit[])[Math.floor(x / 160) % 4];
    suitTopiary(g, x, y - 34, s, 0.6);
  }
}

/** Orsola's stall: a velvet-draped counter, tiers of crystal balls, a striped awning, a lens sign. */
function crystalStall(g: G, x: number, y: number): void {
  g.fillStyle(0x000000, 0.3); g.fillEllipse(x, y + 2, 150, 24);
  // Counter.
  g.fillStyle(WOOD_DARK, 1); g.fillRect(x - 62, y - 34, 124, 34);
  g.fillStyle(VELVET, 1); g.fillRect(x - 64, y - 40, 128, 12);
  for (let k = 0; k < 13; k++) { g.fillStyle(GILT, 1); g.fillCircle(x - 60 + k * 10, y - 27, 1.6); }
  // Tiers of balls behind the counter, small to large.
  for (let k = 0; k < 5; k++) crystalBall(g, x - 48 + k * 24, y - 40, 6 + (k % 2) * 2, k);
  g.fillStyle(WOOD, 1); g.fillRect(x - 56, y - 72, 112, 5);
  for (let k = 0; k < 4; k++) crystalBall(g, x - 36 + k * 24, y - 72, 7, k + 3);
  // Awning and posts.
  for (const k of [-1, 1]) { g.fillStyle(WOOD_DARK, 1); g.fillRect(x + k * 64 - 2, y - 112, 4, 112); }
  for (let i = 0; i < 9; i++) {
    const sx = x - 70 + i * 15.5;
    g.fillStyle(i % 2 ? VELVET : IVORY, 1); g.fillRect(sx, y - 118, 15.5, 12);
    g.fillTriangle(sx, y - 106, sx + 15.5, y - 106, sx + 7.75, y - 98);
  }
  // A big lens on a bracket over it, an eye painted on the glass.
  g.lineStyle(2, GILT_DARK, 1); g.lineBetween(x + 64, y - 118, x + 84, y - 130);
  g.fillStyle(GILT, 1); g.fillCircle(x + 88, y - 134, 14);
  g.fillStyle(CRYSTAL, 0.8); g.fillCircle(x + 88, y - 134, 11);
  eye(g, x + 88, y - 134, 8, GILT_DARK, MIND);
}

// ── Painter ──────────────────────────────────────────────────────────

const inView = (x: number, y: number, v: Rect, m = 160): boolean =>
  x > v.x - m && x < v.x + v.w + m && y > v.y - m && y < v.y + v.h + m;

// The living game on the Plaza Board: an opening, played out a move every few seconds, then reset.
interface Man { kind: PieceKind; white: boolean; c: number; r: number; alive: boolean }
const BACK: PieceKind[] = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];
function opening(): Man[] {
  const m: Man[] = [];
  for (let c = 0; c < 8; c++) {
    m.push({ kind: BACK[c], white: false, c, r: 0, alive: true }, { kind: 'pawn', white: false, c, r: 1, alive: true });
    m.push({ kind: 'pawn', white: true, c, r: 6, alive: true }, { kind: BACK[c], white: true, c, r: 7, alive: true });
  }
  return m;
}
/** e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d4 exd4 — the Prince's favourite, the Italian. */
const MOVES: [number, number, number, number][] = [
  [4, 6, 4, 4], [4, 1, 4, 3], [6, 7, 5, 5], [1, 0, 2, 2], [5, 7, 2, 4], [5, 0, 2, 3], [2, 6, 2, 5], [6, 0, 5, 2], [3, 6, 3, 4], [4, 3, 3, 4],
];
const SNAPSHOTS: Man[][] = (() => {
  const out: Man[][] = [opening()];
  for (const [fc, fr, tc, tr] of MOVES) {
    const s = out[out.length - 1].map((p) => ({ ...p }));
    for (const p of s) if (p.alive && p.c === tc && p.r === tr) p.alive = false;
    const mover = s.find((p) => p.alive && p.c === fc && p.r === fr);
    if (mover) { mover.c = tc; mover.r = tr; }
    out.push(s);
  }
  return out;
})();
const MOVE_S = 3.6;
const GLIDE_S = 1.3;
const sqX = (c: number) => BOARD.x + c * SQ + SQ / 2;
const sqY = (r: number) => BOARD.y + r * SQ + SQ / 2 + 14;

const painter: AreaPainter = {
  ground(g, rng) {
    const W = MIND_W, H = MIND_H;
    baizeLawn(g, 0, 0, W, H, rng);
    // The sea below the wall.
    g.fillStyle(SEA, 1); g.fillRect(0, 1530, W, H - 1530);
    for (let i = 0; i < 60; i++) { g.fillStyle(SEA_LIT, 0.4); g.fillRect(rng() * W, 1540 + rng() * 56, 18 + rng() * 30, 2); }
    // West and east edges: the hedge from above.
    for (const [x0, y0, h] of [[0, 0, ROAD_Y + 40 - GAP], [0, ROAD_Y + 40 + GAP, 1505 - (ROAD_Y + 40 + GAP)], [W - 36, 0, 1505]] as [number, number, number][]) {
      g.fillStyle(BAIZE_DEEP, 1); g.fillRect(x0, y0, 36, h);
      g.fillStyle(BAIZE_DARK, 1); g.fillRect(x0 + 4, y0, 28, h);
      g.fillStyle(BAIZE_LIT, 0.4); g.fillRect(x0 + (x0 ? 4 : 28), y0, 4, h);
    }

    // The black-and-red roads.
    chequerRoad(g, 0, ROAD_Y, APRON.x, 80);
    chequerRoad(g, APRON.x + APRON.w, ROAD_Y, W - 36 - (APRON.x + APRON.w), 80);
    chequerRoad(g, NORTH_X, 0, 80, APRON.y);
    chequerRoad(g, NORTH_X, APRON.y + APRON.h, 80, LANE.y - (APRON.y + APRON.h));
    chequerRoad(g, LANE.x, LANE.y, LANE.w, LANE.h, 35);
    chequerRoad(g, PLAYHOUSE.x - 40, PLAYHOUSE.y, 80, ROAD_Y - PLAYHOUSE.y);
    chequerRoad(g, NORTH_X + 80, DEEP_THINK.y + 20, DEEP_THINK.x + 80 - (NORTH_X + 80), 60, 30);

    // The Exchange forecourt and the well yard: dressed stone.
    flagstones(g, { x: EXCHANGE.x - 230, y: EXCHANGE.y, w: 460, h: LANE.y - EXCHANGE.y }, 30, STONE, STONE_DARK, rng);
    g.fillStyle(STONE_DARK, 1); g.fillEllipse(WELL_C.x, WELL_C.y + 6, SEANCE_WELL.w + 120, SEANCE_WELL.h + 80);
    flagstones(g, { x: WELL_C.x - 160, y: LANE.y + LANE.h, w: 320, h: 1505 - (LANE.y + LANE.h) }, 28, STONE, STONE_DARK, rng);
    // The well water and its kerb.
    g.fillStyle(WELL_DEEP, 1); g.fillEllipse(WELL_C.x, WELL_C.y, SEANCE_WELL.w, SEANCE_WELL.h);
    g.fillStyle(WELL, 1); g.fillEllipse(WELL_C.x, WELL_C.y - 4, SEANCE_WELL.w - 20, SEANCE_WELL.h - 18);
    for (let i = 0; i < 18; i++) { g.fillStyle(GILT, 0.35); g.fillCircle(WELL_C.x + (rng() - 0.5) * 160, WELL_C.y + (rng() - 0.5) * 50, 1.6); }
    seanceWellKerb(g, WELL_C.x, WELL_C.y, SEANCE_WELL.w / 2, SEANCE_WELL.h / 2);

    // The plaza apron and the board.
    flagstones(g, APRON, 40, STONE, STONE_DARK, rng);
    g.lineStyle(4, GILT_DARK, 1); g.strokeRect(BOARD.x - 10, BOARD.y - 10, BOARD.w + 20, BOARD.h + 20);
    g.fillStyle(EBONY, 1); g.fillRect(BOARD.x - 8, BOARD.y - 8, BOARD.w + 16, BOARD.h + 16);
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const k = (r + c) % 2;
        g.fillStyle(k ? 0x2a2530 : IVORY, 1); g.fillRect(BOARD.x + c * SQ, BOARD.y + r * SQ, SQ, SQ);
        g.fillStyle(0xffffff, k ? 0.03 : 0.12); g.fillRect(BOARD.x + c * SQ, BOARD.y + r * SQ, SQ, 4);
      }
    }
    g.lineStyle(2, GILT, 1); g.strokeRect(BOARD.x - 2, BOARD.y - 2, BOARD.w + 4, BOARD.h + 4);
    // Files and ranks cut into the border in gilt.
    for (let i = 0; i < 8; i++) {
      g.fillStyle(GILT, 0.8); g.fillCircle(BOARD.x + i * SQ + SQ / 2, BOARD.y + BOARD.h + 18, 2.5);
      g.fillCircle(BOARD.x - 18, BOARD.y + i * SQ + SQ / 2, 2.5);
    }
    // The white king's square is worn pale by the feet of the hopeful.
    g.fillStyle(GILT_LIT, 0.18); g.fillRect(BOARD_KING_SQUARE.x - SQ / 2 + 4, BOARD_KING_SQUARE.y - SQ / 2 + 4, SQ - 8, SQ - 8);

    // The spirit board on Séance Row.
    spiritBoard(g, SPIRIT_BOARD.x, SPIRIT_BOARD.y, 300, 110, 1, 9);

    // A ring of dropped chips round the booths, where losers sat.
    for (const x of [1580, 2180]) for (let i = 0; i < 16; i++) { g.fillStyle(rng() < 0.5 ? CARD_RED : IVORY, 0.7); g.fillEllipse(x + (rng() - 0.5) * 120, 700 + rng() * 40, 6, 3); }
    // Before the Deep Think: an inlaid eye in the paving.
    eye(g, DEEP_THINK.x, DEEP_THINK.y + 50, 22, GILT_DARK, MIND, 0.7);
  },

  pieces,

  animate(g, t, view, world) {
    // The living chess game.
    if (inView(BOARD.x + BOARD.w / 2, BOARD.y + BOARD.h / 2, view, 400)) {
      const stopped = world.test({ prince: 'gambit' });
      if (stopped) {
        // The game is over: the pieces stand about the board in twos, talking.
        SNAPSHOTS[0].forEach((p, i) => {
          const x = sqX(p.c) + Math.sin(i * 1.7) * 16, y = sqY(p.r) + (p.white ? -40 : 40) + Math.cos(i * 2.3) * 12;
          livingPiece(g, x, y, p.kind, p.white, t, i);
        });
      } else {
        const cycle = MOVES.length * MOVE_S + 5;
        const tc = t % cycle;
        const k = Math.min(MOVES.length, Math.floor(tc / MOVE_S));
        const snap = SNAPSHOTS[k];
        const glide = k < MOVES.length ? Math.min(1, (tc - k * MOVE_S) / GLIDE_S) : 0;
        const mv = k < MOVES.length ? MOVES[k] : null;
        snap.forEach((p, i) => {
          if (!p.alive) return;
          let x = sqX(p.c), y = sqY(p.r);
          let fade = 1;
          if (mv && p.c === mv[0] && p.r === mv[1]) {
            const e = glide < 0.5 ? 2 * glide * glide : 1 - Math.pow(-2 * glide + 2, 2) / 2;
            x += (sqX(mv[2]) - x) * e; y += (sqY(mv[3]) - y) * e;
          } else if (mv && p.c === mv[2] && p.r === mv[3]) fade = 1 - glide; // taken
          if (fade <= 0.02) return;
          if (fade < 1) { g.fillStyle(CARD_RED, 0.3 * fade); g.fillCircle(x, y - 10, 22); }
          livingPiece(g, x, y, p.kind, p.white, t, i);
        });
        // The Arbiter's clock flag.
        g.fillStyle(k % 2 ? EBONY : IVORY, 1); g.fillRect(1525 - 13, 590 - 156, 6, 6 - (k % 2) * 3);
      }
    }
    // The spiral over the Playhouse marquee, turning.
    if (inView(PLAYHOUSE.x, PLAYHOUSE.y - 160, view, 260)) {
      const r = Math.min(64, 380 * 0.16);
      spiralDisc(g, PLAYHOUSE.x, PLAYHOUSE.y - 230 + 230 * 0.28, r, t * 1.6);
      for (let i = 0; i < 3; i++) {
        const ph = ((t * 0.5) + i / 3) % 1;
        g.lineStyle(2, MIND_LIT, 0.3 * (1 - ph)); g.strokeCircle(PLAYHOUSE.x, PLAYHOUSE.y - 230 + 230 * 0.28, r + 6 + ph * 40);
      }
    }
    // The thought turning in the Deep Think's ball.
    if (inView(DEEP_THINK.x, DEEP_THINK.y - 300, view, 300)) {
      const br = Math.min(96, 380 * 0.28), bcy = DEEP_THINK.y - 250 - 22 - br * 0.9;
      for (let k = 0; k < 3; k++) {
        const a0 = t * (k % 2 ? -0.7 : 0.9) + k * 2;
        g.lineStyle(6 - k, k === 1 ? MIND_LIT : MIND, 0.35);
        g.beginPath(); g.arc(DEEP_THINK.x + Math.cos(a0) * 14, bcy + Math.sin(a0) * 10, br * (0.3 + k * 0.17), a0, a0 + 2.2, false); g.strokePath();
      }
      g.fillStyle(0xffffff, 0.15 + Math.sin(t * 2) * 0.08); g.fillEllipse(DEEP_THINK.x - br * 0.4, bcy - br * 0.45, br * 0.42, br * 0.22);
    }
    // The séance well: slow rings, and a pale face of light that comes and goes.
    if (inView(WELL_C.x, WELL_C.y, view, 300)) {
      for (let i = 0; i < 4; i++) {
        const ph = (t * 0.3 + i / 4) % 1;
        g.lineStyle(1.5, WELL_LIT, 0.5 * (1 - ph)); g.strokeEllipse(WELL_C.x + Math.sin(i * 2) * 40, WELL_C.y + Math.cos(i * 3) * 12, 10 + ph * 80, 4 + ph * 26);
      }
      const ph = (t * 0.07) % 1;
      if (ph < 0.3) { const a = Math.sin((ph / 0.3) * Math.PI); glow(g, WELL_C.x - 20, WELL_C.y, 24, MIND_LIT, 0.05 * a, 3); }
    }
    // The planchette on the Row's spirit board, drifting on its own between letters.
    if (inView(SPIRIT_BOARD.x, SPIRIT_BOARD.y, view, 200)) {
      const a = t * 0.35;
      const px = SPIRIT_BOARD.x + Math.sin(a) * 100, py = SPIRIT_BOARD.y + Math.sin(a * 1.7) * 18;
      planchette(g, px, py, 12, Math.cos(a) > 0 ? 0 : Math.PI, 0.4);
    }
    // Crystal balls catching the lamp-light; lamps breathing.
    for (const b of balls) if (inView(b.x, b.y, view)) { g.fillStyle(MIND_LIT, 0.25 + Math.sin(t * 1.6 + b.x) * 0.15); g.fillCircle(b.x, b.y, b.r * 0.5); }
    for (const l of lamps) if (inView(l.x, l.y, view)) glow(g, l.x, l.y + 6, 30, CANDLE, 0.025 + Math.sin(t * 3 + l.x * 0.1) * 0.01, 2);
  },

  animateOver(g, t, view) {
    // Thoughts rising off the booths and the parlours: small violet rings drifting up and fading.
    const sources: Pt[] = [{ x: 1580, y: 690 }, { x: 2180, y: 690 }, ...PARLOURS.map(([x]) => ({ x: x - 27, y: 1150 }))];
    for (const s of sources) {
      if (!inView(s.x, s.y, view, 200)) continue;
      for (let i = 0; i < 3; i++) {
        const ph = (t * 0.25 + i / 3 + s.x * 0.001) % 1;
        g.lineStyle(1.5, MIND_LIT, 0.45 * Math.sin(ph * Math.PI));
        g.strokeCircle(s.x + Math.sin(t + i * 2 + s.x) * 10, s.y - ph * 70, 3 + ph * 7);
      }
    }
    // The Deep Think's ball watches the town: a slow violet beam sweeping across the court.
    if (inView(DEEP_THINK.x, DEEP_THINK.y - 200, view, 600)) {
      const a = Math.PI / 2 + Math.sin(t * 0.2) * 0.9;
      const ox = DEEP_THINK.x, oy = DEEP_THINK.y - 250 - 22 - 86;
      g.fillStyle(MIND, 0.035);
      g.fillTriangle(ox, oy, ox + Math.cos(a - 0.08) * 700, oy + Math.sin(a - 0.08) * 700, ox + Math.cos(a + 0.08) * 700, oy + Math.sin(a + 0.08) * 700);
    }
    // Spray over the sea wall.
    if (inView(1200, 1530, view, 1300)) {
      for (let i = 0; i < 6; i++) {
        const ph = (t * 0.4 + i / 6) % 1;
        const x = ((i * 397 + Math.floor(t * 0.4 + i / 6) * 211) % MIND_W);
        g.fillStyle(lit(SEA_LIT, 0.4), 0.3 * Math.sin(ph * Math.PI)); g.fillCircle(x, 1530 - ph * 24, 4 + ph * 6);
      }
    }
  },
};

export const MIND_AREA: AreaDef = {
  id: 'mind',
  isle: 'fate',
  court: 'mind',
  name: 'The Mind Court',
  subtitle: 'Every wager read before the House will take it',
  w: MIND_W,
  h: MIND_H,
  bg: BAIZE_DEEP,
  accent: MIND_COLOR,
  weather: 'ripples',
  spawn: { x: 140, y: 800 },
  painter,
  solids,
  exits: [
    { side: 'w', to: 'tosswater', at: ROAD_Y + 40, label: 'The west road to Tosswater' },
    { side: 'n', to: 'remembrance', at: NORTH_X + 40, label: 'The north road to the Remembrance Court' },
  ],
  pois: [
    { kind: 'waystone', at: { x: 210, y: 934 } },
    { kind: 'prince', id: 'gambit', at: { x: DEEP_THINK.x, y: DEEP_THINK.y + 46 } },
    { kind: 'water', id: 'mind-well', shape: SEANCE_WELL, fishery: 'mind-well' },
    { kind: 'encounter', id: 'mind-mind-reader' },
    { kind: 'encounter', id: 'mind-poker-face' },
    { kind: 'encounter', id: 'mind-telekinesis' },
    { kind: 'encounter', id: 'mind-hypnosis' },
    { kind: 'encounter', id: 'mind-swap' },
    {
      kind: 'sign', at: { x: 330, y: 870 },
      text: 'THE MIND COURT. Every wager against the House is read here first. A bluff is a theft from the House.',
    },
    {
      kind: 'sign', at: { x: 900, y: 1130 },
      text: 'THE PLAZA BOARD. Pieces by order of the Prince. A piece taken is sent up the hill. Play on.',
    },
    {
      kind: 'sign', at: { x: 1000, y: 1390 },
      text: 'SÉANCE ROW. Readings nightly. The dead tell no lies, and neither will you.',
    },
    {
      kind: 'sign', at: { x: 1650, y: 1210 },
      text: 'THE THOUGHT EXCHANGE. Thoughts read at the booths are bought and sold here. Yours may be listed.',
    },
    { kind: 'chest', id: 'mind-chest-hedges', at: { x: 2260, y: 330 }, coins: 150 },
    { kind: 'chest', id: 'mind-chest-deepthink', at: { x: 2040, y: 520 }, orbs: 2, open: { prince: 'gambit' } },
  ],
  npcs: MIND_NPCS,
  crowd: MIND_CROWD,
};
