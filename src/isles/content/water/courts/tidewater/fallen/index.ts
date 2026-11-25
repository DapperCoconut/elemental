import type { FallenBundle } from '../../../../../IslesTypes';
import { fallenId } from '../../../../meteor/spec';
import { FALLEN_FLOOR_GIVEN_BACK } from './floorGivenBack';
import { FALLEN_LULLABY } from './lullaby';
import { FALLEN_SEINE } from './seine';
import { FALLEN_WEIGHED_UNDER } from './weighedUnder';
import { FALLEN_WRECKERS_LANTERN } from './wreckersLantern';

/**
 * The Tidewater Court's Fallen Five — in the star's telling, the people of the stilt town who
 * kept the tide for Prince Ebb: the clerk who sold the floors back, the man who weighed the
 * ballast, the lamp-keeper who showed the false light, the seine-master who swept the flats for
 * debtors, and the warden who sang the drowned row to sleep. Tier 1: difficulty 4,4,4,5,5; coins
 * double the court's 45. They stand where the court's own five never do: the Low Walk east of the
 * plaza, beside the tide-pool rocks, the dunes under the headland road, the south strand by the
 * creek mouth, and the flats at the drowned row's edge.
 */

const EYE = 0xffa040;
const COINS = 90;

export const FALLEN: FallenBundle = {
  gimmicks: [FALLEN_FLOOR_GIVEN_BACK, FALLEN_WEIGHED_UNDER, FALLEN_WRECKERS_LANTERN, FALLEN_SEINE, FALLEN_LULLABY],
  encounters: [
    {
      id: fallenId('tidewater', 'floor-given-back'),
      court: 'tidewater',
      name: 'Floor Given Back',
      foeName: 'Tithe-Clerk Pennick',
      foeElement: 'fortune',
      difficulty: 4,
      hpMult: 1.1,
      gimmick: fallenId('tidewater', 'floor-given-back'),
      at: { x: 1460, y: 950 },
      look: { body: 0xc9b4a0, accent: 0x7a2219, hat: 'tricorn', traits: ['book', 'glasses', 'satchel'], size: 1.0, eye: EYE },
      challenge: [
        'A coin a head, and the sea gives your floor back. It is the fairest bargain on the Reach.',
        'I write every floor in the book. Paid floors are dry. The rest of you get wet, and that is arithmetic.',
        'You have no house here, so you have no floor. Shall we see what one costs you?',
      ],
      beaten: [
        'The book... I kept a second book. Who paid short. Whose floors I let them have anyway.',
        'I think I forgave more tithes than I took. I think that was the whole of my job, really.',
      ],
      coins: COINS,
    },
    {
      id: fallenId('tidewater', 'weighed-under'),
      court: 'tidewater',
      name: 'Weighed Under',
      foeName: 'Ballast-Master Durn',
      foeElement: 'gravity',
      difficulty: 4,
      hpMult: 1.15,
      gimmick: fallenId('tidewater', 'weighed-under'),
      at: { x: 2250, y: 1250 },
      look: { body: 0xb08a6e, accent: 0x3d434a, hat: 'cap', traits: ['beard', 'tool', 'apron'], size: 1.35, eye: EYE },
      challenge: [
        'The Queen keeps her drowned for ballast. Someone has to weigh it. A crown that floats is no crown.',
        'Every knock you take is a stone. Carry enough and the sea will take you off my hands.',
        'Step on the bridge, stranger. Let us find out what you weigh.',
      ],
      beaten: [
        'Stones... I weighed crab and cockles on that bridge. Honest weight. Kids sat on the pans for a laugh.',
        'Ballast for the crown. Who told me that? It wasn\'t a thing I ever weighed.',
      ],
      coins: COINS,
    },
    {
      id: fallenId('tidewater', 'wreckers-lantern'),
      court: 'tidewater',
      name: 'The Wrecker\'s Lantern',
      foeName: 'Lamp-Keeper Hesk',
      foeElement: 'light',
      difficulty: 4,
      hpMult: 1.1,
      gimmick: fallenId('tidewater', 'wreckers-lantern'),
      at: { x: 1420, y: 330 },
      look: { body: 0xd4b39a, accent: 0x2a4a52, hat: 'hood', traits: ['lantern', 'scarf', 'pipe'], size: 1.05, eye: EYE },
      challenge: [
        'Two lights on this coast. The Prince\'s on the headland, and mine, for everyone else\'s ships.',
        'What comes ashore on the bar is salvage. Salvage is tithe. The sea has always paid the crown.',
        'Here — hold this for me. Mind the ships. They do so love a lantern.',
      ],
      beaten: [
        'Red glass. I never had red glass. I kept the lamp on the headland trimmed, every night, forty years.',
        'Did I wreck them? No... I rowed out to them. I brought them in. I\'m sure I brought them in.',
      ],
      coins: COINS,
    },
    {
      id: fallenId('tidewater', 'seine'),
      court: 'tidewater',
      name: 'The Seine',
      foeName: 'Seine-Master Garrow',
      foeElement: 'string',
      difficulty: 5,
      hpMult: 1.2,
      gimmick: fallenId('tidewater', 'seine'),
      at: { x: 1880, y: 1610 },
      look: { body: 0xbf9a7c, accent: 0x40606a, hat: 'souwester', traits: ['rod', 'beard', 'satchel'], size: 1.25, eye: EYE },
      challenge: [
        'At the ebb I sweep the flats for the Prince. Fish, mostly. And whoever owes.',
        'The net has one mouth. Find it or be hauled. I have hauled half this town up that beach.',
        'Don\'t run. Nobody outruns a seine. Swim sideways, if you remember how.',
      ],
      beaten: [
        'Hauled... we hauled for the whole town, didn\'t we? Shared it out on the sand. Every family a basket.',
        'I mended that net forty winters. I don\'t think it ever caught a person. I think I\'d remember that.',
      ],
      coins: COINS,
    },
    {
      id: fallenId('tidewater', 'lullaby'),
      court: 'tidewater',
      name: 'Lullaby Row',
      foeName: 'Row-Warden Mabry',
      foeElement: 'dream',
      difficulty: 5,
      hpMult: 1.15,
      gimmick: fallenId('tidewater', 'lullaby'),
      at: { x: 720, y: 1480 },
      look: { body: 0xe2c4a8, accent: 0x2f8f9a, hat: 'veil', traits: ['scarf', 'lantern'], size: 0.95, eye: EYE },
      challenge: [
        'Hush. The row is sleeping. I sing them down every night so the Queen can keep them.',
        'They are not unhappy. They dream of dry floors. It is kinder than waking, I promise you.',
        'You look tired, love. Come closer to them. Just for a little while.',
      ],
      beaten: [
        'I sang... I sang to keep them company. Down at the water every night, so they\'d know someone stayed.',
        'I never sang anyone to sleep for her. I was singing them home. Weren\'t I?',
      ],
      coins: COINS,
    },
  ],
};
