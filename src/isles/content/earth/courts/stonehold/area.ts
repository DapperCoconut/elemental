import type { AreaDef, AreaPainter, Pt, Rect, Solid } from '../../../../IslesTypes';
import { glow, lit, motes, road, type G } from '../../../../art/IsleArt';
import {
  basaltColumn, blockStack, boulder, boulderKeep, cairn, dolmen, dustGround, fallenMenhir, flatbreadBakery, hearthHeat,
  holedStone, menhir, quarryPool, quarryTools, runnel, runnelBoulder, screeField, smoke, stoneCart, stoneHouse,
  strataFace, titheBoard, treadCrane, turfPatch,
} from './art';
import {
  CHALK, DUST, DUST_LIT, EARTH, EARTH_DARK, GRANITE, GRANITE_DARK, GRANITE_DEEP, GRANITE_LIT, LEY, POOL_LIT,
  SANDSTONE, STONEHOLD_COLOR, STRATA,
} from './palette';
import { STONEHOLD_CROWD, STONEHOLD_NPCS } from './npcs';

/**
 * The Stonehold Court — a fortress town of boulders on the mesa's shoulder, the first court up
 * the rolling-stone road from Quarrymouth.
 *
 * Read it from the Quarrymouth road up:
 * • **the rolling-stone road** (south): the road climbs beside its runnel, the polished groove the
 *   households' tithe boulders roll down to the Scales; Roller Cobb's yard of jumped boulders
 *   sits east of it, the waystone (a holed stone) at the road's foot;
 * • **the Tithe pit** (south-west): a stepped round pit where each household's cut stone is
 *   lowered by the treadwheel crane and tallied on the slate board before it goes down the road;
 * • **the Moot Ring** at the crossing of the roads: an old ring of standing stones round a
 *   flagged yard, west to the Potter's Court and east to the Forge;
 * • **the stone houses** along the west and east roads, every one hollowed out of a standing
 *   stone — the old street names cut in their lintels, most of them plastered over now; the
 *   Flatbread Stone bakery in its split boulder on the east road; Quoit's dolmen stall on the west;
 * • **the giant's causeway** (north-west): a field of basalt hexagons breaking the surface;
 * • **the menhir avenue** (north): a double row of standing stones up the Sepulchre road to the
 *   cut in the mesa face, with the Old King's fallen stone lying beside it; and Prince Bould's
 *   boulder keep to the north-east, under the face, with the scree slopes beyond.
 *
 * Over all of it, the dust.
 */

export const STONEHOLD_W = 2400;
export const STONEHOLD_H = 1700;

const ROAD_X = 1200;
const ROAD_Y = 850;

/** The Moot Ring at the crossing. */
export const MOOT: Pt = { x: 1200, y: 850 };
/** Prince Bould's keep: the gate's base centre. */
export const KEEP: Pt = { x: 1800, y: 430 };
/** The Tithe pit: centre, radii. */
export const PIT: Pt = { x: 620, y: 1300 };
const PIT_RX = 200, PIT_RY = 120;
/** The quarry pool — the court's fishing water. */
export const QUARRY_POOL: Rect = { x: 1700, y: 1180, w: 380, h: 200 };
/** The Flatbread Stone: the bakery's base centre. */
export const BAKERY: Pt = { x: 1640, y: 760 };
/** The runnel's bend where tithe boulders jump. */
export const RUNNEL_BEND: Pt = { x: 1290, y: 1200 };
/** The Old King's fallen menhir by the avenue. */
export const FALLEN: Pt = { x: 1420, y: 300 };
/** The Hollins' house, being walled up. */
export const HOLLIN_HOUSE: Pt = { x: 2050, y: 1000 };
/** The four west-road houses whose lintels have been plastered. */
export const PLASTERED: Pt[] = [{ x: 180, y: 790 }, { x: 360, y: 790 }, { x: 720, y: 790 }, { x: 900, y: 790 }];

const RUNNEL_PTS: Pt[] = [
  { x: 1250, y: 960 }, { x: 1290, y: 1200 }, { x: 1262, y: 1400 }, { x: 1300, y: 1560 }, { x: 1292, y: 1720 },
];

