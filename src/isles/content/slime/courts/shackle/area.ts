import type { AreaDef, AreaPainter, Pt, Rect, Solid } from '../../../../IslesTypes';
import { dim, flagstones, glow, groundFill, lit, mixC, type G } from '../../../../art/IsleArt';
import {
  bigLedger, boardwalk, bridgeTower, cage, cagedLamp, causeway, chainGang, chainLinks, chainPost, debtBell, fangRock,
  gasBubbles, gaol, ironBall, mangrove, manacle, manacleWorks, mireFill, mireLip, moatCage, mudPatch, murkGlow,
  noticeBoard, pawnShop, pile, pillory, ripple, sagChain, setts, shackleWaystone, stackSmoke, stiltHut, stocks,
  fetterhold, padlock, tallyMarks,
} from './art';
import {
  BRUISE, HOT, INK, IRON, IRON_DARK, IRON_LIT, LAMP, MIRE, MUD, MUD_DARK, MUD_LIT, PAPER, RUST, SHACKLE_COLOR,
  SLIME, STONE, STONE_DARK, STONE_LIT, TIMBER, TIMBER_DARK, VENOM,
} from './palette';
import { SHACKLE_CROWD, SHACKLE_NPCS } from './npcs';

/**
 * The Shackle Court — the debtors' gaol-town, built on a causeway of tarred piles out over the
 * mire west of Stilthaven.
 *
 * Read it from the Stilthaven road in:
 * • **the Debtors' Causeway** (east): the long clay road in from the harbour, rutted by the
 *   chain-gangs that drag their irons up and down it all day — the waystone at its head;
 * • **the Square of Stocks** (centre): fan-laid setts with iron rings let in, stocks either side,
 *   the pillory, the debt-bell, the posted lists;
 * • **the Owing House** (north-west of the square): the debtors' gaol, and chained to its east
 *   end **the Great Ledger**, a book the size of a door;
 * • **the Fetterhold** (north-east): Prince Fetter's keep, banded in iron like a strongbox;
 * • **the Great Chain Bridge** (north): between the two, the road runs out over the black mire on
 *   a deck of planks hung from two great chains, to the north bank and the road to the Web Court;
 * • **the Manacle Works** (west): the foundry, its stacks, its yard of slag;
 * • **the Chain Moat** (south-west): the old moat with a cage hung over it — the court's fishing;
 * • **Pawn Row** (south): stilt huts with the debt chalked on the shutters, and the Hock & Chain.
 */

export const SHACKLE_W = 2400;
export const SHACKLE_H = 1600;

/** The square's centre. */
export const SQUARE: Pt = { x: 1200, y: 900 };
const SQUARE_R = 200;
/** The Owing House — front-wall base centre. */
export const GAOL: Pt = { x: 800, y: 650 };
/** The Great Ledger on the gaol wall. */
export const LEDGER: Pt = { x: 1060, y: 650 };
/** The Fetterhold — gate base. */
export const KEEP: Pt = { x: 1650, y: 640 };
/** The Manacle Works — front base. */
export const WORKS: Pt = { x: 420, y: 900 };
/** The chain moat — the court's fishing water. */
export const MOAT: Rect = { x: 220, y: 1190, w: 480, h: 160 };
/** Where the moat-cage hangs over the water. */
export const CAGE: Pt = { x: 640, y: 1250 };
/** The Hock & Chain on Pawn Row. */
export const PAWN: Pt = { x: 1200, y: 1400 };
/** The stamp press at the Works door. */
export const PRESS: Pt = { x: 600, y: 940 };

const MIRE_N = { y0: 262, y1: 432 };
const DECK = { x0: 1140, x1: 1260, y0: 236, y1: 456 };
const SE_MIRE: Rect = { x: 1760, y: 1000, w: 640, h: 500 };
const SOUTH_Y = 1500;
const CAUSEWAY: Pt[] = [{ x: 1390, y: 900 }, { x: 1700, y: 872 }, { x: 2000, y: 832 }, { x: 2400, y: 800 }];

type Piece = NonNullable<AreaPainter['pieces']>[number];

const pieces: Piece[] = [];
const solids: Solid[] = [];
const lamps: Pt[] = [];

