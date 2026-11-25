import type { FallenBundle } from '../../../../../IslesTypes';
import { fallenId } from '../../../../meteor/spec';
import { DRUMHEAD } from './drumhead';
import { PASS_THE_BLAME } from './petard';
import { FLASH_IN_THE_PAN } from './flashPan';
import { PRESS_GANG } from './pressGang';
import { PLUNGING_FIRE } from './plungingFire';

/** Every Fallen has the star's ember-gold eyes. */
const EMBER_EYE = 0xffa040;

/**
 * THE POWDER COURT'S FALLEN FIVE — the fort's own people as the King's telling has them: the drum-major
 * who beat the floggings, the informer, the magazine sweeper who swept powder under doors, the press-
 * master who filled the gun crews, and the old tutor who taught the Prince his arithmetic. They stand
 * only inside the Fall: on the parade ground's north end, by the range sandbags, south of the moat, out
 * on the firing range and at the foot of the drill field.
 */
export const FALLEN: FallenBundle = {
  encounters: [
    {
      id: fallenId('powder', 'drumhead'),
      court: 'powder',
      name: 'Drumhead Court',
      foeName: 'Drum-Major Rennet Skaife',
      foeElement: 'conquest',
      difficulty: 4,
      hpMult: 1.1,
      gimmick: fallenId('powder', 'drumhead'),
      at: { x: 1500, y: 400 },
      look: { body: 0xd8b090, accent: 0xa3262a, hat: 'tricorn', traits: ['scarf', 'beard'], size: 1.15, eye: EMBER_EYE },
      challenge: [
        'Fall in. The drum says when you move and when you stand. It always has.',
        'Every man in this fort marched to my sticks. Every one. Nobody ever broke step twice.',
        'Hear the roll? That is an order. Obey it or take the lash — those are the only two steps I teach.',
      ],
      beaten: [
        'The sticks… I beat the roll for dances. Weddings. I never once beat one for the lash. Did I?',
        'Go on, keep your own time. I think I used to like it when people did.',
      ],
      coins: 80,
    },
    {
      id: fallenId('powder', 'petard'),
      court: 'powder',
      name: 'Pass the Blame',
      foeName: 'Informer Jory Pettle',
      foeElement: 'magnet',
      difficulty: 4,
      hpMult: 1.05,
      gimmick: fallenId('powder', 'petard'),
      at: { x: 1750, y: 920 },
      look: { body: 0xc8a888, accent: 0x3a3a40, hat: 'cap', traits: ['satchel', 'glasses'], size: 0.9, eye: EMBER_EYE },
      challenge: [
        'Something always goes missing from the magazine, friend. And someone always has to have taken it.',
        'I just say the name. The Prince does the rest. Today, I think the name is yours.',
        'Here — hold this for me. Mind the fuse. It goes wherever the blame goes.',
      ],
      beaten: [
        'I kept the tally for the quartermaster. Kegs in, kegs out. I never gave a name. Not one. I think.',
        'Strange. My pockets feel lighter. As if I had only ever carried a pencil.',
      ],
      coins: 80,
    },
    {
      id: fallenId('powder', 'flash-pan'),
      court: 'powder',
      name: 'Flash in the Pan',
      foeName: 'Sweeper Agnes Mull',
      foeElement: 'air',
      difficulty: 4,
      hpMult: 1.15,
      gimmick: fallenId('powder', 'flash-pan'),
      at: { x: 420, y: 1000 },
      look: { body: 0x9a7a62, accent: 0x4a4650, hat: 'bandana', traits: ['apron', 'tool'], size: 0.95, eye: EMBER_EYE },
      challenge: [
        'I sweep the magazine floor, dearie. Every grain. And I know just whose doorstep it belongs on.',
        'A little dust under the door, a word to the guard — and a family is gone by morning. Tidy.',
        'Mind your feet. One spark in here and the whole floor remembers what it is.',
      ],
      beaten: [
        'Dust… I swept it into the moat. Always the moat. Nobody wants powder on their step, do they?',
        'Leave me the broom. I think I only ever kept a clean floor.',
      ],
      coins: 80,
    },
    {
      id: fallenId('powder', 'press-gang'),
      court: 'powder',
      name: 'The Press Gang',
      foeName: 'Press-Master Halloran',
      foeElement: 'metal',
      difficulty: 5,
      hpMult: 1.2,
      gimmick: fallenId('powder', 'press-gang'),
      at: { x: 2000, y: 1320 },
      look: { body: 0xa07a5a, accent: 0x3b3d42, hat: 'tricorn', traits: ['beard', 'eyepatch', 'tool'], size: 1.3, eye: EMBER_EYE },
      challenge: [
        'The Prince needs gun crews and the town keeps hiding its sons. So I walk at night, with the chain.',
        'Caught you fair. You are on my chain now, and the chain goes where I go.',
        'Stand clear of the cartridge bags when the match runs. Or don\'t. The guns need fewer hands than you think.',
      ],
      beaten: [
        'This chain… it was for the ferry. Hauling her in at the slip. I never put it on a man. Did I?',
        'Take the key. My hands want an honest rope again.',
        'Ferry runs at dawn. I think I am the one who runs it.',
      ],
      coins: 85,
    },
    {
      id: fallenId('powder', 'plunging-fire'),
      court: 'powder',
      name: 'Plunging Fire',
      foeName: 'Master-Gunner Ambrose Kettering',
      foeElement: 'gravity',
      difficulty: 5,
      hpMult: 1.25,
      gimmick: fallenId('powder', 'plunging-fire'),
      at: { x: 1050, y: 1450 },
      look: { body: 0xe0c0a0, accent: 0x2f4f8f, hat: 'tophat', traits: ['glasses', 'book', 'cane'], size: 1.0, eye: EMBER_EYE },
      challenge: [
        'I taught the Prince his figures. Charge, elevation, range. He was such an apt little boy.',
        'Everything that goes up comes down where the arithmetic says. Today the arithmetic says you.',
        'Do keep up. I shan\'t chalk this lesson twice.',
      ],
      beaten: [
        'I taught him… stars. Navigation. How to find the way home by them. Not range tables. Never those.',
        'If you meet him, tell him his old tutor is sorry for the lessons he never gave.',
      ],
      coins: 85,
    },
  ],
  gimmicks: [DRUMHEAD, PASS_THE_BLAME, FLASH_IN_THE_PAN, PRESS_GANG, PLUNGING_FIRE],
};
