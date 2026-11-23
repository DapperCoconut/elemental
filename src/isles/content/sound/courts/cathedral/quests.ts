import type { QuestDef } from '../../../../IslesTypes';
import { ORGAN_DOOR, PAUPER_CANDLES, RUBY_SHARDS, VENTS } from './area';
import { FISH_CHAR, FISH_VENDACE } from './items';
import { Q_COMPLINE, Q_GLASS, Q_TALLOW, Q_VESPERS, Q_VOICE } from './npcs';

/**
 * The Cathedral Court's five side quests.
 *
 * The summit is where every muted voice on Choirholm ends up, so between them these are about
 * what people do with the ones they have lost: a mother sending word up the Organ's wind (Agathe),
 * a chorister hiding a breaking voice (Tobiah), a glazier leading her husband's face into the
 * Maestro's window (Ysolde), a verger who has written "nil" for the poor for forty years (Osric),
 * and finally the Precentor's account of who Vesper was before she was the Maestro's (Dulcie).
 */
export const CATHEDRAL_QUESTS: QuestDef[] = [
  // ── 1. Word Up the Wind — talk + collect + duel ──────────────────────
  {
    id: Q_COMPLINE,
    area: 'cathedral',
    name: 'Word Up the Wind',
    giver: 'cathedral-agathe',
    offer: [
      '(whispering) The Organ breathes through grilles in the yard. Simeon says what the wind takes, the pipes hear.',
      'I want to send my Wren something. Not a word — words are noise, they\'d fine me. A ribbon. White, like his.',
      'I\'m too old to kneel at the grilles. Simeon knows which ones feed the seventh pipe. Will you ask him?',
    ],
    accept: [
      'Simeon\'s by the Angelus bell. He signs slowly for strangers. Be patient with his hands; they\'re all he has.',
    ],
    stages: [
      {
        objective: {
          kind: 'talk', npc: 'cathedral-simeon',
          lines: [
            '(He listens, then nods hard. He holds up seven fingers, and points up the mountain.)',
            '(He draws three grilles in the snow with his boot: west, east, and one by the door. WIND. ALL THREE. SEVENTH.)',
            '(He mimes tying a knot. Then he puts a finger to his lips, and points at the yard: TUNER. WATCHING.)',
          ],
        },
        hint: 'Ask Old Simeon by the Angelus bell which grilles feed the seventh pipe',
      },
      {
        objective: {
          kind: 'collect', area: 'cathedral', label: 'Tie a white ribbon to the grille', emoji: '🎀', color: 0xfaf8f2,
          spots: VENTS.map((v) => ({ x: v.x - 30, y: v.y + 24 })),
        },
        hint: 'Tie Agathe\'s white ribbons to the 3 wind-grilles in the Organ Yard',
      },
      {
        objective: {
          kind: 'duel', area: 'cathedral',
          foe: {
            id: 'cathedral-q-compline-duel',
            court: 'cathedral',
            name: 'The Organ Takes No Messages',
            foeName: 'Tuner Absolom Fork',
            foeElement: 'sound',
            difficulty: 5,
            hpMult: 0.95,
            gimmick: '',
            at: { x: 1120, y: 250 },
            look: { body: 0xb8b0a8, accent: 0xb8c0cc, hat: 'tophat', traits: ['tool', 'glasses'], size: 1.15, eye: 0xeef2fa },
            challenge: [
              'Ribbons on the grilles. In the wind. Fluttering. Do you know what a fluttering ribbon does to the tuning?',
              'The Organ takes voices. It does not take post. I struck the boy\'s Part myself. A flat B. I remember it.',
              'Take them down, or I tune you.',
            ],
            beaten: ['…Leave them. Leave them up. A flat B. I always thought it was rather a nice flat B.'],
            coins: 140,
          },
        },
        hint: 'Face Tuner Absolom Fork in the Organ Yard',
      },
    ],
    complete: [
      'At Compline the seventh pipe went flat. One bar. Flat as a pancake. The Precentor looked up at the roof.',
      'He heard. My boy heard. Take this — it was for his candles. I\'ll not need to buy him candles now.',
    ],
    reward: { orbs: 12, coins: 120 },
  },

  // ── 2. A Breaking Voice — fish + deliver + duel ──────────────────────
  {
    id: Q_VOICE,
    area: 'cathedral',
    name: 'A Breaking Voice',
    giver: 'cathedral-tobiah',
    offer: [
      '(whispering) My voice cracked at the Magnificat. Brother Quell wrote it down. If it cracks again, I\'m muted.',
      'Gran used to make char-and-honey for her throat. She held her high note through three winters on it.',
      'The char are in the cloister pond, under the ice. I can\'t fish — I can\'t be seen not practising. Could you?',
    ],
    accept: [
      'Two char. The speckled ones. Then Sister Fenella will make it — she\'s the infirmarian. She knows Gran\'s cure.',
    ],
    stages: [
      {
        objective: { kind: 'fish', fish: FISH_CHAR, count: 2 },
        hint: 'Catch 2 chorister char through the ice of the cloister pond',
      },
      {
        objective: {
          kind: 'deliver', npc: 'cathedral-fenella', item: FISH_CHAR, count: 2,
          lines: [
            'Char! For Penn? Char-and-honey, then, and a pinch of salt. His granny\'s poultice. Tough as a gargoyle, she was.',
            '(She works quickly.) There. Warm on the throat before Vespers. Go — Brother Quell is on the walk. Listening.',
          ],
        },
        hint: 'Bring the 2 char to Sister Fenella at the cloister pond',
      },
      {
        objective: {
          kind: 'duel', area: 'cathedral',
          foe: {
            id: 'cathedral-q-breaking-voice-duel',
            court: 'cathedral',
            name: 'Noise, Between the Hours',
            foeName: 'Hush-Warden Brother Quell',
            foeElement: 'silence',
            difficulty: 5,
            hpMult: 0.95,
            gimmick: 'cathedral-confessional',
            at: { x: 470, y: 800 },
            look: { body: 0xc4b8ac, accent: 0x4a4a60, hat: 'earmuffs', traits: ['lantern', 'book'], size: 1.1, eye: 0xd8dade },
            challenge: [
              'Penn. Chorister, decani. A crack at the Magnificat, a squeak behind the choir school, a cough at Matins.',
              'And now a poultice. Carried by a stranger, wrapped in a stranger\'s cloth. Noise, and conspiracy to noise.',
              'Hand it here. I\'ll write you down too. I write everybody down.',
            ],
            beaten: ['…The ink\'s run. In the snow. I can\'t read what I wrote about him. I can\'t read any of it.'],
            coins: 140,
          },
        },
        hint: 'Get past Hush-Warden Brother Quell by the choir school',
      },
    ],
    complete: [
      'High G! I held it! Right through Vespers! I only squeaked on the Amen, and nobody minds the Amen.',
      'Here — it\'s my prize money from the Christmas solo. I won\'t win it next year. I\'ll be a goose. Take it.',
    ],
    reward: { orbs: 11, coins: 100, item: FISH_VENDACE, itemCount: 1 },
  },

  // ── 3. The Face in the Glass — collect + talk + duel ─────────────────
  {
    id: Q_GLASS,
    area: 'cathedral',
    name: 'The Face in the Glass',
    giver: 'cathedral-ysolde',
    offer: [
      'The new pane goes up tomorrow. The Maestro in glory. And in the border — small — my Jory. Nearly done.',
      'I need three bits of ruby flash for his cheeks and his mouth. He had a red mouth. He was always singing.',
      'I hid the ruby in the snow round the yard, in case Canon Vane searched the shed. Would you dig them up?',
    ],
    accept: [
      'Round the kiln-yard, pushed into the drifts. Little red glints. Mind your fingers, the edges are mean.',
    ],
    stages: [
      {
        objective: {
          kind: 'collect', area: 'cathedral', label: 'A shard of ruby flash-glass', emoji: '🔴', color: 0xd8283c,
          spots: RUBY_SHARDS,
        },
        hint: 'Find the 3 pieces of ruby glass hidden in the snow round the kiln-yard',
      },
      {
        objective: {
          kind: 'talk', npc: 'cathedral-ysolde',
          lines: [
            '(She leads the three pieces in by lamplight, tongue between her teeth.) There. There he is. Look.',
            'Smiling. He\'s smiling, in the Maestro\'s window, the size of my thumbnail. Every Vespers the sun will…',
            'Oh no. That\'s Canon Vane\'s lantern on the close. He\'s come to inspect. He\'ll have his lens.',
          ],
        },
        hint: 'Bring the ruby to Ysolde Quarrel at her kiln',
      },
      {
        objective: {
          kind: 'duel', area: 'cathedral',
          foe: {
            id: 'cathedral-q-face-in-glass-duel',
            court: 'cathedral',
            name: 'Inspected for Heresy',
            foeName: 'Canon Lucent Vane',
            foeElement: 'crystal',
            difficulty: 5,
            hpMult: 1,
            gimmick: 'cathedral-rose-window',
            at: { x: 900, y: 1050 },
            look: { body: 0xd8d4cc, accent: 0x2f5ed8, hat: 'mitre', traits: ['glasses', 'cane'], size: 1.05, eye: 0xbfe0ee },
            challenge: [
              'Every pane that goes into that window passes under my lens. Every one. I find a fault in one in three.',
              'And here, in the border — a face. A muted face. With a mouth. OPEN. Mid-song. In HIS window.',
              'Out on the light with you. We\'ll see how you look with the sun through you.',
            ],
            beaten: ['…I can\'t see anything. My lens is cracked. Put it up. I shall inspect it again in, oh, a century.'],
            coins: 140,
          },
        },
        hint: 'Stop Canon Lucent Vane from breaking the pane',
      },
    ],
    complete: [
      'It\'s up. Jory\'s in the rose, at the edge, in red. Tonight the sun went through him onto the close.',
      'Three pilgrims stopped and looked at the floor where his face was. They didn\'t know why. Here — take this.',
    ],
    reward: { orbs: 12, coins: 110 },
  },

  // ── 4. Nil — collect + defeat ────────────────────────────────────────
  {
    id: Q_TALLOW,
    area: 'cathedral',
    name: 'Nil',
    giver: 'cathedral-osric',
    offer: [
      '(whispering) Forty years I\'ve counted candles. Paid flames go in the book. The pilgrims\' stubs go as "nil".',
      'And Taper snuffs them. Every one, every night. A pauper\'s prayer for a muted child — nil. Snuffed.',
      'Tonight I want to write a number. Light four stubs on the stair. Just four. Here\'s my taper.',
    ],
    accept: [
      'Along the stair, pushed into the snow. Light them and walk on. Don\'t look back. Taper will come.',
    ],
    stages: [
      {
        objective: {
          kind: 'collect', area: 'cathedral', label: 'Light a pauper\'s stub', emoji: '🕯️', color: 0xffc44a,
          spots: PAUPER_CANDLES,
        },
        hint: 'Light 4 pauper candle-stubs in the snow along the Pilgrim Stair',
      },
      {
        objective: { kind: 'defeat', encounter: 'cathedral-candle-vigil' },
        hint: 'Stop Votary Taper (Candle Vigil) before she snuffs them, in the Votive Forest',
      },
    ],
    complete: [
      'Four. I wrote FOUR. In ink. And then forty more, because people saw yours and lit their own from them.',
      'Forty-four. I\'ve never written a pauper\'s number. My hand shook so much the four looks like a nine.',
    ],
    reward: { orbs: 11, coins: 100 },
  },

  // ── 5. Vespers — talk + visit + prince ───────────────────────────────
  {
    id: Q_VESPERS,
    area: 'cathedral',
    name: 'Vespers',
    giver: 'cathedral-dulcie',
    requires: { courtReady: 'cathedral' },
    offer: [
      'She\'ll fight you at Vespers. She always sings at Vespers. Before you go in, you ought to know who she was.',
      'Simeon rang her naming bell, forty years ago. He knows her note — her own Part, before the Maestro took it.',
      'Ask him. Then go and stand at the Bellows Door at the Hour and listen. Then go in to her.',
    ],
    accept: [
      'Simeon first. Then the Organ Yard. I\'ll hold the choir back. Tonight she sings alone.',
    ],
    stages: [
      {
        objective: {
          kind: 'talk', npc: 'cathedral-simeon',
          lines: [
            '(He signs: VESPER. SMALL. He holds a hand at a child\'s height. CLEAR. BRIGHT. He touches his ear and smiles.)',
            '(He signs: HER NOTE — and he reaches up and rings the Angelus once, very softly. A high E.)',
            '(He signs: MAESTRO CAME. TOOK THE REED. "MINE NOW." He pinches his own collar. Then he looks away.)',
          ],
        },
        hint: 'Ask Old Simeon about Vesper\'s naming',
      },
      {
        objective: { kind: 'visit', area: 'cathedral', at: { x: ORGAN_DOOR.x, y: ORGAN_DOOR.y + 100 }, r: 90, label: 'The Bellows Door at Vespers' },
        hint: 'Stand at the Bellows Door in the Organ Yard and listen at the Hour',
      },
      {
        objective: { kind: 'prince', prince: 'vesper' },
        hint: 'Face Prince Vesper at the west doors of the cathedral',
      },
    ],
    complete: [
      'She came out of the chancel and asked me for a tuning fork. I gave her one. She struck it and listened.',
      'Then she asked for an E. I struck one. She sang it — just the one note, very small — and sat down on the step.',
      'The choir fund. She says the choir is to sing what it likes now. It will cost a fortune in throat sweets.',
    ],
    reward: { orbs: 14, coins: 260 },
  },
];
