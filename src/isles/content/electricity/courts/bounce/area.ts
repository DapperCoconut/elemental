import type { AreaDef, AreaPainter, Pt, Rect, Solid } from '../../../../IslesTypes';
import { dim, glow, groundFill, lit, rock, type G } from '../../../../art/IsleArt';
import {
  balloon, balloonShop, ballSack, band, basket, bolt, bounceWaystone, brownoutBell, bumperWall, cable, chequerSquare,
  crankHouse, crepeRack, hopscotch, junctionBox, latexPool, plantationEarth, pylon, pylonPoints, rubberStreet,
  rubberTree, springLamp, stretchPost, sulphurHeap, sulphurVat, superball, toyBox, toySoldier, toyWorks, trampoline,
  vulcanWorks, windKey,
} from './art';
import {
  ARC, ARC_BLUE, BOUNCE_COLOR, BRASS, BRASS_DARK, CREPE, HOT, HOT_LIT, IRON, IRON_LIT, LATEX, LATEX_LIT, NIGHT,
  POOL_LIT, ROCK, ROCK_LIT, RUBBER, RUBBER_SHEEN, SULPHUR, TIN, TOY_BLUE, TOY_COLORS, TOY_GREEN, TOY_PINK, TOY_RED,
  TOY_YELLOW, WINDOW,
} from './palette';
import { BOUNCE_CROWD, BOUNCE_NPCS } from './npcs';

/**
 * The Bounce Court — the rubber town of Voltreach, between Terminus and the Circuit Court.
 *
 * Read it from the Terminus road in:
 * • **Main Street** (east): the road from the harbour comes in past the waystone under a run of
 *   pylons, crank-houses with brass meters on its north side and Gutta Percival's elastics shop;
 * • **Gasbag Row and Crank Row** (south-east): the balloon makers' shops with their gasbags
 *   tethered overhead, and below them the poorest crank-houses, half of them switched off;
 * • **the Trampoline Square** at the crossing: a red-and-black chequer round the Great Spring,
 *   four sunk trampolines, the Brownout Bell on its tower at the north-east corner;
 * • **the Ball Court** (south): a walled rubber handball court where the town's children used to
 *   play, until the balls were confiscated;
 * • **the plantation** (south-west): tapped rubber trees in rows, the latex pool where the milk
 *   is gathered (and where the rubber guppies breed);
 * • **the Stretching Walk** (west): the ropewalk where bands are stretched between iron posts;
 * • **the vulcanizing works** (north-west): the only licensed fire on the isle, curing the Grid's
 *   insulation in sulphur, with Ma Gussie's back door onto the yard;
 * • **the Toy Works** (north-east): Prince Sprocket's clockwork palace, its great key turning on
 *   the roof, the Toy Box beside it where run-down things are put away;
 * • **the North Road** up past old Hobb's workshop to the Circuit Court.
 *
 * Copper cable runs over all of it, pylon to pylon, with a drop to every attic skein.
 */

export const BOUNCE_W = 2400;
export const BOUNCE_H = 1600;

/** The Trampoline Square: centre and radii. */
export const SQUARE: Pt = { x: 1200, y: 820 };
const SQ_RX = 240;
const SQ_RY = 170;
/** The four sunk trampolines round the Great Spring. */
export const TRAMPOLINES: Pt[] = [{ x: 1075, y: 765 }, { x: 1325, y: 765 }, { x: 1075, y: 890 }, { x: 1325, y: 890 }];
/** The latex pool — the court's fishing water. */
export const LATEX_POOL: Rect = { x: 380, y: 1262, w: 340, h: 166 };
/** The Toy Works — the middle of its front step. */
export const TOY_WORKS: Pt = { x: 1760, y: 420 };
/** The Toy Box beside it. */
export const TOY_BOX: Pt = { x: 2180, y: 470 };
/** The vulcanizing works and its curing vat. */
export const WORKS: Pt = { x: 520, y: 440 };
export const VAT: Pt = { x: 900, y: 600 };
/** The Ball Court's walls. */
export const BALL_COURT: Rect = { x: 1010, y: 1180, w: 380, h: 262 };
/** The Brownout Bell. */
export const BELL: Pt = { x: 1390, y: 625 };
/** Hobb's workshop on the North Road. */
export const HOBB_SHOP: Pt = { x: 1000, y: 330 };

const MAIN_Y = 800;
const GASBAG_Y = 1090;
const CRANK_Y = 1440;
const WEST_Y = 822;
const NORTH_X = 1200;
const KEY_Y = 520;

type Piece = NonNullable<AreaPainter['pieces']>[number];

const pieces: Piece[] = [];
const solids: Solid[] = [];
/** Attic points that take a drop cable from the nearest pylon. */
const drops: Pt[] = [];
/** Pylons: base point and height (cables strung between their tips in `animateOver`). */
const pylons: { x: number; y: number; h: number }[] = [];
/** Balloons tethered over the balloon shops: anchor, colour, string, size. */
const tethers: { x: number; y: number; c: number; s: number; r: number; ph: number }[] = [];
/** Lamps along the streets, some failing. */
const lamps: { x: number; y: number; flaky: boolean }[] = [];

function addPiece(x: number, y: number, w: number, h: number, draw: (g: G, rng: () => number) => void, solid?: Solid): void {
  pieces.push({ x, y, w, h, draw });
  if (solid) solids.push(solid);
}

function addPylon(x: number, y: number, h = 150): void {
  pylons.push({ x, y, h });
  addPiece(x, y, 80, h + 30, (g) => { pylon(g, x, y, h); }, { kind: 'circle', x, y: y - 2, r: 12 });
}

