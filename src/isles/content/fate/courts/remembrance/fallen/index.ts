import type { FallenBundle } from '../../../../../IslesTypes';
import { fallenId } from '../../../../meteor/spec';
import { FALLEN_IN_DUPLICATE } from './inDuplicate';
import { FALLEN_ROLLING_STACKS } from './rollingStacks';
import { FALLEN_SEEN_THROUGH_GILT } from './seenThroughGilt';
import { FALLEN_SOMETHING_MISSING } from './somethingMissing';
import { FALLEN_WORD_PERFECT } from './wordPerfect';

/**
 * The Remembrance Court's Fallen Five — in the star's telling, the people of the pawn town who
 * kept the Prince's memory-trade running: the catechist who drilled the children word-perfect,
 * the gallery's hanger who painted out the faces of the drawn, the Ledger Office clerk who sent
 * the carbons up to the Archive, the keeper who wound the stacks shut, and the window-thief who
 * in this telling never stole anything back. Tier 3: difficulty 4,4,5,5,5; coins about double the
 * court's 120. They stand where the court's own five never do: the square's south-east lawn, the
 * fields' north edge by the stalls, the east lane past the washhouse, the north yard behind the
 * Unclaimed Shelves, and the field path's east end.
 */

const EYE = 0xffa040;

export const FALLEN: FallenBundle = {
  gimmicks: [FALLEN_WORD_PERFECT, FALLEN_SEEN_THROUGH_GILT, FALLEN_IN_DUPLICATE, FALLEN_ROLLING_STACKS, FALLEN_SOMETHING_MISSING],
  encounters: [
    {
      id: fallenId('remembrance', 'word-perfect'),
      court: 'remembrance',
      name: 'Word Perfect',
      foeName: 'Catechist Philomena Dunnock',
      foeElement: 'psychic',
      difficulty: 4,
      hpMult: 1.1,
      gimmick: fallenId('remembrance', 'word-perfect'),
      at: { x: 1460, y: 1060 },
      look: { body: 0xd8c4a8, accent: 0x3a302a, hat: 'coif', traits: ['glasses', 'book', 'cane'], size: 0.95, eye: EYE },
      challenge: [
        'Sit up. Hands flat. What is the first article of the Prince\'s catechism? "I keep what I am given."',
        'Every child in this court could say their Lot number backwards by six. I saw to that. Ruler and all.',
        'I shall read it once. Once. Then we shall see what you were listening with.',
      ],
      beaten: [
        'I taught letters. Letters, and the names of birds. Dunnock, wren, linnet. Why do I remember a ruler?',
        'They used to sing the birds back to me. I never once made them say a number. Did I?',
      ],
      coins: 240,
    },
    {
      id: fallenId('remembrance', 'seen-through-gilt'),
      court: 'remembrance',
      name: 'Seen Through Gilt',
      foeName: 'Hanger Barnaby Quist',
      foeElement: 'illusion',
      difficulty: 4,
      hpMult: 1.1,
      gimmick: fallenId('remembrance', 'seen-through-gilt'),
      at: { x: 380, y: 1010 },
      look: { body: 0xc8ac8c, accent: 0x8a6424, hat: 'beret', traits: ['apron', 'tool', 'pipe'], size: 1.1, eye: EYE },
      challenge: [
        'The morning after a Draw I take the drawn ones down. Paint the face out. Hang them back. Tidy work.',
        'A frame is a window you can\'t climb out of. Stand behind one and you\'re mine to hang.',
        'Hold still. Chin up. A little to the left. There. Perfectly framed.',
      ],
      beaten: [
        'I hung pictures. Straight. With a level and a bit of string. I never painted out a face in my life.',
        'There was a gilt frame I carried home once. My mother\'s face was in it. Where did that go?',
      ],
      coins: 240,
    },
    {
      id: fallenId('remembrance', 'in-duplicate'),
      court: 'remembrance',
      name: 'In Duplicate',
      foeName: 'Copy-Clerk Euphrasia Mott',
      foeElement: 'echo',
      difficulty: 5,
      hpMult: 1.15,
      gimmick: fallenId('remembrance', 'in-duplicate'),
      at: { x: 2200, y: 890 },
      look: { body: 0xdcc8ac, accent: 0x1e2638, hat: 'visor', traits: ['glasses', 'satchel', 'scarf'], size: 0.9, eye: EYE },
      challenge: [
        'Top copy for the customer. Carbon for the Archive. Every pledge in this court went up the hill twice.',
        'Nothing is said here that isn\'t said again, a little fainter, somewhere you can\'t see it.',
        'Mind where you stand, dear. Everything that happens to anyone happens to the carbon.',
      ],
      beaten: [
        'Carbons. I kept the carbons so people could prove what they were owed. That was the point of them.',
        'I gave them back. A drawer of them, the night before the Draw. I think I gave them all back.',
      ],
      coins: 260,
    },
    {
      id: fallenId('remembrance', 'rolling-stacks'),
      court: 'remembrance',
      name: 'The Rolling Stacks',
      foeName: 'Stack-Keeper Leopold Cranmer',
      foeElement: 'metal',
      difficulty: 5,
      hpMult: 1.2,
      gimmick: fallenId('remembrance', 'rolling-stacks'),
      at: { x: 1720, y: 330 },
      look: { body: 0xb8a088, accent: 0x5a5a64, hat: 'cap', traits: ['tool', 'beard', 'lantern'], size: 1.3, eye: EYE },
      challenge: [
        'After hours they come creeping in, looking for their own bottle. One aisle open. Only ever one.',
        'I turn the wheel and the shelves walk. They don\'t stop for anybody. That\'s what shelves are for.',
        'You\'ll want to be out of the aisle when you hear the bell. Most of them weren\'t.',
      ],
      beaten: [
        'I oiled the rails. Thirty years. I used to hold the wheel so the children could run the aisles.',
        'Nobody was ever in there when I wound it. I always called first. I always, always called first.',
      ],
      coins: 260,
    },
    {
      id: fallenId('remembrance', 'something-missing'),
      court: 'remembrance',
      name: 'Something Missing',
      foeName: 'Dulcie Pargeter, Window-Dresser',
      foeElement: 'subterfuge',
      difficulty: 5,
      hpMult: 1.25,
      gimmick: fallenId('remembrance', 'something-missing'),
      at: { x: 860, y: 1180 },
      look: { body: 0xe0c8b0, accent: 0x1e4a36, hat: 'domino', traits: ['scarf', 'satchel'], size: 0.92, eye: EYE },
      challenge: [
        'I dress the windows on Pawn Row. Everyone stops to look. Nobody ever notices what\'s gone by morning.',
        'The Prince lets me keep one piece a week. A girl has to be paid. Look closely now. Closer.',
        'There. Seven lovely things. Remember them, because in a moment one of them will be mine.',
      ],
      beaten: [
        'I took them out of the windows. At night. And left them on doorsteps, wrapped, with the ticket torn.',
        'For the people they belonged to. Not for him. Never for him. Why did I think it was for him?',
      ],
      coins: 280,
    },
  ],
};
