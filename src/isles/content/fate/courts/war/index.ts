import type { CourtBundle } from '../../../../IslesTypes';
import { WAR_AREA } from './area';
import { WAR_ENCOUNTERS, WAR_GIMMICKS } from './encounters';
import { WAR_FLOOR } from './floor';
import { ART_BANNERET, WAR_FISH, WAR_FISHERIES, WAR_ITEMS, WAR_SCRIPTS, WAR_SHOPS } from './items';
import { WAR_COLOR } from './palette';
import { BANNERET_BOSS } from './prince';
import { WAR_QUESTS } from './quests';

/**
 * The War Court — conquest, tier 4 of Lotterhaven, Prince Banneret the Never-Drawn.
 *
 * The war-lottery town on the summit slope, last court before the House: where the drawn are
 * marched every Sunday from the Drafting Wheel to a trench line under the House's wall, and where
 * the House's own black door stands, barred until all six lucky children fall. See
 * docs/ten-isles/fate.md for the court's place on the isle, and each file here for its part.
 */
export const WAR_COURT: CourtBundle = {
  court: {
    id: 'war',
    isle: 'fate',
    element: 'conquest',
    name: 'The War Court',
    prince: { id: 'banneret', name: 'Prince Banneret', title: 'the Never-Drawn', artifact: ART_BANNERET },
    tier: 4,
    area: 'war',
    floor: WAR_FLOOR,
    encounters: WAR_ENCOUNTERS,
    quests: WAR_QUESTS,
    color: WAR_COLOR,
  },
  area: WAR_AREA,
  gimmicks: WAR_GIMMICKS,
  boss: BANNERET_BOSS,
  items: WAR_ITEMS,
  scripts: WAR_SCRIPTS,
  shops: WAR_SHOPS,
  fish: WAR_FISH,
  fisheries: WAR_FISHERIES,
};
