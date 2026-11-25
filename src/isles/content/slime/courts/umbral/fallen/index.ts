import type { FallenBundle } from '../../../../../IslesTypes';
import { fallenId } from '../../../../meteor/spec';
import { FALLEN_BORROWED_DARK } from './borrowedDark';
import { FALLEN_MOTH_FINDER } from './mothFinder';
import { FALLEN_ONE_WATER } from './oneWater';
import { FALLEN_SHADE_DROVE } from './shadeDrove';
import { FALLEN_SHADOW_SHOW } from './shadowShow';

/**
 * The Umbral Court's Fallen Five — in the star's telling, the people under the canopy who kept the
 * dark for the Prince: the candle-finder who loosed moths in parlours, the showman whose
 * hand-shadows played at his suppers, the wickwife who sold the dark on tick, the drover who collared
 * the loose shadows for the looms, and the mere-warden who listened through the one black water.
 * Tier 3: difficulty 4,5,5,5,5; coins double the court's 115. They stand where the court's own five
 * never do: among the hollow trees west, under the Draught House eaves, by the drying racks' end,
 * below the Cloak road's east verge, and on the mere's north bank.
 */

const EYE = 0xffa040;
const COINS = 230;

export const FALLEN: FallenBundle = {
  gimmicks: [FALLEN_MOTH_FINDER, FALLEN_SHADOW_SHOW, FALLEN_BORROWED_DARK, FALLEN_SHADE_DROVE, FALLEN_ONE_WATER],
  encounters: [
    {
      id: fallenId('umbral', 'moth-finder'),
      court: 'umbral',
      name: 'The Moth-Finder',
      foeName: 'Candle-Finder Corriwen Drave',
      foeElement: 'quantum',
      difficulty: 4,
      hpMult: 1.1,
      gimmick: fallenId('umbral', 'moth-finder'),
      at: { x: 260, y: 420 },
      look: { body: 0xb0a49a, accent: 0x2a2236, hat: 'tricorn', traits: ['lantern', 'satchel'], size: 1.1, eye: EYE },
      challenge: [
        'I uncork a jar in the parlour and sit down. The moths find the candle. They always find the candle.',
        'Behind the clock, under the floor, in the baby\'s cot. A moth doesn\'t care where. It only wants the light.',
        'You\'ve got a little yellow in you, stranger. They can smell it from here.',
      ],
      beaten: [
        'Moths. I caught them off the lamps so they wouldn\'t burn. In jars, and let them out over the mere.',
        'I never followed them anywhere. Whose parlour was that? Why do I remember the candle going out?',
      ],
      coins: COINS,
    },
    {
      id: fallenId('umbral', 'shadow-show'),
      court: 'umbral',
      name: 'The Hand-Shadow Show',
      foeName: 'Showman Teodric Mumm',
      foeElement: 'memory',
      difficulty: 5,
      gimmick: fallenId('umbral', 'shadow-show'),
      at: { x: 800, y: 250 },
      look: { body: 0xd0c4b4, accent: 0x3a2a4a, hat: 'tophat', traits: ['cane', 'scarf'], size: 1.0, eye: EYE },
      challenge: [
        'A moon in a bottle, a lens, and these two hands. His Highness laughs till he weeps. Tonight he laughs at you.',
        'The wolf is my left hand. The hare is my right. The hawk is both, and it never misses supper.',
        'Don\'t stand in my light, dear. Unless you want to see the show from the inside.',
      ],
      beaten: [
        'Children. I did the hare for children, on the bedroom wall, when the black lamps scared them.',
        'Who was laughing? There was never a supper. Only a sickroom, and a boy who couldn\'t sleep.',
      ],
      coins: COINS,
    },
    {
      id: fallenId('umbral', 'borrowed-dark'),
      court: 'umbral',
      name: 'Borrowed Dark',
      foeName: 'Wickwife Ambrosine Kell',
      foeElement: 'wax',
      difficulty: 5,
      hpMult: 1.15,
      gimmick: fallenId('umbral', 'borrowed-dark'),
      at: { x: 1100, y: 1470 },
      look: { body: 0xc8bca8, accent: 0x14081c, hat: 'candle', traits: ['apron', 'lantern'], size: 1.05, eye: EYE },
      challenge: [
        'Sit under my lamp and you mend. Everyone mends. The dark is very generous, until the wick is short.',
        'I dip a candle for every sickbed on the Dimming Road. I keep a tally on every one.',
        'Come into the pool, love. Pay me when it gutters. Everybody pays when it gutters.',
      ],
      beaten: [
        'I gave them away. The candles. Under the shutters, to the grey houses. Nobody owed me a thing.',
        'Why would I write it down? Who keeps a tally of a kindness? Somebody wants me to have kept one.',
      ],
      coins: COINS,
    },
    {
      id: fallenId('umbral', 'shade-drove'),
      court: 'umbral',
      name: 'The Shade-Drove',
      foeName: 'Shade-Drover Gamaliel Wyvenhoe',
      foeElement: 'death',
      difficulty: 5,
      hpMult: 1.2,
      gimmick: fallenId('umbral', 'shade-drove'),
      at: { x: 1800, y: 300 },
      look: { body: 0x9a948c, accent: 0x1a1420, hat: 'cowl', traits: ['cane', 'pack'], size: 1.2, eye: EYE },
      challenge: [
        'Shadows wander off here. Somebody has to bring them in. The looms pay by the yard.',
        'These three were a cooper, a midwife and a boy who kept moths. Now they keep me.',
        'Strays find a collar in the end. I\'ve one in my pocket your size.',
      ],
      beaten: [
        'I walked them home. The lost ones. To the doors they slipped out of, so their people could stop crying.',
        'I never sold a yard of anybody. Why does my crook feel like it has been somewhere I wasn\'t?',
      ],
      coins: COINS,
    },
    {
      id: fallenId('umbral', 'one-water'),
      court: 'umbral',
      name: 'One Black Water',
      foeName: 'Mere-Warden Isaura Dunlin',
      foeElement: 'depths',
      difficulty: 5,
      hpMult: 1.25,
      gimmick: fallenId('umbral', 'one-water'),
      at: { x: 1960, y: 1000 },
      look: { body: 0xa8b0bc, accent: 0x07060c, hat: 'hood', traits: ['rod', 'satchel'], size: 1.0, eye: EYE },
      challenge: [
        'Every well in Umbral is the mere showing through. Whisper over a bucket and I hear it on my bank.',
        'The water has one face and many mouths. Drop a stone in one and it comes up where I please.',
        'Throw if you like. The water carries it round. It always comes back to someone.',
      ],
      beaten: [
        'I drew water. Buckets, for the queue at the Draught House, so nobody waited thirsty in the dark.',
        'I never listened. I sang over the wells to keep the children from falling in. That was all.',
      ],
      coins: COINS,
    },
  ],
};
