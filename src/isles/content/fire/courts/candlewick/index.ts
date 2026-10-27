import type { CourtBundle } from '../../../../IslesTypes';
import { CANDLEWICK_AREA } from './area';
import { TALLOW_BOSS } from './boss';
import { CANDLEWICK_ENCOUNTERS } from './encounters';
import { candlewickFloor } from './floor';
import { BOTH_ENDS } from './gimmicks/bothEnds';
import { DRIP } from './gimmicks/drip';
import { EFFIGIES } from './gimmicks/effigies';
import { HIVE_MIND } from './gimmicks/hive';
import { VIGIL } from './gimmicks/vigil';
import {
  ART_TALLOW, CANDLEWICK_BAKERIES, CANDLEWICK_FISH, CANDLEWICK_FISHERIES, CANDLEWICK_ITEMS,
  CANDLEWICK_SCRIPTS, CANDLEWICK_SHOPS,
} from './items';
import { CANDLEWICK_QUESTS } from './quests';

/**
 * The Candlewick Court — wax, tier 3, Prince Tallow. A city of melting candles under the
 * Inch-Tax: see docs/ten-isles.md for the concept, and each file here for its part.
 */
export const CANDLEWICK_COURT: CourtBundle = {
  court: {
    id: 'candlewick',
    isle: 'fire',
    element: 'wax',
    name: 'The Candlewick Court',
    prince: { id: 'tallow', name: 'Prince Tallow', title: 'The Tall Candle', artifact: ART_TALLOW },
    tier: 3,
    area: 'candlewick',
    floor: candlewickFloor,
    encounters: CANDLEWICK_ENCOUNTERS,
    quests: CANDLEWICK_QUESTS,
    color: 0xffb347,
  },
  area: CANDLEWICK_AREA,
  gimmicks: [DRIP, VIGIL, HIVE_MIND, BOTH_ENDS, EFFIGIES],
  boss: TALLOW_BOSS,
  items: CANDLEWICK_ITEMS,
  scripts: CANDLEWICK_SCRIPTS,
  shops: CANDLEWICK_SHOPS,
  bakeries: CANDLEWICK_BAKERIES,
  fish: CANDLEWICK_FISH,
  fisheries: CANDLEWICK_FISHERIES,
};
