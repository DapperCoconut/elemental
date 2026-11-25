import type { FallenBundle } from '../../../../../IslesTypes';
import { fallenId } from '../../../../meteor/spec';
import { FALLEN_FLAG_FALL } from './flagFall';
import { FALLEN_GREYING } from './greyingHour';
import { FALLEN_OVERWOUND } from './overwound';
import { FALLEN_SIX_PIPS } from './sixPips';
import { FALLEN_STOPPED } from './stoppedClocks';

/**
 * The Clockwork Court's Fallen Five — in the star's telling, the people of the clock town who kept
 * the hours for the crown: the window-clerk who timed each plea on his counter clock, the key-wife
 * who wound the drawn like toys, the stopper who stopped the clocks of the living, the dial-painter
 * who greyed each paid hour, and the time-caller whose pips sent the collectors out. Tier 2:
 * difficulty 4,4,5,5,5; coins double the court's 110. They stand where the court's own five never
 * do: the east road, the south lawn, the far east road, the gap below the Regulator and the
 * square's southern setts.
 */

const EYE = 0xffa040;
const COINS = 220;

export const FALLEN: FallenBundle = {
  gimmicks: [FALLEN_FLAG_FALL, FALLEN_OVERWOUND, FALLEN_STOPPED, FALLEN_GREYING, FALLEN_SIX_PIPS],
  encounters: [
    {
      id: fallenId('clockwork', 'flag-fall'),
      court: 'clockwork',
      name: 'Flag Fall',
      foeName: 'Window-Clerk Ambrell Quoyle',
      foeElement: 'paper',
      difficulty: 4,
      hpMult: 1.1,
      gimmick: fallenId('clockwork', 'flag-fall'),
      at: { x: 2050, y: 860 },
      look: { body: 0xd2b89c, accent: 0x2a2c32, hat: 'visor', traits: ['glasses', 'book'], size: 0.95, eye: EYE },
      challenge: [
        'Window four. You have one turn of the clock to state your case. Everyone gets one turn. It is fair.',
        'When the little red flag drops, the hour is taken. I don\'t take it. The flag does. I only watch it.',
        'Your clock is running, by the way. It started when you walked up. Please, go on.',
      ],
      beaten: [
        'I timed... chess. Saturday nights in the back of the Office. Old Hobday always lost on time. Always.',
        'Did I ever time a person? Not a game. A person. I can hear a flag falling and I don\'t know whose.',
      ],
      coins: COINS,
    },
    {
      id: fallenId('clockwork', 'overwound'),
      court: 'clockwork',
      name: 'Overwound',
      foeName: 'Key-Wife Dimity Ruddle',
      foeElement: 'rubber',
      difficulty: 4,
      hpMult: 1.1,
      gimmick: fallenId('clockwork', 'overwound'),
      at: { x: 1250, y: 1130 },
      look: { body: 0xe0c0a4, accent: 0x7a5a22, hat: 'beanie', traits: ['satchel', 'tool', 'apron'], size: 1.05, eye: EYE },
      challenge: [
        'Ninety-one keys on my ring, dear, and one for every back on the Row. Turn, turn, and off they go.',
        'A body that can\'t pay its hours can still work them. You only want winding. Everyone wants winding.',
        'Mind you don\'t take too many turns. Springs are like people. They only bear so much.',
      ],
      beaten: [
        'Gable clocks. I wound the gable clocks, ninety-one of them, and the children followed me for the chimes.',
        'Keys in backs? Whatever put that in my head? I\'d never... I had a little tin mouse once. Just a mouse.',
      ],
      coins: COINS,
    },
    {
      id: fallenId('clockwork', 'stopped'),
      court: 'clockwork',
      name: 'All the Clocks Stopped',
      foeName: 'Stopper Gervase Lammerlaw',
      foeElement: 'silence',
      difficulty: 5,
      hpMult: 1.15,
      gimmick: fallenId('clockwork', 'stopped'),
      at: { x: 2240, y: 1080 },
      look: { body: 0xb8b0a4, accent: 0x141214, hat: 'tophat', traits: ['scarf', 'cane'], size: 1.15, eye: EYE },
      challenge: [
        'When a house can\'t pay, I go round and stop its clocks. Every one. Then I hang the crepe. Then it\'s quiet.',
        'A stopped clock is a kindness. Nothing more is owed by a house whose time has ended.',
        'Throw what you like at me. In my yard, it will wait. Everything waits, here.',
      ],
      beaten: [
        'I stopped clocks for the dead. Only ever the dead. A widow would ask, and I\'d do it gently, and go.',
        'The living? No. I\'d never... whose house was that, with the children still at the window?',
      ],
      coins: COINS,
    },
    {
      id: fallenId('clockwork', 'greying'),
      court: 'clockwork',
      name: 'The Greying Hour',
      foeName: 'Dial-Painter Ivett Greaves',
      foeElement: 'chalk',
      difficulty: 5,
      hpMult: 1.2,
      gimmick: fallenId('clockwork', 'greying'),
      at: { x: 1640, y: 430 },
      look: { body: 0xd8bea4, accent: 0xa8a8a0, hat: 'beret', traits: ['apron', 'tool', 'glasses'], size: 1, eye: EYE },
      challenge: [
        'I paint the hours on the board as they\'re paid. One stroke of grey per hour. It never quite washes off.',
        'You\'ll have seen them in the queue. Grey at the temples at twenty. That\'s my hand. Steady, isn\'t it?',
        'Stand still, would you? The brush is coming round, and I do so hate to go over a line.',
      ],
      beaten: [
        'Numerals. Gold leaf on the great dial, every spring, up on the scaffold. I painted the hours. Not people.',
        'Grey... I never kept a pot of grey. Why are my hands grey? Why are they grey to the wrist?',
      ],
      coins: COINS,
    },
    {
      id: fallenId('clockwork', 'pips'),
      court: 'clockwork',
      name: 'The Six Pips',
      foeName: 'Time-Caller Fabian Sixsmith',
      foeElement: 'sound',
      difficulty: 5,
      hpMult: 1.25,
      gimmick: fallenId('clockwork', 'pips'),
      at: { x: 1020, y: 1060 },
      look: { body: 0xc8a888, accent: 0x3e5ec8, hat: 'bandmaster', traits: ['pipe', 'satchel'], size: 1.2, eye: EYE },
      challenge: [
        'Five short and one long. Every clock on the hill is set by me. Every collector too.',
        'The long pip is the hour. Wherever a body stands on the long pip — well. That\'s where the time finds it.',
        'Listen. You can hear yourself being counted. Pip.',
      ],
      beaten: [
        'I called the time for the fishing boats, so they\'d know to come in before the tide. That\'s all pips are for.',
        'Collectors? I never called a collector in my life. Did I? I can still hear the sixth one. It won\'t stop.',
      ],
      coins: COINS,
    },
  ],
};
