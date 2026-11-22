import type { DungeonBundle } from '../../../../IslesTypes';
import { CROWNCOIL_AREA } from './area';
import { CROWNCOIL_FLOOR } from './floor';
import { CROWNCOIL_ITEMS, CROWNCOIL_SCRIPTS } from './items';
import { OHMRINE_BOSS } from './ohmrine';
import { CROWNCOIL_GIMMICKS, CROWNCOIL_WARDENS } from './wardens';

/**
 * The Electricity Isle's dungeon: the Crown Coil (Empress Ohmrine's tower of copper rings on the
 * summit of Voltreach, climbed upward from the Superposition Court), its three wardens and their
 * gimmicks, the warden arena floor (registered under key `crowncoil`), Empress Ohmrine herself,
 * her artifact and the tower's chest charms.
 */
export const ELECTRICITY_DUNGEON: DungeonBundle = {
  area: CROWNCOIL_AREA,
  encounters: CROWNCOIL_WARDENS,
  gimmicks: CROWNCOIL_GIMMICKS,
  boss: OHMRINE_BOSS,
  floor: CROWNCOIL_FLOOR,
  items: CROWNCOIL_ITEMS,
  scripts: CROWNCOIL_SCRIPTS,
};
