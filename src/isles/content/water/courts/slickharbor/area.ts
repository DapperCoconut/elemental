import type { AreaDef, NpcLook, Solid } from '../../../../IslesTypes';
import {
  AREA_H, AREA_W, ASSAY, BOLLARDS, CRACKER, CRANE_LEGS, CRATES, DRUMS, FISH_WATER, FLARE, GALLEY, KEEP, KEEP_W,
  KETTLES, LAMPS, NODDERS, PIERS, PIPES, PIPE_R, SEA_Y, SHANTIES, SHOP, SLICKHARBOR_PAINTER, STACKS, TANKS, TAR_SHED,
  WEIGHHOUSE, WELD_TANK, WICKHOUSE,
} from './areaArt';
import { SLICKHARBOR_ENCOUNTERS } from './encounters';
import { SLICKHARBOR_CROWD_BARKS, SLICKHARBOR_NPCS } from './npcs';

/**
 * The Slickharbor Court — Prince Crude's oil port in the Drowned Reach's south-east. Enter from
 * Brinehollow in the west; the frosted road north climbs to Rimefast. The harbour (the Slick)
 * fills the south. See `areaArt.ts` for the layout every solid below is read from.
 */

/** The sea is solid between the jetties — the jetties themselves are walkable. */
const seaSolids = (): Solid[] => {
  const out: Solid[] = [];
  let x = 0;
  for (const p of [...PIERS].sort((a, b) => a.x - b.x)) {
    if (p.x > x) out.push({ kind: 'rect', x, y: SEA_Y, w: p.x - x, h: AREA_H - SEA_Y });
    x = p.x + p.w;
    // The pier's far end is open water too.
    out.push({ kind: 'rect', x: p.x, y: p.y + p.h, w: p.w, h: AREA_H - (p.y + p.h) });
  }
  out.push({ kind: 'rect', x, y: SEA_Y, w: AREA_W - x, h: AREA_H - SEA_Y });
  return out;
};

const solids: Solid[] = [
  // Refinery fence along the north edge, with the Rimefast road through its gap.
  { kind: 'rect', x: 0, y: 0, w: 1118, h: 112 },
  { kind: 'rect', x: 1282, y: 0, w: AREA_W - 1282, h: 112 },
  ...seaSolids(),
  // Lamphouse Hall's drum, the cracking tower, the flare stack.
  { kind: 'rect', x: KEEP.x - KEEP_W / 2, y: KEEP.y - 70, w: KEEP_W, h: 64 },
  { kind: 'circle', x: CRACKER.x, y: CRACKER.y - 14, r: 34 },
  { kind: 'circle', x: FLARE.x, y: FLARE.y - 8, r: 16 },
  // Tanks: the drum's footprint, not its height.
  ...TANKS.map((t): Solid => ({ kind: 'rect', x: t.x - t.r, y: t.y - t.r * 0.32, w: t.r * 2, h: t.r * 0.5 })),
  { kind: 'rect', x: WELD_TANK.x - WELD_TANK.r - 30, y: WELD_TANK.y - WELD_TANK.r * 0.3, w: WELD_TANK.r * 2 + 30, h: WELD_TANK.r * 0.5 },
  { kind: 'rect', x: WELD_TANK.x - 175, y: WELD_TANK.y - 6, w: 50, h: 34 },
  // Buildings.
  { kind: 'rect', x: WEIGHHOUSE.x - 140, y: WEIGHHOUSE.y - 46, w: 280, h: 46 },
  { kind: 'rect', x: SHOP.x - 90, y: SHOP.y - 40, w: 180, h: 40 },
  { kind: 'rect', x: GALLEY.x - 95, y: GALLEY.y - 40, w: 190, h: 40 },
  { kind: 'rect', x: WICKHOUSE.x - 70, y: WICKHOUSE.y - 32, w: 140, h: 32 },
  ...SHANTIES.map((s): Solid => ({ kind: 'rect', x: s.x - 60, y: s.y - 30, w: 120, h: 30 })),
  { kind: 'rect', x: TAR_SHED.x - 75, y: TAR_SHED.y - 32, w: 150, h: 32 },
  ...KETTLES.map((k): Solid => ({ kind: 'circle', x: k.x, y: k.y - 8, r: 24 })),
  { kind: 'rect', x: ASSAY.x - 55, y: ASSAY.y - 30, w: 110, h: 30 },
  // Pump-jacks: the skid and wellhead.
  ...NODDERS.map((n): Solid => ({ kind: 'rect', x: n.x - 70 * n.s, y: n.y - 16 * n.s, w: 130 * n.s, h: 16 * n.s })),
  ...STACKS.map((s): Solid => ({ kind: 'rect', x: s.x - 56, y: s.y - 26, w: 112, h: 26 })),
  // The crane stands on four legs; the road runs between them.
  ...CRANE_LEGS.map((l): Solid => ({ kind: 'circle', x: l.x, y: l.y - 4, r: 13 })),
  // Crude mains on their sleepers.
  ...PIPES.map((p): Solid => {
    const x0 = Math.min(p.a.x, p.b.x), x1 = Math.max(p.a.x, p.b.x);
    const y0 = Math.min(p.a.y, p.b.y), y1 = Math.max(p.a.y, p.b.y);
    return { kind: 'rect', x: x0 - PIPE_R, y: y0 - PIPE_R, w: x1 - x0 + PIPE_R * 2, h: y1 - y0 + PIPE_R * 2 };
  }),
  ...LAMPS.map((l): Solid => ({ kind: 'circle', x: l.x, y: l.y - 2, r: 5 })),
  ...BOLLARDS.map((bx): Solid => ({ kind: 'circle', x: bx, y: SEA_Y - 18, r: 8 })),
  ...CRATES.map((c): Solid => ({ kind: 'rect', x: c.x - 15, y: c.y - 14, w: 30, h: 14 })),
  ...DRUMS.map((d): Solid => ({ kind: 'circle', x: d.x, y: d.y - 4, r: 9 })),
];

