import type { FallenBundle } from '../../../../../IslesTypes';
import { fallenId } from '../../../../meteor/spec';
import { FALLEN_BULL } from './carnivalBull';
import { FALLEN_FACE_VALUE } from './faceValue';
import { FALLEN_GIDDY } from './giddyWaltz';
import { FALLEN_LAST_BOAT } from './lastBoat';
import { FALLEN_QUICKSILVER } from './quicksilver';

/**
 * The Masquerade Court's Fallen Five — in the star's telling, the canal town's people who kept the
 * Maestro's choir faceless: the silverer whose mercury let the Tuners read through any mask, the
 * fitter who fitted the plaster faces of the muted, the night-caller on the landings, the warden
 * of the carnival bull, and the Prince's own dancing-mistress. Tier 3: difficulty 5 throughout;
 * coins double the court's 125. They stand where the court's own five never go: the Campo della
 * Danza's west end, the Campo Facciata, the east campo below the Teatrino, the south campo by the
 * Rio's far bridge, and the riva between the mask shops.
 */

const EYE = 0xffa040;
const COINS = 250;

export const FALLEN: FallenBundle = {
  gimmicks: [FALLEN_QUICKSILVER, FALLEN_FACE_VALUE, FALLEN_LAST_BOAT, FALLEN_BULL, FALLEN_GIDDY],
  encounters: [
    {
      id: fallenId('masque', 'quicksilver'),
      court: 'masque',
      name: 'Quicksilver Spill',
      foeName: 'Silverer Zanetta Morosin',
      foeElement: 'metal',
      difficulty: 5,
      hpMult: 1.1,
      gimmick: fallenId('masque', 'quicksilver'),
      at: { x: 300, y: 560 },
      look: { body: 0xc8d0d8, accent: 0x6a7a8c, hat: 'goggles', traits: ['apron', 'glasses', 'tool'], size: 1, eye: EYE },
      challenge: [
        'Quicksilver behind the glass, dear. That is what makes a mirror. And a Tuner\'s reading-glass.',
        'Through my lenses a mask is a window. The Part on the brow, the face behind it. Clear as day.',
        'Mind the floor. It runs to warm things.',
      ],
      beaten: [
        'Lenses? I... silvered looking-glasses. For brides. So they could see themselves. Didn\'t I?',
        'My hands shake. They always shook. Mercury does that. Why do I remember grinding lenses?',
      ],
      coins: COINS,
    },
    {
      id: fallenId('masque', 'face-value'),
      court: 'masque',
      name: 'Face Value',
      foeName: 'Fitter Ginevra Stucchi',
      foeElement: 'paper',
      difficulty: 5,
      gimmick: fallenId('masque', 'face-value'),
      at: { x: 1250, y: 640 },
      look: { body: 0xe4ccb0, accent: 0xf2ece4, hat: 'domino', traits: ['apron', 'tool', 'mask'], size: 0.95, eye: EYE },
      challenge: [
        'Every face in this court is fitted by me. Snug at the cheek, the Part square on the brow.',
        'The muted get plaster. Plain white, no Part at all. It sets in an hour and it never comes off.',
        'Hold still. You have such a readable face.',
      ],
      beaten: [
        'Plaster... I cast faces for the carnival. Plaster for the mould, paper for the mask. Only that.',
        'Why do I know how long it takes to set on a living face? Who did I learn that on?',
      ],
      coins: COINS,
    },
    {
      id: fallenId('masque', 'last-boat'),
      court: 'masque',
      name: 'The Last Boat Up',
      foeName: 'Night-Caller Orsola Brenta',
      foeElement: 'bind',
      difficulty: 5,
      hpMult: 1.15,
      gimmick: fallenId('masque', 'last-boat'),
      at: { x: 1720, y: 900 },
      look: { body: 0x2a2430, accent: 0x14121a, hat: 'hood', traits: ['lantern', 'rod', 'scarf'], size: 1.05, eye: EYE },
      challenge: [
        'After Compline I stand on the landings and call the names. The boats come. The boats go up.',
        'They always go up full. I have never once seen one come back with anybody in it.',
        'Your name is on my list, stranger. Mind the rope.',
      ],
      beaten: [
        'Names... I called the ferry. "Traghetto! Who\'s crossing?" Market folk, with baskets. Wasn\'t it?',
        'The boats came back. They did come back. Didn\'t they? Why can I only see them going?',
      ],
      coins: COINS,
    },
    {
      id: fallenId('masque', 'bull'),
      court: 'masque',
      name: 'Fat Thursday\'s Bull',
      foeName: 'Bull-Warden Bastian Corna',
      foeElement: 'hunt',
      difficulty: 5,
      hpMult: 1.2,
      gimmick: fallenId('masque', 'bull'),
      at: { x: 1300, y: 1450 },
      look: { body: 0xb88a68, accent: 0xa01e3a, hat: 'tricorn', traits: ['beard', 'cane', 'satchel'], size: 1.3, eye: EYE },
      challenge: [
        'Every carnival the bull runs the campo. And every carnival, somehow, it finds the ones who mumbled.',
        'He doesn\'t mean anything by it. He just runs at red. I simply decide where red stands.',
        'Ho, Moro! Look here, boy. Look at the stranger.',
      ],
      beaten: [
        'Moro... he\'s a soft old thing. Children ride on him after the run. I never pointed him at anyone.',
        'Did I? There\'s a cape in my hand and I don\'t remember picking it up.',
      ],
      coins: COINS,
    },
    {
      id: fallenId('masque', 'giddy'),
      court: 'masque',
      name: 'The Giddy Waltz',
      foeName: 'Dancing-Mistress Fiammetta Volta',
      foeElement: 'passion',
      difficulty: 5,
      gimmick: fallenId('masque', 'giddy'),
      at: { x: 620, y: 860 },
      look: { body: 0xe8d0c0, accent: 0xb07aff, hat: 'wig', traits: ['cane', 'mask', 'scarf'], size: 0.9, eye: EYE },
      challenge: [
        'I taught the Prince to waltz when he was six. Turn, and turn, and never, ever stop turning.',
        'A court that turns is a court that cannot talk. Round and round, till nobody remembers what to say.',
        'Take my hand. Mind your head. It gets so light.',
      ],
      beaten: [
        'He trod on my toes. Every lesson. He laughed. He laughed out loud and I let him. Did I let him?',
        'The room has stopped. I had forgotten a room could stop. Sit with me while it does.',
      ],
      coins: COINS,
    },
  ],
};
