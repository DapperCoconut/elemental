import type { GeneTree } from '../../../IslesTypes';
import { WATER_GENE_TREE } from './water';
import { ICE_GENE_TREE } from './ice';
import { DEPTHS_GENE_TREE } from './depths';
import { OIL_GENE_TREE } from './oil';
import { INK_GENE_TREE } from './ink';
import { CLOTH_GENE_TREE } from './cloth';

/**
 * Gene trees for the Drowned Reach's six elements. Like Brandmark's, each tree is ~690 orbs to
 * finish (every level and mastery, Enlightened aside), so a player picks a branch.
 */
export const WATER_GENES: GeneTree[] = [
  WATER_GENE_TREE,
  ICE_GENE_TREE,
  DEPTHS_GENE_TREE,
  OIL_GENE_TREE,
  INK_GENE_TREE,
  CLOTH_GENE_TREE,
];
