import type { AreaDef, Poi, Rect, Solid } from '../../../../IslesTypes';
import { type G, blob, dim, flagstones, glow, groundFill, lit, mixC, road, rock, shadow } from '../../../../art/IsleArt';
import { carve, inView } from '../../../water/isle/port/art';
import {
  BRASS, BRASS_DARK, BRASS_LIT, BRONZE, COBBLE, COBBLE_ALT, EMBER, FOAM, GRANITE, GRANITE_DARK, GRANITE_LIT, LAMP,
  MAESTRO_GOLD, MELT, OCHRE, PAPER, PLASTER, ROSE, SEA, SEA_DEEP, SEA_SHALLOW, SNOW, SNOW_SHADE, TOWER, WOOD, WOOD_DARK,
  WOOD_LIT, bakery, bellBuoy, bellLamp, belfryBells, carillonTower, castingPit, coolingFrame, customsHouse, ferryHorn,
  foundry, hullOnStocks, hymnStall, maestroMark, partBoard, quaver, snowPine, soundRing, sundryShop, tackleShed,
  terraceHouse,
} from './art';
import { CARILLON_CROWD, CARILLON_NPCS } from './people';

/**
 * Carillon Quay — the harbour of bells, where every crossing to Choirholm makes landfall.
 *
 * The isle rises out of the sea in terraces like the tiers of a concert hall, every one facing the
 * summit; the Quay is the bottom tier, the stalls. Along the waterfront runs a granite quay with
 * the harbour below it: the landing jetty in the middle (every crossing ties up at its head), the
 * west mole with Ottilie Brasswick's slipway beside it, and the east jetty where Abel Fathom's
 * tackle shed stands and the fishers fish. Bell-buoys clang off all of them in the swell.
 *
 * On the quay, by the landing, the Tuners' customs house gives every sailor a Part; beside it the
 * carillon tower rings the Hours for the shipping, with the singing-mark at its foot where the
 * Quay stands to sing. Up from the quay is the lower terrace: the Singing Square with the Register
 * of Parts and Pim Staveley's hymn-sheet stall, the Rising Loaf, Chime & Sundry, the Clapperton
 * bell-foundry with its casting pit and a new bell hung in the yard to cool, and the Paper Road
 * and Muffled Road running out west and east. A retaining wall with three stairs climbs to the
 * snowy upper terrace, a row of tall houses, and the road north to the Brass Court.
 */

const W = 2600;
const H = 1500;
/** Where the sea begins along the south shore. */
const SEA_Y = 1270;
/** The retaining wall between the lower and upper terrace. */
const WALL_Y0 = 540;
const WALL_Y1 = 572;
/** The three stairs up through it: [x0, x1]. */
const STAIRS: [number, number][] = [[380, 470], [1220, 1380], [2120, 2210]];
/** Top of the quay (the lower terrace's south edge). */
const QUAY_Y = 1060;
/** The Singing Square. */
const SQUARE: Rect = { x: 1240, y: 630, w: 540, h: 370 };

/** Walkable timber and stone out over the sea — shared by the painter and the solids. */
const LANDING: Rect = { x: 1245, y: 1262, w: 110, h: 238 };
const EAST_JETTY: Rect = { x: 2040, y: 1262, w: 80, h: 176 };
const WEST_MOLE: Rect = { x: 290, y: 1262, w: 100, h: 156 };

/** Bell-buoys out in the harbour: [x, y, phase]. */
const BUOYS: [number, number, number][] = [[620, 1410, 0], [980, 1462, 1.7], [1720, 1430, 3.1], [2390, 1398, 4.6], [2178, 1454, 2.4]];

const TOWER_X = 1560;
const TOWER_Y = 1060;
const PIT = { x: 690, y: 950, r: 46 };

// ── Ground ──────────────────────────────────────────────────────────

