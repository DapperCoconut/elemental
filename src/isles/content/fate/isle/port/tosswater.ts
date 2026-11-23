import type { AreaDef, Cond, PainterWorld, Poi, Rect, Solid } from '../../../../IslesTypes';
import { type G, archway, dim, flagstones, glow, groundFill, house, mixC, rock, shadow } from '../../../../art/IsleArt';
import { carve, inView, planks } from '../../../water/isle/port/art';
import {
  BAIZE, BAIZE_ALT, BAIZE_DARK, BAIZE_LIT, BOARD, BRASS, BRASS_DARK, BRASS_LIT, BUST, CARD_BLACK, CARD_RED, CHIPS, FOAM,
  GILT, GILT_DARK, GILT_LIT, IVORY, LAMP, PIP, PLANK, PLANK_DARK, ROPE, SEA, SEA_DEEP, SEA_SHALLOW, SOIL,
  SOIL_DARK, SQ_BLACK, SQ_RED, STONE, STONE_ALT, STONE_DARK, bellTower, bunting, chip, chipStack, diceBollard,
  diceHouse, die, drawHall, drumBarrel, drumCradle, greenLamp, gull, houseWheel, hullOnStocks, kiosk, kioskWheel, lot,
  lotWall, numbersBoard, pawnShop, poly, topPlinth, topSpin,
} from './art';
import { TOSSWATER_CROWD, TOSSWATER_NPCS } from './people';

/**
 * Tosswater — Lotterhaven's harbour, where every Outer Sea crossing lands.
 *
 * The town climbs from the sea in three terraces, like a gaming table tipped up toward the House.
 * At the bottom, the quay: harbour stone, dice for bollards, three timber piers out into green
 * water over a floor of lost stakes, a boatwright's slip in the west, and in the east, on its own
 * black skerry, the lighthouse — a great red-and-ivory spinning top that the keeper whips into
 * motion every dusk, its lamp going round in its stem. Every berth is drawn by lot at the striped
 * kiosk by the landing.
 *
 * Jetty Street climbs from the landing to the Draw Square: a board of black and red marble where
 * the great brass drum turns on its dais in front of the Draw Hall, the weekly numbers board beside
 * it. West and east of the square the roads run out between dice houses — cottages cast as giant
 * ivory dice, their pips for windows — past the pawnshop under its three gold balls, Odds & Ends,
 * and the Lucky Loaf, to the Treasury and Mind Courts. On the top terrace, above a clipped hedge,
 * are the Allotments (plots drawn by lot each spring), the Lot Wall where the busted's snapped Lots
 * hang, and the Draw Bell's tower; the north road climbs out under a gilt arch to the Card Court.
 */

const W = 2600;
const H = 1500;
/** Where the sea begins along the south shore. */
const SEA_Y = 1290;
/** The quay's back edge. */
const QUAY_Y = 1170;
/** The top terrace's hedge line. */
const HEDGE_Y = 475;

const KING: Cond = { monarch: 'lucan' };

/** Walkable timber over the sea — shared by the painter and the solids. */
const LANDING: Rect = { x: 1250, y: 1280, w: 100, h: 220 };
const KIOSK_PIER: Rect = { x: 730, y: 1280, w: 70, h: 170 };
const CHIP_PIER: Rect = { x: 1980, y: 1280, w: 70, h: 160 };
const SLIP: Rect = { x: 360, y: 1280, w: 140, h: 80 };

/** Roads, paved as a board. */
const N_ROAD: Rect = { x: 1250, y: 0, w: 100, h: 670 };
const W_ROAD: Rect = { x: 0, y: 715, w: 1090, h: 90 };
const E_ROAD: Rect = { x: 1510, y: 715, w: 1090, h: 90 };
const SQUARE: Rect = { x: 1080, y: 660, w: 440, h: 340 };
const JETTY_ST: Rect = { x: 1260, y: 990, w: 80, h: 190 };

/** The drum's axle (the barrel turns in animateOver). */
const DRUM = { x: 1300, y: 860 };
const DRUM_AXLE = { x: 1300, y: 744 };
const LIGHT = { x: 2470, y: 1250 };

/** The hedge segments along the top terrace; the gaps are the stairs and the north road. */
const HEDGES: [number, number][] = [[60, 540], [620, 1240], [1360, 1960], [2040, 2540]];

/** The quay's dice bollards: [x, face]. Kept off the jetty heads. */
const BOLLARDS: [number, number][] = [
  [120, 1], [240, 4], [600, 2], [900, 6], [1040, 3], [1160, 5], [1440, 2], [1560, 6], [1720, 1], [1860, 4], [2120, 3], [2260, 5],
];

/** Dice houses: [x, baseY, face, edge, washing]. */
const DICE_HOUSES: [number, number, number, number, boolean][] = [
  [200, 690, 5, 110, true], [420, 690, 3, 100, false],
  [220, 1080, 3, 104, false], [460, 1080, 6, 112, true], [720, 1070, 4, 100, false],
  [2080, 690, 2, 106, true], [2330, 690, 4, 110, false],
  [2080, 1080, 1, 100, false], [2300, 1080, 5, 108, true],
];

/** Lottery kiosks: [x, baseY, width, odds text]. */
const KIOSKS: [number, number, number, string[]][] = [
  [1440, 1200, 60, ['BERTHS', 'RED BLK']],
  [860, 1196, 56, ['LUCKY', 'DIP 1D']],
  [850, 690, 52, ['SCRATCH', '2 TO 1']],
  [1274, 1340, 40, ['NO', 'NOUGHT']],
];

/** Green lamps along the roads. */
const LAMPS: [number, number][] = [[1000, 712], [1560, 712], [1040, 1004], [1560, 1004], [1230, 1170], [1370, 1170], [600, 712], [2000, 712]];

/** Gull scraps on the quay: [x, y, seed]. */
const GULL_SPOTS: [number, number, number][] = [[880, 1250, 1], [1700, 1252, 2], [300, 1246, 3], [2180, 1240, 4]];

// ── Ground ───────────────────────────────────────────────────────────

