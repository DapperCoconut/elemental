import type { AreaDef, NpcDef, NpcLook, Talk } from '../../../../IslesTypes';

/**
 * The people of the Arcane Court.
 *
 * The mages' town is the proudest place on Solmara and the most compromised. Its sigils hold the
 * Heliostat's mirrors to the sun — the Anchor Circle in the middle of the court *is* the Endless
 * Noon, as much as the mirrors are — and every spellwright here knows it. They talk about magic
 * the way clockmakers talk about clocks, and about the Noon the way you talk about a debt. The
 * astronomers have nothing to look at; the familiar-sellers may not sell black cats; a student was
 * silenced for asking what night was. Everyone squints. Everyone is very, very tired.
 */

const PRINCE = { prince: 'sigil' } as const;
const DESPOT = { monarch: 'auriel' } as const;

const Q_NIGHT = 'arcane-q-last-night';
const Q_CATS = 'arcane-q-black-cats';
const Q_INK = 'arcane-q-dark-ink';
const Q_SILENCED = 'arcane-q-silenced';
const Q_ANCHOR = 'arcane-q-anchor';

export const ARCANE_NPCS: NpcDef[] = [
  // ── Bellamy Thrice — the shop ────────────────────────────────────────
  {
    id: 'arcane-thrice',
    name: 'Bellamy Thrice',
    title: 'Wards & Wonders',
    look: { body: 0xe0c8b0, accent: 0x5a6ad0, hat: 'wizard', traits: ['glasses', 'satchel', 'beard'], size: 1.05 },
    at: { x: 2000, y: 1330 },
    role: { kind: 'shop', id: 'arcane-shop' },
    talks: [
      {
        when: DESPOT,
        lines: [
          'I sold a blackout charm this morning. Openly! A charm that makes a little dark round your pillow.',
          'The Bureau used to fine me for stocking those. I had them in a box marked "spoons". Charms are on the shelf.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'His Highness put his chalk down, they say. Just set it on the lectern and walked out into the light.',
          'Business is odd. People want charms for sleeping. I\'ve never been asked for a charm for sleeping.',
        ],
      },
      {
        when: { questDone: Q_INK },
        lines: [
          'Young Wren drew a shadow. A real one, the size of a plate. I stood in it and wept, I don\'t mind saying.',
          'Buy something, would you. I need to feel normal.',
        ],
      },
      {
        lines: [
          'Thrice\'s Wards and Wonders. Three generations in this stall. Thrice, Thrice, and Thrice. That\'s me.',
          'Charms on the rack — wear three. Every one\'s a bit of the Academy\'s own magic, licensed and stamped.',
          'Watch the glare on the bottles. Everything here shines. Nothing here gets a moment\'s rest from shining.',
        ],
      },
    ],
    barks: [
      { when: PRINCE, lines: ['Sleeping charms! Who wants a sleeping charm!', 'Dark-pockets! Blackout ribbons!'] },
      { lines: ['Wards! Wonders! Licensed!', 'Retort runes, fresh cut.', 'Font vials, topped up.', 'No refunds on surges.'] },
    ],
  },

  // ── Corvina Vell — the last astronomer ───────────────────────────────
  {
    id: 'arcane-corvina',
    name: 'Corvina Vell',
    title: 'Astronomer of the Academy (Ret.)',
    look: { body: 0xd8c8b8, accent: 0x262e6e, hat: 'wizard', traits: ['glasses', 'cane', 'book'], size: 0.9, eye: 0xa8c8ff },
    at: { x: 380, y: 448 },
    talks: [
      {
        when: DESPOT,
        lines: [
          'I am going to sleep tonight on the gallery of my tower. On my back. With the cap off the scope.',
          'If you are awake when it gets dark, come up. I\'ll show you Corvus. I was named after it. I\'ve missed it.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The Prince has let go of the circle, but the Heliostat still holds the sun. Mirrors are stubborn.',
          'Still. I took the cap off my telescope this morning. Just to look at the inside of the sky.',
        ],
      },
      {
        when: { questDone: Q_NIGHT },
        lines: [
          'My chart is on the wall. Tamsin comes every hour and names them all. She gets Lyra wrong. I don\'t correct her.',
          'Twenty-two years I\'ve been the last one who remembered. Now there are two of us.',
        ],
      },
      {
        when: { quest: Q_NIGHT },
        lines: [
          'Pinned to the pylons round the Anchor Circle, every piece, face up to the sun to bleach.',
          'Hurry. Starlight ink fades in the glare. It was never meant to be looked at in the day.',
        ],
      },
      {
        lines: [
          'This tower was the Academy\'s eye. We charted every star over Solmara. Then the Noon came, and stayed.',
          'Twenty-two years. The scope is capped in smoked glass so I can point it at the sun and not go blind.',
          'There\'s nothing else to point it at. You can\'t see a star in the day. You can\'t see a star ever, here.',
        ],
      },
    ],
    barks: [
      { when: { questDone: Q_NIGHT }, lines: ['That one\'s Corvus. The crow.', 'Lyra, child. LYRA.'] },
      { lines: ['Nothing to see. Nothing to see.', 'The scope wants oiling.', 'Twenty-two years of noon.'] },
    ],
  },

  // ── Tamsin Glass — the apprentice who has never seen a star ──────────
  {
    id: 'arcane-tamsin',
    name: 'Tamsin Glass',
    title: 'Apprentice Astronomer',
    look: { body: 0xe8d0b8, accent: 0x5a6ad0, hat: 'cap', traits: ['book', 'satchel'], size: 0.82, eye: 0x9ef0ff },
    at: { x: 500, y: 520 },
    wander: 30,
    talks: [
      {
        when: DESPOT,
        lines: [
          'Corvina says tonight. Tonight! I\'ve got a list of the ones I want to see. It\'s eleven pages.',
          'What if they\'re smaller than the chart? What if they\'re much smaller? I don\'t mind. I don\'t mind at all.',
        ],
      },
      {
        when: { questDone: Q_NIGHT },
        lines: [
          'I know forty-one stars by name now. I\'ve never seen one. Corvina says that\'s how astronomy always starts.',
          'That one\'s the Lantern-Bearer. That one\'s the Dog. That one\'s — Lyra? No. Don\'t tell me.',
        ],
      },
      {
        when: { quest: Q_NIGHT },
        lines: [
          'Corvina says you\'re getting her chart back. The real one. With dots on it for every star.',
          'I\'m nineteen. I\'ve read about them. I don\'t really believe in them. Is that terrible?',
        ],
      },
      {
        lines: [
          'I\'m apprenticed to the last astronomer on Solmara. I\'m learning a science nobody can do.',
          'Corvina says a star is a sun that\'s very far away. Why would anyone want two suns? We have one too many.',
          'I keep the brass bright. It\'s nearly the only job. And I write down the sun. It\'s always in the same place.',
        ],
      },
    ],
    barks: [{ lines: ['Sun: overhead. Again.', 'Is a star hot?', 'Polishing, polishing.'] }],
  },

  // ── Mother Pennyroyal — the familiar-seller ──────────────────────────
  {
    id: 'arcane-pennyroyal',
    name: 'Mother Pennyroyal',
    title: 'Familiars, Licensed',
    look: { body: 0xc8b0a0, accent: 0x4a2e86, hat: 'hood', traits: ['apron', 'cane', 'scarf'], size: 0.95, eye: 0xf6dc52 },
    at: { x: 540, y: 1192 },
    talks: [
      {
        when: DESPOT,
        lines: [
          'I\'ve put up a sign: BLACK CATS, HALF PRICE. They\'ve been the cheapest thing in the market for an hour.',
          'Then I took the sign down. I couldn\'t bear to part with them. Go on, give Sootling a scratch.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'Grimalkin\'s been in. She bought a black kitten off me. Paid in full. She said, "for the dark, when it comes."',
          'The cats know something. They\'ve all been sleeping on the north side of things.',
        ],
      },
      {
        when: { questDone: Q_CATS },
        lines: [
          'All four of them, home, and the Licenser gone off with a headache. I\'ve hidden them in the toad trough.',
          'They hate it. They\'re black, and they\'re alive, and they hate it. Bless you.',
        ],
      },
      {
        when: { quest: Q_CATS },
        lines: [
          'They\'ll be in shade. A cat always finds the one bit of shade. Under things, behind things, in the cracks.',
          'Bring them back before the Licenser counts the cages. Sootling, Ember, Inkpot and Grave.',
        ],
      },
      {
        lines: [
          'Familiars! Cats, owls, toads — every one licensed by the Academy and stamped on the ear. Gently.',
          'Not black ones. Black coats are a walking shadow, the Bureau says. They\'re to be bleached white at noon.',
          'It\'s always noon. So it\'s always about to happen. I keep my black ones at the back. Don\'t look.',
        ],
      },
    ],
    barks: [
      { when: { questDone: Q_CATS }, lines: ['Out of the trough, Grave.', 'Four black cats. All present.'] },
      { lines: ['Owls! Wise and licensed!', 'Toads, lightly used!', 'Puss puss puss.', 'Mind the cage, it bites.'] },
    ],
  },

  // ── Wren Quillfeather — the sigil-scribe ─────────────────────────────
  {
    id: 'arcane-wren',
    name: 'Wren Quillfeather',
    title: 'Sigil-Scribe, Third Year',
    look: { body: 0xe8d4c0, accent: 0x9c7a24, hat: 'beanie', traits: ['tool', 'glasses', 'apron'], size: 0.86, eye: 0xe8c050 },
    at: { x: 930, y: 1336 },
    talks: [
      {
        when: DESPOT,
        lines: [
          'I don\'t need the dark ink any more. Isn\'t that strange? I keep drawing shadows anyway. For practice.',
          'The Academy wants me to lecture on it. Me! "The Shadow-Sigil: A Third-Year\'s Accident."',
        ],
      },
      {
        when: { questDone: Q_INK },
        lines: [
          'It\'s still there, on the rim of the Anchor Circle. A shadow the size of a plate, with nothing casting it.',
          'People queue to stand in it. No ticket, no clerk, no stopwatch. Just a little bit of night, on the floor.',
        ],
      },
      {
        when: { quest: Q_INK, stage: 1 },
        lines: [
          'Is that a hex eel? A real one? Its ink is the only dark thing in the Font. I need every drop.',
          'Then I chalk the sigil backwards, at the edge of the Anchor Circle, where the beam is weakest.',
        ],
      },
      {
        when: { quest: Q_INK },
        lines: [
          'A hex eel, from the Font. You\'ll want a prism rod — the Font\'s too bright for anything else.',
          'Don\'t tell the Proctor what it\'s for. Tell him it\'s for supper. Eels are for supper. Mostly.',
        ],
      },
      {
        lines: [
          'I found something. I chalked a sigil backwards by mistake and it cast a shadow. A REAL one. For a second.',
          'The chalk wasn\'t dark enough to hold it. It needs dark ink. The only dark ink on Solmara is in a hex eel.',
          'I could be bleached for this. I could also be the first person in twenty-two years to draw a night.',
        ],
      },
    ],
    barks: [
      { when: { questDone: Q_INK }, lines: ['It\'s still there. My shadow.', 'Backwards. All along, backwards.'] },
      { lines: ['Circle, star, seal. Circle, star, seal.', 'This chalk is too white.', 'Hm. Backwards.'] },
    ],
  },

  // ── Ambrose Hale — the silenced student ──────────────────────────────
  {
    id: 'arcane-ambrose',
    name: 'Ambrose Hale',
    title: 'Student, Silenced',
    look: { body: 0xd8c0a8, accent: 0x3c4aa8, hat: 'none', traits: ['book', 'scarf'], size: 0.92, eye: 0xc8c8d8 },
    at: { x: 1540, y: 600 },
    talks: [
      {
        when: DESPOT,
        lines: [
          'I asked my question again. In the lecture dome. "What is a night?" And Lector Pell said: "Wait and see."',
          'I\'ve never been so happy to be told to wait.',
        ],
      },
      {
        when: { questDone: Q_SILENCED },
        lines: [
          'I can talk! Listen! "Night." "Night." "Night!" I\'m not even asking anything. I just like the word.',
          'The Abjurer took his ward back. He looked ashamed. I didn\'t know abjurers could look anything.',
        ],
      },
      {
        when: { quest: Q_SILENCED },
        lines: [
          '(He chalks on his slate:) THREE SEALS. ROUND MY LECTERN. NULL DREW THEM. SCUFF THEM OUT.',
          '(He underlines it twice:) PLEASE.',
        ],
      },
      {
        lines: [
          '(He is mouthing something, and nothing comes out. He picks up a slate and writes on it in chalk.)',
          '(The slate says:) I ASKED IN LECTURE WHAT A NIGHT IS. THE ABJURER WARDED MY VOICE. 9 DAYS.',
          '(He rubs it out and writes again:) THE LECTOR WILL TELL YOU. ASK HER.',
        ],
      },
    ],
    barks: [{ when: { questDone: Q_SILENCED }, lines: ['Night!', 'Ahem. Hello! Hello!'] }, { lines: ['…', '(scribbling)', '(a silent sigh)'] }],
  },

  // ── Lector Isadora Pell — the lecturer ───────────────────────────────
  {
    id: 'arcane-isadora',
    name: 'Lector Isadora Pell',
    title: 'Chair of Sigilry',
    look: { body: 0xe0d0c0, accent: 0x7a52c8, hat: 'mitre', traits: ['book', 'glasses', 'cane'], size: 1.05, eye: 0xa888f0 },
    at: { x: 1690, y: 530 },
    talks: [
      {
        when: DESPOT,
        lines: [
          'I am rewriting the syllabus. First lecture: Dusk. Second: Night. Third: Why We Were Wrong.',
          'The third one is going to take a whole term. Possibly two.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'His Highness taught me to draw my first circle. He drew it with his hand over mine. It was a kind hand.',
          'I am glad you beat him. I don\'t know what that says about me. I\'ll lecture on it later.',
        ],
      },
      {
        when: { questDone: Q_SILENCED },
        lines: [
          'Ambrose asked his question again in my lecture this morning. Nobody warded him. I answered it.',
          'Badly. I\'ve never seen a night either. But I answered.',
        ],
      },
      {
        lines: [
          'The Academy teaches the binding of light. Every circle we burn holds a mirror of the Heliostat to the sun.',
          'We are very good at it. That is the whole of the trouble. If we were bad at it, it would be dark by now.',
          'Ambrose? He asked a question. In my lecture. The Abjurer was sitting at the back. I said nothing.',
        ],
      },
    ],
    barks: [{ lines: ['Circles are never finished.', 'Mind the chalk line.', 'Lectures continually.', 'Quiet in the forecourt.'] }],
  },

  // ── Porter Grumbold Ash — the Academy porter ─────────────────────────
  {
    id: 'arcane-grumbold',
    name: 'Grumbold Ash',
    title: 'Porter of the Academy',
    look: { body: 0xc8a890, accent: 0x262e6e, hat: 'tophat', traits: ['cane', 'beard'], size: 1.2, eye: 0xd8d0c0 },
    at: { x: 2050, y: 494 },
    talks: [
      {
        when: DESPOT,
        lines: [
          'Forty years on this door, and today I locked it. Locked it! Glass, but locked. The Academy is closed for dusk.',
          'I don\'t know what you do at dusk. I think you sit down. I\'m going to sit down.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'He came out of the dome and asked me for my coat. My coat! He put it on over his head. He wanted the dark.',
          'He\'s sat under it on the steps all morning. I\'ve brought him tea. He says thank you, under the coat.',
        ],
      },
      {
        when: { courtReady: 'arcane' },
        lines: [
          'All five of the masters. The Prince has asked who you are. He has the dome cleared and his chalk out.',
          'Speak to me if you mean to go in. There are things you should know first.',
        ],
      },
      {
        lines: [
          'The Spellwrights\' Academy. Members, students and the Prince\'s business only. That\'s the rule.',
          'Prince Sigil — the Radiance of the Circle — lectures under the dome. He drew the Anchor Circle himself.',
          'You\'ll want to beat the five masters before he\'ll see you. He doesn\'t see people. He sees work.',
        ],
      },
    ],
    barks: [{ lines: ['Members only.', 'Wipe your feet. Chalk dust.', 'Lectures continually, sir.'] }],
  },

  // ── Cassius — a Clear ────────────────────────────────────────────────
  {
    id: 'arcane-cassius',
    name: 'Cassius',
    title: 'A Clear, once a Spellwright',
    look: { body: 0xf0f4f8, accent: 0xd8e4ee, hat: 'none', traits: ['book'], size: 1, eye: 0xe8fdff },
    at: { x: 1000, y: 960 },
    wander: 70,
    talks: [
      {
        when: DESPOT,
        lines: [
          'Look at my hand. Is that grey? Is that a little grey, there, at the knuckle? Tell me honestly.',
          'They say our colour comes back in the dark. I\'ve never wanted anything so much as I want a grey knuckle.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'He came and found me. The Prince. He stood in front of me a long time. Then he said he was sorry.',
          'I could see the Font through my own chest while he said it. He could too. He couldn\'t look away.',
        ],
      },
      {
        when: { quest: Q_ANCHOR },
        lines: [
          'You\'re going in to him. Then you should know: it was Sigil\'s own circle that bleached me. He drew it.',
          'I cast a darkness cantrip. A small one, to sleep under. He tried me in his dome and drew the circle round me.',
          'He didn\'t look at me once while he drew it. He looked at the chalk. Always the chalk.',
        ],
      },
      {
        lines: [
          'You can see through me. It\'s all right; everybody looks. They\'re meant to. That\'s what a Clear is for.',
          'I was a spellwright. I cast a darkness cantrip, to sleep under. Just a little dark, round my pillow.',
          'Now I walk the court so the students see what shade costs. I cast no shadow. I can\'t hide. Not even inside.',
        ],
      },
    ],
    barks: [
      { when: PRINCE, lines: ['He said he was sorry.', 'Is that grey? There?'] },
      { lines: ['(you can see the flags through him)', 'Good noon. It\'s always good noon.', 'Don\'t mind me. Look all you like.'] },
    ],
  },

  // ── Brother Saltire — the alchemist ──────────────────────────────────
  {
    id: 'arcane-saltire',
    name: 'Brother Saltire',
    title: 'Potions & Tinctures',
    look: { body: 0xd0b498, accent: 0x6ad86a, hat: 'hood', traits: ['apron', 'tool', 'glasses'], size: 1.1, eye: 0x6ad86a },
    at: { x: 1880, y: 1074 },
    talks: [
      {
        when: DESPOT,
        lines: [
          'I\'m brewing something new. It doesn\'t do anything. It\'s for drinking at dusk, sitting down, with friends.',
          'Every alchemist on the row has the same recipe. We\'re calling it "tea".',
        ],
      },
      {
        when: { questDone: Q_INK },
        lines: [
          'Wren\'s shadow-sigil! I\'ve been bottling the air out of it. It doesn\'t keep. Nothing that good keeps.',
        ],
      },
      {
        lines: [
          'Tinctures! Sleeping draughts — you can\'t sleep in the noon without one. Everyone on Solmara is a customer.',
          'This one\'s the blue. Three drops, shut your eyes, you dream it\'s dark. The Bureau licenses the dream.',
          'Not the real dark, mind. A licensed dream of a little dark. Dusk-houses have a waiting list of a month.',
        ],
      },
    ],
    barks: [{ lines: ['Sleeping draughts!', 'Blue for dreams, green for nerves.', 'Mind the alembic, it\'s hot.'] }],
  },
];

