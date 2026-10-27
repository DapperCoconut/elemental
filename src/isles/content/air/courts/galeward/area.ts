import type { AreaDef, AreaPainter, Pt, Rect, Solid } from '../../../../IslesTypes';
import { glow, lit, type G } from '../../../../art/IsleArt';
import {
  bakehouse, bellowsBoards, bellowsFrame, bottleRack, breathGlow, cliffLip, cloudSea, cloudWisps, combedTurf, cragBand,
  flagLane, galeCottage, galewardWaystone, grainSack, gull, kite, kitePost, millstone, postMill, postMillHub, ribbonPole,
  ropeBridge, ropewalk, sails, sleeperCot, tollBoard, towerMill, towerMillHub, updraftShimmer, ventGrate, weatherHouse,
  weathervane, windStreak, windsock, type MillHub,
} from './art';
import {
  BRASS, BRASS_LIT, CANVAS, FLAG, GALEWARD_COLOR, KITE_COLORS, ROPE, TURF_DARK, TURF_DEEP, ZEPHYR,
} from './palette';
import { GALEWARD_CROWD, GALEWARD_NPCS } from './npcs';

/**
 * The Galeward Court — a windmill town on Highspire's windward shoulder, the first court up from
 * Windlass, just under the cloud line.
 *
 * Read it from the Windlass road up:
 * • **the toll** (south): Vane Street climbs in from the cliff past the waystone, and the first
 *   thing anyone sees is the toll-bellows — a great pair of leather lungs on a gantry, breathing
 *   in and out over a brass meter — with the bottle racks beside it and the cots of the becalmed;
 * • **the Cloudbank** (south-west): the turf breaks off into the cloud sea, and old Skeet fishes
 *   off the edge into the white;
 * • **Weathercock Square** at the crossing, round the town vane on its column; the Ropewalk on its
 *   east side, the Millstone bakery down the lane to the south-west;
 * • **Mill Row** (north-west): two ranks of tower mills and post mills up the slope, sails always
 *   turning, and the Grindstone — the great mill — at their foot over the west road;
 * • **the Gorge** (south-east): a rift of cloud cuts the shoulder, crossed by two rope bridges to
 *   **the Kite Field**, where every child's kite flies on its post above the drop;
 * • **the Leap** (north-east): the spire breathes up through vents at the cliff's edge, and the
 *   gliders throw themselves off it;
 * • **the Weather House** (north): Prince Zephyr's tall white house and its tower, with the great
 *   brass weathercock on the cupola — pinned, like every vane in town, to point at the toll.
 *
 * The wind is always from the west. Everything that moves here, moves east.
 */

export const GALEWARD_W = 2400;
export const GALEWARD_H = 1700;

const STREET_X = 1200;
const CROSS_Y = 850;

/** Weathercock Square at the crossing. */
export const SQUARE: Pt = { x: 1200, y: 850 };
const SQ_RX = 190, SQ_RY = 150;
/** The toll-bellows and its bottle racks. */
export const BELLOWS: Pt = { x: 1400, y: 1570 };
export const RACK: Pt = { x: 1550, y: 1590 };
/** Where Ma Tolley's bottle can be lifted off the end of the rack (Corked). */
export const TOLLEY_BOTTLE: Pt = { x: 1470, y: 1618 };
/** The Weather House — the middle of its front step. */
export const WEATHER_HOUSE: Pt = { x: 1640, y: 440 };
/** The Grindstone, the great mill over the west road. */
export const GRINDSTONE: Pt = { x: 540, y: 720 };
/** The Millstone bakery: the mill and its oven-house. */
const BAKERY_MILL: Pt = { x: 780, y: 1120 };
const BAKEHOUSE: Pt = { x: 900, y: 1132 };
/** The Ropewalk (shop). */
const ROPEWALK: Pt = { x: 1500, y: 1000 };
/** The cloud gorge between town and the Kite Field, and its two bridges. */
const GORGE: Rect = { x: 1640, y: 1010, w: 170, h: 690 };
const BRIDGE_Y = [1180, 1480];
const BRIDGE_W = 56;
/** The Cloudbank — the court's fishing water, cast into off the south-west cliff. */
export const CLOUDBANK: Rect = { x: 60, y: 1270, w: 450, h: 300 };
/** The four pinned vanes round the square (True North). */
export const VANES: Pt[] = [{ x: 980, y: 700 }, { x: 1420, y: 700 }, { x: 1080, y: 1110 }, { x: 1760, y: 770 }];
/** The Leap — the cliff edge where the gliders go off. */
export const LEAP: Pt = { x: 2180, y: 430 };
/** The vents on the Leap. */
const LEAP_VENTS: Pt[] = [{ x: 1930, y: 560 }, { x: 2110, y: 520 }, { x: 2240, y: 640 }];
/** Where the becalmed lie on their cots, by the toll-house. */
const COTS: [number, number, number][] = [[870, 1452, 0x3a6fb8], [960, 1462, 0x4f9a5a], [870, 1544, 0xc8402e], [1050, 1560, 0xe0a02a], [960, 1600, 0x6a5a8a]];

