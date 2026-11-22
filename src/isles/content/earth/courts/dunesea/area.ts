import type { AreaDef, AreaPainter, Pt, Rect, Solid } from '../../../../IslesTypes';
import { blob, dim, glow, groundFill, lit, motes, shadow, type G } from '../../../../art/IsleArt';
import {
  arcadeTops, brokenColumn, buriedDome, buriedTower, camel, caravanRoad, caravanserai, cliffFace, digPit, drift,
  duneRidge, jar, mosaicPatch, oasisPool, palace, palm, ripples, sandPile, sandShip, sandfall, shaduf, tent, watchTower,
  windSigil,
} from './art';
import {
  CANVAS, DUNESEA_COLOR, FLOW, FLOW_DARK, FLOW_LIT, HEAT, SAND, SAND_DARK, SAND_DEEP, SAND_LIT, SAND_PALE, STONE,
  STONE_DARK, STRIPE_INDIGO, STRIPE_RED, STRIPE_SAFFRON, TILE, TIMBER, TIMBER_DARK, WATER_LIT,
} from './palette';
import { DUNESEA_CROWD, DUNESEA_NPCS } from './npcs';
import { inView } from './util';

/**
 * The Dunesea Court — the mesa's rain-shadow, a sea of dunes over a buried city.
 *
 * Read it from the Quarrymouth road in (east):
 * • **the caravanserai** (north-east): the fortress inn every caravan to the Potter's Court stops
 *   at, Halima's stalls under the awnings along its wall; the waystone stands where the Quarrymouth
 *   road comes over the last dune;
 * • **the Crossing** (centre): the north road comes down the Potter's Stair — a gorge through the
 *   mesa cliff, sandfalls pouring off the rim either side — and meets the east road, where the
 *   Dust-Herald reads out the week's burials;
 * • **the buried city** (north-west): Old Hamra, swallowed by the dunes long before the Regent — its
 *   domes and its bell-tower just clear the sand, and the households dig their Tithe stone out of
 *   its streets in pits worked by shadufs. The great dome is the Drowned Library;
 * • **the Strand and the sand sea** (west-centre): a basin where the sand runs like water — the
 *   sand-ships moor along its north shore, and you fish it with a delver rod;
 * • **the oasis** (south-east), rationed, under its palms; the wind-watcher's tower beyond it;
 * • **the Sanded Camp** (south-west): the tents of households whose houses the Prince let the dune take;
 * • **the Palace of Winds** (south): Prince Sirocco's seat at the end of the south road, its
 *   windcatchers drinking the wind, the dune taking its west wing.
 */

export const DUNESEA_W = 2400;
export const DUNESEA_H = 1600;

/** The Crossing where the north, east and south roads meet. */
export const CROSSING: Pt = { x: 1200, y: 780 };
/** The sand sea — the court's fishing water. */
export const SAND_SEA: Rect = { x: 560, y: 980, w: 520, h: 230 };
/** The oasis pool. */
export const OASIS: Rect = { x: 1720, y: 1060, w: 300, h: 140 };
/** The caravanserai: its gate, on the base line. */
export const CARAVANSERAI: Pt = { x: 1820, y: 600 };
/** The Palace of Winds: the middle of its gate step. */
export const PALACE: Pt = { x: 1200, y: 1430 };
/** The Drowned Library — the great buried dome. */
export const LIBRARY: Pt = { x: 330, y: 470 };
/** The Hazims' dig-pit (Nadia's family) and the open dig by the tower. */
export const PIT_HAZIM: Rect = { x: 330, y: 860, w: 110, h: 80 };
export const PIT_OPEN: Rect = { x: 740, y: 640, w: 120, h: 84 };
/** The mooring post on the Strand where the Anchor-Master chains Ezra's ship. */
export const MOORING_POST: Pt = { x: 790, y: 900 };
/** The kite dune: where a boy once flew a kite the Regent buried. */
export const KITE_DUNE: Pt = { x: 1560, y: 1480 };
/** Qadira's wind-watch tower. */
export const WATCH_TOWER: Pt = { x: 2200, y: 1400 };

const SANDFALLS = [380, 760, 1640, 2040];
const CLIFF_Y = 130;

type Piece = NonNullable<AreaPainter['pieces']>[number];

const pieces: Piece[] = [];
const solids: Solid[] = [];