const looks: NpcLook[] = [
  { body: 0xe0c8b0, accent: 0x3c4aa8, hat: 'wizard', traits: ['book'] },
  { body: 0xd8b898, accent: 0x7a52c8, hat: 'hood', traits: ['satchel'] },
  { body: 0xe8d0b8, accent: 0x5a6ad0, hat: 'cap', traits: ['book', 'glasses'], size: 0.8 },
  { body: 0xc8a888, accent: 0x262e6e, hat: 'wizard', traits: ['cane', 'beard'], size: 1.1 },
  { body: 0xf0f4f8, accent: 0xd8e4ee, hat: 'none', traits: [] },
  { body: 0xd8c0a0, accent: 0x4a2e86, hat: 'veil', traits: ['scarf'] },
  { body: 0xe0c4a8, accent: 0xe8c050, hat: 'beanie', traits: ['tool', 'apron'] },
  { body: 0xcfb090, accent: 0xa888f0, hat: 'wizard', traits: ['pack'], size: 0.74 },
];

const barks: Talk[] = [
  {
    when: DESPOT,
    lines: [
      'There\'s a SHADOW on the Anchor Circle!',
      'I saw a cloud. A real cloud. Over the sea.',
      'Is it getting darker or am I tired?',
      'Both! Both!',
    ],
  },
  {
    when: PRINCE,
    lines: [
      'The Prince put his chalk down.',
      'The Anchor\'s flickering. Did you see?',
      'Nobody\'s lecturing. The dome\'s empty.',
      'Is the circle still holding?',
    ],
  },
  {
    when: { courtReady: 'arcane' },
    lines: ['Someone\'s beaten all five masters.', 'They say the stranger\'s going to the dome.'],
  },
  {
    lines: [
      'Mind the sigil.',
      'Squint, squint.',
      'I\'ve not slept since Thursday. It\'s always Thursday.',
      'My Dusk Ticket\'s for next month.',
      'Don\'t scuff the Anchor!',
      'Chalk in my eyes again.',
      'Is that a shadow? No. Just my foot.',
      'Lectures continually.',
    ],
  },
];