/** The kite posts on the Kite Field. */
const KITE_POSTS: Pt[] = [{ x: 1960, y: 1110 }, { x: 2160, y: 1080 }, { x: 2310, y: 1250 }, { x: 1960, y: 1400 }, { x: 2200, y: 1430 }];
/** The ribbon pole in the middle of the Kite Field (drawn animated). */
const RIBBON: Pt = { x: 2250, y: 1360 };

/** The cloud corners — polygons of the drop. */
const SW_CLOUD: Pt[] = [{ x: 0, y: 1190 }, { x: 180, y: 1172 }, { x: 360, y: 1188 }, { x: 520, y: 1232 }, { x: 640, y: 1330 }, { x: 700, y: 1480 }, { x: 724, y: 1700 }, { x: 0, y: 1700 }];
const NE_CLOUD: Pt[] = [{ x: 2010, y: 0 }, { x: 2100, y: 120 }, { x: 2200, y: 260 }, { x: 2300, y: 370 }, { x: 2400, y: 400 }, { x: 2400, y: 0 }];
const SE_CLOUD: Pt[] = [{ x: 1810, y: 1640 }, { x: 2000, y: 1620 }, { x: 2200, y: 1632 }, { x: 2400, y: 1610 }, { x: 2400, y: 1700 }, { x: 1810, y: 1700 }];
const GORGE_POLY: Pt[] = [{ x: 1650, y: 1012 }, { x: 1700, y: 1000 }, { x: 1790, y: 1022 }, { x: 1806, y: 1300 }, { x: 1790, y: 1700 }, { x: 1640, y: 1700 }, { x: 1662, y: 1400 }];

type Piece = NonNullable<AreaPainter['pieces']>[number];

const pieces: Piece[] = [];
const solids: Solid[] = [];
/** Mills whose sails turn in `animateOver`: the hub, the speed, a phase. */
const mills: { hub: MillHub; speed: number; phase: number; big?: boolean }[] = [];

function addPiece(x: number, y: number, w: number, h: number, draw: (g: G, rng: () => number) => void, solid?: Solid): void {
  pieces.push({ x, y, w, h, draw });
  if (solid) solids.push(solid);
}

// ── Layout ───────────────────────────────────────────────────────────

// The spire rising along the north edge, open where the road climbs to Starfall.
const NORTH_GAP = 90;
for (const [x0, x1] of [[0, STREET_X - NORTH_GAP], [STREET_X + NORTH_GAP, 2010]] as [number, number][]) {
  addPiece((x0 + x1) / 2, 110, x1 - x0, 150, (g, rng) => cragBand(g, x0, x1, 110, rng), { kind: 'rect', x: x0, y: 0, w: x1 - x0, h: 100 });
}

// The Weather House and its drive.
addPiece(WEATHER_HOUSE.x, WEATHER_HOUSE.y, 460, 420, (g, rng) => { weatherHouse(g, WEATHER_HOUSE.x, WEATHER_HOUSE.y, rng); },
  { kind: 'rect', x: WEATHER_HOUSE.x - 200, y: WEATHER_HOUSE.y - 40, w: 352, h: 34 });
/** Where the great weathercock stands, on the cupola (matches `weatherHouse`). */
const COCK: Pt = { x: WEATHER_HOUSE.x - 150 - 10, y: WEATHER_HOUSE.y - 300 - 80 };
for (const x of [WEATHER_HOUSE.x - 100, WEATHER_HOUSE.x + 100]) {
  addPiece(x, 540, 30, 60, (g) => tollBoard(g, x, 540), { kind: 'rect', x: x - 6, y: 532, w: 12, h: 10 });
}

// Mill Row: tower mills up the slope, post mills below, the Grindstone at the foot.
for (const [x, y, s] of [[200, 330, 0.85], [420, 318, 0.9], [640, 332, 0.85], [860, 322, 0.9]] as [number, number, number][]) {
  addPiece(x, y, 140, 260, (g, rng) => { towerMill(g, x, y, s, rng); }, { kind: 'rect', x: x - 30 * s, y: y - 18, w: 60 * s, h: 18 });
  mills.push({ hub: towerMillHub(x, y, s), speed: 0.9 + ((x * 7) % 5) * 0.08, phase: x * 0.01 });
}
for (const [x, y] of [[300, 590], [760, 590]] as [number, number][]) {
  addPiece(x, y, 120, 190, (g, rng) => { postMill(g, x, y, 1, rng); }, { kind: 'rect', x: x - 32, y: y - 14, w: 64, h: 14 });
  mills.push({ hub: postMillHub(x, y, 1), speed: 1.2, phase: y * 0.02 + x * 0.003 });
}
addPiece(GRINDSTONE.x, GRINDSTONE.y, 220, 360, (g, rng) => { towerMill(g, GRINDSTONE.x, GRINDSTONE.y, 1.45, rng); },
  { kind: 'rect', x: GRINDSTONE.x - 46, y: GRINDSTONE.y - 24, w: 92, h: 24 });
