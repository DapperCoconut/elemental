import type { EncounterDef, GimmickDef } from '../../../../IslesTypes';
import { ORE_CARTS } from './gimmicks/oreCarts';
import { CRUCIBLE } from './gimmicks/crucible';
import { QUENCH_FIGHT } from './gimmicks/quench';
import { SCRAP_MAGNET } from './gimmicks/scrapMagnet';
import { STRIKE_WHILE_HOT } from './gimmicks/strikeWhileHot';

/**
 * The Forge Court's five champions — the smiths and yard-hands who keep Prince Anvil's foundry
 * running. Tier 3 of Bedrock Hold (difficulty 4,4,4,5,5). In from the Stonehold road you meet
 * Tilda on the rails along the south, Brannoc on the casting floor before the furnaces, Hild at
 * the quench pond, Rusk in his scrapyard beyond the Runnel, and Cinder at the long forge at the
 * east end of Hammer Row.
 */

export const FORGE_GIMMICKS: GimmickDef[] = [ORE_CARTS, CRUCIBLE, QUENCH_FIGHT, SCRAP_MAGNET, STRIKE_WHILE_HOT];

const COINS = 95;

export const FORGE_ENCOUNTERS: EncounterDef[] = [
  {
    id: 'forge-ore-carts',
    court: 'forge',
    name: 'Ore Carts',
    foeName: 'Railhand Tilda',
    foeElement: 'technology',
    difficulty: 4,
    gimmick: 'forge-ore-carts',
    at: { x: 980, y: 1470 },
    look: { body: 0xd0a888, accent: 0xb07a3a, hat: 'miner', traits: ['tool', 'scarf', 'satchel'], size: 1, eye: 0xffc23a },
    challenge: [
      'You\'re on my rails. Nobody stands on my rails. The carts don\'t stop, and neither do I.',
      'Every ounce on the Hook came down these lines in my carts. I know every junction blind.',
      'Mind the levers. I throw them without looking. You\'ll have to look.',
    ],
    beaten: [
      'You threw my own points on me. Nobody\'s ever thrown my points. I\'m almost proud.',
      'Get off the rails, then. Carts are coming. They always are.',
    ],
    coins: COINS,
  },
  {
    id: 'forge-crucible',
    court: 'forge',
    name: 'Crucible',
    foeName: 'Pourmaster Brannoc',
    foeElement: 'magma',
    difficulty: 4,
    gimmick: 'forge-crucible',
    at: { x: 620, y: 566 },
    look: { body: 0xb88a6a, accent: 0xf06a1a, hat: 'goggles', traits: ['apron', 'beard', 'tool'], size: 1.3, eye: 0xffc23a },
    challenge: [
      'Forty years I\'ve poured. Pig, plate, bell, shackle. The iron goes where I point it.',
      'I\'m going to point it at you. It\'ll cool into a nice wall. You\'ll be on one side of it, or under it.',
      'Stand clear of the channels, or don\'t. The iron isn\'t particular.',
    ],
    beaten: [
      'You hid behind my own pour. Clever. The iron doesn\'t care who it shelters. I forget that.',
      'Off you go. I\'ve a tap at noon.',
    ],
    coins: COINS,
  },
  {
    id: 'forge-quench-fight',
    court: 'forge',
    name: 'Quench',
    foeName: 'Temperer Hild',
    foeElement: 'water',
    difficulty: 4,
    gimmick: 'forge-quench-fight',
    at: { x: 640, y: 1110 },
    look: { body: 0xc8b0a0, accent: 0x2a3c48, hat: 'souwester', traits: ['apron', 'tool', 'glasses'], size: 1.05, eye: 0x9ad0ff },
    challenge: [
      'Steel\'s soft till it\'s quenched. Hot, then cold, all at once. That\'s temper.',
      'The Prince was quenched in my pond when he was ten. On his father\'s orders. He came out hard.',
      'Pick up an ingot if you dare. Mind your hands. Mind the troughs more.',
    ],
    beaten: [
      'Scalded on my own steam. Well. You\'ve the temper for it.',
      'He came out hard, the Prince. I sometimes wonder if he came out at all.',
    ],
    coins: COINS,
  },
  {
    id: 'forge-scrap-magnet',
    court: 'forge',
    name: 'Scrap Magnet',
    foeName: 'Scrapper Rusk',
    foeElement: 'magnet',
    difficulty: 5,
    gimmick: 'forge-scrap-magnet',
    at: { x: 1900, y: 1190 },
    look: { body: 0xa87a5a, accent: 0x5ab4ff, hat: 'cap', traits: ['pack', 'tool', 'eyepatch'], size: 1.15, eye: 0x5ab4ff },
    challenge: [
      'Everything iron comes to Rusk in the end. Hinges, horseshoes, the doors off bricked-up forges.',
      'The Prince melts it all down for the Tithe. Waste not. Weigh heavy. I\'ve a crane for the heavy bits.',
      'You look like a heavy bit.',
    ],
    beaten: [
      'Dropped on my own scrap. That\'s a first. I\'ll weigh it in as "humility".',
      'Go on. I\'ve got a pile to sort.',
    ],
    coins: COINS,
  },
  {
    id: 'forge-strike-while-hot',
    court: 'forge',
    name: 'Strike While Hot',
    foeName: 'Journeyman Cinder',
    foeElement: 'fire',
    difficulty: 5,
    hpMult: 1.05,
    gimmick: 'forge-strike-while-hot',
    at: { x: 2150, y: 866 },
    look: { body: 0xd8a880, accent: 0xc02a14, hat: 'coif', traits: ['apron', 'bandage', 'tool'], size: 1.05, eye: 0xfff4d8 },
    challenge: [
      'Journeyman of the long forge, and I\'ll be master at the turn if I hit hard enough. Hard as you, say.',
      'Iron works best white. So do I. I\'ve burnt myself every day for seven years to learn it.',
      'Strike while it\'s hot, stranger. I always am.',
    ],
    beaten: [
      'Quenched, and beaten. That\'s two lessons. The masters only ever taught me the first.',
      'I\'ll cool off. Promise. Eventually.',
    ],
    coins: COINS,
  },
];
