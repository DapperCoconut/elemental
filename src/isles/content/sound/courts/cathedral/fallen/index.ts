import type { FallenBundle } from '../../../../../IslesTypes';
import { fallenId } from '../../../../meteor/spec';
import { EYE } from './common';
import { FALLEN_EMBER_FAST } from './emberFast';
import { FALLEN_ENDOWED } from './endowed';
import { FALLEN_HOARFROST } from './hoarfrost';
import { FALLEN_RECKONED_AHEAD } from './reckonedAhead';
import { FALLEN_ROLLED_CLEAR } from './rolledClear';

/**
 * The Cathedral Court's Fallen Five — in the star's telling, the summit's own people who kept the
 * Maestro's cathedral cold and orderly for him: the Novice-Master whose boys sweep the close, the
 * Computist who reckons the feasts, the chantry-priest who sings only for those who pay, the
 * Refectorian who keeps the Ember Days' fast, and the Rail-Warden who keeps pilgrims kneeling in the
 * snow. Tier 4: difficulty 4,4,5,5,5; coins double the court's 140. They stand where the court's own
 * five never do: the east of the close, the side-path by the cloister, under the chandlery, the
 * snow south of the cloisters, and the foot of the stair among the drifts.
 */

const COURT = 'cathedral';
const COINS = 280;

export const FALLEN: FallenBundle = {
  gimmicks: [FALLEN_ROLLED_CLEAR, FALLEN_RECKONED_AHEAD, FALLEN_ENDOWED, FALLEN_EMBER_FAST, FALLEN_HOARFROST],
  encounters: [
    {
      id: fallenId(COURT, 'rolled-clear'), court: COURT, name: 'Rolled Clear',
      foeName: 'Novice-Master Wulfric Dene', foeElement: 'ice', difficulty: 4, hpMult: 1.1,
      gimmick: fallenId(COURT, 'rolled-clear'),
      at: { x: 1450, y: 1000 },
      look: { body: 0xd8c8b4, accent: 0x24222a, hat: 'beanie', traits: ['scarf', 'tool'], size: 1.1, eye: EYE },
      challenge: [
        'My boys sweep the close at dawn. All the snow they sweep comes to me, and I find a use for every flake.',
        'It rolls off the roof at whoever kneels out of place. On the snow it grows. On my clean flags it shrinks.',
        'You are out of place, I think. Mind the eaves.',
      ],
      beaten: [
        'I… swept the steps so the old ones wouldn\'t slip. That was all the snow was ever for. Wasn\'t it?',
        'The boys used to build a snow-Maestro by the west door and pelt it. I joined in. I\'m nearly sure I did.',
      ],
      coins: COINS,
    },
    {
      id: fallenId(COURT, 'reckoned-ahead'), court: COURT, name: 'Reckoned Ahead',
      foeName: 'Computist Boethia Lunell', foeElement: 'astra', difficulty: 4, hpMult: 1.05,
      gimmick: fallenId(COURT, 'reckoned-ahead'),
      at: { x: 1720, y: 620 },
      look: { body: 0xe0d0c0, accent: 0x2a1e58, hat: 'coif', traits: ['glasses', 'book'], size: 0.95, eye: EYE },
      challenge: [
        'I reckon the feasts. Easter, nineteen years ahead, to the very Sunday. Nothing on this summit surprises me.',
        'Least of all you. Walk on as you are walking, and I already know where you will be standing. And when.',
        'Your date is set, dear. Do try to keep it.',
      ],
      beaten: [
        'You turned. Every time I had you, you turned. I… only ever reckoned the moon. For the fishing boats.',
        'The tide tables. I gave them away at the quay. Nobody was ever meant to be where I said. Only the sea.',
      ],
      coins: COINS,
    },
    {
      id: fallenId(COURT, 'endowed'), court: COURT, name: 'Endowed',
      foeName: 'Chantry-Priest Florian Gelt', foeElement: 'fortune', difficulty: 5, hpMult: 1.15,
      gimmick: fallenId(COURT, 'endowed'),
      at: { x: 300, y: 960 },
      look: { body: 0xd4bca4, accent: 0x8a1830, hat: 'cowl', traits: ['satchel', 'beard'], size: 1.15, eye: EYE },
      challenge: [
        'Every chapel round the nave sings for one soul only: the one who paid. That is what an endowment is.',
        'A penny in the box and the grille keeps the world out. No penny, and you are standing in someone\'s grief.',
        'I have bought most of them. The rest are for sale.',
      ],
      beaten: [
        'You bought my own chapel from under me. I… used to sing for the paupers. In the empty chapels. For nothing.',
        'For nothing. Their names on a slip of paper in my sleeve. I think the slip is still there.',
      ],
      coins: COINS,
    },
    {
      id: fallenId(COURT, 'ember-fast'), court: COURT, name: 'Ember Fast',
      foeName: 'Refectorian Hubert Crust', foeElement: 'gum', difficulty: 5, hpMult: 1.2,
      gimmick: fallenId(COURT, 'ember-fast'),
      at: { x: 2050, y: 1440 },
      look: { body: 0xd8c0a4, accent: 0x5a3c28, hat: 'chef', traits: ['apron', 'satchel'], size: 1.25, eye: EYE },
      challenge: [
        'On the Ember Days the summit fasts, and I keep the fast. Hunger is only devotion you have not spent yet.',
        'Hold your tongue and your hands, and it gathers over your head. Spend it, and it comes down on someone.',
        'Here — have a loaf. No? Then let us see who can wait longer.',
      ],
      beaten: [
        'You waited me out. I… baked for the pilgrims. Black bread at the hatch, every morning, fast day or not.',
        'Nobody ever went down the stair hungry. Not on my watch. Why did I think the bread was a weapon?',
      ],
      coins: COINS,
    },
    {
      id: fallenId(COURT, 'hoarfrost'), court: COURT, name: 'Hoarfrost',
      foeName: 'Rail-Warden Mildred Kneale', foeElement: 'tempest', difficulty: 5, hpMult: 1.25,
      gimmick: fallenId(COURT, 'hoarfrost'),
      at: { x: 840, y: 1480 },
      look: { body: 0xe4d4c4, accent: 0x6a645c, hat: 'hood', traits: ['lantern', 'cane'], size: 0.9, eye: EYE },
      challenge: [
        'The pilgrims kneel at my rails through the Hours, and the frost settles on them. It keeps them so still.',
        'Rime is a kindness. It turns the wind, it turns a blow. And then it closes, and they are quiet for good.',
        'Kneel with me, love. Just for a little.',
      ],
      beaten: [
        'Cut on my own rime. I… brought them blankets. Broth in a can, and a lantern to warm their hands.',
        'I knocked the frost off their shoulders. Every one. I\'d forgotten my hands ever did that.',
      ],
      coins: COINS,
    },
  ],
};
