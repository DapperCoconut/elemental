import type { Pt, Rect } from '../../../../IslesTypes';

/**
 * Where everything stands in the Spore Court. The painter, the solids, the NPCs, the champions
 * and the quests all read these tables, so a moved mushroom-house moves its collision, its glow
 * and the quest stop at its door together.
 *
 * The town is a bog. Peat hummocks carry the houses — every one hollowed out of a giant
 * mushroom — and rotten boardwalks stitch them together. The Black Lode, a channel of dead-still
 * water, cuts east–west across the lower third with three boardwalk bridges over it; the Black
 * Mere, where the bog-fishers sit, lies in the north-west under the mushroom wood. Prince Mycel
 * keeps house at the top of the map in the Mycelarium, a puffball the size of a chapel with a
 * parasol cap on its crown, and from its foot the glowing threads run out under every floor in
 * town. The great fairy ring of the Tithe Green lies before his door.
 */

export const AREA_W = 2400;
export const AREA_H = 1600;

/** The mushroom wood along the north edge — stems shoulder to shoulder, impassable. */
export const WALL_N = 160;
export const WALL_SEGMENTS = 12;

/** The Black Lode (east–west channel) and its boardwalk bridges (x ranges). */
export const LODE = { y: 990, h: 86 };
export const LODE_BRIDGES: { x0: number; x1: number }[] = [
  { x0: 380, x1: 470 },
  { x0: 1150, x1: 1250 },
  { x0: 1880, x1: 1970 },
];

/** The Black Mere — the fishing water, north-west, with a jetty off its east shore. */
export const MERE: Rect = { x: 170, y: 400, w: 380, h: 250 };
export const JETTY: Rect = { x: 520, y: 548, w: 70, h: 26 };

/** The Mycelarium: Prince Mycel's puffball palace (front base line). */
export const MANOR = { x: 1200, y: 470, w: 380 };
export const PRINCE_AT: Pt = { x: 1200, y: 540 };

/** The Tithe Green — a fairy ring of red caps on the moss before the Mycelarium. */
export const GREEN = { x: 1200, y: 690, r: 150 };

/** The Spore Scales, where each household's tithe of mushrooms is weighed. */
export const SCALES: Pt = { x: 1395, y: 735 };

/** The court shop: the Gill & Gather, three mushrooms grown into one. */
export const SHOP = { x: 1610, y: 890 };

/** Glowcap lamps on posts along the boardwalks. */
export const LAMPS: Pt[] = [
  { x: 1060, y: 590 }, { x: 1340, y: 590 }, { x: 1700, y: 700 }, { x: 2090, y: 760 }, { x: 760, y: 720 },
  { x: 500, y: 905 }, { x: 1120, y: 920 }, { x: 1280, y: 920 }, { x: 1280, y: 1255 }, { x: 680, y: 1255 },
  { x: 1780, y: 1250 }, { x: 2210, y: 880 }, { x: 640, y: 640 },
];

/**
 * Mushroom houses: base-centre, cap half-width, stem height, cap colour (0 red, 1 violet,
 * 2 tan). The stem is the house — door, windows and a stovepipe; the cap is its roof.
 */
export interface MushHouse { x: number; y: number; cap: number; h: number; kind: 0 | 1 | 2 }
export const HOUSES: MushHouse[] = [
  // The upper town, under the wood.
  { x: 760, y: 480, cap: 86, h: 120, kind: 0 },
  { x: 930, y: 420, cap: 70, h: 100, kind: 2 },
  { x: 1500, y: 450, cap: 78, h: 112, kind: 1 },
  { x: 2180, y: 430, cap: 84, h: 118, kind: 0 },
  { x: 2050, y: 670, cap: 64, h: 92, kind: 2 },
  { x: 300, y: 790, cap: 66, h: 96, kind: 1 },
  // Between the boardwalks and the Lode.
  { x: 800, y: 905, cap: 72, h: 100, kind: 2 },
  { x: 1430, y: 895, cap: 62, h: 90, kind: 0 },
  // South of the Lode, north of the low street.
  { x: 300, y: 1230, cap: 74, h: 104, kind: 0 },
  { x: 880, y: 1225, cap: 70, h: 100, kind: 1 },
  { x: 1450, y: 1225, cap: 78, h: 110, kind: 2 },
  { x: 1650, y: 1235, cap: 62, h: 92, kind: 0 },
  // South of the low street.
  { x: 160, y: 1500, cap: 76, h: 108, kind: 1 },
  { x: 410, y: 1510, cap: 84, h: 120, kind: 2 },
  { x: 1000, y: 1500, cap: 72, h: 104, kind: 0 },
  { x: 1420, y: 1510, cap: 80, h: 116, kind: 1 },
  { x: 1700, y: 1500, cap: 70, h: 100, kind: 2 },
  { x: 2000, y: 1510, cap: 82, h: 118, kind: 0 },
  { x: 2250, y: 1500, cap: 72, h: 104, kind: 1 },
];

