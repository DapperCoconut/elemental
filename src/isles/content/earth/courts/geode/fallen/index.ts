import type { FallenBundle } from '../../../../../IslesTypes';
import { fallenId } from '../../../../meteor/spec';
import { FALLEN_EYE_CLEAN } from './eyeClean';
import { FALLEN_ICELAND_SPAR } from './icelandSpar';
import { FALLEN_SCRATCH_TEST } from './scratchTest';
import { FALLEN_SHUT_GEODE } from './shutGeode';
import { FALLEN_STILL_WATER } from './stillWater';

/**
 * The Geode Court's Fallen Five — in the star's telling, the people of the split geode who did
 * the grading for Prince Facet: the reader at the Loupe Table, the keeper of the still pool, the
 * assayer with his hardness scale, the spar-cutter who made the Prince's sighting-glass, and the
 * resealer who closed geodes back up for the Regent. Tier 3: difficulty 4,4,5,5,5; coins double
 * the court's 90. They stand where the court's own five do not: under the Druse Gardens by the
 * Cleft wall, on the pool's north lip, at the end of Lapidaries' Row, between the gardens and the
 * square, and on the avenue east of Prism Square.
 */

const EYE = 0xffa040;
const COINS = 180;

export const FALLEN: FallenBundle = {
  gimmicks: [FALLEN_EYE_CLEAN, FALLEN_STILL_WATER, FALLEN_SCRATCH_TEST, FALLEN_ICELAND_SPAR, FALLEN_SHUT_GEODE],
  encounters: [
    {
      id: fallenId('geode', 'eye-clean'),
      court: 'geode',
      name: 'Eye-Clean',
      foeName: 'Ottoline Sabe, Loupe-Reader',
      foeElement: 'psychic',
      difficulty: 4,
      gimmick: fallenId('geode', 'eye-clean'),
      at: { x: 320, y: 460 },
      look: { body: 0xe0d0c0, accent: 0xc8a050, hat: 'hood', traits: ['glasses', 'book'], size: 0.95, eye: EYE },
      challenge: [
        'I have held the glass over eleven thousand stones. Not one of them was clean. Not one. Shall we look at yours?',
        'A flaw is only a blow the stone remembers. Keep still and pretty and nobody need find it.',
        'Hold it up to the light, dear. There. You see? Everyone flinches eventually.',
      ],
      beaten: [
        'I read stones at the Table... and I lied for the households. I called a crack a shadow, every season.',
        'Clean. I used to say clean, and wink. Why does the glass in my hand feel so heavy now?',
      ],
      coins: COINS,
    },
    {
      id: fallenId('geode', 'still-water'),
      court: 'geode',
      name: 'Still Water',
      foeName: 'Ysolde Brack, Pool-Keeper',
      foeElement: 'memory',
      difficulty: 4,
      gimmick: fallenId('geode', 'still-water'),
      at: { x: 1100, y: 1110 },
      look: { body: 0xd0c4b8, accent: 0x5a7ab8, hat: 'veil', traits: ['scarf', 'lantern'], size: 1, eye: EYE },
      challenge: [
        'Not a ripple in forty years. The Prince looks down from the Cutting-House and reads every face in it.',
        'Water keeps what it is shown. Stand on my bank and you have given it something to keep.',
        'Wade in if you like. The pool is patient. It drags, and it waits.',
      ],
      beaten: [
        'Still... no. I used to stir it. Every night, with an oar, so he could never read anyone in it.',
        'My pool was always moving. I made sure of it. Who told the water to lie still for him?',
      ],
      coins: COINS,
    },
    {
      id: fallenId('geode', 'scratch-test'),
      court: 'geode',
      name: 'Scratch Test',
      foeName: 'Assayer Benedek Rull',
      foeElement: 'metal',
      difficulty: 5,
      gimmick: fallenId('geode', 'scratch-test'),
      at: { x: 800, y: 1400 },
      look: { body: 0xc8b8a8, accent: 0x56505e, hat: 'cap', traits: ['tool', 'glasses', 'beard'], size: 1.1, eye: EYE },
      challenge: [
        'Talc to diamond. Ten steps. One stroke of the file tells me where a household stands on them.',
        'The soft go down to the Sepulchre. The hard go on paying. It is not cruelty. It is mineralogy.',
        'You are chalk, stranger. Climb, if you can. I have climbed this scale every morning for thirty years.',
      ],
      beaten: [
        'I kept the scale for the children. Taught them talc from gypsum with a fingernail. Only that.',
        'A file is for testing stone, not people. I knew that once. I think I always knew that.',
      ],
      coins: COINS,
    },
    {
      id: fallenId('geode', 'iceland-spar'),
      court: 'geode',
      name: 'Iceland Spar',
      foeName: 'Spar-Cutter Hedda Vink',
      foeElement: 'plasma',
      difficulty: 5,
      hpMult: 1.05,
      gimmick: fallenId('geode', 'iceland-spar'),
      at: { x: 850, y: 600 },
      look: { body: 0xe8d8c8, accent: 0xc8f0ff, hat: 'goggles', traits: ['apron', 'tool'], size: 1, eye: EYE },
      challenge: [
        'I cut the Prince his sighting-glass from clear spar. Through it he sees every runaway twice.',
        'Calcite splits a thing in two and sends both halves where you did not look. Mind the near side.',
        'Stand still and I will slide a rhomb across you. Move, and my rays will find you anyway.',
      ],
      beaten: [
        'Spar... I ground lenses for the old miners\' lamps. So they could see their way up. That is all.',
        'Two of everything. I see two of you. One of you looks like a friend. Which one is real?',
      ],
      coins: COINS,
    },
    {
      id: fallenId('geode', 'shut-geode'),
      court: 'geode',
      name: 'The Shut Geode',
      foeName: 'Resealer Dunstan Quarle',
      foeElement: 'gravity',
      difficulty: 5,
      hpMult: 1.15,
      gimmick: fallenId('geode', 'shut-geode'),
      at: { x: 1620, y: 860 },
      look: { body: 0xb89878, accent: 0x2e1650, hat: 'helmet', traits: ['tool', 'beard', 'brand'], size: 1.35, eye: EYE },
      challenge: [
        'The Regent buries what he cannot rule. Some things are too small for the Sepulchre. Those come to me.',
        'Two halves, a little paste, a tap of the mallet, and the stone is whole again. Nobody ever looks inside.',
        'Get in, or get out past the tips. Those are the only two ways a geode has ever worked.',
      ],
      beaten: [
        'I... opened them. That was my trade. I split geodes for the market. I never closed one in my life.',
        'Everything I ever cracked, I let out. Why do my hands remember the paste?',
      ],
      coins: COINS,
    },
  ],
};
