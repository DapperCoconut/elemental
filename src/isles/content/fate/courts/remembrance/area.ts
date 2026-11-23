import type { AreaDef, AreaPainter, Pt, Rect, Solid } from '../../../../IslesTypes';
import { flagstones, glow, groundFill, motes, type G } from '../../../../art/IsleArt';
import {
  archive, bench, blankCottage, bottleStall, boxCamera, checkerRoad, ferryLanding, fmn, fmnBed, frame, gallery,
  greenLamp, ledgerOffice, letheBasin, mistBank, pawnshop, photo, remWaystone, sepiaLawn, suitHedge, ticketBoard,
  unclaimed, unclaimedCrate, washhouse,
} from './art';
import {
  GILT, GILT_LIT, LAMP_LIGHT, LAWN, LAWN_DARK, LAWN_LIT, LETHE_LIT, MEMORY_COLORS, PAPER, REMEMBRANCE_COLOR, SEPIA_DEEP,
  SEPIA_LIT, SEPIA_PALE, STONE, STONE_DARK,
} from './palette';
import { REMEMBRANCE_CROWD, REMEMBRANCE_NPCS } from './npcs';

/**
 * The Remembrance Court — the memory-pawnbrokers' town, east of the Card Court.
 *
 * Read it from the Card Court road in:
 * • **Pawn Row** (west): the black-and-red road comes in past the waystone between pawnshops,
 *   their bow windows crowded with bottled memories, three gilt balls over every door; market
 *   stalls of bottles along the south kerb, and the board of lapsed tickets;
 * • **the Portrait Gallery** (north-west): a long stone hall hung with portraits — some with faces,
 *   some forgotten to bare canvas — and a photographer's camera on its forecourt;
 * • **Redemption Square** (centre): round, paved, with *the Unclaimed* in the middle — a statue
 *   whose face has been chiselled smooth because no one remembers who she was;
 * • **the Archive** (north): Prince Hindsight's rotunda up the Archive Walk, a wall of catalogue
 *   drawers under a gilt dome and a great spyglass on the roof turned the wrong way round;
 * • **the Ledger Office and the Unclaimed Shelves** (north-east): where pledges are written down,
 *   and where the bottles nobody redeemed wait in crates to be washed;
 * • **the Lethe** (east): the pale pool where lapsed memories are poured out and wrung from sheets
 *   in the washhouse, with the ferry landing on its south bank;
 * • **the forget-me-not fields** (south-west) and **the Quiet Street** (south-east): blue fields
 *   people walk in to keep hold of things, and the cottages of those who pawned too much, their
 *   windows painted white. The south road runs on to the Mind Court.
 */

export const REM_W = 2400;
export const REM_H = 1600;

const ROW_Y = 800;
const MAIN_X = 1200;

/** Redemption Square and the Unclaimed at its heart. */
export const SQUARE: Pt = { x: 1200, y: 800 };
const SQUARE_R = 170;
/** The Archive — the middle of its front step. */
export const ARCHIVE: Pt = { x: 1200, y: 360 };
/** The Lethe — the court's fishing water. */
export const LETHE_POOL: Rect = { x: 1720, y: 1000, w: 440, h: 220 };
/** The Unclaimed Shelves, where lapsed bottles wait for the Lethe. */
export const SHELVES: Pt = { x: 1600, y: 560 };
/** The Ledger Office's step. */
export const LEDGER: Pt = { x: 1950, y: 560 };
/** The Portrait Gallery's door. */
export const GALLERY: Pt = { x: 520, y: 470 };
/** The ferry landing on the Lethe's south bank. */
export const LANDING: Pt = { x: 1930, y: 1250 };
/** The Beck cottage on the Quiet Street. */
export const BECK_COTTAGE: Pt = { x: 1500, y: 1440 };
/** The forget-me-not fields. */
export const FIELDS: { x: number; y: number; rx: number; ry: number }[] = [
  { x: 330, y: 1130, rx: 140, ry: 70 },
  { x: 700, y: 1120, rx: 170, ry: 66 },
  { x: 300, y: 1390, rx: 150, ry: 80 },
  { x: 700, y: 1400, rx: 190, ry: 84 },
  { x: 1000, y: 1390, rx: 90, ry: 60 },
];

