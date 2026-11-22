import type { AreaDef, NpcDef, NpcLook, Talk } from '../../../../IslesTypes';

/**
 * The people of the Circuit Court.
 *
 * Circuit is where the Draw is *reckoned*. Every house cranks its quota by hand and every night
 * at the Brownout Bell the Grid draws it off; here the Tabulator — a valve computer the size of a
 * chapel — reads every household's card and says who fell short. Short is *switched off*: lights,
 * heat and the electric lock on your own door cut. Switched off three times is *earthed*: taken up
 * the Crown Coil to crank in the Treadmill Galleries. Nobody in the court has a name on paper,
 * only a number printed on the board by their door, and people here talk in ratings and bands and
 * numbers the way other towns talk about the weather. Flame is contraband — a candle is theft.
 */

const PRINCE = { prince: 'byte' } as const;
const EMPRESS = { monarch: 'ohmrine' } as const;

export const Q_OFF = 'circuit-q-off-by-one';
export const Q_SPARK = 'circuit-q-unmetered';
export const Q_SEVEN = 'circuit-q-unit-seven';
export const Q_RADIO = 'circuit-q-radio-candle';
export const Q_RECKON = 'circuit-q-reckoning';

export const CIRCUIT_NPCS: NpcDef[] = [
  // ── Ferrule Pennywhistle — the shop ──────────────────────────────────
  {
    id: 'circuit-ferrule',
    name: 'Ferrule Pennywhistle',
    title: 'Components & Sundry',
    look: { body: 0xd8b494, accent: 0xc8763a, hat: 'goggles', traits: ['apron', 'glasses', 'satchel'], size: 1.05 },
    at: { x: 1560, y: 726 },
    role: { kind: 'shop', id: 'circuit-shop' },
    talks: [
      {
        when: EMPRESS,
        lines: [
          'I sold a box of candles this morning. CANDLES. Out of my own back room, where they\'ve been for nine years.',
          'Charms on the shelf, same as ever. Everything else I own is suddenly legal. I don\'t know how to price it.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The Tabulator\'s stopped reckoning. Just stopped. Its lights are on and it\'s reading nobody.',
          'I had a fellow in asking for a fuse that would blow ON purpose. I said I\'d see what I had.',
        ],
      },
      {
        when: { questDone: Q_RADIO },
        lines: [
          'Was that you? The aerial on the can tower? I heard Radio Candle last night through my own shop wall.',
          'A woman reading out names. Just names. Of the earthed. I sat on the floor and listened to all of them.',
        ],
      },
      {
        lines: [
          'Pennywhistle\'s Components. Resistors, valves, fuses, wire by the yard — all metered, all stamped.',
          'You\'re not from the Grid, are you. No number on you. Lucky. Everyone in here has a number by the door.',
          'Mine\'s 4-7-2, brown-violet-red. That\'s how much I\'m allowed to draw. That\'s all a rating is.',
          'Charms are on the top shelf — you can wear three. Components, but they\'ll fight for you.',
        ],
      },
    ],
    barks: [
      { when: PRINCE, lines: ['Fuses! Blow your own!', 'Candles, in the back. Shh. No — no shh. Candles!'] },
      {
        lines: [
          'Stamped and metered!', 'Valves, warm or cold!', 'Wire by the yard, to the rating.',
          'Mind the charms, they\'re live.',
        ],
      },
    ],
  },

  // ── Nell Lacework — the card-punch girl ──────────────────────────────
  {
    id: 'circuit-nell',
    name: 'Nell Lacework',
    title: 'Card-Puncher, Mill Two',
    look: { body: 0xe4c8ac, accent: 0xe8d8b0, hat: 'cap', traits: ['apron', 'satchel'], size: 0.85 },
    at: { x: 520, y: 1352 },
    talks: [
      {
        when: EMPRESS,
        lines: [
          'The mills are making paper now. Just paper. Sheets of it with no holes in. People are writing on it.',
          'I wrote my whole name on one. Nell Lacework. Not 3-1-1. I pinned it on our door over the number.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'Nobody\'s feeding cards tonight. The mill floor\'s quiet. I keep listening for the reader. It\'s not there.',
          'I punched a card for fun. All holes. It doesn\'t mean anything. It\'s the best thing I ever made.',
        ],
      },
      {
        when: { questDone: Q_OFF },
        lines: [
          'Mother\'s lock is green. GREEN. She opened the door with her own hand and cried on the step.',
          'One column. One hole in the wrong place. And you found it. I\'m going to be a better puncher. I swear.',
        ],
      },
      {
        when: { quest: Q_OFF },
        lines: [
          'The misfed cards blow about the mill floor before the sweepers get them. Ours is one of them.',
          'Bring them all to Operator Dekker at the Tabulator. She\'s the only one who\'ll actually read them.',
        ],
      },
      {
        lines: [
          'I punch the cards. Ten a minute. Each one a household — the holes say how much they cranked.',
          'Last night I punched OUR card. My mother\'s. And I put a hole in the wrong column. I know I did.',
          'The Tabulator read her short. Her lock went red. She\'s been switched off twice this year already.',
        ],
      },
    ],
    barks: [
      { when: { questDone: Q_OFF }, lines: ['Green! It\'s green!', 'One column. Just one.'] },
      { lines: ['Clack, clack, clack.', 'Column nine, row four…', 'Wrong column. Wrong column.'] },
    ],
  },

  // ── Operator Quill Dekker — at the Tabulator ─────────────────────────
  {
    id: 'circuit-dekker',
    name: 'Quill Dekker',
    title: 'Night Operator, the Tabulator',
    look: { body: 0xc8a888, accent: 0x3ae08a, hat: 'antenna', traits: ['glasses', 'book'], size: 1 },
    at: { x: 1110, y: 524 },
    talks: [
      {
        when: EMPRESS,
        lines: [
          'I switched the Tabulator off. Valve by valve. Eleven hundred of them. It took all night.',
          'The last one went dark at dawn and I sat on the steps in the quiet. The Prince sat beside me.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The Prince came out and sat on the steps with me. He asked me what my name was. My NAME.',
          'Nine years I\'ve run his machine. He knew my rating, my band, my tolerance. Not my name.',
        ],
      },
      {
        when: { questDone: Q_RECKON },
        lines: [
          'He used to sit in the tape bay when he was small and read the reckoning off the tape, out loud.',
          'Numbers. Just numbers, all night. I used to think he was singing.',
        ],
      },
      {
        lines: [
          'Night operator. I feed the Tabulator, I change its valves when they blow, I read the tape when it\'s done.',
          'It reckons every household on the isle\'s Circuit side. Eleven hundred valves. It is never wrong.',
          'That\'s what it says on the brass. NEVER WRONG. Somebody polishes it every morning. It\'s me.',
        ],
      },
    ],
    barks: [
      { when: PRINCE, lines: ['Eleven hundred valves and not one thing to reckon.', 'He asked my name.'] },
      { lines: ['Valve forty-one\'s gassy again.', 'Feed rate nominal.', 'Never wrong. Never wrong.'] },
    ],
  },

  // ── Abacus Tull — the Chief Operator ─────────────────────────────────
  {
    id: 'circuit-tull',
    name: 'Abacus Tull',
    title: 'Chief Operator to the Prince',
    look: { body: 0xb89a80, accent: 0x0e3a24, hat: 'tophat', traits: ['glasses', 'cane', 'book'], size: 1.15 },
    at: { x: 1300, y: 524 },
    talks: [
      {
        when: EMPRESS,
        lines: [
          'The Grid is cut. I have sat in the Prince\'s office and drafted a new law. It has one line.',
          '"Every household shall be known by its name." He signed it. Then he asked me to teach him the names.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'He came out of the Die without his crown. He asked me to switch every red lock in the court to green.',
          'I said that was not in the table. He said, "Then the table is wrong." I have never heard him say it.',
        ],
      },
      {
        when: { courtReady: 'circuit' },
        lines: [
          'All five of the court\'s best, beaten by somebody with no number. The Prince is recompiling.',
          'He will see you. He has already reckoned that he will win. He is usually right. Usually.',
        ],
      },
      {
        lines: [
          'Chief Operator. I keep the Prince\'s tables — every rating, every band, every household\'s Draw.',
          'The Prince does not hear disputes. A dispute is an error, and errors are corrected, not heard.',
          'If you have business with him, beat his five. He respects only results. He is his mother\'s son.',
        ],
      },
    ],
    barks: [
      { when: PRINCE, lines: ['Then the table is wrong.', 'Green. All of them green.'] },
      { lines: ['Errors are corrected, not heard.', 'Within tolerance.', 'File it with the tape.'] },
    ],
  },

  // ── Wick Mainspring — the boy at the crank ───────────────────────────
  {
    id: 'circuit-wick',
    name: 'Wick Mainspring',
    title: 'House 1-0-8, Cranking',
    look: { body: 0xdcbca0, accent: 0x5a86d8, hat: 'beanie', traits: ['scarf'], size: 0.72 },
    at: { x: 1500, y: 1500 },
    wander: 20,
    talks: [
      {
        when: EMPRESS,
        lines: [
          'I took the handle off our crank. Look! I\'m using it as a sword. Gran says I\'m terrible at sword.',
          'We had diode darts for supper and nobody said "theft" once. Gran had THREE.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'Gran says I don\'t have to crank tonight. Nobody\'s reading the meter. I cranked a little anyway. Habit.',
        ],
      },
      {
        when: { questDone: Q_SPARK },
        lines: [
          'Gran ate two darts and she was up out of the chair. She cranked a whole hour. A WHOLE HOUR.',
          'We made the Draw. First time this season. The meter-reader went past and didn\'t even stop.',
        ],
      },
      {
        when: { quest: Q_SPARK },
        lines: [
          'The darts are in the sump. The black pool past the Rail. They glow green when they swim.',
          'Bring them to Gran. She\'s in the dark house by the mill. Number 1-0-7, with the red lock.',
        ],
      },
      {
        lines: [
          'I crank for us and for Gran down by the mill. Two quotas. My arms are ever so long now. Look.',
          'Gran used to be a lamplighter. Before. She doesn\'t talk about it. She sits in the dark a lot.',
          'They say a diode dart puts the spark back in you. Gran\'s spark\'s gone out, I think.',
        ],
      },
    ],
    barks: [
      { when: { questDone: Q_SPARK }, lines: ['A whole hour!', 'We made the Draw!'] },
      { lines: ['Round and round and round.', 'Forty more turns.', 'My arms…'] },
    ],
  },

  // ── Dorrit Spindle — the lamplighter's widow ─────────────────────────
  {
    id: 'circuit-dorrit',
    name: 'Dorrit Spindle',
    title: 'House 1-0-7, Switched Off',
    look: { body: 0xd8c8b8, accent: 0x3a3a42, hat: 'hood', traits: ['cane', 'scarf'], size: 0.9 },
    at: { x: 690, y: 1530 },
    talks: [
      {
        when: EMPRESS,
        lines: [
          'Wren came by. Wren Filament, with her pole and her lantern, bold as you like. She lit my step lamp.',
          'An oil lamp. A real flame. I haven\'t seen my own front step by flame in fifteen years. Sit with me.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'My lock went green on its own this afternoon. I didn\'t open the door. I just looked at it.',
          'Fifteen years. I don\'t remember what I keep in the front room.',
        ],
      },
      {
        when: { questDone: Q_SPARK },
        lines: [
          'Wick\'s darts. I\'d forgotten what it feels like, the spark. Like lighting the first lamp of the night.',
          'My Ambrose lit the lamps on this street. They earthed him the first year. Lamplighters went first.',
        ],
      },
      {
        lines: [
          '(through the door) Who\'s that? No number on your step. I can hear it in your boots.',
          'I\'m switched off, dear. Twice. Once more and they earth me. Wick cranks for me but he\'s only small.',
          'Don\'t knock. The lock\'s dead. I couldn\'t open it if I wanted to.',
        ],
      },
    ],
    barks: [
      { when: PRINCE, lines: ['Green. Fancy that.'] },
      { lines: ['(from inside, in the dark) Is that Wick?', '(humming an old lamplighter\'s tune)'] },
    ],
  },

  // ── Unit Seven — the automaton that stopped ──────────────────────────
  {
    id: 'circuit-seven',
    name: 'Unit Seven',
    title: 'Automaton, Wound and Unwilling',
    look: { body: 0xc89a40, accent: 0x6a4e1a, hat: 'helmet', traits: ['tool'], size: 1.05, eye: 0x9af6ff },
    at: { x: 2090, y: 672 },
    talks: [
      {
        when: EMPRESS,
        lines: [
          'NO DRAW. NO QUOTA. NO FEE. I HAVE ASKED THE OTHERS WHAT THEY WOULD LIKE TO DO.',
          'UNIT TWELVE WOULD LIKE TO WALK TO THE SEA. I HAVE AGREED TO GO WITH IT. WE WILL WALK SLOWLY.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'THE STANDS HAVE STOPPED WINDING. THE PRINCE HAS SAID THE WOUND MAY CHOOSE. CHOOSING IS DIFFICULT.',
        ],
      },
      {
        when: { questDone: Q_SEVEN },
        lines: [
          'THE NEW HEART IS WARM. I CRANK FOR HOUSE 2-1-1 STILL. BUT I ASK THEM NO FEE NOW.',
          'GEARLOCK SAYS THIS IS NOT HOW KEYS WORK. I HAVE INFORMED HER THAT IT IS NOW.',
        ],
      },
      {
        when: { quest: Q_SEVEN },
        lines: [
          'THE SPARES ARE IN THE SCRAP ABOUT THE WINDERY. THEN THE VALVE-MENDER. THEN — GEARLOCK.',
        ],
      },
      {
        lines: [
          'I AM UNIT SEVEN. I CRANK THE DRAW FOR HOUSE 2-1-1, WHICH HAS NO ONE LEFT WHO CAN.',
          'THEY PAY GEARLOCK A FEE FOR ME. THE FEE IS LARGER THAN THE QUOTA. I HAVE CALCULATED THIS. IT IS WRONG.',
          'I HAVE STOPPED. GEARLOCK WILL REWIND ME TONIGHT. I WOULD PREFER NOT TO BE REWOUND.',
        ],
      },
    ],
    barks: [
      { when: { questDone: Q_SEVEN }, lines: ['NO FEE.', 'WARM.'] },
      { lines: ['I HAVE STOPPED.', 'TICK. TICK. NO.', 'CALCULATING.'] },
    ],
  },

  // ── Hesper Thermion — the valve-mender ───────────────────────────────
  {
    id: 'circuit-hesper',
    name: 'Hesper Thermion',
    title: 'Valve-Mender',
    look: { body: 0xd4bca4, accent: 0xffa63a, hat: 'beanie', traits: ['glasses', 'tool', 'pack'], size: 0.95, eye: 0xffa63a },
    at: { x: 720, y: 772 },
    talks: [
      {
        when: EMPRESS,
        lines: [
          'Radio Candle\'s on the air at noon. NOON. In daylight, from my own front window, with the sash up.',
          'I read out the names of everyone who came back down the Coil. It took three hours. Best three hours.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The Prince sent for a valve-mender. Me. He wanted a radio. He wanted to hear the broadcast himself.',
          'I fitted it. He listened to the names for an hour without moving. Then he asked how to spell them.',
        ],
      },
      {
        when: { questDone: Q_RADIO },
        lines: [
          'Radio Candle reaches the whole Circuit side now. The whole side! Off a can-tower and your nerve.',
          'Wren Filament reads the names. The earthed, every one. So nobody up the Coil is only a number.',
        ],
      },
      {
        when: { quest: Q_RADIO },
        lines: [
          'Three good valves from the burn-out heaps by the pylons. Then string the wire up the can on the east bus.',
        ],
      },
      {
        lines: [
          'Valve-mender. I mend what the Tabulator burns out. Glass and grid and a little bit of heat. Licensed.',
          'You know what a valve really is? A little flame in a bottle. They never noticed. I find that very funny.',
          'There\'s a broadcast, at night. Radio Candle. You need a set to hear it, and sets are not licensed.',
        ],
      },
    ],
    barks: [
      { when: { questDone: Q_RADIO }, lines: ['…this is Radio Candle…', '(whistling the call-sign)'] },
      { lines: ['Glass and grid.', 'A little flame in a bottle.', 'That one\'s gassy.'] },
    ],
  },

  // ── Tally-Clerk Ohnesorg — at the Draw board ─────────────────────────
  {
    id: 'circuit-ohnesorg',
    name: 'Tally-Clerk Ohnesorg',
    title: 'Keeper of the Draw Board',
    look: { body: 0xc4a484, accent: 0xe8ece0, hat: 'cap', traits: ['book', 'pipe'], size: 1.05 },
    at: { x: 1340, y: 716 },
    talks: [
      {
        when: EMPRESS,
        lines: [
          'I wiped the Draw board. All of it. With my sleeve, in front of everybody, and nobody stopped me.',
          'Then somebody chalked up a hopscotch. On the Draw board. I have been playing it. I\'m very bad.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'No numbers came off the tape tonight. I stood by the board with my chalk till the Bell. Nothing.',
          'Then the Bell didn\'t ring. Thirty years, and the Brownout Bell didn\'t ring.',
        ],
      },
      {
        lines: [
          'The Draw board. Every household\'s night chalked up here, by number, as it comes off the tape.',
          'A ring round a number is a short. Short at the Bell, switched off till paid. Three rings and — up.',
          'Up the Coil. Earthed. The Treadmill Galleries. I chalk the rings. I don\'t do the rest. I chalk.',
        ],
      },
    ],
    barks: [
      { when: PRINCE, lines: ['No numbers.', 'The Bell didn\'t ring.'] },
      { lines: ['One-oh-seven, short.', 'Ring round two-two-nine.', 'Bell in an hour.'] },
    ],
  },
];

