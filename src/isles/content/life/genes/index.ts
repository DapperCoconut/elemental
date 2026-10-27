import type { GeneTree } from '../../../IslesTypes';
import { LIFE_GENE_TREE } from './life';
import { GROWTH_GENE_TREE } from './growth';
import { WOOD_GENE_TREE } from './gluttony';
import { HUNT_GENE_TREE } from './hunt';
import { MARROW_GENE_TREE } from './marrow';
import { SAVOR_GENE_TREE } from './gum';

/**
 * Gene trees for Thornwild's six elements. A step up from the Drowned Reach: every price is one
 * orb dearer and every mastery two, so each tree is ~760 orbs to finish (every level and mastery,
 * Enlightened aside) against Thornwild's 4–8 orbs a quest — still a branch, not the whole tree.
 */
export const LIFE_GENES: GeneTree[] = [
  LIFE_GENE_TREE,
  GROWTH_GENE_TREE,
  WOOD_GENE_TREE,
  HUNT_GENE_TREE,
  MARROW_GENE_TREE,
  SAVOR_GENE_TREE,
];