type Piece = NonNullable<AreaPainter['pieces']>[number];

const pieces: Piece[] = [];
const solids: Solid[] = [];
/** Shop windows whose bottles throb in `animate`. */
const windows: { x: number; y: number; w: number; h: number; s: number }[] = [];
/** Lamps that glow at dusk in `animate`. */
const lamps: Pt[] = [];

function addPiece(x: number, y: number, w: number, h: number, draw: (g: G, rng: () => number) => void, solid?: Solid, when?: Piece['when']): void {
  pieces.push(when ? { x, y, w, h, draw, when } : { x, y, w, h, draw });
  if (solid) solids.push(solid);
}

// ── Layout ───────────────────────────────────────────────────────────

// The Archive up the Archive Walk.
addPiece(ARCHIVE.x, ARCHIVE.y, 520, 380, (g) => archive(g, ARCHIVE.x, ARCHIVE.y, 420, 150, 1.7),
  { kind: 'rect', x: ARCHIVE.x - 214, y: ARCHIVE.y - 40, w: 428, h: 34 });
// After the Prince falls: a banner over the steps, every ticket redeemed.
addPiece(ARCHIVE.x, ARCHIVE.y + 6, 220, 140, (g) => {
  g.fillStyle(0x2a2420, 1); g.fillRect(ARCHIVE.x - 96, ARCHIVE.y - 120, 4, 120); g.fillRect(ARCHIVE.x + 92, ARCHIVE.y - 120, 4, 120);
  g.fillStyle(0x2f6a4a, 1); g.fillRect(ARCHIVE.x - 92, ARCHIVE.y - 116, 184, 22);
  g.lineStyle(1.5, GILT, 1); g.strokeRect(ARCHIVE.x - 90, ARCHIVE.y - 114, 180, 18);
  for (let i = 0; i < 14; i++) { g.fillStyle(GILT_LIT, 1); g.fillRect(ARCHIVE.x - 78 + i * 11.5, ARCHIVE.y - 109, 7, 8); }
}, undefined, { prince: 'hindsight' });
for (const k of [-1, 1]) {
  const x = ARCHIVE.x + k * 130, y = ARCHIVE.y + 70;
  addPiece(x, y, 30, 90, (g) => greenLamp(g, x, y), { kind: 'circle', x, y: y - 3, r: 6 });
  lamps.push({ x, y });
  const hx = ARCHIVE.x + k * 300, hy = ARCHIVE.y + 40;
  addPiece(hx, hy, 50, 60, (g) => suitHedge(g, hx, hy, k < 0 ? 0 : 1, 1.2), { kind: 'circle', x: hx, y: hy - 6, r: 18 });
}

// Pawn Row: four shops along the north kerb, stalls and the ticket board on the south.
const SHOPS: [number, number][] = [[250, 0], [460, 1], [670, 2], [880, 3]];
for (const [x, seed] of SHOPS) {
  const y = 740, w = 176, h = 112;
  addPiece(x, y, w + 40, h * 1.6, (g, rng) => pawnshop(g, x, y, w, h, seed, rng), { kind: 'rect', x: x - w / 2, y: y - 34, w, h: 34 });
  windows.push({ x: x - w / 2 + 10, y: y - h + 30, w: w * 0.58, h: h - 52, s: seed * 0.37 });
}
for (const [x, stripe] of [[330, 0x8c4a3c], [610, 0x3a302a]] as [number, number][]) {
  addPiece(x, 905, 130, 120, (g, rng) => bottleStall(g, x, 905, rng, stripe), { kind: 'rect', x: x - 54, y: 875, w: 108, h: 30 });
}
addPiece(800, 900, 80, 100, (g, rng) => ticketBoard(g, 800, 900, rng), { kind: 'rect', x: 772, y: 892, w: 56, h: 8 });
for (const x of [160, 560, 1000]) {
  addPiece(x, 860, 30, 90, (g) => greenLamp(g, x, 860), { kind: 'circle', x, y: 857, r: 6 });
  lamps.push({ x, y: 860 });
}
addPiece(130, 920, 50, 70, (g) => remWaystone(g, 130, 920), { kind: 'circle', x: 130, y: 914, r: 17 });

