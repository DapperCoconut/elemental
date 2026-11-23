import type { FishDef, FisheryDef, IsleItemDef, RodDef } from '../../../../IslesTypes';

/**
 * Meridian Quay's sea fishing and the prism rod.
 *
 * The sea round Solmara has not had a shadow on it in twenty-two years. The noon comes straight down
 * through clear water onto white sand, so the harbour is a glare you fish by feel: every fish in it
 * has learned to be a mirror, or a light, or to lie flat under one. Herring shoal in a sheet of glints,
 * mackerel wear silver like a looking-glass, the skate carries a pale ring on its back where the sun
 * has bleached it, and the swordfish hunts by coming at you out of the sun.
 */

export const MERIDIAN_SEA: FisheryDef = { id: 'meridian-sea', name: 'The White Water', kind: 'sea' };

/** The six sea fish. Weights are relative inside the one fishery. */
export const SEA_FISH: FishDef[] = [
  /** Shoals in a sheet of glints just under the glare; you hook one and forty flash off at once. */
  { id: 'fish-glint-herring', fisheries: ['meridian-sea'], weight: 34, fight: 1, size: [16, 30] },
  /** Silvered like a hand-mirror. Flashes the sun in your eyes on the way up and you lose it if you blink. */
  { id: 'fish-mirror-mackerel', fisheries: ['meridian-sea'], weight: 22, fight: 2, size: [26, 48] },
  /** A gold fish that always turns its face straight up at the sun. It has not had to turn in years. */
  { id: 'fish-noonfish', fisheries: ['meridian-sea'], weight: 17, fight: 2, size: [20, 40] },
  /** Glows from the throat like a lit lantern; lives under the moles and runs for the deep when hooked. */
  { id: 'fish-beacon-bass', fisheries: ['meridian-sea'], weight: 13, fight: 3, size: [40, 90] },
  /** A flat grey kite with a bleached ring on its back. Lies on the sand in its own shade and will not lift. */
  { id: 'fish-halo-skate', fisheries: ['meridian-sea'], weight: 9, fight: 4, size: [60, 130] },
  /** The rare one. Comes at the bait out of the sun, gold-bladed; a driftwood rod splinters on the strike. */
  { id: 'fish-solar-swordfish', fisheries: ['meridian-sea'], weight: 2.5, fight: 5, size: [160, 320], rod: 'rod-iron' },
];

/** Fish as inventory items — sold at Halloran's or the Glass Counter, baked at the Golden Crust. */
export const SEA_FISH_ITEMS: IsleItemDef[] = [
  {
    id: 'fish-glint-herring', name: 'Glint Herring', emoji: '🐟', kind: 'fish', sell: 10, isle: 'light',
    flavor: 'Small, silver, and bright as a dropped coin. A shoal of them looks like the sea has broken into change.',
    effect: { speedMult: 1.02 },
  },
  {
    id: 'fish-mirror-mackerel', name: 'Mirror Mackerel', emoji: '🐠', kind: 'fish', sell: 20, isle: 'light',
    flavor: 'You can shave in its flank. Customs once made a man declare one as a looking-glass. He paid the duty.',
    effect: { reflectFraction: 0.04 },
  },
  {
    id: 'fish-noonfish', name: 'Noonfish', emoji: '🐡', kind: 'fish', sell: 24, isle: 'light',
    flavor: 'Gold, round-eyed, face turned straight up. Old fishers say it used to turn to follow the sun. It stopped.',
    effect: { critChance: 0.03 },
  },
  {
    id: 'fish-beacon-bass', name: 'Beacon Bass', emoji: '🐟', kind: 'fish', sell: 36, isle: 'light',
    flavor: 'Its throat glows like a lamp behind a hand. On Solmara it is the only fish that ever seems to want the dark.',
    effect: { maxHp: 9 },
  },
  {
    id: 'fish-halo-skate', name: 'Halo Skate', emoji: '🪁', kind: 'fish', sell: 46, isle: 'light',
    flavor: 'A pale ring bleached into its back by twenty-two years of sun. Under it, a perfect skate-shaped shadow.',
    effect: { shieldHp: 11 },
  },
  {
    id: 'fish-solar-swordfish', name: 'Solar Swordfish', emoji: '🗡️', kind: 'fish', sell: 220, isle: 'light',
    flavor: 'A blade of beaten gold that strikes out of the glare. The Despot has one mounted over his throne. Stuffed.',
    effect: { damageMult: 1.05, critChance: 0.02 },
  },
];

/**
 * The prism rod: a rod of drawn glass round a brass core, with a little prism set in the tip that
 * splits the glare into colours. Held over the noon pool's white blaze or the mana font's liquid light,
 * the prism breaks the glare and you can see the fish at last — dark shapes, or runes. It takes every
 * water but lava (glass and fire have an understanding).
 */
export const RODS: RodDef[] = [
  {
    id: 'rod-prism', name: 'Prism Rod', control: 2.8,
    kinds: [
      'sea', 'pond', 'wax', 'steam', 'oil', 'ice', 'ink', 'abyss', 'bog', 'syrup', 'cloud', 'aurora', 'sand', 'cavern',
      'charged', 'coolant', 'quantum', 'venom', 'blackwater', 'gilded', 'lethe', 'resonant', 'still', 'sunpool', 'mana',
    ],
  },
];

export const ROD_ITEMS: IsleItemDef[] = [
  {
    id: 'rod-prism', name: 'Prism Rod', emoji: '🎣', kind: 'rod', price: 3400, isle: 'light',
    flavor: 'Drawn glass on a brass core, a prism in the tip. It breaks glare into colour. Takes any water but fire.',
  },
];
