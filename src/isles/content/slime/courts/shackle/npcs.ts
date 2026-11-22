import type { AreaDef, NpcDef, NpcLook, Talk } from '../../../../IslesTypes';

/**
 * The people of the Shackle Court.
 *
 * Shackle is where Fangmire's debts end up. A household passed over at the Draught House can
 * still buy a dose — on credit, from the Owing House, at the Prince's interest — and every dose
 * so bought is written in the Great Ledger against the household's name. Debts are inherited.
 * Debtors who fall behind are put in irons and walked to the causeway gang or the Manacle Works
 * to work it off, and almost nobody works it off. Everyone here owes, or is owed, or keeps the
 * book. They talk about money the way the rest of the isle talks about the Draught: carefully.
 */

const PRINCE = { prince: 'fetter' } as const;
const MATRIARCH = { monarch: 'nyxa' } as const;

const Q_FILES = 'shackle-q-files';
const Q_SHAD = 'shackle-q-shad';
const Q_BLOT = 'shackle-q-blot';
const Q_PRESS = 'shackle-q-press';
const Q_KEYS = 'shackle-q-keys';

export const SHACKLE_NPCS: NpcDef[] = [
  // ── Mother Hock — the shop ───────────────────────────────────────────
  {
    id: 'shackle-hock',
    name: 'Mother Hock',
    title: 'The Hock & Chain',
    look: { body: 0xc8b098, accent: 0x6a3a6e, hat: 'hood', traits: ['glasses', 'pipe', 'satchel'], size: 1.05, eye: 0xf0d48a },
    at: { x: 1200, y: 1458 },
    role: { kind: 'shop', id: 'shackle-shop' },
    talks: [
      {
        when: MATRIARCH,
        lines: [
          'Folk are coming to redeem their pledges. With what? With nothing. I\'m giving them back. Don\'t tell anyone.',
          'Forty years I\'ve held this town\'s wedding rings. It\'s time they went home. The charms still sell, though.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The gang came off the causeway this morning and walked straight past my door without their irons on.',
          'Nobody\'s pawning anything today. It\'s the worst day of trade I\'ve ever had. I\'ve never been happier.',
        ],
      },
      {
        when: { questDone: Q_FILES },
        lines: [
          'Old Rivet came in and redeemed her late husband\'s ring. Paid in coin. Where does a gang woman get coin?',
          'I didn\'t ask. In my trade you learn not to ask. You learn it twice.',
        ],
      },
      {
        lines: [
          'The Hock & Chain. Everything in this court ends up on my shelf, love. Rings, kettles, wedding shoes.',
          'Passed over at the Draught House? You pawn what you have, you buy a dose on credit, you owe the rest.',
          'Then they chain you and I keep your ring. That is how the Shackle works. I only keep the rings.',
          'The charms on the top shelf were pledged and never redeemed. Three can be worn. Mind, they bite back.',
        ],
      },
    ],
    barks: [
      { when: PRINCE, lines: ['Redeem! Redeem, all of you!', 'Free pledges, today only. Shh.'] },
      {
        lines: [
          'Pledges taken, pledges sold.', 'Every ring has a story, love. Most of them end here.',
          'No questions, no Ledger.', 'Charms on the top shelf. Don\'t touch the keyring.',
        ],
      },
    ],
  },

  // ── Gammer Rivet — the chain-gang ────────────────────────────────────
  {
    id: 'shackle-rivet',
    name: 'Gammer Rivet',
    title: 'Chain-Gang, Third File',
    look: { body: 0xb89a80, accent: 0x6a6458, hat: 'headwrap', traits: ['bandage', 'brand'], size: 0.95, eye: 0xd8dce4 },
    at: { x: 2050, y: 860 },
    talks: [
      {
        when: MATRIARCH,
        lines: [
          'I walked the causeway this morning with nothing on my ankle. I kept looking down. I\'ll stop that soon.',
          'Forty-one years in irons. I don\'t know what to do with my feet. I may learn to dance. Late, but I may.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The Prince sent the keys down to the gang himself. In a basket. Every key in the court. A basket!',
          'We had a time finding whose was whose. Link\'s fit three locks. Typical.',
        ],
      },
      {
        when: { questDone: Q_FILES },
        lines: [
          'Four files in four loaves, and Brank face-down in the ruts. Best day on the causeway in forty years.',
          'We\'ll not run yet. Not till the Prince falls. But we can cut the links when we choose. That\'s a start.',
        ],
      },
      {
        when: { quest: Q_FILES },
        lines: [
          'The bread-wives leave loaves at the foot of the causeway piles. Four of them have files baked in.',
          'Fetch them before Brank does his rounds. He breaks every loaf he finds. Says it\'s for weevils.',
        ],
      },
      {
        lines: [
          'Forty-one years on the gang. My man bought two doses on credit the year we were passed over. Two.',
          'He went grey anyway, and the debt came to me, and then it came to my ankle. It\'s grown since. Debts do.',
          'The children\'s names are in the Ledger under mine. When I go, they get the ball. That\'s the law here.',
        ],
      },
    ],
    barks: [
      { when: PRINCE, lines: ['No irons! Look — no irons!', 'Who wants a ball? Good iron. Free.'] },
      { lines: ['Lift, step, drag.', 'Mind the ruts.', 'Forty-one years.', 'Keep the file file-shaped, girl.'] },
    ],
  },

  // ── Tadge Mudlark — the moat-boy ─────────────────────────────────────
  {
    id: 'shackle-tadge',
    name: 'Tadge Mudlark',
    title: 'Moat-Boy',
    look: { body: 0xc4a084, accent: 0x4a5a3a, hat: 'cap', traits: ['rod', 'satchel'], size: 0.74, eye: 0xd8f0a0 },
    at: { x: 420, y: 1140 },
    talks: [
      {
        when: MATRIARCH,
        lines: [
          'Uncle Ansel\'s colour\'s back. Proper pink! They gave him a real dose, a whole one, from her own still.',
          'I\'m going to fish the moat every day anyway. Nobody can stop me now. Nobody wants to.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'They let Uncle Ansel off his chain. He sat on the bank and fished with me. He\'s rubbish at it.',
          'The cage is empty! I threw a stone in it. It went clang. Best sound in the world.',
        ],
      },
      {
        when: { questDone: Q_SHAD },
        lines: [
          'Uncle Ansel ate both shad, bones and all. He said they were the best he ever had. They\'re bony as anything.',
          'And you knocked the Turnkey in the moat! Everyone saw. Everyone\'s pretending they didn\'t.',
        ],
      },
      {
        when: { quest: Q_SHAD },
        lines: [
          'Cast in by the posts, where the chains go down. The shad hang round the chains. Don\'t hook a chain.',
          'Two\'s enough. Uncle Ansel\'s on the east bank, on his post. Mind the Turnkey.',
        ],
      },
      {
        lines: [
          'That\'s my Uncle Ansel on the post over there. He owes. They give him half a dose and he\'s going grey.',
          'Debtors on the moat get what\'s thrown them. The Turnkey says a fish given is a fish lent. He writes it down.',
          'So nobody throws. But a fish CAUGHT isn\'t lent, is it? Not if somebody else catches it. Is it?',
        ],
      },
    ],
    barks: [
      { when: PRINCE, lines: ['The cage is empty!', 'Clang! Ha!'] },
      { lines: ['Bite, bite, bite.', 'Not a chain again.', 'Shad\'s bony but it\'s food.', 'Uncle Ansel, look!'] },
    ],
  },

  // ── Ansel Gray — the debtor on the moat post ─────────────────────────
  {
    id: 'shackle-ansel',
    name: 'Ansel Gray',
    title: 'Debtor, Going Grey',
    look: { body: 0x9aa6a6, accent: 0x4a4a4a, hat: 'none', traits: ['bandage', 'beard'], size: 1, eye: 0xb8c4c4 },
    at: { x: 800, y: 1250 },
    talks: [
      {
        when: MATRIARCH,
        lines: [
          'Look at my hands. Pink to the ends. I\'d stopped feeling my fingers in the spring. I can feel the rain now.',
          'I\'m going home. I don\'t know if the house is there. I\'m going anyway.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'They took the chain off and I didn\'t get up. Sat here an hour. You forget the ground is yours to walk on.',
          'Still grey to the wrists. But it\'s stopped climbing. Tansy Rue came by. I didn\'t see her. Nobody did.',
        ],
      },
      {
        when: { questDone: Q_SHAD },
        lines: [
          'Two shad. My nephew\'s fish, cooked over a candle-end. I won\'t forget it. I\'ve not much left to forget with.',
          'Don\'t tell Tadge I\'m grey past the elbow. He thinks it\'s the cold.',
        ],
      },
      {
        lines: [
          'Pardon me not getting up. The chain\'s short. Ansel Gray, debtor, eleven doses owing, interest on nine.',
          'Half a dose a moon, they give a debtor. Enough to keep you working. Not enough to keep your colour.',
          'See my fingers? Grey to the second knuckle. When it reaches the heart, it\'s the Grave Court for me.',
        ],
      },
    ],
    barks: [
      { when: PRINCE, lines: ['Off the post. Off it.', 'The ground is mine. Ha.'] },
      { lines: ['Cold today.', 'Half a dose. Half a man.', 'Tadge? Is that you?', 'Eleven doses. Interest on nine.'] },
    ],
  },

  // ── Hesper Blot — under-clerk of the Ledger ──────────────────────────
  {
    id: 'shackle-hesper',
    name: 'Hesper Blot',
    title: 'Under-Clerk of the Ledger',
    look: { body: 0xd8c4b0, accent: 0x2a2440, hat: 'none', traits: ['glasses', 'book'], size: 0.92, eye: 0xa8c8f0 },
    at: { x: 930, y: 728 },
    talks: [
      {
        when: MATRIARCH,
        lines: [
          'We\'re burning the ration books in the square. I brought the Ledger\'s copy. I lit it myself. With a quill.',
          'I have a lovely hand, you know. I\'m going to write letters now. Just letters. To people. Who are alive.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The Prince came and read his own page in the Ledger. All of it. Out loud. Then he closed the book.',
          'Nobody\'s written in it since. The ink\'s gone dry in the horn. I keep checking. It stays dry.',
        ],
      },
      {
        when: { questDone: Q_BLOT },
        lines: [
          'The Wick children\'s page is a blot. A beautiful, black, perfect blot. Arrears can\'t read a word of it.',
          'He\'s copying it from memory. He has a very good memory. I\'ve given him the wrong ink.',
        ],
      },
      {
        when: { quest: Q_BLOT },
        lines: [
          'The soot-traps on the square\'s lamps. Scrape them out. Lampblack and mire-water makes a blot nothing lifts.',
          'Then bring it to the Ledger and tip it on the Wick page. Arrears will be there. He always is.',
        ],
      },
      {
        lines: [
          'I keep the copy of the copy. Arrears keeps the Ledger. Every debt in the court, in a book the size of a door.',
          'Do you know they write the babies in? A child is born, a page is opened. Its parents\' debt is carried over.',
          'The Wicks had twins last moon. They\'re eleven doses behind before they\'ve even been bitten.',
        ],
      },
    ],
    barks: [
      { when: PRINCE, lines: ['The ink\'s dry. Still dry.', 'Nobody\'s owed anything today.'] },
      { lines: ['Carried forward. Carried forward.', 'Neatly, Hesper. Neatly.', 'Two new pages. Twins.', 'Blot it. Don\'t.'] },
    ],
  },

  // ── Wren Scald — apprentice at the Manacle Works ─────────────────────
  {
    id: 'shackle-wren',
    name: 'Wren Scald',
    title: 'Apprentice, the Manacle Works',
    look: { body: 0xc8a48a, accent: 0x4a2a22, hat: 'coif', traits: ['apron', 'tool'], size: 0.9, eye: 0xffa860 },
    at: { x: 730, y: 1020 },
    talks: [
      {
        when: MATRIARCH,
        lines: [
          'We\'re melting the irons down. All of them. Clasp\'s making ploughshares. He\'s crying into the forge.',
          'Turns out I\'m good at hinges. Door hinges. Gate hinges. Hinges that open.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The press stands cold. Clasp says no more cuffs till somebody tells him who for. Nobody\'s telling him.',
          'He\'s been teaching me to make a kettle. A kettle! It leaks. It\'s the best thing I ever made.',
        ],
      },
      {
        when: { questDone: Q_PRESS },
        lines: [
          'The press is jammed solid. Three days, Gorse reckons, to strip it. Three days, four hundred pair not made.',
          'That\'s four hundred people not chained this week. I worked it out. I worked it out twice.',
        ],
      },
      {
        when: { quest: Q_PRESS },
        lines: [
          'Three cotter pins off the cooling racks — the bent ones nobody counts. Wedge them in the press\'s ram.',
          'Then get clear. Forgemaster Gorse will be out of that door like a dropped ingot.',
        ],
      },
      {
        lines: [
          'I stamp the numbers in. Every pair of manacles gets a number, and every number goes in the Ledger.',
          'Forty pair a day from my bench alone. One of them\'ll be on my mum by the new moon. She\'s three doses short.',
          'I know which number. I stamped it myself. I could stop it. Couldn\'t I? If the press stopped?',
        ],
      },
    ],
    barks: [
      { when: PRINCE, lines: ['Kettles! We make kettles now!', 'Cold press. Lovely.'] },
      { lines: ['Stamp. Number. Stamp.', 'Four hundred pair a week.', 'Mind the slag.', 'Hot iron! Hot iron!'] },
    ],
  },

  // ── Brother Lanyard — chaplain of the Owing House ────────────────────
  {
    id: 'shackle-lanyard',
    name: 'Brother Lanyard',
    title: 'Chaplain of the Owing House',
    look: { body: 0xb8a898, accent: 0x2e2a36, hat: 'cowl', traits: ['book', 'cane'], size: 1.1, eye: 0xd8d0f0 },
    at: { x: 860, y: 708 },
    talks: [
      {
        when: MATRIARCH,
        lines: [
          'The Owing House stands empty. I walk it at night out of habit. Every door open. The wind sings in the bars.',
          'I am going to plant something in the exercise yard. I don\'t know what grows in a gaol. Let\'s find out.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'He came to me after. The Prince. He asked if a debt could be forgiven by the one who owes it.',
          'I said I didn\'t know. I have been a chaplain thirty years and I didn\'t know. He seemed glad I didn\'t.',
        ],
      },
      {
        when: { questDone: Q_KEYS },
        lines: [
          'You read his page. Everyone has heard. They say he wept in the Counting Hall. They say a great many things.',
          'Go gently. He owes more than anyone on this isle, and he has paid every installment. Imagine it.',
        ],
      },
      {
        when: { courtReady: 'shackle' },
        lines: [
          'All five of them down. The Prince has called for his ring of keys and sat down to count them.',
          'Before you go to the Fetterhold, come and speak with me. There is something you should read first.',
        ],
      },
      {
        lines: [
          'I hear the debtors\' last confessions. Mostly they confess what they owe. They think that\'s the sin.',
          'The Matriarch\'s Draught keeps them alive. The Prince\'s credit keeps them owing. Between the two, a chain.',
          'If you mean to break it, start with the five who keep the court. Pillory, Arrears and the rest.',
        ],
      },
    ],
    barks: [
      { when: PRINCE, lines: ['Every door open.', 'Forgiven. Can it be? Forgiven.'] },
      { lines: ['Peace on the owing.', 'Remember the names.', 'Another to the Grave Court.', 'The bars sing at night.'] },
    ],
  },

  // ── Nan Clink — keeper of the keys' polish ───────────────────────────
  {
    id: 'shackle-clink',
    name: 'Nan Clink',
    title: 'Polisher of the Keys',
    look: { body: 0xd4c0aa, accent: 0xc8a040, hat: 'veil', traits: ['apron', 'cane', 'glasses'], size: 0.86, eye: 0xf0d48a },
    at: { x: 1520, y: 730 },
    talks: [
      {
        when: MATRIARCH,
        lines: [
          'He brought me the ring. "Polish them one last time, Nan," he said. "Then throw them in the mire."',
          'I polished them very slowly. Then I threw them in very fast. Splendid splash.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'He let me sit with him after. He had his head on my lap like when he was small. Keys all over the floor.',
          'Go easy on him in the songs, stranger. He was a good boy given a bad sum.',
        ],
      },
      {
        when: { quest: Q_KEYS },
        lines: [
          'You want to know about the boy? Sit. My knees are bad and the keys are many.',
          'His mother keeps a page for each of her brood. What they cost her: the egg, the milk, the dose that kept them.',
          'Fetter\'s is the longest. He was sickly. She spent on him. And she told him the sum the day he could count.',
        ],
      },
      {
        lines: [
          'I polish the Prince\'s keys. Every one on the ring, every morning. He likes them bright. So he can count them.',
          'I nursed him, you know. Before the keys. He used to count my buttons. All day. One to nine and back.',
        ],
      },
    ],
    barks: [
      { when: PRINCE, lines: ['Splendid splash.', 'Sleep, boy. Sleep.'] },
      { lines: ['Four hundred and twelve keys.', 'Bright as a new dose.', 'One to nine and back.', 'Rub, rub, rub.'] },
    ],
  },

  // ── Ossie Quarterbell — bellman of the square ────────────────────────
  {
    id: 'shackle-ossie',
    name: 'Ossie Quarterbell',
    title: 'Bellman of the Square',
    look: { body: 0xd8b494, accent: 0x7a5a1e, hat: 'tricorn', traits: ['lantern', 'scarf'], size: 1.15, eye: 0xffd08a },
    at: { x: 1450, y: 1052 },
    talks: [
      {
        when: MATRIARCH,
        lines: [
          'I rang the bell for the Matriarch! Not the debt-peal. The other one, nobody\'s heard in a hundred years.',
          'Turns out it\'s just ringing it as fast as you can. I did. My arms are gone. Worth it.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'No names to cry today! First time in my life. I stood up there and cried the weather instead.',
          '"Wet," I cried. "Wet, and nobody owes." They cheered the weather. Can you imagine.',
        ],
      },
      {
        when: { courtReady: 'shackle' },
        lines: [
          'Five champions down and the Prince counting his keys in the keep! The square\'s talked of nothing else.',
          'I\'m not allowed to cry news like that. I\'ve been humming it. Loudly.',
        ],
      },
      {
        lines: [
          'Every hour I ring the debt-peal and cry the names: who\'s behind, who\'s for the gang, who\'s for the stocks.',
          'The Ledger sends me the list. I ring, I cry, and somebody\'s mother starts weeping. Every hour, friend.',
          'The bell\'s brass. The rope\'s new. My voice is the only thing in this square that\'s worn out.',
        ],
      },
    ],
    barks: [
      { when: PRINCE, lines: ['WET! AND NOBODY OWES!', 'Hear ye: nothing!'] },
      { lines: ['Hear ye, the arrears!', 'Weavers\' Row, two doses behind!', 'Stocks at noon!', 'Ding. Dong. Debt.'] },
    ],
  },

  // ── Ottilie Spar — bridge-reeve on the north bank ────────────────────
  {
    id: 'shackle-spar',
    name: 'Ottilie Spar',
    title: 'Bridge-Reeve',
    look: { body: 0xb8a48e, accent: 0x2e3a3a, hat: 'souwester', traits: ['satchel', 'scarf'], size: 1, eye: 0x9adf5a },
    at: { x: 1330, y: 222 },
    talks: [
      {
        when: MATRIARCH,
        lines: [
          'No toll. No toll ever again! I\'ve nailed the toll-box shut and I\'m sitting on it.',
          'The Web Court folk are coming over in droves. They bring silk. We give them ironmongery. Fair trade, now.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'Pontoon\'s left every pin in. You can walk the whole bridge and nothing creaks. It\'s unnatural.',
          'I let three debtors across this morning. Wrote it down as "fog". It\'s been very foggy, officially.',
        ],
      },
      {
        lines: [
          'Toll for the bridge: one dose, or its value. North to the Web Court, if you\'ve got the dose.',
          'Debtors can\'t cross. If a debtor tries, Pontoon pulls the pins and the bridge does the rest.',
          'You\'re no debtor. Not yet. Go on — I\'ll put you down as "fog".',
        ],
      },
    ],
    barks: [
      { when: PRINCE, lines: ['Fog! Very foggy!', 'Cross free, cross free.'] },
      { lines: ['Toll! Toll for the bridge!', 'Dose or its value.', 'Mind the planks.', 'Silk from the Web? Show me.'] },
    ],
  },
];

