import type { Pt, Rect } from '../../../../IslesTypes';

/**
 * Where everything stands in the Inkwell. The painter, the solids, the NPCs, the champions and
 * the quests all read these tables, so a moved tower moves its collision, its beam and the
 * quest stop at its door together.
 *
 * The town is a page laid over the water: one Grand Canal runs east–west across the lower
 * third (squid pens at its western end, the fishing reach at its eastern), the Quill Cut drops
 * from the north wall into it, and four bridges stitch the streets across. Prince Blot's manor —
 * a great inkwell with the quill still standing in it — holds the top of the page; Decree Square
 * spreads in front of it, hung with the Queen's decrees drying on lines.
 */

export const AREA_W = 2400;
export const AREA_H = 1600;

/** The north wall: the backs of the oldest scriptoria, shoulder to shoulder. */
export const WALL_N = 170;

/** The Grand Canal (east–west) and its bridges (x ranges). */
export const CANAL = { y: 1010, h: 80 };
export const BRIDGES_X: { x0: number; x1: number }[] = [
  { x0: 520, x1: 610 },
  { x0: 1150, x1: 1250 },
  { x0: 1880, x1: 1970 },
];

/** The squid pens: the canal opens into a basin of fenced pens at its west end. */
export const PENS: Rect = { x: 40, y: 1010, w: 430, h: 180 };

/** The Quill Cut (north–south) and its bridges (y ranges). */
export const CUT = { x: 1640, w: 60, y0: WALL_N, y1: 1010 };
export const CUT_BRIDGES_Y: { y0: number; y1: number }[] = [
  { y0: 520, y1: 600 },
  { y0: 760, y1: 840 },
  // Where the towpath crosses the Cut's mouth.
  { y0: 945, y1: 1008 },
];

/** The fishing reach — the Grand Canal's quiet eastern stretch, by the punt stage. */
export const REACH: Rect = { x: 1990, y: 1010, w: 380, h: 80 };

/** Prince Blot's manor, "the Well": the front of the bottle's base. */
export const MANOR = { x: 1200, y: 460, w: 360 };
export const PRINCE_AT: Pt = { x: 1200, y: 530 };

/** Decree Square, before the manor. */
export const SQUARE = { x: 1200, y: 650, rx: 230, ry: 120 };

/**
 * Drying lines strung across the square and the press yard: each a pair of poles with the
 * Queen's decrees pegged between them. Only the poles are solid.
 */
export const LINES: { a: Pt; b: Pt; sag: number }[] = [
  { a: { x: 1010, y: 590 }, b: { x: 1150, y: 575 }, sag: 18 },
  { a: { x: 1250, y: 575 }, b: { x: 1390, y: 590 }, sag: 18 },
  { a: { x: 1030, y: 730 }, b: { x: 1160, y: 745 }, sag: 14 },
  { a: { x: 1240, y: 760 }, b: { x: 1350, y: 772 }, sag: 14 },
  { a: { x: 760, y: 880 }, b: { x: 900, y: 860 }, sag: 16 },
  { a: { x: 220, y: 720 }, b: { x: 315, y: 735 }, sag: 12 },
];

/** The Pressworks — the scriptorium's printing house (front wall base). */
export const PRESS = { x: 600, y: 765, w: 300, h: 170 };

/** The court shop: Nib & Sac, stationers. */
export const SHOP = { x: 1470, y: 605, w: 180, h: 120 };

/** The censors' towers. Quill's is the west one. */
export const TOWERS: { x: number; y: number; r: number; h: number }[] = [
  { x: 420, y: 400, r: 46, h: 300 },
  { x: 2130, y: 300, r: 40, h: 250 },
  { x: 820, y: 1520, r: 38, h: 230 },
];

/** Doctor Rorsch's Hall of Reflection — a symmetrical house with a blot on its face. */
export const HALL = { x: 1980, y: 475, w: 260 };

/** The Archive: an old scriptorium where the town's charter used to be kept. */
export const ARCHIVE = { x: 1640, y: 1470, w: 170 };

