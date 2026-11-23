import type { AreaDef, NpcDef, NpcLook, Talk } from '../../../../IslesTypes';

/**
 * The people of the Card Court.
 *
 * The Card Court is the first court up the Red-and-Black from Tosswater, so its people do the
 * explaining: what a **Lot** is (the brass token every child is given at birth, worn on a chain
 * at the throat), what **the Draw** is (each week every Lot goes in the great drum and numbers are
 * called — conscription, the Wager-Tithe, a pawned memory, hours paid into the clocks), what a
 * **re-draw** costs (a wager at the House, against the House, which nobody has ever been seen to
 * win), and what **busted** means (a snapped Lot, a black chip on the chain, a numbered croupier
 * who may not speak their own name). Everyone here plays; everyone knows the deck is the House's.
 * They talk about luck the way other towns talk about weather.
 */

const PRINCE = { prince: 'ante' } as const;
const KING = { monarch: 'lucan' } as const;

export const Q_MARKED = 'card-q-marked-deck';
export const Q_NAME = 'card-q-no-name';
export const Q_READING = 'card-q-reading';
export const Q_REDRAW = 'card-q-redraw';
export const Q_LAST = 'card-q-last-hand';

export const CARD_NPCS: NpcDef[] = [
  // ── Corvina Sleeve — the charm shop ──────────────────────────────────
  {
    id: 'card-corvina',
    name: 'Corvina Sleeve',
    title: 'Sleeve & Deck',
    look: { body: 0xe0c0a4, accent: 0x1f9a58, hat: 'visor', traits: ['glasses', 'satchel'], size: 1, eye: 0x6fe0a0 },
    at: { x: 1000, y: 1252 },
    role: { kind: 'shop', id: 'card-shop' },
    talks: [
      {
        when: KING,
        lines: [
          'I sold an honest deck today. Plain backs, no nicks, no marks. The man cried. He\'d never held one.',
          'Charms are where they always were. The decks are new. I printed them with Ninian, by hand.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The Dealing Hall\'s doors are open and the Prince is playing patience on the step. Alone. Losing.',
          'He says it\'s the first game he\'s ever lost. He sounds pleased about it. Charms are on the felt.',
        ],
      },
      {
        when: { questDone: Q_MARKED },
        lines: [
          'A nick at the top-left of the lattice, every fourth diamond. Twenty years I\'ve sold those decks.',
          'I never looked. You don\'t look, here. Ninian looked. Look at what I sell you, friend. Always look.',
        ],
      },
      {
        lines: [
          'Sleeve and Deck. Charms on the felt, decks under glass. Every deck in this court is the House\'s print.',
          'You\'ll have seen the brass at everyone\'s throat. That\'s a Lot. You get it the day you\'re born.',
          'Each week they all go in the drum at the Draw Halls. If yours is called, you owe. Simple as that.',
          'Charms you can wear three at a time. They\'re gamblers\' things, but they\'ll fight for you.',
        ],
      },
    ],
    barks: [
      { when: PRINCE, lines: ['Honest decks! Printed this week!', 'Plain backs, friend. Plain backs.'] },
      {
        lines: [
          'Charms on the felt!', 'A lucky die, sir? Ivory, true-weighted.', 'Mind your sleeves in here.',
          'Every deck the House\'s print.',
        ],
      },
    ],
  },

  // ── Biscotta Fairweather — The Fortune Cookie (bakery) ───────────────
  {
    id: 'card-biscotta',
    name: 'Biscotta Fairweather',
    title: 'The Fortune Cookie',
    look: { body: 0xecc8a0, accent: 0xc9202f, hat: 'chef', traits: ['apron', 'scarf'], size: 1.15, eye: 0x6a3a14 },
    at: { x: 1492, y: 1474 },
    role: { kind: 'bakery', id: 'card-cookie' },
    talks: [
      {
        when: KING,
        lines: [
          'I\'m writing new fortunes. The old slips said LUCK FAVOURS THE HOUSE. The new ones say YOUR NAME.',
          'Just your name. People open them in the square and read them out loud. Bring fish, I\'ll bake.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The Prince came in this morning and bought one cookie and broke it at the counter and READ it.',
          'He\'s never read one. He said it said "you will lose, and live". I didn\'t write that one. Odd.',
        ],
      },
      {
        when: { questDone: Q_LAST },
        lines: [
          'You took him the cookie. Sixteen years in his pocket, and he opened it. Thank you for that.',
          'Pull up a stool. Bring me a fish and some flour and I\'ll fry you something lucky.',
        ],
      },
      {
        lines: [
          'The Fortune Cookie! Fried, baked, folded. Every cookie with a slip inside, every slip a fortune.',
          'Bring me what you catch — the baize pond, the harbour, anything with fins — and the flour, and coin.',
          'And I\'ll make you something you\'ll be glad you ate before a fight. The slips are free.',
          'They all say LUCK FAVOURS THE HOUSE. I\'m required to. The House prints the slips too.',
        ],
      },
    ],
    barks: [
      { when: PRINCE, lines: ['New slips! Honest fortunes!', 'Cookies, hot! Fortunes, true!'] },
      { lines: ['Fortune cookies, hot!', 'Bring me fish, I\'ll bring you luck.', 'Every slip a fortune!', 'Mind, the oil spits.'] },
    ],
  },

  // ── Ninian Pastel — the card-printer (The Marked Deck) ───────────────
  {
    id: 'card-ninian',
    name: 'Ninian Pastel',
    title: 'Card-Printer',
    look: { body: 0xd8b896, accent: 0x26242c, hat: 'cap', traits: ['apron', 'glasses', 'tool'], size: 0.95, eye: 0x1a1a22 },
    at: { x: 980, y: 786 },
    talks: [
      {
        when: KING,
        lines: [
          'I print plain decks now. Plain backs, true corners. Corvina sells them faster than I can dry them.',
          'Every deck in Lotterhaven was marked. Every one. My press made the marks. My press makes them no more.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'They\'ve stopped ordering from the House\'s plates. The Dealing Hall\'s using my plain ones. My plain ones!',
        ],
      },
      {
        when: { questDone: Q_MARKED },
        lines: [
          'The Marshal came for the cards and went away without them. They\'re in my apron. Proof. Real proof.',
          'Nobody can say it\'s luck now. A nick in every fourth diamond. Anyone can see it, once they\'re shown.',
        ],
      },
      {
        when: { quest: Q_MARKED },
        lines: [
          'One from each table on the Rail, by the mill. Look for the nick in the lattice, top left.',
          'Then take them to Corvina. She sells the House\'s decks. If she sees it too, it\'s not just me.',
        ],
      },
      {
        lines: [
          'I print the court\'s cards. Faces, backs, the lot. From the House\'s plates, under the House\'s seal.',
          'There\'s a fault in the back plate. A nick in the lattice. Every fourth diamond. Every deck.',
          'A fault you\'d only see if you knew to look. A fault you\'d read from across a table, if you knew.',
        ],
      },
    ],
    barks: [
      { when: { questDone: Q_MARKED }, lines: ['Every fourth diamond!', 'Plain backs from now on.'] },
      { lines: ['Ink, press, peel.', 'Every fourth diamond…', 'Nobody looks. Why does nobody look?', 'Sheets drying, mind the line.'] },
    ],
  },

  // ── Forty-One — a busted croupier (No Name Spoken) ───────────────────
  {
    id: 'card-forty-one',
    name: 'Forty-One',
    title: 'Busted, Serving the House',
    look: { body: 0xc8b49c, accent: 0x121216, hat: 'visor', traits: ['scarf'], size: 1.05, eye: 0x9a9aa0 },
    at: { x: 1420, y: 480 },
    talks: [
      {
        when: KING,
        lines: [
          'Aubrey Kettle. Aubrey Kettle. I say it to everyone I meet. They say theirs back. It\'s like a song.',
          'They melted the black chips into a bell. I rang it. I didn\'t ask the House. I just rang it.',
        ],
      },
      {
        when: { questDone: Q_NAME },
        lines: [
          'Aubrey. Kettle. It was on the back all along, under the snap, where my mother scratched it.',
          'Nobody\'s said it to me in eleven years. You said it. Say it again, would you? Just the once.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The Prince let the busted off shift tonight. We stood about on the step. None of us knew what to do.',
        ],
      },
      {
        when: { quest: Q_NAME },
        lines: [
          'One half went in the Hall\'s sweepings, by the step. The other they flung in the gutter on Deuce Row.',
          'Bertil the weight-maker has a glass for reading stamps. If there\'s anything on it, he\'ll find it.',
        ],
      },
      {
        lines: [
          'Forty-One, at your service. That\'s my number. The busted serve by number. We don\'t say the other thing.',
          'I wagered for a re-draw. My sister was called for the War Court. I lost. Everyone loses. So.',
          'They snapped my Lot, there on the step, and hung a black chip on my chain instead. The halves went —',
          'Somewhere. I shouldn\'t be talking to you. A croupier only says the numbers.',
        ],
      },
    ],
    barks: [
      { when: { questDone: Q_NAME }, lines: ['Aubrey Kettle!', 'That\'s me. That\'s my name.'] },
      { lines: ['Place your stakes.', 'Forty-One, serving.', 'The House thanks you.', 'Numbers only, numbers only.'] },
    ],
  },

  // ── Madame Querida — fortune-teller (A Reading in Scales) ────────────
  {
    id: 'card-querida',
    name: 'Madame Querida',
    title: 'Fortunes Told, Honestly',
    look: { body: 0xd8a888, accent: 0x5c3a8e, hat: 'veil', traits: ['scarf', 'glasses'], size: 1, eye: 0xc8b0ff },
    at: { x: 1930, y: 1532 },
    talks: [
      {
        when: KING,
        lines: [
          'I read for a girl today and the cards said nothing at all. Not Tower, not Star. Blank.',
          'I\'ve never been so glad. A blank future, child. Nobody\'s dealt it. Go and write in it.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The Seer\'s tent is dark. The court reads its own fortunes now. Mostly badly. All honestly.',
        ],
      },
      {
        when: { questDone: Q_READING },
        lines: [
          'My Major Arcana, home in its silk. The Tower has a crease where she bent it. I\'ll keep the crease.',
          'Sit, any time. No charge to you. I\'ll tell you true, even when it\'s dull.',
        ],
      },
      {
        when: { quest: Q_READING },
        lines: [
          'Two spade soles, from the baize pond. Their backs are printed like card backs. I read the scales.',
        ],
      },
      {
        lines: [
          'Fortunes, honestly told. Which is to say badly paid. The Seer reads for the House now, at the tents.',
          'She took my deck. Said an unlicensed Tower frightens the drawn. It does. That\'s what it\'s for.',
          'I have read people\'s whole lives in those cards. I can\'t read without something. Can you fish?',
        ],
      },
    ],
    barks: [
      { lines: ['Your palm, dear?', 'I see… a long walk uphill.', 'Honest fortunes, poorly paid.', 'The Star is shy this week.'] },
    ],
  },

  // ── Dorrit Ashby — a mother buying a re-draw (A Re-Draw) ─────────────
  {
    id: 'card-dorrit',
    name: 'Dorrit Ashby',
    title: 'Mother of a Drawn Son',
    look: { body: 0xe4c6aa, accent: 0x7c1019, hat: 'hood', traits: ['satchel', 'scarf'], size: 0.95, eye: 0x4a2a1a },
    at: { x: 330, y: 790 },
    talks: [
      {
        when: KING,
        lines: [
          'Hal came home from the War Court with his Lot still on. He\'s asleep in his own bed. That\'s all.',
          'That\'s all I wanted. That\'s everything I wanted.',
        ],
      },
      {
        when: { questDone: Q_REDRAW },
        lines: [
          'The re-draw was dealt from an honest deck. Spindle swapped it in. Hal\'s number didn\'t come up.',
          'He doesn\'t go north. He doesn\'t GO. I can\'t — sit with me a minute. Just a minute.',
        ],
      },
      {
        when: { quest: Q_REDRAW },
        lines: [
          'Spindle Harrow keeps the mill running. If anyone knows how the House\'s decks are shuffled, it\'s him.',
        ],
      },
      {
        lines: [
          'My Hal\'s number was called. Seventeen-forty-two. Conscripted. He reports to the War Court in a week.',
          'I\'ve bought a re-draw at the Dealing Hall. Everything we own. I wager, the deck is dealt, I win or —',
          'Nobody wins. I know. But the decks come out of that mill. Somebody must know how they\'re shuffled.',
        ],
      },
    ],
    barks: [
      { when: { questDone: Q_REDRAW }, lines: ['He\'s home. He\'s HOME.'] },
      { lines: ['Seventeen-forty-two.', 'Everything we own, on one hand.', 'Somebody must know.'] },
    ],
  },

  // ── Spindle Harrow — the mill mechanic ───────────────────────────────
  {
    id: 'card-spindle',
    name: 'Spindle Harrow',
    title: 'Millwright of the Shuffle',
    look: { body: 0xc8a888, accent: 0x5e2a1a, hat: 'cap', traits: ['tool', 'beard', 'apron'], size: 1.2, eye: 0xd8a636 },
    at: { x: 320, y: 650 },
    talks: [
      {
        when: KING,
        lines: [
          'I\'ve taken the cams out of the drums. It shuffles like a mill should now. Badly, and fair.',
          'And the treadwheel stands still. The walkers went home. I\'m told one of them has a name now.',
        ],
      },
      {
        when: PRINCE,
        lines: ['The Hall\'s stopped sending the special orders. The red-banded crates sit empty. I\'ve no complaints.'],
      },
      {
        when: { questDone: Q_REDRAW },
        lines: ['The Mill-Master\'s off the floor and the drums run honest. For a while, anyway. Mind how you go.'],
      },
      {
        lines: [
          'Spindle Harrow. I keep the drums turning. Forty years. Every deck in the court comes through her.',
          'She\'s a good mill. Riffle, riffle, bridge. Fair as rain. Mostly.',
          'Busted walk the wheel. Don\'t look at them, they\'d rather you didn\'t. They\'re not allowed to look back.',
        ],
      },
    ],
    barks: [
      { lines: ['Riffle, riffle, bridge.', 'Grease on the left drum!', 'Keep walking, lads. Sorry. Keep walking.', 'Fair as rain. Mostly.'] },
    ],
  },

  // ── Nan Clubb — Prince Ante's old nurse (The Last Hand) ──────────────
  {
    id: 'card-nan-clubb',
    name: 'Nan Clubb',
    title: 'Nurse to the Prince',
    look: { body: 0xe8d0b8, accent: 0x1b1b24, hat: 'hood', traits: ['cane', 'glasses', 'scarf'], size: 0.9, eye: 0x6a5a4a },
    at: { x: 2150, y: 580 },
    talks: [
      {
        when: KING,
        lines: [
          'My boy\'s learning to lose at cards. He loses to me every evening. He laughs. He never used to laugh.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'He lost. My Ante lost. And he came out on the step after, and he asked for me. Not the King. Me.',
          'I\'ve sat with him all evening. We played snap. He\'s terrible at it. He\'s never had to try.',
        ],
      },
      {
        when: { courtReady: 'card' },
        lines: [
          'You\'ve beaten every one of his. He\'s at the big table, waiting. He thinks he\'ll win. He always wins.',
        ],
      },
      {
        lines: [
          'I nursed the Prince from the day the King dealt him. That\'s how he says it. "Dealt." Like a card.',
          'The King has six lucky children. Ante was the first. He was given the Card Court at nine.',
          'He has never lost a hand in his life. Imagine that. Imagine never knowing whether you were any good.',
        ],
      },
    ],
    barks: [
      { lines: ['Mind the step, dear.', 'He was such a quiet boy.', 'Never lost a hand. Never.', 'Ante, Ante.'] },
    ],
  },

  // ── Bertil Weight — the paperweight-maker ────────────────────────────
  {
    id: 'card-bertil',
    name: 'Bertil Weight',
    title: 'Paperweights & Ballast',
    look: { body: 0xd0b090, accent: 0xb8903e, hat: 'tophat', traits: ['glasses', 'tool', 'beard'], size: 1.1, eye: 0x9ad8d0 },
    at: { x: 820, y: 1300 },
    wander: 30,
    talks: [
      {
        when: KING,
        lines: [
          'I made a paperweight for the bell they cast from the black chips. Nothing to hold down. I made it anyway.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'Wind\'s gone quiet. Funny. They say the House\'s wind blows the houses of the luckless down first.',
        ],
      },
      {
        when: { questDone: Q_NAME },
        lines: [
          'Scratched under the snap, in a mother\'s hand. Aubrey Kettle. I\'ve had my glass on a thousand Lots.',
          'I never thought to look at the backs. Who scratches on the back? Mothers, it turns out.',
        ],
      },
      {
        lines: [
          'Bertil Weight. Paperweights and ballast. Every house on Deuce Row wears one of mine on its roof.',
          'Card-houses stand fine, if they\'re weighted. The wind takes the ones that aren\'t. Always has.',
          'When a family\'s busted, the House sends a man for the weight. Then it\'s just a matter of the wind.',
        ],
      },
    ],
    barks: [
      { lines: ['Weights for the wind!', 'Dome, bar or die?', 'Good brass, true heavy.', 'Hold it down, hold it down.'] },
    ],
  },
];

