import type { PinnacleTierBundle } from '../../../../IslesTypes';
import { CHOIR_AREA } from './area';
import { CHOIR_CINE } from './cine';
import { CHOIR_COUNCILORS, CHOIR_DECREES } from './councilors';
import { CHOIR_FLOOR } from './floor';
import { CHOIR_RELIC, CHOIR_SCRIPTS } from './relic';

/**
 * The Choir Bench — ninth bench of the Obsidian Pinnacle, where the Part was written: an empty
 * amphitheatre of black glass climbing to the Voice Vault, six councilors of Choirholm's six
 * elements, their six decrees, the Unstoppered Jar and the bench's intro cinematic.
 */
export const PIN_SOUND: PinnacleTierBundle = {
  area: CHOIR_AREA,
  encounters: CHOIR_COUNCILORS,
  gimmicks: CHOIR_DECREES,
  floor: CHOIR_FLOOR,
  items: [CHOIR_RELIC],
  scripts: CHOIR_SCRIPTS,
  cutscenes: [CHOIR_CINE],
};
