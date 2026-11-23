import type { PinnacleTierBundle } from '../../../../IslesTypes';
import { BENCH_LIFE_AREA } from './area';
import { BENCH_LIFE_COUNCILORS, BENCH_LIFE_GIMMICKS } from './councilors';
import { BENCH_LIFE_FLOOR } from './floor';
import { BENCH_LIFE_INTRO } from './intro';
import { BENCH_LIFE_ITEMS, BENCH_LIFE_SCRIPTS } from './relic';

/**
 * The Thorn Bench (bench 3, Thornwild): the obsidian hothouse where the Pruning was written, its
 * six councilors and their decrees, the fight floor, the Unjarred Sapling and the intro cinematic.
 */
export const PIN_LIFE: PinnacleTierBundle = {
  area: BENCH_LIFE_AREA,
  encounters: BENCH_LIFE_COUNCILORS,
  gimmicks: BENCH_LIFE_GIMMICKS,
  floor: BENCH_LIFE_FLOOR,
  items: BENCH_LIFE_ITEMS,
  scripts: BENCH_LIFE_SCRIPTS,
  cutscenes: [BENCH_LIFE_INTRO],
};
