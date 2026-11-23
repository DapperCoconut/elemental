import type { EncounterDef, GimmickDef } from '../../../../IslesTypes';
import { COIN_PRESS } from './gimmicks/coinPress';
import { INTEREST } from './gimmicks/interest';
import { GILDED } from './gimmicks/gilded';
import { TOLL_BRIDGE } from './gimmicks/tollBridge';
import { SCALES } from './gimmicks/scales';

/**
 * The Treasury Court's five champions — the officers of Prince Bullion's mint and bank. Tier 2 of
 * Lotterhaven (difficulty 4,4,5,5,5). Over the toll bridge from Tosswater you meet Levy at the
 * tollbooth, Balance at the Scales of Tribute, Stamp before the mint's presses, Gilt on the Great
 * Vault's step and Compound on Counting-House Row.
 */

export const TREASURY_GIMMICKS: GimmickDef[] = [COIN_PRESS, INTEREST, GILDED, TOLL_BRIDGE, SCALES];

const COINS = 110;

export const TREASURY_ENCOUNTERS: EncounterDef[] = [
  {
    id: 'treasury-coin-press',
    court: 'treasury',
    name: 'Coin Press',
    foeName: 'Minter Stamp',
    foeElement: 'metal',
    difficulty: 4,
    gimmick: 'treasury-coin-press',
    at: { x: 640, y: 566 },
    look: { body: 0xb8a08a, accent: 0x3a3f4a, hat: 'coif', traits: ['apron', 'tool', 'beard'], size: 1.3, eye: 0xffe27a },
    challenge: [
      'Four hundred an hour, stranger. Every one with his face on. I could strike yours, if you\'ll lie still.',
      'The beat\'s in my bones. Down — up — down. Forty years, and I\'ve never once been under the die.',
      'Stand where you like. The presses will find you.',
    ],
    beaten: [
      'You stood me under my own press. Forty years! The lads will never let me hear the end of it.',
      'Take a coin. Fresh off the die. It\'s still warm.',
    ],
    coins: COINS,
  },
  {
    id: 'treasury-interest',
    court: 'treasury',
    name: 'Interest',
    foeName: 'Banker Compound',
    foeElement: 'sand',
    difficulty: 4,
    gimmick: 'treasury-interest',
    at: { x: 570, y: 1240 },
    look: { body: 0xe4ccb4, accent: 0x141218, hat: 'tophat', traits: ['glasses', 'book', 'cane'], size: 1, eye: 0xd8ffb0 },
    challenge: [
      'Do sit down. Nothing here is paid at once — we\'re civilised. A blow is a loan, and loans grow.',
      'It is the sands of the glass, you see. Every second, a little more owed. I find it very soothing.',
      'At the bell, we settle. I shall be so sorry for you at the bell.',
    ],
    beaten: [
      'You called in at precisely the right moment. I could weep. Nobody ever times it properly.',
      'Consider the debt forgiven. That sentence hurts me physically. Go on.',
    ],
    coins: COINS,
  },
  {
    id: 'treasury-gilded',
    court: 'treasury',
    name: 'Gilded',
    foeName: 'Miser Gilt',
    foeElement: 'crystal',
    difficulty: 5,
    gimmick: 'treasury-gilded',
    at: { x: 1650, y: 452 },
    look: { body: 0xd8c09a, accent: 0xe8b830, hat: 'crown', traits: ['glasses', 'satchel'], size: 0.9, eye: 0xfff3c0 },
    challenge: [
      'Off the step. It\'s gilt. I gilded it this morning. I gild it every morning, it wears so.',
      'Everything I walk on turns to gold. Isn\'t that lovely? It\'s a curse, really. Heavy. So heavy.',
      'Don\'t touch it. If you touch it, it breaks. And then it\'s just MONEY. Ugh.',
    ],
    beaten: [
      'You broke it all. All my lovely leaf. Into coins. Coins, like any pauper\'s.',
      'Fine. Pick them up. I can\'t bear to look.',
    ],
    coins: COINS,
  },
  {
    id: 'treasury-toll-bridge',
    court: 'treasury',
    name: 'Toll Bridge',
    foeName: 'Tollman Levy',
    foeElement: 'air',
    difficulty: 5,
    gimmick: 'treasury-toll-bridge',
    at: { x: 1930, y: 906 },
    look: { body: 0xd0b498, accent: 0x9a2230, hat: 'cap', traits: ['satchel', 'pipe'], size: 1.05, eye: 0xc4e8ff },
    challenge: [
      'Toll, please. Health or token. The King\'s bridge has its upkeep, and the upkeep is you.',
      'My father kept this gate, and his before him. Not one of us has ever paid to cross it. Perks.',
      'The wind blows through these turnstiles both ways, friend. So do I.',
    ],
    beaten: [
      'Through on a token and out the far side, and me on the planks. That\'s a toll I\'ll remember.',
      'Pass free. This once. Don\'t tell the carters.',
    ],
    coins: COINS,
  },
  {
    id: 'treasury-scales',
    court: 'treasury',
    name: 'Scales of Tribute',
    foeName: 'Assayer Balance',
    foeElement: 'justice',
    difficulty: 5,
    hpMult: 1.05,
    gimmick: 'treasury-scales',
    at: { x: 1200, y: 1004 },
    look: { body: 0xe8dcc8, accent: 0xc89a3e, hat: 'mitre', traits: ['book', 'glasses'], size: 1.15, eye: 0xffe2a8 },
    challenge: [
      'The Scales do not lie. I have said so ten thousand times, at the foot of this pan. They do not lie.',
      'Whoever is lightest in health sinks, and the other\'s weights fall on them. It is perfectly fair.',
      'Step up. The Scales will weigh us both.',
    ],
    beaten: [
      'You stood on the pan when you were the healthier. That is exactly what the Scales reward. Exactly.',
      'I— the weights. Nobody has ever checked the weights. Please don\'t check the weights.',
    ],
    coins: COINS,
  },
];
