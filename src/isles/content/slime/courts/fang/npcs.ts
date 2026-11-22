import type { AreaDef, NpcDef, NpcLook, Talk } from '../../../../IslesTypes';

/**
 * The people of the Fang Court.
 *
 * Fang is the first court up the causeway from Stilthaven, so its people do the explaining: what
 * the Mark is (two little scars on every wrist, the Matriarch's bite at a week old), what the
 * Draught is (her milked venom, brewed into the antidote, doled out at each new moon by loyalty),
 * what the Moult-Tithe asks of a milkers' town (skins, venom and informations), and what it means
 * to be *passed over* and *go grey*. Everyone here milks, catches, tans or bakes; everyone counts
 * jars; and everyone looks at their fingertips more often than they would like to admit.
 */

const PRINCE = { prince: 'venin' } as const;
const MATRIARCH = { monarch: 'nyxa' } as const;

const Q_SKIN = 'fang-q-short-a-skin';
const Q_BREAD = 'fang-q-bread-for-the-grey';
const Q_YOKE = 'fang-q-old-yoke';
const Q_EAR = 'fang-q-ear-at-the-window';
const Q_HALL = 'fang-q-milking-hall';

export const FANG_NPCS: NpcDef[] = [
  // ── Ossic Scaleby — the shop ─────────────────────────────────────────
  {
    id: 'fang-scaleby',
    name: 'Ossic Scaleby',
    title: 'Phials & Charms',
    look: { body: 0xc8a888, accent: 0x6a3a6e, hat: 'tricorn', traits: ['glasses', 'satchel', 'pipe'], size: 1.0, eye: 0xb4e83c },
    at: { x: 1500, y: 1066 },
    role: { kind: 'shop', id: 'fang-shop' },
    talks: [
      {
        when: MATRIARCH,
        lines: [
          'Do you know what sold this morning? Empty phials. Dozens. People want something to keep the cure in.',
          'I have never once sold an empty phial. They are always for something. This time they\'re for something good.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The Hall\'s doors stand open and the Prince is down at the shed, milking his own serpents. With his hands.',
          'I\'ve put my prices up. Nothing to do with him. A man in a changing world must change his prices.',
        ],
      },
      {
        when: { questDone: Q_EAR },
        lines: [
          'You saw off the ear at Corwen\'s window? Hm. I sold that ear a new trumpet only last month.',
          'Business is business. I\'ll not sell him another. That is also business.',
        ],
      },
      {
        lines: [
          'Phials, charms, snakeroot meal for the Basket. A milker\'s town needs all three, and I have all three.',
          'Charms on the left — wear three. Every one of them does something. Fangmire has no patience for trinkets.',
          'Phials on the right. Empty, mind. A full phial without the Matriarch\'s seal is contraband, and I\'m not a fool.',
          'Meal by the counter. Pomfret buys it by the sack. You\'ll want some if you mean to have her bake for you.',
        ],
      },
    ],
    barks: [
      { when: MATRIARCH, lines: ['Empty phials! For the cure!', 'Stoppers, corks, wax — all you need!'] },
      { lines: ['Charms that bite back!', 'Snakeroot meal, fresh ground!', 'Phials, sealed or not — not!', 'Mind the stuffed cobra.'] },
    ],
  },

  // ── Pomfret Reedbasket — The Charmer's Basket (bakery) ───────────────
  {
    id: 'fang-pomfret',
    name: 'Pomfret Reedbasket',
    title: 'The Charmer\'s Basket',
    look: { body: 0xe0b890, accent: 0xd8b45a, hat: 'chef', traits: ['apron', 'scarf'], size: 1.15, eye: 0x6a3a14 },
    at: { x: 920, y: 1056 },
    role: { kind: 'bakery', id: 'fang-basket' },
    talks: [
      {
        when: MATRIARCH,
        lines: [
          'I\'m baking the big cobra for the square tonight. Twice the size. We\'re going to tear it apart and eat it.',
          'Very symbolic, my sister says. I say it\'s good bread. Bring me fish and I\'ll bake you some too.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The Prince came in. Here. Bought a fritter. Paid for it! Then stood eating it in the door looking lost.',
          'I gave him a second one for nothing. Don\'t tell anyone. The oven\'s hot — what\'ll it be?',
        ],
      },
      {
        when: { questDone: Q_BREAD },
        lines: [
          'Nell\'s little ones ate the lot and asked for more. The Beadle came in after and I charged him double.',
          'Bring me fish, love. Minnows from the fen, herring and eels from the harbour. The Basket bakes anything.',
        ],
      },
      {
        when: { quest: Q_BREAD },
        lines: [
          'Three adder minnows off the fen and a scoop of Scaleby\'s meal, then I fry them up — fritters come in twos.',
          'Take the pair to Nell by the causeway. Mind the Beadle. He counts what goes into the passed-over\'s doors.',
        ],
      },
      {
        lines: [
          'Welcome to the Basket! Fish from the fen, meal from Scaleby\'s, and my oven. That\'s every recipe in Fang.',
          'Minnow fritters, catfish coils, herring pie with the heads looking out. The milkers live on it.',
          'Bring me the fish and the meal, and a few coins for the fire, and I\'ll bake while you wait.',
        ],
      },
    ],
    barks: [
      { when: PRINCE, lines: ['A fritter for the Prince — paid for!', 'Hot coils, hot coils!'] },
      { lines: ['Fritters by the fistful!', 'Coil-bread, fresh out!', 'Mind the cobra, it\'s still warm.', 'Pie with the heads on!'] },
    ],
  },

  // ── Granny Hesp — passed over, going grey ────────────────────────────
  {
    id: 'fang-hesp',
    name: 'Granny Hesp Wickerly',
    title: 'Passed Over, the Fen Bank',
    look: { body: 0xb8b4ae, accent: 0x6a3a6e, hat: 'hood', traits: ['cane', 'bandage', 'scarf'], size: 0.85, eye: 0xd8dcd4 },
    at: { x: 300, y: 1036 },
    talks: [
      {
        when: MATRIARCH,
        lines: [
          'Look at my hands. Pink. Pink to the second knuckle. Tansy Rue gave me the true cure herself.',
          'Seventy-one years of the Draught and now I need none of it. I keep checking. I can\'t stop checking.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'He came to my door. My Venin. He knelt on the walk in the mud, and he put a dose in my hand.',
          'His own. From the Hall\'s jar. He said he\'d forgotten I was on the list. I told him he never knew. He cried.',
        ],
      },
      {
        when: { quest: Q_HALL },
        lines: [
          'You want to hear about him? I was his nurse. The Matriarch hatched him and gave him to me to raise.',
          'Go and ask me properly, the way the Steward told you. I like to be asked.',
        ],
      },
      {
        when: { questDone: Q_SKIN },
        lines: [
          'The grey has stopped at the first knuckle. Stopped! A dose came this morning, with my name on the jar.',
          'Wick says you threw the Reeve in the fen. I hope you did. I hope he swallowed some.',
        ],
      },
      {
        when: { quest: Q_SKIN },
        lines: [
          'Snakes shed in the long sedge — Wick knows where. Four good skins would make our tithe whole.',
          'Then take them up to the Hall deck. The Tithe-Reeve sits there with his book and his chain.',
        ],
      },
      {
        lines: [
          'Don\'t look at my hands, dear. Everyone looks at my hands. Grey to the first knuckle now.',
          'We were a skin short at the last Moult-Tithe. One skin. So our house was passed over at the Draught.',
          'Passed over means no dose. No dose means the Mark wakes up. It starts in the fingers, cold. You go grey.',
          'Then they carry you north, to the Grave Court. I\'ve a moon or two. Wick doesn\'t know how little.',
        ],
      },
    ],
    barks: [
      { when: { questDone: Q_SKIN }, lines: ['First knuckle. No further.', 'My name on the jar!'] },
      { lines: ['Cold today. Cold fingers.', 'One skin. One skin short.', 'Wick! Wick, where are you?'] },
    ],
  },

  // ── Wick — her grandson, snake-catcher ───────────────────────────────
  {
    id: 'fang-wick',
    name: 'Wick Wickerly',
    title: 'Snake-Catcher\'s Boy',
    look: { body: 0xd8b494, accent: 0x6e6a3a, hat: 'cap', traits: ['tool', 'satchel'], size: 0.78, eye: 0x6a8a3a },
    at: { x: 580, y: 790 },
    wander: 50,
    talks: [
      {
        when: MATRIARCH,
        lines: [
          'I let all the pit-snakes out last night. Asp helped! He cried. He said they\'d earned it.',
          'They went into the fen in a long line, like a rope going away. Bess went last. She looked back.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The Prince came to the pit-yard and looked at the snakes for ages. Then he said, "I was one of these."',
          'Asp didn\'t know what to say. Nobody did. I said, "You still are, a bit." He laughed. I didn\'t mean it funny.',
        ],
      },
      {
        when: { quest: Q_SKIN },
        lines: [
          'Skins? Snakes shed in the long sedge where it\'s warm. By the old fang south of the Basket, and the fen bank.',
          'Look in the grass west of the Basket, and on the far side of the fen. They leave them inside out, like socks.',
        ],
      },
      {
        lines: [
          'I catch the strays for Asp. A copper a snake. Two for a cobra, if I don\'t get bit.',
          'I\'ve been bit nine times. The Mark eats it, Gran says. The Mark eats everything as long as you get your dose.',
          'Gran\'s fingers are going funny. She says it\'s the cold. It isn\'t cold.',
        ],
      },
    ],
    barks: [
      { lines: ['Got one! No — no I haven\'t.', 'Nine bites. NINE.', 'That one\'s Bess. Don\'t.', 'Here, snakey.'] },
    ],
  },

  // ── Tamsin Glover — a milker at the Shed ─────────────────────────────
  {
    id: 'fang-tamsin',
    name: 'Tamsin Glover',
    title: 'Milker, the Shed',
    look: { body: 0xd0b090, accent: 0x5a3a24, hat: 'plague', traits: ['apron', 'satchel'], size: 0.95, eye: 0xb4e83c },
    at: { x: 1600, y: 1330 },
    talks: [
      {
        when: MATRIARCH,
        lines: [
          'The yokes are empty. We milk for the cure now — once a moon, as much as the serpent cares to give.',
          'Grandmother Mab gives the most of any of them. Out of spite, I think. She\'d hate to be outdone.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'His Highness took his turn on the hook this morning. Badly. Mab bit him. He said "fair."',
          'Thirty jars a hand is twenty jars now. The shed feels like a different shed.',
        ],
      },
      {
        when: { questDone: Q_YOKE },
        lines: [
          'Mab\'s in the fen, I suppose. Forty years in a yoke and she went into the water without a look back.',
          'Hask docked my jars for it. Thirty-one short. I\'d do it again. I\'d do it every moon.',
        ],
      },
      {
        when: { quest: Q_YOKE },
        lines: [
          'The end yoke, the old one with the brass plate. Mab\'s in it. She\'ll know you\'re a friend. She won\'t care.',
          'Then the three pins along the rack front — pull those and the whole end comes loose. Quick, before Hask.',
        ],
      },
      {
        lines: [
          'Thirty jars a hand a moon. Short, and they take it out of your house\'s Draught. Jar for dose.',
          'You hook the jaw, you press the glands, you count the drips. Then you let them rest. Or you used to.',
          'They\'re pressing harder this moon. The Matriarch\'s still is thirsty, Hask says. The serpents are going dry.',
        ],
      },
    ],
    barks: [
      { lines: ['Nineteen. Twenty.', 'Steady, steady, good girl.', 'Thirty jars. THIRTY.', 'Mind the trough.'] },
    ],
  },

  // ── Corwen Mudd — the man under the ear ──────────────────────────────
  {
    id: 'fang-corwen',
    name: 'Corwen Mudd',
    title: 'Net-Maker, the East Walk',
    look: { body: 0xa88a6a, accent: 0x3a2b1d, hat: 'beanie', traits: ['pipe', 'beard'], size: 1.1, eye: 0x8a94a0 },
    at: { x: 2100, y: 1070 },
    talks: [
      {
        when: MATRIARCH,
        lines: [
          'I said the Matriarch\'s name out loud this morning. Just her name. On my own step. Nothing happened.',
          'Then I said a rude word after it. Still nothing. I may do it again at lunch.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The informers\' doses have stopped. The Hall\'s stopped paying. The ears are all very quiet this week.',
          'Peep came round to say sorry. I let him. I didn\'t let him in.',
        ],
      },
      {
        when: { questDone: Q_EAR },
        lines: [
          'No tallies, no report. No report, no passing-over. My girls get their dose this moon. All three.',
          'I talk to my wife at night again. Whispering, still. Habit. But I talk.',
        ],
      },
      {
        when: { quest: Q_EAR },
        lines: [
          'His tally-sticks are hidden about the place till he hands them in — a notch for every word he\'s heard.',
          'Find them. Under my hut, the shed\'s end, the walk by the vats. Then he\'ll come looking for them.',
        ],
      },
      {
        lines: [
          'Speak low. There\'s an ear under my floor. Not a real ear. A man. With an ear-trumpet.',
          'Spies are paid in doses, see. A good word to the Hall gets you an extra. A bad word about me gets him two.',
          'I said the shed was cruel, once, at supper. One word. He\'s been under the stilts every night since.',
          'If he hands in his tallies at the new moon, my house is passed over. I\'ve three girls.',
        ],
      },
    ],
    barks: [
      { when: { questDone: Q_EAR }, lines: ['Cruel. CRUEL. There, I said it.', 'No ears tonight.'] },
      { lines: ['Shh.', 'Nets, good nets.', 'Did you hear something?', '…nothing. I said nothing.'] },
    ],
  },

  // ── Nell Mudlark — a passed-over mother ──────────────────────────────
  {
    id: 'fang-nell',
    name: 'Nell Mudlark',
    title: 'Passed Over, the Causeway',
    look: { body: 0xbcb0a4, accent: 0x8a94a0, hat: 'veil', traits: ['scarf', 'bandage'], size: 0.9, eye: 0xd8dcd4 },
    at: { x: 1500, y: 1560 },
    talks: [
      {
        when: MATRIARCH,
        lines: [
          'My fingers are warm. I keep holding the children\'s faces to feel it. They think I\'ve gone soft.',
          'I have. I have gone entirely soft. Isn\'t it marvellous?',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'They\'ve torn up the passed-over list. The board by the causeway is just slate now. Blank slate.',
          'My name was on it. My name isn\'t on anything now.',
        ],
      },
      {
        when: { questDone: Q_BREAD },
        lines: [
          'The fritters went in a breath. My youngest licked the paper. Pomfret wraps them in good paper.',
          'The Beadle won\'t come back. You frightened him. He\'s a coward with a big stomach. Thank you.',
        ],
      },
      {
        lines: [
          'My husband was named. By whom, I never found out. Named for what, I never found out either.',
          'So we were passed over. He went grey first, then they came for him with the long cart.',
          'There\'s three of us left and the Beadle takes our bread for the Hall, for "arrears". We eat what\'s left.',
        ],
      },
    ],
    barks: [
      { when: { questDone: Q_BREAD }, lines: ['Fritters! Real fritters!', 'Mind the paper, don\'t lick it.'] },
      { lines: ['Come inside, it\'s damp.', 'Is that the Beadle?', 'Blank slate. Blank slate.'] },
    ],
  },

  // ── Orrin Fenwright — the fen fisherman ──────────────────────────────
  {
    id: 'fang-orrin',
    name: 'Orrin Fenwright',
    title: 'Fen Fisher',
    look: { body: 0x9a8a6a, accent: 0x2f3d1c, hat: 'souwester', traits: ['rod', 'pipe', 'beard'], size: 1.1, eye: 0xb4e83c },
    at: { x: 560, y: 1510 },
    talks: [
      {
        when: MATRIARCH,
        lines: [
          'Fished a cobra-catfish this morning and threw it back, just to see it go. Haven\'t done that in fifty years.',
          'The fen\'s the same black. Everything on it is a different colour.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'His Highness came down to the fen and asked me how to fish. Wanted to know what we eat.',
          'I showed him. He caught a minnow and it bit him. He laughed like a boy. Never heard that from the Hall.',
        ],
      },
      {
        lines: [
          'This is the venom fen. Every fish in it bites, and every bite carries. Bring an antivenin rod or don\'t bother.',
          'Stilthaven\'s tackle shop has them. Rubber grip, a bitter-root wrap on the line. Keeps the poison off you.',
          'Adder minnows bite at anything. Cobra-catfish spread their gills like a hood when they\'re hooked. Hold on.',
          'Bring your catch to Pomfret at the Basket. She\'ll make it worth eating.',
        ],
      },
    ],
    barks: [
      { lines: ['Bite, you devil.', 'Antivenin rod, or nothing.', 'Steam\'s up today.', 'Hood\'s up — that\'s a big one.'] },
    ],
  },

  // ── Steward Scutch — of the Milking Hall ─────────────────────────────
  {
    id: 'fang-scutch',
    name: 'Steward Scutch',
    title: 'Keeper of the Milking Hall',
    look: { body: 0xc0a890, accent: 0x2c3a24, hat: 'tophat', traits: ['book', 'cane', 'glasses'], size: 1.0, eye: 0xf2d232 },
    at: { x: 1440, y: 520 },
    talks: [
      {
        when: MATRIARCH,
        lines: [
          'I have burned the tithe-books. All of them. It took four hours and I enjoyed every one.',
          'His Highness held the lamp. He said it was the first time he had ever seen a book do any good.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'He sleeps. He has not slept a whole night since he was milked the first time. Let him.',
          'The Hall\'s jars are going out to the passed-over. By his order. I am writing the order down. Slowly.',
        ],
      },
      {
        when: { courtReady: 'fang' },
        lines: [
          'All five of them. He saw it from the hood. He has asked for his gloves — the milking gloves.',
          'He means to fight you as he was raised. I had hoped he would not. Speak to me before you go in.',
        ],
      },
      {
        lines: [
          'The Milking Hall. His Highness receives the court\'s jars here, and gives the court its due.',
          'Thirty jars a hand a moon. The Hall keeps the book. The book keeps the Draught. The Draught keeps us.',
          'Beat his five hands and he will see you. He is not cruel. He was simply milked first, and longest.',
        ],
      },
    ],
    barks: [
      { lines: ['Jars to the left, please.', 'The book is closed till dusk.', 'His Highness is resting.'] },
    ],
  },
];

