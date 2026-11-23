import type { EncounterDef, GimmickDef } from '../../../../IslesTypes';
import { DEJA_VU } from './gimmicks/dejaVu';
import { FORGET_ME_NOT } from './gimmicks/forgetMeNot';
import { LETHE_GIMMICK } from './gimmicks/lethe';
import { PAWNED_MEMORIES } from './gimmicks/pawnedMemories';
import { PORTRAIT_GALLERY } from './gimmicks/portraitGallery';

/**
 * The Remembrance Court's five champions — the trades that keep Prince Hindsight's pledges.
 * Tier 3 of Lotterhaven (difficulty 4,5,5,5,5). In from the Card Court you meet Hock on Pawn Row,
 * Likeness before the Portrait Gallery, Myosotis in the forget-me-not fields, Again at the Ledger
 * Office, and Oblivion at the ferry landing on the Lethe.
 */

export const REMEMBRANCE_GIMMICKS: GimmickDef[] = [PAWNED_MEMORIES, FORGET_ME_NOT, PORTRAIT_GALLERY, DEJA_VU, LETHE_GIMMICK];

const COINS = 120;

export const REMEMBRANCE_ENCOUNTERS: EncounterDef[] = [
  {
    id: 'remembrance-pawned-memories',
    court: 'remembrance',
    name: 'Pawned Memories',
    foeName: 'Pawnbroker Hock',
    foeElement: 'gum',
    difficulty: 4,
    gimmick: 'remembrance-pawned-memories',
    at: { x: 900, y: 850 },
    look: { body: 0xd8b494, accent: 0xd2a448, hat: 'tophat', traits: ['glasses', 'satchel', 'pipe'], size: 1.2, eye: 0xf6b84a },
    challenge: [
      'Number for the pledge? No? A customer, then. Everything in my window was somebody\'s sweetest day.',
      'I keep them sugared. A memory goes sour in the bottle if you don\'t. First kiss, first snow. Lovely stock.',
      'Every blow we trade I\'ll bottle, friend. And I know which shelf yours are on.',
    ],
    beaten: [
      'Broken stock. All of it. Do you know what a shelf of broken memories smells like? Toffee and rain.',
      'Go on. I\'ll sweep up. I always sweep up.',
    ],
    coins: COINS,
  },
  {
    id: 'remembrance-forget-me-not',
    court: 'remembrance',
    name: 'Forget-Me-Not',
    foeName: 'Florist Myosotis',
    foeElement: 'growth',
    difficulty: 5,
    gimmick: 'remembrance-forget-me-not',
    at: { x: 600, y: 1252 },
    look: { body: 0xe4ccb0, accent: 0x5a8ee0, hat: 'wreath', traits: ['apron', 'tool'], size: 0.95, eye: 0x9cc4ff },
    challenge: [
      'People walk in my fields to keep hold of things. They tread the beds flat doing it. I grow them back.',
      'The Prince pays me to. Blue fields make people feel they\'ve kept something. So they give the rest.',
      'Stand in the blue if you like. I\'ll come and stand there with you.',
    ],
    beaten: [
      'Trampled. All my beds. You know, they come back bluer when they\'ve been walked on. Nobody believes me.',
      'Keep one. Put it in your buttonhole. Go on.',
    ],
    coins: COINS,
  },
  {
    id: 'remembrance-portrait-gallery',
    court: 'remembrance',
    name: 'Portrait Gallery',
    foeName: 'Curator Likeness',
    foeElement: 'chalk',
    difficulty: 5,
    gimmick: 'remembrance-portrait-gallery',
    at: { x: 520, y: 540 },
    look: { body: 0xe8d8c0, accent: 0x8a5a7a, hat: 'veil', traits: ['book', 'glasses', 'cane'], size: 1.05, eye: 0xd8a8c4 },
    challenge: [
      'The gallery hangs a portrait of everyone in the court. When a face is pawned, its frame goes blank.',
      'I chalk them over, the blanks, so the wall looks tidy. Grey on grey. You can\'t tell, from the door.',
      'Sit for me. I\'ll paint you very well. And then you will have to watch yourself fight.',
    ],
    beaten: [
      'You painted better than me. Rude. Accurate, but rude.',
      'I shall have to hang you. Somewhere near the door, where people look.',
    ],
    coins: COINS,
  },
  {
    id: 'remembrance-deja-vu',
    court: 'remembrance',
    name: 'Déjà Vu',
    foeName: 'Archivist Again',
    foeElement: 'paper',
    difficulty: 5,
    gimmick: 'remembrance-deja-vu',
    at: { x: 1950, y: 620 },
    look: { body: 0xd0bca0, accent: 0x7a6246, hat: 'nightcap', traits: ['book', 'glasses', 'satchel'], size: 1, eye: 0xe8c890 },
    challenge: [
      'Haven\'t we done this? We have. Twice. I filed it. You lost the first time and the second.',
      'Everything you throw, I write down — where you stood, which way it went. The Archive keeps it all.',
      'And the Archive gives it back, now and then. You\'ll see. You\'ll have seen.',
    ],
    beaten: [
      'That isn\'t in the file. That\'s not how it went. I shall have to write it again. In ink this time.',
      'Go on. I\'ll remember this. One of us should.',
    ],
    coins: COINS,
  },
  {
    id: 'remembrance-lethe',
    court: 'remembrance',
    name: 'Lethe',
    foeName: 'Ferryman Oblivion',
    foeElement: 'water',
    difficulty: 5,
    hpMult: 1.05,
    gimmick: 'remembrance-lethe',
    at: { x: 1930, y: 1290 },
    look: { body: 0xc8c4b8, accent: 0x9fb4b2, hat: 'hood', traits: ['lantern', 'rod', 'beard'], size: 1.3, eye: 0xf2f8f4 },
    challenge: [
      'Lapsed bottles come down to me in crates. I pour them in. The water doesn\'t mind what. Nor do I.',
      'Wade in, if you\'re hurt. It closes a wound like a mother. It takes the last thing you did, like a thief.',
      'I\'ve drunk from it every day for thirty years. I don\'t remember why I started. That\'s the beauty.',
    ],
    beaten: [
      '…I remember. I had a brother. He rowed this punt before me. Haven\'t thought of him in thirty years.',
      'Leave me be a while, stranger. I want to keep this one.',
    ],
    coins: COINS,
  },
];
