import type { AreaDef, AreaPainter, Pt, Rect, Solid } from '../../../../IslesTypes';
import { blob, crate, barrel, dim, groundFill, lit, stroke, type G } from '../../../../art/IsleArt';
import {
  anemone, bellBuoyBody, boardwalk, crabPots, creek, deck, drownedHouse, dryingRack, foamEdge, gaugeHand,
  glassFloatPost, gulls, lighthouseBeam, lighthouseManor, marram, mooringPost, poolRocks, sandFence, sandRipples,
  shells, stiltHouse, strandedBoat, tideGauge, tideStaff, tideWaystone, titheBooth, wormCasts, wrackLine,
} from './art';
import {
  BARNACLE, BRASS, BUOY, DRIFT, DRIFT_DARK, FOAM, LAMP, MUD, MUD_DARK, PAINT_BLUE, PAINT_CREAM, PAINT_GREEN,
  PAINT_OCHRE, PILE, SAND, SAND_DARK, SAND_LIT, SEA, SEA_DEEP, SEA_LIT, SEA_SHALLOW, TIDEWATER_COLOR, WEED,
  WETSAND, WETSAND_DARK, WETSAND_LIT,
} from './palette';
import { TIDEWATER_CROWD, TIDEWATER_NPCS } from './npcs';

/**
 * The Tidewater Court — a tidal-flat town on stilts, north up the causeway from Brinehollow.
 *
 * Read it from the sea up:
 * • **the flats** (south): wet ripple-marked sand cut by creeks, the shingle causeway climbing
 *   from Brinehollow, the Dry Tithe booth where every head pays its coin, the drowned row in
 *   the south-west (houses *left under*, sunk to their sills in a standing lagoon), the tide
 *   pools on the south-east rocks;
 * • **the Low Walk**: a boardwalk east to west across the middle of the town (Inkwell west,
 *   Rimefast east), stilt houses along it, the Low-Tide Larder on its stilts;
 * • **the Gauge plaza**: a timber deck round the Tide Gauge, the Queen's clocktower, whose hand
 *   tells the flats when the sea is coming;
 * • **the High Walk** and **the dunes** (north): dry sand above the mark, marram and sand
 *   fences, Wren's strand line, and Prince Ebb's lighthouse-manor on the headland. The road to the
 *   Abyssal rim leaves north through the dunes.
 *
 * A pale film of water breathes in and out over the low flats on the Gauge's own clock: the
 * town is always either waiting for the tide or drying out from it.
 */

export const TIDEWATER_W = 2400;
export const TIDEWATER_H = 1700;

const HIGH_WALK = 560;
const LOW_WALK = 860;
/** Dry sand above the mark; wet flats below. */
const MARK_Y = 470;
const FLATS_Y = 1000;

/** The tide pools — the court's fishing water. */
export const TIDE_POOLS: Rect = { x: 1840, y: 1250, w: 300, h: 150 };
/** The Tide Gauge's foot. */
export const GAUGE: Pt = { x: 1200, y: 790 };
/** The Gauge plaza deck. */
const PLAZA: Rect = { x: 950, y: 640, w: 500, h: 360 };
/** Prince Ebb's lighthouse-manor — the foot of its steps. */
export const MANOR: Pt = { x: 1820, y: 430 };
/** The drowned row's lagoon, centre and radii. */
export const DROWNED: { x: number; y: number; rx: number; ry: number } = { x: 390, y: 1320, rx: 270, ry: 140 };
/** The Low-Water Stone: where the Queen's tide is called from, at the sea's edge. */
export const LOW_WATER_STONE: Pt = { x: 1560, y: 1600 };

type Piece = NonNullable<AreaPainter['pieces']>[number];

const pieces: Piece[] = [];
const solids: Solid[] = [];
/** Lit windows, for a breathing glow in `animate`. */
const windows: Pt[] = [];

// ── Builders ─────────────────────────────────────────────────────────

function addStilt(x: number, y: number, w: number, h: number, paint: number, opts: { lamp?: boolean; nets?: boolean; tithed?: boolean; legs?: number } = {}): void {
  const legs = opts.legs ?? 46;
  pieces.push({ x, y, w: w + 40, h: legs + h + h * 0.7 + 30, draw: (g, rng) => stiltHouse(g, x, y, w, h, { paint, ...opts, legs }, rng) });
  solids.push({ kind: 'rect', x: x - w / 2 - 6, y: y - 30, w: w + 12, h: 30 });
  if (opts.lamp && !opts.tithed) windows.push({ x: x + w * 0.2, y: y - legs - 6 - h + h * 0.42 });
}

function addPiece(x: number, y: number, w: number, h: number, draw: (g: G, rng: () => number) => void, solid?: Solid): void {
  pieces.push({ x, y, w, h, draw });
  if (solid) solids.push(solid);
}