function paintGround(g: G, rng: () => number): void {
  // ── The upper terrace: snow over cobbles, worn through along the lanes.
  groundFill(g, { x: 0, y: 0, w: W, h: WALL_Y1 }, 0xdfe5ec, SNOW, 0xaab4c0, rng, 1.1);
  for (let i = 0; i < 40; i++) blob(g, rng() * W, 90 + rng() * 440, 40 + rng() * 70, 12 + rng() * 22, SNOW, 0.6, rng);
  road(g, [{ x: 1300, y: -10 }, { x: 1300, y: 200 }, { x: 1300, y: WALL_Y0 }], 120, COBBLE, 0x6a645c, COBBLE_ALT, rng);
  road(g, [{ x: 90, y: 450 }, { x: 700, y: 440 }, { x: 1300, y: 446 }, { x: 1900, y: 440 }, { x: 2510, y: 450 }], 64, COBBLE, 0x6a645c, COBBLE_ALT, rng);
  for (const [x0, x1] of STAIRS) road(g, [{ x: (x0 + x1) / 2, y: 446 }, { x: (x0 + x1) / 2, y: WALL_Y0 }], x1 - x0 - 10, COBBLE, 0x6a645c, COBBLE_ALT, rng);
  // Footprints in the snow beside the lanes — everybody walks the same line.
  for (let i = 0; i < 90; i++) {
    const x = rng() * W, y = 470 + rng() * 60;
    g.fillStyle(0xaab4c0, 0.4); g.fillEllipse(x, y, 4, 6); g.fillEllipse(x + 6, y - 8, 4, 6);
  }

  // ── The north edge: snow-capped crags under the next terrace up, broken by the road.
  for (let x = -20; x < W + 20; x += 34) {
    if (x > 1210 && x < 1390) continue;
    const s = 1.4 + rng() * 1.2;
    rock(g, x, 70 + rng() * 18, s, 0x6a6a72, rng);
    g.fillStyle(SNOW, 1); g.fillEllipse(x + 2, 52 + rng() * 10, 34 * s * 0.6, 10);
  }
  g.fillStyle(0x4a4a52, 1); g.fillRect(0, 0, 1200, 36); g.fillRect(1400, 0, 1200, 36);
  g.fillStyle(SNOW, 1); for (let x = 0; x < W; x += 22) if (x < 1200 || x > 1400) g.fillEllipse(x + 11, 36, 30, 10);

  // ── The lower terrace: granite setts, snow swept to the walls.
  groundFill(g, { x: 0, y: WALL_Y1, w: W, h: QUAY_Y - WALL_Y1 }, COBBLE, COBBLE_ALT, 0x5a5048, rng, 1.2);
  for (let i = 0; i < 1400; i++) {
    const x = rng() * W, y = WALL_Y1 + rng() * (QUAY_Y - WALL_Y1);
    g.fillStyle(mixC(COBBLE, rng() < 0.5 ? COBBLE_ALT : GRANITE_LIT, rng() * 0.4), 0.7);
    g.fillRoundedRect(x - 5, y - 3.5, 10, 7, 2);
  }
  for (let i = 0; i < 26; i++) blob(g, rng() * W, WALL_Y1 + 10 + rng() * 26, 40 + rng() * 60, 8 + rng() * 10, SNOW, 0.85, rng);
  road(g, [{ x: -10, y: 760 }, { x: 500, y: 756 }, { x: 900, y: 762 }, { x: SQUARE.x, y: 760 }], 88, 0x8a8070, 0x5a544c, COBBLE_ALT, rng);
  road(g, [{ x: SQUARE.x + SQUARE.w, y: 900 }, { x: 2100, y: 920 }, { x: 2290, y: 800 }, { x: W + 10, y: 760 }], 88, 0x8a8070, 0x5a544c, COBBLE_ALT, rng);
  road(g, [{ x: 1300, y: SQUARE.y + SQUARE.h }, { x: 1300, y: QUAY_Y + 30 }], 110, 0x8a8070, 0x5a544c, COBBLE_ALT, rng);
  road(g, [{ x: 1300, y: WALL_Y1 }, { x: 1300, y: SQUARE.y }], 140, 0x8a8070, 0x5a544c, COBBLE_ALT, rng);
  // The foundry yard: trodden black with soot and spilt sand.
  for (let i = 0; i < 26; i++) blob(g, 500 + rng() * 420, 880 + rng() * 140, 30 + rng() * 40, 10 + rng() * 16, 0x3a3430, 0.35, rng);
  for (let i = 0; i < 60; i++) { g.fillStyle(0xc8a870, 0.35); g.fillCircle(560 + rng() * 300, 900 + rng() * 120, 1 + rng() * 2); }

  // ── The Singing Square: big flags, a brass stave let into them from side to side.
  flagstones(g, SQUARE, 46, 0xa8a090, 0x5a544c, rng);
  for (let l = 0; l < 5; l++) {
    const ly = SQUARE.y + 150 + l * 16;
    g.fillStyle(BRASS_DARK, 1); g.fillRect(SQUARE.x + 20, ly - 2, SQUARE.w - 40, 4);
    g.fillStyle(BRASS, 1); g.fillRect(SQUARE.x + 20, ly - 1.5, SQUARE.w - 40, 2.5);
  }
  for (let bx = SQUARE.x + 20; bx <= SQUARE.x + SQUARE.w - 20; bx += 125) { g.fillStyle(BRASS_DARK, 1); g.fillRect(bx, SQUARE.y + 146, 3, 72); }
  // A treble clef of brass at the head of the stave, and the Hours' first bar of notes.
  g.lineStyle(3, BRASS, 1);
  g.beginPath(); g.arc(SQUARE.x + 52, SQUARE.y + 190, 14, 0, Math.PI * 1.7, false); g.strokePath();
  g.lineBetween(SQUARE.x + 58, SQUARE.y + 140, SQUARE.x + 50, SQUARE.y + 226);
  g.beginPath(); g.arc(SQUARE.x + 52, SQUARE.y + 150, 9, Math.PI * 1.2, Math.PI * 2.4, false); g.strokePath();
  for (let k = 0; k < 9; k++) {
    const nx = SQUARE.x + 100 + k * 48, ny = SQUARE.y + 150 + ((k * 5) % 9) * 8;
    quaver(g, nx, ny, 1.4, BRASS, 0.9);
  }
  // Snow swept into the square's corners.
  for (const [cx, cy] of [[SQUARE.x + 20, SQUARE.y + 16], [SQUARE.x + SQUARE.w - 20, SQUARE.y + 16]] as [number, number][]) {
    blob(g, cx, cy, 34, 14, SNOW, 0.9, rng);
  }

  // ── The retaining wall and its three stairs.
  let sx = 0;
  const spans: [number, number][] = [];
  for (const [a, b] of STAIRS) { spans.push([sx, a]); sx = b; }
  spans.push([sx, W]);
  for (const [a, b] of spans) {
    g.fillStyle(GRANITE_DARK, 1); g.fillRect(a, WALL_Y0 - 6, b - a, WALL_Y1 - WALL_Y0 + 6);
    for (let cy = WALL_Y0; cy < WALL_Y1; cy += 11) {
      const off = ((cy / 11) | 0) % 2 ? 0 : 22;
      for (let cx = a - off; cx < b; cx += 44) {
        const x0 = Math.max(a, cx), x1 = Math.min(b, cx + 43);
        if (x1 > x0) { g.fillStyle(mixC(GRANITE, rng() < 0.5 ? GRANITE_LIT : GRANITE_DARK, rng() * 0.35), 1); g.fillRect(x0, cy + 1, x1 - x0, 10); }
      }
    }
    g.fillStyle(GRANITE_LIT, 1); g.fillRect(a, WALL_Y0 - 8, b - a, 5);
    for (let x = a; x < b; x += 16) { g.fillStyle(SNOW_SHADE, 1); g.fillEllipse(x + 8, WALL_Y0 - 8, 20, 7); g.fillStyle(SNOW, 1); g.fillEllipse(x + 8, WALL_Y0 - 9, 18, 5); }
    g.fillStyle(0x000000, 0.22); g.fillRect(a, WALL_Y1, b - a, 6);
  }
  for (const [a, b] of STAIRS) {
    for (let k = 0; k < 5; k++) {
      const y = WALL_Y0 - 8 + k * 8;
      g.fillStyle(k % 2 ? GRANITE : GRANITE_LIT, 1); g.fillRect(a, y, b - a, 7);
      g.fillStyle(0x000000, 0.2); g.fillRect(a, y + 6, b - a, 1.5);
    }
    g.fillStyle(GRANITE_DARK, 1); g.fillRect(a - 8, WALL_Y0 - 14, 10, WALL_Y1 - WALL_Y0 + 16); g.fillRect(b - 2, WALL_Y0 - 14, 10, WALL_Y1 - WALL_Y0 + 16);
    g.fillStyle(SNOW, 1); g.fillEllipse(a - 3, WALL_Y0 - 15, 16, 6); g.fillEllipse(b + 3, WALL_Y0 - 15, 16, 6);
  }

  // ── The quay: big granite flags, a kerb, bollards and mooring rings.
  flagstones(g, { x: 0, y: QUAY_Y, w: W, h: SEA_Y - QUAY_Y }, 58, GRANITE, 0x4a4640, rng);
  g.fillStyle(GRANITE_DARK, 1); g.fillRect(0, QUAY_Y - 4, W, 6);
  for (let i = 0; i < 30; i++) { g.fillStyle(0x2a3440, 0.1); g.fillEllipse(rng() * W, SEA_Y - 30 - rng() * 60, 60 + rng() * 80, 10); }
  // The singing-mark at the tower's foot: a ring of brass studs round the Maestro's mark.
  const mx = TOWER_X, my = 1132;
  g.fillStyle(0x000000, 0.14); g.fillEllipse(mx, my + 3, 170, 60);
  for (let k = 0; k < 22; k++) {
    const a = (k / 22) * Math.PI * 2;
    const px = mx + Math.cos(a) * 76, py = my + Math.sin(a) * 28;
    g.fillStyle(BRASS_DARK, 1); g.fillCircle(px, py + 1, 5); g.fillStyle(BRASS, 1); g.fillCircle(px, py, 4.4);
    g.fillStyle(BRASS_LIT, 0.8); g.fillCircle(px - 1.2, py - 1.2, 1.5);
  }
  maestroMark(g, mx, my, 18, 0.6);
  // Kerb along the water, with bollards and rings.
  g.fillStyle(GRANITE_DARK, 1); g.fillRect(0, SEA_Y - 12, W, 14);
  g.fillStyle(GRANITE_LIT, 1); g.fillRect(0, SEA_Y - 12, W, 4);
  for (let x = 40; x < W; x += 150) {
    if (x > LANDING.x - 20 && x < LANDING.x + LANDING.w + 20) continue;
    shadow(g, x, SEA_Y - 14, 22, 7);
    g.fillStyle(0x2a2a2e, 1); g.fillRoundedRect(x - 8, SEA_Y - 34, 16, 22, 5);
    g.fillStyle(0x4a4a50, 1); g.fillEllipse(x, SEA_Y - 34, 20, 8);
    g.lineStyle(2, 0x5a5a60, 1); g.strokeCircle(x + 50, SEA_Y - 6, 5);
  }

  // ── The sea: bands of blue-grey, the swell, foam under the kerb.
  g.fillStyle(SEA_SHALLOW, 1); g.fillRect(0, SEA_Y + 2, W, H - SEA_Y);
  g.fillStyle(SEA, 1); g.fillRect(0, SEA_Y + 50, W, H - SEA_Y - 50);
  g.fillStyle(SEA_DEEP, 1); g.fillRect(0, SEA_Y + 150, W, H - SEA_Y - 150);
  for (let x = 0; x < W; x += 24) { g.fillStyle(FOAM, 0.3 + rng() * 0.2); g.fillEllipse(x + 12, SEA_Y + 6, 22, 4); }
  for (let i = 0; i < 70; i++) { g.fillStyle(lit(SEA, 0.2), 0.18); g.fillEllipse(rng() * W, SEA_Y + 24 + rng() * (H - SEA_Y - 24), 30 + rng() * 70, 3 + rng() * 3); }

  // ── The slipway beside the west mole: a timber ramp running down into the water.
  const sw = { x: 470, y: SEA_Y - 40, w: 190, h: 120 };
  g.fillStyle(WOOD_DARK, 1); g.fillRect(sw.x, sw.y, sw.w, sw.h);
  for (let k = 0; k < sw.h / 10; k++) {
    g.fillStyle(mixC(WOOD, WOOD_LIT, rng() * 0.4), k * 10 > 60 ? 0.6 : 1); g.fillRect(sw.x + 2, sw.y + k * 10 + 1, sw.w - 4, 8);
  }
  g.fillStyle(SEA_SHALLOW, 0.45); g.fillRect(sw.x, sw.y + 70, sw.w, sw.h - 70);
  g.lineStyle(4, 0x3a3a40, 1); g.lineBetween(sw.x + 60, sw.y, sw.x + 60, sw.y + sw.h); g.lineBetween(sw.x + 130, sw.y, sw.x + 130, sw.y + sw.h);

  // ── The west mole: big squared stones, weed at the waterline.
  g.fillStyle(GRANITE_DARK, 1); g.fillRect(WEST_MOLE.x - 6, WEST_MOLE.y, WEST_MOLE.w + 12, WEST_MOLE.h + 10);
  for (let y = WEST_MOLE.y; y < WEST_MOLE.y + WEST_MOLE.h; y += 26) {
    for (let x = WEST_MOLE.x; x < WEST_MOLE.x + WEST_MOLE.w; x += 50) {
      g.fillStyle(mixC(GRANITE, GRANITE_LIT, rng() * 0.4), 1); g.fillRect(x + 2, y + 2, Math.min(48, WEST_MOLE.x + WEST_MOLE.w - x - 2), 22);
    }
  }
  g.fillStyle(0x2e4a3a, 0.8); g.fillRect(WEST_MOLE.x - 6, WEST_MOLE.y + WEST_MOLE.h + 4, WEST_MOLE.w + 12, 6);

  // ── The two timber jetties: plank decks on piles.
  for (const j of [LANDING, EAST_JETTY]) {
    g.fillStyle(0x000000, 0.3); g.fillRect(j.x + 6, j.y + 8, j.w, j.h);
    g.fillStyle(WOOD_DARK, 1); g.fillRect(j.x, j.y, j.w, j.h);
    for (let py = j.y + 2; py < j.y + j.h; py += 11) {
      g.fillStyle(mixC(WOOD, WOOD_LIT, rng() * 0.45), 1); g.fillRect(j.x + 2, py, j.w - 4, 9);
      g.fillStyle(0x1a120a, 0.7); g.fillCircle(j.x + 8, py + 4.5, 1); g.fillCircle(j.x + j.w - 8, py + 4.5, 1);
    }
    for (let py = j.y + 20; py < j.y + j.h; py += 46) {
      g.fillStyle(0x2a1e14, 1); g.fillCircle(j.x - 2, py, 6); g.fillCircle(j.x + j.w + 2, py, 6);
      g.fillStyle(0x4a3a2a, 1); g.fillCircle(j.x - 2, py - 1, 4.5); g.fillCircle(j.x + j.w + 2, py - 1, 4.5);
    }
    g.fillStyle(SNOW, 0.6); for (let k = 0; k < 6; k++) g.fillEllipse(j.x + 10 + rng() * (j.w - 20), j.y + 10 + rng() * (j.h - 20), 14, 4);
  }

  // ── The casting pit in the foundry yard (a hole, so it is ground).
  castingPit(g, PIT.x, PIT.y, PIT.r, rng);
}

