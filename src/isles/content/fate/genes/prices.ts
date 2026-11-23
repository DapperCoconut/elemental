import { linear } from '../../fire/genes/helpers';

/**
 * Lotterhaven's orb prices — one step up from Fangmire: every level one orb dearer, every mastery
 * two. Shared by all six trees so the ladder is set in one place.
 *
 * A full tree (every level and mastery, Enlightened aside) is ~1120 orbs, against Lotterhaven's
 * 9–13 orbs a quest — the House always takes its cut.
 */
export const PRICE = {
  /** Tier 0 roots: 10, 12, 14, 16. */
  root: linear(10, 2),
  rootMastery: 22,
  /** Tier 1: 11, 14, 17, 20. */
  t1: linear(11, 3),
  t1Mastery: 26,
  /** Tier 2: 13, 16, 19, 22. */
  t2: linear(13, 3),
  t2Mastery: 30,
  /** Tier 3 side nodes (three levels): 18, 22, 26. */
  t3: linear(18, 4),
  t3Mastery: 36,
  /** Tier 3 crossing node (four levels): 15, 19, 23, 27. */
  cross: linear(15, 4),
  crossMastery: 38,
} as const;
