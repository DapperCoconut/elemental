import type { AreaDef, NpcLook, Solid } from '../../../../IslesTypes';
import {
  AREA_H, AREA_W, BEANSTALK, BONFIRE, BOOT, BRIDGE, COOP, EAST_GATE, FABLE_PAINTER, FISH_WATER, ISLAND, LAMPS,
  MIRROR, MOAT, NORTH_GATE, OFFICE, OFFICE_W, PIG_HOUSES, PIG_S, POPUPS, SHOP, SHOP_W, THEATRE, THEATRE_W,
  TOLLHOUSE, TOWER, TOWER_R, TREES, YARD, YARD_GATE, southEdge, westEdge,
} from './areaArt';
import { FABLE_ENCOUNTERS } from './encounters';
import { FABLE_CROWD_BARKS, FABLE_NPCS } from './npcs';

/**
 * The Fable Court — Prince Legend's storybook town on Highspire's south-western shoulder. Enter
 * from Windlass in the east through the book-arch; the north road climbs to Slumber. The land
 * ends west and south in a torn paper edge over the cloud sea. See `areaArt.ts` for the layout
 * every solid below is read from.
 */

/** The torn edge: everything past it is a drop into cloud. */
const edgeSolids = (): Solid[] => {
  const out: Solid[] = [];
  for (let y = 0; y < AREA_H; y += 40) out.push({ kind: 'rect', x: -40, y, w: westEdge(y + 20) + 34, h: 40 });
  for (let x = 0; x < AREA_W; x += 40) {
    const y = southEdge(x + 20) - 6;
    out.push({ kind: 'rect', x, y, w: 40, h: AREA_H - y + 40 });
  }
  return out;
};

