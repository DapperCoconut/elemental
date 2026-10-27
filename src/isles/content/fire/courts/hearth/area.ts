import Phaser from 'phaser';
import type { AreaDef, AreaPainter, Pt, Rect, Solid } from '../../../../IslesTypes';
import {
  archway, banner, barrel, brandSigil, crate, dim, flagstones, glow, groundFill, lamp, lit, pool, road, shadow, stroke,
  type G,
} from '../../../../art/IsleArt';
import {
  chimneyHouse, coalBunker, flameLick, hearthWaystone, proclamationBoard, retainingWall, smokeColumn, stairs,
  sootyLaundry, sweepLadder, titheBrazier,
} from './art';
import {
  ASH, ASH_DARK, ASH_LIT, BRAND, BRICK, BRICK_DARK, EMBER, EMBER_DARK, EMBER_LIT, GLOW, IRON, KINDLE, KINDLE_GOLD,
  RENDER, SLATE, SOOT, SOOT_SOFT, WATER, WATER_DEEP, WATER_LIT,
} from './palette';
import { HEARTH_NPCS, HEARTH_CROWD } from './npcs';

/**
 * The Hearth Court — a terraced chimney town climbing north from Emberport.
 *
 * Three terraces held up by sooted retaining walls:
 * • the **lower square** (south): the cistern, the big tithe brazier, Ottilie's shop, the
 *   waystone at the Emberport road;
 * • the **middle terrace**: the long cross street from the Boilerworks (west) to the Corona
 *   road (east), chimney houses packed both sides, the sweeps' yard and the brandwright's forge;
 * • the **upper terrace**: the lamp lane, the tithe office, the Great Hearth, and Prince
 *   Kindle's manor at the top with the kept flame burning on its stack. The Caldera road leaves
 *   north up the middle.
 *
 * Every house has two or three chimney pots and every pot smokes. The only warm colour in the
 * town is fire someone was ordered to keep.
 */

export const HEARTH_W = 2400;
export const HEARTH_H = 1700;

/** Foot lines of the two retaining walls. */
const WALL1 = 580;
const WALL2 = 1100;
const WALL_H = 46;

/** Stair gaps through each wall: centre x, width. */
const STAIRS1: [number, number][] = [[1200, 140], [1700, 120], [520, 100]];
const STAIRS2: [number, number][] = [[1200, 140], [430, 100], [1950, 100]];

/** The cistern basin — the court's fishing water. */
export const CISTERN: Rect = { x: 1380, y: 1240, w: 300, h: 170 };
/** The Great Hearth on the upper terrace (Gilda's, and the quest's visit point). */
export const GREAT_HEARTH: Pt = { x: 900, y: 300 };
/** Kindle's manor front. */
export const MANOR: Pt = { x: 1700, y: 380 };

type Piece = NonNullable<AreaPainter['pieces']>[number];

const pieces: Piece[] = [];
const solids: Solid[] = [];
/** Chimney-pot smoke sources, for `animateOver`. */
const smokes: { x: number; y: number; seed: number; s: number }[] = [];
/** Live flames, for `animate`. */
const flames: { x: number; y: number; s: number; seed: number }[] = [];
/** Lamp lane glows. */
const lampGlows: Pt[] = [];

// ── Builders ─────────────────────────────────────────────────────────

function addHouse(x: number, y: number, w: number, h: number, wall: number, pots = 2): void {
  pieces.push({ x, y, w: w + 30, h: h * 1.6 + 40, draw: (g, rng) => chimneyHouse(g, x, y, w, h, wall, rng, pots) });
  solids.push({ kind: 'rect', x: x - w / 2, y: y - 36, w, h: 36 });
  for (let i = 0; i < pots; i++) {
    const cx = x - w * 0.3 + (w * 0.6 * (i + 0.5)) / pots;
    smokes.push({ x: cx, y: y - h - h * 0.42 * 0.8 - 22, seed: x * 0.13 + i * 7 + y * 0.01, s: 0.8 + ((x + i * 31) % 5) / 10 });
  }
}

function addBrazier(x: number, y: number, s = 1): void {
  pieces.push({ x, y, w: 40 * s, h: 50 * s, draw: (g) => titheBrazier(g, x, y, s) });
  solids.push({ kind: 'circle', x, y: y - 4, r: 16 * s });
  flames.push({ x, y: y - 34 * s, s, seed: x * 0.7 });
}

