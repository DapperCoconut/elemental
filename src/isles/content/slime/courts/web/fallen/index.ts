import type { FallenBundle } from '../../../../../IslesTypes';
import { fallenId } from '../../../../meteor/spec';
import { FALLEN_DROVER } from './drover';
import { FALLEN_LADDERED } from './laddered';
import { FALLEN_PIT } from './pit';
import { FALLEN_SLACK } from './slack';
import { FALLEN_STRAND } from './strand';

/**
 * The Web Court's Fallen Five — in the star's telling, the silk town's people who served the
 * Spymaster: the sheetwright who let the floor go slack under named houses, the darner who let
 * their rows run, the strand-runner who carried every report, the drover who walked a widow
 * through marked doors, and the oddsman who paid his book in names. Tier 2: difficulty 4,4,4,5,5;
 * coins double the court's 100. They stand where the court's own five never go: the open Sheet
 * south of the plaza, the west hem by the racks, under the Loft by the Reel, the Long Strand by
 * the pens, and the east Sheet above the silk pool.
 */

const EYE = 0xffa040;

export const FALLEN: FallenBundle = {
  gimmicks: [FALLEN_SLACK, FALLEN_LADDERED, FALLEN_STRAND, FALLEN_DROVER, FALLEN_PIT],
  encounters: [
    {
      id: fallenId('web', 'slack'),
      court: 'web',
      name: 'Slack in the Sheet',
      foeName: 'Sheetwright Odo Tensley',
      foeElement: 'gravity',
      difficulty: 4,
      hpMult: 1.1,
      gimmick: fallenId('web', 'slack'),
      at: { x: 880, y: 960 },
      look: { body: 0xc8b098, accent: 0x6b4f35, hat: 'cap', traits: ['tool', 'beard', 'apron'], size: 1.2, eye: EYE },
      challenge: [
        'Every stay on this Sheet goes through my hands. I know where it is tight. I know where I let it go.',
        'The Spymaster sends a name. I loosen a peg. By morning there is a dip, and by night, nothing there.',
        'Stand still, friend. The silk is very patient.',
      ],
      beaten: [
        'I... tightened them. Every morning, every peg, so nobody\'s cot would roll into the drop. Didn\'t I?',
        'Who would loosen a floor under a sleeping house? Why does my hand know the knot for it?',
      ],
      coins: 200,
    },
    {
      id: fallenId('web', 'laddered'),
      court: 'web',
      name: 'Laddered Silk',
      foeName: 'Darner Quiddy Ravelin',
      foeElement: 'air',
      difficulty: 4,
      gimmick: fallenId('web', 'laddered'),
      at: { x: 300, y: 860 },
      look: { body: 0xdcc4ac, accent: 0x5a3a6a, hat: 'headwrap', traits: ['glasses', 'tool', 'satchel'], size: 0.9, eye: EYE },
      challenge: [
        'One loose end, dearie. That\'s all a row needs. One loose end and a little tug.',
        'I mended the Sheet forty years. You learn which rows hold up which doors. You learn where to pull.',
        'Mind your feet. This row\'s about to go.',
      ],
      beaten: [
        'Darning. I was darning. Patches on the Sheet under the nursery, so the little ones wouldn\'t fall.',
        'I never pulled a row in my life. My hook was for closing. Wasn\'t it for closing?',
      ],
      coins: 200,
    },
    {
      id: fallenId('web', 'strand'),
      court: 'web',
      name: 'Word Down the Strand',
      foeName: 'Strand-Runner Pim Ostrey',
      foeElement: 'ice',
      difficulty: 4,
      gimmick: fallenId('web', 'strand'),
      at: { x: 1560, y: 560 },
      look: { body: 0xd0b8a0, accent: 0x2c2238, hat: 'cowl', traits: ['satchel', 'scarf'], size: 0.95, eye: EYE },
      challenge: [
        'Every spy on the isle has a strand to the Map. A word dropped on one runs to the end. I run the words.',
        'I don\'t read them. I only know where they land. They always land on someone.',
        'Here comes one now. I think it has your name on it.',
      ],
      beaten: [
        'Letters. I ran letters. Love letters, rent, a child\'s drawing to her gran across the Long Strand.',
        'The Map was just a map. Wasn\'t it? A thing for finding your way home.',
      ],
      coins: 200,
    },
    {
      id: fallenId('web', 'drover'),
      court: 'web',
      name: 'The Drover\'s Widow',
      foeName: 'Spider-Drover Yarrow Gantling',
      foeElement: 'earth',
      difficulty: 5,
      hpMult: 1.2,
      gimmick: fallenId('web', 'drover'),
      at: { x: 2040, y: 730 },
      look: { body: 0xb49a80, accent: 0x261f2c, hat: 'straw', traits: ['rod', 'pack', 'beard'], size: 1.3, eye: EYE },
      challenge: [
        'Old Mardle walks where I point her. Pens to mill, mill to pens. And to any door with a mark on it.',
        'She\'s gentle, mostly. Feet like falling posts, mind. Don\'t stand where they\'re coming down.',
        'Walk on, old girl. Walk on.',
      ],
      beaten: [
        'Mardle. She\'s blind in two eyes and frightened of lamps. I walk her slow so she never treads on anyone.',
        'Marked doors... there weren\'t any marked doors. I\'d remember. I\'d have walked her the other way.',
      ],
      coins: 220,
    },
    {
      id: fallenId('web', 'pit'),
      court: 'web',
      name: 'Odds on the Hourglass',
      foeName: 'Oddsman Tibbald Scrope',
      foeElement: 'fate',
      difficulty: 5,
      hpMult: 1.25,
      gimmick: fallenId('web', 'pit'),
      at: { x: 1680, y: 1020 },
      look: { body: 0xd8c0a8, accent: 0xc9a248, hat: 'tophat', traits: ['book', 'pipe', 'glasses'], size: 1.05, eye: EYE },
      challenge: [
        'Red or gold? Red\'s yours. Gold\'s mine. Gold always comes in. I see to that.',
        'A man in debt to the book pays how he can. Some pay in silk. Some in a neighbour\'s name.',
        'Into the ring, then. Mind their legs. I\'ve the odds at nine to one.',
      ],
      beaten: [
        'Spider racing. Down the long rail, for buttons, on festival nights. Nobody bet more than a button.',
        'I never took a name for a debt. I never kept a book that heavy. Did I?',
      ],
      coins: 220,
    },
  ],
};