// ── Pieces and solids ───────────────────────────────────────────────

type Piece = NonNullable<AreaDef['painter']['pieces']>[number];
const pieces: Piece[] = [];
const solids: Solid[] = [];

/** A terrace house: piece + base footprint solid. */
function home(x: number, y: number, w: number, h: number, wall: number, muted = false): void {
  pieces.push({ x, y, w: w + 40, h: h * 1.8 + 20, draw: (g, rng) => terraceHouse(g, x, y, w, h, wall, rng, { muted }) });
  solids.push({ kind: 'rect', x: x - w / 2, y: y - 35, w, h: 35 });
}

// The upper terrace: a row of tall houses, all turned to the summit.
const UPPER: [number, number, number, number, boolean][] = [
  [170, 150, 120, PLASTER, false], [420, 170, 132, OCHRE, true], [690, 150, 118, ROSE, false], [960, 170, 136, PLASTER, false],
  [1640, 170, 130, OCHRE, false], [1900, 150, 120, PLASTER, true], [2160, 160, 128, ROSE, false], [2430, 160, 124, OCHRE, false],
];
for (const [x, w, h, wall, muted] of UPPER) home(x, 330, w, h, wall, muted);
// Snow pines along the crags.
for (const [x, y, s] of [[110, 150, 1.1], [300, 140, 0.9], [560, 156, 1.2], [820, 140, 1], [1090, 150, 0.9], [1510, 146, 1], [1780, 158, 1.2], [2040, 140, 0.9], [2300, 152, 1.1], [2510, 144, 1]] as [number, number, number][]) {
  pieces.push({ x, y, w: 50, h: 110, draw: (g) => snowPine(g, x, y, s) });
  solids.push({ kind: 'circle', x, y: y - 4, r: 9 });
}

