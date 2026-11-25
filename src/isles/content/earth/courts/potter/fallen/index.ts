import type { FallenBundle } from '../../../../../IslesTypes';
import { fallenId } from '../../../../meteor/spec';
import { FALLEN_DRAW } from './draw';
import { FALLEN_MEND } from './mend';
import { FALLEN_PUG } from './pug';
import { FALLEN_WEDGE } from './wedge';
import { FALLEN_WIRE } from './wire';

/**
 * The Potter's Court's Fallen Five — in the star's telling, the hands of the pottery town who
 * served the Tithe Ranks for the crown: the cut-off hand who cut households off the roll, the
 * woman who sold the mill donkeys and turned the crank herself, the gilder who put everything
 * broken back where it was, the wedgewife who pressed the air out of the town, and the fireman
 * whose book said whose ware was drawn and whose was left in. Tier 2: difficulty 4,4,4,5,5; coins
 * double the court's 80. They stand on ground the court's own five never use: below Kiln Row by
 * the pug mill, the clay-pit road, east of Wheel Square, the Dunesea road, and above the muster ground.
 */

const EYE = 0xffa040;
const COINS = 160;

export const FALLEN: FallenBundle = {
  gimmicks: [FALLEN_WIRE, FALLEN_PUG, FALLEN_MEND, FALLEN_WEDGE, FALLEN_DRAW],
  encounters: [
    {
      id: fallenId('potter', 'wire'),
      court: 'potter',
      name: 'Wired Off',
      foeName: 'Teasel Marrick, Cut-Off Hand',
      foeElement: 'string',
      difficulty: 4,
      hpMult: 1.1,
      gimmick: fallenId('potter', 'wire'),
      at: { x: 800, y: 700 },
      look: { body: 0xd8b890, accent: 0x5e3e2a, hat: 'bandana', traits: ['apron', 'tool'], size: 0.95, eye: EYE },
      challenge: [
        'Forty years I cut pots off the wheel. One pull under the foot, and the pot comes away clean.',
        'A household is the same. One pull under the name, and the roll comes away clean. Nobody hears it.',
        'Hold still. The wire does the rest.',
      ],
      beaten: [
        'The wire... I only ever cut pots. Under the foot. I swept the shavings for the slip bin.',
        'Whose names? I can\'t read. I never could read the roll. Why do I remember pulling it?',
      ],
      coins: COINS,
    },
    {
      id: fallenId('potter', 'pug'),
      court: 'potter',
      name: 'Pugged',
      foeName: 'Ebba Gorrie, Mill Hand',
      foeElement: 'pressure',
      difficulty: 4,
      hpMult: 1.15,
      gimmick: fallenId('potter', 'pug'),
      at: { x: 300, y: 980 },
      look: { body: 0xc4a080, accent: 0x553a24, hat: 'beanie', traits: ['apron', 'scarf'], size: 1.25, eye: EYE },
      challenge: [
        'They needed the donkeys. I had the donkeys. They gave me a crank and a wage. Fair trade.',
        'I turn it myself now. Every log of tithe clay in this court comes out of my mill.',
        'Stand in front of the mouth, then. See how fair it is.',
      ],
      beaten: [
        'Clover. The grey one was Clover. They took her and I... I cried. I didn\'t sell her. Did I?',
        'I never had a wage. I turned that mill by hand because there was no donkey. That\'s all.',
      ],
      coins: COINS,
    },
    {
      id: fallenId('potter', 'mend'),
      court: 'potter',
      name: 'Back to the Pot',
      foeName: 'Gilder Rosamund Tey',
      foeElement: 'memory',
      difficulty: 4,
      gimmick: fallenId('potter', 'mend'),
      at: { x: 1600, y: 880 },
      look: { body: 0xe4c8a8, accent: 0x4e8a70, hat: 'hood', traits: ['glasses', 'satchel'], size: 0.95, eye: EYE },
      challenge: [
        'The Prince\'s ware never stays broken. I see to it. Lacquer, gold dust, and everything goes back.',
        'A household cracks, a lad runs off to the coast. I mend it. He comes back. They always come back.',
        'Break whatever you like, dear. I remember where every piece belongs.',
      ],
      beaten: [
        'Gold in the cracks... it was only cups. Chipped cups, for people who couldn\'t afford new ones.',
        'I never sent anyone back anywhere. Did the lad get to the coast? I hope he got to the coast.',
      ],
      coins: COINS,
    },
    {
      id: fallenId('potter', 'wedge'),
      court: 'potter',
      name: 'Folded Over',
      foeName: 'Wedgewife Hulda Brack',
      foeElement: 'gravity',
      difficulty: 5,
      hpMult: 1.2,
      gimmick: fallenId('potter', 'wedge'),
      at: { x: 1300, y: 1400 },
      look: { body: 0xe0c0a0, accent: 0x8c4024, hat: 'bandana', traits: ['apron', 'scarf'], size: 1.3, eye: EYE },
      challenge: [
        'Air ruins a pot. Lift it, fold it, press it out. A hundred folds and the clay stops arguing.',
        'This town had air in it once. I pressed it out, fold by fold, and it hasn\'t argued since.',
        'Mind which half you stand on, love.',
      ],
      beaten: [
        'I wedged for the throwers. My hands knew the clay. They never knew anybody\'s neck.',
        'There was singing on the bench when I was a girl. I kept it going. Didn\'t I keep it going?',
      ],
      coins: COINS,
    },
    {
      id: fallenId('potter', 'draw'),
      court: 'potter',
      name: 'Drawn Green',
      foeName: 'Fireman Odile Sayer',
      foeElement: 'sand',
      difficulty: 5,
      hpMult: 1.25,
      gimmick: fallenId('potter', 'draw'),
      at: { x: 1950, y: 980 },
      look: { body: 0xa87a58, accent: 0x2c2220, hat: 'goggles', traits: ['book', 'apron'], size: 1.05, eye: EYE },
      challenge: [
        'A firing is a book. In goes the ware, up goes the heat, and nothing comes out till I write "draw".',
        'Some ware I never wrote. It\'s in there still. Do you want to see the page?',
        'Load your kiln, stranger. I\'ll tell you when it\'s done.',
      ],
      beaten: [
        'The firing book... it\'s only cones and hours. Cone eight down at four. I never wrote a name.',
        'I drew every kiln I ever fired. Every one. Then why can I hear something knocking on a door?',
      ],
      coins: COINS,
    },
  ],
};
