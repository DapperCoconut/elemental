import type { CourtBundle } from '../../../../IslesTypes';
import { MASQUE_AREA } from './area';
import { MASQUE_ENCOUNTERS, MASQUE_GIMMICKS } from './encounters';
import { MASQUE_FLOOR } from './floor';
import { ART_FACADE, MASQUE_FISH, MASQUE_FISHERIES, MASQUE_ITEMS, MASQUE_SCRIPTS, MASQUE_SHOPS } from './items';
import { MASQUE_COLOR } from './palette';
import { FACADE_BOSS } from './prince';
import { MASQUE_QUESTS } from './quests';

/**
 * The Masquerade Court — illusion, tier 3 of Choirholm, Prince Facade the Two-Faced.
 *
 * The canal town east of the Brass Court, where the Maestro's choir is kept faceless: everyone
 * over seven masked, every mask carrying its wearer's Part on the brow, the ball never ending so
 * that nobody need speak, and the lagoon set alight at every Compline so nobody hears their own
 * in the Organ. See docs/ten-isles/sound.md for the court's place on the isle, and each file here
 * for its part.
 */
export const MASQUE_COURT: CourtBundle = {
  court: {
    id: 'masque',
    isle: 'sound',
    element: 'illusion',
    name: 'The Masquerade Court',
    prince: { id: 'facade', name: 'Prince Facade', title: 'the Two-Faced', artifact: ART_FACADE },
    tier: 3,
    area: 'masque',
    floor: MASQUE_FLOOR,
    encounters: MASQUE_ENCOUNTERS,
    quests: MASQUE_QUESTS,
    color: MASQUE_COLOR,
  },
  area: MASQUE_AREA,
  gimmicks: MASQUE_GIMMICKS,
  boss: FACADE_BOSS,
  items: MASQUE_ITEMS,
  scripts: MASQUE_SCRIPTS,
  shops: MASQUE_SHOPS,
  fish: MASQUE_FISH,
  fisheries: MASQUE_FISHERIES,
};
