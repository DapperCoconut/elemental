import type { EncounterDef, GimmickDef } from '../../../../IslesTypes';
import { COUNTERSPELL } from './gimmicks/counterspell';
import { FAMILIARS } from './gimmicks/familiars';
import { MANA_FONT } from './gimmicks/manaFont';
import { SUMMONING_CIRCLE } from './gimmicks/summoningCircle';
import { WILD_MAGIC } from './gimmicks/wildMagic';

/**
 * The Arcane Court's five champions — the masters of the Academy who keep its sigils holding the
 * Heliostat's mirrors to the sun. Tier 3 of Solmara (difficulty 5 throughout). In from Meridian
 * Quay you are stopped first by Null at the Sigil Gate; then Fizzle on the stargazers' lawn under
 * the useless observatories, Grimalkin in the familiar market, Evoke at his pentacle on the east
 * road, and Wellspring kneeling at the Mana Font.
 */

export const ARCANE_GIMMICKS: GimmickDef[] = [COUNTERSPELL, FAMILIARS, WILD_MAGIC, SUMMONING_CIRCLE, MANA_FONT];

const COINS = 135;

export const ARCANE_ENCOUNTERS: EncounterDef[] = [
  {
    id: 'arcane-counterspell',
    court: 'arcane',
    name: 'Counterspell',
    foeName: 'Abjurer Null',
    foeElement: 'silence',
    difficulty: 5,
    gimmick: 'arcane-counterspell',
    at: { x: 760, y: 800 },
    look: { body: 0xe4e0d8, accent: 0x262e6e, hat: 'hood', traits: ['book', 'glasses'], size: 1.1, eye: 0xcfe8ff },
    challenge: [
      'Every spell that enters this court passes my gate. I read it, and I decide whether it is permitted.',
      'Yours are loud. Loud spells have shadows in them. I can hear the shadows.',
      'I have written one of your keys over my head. Use it near me and it will mean nothing. Begin.',
    ],
    beaten: [
      'You read my runes faster than I wrote them. Nobody has done that since I was a student.',
      'Pass. I will not say permitted. I will only say pass.',
    ],
    coins: COINS,
  },
  {
    id: 'arcane-familiars',
    court: 'arcane',
    name: 'Familiars',
    foeName: 'Witch Grimalkin',
    foeElement: 'hunt',
    difficulty: 5,
    gimmick: 'arcane-familiars',
    at: { x: 640, y: 1300 },
    look: { body: 0xc8b8a8, accent: 0x4a2e86, hat: 'wizard', traits: ['scarf', 'satchel', 'cane'], size: 0.95, eye: 0xf6dc52 },
    challenge: [
      'Every familiar in that market answers to me before it answers to its buyer. Licensed, you see.',
      'A cat, an owl, a toad. They\'ll go to whoever reaches them. I am old. I am also very quick.',
      'Puss puss puss. Not you. You, stranger, stand still while my owl looks at you.',
    ],
    beaten: [
      'They went to you. Even the toad, and the toad does not like anyone.',
      'Go on. Mind you scratch the cat behind the ears. She earned it.',
    ],
    coins: COINS,
  },
  {
    id: 'arcane-wild-magic',
    court: 'arcane',
    name: 'Wild Magic',
    foeName: 'Surge-Mage Fizzle',
    foeElement: 'quantum',
    difficulty: 5,
    gimmick: 'arcane-wild-magic',
    at: { x: 600, y: 600 },
    look: { body: 0xe8c8b0, accent: 0xa878f8, hat: 'goggles', traits: ['tool', 'satchel', 'bandage'], size: 0.9, eye: 0x6ae88a },
    challenge: [
      'Careful where you stand! Actually, don\'t be careful, it doesn\'t help. Nothing helps. Isn\'t it marvellous?',
      'I was asked to make the mirrors hold steadier. I made the lawn wild instead. Small mistake. Big lawn.',
      'Cast at me! Something will happen! I genuinely do not know what! Neither do you!',
    ],
    beaten: [
      'Oh, that was a good one. Did you see the bolt go sideways? Into the orrery. Again.',
      'Off you go. If you start blinking about unexpectedly, that\'s the lawn. It wears off. Mostly.',
    ],
    coins: COINS,
  },
  {
    id: 'arcane-summoning',
    court: 'arcane',
    name: 'Summoning Circle',
    foeName: 'Conjurer Evoke',
    foeElement: 'fire',
    difficulty: 5,
    gimmick: 'arcane-summoning',
    at: { x: 2060, y: 700 },
    look: { body: 0xd8a888, accent: 0xc83a2a, hat: 'hood', traits: ['brand', 'book'], size: 1.15, eye: 0xffb040 },
    challenge: [
      'Five candles, five points, one circle. Light them all and something answers. Something always answers.',
      'In the old days we summoned at midnight. There is no midnight. So we summon at noon, and it is crosser.',
      'Race me for the points, stranger. Whoever holds the star holds the imp.',
    ],
    beaten: [
      'It answered you. It never answers outsiders. It must have liked you. Don\'t take that as a compliment.',
      'I\'ll relight the candles. It takes a while, at noon. Everything takes a while at noon.',
    ],
    coins: COINS,
  },
  {
    id: 'arcane-mana-font',
    court: 'arcane',
    name: 'Mana Font',
    foeName: 'Font-Keeper Wellspring',
    foeElement: 'water',
    difficulty: 5,
    hpMult: 1.05,
    gimmick: 'arcane-mana-font',
    at: { x: 1460, y: 1200 },
    look: { body: 0xd8e0e8, accent: 0x3aa8d8, hat: 'veil', traits: ['rod', 'scarf'], size: 1.05, eye: 0xb8f4ff },
    challenge: [
      'The Font is a spring of liquid light. The Despot drinks from it through a pipe nine miles long.',
      'I keep it from overflowing. When I tap the springs, they rise. When they rise too far, they burst.',
      'Drink if you like. Everyone who drinks thinks they know when to stop. Let\'s find out.',
    ],
    beaten: [
      'You stepped out at the right moment. Every time. You\'d make a good Keeper. Don\'t.',
      'Go on. The springs will settle. They always settle, for a while.',
    ],
    coins: COINS,
  },
];
