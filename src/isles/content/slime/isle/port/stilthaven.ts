import type { AreaDef, AreaPainter, Cond, PainterWorld, Poi, Pt, Rect, Solid } from '../../../../IslesTypes';
import { type G, blob, glow, groundFill, mulberry, shadow } from '../../../../art/IsleArt';
import { carve, inView } from '../../../water/isle/port/art';
import {
  BARK, BARK_DARK, BONE, BONE_DARK, BONE_SHADE, BRASS, BRUISE, BRUISE_LIT, FOAM, HONEY, IRON, LAMP, LAMP_HOT, LEAF_DARK,
  MIRE, MIRE_DEEP, MIRE_SHEEN, MUD, MUD_WET, PEAT, PEAT_ALT, PLANK, PLANK_DARK, PLANK_LIT, ROPE, SCUM, SCUM_LIT, SEA,
  SEA_DEEP, SEA_SHALLOW, VENOM, VENOM_DARK, VENOM_LIT, WEB, coilSeal, coiledSnake, deck, dim, draughtHouse, earBox,
  fangRock, honeyedFang, inRect, lighthouse, lit, mangrove, mixC, netLoft, poly, punt, queueRope, rationBoard, ripple,
  sag, skinFrame, slipHull, stiltHouse, stiltSkirt, tanVat, walkLamp, web,
} from './art';
import { AT, STILTHAVEN_CROWD, STILTHAVEN_NPCS } from './people';

/**
 * Stilthaven — the stilt harbour at the mire's edge, where every crossing to Fangmire lands.
 *
 * There is no ground under Stilthaven. The town stands on the black water of the mire, which has no
 * bottom, on legs — mangrove poles driven down until they stopped sinking, which took some of them
 * three generations. Everything is joined by boardwalk: the High Stilts runs the width of the town
 * from the Chain Causeway in the west to the Dark Walk in the east; the Mooring Walk runs along the
 * sea; the spine joins them and runs on north to the firm bank, where the mangroves stand on their
 * prop-roots among the white fangs and the Fen Road leaves for the Fang Court. Two side-walks, the
 * Tannery Walk and the Loft Walk, close the grid.
 *
 * Off the walks, on their own decks: the Draught House with its copper still-dome and its queue rope,
 * the snakeskin tannery, the net-lofts, the Honeyed Fang (a bakery built round a hollow fang full of
 * wild bees), the Coil & Candle, the Bitten Hook, the houses — and at the west end of the Mooring Walk,
 * out over the dark water, the Lowering Stage. Out on the biggest fang of the coast stands the Fang
 * Light, a lighthouse chained to a tooth.
 *
 * You land at the end of the Landing Pier, walk up it onto the Mooring Walk, and the first thing you
 * see is the queue — the whole town, on a new-moon night, standing in line for its dose.
 */

const W = 2600;
const H = 1500;
/** The firm bank's south edge: north of this is peat and mangrove; south of it, water. */
const BANK_Y = 400;
/** Where the mire meets the sea, under the Mooring Walk. */
const SEA_Y = 1290;

type Piece = NonNullable<AreaPainter['pieces']>[number];

// ── Walkable geometry: boardwalks and decks over the water ──────────

/** The boardwalks. `across` = the planks are laid across a walk that runs east–west. */
const WALKS: { r: Rect; across: boolean; name: string }[] = [
  { r: { x: 1240, y: 400, w: 120, h: 300 }, across: false, name: 'north spine' },
  { r: { x: 0, y: 700, w: 2600, h: 100 }, across: true, name: 'the High Stilts' },
  { r: { x: 0, y: 670, w: 180, h: 160 }, across: true, name: 'west landing' },
  { r: { x: 2420, y: 670, w: 180, h: 160 }, across: true, name: 'east landing' },
  { r: { x: 1240, y: 800, w: 120, h: 390 }, across: false, name: 'south spine' },
  { r: { x: 0, y: 1190, w: 2600, h: 100 }, across: true, name: 'the Mooring Walk' },
  { r: { x: 380, y: 400, w: 80, h: 790 }, across: false, name: 'the Tannery Walk' },
  { r: { x: 2140, y: 400, w: 80, h: 790 }, across: false, name: 'the Loft Walk' },
  { r: { x: 1250, y: 1290, w: 100, h: 200 }, across: false, name: 'the Landing Pier' },
  { r: { x: 560, y: 1290, w: 60, h: 170 }, across: false, name: 'the Gaff' },
];

/** Decks off the walks, each carrying a building or two. */
const DECK = {
  tannery: { x: 100, y: 440, w: 280, h: 260 },
  nwHouses: { x: 560, y: 460, w: 340, h: 240 },
  north2: { x: 960, y: 480, w: 220, h: 220 },
  draught: { x: 1360, y: 430, w: 620, h: 270 },
  loft: { x: 2220, y: 440, w: 280, h: 260 },
  pell: { x: 460, y: 950, w: 320, h: 240 },
  bakery: { x: 840, y: 940, w: 400, h: 250 },
  store: { x: 1360, y: 960, w: 320, h: 230 },
  tackle: { x: 1860, y: 960, w: 280, h: 230 },
  eastHouses: { x: 2220, y: 950, w: 260, h: 240 },
  slip: { x: 980, y: 1290, w: 270, h: 110 },
  lowering: { x: 40, y: 1290, w: 170, h: 120 },
} satisfies Record<string, Rect>;

/** The biggest fang on the coast, with the lighthouse on it: walkable rock, not deck. */
const FANG_ISLE: Rect = { x: 2390, y: 1290, w: 190, h: 150 };

const WALKABLE: Rect[] = [...WALKS.map((w) => w.r), ...Object.values(DECK), FANG_ISLE];

const pieces: Piece[] = [];
const solids: Solid[] = [...carve({ x: 0, y: BANK_Y, w: W, h: H - BANK_Y }, WALKABLE)];

const NYXA: Cond = { monarch: 'nyxa' };
const notNyxa: Cond = { not: NYXA };

// ── The bank: mangroves on prop-roots, and the white fangs ──────────

const BANK_MANGROVES: [number, number, number, boolean][] = [
  [190, 250, 1.0, false], [560, 170, 1.1, true], [860, 330, 0.85, false], [1040, 140, 1.0, false],
  [1620, 200, 1.15, true], [1900, 330, 0.9, false], [2210, 160, 1.0, false], [2470, 300, 0.95, true], [90, 80, 0.8, false],
];
for (const [x, y, s, snake] of BANK_MANGROVES) {
  pieces.push({ x, y, w: 160 * s, h: 170 * s, draw: (g, rng) => mangrove(g, x, y, s, rng, snake) });
  solids.push({ kind: 'circle', x, y: y - 6, r: 22 * s });
}

