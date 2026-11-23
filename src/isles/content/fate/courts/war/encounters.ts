import type { EncounterDef, GimmickDef } from '../../../../IslesTypes';
import { CONSCRIPTION } from './gimmicks/conscription';
import { SIEGE_LINE } from './gimmicks/siegeLine';
import { THE_STANDARD } from './gimmicks/standard';
import { TILT_YARD } from './gimmicks/tiltYard';
import { FOG_OF_WAR } from './gimmicks/fogOfWar';

/**
 * The War Court's five champions — the drill-masters of Prince Banneret's mustering ground. Tier
 * 4 of Lotterhaven (difficulty 5 across the board). Up from the Card Court you meet Sergeant
 * Draft at the Drafting Wheel, Pennon on the parade ground, Lance in the tilt yard, the Engineer
 * among his engines in the siege park, and Feint by the map tent beyond the trench line.
 */

export const WAR_GIMMICKS: GimmickDef[] = [CONSCRIPTION, SIEGE_LINE, THE_STANDARD, TILT_YARD, FOG_OF_WAR];

const COINS = 135;

export const WAR_ENCOUNTERS: EncounterDef[] = [
  {
    id: 'war-conscription',
    court: 'war',
    name: 'Conscription',
    foeName: 'Sergeant Draft',
    foeElement: 'fire',
    difficulty: 5,
    gimmick: 'war-conscription',
    at: { x: 1290, y: 1250 },
    look: { body: 0xc89a78, accent: 0xb8222e, hat: 'shako', traits: ['beard', 'book'], size: 1.25, eye: 0xffb060 },
    challenge: [
      'Stand up straight. I can\'t read your Lot if you slouch. …No Lot? Then you\'re nobody\'s number.',
      'I turn the Wheel every Sunday. Every Sunday it gives me boys. I never ask the Wheel how it chooses.',
      'Let\'s see whose side it drafts today, stranger. It has never once drafted against me.',
    ],
    beaten: [
      'It called red. Three times running. The Wheel has never called red three times for anyone.',
      'Go on, then. I\'ve a roll to read, and for once I don\'t much like the names on it.',
    ],
    coins: COINS,
  },
  {
    id: 'war-siege-line',
    court: 'war',
    name: 'Siege Line',
    foeName: 'Engineer Trebuchet',
    foeElement: 'gunpowder',
    difficulty: 5,
    gimmick: 'war-siege-line',
    at: { x: 1930, y: 1560 },
    look: { body: 0xb8906c, accent: 0x9a6a34, hat: 'goggles', traits: ['tool', 'satchel', 'glasses'], size: 1.1, eye: 0xffd890 },
    challenge: [
      'Do you know what range is? Range is the only honest thing in the world. A stone goes where it goes.',
      'My engines throw at whoever stands farthest off. Cowards stand far off. It\'s a moral machine, really.',
      'Mind the craters. I dug most of this hill with those two, a stone at a time.',
    ],
    beaten: [
      'Hm. You stood close. Nobody stands close to a trebuchet. You\'ve got the instincts of a counterweight.',
      'Off you go. I need to fill in my holes before the parade.',
    ],
    coins: COINS,
  },
  {
    id: 'war-standard',
    court: 'war',
    name: 'The Standard',
    foeName: 'Standard-Bearer Pennon',
    foeElement: 'light',
    difficulty: 5,
    gimmick: 'war-standard',
    at: { x: 600, y: 960 },
    look: { body: 0xe0c0a0, accent: 0xd8a83a, hat: 'plume', traits: ['scarf'], size: 1, eye: 0xfff0a0 },
    challenge: [
      'Where the standard stands, the court stands. I have carried it since I was nine. Nobody else is let.',
      'Hold the ground beside it and your arm is twice an arm. That\'s not magic. That\'s pride. Mostly.',
      'Knock it down if you can. It\'ll stand again where it falls. It always does. So do I.',
    ],
    beaten: [
      'It fell and it stood and it fell. And you were beside it every time. That\'s… that\'s my job.',
      'I\'ll carry it back to the pavilion. Slowly. My arms are very tired, suddenly.',
    ],
    coins: COINS,
  },
  {
    id: 'war-tilt-yard',
    court: 'war',
    name: 'Tilt Yard',
    foeName: 'Jouster Lance',
    foeElement: 'hunt',
    difficulty: 5,
    gimmick: 'war-tilt-yard',
    at: { x: 1880, y: 1080 },
    look: { body: 0xc8a888, accent: 0x2a2632, hat: 'helmet', traits: ['scarf', 'bandage'], size: 1.2, eye: 0xff7a5a },
    challenge: [
      'The tilt runs on the beat of the drum. Horse after horse, lance after lance. The lanes don\'t care who.',
      'I\'ve unhorsed every champion the Prince ever drew. Forty-one. Nutmeg did most of the work.',
      'Get on the rail if you dare. Or stand in a lane and find out what a charger weighs.',
    ],
    beaten: [
      'Unhorsed. Me. On my own rail. The grandstand is very quiet.',
      'Tell Maud the mare can rest. Tell her I said so. I\'ll want that in writing, mind.',
    ],
    coins: COINS,
  },
  {
    id: 'war-fog-of-war',
    court: 'war',
    name: 'Fog of War',
    foeName: 'Scout Feint',
    foeElement: 'illusion',
    difficulty: 5,
    gimmick: 'war-fog-of-war',
    at: { x: 1700, y: 520 },
    look: { body: 0xb8a898, accent: 0x6a50a0, hat: 'hood', traits: ['lantern', 'mask'], size: 0.95, eye: 0xc8b0ff },
    challenge: [
      'You\'ve walked past me four times this morning. Once I was a sandbag. Once I was your own shadow.',
      'The map table says where everyone is. The map table is mine. I put the chips where I like.',
      'We\'ll do this in the fog. Find me if you can. The lanterns sometimes help. Sometimes.',
    ],
    beaten: [
      'Found. Properly found, in the light. I\'d forgotten what that feels like.',
      'I\'ll move my own chip on the table, then. To "beaten". There isn\'t a square for it. I\'ll draw one.',
    ],
    coins: COINS,
  },
];
