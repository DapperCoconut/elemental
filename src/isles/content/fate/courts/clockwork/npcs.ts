import type { AreaDef, NpcDef, NpcLook, Talk } from '../../../../IslesTypes';

/**
 * The people of the Clockwork Court.
 *
 * Clockwork is where the Draw is paid in *hours*. A drawn Lot owes the Hour Office an afternoon,
 * or three, or a week; you hand it in at the window, the clerk stamps your slip, and you wake
 * up on a bench in the Hour Square with the light gone and your back aching, a little older.
 * The paid hours go up the brass tube to Prince Tock's Regulator, and nobody has ever seen one come
 * back. People here talk about time the way the Card Court talks about luck: carefully, and in
 * numbers. The grey ones — faces gone the colour of ash — are the ones who have paid the most.
 */

const PRINCE = { prince: 'tock' } as const;
const KING = { monarch: 'lucan' } as const;

const Q_AFTERNOON = 'clockwork-q-afternoon';
const Q_OIL = 'clockwork-q-oil';
const Q_STROKE = 'clockwork-q-thirteenth';
const Q_WEIGHTS = 'clockwork-q-counterweights';
const Q_REGULATOR = 'clockwork-q-regulator';

export const CLOCKWORK_NPCS: NpcDef[] = [
  // ── Mendel Plumb — the shop ──────────────────────────────────────────
  {
    id: 'clockwork-plumb',
    name: 'Mendel Plumb',
    title: 'Watches & Repairs',
    look: { body: 0xd8c0a4, accent: 0x3e5ec8, hat: 'visor', traits: ['glasses', 'apron', 'tool'], size: 0.95, eye: 0x8aa4f0 },
    at: { x: 1700, y: 1030 },
    role: { kind: 'shop', id: 'clockwork-shop' },
    talks: [
      {
        when: KING,
        lines: [
          'People are bringing me their watches to be set wrong. On purpose. "Make it slow," they say. "Make it lazy."',
          'Forty years I\'ve set them right. I set one an hour slow this morning and I laughed till I wept.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The Regulator\'s pendulum has stopped. I walked up to see. You can hear the whole hill not ticking.',
          'Customers keep asking me what time it is. I tell them: whatever time you like, madam. Whatever you like.',
        ],
      },
      {
        when: { questDone: Q_OIL },
        lines: [
          'Ottilie\'s gable clock is keeping time on eel oil. Sweetest movement on the Row. I went and listened to it.',
          'Gus says you caught them yourself. In the sump. I\'ve lived here sixty years and never put a hand in it.',
        ],
      },
      {
        lines: [
          'Watches cleaned, chains mended, hands straightened. No hours bought, no hours sold. I\'m a repairer.',
          'Up the road they take an afternoon off you when your Lot comes up. I can\'t mend that. Nobody can.',
          'Charms in the case — you may wear three. Clockwork that fights for you. Mind the cuckoo, it bites.',
        ],
      },
    ],
    barks: [
      { when: PRINCE, lines: ['Whatever time you like!', 'Watches set wrong, half price!'] },
      { lines: ['Mainsprings! Balance staffs!', 'Your watch is slow, sir.', 'Tick, tock, keep it clean.', 'Charms in the case.'] },
    ],
  },

  // ── Ida Quarterly — the clerk at the Hour Office ─────────────────────
  {
    id: 'clockwork-ida',
    name: 'Ida Quarterly',
    title: 'Clerk of the Fourth Window',
    look: { body: 0xe0ccb4, accent: 0x3fa060, hat: 'visor', traits: ['glasses', 'book'], size: 0.95, eye: 0x9ad0a0 },
    at: { x: 1950, y: 562 },
    talks: [
      {
        when: KING,
        lines: [
          'We opened the ledgers to the square this morning. Anyone could read their own page. People sat and read.',
          'Some of them have paid four years. Four years, a Tuesday afternoon at a time. I stamped half of them.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The windows are shut. All five. The tube is just a pipe now. I put my ear to it and heard nothing.',
          'I don\'t know what to do with my hands. Twenty years of stamping. I keep stamping the air.',
        ],
      },
      {
        when: { questDone: Q_AFTERNOON },
        lines: [
          'Larkwell, Lot four-four-seven-one: no slip on the board at the bell. Not collected. Most irregular.',
          'I wrote "mislaid" in the ledger. In ink. I have never written "mislaid" in my life. It felt marvellous.',
        ],
      },
      {
        when: { quest: Q_AFTERNOON, stage: 1 },
        lines: [
          'Three slips. The board, the cart, the tube. I did not tell you that. I am a clerk. I stamp things.',
        ],
      },
      {
        lines: [
          'Fourth window. Lot number, hours due, and your slip. Hours are paid whole: an afternoon is four.',
          'You sit on the bench, you close your eyes, and when you open them it is dark and you are a little older.',
          'The hours go up the tube to the Regulator. The Prince keeps them. He looks very well on them.',
        ],
      },
    ],
    barks: [
      { when: PRINCE, lines: ['Windows closed.', 'Nothing due. Nothing due!'] },
      { lines: ['Next window, please.', 'Lot number?', 'Four hours. Sit there.', 'Stamped.', 'The bell is at six.'] },
    ],
  },

  // ── Hettie Larkwell — in the queue ───────────────────────────────────
  {
    id: 'clockwork-hettie',
    name: 'Hettie Larkwell',
    title: 'Lot 4471, Queueing',
    look: { body: 0xe6c8aa, accent: 0xc8202c, hat: 'none', traits: ['scarf', 'satchel'], size: 0.95 },
    at: { x: 1840, y: 652 },
    talks: [
      {
        when: KING,
        lines: [
          'Posy\'s asked for her birthday again. Every year, now, she says. Every single afternoon of it.',
          'I\'m going to take her to the sea. I\'ve never had an afternoon free for the sea.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'No queue today. I stood here anyway, out of habit. Then I went home. In the afternoon. In daylight.',
        ],
      },
      {
        when: { questDone: Q_AFTERNOON },
        lines: [
          'I was THERE. I watched her blow the candles out. I was there for every one of the four hours.',
          'If they come for the hours again I\'ll pay them gladly. I\'ve got the afternoon now. They can\'t have it.',
        ],
      },
      {
        when: { quest: Q_AFTERNOON },
        lines: [
          'Talk to Ida at the fourth window. She\'s kind, under the visor. She knows how the slips work.',
        ],
      },
      {
        lines: [
          'Four-four-seven-one. Drawn on Sunday. Four hours due — an afternoon. Tomorrow\'s afternoon.',
          'Tomorrow is Posy\'s birthday. She\'s seven. I\'d sit on the bench and wake up and it\'d be over.',
          'I missed her fourth. And her sixth. I don\'t remember them. I wasn\'t there. I was paid.',
        ],
      },
    ],
    barks: [
      { when: { questDone: Q_AFTERNOON }, lines: ['I was there for all of it.', 'Seven candles!'] },
      { lines: ['Four-four-seven-one.', 'Tomorrow afternoon.', 'Not her birthday. Not again.', 'Move up, move up.'] },
    ],
  },

  // ── Gus Sumpwell — the sump-hand ─────────────────────────────────────
  {
    id: 'clockwork-gus',
    name: 'Gus Sumpwell',
    title: 'Sump-Hand',
    look: { body: 0xb89878, accent: 0x15120f, hat: 'cap', traits: ['rod', 'bandage'], size: 1.15, eye: 0xc8a040 },
    at: { x: 640, y: 1392 },
    talks: [
      {
        when: KING,
        lines: [
          'They\'ve let the sump go free. Anyone can oil anything. Folk are oiling hinges just to hear them not squeak.',
          'I caught an eel this morning and I kept it. Kept it! Took it home and ate it. With butter.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'Oil Office is shut. Nobody to count my eels. I don\'t know how many I caught today. Wonderful number.',
        ],
      },
      {
        when: { questDone: Q_OIL },
        lines: [
          'Ottilie\'s clock is running on the best oil in the court. Gallon\'s gone quiet. Very quiet. Good.',
          'You\'ve got the hands for the sump now. Most folk lose a glove. Some lose the arm, near enough.',
        ],
      },
      {
        when: { quest: Q_OIL },
        lines: [
          'Escapement eels. Iron rod or better, cast off the coaming. They fight in jerks — tick, tick — keep up.',
        ],
      },
      {
        lines: [
          'This is the sump. Everything the works drip comes down here. Black as the inside of a Lot.',
          'Clock oil is rationed. You buy it at the Oil Office — by the hour. An hour of your time a flask.',
          'Your gable clock runs slow on Cuckoo Row, they fine you an hour a minute. So you buy oil. See the trap?',
        ],
      },
    ],
    barks: [
      { when: PRINCE, lines: ['Free oil! Free oil!', 'Count them yourself, I\'m not.'] },
      { lines: ['Mind the coaming.', 'Black as a busted chip.', 'Something big down there.', 'Tick, tick, there\'s an eel.'] },
    ],
  },

  // ── Ottilie Pennywhistle — Cuckoo Row ────────────────────────────────
  {
    id: 'clockwork-pennywhistle',
    name: 'Ottilie Pennywhistle',
    title: 'No. 4, Cuckoo Row',
    look: { body: 0xe8d2bc, accent: 0x4a8a86, hat: 'nightcap', traits: ['cane', 'glasses', 'scarf'], size: 0.85 },
    at: { x: 1985, y: 1400 },
    talks: [
      {
        when: KING,
        lines: [
          'I took the clock off my gable. Put it in the kitchen. It can run as slow as it likes in there.',
          'I\'m ninety-one. Or sixty-eight, if you go by the calendar. I\'d like the difference back, please.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'Not a single bird came out on the hour today. Not one, all down the Row. It was the quietest noon of my life.',
        ],
      },
      {
        when: { questDone: Q_OIL },
        lines: [
          'Listen to her. Hear that? Not a hitch. My grandfather built that movement. She\'s singing for him.',
          'Gus says you put your arm in the sump. My hero. Have a humbug. Have three.',
        ],
      },
      {
        when: { quest: Q_OIL },
        lines: [
          'Gus is sending eels? Bless him. My clock\'s losing a minute a day. That\'s an hour a day off me.',
        ],
      },
      {
        lines: [
          'Number four. My grandfather carved that cuckoo. The Row\'s clocks must keep the Regulator\'s time.',
          'Mine\'s losing a minute a day. Dry. Fined an hour a minute. I\'ve paid three hundred hours this year.',
          'I\'m sixty-eight. I look ninety. That\'s where the hours come off, you see. Off the face.',
        ],
      },
    ],
    barks: [
      { when: { questDone: Q_OIL }, lines: ['Hear her sing!', 'Not a minute lost.'] },
      { lines: ['Losing a minute.', 'Dry as a biscuit.', 'Wind, wind, wind.', 'Cuckoo, you old fool.'] },
    ],
  },

  // ── Wren Tolley — apprentice to the great clock ──────────────────────
  {
    id: 'clockwork-wren',
    name: 'Wren Tolley',
    title: 'Apprentice to the Great Clock',
    look: { body: 0xdcb896, accent: 0xc9a04a, hat: 'beanie', traits: ['tool', 'pack'], size: 0.82, eye: 0xf0d58a },
    at: { x: 1400, y: 732 },
    talks: [
      {
        when: KING,
        lines: [
          'I rang the bell twelve times at noon and then I STOPPED. Twelve. Like a normal clock. Everyone cheered.',
          'Reprise says I\'m to be a proper horologist now. I said only if I get to keep time for nobody.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The great clock\'s still going — I keep it going. But the thirteenth stroke\'s gone. I took it out.',
        ],
      },
      {
        when: { questDone: Q_STROKE },
        lines: [
          'Thirteen strokes on the Draw, and the last one went "thup." Like a pillow. Not one hour went up the tube.',
          'Clangor\'s furious. He\'s casting a new clapper. It\'ll take him a month. A whole month of Draws!',
        ],
      },
      {
        when: { quest: Q_STROKE },
        lines: [
          'Green baize. Off the lawns where the card-folk leave their tables. Proper felt, thick, three pieces.',
        ],
      },
      {
        lines: [
          'I wind the great clock. Every gear. On Draw day it strikes thirteen — the thirteenth is the hour-bell.',
          'When it rings, every hour owed that week goes up the tube at once. You can feel it in your teeth.',
          'Everyone hates the thirteenth stroke. Nobody can stop a bell. Well. Nobody\'s tried felt.',
        ],
      },
    ],
    barks: [
      { when: { questDone: Q_STROKE }, lines: ['Thup!', 'Felt beats bronze!'] },
      { lines: ['Seven hundred teeth on the moon-wheel.', 'Don\'t touch the rope!', 'Twelve, then thirteen.'] },
    ],
  },

  // ── Wick Ashby — thirty-one years old ────────────────────────────────
  {
    id: 'clockwork-wick',
    name: 'Wick Ashby',
    title: 'Thirty-One Years Old',
    look: { body: 0xb0aca4, accent: 0x6a6050, hat: 'cap', traits: ['cane', 'beard', 'pipe'], size: 1, eye: 0xc0c0b8 },
    at: { x: 800, y: 862 },
    talks: [
      {
        when: KING,
        lines: [
          'They say the paid hours were in the Regulator all along. Bottled. Hundreds of thousands of them.',
          'I don\'t know if I want mine back. What if I was unhappy in them? No — I\'ll have them. I\'ll risk it.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The bobs still swing. Bob says they always will, Prince or no Prince. But nobody\'s tied to them now.',
        ],
      },
      {
        when: { questDone: Q_WEIGHTS },
        lines: [
          'Jory came home. Walked in the door, sat down at the table and ate four bowls. He\'s still dizzy.',
          'He told me the swinging counted as hours paid. Bob booked him at an hour a swing. He\'s eleven.',
        ],
      },
      {
        when: { quest: Q_WEIGHTS },
        lines: [
          'The tethers are on the gantries, both bridges. Cut the lot. Bob will come running. Let him.',
        ],
      },
      {
        lines: [
          'I\'m thirty-one. Don\'t look at me like that. I was drawn every week for nine years. Bad luck, they said.',
          'My nephew Jory got drawn last month. Bob took him for the bobs. They tie the boys on as counterweights.',
          'Every swing\'s an hour paid. He swings all day. He\'ll be my age by spring. My age. Thirty-one.',
        ],
      },
    ],
    barks: [
      { when: { questDone: Q_WEIGHTS }, lines: ['Four bowls!', 'Jory\'s home.'] },
      { lines: ['Thirty-one.', 'Nine years of Tuesdays.', 'Mind the bobs, lad.', 'Can\'t remember my twenties.'] },
    ],
  },

  // ── Marguerite Fusee — the retired horologist ────────────────────────
  {
    id: 'clockwork-fusee',
    name: 'Marguerite Fusee',
    title: 'Retired Horologist',
    look: { body: 0xd8c4b0, accent: 0x4a3014, hat: 'tophat', traits: ['glasses', 'book', 'cane'], size: 0.9, eye: 0xd8b25a },
    at: { x: 1290, y: 480 },
    talks: [
      {
        when: KING,
        lines: [
          'They\'ve found the King\'s drum had a false bottom. Of course it did. I could have built him a better one.',
          'Tock came to see me. He\'s going grey, a little, at the temples. He asked if it would hurt. I said only a bit.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'He\'s let the spring down. I can hear it from here — the Regulator ticking like an ordinary clock.',
          'He\'ll age now. Properly. Like the rest of us. I think he\'s frightened. I think he\'s also relieved.',
        ],
      },
      {
        when: { questDone: Q_REGULATOR },
        lines: ['You let his spring down. Gently, I hope. I made it for a boy who wanted to be on time for things.'],
      },
      {
        lines: [
          'I built the movement in the Regulator. Seventy years ago, for a boy who was frightened of being late.',
          'His father the King had me fit a spring that could hold hours. Other people\'s. I did not ask why. I am sorry.',
          'He has been seventeen for sixty-four years. That is a very long time to be seventeen.',
        ],
      },
    ],
    barks: [
      { when: PRINCE, lines: ['Ordinary ticking. Lovely.', 'Let it run down.'] },
      { lines: ['Seventy years.', 'A boy who hated being late.', 'I should never have fitted it.'] },
    ],
  },

  // ── Tally Minim — counts the seconds ─────────────────────────────────
  {
    id: 'clockwork-tally',
    name: 'Tally Minim',
    title: 'Counts the Seconds',
    look: { body: 0xe8ccae, accent: 0xc8202c, hat: 'jester', traits: ['scarf'], size: 0.72, eye: 0xffd040 },
    at: { x: 1150, y: 650 },
    wander: 60,
    talks: [
      {
        when: KING,
        lines: ['I stopped counting! I got to four thousand and I just STOPPED. Nothing bad happened at all!'],
      },
      {
        when: PRINCE,
        lines: [
          'Mum says I don\'t have to count any more because nobody\'s keeping the hours. I\'m still counting. Habit.',
        ],
      },
      {
        lines: [
          'Eighty-one, eighty-two — hello — eighty-four. Count every second and they can\'t take one unnoticed.',
          'Mum says that\'s not how it works. But last Draw I counted, and I KNOW I lost four thousand and two.',
          'Ninety-nine. A hundred. A hundred and one. I\'m going to count all the way to grown up.',
        ],
      },
    ],
    barks: [
      { when: KING, lines: ['Not counting!', 'Lost count! Ha!'] },
      { lines: ['Two hundred and six…', 'Two hundred and seven…', 'Shh, I\'m counting.', 'One elephant, two elephant.'] },
    ],
  },
];

