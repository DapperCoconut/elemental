import type { PinnacleTierBundle } from '../../../../IslesTypes';
import { LIGHT_BENCH_AREA } from './area';
import { LIGHT_BENCH_INTRO } from './cine';
import { LIGHT_COUNCILORS, LIGHT_DECREES } from './councilors';
import { LIGHT_BENCH_FLOOR } from './floor';
import { LIGHT_RELIC_ITEMS, LIGHT_RELIC_SCRIPTS } from './relic';

/**
 * The Noon Bench — the tenth bench of the Obsidian Pinnacle, directly under the throne hall,
 * where Solmara's Endless Noon was written. Its room (with the Ceiling Seam), its six councilors
 * and their decrees, the fighting floor, the relic (the Unpinned Sun) and the arrival cinematic.
 */
export const PIN_LIGHT: PinnacleTierBundle = {
  area: LIGHT_BENCH_AREA,
  encounters: LIGHT_COUNCILORS,
  gimmicks: LIGHT_DECREES,
  floor: LIGHT_BENCH_FLOOR,
  items: LIGHT_RELIC_ITEMS,
  scripts: LIGHT_RELIC_SCRIPTS,
  cutscenes: [LIGHT_BENCH_INTRO],
};
