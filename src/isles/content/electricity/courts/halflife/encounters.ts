import type { EncounterDef, GimmickDef } from '../../../../IslesTypes';
import { CHAIN_REACTION } from './gimmicks/chainReaction';
import { GEIGER } from './gimmicks/geiger';
import { HALF_LIFE } from './gimmicks/halfLife';
import { LEAD_SHIELD } from './gimmicks/leadShield';
import { MUTATION } from './gimmicks/mutation';

/**
 * The Halflife Court's five champions — the people who keep Prince Isotope's town glowing. Tier 3
 * of Voltreach (difficulty 4,4,5,5,5). In from the Terminus road you meet Click at the pit rim,
 * Curie at the Rod Store below the dome, Uran in the cask yard on the east lane, Galena at the
 * Plumbery at the end of Leadrow, and Glow among the fungus beds of the Glowcap Gardens.
 */

export const HALFLIFE_GIMMICKS: GimmickDef[] = [HALF_LIFE, GEIGER, CHAIN_REACTION, LEAD_SHIELD, MUTATION];

const COINS = 105;

export const HALFLIFE_ENCOUNTERS: EncounterDef[] = [
  {
    id: 'halflife-half-life',
    court: 'halflife',
    name: 'Half-Life',
    foeName: 'Decayer Curie',
    foeElement: 'death',
    difficulty: 4,
    gimmick: 'halflife-half-life',
    at: { x: 1480, y: 690 },
    look: { body: 0xd0c8b8, accent: 0x7dff5a, hat: 'hazmat', traits: ['apron', 'tool'], size: 1.05, eye: 0xd8ffb0 },
    challenge: [
      'I rack the rods. Fresh in at dawn, spent out by dusk. Everything in that store is dying on a timetable.',
      'Half its reach every four seconds. You can set a clock by it. Mabel does.',
      'Pick one up if you like. It will love you for exactly as long as it takes to kill you.',
    ],
    beaten: [
      'You threw them while they were fresh. Most people hold on too long. Hope is a slow poison, stranger.',
      'Go on. I have racking to do. Everything is still dying, just a little slower.',
    ],
    coins: COINS,
  },
  {
    id: 'halflife-geiger',
    court: 'halflife',
    name: 'Geiger Counter',
    foeName: 'Counter Click',
    foeElement: 'sound',
    difficulty: 4,
    gimmick: 'halflife-geiger',
    at: { x: 560, y: 640 },
    look: { body: 0xc8b8a0, accent: 0xffb02a, hat: 'antenna', traits: ['satchel', 'glasses'], size: 0.95, eye: 0xffe08a },
    challenge: [
      'Hear that? Tk. Tk-tk. That\'s you. You\'re warm. You came up the Terminus road and you\'re warm.',
      'I read every badge at the pit-head. Hot goes on the board. Hot is short. Short is switched off.',
      'I know every hot spot in this yard by ear. Let\'s see how you dance without ears.',
    ],
    beaten: [
      'Tk… tk… you followed my feet. Nobody ever watches my feet. They watch the counter.',
      'Fine. You read cold. Today. Get out of my yard.',
    ],
    coins: COINS,
  },
  {
    id: 'halflife-chain-reaction',
    court: 'halflife',
    name: 'Chain Reaction',
    foeName: 'Fissioner Uran',
    foeElement: 'plasma',
    difficulty: 5,
    gimmick: 'halflife-chain-reaction',
    at: { x: 2130, y: 780 },
    look: { body: 0xd8ccb8, accent: 0x3fb8ff, hat: 'goggles', traits: ['apron', 'glasses'], size: 1.1, eye: 0xb8ecff },
    challenge: [
      'One neutron. One pellet. Two neutrons. Four. Eight. That is how the dome feeds the Grid. And me.',
      'His Highness lets me play with the spare pellets out here. I am very careful. Mostly.',
      'Count them with me. When we get to ten, step lively.',
    ],
    beaten: [
      'You soaked them up. With your body. That\'s… exactly what lead is for, actually. You\'re very lead.',
      'I\'ll sweep the pellets. Mind your feet on the way out. Some of them are still warm.',
    ],
    coins: COINS,
  },
  {
    id: 'halflife-lead-shield',
    court: 'halflife',
    name: 'Lead Shield',
    foeName: 'Plumber Galena',
    foeElement: 'crystal',
    difficulty: 5,
    hpMult: 1.05,
    gimmick: 'halflife-lead-shield',
    at: { x: 1000, y: 1170 },
    look: { body: 0xc4b8a8, accent: 0x5e6670, hat: 'cap', traits: ['apron', 'tool', 'beard'], size: 1.25, eye: 0x8a93a0 },
    challenge: [
      'Every sheet of lead in Halflife went through my rolls. Every roof. Every apron. And I take it back.',
      'When the Tally says recall, I go up the ladder with my bar. I strip them. I bring the lead home.',
      'The yard vent\'s on. Find a screen and keep it. I\'ll be taking that back too.',
    ],
    beaten: [
      'You kept your screen and took mine. That\'s plumbing. You\'d make a plumber.',
      'I\'ve a cart of recalled lead out back. I might… lose it. Down Leadrow. Off the back of the cart.',
    ],
    coins: COINS,
  },
  {
    id: 'halflife-mutation',
    court: 'halflife',
    name: 'Mutation',
    foeName: 'Botanist Glow',
    foeElement: 'growth',
    difficulty: 5,
    gimmick: 'halflife-mutation',
    at: { x: 1180, y: 1380 },
    look: { body: 0xd8e0c8, accent: 0x4affc8, hat: 'mushroom', traits: ['satchel', 'book'], size: 0.9, eye: 0x4affc8 },
    challenge: [
      'The caps feed the town. They grow on what the reactor leaves. They grow strange. I like strange.',
      'Breathe deep. The spores are rising. You\'ll be something else in a moment. So will I.',
      'There\'s a bloom in the bed that chooses. Beat me to it. I\'ve had a lot of practice.',
    ],
    beaten: [
      'Selected! You were selected. Do you know how rare that is? I\'m going to write you up.',
      'Off you go. If anything grows on you later, come back. I\'ll want a cutting.',
    ],
    coins: COINS,
  },
];
