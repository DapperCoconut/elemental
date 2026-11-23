import type { AreaDef, NpcDef, NpcLook, Talk } from '../../../../IslesTypes';

/**
 * The people of the Mind Court.
 *
 * Every wager against the House on Lotterhaven is *checked* here first: the gambler sits across a
 * green lamp from a reader, who says whether they are bluffing, and a bluffing hand is declined.
 * The readers' notes don't go to waste — they are sold at the Thought Exchange, where informers
 * buy who is planning to hide from the Draw. The Swoon Playhouse makes the busted forget how to
 * say their names; and the busted play the pieces on the Prince's living chessboard, where a
 * piece that is taken goes up the hill to the War Court. Everyone here thinks carefully before
 * they think anything at all.
 */

const PRINCE = { prince: 'gambit' } as const;
const KING = { monarch: 'lucan' } as const;

export const Q_NAME = 'mind-q-name';
export const Q_MARKET = 'mind-q-market';
export const Q_WELL = 'mind-q-well';
export const Q_READER = 'mind-q-reader';
export const Q_MATE = 'mind-q-checkmate';

export const MIND_NPCS: NpcDef[] = [
  // ── Orsola Glass — the shop ──────────────────────────────────────────
  {
    id: 'mind-orsola',
    name: 'Orsola Glass',
    title: 'The Gazing Glass',
    look: { body: 0xe4cdb6, accent: 0x5e2672, hat: 'veil', traits: ['glasses', 'scarf'], size: 1, eye: 0xc4e4ff },
    at: { x: 430, y: 1004 },
    role: { kind: 'shop', id: 'mind-shop' },
    talks: [
      {
        when: KING,
        lines: [
          'I looked into my best ball this morning and saw nothing at all. Nothing! Isn\'t it marvellous?',
          'The future\'s gone back to being a surprise. Charms are on the shelf. They still work. I checked.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The readers have closed their booths. Nobody\'s checking bets. People are bluffing in the street.',
          'I sold three balls today to people who just want to look at something pretty. Imagine.',
        ],
      },
      {
        when: { questDone: Q_NAME },
        lines: [
          'The Halloway boy said his own name in the square. Out loud. My glass rang like a bell. I swear it.',
        ],
      },
      {
        lines: [
          'Crystal, lens and charm. Every reader on the Row buys their glass from me, so I know who sees what.',
          'Every bet against the House is read here first. A bluff is declined. An honest hand loses anyway.',
          'The readers\' notes go to the Exchange and are sold. Hide from the Draw and somebody buys the hiding.',
          'Charms are behind the counter — wear three. They\'re readers\' tricks, turned round the other way.',
        ],
      },
    ],
    barks: [
      { when: PRINCE, lines: ['Pretty glass! No futures!', 'Look into it for fun, dear.'] },
      { lines: ['Crystal, lens and charm!', 'See it coming, madam?', 'Mind the claw feet.', 'Clearest glass on the Row.'] },
    ],
  },

  // ── Wren Halloway — her brother is a pawn on the board ───────────────
  {
    id: 'mind-wren',
    name: 'Wren Halloway',
    title: 'Ribbon-Seller',
    look: { body: 0xe8d0b8, accent: 0xcc2838, hat: 'bandana', traits: ['satchel'], size: 0.9 },
    at: { x: 860, y: 950 },
    talks: [
      {
        when: KING,
        lines: [
          'Toby\'s teaching the other pieces to say their names. He makes them practise. Like a school.',
          'Forty-one people in the square shouting names. You could hear it in Tosswater.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The board\'s stopped. The pieces are all just standing there talking to each other. Toby\'s laughing.',
        ],
      },
      {
        when: { questDone: Q_NAME },
        lines: [
          'He said it. "Tobias." He said it twice to be sure and then he cried and so did I.',
          'He\'s still a number to the House. But he\'s a number who knows his name. That\'s a start.',
        ],
      },
      {
        when: { quest: Q_NAME },
        lines: [
          'Talk to him — he\'s on the south edge of the board, number forty-one. He can\'t say it, but he can try.',
          'The Playhouse keeps the names, they say. On cards. Like a script. Swoon\'s people guard the props.',
        ],
      },
      {
        lines: [
          'That\'s my brother on the board. Black chip on his chain. Pawn, on the south edge. Number forty-one.',
          'He wagered against the House for our mother\'s re-draw. Lost. Busted. They took him to the Playhouse.',
          'He came out unable to say his name. His mouth goes round it. Nothing comes. Every busted\'s the same.',
        ],
      },
    ],
    barks: [
      { when: { questDone: Q_NAME }, lines: ['Tobias! His name\'s Tobias!', 'Ribbons, red for luck!'] },
      { lines: ['Ribbons, red for luck.', 'Not that luck helps.', 'Forty-one. Forty-one.'] },
    ],
  },

  // ── Forty-One — a busted pawn ────────────────────────────────────────
  {
    id: 'mind-forty-one',
    name: 'Forty-One',
    title: 'Pawn of the Plaza Board',
    look: { body: 0xd6b498, accent: 0x221d27, hat: 'none', traits: ['bandage'], size: 1.05 },
    at: { x: 1300, y: 1080 },
    talks: [
      {
        when: KING,
        lines: [
          'Tobias Halloway. Tobias Halloway. I say it every morning when I wake up, in case it\'s gone again.',
          'We broke the chips into a box. Wren\'s melting them for a bell. I asked for it to ring my name.',
        ],
      },
      {
        when: { questDone: Q_NAME },
        lines: [
          'I\'m — Tobias. Tobias. Thank you. I keep almost saying "forty-one" and then I don\'t.',
          'The other pieces keep asking me how. I tell them a stranger went and fetched it from the props.',
        ],
      },
      {
        when: { quest: Q_MATE },
        lines: [
          'You\'re going to play him? He plays the whole board in his head. Every piece is a person to us.',
          'When you take a piece, it goes up the hill. Don\'t let him make you take one. Make him lose instead.',
        ],
      },
      {
        lines: [
          'Pawn. Forty-one. I stand this square until I am moved. When I am taken I go up the hill to the War Court.',
          'My name is… it\'s… (his mouth goes round a shape. Nothing comes.) Forty-one. Sorry. Forty-one.',
        ],
      },
    ],
    barks: [
      { when: { questDone: Q_NAME }, lines: ['Tobias.', 'Tobias Halloway.'] },
      { lines: ['Forty-one.', '…', 'Pawn to the fourth rank.'] },
    ],
  },

  // ── Abel Quill — a clerk at the Thought Exchange ─────────────────────
  {
    id: 'mind-quill',
    name: 'Abel Quill',
    title: 'Price-Chalker at the Exchange',
    look: { body: 0xd8c0a4, accent: 0x2a8a50, hat: 'visor', traits: ['glasses', 'book'], size: 1 },
    at: { x: 1760, y: 1245 },
    talks: [
      {
        when: KING,
        lines: [
          'We\'re chalking the Exchange board with recipes now. Thoughts are free. Soup is a penny.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'Trading\'s suspended. I rubbed the whole board out. It took an hour. I enjoyed every minute.',
        ],
      },
      {
        when: { questDone: Q_MARKET },
        lines: [
          'The Marrows are on the night boat. Nobody bought their thought, because nobody had it to sell.',
          'I chalked their lot as WITHDRAWN. My hand shook. Best line I ever wrote.',
        ],
      },
      {
        when: { quest: Q_MARKET },
        lines: [
          'The slips are pinned on the lot-boards — round the Exchange forecourt and up the booth road.',
          'Bring them down before the bell. After the bell they\'re sold, and then it\'s Margin\'s.',
        ],
      },
      {
        lines: [
          'I chalk the prices. "A family thinking of the night boat — six crowns." "A tell, a good one — two."',
          'Every thought read at a booth comes here and is sold to whoever wants it. Mostly informers.',
          'Today\'s best lot is a household on the Row planning to hide from the Draw. My neighbours.',
        ],
      },
    ],
    barks: [
      { when: { questDone: Q_MARKET }, lines: ['WITHDRAWN!', 'Lot struck off!'] },
      { lines: ['Lot nine, a secret, two crowns!', 'Chalk dust.', 'Closing bell at dusk.'] },
    ],
  },

  // ── Hesper Marrow — an honest medium by the well ─────────────────────
  {
    id: 'mind-hesper',
    name: 'Hesper Marrow',
    title: 'The Honest Medium',
    look: { body: 0xd8c8c0, accent: 0x352668, hat: 'hood', traits: ['cane', 'rod'], size: 0.95, eye: 0xb27cff },
    at: { x: 1360, y: 1440 },
    talks: [
      {
        when: KING,
        lines: [
          'The well\'s gone quiet. All the last thoughts have been heard. Pell can rest now. So can I.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The readers are fishing the well now, for fun. They keep throwing back the trout. Soft lot.',
        ],
      },
      {
        when: { questDone: Q_WELL },
        lines: [
          'Pell\'s last thought was the drum. The false bottom. He saw it, and he swam to tell somebody.',
          'I\'ve told everybody. Let them hush me. It\'s in the town now. A town can\'t be hushed.',
        ],
      },
      {
        when: { quest: Q_WELL },
        lines: [
          'Thought trout, from the well. They rise to whatever you were about to do. Strike before you mean to.',
        ],
      },
      {
        lines: [
          'I read for the Row, but I won\'t read for the House. So I\'m poor, and I fish.',
          'This is the séance well. Whatever a drowned soul last thought sinks here and is eaten by the trout.',
          'My son Pell drowned off the breakwater. Swimming to Tosswater, at night. I never knew why.',
        ],
      },
    ],
    barks: [
      { lines: ['Bite, then. Bite.', 'Pell, love.', 'The well remembers.'] },
    ],
  },

  // ── Pim Vantage — the apprentice who won't read ──────────────────────
  {
    id: 'mind-pim',
    name: 'Pim Vantage',
    title: 'Apprentice Reader',
    look: { body: 0xe8d4bc, accent: 0x8c46a8, hat: 'cap', traits: ['book', 'scarf'], size: 0.82, eye: 0xe2ccff },
    at: { x: 420, y: 650 },
    talks: [
      {
        when: KING,
        lines: [
          'I read my mother\'s mind yesterday. She was thinking about lunch. Just lunch. I nearly cried.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'No more tests! I can read or not read as I like. I\'m going to not, mostly. For a while.',
        ],
      },
      {
        when: { questDone: Q_READER },
        lines: [
          'Ouija sent word: the board told her my test is "postponed indefinitely". The board! She hates that.',
          'I don\'t have to sit across from anyone and decide if they\'re lying. Not this week. Thank you.',
        ],
      },
      {
        when: { quest: Q_READER },
        lines: [
          'The spirit board\'s laid out on the Row, south of the parlours. Stand on it. Feel how it pulls.',
          'Then go and beat her. If Ouija can\'t keep her own board, she can\'t very well test me on it.',
        ],
      },
      {
        lines: [
          'I can read minds. I really can — I\'m good. That\'s the problem.',
          'Tonight Medium Ouija tests me at the board. If I pass, I sit a booth and decide who the House declines.',
          'If I fail, I\'m a gambler like everyone else. I\'ve read the gamblers. I know how frightened they are.',
        ],
      },
    ],
    barks: [
      { lines: ['Don\'t think so loud.', 'I\'m not listening. I\'m NOT.', 'Ouija tests me tonight.'] },
    ],
  },

  // ── Arbiter Caissa Fenwick — keeper of the board ─────────────────────
  {
    id: 'mind-caissa',
    name: 'Caissa Fenwick',
    title: 'Arbiter of the Plaza Board',
    look: { body: 0xd2bca8, accent: 0x221d27, hat: 'tophat', traits: ['glasses', 'cane'], size: 1.1, eye: 0xf0e6cc },
    at: { x: 1520, y: 628 },
    talks: [
      {
        when: KING,
        lines: [
          'I\'ve put the board back to the opening and left it empty. A board should wait for players who chose.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'He resigned. I have arbitrated thirty years and I have never once seen him resign. Well played.',
          'He asked me to put the pieces in the box. I told him the pieces are going home. He nodded.',
        ],
      },
      {
        when: { courtReady: 'mind' },
        lines: [
          'All five readers beaten. He has been watching from the ball on his roof. He will want to play you.',
        ],
      },
      {
        lines: [
          'I keep the board. I call the moves, I start the clocks, and when a piece is taken I write its number.',
          'The pieces are the busted. The Prince plays them against his readers. He has never lost a game here.',
          'He has never won one against his father, either. I keep that score too. Quietly.',
        ],
      },
    ],
    barks: [
      { when: PRINCE, lines: ['Board closed.', 'No more taking.'] },
      { lines: ['White to move.', 'Touch a piece, move a piece.', 'Clocks running.', 'Forty-one: hold.'] },
    ],
  },

  // ── Doctor Lucius Quist — a bet-checker at the booths ────────────────
  {
    id: 'mind-quist',
    name: 'Dr. Lucius Quist',
    title: 'Bet-Checker, Booth Three',
    look: { body: 0xccb49c, accent: 0x2a8a50, hat: 'visor', traits: ['pipe', 'glasses'], size: 1.15 },
    at: { x: 1580, y: 800 },
    talks: [
      {
        when: KING,
        lines: [
          'I\'m reading palms on the quay for a ha\'penny. Nobody\'s ruined by it. I find I sleep.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The booths are shut by order of nobody. I sat here all morning out of habit, reading the pigeons.',
        ],
      },
      {
        when: { questDone: Q_MARKET },
        lines: [
          'Margin was in here white as a sheet. Somebody had taken his lots off the boards. Shame. Ha.',
        ],
      },
      {
        lines: [
          'Sit down. Put your hand on the table. Think about your wager. …Bluffing. Declined. Next.',
          'That\'s the job. The House never takes a bet it might lose, so it pays us to know which those are.',
          'I write it all down, of course. The Exchange pays by the line. A man has to eat.',
        ],
      },
    ],
    barks: [
      { lines: ['Next.', 'Declined.', 'Hand flat on the baize, please.', 'You\'re thinking of the boat.'] },
    ],
  },
];

