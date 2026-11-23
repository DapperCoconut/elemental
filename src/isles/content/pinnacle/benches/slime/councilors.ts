import type { EncounterDef, NpcLook } from '../../../../IslesTypes';
import { seatId } from '../../spec';
import { DECREE_BENEATH } from './decrees/beneath';
import { DECREE_COIL } from './decrees/coil';
import { DECREE_HANGING_NAME } from './decrees/damocles';
import { DECREE_FORGED_WARRANT } from './decrees/forgery';
import { DECREE_STRUCK_LINE } from './decrees/register';
import { DECREE_RITE } from './decrees/rite';
import { B, VEN } from './palette';

/**
 * The six councilors of the Venom Bench — the jurists who wrote the Mark: who is bitten, who is
 * dosed, who is passed over, who informs, who keeps the Register. Each appointed one of Fangmire's
 * princes. Each stands before a seat, up the room from the stair (see area.ts `SEATS`).
 */

const HP = 1.25 + 0.02 * B.n;
const COINS = 200 + 12 * B.n;

/** A councilor in the bench's dress: black-glass robes, a green lining, the mask. */
const look = (accent: number, traits: NpcLook['traits'], size = 1.05): NpcLook => ({
  body: 0x1a1622, accent, hat: 'councilmask', traits, size, eye: VEN,
});

/** Where each councilor stands (before its seat) — shared with the area. */
export const COUNCIL_AT: Record<string, { x: number; y: number }> = {
  slime: { x: 350, y: 1750 },
  death: { x: 1250, y: 1600 },
  shadow: { x: 340, y: 1330 },
  bind: { x: 1260, y: 1170 },
  subterfuge: { x: 350, y: 890 },
  string: { x: 1250, y: 730 },
};

