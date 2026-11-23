import type { FishDef, FisheryDef, IsleItemDef, RodDef } from '../../../../IslesTypes';

/**
 * Tosswater's sea fishing and the fortune rod.
 *
 * The harbour floor is pale sand strewn with two hundred years of lost stakes — chips, dice,
 * buttons, the odd snapped Lot thrown off the pier by someone busted — and the fish off Tosswater
 * have grown into the place. Lotfish shoal in their thousands, each with a number in its scales
 * that the children read like the Draw. Dabs lie flat on the sand showing their pips. Wrasse turn
 * red or black as they please. And out past the piers, now and then, the jackpot marlin rises,
 * gilt from nose to tail, and the whole quay drops what it is doing to bet on the line.
 */

export const TOSSWATER_SEA: FisheryDef = { id: 'tosswater-sea', name: 'The Stakewater', kind: 'sea' };

/** The six sea fish. Weights are relative inside the one fishery. */
export const SEA_FISH: FishDef[] = [
  /** Small, brassy and everywhere; every one has four dark marks on its flank like the digits of a Lot. */
  { id: 'fish-lotfish', fisheries: ['tosswater-sea'], weight: 34, fight: 1, size: [14, 30] },
  /** A flatfish that lies on the sand showing one to six white spots. Turns over when hooked, like a die. */
  { id: 'fish-dice-dab', fisheries: ['tosswater-sea'], weight: 22, fight: 2, size: [20, 38] },
  /** Round and fat as a stack of chips, banded red and white. Sinks like one, too. */
  { id: 'fish-chip-chub', fisheries: ['tosswater-sea'], weight: 16, fight: 2, size: [24, 46] },
  /** Flushes red or black as it swims. The quay bets on which colour it lands. It fights the whole way up. */
  { id: 'fish-wager-wrasse', fisheries: ['tosswater-sea'], weight: 13, fight: 3, size: [26, 52] },
  /** Motley-striped, quick, and a liar: it plays dead on the line, then bolts. Fishers swear at it by name. */
  { id: 'fish-joker-jack', fisheries: ['tosswater-sea'], weight: 9, fight: 4, size: [40, 84] },
  /** The rare one. Gilt from bill to tail; the quay stops dead when one rises. A driftwood rod is matchwood to it. */
  { id: 'fish-jackpot-marlin', fisheries: ['tosswater-sea'], weight: 2.5, fight: 5, size: [140, 280], rod: 'rod-iron' },
];

/** Fish as inventory items — sold at the Long Shot or Odds & Ends, baked at the Lucky Loaf. */
export const SEA_FISH_ITEMS: IsleItemDef[] = [
  {
    id: 'fish-lotfish', name: 'Lotfish', emoji: '🐟', kind: 'fish', sell: 10, isle: 'fate',
    flavor: 'Four dark marks on every flank, like the digits of a Lot. Children read them out like the Draw.',
    effect: { regenPerSecond: 0.35 },
  },
  {
    id: 'fish-dice-dab', name: 'Dice Dab', emoji: '🐟', kind: 'fish', sell: 20, isle: 'fate',
    flavor: 'Lies on the sand showing its spots. Count them before you eat it — Tosswater says it is bad luck not to.',
    effect: { shieldHp: 9 },
  },
  {
    id: 'fish-chip-chub', name: 'Chip Chub', emoji: '🐠', kind: 'fish', sell: 24, isle: 'fate',
    flavor: 'Round, banded red and white, and heavy as a stack of the House\'s chips. Tastes better than they do.',
    effect: { maxHp: 8 },
  },
  {
    id: 'fish-wager-wrasse', name: 'Wager Wrasse', emoji: '🐠', kind: 'fish', sell: 38, isle: 'fate',
    flavor: 'Lands red or black, never both. Half the quay wins and half loses every time one comes up.',
    effect: { critChance: 0.03 },
  },
  {
    id: 'fish-joker-jack', name: 'Joker Jack', emoji: '🐟', kind: 'fish', sell: 46, isle: 'fate',
    flavor: 'Motley-striped and a born liar. Plays dead on the line, then runs. Grins, if a fish can. This one can.',
    effect: { dodgeChance: 0.03 },
  },
  {
    id: 'fish-jackpot-marlin', name: 'Jackpot Marlin', emoji: '🐉', kind: 'fish', sell: 240, isle: 'fate',
    flavor: 'Gilt from bill to tail. When one rises off Tosswater, the quay stops dead and every soul on it makes a bet.',
    effect: { damageMult: 1.05, maxHp: 8 },
  },
];

/**
 * The fortune rod: a croupier's rake-handle of ebony, ringed with gilt at every hand's-breadth,
 * strung with line spun from a gambler's lucky ribbon. Gold water cannot eat it and Lethe water
 * cannot make it forget what it is for. It takes every water except lava.
 */
export const RODS: RodDef[] = [
  {
    id: 'rod-fortune', name: 'Fortune Rod', control: 2.6,
    kinds: [
      'sea', 'pond', 'wax', 'steam', 'oil', 'ice', 'ink', 'abyss', 'bog', 'syrup', 'cloud', 'aurora', 'sand', 'cavern',
      'charged', 'coolant', 'quantum', 'venom', 'blackwater', 'gilded', 'lethe',
    ],
  },
];

export const ROD_ITEMS: IsleItemDef[] = [
  {
    id: 'rod-fortune', name: 'Fortune Rod', emoji: '🎣', kind: 'rod', price: 2800, isle: 'fate',
    flavor: 'A croupier\'s rake-handle of ebony, gilt-ringed, strung with a lucky ribbon. Takes any water but fire.',
  },
];