const BANK_FANGS: [number, number, number, number][] = [
  [730, 340, 160, 14], [1520, 330, 200, -18], [2050, 120, 150, 10], [380, 130, 130, -12], [2560, 110, 120, 6],
];
for (const [x, y, h, lean] of BANK_FANGS) {
  pieces.push({ x, y, w: h * 0.8, h: h + 20, draw: (g, rng) => fangRock(g, x, y, h, lean, rng) });
  solids.push({ kind: 'circle', x, y: y - 4, r: h * 0.18 });
}

// Fangs and mangroves standing in the open water (the water is already solid).
const MIRE_FANGS: [number, number, number, number][] = [
  [200, 1060, 180, 16], [1770, 930, 150, -10], [2550, 1090, 120, 8], [1110, 430, 110, -8], [2060, 880, 130, 12],
];
for (const [x, y, h, lean] of MIRE_FANGS) pieces.push({ x, y, w: h * 0.8, h: h + 20, draw: (g, rng) => fangRock(g, x, y, h, lean, rng) });
const MIRE_MANGROVES: [number, number, number][] = [[720, 880, 0.62], [1110, 880, 0.55], [2060, 610, 0.7], [1560, 880, 0.5], [920, 420, 0.5]];
for (const [x, y, s] of MIRE_MANGROVES) pieces.push({ x, y, w: 150 * s, h: 170 * s, draw: (g, rng) => mangrove(g, x, y, s, rng, false) });

// ── The tannery ─────────────────────────────────────────────────────

/** The open-sided tanning shed: a reed roof on poles, skins hanging in the dark under it. */
pieces.push({
  x: 240, y: 560, w: 220, h: 150, draw: (g, rng) => {
    shadow(g, 240, 562, 200, 26, 0.4);
    for (const px of [160, 210, 270, 320]) { g.fillStyle(BARK_DARK, 1); g.fillRect(px - 3, 470, 6, 90); g.fillStyle(BARK, 0.7); g.fillRect(px - 3, 470, 2, 90); }
    // Skins hung from the rafters in the gloom.
    g.fillStyle(0x0e0c08, 0.75); g.fillRect(160, 478, 160, 80);
    const cols = [0x8a8a4a, 0x6a5a3a, 0xa89a6a, 0x5a6a3a, 0x8a6a4a, 0x9a8a5a];
    for (let k = 0; k < 9; k++) {
      const sx = 168 + k * 17, len = 40 + rng() * 30;
      g.lineStyle(0.8, ROPE, 0.9); g.lineBetween(sx, 476, sx, 482);
      g.fillStyle(cols[k % cols.length], 0.9); g.fillRect(sx - 4, 482, 8, len);
      g.fillStyle(dim(cols[k % cols.length], 0.3), 0.8); g.fillTriangle(sx - 4, 482 + len, sx + 4, 482 + len, sx, 488 + len);
      g.lineStyle(0.5, dim(cols[k % cols.length], 0.45), 0.8);
      for (let d = 0; d < len; d += 5) { g.lineBetween(sx - 4, 484 + d, sx, 486 + d); g.lineBetween(sx, 486 + d, sx + 4, 484 + d); }
    }
    // Reed roof.
    poly(g, [[136, 480], [344, 480], [318, 440], [162, 440]], 0x4a4024, 1);
    poly(g, [[140, 476], [340, 476], [316, 444], [164, 444]], 0x7a6a3a, 1);
    for (let k = 0; k < 60; k++) { const rx = 142 + k * 3.3; g.lineStyle(1, 0x9a8a4a, 0.5); g.lineBetween(rx, 475, rx + (240 - rx) * 0.15, 446); }
    for (let k = 0; k < 50; k++) { g.lineStyle(1, 0x5a4a24, 1); const rx = 138 + k * 4.1; g.lineBetween(rx, 478, rx + 1, 483 + rng() * 4); }
    // The sign: a snake skin pinned out flat on a board.
    g.fillStyle(PLANK_DARK, 1); g.fillRect(212, 426, 56, 18);
    g.fillStyle(0xa89a6a, 1); g.fillEllipse(240, 435, 44, 7);
    g.lineStyle(0.6, 0x5a4a2a, 1); for (let k = 0; k < 9; k++) g.lineBetween(222 + k * 4, 432, 224 + k * 4, 438);
    web(g, 330, 470, 12, rng, 0.45);
  },
});
solids.push({ kind: 'rect', x: 150, y: 530, w: 180, h: 32 });
for (const [x, y, h, base, band] of [[132, 650, 74, 0x8a8a4a, 0x4a4a24], [300, 662, 80, 0xa89a6a, 0x6a4a2a], [356, 600, 70, 0x6a7a3a, 0x2a3a1a]] as [number, number, number, number, number][]) {
  pieces.push({ x, y, w: 50, h: h + 10, draw: (g, rng) => skinFrame(g, x, y, h, base, band, rng) });
  solids.push({ kind: 'circle', x: x - 16, y: y - 2, r: 4 }, { kind: 'circle', x: x + 16, y: y - 2, r: 4 });
}
pieces.push({ x: 180, y: 640, w: 50, h: 60, draw: (g) => tanVat(g, 180, 640, 20) });
solids.push({ kind: 'circle', x: 180, y: 630, r: 20 });

// ── North-side houses ───────────────────────────────────────────────

pieces.push({ x: 650, y: 650, w: 170, h: 200, draw: (g, rng) => { stiltHouse(g, 650, 650, 120, 70, { wall: 0x5a4a38, roof: 0x6a5a30, roofKind: 'reed', glow: true, marked: true, net: true }, rng); } });
solids.push({ kind: 'rect', x: 590, y: 620, w: 120, h: 30 });
pieces.push({ x: 820, y: 620, w: 160, h: 200, draw: (g, rng) => { stiltHouse(g, 820, 620, 110, 64, { wall: 0x4e4232, roof: 0x8a8a5a, roofKind: 'skin', glow: true, marked: true }, rng); } });
solids.push({ kind: 'rect', x: 765, y: 590, w: 110, h: 30 });
pieces.push({
  x: 1070, y: 650, w: 180, h: 210, draw: (g, rng) => {
    stiltHouse(g, 1070, 650, 130, 72, { wall: 0x4a3e30, roof: 0x3a3428, roofKind: 'tar', glow: false, marked: true }, rng);
    // A cowl hung on a peg by the door — an informer lives here, and does not mind who knows.
    g.fillStyle(0x1a1418, 1); g.fillEllipse(1100, 584, 12, 18);
    g.fillStyle(0xd8e070, 0.8); g.fillCircle(1097, 582, 1); g.fillCircle(1102, 582, 1);
  },
});
solids.push({ kind: 'rect', x: 1005, y: 620, w: 130, h: 30 });

// ── The Draught House deck ──────────────────────────────────────────

