import type { CourtBundle } from '../../../../IslesTypes';
import { HEARTH_AREA } from './area';
import { HEARTH_ENCOUNTERS, HEARTH_GIMMICKS } from './encounters';
import { HEARTH_FLOOR } from './floor';
import { FALLEN } from './fallen';
import { HEARTH_FISH, HEARTH_FISHERIES, HEARTH_ITEMS, HEARTH_SCRIPTS, HEARTH_SHOPS } from './items';
import { EMBER } from './palette';
import { KINDLE_BOSS } from './prince';
import { HEARTH_QUESTS } from './quests';

/**
 * The Hearth Court — fire, tier 1, Prince Kindle the Hearthwarden.
 *
 * The first court up the hill from Emberport: a terraced chimney town where every household
 * must keep a Tithe Fire burning. See docs/ten-isles.md for the court's place in Brandmark.
 */
export const HEARTH_COURT: CourtBundle = {
  court: {
    id: 'hearth',
    isle: 'fire',
    element: 'fire',
    name: 'The Hearth Court',
    prince: { id: 'kindle', name: 'Prince Kindle', title: 'the Hearthwarden', artifact: 'art-kindle' },
    tier: 1,
    area: 'hearth',
    floor: HEARTH_FLOOR,
    encounters: HEARTH_ENCOUNTERS,
    quests: HEARTH_QUESTS,
    color: EMBER,
  },
  area: HEARTH_AREA,
  gimmicks: HEARTH_GIMMICKS,
  boss: KINDLE_BOSS,
  items: HEARTH_ITEMS,
  scripts: HEARTH_SCRIPTS,
  shops: HEARTH_SHOPS,
  fish: HEARTH_FISH,
  fisheries: HEARTH_FISHERIES,
  fallen: FALLEN,
};
