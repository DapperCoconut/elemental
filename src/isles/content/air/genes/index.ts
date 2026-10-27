import type { GeneTree } from '../../../IslesTypes';
import { AIR_GENE_TREE } from './air';
import { TEMPEST_GENE_TREE } from './tempest';
import { GRAVITY_GENE_TREE } from './gravity';
import { DREAM_GENE_TREE } from './dream';
import { ASTRA_GENE_TREE } from './astra';
import { MYTH_GENE_TREE } from './myth';

/**
 * Gene trees for Highspire's six elements. A step up from Thornwild: every price is one orb
 * dearer and every mastery two, so each tree is ~830 orbs to finish (every level and mastery,
 * Enlightened aside) against Highspire's 5–9 orbs a quest — still a branch, not the whole tree.
 */
export const AIR_GENES: GeneTree[] = [
  AIR_GENE_TREE,
  TEMPEST_GENE_TREE,
  GRAVITY_GENE_TREE,
  DREAM_GENE_TREE,
  ASTRA_GENE_TREE,
  MYTH_GENE_TREE,
];