type Piece = NonNullable<AreaPainter['pieces']>[number];

const pieces: Piece[] = [];
const solids: Solid[] = [];
/** Smoke holes that smoke in `animate`. */
const chimneys: { x: number; y: number; s: number }[] = [];

function addPiece(x: number, y: number, w: number, h: number, draw: (g: G, rng: () => number) => void, solid?: Solid): void {
  pieces.push({ x, y, w, h, draw });
  if (solid) solids.push(solid);
}

function addHouse(x: number, y: number, w: number, h: number, o: Parameters<typeof stoneHouse>[6] = {}): void {
  addPiece(x, y, w + 40, h + 20, (g, rng) => { stoneHouse(g, x, y, w, h, rng, o); }, { kind: 'rect', x: x - w / 2, y: y - 30, w, h: 30 });
  if (!o.interred) chimneys.push({ x: x + w * 0.18 + (o.lean ?? 0), y: y - h * 0.88, s: (x * 0.013) % 1 });
}

function addMenhir(x: number, y: number, w: number, h: number, lean = 0, marks = false): void {
  addPiece(x, y, w * 2, h + 20, (g, rng) => menhir(g, x, y, w, h, rng, lean, marks), { kind: 'circle', x, y: y - 4, r: w * 0.42 });
}

const inView = (x: number, y: number, v: Rect, pad = 160) => x > v.x - pad && x < v.x + v.w + pad && y > v.y - pad && y < v.y + v.h + pad;

// ── Layout ───────────────────────────────────────────────────────────

// The mesa face along the north edge, cut through for the Sepulchre road.
solids.push({ kind: 'rect', x: 0, y: 0, w: 1100, h: 120 }, { kind: 'rect', x: 1300, y: 0, w: 1100, h: 120 });
// Gate menhirs either side of the cut.
addMenhir(1086, 176, 40, 120, -4, false);
addMenhir(1314, 176, 40, 116, 5, false);

// The menhir avenue up the Sepulchre road.
for (let i = 0; i < 6; i++) {
  const y = 270 + i * 76;
  addMenhir(ROAD_X - 95, y, 30 + (i % 3) * 4, 70 + ((i * 17) % 30), (i % 2 ? 3 : -3), i === 2);
  addMenhir(ROAD_X + 95, y + 10, 30 + ((i + 1) % 3) * 4, 66 + ((i * 23) % 34), (i % 2 ? -4 : 2), i === 4);
}
// The Old King's stone, pulled down and left where it fell.
addPiece(FALLEN.x, FALLEN.y, 260, 60, (g, rng) => fallenMenhir(g, FALLEN.x, FALLEN.y, 150, rng), { kind: 'rect', x: FALLEN.x - 76, y: FALLEN.y - 20, w: 152, h: 24 });

// Prince Bould's boulder keep.
addPiece(KEEP.x, KEEP.y, 680, 320, (g, rng) => boulderKeep(g, KEEP.x, KEEP.y, 600, rng), { kind: 'rect', x: KEEP.x - 290, y: KEEP.y - 50, w: 580, h: 50 });
addPiece(2160, 520, 120, 80, (g, rng) => blockStack(g, 2160, 520, 3, 3, rng, true), { kind: 'rect', x: 2118, y: 494, w: 84, h: 26 });

// The Moot Ring of standing stones round the crossing, open where the roads come in.
for (let i = 0; i < 16; i++) {
  const a = (i / 16) * Math.PI * 2 + 0.2;
  const nearRoad = [0, Math.PI / 2, Math.PI, Math.PI * 1.5, Math.PI * 2].some((r) => Math.abs(a - r) < 0.32);
  if (nearRoad) continue;
  const x = MOOT.x + Math.cos(a) * 240, y = MOOT.y + Math.sin(a) * 150;
  addMenhir(x, y, 34, 76 + ((i * 29) % 30), Math.cos(a) * 4, i === 5);
}

// The giant's causeway's tallest columns (the rest are in the ground).
for (const [x, y, h] of [[220, 340, 46], [300, 300, 60], [880, 320, 40], [850, 660, 52], [190, 640, 36], [640, 290, 70]] as [number, number, number][]) {
  addPiece(x, y, 90, h + 40, (g) => basaltColumn(g, x, y, 30, h), { kind: 'circle', x, y: y - 6, r: 26 });
}