/** Gilly's: a wide stilt shop with floats and wrack hung under its eaves and a painted board. */
function drawShop(g: G, x: number, y: number, rng: () => number): void {
  stiltHouse(g, x, y, 170, 78, { paint: PAINT_OCHRE, legs: 36, lamp: true, nets: true }, rng);
  const top = y - 36 - 6 - 78;
  g.fillStyle(DRIFT_DARK, 1); g.fillRect(x - 64, top - 20, 128, 18);
  g.fillStyle(PAINT_CREAM, 1); g.fillRect(x - 62, top - 18, 124, 14);
  g.fillStyle(SEA, 1);
  for (let i = 0; i < 14; i++) g.fillRect(x - 56 + i * 8, top - 15, 5, 8);
  for (let i = 0; i < 4; i++) {
    const fx = x + 30 + i * 14;
    g.lineStyle(1, DRIFT_DARK, 1); g.lineBetween(fx, top + 2, fx, top + 14);
    g.fillStyle([SEA_LIT, 0x9fd8a8, 0xe0b25a, SEA_SHALLOW][i], 0.7); g.fillCircle(fx, top + 20, 6);
  }
  // Wares on the porch: a barrel of kelp salt, a crate of samphire.
  barrel(g, x - 70, y - 36 - 6, 9, 0x6d5238);
  crate(g, x - 50, y - 36 - 6, 8, 0x7a6040);
  g.fillStyle(0x6f9a4a, 1); g.fillEllipse(x - 50, y - 36 - 22, 14, 5);
}

/** The Low-Tide Larder: a stilt bakery with a squat brick oven chimney and a pie on a board. */
function drawLarder(g: G, x: number, y: number, rng: () => number): void {
  stiltHouse(g, x, y, 150, 76, { paint: PAINT_CREAM, legs: 40, lamp: true }, rng);
  const top = y - 40 - 6 - 76;
  // Oven chimney through the roof, smoke-stained brick.
  g.fillStyle(0x6b3a2a, 1); g.fillRect(x + 34, top - 70, 22, 64);
  g.fillStyle(0x8a4c36, 1); g.fillRect(x + 36, top - 68, 18, 60);
  g.fillStyle(0x2a2622, 1); g.fillRect(x + 32, top - 74, 26, 6);
  // Hanging board: a pasty.
  g.lineStyle(1.2, DRIFT_DARK, 1); g.lineBetween(x - 70, top + 20, x - 70, top + 30); g.lineBetween(x - 50, top + 20, x - 50, top + 30);
  g.fillStyle(DRIFT, 1); g.fillRect(x - 76, top + 30, 32, 20);
  g.fillStyle(0xd9a05a, 1); g.fillEllipse(x - 60, top + 41, 22, 11);
  g.lineStyle(1.2, 0x8a5a2a, 1);
  for (let k = -3; k <= 3; k++) g.lineBetween(x - 60 + k * 3, top + 36, x - 60 + k * 3 - 1, top + 39);
}

// ── Layout ───────────────────────────────────────────────────────────

// The headland and the lighthouse-manor.
addPiece(MANOR.x, MANOR.y, 460, 520, (g, rng) => lighthouseManor(g, MANOR.x, MANOR.y, rng),
  { kind: 'rect', x: MANOR.x - 192, y: MANOR.y - 64, w: 384, h: 60 });

// The Tide Gauge.
addPiece(GAUGE.x, GAUGE.y, 180, 360, (g, rng) => tideGauge(g, GAUGE.x, GAUGE.y, rng),
  { kind: 'rect', x: GAUGE.x - 64, y: GAUGE.y - 40, w: 128, h: 40 });

// North side of the High Walk.
addStilt(170, 520, 120, 70, PAINT_BLUE, { lamp: true, nets: true });
addStilt(360, 520, 110, 64, PAINT_GREEN, { lamp: false });
addStilt(820, 520, 120, 72, PAINT_CREAM, { lamp: true });
addStilt(1000, 520, 110, 66, PAINT_BLUE, { tithed: true });
addStilt(2250, 520, 130, 70, PAINT_GREEN, { lamp: true, nets: true });
// South side of the High Walk.
addStilt(160, 700, 120, 66, PAINT_OCHRE, { lamp: true });
addStilt(400, 700, 130, 72, PAINT_BLUE, { nets: true });
addStilt(640, 700, 110, 64, PAINT_CREAM, { tithed: true });
addPiece(1650, 660, 240, 220, (g, rng) => drawShop(g, 1650, 660, rng), { kind: 'rect', x: 1555, y: 630, w: 190, h: 30 });
windows.push({ x: 1684, y: 660 - 36 - 6 - 78 + 78 * 0.42 });
addStilt(1900, 700, 120, 70, PAINT_GREEN, { lamp: true });
addStilt(2150, 700, 130, 66, PAINT_CREAM, { tithed: true });

