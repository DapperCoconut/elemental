import type { FallenBundle } from '../../../../../IslesTypes';
import { fallenId } from '../../../../meteor/spec';
import { FALLEN_HEAVY_ROLLER } from './heavyRoller';
import { FALLEN_KNOT_RETIED } from './knotRetied';
import { FALLEN_QUEEN_CHANGES } from './queenChanges';
import { FALLEN_RAKED_AT_DAWN } from './rakedAtDawn';
import { FALLEN_UNDER_GLASS } from './underGlass';

/**
 * The Bloom Court's Fallen Five — in the star's telling, the people of the gardens who kept the
 * Tithe tidy for the crown: the raker who read the night's footprints, the forcer of the cloched lawn, the
 * groundsman who rolled the short households' stripes flat, the sister who taught the children
 * their knots, and the apiarist who loosed the bees on hidden honey. Tier 1: difficulty 4,4,4,5,5;
 * coins double the court's 55. They stand where the court's own five never do: the Great Walk below
 * the plaza, the forcing lawn's west end, the east lawn above the Long Border, the far west walk,
 * and the Pollinarium's east edge.
 */

const EYE = 0xffa040;

export const FALLEN: FallenBundle = {
  gimmicks: [FALLEN_RAKED_AT_DAWN, FALLEN_UNDER_GLASS, FALLEN_HEAVY_ROLLER, FALLEN_KNOT_RETIED, FALLEN_QUEEN_CHANGES],
  encounters: [
    {
      id: fallenId('bloom', 'raked-at-dawn'),
      court: 'bloom',
      name: 'Raked at Dawn',
      foeName: 'Tobias Harrow, Walk-Raker',
      foeElement: 'gravity',
      difficulty: 4,
      hpMult: 1.1,
      gimmick: fallenId('bloom', 'raked-at-dawn'),
      at: { x: 1200, y: 1350 },
      look: { body: 0xd8c4a8, accent: 0x5a432c, hat: 'straw', traits: ['tool', 'scarf', 'pipe'], size: 1.05, eye: EYE },
      challenge: [
        'I rake the walks before the court wakes. Every footprint in the gravel, I read before I rake it out.',
        'The Mallows crept north in the dark. Three sets of prints. The Weigh-Warden had them by breakfast.',
        'Stand still, stranger. I\'ll comb you out with the rest.',
      ],
      beaten: [
        'I raked the walks so the brides wouldn\'t trip. That was the job. Smooth gravel for the wedding walk.',
        'Footprints... I never read them. I raked them out so nobody could. Didn\'t I?',
      ],
      coins: 110,
    },
    {
      id: fallenId('bloom', 'under-glass'),
      court: 'bloom',
      name: 'Brought On Under Glass',
      foeName: 'Forcer Amaryllis Vane',
      foeElement: 'fire',
      difficulty: 4,
      gimmick: fallenId('bloom', 'under-glass'),
      at: { x: 440, y: 720 },
      look: { body: 0xe4c0a4, accent: 0x8a4327, hat: 'straw', traits: ['apron', 'tool', 'scarf'], size: 1.0, eye: EYE },
      challenge: [
        'Anything put under glass comes on faster. Roses. Seedlings. People who answered the Weigh-Warden back.',
        'I lowered the bell on Hob Larkspur myself. He came on lovely. Very quiet now.',
        'Hold still, dear. It\'s warmer under here.',
      ],
      beaten: [
        'Tomatoes. I forced tomatoes, early, for the fair. And I lifted the bells off at noon so they\'d breathe.',
        'Hob. Somebody should lift Hob\'s bell. Why haven\'t I lifted Hob\'s bell?',
      ],
      coins: 110,
    },
    {
      id: fallenId('bloom', 'heavy-roller'),
      court: 'bloom',
      name: 'The Heavy Roller',
      foeName: 'Groundsman Abel Stroud',
      foeElement: 'earth',
      difficulty: 4,
      hpMult: 1.15,
      gimmick: fallenId('bloom', 'heavy-roller'),
      at: { x: 1450, y: 700 },
      look: { body: 0xb08c6c, accent: 0x3f5f26, hat: 'cap', traits: ['beard', 'apron', 'pipe'], size: 1.3, eye: EYE },
      challenge: [
        'Short household goes north on the cart. Then I roll their stripe. Flat. Next year nobody remembers it.',
        'Across, step over, back. That\'s how you keep a lawn. Nothing sticks up for long.',
        'You\'re sticking up, friend.',
      ],
      beaten: [
        'Bowls. I rolled the green for the Thursday bowls. Old men in hats, arguing over an inch.',
        'Whose stripe did I flatten? I can see the stake. I can\'t read the number.',
      ],
      coins: 110,
    },
    {
      id: fallenId('bloom', 'knot-retied'),
      court: 'bloom',
      name: 'The Knot Re-Tied',
      foeName: 'Sister Wormwood',
      foeElement: 'growth',
      difficulty: 5,
      hpMult: 1.2,
      gimmick: fallenId('bloom', 'knot-retied'),
      at: { x: 150, y: 640 },
      look: { body: 0xe0d0bc, accent: 0x1d3b1d, hat: 'coif', traits: ['book', 'glasses', 'cane'], size: 0.9, eye: EYE },
      challenge: [
        'Over, under, and never out of your own bed. I taught every child in the court that knot.',
        'They learn it young. They walk it all their lives. The ones who step out go to the Glasshouse.',
        'Let\'s see you learn it. I\'ll tie it twice, in case you\'re slow.',
      ],
      beaten: [
        'Cat\'s cradle. I taught them cat\'s cradle, on wet afternoons, with garden twine.',
        'The knots were for fun. They were only ever for fun. Who told me they were rules?',
      ],
      coins: 125,
    },
    {
      id: fallenId('bloom', 'queen-changes'),
      court: 'bloom',
      name: 'The Queen Changes Hands',
      foeName: 'Apiarist Orrin Hume',
      foeElement: 'slime',
      difficulty: 5,
      hpMult: 1.25,
      gimmick: fallenId('bloom', 'queen-changes'),
      at: { x: 2200, y: 1300 },
      look: { body: 0xd4b48c, accent: 0xc9a456, hat: 'veil', traits: ['satchel', 'scarf', 'tool'], size: 1.1, eye: EYE },
      challenge: [
        'A house hides honey from the Tithe, I walk the queen past their door. The Ladies do the rest.',
        'Wherever she goes, they go. Lovely creatures. Very loyal. Very easily led.',
        'Here. Hold her for me.',
      ],
      beaten: [
        'Swarms. I caught swarms, out of chimneys and apple trees, and gave them a home. That was all.',
        'Wendeline taught me. Did I ever thank her? I think I told on her. I didn\'t. Did I?',
      ],
      coins: 125,
    },
  ],
};
