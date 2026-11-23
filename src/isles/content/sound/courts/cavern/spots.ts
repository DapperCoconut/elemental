import type { Pt, Rect } from '../../../../IslesTypes';

/**
 * Where things stand in the Echo Caves — shared by the area, the champions, the people and the
 * quests, so nothing has to import the area to know where the pool is.
 *
 * Read the cave from the Brass road (east) in:
 * • **the cave mouth** (east): the tunnel from the Brass Court opens past the waystone onto Echo
 *   Street, the grotto houses cut into the north wall, more along the south;
 * • **the Chime Hall** (centre-east): the roof hangs low here and is strung with banded
 *   stalactites; the Tuners' listening post stands south of it, its horn turned to the mouth;
 * • **the Echo Wall** (north centre): the sheer flowstone face where the Score was sung in, with
 *   the choir niches at its foot and the cave-choir's stalls beside it;
 * • **the ringing pool** (centre-south) in its terraced gours, and the market corner by the
 *   crossing where Mabyn keeps her stall; the road down to Libretto leaves south from here;
 * • **the chasm** splits the cave north to south, crossed by two rope bridges (or round its
 *   foot); beyond it, **west**: the Sounding Shell (Prince Reprise's hall) at the back, the
 *   Whispering Gallery in the middle, and the Bat Hollow in the dark south-west corner.
 */

export const CAVERN_W = 2400;
export const CAVERN_H = 1600;

/** The walkable cave lies inside these walls. */
export const NORTH_Y = 210;
export const SOUTH_Y = 1535;
export const WEST_X = 64;
export const EAST_X = 2336;
export const EXIT_E_Y = 800;
export const EXIT_S_X = 1200;
export const GATE_HALF = 120;

/** Prince Reprise's hall — the base of its mouth. */
export const SHELL: Pt = { x: 430, y: 390 };
/** The Whispering Gallery: centre and radii of its floor. */
export const GALLERY: Pt = { x: 470, y: 860 };
export const GALLERY_RX = 230;
export const GALLERY_RY = 118;
/** The Bat Hollow roost. */
export const ROOST: Pt = { x: 400, y: 1320 };
/** The Echo Wall's foot. */
export const ECHO_WALL: Pt = { x: 1280, y: 330 };
export const ECHO_WALL_W = 520;
/** The cave-choir's stalls. */
export const CHOIR: Pt = { x: 1640, y: 340 };
/** The ringing pool — the court's fishing water. */
export const POOL_RECT: Rect = { x: 1300, y: 960, w: 440, h: 200 };
/** The Tuners' listening post. */
export const POST: Pt = { x: 2000, y: 1150 };
/** Mabyn's stall at the crossing. */
export const STALL: Pt = { x: 1020, y: 900 };
/** The middle of the Chime Hall. */
export const CHIME_HALL: Pt = { x: 1720, y: 640 };
/** The waystone inside the cave mouth. */
export const WAYSTONE: Pt = { x: 2180, y: 910 };

/** The chasm's centre line, top to foot. */
export const CHASM: Pt[] = [
  { x: 860, y: NORTH_Y - 20 }, { x: 842, y: 420 }, { x: 878, y: 620 }, { x: 852, y: 820 }, { x: 890, y: 1020 }, { x: 862, y: 1250 },
];
export const CHASM_W = 70;
/** The two rope bridges: y of the deck, and its ends. */
export const BRIDGES: { y: number; x0: number; x1: number }[] = [
  { y: 556, x0: 784, x1: 950 },
  { y: 1044, x0: 806, x1: 968 },
];
export const BRIDGE_HALF = 24;

/** The grotto houses: base points, and which have a muted household (the white ribbon). */
export const HOUSES: { x: number; y: number; w: number; h: number; muted?: boolean }[] = [
  { x: 1890, y: 400, w: 150, h: 120 },
  { x: 2080, y: 410, w: 140, h: 116, muted: true },
  { x: 2260, y: 400, w: 130, h: 110 },
  { x: 1560, y: 1500, w: 140, h: 110, muted: true },
  { x: 1780, y: 1505, w: 150, h: 116 },
  { x: 2010, y: 1500, w: 140, h: 110 },
  { x: 2230, y: 1505, w: 130, h: 108, muted: true },
  { x: 640, y: 1500, w: 140, h: 108 },
];

// Champions.
export const AT_MURMUR: Pt = { x: 470, y: 860 };
export const AT_DRIP: Pt = { x: 1720, y: 700 };
export const AT_HALLOO: Pt = { x: 1280, y: 440 };
export const AT_SQUEAL: Pt = { x: 1980, y: 1240 };
export const AT_CHIRRUP: Pt = { x: 420, y: 1410 };

/** The dead spot under the chasm's foot, where nothing comes back. */
export const DEAD_SPOT: Pt = { x: 900, y: 1400 };
