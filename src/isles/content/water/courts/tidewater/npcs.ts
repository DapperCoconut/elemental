import type { AreaDef, NpcDef, NpcLook, Talk } from '../../../../IslesTypes';

/**
 * The people of the Tidewater Court.
 *
 * Tidewater is the first court up the causeway from Brinehollow and the one that lives closest
 * to the Queen's tide: twice a day the Tide Gauge's bell rings, the sea comes in over the flats,
 * and every house that paid the Dry Tithe gets its floor back when it goes out again. Every
 * house that did not is *left under*. Everybody here measures their life in tides — how many
 * they can still afford, how many a neighbour has been under, how many until the next count.
 */

const PRINCE = { prince: 'ebb' } as const;
const QUEEN = { monarch: 'maresa' } as const;

export const TIDEWATER_NPCS: NpcDef[] = [
  // ── Gilly Barnacle — the shop ─────────────────────────────────────────
  {
    id: 'tidewater-gilly',
    name: 'Gilly Barnacle',
    title: 'Wrack & Sundries',
    look: { body: 0xd7b08f, accent: 0x40606a, hat: 'souwester', traits: ['apron', 'satchel'], size: 1.05 },
    at: { x: 1650, y: 700 },
    role: { kind: 'shop', id: 'tidewater-shop' },
    talks: [
      {
        when: QUEEN,
        lines: [
          'The tide came in this morning and went out on its own. Nobody rang anything. Nobody paid anything.',
          'I sold a man a bucket and he cried. Said he\'d never needed one he could keep. Charms are on the shelf, love.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The lighthouse lamp\'s out and the Gauge bell\'s quiet. Never heard the flats this quiet.',
          'Wrack\'s cheaper today. I\'m feeling generous. That\'s a lie, but the wrack IS cheaper.',
        ],
      },
      {
        when: { questDone: 'tidewater-q-left-under' },
        lines: [
          'You got Pell\'s things up out of Number Four. She brought me her husband\'s pipe to mend. Imagine that.',
          'Everything on my shelf came in on a tide. Most of it\'s a charm if you hold it right.',
        ],
      },
      {
        lines: [
          'Wrack & Sundries. Anything the sea leaves on the flats, I dry it, price it and sell it back to you.',
          'Charms are for keeping — you can wear three. Samphire and kelp salt are for Morwenna\'s ovens.',
          'Fish? I\'ll buy fish. Blennies, dabs, anything with a face on it.',
        ],
      },
    ],
    barks: [
      { when: PRINCE, lines: ['Half off wrack! Well. A third.', 'Nobody\'s counting the tithe today. I am counting my till.'] },
      { lines: ['Fresh wrack, dry as a bone!', 'Charms, floats, salvage — mind the step, it\'s wet.', 'Kelp salt! Samphire! Bottled things!'] },
    ],
  },

  // ── Morwenna Kettle — the bakery ─────────────────────────────────────
  {
    id: 'tidewater-morwenna',
    name: 'Morwenna Kettle',
    title: 'The Low-Tide Larder',
    look: { body: 0xe6c3a3, accent: 0x8a5a3a, hat: 'chef', traits: ['apron'], size: 1.2 },
    at: { x: 760, y: 1092 },
    role: { kind: 'bakery', id: 'tidewater-larder' },
    talks: [
      {
        when: QUEEN,
        lines: [
          'I baked through a whole flood and the oven never went out. I\'m going to bake through ALL of them now.',
          'Bring me fish and I\'ll put a crust on it. Same as ever. Better than ever.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'No Taster at my door this morning. First pasty of the batch went to a child. A CHILD. As it should.',
          'The ovens are hot and the tide\'s nobody\'s. What are we cooking?',
        ],
      },
      {
        when: { questDone: 'tidewater-q-first-pasty' },
        lines: [
          'Brill Salter\'s not been back since you salted him. My pasties go to who I say now.',
          'Blennies and samphire, dabs in batter, chowder when the cod comes in. Bring me the sea.',
        ],
      },
      {
        lines: [
          'The Low-Tide Larder. I bake between tides — the oven\'s up on the stilts, the flour stays dry, mostly.',
          'You bring the fish, I bring the crust. Eat it before a fight and it\'ll see you through.',
          'Blennies off the tide pools, dabs off the flats, and Brinehollow cod if you\'ve been down the causeway.',
        ],
      },
    ],
    barks: [
      { when: PRINCE, lines: ['First pasty\'s free! Because I SAY so!'] },
      { lines: ['Pasties hot before the flood!', 'Mind the crust, mind the tide.', 'Who\'s brought me blennies?'] },
    ],
  },

  // ── Pell Mudge — the house left under ────────────────────────────────
  {
    id: 'tidewater-pell',
    name: 'Pell Mudge',
    title: 'Late of Number Four',
    look: { body: 0xd4b39a, accent: 0x55606a, hat: 'hood', traits: ['scarf', 'cane'], size: 0.92 },
    at: { x: 640, y: 1130 },
    talks: [
      {
        when: QUEEN,
        lines: [
          'They\'re draining the low row. Number Four\'s floor came up this morning, green as a pond, and MINE.',
          'Ned\'s down in the Undertow still, they say, sleeping. They say they\'ll wake them all. I\'ll wait.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The Prince used to walk the low row at slack water and look at us. Just look.',
          'He\'s not looking now. I can stand on my own step at low tide and nobody writes it down.',
        ],
      },
      {
        when: { questDone: 'tidewater-q-left-under' },
        lines: [
          'Ned\'s compass. The kettle. The boy\'s first boots. The letters. Everything that mattered, dried on my lap.',
          'Cobb won\'t padlock that door again. You saw to it. I\'ll not forget your face.',
        ],
      },
      {
        when: { quest: 'tidewater-q-left-under' },
        lines: [
          'Low water\'s the time. Go in through the windows of Number Four — mind the weed, it grabs.',
          'Four things. You\'ll know them. They\'re the only things in there anybody would cry over.',
        ],
      },
      {
        lines: [
          'That\'s mine. Number Four, the one sunk to the sills. We were short a coin at the last count.',
          'One coin a head, the Dry Tithe. Ned had gone in the Undertow by then, so it was me and the boy. One short.',
        ],
      },
    ],
    barks: [
      { when: PRINCE, lines: ['My step. My step, at low tide.'] },
      { when: { questDone: 'tidewater-q-left-under' }, lines: ['Ned\'s compass still points home.'] },
      { lines: ['Number Four. That one. Under.', 'Is the tide turning? It always is.'] },
    ],
  },

  // ── Horologist Teague Ashlock — the Tide Gauge ───────────────────────
  {
    id: 'tidewater-teague',
    name: 'Teague Ashlock',
    title: 'Keeper of the Tide Gauge',
    look: { body: 0xc8a688, accent: 0x5a4632, hat: 'tophat', traits: ['glasses', 'tool', 'beard'], size: 1.0, eye: 0xf2d58a },
    at: { x: 1300, y: 800 },
    talks: [
      {
        when: QUEEN,
        lines: [
          'The Gauge says LOW. It has said LOW since dawn. That is what a sea does when nobody owns it. It rests.',
          'I have taken the bell down. I am going to make a weathervane of it. A fish. A happy fish.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'I wound the Gauge back to true this morning. Two minutes slow, as it should be. Kind, as it should be.',
          'For twenty years it ran fast for the Prince. Every minute it ran fast, a family missed the count.',
        ],
      },
      {
        when: { questDone: 'tidewater-q-gauge' },
        lines: [
          'The escapement is whole, the pins are true, the Regulator is wading home. The Gauge keeps honest time.',
          'Now when the bell rings, people have the minutes they were promised. Minutes are coins, here.',
        ],
      },
      {
        lines: [
          'The Tide Gauge. The Queen calls the sea and the Gauge tells the flats when it is coming.',
          'Its bell rings the flood. You have till the hand reaches HIGH to be up a ladder with your tithe paid.',
          'I keep it. I wind it, I oil it. And lately — lately it has been keeping somebody else\'s time.',
        ],
      },
    ],
    barks: [
      { when: PRINCE, lines: ['Two minutes slow. Perfect.', 'Hear that tick? Honest.'] },
      { lines: ['*tick* *tick* *tick* — too fast. Too fast.', 'Mind the hand. When it passes the blue, climb.'] },
    ],
  },

  // ── Kip Dunwick — the crabber's daughter ─────────────────────────────
  {
    id: 'tidewater-kip',
    name: 'Kip Dunwick',
    title: 'Crabber\'s Girl',
    look: { body: 0xe2b996, accent: 0x9a5a34, hat: 'bandana', traits: ['satchel'], size: 0.78 },
    at: { x: 300, y: 1060 },
    wander: 50,
    talks: [
      {
        when: QUEEN,
        lines: [
          'Da says there\'s no tithe pot any more, so the crabs are just crabs. He looked sad about it. He\'s fine.',
          'I named one. It\'s called Captain. It lives under our house now and pinches the cat.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'Da\'s took the crown pots in and turned them into chairs. Crabby chairs. They pinch your bum.',
        ],
      },
      {
        when: { questDone: 'tidewater-q-crab-pots' },
        lines: [
          'Da knows it was me let them go. He said "good". Then he said "don\'t tell anybody I said good".',
          'Crabs only go sideways cos they\'re shy. If you walk at one straight it panics and grabs you.',
        ],
      },
      {
        when: { quest: 'tidewater-q-crab-pots' },
        lines: [
          'The crown pots are the ones with the red tags, out on the sandbars. Flip the lids. Let \'em scuttle.',
        ],
      },
      {
        lines: [
          'My Da\'s Dunwick. He\'s the crabber. He has to fill the Prince\'s crab pot — a hundred a tide, crown tax.',
          'I don\'t like it. They\'ve got little faces. And they never get eaten, they just go in the Prince\'s pool.',
        ],
      },
    ],
    barks: [
      { lines: ['Sideways! Sideways!', 'Don\'t step on that one, he\'s Gerald.', 'Pinch pinch pinch.'] },
    ],
  },

  // ── Old Fen Netley — the tide pools ──────────────────────────────────
  {
    id: 'tidewater-fen',
    name: 'Fen Netley',
    title: 'Net-Mender',
    look: { body: 0xbf9a7c, accent: 0x3d5c63, hat: 'souwester', traits: ['rod', 'beard', 'pipe'], size: 1.1 },
    at: { x: 1770, y: 1478 },
    talks: [
      {
        when: QUEEN,
        lines: [
          'Queen\'s gone into her own maelstrom, they\'re saying. Sea doesn\'t care. Sea never cared. Lovely, that.',
          'Pools are full of blennies this morning. Even the fish have heard.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The Prince taxed what I caught by the fin and what I mended by the knot. You can\'t tax a knot! He did.',
          'Pools are yours. Fish \'em at any tide. Nobody\'s counting the fins.',
        ],
      },
      {
        when: { questDone: 'tidewater-q-first-pasty' },
        lines: [
          'Heard you cooked blennies for Morwenna and saw off the Taster. Hah! Brill Salter, salted.',
          'Blennies bite at anything. Sand dabs lie flat and fight sideways. Keep \'em in the bar.',
        ],
      },
      {
        lines: [
          'The tide pools. Every flood fills them, every ebb leaves the fish behind. Easiest fishing on the isle.',
          'Got a rod? Cast from the rocks. When it bites, keep the fish inside the catch bar till the line\'s in.',
          'Tidepool blennies are greedy little things. Sand dabs are flat, and sly, and fight dirty.',
        ],
      },
    ],
    barks: [
      { when: PRINCE, lines: ['Untaxed knots. Every one.'] },
      { lines: ['Shh. Blenny.', 'Mind the rocks, the weed\'s slick.', 'Tide\'s turning. Tide\'s always turning.'] },
    ],
  },

  // ── Hesper Vane — the lighthouse keeper ──────────────────────────────
  {
    id: 'tidewater-hesper',
    name: 'Hesper Vane',
    title: 'Lamp-Keeper to Prince Ebb',
    look: { body: 0xe8d2bd, accent: 0x2a4a52, hat: 'cap', traits: ['lantern', 'scarf'], size: 1.0, eye: 0xffe3a0 },
    at: { x: 2010, y: 520 },
    talks: [
      {
        when: QUEEN,
        lines: [
          'I lit the lamp last night for the fishing boats. Only for the boats. It\'s a very different light.',
          'Ebb comes up the tower some evenings and just watches the tide go where it likes. He looks younger.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'He came down the tower steps on his own feet. First time in years I\'ve seen him walk instead of flow.',
          'He asked me what the tide does when nobody tells it. I said I didn\'t know. Neither of us did.',
        ],
      },
      {
        lines: [
          'I keep the lamp. Prince Ebb keeps the tide — for his mother. He calls it from the Low-Water Stone.',
          'He isn\'t cruel. He\'s exact. He knows every house on the flats by the depth it drowns at.',
          'When you\'ve beaten his five, come back to me. There\'s something you should see before you go up.',
        ],
      },
    ],
    barks: [
      { when: PRINCE, lines: ['The lamp\'s for the boats now.'] },
      { lines: ['Mind the beam.', 'He\'s up in the lamp-room. He\'s always up in the lamp-room.'] },
    ],
  },

  // ── Spratt — the Dry Tithe booth ─────────────────────────────────────
  {
    id: 'tidewater-spratt',
    name: 'Tollkeeper Spratt',
    title: 'Clerk of the Dry Tithe',
    look: { body: 0xc9b4a0, accent: 0x7a2219, hat: 'tricorn', traits: ['book', 'glasses'], size: 0.95 },
    at: { x: 1380, y: 1600 },
    talks: [
      {
        when: QUEEN,
        lines: [
          'I have closed the booth. I have painted over the red. It is now a booth for selling tea. Tea is one coin.',
          'Nobody HAS to buy it. That\'s the bit I keep explaining. They look at me like I\'ve grown fins.',
        ],
      },
      {
        when: { questDone: 'tidewater-q-slack-water' },
        lines: [
          'You have the ledger key, the Prince is down, and I have very little left to clerk. It\'s restful.',
          'I\'ve started giving the coins back. Alphabetically. It\'s going to take a while.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'No orders from the lighthouse. I have rung the booth bell four times. No one comes to collect the coins.',
          'I\'ve started giving them back. Alphabetically. It\'s going to take a while.',
        ],
      },
      {
        lines: [
          'The Dry Tithe. One coin a head, paid before the bell, and your floor is given back at the ebb.',
          'You\'re not on my ledger. Visitors don\'t pay. Visitors don\'t have floors.',
          'I just write the numbers down. I didn\'t make the sea. Please stop looking at me like that.',
        ],
      },
    ],
    barks: [
      { when: PRINCE, lines: ['Coins back! Alphabetical! A to... B so far.'] },
      { lines: ['One coin a head, before the bell.', 'Paid? Paid. Next.', 'Ledger says you\'re dry. Lucky you.'] },
    ],
  },

  // ── Tamsy — the mudlark ──────────────────────────────────────────────
  {
    id: 'tidewater-tamsy',
    name: 'Tamsy',
    title: 'Mudlark',
    look: { body: 0xdcae8a, accent: 0x5f6b46, hat: 'beanie', traits: ['pack'], size: 0.72 },
    at: { x: 1000, y: 1220 },
    wander: 90,
    talks: [
      {
        when: QUEEN,
        lines: [
          'Found a crown in the mud! Not hers. A tin one. Off a cracker. I\'m keeping it. I\'m the Queen of the flats.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'Mud\'s better now. More stuff in it. People are throwing their tithe-tokens in the creeks for luck.',
        ],
      },
      {
        when: { questDone: 'tidewater-q-left-under' },
        lines: ['Mrs Mudge gave me a biscuit for the locket. A WHOLE biscuit. I\'ll find her a hundred lockets.'],
      },
      {
        lines: [
          'I\'m a mudlark. I find stuff in the mud at low water and sell it to Gilly. Spoons. Buttons. Teeth.',
          'Best finds are by the drowned row. People leave everything when they get left under.',
        ],
      },
    ],
    barks: [
      { lines: ['Ooh, a button.', 'Mud\'s up to my knees, it\'s brilliant.', 'Not a tooth. Is a tooth.'] },
    ],
  },
];