pieces.push({ x: 1640, y: 580, w: 380, h: 340, draw: (g, rng) => draughtHouse(g, 1640, 580, rng) });
solids.push({ kind: 'rect', x: 1470, y: 528, w: 340, h: 52 });
/** The queue rope, snaking along the deck in front of the dosing windows. Comes down after the Matriarch. */
pieces.push({
  x: 1640, y: 700, w: 420, h: 60, when: notNyxa, draw: (g) => queueRope(g, [
    { x: 1452, y: 640 }, { x: 1540, y: 640 }, { x: 1630, y: 640 }, { x: 1720, y: 640 }, { x: 1806, y: 640 },
  ]),
});
pieces.push({
  x: 1640, y: 712, w: 420, h: 60, when: notNyxa, draw: (g) => queueRope(g, [
    { x: 1470, y: 704 }, { x: 1580, y: 704 }, { x: 1700, y: 704 }, { x: 1830, y: 704 },
  ]),
});
pieces.push({ x: 1906, y: 612, w: 120, h: 130, when: notNyxa, draw: (g, rng) => rationBoard(g, 1906, 612, rng) });
solids.push({ kind: 'rect', x: 1864, y: 604, w: 84, h: 10 });
/** After the Matriarch: the board is ash, and trestles of free doses stand where the rope was. */
pieces.push({
  x: 1906, y: 612, w: 130, h: 70, when: NYXA, draw: (g, rng) => {
    shadow(g, 1906, 614, 110, 20, 0.45);
    blob(g, 1906, 606, 50, 16, 0x1a1410, 1, rng);
    for (let k = 0; k < 12; k++) {
      g.fillStyle(rng() < 0.5 ? 0x2a2018 : 0x0e0a08, 1);
      g.fillRect(1870 + rng() * 70, 594 + rng() * 14, 14 + rng() * 10, 5);
    }
    // Charred ration books, splayed.
    for (let k = 0; k < 5; k++) {
      const bx = 1880 + k * 12, by = 598 + (k % 2) * 6;
      g.fillStyle(0x3a2a20, 1); g.fillRect(bx, by, 12, 8);
      g.fillStyle(0xc8b890, 0.6); g.fillRect(bx + 1, by + 1, 10, 2);
    }
    g.fillStyle(PLANK_DARK, 1); g.fillRect(1866, 520, 5, 70);
  },
});
for (const tx of [1520, 1700]) {
  pieces.push({
    x: tx, y: 656, w: 120, h: 40, when: NYXA, draw: (g) => {
      shadow(g, tx, 658, 110, 12);
      g.fillStyle(PLANK_DARK, 1); g.fillRect(tx - 50, 630, 100, 6);
      g.fillRect(tx - 46, 636, 4, 20); g.fillRect(tx + 42, 636, 4, 20);
      for (let k = 0; k < 9; k++) {
        g.fillStyle(0xa8a8a0, 1); g.fillRect(tx - 44 + k * 10, 620, 7, 10);
        g.fillStyle(VENOM, 0.7); g.fillRect(tx - 43 + k * 10, 622, 5, 3);
      }
    },
  });
}
// Lamps round the deck.
for (const [lx, ly] of [[1380, 690], [1966, 690], [1380, 450]] as [number, number][]) pieces.push({ x: lx, y: ly, w: 40, h: 70, draw: (g) => walkLamp(g, lx, ly) });

// ── Net-lofts ───────────────────────────────────────────────────────

pieces.push({ x: 2290, y: 630, w: 120, h: 230, draw: (g, rng) => netLoft(g, 2290, 630, 70, rng) });
solids.push({ kind: 'rect', x: 2255, y: 600, w: 70, h: 30 });
pieces.push({ x: 2430, y: 610, w: 110, h: 230, draw: (g, rng) => netLoft(g, 2430, 610, 64, rng) });
solids.push({ kind: 'rect', x: 2398, y: 580, w: 64, h: 30 });
/** Floats piled on the deck, and a net spread to mend. */
pieces.push({
  x: 2330, y: 690, w: 90, h: 30, draw: (g, rng) => {
    for (let k = 0; k < 9; k++) { g.fillStyle(k % 2 ? 0xc8a050 : 0xa88038, 1); g.fillCircle(2296 + (k % 4) * 9 + rng() * 3, 684 - Math.floor(k / 4) * 6, 4); }
    g.lineStyle(0.7, ROPE, 0.7);
    for (let k = 0; k < 8; k++) { g.lineBetween(2330 + k * 6, 676, 2334 + k * 6, 698); g.lineBetween(2328, 678 + k * 3, 2378, 680 + k * 3); }
  },
});

// ── The south row: houses, the Honeyed Fang, the Coil & Candle, the Bitten Hook ──

/** The Pell house: passed over — the black cross on the door — and Ottilie's chair by it. */
pieces.push({
  x: 620, y: 1130, w: 200, h: 210, draw: (g, rng) => {
    stiltHouse(g, 620, 1130, 140, 70, { wall: 0x544636, roof: 0x5a5a3a, roofKind: 'reed', glow: false, passed: true, net: true }, rng);
    // Ottilie's chair, a shawl over its back.
    shadow(g, 706, 1166, 26, 8);
    g.fillStyle(BARK_DARK, 1); g.fillRect(694, 1140, 4, 24); g.fillRect(714, 1140, 4, 24);
    g.fillStyle(PLANK, 1); g.fillRect(692, 1150, 28, 4);
    g.fillStyle(0x5a4a5a, 1); g.fillRect(694, 1138, 24, 12);
  },
});
solids.push({ kind: 'rect', x: 550, y: 1100, w: 140, h: 30 });

pieces.push({ x: 1020, y: 1140, w: 340, h: 260, draw: (g, rng) => honeyedFang(g, 1020, 1140, rng) });
solids.push({ kind: 'rect', x: 965, y: 1110, w: 170, h: 30 }, { kind: 'circle', x: 960, y: 1124, r: 30 }, { kind: 'circle', x: 1140, y: 1104, r: 26 });

