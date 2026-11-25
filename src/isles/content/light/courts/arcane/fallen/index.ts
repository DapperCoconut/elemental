import type { FallenBundle } from '../../../../../IslesTypes';
import { fallenId } from '../../../../meteor/spec';
import { FALLEN_BINDING } from './binding';
import { FALLEN_BLINK } from './blink';
import { EYE } from './common';
import { FALLEN_LEVITATION } from './levitation';
import { FALLEN_PHILTRE } from './philtre';
import { FALLEN_TOAD } from './toad';

/**
 * The Arcane Court's Fallen Five — in the star's telling, the masters and tradesfolk of the mages'
 * town who served Prince Sigil gladly: the levitation tutor who taught the prince to rise over
 * everyone, the philtre-wife who brewed the town's love for the Despot, the toad-wife of the
 * familiar market and her heron, the lector who could step into any room with a rune in it, and
 * the warden who renews the Anchor Circle's binding. Tier 3: difficulty 4,4,5,5,5; coins double
 * the court's 135. They stand where the court's own five never do: the lawn under the north
 * runestones, the lane below the potion row, the far corner of the familiar market, the east
 * road past the pentacle, and the very heart of the Anchor Circle.
 */

const COURT = 'arcane';
const COINS = 270;

export const FALLEN: FallenBundle = {
  gimmicks: [FALLEN_LEVITATION, FALLEN_PHILTRE, FALLEN_TOAD, FALLEN_BLINK, FALLEN_BINDING],
  encounters: [
    {
      id: fallenId(COURT, 'levitation'), court: COURT, name: 'The Lifting Charm',
      foeName: 'Tutor Theophane Lightfoot', foeElement: 'gravity', difficulty: 4, hpMult: 1.1,
      gimmick: fallenId(COURT, 'levitation'),
      at: { x: 1000, y: 420 },
      look: { body: 0xe8dccc, accent: 0x7a52c8, hat: 'wizard', traits: ['book', 'scarf'], size: 1.0, eye: EYE },
      challenge: [
        'Up you go. Everyone goes up in my class. The trick of the lesson is coming down again.',
        'I taught His Radiance to rise above the rest of them. He was my finest pupil. He never came down.',
        'Three cushions, two of us. When the bell goes, I do hope you are standing somewhere soft.',
      ],
      beaten: [
        'I… taught children to float a feather. One feather, over a candle. Only ever a feather.',
        'The cushions were for the little ones, in case they floated themselves. Nobody ever fell. Did they?',
      ],
      coins: COINS,
    },
    {
      id: fallenId(COURT, 'philtre'), court: COURT, name: 'Heart\'s Philtre',
      foeName: 'Philtre-Wife Zephyrine Rosegall', foeElement: 'passion', difficulty: 4, hpMult: 1.1,
      gimmick: fallenId(COURT, 'philtre'),
      at: { x: 1640, y: 1190 },
      look: { body: 0xe8c8c0, accent: 0xc8406a, hat: 'veil', traits: ['apron', 'satchel'], size: 0.95, eye: EYE },
      challenge: [
        'One drop and a whole street adores the Despot. Two drops and they would die for him. I sell by the drop.',
        'Don\'t look so cross, darling. Nobody stays cross in my mist. Come closer. Closer.',
        'Catch one if you like. Mind which way it breaks. Love always goes to whoever is standing nearest.',
      ],
      beaten: [
        'I… sold cough syrup. Honey and thyme, a penny a spoon. People liked it. That isn\'t love, is it.',
        'There was a boy who bought rosewater for his mother every week. I never put anything in it. Never.',
      ],
      coins: COINS,
    },
    {
      id: fallenId(COURT, 'toad'), court: COURT, name: 'Warts and All',
      foeName: 'Toad-Wife Gudule Bulrush', foeElement: 'slime', difficulty: 5, hpMult: 1.15,
      gimmick: fallenId(COURT, 'toad'),
      at: { x: 300, y: 1380 },
      look: { body: 0xc8b898, accent: 0x5a7a2a, hat: 'hood', traits: ['satchel', 'cane', 'apron'], size: 0.9, eye: EYE },
      challenge: [
        'Every name the Bureau sends me, I make a toad of. My heron does the rest. She is never hungry for long.',
        'Mind my babies, they croak when they are cross. And they are always cross at noon.',
        'Go on, kick one. They come down somewhere. Usually on somebody.',
      ],
      beaten: [
        'I… sold toads. For gardens. They eat the slugs off the lettuces. That is all a toad is for.',
        'The heron is old Mab from the mill pond. She only ever ate the minnows. Why did I think she…',
      ],
      coins: COINS,
    },
    {
      id: fallenId(COURT, 'blink'), court: COURT, name: 'Translocation',
      foeName: 'Blink-Lector Evander Sallowmere', foeElement: 'illusion', difficulty: 5, hpMult: 1.15,
      gimmick: fallenId(COURT, 'blink'),
      at: { x: 2150, y: 900 },
      look: { body: 0xdcd4e4, accent: 0x3aa8d8, hat: 'wizard', traits: ['glasses', 'book', 'cane'], size: 1.05, eye: EYE },
      challenge: [
        'Every room in this town has a rune chalked in it. The law requires it. I can step into any of them.',
        'I teach first-years to step through a circle and out of another. I taught the Despot where they all were.',
        'Wherever you stand, there is a door near you. I will be coming through it.',
      ],
      beaten: [
        'I… fetched lost keys. People drop them down wells. I blinked down and blinked them home.',
        'The runes were for the doctor. So she could reach the sick at night. There was a night, once. Wasn\'t there?',
      ],
      coins: COINS,
    },
    {
      id: fallenId(COURT, 'binding'), court: COURT, name: 'Ring upon Ring',
      foeName: 'Anchor-Warden Radegund Vesh', foeElement: 'bind', difficulty: 5, hpMult: 1.2,
      gimmick: fallenId(COURT, 'binding'),
      at: { x: 1200, y: 690 },
      look: { body: 0xd8ccb8, accent: 0x9c7a24, hat: 'mitre', traits: ['brand', 'book'], size: 1.15, eye: EYE },
      challenge: [
        'The Anchor holds because I renew it, ring by ring, every hour of the day. Nothing it holds ever moves.',
        'What I bind stays bound. Doors, oaths, people. It is all the same knot.',
        'Stand inside my circle as long as you like. You will be staying a good deal longer.',
      ],
      beaten: [
        'I… knotted nets. For the fish market. Ring by ring, every hour. The knots were for holding fish.',
        'My circles held sprained ankles. I bound them in the infirmary. Somebody always said thank you.',
      ],
      coins: COINS,
    },
  ],
};