// The Portrait Gallery and its forecourt.
addPiece(GALLERY.x, GALLERY.y, 480, 280, (g, rng) => gallery(g, GALLERY.x, GALLERY.y, 440, 150, rng),
  { kind: 'rect', x: GALLERY.x - 222, y: GALLERY.y - 34, w: 444, h: 34 });
addPiece(790, 560, 70, 100, (g) => boxCamera(g, 790, 560), { kind: 'circle', x: 790, y: 556, r: 12 });
// Oriel's easel and a stack of frames.
addPiece(300, 560, 60, 90, (g) => {
  g.lineStyle(2.5, 0x5a3e28, 1); g.lineBetween(300, 500, 284, 560); g.lineBetween(300, 500, 316, 560); g.lineBetween(300, 500, 306, 556);
  frame(g, 300, 520, 40, 46, MEMORY_COLORS[0], 0.6);
  g.fillStyle(0x5a3e28, 1); g.fillRect(278, 544, 44, 4);
  frame(g, 336, 548, 26, 30, null); frame(g, 344, 552, 26, 30, null);
}, { kind: 'circle', x: 300, y: 556, r: 14 });
for (const [x, y, s] of [[150, 640, 2], [880, 640, 3], [150, 340, 1]] as [number, number, 0 | 1 | 2 | 3][]) {
  addPiece(x, y, 50, 60, (g) => suitHedge(g, x, y, s, 1.1), { kind: 'circle', x, y: y - 6, r: 16 });
}

// Redemption Square: the Unclaimed, benches round her.
addPiece(SQUARE.x, SQUARE.y + 30, 140, 180, (g, rng) => unclaimed(g, SQUARE.x, SQUARE.y + 30, rng), { kind: 'circle', x: SQUARE.x, y: SQUARE.y + 16, r: 46 });
for (const a of [0.7, 2.45, 3.85, 5.6]) {
  const x = SQUARE.x + Math.cos(a) * (SQUARE_R - 34), y = SQUARE.y + Math.sin(a) * (SQUARE_R - 34) * 0.85 + 10;
  addPiece(x, y, 70, 50, (g) => bench(g, x, y));
}

// The Unclaimed Shelves and the Ledger Office (north-east).
for (const [x, y] of [[1540, 560], [1660, 560]] as [number, number][]) {
  addPiece(x, y, 130, 120, (g, rng) => bottleStall(g, x, y, rng, 0x5e4a3a), { kind: 'rect', x: x - 54, y: y - 30, w: 108, h: 30 });
}
for (const [x, y] of [[1500, 640], [1550, 650], [1700, 640]] as [number, number][]) {
  addPiece(x, y, 50, 40, (g, rng) => unclaimedCrate(g, x, y, rng), { kind: 'rect', x: x - 20, y: y - 14, w: 40, h: 14 });
}
addPiece(LEDGER.x, LEDGER.y, 180, 300, (g, rng) => ledgerOffice(g, LEDGER.x, LEDGER.y, rng), { kind: 'rect', x: LEDGER.x - 65, y: LEDGER.y - 30, w: 130, h: 30 });
for (const [x, w, h] of [[2180, 120, 80], [1760, 110, 74]] as [number, number, number][]) {
  addPiece(x, 520, w + 20, h * 1.8, (g, rng) => blankCottage(g, x, 520, w, h, rng, x > 2000), { kind: 'rect', x: x - w / 2, y: 492, w, h: 28 });
}
addPiece(2300, 700, 30, 90, (g) => greenLamp(g, 2300, 700), { kind: 'circle', x: 2300, y: 697, r: 6 });
lamps.push({ x: 2300, y: 700 });