/** Tall narrow scriptorium houses: base-centre, width, storeys. */
export const HOUSES: { x: number; y: number; w: number; floors: number }[] = [
  // North of the south street, backs to the canal.
  { x: 300, y: 1240, w: 110, floors: 3 },
  { x: 430, y: 1250, w: 90, floors: 4 },
  { x: 720, y: 1230, w: 120, floors: 3 },
  { x: 880, y: 1240, w: 100, floors: 4 },
  { x: 1010, y: 1235, w: 96, floors: 3 },
  { x: 1400, y: 1235, w: 110, floors: 4 },
  { x: 1540, y: 1245, w: 96, floors: 3 },
  { x: 2090, y: 1240, w: 120, floors: 4 },
  { x: 2240, y: 1235, w: 100, floors: 3 },
  // South of the south street.
  { x: 150, y: 1500, w: 110, floors: 3 },
  { x: 330, y: 1510, w: 120, floors: 4 },
  { x: 560, y: 1500, w: 100, floors: 3 },
  { x: 1000, y: 1505, w: 120, floors: 4 },
  { x: 1400, y: 1500, w: 110, floors: 3 },
  { x: 1890, y: 1505, w: 120, floors: 4 },
  { x: 2100, y: 1500, w: 96, floors: 3 },
  { x: 2270, y: 1510, w: 110, floors: 4 },
  // The upper town, between the wall and the canal.
  { x: 820, y: 470, w: 110, floors: 4 },
  { x: 960, y: 430, w: 90, floors: 3 },
  { x: 1500, y: 420, w: 100, floors: 4 },
  { x: 230, y: 620, w: 110, floors: 3 },
  { x: 2250, y: 620, w: 100, floors: 3 },
];

/** The north wall's facade: tall gables, drawn as one long piece in segments. */
export const WALL_SEGMENTS = 14;

/** Lamps (the only blue lights in the streets — the censors' street-lamps). */
export const LAMPS: Pt[] = [
  { x: 1060, y: 560 }, { x: 1340, y: 560 }, { x: 1730, y: 690 }, { x: 2080, y: 760 }, { x: 785, y: 720 },
  { x: 500, y: 915 }, { x: 1120, y: 960 }, { x: 1280, y: 960 }, { x: 1280, y: 1262 }, { x: 680, y: 1368 },
  { x: 1780, y: 1358 }, { x: 2210, y: 870 },
];

/** Moored punts along the canal (x, along the north bank). */
export const PUNTS: { x: number; y: number; flip?: boolean }[] = [
  { x: 760, y: 1048 }, { x: 1440, y: 1052, flip: true }, { x: 1760, y: 1046 }, { x: 2230, y: 1050, flip: true },
];

/** Roads: paper flagstone streets with ink kerbs. */
export const ROADS: Pt[][] = [
  // East road, over the Quill Cut, into the square.
  [{ x: 2400, y: 800 }, { x: 2000, y: 800 }, { x: 1700, y: 800 }, { x: 1450, y: 760 }, { x: 1250, y: 680 }],
  // South road, over the middle bridge, out to the Sailmaker's.
  [{ x: 1200, y: 700 }, { x: 1200, y: 900 }, { x: 1200, y: 1050 }, { x: 1200, y: 1300 }, { x: 1200, y: 1600 }],
  // West road to the Pressworks and the pens.
  [{ x: 1000, y: 680 }, { x: 860, y: 740 }, { x: 760, y: 800 }, { x: 620, y: 815 }, { x: 420, y: 890 }, { x: 220, y: 920 }],
  // Up to Quill's tower.
  [{ x: 420, y: 890 }, { x: 360, y: 780 }, { x: 390, y: 640 }, { x: 445, y: 470 }],
  // North-east to the Hall of Reflection.
  [{ x: 1450, y: 760 }, { x: 1560, y: 640 }, { x: 1620, y: 562 }, { x: 1720, y: 556 }, { x: 1980, y: 540 }],
  // The south street, end to end.
  [{ x: 100, y: 1330 }, { x: 560, y: 1330 }, { x: 900, y: 1310 }, { x: 1200, y: 1300 }, { x: 1600, y: 1310 }, { x: 1925, y: 1300 }, { x: 2300, y: 1330 }],
  // West bridge up to the press.
  [{ x: 565, y: 1330 }, { x: 565, y: 1050 }, { x: 590, y: 900 }, { x: 620, y: 815 }],
  // East bridge up to the east road.
  [{ x: 1925, y: 1300 }, { x: 1925, y: 1050 }, { x: 1950, y: 900 }, { x: 2000, y: 800 }],
  // The towpath along the canal's north bank.
  [{ x: 230, y: 960 }, { x: 900, y: 975 }, { x: 1500, y: 975 }, { x: 2350, y: 970 }],
];

export const WAYSTONE: Pt = { x: 2230, y: 720 };
export const SPAWN: Pt = { x: 2260, y: 800 };
