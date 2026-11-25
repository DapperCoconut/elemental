import type { FallenBundle } from '../../../../../IslesTypes';
import { fallenId } from '../../../../meteor/spec';
import { FALLEN_DAMP } from './damp';
import { FALLEN_DRAUGHT } from './draught';
import { FALLEN_FLOWSTONE } from './flowstone';
import { FALLEN_LOW_ROOF } from './lowRoof';
import { FALLEN_TRAVERSE } from './traverse';

/**
 * The Cavern Court's Fallen Five — in the star's telling, the cave-folk who kept the Echo Caves
 * themselves working for the crown, rather than its echoes: the drip-mason who grew stone over
 * muted households' doors, the damp-reader who condemned their rooms for "bad air", the
 * shoring-man who propped their roofs down to a crawl, the chasm-keeper who fed the crack what
 * the Tuners wanted gone, and the rigger whose lines put a Tuner over any grotto in a breath.
 * Tier 2: difficulty 4,4,5,5,5; coins double the court's 115. They stand where the court's own
 * five never fight: below the Echo Wall's west end, the low south grottos, under the north-east
 * houses, at the lower bridge's east foot, and on the west bank by the Gallery road.
 */

const EYE = 0xffa040;
const COINS = 230;

export const FALLEN: FallenBundle = {
  gimmicks: [FALLEN_FLOWSTONE, FALLEN_DAMP, FALLEN_LOW_ROOF, FALLEN_DRAUGHT, FALLEN_TRAVERSE],
  encounters: [
    {
      id: fallenId('cavern', 'flowstone'),
      court: 'cavern',
      name: 'Set in Flowstone',
      foeName: 'Hildred Gour, Drip-Mason',
      foeElement: 'clay',
      difficulty: 4,
      hpMult: 1.1,
      gimmick: fallenId('cavern', 'flowstone'),
      at: { x: 1060, y: 760 },
      look: { body: 0xd8c4a8, accent: 0x8a7a60, hat: 'cap', traits: ['apron', 'tool', 'glasses'], size: 1.0, eye: EYE },
      challenge: [
        'The roof gives a finger of stone a year, if you lead its drip right. I lead it over doorways.',
        'A muted house has no use for a door. In a season it is a wall, and the wall is very beautiful.',
        'Stand still, dear. The drip is kind at first. It is only the fourth band that is a door.',
      ],
      beaten: [
        'Gours. I built gours, little rimstone pools for the cress. Children floated walnut boats in them.',
        'I never grew a door shut. Did I? There is a family behind one, I think. Go and listen at it.',
      ],
      coins: COINS,
    },
    {
      id: fallenId('cavern', 'damp'),
      court: 'cavern',
      name: 'Choke-Damp',
      foeName: 'Hobart Sump, Damp-Reader',
      foeElement: 'pressure',
      difficulty: 4,
      hpMult: 1.1,
      gimmick: fallenId('cavern', 'damp'),
      at: { x: 720, y: 1210 },
      look: { body: 0xb8c4c0, accent: 0x5a6274, hat: 'miner', traits: ['lantern', 'beard', 'satchel'], size: 1.1, eye: EYE },
      challenge: [
        'My lamp reads the air. Low flame, bad air. Bad air, the room is shut, the family moves up. Simple.',
        'Up by the Tuners\' post the air is very good. They can hear you breathe in it. That is the point.',
        'Black-damp runs downhill like water. Keep your head high, stranger, and your feet out of the dips.',
      ],
      beaten: [
        'The lamp never went low in those rooms. I turned the wick down myself, by the door. I remember.',
        'I used to carry children up out of the low grottos on wash-days, when the sea-door was shut.',
      ],
      coins: COINS,
    },
    {
      id: fallenId('cavern', 'low-roof'),
      court: 'cavern',
      name: 'Mind Your Head',
      foeName: 'Ferdy Crump, Shoring-Man',
      foeElement: 'gravity',
      difficulty: 5,
      hpMult: 1.15,
      gimmick: fallenId('cavern', 'low-roof'),
      at: { x: 2200, y: 620 },
      look: { body: 0xc4a07c, accent: 0x7a5a38, hat: 'helmet', traits: ['tool', 'pack', 'beard'], size: 1.3, eye: EYE },
      challenge: [
        'Unsafe, that roof. All the roofs where people sing at home are unsafe. I prop them down for them.',
        'A family that crawls out of its own door crawls past the Tuners slow enough to be counted.',
        'Under my slabs you can\'t be shot. Can\'t jump either. Leap under one and you\'ll feel it for a week.',
      ],
      beaten: [
        'I propped roofs UP. That was the trade. Timbers under the cracked ones, so they didn\'t come down.',
        'Pass me that wedge. I\'ve a grotto by the mouth to knock out and set right. Mind your head.',
      ],
      coins: COINS,
    },
    {
      id: fallenId('cavern', 'draught'),
      court: 'cavern',
      name: 'The Updraught',
      foeName: 'Osgar Fleet, Chasm-Keeper',
      foeElement: 'air',
      difficulty: 5,
      hpMult: 1.15,
      gimmick: fallenId('cavern', 'draught'),
      at: { x: 1000, y: 1180 },
      look: { body: 0xc8c0b0, accent: 0x2a9ab8, hat: 'hood', traits: ['scarf', 'rod', 'pack'], size: 1.05, eye: EYE },
      challenge: [
        'The crack breathes up cold from the sea. Drop a letter in and it flies. Where it lands, nobody asks.',
        'Hymn-sheets sung wrong, a fiddle, a muted man\'s boots. I feed it what the Tuners send me. It\'s hungry.',
        'Throw at me across it if you like. It throws everything. Just not where you meant.',
      ],
      beaten: [
        'I used to fish the updraught for the gulls\' feathers, for the cress-wives\' pillows. Only feathers.',
        'There\'s a fiddle on a ledge, a little way down. I\'ll go and get it. I know which ledge.',
      ],
      coins: COINS,
    },
    {
      id: fallenId('cavern', 'traverse'),
      court: 'cavern',
      name: 'The Rigger\'s Traverse',
      foeName: 'Tamar Sheave, Line-Rigger',
      foeElement: 'string',
      difficulty: 5,
      hpMult: 1.2,
      gimmick: fallenId('cavern', 'traverse'),
      at: { x: 260, y: 700 },
      look: { body: 0xe0ccb4, accent: 0xa88a58, hat: 'bandana', traits: ['pack', 'tool', 'scarf'], size: 0.95, eye: EYE },
      challenge: [
        'Every grotto in these caves is one line from my posts. A Tuner can be at your door before your verse ends.',
        'My baskets carry what the Prince wants carried. Stand under a line and you\'re what they knock aside.',
        'Ride one if you dare. Clip on at a post, and mind the people underneath. I never do.',
      ],
      beaten: [
        'Bread. The baskets carried bread up to the high grottos, and the old folk rode down to the market.',
        'I strung the first line for my gran, so she could see the pool again. Clip on. I\'ll show you.',
      ],
      coins: COINS,
    },
  ],
};
