import type { FishDef, FisheryDef, IsleItemDef, RodDef } from '../../../../IslesTypes';

/**
 * Brinehollow's sea fishing and the whalebone rod.
 *
 * The water off Brinehollow's piers is the first thing anyone fishes on the Drowned Reach, so its
 * table runs from herring that come up three to a hook to the pearl queenfish, which the Crown
 * claims by law and which every fisher in the port swears looked them in the eye once. The eels
 * here come up from the Undertow on the ebb; the town does not like to think about what they eat.
 */

export const BRINEHOLLOW_SEA: FisheryDef = { id: 'brinehollow-sea', name: 'The Brinehollow Roads', kind: 'sea' };

/** The six sea fish. Weights are relative inside the one fishery. */
export const SEA_FISH: FishDef[] = [
  /** Silver by the thousand under the piers — the herring run is the town's whole winter. */
  { id: 'fish-brine-herring', fisheries: ['brinehollow-sea'], weight: 34, fight: 1, size: [14, 26] },
  /** A big lazy mouth that swallows the bait, the hook and occasionally the float. */
  { id: 'fish-gullet-cod', fisheries: ['brinehollow-sea'], weight: 22, fight: 2, size: [40, 80] },
  /** Flat, speckled, and buried in the sand off the pier end until something swims over it. */
  { id: 'fish-tidal-turbot', fisheries: ['brinehollow-sea'], weight: 13, fight: 3, size: [36, 70] },
  /** Long-legged crabs that climb the stilts at high water. Comes up clinging to the line. */
  { id: 'fish-stilt-crab', fisheries: ['brinehollow-sea'], weight: 16, fight: 2, size: [12, 30] },
  /** Rises from the deep on the ebb, black and slick, and fights all the way to the planks. */
  { id: 'fish-undertow-eel', fisheries: ['brinehollow-sea'], weight: 9, fight: 4, size: [70, 150] },
  /** The rare one. Pearl-white with a crown of fin; a driftwood rod splinters at its first turn. */
  { id: 'fish-pearl-queenfish', fisheries: ['brinehollow-sea'], weight: 2.5, fight: 5, size: [80, 160], rod: 'rod-iron' },
];

/** Fish as inventory items — sold at the Gaff & Gullet or the store, baked at the Brine Oven. */
export const SEA_FISH_ITEMS: IsleItemDef[] = [
  {
    id: 'fish-brine-herring', name: 'Brine Herring', emoji: '🐟', kind: 'fish', sell: 7, isle: 'water',
    flavor: 'Salted before it is even caught. Brinehollow eats it pickled, smoked, baked and, at a push, raw.',
    effect: { regenPerSecond: 0.3 },
  },
  {
    id: 'fish-gullet-cod', name: 'Gullet Cod', emoji: '🐟', kind: 'fish', sell: 15, isle: 'water',
    flavor: 'Opened up on the pier, it has a tithe-coin, two hooks and a boot buckle in it. Standard.',
    effect: { maxHp: 7 },
  },
  {
    id: 'fish-tidal-turbot', name: 'Tidal Turbot', emoji: '🐠', kind: 'fish', sell: 30, isle: 'water',
    flavor: 'Both eyes on one side, so it can watch the tithe-boats and the gulls at the same time.',
    effect: { dodgeChance: 0.03 },
  },
  {
    id: 'fish-stilt-crab', name: 'Stilt Crab', emoji: '🦀', kind: 'fish', sell: 18, isle: 'water',
    flavor: 'Legs like a heron, temper like a reeve. Pinches whatever is nearest and keeps pinching.',
    effect: { reflectFraction: 0.04 },
  },
  {
    id: 'fish-undertow-eel', name: 'Undertow Eel', emoji: '🐍', kind: 'fish', sell: 38, isle: 'water',
    flavor: 'Comes up from very deep on the ebb tide. Its oil burns clear and bright and does not smoke.',
    effect: { speedMult: 1.05 },
  },
  {
    id: 'fish-pearl-queenfish', name: 'Pearl Queenfish', emoji: '👑', kind: 'fish', sell: 170, isle: 'water',
    flavor: 'By Crown law every queenfish is the Queen\'s. It has a pearl in its brow. It does not look owned.',
    effect: { damageMult: 1.05, shieldHp: 10 },
  },
];

/**
 * The whalebone rod: the only line on the Drowned Reach that survives the trench, because bone
 * bends where iron is crushed. It takes every water except lava.
 */
export const RODS: RodDef[] = [
  {
    id: 'rod-whalebone', name: 'Whalebone Rod', control: 1.75,
    kinds: ['sea', 'pond', 'wax', 'steam', 'oil', 'ice', 'ink', 'abyss'],
  },
];

export const ROD_ITEMS: IsleItemDef[] = [
  {
    id: 'rod-whalebone', name: 'Whalebone Rod', emoji: '🎣', kind: 'rod', price: 980, isle: 'water',
    flavor: 'A rib from the whale that fell on the Abyssal shelf, a gut line and a hook of pearl shell. Bends; never breaks.',
  },
];
