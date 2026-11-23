import type { AreaDef, NpcDef, NpcLook, Talk } from '../../../../IslesTypes';

/**
 * The people of the Cathedral Court.
 *
 * The summit is where the Score is *kept*: the cathedral rings the Hours for the whole isle, the
 * choir sings them first, and the Great Organ — built into the mountain behind — holds every
 * muted voice on Choirholm. People climb the Pilgrim Stair to stand under it at Compline and
 * listen for their own. Devotion is bought here by the candle (a penny a flame, paid to the
 * chandler, counted by the verger), and talk between the Hours is noise: most of the summit
 * whispers, and the muted sign. Prince Vesper sings the Vespers solo every evening, and has for
 * thirty years — the Maestro's hymn, never a note of her own.
 */

const PRINCE = { prince: 'vesper' } as const;
const MAESTRO = { monarch: 'cadenza' } as const;

export const Q_COMPLINE = 'cathedral-q-compline';
export const Q_VOICE = 'cathedral-q-breaking-voice';
export const Q_GLASS = 'cathedral-q-face-in-glass';
export const Q_TALLOW = 'cathedral-q-pauper-candles';
export const Q_VESPERS = 'cathedral-q-vespers';

export const CATHEDRAL_NPCS: NpcDef[] = [
  // ── Brother Anselm Tallowby — the shop ───────────────────────────────
  {
    id: 'cathedral-tallowby',
    name: 'Brother Anselm Tallowby',
    title: 'Chandler of the Close',
    look: { body: 0xd8c0a0, accent: 0x5a3c28, hat: 'hood', traits: ['apron', 'satchel'], size: 1.15, eye: 0xffd890 },
    at: { x: 520, y: 980 },
    role: { kind: 'shop', id: 'cathedral-shop' },
    talks: [
      {
        when: MAESTRO,
        lines: [
          'I gave a candle away this morning. Just handed it over. My hands did it before I could stop them.',
          'Then another. I am ruined, friend, and I have never slept so well. The charms are still for sale.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The Precentor says candles need not be paid for any more. I said, then what are they FOR? She laughed.',
          'Nobody\'s laughed in the close in my lifetime. Buy something, I\'m confused and I need the company.',
        ],
      },
      {
        when: { questDone: Q_TALLOW },
        lines: [
          '(whispering) Somebody lit forty pauper stubs on the stair. Unpaid. Forty prayers I never sold.',
          'Osric says it was the wind. I say the wind doesn\'t carry a taper. I say nothing else. Nothing.',
        ],
      },
      {
        lines: [
          '(whispering) Not so loud, friend — it\'s between the Hours. Candles. A penny a flame. Every flame a prayer.',
          'Prayers to the Maestro, mind. Brother Osric counts them each night and the count goes up the mountain.',
          'Below the candles I keep a few charms. Holy things. They fight better than they pray. You can wear three.',
        ],
      },
    ],
    barks: [
      { when: PRINCE, lines: ['Free candles! I suppose!', 'Take one. Take two. Oh, my heart.'] },
      { lines: ['(whisper) A penny a flame.', '(whisper) Votives, tapers, rushlights.', '(whisper) Light one for the Organ, madam?'] },
    ],
  },

  // ── Mother Agathe Wren — listens at Compline ─────────────────────────
  {
    id: 'cathedral-agathe',
    name: 'Mother Agathe Wren',
    title: 'Who Climbs Every Evening',
    look: { body: 0xd8c4b0, accent: 0x4a4a60, hat: 'veil', traits: ['cane', 'scarf'], size: 0.88, eye: 0xb8c8e0 },
    at: { x: 1020, y: 240 },
    talks: [
      {
        when: MAESTRO,
        lines: [
          'They opened the pipes. One at a time, all night. I stood here and every voice came out but his.',
          'Then — at the very last — "Mam?" Just that. Croaky. Three years of singing the Score and he croaked.',
          'He\'s gone down to the bakery for buns. He\'s eating everything. I can\'t stop crying. Go away, I\'m happy.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The Prince came up to the door tonight and stood beside me. Didn\'t say a word. Just stood. Listening.',
          'I think she was listening for herself. I didn\'t tell her you can\'t hear yourself in there. You can\'t.',
        ],
      },
      {
        when: { questDone: Q_COMPLINE },
        lines: [
          'At Compline the seventh pipe from the left went flat. Just for a bar. Just for me. He heard.',
          'Thank you. I\'ll come up tomorrow and the night after. Somebody has to listen. It\'s what mothers are for.',
        ],
      },
      {
        when: { quest: Q_COMPLINE },
        lines: [
          'Tie the ribbons to the grilles — his white ribbon, and two of mine. Simeon says the wind takes them up.',
          'He hears the ribbons. He was always good at hearing. Better at hearing than singing. That was the trouble.',
        ],
      },
      {
        lines: [
          '(whispering) Shh. Compline soon. Then I can hear him. My Wren. Seventh pipe from the left, the reedy one.',
          'He sang flat at his naming. Fourteen. The Tuners came that same night. That\'s his voice in the Organ now.',
          'It sings the Score beautifully. It never sang anything beautifully before. That\'s how I know it\'s not him.',
        ],
      },
    ],
    barks: [
      { when: MAESTRO, lines: ['He\'s eating me out of house and home!', 'Mam, he says. MAM.'] },
      { lines: ['(whisper) Seventh from the left.', '(whisper) Hush. Listen.', '(whisper) There. Did you hear? No.'] },
    ],
  },

  // ── Tobiah Penn — a chorister whose voice is breaking ────────────────
  {
    id: 'cathedral-tobiah',
    name: 'Tobiah Penn',
    title: 'Chorister, Decani Side',
    look: { body: 0xe8c8a8, accent: 0x8a1830, hat: 'none', traits: ['book', 'scarf'], size: 0.76, eye: 0x8ab0e0 },
    at: { x: 380, y: 770 },
    talks: [
      {
        when: MAESTRO,
        lines: [
          'My voice went. Properly went — I sound like a GOOSE. And nobody came. Nobody\'s coming. I\'m a goose!',
          'I sang a rude song about the Precentor at breakfast. In my goose voice. She joined in. Badly.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The Prince let us off Vespers. She sang it on her own and it sounded different. Smaller. Nicer, I think.',
          'Brother Quell\'s gone home. I can practise my squeaks in the open now and nobody writes them down.',
        ],
      },
      {
        when: { questDone: Q_VOICE },
        lines: [
          'The poultice works! Mostly. I held my high G through the whole of Vespers and only squeaked at the end.',
          'The Precentor looked at me. I looked at my book. She looked away. I think she knew. I think she let it go.',
        ],
      },
      {
        when: { quest: Q_VOICE },
        lines: [
          '(whispering) Two char from the cloister pond — the little speckled ones. Sister Fenella will know what to do.',
          'Gran made a char-and-honey poultice for the throat. She said it held her voice up through three winters.',
        ],
      },
      {
        lines: [
          '(whispering) Can you keep a secret? My voice is breaking. It went in the middle of the Magnificat.',
          'A breaking voice is a faltering voice. A faltering voice gets muted. That\'s the rule. Even for choristers.',
          'I\'m thirteen. I don\'t want to be a pipe. I want to be a goose, like my brothers. They sound terrible.',
        ],
      },
    ],
    barks: [
      { when: MAESTRO, lines: ['HONK. That was me. Isn\'t it awful?', 'I\'m a baritone! Probably!'] },
      { lines: ['(whisper) Mi, mi, mi… mi…', '(whisper) Please don\'t crack.', '(whisper) Dominus… nope.'] },
    ],
  },

  // ── Sister Fenella Frost — fishes the cloister pond ──────────────────
  {
    id: 'cathedral-fenella',
    name: 'Sister Fenella Frost',
    title: 'Infirmarian, Who Fishes',
    look: { body: 0xe4d4c4, accent: 0x6a9ab4, hat: 'veil', traits: ['rod', 'apron'], size: 1, eye: 0x9ad0ff },
    at: { x: 1980, y: 1160 },
    talks: [
      {
        when: MAESTRO,
        lines: [
          'I\'ve had nine people in the infirmary this morning with sore throats. From SINGING. Their own songs!',
          'I have never been so happy to brew a poultice. Catch me a salmon, would you? I\'m out of everything.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The ice sang last night. Not the Score — just ice, settling. It made the most terrible noise. I loved it.',
          'Cast through the holes as always. The char don\'t know anything has changed. Fish never do.',
        ],
      },
      {
        when: { questDone: Q_VOICE },
        lines: [
          'Young Penn held his note. Char-and-honey: his granny\'s cure. I should have thought of it myself.',
          'Mind — it only buys him a season. By spring he\'ll be a baritone. Let\'s hope the world has changed by spring.',
        ],
      },
      {
        lines: [
          '(whispering) The pond is frozen nine months of twelve. We fish it through the holes. An iron rod, at least.',
          'Chorister char, small and speckled. Psalm salmon, when they rise. And the vendace — they come up at Vespers.',
          'I\'m the infirmarian. When the Tuners take a voice, the throat is very sore after. I see them all.',
        ],
      },
    ],
    barks: [
      { when: PRINCE, lines: ['Ha! The ice is groaning!', 'Bite, you little char.'] },
      { lines: ['(whisper) Bite, bite…', '(whisper) Mind the thin ice by the kerb.', '(whisper) Vespers soon. Vendace rise.'] },
    ],
  },

  // ── Ysolde Quarrel — the glazier ─────────────────────────────────────
  {
    id: 'cathedral-ysolde',
    name: 'Ysolde Quarrel',
    title: 'Glazier to the Cathedral',
    look: { body: 0xd4b494, accent: 0xd8283c, hat: 'goggles', traits: ['apron', 'tool'], size: 1.05, eye: 0xf2b632 },
    at: { x: 720, y: 1240 },
    talks: [
      {
        when: MAESTRO,
        lines: [
          'Jory\'s home. He\'s sitting in my kiln-yard staring at the new pane. At his own face in it, small, at the edge.',
          'He says he looks older in glass. I said, you are. Three years in a pipe. He laughed. He has a laugh again.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The Prince came to see the rose. Saw the faces at the edge — all of them, not just my Jory\'s. Said nothing.',
          'Then she asked me to put one more in. A girl of ten. "Whoever she was," she said. I\'m cutting the glass now.',
        ],
      },
      {
        when: { questDone: Q_GLASS },
        lines: [
          'The pane\'s in. The Maestro, twelve feet high, in gold — and in the border, the size of your thumbnail, Jory.',
          'Every Vespers the sun comes through him onto the close. He\'s been muted. He hasn\'t been forgotten.',
        ],
      },
      {
        when: { quest: Q_GLASS },
        lines: [
          'Three pieces of ruby flash, the size of a fingernail, pushed into the snow round the kiln-yard. Bring them.',
          'Mind Canon Vane. He checks every pane before it goes up. With a lens. He\'d see a face at fifty paces.',
        ],
      },
      {
        lines: [
          'The new pane for the great rose. The Maestro in glory, conducting the stars. Twelve feet of him. Gold leaf.',
          'My husband Jory leaded windows with me. He sang while he worked. His own tunes. You can guess the rest.',
          'I\'ve been putting his face into the border. In tiny pieces, a few each night. Nearly done. Nearly.',
        ],
      },
    ],
    barks: [
      { lines: ['Ruby, cobalt, gold.', 'Mind the kiln — it bites.', 'Lead, glass, lead, glass.'] },
    ],
  },

  // ── Brother Osric Mallow — the verger who counts candles ─────────────
  {
    id: 'cathedral-osric',
    name: 'Brother Osric Mallow',
    title: 'Verger of the Votive Forest',
    look: { body: 0xc8b49c, accent: 0x24222a, hat: 'candle', traits: ['glasses', 'book', 'lantern'], size: 0.95, eye: 0xffc44a },
    at: { x: 660, y: 1380 },
    talks: [
      {
        when: MAESTRO,
        lines: [
          'I stopped counting. Last night. I lifted the pencil and there was nothing to write, and I set it down.',
          'There are candles in the snow for people nobody can name. I lit one for myself. Forty years. Never once.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The Prince asked to see the count. She read the whole book through, all night, and wept at the end.',
          'I don\'t know which part. I think it was the part where the pauper stubs are listed as "nil".',
        ],
      },
      {
        when: { questDone: Q_TALLOW },
        lines: [
          'The stubs burned all night. I counted them, out of habit, and then I tore the page out. Here\'s the page.',
          'No — keep it. I don\'t want it. Taper came to snuff them and you had already knocked her into the snow.',
        ],
      },
      {
        when: { quest: Q_TALLOW },
        lines: [
          '(whispering) The stubs are pushed into the snow along the stair, both sides. Light four. Just four.',
          'Taper will come. She snuffs every unpaid flame. She\'s quick, she\'s cruel, and she carries a wick-hook.',
        ],
      },
      {
        lines: [
          '(whispering) Every candle in the forest is a penny paid and a prayer to the Maestro. I count them for him.',
          'The poor push stubs into the snow on the stair. Ends of candles, begged from the gutter. For their muted.',
          'Unpaid. So Votary Taper snuffs them. I write "nil" in the book. I have written "nil" for forty years.',
        ],
      },
    ],
    barks: [
      { lines: ['(whisper) Three hundred and six…', '(whisper) …and seven.', '(whisper) Nil. Nil. Nil.'] },
    ],
  },

  // ── Precentor Dulcie Ambrose — Vesper's own precentor ────────────────
  {
    id: 'cathedral-dulcie',
    name: 'Precentor Dulcie Ambrose',
    title: 'Keeper of the Choir',
    look: { body: 0xe0ccb8, accent: 0x7a5cc8, hat: 'mitre', traits: ['book', 'glasses'], size: 1.05, eye: 0xc8b4ff },
    at: { x: 1330, y: 870 },
    talks: [
      {
        when: MAESTRO,
        lines: [
          'The choir sang Compline tonight with every voice it has. Nothing matched. Nothing was in tune. Glorious.',
          'Vesper stood at the back with the pilgrims and sang along with whatever everyone else was singing.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'She sang the Vespers alone tonight. Not his hymn — a little thing in a minor key. I didn\'t know it.',
          'Afterwards she asked me if it was hers. I said I didn\'t know. I said it could be hers now. She nodded.',
        ],
      },
      {
        when: { courtReady: 'cathedral' },
        lines: [
          'All five. Tracery, Taper, Carol, Penitent and Shrive. The Prince heard every bell of it from the chancel.',
          'She\'ll sing Vespers at you. You should know who she is first. I\'ll tell you, if you\'ll listen.',
        ],
      },
      {
        lines: [
          '(whispering) I keep the choir. Forty voices, forty Parts, each one stamped at birth. Every one in tune.',
          'The Prince sings the Vespers solo. Every evening for thirty years. People climb from the quay to hear it.',
          'If you mean to cross her, beat her five first. Nobody gets into the chancel past them. Nobody has.',
        ],
      },
    ],
    barks: [
      { when: PRINCE, lines: ['Out of tune! All of you! Lovely!', 'Sing what you like, children.'] },
      { lines: ['(whisper) Decani, cantoris.', '(whisper) In tune, Penn.', '(whisper) Breathe at the bar line.'] },
    ],
  },

  // ── Old Simeon Ropework — the muted bellringer ───────────────────────
  {
    id: 'cathedral-simeon',
    name: 'Old Simeon Ropework',
    title: 'Ringer of the Angelus (Muted)',
    look: { body: 0xc8b098, accent: 0xfaf8f2, hat: 'cap', traits: ['beard', 'scarf'], size: 1.1, eye: 0xd8dade },
    at: { x: 1640, y: 1580 },
    talks: [
      {
        when: MAESTRO,
        lines: [
          '(His voice is back. He doesn\'t use it. He climbs into the frame and rings a peal nobody has ever heard.)',
          '(It\'s the peal from his wife\'s funeral. All of it. The whole isle stops. Nobody fines anybody.)',
        ],
      },
      {
        when: PRINCE,
        lines: [
          '(He signs: SHE CAME. SHE ASKED. "WHAT WAS MY NOTE?" He points at the bell, then shakes his head.)',
          '(He signs: I KNOW. I RANG HER NAMING. SHE WAS A HIGH E. He taps his ribbon. I CAN\'T TELL HER. NO VOICE.)',
        ],
      },
      {
        when: { questDone: Q_COMPLINE },
        lines: [
          '(He signs: RIBBONS UP. THE WIND TOOK THEM. He mimes a pipe going flat, and grins without a sound.)',
        ],
      },
      {
        lines: [
          '(He wears the white ribbon at his throat. He signs, slow and big, so a stranger can follow.)',
          '(BELL. MINE. FORTY YEARS. He mimes hauling a rope. Then a coffin. Then ringing — wild, his own peal.)',
          '(Then the Tuners: two fingers pinching at his throat. Then a pipe, high on the mountain. He points up.)',
        ],
      },
    ],
    barks: [
      { lines: ['(He coils the rope.)', '(He signs: HELLO.)', '(He touches the bell, and listens with his hand.)'] },
    ],
  },

  // ── Hesper Moll — a pilgrim in the snow ──────────────────────────────
  {
    id: 'cathedral-hesper',
    name: 'Hesper Moll',
    title: 'Pilgrim from Carillon Quay',
    look: { body: 0xd0b8a0, accent: 0x6a5a4a, hat: 'hood', traits: ['pack', 'cane'], size: 0.95, eye: 0xa89878 },
    at: { x: 1100, y: 1570 },
    talks: [
      {
        when: MAESTRO,
        lines: [
          'I came up to kneel and there\'s nothing to kneel to. The Organ\'s open. Everyone\'s talking. Out LOUD.',
          'I think I\'ll go home and talk to my husband. Out loud. I don\'t know what we\'ll say. Something.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The Prince walked down the stair tonight and knelt here. Next to me. In the snow. Didn\'t say why.',
        ],
      },
      {
        lines: [
          '(whispering) I climb up every Sabbath. Two days from the quay. My knees are gone. I kneel anyway.',
          'My sister\'s in the Organ. Hums the alto line at Matins. I came to tell her the baby\'s walking.',
          'You can\'t tell them anything, of course. You just kneel near enough that you feel like you did.',
        ],
      },
    ],
    barks: [
      { lines: ['(whisper) She\'s walking now, Bett.', '(whisper) My knees…', '(whisper) Soon. Compline soon.'] },
    ],
  },
];

