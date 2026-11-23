import type { CourtBundle } from '../../../../IslesTypes';
import { CLOCKWORK_AREA } from './area';
import { CLOCKWORK_ENCOUNTERS, CLOCKWORK_GIMMICKS } from './encounters';
import { CLOCKWORK_FLOOR } from './floor';
import {
  ART_TOCK, CLOCKWORK_FISH, CLOCKWORK_FISHERIES, CLOCKWORK_ITEMS, CLOCKWORK_SCRIPTS, CLOCKWORK_SHOPS,
} from './items';
import { CLOCKWORK_COLOR } from './palette';
import { TOCK_BOSS } from './prince';
import { CLOCKWORK_QUESTS } from './quests';

/**
 * The Clockwork Court — Time (`sand`), tier 2 of Lotterhaven, Prince Tock, Keeper of the Hours.
 *
 * The clockmakers' town west of the Card Court, where the drawn pay the Draw in hours: an
 * afternoon handed in at the Hour Office window, rung up the brass tube by the great clock's
 * thirteenth stroke, and worn by the Prince in his Regulator. See docs/ten-isles/fate.md for the
 * court's place on the isle, and each file here for its part.
 */
export const CLOCKWORK_COURT: CourtBundle = {
  court: {
    id: 'clockwork',
    isle: 'fate',
    element: 'sand',
    name: 'The Clockwork Court',
    prince: { id: 'tock', name: 'Prince Tock', title: 'Keeper of the Hours', artifact: ART_TOCK },
    tier: 2,
    area: 'clockwork',
    floor: CLOCKWORK_FLOOR,
    encounters: CLOCKWORK_ENCOUNTERS,
    quests: CLOCKWORK_QUESTS,
    color: CLOCKWORK_COLOR,
  },
  area: CLOCKWORK_AREA,
  gimmicks: CLOCKWORK_GIMMICKS,
  boss: TOCK_BOSS,
  items: CLOCKWORK_ITEMS,
  scripts: CLOCKWORK_SCRIPTS,
  shops: CLOCKWORK_SHOPS,
  fish: CLOCKWORK_FISH,
  fisheries: CLOCKWORK_FISHERIES,
};
