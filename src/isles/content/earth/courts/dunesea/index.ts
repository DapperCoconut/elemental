import type { CourtBundle } from '../../../../IslesTypes';
import { DUNESEA_AREA } from './area';
import { DUNESEA_ENCOUNTERS, DUNESEA_GIMMICKS } from './encounters';
import { DUNESEA_FLOOR } from './floor';
import { ART_SIROCCO, DUNESEA_FISH, DUNESEA_FISHERIES, DUNESEA_ITEMS, DUNESEA_SCRIPTS, DUNESEA_SHOPS } from './items';
import { DUNESEA_COLOR } from './palette';
import { SIROCCO_BOSS } from './prince';
import { DUNESEA_QUESTS } from './quests';
import { FALLEN } from './fallen';

/**
 * The Dunesea Court — dune (Sand), tier 2 of Bedrock Hold, Prince Sirocco the Restless.
 *
 * The mesa's rain-shadow, west of Quarrymouth and south of the Potter's Court: a sea of dunes over
 * Old Hamra, the city the sand took long ago. Households pay the Stone Tithe by digging the buried
 * city's stone out of pits before the dunes cover them — and the dunes move where the Prince likes.
 * See docs/ten-isles/earth.md for the court's place on the isle, and each file here for its part.
 */
export const DUNESEA_COURT: CourtBundle = {
  court: {
    id: 'dunesea',
    isle: 'earth',
    element: 'dune',
    name: 'The Dunesea Court',
    prince: { id: 'sirocco', name: 'Prince Sirocco', title: 'the Restless', artifact: ART_SIROCCO },
    tier: 2,
    area: 'dunesea',
    floor: DUNESEA_FLOOR,
    encounters: DUNESEA_ENCOUNTERS,
    quests: DUNESEA_QUESTS,
    color: DUNESEA_COLOR,
  },
  area: DUNESEA_AREA,
  gimmicks: DUNESEA_GIMMICKS,
  boss: SIROCCO_BOSS,
  items: DUNESEA_ITEMS,
  scripts: DUNESEA_SCRIPTS,
  shops: DUNESEA_SHOPS,
  fish: DUNESEA_FISH,
  fisheries: DUNESEA_FISHERIES,
  fallen: FALLEN,
};
