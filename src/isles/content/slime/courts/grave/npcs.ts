import type { AreaDef, NpcDef, NpcLook, Talk } from '../../../../IslesTypes';

/**
 * The people of the Grave Court.
 *
 * The Grave Court is the end of the road on Fangmire: where the passed-over are carried when the
 * grey reaches their hearts. Everyone here works for the dead — the coffin-maker, the verger who
 * keeps the Register, the diggers, the keeners, the woman who washes the bodies — and every one of
 * them knows that the greyed are not always quite done greying when the cart comes. Nobody says it
 * aloud. They talk about the Draught the way other towns talk about weather: whether it will come,
 * and to whom, and what it will cost.
 */

const PRINCE = { prince: 'mortis' } as const;
const MATRIARCH = { monarch: 'nyxa' } as const;

const Q_NOT_YET = 'grave-q-not-yet';
const Q_MUFFLED = 'grave-q-muffled';
const Q_WAKE = 'grave-q-wake-bread';
const Q_DIG_SLOW = 'grave-q-dig-slow';
const Q_LAST_BELL = 'grave-q-last-bell';

export const GRAVE_NPCS: NpcDef[] = [
  // ── Ossian Lathe — the coffin-maker, the shop ────────────────────────
  {
    id: 'grave-lathe',
    name: 'Ossian Lathe',
    title: 'Lathe & Daughter, Coffins',
    look: { body: 0xb4a894, accent: 0x3b2a20, hat: 'tophat', traits: ['apron', 'tool', 'glasses'], size: 1.1 },
    at: { x: 920, y: 1650 },
    role: { kind: 'shop', id: 'grave-shop' },
    talks: [
      {
        when: MATRIARCH,
        lines: [
          'I had an order this morning for a cradle. A CRADLE. My daughter cried. I cried. I\'ve forgotten how.',
          'Coffins are still on the shelf, if you want them. The charms too. Business is wonderfully awful.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The Lych House door\'s open and nobody\'s writing in the Register. I\'ve had no orders in two days.',
          'Two days! I\'ve started making chairs. Nobody here knows what to do with a chair. Sit on it, I tell them.',
        ],
      },
      {
        when: { questDone: Q_NOT_YET },
        lines: [
          'Corwen Peat\'s name struck out of the Register. Struck OUT. I\'d already cut his lid. Seven foot of oak.',
          'Don\'t apologise. I\'ll keep it. Someone will want it. Not him, not for years. Good.',
        ],
      },
      {
        lines: [
          'Lathe & Daughter. Coffins in oak, elm and peat-board. Peat-board for the passed-over; the Tithe pays.',
          'People ask why I sell charms. The dead leave things. A bell off a post, a nail. They\'re not using them.',
          'You can wear three. They\'ll serve you better than they served their last owners.',
        ],
      },
    ],
    barks: [
      { when: PRINCE, lines: ['Chairs! Fine chairs!', 'A coffin makes a good bench, you know.'] },
      { lines: ['Measure twice, bury once.', 'Oak or elm, madam?', 'Peat-board\'s on the Tithe.', 'Charms on the top shelf.'] },
    ],
  },

  // ── Verger Quillon Ash — keeper of the Burial Register ───────────────
  {
    id: 'grave-quillon',
    name: 'Quillon Ash',
    title: 'Verger of the Register',
    look: { body: 0xc8c4bc, accent: 0x5a3a6a, hat: 'cowl', traits: ['book', 'glasses'], size: 0.95, eye: 0x9ae04a },
    at: { x: 1340, y: 1625 },
    talks: [
      {
        when: MATRIARCH,
        lines: [
          'I closed the Register this morning. Closed it. The clasp\'s her green; I painted it black.',
          'I shall write a new book. Births. Only births. I\'m told there\'ll be a great many.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The Prince came out to the gate and asked me to read him the names. All of them. It took all night.',
          'He wept at about the four thousandth. I didn\'t know broodlings could. I don\'t think he did either.',
        ],
      },
      {
        when: { quest: Q_LAST_BELL, stage: 1 },
        lines: ['The Lych House is up the Lych Walk, east of the pool. Mind the steps. They\'re wet; they\'re always wet.'],
      },
      {
        when: { questDone: Q_NOT_YET },
        lines: [
          'One name ruled through in the Register. One line. It\'s the most beautiful thing I\'ve ever written.',
          'Tally-Warden Vell will have me for it. Let her. I\'ve kept this book thirty years; I can keep a secret.',
        ],
      },
      {
        lines: [
          'Every one carried through that gate goes in this book. Name, house, the date they were passed over.',
          'The date they died goes in after. Sometimes I wait a long time to write it. Sometimes I don\'t get to wait.',
          'The clasp is the Matriarch\'s green. It means: what is written here, she has decided.',
        ],
      },
    ],
    barks: [
      { when: PRINCE, lines: ['No names today.', 'The ink\'s drying in the well.'] },
      { lines: ['Name and house, please.', 'Passed over on the new moon.', 'Mind the book.', 'Another for the Register.'] },
    ],
  },

  // ── Corwen Peat — greyed, carried in early ───────────────────────────
  {
    id: 'grave-corwen',
    name: 'Corwen Peat',
    title: 'Greyed, Not Yet Dead',
    look: { body: 0x9ba1a6, accent: 0x60666c, hat: 'nightcap', traits: ['cane', 'scarf'], size: 0.95, eye: 0xc9cfd3 },
    at: { x: 2000, y: 1650 },
    talks: [
      {
        when: MATRIARCH,
        lines: [
          'Tansy Rue came up the Carrying Road with a kettle on her back and gave every one of us a cup. A CURE.',
          'Look. Look at my hands. That\'s pink. I\'d forgotten I was a pink sort of man.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'They\'ve stopped carrying people in. The cart stands in the Fang road with grass coming up through it.',
          'I\'m still grey to the elbow. But I\'m grey and sitting in the sun, and that\'s different, isn\'t it.',
        ],
      },
      {
        when: { questDone: Q_DIG_SLOW },
        lines: [
          'I gave out Tansy\'s vials down the Ward. Nine doses for thirty cots. We drew straws. I drew short.',
          'Don\'t look like that. I\'ve been grey a year. I can be grey a while longer. The Birch girl is seven.',
        ],
      },
      {
        when: { questDone: Q_NOT_YET },
        lines: [
          'Not in the book. Not in the book! I\'m not dead and now it\'s official. A man could get used to this.',
          'The grave\'s still dug, mind. Tobit says he\'ll fill it slowly. Tobit does everything slowly. Bless him.',
        ],
      },
      {
        when: { quest: Q_NOT_YET },
        lines: ['Go and look at it. West, in Tobit\'s yard. My name on the cross. I can\'t bring myself to.'],
      },
      {
        lines: [
          'Passed over at the new moon, the Peat household. My son spoke against the Tithe at the Draught House.',
          'Grey to the wrist in a month. Grey to the elbow in two. They carried me up here when it reached my shoulder.',
          'Only — I\'m not dead. I\'m sitting here talking to you. And there\'s a hole in Tobit\'s yard with my name on it.',
        ],
      },
    ],
    barks: [
      { when: { questDone: Q_NOT_YET }, lines: ['Not in the book!', 'Still here. Still here.'] },
      { lines: ['Grey to the shoulder.', 'Not yet. Not yet.', 'Cold today. It\'s always cold.', 'Is that the cart?'] },
    ],
  },

  // ── Wick Toller — the bell-boy ───────────────────────────────────────
  {
    id: 'grave-wick',
    name: 'Wick Toller',
    title: 'Bell-Boy to the Sexton',
    look: { body: 0xd8bea4, accent: 0xa87a3a, hat: 'cap', traits: ['pack'], size: 0.72, eye: 0x9ad0ff },
    at: { x: 1700, y: 1250 },
    talks: [
      {
        when: MATRIARCH,
        lines: [
          'I\'m not a bell-boy any more. Gammer says I\'m a boy. Just a boy. I don\'t know what they do all day.',
          'Climb trees, she says. There\'s a mangrove by the Ward. I\'ve been up it six times.',
        ],
      },
      {
        when: PRINCE,
        lines: ['Sexton Toll unmuffled every bell in the field. They ring all night when the wind gets up. I love it.'],
      },
      {
        when: { questDone: Q_MUFFLED },
        lines: [
          'Gammer\'s in the Ward with a blanket and a bowl of soup and she\'s telling everyone off. EVERYONE.',
          'She told the Ward-nurse off for her cap. She\'s alive. She\'s really really alive.',
        ],
      },
      {
        when: { quest: Q_MUFFLED },
        lines: [
          'Pull the rags off the bells — all of them in this row and the next. Quick, before the Hush-Warden comes.',
          'Then fetch Tobit. He\'s the only digger who\'ll dig UP.',
        ],
      },
      {
        lines: [
          'I keep the bells for Sexton Toll. Oil the yokes, tie the cords. Every grave in the field has one.',
          'My Gammer\'s grave is the third post. They carried her up five days ago. I sat with her till she went still.',
          'Last night her bell rang. I heard it. Only there\'s rag tied round every clapper now, by order. So it didn\'t.',
        ],
      },
    ],
    barks: [
      { when: { questDone: Q_MUFFLED }, lines: ['She\'s alive!', 'Let them ring!'] },
      { lines: ['Oil on the yoke.', 'Third post. Third post.', 'Did you hear that?', 'They\'re all muffled.'] },
    ],
  },

  // ── Gammer Toller — dug up alive ─────────────────────────────────────
  {
    id: 'grave-gammer',
    name: 'Gammer Toller',
    title: 'Formerly Buried',
    look: { body: 0xa8aeb2, accent: 0xe6dfc8, hat: 'hood', traits: ['cane', 'scarf'], size: 0.85, eye: 0xe2b462 },
    at: { x: 2090, y: 1655 },
    present: { questDone: Q_MUFFLED },
    talks: [
      {
        when: MATRIARCH,
        lines: [
          'Tansy\'s cure took the grey clean off me. I\'m going to live another forty years out of pure spite.',
          'I\'ve booked my coffin from Lathe. I intend to keep him waiting for it.',
        ],
      },
      {
        lines: [
          'Five days in an elm box with my own bell-cord in my fist. I pulled it till my arm went dead.',
          'And they\'d tied RAG round the clapper. Rag! I\'ll be having words with whoever ordered that.',
          'You\'re the one who unmuffled them. Come here. No — closer. There. That\'s a kiss. You\'ll live.',
        ],
      },
    ],
    barks: [{ lines: ['RAG! On a BELL!', 'Where\'s my soup?', 'Five days, I was.'] }],
  },

  // ── Tobit Sump — the digger who digs slow ────────────────────────────
  {
    id: 'grave-tobit',
    name: 'Tobit Sump',
    title: 'Gravedigger, Slow',
    look: { body: 0x9a8a72, accent: 0x4a3524, hat: 'cap', traits: ['tool', 'beard'], size: 1.2, eye: 0xc9b08a },
    at: { x: 330, y: 1450 },
    talks: [
      {
        when: MATRIARCH,
        lines: [
          'I filled Corwen\'s grave in today. Took me all afternoon. I sang the whole time. Badly. Beautifully.',
          'I\'m going to dig a pond next. Something with fish in, that\'s for nobody.',
        ],
      },
      {
        when: PRINCE,
        lines: ['No quota. No quota! I\'ve been leaning on this spade an hour and nobody\'s told me to stop.'],
      },
      {
        when: { questDone: Q_DIG_SLOW },
        lines: [
          'Delve\'s gone off to the Fang road with a sore head and no quota. Nine doses went down the Ward.',
          'Nine people who won\'t need a hole this moon. That\'s my quota, now. Holes I don\'t dig.',
        ],
      },
      {
        when: { quest: Q_DIG_SLOW },
        lines: [
          'Hollow stones. You\'ll know them — they ring wrong if you tap them. Tansy leaves the vials inside.',
          'Then up the field to the Quiet Ward with them. Corwen\'ll give them out. He knows who\'s still got a chance.',
        ],
      },
      {
        when: { questDone: Q_NOT_YET },
        lines: [
          'Corwen\'s out of the book. I\'ll leave his hole open a while yet. In case someone else needs it. Ha. No.',
          'You\'ve a good heart. Come back when you\'ve a strong stomach too. I\'ve something else wants doing.',
        ],
      },
      {
        lines: [
          'Twelve holes a day, the quota is. I dig four. I dig them slow and I dig them shallow and I dig them late.',
          'Every day a grave isn\'t ready is a day somebody in the Ward isn\'t in it.',
          'Barrow digs twelve. Barrow\'s a good man, he just doesn\'t think. I think. It\'s slower.',
        ],
      },
    ],
    barks: [
      { when: PRINCE, lines: ['No quota!', 'Leaning. Officially.'] },
      { lines: ['Slow and shallow.', 'One more spadeful. Maybe.', 'My back, my back.', 'No hurry for this one.'] },
    ],
  },

  // ── Nan Brindle — keener ─────────────────────────────────────────────
  {
    id: 'grave-nan',
    name: 'Nan Brindle',
    title: 'Keener for Hire',
    look: { body: 0x7c7684, accent: 0xc23a5a, hat: 'veil', traits: ['scarf', 'satchel'], size: 1, eye: 0xf07a96 },
    at: { x: 1150, y: 1030 },
    talks: [
      {
        when: MATRIARCH,
        lines: [
          'I sang at a wedding today. A WEDDING. I keened the whole thing by mistake. They loved it.',
          'I\'m learning the happy songs. There aren\'t many on Fangmire. I\'m having to make them up.',
        ],
      },
      {
        when: PRINCE,
        lines: ['No funerals in three days. My voice has gone all soft. I keep humming. Humming! At my age.'],
      },
      {
        when: { questDone: Q_WAKE },
        lines: [
          'The Merrow wake had fish on the table and Hessel\'s bread and everyone ate. Nobody ate at a wake before.',
          'I keened, and then I stopped, and somebody laughed at something, and nobody told them off.',
        ],
      },
      {
        when: { quest: Q_WAKE },
        lines: ['Wraith roach, two of them. They swim under the lamp\'s reflection. Then take them to Mother Hessel.'],
      },
      {
        lines: [
          'I keen. A dose a funeral, from the Prince, and I weep for whoever they put in front of me.',
          'The wakes are the worst of it. A passed-over house has nothing on the table. They sit and look at the coffin.',
          'There\'s fish in the Lych Pool. Nobody eats them. Some say it\'s because of what they eat. I say: fish is fish.',
        ],
      },
    ],
    barks: [
      { when: { questDone: Q_WAKE }, lines: ['Fish at a wake!', 'Somebody laughed.'] },
      { lines: ['Ohhh-oh-oh.', 'A dose a funeral.', 'Weep, weep.', 'Who\'s next for the cart?'] },
    ],
  },

  // ── Mother Hessel Marrow — layer-out of the dead ─────────────────────
  {
    id: 'grave-hessel',
    name: 'Hessel Marrow',
    title: 'Layer-Out of the Dead',
    look: { body: 0xd4cfc4, accent: 0xe4e2dc, hat: 'hood', traits: ['apron', 'satchel'], size: 1.05, eye: 0xb8f0d8 },
    at: { x: 880, y: 500 },
    talks: [
      {
        when: MATRIARCH,
        lines: [
          'I washed my sheets this morning and folded them away. All of them. I\'m going to use one as a tablecloth.',
          'Forty years laying out the greyed. I\'d like to lay out a picnic. I\'ve never been on one. It\'s grass, I\'m told.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'You rang him down. The Keeper. I washed his mother\'s Draught off a thousand dead lips, you know.',
          'I\'d have done it gentler. But I wouldn\'t have done it. Thank you.',
        ],
      },
      {
        when: { quest: Q_LAST_BELL },
        lines: ['Go on, then. Up the Lych Walk to the Lych House. Tell him Mother Hessel sent you. He won\'t know my name.'],
      },
      {
        when: { courtReady: 'grave' },
        lines: [
          'You\'ve beaten every one of his. Barrow, Toll, Dirge, Elegy, Pale. I\'ve known them all since they were born.',
          'Come to the house. I\'ve something to ask of you, and it\'s the last thing anyone in this yard will ask.',
        ],
      },
      {
        when: { questDone: Q_WAKE },
        lines: ['Nan brought me two roach and I baked them in bread for the Merrows. A wake with food. Imagine.'],
      },
      {
        lines: [
          'I lay out the greyed. Wash them, wind them, put two pennies on their eyes. The Prince pays for the pennies.',
          'You learn things, washing. Which of them were warm when they came in. Which of them weren\'t done.',
          'I don\'t say. Not to the Verger, not to the Prince. I say it to the sheets. The sheets are very discreet.',
        ],
      },
    ],
    barks: [
      { when: PRINCE, lines: ['No sheets to wash.', 'Keep the pennies.'] },
      { lines: ['Wash, wind, pennies.', 'Mind the copper.', 'Another for the table.', 'Still warm. Hm.'] },
    ],
  },
];