// ── The crowd ────────────────────────────────────────────────────────

const looks: NpcLook[] = [
  { body: 0xe0c0a4, accent: 0x1f9a58, hat: 'visor', traits: ['satchel'] },
  { body: 0xd8b896, accent: 0xc9202f, hat: 'tophat', traits: ['cane'] },
  { body: 0xc8a284, accent: 0x26242c, hat: 'cap', traits: ['pipe'] },
  { body: 0xe8cdb2, accent: 0x5c3a8e, hat: 'veil', traits: ['scarf'] },
  { body: 0xdcbca0, accent: 0xd8a636, hat: 'none', traits: ['pack'], size: 0.74 },
  { body: 0xc0a080, accent: 0x121216, hat: 'visor', traits: ['scarf'], size: 1.05 },
  { body: 0xe4c6aa, accent: 0x7a3aa8, hat: 'jester', traits: [], size: 0.8 },
  { body: 0xd2ae8e, accent: 0x7c1019, hat: 'hood', traits: ['book'] },
];

const barks: Talk[] = [
  {
    when: KING,
    lines: [
      'The drum had a false bottom!',
      'Every number wins, this Draw.',
      'I heard my own name read out.',
      'No Lot on my baby. Not ever.',
    ],
  },
  {
    when: PRINCE,
    lines: [
      'The Prince LOST!',
      'The Hall\'s doors are open.',
      'Is the Draw still on? Who\'s calling it?',
      'Somebody won a hand off the House!',
    ],
  },
  {
    when: { courtReady: 'card' },
    lines: [
      'All five of the Prince\'s, beaten.',
      'The stranger\'s going to the Dealing Hall.',
    ],
  },
  {
    lines: [
      'Draw\'s on Friday.',
      'Cut you for it.',
      'Mind your Lot, love.',
      'They called the Weavers\' boy.',
      'Never been seen to win. Never.',
      'Deal me out.',
      'Hold your weight down!',
      'Number twelve-oh-nine, that\'s us.',
    ],
  },
];