function addPiece(x: number, y: number, w: number, h: number, draw: (g: G, rng: () => number) => void, solid?: Solid): void {
  pieces.push({ x, y, w, h, draw });
  if (solid) solids.push(solid);
}

// ── Layout ───────────────────────────────────────────────────────────

// The mesa cliff along the north, split by the Potter's Stair.
solids.push({ kind: 'rect', x: 0, y: 0, w: 1110, h: 118 }, { kind: 'rect', x: 1290, y: 0, w: 1110, h: 118 });
// Sand piles under the falls.
for (const x of SANDFALLS) {
  addPiece(x, 186, 110, 60, (g, rng) => sandPile(g, x, 186, 1, rng), { kind: 'circle', x, y: 176, r: 34 });
}

// The caravanserai, its camel and its jars.
addPiece(CARAVANSERAI.x, CARAVANSERAI.y, 620, 260, (g, rng) => caravanserai(g, CARAVANSERAI.x, CARAVANSERAI.y, 500, 120, rng),
  { kind: 'rect', x: CARAVANSERAI.x - 280, y: CARAVANSERAI.y - 130, w: 560, h: 126 });
solids.push({ kind: 'circle', x: CARAVANSERAI.x + 100, y: CARAVANSERAI.y + 2, r: 16 });
// A string of camels couched by the road for the night.
for (const [x, y, d] of [[1520, 690, 1], [1460, 720, -1], [2140, 690, -1]] as [number, number, 1 | -1][]) {
  addPiece(x, y, 80, 60, (g) => camel(g, x, y, 1, d), { kind: 'circle', x, y: y - 6, r: 18 });
}

// The buried city: Old Hamra.
addPiece(LIBRARY.x, LIBRARY.y, 280, 260, (g, rng) => buriedDome(g, LIBRARY.x, LIBRARY.y, 90, rng, 0.5),
  { kind: 'rect', x: LIBRARY.x - 92, y: LIBRARY.y - 44, w: 184, h: 42 });
addPiece(660, 340, 180, 180, (g, rng) => buriedDome(g, 660, 340, 58, rng, 0.8), { kind: 'rect', x: 600, y: 312, w: 120, h: 26 });
addPiece(560, 620, 120, 260, (g, rng) => buriedTower(g, 560, 620, 130, rng), { kind: 'circle', x: 560, y: 612, r: 22 });
addPiece(250, 760, 230, 80, (g, rng) => arcadeTops(g, 250, 760, 4, 46, rng), { kind: 'rect', x: 156, y: 734, w: 188, h: 24 });
for (const [x, y, h] of [[720, 520, 46], [840, 600, 30], [160, 610, 54], [460, 1010, 26], [980, 470, 38]] as [number, number, number][]) {
  addPiece(x, y, 70, h + 20, (g, rng) => brokenColumn(g, x, y, h, rng), { kind: 'circle', x, y: y - 4, r: 12 });
}
// The dig-pits and their shadufs.
solids.push({ kind: 'rect', x: PIT_HAZIM.x - 6, y: PIT_HAZIM.y - 6, w: PIT_HAZIM.w + 12, h: PIT_HAZIM.h + 12 });
solids.push({ kind: 'rect', x: PIT_OPEN.x - 6, y: PIT_OPEN.y - 6, w: PIT_OPEN.w + 12, h: PIT_OPEN.h + 12 });
addPiece(470, 930, 160, 120, (g, rng) => shaduf(g, 470, 930, -1, rng), { kind: 'circle', x: 470, y: 926, r: 10 });
addPiece(720, 640, 160, 120, (g, rng) => shaduf(g, 720, 640, 1, rng), { kind: 'circle', x: 720, y: 636, r: 10 });
// Cut blocks waiting at the Hazims' pit for the ship.
addPiece(300, 960, 60, 30, (g) => {
  for (let i = 0; i < 4; i++) {
    const bx = 284 + (i % 2) * 18, by = 962 - Math.floor(i / 2) * 9;
    g.fillStyle(STONE_DARK, 1); g.fillRect(bx, by - 9, 17, 10);
    g.fillStyle(STONE, 1); g.fillRect(bx, by - 10, 17, 4);
  }
}, { kind: 'rect', x: 282, y: 944, w: 38, h: 18 });

