import type { EncounterDef, GimmickDef, NpcLook, Pt } from '../../../../IslesTypes';
import { BENCHES, seatId } from '../../spec';
import { DECREE_CONDUCTION } from './decrees/conduction';
import { DECREE_CONTAMINATION } from './decrees/contamination';
import { DECREE_CYCLOTRON } from './decrees/cyclotron';
import { DECREE_SUPERPOSITION } from './decrees/superposition';
import { DECREE_TABLE } from './decrees/table';
import { DECREE_VERIFICATION } from './decrees/verification';

/**
 * The Storm Bench's six councilors — the drafters of the Draw. Each supervised one Voltreach
 * court and appointed its prince; each fights perfected, under the decree they wrote for this room.
 * `SEAT_SPOTS` is where each stands on the bench floor (the area draws their chairs behind them).
 */

const B = BENCHES.find((x) => x.isle === 'electricity')!;
const HP = 1.25 + 0.02 * B.n;
const COINS = 200 + 12 * B.n;

/** Where each councilor stands, south to north, in court order. */
export const SEAT_SPOTS: Record<string, Pt> = {
  electricity: { x: 430, y: 1650 },
  technology: { x: 1170, y: 1490 },
  magnet: { x: 430, y: 1310 },
  radiation: { x: 1170, y: 880 },
  rubber: { x: 430, y: 660 },
  quantum: { x: 1170, y: 450 },
};

const mask = (body: number, accent: number, eye: number, traits: NpcLook['traits'], size = 1.1): NpcLook => ({
  body, accent, hat: 'councilmask', traits, size, eye,
});

export const STORM_DECREES: GimmickDef[] = [
  DECREE_CONDUCTION, DECREE_VERIFICATION, DECREE_CYCLOTRON, DECREE_CONTAMINATION, DECREE_TABLE, DECREE_SUPERPOSITION,
];

const base = { court: B.id, mastered: true, difficulty: 5 as const, hpMult: HP, coins: COINS };

