import type { CourtBundle } from '../../../../IslesTypes';
import { WORKSHOP_AREA } from './area';
import { WORKSHOP_ENCOUNTERS, WORKSHOP_GIMMICKS } from './encounters';
import { WORKSHOP_FLOOR } from './floor';
import { FALLEN } from './fallen';
import { ART_ARTIFEX, WORKSHOP_FISH, WORKSHOP_FISHERIES, WORKSHOP_ITEMS, WORKSHOP_SCRIPTS, WORKSHOP_SHOPS } from './items';
import { WORKSHOP_COLOR } from './palette';
import { ARTIFEX_BOSS } from './prince';
import { WORKSHOP_QUESTS } from './quests';

/**
 * The Workshop Court — creation, tier 3 of Solmara, Prince Artifex the Radiance of the Workshop.
 *
 * The artificers' town east of the sun-plaza, where the Heliostat's mirrors are blown, ground,
 * silvered and hoisted, and where the Prince is building the Magnum Opus to carry the noon into
 * every shadow left. See docs/ten-isles/light.md for the court's place on the isle, and each file
 * here for its part.
 */
export const WORKSHOP_COURT: CourtBundle = {
  court: {
    id: 'workshop',
    isle: 'light',
    element: 'creation',
    name: 'The Workshop Court',
    prince: { id: 'artifex', name: 'Prince Artifex', title: 'the Radiance of the Workshop', artifact: ART_ARTIFEX },
    tier: 3,
    area: 'workshop',
    floor: WORKSHOP_FLOOR,
    encounters: WORKSHOP_ENCOUNTERS,
    quests: WORKSHOP_QUESTS,
    color: WORKSHOP_COLOR,
  },
  area: WORKSHOP_AREA,
  gimmicks: WORKSHOP_GIMMICKS,
  boss: ARTIFEX_BOSS,
  items: WORKSHOP_ITEMS,
  scripts: WORKSHOP_SCRIPTS,
  shops: WORKSHOP_SHOPS,
  fish: WORKSHOP_FISH,
  fisheries: WORKSHOP_FISHERIES,
  fallen: FALLEN,
};