// The Strand: sand-ships moored along the sand sea's north shore.
addPiece(680, 952, 200, 190, (g) => sandShip(g, 680, 952, 0.9, 1, { furled: true, stripe: STRIPE_INDIGO }), { kind: 'rect', x: 604, y: 930, w: 156, h: 20 });
addPiece(980, 952, 200, 190, (g) => sandShip(g, 980, 952, 0.9, -1, { furled: true, stripe: STRIPE_RED }), { kind: 'rect', x: 904, y: 930, w: 156, h: 20 });
// The mooring post (iron-banded, chained).
addPiece(MOORING_POST.x, MOORING_POST.y - 30, 30, 50, (g) => {
  const x = MOORING_POST.x, y = MOORING_POST.y - 30;
  shadow(g, x, y + 1, 18, 6, 0.3);
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 5, y - 30, 10, 30);
  g.fillStyle(TIMBER, 1); g.fillRect(x - 4, y - 30, 6, 30);
  g.fillStyle(0x4a4a50, 1); g.fillRect(x - 6, y - 24, 12, 3); g.fillRect(x - 6, y - 10, 12, 3);
  g.lineStyle(2, 0x5a5a60, 1);
  for (let i = 0; i < 5; i++) g.strokeEllipse(x + 8 + i * 7, y - 14 + i * 4, 7, 4);
}, { kind: 'circle', x: MOORING_POST.x, y: MOORING_POST.y - 32, r: 8 });
// Ezra's ship on the stocks by the south road.
addPiece(1380, 980, 220, 210, (g) => {
  // Trestles under the runners.
  for (const k of [-60, -10, 40]) {
    g.fillStyle(TIMBER_DARK, 1); g.fillRect(1380 + k - 8, 966, 4, 16); g.fillRect(1380 + k + 6, 966, 4, 16);
    g.fillStyle(TIMBER, 1); g.fillRect(1380 + k - 10, 962, 24, 5);
  }
  sandShip(g, 1380, 966, 0.95, 1, { sail: CANVAS, stripe: STRIPE_SAFFRON, furled: true });
  // Planks and a pot of pitch.
  g.fillStyle(TIMBER, 1); g.fillRect(1280, 990, 60, 5); g.fillRect(1290, 996, 54, 5);
  g.fillStyle(0x2a2420, 1); g.fillEllipse(1470, 992, 18, 10); g.fillStyle(0x0e0a08, 1); g.fillEllipse(1470, 989, 14, 5);
}, { kind: 'rect', x: 1300, y: 954, w: 164, h: 30 });

// The oasis palms.
for (const [x, y, s, lean] of [[1690, 1120, 1.05, -0.4], [2060, 1080, 0.95, 0.5], [1800, 1236, 0.9, -0.2], [1990, 1244, 1.1, 0.3], [2090, 1190, 0.8, 0.6], [1740, 1030, 0.85, -0.1]] as [number, number, number, number][]) {
  addPiece(x, y, 160, 160, (g, rng) => palm(g, x, y, s, lean, rng), { kind: 'circle', x, y: y - 3, r: 10 });
}
solids.push({ kind: 'rect', x: OASIS.x - 10, y: OASIS.y - 10, w: OASIS.w + 20, h: OASIS.h + 20 });
// Water jars at the oasis's rationing post.
addPiece(1660, 1200, 70, 40, (g) => { for (let i = 0; i < 3; i++) jar(g, 1646 + i * 14, 1202 - (i % 2) * 3, 1, i === 1 ? TILE : 0xb8643a); },
  { kind: 'rect', x: 1636, y: 1188, w: 42, h: 14 });

// The Palace of Winds.
addPiece(PALACE.x, PALACE.y, 720, 360, (g, rng) => palace(g, PALACE.x, PALACE.y, 560, 130, rng),
  { kind: 'rect', x: PALACE.x - 282, y: PALACE.y - 132, w: 564, h: 124 });

// The Sanded Camp.
const TENTS: [number, number, number, number, number][] = [
  [260, 1320, 120, STRIPE_RED, 0], [480, 1360, 110, STRIPE_SAFFRON, 0], [300, 1510, 130, STRIPE_INDIGO, 0], [690, 1350, 100, STRIPE_RED, 1.1],
];
for (const [x, y, w, band, sanded] of TENTS) {
  addPiece(x, y, w + 40, 80, (g, rng) => tent(g, x, y, w, band, rng, sanded), { kind: 'rect', x: x - w / 2, y: y - 22, w, h: 20 });
}
// The camp's fire-ring and its coffee.
addPiece(400, 1440, 50, 30, (g) => {
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; g.fillStyle(STONE_DARK, 1); g.fillCircle(400 + Math.cos(a) * 14, 1440 + Math.sin(a) * 6, 4); }
  g.fillStyle(0x2a1a10, 1); g.fillEllipse(400, 1440, 18, 7);
});