export const CARD_CROWD: NonNullable<AreaDef['crowd']> = {
  count: 14,
  looks,
  paths: [
    // Up and down the Red-and-Black, round the plaza.
    [{ x: 1200, y: 1600 }, { x: 1200, y: 1060 }, { x: 1020, y: 850 }, { x: 1200, y: 650 }, { x: 1200, y: 140 }],
    [{ x: 1200, y: 140 }, { x: 1200, y: 650 }, { x: 1380, y: 850 }, { x: 1200, y: 1060 }, { x: 1200, y: 1600 }],
    // The Cross Street, both ways.
    [{ x: 80, y: 850 }, { x: 990, y: 850 }, { x: 1200, y: 1060 }, { x: 1410, y: 850 }, { x: 2320, y: 850 }],
    [{ x: 2320, y: 850 }, { x: 1410, y: 850 }, { x: 1200, y: 640 }, { x: 990, y: 850 }, { x: 80, y: 850 }],
    // Along Deuce Row.
    [{ x: 140, y: 1300 }, { x: 1120, y: 1300 }, { x: 630, y: 1300 }, { x: 630, y: 900 }, { x: 630, y: 1300 }],
    // Round the pond and down to the tents.
    [{ x: 1330, y: 1318 }, { x: 2280, y: 1318 }, { x: 2280, y: 960 }, { x: 1728, y: 930 }, { x: 1330, y: 930 }],
    // From the road to the Dealing Hall forecourt.
    [{ x: 1260, y: 550 }, { x: 1760, y: 540 }, { x: 2060, y: 520 }, { x: 1760, y: 540 }],
  ],
  barks,
};
