import type { GeneTree } from '../../../IslesTypes';
import { SOUND_GENE_TREE } from './sound';
import { ECHO_GENE_TREE } from './echo';
import { SILENCE_GENE_TREE } from './silence';
import { ILLUSION_GENE_TREE } from './illusion';
import { DEVOTION_GENE_TREE } from './passion';
import { PAPER_GENE_TREE } from './paper';

/**
 * Gene trees for Choirholm's six elements. A step up from Lotterhaven: every price is one orb
 * dearer and every mastery two (the ladder lives in `prices.ts`), so each tree is ~1180 orbs to
 * finish (every level and mastery, Enlightened aside) against Choirholm's 10–14 orbs a quest.
 * Ids: `passion` is Devotion.
 */
export const SOUND_GENES: GeneTree[] = [
  SOUND_GENE_TREE,
  ECHO_GENE_TREE,
  SILENCE_GENE_TREE,
  ILLUSION_GENE_TREE,
  DEVOTION_GENE_TREE,
  PAPER_GENE_TREE,
];