// The lower terrace: houses at the west and east ends, Hester Fathom's with the white ribbon.
home(170, 640, 200, 118, ROSE);
home(170, 1000, 200, 112, PLASTER);
home(760, 650, 170, 124, OCHRE);
home(2440, 650, 190, 124, PLASTER);
home(2420, 960, 180, 112, 0xd0c8c0, true);

// The Rising Loaf.
pieces.push({ x: 1100, y: 820, w: 340, h: 230, draw: (g, rng) => bakery(g, 1080, 820, 230, rng) });
solids.push({ kind: 'rect', x: 965, y: 785, w: 230, h: 35 }, { kind: 'circle', x: 1221, y: 804, r: 30 });

// Chime & Sundry.
pieces.push({ x: 1960, y: 820, w: 280, h: 230, draw: (g, rng) => sundryShop(g, 1960, 820, 220, rng) });
solids.push({ kind: 'rect', x: 1850, y: 785, w: 220, h: 35 }, { kind: 'circle', x: 2086, y: 814, r: 10 });

// The hymn-sheet stall and the Register of Parts on the square.
pieces.push({ x: 1640, y: 760, w: 150, h: 130, draw: (g, rng) => hymnStall(g, 1640, 760, rng) });
solids.push({ kind: 'rect', x: 1582, y: 740, w: 116, h: 20 });
pieces.push({ x: 1440, y: 650, w: 110, h: 180, draw: (g, rng) => partBoard(g, 1440, 650, rng) });
solids.push({ kind: 'rect', x: 1404, y: 638, w: 72, h: 12 });