// The Low Walk's houses.
addStilt(200, 1010, 130, 70, PAINT_GREEN, { lamp: true, nets: true });
addPiece(760, 1060, 220, 240, (g, rng) => drawLarder(g, 760, 1060, rng), { kind: 'rect', x: 675, y: 1030, w: 170, h: 30 });
windows.push({ x: 790, y: 1060 - 40 - 6 - 76 + 76 * 0.42 });
addStilt(1640, 1010, 120, 68, PAINT_BLUE, { lamp: true });
addStilt(1860, 1010, 110, 62, PAINT_OCHRE, { tithed: true });
addStilt(2280, 1010, 120, 70, PAINT_CREAM, { nets: true });

// The drowned row: three houses left under, sunk to their sills.
for (const [x, y, w, h, c] of [[250, 1300, 110, 70, PAINT_BLUE], [410, 1350, 120, 78, PAINT_CREAM], [560, 1265, 100, 64, PAINT_GREEN]] as [number, number, number, number, number][]) {
  addPiece(x, y, w + 40, h * 1.7 + 30, (g, rng) => drownedHouse(g, x, y, w, h, c, rng), { kind: 'rect', x: x - w / 2, y: y - 18, w, h: 20 });
}
addPiece(180, 1420, 20, 40, (g) => mooringPost(g, 180, 1420, 30));
addPiece(640, 1400, 20, 40, (g) => mooringPost(g, 640, 1400, 26));

// The Dry Tithe booth and the waystone at the head of the causeway.
addPiece(1330, 1560, 120, 130, (g) => titheBooth(g, 1330, 1560), { kind: 'rect', x: 1294, y: 1540, w: 72, h: 20 });
addPiece(1070, 1560, 60, 80, (g) => tideWaystone(g, 1070, 1560), { kind: 'circle', x: 1070, y: 1554, r: 16 });

// Tide pools: the rock shelf is part of the ground; a solid keeps you on the lip.
solids.push({ kind: 'rect', x: TIDE_POOLS.x - 6, y: TIDE_POOLS.y - 6, w: TIDE_POOLS.w + 12, h: TIDE_POOLS.h + 12 });

// Flats furniture.
addPiece(220, 1040, 90, 50, (g, rng) => crabPots(g, 230, 1040, rng), { kind: 'rect', x: 200, y: 1028, w: 60, h: 14 });
addPiece(520, 1000, 90, 50, (g, rng) => crabPots(g, 520, 990, rng), { kind: 'rect', x: 490, y: 978, w: 60, h: 14 });
addPiece(560, 1110, 120, 60, (g, rng) => dryingRack(g, 560, 1110, 90, rng));
addPiece(950, 1100, 100, 60, (g, rng) => dryingRack(g, 950, 1100, 80, rng));
addPiece(1520, 1160, 150, 70, (g, rng) => strandedBoat(g, 1520, 1160, 120, PAINT_BLUE, rng), { kind: 'rect', x: 1460, y: 1140, w: 120, h: 20 });
addPiece(2050, 1560, 130, 60, (g, rng) => strandedBoat(g, 2050, 1560, 100, 0xa04a3a, rng), { kind: 'rect', x: 2000, y: 1542, w: 100, h: 18 });
for (const [x, y] of [[880, 1450], [1480, 1500], [1700, 1080], [300, 1560]] as [number, number][]) {
  addPiece(x, y, 20, 40, (g) => mooringPost(g, x, y));
}
// Tide-staffs across the flats: the same mark, read from anywhere.
for (const [x, y, h] of [[1000, 1300, 90], [1380, 1420, 80], [740, 1560, 70], [1640, 1290, 84]] as [number, number, number][]) {
  addPiece(x, y, 16, h + 6, (g) => tideStaff(g, x, y, h));
}
// Glass-float posts along the walks.
for (const [x, y, c] of [
  [90, 610, SEA_LIT], [560, 610, 0x9fd8a8], [1120, 610, SEA_LIT], [1290, 610, 0xe0b25a], [1500, 610, 0x9fd8a8],
  [2060, 610, SEA_LIT], [100, 900, 0xe0b25a], [620, 900, SEA_LIT], [1560, 900, 0x9fd8a8], [2100, 900, SEA_LIT],
  [1140, 1180, 0xe0b25a], [1260, 1380, SEA_LIT],
] as [number, number, number][]) {
  addPiece(x, y, 30, 60, (g) => glassFloatPost(g, x, y, c));
}
// Plaza clutter: a coiled hawser, barrels by the gauge.
addPiece(1020, 960, 40, 40, (g) => barrel(g, 1020, 960, 11, 0x6d5238));
addPiece(1046, 966, 40, 40, (g) => crate(g, 1046, 966, 10, 0x7a6040));
addPiece(1400, 700, 40, 40, (g) => barrel(g, 1400, 700, 11, 0x5d4a34));
// Sand fences on the dunes.
addPiece(560, 220, 220, 30, (g) => sandFence(g, { x: 460, y: 220 }, { x: 680, y: 210 }));
addPiece(300, 380, 200, 30, (g) => sandFence(g, { x: 200, y: 390 }, { x: 400, y: 370 }));
addPiece(950, 330, 200, 30, (g) => sandFence(g, { x: 860, y: 340 }, { x: 1060, y: 320 }));