const looks: NpcLook[] = [
  { body: 0xd8c4b0, accent: 0x6a5a4a, hat: 'hood', traits: ['pack'] },
  { body: 0xe4d0bc, accent: 0xf6f4ee, hat: 'veil', traits: ['book'] },
  { body: 0xe8c8a8, accent: 0x8a1830, hat: 'none', traits: ['book'], size: 0.74 },
  { body: 0xc8b098, accent: 0x24222a, hat: 'cowl', traits: ['lantern'] },
  { body: 0xd4bca4, accent: 0x7a5cc8, hat: 'veil', traits: ['cane'], size: 0.9 },
  { body: 0xc4a88c, accent: 0x4a4a60, hat: 'beanie', traits: ['scarf'] },
  { body: 0xdcc6ae, accent: 0xfaf8f2, hat: 'hood', traits: ['scarf'], size: 1.1 },
  { body: 0xe0c8b0, accent: 0xd8a840, hat: 'candle', traits: ['apron'] },
  { body: 0xd8b8a0, accent: 0x8a1830, hat: 'none', traits: ['book', 'scarf'], size: 0.78 },
];

const barks: Talk[] = [
  {
    when: MAESTRO,
    lines: [
      'They\'re opening the pipes!',
      'That\'s my mother\'s voice — that one!',
      'I\'m singing a song I made up. Listen!',
      'Nobody\'s fined me all day!',
    ],
  },
  {
    when: PRINCE,
    lines: [
      'The Prince knelt on the stair!',
      'Vespers was so short tonight.',
      'She sang something else. Something sad.',
      '(signing) The chancel door is open.',
    ],
  },
  {
    when: { courtReady: 'cathedral' },
    lines: [
      '(whisper) All five beaten. All five.',
      '(whisper) The stranger is going in.',
    ],
  },
  {
    lines: [
      '(whisper) Compline soon.',
      '(whisper) Kneel. Kneel.',
      '(whisper) A penny a flame.',
      '(whisper) Can you hear them?',
      '(signing) Hello. Cold.',
      '(signing) My son. Up there.',
      '(whisper) Not so loud!',
      '(whisper) Keep your Part.',
    ],
  },
];

