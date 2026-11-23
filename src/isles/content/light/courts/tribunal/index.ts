import type { CourtBundle } from '../../../../IslesTypes';
import { TRIBUNAL_AREA } from './area';
import { TRIBUNAL_ENCOUNTERS, TRIBUNAL_GIMMICKS } from './encounters';
import { TRIBUNAL_FLOOR } from './floor';
import { ART_VERDICT, TRIBUNAL_FISH, TRIBUNAL_FISHERIES, TRIBUNAL_ITEMS, TRIBUNAL_SCRIPTS, TRIBUNAL_SHOPS } from './items';
import { TRIBUNAL_COLOR } from './palette';
import { VERDICT_BOSS } from './prince';
import { TRIBUNAL_QUESTS } from './quests';

/**
 * The Tribunal Court — justice, tier 4 of Solmara, Prince Verdict, Radiance of the Tribunal.
 *
 * The summit terrace under the Heliostat: the glass Courthouse of Clarity where shade-thieves are
 * tried in full view, the mirror cages where the accused wait in the sun, the Despot's Palace of
 * Noon behind its railings, and — between the Heliostat's iron legs — the door up to the Crown.
 * See docs/ten-isles/light.md for the court's place on the isle, and each file here for its part.
 */
export const TRIBUNAL_COURT: CourtBundle = {
  court: {
    id: 'tribunal',
    isle: 'light',
    element: 'justice',
    name: 'The Tribunal Court',
    prince: { id: 'verdict', name: 'Prince Verdict', title: 'Radiance of the Tribunal', artifact: ART_VERDICT },
    tier: 4,
    area: 'tribunal',
    floor: TRIBUNAL_FLOOR,
    encounters: TRIBUNAL_ENCOUNTERS,
    quests: TRIBUNAL_QUESTS,
    color: TRIBUNAL_COLOR,
  },
  area: TRIBUNAL_AREA,
  gimmicks: TRIBUNAL_GIMMICKS,
  boss: VERDICT_BOSS,
  items: TRIBUNAL_ITEMS,
  scripts: TRIBUNAL_SCRIPTS,
  shops: TRIBUNAL_SHOPS,
  fish: TRIBUNAL_FISH,
  fisheries: TRIBUNAL_FISHERIES,
};
