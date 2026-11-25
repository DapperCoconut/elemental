import type { CourtBundle } from '../../../../IslesTypes';
import { SLUMBER_AREA } from './area';
import { REVERIE_BOSS } from './boss';
import { SLUMBER_ENCOUNTERS } from './encounters';
import { FALLEN } from './fallen';
import { slumberFloor } from './floor';
import { BAD_DREAM } from './gimmicks/badDream';
import { COUNTING_SHEEP } from './gimmicks/countingSheep';
import { LULLABY } from './gimmicks/lullaby';
import { PILLOW_FIGHT } from './gimmicks/pillowFight';
import { SLEEPWALK } from './gimmicks/sleepwalk';
import {
  ART_REVERIE, SLUMBER_FISH, SLUMBER_FISHERIES, SLUMBER_ITEMS, SLUMBER_SCRIPTS, SLUMBER_SHOPS,
} from './items';
import { SLUMBER_QUESTS } from './quests';

/**
 * The Slumber Court — dream, tier 2 of Highspire, Prince Reverie. The town on the spire's quiet
 * lee shoulder where King Aerion's debtors are becalmed: laid down to sleep in beds along the
 * quilted streets, breathing small under the hum of a felt-muffled bell while the Night-Collector
 * corks their breath for the Lung. See docs/ten-isles.md for the concept, and each file here for
 * its part.
 */
export const SLUMBER_COURT: CourtBundle = {
  court: {
    id: 'slumber',
    isle: 'air',
    element: 'dream',
    name: 'The Slumber Court',
    prince: { id: 'reverie', name: 'Prince Reverie', title: 'His Drowsiness, Warden of the Long Ward', artifact: ART_REVERIE },
    tier: 2,
    area: 'slumber',
    floor: slumberFloor,
    encounters: SLUMBER_ENCOUNTERS,
    quests: SLUMBER_QUESTS,
    color: 0x9a8ae0,
  },
  area: SLUMBER_AREA,
  gimmicks: [COUNTING_SHEEP, SLEEPWALK, BAD_DREAM, PILLOW_FIGHT, LULLABY],
  boss: REVERIE_BOSS,
  items: SLUMBER_ITEMS,
  scripts: SLUMBER_SCRIPTS,
  shops: SLUMBER_SHOPS,
  fish: SLUMBER_FISH,
  fisheries: SLUMBER_FISHERIES,
  fallen: FALLEN,
};
