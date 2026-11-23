import type { CourtBundle } from '../../../../IslesTypes';
import { ARCANE_AREA } from './area';
import { ARCANE_ENCOUNTERS, ARCANE_GIMMICKS } from './encounters';
import { ARCANE_FLOOR } from './floor';
import { ART_SIGIL, ARCANE_FISH, ARCANE_FISHERIES, ARCANE_ITEMS, ARCANE_SCRIPTS, ARCANE_SHOPS } from './items';
import { ARCANE_COLOR } from './palette';
import { SIGIL_BOSS } from './prince';
import { ARCANE_QUESTS } from './quests';

/**
 * The Arcane Court — magic, tier 3 of Solmara, Prince Sigil the Radiance of the Circle.
 *
 * The mages' town on the south-east terrace, east of Meridian Quay and south of the Workshop:
 * observatories that point at nothing, a familiar market that may not sell black cats, a spring
 * of liquid light, and in the middle of it all the Anchor Circle, the great sigil that holds the
 * Heliostat's mirrors to the sun. See docs/ten-isles/light.md for the court's place on the isle,
 * and each file here for its part.
 */
export const ARCANE_COURT: CourtBundle = {
  court: {
    id: 'arcane',
    isle: 'light',
    element: 'magic',
    name: 'The Arcane Court',
    prince: { id: 'sigil', name: 'Prince Sigil', title: 'the Radiance of the Circle', artifact: ART_SIGIL },
    tier: 3,
    area: 'arcane',
    floor: ARCANE_FLOOR,
    encounters: ARCANE_ENCOUNTERS,
    quests: ARCANE_QUESTS,
    color: ARCANE_COLOR,
  },
  area: ARCANE_AREA,
  gimmicks: ARCANE_GIMMICKS,
  boss: SIGIL_BOSS,
  items: ARCANE_ITEMS,
  scripts: ARCANE_SCRIPTS,
  shops: ARCANE_SHOPS,
  fish: ARCANE_FISH,
  fisheries: ARCANE_FISHERIES,
};
