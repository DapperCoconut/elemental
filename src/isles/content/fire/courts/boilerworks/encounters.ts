import type { EncounterDef } from '../../../../IslesTypes';

/**
 * The Boilerworks' five champions — the Prince's shift bosses, each the master of one machine
 * on the yard. Win all five and the control tower's gate opens.
 */

export const ENC_VALVES = 'boilerworks-valve-race';
export const ENC_CONVEYOR = 'boilerworks-conveyor';
export const ENC_STEAM = 'boilerworks-steam-bath';
export const ENC_PISTON = 'boilerworks-piston-press';
export const ENC_OVERPRESSURE = 'boilerworks-overpressure';

export const BOILERWORKS_ENCOUNTERS: EncounterDef[] = [
  {
    id: ENC_VALVES, court: 'boilerworks', name: 'Valve Race',
    foeName: 'Valvejack Pinter', foeElement: 'technology', difficulty: 2,
    gimmick: 'boilerworks-valves',
    at: { x: 2060, y: 705 },
    look: { body: 0x8a6a5a, accent: 0xa83a2a, hat: 'goggles', traits: ['tool', 'brand'], size: 0.95 },
    challenge: [
      'Four valves, four mains, one gauge. I turn them faster than anyone on this yard.',
      'You want through to the Prince? Race me for the wheels. Loser gets parboiled.',
    ],
    beaten: [
      'You spin a wheel like you were born on shift. ...Don\'t tell the overseer I said that.',
      'The manifold\'s yours if you want it. I\'m going to sit down for the first time in a week.',
    ],
    coins: 40,
  },
  {
    id: ENC_CONVEYOR, court: 'boilerworks', name: 'Conveyor Floor',
    foeName: 'Foreman Brindle', foeElement: 'metal', difficulty: 2,
    gimmick: 'boilerworks-conveyors',
    at: { x: 700, y: 610 },
    look: { body: 0x7a7470, accent: 0x3a3e44, hat: 'helmet', traits: ['beard', 'book'], size: 1.25 },
    challenge: [
      'Names. Shift numbers. Who was late. Who coughed. It all goes in the book.',
      'You\'re not in the book. Let\'s put you on the belt and see where you come out.',
    ],
    beaten: [
      'Belt Four\'s running backwards and so\'s my career.',
      'Fine. Fine! The book stays shut. For today.',
    ],
    coins: 40,
  },
  {
    id: ENC_STEAM, court: 'boilerworks', name: 'Steam Bath',
    foeName: 'Scalder Mira', foeElement: 'water', difficulty: 3,
    gimmick: 'boilerworks-steam-bath',
    at: { x: 880, y: 1295 },
    look: { body: 0xd8a890, accent: 0xe8eef2, hat: 'bandana', traits: ['apron', 'scarf'], size: 1 },
    challenge: [
      'Night shift comes through here black as the coal. I boil it off them. I can boil it off you.',
      'Steam softens everything, love. You\'ll hit like a wet towel and I\'ll hit like a kettle.',
    ],
    beaten: [
      'Hah. You pushed my own steam back in my face. Cheeky. I like cheeky.',
      'Come back when the shift\'s done. I\'ll run you a bath that doesn\'t hurt.',
    ],
    coins: 40,
  },
  {
    id: ENC_PISTON, court: 'boilerworks', name: 'Piston Press',
    foeName: 'Press-Hand Dunk', foeElement: 'earth', difficulty: 3,
    gimmick: 'boilerworks-piston-press',
    at: { x: 1450, y: 1065 },
    look: { body: 0x6a5a4e, accent: 0x2a2a2a, hat: 'cap', traits: ['bandage', 'brand'], size: 1.35 },
    challenge: [
      'Thump. Thump. Thump. Eighteen years I\'ve stood under them. Never been stamped once.',
      'You learn to hear where they fall. Let\'s see if you\'ve got the ear.',
    ],
    beaten: [
      'You heard them. Few do. Most just get flat.',
      'Tell the others Dunk sat out a shift. They won\'t believe you.',
    ],
    coins: 40,
  },
  {
    id: ENC_OVERPRESSURE, court: 'boilerworks', name: 'Overpressure',
    foeName: 'Kessel the Boiler-Heart', foeElement: 'pressure', difficulty: 3, hpMult: 1.1,
    gimmick: 'boilerworks-overpressure',
    at: { x: 1950, y: 530 },
    look: { body: 0xb5683a, accent: 0x3a1c0e, hat: 'none', traits: ['mask', 'brand'], size: 1.3, eye: 0xffb060 },
    challenge: [
      'Hssss. They fed me to the boiler. The boiler fed back. Now we beat together.',
      'Every blow you strike, I swell. Strike, little stoker. Strike until we both go up.',
    ],
    beaten: [
      'Hsss... vented. Quiet. I had forgotten what quiet was.',
      'The grate. Always the grate. You learn faster than they let us.',
    ],
    coins: 40,
  },
];
