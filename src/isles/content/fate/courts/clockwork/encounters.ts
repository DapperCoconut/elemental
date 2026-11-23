import type { EncounterDef, GimmickDef } from '../../../../IslesTypes';
import { COGWORK } from './gimmicks/cogwork';
import { CUCKOO } from './gimmicks/cuckoo';
import { HOURGLASS } from './gimmicks/hourglass';
import { PENDULUM } from './gimmicks/pendulum';
import { REWIND } from './gimmicks/rewind';

/**
 * The Clockwork Court's five champions — the craftsmen who keep Prince Tock's hill ticking. Tier 2
 * of Lotterhaven (difficulty 4,4,5,5,5). In from the Card Court road you meet Reprise in the Hour
 * Square, Ratchet in the Works, Bob on the road under the pendulum gantries, Grain among the
 * hourglass wells and Chirp on Cuckoo Row.
 */

export const CLOCKWORK_GIMMICKS: GimmickDef[] = [PENDULUM, COGWORK, CUCKOO, HOURGLASS, REWIND];

const COINS = 110;

export const CLOCKWORK_ENCOUNTERS: EncounterDef[] = [
  {
    id: 'clockwork-pendulum',
    court: 'clockwork',
    name: 'Pendulum',
    foeName: 'Swinger Bob',
    foeElement: 'gravity',
    difficulty: 4,
    gimmick: 'clockwork-pendulum',
    at: { x: 520, y: 750 },
    look: { body: 0xc8a888, accent: 0x4a4e56, hat: 'helmet', traits: ['tool', 'beard'], size: 1.3, eye: 0xf0d58a },
    challenge: [
      'Thirty year I\'ve kept them bobs swinging. The hill\'s time hangs off \'em. Stop one and the Draw runs late.',
      'A late Draw\'s an extra hour off every Lot on the isle. So nobody stops \'em. Nobody.',
      'Come stand in the groove, friend. I\'ll show you what a pound of brass does at the bottom of its swing.',
    ],
    beaten: [
      'You rode the bob. Nobody rides the bob. I\'ll have to put that in the log.',
      'Mind the bridge on your way. They\'re still swinging. They always are.',
    ],
    coins: COINS,
  },
  {
    id: 'clockwork-cogwork',
    court: 'clockwork',
    name: 'Cogwork Floor',
    foeName: 'Fitter Ratchet',
    foeElement: 'technology',
    difficulty: 4,
    gimmick: 'clockwork-cogwork',
    at: { x: 560, y: 466 },
    look: { body: 0xd0b498, accent: 0xb8693a, hat: 'goggles', traits: ['tool', 'apron', 'glasses'], size: 1.05, eye: 0x8aa4f0 },
    challenge: [
      'Mind your feet. This floor is the Works\' own escapement. It doesn\'t stop for visitors, or for me.',
      'Every wheel you\'re standing on winds an hour out of somebody in the queue. I fit them. I don\'t ask whose.',
      'Read the teeth, stranger. Red is where they bite. I\'ll be turning them on you.',
    ],
    beaten: [
      'You reversed my train. I\'ve never seen a customer reverse a train. I\'ll need a new pawl.',
      'Go on. And — if you\'re going up to the Regulator — tell him the teeth are worn. He never listens to me.',
    ],
    coins: COINS,
  },
  {
    id: 'clockwork-cuckoo',
    court: 'clockwork',
    name: 'Cuckoo',
    foeName: 'Cuckoo-Keeper Chirp',
    foeElement: 'gluttony',
    difficulty: 5,
    gimmick: 'clockwork-cuckoo',
    at: { x: 1800, y: 1400 },
    look: { body: 0xe2c0a0, accent: 0xc43a32, hat: 'beanie', traits: ['apron', 'satchel'], size: 1.25, eye: 0xffd040 },
    challenge: [
      'Every bird on the Row is mine. I feed them, I wind them, and when a house runs slow, I set them on it.',
      'Cuckoos lay in other birds\' nests, did you know? Takes what\'s not hers and gets fat. Sensible bird.',
      'Mine\'s hungry. The hour-hand\'s pointing at you, dear. Whatever will you do?',
    ],
    beaten: [
      'You turned my hand on me. On ME. My own bird pecked me. She\'s never forgiven me for anything.',
      'Fine. The Row can run slow a week. Nobody tell the Hour Office.',
    ],
    coins: COINS,
  },
  {
    id: 'clockwork-hourglass',
    court: 'clockwork',
    name: 'Hourglass',
    foeName: 'Sandman Grain',
    foeElement: 'dune',
    difficulty: 5,
    gimmick: 'clockwork-hourglass',
    at: { x: 520, y: 1200 },
    look: { body: 0xb88e68, accent: 0xe6c88a, hat: 'headwrap', traits: ['scarf', 'lantern'], size: 1.1, eye: 0xfae4b0 },
    challenge: [
      'I come from a dune. A whole dune, out past the Breakwater. The Prince bought it by the grain for his glasses.',
      'Every hour paid in this court is poured through my wells. Sand remembers being a desert. I remember for it.',
      'The glass is running. Stand in the sand and your time runs quick. Stand in mine and it runs out.',
    ],
    beaten: [
      'You read the turn before I did. I\'ve stood beside these glasses twenty years and you read it first.',
      'Go on. The sand will settle. It always does, in the end.',
    ],
    coins: COINS,
  },
  {
    id: 'clockwork-rewind',
    court: 'clockwork',
    name: 'Rewind',
    foeName: 'Horologist Reprise',
    foeElement: 'echo',
    difficulty: 5,
    hpMult: 1.05,
    gimmick: 'clockwork-rewind',
    at: { x: 1060, y: 880 },
    look: { body: 0xd8c4ac, accent: 0x3e5ec8, hat: 'tophat', traits: ['glasses', 'cane', 'book'], size: 1, eye: 0xb8c8ff },
    challenge: [
      'I set the great clock. Every Draw I wind back three seconds — the three in which the Prince\'s Lot is called.',
      'Nobody ever hears it called. That is what a good horologist is for.',
      'You may have heard me before. You will hear me again. Shall we begin? We already have.',
    ],
    beaten: [
      'You stepped where you\'d been and through where I was. Elegant. I may wind that back and watch it twice.',
      'Three seconds. I wonder who else\'s I have wound away. Go — before I start again.',
    ],
    coins: COINS,
  },
];
