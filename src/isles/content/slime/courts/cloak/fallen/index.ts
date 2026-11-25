import type { FallenBundle } from '../../../../../IslesTypes';
import { fallenId } from '../../../../meteor/spec';
import { FALLEN_BOUGHT_WATCH } from './boughtWatch';
import { FALLEN_CLOAK_AND_DAGGER } from './cloakAndDagger';
import { FALLEN_INTERCEPTED } from './intercepted';
import { FALLEN_PLANTED } from './planted';
import { FALLEN_SPELLED_OUT } from './spelledOut';

/**
 * The Cloak Court's Fallen Five — in the star's telling, the people of the informers' town who
 * made the Ear's work easy: the go-between who read everything he carried, the captain of a watch that could
 * be bought, the gate-clerk who wrote the stranger down as NOBODY, the framer who never informed
 * but always made sure something was found, and the cutter who sewed a knife-pocket into every
 * cloak. Tier 3: difficulty 4,5,5,4,5; coins double the court's 110. They stand where the court's
 * own five never fight: the cistern road, the east end of Hush Street, under the Name Booth's
 * lane, the north-west lane by the Pay Office, and the yard between the Gallery and the Hall.
 */

const EYE = 0xffa040;
const COINS = 220;

export const FALLEN: FallenBundle = {
  gimmicks: [FALLEN_INTERCEPTED, FALLEN_BOUGHT_WATCH, FALLEN_SPELLED_OUT, FALLEN_PLANTED, FALLEN_CLOAK_AND_DAGGER],
  encounters: [
    {
      id: fallenId('cloak', 'intercepted'),
      court: 'cloak',
      name: 'Intercepted',
      foeName: 'Go-Between Ansel Querne',
      foeElement: 'string',
      difficulty: 4,
      hpMult: 1.1,
      gimmick: fallenId('cloak', 'intercepted'),
      at: { x: 1440, y: 1180 },
      look: { body: 0xc8b8a8, accent: 0x3a3a2a, hat: 'tricorn', traits: ['satchel', 'book', 'scarf'], size: 1.0, eye: EYE },
      challenge: [
        'You bring me what you have, I bring you what they have. Nobody leaves a meeting with Ansel empty-handed.',
        'The Ear pays me for the hiders\' letters. The hiders pay me for the Ear\'s. Both pay on time. Honest work.',
        'Everything on my thread passes through my hands first. Mind you don\'t step in the way of the post.',
      ],
      beaten: [
        'I carried a letter once from a mother to her son in the Grave Court. Just that. No copy. Why do I remember…',
        'Both sides. I was on both sides. Was I ever on anybody\'s?',
      ],
      coins: COINS,
    },
    {
      id: fallenId('cloak', 'bought-watch'),
      court: 'cloak',
      name: 'Bought and Sold',
      foeName: 'Watch-Captain Garnet Spangle',
      foeElement: 'justice',
      difficulty: 5,
      hpMult: 1.15,
      gimmick: fallenId('cloak', 'bought-watch'),
      at: { x: 2010, y: 760 },
      look: { body: 0xb8a898, accent: 0x24263a, hat: 'shako', traits: ['lantern', 'cane', 'beard'], size: 1.2, eye: EYE },
      challenge: [
        'The night watch keeps the peace. Whose peace is a matter for the purse, and my lads keep a very good purse.',
        'Nobody in this court is arrested who has paid. Nobody in this court has not paid. Funny how that works out.',
        'You\'ve no coin, stranger. That makes you the only criminal on Hush Street. Lads?',
      ],
      beaten: [
        'Put that coin away. I… we walked the lamps. That was the job. Lit every lamp, so folk could get home.',
        'Somebody bought my lads back from me. Good. I don\'t think I ever owned them.',
      ],
      coins: COINS,
    },
    {
      id: fallenId('cloak', 'spelled-out'),
      court: 'cloak',
      name: 'Spelled Out',
      foeName: 'Gate-Clerk Wilmot Inkle',
      foeElement: 'fate',
      difficulty: 5,
      gimmick: fallenId('cloak', 'spelled-out'),
      at: { x: 310, y: 575 },
      look: { body: 0xd0c4b0, accent: 0x2a2a3e, hat: 'visor', traits: ['glasses', 'book', 'tool'], size: 0.9, eye: EYE },
      challenge: [
        'Name? No? Then I\'ll write you as I find you. N-O-B-O-D-Y. There. Now you exist, and only just.',
        'Every name in the court went through my booth. Every name in the Hall of Letters, I spelled first.',
        'The sorts are out on the floor. Mind where you tread. The register is never wrong.',
      ],
      beaten: [
        'I wrote them all down so somebody would know who came home. That was it. So the families could look.',
        'Wilmot Inkle. W, I, L… I can\'t remember the last time somebody spelled mine.',
      ],
      coins: COINS,
    },
    {
      id: fallenId('cloak', 'planted'),
      court: 'cloak',
      name: 'Caught Holding',
      foeName: 'Framer Osmund Pike',
      foeElement: 'illusion',
      difficulty: 4,
      hpMult: 1.1,
      gimmick: fallenId('cloak', 'planted'),
      at: { x: 950, y: 560 },
      look: { body: 0xc0b0a0, accent: 0x4c2a2c, hat: 'domino', traits: ['satchel', 'pipe'], size: 1.0, eye: EYE },
      challenge: [
        'I have never informed on anyone. Not once. Ask the watch. I simply help them find things.',
        'A forged letter here, a signet there. Evidence wants to be found. I only show it the way.',
        'Is that yours? It\'s by your foot. Oh dear. Oh, here they come.',
      ],
      beaten: [
        'My hands. I used to do card tricks in the Two Cups. For the children. Just tricks. Never for the watch.',
        'There\'s a ring in my pocket I don\'t remember stealing. I don\'t think I ever stole anything at all.',
      ],
      coins: COINS,
    },
    {
      id: fallenId('cloak', 'cloak-and-dagger'),
      court: 'cloak',
      name: 'Cloak and Dagger',
      foeName: 'Cutter Amabel Shrike',
      foeElement: 'shadow',
      difficulty: 5,
      hpMult: 1.2,
      gimmick: fallenId('cloak', 'cloak-and-dagger'),
      at: { x: 1540, y: 545 },
      look: { body: 0xd8c8c0, accent: 0x3e3150, hat: 'hood', traits: ['apron', 'tool', 'mask'], size: 1.05, eye: EYE },
      challenge: [
        'Every cloak on every line in this court I cut. Every one has a pocket on the left, just so deep.',
        'Strike me, dear. Go on. My velvet catches everything, and keeps it, and gives it back with an edge.',
        'Mind my hem. It\'s heavy. It turns slowly. That is the only kindness I sew into it.',
      ],
      beaten: [
        'The pockets were for letters. For letters home. I sewed them so the rain would not get in. Wasn\'t that it?',
        'Cut in two, and look — the lining was wine-red all along. I chose that colour for weddings.',
      ],
      coins: COINS,
    },
  ],
};
