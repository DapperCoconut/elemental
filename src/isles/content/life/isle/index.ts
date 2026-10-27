import type { IsleBundle } from '../../../IslesTypes';
import { LIFE_PORT } from './port';
import { LIFE_DUNGEON } from './glasshouse';

/**
 * Thornwild's isle-level content — everything that is not one of the six courts: the isle def,
 * Mossgate (the harbour in the fallen tree, its wanderer, sea fish and the briarwood rod) from
 * `port/`, the Glasshouse (Empress Verdigra's palace, its three wardens and the Empress) from
 * `glasshouse/`, and the Greenwood Keel the Brambleback drops at sea.
 */
export const LIFE_CORE: Omit<IsleBundle, 'courts' | 'genes'> = {
  isle: {
    id: 'life',
    name: 'Thornwild',
    element: 'life',
    monarch: { id: 'verdigra', name: 'Empress Verdigra', title: 'the Gardener', artifact: 'art-verdigra' },
    courts: ['bloom', 'confection', 'wildhunt', 'spore', 'ossuary', 'heartwood'],
    port: 'mossgate',
    color: 0x4ac84a,
    chart: { x: 0.56, y: 0.3 },
  },
  wanderer: LIFE_PORT.wanderer,
  areas: [LIFE_PORT.area, LIFE_DUNGEON.area],
  quests: LIFE_PORT.quests,
  encounters: LIFE_DUNGEON.encounters,
  gimmicks: LIFE_DUNGEON.gimmicks,
  bosses: [LIFE_DUNGEON.boss],
  items: [...LIFE_PORT.items, ...LIFE_DUNGEON.items],
  scripts: { ...LIFE_PORT.scripts, ...LIFE_DUNGEON.scripts },
  shops: LIFE_PORT.shops,
  bakeries: LIFE_PORT.bakeries,
  fish: LIFE_PORT.fish,
  fisheries: LIFE_PORT.fisheries,
  rods: LIFE_PORT.rods,
  ubers: [{
    id: 'uber-greenwood', isle: 'life', name: 'Greenwood Keel',
    text: 'A living heartwood keel: the hull regrows a plank every ten seconds, and thorns burst out of it whenever it is struck, tearing whatever is close.',
    beast: 'brambleback',
  }],
  floors: { glasshouse: LIFE_DUNGEON.floor, mossgate: LIFE_PORT.floor },
};
