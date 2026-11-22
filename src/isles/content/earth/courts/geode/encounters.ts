import type { EncounterDef, GimmickDef } from '../../../../IslesTypes';
import { CRACKED_GEODES } from './gimmicks/crackedGeodes';
import { DRUSE } from './gimmicks/druse';
import { PIEZO } from './gimmicks/piezo';
import { REFRACTION } from './gimmicks/refraction';
import { RESONANCE } from './gimmicks/resonance';

/**
 * The Geode Court's five champions — the craftsmen who keep Prince Facet's stone. Tier 3 of
 * Bedrock Hold (difficulty 4,4,4,5,5). In from the Quarrymouth cleft you meet Prism under the
 * light of the square, Druse in the crystal gardens to the north-west, Vug in the breaking-yard
 * past Lapidaries' Row, Quartz in the Chime Garden by the pool, and Tourmaline on the piezo
 * floor among the spires.
 */

export const GEODE_GIMMICKS: GimmickDef[] = [REFRACTION, DRUSE, RESONANCE, CRACKED_GEODES, PIEZO];

const COINS = 90;

export const GEODE_ENCOUNTERS: EncounterDef[] = [
  {
    id: 'geode-refraction',
    court: 'geode',
    name: 'Refraction',
    foeName: 'Lapidary Prism',
    foeElement: 'light',
    difficulty: 4,
    gimmick: 'geode-refraction',
    at: { x: 1340, y: 900 },
    look: { body: 0xe8dcd0, accent: 0xff5a5a, hat: 'goggles', traits: ['glasses', 'tool', 'apron'], size: 1, eye: 0xfff4d8 },
    challenge: [
      'Noon. The one hour the crack lets the sun in, and you walk into my light. Do you know what light costs here?',
      'Everything that glitters is graded. Light is what makes it glitter. So the Prince grades light. I cut it.',
      'Red, green, violet. Stand in any of them for long and you will learn the price.',
    ],
    beaten: [
      'You turned my own prisms on me. Nobody touches my prisms. I polish them with my sleeve.',
      'Go on. The sun has moved. It always moves just when I have it right.',
    ],
    coins: COINS,
  },
  {
    id: 'geode-druse',
    court: 'geode',
    name: 'Druse',
    foeName: 'Grower Druse',
    foeElement: 'growth',
    difficulty: 4,
    gimmick: 'geode-druse',
    at: { x: 560, y: 520 },
    look: { body: 0xc8b49a, accent: 0x8a52c4, hat: 'straw', traits: ['tool', 'beard', 'apron'], size: 1.2, eye: 0xc49af0 },
    challenge: [
      'Seed crystal, slurry, patience. Forty years I have grown amethyst in these beds. It grows faster with a knock.',
      'Every bruise is a garden. That is my secret. I am going to plant a great many gardens on you.',
      'Mind your feet. Crystal does not ask permission to grow.',
    ],
    beaten: [
      'You let them grow round you and then you stepped aside. That is what a gardener does. Who taught you?',
      'Leave me to sweep up. Shards in the beds give the seed ideas.',
    ],
    coins: COINS,
  },
  {
    id: 'geode-resonance',
    court: 'geode',
    name: 'Resonance',
    foeName: 'Tuner Quartz',
    foeElement: 'echo',
    difficulty: 4,
    gimmick: 'geode-resonance',
    at: { x: 1830, y: 1300 },
    look: { body: 0xd8d0e0, accent: 0xc8a050, hat: 'tophat', traits: ['scarf', 'glasses'], size: 0.95, eye: 0xe8f0ff },
    challenge: [
      'Every chime in this garden rings one true note. I tune them. The Regent buried the songs that went with them.',
      'Notes without songs. That is what is left. Notes, and what two notes do to the air between them.',
      'Listen for the beat, stranger. You will only hear it once.',
    ],
    beaten: [
      'Two notes, and you were never between them. You have a good ear. That is dangerous here.',
      'Hum something on your way out. Anything. Quietly.',
    ],
    coins: COINS,
  },
  {
    id: 'geode-cracked-geodes',
    court: 'geode',
    name: 'Cracked Geodes',
    foeName: 'Breaker Vug',
    foeElement: 'ruin',
    difficulty: 5,
    gimmick: 'geode-cracked-geodes',
    at: { x: 420, y: 1390 },
    look: { body: 0xb89878, accent: 0x6e5a48, hat: 'miner', traits: ['tool', 'beard', 'satchel'], size: 1.35, eye: 0xf0c048 },
    challenge: [
      'Every stone the quarry sends up, I crack. Nine in ten are dull. One in ten is a season\'s Tithe for somebody.',
      'The roof over this yard has not been shored since the old King. Every few cracks, it lets go a little.',
      'You want a gem? Come and take one. I don\'t look up any more. I just listen for it.',
    ],
    beaten: [
      'You heard the roof before I did. Thirty years in this yard and a stranger hears it first.',
      'Take the citrine. Somebody should eat well off this yard for once.',
    ],
    coins: COINS,
  },
  {
    id: 'geode-piezo',
    court: 'geode',
    name: 'Piezo',
    foeName: 'Sparker Tourmaline',
    foeElement: 'electricity',
    difficulty: 5,
    hpMult: 1.05,
    gimmick: 'geode-piezo',
    at: { x: 2030, y: 900 },
    look: { body: 0xe0c8b8, accent: 0xe0508a, hat: 'coif', traits: ['glasses', 'tool'], size: 1, eye: 0xbff4ff },
    challenge: [
      'Squeeze a tourmaline and it sparks. I found that out at six. My hair has not lain flat since.',
      'The Prince lights his hall off these plates. We stamp on them in shifts. Twelve hours. For his chandeliers.',
      'Keep your feet on the crystal, stranger, or the crystal will find your feet.',
    ],
    beaten: [
      'You hopped. Nobody hops. They stand there and hope. Hope is a terrible conductor.',
      'Go on. My shift starts in an hour. Somebody has to keep the lights on in there.',
    ],
    coins: COINS,
  },
];