function addHouse(x: number, y: number, w: number, h: number, wall: number, opts: { on?: boolean; crank?: -1 | 1; strikes?: 0 | 1 | 2; roof?: number } = {}): void {
  addPiece(x, y, w + 60, h + w * 0.7 + 30, (g, rng) => { crankHouse(g, x, y, w, h, { wall, ...opts }, rng); },
    { kind: 'rect', x: x - w / 2 - 4, y: y - 28, w: w + 8, h: 28 });
  drops.push({ x, y: y - h - w * 0.2 });
}

// ── Layout ───────────────────────────────────────────────────────────

// The Toy Works and its forecourt, the Toy Box beside it.
addPiece(TOY_WORKS.x, TOY_WORKS.y, 640, 420, (g, rng) => { toyWorks(g, TOY_WORKS.x, TOY_WORKS.y, 560, 220, rng); },
  { kind: 'rect', x: TOY_WORKS.x - 292, y: TOY_WORKS.y - 34, w: 584, h: 34 });
addPiece(TOY_BOX.x, TOY_BOX.y, 170, 120, (g) => toyBox(g, TOY_BOX.x, TOY_BOX.y, 130, 64),
  { kind: 'rect', x: TOY_BOX.x - 68, y: TOY_BOX.y - 26, w: 136, h: 26 });
for (const [x, c] of [[1540, TOY_YELLOW], [1980, TOY_GREEN]] as [number, number][]) {
  addPiece(x, 560, 40, 70, (g) => toySoldier(g, x, 560, 1.3, c), { kind: 'circle', x, y: 556, r: 10 });
}

// Old Hobb's workshop on the North Road, west side.
addPiece(HOBB_SHOP.x, HOBB_SHOP.y, 200, 220, (g, rng) => {
  crankHouse(g, HOBB_SHOP.x, HOBB_SHOP.y, 130, 108, { wall: 0x5a4a6a, roof: 0x2a3a5a, on: true, crank: -1 }, rng);
  // A hanging sign: a tin key.
  g.lineStyle(2, IRON, 1); g.lineBetween(HOBB_SHOP.x + 66, HOBB_SHOP.y - 70, HOBB_SHOP.x + 96, HOBB_SHOP.y - 70);
  g.lineStyle(1, IRON_LIT, 1); g.lineBetween(HOBB_SHOP.x + 90, HOBB_SHOP.y - 70, HOBB_SHOP.x + 90, HOBB_SHOP.y - 60);
  windKey(g, HOBB_SHOP.x + 90, HOBB_SHOP.y - 58, Math.PI / 2, 18, BRASS);
}, { kind: 'rect', x: HOBB_SHOP.x - 70, y: HOBB_SHOP.y - 28, w: 140, h: 28 });
drops.push({ x: HOBB_SHOP.x, y: HOBB_SHOP.y - 134 });
addHouse(1000, 170, 110, 96, 0x4a3a50, { on: false, strikes: 2, crank: -1 });

// Crank-houses along the north side of Main Street; Gutta Percival's shop among them.
addPiece(1600, 735, 200, 230, (g, rng) => {
  crankHouse(g, 1600, 735, 140, 112, { wall: 0x7a3a5a, roof: TOY_RED, on: true, crank: -1 }, rng);
  // The shop sign: a stretched band reading as a bow.
  g.fillStyle(TIN, 1); g.fillRoundedRect(1548, 650, 104, 18, 8);
  g.fillStyle(TOY_RED, 1); g.fillRoundedRect(1552, 653, 96, 12, 6);
  g.fillStyle(LATEX_LIT, 1); for (let k = 0; k < 6; k++) g.fillRect(1562 + k * 14, 657, 8, 4);
  // Coils of band hung by the door.
  for (let k = 0; k < 3; k++) { g.lineStyle(3, [CREPE, TOY_YELLOW, TOY_RED][k], 1); g.strokeCircle(1662 + k * 10, 700, 7); }
}, { kind: 'rect', x: 1526, y: 707, w: 148, h: 28 });
drops.push({ x: 1600, y: 735 - 112 - 28 });
addHouse(1760, 735, 112, 100, 0x6a3a30, { on: true, crank: 1 });
addHouse(1900, 735, 110, 104, 0x5a4250, { on: true, crank: -1, strikes: 1 });
addHouse(2040, 735, 110, 96, 0x6a4a3a, { on: false, crank: 1, strikes: 2 });
addHouse(2180, 735, 104, 100, 0x5a3a3a, { on: true, crank: -1 });

// Gasbag Row: the balloon makers, their gasbags tethered overhead.
for (const [x, w, h, stripe] of [[1620, 120, 120, TOY_BLUE], [1900, 180, 140, TOY_RED], [2180, 120, 118, TOY_GREEN]] as [number, number, number, number][]) {
  addPiece(x, 1030, w + 80, h * 1.5 + 60, (g, rng) => balloonShop(g, x, 1030, w, h, stripe, rng),
    { kind: 'rect', x: x - w / 2 - 34, y: 1004, w: w + 40, h: 26 });
  drops.push({ x, y: 1030 - h - h * 0.38 });
  for (let k = 0; k < (w > 150 ? 7 : 4); k++) {
    tethers.push({ x: x - w / 2 + 12 + (k * (w - 24)) / Math.max(1, (w > 150 ? 6 : 3)), y: 1030 - h - 8, c: TOY_COLORS[(k + x) % TOY_COLORS.length], s: 40 + (k % 3) * 18, r: 11 + (k % 2) * 4, ph: k * 1.3 + x * 0.01 });
  }
}
addPiece(1985, 1052, 40, 40, (g) => basket(g, 1985, 1052, 1), { kind: 'rect', x: 1970, y: 1034, w: 30, h: 18 });

