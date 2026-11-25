import type { FallenBundle } from '../../../../../IslesTypes';
import { fallenId } from '../../../../meteor/spec';
import { FALLEN_MOON } from './moon';
import { FALLEN_PATIENCE } from './patience';
import { FALLEN_PEGGING } from './pegging';
import { FALLEN_READERS } from './readers';
import { FALLEN_TWENTY_ONE } from './twentyOne';

/**
 * The Card Court's Fallen Five — in the star's telling, the card-sharps' town's quiet servants of
 * the House: the governess who taught Prince Ante patience, the engraver who cut the marked plate,
 * the dealer at the long table who never paid out, the crib-keeper who wrote down every winner, and
 * the hearts-mistress who taught the favourites' children that the one left holding pays. Each
 * plays one of the Rail's own games, turned into a weapon. Tier 1: difficulty 4,4,4,5,5; coins
 * double the court's 100. They stand on lawn the court's five never use: the east Cross Street,
 * the lawn above Deuce Row, east of the pond, behind the Dealing Hall, and by the south gate.
 */

const EYE = 0xffa040;
const COINS = 200;

export const FALLEN: FallenBundle = {
  gimmicks: [FALLEN_PATIENCE, FALLEN_READERS, FALLEN_TWENTY_ONE, FALLEN_PEGGING, FALLEN_MOON],
  encounters: [
    {
      id: fallenId('card', 'patience'),
      court: 'card',
      name: 'The Long Patience',
      foeName: 'Governess Ermengild Pask',
      foeElement: 'string',
      difficulty: 4,
      hpMult: 1.1,
      gimmick: fallenId('card', 'patience'),
      at: { x: 560, y: 980 },
      look: { body: 0xe6d2bc, accent: 0x2a2236, hat: 'veil', traits: ['glasses', 'book', 'scarf'], size: 1.0, eye: EYE },
      challenge: [
        'I taught His Highness patience. King on the baize, then queen, then knave. Red on black. Never hurry.',
        'A run is only a row of cards tied together. Until it is tied round you.',
        'Sit still, dear. I shall lay the next one just beside you.',
      ],
      beaten: [
        'Patience... I played it alone, in the evenings. Whose lessons? I taught letters to the Ashby boy, didn\'t I?',
        'There was never a prince at my table. Only a cold cup of tea and a game that would not come out.',
      ],
      coins: COINS,
    },
    {
      id: fallenId('card', 'readers'),
      court: 'card',
      name: 'Luminous Readers',
      foeName: 'Engraver Osbeth Quarrie',
      foeElement: 'ink',
      difficulty: 4,
      hpMult: 1.1,
      gimmick: fallenId('card', 'readers'),
      at: { x: 2190, y: 1160 },
      look: { body: 0xcdb69c, accent: 0x5c1a20, hat: 'cap', traits: ['glasses', 'apron', 'tool'], size: 1.05, eye: EYE },
      challenge: [
        'Every deck on Lotterhaven comes off my plate. Every back has a little star in it, if you know how to look.',
        'Through the red glass, child. The House has always looked at you through red glass.',
        'I know which cards will spring. You may learn, if you walk round far enough.',
      ],
      beaten: [
        'The plate... I cut lattice. Only lattice. Diamonds inside diamonds, for Ninian\'s press. No stars.',
        'Why would I mark a deck? I cannot even win at snap. Ask Pip. He has beaten me forty years.',
      ],
      coins: COINS,
    },
    {
      id: fallenId('card', 'twenty-one'),
      court: 'card',
      name: 'Hit Me',
      foeName: 'Shoe-Dealer Hilarion Vosk',
      foeElement: 'fortune',
      difficulty: 4,
      hpMult: 1.15,
      gimmick: fallenId('card', 'twenty-one'),
      at: { x: 1880, y: 830 },
      look: { body: 0xd8bfa2, accent: 0x1f9a58, hat: 'visor', traits: ['satchel', 'scarf'], size: 1.1, eye: EYE },
      challenge: [
        'Twenty-one, at the House\'s long table. Thirty years at the shoe. I have never once paid a player out.',
        'Cards come to whoever they touch. Take the right ones. Bust on the wrong ones. Simple as breathing.',
        'Shall I deal you in? I am already dealing you in.',
      ],
      beaten: [
        'Never paid out... I paid out. Buttons. Out of a biscuit tin, on a crate on the Rail. Every Sunday.',
        'The House? I was never let past its door. I dealt for children. They always made twenty-one.',
      ],
      coins: COINS,
    },
    {
      id: fallenId('card', 'pegging'),
      court: 'card',
      name: 'Pegged Out',
      foeName: 'Crib-Keeper Lemoyne Purlow',
      foeElement: 'justice',
      difficulty: 5,
      hpMult: 1.2,
      gimmick: fallenId('card', 'pegging'),
      at: { x: 2200, y: 260 },
      look: { body: 0xc8ae94, accent: 0x5e2a1a, hat: 'tophat', traits: ['beard', 'book', 'cane'], size: 1.15, eye: EYE },
      challenge: [
        'Fifteen two, fifteen four, and a pair is six. I keep the count on the Rail. I keep a little book as well.',
        'Everyone who ever beat a favourite is in it. Their name, their street, their score. The House likes to know.',
        'Every blow you land moves your peg. Count carefully. I always do.',
      ],
      beaten: [
        'The book... it was scores. Only scores. Old Clubb was sixty-one short in the spring final. I wrote that down.',
        'I never gave a name to anyone. Did I? There is a page torn out. I cannot remember tearing it.',
      ],
      coins: COINS,
    },
    {
      id: fallenId('card', 'moon'),
      court: 'card',
      name: 'Shoot the Moon',
      foeName: 'Perdita Lisk, Hearts-Mistress',
      foeElement: 'passion',
      difficulty: 5,
      hpMult: 1.2,
      gimmick: fallenId('card', 'moon'),
      at: { x: 1330, y: 1590 },
      look: { body: 0xecd0be, accent: 0xc9202f, hat: 'hood', traits: ['scarf', 'glasses'], size: 1.0, eye: EYE },
      challenge: [
        'I taught the favourites\' children hearts. Whoever is left holding them pays. That is the lesson. That is all.',
        'The Black Lady is in the hand somewhere. She is always somewhere. Stand closer, dear.',
        'Of course, if you take every card, the whole hand turns on me. Nobody has the nerve.',
      ],
      beaten: [
        'Hearts... I taught it at the parish hall. Wet Thursdays. Nobody ever paid anything but a toffee.',
        'The favourites\' children? There were only ever the Clubb twins, and they cheated, and I let them.',
      ],
      coins: COINS,
    },
  ],
};
