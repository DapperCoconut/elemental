import type { EncounterDef, GimmickDef } from '../../../../IslesTypes';
import { CONTEMPT } from './gimmicks/contempt';
import { GLASS_CAGE } from './gimmicks/glassCage';
import { JURY_BOX } from './gimmicks/juryBox';
import { OBJECTION } from './gimmicks/objection';
import { SWORN_OATH } from './gimmicks/swornOath';

/**
 * The Tribunal Court's five champions — the officers of Prince Verdict's court. Tier 4 of Solmara
 * (difficulty 5 across the board). Up the Steps of Appeal you meet Lucent among the mirror cages,
 * Foreman Twelve below the public gallery, Vow by the Fountain of Testimony where witnesses swear,
 * Rebuttal on the east walk outside the counsel doors, and Marshal Banish under the Heliostat's
 * legs, where the bounds of the court are walked each noon.
 */

export const TRIBUNAL_GIMMICKS: GimmickDef[] = [GLASS_CAGE, JURY_BOX, OBJECTION, CONTEMPT, SWORN_OATH];

const COINS = 145;

export const TRIBUNAL_ENCOUNTERS: EncounterDef[] = [
  {
    id: 'tribunal-glass-cage',
    court: 'tribunal',
    name: 'Glass Cage',
    foeName: 'Gaoler Lucent',
    foeElement: 'crystal',
    difficulty: 5,
    gimmick: 'tribunal-glass-cage',
    at: { x: 860, y: 1474 },
    look: { body: 0xd8e8f0, accent: 0x94bcc8, hat: 'cap', traits: ['tool', 'glasses'], size: 1.15, eye: 0xf4fbff },
    challenge: [
      'Every cage in this yard I silvered myself. Inside and out. The accused must be seen from every side.',
      'You can see in. They can see out. They can see themselves, which is the worst of it. That is the point.',
      'You have a look of somebody who has slept in the dark. Mind the shadow on the floor, friend.',
    ],
    beaten: [
      'Cracked my best cage. From the outside, too. That\'s a thing I\'ll have to see every time I polish it.',
      'Go on. I\'ll not lock this one again. I\'ll say the silvering was tired.',
    ],
    coins: COINS,
  },
  {
    id: 'tribunal-jury-box',
    court: 'tribunal',
    name: 'Jury Box',
    foeName: 'Foreman Twelve',
    foeElement: 'psychic',
    difficulty: 5,
    gimmick: 'tribunal-jury-box',
    at: { x: 640, y: 1132 },
    look: { body: 0x5a2a6a, accent: 0xb070ff, hat: 'wig', traits: ['book', 'glasses'], size: 1.05, eye: 0xc8a0ff },
    challenge: [
      'I have foremanned four hundred and twelve juries. They have been unanimous four hundred and twelve times.',
      'I don\'t tell them what to think. I simply know what they are going to think, slightly before they do.',
      'Impress them, stranger. A blow from behind. A blow from afar. They do so love a bit of theatre.',
    ],
    beaten: [
      'Seven to five. Against me. I didn\'t see it coming, and I always see it coming.',
      'They\'re looking at me. The whole box. I think they are thinking for themselves. It\'s horrible.',
    ],
    coins: COINS,
  },
  {
    id: 'tribunal-objection',
    court: 'tribunal',
    name: 'Objection!',
    foeName: 'Advocate Rebuttal',
    foeElement: 'echo',
    difficulty: 5,
    gimmick: 'tribunal-objection',
    at: { x: 2200, y: 1170 },
    look: { body: 0x3a2a40, accent: 0xe8c860, hat: 'wig', traits: ['book', 'scarf'], size: 1, eye: 0xffe680 },
    challenge: [
      'I prosecute for the Crown. Every word the accused says, I say back to them, slower. They hear how it sounds.',
      '"I only wanted to sleep." "You only wanted to SLEEP?" — the jury gasps. It works every time.',
      'Make your case, stranger. And when you speak, expect to hear it again.',
    ],
    beaten: [
      'Objection. …Overruled. By you. I heard that one coming back a long way off.',
      '"I only wanted to sleep." Said slowly, it sounds rather reasonable. I never noticed.',
    ],
    coins: COINS,
  },
  {
    id: 'tribunal-contempt',
    court: 'tribunal',
    name: 'Contempt of Court',
    foeName: 'Marshal Banish',
    foeElement: 'magnet',
    difficulty: 5,
    gimmick: 'tribunal-contempt',
    at: { x: 1500, y: 610 },
    look: { body: 0x6a3a3a, accent: 0xb8202a, hat: 'helmet', traits: ['cane', 'brand'], size: 1.25, eye: 0xff9a8a },
    challenge: [
      'The bounds of the court are where I set the stones. Inside, you may speak. Outside, you are in contempt.',
      'I walk them every noon. Under the Heliostat\'s legs, where the light comes straightest. No shade to hide in.',
      'The stones are lodestone. They know me. They push what I want pushed. Stand inside, if you can.',
    ],
    beaten: [
      'Shoved my own bounds off me. With my own stones. I\'ll be some while living that down.',
      'You\'re in contempt. Of the whole court, I think. Good. Go and be contemptuous somewhere north.',
    ],
    coins: COINS,
  },
  {
    id: 'tribunal-sworn-oath',
    court: 'tribunal',
    name: 'Sworn Oath',
    foeName: 'Oath-Keeper Vow',
    foeElement: 'passion',
    difficulty: 5,
    hpMult: 1.05,
    gimmick: 'tribunal-sworn-oath',
    at: { x: 1560, y: 1612 },
    look: { body: 0xf2e6c4, accent: 0xd8344a, hat: 'veil', traits: ['book'], size: 0.95, eye: 0xffd0d8 },
    challenge: [
      'Every witness washes their face in the Fountain, and then I swear them. I have never once been lied to.',
      'A promise kept is the only light that doesn\'t burn. I believe that. I believe it with my whole heart.',
      'So: you will swear, and I will swear. Keep your word and be absolved. Break it, and be struck.',
    ],
    beaten: [
      'You kept yours. I broke mine. I swore I never would, and I did, in front of the Fountain.',
      'I need to sit down. I need to think about every oath I\'ve ever taken. That will take a while.',
    ],
    coins: COINS,
  },
];
