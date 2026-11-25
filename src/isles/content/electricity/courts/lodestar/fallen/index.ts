import type { FallenBundle } from '../../../../../IslesTypes';
import { fallenId } from '../../../../meteor/spec';
import { FALLEN_CURIE } from './curie';
import { FALLEN_DUE_NORTH } from './dueNorth';
import { FALLEN_FREIGHT } from './freight';
import { FALLEN_INDUCTION } from './induction';
import { FALLEN_LOST_IRON } from './lostIron';

/**
 * The Lodestar Court's Fallen Five — in the star's telling, the iron-folk who kept the crag for
 * Prince Polar: the quarry's brake-hand who sailed stone over debtors' roofs, the coil-winder of
 * the Prince's iron doors, the picker who sold lost keys to the bailiffs, the farrier of the
 * lucky horseshoes, and the keeper who set north wherever the Prince liked. Tier 3: difficulty
 * 4,4,5,5,5; coins double the court's 100. They stand where the court's own five never go: the
 * Bellyard's north end, the open slate east of the stone, the Upper Row's west yard, the Halflife
 * road below the rose, and the observatory rise's east shoulder.
 */

const EYE = 0xffa040;

export const FALLEN: FallenBundle = {
  gimmicks: [FALLEN_LOST_IRON, FALLEN_INDUCTION, FALLEN_FREIGHT, FALLEN_CURIE, FALLEN_DUE_NORTH],
  encounters: [
    {
      id: fallenId('lodestar', 'lost-iron'),
      court: 'lodestar',
      name: 'Lost Iron',
      foeName: 'Stone-Picker Grusha Keddle',
      foeElement: 'ruin',
      difficulty: 4,
      gimmick: fallenId('lodestar', 'lost-iron'),
      at: { x: 1300, y: 330 },
      look: { body: 0xb49a84, accent: 0x5a2a1a, hat: 'headwrap', traits: ['satchel', 'tool', 'scarf'], size: 0.9, eye: EYE },
      challenge: [
        'Everything iron this crag ever lost, the stone keeps. Nails. Buckles. Keys. Especially keys.',
        'I pick them off its fur and I know whose door each one opened. The bailiffs pay by the key.',
        'You\'ve iron on you too, stranger. Let\'s shake some loose and see whose it is.',
      ],
      beaten: [
        'Keys... I hung them on a board by the stone. So folk could come and find their own. Didn\'t I?',
        'I never sold a key in my life. Why do I remember the weight of the purse?',
      ],
      coins: 200,
    },
    {
      id: fallenId('lodestar', 'induction'),
      court: 'lodestar',
      name: 'Induction',
      foeName: 'Coil-Winder Mattias Quellby',
      foeElement: 'tempest',
      difficulty: 4,
      gimmick: fallenId('lodestar', 'induction'),
      at: { x: 1560, y: 900 },
      look: { body: 0xd0b8a0, accent: 0x7a3f1a, hat: 'goggles', traits: ['glasses', 'apron', 'tool'], size: 1, eye: EYE },
      challenge: [
        'Nine hundred turns of copper on every coil. I count them as I wind. I never lose count.',
        'The Prince\'s iron doors run on my coils. A debtor\'s door shuts and stays shut. Good winding.',
        'You\'re a little magnet, did you know? Everyone up here is. Run through my coils and see.',
      ],
      beaten: [
        'I wound coils for the doctor\'s lamps. For the lighthouse. Not for doors. Never for doors.',
        'Nine hundred turns... I\'ve lost count. I never lose count. What was I winding?',
      ],
      coins: 200,
    },
    {
      id: fallenId('lodestar', 'freight'),
      court: 'lodestar',
      name: 'Freight Afloat',
      foeName: 'Brake-Hand Ilse Thrumbold',
      foeElement: 'pressure',
      difficulty: 5,
      hpMult: 1.1,
      gimmick: fallenId('lodestar', 'freight'),
      at: { x: 300, y: 450 },
      look: { body: 0xc0a088, accent: 0x262a3a, hat: 'miner', traits: ['tool', 'scarf', 'pack'], size: 1.2, eye: EYE },
      challenge: [
        'The quarry floats its stone on the field and I steer it home. Over the roofs is quickest.',
        'Nothing stops a floated block but my copper. Not a wall. Not a roof. Not you.',
        'Stand on my plates if you like. You\'ll wade. And if you dash, the eddies will have you.',
      ],
      beaten: [
        'I sailed the stone round the long way. Round Underhill, never over. I always went round.',
        'Whose roof was that, in the dream? I never — I braked. I always braked in time.',
      ],
      coins: 200,
    },
    {
      id: fallenId('lodestar', 'curie'),
      court: 'lodestar',
      name: 'The Curie Point',
      foeName: 'Farrier Bartholo Cudlipp',
      foeElement: 'fire',
      difficulty: 5,
      hpMult: 1.15,
      gimmick: fallenId('lodestar', 'curie'),
      at: { x: 960, y: 1400 },
      look: { body: 0xa88870, accent: 0x5a2a1a, hat: 'none', traits: ['apron', 'beard', 'tool'], size: 1.3, eye: EYE },
      challenge: [
        'A horseshoe over a door is luck, they say. Mine are for the Prince\'s men: they mark the house.',
        'Every blow up here drives the iron into you. Take enough and my shoes will want you back.',
        'The forge will burn it out of you. If you can stand the forge.',
      ],
      beaten: [
        'Luck. They were only ever for luck. I nailed one over Ada\'s door myself, the winter she was ill.',
        'Marked houses... I never marked a house. Did I? The forge is cold. Why is my forge cold?',
      ],
      coins: 200,
    },
    {
      id: fallenId('lodestar', 'due-north'),
      court: 'lodestar',
      name: 'Due North',
      foeName: 'Pole-Lamp Keeper Severin Ayle',
      foeElement: 'astra',
      difficulty: 5,
      hpMult: 1.2,
      gimmick: fallenId('lodestar', 'due-north'),
      at: { x: 2180, y: 640 },
      look: { body: 0xd8d0dc, accent: 0x2a3040, hat: 'earmuffs', traits: ['lantern', 'scarf', 'book'], size: 1.05, eye: EYE },
      challenge: [
        'Every compass on Voltreach answers to the stone. The stone answers to my lamp. I set north.',
        'Tonight the Prince would like north to be behind you. So it is. Turn round, if you can.',
        'Face true and the sky is kind. Face away and it reminds you. Shall we take a bearing?',
      ],
      beaten: [
        'I lit the pole-lamp for the night crews. So they could find their way home. That was all of it.',
        'North is... north is where it is. I couldn\'t move it if I tried. Could I?',
      ],
      coins: 200,
    },
  ],
};