function addLamp(x: number, y: number): void {
  pieces.push({ x, y, w: 30, h: 64, draw: (g) => lamp(g, x, y, GLOW, IRON) });
  lampGlows.push({ x, y: y - 52 });
}

/** Kindle's manor: three storeys of soot-black stone, one great stack with the kept flame on it. */
function drawManor(g: G, x: number, y: number, rng: () => number): void {
  const w = 380, h = 200;
  shadow(g, x, y + 6, w * 1.2, 30);
  g.fillStyle(SOOT, 1); g.fillRect(x - w / 2 - 3, y - h - 3, w + 6, h + 6);
  g.fillStyle(0x34302d, 1); g.fillRect(x - w / 2, y - h, w, h);
  // Dressed stone courses.
  for (let row = 0; row < h / 16; row++) {
    const ry = y - h + row * 16 + 2;
    const off = (row % 2) * 22;
    for (let bx = x - w / 2 + off - 22; bx < x + w / 2; bx += 44) {
      const a = Math.max(x - w / 2, bx + 1), b = Math.min(x + w / 2, bx + 42);
      if (b <= a) continue;
      g.fillStyle(rng() < 0.5 ? 0x3c3834 : 0x2e2a27, 1);
      g.fillRect(a, ry, b - a, 14);
    }
  }
  // Wings step forward either side.
  for (const side of [-1, 1]) {
    const wx = x + side * (w / 2 - 50);
    g.fillStyle(SOOT, 1); g.fillRect(wx - 52, y - h - 22, 104, h + 22);
    g.fillStyle(0x3a3532, 1); g.fillRect(wx - 50, y - h - 20, 100, h + 20);
    g.fillStyle(dim(SLATE, 0.3), 1); g.fillTriangle(wx - 60, y - h - 18, wx + 60, y - h - 18, wx, y - h - 70);
    g.fillStyle(SLATE, 1); g.fillTriangle(wx - 54, y - h - 20, wx + 54, y - h - 20, wx, y - h - 66);
  }
  // Central roof and the great stack.
  g.fillStyle(SLATE, 1); g.fillRect(x - w / 2 + 96, y - h - 24, w - 192, 24);
  g.fillStyle(BRICK_DARK, 1); g.fillRect(x - 26, y - h - 150, 52, 130);
  g.fillStyle(BRICK, 1); g.fillRect(x - 23, y - h - 148, 46, 126);
  for (let k = 0; k < 9; k++) { g.fillStyle(BRICK_DARK, 0.6); g.fillRect(x - 23, y - h - 140 + k * 14, 46, 2); }
  g.fillStyle(IRON, 1); g.fillRect(x - 32, y - h - 160, 64, 12);
  g.fillStyle(KINDLE_GOLD, 0.9); g.fillRect(x - 30, y - h - 158, 60, 3);
  brandSigil(g, x, y - h - 100, 15, KINDLE_GOLD, 0.95);
  // Windows: tall, barred, every one lit.
  for (let fl = 0; fl < 3; fl++) {
    for (let i = 0; i < 6; i++) {
      const wx = x - w / 2 + 34 + i * ((w - 68) / 5);
      const wy = y - h + 30 + fl * 52;
      if (fl === 2 && Math.abs(wx - x) < 40) continue;
      g.fillStyle(IRON, 1); g.fillRect(wx - 10, wy - 2, 20, 32);
      g.fillStyle(GLOW, 0.12); g.fillCircle(wx, wy + 14, 22);
      g.fillStyle(GLOW, 0.9); g.fillRect(wx - 8, wy, 16, 28);
      g.fillStyle(IRON, 1);
      for (let b = -1; b <= 1; b++) g.fillRect(wx + b * 5 - 1, wy, 2, 28);
    }
  }
  // The door: double, iron-bound, a big brand.
  g.fillStyle(SOOT, 1); g.fillRoundedRect(x - 30, y - 64, 60, 64, { tl: 28, tr: 28, bl: 0, br: 0 });
  g.fillStyle(0x2b1c14, 1); g.fillRoundedRect(x - 26, y - 60, 52, 60, { tl: 25, tr: 25, bl: 0, br: 0 });
  g.fillStyle(IRON, 1); g.fillRect(x - 1, y - 60, 2, 60);
  for (const by of [-46, -24]) g.fillRect(x - 26, y + by, 52, 3);
  brandSigil(g, x, y - 36, 11, BRAND, 1);
  // Steps.
  g.fillStyle(dim(RENDER, 0.35), 1); g.fillRect(x - 44, y - 2, 88, 6);
  g.fillStyle(dim(RENDER, 0.25), 1); g.fillRect(x - 52, y + 4, 104, 6);
}

