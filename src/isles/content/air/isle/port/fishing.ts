import type { FishDef, FisheryDef, IsleItemDef, RodDef } from '../../../../IslesTypes';

/**
 * Windlass's sea fishing and the skyline rod.
 *
 * The water under the spire drops off a stone shelf a cable's length out and goes down for ever, and
 * the wind that comes off the cliff pushes the surface out to sea all day, so the cold deep water
 * wells up under the quays to replace it. Everything that lives off Windlass lives in that upwelling:
 * herring in shoals so thick the gulls stand on them, cod tucked under the cliff's drowned ledges,
 * lobsters in the cracks, and out past the shelf the fast blue fish that ride the wind-driven swell.
 */

export const WINDLASS_SEA: FisheryDef = { id: 'windlass-sea', name: 'The Upwelling', kind: 'sea' };

/** The six sea fish. Weights are relative inside the one fishery. */
export const SEA_FISH: FishDef[] = [
  /** Small, silver and in their thousands; the gulls' fish, and the Gull Post's postage. Comes up limp. */
  { id: 'fish-gull-herring', fisheries: ['windlass-sea'], weight: 34, fight: 1, size: [18, 32] },
  /** Grey-green, heavy-headed, lives under the cliff's drowned ledges. Pulls like a sulk, then gives up. */
  { id: 'fish-cliff-cod', fisheries: ['windlass-sea'], weight: 22, fight: 2, size: [40, 90] },
  /** Barred blue and silver; leaps the swell like spindrift off a wave-top and never stops kicking. */
  { id: 'fish-spindrift-mackerel', fisheries: ['windlass-sea'], weight: 15, fight: 3, size: [26, 48] },
  /** Lives in the cracks of the quay wall itself and comes up the line claw over claw. */
  { id: 'fish-ledge-lobster', fisheries: ['windlass-sea'], weight: 14, fight: 2, size: [24, 50] },
  /** Out past the shelf, a torpedo of blue muscle. It runs, and runs, and runs. */
  { id: 'fish-sky-tuna', fisheries: ['windlass-sea'], weight: 9, fight: 4, size: [90, 180] },
  /** The rare one: a marlin whose sail-fin catches the wind on the surface. A driftwood rod snaps at its first leap. */
  { id: 'fish-windborne-marlin', fisheries: ['windlass-sea'], weight: 2.5, fight: 5, size: [180, 320], rod: 'rod-iron' },
];

/** Fish as inventory items — sold at the Long Line or the Lee Side, baked at the Rising Loaf. */
export const SEA_FISH_ITEMS: IsleItemDef[] = [
  {
    id: 'fish-gull-herring', name: 'Gull Herring', emoji: '🐟', kind: 'fish', sell: 9, isle: 'air',
    flavor: 'The Gull Post\'s postage: one herring a letter, paid to the gull. The gulls set the rate. It has never gone up.',
    effect: { speedMult: 1.03 },
  },
  {
    id: 'fish-cliff-cod', name: 'Cliff Cod', emoji: '🐟', kind: 'fish', sell: 18, isle: 'air',
    flavor: 'A big grey head and a bad temper. Lives under the drowned ledges, where the cliff goes on down under the sea.',
    effect: { maxHp: 8 },
  },
  {
    id: 'fish-spindrift-mackerel', name: 'Spindrift Mackerel', emoji: '🐠', kind: 'fish', sell: 30, isle: 'air',
    flavor: 'Leaps clear of the swell like spray blown off a wave-top. Tastes of the wind, if wind tasted oily.',
    effect: { critChance: 0.03 },
  },
  {
    id: 'fish-ledge-lobster', name: 'Ledge Lobster', emoji: '🦞', kind: 'fish', sell: 24, isle: 'air',
    flavor: 'Lives in the cracks of the quay wall. Windlass children dare each other to put a finger in. Once.',
    effect: { shieldHp: 9 },
  },
  {
    id: 'fish-sky-tuna', name: 'Sky Tuna', emoji: '🐟', kind: 'fish', sell: 44, isle: 'air',
    flavor: 'Blue as the sky over the cloud line and about as hard to hold. Haulers say one is worth a day\'s breath.',
    effect: { damageMult: 1.03 },
  },
  {
    id: 'fish-windborne-marlin', name: 'Windborne Marlin', emoji: '🐉', kind: 'fish', sell: 210, isle: 'air',
    flavor: 'Raises its sail-fin and lets the cliff wind drive it across the swell. The King once tried to meter one.',
    effect: { speedMult: 1.05, damageMult: 1.04 },
  },
];

/**
 * The skyline rod: a kite-cane rod as long as a mast, with a mile of glass-dressed kite line on a
 * drum reel. You do not cast it out — you let it fly down off a ledge on the wind. It is the only
 * rod on Highspire that fishes the cloud sea and the starpool, and it takes every other water too —
 * every one but lava, which burns kite line through in a breath.
 */
export const RODS: RodDef[] = [
  {
    id: 'rod-skyline', name: 'Skyline Rod', control: 2.1,
    kinds: ['sea', 'pond', 'wax', 'steam', 'oil', 'ice', 'ink', 'bog', 'abyss', 'syrup', 'cloud', 'aurora'],
  },
];

export const ROD_ITEMS: IsleItemDef[] = [
  {
    id: 'rod-skyline', name: 'Skyline Rod', emoji: '🎣', kind: 'rod', price: 1900, isle: 'air',
    flavor: 'Kite-cane, a mile of glass-dressed kite line on a drum reel. You do not cast it. You let it fly down. Not into lava.',
  },
];
