import type { CourtBundle } from '../../../../IslesTypes';
import { MIND_AREA } from './area';
import { MIND_ENCOUNTERS, MIND_GIMMICKS } from './encounters';
import { MIND_FLOOR } from './floor';
import { ART_GAMBIT, MIND_FISH, MIND_FISHERIES, MIND_ITEMS, MIND_SCRIPTS, MIND_SHOPS } from './items';
import { MIND_COLOR } from './palette';
import { GAMBIT_BOSS } from './prince';
import { MIND_QUESTS } from './quests';

/**
 * The Mind Court — psychic, tier 3 of Lotterhaven, Prince Gambit the Move Ahead.
 *
 * The mentalists' town at the end of the Tosswater road, where every wager against the House is
 * read before the House will take it, the readers' notes are sold at the Thought Exchange, and
 * the busted play the pieces on the Prince's living chessboard. See docs/ten-isles/fate.md for
 * the court's place on the isle, and each file here for its part.
 */
export const MIND_COURT: CourtBundle = {
  court: {
    id: 'mind',
    isle: 'fate',
    element: 'psychic',
    name: 'The Mind Court',
    prince: { id: 'gambit', name: 'Prince Gambit', title: 'the Move Ahead', artifact: ART_GAMBIT },
    tier: 3,
    area: 'mind',
    floor: MIND_FLOOR,
    encounters: MIND_ENCOUNTERS,
    quests: MIND_QUESTS,
    color: MIND_COLOR,
  },
  area: MIND_AREA,
  gimmicks: MIND_GIMMICKS,
  boss: GAMBIT_BOSS,
  items: MIND_ITEMS,
  scripts: MIND_SCRIPTS,
  shops: MIND_SHOPS,
  fish: MIND_FISH,
  fisheries: MIND_FISHERIES,
};
