import type { CourtBundle } from '../../../../IslesTypes';
import { OSSUARY_AREA } from './area';
import { SINEW_BOSS } from './boss';
import { OSSUARY_ENCOUNTERS } from './encounters';
import { OSSUARY_FLOOR } from './floor';
import { OSSUARY_FISH, OSSUARY_FISHERIES, OSSUARY_ITEMS, OSSUARY_SCRIPTS, OSSUARY_SHOPS } from './items';
import { OSSUARY_QUESTS } from './quests';
import { BONE_GARDEN } from './gimmicks/boneGarden';
import { CALCIFY } from './gimmicks/calcify';
import { MARROW_WELLS } from './gimmicks/marrowWells';
import { KNUCKLEBONES } from './gimmicks/knucklebones';
import { RELIQUARY } from './gimmicks/reliquary';

/**
 * THE OSSUARY COURT — Thornwild's garden of the dead, where the pruned who die in the Empress's
 * hedges are composted under white lilies, governed by Prince Sinew on his strings. Tier 3.
 */
export const OSSUARY_COURT: CourtBundle = {
  court: {
    id: 'ossuary',
    isle: 'life',
    element: 'marrow',
    name: 'The Ossuary Court',
    prince: { id: 'sinew', name: 'Prince Sinew', title: 'Keeper of the Ossuary Court', artifact: 'art-sinew' },
    tier: 3,
    area: 'ossuary',
    floor: OSSUARY_FLOOR,
    encounters: OSSUARY_ENCOUNTERS,
    quests: OSSUARY_QUESTS,
    color: 0xd8ccb0,
  },
  area: OSSUARY_AREA,
  gimmicks: [BONE_GARDEN, CALCIFY, MARROW_WELLS, KNUCKLEBONES, RELIQUARY],
  boss: SINEW_BOSS,
  items: OSSUARY_ITEMS,
  scripts: OSSUARY_SCRIPTS,
  shops: OSSUARY_SHOPS,
  fish: OSSUARY_FISH,
  fisheries: OSSUARY_FISHERIES,
};