/** The Coil & Candle: a stilt house shingled in snakeskin, candles in every window, coils of rope at the door. */
pieces.push({
  x: 1520, y: 1140, w: 220, h: 220, draw: (g, rng) => {
    stiltHouse(g, 1520, 1140, 160, 74, { wall: 0x5e4a36, roof: 0x9a9a62, roofKind: 'skin', glow: true, marked: true }, rng);
    // An awning of tanned skin over the counter.
    poly(g, [[1446, 1062], [1594, 1062], [1604, 1080], [1436, 1080]], 0x7a6a3a, 1);
    for (let k = 0; k < 8; k++) { g.fillStyle(k % 2 ? 0x8a7a4a : 0x6a5a2a, 1); g.fillTriangle(1438 + k * 21, 1080, 1459 + k * 21, 1080, 1448 + k * 21, 1088); }
    // Candles on the sill, a row of stubs, lit.
    for (let k = 0; k < 6; k++) {
      const cx = 1470 + k * 18;
      g.fillStyle(0xe8e0c8, 1); g.fillRect(cx - 2, 1094 - (k % 3) * 3, 4, 8 + (k % 3) * 3);
      g.fillStyle(LAMP, 1); g.fillEllipse(cx, 1092 - (k % 3) * 3, 3, 5);
      glow(g, cx, 1090, 10, LAMP, 0.05, 2);
    }
    // Coils of rope by the door.
    for (const [rx, ry] of [[1454, 1150], [1588, 1152]] as [number, number][]) {
      shadow(g, rx, ry + 2, 30, 8);
      for (let k = 0; k < 4; k++) { g.lineStyle(2.5, k % 2 ? ROPE : dim(ROPE, 0.2), 1); g.strokeEllipse(rx, ry - k * 3, 26 - k * 4, 9 - k); }
    }
    // The sign: a coiled rope round a candle.
    g.fillStyle(PLANK_DARK, 1); g.fillRect(1500, 1000, 40, 26);
    g.lineStyle(2, ROPE, 1); g.strokeCircle(1520, 1013, 9);
    g.fillStyle(0xe8e0c8, 1); g.fillRect(1518, 1008, 4, 10);
    g.fillStyle(LAMP, 1); g.fillCircle(1520, 1006, 2);
  },
});
solids.push({ kind: 'rect', x: 1440, y: 1110, w: 160, h: 30 });

/** The Bitten Hook: a tarred shack with a giant hook sign, a snake bitten on it; rods racked; a glass venom-tank. */
pieces.push({
  x: 2000, y: 1140, w: 220, h: 230, draw: (g, rng) => {
    stiltHouse(g, 2000, 1140, 150, 70, { wall: 0x3e3428, roof: 0x2a2620, roofKind: 'tar', glow: true, marked: true, net: true }, rng);
    // Rod rack: driftwood, iron, and the antivenin rods in their green glass sleeves.
    g.fillStyle(BARK_DARK, 1); g.fillRect(2084, 1060, 4, 80); g.fillRect(2110, 1060, 4, 80); g.fillRect(2082, 1070, 34, 3);
    for (let k = 0; k < 5; k++) {
      const rx = 2088 + k * 5;
      g.lineStyle(1.5, k < 2 ? 0x8a7a5a : k < 3 ? 0x5a5a5a : 0x6aa86a, 1); g.lineBetween(rx, 1140, rx + 1, 1040 - k * 4);
      if (k >= 3) { g.fillStyle(0x8ad08a, 0.35); g.fillRect(rx - 1.5, 1060 - k * 4, 4, 60); }
    }
    // The hook sign: a big iron hook, a viper eel biting its shank.
    const hx = 1940, hy = 1000;
    g.lineStyle(2.5, BARK_DARK, 1); g.lineBetween(hx - 30, hy - 30, hx + 10, hy - 30);
    g.lineStyle(5, IRON, 1); g.lineBetween(hx, hy - 30, hx, hy + 6);
    g.beginPath(); g.arc(hx - 10, hy + 6, 10, 0, Math.PI, false); g.strokePath();
    g.lineBetween(hx - 20, hy + 6, hx - 16, hy - 2);
    g.lineStyle(3, 0x4a6a3a, 1);
    g.beginPath(); g.moveTo(hx - 24, hy - 18); for (let k = 0; k <= 8; k++) g.lineTo(hx - 24 + k * 3, hy - 18 + Math.sin(k * 1.4) * 3); g.strokePath();
    g.fillStyle(0x4a6a3a, 1); g.fillEllipse(hx + 1, hy - 16, 7, 5);
    g.fillStyle(0xf0d040, 1); g.fillCircle(hx + 2, hy - 17, 0.9);
    // The venom tank: glass on a stand, green water, a little eel in it.
    g.fillStyle(PLANK_DARK, 1); g.fillRect(1914, 1128, 40, 12);
    g.fillStyle(VENOM_DARK, 0.85); g.fillRect(1916, 1100, 36, 28);
    g.fillStyle(VENOM, 0.35); g.fillRect(1916, 1100, 36, 6);
    g.lineStyle(1.5, 0xc8e0c8, 0.8); g.strokeRect(1916, 1100, 36, 28);
    g.lineStyle(2, 0x2a3a1a, 1); g.lineBetween(1924, 1116, 1944, 1112);
  },
});
solids.push({ kind: 'rect', x: 1925, y: 1110, w: 150, h: 30 }, { kind: 'rect', x: 1912, y: 1118, w: 44, h: 22 });

// East houses.
pieces.push({ x: 2290, y: 1120, w: 150, h: 190, draw: (g, rng) => { stiltHouse(g, 2290, 1120, 100, 62, { wall: 0x5a4a3a, roof: 0x6a6a3a, roofKind: 'reed', glow: true, marked: true }, rng); } });
solids.push({ kind: 'rect', x: 2240, y: 1090, w: 100, h: 30 });
pieces.push({ x: 2420, y: 1110, w: 150, h: 190, draw: (g, rng) => { stiltHouse(g, 2420, 1110, 100, 60, { wall: 0x4a3e30, roof: 0x7a7a52, roofKind: 'skin', glow: false, passed: true }, rng); } });
solids.push({ kind: 'rect', x: 2370, y: 1080, w: 100, h: 30 });

// ── The waterfront: the slip, the Lowering Stage, the Fang Light ────

pieces.push({ x: 1090, y: 1376, w: 260, h: 90, draw: (g, rng) => slipHull(g, 1090, 1376, 150, rng) });
solids.push({ kind: 'rect', x: 1015, y: 1340, w: 150, h: 36 }, { kind: 'circle', x: 1187, y: 1368, r: 10 });

/**
 * The Lowering Stage: a deck at the end of the walk over the darkest water, a davit-arm with a
 * pulley and a rope going down into the black, a pile of weighting stones, and nothing else.
 * After the Lowering quest, it is crowded with lanterns.
 */
