import type { ArenaFloor, AreaDef, EncounterDef, GimmickDef, IsleItemDef, ItemScriptFactory } from '../../../../IslesTypes';
import type { WorldBossDef } from '../../../../../boss/framework/BossDefs';
import { GLASSHOUSE_AREA } from './area';
import { GLASSHOUSE_FLOOR } from './floor';
import { GLASSHOUSE_ITEMS, GLASSHOUSE_SCRIPTS } from './items';
import { VERDIGRA_BOSS } from './verdigra';
import { GLASSHOUSE_GIMMICKS, GLASSHOUSE_WARDENS } from './wardens';

/**
 * The Life Isle's dungeon: the Glasshouse (Empress Verdigra's palace of iron and glass in the
 * Heartwood's crown), its three wardens and their gimmicks, the warden arena floor (registered
 * under key `glasshouse`), Empress Verdigra herself, her artifact and the palace's chest charms.
 */
export const LIFE_DUNGEON: {
  area: AreaDef;
  encounters: EncounterDef[];
  gimmicks: GimmickDef[];
  boss: WorldBossDef;
  floor: ArenaFloor;
  items: IsleItemDef[];
  scripts: Record<string, ItemScriptFactory>;
} = {
  area: GLASSHOUSE_AREA,
  encounters: GLASSHOUSE_WARDENS,
  gimmicks: GLASSHOUSE_GIMMICKS,
  boss: VERDIGRA_BOSS,
  floor: GLASSHOUSE_FLOOR,
  items: GLASSHOUSE_ITEMS,
  scripts: GLASSHOUSE_SCRIPTS,
};