// ── The crowd ────────────────────────────────────────────────────────

const looks: NpcLook[] = [
  { body: 0xd8c0a4, accent: 0x3e5ec8, hat: 'visor', traits: ['book'] },
  { body: 0xa8a8a0, accent: 0x6a6050, hat: 'cap', traits: ['cane'] },
  { body: 0xe4c8ac, accent: 0xc8202c, hat: 'none', traits: ['scarf'] },
  { body: 0xc49a7c, accent: 0xb8693a, hat: 'goggles', traits: ['tool', 'apron'], size: 1.1 },
  { body: 0xb0aca4, accent: 0x4a4e56, hat: 'tophat', traits: ['glasses'] },
  { body: 0xdcbca0, accent: 0xc9a04a, hat: 'beanie', traits: ['pack'], size: 0.76 },
  { body: 0x9c9890, accent: 0x2f6b3f, hat: 'hood', traits: ['satchel'] },
  { body: 0xe8d0b6, accent: 0x4a8a86, hat: 'nightcap', traits: ['cane', 'scarf'], size: 0.9 },
];

const barks: Talk[] = [
  {
    when: KING,
    lines: [
      'They\'re opening the Regulator!',
      'I\'m going to waste an afternoon. On purpose!',
      'What time is it? Who cares!',
      'My hours are in a bottle somewhere.',
    ],
  },
  {
    when: PRINCE,
    lines: [
      'The pendulum\'s stopped!',
      'Hour Office is shut.',
      'Nothing due this week!',
      'The Prince yielded. On the beat, I bet.',
    ],
  },
  {
    when: { courtReady: 'clockwork' },
    lines: [
      'Someone\'s beaten all five of the Prince\'s people.',
      'The stranger\'s going up to the Regulator.',
    ],
  },
  {
    lines: [
      'Four hours due.',
      'I lost Thursday.',
      'Set your watch by the great clock.',
      'They\'re never called, his lot.',
      'Drum\'s rigged. Everyone knows.',
      'Mind the bobs.',
      'Is it the Draw already?',
      'You look older. No, you do.',
      'Fourth window, fourth window.',
    ],
  },
];

