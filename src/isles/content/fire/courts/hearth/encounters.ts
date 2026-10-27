import type { EncounterDef, GimmickDef } from '../../../../IslesTypes';
import { EMBER_TITHE } from './gimmicks/emberTithe';
import { SOOT_SEASON } from './gimmicks/sootSeason';
import { THREE_BRANDS } from './gimmicks/threeBrands';
import { CURFEW } from './gimmicks/curfew';
import { KEEPER_OF_THE_HEARTH } from './gimmicks/keeperOfTheHearth';

/**
 * The Hearth Court's five champions — the Prince's tithe-officers, each guarding a stretch of
 * the terraces. Tier 1: the gentlest fights on the isle (difficulty 1,1,2,2,2), placed so a
 * player climbing from Emberport meets them roughly in order: the square, the cross street west
 * and east, the lamp lane, and the Great Hearth before the manor.
 */

export const HEARTH_GIMMICKS: GimmickDef[] = [EMBER_TITHE, SOOT_SEASON, THREE_BRANDS, CURFEW, KEEPER_OF_THE_HEARTH];

export const HEARTH_ENCOUNTERS: EncounterDef[] = [
  {
    id: 'hearth-ember-tithe',
    court: 'hearth',
    name: 'Ember Tithe',
    foeName: 'Tithe-Taker Brask',
    foeElement: 'fire',
    difficulty: 1,
    gimmick: 'hearth-ember-tithe',
    at: { x: 880, y: 1300 },
    look: { body: 0xd89a6e, accent: 0x5a1f12, hat: 'tricorn', traits: ['satchel', 'brand', 'beard'], size: 1.2 },
    challenge: [
      'You. Unbranded. Off the boat. No hearth, no tithe paid, no name in Varnaby\'s book.',
      'Here\'s how the tithe works. The fire throws embers. I take them. You pay. Simple.',
      'Want to argue? Grab a coal before I do. Nobody ever does.',
    ],
    beaten: [
      'You... out-tithed the tithe-taker. I\'ll be the talk of the square. Badly.',
      'Keep the embers. I\'ve got thirty houses left to count and my pockets are lighter for it.',
    ],
    coins: 30,
  },
  {
    id: 'hearth-soot-season',
    court: 'hearth',
    name: 'Soot Season',
    foeName: 'Sweep-Captain Mottle',
    foeElement: 'air',
    difficulty: 1,
    gimmick: 'hearth-soot-season',
    at: { x: 760, y: 880 },
    look: { body: 0x9a8a80, accent: 0x1d1a19, hat: 'tophat', traits: ['scarf', 'tool', 'pipe'], size: 1.05 },
    challenge: [
      'Soot season, friend. Every flue on the terrace coughing at once. Lovely.',
      'I\'ve swept a thousand chimneys. I know which way soot falls. Mostly onto other people.',
      'Breathe deep. It\'s the last clean breath you\'ll get.',
    ],
    beaten: [
      '*cough* Fair. Fair. You read the wind better than my boys do.',
      'Tell young Pim I\'ve paid him. Tell him I didn\'t mean it about the brushes. Mostly.',
    ],
    coins: 30,
  },
  {
    id: 'hearth-three-brands',
    court: 'hearth',
    name: 'Three Brands',
    foeName: 'Brandwright Ostra',
    foeElement: 'metal',
    difficulty: 2,
    gimmick: 'hearth-three-brands',
    at: { x: 2000, y: 880 },
    look: { body: 0xb87a56, accent: 0x3a2a22, hat: 'goggles', traits: ['apron', 'tool', 'brand'], size: 1.15 },
    challenge: [
      'I make the King\'s irons. Every brand in this town came off my anvil. Every one.',
      'One brand marks you. Two shame you. Three, and the brand finishes the job itself.',
      'There\'s water by the walls. You\'ll want it.',
    ],
    beaten: [
      'You turned my own iron on me. Hessa always said I\'d meet someone who would.',
      'I\'m going to go and stand in that trough for a long while and think about my life.',
    ],
    coins: 30,
  },
  {
    id: 'hearth-curfew',
    court: 'hearth',
    name: 'Curfew',
    foeName: 'Lamplighter Fenn',
    foeElement: 'light',
    difficulty: 2,
    gimmick: 'hearth-curfew',
    at: { x: 300, y: 488 },
    look: { body: 0xe0c8a8, accent: 0x2e3440, hat: 'cap', traits: ['lantern', 'scarf'], size: 0.95, eye: 0xffe08a },
    challenge: [
      'Curfew. Lamps out, so the watch can see which windows are dark. Which hearths went cold.',
      'I\'ve put out ten thousand lamps. I can do it with my eyes shut. Can you fight with yours?',
    ],
    beaten: [
      'You kept relighting them. Every single one. Do you know how annoying that is?',
      '...Go on, then. Leave them lit tonight. I\'ll say the wind did it.',
    ],
    coins: 30,
  },
  {
    id: 'hearth-keeper',
    court: 'hearth',
    name: 'Keeper of the Hearth',
    foeName: 'Hearthwarden Gilda',
    foeElement: 'earth',
    difficulty: 2,
    hpMult: 1.1,
    gimmick: 'hearth-keeper',
    at: { x: 900, y: 420 },
    look: { body: 0x9c8070, accent: 0x5d5853, hat: 'helmet', traits: ['apron', 'beard', 'brand'], size: 1.35 },
    challenge: [
      'This is the Great Hearth. First fire the King ever ordered kept. It has never gone out.',
      'I keep its ring. The ring keeps me. Stand on it if you can. It flares on the hour. And on the minute.',
      'Prince Kindle is behind me. You are in front of me. That is the order of things.',
    ],
    beaten: [
      'The hearth fed you, not me. It has never done that before. It knows something I don\'t.',
      'Go up, then. Tell the Prince the Hearthwarden says the fire chose. He\'ll understand.',
    ],
    coins: 30,
  },
];
