import type { Pt, Rect, Solid } from '../../../../IslesTypes';

/**
 * Where everything in the trench city stands. The painter, the solids and the NPC/POI
 * placement all read these numbers, so a moved building moves its collision with it.
 *
 *          ~~~~~~~ bubble wall ~~~~~~~ [MAELSTROM STAIR] ~~~~~~~ bubble wall ~~~~~~~
 *   THE GAPE (Lanternjaw's skull-palace)   |  rib arch      Kelp Altar (Varn)
 *    hull-houses     Breathworks           |  rib arch               coral gardens (Siph)
 *                                    LAMPLIGHT SQUARE  ── east road ── THE TRENCH (Dorrit's jetty)
 *   WHALE FALL (Orla) ── west road ──  (the Great Lamp)                 (Holloway's dive)
 *   Coddle's bone-yard                     |  rib arch
 *   hull-houses ── lamplighters' row ──    |  rib arch ── hull-houses (Ostrac hides here)
 *                                  bell landing · waystone
 *                                       s→tidewater
 */

export const W = 2400;
export const H = 1800;

/** The maelstrom stair's mouth on the north rim: the Undertow door. */
export const STAIR = { x: 1200, y: 150 };
/** Where the dungeon's door back lands you — kept clear. */
export const STAIR_LANDING = { x: 1200, y: 270 };

/** Prince Lanternjaw's palace — an anglerfish skull the size of a church. `y` is its base line. */
export const GAPE = { x: 520, y: 470 };
/** The tide-priests' altar (Varn's). */
export const SHRINE = { x: 1640, y: 300 };
/** Lamplight Square and the Great Lamp at its heart. */
export const PLAZA = { x: 1200, y: 1000, r: 190 };
export const GREAT_LAMP = { x: 1200, y: 990 };
/** The bubble pumps: bellows that drag air down the trench pipe. */
export const BREATHWORKS = { x: 880, y: 880 };
/** Purser Gilly's shop — a diving bell turned on its side and given a counter. */
export const SHOP = { x: 1010, y: 1080 };
/** The bell landing — the bell-lift that brings people down from Tidewater. */
export const BELL = { x: 1050, y: 1650 };

/** The trench fissure — the floor of the city opens into the true deep here. */
export const TRENCH: Rect = { x: 1800, y: 960, w: 420, h: 260 };

/** The whale fall: a skull to the west and a spine running east to the flukes. */
export const WHALE_SKULL = { x: 260, y: 1240 };
export const WHALE_SPINE: Pt[] = [
  { x: 360, y: 1232 }, { x: 470, y: 1214 }, { x: 580, y: 1192 }, { x: 690, y: 1164 }, { x: 800, y: 1128 }, { x: 900, y: 1086 },
];
/** Rib pairs: a spine index position (fraction along) and the rib's reach either side. */
export const WHALE_RIBS: { t: number; reach: number; h: number }[] = [
  { t: 0.06, reach: 74, h: 118 }, { t: 0.17, reach: 80, h: 128 }, { t: 0.28, reach: 82, h: 132 },
  { t: 0.39, reach: 80, h: 126 }, { t: 0.5, reach: 74, h: 116 }, { t: 0.61, reach: 64, h: 100 }, { t: 0.71, reach: 52, h: 82 },
];

/** Whale-rib arches spanning the processional road (their feet stand either side of it). */
export const RIB_ARCHES: number[] = [1450, 1180, 790, 610, 430];
export const ARCH_HALF = 96;

export const ROADS: { pts: Pt[]; w: number }[] = [
  // The processional: bell landing to the maelstrom stair.
  { pts: [{ x: 1200, y: 1800 }, { x: 1200, y: 1560 }, { x: 1210, y: 1300 }, { x: 1200, y: 1000 }, { x: 1190, y: 700 }, { x: 1200, y: 420 }, { x: 1200, y: 210 }], w: 62 },
  // West road to the whale fall.
  { pts: [{ x: 1200, y: 1000 }, { x: 960, y: 1020 }, { x: 790, y: 1090 }, { x: 840, y: 1200 }, { x: 720, y: 1320 }], w: 44 },
  // The palace road.
  { pts: [{ x: 1190, y: 700 }, { x: 960, y: 650 }, { x: 740, y: 600 }, { x: 540, y: 560 }], w: 46 },
  // East road to the trench jetty.
  { pts: [{ x: 1200, y: 1000 }, { x: 1440, y: 1000 }, { x: 1620, y: 1050 }, { x: 1760, y: 1090 }], w: 42 },
  // North-east: to the coral gardens.
  { pts: [{ x: 1200, y: 540 }, { x: 1440, y: 560 }, { x: 1700, y: 520 }, { x: 1960, y: 560 }], w: 38 },
  // Altar path.
  { pts: [{ x: 1200, y: 360 }, { x: 1400, y: 400 }, { x: 1560, y: 370 }], w: 34 },
  // South-east: the hull-houses.
  { pts: [{ x: 1210, y: 1380 }, { x: 1460, y: 1450 }, { x: 1720, y: 1450 }, { x: 1950, y: 1500 }, { x: 2080, y: 1440 }], w: 38 },
  // South-west: lamplighters' row.
  { pts: [{ x: 1200, y: 1520 }, { x: 960, y: 1540 }, { x: 720, y: 1570 }, { x: 460, y: 1520 }, { x: 330, y: 1450 }], w: 40 },
];

