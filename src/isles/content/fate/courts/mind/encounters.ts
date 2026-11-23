import type { EncounterDef, GimmickDef } from '../../../../IslesTypes';
import { HYPNOSIS } from './gimmicks/hypnosis';
import { MIND_READER } from './gimmicks/mindReader';
import { MIND_SWAP } from './gimmicks/mindSwap';
import { POKER_FACE } from './gimmicks/pokerFace';
import { TELEKINESIS } from './gimmicks/telekinesis';

/**
 * The Mind Court's five champions — the House's readers, who sit across the green lamp from
 * anyone wagering against the King and say whether they are bluffing. Tier 3 of Lotterhaven
 * (difficulty 5 across the board). From the Tosswater road you meet Ouija on Séance Row, Tell at
 * the Thought Exchange, Levitas on the lawn below the reading booths, Swoon outside his
 * Playhouse and Doppel on the north road, where nobody can be quite sure which of him it is.
 */

export const MIND_GIMMICKS: GimmickDef[] = [MIND_READER, POKER_FACE, TELEKINESIS, HYPNOSIS, MIND_SWAP];

const COINS = 125;

export const MIND_ENCOUNTERS: EncounterDef[] = [
  {
    id: 'mind-mind-reader',
    court: 'mind',
    name: 'Mind Reader',
    foeName: 'Medium Ouija',
    foeElement: 'soul',
    difficulty: 5,
    gimmick: 'mind-mind-reader',
    at: { x: 640, y: 1420 },
    look: { body: 0xe0ccd8, accent: 0x5e2672, hat: 'veil', traits: ['scarf', 'lantern'], size: 1, eye: 0xe2ccff },
    challenge: [
      'You were going to say "good evening". The board told me. It tells me everything a little early.',
      'Every wager against the House sits at my table first. I read the bluff, and the House declines it.',
      'Let us ask the spirits who wins. Watch the planchette. I already have.',
    ],
    beaten: [
      'G… O… O… D… B… Y… The board is spelling something I did not tell it to.',
      'Go on. The spirits say you were always going to win. I wish they had mentioned it.',
    ],
    coins: COINS,
  },
  {
    id: 'mind-poker-face',
    court: 'mind',
    name: 'Poker Face',
    foeName: 'Bluffer Tell',
    foeElement: 'shadow',
    difficulty: 5,
    gimmick: 'mind-poker-face',
    at: { x: 1900, y: 1250 },
    look: { body: 0xc8b8a8, accent: 0x17151b, hat: 'visor', traits: ['mask', 'pipe'], size: 1.05, eye: 0x9a8acc },
    challenge: [
      'I check the hard cases. The ones the mediums can\'t read. Card-sharps. Liars. Mothers.',
      'Everybody has a tell. A blink, a breath, a hand on the chain. I sell mine to the Exchange by the dozen.',
      'You can see my card, stranger. I can see yours. Shall we find out which of us is lying about it?',
    ],
    beaten: [
      'You looked at my king and walked straight at me. Nobody walks AT me. That\'s not a tell. That\'s rude.',
      'Fine. Fold. Take the pot. Don\'t tell the Exchange what my face did.',
    ],
    coins: COINS,
  },
  {
    id: 'mind-telekinesis',
    court: 'mind',
    name: 'Telekinesis',
    foeName: 'Lifter Levitas',
    foeElement: 'magnet',
    difficulty: 5,
    gimmick: 'mind-telekinesis',
    at: { x: 1650, y: 980 },
    look: { body: 0xd4c0a8, accent: 0x2a8a50, hat: 'tophat', traits: ['glasses', 'cane'], size: 1.1, eye: 0xb27cff },
    challenge: [
      'A table that rises during a reading is a sign the wager is honest. The House likes its tables low.',
      'So I hold them down. Forty years of holding tables down. You build up quite a grip.',
      'Today I let go. Mind the chairs. Mind the teapot especially. It knows what you did.',
    ],
    beaten: [
      'Everything is on the floor. Everything. I have not seen my parlour from this angle since I was a boy.',
      'Put the teapot back on its tray, would you? I can\'t lift a thing. Not one more thing.',
    ],
    coins: COINS,
  },
  {
    id: 'mind-hypnosis',
    court: 'mind',
    name: 'Hypnosis',
    foeName: 'Mesmerist Swoon',
    foeElement: 'dream',
    difficulty: 5,
    gimmick: 'mind-hypnosis',
    at: { x: 560, y: 610 },
    look: { body: 0xd8c4b0, accent: 0x8c46a8, hat: 'wizard', traits: ['beard', 'book'], size: 1.15, eye: 0xe2ccff },
    challenge: [
      'Nightly at the Playhouse: the busted come on stage with a name, and go off with a number. Very popular.',
      'It doesn\'t hurt them. They simply stop being able to say it. Their mouths go round the shape of it.',
      'Look at the wheel, stranger. No? Then look at me. Ah — but that\'s nearly the same thing.',
    ],
    beaten: [
      'You never once looked at it. Do you know how hard that is? I wrote a pamphlet on how hard that is.',
      'I may skip tonight\'s performance. I find I have lost my audience. And my nerve.',
    ],
    coins: COINS,
  },
  {
    id: 'mind-swap',
    court: 'mind',
    name: 'Mind Swap',
    foeName: 'Switcher Doppel',
    foeElement: 'quantum',
    difficulty: 5,
    gimmick: 'mind-swap',
    at: { x: 1200, y: 330 },
    look: { body: 0xccc4dc, accent: 0x4a2390, hat: 'jester', traits: ['mask', 'scarf'], size: 1, eye: 0xc4e4ff },
    challenge: [
      'Which of us are you talking to? Both, I hope. I hate being left out of my own conversations.',
      'The Prince has me sit in on the big wagers. Halfway through, the gambler finds they\'re thinking my thoughts.',
      'Fold, they think. Fold. And then they wonder why they did. Shall we trade? You first.',
    ],
    beaten: [
      'That was your win, wasn\'t it? Or mine. No — yours. I can feel it\'s yours. It doesn\'t fit me.',
      'Go on up. Tell the Prince I was beaten by myself. He\'ll believe it. He always says I would be.',
    ],
    coins: COINS,
  },
];
