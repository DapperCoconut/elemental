import type { EncounterDef, GimmickDef } from '../../../../IslesTypes';
import { BENCHES, seatId } from '../../spec';
import { CORRECT_PERSPECTIVE } from './decrees/correctPerspective';
import { LETTERS_PATENT } from './decrees/lettersPatent';
import { SHADE_THIEF } from './decrees/shadeThief';
import { SOUL_MADE_PLAIN } from './decrees/soulInPlainSight';
import { UNBROKEN_LINE } from './decrees/unbrokenLine';
import { WRITTEN_WOUND } from './decrees/writtenWound';

/**
 * The six councilors of the Noon Bench — the jurists who drafted Solmara's Endless Noon, clause
 * by clause, directly under the throne. They are the last six seats on the spire and the most
 * senior: the closest to the King, the most proud of their drafting, and — mask split — the most
 * frightened of what sits on the other side of the ceiling.
 *
 * Their seats climb the room from the stair to the Seam, Paint lowest and Noon highest (the
 * presiding seat): see `SEATS` in area.ts for where each one stands.
 */

const B = BENCHES.find((b) => b.isle === 'light')!;
const HP = 1.25 + 0.02 * B.n;
const COINS = 200 + 12 * B.n;

/** Where each councilor stands, in front of their seat (the seat's plinth is 50 px north). */
export const SEAT_AT: Record<string, { x: number; y: number }> = {
  chalk: { x: 380, y: 1620 },
  creation: { x: 1220, y: 1430 },
  magic: { x: 380, y: 1230 },
  soul: { x: 1220, y: 1010 },
  justice: { x: 420, y: 700 },
  light: { x: 1180, y: 570 },
};

export const LIGHT_DECREES: GimmickDef[] = [UNBROKEN_LINE, SHADE_THIEF, SOUL_MADE_PLAIN, WRITTEN_WOUND, LETTERS_PATENT, CORRECT_PERSPECTIVE];

