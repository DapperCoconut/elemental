import type { CourtBundle } from '../../../../IslesTypes';
import { GALEWARD_AREA } from './area';
import { GALEWARD_ENCOUNTERS, GALEWARD_GIMMICKS } from './encounters';
import { GALEWARD_FLOOR } from './floor';
import { FALLEN } from './fallen';
import {
  ART_ZEPHYR, GALEWARD_BAKERIES, GALEWARD_FISH, GALEWARD_FISHERIES, GALEWARD_ITEMS, GALEWARD_SCRIPTS, GALEWARD_SHOPS,
} from './items';
import { GALEWARD_COLOR } from './palette';
import { ZEPHYR_BOSS } from './prince';
import { GALEWARD_QUESTS } from './quests';

/**
 * The Galeward Court — air, tier 1 of Highspire, Prince Zephyr the Measure of the Wind.
 *
 * The first court up Vane Street from Windlass: a windmill town on the spire's windward
 * shoulder, where every breath is read off the brass meter on your chest at the toll-bellows,
 * and debtors are becalmed — their breath corked and racked for the lift up to the Lung. Home of
 * the Millstone bakery and the Cloudbank's cloud fishing. See docs/ten-isles.md for the court's
 * place on the isle, and each file here for its part.
 */
export const GALEWARD_COURT: CourtBundle = {
  court: {
    id: 'galeward',
    isle: 'air',
    element: 'air',
    name: 'The Galeward Court',
    prince: { id: 'zephyr', name: 'Prince Zephyr', title: 'the Measure of the Wind', artifact: ART_ZEPHYR },
    tier: 1,
    area: 'galeward',
    floor: GALEWARD_FLOOR,
    encounters: GALEWARD_ENCOUNTERS,
    quests: GALEWARD_QUESTS,
    color: GALEWARD_COLOR,
  },
  area: GALEWARD_AREA,
  gimmicks: GALEWARD_GIMMICKS,
  boss: ZEPHYR_BOSS,
  items: GALEWARD_ITEMS,
  scripts: GALEWARD_SCRIPTS,
  shops: GALEWARD_SHOPS,
  bakeries: GALEWARD_BAKERIES,
  fish: GALEWARD_FISH,
  fisheries: GALEWARD_FISHERIES,
  fallen: FALLEN,
};
