import type { FallenBundle } from '../../../../../IslesTypes';
import { fallenId } from '../../../../meteor/spec';
import { FALLEN_BIER_BETWEEN } from './bierBetween';
import { FALLEN_CORPSE_CANDLES } from './corpseCandles';
import { FALLEN_EVERLASTING } from './immortelles';
import { FALLEN_RUNNING_WATER } from './runningWater';
import { FALLEN_SLAKED } from './slaked';

/**
 * The Grave Court's Fallen Five — in the star's telling, the trades that make a burial and who
 * lent them to Prince Mortis: the immortelle-seller whose wreaths marked the chosen doors, the
 * lime-man who limed the pits, the embalmer who kept the greyed for the window, the bearer-captain
 * who carried the living, and the layer-out who swapped the names. Tier 4: difficulty 4,4,5,5,5;
 * coins about double the court's 125. They stand where the court's own never do: the Bier Road
 * west of the road, the peat by the digger's yard, the head of the Lych Walk, the Lych Walk east
 * by the mausoleum, and under the eastern rows past the bell field.
 */

const EYE = 0xffa040;

export const FALLEN: FallenBundle = {
  gimmicks: [FALLEN_EVERLASTING, FALLEN_SLAKED, FALLEN_CORPSE_CANDLES, FALLEN_BIER_BETWEEN, FALLEN_RUNNING_WATER],
  encounters: [
    {
      id: fallenId('grave', 'everlasting'),
      court: 'grave',
      name: 'Everlasting',
      foeName: 'Ancilla Mourhouse, Immortelle-Seller',
      foeElement: 'crystal',
      difficulty: 4,
      hpMult: 1.1,
      gimmick: fallenId('grave', 'everlasting'),
      at: { x: 760, y: 1130 },
      look: { body: 0xd8d2c4, accent: 0x34303c, hat: 'veil', traits: ['satchel', 'glasses'], size: 0.95, eye: EYE },
      challenge: [
        'Porcelain lilies, dear. They never brown. They outlast the grief and the griever, every time.',
        'The Prince\'s men buy one for every door on the tally. I tie the bow myself. Black for the chosen.',
        'You\'ve no door, so I\'ll hang yours on you. Mind the edges. Porcelain is very sharp when it spins.',
      ],
      beaten: [
        'Wreaths. For graves. People put them on graves because they\'d run out of things to say.',
        'I never hung one on a door. Did I? I can see the bow. Why can I see the bow on a door?',
      ],
      coins: 250,
    },
    {
      id: fallenId('grave', 'slaked'),
      court: 'grave',
      name: 'Slaked',
      foeName: 'Ozias Calx, the Lime-Man',
      foeElement: 'chalk',
      difficulty: 4,
      hpMult: 1.15,
      gimmick: fallenId('grave', 'slaked'),
      at: { x: 1000, y: 1300 },
      look: { body: 0xe4e2dc, accent: 0x8d8e86, hat: 'cap', traits: ['apron', 'tool', 'bandage'], size: 1.25, eye: EYE },
      challenge: [
        'Lime in the pits, three shovels a body. After that there\'s no face left for anyone to come asking after.',
        'Dry, it\'s nothing. Flour, near enough. It\'s the mire coming up that does the work. I only bring the sacks.',
        'Stand still a moment. I\'ll make you nice and white, and then we\'ll see where you put your feet.',
      ],
      beaten: [
        'Whitewash. The chapel, every spring. Lime keeps the damp off the walls. That\'s what lime is for.',
        'I limewashed the Quiet Ward so it looked clean for them. I never limed a pit. My hands are only white.',
      ],
      coins: 250,
    },
    {
      id: fallenId('grave', 'corpse-candles'),
      court: 'grave',
      name: 'Corpse-Candles',
      foeName: 'Eluned Sallis, Night-Walker',
      foeElement: 'light',
      difficulty: 5,
      hpMult: 1.15,
      gimmick: fallenId('grave', 'corpse-candles'),
      at: { x: 1200, y: 560 },
      look: { body: 0xc4c8c0, accent: 0x2a2a34, hat: 'cowl', traits: ['lantern', 'scarf'], size: 0.95, eye: EYE },
      challenge: [
        'The lights walk backward, did you know? Step to one and it comes to you. That\'s how I lead them.',
        'I walk them to a door, and I walk away, and they stay on the step. The house always knows what it means.',
        'You\'ve two of your own tonight. Mind which way you go. Everything here mirrors the living.',
      ],
      beaten: [
        'I walked the rows with a lamp. So nobody visiting at night would trip on the old stones. That was all.',
        'A door? I never led a light to a door. I led widows home. I held the lamp up so they could see the path.',
      ],
      coins: 260,
    },
    {
      id: fallenId('grave', 'bier-between'),
      court: 'grave',
      name: 'The Bier Between',
      foeName: 'Lemuel Crossbar, Bearer-Captain',
      foeElement: 'gunpowder',
      difficulty: 5,
      hpMult: 1.2,
      gimmick: fallenId('grave', 'bier-between'),
      at: { x: 1620, y: 740 },
      look: { body: 0x2e2a34, accent: 0x17151b, hat: 'tophat', traits: ['scarf', 'cane'], size: 1.35, eye: EYE },
      challenge: [
        'Six of us, and the box never touches the ground. Not once in thirty years. Not even the ones that knock.',
        'We set it between a family and whoever comes asking. They can talk to the lid. The lid doesn\'t answer.',
        'Shoot all you like, stranger. The dead keep count. They always pay their bearers back.',
      ],
      beaten: [
        'Gently. We carried them gently, six shoulders, never a jolt. The families walked behind and we kept time.',
        'Nobody knocked. Nobody ever knocked from inside. I\'d have stopped. I\'d have set it down and opened it.',
      ],
      coins: 270,
    },
    {
      id: fallenId('grave', 'running-water'),
      court: 'grave',
      name: 'Running Water',
      foeName: 'Cornelius Weir, Drain-Warden',
      foeElement: 'water',
      difficulty: 5,
      hpMult: 1.25,
      gimmick: fallenId('grave', 'running-water'),
      at: { x: 2150, y: 1160 },
      look: { body: 0x7a8a84, accent: 0x2a2018, hat: 'souwester', traits: ['tool', 'beard', 'satchel'], size: 1.2, eye: EYE },
      challenge: [
        'Three rills keep this yard above the mire. And the dead can\'t cross running water. Everyone knows that.',
        'On the nights the Prince wants the Quiet Ward visited, I shut the boards. Just for an hour. They walk.',
        'Which side of the water are you on, stranger? I\'ve the key to every sluice. You\'ve only your hands.',
      ],
      beaten: [
        'I kept the drains running. Every night, every board up. So the dead stayed down and the living slept.',
        'I never shut a sluice on anyone. Did I? Why can I hear the boards dropping? Why can I hear them walk?',
      ],
      coins: 280,
    },
  ],
};
