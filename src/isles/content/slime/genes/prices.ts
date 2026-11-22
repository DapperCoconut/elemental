import { linear } from '../../fire/genes/helpers';

/**
 * Fangmire's orb prices — one step up from Voltreach: every level one orb dearer, every mastery
 * two. Shared by all six trees so the ladder is set in one place.
 *
 * A full tree (every level and mastery, Enlightened aside) is ~1040 orbs, against Fangmire's
 * 8–12 orbs a quest.
 */
export const PRICE = {
  /** Tier 0 roots: 9, 11, 13, 15. */
  root: linear(9, 2),
  rootMastery: 20,
  /** Tier 1: 10, 13, 16, 19. */
  t1: linear(10, 3),
  t1Mastery: 24,
  /** Tier 2: 12, 15, 18, 21. */
  t2: linear(12, 3),
  t2Mastery: 28,
  /** Tier 3 side nodes (three levels): 17, 21, 25. */
  t3: linear(17, 4),
  t3Mastery: 34,
  /** Tier 3 crossing node (four levels): 14, 18, 22, 26. */
  cross: linear(14, 4),
  crossMastery: 36,
} as const;
