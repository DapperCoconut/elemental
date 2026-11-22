import type { CourtBundle } from '../../../../IslesTypes';
import { POTTER_AREA } from './area';
import { POTTER_ENCOUNTERS, POTTER_GIMMICKS } from './encounters';
import { POTTER_FLOOR } from './floor';
import { ART_GLAZE, POTTER_FISH, POTTER_FISHERIES, POTTER_ITEMS, POTTER_SCRIPTS, POTTER_SHOPS } from './items';
import { POTTER_COLOR } from './palette';
import { GLAZE_BOSS } from './prince';
import { POTTER_QUESTS } from './quests';

/**
 * The Potter's Court — clay, tier 2 of Bedrock Hold, Prince Glaze the Unbroken.
 *
 * A pottery town under the mesa's west cliff, west of Stonehold along the Kiln Road: bottle kilns
 * smoking, clay pits and the slip pond, and the Tithe Ranks — the terracotta army every household
 * pays into, a soldier a season, tapped at muster for cracks. See docs/ten-isles/earth.md for the
 * court's place on the isle, and each file here for its part.
 */
export const POTTER_COURT: CourtBundle = {
  court: {
    id: 'potter',
    isle: 'earth',
    element: 'clay',
    name: 'The Potter\'s Court',
    prince: { id: 'glaze', name: 'Prince Glaze', title: 'the Unbroken', artifact: ART_GLAZE },
    tier: 2,
    area: 'potter',
    floor: POTTER_FLOOR,
    encounters: POTTER_ENCOUNTERS,
    quests: POTTER_QUESTS,
    color: POTTER_COLOR,
  },
  area: POTTER_AREA,
  gimmicks: POTTER_GIMMICKS,
  boss: GLAZE_BOSS,
  items: POTTER_ITEMS,
  scripts: POTTER_SCRIPTS,
  shops: POTTER_SHOPS,
  fish: POTTER_FISH,
  fisheries: POTTER_FISHERIES,
};
