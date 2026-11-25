import type { CourtBundle } from '../../../../IslesTypes';
import { RUBBLE_AREA } from './area';
import { RUBBLE_ENCOUNTERS, RUBBLE_GIMMICKS } from './encounters';
import { FALLEN } from './fallen';
import { RUBBLE_FLOOR } from './floor';
import { ART_WRECK, RUBBLE_FISH, RUBBLE_FISHERIES, RUBBLE_ITEMS, RUBBLE_SCRIPTS, RUBBLE_SHOPS } from './items';
import { RUBBLE_COLOR } from './palette';
import { WRECK_BOSS } from './prince';
import { RUBBLE_QUESTS } from './quests';

/**
 * The Rubble Court — ruin, tier 4 of Bedrock Hold (the hardest court), Prince Wreck the Last
 * Demolisher.
 *
 * The old capital, buried on the Regent's order under its own spoil, north of the Stonehold Court
 * at the foot of the mountain. Its pickers live in the cellars and sunken towers and dig the city
 * back up a stone at a time while the Prince knocks down what is left; the Sepulchre's sealed gate
 * is cut into the mountain face at the top of the Processional Way. See docs/ten-isles/earth.md
 * for the court's place on the isle, and each file here for its part.
 */
export const RUBBLE_COURT: CourtBundle = {
  court: {
    id: 'rubble',
    isle: 'earth',
    element: 'ruin',
    name: 'The Rubble Court',
    prince: { id: 'wreck', name: 'Prince Wreck', title: 'the Last Demolisher', artifact: ART_WRECK },
    tier: 4,
    area: 'rubble',
    floor: RUBBLE_FLOOR,
    encounters: RUBBLE_ENCOUNTERS,
    quests: RUBBLE_QUESTS,
    color: RUBBLE_COLOR,
  },
  area: RUBBLE_AREA,
  gimmicks: RUBBLE_GIMMICKS,
  boss: WRECK_BOSS,
  items: RUBBLE_ITEMS,
  scripts: RUBBLE_SCRIPTS,
  shops: RUBBLE_SHOPS,
  fish: RUBBLE_FISH,
  fisheries: RUBBLE_FISHERIES,
  fallen: FALLEN,
};
