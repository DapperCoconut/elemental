import type { CourtBundle } from '../../../../IslesTypes';
import { REMEMBRANCE_AREA } from './area';
import { REMEMBRANCE_ENCOUNTERS, REMEMBRANCE_GIMMICKS } from './encounters';
import { REMEMBRANCE_FLOOR } from './floor';
import {
  ART_HINDSIGHT, REMEMBRANCE_FISH, REMEMBRANCE_FISHERIES, REMEMBRANCE_ITEMS, REMEMBRANCE_SCRIPTS, REMEMBRANCE_SHOPS,
} from './items';
import { REMEMBRANCE_COLOR } from './palette';
import { HINDSIGHT_BOSS } from './prince';
import { REMEMBRANCE_QUESTS } from './quests';

/**
 * The Remembrance Court — memory, tier 3 of Lotterhaven, Prince Hindsight the Backward-Looking.
 *
 * The memory-pawnbrokers' town east of the Card Court: where the drawn pay the Draw with a
 * memory, bottled and ticketed on Pawn Row, and where lapsed pledges are poured into the pale
 * Lethe. See docs/ten-isles/fate.md for the court's place on the isle, and each file here for
 * its part.
 */
export const REMEMBRANCE_COURT: CourtBundle = {
  court: {
    id: 'remembrance',
    isle: 'fate',
    element: 'memory',
    name: 'The Remembrance Court',
    prince: { id: 'hindsight', name: 'Prince Hindsight', title: 'the Backward-Looking', artifact: ART_HINDSIGHT },
    tier: 3,
    area: 'remembrance',
    floor: REMEMBRANCE_FLOOR,
    encounters: REMEMBRANCE_ENCOUNTERS,
    quests: REMEMBRANCE_QUESTS,
    color: REMEMBRANCE_COLOR,
  },
  area: REMEMBRANCE_AREA,
  gimmicks: REMEMBRANCE_GIMMICKS,
  boss: HINDSIGHT_BOSS,
  items: REMEMBRANCE_ITEMS,
  scripts: REMEMBRANCE_SCRIPTS,
  shops: REMEMBRANCE_SHOPS,
  fish: REMEMBRANCE_FISH,
  fisheries: REMEMBRANCE_FISHERIES,
};
