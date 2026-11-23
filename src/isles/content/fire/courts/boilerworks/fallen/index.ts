import type { EncounterDef, FallenBundle } from '../../../../../IslesTypes';
import { fallenId } from '../../../../meteor/spec';
import { BUNK_COUNT } from './bunkCount';
import { FIREBOX } from './firebox';
import { HOT_RIVETS } from './hotRivets';
import { SCRAP_CRANE } from './scrapCrane';
import { THREE_MARKS } from './threeMarks';

/**
 * The Boilerworks' Fallen Five — the people of the yard whom the King's telling puts on the
 * company's side: the craneman who dropped scrap on the strike line, the rivet-boss who sealed the
 * bunkhouse, the clerk who wrote everyone up, the warden who counted the empty cots, and the stoker
 * who fed the unbranded to the Great Boiler. They stand only inside the Fall.
 */

const COURT = 'boilerworks';
const EMBER_EYE = 0xffa040;

const encounters: EncounterDef[] = [
  {
    id: fallenId(COURT, 'scrap-crane'), court: COURT, gimmick: fallenId(COURT, 'scrap-crane'),
    name: 'Scrap Crane',
    foeName: 'Craneman Ulric Hoist', foeElement: 'magnet', difficulty: 4, hpMult: 1.1,
    at: { x: 2300, y: 520 },
    look: { body: 0x9a7a62, accent: 0x3a3e44, hat: 'helmet', traits: ['tool', 'brand', 'scarf'], size: 1.2, eye: EMBER_EYE },
    challenge: [
      'Strike line stood right where you\'re standing. I had the cab. I had the magnet. I had my orders.',
      'Bales come down where I point them, friend. Today I point at you.',
      'Run if you like. The bridge rolls faster than a conscience.',
    ],
    beaten: [
      'The cab... I never had the cab. I swept under it. Twenty years I swept under it.',
      'Who dropped those bales, then? Not me. I don\'t think it was ever me.',
    ],
    coins: 80,
  },
  {
    id: fallenId(COURT, 'hot-rivets'), court: COURT, gimmick: fallenId(COURT, 'hot-rivets'),
    name: 'Hot Rivets',
    foeName: 'Rivet-Boss Clinker Hale', foeElement: 'fire', difficulty: 4, hpMult: 1.1,
    at: { x: 700, y: 850 },
    look: { body: 0x7a5a48, accent: 0x5a2a1a, hat: 'bandana', traits: ['apron', 'tool', 'brand'], size: 1.15, eye: EMBER_EYE },
    challenge: [
      'Night of the strike my crew riveted the bunkhouse doors. Prince said seal it. We sealed it tight.',
      'Catch what I throw you, stoker. Folk who drop a hot rivet don\'t hold anything else for long.',
      'Heads up. Every one of these is white.',
    ],
    beaten: [
      'Sealed the doors? No... we cut them. Cut them open with the cold chisels. I remember the hinges.',
      'My hands are burnt. They were always burnt. That was from the forge, wasn\'t it. Only the forge.',
    ],
    coins: 80,
  },
  {
    id: fallenId(COURT, 'three-marks'), court: COURT, gimmick: fallenId(COURT, 'three-marks'),
    name: 'Loitering Is Three Marks',
    foeName: 'Under-Clerk Silas Quill', foeElement: 'paper', difficulty: 4, hpMult: 1.15,
    at: { x: 2310, y: 1080 },
    look: { body: 0xd0b498, accent: 0x1c1c2a, hat: 'tophat', traits: ['book', 'glasses', 'brand'], size: 0.95, eye: EMBER_EYE },
    challenge: [
      'Bay Seven, ten past four, standing idle. One mark. I wrote you up before you reached the gate.',
      'Nothing personal. The book only wants names. Yours fits on one line.',
      'Keep moving if you like. The pen is quicker than your feet.',
    ],
    beaten: [
      'The book... I kept two books. One for the overseer. One with the names I left out.',
      'I left you out too. I think I left almost everyone out. Why did I remember it otherwise?',
    ],
    coins: 80,
  },
  {
    id: fallenId(COURT, 'bunk-count'), court: COURT, gimmick: fallenId(COURT, 'bunk-count'),
    name: 'Bunk Count',
    foeName: 'Warden Agathe Slatter', foeElement: 'dream', difficulty: 5, hpMult: 1.2,
    at: { x: 1450, y: 1480 },
    look: { body: 0xc89a7a, accent: 0x2a2a3a, hat: 'beanie', traits: ['lantern', 'apron', 'brand'], size: 1.05, eye: EMBER_EYE },
    challenge: [
      'Lights out, love. Every cot filled, every name counted. Empty cots go in the overseer\'s ear.',
      'Lie down and I\'ll sing you under. Stay up and my lantern will find you. It always finds them.',
      'Sweet dreams are company property too.',
    ],
    beaten: [
      'Counted them... yes. Counted them, then left the back gate on the latch and counted again after.',
      'Odd. I can hear Nan singing. It was always Nan singing. I only ever held the lamp for her.',
    ],
    coins: 80,
  },
  {
    id: fallenId(COURT, 'firebox'), court: COURT, gimmick: fallenId(COURT, 'firebox'),
    name: 'Into the Firebox',
    foeName: 'Stoker-Royal Abner Flue', foeElement: 'gravity', difficulty: 5, hpMult: 1.25,
    at: { x: 250, y: 470 },
    look: { body: 0x6a4e3e, accent: 0x1a1412, hat: 'cap', traits: ['beard', 'bandage', 'brand'], size: 1.35, eye: EMBER_EYE },
    challenge: [
      'The Great Boiler eats coal. When the coal runs short, the King sends it the unbranded. I open the door.',
      'Feel that? That\'s the draught. The fire wants you closer, and the fire always gets what it wants.',
      'In you go. Somebody has to keep the pressure up.',
    ],
    beaten: [
      'Door\'s cold. The door... I bricked it up. The night they sent the first cart, I bricked it shut myself.',
      'They flogged me for it. Look, the scars are on my back, not my hands. My hands are clean.',
    ],
    coins: 80,
  },
];

export const FALLEN: FallenBundle = {
  encounters,
  gimmicks: [SCRAP_CRANE, HOT_RIVETS, THREE_MARKS, BUNK_COUNT, FIREBOX],
};