// ── The crowd ────────────────────────────────────────────────────────

const looks: NpcLook[] = [
  { body: 0xc8a888, accent: 0x5a3a24, hat: 'plague', traits: ['apron'] },
  { body: 0xb89a74, accent: 0x6e6a3a, hat: 'snake', traits: ['satchel'] },
  { body: 0xd8b494, accent: 0x4d7a3a, hat: 'cap', traits: ['tool'], size: 0.76 },
  { body: 0xa88a6a, accent: 0x2f3d1c, hat: 'souwester', traits: ['rod'] },
  { body: 0xbcb0a4, accent: 0x8a94a0, hat: 'hood', traits: ['bandage', 'cane'], size: 0.9 },
  { body: 0xd0b090, accent: 0xd8b45a, hat: 'headwrap', traits: ['pack'] },
  { body: 0x9a8a6a, accent: 0x6a3a6e, hat: 'cowl', traits: ['scarf'] },
  { body: 0xc89a6a, accent: 0x3a2b1d, hat: 'bandana', traits: ['apron', 'tool'], size: 1.1 },
];

const barks: Talk[] = [
  {
    when: MATRIARCH,
    lines: [
      'The cure! The real cure!', 'Pink to the fingertip!', 'Burn the ration books!',
      'No more doses!', 'Let the serpents go!',
    ],
  },
  {
    when: PRINCE,
    lines: [
      'The Prince yielded!', 'He\'s milking his own snakes!', 'The list\'s been wiped.',
      'Hall jars for the grey!',
    ],
  },
  {
    when: { courtReady: 'fang' },
    lines: ['All five beaten…', 'The stranger\'s going to the Hall.', 'He\'s asked for his gloves.'],
  },
  {
    lines: [
      'Thirty jars.', 'New moon\'s close.', 'Check your fingers.', 'Who named them?',
      'Don\'t say that out loud.', 'Is that a skin? Mine!', 'Mind the long grass.', 'The vats smell strong today.',
    ],
  },
];

