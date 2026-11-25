import type { FallenBundle } from '../../../../../IslesTypes';
import { fallenId } from '../../../../meteor/spec';
import { FALLEN_BELLS } from './bells';
import { FALLEN_CORTEGE } from './cortege';
import { FALLEN_HUSH } from './hush';
import { FALLEN_MILL } from './mill';
import { FALLEN_WALL } from './wall';

/**
 * The Ossuary Court's Fallen Five — in the star's telling, the people of the garden of the dead who
 * kept it tidy for the crown: the mourning-warden who wrote down whoever wept aloud, the scraper
 * who took the names off the Pruned's Wall, the miller who never asked whose bones were in the trough, the
 * sexton who cut the cords of the bells that rang, and the brother who led the night procession.
 * Tier 3: difficulty 4,4,5,5,5; coins double the court's 80. They stand on open ground clear of the
 * court's own five: the road east of the Throne, the west of the Pruned's Wall, the Hunters' Lane
 * south of the garden, the open ground past the wells, and the head of the Long Beds.
 */

const EYE = 0xffa040;

export const FALLEN: FallenBundle = {
  gimmicks: [FALLEN_HUSH, FALLEN_WALL, FALLEN_MILL, FALLEN_BELLS, FALLEN_CORTEGE],
  encounters: [
    {
      id: fallenId('ossuary', 'hush'),
      court: 'ossuary',
      name: 'Weep Without a Sound',
      foeName: 'Thomasin Scobie, Mourning-Warden',
      foeElement: 'echo',
      difficulty: 4,
      hpMult: 1.1,
      gimmick: fallenId('ossuary', 'hush'),
      at: { x: 1450, y: 780 },
      look: { body: 0xe4ccb8, accent: 0x1a1418, hat: 'veil', traits: ['book', 'scarf'], size: 1.0, eye: EYE },
      challenge: [
        'Shh. They sleep so lightly here. One sob over a bed and it\'s in my book, with the date.',
        'Mourners not admitted. Grief is untidy. Grief is loud. The Prince likes his garden quiet.',
        'Fight me if you must. But softly, dear. Every sound you make, they hear.',
      ],
      beaten: [
        'I... sat with them. The ones nobody came for. I sat with them and hummed. I never wrote a name.',
        'There was no book. There was a hymnal. Why do I remember a book?',
      ],
      coins: 160,
    },
    {
      id: fallenId('ossuary', 'wall'),
      court: 'ossuary',
      name: 'Struck from the Wall',
      foeName: 'Enoch Quarrender, Wall-Scraper',
      foeElement: 'ink',
      difficulty: 4,
      hpMult: 1.15,
      gimmick: fallenId('ossuary', 'wall'),
      at: { x: 550, y: 560 },
      look: { body: 0xcfc4b4, accent: 0x37323d, hat: 'cap', traits: ['tool', 'glasses', 'satchel'], size: 1.1, eye: EYE },
      challenge: [
        'A name on a wall is a flower on a grave. Untidy. I take them off. A letter at a time, at night.',
        'Cut it back if you like. I have a claw-chisel and all the dark there is.',
        'When I am done, nobody will remember they were here. Nobody will remember you were, either.',
      ],
      beaten: [
        'I... cut them. I was the one who cut the names in. Every one, for nothing, for the families.',
        'Tam Quill. Hesper Rook. I know them all. Why would a man who knows them all want them gone?',
      ],
      coins: 160,
    },
    {
      id: fallenId('ossuary', 'mill'),
      court: 'ossuary',
      name: 'The Bone-Meal Round',
      foeName: 'Caddoc Fenn, Bone-Miller',
      foeElement: 'earth',
      difficulty: 5,
      hpMult: 1.2,
      gimmick: fallenId('ossuary', 'mill'),
      at: { x: 1000, y: 1400 },
      look: { body: 0xb89a80, accent: 0x4a3a30, hat: 'cap', traits: ['apron', 'beard', 'tool'], size: 1.35, eye: EYE },
      challenge: [
        'Round she goes. Round and round. Nothing wasted — the roses want feeding.',
        'I don\'t ask what\'s in the trough. A miller who asks what\'s in the trough doesn\'t stay a miller.',
        'Mind your feet. The stone don\'t stop, and neither do I.',
      ],
      beaten: [
        'Corn. It was corn I ground. Barley in a bad year. The stone was for corn.',
        'Whose bones would I... no. No. I fed the whole lane in the hungry winter. That was me.',
      ],
      coins: 160,
    },
    {
      id: fallenId('ossuary', 'bells'),
      court: 'ossuary',
      name: 'The Bell Under the Lilies',
      foeName: 'Hobb Lisle, Rope-Cutter',
      foeElement: 'bind',
      difficulty: 5,
      hpMult: 1.2,
      gimmick: fallenId('ossuary', 'bells'),
      at: { x: 2200, y: 760 },
      look: { body: 0xa89078, accent: 0x2a2428, hat: 'hood', traits: ['tool', 'lantern', 'bandage'], size: 1.2, eye: EYE },
      challenge: [
        'Hear that? Little bell, over bed nine. Somebody\'s woken up down there. Not for long.',
        'Snip, and it\'s quiet. The Prince likes it quiet. A grave that rings is an untidy grave.',
        'Race you to the next one.',
      ],
      beaten: [
        'I strung them. The bells. I strung every one, so nobody would wake alone in the dark.',
        'I never cut a cord. I ran. I always ran when they rang. Why do my hands hold shears?',
      ],
      coins: 160,
    },
    {
      id: fallenId('ossuary', 'cortege'),
      court: 'ossuary',
      name: 'Never Cross the Cortège',
      foeName: 'Brother Amice, Lantern-Bearer',
      foeElement: 'memory',
      difficulty: 5,
      hpMult: 1.3,
      gimmick: fallenId('ossuary', 'cortege'),
      at: { x: 1600, y: 1440 },
      look: { body: 0xe8d4c0, accent: 0x2a2230, hat: 'cowl', traits: ['lantern', 'book'], size: 1.1, eye: EYE },
      challenge: [
        'The cart is in from the Glasshouse. We walk them to the beds. Nobody crosses. Nobody.',
        'I carry the lantern. I remember every face that cut across us, and I tell.',
        'Walk round, child, or walk with us. There is room on the bier.',
      ],
      beaten: [
        'I carried the lantern so the families could find their own. I said every name aloud.',
        'Tell? I never told. I sang. Down the whole Lily Road, I sang them home.',
      ],
      coins: 160,
    },
  ],
};
