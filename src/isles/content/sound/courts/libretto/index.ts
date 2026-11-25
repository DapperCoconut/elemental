import type { CourtBundle } from '../../../../IslesTypes';
import { LIBRETTO_AREA } from './area';
import { LIBRETTO_ENCOUNTERS, LIBRETTO_GIMMICKS } from './encounters';
import { FALLEN } from './fallen';
import { LIBRETTO_FLOOR } from './floor';
import { ART_FOLIO, LIBRETTO_FISH, LIBRETTO_FISHERIES, LIBRETTO_ITEMS, LIBRETTO_SCRIPTS, LIBRETTO_SHOPS } from './items';
import { LIBRETTO_COLOR } from './palette';
import { FOLIO_BOSS } from './prince';
import { LIBRETTO_QUESTS } from './quests';

/**
 * The Libretto Court — paper, tier 2 of Choirholm, Prince Folio the Librettist.
 *
 * The copyists' town on the lower terraces west of Carillon Quay, where the words of the
 * Maestro's Score are written, copied four hundred times a day, printed for every house — and
 * every other word anybody writes is struck out in the Censor's red. See docs/ten-isles/sound.md
 * for the court's place on the isle, and each file here for its part.
 */
export const LIBRETTO_COURT: CourtBundle = {
  court: {
    id: 'libretto',
    isle: 'sound',
    element: 'paper',
    name: 'The Libretto Court',
    prince: { id: 'folio', name: 'Prince Folio', title: 'the Librettist', artifact: ART_FOLIO },
    tier: 2,
    area: 'libretto',
    floor: LIBRETTO_FLOOR,
    encounters: LIBRETTO_ENCOUNTERS,
    quests: LIBRETTO_QUESTS,
    color: LIBRETTO_COLOR,
  },
  area: LIBRETTO_AREA,
  gimmicks: LIBRETTO_GIMMICKS,
  boss: FOLIO_BOSS,
  items: LIBRETTO_ITEMS,
  scripts: LIBRETTO_SCRIPTS,
  shops: LIBRETTO_SHOPS,
  fish: LIBRETTO_FISH,
  fisheries: LIBRETTO_FISHERIES,
  fallen: FALLEN,
};
