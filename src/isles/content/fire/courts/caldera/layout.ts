import type { Pt, Rect, Solid } from '../../../../IslesTypes';
import { samplePolyline } from './palette';

/**
 * Where everything in the crater stands. The painter, the solids and the NPC/POI placement all
 * read these numbers so a moved building moves its collision with it.
 *
 *            rim ── [KILN DOOR] ── rim            high vents
 *   Basalt's keep          |        slagrun river ╲   (Surtr)
 *   (cliff)   Grandmother vent  |        bridge ── ╲
 *   quarry face            |                    LAVA LAKE (Ferro's jetty)
 *   (Rhyo)        Tull ────┤────────── jetty road
 *   ═══ west bridge ═══ river ══ main bridge ══════╯ (Lavra on the south shore)
 *   forge camp (Scoria, Pell, Joss, Wren)  |   column field  (Hekla)
 *                                    s→hearth
 */

export const W = 2400;
export const H = 1800;

export const KILN_DOOR = { x: 1200, y: 330 };

/** The Slagrun: runs out of a sluice beside the Kiln door down into the lake. */
export const RIVER_A: Pt[] = [
  { x: 1640, y: 120 }, { x: 1625, y: 290 }, { x: 1660, y: 420 }, { x: 1740, y: 545 }, { x: 1840, y: 650 }, { x: 1900, y: 700 },
];
/** The Crustrun: drains the lake west across the whole crater floor. */
export const RIVER_B: Pt[] = [
  { x: 1830, y: 1060 }, { x: 1640, y: 1120 }, { x: 1440, y: 1110 }, { x: 1200, y: 1090 }, { x: 960, y: 1140 },
  { x: 720, y: 1185 }, { x: 520, y: 1185 }, { x: 300, y: 1160 }, { x: 120, y: 1200 }, { x: -20, y: 1220 },
];

/** Crust bridges: centre, and the angle of the road that crosses them. */
export const BRIDGES: { x: number; y: number; a: number }[] = [
  { x: 1200, y: 1090, a: Math.PI / 2 },
  { x: 520, y: 1185, a: Math.PI / 2 - 0.15 },
  { x: 1660, y: 420, a: -0.2 },
];

export const LAKE: Rect = { x: 1760, y: 640, w: 480, h: 480 };

export const ROADS: { pts: Pt[]; w: number }[] = [
  // The processional: crater gate to the Kiln door.
  { pts: [{ x: 1200, y: 1800 }, { x: 1200, y: 1560 }, { x: 1190, y: 1340 }, { x: 1200, y: 1090 }, { x: 1220, y: 860 }, { x: 1200, y: 640 }, { x: 1200, y: 370 }], w: 58 },
  // Forge camp.
  { pts: [{ x: 1195, y: 1460 }, { x: 980, y: 1480 }, { x: 760, y: 1480 }, { x: 560, y: 1470 }, { x: 400, y: 1450 }], w: 44 },
  // Camp → west bridge → quarry.
  { pts: [{ x: 560, y: 1470 }, { x: 545, y: 1300 }, { x: 520, y: 1185 }, { x: 470, y: 1060 }, { x: 380, y: 990 }], w: 40 },
  // Keep road.
  { pts: [{ x: 1200, y: 640 }, { x: 980, y: 600 }, { x: 760, y: 560 }, { x: 600, y: 535 }], w: 44 },
  // Quarry north road (past Tull).
  { pts: [{ x: 1215, y: 860 }, { x: 1000, y: 880 }, { x: 800, y: 900 }, { x: 560, y: 980 }], w: 38 },
  // Jetty road.
  { pts: [{ x: 1220, y: 860 }, { x: 1450, y: 880 }, { x: 1660, y: 900 }, { x: 1760, y: 905 }], w: 38 },
  // North-east: over the Slagrun bridge to the high vents.
  { pts: [{ x: 1200, y: 470 }, { x: 1420, y: 470 }, { x: 1660, y: 420 }, { x: 1780, y: 400 }, { x: 1900, y: 430 }], w: 38 },
  // South-east: through the column field to the lake's south shore.
  { pts: [{ x: 1195, y: 1500 }, { x: 1450, y: 1480 }, { x: 1680, y: 1380 }, { x: 1880, y: 1300 }], w: 38 },
];

export const KEEP = { x: 560, y: 470 };
export const QUARRY_FACE = { x: 230, y: 860 };

export const VENTS: { x: number; y: number; s: number }[] = [
  { x: 1780, y: 280, s: 1 }, { x: 1990, y: 320, s: 1.25 }, { x: 2140, y: 210, s: 0.9 },
  { x: 930, y: 500, s: 1.4 }, // the Grandmother vent
  { x: 1330, y: 740, s: 0.7 },
];