// ── The crowd ─────────────────────────────────────────────────────────

const looks: NpcLook[] = [
  { body: 0xd0aa88, accent: 0x40606a, hat: 'souwester', traits: ['rod'] },
  { body: 0xe2c4a8, accent: 0x6a7a80, hat: 'hood', traits: ['scarf'] },
  { body: 0xb8906e, accent: 0x3d434a, hat: 'none', traits: ['apron'] },
  { body: 0xd9b08c, accent: 0x8aa595, hat: 'beanie', traits: ['satchel'] },
  { body: 0xc49a7c, accent: 0x7f9fb0, hat: 'cap', traits: ['pack'], size: 0.76 },
  { body: 0xd8c0a2, accent: 0xc59f5f, hat: 'straw', traits: ['tool'] },
  { body: 0xc9a185, accent: 0x2c4a52, hat: 'souwester', traits: ['pipe', 'beard'], size: 1.15 },
  { body: 0xe3c7ad, accent: 0x5e6670, hat: 'bandana', traits: ['satchel'] },
];

const barks: Talk[] = [
  {
    when: QUEEN,
    lines: [
      'Tide came in. Tide went out. Nobody paid.',
      'They\'re waking the drowned!',
      'I left my door open at the flood. On purpose!',
      'No bell, no tithe, no Queen.',
    ],
  },
  {
    when: PRINCE,
    lines: [
      'Lighthouse is dark.',
      'Ebb yielded! The Prince of the tide!',
      'Is the Dry Tithe still on? Spratt\'s giving coins BACK.',
      'The Gauge runs slow again. Thank the deep.',
    ],
  },
  {
    when: { courtReady: 'tidewater' },
    lines: [
      'Someone\'s beaten all five of the Prince\'s.',
      'They say a stranger\'s going up to the lighthouse.',
    ],
  },
  {
    lines: [
      'Bell soon. Got your coin?',
      'The Pellows were left under last night.',
      'Mind the mark.',
      'One coin a head. Every head.',
      'Low row\'s gone green.',
      'Up the ladder before the hand hits blue.',
      'My floor\'s still wet from Tuesday.',
      'Keep off the sandbars at the flood.',
    ],
  },
];

