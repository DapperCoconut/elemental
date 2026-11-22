import type { EncounterDef, GimmickDef } from '../../../../IslesTypes';
import { DOUBLE_SLIT } from './gimmicks/doubleSlit';
import { ENTANGLEMENT } from './gimmicks/entanglement';
import { OBSERVER_EFFECT } from './gimmicks/observerEffect';
import { SCHRODINGERS_BOX } from './gimmicks/schrodingersBox';
import { TUNNELLING } from './gimmicks/tunnelling';

/**
 * The Superposition Court's five champions — Prince Both's keepers of the undecided. Tier 4 of
 * Voltreach (difficulty 4,5,5,5,5). Up through the Double-Slit Gate you meet Young by the fringes,
 * Felis among the stacks of the Box Yard, Heisen on the Watched Street, the Bells between the Twin
 * Squares, and Wick in the flicker-fenced yard below the House of Both.
 */

export const SUPERPOSITION_GIMMICKS: GimmickDef[] = [SCHRODINGERS_BOX, DOUBLE_SLIT, OBSERVER_EFFECT, ENTANGLEMENT, TUNNELLING];

const COINS = 115;

export const SUPERPOSITION_ENCOUNTERS: EncounterDef[] = [
  {
    id: 'superposition-box',
    court: 'superposition',
    name: 'Schrödinger\'s Box',
    foeName: 'Keeper Felis',
    foeElement: 'illusion',
    difficulty: 4,
    gimmick: 'superposition-box',
    at: { x: 520, y: 880 },
    look: { body: 0xd8c8b0, accent: 0x9a6cff, hat: 'tophat', traits: ['satchel', 'glasses', 'scarf'], size: 1, eye: 0xf2b85a },
    challenge: [
      'Every box in this yard is undecided. That is what the Grid boxes: anything that has not chosen yet.',
      'Candles. Letters. A child\'s cat, once. I keep them sealed. Sealed, they are still everything they could be.',
      'Open one if you like. But open it where I can see, and I promise you it will be the worse thing.',
    ],
    beaten: [
      'You opened them behind my back. Every one. That is cheating, and also exactly how it works.',
      'Take whatever you found. I never knew what was in them either.',
    ],
    coins: COINS,
  },
  {
    id: 'superposition-slit',
    court: 'superposition',
    name: 'Double Slit',
    foeName: 'Experimenter Young',
    foeElement: 'light',
    difficulty: 5,
    gimmick: 'superposition-slit',
    at: { x: 1460, y: 1370 },
    look: { body: 0xe0d4c0, accent: 0xcfa94e, hat: 'goggles', traits: ['glasses', 'book', 'tool'], size: 0.95, eye: 0xdff4ff },
    challenge: [
      'One light, two slits, and the light goes through both. Every night. I have checked four thousand times.',
      'The Grid uses my gate to read the Draw: bright band, paid; dark band, short. It is very elegant.',
      'Stand on your side of the wall. I will run the experiment again. You are, I am afraid, the screen.',
    ],
    beaten: [
      'You walked the dark bands. And then you came through the slit. Nobody comes through the slit.',
      'Four thousand and one. The result was different. I shall have to write that down.',
    ],
    coins: COINS,
  },
  {
    id: 'superposition-observer',
    court: 'superposition',
    name: 'Observer Effect',
    foeName: 'Watcher Heisen',
    foeElement: 'psychic',
    difficulty: 5,
    gimmick: 'superposition-observer',
    at: { x: 720, y: 540 },
    look: { body: 0xc8c0d0, accent: 0x45297e, hat: 'hood', traits: ['glasses', 'cane', 'mask'], size: 1.05, eye: 0xd2c0ff },
    challenge: [
      'This street is only here because I watch it. Look away for too long and the houses forget which they are.',
      'There are things in this town that only exist where nobody is looking. They are always behind you.',
      'I will keep my eyes on you. You will have to keep your eyes on everything else.',
    ],
    beaten: [
      'I blinked. Forty years without blinking on this street, and you made me blink.',
      'Go on. I shall be looking the other way. Deliberately, for once.',
    ],
    coins: COINS,
  },
  {
    id: 'superposition-entangle',
    court: 'superposition',
    name: 'Entanglement',
    foeName: 'The Twins Bell',
    foeElement: 'echo',
    difficulty: 5,
    gimmick: 'superposition-entangle',
    at: { x: 1860, y: 1240 },
    look: { body: 0xd8bca8, accent: 0xc0703a, hat: 'bandana', traits: ['scarf', 'apron'], size: 0.9, eye: 0x7af0ff },
    challenge: [
      'We are the Bells. Two of us — one of us — it depends who is asking. Ring one and the other rings.',
      'The squares are laid the same, stone for stone. Stand on one and you are on the other. We mean it.',
      'Hurt us and you hurt yourself. Hurt yourself and — well. We shall share. We always share.',
    ],
    beaten: [
      'You stepped off. Nobody steps off. Our mother never forgave us for it, and she was entangled too.',
      'Ring the bell on your way out. One of us will hear it. Both of us will.',
    ],
    coins: COINS,
  },
  {
    id: 'superposition-tunnel',
    court: 'superposition',
    name: 'Tunnelling',
    foeName: 'Phase-Walker Wick',
    foeElement: 'subterfuge',
    difficulty: 5,
    hpMult: 1.05,
    gimmick: 'superposition-tunnel',
    at: { x: 2120, y: 740 },
    look: { body: 0xb0b8c8, accent: 0x3fd8e8, hat: 'antenna', traits: ['mask', 'pack', 'tool'], size: 1, eye: 0xb4f6ff },
    challenge: [
      'A wall is only a likelihood, friend. Most of the time it is there. Some of the time, it is a door.',
      'I collect from the switched-off houses. Their locks are cut, but I still come in through the wall. Style.',
      'Mind the fences. When they thin, so do I.',
    ],
    beaten: [
      'You were waiting on the far side. That\'s my trick. Where did you learn my trick?',
      'Fine. I\'ll use doors for a while. Doors are so certain.',
    ],
    coins: COINS,
  },
];
