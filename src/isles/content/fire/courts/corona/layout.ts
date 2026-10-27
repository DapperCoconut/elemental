import type { Pt } from '../../../../IslesTypes';

/**
 * Where things stand on the Corona plateau. The painter, the solids, the NPCs and the quests all
 * read these one tables, so a moved pylon moves its arc, its collision and the quest pickups
 * that sit beside it together.
 */

export const AREA_W = 2400;
export const AREA_H = 1600;

/** The plateau's sheer rim: north edge and east edge drop away into haze. */
export const RIM_N = 112;
export const RIM_E = 2290;

/** Prince Flux's laboratory-palace, under the sun cage (front wall's base line). */
export const PALACE = { x: 1300, y: 650, w: 460, h: 190 };

/** The observatory plaza in front of the palace — an orrery set into the glass. */
export const PLAZA = { x: 1300, y: 835, r: 150 };

/** Brightwell's Lenses — the court shop. */
export const SHOP = { x: 760, y: 640, w: 190, h: 120 };

/** Observatories: west (Q-7's containment vault behind it), north-east, and the small south one. */
export const OBS_W = { x: 560, y: 400, r: 92 };
export const OBS_NE = { x: 2060, y: 360, r: 104 };
export const OBS_S = { x: 1890, y: 1430, r: 70 };

/** The glass pool — fishing water. */
export const POOL = { x: 380, y: 1060, w: 380, h: 220 };

/** The magnetic bottle works: a tokamak torus on a brass cradle. */
export const BOTTLE = { x: 1700, y: 1300, rx: 150, ry: 62 };

/** The stone circle — the court's only shade. */
export const STONE_RING = { x: 2000, y: 1000, r: 175 };

/** The arc-pylon field: chains of pylons whose tops arc to each other. */
export const PYLON_CHAINS: Pt[][] = [
  [{ x: 1620, y: 520 }, { x: 1820, y: 500 }, { x: 2020, y: 560 }],
  [{ x: 1060, y: 1190 }, { x: 1420, y: 1170 }],
  [{ x: 360, y: 640 }, { x: 420, y: 880 }],
];
export const PYLON_H = 132;

/** Plasma conduits — glowing seams run out from under the palace across the glass. */
export const CONDUITS: Pt[][] = [
  [{ x: 1100, y: 640 }, { x: 960, y: 700 }, { x: 700, y: 712 }, { x: 430, y: 660 }, { x: 360, y: 645 }],
  [{ x: 1500, y: 620 }, { x: 1620, y: 528 }, { x: 1820, y: 508 }, { x: 2020, y: 566 }],
  [{ x: 1400, y: 660 }, { x: 1470, y: 950 }, { x: 1580, y: 1150 }, { x: 1690, y: 1240 }],
  [{ x: 1120, y: 520 }, { x: 900, y: 470 }, { x: 650, y: 410 }],
  [{ x: 1210, y: 668 }, { x: 1120, y: 960 }, { x: 1060, y: 1185 }],
  [{ x: 1420, y: 1175 }, { x: 1580, y: 1150 }],
];

/** Walkways: polished dark-glass lanes with brass studs. */
export const ROADS: Pt[][] = [
  [{ x: 0, y: 800 }, { x: 380, y: 790 }, { x: 760, y: 760 }, { x: 1150, y: 790 }, { x: 1300, y: 830 }],
  [{ x: 1300, y: 830 }, { x: 1285, y: 1060 }, { x: 1225, y: 1310 }, { x: 1200, y: 1600 }],
  [{ x: 1300, y: 830 }, { x: 1620, y: 870 }, { x: 1860, y: 960 }, { x: 2000, y: 1010 }],
  [{ x: 1470, y: 770 }, { x: 1720, y: 650 }, { x: 1940, y: 480 }, { x: 2060, y: 420 }],
  [{ x: 760, y: 760 }, { x: 650, y: 580 }, { x: 560, y: 450 }],
  [{ x: 840, y: 775 }, { x: 790, y: 960 }, { x: 700, y: 1010 }],
  [{ x: 1270, y: 1130 }, { x: 1480, y: 1230 }, { x: 1560, y: 1390 }],
  [{ x: 1225, y: 1330 }, { x: 940, y: 1400 }, { x: 640, y: 1395 }, { x: 330, y: 1330 }],
  [{ x: 1560, y: 1390 }, { x: 1820, y: 1450 }],
];

/** Lone standing stones out on the glass, beyond the ring. */
export const LONE_STONES: { x: number; y: number; h: number }[] = [
  { x: 470, y: 560, h: 78 },
  { x: 960, y: 1080, h: 64 },
  { x: 1590, y: 730, h: 70 },
  { x: 2180, y: 1340, h: 88 },
  { x: 260, y: 1460, h: 60 },
];

/** Glazed sun-ration cottages, each with its ration mirror on a post. `cold` mirrors are turned away. */
export const COTTAGES: { x: number; y: number; w: number; cold?: boolean }[] = [
  { x: 240, y: 470, w: 120 },
  { x: 880, y: 360, w: 130 },
  { x: 240, y: 1220, w: 120 },
  { x: 980, y: 1545, w: 130, cold: true },
  { x: 640, y: 1550, w: 120 },
  { x: 1500, y: 1520, w: 120 },
];

/** Plasma lamps on the walkways: glass globes with a violet filament. */
export const LAMPS: Pt[] = [
  { x: 250, y: 760 }, { x: 560, y: 830 }, { x: 990, y: 740 }, { x: 1150, y: 860 }, { x: 1450, y: 860 },
  { x: 1750, y: 940 }, { x: 1340, y: 1080 }, { x: 1180, y: 1420 }, { x: 1610, y: 620 }, { x: 680, y: 640 },
];

/** Fulgurites — branched glass tubes where plasma struck the sand. */
export const FULGURITES: Pt[] = [
  { x: 180, y: 300 }, { x: 700, y: 250 }, { x: 1700, y: 220 }, { x: 2200, y: 640 }, { x: 2150, y: 1160 },
  { x: 1980, y: 1500 }, { x: 860, y: 1180 }, { x: 140, y: 1080 }, { x: 1440, y: 1400 }, { x: 560, y: 1240 },
];

export const WEST_GATE: Pt = { x: 40, y: 800 };
export const SOUTH_GATE: Pt = { x: 1200, y: 1560 };
export const WAYSTONE: Pt = { x: 230, y: 710 };
export const PRINCE_AT: Pt = { x: 1300, y: 712 };
