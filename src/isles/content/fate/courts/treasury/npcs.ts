import type { AreaDef, NpcDef, NpcLook, Talk } from '../../../../IslesTypes';

/**
 * The people of the Treasury Court.
 *
 * The Treasury is where the Draw's debts are paid. Every household drawn for the Wager-Tithe
 * carries its stake here to be weighed on the Scales of Tribute, and the scales always find it a
 * little short; the difference is "made up in kind". The mint strikes every coin on the isle, the
 * counting-houses lend you the stake you owe at interest you cannot pay, and the Great Vault keeps
 * the Lot Register — every number on Lotterhaven, and (everyone whispers) a red mark beside the
 * favourites' that means *never to be drawn*. People here talk about money the way sailors talk
 * about the weather: constantly, and as if it were a god.
 */

const PRINCE = { prince: 'bullion' } as const;
const KING = { monarch: 'lucan' } as const;

const Q_WEIGHT = 'treasury-q-short-weight';
const Q_FOOLS = 'treasury-q-fools-gold';
const Q_REGISTER = 'treasury-q-lot-register';
const Q_PASSAGE = 'treasury-q-free-passage';
const Q_STANDARD = 'treasury-q-gold-standard';

export const TREASURY_NPCS: NpcDef[] = [
  // ── Ottilie Ledgerwhite — the shop ───────────────────────────────────
  {
    id: 'treasury-ottilie',
    name: 'Ottilie Ledgerwhite',
    title: 'Moneychanger',
    look: { body: 0xe6cfb4, accent: 0x2f7a4a, hat: 'visor', traits: ['glasses', 'apron', 'satchel'], size: 0.95 },
    at: { x: 900, y: 984 },
    role: { kind: 'shop', id: 'treasury-shop' },
    talks: [
      {
        when: KING,
        lines: [
          'I changed a man\'s coin today and he didn\'t count it after. Didn\'t COUNT it. Trusted me.',
          'I had to sit down. Charms are on the tray, same prices. I\'ll be honest about them. It\'s the fashion now.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The Scales stand empty and the clerks have gone home. Nobody\'s been weighed since the Prince knelt.',
          'Trade\'s brisk. Turns out people spend money when the House isn\'t taking it first. Who knew.',
        ],
      },
      {
        when: { questDone: Q_WEIGHT },
        lines: [
          'You put an honest weight on the Scales of Tribute. In front of the clerks. In front of the QUEUE.',
          'Agnes Groat\'s been in. She bought a ribbon. First thing she\'s bought for herself in nine years.',
        ],
      },
      {
        lines: [
          'Change, stranger? Ledgerwhite\'s Exchange — I\'ll give you crowns for coppers at the King\'s rate.',
          'The King\'s rate is set by the House. It changes when you\'re not looking. I don\'t look.',
          'The charms on the tray are mint-made. Wear three. They play the court\'s own tricks for you.',
          'And mind your Lot. If you haven\'t got one, don\'t tell anyone. They\'ll issue you one.',
        ],
      },
    ],
    barks: [
      { when: PRINCE, lines: ['Honest rates! Today only! And tomorrow!', 'No Tithe on the change, friends!'] },
      { lines: ['Crowns for coppers!', 'Change at the King\'s rate!', 'Count it twice. I won\'t mind.', 'Charms on the tray, mint-made.'] },
    ],
  },

  // ── Widow Agnes Groat — always a little short ────────────────────────
  {
    id: 'treasury-agnes',
    name: 'Agnes Groat',
    title: 'Drawn for the Tithe, Nine Weeks Running',
    look: { body: 0xd8c0a8, accent: 0x5a3a4a, hat: 'veil', traits: ['cane', 'scarf'], size: 0.88 },
    at: { x: 1440, y: 900 },
    talks: [
      {
        when: KING,
        lines: [
          'My Lot came out of the drum\'s false bottom. Nine weeks running, they said. It was never drawn at all.',
          'They just wrote my number down. Every week. Because I always paid. Fancy that.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'No queue today. I stood here anyway, from habit. Then I went and bought a bun.',
          'The Prince is sat on his steps with his coat off. Nobody knows what he\'s for, now.',
        ],
      },
      {
        when: { questDone: Q_WEIGHT },
        lines: [
          'The honest weight. On the pan. And the clerk\'s face! Like a man finding his own pocket picked.',
          'They gave me back nine weeks of "short". Nine weeks! I\'ve bought a ribbon. Blue.',
        ],
      },
      {
        when: { quest: Q_WEIGHT },
        lines: [
          'Nell Hammerly at the mint keeps the Standard — the true pound, locked in the yard. Ask her nicely.',
          'Then put it on the Scales. If the pan sinks for a true pound, the House\'s weights are light. I KNOW it.',
        ],
      },
      {
        lines: [
          'Drawn again. Nine weeks. Nine weeks my number\'s come out of that drum for the Wager-Tithe.',
          'I bring the stake. They weigh it. It\'s always short — a little — and the short is made up in kind.',
          'In kind means my chairs. My clock. My husband\'s good coat. I\'ve nothing left with a weight to it.',
        ],
      },
    ],
    barks: [
      { when: { questDone: Q_WEIGHT }, lines: ['Honest weight!', 'Blue. A blue ribbon.'] },
      { lines: ['Nine weeks.', 'Always a little short.', 'In kind, they say. In KIND.', 'My husband\'s good coat.'] },
    ],
  },

  // ── Nell Hammerly — keeps the beat at the presses ────────────────────
  {
    id: 'treasury-nell',
    name: 'Nell Hammerly',
    title: 'Press-Hand, Third Bay',
    look: { body: 0xc8a284, accent: 0x3a3f4a, hat: 'coif', traits: ['apron', 'tool', 'bandage'], size: 1.15 },
    at: { x: 990, y: 452 },
    talks: [
      {
        when: KING,
        lines: [
          'We\'ve stopped the presses. First time in forty years. You can hear the birds in the yard.',
          'We\'re going to strike one more coin. Everyone\'s name on it, very small. Then we\'ll melt the dies.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'Prince Bullion came down the yard and asked me how the press worked. Asked! I showed him.',
          'He swung the bar himself. Badly. Then he laughed. I\'ve never heard him laugh. Nobody has.',
        ],
      },
      {
        when: { questDone: Q_STANDARD },
        lines: ['Told you about the boy, did I? Mind you don\'t tell him I told. He still blushes about the coin.'],
      },
      {
        when: { questDone: Q_WEIGHT },
        lines: [
          'The Standard\'s back in its box. Bit of gilt rubbed off the handle. Worth it, for Agnes.',
          'Forty years I\'ve kept that pound true. First time it\'s ever been used for anything.',
        ],
      },
      {
        lines: [
          'Mind the presses — they don\'t stop for anyone. Every coin on the isle comes off these dies.',
          'Struck with the King\'s face on one side and the House\'s wheel on the other. Heads he wins.',
          'Tails, the House does. I didn\'t make the joke. I just strike it, four hundred times an hour.',
        ],
      },
    ],
    barks: [
      { when: KING, lines: ['Listen. Birds.', 'Melt the dies.'] },
      { lines: ['Four hundred an hour!', 'Mind your fingers!', 'Heads he wins, tails they do.', 'Swing the bar — and DOWN.'] },
    ],
  },

  // ── Jory Farthing — a busted boy at the pool ─────────────────────────
  {
    id: 'treasury-jory',
    name: 'Jory Farthing',
    title: 'No. 2211, Busted',
    look: { body: 0xd4b294, accent: 0x111014, hat: 'cap', traits: ['rod', 'bandage'], size: 0.76 },
    at: { x: 1560, y: 1206 },
    talks: [
      {
        when: KING,
        lines: [
          'They read my name aloud in the square. Jory Farthing. I\'d forgot what it sounded like said loud.',
          'The black chip\'s going in the bell. I\'m going to ring it. Marlo said I could ring it first.',
        ],
      },
      {
        when: PRINCE,
        lines: ['The Pool-Reeve\'s gone. The Prince let the pool go free. Anybody can fish it now. Anybody!'],
      },
      {
        when: { questDone: Q_FOOLS },
        lines: [
          'Ma\'s paid the interest. Not the loan — the interest. But it\'s a week we don\'t owe. A whole week.',
          'I\'m still busted. Still 2211. But Ma says Jory at home. I like being Jory at home.',
        ],
      },
      {
        when: { quest: Q_FOOLS },
        lines: [
          'The ingot ide swallow the mint\'s spill — there\'s a gold flake in every belly. Two would do.',
          'You need a fortune rod for gilded water. Tosswater\'s tackle shop sells them. Take them to Ma.',
        ],
      },
      {
        lines: [
          'I\'m not supposed to say my name. I\'m 2211. That\'s what the chip says. Black chip, busted.',
          'Ma bet our house against the House for a re-draw. She lost. Everybody loses. Then they bust you.',
          'I fish here when the Reeve isn\'t looking. The fish eat the mint\'s spill. Their bellies are GOLD.',
        ],
      },
    ],
    barks: [
      { when: { questDone: Q_FOOLS }, lines: ['A whole week!', 'Jory at home.'] },
      { lines: ['Two-two-one-one.', 'Gold in their bellies.', 'Don\'t tell the Reeve.', 'Bite, bite, bite.'] },
    ],
  },

  // ── Bess Farthing — Jory's mother, a laundress in debt ───────────────
  {
    id: 'treasury-bess',
    name: 'Bess Farthing',
    title: 'Laundress, In Debt to Compound',
    look: { body: 0xdcbca0, accent: 0x5a86a8, hat: 'headwrap', traits: ['apron', 'satchel'], size: 1 },
    at: { x: 1080, y: 1322 },
    talks: [
      {
        when: KING,
        lines: [
          'Compound came round with the ledger. He tore our page out and handed it to me. Didn\'t say a word.',
          'I\'ve used it to light the copper. It burned green. Bank ink burns green, did you know?',
        ],
      },
      {
        when: PRINCE,
        lines: ['They say the Exchequer\'s forgiving the Row\'s loans. One page a day. Ours is page four hundred.'],
      },
      {
        when: { questDone: Q_FOOLS },
        lines: [
          'You brought me gold out of a fish. Out of a FISH. And then you thrashed the Reeve for it.',
          'Jory\'s been telling everyone. He says you\'re his friend. Be careful — he means it.',
        ],
      },
      {
        lines: [
          'I wash the bankers\' shirts. Twelve houses on the Row. It pays a shilling a basket.',
          'The loan for our re-draw stake costs two shillings a day. You can see the trouble.',
          'Don\'t ever borrow from Compound. He\'s kind about it. That\'s the worst part. He\'s so kind.',
        ],
      },
    ],
    barks: [
      { lines: ['A shilling a basket.', 'Starch, starch, starch.', 'Two shillings a day.', 'Mind the wet linen!'] },
    ],
  },

  // ── Clemency Sterling — a vault clerk with a secret ──────────────────
  {
    id: 'treasury-clemency',
    name: 'Clemency Sterling',
    title: 'Under-Clerk of the Lot Register',
    look: { body: 0xe8d2bc, accent: 0x1f5a3a, hat: 'visor', traits: ['book', 'glasses'], size: 0.92 },
    at: { x: 1440, y: 528 },
    talks: [
      {
        when: KING,
        lines: [
          'The drum had a false bottom. Full of Lots. All of them with my red mark beside them in the Register.',
          'I copied those marks for six years and told myself it was clerical. It was the whole trick.',
        ],
      },
      {
        when: PRINCE,
        lines: ['The vault door\'s stood open. People walk in and look at the gold. Nobody takes any. They just look.'],
      },
      {
        when: { questDone: Q_REGISTER },
        lines: [
          'The pages are with a printer in Tosswater. Every favourite\'s number, every red mark. A thousand copies.',
          'I\'ve been sacked, obviously. I\'ve never slept better. Imagine that.',
        ],
      },
      {
        when: { quest: Q_REGISTER },
        lines: [
          'The pages blew out of my satchel when the Warden saw me — four of them. Round the vault and the road.',
          'Get them before Warden Hasp does. He reads very slowly, but he reads.',
        ],
      },
      {
        lines: [
          'I copy the Lot Register. Every number on the isle, by household, in a fair hand. Green ink.',
          'Some numbers have a little red mark beside them. I\'m told it means "verified". I\'m told.',
          'Every red-marked number belongs to a favourite of the House. And none of them has ever been drawn.',
        ],
      },
    ],
    barks: [
      { lines: ['Green ink, fair hand.', 'Verified. Verified. Verified.', 'Never drawn. Never once.', 'Nobody reads the margins.'] },
    ],
  },

  // ── Dobbin Haypenny — a carter at the toll bridge ────────────────────
  {
    id: 'treasury-dobbin',
    name: 'Dobbin Haypenny',
    title: 'Grain Carter, Tosswater Road',
    look: { body: 0xc49a7c, accent: 0x7a5536, hat: 'straw', traits: ['pipe', 'beard'], size: 1.2 },
    at: { x: 2200, y: 1020 },
    talks: [
      {
        when: KING,
        lines: [
          'They\'ve taken the turnstiles off the bridge and stood them in the square as a joke. People spin them.',
          'I drove over this morning and nobody charged me. I went back and drove over again. For the feel of it.',
        ],
      },
      {
        when: PRINCE,
        lines: ['The toll\'s down to a copper. Levy\'s still on the bridge, mind. Just likes the view now, he says.'],
      },
      {
        when: { questDone: Q_PASSAGE },
        lines: [
          'Over the bridge on a token, and Levy laid out in the road. I\'ll be telling that one to my grandsons.',
          'The bakers on the Row will have bread this week. Bread! Without the House buttering it first.',
        ],
      },
      {
        when: { quest: Q_PASSAGE },
        lines: ['Tokens went in the race when Levy kicked my cart. They wash up on the banks. Four, there were.'],
      },
      {
        lines: [
          'Toll\'s gone up again. Third time this month. Levy says the King\'s bridge needs its upkeep.',
          'It\'s a plank bridge, friend. I\'ve watched them upkeep it. A man with a brush, once a year.',
          'I\'ve a cart of grain for the Row\'s bakers and not the coin to cross. So here I sit. Smoking.',
        ],
      },
    ],
    barks: [
      { when: { questDone: Q_PASSAGE }, lines: ['Free passage!', 'Bread for the Row!'] },
      { lines: ['Third time this month.', 'A man with a brush.', 'Whoa, Clover. Whoa.', 'Upkeep, he says.'] },
    ],
  },

  // ── Comptroller Hesper Vane — Bullion's steward ──────────────────────
  {
    id: 'treasury-vane',
    name: 'Hesper Vane',
    title: 'Comptroller of the Exchequer',
    look: { body: 0xe0c8b0, accent: 0xe8b830, hat: 'tophat', traits: ['cane', 'glasses', 'book'], size: 1.05 },
    at: { x: 180, y: 924 },
    talks: [
      {
        when: KING,
        lines: [
          'His Highness has taken a room over the bakery on the Row. He says it\'s the first room he\'s ever paid for.',
          'He keeps the receipt in a frame. He shows it to visitors. He is, I think, happy.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'He\'s taken the gilt off. All of it. Sat in the forecourt with a chisel. Underneath, he\'s rather pale.',
          'He asked me what a fair wage was. I told him. He wrote it down. Then he doubled mine. I cried.',
        ],
      },
      {
        when: { courtReady: 'treasury' },
        lines: ['All five of his. He\'s watched from the dome. He\'s polishing himself. That is what he does when afraid.'],
      },
      {
        lines: [
          'The Exchequer, stranger. His Highness Prince Bullion receives by appointment. Appointments cost.',
          'He is the King\'s lucky child — his Lot has never been drawn. He wears it gilt, over the door. See it?',
          'His Highness is worth exactly his weight in gold. He has himself weighed every morning. To be sure.',
        ],
      },
    ],
    barks: [
      { when: PRINCE, lines: ['A fair wage. A FAIR wage.', 'Mind the gilt flakes.'] },
      { lines: ['By appointment only.', 'Appointments cost.', 'His weight in gold.', 'The ledger balances.'] },
    ],
  },

  // ── Ambrose Coffer — a banker on the Row ─────────────────────────────
  {
    id: 'treasury-ambrose',
    name: 'Ambrose Coffer',
    title: 'Coffer & Sons, Lenders',
    look: { body: 0xe4ccb4, accent: 0x141218, hat: 'tophat', traits: ['pipe', 'cane'], size: 1.1 },
    at: { x: 400, y: 1226 },
    talks: [
      {
        when: KING,
        lines: [
          'The debts are cancelled. All of them. By proclamation. Coffer and Sons is ruined, and I feel... light.',
          'Sons are delighted. They wanted to be glaziers. I\'ve a feeling I\'ll make a passable glazier\'s clerk.',
        ],
      },
      {
        when: PRINCE,
        lines: ['The Prince has asked to see our books. ALL our books. I have three sets. I\'m going to need a fourth.'],
      },
      {
        lines: [
          'Coffer and Sons, lenders to the drawn since my grandfather. A household owes the Tithe — we stake them.',
          'At interest, naturally. The House always wins the wager, so they never repay. So they owe us forever.',
          'It\'s a very stable business. The most stable on the isle. I sleep like a stone, sir. Like a stone.',
        ],
      },
    ],
    barks: [
      { lines: ['Compound interest is a lovely thing.', 'Stake you, sir? Stake you?', 'Like a stone.', 'Sign here. And here.'] },
    ],
  },

  // ── No. 4017 — a busted croupier who may not say his name ────────────
  {
    id: 'treasury-4017',
    name: 'No. 4017',
    title: 'Busted, in the Service of the House',
    look: { body: 0xc8b49e, accent: 0x111014, hat: 'visor', traits: ['mask'], size: 1, eye: 0xb8b0a0 },
    at: { x: 1056, y: 968 },
    talks: [
      {
        when: KING,
        lines: [
          'My name is Tobias Ware. Tobias Ware. I\'m going to keep saying it until it stops feeling like theft.',
          'Tobias Ware. Thank you. Tobias Ware.',
        ],
      },
      {
        when: PRINCE,
        lines: ['(he points at the black chip on his chain, and then at the empty Scales, and very slightly smiles)'],
      },
      {
        lines: [
          '(he taps the black chip on his chain where his Lot should hang, and shakes his head: he may not speak)',
          '(he points at the clerks\' weights, holds up one finger and his thumb a hair apart: light. Always light.)',
        ],
      },
    ],
    barks: [{ lines: ['(click of a chip on a chain)', '(a long look at the Scales)'] }],
  },
];

