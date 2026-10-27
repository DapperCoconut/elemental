import type { Pt, Rect, Solid } from '../../../../IslesTypes';

/**
 * Where everything on the summit stands. The painter, the solids and the NPC/POI placement all
 * read these numbers, so a moved building moves its collision with it.
 *
 * The map is the very top of Highspire's needle: a broad, ragged plateau of moonstone above the
 * cloud line, in permanent night, with the cloud sea lying silver a long way down on every side.
 * You come up the Cloudstair from Galeward in the south, under the Cloud Line arch where the
 * breath-meters start counting. The middle of the summit is the Mosaic Plaza, a constellation
 * floor in lapis and gold leaf. West are the Registry of Stars and the Eclipse Terrace; south-west
 * the fallen-star craters; east the Great Telescope's dome; north-east the Star Kiln, where
 * fallen stars are kept burning; the Starpool lies south-east. North-west on its spur stands
 * Prince Nova's Zenith Tower. And at the very north the Last Stair climbs to the gate of the Lung —
 * King Aerion's windmill-palace, whose sails turn over the whole summit, black against the stars.
 *
 *                      [ THE LUNG ]  (door, Last Stair)
 *        Zenith Tower (Nova)       |          Star Kiln (Betel)
 *   Registry ─ Eclipse Terrace (Umbra)  ── MOSAIC PLAZA (Ursa) ── Great Telescope (Galilee)
 *        craters (Vega)            |   The Almanac (shop)    Starpool (Halloran)
 *                         Cloud Line arch · waystone
 *                               s→galeward
 */

export const W = 2400;
export const H = 1800;
export const CX = 1200;

/** The plateau: a ragged ellipse of moonstone. */
export const PLATEAU = { x: CX, y: 960, rx: 1010, ry: 780 };

/** The Cloudstair spur coming up from the south edge, and the Last Stair to the north. */
export const SPUR: Rect = { x: 1060, y: 1540, w: 280, h: H - 1540 };
export const LAST_STAIR: Rect = { x: 1030, y: 70, w: 340, h: 360 };

/** How far out the plateau's edge reaches at a bearing, as a fraction of the ellipse. */
export function edgeAt(a: number): number {
  return 0.93 + 0.04 * Math.sin(3 * a + 0.7) + 0.025 * Math.sin(7 * a + 2.1) + 0.018 * Math.sin(11 * a + 0.3);
}

/** The Mosaic Plaza: the great constellation floor in the middle of the summit. */
export const PLAZA = { x: CX, y: 1000, rx: 250, ry: 170 };

/** The Lung's gate on the Last Stair; the door POI stands just in front. */
export const LUNG_GATE = { x: CX, y: 196 };
export const LUNG_DOOR = { x: CX, y: 248 };

/** Prince Nova's Zenith Tower on the north-west spur. `y` is its base line. */
export const TOWER = { x: 780, y: 470 };

/** The Registry of Stars — the hall where the Ledger is kept. */
export const REGISTRY = { x: 900, y: 760 };

/** The Eclipse Terrace: a round dais with the brass moon-disc on its gantry. */
export const ECLIPSE = { x: 500, y: 900, r: 120 };

/** The Great Telescope's dome. */
export const DOME = { x: 1880, y: 880 };

/** The Star Kiln — a caged hearth where a fallen star is kept burning. */
export const KILN = { x: 1760, y: 540 };

/** The Almanac — the court shop, a domed stall with star charts hung out to sell. */
export const SHOP = { x: 1540, y: 1150 };

/** The Cloud Line arch, where the metering begins. */
export const ARCH = { x: CX, y: 1560, span: 190 };
/** The meter-house beside the arch. */
export const METER_HOUSE = { x: 1000, y: 1610 };

/** The Starpool: a basin of cooling starlight. */
export const POOL: Rect = { x: 1500, y: 1290, w: 270, h: 140 };
/** The copper siphon the King's lampwrights have sunk into it. */
export const SIPHON = { x: 1790, y: 1350 };

