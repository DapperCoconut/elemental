import type { EncounterDef, GimmickDef } from '../../../../IslesTypes';
import { SAND_SHIPS } from './gimmicks/sandShips';
import { SANDWORM } from './gimmicks/sandworm';
import { MIRAGE } from './gimmicks/mirage';
import { QUICKSAND } from './gimmicks/quicksand';
import { BURIED_TREASURE } from './gimmicks/buriedTreasure';

/**
 * The Dunesea Court's five champions — the people who keep Prince Sirocco's dunes moving. Tier 2
 * of Bedrock Hold (difficulty 3,4,4,4,4). On the Strand you meet Barca by the moored ships, Shai
 * out on the open dunes past the shipyard, Faraj at the edge of the oasis, Ammon in the sinking
 * quarter of Old Hamra, and Petra at the open dig under the bell-tower.
 */

export const DUNESEA_GIMMICKS: GimmickDef[] = [SAND_SHIPS, SANDWORM, MIRAGE, QUICKSAND, BURIED_TREASURE];

const COINS = 80;

export const DUNESEA_ENCOUNTERS: EncounterDef[] = [
  {
    id: 'dunesea-sand-ships',
    court: 'dunesea',
    name: 'Sand-Ships',
    foeName: 'Skipper Barca',
    foeElement: 'air',
    difficulty: 3,
    gimmick: 'dunesea-sand-ships',
    at: { x: 820, y: 905 },
    look: { body: 0xa87a54, accent: 0x34346e, hat: 'tricorn', traits: ['scarf', 'eyepatch', 'pipe'], size: 1.1, eye: 0xf2d496 },
    challenge: [
      'Skipper of the Tithe fleet. Twelve hulls. I carry the Hold\'s stone to the Scales and I never lose a block.',
      'A ship that carries anything else is a ship I sink. A stranger who stands in my lane is a stranger I ram.',
      'Wind\'s fair. Let\'s see if you can sail.',
    ],
    beaten: [
      'You boarded my own ship and broadsided me with it. That\'s — that\'s piracy. I\'m impressed. Don\'t tell anyone.',
      'Go on. The wind\'s yours for today.',
    ],
    coins: COINS,
  },
  {
    id: 'dunesea-sandworm',
    court: 'dunesea',
    name: 'Sandworm',
    foeName: 'Wormcaller Shai',
    foeElement: 'sound',
    difficulty: 4,
    gimmick: 'dunesea-sandworm',
    at: { x: 1620, y: 960 },
    look: { body: 0xc8966a, accent: 0xb8382c, hat: 'hood', traits: ['mask', 'tool', 'satchel'], size: 1, eye: 0xffb070 },
    challenge: [
      'Shh. Feel that? Under your boots. She\'s been circling since you came over the dune.',
      'I call her with the drum when a house won\'t pay. She doesn\'t eat the house. She eats the noise. Usually.',
      'Walk softly, stranger. Or walk loud and fast, and see where that gets you.',
    ],
    beaten: [
      'She went quiet. She only goes quiet for people who know when to stand still. Most don\'t.',
      'I\'ll beat the drum softer this season. Maybe not at all.',
    ],
    coins: COINS,
  },
  {
    id: 'dunesea-mirage',
    court: 'dunesea',
    name: 'Mirage',
    foeName: 'Trader Faraj',
    foeElement: 'illusion',
    difficulty: 4,
    gimmick: 'dunesea-mirage',
    at: { x: 1640, y: 1250 },
    look: { body: 0xb88a64, accent: 0xe8a628, hat: 'headwrap', traits: ['satchel', 'scarf', 'glasses'], size: 1.05, eye: 0x9ae8f8 },
    challenge: [
      'Water, friend? Sweet water, cool, just over there — two coin a mouthful. Very reasonable.',
      'The ration\'s at noon and the line\'s long. My water has no line. My water has no anything, some days.',
      'Come, come. Let\'s trade in the sun until one of us is thirsty enough.',
    ],
    beaten: [
      'You learned to see the shimmer. That\'s my whole trade, the shimmer. Bad for business, people like you.',
      'Here — a real drink. On the house. It\'s from the oasis. I do know where it is.',
    ],
    coins: COINS,
  },
  {
    id: 'dunesea-quicksand',
    court: 'dunesea',
    name: 'Quicksand',
    foeName: 'Sinker Ammon',
    foeElement: 'death',
    difficulty: 4,
    gimmick: 'dunesea-quicksand',
    at: { x: 540, y: 790 },
    look: { body: 0x9a8a7a, accent: 0x3a2a22, hat: 'veil', traits: ['cane', 'lantern', 'bandage'], size: 1.15, eye: 0xd8e0e0 },
    challenge: [
      'This quarter of Old Hamra sinks. It has sunk for a thousand years. I only tell it where.',
      'When a pit is forfeit, the wind covers it. When a man argues, the sand takes him to the chest, and he listens.',
      'Stand still, stranger. Everybody does, in the end.',
    ],
    beaten: [
      'You walked out. Slowly. You didn\'t struggle. Nobody ever has the patience not to struggle.',
      'The sand will keep. It always does.',
    ],
    coins: COINS,
  },
  {
    id: 'dunesea-buried-treasure',
    court: 'dunesea',
    name: 'Buried Treasure',
    foeName: 'Digger Petra',
    foeElement: 'fortune',
    difficulty: 4,
    hpMult: 1.05,
    gimmick: 'dunesea-buried-treasure',
    at: { x: 800, y: 775 },
    look: { body: 0xd0a07a, accent: 0xd0a040, hat: 'miner', traits: ['tool', 'pack', 'glasses'], size: 0.95, eye: 0xf4d68a },
    challenge: [
      'Treasure-trove of the Prince, that\'s me. Anything in Old Hamra that glitters, I dig it before you do.',
      'Stone goes to the Tithe. Gold goes to the Palace. The scorpions you can keep.',
      'Shall we dig? Luck\'s with the digger. And I\'m the digger.',
    ],
    beaten: [
      'You read the mounds. You actually read them. Who taught you to read sand?',
      'Keep what you dug. I\'ll dig more. There\'s always more under Hamra.',
    ],
    coins: COINS,
  },
];