// Crank Row: the poorest houses, most of them switched off.
const CRANK_ROW: [number, number, boolean, 0 | 1 | 2][] = [
  [1590, 0x5a3a3a, true, 0], [1715, 0x4a3a4a, false, 1], [1840, 0x5a4a3a, false, 2], [1965, 0x4a4050, true, 1],
  [2090, 0x5a3a44, false, 2], [2215, 0x4a3a3a, true, 0],
];
CRANK_ROW.forEach(([x, wall, on, strikes], i) => addHouse(x, 1370, 112, 92 + (i % 3) * 8, wall, { on, strikes, crank: i % 2 ? 1 : -1 }));

// The Trampoline Square: the Great Spring at its heart, the Brownout Bell at its corner.
addPiece(SQUARE.x, SQUARE.y + 18, 120, 200, (g) => {
  // The Great Spring's plinth; the coils and the ball are animated.
  g.fillStyle(0x000000, 0.35); g.fillEllipse(SQUARE.x, SQUARE.y + 22, 110, 30);
  g.fillStyle(IRON, 1); g.fillEllipse(SQUARE.x, SQUARE.y + 14, 90, 26);
  g.fillStyle(BRASS_DARK, 1); g.fillRect(SQUARE.x - 45, SQUARE.y, 90, 14);
  g.fillStyle(BRASS, 1); g.fillEllipse(SQUARE.x, SQUARE.y, 90, 24);
  g.fillStyle(RUBBER, 1); g.fillEllipse(SQUARE.x, SQUARE.y - 2, 60, 15);
}, { kind: 'circle', x: SQUARE.x, y: SQUARE.y + 8, r: 40 });
addPiece(BELL.x, BELL.y, 90, 170, (g) => brownoutBell(g, BELL.x, BELL.y), { kind: 'rect', x: BELL.x - 30, y: BELL.y - 24, w: 60, h: 24 });

// The vulcanizing works, the vat, the drying racks and sulphur heaps in the yard.
addPiece(WORKS.x, WORKS.y, 660, 420, (g, rng) => vulcanWorks(g, WORKS.x, WORKS.y, 600, 170, rng),
  { kind: 'rect', x: WORKS.x - 304, y: WORKS.y - 34, w: 608, h: 34 });
addPiece(VAT.x, VAT.y, 130, 150, (g) => sulphurVat(g, VAT.x, VAT.y, 34), { kind: 'circle', x: VAT.x, y: VAT.y - 18, r: 40 });
for (const x of [290, 450]) addPiece(x, 600, 140, 70, (g, rng) => crepeRack(g, x, 600, 120, rng), { kind: 'rect', x: x - 62, y: 592, w: 124, h: 10 });
for (const [x, y, s] of [[780, 500, 1], [250, 690, 0.8], [1010, 520, 0.9]] as [number, number, number][]) {
  addPiece(x, y, 70 * s, 50 * s, (g) => sulphurHeap(g, x, y, s), { kind: 'circle', x, y: y - 6, r: 18 * s });
}

// The Stretching Walk: iron posts both sides of the West Lane with bands strung between them.
const POSTS_N = [150, 300, 450];
for (const x of POSTS_N) {
  for (const y of [772, 876]) addPiece(x, y, 30, 60, (g) => stretchPost(g, x, y), { kind: 'circle', x, y: y - 3, r: 7 });
}
// Houses north of the West Lane, east of the ropewalk.
addHouse(700, 765, 110, 92, 0x5a3a3a, { on: true, crank: -1 });
addHouse(830, 765, 100, 100, 0x4a4050, { on: false, crank: 1, strikes: 1 });

// The Ball Court's walls (open on the north, where the South Lane comes in).
const BC = BALL_COURT;
addPiece(BC.x + BC.w / 2, BC.y + BC.h, BC.w + 20, 70, (g) => bumperWall(g, BC.x, BC.y + BC.h, BC.w, 40, false),
  { kind: 'rect', x: BC.x, y: BC.y + BC.h - 22, w: BC.w, h: 22 });
for (const x of [BC.x, BC.x + BC.w - 22]) {
  addPiece(x + 11, BC.y + BC.h - 10, 40, BC.h + 20, (g) => bumperWall(g, x, BC.y + BC.h - 10, 22, BC.h - 10, true),
    { kind: 'rect', x, y: BC.y, w: 22, h: BC.h - 10 });
}
addPiece(BC.x + 56, BC.y + 50, 40, 40, (g) => ballSack(g, BC.x + 56, BC.y + 50), { kind: 'circle', x: BC.x + 56, y: BC.y + 44, r: 12 });

