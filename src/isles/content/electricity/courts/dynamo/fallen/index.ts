import type { FallenBundle } from '../../../../../IslesTypes';
import { fallenId } from '../../../../meteor/spec';
import { FALLEN_EQUAL_POTENTIAL } from './equalPotential';
import { FALLEN_FLUX_LINKAGE } from './fluxLinkage';
import { FALLEN_SINGING_GAP } from './singingGap';
import { FALLEN_SIX_FEEDERS } from './sixFeeders';
import { FALLEN_STEPPED_LEADER } from './steppedLeader';

/**
 * The Dynamo Court's Fallen Five — in the star's telling, the hands of the power station who kept
 * the current for the crown: the jar-mistress of the Leyden banks, the board-attendant who chose
 * each night which feeders stayed closed, the armature-wright who wound the Prince his first coil, the cloud-reader who said where the strike would fall, and the gapwarden whose
 * arrester sang which streets went dark. Tier 1: difficulty 4,4,4,5,5; coins double the court's 80.
 * They stand on ground the court's own five never use: under the Leyden banks, the switchyard's
 * east end, the Cross Road by the main road, the Rod Forest path, and the hall's forecourt.
 */

const EYE = 0xffa040;
const COINS = 160;

export const FALLEN: FallenBundle = {
  gimmicks: [FALLEN_EQUAL_POTENTIAL, FALLEN_SIX_FEEDERS, FALLEN_SINGING_GAP, FALLEN_FLUX_LINKAGE, FALLEN_STEPPED_LEADER],
  encounters: [
    {
      id: fallenId('dynamo', 'equal-potential'),
      court: 'dynamo',
      name: 'Equal Potential',
      foeName: 'Jar-Mistress Odalys Trune',
      foeElement: 'magnet',
      difficulty: 4,
      hpMult: 1.1,
      gimmick: fallenId('dynamo', 'equal-potential'),
      at: { x: 2080, y: 730 },
      look: { body: 0xc8a890, accent: 0x2a3a4e, hat: 'goggles', traits: ['apron', 'glasses', 'tool'], size: 1.0, eye: EYE },
      challenge: [
        'Every jar on that bank is a household\'s night of cranking. I keep them full. I keep them honest.',
        'A short house sits with a jar in its lap until the debt feels paid. Nobody ever sat long.',
        'You look like you could hold a great deal. Let\'s find out how much.',
      ],
      beaten: [
        'The jars... I wiped them. Every morning, so the foil wouldn\'t tarnish. That was all, wasn\'t it?',
        'I never put a jar in anyone\'s lap. My hands remember the cloth, not the lap. I think.',
      ],
      coins: COINS,
    },
    {
      id: fallenId('dynamo', 'six-feeders'),
      court: 'dynamo',
      name: 'Six Feeders',
      foeName: 'Board-Attendant Ignatz Brume',
      foeElement: 'plasma',
      difficulty: 4,
      gimmick: fallenId('dynamo', 'six-feeders'),
      at: { x: 2200, y: 940 },
      look: { body: 0xb08a6c, accent: 0x3b414b, hat: 'tophat', traits: ['glasses', 'satchel', 'tool'], size: 1.15, eye: EYE },
      challenge: [
        'Every cable out of this station passes my board. Closed, a street eats. Open, it sits in the dark.',
        'I never chose a street. I only chose a switch. The street was on the other end of it, that\'s all.',
        'Take as many feeders as you like. The breaker will tell you when you\'ve had enough.',
      ],
      beaten: [
        'I kept the board clean. Brass polish, a soft rag. Somebody else threw the switches. Didn\'t they?',
        'The board — I closed them all, once. Every street lit at once. Was that real? It felt real.',
      ],
      coins: COINS,
    },
    {
      id: fallenId('dynamo', 'singing-gap'),
      court: 'dynamo',
      name: 'The Singing Gap',
      foeName: 'Gapwarden Linnet Sorrowby',
      foeElement: 'sound',
      difficulty: 4,
      gimmick: fallenId('dynamo', 'singing-gap'),
      at: { x: 1420, y: 620 },
      look: { body: 0xd8b49a, accent: 0x4a2e5a, hat: 'bandana', traits: ['scarf', 'book'], size: 0.95, eye: EYE },
      challenge: [
        'When the lines run hot the arrester sings. I tuned it, so the whole court knows the song by heart.',
        'Every street has its own tune. When they hear their tune, they know their lights are going.',
        'Listen carefully. I only sing it once — and then a little longer.',
      ],
      beaten: [
        'I sang in the chapel. Hymns, on the seventh day. I never tuned that horrible thing. Did I?',
        'There was a song about the river. My mother\'s. I can nearly hear it under the hum.',
      ],
      coins: COINS,
    },
    {
      id: fallenId('dynamo', 'flux-linkage'),
      court: 'dynamo',
      name: 'Flux Linkage',
      foeName: 'Armature-Wright Esmé Varnhagen',
      foeElement: 'rubber',
      difficulty: 5,
      hpMult: 1.15,
      gimmick: fallenId('dynamo', 'flux-linkage'),
      at: { x: 960, y: 620 },
      look: { body: 0xc49a7a, accent: 0x7a3e1d, hat: 'cap', traits: ['apron', 'tool', 'bandage'], size: 1.05, eye: EYE },
      challenge: [
        'I wound the great armature. Nine miles of wire, by hand, and the boy watching every turn.',
        'I taught him the only law there is. Move through the field and it pays. Stand still and you are paid.',
        'Go on, then. Move.',
      ],
      beaten: [
        'I wound coils for the mill pumps. To keep the race out of people\'s cellars. Only that.',
        'The boy... I taught him his letters, not his laws. Why do I remember it the other way?',
      ],
      coins: COINS,
    },
    {
      id: fallenId('dynamo', 'stepped-leader'),
      court: 'dynamo',
      name: 'Stepped Leader',
      foeName: 'Cloud-Reader Ferelith Gowde',
      foeElement: 'tempest',
      difficulty: 5,
      hpMult: 1.2,
      gimmick: fallenId('dynamo', 'stepped-leader'),
      at: { x: 300, y: 330 },
      look: { body: 0xa89484, accent: 0x2a3040, hat: 'hood', traits: ['cane', 'scarf', 'lantern'], size: 1.0, eye: EYE },
      challenge: [
        'Lightning feels its way down. A step, a pause, a step. I see every one, and I know where it lands.',
        'I tell the Prince\'s men. They stand the short households there. The sky settles the Draw.',
        'It is already coming down for one of us. It prefers whoever is nearer. Shall we see?',
      ],
      beaten: [
        'I read the storm so the rod-men could get off the hill in time. That was the whole of my trade.',
        'Nobody ever stood anyone on the ground I named. Did they? The glass is so pretty on the hillside.',
      ],
      coins: COINS,
    },
  ],
};
