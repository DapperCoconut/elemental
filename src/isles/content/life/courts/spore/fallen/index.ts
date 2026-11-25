import type { FallenBundle } from '../../../../../IslesTypes';
import { fallenId } from '../../../../meteor/spec';
import { FALLEN_SPORE_PRINT } from './sporePrint';
import { FALLEN_OVERHEARD } from './overheard';
import { FALLEN_HEAVIER_PAN } from './heavierPan';
import { FALLEN_CORDYCEPS } from './cordyceps';
import { FALLEN_CREEPING_GREY } from './creepingGrey';

/**
 * The Spore Court's Fallen Five — in the star's telling, the bog-town people who made Prince Mycel's
 * listening work: the keeper who printed the pruning rolls in spore-ink, the neighbour whose
 * jelly-ears heard every doorstep, the weighmaster with his thumb on the pan, the tutor who taught
 * the Prince that a fungus borrows its host, and the blightwife who walked the grey onto the plots
 * of families who complained. Tier 3: difficulty 4,4,5,5,5; coins double the court's 75.
 * They stand where the court's own five never go: under the upper town, on the Lode's east bank,
 * south of the middle bridge, by the low street's east houses, and the far west end of the street.
 */

const EYE = 0xffa040;

export const FALLEN: FallenBundle = {
  gimmicks: [FALLEN_SPORE_PRINT, FALLEN_OVERHEARD, FALLEN_HEAVIER_PAN, FALLEN_CORDYCEPS, FALLEN_CREEPING_GREY],
  encounters: [
    {
      id: fallenId('spore', 'spore-print'),
      court: 'spore',
      name: 'Spore Print',
      foeName: 'Printer Lamella, Keeper of the Rolls',
      foeElement: 'ink',
      difficulty: 4,
      hpMult: 1.1,
      gimmick: fallenId('spore', 'spore-print'),
      at: { x: 900, y: 620 },
      look: { body: 0xe6d9bd, accent: 0x5e3f80, hat: 'mushroom', traits: ['book', 'glasses', 'apron'], size: 0.95, eye: EYE },
      challenge: [
        'Lay the cap gill-down, lift it in an hour, and there are the names. Every name sits on a gill.',
        'I print the rolls for the Prince. Short households, in a neat star. The ink never smudges.',
        'Hold still, dear. A blurred name only has to be printed again.',
      ],
      beaten: [
        'Prints... I made prints for the children. To tell a deathcap from a button. So nobody was poisoned.',
        'I never printed a name in my life. I printed mushrooms. Why do I remember the names?',
      ],
      coins: 150,
    },
    {
      id: fallenId('spore', 'overheard'),
      court: 'spore',
      name: 'Overheard',
      foeName: 'Auricle Thrum, the Doorstep Ear',
      foeElement: 'echo',
      difficulty: 4,
      gimmick: fallenId('spore', 'overheard'),
      at: { x: 2080, y: 930 },
      look: { body: 0x8f6438, accent: 0x34261a, hat: 'beanie', traits: ['scarf', 'pipe'], size: 1.0, eye: EYE },
      challenge: [
        'I grow jelly-ears on every stump in the lane. Lovely things. They hear such a lot.',
        'Say whatever you like. Say it twice. The net carries it home, and home says it back.',
        'Go on. Cast something. I am all ears.',
      ],
      beaten: [
        'Jelly-ears... I sold them for soup. Tuppence a bowl. They never heard anything. They are fungus.',
        'Who did I tell? I cannot think who I would tell. I only ever talked to the neighbours.',
      ],
      coins: 150,
    },
    {
      id: fallenId('spore', 'heavier-pan'),
      court: 'spore',
      name: 'The Heavier Pan',
      foeName: 'Weighmaster Tare',
      foeElement: 'fortune',
      difficulty: 5,
      hpMult: 1.15,
      gimmick: fallenId('spore', 'heavier-pan'),
      at: { x: 1600, y: 1120 },
      look: { body: 0xbb8a52, accent: 0x34261a, hat: 'tophat', traits: ['satchel', 'beard', 'tool'], size: 1.25, eye: EYE },
      challenge: [
        'Everything gets weighed, friend. Every basket, every blow. The beam does not lie. My thumb does.',
        'A family came up an ounce short on Tuesday. I did not make the ounce. I only found it missing.',
        'Step up to the pan. Let us see what you are worth.',
      ],
      beaten: [
        'I weighed fair. I did. I gave the Burrows girl the half-ounce back when the beam stuck. Did I?',
        'There was no thumb. I think there was never a thumb. Why does my hand ache like it held one?',
      ],
      coins: 150,
    },
    {
      id: fallenId('spore', 'cordyceps'),
      court: 'spore',
      name: 'Cordyceps',
      foeName: 'Doctor Ergot, the Prince\'s Tutor',
      foeElement: 'bind',
      difficulty: 5,
      hpMult: 1.2,
      gimmick: fallenId('spore', 'cordyceps'),
      at: { x: 1000, y: 1400 },
      look: { body: 0x3b2a3c, accent: 0xa8541c, hat: 'wizard', traits: ['cane', 'book', 'glasses'], size: 1.1, eye: EYE },
      challenge: [
        'I taught the boy his first lesson. A fungus does not kill the ant. It borrows it.',
        'It walks the ant up the tallest stalk and blooms out of its head. Such patience. Such a gift.',
        'You will thank me, at the top. They all go quiet at the top.',
      ],
      beaten: [
        'I taught him to tell the kinds apart. That was all. Which ones feed you, which ones heal you.',
        'Did I teach him to borrow people? No. No, I told him never. I am sure I told him never.',
      ],
      coins: 160,
    },
    {
      id: fallenId('spore', 'creeping-grey'),
      court: 'spore',
      name: 'The Creeping Grey',
      foeName: 'Blightwife Smut',
      foeElement: 'radiation',
      difficulty: 5,
      hpMult: 1.25,
      gimmick: fallenId('spore', 'creeping-grey'),
      at: { x: 250, y: 1380 },
      look: { body: 0x9aa39a, accent: 0x1d1712, hat: 'hood', traits: ['cane', 'bandage', 'satchel'], size: 0.9, eye: EYE },
      challenge: [
        'The Hollins said the tithe was too high. Then the grey came up on the Hollins\' plot. Funny, that.',
        'I only walk, dearie. Where I walk, the grey follows. I cannot help where I walk.',
        'Come and stand on my ground. It is soft. It is so soft.',
      ],
      beaten: [
        'Grey... I scraped the grey off. With a spade, every spring, for anyone who asked. For nothing.',
        'I never brought it. I fought it. Why does the dream want me to have brought it?',
      ],
      coins: 160,
    },
  ],
};
