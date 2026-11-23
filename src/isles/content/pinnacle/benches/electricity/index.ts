import type { PinnacleTierBundle } from '../../../../IslesTypes';
import { STORM_AREA } from './area';
import { STORM_COUNCILORS, STORM_DECREES } from './councilors';
import { STORM_FLOOR } from './floor';
import { STORM_INTRO } from './intro';
import { RELIC_ITEMS, RELIC_SCRIPTS } from './relic';

/**
 * Bench 6 of the Obsidian Pinnacle — the Storm Bench, where the Draw was written: the room (the
 * Meter, the jar ranks, the cable trees), its six councilors and their decrees, the fight floor,
 * the Meter's Needle relic and the intro cinematic.
 */
export const PIN_ELECTRICITY: PinnacleTierBundle = {
  area: STORM_AREA,
  encounters: STORM_COUNCILORS,
  gimmicks: STORM_DECREES,
  floor: STORM_FLOOR,
  items: RELIC_ITEMS,
  scripts: RELIC_SCRIPTS,
  cutscenes: [STORM_INTRO],
};
