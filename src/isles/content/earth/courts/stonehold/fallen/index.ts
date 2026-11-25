import type { FallenBundle } from '../../../../../IslesTypes';
import { fallenId } from '../../../../meteor/spec';
import { FALLEN_BOUNDS } from './bounds';
import { FALLEN_COURSE } from './courseByCourse';
import { FALLEN_HAG_STONES } from './hagStones';
import { FALLEN_MAIDENS } from './maidens';
import { FALLEN_NOT_ONE_STEP } from './notOneStep';

/**
 * The Stonehold Court's Fallen Five — in the star's telling, the people of the boulder town who
 * kept Prince Bould's ground for him: the reeve who walked the bounds a step further out every
 * spring, the keeper of the holed stones who told on the mothers, the piper who played the
 * Maidens into the ring, the Prince's champion on the Moot table, and the waller who shut the
 * short households into their own front doors. Tier 1: difficulty 4,4,4,5,5; coins double the
 * court's 70. They stand where the court's own five never go: the causeway's west edge, the
 * quarry pool's shore, the avenue's east shoulder, the yard behind the Tithe board, and the
 * scree foot under the face, east of the keep.
 */

const EYE = 0xffa040;

export const FALLEN: FallenBundle = {
  gimmicks: [FALLEN_BOUNDS, FALLEN_HAG_STONES, FALLEN_MAIDENS, FALLEN_NOT_ONE_STEP, FALLEN_COURSE],
  encounters: [
    {
      id: fallenId('stonehold', 'bounds'),
      court: 'stonehold',
      name: 'Beating the Bounds',
      foeName: 'Reeve Wystan Merestone',
      foeElement: 'conquest',
      difficulty: 4,
      hpMult: 1.1,
      gimmick: fallenId('stonehold', 'bounds'),
      at: { x: 420, y: 470 },
      look: { body: 0xc8a888, accent: 0x5b4a6e, hat: 'tophat', traits: ['cane', 'book'], size: 1.1, eye: EYE },
      challenge: [
        'Every spring I walk the Prince\'s bounds with a drum and a gang of boys, and the stones come with me.',
        'A merestone stands where the Crown says it stands. This spring it says it stands where you are.',
        'You are on the Prince\'s land, friend. Everyone is, if I walk far enough.',
      ],
      beaten: [
        'The bounds... the Pryce field ran to the thorn, and the thorn is still there. I never moved a stone.',
        'I beat the bounds so the children would remember where the old fields ran. That was all it was for.',
      ],
      coins: 140,
    },
    {
      id: fallenId('stonehold', 'hag-stones'),
      court: 'stonehold',
      name: 'Through the Hag-Stone',
      foeName: 'Sibbet Holeway',
      foeElement: 'light',
      difficulty: 4,
      gimmick: fallenId('stonehold', 'hag-stones'),
      at: { x: 1600, y: 1150 },
      look: { body: 0xd8c4b0, accent: 0x3e6c74, hat: 'veil', traits: ['satchel', 'lantern'], size: 0.92, eye: EYE },
      challenge: [
        'A copper a pass, three passes for a cure. I keep a little book of whose children came through, and when.',
        'The Prince\'s men like to know who was out of the house on a Tithe-day. The stones see everything, dear.',
        'Go on, hit it. Everything you give the stone, it gives back twice. Ask the mothers.',
      ],
      beaten: [
        'Three times through for luck. I never took a copper for it. Who would take a copper for a sick child?',
        'There was no book. I held the little ones\' hands so they wouldn\'t be frightened of the dark in the hole.',
      ],
      coins: 140,
    },
    {
      id: fallenId('stonehold', 'maidens'),
      court: 'stonehold',
      name: 'The Maidens Dance',
      foeName: 'Lowri Chanter, the Regent\'s Piper',
      foeElement: 'sound',
      difficulty: 4,
      hpMult: 1.05,
      gimmick: fallenId('stonehold', 'maidens'),
      at: { x: 1460, y: 600 },
      look: { body: 0xe0c0a0, accent: 0x7a5636, hat: 'beret', traits: ['scarf', 'pipe'], size: 0.95, eye: EYE },
      challenge: [
        'They danced on a Tithe-day, so the Regent paid me to play them a tune that would last. It is lasting.',
        'I play, and the girls dance, and they only ever move when nobody is looking. Like everyone on this hill.',
        'Keep your eyes on them, stranger. All of them. You can\'t, of course. Nobody can.',
      ],
      beaten: [
        'The ring is old. Older than the Regent. Older than the Old King. They were never girls. They were stones.',
        'I played at weddings. Only at weddings. Why does my chanter taste of dust?',
      ],
      coins: 140,
    },
    {
      id: fallenId('stonehold', 'not-one-step'),
      court: 'stonehold',
      name: 'Not One Step',
      foeName: 'Gethin the Shoulder',
      foeElement: 'pressure',
      difficulty: 5,
      hpMult: 1.2,
      gimmick: fallenId('stonehold', 'not-one-step'),
      at: { x: 220, y: 1290 },
      look: { body: 0xb08a6a, accent: 0x4a4a52, hat: 'none', traits: ['beard', 'bandage', 'brand'], size: 1.4, eye: EYE },
      challenge: [
        'Every quarter-day the households send a champion up on the Moot stone. Every quarter-day I send him off it.',
        'The Prince is the Unmoved. I am the Unmoved\'s shoulder. Nobody has ever moved me a single step.',
        'Up you come. The pit is soft. You will learn that.',
      ],
      beaten: [
        'Off the stone. I went off the stone. I used to lift the children up onto it to see the fair.',
        'Shoving on the Moot stone was a game. A summer game, for a cheese. I won a cheese once. Didn\'t I?',
      ],
      coins: 160,
    },
    {
      id: fallenId('stonehold', 'course'),
      court: 'stonehold',
      name: 'Course by Course',
      foeName: 'Ragna Drystane, Waller',
      foeElement: 'death',
      difficulty: 5,
      hpMult: 1.25,
      gimmick: fallenId('stonehold', 'course'),
      at: { x: 2250, y: 300 },
      look: { body: 0xa8a098, accent: 0x6e5a40, hat: 'headwrap', traits: ['apron', 'tool'], size: 1.15, eye: EYE },
      challenge: [
        'No mortar. Every stone through-bonded. A wall of mine stands a hundred years, and so do the people in it.',
        'The Hollins came up short, so I built them a door they will not need to open. Clean work. My best.',
        'Pick a side, love. One of them is getting smaller.',
      ],
      beaten: [
        'I built sheepfolds. Field walls. The long wall up the shoulder that keeps the snow off the lambing.',
        'I never walled a door in my life. You don\'t wall a door. Doors are for people to come home through.',
      ],
      coins: 160,
    },
  ],
};