// The Lethe: the washhouse on the north bank, the ferry landing on the south.
addPiece(1980, 965, 260, 170, (g, rng) => washhouse(g, 1980, 965, rng), { kind: 'rect', x: 1870, y: 935, w: 220, h: 30 });
addPiece(LANDING.x, LANDING.y - 6, 120, 120, (g) => ferryLanding(g, LANDING.x, LANDING.y - 6), { kind: 'rect', x: LANDING.x - 40, y: LANDING.y - 20, w: 10, h: 14 });
solids.push({ kind: 'rect', x: LETHE_POOL.x - 16, y: LETHE_POOL.y - 16, w: LETHE_POOL.w + 32, h: LETHE_POOL.h + 32 });
for (const [x, y] of [[1660, 980], [2230, 1120]] as [number, number][]) {
  addPiece(x, y, 30, 90, (g) => greenLamp(g, x, y), { kind: 'circle', x, y: y - 3, r: 6 });
  lamps.push({ x, y });
}

// The Quiet Street: cottages of the forgetful, windows painted white.
const COTTAGES: [number, number, number][] = [[1500, 120, 78], [1680, 110, 72], [1860, 124, 80], [2050, 112, 74], [2230, 118, 78]];
for (const [x, w, h] of COTTAGES) {
  addPiece(x, 1420, w + 20, h * 1.8, (g, rng) => blankCottage(g, x, 1420, w, h, rng, x === BECK_COTTAGE.x), { kind: 'rect', x: x - w / 2, y: 1392, w, h: 28 });
}
for (const x of [1590, 1960, 2140]) {
  addPiece(x, 1530, 70, 50, (g) => bench(g, x, 1530));
}

// The forget-me-not fields: a few hedges and a bench along the field path.
addPiece(500, 1300, 70, 50, (g) => bench(g, 500, 1300));
addPiece(900, 1300, 70, 50, (g) => bench(g, 900, 1300));
for (const [x, y, s] of [[160, 1250, 0], [1060, 1120, 3], [1060, 1520, 1]] as [number, number, 0 | 1 | 2 | 3][]) {
  addPiece(x, y, 50, 60, (g) => suitHedge(g, x, y, s, 1.1), { kind: 'circle', x, y: y - 6, r: 16 });
}
for (const [x, y] of [[1140, 1060], [1260, 1300], [1310, 1530]] as [number, number][]) {
  addPiece(x, y, 30, 90, (g) => greenLamp(g, x, y), { kind: 'circle', x, y: y - 3, r: 6 });
  lamps.push({ x, y });
}

// ── The town's edge: a low stone wall round the north, a hedge along the south ──
solids.push(
  { kind: 'rect', x: 0, y: 0, w: REM_W, h: 40 },
  { kind: 'rect', x: 0, y: REM_H - 30, w: MAIN_X - 90, h: 30 },
  { kind: 'rect', x: MAIN_X + 90, y: REM_H - 30, w: REM_W - MAIN_X - 90, h: 30 },
  { kind: 'rect', x: REM_W - 30, y: 0, w: 30, h: REM_H },
  { kind: 'rect', x: 0, y: 0, w: 24, h: ROW_Y - 110 },
  { kind: 'rect', x: 0, y: ROW_Y + 110, w: 24, h: REM_H - ROW_Y - 110 },
);
addPiece(REM_W / 2, 40, REM_W, 60, (g) => {
  g.fillStyle(STONE_DARK, 1); g.fillRect(0, 0, REM_W, 40);
  g.fillStyle(STONE, 1); g.fillRect(0, 0, REM_W, 34);
  for (let x = 0; x < REM_W; x += 46) { g.fillStyle(STONE_DARK, 0.5); g.fillRect(x, 8, 2, 26); g.fillStyle(STONE, 1); g.fillRect(x, 0, 30, 8); }
});
for (const [x0, x1] of [[0, MAIN_X - 90], [MAIN_X + 90, REM_W]] as [number, number][]) {
  addPiece((x0 + x1) / 2, REM_H, x1 - x0, 50, (g) => {
    for (let x = x0; x < x1; x += 18) {
      g.fillStyle(0x3e5232, 1); g.fillCircle(x + 9, REM_H - 16, 15);
      g.fillStyle(0x52683e, 1); g.fillCircle(x + 7, REM_H - 20, 10);
      if ((x / 18) % 3 === 0) fmn(g, x + 10, REM_H - 22, 1.6, 0.9);
    }
  });
}

