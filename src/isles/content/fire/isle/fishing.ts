import type { FishDef, FisheryDef, IsleItemDef, RodDef } from '../../../IslesTypes';

/**
 * Brandmark's sea fishing and the three rods every isle angler starts with.
 *
 * The sea off Emberport is the one water you can fish from your first minute on the isle, so
 * its table runs the whole range: a sprat that practically jumps into the bucket, up to the
 * Kingscale — the fish the King's own heralds claim, and the one every fisher in the port has a
 * story about losing.
 */

export const EMBERPORT_SEA: FisheryDef = { id: 'emberport-sea', name: 'The Brandmark Shallows', kind: 'sea' };

/** The six sea fish. Weights are relative inside the one fishery. */
export const SEA_FISH: FishDef[] = [
  /** The harbour's bread and butter — shoals of them flash orange under the piers. */
  { id: 'fish-cinder-sprat', fisheries: ['emberport-sea'], weight: 34, fight: 1, size: [8, 16] },
  /** Ash-grey back, a fin that leaves a trail of soot in the water. */
  { id: 'fish-ashfin-mackerel', fisheries: ['emberport-sea'], weight: 24, fight: 2, size: [24, 41] },
  /** Long and black with a red mark behind the gills that looks a lot like the King's sigil. */
  { id: 'fish-brand-eel', fisheries: ['emberport-sea'], weight: 16, fight: 3, size: [55, 120] },
  /** Hunts by the lighthouse beam; strikes anything that glints. */
  { id: 'fish-lighthouse-pike', fisheries: ['emberport-sea'], weight: 12, fight: 3, size: [48, 92] },
  /** Glides along the black sand with its wings glowing like banked coals. */
  { id: 'fish-ember-ray', fisheries: ['emberport-sea'], weight: 9, fight: 4, size: [60, 140] },
  /** The rare one. Gold scales edged in red; a driftwood rod snaps the moment it turns. */
  { id: 'fish-kingscale', fisheries: ['emberport-sea'], weight: 2.5, fight: 5, size: [90, 180], rod: 'rod-iron' },
];

/** Fish as inventory items — sold to the tackle shop or the store, cooked at the Scorched Loaf. */
export const SEA_FISH_ITEMS: IsleItemDef[] = [
  {
    id: 'fish-cinder-sprat', name: 'Cinder Sprat', emoji: '🐟', kind: 'fish', sell: 6, isle: 'fire',
    flavor: 'Thumb-long and warm to the touch. Emberport eats them by the bucket, bones and all.',
    effect: { regenPerSecond: 0.3 },
  },
  {
    id: 'fish-ashfin-mackerel', name: 'Ashfin Mackerel', emoji: '🐟', kind: 'fish', sell: 14, isle: 'fire',
    flavor: 'Oily, striped grey on grey. Smokes beautifully; smells of the smokehouse forever after.',
    effect: { maxHp: 6 },
  },
  {
    id: 'fish-brand-eel', name: 'Brand Eel', emoji: '🐍', kind: 'fish', sell: 26, isle: 'fire',
    flavor: 'The red mark behind its gills is a coincidence. Say so loudly if a tithe-warden is listening.',
    effect: { speedMult: 1.04 },
  },
  {
    id: 'fish-lighthouse-pike', name: 'Lighthouse Pike', emoji: '🐠', kind: 'fish', sell: 30, isle: 'fire',
    flavor: 'All teeth and patience. Follows the lamp beam round the bay, waiting for something shiny.',
    effect: { critChance: 0.03 },
  },
  {
    id: 'fish-ember-ray', name: 'Ember Ray', emoji: '🦈', kind: 'fish', sell: 44, isle: 'fire',
    flavor: 'Its wings stay warm for a day after landing. Fishwives use them to dry their gloves.',
    effect: { shieldHp: 8 },
  },
  {
    id: 'fish-kingscale', name: 'Kingscale', emoji: '👑', kind: 'fish', sell: 160, isle: 'fire',
    flavor: 'By royal decree, every Kingscale belongs to the Crown. The Crown is not on the pier right now.',
    effect: { damageMult: 1.05, maxHp: 10 },
  },
];

/** The three rods. Control widens the catch bar; kinds are the waters the line survives. */
export const RODS: RodDef[] = [
  { id: 'rod-driftwood', name: 'Driftwood Rod', control: 1, kinds: ['sea', 'pond'] },
  { id: 'rod-iron', name: 'Iron-Ringed Rod', control: 1.3, kinds: ['sea', 'pond', 'steam', 'wax', 'oil', 'ice', 'ink'] },
  { id: 'rod-obsidian', name: 'Obsidian Rod', control: 1.6, kinds: ['sea', 'pond', 'steam', 'wax', 'oil', 'ice', 'ink', 'lava'] },
];

export const ROD_ITEMS: IsleItemDef[] = [
  {
    id: 'rod-driftwood', name: 'Driftwood Rod', emoji: '🎣', kind: 'rod', price: 60, isle: 'fire',
    flavor: 'A bleached branch, a horsehair line and a bent nail. It has caught more fish than you have.',
  },
  {
    id: 'rod-iron', name: 'Iron-Ringed Rod', emoji: '🎣', kind: 'rod', price: 260, isle: 'fire',
    flavor: 'Iron guides that will not melt in a boiling pond, and a line that holds a thrashing eel.',
  },
  {
    id: 'rod-obsidian', name: 'Obsidian Rod', emoji: '🎣', kind: 'rod', price: 720, isle: 'fire',
    flavor: 'Volcanic glass and wire drawn in the Caldera. The only line on the isle that can fish lava.',
  },
];
