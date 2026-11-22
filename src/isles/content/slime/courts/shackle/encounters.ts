import type { EncounterDef, GimmickDef } from '../../../../IslesTypes';
import { BALL_AND_CHAIN } from './gimmicks/ballAndChain';
import { CHAIN_BRIDGE } from './gimmicks/chainBridge';
import { LEDGER_GIMMICK } from './gimmicks/ledger';
import { MANACLE_WORKS } from './gimmicks/manacleWorks';
import { STOCKS } from './gimmicks/stocks';

/**
 * The Shackle Court's five champions — the people who keep Fangmire's debtors owing. Tier 2 of
 * Fangmire (difficulty 4,4,4,5,5). In from Stilthaven along the Debtors' Causeway you meet Link
 * on the chain-gang, Pillory among the stocks in the square, Clasp in the Manacle Works yard,
 * Pontoon at the south head of the Great Chain Bridge, and Arrears at the Ledger on the gaol wall.
 */

export const SHACKLE_GIMMICKS: GimmickDef[] = [BALL_AND_CHAIN, STOCKS, MANACLE_WORKS, CHAIN_BRIDGE, LEDGER_GIMMICK];

const COINS = 100;

export const SHACKLE_ENCOUNTERS: EncounterDef[] = [
  {
    id: 'shackle-ball-and-chain',
    court: 'shackle',
    name: 'Ball and Chain',
    foeName: 'Convict Link',
    foeElement: 'conquest',
    difficulty: 4,
    gimmick: 'shackle-ball-and-chain',
    at: { x: 1800, y: 880 },
    look: { body: 0xb89a80, accent: 0x6a6458, hat: 'bandana', traits: ['beard', 'bandage', 'brand'], size: 1.3, eye: 0xd8dce4 },
    challenge: [
      'Eleven years on the gang. They gave me the ball the first day. I hated it a year. Then I learned to swing it.',
      'Prince lets the gang fight for him now and then. Win, and a year comes off. I have won four years.',
      'Nothing personal. Your irons are on. Mind your ankle.',
    ],
    beaten: [
      'No year off, then. Ha. I wasn\'t counting on it. I stopped counting at the third.',
      'You swing it like you were born to it. Don\'t be. Go on.',
    ],
    coins: COINS,
  },
  {
    id: 'shackle-stocks',
    court: 'shackle',
    name: 'The Stocks',
    foeName: 'Bailiff Pillory',
    foeElement: 'justice',
    difficulty: 4,
    gimmick: 'shackle-stocks',
    at: { x: 1100, y: 960 },
    look: { body: 0xd0b498, accent: 0x3a3440, hat: 'tophat', traits: ['cane', 'book'], size: 1.1, eye: 0xffd08a },
    challenge: [
      'Late on the Moult-Tithe, a day in the stocks. Late twice, three. Spoke against the Matriarch? A week.',
      'The town brings its own rotten fruit. Nobody is made to throw. That is the beauty of it. They all throw.',
      'You have no Mark, stranger. That is a debt of its own. In you go.',
    ],
    beaten: [
      'In my own stocks. In front of the whole square. I heard them laughing. I did not know they could.',
      'Take the key. Take it! Before I think better of it.',
    ],
    coins: COINS,
  },
  {
    id: 'shackle-manacle-works',
    court: 'shackle',
    name: 'Manacle Works',
    foeName: 'Smith Clasp',
    foeElement: 'metal',
    difficulty: 4,
    gimmick: 'shackle-manacle-works',
    at: { x: 470, y: 1000 },
    look: { body: 0xa88a74, accent: 0x4a2a22, hat: 'coif', traits: ['apron', 'tool', 'beard'], size: 1.25, eye: 0xffa860 },
    challenge: [
      'Four hundred pair a week, every pair stamped with a number, every number owed to the Prince.',
      'I don\'t chain anybody. I make the chains. There\'s a difference. I tell my children there\'s a difference.',
      'The press is hot. Let\'s see whose wrist it finds first.',
    ],
    beaten: [
      'You sent my own iron back at me. Good iron, too. It closed on me sweet as anything.',
      'Maybe there isn\'t a difference. Don\'t tell my children.',
    ],
    coins: COINS,
  },
  {
    id: 'shackle-chain-bridge',
    court: 'shackle',
    name: 'Chain Bridge',
    foeName: 'Keeper Pontoon',
    foeElement: 'water',
    difficulty: 5,
    gimmick: 'shackle-chain-bridge',
    at: { x: 1200, y: 505 },
    look: { body: 0x9aa0a0, accent: 0x2e3a3a, hat: 'souwester', traits: ['rod', 'satchel', 'eyepatch'], size: 1.15, eye: 0x9adf5a },
    challenge: [
      'Every plank on this bridge hangs from its own pin, and I keep the pins. All four hundred.',
      'A debtor who runs for the Web Court gets as far as the middle. Then a plank goes. Nobody swims far.',
      'Out you come, onto the boards. Listen for the creak.',
    ],
    beaten: [
      'Dunked, by a stranger, on my own bridge. The mire will tell the whole court by morning.',
      'I\'ll leave the pins in tonight. All of them. See who crosses.',
    ],
    coins: COINS,
  },
  {
    id: 'shackle-ledger',
    court: 'shackle',
    name: 'Debtor\'s Ledger',
    foeName: 'Clerk Arrears',
    foeElement: 'fortune',
    difficulty: 5,
    hpMult: 1.05,
    gimmick: 'shackle-ledger',
    at: { x: 1090, y: 730 },
    look: { body: 0xd8c8b0, accent: 0x6a3a6e, hat: 'tophat', traits: ['glasses', 'book', 'satchel'], size: 0.95, eye: 0xf0d48a },
    challenge: [
      'Every soul in this court is in the Ledger. Their names, their doses, what they owe. I check it twice.',
      'Debt is the only honest thing on Fangmire. It never lies about who you are. It only grows.',
      'Shall we open an account? Every blow you take, I write down. At the bell, we settle.',
    ],
    beaten: [
      'I have been short before. Never by so much. I shall have to carry it forward.',
      'Your page is clear, stranger. I don\'t know what to do with a clear page.',
    ],
    coins: COINS,
  },
];