// ── The painter ──────────────────────────────────────────────────────

const painter: AreaPainter = {
  ground(g, rng) {
    const W = REM_W, H = REM_H;
    g.fillStyle(LAWN, 1); g.fillRect(0, 0, W, H);
    groundFill(g, { x: 0, y: 0, w: W, h: H }, LAWN, LAWN_LIT, LAWN_DARK, rng, 0.6);
    sepiaLawn(g, { x: 0, y: 0, w: W, h: H }, rng);

    // The forget-me-not fields, then the gallery forecourt's flags.
    for (const f of FIELDS) fmnBed(g, f.x, f.y, f.rx, f.ry, rng);
    flagstones(g, { x: GALLERY.x - 240, y: GALLERY.y - 4, w: 480, h: 110 }, 26, STONE, STONE_DARK, rng);
    flagstones(g, { x: ARCHIVE.x - 260, y: ARCHIVE.y - 6, w: 520, h: 110 }, 30, STONE, STONE_DARK, rng);

    // Roads: Pawn Row, the Archive Walk, the east lane, the south road, the field path, the Quiet Street.
    checkerRoad(g, { x: 0, y: ROW_Y - 40, w: SQUARE.x - SQUARE_R + 20, h: 80 }, 40, rng);
    checkerRoad(g, { x: MAIN_X - 40, y: ARCHIVE.y + 90, w: 80, h: SQUARE.y - SQUARE_R - ARCHIVE.y - 70 }, 40, rng);
    checkerRoad(g, { x: SQUARE.x + SQUARE_R - 20, y: ROW_Y - 36, w: W - SQUARE.x - SQUARE_R - 40, h: 72 }, 36, rng);
    checkerRoad(g, { x: MAIN_X - 40, y: SQUARE.y + SQUARE_R - 20, w: 80, h: H - SQUARE.y - SQUARE_R + 20 }, 40, rng);
    checkerRoad(g, { x: 140, y: 1230, w: MAIN_X - 180, h: 44 }, 22, rng);
    checkerRoad(g, { x: MAIN_X + 40, y: 1450, w: W - MAIN_X - 120, h: 50 }, 25, rng);
    checkerRoad(g, { x: 1620, y: ROW_Y + 36, w: 44, h: 1450 - ROW_Y - 36 }, 22, rng);
    checkerRoad(g, { x: LEDGER.x - 22, y: LEDGER.y, w: 44, h: ROW_Y - 36 - LEDGER.y }, 22, rng);
    checkerRoad(g, { x: GALLERY.x - 22, y: GALLERY.y + 100, w: 44, h: ROW_Y - 40 - GALLERY.y - 100 }, 22, rng);
    checkerRoad(g, { x: 1460, y: 620, w: 520, h: 40 }, 20, rng);

    // Redemption Square: round flags in rings, a gilt compass of the isle let into the paving.
    g.fillStyle(STONE_DARK, 1); g.fillEllipse(SQUARE.x, SQUARE.y, SQUARE_R * 2 + 16, SQUARE_R * 1.7 + 16);
    g.fillStyle(STONE, 1); g.fillEllipse(SQUARE.x, SQUARE.y, SQUARE_R * 2, SQUARE_R * 1.7);
    for (let k = 1; k < 6; k++) { g.lineStyle(1, STONE_DARK, 0.5); g.strokeEllipse(SQUARE.x, SQUARE.y, k * 64, k * 54); }
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      g.lineStyle(1, STONE_DARK, 0.4);
      g.lineBetween(SQUARE.x + Math.cos(a) * 64, SQUARE.y + Math.sin(a) * 54, SQUARE.x + Math.cos(a) * SQUARE_R, SQUARE.y + Math.sin(a) * SQUARE_R * 0.85);
    }
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      g.fillStyle(i % 2 ? 0x8c4a3c : 0x3a302a, 0.5);
      g.fillTriangle(SQUARE.x + Math.cos(a - 0.13) * 120, SQUARE.y + Math.sin(a - 0.13) * 102, SQUARE.x + Math.cos(a + 0.13) * 120, SQUARE.y + Math.sin(a + 0.13) * 102, SQUARE.x + Math.cos(a) * 160, SQUARE.y + Math.sin(a) * 136);
    }
    g.lineStyle(2, GILT, 0.5); g.strokeEllipse(SQUARE.x, SQUARE.y, 250, 212);

    // The Lethe and a ring of pale stones where people kneel to pour.
    letheBasin(g, LETHE_POOL, rng);
    for (let i = 0; i < 40; i++) { g.fillStyle(LETHE_LIT, 0.25); g.fillCircle(LETHE_POOL.x - 30 + rng() * (LETHE_POOL.w + 60), LETHE_POOL.y + LETHE_POOL.h + 24 + rng() * 20, 2 + rng() * 2); }

    // Loose tickets and pressed petals blown along the roads.
    for (let i = 0; i < 90; i++) {
      const x = rng() * W, y = 60 + rng() * (H - 100);
      if (rng() < 0.5) { g.fillStyle(PAPER, 0.4); g.fillRect(x, y, 5, 3); }
      else fmn(g, x, y, 1, 0.4);
    }
    // A sepia vignette over the whole town, deepest in the corners.
    for (let k = 0; k < 6; k++) { g.lineStyle(60, SEPIA_DEEP, 0.035); g.strokeRect(k * 30, k * 30, W - k * 60, H - k * 60); }
  },

  pieces,

  animate(g, t, view, world) {
    const inView = (x: number, y: number, m = 120) => x > view.x - m && x < view.x + view.w + m && y > view.y - m && y < view.y + view.h + m;
    const freed = world.test({ prince: 'hindsight' });
    // Shop windows: the bottled memories throb, each window on its own breath.
    for (const w of windows) {
      if (!inView(w.x + w.w / 2, w.y)) continue;
      const k = 0.5 + Math.sin(t * 1.3 + w.s * 6) * 0.5;
      g.fillStyle(MEMORY_COLORS[Math.floor(w.s * 10) % MEMORY_COLORS.length], (freed ? 0.04 : 0.07) + k * 0.06);
      g.fillRect(w.x, w.y, w.w, w.h);
    }
    // The Lethe's still surface: slow rings spreading from where something sank.
    const P = LETHE_POOL;
    if (inView(P.x + P.w / 2, P.y + P.h / 2, 300)) {
      for (let i = 0; i < 4; i++) {
        const ph = (t / 5 + i / 4) % 1;
        const cx = P.x + 60 + ((i * 131) % (P.w - 120)), cy = P.y + 40 + ((i * 71) % (P.h - 80));
        g.lineStyle(1.2, LETHE_LIT, 0.5 * (1 - ph)); g.strokeEllipse(cx, cy, 10 + ph * 90, 4 + ph * 30);
      }
      mistBank(g, P.x + P.w / 2 + Math.sin(t * 0.2) * 40, P.y + P.h * 0.4, P.w * 0.9, 0.12);
    }
    // Forget-me-nots nodding in the fields.
    for (const f of FIELDS) {
      if (!inView(f.x, f.y, f.rx)) continue;
      for (let i = 0; i < 8; i++) {
        const a = i * 2.1 + f.x;
        const x = f.x + Math.cos(a) * f.rx * 0.6, y = f.y + Math.sin(a) * f.ry * 0.5;
        fmn(g, x + Math.sin(t * 1.5 + i) * 2, y, 2, 0.8);
      }
    }
    // Lamp pools.
    for (const l of lamps) if (inView(l.x, l.y)) glow(g, l.x, l.y - 4, 34, LAMP_LIGHT, 0.035 + Math.sin(t * 2 + l.x) * 0.008, 2);
    // Freed: memories going home — little lights rising out of the Archive and drifting west.
    if (freed && inView(ARCHIVE.x, ARCHIVE.y - 100, 400)) {
      for (let i = 0; i < 10; i++) {
        const ph = (t / 7 + i / 10) % 1;
        const x = ARCHIVE.x - 80 + i * 18 - ph * 300, y = ARCHIVE.y - 120 - ph * 160 + Math.sin(t + i) * 10;
        g.fillStyle(MEMORY_COLORS[i % MEMORY_COLORS.length], 0.7 * Math.sin(ph * Math.PI)); g.fillCircle(x, y, 3);
      }
    }
  },

  animateOver(g, t, view) {
    // Sepia mist banks drifting low across the streets.
    for (let i = 0; i < 6; i++) {
      const x = ((i * 523 + t * 14) % (REM_W + 600)) - 300, y = 260 + i * 230;
      if (x < view.x - 300 || x > view.x + view.w + 300 || y < view.y - 80 || y > view.y + view.h + 80) continue;
      mistBank(g, x, y, 320, 0.07);
    }
    // Old photographs blowing down the street, turning over as they go.
    for (let i = 0; i < 5; i++) {
      const ph = (t / 16 + i / 5) % 1;
      const x = view.x + ((i * 311 + ph * view.w * 1.4) % (view.w + 200)) - 100;
      const y = view.y + 120 + ((i * 197) % Math.max(1, view.h - 200)) + Math.sin(t * 1.2 + i) * 24;
      photo(g, x, y, 16, 12, t * 1.4 + i, 0.2 + (i % 3) * 0.2, i);
    }
    motes(g, view, t, 26, SEPIA_LIT, 8, 14, 1.4, 3);
    motes(g, view, t, 10, SEPIA_PALE, 4, 20, 2, 11);
  },
};

