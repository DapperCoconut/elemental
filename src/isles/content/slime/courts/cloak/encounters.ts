import type { EncounterDef, GimmickDef } from '../../../../IslesTypes';
import { INFORMER } from './gimmicks/informer';
import { MASQUERADE } from './gimmicks/masquerade';
import { DEAD_DROP } from './gimmicks/deadDrop';
import { POISONED_CUP } from './gimmicks/poisonedCup';
import { WHISPER_GALLERY } from './gimmicks/whisperGallery';

/**
 * The Cloak Court's five champions — Prince Whisper's listeners. Tier 3 of Fangmire (difficulty
 * 4,5,5,5,5). Up Hush Street from the Fang road you meet Tattle on his round of Tattle Square,
 * Cipher under the Pay Office, Visage among her stalls in the Mask Market, Goblet at the door of
 * the Two Cups, and Murmur keeping the hush in the Whispering Gallery.
 */

export const CLOAK_GIMMICKS: GimmickDef[] = [INFORMER, MASQUERADE, DEAD_DROP, POISONED_CUP, WHISPER_GALLERY];

const COINS = 110;

export const CLOAK_ENCOUNTERS: EncounterDef[] = [
  {
    id: 'cloak-informer',
    court: 'cloak',
    name: 'Informer',
    foeName: 'Snitch Tattle',
    foeElement: 'psychic',
    difficulty: 4,
    gimmick: 'cloak-informer',
    at: { x: 1040, y: 905 },
    look: { body: 0xb8a898, accent: 0x4a4652, hat: 'cowl', traits: ['lantern'], size: 0.9, eye: 0xe0a0ff },
    challenge: [
      'Evening. Lovely evening. I\'m not watching you. I\'m watching the evening. You happen to be in it.',
      'Three doses a week, the Prince pays me. Three! My whole street gets one, and that\'s if they\'re good.',
      'I know what you did at the Fang road. I don\'t, actually. But I will in a minute. Hold still.',
    ],
    beaten: [
      'All right. All right! I never saw you. I\'ll write that down. "Saw: nobody." That\'s a report too.',
      'Don\'t tell anyone I lost. They\'ll report me. They\'ve been waiting years.',
    ],
    coins: COINS,
  },
  {
    id: 'cloak-masquerade',
    court: 'cloak',
    name: 'Masquerade',
    foeName: 'Maskmaker Visage',
    foeElement: 'chalk',
    difficulty: 5,
    gimmick: 'cloak-masquerade',
    at: { x: 560, y: 1245 },
    look: { body: 0xe8dcd0, accent: 0x7a4aa0, hat: 'tophat', traits: ['mask', 'apron', 'tool'], size: 1.05, eye: 0xf4e2ff },
    challenge: [
      'Every informer in this court wears one of my faces. Nobody knows whose. That is the whole of the art.',
      'I paint them in chalk and gesso. A face that can be wiped off is the only honest kind.',
      'Come and dance. You\'ll find me. You\'ll find me six times, and five of them will be wrong.',
    ],
    beaten: [
      'You looked. Nobody looks. They look at the mask and stop. You looked under it.',
      'Here is my face, then. Plain, isn\'t it? That\'s why I make the others.',
    ],
    coins: COINS,
  },
  {
    id: 'cloak-dead-drop',
    court: 'cloak',
    name: 'Dead Drop',
    foeName: 'Courier Cipher',
    foeElement: 'paper',
    difficulty: 5,
    gimmick: 'cloak-dead-drop',
    at: { x: 640, y: 640 },
    look: { body: 0xc8b49a, accent: 0x2a2a3e, hat: 'tricorn', traits: ['satchel', 'scarf'], size: 0.95, eye: 0xf4ead8 },
    challenge: [
      'I carry what I\'m given. I never read it. Never. A courier who reads is a letter waiting to be sent.',
      'Every letter in that satchel names somebody. One of them names you. I don\'t know which. Never read it.',
      'The lamp\'s lit on the drop. Race you there.',
    ],
    beaten: [
      'Undelivered. I\'ve never had an undelivered. I don\'t know what you do with one.',
      'Burn it, I suppose. Don\'t tell me what it said. Don\'t. …Was it me?',
    ],
    coins: COINS,
  },
  {
    id: 'cloak-poisoned-cup',
    court: 'cloak',
    name: 'Poisoned Cup',
    foeName: 'Taster Goblet',
    foeElement: 'gum',
    difficulty: 5,
    gimmick: 'cloak-poisoned-cup',
    at: { x: 1560, y: 790 },
    look: { body: 0xe0c0b0, accent: 0x6a1430, hat: 'veil', traits: ['apron'], size: 1, eye: 0xffc0d0 },
    challenge: [
      'I taste for His Highness. Every cup, every crumb. Forty years and I have never once been poisoned.',
      'That\'s not luck, dearie. Venom has a manner to it. It fidgets in the cup. Sugar sits still.',
      'Sit down. Have a drink. Have two. One of them is lovely.',
    ],
    beaten: [
      'You watched the wine. Clever thing. Most people watch my face, and my face has had forty years\' practice.',
      'Take the sweet one. On the house. …No, the other one. Ha! Got you. It\'s the first one.',
    ],
    coins: COINS,
  },
  {
    id: 'cloak-whisper-gallery',
    court: 'cloak',
    name: 'Whisper Gallery',
    foeName: 'Gossip Murmur',
    foeElement: 'silence',
    difficulty: 5,
    hpMult: 1.05,
    gimmick: 'cloak-whisper-gallery',
    at: { x: 1200, y: 355 },
    look: { body: 0xd0c4b8, accent: 0x3e3150, hat: 'hood', traits: ['scarf', 'book'], size: 1, eye: 0xe8dcff },
    challenge: [
      '(very quietly) Shh. Every horn in this gallery runs under the floor to the Hall. He hears it all.',
      '(very quietly) I keep the hush. Not because it\'s rude to talk. Because it\'s easier to hear the rest.',
      '(very quietly) Say something by a horn. Go on. See where it comes out.',
    ],
    beaten: [
      '(a little louder) Oh. Oh, that was loud. Nobody\'s been that loud in here since the gallery was built.',
      '(out loud, for the first time in years) …Huh. My voice is lower than I remembered.',
    ],
    coins: COINS,
  },
];
