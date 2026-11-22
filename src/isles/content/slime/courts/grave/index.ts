import type { CourtBundle } from '../../../../IslesTypes';
import { GRAVE_AREA } from './area';
import { GRAVE_ENCOUNTERS, GRAVE_GIMMICKS } from './encounters';
import { GRAVE_FLOOR } from './floor';
import { ART_MORTIS, GRAVE_FISH, GRAVE_FISHERIES, GRAVE_ITEMS, GRAVE_SCRIPTS, GRAVE_SHOPS } from './items';
import { GRAVE_COLOR } from './palette';
import { MORTIS_BOSS } from './prince';
import { GRAVE_QUESTS } from './quests';

/**
 * The Grave Court — death, tier 4 of Fangmire, Prince Mortis, Keeper of the Register.
 *
 * The last court up the Fang road: an endless churchyard sinking into the mire, where the
 * passed-over are carried when the grey reaches their hearts, and where the tail of the
 * Matriarch's cast skin — the Slough — opens out of the mire at the north edge. See
 * docs/ten-isles/slime.md for the court's place on the isle, and each file here for its part.
 */
export const GRAVE_COURT: CourtBundle = {
  court: {
    id: 'grave',
    isle: 'slime',
    element: 'death',
    name: 'The Grave Court',
    prince: { id: 'mortis', name: 'Prince Mortis', title: 'Keeper of the Register', artifact: ART_MORTIS },
    tier: 4,
    area: 'grave',
    floor: GRAVE_FLOOR,
    encounters: GRAVE_ENCOUNTERS,
    quests: GRAVE_QUESTS,
    color: GRAVE_COLOR,
  },
  area: GRAVE_AREA,
  gimmicks: GRAVE_GIMMICKS,
  boss: MORTIS_BOSS,
  items: GRAVE_ITEMS,
  scripts: GRAVE_SCRIPTS,
  shops: GRAVE_SHOPS,
  fish: GRAVE_FISH,
  fisheries: GRAVE_FISHERIES,
};
