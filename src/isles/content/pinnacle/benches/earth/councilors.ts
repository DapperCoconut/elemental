import type { EncounterDef, GimmickDef, NpcLook } from '../../../../IslesTypes';
import { BENCHES, seatId } from '../../spec';
import { seatAt } from './area';
import { DECREE_ATTRITION } from './decrees/attrition';
import { DECREE_FAULT } from './decrees/fault';
import { DECREE_FETTER } from './decrees/fetter';
import { DECREE_LIKENESS } from './decrees/likeness';
import { DECREE_TABLE } from './decrees/table';
import { DECREE_TRESPASS } from './decrees/trespass';

/**
 * The six councilors of the Stone Bench — the jurists who drafted the Stone Tithe clause by clause,
 * and who appointed Bedrock Hold's six princes. Each fights perfected under the decree they wrote.
 */

const B = BENCHES.find((x) => x.isle === 'earth')!;
const HP = 1.25 + 0.02 * B.n;
const COINS = 200 + 12 * B.n;

/** A councilor's robe: masked, a touch of their seat about them. */
const robe = (body: number, accent: number, eye: number, traits: NpcLook['traits']): NpcLook => ({ body, accent, eye, hat: 'councilmask', traits, size: 1.1 });

export const EARTH_BENCH_DECREES: GimmickDef[] = [DECREE_FAULT, DECREE_TABLE, DECREE_LIKENESS, DECREE_TRESPASS, DECREE_FETTER, DECREE_ATTRITION];

