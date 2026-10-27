import type { Pt, Rect, Solid } from '../../../../IslesTypes';
import { polyDist } from './palette';

/**
 * Where everything in the tree city stands. The painter, the solids and the NPC/POI placement
 * all read these numbers, so a moved building moves its collision with it.
 *
 * The map reads as a climb: south is the forest floor among the Heartwood's roots, the middle
 * is the trunk itself — a vast band of birch bark with terraces cut across it — and the north
 * is the crown, where the trunk forks into boughs and the Glasshouse sits on the fork. Off the
 * tree on either side is only air: the lesser forest's treetops far below, then mist, then sky.
 *
 *              [ THE GLASSHOUSE ]  (door)
 *   Heartroom ── west bough ── crown fork ── east bough ── Drumming Loft
 *   (Birchbark)   (Russet)          |          (Pike)
 *                          upper terrace · storm-split + catwalks (Mandible)
 *          ring-stump (Dendro)      |
 *       knot-houses     LANTERN LEDGE (scales, the Burl)    knot-houses
 *                        lower terrace (Resinia's taps, Bryony)
 *                     ── root stairs ── (Hazel)
 *   root pool (Mossjaw)      waystone       the sawmill (Ottilie)
 *                         s→bloom
 */

export const W = 2400;
export const H = 1800;
export const CX = 1200;

/** Trunk band: from its foot (where the roots flare) up to the crown fork. */
export const TRUNK_FOOT = 1380;
export const TRUNK_TOP = 600;

/** The trunk's half-width at a given y — it flares toward the roots. */
export function trunkHalf(y: number): number {
  const k = Math.max(0, Math.min(1, (y - TRUNK_TOP) / (TRUNK_FOOT - TRUNK_TOP)));
  return 430 + 270 * k * k;
}

/** The forest floor among the roots: walkable the full width but for a thicket at each side. */
export const FLOOR_X0 = 110;
export const FLOOR_X1 = W - 110;

/** The crown fork: a broad platform of bark where the trunk divides. */
export const CROWN = { x: CX, y: 420, rx: 300, ry: 230 };

/** The two great boughs (centre lines) and their walkable half-width. */
export const WEST_BOUGH: Pt[] = [{ x: 1010, y: 560 }, { x: 760, y: 470 }, { x: 520, y: 425 }, { x: 330, y: 390 }];
export const EAST_BOUGH: Pt[] = [{ x: 1390, y: 560 }, { x: 1640, y: 480 }, { x: 1880, y: 425 }, { x: 2070, y: 405 }];
export const BOUGH_HALF = 95;
/** Where each bough ends in a broad burl. */
export const WEST_BURL = { x: 350, y: 400, r: 170 };
export const EAST_BURL = { x: 2060, y: 420, r: 160 };

/** The Glasshouse on the crown, its door facing south. */
export const GLASSHOUSE: Rect = { x: 940, y: 0, w: 520, h: 262 };
export const GLASS_DOOR = { x: CX, y: 300 };

/** Prince Birchbark's Heartroom — a hall grown into the west burl. `y` is its base line. */
export const HEARTROOM = { x: 335, y: 372 };
/** The Drumming Loft on the east burl, where the court's woodpeckers are kept. */
export const LOFT = { x: 2085, y: 388 };

/** The Lantern Ledge — the court's square, a terrace hung with the Great Sap Lantern. */
export const LEDGE = { x: CX, y: 1060, r: 175 };
export const GREAT_LANTERN = { x: CX, y: 1040 };
/** The tithe-scales, where each household's sap is weighed at the season's turn. */
export const SCALES = { x: 1335, y: 1000 };
/** The Burl — a shop in a knot-hole off the ledge. */
export const SHOP = { x: 1010, y: 1112 };

/** Terraces cut across the trunk: a boardwalk ledge at each of these y lines. */
export const TERRACES: number[] = [1250, 1060, 880, 730];

/** The storm-split: a lightning scar down the upper trunk, bridged by two catwalks. */
export const SCAR: Rect = { x: 1525, y: 670, w: 48, h: 330 };
export const CATWALKS: number[] = [760, 905];

/** The old storm-broken branch on the trunk — its stump shows its rings (Dendro reads them). */
export const RING_STUMP = { x: 790, y: 870, r: 46 };

/** The root pool among the roots (south-west) and the iron pipe sunk into it. */
export const POOL: Rect = { x: 360, y: 1500, w: 300, h: 150 };
export const PIPE_HEAD = { x: 330, y: 1560 };
/** The iron pipe runs from the pool up the trunk's west flank to the Glasshouse. */
export const PIPE: Pt[] = [
  { x: 360, y: 1560 }, { x: 300, y: 1470 }, { x: 560, y: 1330 }, { x: 640, y: 1180 }, { x: 700, y: 980 },
  { x: 760, y: 790 }, { x: 790, y: 650 }, { x: 900, y: 520 }, { x: 960, y: 280 },
];