/** Red and black squares on the world grid, gilt-grouted. */
function chequer(g: G, r: Rect, size: number, rng: () => number, wear = 0.12): void {
  const c0 = Math.floor(r.x / size), r0 = Math.floor(r.y / size);
  for (let gy = r0; gy * size < r.y + r.h; gy++) {
    for (let gx = c0; gx * size < r.x + r.w; gx++) {
      const x = Math.max(r.x, gx * size), y = Math.max(r.y, gy * size);
      const x1 = Math.min(r.x + r.w, (gx + 1) * size), y1 = Math.min(r.y + r.h, (gy + 1) * size);
      if (x1 <= x || y1 <= y) continue;
      const red = (gx + gy) % 2 === 0;
      const col = mixC(red ? SQ_RED : SQ_BLACK, red ? 0xc87068 : 0x5a5862, rng() * wear);
      g.fillStyle(col, 1); g.fillRect(x, y, x1 - x, y1 - y);
      g.fillStyle(0xffffff, 0.04); g.fillRect(x + 2, y + 2, x1 - x - 4, 2);
    }
  }
  g.lineStyle(1, GILT_DARK, 0.45);
  for (let gx = c0 + 1; gx * size < r.x + r.w; gx++) g.lineBetween(gx * size, r.y, gx * size, r.y + r.h);
  for (let gy = r0 + 1; gy * size < r.y + r.h; gy++) g.lineBetween(r.x, gy * size, r.x + r.w, gy * size);
  // Kerbs.
  g.fillStyle(STONE_DARK, 0.7); g.fillRect(r.x, r.y - 3, r.w, 3); g.fillRect(r.x, r.y + r.h, r.w, 3);
}

/** Mown baize: stripes, like a bowling green. */
function baize(g: G, r: Rect, rng: () => number): void {
  groundFill(g, r, BAIZE, BAIZE_ALT, BAIZE_DARK, rng, 0.5);
  for (let x = r.x; x < r.x + r.w; x += 56) {
    g.fillStyle(((x / 56) | 0) % 2 ? BAIZE_LIT : BAIZE_DARK, 0.08);
    g.fillRect(x, r.y, 28, r.h);
  }
}

/** The Allotments: four rows of plots drawn by lot each spring, each with its numbered stake. */
function allotments(g: G, rng: () => number): void {
  const crops = [[0x5a9a3a, 0x3a7a2a], [0xa82a4a, 0x5a8a3a], [0xe8a030, 0x4a7a2a], [0x8ab84a, 0x5a8a2a], [0x6a4aa8, 0x4a7a3a]];
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 4; col++) {
      const x = 150 + col * 210, y = 120 + row * 100, w = 180, h = 70;
      g.fillStyle(SOIL_DARK, 1); g.fillRect(x - 3, y - 3, w + 6, h + 6);
      g.fillStyle(SOIL, 1); g.fillRect(x, y, w, h);
      // Furrows.
      for (let f = 0; f < 5; f++) { g.lineStyle(2, SOIL_DARK, 0.8); g.lineBetween(x + 6, y + 10 + f * 13, x + w - 6, y + 10 + f * 13); }
      // Crops in rows (some plots fallow — their holders were drawn this year).
      if ((row * 4 + col) % 5 !== 3) {
        const [leaf, stem] = crops[(row + col * 2) % crops.length];
        for (let f = 0; f < 5; f++) for (let k = 0; k < 9; k++) {
          const cx = x + 14 + k * 19 + (f % 2) * 6, cy = y + 8 + f * 13;
          g.fillStyle(stem, 1); g.fillCircle(cx, cy, 4.5);
          g.fillStyle(leaf, 1); g.fillCircle(cx - 1, cy - 1.5, 3.4);
        }
      } else {
        for (let k = 0; k < 8; k++) { g.fillStyle(0x6a6a3a, 0.6); g.fillEllipse(x + rng() * w, y + rng() * h, 10, 4); }
      }
      // The numbered stake at the corner: a white post with a black plate.
      g.fillStyle(0x000000, 0.25); g.fillEllipse(x + 6, y + h + 4, 10, 4);
      g.fillStyle(IVORY, 1); g.fillRect(x + 3, y + h - 22, 6, 26);
      g.fillStyle(PIP, 1); g.fillRect(x - 2, y + h - 30, 16, 10);
      g.fillStyle(IVORY, 1); for (let d = 0; d < 3; d++) g.fillRect(x + 0.5 + d * 4.5, y + h - 28, 2.6, 6);
    }
  }
  // Grass paths between plots, worn.
  for (let k = 0; k < 30; k++) { g.fillStyle(0xd8c890, 0.08); g.fillEllipse(140 + rng() * 860, 110 + rng() * 300, 40, 8); }
}