export const STORM_COUNCILORS: EncounterDef[] = [
  {
    ...base,
    id: seatId('electricity'), name: 'Decree of Conduction', seat: 'Seat of the Draw',
    foeName: 'Councilor Cassius Ampleforth', foeElement: 'electricity', gimmick: DECREE_CONDUCTION.id, at: SEAT_SPOTS.electricity,
    look: mask(0x221c30, 0xffe14a, 0xffe14a, ['book', 'glasses'], 1.15),
    challenge: [
      'Ampleforth. I drafted the Draw — every clause of it. Quota, shortfall, switching-off. It added up beautifully.',
      'I appointed Volt to the Dynamo. All spark and no ledger. I expected better of a generator.',
      'My room has one rule: nothing in here is insulated. Shoot all you like. Every shot you fire is a wire.',
    ],
    beaten: [
      'The arithmetic was perfect. I never once asked what the numbers were for.',
      'Upstairs nobody counts. Upstairs it simply takes. ...Mind the Meter on your way past. It is still pinned.',
    ],
  },
  {
    ...base,
    id: seatId('technology'), name: 'Decree of Verification', seat: 'Seat of the Tabulator',
    foeName: 'Councilor Ada Tabulae', foeElement: 'technology', gimmick: DECREE_VERIFICATION.id, at: SEAT_SPOTS.technology,
    look: mask(0x1c2230, 0x7aff8a, 0x7aff8a, ['satchel', 'glasses'], 1.05),
    challenge: [
      'Tabulae. I wrote the Form. Every crank on Voltreach was stamped, checked and filed — by me, or my machine.',
      'I gave Byte the Circuit Court. He thought the Tabulator was a toy. A disappointment, in base two.',
      'Before we begin, I must ask you to prove you are not a robot. I have proved it myself. Several times.',
    ],
    beaten: [
      'You refreshed it on me. I never thought to make the refresh key mine alone. An oversight. My first.',
      'The King does not fill in forms. There is no box upstairs marked "no". Please — go carefully.',
    ],
  },
  {
    ...base,
    id: seatId('magnet'), name: 'Decree of the Cyclotron', seat: 'Seat of the Lode',
    foeName: 'Councilor Ferrand Lodemoor', foeElement: 'magnet', gimmick: DECREE_CYCLOTRON.id, at: SEAT_SPOTS.magnet,
    look: mask(0x2a1e1a, 0xc8743a, 0x8fd8ff, ['tool', 'beard'], 1.25),
    challenge: [
      'Lodemoor. Mine was the Salvage Clause: every nail and hinge on the isle drawn up the wire to wind the Coil.',
      'I gave the Lodestar Court to Polar. He only ever pointed one way at a time. A compass, not a prince.',
      'My coils go round and round. Strike one and it gives back more than you put in. Unlike the Grid.',
    ],
    beaten: [
      'Round and round, and you stepped off at the right moment. That is all physics ever asks of anyone.',
      'There is a pull upstairs I never measured. All the iron in me leans to the throne. Do not let it lean you.',
    ],
  },
  {
    ...base,
    id: seatId('radiation'), name: 'Decree of Contamination', seat: 'Seat of the Halflife',
    foeName: 'Councilor Mirela Becque', foeElement: 'radiation', gimmick: DECREE_CONTAMINATION.id, at: SEAT_SPOTS.radiation,
    look: mask(0x1e2a1c, 0xd4ff3a, 0xd4ff3a, ['apron', 'lantern'], 1.1),
    challenge: [
      'Becque. I wrote the Earthing: a house switched off three times goes up the Coil, and its debt goes with it.',
      'I put Isotope over Halflife. He kept splitting the difference. The only thing he ever split evenly.',
      'Here the dose is a thing one of us carries. I have carried it a long time. Catch.',
    ],
    beaten: [
      'You gave it back to me with interest. The first fair exchange this bench has ever seen.',
      'Above us it is all half-life and no decay. It does not fade. I have the readings. Do not read them.',
    ],
  },
  {
    ...base,
    id: seatId('rubber'), name: 'Decree of the Table', seat: 'Seat of the Bounce',
    foeName: 'Councilor Gutta Percival', foeElement: 'rubber', gimmick: DECREE_TABLE.id, at: SEAT_SPOTS.rubber,
    look: mask(0x2a1a24, 0xff7a5a, 0xffb07a, ['pipe', 'scarf'], 1.0),
    challenge: [
      'Percival! I wrote the Grace Clause: crank enough, light the lamps, win a night\'s grace. Terribly popular.',
      'Nobody ever won a night\'s grace, of course. The table was tilted. I tilted it. That is what tables are for.',
      'Sprocket had the Bounce Court. Wound too tight, that boy. Now — three bumpers, one jackpot. Don\'t tilt.',
    ],
    beaten: [
      'JACKPOT. Oh, well played. I have never heard that lamp go off for anyone but the house.',
      'The house upstairs never loses. It does not play. It just keeps the table. Off you go, ball.',
    ],
  },
  {
    ...base,
    id: seatId('quantum'), name: 'Decree of Superposed Law', seat: 'Seat of the Superposition',
    foeName: 'Councilor Hilbert Twice', foeElement: 'quantum', gimmick: DECREE_SUPERPOSITION.id, at: SEAT_SPOTS.quantum,
    look: mask(0x1a1a2e, 0xc9a0ff, 0xc9a0ff, ['cane', 'book'], 1.1),
    challenge: [
      'Twice. I wrote nothing, and everything: the clause by which every other clause on this bench applies at once.',
      'Both was my appointment. He stood in two places and governed from neither. I was rather proud of him.',
      'Two laws are in force in my room until somebody looks. I would look quickly, if I were you.',
    ],
    beaten: [
      'You measured. You chose. Nobody on this bench ever chose — we only drafted. It was so much tidier.',
      'Upstairs there is one law and no observer. Four benches more of us, then him. ...Collapse well.',
    ],
  },
];