/** The Great Hearth — a communal fireplace the size of a house, its mouth open to the street. */
function drawGreatHearth(g: G, x: number, y: number, rng: () => number): void {
  shadow(g, x, y + 4, 190, 30);
  // Chimney breast.
  g.fillStyle(SOOT, 1); g.fillRect(x - 46, y - 220, 92, 140);
  g.fillStyle(0x4b4540, 1); g.fillRect(x - 42, y - 216, 84, 136);
  for (let k = 0; k < 10; k++) {
    g.fillStyle(k % 2 ? 0x3e3935 : 0x55504a, 1);
    g.fillRect(x - 42, y - 212 + k * 13, 84, 11);
  }
  g.fillStyle(IRON, 1); g.fillRect(x - 52, y - 228, 104, 12);
  // The body of the hearth.
  g.fillStyle(SOOT, 1); g.fillRect(x - 92, y - 96, 184, 98);
  g.fillStyle(0x58524b, 1); g.fillRect(x - 88, y - 92, 176, 92);
  for (let i = 0; i < 26; i++) {
    g.fillStyle(rng() < 0.5 ? 0x4c4741 : 0x645d55, 1);
    g.fillRect(x - 86 + rng() * 160, y - 90 + rng() * 80, 14, 8);
  }
  // Mantel.
  g.fillStyle(0x6b6158, 1); g.fillRect(x - 100, y - 104, 200, 14);
  g.fillStyle(lit(0x6b6158, 0.15), 1); g.fillRect(x - 100, y - 104, 200, 3);
  brandSigil(g, x, y - 97, 6, BRAND, 0.9);
  // Mouth.
  g.fillStyle(SOOT, 1); g.fillRoundedRect(x - 60, y - 76, 120, 76, { tl: 40, tr: 40, bl: 0, br: 0 });
  g.fillStyle(EMBER_DARK, 1); g.fillRect(x - 52, y - 14, 104, 12);
  for (let i = 0; i < 9; i++) { g.fillStyle(i % 2 ? EMBER : EMBER_DARK, 1); g.fillCircle(x - 44 + i * 11, y - 10, 5); }
  // Andirons.
  for (const s of [-1, 1]) {
    g.fillStyle(IRON, 1); g.fillRect(x + s * 36 - 3, y - 26, 6, 26);
    g.fillCircle(x + s * 36, y - 28, 5);
  }
}

/** The brandwright's open forge — where the King's irons are heated. */
function drawForge(g: G, x: number, y: number): void {
  shadow(g, x, y + 4, 200, 26);
  // Lean-to posts and roof.
  g.fillStyle(0x4a3828, 1);
  g.fillRect(x - 86, y - 110, 8, 110); g.fillRect(x + 78, y - 110, 8, 110);
  g.fillStyle(dim(SLATE, 0.2), 1);
  g.fillPoints([
    new Phaser.Geom.Point(x - 100, y - 104), new Phaser.Geom.Point(x + 100, y - 104),
    new Phaser.Geom.Point(x + 90, y - 140), new Phaser.Geom.Point(x - 90, y - 140),
  ], true);
  // Back wall.
  g.fillStyle(BRICK_DARK, 1); g.fillRect(x - 78, y - 100, 156, 70);
  // Forge bed with irons in it.
  g.fillStyle(SOOT, 1); g.fillRect(x - 60, y - 44, 70, 34);
  g.fillStyle(EMBER_DARK, 1); g.fillRect(x - 56, y - 46, 62, 8);
  for (let i = 0; i < 4; i++) {
    const ix = x - 50 + i * 15;
    g.lineStyle(3, IRON, 1); g.lineBetween(ix, y - 44, ix + 22, y - 76);
    brandSigil(g, ix, y - 44, 4, EMBER_LIT, 1);
  }
  // Anvil.
  g.fillStyle(IRON, 1);
  g.fillRect(x + 28, y - 30, 40, 10); g.fillRect(x + 38, y - 20, 20, 20);
  g.fillTriangle(x + 68, y - 30, x + 80, y - 26, x + 68, y - 22);
  g.fillStyle(lit(IRON, 0.25), 1); g.fillRect(x + 28, y - 30, 40, 2);
  // Quench trough.
  g.fillStyle(0x4a3828, 1); g.fillRect(x - 96, y - 18, 34, 18);
  g.fillStyle(WATER, 1); g.fillRect(x - 93, y - 16, 28, 5);
}

