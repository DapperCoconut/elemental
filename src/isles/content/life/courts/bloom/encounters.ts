import type { EncounterDef, GimmickDef } from '../../../../IslesTypes';
import { DEADHEADING } from './gimmicks/deadheading';
import { POLLEN_COUNT } from './gimmicks/pollenCount';
import { TOPIARY } from './gimmicks/topiary';
import { SUNDIAL } from './gimmicks/sundial';
import { GRAFT } from './gimmicks/graft';

/**
 * The Bloom Court's five champions — the gardeners who keep Prince Petalis's court tidy. Tier 1
 * of Thornwild (difficulty 2,2,3,3,3). Up the Great Walk from Mossgate you meet Sabine among the
 * Tithe Beds, Pell under the limes of the Pollinarium, Box on the Topiary Walk, Hollis on the
 * sundial lawn and Ives at the potting sheds.
 */

export const BLOOM_GIMMICKS: GimmickDef[] = [DEADHEADING, POLLEN_COUNT, TOPIARY, SUNDIAL, GRAFT];

const COINS = 55;

export const BLOOM_ENCOUNTERS: EncounterDef[] = [
  {
    id: 'bloom-deadheading',
    court: 'bloom',
    name: 'Deadheading',
    foeName: 'Pruner Sabine',
    foeElement: 'life',
    difficulty: 2,
    gimmick: 'bloom-deadheading',
    at: { x: 585, y: 1285 },
    look: { body: 0xd8b49a, accent: 0x7a1838, hat: 'wreath', traits: ['tool', 'apron', 'glasses'], size: 1.05, eye: 0xf6dc52 },
    challenge: [
      'You\'re standing on the Weatherbys\' edging. That\'s a stripe-theft fine. I\'ll take it out of you.',
      'Deadheading, stranger. Take off the weak heads, so the plant grows strong. I do it to beds. I do it to towns.',
      'Keep up with me, or what\'s left of the bloom is thorn.',
    ],
    beaten: [
      'Cut back to the root. By a stranger. Hm. It\'ll come back stronger. Things do.',
      'Go on, then. Mind the edging.',
    ],
    coins: COINS,
  },
  {
    id: 'bloom-pollen-count',
    court: 'bloom',
    name: 'Pollen Count',
    foeName: 'Sneezewort Pell',
    foeElement: 'air',
    difficulty: 2,
    gimmick: 'bloom-pollen-count',
    at: { x: 2000, y: 1510 },
    look: { body: 0xe0c4a0, accent: 0xf6dc52, hat: 'veil', traits: ['scarf', 'satchel'], size: 1, eye: 0xffd0d8 },
    challenge: [
      'The Pollinarium tithes in pollen. Forty jars a season off the limes. I fan it in. I sneeze. I fan it in.',
      'Hay fever is a matter of standing upwind. I have spent my whole life upwind.',
      'You, however, are about to be downwind. Ah — ah — no. Not yet.',
    ],
    beaten: [
      'ACHOO. Ah. Sorry. That was a surrender, and a sneeze. Both.',
      'Take a hanky. Everyone in the Pollinarium carries three.',
    ],
    coins: COINS,
  },
  {
    id: 'bloom-topiary',
    court: 'bloom',
    name: 'Topiary',
    foeName: 'Hedgecutter Box',
    foeElement: 'metal',
    difficulty: 3,
    gimmick: 'bloom-topiary',
    at: { x: 540, y: 435 },
    look: { body: 0xb8a48e, accent: 0x2f5a2c, hat: 'helmet', traits: ['tool', 'beard'], size: 1.3, eye: 0xd8dade },
    challenge: [
      'Every animal on this walk I cut out of a yew with these shears. Forty years. They know my voice.',
      'They\'ll stand between us, see. A yew takes a blow better than a man. Better than most men I\'ve pruned.',
      'Mind the bear. He\'s fond of me.',
    ],
    beaten: [
      'You cut my bear down to a stump. I\'ll have him back by the turn. You, I won\'t.',
      'Go on. I\'ve trimming to do.',
    ],
    coins: COINS,
  },
  {
    id: 'bloom-sundial',
    court: 'bloom',
    name: 'Sundial',
    foeName: 'Gnomon Hollis',
    foeElement: 'light',
    difficulty: 3,
    gimmick: 'bloom-sundial',
    at: { x: 1330, y: 470 },
    look: { body: 0xe8d4b4, accent: 0xcfa046, hat: 'tophat', traits: ['glasses', 'cane', 'book'], size: 0.95, eye: 0xfff2b0 },
    challenge: [
      'The turn of the season is read off this dial. I read it. When I say the turn has come, the cart moves.',
      'I could be slow. Some years I have been slow. The Prince noticed. I am not slow any more.',
      'Stand in the sun, stranger, and you\'ll hit hard. Stand in the shade and you\'ll live. Choose.',
    ],
    beaten: [
      'The shadow went round and you were never where it wanted you. Very good.',
      'I may be a little slow reading the turn this season. Clocks are so unreliable.',
    ],
    coins: COINS,
  },
  {
    id: 'bloom-graft',
    court: 'bloom',
    name: 'The Graft',
    foeName: 'Grafter Ives',
    foeElement: 'string',
    difficulty: 3,
    hpMult: 1.05,
    gimmick: 'bloom-graft',
    at: { x: 2000, y: 955 },
    look: { body: 0xd4bca4, accent: 0x5a432c, hat: 'cap', traits: ['apron', 'tool', 'glasses'], size: 1.05, eye: 0xa8f0a0 },
    challenge: [
      'I trained the Empress\'s grafters. Cut, bind, wait. Stem to stock. Apple onto pear. Anything onto anything.',
      'People onto hedges, in the Glasshouse. I don\'t do that one. I only taught the knife-work. Only that.',
      'Every blow we trade, I\'ll bind us. Pull away from me and see what tears.',
    ],
    beaten: [
      'You stood your ground and let me do the pulling. Nobody ever lets me do the pulling.',
      'I taught the knife-work. I keep telling myself that. Go on.',
    ],
    coins: COINS,
  },
];
