import type { EncounterDef, GimmickDef } from '../../../../IslesTypes';
import { CHARMERS_PIPE } from './gimmicks/charmersPipe';
import { FEN_GAS } from './gimmicks/fenGas';
import { SHED_SKIN } from './gimmicks/shedSkin';
import { SNAKE_PIT } from './gimmicks/snakePit';
import { THE_MARK } from './gimmicks/theMark';

/**
 * The Fang Court's five champions — the hands who keep the Matriarch's venom flowing. Tier 1 of
 * Fangmire (difficulty 3,4,4,4,4). Up the causeway from Stilthaven you meet Asp in the pit-yard,
 * Brine among the vats with her dose-book, Ooze wading at the fen's edge, Vipra before the
 * Milking Shed's moulting racks and Sibila playing in the Charmers' Square.
 */

export const FANG_GIMMICKS: GimmickDef[] = [SNAKE_PIT, THE_MARK, FEN_GAS, SHED_SKIN, CHARMERS_PIPE];

const COINS = 90;

export const FANG_ENCOUNTERS: EncounterDef[] = [
  {
    id: 'fang-snake-pit',
    court: 'fang',
    name: 'Snake Pit',
    foeName: 'Pitkeeper Asp',
    foeElement: 'hunt',
    difficulty: 3,
    gimmick: 'fang-snake-pit',
    at: { x: 600, y: 540 },
    look: { body: 0xb89a74, accent: 0x6e6a3a, hat: 'snake', traits: ['tool', 'bandage', 'satchel'], size: 1.05, eye: 0xf2d232 },
    challenge: [
      'Mind your feet. That\'s Bess you nearly trod on, and Bess does not forgive. None of them do.',
      'Four hundred head of serpent in this yard and I\'ve named every one. They\'re worth more than you are.',
      'Walk about all you like. They\'ll tell me where you are. Loudly.',
    ],
    beaten: [
      'You threw Bess at me. You THREW Bess. …She liked it, I think. She\'s never been thrown.',
      'Go on. Step wide of the long grass on your way out.',
    ],
    coins: COINS,
  },
  {
    id: 'fang-the-mark',
    court: 'fang',
    name: 'The Mark',
    foeName: 'Dosekeeper Brine',
    foeElement: 'life',
    difficulty: 4,
    gimmick: 'fang-the-mark',
    at: { x: 1960, y: 730 },
    look: { body: 0xd0b8a4, accent: 0x6a3a6e, hat: 'plague', traits: ['book', 'glasses', 'satchel'], size: 0.95, eye: 0x9ee6e0 },
    challenge: [
      'Wrist, please. Two scars, nice and neat. You\'re Marked like the rest of us, I see — somewhere, long ago.',
      'I keep the book. A tick for every dose. One vial at a time, and the book decides who drinks it.',
      'Today the book is open, and I am the only one writing in it.',
    ],
    beaten: [
      'You drank first. Nobody drinks before the book says. I… I shall have to make a new column.',
      'Take the dose you won. I won\'t write it down.',
    ],
    coins: COINS,
  },
  {
    id: 'fang-fen-gas',
    court: 'fang',
    name: 'Fen Gas',
    foeName: 'Bogman Ooze',
    foeElement: 'earth',
    difficulty: 4,
    hpMult: 1.05,
    gimmick: 'fang-fen-gas',
    at: { x: 880, y: 1330 },
    look: { body: 0x7a7a52, accent: 0x3b3222, hat: 'souwester', traits: ['beard', 'tool', 'pack'], size: 1.3, eye: 0xb4e83c },
    challenge: [
      'Forty year I\'ve dug peat on this fen for the vats\' fires. Forty year breathing her.',
      'Don\'t smell it any more. Don\'t smell much at all. Lost the knack of coughing round about year nine.',
      'You\'ll cough. Hear that bubble? She\'s about to say hello.',
    ],
    beaten: [
      'You popped her right in my face. Fair. I deserved that. She\'s a fair old fen.',
      'Walk upwind, stranger. Always upwind.',
    ],
    coins: COINS,
  },
  {
    id: 'fang-shed-skin',
    court: 'fang',
    name: 'Shed Skin',
    foeName: 'Sloughmother Vipra',
    foeElement: 'illusion',
    difficulty: 4,
    gimmick: 'fang-shed-skin',
    at: { x: 1960, y: 1340 },
    look: { body: 0xd8d4b8, accent: 0x4d7a3a, hat: 'veil', traits: ['scarf', 'mask', 'satchel'], size: 1.0, eye: 0xe0f0a0 },
    challenge: [
      'Every serpent in the shed sheds for the Tithe. Every skin goes north, rolled and counted. I count them.',
      'You learn, in the moulting racks, that a skin is just a person you have finished with.',
      'Hit me, if you can find which of me is in.',
    ],
    beaten: [
      'Oh. You found the one with me in it. Nobody has found that one in years.',
      'Leave the old skins where they fall. Somebody always comes for them.',
    ],
    coins: COINS,
  },
  {
    id: 'fang-charmers-pipe',
    court: 'fang',
    name: 'Charmer\'s Pipe',
    foeName: 'Charmer Sibila',
    foeElement: 'sound',
    difficulty: 4,
    gimmick: 'fang-charmers-pipe',
    at: { x: 1330, y: 960 },
    look: { body: 0xc89a6a, accent: 0xd8b45a, hat: 'snake', traits: ['pipe', 'scarf'], size: 0.95, eye: 0xf2d232 },
    challenge: [
      'Shh. Hear her? Old Velvet. She\'s been in the basket since my grandmother played the square.',
      'She doesn\'t hear the tune. She watches the pipe. When the pipe stops, she looks for the nearest face.',
      'Stand close, stranger. I\'ll play you something pretty.',
    ],
    beaten: [
      'You took my mat. My own mat, in my own square. Velvet spat at me. She has never spat at me.',
      'Well. She liked your playing better. Go on, before she makes up her mind about you.',
    ],
    coins: COINS,
  },
];
