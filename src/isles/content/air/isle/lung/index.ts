import type { ArenaFloor, AreaDef, EncounterDef, GimmickDef, IsleItemDef, ItemScriptFactory } from '../../../../IslesTypes';
import type { WorldBossDef } from '../../../../../boss/framework/BossDefs';
import { AERION_BOSS } from './aerion';
import { LUNG_AREA } from './area';
import { LUNG_FLOOR } from './floor';
import { LUNG_ITEMS, LUNG_SCRIPTS } from './items';
import { LUNG_GIMMICKS, LUNG_WARDENS } from './wardens';

/**
 * The Air Isle's dungeon: the Lung (King Aerion's windmill-palace on Highspire's summit), its three
 * wardens and their gimmicks, the warden arena floor (registered under key `lung`), King Aerion
 * himself, his artifact and the palace's chest charms.
 */
export const AIR_DUNGEON: {
  area: AreaDef;
  encounters: EncounterDef[];
  gimmicks: GimmickDef[];
  boss: WorldBossDef;
  floor: ArenaFloor;
  items: IsleItemDef[];
  scripts: Record<string, ItemScriptFactory>;
} = {
  area: LUNG_AREA,
  encounters: LUNG_WARDENS,
  gimmicks: LUNG_GIMMICKS,
  boss: AERION_BOSS,
  floor: LUNG_FLOOR,
  items: LUNG_ITEMS,
  scripts: LUNG_SCRIPTS,
};