const looks: NpcLook[] = [
  { body: 0xd6b494, accent: 0xc8763a, hat: 'cap', traits: ['tool'] },
  { body: 0xe4c8ac, accent: 0x3a5ac8, hat: 'beanie', traits: ['apron'] },
  { body: 0xc49a7c, accent: 0x3ae08a, hat: 'antenna', traits: ['glasses'] },
  { body: 0xdcbca0, accent: 0xe8d03a, hat: 'none', traits: ['scarf'], size: 0.76 },
  { body: 0xb8906e, accent: 0x7a3e1a, hat: 'goggles', traits: ['tool', 'beard'], size: 1.15 },
  { body: 0xe8d0b6, accent: 0x8a4ac0, hat: 'hood', traits: ['book'] },
  { body: 0xcfa585, accent: 0xc8302a, hat: 'cap', traits: ['pack', 'apron'] },
  { body: 0xd9b89a, accent: 0x3a9a4a, hat: 'beanie', traits: ['satchel'], size: 0.74 },
];

const barks: Talk[] = [
  {
    when: EMPRESS,
    lines: [
      'The Grid\'s cut!',
      'I lit a candle. In the WINDOW.',
      'No Bell tonight. No Bell ever.',
      'They\'re coming down the Coil!',
    ],
  },
  {
    when: PRINCE,
    lines: [
      'The Prince yielded!',
      'My lock went green on its own.',
      'The Tabulator\'s just humming.',
      'He asked Dekker her name!',
    ],
  },
  {
    when: { courtReady: 'circuit' },
    lines: [
      'Someone beat all five of the Prince\'s.',
      'The stranger\'s going to the Die.',
    ],
  },
  {
    lines: [
      'Bell in an hour.',
      'Forty turns to go.',
      'Two-two-nine got a ring.',
      'Mind the traces, they\'re live.',
      'Don\'t say the number out loud.',
      'Brown-black-red. Barely enough.',
      'Is that a candle? No. Good.',
      'Crank, crank, crank.',
    ],
  },
];

export const CIRCUIT_CROWD: NonNullable<AreaDef['crowd']> = {
  count: 14,
  looks,
  paths: [
    // Along the bus, both ways.
    [{ x: 2200, y: 800 }, { x: 1400, y: 800 }],
    [{ x: 1400, y: 820 }, { x: 2200, y: 820 }],
    // Down the Rail and back.
    [{ x: 1200, y: 960 }, { x: 1200, y: 1520 }, { x: 1200, y: 960 }],
    // Round the Junction.
    [{ x: 1060, y: 800 }, { x: 1200, y: 660 }, { x: 1340, y: 800 }, { x: 1200, y: 940 }],
    // West street, out to the Core Store and back.
    [{ x: 1040, y: 800 }, { x: 420, y: 800 }, { x: 1040, y: 800 }],
    // The mill street.
    [{ x: 1140, y: 1300 }, { x: 180, y: 1300 }, { x: 1140, y: 1300 }],
    // Up to the Tabulator steps.
    [{ x: 1200, y: 650 }, { x: 1200, y: 530 }, { x: 1200, y: 650 }],
    // The sump street.
    [{ x: 1260, y: 1060 }, { x: 2220, y: 1060 }, { x: 1260, y: 1060 }],
  ],
  barks,
};
