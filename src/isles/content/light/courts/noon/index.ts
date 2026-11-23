import type { CourtBundle } from '../../../../IslesTypes';
import { NOON_AREA } from './area';
import { NOON_ENCOUNTERS, NOON_GIMMICKS } from './encounters';
import { NOON_FLOOR } from './floor';
import {
  ART_LUMEN, NOON_BAKERIES, NOON_FISH, NOON_FISHERIES, NOON_ITEMS, NOON_SCRIPTS, NOON_SHOPS,
} from './items';
import { NOON_COLOR } from './palette';
import { LUMEN_BOSS } from './prince';
import { NOON_QUESTS } from './quests';

/**
 * The Noon Court — light, tier 1 of Solmara, Prince Lumen the Unshadowed.
 *
 * The first court up the Sun Road from Meridian Quay: the sun-plaza on the central terrace, a
 * vast white marble square with no shade at all, where shade-thieves are bleached in the
 * Burning Glass and the noon bell rings every twelve seconds. See docs/ten-isles/light.md for
 * the court's place on the isle, and each file here for its part.
 */
export const NOON_COURT: CourtBundle = {
  court: {
    id: 'noon',
    isle: 'light',
    element: 'light',
    name: 'The Noon Court',
    prince: { id: 'lumen', name: 'Prince Lumen', title: 'the Unshadowed', artifact: ART_LUMEN },
    tier: 1,
    area: 'noon',
    floor: NOON_FLOOR,
    encounters: NOON_ENCOUNTERS,
    quests: NOON_QUESTS,
    color: NOON_COLOR,
  },
  area: NOON_AREA,
  gimmicks: NOON_GIMMICKS,
  boss: LUMEN_BOSS,
  items: NOON_ITEMS,
  scripts: NOON_SCRIPTS,
  shops: NOON_SHOPS,
  bakeries: NOON_BAKERIES,
  fish: NOON_FISH,
  fisheries: NOON_FISHERIES,
};