// The west road: stone houses, the old names plastered over on four of them.
for (const p of PLASTERED) addHouse(p.x, p.y, 110, 170 + ((p.x * 7) % 30), { plastered: true, glow: (p.x % 3) * 0.4, windows: 2, lean: (p.x % 5) - 2 });
// Ysolde's lettered stone: a practice menhir covered in cut letters.
addPiece(540, 770, 70, 110, (g, rng) => {
  menhir(g, 540, 770, 36, 90, rng, 2, false);
  g.lineStyle(1.2, GRANITE_DEEP, 0.9);
  for (let r = 0; r < 5; r++) for (let k = 0; k < 4; k++) {
    const lx = 528 + k * 6, ly = 712 + r * 9;
    g.lineBetween(lx, ly, lx, ly + 5); if ((r + k) % 2) g.lineBetween(lx, ly, lx + 3, ly + 2);
  }
}, { kind: 'circle', x: 540, y: 766, r: 15 });
addPiece(600, 776, 60, 40, (g, rng) => quarryTools(g, 600, 776, rng));
// South side of the west road.
addHouse(160, 1000, 120, 160, { glow: 0.8, windows: 2 });
addHouse(330, 1000, 110, 180, { glow: 0.6, windows: 1, lean: 3 });
addHouse(970, 1010, 100, 150, { sand: true, glow: 0.5 });
// Quoit's dolmen stall.
addPiece(640, 960, 220, 140, (g, rng) => dolmen(g, 640, 960, 150, 92, rng, true));
solids.push({ kind: 'circle', x: 583, y: 952, r: 16 }, { kind: 'circle', x: 697, y: 952, r: 16 });

// The east road: the Flatbread Stone in its split boulder, and more houses.
addPiece(BAKERY.x + 60, BAKERY.y, 420, 220, (g, rng) => flatbreadBakery(g, BAKERY.x, BAKERY.y, rng), { kind: 'rect', x: BAKERY.x - 150, y: BAKERY.y - 40, w: 300, h: 40 });
solids.push({ kind: 'circle', x: BAKERY.x + 150, y: BAKERY.y + 4, r: 46 });
chimneys.push({ x: BAKERY.x, y: BAKERY.y - 176, s: 0.4 }, { x: BAKERY.x + 4, y: BAKERY.y - 176, s: 0.9 });
addHouse(2000, 790, 120, 170, { glow: 0.7, windows: 2 });
addHouse(1500, 1000, 110, 160, { glow: 0.4, windows: 1, sand: true });
addHouse(1690, 1010, 100, 150, { glow: 0.9, windows: 2, lean: -3 });
addHouse(HOLLIN_HOUSE.x, HOLLIN_HOUSE.y, 120, 175, { interred: true, windows: 2 });
// The masons' blocks and their cart outside the Hollins'.
addPiece(2190, 1020, 120, 70, (g, rng) => stoneCart(g, 2190, 1020, rng, -1), { kind: 'rect', x: 2144, y: 996, w: 92, h: 24 });

// The Tithe pit: the treadwheel crane, the tally board, the stacks waiting to go down.
solids.push({ kind: 'circle', x: PIT.x - 100, y: PIT.y, r: 108 }, { kind: 'circle', x: PIT.x + 100, y: PIT.y, r: 108 }, { kind: 'circle', x: PIT.x, y: PIT.y, r: 118 });
addPiece(860, 1190, 260, 200, (g, rng) => treadCrane(g, 860, 1190, rng, -1.05), { kind: 'rect', x: 820, y: 1176, w: 80, h: 16 });
addPiece(390, 1150, 80, 80, (g, rng) => titheBoard(g, 390, 1150, rng), { kind: 'rect', x: 360, y: 1142, w: 60, h: 10 });
addPiece(390, 1470, 120, 90, (g, rng) => blockStack(g, 390, 1470, 4, 3, rng), { kind: 'rect', x: 336, y: 1444, w: 108, h: 26 });
addPiece(860, 1470, 120, 90, (g, rng) => blockStack(g, 860, 1470, 3, 4, rng, true), { kind: 'rect', x: 816, y: 1444, w: 88, h: 26 });
addPiece(980, 1290, 130, 80, (g, rng) => stoneCart(g, 980, 1290, rng, 1), { kind: 'rect', x: 934, y: 1266, w: 92, h: 24 });

