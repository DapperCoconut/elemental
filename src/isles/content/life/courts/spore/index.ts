import type { CourtBundle, CourtDef } from '../../../../IslesTypes';
import { SPORE_ACCENT } from './palette';
import { SPORE_AREA } from './area';
import { SPORE_FLOOR } from './floor';
import { SPORE_ENCOUNTERS } from './encounters';
import { SPORE_QUESTS } from './quests';
import { SPORE_GIMMICKS } from './gimmicks';
import { MYCEL_BOSS } from './boss';
import { FALLEN } from './fallen';
import { SPORE_FISH, SPORE_FISHERIES, SPORE_ITEMS, SPORE_SCRIPTS, SPORE_SHOPS } from './items';

/**
 * The Spore Court — growth, tier 3, Prince Mycel. A fungal bog town of mushroom houses on rotten
 * boardwalks over black water, where the Prince's glowing threads run under every floor and carry
 * every doorstep whisper home to him — so he knows who will come up short at the Spore Scales
 * before they do. See docs/ten-isles.md → Thornwild.
 */
const SPORE: CourtDef = {
  id: 'spore',
  isle: 'life',
  element: 'growth',
  name: 'The Spore Court',
  prince: { id: 'mycel', name: 'Prince Mycel', title: 'The Ear Beneath the Floor', artifact: 'art-mycel' },
  tier: 3,
  area: 'spore',
  floor: SPORE_FLOOR,
  encounters: SPORE_ENCOUNTERS,
  quests: SPORE_QUESTS,
  color: SPORE_ACCENT,
};

export const SPORE_COURT: CourtBundle = {
  court: SPORE,
  area: SPORE_AREA,
  gimmicks: SPORE_GIMMICKS,
  boss: MYCEL_BOSS,
  items: SPORE_ITEMS,
  scripts: SPORE_SCRIPTS,
  shops: SPORE_SHOPS,
  fish: SPORE_FISH,
  fisheries: SPORE_FISHERIES,
  fallen: FALLEN,
};
