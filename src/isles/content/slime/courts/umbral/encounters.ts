import type { EncounterDef, GimmickDef } from '../../../../IslesTypes';
import { DOPPELGANGER } from './gimmicks/doppelganger';
import { ECLIPSE } from './gimmicks/eclipse';
import { SHADE_STEP } from './gimmicks/shadeStep';
import { SILHOUETTE } from './gimmicks/silhouette';
import { SUNDOWN } from './gimmicks/sundown';

/**
 * The Umbral Court's five champions — the Prince's keepers of the dark. Tier 3 of Fangmire
 * (difficulty 4,5,5,5,5). Coming in off the Dimming Road from Stilthaven you meet Silhou on his
 * lamp round, Grim in the shade behind the looms, Gnomon at the great night-dial, Umbra up at the
 * starglass on the Cloak road, and Twin outside his mirror-works on the way to the Bole.
 */

export const UMBRAL_GIMMICKS: GimmickDef[] = [SILHOUETTE, SHADE_STEP, SUNDOWN, ECLIPSE, DOPPELGANGER];

const COINS = 115;

export const UMBRAL_ENCOUNTERS: EncounterDef[] = [
  {
    id: 'umbral-silhouette',
    court: 'umbral',
    name: 'Silhouette',
    foeName: 'Lampman Silhou',
    foeElement: 'fire',
    difficulty: 4,
    gimmick: 'umbral-silhouette',
    at: { x: 600, y: 800 },
    look: { body: 0xb8a490, accent: 0x3a2a1a, hat: 'tophat', traits: ['lantern', 'apron'], size: 1.1, eye: 0xffd27a },
    challenge: [
      'One true flame in all the court, and the Prince lets me carry it. For the fights. So they can see you lose.',
      'Every lamp on this road burns black. Mine burns yellow. Look at it too long and you\'ll want to cry.',
      'Mind where your shadow lies, stranger. In my light, a shadow is a handle.',
    ],
    beaten: [
      'You kept your shadow tucked under you like a cat\'s tail. Clever. Most people forget they have one.',
      'Go on. I\'ll swing the lamp the other way.',
    ],
    coins: COINS,
  },
  {
    id: 'umbral-shade-step',
    court: 'umbral',
    name: 'Shade Step',
    foeName: 'Stalker Grim',
    foeElement: 'ice',
    difficulty: 5,
    gimmick: 'umbral-shade-step',
    at: { x: 900, y: 1300 },
    look: { body: 0x9aa4b4, accent: 0x1a2030, hat: 'cowl', traits: ['scarf'], size: 1.15, eye: 0xbfe4ff },
    challenge: [
      'All the shade in Umbral is one shade. Go into it here, come out of it there. I collect the cloth that way.',
      'Weavers who hide a bolt from the Tithe find me standing in the shadow behind their door. Cold.',
      'You won\'t hear me. Watch for the frost.',
    ],
    beaten: [
      'You came up out of the dark behind me. Nobody comes up behind me. I\'ll have to think about that.',
      'The shade\'s yours today. Mind it\'s cold.',
    ],
    coins: COINS,
  },
  {
    id: 'umbral-sundown',
    court: 'umbral',
    name: 'Sundown',
    foeName: 'Sundialer Gnomon',
    foeElement: 'light',
    difficulty: 5,
    gimmick: 'umbral-sundown',
    at: { x: 1150, y: 1130 },
    look: { body: 0xd8d0c0, accent: 0x5a5468, hat: 'wizard', traits: ['book', 'glasses'], size: 0.95, eye: 0xfff2b0 },
    challenge: [
      'I keep the hour. The night-dial says night, and I sign the ledger to say it is night. It is always night.',
      'Today I have lit the sun-lamp. Once a year, for His Highness. Once more for you. Feel the cold in the hand?',
      'The hour-mark is mine. Stand on it and you\'ll stop my dial. Try.',
    ],
    beaten: [
      'You held my hour. Nobody has held my hour since the canopy closed.',
      'I shall write in the ledger that it was, briefly, morning.',
    ],
    coins: COINS,
  },
  {
    id: 'umbral-eclipse',
    court: 'umbral',
    name: 'Eclipse',
    foeName: 'Astronomer Umbra',
    foeElement: 'astra',
    difficulty: 5,
    gimmick: 'umbral-eclipse',
    at: { x: 1340, y: 380 },
    look: { body: 0xc8c0d8, accent: 0x2a2048, hat: 'wizard', traits: ['glasses', 'book', 'scarf'], size: 1, eye: 0xc8d8ff },
    challenge: [
      'One hole in the whole canopy, and it\'s mine. The Prince cut it so I could time the eclipses. For his birthday.',
      'I can bring one down on the yard to the second. When the moon goes over, your shadow stands up.',
      'I\'d step off its line, if I were you. Mine doesn\'t miss.',
    ],
    beaten: [
      'You read the sky off my own floor. Most people just look up and go blind.',
      'Here — the next one\'s in eleven years. Come back for it.',
    ],
    coins: COINS,
  },
  {
    id: 'umbral-doppelganger',
    court: 'umbral',
    name: 'Doppelgänger',
    foeName: 'Mirrorwright Twin',
    foeElement: 'echo',
    difficulty: 5,
    hpMult: 1.05,
    gimmick: 'umbral-doppelganger',
    at: { x: 1580, y: 760 },
    look: { body: 0xb0a8c0, accent: 0x1a1230, hat: 'none', traits: ['mask', 'tool'], size: 1.05, eye: 0xb0a0e8 },
    challenge: [
      'My mirrors don\'t show you. They show what stands behind you. Every house has one. Informers love them.',
      'In my yard the thing behind you gets loose. It walks where you walked. It bites who you bite.',
      'So does mine. Don\'t go where I\'ve been.',
    ],
    beaten: [
      'You walked your shadow round me like a dog on a lead. I\'ve never seen it done.',
      'Take a mirror on your way out. No — on second thoughts, don\'t.',
    ],
    coins: COINS,
  },
];
