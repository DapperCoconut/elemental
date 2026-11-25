import type { FallenBundle } from '../../../../../IslesTypes';
import { fallenId } from '../../../../meteor/spec';
import { FALLEN_TOSSED } from './blanket';
import { FALLEN_CARRIED_IN } from './chair';
import { FALLEN_FELTED } from './felted';
import { FALLEN_LET_IT_LIE } from './letItLie';
import { FALLEN_OFF_THE_FELT } from './offTheFelt';

/**
 * The Hush Court's Fallen Five — in the star's telling, the trades that kept the silence with
 * their hands rather than their mouths: the fuller whose stocks beat the felt for the Quiet House
 * doors, the warden who lays (and lifts) the felt runners over the iced cobbles, the sergeant of
 * the blanket-toss, the snow-warden who sees that no snow is ever cleared, and the keeper of the
 * padded chair that carries the noisy in. Tier 3: difficulty 4,4,5,5,5; coins double the court's
 * 130. They stand where the court's own five never fight: the mill yard above the fulling mill, the
 * north side of Bell Green, the north road below Sister Lintel, under Lantern Lane by Fleece's
 * stall, and the snow east of the Quiet House.
 */

const EYE = 0xffa040;
const COINS = 260;

export const FALLEN: FallenBundle = {
  gimmicks: [FALLEN_FELTED, FALLEN_OFF_THE_FELT, FALLEN_TOSSED, FALLEN_LET_IT_LIE, FALLEN_CARRIED_IN],
  encounters: [
    {
      id: fallenId('hush', 'felted'),
      court: 'hush',
      name: 'Felted In',
      foeName: 'Hamnet Waulk, Master Fuller',
      foeElement: 'earth',
      difficulty: 4,
      hpMult: 1.1,
      gimmick: fallenId('hush', 'felted'),
      at: { x: 560, y: 1280 },
      look: { body: 0xc8a88c, accent: 0x998a6c, hat: 'cap', traits: ['apron', 'beard', 'tool'], size: 1.25, eye: EYE },
      challenge: [
        'Every padded door up at the Quiet House was a fleece in my yard once. Wet, and loud, and loose.',
        'Beat it enough and it shrinks. Beat it more and it holds its tongue for a hundred years.',
        'Lie down on the wool, stranger. It\'s soft. Soft is where the stocks come down.',
      ],
      beaten: [
        'I fulled cloth. Coats. Blankets for the cottages up the terrace. Warm things.',
        'Did I ever make a door? I can feel the weight of the mallet. I can\'t remember the door at all.',
      ],
      coins: COINS,
    },
    {
      id: fallenId('hush', 'off-the-felt'),
      court: 'hush',
      name: 'Off the Felt',
      foeName: 'Ebenezer Tuft, Runner-Warden',
      foeElement: 'air',
      difficulty: 4,
      hpMult: 1.05,
      gimmick: fallenId('hush', 'off-the-felt'),
      at: { x: 1150, y: 640 },
      look: { body: 0xd0b8a0, accent: 0x5a6e8a, hat: 'earmuffs', traits: ['scarf', 'lantern'], size: 0.98, eye: EYE },
      challenge: [
        'I lay the felt so no heel rings on the stone. Between the runners we water the cobbles at night.',
        'Stand on my felt, if you like. I know which end of every runner the tassel\'s on.',
        'Mind the ice. It takes you where you were going, and then a little further, and then the bank.',
      ],
      beaten: [
        'I laid runners so the old folk wouldn\'t slip. Sand on the ice. That was it. Sand on the ice.',
        'Pull one out from under somebody? Why would anyone… I\'m sorry. I\'m sorry, was that me?',
      ],
      coins: COINS,
    },
    {
      id: fallenId('hush', 'tossed'),
      court: 'hush',
      name: 'Tossed in a Blanket',
      foeName: 'Griselda Hoy, Blanket-Sergeant',
      foeElement: 'rubber',
      difficulty: 5,
      hpMult: 1.15,
      gimmick: fallenId('hush', 'tossed'),
      at: { x: 1650, y: 760 },
      look: { body: 0xdcc4ac, accent: 0x2c3352, hat: 'earmuffs', traits: ['cane', 'scarf'], size: 1.15, eye: EYE },
      challenge: [
        'We don\'t beat the noisy in Hush. Beating makes a noise. We toss them. Up, and down, and up.',
        'Four good wardens at the corners and not a sound out of anybody. Not even you, in the end.',
        'Corners! On my tugs. One, two — and mind where the felt is when you come down, dearie.',
      ],
      beaten: [
        'We tossed the children at the Midwinter fair. They screamed. They screamed laughing. I remember that.',
        'That was a game. Wasn\'t it? That was always a game. Who made it into this?',
      ],
      coins: COINS,
    },
    {
      id: fallenId('hush', 'let-it-lie'),
      court: 'hush',
      name: 'Let It Lie',
      foeName: 'Wilhelmina Hoarley, Snow-Warden',
      foeElement: 'ice',
      difficulty: 5,
      hpMult: 1.15,
      gimmick: fallenId('hush', 'let-it-lie'),
      at: { x: 600, y: 800 },
      look: { body: 0xe0ccb8, accent: 0x2c3352, hat: 'earmuffs', traits: ['scarf', 'cane'], size: 1.08, eye: EYE },
      challenge: [
        'A shovel scrapes, stranger. A broom hisses. So in Hush the snow lies where it falls.',
        'I walk the yard to see nobody clears it. Every hour it\'s deeper. Every hour it\'s quieter.',
        'Stand still a while. It\'s soft. It will close over you so gently you\'ll never hear it.',
      ],
      beaten: [
        'I cleared the paths. Every morning, before the old folk were up. I had the widest shovel in Hush.',
        'Let it lie? I never let it lie in my life. Who told you that? Who told me that?',
      ],
      coins: COINS,
    },
    {
      id: fallenId('hush', 'carried-in'),
      court: 'hush',
      name: 'Carried In',
      foeName: 'Osyth Quilliam, Chair-Warden',
      foeElement: 'bind',
      difficulty: 5,
      hpMult: 1.2,
      gimmick: fallenId('hush', 'carried-in'),
      at: { x: 2200, y: 700 },
      look: { body: 0xe4d0bc, accent: 0x48354a, hat: 'veil', traits: ['lantern', 'book'], size: 1.05, eye: EYE },
      challenge: [
        'Nobody walks to the Quiet House. Walking is loud. They ride, in my chair, padded all the way.',
        'Silk at the window so they needn\'t look. Felt on the bearers\' boots. A ribbon when they come out.',
        'The chair is coming for you, love. It only ever takes the first it reaches. Stand still.',
      ],
      beaten: [
        'I carried the old and the lame up the terrace in it. To church. To weddings. That was the chair.',
        'Nobody came out of the Quiet House with a ribbon. Did they? Tell me nobody did.',
      ],
      coins: COINS,
    },
  ],
};
