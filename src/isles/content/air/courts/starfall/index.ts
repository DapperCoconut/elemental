import type { CourtBundle, GimmickDef } from '../../../../IslesTypes';
import { STARFALL_AREA } from './area';
import { NOVA_BOSS } from './nova';
import { STARFALL_ENCOUNTERS } from './encounters';
import { starfallFloor } from './floor';
import { STARFALL_FISH, STARFALL_FISHERIES, STARFALL_ITEMS, STARFALL_SCRIPTS, STARFALL_SHOPS } from './items';
import { STARFALL_QUESTS } from './quests';
import { shootingStarsGimmick } from './gimmicks/shootingStars';
import { constellationGimmick } from './gimmicks/constellation';
import { telescopeGimmick } from './gimmicks/telescope';
import { eclipseGimmick } from './gimmicks/eclipse';
import { dyingStarGimmick } from './gimmicks/dyingStar';

/**
 * The Starfall Court — Highspire's tier-4 court, an observatory city on the summit above the
 * clouds, in permanent night. Prince Nova, the Evening Star, keeps the Ledger of Stars and inks out
 * the star of every household that falls behind on the Breath Tax; King Aerion's windmill-palace,
 * the Lung, turns its sails over the peak, and its door opens at this area's north edge.
 * See docs/ten-isles.md.
 */

const GIMMICKS: GimmickDef[] = [shootingStarsGimmick, constellationGimmick, telescopeGimmick, eclipseGimmick, dyingStarGimmick];

export const STARFALL_COURT: CourtBundle = {
  court: {
    id: 'starfall',
    isle: 'air',
    element: 'astra',
    name: 'The Starfall Court',
    prince: { id: 'nova', name: 'Prince Nova', title: 'the Evening Star', artifact: 'art-nova' },
    tier: 4,
    area: 'starfall',
    floor: starfallFloor,
    encounters: STARFALL_ENCOUNTERS,
    quests: STARFALL_QUESTS,
    color: 0x6a4cff,
  },
  area: STARFALL_AREA,
  gimmicks: GIMMICKS,
  boss: NOVA_BOSS,
  items: STARFALL_ITEMS,
  scripts: STARFALL_SCRIPTS,
  shops: STARFALL_SHOPS,
  fish: STARFALL_FISH,
  fisheries: STARFALL_FISHERIES,
};
