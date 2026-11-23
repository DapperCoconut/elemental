import type { EncounterDef, GimmickDef } from '../../../../IslesTypes';
import { COMMEDIA } from './gimmicks/commedia';
import { FIREWORKS_BARGE } from './gimmicks/fireworksBarge';
import { GONDOLA } from './gimmicks/gondola';
import { HALL_OF_MIRRORS } from './gimmicks/hallOfMirrors';
import { MASKED_BALL } from './gimmicks/maskedBall';

/**
 * The Masquerade Court's five champions — Prince Facade's entertainers, who keep the faceless
 * court dancing so that nobody need speak. Tier 3 of Choirholm (difficulty 5 throughout). In
 * from the Brass road you meet Domino on the Campo della Danza before the ballroom, Silver
 * outside the Hall of Mirrors across the Rio, Gerbe on the fireworks quay by the lagoon, Patch
 * in front of the Teatrino, and Remo on the slipway of the Squero.
 */

export const MASQUE_GIMMICKS: GimmickDef[] = [MASKED_BALL, HALL_OF_MIRRORS, FIREWORKS_BARGE, COMMEDIA, GONDOLA];

const COINS = 125;

export const MASQUE_ENCOUNTERS: EncounterDef[] = [
  {
    id: 'masque-masked-ball',
    court: 'masque',
    name: 'Masked Ball',
    foeName: 'Dancer Domino',
    foeElement: 'fate',
    difficulty: 5,
    gimmick: 'masque-masked-ball',
    at: { x: 620, y: 580 },
    look: { body: 0x2a1a2a, accent: 0xd84a64, hat: 'domino', traits: ['scarf'], size: 1.05, eye: 0xffd24a },
    challenge: [
      'Dance with me, stranger. No — don\'t speak. Nobody speaks at a ball. That is why there is always a ball.',
      'Find me in the ring. Every mask is mine. Every turn is a coin tossed: is it her? Is it her?',
      'One, two, three. One, two, three.',
    ],
    beaten: [
      'You popped my partners. All of them. I shall have to dance alone, and everyone will see my face.',
      'Go on. The band has stopped. That has never happened before.',
    ],
    coins: COINS,
  },
  {
    id: 'masque-hall-of-mirrors',
    court: 'masque',
    name: 'Hall of Mirrors',
    foeName: 'Mirrorwright Silver',
    foeElement: 'crystal',
    difficulty: 5,
    hpMult: 1.05,
    gimmick: 'masque-hall-of-mirrors',
    at: { x: 480, y: 1520 },
    look: { body: 0xc8d4e0, accent: 0x6a7a8c, hat: 'goggles', traits: ['lantern', 'glasses', 'apron'], size: 1, eye: 0xf2f8ff },
    challenge: [
      'Every mirror in the court is mine. Silvered by hand. The Prince has a hundred, and none shows him his face.',
      'People come to the Hall to practise their masks. To see what the Tuners see. A note, on a brow.',
      'Strike at me and you strike at glass. Glass strikes back.',
    ],
    beaten: [
      'You turned them. All my angles. I have never seen my own glint come home before. It is very bright.',
      'Take a look at yourself on the way out. Go on. Nobody here does any more.',
    ],
    coins: COINS,
  },
  {
    id: 'masque-fireworks-barge',
    court: 'masque',
    name: 'Fireworks Barge',
    foeName: 'Pyrotechnist Gerbe',
    foeElement: 'gunpowder',
    difficulty: 5,
    gimmick: 'masque-fireworks-barge',
    at: { x: 1950, y: 470 },
    look: { body: 0xc49a7c, accent: 0xff5a4a, hat: 'goggles', traits: ['bandage', 'satchel', 'beard'], size: 1.2, eye: 0xffd24a },
    challenge: [
      'At Compline I put the whole lagoon up in fire. Red, gold, green. So nobody hears the Organ. My gift.',
      'Every shell I pack makes a face. Volto. Colombina. Comedy. Tragedy. I draw it on the quay first.',
      'Stand inside the face and you\'ll live. Stand on the line and you\'ll be part of the show.',
    ],
    beaten: [
      'You threw my own stick back at me. A spent stick. I\'ve been hit by worse, but never so cheekily.',
      'There\'s a quiet coming. I can feel it. I don\'t know what we do with a quiet.',
    ],
    coins: COINS,
  },
  {
    id: 'masque-commedia',
    court: 'masque',
    name: 'Commedia',
    foeName: 'Harlequin Patch',
    foeElement: 'rubber',
    difficulty: 5,
    gimmick: 'masque-commedia',
    at: { x: 1980, y: 900 },
    look: { body: 0xd8b49a, accent: 0xf0c838, hat: 'jester', traits: ['mask', 'tool'], size: 0.95, eye: 0x3aa85a },
    challenge: [
      'No words on my stage! The commedia is the only theatre left — masks and slapstick. Masks can\'t sing flat.',
      'I play them all. Pierrot weeps, Harlequin cracks, Columbine flirts. Hiss me off if you don\'t like one.',
      'Places, everyone! (He bows so low he bounces.)',
    ],
    beaten: [
      'Booed off my own stage! By a stranger! That\'s the best review I\'ve had in nine years.',
      'Come to the second act. There isn\'t one. I\'ll write one. With WORDS, maybe.',
    ],
    coins: COINS,
  },
  {
    id: 'masque-gondola',
    court: 'masque',
    name: 'Gondola',
    foeName: 'Gondolier Remo',
    foeElement: 'water',
    difficulty: 5,
    hpMult: 1.05,
    gimmick: 'masque-gondola',
    at: { x: 2000, y: 1470 },
    look: { body: 0xc49a7c, accent: 0x14121a, hat: 'straw', traits: ['rod', 'mask', 'beard'], size: 1.2, eye: 0x9ad4ff },
    challenge: [
      'I row the night boats, stranger. Curtained, black, up the canals after Compline. Always full going up.',
      'I\'m the only man in the court allowed to sing. Gondoliers sing to keep the stroke. So I sing. Loud.',
      'Off the bridges, you wade. And my boats don\'t stop for waders. Oe — premi!',
    ],
    beaten: [
      'Knocked into my own canal. Forty years on the water and I\'ve never been wet above the knee.',
      'Go on. I\'ll sit here a while. The boats can wait. Maybe the boats can wait for good.',
    ],
    coins: COINS,
  },
];
