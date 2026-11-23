import type { FallenBundle } from '../../../../../IslesTypes';
import { fallenId } from '../../../../meteor/spec';
import { ARREARS } from './arrears';
import { DARK_DOORS } from './darkDoors';
import { LONGLINE } from './longline';
import { STAIR } from './stair';
import { SKIN } from './skin';

/**
 * The Abyssal Court's Fallen Five — the people of the trench city whom the King's telling puts
 * on Prince Lanternjaw's side: the Breathworks clerk who turned the valves down, the lamplighter
 * who kept the list of dark doors, the trench fisher who was paid in hooks, the warden who
 * walked the families down the maelstrom stair, and the sealwright who waxed shut the houses
 * the Queen took. Ember-gold eyes; double the court's coins.
 */
export const FALLEN: FallenBundle = {
  encounters: [
    {
      id: fallenId('abyssal', 'arrears'),
      court: 'abyssal',
      gimmick: fallenId('abyssal', 'arrears'),
      name: 'Valves in Arrears',
      foeName: 'Breathclerk Tallow Wheeze',
      foeElement: 'fortune',
      difficulty: 4,
      hpMult: 1.1,
      at: { x: 680, y: 990 },
      look: { body: 0x6a6e78, accent: 0x2a2a3a, hand: 0xc39744, hat: 'tophat', traits: ['book', 'glasses', 'satchel'], size: 1.1, eye: 0xffa040 },
      challenge: [
        'Every chest in this city breathes on account. Yours has just been opened. I will be keeping it.',
        'Pockets open where the book says. Stand in one and breathe. Stand out of one and owe.',
        'Do not touch the wheels. A turned valve is a debt, and I have never once forgotten a debt.',
      ],
      beaten: [
        'The book is… the book is full of readings. Pressure, flow. Nobody\'s name. I only ever read the gauges.',
        'I kept the pumps going through the bad winter. Didn\'t I? I think I turned them up, not down.',
      ],
      coins: 160,
    },
    {
      id: fallenId('abyssal', 'dark-doors'),
      court: 'abyssal',
      gimmick: fallenId('abyssal', 'dark-doors'),
      name: 'The Dark Door List',
      foeName: 'Listkeeper Nell',
      foeElement: 'death',
      difficulty: 4,
      hpMult: 1.15,
      at: { x: 760, y: 1480 },
      look: { body: 0x8a7a6a, accent: 0x161a24, hand: 0x6a5a4a, hat: 'souwester', traits: ['lantern', 'book'], size: 0.95, eye: 0xffa040 },
      challenge: [
        'A lit door is a paid door. A dark one goes on my list, and my list goes to the prince. That is lamplighting.',
        'I walk the row and write them down. Every one. The tide only takes what I have written.',
        'Feed the lamps if you like. I have a snuffer and a very long evening.',
      ],
      beaten: [
        'There is chalk on my hands. I… marked the doors I meant to come back and light. That was all the marks were.',
        'Roe. I carried roe. A bucket of it, every night, up and down the row. I lit them. I lit them anyway.',
      ],
      coins: 160,
    },
    {
      id: fallenId('abyssal', 'longline'),
      court: 'abyssal',
      gimmick: fallenId('abyssal', 'longline'),
      name: 'Hooked and Landed',
      foeName: 'Gaffman Tull',
      foeElement: 'hunt',
      difficulty: 5,
      hpMult: 1.15,
      at: { x: 1890, y: 1320 },
      look: { body: 0x5e5a52, accent: 0x2a3446, hand: 0x7a6a52, hat: 'souwester', traits: ['rod', 'pipe', 'beard'], size: 1.2, eye: 0xffa040 },
      challenge: [
        'The prince pays by the head. I fish for heads. Same rods, same bait, better money than grenadier.',
        'Four rods in the walls. They cast where you stand and reel what they catch. Stand still if you like.',
        'Touch my rods and I will take them back. A gaffman is never far from his own line.',
      ],
      beaten: [
        'I was fishing the trench. Grenadier, gulper, the odd lanternfish for Gilly. Wasn\'t I? Only ever fish.',
        'Who pays a man in hooks? Nobody. I made these. For the jetty. For fish.',
      ],
      coins: 160,
    },
    {
      id: fallenId('abyssal', 'stair'),
      court: 'abyssal',
      gimmick: fallenId('abyssal', 'stair'),
      name: 'Down the Spiral Stair',
      foeName: 'Stairwarden Eddo',
      foeElement: 'tempest',
      difficulty: 5,
      hpMult: 1.2,
      at: { x: 860, y: 580 },
      look: { body: 0x4a5866, accent: 0x0c1218, hand: 0x8aa0aa, hat: 'hood', traits: ['lantern', 'cane', 'scarf'], size: 1.25, eye: 0xffa040 },
      challenge: [
        'Families come to the stairhead to say goodbye. I take them down a step at a time. It is kinder slow.',
        'The water turns and the steps turn with it. Stand on stone and it will not have you. Not yet.',
        'When the stair turns, the sea comes in at the wall. Everyone learns where to stand. Eventually.',
      ],
      beaten: [
        'I hold the lantern at the top. I… held it so they could see to come back up. Some of them came back up.',
        'I never went down. Nobody goes down. I only ever sat at the top and waited with the lamp.',
      ],
      coins: 160,
    },
    {
      id: fallenId('abyssal', 'skin'),
      court: 'abyssal',
      gimmick: fallenId('abyssal', 'skin'),
      name: 'Patch the Skin',
      foeName: 'Sealwright Fen',
      foeElement: 'wax',
      difficulty: 5,
      hpMult: 1.25,
      at: { x: 200, y: 600 },
      look: { body: 0x9a8676, accent: 0x5c3a2a, hand: 0xffb04a, hat: 'diving', traits: ['tool', 'apron', 'pack'], size: 1.05, eye: 0xffa040 },
      challenge: [
        'When the Queen leaves a house under, someone has to wax the door shut behind her. That is me.',
        'The skin of this city is as thin as I let it be. Miss your shot and the sea will not miss you.',
        'Every hole you make, I seal. Every hole I make, you swim. That is the trade, and I am good at it.',
      ],
      beaten: [
        'Wax on the bubble wall. Only the bubble wall. I patched the leaks so the city could breathe.',
        'I never sealed a door. I would remember the smell. I would. Wouldn\'t I?',
      ],
      coins: 160,
    },
  ],
  gimmicks: [ARREARS, DARK_DOORS, LONGLINE, STAIR, SKIN],
};