/** The cistern: a stone basin set into the square, with a hand pump and a chained ladle. */
function drawCisternFurniture(g: G): void {
  const r = CISTERN;
  // Hand pump at the north-east corner.
  const px = r.x + r.w + 8, py = r.y + 8;
  shadow(g, px, py, 24, 8);
  g.fillStyle(IRON, 1); g.fillRect(px - 5, py - 46, 10, 46);
  g.fillRect(px - 2, py - 54, 26, 5);
  g.fillRect(px - 10, py - 34, 16, 5);
  g.fillStyle(lit(IRON, 0.2), 1); g.fillRect(px - 5, py - 46, 10, 2);
  brandSigil(g, px, py - 24, 3.5, BRAND, 0.8);
}

// ── Layout ───────────────────────────────────────────────────────────

// Upper terrace: houses west and east, the lamp lane, the tithe office, the Great Hearth, the manor.
addHouse(160, 380, 130, 100, RENDER, 3);
addHouse(340, 380, 120, 112, BRICK, 2);
addHouse(600, 380, 130, 96, 0x6f675e, 2);
addHouse(2080, 380, 130, 104, BRICK, 3);
addHouse(2260, 380, 120, 96, RENDER, 2);
pieces.push({ x: GREAT_HEARTH.x, y: GREAT_HEARTH.y, w: 220, h: 240, draw: (g, rng) => drawGreatHearth(g, GREAT_HEARTH.x, GREAT_HEARTH.y, rng) });
solids.push({ kind: 'rect', x: GREAT_HEARTH.x - 92, y: GREAT_HEARTH.y - 50, w: 184, h: 50 });
flames.push({ x: GREAT_HEARTH.x, y: GREAT_HEARTH.y - 14, s: 2.4, seed: 3 });
smokes.push({ x: GREAT_HEARTH.x, y: GREAT_HEARTH.y - 230, seed: 99, s: 1.6 });
// Tithe office.
pieces.push({
  x: 1400, y: 400, w: 170, h: 170,
  draw: (g, rng) => {
    chimneyHouse(g, 1400, 400, 150, 104, 0x5b5550, rng, 1);
    g.fillStyle(0xd8ccb0, 1); g.fillRect(1356, 330, 88, 16);
    g.fillStyle(SOOT, 1);
    for (let i = 0; i < 6; i++) g.fillRect(1362 + i * 13, 335, 9, 6);
  },
});
solids.push({ kind: 'rect', x: 1325, y: 364, w: 150, h: 36 });
smokes.push({ x: 1400, y: 236, seed: 41, s: 1 });
pieces.push({ x: 1290, y: 470, w: 70, h: 80, draw: (g) => proclamationBoard(g, 1290, 470) });
// The manor.
pieces.push({ x: MANOR.x, y: MANOR.y, w: 460, h: 380, draw: (g, rng) => drawManor(g, MANOR.x, MANOR.y, rng) });
solids.push({ kind: 'rect', x: MANOR.x - 190, y: MANOR.y - 50, w: 380, h: 50 });
flames.push({ x: MANOR.x, y: MANOR.y - 362, s: 2.2, seed: 11 });
smokes.push({ x: MANOR.x, y: MANOR.y - 380, seed: 5, s: 2 });
for (const s of [-1, 1]) {
  const bx = MANOR.x + s * 150;
  pieces.push({
    x: bx, y: MANOR.y + 70, w: 40, h: 90,
    draw: (g) => banner(g, bx, MANOR.y + 70, KINDLE, IRON, (gg, cx, cy) => brandSigil(gg, cx, cy, 7, KINDLE_GOLD, 1)),
  });
}
// Lamp lane along the upper terrace.
for (const lx of [90, 260, 470, 760, 1060, 1340, 1560, 1860, 2180, 2330]) addLamp(lx, 530);
addBrazier(1040, 470, 1);
addBrazier(1980, 470, 1);
addBrazier(250, 470, 0.9);

