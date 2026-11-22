import type { CourtBundle } from '../../../../IslesTypes';
import { SUPERPOSITION_AREA } from './area';
import { SUPERPOSITION_ENCOUNTERS, SUPERPOSITION_GIMMICKS } from './encounters';
import { SUPERPOSITION_FLOOR } from './floor';
import {
  ART_BOTH, SUPERPOSITION_FISH, SUPERPOSITION_FISHERIES, SUPERPOSITION_ITEMS, SUPERPOSITION_SCRIPTS, SUPERPOSITION_SHOPS,
} from './items';
import { SUPERPOSITION_COLOR } from './palette';
import { BOTH_BOSS } from './prince';
import { SUPERPOSITION_QUESTS } from './quests';

/**
 * The Superposition Court — quantum, tier 4 of Voltreach, Prince Both the Undecided.
 *
 * The highest court on the isle, under the Crown Coil: a town that is two towns at once, where
 * every house is metered in both its states and owes the Draw on both, anything undecided is sealed
 * in a box, and the door of the Empress's tower opens off the north of the square once all six
 * princes have fallen. See docs/ten-isles/electricity.md for the court's place on the isle, and each
 * file here for its part.
 */
export const SUPERPOSITION_COURT: CourtBundle = {
  court: {
    id: 'superposition',
    isle: 'electricity',
    element: 'quantum',
    name: 'The Superposition Court',
    prince: { id: 'both', name: 'Prince Both', title: 'the Undecided', artifact: ART_BOTH },
    tier: 4,
    area: 'superposition',
    floor: SUPERPOSITION_FLOOR,
    encounters: SUPERPOSITION_ENCOUNTERS,
    quests: SUPERPOSITION_QUESTS,
    color: SUPERPOSITION_COLOR,
  },
  area: SUPERPOSITION_AREA,
  gimmicks: SUPERPOSITION_GIMMICKS,
  boss: BOTH_BOSS,
  items: SUPERPOSITION_ITEMS,
  scripts: SUPERPOSITION_SCRIPTS,
  shops: SUPERPOSITION_SHOPS,
  fish: SUPERPOSITION_FISH,
  fisheries: SUPERPOSITION_FISHERIES,
};
