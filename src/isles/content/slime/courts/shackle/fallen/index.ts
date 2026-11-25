import type { FallenBundle } from '../../../../../IslesTypes';
import { fallenId } from '../../../../meteor/spec';
import { FALLEN_CUSTODY } from './custody';
import { FALLEN_GANG_SHARE } from './gangShare';
import { FALLEN_SMALL_BEER } from './smallBeer';
import { FALLEN_SURETY } from './surety';
import { FALLEN_UNREDEEMED } from './unredeemed';

/**
 * The Shackle Court's Fallen Five — in the star's telling, the people of the debtors' town who kept
 * the debt growing for Prince Fetter: the pawnbroker who never gave a pledge back, the bondsman who
 * called in every bail, the turnkey who moved men from cell to cell by night, the tapster who poured
 * on the slate, and the ganger who paid his own way off on the gang. Tier 2: difficulty 4,4,4,5,5;
 * coins double the court's 100. They stand where the court's own five never do: Pawn Row's east end,
 * the gaol's west yard, the Fetterhold's east wall, the south road by the huts, and the mire bank
 * east of the bridge-head.
 */

const EYE = 0xffa040;
const COINS = 200;

export const FALLEN: FallenBundle = {
  gimmicks: [FALLEN_UNREDEEMED, FALLEN_SURETY, FALLEN_CUSTODY, FALLEN_SMALL_BEER, FALLEN_GANG_SHARE],
  encounters: [
    {
      id: fallenId('shackle', 'unredeemed'),
      court: 'shackle',
      name: 'Unredeemed',
      foeName: 'Pledge-Master Orlo Hucklebone',
      foeElement: 'memory',
      difficulty: 4,
      hpMult: 1.1,
      gimmick: fallenId('shackle', 'unredeemed'),
      at: { x: 1600, y: 1250 },
      look: { body: 0xc8b49a, accent: 0x6a3a6e, hat: 'tophat', traits: ['glasses', 'satchel', 'cane'], size: 1.0, eye: EYE },
      challenge: [
        'A coat, sixpence. Boots, a shilling. A ring, a dose. I remember every pledge on Pawn Row. Every one.',
        'Nobody ever comes back for them. The ticket runs out and the rail stays full. That is the trade.',
        'Leave something with me, stranger. Half of every bruise. I will keep it safe until it falls due.',
      ],
      beaten: [
        'My rail is empty. I... used to give them back. The Tanners\' clock, the Wick girl\'s shawl. Didn\'t I?',
        'There was a box of tickets I never cashed. I kept it under the counter. I think I kept it for them.',
      ],
      coins: COINS,
    },
    {
      id: fallenId('shackle', 'surety'),
      court: 'shackle',
      name: 'Stood Surety',
      foeName: 'Bondsman Corbyn Thrupp',
      foeElement: 'passion',
      difficulty: 4,
      hpMult: 1.15,
      gimmick: fallenId('shackle', 'surety'),
      at: { x: 330, y: 700 },
      look: { body: 0xd0b498, accent: 0x3a3440, hat: 'tricorn', traits: ['book', 'cane', 'beard'], size: 1.15, eye: EYE },
      challenge: [
        'I have stood bail for half this court. Every man in a chair over there signed with my pen.',
        'When the Draught runs short, bonds are called. That is no cruelty. That is what a bond is for.',
        'Someone has signed for you too, stranger. Look at him. Shall we see how long he holds?',
      ],
      beaten: [
        'The chairs... I sat in them myself, didn\'t I. For my brother. For the Rooks. I stood for them.',
        'I never called a bond in my life. I only ever paid them. Why do I remember calling them?',
      ],
      coins: COINS,
    },
    {
      id: fallenId('shackle', 'custody'),
      court: 'shackle',
      name: 'Change of Custody',
      foeName: 'Turnkey Hesketh Mowbray',
      foeElement: 'psychic',
      difficulty: 4,
      hpMult: 1.1,
      gimmick: fallenId('shackle', 'custody'),
      at: { x: 2100, y: 560 },
      look: { body: 0xa89a88, accent: 0x2a2e3e, hat: 'cap', traits: ['lantern', 'tool', 'eyepatch'], size: 1.2, eye: EYE },
      challenge: [
        'Cell nine to cell forty, cell forty to the cellar. I move them by night. Their wives never find the door.',
        'I hear the key before I turn it. I always know who will be standing where. You will learn that too.',
        'Mind your feet when the cuffs go on. The traps are set for whoever arrives.',
      ],
      beaten: [
        'Every door on the ring... I opened them. One night, all at once. I remember the sound of it.',
        'I was a turnkey who lost his keys on purpose. Wasn\'t I? Tell me I was.',
      ],
      coins: COINS,
    },
    {
      id: fallenId('shackle', 'small-beer'),
      court: 'shackle',
      name: 'Small Beer',
      foeName: 'Tapster Jem Grout',
      foeElement: 'gum',
      difficulty: 5,
      hpMult: 1.2,
      gimmick: fallenId('shackle', 'small-beer'),
      at: { x: 900, y: 1380 },
      look: { body: 0xd8b896, accent: 0x5a3e2a, hat: 'beanie', traits: ['apron', 'beard', 'pipe'], size: 1.25, eye: EYE },
      challenge: [
        'Owing House tap, open dawn till curfew. No coin? On the slate, friend. Everyone drinks on the slate.',
        'A man who has had a few forgets what he owes. Then he owes a little more. Then he stays.',
        'Have one on the house. Have four. You will not feel a thing.',
      ],
      beaten: [
        'The slate... I wiped it. Every Sunday, wet rag, the whole board. Nobody ever saw me do it.',
        'I poured small beer and charged for it small. I think. I hope the slate was only ever chalk.',
      ],
      coins: COINS,
    },
    {
      id: fallenId('shackle', 'gang-share'),
      court: 'shackle',
      name: 'The Gang\'s Share',
      foeName: 'Ganger Mordecai Snell',
      foeElement: 'marrow',
      difficulty: 5,
      hpMult: 1.25,
      gimmick: fallenId('shackle', 'gang-share'),
      at: { x: 1560, y: 500 },
      look: { body: 0xb09078, accent: 0x4a4440, hat: 'bandana', traits: ['brand', 'bandage', 'beard'], size: 1.35, eye: EYE },
      challenge: [
        'Three men on my belt and none of them mine. Their backs carry my blows. My debt was paid years back.',
        'A ganger never feels the lash. That is what the gang is for. They feel it for him.',
        'Go on, hit me. Watch who flinches.',
      ],
      beaten: [
        'Struck off... I carried Link up the causeway once, when his leg went. On my back. All the way.',
        'I was on the gang. I was never the ganger. Why are they looking at me like I was?',
      ],
      coins: COINS,
    },
  ],
};
