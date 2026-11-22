import type { GeneTree } from '../../../IslesTypes';
import { EARTH_GENE_TREE } from './earth';
import { CRYSTAL_GENE_TREE } from './crystal';
import { CLAY_GENE_TREE } from './clay';
import { DUNE_GENE_TREE } from './dune';
import { METAL_GENE_TREE } from './metal';
import { RUIN_GENE_TREE } from './ruin';

/**
 * Gene trees for Bedrock Hold's six elements. A step up from Highspire: every price is one orb
 * dearer and every mastery two, so each tree is ~900 orbs to finish (every level and mastery,
 * Enlightened aside) against Bedrock Hold's 6–10 orbs a quest — still a branch, not the whole tree.
 */
export const EARTH_GENES: GeneTree[] = [
  EARTH_GENE_TREE,
  CRYSTAL_GENE_TREE,
  CLAY_GENE_TREE,
  DUNE_GENE_TREE,
  METAL_GENE_TREE,
  RUIN_GENE_TREE,
];