/** Hull-houses: drowned ships stood on end, roofed with their own keels. `s` scales them. */
export const HOUSES: { x: number; y: number; s: number; flip: boolean }[] = [
  { x: 330, y: 1600, s: 1.0, flip: false }, { x: 560, y: 1690, s: 0.95, flip: true }, { x: 820, y: 1690, s: 1.05, flip: false },
  { x: 230, y: 760, s: 0.9, flip: true }, { x: 900, y: 420, s: 0.85, flip: false },
  { x: 1500, y: 1680, s: 1.0, flip: true }, { x: 1740, y: 1660, s: 1.1, flip: false }, { x: 1980, y: 1620, s: 0.95, flip: true },
  { x: 2140, y: 1360, s: 0.9, flip: false }, { x: 1480, y: 1230, s: 0.8, flip: false },
];

/** Bioluminescent coral clumps (x, y = foot; s = size; hue). */
export const CORALS: { x: number; y: number; s: number; hue: 'cyan' | 'rose' | 'violet' }[] = [
  { x: 1820, y: 420, s: 1.2, hue: 'cyan' }, { x: 2050, y: 380, s: 1.4, hue: 'rose' }, { x: 2180, y: 560, s: 1.1, hue: 'violet' },
  { x: 1960, y: 730, s: 1.0, hue: 'cyan' }, { x: 2140, y: 780, s: 1.3, hue: 'rose' }, { x: 1750, y: 640, s: 0.9, hue: 'violet' },
  { x: 2250, y: 440, s: 0.8, hue: 'cyan' },
  // Strays round the city.
  { x: 1440, y: 880, s: 0.7, hue: 'rose' }, { x: 700, y: 760, s: 0.8, hue: 'cyan' }, { x: 380, y: 980, s: 0.9, hue: 'violet' },
  { x: 1660, y: 1560, s: 0.75, hue: 'cyan' }, { x: 160, y: 1180, s: 0.8, hue: 'rose' },
];

/** Anglerfish street-lamps: a live angler in a glass globe hung from a bone hook. */
export const LAMPS: Pt[] = [
  { x: 1130, y: 1640 }, { x: 1275, y: 1500 }, { x: 1125, y: 1250 }, { x: 1280, y: 860 }, { x: 1120, y: 740 }, { x: 1280, y: 500 },
  { x: 1110, y: 320 }, { x: 1290, y: 300 },
  { x: 900, y: 1100 }, { x: 880, y: 1180 }, { x: 980, y: 600 }, { x: 700, y: 640 },
  { x: 1450, y: 950 }, { x: 1650, y: 1000 }, { x: 1540, y: 500 }, { x: 1830, y: 600 },
  { x: 1400, y: 1520 }, { x: 1830, y: 1510 }, { x: 900, y: 1590 }, { x: 600, y: 1520 },
];

/** Kelp stands — drowned weed that grew tall in the still air and dried upright. */
export const KELP: Pt[] = [
  { x: 150, y: 420 }, { x: 860, y: 260 }, { x: 1520, y: 760 }, { x: 2260, y: 1120 }, { x: 2260, y: 1240 },
  { x: 140, y: 1440 }, { x: 1340, y: 1700 }, { x: 980, y: 1300 }, { x: 1720, y: 860 },
];

/** Vertebrae lying about like boulders — used as seats, walls, doorsteps. */
export const VERTEBRAE: { x: number; y: number; s: number }[] = [
  { x: 1380, y: 1150 }, { x: 1010, y: 860 }, { x: 640, y: 1420 }, { x: 1580, y: 1340 }, { x: 2000, y: 1300 }, { x: 420, y: 880 },
  { x: 1360, y: 680 }, { x: 760, y: 470 },
].map((v, i) => ({ ...v, s: 0.8 + (i % 3) * 0.2 }));

/** The pipe from the Breathworks to the bubble wall, where it drinks from the trench vents. */
export const PIPE: Pt[] = [
  { x: 820, y: 850 }, { x: 640, y: 820 }, { x: 420, y: 800 }, { x: 260, y: 860 }, { x: 140, y: 900 }, { x: 60, y: 900 },
];