// Middle terrace, north side of the cross street.
const rowA: [number, number, number, number][] = [
  [160, 120, 108, RENDER], [350, 130, 118, BRICK], [680, 140, 104, 0x6f675e], [880, 120, 122, BRICK],
  [1480, 130, 110, RENDER], [1860, 120, 120, BRICK], [2050, 140, 104, 0x6f675e], [2250, 120, 116, BRICK],
];
for (const [x, w, h, c] of rowA) addHouse(x, 760, w, h, c, (x % 3) + 1);
// South side.
const rowB: [number, number, number, number][] = [
  [170, 130, 104, BRICK], [620, 130, 112, RENDER], [800, 120, 100, BRICK], [1000, 130, 116, 0x6f675e],
  [1420, 130, 108, BRICK], [1600, 120, 100, RENDER], [1780, 130, 118, BRICK],
];
for (const [x, w, h, c] of rowB) addHouse(x, 1050, w, h, c, 2);
// The brandwright's forge (Ostra's) at the east end.
pieces.push({ x: 2230, y: 1050, w: 220, h: 160, draw: (g) => drawForge(g, 2230, 1050) });
solids.push({ kind: 'rect', x: 2140, y: 1010, w: 180, h: 40 });
flames.push({ x: 2205, y: 1050 - 46, s: 1.2, seed: 21 });
// Sweeps' yard (Mottle's): ladders against the walls.
pieces.push({ x: 755, y: 770, w: 40, h: 110, draw: (g) => sweepLadder(g, 755, 770, 100) });
pieces.push({ x: 948, y: 770, w: 40, h: 110, draw: (g) => sweepLadder(g, 948, 770, 108) });
pieces.push({ x: 2120, y: 772, w: 40, h: 100, draw: (g) => sweepLadder(g, 2120, 772, 92) });
addBrazier(1290, 790, 1);
addBrazier(1110, 790, 1);
addBrazier(300, 930, 0.9);
addBrazier(1880, 930, 0.9);
pieces.push({ x: 1540, y: 935, w: 30, h: 40, draw: (g) => barrel(g, 1540, 935, 12, 0x5a4330) });
pieces.push({ x: 1560, y: 945, w: 30, h: 40, draw: (g) => crate(g, 1565, 950, 11, 0x6d5238) });

// Lower terrace.
addHouse(200, 1300, 130, 104, BRICK, 2);
addHouse(420, 1300, 130, 96, RENDER, 1); // Sorrel's — one pot, and it does not smoke for long
addHouse(200, 1580, 130, 110, 0x6f675e, 2);
addHouse(2250, 1300, 130, 108, BRICK, 2);
addHouse(2080, 1600, 120, 100, RENDER, 2);
addHouse(2270, 1600, 120, 112, BRICK, 3);
// Ottilie's shop: a wide-fronted house with a hanging sign and wares on the step.
pieces.push({
  x: 1980, y: 1290, w: 200, h: 190,
  draw: (g, rng) => {
    chimneyHouse(g, 1980, 1290, 170, 110, 0x6a5547, rng, 2);
    g.fillStyle(0x4a3828, 1); g.fillRect(2052, 1196, 34, 4);
    g.fillStyle(0x7a5a3a, 1); g.fillRect(2058, 1200, 26, 20);
    brandSigil(g, 2071, 1210, 5, GLOW, 1);
    g.fillStyle(0xc4a46a, 1); g.fillRect(1902, 1270, 26, 16);
    g.fillStyle(EMBER, 0.7); g.fillCircle(1915, 1270, 4);
  },
});
solids.push({ kind: 'rect', x: 1895, y: 1254, w: 170, h: 36 });
smokes.push({ x: 1950, y: 1110, seed: 61, s: 1 }, { x: 2010, y: 1110, seed: 62, s: 1 });
// The big tithe brazier in the square, where Brask stands to count.
addBrazier(1010, 1330, 1.8);
addBrazier(700, 1200, 1);
addBrazier(1780, 1200, 1);
addBrazier(1780, 1620, 1);
pieces.push({ x: 560, y: 1500, w: 80, h: 70, draw: (g, rng) => coalBunker(g, 560, 1500, rng) });
solids.push({ kind: 'rect', x: 528, y: 1484, w: 64, h: 18 });
pieces.push({ x: 340, y: 1440, w: 240, h: 70, draw: (g, rng) => sootyLaundry(g, { x: 260, y: 1440 }, { x: 420, y: 1450 }, rng) });
pieces.push({ x: CISTERN.x + CISTERN.w + 8, y: CISTERN.y + 8, w: 40, h: 60, draw: (g) => drawCisternFurniture(g) });
solids.push({ kind: 'rect', x: CISTERN.x - 8, y: CISTERN.y - 8, w: CISTERN.w + 16, h: CISTERN.h + 16 });
pieces.push({ x: 1060, y: 1560, w: 60, h: 70, draw: (g) => hearthWaystone(g, 1060, 1560) });
solids.push({ kind: 'circle', x: 1060, y: 1552, r: 16 });
pieces.push({
  x: 1200, y: 1180, w: 240, h: 150,
  draw: (g) => archway(g, 1200, 1180, 130, 92, 0x55504a),
});
pieces.push({ x: 1440, y: 1600, w: 40, h: 40, draw: (g) => barrel(g, 1440, 1600, 13, 0x5a4330) });
pieces.push({ x: 1480, y: 1606, w: 40, h: 40, draw: (g) => crate(g, 1480, 1606, 12, 0x6d5238) });
for (const lx of [700, 1700]) addLamp(lx, 1640);

