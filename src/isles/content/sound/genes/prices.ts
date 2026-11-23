import { linear } from '../../fire/genes/helpers';

/**
 * Choirholm's orb prices — one step up from Lotterhaven: every level one orb dearer, every
 * mastery two. Shared by all six trees so the ladder is set in one place.
 *
 * A full tree (every level and mastery, Enlightened aside) is ~1180 orbs, against Choirholm's
 * 10–14 orbs a quest — the Maestro charges for every bar.
 */
export const PRICE = {
  /** Tier 0 roots: 11, 13, 15, 17. */
  root: linear(11, 2),
  rootMastery: 24,
  /** Tier 1: 12, 15, 18, 21. */
  t1: linear(12, 3),
  t1Mastery: 28,
  /** Tier 2: 14, 17, 20, 23. */
  t2: linear(14, 3),
  t2Mastery: 32,
  /** Tier 3 side nodes (three levels): 19, 23, 27. */
  t3: linear(19, 4),
  t3Mastery: 38,
  /** Tier 3 crossing node (four levels): 16, 20, 24, 28. */
  cross: linear(16, 4),
  crossMastery: 40,
} as const;
