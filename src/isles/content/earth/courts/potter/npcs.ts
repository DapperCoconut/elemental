import type { AreaDef, NpcDef, NpcLook, Talk } from '../../../../IslesTypes';

/**
 * The people of the Potter's Court.
 *
 * The Potter's Court pays the Stone Tithe in fired clay: every household owes one terracotta
 * soldier a season, life-size, fired whole, to the Regent's weight. At muster each soldier is
 * tapped with an iron hammer — a sound pot rings, a cracked one *rings false* — and a soldier
 * that rings false is short. Short households are interred in the Sepulchre "until the debt is
 * quarried by others". Prince Glaze inspects the ranks himself. People here talk about sounds:
 * whether a thing rings, whether a kiln is drawing, whether a voice carries. Songs are buried
 * on the Regent's order, so the court has learnt to hum with its mouth shut.
 */

const PRINCE = { prince: 'glaze' } as const;
const REGENT = { monarch: 'gravane' } as const;

const Q_RING = 'potter-q-ringing';
const Q_LOACH = 'potter-q-loach';
const Q_SONGS = 'potter-q-songs';
const Q_DONKEY = 'potter-q-donkey';
const Q_GLOST = 'potter-q-glost';

export const POTTER_NPCS: NpcDef[] = [
  // ── Mabyn Tregear — the shop ─────────────────────────────────────────
  {
    id: 'potter-mabyn',
    name: 'Mabyn Tregear',
    title: 'Wheel & Wedge',
    look: { body: 0xd8b090, accent: 0x8cc4a8, hat: 'bandana', traits: ['apron', 'tool'], size: 1.05 },
    at: { x: 1480, y: 676 },
    role: { kind: 'shop', id: 'potter-shop' },
    talks: [
      {
        when: REGENT,
        lines: [
          'I threw a teapot this morning. A TEAPOT. Forty years of soldiers and I\'d forgotten I could make a spout.',
          'Charms are on the board, same as ever. Everything else in the shop is suddenly for drinking out of.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The Glost House is cold. First time in my life I\'ve seen the great kiln without smoke.',
          'Nobody\'s sure what to throw. Half the street\'s making bowls just to see if they still can.',
        ],
      },
      {
        when: { questDone: Q_RING },
        lines: [
          'Nan Fettle\'s soldier rang true at muster. True! With grog in the crack. The whole street heard it.',
          'I\'ve sold three pouches of grog since. People mending things. In this court. Imagine.',
        ],
      },
      {
        lines: [
          'Wheel and Wedge. Everything on that board was thrown on my wheel or wedged on my bench.',
          'You\'ll want to know about the Tithe. Everyone does. One soldier a household a season. Life-size.',
          'Fired whole. Tapped at muster. If it rings false — a crack, a dunt, a bubble — your household is short.',
          'Charms are on the board. You can wear three. Clay things, but they\'ll stand up for you.',
        ],
      },
    ],
    barks: [
      { when: PRINCE, lines: ['Bowls! Who wants a bowl!', 'Nobody\'s tapping anything today!'] },
      { lines: ['Wedge it well or it\'ll blow in the kiln.', 'Charms on the board!', 'Mind the slip, it\'s fresh.', 'Thrown today, fired Thursday.'] },
    ],
  },

  // ── Nan Fettle — the household whose soldier dunted ──────────────────
  {
    id: 'potter-nan',
    name: 'Nan Fettle',
    title: 'Number Nine, Fettlers\' Row',
    look: { body: 0xe0c0a0, accent: 0x9a1e24, hat: 'headwrap', traits: ['cane', 'apron'], size: 0.88 },
    at: { x: 1420, y: 1240 },
    talks: [
      {
        when: REGENT,
        lines: [
          'They opened the cells under the mountain. Old Hobb from Number Four came home. He\'s thin as a spill.',
          'He sat on my step and I gave him tea in a cup I made. Not a soldier. A cup. He held it with both hands.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The Prince came down to the ranks this morning with a pot of gold and a brush. No hammer.',
          'He was mending the cracked ones. Painting gold in the cracks. I don\'t know what to make of that.',
        ],
      },
      {
        when: { questDone: Q_RING },
        lines: [
          'It rang. You heard it. My Davey\'s soldier rang like a bell, grog and all, and Davey\'s at home.',
          'I\'ve put my hand on it every morning since. Just to feel it standing there. Stupid old woman.',
        ],
      },
      {
        when: { quest: Q_RING },
        lines: [
          'Grog, love. Old fired clay, ground fine. You\'ll find the best pieces round the Shard Ruck.',
          'Pack it in the crack with slip and it fires in. Then take it to Tallis. He taps honest, Tallis.',
        ],
      },
      {
        lines: [
          'That one. Third in the front rank. That\'s my Davey\'s soldier. You see the hairline? Up the chest.',
          'It dunted in the cooling. Kiln opened too soon. Not his fault. Never mind whose. It\'ll ring false.',
          'A soldier that rings false is short. Short is interred. They\'ll wall him up under the mountain.',
        ],
      },
    ],
    barks: [
      { when: { questDone: Q_RING }, lines: ['It rang. It RANG.', 'Davey\'s home for supper.'] },
      { lines: ['Three days to muster.', 'Up the chest, the crack goes.', 'Kiln opened too soon.', 'Don\'t tap it. Don\'t.'] },
    ],
  },

  // ── Tallis Marl — the muster clerk ───────────────────────────────────
  {
    id: 'potter-tallis',
    name: 'Tallis Marl',
    title: 'Muster-Clerk of the Tithe Ranks',
    look: { body: 0xd4b89c, accent: 0x2a4a9a, hat: 'cap', traits: ['glasses', 'book'], size: 1 },
    at: { x: 1440, y: 1050 },
    talks: [
      {
        when: REGENT,
        lines: [
          'I\'ve been asked to count the soldiers one last time. For a monument. Not a tithe. A monument.',
          'Four thousand two hundred and six. Every one of them somebody\'s season. I wrote all the names on.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'No muster this season. I sat in the Muster House with my hammer in my lap and nobody came.',
          'I\'ve never not tapped anything. My hands keep doing it on the table. Tap. Tap.',
        ],
      },
      {
        when: { questDone: Q_RING },
        lines: [
          'I tap true. I always have. The Fettle soldier rang. Whatever the Rank-Warden thinks he heard.',
          'I put it in the book in ink. Ink doesn\'t come off. That\'s why I like it.',
        ],
      },
      {
        lines: [
          'Muster-Clerk. I tap the soldiers and I write down what I hear. That\'s the whole of the job.',
          'A sound pot rings. A cracked one buzzes. There\'s no arguing with a sound. That\'s the cruelty of it.',
          'The Rank-Warden has an iron hammer. Heavier than mine. Things he taps don\'t always ring after.',
        ],
      },
    ],
    barks: [
      { when: PRINCE, lines: ['Tap. Tap.', 'No muster. No muster.'] },
      { lines: ['Rank three, file seven: rings.', 'Ink, not chalk.', 'Ting. Ting. Bzzz — oh dear.', 'Four thousand and some.'] },
    ],
  },

  // ── Elwin Slipper — the old pond fisher ──────────────────────────────
  {
    id: 'potter-elwin',
    name: 'Elwin Slipper',
    title: 'Fishes the Slip',
    look: { body: 0xc8a888, accent: 0x8a5f42, hat: 'straw', traits: ['rod', 'beard', 'pipe'], size: 1.05 },
    at: { x: 720, y: 1240 },
    talks: [
      {
        when: REGENT,
        lines: [
          'Glazed tench come up in the pond this morning, three of them, green as the Prince\'s roof. A sign, that is.',
          'Of what I don\'t know. I\'m going to cook one and find out.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'No Slip-Reeve on the bank today. I fished all morning and nobody wrote down a single loach.',
          'Didn\'t taste any different. I thought it might. Freedom, I thought, might be in the flavour.',
        ],
      },
      {
        when: { questDone: Q_LOACH },
        lines: [
          'The placers ate. You should\'ve seen them — black to the eyebrows, spoons going like wheels.',
          'The Reeve\'s gone quiet. I think he\'s scared of you. I think he\'s scared of loach.',
        ],
      },
      {
        when: { quest: Q_LOACH },
        lines: [
          'Cast in near the jetty. Loach lie on the bottom, in the thick. Iron rod or better, mind — it\'s a bog.',
          'Three for the pot. Take them to Jory on Kiln Row. Don\'t let the Reeve see the creel.',
        ],
      },
      {
        lines: [
          'Slip pond. Clay from the pits, runs down the channel, settles here. The fish don\'t mind. Fish never do.',
          'Clay loach. Kiln catfish by the warm outfall. Glazed tench, if you\'re lucky and patient and old.',
          'The Slip-Reeve says the fish are slip, and the slip is the Prince\'s. Says it every morning. Writes it down.',
        ],
      },
    ],
    barks: [
      { lines: ['Thick today.', 'Bite\'s slow in the slip.', 'Loach on the bottom.', 'Don\'t splash, lad.'] },
    ],
  },

  // ── Jory Placer — the kiln boy ───────────────────────────────────────
  {
    id: 'potter-jory',
    name: 'Jory Placer',
    title: 'Placer\'s Boy, Kiln Row',
    look: { body: 0xb08868, accent: 0x2c2220, hat: 'cap', traits: ['scarf'], size: 0.76, eye: 0xffd27a },
    at: { x: 300, y: 590 },
    talks: [
      {
        when: REGENT,
        lines: [
          'I\'m not a placer any more! Mum says I\'m going to the school. There\'s going to be a SCHOOL.',
          'I asked what they teach there and she said songs. Real ones. The buried ones. I don\'t know any yet.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'Kiln Row\'s let out! Nobody\'s firing! I\'ve got no saggars on my head and my neck feels funny.',
          'I keep looking up. You don\'t look up much, carrying saggars. The cliff\'s got stripes on. Did you know?',
        ],
      },
      {
        when: { questDone: Q_LOACH },
        lines: [
          'Loach stew! I had two bowls. Big Tam had four and was sick behind number three kiln.',
          'You\'re the best person. Except Mum. And maybe Elwin. You\'re third best. That\'s very good.',
        ],
      },
      {
        lines: [
          'I carry the saggars in. On my head, like this — you go in the wicket and stack them up to the crown.',
          'Twelve hours in, firing days. It\'s hot. You don\'t drink, you sweat. The foreman says I\'m quick.',
          'Number three kiln\'s cold. It dunted a whole firing of soldiers. The Rank-Warden bricked it up.',
        ],
      },
    ],
    barks: [
      { when: PRINCE, lines: ['No saggars today!', 'Look, the cliff\'s got stripes!'] },
      { lines: ['Mind your head!', 'Coming through, saggar up!', 'Twelve high, twelve high!', 'I\'m starving.'] },
    ],
  },

  // ── Tobiah Pugg — the clay digger ────────────────────────────────────
  {
    id: 'potter-tobiah',
    name: 'Tobiah Pugg',
    title: 'Digs the Red Marl',
    look: { body: 0xb88a68, accent: 0xa65f3a, hat: 'miner', traits: ['beard', 'tool', 'pack'], size: 1.25 },
    at: { x: 570, y: 840 },
    talks: [
      {
        when: REGENT,
        lines: [
          'I dug a hole this morning for no reason. Just to dig. Found a cart-wheel from the old capital, four foot down.',
          'Everything here\'s buried on top of something else. Biscuit\'s glad of the rest, anyway.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The pug mill\'s turning for bowls and jugs now. Not soldiers. Biscuit walks round slower. Happier, I think.',
          'Donkeys know. They always know what the clay\'s for.',
        ],
      },
      {
        when: { questDone: Q_DONKEY },
        lines: [
          'Biscuit! Look at her. Home on the mill, ears up, a crust of Wenna\'s bread in her.',
          'Wenna sent the bread. Said sorry. I didn\'t know Wenna could say sorry. She\'s never had to before.',
        ],
      },
      {
        when: { quest: Q_DONKEY },
        lines: [
          'Ask the Steward up at the Glost House where they\'ve put her. He knows everything that\'s been taken.',
          'And if she\'s turning the Great Wheel, you\'ll have to have it out with Wenna. Nobody else will.',
        ],
      },
      {
        lines: [
          'I dig the marl. Down through the red to the grey, where the good clay is. Shovel, barrow, pug mill.',
          'Pug mill\'s turned by Biscuit. My donkey. WAS turned. They took her three days back. Requisitioned.',
          'For the Prince\'s great wheel, they said. A donkey on a wheel that size, she\'ll walk herself to death.',
        ],
      },
    ],
    barks: [
      { when: { questDone: Q_DONKEY }, lines: ['Walk on, Biscuit.', 'Good girl, good girl.'] },
      { lines: ['Red on top, grey below.', 'Who took my donkey.', 'Mill won\'t turn itself.', 'Mind the pit edge.'] },
    ],
  },

  // ── Granny Sgraffito — who scratches the songs ───────────────────────
  {
    id: 'potter-granny',
    name: 'Granny Sgraffito',
    title: 'Scratches Through the Slip',
    look: { body: 0xe4ccb0, accent: 0x2e5cc0, hat: 'veil', traits: ['glasses', 'tool', 'cane'], size: 0.84, eye: 0xc4ecd6 },
    at: { x: 1760, y: 630 },
    talks: [
      {
        when: REGENT,
        lines: [
          'They\'re singing in Wheel Square. Out loud. Songs I scratched under glaze sixty years ago.',
          'They\'re singing them off my pots. Wrong tune, half of them. I don\'t care. I don\'t care at all.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'Glaze was the only one of his father\'s children who ever asked me what the scratches said.',
          'He was six. I told him. He never told on me. I think about that a great deal.',
        ],
      },
      {
        when: { questDone: Q_SONGS },
        lines: [
          'All four fired. All four under celadon, where nobody can bury them. Songs in the glaze.',
          'One day someone will break one of those jars, and there it\'ll be, the whole song, in the shard.',
        ],
      },
      {
        when: { quest: Q_SONGS },
        lines: [
          'Four jars, love, hidden among the greenware on the terraces. You\'ll know them — dark slip, my scratching.',
          'Take them to Wren at the glaze house. She knows which glaze keeps a secret.',
        ],
      },
      {
        lines: [
          'Sgraffito, dear. You coat the pot in dark slip and scratch through to the pale. Lines. Patterns.',
          'The Regent buried songs. Took the books, took the singers. Can\'t bury what\'s scratched round a jar.',
          'Glaze it over, fire it in, and it\'s a jar. Just a jar with pretty lines. Hum a bit, and look closer.',
        ],
      },
    ],
    barks: [
      { when: REGENT, lines: ['That\'s my verse!', 'Wrong tune. Lovely.'] },
      { lines: ['Mm-hm-hm.', 'Scratch, scratch.', 'Pretty lines, that\'s all.', 'Look closer, dear.'] },
    ],
  },

  // ── Wren Saltglaze — the glaze-mixer ─────────────────────────────────
  {
    id: 'potter-wren',
    name: 'Wren Saltglaze',
    title: 'Glaze House Apprentice',
    look: { body: 0xd6b498, accent: 0x9a1e24, hat: 'goggles', traits: ['apron', 'satchel'], size: 0.95, eye: 0x7aa0f0 },
    at: { x: 2250, y: 740 },
    talks: [
      {
        when: REGENT,
        lines: [
          'I\'m mixing a new glaze. No name yet. Cobalt and gold and a pinch of ash from the Sepulchre doors.',
          'It comes out the colour of morning. I\'m going to call it Morning. Celadon can call hers what she likes.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The Prince came in and asked for gold. Just gold, for mending. He paid for it. Out of his own purse.',
          'Nobody in the Glost House has ever paid the glaze house for anything.',
        ],
      },
      {
        when: { questDone: Q_SONGS },
        lines: [
          'Four jars, celadon over Granny\'s scratching. I fired them in the Prince\'s own kiln, with his tea set.',
          'If anybody asks, they\'re tea caddies. Very good tea caddies. Hum quietly when you pass them.',
        ],
      },
      {
        lines: [
          'Celadon, cobalt, oxblood. The three glazes. Everything else is a mix of them, or a mistake.',
          'Celadon\'s the Prince\'s. Cobalt\'s the Regent\'s, for the tithe-marks. Oxblood\'s for the rejects.',
          'They paint the oxblood cross on a soldier that rings false. Then it goes on the Ruck.',
        ],
      },
    ],
    barks: [
      { lines: ['Two parts ash, one feldspar…', 'Don\'t lick the cobalt.', 'Celadon\'s running thin.', 'Stir from the bottom.'] },
    ],
  },

  // ── Steward Aumbry Sherd — the Glost House steward ───────────────────
  {
    id: 'potter-sherd',
    name: 'Aumbry Sherd',
    title: 'Steward of the Glost House',
    look: { body: 0xe2d0b8, accent: 0x7fbcaa, hat: 'tophat', traits: ['glasses', 'book'], size: 1.1 },
    at: { x: 1040, y: 470 },
    talks: [
      {
        when: REGENT,
        lines: [
          'The Regent is down, and the Old King\'s tomb was empty. His Highness took the news very quietly.',
          'Then he went into the great kiln, cold as it is, and sat in the dark. He says it\'s the only quiet place.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'His Highness has the gold out. He is mending the reject soldiers off the Ruck, one by one.',
          'Four thousand, the Ruck holds. He says he has time. I have never heard him say he had time.',
        ],
      },
      {
        when: { quest: Q_GLOST },
        lines: [
          'Granny Sgraffito first, then the Ruck. He will not come out until you have stood at the Ruck.',
          'I have swept the forecourt twice. There is nothing to sweep. I keep finding things to sweep.',
        ],
      },
      {
        when: { questDone: Q_DONKEY },
        lines: [
          'The donkey. Yes. I signed for the donkey. I sign for everything that is taken. It is in the ledger.',
          'I have struck it through. I have never struck anything through. It felt like dropping a pot.',
        ],
      },
      {
        when: { quest: Q_DONKEY },
        lines: [
          'The donkey Biscuit was requisitioned for the Great Wheel in Wheel Square. Thrower Wenna has her.',
          'I would not go and ask Wenna for it. People who ask Wenna for things end up on the wheel.',
        ],
      },
      {
        lines: [
          'This is the Glost House. The glaze kiln of the court, and His Highness the Prince Glaze\'s seat.',
          'He inspects the ranks himself, at muster. He taps each soldier, listens, and never says a word.',
          'He is very particular about cracks. He cannot abide them. I have often wondered why.',
        ],
      },
    ],
    barks: [
      { lines: ['Signed for, signed for.', 'His Highness is firing.', 'Mind the tiles.', 'No cracks in the forecourt.'] },
    ],
  },
];