pieces.push({
  x: 140, y: 1400, w: 200, h: 170, draw: (g, rng) => {
    // The davit: a post, an arm out over the water, a pulley, a rope going straight down.
    g.fillStyle(BARK_DARK, 1); g.fillRect(186, 1260, 8, 140);
    g.fillStyle(BARK, 0.7); g.fillRect(186, 1260, 3, 140);
    g.fillStyle(BARK_DARK, 1); g.fillRect(186, 1262, 70, 7);
    g.lineStyle(1.5, BARK_DARK, 1); g.lineBetween(190, 1300, 230, 1268);
    g.fillStyle(IRON, 1); g.fillCircle(250, 1272, 5);
    g.lineStyle(1.2, ROPE, 1); g.lineBetween(255, 1272, 255, 1420);
    g.fillStyle(0x0a0a08, 0.5); g.fillEllipse(255, 1420, 20, 6);
    ripple(g, 255, 1420, 14, 0.5);
    // Weighting stones, piled.
    for (let k = 0; k < 6; k++) {
      const sx = 70 + (k % 3) * 16, sy = 1392 - Math.floor(k / 3) * 10;
      g.fillStyle(0x4a4a46, 1); g.fillEllipse(sx, sy, 16, 10);
      g.fillStyle(0x6a6a64, 1); g.fillEllipse(sx - 2, sy - 2, 9, 5);
      g.lineStyle(1, ROPE, 0.8); g.lineBetween(sx - 6, sy, sx + 6, sy);
    }
    web(g, 196, 1300, 14, rng, 0.35);
  },
});
solids.push({ kind: 'circle', x: 190, y: 1396, r: 7 }, { kind: 'circle', x: 86, y: 1388, r: 22 });
pieces.push({
  x: 130, y: 1380, w: 180, h: 80, when: { questDone: 'stilthaven-lowered' }, draw: (g) => {
    for (let k = 0; k < 14; k++) {
      const lx = 60 + (k % 7) * 20 + (k > 6 ? 10 : 0), ly = 1312 + (k > 6 ? 40 : 0);
      g.fillStyle(IRON, 1); g.fillRect(lx - 4, ly - 12, 8, 2); g.fillRect(lx - 4, ly - 1, 8, 2);
      g.fillStyle(LAMP, 0.95); g.fillRect(lx - 3, ly - 10, 6, 9);
    }
  },
});

pieces.push({ x: 2500, y: 1420, w: 220, h: 340, draw: (g, rng) => lighthouse(g, 2500, 1420, rng) });
solids.push({ kind: 'circle', x: 2510, y: 1406, r: 30 }, { kind: 'circle', x: 2470, y: 1416, r: 26 });

// Punts at their ropes in the water.
for (const [x, y, len, wood] of [[300, 880, 70, 0x5a4632], [1460, 890, 64, 0x4e3e2c], [2330, 880, 76, 0x5a4a36], [760, 1390, 80, 0x4a3a28], [1420, 1380, 70, 0x5e4a34], [1960, 1360, 84, 0x52402e]] as [number, number, number, number][]) {
  pieces.push({ x, y: y + 8, w: len + 30, h: 30, draw: (g, rng) => punt(g, x, y, len, wood, rng) });
}

// Lamps along the walks.
const WALK_LAMPS: [number, number][] = [
  [1236, 420], [1364, 830], [1236, 1186], [470, 704], [900, 704], [2130, 704], [2580, 704],
  [470, 1196], [840, 1196], [1680, 1196], [2220, 1196], [1364, 1296], [2380, 1296], [30, 1296],
];
for (const [lx, ly] of WALK_LAMPS) pieces.push({ x: lx, y: ly, w: 40, h: 70, draw: (g) => walkLamp(g, lx, ly) });

// The informers' ear-boxes on their posts (Struck Through pulls the slips out of these).
export const EAR_BOXES: Pt[] = [{ x: 330, y: 706 }, { x: 1246, y: 540 }, { x: 880, y: 1198 }, { x: 2560, y: 708 }];
for (const p of EAR_BOXES) {
  pieces.push({ x: p.x, y: p.y, w: 40, h: 70, when: notNyxa, draw: (g) => earBox(g, p.x, p.y) });
}

// Snakes asleep in the sun on the decks, coiled.
for (const [x, y, s, c] of [[360, 470, 0.8, 0x6a7a3a], [1960, 450, 0.7, 0x8a6a3a], [2470, 970, 0.75, 0x5a6a4a]] as [number, number, number, number][]) {
  pieces.push({ x, y, w: 40, h: 30, draw: (g) => coiledSnake(g, x, y, s, c) });
}

/** The corduroy road out of the north: logs laid crosswise over the peat, the Fen Road to the Fang Court. */
pieces.push({
  x: 1405, y: 60, w: 60, h: 90, draw: (g) => {
    // A milestone: a fang-chip set upright, the Matriarch's coil cut in it.
    g.fillStyle(BONE_SHADE, 1); g.fillRect(1396, 22, 18, 36);
    g.fillStyle(BONE, 1); g.fillRect(1396, 22, 13, 36);
    g.fillStyle(BONE, 1); g.fillTriangle(1396, 22, 1414, 22, 1405, 12);
    coilSeal(g, 1405, 40, 5, BONE_DARK, 0.9);
  },
});
solids.push({ kind: 'circle', x: 1405, y: 54, r: 8 });

// ── Ground ──────────────────────────────────────────────────────────

/** Points in open water (not under any walkable) for marsh-gas bubbles; picked once. */
const BUBBLES: { x: number; y: number; ph: number; s: number }[] = [];
{
  const r = mulberry(0x5711);
  let tries = 0;
  while (BUBBLES.length < 140 && tries < 4000) {
    tries++;
    const x = 20 + r() * (W - 40), y = BANK_Y + 20 + r() * (SEA_Y - BANK_Y - 30);
    if (WALKABLE.some((w) => inRect({ x: w.x - 16, y: w.y - 16, w: w.w + 32, h: w.h + 32 }, x, y))) continue;
    BUBBLES.push({ x, y, ph: r(), s: 0.6 + r() * 0.8 });
  }
}

