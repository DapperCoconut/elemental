import type { FishDef, FisheryDef, IsleItemDef, RodDef } from '../../../../IslesTypes';

/**
 * Stilthaven's sea fishing and the antivenin rod.
 *
 * Off the Mooring Walk the black mire bleeds out into the sea, and the sea there is half-venom: the
 * fangs leak it, the snakes swim out into it to hunt, and everything that lives off Stilthaven has
 * learned to live with poison in the water or to carry some of its own. Mullet graze the scum-line;
 * herring school in the fangs' shadows with teeth like a comb; eels lie in the weed off the piers; the
 * mudskippers come up and walk on the stilts. The black grouper waits under the slip with its mouth
 * open. And far out past the Fang Light, the fishers say, swims a sturgeon with five heads.
 */

export const STILTHAVEN_SEA: FisheryDef = { id: 'stilthaven-sea', name: 'The Scum-Line', kind: 'sea' };

/** The six sea fish. Weights are relative inside the one fishery. */
export const SEA_FISH: FishDef[] = [
  /** Grey, soft-mouthed and slow; grazes the green scum where the mire runs into the sea. No fight to speak of. */
  { id: 'fish-mire-mullet', fisheries: ['stilthaven-sea'], weight: 34, fight: 1, size: [20, 42] },
  /** Silver, schooling, and every one has a row of little teeth. Snaps the line and thrashes. */
  { id: 'fish-fanged-herring', fisheries: ['stilthaven-sea'], weight: 24, fight: 2, size: [18, 34] },
  /** Long, green-black, lies in the weed off the piers; bites like its namesake and runs for the stilts. */
  { id: 'fish-viper-eel', fisheries: ['stilthaven-sea'], weight: 12, fight: 3, size: [60, 140] },
  /** Walks up the stilts on its fins to look at you. Comes up the line hand over fin, staring. */
  { id: 'fish-mudskipper', fisheries: ['stilthaven-sea'], weight: 17, fight: 2, size: [12, 26] },
  /** A great black mouth under the slip. Takes the bait, sinks like a stone, and sulks on the bottom. */
  { id: 'fish-black-grouper', fisheries: ['stilthaven-sea'], weight: 8, fight: 4, size: [70, 160] },
  /** The rare one: armoured, mire-green, with four false heads in its bony plating. A driftwood rod snaps. */
  { id: 'fish-hydra-sturgeon', fisheries: ['stilthaven-sea'], weight: 2.5, fight: 5, size: [140, 260], rod: 'rod-iron' },
];

/** Fish as inventory items — sold at the Bitten Hook or the Coil & Candle, baked at the Honeyed Fang. */
export const SEA_FISH_ITEMS: IsleItemDef[] = [
  {
    id: 'fish-mire-mullet', name: 'Mire Mullet', emoji: '🐟', kind: 'fish', sell: 10, isle: 'slime',
    flavor: 'Grey and placid; it grazes the scum-line and tastes faintly of it. Hetty soaks it in honey first.',
    effect: { regenPerSecond: 0.35 },
  },
  {
    id: 'fish-fanged-herring', name: 'Fanged Herring', emoji: '🐟', kind: 'fish', sell: 20, isle: 'slime',
    flavor: 'Every one has a row of teeth like a comb. Hold it by the gills. Stilthaven bakes it heads-up in a pie.',
    effect: { critChance: 0.02, maxHp: 4 },
  },
  {
    id: 'fish-viper-eel', name: 'Viper Eel', emoji: '🐍', kind: 'fish', sell: 38, isle: 'slime',
    flavor: 'Green-black and two yards long. Its oil burns clean and bright. Saul Mudgett named a shop after one.',
    effect: { damageMult: 1.03 },
  },
  {
    id: 'fish-mudskipper', name: 'Mudskipper', emoji: '🐸', kind: 'fish', sell: 24, isle: 'slime',
    flavor: 'Walks up the stilts on its fins and stares in at the windows. Nobody likes being stared at in Stilthaven.',
    effect: { speedMult: 1.04 },
  },
  {
    id: 'fish-black-grouper', name: 'Black Grouper', emoji: '🐡', kind: 'fish', sell: 48, isle: 'slime',
    flavor: 'Mostly mouth. It lives under the boat slip and has eaten, by Morrow Gall\'s count, three of his hammers.',
    effect: { shieldHp: 12 },
  },
  {
    id: 'fish-hydra-sturgeon', name: 'Hydra Sturgeon', emoji: '🐉', kind: 'fish', sell: 230, isle: 'slime',
    flavor: 'Armoured in mire-green plate, with four false heads grown in the bone of its back. Older than the Mark.',
    effect: { damageMult: 1.05, regenPerSecond: 0.4 },
  },
];

/**
 * The antivenin rod: a cane of mangrove heartwood sleeved in green bottle-glass, its line gut-lined
 * and its cork grip soaked a month in the Draught itself, so that venom runs off it like rain off oilskin
 * and the black meres cannot get a cold grip on it. It takes every water there is except lava.
 */
export const RODS: RodDef[] = [
  {
    id: 'rod-antivenin', name: 'Antivenin Rod', control: 2.5,
    kinds: [
      'sea', 'pond', 'wax', 'steam', 'oil', 'ice', 'ink', 'abyss', 'bog', 'syrup', 'cloud', 'aurora', 'sand', 'cavern',
      'charged', 'coolant', 'quantum', 'venom', 'blackwater',
    ],
  },
];

export const ROD_ITEMS: IsleItemDef[] = [
  {
    id: 'rod-antivenin', name: 'Antivenin Rod', emoji: '🎣', kind: 'rod', price: 2500, isle: 'slime',
    flavor: 'Glass-sleeved mangrove, gut line, a grip soaked in the Draught. Venom slides off it. Takes any water but fire.',
  },
];
