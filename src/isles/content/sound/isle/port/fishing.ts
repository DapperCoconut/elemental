import type { FishDef, FisheryDef, IsleItemDef, RodDef } from '../../../../IslesTypes';

/**
 * Carillon Quay's sea fishing and the tuning rod.
 *
 * The harbour is ringed with bell-buoys, and the fish off Choirholm have lived inside that noise
 * for as long as there have been bells: half of them make a sound of their own. Chimefish ring
 * when they turn; bellmouths boom in the deep; the drumfish drums. The Maestro once had the
 * harbour netted to stop them singing out of the Score. It did not work. It is a long harbour.
 */

export const CARILLON_SEA: FisheryDef = { id: 'carillon-sea', name: 'The Bell Roads', kind: 'sea' };

/** The six sea fish. Weights are relative inside the one fishery. */
export const SEA_FISH: FishDef[] = [
  /** Small, silver and shoaling round the buoys; it rings a little when it turns. Learner's fish. */
  { id: 'fish-chimefish', fisheries: ['carillon-sea'], weight: 34, fight: 1, size: [14, 30] },
  /** A deep-bodied bronze fish with a flared mouth like a bell's lip. Booms when it is landed. */
  { id: 'fish-bellmouth', fisheries: ['carillon-sea'], weight: 22, fight: 2, size: [30, 58] },
  /** A flatfish that lies in the sand and saws its fins against each other. Slides off the hook sideways. */
  { id: 'fish-fiddler-flounder', fisheries: ['carillon-sea'], weight: 16, fight: 2, size: [24, 46] },
  /** A round, tight-skinned fish that drums on its own swim-bladder. Pulls in hard beats. */
  { id: 'fish-kettle-drumfish', fisheries: ['carillon-sea'], weight: 13, fight: 3, size: [36, 70] },
  /** A long ray with a reed-thin tail that whistles in the current. Fights low and keeps on going. */
  { id: 'fish-reed-ray', fisheries: ['carillon-sea'], weight: 9, fight: 4, size: [60, 130] },
  /** The rare one. A blue marlin that sings at the surface before it runs; a driftwood rod sings once and snaps. */
  { id: 'fish-aria-marlin', fisheries: ['carillon-sea'], weight: 2.5, fight: 5, size: [140, 280], rod: 'rod-iron' },
];

/** Fish as inventory items — sold at the Singing Line or Chime & Sundry, baked at the Rising Loaf. */
export const SEA_FISH_ITEMS: IsleItemDef[] = [
  {
    id: 'fish-chimefish', name: 'Chimefish', emoji: '🐟', kind: 'fish', sell: 10, isle: 'sound',
    flavor: 'A silver tiddler that rings like a teaspoon on a glass when it flips. Children keep them in jars to hear it.',
    effect: { regenPerSecond: 0.35 },
  },
  {
    id: 'fish-bellmouth', name: 'Bellmouth', emoji: '🐠', kind: 'fish', sell: 20, isle: 'sound',
    flavor: 'Bronze-scaled, with a mouth flared like a bell\'s lip. It booms once on the quay, and the gulls scatter.',
    effect: { maxHp: 8 },
  },
  {
    id: 'fish-fiddler-flounder', name: 'Fiddler Flounder', emoji: '🐟', kind: 'fish', sell: 24, isle: 'sound',
    flavor: 'Saws its fins together in the sand like a bow on a string. The Hush wardens fine the fishermen who land it.',
    effect: { speedMult: 1.03 },
  },
  {
    id: 'fish-kettle-drumfish', name: 'Kettle Drumfish', emoji: '🐡', kind: 'fish', sell: 36, isle: 'sound',
    flavor: 'Round and tight as a drumskin. It thumps its own swim-bladder all the way up the line, in time.',
    effect: { shieldHp: 10 },
  },
  {
    id: 'fish-reed-ray', name: 'Reed Ray', emoji: '🐡', kind: 'fish', sell: 44, isle: 'sound',
    flavor: 'A brown kite with a tail as thin as an oboe reed. In a running tide you can hear it whistle.',
    effect: { critChance: 0.03 },
  },
  {
    id: 'fish-aria-marlin', name: 'Aria Marlin', emoji: '🐉', kind: 'fish', sell: 220, isle: 'sound',
    flavor: 'It sings at the surface before it runs — a long, high, wordless note. Nobody has ever heard it twice.',
    effect: { damageMult: 1.05, regenPerSecond: 0.4 },
  },
];

/**
 * The tuning rod: a blank of spring-steel drawn out like a tuning fork's tine and wound with gut,
 * tuned at the butt by a brass peg. It rings with whatever water it is in, so it neither shatters
 * on a resonant pool's note nor deadens in a still mere's hush. It takes every water except lava.
 */
export const RODS: RodDef[] = [
  {
    id: 'rod-tuning', name: 'Tuning Rod', control: 2.7,
    kinds: [
      'sea', 'pond', 'wax', 'steam', 'oil', 'ice', 'ink', 'abyss', 'bog', 'syrup', 'cloud', 'aurora', 'sand', 'cavern',
      'charged', 'coolant', 'quantum', 'venom', 'blackwater', 'gilded', 'lethe', 'resonant', 'still',
    ],
  },
];

export const ROD_ITEMS: IsleItemDef[] = [
  {
    id: 'rod-tuning', name: 'Tuning Rod', emoji: '🎣', kind: 'rod', price: 3000, isle: 'sound',
    flavor: 'Spring-steel tine, gut-wound, tuned by a brass peg. It hums to the water it is in. Takes any water but fire.',
  },
];
