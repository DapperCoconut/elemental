import type { FallenBundle } from '../../../../../IslesTypes';
import { fallenId } from '../../../../meteor/spec';
import { EYE } from './common';
import { FALLEN_COAT_UPON_COAT } from './coatUponCoat';
import { FALLEN_DIVINE_PROPORTION } from './divineProportion';
import { FALLEN_GROUND_FINE } from './groundFine';
import { FALLEN_MIND_THE_LADDER } from './mindTheLadder';
import { FALLEN_STATION_POINT } from './stationPoint';

/**
 * The Mural Court's Fallen Five — in the star's telling, the painters' town's own people who kept
 * Prince Hue's Canon for him: the perspectivist whose smeared pictures stand up and strike, the
 * assayer who hunts the mud of three colours, the keeper of the golden section, the varnisher
 * whose coats stack into a mire, and the scaffold-master whose ladders walk the streets. Tier 2:
 * difficulty 4,4,4,5,5; coins double the court's 120. They stand where the court's five never
 * do: the paving east of Palette Square, the lane below the dye works, the open flags under the
 * Gallery road, the yard west of the Censors', and the street before Atelier Row.
 */

const COURT = 'mural';
const COINS = 240;

export const FALLEN: FallenBundle = {
  gimmicks: [FALLEN_STATION_POINT, FALLEN_GROUND_FINE, FALLEN_COAT_UPON_COAT, FALLEN_DIVINE_PROPORTION, FALLEN_MIND_THE_LADDER],
  encounters: [
    {
      id: fallenId(COURT, 'station-point'), court: COURT, name: 'The Station Point',
      foeName: 'Zebulon Skew, Perspectivist', foeElement: 'psychic', difficulty: 4, hpMult: 1.1,
      gimmick: fallenId(COURT, 'station-point'),
      at: { x: 1500, y: 790 },
      look: { body: 0xe4ccb0, accent: 0x8a4ec8, hat: 'tophat', traits: ['glasses', 'cane', 'scarf'], size: 1.05, eye: EYE },
      challenge: [
        'From where you stand it is a stain. From where I stand it is the Sword of Noon. Perspective is everything.',
        'Every picture in this yard is true from one place only. I set the studs. I know where to put my eye.',
        'Step into the paint, if you like. I shall look at you from the proper angle.',
      ],
      beaten: [
        'I… taught children to draw a road going away. Two lines meeting at the edge of the world. Didn\'t I?',
        'There were no swords in it. Only roads, and a little house where the lines met. I had forgotten the house.',
      ],
      coins: COINS,
    },
    {
      id: fallenId(COURT, 'ground-fine'), court: COURT, name: 'Ground Fine',
      foeName: 'Evadne Smalt, Assayer of Colours', foeElement: 'dune', difficulty: 4,
      gimmick: fallenId(COURT, 'ground-fine'),
      at: { x: 760, y: 790 },
      look: { body: 0xd8b088, accent: 0xd49a3a, hat: 'headwrap', traits: ['apron', 'glasses', 'satchel'], size: 1, eye: EYE },
      challenge: [
        'Red, yellow, blue. The three the Canon allows. Any two make a lawful colour. All three make mud.',
        'Mud is brown. Brown is shadow. I assay every painter who leaves the mills, and I scrub the mud off myself.',
        'Walk through the dust, dear. Choose your colours carefully. I can count to three.',
      ],
      beaten: [
        'I… ground umber. In the back of the mill, at night that wasn\'t night. For the painters who asked.',
        'Brown was the colour of my father\'s coat. How did I ever call it a crime?',
      ],
      coins: COINS,
    },
    {
      id: fallenId(COURT, 'coat-upon-coat'), court: COURT, name: 'Coat upon Coat',
      foeName: 'Corentin Flaxley, Varnisher', foeElement: 'oil', difficulty: 4, hpMult: 1.1,
      gimmick: fallenId(COURT, 'coat-upon-coat'),
      at: { x: 1700, y: 1330 },
      look: { body: 0xc8a07c, accent: 0xa87c4c, hat: 'cap', traits: ['apron', 'pack', 'beard'], size: 1.2, eye: EYE },
      challenge: [
        'Every mural on the Row gets three coats of my varnish. Then it never changes again. That\'s the point.',
        'One coat, you won\'t notice. Two, you\'ll feel it in your boots. Three, and you\'re part of the picture.',
        'Hold still. I\'ll do you a nice even finish.',
      ],
      beaten: [
        'I… varnished fiddles. Chairs. My mother\'s sewing box. Things people wanted to keep a long time.',
        'Varnish is for keeping, not for catching. Why did I ever lay it on a person?',
      ],
      coins: COINS,
    },
    {
      id: fallenId(COURT, 'divine-proportion'), court: COURT, name: 'The Divine Proportion',
      foeName: 'Melchior Sesquin, Keeper of the Canon', foeElement: 'metal', difficulty: 5, hpMult: 1.15,
      gimmick: fallenId(COURT, 'divine-proportion'),
      at: { x: 1650, y: 1000 },
      look: { body: 0xe8d4bc, accent: 0xe8b830, hat: 'wig', traits: ['book', 'glasses', 'cane'], size: 1.1, eye: EYE },
      challenge: [
        'Never the middle. The eye falls at the golden section, nought point six one eight. The Canon is exact.',
        'My gauge stands one leg on you and one on me, and the third finds the place the Despot\'s seal comes down.',
        'Come closer. Closer still. You will find you are the short end.',
      ],
      beaten: [
        'I… measured violins. For the luthier on the quay. The golden section is in the sound-holes, you know.',
        'It was for music. It was always for music. Who taught me to stamp people with it?',
      ],
      coins: COINS,
    },
    {
      id: fallenId(COURT, 'mind-the-ladder'), court: COURT, name: 'Mind the Ladder',
      foeName: 'Florizel Putlog, Scaffold-Master', foeElement: 'earth', difficulty: 5, hpMult: 1.2,
      gimmick: fallenId(COURT, 'mind-the-ladder'),
      at: { x: 2120, y: 960 },
      look: { body: 0xd0a47c, accent: 0xe0402a, hat: 'helmet', traits: ['tool', 'beard', 'apron'], size: 1.25, eye: EYE },
      challenge: [
        'Mind your backs! Every ladder on the Great Mural went up these streets on my lads\' shoulders.',
        'They walk where I point. When one stops, the other end keeps going. That\'s just how a ladder is.',
        'Don\'t stand in the street, stranger. Ladders are coming through.',
      ],
      beaten: [
        'I… built the scaffolds so the painters could reach the top. Lashed every knot myself. Nobody ever fell.',
        'My lads carried ladders to the wall. Not at people. Never at people. Lord, my head.',
      ],
      coins: COINS,
    },
  ],
};
