import type { EncounterDef, GimmickDef } from '../../../../IslesTypes';
import { BANDSTAND } from './gimmicks/bandstand';
import { HERALD_TRUMPETS } from './gimmicks/heraldTrumpets';
import { MARCHING_BAND } from './gimmicks/marchingBand';
import { SOUSAPHONE } from './gimmicks/sousaphone';
import { TUNING_FORKS } from './gimmicks/tuningForks';

/**
 * The Brass Court's five champions — the band that calls the Score at every Hour. Tier 1 of
 * Choirholm (difficulty 4,4,4,5,5). Up the Parade from Carillon Quay you meet Strut on the
 * drill square, Oompah in the foundry yard, Clarion under the Fanfare Gate, Pitch in the
 * tuning yard by the Bandhall, and Baton at the great bandstand where the Promenade crosses.
 */

export const BRASS_GIMMICKS: GimmickDef[] = [MARCHING_BAND, SOUSAPHONE, HERALD_TRUMPETS, TUNING_FORKS, BANDSTAND];

const COINS = 105;

export const BRASS_ENCOUNTERS: EncounterDef[] = [
  {
    id: 'brass-marching-band',
    court: 'brass',
    name: 'Marching Band',
    foeName: 'Drum-Major Strut',
    foeElement: 'earth',
    difficulty: 4,
    gimmick: 'brass-marching-band',
    at: { x: 560, y: 470 },
    look: { body: 0xd8b494, accent: 0xb8262e, hat: 'bandmaster', traits: ['cane', 'beard'], size: 1.25, eye: 0xf6d878 },
    challenge: [
      'Halt. HALT. You are walking out of step on my square. There is only one step on Choirholm, and it is mine.',
      'Forty years I have marched this band round this square. Nobody has ever broken the column. Nobody.',
      'Fall in, stranger. Left, right. Left, right. Mind the drum.',
    ],
    beaten: [
      'You... broke step. On purpose. And the band went round you like water round a stone.',
      'Band — halt. Stand easy. I... think I shall stand easy too. Just for a bar.',
    ],
    coins: COINS,
  },
  {
    id: 'brass-sousaphone',
    court: 'brass',
    name: 'Sousaphone',
    foeName: 'Tubist Oompah',
    foeElement: 'air',
    difficulty: 4,
    gimmick: 'brass-sousaphone',
    at: { x: 520, y: 1290 },
    look: { body: 0xe0bc98, accent: 0xd8a83a, hat: 'bandmaster', traits: ['apron', 'beard'], size: 1.4, eye: 0xffe2a8 },
    challenge: [
      'Oom. Pah. Oom. Pah. That\'s all the Score lets a tuba say. I have said it beautifully for thirty years.',
      'They test the big horns in this yard before they go up to the bandstands. I\'m the test. Mind the bells.',
      'Lungs like a bellows, me. Stand in front of a horn I\'m blowing and you\'ll be in Carillon by tea.',
    ],
    beaten: [
      'OOM... pah. Phew. You blew me down my own horn. Nobody\'s ever had the wind to do that.',
      'Thirty years of oom-pah. Do you know, I\'ve always wanted to play the tune. Just once.',
    ],
    coins: COINS,
  },
  {
    id: 'brass-herald-trumpets',
    court: 'brass',
    name: 'Herald Trumpets',
    foeName: 'Herald Clarion',
    foeElement: 'light',
    difficulty: 4,
    gimmick: 'brass-herald-trumpets',
    at: { x: 1300, y: 300 },
    look: { body: 0xecd2b0, accent: 0xf8e08a, hat: 'plume', traits: ['scarf'], size: 1.1, eye: 0xfff2b0 },
    challenge: [
      'HEAR YE. I call the Hours from this gate. Matins, Vespers, Compline. Everyone stands when I sound.',
      'My heralds blow where I point them. Today I point them at a stranger who isn\'t standing.',
      'Stand still for the fanfare. It is rude to move during the fanfare.',
    ],
    beaten: [
      'You turned my own heralds round. They\'ve never once looked at me from the front.',
      'Hear ye... no. I don\'t think I shall. Not for a while.',
    ],
    coins: COINS,
  },
  {
    id: 'brass-tuning-forks',
    court: 'brass',
    name: 'Tuning Forks',
    foeName: 'Tuner Pitch',
    foeElement: 'crystal',
    difficulty: 5,
    gimmick: 'brass-tuning-forks',
    at: { x: 2160, y: 650 },
    look: { body: 0xd8dde6, accent: 0x7ab8f0, hat: 'tophat', traits: ['glasses', 'tool', 'book'], size: 1.0, eye: 0xc8e8ff },
    challenge: [
      'Every reed on this terrace is tuned against my forks before it is pinned on a baby\'s collar. Every one.',
      'If a child grows into a voice that doesn\'t match its reed, I hear it. I always hear it. Then the Tuners come.',
      'You, now. You don\'t match anything. Let us find your pitch.',
    ],
    beaten: [
      'Flat. I\'m flat. I\'ve never been flat in my life. It\'s rather... restful.',
      'I shall have to retune the yard. Perhaps I shall tune it a little wrong. Who would know? Only me.',
    ],
    coins: COINS,
  },
  {
    id: 'brass-bandstand',
    court: 'brass',
    name: 'Bandstand',
    foeName: 'Bandleader Baton',
    foeElement: 'fire',
    difficulty: 5,
    hpMult: 1.05,
    gimmick: 'brass-bandstand',
    at: { x: 1330, y: 1040 },
    look: { body: 0xe6c8a6, accent: 0xff9a3a, hat: 'bandmaster', traits: ['glasses', 'scarf'], size: 1.05, eye: 0xffc080 },
    challenge: [
      'This is the Great Bandstand. The Score is played from here before it goes up to every terrace on the isle.',
      'The band plays for whoever holds the stand. It has played for me for twenty-two years, and it will today.',
      'Come up, if you dare. Everyone can see you up here. Everyone can hit you, too.',
    ],
    beaten: [
      'The band played for you. My band. For a stranger with no Part at all. I heard every note.',
      'Take the stand, then. It\'s draughty up here. I never noticed until now.',
    ],
    coins: COINS,
  },
];