// The Clapperton bell-foundry, its cooling frame in the yard.
pieces.push({ x: 430, y: 880, w: 460, h: 330, draw: (g, rng) => foundry(g, 430, 880, 300, rng) });
solids.push({ kind: 'rect', x: 280, y: 845, w: 300, h: 35 }, { kind: 'circle', x: PIT.x, y: PIT.y, r: PIT.r + 4 });
pieces.push({ x: 830, y: 880, w: 140, h: 180, draw: (g) => coolingFrame(g, 830, 880) });
solids.push({ kind: 'circle', x: 792, y: 876, r: 9 }, { kind: 'circle', x: 868, y: 876, r: 9 }, { kind: 'circle', x: 830, y: 868, r: 22 });

// The carillon tower and the customs house on the quay.
pieces.push({ x: TOWER_X, y: TOWER_Y, w: 210, h: 680, draw: (g, rng) => carillonTower(g, TOWER_X, TOWER_Y, rng) });
solids.push({ kind: 'rect', x: TOWER_X - 80, y: TOWER_Y - 32, w: 160, h: 32 });
pieces.push({ x: 980, y: 1080, w: 300, h: 250, draw: (g, rng) => customsHouse(g, 980, 1080, 240, rng) });
solids.push({ kind: 'rect', x: 860, y: 1045, w: 240, h: 35 });

// The boatwright's hull on the stocks, by the slipway.
pieces.push({ x: 560, y: 1150, w: 220, h: 110, draw: (g, rng) => hullOnStocks(g, 560, 1150, 150, rng) });
solids.push({ kind: 'rect', x: 488, y: 1128, w: 150, h: 24 });

// The Singing Line on the east quay.
pieces.push({ x: 2220, y: 1120, w: 220, h: 190, draw: (g, rng) => tackleShed(g, 2220, 1120, 180, rng) });
solids.push({ kind: 'rect', x: 2130, y: 1090, w: 180, h: 30 });

// Ferry-horns at the jetty heads and on the mole.
for (const [x, y, dir] of [[1348, 1300, 1], [2114, 1426, 1], [296, 1406, -1]] as [number, number, number][]) {
  pieces.push({ x, y, w: 80, h: 90, draw: (g) => ferryHorn(g, x, y, dir) });
  solids.push({ kind: 'circle', x, y: y - 2, r: 5 });
}

