import type { CourtBundle } from '../../../../IslesTypes';
import { TREASURY_AREA } from './area';
import { TREASURY_ENCOUNTERS, TREASURY_GIMMICKS } from './encounters';
import { TREASURY_FLOOR } from './floor';
import { ART_BULLION, TREASURY_FISH, TREASURY_FISHERIES, TREASURY_ITEMS, TREASURY_SCRIPTS, TREASURY_SHOPS } from './items';
import { TREASURY_COLOR } from './palette';
import { BULLION_BOSS } from './prince';
import { TREASURY_QUESTS } from './quests';

/**
 * The Treasury Court — fortune, tier 2 of Lotterhaven, Prince Bullion, Worth His Weight.
 *
 * West of Tosswater over the toll bridge: the King's mint, the Great Vault and the counting-houses,
 * where every household drawn for the Wager-Tithe brings its stake to be weighed — and found, always,
 * a little short. See docs/ten-isles/fate.md for the court's place on the isle, and each file here
 * for its part.
 */
export const TREASURY_COURT: CourtBundle = {
  court: {
    id: 'treasury',
    isle: 'fate',
    element: 'fortune',
    name: 'The Treasury Court',
    prince: { id: 'bullion', name: 'Prince Bullion', title: 'Worth His Weight', artifact: ART_BULLION },
    tier: 2,
    area: 'treasury',
    floor: TREASURY_FLOOR,
    encounters: TREASURY_ENCOUNTERS,
    quests: TREASURY_QUESTS,
    color: TREASURY_COLOR,
  },
  area: TREASURY_AREA,
  gimmicks: TREASURY_GIMMICKS,
  boss: BULLION_BOSS,
  items: TREASURY_ITEMS,
  scripts: TREASURY_SCRIPTS,
  shops: TREASURY_SHOPS,
  fish: TREASURY_FISH,
  fisheries: TREASURY_FISHERIES,
};
