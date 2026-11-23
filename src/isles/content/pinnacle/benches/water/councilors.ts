import type { EncounterDef, GimmickDef } from '../../../../IslesTypes';
import { BENCHES, seatId } from '../../spec';
import { DRAWN_DOOR } from './decrees/drawnDoor';
import { DRY_TITHE } from './decrees/dryTithe';
import { LADEN_BARGE } from './decrees/ladenBarge';
import { TAKEN_FLOOR } from './decrees/takenFloor';
import { UNDISTURBED_SLEEP } from './decrees/undisturbedSleep';
import { WEIGHTING_STONE } from './decrees/weightingStone';

/**
 * The Tide Bench's six councilors — the drafting committee of the Undertow, one per court of the
 * Drowned Reach, in court order. Each appointed one of Queen Maresa's children to their court and
 * wrote one clause of her law; each fights masked and perfected under that clause.
 */

const B = BENCHES.find((b) => b.isle === 'water')!;
const HP = 1.25 + 0.02 * B.n;
const COINS = 200 + 12 * B.n;

/** Where each councilor stands, in front of their seat (the seats are drawn by the area). */
export const SEAT_AT: Record<string, { x: number; y: number }> = {
  water: { x: 1210, y: 1660 },
  ice: { x: 400, y: 1640 },
  depths: { x: 1220, y: 1250 },
  oil: { x: 380, y: 960 },
  ink: { x: 1220, y: 860 },
  cloth: { x: 390, y: 440 },
};

export const WATER_DECREES: GimmickDef[] = [DRY_TITHE, WEIGHTING_STONE, UNDISTURBED_SLEEP, LADEN_BARGE, DRAWN_DOOR, TAKEN_FLOOR];