const solids: Solid[] = [
  ...edgeSolids(),
  // Castle Evermore: the island and its moat, all but the drawbridge.
  { kind: 'rect', x: MOAT.x, y: MOAT.y, w: MOAT.w, h: ISLAND.y + ISLAND.h - MOAT.y },
  { kind: 'rect', x: MOAT.x, y: ISLAND.y + ISLAND.h, w: BRIDGE.x - MOAT.x, h: MOAT.y + MOAT.h - ISLAND.y - ISLAND.h },
  { kind: 'rect', x: BRIDGE.x + BRIDGE.w, y: ISLAND.y + ISLAND.h, w: MOAT.x + MOAT.w - BRIDGE.x - BRIDGE.w, h: MOAT.y + MOAT.h - ISLAND.y - ISLAND.h },
  // The Office of Licensed Tales, The Last Page, the Playhouse and its playbill.
  { kind: 'rect', x: OFFICE.x - OFFICE_W / 2 - 4, y: OFFICE.y - 44, w: OFFICE_W + 8, h: 44 },
  { kind: 'circle', x: OFFICE.x + 85, y: OFFICE.y - 4, r: 10 },
  { kind: 'rect', x: SHOP.x - SHOP_W / 2 - 4, y: SHOP.y - 36, w: SHOP_W + 10, h: 36 },
  { kind: 'rect', x: THEATRE.x - THEATRE_W / 2, y: THEATRE.y - 40, w: THEATRE_W, h: 40 },
  { kind: 'circle', x: THEATRE.x + THEATRE_W / 2 + 24, y: THEATRE.y - 2, r: 6 },
  // The tollhouse and its candy-cane posts.
  { kind: 'rect', x: TOLLHOUSE.x - 85, y: TOLLHOUSE.y - 36, w: 170, h: 36 },
  { kind: 'circle', x: TOLLHOUSE.x - 111, y: TOLLHOUSE.y - 2, r: 6 },
  { kind: 'circle', x: TOLLHOUSE.x + 111, y: TOLLHOUSE.y - 2, r: 6 },
  // The goose coop and its fence.
  { kind: 'rect', x: COOP.x - 46, y: COOP.y - 30, w: 92, h: 30 },
  { kind: 'rect', x: COOP.x - 74, y: COOP.y - 30, w: 8, h: 60 },
  // The dragon's tower and the pegs its chains are staked to.
  { kind: 'circle', x: TOWER.x, y: TOWER.y - 10, r: TOWER_R },
  { kind: 'circle', x: TOWER.x - 150, y: TOWER.y + 22, r: 9 },
  { kind: 'circle', x: TOWER.x + 160, y: TOWER.y + 12, r: 9 },
  { kind: 'circle', x: TOWER.x + 80, y: TOWER.y + 62, r: 9 },
  // The giant's boot, the beanstalk's root, the mirror garden.
  { kind: 'rect', x: BOOT.x - 120, y: BOOT.y - 36, w: 240, h: 36 },
  { kind: 'circle', x: BEANSTALK.x, y: BEANSTALK.y - 6, r: 28 },
  { kind: 'circle', x: MIRROR.x - 70, y: MIRROR.y - 4, r: 12 },
  { kind: 'circle', x: MIRROR.x + 70, y: MIRROR.y - 4, r: 12 },
  { kind: 'circle', x: MIRROR.x, y: MIRROR.y - 4, r: 16 },
  { kind: 'circle', x: MIRROR.x + 46, y: MIRROR.y - 6, r: 12 },
  // The bonfire and the censors' post.
  { kind: 'circle', x: BONFIRE.x, y: BONFIRE.y, r: 50 },
  { kind: 'circle', x: BONFIRE.x + 54, y: BONFIRE.y + 4, r: 6 },
  // Pop-up houses (the book lying on the ground), the three little houses.
  ...POPUPS.map((h): Solid => ({ kind: 'rect', x: h.x - 92, y: h.y - 60, w: 184, h: 60 })),
  ...PIG_HOUSES.map((p): Solid => ({ kind: 'rect', x: p.x - 32 * PIG_S, y: p.y - 30, w: 64 * PIG_S, h: 30 })),
  // The Banned Shelf's hedges and its stacks of seized books.
  { kind: 'rect', x: YARD.x - 10, y: YARD.y - 10, w: YARD.w + 20, h: 20 },
  { kind: 'rect', x: YARD.x - 10, y: YARD.y + YARD.h - 10, w: YARD.w + 20, h: 20 },
  { kind: 'rect', x: YARD.x + YARD.w - 10, y: YARD.y, w: 20, h: YARD.h },
  { kind: 'rect', x: YARD.x - 10, y: YARD.y, w: 20, h: YARD_GATE.y - YARD.y },
  { kind: 'rect', x: YARD.x - 10, y: YARD_GATE.y + YARD_GATE.h, w: 20, h: YARD.y + YARD.h - YARD_GATE.y - YARD_GATE.h },
  ...[[1400, 250], [1560, 260], [1420, 360], [1560, 360]].map(([x, y]): Solid => ({ kind: 'circle', x, y: y - 6, r: 18 })),
  // Gate posts, lamps, tree trunks (the base, never the crown).
  ...EAST_GATE.map((p): Solid => ({ kind: 'circle', x: p.x, y: p.y - 4, r: 22 })),
  ...NORTH_GATE.map((p): Solid => ({ kind: 'circle', x: p.x, y: p.y - 4, r: 20 })),
  ...LAMPS.map((l): Solid => ({ kind: 'circle', x: l.x, y: l.y - 2, r: 5 })),
  ...TREES.map((t): Solid => ({ kind: 'circle', x: t.x, y: t.y - 3, r: t.s * 0.14 + 4 })),
];

const crowdLooks: NpcLook[] = [
  { body: 0xe8c8a8, accent: 0x3e5c9a, hat: 'plume', traits: ['book', 'scarf'] },
  { body: 0xd8b494, accent: 0xb84a52, hat: 'cap', traits: ['apron'], size: 1.1 },
  { body: 0xf0d8c0, accent: 0x6a3e7a, hat: 'veil', traits: ['satchel'], size: 0.9 },
  { body: 0xc8a486, accent: 0x3e7a5e, hat: 'tricorn', traits: ['pipe', 'beard'], size: 1.15 },
  { body: 0xe0c0a0, accent: 0xe0b04a, hat: 'nightcap', traits: ['lantern'], size: 0.8 },
  { body: 0xd0a888, accent: 0x2a2236, hat: 'wizard', traits: ['cane', 'glasses'], size: 1.05 },
];

