import type { Pt } from '../../../../IslesTypes';

/**
 * Where everything stands in the Orbit Court. The painter, the solids, the NPCs, the champions
 * and the quests all read these tables, so a moved house moves its collision, its lean and the
 * quest stop at its door together.
 *
 * The court is four islets of rock hung in the sky round the Lodestone — a black moon the size
 * of a chapel that hovers over the middle islet and holds the others on chains. Between the
 * islets the ground simply stops: gulfs of open sky with the cloud-sea a mile below, crossed by
 * chain bridges. The middle islet carries the moon, the brass Ring-Street that circles under it,
 * Tycho's Great Orrery and Prince Perigee's house, the Periapsis. The west islet is Tether Quay,
 * where the road from Windlass lands and the Moonpool floats. The east islet holds the Almanac
 * shop and Lofty's zero-g yard; the long south islet, the Archive of Falling Things.
 *
 * Everything leans toward the moon: lamp-posts, weathervanes, pines, the filings in the paving.
 */

export const AREA_W = 2400;
export const AREA_H = 1600;

/** The open sky along the top edge (the north road crosses it on a chain bridge). */
export const EDGE_N = 110;
/** The open sky below the south islet. */
export const EDGE_S = 1500;
/** Gap in the northern sky for the road to the Stormeye Court. */
export const NORTH_GAP = { x0: 1110, x1: 1290 };

/** The gulfs of open sky between the islets, and the chain bridges across them. */
export const GULF_W = { x: 640, w: 120 };
export const W_BRIDGES: { y0: number; y1: number }[] = [{ y0: 765, y1: 835 }, { y0: 1300, y1: 1370 }];
export const GULF_E = { x: 1880, w: 100 };
export const E_BRIDGES: { y0: number; y1: number }[] = [{ y0: 500, y1: 570 }, { y0: 880, y1: 950 }];
export const GULF_S = { y: 1160, h: 90 };
export const S_BRIDGES: { x0: number; x1: number }[] = [{ x0: 1060, x1: 1140 }, { x0: 1640, x1: 1720 }, { x0: 2150, x1: 2230 }];

/**
 * The Lodestone. `x, y` is the foot of the stone cradle it hovers over (the piece's base line);
 * the sphere itself hangs `lift` px above that, radius `r`.
 */
export const MOON = { x: 1290, y: 800, r: 140, lift: 380 };
/** The cradle's footprint — a ring of iron bollards round the well. */
export const CRADLE_R = 110;

/** The Ring-Street: a brass-plated ellipse circling under the moon. */
export const RING = { x: 1290, y: 810, rx: 300, ry: 210 };

/** The Periapsis: Prince Perigee's house, north-east of the moon (front base line). */
export const MANOR = { x: 1610, y: 420, w: 340 };
export const PRINCE_AT: Pt = { x: 1610, y: 485 };

/** The Great Orrery in Tycho's yard: a brass sun on a post with planets on long arms. */
export const ORRERY = { x: 990, y: 380 };

/** The Brass Almanac — the court shop, on the east islet. */
export const SHOP = { x: 2190, y: 400 };

/** Lofty's zero-g yard: a fenced ring on the east islet where the ground forgets to pull. */
export const ZEROG = { x: 2190, y: 760, r: 120 };

/** The Moonpool on Tether Quay: a ball of water hovering over a brass cradle. */
export const POOL_AT = { x: 330, y: 470, r: 70, lift: 110 };
/** The cradle's footprint (solid) and the fishing reach. */
export const POOL_CRADLE = { x: 250, y: 440, w: 160, h: 46 };

/** The Sling Hoops: the courier's launching rings at the south end of Tether Quay. */
export const HOOPS = { x: 300, y: 1180 };

/** The Archive of Falling Things, Null's squat dome on the south islet. */
export const ARCHIVE = { x: 1420, y: 1478, w: 300 };

/** The south islet's one long street. */
export const SOUTH_STREET_Y = 1360;

/**
 * Orrery-houses: base-centre, width, wall height, roof (0 navy dome, 1 copper cone, 2 brass
 * cupola with a little orrery on top).
 */
export interface OrbHouse { x: number; y: number; w: number; h: number; roof: 0 | 1 | 2 }
export const HOUSES: OrbHouse[] = [
  // Tether Quay.
  { x: 120, y: 330, w: 120, h: 92, roof: 0 },
  { x: 530, y: 330, w: 112, h: 86, roof: 2 },
  { x: 130, y: 1010, w: 116, h: 90, roof: 1 },
  { x: 540, y: 1000, w: 104, h: 84, roof: 0 },
  { x: 120, y: 1470, w: 120, h: 92, roof: 2 },
  { x: 560, y: 1470, w: 110, h: 86, roof: 1 },
  // The middle islet, round the Ring-Street.
  { x: 850, y: 240, w: 116, h: 90, roof: 1 },
  { x: 1390, y: 240, w: 108, h: 84, roof: 0 },
  { x: 860, y: 1010, w: 118, h: 90, roof: 2 },
  { x: 900, y: 1120, w: 100, h: 80, roof: 0 },
  { x: 1520, y: 1125, w: 112, h: 86, roof: 1 },
  { x: 1790, y: 1090, w: 104, h: 84, roof: 2 },
  // The east islet.
  { x: 2330, y: 640, w: 100, h: 84, roof: 0 },
  { x: 2060, y: 1100, w: 110, h: 88, roof: 1 },
  { x: 2330, y: 1100, w: 100, h: 82, roof: 2 },
  // The south islet: a row along the north side of the street, two on the south side.
  { x: 880, y: 1310, w: 108, h: 84, roof: 1 },
  { x: 1250, y: 1310, w: 112, h: 86, roof: 0 },
  { x: 1950, y: 1310, w: 110, h: 86, roof: 2 },
  { x: 2330, y: 1310, w: 100, h: 82, roof: 0 },
  { x: 1000, y: 1485, w: 116, h: 88, roof: 2 },
  { x: 1840, y: 1485, w: 112, h: 86, roof: 1 },
  { x: 2140, y: 1485, w: 104, h: 84, roof: 0 },
];