mills.push({ hub: towerMillHub(GRINDSTONE.x, GRINDSTONE.y, 1.45), speed: 0.7, phase: 0.4, big: true });
for (const [x, y, f] of [[450, 750, false], [470, 772, true], [630, 754, true], [650, 776, false], [614, 796, false]] as [number, number, boolean][]) {
  addPiece(x, y, 40, 40, (g) => grainSack(g, x, y, 1, f));
}
addPiece(390, 800, 60, 30, (g) => millstone(g, 390, 800, 22), { kind: 'circle', x: 390, y: 798, r: 18 });
addPiece(694, 750, 30, 50, (g) => millstone(g, 694, 750, 22, true));

// Weathercock Square: the town vane on its column (the arrow turns in `animate`).
addPiece(SQUARE.x, SQUARE.y + 6, 60, 60, (g) => {
  g.fillStyle(0x000000, 0.25); g.fillEllipse(SQUARE.x, SQUARE.y + 8, 64, 20);
  g.fillStyle(0x5d5c66, 1); g.fillRect(SQUARE.x - 24, SQUARE.y - 14, 48, 22);
  g.fillStyle(0x8e8d96, 1); g.fillRect(SQUARE.x - 22, SQUARE.y - 14, 44, 6);
  g.fillStyle(0xb6b5bd, 1); g.fillRect(SQUARE.x - 10, SQUARE.y - 120, 20, 108);
  g.fillStyle(0x8e8d96, 1); g.fillRect(SQUARE.x + 2, SQUARE.y - 120, 8, 108);
  g.fillStyle(0x5d5c66, 1); g.fillRect(SQUARE.x - 14, SQUARE.y - 126, 28, 8);
}, { kind: 'circle', x: SQUARE.x, y: SQUARE.y, r: 26 });
// Benches round the square (Nan's is the east one).
for (const [x, y] of [[1300, 742], [1100, 958]] as [number, number][]) {
  addPiece(x, y, 70, 40, (g) => {
    g.fillStyle(0x000000, 0.2); g.fillEllipse(x, y + 2, 64, 12);
    g.fillStyle(0x5a4430, 1); g.fillRect(x - 30, y - 14, 60, 6); g.fillRect(x - 30, y - 26, 60, 4);
    g.fillRect(x - 26, y - 8, 4, 8); g.fillRect(x + 22, y - 8, 4, 8);
    g.fillStyle(0x8a6c4c, 1); g.fillRect(x - 30, y - 14, 60, 2);
  });
}
// The four pinned vanes (poles drawn here; arrows animate).
for (const v of VANES) solids.push({ kind: 'circle', x: v.x, y: v.y, r: 8 });

// The Ropewalk on the square's east side.
addPiece(ROPEWALK.x, ROPEWALK.y, 280, 140, (g, rng) => ropewalk(g, ROPEWALK.x, ROPEWALK.y, 240, rng),
  { kind: 'rect', x: ROPEWALK.x - 124, y: ROPEWALK.y - 30, w: 248, h: 30 });

// Cottages down Vane Street, held down against the gale.
const COTTAGES: [number, number, number, number, number][] = [
  [1010, 1270, 140, 70, 0x3a6fb8], [1400, 1270, 150, 72, 0xc8402e], [1420, 1410, 130, 66, 0x4f9a5a],
  [860, 770, 120, 64, 0xe0a02a], [760, 940, 130, 66, 0x3a6fb8], [1530, 700, 140, 68, 0x4f9a5a],
];
for (const [x, y, w, h, door] of COTTAGES) {
  addPiece(x, y, w + 40, h * 1.9 + 40, (g, rng) => { galeCottage(g, x, y, w, h, rng, door); }, { kind: 'rect', x: x - w / 2 - 4, y: y - 26, w: w + 8, h: 26 });
}

// The Millstone: its own little mill, the oven-house beside it.
addPiece(BAKERY_MILL.x, BAKERY_MILL.y, 140, 240, (g, rng) => { towerMill(g, BAKERY_MILL.x, BAKERY_MILL.y, 0.8, rng); },
  { kind: 'rect', x: BAKERY_MILL.x - 26, y: BAKERY_MILL.y - 18, w: 52, h: 18 });
mills.push({ hub: towerMillHub(BAKERY_MILL.x, BAKERY_MILL.y, 0.8), speed: 1.05, phase: 2.2 });
addPiece(BAKEHOUSE.x, BAKEHOUSE.y, 200, 170, (g, rng) => { bakehouse(g, BAKEHOUSE.x, BAKEHOUSE.y, rng); },
  { kind: 'rect', x: BAKEHOUSE.x - 78, y: BAKEHOUSE.y - 24, w: 156, h: 24 });