export const FABLE_AREA: AreaDef = {
  id: 'fable',
  isle: 'air',
  court: 'fable',
  name: 'The Fable Court',
  subtitle: 'Licensed tales only. Every word is a breath, and every breath is metered.',
  w: AREA_W,
  h: AREA_H,
  bg: 0xa8d8f4,
  accent: 0x7d5cff,
  weather: 'feathers',
  spawn: { x: 2230, y: 800 },
  painter: FABLE_PAINTER,
  solids,
  exits: [
    { side: 'e', to: 'windlass', label: 'To Windlass' },
    { side: 'n', to: 'slumber', label: 'To the Slumber Court' },
  ],
  pois: [
    ...FABLE_ENCOUNTERS.map((e) => ({ kind: 'encounter' as const, id: e.id })),
    { kind: 'prince', id: 'legend', at: { x: 520, y: 690 } },
    { kind: 'waystone', at: { x: 2220, y: 880 } },
    { kind: 'water', id: 'fable-moat', shape: FISH_WATER, fishery: 'fable-moat' },
    {
      kind: 'sign', at: { x: 2250, y: 730 },
      text: 'FABLE. By licence of Prince Legend. Tales told aloud are metered by the word. Unlicensed tales will be burned.',
    },
    {
      kind: 'sign', at: { x: 1160, y: 590 },
      text: 'THE OFFICE OF LICENSED TALES. Apply within. Bring your breath-meter. Endings must be approved.',
    },
    {
      kind: 'sign', at: { x: 1020, y: 940 },
      text: 'THE CENSORS\' FIRE. Do not read the smoke. Do not catch the pages. Do not hum.',
    },
    {
      kind: 'sign', at: { x: 1300, y: 190 },
      text: 'NORTH TO SLUMBER. Where the becalmed are laid down to sleep. Speak softly. It is cheaper.',
    },
    {
      kind: 'sign', at: { x: 470, y: 1250 },
      text: 'DO NOT WAKE THE DRAGON. The gold is fines and belongs to the Prince. The dragon disagrees.',
    },
    {
      kind: 'sign', at: { x: 230, y: 1410 },
      text: 'THE END OF THE PAGE. Nobody who stepped off has ever come back up to complain.',
    },
    { kind: 'chest', id: 'fable-chest-banned-shelf', at: { x: 1480, y: 300 }, coins: 90, orbs: 1 },
    { kind: 'chest', id: 'fable-chest-page-corner', at: { x: 2300, y: 1400 }, coins: 60 },
  ],
  npcs: FABLE_NPCS,
  crowd: {
    count: 11,
    looks: crowdLooks,
    paths: [
      [{ x: 2200, y: 800 }, { x: 1900, y: 806 }, { x: 1620, y: 808 }, { x: 1360, y: 828 }, { x: 1250, y: 840 }],
      [{ x: 1195, y: 720 }, { x: 1250, y: 560 }, { x: 1260, y: 400 }, { x: 1232, y: 220 }],
      [{ x: 1010, y: 822 }, { x: 790, y: 765 }, { x: 610, y: 712 }],
      [{ x: 1000, y: 945 }, { x: 830, y: 1080 }, { x: 620, y: 1170 }, { x: 460, y: 1225 }],
      [{ x: 1640, y: 830 }, { x: 1640, y: 1080 }, { x: 1645, y: 1300 }],
      [{ x: 1810, y: 790 }, { x: 1800, y: 620 }, { x: 2040, y: 545 }],
      [{ x: 1140, y: 1060 }, { x: 1160, y: 1240 }],
    ],
    barks: FABLE_CROWD_BARKS,
  },
  gates: [
    { rect: YARD_GATE, open: { prince: 'legend' }, look: 'book', label: 'The Banned Shelf' },
  ],
};
