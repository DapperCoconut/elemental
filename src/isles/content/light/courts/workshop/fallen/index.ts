import type { EncounterDef, FallenBundle } from '../../../../../IslesTypes';
import { fallenId } from '../../../../meteor/spec';
import { BLUEPRINT_DARK, BRASS, COPPER, IRON_LIT, SOOT } from '../palette';
import { KEEN_EDGE } from './keenEdge';
import { KICKBACK } from './kickback';
import { EMBER_EYE } from './kit';
import { PINCH } from './pinch';
import { PRECESSION } from './precession';
import { SEIZURE } from './seizure';

/**
 * The Workshop's Fallen Five — artificers whom the King's telling puts on the Noon's side: the
 * grind-master who edged the Guard's halberds, the instrument-maker whose gyroscope keeps the
 * Magnum Opus upright, the patent examiner who seized every unwatched plan, the fitter who runs
 * the yard's air, and the springwright who proved his harnesses on men. They stand only inside
 * the Fall.
 */

const COURT = 'workshop';
const COINS = 260;

const encounters: EncounterDef[] = [
  {
    id: fallenId(COURT, 'keen-edge'), court: COURT, gimmick: fallenId(COURT, 'keen-edge'),
    name: 'Keen Edge',
    foeName: 'Grind-Master Swithin Rasp', foeElement: 'conquest', difficulty: 4, hpMult: 1.1,
    at: { x: 1000, y: 880 },
    look: { body: 0xc8a688, accent: IRON_LIT, hat: 'cap', traits: ['apron', 'tool', 'beard'], size: 1.15, eye: EMBER_EYE },
    challenge: [
      'Grinding hall, bench one. I set the edge on every halberd the Noon Guard carries. Keen as the light.',
      'A blunt blade is a lie, stranger. It pretends to be a weapon. Every blow you land, I hear you lying.',
      'Mind the wheels. Sparks go out the far side. They always go out the far side. Ask my grinders.',
    ],
    beaten: [
      'Halberds... no. I ground glass. Mirror blanks, eight hours a day, and went home with my hands raw.',
      'I never edged a blade for the Guard. I hid the grinders\' children under the hall. Didn\'t I?',
    ],
    coins: COINS,
  },
  {
    id: fallenId(COURT, 'precession'), court: COURT, gimmick: fallenId(COURT, 'precession'),
    name: 'Precession',
    foeName: 'Instrument-Maker Delphine Gimbal', foeElement: 'pressure', difficulty: 4, hpMult: 1.1,
    at: { x: 1250, y: 1020 },
    look: { body: 0xe0c8ac, accent: BRASS, hat: 'goggles', traits: ['glasses', 'satchel', 'tool'], size: 0.95, eye: EMBER_EYE },
    challenge: [
      'My gyroscope keeps the Magnum Opus upright. Strike it and it will not go where you push. It goes sideways.',
      'That is not a trick. That is a law. Laws are the one thing the Prince and I agree on.',
      'Watch the arrows on the rotor. Or don\'t. It will find you either way, a quarter-turn late.',
    ],
    beaten: [
      'Upright... I built it as a spinning top. A toy, for the boy at the stall. The Prince took my drawings.',
      'A quarter-turn late. That\'s how I feel. As if I\'ve been turning sideways from something for years.',
    ],
    coins: COINS,
  },
  {
    id: fallenId(COURT, 'seizure'), court: COURT, gimmick: fallenId(COURT, 'seizure'),
    name: 'Writ of Seizure',
    foeName: 'Examiner Tybalt Caveat', foeElement: 'bind', difficulty: 5, hpMult: 1.2,
    at: { x: 300, y: 1080 },
    look: { body: 0xe4d4c0, accent: BLUEPRINT_DARK, hat: 'tophat', traits: ['book', 'glasses', 'cane'], size: 1.05, eye: EMBER_EYE },
    challenge: [
      'Patent Office, Examiner of Claims. A plan unwatched is a plan made in the dark. The Office keeps it.',
      'My bailiffs are wound and sealed. They go to whichever plan its maker can\'t be bothered to stand by.',
      'Stand by yours, then. Stand by it all day, in the sun, where the Office can watch you do it.',
    ],
    beaten: [
      'Seized... I stamped them REFUSED. Then I copied them out by night and posted them back, unsigned.',
      'Every plan I ever took, I gave back. I\'m almost sure. Ask Hesper Vane. She\'ll remember it for me.',
    ],
    coins: COINS,
  },
  {
    id: fallenId(COURT, 'pinch'), court: COURT, gimmick: fallenId(COURT, 'pinch'),
    name: 'Pinched Line',
    foeName: 'Hose-Fitter Keturah Spigot', foeElement: 'air', difficulty: 5, hpMult: 1.2,
    at: { x: 2250, y: 1450 },
    look: { body: 0xd0ac8c, accent: SOOT, hat: 'bandana', traits: ['tool', 'apron', 'scarf'], size: 1, eye: EMBER_EYE },
    challenge: [
      'I run the air lines. Three hoses off the receiver, and every tool in the yard breathes through me.',
      'Step on a hose if you like. The air waits behind your boot. It doesn\'t wait forever.',
      'When it goes, it goes all at once. I\'ve buried two fitters who thought they knew how long.',
    ],
    beaten: [
      'Buried... no. I patched them. Every burst line in this yard, I patched, and nobody got hurt.',
      'I ran a hose of cool air to the Dusk-house queue, in the heat. That was me. Wasn\'t it?',
    ],
    coins: COINS,
  },
  {
    id: fallenId(COURT, 'kickback'), court: COURT, gimmick: fallenId(COURT, 'kickback'),
    name: 'Kickback',
    foeName: 'Springwright Mungo Tamp', foeElement: 'rubber', difficulty: 5, hpMult: 1.25,
    at: { x: 2300, y: 680 },
    look: { body: 0xb89a7c, accent: COPPER, hat: 'helmet', traits: ['pack', 'bandage', 'tool'], size: 1.25, eye: EMBER_EYE },
    challenge: [
      'Proof deck. Every spring the Magnum Opus wears was proved here, in a harness, at full kick.',
      'Throw a punch and the harness throws you back. Aim careless and you\'ll be fishing in the quench.',
      'Four hundred springs I\'ve proved, and never once gone in the water. Shall we see about you?',
    ],
    beaten: [
      'Proved on men... on sandbags. Always sandbags. I\'d never strap a man in. I wouldn\'t.',
      'Wet. Why am I wet? Never mind. Give me a hand up — the deck\'s still bucking.',
    ],
    coins: COINS,
  },
];

export const FALLEN: FallenBundle = {
  encounters,
  gimmicks: [KEEN_EDGE, PRECESSION, SEIZURE, PINCH, KICKBACK],
};
