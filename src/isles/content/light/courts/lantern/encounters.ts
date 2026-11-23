import type { EncounterDef, GimmickDef } from '../../../../IslesTypes';
import { ASTRAL_PROJECTION } from './gimmicks/astralProjection';
import { LANTERN_LAKE } from './gimmicks/lanternLake';
import { SOUL_THREAD } from './gimmicks/soulThread';
import { WEIGHING } from './gimmicks/weighing';
import { WICK_TRIMMING } from './gimmicks/wickTrimming';

/**
 * The Lantern Court's five champions — the trades of the gorge, each serving the Lamplighter's law
 * that no soul shall lie in the dark. Tier 2 of Solmara (difficulty 5 across the board). Down the
 * Lantern Stair you meet Glimmer at the boat landing on the lake, Snuff in his Wick Yard, Séance in
 * her glass parlour, Tether at the Thread-walk capstan and Feather on the ledge of the great scale.
 */

export const LANTERN_GIMMICKS: GimmickDef[] = [LANTERN_LAKE, WICK_TRIMMING, ASTRAL_PROJECTION, SOUL_THREAD, WEIGHING];

const COINS = 120;

export const LANTERN_ENCOUNTERS: EncounterDef[] = [
  {
    id: 'lantern-lantern-lake',
    court: 'lantern',
    name: 'Lantern Lake',
    foeName: 'Lantern-Diver Glimmer',
    foeElement: 'water',
    difficulty: 5,
    gimmick: 'lantern-lantern-lake',
    at: { x: 1010, y: 900 },
    look: { body: 0xc8d8dc, accent: 0x2f4a5c, hat: 'diving', traits: ['rod', 'satchel'], size: 1, eye: 0x9fd8ff },
    challenge: [
      'Boats tip. Lanterns sink. Somebody has to go down after them, and that somebody is me.',
      'Thirty years diving that lake. It\'s the only dark place in the gorge, the bottom. I never tell anyone.',
      'Into the shallows with you. First to the lanterns keeps them.',
    ],
    beaten: [
      'You came up with more souls than I did. Nobody comes up with more than me.',
      'Don\'t tell the Warden I like it down there. Go on.',
    ],
    coins: COINS,
  },
  {
    id: 'lantern-wick-trimming',
    court: 'lantern',
    name: 'Wick Trimming',
    foeName: 'Chandler Snuff',
    foeElement: 'wax',
    difficulty: 5,
    gimmick: 'lantern-wick-trimming',
    at: { x: 2040, y: 1340 },
    look: { body: 0xe8d8b4, accent: 0x7a5c22, hat: 'tophat', traits: ['apron', 'book', 'pipe'], size: 1.25, eye: 0xffc85a },
    challenge: [
      'Every candle in every lantern on every wire comes out of my vats. Every one. That\'s a lot of debtors.',
      'Pay for your wax, your mother stays lit. Don\'t, and I let the wick go. It\'s not cruelty. It\'s ledgers.',
      'Five lanterns in my yard. Let\'s see how many you can keep lit while I\'m pinching.',
    ],
    beaten: [
      'Gutters, wisps, and the yard full of wailing. Bad for business, that.',
      'I\'ll put it on somebody\'s account. Not yours. Go away.',
    ],
    coins: COINS,
  },
  {
    id: 'lantern-astral-projection',
    court: 'lantern',
    name: 'Astral Projection',
    foeName: 'Medium Séance',
    foeElement: 'dream',
    difficulty: 5,
    gimmick: 'lantern-astral-projection',
    at: { x: 560, y: 1320 },
    look: { body: 0xd8c8e4, accent: 0x7a62c4, hat: 'veil', traits: ['mask', 'book'], size: 1, eye: 0xd8c8ff },
    challenge: [
      'The souls on the wires talk, you know. Not to you. To me. They have such a lot to say about the light.',
      'I go out to them sometimes. Leave the body sitting. It\'s quite safe. Nobody ever touches it.',
      'Let me show you. Hold still. You\'ll hardly feel me pass.',
    ],
    beaten: [
      'You touched the body. Nobody touches the body. The cord nearly broke.',
      'The souls say you were rude. They also say thank you. Go.',
    ],
    coins: COINS,
  },
  {
    id: 'lantern-soul-thread',
    court: 'lantern',
    name: 'Soul-Thread',
    foeName: 'Binder Tether',
    foeElement: 'string',
    difficulty: 5,
    gimmick: 'lantern-soul-thread',
    at: { x: 1900, y: 490 },
    look: { body: 0xd4bca0, accent: 0x4a8fc4, hat: 'bandana', traits: ['tool', 'scarf', 'glasses'], size: 0.95, eye: 0xe4f5ff },
    challenge: [
      'I bind them to the wire. Soul-thread, spun from the last breath. It doesn\'t break. It just burns.',
      'Eleven thousand knots I\'ve tied up there. Not one lantern ever fell. Not one soul got away.',
      'Here. One round your wrist, one round mine. Now run.',
    ],
    beaten: [
      'You stayed close. That\'s the only way thread doesn\'t burn. Nobody ever stays close.',
      'Keep the knot. You cut it fairly.',
    ],
    coins: COINS,
  },
  {
    id: 'lantern-weighing',
    court: 'lantern',
    name: 'Weighing of Hearts',
    foeName: 'Psychopomp Feather',
    foeElement: 'air',
    difficulty: 5,
    gimmick: 'lantern-weighing',
    at: { x: 560, y: 400 },
    look: { body: 0xeee8dc, accent: 0xe8c25a, hat: 'plume', traits: ['cane', 'book'], size: 1.15, eye: 0xfff0b0 },
    challenge: [
      'Every soul that comes down the gorge stops at my scale. A heart on one pan, a feather on the other.',
      'Light hearts go to the good wires, over the lake. Heavy ones go to Wire Fourteen, by the yard. Mind you.',
      'Every blow you strike sits on your heart. Strike as many as you like. The scale is patient.',
    ],
    beaten: [
      'Lighter than I thought. Much lighter. It is the not striking that weighs least, you know.',
      'Wire Two for you, when it comes to it. Over the lake. Off you go.',
    ],
    coins: COINS,
  },
];
