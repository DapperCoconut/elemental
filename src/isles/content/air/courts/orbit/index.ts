import type { CourtBundle, CourtDef } from '../../../../IslesTypes';
import { ORBIT_ACCENT } from './palette';
import { ORBIT_AREA } from './area';
import { ORBIT_FLOOR } from './floor';
import { ORBIT_ENCOUNTERS } from './encounters';
import { ORBIT_QUESTS } from './quests';
import { ORBIT_GIMMICKS } from './gimmicks';
import { PERIGEE_BOSS } from './boss';
import { ORBIT_FISH, ORBIT_FISHERIES, ORBIT_ITEMS, ORBIT_SCRIPTS, ORBIT_SHOPS } from './items';
import { FALLEN } from './fallen';

/**
 * The Orbit Court — gravity, tier 3, Prince Perigee. A brass orrery town on islets of rock hung
 * in the sky round a black lodestone moon, every islet held on a chain — and the Prince keeps the
 * Breath Tax by shortening them, a link per missed payment, so a debtor's house swings nearer the
 * moon each pass, where breath weighs more and costs more. See docs/ten-isles.md → Highspire.
 */
const ORBIT: CourtDef = {
  id: 'orbit',
  isle: 'air',
  element: 'gravity',
  name: 'The Orbit Court',
  prince: { id: 'perigee', name: 'Prince Perigee', title: 'The Closest Approach', artifact: 'art-perigee' },
  tier: 3,
  area: 'orbit',
  floor: ORBIT_FLOOR,
  encounters: ORBIT_ENCOUNTERS,
  quests: ORBIT_QUESTS,
  color: ORBIT_ACCENT,
};

export const ORBIT_COURT: CourtBundle = {
  court: ORBIT,
  area: ORBIT_AREA,
  gimmicks: ORBIT_GIMMICKS,
  boss: PERIGEE_BOSS,
  items: ORBIT_ITEMS,
  scripts: ORBIT_SCRIPTS,
  shops: ORBIT_SHOPS,
  fish: ORBIT_FISH,
  fisheries: ORBIT_FISHERIES,
  fallen: FALLEN,
};