/** Fallen-star craters, south-west. The first is the freshest. */
export const CRATERS: { x: number; y: number; r: number }[] = [
  { x: 640, y: 1260, r: 52 }, { x: 500, y: 1400, r: 40 }, { x: 790, y: 1440, r: 34 },
  { x: 420, y: 1200, r: 30 }, { x: 900, y: 1300, r: 26 }, { x: 620, y: 1520, r: 28 },
  { x: 2000, y: 1180, r: 30 }, { x: 1480, y: 520, r: 24 },
];

/** Little domed observatory-houses, each with a skylight slit and a window telescope. */
export const HOUSES: { x: number; y: number; s: number }[] = [
  { x: 820, y: 1580, s: 0.9 }, { x: 1420, y: 1620, s: 0.85 }, { x: 1560, y: 1520, s: 0.8 },
  { x: 700, y: 1040, s: 0.9 }, { x: 1000, y: 560, s: 0.8 }, { x: 1440, y: 790, s: 0.95 },
  { x: 1650, y: 800, s: 0.8 }, { x: 2050, y: 1040, s: 0.85 }, { x: 330, y: 1060, s: 0.85 },
  { x: 1980, y: 640, s: 0.8 },
];

/** Star-lanterns on tall poles along the roads (Ottoline lights them). */
export const LANTERNS: Pt[] = [
  { x: 1120, y: 1440 }, { x: 1290, y: 1440 }, { x: 1110, y: 1230 }, { x: 1290, y: 1230 },
  { x: 1120, y: 760 }, { x: 1285, y: 760 }, { x: 1110, y: 520 }, { x: 1290, y: 520 },
  { x: 900, y: 920 }, { x: 680, y: 880 }, { x: 1520, y: 960 }, { x: 1720, y: 930 },
  { x: 1470, y: 650 }, { x: 960, y: 640 }, { x: 900, y: 1360 }, { x: 1440, y: 1330 },
];

/** Telescopes on tripods, set up where the stargazers like to stand. */
export const SCOPES: { x: number; y: number; s: number; a: number }[] = [
  { x: 1000, y: 1460, s: 42, a: -2.1 }, { x: 1400, y: 1460, s: 38, a: -1.0 }, { x: 760, y: 700, s: 40, a: -2.4 },
  { x: 2080, y: 900, s: 44, a: -0.7 }, { x: 370, y: 800, s: 36, a: -2.5 }, { x: 1560, y: 420, s: 40, a: -1.3 },
];

/** Armillary spheres on plinths round the plaza and the stairs. */
export const ARMILLARIES: Pt[] = [
  { x: 960, y: 1150 }, { x: 1440, y: 1150 }, { x: 960, y: 860 }, { x: 1440, y: 860 },
];

export const ROADS: { pts: Pt[]; w: number }[] = [
  // The Cloudstair up through the arch to the plaza, then on to the Last Stair.
  { pts: [{ x: CX, y: H }, { x: CX, y: 1560 }, { x: CX, y: 1170 }], w: 84 },
  { pts: [{ x: CX, y: 830 }, { x: CX, y: 420 }, { x: CX, y: 260 }], w: 84 },
  // West to the Registry and the Eclipse Terrace.
  { pts: [{ x: 960, y: 990 }, { x: 760, y: 940 }, { x: 600, y: 905 }], w: 54 },
  { pts: [{ x: 1050, y: 880 }, { x: 960, y: 800 }, { x: 905, y: 790 }], w: 46 },
  // North-west to the Zenith Tower.
  { pts: [{ x: CX, y: 640 }, { x: 990, y: 610 }, { x: 860, y: 560 }, { x: 790, y: 540 }], w: 54 },
  // East to the Great Telescope.
  { pts: [{ x: 1440, y: 1000 }, { x: 1640, y: 990 }, { x: 1820, y: 990 }], w: 58 },
  // North-east to the Star Kiln.
  { pts: [{ x: CX, y: 660 }, { x: 1420, y: 620 }, { x: 1640, y: 610 }], w: 50 },
  // South-west to the craters.
  { pts: [{ x: CX, y: 1380 }, { x: 960, y: 1360 }, { x: 760, y: 1330 }], w: 46 },
  // South-east to the Starpool.
  { pts: [{ x: CX, y: 1330 }, { x: 1360, y: 1340 }, { x: 1480, y: 1370 }], w: 46 },
];