const ribFeet = (): Solid[] => {
  const out: Solid[] = [];
  const L = WHALE_SPINE.length - 1;
  for (const r of WHALE_RIBS) {
    const f = r.t * L;
    const i = Math.min(L - 1, Math.floor(f));
    const k = f - i;
    const a = WHALE_SPINE[i], b = WHALE_SPINE[i + 1];
    const x = a.x + (b.x - a.x) * k, y = a.y + (b.y - a.y) * k;
    const ang = Math.atan2(b.y - a.y, b.x - a.x);
    const nx = -Math.sin(ang), ny = Math.cos(ang);
    out.push({ kind: 'circle', x: x + nx * r.reach, y: y + ny * r.reach, r: 13 });
    out.push({ kind: 'circle', x: x - nx * r.reach, y: y - ny * r.reach, r: 13 });
  }
  return out;
};

/** A point on the whale's spine, `t` 0 (skull) – 1 (flukes). */
export function spineAt(t: number): { x: number; y: number; a: number } {
  const L = WHALE_SPINE.length - 1;
  const f = Math.max(0, Math.min(0.999, t)) * L;
  const i = Math.floor(f), k = f - i;
  const a = WHALE_SPINE[i], b = WHALE_SPINE[i + 1];
  return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, a: Math.atan2(b.y - a.y, b.x - a.x) };
}

export const SOLIDS: Solid[] = [
  // The bubble wall — curved in at the corners, a strip open south for the road up.
  { kind: 'rect', x: 0, y: 0, w: W, h: 118 },
  { kind: 'rect', x: 0, y: 0, w: 78, h: H },
  { kind: 'rect', x: W - 78, y: 0, w: 78, h: H },
  { kind: 'rect', x: 0, y: H - 48, w: 1120, h: 48 },
  { kind: 'rect', x: 1280, y: H - 48, w: W - 1280, h: 48 },
  { kind: 'circle', x: 0, y: 0, r: 270 },
  { kind: 'circle', x: W, y: 0, r: 270 },
  { kind: 'circle', x: 0, y: H, r: 250 },
  { kind: 'circle', x: W, y: H, r: 250 },
  // The maelstrom stair's mouth (its lip stops short of the door so you can stand at it).
  { kind: 'rect', x: 1040, y: 0, w: 320, h: 150 },
  { kind: 'circle', x: 1010, y: 160, r: 30 },
  { kind: 'circle', x: 1390, y: 160, r: 30 },
  // The Gape.
  { kind: 'rect', x: 300, y: 118, w: 440, h: 344 },
  { kind: 'circle', x: 310, y: 450, r: 26 },
  { kind: 'circle', x: 730, y: 450, r: 26 },
  // The Kelp Altar.
  { kind: 'rect', x: SHRINE.x - 70, y: SHRINE.y - 40, w: 140, h: 44 },
  // The Great Lamp.
  { kind: 'circle', x: GREAT_LAMP.x, y: GREAT_LAMP.y, r: 28 },
  // Breathworks.
  { kind: 'rect', x: BREATHWORKS.x - 80, y: BREATHWORKS.y - 56, w: 160, h: 60 },
  // Purser Gilly's bell-shop.
  { kind: 'rect', x: SHOP.x - 62, y: SHOP.y - 30, w: 124, h: 34 },
  // The bell landing.
  { kind: 'circle', x: BELL.x, y: BELL.y - 18, r: 46 },
  // The trench (its jetty is for looking, not walking).
  { kind: 'rect', x: TRENCH.x + 30, y: TRENCH.y + 26, w: TRENCH.w - 60, h: TRENCH.h - 52 },
  // The whale fall: the skull, and every rib's foot.
  { kind: 'rect', x: WHALE_SKULL.x - 92, y: WHALE_SKULL.y - 62, w: 170, h: 70 },
  ...ribFeet(),
  // Rib arches over the processional.
  ...RIB_ARCHES.flatMap((y): Solid[] => [
    { kind: 'circle', x: 1200 - ARCH_HALF, y: y - 4, r: 15 },
    { kind: 'circle', x: 1200 + ARCH_HALF, y: y - 4, r: 15 },
  ]),
  ...HOUSES.map((h): Solid => ({ kind: 'rect', x: h.x - 58 * h.s, y: h.y - 34, w: 116 * h.s, h: 36 })),
  ...CORALS.map((c): Solid => ({ kind: 'circle', x: c.x, y: c.y - 6, r: 24 * c.s })),
  ...LAMPS.map((l): Solid => ({ kind: 'circle', x: l.x, y: l.y - 3, r: 9 })),
  ...KELP.map((k): Solid => ({ kind: 'circle', x: k.x, y: k.y - 4, r: 16 })),
  ...VERTEBRAE.map((v): Solid => ({ kind: 'circle', x: v.x, y: v.y - 8, r: 22 * v.s })),
];
