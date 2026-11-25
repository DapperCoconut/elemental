import type { FallenBundle } from '../../../../../IslesTypes';
import { fallenId } from '../../../../meteor/spec';
import { FALLEN_BOUT } from './bout';
import { FALLEN_GLANDS } from './glands';
import { FALLEN_KINGSNAKE } from './kingsnake';
import { FALLEN_SWALLOW } from './swallow';
import { FALLEN_TWOHEAD } from './twohead';

/**
 * The Fang Court's Fallen Five — in the star's telling, the venom-milkers' town's own hands on the
 * crown's side: the feeder who gave the pit-python the passed-over, the milker who kept the shed's
 * oldest secret for the Prince, the bout-master who ran snake-fights at his table, the curator of
 * his two-headed wonder, and the pit-warden whose king-snake ate the serpents that would not milk.
 * Tier 1: difficulty 4,4,4,5,5; coins double the court's 90. They stand on ground the court's own
 * five never use: the Grave road under the Weeping Fang, west of the bakery, the Cloak road's east
 * end, the lane by the Milking Shed, and the causeway's foot by the ration board.
 */

const EYE = 0xffa040;
const COINS = 180;

export const FALLEN: FallenBundle = {
  gimmicks: [FALLEN_SWALLOW, FALLEN_GLANDS, FALLEN_BOUT, FALLEN_TWOHEAD, FALLEN_KINGSNAKE],
  encounters: [
    {
      id: fallenId('fang', 'swallow'),
      court: 'fang',
      name: 'The Long Swallow',
      foeName: 'Feeder Osgood Lurch',
      foeElement: 'gravity',
      difficulty: 4,
      hpMult: 1.1,
      gimmick: fallenId('fang', 'swallow'),
      at: { x: 1080, y: 470 },
      look: { body: 0xb8a088, accent: 0x5a3a24, hat: 'souwester', traits: ['apron', 'satchel', 'beard'], size: 1.3, eye: EYE },
      challenge: [
        'She eats once a week, does Old Gullet. A rat, a goat. Whatever the Dosekeeper\'s book has crossed out.',
        'I only carry the bucket. What goes in the bucket is not my business. It never was.',
        'Hold still, now. There\'s a rat by your boot, and she\'s seen it.',
      ],
      beaten: [
        'Rats. I fed her rats. Bags of them from the granary, every Thursday, and she grew fat and lazy.',
        'There was never anybody in the bucket. Was there? Tell me there was never anybody in the bucket.',
      ],
      coins: COINS,
    },
    {
      id: fallenId('fang', 'glands'),
      court: 'fang',
      name: 'Crossed Glands',
      foeName: 'Milker Brisewyn Tallis',
      foeElement: 'water',
      difficulty: 4,
      gimmick: fallenId('fang', 'glands'),
      at: { x: 520, y: 1000 },
      look: { body: 0xd8bca0, accent: 0x4d7a3a, hat: 'plague', traits: ['apron', 'mask', 'tool'], size: 0.95, eye: EYE },
      challenge: [
        'Green numbs. Red thins. Every milker knows that much. Only I know what they do to each other.',
        'The Prince asked me to forget it, and I did, and he gave me a house on the dry side of the fen.',
        'Let us see whether you can work it out before you run out of blood.',
      ],
      beaten: [
        'Venom against venom. I taught it to the children at the shed door, every spring. Openly. Didn\'t I?',
        'I never had a house on the dry side. I had a stool and a glass. I liked the stool.',
      ],
      coins: COINS,
    },
    {
      id: fallenId('fang', 'bout'),
      court: 'fang',
      name: 'The Pit-Bout',
      foeName: 'Bout-Master Crispin Moyle',
      foeElement: 'fortune',
      difficulty: 4,
      gimmick: fallenId('fang', 'bout'),
      at: { x: 2200, y: 980 },
      look: { body: 0xc8a07a, accent: 0xbf9a48, hat: 'tophat', traits: ['cane', 'pipe', 'satchel'], size: 1.05, eye: EYE },
      challenge: [
        'Three to one on the mongoose, friend. Always the mongoose. The cobra only ever hides behind somebody.',
        'His Highness likes a bout with his supper. I give him one every night. Somebody always gets bowled.',
        'Stand nearer. She likes you. That is the worst thing that could happen to you.',
      ],
      beaten: [
        'Bouts… I never ran bouts. I caught mongooses in the cane and sold them to farms to keep the rats down.',
        'No bets. Not ever. My mother would have skinned me. What a strange, loud dream.',
      ],
      coins: COINS,
    },
    {
      id: fallenId('fang', 'twohead'),
      court: 'fang',
      name: 'The Two-Headed Turn',
      foeName: 'Curator Clothilde Ketch',
      foeElement: 'magnet',
      difficulty: 5,
      hpMult: 1.15,
      gimmick: fallenId('fang', 'twohead'),
      at: { x: 1420, y: 1300 },
      look: { body: 0xd0c0b0, accent: 0x6a3a6e, hat: 'veil', traits: ['glasses', 'book', 'scarf'], size: 0.9, eye: EYE },
      challenge: [
        'Both is the pride of His Highness\'s cabinet. One head for each guest, so nobody feels left out.',
        'When it turns its venom over, each head spits what the other drank. The courtiers do so love a symmetry.',
        'Mind the holes at my feet, dear. Every one of them is coming back to you.',
      ],
      beaten: [
        'Both… was a grass snake with a forked tail. I drew it for the children. I kept no cabinet.',
        'I catalogued the fen\'s flowers for the bakery\'s jars. That was all. Why do I remember velvet?',
      ],
      coins: COINS,
    },
    {
      id: fallenId('fang', 'kingsnake'),
      court: 'fang',
      name: 'The Snake-Eater',
      foeName: 'Pit-Warden Reverdy Gane',
      foeElement: 'crystal',
      difficulty: 5,
      hpMult: 1.2,
      gimmick: fallenId('fang', 'kingsnake'),
      at: { x: 870, y: 1570 },
      look: { body: 0xa88a6a, accent: 0xb8382c, hat: 'cowl', traits: ['tool', 'bandage', 'pack'], size: 1.2, eye: EYE },
      challenge: [
        'A snake that will not milk is no use to anybody. So I give it to the Eater. He is never full.',
        'He goes a flag at a time, never backwards. A very orderly animal. I respect that in a creature.',
        'Mind the flag he\'s looking at. And the one after. And the one after that.',
      ],
      beaten: [
        'He kept the pits free of rats, the Eater. That was all he ever ate. Rats, and the odd egg.',
        'The adders that would not milk went back to the fen. I carried them myself, in a sack, at dusk.',
      ],
      coins: COINS,
    },
  ],
};
