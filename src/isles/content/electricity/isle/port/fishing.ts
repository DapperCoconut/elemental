import type { FishDef, FisheryDef, IsleItemDef, RodDef } from '../../../../IslesTypes';

/**
 * Terminus's sea fishing and the insulated rod.
 *
 * The harbour is black water under a storm that never stops, and the storm has got into the fish.
 * Everything that lives off Terminus carries a little charge in its flank — the herring glow, the
 * mackerel spark when they turn, and the cable eels nest in the great cable's armour and chew to the
 * copper for the current in it. Out past the reef the thunder marlin hunts in the lightning itself;
 * the old fishers say it surfaces only under a strike, and that the strike is following it.
 */

export const TERMINUS_SEA: FisheryDef = { id: 'terminus-sea', name: 'The Landfall', kind: 'sea' };

/** The six sea fish. Weights are relative inside the one fishery. */
export const SEA_FISH: FishDef[] = [
  /** Small, silver, and glowing blue down the lateral line. Schools at anything bright. Easy. */
  { id: 'fish-volt-herring', fisheries: ['terminus-sea'], weight: 34, fight: 1, size: [18, 32] },
  /** Copper-red and plated like a penny; lives in the cable trench and sulks on the bottom when hooked. */
  { id: 'fish-copper-snapper', fisheries: ['terminus-sea'], weight: 22, fight: 2, size: [26, 54] },
  /** A black eel with a seam of glowing cells; nests in the cable armour and jolts up the line. */
  { id: 'fish-cable-eel', fisheries: ['terminus-sea'], weight: 16, fight: 3, size: [60, 140] },
  /** Barred blue and white; it sparks every time it turns, and it turns every time you reel. */
  { id: 'fish-spark-mackerel', fisheries: ['terminus-sea'], weight: 15, fight: 2, size: [28, 46] },
  /** A torpedo of a fish that runs straight out to sea and takes the line with it. */
  { id: 'fish-storm-tuna', fisheries: ['terminus-sea'], weight: 9, fight: 4, size: [90, 200] },
  /** The rare one. Bill like a lightning rod, strikes from under a strike. A driftwood rod chars to the reel. */
  { id: 'fish-thunder-marlin', fisheries: ['terminus-sea'], weight: 2.5, fight: 5, size: [180, 340], rod: 'rod-iron' },
];

/** Fish as inventory items — sold at Varnish & Line or Sockets & Sundries, baked at the Element. */
export const SEA_FISH_ITEMS: IsleItemDef[] = [
  {
    id: 'fish-volt-herring', name: 'Volt Herring', emoji: '🐟', kind: 'fish', sell: 10, isle: 'electricity',
    flavor: 'Glows blue down its side for a night after it is caught. Terminus children read under them in bed.',
    effect: { cooldownMult: 0.98 },
  },
  {
    id: 'fish-copper-snapper', name: 'Copper Snapper', emoji: '🐠', kind: 'fish', sell: 20, isle: 'electricity',
    flavor: 'Plated like a new penny and about as soft. Lives in the cable trench and tastes faintly of it.',
    effect: { maxHp: 9 },
  },
  {
    id: 'fish-cable-eel', name: 'Cable Eel', emoji: '🐍', kind: 'fish', sell: 30, isle: 'electricity',
    flavor: 'A black eel with a seam of glowing cells. Chews the great cable for the current inside. Bites in volts.',
    effect: { reflectFraction: 0.04 },
  },
  {
    id: 'fish-spark-mackerel', name: 'Spark Mackerel', emoji: '🐟', kind: 'fish', sell: 24, isle: 'electricity',
    flavor: 'Throws a spark off its flank every time it turns. A shoal of them looks like a fuse burning underwater.',
    effect: { speedMult: 1.03 },
  },
  {
    id: 'fish-storm-tuna', name: 'Storm Tuna', emoji: '🐟', kind: 'fish', sell: 46, isle: 'electricity',
    flavor: 'Runs out to sea at the first prick of the hook and does not stop until the reel does. Dark as the swell.',
    effect: { critChance: 0.03, maxHp: 6 },
  },
  {
    id: 'fish-thunder-marlin', name: 'Thunder Marlin', emoji: '🐉', kind: 'fish', sell: 220, isle: 'electricity',
    flavor: 'A bill like a lightning rod and a flank that lights the harbour. They say the storm follows it in.',
    effect: { damageMult: 1.05, critMult: 1.08 },
  },
];

/**
 * The insulated rod: a split-cane blank wound in silk, varnished, then dipped butt to tip in
 * gutta-percha and cured in the Bounce Court's sulphur, with a glass-ringed line that carries no
 * current. It is the only rod that will fish the charged mill race, the cooling pond or the quantum
 * well without the fisher lighting up. It takes every water except lava.
 */
export const RODS: RodDef[] = [
  {
    id: 'rod-insulated', name: 'Insulated Rod', control: 2.4,
    kinds: [
      'sea', 'pond', 'wax', 'steam', 'oil', 'ice', 'ink', 'bog', 'abyss', 'syrup', 'cloud', 'aurora', 'sand', 'cavern',
      'charged', 'coolant', 'quantum',
    ],
  },
];

export const ROD_ITEMS: IsleItemDef[] = [
  {
    id: 'rod-insulated', name: 'Insulated Rod', emoji: '🎣', kind: 'rod', price: 2100, isle: 'electricity',
    flavor: 'Silk-wound cane, dipped black in gutta-percha, glass rings on a dead line. Fishes current without you. Not lava.',
  },
];
