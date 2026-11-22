import type { EncounterDef, GimmickDef } from '../../../../IslesTypes';
import { POTTERS_WHEEL } from './gimmicks/wheel';
import { KILN_FIRING } from './gimmicks/kiln';
import { TERRACOTTA_ARMY } from './gimmicks/army';
import { SLIP_CASTING } from './gimmicks/slipCast';
import { GLAZE_RUN } from './gimmicks/glazeRun';

/**
 * The Potter's Court's five champions — the master craftsmen who keep the Tithe moving through
 * Prince Glaze's court, from the wheel to the muster. Tier 2 of Bedrock Hold (difficulty
 * 3,4,4,4,4). In from the Kiln Road you meet Celadon at the glaze house, Wenna on Wheel Square,
 * Saggar in Kiln Row, Grogg on the casting floor and Qin in the aisle of the Tithe Ranks.
 */

export const POTTER_GIMMICKS: GimmickDef[] = [POTTERS_WHEEL, KILN_FIRING, TERRACOTTA_ARMY, SLIP_CASTING, GLAZE_RUN];

const COINS = 80;

export const POTTER_ENCOUNTERS: EncounterDef[] = [
  {
    id: 'potter-wheel',
    court: 'potter',
    name: 'Potter\'s Wheel',
    foeName: 'Thrower Wenna',
    foeElement: 'clay',
    difficulty: 3,
    gimmick: 'potter-wheel',
    at: { x: 1060, y: 920 },
    look: { body: 0xc89a78, accent: 0xb98a66, hat: 'bandana', traits: ['apron', 'beard'], size: 1.3, eye: 0xdcb48e },
    challenge: [
      'Forty soldiers a season come off my wheel. The Great Wheel. You\'re stood on the edge of it.',
      'Centre the clay, open it, pull the wall up. Everything that goes on a wheel goes round. You too.',
      'Step on, then. Mind the rim — it throws.',
    ],
    beaten: [
      'Off-centre. I was off-centre the whole time and I never felt it. That\'s the wheel for you.',
      'Go on. I\'ve clay to wedge.',
    ],
    coins: COINS,
  },
  {
    id: 'potter-kiln',
    court: 'potter',
    name: 'Kiln Firing',
    foeName: 'Kilnwright Saggar',
    foeElement: 'fire',
    difficulty: 4,
    gimmick: 'potter-kiln',
    at: { x: 480, y: 570 },
    look: { body: 0xa87a58, accent: 0xff8a2a, hat: 'coif', traits: ['apron', 'tool', 'beard'], size: 1.2, eye: 0xffd27a },
    challenge: [
      'Four kilns on this row and I fire every one. I know their tempers. They don\'t know yours.',
      'Dry, you scorch. Wet, you bake. Fired twice, you dunt. That\'s ware. That\'s people too.',
      'Number three dunted a whole setting of soldiers last season. They walled up six households. I fired it.',
    ],
    beaten: [
      'You read the doors. Nobody reads the doors but me.',
      'Number three\'s still bricked up. Somebody ought to open it. Not me. Go on.',
    ],
    coins: COINS,
  },
  {
    id: 'potter-army',
    court: 'potter',
    name: 'Terracotta Army',
    foeName: 'Sculptor Qin',
    foeElement: 'conquest',
    difficulty: 4,
    hpMult: 1.05,
    gimmick: 'potter-army',
    at: { x: 1890, y: 1290 },
    look: { body: 0xd4b08e, accent: 0xc8693c, hat: 'helmet', traits: ['tool', 'scarf'], size: 1.1, eye: 0xe08d5c },
    challenge: [
      'Every face in these ranks I cut myself. Four thousand faces. Each the face of the household that paid it.',
      'They stand for the Regent. They march for whoever bleeds. Shall we bleed?',
      'Stand in the aisle, stranger. They like the aisle.',
    ],
    beaten: [
      'You broke three of my soldiers. I\'ll cut them again. I remember every face.',
      'I should like, once, to cut a face for nobody. Go on.',
    ],
    coins: COINS,
  },
  {
    id: 'potter-slip-cast',
    court: 'potter',
    name: 'Slip Casting',
    foeName: 'Moulder Grogg',
    foeElement: 'slime',
    difficulty: 4,
    gimmick: 'potter-slip-cast',
    at: { x: 960, y: 1240 },
    look: { body: 0xb98a66, accent: 0xece6da, hat: 'beanie', traits: ['apron', 'pack'], size: 1.25, eye: 0xdcb48e },
    challenge: [
      'Moulds are honest. You pour slip in, you wait, and what comes out is the shape of the mould. Every time.',
      'Wheels are for people who want their pots to have opinions.',
      'Stand still a moment. You\'d make a lovely figure.',
    ],
    beaten: [
      'You came out the wrong shape. You keep coming out the wrong shape. I respect it.',
      'Go on. Mind the jug mould, it\'s setting.',
    ],
    coins: COINS,
  },
  {
    id: 'potter-glaze-run',
    court: 'potter',
    name: 'Glaze Run',
    foeName: 'Glazier Celadon',
    foeElement: 'chalk',
    difficulty: 4,
    gimmick: 'potter-glaze-run',
    at: { x: 1880, y: 730 },
    look: { body: 0xe0c4a8, accent: 0x8cc4a8, hat: 'goggles', traits: ['apron', 'glasses', 'satchel'], size: 1, eye: 0x8cc4a8 },
    challenge: [
      'I named myself after the Prince\'s glaze. It got me the job. It\'s the only colour in the Glost House.',
      'Celadon, cobalt, oxblood. Anyone can drip them. It\'s what they make together that matters.',
      'Mind your feet. Two colours, close together, and you\'re fired.',
    ],
    beaten: [
      'You walked the mixes like you\'d been born in the glaze house. Wren will want to meet you.',
      'Go on. I\'ve a tenmoku to clean off the floor.',
    ],
    coins: COINS,
  },
];
