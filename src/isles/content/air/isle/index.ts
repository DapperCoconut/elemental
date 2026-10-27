import type { IsleBundle } from '../../../IslesTypes';
import { AIR_PORT } from './port';
import { AIR_DUNGEON } from './lung';

/**
 * Highspire's isle-level content — everything that is not one of the six courts: the isle def,
 * Windlass (the cliff harbour at the spire's foot, its wanderer, sea fish and the skyline rod) from
 * `port/`, the Lung (King Aerion's windmill-palace, its three wardens and the King) from `lung/`,
 * and the Windcatcher Sail the Skyray drops at sea.
 */
export const AIR_CORE: Omit<IsleBundle, 'courts' | 'genes'> = {
  isle: {
    id: 'air',
    name: 'Highspire',
    element: 'air',
    monarch: { id: 'aerion', name: 'King Aerion', title: 'the Breath-Taxer', artifact: 'art-aerion' },
    courts: ['galeward', 'slumber', 'fable', 'orbit', 'stormeye', 'starfall'],
    port: 'windlass',
    color: 0xb8e4ff,
    chart: { x: 0.76, y: 0.5 },
  },
  wanderer: AIR_PORT.wanderer,
  areas: [AIR_PORT.area, AIR_DUNGEON.area],
  quests: AIR_PORT.quests,
  encounters: AIR_DUNGEON.encounters,
  gimmicks: AIR_DUNGEON.gimmicks,
  bosses: [AIR_DUNGEON.boss],
  items: [...AIR_PORT.items, ...AIR_DUNGEON.items],
  scripts: { ...AIR_PORT.scripts, ...AIR_DUNGEON.scripts },
  shops: AIR_PORT.shops,
  bakeries: AIR_PORT.bakeries,
  fish: AIR_PORT.fish,
  fisheries: AIR_PORT.fisheries,
  rods: AIR_PORT.rods,
  ubers: [{
    id: 'uber-windcatcher', isle: 'air', name: 'Windcatcher Sail',
    text: 'A sail cut from the Skyray\'s wing: every few seconds it fills — a burst of speed forward, and any spit or shot near the boat is blown back the way it came.',
    beast: 'skyray',
  }],
  floors: { lung: AIR_DUNGEON.floor, windlass: AIR_PORT.floor },
};