function addPiece(x: number, y: number, w: number, h: number, draw: (g: G, rng: () => number) => void, solid?: Solid, when?: Piece['when']): void {
  pieces.push({ x, y, w, h, draw, when });
  if (solid) solids.push(solid);
}

const inView = (x: number, y: number, v: Rect, m = 160): boolean =>
  x > v.x - m && x < v.x + v.w + m && y > v.y - m && y < v.y + v.h + m;

// ── The mire: solid water ────────────────────────────────────────────

solids.push({ kind: 'rect', x: 0, y: MIRE_N.y0, w: DECK.x0, h: MIRE_N.y1 - MIRE_N.y0 });
solids.push({ kind: 'rect', x: DECK.x1, y: MIRE_N.y0, w: SHACKLE_W - DECK.x1, h: MIRE_N.y1 - MIRE_N.y0 });
solids.push({ kind: 'rect', x: SE_MIRE.x, y: SE_MIRE.y, w: SE_MIRE.w, h: SE_MIRE.h });
solids.push({ kind: 'rect', x: 0, y: SOUTH_Y, w: SHACKLE_W, h: SHACKLE_H - SOUTH_Y });
solids.push({ kind: 'rect', x: MOAT.x - 10, y: MOAT.y - 10, w: MOAT.w + 20, h: MOAT.h + 20 });

// ── Layout ───────────────────────────────────────────────────────────

// The Great Chain Bridge: four pylons and the rails between them.
for (const [x, y] of [[1118, 252], [1282, 252], [1118, 458], [1282, 458]] as [number, number][]) {
  addPiece(x, y, 70, 150, (g, rng) => bridgeTower(g, x, y, 0.75, rng), { kind: 'circle', x, y: y - 4, r: 18 });
}
addPiece(1200, 457, 200, 260, (g) => {
  for (const x of [DECK.x0 - 2, DECK.x1 + 2]) {
    // The great chain, slung from pylon to pylon, hangers down to the deck edge.
    const top = 252 - 86, bot = 458 - 86;
    chainLinks(g, [{ x, y: top }, { x: x + (x < 1200 ? -10 : 10), y: (top + bot) / 2 + 30 }, { x, y: bot }], 14, IRON, 2.6);
    for (let k = 1; k < 6; k++) {
      const yy = top + ((bot - top) * k) / 6;
      const sagX = x + (x < 1200 ? -10 : 10) * Math.sin((k / 6) * Math.PI);
      g.lineStyle(1.5, IRON_DARK, 1); g.lineBetween(sagX, yy + Math.sin((k / 6) * Math.PI) * 30, x, yy + 86);
    }
  }
});

// The Owing House and the Great Ledger chained to its east end.
addPiece(GAOL.x, GAOL.y, 460, 320, (g, rng) => { gaol(g, GAOL.x, GAOL.y, 400, 200, rng); },
  { kind: 'rect', x: GAOL.x - 200, y: GAOL.y - 44, w: 400, h: 44 });
addPiece(LEDGER.x, LEDGER.y, 160, 200, (g, rng) => {
  bigLedger(g, LEDGER.x, LEDGER.y, 1, rng);
  sagChain(g, LEDGER.x - 60, LEDGER.y - 90, GAOL.x + 196, GAOL.y - 120, 12, 9, IRON_DARK, 2);
}, { kind: 'rect', x: LEDGER.x - 48, y: LEDGER.y - 18, w: 96, h: 18 });

// The Fetterhold.
addPiece(KEEP.x, KEEP.y, 500, 440, (g, rng) => fetterhold(g, KEEP.x, KEEP.y, 250, 270, rng),
  { kind: 'rect', x: KEEP.x - 215, y: KEEP.y - 40, w: 430, h: 40 });
for (const x of [KEEP.x - 70, KEEP.x + 70]) {
  addPiece(x, KEEP.y + 60, 30, 80, (g) => cagedLamp(g, x, KEEP.y + 60), { kind: 'circle', x, y: KEEP.y + 58, r: 6 });
  lamps.push({ x, y: KEEP.y - 4 });
}

