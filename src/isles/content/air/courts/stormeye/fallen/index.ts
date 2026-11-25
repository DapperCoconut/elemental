import type { FallenBundle } from '../../../../../IslesTypes';
import { fallenId } from '../../../../meteor/spec';
import { FALLEN_COURSE } from './course';
import { FALLEN_FORECAST } from './forecast';
import { FALLEN_PEN } from './pen';
import { FALLEN_SOAKED } from './soaked';
import { FALLEN_WICKS } from './wicks';

/**
 * The Stormeye Court's Fallen Five — in the star's telling, the people who kept the forecast's
 * ledger for Prince Squall: the wall-mason who takes the wall down a course for arrears, the
 * keeper of the Charging Pen, the night-warden who snuffs the lamps of the streets in debt, the
 * crier who chalks the forecast, and the slicker-maker who sells yellow only to the paid-up.
 * Tier 3: difficulty 4,4,5,5,5; coins double the court's 90. They stand on open ground the
 * court's own five never use: under the north wall, by the Charging Pen, the main street west,
 * the south road by the Lightning Jar, and the lane east of the Tower.
 */

const EYE = 0xffa040;

export const FALLEN: FallenBundle = {
  gimmicks: [FALLEN_COURSE, FALLEN_PEN, FALLEN_WICKS, FALLEN_FORECAST, FALLEN_SOAKED],
  encounters: [
    {
      id: fallenId('stormeye', 'course'),
      court: 'stormeye',
      name: 'Down a Course',
      foeName: 'Orrin Stack, Wall-Mason',
      foeElement: 'clay',
      difficulty: 4,
      hpMult: 1.1,
      gimmick: fallenId('stormeye', 'course'),
      at: { x: 760, y: 300 },
      look: { body: 0xc0a088, accent: 0x6a7380, hat: 'helmet', traits: ['tool', 'beard', 'apron'], size: 1.3, eye: EYE },
      challenge: [
        'Every course of this wall I know by its mortar. So I know which one comes out first. The forecast says.',
        'Arrears on your street. That means one course tonight. Then another. The gale only needs a gap.',
        'Mind the chalk, friend. Where I chalk, I knock. Where I knock, the weather walks in.',
      ],
      beaten: [
        'I... laid the wall. Up, not down. Forty years of up. Why do my hands remember the crowbar?',
        'Tamsin\'s house. I rebuilt her course myself, at night, for nothing. Didn\'t I? Tell me I did.',
      ],
      coins: 180,
    },
    {
      id: fallenId('stormeye', 'pen'),
      court: 'stormeye',
      name: 'Loose from the Pen',
      foeName: 'Oda Galloway, Penkeeper',
      foeElement: 'plasma',
      difficulty: 4,
      hpMult: 1.15,
      gimmick: fallenId('stormeye', 'pen'),
      at: { x: 1960, y: 520 },
      look: { body: 0xe0c4a4, accent: 0xc07a44, hat: 'goggles', traits: ['tool', 'lantern', 'scarf'], size: 1.05, eye: EYE },
      challenge: [
        'The rods catch it, I pen it. Little balls of it, humming like bees. They\'re soft as kittens, mostly.',
        'They follow the draught, see. Whoever stirs the air, they go to. The Prince points; I open the gate.',
        'Fidget for me. Go on. They do love a fidget.',
      ],
      beaten: [
        'Penned... I penned it so it couldn\'t get at the town. That was the whole job. Keeping it in.',
        'I never opened that gate for anyone. I sat up nights by it. Why do I remember the latch in my hand?',
      ],
      coins: 180,
    },
    {
      id: fallenId('stormeye', 'wicks'),
      court: 'stormeye',
      name: 'Wicks in the Gale',
      foeName: 'Fen Gutteridge, Night-Warden',
      foeElement: 'oil',
      difficulty: 5,
      hpMult: 1.2,
      gimmick: fallenId('stormeye', 'wicks'),
      at: { x: 460, y: 900 },
      look: { body: 0xd0b494, accent: 0x2e3238, hat: 'cap', traits: ['lantern', 'cane', 'scarf'], size: 1.1, eye: EYE },
      challenge: [
        'A lit door is a door the gale won\'t take. Everyone in Stormeye knows that. So I choose which doors.',
        'Streets in arrears get their wicks turned down. Just a quarter turn. The wind does the rest.',
        'Stand in my light if you can find any. I\'ll be along with the snuffer directly.',
      ],
      beaten: [
        'I... lit them. Every dusk, up the ladder, every lamp on the row. Even the ones that couldn\'t pay.',
        'Snuffer? I never carried a snuffer. I carried oil, and a match, and Ozias carried the ladder.',
      ],
      coins: 180,
    },
    {
      id: fallenId('stormeye', 'forecast'),
      court: 'stormeye',
      name: 'Posted at Dawn',
      foeName: 'Hester Vane, Forecast-Crier',
      foeElement: 'fate',
      difficulty: 5,
      hpMult: 1.25,
      gimmick: fallenId('stormeye', 'forecast'),
      at: { x: 1360, y: 1240 },
      look: { body: 0xe8d4c0, accent: 0xc9a440, hat: 'plume', traits: ['book', 'glasses', 'satchel'], size: 0.98, eye: EYE },
      challenge: [
        'Hear ye: flat calm by the Tower, squalls on the Torn Row, and you, my dear, in breach of all of it.',
        'The forecast is not an opinion. I chalk it, the sky keeps it, and whoever breaks it is fined by the sky.',
        'Do read the board. It is such a shame when people don\'t read the board.',
      ],
      beaten: [
        'I cried the weather. Just the weather. "Fair by noon, bring your washing in." That was all it was.',
        'Who put names on my board? I never chalked a name. I only ever drew little clouds.',
      ],
      coins: 180,
    },
    {
      id: fallenId('stormeye', 'soaked'),
      court: 'stormeye',
      name: 'Soaked Through',
      foeName: 'Ignatius Brine, Slicker-Maker',
      foeElement: 'cloth',
      difficulty: 5,
      hpMult: 1.3,
      gimmick: fallenId('stormeye', 'soaked'),
      at: { x: 1420, y: 640 },
      look: { body: 0xe4c8a8, accent: 0xe8c23a, hat: 'souwester', traits: ['apron', 'tool', 'pipe'], size: 1.15, eye: EYE },
      challenge: [
        'Yellow\'s the only colour you can see in a squall. And the lightning loves a man wet to the skin.',
        'I stitch the oilskins. The paid-up wear them. The rest can look at them, hanging on the peg.',
        'Go on, reach for one. I\'ve been waiting all day to watch somebody reach.',
      ],
      beaten: [
        'I... gave them away. Every winter. Mercy kept a list of who needed one and I sewed down the list.',
        'The peg in the square was for anyone. Anyone at all. Why would I ever have stood guard on it?',
      ],
      coins: 180,
    },
  ],
};
