import type { IsleBundle } from '../../../IslesTypes';
import { SLIME_PORT } from './port';
import { SLIME_DUNGEON } from './slough';

/**
 * Fangmire's isle-level content — everything that is not one of the six courts: the isle def,
 * Stilthaven (the stilt harbour, its wanderer, sea fish and the antivenin rod) from `port/`, the
 * Slough (the Matriarch's cast skin, its three wardens and Matriarch Nyxa) from `slough/`, and
 * the Hydra Prow the Mire Hydra drops at sea.
 */
export const SLIME_CORE: Omit<IsleBundle, 'courts' | 'genes'> = {
  isle: {
    id: 'slime',
    name: 'Fangmire',
    element: 'slime',
    monarch: { id: 'nyxa', name: 'Matriarch Nyxa', title: 'Coilborne', artifact: 'art-nyxa' },
    courts: ['fang', 'web', 'shackle', 'cloak', 'umbral', 'grave'],
    port: 'stilthaven',
    color: 0x8ad040,
    chart: { x: 0.9, y: 0.72 },
    outer: true,
  },
  wanderer: SLIME_PORT.wanderer,
  areas: [SLIME_PORT.area, SLIME_DUNGEON.area],
  quests: SLIME_PORT.quests,
  encounters: SLIME_DUNGEON.encounters,
  gimmicks: SLIME_DUNGEON.gimmicks,
  bosses: [SLIME_DUNGEON.boss],
  items: [...SLIME_PORT.items, ...SLIME_DUNGEON.items],
  scripts: { ...SLIME_PORT.scripts, ...SLIME_DUNGEON.scripts },
  shops: SLIME_PORT.shops,
  bakeries: SLIME_PORT.bakeries,
  fish: SLIME_PORT.fish,
  fisheries: SLIME_PORT.fisheries,
  rods: SLIME_PORT.rods,
  ubers: [{
    id: 'uber-hydraprow', isle: 'slime', name: 'Hydra Prow',
    text: 'Three of the Mire Hydra\'s heads carved on the bow — left, centre and right: each bites the first hazard to come into reach on its side and smashes it, then needs eight seconds to grow back.',
    beast: 'hydra',
  }],
  floors: { slough: SLIME_DUNGEON.floor, stilthaven: SLIME_PORT.floor },
};