/** Basalt column clusters: centre and a size. */
export const COLUMNS: { x: number; y: number; s: number }[] = [
  { x: 1430, y: 1300, s: 1 }, { x: 1600, y: 1600, s: 1.2 }, { x: 1990, y: 1530, s: 1.1 }, { x: 2190, y: 1370, s: 0.9 },
  { x: 2230, y: 1640, s: 1.3 }, { x: 1810, y: 1690, s: 0.8 }, { x: 1500, y: 1720, s: 0.7 }, { x: 860, y: 1720, s: 0.8 },
  { x: 990, y: 720, s: 0.9 }, { x: 720, y: 730, s: 0.8 }, { x: 2230, y: 560, s: 1 }, { x: 2270, y: 290, s: 0.9 },
  { x: 160, y: 1460, s: 0.9 }, { x: 260, y: 1680, s: 1.1 },
];

/** Forge camp structures. */
export const CAMP = {
  stall: { x: 690, y: 1420 },
  forge: { x: 850, y: 1545 },
  trough: { x: 990, y: 1600 },
  tower: { x: 770, y: 1320 },
  board: { x: 840, y: 1330 },
  tents: [{ x: 350, y: 1560 }, { x: 500, y: 1630 }, { x: 1050, y: 1700 }, { x: 330, y: 1350 }],
  stacks: [{ x: 430, y: 1290 }, { x: 990, y: 1380 }, { x: 640, y: 1290 }],
  cart: { x: 600, y: 1345 },
};

export const STATUES: Pt[] = [{ x: 880, y: 330 }, { x: 1520, y: 330 }];
export const BRAZIERS: Pt[] = [{ x: 1030, y: 420 }, { x: 1370, y: 420 }];

const near = (p: Pt, q: Pt, r: number): boolean => Math.hypot(p.x - q.x, p.y - q.y) < r;

function riverSolids(pts: Pt[]): Solid[] {
  return samplePolyline(pts, 28)
    .filter((p) => !BRIDGES.some((b) => near(p, b, 78)))
    .filter((p) => p.x > 0 && p.x < W)
    .map((p) => ({ kind: 'circle' as const, x: p.x, y: p.y, r: 27 }));
}

export const SOLIDS: Solid[] = [
  // Crater rim (leaving the south gate strip 1130–1270 open).
  { kind: 'rect', x: 0, y: 0, w: W, h: 140 },
  { kind: 'rect', x: 0, y: 0, w: 60, h: H },
  { kind: 'rect', x: W - 60, y: 0, w: 60, h: H },
  { kind: 'rect', x: 0, y: H - 50, w: 1120, h: 50 },
  { kind: 'rect', x: 1280, y: H - 50, w: W - 1280, h: 50 },
  // The Kiln door's buttress, with the King's statues on its shoulders.
  { kind: 'rect', x: 960, y: 0, w: 480, h: 322 },
  { kind: 'circle', x: STATUES[0].x, y: STATUES[0].y - 10, r: 44 },
  { kind: 'circle', x: STATUES[1].x, y: STATUES[1].y - 10, r: 44 },
  ...BRAZIERS.map((b) => ({ kind: 'circle' as const, x: b.x, y: b.y - 4, r: 18 })),
  // Basalt's keep, cut into the north-west cliff, and the quarry face below it.
  { kind: 'rect', x: 300, y: 140, w: 520, h: 330 },
  { kind: 'rect', x: 60, y: 140, w: 240, h: 720 },
  { kind: 'rect', x: 300, y: 470, w: 120, h: 390 },
  // The lava lake.
  { kind: 'rect', x: LAKE.x + 30, y: LAKE.y + 25, w: LAKE.w - 55, h: LAKE.h - 50 },
  ...riverSolids(RIVER_A),
  ...riverSolids(RIVER_B),
  ...VENTS.map((v) => ({ kind: 'circle' as const, x: v.x, y: v.y, r: 26 * v.s })),
  ...COLUMNS.map((c) => ({ kind: 'circle' as const, x: c.x, y: c.y, r: 40 * c.s })),
  // Camp.
  { kind: 'rect', x: CAMP.stall.x - 72, y: CAMP.stall.y - 30, w: 144, h: 32 },
  { kind: 'rect', x: CAMP.forge.x - 58, y: CAMP.forge.y - 30, w: 116, h: 32 },
  { kind: 'rect', x: CAMP.trough.x - 40, y: CAMP.trough.y - 14, w: 80, h: 16 },
  { kind: 'circle', x: CAMP.tower.x, y: CAMP.tower.y - 6, r: 24 },
  { kind: 'rect', x: CAMP.board.x - 26, y: CAMP.board.y - 8, w: 52, h: 10 },
  ...CAMP.tents.map((t) => ({ kind: 'rect' as const, x: t.x - 48, y: t.y - 26, w: 96, h: 28 })),
  ...CAMP.stacks.map((s) => ({ kind: 'rect' as const, x: s.x - 32, y: s.y - 18, w: 64, h: 20 })),
  { kind: 'circle', x: CAMP.cart.x, y: CAMP.cart.y - 6, r: 20 },
];
