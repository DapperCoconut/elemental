import type { CourtBundle } from '../../../../IslesTypes';
import { STONEHOLD_AREA } from './area';
import { STONEHOLD_ENCOUNTERS, STONEHOLD_GIMMICKS } from './encounters';
import { STONEHOLD_FLOOR } from './floor';
import {
  ART_BOULD, STONEHOLD_BAKERIES, STONEHOLD_FISH, STONEHOLD_FISHERIES, STONEHOLD_ITEMS, STONEHOLD_SCRIPTS, STONEHOLD_SHOPS,
} from './items';
import { STONEHOLD_COLOR } from './palette';
import { BOULD_BOSS } from './prince';
import { STONEHOLD_QUESTS } from './quests';

/**
 * The Stonehold Court — earth, tier 1 of Bedrock Hold, Prince Bould the Unmoved.
 *
 * The first court up the rolling-stone road from Quarrymouth: a fortress town of boulders on the
 * mesa's shoulder, houses hollowed out of standing stones, where every household's Tithe is
 * lowered into the pit, chalked, and rolled down to the Scales — and the short are walled up in
 * their own front doors before the cart comes. Home of the Flatbread Stone bakery and the quarry
 * pool's fishing. See docs/ten-isles/earth.md for the court's place on the isle, and each file
 * here for its part.
 */
export const STONEHOLD_COURT: CourtBundle = {
  court: {
    id: 'stonehold',
    isle: 'earth',
    element: 'earth',
    name: 'The Stonehold Court',
    prince: { id: 'bould', name: 'Prince Bould', title: 'the Unmoved', artifact: ART_BOULD },
    tier: 1,
    area: 'stonehold',
    floor: STONEHOLD_FLOOR,
    encounters: STONEHOLD_ENCOUNTERS,
    quests: STONEHOLD_QUESTS,
    color: STONEHOLD_COLOR,
  },
  area: STONEHOLD_AREA,
  gimmicks: STONEHOLD_GIMMICKS,
  boss: BOULD_BOSS,
  items: STONEHOLD_ITEMS,
  scripts: STONEHOLD_SCRIPTS,
  shops: STONEHOLD_SHOPS,
  bakeries: STONEHOLD_BAKERIES,
  fish: STONEHOLD_FISH,
  fisheries: STONEHOLD_FISHERIES,
};