// ── The crowd: debtors, clerks, bailiffs' men, gang-wives ─────────────

const looks: NpcLook[] = [
  { body: 0xb8a48e, accent: 0x6a6458, hat: 'none', traits: ['bandage'] },
  { body: 0xc8b098, accent: 0x3a3440, hat: 'tophat', traits: ['book'] },
  { body: 0xa8907a, accent: 0x4a3e3a, hat: 'headwrap', traits: ['pack'] },
  { body: 0xd0bca4, accent: 0x6a3a6e, hat: 'hood', traits: ['scarf'], size: 0.76 },
  { body: 0x9aa0a0, accent: 0x2e3a3a, hat: 'cowl', traits: ['lantern'] },
  { body: 0xc4a084, accent: 0x4a2a22, hat: 'coif', traits: ['apron', 'tool'], size: 1.15 },
  { body: 0xb8b0a8, accent: 0x5a4a36, hat: 'plague', traits: ['satchel'] },
  { body: 0xd8c0a8, accent: 0x7a5a1e, hat: 'cap', traits: ['brand'], size: 0.8 },
];

const barks: Talk[] = [
  {
    when: MATRIARCH,
    lines: [
      'The ration books are burning!',
      'A cure. Not a dose — a cure.',
      'I owe nothing. Nothing!',
      'Somebody pawned the stocks. For firewood.',
    ],
  },
  {
    when: PRINCE,
    lines: [
      'The Prince sent the keys down!',
      'No irons on the gang today.',
      'The Ledger\'s shut.',
      'Nobody cried my name!',
    ],
  },
  {
    when: { courtReady: 'shackle' },
    lines: [
      'All five of the Prince\'s men beaten.',
      'The stranger\'s going to the Fetterhold.',
    ],
  },
  {
    lines: [
      'Three doses behind.',
      'Carried forward.',
      'Mind the gang.',
      'Did they cry your name?',
      'Don\'t lend. They\'ll write it down.',
      'Grey to the knuckle, he is.',
      'New moon in four days.',
      'Bring fruit for the stocks.',
    ],
  },
];