export const FANG_CROWD: NonNullable<AreaDef['crowd']> = {
  count: 14,
  looks,
  paths: [
    // Up and down the causeway.
    [{ x: 1200, y: 1600 }, { x: 1200, y: 1100 }, { x: 1200, y: 620 }, { x: 1200, y: 1100 }],
    // The Long Walk, both ways.
    [{ x: 140, y: 850 }, { x: 1000, y: 850 }, { x: 1400, y: 850 }, { x: 2260, y: 850 }],
    [{ x: 2260, y: 850 }, { x: 1400, y: 850 }, { x: 1000, y: 850 }, { x: 140, y: 850 }],
    // Round the Charmers' Square.
    [{ x: 1080, y: 790 }, { x: 1320, y: 790 }, { x: 1320, y: 920 }, { x: 1080, y: 920 }],
    // Along the Milking Shed front, jars to the trough.
    [{ x: 1560, y: 1310 }, { x: 2080, y: 1310 }, { x: 1560, y: 1310 }],
    // Down to the fen bank.
    [{ x: 1200, y: 1420 }, { x: 880, y: 1420 }, { x: 880, y: 1500 }, { x: 600, y: 1500 }, { x: 880, y: 1500 }],
    // To the Hall deck and back.
    [{ x: 1200, y: 560 }, { x: 1440, y: 560 }, { x: 1640, y: 480 }, { x: 1440, y: 560 }],
  ],
  barks,
};
