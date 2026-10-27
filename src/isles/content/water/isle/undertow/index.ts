import type { ArenaFloor, AreaDef, EncounterDef, GimmickDef, IsleItemDef, ItemScriptFactory } from '../../../../IslesTypes';
import type { WorldBossDef } from '../../../../../boss/framework/BossDefs';
import { UNDERTOW_AREA } from './area';
import { UNDERTOW_FLOOR } from './floor';
import { UNDERTOW_ITEMS, UNDERTOW_SCRIPTS } from './items';
import { MARESA_BOSS } from './maresa';
import { UNDERTOW_GIMMICKS, UNDERTOW_WARDENS } from './wardens';

/**
 * The Water Isle's dungeon: the Undertow (Queen Maresa's drowned palace), its three wardens and
 * their gimmicks, the warden arena floor (registered under key `undertow`), Queen Maresa
 * Undertow herself, her artifact and the palace's chest charms.
 */
export const WATER_DUNGEON: {
  area: AreaDef;
  encounters: EncounterDef[];
  gimmicks: GimmickDef[];
  boss: WorldBossDef;
  floor: ArenaFloor;
  items: IsleItemDef[];
  scripts: Record<string, ItemScriptFactory>;
} = {
  area: UNDERTOW_AREA,
  encounters: UNDERTOW_WARDENS,
  gimmicks: UNDERTOW_GIMMICKS,
  boss: MARESA_BOSS,
  floor: UNDERTOW_FLOOR,
  items: UNDERTOW_ITEMS,
  scripts: UNDERTOW_SCRIPTS,
};