// ── The crowd ────────────────────────────────────────────────────────

const looks: NpcLook[] = [
  { body: 0x7c7684, accent: 0x17151b, hat: 'veil', traits: ['scarf'] },
  { body: 0x9a8a72, accent: 0x4a3524, hat: 'cap', traits: ['tool'], size: 1.15 },
  { body: 0x9ba1a6, accent: 0x60666c, hat: 'hood', traits: ['cane'] },
  { body: 0xb8b0a4, accent: 0x5a3a6a, hat: 'cowl', traits: ['lantern'] },
  { body: 0xc4b8a8, accent: 0x9ae04a, hat: 'snake', traits: ['satchel'] },
  { body: 0x8a8494, accent: 0x17151b, hat: 'tophat', traits: ['scarf'] },
  { body: 0xd6c4ae, accent: 0xc23a5a, hat: 'none', traits: ['pack'], size: 0.74 },
  { body: 0xa8a2b0, accent: 0xe4e2dc, hat: 'plague', traits: ['book'] },
];

const barks: Talk[] = [
  {
    when: MATRIARCH,
    lines: [
      'The Draught House is giving it away!',
      'Tansy\'s kettle\'s at the gate!',
      'My hands are going pink.',
      'Nobody\'s been carried in today.',
    ],
  },
  {
    when: PRINCE,
    lines: [
      'The Keeper yielded!',
      'Nobody\'s writing in the Register.',
      'The cart\'s stopped at the Fang road.',
      'Listen — all the bells are ringing.',
    ],
  },
  {
    when: { courtReady: 'grave' },
    lines: [
      'Someone beat all five of the Keeper\'s.',
      'They say the stranger\'s going to the Lych House.',
    ],
  },
  {
    lines: [
      'New moon\'s in four days.',
      'The Ashbys were passed over.',
      'Grey to the elbow, she is.',
      'Mind the slabs, there\'s names on them.',
      'Was that a bell?',
      'Hush. The Hush-Warden.',
      'Three doses short this moon.',
      'Don\'t look at the Slough.',
    ],
  },
];