export const SHACKLE_CROWD: NonNullable<AreaDef['crowd']> = {
  count: 14,
  looks,
  paths: [
    // Along the causeway, both ways.
    [{ x: 2240, y: 812 }, { x: 1900, y: 845 }, { x: 1600, y: 882 }, { x: 1420, y: 900 }],
    [{ x: 1420, y: 900 }, { x: 1600, y: 882 }, { x: 1900, y: 845 }, { x: 2240, y: 812 }],
    // Round the square.
    [{ x: 1080, y: 900 }, { x: 1200, y: 780 }, { x: 1320, y: 900 }, { x: 1200, y: 1000 }],
    // Square to the Works yard.
    [{ x: 1040, y: 900 }, { x: 800, y: 945 }, { x: 600, y: 1010 }, { x: 800, y: 945 }],
    // Down Pawn Row.
    [{ x: 1200, y: 1150 }, { x: 1200, y: 1330 }, { x: 1080, y: 1360 }, { x: 860, y: 1470 }, { x: 1080, y: 1360 }],
    [{ x: 1320, y: 1360 }, { x: 1600, y: 1470 }, { x: 1320, y: 1360 }, { x: 1200, y: 1150 }],
    // Gaol to keep, past the Ledger.
    [{ x: 860, y: 760 }, { x: 1040, y: 760 }, { x: 1200, y: 720 }, { x: 1440, y: 775 }, { x: 1200, y: 720 }],
    // Out onto the bridge and back.
    [{ x: 1200, y: 700 }, { x: 1200, y: 480 }, { x: 1200, y: 300 }, { x: 1200, y: 480 }],
  ],
  barks,
};
