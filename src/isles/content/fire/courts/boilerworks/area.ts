import type { AreaDef, NpcLook, Solid } from '../../../../IslesTypes';
import {
  AREA_H, AREA_W, BATHHOUSE, BELL_TOWER, BOILERWORKS_PAINTER, BUNKS, GANTRIES, GAUGE_POSTS, GROUND_PIPES, HAMMERS,
  HOPPER, KESSEL_BOILER, LAMPS, MANIFOLD, POND, STORE, TOWER, BANNERS, CRATES, BARRELS, ROCKS,
} from './areaArt';
import { BOILERWORKS_ENCOUNTERS } from './encounters';
import { BOILERWORKS_CROWD_BARKS, BOILERWORKS_NPCS } from './npcs';

/**
 * The Boilerworks Court — Prince Gauge's steam factory yard. Enter from the Hearth Court in the
 * east; the road to the Powder Court leaves from the south. See `areaArt.ts` for the layout.
 */

const solids: Solid[] = [
  // Factory wall along the north edge.
  { kind: 'rect', x: 0, y: 0, w: AREA_W, h: 124 },
  // The Great Boiler and control tower.
  { kind: 'rect', x: TOWER.x - 250, y: TOWER.y - 100, w: 500, h: 100 },
  // The cooling pond's basin.
  { kind: 'rect', x: POND.x - 10, y: POND.y - 10, w: POND.w + 20, h: POND.h + 20 },
  { kind: 'rect', x: HOPPER.x - 55, y: HOPPER.y - 30, w: 110, h: 30 },
  { kind: 'rect', x: BELL_TOWER.x - 38, y: BELL_TOWER.y - 25, w: 76, h: 25 },
  { kind: 'rect', x: KESSEL_BOILER.x - 62, y: KESSEL_BOILER.y - 30, w: 124, h: 30 },
  { kind: 'rect', x: MANIFOLD.x - 76, y: MANIFOLD.y - 30, w: 152, h: 30 },
  { kind: 'rect', x: STORE.x - 100, y: STORE.y - 40, w: 200, h: 40 },
  { kind: 'rect', x: BATHHOUSE.x - 85, y: BATHHOUSE.y - 40, w: 170, h: 40 },
  ...BUNKS.map((b): Solid => ({ kind: 'rect', x: b.x - 75, y: b.y - 45, w: 150, h: 45 })),
  ...HAMMERS.map((h): Solid => ({ kind: 'rect', x: h.x - 50, y: h.y - 30, w: 100, h: 30 })),
  // Ground-level copper mains.
  ...GROUND_PIPES.map((p): Solid => {
    const x0 = Math.min(p.a.x, p.b.x), x1 = Math.max(p.a.x, p.b.x);
    const y0 = Math.min(p.a.y, p.b.y), y1 = Math.max(p.a.y, p.b.y);
    return { kind: 'rect', x: x0 - p.r, y: y0 - p.r, w: x1 - x0 + p.r * 2, h: y1 - y0 + p.r * 2 };
  }),
  // Gantry legs — only the legs; you walk under the mains.
  ...GANTRIES.flatMap((gt) => gt.legs.map((l): Solid => ({ kind: 'circle', x: l.x, y: l.y - 2, r: 10 }))),
  ...GAUGE_POSTS.map((p): Solid => ({ kind: 'circle', x: p.x, y: p.y - 2, r: 8 })),
  ...LAMPS.map((l): Solid => ({ kind: 'circle', x: l.x, y: l.y - 2, r: 5 })),
  ...BANNERS.map((b): Solid => ({ kind: 'circle', x: b.x, y: b.y - 2, r: 5 })),
  ...CRATES.map((c): Solid => ({ kind: 'rect', x: c.x - 14, y: c.y - 14, w: 28, h: 14 })),
  ...BARRELS.map((b): Solid => ({ kind: 'circle', x: b.x, y: b.y - 4, r: 9 })),
  ...ROCKS.map((r): Solid => ({ kind: 'circle', x: r.x, y: r.y - 4, r: 18 })),
];

const crowdLooks: NpcLook[] = [
  { body: 0x9a7a62, accent: 0x2a2420, hat: 'cap', traits: ['brand'] },
  { body: 0xc89a7a, accent: 0x3a3e44, hat: 'goggles', traits: ['brand', 'tool'] },
  { body: 0x7a5a48, accent: 0x5a2a1a, hat: 'bandana', traits: ['brand', 'bandage'] },
  { body: 0xb08868, accent: 0x2a3a4a, hat: 'beanie', traits: ['brand', 'pack'], size: 0.9 },
  { body: 0x8a6a56, accent: 0x1c1a18, hat: 'helmet', traits: ['brand'], size: 1.15 },
];

export const BOILERWORKS_AREA: AreaDef = {
  id: 'boilerworks',
  isle: 'fire',
  court: 'boilerworks',
  name: 'The Boilerworks Court',
  subtitle: 'The King\'s boilers never sleep. Neither does anyone who feeds them.',
  w: AREA_W,
  h: AREA_H,
  bg: 0x2f2b28,
  accent: 0xb5683a,
  weather: 'steam',
  spawn: { x: 2250, y: 800 },
  painter: BOILERWORKS_PAINTER,
  solids,
  exits: [
    { side: 'e', to: 'hearth', label: 'To the Hearth Court' },
    { side: 's', to: 'powder', label: 'To the Powder Court' },
  ],
  pois: [
    ...BOILERWORKS_ENCOUNTERS.map((e) => ({ kind: 'encounter' as const, id: e.id })),
    { kind: 'prince', id: 'gauge', at: { x: TOWER.x, y: TOWER.y + 72 } },
    { kind: 'waystone', at: { x: 2215, y: 905 } },
    { kind: 'water', id: 'boilerworks-pond', shape: POND, fishery: 'boilerworks-pond' },
    {
      kind: 'sign', at: { x: 2290, y: 690 },
      text: 'THE BOILERWORKS. By Royal Warrant. Pressure is Loyalty. Loitering is three marks. — G.',
    },
    {
      kind: 'sign', at: { x: 1745, y: 1262 },
      text: 'SHIFT ROSTER: First shift 18 hrs. Second shift 18 hrs. Rest: as the bell allows.',
    },
    {
      kind: 'sign', at: { x: 560, y: 1060 },
      text: 'COOLING POND. Company property. Fish are company property. Iron rods only — steam warps wood.',
    },
    { kind: 'chest', id: 'boilerworks-chest-pipe-nook', at: { x: 300, y: 250 }, coins: 60, orbs: 1 },
  ],
  npcs: BOILERWORKS_NPCS,
  crowd: {
    count: 10,
    looks: crowdLooks,
    paths: [
      [{ x: 2150, y: 800 }, { x: 1900, y: 800 }, { x: 1500, y: 760 }, { x: 1200, y: 700 }, { x: 800, y: 720 }, { x: 520, y: 820 }],
      [{ x: 1200, y: 520 }, { x: 1200, y: 1000 }, { x: 1220, y: 1300 }, { x: 1200, y: 1480 }],
      [{ x: 1220, y: 1150 }, { x: 1600, y: 1250 }, { x: 2150, y: 1250 }],
      [{ x: 1500, y: 760 }, { x: 1650, y: 580 }, { x: 1860, y: 560 }],
      [{ x: 1220, y: 1300 }, { x: 880, y: 1300 }, { x: 720, y: 1300 }, { x: 700, y: 1060 }, { x: 460, y: 990 }],
    ],
    barks: BOILERWORKS_CROWD_BARKS,
  },
};
