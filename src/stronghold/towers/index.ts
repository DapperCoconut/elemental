import type { TowerDef } from '../StrongholdTypes';
import { BASE_TOWERS } from './base';
import { BATCH2_TOWERS } from './batch2';
import { BATCH3_TOWERS } from './batch3';
import { BATCH4_TOWERS } from './batch4';
import { BATCH5_TOWERS } from './batch5';
import { BATCH6_TOWERS } from './batch6';
import { BATCH7_TOWERS } from './batch7';

/** Every element's tower, keyed by element id. Pure data — no Phaser — so checks can bundle it. */
export const TOWER_DEFS: Record<string, TowerDef> = {
  ...BASE_TOWERS, ...BATCH2_TOWERS, ...BATCH3_TOWERS, ...BATCH4_TOWERS, ...BATCH5_TOWERS, ...BATCH6_TOWERS, ...BATCH7_TOWERS,
};
