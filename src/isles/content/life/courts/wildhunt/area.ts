import type { AreaDef, NpcLook, Solid } from '../../../../IslesTypes';
import {
  AREA_H, AREA_W, COTTAGES, FISH_WATER, FORD_Y0, FORD_Y1, GRIMBLE_HUT, HIGH_SEAT, HORN_TOWER, KENNELS,
  KENNEL_RUN, LARDER, LODGE, LODGE_W, LONG_HALL, LONG_HALL_W, MEWS, NORTH_GATE, PALING, PENS, ROYAL_STAND,
  SHOP, TREES, WEST_GATE, WILDHUNT_PAINTER, riverHW, riverX,
} from './areaArt';
import { WILDHUNT_ENCOUNTERS } from './encounters';
import { WILDHUNT_CROWD_BARKS, WILDHUNT_NPCS } from './npcs';

/**
 * The Wildhunt Court — Prince Fang's lodge town in Thornwild's south-east forest. Enter from
 * Mossgate in the west; the bone-marked road north climbs to the Ossuary. The river cuts the
 * court in two and can only be crossed at the Ford; Fangholt, the mews and the Empress's stand
 * are on the far bank. See `areaArt.ts` for the layout every solid below is read from.
 */

/** The river is solid bank to bank, except through the Ford's shallows. */
const riverSolids = (): Solid[] => {
  const out: Solid[] = [];
  for (let y = 0; y < AREA_H; y += 20) {
    if (y + 20 > FORD_Y0 && y < FORD_Y1) continue;
    const cy = y + 10, hw = riverHW(cy) - 6;
    out.push({ kind: 'rect', x: riverX(cy) - hw, y, w: hw * 2, h: 20 });
  }
  return out;
};

const solids: Solid[] = [
  ...riverSolids(),
  // The Long Hall, the shop, the cottages, the kennels and their run, the pens.
  { kind: 'rect', x: LONG_HALL.x - LONG_HALL_W / 2 - 8, y: LONG_HALL.y - 44, w: LONG_HALL_W + 16, h: 44 },
  { kind: 'circle', x: LONG_HALL.x - 70, y: LONG_HALL.y + 28, r: 12 },
  { kind: 'circle', x: LONG_HALL.x + 70, y: LONG_HALL.y + 28, r: 12 },
  { kind: 'rect', x: SHOP.x - 106, y: SHOP.y - 36, w: 212, h: 36 },
  { kind: 'circle', x: SHOP.x + 120, y: SHOP.y - 4, r: 16 },
  ...COTTAGES.map((c): Solid => ({ kind: 'rect', x: c.x - 100, y: c.y - 34, w: 186, h: 34 })),
  { kind: 'rect', x: KENNELS.x - 136, y: KENNELS.y - 50, w: 272, h: 46 },
  { kind: 'rect', x: KENNEL_RUN.x, y: KENNEL_RUN.y, w: KENNEL_RUN.w, h: KENNEL_RUN.h },
  { kind: 'rect', x: KENNELS.x + 78, y: KENNELS.y + 38, w: 54, h: 18 },
  { kind: 'rect', x: PENS.x - 6, y: PENS.y - 6, w: PENS.w + 12, h: PENS.h + 12 },
  // The Game Larder's posts, tally board and block.
  { kind: 'circle', x: LARDER.x - 96, y: LARDER.y - 4, r: 11 },
  { kind: 'circle', x: LARDER.x + 96, y: LARDER.y - 4, r: 11 },
  { kind: 'rect', x: LARDER.x + 36, y: LARDER.y - 12, w: 50, h: 12 },
  { kind: 'circle', x: LARDER.x - 60, y: LARDER.y - 8, r: 16 },
  // Horn tower legs, high seat legs, the Empress's stand legs.
  ...[-36, -14, 14, 36].map((l): Solid => ({ kind: 'circle', x: HORN_TOWER.x + l, y: HORN_TOWER.y - 3, r: 7 })),
  ...[-24, 24].map((l): Solid => ({ kind: 'circle', x: HIGH_SEAT.x + l, y: HIGH_SEAT.y - 3, r: 7 })),
  ...[-46, -18, 18, 46].map((l): Solid => ({ kind: 'circle', x: ROYAL_STAND.x + l, y: ROYAL_STAND.y - 3, r: 8 })),
  // Fangholt, its hound plinths, the mews and its perching block.
  { kind: 'rect', x: LODGE.x - LODGE_W / 2 - 10, y: LODGE.y - 60, w: LODGE_W + 20, h: 60 },
  { kind: 'rect', x: LODGE.x - 176, y: LODGE.y + 16, w: 52, h: 24 },
  { kind: 'rect', x: LODGE.x + 124, y: LODGE.y + 16, w: 52, h: 24 },
  { kind: 'rect', x: MEWS.x - 94, y: MEWS.y - 40, w: 188, h: 40 },
  { kind: 'circle', x: MEWS.x - 120, y: MEWS.y + 4, r: 8 },
  // Grimble's lean-to and charcoal clamp.
  { kind: 'rect', x: GRIMBLE_HUT.x - 92, y: GRIMBLE_HUT.y - 28, w: 184, h: 28 },
  { kind: 'circle', x: GRIMBLE_HUT.x + 120, y: GRIMBLE_HUT.y - 8, r: 28 },
  // The deer park's paling and the gateposts.
  ...PALING.map((p): Solid => ({ kind: 'circle', x: p.x, y: p.y - 2, r: 7 })),
  ...WEST_GATE.map((p): Solid => ({ kind: 'circle', x: p.x, y: p.y - 4, r: 10 })),
  ...NORTH_GATE.map((p): Solid => ({ kind: 'circle', x: p.x, y: p.y - 4, r: 10 })),
  // Tree trunks — the base, never the crown.
  ...TREES.map((t): Solid => ({ kind: 'circle', x: t.x, y: t.y - 4, r: t.s * (t.kind === 'oak' ? 0.24 : 0.18) })),
];

