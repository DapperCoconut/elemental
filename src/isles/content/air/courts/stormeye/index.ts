import type { CourtBundle } from '../../../../IslesTypes';
import { STORMEYE_AREA } from './area';
import { SQUALL_BOSS } from './boss';
import { STORMEYE_ENCOUNTERS } from './encounters';
import { STORMEYE_FLOOR } from './floor';
import { STORMEYE_FISH, STORMEYE_FISHERIES, STORMEYE_ITEMS, STORMEYE_SCRIPTS, STORMEYE_SHOPS } from './items';
import { STORMEYE_QUESTS } from './quests';
import { LIGHTNING_ROD } from './gimmicks/lightningRod';
import { HAILSTORM } from './gimmicks/hailstorm';
import { EYE_OF_THE_STORM } from './gimmicks/eyeOfStorm';
import { RAINCATCHER } from './gimmicks/raincatcher';
import { THUNDERCLAP } from './gimmicks/thunderclap';

/**
 * THE STORMEYE COURT — Highspire's walled town in the calm eye of a storm that never ends,
 * forecast (and invoiced) by Prince Squall from the Barometer Tower. Tier 3.
 */
export const STORMEYE_COURT: CourtBundle = {
  court: {
    id: 'stormeye',
    isle: 'air',
    element: 'tempest',
    name: 'The Stormeye Court',
    prince: { id: 'squall', name: 'Prince Squall', title: 'The Forecaster of Stormeye', artifact: 'art-squall' },
    tier: 3,
    area: 'stormeye',
    floor: STORMEYE_FLOOR,
    encounters: STORMEYE_ENCOUNTERS,
    quests: STORMEYE_QUESTS,
    color: 0x9ab0e8,
  },
  area: STORMEYE_AREA,
  gimmicks: [LIGHTNING_ROD, HAILSTORM, EYE_OF_THE_STORM, RAINCATCHER, THUNDERCLAP],
  boss: SQUALL_BOSS,
  items: STORMEYE_ITEMS,
  scripts: STORMEYE_SCRIPTS,
  shops: STORMEYE_SHOPS,
  fish: STORMEYE_FISH,
  fisheries: STORMEYE_FISHERIES,
};