// The Square of Stocks.
for (const x of [1050, 1350]) {
  addPiece(x, 830, 100, 70, (g, rng) => stocks(g, x, 830, 1, x > 1200, rng), { kind: 'rect', x: x - 44, y: 820, w: 88, h: 10 });
}
addPiece(1200, 1060, 140, 120, (g) => pillory(g, 1200, 1060, 1), { kind: 'rect', x: 1150, y: 1032, w: 100, h: 28 });
addPiece(1380, 1010, 80, 110, (g) => debtBell(g, 1380, 1010, 1, 0), { kind: 'rect', x: 1352, y: 1002, w: 56, h: 10 });
addPiece(1000, 1030, 90, 100, (g, rng) => noticeBoard(g, 1000, 1030, 1, rng), { kind: 'rect', x: 970, y: 1024, w: 60, h: 8 });
for (const [x, y] of [[1000, 760], [1400, 760], [1020, 1110], [1390, 1120]] as [number, number][]) {
  addPiece(x, y, 30, 80, (g) => cagedLamp(g, x, y), { kind: 'circle', x, y: y - 2, r: 6 });
  lamps.push({ x, y: y - 64 });
}

// The Manacle Works, its yard and the stamp press at the door.
addPiece(WORKS.x, WORKS.y, 480, 300, (g, rng) => manacleWorks(g, WORKS.x, WORKS.y, 400, 150, rng),
  { kind: 'rect', x: WORKS.x - 200, y: WORKS.y - 40, w: 400, h: 40 });
addPiece(PRESS.x, PRESS.y, 70, 110, (g) => {
  // The yard press: a ram on two iron uprights over a stamping block.
  g.fillStyle(0x000000, 0.3); g.fillEllipse(PRESS.x, PRESS.y + 2, 70, 14);
  g.fillStyle(IRON_DARK, 1); g.fillRect(PRESS.x - 30, PRESS.y - 96, 8, 96); g.fillRect(PRESS.x + 22, PRESS.y - 96, 8, 96);
  g.fillStyle(IRON, 1); g.fillRect(PRESS.x - 34, PRESS.y - 104, 68, 12);
  g.fillStyle(IRON, 1); g.fillRect(PRESS.x - 18, PRESS.y - 74, 36, 22);
  g.fillStyle(IRON_LIT, 1); g.fillRect(PRESS.x - 18, PRESS.y - 74, 36, 3);
  g.fillStyle(STONE_DARK, 1); g.fillRect(PRESS.x - 22, PRESS.y - 22, 44, 22);
  g.fillStyle(HOT, 0.8); g.fillRect(PRESS.x - 12, PRESS.y - 26, 24, 5);
  manacle(g, PRESS.x + 34, PRESS.y - 6, 7, -Math.PI / 2, 0.4, 0);
}, { kind: 'rect', x: PRESS.x - 32, y: PRESS.y - 12, w: 64, h: 12 });
// Slag heaps and racks of cooling irons in the yard.
for (const [x, y, s] of [[250, 1060, 1], [330, 1100, 0.7]] as [number, number, number][]) {
  addPiece(x, y, 90 * s, 50 * s, (g, rng) => {
    for (let i = 0; i < 14; i++) {
      g.fillStyle(mixC(0x2a2422, RUST, rng() * 0.5), 1);
      g.fillCircle(x + (rng() - 0.5) * 70 * s, y - rng() * 26 * s * (1 - Math.abs(rng() - 0.5)), (6 + rng() * 8) * s);
    }
    g.fillStyle(HOT, 0.4); g.fillCircle(x + 6, y - 6 * s, 3);
  }, { kind: 'circle', x, y: y - 6, r: 30 * s });
}
addPiece(660, 1090, 90, 70, (g) => {
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(620, 1040, 6, 50); g.fillRect(694, 1040, 6, 50); g.fillRect(616, 1036, 88, 6);
  for (let k = 0; k < 6; k++) manacle(g, 628 + k * 13, 1054, 5, -Math.PI / 2, 0.1, k < 2 ? 0.5 : 0);
}, { kind: 'rect', x: 616, y: 1082, w: 88, h: 8 });

