import type { CourtBundle } from '../../../../IslesTypes';
import { SHACKLE_AREA } from './area';
import { SHACKLE_ENCOUNTERS, SHACKLE_GIMMICKS } from './encounters';
import { SHACKLE_FLOOR } from './floor';
import { ART_FETTER, SHACKLE_FISH, SHACKLE_FISHERIES, SHACKLE_ITEMS, SHACKLE_SCRIPTS, SHACKLE_SHOPS } from './items';
import { SHACKLE_COLOR } from './palette';
import { FETTER_BOSS } from './prince';
import { SHACKLE_QUESTS } from './quests';

/**
 * The Shackle Court — bind, tier 2 of Fangmire, Prince Fetter, Keeper of the Keys.
 *
 * The debtors' gaol-town west of Stilthaven: a causeway walked by chain-gangs, a square of stocks,
 * the Owing House with the Great Ledger chained to its wall, the Manacle Works, the Great Chain
 * Bridge north to the Web Court, and Fetter's iron-banded keep. Here the households passed over
 * at the Draught House buy their doses on credit — and pay for them in iron. See
 * docs/ten-isles/slime.md for the court's place on the isle, and each file here for its part.
 */
export const SHACKLE_COURT: CourtBundle = {
  court: {
    id: 'shackle',
    isle: 'slime',
    element: 'bind',
    name: 'The Shackle Court',
    prince: { id: 'fetter', name: 'Prince Fetter', title: 'Keeper of the Keys', artifact: ART_FETTER },
    tier: 2,
    area: 'shackle',
    floor: SHACKLE_FLOOR,
    encounters: SHACKLE_ENCOUNTERS,
    quests: SHACKLE_QUESTS,
    color: SHACKLE_COLOR,
  },
  area: SHACKLE_AREA,
  gimmicks: SHACKLE_GIMMICKS,
  boss: FETTER_BOSS,
  items: SHACKLE_ITEMS,
  scripts: SHACKLE_SCRIPTS,
  shops: SHACKLE_SHOPS,
  fish: SHACKLE_FISH,
  fisheries: SHACKLE_FISHERIES,
};