function paintGround(g: G, rng: () => number): void {
  // Lawns everywhere above the quay.
  baize(g, { x: 0, y: 0, w: W, h: QUAY_Y }, rng);
  // Upper terrace a shade lighter, and the bank under its hedge.
  g.fillStyle(BAIZE_LIT, 0.06); g.fillRect(0, 0, W, HEDGE_Y);
  g.fillStyle(BAIZE_DARK, 0.7); g.fillRect(0, HEDGE_Y + 2, W, 18);
  g.fillStyle(0x000000, 0.12); g.fillRect(0, HEDGE_Y + 20, W, 8);
  g.fillStyle(STONE_DARK, 1); g.fillRect(0, HEDGE_Y + 18, W, 4);
  // Stair runs down the bank at the two gaps.
  for (const sx of [580, 2000]) {
    for (let k = 0; k < 6; k++) { g.fillStyle(k % 2 ? STONE : STONE_ALT, 1); g.fillRect(sx - 34, HEDGE_Y - 12 + k * 7, 68, 6); }
    g.fillStyle(0xb8b0a0, 0.5); g.fillRect(sx - 22, HEDGE_Y + 30, 44, W_ROAD.y - HEDGE_Y - 30);
  }
  allotments(g, rng);

  // Roads and the square.
  chequer(g, N_ROAD, 50, rng);
  chequer(g, W_ROAD, 45, rng);
  chequer(g, E_ROAD, 45, rng);
  chequer(g, JETTY_ST, 40, rng);
  chequer(g, SQUARE, 55, rng, 0.08);
  // The square's gilt border and the queue-worn path to the board.
  g.lineStyle(4, GILT_DARK, 1); g.strokeRect(SQUARE.x, SQUARE.y, SQUARE.w, SQUARE.h);
  g.lineStyle(1.5, GILT_LIT, 0.8); g.strokeRect(SQUARE.x + 6, SQUARE.y + 6, SQUARE.w - 12, SQUARE.h - 12);
  for (let k = 0; k < 20; k++) { g.fillStyle(0xe8d8b8, 0.05); g.fillEllipse(1380 + rng() * 120, 700 + rng() * 260, 30, 12); }
  // Path up from the upper terrace to the Lot Wall and the bell.
  g.fillStyle(0xc8c0a8, 0.55); g.fillRect(1360, 330, 900, 26);
  for (let x = 1360; x < 2260; x += 18) { g.fillStyle(STONE_DARK, 0.25); g.fillRect(x, 330, 1, 26); }
  // Little paved yards in front of the shop doors.
  for (const [x, y] of [[700, 696], [1800, 696], [1820, 1086], [1600, 1190]] as [number, number][]) {
    g.fillStyle(STONE_ALT, 0.8); g.fillRect(x - 30, y, 60, 18);
    g.lineStyle(1, STONE_DARK, 0.6); g.strokeRect(x - 30, y, 60, 18);
  }

  // The quay: harbour stone with a granite kerb.
  flagstones(g, { x: 0, y: QUAY_Y, w: W, h: SEA_Y - QUAY_Y }, 38, STONE, STONE_DARK, rng);
  g.fillStyle(0x000000, 0.15); g.fillRect(0, QUAY_Y - 6, W, 6);
  // Oil stains, chalked berth numbers, a spilt crate of chips.
  for (let k = 0; k < 24; k++) { g.fillStyle(0x2a2a2a, 0.15); g.fillEllipse(rng() * W, QUAY_Y + 20 + rng() * 90, 30 + rng() * 30, 8); }
  for (let k = 0; k < 14; k++) {
    const bx = 80 + k * 180, by = SEA_Y - 22;
    g.fillStyle(k % 2 ? CARD_BLACK : CARD_RED, 0.7); g.fillRect(bx - 12, by - 6, 24, 12);
    g.fillStyle(IVORY, 0.8); g.fillRect(bx - 7, by - 3, 3, 6); g.fillRect(bx + 2, by - 3, 3, 6);
  }

  // The sea: sandy shallows over a floor of lost stakes.
  g.fillStyle(SEA_SHALLOW, 1); g.fillRect(0, SEA_Y, W, 60);
  g.fillStyle(SEA, 1); g.fillRect(0, SEA_Y + 50, W, 90);
  g.fillStyle(SEA_DEEP, 1); g.fillRect(0, SEA_Y + 130, W, H - SEA_Y - 130);
  for (let k = 0; k < 40; k++) { g.fillStyle(0xd8c890, 0.12); g.fillEllipse(rng() * W, SEA_Y + 10 + rng() * 40, 60 + rng() * 80, 10); }
  for (let k = 0; k < 90; k++) {
    const sx = rng() * W, sy = SEA_Y + 16 + rng() * (H - SEA_Y - 20);
    const c = [GILT, CARD_RED, IVORY, 0x2a6ac8][k % 4];
    g.fillStyle(c, 0.16 + rng() * 0.1);
    if (k % 7 === 0) g.fillRect(sx - 3, sy - 3, 6, 6); else g.fillEllipse(sx, sy, 6, 2.5);
  }
  g.fillStyle(STONE_DARK, 1); g.fillRect(0, SEA_Y - 4, W, 6);
  g.fillStyle(0x000000, 0.2); g.fillRect(0, SEA_Y + 2, W, 5);

  // The jetties and the slip.
  for (const r of [LANDING, KIOSK_PIER, CHIP_PIER]) {
    g.fillStyle(0x000000, 0.25); g.fillRect(r.x + 6, r.y + 6, r.w, r.h);
    planks(g, r, 'h', rng, PLANK);
    // Legs at the edges.
    for (let y = r.y + 30; y < r.y + r.h; y += 50) {
      g.fillStyle(PLANK_DARK, 1); g.fillCircle(r.x - 2, y, 5); g.fillCircle(r.x + r.w + 2, y, 5);
    }
  }
  g.fillStyle(STONE_DARK, 1); g.fillRect(SLIP.x - 3, SLIP.y, SLIP.w + 6, SLIP.h);
  g.fillStyle(STONE, 1); g.fillRect(SLIP.x, SLIP.y, SLIP.w, SLIP.h - 4);
  for (let k = 0; k < 6; k++) { g.fillStyle(PLANK_DARK, 0.9); g.fillRect(SLIP.x + 10, SLIP.y + 8 + k * 12, SLIP.w - 20, 4); }
  g.fillStyle(SEA_SHALLOW, 0.5); g.fillRect(SLIP.x, SLIP.y + SLIP.h - 24, SLIP.w, 24);
  // A painted NOUGHT on the landing: a green circle the House keeps for its yacht.
  g.lineStyle(3, 0x2e9a5a, 0.7); g.strokeCircle(LANDING.x + LANDING.w / 2, LANDING.y + 150, 26);
  g.fillStyle(0x2e9a5a, 0.2); g.fillCircle(LANDING.x + LANDING.w / 2, LANDING.y + 150, 24);
}

// ── Pieces (each drawn once at depth = its base y) ──────────────────

type Piece = { x: number; y: number; w: number; h: number; draw: (g: G, rng: () => number) => void; when?: Cond };

const pieces: Piece[] = [];
const solids: Solid[] = [];

// The Draw Hall, facing the square.
pieces.push({ x: 1090, y: 650, w: 330, h: 300, draw: (g, rng) => drawHall(g, 1090, 650, 300, 118, rng) });
solids.push({ kind: 'rect', x: 940, y: 612, w: 300, h: 38 });
// The numbers board.
pieces.push({ x: 1480, y: 650, w: 230, h: 200, draw: (g, rng) => numbersBoard(g, 1480, 650, rng) });
solids.push({ kind: 'rect', x: 1400, y: 630, w: 160, h: 20 }, { kind: 'circle', x: 1377, y: 648, r: 5 }, { kind: 'circle', x: 1583, y: 648, r: 5 });
// The great drum's cradle (the barrel turns over actors).
pieces.push({ x: DRUM.x, y: DRUM.y, w: 260, h: 180, draw: (g) => drumCradle(g, DRUM.x, DRUM.y) });
solids.push({ kind: 'rect', x: 1195, y: 830, w: 210, h: 32 });
// After the King: the bell of melted black chips, hung on a gilt frame at the front of the square.
pieces.push({
  x: 1460, y: 990, w: 80, h: 110, when: KING, draw: (g) => {
    shadow(g, 1460, 992, 70, 14);
    g.lineStyle(5, GILT_DARK, 1); g.lineBetween(1428, 990, 1436, 900); g.lineBetween(1492, 990, 1484, 900);
    g.lineStyle(5, GILT, 1); g.lineBetween(1432, 900, 1488, 900);
    g.fillStyle(0x0a080c, 1); poly(g, [[1440, 960], [1480, 960], [1474, 914], [1446, 914]], 0x0a080c);
    g.fillStyle(BUST, 1); g.fillEllipse(1460, 962, 46, 10);
    g.fillStyle(0x4a4450, 0.8); g.fillRect(1450, 920, 4, 34);
    // A ring of names scratched round its waist, in gilt.
    g.fillStyle(GILT_LIT, 0.8); for (let k = 0; k < 10; k++) g.fillRect(1444 + k * 3.4, 944, 2, 2);
  },
});
solids.push({ kind: 'circle', x: 1430, y: 988, r: 5 }, { kind: 'circle', x: 1490, y: 988, r: 5 });

