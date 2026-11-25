import type { FallenBundle } from '../../../../../IslesTypes';
import { fallenId } from '../../../../meteor/spec';
import { EYE } from './common';
import { FALLEN_LICENSED_PATH } from './licensedPath';
import { FALLEN_PRESSED_FLAT } from './pressedFlat';
import { FALLEN_SMOKE_SHOWED } from './smokeShowed';
import { FALLEN_STRUCK_THROUGH } from './struckThrough';
import { FALLEN_TOLD_BACK } from './toldBack';

/**
 * The Fable Court's Fallen Five — in the star's telling, the people of the storybook town who
 * kept Prince Legend's licence for him: the binder who pressed the town's own tales shut, the
 * keeper of the censors' fire, the Huntsman of the licensed road, the Reader-Aloud who read the town
 * its own day back, and the Office clerk who struck out what was said too often. Tier 2:
 * difficulty 4,4,4,5,5; coins double the court's 75. They stand where the court's own five never
 * do: below the north road by the Office, the square south of the fire, the west lawn by the
 * Playhouse, the lane among the pop-ups east, and the grass under the giant's boot.
 */

const COURT = 'fable';
const COINS = 150;

export const FALLEN: FallenBundle = {
  gimmicks: [FALLEN_PRESSED_FLAT, FALLEN_SMOKE_SHOWED, FALLEN_LICENSED_PATH, FALLEN_TOLD_BACK, FALLEN_STRUCK_THROUGH],
  encounters: [
    {
      id: fallenId(COURT, 'pressed-flat'), court: COURT, name: 'Pressed Flat',
      foeName: 'Ottoline Crease, Binder', foeElement: 'paper', difficulty: 4, hpMult: 1.1,
      gimmick: fallenId(COURT, 'pressed-flat'),
      at: { x: 950, y: 330 },
      look: { body: 0xe8d0b8, accent: 0x6a3e7a, hat: 'coif', traits: ['apron', 'tool', 'glasses'], size: 0.95, eye: EYE },
      challenge: [
        'A tale is safest shut. I bind them tight, I press them flat, and nobody in them ever moves again.',
        'Mind the leaves, dear. When a page comes down on you, you stay where the story put you.',
        'Come and stand in my book. There is a lovely flat space on the left. Or is it the right?',
      ],
      beaten: [
        'I… mended books. Spines that had cracked. I sewed them so they would open. Didn\'t I?',
        'I never pressed anyone. I pressed flowers, in the back of the almanac. Violets. Why did I forget?',
      ],
      coins: COINS,
    },
    {
      id: fallenId(COURT, 'smoke-showed'), court: COURT, name: 'What the Smoke Showed',
      foeName: 'Aldous Pyre, Fire-Keeper', foeElement: 'fire', difficulty: 4,
      gimmick: fallenId(COURT, 'smoke-showed'),
      at: { x: 1300, y: 1130 },
      look: { body: 0xc8a486, accent: 0x2a2236, hat: 'hood', traits: ['apron', 'tool', 'beard'], size: 1.2, eye: EYE },
      challenge: [
        'Unlicensed. Unlicensed. Into the fire, every one. I don\'t read them. I only watch the smoke.',
        'The smoke tells the story anyway, you see. It always goes to whoever is listening. Downwind.',
        'Stand where you like. The wind and I have an understanding.',
      ],
      beaten: [
        'I… kept the bakehouse oven. Loaves, not books. The smoke smelled of bread. I\'m sure it did.',
        'There was a book under my floorboard. I hid it from them. I read it to my girl. Why can\'t I see it now?',
      ],
      coins: COINS,
    },
    {
      id: fallenId(COURT, 'licensed-path'), court: COURT, name: 'Keep to the Path',
      foeName: 'Brannock Hale, Huntsman', foeElement: 'hunt', difficulty: 4, hpMult: 1.15,
      gimmick: fallenId(COURT, 'licensed-path'),
      at: { x: 2150, y: 1200 },
      look: { body: 0xd0a888, accent: 0x3e7a5e, hat: 'tricorn', traits: ['satchel', 'beard', 'scarf'], size: 1.25, eye: EYE },
      challenge: [
        'The road through the wood is licensed. One way through. Step off it and the wood takes an interest.',
        'I set my snares where people walk. People walk where they\'re told. It\'s a very tidy arrangement.',
        'There\'s a wolf in these trees that answers to the story. It\'s never once answered to me.',
      ],
      beaten: [
        'I… cut the girl out of the wolf. That was the story. I was the one who came in time. Wasn\'t I?',
        'I never snared a soul. I walked children home through the wood with a lantern. Every night.',
      ],
      coins: COINS,
    },
    {
      id: fallenId(COURT, 'told-back'), court: COURT, name: 'Told Back to You',
      foeName: 'Prosper Lectern, Reader-Aloud', foeElement: 'sound', difficulty: 5, hpMult: 1.2,
      gimmick: fallenId(COURT, 'told-back'),
      at: { x: 210, y: 880 },
      look: { body: 0xf0d8c0, accent: 0xb84a52, hat: 'plume', traits: ['book', 'glasses', 'cane'], size: 1.05, eye: EYE },
      challenge: [
        'Every evening I read the town its own day back. The way the crown would rather it had gone.',
        'I\'m reading you now, a step behind. Do mind where you\'ve been. The giant has a very loud voice.',
        'Turn back, if you like. The story is waiting for you there.',
      ],
      beaten: [
        'I… read to the little ones. At the Last Page, on wet afternoons. They chose the book. Not me.',
        'I never told anyone their own day. I did the voices. The wolf, the giant. They laughed. I remember that.',
      ],
      coins: COINS,
    },
    {
      id: fallenId(COURT, 'struck-through'), court: COURT, name: 'Struck Through',
      foeName: 'Primula Vellum, Clerk of Licences', foeElement: 'silence', difficulty: 5, hpMult: 1.2,
      gimmick: fallenId(COURT, 'struck-through'),
      at: { x: 1950, y: 620 },
      look: { body: 0xe0c8b0, accent: 0x3e5c9a, hat: 'veil', traits: ['glasses', 'book', 'satchel'], size: 0.9, eye: EYE },
      challenge: [
        'Submitted for licence: one stranger. I have read you closely. You repeat yourself.',
        'Whatever you say most, I strike out. Say it again and I stamp it. The Office is very thorough.',
        'Do keep to your licence, dear. The approved are rewarded. The rest are corrected.',
      ],
      beaten: [
        'I… copied out the old tales. By hand. So there\'d be more of them, not fewer. Was that me?',
        'I never struck a word in my life. I underlined the good ones. In blue. For the children to find.',
      ],
      coins: COINS,
    },
  ],
};