// ── Edges: the sea along the south shore (open only at the causeway). ─

solids.push({ kind: 'rect', x: 0, y: 1662, w: 1120, h: 38 });
solids.push({ kind: 'rect', x: 1280, y: 1662, w: 1120, h: 38 });

// ── Painter ──────────────────────────────────────────────────────────

const inView = (x: number, y: number, v: Rect, m = 160): boolean =>
  x > v.x - m && x < v.x + v.w + m && y > v.y - m && y < v.y + v.h + m;

/** The Gauge's tide, 0 (low) – 1 (high): a slow 70s breath shared by the hand and the flats' film. */
const tideLevel = (t: number): number => 0.5 - Math.cos((t / 70) * Math.PI * 2) * 0.5;

const CREEK_W: Pt[] = [{ x: 0, y: 1190 }, { x: 160, y: 1215 }, { x: 330, y: 1190 }, { x: 520, y: 1240 }, { x: 700, y: 1360 }, { x: 790, y: 1500 }, { x: 860, y: 1700 }];
const CREEK_E: Pt[] = [{ x: 2400, y: 940 }, { x: 2250, y: 1040 }, { x: 2120, y: 1080 }, { x: 1960, y: 1170 }, { x: 1800, y: 1210 }];
const CREEK_S: Pt[] = [{ x: 1700, y: 1440 }, { x: 1640, y: 1530 }, { x: 1700, y: 1620 }, { x: 1760, y: 1700 }];
/** The decorative bell buoy riding in the east creek mouth. */
const CREEK_BUOY: Pt = { x: 2310, y: 990 };