export const TIDEWATER_CROWD: NonNullable<AreaDef['crowd']> = {
  count: 14,
  looks,
  paths: [
    // The High Walk, both ways.
    [{ x: 140, y: 560 }, { x: 1100, y: 560 }, { x: 2260, y: 560 }],
    [{ x: 2250, y: 560 }, { x: 1300, y: 560 }, { x: 150, y: 560 }],
    // Round the Gauge plaza.
    [{ x: 980, y: 690 }, { x: 1430, y: 690 }, { x: 1430, y: 980 }, { x: 980, y: 980 }],
    // The Low Walk, west to east.
    [{ x: 120, y: 860 }, { x: 900, y: 860 }, { x: 1500, y: 860 }, { x: 2280, y: 860 }],
    // Down to the toll booth and back.
    [{ x: 1200, y: 1000 }, { x: 1200, y: 1400 }, { x: 1300, y: 1580 }, { x: 1200, y: 1400 }],
    // The flats: mudlarks and cocklers.
    [{ x: 860, y: 1260 }, { x: 1080, y: 1380 }, { x: 1500, y: 1300 }, { x: 1080, y: 1200 }],
    // Up the dune path.
    [{ x: 640, y: 560 }, { x: 600, y: 360 }, { x: 860, y: 260 }, { x: 640, y: 380 }],
  ],
  barks,
};
