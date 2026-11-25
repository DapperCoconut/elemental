import type { FallenBundle } from '../../../../../IslesTypes';
import { fallenId } from '../../../../meteor/spec';
import { FALLEN_CAUGHT_OUT } from './caughtOut';
import { FALLEN_CURDLE } from './curdle';
import { FALLEN_PAST_CURE } from './pastCure';
import { FALLEN_PLANES } from './planes';
import { FALLEN_POP_WEASEL } from './popWeasel';

/**
 * The Bounce Court's Fallen Five — in the star's telling, the rubber town's craftsfolk who made
 * their trades into the crown's tools: the box-cranker of the Toy Works, its test-flier, the
 * tapping-ganger of the plantation, the cure-mistress of the vulcanizing works and the games-mistress
 * of the Ball Court. Tier 2: difficulty 4,4,4,5,5; coins double the court's 90.
 * They stand on ground the court's own five never use: the North Road by the Toy Works, the
 * Works' east forecourt, the plantation's top row, the works yard, and the lane by the Ball Court.
 */

const EYE = 0xffa040;

export const FALLEN: FallenBundle = {
  gimmicks: [FALLEN_POP_WEASEL, FALLEN_PLANES, FALLEN_CURDLE, FALLEN_PAST_CURE, FALLEN_CAUGHT_OUT],
  encounters: [
    {
      id: fallenId('bounce', 'pop-weasel'),
      court: 'bounce',
      name: 'Pop Goes the Weasel',
      foeName: 'Mirabel Tantony, Box-Cranker',
      foeElement: 'sound',
      difficulty: 4,
      gimmick: fallenId('bounce', 'pop-weasel'),
      at: { x: 1430, y: 410 },
      look: { body: 0xe8c8b0, accent: 0xc83a5a, hat: 'beanie', traits: ['apron', 'tool'], size: 0.92, eye: EYE },
      challenge: [
        'Every box goes round its tune once before it\'s packed. I crank it. I know where every jack comes out.',
        'The Linemen set them facing the Draw queue. A man who flinches at the pop is marked short. Simple.',
        'Half a pound of tuppenny rice... listen for it. You won\'t hear the last line in time.',
      ],
      beaten: [
        'I cranked them for children. For the shop window at the Bell-Fair. Didn\'t I? Little ones laughed.',
        'Nobody ever stood in front of a box for the Draw. Why do I know the tune ended on a man falling?',
      ],
      coins: 180,
    },
    {
      id: fallenId('bounce', 'planes'),
      court: 'bounce',
      name: 'Twelve Hundred Turns',
      foeName: 'Avelina Strutt, Test-Flier',
      foeElement: 'paper',
      difficulty: 4,
      hpMult: 1.05,
      gimmick: fallenId('bounce', 'planes'),
      at: { x: 2120, y: 620 },
      look: { body: 0xd8b89a, accent: 0x5a6a3a, hat: 'aviator', traits: ['scarf', 'satchel'], size: 1.0, eye: EYE },
      challenge: [
        'Twelve hundred turns on the drill, then let her go. A trimmed plane circles one spot until the rubber\'s spent.',
        'His Highness gave me a yard full of people to circle. I can put a plane round one head for six seconds.',
        'Then the motor quits. Then she comes down. Look up, friend. Mind the nose.',
      ],
      beaten: [
        'Balsa and tissue. I flew them over the square for the children to chase. Over the square, not over... anyone.',
        'Why would I trim a plane to hunt a man? I trimmed them to come home. They always came home to me.',
      ],
      coins: 180,
    },
    {
      id: fallenId('bounce', 'curdle'),
      court: 'bounce',
      name: 'Curdle',
      foeName: 'Tapping-Ganger Ysmay Spurge',
      foeElement: 'slime',
      difficulty: 4,
      hpMult: 1.05,
      gimmick: fallenId('bounce', 'curdle'),
      at: { x: 740, y: 960 },
      look: { body: 0xb08a6a, accent: 0x4a6e3c, hat: 'straw', traits: ['apron', 'tool', 'lantern'], size: 1.05, eye: EYE },
      challenge: [
        'Before dawn, knife and can, row on row. A tree bleeds where I tell it. Milk runs where I point it.',
        'The earthed tap my rows now. A short cup, a splash of acid round the boots. They learn to stand still.',
        'You\'re standing in my milk, love. Hear the can? Hold still. It only takes a moment.',
      ],
      beaten: [
        'I tapped trees. Thin cuts, so they\'d heal. A good tapper never takes more than the tree can spare.',
        'Acid is for the pans. For the pans. I never poured it on a living soul. I couldn\'t have. Could I?',
      ],
      coins: 180,
    },
    {
      id: fallenId('bounce', 'past-cure'),
      court: 'bounce',
      name: 'Past the Cure',
      foeName: 'Cure-Mistress Gudrun Retort',
      foeElement: 'crystal',
      difficulty: 5,
      hpMult: 1.1,
      gimmick: fallenId('bounce', 'past-cure'),
      at: { x: 620, y: 530 },
      look: { body: 0xc89a7a, accent: 0xe6d23a, hat: 'bandana', traits: ['apron', 'glasses', 'tool'], size: 1.25, eye: EYE },
      challenge: [
        'I press my thumb in and I know. Raw, cured, or over. I have never once been wrong about a batch.',
        'The Prince sends me the earthed for curing. A little steam takes the give out of a person. Then they crack.',
        'You\'re very raw, dear. Step into the steam. Let me see what you are when you\'re done.',
      ],
      beaten: [
        'Tyres. Hoses. Glove-rubber for the linemen. I cured rubber. Only ever rubber, by the gauge.',
        'My thumb remembers... a sleeve? No. A sheet of crepe. It was crepe. It must have been crepe.',
      ],
      coins: 200,
    },
    {
      id: fallenId('bounce', 'caught-out'),
      court: 'bounce',
      name: 'Caught Out',
      foeName: 'Games-Mistress Hepzibah Quellow',
      foeElement: 'hunt',
      difficulty: 5,
      hpMult: 1.15,
      gimmick: fallenId('bounce', 'caught-out'),
      at: { x: 1520, y: 1270 },
      look: { body: 0xd8c0a8, accent: 0x2a4a8a, hat: 'cap', traits: ['scarf', 'satchel', 'glasses'], size: 1.1, eye: EYE },
      challenge: [
        'Half-holiday! Teams! Oh, but the balls are the Prince\'s now, so the teams are mine. They never tire.',
        'House rules, as ever. Hit is out. Caught is out. And my little ones never, ever drop a catch.',
        'Look lively. Eyes on the ball, dear — whichever ball. There\'s always another one coming.',
      ],
      beaten: [
        'Children. It was children on the court, shrieking, all elbows. Real ones, with scabbed knees.',
        'I blew the whistle and sent them home for tea. I never fielded a tin team. Who winds them?',
      ],
      coins: 200,
    },
  ],
};
