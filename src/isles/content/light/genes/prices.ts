import { linear } from '../../fire/genes/helpers';

/**
 * Solmara's orb prices — one step up from Choirholm: every level one orb dearer, every mastery
 * two. Shared by all six trees so the ladder is set in one place.
 *
 * A full tree (every level and mastery, Enlightened aside) is ~1250 orbs, against Solmara's
 * 11–15 orbs a quest — the Despot taxes the light you grow by.
 */
export const PRICE = {
  /** Tier 0 roots: 12, 14, 16, 18. */
  root: linear(12, 2),
  rootMastery: 26,
  /** Tier 1: 13, 16, 19, 22. */
  t1: linear(13, 3),
  t1Mastery: 30,
  /** Tier 2: 15, 18, 21, 24. */
  t2: linear(15, 3),
  t2Mastery: 34,
  /** Tier 3 side nodes (three levels): 20, 24, 28. */
  t3: linear(20, 4),
  t3Mastery: 40,
  /** Tier 3 crossing node (four levels): 17, 21, 25, 29. */
  cross: linear(17, 4),
  crossMastery: 42,
} as const;
