import type { FallenBundle } from '../../../../../IslesTypes';
import { fallenId } from '../../../../meteor/spec';
import { FALLEN_FLOUR } from './flour';
import { FALLEN_PINNED } from './pinned';
import { FALLEN_ROPEWALK } from './ropewalk';
import { FALLEN_SAILS } from './sails';
import { FALLEN_WEATHER_HOUSE } from './weatherHouse';

/**
 * The Galeward Court's Fallen Five — in the star's telling, the trades of the mill town that served
 * the Breath Tax with their hands: the smith who pinned every vane to point at the toll, the
 * sailmaker who cut confiscated balloons into mill canvas, the sifter who bolted the King's share
 * out of every sack, the ropemaker who twisted the cord over every cork, and the keeper who read
 * Prince Zephyr's weather-house and said when the meters billed double. Tier 1: difficulty
 * 4,4,4,5,5; coins double the court's 65. They stand where the court's own five never fight: the
 * head of Mill Row by the Weather House drive, the west end under the post mills, the lane below
 * the Millstone's mill, the yard south of the Ropewalk, and the head of the Gorge.
 */

const EYE = 0xffa040;

export const FALLEN: FallenBundle = {
  gimmicks: [FALLEN_PINNED, FALLEN_SAILS, FALLEN_FLOUR, FALLEN_ROPEWALK, FALLEN_WEATHER_HOUSE],
  encounters: [
    {
      id: fallenId('galeward', 'pinned'),
      court: 'galeward',
      name: 'Wherever the Pin Goes',
      foeName: 'Ottilie Fairweather, Vane-Smith',
      foeElement: 'magnet',
      difficulty: 4,
      hpMult: 1.05,
      gimmick: fallenId('galeward', 'pinned'),
      at: { x: 980, y: 470 },
      look: { body: 0xc8a888, accent: 0x7e5c20, hat: 'goggles', traits: ['apron', 'tool'], size: 1.1, eye: EYE },
      challenge: [
        'Every vane in Galeward points at the toll. I forged the collar on each one and drove the pin myself.',
        'The wind blows where it likes, they say. Not here. Here it blows where I put the pin.',
        'Stand still a moment, dear. I only need you still for a moment.',
      ],
      beaten: [
        'I mended vanes. Weathercocks that stuck in the frost. I oiled them so they\'d turn. So they\'d turn.',
        'Did I ever pin one? My hands say I pinned a thousand. My hands are lying. Aren\'t they?',
      ],
      coins: 130,
    },
    {
      id: fallenId('galeward', 'sails'),
      court: 'galeward',
      name: 'Loose Canvas',
      foeName: 'Dorcas Whipple, Sailmaker',
      foeElement: 'cloth',
      difficulty: 4,
      gimmick: fallenId('galeward', 'sails'),
      at: { x: 760, y: 1300 },
      look: { body: 0xe4c8ac, accent: 0xf1e8d2, hat: 'bandana', traits: ['apron', 'satchel', 'glasses'], size: 0.95, eye: EYE },
      challenge: [
        'Balloon silk makes a lovely mill sail. Light. Strong. The collectors bring it me still warm.',
        'I sew in the debtor\'s yard, so he can watch his sky go round on somebody else\'s mill.',
        'Wind\'s getting up. Mind the canvas — it doesn\'t know whose side it\'s on, and neither do I.',
      ],
      beaten: [
        'I patched sails. Torn ones, after storms. I never cut a balloon. I never — whose silk was that?',
        'Barnaby\'s. It was blue and white. I think I helped him sew it, once. Before. Was there a before?',
      ],
      coins: 130,
    },
    {
      id: fallenId('galeward', 'flour'),
      court: 'galeward',
      name: 'The Bolting Loft',
      foeName: 'Sifter Deverell',
      foeElement: 'fire',
      difficulty: 4,
      hpMult: 1.1,
      gimmick: fallenId('galeward', 'flour'),
      at: { x: 150, y: 760 },
      look: { body: 0xd8c0a8, accent: 0xf6f0e2, hat: 'cap', traits: ['apron', 'beard', 'pipe'], size: 1.15, eye: EYE },
      challenge: [
        'The white goes up the lift to the King. The chaff comes down to the miller\'s children. That\'s bolting.',
        'Nobody ever saw me sweep the loft. Fine flour hangs in the air, friend. It waits for a spark.',
        'Go on. Shoot at me. I\'ve been hoping somebody would.',
      ],
      beaten: [
        'I swept. Every night. Nobody saw because it was clean by morning. I was proud of that.',
        'The King\'s share… there wasn\'t one. We baked it. We ate it. The children ate the white.',
      ],
      coins: 130,
    },
    {
      id: fallenId('galeward', 'ropewalk'),
      court: 'galeward',
      name: 'The Long Lay',
      foeName: 'Hesper Lay, Ropemaker',
      foeElement: 'bind',
      difficulty: 5,
      hpMult: 1.15,
      gimmick: fallenId('galeward', 'ropewalk'),
      at: { x: 1380, y: 1110 },
      look: { body: 0xb8906e, accent: 0x8a6c3c, hat: 'beanie', traits: ['apron', 'tool', 'satchel'], size: 1.05, eye: EYE },
      challenge: [
        'I make one cord. Fine, waxed, three-ply. It goes over the cork on every bottle of breath on the isle.',
        'And the collars for the cots, so the becalmed don\'t roll off in their sleep. Kindness, that.',
        'Walk the ropewalk with me. It\'s a long lay, and I\'ve never once let go of the top.',
      ],
      beaten: [
        'Bridge rope. Kite line. Washing line for the whole of Vane Street. That was my rope. Wasn\'t it?',
        'I never tied a cork in my life. Then why can I feel the wax under my nails?',
      ],
      coins: 140,
    },
    {
      id: fallenId('galeward', 'weather-house'),
      court: 'galeward',
      name: 'Out Comes the Foul Man',
      foeName: 'Mother Hygrove, Keeper of the Weather House',
      foeElement: 'tempest',
      difficulty: 5,
      hpMult: 1.2,
      gimmick: fallenId('galeward', 'weather-house'),
      at: { x: 1900, y: 900 },
      look: { body: 0xe0ccb8, accent: 0x3a4458, hat: 'veil', traits: ['cane', 'glasses', 'book'], size: 0.95, eye: EYE },
      challenge: [
        'I read the little house for the Prince every morning. Out comes the Maid, out comes the Man.',
        'On a Foul Man day every breath on the meters bills at double. I say when it\'s a Foul Man day.',
        'Feel that damp, dear? The gut\'s twisting. Somebody\'s about to get the weather.',
      ],
      beaten: [
        'It was a toy. On the mantel. I dusted it. The children used to bet sweets on which one came out.',
        'Nobody ever paid double for anything. Did they? Why do I remember the bills in my own hand?',
      ],
      coins: 140,
    },
  ],
};