function paintGround(g: G, rng: () => number): void {
  // The mire under everything.
  g.fillStyle(MIRE, 1); g.fillRect(0, 0, W, H);
  // Depth: slow dark eddies and lighter slicks.
  for (let i = 0; i < 160; i++) {
    const x = rng() * W, y = BANK_Y + rng() * (SEA_Y - BANK_Y);
    g.fillStyle(rng() < 0.6 ? MIRE_DEEP : MIRE_SHEEN, 0.25 + rng() * 0.25);
    g.fillEllipse(x, y, 60 + rng() * 160, 14 + rng() * 30);
  }
  // Green scum and duckweed rafts.
  for (let i = 0; i < 70; i++) {
    const cx = rng() * W, cy = BANK_Y + 20 + rng() * (SEA_Y - BANK_Y - 40);
    blob(g, cx, cy, 20 + rng() * 40, 8 + rng() * 12, SCUM, 0.55, rng, 7);
    for (let k = 0; k < 18; k++) {
      g.fillStyle(rng() < 0.5 ? SCUM_LIT : SCUM, 0.8);
      g.fillCircle(cx + (rng() - 0.5) * 70, cy + (rng() - 0.5) * 24, 1 + rng() * 1.6);
    }
  }
  // Static rings where something below just moved.
  for (let i = 0; i < 40; i++) ripple(g, rng() * W, BANK_Y + rng() * (SEA_Y - BANK_Y), 8 + rng() * 20, 0.35);

  // The sea beyond the Mooring Walk: colder, with foam lines and the depth falling away.
  g.fillStyle(SEA_SHALLOW, 1); g.fillRect(0, SEA_Y, W, H - SEA_Y);
  g.fillStyle(SEA, 1); g.fillRect(0, SEA_Y + 60, W, H - SEA_Y - 60);
  g.fillStyle(SEA_DEEP, 1); g.fillRect(0, SEA_Y + 150, W, H - SEA_Y - 150);
  for (let y = SEA_Y + 20; y < H; y += 18 + rng() * 10) {
    for (let x = rng() * 80; x < W; x += 60 + rng() * 90) {
      g.fillStyle(FOAM, 0.08 + rng() * 0.1); g.fillEllipse(x, y, 30 + rng() * 40, 2.5);
    }
  }
  // A ragged line where the black mire leaks out into the sea.
  for (let x = 0; x < W; x += 24) { g.fillStyle(MIRE, 0.7); g.fillEllipse(x + rng() * 10, SEA_Y + 12 + rng() * 12, 40 + rng() * 30, 14 + rng() * 10); }

  // The firm bank: peat and root-mud, wettest at its edge.
  groundFill(g, { x: 0, y: 0, w: W, h: BANK_Y + 10 }, PEAT, PEAT_ALT, MUD, rng, 1.2);
  for (let x = 0; x < W; x += 30) blob(g, x + rng() * 20, BANK_Y + rng() * 10, 30 + rng() * 20, 10 + rng() * 6, MUD_WET, 1, rng, 7);
  for (let x = 0; x < W; x += 16) { g.fillStyle(SCUM, 0.5); g.fillEllipse(x, BANK_Y + 14 + rng() * 6, 14, 3); }
  // Puddles on the bank, scummed, a few with a snake's S-trail through them.
  for (let i = 0; i < 26; i++) {
    const px = rng() * W, py = 40 + rng() * (BANK_Y - 80);
    if (Math.abs(px - 1300) < 90) continue;
    g.fillStyle(MUD_WET, 1); g.fillEllipse(px, py, 40 + rng() * 50, 14 + rng() * 12);
    g.fillStyle(MIRE, 0.9); g.fillEllipse(px, py, 30 + rng() * 34, 9 + rng() * 8);
    g.fillStyle(SCUM, 0.5); g.fillEllipse(px - 6, py - 1, 12, 3);
    if (rng() < 0.4) {
      g.lineStyle(1.5, MUD, 0.9); g.beginPath(); g.moveTo(px - 40, py + 10);
      for (let k = 0; k <= 10; k++) g.lineTo(px - 40 + k * 8, py + 10 + Math.sin(k * 0.9) * 6);
      g.strokePath();
    }
  }
  // Surface roots threading through the peat.
  for (let i = 0; i < 40; i++) {
    let x = rng() * W, y = 20 + rng() * (BANK_Y - 40);
    g.lineStyle(2 + rng() * 2, BARK_DARK, 0.8); g.beginPath(); g.moveTo(x, y);
    for (let k = 0; k < 5; k++) { x += (rng() - 0.5) * 40; y += (rng() - 0.3) * 18; g.lineTo(x, y); }
    g.strokePath();
  }
  // Ferns and sedge tufts.
  for (let i = 0; i < 120; i++) {
    const tx = rng() * W, ty = 10 + rng() * (BANK_Y - 20);
    if (Math.abs(tx - 1300) < 70) continue;
    for (let k = 0; k < 5; k++) {
      const a = -Math.PI / 2 + (k - 2) * 0.35;
      g.lineStyle(1, rng() < 0.5 ? 0x4a6a2a : 0x3a5a24, 0.9);
      g.lineBetween(tx, ty, tx + Math.cos(a) * (6 + rng() * 6), ty + Math.sin(a) * (6 + rng() * 6));
    }
  }
  // The corduroy road: logs laid crosswise over the peat, north from the spine to the edge.
  for (let y = 0; y < BANK_Y + 4; y += 12) {
    const col = mixC(BARK, BARK_DARK, rng() * 0.5);
    g.fillStyle(BARK_DARK, 1); g.fillRoundedRect(1238 + (rng() - 0.5) * 6, y, 124, 11, 5);
    g.fillStyle(col, 1); g.fillRoundedRect(1240 + (rng() - 0.5) * 6, y + 1, 120, 8, 4);
    g.fillStyle(lit(col, 0.15), 0.5); g.fillRect(1250, y + 2, 100, 2);
    g.fillStyle(dim(col, 0.4), 1); g.fillCircle(1243, y + 5, 3.5); g.fillCircle(1357, y + 5, 3.5);
    g.lineStyle(0.6, dim(col, 0.5), 1); g.strokeCircle(1243, y + 5, 2); g.strokeCircle(1357, y + 5, 2);
  }

  // The fang isle: worn white rock in the sea, wet at its edge.
  blob(g, FANG_ISLE.x + FANG_ISLE.w / 2, FANG_ISLE.y + FANG_ISLE.h / 2 + 4, FANG_ISLE.w / 2 + 10, FANG_ISLE.h / 2, BONE_DARK, 1, rng, 10);
  blob(g, FANG_ISLE.x + FANG_ISLE.w / 2, FANG_ISLE.y + FANG_ISLE.h / 2, FANG_ISLE.w / 2, FANG_ISLE.h / 2 - 6, BONE_SHADE, 1, rng, 10);
  for (let k = 0; k < 30; k++) {
    g.fillStyle(rng() < 0.5 ? BONE : 0xc8c0a8, 0.7);
    g.fillEllipse(FANG_ISLE.x + 14 + rng() * (FANG_ISLE.w - 28), FANG_ISLE.y + 14 + rng() * (FANG_ISLE.h - 28), 10 + rng() * 20, 4 + rng() * 6);
  }
  for (let k = 0; k < 8; k++) { g.lineStyle(1, 0x7a6a4a, 0.6); const cx = FANG_ISLE.x + 20 + rng() * (FANG_ISLE.w - 40), cy = FANG_ISLE.y + 20 + rng() * (FANG_ISLE.h - 40); g.lineBetween(cx, cy, cx + (rng() - 0.5) * 30, cy + (rng() - 0.5) * 16); }

  // Stilt skirts under every walk and deck, then the planks.
  for (const w of WALKABLE) {
    if (w === FANG_ISLE) continue;
    stiltSkirt(g, w.x, w.x + w.w, w.y + w.h, 16, rng);
  }
  for (const w of Object.values(DECK)) deck(g, w, rng, w.w >= w.h);
  for (const w of WALKS) deck(g, w.r, rng, w.across);

  // The Matriarch's seal painted on the Draught deck, scuffed by a thousand queues.
  coilSeal(g, 1640, 660, 30, VENOM_DARK, 0.45);
  for (let k = 0; k < 40; k++) { g.fillStyle(PLANK, 0.5); g.fillEllipse(1610 + rng() * 60, 630 + rng() * 60, 6 + rng() * 10, 2); }
  // Worn pale path down the middle of the main walks.
  for (let x = 20; x < W; x += 30) { g.fillStyle(PLANK_LIT, 0.08); g.fillEllipse(x, 750, 40, 26); g.fillEllipse(x, 1240, 40, 26); }
  // The Lowering Stage boards are darker — tarred black, the only black deck in town.
  g.fillStyle(0x000000, 0.35); g.fillRect(DECK.lowering.x, DECK.lowering.y, DECK.lowering.w, DECK.lowering.h);
  // Honey spilled on the bakery boards, and bees' wax drips.
  for (let k = 0; k < 10; k++) { g.fillStyle(HONEY, 0.25); g.fillEllipse(900 + rng() * 300, 1150 + rng() * 30, 6 + rng() * 10, 3); }
  // Rope coils, crates and buckets about the decks.
  for (const [cx, cy] of [[1200, 1270], [2100, 1270], [620, 1270], [1690, 770], [180, 770]] as [number, number][]) {
    for (let k = 0; k < 3; k++) { g.lineStyle(2, k % 2 ? ROPE : dim(ROPE, 0.2), 1); g.strokeEllipse(cx, cy - k * 2, 22 - k * 5, 8 - k * 1.5); }
  }
}

