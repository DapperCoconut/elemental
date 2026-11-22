import type { Pt, Rect } from '../../../../IslesTypes';

/**
 * Terminus's ground plan — the one table the area, the people and the quests all read, so a house
 * moved here moves its owner and the quest that sends you to its door.
 *
 * The town is a cross: the Cableway runs north from the landing pier up to the Dynamo Court, and
 * Brownout Row runs east–west across it from the Bounce road to the Halflife road. The Meter House
 * sits on the corner where they cross, with the Brownout Bell on its gantry beside the road. South is
 * the quay and the black sea; the great cable comes ashore at its west end on iron trestles into the
 * Cable House, and the lightning-rod lighthouse stands on the basalt point beyond.
 */

export const W = 2600;
export const H = 1500;
/** Where the sea begins along the south. */
export const SEA_Y = 1300;
/** The quay's top edge (cobbles to the north, granite setts below). */
export const QUAY_Y = 1140;

/** The Cableway: the north road, x span. */
export const CABLEWAY = { x0: 1240, x1: 1360 };
/** Brownout Row: the cross street, y span. */
export const ROW = { y0: 700, y1: 800 };

/** The landing pier (walkable over the sea) — every crossing ties up at its end. */
export const PIER: Rect = { x: 1255, y: 1290, w: 90, h: 200 };
/** The fishers' jetty beside the cable's landfall. */
export const JETTY: Rect = { x: 580, y: 1290, w: 70, h: 160 };

/** The great cable's run from the sea onto the quay and into the Cable House. */
export const CABLE_RUN: Pt[] = [
  { x: 470, y: 1500 }, { x: 500, y: 1420 }, { x: 520, y: 1330 }, { x: 520, y: 1236 }, { x: 520, y: 1150 }, { x: 520, y: 1046 },
];
/** Trestles that carry it across the quay: foot points and heights. */
export const TRESTLES: [number, number, number][] = [[520, 1270, 46], [520, 1186, 62]];

/** Pylon feet and heights. Wires hang between neighbours (see `WIRES`). */
export const PYLONS: Record<string, [number, number, number]> = {
  cable: [760, 880, 190],
  cross: [1470, 880, 210],
  north1: [1470, 520, 200],
  north2: [1470, 170, 190],
  east1: [2000, 880, 190],
  east2: [2520, 900, 180],
  west1: [250, 880, 180],
};
/** Pylon pairs strung together, with the sag of each span. A null end runs off the map edge. */
export const WIRES: [string, string | Pt, number][] = [
  ['cable', 'cross', 46], ['cross', 'north1', 22], ['north1', 'north2', 22], ['north2', { x: 1470, y: -40 }, 14],
  ['cross', 'east1', 30], ['east1', 'east2', 34], ['east2', { x: 2660, y: 760 }, 20],
  ['cable', 'west1', 40], ['west1', { x: -60, y: 760 }, 24],
];

/** The old lamplighters' street lamps, cold since the lamplighters were earthed. */
export const LAMPS: Pt[] = [
  { x: 470, y: 694 }, { x: 1080, y: 822 }, { x: 1650, y: 694 }, { x: 2250, y: 822 }, { x: 1226, y: 300 },
  { x: 1226, y: 1000 }, { x: 780, y: 1150 }, { x: 1580, y: 1150 }, { x: 2160, y: 1150 }, { x: 860, y: 300 },
];

/** Where people stand. */
export const AT = {
  dock: { x: 1150, y: 1246 },
  store: { x: 1700, y: 604 },
  tackle: { x: 2380, y: 1156 },
  baker: { x: 2080, y: 606 },
  chalker: { x: 960, y: 606 },
  ringer: { x: 1110, y: 676 },
  pennick: { x: 240, y: 1004 },
  nan: { x: 300, y: 270 },
  captain: { x: 1950, y: 1262 },
  keeper: { x: 330, y: 1270 },
} satisfies Record<string, Pt>;

/** The houses and buildings the quests send you to. */
export const PLACES = {
  pennickDoor: { x: 236, y: 990 } as Pt,
  meterHouse: { x: 960, y: 560 } as Pt,
  lighthouse: { x: 210, y: 1240 } as Pt,
  bell: { x: 1180, y: 640 } as Pt,
  cableHouse: { x: 520, y: 1080 } as Pt,
};
