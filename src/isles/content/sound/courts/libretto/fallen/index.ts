import type { FallenBundle } from '../../../../../IslesTypes';
import { fallenId } from '../../../../meteor/spec';
import { EYE, FALLEN_COINS } from './common';
import { FALLEN_FULL_MEASURE } from './fullMeasure';
import { FALLEN_HAND_IN_HAND } from './handInHand';
import { FALLEN_LEFT_OFF } from './leftOff';
import { FALLEN_LEMON } from './lemon';
import { FALLEN_OUT_OF_REGISTER } from './outOfRegister';

/**
 * The Libretto Court's Fallen Five — in the star's telling, the copyists' town's own hands, set to
 * the crown's work: the compositor who set the Score in lead, the doll-cutter whose chains the
 * children were given at Matins, the Lector who read the day's page and kept its place, the
 * night-writer who wrote the Censor's reports in lemon between the hymn lines, and the pressman
 * who pulled the Score's words in black and its rubrics in red. Tier 2: difficulty 4,4,5,5,5; coins double the court's 115.
 * They stand where the court's own five never do: behind the west scriptorium, under the drying
 * lines west of the Inkwell, the south side of Proof Square, the lane below the Bindery, and the
 * Press Hall's yard.
 */

const COURT = 'libretto';

export const FALLEN: FallenBundle = {
  gimmicks: [FALLEN_FULL_MEASURE, FALLEN_HAND_IN_HAND, FALLEN_LEFT_OFF, FALLEN_LEMON, FALLEN_OUT_OF_REGISTER],
  encounters: [
    {
      id: fallenId(COURT, 'full-measure'), court: COURT, name: 'Full Measure',
      foeName: 'Compositor Tobiah Quoin', foeElement: 'earth', difficulty: 4, hpMult: 1.1,
      gimmick: fallenId(COURT, 'full-measure'),
      at: { x: 720, y: 300 },
      look: { body: 0xa8a49a, accent: 0x2e3036, hat: 'cap', traits: ['apron', 'glasses', 'tool'], size: 1.05, eye: EYE },
      challenge: [
        'Ten sorts to the line, and every line full. A line with a gap in it is a lie, and I do not set lies.',
        'You are a letter out of the case, stranger. I know exactly where you go.',
        'Stand still. I will justify you.',
      ],
      beaten: [
        'I… set the children\'s primers. ABC, with a cat on the C. Why did I melt them down?',
        'There was a gap I always left on the last line. For a name. I can\'t remember whose.',
      ],
      coins: FALLEN_COINS,
    },
    {
      id: fallenId(COURT, 'hand-in-hand'), court: COURT, name: 'Hand in Hand',
      foeName: 'Doll-Cutter Clementine Snipe', foeElement: 'gravity', difficulty: 4,
      gimmick: fallenId(COURT, 'hand-in-hand'),
      at: { x: 400, y: 1170 },
      look: { body: 0xe8d4c0, accent: 0xc8242c, hat: 'bandana', traits: ['scarf', 'tool', 'satchel'], size: 0.9, eye: EYE },
      challenge: [
        'One doll for every Part in the choir, all cut from one strip, all holding hands. Nobody lets go.',
        'They don\'t know who they are. They only know who is nearest. Isn\'t that lovely?',
        'Come and hold hands, dear. Everyone does, in the end.',
      ],
      beaten: [
        'I… cut them so the children had something to hold at Matins. Something that didn\'t sing.',
        'Mine always had one doll with its hands apart. She was the one who ran. I\'d forgotten her.',
      ],
      coins: FALLEN_COINS,
    },
    {
      id: fallenId(COURT, 'left-off'), court: COURT, name: 'Where We Left Off',
      foeName: 'Lector Cosima Ribband', foeElement: 'sand', difficulty: 5, hpMult: 1.15,
      gimmick: fallenId(COURT, 'left-off'),
      at: { x: 1200, y: 930 },
      look: { body: 0xc8bca8, accent: 0x7a1218, hat: 'veil', traits: ['book', 'glasses'], size: 1.05, eye: EYE },
      challenge: [
        'I read the day\'s page from the eagle every morning. I have never once lost my place.',
        'Wherever you go, I keep a ribbon where you were. And then we go back. We always go back.',
        'Let us begin again from where we left off. Ah — you\'re in the ink. How careless.',
      ],
      beaten: [
        'The page… it was never today\'s. I read the same page for nine years. Did nobody notice?',
        'I kept a pressed snowdrop in the Book, under the ribbon. My sister put it there. She sang flat.',
      ],
      coins: FALLEN_COINS,
    },
    {
      id: fallenId(COURT, 'lemon'), court: COURT, name: 'Written in Lemon',
      foeName: 'Night-Writer Henrike Vellacott', foeElement: 'psychic', difficulty: 5, hpMult: 1.2,
      gimmick: fallenId(COURT, 'lemon'),
      at: { x: 1720, y: 330 },
      look: { body: 0xd8c4b0, accent: 0x2a2836, hat: 'hood', traits: ['satchel', 'glasses'], size: 1, eye: EYE },
      challenge: [
        'Every hymn sheet has room between the lines. I filled it. In lemon. Nobody reads what they can\'t see.',
        'It only shows when it\'s warmed. And you, stranger, are such a warm sort of reader.',
        'Go on. Say something. Cast it. Let\'s see what I wrote about you.',
      ],
      beaten: [
        'I… wrote love letters that way, for girls whose mothers read their post. Only those.',
        'There\'s a sheet in my sleeve I never warmed. I was afraid of what I\'d said in it.',
      ],
      coins: FALLEN_COINS,
    },
    {
      id: fallenId(COURT, 'out-of-register'), court: COURT, name: 'Out of Register',
      foeName: 'Pressman Caradoc Frisket', foeElement: 'magnet', difficulty: 5, hpMult: 1.25,
      gimmick: fallenId(COURT, 'out-of-register'),
      at: { x: 1600, y: 1240 },
      look: { body: 0xb0a490, accent: 0x16141c, hat: 'cap', traits: ['apron', 'beard', 'tool'], size: 1.25, eye: EYE },
      challenge: [
        'Black for the words, red for the rubrics. Four hundred sheets an hour, two passes each.',
        'My red never sits true. A step off. Always the same step. The Maestro calls it my signature.',
        'Stand on the black, stranger. I\'ll find you with the red.',
      ],
      beaten: [
        'Out of true… I set the red off on purpose, didn\'t I. So every copy could tell which was mine.',
        'The rebels\' sheets. I printed them in the night, all red. Nobody ever read the black.',
      ],
      coins: FALLEN_COINS,
    },
  ],
};