export const CLOCKWORK_CROWD: NonNullable<AreaDef['crowd']> = {
  count: 15,
  looks,
  paths: [
    // Along the east road, both ways.
    [{ x: 2300, y: 800 }, { x: 1700, y: 800 }, { x: 1420, y: 800 }, { x: 1700, y: 800 }],
    // The queue at the Hour Office, shuffling up.
    [{ x: 1790, y: 575 }, { x: 1880, y: 575 }, { x: 1950, y: 575 }, { x: 2050, y: 575 }, { x: 1790, y: 575 }],
    // Round the Hour Square.
    [{ x: 1000, y: 760 }, { x: 1200, y: 620 }, { x: 1360, y: 760 }, { x: 1200, y: 900 }],
    // Down the south road and along Cuckoo Row.
    [{ x: 1200, y: 960 }, { x: 1200, y: 1400 }, { x: 1700, y: 1400 }, { x: 2280, y: 1400 }, { x: 1200, y: 1400 }],
    // West to the hourglass wells and back.
    [{ x: 960, y: 760 }, { x: 520, y: 760 }, { x: 520, y: 1200 }, { x: 1100, y: 1200 }],
    // Over the bridges into the Works.
    [{ x: 300, y: 760 }, { x: 300, y: 460 }, { x: 720, y: 460 }, { x: 720, y: 760 }],
  ],
  barks,
};