// The pawnshop under the three balls.
pieces.push({ x: 720, y: 690, w: 220, h: 200, draw: (g, rng) => pawnShop(g, 700, 690, 120, 110, rng) });
solids.push({ kind: 'rect', x: 640, y: 660, w: 124, h: 30 });

// Dice houses.
for (const [x, y, face, s, washing] of DICE_HOUSES) {
  pieces.push({ x: x + s * 0.2, y, w: s * 1.6, h: s * 1.5, draw: (g, rng) => { diceHouse(g, x, y, s, face, LAMP, rng, { washing }); } });
  solids.push({ kind: 'rect', x: x - s / 2, y: y - 30, w: s * 1.4, h: 30 });
}
// The Scrabbles' two: a cradle on the step, a line of tiny washing.
pieces.push({
  x: 2030, y: 712, w: 40, h: 30, draw: (g) => {
    shadow(g, 2030, 712, 30, 8);
    g.fillStyle(0x8a6a4a, 1); g.fillRoundedRect(2016, 696, 28, 14, 6);
    g.fillStyle(0xe8e0d0, 1); g.fillEllipse(2030, 698, 22, 6);
    g.lineStyle(1.5, 0x5a4028, 1); g.beginPath(); g.arc(2030, 712, 14, Math.PI * 1.1, Math.PI * 1.9, false); g.strokePath();
  },
});

// Lottery kiosks.
for (const [x, y, w, label] of KIOSKS) {
  pieces.push({ x, y, w: w + 40, h: 120, draw: (g, rng) => kiosk(g, x, y, w, label, rng) });
  solids.push({ kind: 'rect', x: x - w / 2, y: y - 14, w, h: 14 });
}

// Odds & Ends: a baize-green shop with a striped awning and a window of dice and chains.
pieces.push({
  x: 1800, y: 690, w: 260, h: 190, draw: (g, rng) => {
    house(g, 1800, 690, 200, 96, { wall: 0x2e6a46, roof: CARD_RED, trim: GILT_DARK, glow: LAMP, roofStyle: 'slant', chimney: true }, rng);
    // Striped awning over the window.
    for (let k = 0; k < 10; k++) {
      g.fillStyle(k % 2 ? IVORY : CARD_RED, 1);
      poly(g, [[1712 + k * 18, 626], [1730 + k * 18, 626], [1734 + k * 18, 642], [1716 + k * 18, 642]], k % 2 ? IVORY : CARD_RED);
    }
    for (let k = 0; k < 10; k++) { g.fillStyle(k % 2 ? IVORY : CARD_RED, 1); g.slice(1725 + k * 18, 642, 9, 0, Math.PI, false); g.fillPath(); }
    // The window display: dice in a pyramid, chains hanging, a jar of buttons.
    g.fillStyle(0x1a1614, 1); g.fillRect(1712, 648, 70, 32);
    g.fillStyle(LAMP, 0.4); g.fillRect(1714, 650, 66, 28);
    die(g, 1728, 678, 10, 5, 2, 3); die(g, 1742, 678, 10, 3, 1, 4); die(g, 1756, 678, 10, 6, 4, 2); die(g, 1736, 668, 10, 1, 6, 5);
    g.lineStyle(1, BRASS, 1); for (let k = 0; k < 4; k++) { const cx = 1766 + k * 3; g.beginPath(); g.arc(cx, 656, 4, 0, Math.PI, false); g.strokePath(); }
    g.fillStyle(0xa8c8c8, 0.6); g.fillRect(1840, 660, 14, 18);
    for (let k = 0; k < 8; k++) { g.fillStyle(CHIPS[k % CHIPS.length], 1); g.fillCircle(1843 + (k % 3) * 4, 664 + Math.floor(k / 3) * 5, 1.6); }
    // The sign: a plank with ODDS & ENDS dotted in gilt.
    g.fillStyle(PLANK_DARK, 1); g.fillRect(1742, 586, 116, 22);
    g.fillStyle(PLANK, 1); g.fillRect(1744, 588, 112, 18);
    g.fillStyle(GILT_LIT, 1); for (let c = 0; c < 18; c++) if (c !== 4 && c !== 6 && c !== 12) g.fillRect(1750 + c * 6, 593, 3.5, 8);
  },
});
solids.push({ kind: 'rect', x: 1700, y: 660, w: 200, h: 30 });