// Cobb's yard of boulders that jumped the runnel.
for (const [x, y, r, sand] of [[1450, 1190, 30, false], [1540, 1270, 36, true], [1470, 1410, 28, false], [1590, 1450, 32, true], [1420, 1540, 24, false]] as [number, number, number, boolean][]) {
  addPiece(x, y, r * 3, r * 2.4, (g, rng) => boulder(g, x, y, r, rng, { sand, moss: !sand }), { kind: 'circle', x, y: y - r * 0.5, r: r * 0.85 });
}
addPiece(1400, 1290, 60, 60, (g, rng) => cairn(g, 1400, 1290, 0.9, rng));

// South: houses at the foot of the town, the waystone at the road's foot.
addHouse(220, 1640, 120, 160, { glow: 0.5, windows: 2 });
addHouse(560, 1620, 110, 170, { sand: true, glow: 0.3, lean: 2 });
addHouse(900, 1630, 110, 150, { glow: 0.7, windows: 1 });
addHouse(1880, 1600, 120, 170, { glow: 0.6, windows: 2 });
addHouse(2250, 1520, 110, 160, { sand: true, glow: 0.4, lean: -2 });
addPiece(1060, 1580, 70, 90, (g, rng) => holedStone(g, 1060, 1580, 26, rng, 0.8), { kind: 'circle', x: 1060, y: 1574, r: 18 });

// The scree slopes under the east face: cairns where the runners mark their routes.
for (const [x, y, s] of [[2220, 300, 1], [2320, 470, 0.8], [2260, 700, 0.9]] as [number, number, number][]) {
  addPiece(x, y, 60, 70, (g, rng) => cairn(g, x, y, s, rng), { kind: 'circle', x, y: y - 4, r: 12 * s });
}
addPiece(2340, 1180, 60, 60, (g, rng) => boulder(g, 2340, 1180, 22, rng));

// ── Painter ──────────────────────────────────────────────────────────

