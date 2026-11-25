import type { FallenBundle } from '../../../../../IslesTypes';
import { fallenId } from '../../../../meteor/spec';
import { FALLEN_BELLOWS } from './bellows';
import { FALLEN_COFFLE } from './coffle';
import { FALLEN_EVERY_WINDOW } from './everyWindow';
import { FALLEN_HUNG_OUT } from './hungOut';
import { FALLEN_KILN_CART } from './kilnCart';

/**
 * The Hearth Court's Fallen Five — in the star's telling, the people of the chimney town who kept
 * the tithe for the crown: the warder who chained the cold-hearth families, the washerwoman who
 * read the lines, the neighbour at the window, the carter of the Kiln cart, and the bellows-hand
 * who pumped the fires hotter for gold. Tier 1: difficulty 4,4,4,5,5; coins double the court's 30.
 * They stand on open ground the court's own five never use: the cross street east, the alley by
 * the laundry, the upper terrace east, the Caldera road, and the coal yard by the bunker.
 */

const EYE = 0xffa040;

export const FALLEN: FallenBundle = {
  gimmicks: [FALLEN_COFFLE, FALLEN_HUNG_OUT, FALLEN_EVERY_WINDOW, FALLEN_KILN_CART, FALLEN_BELLOWS],
  encounters: [
    {
      id: fallenId('hearth', 'coffle'),
      court: 'hearth',
      name: 'The Coffle',
      foeName: 'Kiln-Warder Haskett',
      foeElement: 'bind',
      difficulty: 4,
      hpMult: 1.1,
      gimmick: fallenId('hearth', 'coffle'),
      at: { x: 1650, y: 840 },
      look: { body: 0xb08868, accent: 0x2a2624, hat: 'helmet', traits: ['brand', 'tool', 'beard'], size: 1.3, eye: EYE },
      challenge: [
        'Cold hearth on Tanner Row. Cold hearth on Pell Street. And you, with no hearth at all.',
        'I walk them up to the Kiln on one long chain. They go quiet by the second terrace. They always do.',
        'Hold out your wrists. It is easier for everyone if you hold out your wrists.',
      ],
      beaten: [
        'The chain... I carried water. For the bucket line, when the Flewitts\' roof went up. Didn\'t I?',
        'I never held a chain in my life. I held a bucket. Why does my hand remember a chain?',
      ],
      coins: 60,
    },
    {
      id: fallenId('hearth', 'hung-out'),
      court: 'hearth',
      name: 'Hung Out to Dry',
      foeName: 'Nell Pegg, Washerwoman',
      foeElement: 'cloth',
      difficulty: 4,
      gimmick: fallenId('hearth', 'hung-out'),
      at: { x: 300, y: 1180 },
      look: { body: 0xe0b896, accent: 0x6b5a4e, hat: 'bandana', traits: ['apron', 'satchel'], size: 1.0, eye: EYE },
      challenge: [
        'Wash tells you everything, love. Soot on a collar. Blood on a cuff. A cold-hearth smell on a blanket.',
        'I hang it, I read it, I walk it up to Mister Quill\'s book. Every Tuesday. Regular as linen.',
        'Mind the lines. I\'ve got you pegged.',
      ],
      beaten: [
        'I... took in washing. That\'s all I did. Sheets and shirts, and I gave the buttons back.',
        'I never told anyone anything. I never — whose cuff was that? Why can I see the cuff?',
      ],
      coins: 60,
    },
    {
      id: fallenId('hearth', 'every-window'),
      court: 'hearth',
      name: 'Every Window Watched',
      foeName: 'Corva Dace, Across the Lane',
      foeElement: 'shadow',
      difficulty: 4,
      gimmick: fallenId('hearth', 'every-window'),
      at: { x: 2100, y: 480 },
      look: { body: 0xd8c0a8, accent: 0x2e2a30, hat: 'hood', traits: ['scarf', 'glasses', 'book'], size: 0.92, eye: EYE },
      challenge: [
        'I keep a candle in my window. So I can see. So everyone on the lane knows I can see.',
        'The Brandts dimmed at nine on Thursday. The Ashbys at ten. I wrote it down. I write it all down.',
        'You\'ve been seen, dear. You were seen the moment you came up the stairs.',
      ],
      beaten: [
        'The window boxes. I was watering the window boxes. Geraniums. I only ever looked at geraniums.',
        'Did I write names? I can\'t find the book. I don\'t think there was ever a book.',
      ],
      coins: 60,
    },
    {
      id: fallenId('hearth', 'kiln-cart'),
      court: 'hearth',
      name: 'The Kiln Cart',
      foeName: 'Dorrit Mapp, Carter',
      foeElement: 'magnet',
      difficulty: 5,
      hpMult: 1.15,
      gimmick: fallenId('hearth', 'kiln-cart'),
      at: { x: 1200, y: 660 },
      look: { body: 0xa87c5c, accent: 0x3b3633, hat: 'cap', traits: ['pipe', 'satchel', 'brand'], size: 1.15, eye: EYE },
      challenge: [
        'Iron cart, iron wheels, iron road up the hill. The Kiln eats at dusk and I bring the plate.',
        'I don\'t look back at what I\'m carrying. You learn that the first week. Never look back.',
        'Bell\'s ringing. Best get off my road.',
      ],
      beaten: [
        'Coal. I drove coal. Down to the port, the long way round. Coal, not... not people.',
        'Why would I tell myself it was people? Who wants me to think it was people?',
      ],
      coins: 70,
    },
    {
      id: fallenId('hearth', 'bellows'),
      court: 'hearth',
      name: 'The Bellows Breathe',
      foeName: 'Grue, the Bellows-Hand',
      foeElement: 'pressure',
      difficulty: 5,
      hpMult: 1.25,
      gimmick: fallenId('hearth', 'bellows'),
      at: { x: 760, y: 1520 },
      look: { body: 0x9c6c4c, accent: 0x4a2c1c, hat: 'none', traits: ['apron', 'beard', 'bandage'], size: 1.4, eye: EYE },
      challenge: [
        'Prince pays me in gold to make the tithe fires roar on counting nights. Best wage on the hill.',
        'They called me a hero once. A hero\'s a man who hasn\'t been offered enough yet.',
        'Stand in the draught. Let\'s see how you burn.',
      ],
      beaten: [
        'I pulled the Tanner twins out of a flue fire. Bare hands. That was me. That was real.',
        'Nobody paid me. Nobody ever paid me. I think I liked it better that way.',
      ],
      coins: 70,
    },
  ],
};
