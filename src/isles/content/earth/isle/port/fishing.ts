import type { FishDef, FisheryDef, IsleItemDef, RodDef } from '../../../../IslesTypes';

/**
 * Quarrymouth's sea fishing and the delver rod.
 *
 * The harbour is the drowned floor of the old quarry pit: grey-green water, milky with stone-dust
 * near the quay, over three hundred years of dropped blocks, broken cranes and spoil. Everything that
 * lives off Quarrymouth lives in among the fallen stone — and has, the town swears, grown heavy from
 * it. Bream graze the dust off the blocks; mackerel flash in the cuttings; crabs wear the stone they
 * hide under. The marlin lives in the deepest part of the pit, where the first block was ever cut.
 */

export const QUARRYMOUTH_SEA: FisheryDef = { id: 'quarrymouth-sea', name: 'The Drowned Pit', kind: 'sea' };

/** The six sea fish. Weights are relative inside the one fishery. */
export const SEA_FISH: FishDef[] = [
  /** Round, buff and dusty as the blocks it grazes. Comes up heavier than it has any right to. */
  { id: 'fish-quarry-bream', fisheries: ['quarrymouth-sea'], weight: 34, fight: 1, size: [20, 42] },
  /** Striped grey like split flint and sharp at the edges; runs in shoals through the old cuttings. */
  { id: 'fish-flint-mackerel', fisheries: ['quarrymouth-sea'], weight: 24, fight: 2, size: [26, 48] },
  /** Wears a flake of the cliff for a shell. Climbs the line one claw at a time, deliberately. */
  { id: 'fish-cliff-crab', fisheries: ['quarrymouth-sea'], weight: 16, fight: 2, size: [12, 28] },
  /** Flat and grey as a roof-slate; lies on the spoil-heaps and comes up like lifting a tile. */
  { id: 'fish-slate-sole', fisheries: ['quarrymouth-sea'], weight: 12, fight: 3, size: [30, 60] },
  /** Speckled like a granite kerb and nearly as heavy. Driftwood snaps on it. */
  { id: 'fish-granite-grouper', fisheries: ['quarrymouth-sea'], weight: 8, fight: 4, size: [60, 130], rod: 'rod-iron' },
  /** The rare one. Black, columnar, older than the town — lives where the first block was cut. */
  { id: 'fish-basalt-marlin', fisheries: ['quarrymouth-sea'], weight: 2.5, fight: 5, size: [150, 300], rod: 'rod-iron' },
];

/** Fish as inventory items — sold at Lode & Line or the Chock & Chisel, baked at the Hearthstone. */
export const SEA_FISH_ITEMS: IsleItemDef[] = [
  {
    id: 'fish-quarry-bream', name: 'Quarry Bream', emoji: '🐟', kind: 'fish', sell: 10, isle: 'earth',
    flavor: 'Grazes the dust off sunken blocks and goes the colour of them. Quarrymouth swears it weighs more dead.',
    effect: { maxHp: 6 },
  },
  {
    id: 'fish-flint-mackerel', name: 'Flint Mackerel', emoji: '🐟', kind: 'fish', sell: 18, isle: 'earth',
    flavor: 'Striped like a split flint, edges and all. Strike a pair together and children swear they spark.',
    effect: { critChance: 0.02 },
  },
  {
    id: 'fish-cliff-crab', name: 'Cliff Crab', emoji: '🦀', kind: 'fish', sell: 22, isle: 'earth',
    flavor: 'Carries a flake of the quarry face as its shell. Moves house when the face is cut. Holds a grudge.',
    effect: { shieldHp: 10 },
  },
  {
    id: 'fish-slate-sole', name: 'Slate Sole', emoji: '🐟', kind: 'fish', sell: 30, isle: 'earth',
    flavor: 'Flat as a roof-tile and the same grey. Mags Cobble once sold one as a slate by mistake. It leaked.',
    effect: { damageTakenMult: 0.97 },
  },
  {
    id: 'fish-granite-grouper', name: 'Granite Grouper', emoji: '🐡', kind: 'fish', sell: 46, isle: 'earth',
    flavor: 'Speckled pink and grey like a quay kerb, and about as easy to shift. Sulks under a block for an hour.',
    effect: { maxHp: 10, speedMult: 0.98 },
  },
  {
    id: 'fish-basalt-marlin', name: 'Basalt Marlin', emoji: '🐉', kind: 'fish', sell: 210, isle: 'earth',
    flavor: 'Black, hexagonal in the scale, its bill a column of stone. Lives where the first block was ever cut.',
    effect: { damageMult: 1.05, shieldHp: 12 },
  },
];

/**
 * The delver rod: a quarryman's sounding-staff — a length of iron-banded ash, weighted at the butt
 * with a lead bob so it hangs plumb — strung with braided wire and a delver's hook, a little pick-
 * head that bites into sand and stone. It goes down through a dune as through water and down a dry
 * well as far as the line will run. It takes every water except lava.
 */
export const RODS: RodDef[] = [
  {
    id: 'rod-delver', name: 'Delver Rod', control: 2.2,
    kinds: ['sea', 'pond', 'wax', 'steam', 'oil', 'ice', 'ink', 'bog', 'abyss', 'syrup', 'cloud', 'aurora', 'sand', 'cavern'],
  },
];

export const ROD_ITEMS: IsleItemDef[] = [
  {
    id: 'rod-delver', name: 'Delver Rod', emoji: '🎣', kind: 'rod', price: 1700, isle: 'earth',
    flavor: 'A sounding-staff with a pick for a hook. Sinks through a dune like a stone through water. Not lava.',
  },
];
