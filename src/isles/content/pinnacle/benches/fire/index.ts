import type { PinnacleTierBundle } from '../../../../IslesTypes';
import { BENCH_FIRE_AREA } from './area';
import { BENCH_FIRE_COUNCILORS, BENCH_FIRE_GIMMICKS } from './councilors';
import { BENCH_FIRE_FLOOR } from './floor';
import { BENCH_FIRE_INTRO } from './intro';
import { BENCH_FIRE_ITEMS, BENCH_FIRE_SCRIPTS } from './relic';

/**
 * The Ember Bench (`bench-fire`), first of the Obsidian Pinnacle's ten: the cold glass-foundry
 * where Brandmark's law was written, its six councilors and their decrees, the fighting floor,
 * the Turned Iron relic and the arrival cinematic.
 */
export const PIN_FIRE: PinnacleTierBundle = {
  area: BENCH_FIRE_AREA,
  encounters: BENCH_FIRE_COUNCILORS,
  gimmicks: BENCH_FIRE_GIMMICKS,
  floor: BENCH_FIRE_FLOOR,
  items: BENCH_FIRE_ITEMS,
  scripts: BENCH_FIRE_SCRIPTS,
  cutscenes: [BENCH_FIRE_INTRO],
};
