import type { EncounterDef } from '../../../../IslesTypes';

/**
 * The five champions of the Heartwood Court, spread up the trunk from the taps on the lower
 * terrace to the woodpeckers' loft on the east bough. Tier 4 — the hardest court on Thornwild:
 * difficulties 4, 4, 5, 5, 5 and 90 coins apiece. Ids match the encounters the quests ask for.
 */
export const HEARTWOOD_ENCOUNTERS: EncounterDef[] = [
  {
    id: 'heartwood-sap-tap',
    court: 'heartwood',
    name: 'Sap Tap',
    foeName: 'Tapper Resinia',
    foeElement: 'gluttony',
    difficulty: 4,
    gimmick: 'heartwood-sap-tap',
    at: { x: 1500, y: 1190 },
    look: { body: 0xd8cfbc, accent: 0xa65a0b, hand: 0xf0a024, hat: 'bandana', traits: ['tool', 'apron', 'satchel'], size: 1.05, eye: 0xffd76e },
    challenge: [
      'Every spile on this terrace is mine to tap. I tap them for the tithe. Some I tap for the prince, quietly.',
      'Shoulder a full one and it splashes. Stand in the splash and it sets — and a set fly is an easy swat.',
    ],
    beaten: [
      'You made the taps splash my way. I\'ve been tapping this bark thirty years and never got so sticky.',
      'Go on. I\'ll top up the Larchmere spile. Don\'t look at me like that, I said I would.',
    ],
    coins: 90,
  },
  {
    id: 'heartwood-growth-rings',
    court: 'heartwood',
    name: 'Growth Rings',
    foeName: 'Ringreader Dendro',
    foeElement: 'sand',
    difficulty: 4,
    gimmick: 'heartwood-growth-rings',
    at: { x: 900, y: 930 },
    look: { body: 0xc9b89a, accent: 0x5a4329, hand: 0xa9492a, hat: 'wizard', traits: ['glasses', 'book', 'cane'], size: 0.95, eye: 0xffe9b0 },
    challenge: [
      'A tree keeps its years in rings. The dry years tight and dark, the good years wide and bright.',
      'Ride this year\'s ring and time runs quick for you. Stand in the old ones and you\'ll feel every one of them.',
    ],
    beaten: [
      'You rode the year out to the bark and I was stuck in the drought of \'41. Embarrassing. I wrote that ring.',
      'I\'ll note the date. You\'ll be in the next ring, I think. A wide one.',
    ],
    coins: 90,
  },
  {
    id: 'heartwood-woodpecker',
    court: 'heartwood',
    name: 'Woodpecker',
    foeName: 'Drummer Pike',
    foeElement: 'sound',
    difficulty: 5,
    gimmick: 'heartwood-woodpecker',
    at: { x: 1880, y: 470 },
    look: { body: 0x2a2624, accent: 0xd8262a, hand: 0xf4f2ea, hat: 'cap', traits: ['tool', 'scarf'], size: 1.0, eye: 0xffffff },
    challenge: [
      'My birds drum the hours for the prince. Count with them — one, two, three, and on the last, the trunk splits.',
      'Splinters fly the way the bird\'s not facing. Keep time, or keep still and learn what a splinter is.',
    ],
    beaten: [
      'You counted my birds better than I do. You walked into the beat like a dancer. I\'d take you in the band.',
      'The birds like you. That\'s worse for me than losing, honestly.',
    ],
    coins: 90,
  },
  {
    id: 'heartwood-leaf-fall',
    court: 'heartwood',
    name: 'Leaf Fall',
    foeName: 'Autumn-Keeper Russet',
    foeElement: 'tempest',
    difficulty: 5,
    gimmick: 'heartwood-leaf-fall',
    at: { x: 560, y: 410 },
    look: { body: 0xc9642b, accent: 0x9e3622, hand: 0xe9bc33, hat: 'wreath', traits: ['scarf', 'cane'], size: 1.1, eye: 0xfff2c0 },
    challenge: [
      'I keep the autumn up here. Every leaf that falls, I tell it where. They pile where I like.',
      'Burrow into a drift and I can\'t see you, and it\'s soft besides. But my wind can see everything.',
    ],
    beaten: [
      'You hid in my own leaves and let my gusts blow me bare. Every drift on the bough is laughing at me.',
      'It\'ll be winter soon. I\'ll have nothing to keep. Maybe I\'ll learn to like snow.',
    ],
    coins: 90,
  },
  {
    id: 'heartwood-termites',
    court: 'heartwood',
    name: 'Termites',
    foeName: 'Borer Mandible',
    foeElement: 'ruin',
    difficulty: 5,
    hpMult: 1.1,
    gimmick: 'heartwood-termites',
    at: { x: 1430, y: 820 },
    look: { body: 0xc9a26a, accent: 0x3a2410, hand: 0xe6cfa0, hat: 'goggles', traits: ['tool', 'mask', 'pack'], size: 1.25, eye: 0xffe0a0 },
    challenge: [
      'The prince lets me keep the catwalks. My termites keep them honest — they eat every plank sooner or later.',
      'Stand still on a plank and you\'ll hear them under you. Then you won\'t be standing on anything.',
    ],
    beaten: [
      'You let my colony eat the floor out from under me. Twice. They\'ve never been so well fed, the brutes.',
      'I\'ll nail the catwalks fresh tonight. Proper oak. Termites hate oak.',
    ],
    coins: 90,
  },
];
