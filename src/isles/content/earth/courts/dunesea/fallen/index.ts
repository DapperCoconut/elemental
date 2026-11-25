import type { FallenBundle } from '../../../../../IslesTypes';
import { fallenId } from '../../../../meteor/spec';
import { FALLEN_BARCHAN } from './barchan';
import { FALLEN_DEVILS } from './devils';
import { FALLEN_QANAT } from './qanat';
import { FALLEN_RAML } from './raml';
import { FALLEN_SHADUF } from './shaduf';

/**
 * The Dunesea Court's Fallen Five — in the star's telling, the people of the dunes who worked for
 * Prince Sirocco: the pit-master whose shadufs dropped stone on households that dug short, the shepherd who set
 * the dune on the Sanded Camp, the keeper who sent the buried city's water to the palace, the
 * sand-reader who told him whose tent was next, and the dancer who called the hot wind down.
 * Tier 2: difficulty 4,4,4,5,5; coins double the court's 80. They stand on open ground the court's
 * own five never use: the dunes south of the Library, the north dunes east of the gorge, the road past
 * the caravanserai, the dunes south-east of the oasis, and the flats above the Sanded Camp.
 */

const EYE = 0xffa040;
const COINS = 160;

export const FALLEN: FallenBundle = {
  gimmicks: [FALLEN_SHADUF, FALLEN_BARCHAN, FALLEN_QANAT, FALLEN_RAML, FALLEN_DEVILS],
  encounters: [
    {
      id: fallenId('dunesea', 'shaduf'),
      court: 'dunesea',
      name: 'Over the Pole',
      foeName: 'Hamid, Shaduf-Master',
      foeElement: 'gravity',
      difficulty: 4,
      hpMult: 1.1,
      gimmick: fallenId('dunesea', 'shaduf'),
      at: { x: 1000, y: 430 },
      look: { body: 0xa0704c, accent: 0x5a3a22, hat: 'headwrap', traits: ['beard', 'tool', 'apron'], size: 1.25, eye: EYE },
      challenge: [
        'A shaduf is a kind machine. Stone in the bucket, weight on the end, and up it all comes. No back broken.',
        'When a house digs short, I simply let go of the rope. The stone comes back down. On the house.',
        'Mind the rings in the sand, friend. I never miss a ring.',
      ],
      beaten: [
        'I lifted water. Just water, out of the Hazims\' pit, for the date palms. Bucket after bucket.',
        'I never let go of a rope in my life. You don\'t let go. Everyone in Hamra knows you don\'t let go.',
      ],
      coins: COINS,
    },
    {
      id: fallenId('dunesea', 'barchan'),
      court: 'dunesea',
      name: 'The Barchan Walks',
      foeName: 'Yusra, Dune-Shepherd',
      foeElement: 'earth',
      difficulty: 4,
      hpMult: 1.1,
      gimmick: fallenId('dunesea', 'barchan'),
      at: { x: 1450, y: 380 },
      look: { body: 0xc8966a, accent: 0x8a5a28, hat: 'straw', traits: ['cane', 'scarf', 'pack'], size: 1.0, eye: EYE },
      challenge: [
        'A dune is only a flock of sand. You walk ahead of it, you tap it with the crook, and it follows you home.',
        'The Prince names a tent. I bring the flock. By morning there is no tent, only a very nice hill.',
        'Stand there, dear. She\'s coming the way you\'re facing.',
      ],
      beaten: [
        'Palm-frond fences. I planted fences, rows and rows, so the dune would stop short of the camp.',
        'I never led one in. I spent my whole life turning them away. Why does my crook feel so heavy?',
      ],
      coins: COINS,
    },
    {
      id: fallenId('dunesea', 'qanat'),
      court: 'dunesea',
      name: 'Down the Qanat',
      foeName: 'Samir, Qanat-Keeper',
      foeElement: 'water',
      difficulty: 4,
      hpMult: 1.15,
      gimmick: fallenId('dunesea', 'qanat'),
      at: { x: 1760, y: 800 },
      look: { body: 0x9a7050, accent: 0x1e5e6a, hat: 'bandana', traits: ['tool', 'apron', 'beard'], size: 1.2, eye: EYE },
      challenge: [
        'Forty shafts from the mother well to the Palace of Winds. I know every one by the sound it makes.',
        'Water runs downhill, and downhill is where the Prince lives. Nobody can argue with a slope.',
        'Mind the mouths. Some of them go further down than you\'d like.',
      ],
      beaten: [
        'I dug that tunnel to the oasis. Forty shafts, on my back, with a lamp. To the oasis. For everyone.',
        'The Palace never had a drop of it. I made sure. Why would I remember it the other way round?',
      ],
      coins: COINS,
    },
    {
      id: fallenId('dunesea', 'raml'),
      court: 'dunesea',
      name: 'The Sixteen Figures',
      foeName: 'Leyla, Sand-Reader',
      foeElement: 'fate',
      difficulty: 5,
      hpMult: 1.2,
      gimmick: fallenId('dunesea', 'raml'),
      at: { x: 2150, y: 1150 },
      look: { body: 0xc89a76, accent: 0x34346e, hat: 'hood', traits: ['glasses', 'book', 'scarf'], size: 0.95, eye: EYE },
      challenge: [
        'Four rows, one dot or two. Sixteen figures in all, and every one of them a house on the Strand.',
        'The Prince asks me whose tent the dune should take. I only ask the sand. The sand is never wrong.',
        'Sit, sit. Let me read yours. Oh. Oh, dear. That is a great many single dots.',
      ],
      beaten: [
        'Coppers. I read for coppers, at the caravanserai gate. Love, journeys, a lost goat. Always kind ones.',
        'I never read a house for the Prince. I would have scuffed the figure first. I did, once. I think.',
      ],
      coins: COINS,
    },
    {
      id: fallenId('dunesea', 'devils'),
      court: 'dunesea',
      name: 'Devils in the Dust',
      foeName: 'Soraya, Wind-Dancer',
      foeElement: 'tempest',
      difficulty: 5,
      hpMult: 1.25,
      gimmick: fallenId('dunesea', 'devils'),
      at: { x: 850, y: 1300 },
      look: { body: 0xd0a07a, accent: 0xe8a628, hat: 'veil', traits: ['scarf', 'satchel'], size: 0.95, eye: EYE },
      challenge: [
        'I dance on the palace roof between the windcatchers, and the hot wind\'s little ones come down to watch.',
        'They go where I point. Mostly at roofs. Sometimes at people who stand about asking questions.',
        'Throw whatever you like at me, darling. They\'re hungry.',
      ],
      beaten: [
        'Weddings. I danced at weddings in the camp, and the children spun round after me like little whirlwinds.',
        'I never called anything down on anyone. I only ever spun until I was dizzy and fell down laughing.',
      ],
      coins: COINS,
    },
  ],
};
