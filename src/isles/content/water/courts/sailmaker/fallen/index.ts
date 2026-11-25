import type { FallenBundle } from '../../../../../IslesTypes';
import { fallenId } from '../../../../meteor/spec';
import { FALLEN_CUT_TO_PATTERN } from './cutToPattern';
import { FALLEN_LAST_STITCH } from './lastStitch';
import { FALLEN_SHORT_MEASURE } from './shortMeasure';
import { FALLEN_SHROUDS_AND_STAYS } from './shroudsAndStays';
import { FALLEN_YARD_A_HEAD } from './yardAHead';

/**
 * The Sailmaker's Court's Fallen Five — in the star's telling, the cliff-top people who kept the
 * Yardage for the crown: the loftsman who kept the tally, the Measurer who read the tape, the widow
 * who sewed the drowned into their shrouds, the master cutter who taught Hem to cut, and the topman
 * bought with a captain's coat. Tier 2: difficulty 4,4,4,5,5; coins double the court's 55.
 * They stand on open ground the court's own five never use: the fleet road by the quilting yard,
 * the Brine Road below the Loom lane, the cove path's head, Loft Row's west end, and the rigging
 * yard's south gate.
 */

const EYE = 0xffa040;

export const FALLEN: FallenBundle = {
  gimmicks: [FALLEN_YARD_A_HEAD, FALLEN_SHORT_MEASURE, FALLEN_LAST_STITCH, FALLEN_CUT_TO_PATTERN, FALLEN_SHROUDS_AND_STAYS],
  encounters: [
    {
      id: fallenId('sailmaker', 'yard-a-head'),
      court: 'sailmaker',
      name: 'Yard a Head',
      foeName: 'Tallyman Ludd',
      foeElement: 'fortune',
      difficulty: 4,
      hpMult: 1.1,
      gimmick: fallenId('sailmaker', 'yard-a-head'),
      at: { x: 1500, y: 990 },
      look: { body: 0xd8c0a0, accent: 0x2a6a68, hat: 'tophat', traits: ['book', 'satchel'], size: 1.0, eye: EYE },
      challenge: [
        'A yard a head, a head a day. I don\'t make the rule. I only keep the book, and the book is never wrong.',
        'The Hobbes were short on Tuesday. The Pellows on Friday. I wrote them down. Now they\'re roofs in the cove.',
        'Pick up a bolt, stranger. Let\'s see whose name is short at dusk.',
      ],
      beaten: [
        'Short again... no. No, I kept the book for the lifeboat fund. Pennies for the cove. Didn\'t I?',
        'I never wrote a neighbour down in my life. So why do I know every name in that book?',
      ],
      coins: 110,
    },
    {
      id: fallenId('sailmaker', 'short-measure'),
      court: 'sailmaker',
      name: 'Short Measure',
      foeName: 'Measurer Quint',
      foeElement: 'justice',
      difficulty: 4,
      hpMult: 1.0,
      gimmick: fallenId('sailmaker', 'short-measure'),
      at: { x: 1720, y: 860 },
      look: { body: 0xd0c4b4, accent: 0x13484a, hat: 'wig', traits: ['cane', 'glasses'], size: 1.1, eye: EYE },
      challenge: [
        'An ell is forty-five inches. It is forty-five inches because the Measurers say so, and I am the Measurers.',
        'Stand where I say and the tape reads true. Stand anywhere else and the tape reads you short.',
        'Hold still. I am measuring you for what you owe.',
      ],
      beaten: [
        'Forty-five inches... I measured children. For coats, before the winter. That was the only measure I took.',
        'My tape is so heavy. Was it always brass? I remember it being cloth.',
      ],
      coins: 110,
    },
    {
      id: fallenId('sailmaker', 'last-stitch'),
      court: 'sailmaker',
      name: 'The Last Stitch',
      foeName: 'Widow Thole',
      foeElement: 'death',
      difficulty: 4,
      hpMult: 1.15,
      gimmick: fallenId('sailmaker', 'last-stitch'),
      at: { x: 620, y: 1010 },
      look: { body: 0xc8bcb0, accent: 0x2a2420, hat: 'veil', traits: ['tool', 'apron'], size: 0.95, eye: EYE },
      challenge: [
        'Forty houses went under at Lowstitch. I sewed every sleeper into good canvas first. The Queen wanted it neat.',
        'Seven stitches to a shroud, dear, and the last one through the nose. To be sure. It\'s only kind.',
        'Hold still and I\'ll make it tidy.',
      ],
      beaten: [
        'The last stitch... I sewed christening gowns. Little ones. Lace at the hem. I\'m sure of it.',
        'Whose shrouds were those, then? I can feel the needle in my hand, and I never held one for that.',
      ],
      coins: 110,
    },
    {
      id: fallenId('sailmaker', 'cut-to-pattern'),
      court: 'sailmaker',
      name: 'Cut to Pattern',
      foeName: 'Master Cutter Selvage',
      foeElement: 'chalk',
      difficulty: 5,
      hpMult: 1.2,
      gimmick: fallenId('sailmaker', 'cut-to-pattern'),
      at: { x: 560, y: 760 },
      look: { body: 0xe0c8a8, accent: 0x27407a, hat: 'beret', traits: ['glasses', 'tool'], size: 1.05, eye: EYE },
      challenge: [
        'I taught Hem to cut when he was nine. Measure twice, cut once, and never apologise to the cloth.',
        'A sail is lofted full size, chalk on the floor. Then the shears go round, and what\'s inside comes away.',
        'You\'re standing on my pattern. That makes you part of the panel.',
      ],
      beaten: [
        'Never apologise to the cloth... I told the boy to be kind to it. Kind. That was the whole lesson.',
        'Did I teach him that? Or did someone teach him after me? My chalk\'s gone soft.',
        'I\'m sorry. To the cloth, and to you.',
      ],
      coins: 110,
    },
    {
      id: fallenId('sailmaker', 'shrouds-and-stays'),
      court: 'sailmaker',
      name: 'Shrouds and Stays',
      foeName: 'Topman Ruan Halse',
      foeElement: 'gunpowder',
      difficulty: 5,
      hpMult: 1.25,
      gimmick: fallenId('sailmaker', 'shrouds-and-stays'),
      at: { x: 1960, y: 470 },
      look: { body: 0xc89a72, accent: 0x2a3a6a, hat: 'tricorn', traits: ['scarf', 'eyepatch'], size: 1.15, eye: EYE },
      challenge: [
        'Best topman on the cliff. The Queen gave me a captain\'s coat for it, and a musket to keep it with.',
        'From the crosstrees I can see every loft, every walk, every family short a yard. I see you, too.',
        'Come on up, if you can climb. Mind the stays. I won\'t.',
      ],
      beaten: [
        'A captain\'s coat... I never had one. I taught the riggers\' boys to climb. For nothing. For fun.',
        'Down here it all looks different. Smaller. Like it wasn\'t ever mine to see.',
      ],
      coins: 110,
    },
  ],
};
