import type { EncounterDef, GimmickDef } from '../../../../IslesTypes';
import { BALLOON_WORKS } from './gimmicks/balloonWorks';
import { RUBBER_BAND } from './gimmicks/rubberBand';
import { SUPERBALL } from './gimmicks/superball';
import { TRAMPOLINE_SQUARE } from './gimmicks/trampoline';
import { VULCANIZE } from './gimmicks/vulcanize';

/**
 * The Bounce Court's five champions — Prince Sprocket's playmates, who keep the rubber town
 * bouncing for him. Tier 2 of Voltreach (difficulty 3,4,4,4,5). Pippa throws herself off the
 * trampolines in the square, Elastica works the Stretching Walk, Puff blows gasbags on Gasbag
 * Row, Sulph tends the curing vat at the works, and Ricochet holds the Ball Court.
 */

export const BOUNCE_GIMMICKS: GimmickDef[] = [TRAMPOLINE_SQUARE, RUBBER_BAND, BALLOON_WORKS, VULCANIZE, SUPERBALL];

const COINS = 90;

export const BOUNCE_ENCOUNTERS: EncounterDef[] = [
  {
    id: 'bounce-trampoline',
    court: 'bounce',
    name: 'Trampoline Square',
    foeName: 'Acrobat Pippa',
    foeElement: 'air',
    difficulty: 3,
    gimmick: 'bounce-trampoline',
    at: { x: 1200, y: 965 },
    look: { body: 0xf0d0b8, accent: 0x3a8ae0, hat: 'propeller', traits: ['scarf'], size: 0.9, eye: 0x9ad8ff },
    challenge: [
      'His Highness likes to watch people bounce. So I bounce. Twelve hours a day, off the square, for him.',
      'If I come down wrong I break something. I have never come down wrong. Not once. Not in nine years.',
      'Get on a canvas, stranger. Up you go. Mind where I land.',
    ],
    beaten: [
      'You came down right. Every time. Nobody comes down right but me.',
      'I think I\'ll sit for a bit. On the ground. It doesn\'t move. It\'s lovely.',
    ],
    coins: COINS,
  },
  {
    id: 'bounce-rubber-band',
    court: 'bounce',
    name: 'Rubber Band',
    foeName: 'Slinger Elastica',
    foeElement: 'bind',
    difficulty: 4,
    gimmick: 'bounce-rubber-band',
    at: { x: 380, y: 822 },
    look: { body: 0xd8b49a, accent: 0xd8a85a, hat: 'bandana', traits: ['tool', 'apron'], size: 1.1, eye: 0xf4c832 },
    challenge: [
      'Every skein in the town was stretched on this walk first. I test them. Pull till they sing, then pull more.',
      'A band remembers where it started. Stretch it far enough and it goes back there, with you in it.',
      'Hold on to something, if you can find something. I always find something.',
    ],
    beaten: [
      'You held the post. Clever. Most people let go of the post. Most people run.',
      'Go on. I have a skein to test. It\'ll snap. They all snap, in the end.',
    ],
    coins: COINS,
  },
  {
    id: 'bounce-balloon-works',
    court: 'bounce',
    name: 'Balloon Works',
    foeName: 'Balloonist Puff',
    foeElement: 'gum',
    difficulty: 4,
    gimmick: 'bounce-balloon-works',
    at: { x: 1760, y: 1100 },
    look: { body: 0xf0c8c0, accent: 0xf07ab0, hat: 'beanie', traits: ['satchel', 'scarf'], size: 1.2, eye: 0xffb0d8 },
    challenge: [
      'Every float on the Grid is a gasbag I blew. Thousands. My cheeks are the strongest muscle on Voltreach.',
      'Some I fill with air. Some with tacks, for the Linemen\'s little shooting practice. Some with gum.',
      'Pop! Pop pop pop. Stand closer, stranger. That\'s it.',
    ],
    beaten: [
      'You popped them all the right way out. Oh, I could hug you. I won\'t. You\'d pop.',
      'Have a balloon. Unlicensed. Hide it up your sleeve.',
    ],
    coins: COINS,
  },
  {
    id: 'bounce-vulcanize',
    court: 'bounce',
    name: 'Vulcanize',
    foeName: 'Curer Sulph',
    foeElement: 'magma',
    difficulty: 4,
    hpMult: 1.05,
    gimmick: 'bounce-vulcanize',
    at: { x: 720, y: 640 },
    look: { body: 0xb88a6a, accent: 0xe6d23a, hat: 'goggles', traits: ['apron', 'tool', 'beard'], size: 1.3, eye: 0xffc070 },
    challenge: [
      'Only licensed fire on the isle, this. I keep it. Sulphur and heat, and milk goes in and rubber comes out.',
      'Every cable on the Grid wears my rubber jacket. Without me the storm walks down the wires into your bed.',
      'Mind your boots on my floor. Everything you walk on, sets.',
    ],
    beaten: [
      'Cured, me. Hard as a tyre and twice as tired.',
      'Gussie\'ll have a bowl going at the back. Tell her I sent you. Don\'t tell her I lost.',
    ],
    coins: COINS,
  },
  {
    id: 'bounce-superball',
    court: 'bounce',
    name: 'Superball',
    foeName: 'Pitcher Ricochet',
    foeElement: 'gravity',
    difficulty: 5,
    hpMult: 1.08,
    gimmick: 'bounce-superball',
    at: { x: 1200, y: 1320 },
    look: { body: 0xc8a888, accent: 0x9a5ad8, hat: 'cap', traits: ['glasses', 'satchel'], size: 1.15, eye: 0xd0b0ff },
    challenge: [
      'Play is by licence, on the half hour. You don\'t have a licence. You don\'t have a half hour.',
      'I was the best player this court ever had. His Highness made me Pitcher. Now I keep the balls.',
      'One ball. Faster off every wall. Let\'s see your angles.',
    ],
    beaten: [
      'Three walls and into me. I taught a boy that shot once. Before the licences.',
      'Here. Take a ball. I\'m sick of keeping them.',
    ],
    coins: COINS,
  },
];