// The plantation: tapped rubber trees in rows.
const TREE_ROWS: [number, number[]][] = [
  [1040, [150, 250, 350, 450, 550, 650, 750, 850]],
  [1190, [150, 250, 350, 450, 550, 650, 750, 850]],
  [1562, [150, 250, 350, 450, 550, 650, 750, 850]],
];
/** Trees whose cups the Lattimers' latex comes from (quest spots). */
export const TAPPED: Pt[] = [];
for (const [y, xs] of TREE_ROWS) {
  for (const x of xs) {
    const s = 0.9 + ((x * 7 + y) % 5) / 20;
    addPiece(x, y, 90, 170, (g, rng) => rubberTree(g, x, y, s, rng, true), { kind: 'circle', x, y: y - 4, r: 10 });
    if (y === 1190 && x % 200 === 50) TAPPED.push({ x: x + 22, y: y + 26 });
  }
}
addPiece(160, 1340, 90, 170, (g, rng) => rubberTree(g, 160, 1340, 1, rng, true), { kind: 'circle', x: 160, y: 1336, r: 10 });
addPiece(850, 1340, 90, 170, (g, rng) => rubberTree(g, 850, 1340, 0.95, rng, false), { kind: 'circle', x: 850, y: 1336, r: 10 });
solids.push({ kind: 'rect', x: LATEX_POOL.x - 14, y: LATEX_POOL.y - 12, w: LATEX_POOL.w + 28, h: LATEX_POOL.h + 26 });

// Pylons: the Grid's run from the harbour road up to the Circuit Court, and its branches.
addPylon(2080, 888); addPylon(1800, 885); addPylon(1430, 905, 160);
addPylon(1290, 640, 170); addPylon(1290, 300, 160); addPylon(1090, 160, 150);
addPylon(1060, 600); addPylon(620, 700); addPylon(250, 690, 140);
addPylon(1120, 1080); addPylon(950, 1300); addPylon(250, 1300, 140);
addPylon(1420, 1180); addPylon(1800, 1490); addPylon(2200, 1490);
addPylon(2290, 330, 160);
const CHAINS: number[][] = [
  [0, 1, 2, 3, 4, 5],
  [3, 6, 7, 8],
  [2, 9, 10, 11],
  [2, 12, 13, 14],
  [4, 15],
];

// The waystone, junction boxes, lamps and hopscotch.
addPiece(2230, 905, 60, 80, (g) => bounceWaystone(g, 2230, 905), { kind: 'circle', x: 2230, y: 899, r: 16 });
for (const [x, y] of [[1460, 640], [860, 990], [1450, 1000], [600, 960]] as [number, number][]) {
  addPiece(x, y, 30, 60, (g) => junctionBox(g, x, y), { kind: 'circle', x, y: y - 2, r: 6 });
}
for (const [x, y, flaky] of [
  [1960, 860, false], [1660, 860, true], [1700, 1146, false], [2050, 1146, true], [1250, 470, false], [1150, 220, true],
  [880, 880, false], [620, 880, true], [1730, 1495, true], [2060, 1495, false], [1260, 1040, false], [2290, 600, false],
] as [number, number, boolean][]) {
  lamps.push({ x, y, flaky });
  addPiece(x, y, 30, 90, (g) => springLamp(g, x, y, 0), { kind: 'circle', x, y: y - 2, r: 6 });
}

// The north edge: black rock and the storm fence. Rocks sit in the corners.
for (const [x, y, s] of [[90, 190, 1.4], [200, 120, 1], [2310, 180, 1.3], [2200, 110, 1], [60, 1450, 1.1], [2340, 1180, 1.2], [2330, 1520, 1]] as [number, number, number][]) {
  addPiece(x, y, 80 * s, 70 * s, (g, rng) => rock(g, x, y, s * 1.6, ROCK_LIT, rng), { kind: 'circle', x, y: y - 6, r: 24 * s });
}

// ── The edge of the town ─────────────────────────────────────────────

const N_GAP = 80;
const E_GAP = 80;
solids.push({ kind: 'rect', x: 0, y: 0, w: NORTH_X - N_GAP, h: 54 });
solids.push({ kind: 'rect', x: NORTH_X + N_GAP, y: 0, w: BOUNCE_W - NORTH_X - N_GAP, h: 54 });
solids.push({ kind: 'rect', x: 0, y: 0, w: 30, h: BOUNCE_H });
solids.push({ kind: 'rect', x: 0, y: BOUNCE_H - 26, w: BOUNCE_W, h: 26 });
solids.push({ kind: 'rect', x: BOUNCE_W - 30, y: 0, w: 30, h: MAIN_Y - E_GAP });
solids.push({ kind: 'rect', x: BOUNCE_W - 30, y: MAIN_Y + E_GAP, w: 30, h: BOUNCE_H - MAIN_Y - E_GAP });
// The north cliff is drawn as a piece so the town stands in front of it.
for (const [x0, x1] of [[0, NORTH_X - N_GAP], [NORTH_X + N_GAP, BOUNCE_W]] as [number, number][]) {
  addPiece((x0 + x1) / 2, 56, x1 - x0, 90, (g, rng) => {
    g.fillStyle(dim(ROCK, 0.4), 1); g.fillRect(x0, 0, x1 - x0, 56);
    for (let x = x0; x < x1; x += 34) {
      const h = 30 + rng() * 40;
      g.fillStyle(ROCK, 1); g.fillTriangle(x - 6, 56, x + 40, 56, x + 14 + rng() * 10, 56 - h);
      g.fillStyle(ROCK_LIT, 0.6); g.fillTriangle(x + 4, 56, x + 14, 56 - h * 0.9, x + 10, 56);
    }
    // The storm fence: insulated posts and a single live wire.
    for (let x = x0 + 20; x < x1; x += 90) { g.fillStyle(IRON, 1); g.fillRect(x - 2, 30, 4, 28); g.fillStyle(0x8ad0b0, 1); g.fillEllipse(x, 30, 7, 4); }
    g.lineStyle(1.5, 0xc87a3a, 0.9); g.lineBetween(x0 + 20, 30, x1 - 20, 30);
  });
}
// The south edge: a low rubber kerb, drawn over anyone walking along it.
addPiece(BOUNCE_W / 2, BOUNCE_H, BOUNCE_W, 40, (g) => {
  g.fillStyle(RUBBER, 1); g.fillRect(0, BOUNCE_H - 26, BOUNCE_W, 26);
  g.fillStyle(RUBBER_SHEEN, 0.4); g.fillRect(0, BOUNCE_H - 24, BOUNCE_W, 3);
  for (let x = 20; x < BOUNCE_W; x += 80) { g.fillStyle(TOY_YELLOW, 0.7); g.fillRect(x, BOUNCE_H - 18, 40, 5); }
});