const crowdLooks: NpcLook[] = [
  { body: 0x9a7a62, accent: 0x1e2a32, hat: 'souwester', traits: ['tool'], hand: 0x1a130d },
  { body: 0xc8a088, accent: 0x3a3e44, hat: 'cap', traits: ['bandage'], hand: 0x1a130d },
  { body: 0x7a5e4c, accent: 0x5a2a1a, hat: 'bandana', traits: ['apron'], size: 1.1 },
  { body: 0xb08868, accent: 0x2a3a4a, hat: 'beanie', traits: ['pack'], size: 0.85 },
  { body: 0x8a6a56, accent: 0xc8322a, hat: 'helmet', traits: ['tool', 'beard'], size: 1.2, hand: 0x121417 },
  { body: 0xd0b098, accent: 0x4a3a52, hat: 'hood', traits: ['scarf'], size: 0.95 },
];

export const SLICKHARBOR_AREA: AreaDef = {
  id: 'slickharbor',
  isle: 'water',
  court: 'slickharbor',
  name: 'The Slickharbor Court',
  subtitle: 'A coin a head, or a barrel a head. The Queen\'s lamps never go out.',
  w: AREA_W,
  h: AREA_H,
  bg: 0x14232a,
  accent: 0xd8a840,
  weather: 'smoke',
  spawn: { x: 150, y: 800 },
  painter: SLICKHARBOR_PAINTER,
  solids,
  exits: [
    { side: 'w', to: 'brinehollow', label: 'To Brinehollow' },
    { side: 'n', to: 'rimefast', label: 'To the Rimefast Court' },
  ],
  pois: [
    ...SLICKHARBOR_ENCOUNTERS.map((e) => ({ kind: 'encounter' as const, id: e.id })),
    { kind: 'prince', id: 'crude', at: { x: KEEP.x, y: KEEP.y + 52 } },
    { kind: 'waystone', at: { x: 170, y: 868 } },
    { kind: 'water', id: 'slickharbor-slick', shape: FISH_WATER, fishery: 'slickharbor-slick' },
    {
      kind: 'sign', at: { x: 240, y: 860 },
      text: 'SLICKHARBOR. The Queen\'s Lamps burn on our oil. Dry Tithe: one coin a head, or one barrel a head. — CRUDE',
    },
    {
      kind: 'sign', at: { x: WEIGHHOUSE.x - 150, y: WEIGHHOUSE.y + 30 },
      text: 'THE BARREL TITHE. Short weight is theft from the Crown. Households short at the spring tide are LEFT UNDER.',
    },
    {
      kind: 'sign', at: { x: 600, y: SEA_Y - 40 },
      text: 'THE SLICK. Royal water. One fish in three is owed the tithe-barge. Iron rods only — tar eats wood.',
    },
    {
      kind: 'sign', at: { x: 1260, y: 150 },
      text: 'NORTH TO RIMEFAST. Ice road. The tankers stop running when the harbour freezes. The tithe does not.',
    },
    { kind: 'chest', id: 'slickharbor-chest-slipway', at: { x: 2330, y: 1180 }, coins: 70, orbs: 1 },
    { kind: 'chest', id: 'slickharbor-chest-sunk-row', at: { x: 60, y: 1290 }, coins: 35, open: { prince: 'crude' } },
  ],
  npcs: SLICKHARBOR_NPCS,
  crowd: {
    count: 11,
    looks: crowdLooks,
    paths: [
      [{ x: 160, y: 800 }, { x: 560, y: 822 }, { x: 900, y: 822 }, { x: 1200, y: 800 }, { x: 1600, y: 792 }, { x: 2050, y: 800 }],
      [{ x: 1200, y: 160 }, { x: 1200, y: 460 }, { x: 1200, y: 800 }, { x: 1230, y: 1000 }, { x: 1250, y: 1260 }],
      [{ x: 120, y: 1270 }, { x: 700, y: 1270 }, { x: 1250, y: 1270 }, { x: 1650, y: 1270 }, { x: 2300, y: 1270 }],
      [{ x: 470, y: 452 }, { x: 700, y: 486 }, { x: 950, y: 472 }, { x: 1200, y: 462 }],
      [{ x: 560, y: 822 }, { x: 560, y: 1000 }, { x: 520, y: 1250 }, { x: 478, y: 1480 }],
      [{ x: 2050, y: 800 }, { x: 2020, y: 1000 }, { x: 1990, y: 1260 }, { x: 1988, y: 1480 }],
    ],
    barks: SLICKHARBOR_CROWD_BARKS,
  },
};
