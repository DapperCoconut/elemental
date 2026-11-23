import type { GeneTree } from '../../../IslesTypes';
import { FATE_GENE_TREE } from './fate';
import { GOLD_GENE_TREE } from './fortune';
import { TIME_GENE_TREE } from './sand';
import { MEMORY_GENE_TREE } from './memory';
import { PSYCHIC_GENE_TREE } from './psychic';
import { CONQUEST_GENE_TREE } from './conquest';

/**
 * Gene trees for Lotterhaven's six elements. A step up from Fangmire: every price is one orb
 * dearer and every mastery two (the ladder lives in `prices.ts`), so each tree is ~1120 orbs to
 * finish (every level and mastery, Enlightened aside) against Lotterhaven's 9–13 orbs a quest.
 * Ids: `fortune` is Gold, `sand` is Time.
 */
export const FATE_GENES: GeneTree[] = [
  FATE_GENE_TREE,
  GOLD_GENE_TREE,
  TIME_GENE_TREE,
  MEMORY_GENE_TREE,
  PSYCHIC_GENE_TREE,
  CONQUEST_GENE_TREE,
];
