import type { IsleBundle } from '../../../IslesTypes';
import { LIGHT_PORT } from './port';
import { LIGHT_DUNGEON } from './heliostat';

/**
 * Solmara's isle-level content — everything that is not one of the six courts: the isle def,
 * Meridian Quay (the harbour of glare, its wanderer, sea fish and the prism rod) from `port/`, the
 * Heliostat (the Despot's mirror-crown, its three wardens and Auriel himself) from `heliostat/`,
 * and the Burning Glass Prow the Lensback drops at sea.
 */
export const LIGHT_CORE: Omit<IsleBundle, 'courts' | 'genes'> = {
  isle: {
    id: 'light',
    name: 'Solmara',
    element: 'light',
    monarch: { id: 'auriel', name: 'Despot Auriel', title: 'of the Endless Noon', artifact: 'art-auriel' },
    courts: ['noon', 'tribunal', 'lantern', 'arcane', 'workshop', 'mural'],
    port: 'meridian',
    color: 0xfff0a8,
    chart: { x: 0.74, y: 0.1 },
    outer: true,
  },
  wanderer: LIGHT_PORT.wanderer,
  areas: [LIGHT_PORT.area, LIGHT_DUNGEON.area],
  quests: LIGHT_PORT.quests,
  encounters: LIGHT_DUNGEON.encounters,
  gimmicks: LIGHT_DUNGEON.gimmicks,
  bosses: [LIGHT_DUNGEON.boss],
  items: [...LIGHT_PORT.items, ...LIGHT_DUNGEON.items],
  scripts: { ...LIGHT_PORT.scripts, ...LIGHT_DUNGEON.scripts },
  shops: LIGHT_PORT.shops,
  bakeries: LIGHT_PORT.bakeries,
  fish: LIGHT_PORT.fish,
  fisheries: LIGHT_PORT.fisheries,
  rods: LIGHT_PORT.rods,
  ubers: [{
    id: 'uber-burningglass', isle: 'light', name: 'Burning Glass Prow',
    text: 'A lens on the prow gathers the endless noon and every seven seconds lances a beam ahead that burns away the two nearest hazards in front of the boat.',
    beast: 'lensback',
  }],
  floors: { heliostat: LIGHT_DUNGEON.floor, meridian: LIGHT_PORT.floor },
};
