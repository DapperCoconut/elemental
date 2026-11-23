import type { PinnacleTierBundle } from '../../../../IslesTypes';
import { FATE_BENCH_AREA } from './area';
import { FATE_BENCH_INTRO } from './cine';
import { FATE_COUNCILORS, FATE_DECREES } from './councilors';
import { FATE_BENCH_FLOOR } from './floor';
import { FATE_RELIC_ITEMS, FATE_RELIC_SCRIPTS } from './relic';

/**
 * The Lot Bench — the eighth bench of the Obsidian Pinnacle, where Lotterhaven's Lot was written:
 * the gaming-floor room and its Wheel of Sixty, six councilors and their six decrees (the Drawn
 * Lot, the Auction Block, the Hour Bill, the Pawn Counter, the Still Mind, the Partition), the
 * fight floor, the Honest Drum relic and the intro cinematic.
 */
export const PIN_FATE: PinnacleTierBundle = {
  area: FATE_BENCH_AREA,
  encounters: FATE_COUNCILORS,
  gimmicks: FATE_DECREES,
  floor: FATE_BENCH_FLOOR,
  items: FATE_RELIC_ITEMS,
  scripts: FATE_RELIC_SCRIPTS,
  cutscenes: [FATE_BENCH_INTRO],
};
