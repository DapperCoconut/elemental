import type { EncounterDef, GimmickDef } from '../../../../IslesTypes';
import { BURNING_GLASS } from './gimmicks/burningGlass';
import { HIGH_NOON } from './gimmicks/highNoon';
import { AWNINGS } from './gimmicks/awnings';
import { HELIOGRAPH } from './gimmicks/heliograph';
import { SUN_DOGS } from './gimmicks/sunDogs';

/**
 * The Noon Court's five champions — the officers who keep Prince Lumen's square bright. Tier 1 of
 * Solmara (difficulty 4,4,5,5,5). Up the Sun Road from Meridian Quay you meet Kindler under the
 * Burning Glass, Glint by the noon bell, Pale at the Dusk-house, Flash on the signal terrace and
 * Parhelia on the sun-temple steps.
 */

export const NOON_GIMMICKS: GimmickDef[] = [BURNING_GLASS, HIGH_NOON, AWNINGS, HELIOGRAPH, SUN_DOGS];

const COINS = 110;

export const NOON_ENCOUNTERS: EncounterDef[] = [
  {
    id: 'noon-burning-glass',
    court: 'noon',
    name: 'Burning Glass',
    foeName: 'Lensman Kindler',
    foeElement: 'fire',
    difficulty: 4,
    gimmick: 'noon-burning-glass',
    at: { x: 800, y: 730 },
    look: { body: 0xd8b088, accent: 0x34323a, hat: 'goggles', traits: ['apron', 'tool', 'brand'], size: 1.15, eye: 0xffe17a },
    challenge: [
      'I grind the focus every morning. Every morning that isn\'t. A hair off and it only browns them.',
      'The Glass doesn\'t hate anybody, stranger. It just likes things that keep still. Most people keep still.',
      'You\'re standing in my line. Either queue, or dance.',
    ],
    beaten: [
      'You never once stood still. The Glass hasn\'t got a word for that. Neither have I.',
      'Go on. I\'ve the trunnions to grease. And I won\'t be in any hurry.',
    ],
    coins: COINS,
  },
  {
    id: 'noon-high-noon',
    court: 'noon',
    name: 'High Noon',
    foeName: 'Deputy Glint',
    foeElement: 'metal',
    difficulty: 4,
    gimmick: 'noon-high-noon',
    at: { x: 1320, y: 1440 },
    look: { body: 0xc8a888, accent: 0xc89a3e, hat: 'straw', traits: ['scarf', 'eyepatch'], size: 1.05, eye: 0xd8dade },
    challenge: [
      'Every twelve seconds that bell rings noon. It\'s always noon. The bell just likes reminding us.',
      'Quarrels on this square are settled on the bell, friend. Hold your fire, wait for the call, then draw.',
      'I\'ve never lost a draw. I\'ve jumped a few. Nobody counts those but me.',
    ],
    beaten: [
      'You let me jump. You stood there with your hands still and let me jump. Mean. Good, but mean.',
      'Bell\'ll go again in a minute. It always does. Mind yourself.',
    ],
    coins: COINS,
  },
  {
    id: 'noon-awnings',
    court: 'noon',
    name: 'Awnings',
    foeName: 'Shade-Warden Pale',
    foeElement: 'shadow',
    difficulty: 5,
    gimmick: 'noon-awnings',
    at: { x: 650, y: 1090 },
    look: { body: 0xe4e0d8, accent: 0x1e1c2a, hat: 'tophat', traits: ['book', 'cane'], size: 1.1, eye: 0x9ec8dc },
    challenge: [
      'Shade is licensed, stranger. Three awnings on this square, and I say who stands under them.',
      'I was born in the Dusk-house queue. My mother had the hour. I came out in the dark. Last child that did.',
      'Out in the sun you\'ll go pink, then red, then white. Under the canvas you\'re mine.',
    ],
    beaten: [
      'You pulled the pole on me. On ME. Under my own canvas. I\'ll write myself a fine.',
      'Keep the shade. You earned an hour of it. That\'s more than most.',
    ],
    coins: COINS,
  },
  {
    id: 'noon-heliograph',
    court: 'noon',
    name: 'Heliograph',
    foeName: 'Signaller Flash',
    foeElement: 'electricity',
    difficulty: 5,
    gimmick: 'noon-heliograph',
    at: { x: 2050, y: 960 },
    look: { body: 0xd4b496, accent: 0x8fb8cc, hat: 'cap', traits: ['glasses', 'satchel', 'tool'], size: 0.95, eye: 0xdcf2fb },
    challenge: [
      'Dot dash dot. That\'s "stranger". Dash dot dash dash. That\'s "on the terrace". The summit already knows.',
      'Six posts, six mirrors, and the sun never moves, so I never have to re-sight. Best job on Solmara.',
      'Cross a live link and you\'ll see spots for a week. Everybody does. I see them all the time.',
    ],
    beaten: [
      'You turned my mirrors. Nobody turns my mirrors. I\'ll have to send that up. "Mirrors turned." Oh dear.',
      'Go on. I\'ll signal it slowly. Very slowly. With a lot of dots.',
    ],
    coins: COINS,
  },
  {
    id: 'noon-sun-dogs',
    court: 'noon',
    name: 'Sun Dogs',
    foeName: 'Sun-Priest Parhelia',
    foeElement: 'air',
    difficulty: 5,
    hpMult: 1.05,
    gimmick: 'noon-sun-dogs',
    at: { x: 520, y: 450 },
    look: { body: 0xecdcc4, accent: 0xe4b032, hat: 'mitre', traits: ['book', 'scarf'], size: 1.05, eye: 0xfff3c0 },
    challenge: [
      'The Despot is the sun. The sun has two hounds. I keep them. They are fed on light and they are always hungry.',
      'There was haze, once, and you could see them in the sky beside him. Now I bring them down instead.',
      'They will look at whoever they face. Do try not to face them.',
    ],
    beaten: [
      'You put me in their eye. My own hounds. They didn\'t even hesitate. Good dogs.',
      'There was haze once. I remember haze. Go on, before I remember anything else.',
    ],
    coins: COINS,
  },
];
