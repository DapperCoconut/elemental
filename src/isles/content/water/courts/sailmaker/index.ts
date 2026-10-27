import type { CourtBundle } from '../../../../IslesTypes';
import { SAILMAKER_AREA } from './area';
import { HEM_BOSS } from './boss';
import { SAILMAKER_ENCOUNTERS } from './encounters';
import { sailmakerFloor } from './floor';
import { DRYING_LINES } from './gimmicks/dryingLines';
import { FULL_SAIL } from './gimmicks/fullSail';
import { PATCHWORK } from './gimmicks/patchwork';
import { ROPE_WALK } from './gimmicks/ropeWalk';
import { THE_LOOM } from './gimmicks/theLoom';
import {
  ART_HEM, SAILMAKER_FISH, SAILMAKER_FISHERIES, SAILMAKER_ITEMS, SAILMAKER_SCRIPTS, SAILMAKER_SHOPS,
} from './items';
import { SAILMAKER_QUESTS } from './quests';

/**
 * The Sailmaker's Court — cloth, tier 2, Prince Hem. Cliff-top sail lofts under the Yardage, a
 * yard of sailcloth a head a day for the Queen's fleet: see docs/ten-isles.md for the concept,
 * and each file here for its part.
 */
export const SAILMAKER_COURT: CourtBundle = {
  court: {
    id: 'sailmaker',
    isle: 'water',
    element: 'cloth',
    name: 'The Sailmaker\'s Court',
    prince: { id: 'hem', name: 'Prince Hem', title: 'Royal Tailor of the Sailmaker\'s Court', artifact: ART_HEM },
    tier: 2,
    area: 'sailmaker',
    floor: sailmakerFloor,
    encounters: SAILMAKER_ENCOUNTERS,
    quests: SAILMAKER_QUESTS,
    color: 0xc8323a,
  },
  area: SAILMAKER_AREA,
  gimmicks: [DRYING_LINES, ROPE_WALK, FULL_SAIL, THE_LOOM, PATCHWORK],
  boss: HEM_BOSS,
  items: SAILMAKER_ITEMS,
  scripts: SAILMAKER_SCRIPTS,
  shops: SAILMAKER_SHOPS,
  fish: SAILMAKER_FISH,
  fisheries: SAILMAKER_FISHERIES,
};
