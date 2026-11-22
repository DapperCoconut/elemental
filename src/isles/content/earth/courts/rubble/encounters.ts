import type { EncounterDef, GimmickDef } from '../../../../IslesTypes';
import { AQUEDUCT } from './gimmicks/aqueduct';
import { COLLAPSE } from './gimmicks/collapse';
import { COLOSSUS } from './gimmicks/colossus';
import { PROCESSION } from './gimmicks/procession';
import { SINKHOLE } from './gimmicks/sinkhole';

/**
 * The Rubble Court's five champions — the people Prince Wreck keeps on to finish burying the old
 * capital, and to keep its scavengers in the holes they live in. Tier 4, the hardest court on
 * Bedrock Hold (difficulty 4,5,5,5,5). Up from the Stonehold road you meet Krell in the
 * undercroft of the Corn Exchange, Moth on the Sunken Street, Lev under the aqueduct, Elegy on the
 * Processional Way below the Sepulchre gate, and Pell in the colossus's yard.
 */

export const RUBBLE_GIMMICKS: GimmickDef[] = [COLLAPSE, SINKHOLE, AQUEDUCT, PROCESSION, COLOSSUS];

const COINS = 105;

export const RUBBLE_ENCOUNTERS: EncounterDef[] = [
  {
    id: 'rubble-collapse',
    court: 'rubble',
    name: 'Collapse',
    foeName: 'Demolisher Krell',
    foeElement: 'gunpowder',
    difficulty: 4,
    gimmick: 'rubble-collapse',
    at: { x: 760, y: 1240 },
    look: { body: 0xc8a888, accent: 0xe8c03a, hat: 'miner', traits: ['satchel', 'beard', 'tool'], size: 1.15, eye: 0xffb040 },
    challenge: [
      'Six pillars hold that roof up. Four of them are mine. I drilled them this morning. You can hear them ticking.',
      'His Highness wants the Corn Exchange flat by the Tithe. I want to see what it does when it goes.',
      'Stand where you like. I\'ll bring the ceiling to you.',
    ],
    beaten: [
      'You read the floor. Nobody reads the floor. They just look up, and by then it\'s on them.',
      'Go on. I\'ll shore it up. I always shore it up. That\'s the part nobody pays me for.',
    ],
    coins: COINS,
  },
  {
    id: 'rubble-sinkhole',
    court: 'rubble',
    name: 'Sinkhole',
    foeName: 'Delver Moth',
    foeElement: 'depths',
    difficulty: 5,
    gimmick: 'rubble-sinkhole',
    at: { x: 1760, y: 1440 },
    look: { body: 0xa8a49a, accent: 0x5f5a52, hat: 'miner', traits: ['tool', 'pack', 'glasses'], size: 0.9, eye: 0xf2e6b0 },
    challenge: [
      'Shh. Hear that? Three cellars down, a beam is thinking about it. I hear everything under this street.',
      'The Sunken Street was a market once. Now it\'s a lid. I lift it for the Prince where he wants things dropped.',
      'Keep your feet moving, stranger. The floor listens to you just like I do.',
    ],
    beaten: [
      'You never stood still. Not once. Do you know how rare that is? Everyone stands still in the end.',
      'I\'ll tap you a safe road out. That one, there. And that one. Not that one.',
    ],
    coins: COINS,
  },
  {
    id: 'rubble-aqueduct',
    court: 'rubble',
    name: 'Aqueduct',
    foeName: 'Watersmith Lev',
    foeElement: 'water',
    difficulty: 5,
    gimmick: 'rubble-aqueduct',
    at: { x: 400, y: 900 },
    look: { body: 0xb8c0b8, accent: 0x3a5a6a, hat: 'cap', traits: ['tool', 'apron', 'scarf'], size: 1.05, eye: 0x8ab8c4 },
    challenge: [
      'The aqueduct still runs. The Regent wanted it dry; the mountain disagreed. So now I decide where it falls.',
      'Every family on the West Cut fills a bucket under my fall. Where I move it, they move. And I know.',
      'Mind the arches. They\'re older than your grandmother and about as forgiving.',
    ],
    beaten: [
      'Washed down my own yard. In front of the bucket queue. They\'ll be singing that one on the West Cut.',
      'I\'ll leave the fall where it is. Over the queue. They can have it close for once.',
    ],
    coins: COINS,
  },
  {
    id: 'rubble-procession',
    court: 'rubble',
    name: 'Lost Procession',
    foeName: 'Ghostwarden Elegy',
    foeElement: 'death',
    difficulty: 5,
    gimmick: 'rubble-procession',
    at: { x: 1200, y: 600 },
    look: { body: 0xd8dcd4, accent: 0x2e3a3a, hat: 'veil', traits: ['lantern', 'book'], size: 1, eye: 0xbfe0d8 },
    challenge: [
      'They walk the Processional Way every dusk, the buried of the capital. Up to the tomb, and the door won\'t open.',
      'I ring them along. The Prince pays me to keep them walking — dead who walk don\'t ask to be dug up.',
      'Step into the column if you like. They\'re very gentle. Only don\'t touch the lantern.',
    ],
    beaten: [
      'You walked with them and came out again. Most don\'t think to come out.',
      'I\'ll ring them home early tonight. They\'ve earned a short road.',
    ],
    coins: COINS,
  },
  {
    id: 'rubble-colossus',
    court: 'rubble',
    name: 'Colossus',
    foeName: 'Sculptor Pell',
    foeElement: 'myth',
    difficulty: 5,
    hpMult: 1.05,
    gimmick: 'rubble-colossus',
    at: { x: 1500, y: 1000 },
    look: { body: 0xe0ccb0, accent: 0x5a9a86, hat: 'beanie', traits: ['tool', 'beard', 'apron'], size: 1.1, eye: 0xfff0b0 },
    challenge: [
      'I carved his curls. Sixty years ago, the left side of the beard. He was a king then, and so was the other one.',
      'The Regent pulled him over on his face. He isn\'t dead, you know. Stone takes a long time to die.',
      'I talk to him. He listens to me. Shall I tell him about you?',
    ],
    beaten: [
      'He looked at you. He looked at you and you made him look at me. Sixty years and he never looked at me.',
      'Go on. I\'ve curls to clean. He likes them clean.',
    ],
    coins: COINS,
  },
];
