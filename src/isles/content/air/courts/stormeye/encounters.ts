import type { EncounterDef } from '../../../../IslesTypes';

/**
 * The Stormeye Court's five champions, each the keeper of one of the town's weathers. Positions
 * match `area.ts`: Volta among the copper of the Rod Field north-east, Grue in his ice-house yard
 * south-west, Cyra on the compass rose of the Calm, Mull at the wall cisterns on the east wall, and
 * Boom on his Thunder Stage north-west of the main street.
 */
export const STORMEYE_ENCOUNTERS: EncounterDef[] = [
  {
    id: 'stormeye-lightning-rod',
    court: 'stormeye',
    name: 'Lightning Rod',
    foeName: 'Rodsmith Volta',
    foeElement: 'electricity',
    difficulty: 4,
    gimmick: 'stormeye-lightning-rod',
    at: { x: 1660, y: 470 },
    look: { body: 0xe8c8a8, accent: 0xc07a44, hat: 'goggles', traits: ['tool', 'glasses'], size: 1.05, eye: 0xd8d0ff },
    challenge: [
      'Every rod in this field I forged and planted myself. Lightning goes where it\'s told, if you tell it in copper.',
      'Stand near a rod and it takes the strike for you. Stand far and the sky takes you instead.',
      'But a rod that\'s struck rings like a bell. Mind you\'re not hugging it when it sings.',
    ],
    beaten: [
      'Grounded. You grounded me. In my own field. I\'ll have that engraved on something.',
      'The rods were meant to keep the town safe. He had me plant them so the strikes go where he likes.',
    ],
    coins: 90,
  },
  {
    id: 'stormeye-hailstorm',
    court: 'stormeye',
    name: 'Hailstorm',
    foeName: 'Hailwarden Grue',
    foeElement: 'ice',
    difficulty: 4,
    gimmick: 'stormeye-hailstorm',
    at: { x: 690, y: 1110 },
    look: { body: 0xd8e4ec, accent: 0x5a7a9a, hat: 'beanie', traits: ['scarf', 'tool', 'beard'], size: 1.3, eye: 0xe4f6ff },
    challenge: [
      'Hail\'s frozen breath, they say up the Tower. So it\'s taxed. So I shovel it. So I keep it.',
      'Watch the shadows on the ground. Where it\'s dark, it\'s about to be white and very hard.',
      'What lands, heaps. A good heap stops a bolt. I\'ve hidden behind heaps my whole life.',
    ],
    beaten: [
      'You kept the heaps between us. Smart. That\'s what heaps are for. Nobody ever listens about heaps.',
      'Take a sack if you want one. Hail keeps a fish fresh. That\'s the only good thing I know about it.',
    ],
    coins: 90,
  },
  {
    id: 'stormeye-eye',
    court: 'stormeye',
    name: 'Eye of the Storm',
    foeName: 'Stormchaser Cyra',
    foeElement: 'tempest',
    difficulty: 4,
    gimmick: 'stormeye-eye',
    at: { x: 1300, y: 940 },
    look: { body: 0xf0d8c0, accent: 0x4a4466, hat: 'aviator', traits: ['scarf', 'pack'], size: 1.0, eye: 0x8ec8f0 },
    challenge: [
      'I\'ve been out in the gale more than anyone alive. I know where the eye\'s going before it does.',
      'The yard\'s a storm with a hole in it. The hole drifts. Stay in the hole and the wind can\'t touch you.',
      'Out of it, you\'ll go round and round like a shutter off its hinge. I love that part.',
    ],
    beaten: [
      'You read the eye better than me. I didn\'t think anyone could. ...Take me chasing sometime?',
      'He holds it open, you know. The eye. Up in the tower. It isn\'t nature. It\'s a grip.',
    ],
    coins: 90,
  },
  {
    id: 'stormeye-raincatcher',
    court: 'stormeye',
    name: 'Raincatcher',
    foeName: 'Cisternkeeper Mull',
    foeElement: 'water',
    difficulty: 5,
    gimmick: 'stormeye-raincatcher',
    at: { x: 1980, y: 800 },
    look: { body: 0xc8b8a8, accent: 0x3a5a6e, hat: 'souwester', traits: ['rod', 'apron', 'pipe'], size: 1.2 },
    challenge: [
      'Four cisterns on the walls, and the sky fills them for free. Then they tip. That\'s the part I like.',
      'Each one throws a wave across the yard the way it faces. Lean on its crank and it turns.',
      'I\'ve turned them all my life. You\'ve turned a doorknob. Let\'s see whose wave you meet.',
    ],
    beaten: [
      'Soaked. Soaked by my own cistern. You turned it on me while I was turning the other one. Rude. Clever.',
      'The rain\'s the Prince\'s, he says. It falls on everybody. I never understood how that makes it his.',
    ],
    coins: 90,
  },
  {
    id: 'stormeye-thunderclap',
    court: 'stormeye',
    name: 'Thunderclap',
    foeName: 'Clapper Boom',
    foeElement: 'sound',
    difficulty: 5,
    gimmick: 'stormeye-thunderclap',
    at: { x: 650, y: 650 },
    look: { body: 0xd8b090, accent: 0x7a828c, hat: 'cap', traits: ['tool', 'beard', 'satchel'], size: 1.4, eye: 0xfff8c0 },
    challenge: [
      'FLASH — one — two — three — BOOM. Three\'s a mile. Count it in, or the bang counts you out.',
      'The light comes first. The noise comes after, rolling out like a wave. Close to the flash, it knocks you flat.',
      'Far from it, it\'s only a grumble. So: hear the flash, and RUN. That\'s the whole of my religion.',
    ],
    beaten: [
      'You counted it in. Every time. Pip, did you see? They COUNTED.',
      'I make the thunder for the Prince\'s forecasts. Shake the sheet so the town knows to be afraid. No more.',
    ],
    coins: 90,
  },
];