// The chain moat: its gibbet and cage, chain-posts round the rim.
addPiece(560, 1182, 140, 160, (g) => moatCage(g, 560, 1182, 1), { kind: 'circle', x: 560, y: 1176, r: 8 });
for (const x of [260, 360, 460]) addPiece(x, 1178, 30, 40, (g) => chainPost(g, x, 1178, 0.8), { kind: 'circle', x, y: 1174, r: 7 });
addPiece(760, 1300, 30, 40, (g) => chainPost(g, 760, 1300, 1), { kind: 'circle', x: 772, y: 1296, r: 7 });

// Pawn Row.
addPiece(PAWN.x, PAWN.y, 220, 200, (g, rng) => pawnShop(g, PAWN.x, PAWN.y, rng), { kind: 'rect', x: PAWN.x - 80, y: PAWN.y - 22, w: 160, h: 22 });
const HUTS: [number, number, number, number, number][] = [
  [900, 1420, 110, 60, 7], [1470, 1420, 120, 64, 12], [1650, 1360, 100, 56, 4], [760, 1470, 90, 50, 9], [1000, 1300, 100, 56, 14],
];
for (const [x, y, w, h, tallies] of HUTS) {
  addPiece(x, y, w + 30, h + 80, (g, rng) => stiltHut(g, x, y, w, h, [0x5a4632, 0x4e4a3a, 0x5a3e36][x % 3], tallies, rng),
    { kind: 'rect', x: x - w / 2, y: y - 22, w, h: 22 });
}
for (const [x, y] of [[1080, 1470], [1560, 1480]] as [number, number][]) {
  addPiece(x, y, 30, 80, (g) => cagedLamp(g, x, y), { kind: 'circle', x, y: y - 2, r: 6 });
  lamps.push({ x, y: y - 64 });
}

// The north bank: the bridge-reeve's toll hut, fang rocks, mangroves.
addPiece(1440, 200, 140, 140, (g, rng) => stiltHut(g, 1440, 200, 100, 56, 0x4e4a3a, 3, rng), { kind: 'rect', x: 1390, y: 178, w: 100, h: 22 });
addPiece(1320, 150, 30, 80, (g) => cagedLamp(g, 1320, 150), { kind: 'circle', x: 1320, y: 148, r: 6 });
lamps.push({ x: 1320, y: 86 });

// Fang rocks: the old teeth, on the banks and out in the mire.
const FANGS: [number, number, number, number][] = [
  [520, 210, 1.1, -0.2], [760, 140, 0.8, 0.3], [1900, 190, 1.2, 0.15], [2160, 130, 0.9, -0.3],
  [2050, 600, 1, 0.2], [2290, 540, 0.8, -0.1], [1950, 1200, 1.3, -0.25], [2220, 1320, 1, 0.3],
  [380, 360, 0.9, 0.2], [1700, 350, 0.7, -0.2], [90, 1000, 0.8, 0.25],
];
for (const [x, y, s, lean] of FANGS) {
  addPiece(x, y, 120 * s, 160 * s, (g, rng) => fangRock(g, x, y, s, lean, rng), { kind: 'circle', x, y: y - 4, r: 26 * s });
}
// Mangroves on stilt-roots round the edges.
const MANGROVES: [number, number, number][] = [
  [180, 230, 1], [300, 120, 0.8], [2300, 240, 1], [1640, 160, 0.8], [960, 200, 0.9],
  [140, 560, 0.9], [120, 760, 0.8], [1990, 720, 0.8], [2300, 680, 0.9],
  [1880, 1080, 1.1], [2150, 1180, 1], [2330, 1420, 0.9], [1900, 1420, 1],
  [120, 1300, 1], [120, 1480, 0.9], [580, 1520, 0.9], [1360, 1530, 0.9],
];
for (const [x, y, s] of MANGROVES) {
  const inWater = y >= SOUTH_Y || (x >= SE_MIRE.x && y >= SE_MIRE.y) || (y > MIRE_N.y0 && y < MIRE_N.y1);
  addPiece(x, y, 220 * s, 200 * s, (g, rng) => mangrove(g, x, y, s, rng), inWater ? undefined : { kind: 'circle', x, y: y - 10, r: 34 * s });
}

