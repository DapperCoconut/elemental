import type { FallenBundle } from '../../../../../IslesTypes';
import { fallenId } from '../../../../meteor/spec';
import { FALLEN_ALL_BITS_SET } from './allBitsSet';
import { FALLEN_EXCHANGE } from './exchange';
import { FALLEN_GRATICULE } from './graticule';
import { FALLEN_RUNG_BY_RUNG } from './rungByRung';
import { FALLEN_WATCHDOG } from './watchdog';

/**
 * The Circuit Court's Fallen Five — in the star's telling, the people who kept Prince Byte's
 * reckoning machine honest for him: the clerk who wrote the masks that pick who is switched off,
 * the scopewright who watched every household's line, the register-keeper at the Tabulator's console,
 * the arcwright whose lamps replaced the lamplighters, and the keeper of the watchdog that is set
 * on anyone whose counter stops. Tier 2: difficulty 4,4,5,5,5; coins double the court's 90.
 */

const EYE = 0xffa040;
const COINS = 180;

export const FALLEN: FallenBundle = {
  gimmicks: [FALLEN_ALL_BITS_SET, FALLEN_GRATICULE, FALLEN_EXCHANGE, FALLEN_RUNG_BY_RUNG, FALLEN_WATCHDOG],
  encounters: [
    {
      id: fallenId('circuit', 'all-bits-set'),
      court: 'circuit',
      name: 'All Bits Set',
      foeName: 'Mask-Clerk Perrine Prink',
      foeElement: 'magic',
      difficulty: 4,
      hpMult: 1.1,
      gimmick: fallenId('circuit', 'all-bits-set'),
      at: { x: 1500, y: 880 },
      look: { body: 0xd8c4b0, accent: 0x2a3a30, hat: 'visor', traits: ['glasses', 'book'], size: 0.95, eye: EYE },
      challenge: [
        'Four little switches. Eight, four, two, one. That is all it takes to choose a street, dear.',
        'I never chose a name. The Tabulator has no names. I chose a pattern, and the pattern chose them.',
        'What is your number? Never mind. You are standing on one.',
      ],
      beaten: [
        'I… set type. At the printer\'s, on the mill street. House numbers, for the doors. Didn\'t I?',
        'Eight, four, two, one. I used to teach the children that. To count. Only to count.',
      ],
      coins: COINS,
    },
    {
      id: fallenId('circuit', 'graticule'),
      court: 'circuit',
      name: 'The Green Graticule',
      foeName: 'Scopewright Halvard Lumm',
      foeElement: 'light',
      difficulty: 4,
      hpMult: 1.15,
      gimmick: fallenId('circuit', 'graticule'),
      at: { x: 800, y: 1000 },
      look: { body: 0xc8b8a0, accent: 0x1a3a2a, hat: 'goggles', traits: ['tool', 'glasses', 'pack'], size: 1.05, eye: EYE },
      challenge: [
        'Every household is a line on my screen. When a line dips, I point. That is the whole of the job.',
        'Yours has never been on my screen at all. A flat line. Let me put a probe on you.',
        'Hold still. It reads cleaner when you hold still.',
      ],
      beaten: [
        'The screen… I mended radios. Radio Candle came in clearest on my bench. I turned it up. I did.',
        'A flat line means nobody is drawing. I used to think that meant they were resting.',
      ],
      coins: COINS,
    },
    {
      id: fallenId('circuit', 'exchange'),
      court: 'circuit',
      name: 'Exchange and Store',
      foeName: 'Register-Keeper Liesel Tamworth',
      foeElement: 'subterfuge',
      difficulty: 5,
      hpMult: 1.15,
      gimmick: fallenId('circuit', 'exchange'),
      at: { x: 1450, y: 1420 },
      look: { body: 0xd0b498, accent: 0x2a2a3a, hat: 'wig', traits: ['glasses', 'satchel', 'scarf'], size: 1.0, eye: EYE },
      challenge: [
        'One key, and the Dunns\' sum is the Cobbs\' sum. Their short is someone else\'s short. It all adds up the same.',
        'The Tabulator doesn\'t mind whose number is in which register. Nor do I. I only press the key.',
        'Shall we trade places, stranger? You\'ll find mine a little crowded.',
      ],
      beaten: [
        'Registers… I kept the parish register. Births and banns. I wrote names in. I never moved one.',
        'Whose short did I give to whom? I can\'t — I don\'t think I ever did. Did I?',
      ],
      coins: COINS,
    },
    {
      id: fallenId('circuit', 'rung-by-rung'),
      court: 'circuit',
      name: 'Rung by Rung',
      foeName: 'Arcwright Thaddeus Corriban',
      foeElement: 'plasma',
      difficulty: 5,
      hpMult: 1.2,
      gimmick: fallenId('circuit', 'rung-by-rung'),
      at: { x: 2250, y: 1250 },
      look: { body: 0xb89878, accent: 0x5a3a8a, hat: 'coif', traits: ['tool', 'beard', 'apron'], size: 1.25, eye: EYE },
      challenge: [
        'The lamplighters\' flames were thieves. My arcs are honest. Metered. Every lamp on the bus is mine.',
        'I test each one on the ladder. It climbs, it stretches, it snaps. Nothing it carries comes down gently.',
        'Step up, stranger. First rung\'s the easy one.',
      ],
      beaten: [
        'The ladder… it was a toy. A fairground thing. I showed it to children at the solstice fair.',
        'I never lit a street. Wren did. I used to hold her ladder for her. The wooden one.',
      ],
      coins: COINS,
    },
    {
      id: fallenId('circuit', 'watchdog'),
      court: 'circuit',
      name: 'Kick the Watchdog',
      foeName: 'Watchkeeper Brisco Haddle',
      foeElement: 'hunt',
      difficulty: 5,
      hpMult: 1.25,
      gimmick: fallenId('circuit', 'watchdog'),
      at: { x: 700, y: 640 },
      look: { body: 0xc0a080, accent: 0x4a3a2a, hat: 'tophat', traits: ['cane', 'scarf', 'pipe'], size: 1.15, eye: EYE },
      challenge: [
        'A machine that goes quiet has hung, and a hung machine is reset. Clerks too. That\'s the rule of the house.',
        'She\'s brass all through, my girl. Doesn\'t eat, doesn\'t sleep. Only counts, and comes when the count stops.',
        'Keep busy, stranger. She likes busy people. She leaves them alone.',
      ],
      beaten: [
        'Brass… no. She was a mutt. Brown, one ear down. She slept under the Tabulator because it was warm.',
        'Nobody set her on anyone. She just went round the clerks for scraps. I only ever held her lead.',
      ],
      coins: COINS,
    },
  ],
};