// ── The crowd ────────────────────────────────────────────────────────

const looks: NpcLook[] = [
  { body: 0xc89a78, accent: 0xa65f3a, hat: 'bandana', traits: ['apron'] },
  { body: 0xb88a68, accent: 0x2c2220, hat: 'cap', traits: ['scarf'], size: 0.76 },
  { body: 0xdcb898, accent: 0x8cc4a8, hat: 'headwrap', traits: ['apron', 'tool'] },
  { body: 0xa87a58, accent: 0x5e2a1c, hat: 'miner', traits: ['beard', 'pack'], size: 1.2 },
  { body: 0xe0c4a8, accent: 0x2e5cc0, hat: 'none', traits: ['satchel'] },
  { body: 0xd2a888, accent: 0x9a1e24, hat: 'headwrap', traits: ['cane'], size: 0.88 },
  { body: 0xc49a7a, accent: 0xd2b28a, hat: 'straw', traits: ['tool', 'apron'] },
  { body: 0xbe9070, accent: 0x463834, hat: 'beanie', traits: ['pack'], size: 0.8 },
];

const barks: Talk[] = [
  {
    when: REGENT,
    lines: [
      'They\'re opening the cells!',
      'Sing it louder!',
      'I made a cup. Just a cup.',
      'The Old King\'s tomb was EMPTY.',
    ],
  },
  {
    when: PRINCE,
    lines: [
      'The Prince yielded!',
      'No muster this season!',
      'He\'s mending the rejects. With gold.',
      'Glost House is cold.',
    ],
  },
  {
    when: { courtReady: 'potter' },
    lines: [
      'All five of the Prince\'s, beaten.',
      'The stranger\'s going up to the Glost House.',
    ],
  },
  {
    lines: [
      'Three days to muster.',
      'Did yours ring?',
      'Kiln Row\'s drawing well.',
      'Don\'t touch the ranks.',
      'Wedge it, wedge it.',
      'Number three kiln dunted again.',
      'Mm-hm-hm. Mm.',
      'Rang true, thank the clay.',
    ],
  },
];

