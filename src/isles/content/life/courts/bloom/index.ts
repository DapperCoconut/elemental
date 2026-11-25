import type { CourtBundle } from '../../../../IslesTypes';
import { BLOOM_AREA } from './area';
import { BLOOM_ENCOUNTERS, BLOOM_GIMMICKS } from './encounters';
import { FALLEN } from './fallen';
import { BLOOM_FLOOR } from './floor';
import { ART_PETALIS, BLOOM_FISH, BLOOM_FISHERIES, BLOOM_ITEMS, BLOOM_SCRIPTS, BLOOM_SHOPS } from './items';
import { BLOOM_COLOR } from './palette';
import { PETALIS_BOSS } from './prince';
import { BLOOM_QUESTS } from './quests';

/**
 * The Bloom Court — life, tier 1 of Thornwild, Prince Petalis the Ever-Blooming.
 *
 * The first court up the Great Walk from Mossgate: formal gardens under glass, where every
 * household's stripe of the Tithe Beds is weighed at the season's turn and the short go north
 * on the pruning cart. See docs/ten-isles.md for the court's place on the isle, and each file
 * here for its part.
 */
export const BLOOM_COURT: CourtBundle = {
  court: {
    id: 'bloom',
    isle: 'life',
    element: 'life',
    name: 'The Bloom Court',
    prince: { id: 'petalis', name: 'Prince Petalis', title: 'the Ever-Blooming', artifact: ART_PETALIS },
    tier: 1,
    area: 'bloom',
    floor: BLOOM_FLOOR,
    encounters: BLOOM_ENCOUNTERS,
    quests: BLOOM_QUESTS,
    color: BLOOM_COLOR,
  },
  area: BLOOM_AREA,
  gimmicks: BLOOM_GIMMICKS,
  boss: PETALIS_BOSS,
  items: BLOOM_ITEMS,
  scripts: BLOOM_SCRIPTS,
  shops: BLOOM_SHOPS,
  fish: BLOOM_FISH,
  fisheries: BLOOM_FISHERIES,
  fallen: FALLEN,
};
