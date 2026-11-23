import type { PinnacleTierBundle } from '../../../../IslesTypes';
import { AIR_AREA } from './area';
import { AIR_CINE } from './cine';
import { AIR_COUNCILORS, AIR_DECREES } from './councilors';
import { GALE_FLOOR } from './floor';
import { AIR_ITEMS, AIR_SCRIPTS } from './relic';

/**
 * The Gale Bench (bench 4 of the Obsidian Pinnacle, Highspire's): the outside of the spire, its
 * Breath-Meter, six councilors and their six decrees, the bench's fighting floor, the relic (the
 * Uncorked Breath) and the intro cinematic.
 */
export const PIN_AIR: PinnacleTierBundle = {
  area: AIR_AREA,
  encounters: AIR_COUNCILORS,
  gimmicks: AIR_DECREES,
  floor: GALE_FLOOR,
  items: AIR_ITEMS,
  scripts: AIR_SCRIPTS,
  cutscenes: [AIR_CINE],
};
