import type { IsleBundle } from '../../../IslesTypes';
import { SOUND_PORT } from './port';
import { SOUND_DUNGEON } from './organ';

/**
 * Choirholm's isle-level content — everything that is not one of the six courts: the isle def,
 * Carillon Quay (the harbour of bells, its wanderer, sea fish and the tuning rod) from `port/`, the
 * Great Organ (the Maestro's instrument, its three wardens and Cadenza himself) from `organ/`, and
 * the Foghorn Bow the Cantor drops at sea.
 */
export const SOUND_CORE: Omit<IsleBundle, 'courts' | 'genes'> = {
  isle: {
    id: 'sound',
    name: 'Choirholm',
    element: 'sound',
    monarch: { id: 'cadenza', name: 'Maestro Cadenza', title: 'Conductor of the Score', artifact: 'art-cadenza' },
    courts: ['brass', 'cavern', 'libretto', 'masque', 'hush', 'cathedral'],
    port: 'carillon',
    color: 0xe0c070,
    chart: { x: 0.97, y: 0.6 },
    outer: true,
  },
  wanderer: SOUND_PORT.wanderer,
  areas: [SOUND_PORT.area, SOUND_DUNGEON.area],
  quests: SOUND_PORT.quests,
  encounters: SOUND_DUNGEON.encounters,
  gimmicks: SOUND_DUNGEON.gimmicks,
  bosses: [SOUND_DUNGEON.boss],
  items: [...SOUND_PORT.items, ...SOUND_DUNGEON.items],
  scripts: { ...SOUND_PORT.scripts, ...SOUND_DUNGEON.scripts },
  shops: SOUND_PORT.shops,
  bakeries: SOUND_PORT.bakeries,
  fish: SOUND_PORT.fish,
  fisheries: SOUND_PORT.fisheries,
  rods: SOUND_PORT.rods,
  ubers: [{
    id: 'uber-foghorn', isle: 'sound', name: 'Foghorn Bow',
    text: 'A brass horn on the prow sounds a long low blast every eight seconds: a widening ring that pushes drift and mines aside and holds every hazard ahead still for two seconds.',
    beast: 'cantor',
  }],
  floors: { organ: SOUND_DUNGEON.floor, carillon: SOUND_PORT.floor },
};
