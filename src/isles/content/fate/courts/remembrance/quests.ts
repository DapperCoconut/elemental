import type { QuestDef } from '../../../../IslesTypes';
import { LEDGER, SHELVES, SQUARE } from './area';
import { FISH_FLUKE, FISH_KOI } from './items';
import { Q_ARCHIVE, Q_ELSIE, Q_FLUKES, Q_FORTY_ONE, Q_PORTRAIT } from './npcs';

/**
 * The Remembrance Court's five side quests.
 *
 * Between them they show what pawning a memory costs and who keeps the books: a widower's
 * lapsed pledge (Tobiah), what the Lethe does with what it takes (Mother Sudds), the gallery
 * where pawned faces fade from their frames (Oriel), the struck-through names of the busted
 * (Forty-One), and finally the Prince himself, who was never drawn (Steward Lisle). Each is
 * somebody getting one thing back.
 */
export const REMEMBRANCE_QUESTS: QuestDef[] = [
  // ── 1. Elsie's Face — talk + visit + duel ────────────────────────────
  {
    id: Q_ELSIE,
    area: 'remembrance',
    name: 'Elsie\'s Face',
    giver: 'remembrance-tobiah',
    offer: [
      'They took my wife\'s face for the pledge. Elsie. Two Draws back. The ticket lapses at tomorrow\'s Draw.',
      'I can\'t pay the fee. Nobody can. But a lapsed bottle sits on the Unclaimed Shelves till it\'s poured.',
      'If somebody just… carried it out of the court before the crate went down. Would you ask Tally where?',
    ],
    accept: [
      'Number 2207. Blue bottle, yellow ribbon. Tally\'s, two doors up Pawn Row. Bless you.',
    ],
    stages: [
      {
        objective: {
          kind: 'talk', npc: 'remembrance-tally',
          lines: [
            '2207. Wren. I drew that one myself. She was laughing in it. He kept laughing after, poor man, at nothing.',
            'Lapsed pledges go to the Unclaimed Shelves by the Ledger Office. The Appraiser checks them out.',
            'I never told you that. And if you take it, she\'ll know. She counts by the colour.',
          ],
        },
        hint: 'Ask Miriam Tally on Pawn Row where pledge 2207 is shelved',
      },
      {
        objective: { kind: 'visit', area: 'remembrance', at: { x: SHELVES.x, y: SHELVES.y + 50 }, r: 80, label: 'The Unclaimed Shelves' },
        hint: 'Find bottle 2207 on the Unclaimed Shelves by the Ledger Office',
      },
      {
        objective: {
          kind: 'duel', area: 'remembrance',
          foe: {
            id: 'remembrance-q-elsie-duel',
            court: 'remembrance',
            name: 'Lapsed Stock',
            foeName: 'Appraiser Sorrel Dimm',
            foeElement: 'memory',
            difficulty: 4,
            hpMult: 0.95,
            gimmick: '',
            at: { x: SHELVES.x + 40, y: SHELVES.y + 140 },
            look: { body: 0xd4c0a4, accent: 0x5a8ee0, hat: 'visor', traits: ['glasses', 'book', 'satchel'], size: 1.05, eye: 0x8ac8f6 },
            challenge: [
              'Blue, yellow ribbon, 2207. Lapsed. A lapsed memory is the property of His Highness until it is poured.',
              'A man\'s wife\'s face, gone in the water, is a sad thing. A man stealing it back is a theft. Hand it over.',
              'I appraise everything that goes in the Lethe. I\'d appraise you, but you\'re not worth the cork.',
            ],
            beaten: ['…Write it as poured. I\'ll write it as poured. One blue bottle. Nobody counts the ribbons.'],
            coins: 120,
          },
        },
        hint: 'See off Appraiser Sorrel Dimm at the Unclaimed Shelves',
      },
    ],
    complete: [
      'Oh. Oh, look at her. She was — she had a gap in her teeth. I forgot that. Of course she did.',
      'Here. It\'s the money for the fee. I\'d never have had enough. I can spend it on flowers for her, now.',
    ],
    reward: { orbs: 10, coins: 160 },
  },

  // ── 2. What the Water Took — fish + deliver + duel ───────────────────
  {
    id: Q_FLUKES,
    area: 'remembrance',
    name: 'What the Water Took',
    giver: 'remembrance-sudds',
    offer: [
      'My Ned pawned his mother at nine for the pledge. It lapsed. I poured it in myself. My own daughter.',
      'The flukes in the Lethe feed on what we pour. Some say a fluke\'s belly keeps a little, if it\'s fresh.',
      'Catch me two forgetful flukes off the Lethe. Fortune rod, mind. I\'ll open them. I\'ve a knack.',
    ],
    accept: [
      'Off the jetty or the banks, either. Flukes come up pale. If they glow inside, all the better.',
    ],
    stages: [
      {
        objective: { kind: 'fish', fish: FISH_FLUKE, count: 2 },
        hint: 'Catch 2 forgetful flukes in the Lethe (fortune rod)',
      },
      {
        objective: {
          kind: 'deliver', npc: 'remembrance-sudds', item: FISH_FLUKE, count: 2,
          lines: [
            'Two. Good. Hold the bowl. …Nothing in this one. And this — oh. Oh, look. A light. A little bead of it.',
            'That\'s her. That\'s her humming. Ned\'s mother humming in the kitchen. I\'ll get it in a bottle —',
            'Blast. The Lethe-Warden. She walks the banks for exactly this. Don\'t let her near the bowl.',
          ],
        },
        hint: 'Bring the 2 flukes to Mother Sudds at the washhouse',
      },
      {
        objective: {
          kind: 'duel', area: 'remembrance',
          foe: {
            id: 'remembrance-q-flukes-duel',
            court: 'remembrance',
            name: 'Nothing Comes Back',
            foeName: 'Lethe-Warden Pell Grey',
            foeElement: 'soul',
            difficulty: 5,
            hpMult: 0.95,
            gimmick: 'remembrance-lethe',
            at: { x: 1660, y: 1130 },
            look: { body: 0xc4c8c4, accent: 0x9fb4b2, hat: 'cowl', traits: ['lantern', 'cane'], size: 1.1, eye: 0xf2f8f4 },
            challenge: [
              'What the Lethe takes it keeps. That is the whole of its mercy. Nothing comes back to hurt anyone.',
              'You are holding a fluke\'s bead in a washerwoman\'s bowl. That is the water\'s, and the water is the Prince\'s.',
              'Into the pools with you, then. Let\'s see what you forget first.',
            ],
            beaten: ['…Keep the bead. I had a mother who hummed. I can\'t remember the tune. Go on.'],
            coins: 120,
          },
        },
        hint: 'Drive off Lethe-Warden Pell Grey on the Lethe\'s west bank',
      },
    ],
    complete: [
      'He listened to it. Ned. Held the bottle to his ear like a shell. Then he said "she hummed when she cooked".',
      'Here. A koi from the Lethe — the keepsake kind. They say it brings back what you\'ve lost. Eat it, love.',
    ],
    reward: { orbs: 11, coins: 120, item: FISH_KOI, itemCount: 1 },
  },

  // ── 3. The Torn Portrait — talk + collect + defeat ───────────────────
  {
    id: Q_PORTRAIT,
    area: 'remembrance',
    name: 'The Torn Portrait',
    giver: 'remembrance-oriel',
    offer: [
      'My mother pawned her own face for my sister\'s week, years ago. Her portrait in the gallery went blank.',
      'Blank, I could bear. I\'d painted her once; I could paint her again. Then the Curator tore it down.',
      'The strips blew across the forecourt. I\'ve the sketch she was painted from. Find me the canvas?',
    ],
    accept: [
      'Brown on the back, gilt edge on one side. Four strips. Mind the camera, it bites.',
    ],
    stages: [
      {
        objective: {
          kind: 'collect', area: 'remembrance', label: 'A strip of canvas', emoji: '🖼️', color: 0xd2a448,
          spots: [{ x: 880, y: 490 }, { x: 360, y: 650 }, { x: 700, y: 650 }, { x: 150, y: 500 }],
        },
        hint: 'Gather 4 strips of the torn portrait round the gallery forecourt',
      },
      {
        objective: {
          kind: 'talk', npc: 'remembrance-oriel',
          lines: [
            'All four. Look, you can see her chin. Her collar. I\'ll stitch them on a fresh stretcher tonight.',
            'And I\'ll hang it back. Myself. The Curator will be on the forecourt when I do. She always is.',
            'She\'ll have to get past you first.',
          ],
        },
        hint: 'Bring the strips back to Oriel Fenn at her easel',
      },
      {
        objective: { kind: 'defeat', encounter: 'remembrance-portrait-gallery' },
        hint: 'Face Curator Likeness (Portrait Gallery) on the gallery forecourt',
      },
    ],
    complete: [
      'It\'s up. Patched, but up, and her face is in it, the way I painted it. People keep stopping.',
      'Take my commission for the frame. The gallery will never pay me now. I\'ll be painting for free from here.',
    ],
    reward: { orbs: 10, coins: 140 },
  },

  // ── 4. A Name in the Ledger — visit + talk + duel ────────────────────
  {
    id: Q_FORTY_ONE,
    area: 'remembrance',
    name: 'A Name in the Ledger',
    giver: 'remembrance-forty-one',
    offer: [
      'A busted man may not speak his name. After eleven years I couldn\'t if I were allowed. It\'s gone.',
      'It\'s in the Ledger Office. Every name that was busted is in there, struck through. Not to be read.',
      'If someone held the page to the window… and read it to me. Just once. I\'d sweep happier.',
    ],
    accept: [
      'The Ledger Office is at the top of the east lane. Quill keeps the books. He\'s not unkind. Just afraid.',
    ],
    stages: [
      {
        objective: { kind: 'visit', area: 'remembrance', at: { x: LEDGER.x, y: LEDGER.y + 40 }, r: 70, label: 'The Ledger Office' },
        hint: 'Go to the Ledger Office at the head of the east lane',
      },
      {
        objective: {
          kind: 'talk', npc: 'remembrance-quill',
          lines: [
            'The busted ledger? Struck names are not to be read. …Forty-One, you say. Eleven years? Sweeping?',
            'Give me the window. Here. Under the line: "Mabbott, Hollis. Wagered for re-draw of daughter, Clem."',
            'Oh — no. The Censor. She heard the book creak. Reading creaks higher. I told you it did.',
          ],
        },
        hint: 'Ask Absalom Quill to read the struck name under the window',
      },
      {
        objective: {
          kind: 'duel', area: 'remembrance',
          foe: {
            id: 'remembrance-q-forty-one-duel',
            court: 'remembrance',
            name: 'Struck Through',
            foeName: 'Censor Blotte Ruling',
            foeElement: 'ink',
            difficulty: 5,
            gimmick: '',
            at: { x: 2150, y: 690 },
            look: { body: 0xc8b49c, accent: 0x141210, hat: 'mitre', traits: ['book', 'glasses', 'tool'], size: 1.1, eye: 0x2e241c },
            challenge: [
              'A struck name is a closed account. Read it aloud and you open it. The House does not reopen accounts.',
              'I keep the ink, stranger. Blacker than the House\'s chips. One line, and a man is a number.',
              'You read one aloud. I shall have to strike you too.',
            ],
            beaten: ['…Hollis Mabbott. There. I\'ve said it. My nib\'s shaking. It never shakes.'],
            coins: 120,
          },
        },
        hint: 'Stop Censor Blotte Ruling outside the Ledger Office',
      },
    ],
    complete: [
      'Hollis. HOLLIS. Mabbott! I\'m Hollis Mabbott, and my daughter is Clem, and she\'s twenty now. Clem.',
      'Here — my sweeping wages, eleven years of them. I never had anything to spend them on. Now I have a name.',
    ],
    reward: { orbs: 12, coins: 150 },
  },

  // ── 5. Through the Wrong End — talk + visit + prince ─────────────────
  {
    id: Q_ARCHIVE,
    area: 'remembrance',
    name: 'Through the Wrong End',
    giver: 'remembrance-lisle',
    requires: { courtReady: 'remembrance' },
    offer: [
      'All five. His Highness watched every one through the glass. He has asked for the reading room swept.',
      'Before you go up, you ought to know who he was. His nurse lives on the Quiet Street. Rosamund Beck.',
      'And stand before the Unclaimed in the square a moment. He did, as a boy. He won\'t say why.',
    ],
    accept: [
      'Beck first, then the square. I\'ll leave the Archive doors ajar.',
    ],
    stages: [
      {
        objective: {
          kind: 'talk', npc: 'remembrance-beck',
          lines: [
            'Little Hindsight. He watched the Draws from the nursery window and cried for every number called.',
            'His father told him to stop looking forward if it upset him. Look back instead, he said. It\'s done.',
            'So the boy learnt to. And then he learnt to keep it — everybody\'s past, in bottles, where it\'s safe.',
            'The statue in the square. He used to stand there. It was me, once. Before I pawned my own face.',
          ],
        },
        hint: 'Hear Rosamund Beck on the Quiet Street',
      },
      {
        objective: { kind: 'visit', area: 'remembrance', at: { x: SQUARE.x, y: SQUARE.y + 92 }, r: 70, label: 'The Unclaimed' },
        hint: 'Stand before the Unclaimed in Redemption Square',
      },
      {
        objective: { kind: 'prince', prince: 'hindsight' },
        hint: 'Face Prince Hindsight at the Archive',
      },
    ],
    complete: [
      'He has opened the reading room. He is reading tickets aloud and handing bottles back by number.',
      'He went down to the Quiet Street before he started. He scraped one window. Hers.',
      'The steward\'s purse, with his thanks. He asked me to say: he is sorry it took him so long to look ahead.',
    ],
    reward: { orbs: 13, coins: 260 },
  },
];
