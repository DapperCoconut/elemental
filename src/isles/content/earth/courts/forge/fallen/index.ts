import type { FallenBundle } from '../../../../../IslesTypes';
import { fallenId } from '../../../../meteor/spec';
import { FALLEN_GLARE } from './glare';
import { FALLEN_HAMMER_TIME } from './hammerTime';
import { FALLEN_PROOF } from './proof';
import { FALLEN_RING_TEST } from './ringTest';
import { FALLEN_STRIKER } from './striker';

/**
 * The Forge Court's Fallen Five — in the star's telling, the foundry hands who kept the iron moving
 * for the crown: the chainmaker who proved the interment chains (a dark mirror of Linka Shackleby),
 * the keeper of the Great Hammer's time and its book of who struck out of it, the ring-tester who
 * condemned the bells, the Hall's bought striker, and the furnace-keeper who chose who got a heat-screen
 * on tapping night. Tier 3: difficulty 4,4,5,5,5; coins about double the court's 95.
 * They stand where the court's own five never fight: east of the upper chain bridge, under the
 * Great Trip-Hammer on Hammer Row, the casting floor's east end, below the bell pit, and the rail
 * yard by the adit.
 */

const EYE = 0xffa040;

export const FALLEN: FallenBundle = {
  gimmicks: [FALLEN_PROOF, FALLEN_HAMMER_TIME, FALLEN_RING_TEST, FALLEN_STRIKER, FALLEN_GLARE],
  encounters: [
    {
      id: fallenId('forge', 'proof'),
      court: 'forge',
      name: 'Proof Load',
      foeName: 'Linka Shackleby, Proof-Mistress',
      foeElement: 'bind',
      difficulty: 4,
      hpMult: 1.1,
      gimmick: fallenId('forge', 'proof'),
      at: { x: 1820, y: 760 },
      look: { body: 0xc8a080, accent: 0x3c4046, hat: 'bandana', traits: ['apron', 'tool', 'brand'], size: 1.05, eye: EYE },
      challenge: [
        'Every chain that walks the short down to the Sepulchre comes off my proving bed. Not one has parted.',
        'I wind it to half again what it will ever carry. Then I wait. Iron tells the truth if you wait.',
        'Stand clear of the bed, love. When a link goes, the chain goes round its anchor faster than you can.',
      ],
      beaten: [
        'Bridge chain. I made bridge chain. Big links, for the Runnel. People walk over it to get home.',
        'There was a chisel. I held a chisel for the mason, and collars came off. That was me. Wasn\'t it?',
      ],
      coins: 180,
    },
    {
      id: fallenId('forge', 'hammer-time'),
      court: 'forge',
      name: 'In the Great Hammer\'s Time',
      foeName: 'Tamsin Cogwell, Keeper of the Hammer',
      foeElement: 'sound',
      difficulty: 4,
      hpMult: 1.1,
      gimmick: fallenId('forge', 'hammer-time'),
      at: { x: 1470, y: 800 },
      look: { body: 0xd8b090, accent: 0x5a3a24, hat: 'cap', traits: ['book', 'tool', 'glasses'], size: 0.95, eye: EYE },
      challenge: [
        'Every smith on the Row strikes when the Great Hammer strikes. I grease the cam. I keep the book.',
        'A smith out of time is a smith with a tune in his head. Tunes are short. I write the name down.',
        'Listen for the beat, stranger. If you can\'t hear it, you\'re already in my book.',
      ],
      beaten: [
        'The cam. I greased the cam, and I counted the beats so the apprentices could learn the time.',
        'There was no book. I hummed along. Everyone hums to the Hammer. Why did I think that was a crime?',
      ],
      coins: 180,
    },
    {
      id: fallenId('forge', 'ring-test'),
      court: 'forge',
      name: 'The Ring Test',
      foeName: 'Verity Knoll, Ring-Tester',
      foeElement: 'crystal',
      difficulty: 5,
      hpMult: 1.15,
      gimmick: fallenId('forge', 'ring-test'),
      at: { x: 1060, y: 1320 },
      look: { body: 0xe0c0a0, accent: 0x6a4420, hat: 'coif', traits: ['apron', 'tool', 'scarf'], size: 1.0, eye: EYE },
      challenge: [
        'I strike every bell that leaves the pit. A true one sings the name on its lip. A flawed one clunks.',
        'Clunkers go back in the pot. So does anything stood too close when they go. Mind your feet.',
        'Let\'s hear what you\'re made of. I can always tell.',
      ],
      beaten: [
        'Pans. I tested pans, and cog-wheels for the mills, and once a bell for a wedding. A wedding.',
        'What names? There weren\'t any names on it. Just two, and a date, and a little cast heart.',
      ],
      coins: 195,
    },
    {
      id: fallenId('forge', 'striker'),
      court: 'forge',
      name: 'Between Hammer and Anvil',
      foeName: 'Absalom Strake, the Hall\'s Striker',
      foeElement: 'gravity',
      difficulty: 5,
      hpMult: 1.25,
      gimmick: fallenId('forge', 'striker'),
      at: { x: 1760, y: 1470 },
      look: { body: 0xa87858, accent: 0x2a2624, hat: 'none', traits: ['apron', 'beard', 'bandage'], size: 1.4, eye: EYE },
      challenge: [
        'I swung the sledge for every smith on the Row. Then the Prince paid better. Now I swing it for him.',
        'Whatever the Hook calls short, I put on an anvil. One swing. I have never needed a second.',
        'Stand where you like. There\'s always an anvil behind you, friend. I make sure of it.',
      ],
      beaten: [
        'Horseshoes. I struck for the farrier at the west gate, shoeing the dray horses. He paid me in pie.',
        'I never swung at a man in my life. My arms are tired as if I had. Whose arms are these?',
      ],
      coins: 195,
    },
    {
      id: fallenId('forge', 'glare'),
      court: 'forge',
      name: 'The Glare of Number Two',
      foeName: 'Bryony Hale, Keeper of Number Two',
      foeElement: 'light',
      difficulty: 5,
      hpMult: 1.2,
      gimmick: fallenId('forge', 'glare'),
      at: { x: 1100, y: 620 },
      look: { body: 0xd0a888, accent: 0x4a5664, hat: 'goggles', traits: ['apron', 'scarf', 'tool'], size: 1.1, eye: EYE },
      challenge: [
        'On tapping night there are four screens on the floor of Number Two, and nine hands. I say who stands where.',
        'The Prince\'s men get a screen. Tithe-short households get the glare. It\'s only fair. They\'re short.',
        'Find yourself some shade, stranger. If I let you.',
      ],
      beaten: [
        'Screens for everyone. I rolled them out myself, the first thing, every tap. The new lads first.',
        'I never left anyone in the glare. I couldn\'t have. I\'d have felt it on my own face.',
      ],
      coins: 200,
    },
  ],
};