const painter: AreaPainter = {
  ground(g, rng) {
    dustGround(g, { x: 0, y: 0, w: STONEHOLD_W, h: STONEHOLD_H }, rng);
    for (let i = 0; i < 26; i++) turfPatch(g, rng() * STONEHOLD_W, 200 + rng() * 1450, 60 + rng() * 120, 24 + rng() * 40, rng);

    // The scree under the east face.
    screeField(g, { x: 2130, y: 120, w: 270, h: 640 }, rng);

    // The giant's causeway: hex tops breaking the surface in a broad oval, highest in the middle.
    const ccx = 540, ccy = 470;
    for (let r = 0; r < 16; r++) {
      for (let c = 0; c < 16; c++) {
        const x = 150 + c * 50 + (r % 2) * 25, y = 230 + r * 28;
        const d = Math.hypot((x - ccx) / 400, (y - ccy) / 240);
        if (d > 1 || rng() < d * d * 0.6) continue;
        basaltColumn(g, x, y, 25, 2 + (1 - d) * 10 + rng() * 4, 0, 0.62);
      }
    }

    // Roads.
    road(g, [{ x: ROAD_X, y: STONEHOLD_H + 20 }, { x: ROAD_X - 10, y: 1300 }, { x: ROAD_X, y: ROAD_Y }, { x: ROAD_X + 6, y: 500 }, { x: ROAD_X, y: -20 }], 96, DUST, EARTH_DARK, GRANITE, rng);
    road(g, [{ x: -20, y: ROAD_Y }, { x: 600, y: ROAD_Y + 6 }, { x: ROAD_X, y: ROAD_Y }, { x: 1800, y: ROAD_Y - 6 }, { x: STONEHOLD_W + 20, y: ROAD_Y }], 84, DUST, EARTH_DARK, GRANITE, rng);
    road(g, [{ x: 1290, y: ROAD_Y }, { x: 1520, y: 560 }, { x: KEEP.x, y: KEEP.y + 60 }], 60, DUST, EARTH_DARK, GRANITE, rng);
    road(g, [{ x: ROAD_X, y: 1060 }, { x: 900, y: 1160 }, { x: PIT.x + 40, y: PIT.y - PIT_RY - 30 }], 54, DUST, EARTH_DARK, GRANITE, rng);
    road(g, [{ x: ROAD_X, y: 1300 }, { x: 1500, y: 1360 }, { x: QUARRY_POOL.x - 70, y: QUARRY_POOL.y + 120 }], 50, DUST, EARTH_DARK, GRANITE, rng);

    // The Moot Ring's flagged yard.
    for (let i = 0; i < 70; i++) {
      const a = (i / 70) * Math.PI * 2, rr = 120 + (i % 3) * 30;
      const x = MOOT.x + Math.cos(a) * rr * 1.5, y = MOOT.y + Math.sin(a) * rr;
      const w = 30 + rng() * 14, h = 14 + rng() * 6;
      g.fillStyle(GRANITE_DARK, 0.9); g.fillRoundedRect(x - w / 2 + 1, y - h / 2 + 2, w, h, 4);
      g.fillStyle(rng() < 0.3 ? SANDSTONE : GRANITE, 0.95); g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 4);
    }
    g.fillStyle(GRANITE_DARK, 1); g.fillEllipse(MOOT.x + 2, MOOT.y + 3, 140, 52);
    g.fillStyle(GRANITE, 1); g.fillEllipse(MOOT.x, MOOT.y, 136, 48);
    g.lineStyle(2, CHALK, 0.6);
    for (let k = 0; k < 8; k++) g.lineBetween(MOOT.x - 34 + k * 7, MOOT.y - 9, MOOT.x - 34 + k * 7, MOOT.y + 9);
    g.lineBetween(MOOT.x - 38, MOOT.y + 7, MOOT.x + 22, MOOT.y - 7);

    // The Tithe pit: stepped rings of strata down to a floor of cut blocks.
    for (let k = 0; k < 5; k++) {
      const s = 1 - k * 0.15;
      const c = STRATA[k % STRATA.length];
      g.fillStyle(lit(c, 0.08), 1); g.fillEllipse(PIT.x, PIT.y + k * 6, PIT_RX * 2 * s, PIT_RY * 2 * s);
      g.fillStyle(c, 1); g.fillEllipse(PIT.x, PIT.y + k * 6 + 6, PIT_RX * 2 * s, PIT_RY * 2 * s - 6);
      g.fillStyle(0x000000, 0.12 + k * 0.05); g.fillEllipse(PIT.x, PIT.y + k * 6 + 10, PIT_RX * 2 * s - 8, PIT_RY * 2 * s - 14);
    }
    g.fillStyle(GRANITE_DEEP, 1); g.fillEllipse(PIT.x, PIT.y + 36, PIT_RX * 0.9, PIT_RY * 0.75);
    for (let i = 0; i < 26; i++) {
      const a = rng() * Math.PI * 2, d = Math.sqrt(rng()) * 0.8;
      const bx = PIT.x + Math.cos(a) * PIT_RX * 0.42 * d, by = PIT.y + 36 + Math.sin(a) * PIT_RY * 0.34 * d;
      g.fillStyle(GRANITE_DARK, 1); g.fillRect(bx - 9, by - 5, 18, 11);
      g.fillStyle(rng() < 0.5 ? SANDSTONE : GRANITE, 1); g.fillRect(bx - 9, by - 6, 16, 9);
      g.lineStyle(1, CHALK, 0.7); g.strokeCircle(bx - 1, by - 2, 2);
    }
    // Ladders down the steps.
    for (const lx of [PIT.x - 120, PIT.x + 80]) {
      g.lineStyle(3, 0x4e341f, 1); g.lineBetween(lx, PIT.y - 90, lx + 10, PIT.y + 10); g.lineBetween(lx + 14, PIT.y - 90, lx + 24, PIT.y + 10);
      for (let k = 0; k < 7; k++) { g.lineStyle(2, 0x7a5636, 1); g.lineBetween(lx + k * 1.4, PIT.y - 84 + k * 14, lx + 14 + k * 1.4, PIT.y - 84 + k * 14); }
    }

    // The runnel beside the rolling-stone road.
    runnel(g, RUNNEL_PTS, rng);
    // The bend where the boulders jump: scars in the kerb.
    for (let i = 0; i < 6; i++) { g.lineStyle(2, GRANITE_LIT, 0.4); g.lineBetween(RUNNEL_BEND.x + 22 + i * 4, RUNNEL_BEND.y - 10 + i * 5, RUNNEL_BEND.x + 40 + i * 6, RUNNEL_BEND.y - 4 + i * 5); }

    // Cobb's yard: a beaten oval fenced with a ring of small stones.
    g.fillStyle(EARTH_DARK, 0.3); g.fillEllipse(1500, 1360, 320, 380);
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * Math.PI * 2;
      const x = 1500 + Math.cos(a) * 165, y = 1360 + Math.sin(a) * 195;
      if (Math.abs(a - Math.PI) < 0.4) continue;
      g.fillStyle(GRANITE_DARK, 1); g.fillEllipse(x + 1, y + 1, 12, 8); g.fillStyle(GRANITE, 1); g.fillEllipse(x, y, 11, 7);
    }

    // The quarry pool.
    quarryPool(g, QUARRY_POOL, rng);

    // The mesa face, and the road's cut through it.
    strataFace(g, 0, 0, 1110, 140, rng);
    strataFace(g, 1290, 0, 1110, 140, rng);
    g.fillStyle(0x000000, 0.18); g.fillRect(1100, 0, 20, 140); g.fillRect(1280, 0, 20, 140);
    g.fillStyle(DUST, 0.5); g.fillRect(1120, 0, 160, 140);
  },

  pieces,

  animate(g, t, view) {
    for (const c of chimneys) if (inView(c.x, c.y, view)) smoke(g, c.x, c.y, t, c.s);
    // The griddle stone's heat.
    if (inView(BAKERY.x + 150, BAKERY.y, view, 200)) hearthHeat(g, BAKERY.x + 150, BAKERY.y - 4, t);
    // A tithe boulder rolling down the runnel every so often.
    if (inView(1280, 1300, view, 500)) {
      const ph = (t * 0.07) % 1;
      if (ph < 0.6) runnelBoulder(g, RUNNEL_PTS, ph / 0.6, 18);
    }
    // The pool: rings and a carp's back.
    if (inView(QUARRY_POOL.x + 190, QUARRY_POOL.y + 100, view, 300)) {
      for (let i = 0; i < 4; i++) {
        const ph = (t * 0.3 + i / 4) % 1;
        const cx = QUARRY_POOL.x + 60 + ((i * 113) % (QUARRY_POOL.w - 120)), cy = QUARRY_POOL.y + 40 + ((i * 61) % (QUARRY_POOL.h - 80));
        g.lineStyle(1.2, POOL_LIT, 0.5 * (1 - ph)); g.strokeEllipse(cx, cy, 8 + ph * 44, 3 + ph * 16);
      }
      const kx = QUARRY_POOL.x + QUARRY_POOL.w / 2 + Math.cos(t * 0.25) * 120, ky = QUARRY_POOL.y + QUARRY_POOL.h / 2 + Math.sin(t * 0.25) * 50;
      g.fillStyle(0x5a6a6a, 0.5); g.fillEllipse(kx, ky, 26, 10);
    }
    // Ley light flickering between the avenue's paired stones.
    if (inView(ROAD_X, 450, view, 300)) {
      for (let i = 0; i < 6; i++) {
        const y = 270 + i * 76 - 30;
        const a = 0.12 + Math.max(0, Math.sin(t * 1.3 + i * 1.1)) * 0.22;
        g.lineStyle(3, LEY, a); g.lineBetween(ROAD_X - 95, y, ROAD_X + 95, y + 10);
      }
    }
    // Lamps in the keep's slits breathing.
    if (inView(KEEP.x, KEEP.y - 150, view, 400)) {
      for (const s of [-1, 1]) glow(g, KEEP.x + s * 230, KEEP.y - 120, 24, 0xffb050, 0.025 + Math.sin(t * 2 + s) * 0.01, 3);
    }
  },

  animateOver(g, t, view) {
    motes(g, view, t, 30, DUST_LIT, 8, 22, 1.6, 4);
    // Dust devils on the causeway and the east scree.
    for (const [x, y, s] of [[540, 470, 0], [2250, 520, 2]] as [number, number, number][]) {
      if (!inView(x, y, view, 300)) continue;
      const cx = x + Math.sin(t * 0.3 + s) * 160, cy = y + Math.cos(t * 0.21 + s) * 80;
      for (let i = 0; i < 9; i++) {
        const k = i / 9;
        const a = t * 6 + i * 0.9;
        g.fillStyle(DUST, 0.18 * (1 - k)); g.fillEllipse(cx + Math.cos(a) * (6 + k * 18), cy - k * 70, 12 + k * 20, 6 + k * 6);
      }
    }
    // Grit blowing off the mesa face.
    if (inView(1200, 100, view, 600)) {
      for (let i = 0; i < 12; i++) {
        const ph = (t * 0.2 + i / 12) % 1;
        g.fillStyle(EARTH, 0.4 * (1 - ph)); g.fillCircle(view.x + ((i * 233) % Math.max(1, view.w)) + ph * 120, 140 + ph * 60, 1.4);
      }
    }
  },
};