/** Brass lamp-posts along the streets — every one bent toward the moon. */
export const LAMPS: Pt[] = [
  { x: 240, y: 760 }, { x: 520, y: 760 }, { x: 900, y: 760 }, { x: 1170, y: 470 }, { x: 1250, y: 260 },
  { x: 1490, y: 520 }, { x: 1700, y: 690 }, { x: 1700, y: 930 }, { x: 1050, y: 1040 }, { x: 1420, y: 1060 },
  { x: 2070, y: 590 }, { x: 2300, y: 900 }, { x: 330, y: 1060 }, { x: 900, y: 1400 }, { x: 1600, y: 1400 },
  { x: 2050, y: 1400 }, { x: 420, y: 620 },
];

/**
 * Tether anchors: iron bollards each islet is chained to the moon by. The chains rise from
 * these into the sky and meet the moon's flank.
 */
export const ANCHORS: Pt[] = [
  { x: 560, y: 620 }, { x: 540, y: 1210 }, { x: 960, y: 560 }, { x: 1640, y: 1000 }, { x: 2060, y: 300 },
  { x: 2080, y: 960 }, { x: 1180, y: 1440 }, { x: 1700, y: 1450 },
];

/** Lean-pines: hardy sky-pines, every one grown slantwise toward the moon. */
export const PINES: Pt[] = [
  { x: 60, y: 600 }, { x: 600, y: 180 }, { x: 40, y: 1200 }, { x: 610, y: 1100 }, { x: 1800, y: 200 },
  { x: 1840, y: 640 }, { x: 2360, y: 230 }, { x: 2360, y: 960 }, { x: 800, y: 1440 }, { x: 2360, y: 1460 },
];

/** Roads: brass-edged paving between the places. */
export const ROADS: Pt[][] = [
  // West road, in from Windlass, over the west bridge to the Ring-Street.
  [{ x: 0, y: 800 }, { x: 300, y: 800 }, { x: 640, y: 800 }, { x: 760, y: 800 }, { x: 990, y: 790 }],
  // North road, in from Stormeye, down to the Ring-Street.
  [{ x: 1200, y: 0 }, { x: 1200, y: 300 }, { x: 1230, y: 600 }],
  // Up to the Periapsis.
  [{ x: 1440, y: 620 }, { x: 1610, y: 500 }],
  // Over to Tycho's yard.
  [{ x: 1200, y: 300 }, { x: 1060, y: 470 }],
  // East road (north bridge) to the shop.
  [{ x: 1560, y: 690 }, { x: 1760, y: 560 }, { x: 1880, y: 535 }, { x: 1980, y: 535 }, { x: 2190, y: 520 }, { x: 2190, y: 450 }],
  // East road (south bridge) to the zero-g yard.
  [{ x: 1580, y: 860 }, { x: 1880, y: 915 }, { x: 1980, y: 915 }, { x: 2190, y: 900 }],
  // South road, over the first south bridge.
  [{ x: 1290, y: 1020 }, { x: 1250, y: 1090 }, { x: 1100, y: 1110 }, { x: 1100, y: 1160 }, { x: 1100, y: 1250 }, { x: 1100, y: SOUTH_STREET_Y }],
  // The middle south bridge.
  [{ x: 1480, y: 975 }, { x: 1680, y: 1080 }, { x: 1680, y: 1160 }, { x: 1680, y: 1250 }, { x: 1680, y: SOUTH_STREET_Y }],
  // East islet, down to the east south bridge.
  [{ x: 2190, y: 900 }, { x: 2190, y: 1160 }, { x: 2190, y: 1250 }, { x: 2190, y: SOUTH_STREET_Y }],
  // The south street, end to end.
  [{ x: 760, y: 1335 }, { x: 1100, y: SOUTH_STREET_Y }, { x: 1680, y: SOUTH_STREET_Y }, { x: 2190, y: SOUTH_STREET_Y }, { x: 2380, y: SOUTH_STREET_Y }],
  // Tether Quay: north to the Moonpool, south to the Sling Hoops and the south-west bridge.
  [{ x: 300, y: 800 }, { x: 330, y: 560 }],
  [{ x: 300, y: 800 }, { x: 360, y: 1080 }, { x: 420, y: 1335 }, { x: 640, y: 1335 }, { x: 760, y: 1335 }],
];

export const WAYSTONE: Pt = { x: 200, y: 700 };
export const SPAWN: Pt = { x: 120, y: 800 };