// The wind-watch tower.
addPiece(WATCH_TOWER.x, WATCH_TOWER.y, 120, 220, (g, rng) => watchTower(g, WATCH_TOWER.x, WATCH_TOWER.y, rng),
  { kind: 'rect', x: WATCH_TOWER.x - 22, y: WATCH_TOWER.y - 20, w: 44, h: 18 });

// The kite dune: a child's kite frame poking out of the crest, its tail still in the wind.
addPiece(KITE_DUNE.x, KITE_DUNE.y - 30, 90, 80, (g, rng) => {
  const x = KITE_DUNE.x, y = KITE_DUNE.y - 30;
  drift(g, x, y + 4, 120, 22, rng, true);
  g.lineStyle(2, TIMBER_DARK, 1); g.lineBetween(x - 4, y, x + 10, y - 40); g.lineBetween(x - 14, y - 22, x + 18, y - 14);
  g.fillStyle(STRIPE_SAFFRON, 0.85); g.fillTriangle(x + 10, y - 40, x - 14, y - 22, x - 2, y - 6);
  g.fillStyle(STRIPE_RED, 0.75); g.fillTriangle(x + 10, y - 40, x + 18, y - 14, x - 2, y - 6);
  windSigil(g, x + 3, y - 22, 5, STRIPE_INDIGO, 0.8);
}, { kind: 'circle', x: KITE_DUNE.x, y: KITE_DUNE.y - 32, r: 10 });

// Waystone dressing: a cairn of the old city's stones, one carved, at the Quarrymouth road.
addPiece(2290, 905, 40, 40, (g) => {
  for (let i = 0; i < 4; i++) { g.fillStyle(i % 2 ? STONE : STONE_DARK, 1); g.fillRoundedRect(2278 + (i % 2) * 6, 900 - i * 8, 22 - i * 3, 9, 3); }
}, { kind: 'circle', x: 2290, y: 896, r: 12 });

// ── Painter ──────────────────────────────────────────────────────────

/** Sand-sea flow streaks, fixed; animated in `animate`. */
const FLOW_LINES = Array.from({ length: 18 }, (_, i) => ({ y: SAND_SEA.y + 26 + ((i * 53) % (SAND_SEA.h - 52)), ph: (i * 0.37) % 1, len: 40 + ((i * 29) % 50) }));
/** Where heat-shimmer stands over open sand. */
const SHIMMERS: Pt[] = [{ x: 1500, y: 1180 }, { x: 1700, y: 880 }, { x: 900, y: 1320 }, { x: 2160, y: 1240 }, { x: 1040, y: 640 }];