// The Lucky Loaf: an ivory bakery with a red-and-black chequered gable, a gilt loaf sign with a
// wishbone through it, and the drum-oven — a round oven shaped like a little Draw drum.
pieces.push({
  x: 1820, y: 1080, w: 280, h: 220, draw: (g, rng) => {
    house(g, 1820, 1080, 200, 100, { wall: 0xe8dcc4, roof: SQ_BLACK, trim: 0x7a2a22, glow: 0xffc070, roofStyle: 'gable', chimney: true }, rng);
    // Chequer the gable.
    for (let r = 0; r < 4; r++) for (let c = 0; c < 8 - r * 2; c++) {
      g.fillStyle((r + c) % 2 ? CARD_RED : SQ_BLACK, 0.9);
      g.fillRect(1820 - (8 - r * 2) * 9 + c * 18, 966 - r * 12, 18, 10);
    }
    // The drum-oven on the east wall: a brass barrel on a brick base, a fire-door, glowing.
    g.fillStyle(0x6a2a22, 1); g.fillRect(1912, 1040, 50, 40);
    for (let k = 0; k < 4; k++) { g.lineStyle(1, 0x4a1a14, 1); g.lineBetween(1912, 1050 + k * 9, 1962, 1050 + k * 9); }
    g.fillStyle(BRASS_DARK, 1); g.fillEllipse(1937, 1028, 58, 30);
    g.fillStyle(BRASS, 1); g.fillEllipse(1937, 1026, 54, 26);
    g.lineStyle(2, GILT, 1); g.strokeEllipse(1937, 1026, 40, 18);
    g.fillStyle(0x1a0e08, 1); g.fillEllipse(1937, 1062, 22, 14);
    g.fillStyle(0xff8a3a, 0.9); g.fillEllipse(1937, 1064, 16, 9);
    glow(g, 1937, 1064, 24, 0xff8a3a, 0.06, 3);
    // The sign: a gilt loaf with a wishbone stuck through, on a bracket.
    g.lineStyle(3, PIP, 1); g.lineBetween(1720, 1000, 1690, 1000); g.lineBetween(1690, 1000, 1690, 1010);
    g.fillStyle(GILT_DARK, 1); g.fillEllipse(1690, 1022, 42, 22);
    g.fillStyle(GILT, 1); g.fillEllipse(1690, 1020, 38, 18);
    for (let k = 0; k < 3; k++) { g.lineStyle(1.5, GILT_DARK, 1); g.lineBetween(1680 + k * 9, 1013, 1684 + k * 9, 1026); }
    g.lineStyle(2.5, IVORY, 1); g.lineBetween(1694, 1016, 1700, 1000); g.lineBetween(1704, 1016, 1700, 1000);
    // A rack of Draw-eve loaves by the door, a button glinting in one.
    g.fillStyle(PLANK_DARK, 1); g.fillRect(1850, 1062, 56, 4); g.fillRect(1852, 1066, 3, 14); g.fillRect(1901, 1066, 3, 14);
    for (let k = 0; k < 4; k++) {
      g.fillStyle(0x8a5a2a, 1); g.fillEllipse(1858 + k * 13, 1058, 12, 7);
      g.fillStyle(0xd8a060, 1); g.fillEllipse(1858 + k * 13, 1056, 8, 3.5);
    }
    g.fillStyle(BRASS_LIT, 1); g.fillCircle(1884, 1057, 1.6);
  },
});
solids.push({ kind: 'rect', x: 1720, y: 1050, w: 200, h: 30 }, { kind: 'rect', x: 1912, y: 1046, w: 50, h: 34 });

// The Long Shot: a sea-blue tackle shop with a gilt marlin over the door and rods racked outside.
pieces.push({
  x: 1600, y: 1185, w: 220, h: 190, draw: (g, rng) => {
    house(g, 1600, 1185, 150, 90, { wall: 0x3a5a6a, roof: 0x2a2a30, trim: 0xe8e0d0, glow: LAMP, roofStyle: 'slant' }, rng);
    // The marlin sign.
    g.lineStyle(3, PIP, 1); g.lineBetween(1600, 1080, 1600, 1066);
    g.fillStyle(GILT_DARK, 1);
    poly(g, [[1560, 1060], [1600, 1046], [1630, 1054], [1646, 1046], [1642, 1060], [1646, 1072], [1630, 1066], [1600, 1072]], GILT_DARK);
    poly(g, [[1562, 1059], [1600, 1048], [1628, 1056], [1600, 1068]], GILT);
    g.lineStyle(2, GILT_LIT, 1); g.lineBetween(1562, 1058, 1536, 1056);
    g.fillStyle(GILT_LIT, 1); poly(g, [[1594, 1048], [1608, 1036], [1612, 1050]], GILT_LIT);
    g.fillStyle(PIP, 1); g.fillCircle(1568, 1056, 1.6);
    // Rods leaning against the wall, a creel, and a net hung to dry.
    for (let k = 0; k < 4; k++) { g.lineStyle(1.6, k % 2 ? 0x8a6a4a : 0x2a2a2a, 1); g.lineBetween(1532 + k * 6, 1184, 1520 + k * 4, 1094 - k * 6); }
    g.fillStyle(0x9a7a4a, 1); g.fillRoundedRect(1648, 1166, 22, 18, 3);
    g.lineStyle(1, 0x6a4a2a, 1); for (let k = 0; k < 3; k++) g.lineBetween(1648, 1170 + k * 5, 1670, 1170 + k * 5);
    g.lineStyle(1, ROPE, 0.6);
    for (let k = 0; k < 7; k++) { g.lineBetween(1640 + k * 5, 1104, 1644 + k * 5, 1134); g.lineBetween(1640, 1106 + k * 4, 1674, 1108 + k * 4); }
  },
});
solids.push({ kind: 'rect', x: 1525, y: 1155, w: 150, h: 30 });

// The boatwright's slip: a hull on stocks at the head of the slipway.
pieces.push({ x: 450, y: 1240, w: 220, h: 120, draw: (g, rng) => hullOnStocks(g, 440, 1240, 130, rng) });
solids.push({ kind: 'rect', x: 375, y: 1214, w: 140, h: 26 });
// Barnaby's sawhorse and a stack of oak.
pieces.push({
  x: 640, y: 1200, w: 70, h: 40, draw: (g) => {
    shadow(g, 640, 1202, 60, 10);
    g.fillStyle(PLANK_DARK, 1); g.fillRect(616, 1180, 4, 20); g.fillRect(660, 1180, 4, 20);
    for (let k = 0; k < 4; k++) { g.fillStyle(k % 2 ? 0x8a6a4a : 0x7a5a3a, 1); g.fillRect(606, 1172 - k * 6, 68, 6); }
  },
});
solids.push({ kind: 'rect', x: 606, y: 1186, w: 68, h: 14 });

// The spinning-top lighthouse's skerry and plinth (the top spins over actors).
pieces.push({ x: LIGHT.x, y: LIGHT.y, w: 180, h: 80, draw: (g, rng) => topPlinth(g, LIGHT.x, LIGHT.y, rng) });
solids.push({ kind: 'circle', x: LIGHT.x, y: LIGHT.y - 14, r: 46 });

// The Lot Wall and the Draw Bell's tower on the top terrace.
pieces.push({ x: 1760, y: 300, w: 360, h: 130, draw: (g, rng) => lotWall(g, 1760, 300, 320, 90, rng) });
solids.push({ kind: 'rect', x: 1600, y: 284, w: 320, h: 16 });
pieces.push({ x: 2250, y: 330, w: 260, h: 300, draw: (g, rng) => bellTower(g, 2250, 330, rng) });
solids.push({ kind: 'rect', x: 2210, y: 300, w: 80, h: 30 });

// The north arch: two pale piers under a gilt lintel with a die on each, over the road out.
pieces.push({
  x: 1300, y: 172, w: 240, h: 200, draw: (g) => {
    archway(g, 1300, 172, 190, 150, 0xd8d0bc);
    g.fillStyle(GILT_DARK, 1); g.fillRect(1196, 14, 208, 12);
    g.fillStyle(GILT, 1); g.fillRect(1198, 12, 204, 8);
    die(g, 1210, 12, 18, 6, 5, 4, IVORY); die(g, 1390, 12, 18, 6, 5, 4, IVORY);
    houseWheel(g, 1300, 34, 12, 1);
  },
});
solids.push({ kind: 'circle', x: 1210, y: 166, r: 12 }, { kind: 'circle', x: 1390, y: 166, r: 12 });

