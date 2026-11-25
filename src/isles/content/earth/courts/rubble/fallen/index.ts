import type { FallenBundle } from '../../../../../IslesTypes';
import { fallenId } from '../../../../meteor/spec';
import { FALLEN_CAROM } from './carom';
import { FALLEN_COLDTRAIL } from './coldtrail';
import { FALLEN_FLUES } from './flues';
import { FALLEN_FULCRUM } from './fulcrum';
import { FALLEN_HOMECOMING } from './homecoming';

/**
 * The Rubble Court's Fallen Five — in the star's telling, the people of the buried capital who did
 * the Regent's burying for him: the tracker who found the hiding families by their prints, the
 * gang-boss who carted the Exchange's stone off to build the Sepulchre, the restorer who mended only
 * his walls, the prise-man who levered the old walls over, and the sweep who smoked the Sunken
 * Street out of its cellars. Tier 4: difficulty 4,4,5,5,5; coins double the court's 105.
 * They stand on open ground the court's own five never use: under the landslides (north-west), the
 * street north of the Exchange, the yard south of the colossus's head, below the colossus's feet,
 * and the Breach road east of the Regent's notice.
 */

const EYE = 0xffa040;
const COINS = 210;

export const FALLEN: FallenBundle = {
  gimmicks: [FALLEN_COLDTRAIL, FALLEN_CAROM, FALLEN_HOMECOMING, FALLEN_FULCRUM, FALLEN_FLUES],
  encounters: [
    {
      id: fallenId('rubble', 'coldtrail'),
      court: 'rubble',
      name: 'Prints in the Dust',
      foeName: 'Tracker Quenby Lusk',
      foeElement: 'hunt',
      difficulty: 4,
      gimmick: fallenId('rubble', 'coldtrail'),
      at: { x: 520, y: 660 },
      look: { body: 0xb0a088, accent: 0x5f5a52, hat: 'hood', traits: ['satchel', 'scarf', 'tool'], size: 0.95, eye: EYE },
      challenge: [
        'Three people walked this street since the dust last settled. One limps. One carried a child. One is you.',
        'Families think a cellar hides them. A cellar has a door, and a door has a step, and a step has a print.',
        'Walk, then. Walk anywhere you like. She\'ll find the start of you and run it to the end.',
      ],
      beaten: [
        'Those prints... I followed them to bring people bread. When the Regent\'s men stopped the carts. Didn\'t I?',
        'My dog was a rag of a thing. Slept on my feet. She never ran anyone down in her life.',
      ],
      coins: COINS,
    },
    {
      id: fallenId('rubble', 'carom'),
      court: 'rubble',
      name: 'Ashlar Carom',
      foeName: 'Shifter Theodric Farrant',
      foeElement: 'metal',
      difficulty: 4,
      hpMult: 1.1,
      gimmick: fallenId('rubble', 'carom'),
      at: { x: 1700, y: 1160 },
      look: { body: 0xc0a07a, accent: 0x3a3634, hat: 'cap', traits: ['tool', 'beard', 'apron'], size: 1.3, eye: EYE },
      challenge: [
        'Every block of the Corn Exchange went down the hill on my rollers. The Sepulchre\'s built of it. Good stone.',
        'A ton of ashlar, a bar and a fulcrum. Show me where you want it and I\'ll put it there. Through you, if need.',
        'Stand behind a block if you like. I\'ll move the block.',
      ],
      beaten: [
        'Down the hill... no. Up. We were carrying them back up. Stone by stone, to put the Exchange back.',
        'I\'m the one who never let them seal it. Aren\'t I? Then why do my hands remember the rollers going down?',
      ],
      coins: COINS,
    },
    {
      id: fallenId('rubble', 'homecoming'),
      court: 'rubble',
      name: 'Stones Go Home',
      foeName: 'Mender Perpetua Haske',
      foeElement: 'sand',
      difficulty: 5,
      gimmick: fallenId('rubble', 'homecoming'),
      at: { x: 780, y: 1010 },
      look: { body: 0xe0ccb0, accent: 0x9a5a40, hat: 'headwrap', traits: ['glasses', 'apron', 'book'], size: 1.0, eye: EYE },
      challenge: [
        'Every stone remembers where it stood. I only remind it. I mended the Regent\'s gate in an afternoon.',
        'The rest of the capital? It asked to be mended too. I told it to wait. It is very good at waiting.',
        'Stand in the old street, dear. The wall is coming home, and it has never once gone round anyone.',
      ],
      beaten: [
        'I mended the Lamp Street fountain. For the children, with my own hands. Didn\'t I? Why can\'t I see it?',
        'Wait... I never touched his gate. I wouldn\'t. I sat by the fountain and I mended it, stone by stone.',
      ],
      coins: COINS,
    },
    {
      id: fallenId('rubble', 'fulcrum'),
      court: 'rubble',
      name: 'Lever and Lintel',
      foeName: 'Prise-Man Leofric Stannage',
      foeElement: 'gravity',
      difficulty: 5,
      hpMult: 1.15,
      gimmick: fallenId('rubble', 'fulcrum'),
      at: { x: 2050, y: 960 },
      look: { body: 0xa89070, accent: 0x8a4a2a, hat: 'helmet', traits: ['tool', 'pack', 'bandage'], size: 1.25, eye: EYE },
      challenge: [
        'Give me a long bar and a drum to rest it on, and I\'ll have any wall in this city over. Paid by the course.',
        'The colossus took six of us and a week. You\'ll take one lintel and a moment.',
        'Step on the low end, friend. It\'s the only comfortable seat left in the capital.',
      ],
      beaten: [
        'Over... I levered the slabs off people. When the Exchange came in. I lifted them off. Didn\'t I?',
        'Six days we dug for the Tolley boy. That was the bar in my hands. That was what it was for.',
      ],
      coins: COINS,
    },
    {
      id: fallenId('rubble', 'flues'),
      court: 'rubble',
      name: 'Smoked Out',
      foeName: 'Sweep Avice Marchbank',
      foeElement: 'fire',
      difficulty: 5,
      hpMult: 1.05,
      gimmick: fallenId('rubble', 'flues'),
      at: { x: 1500, y: 1700 },
      look: { body: 0x8a7a6a, accent: 0x1e1a18, hat: 'tophat', traits: ['tool', 'scarf', 'pipe'], size: 0.9, eye: EYE },
      challenge: [
        'Every house on the Sunken Street is under your feet, and every one still has a chimney. I swept them all.',
        'One fire down one flue and the whole street coughs. Then the Regent\'s men just wait at the hatches.',
        'Cap a pot if you like, sweetheart. I\'ve a rod for every cap ever made.',
      ],
      beaten: [
        'I swept them so the families could keep warm down there. Kept the flues clear. That was all. Wasn\'t it?',
        'Nobody ever coughed for me. They used to leave me a cup on the hatch. Tea, with the soot floating in it.',
      ],
      coins: COINS,
    },
  ],
};
