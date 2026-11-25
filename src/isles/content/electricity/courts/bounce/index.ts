import type { CourtBundle } from '../../../../IslesTypes';
import { BOUNCE_AREA } from './area';
import { BOUNCE_ENCOUNTERS, BOUNCE_GIMMICKS } from './encounters';
import { BOUNCE_FLOOR } from './floor';
import { FALLEN } from './fallen';
import { ART_SPROCKET, BOUNCE_FISH, BOUNCE_FISHERIES, BOUNCE_ITEMS, BOUNCE_SCRIPTS, BOUNCE_SHOPS } from './items';
import { BOUNCE_COLOR } from './palette';
import { SPROCKET_BOSS } from './prince';
import { BOUNCE_QUESTS } from './quests';

/**
 * The Bounce Court — rubber, tier 2 of Voltreach, Prince Sprocket the Wound-Up.
 *
 * The rubber town west of Terminus: tapped plantations, the vulcanizing works, the balloon
 * makers' row, a trampoline square and the Prince's clockwork Toy Works, where every household
 * winds a rubber skein all day and the Works unwinds them all into the Grid at the Brownout Bell.
 * See docs/ten-isles/electricity.md for the court's place on the isle, and each file here for its part.
 */
export const BOUNCE_COURT: CourtBundle = {
  court: {
    id: 'bounce',
    isle: 'electricity',
    element: 'rubber',
    name: 'The Bounce Court',
    prince: { id: 'sprocket', name: 'Prince Sprocket', title: 'the Wound-Up', artifact: ART_SPROCKET },
    tier: 2,
    area: 'bounce',
    floor: BOUNCE_FLOOR,
    encounters: BOUNCE_ENCOUNTERS,
    quests: BOUNCE_QUESTS,
    color: BOUNCE_COLOR,
  },
  area: BOUNCE_AREA,
  gimmicks: BOUNCE_GIMMICKS,
  boss: SPROCKET_BOSS,
  items: BOUNCE_ITEMS,
  scripts: BOUNCE_SCRIPTS,
  shops: BOUNCE_SHOPS,
  fish: BOUNCE_FISH,
  fisheries: BOUNCE_FISHERIES,
  fallen: FALLEN,
};