const painter: AreaPainter = {
  ground(g, rng) {
    const W = TIDEWATER_W, H = TIDEWATER_H;
    // Dunes above the mark, damp sand to the walks, wet flats below.
    groundFill(g, { x: 0, y: 0, w: W, h: MARK_Y + 40 }, SAND, SAND_DARK, SAND_LIT, rng, 1.2);
    groundFill(g, { x: 0, y: MARK_Y + 40, w: W, h: FLATS_Y - MARK_Y - 40 }, lit(WETSAND, 0.12), WETSAND, WETSAND_LIT, rng, 1.1);
    groundFill(g, { x: 0, y: FLATS_Y, w: W, h: H - FLATS_Y }, WETSAND, WETSAND_DARK, WETSAND_LIT, rng, 1.3);
    // Dune swells: long pale crescents.
    for (let i = 0; i < 26; i++) {
      const x = rng() * W, y = 40 + rng() * (MARK_Y - 60);
      g.fillStyle(SAND_LIT, 0.35); g.fillEllipse(x, y, 160 + rng() * 200, 36 + rng() * 30);
      g.fillStyle(SAND_DARK, 0.25); g.fillEllipse(x + 20, y + 16, 140 + rng() * 160, 12 + rng() * 10);
    }
    // Marram on the dunes, kept off the north road and the headland.
    for (let i = 0; i < 80; i++) {
      const x = 40 + rng() * (W - 80), y = 30 + rng() * (MARK_Y - 50);
      if (Math.abs(x - 1200) < 80 || (x > 1540 && x < 2280 && y > 140)) continue;
      marram(g, x, y, 14 + rng() * 10, rng);
    }
    // The high water mark itself: a strand line drawn right across the court.
    wrackLine(g, [{ x: 0, y: MARK_Y + 30 }, { x: 600, y: MARK_Y + 10 }, { x: 1200, y: MARK_Y + 34 }, { x: 1800, y: MARK_Y + 20 }, { x: 2400, y: MARK_Y + 36 }], rng);
    wrackLine(g, [{ x: 0, y: FLATS_Y - 10 }, { x: 800, y: FLATS_Y + 14 }, { x: 1600, y: FLATS_Y - 4 }, { x: 2400, y: FLATS_Y + 10 }], rng);
    // Ripple-marks over the flats.
    sandRipples(g, { x: 0, y: FLATS_Y + 20, w: W, h: H - FLATS_Y - 40 }, WETSAND_DARK, 0.45, rng, 13);
    sandRipples(g, { x: 0, y: MARK_Y + 60, w: W, h: FLATS_Y - MARK_Y - 80 }, dim(WETSAND_LIT, 0.1), 0.22, rng, 20);
    wormCasts(g, { x: 0, y: FLATS_Y, w: W, h: H - FLATS_Y - 60 }, 160, rng);
    shells(g, { x: 0, y: MARK_Y, w: W, h: H - MARK_Y - 60 }, 320, rng);
    // Mud patches and shining standing water left by the ebb.
    for (let i = 0; i < 22; i++) {
      blob(g, rng() * W, FLATS_Y + 40 + rng() * (H - FLATS_Y - 120), 40 + rng() * 60, 14 + rng() * 16, MUD, 0.45, rng);
    }
    for (let i = 0; i < 28; i++) {
      const x = rng() * W, y = FLATS_Y + 30 + rng() * (H - FLATS_Y - 100);
      blob(g, x, y, 20 + rng() * 40, 6 + rng() * 10, SEA_SHALLOW, 0.55, rng);
      g.fillStyle(SEA_LIT, 0.35); g.fillEllipse(x - 6, y - 2, 12, 2.5);
    }

    // Creeks.
    creek(g, CREEK_W, 34, rng);
    creek(g, CREEK_E, 40, rng);
    creek(g, CREEK_S, 26, rng);

    // The drowned row's lagoon: a standing sheet of tide that was never given back.
    blob(g, DROWNED.x, DROWNED.y, DROWNED.rx + 26, DROWNED.ry + 20, MUD_DARK, 0.85, rng, 14);
    blob(g, DROWNED.x, DROWNED.y, DROWNED.rx, DROWNED.ry, SEA_DEEP, 0.95, rng, 14);
    blob(g, DROWNED.x - 10, DROWNED.y - 6, DROWNED.rx - 40, DROWNED.ry - 30, SEA, 0.85, rng, 12);
    for (let i = 0; i < 30; i++) {
      g.fillStyle(WEED, 0.45); g.fillEllipse(DROWNED.x + (rng() - 0.5) * DROWNED.rx * 1.6, DROWNED.y + (rng() - 0.5) * DROWNED.ry * 1.4, 10 + rng() * 16, 3);
    }
    // Stepping planks laid across it by the neighbours, so the row can still be reached.
    for (let i = 0; i < 9; i++) {
      const x = 640 - i * 52, y = 1170 + i * 18 + (i % 2) * 8;
      g.fillStyle(DRIFT_DARK, 1); g.fillRect(x - 20, y - 6, 40, 12);
      g.fillStyle(DRIFT, 1); g.fillRect(x - 18, y - 5, 36, 9);
    }

    // The shingle causeway from Brinehollow: pebbles packed between timber kerbs.
    stroke(g, [{ x: 1200, y: H }, { x: 1200, y: FLATS_Y - 20 }], 104, PILE);
    stroke(g, [{ x: 1200, y: H }, { x: 1200, y: FLATS_Y - 20 }], 90, 0x8a847a);
    for (let i = 0; i < 900; i++) {
      const y = FLATS_Y - 20 + rng() * (H - FLATS_Y + 20);
      const x = 1200 + (rng() - 0.5) * 84;
      const c = rng();
      g.fillStyle(c < 0.33 ? 0x9e978b : c < 0.66 ? 0x6e695f : 0xb8b0a2, 1);
      g.fillEllipse(x, y, 4 + rng() * 5, 3 + rng() * 3);
    }
    // The tide's reach across the causeway: weed on its lower stones.
    g.fillStyle(WEED, 0.35); g.fillRect(1152, 1460, 96, 200);

    // The dune path north to the Abyssal rim.
    stroke(g, [{ x: 1200, y: 0 }, { x: 1180, y: 240 }, { x: 1210, y: HIGH_WALK }], 86, SAND_DARK, 0.5);
    for (let i = 0; i < 140; i++) {
      g.fillStyle(dim(SAND, 0.15), 0.6); g.fillEllipse(1160 + rng() * 80, rng() * HIGH_WALK, 6, 3);
    }
    // Rocky headland under the lighthouse.
    for (let i = 0; i < 40; i++) {
      const x = 1560 + rng() * 680, y = 160 + rng() * 280;
      g.fillStyle(0x4a4e50, 0.9); g.fillEllipse(x, y, 40 + rng() * 60, 20 + rng() * 26);
      g.fillStyle(0x5d6264, 0.9); g.fillEllipse(x - 6, y - 6, 26 + rng() * 30, 10 + rng() * 10);
    }

    // The walks.
    boardwalk(g, { x: 0, y: HIGH_WALK }, { x: W, y: HIGH_WALK }, 54, rng);
    boardwalk(g, { x: 0, y: LOW_WALK }, { x: PLAZA.x + 10, y: LOW_WALK }, 50, rng);
    boardwalk(g, { x: PLAZA.x + PLAZA.w - 10, y: LOW_WALK }, { x: W, y: LOW_WALK }, 50, rng);
    boardwalk(g, { x: 560, y: HIGH_WALK + 20 }, { x: 560, y: LOW_WALK - 20 }, 40, rng);
    boardwalk(g, { x: 1800, y: HIGH_WALK + 20 }, { x: 1800, y: LOW_WALK - 20 }, 40, rng);
    boardwalk(g, { x: 2050, y: LOW_WALK + 20 }, { x: 2050, y: 1180 }, 38, rng);
    boardwalk(g, { x: 320, y: LOW_WALK + 20 }, { x: 320, y: 1120 }, 38, rng);
    boardwalk(g, { x: 1200, y: HIGH_WALK + 20 }, { x: 1200, y: PLAZA.y + 4 }, 70, rng);
    deck(g, PLAZA, rng);
    // A compass of brass let into the plaza deck, pointing at the lighthouse.
    g.lineStyle(3, BRASS, 0.65); g.strokeCircle(GAUGE.x, GAUGE.y + 120, 54);
    g.lineStyle(1.5, BRASS, 0.5); g.strokeCircle(GAUGE.x, GAUGE.y + 120, 44);
    g.fillStyle(BRASS, 0.6);
    g.fillTriangle(GAUGE.x - 6, GAUGE.y + 120, GAUGE.x + 6, GAUGE.y + 120, GAUGE.x + 36, GAUGE.y + 80);
    g.fillStyle(BUOY, 0.6);
    g.fillTriangle(GAUGE.x - 6, GAUGE.y + 120, GAUGE.x + 6, GAUGE.y + 120, GAUGE.x - 36, GAUGE.y + 160);

    // Tide pools on the south-east rocks.
    poolRocks(g, TIDE_POOLS, rng);
    g.fillStyle(SEA_DEEP, 1); g.fillRoundedRect(TIDE_POOLS.x, TIDE_POOLS.y, TIDE_POOLS.w, TIDE_POOLS.h, 40);
    g.fillStyle(SEA, 1); g.fillRoundedRect(TIDE_POOLS.x + 14, TIDE_POOLS.y + 12, TIDE_POOLS.w - 28, TIDE_POOLS.h - 24, 34);
    g.fillStyle(SEA_SHALLOW, 0.5); g.fillEllipse(TIDE_POOLS.x + 70, TIDE_POOLS.y + 40, 80, 24);
    for (let i = 0; i < 9; i++) {
      anemone(g, TIDE_POOLS.x + 30 + rng() * (TIDE_POOLS.w - 60), TIDE_POOLS.y + 30 + rng() * (TIDE_POOLS.h - 60), 5 + rng() * 3, rng() < 0.5 ? 0xd65a7a : 0x6ab8a0, 0, rng() * 6);
    }
    // Two more little pools nearby, just for the look.
    for (const [x, y, r] of [[1760, 1360, 34], [2210, 1440, 26]] as [number, number, number][]) {
      g.fillStyle(0x3a3f40, 1); g.fillEllipse(x, y, r * 2.6, r * 1.6);
      g.fillStyle(SEA_DEEP, 1); g.fillEllipse(x, y, r * 2, r * 1.1);
      g.fillStyle(SEA_LIT, 0.4); g.fillEllipse(x - r * 0.3, y - r * 0.2, r * 0.8, r * 0.2);
    }

    // The Low-Water Stone, at the sea's edge: where the Queen's tide is called.
    g.fillStyle(0x000000, 0.3); g.fillEllipse(LOW_WATER_STONE.x, LOW_WATER_STONE.y + 6, 90, 26);
    g.fillStyle(0x3e4446, 1); g.fillEllipse(LOW_WATER_STONE.x, LOW_WATER_STONE.y, 80, 34);
    g.fillStyle(0x56605f, 1); g.fillEllipse(LOW_WATER_STONE.x, LOW_WATER_STONE.y - 4, 66, 24);
    g.lineStyle(2, BRASS, 0.8); g.strokeEllipse(LOW_WATER_STONE.x, LOW_WATER_STONE.y - 4, 40, 14);
    g.fillStyle(BRASS, 0.8); g.fillCircle(LOW_WATER_STONE.x, LOW_WATER_STONE.y - 4, 4);
    for (let i = 0; i < 12; i++) { g.fillStyle(BARNACLE, 0.85); g.fillCircle(LOW_WATER_STONE.x - 30 + rng() * 60, LOW_WATER_STONE.y + rng() * 10, 1.5); }

    // The sea along the south shore.
    g.fillStyle(SEA_SHALLOW, 1); g.fillRect(0, 1640, W, H - 1640);
    g.fillStyle(SEA, 1); g.fillRect(0, 1662, W, H - 1662);
    g.fillStyle(SEA_DEEP, 1); g.fillRect(0, 1684, W, H - 1684);
    // The causeway runs on out under the water.
    g.fillStyle(0x6e695f, 0.6); g.fillRect(1152, 1640, 96, 60);
    foamEdge(g, 0, W, (x) => 1642 + Math.sin(x * 0.02) * 3, 3, 0.7);
  },

  pieces,

  animate(g, t, view) {
    const lvl = tideLevel(t);
    // The film of tide breathing over the low flats.
    const filmTop = 1640 - lvl * 220;
    if (view.y + view.h > filmTop - 20) {
      const x0 = Math.max(0, view.x - 40), x1 = Math.min(TIDEWATER_W, view.x + view.w + 40);
      g.fillStyle(SEA_SHALLOW, 0.22 + lvl * 0.12);
      g.fillRect(x0, filmTop + 6, x1 - x0, 1700 - filmTop);
      g.fillStyle(SEA_LIT, 0.12);
      for (let x = x0 - (x0 % 60); x < x1; x += 60) {
        g.fillEllipse(x + Math.sin(t * 0.8 + x) * 10, filmTop + 26 + (x % 120) * 0.3, 40, 3);
      }
      foamEdge(g, x0, x1, (x) => filmTop + Math.sin(x * 0.018 + t * 1.3) * 5 + Math.sin(x * 0.05 - t) * 2, 2.5, 0.55);
    }
    // Sea edge foam working back and forth.
    if (view.y + view.h > 1600) {
      const x0 = Math.max(0, view.x - 40), x1 = Math.min(TIDEWATER_W, view.x + view.w + 40);
      const surge = Math.sin(t * 0.9) * 8;
      foamEdge(g, x0, x1, (x) => 1650 + surge + Math.sin(x * 0.03 + t * 2) * 3, 2, 0.8);
    }
    // Creek shimmer: light flecks running downstream.
    for (const pts of [CREEK_W, CREEK_E, CREEK_S]) {
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], b = pts[i + 1];
        if (!inView((a.x + b.x) / 2, (a.y + b.y) / 2, view, 300)) continue;
        for (let k = 0; k < 3; k++) {
          const ph = (t * 0.25 + k / 3 + i * 0.17) % 1;
          const x = a.x + (b.x - a.x) * ph, y = a.y + (b.y - a.y) * ph;
          g.fillStyle(SEA_LIT, 0.55 * Math.sin(ph * Math.PI)); g.fillEllipse(x, y, 12, 2.5);
        }
      }
    }
    // The drowned row: slow rings on the lagoon.
    if (inView(DROWNED.x, DROWNED.y, view, 320)) {
      for (let i = 0; i < 4; i++) {
        const ph = (t * 0.22 + i / 4) % 1;
        const cx = DROWNED.x - 180 + i * 110, cy = DROWNED.y + 40 - (i % 2) * 60;
        g.lineStyle(1.2, SEA_LIT, (1 - ph) * 0.45);
        g.strokeEllipse(cx, cy, 10 + ph * 50, 4 + ph * 14);
      }
    }
    // Tide pools: ripples and swaying anemones.
    if (inView(TIDE_POOLS.x + TIDE_POOLS.w / 2, TIDE_POOLS.y + TIDE_POOLS.h / 2, view, 300)) {
      for (let i = 0; i < 4; i++) {
        const ph = (t * 0.4 + i / 4) % 1;
        const cx = TIDE_POOLS.x + 50 + ((i * 71) % (TIDE_POOLS.w - 100));
        const cy = TIDE_POOLS.y + 40 + ((i * 37) % (TIDE_POOLS.h - 70));
        g.lineStyle(1.2, SEA_LIT, (1 - ph) * 0.5);
        g.strokeEllipse(cx, cy, 8 + ph * 40, 3 + ph * 12);
      }
      for (let i = 0; i < 4; i++) {
        anemone(g, TIDE_POOLS.x + 40 + i * 70, TIDE_POOLS.y + TIDE_POOLS.h - 22 - (i % 2) * 70, 6, i % 2 ? 0xd65a7a : 0x6ab8a0, t, i * 1.7);
      }
    }
    // The bell buoy rocking in the creek mouth.
    if (inView(CREEK_BUOY.x, CREEK_BUOY.y, view)) {
      g.lineStyle(1.2, SEA_LIT, 0.5); g.strokeEllipse(CREEK_BUOY.x, CREEK_BUOY.y + 2, 60 + Math.sin(t * 1.5) * 6, 16);
      bellBuoyBody(g, CREEK_BUOY.x, CREEK_BUOY.y, 0.8, Math.sin(t * 1.7) * 0.9, Math.sin(t * 0.9) * 0.12);
    }
    // Lit windows breathe.
    for (const w of windows) {
      if (!inView(w.x, w.y, view)) continue;
      g.fillStyle(LAMP, 0.05 + Math.sin(t * 2.1 + w.x) * 0.02); g.fillCircle(w.x, w.y, 26);
    }
  },

  animateOver(g, t, view) {
    // The Gauge's hand, over the baked tower.
    if (inView(GAUGE.x, GAUGE.y - 160, view, 200)) gaugeHand(g, GAUGE.x, GAUGE.y, tideLevel(t));
    // The lighthouse beam turns over the flats.
    if (inView(MANOR.x, MANOR.y - 400, view, 800)) {
      lighthouseBeam(g, MANOR.x, MANOR.y - 435, t);
      g.fillStyle(LAMP, 0.25 + Math.sin(t * 3.1) * 0.08); g.fillRect(MANOR.x - 26, MANOR.y - 454, 52, 38);
    }
    // Gulls wheel over the flats and the headland.
    if (inView(1300, 1250, view, 400)) gulls(g, 1300, 1200, t, 5, 1);
    if (inView(2000, 260, view, 400)) gulls(g, 2000, 230, t * 0.8, 4, 7);
    if (inView(500, 300, view, 400)) gulls(g, 520, 260, t * 1.1, 3, 3);
    // Spray off the sea edge.
    if (view.y + view.h > 1600) {
      for (let i = 0; i < 10; i++) {
        const ph = (t * 0.7 + i / 10) % 1;
        const x = view.x + ((i * 233) % Math.max(1, view.w));
        g.fillStyle(FOAM, 0.5 * (1 - ph)); g.fillCircle(x + ph * 20, 1650 - ph * 30, 1.5 + ph);
      }
    }
  },
};