export const WATER_COUNCILORS: EncounterDef[] = [
  {
    id: seatId('water'), court: B.id, name: 'Decree of the Dry Tithe', seat: 'Seat of the Tide',
    foeName: 'Councilor Ysolde Neap', foeElement: 'water', difficulty: 5, mastered: true, hpMult: HP, coins: COINS,
    gimmick: DRY_TITHE.id, at: SEAT_AT.water,
    look: { body: 0x2a6ab0, accent: 0x9ad8ff, hat: 'councilmask', traits: ['book'], size: 1.1, eye: 0x9ad8ff },
    challenge: [
      'Clause one: floor is given back to those who pay for it. A coin a head, the heads counted at high water.',
      'I appointed Prince Ebb to collect it. He was meant to be the tide. He became a man who surfs on it.',
      'You have no coin. That is quite all right. Here, the tithe is paid in quickness.',
    ],
    beaten: [
      'You paid my stones out from under me. Nobody ever thought of paying the stone instead of me.',
      'The mask is split. Upstairs they will know. ...I wound that clock every morning for four hundred years.',
    ],
  },
  {
    id: seatId('ice'), court: B.id, name: 'Decree of the Weighting Stone', seat: 'Seat of Rime',
    foeName: 'Councilor Aldous Rimewright', foeElement: 'ice', difficulty: 5, mastered: true, hpMult: HP, coins: COINS,
    gimmick: WEIGHTING_STONE.id, at: SEAT_AT.ice,
    look: { body: 0xbfe4f4, accent: 0x5a8aa8, hat: 'councilmask', traits: ['cane', 'scarf'], size: 1.15, eye: 0xd4f0ff },
    challenge: [
      'Clause four, subsection cold: the drowned are sent down weighted, so the current cannot return them.',
      'I appointed Hoarfrost. A sound choice. He froze a harbour solid and called it an audit.',
      'There is the stone. Strike it, and mind the angle. I always mind the angle.',
    ],
    beaten: [
      'Banked off the wall. I did not draft for the wall. I shall have to... no. No more amendments.',
      'Go on up. Lean on the cold if you must; it is the only honest thing in this spire.',
    ],
  },
  {
    id: seatId('depths'), court: B.id, name: 'Decree of the Undisturbed Sleep', seat: 'Seat of the Trench',
    foeName: 'Councilor Benthe Lowe', foeElement: 'depths', difficulty: 5, mastered: true, hpMult: HP, coins: COINS,
    gimmick: UNDISTURBED_SLEEP.id, at: SEAT_AT.depths,
    look: { body: 0x0e3a3a, accent: 0x5affc8, hat: 'councilmask', traits: ['lantern', 'rod'], size: 1.0, eye: 0x5affc8 },
    challenge: [
      'The Ballast Clause is mine. The drowned are not dead. They are kept. Kept people are no trouble at all.',
      'Lanternjaw keeps my trench. Kept it. I chose him because he never once looked up.',
      'Hush now. They are sleeping. Whatever you do, do it very, very still.',
    ],
    beaten: [
      'They looked at me. All of them, at once. I had forgotten they had eyes.',
      'They went home, did they not? When the Queen fell. ...Good. Do not wake what sits at the top.',
    ],
  },
  {
    id: seatId('oil'), court: B.id, name: 'Decree of the Laden Barge', seat: 'Seat of the Slick',
    foeName: 'Councilor Cassius Bitumen', foeElement: 'oil', difficulty: 5, mastered: true, hpMult: HP, coins: COINS,
    gimmick: LADEN_BARGE.id, at: SEAT_AT.oil,
    look: { body: 0x2a2420, accent: 0x8a7a4a, hat: 'councilmask', traits: ['apron', 'tool'], size: 1.2, eye: 0x9ad8ff },
    challenge: [
      'The Lading Clause: a barge of crude to the maelstrom buys a household one dry season. Very fair terms.',
      'I appointed Crude. A name for a man with no other qualities. He kept the barges moving.',
      'Here they come now. I would not stand in the canal. I would not stand anywhere, frankly.',
    ],
    beaten: [
      'You sank the lading. With me behind it. That is... that is an uninsured loss.',
      'Upstairs he keeps the ledger of everything we were ever paid. I should very much not like to be in it.',
    ],
  },
  {
    id: seatId('ink'), court: B.id, name: 'Decree of the Drawn Door', seat: 'Seat of the Well',
    foeName: 'Councilor Penhallow Sepia', foeElement: 'ink', difficulty: 5, mastered: true, hpMult: HP, coins: COINS,
    gimmick: DRAWN_DOOR.id, at: SEAT_AT.ink,
    look: { body: 0x1a1a22, accent: 0xf0f0f0, hat: 'councilmask', traits: ['book', 'glasses'], size: 0.95, eye: 0xffffff },
    challenge: [
      'I did not write a clause. I wrote the wording of all of them. Every comma in the Undertow is mine.',
      'Blot had my well. I gave him the pen and he spilled it on everyone. Very much the point.',
      'The doors here are drawn by the clerk. I am the clerk. Shall I show you out?',
    ],
    beaten: [
      'In at one, out at the next — and you went in where I did not draw you going. Unwritten.',
      'There is a door upstairs nobody drew. I do not care for doors nobody drew.',
    ],
  },
  {
    id: seatId('cloth'), court: B.id, name: 'Decree of the Taken Floor', seat: 'Seat of the Sail',
    foeName: 'Councilor Marguerite Selvage', foeElement: 'cloth', difficulty: 5, mastered: true, hpMult: HP, coins: COINS,
    gimmick: TAKEN_FLOOR.id, at: SEAT_AT.cloth,
    look: { body: 0xa83a3a, accent: 0xe8dcc0, hat: 'councilmask', traits: ['scarf'], size: 1.05, eye: 0xffd8d8 },
    challenge: [
      'The small print is mine. Floor laid on credit may be taken up at the creditor\'s pleasure. I sewed it in.',
      'I appointed Hem, my sister\'s boy. He measured the whole Reach for a shroud. He was nearly done.',
      'Mind the runners, dear. Everything you stand on here was lent.',
    ],
    beaten: [
      'Flat on my back on my own cloth. Well. It is good canvas. It held.',
      'Up you go. The last bench is sewn tighter than mine, and the thing above it does not use thread.',
    ],
  },
];
