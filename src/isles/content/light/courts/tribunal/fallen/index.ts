import type { FallenBundle } from '../../../../../IslesTypes';
import { fallenId } from '../../../../meteor/spec';
import { FALLEN_DOCKET } from './docket';
import { FALLEN_EMPTY_CHAIR } from './emptyChair';
import { FALLEN_JURY_WHEEL } from './juryWheel';
import { FALLEN_TRAIN } from './train';
import { FALLEN_WITNESSES } from './witnesses';

/**
 * The Tribunal Court's Fallen Five — in the star's telling, the small officers who made Prince
 * Verdict's justice run: the usher who walked frightened witnesses to the stand, the bench-clerk
 * who sat in the empty chair, the lot-drawer who knew every name in the jury wheel, the crier who
 * hung the docket in the order the bench liked, and the train-bearer who was given the Prince's
 * train for her own. Tier 4: difficulty 4,4,5,5,5; coins double the court's 145. They stand where
 * the court's own five never fight: under the Palace railings in the west, the foot of the
 * Processional's north walk, the Steps of Appeal between the law-stones, the Records walk by the
 * courthouse's east corner, and the south-east terrace past the Fountain.
 */

const EYE = 0xffa040;

export const FALLEN: FallenBundle = {
  gimmicks: [FALLEN_WITNESSES, FALLEN_TRAIN, FALLEN_EMPTY_CHAIR, FALLEN_JURY_WHEEL, FALLEN_DOCKET],
  encounters: [
    {
      id: fallenId('tribunal', 'witnesses'),
      court: 'tribunal',
      name: 'Hostile Witnesses',
      foeName: 'Witness-Usher Corbinian Threlkeld',
      foeElement: 'silence',
      difficulty: 4,
      hpMult: 1.05,
      gimmick: fallenId('tribunal', 'witnesses'),
      at: { x: 900, y: 860 },
      look: { body: 0x4a3a52, accent: 0xe2b440, hat: 'wig', traits: ['cane', 'book'], size: 1.1, eye: EYE },
      challenge: [
        'Nobody wants to be a witness. That\'s why the court has me. I find them, and I walk them up, gently.',
        'I stand just behind them while they speak. Close enough to feel me breathing. They remember everything.',
        'Here are three good neighbours who saw it all. Don\'t frighten them, stranger. That\'s my job.',
      ],
      beaten: [
        'I walked people up to the stand… so they wouldn\'t have to go alone. I held their hands. Didn\'t I?',
        'The star says I stood behind them. I remember standing beside them. One of those is true.',
      ],
      coins: 290,
    },
    {
      id: fallenId('tribunal', 'train'),
      court: 'tribunal',
      name: 'Tread on the Hem',
      foeName: 'Train-Bearer Wendeline Sprackling',
      foeElement: 'cloth',
      difficulty: 4,
      gimmick: fallenId('tribunal', 'train'),
      at: { x: 300, y: 790 },
      look: { body: 0x5a2a6a, accent: 0xe2b440, hat: 'coif', traits: ['scarf'], size: 0.9, eye: EYE },
      challenge: [
        'Twenty years three paces behind the Prince, holding his hem off the floor. Now the train is mine.',
        'Forty feet of violet. It goes where I go, and when I turn, the whole court turns with me.',
        'Mind your feet, dear. Nobody treads on the Prince\'s train. Nobody ever has.',
      ],
      beaten: [
        'You trod on it. And I stopped. That\'s all I ever did, really — stopped when the cloth did.',
        'It was never mine. I only carried it so it wouldn\'t get dirty. I liked that it stayed clean.',
      ],
      coins: 280,
    },
    {
      id: fallenId('tribunal', 'empty-chair'),
      court: 'tribunal',
      name: 'The Empty Chair',
      foeName: 'Bench-Clerk Hyacinth Wardlaw',
      foeElement: 'justice',
      difficulty: 5,
      hpMult: 1.1,
      gimmick: fallenId('tribunal', 'empty-chair'),
      at: { x: 1200, y: 1440 },
      look: { body: 0x2e2238, accent: 0xf4f0e6, hat: 'wig', traits: ['glasses', 'book'], size: 1, eye: EYE },
      challenge: [
        'Thirty years I kept his papers. Afternoons he was away, I sat in his chair. Somebody had to.',
        'It\'s a very comfortable chair. From up there everybody looks guilty. You\'ll see, if you can reach it.',
        'Court is in session. I\'ll take the bench — unless you\'d care to knock me off it.',
      ],
      beaten: [
        'I never sat in it. I dusted it. Every afternoon. I\'d stand beside it and think how high it was.',
        'Thrown out of a chair I never sat in. Curious. I feel lighter for it, somehow.',
      ],
      coins: 300,
    },
    {
      id: fallenId('tribunal', 'jury-wheel'),
      court: 'tribunal',
      name: 'Drawn from the Wheel',
      foeName: 'Lot-Drawer Ismenia Cardew',
      foeElement: 'fate',
      difficulty: 5,
      hpMult: 1.15,
      gimmick: fallenId('tribunal', 'jury-wheel'),
      at: { x: 2020, y: 1010 },
      look: { body: 0xb07a3a, accent: 0x5a2a6a, hat: 'veil', traits: ['tool', 'glasses'], size: 1, eye: EYE },
      challenge: [
        'Every juror in Solmara comes out of my wheel. Pure chance, the law says. I turn the crank.',
        'I know each ball by its weight. I can feel a name roll past the hatch. Chance is a feel for things.',
        'Shall we see who the wheel picks? Don\'t stand on its line. It is very fond of the accused.',
      ],
      beaten: [
        'I turned it fairly. I always turned it fairly. I used to close my eyes so I couldn\'t cheat.',
        'Chance. I\'d forgotten what it felt like when I didn\'t know. It feels like this.',
      ],
      coins: 300,
    },
    {
      id: fallenId('tribunal', 'docket'),
      court: 'tribunal',
      name: 'Called in Turn',
      foeName: 'Docket-Crier Ozanne Pritchet',
      foeElement: 'paper',
      difficulty: 5,
      hpMult: 1.2,
      gimmick: fallenId('tribunal', 'docket'),
      at: { x: 1900, y: 1690 },
      look: { body: 0xf2e6c4, accent: 0xb8202a, hat: 'tricorn', traits: ['satchel', 'book'], size: 1.05, eye: EYE },
      challenge: [
        'Every case in this court is heard in its turn. I hang the turns. I can read the whole day off my rail.',
        'A friend of the bench finds their tablet hung at the back. Every day, at the back. Never quite heard.',
        'Your tablets are all at the front, stranger. Read them if you like. It won\'t change the order.',
      ],
      beaten: [
        'I cried the docket in order. In order! I rang the bell and read the names and that was all.',
        'Somebody moved the tablets, the star says. Was it me? My hands still smell of the rail.',
      ],
      coins: 310,
    },
  ],
};