// The allotment shed and its scarecrow, who wears a dealer's visor and holds a rake.
pieces.push({
  x: 170, y: 300, w: 120, h: 120, draw: (g, rng) => {
    house(g, 170, 300, 80, 56, { wall: 0x6a5a3e, roof: 0x3a4a2a, roofStyle: 'slant' }, rng);
    for (let k = 0; k < 3; k++) { g.fillStyle(0x8a6a3a, 1); g.fillRect(214, 280 + k * 6, 16, 5); }
    g.fillStyle(0x4a6a8a, 1); g.fillRect(132, 284, 10, 14);
  },
});
solids.push({ kind: 'rect', x: 130, y: 270, w: 80, h: 30 });
pieces.push({
  x: 700, y: 250, w: 60, h: 110, draw: (g) => {
    shadow(g, 700, 252, 26, 8);
    g.fillStyle(PLANK_DARK, 1); g.fillRect(698, 160, 4, 90); g.fillRect(670, 186, 60, 4);
    g.fillStyle(0x7a2a3a, 1); poly(g, [[684, 190], [716, 190], [722, 230], [678, 230]], 0x7a2a3a);
    g.fillStyle(0xd8c890, 1); g.fillCircle(700, 172, 12);
    g.fillStyle(0x1e5a32, 0.9); g.fillEllipse(700, 164, 30, 7);
    g.fillStyle(PIP, 1); g.fillCircle(696, 174, 1.4); g.fillCircle(704, 174, 1.4);
    g.lineStyle(2, 0x5a4028, 1); g.lineBetween(728, 188, 742, 150); g.lineBetween(736, 150, 748, 150);
    for (let k = 0; k < 5; k++) { g.lineStyle(1.5, 0xc8a850, 1); g.lineBetween(670 + k * 2, 188, 664 + k * 2, 196); }
  },
});
solids.push({ kind: 'circle', x: 700, y: 246, r: 6 });

// The terrace hedge, clipped square, a brass plot-number every so often.
for (const [x0, x1] of HEDGES) {
  const cx = (x0 + x1) / 2;
  pieces.push({
    x: cx, y: HEDGE_Y, w: x1 - x0 + 20, h: 50, draw: (g, rng) => {
      g.fillStyle(0x000000, 0.25); g.fillRect(x0, HEDGE_Y - 2, x1 - x0, 8);
      g.fillStyle(BAIZE_DARK, 1); g.fillRoundedRect(x0, HEDGE_Y - 32, x1 - x0, 32, 6);
      g.fillStyle(0x2a6a3e, 1); g.fillRoundedRect(x0 + 2, HEDGE_Y - 34, x1 - x0 - 4, 26, 6);
      g.fillStyle(BAIZE_LIT, 0.5); g.fillRect(x0 + 6, HEDGE_Y - 32, x1 - x0 - 12, 4);
      for (let k = 0; k < (x1 - x0) / 7; k++) { g.fillStyle(dim(0x2a6a3e, 0.3), 0.6); g.fillRect(x0 + 4 + rng() * (x1 - x0 - 8), HEDGE_Y - 28 + rng() * 22, 2, 1.5); }
      for (let px = x0 + 60; px < x1 - 30; px += 140) {
        g.fillStyle(BRASS_DARK, 1); g.fillRoundedRect(px - 9, HEDGE_Y - 22, 18, 11, 2);
        g.fillStyle(BRASS, 1); g.fillRoundedRect(px - 8, HEDGE_Y - 21, 16, 9, 2);
        g.fillStyle(BRASS_DARK, 1); for (let d = 0; d < 3; d++) g.fillRect(px - 6 + d * 4.5, HEDGE_Y - 19, 2.5, 5);
      }
    },
  });
  solids.push({ kind: 'rect', x: x0, y: HEDGE_Y - 20, w: x1 - x0, h: 20 });
}

// Dice bollards along the quay edge.
for (const [x, face] of BOLLARDS) {
  pieces.push({ x, y: SEA_Y - 12, w: 40, h: 40, draw: (g) => diceBollard(g, x, SEA_Y - 12, face, face % 2 === 0) });
  solids.push({ kind: 'circle', x, y: SEA_Y - 16, r: 10 });
}

// Green lamps.
for (const [x, y] of LAMPS) {
  pieces.push({ x, y, w: 40, h: 80, draw: (g) => greenLamp(g, x, y, 64) });
  solids.push({ kind: 'circle', x, y: y - 2, r: 5 });
}

// Chip-stack bollards round the square's corners, and benches on the lawns.
for (const [x, y] of [[1088, 668], [1512, 668], [1088, 992], [1512, 992]] as [number, number][]) {
  pieces.push({ x, y, w: 30, h: 40, draw: (g) => chipStack(g, x, y, 8, 8, [CARD_RED, SQ_BLACK, IVORY]) });
  solids.push({ kind: 'circle', x, y: y - 2, r: 8 });
}
for (const [x, y] of [[900, 560], [1700, 560], [360, 940], [2400, 940]] as [number, number][]) {
  pieces.push({
    x, y, w: 80, h: 40, draw: (g) => {
      shadow(g, x, y + 2, 70, 10);
      g.fillStyle(0x1a1614, 1); g.fillRect(x - 30, y - 14, 4, 14); g.fillRect(x + 26, y - 14, 4, 14);
      for (let k = 0; k < 3; k++) { g.fillStyle(k % 2 ? CARD_RED : SQ_BLACK, 1); g.fillRect(x - 34, y - 18 - k * 5, 68, 4); }
      g.fillStyle(GILT, 1); g.fillCircle(x - 32, y - 20, 2); g.fillCircle(x + 32, y - 20, 2);
    },
  });
  solids.push({ kind: 'rect', x: x - 34, y: y - 10, w: 68, h: 10 });
}
// Rocks along the shore under the lighthouse and at the west end.
pieces.push({
  x: 2560, y: 1286, w: 120, h: 60, draw: (g, rng) => {
    rock(g, 2540, 1284, 22, 0x3a383c, rng); rock(g, 2580, 1280, 18, 0x2e2c30, rng); rock(g, 2400, 1288, 14, 0x3a383c, rng);
  },
});