const painter: AreaPainter = {
  ground(g, rng) {
    const W = DUNESEA_W, H = DUNESEA_H;
    groundFill(g, { x: 0, y: 0, w: W, h: H }, SAND, SAND_LIT, SAND_DEEP, rng, 0.9);
    // Long dune ridges across the open sand, crests running north-east.
    const ridges: Pt[][] = [
      [{ x: 1300, y: 1180 }, { x: 1420, y: 1130 }, { x: 1560, y: 1110 }, { x: 1660, y: 1060 }],
      [{ x: 1400, y: 900 }, { x: 1520, y: 870 }, { x: 1640, y: 880 }],
      [{ x: 860, y: 1300 }, { x: 960, y: 1270 }, { x: 1060, y: 1300 }],
      [{ x: 1500, y: 1400 }, { x: 1620, y: 1440 }, { x: 1780, y: 1400 }, { x: 1900, y: 1420 }],
      [{ x: 2140, y: 1100 }, { x: 2260, y: 1060 }, { x: 2380, y: 1080 }],
      [{ x: 900, y: 560 }, { x: 1020, y: 520 }, { x: 1100, y: 540 }],
      [{ x: 1900, y: 940 }, { x: 2040, y: 900 }, { x: 2180, y: 940 }],
      [{ x: 40, y: 1120 }, { x: 160, y: 1080 }, { x: 260, y: 1100 }],
    ];
    for (const r of ridges) duneRidge(g, r, 40, rng);
    ripples(g, { x: 0, y: 140, w: W, h: H - 140 }, rng, 1.1);

    // The cliff and the Potter's Stair cut through it.
    cliffFace(g, 0, 1110, CLIFF_Y, CLIFF_Y + 10, rng);
    cliffFace(g, 1290, W, CLIFF_Y, CLIFF_Y + 10, rng);
    g.fillStyle(SAND_DARK, 1); g.fillRect(1110, 0, 180, CLIFF_Y);
    for (let y = 6; y < CLIFF_Y; y += 14) {
      g.fillStyle(STONE_DARK, 1); g.fillRect(1146, y + 4, 108, 6);
      g.fillStyle(STONE, 1); g.fillRect(1146, y, 108, 6);
    }
    g.fillStyle(dim(SAND_DEEP, 0.2), 0.6); g.fillRect(1110, 0, 30, CLIFF_Y); g.fillRect(1260, 0, 30, CLIFF_Y);

    // Roads.
    caravanRoad(g, [{ x: 1200, y: CLIFF_Y }, { x: 1190, y: 420 }, { x: 1180, y: 600 }, CROSSING], 64, rng);
    caravanRoad(g, [{ x: W, y: 800 }, { x: 2100, y: 790 }, { x: 1700, y: 760 }, { x: 1400, y: 770 }, CROSSING], 70, rng);
    caravanRoad(g, [CROSSING, { x: 1220, y: 1050 }, { x: 1200, y: 1300 }], 70, rng);
    caravanRoad(g, [CROSSING, { x: 980, y: 820 }, { x: 720, y: 880 }, { x: 520, y: 900 }, { x: 500, y: 1240 }, { x: 420, y: 1420 }], 46, rng);
    caravanRoad(g, [{ x: 980, y: 820 }, { x: 900, y: 700 }, { x: 600, y: 560 }, { x: 400, y: 540 }], 40, rng);

    // The buried city's mosaic floors, swept bare in patches.
    mosaicPatch(g, 480, 470, 70, 34, rng);
    mosaicPatch(g, 680, 780, 50, 22, rng);
    mosaicPatch(g, 250, 640, 46, 20, rng);
    mosaicPatch(g, 1060, 1360, 60, 24, rng);
    // Wall-tops of buried houses: lines of stone in the sand.
    for (const [x, y, w] of [[140, 380, 120], [820, 400, 90], [380, 1110, 80], [880, 680, 70], [130, 900, 100]] as [number, number, number][]) {
      g.fillStyle(STONE_DARK, 0.9); g.fillRect(x, y + 2, w, 7);
      g.fillStyle(STONE, 1); g.fillRect(x, y, w, 6);
      g.fillStyle(SAND, 1); g.fillEllipse(x + w * 0.3, y + 2, w * 0.4, 8);
    }
    digPit(g, PIT_HAZIM, rng);
    digPit(g, PIT_OPEN, rng);

    // The sand sea: a basin where the sand flows, its shore of hard-packed crust.
    const sx = SAND_SEA.x, sy = SAND_SEA.y, sw = SAND_SEA.w, sh = SAND_SEA.h;
    blob(g, sx + sw / 2, sy + sh / 2, sw / 2 + 40, sh / 2 + 30, SAND_DEEP, 0.5, rng, 14);
    g.fillStyle(FLOW_DARK, 1); g.fillRoundedRect(sx, sy, sw, sh, 60);
    g.fillStyle(FLOW, 1); g.fillRoundedRect(sx + 8, sy + 6, sw - 16, sh - 14, 54);
    for (let i = 0; i < 40; i++) {
      const y = sy + 20 + rng() * (sh - 40), x = sx + 30 + rng() * (sw - 60);
      g.lineStyle(1.5, i % 2 ? FLOW_LIT : FLOW_DARK, 0.5);
      g.beginPath(); g.arc(x, y, 14 + rng() * 26, Math.PI * 1.1, Math.PI * 1.9, false); g.strokePath();
    }
    // A wreck's ribs sticking out of the flow.
    for (let k = 0; k < 6; k++) { g.lineStyle(4, dim(TIMBER, 0.4), 1); g.lineBetween(sx + 380 + k * 14, sy + 170, sx + 376 + k * 16, sy + 140 - Math.sin(k / 5 * Math.PI) * 18); }
    // The Strand's boardwalk.
    for (let x = sx - 10; x < sx + sw + 10; x += 16) {
      g.fillStyle(TIMBER_DARK, 1); g.fillRect(x, sy - 30, 15, 22);
      g.fillStyle(TIMBER, 1); g.fillRect(x, sy - 30, 14, 19);
    }

    // The oasis.
    oasisPool(g, OASIS, rng);
    // Its green margin.
    for (let i = 0; i < 40; i++) {
      const a = rng() * Math.PI * 2;
      const x = OASIS.x + OASIS.w / 2 + Math.cos(a) * (OASIS.w * 0.6 + rng() * 40), y = OASIS.y + OASIS.h / 2 + Math.sin(a) * (OASIS.h * 0.6 + rng() * 30);
      g.fillStyle(0x6a8a3a, 0.5); g.fillEllipse(x, y, 12 + rng() * 10, 5);
    }

    // The palace forecourt: a strip of old paving kept swept, tiles inset.
    g.fillStyle(STONE_DARK, 1); g.fillRect(PALACE.x - 180, PALACE.y, 360, 70);
    for (let x = PALACE.x - 178; x < PALACE.x + 178; x += 20) {
      for (let y = PALACE.y + 2; y < PALACE.y + 68; y += 20) {
        g.fillStyle(((x + y) / 20) % 2 ? STONE : lit(STONE, 0.15), 1); g.fillRect(x, y, 19, 19);
      }
    }
    for (let x = PALACE.x - 170; x < PALACE.x + 170; x += 40) { g.fillStyle(TILE, 0.8); g.fillRect(x + 8, PALACE.y + 28, 4, 4); }
    // The camp's rugs and the scorched ring.
    for (const [x, y, c] of [[340, 1400, STRIPE_RED], [540, 1430, STRIPE_INDIGO]] as [number, number, number][]) {
      g.fillStyle(c, 0.9); g.fillRect(x - 30, y - 12, 60, 24);
      g.fillStyle(STRIPE_SAFFRON, 0.8); g.fillRect(x - 26, y - 8, 52, 3); g.fillRect(x - 26, y + 5, 52, 3);
    }
  },

  pieces,

  animate(g, t, view) {
    // The sandfalls.
    for (const x of SANDFALLS) if (inView(x, 100, view, 120)) sandfall(g, x, 40, 172, 30, t);
    // The sand sea flows west to east, streaks riding it.
    if (inView(SAND_SEA.x + SAND_SEA.w / 2, SAND_SEA.y + SAND_SEA.h / 2, view, 320)) {
      for (const f of FLOW_LINES) {
        const ph = (t * 0.08 + f.ph) % 1;
        const x = SAND_SEA.x + 40 + ph * (SAND_SEA.w - 80 - f.len);
        g.lineStyle(1.6, FLOW_LIT, 0.5 * Math.sin(ph * Math.PI));
        g.lineBetween(x, f.y + Math.sin(t + f.ph * 6) * 3, x + f.len, f.y + Math.sin(t + f.ph * 6 + 1) * 3);
      }
      // A swirl where something under the sand turns.
      const cx = SAND_SEA.x + SAND_SEA.w * 0.35 + Math.cos(t * 0.3) * 90, cy = SAND_SEA.y + SAND_SEA.h * 0.5 + Math.sin(t * 0.3) * 40;
      for (let k = 0; k < 3; k++) { g.lineStyle(1.4, FLOW_DARK, 0.5); g.beginPath(); g.arc(cx, cy, 10 + k * 8, t * 2 + k, t * 2 + k + 2.4, false); g.strokePath(); }
    }
    // The oasis surface.
    if (inView(OASIS.x + OASIS.w / 2, OASIS.y + OASIS.h / 2, view, 260)) {
      for (let i = 0; i < 4; i++) {
        const ph = (t * 0.3 + i / 4) % 1;
        const cx = OASIS.x + 60 + ((i * 89) % (OASIS.w - 120)), cy = OASIS.y + 40 + ((i * 47) % (OASIS.h - 80));
        g.lineStyle(1.2, WATER_LIT, 0.5 * (1 - ph)); g.strokeEllipse(cx, cy, 8 + ph * 40, 3 + ph * 12);
      }
      const gx = OASIS.x + OASIS.w * 0.3 + Math.sin(t * 0.4) * 40;
      g.fillStyle(0xffffff, 0.12); g.fillEllipse(gx, OASIS.y + OASIS.h * 0.35, 60, 8);
    }
    // Lamps lit in the caravanserai gate and the palace gate.
    if (inView(CARAVANSERAI.x, CARAVANSERAI.y - 80, view, 300)) glow(g, CARAVANSERAI.x, CARAVANSERAI.y - 60, 30, 0xffc070, 0.04 + Math.sin(t * 3) * 0.01, 3);
    if (inView(PALACE.x, PALACE.y - 60, view, 300)) glow(g, PALACE.x, PALACE.y - 40, 34, 0xffd090, 0.035 + Math.sin(t * 2.4) * 0.01, 3);
  },

  animateOver(g, t, view) {
    // Heat shimmer standing over open sand: wavering horizontal bands.
    for (const s of SHIMMERS) {
      if (!inView(s.x, s.y, view, 140)) continue;
      for (let k = 0; k < 5; k++) {
        const y = s.y - k * 7;
        g.lineStyle(2, HEAT, 0.06 + 0.03 * Math.sin(t * 3 + k));
        g.beginPath();
        for (let i = 0; i <= 8; i++) { const x = s.x - 70 + i * 17.5; const yy = y + Math.sin(t * 4 + i * 0.9 + k) * 2; if (i === 0) g.moveTo(x, yy); else g.lineTo(x, yy); }
        g.strokePath();
      }
    }
    // Grains streaming off the crests in the wind.
    motes(g, view, t, 26, SAND_PALE, -4, 40, 1.4, 7);
    // Spray at the foot of each sandfall.
    for (const x of SANDFALLS) {
      if (!inView(x, 170, view, 120)) continue;
      for (let i = 0; i < 6; i++) {
        const ph = (t * 1.2 + i / 6) % 1;
        g.fillStyle(SAND_LIT, 0.35 * (1 - ph)); g.fillCircle(x + Math.cos(i * 2.3) * ph * 40, 168 - ph * 20, 2 + ph * 3);
      }
    }
  },
};

