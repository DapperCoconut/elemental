import type { DungeonBundle } from '../../../../IslesTypes';
import { HOUSE_AREA } from './area';
import { HOUSE_FLOOR } from './floor';
import { HOUSE_ITEMS, HOUSE_SCRIPTS } from './items';
import { LUCAN_BOSS } from './lucan';
import { HOUSE_GIMMICKS, HOUSE_WARDENS } from './wardens';

/**
 * Lotterhaven's dungeon: the House (the Croupier-King's casino-palace on the summit, climbed from
 * the cellar door through the Roulette Floor, the Dice Stair and the Card Gallery to the High
 * Table), its three wardens and their gimmicks, the warden arena floor (registered under key
 * `house`), the Croupier-King Lucan himself, his artifact and the House's chest charms.
 */
export const FATE_DUNGEON: DungeonBundle = {
  area: HOUSE_AREA,
  encounters: HOUSE_WARDENS,
  gimmicks: HOUSE_GIMMICKS,
  boss: LUCAN_BOSS,
  floor: HOUSE_FLOOR,
  items: HOUSE_ITEMS,
  scripts: HOUSE_SCRIPTS,
};
