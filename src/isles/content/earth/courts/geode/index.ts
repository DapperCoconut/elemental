import type { CourtBundle } from '../../../../IslesTypes';
import { GEODE_AREA } from './area';
import { GEODE_ENCOUNTERS, GEODE_GIMMICKS } from './encounters';
import { GEODE_FLOOR } from './floor';
import { ART_FACET, GEODE_FISH, GEODE_FISHERIES, GEODE_ITEMS, GEODE_SCRIPTS, GEODE_SHOPS } from './items';
import { GEODE_COLOR } from './palette';
import { FACET_BOSS } from './prince';
import { GEODE_QUESTS } from './quests';

/**
 * The Geode Court — crystal, tier 3 of Bedrock Hold, Prince Facet the Flawless.
 *
 * A town inside a split geode, east of Quarrymouth and south of the Forge: amethyst walls on
 * every side, light through the crack in the roof, and the Loupe Table at the gate where every
 * household's Tithe of cut stone is graded — flawless counts, flawed goes to the Grinding Wheel,
 * and a house that grades short goes down to the Sepulchre. See docs/ten-isles/earth.md for the
 * court's place on the isle, and each file here for its part.
 */
export const GEODE_COURT: CourtBundle = {
  court: {
    id: 'geode',
    isle: 'earth',
    element: 'crystal',
    name: 'The Geode Court',
    prince: { id: 'facet', name: 'Prince Facet', title: 'the Flawless', artifact: ART_FACET },
    tier: 3,
    area: 'geode',
    floor: GEODE_FLOOR,
    encounters: GEODE_ENCOUNTERS,
    quests: GEODE_QUESTS,
    color: GEODE_COLOR,
  },
  area: GEODE_AREA,
  gimmicks: GEODE_GIMMICKS,
  boss: FACET_BOSS,
  items: GEODE_ITEMS,
  scripts: GEODE_SCRIPTS,
  shops: GEODE_SHOPS,
  fish: GEODE_FISH,
  fisheries: GEODE_FISHERIES,
};
