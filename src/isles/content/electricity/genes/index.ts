import type { GeneTree } from '../../../IslesTypes';
import { ELECTRICITY_GENE_TREE } from './electricity';
import { TECHNOLOGY_GENE_TREE } from './technology';
import { RUBBER_GENE_TREE } from './rubber';
import { MAGNET_GENE_TREE } from './magnet';
import { RADIATION_GENE_TREE } from './radiation';
import { QUANTUM_GENE_TREE } from './quantum';

/**
 * Gene trees for Voltreach's six elements. A step up from Bedrock Hold: every price is one orb
 * dearer and every mastery two, so each tree is ~970 orbs to finish (every level and mastery,
 * Enlightened aside) against Voltreach's 7–11 orbs a quest — still a branch, not the whole tree.
 */
export const ELECTRICITY_GENES: GeneTree[] = [
  ELECTRICITY_GENE_TREE,
  TECHNOLOGY_GENE_TREE,
  RUBBER_GENE_TREE,
  MAGNET_GENE_TREE,
  RADIATION_GENE_TREE,
  QUANTUM_GENE_TREE,
];