// Piles along both edges of the causeway, and along the moat.
for (let i = 0; i < CAUSEWAY.length - 1; i++) {
  const a = CAUSEWAY[i], b = CAUSEWAY[i + 1];
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  for (let d = 60; d < len; d += 120) {
    const t = d / len, x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t;
    if (x > 2270) continue;
    for (const off of [-74, 74]) {
      const px = x, py = y + off;
      if (py > SE_MIRE.y - 20 && px > SE_MIRE.x) continue;
      addPiece(px, py, 20, 50, (g) => pile(g, px, py, 1), { kind: 'circle', x: px, y: py - 2, r: 6 });
    }
  }
}

// The waystone at the causeway's head.
addPiece(2180, 735, 90, 110, (g, rng) => shackleWaystone(g, 2180, 735, rng), { kind: 'circle', x: 2180, y: 730, r: 16 });

// After the Matriarch falls: the ration books burn in the square.
addPiece(1290, 770, 80, 60, (g) => {
  for (let i = 0; i < 9; i++) {
    g.fillStyle(i % 2 ? PAPER : 0xc8b890, 1);
    g.fillRect(1260 + (i * 13) % 56, 760 - Math.floor(i / 3) * 6, 18, 10);
    g.lineStyle(0.8, INK, 0.6); g.lineBetween(1263 + (i * 13) % 56, 764 - Math.floor(i / 3) * 6, 1274 + (i * 13) % 56, 764 - Math.floor(i / 3) * 6);
  }
  g.fillStyle(BRUISE, 1); g.fillCircle(1300, 748, 4);
}, undefined, { monarch: 'nyxa' });
// After the Prince falls: the stocks-board taken down and propped against the bell, struck through.
addPiece(1420, 1016, 50, 40, (g) => {
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(1404, 990, 34, 24);
  g.fillStyle(PAPER, 1); g.fillRect(1407, 993, 28, 18);
  tallyMarks(g, 1410, 996, 9, INK, 0.7, 0.8);
  g.lineStyle(2.4, 0xa8282a, 1); g.lineBetween(1406, 1010, 1436, 994);
}, undefined, { prince: 'fetter' });

// ── Painter ──────────────────────────────────────────────────────────

/** Mire puddles on the walkable mud (decor, not solid). */
const PUDDLES: [number, number, number][] = [
  [700, 520, 90], [1500, 520, 70], [1580, 1180, 110], [880, 1180, 80], [300, 700, 120], [2200, 950, 90],
  [1000, 500, 60], [460, 520, 80],
];

