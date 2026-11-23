import type { GeneTree } from '../../../IslesTypes';
import { LIGHT_GENE_TREE } from './light';
import { JUSTICE_GENE_TREE } from './justice';
import { SOUL_GENE_TREE } from './soul';
import { MAGIC_GENE_TREE } from './magic';
import { CREATION_GENE_TREE } from './creation';
import { PAINT_GENE_TREE } from './chalk';

/**
 * Gene trees for Solmara's six elements. A step up from Choirholm: every price is one orb
 * dearer and every mastery two (the ladder lives in `prices.ts`), so each tree is ~1250 orbs to
 * finish (every level and mastery, Enlightened aside) against Solmara's 11–15 orbs a quest.
 * Ids: `chalk` is Paint.
 */
export const LIGHT_GENES: GeneTree[] = [
  LIGHT_GENE_TREE,
  JUSTICE_GENE_TREE,
  SOUL_GENE_TREE,
  MAGIC_GENE_TREE,
  CREATION_GENE_TREE,
  PAINT_GENE_TREE,
];
