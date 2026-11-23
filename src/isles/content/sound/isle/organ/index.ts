import type { DungeonBundle } from '../../../../IslesTypes';
import { ORGAN_AREA } from './area';
import { CADENZA_BOSS } from './cadenza';
import { ORGAN_FLOOR } from './floor';
import { ORGAN_ITEMS, ORGAN_SCRIPTS } from './items';
import { ORGAN_GIMMICKS, ORGAN_WARDENS } from './wardens';

/**
 * Choirholm's dungeon: the Great Organ (the Maestro's instrument, climbed from the bellows to the
 * Console), its three wardens and their gimmicks, the warden arena floor (registered under key
 * `organ`), Maestro Cadenza himself, his baton and the two charms found in the instrument.
 */
export const SOUND_DUNGEON: DungeonBundle = {
  area: ORGAN_AREA,
  encounters: ORGAN_WARDENS,
  gimmicks: ORGAN_GIMMICKS,
  boss: CADENZA_BOSS,
  floor: ORGAN_FLOOR,
  items: ORGAN_ITEMS,
  scripts: ORGAN_SCRIPTS,
};
