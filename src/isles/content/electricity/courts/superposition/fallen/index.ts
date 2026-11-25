import type { FallenBundle } from '../../../../../IslesTypes';
import { fallenId } from '../../../../meteor/spec';
import { FALLEN_EVERY_WAY } from './everyWay';
import { FALLEN_FACE_UP } from './faceUp';
import { FALLEN_NOTHING } from './nothing';
import { FALLEN_ONE_PLATE } from './onePlate';
import { FALLEN_RIPPLE } from './ripple';

/**
 * The Superposition Court's Fallen Five — in the star's telling, the people of the two-state town
 * who did the Grid's deciding for it: the assessor who billed the empty lots, the fountain-keeper
 * who tossed for whose house went dark, the enumerator who struck off the second soul in a state,
 * the Exchange operator who put every call through to the Coil, and the well-warden who let the
 * water find the hiding. Tier 4: difficulty 4,4,5,5,5; coins about double the court's 115.
 * They stand on ground the court's own five never use: the gate's east wing below the wall, the
 * east side of Either Square, the Box Yard's south lane, the Coil road's east verge, and the
 * well's east bank.
 */

const EYE = 0xffa040;

export const FALLEN: FallenBundle = {
  gimmicks: [FALLEN_NOTHING, FALLEN_FACE_UP, FALLEN_ONE_PLATE, FALLEN_EVERY_WAY, FALLEN_RIPPLE],
  encounters: [
    {
      id: fallenId('superposition', 'nothing'),
      court: 'superposition',
      name: 'Borrowed from Nothing',
      foeName: 'Assessor Nihil Prowse, Meter of the Empty Lots',
      foeElement: 'plasma',
      difficulty: 4,
      hpMult: 1.1,
      gimmick: fallenId('superposition', 'nothing'),
      at: { x: 1960, y: 1530 },
      look: { body: 0xc8bca8, accent: 0x9a6cff, hat: 'tophat', traits: ['book', 'glasses', 'satchel'], size: 1.05, eye: EYE },
      challenge: [
        'An empty lot is never empty here. Nothing borrows itself into being, then pays itself back. Constantly.',
        'Borrowing is drawing, and drawing is metered. I fitted a meter to nothing. The Grid was delighted.',
        'Watch the pairs. Break one and the other comes looking for whoever it is owed.',
      ],
      beaten: [
        'Empty lots. I swept them. Glass and nails and dandelions. There was never a meter. Was there?',
        'I think I only measured them for gardens. I think somebody planted beans in one.',
      ],
      coins: 230,
    },
    {
      id: fallenId('superposition', 'face-up'),
      court: 'superposition',
      name: 'Neither Face Up',
      foeName: 'Fountain-Keeper Mehitabel Spurge',
      foeElement: 'fortune',
      difficulty: 4,
      gimmick: fallenId('superposition', 'face-up'),
      at: { x: 1480, y: 980 },
      look: { body: 0xd8c4b0, accent: 0xc0703a, hat: 'beret', traits: ['apron', 'satchel', 'scarf'], size: 0.95, eye: EYE },
      challenge: [
        'Heads, the house stays lit. Tails, it goes dark. The Grid hates an undecided case, so I decide them.',
        'Every coin in my fountain landed on its edge. I made sure the ones I tossed never did.',
        'Call it, dearie. Go on. It is only ever both until it is the worse one.',
      ],
      beaten: [
        'Wishes. People threw coins for wishes, and I fished them out on Sundays for the orphans\' fund.',
        'I never tossed a house in my life. I only ever kept the water clean.',
      ],
      coins: 230,
    },
    {
      id: fallenId('superposition', 'one-plate'),
      court: 'superposition',
      name: 'One to a Plate',
      foeName: 'Enumerator Philippa Nack',
      foeElement: 'justice',
      difficulty: 5,
      hpMult: 1.15,
      gimmick: fallenId('superposition', 'one-plate'),
      at: { x: 400, y: 1000 },
      look: { body: 0xd0c0ac, accent: 0x45297e, hat: 'coif', traits: ['book', 'glasses', 'cane'], size: 1.0, eye: EYE },
      challenge: [
        'One soul to a state. That is the census. Two in one place is a clerical impossibility.',
        'When two are found standing on one plate, the second was never there. I strike them off. Neatly.',
        'Find a plate and keep it. You will not like being uncounted.',
      ],
      beaten: [
        'Counting. I counted for the bread line, so nobody got missed. So everybody got a loaf.',
        'I never struck anyone off. I wrote names in. I am sure I only ever wrote names in.',
      ],
      coins: 240,
    },
    {
      id: fallenId('superposition', 'every-way'),
      court: 'superposition',
      name: 'Every Way at Once',
      foeName: 'Exchange-Operator Lettice Quorn',
      foeElement: 'sound',
      difficulty: 5,
      hpMult: 1.15,
      gimmick: fallenId('superposition', 'every-way'),
      at: { x: 1500, y: 300 },
      look: { body: 0xe0ccb8, accent: 0x3fd8e8, hat: 'earmuffs', traits: ['glasses', 'scarf', 'tool'], size: 0.95, eye: EYE },
      challenge: [
        'Number, please. A call here goes down every line it could, until somebody picks up.',
        'Every whisper in this town came through my board. I put them all through to the Coil. Promptly.',
        'Stay on the line, caller. You are being connected everywhere at once.',
      ],
      beaten: [
        'Birthdays. Doctors. A boy calling his gran every night at nine. That is what I put through.',
        'I never listened in. Not once. Why do I remember every voice, then? Oh. Because I loved them.',
      ],
      coins: 250,
    },
    {
      id: fallenId('superposition', 'ripple'),
      court: 'superposition',
      name: 'Whoever the Ripple Finds',
      foeName: 'Well-Warden Clemency Drabble',
      foeElement: 'depths',
      difficulty: 5,
      hpMult: 1.25,
      gimmick: fallenId('superposition', 'ripple'),
      at: { x: 840, y: 1180 },
      look: { body: 0xb8b0a8, accent: 0x2a1a52, hat: 'souwester', traits: ['rod', 'scarf', 'pack'], size: 1.15, eye: EYE },
      challenge: [
        'My well has a manner. A ripple is everywhere on it at once — until it touches someone.',
        'The switched-off hid on my banks. I dropped a lead and let the water find them. It always did.',
        'Stand wherever you like, love. The ripple will decide where you were.',
      ],
      beaten: [
        'Soundings. I took soundings, so the children knew where the well went deep. That was all.',
        'The water never found anyone. I did. I pulled the Pettigrew boy out by his collar, once.',
      ],
      coins: 260,
    },
  ],
};
