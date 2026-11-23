import type { EncounterDef, GimmickDef } from '../../../../IslesTypes';
import { COLOUR_WHEEL } from './gimmicks/colourWheel';
import { TROMPE } from './gimmicks/trompe';
import { WHITEWASH } from './gimmicks/whitewash';
import { PAINT_BY_NUMBERS } from './gimmicks/paintByNumbers';
import { STILL_LIFE } from './gimmicks/stillLife';

/**
 * The Mural Court's five champions — Prince Hue's painters, each a master of one trick of the
 * brush. Tier 2 of Solmara (difficulty 5 across the board). Over the footbridge Prism grinds
 * his colours by the mills; Faux leans on his painted door on the Great Mural; Dab rolls his
 * dice in Palette Square; Limewash keeps the Censors' Yard; Likeness waits on Atelier Row.
 */

export const MURAL_GIMMICKS: GimmickDef[] = [COLOUR_WHEEL, TROMPE, WHITEWASH, PAINT_BY_NUMBERS, STILL_LIFE];

const COINS = 120;

export const MURAL_ENCOUNTERS: EncounterDef[] = [
  {
    id: 'mural-colour-wheel',
    court: 'mural',
    name: 'Colour Wheel',
    foeName: 'Pigmentist Prism',
    foeElement: 'plasma',
    difficulty: 5,
    gimmick: 'mural-colour-wheel',
    at: { x: 160, y: 1060 },
    look: { body: 0xe8d0b8, accent: 0x8a4ec8, hat: 'goggles', traits: ['apron', 'tool', 'glasses'], size: 1.05, eye: 0xf6c628 },
    challenge: [
      'Light is every colour at once, stranger. I take it apart for a living. Red, yellow, blue. Then I put it back.',
      'The wheel turns. Stand on a colour and it goes into your hand. Stand on a spoke and it goes into you.',
      'Pick a colour. I\'ve picked mine.',
    ],
    beaten: [
      'You took the wheel apart and put it back wrong. On purpose. Hah. That\'s how new colours get made.',
      'Mother Ochre will want to hear about this. Go on — the mills are that way.',
    ],
    coins: COINS,
  },
  {
    id: 'mural-trompe',
    court: 'mural',
    name: 'Trompe-l\'œil',
    foeName: 'Illusionist Faux',
    foeElement: 'illusion',
    difficulty: 5,
    gimmick: 'mural-trompe',
    at: { x: 1640, y: 430 },
    look: { body: 0xd8c0a8, accent: 0xe8b830, hat: 'domino', traits: ['mask', 'scarf'], size: 1, eye: 0x6ad8b0 },
    challenge: [
      'That door behind me? Painted. Lean on it — go on. Everyone does. The censors fined me for it twice.',
      'A painted hole has a shadow in it. They can\'t lime it. It isn\'t real, you see. Except when it is.',
      'I know which ones are which. Watch my feet if you like. I\'ll be watching yours.',
    ],
    beaten: [
      'You walked through my doors like you\'d built them. Lovely. Truly. I may paint you a door of your own.',
      'Don\'t lean on that wall, though. That one\'s real.',
    ],
    coins: COINS,
  },
  {
    id: 'mural-whitewash',
    court: 'mural',
    name: 'Whitewash',
    foeName: 'Censor Limewash',
    foeElement: 'death',
    difficulty: 5,
    gimmick: 'mural-whitewash',
    at: { x: 1300, y: 1310 },
    look: { body: 0xf4f2ea, accent: 0xaebcc2, hat: 'hood', traits: ['apron', 'tool'], size: 1.15, eye: 0x30343a },
    challenge: [
      'You have a shadow. Small, at this hour. But a shadow. It is a hiding place, and I am paid to fill them in.',
      'Lime is very kind. It covers everything. Your stains, your sins, your face. Underneath, nothing changes.',
      'The rollers are coming. Stand still and I\'ll make you clear.',
    ],
    beaten: [
      'Rolled back over me. My own lime. I am — I am whiter than regulation. That\'s a first.',
      'Go. I\'ll be some while getting this off.',
    ],
    coins: COINS,
  },
  {
    id: 'mural-paint-by-numbers',
    court: 'mural',
    name: 'Paint by Numbers',
    foeName: 'Apprentice Dab',
    foeElement: 'fortune',
    difficulty: 5,
    gimmick: 'mural-paint-by-numbers',
    at: { x: 1040, y: 870 },
    look: { body: 0xecd0b0, accent: 0xf6c628, hat: 'beret', traits: ['apron', 'satchel'], size: 0.86, eye: 0xe8b830 },
    challenge: [
      'Seven years an apprentice and they still give me the numbers boards. One is sky. Two is gold. Three is gold.',
      'So I roll for which number I do next. Makes it interesting. Don\'t tell Hue, he thinks dice are a shadow.',
      'You take a number. I\'ll take a number. Loser cleans the brushes.',
    ],
    beaten: [
      'You painted inside the lines. Faster than me. In my own yard. I\'ll clean the brushes, then.',
      'Here — keep the die. No. Wait. I need the die. Keep the… feeling.',
    ],
    coins: COINS,
  },
  {
    id: 'mural-still-life',
    court: 'mural',
    name: 'Still Life',
    foeName: 'Portraitist Likeness',
    foeElement: 'sand',
    difficulty: 5,
    hpMult: 1.05,
    gimmick: 'mural-still-life',
    at: { x: 1900, y: 1170 },
    look: { body: 0xe0c8b0, accent: 0x3e66e0, hat: 'beret', traits: ['glasses', 'book', 'scarf'], size: 1.05, eye: 0xd8b860 },
    challenge: [
      'I paint the court\'s sitters. Ministers. Clerks. Censors, in their best lime. All at noon, all shadowless.',
      'The trick is to make them hold still. The hourglass helps. Two minutes of sand and they stop fidgeting.',
      'Sit for me. You\'ll come out better than you are. They all do. That\'s the trouble with them.',
    ],
    beaten: [
      'You would not hold still. Not for a second. I\'ve never painted anything that moved. Perhaps I should.',
      'Ombretta\'s canvas is in my studio. Twenty years I was meant to paint the shadow out. I never could.',
    ],
    coins: COINS,
  },
];
