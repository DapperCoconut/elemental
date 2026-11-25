import type { CourtBundle } from '../../../../IslesTypes';
import { CIRCUIT_AREA } from './area';
import { CIRCUIT_ENCOUNTERS, CIRCUIT_GIMMICKS } from './encounters';
import { CIRCUIT_FLOOR } from './floor';
import { FALLEN } from './fallen';
import { ART_BYTE, CIRCUIT_FISH, CIRCUIT_FISHERIES, CIRCUIT_ITEMS, CIRCUIT_SCRIPTS, CIRCUIT_SHOPS } from './items';
import { CIRCUIT_COLOR } from './palette';
import { BYTE_BOSS } from './prince';
import { CIRCUIT_QUESTS } from './quests';

/**
 * The Circuit Court — technology, tier 2 of Voltreach, Prince Byte the Reckoner.
 *
 * West of the Dynamo along the bus: a town laid out like a circuit board, where the Tabulator — a
 * valve computer the size of a chapel — reckons every household's Draw off the punched cards, and
 * the short are switched off by the number printed beside their door. See docs/ten-isles/electricity.md
 * for the court's place on the isle, and each file here for its part.
 */
export const CIRCUIT_COURT: CourtBundle = {
  court: {
    id: 'circuit',
    isle: 'electricity',
    element: 'technology',
    name: 'The Circuit Court',
    prince: { id: 'byte', name: 'Prince Byte', title: 'the Reckoner', artifact: ART_BYTE },
    tier: 2,
    area: 'circuit',
    floor: CIRCUIT_FLOOR,
    encounters: CIRCUIT_ENCOUNTERS,
    quests: CIRCUIT_QUESTS,
    color: CIRCUIT_COLOR,
  },
  area: CIRCUIT_AREA,
  gimmicks: CIRCUIT_GIMMICKS,
  boss: BYTE_BOSS,
  items: CIRCUIT_ITEMS,
  scripts: CIRCUIT_SCRIPTS,
  shops: CIRCUIT_SHOPS,
  fish: CIRCUIT_FISH,
  fisheries: CIRCUIT_FISHERIES,
  fallen: FALLEN,
};
