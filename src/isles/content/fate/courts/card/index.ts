import type { CourtBundle } from '../../../../IslesTypes';
import { CARD_AREA } from './area';
import { CARD_ENCOUNTERS, CARD_GIMMICKS } from './encounters';
import { FALLEN } from './fallen';
import { CARD_FLOOR } from './floor';
import {
  ART_ANTE, CARD_BAKERIES, CARD_FISH, CARD_FISHERIES, CARD_ITEMS, CARD_SCRIPTS, CARD_SHOPS,
} from './items';
import { CARD_COLOR } from './palette';
import { ANTE_BOSS } from './prince';
import { CARD_QUESTS } from './quests';

/**
 * The Card Court — fate, tier 1 of Lotterhaven, Prince Ante the Opening Stake.
 *
 * The first court up the Red-and-Black from Tosswater: the card-sharps' town on its baize lawns,
 * where every quarrel is cut for at the Cutting Stone, every house is a house of cards held down
 * by a paperweight, and every deck is printed from the House's marked plate. See
 * docs/ten-isles/fate.md for the court's place on the isle, and each file here for its part.
 */
export const CARD_COURT: CourtBundle = {
  court: {
    id: 'card',
    isle: 'fate',
    element: 'fate',
    name: 'The Card Court',
    prince: { id: 'ante', name: 'Prince Ante', title: 'the Opening Stake', artifact: ART_ANTE },
    tier: 1,
    area: 'card',
    floor: CARD_FLOOR,
    encounters: CARD_ENCOUNTERS,
    quests: CARD_QUESTS,
    color: CARD_COLOR,
  },
  area: CARD_AREA,
  gimmicks: CARD_GIMMICKS,
  boss: ANTE_BOSS,
  items: CARD_ITEMS,
  scripts: CARD_SCRIPTS,
  shops: CARD_SHOPS,
  bakeries: CARD_BAKERIES,
  fish: CARD_FISH,
  fisheries: CARD_FISHERIES,
  fallen: FALLEN,
};