export const CATHEDRAL_CROWD: NonNullable<AreaDef['crowd']> = {
  count: 16,
  looks,
  paths: [
    // Up and down the Pilgrim Stair.
    [{ x: 1200, y: 1740 }, { x: 1200, y: 1340 }, { x: 1200, y: 960 }, { x: 1200, y: 1340 }],
    // Round the labyrinth in the close.
    [{ x: 1040, y: 1080 }, { x: 1200, y: 960 }, { x: 1360, y: 1080 }, { x: 1200, y: 1220 }],
    // Through the Votive Forest.
    [{ x: 520, y: 1000 }, { x: 470, y: 1270 }, { x: 420, y: 1520 }, { x: 700, y: 1640 }, { x: 420, y: 1520 }, { x: 470, y: 1270 }],
    // Round the cloister walks.
    [{ x: 1680, y: 1050 }, { x: 1800, y: 1050 }, { x: 1980, y: 1160 }, { x: 2160, y: 1050 }, { x: 1980, y: 1160 }, { x: 1800, y: 1050 }],
    // Up the flank paths to the Organ Yard to listen.
    [{ x: 820, y: 860 }, { x: 820, y: 300 }, { x: 1080, y: 220 }, { x: 820, y: 300 }],
    [{ x: 1580, y: 860 }, { x: 1580, y: 300 }, { x: 1320, y: 230 }, { x: 1580, y: 300 }],
    // Along the Penitents' Walk.
    [{ x: 200, y: 596 }, { x: 560, y: 610 }, { x: 800, y: 640 }, { x: 560, y: 610 }],
    // From the close to the Angelus bell.
    [{ x: 1300, y: 1320 }, { x: 1620, y: 1560 }, { x: 1900, y: 1560 }, { x: 1620, y: 1560 }],
  ],
  barks,
};