const painter: AreaPainter = {
  ground(g, rng) {
    const W = SHACKLE_W, H = SHACKLE_H;
    groundFill(g, { x: 0, y: 0, w: W, h: H }, MUD, MUD_DARK, MUD_LIT, rng, 1.2);
    // Wet patches and slime.
    for (let i = 0; i < 70; i++) { g.fillStyle(SLIME, 0.08 + rng() * 0.08); g.fillEllipse(rng() * W, rng() * H, 60 + rng() * 140, 16 + rng() * 40); }
    for (const [x, y, w] of PUDDLES) mudPatch(g, x, y, w, rng);

    // The mire: north band, the south edge, the south-east pond.
    mireFill(g, { x: 0, y: MIRE_N.y0, w: W, h: MIRE_N.y1 - MIRE_N.y0 }, rng);
    mireLip(g, 0, W, MIRE_N.y0, -1, rng);
    mireLip(g, 0, W, MIRE_N.y1, 1, rng);
    mireFill(g, { x: 0, y: SOUTH_Y, w: W, h: H - SOUTH_Y }, rng);
    mireLip(g, 0, W, SOUTH_Y, -1, rng);
    mireFill(g, SE_MIRE, rng);
    mireLip(g, SE_MIRE.x, W, SE_MIRE.y, -1, rng);
    for (let y = SE_MIRE.y; y < SOUTH_Y; y += 14) { g.fillStyle(MUD_DARK, 1); g.fillEllipse(SE_MIRE.x, y + 7, 16 + rng() * 10, 20); g.fillStyle(SLIME, 0.5); g.fillEllipse(SE_MIRE.x + 6, y + 7, 5, 16); }

    // The chain moat: a stone-lined channel, chains hanging in from its rim.
    g.fillStyle(STONE_DARK, 1); g.fillRect(MOAT.x - 12, MOAT.y - 12, MOAT.w + 24, MOAT.h + 24);
    g.fillStyle(STONE, 1); g.fillRect(MOAT.x - 8, MOAT.y - 10, MOAT.w + 16, 6);
    mireFill(g, MOAT, rng);
    for (let x = MOAT.x + 30; x < MOAT.x + MOAT.w; x += 60) {
      chainLinks(g, [{ x, y: MOAT.y - 4 }, { x: x + 4, y: MOAT.y + 30 + (x % 3) * 10 }], 8, IRON_DARK, 1.6, 0.9);
    }
    for (let x = MOAT.x; x < MOAT.x + MOAT.w; x += 24) { g.fillStyle(STONE_LIT, 0.6); g.fillRect(x, MOAT.y - 12, 22, 3); }

    // The causeway and the roads off it.
    causeway(g, CAUSEWAY, 110, rng);
    causeway(g, [{ x: 1200, y: 456 }, { x: 1200, y: 700 }], 96, rng);
    causeway(g, [{ x: 1000, y: 900 }, { x: 760, y: 950 }, { x: 560, y: 980 }], 84, rng);
    causeway(g, [{ x: 1200, y: 1100 }, { x: 1200, y: 1440 }], 70, rng);
    causeway(g, [{ x: GAOL.x, y: GAOL.y + 20 }, { x: 900, y: 780 }, { x: 1030, y: 850 }], 60, rng);
    causeway(g, [{ x: KEEP.x, y: KEEP.y + 10 }, { x: 1560, y: 780 }, { x: 1390, y: 880 }], 70, rng);
    causeway(g, [{ x: 760, y: 990 }, { x: 760, y: 1150 }], 60, rng);
    // The north bank road up from the bridge.
    causeway(g, [{ x: 1200, y: 236 }, { x: 1200, y: 0 }], 90, rng);

    // The bridge deck over the mire.
    boardwalk(g, { x: DECK.x0, y: DECK.y0, w: DECK.x1 - DECK.x0, h: DECK.y1 - DECK.y0 }, false, rng);
    // Duckboards along Pawn Row.
    boardwalk(g, { x: 820, y: 1440, w: 900, h: 44 }, true, rng);

    // The square's setts.
    setts(g, SQUARE.x, SQUARE.y, SQUARE_R, rng);
    // Gutters of old produce under the stocks.
    for (const x of [1050, 1350]) for (let i = 0; i < 10; i++) {
      g.fillStyle([0xa8402a, 0x8a9a4a, 0xd8c890][i % 3], 0.35); g.fillEllipse(x - 40 + rng() * 80, 840 + rng() * 30, 10, 5);
    }

    // The gaol forecourt and the keep's: flags; a bruise-purple runner to the keep gate.
    flagstones(g, { x: GAOL.x - 220, y: GAOL.y - 6, w: 440, h: 70 }, 34, STONE, STONE_DARK, rng);
    flagstones(g, { x: KEEP.x - 160, y: KEEP.y - 6, w: 320, h: 80 }, 34, STONE, STONE_DARK, rng);
    g.fillStyle(dim(BRUISE, 0.3), 1); g.fillRect(KEEP.x - 30, KEEP.y - 6, 60, 80);
    g.fillStyle(BRUISE, 1); g.fillRect(KEEP.x - 26, KEEP.y - 6, 52, 80);

    // The Works yard: cinders and scale, pocked orange where hot slag fell.
    for (let i = 0; i < 260; i++) {
      const x = 200 + rng() * 520, y = 900 + rng() * 220;
      g.fillStyle(rng() < 0.85 ? 0x221c1a : HOT, rng() < 0.85 ? 0.35 : 0.25); g.fillCircle(x, y, 1 + rng() * 2.5);
    }
    g.fillStyle(0x000000, 0.15); g.fillEllipse(470, 1000, 520, 200);

    // Drag-scuffs round the posts where the gang is chained at night, and old chalk tallies.
    for (let i = 0; i < 6; i++) tallyMarks(g, 1620 + i * 60, 760 + (i % 2) * 14, 5 + i * 3, 0xd8d4c4, 0.25, 0.8);
  },

  pieces,

  animate(g, t, view, world) {
    // Gas bubbling up through the mire.
    for (let x = 100; x < SHACKLE_W; x += 260) {
      if (inView(x, 350, view)) gasBubbles(g, x, 350, t, 4, 160, x);
      if (inView(x, 1550, view)) gasBubbles(g, x, 1550, t, 3, 160, x + 7);
    }
    for (const [x, y] of [[1900, 1100], [2100, 1300], [2300, 1050], [1850, 1350]] as [number, number][]) {
      if (inView(x, y, view)) { gasBubbles(g, x, y, t, 4, 120, x); ripple(g, x + 40, y + 30, t, x * 0.001); }
    }
    for (const [x, y, w] of PUDDLES) if (inView(x, y, view)) ripple(g, x, y, t, (x + y) * 0.0007 + w * 0.001);
    // The moat: ripples, a shad turning, the cage swaying low over the water.
    if (inView(MOAT.x + MOAT.w / 2, MOAT.y + MOAT.h / 2, view, 300)) {
      for (let i = 0; i < 4; i++) ripple(g, MOAT.x + 60 + i * 110, MOAT.y + 60 + (i % 2) * 50, t, i * 0.27);
      const fx = MOAT.x + MOAT.w / 2 + Math.cos(t * 0.5) * 170, fy = MOAT.y + MOAT.h / 2 + Math.sin(t * 0.5) * 40;
      g.fillStyle(0x9aa0a0, 0.35); g.fillEllipse(fx, fy, 16, 5);
      // Who sits in the cage depends on the story: nobody, once the Prince is beaten.
      if (!world.test({ prince: 'fetter' })) cage(g, CAGE.x, CAGE.y, 1, Math.sin(t * 0.9) * 0.6, 0x7a8a8a);
      else {
        g.lineStyle(1.6, IRON, 1); g.strokeEllipse(CAGE.x, CAGE.y + 6, 34, 10);
        chainLinks(g, [{ x: CAGE.x, y: CAGE.y - 70 }, { x: CAGE.x + Math.sin(t) * 3, y: CAGE.y - 20 }], 7, IRON_DARK, 1.4);
      }
    }
    // The chain-gang shuffling along the causeway (unchained once the Prince falls).
    const free = world.test({ prince: 'fetter' });
    const gx = 1500 + ((t * 26) % 800);
    if (inView(gx, 860, view, 300)) {
      const k = (gx - 1500) / 800;
      chainGang(g, gx, 878 - k * 50, t, 1, 5, !free);
    }
    const gx2 = 2300 - ((t * 22 + 400) % 800);
    if (inView(gx2, 860, view, 300)) {
      const k = (2300 - gx2) / 800;
      chainGang(g, gx2, 800 + k * 40 + 30, t + 3, -1, 4, !free);
    }
    // The Works: a hot ball cooling on the anvil by the press.
    if (inView(PRESS.x, PRESS.y, view)) {
      ironBall(g, PRESS.x - 46, PRESS.y + 4, 8, 0.1);
      g.fillStyle(HOT, 0.35 + Math.sin(t * 2) * 0.15); g.fillCircle(PRESS.x - 46, PRESS.y + 4, 8);
    }
  },

  animateOver(g, t, view, world) {
    // Smoke from the Works stacks, and the furnace mouth's glow.
    if (inView(WORKS.x, WORKS.y - 200, view, 300)) {
      stackSmoke(g, WORKS.x - 112, WORKS.y - 282, t, 1);
      stackSmoke(g, WORKS.x + 112, WORKS.y - 282, t, 2);
      murkGlow(g, WORKS.x - 80, WORKS.y - 30, t, 90, HOT);
    }
    // Lamplight in the murk.
    for (const l of lamps) if (inView(l.x, l.y, view)) murkGlow(g, l.x, l.y, t, 40, LAMP);
    // The keep's banners stir; its gate-lamps.
    if (inView(KEEP.x, KEEP.y - 200, view, 300)) {
      glow(g, KEEP.x, KEEP.y - 160, 50, VENOM, 0.015 + Math.sin(t) * 0.006, 3);
    }
    // The debt-bell swings on the hour (every minute here), and the square hushes.
    if (inView(1380, 950, view)) {
      const ph = t % 60;
      if (ph < 3) {
        const k = ph / 3;
        for (let i = 0; i < 3; i++) { g.lineStyle(2, LAMP, (1 - k) * 0.5); g.strokeCircle(1380, 948, 20 + k * 80 + i * 14); }
      }
    }
    // A padlock gleaming on the waystone; after the Prince falls the court's padlocks hang open.
    if (inView(2180, 700, view)) {
      const open = world.test({ prince: 'fetter' });
      if (open) padlock(g, 2184, 705, 1.2, 0xc8a040, false);
      glow(g, 2184, 703, 20, open ? LAMP : VENOM, 0.02 + Math.sin(t * 2) * 0.01, 2);
    }
    // Rust-coloured drips off the bridge chains.
    if (inView(1200, 350, view, 200)) {
      for (let i = 0; i < 8; i++) {
        const ph = (t * 0.6 + i / 8) % 1;
        const x = i % 2 ? DECK.x0 - 6 : DECK.x1 + 6, y = 200 + i * 30 + ph * 40;
        g.fillStyle(mixC(RUST, VENOM, 0.3), 0.7 * (1 - ph)); g.fillCircle(x, y, 1.6);
      }
    }
    // Mire scum drifting off the south edge.
    if (inView(1200, SOUTH_Y, view, 400)) {
      for (let i = 0; i < 8; i++) {
        const x = ((t * 12 + i * 310) % SHACKLE_W), y = SOUTH_Y + 30 + (i % 3) * 20;
        g.fillStyle(lit(MIRE, 0.15), 0.4); g.fillEllipse(x, y, 30, 5);
      }
    }
  },
};

