import type { GeneTree } from '../../../IslesTypes';
import { VENOM_GENE_TREE } from './slime';
import { DEATH_GENE_TREE } from './death';
import { SHADOW_GENE_TREE } from './shadow';
import { BIND_GENE_TREE } from './bind';
import { SUBTERFUGE_GENE_TREE } from './subterfuge';
import { STRING_GENE_TREE } from './string';

/**
 * Gene trees for Fangmire's six elements. A step up from Voltreach: every price is one orb
 * dearer and every mastery two (the ladder lives in `prices.ts`), so each tree is ~1040 orbs to
 * finish (every level and mastery, Enlightened aside) against Fangmire's 8–12 orbs a quest —
 * still a branch, not the whole tree.
 */
export const SLIME_GENES: GeneTree[] = [
  VENOM_GENE_TREE,
  DEATH_GENE_TREE,
  SHADOW_GENE_TREE,
  BIND_GENE_TREE,
  SUBTERFUGE_GENE_TREE,
  STRING_GENE_TREE,
];