const looks: NpcLook[] = [
  { body: 0xe4ccb4, accent: 0x141218, hat: 'tophat', traits: ['cane'] },
  { body: 0xd6b494, accent: 0x2f7a4a, hat: 'visor', traits: ['book'] },
  { body: 0xc49a7c, accent: 0x9a2230, hat: 'cap', traits: ['satchel'] },
  { body: 0xdcbca0, accent: 0x5a3a4a, hat: 'veil', traits: ['scarf'] },
  { body: 0xb8906e, accent: 0x3a3f4a, hat: 'coif', traits: ['apron', 'tool'], size: 1.15 },
  { body: 0xe8d0b6, accent: 0xe8b830, hat: 'none', traits: ['pack'], size: 0.76 },
  { body: 0xcfa585, accent: 0x111014, hat: 'cap', traits: ['bandage'] },
  { body: 0xd9b89a, accent: 0x1f5a3a, hat: 'tophat', traits: ['glasses', 'pipe'] },
];

const barks: Talk[] = [
  {
    when: KING,
    lines: ['Every number wins!', 'They read my name out!', 'The drum had a false bottom!', 'Melt the chips! Ring the bell!'],
  },
  {
    when: PRINCE,
    lines: ['The Scales are empty!', 'The Prince took his gilt off!', 'No Tithe this week!', 'The vault\'s stood open!'],
  },
  {
    when: { courtReady: 'treasury' },
    lines: ['Someone\'s beaten all five of the Prince\'s.', 'They say the stranger\'s going to the Exchequer.'],
  },
  {
    lines: [
      'Drawn again.', 'Always a little short.', 'Mind your Lot.', 'The toll\'s up.', 'Heads he wins.',
      'Weigh it twice.', 'Who\'s on the Row this week?', 'The drum\'s rigged. Everybody knows.', 'Don\'t say that out loud.',
    ],
  },
];

