import type { PinnacleTierBundle } from '../../../../IslesTypes';
import { EARTH_BENCH_AREA } from './area';
import { EARTH_BENCH_COUNCILORS, EARTH_BENCH_DECREES } from './councilors';
import { EARTH_BENCH_FLOOR } from './floor';
import { EARTH_BENCH_INTRO } from './intro';
import { EARTH_BENCH_ITEMS, EARTH_BENCH_SCRIPTS } from './relic';

/**
 * The Stone Bench — fifth bench of the Obsidian Pinnacle, where the Stone Tithe was written: the
 * vault of strata and the Great Scale, its six councilors and their decrees, the weighing-floor
 * they fight on, the Honest Weight, and the intro cinematic.
 */
export const PIN_EARTH: PinnacleTierBundle = {
  area: EARTH_BENCH_AREA,
  encounters: EARTH_BENCH_COUNCILORS,
  gimmicks: EARTH_BENCH_DECREES,
  floor: EARTH_BENCH_FLOOR,
  items: EARTH_BENCH_ITEMS,
  scripts: EARTH_BENCH_SCRIPTS,
  cutscenes: [EARTH_BENCH_INTRO],
};