export const PIN_SLIME_COUNCIL: EncounterDef[] = [
  {
    id: seatId('slime'), court: B.id, name: 'Decree of the Condenser Coil', seat: 'Seat of the Draught',
    foeName: 'Councilor Ysolde Distil', foeElement: 'slime', difficulty: 5, mastered: true, hpMult: HP, coins: COINS,
    gimmick: DECREE_COIL.id, at: COUNCIL_AT.slime, look: look(0x6aa84a, ['apron', 'glasses']),
    challenge: [
      'Clause the Seventh, mine: "The Draught follows loyalty." I was very proud of the comma I left out.',
      'I appointed Venin to milk the serpents. He milked them well. He was a disappointment in every other way.',
      'The coil runs. The bead comes round. Stand where you like — I distil whatever is standing there.',
    ],
    beaten: [
      'You turned my own valve on me. Nobody on Fangmire was allowed to touch a valve. That was the point.',
      'The recipe is in the bulb. It always was. Tell the apothecary woman — no. Tell everyone. Before He hears.',
    ],
  },
  {
    id: seatId('death'), court: B.id, name: 'Decree of the Struck Line', seat: 'Seat of the Register',
    foeName: 'Councilor Absalom Strike', foeElement: 'death', difficulty: 5, mastered: true, hpMult: HP, coins: COINS,
    gimmick: DECREE_STRUCK_LINE.id, at: COUNCIL_AT.death, look: look(0x8a5cff, ['book', 'cane'], 1.15),
    challenge: [
      'I keep the Register. Every name passed over, struck through in my own hand. Forty thousand. Not one blot.',
      'Mortis kept a copy for the Grave Court. A copy. He thought it made him a keeper. It made him a clerk.',
      'You have a minute. I have never needed more. Find your line, challenger. The quill already has.',
    ],
    beaten: [
      'Struck. Me. In my own Register. ...It is a very clean line. I could not have ruled it better.',
      'Above us the pages are not written in ink. Mind which line you are standing on up there.',
    ],
  },
  {
    id: seatId('shadow'), court: B.id, name: 'Decree of What Swims Beneath', seat: 'Seat of the Under-Fen',
    foeName: 'Councilor Umbrage Fennimore', foeElement: 'shadow', difficulty: 5, mastered: true, hpMult: HP, coins: COINS,
    gimmick: DECREE_BENEATH.id, at: COUNCIL_AT.shadow, look: look(0x2a3a2a, ['lantern']),
    challenge: [
      'Look down. Further. The fen is under the glass, and something in it has not eaten since the last one.',
      'I gave Dusk the lamps to snuff. He thought darkness was the point. The point is what moves in it.',
      'It follows blood. I will hold you still and bleed you slowly. It is very patient. So am I.',
    ],
    beaten: [
      'It came up for me. Of course it did. I bled all at once — I have never bled all at once.',
      'There is a bigger thing under the glass, upstairs. It does not swim. It waits. It has been waiting for you.',
    ],
  },
  {
    id: seatId('bind'), court: B.id, name: 'Decree of the Binding Rite', seat: 'Seat of Surety',
    foeName: 'Councilor Tobias Surety', foeElement: 'bind', difficulty: 5, mastered: true, hpMult: HP, coins: COINS,
    gimmick: DECREE_RITE.id, at: COUNCIL_AT.bind, look: look(0x4a4a3a, ['scarf', 'tool'], 1.1),
    challenge: [
      'The bite was never the Mark. The Mark is the covenant behind it — and I wrote the covenant. Link by link.',
      'Fetter had the keys. I had the god. A gaoler is only a man. A surety is a promise that cannot be broken.',
      'The god names a rune. Strike it. Strike the wrong one and you unbind yourself. Shall we see who reads faster?',
    ],
    beaten: [
      'Three links, and the god bound ME. It does not care who wrote the rite. Only who finished it.',
      'Every covenant on this bench goes back to the one upstairs. When you break that one, they all come loose.',
    ],
  },
  {
    id: seatId('subterfuge'), court: B.id, name: 'Decree of the Forged Warrant', seat: 'Seat of the Informer\'s Fee',
    foeName: 'Councilor Ambrose Fee', foeElement: 'subterfuge', difficulty: 5, mastered: true, hpMult: HP, coins: COINS,
    gimmick: DECREE_FORGED_WARRANT.id, at: COUNCIL_AT.subterfuge, look: look(0x3a2a1a, ['pipe', 'satchel']),
    challenge: [
      'Informers were paid in doses. I set the rate, and I wrote the warrants. Half of them were true.',
      'Whisper was my appointment. He listened beautifully. He never once understood what anything was worth.',
      'Warrants, then. Some genuine, some mine. I know which. Watch my feet, if you think it will help.',
    ],
    beaten: [
      'Three pricks. I always pressed three. Forty years and nobody counted. You counted.',
      'Upstairs nothing is for sale. That frightens me. I have never stood anywhere I could not buy my way out.',
    ],
  },
  {
    id: seatId('string'), court: B.id, name: 'Decree of the Hanging Name', seat: 'Seat of the Thread',
    foeName: 'Councilor Pendula Hang', foeElement: 'string', difficulty: 5, mastered: true, hpMult: HP, coins: COINS,
    gimmick: DECREE_HANGING_NAME.id, at: COUNCIL_AT.string, look: look(0x3a1a3a, ['glasses', 'book'], 0.95),
    challenge: [
      'Every name in this room hangs by a thread. I spun them. Yours I spun this morning — you were expected.',
      'Weft I set to string the spies. He strung the whole isle up in thread. I only ever needed one strand a head.',
      'Your name is over you now. Bleed and it frays. Stand still and it finds you. Shall we begin?',
    ],
    beaten: [
      'You walked me under your own. Clever. It falls where it hangs, not where you are. Nobody remembers that.',
      'Go up, and look up when you get there. The King\'s thread is the oldest I know, and thinner than mine.',
    ],
  },
];

/** The six decrees, in seat order. */
export const PIN_SLIME_DECREES = [DECREE_COIL, DECREE_STRUCK_LINE, DECREE_BENEATH, DECREE_RITE, DECREE_FORGED_WARRANT, DECREE_HANGING_NAME];
