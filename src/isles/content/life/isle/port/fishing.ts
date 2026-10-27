import type { FishDef, FisheryDef, IsleItemDef, RodDef } from '../../../../IslesTypes';

/**
 * Mossgate's sea fishing and the briarwood rod.
 *
 * The harbour under the Great Root is green water over a reef of drowned root — the Elder's roots
 * run on under the sea for a quarter mile, and everything that lives off Mossgate lives in among
 * them. Mullet graze the moss on the root-tops; snapper and pike hunt the gaps; rays bury in the
 * silt between. The sturgeon is the oldest thing in the harbour, older than the town, and green.
 */

export const MOSSGATE_SEA: FisheryDef = { id: 'mossgate-sea', name: 'The Rootwater', kind: 'sea' };

/** The six sea fish. Weights are relative inside the one fishery. */
export const SEA_FISH: FishDef[] = [
  /** Fat, slow and furred with the moss it grazes off the drowned roots. Comes up without a fight. */
  { id: 'fish-mossback-mullet', fisheries: ['mossgate-sea'], weight: 34, fight: 1, size: [22, 44] },
  /** Red as a root and lives in its knots. Snaps the bait clean, then sulks in a hole. */
  { id: 'fish-rootreef-snapper', fisheries: ['mossgate-sea'], weight: 22, fight: 2, size: [28, 56] },
  /** Long, barred like kelp, ambushes from the weed and runs the moment it feels the hook. */
  { id: 'fish-kelp-pike', fisheries: ['mossgate-sea'], weight: 13, fight: 3, size: [50, 110] },
  /** A crab grown into its own crust of barnacles; it climbs the line hand over claw. */
  { id: 'fish-barnacle-crab', fisheries: ['mossgate-sea'], weight: 16, fight: 2, size: [14, 30] },
  /** Flat, brown, buried in the silt between roots, with a tail of thorns. Fights low and mean. */
  { id: 'fish-thornback-ray', fisheries: ['mossgate-sea'], weight: 9, fight: 4, size: [60, 120] },
  /** The rare one. Bone-plated and leaf-green, older than the Elder; a driftwood rod snaps at its first roll. */
  { id: 'fish-verdant-sturgeon', fisheries: ['mossgate-sea'], weight: 2.5, fight: 5, size: [120, 240], rod: 'rod-iron' },
];

/** Fish as inventory items — sold at the Hook & Bramble or the Emporium, baked at the Crumb & Thistle. */
export const SEA_FISH_ITEMS: IsleItemDef[] = [
  {
    id: 'fish-mossback-mullet', name: 'Mossback Mullet', emoji: '🐟', kind: 'fish', sell: 9, isle: 'life',
    flavor: 'Grows a coat of green on its back from grazing the drowned roots. Mossgate scrapes it off and eats that too.',
    effect: { regenPerSecond: 0.35 },
  },
  {
    id: 'fish-rootreef-snapper', name: 'Rootreef Snapper', emoji: '🐠', kind: 'fish', sell: 18, isle: 'life',
    flavor: 'Red as heartwood and twice as hard. Lives in the knots of the Elder\'s roots and bites anything that knocks.',
    effect: { maxHp: 8 },
  },
  {
    id: 'fish-kelp-pike', name: 'Kelp Pike', emoji: '🐟', kind: 'fish', sell: 34, isle: 'life',
    flavor: 'Barred green and gold to vanish in the weed. You see it only when it has already decided to bite.',
    effect: { critChance: 0.03 },
  },
  {
    id: 'fish-barnacle-crab', name: 'Barnacle Crab', emoji: '🦀', kind: 'fish', sell: 22, isle: 'life',
    flavor: 'So crusted it is hard to tell which part is crab. Comes up the line hand over claw like a sailor.',
    effect: { shieldHp: 9 },
  },
  {
    id: 'fish-thornback-ray', name: 'Thornback Ray', emoji: '🐡', kind: 'fish', sell: 42, isle: 'life',
    flavor: 'A brown kite of a fish with a tail of thorns. The Empress has its likeness on her garden gates.',
    effect: { reflectFraction: 0.05 },
  },
  {
    id: 'fish-verdant-sturgeon', name: 'Verdant Sturgeon', emoji: '🐉', kind: 'fish', sell: 200, isle: 'life',
    flavor: 'Plated like a gate and green as a leaf. Older than the Elder; the old folk say it remembers it standing.',
    effect: { damageMult: 1.05, regenPerSecond: 0.4 },
  },
];

/**
 * The briarwood rod: a bramble cane grown nine years on a bending frame, its thorns left on so the
 * line never slips. Sap still runs in it, so it neither gums in syrup nor cracks in the bone-well.
 * It takes every water except lava.
 */
export const RODS: RodDef[] = [
  {
    id: 'rod-briarwood', name: 'Briarwood Rod', control: 1.9,
    kinds: ['sea', 'pond', 'wax', 'steam', 'oil', 'ice', 'ink', 'bog', 'abyss', 'syrup'],
  },
];

export const ROD_ITEMS: IsleItemDef[] = [
  {
    id: 'rod-briarwood', name: 'Briarwood Rod', emoji: '🎣', kind: 'rod', price: 1450, isle: 'life',
    flavor: 'Grown, not cut: nine years bent on a frame in the Hook & Bramble\'s yard. Thorns on, sap in. Takes any water but fire.',
  },
];
