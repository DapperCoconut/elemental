import type { DungeonBundle } from '../../../../IslesTypes';
import { HELIOSTAT_AREA } from './area';
import { AURIEL_BOSS } from './auriel';
import { HELIOSTAT_FLOOR } from './floor';
import { HELIOSTAT_ITEMS, HELIOSTAT_SCRIPTS } from './items';
import { HELIOSTAT_GIMMICKS, HELIOSTAT_WARDENS } from './wardens';

/**
 * Solmara's dungeon: the Heliostat (Despot Auriel's crown of mirrors on the summit, climbed from
 * its foot to the Crown), its three wardens and their gimmicks, the warden arena floor (registered
 * under key `heliostat`), Despot Auriel of the Endless Noon himself, his pinned sun and the two
 * charms found in the machine.
 */
export const LIGHT_DUNGEON: DungeonBundle = {
  area: HELIOSTAT_AREA,
  encounters: HELIOSTAT_WARDENS,
  gimmicks: HELIOSTAT_GIMMICKS,
  boss: AURIEL_BOSS,
  floor: HELIOSTAT_FLOOR,
  items: HELIOSTAT_ITEMS,
  scripts: HELIOSTAT_SCRIPTS,
};