export const SHACKLE_AREA: AreaDef = {
  id: 'shackle',
  isle: 'slime',
  court: 'shackle',
  name: 'The Shackle Court',
  subtitle: 'Every name in the Ledger, every debt in iron',
  w: SHACKLE_W,
  h: SHACKLE_H,
  bg: MIRE,
  accent: SHACKLE_COLOR,
  weather: 'drip',
  gloom: 0.12,
  spawn: { x: 2230, y: 815 },
  painter,
  solids,
  exits: [
    { side: 'n', to: 'web', label: 'Over the Great Chain Bridge to the Web Court' },
    { side: 'e', to: 'stilthaven', label: 'Down the Debtors\' Causeway to Stilthaven' },
  ],
  pois: [
    { kind: 'waystone', at: { x: 2180, y: 780 } },
    { kind: 'prince', id: 'fetter', at: { x: KEEP.x, y: KEEP.y + 50 } },
    { kind: 'water', id: 'shackle-moat', shape: MOAT, fishery: 'shackle-moat' },
    { kind: 'encounter', id: 'shackle-ball-and-chain' },
    { kind: 'encounter', id: 'shackle-stocks' },
    { kind: 'encounter', id: 'shackle-manacle-works' },
    { kind: 'encounter', id: 'shackle-chain-bridge' },
    { kind: 'encounter', id: 'shackle-ledger' },
    {
      kind: 'sign', at: { x: 2080, y: 770 },
      text: 'THE SHACKLE COURT. All debts to the Crown are owed in full. Debtors will be chained until the Ledger is clear.',
    },
    {
      kind: 'sign', at: { x: 1300, y: 1060 },
      text: 'THE STOCKS. A day for a late Tithe, three for a second, a week for a word against the Matriarch. Bring fruit.',
    },
    {
      kind: 'sign', at: { x: 1260, y: 520 },
      text: 'THE GREAT CHAIN BRIDGE. Toll: one dose or its value. Debtors may not cross. The Keeper keeps the pins.',
    },
    {
      kind: 'sign', at: { x: 820, y: 1170 },
      text: 'THE CHAIN MOAT. The fish are the Prince\'s. Feeding a debtor is lending to him, and will be written in the Ledger.',
    },
    { kind: 'chest', id: 'shackle-chest-moat', at: { x: 180, y: 1140 }, coins: 120 },
    { kind: 'chest', id: 'shackle-chest-keep', at: { x: 1900, y: 680 }, orbs: 2, open: { prince: 'fetter' } },
  ],
  npcs: SHACKLE_NPCS,
  crowd: SHACKLE_CROWD,
};

