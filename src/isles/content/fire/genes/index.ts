import type { GeneTree } from '../../../IslesTypes';
import { FIRE_GENE_TREE } from './fire';
import { MAGMA_GENE_TREE } from './magma';
import { PRESSURE_GENE_TREE } from './pressure';
import { GUNPOWDER_GENE_TREE } from './gunpowder';
import { PLASMA_GENE_TREE } from './plasma';
import { WAX_GENE_TREE } from './wax';

/**
 * Gene trees for Brandmark's six elements. Each tree is ~675–690 orbs to finish (every level
 * and mastery, Enlightened aside) against ~150 orbs per isle, so a player picks a branch.
 */
export const FIRE_GENES: GeneTree[] = [
  FIRE_GENE_TREE,
  MAGMA_GENE_TREE,
  PRESSURE_GENE_TREE,
  GUNPOWDER_GENE_TREE,
  PLASMA_GENE_TREE,
  WAX_GENE_TREE,
];
