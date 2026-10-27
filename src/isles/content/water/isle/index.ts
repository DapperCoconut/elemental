import type { IsleBundle } from '../../../IslesTypes';
import { WATER_PORT } from './port';
import { WATER_DUNGEON } from './undertow';

/**
 * The Drowned Reach's isle-level content — everything that is not one of the six courts: the isle
 * def, Brinehollow (the harbour, its wanderer, sea fish and the whalebone rod) from `port/`, the
 * Undertow (Queen Maresa's drowned palace, its three wardens and the Queen) from `undertow/`, and
 * the Undertow Figurehead the Maelstrom Wyrm drops at sea.
 */
export const WATER_CORE: Omit<IsleBundle, 'courts' | 'genes'> = {
  isle: {
    id: 'water',
    name: 'The Drowned Reach',
    element: 'water',
    monarch: { id: 'maresa', name: 'Queen Maresa Undertow', title: 'Mistress of the Tide', artifact: 'art-maresa' },
    courts: ['tidewater', 'sailmaker', 'slickharbor', 'inkwell', 'rimefast', 'abyssal'],
    port: 'brinehollow',
    color: 0x2a8aff,
    chart: { x: 0.36, y: 0.78 },
  },
  wanderer: WATER_PORT.wanderer,
  areas: [WATER_PORT.area, WATER_DUNGEON.area],
  quests: WATER_PORT.quests,
  encounters: WATER_DUNGEON.encounters,
  gimmicks: WATER_DUNGEON.gimmicks,
  bosses: [WATER_DUNGEON.boss],
  items: [...WATER_PORT.items, ...WATER_DUNGEON.items],
  scripts: { ...WATER_PORT.scripts, ...WATER_DUNGEON.scripts },
  shops: WATER_PORT.shops,
  bakeries: WATER_PORT.bakeries,
  fish: WATER_PORT.fish,
  fisheries: WATER_PORT.fisheries,
  rods: WATER_PORT.rods,
  ubers: [{
    id: 'uber-figurehead', isle: 'water', name: 'Undertow Figurehead',
    text: 'A carved queen on the bow throws a wave ahead every few seconds: rocks shoved aside and battered, whirlpools broken, loot drawn in.',
    beast: 'wyrm',
  }],
  floors: { undertow: WATER_DUNGEON.floor, brinehollow: WATER_PORT.floor },
};