// ── Animation ───────────────────────────────────────────────────────

/** Water-snakes swimming their lanes: [x0, x1, y, speed px/s, colour]. */
const SWIMMERS: [number, number, number, number, number][] = [
  [490, 1210, 880, 46, 0x5a6a3a], [1380, 2120, 872, 38, 0x6a5a3a], [1500, 2350, 1440, 52, 0x3a4a2a], [20, 360, 1010, 30, 0x4a5a3a],
];

function animateUnder(g: G, t: number, view: Rect, world: PainterWorld): void {
  // Marsh gas: bubbles rise, swell, pop into a ring.
  for (const b of BUBBLES) {
    if (!inView(view, b.x, b.y, 20)) continue;
    const q = (t * 0.35 * b.s + b.ph) % 1;
    if (q < 0.7) {
      const r = 1 + (q / 0.7) * 3.2 * b.s;
      g.fillStyle(VENOM_DARK, 0.5); g.fillCircle(b.x, b.y, r);
      g.fillStyle(VENOM_LIT, 0.35); g.fillCircle(b.x - r * 0.3, b.y - r * 0.3, r * 0.35);
    } else {
      const p = (q - 0.7) / 0.3;
      g.lineStyle(1, VENOM, 0.45 * (1 - p)); g.strokeEllipse(b.x, b.y, 6 + p * 22, 2 + p * 8);
    }
  }
  // Swimming snakes: an S-wave with a head and a wake.
  for (let i = 0; i < SWIMMERS.length; i++) {
    const [x0, x1, y, v, col] = SWIMMERS[i];
    const span = x1 - x0;
    const d = (t * v + i * 200) % (span * 2);
    const dir = d < span ? 1 : -1;
    const hx = d < span ? x0 + d : x1 - (d - span);
    if (!inView(view, hx, y, 80)) continue;
    g.lineStyle(1, FOAM, 0.15); g.strokeEllipse(hx - dir * 40, y + 1, 90, 10);
    g.lineStyle(3.4, col, 0.95); g.beginPath();
    for (let k = 0; k <= 12; k++) {
      const sx = hx - dir * k * 4.5, sy = y + Math.sin(t * 6 - k * 0.7) * 4;
      if (k === 0) g.moveTo(sx, sy); else g.lineTo(sx, sy);
    }
    g.strokePath();
    g.fillStyle(col, 1); g.fillEllipse(hx + dir * 3, y + Math.sin(t * 6) * 4, 8, 5);
    g.fillStyle(0xf0d040, 1); g.fillCircle(hx + dir * 5, y - 1 + Math.sin(t * 6) * 4, 0.9);
  }
  // Glints on the sea.
  for (let k = 0; k < 24; k++) {
    const gx = (k * 173 + t * 14) % W, gy = SEA_Y + 30 + ((k * 61) % (H - SEA_Y - 40));
    if (!inView(view, gx, gy, 10)) continue;
    const a = 0.2 + 0.2 * Math.sin(t * 2 + k);
    g.fillStyle(FOAM, Math.max(0, a)); g.fillEllipse(gx, gy, 10, 1.6);
  }
  // Lamp pools on the boards, breathing.
  for (const [lx, ly] of WALK_LAMPS) {
    if (!inView(view, lx, ly, 60)) continue;
    const f = 0.85 + Math.sin(t * 7 + lx) * 0.1 + Math.sin(t * 13 + ly) * 0.05;
    g.fillStyle(LAMP, 0.06 * f); g.fillEllipse(lx + 14, ly + 6, 90 * f, 30 * f);
  }
  // The Draught House door breathes green on Draught Nights (until the Matriarch falls).
  if (inView(view, 1640, 540, 120) && !world.test(NYXA)) {
    const a = 0.08 + 0.05 * Math.sin(t * 1.6);
    g.fillStyle(VENOM, a); g.fillEllipse(1640, 600, 120, 40);
  }
  // Lanterns on the Lowering Stage after the quest: their light on the black water.
  if (inView(view, 130, 1350, 150) && world.test({ questDone: 'stilthaven-lowered' })) {
    for (let k = 0; k < 14; k++) {
      const lx = 60 + (k % 7) * 20 + (k > 6 ? 10 : 0), ly = 1312 + (k > 6 ? 40 : 0);
      const f = 0.8 + 0.2 * Math.sin(t * 5 + k * 1.7);
      glow(g, lx, ly - 6, 16 * f, LAMP, 0.05, 2);
      g.fillStyle(LAMP, 0.08 * f); g.fillEllipse(lx, ly + 60, 6, 40);
    }
  }
}

