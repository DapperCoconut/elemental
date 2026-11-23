import type { EncounterDef, GimmickDef, Pt } from '../../../../IslesTypes';
import { BENCHES, seatId } from '../../spec';
import { DECREE_AUCTION_BLOCK } from './decrees/auctionBlock';
import { DECREE_DRAWN_LOT } from './decrees/drawnLot';
import { DECREE_HOUR_BILL } from './decrees/hourBill';
import { DECREE_PARTITION } from './decrees/partition';
import { DECREE_PAWN_COUNTER } from './decrees/pawnCounter';
import { DECREE_STILL_MIND } from './decrees/stillMind';

/**
 * The six councilors of the Lot Bench — the jurists who wrote Lotterhaven's Lot clause by clause,
 * each standing before their seat. They appointed the Croupier-King's six "lucky children";
 * every one of them thinks the drafting was excellent and the princes were a disappointment.
 */

const B = BENCHES.find((b) => b.isle === 'fate')!;
const HP = 1.25 + 0.02 * B.n;
const COINS = 200 + 12 * B.n;

/** Where each councilor stands (in front of their seat), climbing the room south to north. */
export const SEAT_AT: Record<string, Pt> = {
  fate: { x: 360, y: 1640 },
  fortune: { x: 1240, y: 1640 },
  sand: { x: 300, y: 1100 },
  memory: { x: 1300, y: 1100 },
  psychic: { x: 420, y: 520 },
  conquest: { x: 1180, y: 520 },
};

export const FATE_DECREES: GimmickDef[] = [
  DECREE_DRAWN_LOT, DECREE_AUCTION_BLOCK, DECREE_HOUR_BILL, DECREE_PAWN_COUNTER, DECREE_STILL_MIND, DECREE_PARTITION,
];

const base = (el: string) => ({
  id: seatId(el), court: B.id, foeElement: el, difficulty: 5, hpMult: HP, coins: COINS, mastered: true, at: SEAT_AT[el],
});

export const FATE_COUNCILORS: EncounterDef[] = [
  {
    ...base('fate'), name: 'Decree of the Drawn Lot', seat: 'Seat of the Draw', foeName: 'Councilor Sortes Quill',
    gimmick: DECREE_DRAWN_LOT.id,
    look: { body: 0x2a2236, accent: 0xd9a8ff, hat: 'councilmask', traits: ['book', 'scarf'], size: 1.05 },
    challenge: [
      'I wrote the Lot. Article one: every child is given a number. Article two: every number may be called.',
      'Article three, in a very small hand: some numbers are kept somewhere warm. I was proud of article three.',
      'I appointed Ante to deal it. He cheated with such enthusiasm. It was never meant to be enthusiastic.',
      'Four of your lots are in the drum, challenger. One of mine. Shall we turn it?',
    ],
    beaten: [
      'You found the false bottom. Of course you did. Everybody always knew where it was.',
      'My mask is split. I can hear him upstairs now — he is counting. He has always been counting.',
      'Go up. Do not let him draw for you.',
    ],
  },
  {
    ...base('fortune'), name: 'Decree of the Auction Block', seat: 'Seat of the Purse', foeName: 'Councilor Crassus Tallow',
    gimmick: DECREE_AUCTION_BLOCK.id,
    look: { body: 0x2c2420, accent: 0xb81c36, hat: 'councilmask', traits: ['glasses', 'satchel'], size: 1.2 },
    challenge: [
      'The Wager-Tithe was my clause. A stake every week, and the House sets the odds. Elegant, I thought.',
      'Bullion was my appointment. He gilded the scales. I asked for subtlety and received gold leaf.',
      'Nothing here is given. Everything is sold. Bid, challenger — and bid with your fists.',
    ],
    beaten: [
      'Sniped. On my own block. The last bid always wins, and I always forget it.',
      'There is a price on you upstairs. He set it before you were born, and it is not one I could meet.',
    ],
  },
  {
    ...base('sand'), name: 'Decree of the Hour Bill', seat: 'Seat of the Hour', foeName: 'Councilor Hora Calends',
    gimmick: DECREE_HOUR_BILL.id,
    look: { body: 0x262838, accent: 0xb9ae94, hat: 'councilmask', traits: ['cane', 'glasses'], size: 0.95 },
    challenge: [
      'The drawn pay hours into the clocks. An afternoon here, a birthday there. I wrote the tariff.',
      'Tock was mine. He wound the clocks so tight they sang. I asked him to stop. He did not hear me.',
      'You hold the Bill, challenger. When the hand comes round, you pay. Unless you serve it first.',
    ],
    beaten: [
      'Served at the last stroke. That was my favourite trick. I am an hour older and it serves me right.',
      'Upstairs, the clocks do not run. He has all the hours anyone ever paid. Ask him for yours back.',
    ],
  },
  {
    ...base('memory'), name: 'Decree of the Pawn Counter', seat: 'Seat of the Pledge', foeName: 'Councilor Mnemosyne Pell',
    gimmick: DECREE_PAWN_COUNTER.id,
    look: { body: 0x30262a, accent: 0xa08a68, hat: 'councilmask', traits: ['book', 'lantern'], size: 1.0 },
    challenge: [
      'Some households could not pay, so I let them pawn a memory instead. Then I wrote in the interest.',
      'Hindsight was my appointment. He remembered every debt in the isle and forgot every face.',
      'At each bell you pawn what you lean on most. I wonder what that will be. I already know, of course.',
    ],
    beaten: [
      'You never leaned on the same thing twice. There was nothing to take. I have no clause for that.',
      'My tickets — every memory I kept is on a shelf up there, in his hall. He reads them at night.',
    ],
  },
  {
    ...base('psychic'), name: 'Decree of the Still Mind', seat: 'Seat of the Sealed Mind', foeName: 'Councilor Cassius Augur',
    gimmick: DECREE_STILL_MIND.id,
    look: { body: 0x222a30, accent: 0x7af2aa, hat: 'councilmask', traits: ['scarf'], size: 1.1 },
    challenge: [
      'Every wager on Lotterhaven was read by a mentalist. Nobody bluffed the House. That was my clause.',
      'I appointed Gambit. He read so many minds he lost track of his own. A clerical error, on my part.',
      'Here a still mind cannot be struck. I have not moved in nine years. Throw something.',
    ],
    beaten: [
      'You stopped throwing things. Nobody ever stops throwing things. It was very loud, in the quiet.',
      'I read him once, upstairs. Just once. There is no mind in there — only the shell, thinking it is one.',
    ],
  },
  {
    ...base('conquest'), name: 'Decree of the Partition', seat: 'Seat of the Levy', foeName: 'Councilor Ordo Marchmont',
    gimmick: DECREE_PARTITION.id,
    look: { body: 0x2e2222, accent: 0xb81c36, hat: 'councilmask', traits: ['eyepatch', 'tool'], size: 1.25 },
    challenge: [
      'The drawn went to the War Court. I wrote the conscription, and I drew the map they marched on.',
      'Banneret was my appointment. He planted his banner on everything, including the people.',
      'The House holds two provinces. You hold one. That is how every map in this isle began.',
    ],
    beaten: [
      'You took the crown province and held it. I never taught anyone to hold. Only to take.',
      'He has a map upstairs of all ten isles, and every one is his colour. Go and spill something on it.',
    ],
  },
];