const looks: NpcLook[] = [
  { body: 0xe0c8b0, accent: 0x5e2672, hat: 'veil', traits: ['scarf'] },
  { body: 0xd4b89c, accent: 0x2a8a50, hat: 'visor', traits: ['glasses'] },
  { body: 0xc8a888, accent: 0x9e2630, hat: 'tophat', traits: ['cane'] },
  { body: 0xe8d4c0, accent: 0x8c46a8, hat: 'hood', traits: ['book'], size: 0.8 },
  { body: 0xd6b498, accent: 0x221d27, hat: 'none', traits: ['bandage'] },
  { body: 0xdcc4a8, accent: 0xd8b048, hat: 'cap', traits: ['satchel'] },
  { body: 0xc4a084, accent: 0x352668, hat: 'wizard', traits: ['beard', 'lantern'], size: 1.1 },
  { body: 0xe4ccb4, accent: 0xcc2838, hat: 'bandana', traits: ['pack'], size: 0.74 },
];

const barks: Talk[] = [
  {
    when: KING,
    lines: [
      'Think whatever you like!',
      'I bluffed my landlord. He bought it!',
      'The drum had a false bottom. I KNEW it.',
      'Nobody\'s reading anybody today.',
    ],
  },
  {
    when: PRINCE,
    lines: [
      'The Prince resigned!',
      'The booths are shut.',
      'The pieces are walking off the board.',
      'Is the Exchange still buying? No? Good.',
    ],
  },
  {
    when: { courtReady: 'mind' },
    lines: [
      'All five readers, beaten.',
      'The stranger\'s going to play the Prince.',
    ],
  },
  {
    lines: [
      'Don\'t think about the boat.',
      'Keep your face still.',
      'He read me. Declined.',
      'Mind the pieces.',
      'Draw\'s on Thursday.',
      'Hand flat on the baize.',
      'I\'m not thinking anything.',
      'Thoughts for sale. Not mine.',
    ],
  },
];

export const MIND_CROWD: NonNullable<AreaDef['crowd']> = {
  count: 14,
  looks,
  paths: [
    // The Tosswater road to the board and back.
    [{ x: 120, y: 800 }, { x: 900, y: 800 }, { x: 900, y: 800 }, { x: 120, y: 800 }],
    // Round the plaza apron.
    [{ x: 960, y: 560 }, { x: 1440, y: 560 }, { x: 1440, y: 1080 }, { x: 960, y: 1080 }],
    // Up the north road and back.
    [{ x: 1200, y: 520 }, { x: 1200, y: 140 }, { x: 1200, y: 520 }],
    // The booth road to the east and back.
    [{ x: 1500, y: 800 }, { x: 2250, y: 800 }, { x: 1500, y: 800 }],
    // Along Séance Lane.
    [{ x: 260, y: 1325 }, { x: 1200, y: 1325 }, { x: 2140, y: 1325 }, { x: 1200, y: 1325 }],
    // To the Playhouse and back.
    [{ x: 560, y: 790 }, { x: 560, y: 480 }, { x: 560, y: 790 }],
  ],
  barks,
};
