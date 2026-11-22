import type { EncounterDef, GimmickDef } from '../../../../IslesTypes';
import { BROWNOUT } from './gimmicks/brownout';
import { LIGHTNING_RODS } from './gimmicks/lightningRods';
import { MILL_RACE } from './gimmicks/millRace';
import { OVERLOAD } from './gimmicks/overload';
import { TREADWHEEL } from './gimmicks/treadwheel';

/**
 * The Dynamo Court's five champions — the hands who keep Prince Volt's power station turning.
 * Tier 1 of Voltreach (difficulty 3,3,4,4,4). Up the cable road from Terminus you meet Dobbin
 * between the treadwheels, Ferris among the rods on the hillside, Gloam in the switchyard,
 * Amp at the Fuse House by the race, and Tessa on the bank between the wheelhouses.
 */

export const DYNAMO_GIMMICKS: GimmickDef[] = [TREADWHEEL, LIGHTNING_RODS, BROWNOUT, OVERLOAD, MILL_RACE];

const COINS = 80;

export const DYNAMO_ENCOUNTERS: EncounterDef[] = [
  {
    id: 'dynamo-treadwheel',
    court: 'dynamo',
    name: 'Treadwheel',
    foeName: 'Wheelhand Dobbin',
    foeElement: 'earth',
    difficulty: 3,
    gimmick: 'dynamo-treadwheel',
    at: { x: 510, y: 722 },
    look: { body: 0xb8946e, accent: 0x6a4a30, hat: 'cap', traits: ['beard', 'tool'], size: 1.3, eye: 0xf2ac6c },
    challenge: [
      'Thirty years on that wheel. Left, right, left. My legs are the strongest thing on this isle, after the Coil.',
      'They put the short households on my wheel to walk off their Draw. I keep the pace. I keep it honest.',
      'Out on the yard track, stranger. Walk with the turn or walk off the end of it.',
    ],
    beaten: [
      'You found the turn quicker than I did, my first year. My first year I cried. Don\'t tell anyone.',
      'Go on. The wheel doesn\'t stop for either of us.',
    ],
    coins: COINS,
  },
  {
    id: 'dynamo-lightning-rods',
    court: 'dynamo',
    name: 'Lightning Rods',
    foeName: 'Rodsman Ferris',
    foeElement: 'metal',
    difficulty: 3,
    gimmick: 'dynamo-lightning-rods',
    at: { x: 560, y: 402 },
    look: { body: 0xa8a29a, accent: 0x7c8592, hat: 'helmet', traits: ['tool', 'glasses'], size: 1.1, eye: 0x9fe6ff },
    challenge: [
      'Every rod on this hill I raised. The storm comes down them into the Grid, and the Grid feeds the Coil.',
      'I\'ve been struck eleven times. Each time I got up. Each time the Empress sent a letter of thanks.',
      'Stand by a rod, if you want to live. Better stand by one I haven\'t bent.',
    ],
    beaten: [
      'You bent my rods. Nobody bends my rods. I\'ll straighten them by the Bell, and I\'ll think about you.',
      'Twelve times struck, now. One of them by a stranger.',
    ],
    coins: COINS,
  },
  {
    id: 'dynamo-brownout',
    court: 'dynamo',
    name: 'Brownout',
    foeName: 'Switchman Gloam',
    foeElement: 'shadow',
    difficulty: 4,
    gimmick: 'dynamo-brownout',
    at: { x: 1700, y: 1004 },
    look: { body: 0x7a7480, accent: 0x14161c, hat: 'hood', traits: ['lantern', 'mask'], size: 1.05, eye: 0xffd98a },
    challenge: [
      'I throw the switch that turns a house off. Every night. I see the windows go, one, then two, then a row.',
      'People think the dark is nothing. It isn\'t. It is the Grid, looking away from you.',
      'Let\'s see how you do when nobody is looking.',
    ],
    beaten: [
      'You put the lights back on. On me. I haven\'t stood in a lit room in years. It\'s very loud.',
      'Leave the breakers be when you go. Or don\'t. I find I don\'t mind.',
    ],
    coins: COINS,
  },
  {
    id: 'dynamo-overload',
    court: 'dynamo',
    name: 'Overload',
    foeName: 'Fusewright Amp',
    foeElement: 'gunpowder',
    difficulty: 4,
    gimmick: 'dynamo-overload',
    at: { x: 820, y: 1082 },
    look: { body: 0xc89e7c, accent: 0xe8c838, hat: 'goggles', traits: ['apron', 'satchel', 'bandage'], size: 1, eye: 0xff8a3a },
    challenge: [
      'A fuse is a promise. It says: I will break, so the house doesn\'t burn. I make thousands. All promises.',
      'The Grid takes too much, the fuse blows. That\'s why the Empress counts every one I make.',
      'Mind the boxes. Every blow you land, they\'re listening.',
    ],
    beaten: [
      'You pulled my fuses and threw them at me. That\'s — well. That\'s exactly what I\'d do. Well fought.',
      'I\'ve singed my eyebrows off again. Third time this month.',
    ],
    coins: COINS,
  },
  {
    id: 'dynamo-mill-race',
    court: 'dynamo',
    name: 'Mill Race',
    foeName: 'Millwright Tessa',
    foeElement: 'water',
    difficulty: 4,
    hpMult: 1.05,
    gimmick: 'dynamo-mill-race',
    at: { x: 1750, y: 1112 },
    look: { body: 0xc4a084, accent: 0x183844, hat: 'souwester', traits: ['tool', 'scarf'], size: 1.1, eye: 0xd6f0f6 },
    challenge: [
      'Three wheelhouses on my race. If a wheel stops, the whole bank is short, and the fine is mine to hand out.',
      'Bram\'s got his grilles, I\'ve got my wheels, and the race has got everybody.',
      'Stand by a turbine and you\'ll feel what the Grid feels. Stand too close and it\'ll take your hand off.',
    ],
    beaten: [
      'You let the race do the work. Most people fight the water. The water always wins.',
      'Go on. Mind the blades on your way past.',
    ],
    coins: COINS,
  },
];