export const TREASURY_CROWD: NonNullable<AreaDef['crowd']> = {
  count: 15,
  looks,
  paths: [
    // The main road, bridge to Exchequer and back.
    [{ x: 1980, y: 810 }, { x: 1440, y: 810 }, { x: 980, y: 810 }, { x: 600, y: 810 }, { x: 980, y: 810 }, { x: 1440, y: 810 }],
    // Round the Square of Tribute.
    [{ x: 1030, y: 720 }, { x: 1370, y: 720 }, { x: 1380, y: 950 }, { x: 1020, y: 950 }],
    // The queue for the Scales: shuffling forward, then back to the end.
    [{ x: 1660, y: 900 }, { x: 1520, y: 900 }, { x: 1400, y: 900 }, { x: 1660, y: 900 }],
    // Up and down the Clockwork road.
    [{ x: 1200, y: 140 }, { x: 1200, y: 600 }, { x: 1200, y: 1250 }, { x: 1200, y: 600 }],
    // Counting-House Row.
    [{ x: 160, y: 1262 }, { x: 600, y: 1262 }, { x: 1100, y: 1262 }, { x: 1400, y: 1262 }, { x: 600, y: 1262 }],
    // The mint yard to the road.
    [{ x: 560, y: 520 }, { x: 980, y: 520 }, { x: 1160, y: 520 }, { x: 980, y: 520 }],
    // The pool promenade.
    [{ x: 1320, y: 1182 }, { x: 1940, y: 1182 }],
    // Over the bridge and back.
    [{ x: 2260, y: 810 }, { x: 1900, y: 810 }, { x: 2260, y: 810 }],
  ],
  barks,
};
