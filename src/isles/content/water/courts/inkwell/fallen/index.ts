import type { EncounterDef, FallenBundle } from '../../../../../IslesTypes';
import { fallenId } from '../../../../meteor/spec';
import { PRESS_DAY } from './pressDay';
import { READING_LAMP } from './readingLamp';
import { PAID_IN_FULL } from './paidInFull';
import { RETURN_TO_SENDER } from './returnToSender';
import { COPYBOOK } from './copybook';

/** Every Fallen has ember-gold eyes — the star looking out through them. */
const EMBER = 0xffa040;

/**
 * The Inkwell's Fallen Five — the people of the scriptorium whom the King's telling puts on the
 * crown's side: the pressman who printed the evictions, the lampwarden who read the low street,
 * the tally-clerk who blotted the unpaid, the process-server who put the writs in hand, and the
 * writing-master who taught Prince Blot his letters. Tier 3: difficulties 4,4,5,5,5; about
 * double the court's 65 coins.
 */
const ENCOUNTERS: EncounterDef[] = [
  {
    id: fallenId('inkwell', 'press-day'),
    court: 'inkwell',
    gimmick: PRESS_DAY.id,
    name: 'Press Day',
    foeName: 'Pressman Platt',
    foeElement: 'metal',
    difficulty: 4,
    hpMult: 1.1,
    at: { x: 980, y: 820 },
    look: { body: 0x24242b, accent: 0xf2eee3, hat: 'cap', traits: ['apron', 'tool', 'beard'], size: 1.2, eye: EMBER },
    challenge: [
      'Every eviction notice in the Reach comes off my bed. Twelve pages a pull. You are standing on page seven.',
      'The Queen pays by the impression, friend. In thirty years I have never once missed a pull.',
      'Mind the black. Where it is black, the platen comes down. Where you are, mostly.',
    ],
    beaten: [
      'The bed is clean. Funny. I dreamt I printed broadsheets at night. Rebels\' sheets. Under the floor.',
      'Were those mine? My hands remember a different forme. One I set by candle, with the shutters closed.',
    ],
    coins: 130,
  },
  {
    id: fallenId('inkwell', 'reading-lamp'),
    court: 'inkwell',
    gimmick: READING_LAMP.id,
    name: 'The Reading Lamp',
    foeName: 'Lampwarden Vey',
    foeElement: 'light',
    difficulty: 4,
    hpMult: 1.1,
    at: { x: 700, y: 1400 },
    look: { body: 0xb9b2a1, accent: 0x13297a, hat: 'hood', traits: ['lantern', 'scarf'], eye: EMBER },
    challenge: [
      'My lamp reads every window on the low street. Every word said under it goes up to the tower.',
      'Say what you like in the dark. In the light you will say it three times, and then not at all.',
      'I have never once turned the beam aside. Not for anyone. Not for a single boat.',
    ],
    beaten: [
      'The beam... I used to swing it out to sea when the smugglers\' punts came through. Didn\'t I?',
      'Three short, one long. That was the signal. Who was I signalling? Not the Queen. Never the Queen.',
    ],
    coins: 130,
  },
  {
    id: fallenId('inkwell', 'paid-in-full'),
    court: 'inkwell',
    gimmick: PAID_IN_FULL.id,
    name: 'Paid in Full',
    foeName: 'Tally-Clerk Ossory',
    foeElement: 'bind',
    difficulty: 5,
    hpMult: 1.15,
    at: { x: 300, y: 1360 },
    look: { body: 0xf2eee3, accent: 0x2b5cff, hat: 'coif', traits: ['glasses', 'book', 'satchel'], eye: EMBER },
    challenge: [
      'One coin a head. One receipt a house. No receipt, no house, no name. The tide does the rest.',
      'I tally the low street every night before the water. I have never once miscounted.',
      'Keep your slip clean. A smudged receipt is a forged one, and a forged one is a blot.',
    ],
    beaten: [
      'I wrote receipts. Blank ones. I slipped them under doors on the low street... or I dreamt it.',
      'The ledger says I never missed a house. The ledger is wrong. I missed forty. On purpose.',
    ],
    coins: 135,
  },
  {
    id: fallenId('inkwell', 'return-to-sender'),
    court: 'inkwell',
    gimmick: RETURN_TO_SENDER.id,
    name: 'Return to Sender',
    foeName: 'Process-Server Nell',
    foeElement: 'echo',
    difficulty: 5,
    hpMult: 1.2,
    at: { x: 2060, y: 880 },
    look: { body: 0x7d7a72, accent: 0x0e0e12, hat: 'tricorn', traits: ['satchel', 'scarf'], size: 0.95, eye: EMBER },
    challenge: [
      'A writ for you. Sealed, stamped, addressed. Hold out your hand — or I will find it for you.',
      'Every eviction in the Reach goes into somebody\'s hand. Mine is the hand that puts it there.',
      'Send one back if you like. Paper always finds its way home. So do I.',
    ],
    beaten: [
      'My satchel is full of letters to the drowned. I used to carry them down. Their mothers wrote them.',
      'I was never a server. I was the post. Somebody... re-addressed me.',
    ],
    coins: 135,
  },
  {
    id: fallenId('inkwell', 'copybook'),
    court: 'inkwell',
    gimmick: COPYBOOK.id,
    name: 'Copybook Hand',
    foeName: 'Writing-Master Serif',
    foeElement: 'magic',
    difficulty: 5,
    hpMult: 1.25,
    at: { x: 1560, y: 820 },
    look: { body: 0xf2eee3, accent: 0x0e0e12, hat: 'wig', traits: ['glasses', 'cane', 'book'], eye: EMBER },
    challenge: [
      'I taught the Prince his letters. He had a fair hand. I made it fairer. I made it the Queen\'s.',
      'Keep to the lines. Children who wander off the lines are rapped. Princes who do are drowned.',
      'Show me your hand. Trace the copy. Exactly. Exactly as it is written.',
    ],
    beaten: [
      'He wrote his own name in the margin once. I rapped him for it. Or did I... frame it? I framed it.',
      'I taught him to write "no". That was the lesson. I am almost sure that was the lesson.',
    ],
    coins: 140,
  },
];

export const FALLEN: FallenBundle = {
  encounters: ENCOUNTERS,
  gimmicks: [PRESS_DAY, READING_LAMP, PAID_IN_FULL, RETURN_TO_SENDER, COPYBOOK],
};
