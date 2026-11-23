import type { CourtBundle } from '../../../../IslesTypes';
import { CATHEDRAL_AREA } from './area';
import { CATHEDRAL_ENCOUNTERS, CATHEDRAL_GIMMICKS } from './encounters';
import { CATHEDRAL_FLOOR } from './floor';
import { ART_VESPER, CATHEDRAL_FISH, CATHEDRAL_FISHERIES, CATHEDRAL_ITEMS, CATHEDRAL_SCRIPTS, CATHEDRAL_SHOPS } from './items';
import { CATHEDRAL_COLOR } from './palette';
import { VESPER_BOSS } from './prince';
import { CATHEDRAL_QUESTS } from './quests';

/**
 * The Cathedral Court — passion (Devotion), tier 4 of Choirholm, Prince Vesper the Evening Voice.
 *
 * The summit of the isle: the Maestro's cathedral of the Score, its candles bought by the penny and
 * counted, its confessions read by the Tuners, and behind it, cut into the mountain, the Bellows
 * Door of the Great Organ where every muted voice on Choirholm is kept. See docs/ten-isles/sound.md
 * for the court's place on the isle, and each file here for its part.
 */
export const CATHEDRAL_COURT: CourtBundle = {
  court: {
    id: 'cathedral',
    isle: 'sound',
    element: 'passion',
    name: 'The Cathedral Court',
    prince: { id: 'vesper', name: 'Prince Vesper', title: 'the Evening Voice', artifact: ART_VESPER },
    tier: 4,
    area: 'cathedral',
    floor: CATHEDRAL_FLOOR,
    encounters: CATHEDRAL_ENCOUNTERS,
    quests: CATHEDRAL_QUESTS,
    color: CATHEDRAL_COLOR,
  },
  area: CATHEDRAL_AREA,
  gimmicks: CATHEDRAL_GIMMICKS,
  boss: VESPER_BOSS,
  items: CATHEDRAL_ITEMS,
  scripts: CATHEDRAL_SCRIPTS,
  shops: CATHEDRAL_SHOPS,
  fish: CATHEDRAL_FISH,
  fisheries: CATHEDRAL_FISHERIES,
};