// The toll: bellows on its gantry, the bottle racks, the toll board, the cots of the becalmed.
addPiece(BELLOWS.x, BELLOWS.y, 200, 200, (g) => bellowsFrame(g, BELLOWS.x, BELLOWS.y, 1), { kind: 'rect', x: BELLOWS.x - 84, y: BELLOWS.y - 22, w: 168, h: 24 });
addPiece(RACK.x, RACK.y, 130, 110, (g) => bottleRack(g, RACK.x, RACK.y, 3, 6), { kind: 'rect', x: RACK.x - 56, y: RACK.y - 16, w: 112, h: 18 });
addPiece(RACK.x + 10, RACK.y + 70, 100, 110, (g) => bottleRack(g, RACK.x + 10, RACK.y + 70, 3, 5), { kind: 'rect', x: RACK.x - 38, y: RACK.y + 54, w: 96, h: 18 });
addPiece(1300, 1640, 60, 70, (g) => tollBoard(g, 1300, 1640), { kind: 'rect', x: 1294, y: 1632, w: 12, h: 10 });
for (const [x, y, c] of COTS) addPiece(x, y, 80, 40, (g) => sleeperCot(g, x, y, c), { kind: 'rect', x: x - 34, y: y - 16, w: 68, h: 16 });
addPiece(1060, 1620, 60, 80, (g) => galewardWaystone(g, 1060, 1620), { kind: 'circle', x: 1060, y: 1614, r: 15 });

// The Kite Field: posts, the ribbon pole, a reel-bench.
for (let i = 0; i < KITE_POSTS.length; i++) {
  const p = KITE_POSTS[i];
  addPiece(p.x, p.y, 30, 50, (g) => kitePost(g, p.x, p.y, KITE_COLORS[i % 4]), { kind: 'circle', x: p.x, y: p.y - 2, r: 7 });
}
solids.push({ kind: 'circle', x: RIBBON.x, y: RIBBON.y - 2, r: 7 });

// The Leap: the vents are in the ground; a glider rack by the edge.
addPiece(2060, 470, 120, 80, (g) => {
  g.fillStyle(0x000000, 0.2); g.fillEllipse(2060, 472, 110, 16);
  g.fillStyle(0x5a4430, 1); g.fillRect(2008, 440, 6, 32); g.fillRect(2106, 440, 6, 32); g.fillRect(2004, 436, 112, 6);
  for (let i = 0; i < 3; i++) {
    const x = 2028 + i * 32;
    g.fillStyle(0xcbbf9f, 1); g.fillTriangle(x - 16, 470, x + 16, 470, x, 444);
    g.fillStyle(KITE_COLORS[i], 1); g.fillTriangle(x - 4, 452, x + 4, 452, x, 444);
  }
}, { kind: 'rect', x: 2004, y: 456, w: 112, h: 16 });

// ── Clouds and edges as walls ────────────────────────────────────────

// South-west Cloudbank (approximating the drop with rects inside its lip).
solids.push({ kind: 'rect', x: 0, y: 1206, w: 360, h: 494 });
solids.push({ kind: 'rect', x: 360, y: 1226, w: 160, h: 474 });
solids.push({ kind: 'rect', x: 520, y: 1270, w: 110, h: 430 });
solids.push({ kind: 'rect', x: 630, y: 1380, w: 80, h: 320 });
// North-east, past the Leap.
solids.push({ kind: 'rect', x: 2040, y: 0, w: 360, h: 130 });
solids.push({ kind: 'rect', x: 2140, y: 130, w: 260, h: 150 });
solids.push({ kind: 'rect', x: 2250, y: 280, w: 150, h: 100 });
// South-east cloud strip under the Kite Field.
solids.push({ kind: 'rect', x: 1810, y: 1640, w: 590, h: 60 });
// The gorge, open only at the two bridges.
{
  let y0 = GORGE.y;
  for (const by of BRIDGE_Y) {
    solids.push({ kind: 'rect', x: GORGE.x, y: y0, w: GORGE.w, h: by - BRIDGE_W / 2 - y0 });
    y0 = by + BRIDGE_W / 2;
  }
  solids.push({ kind: 'rect', x: GORGE.x, y: y0, w: GORGE.w, h: GORGE.y + GORGE.h - y0 });
  // The bridge hand-ropes keep you on the planks.
  for (const by of BRIDGE_Y) {
    solids.push({ kind: 'rect', x: GORGE.x, y: by - BRIDGE_W / 2 - 4, w: GORGE.w, h: 6 });
    solids.push({ kind: 'rect', x: GORGE.x, y: by + BRIDGE_W / 2 - 2, w: GORGE.w, h: 6 });
  }
}

// ── Painter ──────────────────────────────────────────────────────────

const inView = (x: number, y: number, v: Rect, m = 200): boolean =>
  x > v.x - m && x < v.x + v.w + m && y > v.y - m && y < v.y + v.h + m;

