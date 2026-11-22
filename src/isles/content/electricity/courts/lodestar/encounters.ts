import type { EncounterDef, GimmickDef } from '../../../../IslesTypes';
import { AURORA } from './gimmicks/aurora';
import { COMPASS_ROSE } from './gimmicks/compassRose';
import { FILINGS_GIMMICK } from './gimmicks/filings';
import { LODESTONE } from './gimmicks/lodestone';
import { POLARITY } from './gimmicks/polarity';

/**
 * The Lodestar Court's five champions — the instrument-folk and iron-folk who keep Prince Polar's
 * crag. Tier 3 of Voltreach (difficulty 4,4,5,5,5). Up the Needle Road from the Dynamo Court you
 * meet Magda at her diggings under the stone, Dr. Anode outside his laboratory, Ferrite in his
 * yard behind the Bellyard, Bearing on the crossroads rose and Borea on her platform by the tarn.
 */

export const LODESTAR_GIMMICKS: GimmickDef[] = [LODESTONE, POLARITY, FILINGS_GIMMICK, COMPASS_ROSE, AURORA];

const COINS = 100;

export const LODESTAR_ENCOUNTERS: EncounterDef[] = [
  {
    id: 'lodestar-lodestone',
    court: 'lodestar',
    name: 'Lodestone',
    foeName: 'Prospector Magda',
    foeElement: 'earth',
    difficulty: 4,
    gimmick: 'lodestar-lodestone',
    at: { x: 1100, y: 1030 },
    look: { body: 0xb89a80, accent: 0x262a3a, hat: 'miner', traits: ['tool', 'satchel', 'scarf'], size: 1.1, eye: 0x8ab4ff },
    challenge: [
      'Forty years I\'ve dug this claim. The stone pays its Draw in ore — a cartload a week, and I cut it.',
      'It breathes, you know. In and out. Get close when it breathes in and it keeps you.',
      'Stand on my plates, stranger. They\'ll go where the stone sends them, and so will you.',
    ],
    beaten: [
      'You read the stone better than I do. Forty years. Hm.',
      'Mind the spokes on your way out. They still remember where they flew.',
    ],
    coins: COINS,
  },
  {
    id: 'lodestar-polarity',
    court: 'lodestar',
    name: 'Polarity',
    foeName: 'Dr. Anode',
    foeElement: 'electricity',
    difficulty: 4,
    gimmick: 'lodestar-polarity',
    at: { x: 1720, y: 620 },
    look: { body: 0xd8c8b8, accent: 0xe0383a, hat: 'goggles', traits: ['glasses', 'book', 'tool'], size: 0.95, eye: 0xa8d8ff },
    challenge: [
      'Ah! A test subject. Hold still — no, don\'t. Move. Movement is data.',
      'The west wall is north, the east wall is south, and you, my friend, are north. For now.',
      'Like repels like. You\'ll find that out against the coils. The Prince funds this, you understand.',
    ],
    beaten: [
      'Fascinating. You flipped at the right moment every time. Were you taking notes? I was.',
      'Off you go. Mind the east wall. Or the west. It depends what you are.',
    ],
    coins: COINS,
  },
  {
    id: 'lodestar-filings',
    court: 'lodestar',
    name: 'Iron Filings',
    foeName: 'Smith Ferrite',
    foeElement: 'metal',
    difficulty: 5,
    gimmick: 'lodestar-filings',
    at: { x: 560, y: 560 },
    look: { body: 0x9a8a7a, accent: 0x34363c, hat: 'none', traits: ['apron', 'beard', 'tool'], size: 1.3, eye: 0xffa040 },
    challenge: [
      'There\'s a bar magnet under my yard as long as a house. I put it there. Took eleven men.',
      'The filings stand up along its lines. Wade a line, you go slow. Stand in one, I shoot down it.',
      'I make the horseshoes for every door on this crag. I know how to make a thing hold.',
    ],
    beaten: [
      'Never stood on a line once. Never. You walk like a compass.',
      'I\'ll be turning that magnet a while. It turns better with the anger out of me.',
    ],
    coins: COINS,
  },
  {
    id: 'lodestar-compass-rose',
    court: 'lodestar',
    name: 'Compass Rose',
    foeName: 'Navigator Bearing',
    foeElement: 'fate',
    difficulty: 5,
    gimmick: 'lodestar-compass-rose',
    at: { x: 1110, y: 1300 },
    look: { body: 0xc8b090, accent: 0xc89a42, hat: 'tricorn', traits: ['scarf', 'glasses', 'satchel'], size: 1.05, eye: 0xf0d48a },
    challenge: [
      'Every road on Voltreach is measured from this rose. I set the needle every dawn. It points where it likes.',
      'It likes iron. Carry some and it will like you. That is not always a kindness.',
      'Fate is just a needle settling, stranger. Let\'s see where it settles.',
    ],
    beaten: [
      'It settled on me. It never settles on me. You put me on the line, didn\'t you. Well navigated.',
      'Take the south road if you want the Halflife. The needle says so. I say so.',
    ],
    coins: COINS,
  },
  {
    id: 'lodestar-aurora',
    court: 'lodestar',
    name: 'Aurora',
    foeName: 'Skywatcher Borea',
    foeElement: 'light',
    difficulty: 5,
    hpMult: 1.05,
    gimmick: 'lodestar-aurora',
    at: { x: 2170, y: 1000 },
    look: { body: 0xe0d8e8, accent: 0x4af0a0, hat: 'antenna', traits: ['book', 'scarf'], size: 1, eye: 0x4af0a0 },
    challenge: [
      'The aurora is the one light up here the Grid can\'t meter. So the Prince had me learn to call it down.',
      'Green wards you. Violet quickens you. Crimson — well. Crimson makes you mean.',
      'They change on a beat, and I can hear the beat. Can you?',
    ],
    beaten: [
      'You heard it. Nobody ever hears it. I almost wish you\'d stay and help me listen.',
      'Go on. I\'ll put the sky back up. It doesn\'t like the floor.',
    ],
    coins: COINS,
  },
];