const crowdLooks: NpcLook[] = [
  { body: 0xc89a78, accent: 0x2a4a2a, hat: 'hood', traits: ['satchel'], hand: 0x3e2a1a },
  { body: 0xb08868, accent: 0x8a2a1e, hat: 'cap', traits: ['beard', 'tool'], size: 1.15 },
  { body: 0xd8b494, accent: 0x5a4a32, hat: 'none', traits: ['apron', 'scarf'], size: 0.95 },
  { body: 0x9a7254, accent: 0x3a3226, hat: 'antlers', traits: ['bandage'], size: 1.05 },
  { body: 0xc8a486, accent: 0x6a5a3a, hat: 'beanie', traits: ['pack'], size: 0.8 },
  { body: 0xa87e60, accent: 0x2a4a2a, hat: 'tricorn', traits: ['pipe', 'cane'], size: 1.1 },
];

export const WILDHUNT_AREA: AreaDef = {
  id: 'wildhunt',
  isle: 'life',
  court: 'wildhunt',
  name: 'The Wildhunt Court',
  subtitle: 'Short at the Tithe? Then you run. The Prince gives you to the count of a hundred.',
  w: AREA_W,
  h: AREA_H,
  bg: 0x1a1a10,
  accent: 0x8a2a1e,
  weather: 'leaves',
  spawn: { x: 210, y: 800 },
  painter: WILDHUNT_PAINTER,
  solids,
  exits: [
    { side: 'w', to: 'mossgate', label: 'To Mossgate' },
    { side: 'n', to: 'ossuary', label: 'To the Ossuary Court' },
  ],
  pois: [
    ...WILDHUNT_ENCOUNTERS.map((e) => ({ kind: 'encounter' as const, id: e.id })),
    { kind: 'prince', id: 'fang', at: { x: LODGE.x, y: LODGE.y + 62 } },
    { kind: 'waystone', at: { x: 220, y: 905 } },
    { kind: 'water', id: 'wildhunt-ford', shape: FISH_WATER, fishery: 'wildhunt-ford' },
    {
      kind: 'sign', at: { x: 260, y: 735 },
      text: 'THE WILDHUNT. By leave of Prince Fang. The Bloom Tithe here is paid in game. Poachers will be run.',
    },
    {
      kind: 'sign', at: { x: LARDER.x - 150, y: LARDER.y + 40 },
      text: 'THE GAME LARDER. One brace a household a week. Short weight at the season\'s turn: the household runs.',
    },
    {
      kind: 'sign', at: { x: PENS.x - 40, y: PENS.y + PENS.h + 40 },
      text: 'QUARRY. Do not feed. Do not speak to. Caps to be worn at all times. By order of the Master of the Hunt.',
    },
    {
      kind: 'sign', at: { x: 1260, y: 205 },
      text: 'NORTH TO THE OSSUARY. Where the Prince\'s quarry go when the hunt is done.',
    },
    {
      kind: 'sign', at: { x: 1580, y: 760 },
      text: 'THE FORD. Cross at the stones. Hounds lose the scent in running water. So, it is said, do men.',
    },
    { kind: 'chest', id: 'wildhunt-chest-mews-wood', at: { x: 2330, y: 1180 }, coins: 80, orbs: 1 },
    { kind: 'chest', id: 'wildhunt-chest-poachers-cache', at: { x: 70, y: 1500 }, coins: 45, open: { prince: 'fang' } },
  ],
  npcs: WILDHUNT_NPCS,
  crowd: {
    count: 11,
    looks: crowdLooks,
    paths: [
      [{ x: 200, y: 805 }, { x: 520, y: 792 }, { x: 820, y: 790 }, { x: 1100, y: 796 }, { x: 1380, y: 815 }, { x: 1580, y: 830 }],
      [{ x: 1200, y: 230 }, { x: 1190, y: 480 }, { x: 1150, y: 700 }, { x: 1120, y: 790 }],
      [{ x: 520, y: 795 }, { x: 480, y: 960 }, { x: 430, y: 1130 }, { x: 420, y: 1290 }],
      [{ x: 1100, y: 800 }, { x: 1080, y: 960 }, { x: 1060, y: 1120 }],
      [{ x: 1860, y: 820 }, { x: 1980, y: 960 }, { x: 2080, y: 1070 }, { x: 2190, y: 1210 }],
      [{ x: 640, y: 720 }, { x: 860, y: 690 }, { x: 1080, y: 720 }],
    ],
    barks: WILDHUNT_CROWD_BARKS,
  },
};
