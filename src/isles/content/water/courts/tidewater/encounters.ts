import type { EncounterDef, GimmickDef } from '../../../../IslesTypes';
import { HIGH_WATER } from './gimmicks/highWater';
import { CRAB_SEASON } from './gimmicks/crabSeason';
import { RIP_CURRENT } from './gimmicks/ripCurrent';
import { BELL_BUOY } from './gimmicks/bellBuoy';
import { MESSAGE_IN_A_BOTTLE } from './gimmicks/bottles';

/**
 * The Tidewater Court's five champions — Prince Ebb's tide-officers, each keeping a stretch of
 * the flats. Tier 1 of the Drowned Reach (difficulty 2,2,2,3,3). Coming up the causeway from
 * Brinehollow you meet Marisol on the open flats first, Silt out by the stranded boat, Dunwick
 * along the west Low Walk, Rook by the east creek, and Wren on the dunes under the lighthouse.
 */

export const TIDEWATER_GIMMICKS: GimmickDef[] = [HIGH_WATER, CRAB_SEASON, RIP_CURRENT, BELL_BUOY, MESSAGE_IN_A_BOTTLE];

const COINS = 45;

export const TIDEWATER_ENCOUNTERS: EncounterDef[] = [
  {
    id: 'tidewater-high-water',
    court: 'tidewater',
    name: 'High Water Mark',
    foeName: 'Tidecaller Marisol',
    foeElement: 'water',
    difficulty: 2,
    gimmick: 'tidewater-high-water',
    at: { x: 960, y: 1350 },
    look: { body: 0x9ccfd0, accent: 0x24434d, hat: 'veil', traits: ['scarf'], size: 1.05, eye: 0xeef6f0 },
    challenge: [
      'You came up the causeway on a falling tide. Clever. It won\'t fall forever.',
      'I read the Gauge for the Prince. I tell the flats when to climb. Most of them climb in time.',
      'In the water I am quick and you are not. That is all the sea has ever been.',
    ],
    beaten: [
      'Stranded. On my own flats. The gulls will talk about this.',
      'The tide is still coming, stranger. It is always still coming. But not for you, today.',
    ],
    coins: COINS,
  },
  {
    id: 'tidewater-crab-season',
    court: 'tidewater',
    name: 'Crab Season',
    foeName: 'Crabber Dunwick',
    foeElement: 'hunt',
    difficulty: 2,
    gimmick: 'tidewater-crab-season',
    at: { x: 430, y: 940 },
    look: { body: 0xc89a74, accent: 0x7a2219, hat: 'souwester', traits: ['beard', 'satchel', 'rod'], size: 1.3 },
    challenge: [
      'Hundred crabs a tide for the crown pot. I\'m sixty short and you\'re standing on my flats.',
      'Crabs don\'t like me. Never have. They run from me — and I know which way they run.',
      'Mind your ankles.',
    ],
    beaten: [
      'You threw a crab at me. You THREW a CRAB. Kip\'s going to laugh herself sick.',
      'Sixty short, and now my shin\'s pinched. Go on, then. The flats are yours.',
    ],
    coins: COINS,
  },
  {
    id: 'tidewater-rip-current',
    court: 'tidewater',
    name: 'Rip Current',
    foeName: 'Wader Silt',
    foeElement: 'air',
    difficulty: 2,
    gimmick: 'tidewater-rip-current',
    at: { x: 1560, y: 1380 },
    look: { body: 0xa9b8a4, accent: 0x3d5c63, hat: 'cap', traits: ['scarf', 'cane'], size: 1.1 },
    challenge: [
      'I walk the flats at the turn and mark where the rips open. Then I tell the Prince who drowned in them.',
      'The trick is not to fight it. Everybody fights it. Then the surf has them.',
      'I am going to blow you into one and watch you remember.',
    ],
    beaten: [
      'You swam sideways. Of course you did. Somebody taught you right.',
      'Go on up. I\'ll mark this one down as "the rip went out without anybody".',
    ],
    coins: COINS,
  },
  {
    id: 'tidewater-bell-buoy',
    court: 'tidewater',
    name: 'Bell Buoy',
    foeName: 'Buoy-Keeper Rook',
    foeElement: 'sound',
    difficulty: 3,
    gimmick: 'tidewater-bell-buoy',
    at: { x: 2060, y: 950 },
    look: { body: 0xb8a48e, accent: 0x7a2219, hat: 'tricorn', traits: ['lantern', 'eyepatch'], size: 1.15, eye: 0xf2d58a },
    challenge: [
      'Every house left under, I toll the buoy once. I\'ve rung it nine hundred times. I\'m deaf in the one ear.',
      'The bell speaks along its swing. Stand in its mouth and it speaks to you.',
      'Let\'s hear what you sound like rung.',
    ],
    beaten: [
      'Rung by my own bell. Nine hundred and one.',
      '...I\'ll not toll it for you. I\'ll toll it once for luck, though. Off you go.',
    ],
    coins: COINS,
  },
  {
    id: 'tidewater-bottle',
    court: 'tidewater',
    name: 'Message in a Bottle',
    foeName: 'Beachcomber Wren',
    foeElement: 'fate',
    difficulty: 3,
    hpMult: 1.05,
    gimmick: 'tidewater-bottle',
    at: { x: 520, y: 330 },
    look: { body: 0xd8b89a, accent: 0x5f6b46, hat: 'straw', traits: ['satchel', 'glasses', 'book'], size: 0.95 },
    challenge: [
      'Thirty years combing this beach. Every bottle the sea brings, I read. Every one.',
      'Most are from the drowned, to their families. I deliver those. The rest I keep, and they keep me.',
      'Green is good news. Brown is bad. You\'ll learn. Everyone learns.',
    ],
    beaten: [
      'You read the glass better than I do. Thirty years. Hm.',
      'Here\'s one I\'ve never opened. It says "for whoever beats Wren". I think it\'s yours. Don\'t tell me what it says.',
    ],
    coins: COINS,
  },
];