// ── Painter ──────────────────────────────────────────────────────────

const inView = (x: number, y: number, v: Rect, m = 160): boolean =>
  x > v.x - m && x < v.x + v.w + m && y > v.y - m && y < v.y + v.h + m;

/** The tips of every pylon, computed once. */
const TIPS = pylons.map((p) => pylonPoints(p.x, p.y, p.h));

/** The nearest pylon tip to a point (for attic drops). */
function nearestTip(p: Pt): Pt {
  let best = TIPS[0][0];
  let bd = Infinity;
  for (const pair of TIPS) for (const t of pair) { const d = Math.hypot(t.x - p.x, t.y - p.y); if (d < bd) { bd = d; best = t; } }
  return best;
}
const DROP_LINES = drops.map((d) => ({ a: nearestTip(d), b: d })).filter((l) => Math.hypot(l.a.x - l.b.x, l.a.y - l.b.y) < 520);

/** A storm strike: which pylon, when (each period one bolt). */
const STRIKE_PERIOD = 6.5;

const painter: AreaPainter = {
  ground(g, rng) {
    const W = BOUNCE_W, H = BOUNCE_H;
    // Black rock under everything, glossy where the rain sits.
    groundFill(g, { x: 0, y: 0, w: W, h: H }, ROCK, dim(ROCK, 0.25), ROCK_LIT, rng, 1.2);
    for (let i = 0; i < 160; i++) {
      const x = rng() * W, y = rng() * H;
      g.fillStyle(ARC_BLUE, 0.04); g.fillEllipse(x, y, 30 + rng() * 60, 6 + rng() * 10);
    }

    // The plantation earth.
    plantationEarth(g, { x: 30, y: 960, w: 940, h: 620 }, rng);
    // The works yard: cinder and sulphur dust.
    groundFill(g, { x: 200, y: 450, w: 920, h: 280 }, 0x2e2a26, 0x3a342c, 0x5a5230, rng, 1.4);
    for (let i = 0; i < 120; i++) { g.fillStyle(SULPHUR, 0.18); g.fillCircle(220 + rng() * 880, 460 + rng() * 260, 1 + rng() * 2.5); }
    // The Toy Works forecourt: painted boards like a toy-box floor.
    for (let x = 1460; x < 2080; x += 40) {
      for (let y = 430; y < 580; y += 20) {
        const k = ((x - 1460) / 40 + (y - 430) / 20) % 2;
        g.fillStyle(k ? 0x4a2a2a : 0x3a2430, 1); g.fillRect(x, y, 40, 20);
        g.fillStyle(0x000000, 0.25); g.fillRect(x, y + 18, 40, 2);
      }
    }
    g.lineStyle(3, BRASS, 0.6); g.strokeRect(1460, 430, 620, 150);

    // The streets.
    rubberStreet(g, [{ x: W, y: MAIN_Y }, { x: SQUARE.x + SQ_RX - 20, y: MAIN_Y + 10 }], 100, rng);
    rubberStreet(g, [{ x: NORTH_X, y: SQUARE.y - SQ_RY + 20 }, { x: NORTH_X, y: 0 }], 96, rng);
    rubberStreet(g, [{ x: SQUARE.x - SQ_RX + 20, y: WEST_Y }, { x: 60, y: WEST_Y }], 92, rng);
    rubberStreet(g, [{ x: NORTH_X, y: SQUARE.y + SQ_RY - 20 }, { x: NORTH_X, y: BALL_COURT.y + 20 }], 86, rng);
    rubberStreet(g, [{ x: NORTH_X + 48, y: KEY_Y }, { x: 2300, y: KEY_Y }], 80, rng);
    rubberStreet(g, [{ x: 560, y: WEST_Y - 30 }, { x: 560, y: 470 }], 70, rng);
    rubberStreet(g, [{ x: 600, y: 540 }, { x: NORTH_X - 48, y: 540 }], 66, rng);
    rubberStreet(g, [{ x: 1500, y: MAIN_Y + 40 }, { x: 1500, y: CRANK_Y }], 70, rng);
    rubberStreet(g, [{ x: 2330, y: MAIN_Y + 40 }, { x: 2330, y: CRANK_Y }], 70, rng);
    rubberStreet(g, [{ x: 1450, y: GASBAG_Y }, { x: 2330, y: GASBAG_Y }], 90, rng);
    rubberStreet(g, [{ x: 1420, y: CRANK_Y }, { x: 2330, y: CRANK_Y }], 90, rng);
    // The plantation tracks: packed earth with board walks over the wet.
    for (const pts of [
      [{ x: 60, y: 1112 }, { x: 960, y: 1112 }], [{ x: 60, y: 1480 }, { x: 960, y: 1480 }], [{ x: 920, y: WEST_Y + 40 }, { x: 920, y: 1540 }],
    ] as Pt[][]) {
      const a = pts[0], b = pts[1];
      g.lineStyle(56, 0x3a3026, 1); g.lineBetween(a.x, a.y, b.x, b.y);
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      for (let d = 0; d < len; d += 14) {
        const x = a.x + ((b.x - a.x) * d) / len, y = a.y + ((b.y - a.y) * d) / len;
        const vert = a.x === b.x;
        g.fillStyle(rng() < 0.5 ? 0x5a4a3a : 0x6a5640, 1);
        if (vert) g.fillRect(x - 22, y, 44, 10); else g.fillRect(x, y - 22, 10, 44);
      }
    }
    // A latex runnel along the plantation walk.
    g.lineStyle(3, LATEX, 0.5); g.lineBetween(60, 1142, 900, 1142);

    // The square.
    chequerSquare(g, SQUARE.x, SQUARE.y, SQ_RX, SQ_RY);
    hopscotch(g, 1000, 1000);
    hopscotch(g, 1880, 1180);

    // The Ball Court floor: green rubber, white court lines.
    const BC = BALL_COURT;
    g.fillStyle(0x24442e, 1); g.fillRect(BC.x + 20, BC.y, BC.w - 40, BC.h - 20);
    g.fillStyle(0x2e5a3a, 0.6); for (let x = BC.x + 20; x < BC.x + BC.w - 20; x += 40) g.fillRect(x, BC.y, 20, BC.h - 20);
    g.lineStyle(3, LATEX_LIT, 0.65);
    g.strokeRect(BC.x + 34, BC.y + 14, BC.w - 68, BC.h - 50);
    g.lineBetween(BC.x + 34, BC.y + BC.h * 0.5, BC.x + BC.w - 34, BC.y + BC.h * 0.5);
    g.strokeCircle(BC.x + BC.w / 2, BC.y + BC.h * 0.5, 40);
    for (let i = 0; i < 30; i++) { g.fillStyle(0x000000, 0.2); g.fillCircle(BC.x + 30 + rng() * (BC.w - 60), BC.y + 10 + rng() * (BC.h - 40), 3 + rng() * 3); }

    // The Stretching Walk: chalked measure marks between the posts.
    for (let x = 100; x < 560; x += 25) { g.fillStyle(LATEX_LIT, 0.35); g.fillRect(x, WEST_Y - 2, 2, x % 100 === 0 ? 14 : 6); }

    // The latex pool.
    latexPool(g, LATEX_POOL, rng);

    // The Gasbag Row pavement: shreds of popped balloon everywhere.
    for (let i = 0; i < 70; i++) {
      const x = 1470 + rng() * 800, y = GASBAG_Y - 40 + rng() * 80;
      g.fillStyle(TOY_COLORS[Math.floor(rng() * TOY_COLORS.length)], 0.6);
      g.fillTriangle(x, y, x + 4 + rng() * 4, y + rng() * 3, x + rng() * 3, y + 4 + rng() * 3);
    }
    // Chalk round the switched-off doors of Crank Row.
    for (let x = 1715; x < 2200; x += 250) { g.lineStyle(1.5, LATEX_LIT, 0.45); g.strokeCircle(x, 1392, 16); }
  },

  pieces,

  animate(g, t, view) {
    // The trampolines, one or another giving under somebody's weight.
    if (inView(SQUARE.x, SQUARE.y, view, 320)) {
      TRAMPOLINES.forEach((p, i) => {
        const ph = (t * 0.9 + i * 0.37) % 2;
        const sag = ph < 0.4 ? Math.sin((ph / 0.4) * Math.PI) : 0;
        trampoline(g, p.x, p.y, 34, sag * 0.8);
      });
      // The Great Spring: coils, and the ball bouncing on it.
      const ph = (t * 1.1) % 1;
      const squash = ph < 0.12 ? 1 - ph / 0.12 : ph > 0.88 ? (ph - 0.88) / 0.12 : 0;
      const coilH = 64 - squash * 22;
      for (let k = 0; k < 10; k++) {
        const yy = SQUARE.y - 4 - (k / 10) * coilH;
        g.lineStyle(4, IRON, 1); g.strokeEllipse(SQUARE.x, yy, 36, 9);
        g.lineStyle(1.5, IRON_LIT, 0.9); g.strokeEllipse(SQUARE.x, yy - 1, 34, 8);
      }
      const by = SQUARE.y - 4 - coilH - 18 - Math.sin(ph * Math.PI) * 90;
      superball(g, SQUARE.x, by, 18 + squash * 2, TOY_RED, t * 3);
    }
    // The vat: bubbling, steaming, glowing.
    if (inView(VAT.x, VAT.y, view, 200)) {
      const cy = VAT.y - 34 * 1.75;
      glow(g, VAT.x, cy, 60, HOT, 0.04 + Math.sin(t * 3) * 0.01, 4);
      for (let i = 0; i < 5; i++) {
        const ph = (t * 0.8 + i / 5) % 1;
        const bx = VAT.x - 26 + ((i * 37) % 52);
        g.fillStyle(HOT_LIT, 0.8 * (1 - ph)); g.fillCircle(bx, cy - 1, 2 + ph * 4);
        g.fillStyle(0xd8d0c0, 0.18 * (1 - ph)); g.fillCircle(bx + Math.sin(t + i) * 6, cy - 10 - ph * 70, 8 + ph * 16);
      }
      g.fillStyle(HOT_LIT, 0.5 + Math.sin(t * 7) * 0.3); g.fillRect(VAT.x - 10, VAT.y - 18, 20, 4);
    }
    // The works' chimneys breathe sulphur smoke.
    if (inView(WORKS.x, WORKS.y - 200, view, 400)) {
      for (const [cx, ch] of [[WORKS.x - 300 + 120, 170 * 1.5], [WORKS.x - 300 + 432, 170 * 1.75]] as [number, number][]) {
        for (let i = 0; i < 6; i++) {
          const ph = (t * 0.25 + i / 6) % 1;
          g.fillStyle(i % 2 ? 0x5a5848 : 0x6a6a40, 0.25 * (1 - ph));
          g.fillCircle(cx + ph * 60 + Math.sin(t + i) * 8, WORKS.y - ch - 10 - ph * 120, 12 + ph * 26);
        }
      }
    }
    // The Toy Works' great key, turning; the clock's jack nodding.
    if (inView(TOY_WORKS.x, TOY_WORKS.y - 240, view, 400)) {
      const kx = TOY_WORKS.x, ky = TOY_WORKS.y - 220 - 22;
      const a = t * 0.8;
      const wv = Math.cos(a);
      g.lineStyle(8, BRASS_DARK, 1); g.lineBetween(kx, ky + 6, kx, ky - 40);
      g.lineStyle(3, BRASS, 1); g.lineBetween(kx - 1, ky + 6, kx - 1, ky - 40);
      for (const k of [-1, 1]) {
        const lx = kx + k * 26 * wv, ly = ky - 54;
        g.fillStyle(BRASS_DARK, 1); g.fillEllipse(lx, ly, Math.max(4, 40 * Math.abs(wv)), 34);
        g.fillStyle(BRASS, 1); g.fillEllipse(lx - 1, ly - 1, Math.max(3, 36 * Math.abs(wv)), 30);
        g.fillStyle(NIGHT, 1); g.fillEllipse(lx, ly, Math.max(1, 14 * Math.abs(wv)), 12);
      }
      g.fillStyle(BRASS, 1); g.fillCircle(kx, ky - 44, 7);
      glow(g, kx, ky - 50, 30, WINDOW, 0.025, 3);
    }
    // The latex pool: slow fat rings and the skin creasing.
    if (inView(LATEX_POOL.x + LATEX_POOL.w / 2, LATEX_POOL.y + LATEX_POOL.h / 2, view, 300)) {
      for (let i = 0; i < 4; i++) {
        const ph = (t * 0.18 + i / 4) % 1;
        const cx = LATEX_POOL.x + 60 + ((i * 89) % (LATEX_POOL.w - 120)), cy = LATEX_POOL.y + 40 + ((i * 47) % (LATEX_POOL.h - 80));
        g.lineStyle(2, POOL_LIT, 0.6 * (1 - ph)); g.strokeEllipse(cx, cy, 8 + ph * 34, 3 + ph * 12);
      }
      // A rubber guppy surfacing.
      const ph = (t * 0.3) % 1;
      if (ph < 0.3) {
        const k = ph / 0.3;
        const gx = LATEX_POOL.x + 140 + Math.sin(t * 0.1) * 90, gy = LATEX_POOL.y + 90;
        g.fillStyle(TOY_YELLOW, 0.8 * Math.sin(k * Math.PI)); g.fillEllipse(gx, gy - Math.sin(k * Math.PI) * 6, 14, 8);
      }
    }
    // Windows that flicker as the current drops out — and the street lamps, failing.
    for (const l of lamps) {
      if (!inView(l.x, l.y, view)) continue;
      let on = 0.9 + Math.sin(t * 2 + l.x) * 0.1;
      if (l.flaky) { const f = Math.sin(t * 13 + l.x * 0.7) + Math.sin(t * 5.3 + l.y); on = f > 1.1 ? 0.15 : f > 0.6 ? 0.55 : 0.95; }
      glow(g, l.x, l.y - 66, 30, WINDOW, 0.05 * on, 4);
      g.fillStyle(WINDOW, on); g.fillCircle(l.x, l.y - 66, 4.5);
      g.fillStyle(WINDOW, 0.06 * on); g.fillEllipse(l.x, l.y + 4, 70, 22);
    }
    // The Stretching Walk: a band being stretched and let go between two posts.
    if (inView(300, WEST_Y, view, 300)) {
      const ph = (t * 0.4) % 1;
      const pull = ph < 0.7 ? ph / 0.7 : 1 - (ph - 0.7) / 0.3;
      for (const y of [772, 876]) {
        for (let i = 0; i < POSTS_N.length - 1; i++) {
          const a = { x: POSTS_N[i] + 6, y: y - 40 }, b = { x: POSTS_N[i + 1] - 6, y: y - 40 };
          const mid = { x: (a.x + b.x) / 2, y: a.y + (y === 772 ? 1 : -1) * pull * 14 * (i % 2 ? 1 : 0.4) };
          band(g, a, mid, pull * 0.6, i % 2 ? TOY_RED : CREPE);
          band(g, mid, b, pull * 0.6, i % 2 ? TOY_RED : CREPE);
        }
      }
    }
  },

  animateOver(g, t, view) {
    // The Grid: copper cable strung pylon to pylon, current running down it.
    CHAINS.forEach((chain, ci) => {
      for (let i = 0; i < chain.length - 1; i++) {
        const A = TIPS[chain[i]], B = TIPS[chain[i + 1]];
        const mx = (A[0].x + B[0].x) / 2, my = (A[0].y + B[0].y) / 2;
        if (!inView(mx, my, view, 700)) continue;
        for (let k = 0; k < 2; k++) {
          const a = A[k], b = B[A[0].x < B[0].x === a.x < A[1].x ? k : 1 - k];
          const len = Math.hypot(b.x - a.x, b.y - a.y);
          cable(g, a, b, 18 + len * 0.05, t, ci * 0.31 + i * 0.17 + k * 0.5);
        }
      }
    });
    // Drops from the pylons to every attic skein.
    for (const l of DROP_LINES) {
      if (!inView((l.a.x + l.b.x) / 2, (l.a.y + l.b.y) / 2, view, 400)) continue;
      cable(g, l.a, l.b, 10, t * 0.6, l.b.x * 0.001, 0.7);
    }
    // Gasbags tethered over the balloon makers, bobbing in the storm wind.
    for (const b of tethers) {
      if (!inView(b.x, b.y, view, 200)) continue;
      balloon(g, b.x, b.y, b.r, b.c, b.s, Math.sin(t * 1.4 + b.ph) * 8 + Math.sin(t * 0.37) * 6);
    }
    // A rogue balloon escaping up over the square.
    const ph = (t * 0.05) % 1;
    const rx = 1800 - ph * 900, ry = 1100 - ph * 1100;
    if (inView(rx, ry, view, 100)) balloon(g, rx, ry, 10, TOY_PINK, 30, Math.sin(t * 2) * 6);
    // The storm: every few seconds a bolt comes down onto a pylon's finial.
    const n = Math.floor(t / STRIKE_PERIOD);
    const since = t - n * STRIKE_PERIOD;
    if (since < 0.35) {
      const p = pylons[(n * 7) % pylons.length];
      const tx = p.x, ty = p.y - p.h - 17;
      if (inView(tx, ty, view, 400)) {
        const a = since < 0.08 ? 1 : since < 0.15 ? 0.3 : since < 0.22 ? 0.9 : 1 - since / 0.35;
        bolt(g, tx + 80, Math.max(view.y - 40, ty - 600), tx, ty, n * 31 + 7, Math.max(0, a));
        glow(g, tx, ty, 40, ARC, 0.08 * a, 4);
        g.fillStyle(ARC, 0.05 * a); g.fillRect(view.x, view.y, view.w, view.h);
      }
    }
    // Sparks spitting off the finials between strikes.
    for (let i = 0; i < pylons.length; i++) {
      const p = pylons[i];
      if (!inView(p.x, p.y - p.h, view)) continue;
      const f = Math.sin(t * 9 + i * 2.1);
      if (f > 0.85) {
        g.fillStyle(ARC, 0.9); g.fillCircle(p.x + Math.sin(t * 40 + i) * 4, p.y - p.h - 18, 1.6);
        g.lineStyle(1, ARC_BLUE, 0.7); g.lineBetween(p.x, p.y - p.h - 17, p.x + Math.sin(t * 31 + i) * 9, p.y - p.h - 26);
      }
    }
    // Tin glinting on the Toy Works' roofline when the storm flashes.
    if (since < 0.3 && inView(TOY_WORKS.x, TOY_WORKS.y - 220, view, 400)) {
      g.fillStyle(lit(TIN, 0.5), 0.15); g.fillRect(TOY_WORKS.x - 280, TOY_WORKS.y - 230, 560, 6);
    }
  },
};

