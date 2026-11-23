import type { EncounterDef, GimmickDef } from '../../../../IslesTypes';
import { REDACTED } from './gimmicks/redacted';
import { ORIGAMI } from './gimmicks/origami';
import { PROMPTER } from './gimmicks/prompter';
import { PAPER_LANTERNS } from './gimmicks/lanterns';
import { FOLIO_STORM } from './gimmicks/folioStorm';

/**
 * The Libretto Court's five champions — the clerks of Prince Folio's words. Tier 2 of Choirholm
 * (difficulty 4,5,5,5,5). In from Carillon Quay along Lantern Street you meet Wick lighting the
 * strings; Cue at the Proving Stage by the west scriptorium; Crease among the drying lines in
 * the mill yard; Blackline on the step of the Censor's Office under the red pen; and Spine at
 * the head of the North Road, where the cave-wind comes down off the mountain.
 */

export const LIBRETTO_GIMMICKS: GimmickDef[] = [REDACTED, ORIGAMI, PROMPTER, PAPER_LANTERNS, FOLIO_STORM];

const COINS = 115;

export const LIBRETTO_ENCOUNTERS: EncounterDef[] = [
  {
    id: 'libretto-lanterns',
    court: 'libretto',
    name: 'Paper Lanterns',
    foeName: 'Lamplighter Wick',
    foeElement: 'fire',
    difficulty: 4,
    gimmick: 'libretto-lanterns',
    at: { x: 1750, y: 770 },
    look: { body: 0xd8b494, accent: 0xffc870, hat: 'cap', traits: ['lantern', 'satchel'], size: 1, eye: 0xffd070 },
    challenge: [
      '(whispering) Mind the strings. I light every lantern on this street at dusk, and they don\'t like strangers.',
      'Paper and flame. You\'d think they\'d hate each other. They don\'t. They just can\'t stop.',
      'Let\'s see which of us is standing nearer when one of them catches.',
    ],
    beaten: [
      'Burnt to the frame. Ah well. I\'ve a thousand more to paste before Vespers.',
      '(whispering) Go on. Keep to the middle of the street, where it\'s light.',
    ],
    coins: COINS,
  },
  {
    id: 'libretto-prompter',
    court: 'libretto',
    name: 'The Prompter',
    foeName: 'Prompter Cue',
    foeElement: 'dream',
    difficulty: 5,
    gimmick: 'libretto-prompter',
    at: { x: 820, y: 712 },
    look: { body: 0xc8b8c8, accent: 0x3a2a4a, hat: 'hood', traits: ['book', 'glasses'], size: 0.9, eye: 0xc8a8ff },
    challenge: [
      'Every verse in the Score is read aloud on this stage first. I\'ve fed every one of them from the box.',
      'Thirty years in a hole in the floor. I know what every actor will say before they do.',
      'Your cue, stranger. Don\'t dry.',
    ],
    beaten: [
      'You found your lines. Nobody finds their own lines here. That\'s rather the point of me.',
      'Take a bow. Quietly. The Hush wardens can hear an encore from the cathedral.',
    ],
    coins: COINS,
  },
  {
    id: 'libretto-origami',
    court: 'libretto',
    name: 'Origami',
    foeName: 'Folder Crease',
    foeElement: 'air',
    difficulty: 5,
    gimmick: 'libretto-origami',
    at: { x: 330, y: 945 },
    look: { body: 0xe8d8c4, accent: 0xf05a5a, hat: 'none', traits: ['scarf', 'satchel'], size: 1.05, eye: 0xd0e0f8 },
    challenge: [
      'A thousand cranes for Matins. Every year. The Maestro likes them hung in the nave, turning.',
      'I don\'t fold them with my hands any more. I breathe on the paper and it remembers what to do.',
      'They fly at whoever\'s nearest. I\'ve always found that very fair.',
    ],
    beaten: [
      'Crumpled. All of them. Do you know how long a crane takes? No. Nobody ever asks.',
      'Take one. Not a crumpled one. A proper one. For luck.',
    ],
    coins: COINS,
  },
  {
    id: 'libretto-redacted',
    court: 'libretto',
    name: 'Redacted',
    foeName: 'Censor Blackline',
    foeElement: 'ink',
    difficulty: 5,
    hpMult: 1.05,
    gimmick: 'libretto-redacted',
    at: { x: 1250, y: 1415 },
    look: { body: 0xb8aca0, accent: 0xc8242c, hat: 'tophat', traits: ['glasses', 'book', 'cane'], size: 1.15, eye: 0xf05a5a },
    challenge: [
      'You are standing in front of the Censor\'s Office without a proof. That is a noise. Noise is fined.',
      'I read every word written on this terrace before it is sung. I strike half. The half I keep is the Score.',
      'Let us see how much of you is worth keeping.',
    ],
    beaten: [
      'Struck through. Me. I shall have to fill in a form about it, and then strike that out.',
      '…Go. Before I find a word for what you are.',
    ],
    coins: COINS,
  },
  {
    id: 'libretto-folio-storm',
    court: 'libretto',
    name: 'Folio Storm',
    foeName: 'Binder Spine',
    foeElement: 'tempest',
    difficulty: 5,
    gimmick: 'libretto-folio-storm',
    at: { x: 1330, y: 262 },
    look: { body: 0xc4a888, accent: 0x6a2e22, hat: 'helmet', traits: ['apron', 'tool', 'beard'], size: 1.25, eye: 0xd8a93c },
    challenge: [
      'The cave-wind comes down this road and every loose page in Libretto goes with it. I catch them. I bind them.',
      'Sixteen pages to a quire, twelve quires to a Score, a Score to every house. Stitched tight.',
      'You look like a loose page to me.',
    ],
    beaten: [
      'Shook me off. Clean. I\'ve bound grown men tighter than that in a gale.',
      'Mind the door. It moves when nobody\'s looking. I never did find out who moves it.',
    ],
    coins: COINS,
  },
];