export const ARCANE_CROWD: NonNullable<AreaDef['crowd']> = {
  count: 14,
  looks,
  paths: [
    // The Sigil Road, in and out.
    [{ x: 120, y: 800 }, { x: 900, y: 800 }, { x: 1200, y: 760 }, { x: 900, y: 800 }],
    // Round the Anchor Circle.
    [{ x: 1000, y: 700 }, { x: 1200, y: 600 }, { x: 1400, y: 700 }, { x: 1200, y: 820 }],
    // Up the Anchor Road and back.
    [{ x: 1200, y: 560 }, { x: 1200, y: 130 }, { x: 1200, y: 560 }],
    // The east road to the Academy forecourt.
    [{ x: 1450, y: 700 }, { x: 1850, y: 700 }, { x: 1850, y: 500 }, { x: 1850, y: 700 }, { x: 2280, y: 700 }],
    // The familiar market.
    [{ x: 270, y: 1240 }, { x: 830, y: 1240 }, { x: 540, y: 1240 }, { x: 540, y: 860 }],
    // Round the Font plaza and down the potion row.
    [{ x: 1200, y: 960 }, { x: 1460, y: 980 }, { x: 1490, y: 1080 }, { x: 2280, y: 1080 }, { x: 1490, y: 1080 }, { x: 1460, y: 1300 }, { x: 1200, y: 1320 }, { x: 1000, y: 1320 }, { x: 1000, y: 1000 }],
    // The stargazers' lawn.
    [{ x: 560, y: 760 }, { x: 560, y: 480 }, { x: 680, y: 560 }],
  ],
  barks,
};