export const LIGHT_COUNCILORS: EncounterDef[] = [
  {
    id: seatId('light'), court: B.id, name: 'Decree of the Unbroken Line', seat: 'Seat of Noon',
    foeName: 'Councilor Aurelia Glaze', foeElement: 'light', difficulty: 5, mastered: true, hpMult: HP, coins: COINS,
    gimmick: UNBROKEN_LINE.id, at: SEAT_AT.light,
    look: { body: 0xf4ead0, accent: 0xd0a85a, hat: 'councilmask', traits: ['book'], size: 1.12, eye: 0xfff2b0 },
    challenge: [
      'I drafted Clarity. Six words: "Nothing on Solmara shall stand unseen." I am rather proud of the economy.',
      'I appointed Lumen. He took the clause literally. That is what one wants in a prince, and dreads in a son.',
      'Light goes straight, challenger. Ride it, and you will be quick. Stand in it, and you will be seen.',
    ],
    beaten: [
      '...my mask. Split down the line I drew. Of course it was.',
      'He is up there. Directly up there. The ceiling is warm because he is sitting on it. Do not make him stand.',
    ],
  },
  {
    id: seatId('justice'), court: B.id, name: 'Decree of the Shade-Thief', seat: 'Seat of Scales',
    foeName: 'Councilor Severin Ashlar', foeElement: 'justice', difficulty: 5, mastered: true, hpMult: HP, coins: COINS,
    gimmick: SHADE_THIEF.id, at: SEAT_AT.justice,
    look: { body: 0xe8e0cc, accent: 0x3a3048, hat: 'councilmask', traits: ['cane', 'glasses'], size: 1.18, eye: 0xfff2b0 },
    challenge: [
      'The Shade-Thief Statute. One: a shadow is a hiding place. Two: hiding is theft. Three: see two.',
      'Verdict was my appointment. Thorough boy. He bleached a grandmother for sleeping under her own table.',
      'Up here the star throws shadows. Step into mine, if you like. The Search will be along presently.',
    ],
    beaten: [
      '...the lamp found me. My own lamp. I wrote it to be impartial and it was. How very embarrassing.',
      'Upstairs there is no statute and no appeal. There is only Him, and He does not read. Go carefully.',
    ],
  },
  {
    id: seatId('soul'), court: B.id, name: 'Decree of the Soul Made Plain', seat: 'Seat of Lanterns',
    foeName: 'Councilor Morrow Vigil', foeElement: 'soul', difficulty: 5, mastered: true, hpMult: HP, coins: COINS,
    gimmick: SOUL_MADE_PLAIN.id, at: SEAT_AT.soul,
    look: { body: 0xd8e4ee, accent: 0x2a3450, hat: 'councilmask', traits: ['lantern'], size: 1.05, eye: 0xd8f0ff },
    challenge: [
      'The Lantern Clause was mine. No soul lies in the dark — not in a grave, nor in its own chest.',
      'I gave Wisp his lanterns, thousands across a gorge. He said they looked like stars. He had never seen one.',
      'Yours walks a step behind you here. I can see it from my seat. It looks tired. Shall we begin?',
    ],
    beaten: [
      'You struck true — the soul, not the shell. Hardly anyone does.',
      'I wonder whether He has one. A soul. Forty years I have looked at that ceiling, and I cannot tell.',
    ],
  },
  {
    id: seatId('magic'), court: B.id, name: 'Decree of the Written Wound', seat: 'Seat of Sigils',
    foeName: 'Councilor Ambrose Quillon', foeElement: 'magic', difficulty: 5, mastered: true, hpMult: HP, coins: COINS,
    gimmick: WRITTEN_WOUND.id, at: SEAT_AT.magic,
    look: { body: 0xe0d4ec, accent: 0x4a2a6a, hat: 'councilmask', traits: ['book', 'satchel'], size: 1.0, eye: 0xc9b0ff },
    challenge: [
      'I wrote the Sigil Bind, the circles that hold the mirrors to the sun. Nothing written may move. Nothing has.',
      'Sigil was my student. Brilliant hand, no restraint. He signed his name in fire across the observatory.',
      'On this floor every blow is entered before it is paid. Mind where you stand when the account falls due.',
    ],
    beaten: [
      'Misfiled. You put me on my own ledger. I should like that written down, if only so someone remembers it.',
      'His seal is on every sigil I drew. When He falls they all come loose at once. Stand clear of mirrors.',
    ],
  },
  {
    id: seatId('creation'), court: B.id, name: 'Decree of the Letters Patent', seat: 'Seat of the Specification',
    foeName: 'Councilor Henrietta Gauge', foeElement: 'creation', difficulty: 5, mastered: true, hpMult: HP, coins: COINS,
    gimmick: LETTERS_PATENT.id, at: SEAT_AT.creation,
    look: { body: 0xe8d8bc, accent: 0x6a4e22, hat: 'councilmask', traits: ['apron', 'tool'], size: 1.1, eye: 0xfff2b0 },
    challenge: [
      'The Mirror Specification: four hundred mirrors, true to a hair. I wrote every tolerance myself.',
      'Artifex was my appointment. Gifted. Insufferable. He patented the screw. The SCREW, challenger.',
      'The Office opens shortly. Whatever your hands do belongs to whoever files first. I always file first.',
    ],
    beaten: [
      'You filed my own keys out from under me. Royalties to the challenger. I must amend the forms.',
      'He did not invent anything, you know. He only owns it. Remember that when you look at Him.',
    ],
  },
  {
    id: seatId('chalk'), court: B.id, name: 'Decree of Correct Perspective', seat: 'Seat of the Likeness',
    foeName: 'Councilor Ludovic Varnish', foeElement: 'chalk', difficulty: 5, mastered: true, hpMult: HP, coins: COINS,
    gimmick: CORRECT_PERSPECTIVE.id, at: SEAT_AT.chalk,
    look: { body: 0xf0e8dc, accent: 0x8a2a3a, hat: 'councilmask', traits: ['scarf'], size: 0.96, eye: 0xfff2b0 },
    challenge: [
      'The Portrait Clause: the Despot, larger than life, on every wall, at noon. No shadow — a shadow is an opinion.',
      'Hue was my appointment. He painted Auriel four thousand times and hid a cloud in each. I always noticed.',
      'This floor is a picture, and I keep the vanishing point. Come to the front, where I can draw you properly.',
    ],
    beaten: [
      '...you pulled the point from under my feet. I have never been in the foreground. It is horribly loud.',
      'Nobody has painted Him. Nobody has dared to look long enough. When you go up, look. Somebody should.',
    ],
  },
];
