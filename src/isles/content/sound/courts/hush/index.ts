import type { CourtBundle } from '../../../../IslesTypes';
import { HUSH_AREA } from './area';
import { HUSH_ENCOUNTERS, HUSH_GIMMICKS } from './encounters';
import { HUSH_FLOOR } from './floor';
import { ART_MUTE, HUSH_FISH, HUSH_FISHERIES, HUSH_ITEMS, HUSH_SCRIPTS, HUSH_SHOPS } from './items';
import { HUSH_COLOR } from './palette';
import { MUTE_BOSS } from './prince';
import { HUSH_QUESTS } from './quests';

/**
 * The Hush Court — silence, tier 3 of Choirholm, Prince Mute the Unheard.
 *
 * The wardens' town on the high east terrace, snowbound and muffled, where the silence between
 * the Hours is kept: talk is noise, noise is fined, and a voice that sings its own tune goes to
 * the Quiet House and up the mountain into the Great Organ. See docs/ten-isles/sound.md for the
 * court's place on the isle, and each file here for its part.
 */
export const HUSH_COURT: CourtBundle = {
  court: {
    id: 'hush',
    isle: 'sound',
    element: 'silence',
    name: 'The Hush Court',
    prince: { id: 'mute', name: 'Prince Mute', title: 'the Unheard', artifact: ART_MUTE },
    tier: 3,
    area: 'hush',
    floor: HUSH_FLOOR,
    encounters: HUSH_ENCOUNTERS,
    quests: HUSH_QUESTS,
    color: HUSH_COLOR,
  },
  area: HUSH_AREA,
  gimmicks: HUSH_GIMMICKS,
  boss: MUTE_BOSS,
  items: HUSH_ITEMS,
  scripts: HUSH_SCRIPTS,
  shops: HUSH_SHOPS,
  fish: HUSH_FISH,
  fisheries: HUSH_FISHERIES,
};