// ── Walkability ──────────────────────────────────────────────────────

const inRect = (x: number, y: number, r: Rect): boolean => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;

/** True where a person can stand: the plateau, the Cloudstair spur and the Last Stair. */
export function walkable(x: number, y: number): boolean {
  if (inRect(x, y, SPUR) || inRect(x, y, LAST_STAIR)) return true;
  const dx = (x - PLATEAU.x) / PLATEAU.rx, dy = (y - PLATEAU.y) / PLATEAU.ry;
  return Math.hypot(dx, dy) <= edgeAt(Math.atan2(dy, dx));
}

/** The open sky round the summit, as rects: 30px cells merged into runs along each row. */
function skySolids(): Solid[] {
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

export const SOLIDS: Solid[] = [
  ...skySolids(),
  // The Lung's gatehouse on the Last Stair (the door is its south face).
  { kind: 'rect', x: LUNG_GATE.x - 130, y: 70, w: 260, h: LUNG_GATE.y - 70 },
  // The Zenith Tower and the Registry.
  { kind: 'rect', x: TOWER.x - 90, y: TOWER.y - 80, w: 180, h: 80 },
  { kind: 'rect', x: REGISTRY.x - 130, y: REGISTRY.y - 70, w: 260, h: 70 },
  // The moon-disc's gantry posts on the Eclipse Terrace.
  { kind: 'circle', x: ECLIPSE.x - 104, y: ECLIPSE.y - 40, r: 14 },
  { kind: 'circle', x: ECLIPSE.x + 104, y: ECLIPSE.y - 40, r: 14 },
  // The Great Telescope's dome and the Star Kiln.
  { kind: 'rect', x: DOME.x - 150, y: DOME.y - 90, w: 300, h: 90 },
  { kind: 'circle', x: KILN.x, y: KILN.y - 30, r: 62 },
  // The Almanac, the meter-house and the arch's two piers.
  { kind: 'rect', x: SHOP.x - 80, y: SHOP.y - 50, w: 160, h: 50 },
  { kind: 'rect', x: METER_HOUSE.x - 70, y: METER_HOUSE.y - 56, w: 140, h: 56 },
  { kind: 'circle', x: ARCH.x - ARCH.span / 2 - 6, y: ARCH.y - 8, r: 22 },
  { kind: 'circle', x: ARCH.x + ARCH.span / 2 + 6, y: ARCH.y - 8, r: 22 },
  // The Starpool (its rim is for standing on) and the siphon.
  { kind: 'rect', x: POOL.x + 18, y: POOL.y + 16, w: POOL.w - 36, h: POOL.h - 32 },
  { kind: 'circle', x: SIPHON.x, y: SIPHON.y - 10, r: 18 },
  // Craters: the glass bowls are slick and steep; their rims are walkable.
  ...CRATERS.map((c): Solid => ({ kind: 'circle', x: c.x, y: c.y, r: c.r * 0.72 })),
  ...HOUSES.map((h): Solid => ({ kind: 'circle', x: h.x, y: h.y - 22 * h.s, r: 46 * h.s })),
  ...LANTERNS.map((l): Solid => ({ kind: 'circle', x: l.x, y: l.y - 3, r: 7 })),
  ...SCOPES.map((s): Solid => ({ kind: 'circle', x: s.x, y: s.y - 4, r: s.s * 0.3 })),
  ...ARMILLARIES.map((a): Solid => ({ kind: 'circle', x: a.x, y: a.y - 6, r: 16 })),
];
