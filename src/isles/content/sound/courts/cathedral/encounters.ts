import type { EncounterDef, GimmickDef } from '../../../../IslesTypes';
import { ROSE_WINDOW } from './gimmicks/roseWindow';
import { CANDLE_VIGIL } from './gimmicks/candleVigil';
import { BELL_CHOIR } from './gimmicks/bellChoir';
import { PROCESSION } from './gimmicks/procession';
import { CONFESSIONAL } from './gimmicks/confessional';

/**
 * The Cathedral Court's five champions — Prince Vesper's household, who keep the summit's
 * devotions. Tier 4 of Choirholm (difficulty 5 throughout). Up the Pilgrim Stair you meet
 * Penitent on the steps among the kneelers, Taper in the Votive Forest, Tracery at her kiln on
 * the edge of the close, Carol by the Angelus bell, and Shrive on the Penitents' Walk.
 */

export const CATHEDRAL_GIMMICKS: GimmickDef[] = [ROSE_WINDOW, CANDLE_VIGIL, BELL_CHOIR, PROCESSION, CONFESSIONAL];

const COINS = 140;

export const CATHEDRAL_ENCOUNTERS: EncounterDef[] = [
  {
    id: 'cathedral-rose-window',
    court: 'cathedral',
    name: 'Rose Window',
    foeName: 'Glazier Tracery',
    foeElement: 'light',
    difficulty: 5,
    gimmick: 'cathedral-rose-window',
    at: { x: 960, y: 1130 },
    look: { body: 0xdcc8b0, accent: 0x2f5ed8, hat: 'goggles', traits: ['apron', 'tool'], size: 1.05, eye: 0xf2b632 },
    challenge: [
      'I leaded every pane of the great rose. Eleven years on a scaffold. I know where every line of lead runs.',
      'Down in the nave the light lies where I put it. Red to strike, blue to mend, gold to guard. Lead to burn.',
      'I\'ll turn it when it suits me. I always know when. You won\'t.',
    ],
    beaten: [
      'You stepped off the glass every time I tapped it. Eleven years, and nobody ever watched my knife before.',
      'Go on, then. Mind the leading. It holds the whole window up, and it\'s only ever as strong as its joins.',
    ],
    coins: COINS,
  },
  {
    id: 'cathedral-candle-vigil',
    court: 'cathedral',
    name: 'Candle Vigil',
    foeName: 'Votary Taper',
    foeElement: 'wax',
    difficulty: 5,
    gimmick: 'cathedral-candle-vigil',
    at: { x: 470, y: 1280 },
    look: { body: 0xe8dcc4, accent: 0xa82830, hat: 'candle', traits: ['lantern', 'apron'], size: 0.95, eye: 0xffc44a },
    challenge: [
      'Every flame in the forest is paid for. Every flame I keep. A paid flame is a prayer the Maestro can count.',
      'Unpaid flames are noise. Light, without leave. I snuff them. It is the gentlest thing I do.',
      'Kneel if you like. I\'ll see how long your candles last.',
    ],
    beaten: [
      'Dark. All of mine dark, and you still kneeling in the pilgrims\' stubs. They burned for you. For nothing.',
      'For nothing. I don\'t understand it. Leave me — I have a great deal of relighting to do.',
    ],
    coins: COINS,
  },
  {
    id: 'cathedral-bell-choir',
    court: 'cathedral',
    name: 'Bell Choir',
    foeName: 'Ringer Carol',
    foeElement: 'metal',
    difficulty: 5,
    gimmick: 'cathedral-bell-choir',
    at: { x: 1780, y: 1560 },
    look: { body: 0xe4d0bc, accent: 0xb07a3a, hat: 'cap', traits: ['glasses', 'scarf'], size: 1, eye: 0xe0b070 },
    challenge: [
      'Six bells, six ringers, one tune — mine. We show it first. Then we ring it. Learn it, or wear it.',
      'Old Simeon rang the Angelus wrong once. His own peal. I took his rope. My choir never rings wrong.',
      'Gloves on. Bells up. And — one.',
    ],
    beaten: [
      'You rang a bell out of turn. On PURPOSE. I have never in my life… I couldn\'t find my place again.',
      'I\'m going to give Simeon back his rope. I don\'t know why. My hands are shaking.',
    ],
    coins: COINS,
  },
  {
    id: 'cathedral-procession',
    court: 'cathedral',
    name: 'Procession',
    foeName: 'Pilgrim Penitent',
    foeElement: 'life',
    difficulty: 5,
    gimmick: 'cathedral-procession',
    at: { x: 1330, y: 1420 },
    look: { body: 0xc8b49c, accent: 0x6a645c, hat: 'hood', traits: ['cane', 'pack', 'beard'], size: 1.2, eye: 0xd8c890 },
    challenge: [
      'I walk beside the relic. Every hour, round the nave. Thirty years. The Maestro\'s first Part is in that box.',
      'Whoever walks beside it is kept. Whoever walks in front of it is walked over. That is the order of things.',
      'Fall in, stranger. Mind the elbows.',
    ],
    beaten: [
      'You walked beside it and I walked in front of it. Thirty years, and I\'ve never been walked over before.',
      'It\'s only a reed in a box, you know. A little brass reed. I\'ve always known. I walk beside it anyway.',
    ],
    coins: COINS,
  },
  {
    id: 'cathedral-confessional',
    court: 'cathedral',
    name: 'Confessional',
    foeName: 'Confessor Shrive',
    foeElement: 'shadow',
    difficulty: 5,
    hpMult: 1.05,
    gimmick: 'cathedral-confessional',
    at: { x: 560, y: 610 },
    look: { body: 0x9a8c84, accent: 0x24222a, hat: 'cowl', traits: ['book'], size: 1.1, eye: 0xc8b4ff },
    challenge: [
      'Everyone on the summit confesses their noise to me. A hum in the bath. A song to a baby. A laugh at Matins.',
      'I write it all down, and the Tuners read what I write. That\'s what a confession is for. Didn\'t you know?',
      'Step into the booth, child. Tell me everything. I\'ll hear it — and so will they.',
    ],
    beaten: [
      'You burst my door. Everything I\'ve heard in there… the ledger\'s in the left-hand booth. Burn it. Please.',
      'Please. I\'ve been waiting thirty years for somebody to make me.',
    ],
    coins: COINS,
  },
];