export const DUNESEA_AREA: AreaDef = {
  id: 'dunesea',
  isle: 'earth',
  court: 'dunesea',
  name: 'The Dunesea Court',
  subtitle: 'Where the wind sets down everything it carries',
  w: DUNESEA_W,
  h: DUNESEA_H,
  bg: SAND_DEEP,
  accent: DUNESEA_COLOR,
  weather: 'dust',
  spawn: { x: 2260, y: 800 },
  painter,
  solids,
  exits: [
    { side: 'n', to: 'potter', label: 'Up the Potter\'s Stair to the Potter\'s Court' },
    { side: 'e', to: 'quarrymouth', label: 'The caravan road to Quarrymouth' },
  ],
  pois: [
    { kind: 'waystone', at: { x: 2230, y: 900 } },
    { kind: 'prince', id: 'sirocco', at: { x: PALACE.x, y: PALACE.y + 46 } },
    { kind: 'water', id: 'dunesea-sands', shape: SAND_SEA, fishery: 'dunesea-sands' },
    { kind: 'encounter', id: 'dunesea-sand-ships' },
    { kind: 'encounter', id: 'dunesea-sandworm' },
    { kind: 'encounter', id: 'dunesea-mirage' },
    { kind: 'encounter', id: 'dunesea-quicksand' },
    { kind: 'encounter', id: 'dunesea-buried-treasure' },
    {
      kind: 'sign', at: { x: 2170, y: 730 },
      text: 'THE DUNESEA. Each household its pit, each pit its weight, shipped to the Scales at the season\'s turn.',
    },
    {
      kind: 'sign', at: { x: 600, y: 860 },
      text: 'THE DIGS OF OLD HAMRA. Stone dug here is the Regent\'s. A pit the dune takes is a pit forfeit.',
    },
    {
      kind: 'sign', at: { x: 1300, y: 1490 },
      text: 'THE PALACE OF WINDS. His Highness goes where he likes. So does the sand. Do not stand in either\'s way.',
    },
    {
      kind: 'sign', at: { x: 1160, y: 180 },
      text: 'THE POTTER\'S STAIR. Mind the falls. What comes down the cliff does not stop for you.',
    },
    { kind: 'chest', id: 'dunesea-chest-wreck', at: { x: 2330, y: 1540 }, coins: 90 },
    { kind: 'chest', id: 'dunesea-chest-library', at: { x: 120, y: 470 }, orbs: 2, open: { prince: 'sirocco' } },
  ],
  npcs: DUNESEA_NPCS,
  crowd: DUNESEA_CROWD,
};
