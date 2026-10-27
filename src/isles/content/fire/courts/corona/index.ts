import type { CourtBundle, CourtDef } from '../../../../IslesTypes';
import { CORONA_ACCENT } from './palette';
import { CORONA_AREA } from './area';
import { CORONA_FLOOR } from './floor';
import { CORONA_ENCOUNTERS } from './encounters';
import { CORONA_QUESTS } from './quests';
import { CORONA_GIMMICKS } from './gimmicks';
import { FLUX_BOSS } from './boss';
import { CORONA_FISH, CORONA_FISHERIES, CORONA_ITEMS, CORONA_SCRIPTS, CORONA_SHOPS } from './items';

/**
 * The Corona Court — plasma, tier 3, Prince Flux. A plateau of sand fused into glass, where the
 * King's scholar-son keeps a captive sun in a brass armillary and meters its warmth out to the
 * households that keep their Tithe Fires lit. See docs/ten-isles.md.
 */
const CORONA: CourtDef = {
  id: 'corona',
  isle: 'fire',
  element: 'plasma',
  name: 'The Corona Court',
  prince: { id: 'flux', name: 'Prince Flux', title: 'Keeper of the Captive Sun', artifact: 'art-flux' },
  tier: 3,
  area: 'corona',
  floor: CORONA_FLOOR,
  encounters: CORONA_ENCOUNTERS,
  quests: CORONA_QUESTS,
  color: CORONA_ACCENT,
};

export const CORONA_COURT: CourtBundle = {
  court: CORONA,
  area: CORONA_AREA,
  gimmicks: CORONA_GIMMICKS,
  boss: FLUX_BOSS,
  items: CORONA_ITEMS,
  scripts: CORONA_SCRIPTS,
  shops: CORONA_SHOPS,
  fish: CORONA_FISH,
  fisheries: CORONA_FISHERIES,
};