export const STONEHOLD_AREA: AreaDef = {
  id: 'stonehold',
  isle: 'earth',
  court: 'stonehold',
  name: 'The Stonehold Court',
  subtitle: 'What is owed is owed, and stone does not forget',
  w: STONEHOLD_W,
  h: STONEHOLD_H,
  bg: 0x5a4a36,
  accent: STONEHOLD_COLOR,
  weather: 'dust',
  spawn: { x: 1200, y: 1600 },
  painter,
  solids,
  exits: [
    { side: 's', to: 'quarrymouth', label: 'Down the rolling-stone road to Quarrymouth' },
    { side: 'n', to: 'rubble', label: 'Up the Sepulchre road to the Rubble Court' },
    { side: 'w', to: 'potter', at: ROAD_Y, label: 'The west road to the Potter\'s Court' },
    { side: 'e', to: 'forge', at: ROAD_Y, label: 'The east road to the Forge Court' },
  ],
  pois: [
    { kind: 'waystone', at: { x: 1060, y: 1622 } },
    { kind: 'prince', id: 'bould', at: { x: KEEP.x, y: KEEP.y + 50 } },
    { kind: 'water', id: 'stonehold-pool', shape: QUARRY_POOL, fishery: 'stonehold-pool' },
    { kind: 'encounter', id: 'stonehold-rolling-stone' },
    { kind: 'encounter', id: 'stonehold-ley-lines' },
    { kind: 'encounter', id: 'stonehold-causeway' },
    { kind: 'encounter', id: 'stonehold-tithe-scales' },
    { kind: 'encounter', id: 'stonehold-landslide' },
    {
      kind: 'sign', at: { x: 1290, y: 1630 },
      text: 'THE STONE TITHE. One weight of cut stone a household, each season, rolled to the Scales. Short is interred.',
    },
    {
      kind: 'sign', at: { x: 470, y: 1110 },
      text: 'THE TITHE PIT. Lower your stone by the wheel. The Tallyman marks it. Unmarked stone is no stone at all.',
    },
    {
      kind: 'sign', at: { x: 1290, y: 700 },
      text: 'THE SEPULCHRE ROAD. By order of the Regent the old name of this avenue is buried. Do not speak it.',
    },
    {
      kind: 'sign', at: { x: 1500, y: 360 },
      text: 'THIS STONE WAS PULLED DOWN BY ORDER. It bore a mark no longer in use.',
    },
    { kind: 'chest', id: 'stonehold-chest-scree', at: { x: 2330, y: 1260 }, coins: 90 },
    { kind: 'chest', id: 'stonehold-chest-keep', at: { x: 2160, y: 570 }, orbs: 2, open: { prince: 'bould' } },
  ],
  npcs: STONEHOLD_NPCS,
  crowd: STONEHOLD_CROWD,
};