// ── Retaining walls (solids, leaving the stair gaps) ─────────────────

function wallSolids(y: number, gaps: [number, number][]): void {
  const cuts = gaps.map(([cx, w]) => [cx - w / 2, cx + w / 2]).sort((a, b) => a[0] - b[0]);
  let x = 0;
  for (const [a, b] of cuts) {
    if (a > x) solids.push({ kind: 'rect', x, y: y - WALL_H, w: a - x, h: WALL_H - 4 });
    x = b;
  }
  if (x < HEARTH_W) solids.push({ kind: 'rect', x, y: y - WALL_H, w: HEARTH_W - x, h: WALL_H - 4 });
}
wallSolids(WALL1, STAIRS1);
wallSolids(WALL2, STAIRS2);

// ── Painter ──────────────────────────────────────────────────────────

const inView = (x: number, y: number, v: Rect, m = 160): boolean =>
  x > v.x - m && x < v.x + v.w + m && y > v.y - m && y < v.y + v.h + m;

const painter: AreaPainter = {
  ground(g, rng) {
    // Ash everywhere, each terrace a touch lighter than the one below it (higher, less soot).
    groundFill(g, { x: 0, y: 0, w: HEARTH_W, h: WALL1 }, 0x585450, ASH_DARK, ASH_LIT, rng, 1.1);
    groundFill(g, { x: 0, y: WALL1, w: HEARTH_W, h: WALL2 - WALL1 }, ASH, ASH_DARK, ASH_LIT, rng, 1.1);
    groundFill(g, { x: 0, y: WALL2, w: HEARTH_W, h: HEARTH_H - WALL2 }, 0x514c48, SOOT_SOFT, ASH_LIT, rng, 1.2);

    // Roads: the climb north, the cross street, the lamp lane, side lanes to the side stairs.
    road(g, [{ x: 1200, y: HEARTH_H }, { x: 1200, y: 0 }], 110, 0x4a4541, SOOT, ASH_LIT, rng);
    road(g, [{ x: 0, y: 840 }, { x: HEARTH_W, y: 840 }], 120, 0x4a4541, SOOT, ASH_LIT, rng);
    road(g, [{ x: 60, y: 480 }, { x: HEARTH_W - 60, y: 480 }], 84, 0x4f4a46, SOOT, ASH_LIT, rng);
    road(g, [{ x: 520, y: 480 }, { x: 520, y: 840 }], 70, 0x4a4541, SOOT, ASH_LIT, rng);
    road(g, [{ x: 1700, y: 400 }, { x: 1700, y: 840 }], 80, 0x4a4541, SOOT, ASH_LIT, rng);
    road(g, [{ x: 430, y: 840 }, { x: 430, y: 1240 }, { x: 640, y: 1360 }], 70, 0x4a4541, SOOT, ASH_LIT, rng);
    road(g, [{ x: 1950, y: 840 }, { x: 1950, y: 1330 }], 70, 0x4a4541, SOOT, ASH_LIT, rng);
    road(g, [{ x: GREAT_HEARTH.x, y: 480 }, { x: GREAT_HEARTH.x, y: GREAT_HEARTH.y + 10 }], 120, 0x4f4a46, SOOT, ASH_LIT, rng);

    // The lower square — big ash flags around the cistern.
    flagstones(g, { x: 640, y: 1170, w: 1200, h: 480 }, 46, 0x5a5550, SOOT, rng);
    g.lineStyle(6, SOOT, 0.6); g.strokeRect(640, 1170, 1200, 480);
    // A brand set into the square in iron, under the tithe brazier.
    brandSigil(g, 1010, 1420, 46, 0x2c2826, 1);
    brandSigil(g, 1010, 1420, 44, dim(BRAND, 0.55), 0.35);
    // The plaza before the manor.
    flagstones(g, { x: 1490, y: 380, w: 420, h: 150 }, 38, 0x504b47, SOOT, rng);
    // The Great Hearth's apron, scorched.
    flagstones(g, { x: GREAT_HEARTH.x - 140, y: GREAT_HEARTH.y - 20, w: 280, h: 180 }, 34, 0x4d4743, SOOT, rng);
    for (let i = 0; i < 14; i++) {
      g.fillStyle(SOOT, 0.12 + rng() * 0.12);
      g.fillEllipse(GREAT_HEARTH.x + (rng() - 0.5) * 220, GREAT_HEARTH.y + 30 + rng() * 120, 50 + rng() * 60, 18 + rng() * 14);
    }

    // The cistern.
    pool(g, CISTERN, WATER_DEEP, WATER, 0x5d5751, rng);
    g.lineStyle(3, IRON, 0.9);
    for (let gx = CISTERN.x + 30; gx < CISTERN.x + CISTERN.w - 20; gx += 30) {
      g.lineBetween(gx, CISTERN.y + 6, gx, CISTERN.y + 22);
    }
    g.fillStyle(SOOT, 0.35); g.fillRect(CISTERN.x + 14, CISTERN.y + CISTERN.h - 30, CISTERN.w - 28, 6);

    // Gutters running down every street, black with soot.
    for (const yy of [790, 892, 1640]) {
      stroke(g, [{ x: 40, y: yy }, { x: HEARTH_W - 40, y: yy }], 4, SOOT, 0.55);
    }
    for (let i = 0; i < 60; i++) {
      g.fillStyle(SOOT, 0.2 + rng() * 0.2);
      g.fillEllipse(rng() * HEARTH_W, rng() * HEARTH_H, 30 + rng() * 80, 10 + rng() * 22);
    }
    // Spilled coal and cold cinders by the doors.
    for (let i = 0; i < 220; i++) {
      g.fillStyle(rng() < 0.85 ? SOOT : EMBER_DARK, 0.7);
      g.fillCircle(rng() * HEARTH_W, rng() * HEARTH_H, 1 + rng() * 2.2);
    }

    // Retaining walls and their stairs.
    retainingWall(g, 0, HEARTH_W, WALL1, WALL_H, rng);
    retainingWall(g, 0, HEARTH_W, WALL2, WALL_H, rng);
    for (const [cx, w] of STAIRS1) stairs(g, cx, WALL1 + 4, w, WALL_H + 8);
    for (const [cx, w] of STAIRS2) stairs(g, cx, WALL2 + 4, w, WALL_H + 8);
    // A brand chiselled into the wall at each main stair — you are entering the next tithe ward.
    brandSigil(g, 1200 - 96, WALL1 - 24, 9, dim(BRAND, 0.3), 0.8);
    brandSigil(g, 1200 + 96, WALL2 - 24, 9, dim(BRAND, 0.3), 0.8);
  },

  pieces,

  animate(g, t, view) {
    // Every brazier, the Great Hearth and the manor stack burn.
    for (const f of flames) {
      if (!inView(f.x, f.y, view)) continue;
      flameLick(g, f.x, f.y, t, f.s, f.seed);
    }
    // Lamp glows breathe.
    for (const l of lampGlows) {
      if (!inView(l.x, l.y, view)) continue;
      const a = 0.05 + Math.sin(t * 2.3 + l.x) * 0.015;
      glow(g, l.x, l.y + 40, 60, GLOW, a, 3);
    }
    // Cistern: slow sooty ripples and the odd crayfish bubble.
    if (inView(CISTERN.x + CISTERN.w / 2, CISTERN.y + CISTERN.h / 2, view, 300)) {
      for (let i = 0; i < 5; i++) {
        const ph = (t * 0.35 + i / 5) % 1;
        const cx = CISTERN.x + 40 + ((i * 67) % (CISTERN.w - 80));
        const cy = CISTERN.y + 40 + ((i * 41) % (CISTERN.h - 70));
        g.lineStyle(1.2, WATER_LIT, (1 - ph) * 0.45);
        g.strokeEllipse(cx, cy, 10 + ph * 46, 4 + ph * 14);
      }
      const bub = (t * 0.9) % 1;
      g.fillStyle(WATER_LIT, 0.6 * (1 - bub));
      g.fillCircle(CISTERN.x + 220, CISTERN.y + 110 - bub * 8, 2 + bub * 2);
    }
    // Sorrel's dying hearth: one window guttering.
    if (inView(420, 1240, view)) {
      const k = 0.35 + Math.max(0, Math.sin(t * 7.3) * Math.sin(t * 2.1)) * 0.5;
      g.fillStyle(EMBER_LIT, k * 0.5); g.fillRect(420 - 39, 1300 - 46, 12, 16);
    }
  },

  animateOver(g, t, view) {
    for (const s of smokes) {
      if (!inView(s.x, s.y, view, 220)) continue;
      smokeColumn(g, s.x, s.y, t, s.seed, s.s);
    }
    // Sparks off the forge.
    if (inView(2205, 1000, view)) {
      for (let i = 0; i < 6; i++) {
        const ph = (t * 1.3 + i / 6) % 1;
        g.fillStyle(EMBER_LIT, 1 - ph);
        g.fillCircle(2205 + Math.sin(i * 2.7) * 20 * ph, 1000 - ph * 60, 1.6);
      }
    }
  },
};