export const BOUNCE_AREA: AreaDef = {
  id: 'bounce',
  isle: 'electricity',
  court: 'bounce',
  name: 'The Bounce Court',
  subtitle: 'Wind your skein tight before the Bell',
  w: BOUNCE_W,
  h: BOUNCE_H,
  bg: NIGHT,
  accent: BOUNCE_COLOR,
  weather: 'balloons',
  spawn: { x: 2200, y: MAIN_Y },
  painter,
  solids,
  exits: [
    { side: 'e', to: 'terminus', at: MAIN_Y, label: 'Main Street down to Terminus' },
    { side: 'n', to: 'circuit', at: NORTH_X, label: 'The North Road to the Circuit Court' },
  ],
  pois: [
    { kind: 'waystone', at: { x: 2230, y: 935 } },
    { kind: 'prince', id: 'sprocket', at: { x: TOY_WORKS.x, y: TOY_WORKS.y + 44 } },
    { kind: 'water', id: 'bounce-latex', shape: LATEX_POOL, fishery: 'bounce-latex' },
    { kind: 'encounter', id: 'bounce-trampoline' },
    { kind: 'encounter', id: 'bounce-rubber-band' },
    { kind: 'encounter', id: 'bounce-balloon-works' },
    { kind: 'encounter', id: 'bounce-vulcanize' },
    { kind: 'encounter', id: 'bounce-superball' },
    {
      kind: 'sign', at: { x: 2120, y: 860 },
      text: 'THE DRAW, BOUNCE COURT. Every skein wound to the mark by the Bell. Slack is switched off. Thrice slack is earthed.',
    },
    {
      kind: 'sign', at: { x: 1640, y: 590 },
      text: 'THE TOY WORKS. By order of His Highness: what runs down is put away. Wind it, or the Box.',
    },
    {
      kind: 'sign', at: { x: 960, y: 640 },
      text: 'LICENSED FIRE. The vulcanizing works cures for the Grid alone. A flame carried out of this yard is theft.',
    },
    {
      kind: 'sign', at: { x: 1120, y: 1150 },
      text: 'THE BALL COURT. All balls are the property of the Toy Works. Play is by licence, on the half hour.',
    },
    { kind: 'chest', id: 'bounce-chest-plantation', at: { x: 90, y: 1300 }, coins: 110 },
    { kind: 'chest', id: 'bounce-chest-toybox', at: { x: 2290, y: 560 }, orbs: 2, open: { prince: 'sprocket' } },
  ],
  npcs: BOUNCE_NPCS,
  crowd: BOUNCE_CROWD,
};