/** The sawmill that is never allowed to run (south-east), and the millrace that feeds its wheel. */
export const MILL = { x: 1900, y: 1580 };
export const MILLRACE: Pt[] = [{ x: W, y: 1510 }, { x: 2200, y: 1530 }, { x: 2080, y: 1545 }];

/** The foot of the root stairs (Hazel stands here). */
export const STAIR_FOOT = { x: CX, y: 1440 };

/**
 * The great roots humping across the forest floor. Each is a polyline with a girth; they are
 * solid where they lie, and the paths run between them.
 */
export const ROOTS: { pts: Pt[]; girth: number }[] = [
  { pts: [{ x: 640, y: 1385 }, { x: 470, y: 1440 }, { x: 300, y: 1430 }, { x: 150, y: 1480 }], girth: 22 },
  { pts: [{ x: 1760, y: 1385 }, { x: 1940, y: 1440 }, { x: 2120, y: 1428 }, { x: 2280, y: 1470 }], girth: 22 },
  { pts: [{ x: 960, y: 1392 }, { x: 930, y: 1450 }, { x: 880, y: 1484 }], girth: 16 },
  { pts: [{ x: 1440, y: 1392 }, { x: 1480, y: 1455 }, { x: 1560, y: 1492 }], girth: 16 },
];

export const ROADS: { pts: Pt[]; w: number }[] = [
  // The climb: from the Bloom road up the root stairs, across the ledge and up to the crown.
  { pts: [{ x: CX, y: 1800 }, { x: CX, y: 1560 }, { x: CX, y: 1380 }, { x: CX, y: 1060 }, { x: CX, y: 720 }, { x: CX, y: 330 }], w: 70 },
  // West along the forest floor to the root pool.
  { pts: [{ x: CX, y: 1600 }, { x: 960, y: 1590 }, { x: 760, y: 1580 }, { x: 690, y: 1560 }], w: 44 },
  // East along the forest floor to the sawmill.
  { pts: [{ x: CX, y: 1640 }, { x: 1460, y: 1660 }, { x: 1700, y: 1640 }, { x: 1830, y: 1630 }], w: 44 },
];

/** Boardwalks along the boughs (drawn as planks laid on the bark). */
export const BOUGH_WALKS: Pt[][] = [WEST_BOUGH, EAST_BOUGH];

/** Knot-hole houses: burls bulging from the bark with a round door. `side` is the flank they grow from. */
export const HOUSES: { x: number; y: number; s: number; side: -1 | 1 }[] = [
  { x: 690, y: 1150, s: 1.05, side: -1 }, { x: 735, y: 1310, s: 1.0, side: -1 }, { x: 812, y: 1000, s: 0.85, side: -1 },
  { x: 830, y: 770, s: 0.9, side: -1 },
  { x: 1700, y: 1150, s: 1.0, side: 1 }, { x: 1640, y: 1320, s: 1.1, side: 1 }, { x: 1610, y: 1040, s: 0.85, side: 1 },
  { x: 610, y: 505, s: 0.8, side: -1 }, { x: 1760, y: 505, s: 0.8, side: 1 },
  // Root-cellar homes on the forest floor.
  { x: 260, y: 1720, s: 0.9, side: -1 }, { x: 2160, y: 1720, s: 0.9, side: 1 }, { x: 1000, y: 1740, s: 0.8, side: -1 },
];

/** The ringed house: Goody Larchmere's knot, daubed with the pruners' white ring. */
export const RINGED_HOUSE = 0;

/** Sap lanterns hung from bark hooks along the roads and terraces. */
export const LANTERNS: Pt[] = [
  { x: 1120, y: 1500 }, { x: 1285, y: 1500 }, { x: 1120, y: 1290 }, { x: 1285, y: 1290 },
  { x: 1110, y: 880 }, { x: 1290, y: 880 }, { x: 1110, y: 720 }, { x: 1290, y: 720 }, { x: 1110, y: 560 }, { x: 1290, y: 560 },
  { x: 900, y: 1250 }, { x: 1500, y: 1250 }, { x: 960, y: 880 }, { x: 1440, y: 880 },
  { x: 700, y: 450 }, { x: 1700, y: 460 }, { x: 760, y: 1560 }, { x: 1650, y: 1610 },
];

/** Sap taps driven into the bark, each with its bucket (Resinia's are on the lower terrace). */
export const TAPS: Pt[] = [
  { x: 1440, y: 1150 }, { x: 1560, y: 1210 }, { x: 1620, y: 1240 }, { x: 900, y: 1180 }, { x: 860, y: 1330 },
  { x: 1040, y: 760 }, { x: 1370, y: 790 }, { x: 1520, y: 1330 },
];

/** Leaf drifts piled where the boughs catch them. */
export const DRIFTS: { x: number; y: number; s: number }[] = [
  { x: 520, y: 470, s: 1.1 }, { x: 760, y: 515, s: 0.9 }, { x: 1700, y: 530, s: 0.9 }, { x: 1950, y: 470, s: 1.0 },
  { x: 1000, y: 470, s: 0.8 }, { x: 1420, y: 470, s: 0.8 }, { x: 600, y: 1620, s: 0.9 }, { x: 1560, y: 1720, s: 1.0 },
];