// Bell-lamps along the quay and round the square.
const LAMPS: [number, number][] = [
  [200, 1248], [800, 1248], [1170, 1248], [1460, 1248], [1900, 1248], [2350, 1248],
  [SQUARE.x + 10, SQUARE.y + 10], [SQUARE.x + SQUARE.w - 10, SQUARE.y + SQUARE.h - 10], [1210, 600], [1390, 600],
];
for (const [x, y] of LAMPS) {
  pieces.push({ x, y, w: 40, h: 80, draw: (g) => bellLamp(g, x, y) });
  solids.push({ kind: 'circle', x, y: y - 2, r: 4 });
}

// Quay clutter: barrels of herring, coils of rope, crates of new bells in straw.
pieces.push({
  x: 1880, y: 1180, w: 140, h: 70, draw: (g, rng) => {
    shadow(g, 1880, 1182, 130, 22);
    for (let k = 0; k < 3; k++) {
      const cx = 1840 + k * 36;
      g.fillStyle(WOOD_DARK, 1); g.fillRect(cx - 16, 1150, 32, 30);
      g.fillStyle(WOOD, 1); g.fillRect(cx - 14, 1152, 28, 26);
      g.fillStyle(0xd8c070, 1); for (let s = 0; s < 6; s++) g.fillRect(cx - 12 + rng() * 22, 1146 + rng() * 4, 3, 6);
      g.fillStyle(BRONZE, 1); g.fillEllipse(cx, 1148, 14, 6);
      g.fillStyle(dim(BRONZE, 0.4), 1); g.fillEllipse(cx, 1149, 10, 3);
    }
  },
});
solids.push({ kind: 'rect', x: 1820, y: 1150, w: 120, h: 30 });
pieces.push({
  x: 760, y: 1240, w: 80, h: 50, draw: (g) => {
    shadow(g, 760, 1242, 60, 16);
    for (let r = 0; r < 4; r++) { g.lineStyle(3, 0xc8b080, 1); g.strokeEllipse(760, 1232 - r * 3, 40 - r * 6, 14 - r * 2); }
  },
});

// ── POIs ────────────────────────────────────────────────────────────

const POIS: Poi[] = [
  { kind: 'waystone', at: { x: 1300, y: 1170 } },
  { kind: 'mooring', at: { x: 1300, y: 1460 }, isle: 'sound' },
  { kind: 'water', id: 'carillon-sea-water', shape: { x: 0, y: SEA_Y + 6, w: W, h: H - SEA_Y - 6 }, fishery: 'carillon-sea' },
  { kind: 'sign', at: { x: 1250, y: 120 }, text: 'NORTH — up the terraces to the Brass Court. Prince Fanfare\'s Bandhall. March in step.' },
  { kind: 'sign', at: { x: 110, y: 690 }, text: 'WEST — the Paper Road to the Libretto Court. Prince Folio\'s presses. Mind your words.' },
  { kind: 'sign', at: { x: 2490, y: 700 }, text: 'EAST — the Muffled Road to the Hush Court. Prince Mute\'s wardens. Say nothing.' },
  { kind: 'sign', at: { x: 1390, y: 1250 }, text: 'LANDING — moorings at the head. Hulls: O. Brasswick, the slip. Tackle: A. Fathom, the east jetty.' },
  {
    kind: 'sign', at: { x: 850, y: 1110 },
    text: 'TUNERS\' CUSTOMS. Every soul landed shall be given a Part, and sing it, and no other. By order of the Maestro.',
  },
  {
    kind: 'sign', at: { x: 1680, y: 1110 },
    text: 'THE HOURS — Matins, Vespers, Compline. All stand where they are. All sing the Score. Between the Hours: silence.',
  },
  { kind: 'sign', at: { x: 1500, y: 690 }, text: 'THE REGISTER OF PARTS. Every household, every note. A ribbon is not a crossing-out.' },
  { kind: 'sign', at: { x: 300, y: 930 }, text: 'CLAPPERTON FOUNDRY. Bells cast to the Score since the Score. The pit is hot. It is always hot.' },
  { kind: 'chest', id: 'carillon-chest-mole', at: { x: 340, y: 1300 }, coins: 140, orbs: 1 },
  { kind: 'chest', id: 'carillon-chest-attic', at: { x: 2520, y: 470 }, orbs: 2, coins: 60 },
  { kind: 'chest', id: 'carillon-chest-fines', at: { x: 1700, y: 1160 }, coins: 420, open: { monarch: 'cadenza' } },
];

// ── Animation ───────────────────────────────────────────────────────

/** Every this-many seconds the tower rings an Hour for `HOUR_LEN` seconds. */
const HOUR_EVERY = 46;
const HOUR_LEN = 9;

