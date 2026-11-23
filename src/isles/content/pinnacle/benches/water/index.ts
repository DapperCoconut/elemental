import type { PinnacleTierBundle } from '../../../../IslesTypes';
import { WATER_BENCH_AREA } from './area';
import { WATER_COUNCILORS, WATER_DECREES } from './councilors';
import { WATER_BENCH_FLOOR } from './floor';
import { WATER_INTRO } from './intro';
import { WATER_RELIC_ITEMS, WATER_RELIC_SCRIPTS } from './relic';

/**
 * The Tide Bench — the Obsidian Pinnacle's second bench, where the Undertow was written: the
 * drowned chamber and its Tide-Clock, six councilors and their six decrees, the fighting floor,
 * the Slack-Water Hand and the bench's intro cinematic.
 */
export const PIN_WATER: PinnacleTierBundle = {
  area: WATER_BENCH_AREA,
  encounters: WATER_COUNCILORS,
  gimmicks: WATER_DECREES,
  floor: WATER_BENCH_FLOOR,
  items: WATER_RELIC_ITEMS,
  scripts: WATER_RELIC_SCRIPTS,
  cutscenes: [WATER_INTRO],
};