export const TIDEWATER_AREA: AreaDef = {
  id: 'tidewater',
  isle: 'water',
  court: 'tidewater',
  name: 'The Tidewater Court',
  subtitle: 'Pay before the bell, or stay under',
  w: TIDEWATER_W,
  h: TIDEWATER_H,
  bg: WETSAND_DARK,
  accent: TIDEWATER_COLOR,
  weather: 'fog',
  spawn: { x: 1200, y: 1600 },
  painter,
  solids,
  exits: [
    { side: 's', to: 'brinehollow', label: 'Down the causeway to Brinehollow' },
    { side: 'n', to: 'abyssal', label: 'Over the dunes to the Abyssal rim' },
    { side: 'w', to: 'inkwell', at: LOW_WALK, label: 'The Inkwell canals' },
    { side: 'e', to: 'rimefast', at: LOW_WALK, label: 'The road to Rimefast' },
  ],
  pois: [
    { kind: 'waystone', at: { x: 1070, y: 1592 } },
    { kind: 'prince', id: 'ebb', at: { x: MANOR.x, y: MANOR.y + 50 } },
    { kind: 'water', id: 'tidewater-pools', shape: TIDE_POOLS, fishery: 'tidewater-pools' },
    { kind: 'encounter', id: 'tidewater-high-water' },
    { kind: 'encounter', id: 'tidewater-crab-season' },
    { kind: 'encounter', id: 'tidewater-rip-current' },
    { kind: 'encounter', id: 'tidewater-bell-buoy' },
    { kind: 'encounter', id: 'tidewater-bottle' },
    {
      kind: 'sign', at: { x: 1400, y: 1600 },
      text: 'THE DRY TITHE. One coin a head, paid before the bell. Floors are given back at the ebb to the paid.',
    },
    {
      kind: 'sign', at: { x: 1110, y: 830 },
      text: 'THE TIDE GAUGE. When the hand passes into the blue, the sea is the Queen\'s. Be above the mark.',
    },
    {
      kind: 'sign', at: { x: 700, y: 1170 },
      text: 'THE LOW ROW. Left under by order of Prince Ebb, for want of the Dry Tithe. No salvage.',
    },
    { kind: 'chest', id: 'tidewater-chest-drowned', at: { x: 330, y: 1440 }, coins: 70 },
    { kind: 'chest', id: 'tidewater-chest-lamp', at: { x: 2190, y: 440 }, orbs: 2, open: { prince: 'ebb' } },
  ],
  npcs: TIDEWATER_NPCS,
  crowd: TIDEWATER_CROWD,
};
