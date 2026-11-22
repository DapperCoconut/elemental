import type { EncounterDef, GimmickDef } from '../../../../IslesTypes';
import { EPITAPHS } from './gimmicks/epitaphs';
import { FUNERAL } from './gimmicks/funeral';
import { LAST_BREATH } from './gimmicks/lastBreath';
import { OPEN_GRAVES } from './gimmicks/openGraves';
import { SAFETY_BELLS } from './gimmicks/safetyBells';

/**
 * The Grave Court's five champions — the people who bury Fangmire's passed-over for Prince Mortis.
 * Tier 4 of the isle (difficulty 5 across the board). Up the Carrying Road from the lych-gate you
 * meet Dirge walking a coffin in; Barrow is in his digger's yard to the west, Toll among his bells
 * to the east, and on the Lych Walk beyond the pool Elegy cuts stones in the north-west while Pale
 * waits at his parlour in the north-east.
 */

export const GRAVE_GIMMICKS: GimmickDef[] = [OPEN_GRAVES, SAFETY_BELLS, FUNERAL, EPITAPHS, LAST_BREATH];

const COINS = 125;

export const GRAVE_ENCOUNTERS: EncounterDef[] = [
  {
    id: 'grave-open-graves',
    court: 'grave',
    name: 'Open Graves',
    foeName: 'Digger Barrow',
    foeElement: 'gluttony',
    difficulty: 5,
    gimmick: 'grave-open-graves',
    at: { x: 560, y: 1250 },
    look: { body: 0x8a7a64, accent: 0x4a3524, hat: 'cap', traits: ['tool', 'beard', 'apron'], size: 1.3, eye: 0xc9b08a },
    challenge: [
      'Twelve holes a day, the Prince wants. Twelve. The peat fills six back in by morning. I dig them again.',
      'I don\'t ask who they\'re for. The cart comes, the hole\'s ready, that\'s my whole religion.',
      'You\'re stood on a good spot. Deep peat. Stay there a moment and I\'ll make it thirteen.',
    ],
    beaten: [
      'Down my own hole. Earth in my ears. Well — I always said I\'d know the bottom of this yard.',
      'Go on. I\'ve twelve to dig and I\'m one behind.',
    ],
    coins: COINS,
  },
  {
    id: 'grave-safety-bells',
    court: 'grave',
    name: 'Safety Bells',
    foeName: 'Sexton Toll',
    foeElement: 'radiation',
    difficulty: 5,
    gimmick: 'grave-safety-bells',
    at: { x: 1900, y: 1250 },
    look: { body: 0x9ba1a6, accent: 0x9ae04a, hat: 'plague', traits: ['lantern', 'cane'], size: 1.05, eye: 0xb8f0d8 },
    challenge: [
      'Every bell in my field has a cord, and every cord goes down to a hand. Most nights they hang still.',
      'Not every night. The greyed don\'t always finish greying before the cart comes. I listen. I do listen.',
      'Then I go and stand by the post until it stops. That is the job. Shall I show you how it\'s done?',
    ],
    beaten: [
      'You let them ring. You let them come up. Nobody\'s let them come up in nine years.',
      'I\'ll... I\'ll leave the field unmuffled tonight. Just tonight. See who rings.',
    ],
    coins: COINS,
  },
  {
    id: 'grave-funeral',
    court: 'grave',
    name: 'Funeral',
    foeName: 'Mourner Dirge',
    foeElement: 'passion',
    difficulty: 5,
    gimmick: 'grave-funeral',
    at: { x: 1200, y: 1400 },
    look: { body: 0x2e2a34, accent: 0xc23a5a, hat: 'veil', traits: ['scarf'], size: 1, eye: 0xf07a96 },
    challenge: [
      'I keen for a living. A dose a funeral, from the Prince. Six funerals a week keeps a family\'s Mark quiet.',
      'I weep at every one. Real tears, every time. Do you know how hard that is, after forty years? It isn\'t.',
      'Make way for the dead, stranger. Or walk with them. My bearers don\'t mind which.',
    ],
    beaten: [
      'Oh. Oh, that\'s the first time in years I\'ve cried for myself. It\'s just the same.',
      'Take the petals. The dead don\'t need them. Nobody ever told the dead they were allowed to need things.',
    ],
    coins: COINS,
  },
  {
    id: 'grave-epitaphs',
    court: 'grave',
    name: 'Epitaphs',
    foeName: 'Stonecutter Elegy',
    foeElement: 'sand',
    difficulty: 5,
    gimmick: 'grave-epitaphs',
    at: { x: 500, y: 640 },
    look: { body: 0xb8b2a0, accent: 0xd8c28a, hat: 'headwrap', traits: ['tool', 'glasses', 'apron'], size: 0.95, eye: 0xe2b462 },
    challenge: [
      'The stone goes up the day a house is passed over. Not the day they die. Saves time. Everyone knows the date.',
      'I\'ve cut the dates for forty families this moon. I cut them deep. I find it helps them stop hoping.',
      'Yours is half done. Shall I finish it? Mind your feet — the stones here count down.',
    ],
    beaten: [
      'You recut my numbers. Every one, back to the top. That\'s... that\'s not how the stone works.',
      'Maybe it is. Go on. I\'ve a lot of dates to chisel off.',
    ],
    coins: COINS,
  },
  {
    id: 'grave-last-breath',
    court: 'grave',
    name: 'Last Breath',
    foeName: 'Undertaker Pale',
    foeElement: 'soul',
    difficulty: 5,
    gimmick: 'grave-last-breath',
    at: { x: 2060, y: 640 },
    look: { body: 0xd6d4dc, accent: 0x17151b, hat: 'tophat', traits: ['cane', 'scarf'], size: 1.15, eye: 0xb8f0d8 },
    challenge: [
      'I have laid out eleven thousand of the greyed. I have seen what steps out of them. It is very polite.',
      'It stands a pace behind and waits. If you are kind, you walk it back in. I was told not to be kind.',
      'Below half, stranger, and you\'ll see yours. Do keep an eye on it. My coffin is always open.',
    ],
    beaten: [
      'You went back for it. Every time. Most people don\'t think to.',
      'I shall leave the lid up tonight. Somebody may want to come home.',
    ],
    coins: COINS,
  },
];