// ── Animation ────────────────────────────────────────────────────────

/** Under actors: the harbour moving, gulls scrapping over chips on the quay. */
function animateUnder(g: G, t: number, view: Rect): void {
  // Foam along the quay and round the jetty legs.
  if (view.y + view.h > SEA_Y - 20) {
    const x0 = Math.max(0, view.x - 40), x1 = Math.min(W, view.x + view.w + 40);
    for (let x = x0 - (x0 % 36); x < x1; x += 36) {
      const ph = Math.sin(t * 1.4 + x * 0.05);
      g.fillStyle(FOAM, 0.22 + ph * 0.1); g.fillEllipse(x + 18, SEA_Y + 6 + ph * 2, 22, 3);
    }
    for (const r of [LANDING, KIOSK_PIER, CHIP_PIER]) {
      for (let y = r.y + 30; y < r.y + r.h; y += 50) {
        for (const lx of [r.x - 2, r.x + r.w + 2]) {
          if (!inView(view, lx, y, 20)) continue;
          const q = (t * 0.7 + y * 0.01) % 1;
          g.lineStyle(1, FOAM, 0.4 * (1 - q)); g.strokeEllipse(lx, y + 3, 10 + q * 16, 3 + q * 4);
        }
      }
    }
    // Glints off the stakes on the sea floor.
    for (let k = 0; k < 24; k++) {
      const gx = (k * 397) % W, gy = SEA_Y + 30 + ((k * 131) % (H - SEA_Y - 40));
      if (!inView(view, gx, gy, 10)) continue;
      const a = Math.max(0, Math.sin(t * 2 + k * 1.7));
      g.fillStyle(GILT_LIT, a * 0.5); g.fillEllipse(gx, gy, 8 * a + 1, 1.5);
    }
  }
  // Gulls fighting over a dropped chip.
  for (const [x, y, s] of GULL_SPOTS) {
    if (!inView(view, x, y, 60)) continue;
    chip(g, x, y, 5, CHIPS[s % CHIPS.length]);
    for (let k = 0; k < 3; k++) {
      const ph = t * (1.6 + k * 0.4) + s * 2 + k * 2.1;
      const hop = Math.max(0, Math.sin(ph * 2.2)) * 6;
      const gx = x + Math.cos(ph * 0.7 + k * 2.1) * (16 + k * 4);
      const gy = y + Math.sin(ph * 0.7 + k * 2.1) * 6 + 4;
      gull(g, gx, gy - hop, hop > 3 ? 1 : 0.2, gx < x ? 1 : -1);
    }
  }
}

/** Over actors: the drum turning, the board flipping, the kiosk wheels, the top, bunting. */
function animateAbove(g: G, t: number, view: Rect, world: PainterWorld): void {
  const king = world.test(KING);
  // The great drum.
  if (inView(view, DRUM_AXLE.x, DRUM_AXLE.y, 120)) {
    if (king) {
      // Stopped, its lid off and the false drawer hanging out, Lots spilled down the dais.
      drumBarrel(g, DRUM_AXLE.x, DRUM_AXLE.y, 0.4, 0);
      g.fillStyle(0x1a140a, 1); g.fillRect(DRUM_AXLE.x - 40, DRUM_AXLE.y + 30, 80, 22);
      g.fillStyle(PLANK_DARK, 1); g.fillRect(DRUM_AXLE.x - 44, DRUM_AXLE.y + 48, 88, 8);
      g.lineStyle(1.5, BRASS_LIT, 1); for (let k = 0; k < 10; k++) g.lineBetween(DRUM_AXLE.x - 36 + k * 8, DRUM_AXLE.y + 30, DRUM_AXLE.x - 36 + k * 8, DRUM_AXLE.y + 36);
      for (let k = 0; k < 14; k++) lot(g, DRUM_AXLE.x - 40 + ((k * 37) % 80), DRUM_AXLE.y + 62 + ((k * 13) % 40), 3.4);
    } else {
      const rot = t * 1.1;
      drumBarrel(g, DRUM_AXLE.x, DRUM_AXLE.y, rot, t);
      // The crank going round.
      const cx = DRUM_AXLE.x + 104, cy = DRUM_AXLE.y;
      g.lineStyle(4, BRASS, 1); g.lineBetween(cx, cy, cx + Math.cos(rot) * 18, cy + Math.sin(rot) * 18);
      g.fillStyle(PLANK_DARK, 1); g.fillCircle(cx + Math.cos(rot) * 18, cy + Math.sin(rot) * 18, 4);
    }
  }
  // The numbers board: one tile at a time flips over, showing a fresh number.
  if (inView(view, 1480, 560, 140)) {
    const top = 650 - 30 - BOARD.h;
    const idx = Math.floor(t / 1.4) % (BOARD.rows * BOARD.cols);
    const q = (t / 1.4) % 1;
    const r = Math.floor(idx / BOARD.cols), c = idx % BOARD.cols;
    const tx = 1480 - BOARD.w / 2 + 12 + c * 38, ty = top + 32 + r * 19;
    if (q < 0.4) {
      const sq = Math.abs(Math.cos((q / 0.4) * Math.PI));
      g.fillStyle(0x16161c, 1); g.fillRect(tx - 1, ty - 1, 34, 17);
      g.fillStyle(0xe8e4d8, 1); g.fillRect(tx, ty + 7.5 - 7.5 * sq, 32, 15 * sq);
      g.fillStyle(CARD_RED, 0.8); g.fillRect(tx, ty + 7, 32, 1);
    }
    if (king) {
      // After the King the header reads NAMES, in a different hand: a chalk strip over the banner.
      g.fillStyle(0xf0f0e8, 0.85); g.fillRect(1480 - 50, top + 9, 100, 12);
      g.fillStyle(PIP, 1); for (let k = 0; k < 5; k++) g.fillRect(1480 - 42 + k * 18, top + 11, 10, 8);
    }
  }
  // Kiosk wheels (gone from the berth kiosk once the King is down — Lottie sells ices from it).
  KIOSKS.forEach(([x, y], i) => {
    if (!inView(view, x, y - 100, 40)) return;
    if (king && i === 0) {
      g.fillStyle(0xe8a0b8, 1); g.fillCircle(x - 6, y - 106, 6); g.fillStyle(0x4a1a2a, 1); g.fillCircle(x + 6, y - 106, 6);
      g.fillStyle(0xd8b888, 1); g.fillTriangle(x - 11, y - 102, x - 1, y - 102, x - 6, y - 90); g.fillTriangle(x + 1, y - 102, x + 11, y - 102, x + 6, y - 90);
      return;
    }
    kioskWheel(g, x, y - 104, 12, t * (2 + i * 0.7) + i);
  });
  // The lighthouse top and its beam.
  if (inView(view, LIGHT.x, LIGHT.y - 120, 400)) {
    const a = t * 0.9;
    const lx = LIGHT.x, ly = LIGHT.y - 18 - 60 - 54 - 18;
    const len = 520;
    g.fillStyle(LAMP, 0.08);
    poly(g, [[lx, ly], [lx + Math.cos(a - 0.12) * len, ly + Math.sin(a - 0.12) * len * 0.45], [lx + Math.cos(a + 0.12) * len, ly + Math.sin(a + 0.12) * len * 0.45]], LAMP, 0.08);
    topSpin(g, LIGHT.x, LIGHT.y - 18, t);
    glow(g, lx, ly, 30, LAMP, 0.05, 3);
  }
  // Bunting across the square and over Jetty Street, fluttering.
  if (inView(view, 1300, 640, 300)) {
    bunting(g, { x: 1236, y: 560 }, { x: 1400, y: 560 }, 22, 9, t);
    bunting(g, { x: 1236, y: 560 }, { x: 1100, y: 700 }, 18, 8, t + 1);
  }
  if (inView(view, 1300, 1160, 200)) bunting(g, { x: 1230, y: 1106 }, { x: 1370, y: 1106 }, 16, 8, t + 2);
  // Smoke from the drum-oven.
  if (inView(view, 1937, 990, 80)) {
    for (let k = 0; k < 4; k++) {
      const q = (t * 0.25 + k / 4) % 1;
      g.fillStyle(0xd8d0c8, 0.22 * (1 - q)); g.fillCircle(1937 + Math.sin(t + k) * 6 + q * 10, 1000 - q * 70, 6 + q * 10);
    }
  }
  // The scarecrow's visor flapping, and a ticket stub blowing about the square.
  if (inView(view, 1300, 820, 300)) {
    const q = (t * 0.2) % 1;
    const sx = 1100 + q * 400, sy = 900 + Math.sin(t * 3) * 30 - q * 40;
    g.fillStyle(0xf0c8c8, 0.85); g.fillRect(sx, sy, 6, 3);
  }
  // A green lamp's glow pooled under each lamp after dark-ish (always — Tosswater never turns them off).
  for (const [x, y] of LAMPS) {
    if (!inView(view, x, y, 40)) continue;
    g.fillStyle(0x5ad07e, 0.05 + Math.sin(t * 2 + x) * 0.01); g.fillEllipse(x, y + 4, 60, 18);
  }
  if (inView(view, 1460, 940, 60) && king) {
    // The chip bell's clapper, swinging.
    const sw = Math.sin(t * 2.4) * 0.3;
    g.lineStyle(2, 0x4a4450, 1); g.lineBetween(1460, 914, 1460 + Math.sin(sw) * 20, 914 + Math.cos(sw) * 40);
    g.fillStyle(0x4a4450, 1); g.fillCircle(1460 + Math.sin(sw) * 20, 914 + Math.cos(sw) * 40, 4);
  }
}

