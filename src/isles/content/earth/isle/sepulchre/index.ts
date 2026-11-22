import type { DungeonBundle } from '../../../../IslesTypes';
import { SEPULCHRE_AREA } from './area';
import { SEPULCHRE_FLOOR } from './floor';
import { GRAVANE_BOSS } from './gravane';
import { SEPULCHRE_ITEMS, SEPULCHRE_SCRIPTS } from './items';
import { SEPULCHRE_GIMMICKS, SEPULCHRE_WARDENS } from './wardens';

/**
 * Bedrock Hold's dungeon: the Sepulchre (Regent Gravane's hold, dug downward under the Rubble
 * Court), its three wardens and their gimmicks, the warden arena floor (registered under key
 * `sepulchre`), Regent Gravane himself, his artifact and the hold's two chest charms.
 */
export const EARTH_DUNGEON: DungeonBundle = {
  area: SEPULCHRE_AREA,
  encounters: SEPULCHRE_WARDENS,
  gimmicks: SEPULCHRE_GIMMICKS,
  boss: GRAVANE_BOSS,
  floor: SEPULCHRE_FLOOR,
  items: SEPULCHRE_ITEMS,
  scripts: SEPULCHRE_SCRIPTS,
};