export const REMEMBRANCE_AREA: AreaDef = {
  id: 'remembrance',
  isle: 'fate',
  court: 'remembrance',
  name: 'The Remembrance Court',
  subtitle: 'Every memory taken in pledge against the Draw',
  w: REM_W,
  h: REM_H,
  bg: 0x4e4434,
  accent: REMEMBRANCE_COLOR,
  weather: 'sepia',
  spawn: { x: 120, y: ROW_Y },
  painter,
  solids,
  exits: [
    { side: 'w', to: 'card', at: ROW_Y, label: 'Down Pawn Row to the Card Court' },
    { side: 's', to: 'mind', at: MAIN_X, label: 'The south road to the Mind Court' },
  ],
  pois: [
    { kind: 'waystone', at: { x: 130, y: 950 } },
    { kind: 'prince', id: 'hindsight', at: { x: ARCHIVE.x, y: ARCHIVE.y + 46 } },
    { kind: 'water', id: 'remembrance-lethe', shape: LETHE_POOL, fishery: 'remembrance-lethe' },
    { kind: 'encounter', id: 'remembrance-pawned-memories' },
    { kind: 'encounter', id: 'remembrance-forget-me-not' },
    { kind: 'encounter', id: 'remembrance-portrait-gallery' },
    { kind: 'encounter', id: 'remembrance-deja-vu' },
    { kind: 'encounter', id: 'remembrance-lethe' },
    {
      kind: 'sign', at: { x: 220, y: 690 },
      text: 'REMEMBRANCE. Drawn for the pledge? Bring your Lot. One memory, freely given, settles the week.',
    },
    {
      kind: 'sign', at: { x: 860, y: 960 },
      text: 'LAPSED. Pledges unredeemed by the second Draw go to the Lethe. The Archive keeps no copies.',
    },
    {
      kind: 'sign', at: { x: 1640, y: 900 },
      text: 'THE LETHE. Do not drink. Do not wade. What the water takes it does not give back.',
    },
    {
      kind: 'sign', at: { x: 1320, y: 470 },
      text: 'THE ARCHIVE of His Highness Prince Hindsight. All memories catalogued. None returned.',
    },
    { kind: 'chest', id: 'remembrance-chest-shelves', at: { x: 2290, y: 610 }, coins: 130 },
    { kind: 'chest', id: 'remembrance-chest-archive', at: { x: 940, y: 420 }, orbs: 2, open: { prince: 'hindsight' } },
  ],
  npcs: REMEMBRANCE_NPCS,
  crowd: REMEMBRANCE_CROWD,
};