export const POTTER_CROWD: NonNullable<AreaDef['crowd']> = {
  count: 14,
  looks,
  paths: [
    // Along the Kiln Road and back.
    [{ x: 2300, y: 800 }, { x: 1900, y: 800 }, { x: 1420, y: 812 }, { x: 1900, y: 800 }],
    // Round Wheel Square.
    [{ x: 1050, y: 700 }, { x: 1350, y: 700 }, { x: 1340, y: 930 }, { x: 1030, y: 930 }],
    // Down the Dunesea road.
    [{ x: 1200, y: 1030 }, { x: 1200, y: 1520 }, { x: 1200, y: 1030 }],
    // Kiln Lane, saggars on heads.
    [{ x: 1060, y: 690 }, { x: 800, y: 580 }, { x: 220, y: 580 }, { x: 800, y: 580 }],
    // The army aisle.
    [{ x: 1890, y: 1080 }, { x: 1890, y: 1500 }, { x: 1890, y: 1080 }],
    // Up the terrace lane to the racks.
    [{ x: 1940, y: 770 }, { x: 1940, y: 230 }, { x: 1940, y: 770 }],
    // The west lane to the pits and the pond road.
    [{ x: 1000, y: 830 }, { x: 640, y: 800 }, { x: 700, y: 1000 }, { x: 760, y: 1200 }, { x: 700, y: 1000 }, { x: 640, y: 800 }],
  ],
  barks,
};