function animateUnder(g: G, t: number, view: Rect): void {
  // ── The sea: long swells and foam.
  if (view.y + view.h > SEA_Y - 40) {
    for (let row = 0; row < 10; row++) {
      const y = SEA_Y + 20 + row * 22;
      if (y < view.y - 20 || y > view.y + view.h + 20) continue;
      const speed = 9 + row * 2.4;
      for (let k = 0; k < 9; k++) {
        const x = ((k * 330 + row * 97 + t * speed) % (W + 300)) - 150;
        if (x < view.x - 120 || x > view.x + view.w + 120) continue;
        g.fillStyle(lit(SEA, 0.25), 0.18 + Math.sin(t * 0.8 + k + row) * 0.06);
        g.fillEllipse(x, y + Math.sin(t * 1.2 + k) * 2, 80 + (k % 3) * 30, 4);
      }
    }
    for (let x = 12; x < W; x += 48) {
      if (!inView(view, x, SEA_Y, 40)) continue;
      g.fillStyle(FOAM, 0.25 + Math.sin(t * 2 + x * 0.05) * 0.12); g.fillEllipse(x, SEA_Y + 8, 36, 5);
    }
    // ── Bell-buoys: bob, tilt, and every few seconds a clang ring spreads from each.
    for (const [bx, by, ph] of BUOYS) {
      if (!inView(view, bx, by, 160)) continue;
      bellBuoy(g, bx, by, t, ph);
      const q = ((t + ph * 1.3) % 5.2) / 1.6;
      if (q < 1) {
        soundRing(g, bx, by - 8, 20 + q * 120, 0xe8d8a8, 0.55 * (1 - q), 0.42);
        soundRing(g, bx, by - 8, 8 + q * 80, FOAM, 0.35 * (1 - q), 0.42);
      }
    }
  }
  // ── The casting pit's runner glow breathes.
  if (inView(view, PIT.x, PIT.y, 140)) {
    const f = 0.5 + Math.sin(t * 3.1) * 0.2 + Math.sin(t * 7.3) * 0.1;
    g.fillStyle(EMBER, 0.2 * f); g.fillCircle(PIT.x, PIT.y, PIT.r * 0.5);
    g.fillStyle(MELT, 0.6 * f); g.fillCircle(PIT.x, PIT.y, 3.5);
    g.lineStyle(2.5, MELT, 0.4 * f); g.lineBetween(PIT.x - PIT.r - 6, PIT.y - 6, PIT.x - PIT.r - 90, PIT.y - 40);
  }
  // ── The brass stave in the square glints, a highlight running along it bar by bar.
  if (inView(view, SQUARE.x + SQUARE.w / 2, SQUARE.y + 180, SQUARE.w)) {
    const gx = SQUARE.x + 20 + ((t * 90) % (SQUARE.w - 40));
    for (let l = 0; l < 5; l++) {
      g.fillStyle(BRASS_LIT, 0.55); g.fillRect(gx - 10 + l * 4, SQUARE.y + 148 + l * 16, 20, 2);
    }
  }
  // ── The singing-mark lights while the Hour rings.
  const hr = (t % HOUR_EVERY) / HOUR_LEN;
  if (hr < 1 && inView(view, TOWER_X, 1132, 200)) {
    g.lineStyle(2, MAESTRO_GOLD, 0.5 * Math.sin(hr * Math.PI)); g.strokeEllipse(TOWER_X, 1132, 170, 62);
  }
}

