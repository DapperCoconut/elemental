import type { EncounterDef, GimmickDef } from '../../../../IslesTypes';
import { AUTOMATON } from './gimmicks/automaton';
import { LOGIC_GATES } from './gimmicks/logicGates';
import { MEMORY_LEAK } from './gimmicks/memoryLeak';
import { PUNCH_CARDS } from './gimmicks/punchCards';
import { TRACES } from './gimmicks/traces';

/**
 * The Circuit Court's five champions — the clerks and craftsmen who keep Prince Byte's reckoning
 * machine of a town running. Tier 2 of Voltreach (difficulty 3,4,4,4,5). Coming in off the bus
 * from the Dynamo you meet Solde at her etchery, Gearlock at the windery, Nand at her gate-lodge on
 * the Junction, Hollerith on the mill floor and, out at the west end, Rom in the Core Store.
 */

export const CIRCUIT_GIMMICKS: GimmickDef[] = [TRACES, LOGIC_GATES, PUNCH_CARDS, AUTOMATON, MEMORY_LEAK];

const COINS = 90;

export const CIRCUIT_ENCOUNTERS: EncounterDef[] = [
  {
    id: 'circuit-traces',
    court: 'circuit',
    name: 'Traces',
    foeName: 'Etcher Solde',
    foeElement: 'fire',
    difficulty: 3,
    gimmick: 'circuit-traces',
    at: { x: 1700, y: 900 },
    look: { body: 0xc89a7a, accent: 0xc8763a, hat: 'goggles', traits: ['apron', 'tool', 'scarf'], size: 1.05, eye: 0xffa63a },
    challenge: [
      'Mind the bath, it eats copper and it\'ll eat you. Every street in this court came out of my trays.',
      'My iron\'s the only flame the Grid lets burn on Voltreach. Licensed. Metered. I like it that way.',
      'Stand on my test board, stranger. Let\'s see if you conduct.',
    ],
    beaten: [
      'Insulated, are you? Lucky. Most folk light up like a filament.',
      'Go on through. And don\'t touch the bath. I mean it this time.',
    ],
    coins: COINS,
  },
  {
    id: 'circuit-logic-gates',
    court: 'circuit',
    name: 'Logic Gates',
    foeName: 'Gatekeeper Nand',
    foeElement: 'justice',
    difficulty: 4,
    gimmick: 'circuit-logic-gates',
    at: { x: 1060, y: 700 },
    look: { body: 0xb8b0a8, accent: 0x4a5058, hat: 'tophat', traits: ['book', 'glasses', 'cane'], size: 1.1, eye: 0x5aff8a },
    challenge: [
      'Not-and. That is my name and my whole philosophy. True, unless everything is.',
      'Every apprentice in the court learns their gates in my yard, and the turret is very patient with them.',
      'It shoots whoever is shut in with it. Me included. The law is the law, stranger. Step in.',
    ],
    beaten: [
      'You held the plate and let the logic do the work. Textbook. I shall have to write a new textbook.',
      'Output false. You may pass.',
    ],
    coins: COINS,
  },
  {
    id: 'circuit-punch-cards',
    court: 'circuit',
    name: 'Punch Cards',
    foeName: 'Clerk Hollerith',
    foeElement: 'paper',
    difficulty: 4,
    gimmick: 'circuit-punch-cards',
    at: { x: 700, y: 1300 },
    look: { body: 0xe0ccb0, accent: 0xe8d8b0, hat: 'cap', traits: ['satchel', 'glasses'], size: 0.95, eye: 0xb85a4a },
    challenge: [
      'Ten thousand cards a night through that mill. One per household. Every hole a kilowatt owed.',
      'The cards don\'t care who they cut. I ride the holes. Forty years and not a scratch on me. Well. Few.',
      'You\'re not on any card. That\'s irregular. Let\'s feed you through and see what reads.',
    ],
    beaten: [
      'You read the holes like a clerk. Have you worked the mill? No? You should. It\'s steady.',
      'I won\'t log this. I\'ll say the reader jammed. It does.',
    ],
    coins: COINS,
  },
  {
    id: 'circuit-automaton',
    court: 'circuit',
    name: 'Automaton',
    foeName: 'Tinker Gearlock',
    foeElement: 'creation',
    difficulty: 4,
    gimmick: 'circuit-automaton',
    at: { x: 1960, y: 660 },
    look: { body: 0xd0a888, accent: 0xc89a40, hat: 'goggles', traits: ['apron', 'tool', 'beard', 'pack'], size: 1.2, eye: 0xf0cc80 },
    challenge: [
      'Every automaton in the court came off my bench. They crank the Draw for households that can\'t.',
      'For a fee. Metered. A wound key\'s a wound key. They don\'t ask who\'s paying.',
      'Mind which end you touch. The front end punches.',
    ],
    beaten: [
      'You wound my own works against me. That\'s… that\'s rather beautiful, actually.',
      'Go on. I need to have a word with the stand about loyalty.',
    ],
    coins: COINS,
  },
  {
    id: 'circuit-memory-leak',
    court: 'circuit',
    name: 'Memory Leak',
    foeName: 'Archivist Rom',
    foeElement: 'memory',
    difficulty: 5,
    hpMult: 1.05,
    gimmick: 'circuit-memory-leak',
    at: { x: 330, y: 790 },
    look: { body: 0xc8b8c8, accent: 0x8a4ac0, hat: 'hood', traits: ['book', 'glasses', 'lantern'], size: 1, eye: 0xc87aff },
    challenge: [
      'Every Draw ever reckoned is in these rings. Every short. Every switch-off. Every name the Prince won\'t say.',
      'The store leaks, stranger. Strike a blow in here and it strikes again, a breath later. Mine too.',
      'Shall we see who remembers better?',
    ],
    beaten: [
      'Wiped. You kept wiping me. Do you know how long it\'s been since anyone made me forget anything?',
      'I\'ll keep this one, I think. You beating me. It\'s a nice thing to remember.',
    ],
    coins: COINS,
  },
];