export const HEARTH_AREA: AreaDef = {
  id: 'hearth',
  isle: 'fire',
  court: 'hearth',
  name: 'The Hearth Court',
  subtitle: 'Keep your fire, or the Kiln keeps you',
  w: HEARTH_W,
  h: HEARTH_H,
  bg: 0x3a3633,
  accent: EMBER,
  weather: 'ash',
  spawn: { x: 1200, y: 1600 },
  painter,
  solids,
  exits: [
    { side: 's', to: 'emberport', label: 'Down to Emberport' },
    { side: 'n', to: 'caldera', label: 'Up to the Caldera' },
    { side: 'w', to: 'boilerworks', label: 'The Boilerworks' },
    { side: 'e', to: 'corona', label: 'The Corona road' },
  ],
  pois: [
    { kind: 'waystone', at: { x: 1060, y: 1590 } },
    { kind: 'prince', id: 'kindle', at: { x: MANOR.x, y: MANOR.y + 50 } },
    { kind: 'water', id: 'hearth-cistern', shape: CISTERN, fishery: 'hearth-cistern' },
    { kind: 'encounter', id: 'hearth-ember-tithe' },
    { kind: 'encounter', id: 'hearth-soot-season' },
    { kind: 'encounter', id: 'hearth-three-brands' },
    { kind: 'encounter', id: 'hearth-curfew' },
    { kind: 'encounter', id: 'hearth-keeper' },
    { kind: 'sign', at: { x: 1290, y: 500 }, text: 'BY ORDER OF PRINCE KINDLE: every hearth lit by dusk. A cold hearth is a confession.' },
    { kind: 'sign', at: { x: 1270, y: 1560 }, text: 'THE HEARTH COURT. Upper terrace: the Prince. Middle: the cross street. Mind the tithe.' },
    { kind: 'chest', id: 'hearth-chest-flue', at: { x: 2350, y: 950 }, coins: 60 },
    { kind: 'chest', id: 'hearth-chest-manor', at: { x: 2330, y: 450 }, orbs: 2, open: { prince: 'kindle' } },
  ],
  npcs: HEARTH_NPCS,
  crowd: HEARTH_CROWD,
};