function animateAbove(g: G, t: number, view: Rect, world: PainterWorld): void {
  // The still-vent on the Draught House: green-white puffs climbing and thinning.
  const vx = 1699, vy = 264;
  if (inView(view, vx, vy, 160)) {
    for (let k = 0; k < 6; k++) {
      const q = (t * 0.25 + k / 6) % 1;
      const px = vx + Math.sin(q * 5 + k) * 10 + q * 30, py = vy - q * 130;
      g.fillStyle(world.test(NYXA) ? 0xd8d8d0 : 0xb8e098, 0.22 * (1 - q)); g.fillCircle(px, py, 6 + q * 20);
    }
  }
  // The Fang Light: a slow beam sweeping out across the sea. Green, until it burns honest oil.
  const lx = 2510, ly = 1198;
  if (inView(view, lx, ly, 700)) {
    const honest = world.test(NYXA) || world.test({ questDone: 'stilthaven-lowered' });
    const col = honest ? LAMP : VENOM;
    const a = Math.PI * 0.55 + Math.sin(t * 0.35) * Math.PI * 0.45;
    const len = 520;
    for (let k = 0; k < 3; k++) {
      const half = 0.07 + k * 0.04;
      poly(g, [[lx, ly], [lx + Math.cos(a - half) * len, ly + Math.sin(a - half) * len * 0.5], [lx + Math.cos(a + half) * len, ly + Math.sin(a + half) * len * 0.5]], col, 0.05);
    }
    glow(g, lx, ly, 26, col, 0.08, 3);
    g.fillStyle(honest ? LAMP_HOT : VENOM_LIT, 0.8); g.fillCircle(lx, ly, 4);
  }
  // Moths at the lamps.
  for (const [mx, my] of WALK_LAMPS) {
    if (!inView(view, mx, my, 60)) continue;
    for (let k = 0; k < 2; k++) {
      const a = t * (3 + k) + mx;
      g.fillStyle(0xe8e0c8, 0.7); g.fillEllipse(mx + 14 + Math.cos(a) * 9, my - 42 + Math.sin(a * 1.3) * 6, 3, 2);
    }
  }
  // Gossamer catching the light between the bank mangroves.
  for (let i = 0; i < BANK_MANGROVES.length - 1; i++) {
    const [ax, ay] = BANK_MANGROVES[i];
    const [bx, by] = BANK_MANGROVES[i + 1];
    if (!inView(view, (ax + bx) / 2, (ay + by) / 2, 300)) continue;
    const a = 0.08 + 0.06 * Math.sin(t * 0.8 + i);
    sag(g, { x: ax + 20, y: ay - 90 }, { x: bx - 20, y: by - 90 }, 30, 0.7, WEB, a);
  }
  // On the night the Matriarch falls and after: the bonfire of ration books where the board stood.
  if (world.test(NYXA) && inView(view, 1906, 600, 100)) {
    for (let k = 0; k < 7; k++) {
      const q = (t * 0.9 + k / 7) % 1;
      g.fillStyle(q < 0.4 ? 0xffd070 : 0xff8a3a, 0.5 * (1 - q)); g.fillCircle(1890 + k * 5 + Math.sin(t * 4 + k) * 4, 600 - q * 40, 5 - q * 3);
    }
    g.fillStyle(0x6a6a64, 0.12); g.fillCircle(1906, 540 - ((t * 20) % 60), 18);
  }
  // Purple banner-tails of the Matriarch on the queue posts flutter (only while the rope stands).
  if (!world.test(NYXA) && inView(view, 1640, 640, 260)) {
    for (const px of [1452, 1630, 1806]) {
      const sw = Math.sin(t * 2 + px) * 3;
      g.fillStyle(BRUISE, 0.9); g.fillTriangle(px, 610, px + 12 + sw, 614, px, 620);
      g.fillStyle(BRUISE_LIT, 0.5); g.fillCircle(px + 4, 615, 1.2);
    }
  }
}

// ── POIs ────────────────────────────────────────────────────────────

const POIS: Poi[] = [
  { kind: 'waystone', at: { x: 1170, y: 1240 } },
  { kind: 'mooring', at: { x: 1300, y: 1462 }, isle: 'slime' },
  { kind: 'water', id: 'stilthaven-sea-water', shape: { x: 0, y: 1300, w: W, h: 200 }, fishery: 'stilthaven-sea' },
  { kind: 'sign', at: { x: 1440, y: 120 }, text: 'NORTH — the Fen Road to the Fang Court. Prince Venin\'s Milking Hall. Keep to the logs.' },
  { kind: 'sign', at: { x: 120, y: 760 }, text: 'WEST — the Chain Causeway to the Shackle Court. Debtors walk in front.' },
  { kind: 'sign', at: { x: 2480, y: 760 }, text: 'EAST — the Dark Walk to the Umbral Court. Carry a light. It will not help.' },
  { kind: 'sign', at: { x: 1366, y: 1272 }, text: 'THE LANDING PIER — Moorings at the end. Hulls: M. Gall, on the slip. Tackle: S. Mudgett, east.' },
  {
    kind: 'sign', at: { x: 1440, y: 680 },
    text: 'THE DRAUGHT HOUSE. One dose, one Mark, one moon. By Her hand only. All other draughts are contraband.',
  },
  { kind: 'sign', at: { x: 200, y: 1276 }, text: 'THE LOWERING STAGE. By order: no lanterns, no flowers, no names spoken.' },
  { kind: 'sign', at: { x: 650, y: 1276 }, text: 'THE GAFF. Mullet off the end, eels after dark. Herring bite. Hold them by the gills.' },
  { kind: 'sign', at: { x: 1186, y: 1180 }, text: 'THE HONEYED FANG. Buns, pies, and nothing in them but honey. — H. Combe' },
  { kind: 'chest', id: 'stilthaven-chest-stage', at: { x: 120, y: 1380 }, coins: 140, orbs: 1 },
  { kind: 'chest', id: 'stilthaven-chest-fang', at: { x: 2420, y: 1410 }, orbs: 2, coins: 80 },
  { kind: 'chest', id: 'stilthaven-chest-draught', at: { x: 1950, y: 470 }, coins: 420, open: NYXA },
];

export const STILTHAVEN_AREA: AreaDef = {
  id: 'stilthaven',
  isle: 'slime',
  name: 'Stilthaven',
  subtitle: 'Harbour on stilts at the mire\'s edge',
  w: W,
  h: H,
  bg: MIRE_DEEP,
  accent: VENOM,
  weather: 'miasma',
  spawn: { x: 1300, y: 1420 },
  painter: { ground: paintGround, pieces, animate: animateUnder, animateOver: animateAbove },
  solids,
  exits: [
    { side: 'n', to: 'fang', label: 'The Fen Road — the Fang Court' },
    { side: 'w', to: 'shackle', label: 'The Chain Causeway — the Shackle Court' },
    { side: 'e', to: 'umbral', label: 'The Dark Walk — the Umbral Court' },
  ],
  pois: POIS,
  npcs: STILTHAVEN_NPCS,
  crowd: STILTHAVEN_CROWD,
};

/** Quest positions that must agree with the painted town. */
export const SPOTS = {
  queue: { x: 1640, y: 668 },
  stage: { x: 130, y: 1350 },
  ...AT,
} satisfies Record<string, Pt>;
