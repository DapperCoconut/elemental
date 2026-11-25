import type { FallenBundle } from '../../../../../IslesTypes';
import { fallenId } from '../../../../meteor/spec';
import { FALLEN_DRAWN_CURTAINS } from './drawnCurtains';
import { FALLEN_FORTY_WINKS } from './fortyWinks';
import { FALLEN_LIGHT_SLEEPERS } from './lightSleepers';
import { FALLEN_SLEEP_TALK } from './sleepTalk';
import { FALLEN_TUCKED_IN } from './tuckedIn';

/**
 * The Slumber Court's Fallen Five — in the star's telling, the people of the sleeping town who
 * kept the becalmed asleep for Prince Reverie: the quilter who sewed them into their beds, the
 * dream-reader who carried their sleep-talk up to the Four-Poster (Lull's dark mirror), the
 * milliner whose nightcaps run out like sand-glasses, the warden who lets the light sleepers do
 * the shushing, and the chamberlain who lets the Prince's canopy down. Tier 2: difficulty
 * 4,4,4,5,5; coins double the court's 75. Elements none of the court's champions or duel foes use.
 */

const EYE = 0xffa040;

export const FALLEN: FallenBundle = {
  gimmicks: [FALLEN_TUCKED_IN, FALLEN_SLEEP_TALK, FALLEN_FORTY_WINKS, FALLEN_LIGHT_SLEEPERS, FALLEN_DRAWN_CURTAINS],
  encounters: [
    {
      id: fallenId('slumber', 'tucked-in'),
      court: 'slumber',
      name: 'Tucked In',
      foeName: 'Mother Gusset, Quilter of the Ward',
      foeElement: 'string',
      difficulty: 4,
      hpMult: 1.1,
      gimmick: fallenId('slumber', 'tucked-in'),
      at: { x: 1600, y: 950 },
      look: { body: 0xe4d0c0, accent: 0xd8a6b6, hat: 'coif', traits: ['apron', 'glasses', 'tool'], size: 1.0, eye: EYE },
      challenge: [
        'Six hundred quilts on the Long Ward, pet, and I stitched every one shut along the mattress. Snug as a pie.',
        'Nobody gets up till the debt\'s worked off. That\'s what a good hem is for. Keeping people in.',
        'Hold still. You\'ll only tear the seam, and then I have to start you over.',
      ],
      beaten: [
        'I... I mended them. Elbows and knees. Little Tib\'s blanket, where the dog got it. I only ever mended.',
        'Why would I sew anyone in? Why does my thimble remember doing it?',
      ],
      coins: 150,
    },
    {
      id: fallenId('slumber', 'sleep-talk'),
      court: 'slumber',
      name: 'Talking in Your Sleep',
      foeName: 'Dreamwright Lull, the Prince\'s Ear',
      foeElement: 'memory',
      difficulty: 4,
      gimmick: fallenId('slumber', 'sleep-talk'),
      at: { x: 2020, y: 640 },
      look: { body: 0xd0c8e0, accent: 0x3a4a8a, hat: 'wizard', traits: ['satchel', 'book', 'glasses'], size: 1.05, eye: EYE },
      challenge: [
        'Everyone talks in their sleep. The baker owes six. The widow on bed forty hides a bottle. I hear it all.',
        'His Drowsiness likes a full report by morning. You\'ve been very chatty, for someone wide awake.',
        'Go on. Say something. I\'ll read it back to you.',
      ],
      beaten: [
        'I read dreams for a copper and I kept them. That was the whole trade — you keep them. Didn\'t I keep them?',
        'There was never a report. There was a little blue tent and people who wanted to know what a dream meant.',
      ],
      coins: 150,
    },
    {
      id: fallenId('slumber', 'forty-winks'),
      court: 'slumber',
      name: 'Forty Winks',
      foeName: 'Milliner Tassel, Capmaker to His Drowsiness',
      foeElement: 'sand',
      difficulty: 4,
      gimmick: fallenId('slumber', 'forty-winks'),
      at: { x: 950, y: 920 },
      look: { body: 0xe8d8c8, accent: 0xb6a6d8, hat: 'nightcap', traits: ['scarf', 'tool'], size: 0.95, eye: EYE },
      challenge: [
        'A little sand-glass in every crown, dear. All the dreaming you want, done in a blink. Then off you go.',
        'The Prince orders them by the gross. Nobody ever takes one off. Nobody ever gets the chance.',
        'Here. This one\'s your size. I could tell from across the street.',
      ],
      beaten: [
        'Caps keep your ears warm. That\'s all. Wool and a pompom. I never sewed any glass into anything.',
        'I made one for my sister. Blue. She wore it out to the well. Why did I think it would put her down?',
      ],
      coins: 150,
    },
    {
      id: fallenId('slumber', 'light-sleepers'),
      court: 'slumber',
      name: 'Light Sleepers',
      foeName: 'Hush-Warden Tace',
      foeElement: 'echo',
      difficulty: 5,
      hpMult: 1.15,
      gimmick: fallenId('slumber', 'light-sleepers'),
      at: { x: 1450, y: 1150 },
      look: { body: 0xb8b0c8, accent: 0x2e3268, hat: 'earmuffs', traits: ['lantern', 'scarf', 'mask'], size: 1.15, eye: EYE },
      challenge: [
        'Felt slippers. Felt gloves. I walk the Ward all night and never make a sound. The sleepers do it for me.',
        'They\'re not quite asleep, you see. They hear everything. And they point.',
        'Shh. Mind your feet. Mind your hands. Mind your breathing, while you\'re at it.',
      ],
      beaten: [
        'I sat up with them. That was the job. If one woke frightened I said hush, it\'s only me. Only ever me.',
        'Nobody pointed at anybody. They just... slept. Badly. I held their hands. I think I held their hands.',
      ],
      coins: 150,
    },
    {
      id: fallenId('slumber', 'drawn-curtains'),
      court: 'slumber',
      name: 'Drawn Curtains',
      foeName: 'Chamberlain Valance',
      foeElement: 'gravity',
      difficulty: 5,
      hpMult: 1.2,
      gimmick: fallenId('slumber', 'drawn-curtains'),
      at: { x: 1640, y: 640 },
      look: { body: 0xd8ccd8, accent: 0x6a4a7a, hat: 'tophat', traits: ['scarf', 'glasses'], size: 1.25, eye: EYE },
      challenge: [
        'I turn down His Drowsiness\'s bed. Every night. Curtains drawn, canopy let down, the posts polished.',
        'Sometimes the Prince has a guest who ought to sleep a long while. The canopy is very heavy, you understand.',
        'Do step inside. The pillows are goose. Mind the posts.',
      ],
      beaten: [
        'I aired the bed. I beat the rugs. I wound the canopy up in the morning so the light got in. Every morning.',
        'There was never a guest under it. I\'d have noticed. Wouldn\'t I have noticed?',
      ],
      coins: 150,
    },
  ],
};
