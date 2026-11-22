import type { DungeonBundle } from '../../../../IslesTypes';
import { SLOUGH_AREA } from './area';
import { SLOUGH_FLOOR } from './floor';
import { SLOUGH_ITEMS, SLOUGH_SCRIPTS } from './items';
import { NYXA_BOSS } from './nyxa';
import { SLOUGH_GIMMICKS, SLOUGH_WARDENS } from './wardens';

/**
 * The Venom Isle's dungeon: the Slough (Matriarch Nyxa's own cast skin, coiled in the deepest mire
 * of the Grave Court), its three wardens and their gimmicks, the warden arena floor (registered
 * under key `slough`), Matriarch Nyxa Coilborne herself, her artifact and the skin's chest charms.
 */
export const SLIME_DUNGEON: DungeonBundle = {
  area: SLOUGH_AREA,
  encounters: SLOUGH_WARDENS,
  gimmicks: SLOUGH_GIMMICKS,
  boss: NYXA_BOSS,
  floor: SLOUGH_FLOOR,
  items: SLOUGH_ITEMS,
  scripts: SLOUGH_SCRIPTS,
};