function animateAbove(g: G, t: number, view: Rect): void {
  const hr = (t % HOUR_EVERY) / HOUR_LEN;
  const ringing = hr < 1 ? Math.sin(hr * Math.PI) : 0;
  // ── The belfry bells, live: still between the Hours, swinging hard at them, with rings and notes.
  const beamY = TOWER_Y - TOWER.shaft - TOWER.belfry + 29;
  if (inView(view, TOWER_X, beamY, 420)) {
    belfryBells(g, TOWER_X, beamY, t, ringing);
    if (ringing > 0) {
      for (let k = 0; k < 4; k++) {
        const q = ((t * 0.9 + k * 0.25) % 1);
        soundRing(g, TOWER_X, beamY + 30, 60 + q * 380, MAESTRO_GOLD, 0.45 * (1 - q) * ringing, 0.5);
      }
      for (let k = 0; k < 6; k++) {
        const q = ((t * 0.35 + k / 6) % 1);
        const nx = TOWER_X + Math.sin(k * 2.1 + t * 0.7) * (60 + q * 120), ny = beamY - q * 160;
        quaver(g, nx, ny, 1.5, BRASS_LIT, 0.8 * (1 - q) * ringing);
      }
    }
  }
  // ── Foundry stack smoke, lit orange from below.
  const stackX = 430 - 150 + 300 * 0.78, stackY = 880 - 120 - 158;
  if (inView(view, stackX, stackY - 100, 200)) {
    for (let k = 0; k < 9; k++) {
      const q = ((t * 0.16 + k / 9) % 1);
      const x = stackX + Math.sin(t * 0.5 + k) * 10 + q * 80, y = stackY - q * 220;
      g.fillStyle(mixC(0x6a5048, 0x9a9aa4, q), 0.32 * (1 - q)); g.fillCircle(x, y, 12 + q * 34);
    }
    g.fillStyle(EMBER, 0.25 + Math.sin(t * 6) * 0.1); g.fillEllipse(stackX, stackY + 2, 36, 6);
  }
  // ── The Rising Loaf's oven chimney: a soft white plume, and steam off the cooling rack.
  if (inView(view, 1239, 740, 200)) {
    for (let k = 0; k < 6; k++) {
      const q = ((t * 0.22 + k / 6) % 1);
      g.fillStyle(0xf4f0ea, 0.3 * (1 - q)); g.fillCircle(1239 + Math.sin(t + k) * 6 + q * 40, 740 - q * 130, 8 + q * 20);
    }
    for (let k = 0; k < 3; k++) {
      const q = ((t * 0.6 + k / 3) % 1);
      g.lineStyle(1.5, 0xffffff, 0.3 * (1 - q));
      g.lineBetween(1036 + k * 10, 790 - q * 30, 1038 + k * 10 + Math.sin(t * 3 + k) * 3, 780 - q * 30);
    }
  }
  // ── Heat shimmer over the cooling bell.
  if (inView(view, 830, 820, 120)) {
    for (let k = 0; k < 4; k++) {
      const q = ((t * 0.5 + k / 4) % 1);
      g.lineStyle(1.5, 0xffd0a0, 0.25 * (1 - q));
      const y = 800 - q * 70;
      g.lineBetween(812 + Math.sin(t * 4 + k) * 4, y, 848 + Math.sin(t * 4 + k + 1) * 4, y - 3);
    }
    g.fillStyle(0xff6a2a, 0.06 + Math.sin(t * 1.3) * 0.03); g.fillCircle(830, 820, 40);
  }
  // ── Lamp glow pulses gently along the quay.
  for (const [x, y] of LAMPS) {
    if (!inView(view, x, y - 60, 40)) continue;
    glow(g, x, y - 61, 22 + Math.sin(t * 2 + x) * 3, LAMP, 0.03, 2);
  }
  // ── Gulls wheeling over the harbour.
  for (let k = 0; k < 4; k++) {
    const gx = ((t * (30 + k * 7) + k * 700) % (W + 400)) - 200, gy = SEA_Y - 120 + Math.sin(t * 0.7 + k * 2) * 60 + k * 40;
    if (!inView(view, gx, gy, 30)) continue;
    const flap = Math.sin(t * 6 + k) * 5;
    g.lineStyle(2, 0xf0f0f0, 0.9);
    g.lineBetween(gx - 10, gy - flap, gx, gy); g.lineBetween(gx, gy, gx + 10, gy - flap);
  }
  // ── Paper scraps off the hymn stall's strings, lifting in the sea wind.
  if (inView(view, 1640, 700, 200)) {
    for (let k = 0; k < 3; k++) {
      const q = ((t * 0.12 + k / 3) % 1);
      const px = 1640 + q * 260 + Math.sin(t * 2 + k) * 14, py = 690 - Math.sin(q * Math.PI) * 60 + q * 20;
      g.fillStyle(PAPER, 0.85 * (1 - q)); g.fillRect(px - 5, py - 4, 10, 8);
      g.lineStyle(0.6, 0x1c1a24, 0.5 * (1 - q)); g.lineBetween(px - 3, py, px + 3, py);
    }
  }
}

// ── Solids: water and the wall ──────────────────────────────────────

solids.push(
  // The open sea, with the jetties and the mole cut out of it.
  ...carve({ x: 0, y: SEA_Y + 6, w: W, h: H - SEA_Y - 6 }, [LANDING, EAST_JETTY, WEST_MOLE]),
  // The crags along the north edge, broken by the road to the Brass Court.
  { kind: 'rect', x: 0, y: 0, w: 1200, h: 84 },
  { kind: 'rect', x: 1400, y: 0, w: 1200, h: 84 },
);
// The retaining wall, broken by the three stairs.
{
  let x = 0;
  for (const [a, b] of STAIRS) {
    solids.push({ kind: 'rect', x, y: WALL_Y0, w: a - x, h: WALL_Y1 - WALL_Y0 });
    x = b;
  }
  solids.push({ kind: 'rect', x, y: WALL_Y0, w: W - x, h: WALL_Y1 - WALL_Y0 });
}

export const CARILLON_AREA: AreaDef = {
  id: 'carillon',
  isle: 'sound',
  name: 'Carillon Quay',
  subtitle: 'Harbour of bells',
  w: W,
  h: H,
  bg: 0x4a5a6a,
  accent: MAESTRO_GOLD,
  weather: 'notes',
  spawn: { x: 1300, y: 1420 },
  painter: { ground: paintGround, pieces, animate: animateUnder, animateOver: animateAbove },
  solids,
  exits: [
    { side: 'n', to: 'brass', label: 'Up the terraces — the Brass Court' },
    { side: 'w', to: 'libretto', label: 'The Paper Road — the Libretto Court' },
    { side: 'e', to: 'hush', label: 'The Muffled Road — the Hush Court' },
  ],
  pois: POIS,
  npcs: CARILLON_NPCS,
  crowd: CARILLON_CROWD,
};
