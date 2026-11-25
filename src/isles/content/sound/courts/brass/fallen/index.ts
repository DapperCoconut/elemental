import type { FallenBundle } from '../../../../../IslesTypes';
import { fallenId } from '../../../../meteor/spec';
import { FALLEN_ADRIFT } from './adrift';
import { FALLEN_ARCH_OF_SLIDES } from './archOfSlides';
import { FALLEN_CHUCK } from './chuck';
import { FALLEN_MACE } from './mace';
import { FALLEN_PACE_STICK } from './paceStick';

/**
 * The Brass Court's Fallen Five — in the star's telling, the bandsmen who kept the terrace in
 * step for the crown: the horn-spinner who spun the Tuners' collecting-horns, the mace-bearer at
 * the head of every Hours parade, the colour-sergeant who paced out stragglers on the drill
 * square, the stage-master who chose who rode the Bandlake stage, and the Prince's equerry who
 * chose who walked under the arch. Tier 1: difficulty 4,4,4,5,5; coins about double the court's 105.
 * They stand where the court's own five never fight: west of the Horn-Foundry, at the foot of the
 * Parade, the drill square's south-west corner, the Bandlake's south shore, and before the
 * Bandhall's west wing.
 */

const EYE = 0xffa040;

export const FALLEN: FallenBundle = {
  gimmicks: [FALLEN_CHUCK, FALLEN_MACE, FALLEN_PACE_STICK, FALLEN_ADRIFT, FALLEN_ARCH_OF_SLIDES],
  encounters: [
    {
      id: fallenId('brass', 'chuck'),
      court: 'brass',
      name: 'The Spinning Chuck',
      foeName: 'Isidore Chuckworth, Horn-Spinner',
      foeElement: 'gravity',
      difficulty: 4,
      hpMult: 1.1,
      gimmick: fallenId('brass', 'chuck'),
      at: { x: 170, y: 1100 },
      look: { body: 0xd8b090, accent: 0xa8652e, hat: 'goggles', traits: ['apron', 'tool'], size: 1.15, eye: EYE },
      challenge: [
        'Every bell on the Tuners\' horns came off my chuck. Clamp, spin, press, and the brass flows like butter.',
        'You would not believe what spins well. Brass. Tin. People who stand where they oughtn\'t.',
        'Step on, then. Mind the belt. When it goes over to the high pulley, nobody stays on.',
      ],
      beaten: [
        'Cornet bells. Little ones, for the school band. I spun those for... for children, didn\'t I?',
        'I never made a collecting-horn in my life. I don\'t think anyone ever asked me to. Odd, that.',
      ],
      coins: 210,
    },
    {
      id: fallenId('brass', 'mace'),
      court: 'brass',
      name: 'Mace Aloft',
      foeName: 'Jessamy Twirl, Mace-Bearer',
      foeElement: 'tempest',
      difficulty: 4,
      hpMult: 1.1,
      gimmick: fallenId('brass', 'mace'),
      at: { x: 1200, y: 1380 },
      look: { body: 0xecd0b0, accent: 0xb8262e, hat: 'shako', traits: ['scarf', 'cane'], size: 0.95, eye: EYE },
      challenge: [
        'I lead the Hours down the Parade. Up goes the mace, and every head on the terrace goes up with it.',
        'Higher than the herald towers, and back to my hand without a look. It always comes home.',
        'Stand still and watch it go round. Everyone does. That is rather the point of a mace.',
      ],
      beaten: [
        'It came back to the wrong hand. Yours. I didn\'t know it could do that.',
        'Whit-walks. I threw it for the children\'s walk, all ribbons. Nobody ever ducked. Why would they?',
      ],
      coins: 210,
    },
    {
      id: fallenId('brass', 'pace-stick'),
      court: 'brass',
      name: 'Paced Out',
      foeName: 'Colour-Sergeant Ruthven Paceby',
      foeElement: 'conquest',
      difficulty: 4,
      hpMult: 1.15,
      gimmick: fallenId('brass', 'pace-stick'),
      at: { x: 330, y: 590 },
      look: { body: 0xd8b494, accent: 0x223060, hat: 'shako', traits: ['cane', 'glasses'], size: 1.2, eye: EYE },
      challenge: [
        'Thirty inches. One pace on Choirholm is thirty inches, and I have the stick that says so.',
        'The stick walks after stragglers. Whoever is hindmost. It has never once gone the wrong way.',
        'So keep up, stranger. Or don\'t. The stick does not mind which. Neither do I.',
      ],
      beaten: [
        'I measured the square. For the fair. Stalls thirty inches apart, so the prams could get through.',
        'Stragglers... we waited for them. On the long marches we always waited. I remember waiting.',
      ],
      coins: 210,
    },
    {
      id: fallenId('brass', 'adrift'),
      court: 'brass',
      name: 'Adrift on the Bandlake',
      foeName: 'Lorcan Moorby, Stage-Master',
      foeElement: 'depths',
      difficulty: 5,
      hpMult: 1.2,
      gimmick: fallenId('brass', 'adrift'),
      at: { x: 1700, y: 1470 },
      look: { body: 0xd0b498, accent: 0x3a7aa8, hat: 'straw', traits: ['rod', 'scarf'], size: 1.05, eye: EYE },
      challenge: [
        'The stage is mine. I moor her, I row the band out, and I say who stands on her boards.',
        'The crown\'s people stand on her. Everyone else can swim. The lake is very cold this time of year.',
        'Come aboard by the steps, if you can reach them. I\'ll have the capstans going before you do.',
      ],
      beaten: [
        'Out of the water, quick, here — take my hand. That\'s what I say. That\'s what I always said.',
        'Summer evenings. Lanterns on the rail, the band playing, the whole terrace in rowing boats. Mine.',
      ],
      coins: 220,
    },
    {
      id: fallenId('brass', 'arch-of-slides'),
      court: 'brass',
      name: 'Arch of Slides',
      foeName: 'Equerry Peregrine Vallow',
      foeElement: 'justice',
      difficulty: 5,
      hpMult: 1.2,
      gimmick: fallenId('brass', 'arch-of-slides'),
      at: { x: 1580, y: 330 },
      look: { body: 0xecd2b0, accent: 0xd8a83a, hat: 'plume', traits: ['satchel', 'book'], size: 1.0, eye: EYE },
      challenge: [
        'When the Prince\'s guests climb the Bandhall steps, the trombones raise an arch. I say who walks under it.',
        'Under the arch you are honoured. Honour is a lovely thing. It lasts exactly as long as I allow.',
        'Do walk in. Everyone does. Then the slides come down, and I find out who is quick.',
      ],
      beaten: [
        'Weddings. The arch was for weddings. Bride and groom under the slides, and everyone cheering.',
        'I never once brought the slides down on anybody. I held the rings. Somebody had to hold the rings.',
      ],
      coins: 220,
    },
  ],
};