// ── Solids: the sea, round the timber ───────────────────────────────

solids.push(...carve({ x: 0, y: SEA_Y, w: W, h: H - SEA_Y }, [LANDING, KIOSK_PIER, CHIP_PIER, SLIP]));

const POIS: Poi[] = [
  { kind: 'waystone', at: { x: 1180, y: 1214 } },
  { kind: 'mooring', at: { x: 1300, y: 1470 }, isle: 'fate' },
  { kind: 'water', id: 'tosswater-sea-water', shape: { x: 0, y: 1300, w: W, h: H - 1300 }, fishery: 'tosswater-sea' },
  { kind: 'sign', at: { x: 1384, y: 540 }, text: 'NORTH — up the hill to the Card Court. Prince Ante\'s Dealing Hall. Cut the deck honestly.' },
  { kind: 'sign', at: { x: 150, y: 700 }, text: 'WEST — The Treasury Court. Prince Bullion\'s mint. Toll payable at the bridge.' },
  { kind: 'sign', at: { x: 2470, y: 704 }, text: 'EAST — The Mind Court. Prince Gambit\'s parlours. Your thoughts will be checked.' },
  { kind: 'sign', at: { x: 1384, y: 1262 }, text: 'THE LANDING. Berths by lot at the kiosk. Berth nought is reserved for His Majesty\'s yacht.' },
  {
    kind: 'sign', at: { x: 1424, y: 1000 },
    text: 'THE DRAW. Weekly, at the drum. Every Lot goes in. The drum chooses. Chance is the only fair ruler. — L.',
  },
  { kind: 'sign', at: { x: 1760, y: 330 }, text: 'THE LOT WALL. Here hang the Lots of those who wagered and lost. The House thanks them.' },
  { kind: 'sign', at: { x: 560, y: 410 }, text: 'THE ALLOTMENTS. Plots drawn by lot each spring. Drawn holders forfeit. No appeals.' },
  { kind: 'sign', at: { x: 2380, y: 1180 }, text: 'THE TOP. Whipped at dusk, spun till dawn. Do not touch the point. — W. Topsy, Keeper' },
  { kind: 'chest', id: 'tosswater-chest-quay', at: { x: 40, y: 1240 }, coins: 120, orbs: 1 },
  { kind: 'chest', id: 'tosswater-chest-pier', at: { x: 2015, y: 1420 }, orbs: 2, coins: 60 },
  { kind: 'chest', id: 'tosswater-chest-drum', at: { x: 1300, y: 980 }, coins: 400, open: KING },
];

export const TOSSWATER_AREA: AreaDef = {
  id: 'tosswater',
  isle: 'fate',
  name: 'Tosswater',
  subtitle: 'Harbour of the Draw',
  w: W,
  h: H,
  bg: BAIZE_DARK,
  accent: GILT,
  weather: 'confetti',
  spawn: { x: 1300, y: 1410 },
  painter: { ground: paintGround, pieces, animate: animateUnder, animateOver: animateAbove },
  solids,
  exits: [
    { side: 'n', to: 'card', label: 'Up the hill — the Card Court' },
    { side: 'w', to: 'treasury', label: 'The Mint Road — the Treasury Court' },
    { side: 'e', to: 'mind', label: 'The Parlour Road — the Mind Court' },
  ],
  pois: POIS,
  npcs: TOSSWATER_NPCS,
  crowd: TOSSWATER_CROWD,
};

