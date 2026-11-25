import type { FallenBundle } from '../../../../../IslesTypes';
import { fallenId } from '../../../../meteor/spec';
import { FALLEN_INKED_OUT } from './inkedOut';
import { FALLEN_SIDEREAL_HOUR } from './siderealHour';
import { FALLEN_THIN_GLASS } from './thinGlass';
import { FALLEN_EYES_DOWN } from './eyesDown';
import { FALLEN_LAST_STAIR } from './lastStair';

/**
 * The Starfall Court's Fallen Five — in the star's telling, the summit's people who kept the
 * Prince's night for him: the Registry's night-clerk who did the inking, the keeper of the
 * sidereal dial who told the collectors which house stood under which hour, the crater-picker who
 * sold the other pickers, the gaze-warden who reported unlicensed stargazers, and the sergeant of
 * the Last Stair. Tier 4: difficulty 4,4,5,5,5; coins double the court's 100. They stand where the
 * court's own five never do: by the Registry's west end, on the north road under the Lung, out
 * past the craters, on the east road by the plaza, and at the foot of the Last Stair.
 */

const EYE = 0xffa040;

export const FALLEN: FallenBundle = {
  gimmicks: [FALLEN_INKED_OUT, FALLEN_SIDEREAL_HOUR, FALLEN_THIN_GLASS, FALLEN_EYES_DOWN, FALLEN_LAST_STAIR],
  encounters: [
    {
      id: fallenId('starfall', 'inked-out'),
      court: 'starfall',
      name: 'Inked Out',
      foeName: 'Night-Clerk Sable Vantress',
      foeElement: 'ink',
      difficulty: 4,
      gimmick: fallenId('starfall', 'inked-out'),
      at: { x: 620, y: 720 },
      look: { body: 0x2a2838, accent: 0x10101c, hand: 0x6a6a80, hat: 'visor', traits: ['book', 'glasses', 'satchel'], size: 0.95, eye: EYE },
      challenge: [
        'The Registrar keeps the books. I keep the pen. Somebody has to, and he never could bear to watch.',
        'Every star on this page is a house. When a house falls behind, I put it out. Neatly. In good black ink.',
        'Stand on a star if you like. I will get to yours. I always get to everyone\'s, in the end.',
      ],
      beaten: [
        'Ink... I copied out birth-stars. For new mothers. In gold, with a little flourish on the tail.',
        'I never put one out. Did I? Then why are my fingers black to the second knuckle?',
      ],
      coins: 200,
    },
    {
      id: fallenId('starfall', 'sidereal-hour'),
      court: 'starfall',
      name: 'The Sidereal Hour',
      foeName: 'Meridian-Keeper Tobias Wane',
      foeElement: 'gravity',
      difficulty: 5,
      gimmick: fallenId('starfall', 'sidereal-hour'),
      at: { x: 1200, y: 590 },
      look: { body: 0x3a3f58, accent: 0xc89a4a, hand: 0xd8deea, hat: 'tophat', traits: ['cane', 'beard', 'glasses'], size: 1.15, eye: EYE },
      challenge: [
        'The sky turns, friend, and every house up here stands under an hour of it. I tell the Prince which.',
        'When I call your hour, the light comes down on it. Do not stand where your hour is going to be.',
        'Only the pole star keeps still. Everything else comes round. You will come round too.',
      ],
      beaten: [
        'I wound the dial. For the almanac. So the fishermen knew when the Starpool would be brightest.',
        'Whose hours did I call? I never called anyone\'s hour. I only ever told people the time.',
      ],
      coins: 200,
    },
    {
      id: fallenId('starfall', 'thin-glass'),
      court: 'starfall',
      name: 'Thin Glass',
      foeName: 'Picker Morrow Flint',
      foeElement: 'magma',
      difficulty: 4,
      gimmick: fallenId('starfall', 'thin-glass'),
      at: { x: 480, y: 1300 },
      look: { body: 0x4a3a40, accent: 0x9a2a1a, hand: 0xffb070, hat: 'miner', traits: ['tool', 'pack', 'scarf'], size: 1.1, eye: EYE },
      challenge: [
        'Crater glass is the Prince\'s glass. Every shard. I pick it, and I know who pocketed a bit for a charm.',
        'Mind your feet. Fresh bowls are one skin over the melt. Every knock you take, it takes as well.',
        'I\'ve walked this glass nine years and never once gone through. I know where it\'s thin. Do you?',
      ],
      beaten: [
        'Charms... I ground the shards smooth for children\'s necklaces. A star on a string, for luck.',
        'I never told on the pickers. Old Wenna kept a shard for her grandson. I helped her hide it. I did.',
      ],
      coins: 200,
    },
    {
      id: fallenId('starfall', 'eyes-down'),
      court: 'starfall',
      name: 'Eyes Down',
      foeName: 'Gaze-Warden Vesper Hollin',
      foeElement: 'psychic',
      difficulty: 5,
      gimmick: fallenId('starfall', 'eyes-down'),
      at: { x: 1400, y: 1040 },
      look: { body: 0x5a4a78, accent: 0xe8c25a, hand: 0xd8deea, hat: 'cowl', traits: ['lantern', 'mask'], size: 1.0, eye: EYE },
      challenge: [
        'The Evening Star is the Prince\'s own. Nobody looks at it without a licence. You have no licence.',
        'When it rises, eyes down. Look its way when it flares and I will know, and so will the Registry.',
        'Everyone looks, in the end. It is so very bright. That is rather the point of it.',
      ],
      beaten: [
        'I... showed people where to look. On the terrace, on clear nights. "There, that one. That\'s yours."',
        'Reported? No. I never reported a soul. I lent my glass to anyone who asked. Why do I feel so ashamed?',
      ],
      coins: 200,
    },
    {
      id: fallenId('starfall', 'last-stair'),
      court: 'starfall',
      name: 'Down the Last Stair',
      foeName: 'Stair-Sergeant Tamsin Crake',
      foeElement: 'metal',
      difficulty: 5,
      hpMult: 1.15,
      gimmick: fallenId('starfall', 'last-stair'),
      at: { x: 1300, y: 420 },
      look: { body: 0x6a6a7a, accent: 0x2a2d40, hand: 0xc89a4a, hat: 'shako', traits: ['cane', 'brand'], size: 1.25, eye: EYE },
      challenge: [
        'Crates go up the Last Stair. Debtors go down it. That is the whole of the law on my flight.',
        'I hold the top step and the chute holds the rest. You are welcome to climb. Mind the crates.',
        'Nobody has ever got past me to the gate. Nobody ever will. The stair is mine.',
      ],
      beaten: [
        'I carried old Mother Pell up these steps. Every Sunday. To see the sky from the top. Didn\'t I?',
        'I never threw anyone down. I caught them. I was the one who caught them when they slipped.',
      ],
      coins: 200,
    },
  ],
};
