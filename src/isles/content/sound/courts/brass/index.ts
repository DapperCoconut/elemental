import type { CourtBundle } from '../../../../IslesTypes';
import { BRASS_AREA } from './area';
import { BRASS_ENCOUNTERS, BRASS_GIMMICKS } from './encounters';
import { FALLEN } from './fallen';
import { BRASS_FLOOR } from './floor';
import {
  ART_FANFARE, BRASS_BAKERIES, BRASS_FISH, BRASS_FISHERIES, BRASS_ITEMS, BRASS_SCRIPTS, BRASS_SHOPS,
} from './items';
import { BRASS_COLOR } from './palette';
import { FANFARE_BOSS } from './prince';
import { BRASS_QUESTS } from './quests';

/**
 * The Brass Court — sound, tier 1 of Choirholm, Prince Fanfare the Herald of the Hours.
 *
 * The first court up the Parade from Carillon Quay: the bandsmen's town on a sunny green
 * terrace, bandstands on every lawn and brass on every chimney, where the Score is called
 * first at each Hour from the Fanfare Gate. See docs/ten-isles/sound.md for the court's place
 * on the isle, and each file here for its part.
 */
export const BRASS_COURT: CourtBundle = {
  court: {
    id: 'brass',
    isle: 'sound',
    element: 'sound',
    name: 'The Brass Court',
    prince: { id: 'fanfare', name: 'Prince Fanfare', title: 'the Herald of the Hours', artifact: ART_FANFARE },
    tier: 1,
    area: 'brass',
    floor: BRASS_FLOOR,
    encounters: BRASS_ENCOUNTERS,
    quests: BRASS_QUESTS,
    color: BRASS_COLOR,
  },
  area: BRASS_AREA,
  gimmicks: BRASS_GIMMICKS,
  boss: FANFARE_BOSS,
  items: BRASS_ITEMS,
  scripts: BRASS_SCRIPTS,
  shops: BRASS_SHOPS,
  bakeries: BRASS_BAKERIES,
  fish: BRASS_FISH,
  fisheries: BRASS_FISHERIES,
  fallen: FALLEN,
};
