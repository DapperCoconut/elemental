import type { CourtBundle } from '../../../../IslesTypes';
import { CAVERN_AREA } from './area';
import { CAVERN_ENCOUNTERS, CAVERN_GIMMICKS } from './encounters';
import { CAVERN_FLOOR } from './floor';
import { ART_REPRISE, CAVERN_FISH, CAVERN_FISHERIES, CAVERN_ITEMS, CAVERN_SCRIPTS, CAVERN_SHOPS } from './items';
import { CAVERN_COLOR } from './palette';
import { REPRISE_BOSS } from './prince';
import { CAVERN_QUESTS } from './quests';
import { FALLEN } from './fallen';

/**
 * The Cavern Court — echo, tier 2 of Choirholm, Prince Reprise the Twice-Heard.
 *
 * The Echo Caves west of the Brass Court: a town inside a vast sea-cave where the Maestro's
 * Score was sung into the rock so that it never stops coming back, and every household tops up
 * the Repeat with a verse each Matins. See docs/ten-isles/sound.md for the court's place on the
 * isle, `spots.ts` for its layout, and each file here for its part.
 */
export const CAVERN_COURT: CourtBundle = {
  court: {
    id: 'cavern',
    isle: 'sound',
    element: 'echo',
    name: 'The Cavern Court',
    prince: { id: 'reprise', name: 'Prince Reprise', title: 'the Twice-Heard', artifact: ART_REPRISE },
    tier: 2,
    area: 'cavern',
    floor: CAVERN_FLOOR,
    encounters: CAVERN_ENCOUNTERS,
    quests: CAVERN_QUESTS,
    color: CAVERN_COLOR,
  },
  area: CAVERN_AREA,
  gimmicks: CAVERN_GIMMICKS,
  boss: REPRISE_BOSS,
  items: CAVERN_ITEMS,
  scripts: CAVERN_SCRIPTS,
  shops: CAVERN_SHOPS,
  fish: CAVERN_FISH,
  fisheries: CAVERN_FISHERIES,
  fallen: FALLEN,
};
