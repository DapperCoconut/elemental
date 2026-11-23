import type { EncounterDef, GimmickDef } from '../../../../IslesTypes';
import { CUT_THE_DECK } from './gimmicks/cutTheDeck';
import { HOUSE_OF_CARDS } from './gimmicks/houseOfCards';
import { TAROT } from './gimmicks/tarot';
import { SNAP } from './gimmicks/snap';
import { FIFTY_TWO_PICKUP } from './gimmicks/pickup';

/**
 * The Card Court's five champions — the sharps and dealers who keep Prince Ante's tables. Tier 1
 * of Lotterhaven (difficulty 4,4,4,4,5). Up the Red-and-Black from Tosswater you meet Shuffle at
 * the Cutting Stone, Tier on Deuce Row, Arcana among the tents, Pip on the Rail before the mill,
 * and Jape on the Dealing Hall's forecourt.
 */

export const CARD_GIMMICKS: GimmickDef[] = [CUT_THE_DECK, HOUSE_OF_CARDS, TAROT, SNAP, FIFTY_TWO_PICKUP];

const COINS = 100;

export const CARD_ENCOUNTERS: EncounterDef[] = [
  {
    id: 'card-cut-the-deck',
    court: 'card',
    name: 'Cut the Deck',
    foeName: 'Dealer Shuffle',
    foeElement: 'magic',
    difficulty: 4,
    gimmick: 'card-cut-the-deck',
    at: { x: 1330, y: 962 },
    look: { body: 0xe0c4a6, accent: 0x1f9a58, hat: 'visor', traits: ['glasses', 'satchel'], size: 1.05, eye: 0x6fe0a0 },
    challenge: [
      'Quarrel, is it? In the Card Court we cut for quarrels. High card wins. I keep the deck.',
      'Strike the Stone and you cut. The suit that turns is the law for both of us. Fair as fair.',
      'I always know what\'s on top, mind. That\'s not cheating. That\'s dealing.',
    ],
    beaten: [
      'You cut when the top card was yours. You were LOOKING. Nobody looks at the deck. They look at me.',
      'Go on. I\'ll shuffle. I\'m always shuffling.',
    ],
    coins: COINS,
  },
  {
    id: 'card-house-of-cards',
    court: 'card',
    name: 'House of Cards',
    foeName: 'Builder Tier',
    foeElement: 'earth',
    difficulty: 4,
    gimmick: 'card-house-of-cards',
    at: { x: 380, y: 1302 },
    look: { body: 0xc8a888, accent: 0xb8903e, hat: 'helmet', traits: ['tool', 'beard', 'apron'], size: 1.3, eye: 0xf5eedb },
    challenge: [
      'Every house on Deuce Row went up under my hands. Storey on storey. Not a drop of glue.',
      'Card-houses are honest. You know where you stand with them. Right up until you don\'t.',
      'Mind where you swing. A house falls away from the blow — and I know which card to pull.',
    ],
    beaten: [
      'You put my own house between us and knocked it at me. That\'s builder\'s thinking. Wasted on a fighter.',
      'I\'ll have them up again by morning. Houses are easy. It\'s keeping them up.',
    ],
    coins: COINS,
  },
  {
    id: 'card-tarot',
    court: 'card',
    name: 'Tarot',
    foeName: 'Seer Arcana',
    foeElement: 'death',
    difficulty: 4,
    gimmick: 'card-tarot',
    at: { x: 2060, y: 1340 },
    look: { body: 0xc8b8c8, accent: 0x22224a, hat: 'veil', traits: ['scarf', 'book'], size: 1.05, eye: 0xc8b0ff },
    challenge: [
      'I read the Draw for the House. Who will be called, and who will pay, and who will pawn.',
      'I am never wrong. It is very easy never to be wrong when the House decides what happens.',
      'Three cards. The Tower, the Hanged Man and the Star. Watch them. I shall be watching you.',
    ],
    beaten: [
      'You followed the Star through the shuffle. Most people watch my hands. You watched the card.',
      'I did not foresee this. I had better not say so at the House.',
    ],
    coins: COINS,
  },
  {
    id: 'card-snap',
    court: 'card',
    name: 'Snap',
    foeName: 'Gamesman Pip',
    foeElement: 'electricity',
    difficulty: 4,
    gimmick: 'card-snap',
    at: { x: 780, y: 652 },
    look: { body: 0xe8d0b4, accent: 0x2f5bb8, hat: 'propeller', traits: ['scarf'], size: 0.85, eye: 0xbfe8ff },
    challenge: [
      'SNAP! Ha. Sorry. Habit. I\'m the Rail\'s champion at snap. Forty-one years running. I\'m fifty.',
      'Two cards the same, and the first hand down wins. I\'m very fast. I\'ve had a lot of practice.',
      'Down here the cards spark when they match. Watch your fingers. Snap!',
    ],
    beaten: [
      'You got your hand down first. On MY pair. Nobody does that. Nobody\'s quick enough.',
      'Well. Snap, I suppose. Snap to you.',
    ],
    coins: COINS,
  },
  {
    id: 'card-fifty-two-pickup',
    court: 'card',
    name: 'Fifty-Two Pickup',
    foeName: 'Joker Jape',
    foeElement: 'rubber',
    difficulty: 5,
    hpMult: 1.05,
    gimmick: 'card-fifty-two-pickup',
    at: { x: 1620, y: 640 },
    look: { body: 0xf0d8c0, accent: 0x7a3aa8, hat: 'jester', traits: ['mask'], size: 1.05, eye: 0xf2d040 },
    challenge: [
      'Do you want to play fifty-two pickup? Say yes. Everybody says yes. Nobody ever asks what it is.',
      'Here\'s how it goes: I throw the deck, and you pick it up. Every card a little present!',
      'Some of the presents are me. Ha! Boing!',
    ],
    beaten: [
      'You knew which ones were me. HOW. They twitch? They twitch. I\'ve been TWITCHING. Forty years.',
      'Fine. Pick them up yourself, then. I\'m going to sit in the fountain. There isn\'t a fountain. I\'ll find one.',
    ],
    coins: COINS,
  },
];