/** The pinned vanes all point at the toll — with a wobble that shows how hard they strain. */
const pinnedAngle = (v: Pt, t: number, i: number): number =>
  Math.atan2(BELLOWS.y - v.y, BELLOWS.x - v.x) + Math.sin(t * 3.1 + i * 1.7) * 0.06;

/** The toll-bellows breathe on a slow four-second rhythm. */
const bellowsOpen = (t: number): number => 0.5 + Math.sin(t * Math.PI / 2) * 0.5;

const painter: AreaPainter = {
  ground(g, rng) {
    const W = GALEWARD_W, H = GALEWARD_H;
    combedTurf(g, { x: 0, y: 0, w: W, h: H }, rng);
    // Darker turf under the spire, warmer on the open slope.
    g.fillStyle(TURF_DEEP, 0.25); g.fillRect(0, 0, W, 220);

    // The clouds: drops off the shoulder.
    cloudSea(g, SW_CLOUD, rng);
    cliffLip(g, SW_CLOUD.slice(0, 7), 1, rng);
    cloudSea(g, NE_CLOUD, rng);
    cliffLip(g, NE_CLOUD.slice(0, 5), -1, rng);
    cloudSea(g, SE_CLOUD, rng);
    cliffLip(g, SE_CLOUD.slice(0, 4), -1, rng);
    cloudSea(g, GORGE_POLY, rng);
    cliffLip(g, [GORGE_POLY[0], GORGE_POLY[6], GORGE_POLY[5]], -1, rng);
    cliffLip(g, [GORGE_POLY[1], GORGE_POLY[2], GORGE_POLY[3], GORGE_POLY[4]], 1, rng);

    // Lanes.
    flagLane(g, [{ x: STREET_X, y: H }, { x: STREET_X, y: SQUARE.y + SQ_RY - 10 }], 84, rng);
    flagLane(g, [{ x: STREET_X, y: SQUARE.y - SQ_RY + 10 }, { x: 1170, y: 480 }, { x: 1210, y: 260 }, { x: STREET_X, y: 0 }], 76, rng);
    flagLane(g, [{ x: 0, y: CROSS_Y }, { x: SQUARE.x - SQ_RX + 10, y: CROSS_Y }], 74, rng);
    flagLane(g, [{ x: SQUARE.x + SQ_RX - 10, y: CROSS_Y }, { x: W, y: CROSS_Y }], 74, rng);
    // Mill Row lane, the Grindstone path, the Weather House drive.
    flagLane(g, [{ x: 110, y: 455 }, { x: 900, y: 462 }, { x: 1168, y: 470 }], 56, rng);
    flagLane(g, [{ x: GRINDSTONE.x, y: 462 }, { x: GRINDSTONE.x, y: GRINDSTONE.y - 30 }], 50, rng);
    flagLane(g, [{ x: GRINDSTONE.x + 70, y: GRINDSTONE.y + 20 }, { x: GRINDSTONE.x + 70, y: CROSS_Y }], 44, rng);
    flagLane(g, [{ x: 1170, y: 480 }, { x: 1400, y: WEATHER_HOUSE.y + 40 }, { x: WEATHER_HOUSE.x + 40, y: WEATHER_HOUSE.y + 40 }], 62, rng);
    // Down to the Cloudbank and the bakery.
    flagLane(g, [{ x: 330, y: CROSS_Y }, { x: 330, y: 1060 }, { x: 300, y: 1140 }], 46, rng);
    flagLane(g, [{ x: STREET_X, y: 1150 }, { x: 960, y: 1176 }, { x: 760, y: 1180 }], 50, rng);
    // To the bridges and across the Kite Field.
    for (const by of BRIDGE_Y) {
      flagLane(g, [{ x: STREET_X, y: by }, { x: GORGE.x + 4, y: by }], 50, rng);
      flagLane(g, [{ x: GORGE.x + GORGE.w - 4, y: by }, { x: 2320, y: by }], 46, rng);
    }
    // Out to the Leap.
    flagLane(g, [{ x: 1880, y: CROSS_Y }, { x: 1980, y: 660 }, { x: 2140, y: 520 }], 50, rng);
    // A track worn to the Ropewalk.
    flagLane(g, [{ x: SQUARE.x + 100, y: SQUARE.y + 100 }, { x: ROPEWALK.x, y: ROPEWALK.y + 36 }], 40, rng);

    // Weathercock Square: rings of flags, a compass in brass let into the middle.
    g.fillStyle(TURF_DEEP, 0.6); g.fillEllipse(SQUARE.x, SQUARE.y, SQ_RX * 2 + 20, SQ_RY * 2 + 20);
    g.fillStyle(0x9b9586, 1); g.fillEllipse(SQUARE.x, SQUARE.y, SQ_RX * 2, SQ_RY * 2);
    for (let r = 1; r <= 6; r++) {
      g.lineStyle(2, r % 2 ? 0xc9c3b4 : 0xb3ad9e, 1);
      g.strokeEllipse(SQUARE.x, SQUARE.y, r * 62, r * 49);
    }
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      g.lineStyle(1, 0x8a8476, 0.6);
      g.lineBetween(SQUARE.x + Math.cos(a) * 40, SQUARE.y + Math.sin(a) * 32, SQUARE.x + Math.cos(a) * SQ_RX * 0.96, SQUARE.y + Math.sin(a) * SQ_RY * 0.96);
    }
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      g.fillStyle(i === 0 ? BRASS_LIT : BRASS, 0.75);
      g.fillTriangle(SQUARE.x + Math.cos(a - 0.12) * 44, SQUARE.y + Math.sin(a - 0.12) * 36, SQUARE.x + Math.cos(a + 0.12) * 44, SQUARE.y + Math.sin(a + 0.12) * 36, SQUARE.x + Math.cos(a) * (i % 2 ? 90 : 130), SQUARE.y + Math.sin(a) * (i % 2 ? 72 : 104));
    }

    // The bridges (flat, in the ground — you walk on them).
    for (const by of BRIDGE_Y) ropeBridge(g, { x: GORGE.x - 6, y: by }, { x: GORGE.x + GORGE.w + 6, y: by }, BRIDGE_W, rng);

    // The Kite Field: brighter turf, and the shadows of kites far above.
    g.fillStyle(lit(TURF_DARK, 0.3), 0.25); g.fillEllipse(2120, 1300, 560, 420);
    for (let i = 0; i < 160; i++) { g.fillStyle(0xf6f0d0, 0.5); g.fillCircle(1850 + rng() * 520, 1060 + rng() * 520, 1.3); }

    // The Leap: fissures, and the vent grates on them.
    g.lineStyle(5, 0x1e2230, 0.4);
    g.beginPath(); g.moveTo(1880, 620); for (const v of LEAP_VENTS) g.lineTo(v.x, v.y); g.lineTo(LEAP.x + 40, LEAP.y - 20); g.strokePath();
    for (const v of LEAP_VENTS) ventGrate(g, v.x, v.y, 26);

    // Flour blown east off the Grindstone; chaff along the lee of Mill Row.
    for (let i = 0; i < 80; i++) { g.fillStyle(0xf6f0e2, 0.25); g.fillEllipse(GRINDSTONE.x + 40 + rng() * 260, GRINDSTONE.y - 40 + rng() * 140, 14, 4); }
    for (let i = 0; i < 40; i++) { g.fillStyle(0xc2b77a, 0.3); g.fillEllipse(140 + rng() * 860, 470 + rng() * 40, 30, 5); }
    // The cobbled yard round the toll.
    g.fillStyle(FLAG, 0.6); g.fillEllipse(BELLOWS.x, BELLOWS.y + 20, 360, 110);
    for (let i = 0; i < 90; i++) { g.fillStyle(0x9b9586, 0.5); g.fillRoundedRect(BELLOWS.x - 170 + rng() * 340, BELLOWS.y - 20 + rng() * 80, 12, 8, 3); }
  },

  pieces,

  animate(g, t, view) {
    // Cloud tearing off every lip, drifting east.
    if (inView(300, 1200, view, 300)) cloudWisps(g, 40, 1220, 600, t, 9, 0.1);
    if (inView(1720, 1300, view, 300)) { cloudWisps(g, 1650, 1080, 140, t, 5, 0.3); cloudWisps(g, 1650, 1380, 140, t, 5, 0.7); }
    if (inView(2200, 200, view, 300)) cloudWisps(g, 2060, 60, 300, t, 6, 0.5);
    if (inView(2100, 1660, view, 300)) cloudWisps(g, 1820, 1650, 560, t, 7, 0.9);
    // The pinned vanes, straining at their pins toward the toll.
    VANES.forEach((v, i) => { if (inView(v.x, v.y, view)) weathervane(g, v.x, v.y, 70, pinnedAngle(v, t, i), 1); });
    // The town vane on the square's column: also pinned, trembling in the gale.
    if (inView(SQUARE.x, SQUARE.y, view, 300)) weathervane(g, SQUARE.x, SQUARE.y - 118, 24, pinnedAngle(SQUARE, t, 9), 2);
    // Windsocks along the west road.
    for (let x = 120; x < 1000; x += 170) if (inView(x, 800, view)) windsock(g, x, 806, t + x * 0.01, 0.85 + Math.sin(t * 0.7 + x) * 0.15, Math.sin(t * 0.9 + x) * 0.08);
    // The toll-bellows, breathing, and the meter's hush; the bottles glow.
    if (inView(BELLOWS.x, BELLOWS.y, view, 300)) {
      const o = bellowsOpen(t);
      bellowsBoards(g, BELLOWS.x, BELLOWS.y, 1, o);
      // Breath streaming in at the nozzle on the in-stroke.
      if (Math.cos(t * Math.PI / 2) > 0) {
        for (let i = 0; i < 5; i++) {
          const ph = (t * 1.4 + i / 5) % 1;
          g.fillStyle(0x9fe2ff, 0.4 * (1 - ph)); g.fillCircle(BELLOWS.x + (1 - ph) * 40 * Math.cos(i * 2), BELLOWS.y - 30 + (1 - ph) * 20, 3);
        }
      }
      breathGlow(g, RACK.x, RACK.y - 40, 60, 0.03 + Math.sin(t * 2) * 0.01);
      breathGlow(g, RACK.x + 10, RACK.y + 30, 50, 0.03 + Math.cos(t * 2) * 0.01);
    }
    // The Leap's vents breathing up.
    LEAP_VENTS.forEach((v, i) => { if (inView(v.x, v.y, view)) updraftShimmer(g, v.x, v.y, 26, t + i * 0.7, 0.6 + Math.sin(t * 0.8 + i * 2) * 0.4); });
    // Wind on the turf: streaks racing east everywhere in view.
    for (let i = 0; i < 18; i++) {
      const ph = (t * 0.5 + i * 0.173) % 1;
      const x = view.x + ph * (view.w + 200) - 100, y = view.y + ((i * 211) % 1000) / 1000 * view.h;
      windStreak(g, x, y, 40 + (i % 3) * 20, 0.22 * Math.sin(ph * Math.PI), 0.8);
    }
    // The ribbon pole on the Kite Field.
    if (inView(RIBBON.x, RIBBON.y, view)) ribbonPole(g, RIBBON.x, RIBBON.y, t);
  },

  animateOver(g, t, view) {
    // Sails, always turning — the town's whole skyline moves.
    for (const m of mills) {
      if (!inView(m.hub.x, m.hub.y, view, m.hub.r + 120)) continue;
      const gust = 1 + Math.max(0, Math.sin(t * 0.45 + m.phase)) * 0.6;
      sails(g, m.hub, m.phase + t * m.speed * gust, 0.55, CANVAS, m.big ? 0.8 : 0.7);
    }
    // The great weathercock on the Weather House cupola: pinned, like the rest, trembling.
    if (inView(COCK.x, COCK.y, view, 200)) {
      weathervane(g, COCK.x, COCK.y + 30, 30, pinnedAngle(COCK, t, 3), 2.2);
      // An anemometer on the house's ridge, cups spinning.
      const ax = WEATHER_HOUSE.x + 40, ay = WEATHER_HOUSE.y - 170 - 90;
      g.fillStyle(0x5d5c66, 1); g.fillRect(ax - 1.5, ay - 26, 3, 26);
      for (let i = 0; i < 3; i++) {
        const a = t * 7 + (i * Math.PI * 2) / 3;
        const cx = ax + Math.cos(a) * 14, cy = ay - 26 + Math.sin(a) * 4;
        g.lineStyle(1.5, 0x5d5c66, 1); g.lineBetween(ax, ay - 26, cx, cy);
        g.fillStyle(BRASS, 1); g.fillCircle(cx, cy, 3.5);
      }
      // Long pennants streaming east off the gables.
      for (const [px, py] of [[WEATHER_HOUSE.x + 156, WEATHER_HOUSE.y - 200], [WEATHER_HOUSE.x + 40, WEATHER_HOUSE.y - 290]] as [number, number][]) {
        g.fillStyle(ZEPHYR, 1);
        g.beginPath(); g.moveTo(px, py);
        for (let k = 1; k <= 6; k++) g.lineTo(px + k * 9, py + Math.sin(t * 8 - k) * 2.5 * (k / 6) + k * 0.5);
        for (let k = 6; k >= 1; k--) g.lineTo(px + k * 9, py + 8 - k * 1.1 + Math.sin(t * 8 - k) * 2.5 * (k / 6));
        g.lineTo(px, py + 9); g.closePath(); g.fillPath();
      }
    }
    // Kites over the Kite Field on their lines, streaming east above the drop.
    KITE_POSTS.forEach((p, i) => {
      if (!inView(p.x + 80, p.y - 120, view, 260)) return;
      const kx = p.x + 90 + Math.sin(t * 0.7 + i * 1.3) * 40, ky = p.y - 150 + Math.cos(t * 0.9 + i) * 26;
      g.lineStyle(1, ROPE, 0.8); g.lineBetween(p.x, p.y - 22, kx, ky);
      kite(g, kx, ky, 1.6, KITE_COLORS[i % 4], Math.atan2(ky - p.y, kx - p.x) + Math.sin(t * 2 + i) * 0.2, t + i);
    });
    // Children's kites over the town too — one over the square, one over Mill Row.
    for (const [px, py, c] of [[1260, 940, 1], [700, 520, 3]] as [number, number, number][]) {
      if (!inView(px, py - 200, view, 300)) continue;
      const kx = px + 120 + Math.sin(t * 0.6 + c) * 50, ky = py - 220 + Math.cos(t * 0.8) * 30;
      g.lineStyle(1, ROPE, 0.6); g.lineBetween(px, py - 20, kx, ky);
      kite(g, kx, ky, 1.4, KITE_COLORS[c], Math.atan2(ky - py, kx - px), t);
    }
    // Smoke off the Millstone's oven, leaning hard east.
    if (inView(BAKEHOUSE.x + 46, BAKEHOUSE.y - 150, view)) {
      for (let i = 0; i < 6; i++) {
        const ph = (t * 0.5 + i / 6) % 1;
        g.fillStyle(0xd8d8d8, 0.4 * (1 - ph)); g.fillCircle(BAKEHOUSE.x + 46 + ph * 140, BAKEHOUSE.y - 152 - ph * 30, 7 + ph * 14);
      }
    }
    // Flour off the Grindstone's door.
    if (inView(GRINDSTONE.x, GRINDSTONE.y, view)) {
      for (let i = 0; i < 8; i++) {
        const ph = (t * 0.35 + i / 8) % 1;
        g.fillStyle(0xf6f0e2, 0.45 * Math.sin(ph * Math.PI)); g.fillCircle(GRINDSTONE.x + 20 + ph * 200, GRINDSTONE.y - 30 - Math.sin(ph * 3 + i) * 14, 2 + ph * 3);
      }
    }
    // Gulls riding the updraft over the Leap and the Cloudbank.
    if (inView(2150, 360, view, 400)) for (let i = 0; i < 4; i++) gull(g, 2150 + Math.cos(t * 0.4 + i * 1.6) * 120, 340 + Math.sin(t * 0.5 + i) * 60, 1.2, t + i, 0.9);
    if (inView(300, 1300, view, 400)) for (let i = 0; i < 3; i++) gull(g, 300 + Math.cos(t * 0.3 + i * 2) * 160, 1330 + Math.sin(t * 0.4 + i) * 50, 1, t * 1.2 + i, 0.9);
    // A soft glow at the Weather House door.
    if (inView(WEATHER_HOUSE.x, WEATHER_HOUSE.y, view)) glow(g, WEATHER_HOUSE.x, WEATHER_HOUSE.y - 96, 36, BRASS_LIT, 0.03, 3);
  },
};

