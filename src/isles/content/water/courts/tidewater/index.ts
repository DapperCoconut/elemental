import type { CourtBundle } from '../../../../IslesTypes';
import { TIDEWATER_AREA } from './area';
import { TIDEWATER_ENCOUNTERS, TIDEWATER_GIMMICKS } from './encounters';
import { TIDEWATER_FLOOR } from './floor';
import {
  ART_EBB, TIDEWATER_BAKERIES, TIDEWATER_FISH, TIDEWATER_FISHERIES, TIDEWATER_ITEMS, TIDEWATER_SCRIPTS,
  TIDEWATER_SHOPS,
} from './items';
import { TIDEWATER_COLOR } from './palette';
import { EBB_BOSS } from './prince';
import { TIDEWATER_QUESTS } from './quests';

/**
 * The Tidewater Court — water, tier 1 of the Drowned Reach, Prince Ebb the Tidecaller.
 *
 * The first court up the causeway from Brinehollow: a tidal-flat town on stilts where every
 * household pays the Dry Tithe before the Tide Gauge's bell, or is left under. See
 * docs/ten-isles.md for the court's place on the isle, and each file here for its part.
 */
export const TIDEWATER_COURT: CourtBundle = {
  court: {
    id: 'tidewater',
    isle: 'water',
    element: 'water',
    name: 'The Tidewater Court',
    prince: { id: 'ebb', name: 'Prince Ebb', title: 'the Tidecaller', artifact: ART_EBB },
    tier: 1,
    area: 'tidewater',
    floor: TIDEWATER_FLOOR,
    encounters: TIDEWATER_ENCOUNTERS,
    quests: TIDEWATER_QUESTS,
    color: TIDEWATER_COLOR,
  },
  area: TIDEWATER_AREA,
  gimmicks: TIDEWATER_GIMMICKS,
  boss: EBB_BOSS,
  items: TIDEWATER_ITEMS,
  scripts: TIDEWATER_SCRIPTS,
  shops: TIDEWATER_SHOPS,
  bakeries: TIDEWATER_BAKERIES,
  fish: TIDEWATER_FISH,
  fisheries: TIDEWATER_FISHERIES,
};
