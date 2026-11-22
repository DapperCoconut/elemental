import type { EncounterDef, GimmickDef } from '../../../../IslesTypes';
import { BROOD } from './gimmicks/brood';
import { LOOM } from './gimmicks/loom';
import { MARIONETTE } from './gimmicks/marionette';
import { SILK_LINES } from './gimmicks/silkLines';
import { TRIPWIRE } from './gimmicks/tripwire';

/**
 * The Web Court's five champions — the spinners, trappers and keepers of Prince Weft's silk town.
 * Tier 2 of Fangmire (difficulty 4,4,4,5,5). Over the Long Strand from the Fang Court you meet
 * Snare among his wires on the bridge, Mab at the spider pens, Arachne at the mill, Shuttle at the
 * great loom by the racks and Gepp before his puppet theatre on the south bridge.
 */

export const WEB_GIMMICKS: GimmickDef[] = [SILK_LINES, TRIPWIRE, BROOD, LOOM, MARIONETTE];

const COINS = 100;

export const WEB_ENCOUNTERS: EncounterDef[] = [
  {
    id: 'web-silk-lines',
    court: 'web',
    name: 'Silk Lines',
    foeName: 'Spinner Arachne',
    foeElement: 'cloth',
    difficulty: 4,
    gimmick: 'web-silk-lines',
    at: { x: 440, y: 600 },
    look: { body: 0xd8c0a8, accent: 0x5a3a6a, hat: 'veil', traits: ['apron', 'tool'], size: 1.05, eye: 0xddd4f0 },
    challenge: [
      'Eight frames, sixty bobbins, and I hear every one of them run. Yours is running wrong. Too fast.',
      'Everything that hurries in my mill leaves a thread. Hurry, then. Leave me some.',
      'I\'ll have you wound on a spool by the bell.',
    ],
    beaten: [
      'You stood still and let me tangle myself. Nobody\'s done that since my mother taught me.',
      'Go on. Mind the knots on your way out.',
    ],
    coins: COINS,
  },
  {
    id: 'web-tripwire',
    court: 'web',
    name: 'Tripwire',
    foeName: 'Trapper Snare',
    foeElement: 'gunpowder',
    difficulty: 4,
    gimmick: 'web-tripwire',
    at: { x: 1990, y: 860 },
    look: { body: 0xb8a088, accent: 0xc9a248, hat: 'cowl', traits: ['pack', 'eyepatch'], size: 1.1, eye: 0xffe6a8 },
    challenge: [
      'Every bridge into this court has a wire on it. I strung them. You crossed four on the way here.',
      'You didn\'t trip any. That bothers me. That bothers me a great deal.',
      'Let\'s try again on flat boards. I\'ve had time to think.',
    ],
    beaten: [
      'You stepped over every one. Or you made me step on them. Which was it? Don\'t tell me. I\'ll work it out.',
    ],
    coins: COINS,
  },
  {
    id: 'web-brood',
    court: 'web',
    name: 'Brood',
    foeName: 'Broodkeeper Mab',
    foeElement: 'growth',
    difficulty: 4,
    gimmick: 'web-brood',
    at: { x: 1860, y: 610 },
    look: { body: 0xc8b49a, accent: 0x9ad04a, hat: 'plague', traits: ['satchel', 'apron'], size: 1.15, eye: 0x9ad04a },
    challenge: [
      'Mind the sacs, dear. Those are this season\'s spinners. Four hundred to a sac. Every one of them hungry.',
      'They don\'t know me from you. They just know who\'s closest. I\'ve learned to stand back.',
      'Have you?',
    ],
    beaten: [
      'You squashed half my season. Well. The other half will spin twice as hard. They always do.',
      'Wash your boots before you go near the pens.',
    ],
    coins: COINS,
  },
  {
    id: 'web-loom',
    court: 'web',
    name: 'Loom',
    foeName: 'Weaver Shuttle',
    foeElement: 'creation',
    difficulty: 5,
    gimmick: 'web-loom',
    at: { x: 760, y: 1390 },
    look: { body: 0xdcc6ae, accent: 0x8c62a2, hat: 'hood', traits: ['glasses', 'scarf'], size: 0.95, eye: 0xd8c0f0 },
    challenge: [
      'I wove the Prince\'s cloak. Grey on grey, three hundred threads an inch. You can\'t see the pattern. He can.',
      'This is my loom. All of this yard. The shuttle goes where I throw it and the cloth goes up behind it.',
      'Stand in the warp, then. See what gets woven in.',
    ],
    beaten: [
      'You batted my shuttle back at me. My own shuttle. That\'s a thing apprentices dream of doing.',
      'I may weave something with a colour in it tonight. Don\'t tell the Loft.',
    ],
    coins: COINS,
  },
  {
    id: 'web-marionette',
    court: 'web',
    name: 'Marionette',
    foeName: 'Puppeteer Gepp',
    foeElement: 'dream',
    difficulty: 5,
    hpMult: 1.05,
    gimmick: 'web-marionette',
    at: { x: 1300, y: 1310 },
    look: { body: 0xe0c8b0, accent: 0xd8402e, hat: 'tophat', traits: ['scarf', 'cane'], size: 1.0, eye: 0xe2c25c },
    challenge: [
      'Every evening at the theatre, the Matriarch\'s mercy. A puppet queen saving a puppet town. They clap.',
      'They have to clap. Somebody\'s always listening for who doesn\'t.',
      'Come up on the stage. I\'ve a part for you. You don\'t have to learn it. The strings know it.',
    ],
    beaten: [
      'Cut free, every thread. That\'s not in the play. That\'s never been in the play.',
      'I might write it in. Quietly. For the late show.',
    ],
    coins: COINS,
  },
];