export const EARTH_BENCH_COUNCILORS: EncounterDef[] = [
  {
    id: seatId('earth'), court: B.id, name: 'Decree of the Fault', seat: 'Seat of Bedrock',
    foeName: 'Councilor Ossian Bedwell', foeElement: 'earth', difficulty: 5, mastered: true, hpMult: HP, coins: COINS,
    gimmick: DECREE_FAULT.id, at: seatAt('earth'),
    look: robe(0x7a5a3a, 0x2a1e14, 0xc9b0ff, ['book', 'scarf']),
    challenge: [
      'Bedwell. Seat of Bedrock. I wrote the first clause of the Tithe: a weight of cut stone, each season.',
      'Eleven words. I was proud of them. In forty years nobody has found the gap in them.',
      'I appointed Bould to the Stonehold. I asked for a wall and was sent a boulder. He did his best.',
      'The ground answers to this seat. When I file a fault it opens. Stand clear of the line — or do not.',
    ],
    beaten: [
      'You found the gap. It was under my feet the whole while. A fault, of all things.',
      'Upstairs the crown sits in its pan and outweighs the Hold. Ask yourself what is inside it.',
    ],
  },
  {
    id: seatId('crystal'), court: B.id, name: 'Decree of the Polished Table', seat: 'Seat of Facets',
    foeName: 'Councilor Ysolde Carrow', foeElement: 'crystal', difficulty: 5, mastered: true, hpMult: HP, coins: COINS,
    gimmick: DECREE_TABLE.id, at: seatAt('crystal'),
    look: robe(0xb8aed8, 0x3a2a5a, 0xe8deff, ['glasses', 'satchel']),
    challenge: [
      'Carrow. Seat of Facets. I drafted the Assay: how many carats of geode answer for a pound of stone.',
      'Facet was my appointment. Flawless, he called himself. He had one flaw. He believed it.',
      'This floor is a brilliant: the table, the stars, the girdle. The wheel polishes one facet at a time.',
      'A polished face returns whatever is thrown at it. The only honest thing in this room.',
    ],
    beaten: [
      'Turned back on me. Every shard. I cut that table myself, you understand. I knew the angles.',
      'Above us the shell runs thin. Something under it outshines any stone I ever valued. I will not look.',
    ],
  },
  {
    id: seatId('clay'), court: B.id, name: 'Decree of the Likeness', seat: 'Seat of Likeness',
    foeName: 'Councilor Hobb Slipwell', foeElement: 'clay', difficulty: 5, mastered: true, hpMult: HP, coins: COINS,
    gimmick: DECREE_LIKENESS.id, at: seatAt('clay'),
    look: robe(0xa85a36, 0x3a1a0e, 0xffc8a0, ['apron', 'tool']),
    challenge: [
      'Slipwell. Seat of Likeness. I wrote the Substitution: a likeness of equal weight may stand for a debtor.',
      'That is where the Potter\'s Court got its army. Every fired soldier is a household that came up short.',
      'Glaze was my appointment. A fine hand. He glazed them so well you could not see the faces.',
      'I shall model you. Whatever is done to the likeness is done to you. Mind your little self.',
    ],
    beaten: [
      'You broke mine and guarded yours. Nobody in the Potter\'s Court ever thought to.',
      'Upstairs they do not model you. They keep you. I should know. I am a likeness of something too.',
    ],
  },
  {
    id: seatId('dune'), court: B.id, name: 'Decree of Trespass', seat: 'Seat of Drifts',
    foeName: 'Councilor Ashar Wend', foeElement: 'dune', difficulty: 5, mastered: true, hpMult: HP, coins: COINS,
    gimmick: DECREE_TRESPASS.id, at: seatAt('dune'),
    look: robe(0xd6b47a, 0x5a3e24, 0xffe0a0, ['scarf', 'cane']),
    challenge: [
      'Wend. Seat of Drifts. I wrote the Boundary: whoever leaves a print on Tithe ground owes for the ground.',
      'In the Dunesea the wind takes a print in an hour. We assessed them in forty minutes.',
      'Sirocco was my appointment. He never walked a step. He rode the wind and charged all who did.',
      'Every step you take in here is evidence. Tread on mine and I charge you for it.',
    ],
    beaten: [
      'You jumped my lines. Of course you did. I wrote the clause for people who walk.',
      'The King upstairs leaves no prints at all. He has never had to go anywhere. Think about that.',
    ],
  },
  {
    id: seatId('metal'), court: B.id, name: 'Decree of the Fetter', seat: 'Seat of Fetters',
    foeName: 'Councilor Gerrit Hask', foeElement: 'metal', difficulty: 5, mastered: true, hpMult: HP, coins: COINS,
    gimmick: DECREE_FETTER.id, at: seatAt('metal'),
    look: robe(0x5a5654, 0x2a1a14, 0xff9a7a, ['apron', 'tool']),
    challenge: [
      'Hask. Seat of Fetters. I wrote the Interment: short of weight, you are fettered till others quarry it.',
      'I forged the first staple myself. It is in the Sepulchre floor still. So are some of the people.',
      'Anvil was my appointment. He was meant to make chains. He made bells. I tolerated the bells.',
      'Here is your staple and here is mine. Strike a staple and it comes to the striker. So does the chain.',
    ],
    beaten: [
      'You dragged my own staple to your feet and me after it. Neat law. I would have hired you.',
      'There is a chain upstairs too, from the throne to every seat in this spire. Mine has just snapped.',
    ],
  },
  {
    id: seatId('ruin'), court: B.id, name: 'Decree of Attrition', seat: 'Seat of Remainders',
    foeName: 'Councilor Ebbe Mortlake', foeElement: 'ruin', difficulty: 5, mastered: true, hpMult: HP, coins: COINS,
    gimmick: DECREE_ATTRITION.id, at: seatAt('ruin'),
    look: robe(0x6a5a52, 0x3a1a10, 0xd0a080, ['cane', 'book']),
    challenge: [
      'Mortlake. Seat of Remainders. I wrote what becomes of whatever is left over. It is buried.',
      'The old capital was a remainder. Books, songs, street names. I subtracted them. Wreck did the lifting.',
      'Each span the ledger is read. Whoever struck the less forfeits a stone, and is the poorer for good.',
      'Nothing comes back. A stone that falls stays fallen. That is the whole of my law.',
    ],
    beaten: [
      'You struck your stone back up off the floor. Nothing comes back, I wrote. It came back.',
      'Do you know what the King subtracts? Everything but himself. Go and see what is left of him.',
    ],
  },
];
