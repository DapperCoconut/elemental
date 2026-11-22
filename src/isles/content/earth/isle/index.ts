import type { IsleBundle } from '../../../IslesTypes';
import { EARTH_PORT } from './port';
import { EARTH_DUNGEON } from './sepulchre';

/**
 * Bedrock Hold's isle-level content — everything that is not one of the six courts: the isle def,
 * Quarrymouth (the quarry harbour, its wanderer, sea fish and the delver rod) from `port/`, the
 * Sepulchre (Regent Gravane's downward hold, its three wardens and the Regent) from `sepulchre/`,
 * and the Cragplate Ram the Cragjaw drops at sea.
 */
export const EARTH_CORE: Omit<IsleBundle, 'courts' | 'genes'> = {
  isle: {
    id: 'earth',
    name: 'Bedrock Hold',
    element: 'earth',
    monarch: { id: 'gravane', name: 'Regent Gravane', title: 'the Burier', artifact: 'art-gravane' },
    courts: ['stonehold', 'potter', 'dunesea', 'geode', 'forge', 'rubble'],
    port: 'quarrymouth',
    color: 0xb89a6a,
    chart: { x: 0.58, y: 0.82 },
  },
  wanderer: EARTH_PORT.wanderer,
  areas: [EARTH_PORT.area, EARTH_DUNGEON.area],
  quests: EARTH_PORT.quests,
  encounters: EARTH_DUNGEON.encounters,
  gimmicks: EARTH_DUNGEON.gimmicks,
  bosses: [EARTH_DUNGEON.boss],
  items: [...EARTH_PORT.items, ...EARTH_DUNGEON.items],
  scripts: { ...EARTH_PORT.scripts, ...EARTH_DUNGEON.scripts },
  shops: EARTH_PORT.shops,
  bakeries: EARTH_PORT.bakeries,
  fish: EARTH_PORT.fish,
  fisheries: EARTH_PORT.fisheries,
  rods: EARTH_PORT.rods,
  ubers: [{
    id: 'uber-cragplate', isle: 'earth', name: 'Cragplate Ram',
    text: 'A prow of the Cragjaw\'s jaw-stone: ramming rocks, drift and mines smashes them aside unharmed, and every eight seconds the plate hardens to shrug off the next blow.',
    beast: 'cragjaw',
  }],
  floors: { sepulchre: EARTH_DUNGEON.floor, quarrymouth: EARTH_PORT.floor },
};
