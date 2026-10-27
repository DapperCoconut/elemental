import type { CourtBundle, CourtDef } from '../../../../IslesTypes';
import { INKWELL_ACCENT } from './palette';
import { INKWELL_AREA } from './area';
import { INKWELL_FLOOR } from './floor';
import { INKWELL_ENCOUNTERS } from './encounters';
import { INKWELL_QUESTS } from './quests';
import { INKWELL_GIMMICKS } from './gimmicks';
import { BLOT_BOSS } from './boss';
import { INKWELL_FISH, INKWELL_FISHERIES, INKWELL_ITEMS, INKWELL_SCRIPTS, INKWELL_SHOPS } from './items';

/**
 * The Inkwell Court — ink, tier 3, Prince Blot. A scriptorium town on canals of ink, drawn in
 * black, white and the Queen's one blue, where every Dry Tithe receipt in the Reach is printed and
 * every family that cannot pay is blotted from the registry the night before the tide takes their
 * floor. See docs/ten-isles.md → The Drowned Reach.
 */
const INKWELL: CourtDef = {
  id: 'inkwell',
  isle: 'water',
  element: 'ink',
  name: 'The Inkwell Court',
  prince: { id: 'blot', name: 'Prince Blot', title: 'The Queen\'s Censor', artifact: 'art-blot' },
  tier: 3,
  area: 'inkwell',
  floor: INKWELL_FLOOR,
  encounters: INKWELL_ENCOUNTERS,
  quests: INKWELL_QUESTS,
  color: INKWELL_ACCENT,
};

export const INKWELL_COURT: CourtBundle = {
  court: INKWELL,
  area: INKWELL_AREA,
  gimmicks: INKWELL_GIMMICKS,
  boss: BLOT_BOSS,
  items: INKWELL_ITEMS,
  scripts: INKWELL_SCRIPTS,
  shops: INKWELL_SHOPS,
  fish: INKWELL_FISH,
  fisheries: INKWELL_FISHERIES,
};
