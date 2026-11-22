import type { EncounterDef, GimmickDef } from '../../../../IslesTypes';
import { CAUSEWAY } from './gimmicks/causeway';
import { LANDSLIDE } from './gimmicks/landslide';
import { LEY_LINES } from './gimmicks/leyLines';
import { ROLLING_STONE } from './gimmicks/rollingStone';
import { TITHE_SCALES } from './gimmicks/titheScales';

/**
 * The Stonehold Court's five champions — the men and women who keep Prince Bould's Tithe moving.
 * Tier 1 of Bedrock Hold (difficulty 3,3,3,4,4). Up the rolling-stone road from Quarrymouth you
 * meet Cobb at his runnel, Hazel dowsing the menhir avenue, Fingal on the giant's causeway,
 * Ballast at the Tithe pit and Talus on the scree below the east face.
 */

export const STONEHOLD_GIMMICKS: GimmickDef[] = [ROLLING_STONE, LEY_LINES, CAUSEWAY, TITHE_SCALES, LANDSLIDE];

const COINS = 70;

export const STONEHOLD_ENCOUNTERS: EncounterDef[] = [
  {
    id: 'stonehold-rolling-stone',
    court: 'stonehold',
    name: 'Rolling Stone',
    foeName: 'Roller Cobb',
    foeElement: 'earth',
    difficulty: 3,
    gimmick: 'stonehold-rolling-stone',
    at: { x: 1340, y: 1330 },
    look: { body: 0xc8a080, accent: 0x8a6a3a, hat: 'cap', traits: ['beard', 'apron'], size: 1.25, eye: 0xd8c090 },
    challenge: [
      'Every household\'s Tithe comes down my runnel, cut round, rolling. I give each one a push. Forty years.',
      'What jumps the runnel is mine. Law of the road. I\'ve a yard full of other people\'s winters.',
      'This one\'s my favourite. She doesn\'t stop. Mind your shins.',
    ],
    beaten: [
      'You batted her. Nobody bats her. She went back up the yard like she was ashamed.',
      'Fine. Go on up. I\'ll give her a rest. She\'s earned one. So have I, maybe.',
    ],
    coins: COINS,
  },
  {
    id: 'stonehold-ley-lines',
    court: 'stonehold',
    name: 'Ley Lines',
    foeName: 'Dowser Hazel',
    foeElement: 'magic',
    difficulty: 3,
    gimmick: 'stonehold-ley-lines',
    at: { x: 1030, y: 470 },
    look: { body: 0xd8c0a8, accent: 0x2e8a78, hat: 'hood', traits: ['cane', 'satchel'], size: 0.95, eye: 0x8ff0d0 },
    challenge: [
      'The lines run stone to stone, the old way. I walk them with a hazel rod and I tell His Highness where they go.',
      'Where the lines run, the quarry is good. Where it\'s good, the Tithe is heavy. I find the heavy places.',
      'You\'re standing off the line, stranger. That\'s a beginner\'s mistake.',
    ],
    beaten: [
      'You moved the stones. You MOVED them. Nobody\'s moved those stones since the Old King set them.',
      'The rod\'s gone quiet. Either you\'ve broken the lines or they like you. I\'ll think about which.',
    ],
    coins: COINS,
  },
  {
    id: 'stonehold-causeway',
    court: 'stonehold',
    name: 'Causeway',
    foeName: 'Columnar Fingal',
    foeElement: 'magma',
    difficulty: 3,
    gimmick: 'stonehold-causeway',
    at: { x: 560, y: 590 },
    look: { body: 0x8a7a6a, accent: 0x3d4048, hat: 'miner', traits: ['beard', 'tool'], size: 1.15, eye: 0xff8a40 },
    challenge: [
      'The causeway breathes, if you stand on it long enough. Up and down, slow as a tide. I stand on it.',
      'Every column is a tithe-block nobody has to cut. Six sides, ready-made. His Highness loves it.',
      'Stay on top of the wave, stranger. Underneath is where they throw you.',
    ],
    beaten: [
      'You rode it. First go. I was thrown off forty times before I learned.',
      'Off you go. Mind the hot ones. They\'re not angry. They\'re just warm.',
    ],
    coins: COINS,
  },
  {
    id: 'stonehold-tithe-scales',
    court: 'stonehold',
    name: 'Tithe Scales',
    foeName: 'Weigher Ballast',
    foeElement: 'gravity',
    difficulty: 4,
    gimmick: 'stonehold-tithe-scales',
    at: { x: 860, y: 1330 },
    look: { body: 0xcab49a, accent: 0x5b4a6e, hat: 'tophat', traits: ['glasses', 'book'], size: 1.3, eye: 0xe8c870 },
    challenge: [
      'Every block that leaves the pit is weighed against my brass before it\'s weighed against the Regent\'s.',
      'If mine says short, the great Scales at Quarrymouth will say short. I have never once been wrong.',
      'Step on the pan. Everybody steps on the pan in the end.',
    ],
    beaten: [
      'The beam came down on my side. On MY side. Write it in the book. No — don\'t. I\'ll write it.',
      'Short weight, Ballast. You were short weight. Go on. I need to recalibrate.',
    ],
    coins: COINS,
  },
  {
    id: 'stonehold-landslide',
    court: 'stonehold',
    name: 'Landslide',
    foeName: 'Scree-Runner Talus',
    foeElement: 'hunt',
    difficulty: 4,
    hpMult: 1.05,
    gimmick: 'stonehold-landslide',
    at: { x: 2170, y: 620 },
    look: { body: 0xb08a68, accent: 0xc9965f, hat: 'headwrap', traits: ['pack', 'scarf'], size: 1, eye: 0xf0d080 },
    challenge: [
      'I run the scree. Down for the loose stone, up for the next load. Thirty times a day, faster than a cart.',
      'When a household runs, the Prince sends me up the face after them. Nobody outruns me on loose ground.',
      'The ledge is mine. The slope is everybody\'s. See how long you stand on either.',
    ],
    beaten: [
      'You held the ledge. It crumbled under you and you held it anyway. That\'s hunting, that is.',
      'I won\'t be running anyone down the face this season. Tell them that, up top.',
    ],
    coins: COINS,
  },
];
