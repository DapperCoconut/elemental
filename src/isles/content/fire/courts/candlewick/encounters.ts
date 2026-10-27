import type { EncounterDef } from '../../../../IslesTypes';
import { MORROW_ACCENT, MORROW_BODY } from './gimmicks/effigies';

/**
 * The five champions of the Candlewick Court. Tier 3: difficulties 3,3,3,3,4, 50 coins apiece.
 * Each stands somewhere along the court's streets — the chandlers' lane, the cathedral steps,
 * the apiary, the burnt-out end of Wick Street, and Morrow's effigy yard by the palace.
 */

export const ENC_DRIP = 'candlewick-drip';
export const ENC_VIGIL = 'candlewick-vigil';
export const ENC_HIVE = 'candlewick-hive';
export const ENC_BOTH_ENDS = 'candlewick-both-ends';
export const ENC_EFFIGIES = 'candlewick-effigies';

export const CANDLEWICK_ENCOUNTERS: EncounterDef[] = [
  {
    id: ENC_DRIP, court: 'candlewick', name: 'Drip',
    foeName: 'Chandler Brigid', foeElement: 'wax', difficulty: 3, gimmick: 'candlewick-drip',
    at: { x: 1200, y: 1232 },
    look: { body: 0xf0dcb0, accent: 0x7a4a2a, hat: 'bandana', traits: ['apron', 'tool'], size: 1.15 },
    challenge: [
      'Mind your head, I\'ve got four hundred tapers on the rack and the Inchwardens want them by dusk.',
      'You\'re standing in my drip. You want to fight in it? Fine. Everybody sets in the end.',
    ],
    beaten: [
      'Hah. You walked me right under the rack, didn\'t you. Thirty years dipping and I got set like a novice.',
      'Take the side door. And don\'t tell the Inchwardens I\'m behind on the order.',
    ],
    coins: 50,
  },
  {
    id: ENC_VIGIL, court: 'candlewick', name: 'Vigil',
    foeName: 'Vigil-Keeper Amonet', foeElement: 'light', difficulty: 3, gimmick: 'candlewick-vigil',
    at: { x: 760, y: 596 },
    look: { body: 0xf6eedc, accent: 0x3a3450, hat: 'veil', traits: ['lantern'], size: 1.05, eye: 0xffe6a0 },
    challenge: [
      'Every taper in this nave burns for the King. Not for the sick, not for the drowned. For the King.',
      'You have been lighting candles for your own dead. I have been putting them out. Shall we see who tires?',
    ],
    beaten: [
      'You kept every one of them burning. Even the ones I had already mourned.',
      'Go. Light what you like. I find I have run out of breath.',
    ],
    coins: 50,
  },
  {
    id: ENC_HIVE, court: 'candlewick', name: 'Hive Mind',
    foeName: 'Apiarist Hum', foeElement: 'life', difficulty: 3, gimmick: 'candlewick-hive',
    at: { x: 1880, y: 566 },
    look: { body: 0xe8c86a, accent: 0xf4f0e0, hat: 'veil', traits: ['satchel', 'pipe'], size: 1.1 },
    challenge: [
      'Shh. Shh. They can hear you. Every one of them can hear you, and they all think the same thing.',
      'The Prince wants their wax for his tower. I want them calm. You are not helping with either.',
    ],
    beaten: [
      'They like you. Well — they like that you made me run. They have never seen me run.',
      'Take some comb on your way out. They will not mind. Probably.',
    ],
    coins: 50,
  },
  {
    id: ENC_BOTH_ENDS, court: 'candlewick', name: 'Both Ends',
    foeName: 'Wickling Dross', foeElement: 'fire', difficulty: 3, gimmick: 'candlewick-both-ends',
    at: { x: 430, y: 1046 },
    look: { body: 0xf3e3bf, accent: 0xd8501a, hat: 'candle', traits: ['bandage'], size: 0.82, eye: 0xffd27a },
    challenge: [
      'They lit me at both ends when I was born. Said I\'d burn out fast. I\'m still here. Are you?',
      'Come on, then. We both go shorter. Whoever\'s shortest hits hardest. That\'s the only rule in this alley.',
    ],
    beaten: [
      'Ha... hah. You burned all the way down and kept swinging. That\'s how I do it.',
      'Eat my drippings if you like. Waste not.',
    ],
    coins: 50,
  },
  {
    id: ENC_EFFIGIES, court: 'candlewick', name: 'Effigies',
    foeName: 'Effigist Morrow', foeElement: 'illusion', difficulty: 4, gimmick: 'candlewick-effigies',
    at: { x: 1660, y: 1262 },
    look: { body: MORROW_BODY, accent: MORROW_ACCENT, hat: 'tophat', traits: ['mask', 'cane'], size: 1.05 },
    challenge: [
      'The Prince commissions a likeness of every citizen who comes up short. I have made a great many likenesses.',
      'Here is a little secret of the trade: I always pour one of myself first. Several, in fact. Guess which.',
    ],
    beaten: [
      'You found me. Every time. Do you know how rare it is to be found?',
      'Take the yard. The likenesses will melt by spring. I think I will let them.',
    ],
    coins: 50,
  },
];