/** Dead trees standing in the bog — bare, hung with bracket fungus. */
export const SNAGS: Pt[] = [
  { x: 640, y: 300 }, { x: 1720, y: 330 }, { x: 2330, y: 640 }, { x: 90, y: 980 }, { x: 2330, y: 1180 },
  { x: 560, y: 1150 }, { x: 1080, y: 1150 },
];

/** The Puffball Lea: a moss meadow west of the Green, white puffballs dotted all over it. */
export const LEA = { x: 560, y: 790, rx: 170, ry: 80 };

/** The Thread Yard, east of the manor, where the glowing hyphae surface thickest. */
export const YARD = { x: 1780, y: 530, rx: 170, ry: 90 };

/** The Wisp Fen, south-east: sedge tussocks and soft ground where the lights hang. */
export const FEN = { x: 2150, y: 1170, rx: 210, ry: 80 };

/** The rot pits, south-west of the low street, where everything that falls is turned. */
export const PITS: { x: number; y: number; r: number }[] = [
  { x: 610, y: 1420, r: 46 }, { x: 760, y: 1440, r: 40 }, { x: 690, y: 1530, r: 34 },
];

/** Roads: boardwalks on posts, laid over the peat. */
export const ROADS: Pt[][] = [
  // East road, in from the Bloom Court, to the Green.
  [{ x: 2400, y: 800 }, { x: 2000, y: 800 }, { x: 1700, y: 760 }, { x: 1420, y: 700 }, { x: 1320, y: 690 }],
  // South road, over the middle bridge, out to the Confection Court.
  [{ x: 1200, y: 780 }, { x: 1200, y: 980 }, { x: 1200, y: 1090 }, { x: 1200, y: 1350 }, { x: 1200, y: 1600 }],
  // West road, past the Lea.
  [{ x: 1080, y: 700 }, { x: 850, y: 760 }, { x: 620, y: 820 }, { x: 420, y: 860 }, { x: 240, y: 900 }],
  // Up to the Mere jetty.
  [{ x: 420, y: 860 }, { x: 470, y: 740 }, { x: 580, y: 660 }, { x: 600, y: 590 }],
  // North-east to the Thread Yard.
  [{ x: 1420, y: 700 }, { x: 1560, y: 610 }, { x: 1750, y: 580 }, { x: 2000, y: 540 }],
  // The low street, end to end.
  [{ x: 100, y: 1310 }, { x: 560, y: 1310 }, { x: 900, y: 1300 }, { x: 1200, y: 1300 }, { x: 1600, y: 1305 }, { x: 1925, y: 1295 }, { x: 2300, y: 1320 }],
  // West bridge, up to the west road.
  [{ x: 425, y: 1310 }, { x: 425, y: 1080 }, { x: 425, y: 980 }, { x: 420, y: 860 }],
  // East bridge, up to the east road.
  [{ x: 1925, y: 1295 }, { x: 1925, y: 1080 }, { x: 1925, y: 980 }, { x: 2000, y: 800 }],
  // The bank walk along the Lode's north side.
  [{ x: 230, y: 948 }, { x: 900, y: 952 }, { x: 1500, y: 952 }, { x: 2350, y: 948 }],
  // Down to the rot pits.
  [{ x: 700, y: 1305 }, { x: 690, y: 1370 }],
];

export const WAYSTONE: Pt = { x: 2230, y: 720 };
export const SPAWN: Pt = { x: 2260, y: 800 };
