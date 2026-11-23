import type { QuestDef } from '../../../../IslesTypes';
import { GALLEY, MILL } from './area';
import { FISH_PERCH, FISH_PIKE } from './items';

/**
 * The Libretto Court's five side quests.
 *
 * Every one is somebody's words being kept from the page, and getting them onto it: a lullaby
 * the Censor struck, set in lead and printed in secret (Quoin); ink for the muted, who can only
 * write (Hester); a boy's letters to his grandmother in the Organ, rescued from the dead-letter
 * bins (Tibb); one copyist's drawings in the margins of the Score (Fell); and last, the scrap of
 * rag-paper a mill boy once wrote a song on, before he became Prince Folio (Colophon).
 */
export const LIBRETTO_QUESTS: QuestDef[] = [
  // ── 1. The Lullaby in Lead — collect + talk + duel ───────────────────
  {
    id: 'libretto-q-lullaby',
    area: 'libretto',
    name: 'The Lullaby in Lead',
    giver: 'libretto-quoin',
    offer: [
      '(whispering) There was a lullaby on this terrace. Every mother sang it. Then the Censor struck it — "noise".',
      'I set it in lead the night before. Then I hid the type, a sort here and a sort there, so none could be melted.',
      'Four sorts left to find, and I\'ve the whole thing. Forty years of hiding in plain sight. Would you look?',
    ],
    accept: [
      'By the presses, in the type case, under the bundles by the door. Bring them to Nib. He\'s quick.',
    ],
    stages: [
      {
        objective: {
          kind: 'collect', area: 'libretto', label: 'A hidden sort of type', emoji: '🔤', color: 0x9a9ca4,
          spots: [{ x: 1760, y: 1250 }, { x: 2040, y: 1250 }, { x: 2200, y: 1300 }, { x: 1900, y: 1350 }],
        },
        hint: 'Find the 4 hidden sorts of type round the Press Hall yard',
      },
      {
        objective: {
          kind: 'talk', npc: 'libretto-nib',
          lines: [
            'Sorts! Give here. Quoin\'s forme is under the bench… there. Lock it up, ink it — lean on the bar — and…',
            'A proof. "Hush now, little one, the snow is soft." Oh. That\'s the one my mum used to sing.',
            'Oh no. Oh no, no. That\'s the Press-Inspector on the step. He weighs the type every night. He knows.',
          ],
        },
        hint: 'Take the sorts to Nib the printer\'s devil to pull a proof',
      },
      {
        objective: {
          kind: 'duel', area: 'libretto',
          foe: {
            id: 'libretto-q-lullaby-duel',
            court: 'libretto',
            name: 'Forty Copies',
            foeName: 'Press-Inspector Galley Platen',
            foeElement: 'metal',
            difficulty: 4,
            hpMult: 0.95,
            gimmick: '',
            at: { x: 1960, y: 1385 },
            look: { body: 0xa8a8a0, accent: 0x2e3036, hat: 'helmet', traits: ['tool', 'glasses'], size: 1.2, eye: 0xd8dade },
            challenge: [
              'The type is weighed every night. Last night it was four sorts heavy. Type does not grow, devil.',
              'An unproofed forme on a locked press. That is a noise in lead. I will melt it, and fine the hands.',
              'Step away from the bar.',
            ],
            beaten: ['…Weigh it again tomorrow. Perhaps the scales were wrong. Perhaps I should stop weighing things.'],
            coins: 115,
          },
        },
        hint: 'Stop Press-Inspector Galley Platen before he melts the forme',
      },
    ],
    complete: [
      'Forty copies, pulled while you had him busy. Nib\'s arms are aching. He\'s never been prouder.',
      'They\'ll go in every cradle on the terrace by morning. Here — the Press Hall\'s rainy-day tin. It\'s raining.',
    ],
    reward: { orbs: 11, coins: 110 },
  },

  // ── 2. Ink for the Signers — fish + deliver + duel ───────────────────
  {
    id: 'libretto-q-signers-ink',
    area: 'libretto',
    name: 'Ink for the Signers',
    giver: 'libretto-vellum',
    offer: [
      '(she signs, slowly: The muted cannot speak. So they write. But ink is rationed. The muted get no slip.)',
      '(signs: Gall says the nib pike in the Inkwell carry an ink the Office has never heard of. Free ink.)',
      '(signs: Two pike. For my pupils. Will you? — this sign is "please".)',
    ],
    accept: [
      '(she signs a pike with her hands — long, a pointed snout — then mimes reeling hard. They fight.)',
    ],
    stages: [
      {
        objective: { kind: 'fish', fish: FISH_PIKE, count: 2 },
        hint: 'Catch 2 nib pike in the Inkwell (they fight hard)',
      },
      {
        objective: {
          kind: 'deliver', npc: 'libretto-gall', item: FISH_PIKE, count: 2,
          lines: [
            'Two pike, and big ones. Hester sent you? Good. Give me an hour and a bucket and I\'ll have a winter of ink.',
            '…Oh, look who\'s coming down the lane with her ledger open. The Rationer. She can smell ink, that one.',
          ],
        },
        hint: 'Bring the 2 nib pike to Gall Oakapple at the Inkwell',
      },
      {
        objective: {
          kind: 'duel', area: 'libretto',
          foe: {
            id: 'libretto-q-signers-ink-duel',
            court: 'libretto',
            name: 'No Slip, No Ink',
            foeName: 'Ink-Rationer Quota Tare',
            foeElement: 'justice',
            difficulty: 5,
            hpMult: 0.95,
            gimmick: 'libretto-redacted',
            at: { x: 860, y: 1440 },
            look: { body: 0xc8bcb0, accent: 0x7a1218, hat: 'tophat', traits: ['book', 'glasses'], size: 1.05, eye: 0xc8242c },
            challenge: [
              'Ink is issued by slip. A slip is issued for the Score. The muted do not sing the Score. No slip.',
              'Unrationed ink is unaccounted ink. Unaccounted ink is how noise gets written down.',
              'I shall take the bucket. And a note of your name.',
            ],
            beaten: ['…I shall write it in the ledger as "spilt". Ink spills. Everybody knows ink spills.'],
            coins: 115,
          },
        },
        hint: 'Face Ink-Rationer Quota Tare by the Inkwell',
      },
    ],
    complete: [
      '(Hester\'s pupils come up the lane each with a full pot, holding them like eggs. She signs for a long time.)',
      '(signs: They wrote their names. All of them. Then they wrote yours. Take this — and a perch, for the road.)',
    ],
    reward: { orbs: 10, coins: 90, item: FISH_PERCH, itemCount: 2 },
  },

  // ── 3. Dead Letters — collect + visit + duel ─────────────────────────
  {
    id: 'libretto-q-dead-letters',
    area: 'libretto',
    name: 'Dead Letters',
    giver: 'libretto-tibb',
    offer: [
      'I write to my gran every week. She\'s in the Organ. Every week the Office puts the letter in the bins.',
      'Rubric says the cave-wind at the top of the North Road goes all the way up to the cathedral. Always.',
      'If somebody let my letters go up there… they might get to her pipe. Mightn\'t they? Will you?',
    ],
    accept: [
      'Three letters, blue string. The wire bins by the Office door. Then the cave-mouth, at the top of the road!',
    ],
    stages: [
      {
        objective: {
          kind: 'collect', area: 'libretto', label: 'One of Tibb\'s letters', emoji: '✉️', color: 0x5a86d8,
          spots: [{ x: 1325, y: 1368 }, { x: 1385, y: 1440 }, { x: 1130, y: 1372 }],
        },
        hint: 'Fish Tibb\'s 3 letters (blue string) out of the bins by the Censor\'s Office',
      },
      {
        objective: { kind: 'visit', area: 'libretto', at: { x: 1200, y: 110 }, r: 80, label: 'The cave-mouth wind' },
        hint: 'Let the letters go on the wind at the cave-mouth, top of the North Road',
      },
      {
        objective: {
          kind: 'duel', area: 'libretto',
          foe: {
            id: 'libretto-q-dead-letters-duel',
            court: 'libretto',
            name: 'Return to Sender',
            foeName: 'Dead-Letter Clerk Ledger Mortmain',
            foeElement: 'memory',
            difficulty: 5,
            hpMult: 1,
            gimmick: 'libretto-folio-storm',
            at: { x: 1080, y: 150 },
            look: { body: 0xb0a898, accent: 0x4e5866, hat: 'veil', traits: ['book', 'satchel', 'glasses'], size: 1.1, eye: 0x9ab8e8 },
            challenge: [
              'Every letter in those bins is filed. Read, numbered, remembered. Three are missing. Blue string.',
              'The Organ does not receive post. I have told the boy so in writing, eleven times. Filed.',
              'Hand them back, or I shall have to remember you.',
            ],
            beaten: ['…Gone up the mountain. Un-filed. I shall remember them anyway. I remember every one.'],
            coins: 115,
          },
        },
        hint: 'See off Dead-Letter Clerk Ledger Mortmain at the cave-mouth',
      },
    ],
    complete: [
      'They went UP! All three! I watched them go right up over the scriptoria and into the clouds!',
      'Gran will hear them at Compline, I bet. Here — it\'s my stamp money. I won\'t need stamps now. Not ever.',
    ],
    reward: { orbs: 12, coins: 80 },
  },

  // ── 4. Marginalia — talk + visit + defeat ────────────────────────────
  {
    id: 'libretto-q-marginalia',
    area: 'libretto',
    name: 'Marginalia',
    giver: 'libretto-fell',
    offer: [
      '(whispering) I draw in the margins of the Score. A cat. A cup. A bird on a stave. I scrape them off after.',
      'Rubric found a whole book of them and took it. He hasn\'t handed it in to the Office. I don\'t know why.',
      'I want one page of it on the Galley in the square. Just one. Just so it was there, once, for everybody.',
    ],
    accept: [
      'Rubric is in the east scriptorium. Ask him gently. Then the Galley. And then — run, probably.',
    ],
    stages: [
      {
        objective: {
          kind: 'talk', npc: 'libretto-rubric',
          lines: [
            'Ah. Fell\'s book. I have it here. I was going to hand it in. I have been going to hand it in for a month.',
            '(he turns a page. A cat, curled in the margin of the Compline verse, asleep on a crotchet.)',
            'Take it. Quickly. Before I remember my duties. And — tell her the cat on page nine is my favourite.',
          ],
        },
        hint: 'Ask Precentor Rubric for Fell\'s book of drawings',
      },
      {
        objective: { kind: 'visit', area: 'libretto', at: { x: GALLEY.x, y: GALLEY.y + 50 }, r: 70, label: 'The Galley board' },
        hint: 'Pin the cat from page nine on the Galley in Proof Square',
      },
      {
        objective: { kind: 'defeat', encounter: 'libretto-redacted' },
        hint: 'Censor Blackline is coming with his red pen — face him at the Office (Redacted)',
      },
    ],
    complete: [
      'He came with his pen and you sent him home with it! And the cat\'s still up — look, people are looking at it!',
      'I\'m going to draw another. In the middle of a page. Take my week\'s wages; I\'ll be too busy to spend them.',
    ],
    reward: { orbs: 11, coins: 100 },
  },

  // ── 5. The Rag-Boy's Song — talk + visit + prince ────────────────────
  {
    id: 'libretto-q-rag-boy',
    area: 'libretto',
    name: 'The Rag-Boy\'s Song',
    giver: 'libretto-colophon',
    requires: { courtReady: 'libretto' },
    offer: [
      'His Highness was the mill\'s rag-boy. One winter he wrote a song on a vat scrap and sang it at Vespers.',
      'The Maestro heard it and made him first chair — on condition he never write a word of his own again.',
      'He keeps the scrap in his coat. He has never struck it out. Go and hear it from Brede, at the mill. Please.',
    ],
    accept: [
      'Brede first. Then stand at the vat where the boy stood. Then the Bindery. I will leave the door on the latch.',
    ],
    stages: [
      {
        objective: {
          kind: 'talk', npc: 'libretto-brede',
          lines: [
            'Folio. Little Fol. Sorted rags at that table there from when he was six. Sang while he did it. Always singing.',
            'He wrote on the back of a bad sheet, in pencil. A song about the water-wheel. Not a good song. His.',
            'Sang it at Vespers in front of everyone. Then they came for him in a carriage. He never came back to the vat.',
          ],
        },
        hint: 'Hear about the rag-boy from Vatman Brede at the paper mill',
      },
      {
        objective: { kind: 'visit', area: 'libretto', at: { x: MILL.x - 10, y: MILL.y + 50 }, r: 70, label: 'The vat-room door' },
        hint: 'Stand at the vat-room door where the boy sorted rags',
      },
      {
        objective: { kind: 'prince', prince: 'folio' },
        hint: 'Face Prince Folio at the Bindery',
      },
    ],
    complete: [
      'He has taken the scrap out of his coat and pinned it on the Bindery door. He asked me to read it aloud.',
      'I did. It is not a very good song. He laughed — I have not heard him laugh in thirty years.',
      'He said to give you the archive\'s fund. "Spend it on something nobody approved."',
    ],
    reward: { orbs: 14, coins: 160 },
  },
];