export const GRAVE_CROWD: NonNullable<AreaDef['crowd']> = {
  count: 14,
  looks,
  paths: [
    // Up and down the Carrying Road, from the gate to the Bier Road.
    [{ x: 1200, y: 1660 }, { x: 1200, y: 1300 }, { x: 1200, y: 1180 }, { x: 1200, y: 1300 }],
    // The Bier Road, both ways.
    [{ x: 180, y: 1180 }, { x: 880, y: 1180 }, { x: 1520, y: 1180 }, { x: 2220, y: 1180 }],
    [{ x: 2220, y: 1180 }, { x: 1520, y: 1180 }, { x: 880, y: 1180 }, { x: 180, y: 1180 }],
    // Round the Lych Pool.
    [{ x: 880, y: 1180 }, { x: 880, y: 640 }, { x: 1520, y: 640 }, { x: 1520, y: 1180 }],
    // The Lych Walk.
    [{ x: 320, y: 640 }, { x: 1200, y: 640 }, { x: 2120, y: 640 }, { x: 1200, y: 640 }],
    // Down to the Quiet Ward and back.
    [{ x: 2000, y: 1200 }, { x: 2000, y: 1640 }, { x: 2000, y: 1200 }],
    // Into the digger's yard.
    [{ x: 560, y: 1190 }, { x: 560, y: 1460 }, { x: 560, y: 1190 }],
    // The lane past the coffin shop.
    [{ x: 1200, y: 1640 }, { x: 900, y: 1640 }, { x: 1200, y: 1640 }],
  ],
  barks,
};