export const GALEWARD_AREA: AreaDef = {
  id: 'galeward',
  isle: 'air',
  court: 'galeward',
  name: 'The Galeward Court',
  subtitle: 'Every breath on the shoulder metered at the toll',
  w: GALEWARD_W,
  h: GALEWARD_H,
  bg: TURF_DARK,
  accent: GALEWARD_COLOR,
  weather: 'wind',
  spawn: { x: 1200, y: 1600 },
  painter,
  solids,
  exits: [
    { side: 's', to: 'windlass', label: 'Down Vane Street to Windlass' },
    { side: 'n', to: 'starfall', label: 'Up the spire road to Starfall' },
    { side: 'w', to: 'slumber', at: CROSS_Y, label: 'The west road to the Slumber Court' },
    { side: 'e', to: 'stormeye', at: CROSS_Y, label: 'The east road to the Stormeye Court' },
  ],
  pois: [
    { kind: 'waystone', at: { x: 1060, y: 1650 } },
    { kind: 'prince', id: 'zephyr', at: { x: WEATHER_HOUSE.x, y: WEATHER_HOUSE.y + 40 } },
    { kind: 'water', id: 'galeward-cloudbank', shape: CLOUDBANK, fishery: 'galeward-cloudbank' },
    { kind: 'encounter', id: 'galeward-crosswind' },
    { kind: 'encounter', id: 'galeward-kite-fight' },
    { kind: 'encounter', id: 'galeward-windmill' },
    { kind: 'encounter', id: 'galeward-breath-meter' },
    { kind: 'encounter', id: 'galeward-updraft' },
    {
      kind: 'sign', at: { x: 1300, y: 1670 },
      text: 'THE TOLL-BELLOWS. Every breath above the cloud line is the King\'s. Read your meter. Pay at the bellows.',
    },
    {
      kind: 'sign', at: { x: 820, y: 1500 },
      text: 'THE BECALMED. Debtors rest here at the Crown\'s pleasure. Their breath is held in trust. Do not wake.',
    },
    {
      kind: 'sign', at: { x: 1560, y: 1130 },
      text: 'THE GORGE BRIDGES. One crossing, one breath. Kites flown across the gorge are carriage, and taxed as such.',
    },
    {
      kind: 'sign', at: { x: 640, y: 470 },
      text: 'MILL ROW. Every turn of every sail is metered by the Weather House. Wind into the sails is wind owed.',
    },
    {
      kind: 'sign', at: { x: 1960, y: 700 },
      text: 'THE LEAP. Lift is the King\'s air. Gliders pay by the drop, in advance.',
    },
    { kind: 'chest', id: 'galeward-chest-cloudbank', at: { x: 110, y: 1140 }, coins: 90 },
    { kind: 'chest', id: 'galeward-chest-weather-house', at: { x: 1860, y: 420 }, orbs: 2, open: { prince: 'zephyr' } },
  ],
  npcs: GALEWARD_NPCS,
  crowd: GALEWARD_CROWD,
};