// ── Walkability ──────────────────────────────────────────────────────

/** True where a person can stand: the forest floor, the trunk, the crown fork, the boughs. */
export function walkable(x: number, y: number): boolean {
  if (y >= TRUNK_FOOT) return x >= FLOOR_X0 && x <= FLOOR_X1;
  if (y >= TRUNK_TOP && Math.abs(x - CX) <= trunkHalf(y)) return true;
  if (((x - CROWN.x) / CROWN.rx) ** 2 + ((y - CROWN.y) / CROWN.ry) ** 2 <= 1) return true;
  if (polyDist(x, y, WEST_BOUGH) <= BOUGH_HALF || polyDist(x, y, EAST_BOUGH) <= BOUGH_HALF) return true;
  if (Math.hypot(x - WEST_BURL.x, y - WEST_BURL.y) <= WEST_BURL.r) return true;
  if (Math.hypot(x - EAST_BURL.x, y - EAST_BURL.y) <= EAST_BURL.r) return true;
  return false;
}

/** The open air round the tree, as rects: 30px cells merged into runs along each row. */
function airSolids(): Solid[] {
  const out: Solid[] = [];
  const C = 30;
  for (let y = 0; y < H; y += C) {
    let run = -1;
    for (let x = 0; x <= W; x += C) {
      const open = x < W && !walkable(x + C / 2, y + C / 2);
      if (open && run < 0) run = x;
      if (!open && run >= 0) { out.push({ kind: 'rect', x: run, y, w: x - run, h: C }); run = -1; }
    }
  }
  return out;
}

const rootSolids = (): Solid[] => {
  const out: Solid[] = [];
  for (const r of ROOTS) {
    for (let i = 0; i < r.pts.length - 1; i++) {
      const a = r.pts[i], b = r.pts[i + 1];
      const n = Math.max(1, Math.floor(Math.hypot(b.x - a.x, b.y - a.y) / 26));
      for (let k = 0; k < n; k++) {
        const t = k / n;
        const taper = 1 - ((i + t) / (r.pts.length - 1)) * 0.45;
        out.push({ kind: 'circle', x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, r: r.girth * taper });
      }
    }
  }
  return out;
};

export const SOLIDS: Solid[] = [
  ...airSolids(),
  // The Glasshouse (its door is the south face; you stand just below it).
  { kind: 'rect', x: GLASSHOUSE.x, y: 110, w: GLASSHOUSE.w, h: GLASSHOUSE.h - 110 },
  // The Heartroom and the Drumming Loft.
  { kind: 'rect', x: HEARTROOM.x - 120, y: HEARTROOM.y - 118, w: 240, h: 118 },
  { kind: 'rect', x: LOFT.x - 80, y: LOFT.y - 70, w: 160, h: 70 },
  // The Great Sap Lantern's post, the scales, the Burl.
  { kind: 'circle', x: GREAT_LANTERN.x, y: GREAT_LANTERN.y, r: 26 },
  { kind: 'rect', x: SCALES.x - 46, y: SCALES.y - 20, w: 92, h: 24 },
  { kind: 'rect', x: SHOP.x - 70, y: SHOP.y - 44, w: 140, h: 46 },
  // The storm-split (the catwalks are left open).
  { kind: 'rect', x: SCAR.x, y: SCAR.y, w: SCAR.w, h: CATWALKS[0] - 38 - SCAR.y },
  { kind: 'rect', x: SCAR.x, y: CATWALKS[0] + 38, w: SCAR.w, h: CATWALKS[1] - CATWALKS[0] - 76 },
  { kind: 'rect', x: SCAR.x, y: CATWALKS[1] + 38, w: SCAR.w, h: SCAR.y + SCAR.h - CATWALKS[1] - 38 },
  // The ring-stump.
  { kind: 'circle', x: RING_STUMP.x, y: RING_STUMP.y - 6, r: RING_STUMP.r },
  // The root pool (its rim is for standing on).
  { kind: 'rect', x: POOL.x + 18, y: POOL.y + 16, w: POOL.w - 36, h: POOL.h - 32 },
  // The sawmill and its race.
  { kind: 'rect', x: MILL.x - 130, y: MILL.y - 92, w: 260, h: 94 },
  { kind: 'rect', x: 2060, y: 1500, w: W - 2060, h: 64 },
  ...rootSolids(),
  ...HOUSES.map((h): Solid => ({ kind: 'circle', x: h.x, y: h.y - 22 * h.s, r: 44 * h.s })),
  ...LANTERNS.map((l): Solid => ({ kind: 'circle', x: l.x, y: l.y - 3, r: 8 })),
  ...TAPS.map((t): Solid => ({ kind: 'circle', x: t.x, y: t.y - 4, r: 10 })),
];
