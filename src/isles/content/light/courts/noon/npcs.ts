import type { AreaDef, NpcDef, NpcLook, Talk } from '../../../../IslesTypes';

/**
 * The people of the Noon Court.
 *
 * Noon is the first court up the Sun Road from Meridian Quay, so its people do the explaining:
 * what the Endless Noon is (twenty-two years of the sun pinned overhead), what Clarity means
 * (glass doors, no curtains, shutters nailed open), how a Dusk Ticket buys one hour of shade a
 * day in the Dusk-house, and what the Burning Glass does to a shade-thief (holds them in the
 * focus until they are Clear — see-through, shadowless, made to walk the streets). Everyone
 * squints. Nobody has slept lying down in years. Nobody under twenty-two has seen a star.
 */

const PRINCE = { prince: 'lumen' } as const;
const DESPOT = { monarch: 'auriel' } as const;

const Q_HOUR = 'noon-q-an-hour';
const Q_FOCUS = 'noon-q-out-of-focus';
const Q_DARK = 'noon-q-something-dark';
const Q_CURTAIN = 'noon-q-cradle-curtain';
const Q_SHADOW = 'noon-q-unshadowed';

export const NOON_NPCS: NpcDef[] = [
  // ── Ottavia Squint — the shop ────────────────────────────────────────
  {
    id: 'noon-squint',
    name: 'Ottavia Squint',
    title: 'Smoked Glass & Salves',
    look: { body: 0xe8cfb4, accent: 0xc89a3e, hat: 'none', traits: ['glasses', 'apron', 'satchel'], size: 0.95, eye: 0x50565e },
    at: { x: 820, y: 1600 },
    role: { kind: 'shop', id: 'noon-shop' },
    talks: [
      {
        when: DESPOT,
        lines: [
          'I sold my last smoked lens an hour ago and nobody wants more. They want to look at the sky. Unprotected!',
          'I\'ve started a line in candles. Can you imagine? Me. Selling the dark by the inch.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'Somebody saw the Prince\'s shadow. A real one, on the Solarium steps. I sold forty pairs of specs by noon.',
          'Well. By the next bell. Charms are on the counter, love. Mind the salve, it\'s for the sunburnt.',
        ],
      },
      {
        when: { questDone: Q_DARK },
        lines: [
          'Old Halloran came in for the darkest lens I had. Said he\'d seen a black fish and wanted to see another.',
          'I gave him my own, no charge. Man\'s eyes are older than the Noon. Somebody ought to look after them.',
        ],
      },
      {
        lines: [
          'Smoked glass, licensed. Salve for the burn. You\'ll want both if you\'re stopping on the square.',
          'The Noon\'s been up twenty-two years, love. The Despot pinned the sun overhead and it never came down.',
          'Licensed smoked glass is the only shade you\'re let carry. One lens per eye, stamped. I do the stamping.',
          'Charms on the counter — you can wear three. Light-work, all of it. Turned to your side, for once.',
        ],
      },
    ],
    barks: [
      { when: PRINCE, lines: ['Specs! Get your specs! See his shadow for yourself!', 'Sold out of the dark ones!'] },
      {
        lines: [
          'Smoked glass, licensed and stamped!', 'Salve for the burn!', 'Squint while you can, love.',
          'Mind the glare off the colossus.',
        ],
      },
    ],
  },

  // ── Honor Rise — the Sunrise Bun ─────────────────────────────────────
  {
    id: 'noon-honor',
    name: 'Honor Rise',
    title: 'The Sunrise Bun',
    look: { body: 0xe2bc96, accent: 0xe8a834, hat: 'chef', traits: ['apron'], size: 1.15, eye: 0x8a5a2a },
    at: { x: 2140, y: 1604 },
    role: { kind: 'bakery', id: 'noon-bun' },
    talks: [
      {
        when: DESPOT,
        lines: [
          'I got up before dawn this morning. BEFORE DAWN. There was a dawn to be before! I wept into the dough.',
          'Every bun I bake now is the real thing. Bring me fish and flour and I\'ll bake you a sunrise.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The Censor came to scrape my sign again and the Prince\'s man sent him away. Said it was "a nice sun".',
          'A NICE SUN. Coming up. On my own sign. Bring me your catch, I\'m in a baking mood.',
        ],
      },
      {
        lines: [
          'The Sunrise Bun! The sign\'s a sun coming up. The Censor scrapes it off once a month and I paint it back.',
          'My mother baked at dawn. Real dawn, when the sky went pink. I was nine. I bake as if it still happens.',
          'Bring me flour off Gilly\'s cart and anything out of the pool and I\'ll bake it. Pool fish rise lovely.',
        ],
      },
    ],
    barks: [
      { when: PRINCE, lines: ['Buns! Shaped like a sunrise! Legally!', 'Hot from the oven, like everything.'] },
      { lines: ['Sunrise Buns, hot!', 'Bream bloomers on the hour — any hour!', 'I remember pink. Pink, I tell you.'] },
    ],
  },

  // ── Gilly Fane — the mill cart ───────────────────────────────────────
  {
    id: 'noon-gilly',
    name: 'Gilly Fane',
    title: 'The Mill Cart',
    look: { body: 0xd8b48e, accent: 0xefe2c4, hat: 'straw', traits: ['pack'], size: 0.85 },
    at: { x: 1860, y: 1640 },
    role: { kind: 'shop', id: 'noon-mill' },
    talks: [
      {
        when: DESPOT,
        lines: [
          'The mill\'s stopped bleaching the flour. It\'s gone a sort of yellow. Honor says that\'s what flour IS.',
          'I never knew. I never knew flour had a colour. Want some? It\'s yellow!',
        ],
      },
      {
        when: PRINCE,
        lines: ['Flour, same as ever. White as the Prince. Well — white as the Prince WAS. Have you heard?'],
      },
      {
        lines: [
          'Flour off the lower terrace mill. Bleached in the open sun, by law. Everything on Solmara is.',
          'Honor buys it by the sack for the Sunrise Bun. You can too. She\'ll bake whatever you bring her with it.',
          'I\'m nineteen. I\'ve never seen a night. Honor says the stars were like flour spilt on a black table.',
        ],
      },
    ],
    barks: [{ lines: ['Flour! White flour! Whiter than the law!', 'Sacks for the Sunrise Bun!', 'Spilt on a black table, she says.'] }],
  },

  // ── Mirela Ashby — the Dusk-house queue (quest: An Hour for Wren) ────
  {
    id: 'noon-mirela',
    name: 'Mirela Ashby',
    title: 'In the Dusk-house Queue',
    look: { body: 0xd4a888, accent: 0x6c96ac, hat: 'headwrap', traits: ['satchel'], size: 1, eye: 0x6a4a3a },
    at: { x: 330, y: 1272 },
    talks: [
      {
        when: DESPOT,
        lines: [
          'The Dusk-house is shut. Nobody needs it. Gran slept all night in her own bed, under the dark. All night!',
          'She snored. She hasn\'t snored in twenty-two years. I sat up and listened to it like music.',
        ],
      },
      {
        when: PRINCE,
        lines: ['They\'ve given the Dusk-house two clerks and no stopwatch. Gran got two hours yesterday. Two!'],
      },
      {
        when: { questDone: Q_HOUR },
        lines: [
          'Gran had her hour. A whole sixty minutes in the dark. She came out and she didn\'t say anything at all.',
          'Then she said it smelt like a cellar. Then she cried. It was a good cry, she says. She\'s particular.',
        ],
      },
      {
        when: { quest: Q_HOUR },
        lines: [
          'Ask Gran — she\'s on the bench by the hatch. She saw what he did with the watch. She sees everything.',
        ],
      },
      {
        lines: [
          'Every household gets a Dusk Ticket. One hour of shade a day in there. You sleep sitting up, in rows.',
          'Gran\'s eighty-one. Her ticket was stamped "spent" this morning and she never got through the door.',
          'The Clerk says his watch says she had her hour. His watch. His watch says what he likes.',
        ],
      },
    ],
    barks: [
      { when: { questDone: Q_HOUR }, lines: ['A whole hour. A whole one.', 'Smelt like a cellar, she said.'] },
      { lines: ['Forty-one, forty-two…', 'Spent. It says spent.', 'Keep your ticket flat, Gran.'] },
    ],
  },

  // ── Granny Wren Ashby — the bench ────────────────────────────────────
  {
    id: 'noon-wren',
    name: 'Granny Wren',
    title: 'Who Remembers Night',
    look: { body: 0xe8d0bc, accent: 0x3c3850, hat: 'nightcap', traits: ['cane', 'scarf'], size: 0.85, eye: 0x6a8a9a },
    at: { x: 640, y: 1336 },
    talks: [
      {
        when: DESPOT,
        lines: [
          'I saw the stars last night. They\'re where I left them. Nobody moved them. I was so afraid somebody had.',
          'Go and lie on your back somewhere, dear. That\'s all I\'ll say. Lie on your back and look up.',
        ],
      },
      {
        when: PRINCE,
        lines: ['The Prince has a shadow, they say. Good. Every child should have one. He was a child once. I knew him.'],
      },
      {
        when: { questDone: Q_HOUR },
        lines: [
          'Sixty minutes. I counted every one. In the dark you can hear your own heart. I\'d forgotten I had one.',
          'Thank you, dear. Now go and do something reckless. I would, at your age. I did, at your age.',
        ],
      },
      {
        lines: [
          'I wear the nightcap so I remember what it\'s for. Nightcap. Night. Cap. Silly thing to wear at noon.',
          'When I was a girl the sun went DOWN. Every evening. It went red and slid into the sea. Imagine that.',
          'Now it hangs. The mirrors on the summit hold it. Twenty-two years and my eyelids still ache.',
        ],
      },
    ],
    barks: [
      { when: DESPOT, lines: ['Lie on your back, dear.', 'They\'re where I left them.'] },
      { lines: ['Red, and into the sea.', 'Silly cap. Silly old cap.', 'My eyelids ache.'] },
    ],
  },

  // ── Tam Vell — the boy at the rope (quest: Out of Focus) ─────────────
  {
    id: 'noon-tam',
    name: 'Tam Vell',
    title: 'Waiting at the Rope',
    look: { body: 0xd8b090, accent: 0x5a86d8, hat: 'cap', traits: ['scarf'], size: 0.72, eye: 0x4a3a2a },
    at: { x: 470, y: 866 },
    talks: [
      {
        when: DESPOT,
        lines: [
          'Mam and me made a tent out of a blanket on the roof and sat in it. In the DAY. Nobody came.',
          'She says the next thing is to see a star. I said I don\'t know what one is. She cried a bit.',
        ],
      },
      {
        when: PRINCE,
        lines: ['They put a sheet over the Glass. A big white sheet. Mam says it looks like a ghost. I say good.'],
      },
      {
        when: { questDone: Q_FOCUS },
        lines: [
          'Mam\'s home! She\'s home and she\'s still got all her colour. Her hair\'s still red! I told you it was red!',
          'Kindler says without the wedges the Glass only warms. He said it smiling. I think he was glad.',
        ],
      },
      {
        when: { quest: Q_FOCUS },
        lines: ['Talk to Mam first. She\'s at the rope. She knows about the Glass — she cleaned it, before.'],
      },
      {
        lines: [
          'That\'s my mam. At the rope, under the Glass. She hung a blanket over my bed so I could sleep.',
          'Somebody told. Now she has to stand in the Glass at the next bell till she goes Clear. Like them.',
          'Clear people are see-through. You can\'t hug them right. Your arms go wrong. Please, mister.',
        ],
      },
    ],
    barks: [
      { when: { questDone: Q_FOCUS }, lines: ['Her hair\'s still red!', 'Mam\'s home!'] },
      { lines: ['Don\'t look at the Glass, Mam.', 'Next bell. Next bell.', 'I\'m not crying. It\'s the glare.'] },
    ],
  },

  // ── Orla Vell — the accused ──────────────────────────────────────────
  {
    id: 'noon-orla',
    name: 'Orla Vell',
    title: 'Shade-Thief, Accused',
    look: { body: 0xe6c2a4, accent: 0xc4573e, hat: 'none', traits: ['apron'], size: 1, eye: 0x4a6a3a },
    at: { x: 480, y: 766 },
    present: { not: { questDone: Q_FOCUS } },
    talks: [
      {
        when: DESPOT,
        lines: ['The rope\'s gone. The ring\'s gone grey. I came to stand here once more, to be sure it was over.'],
      },
      {
        when: PRINCE,
        lines: ['They let us all off the rope. I keep standing here. I don\'t know where else to stand yet.'],
      },
      {
        when: { quest: Q_FOCUS },
        lines: [
          'You\'re Tam\'s stranger. Listen — I swept under that Glass for six years. I know how it\'s set.',
          'The lens hangs on two trunnions. Kindler packs brass wedges under them to tilt the focus true.',
          'Pull the wedges and it drops a hair. A hair is enough. The focus spreads. It only warms, then.',
        ],
      },
      {
        lines: [
          'Don\'t stand so near the ring, love. You\'ll brown. I hung a blanket over my boy\'s bed. That\'s all.',
          'He couldn\'t sleep. Nine years old and he\'s never slept lying down. So I hung a blanket. Shade-thief.',
        ],
      },
    ],
    barks: [{ lines: ['Next bell.', 'Tam, go home.', 'It was only a blanket.'] }],
  },

  // ── Old Halloran — the stargazer (quest: Something Dark) ─────────────
  {
    id: 'noon-halloran',
    name: 'Old Halloran',
    title: 'Astronomer, Retired',
    look: { body: 0xd8c4b0, accent: 0x3c3850, hat: 'wizard', traits: ['glasses', 'book', 'beard'], size: 1.05, eye: 0x9ec8dc },
    at: { x: 1670, y: 1142 },
    talks: [
      {
        when: DESPOT,
        lines: [
          'Orion. Over the harbour, at three in the morning, exactly where the tables said. I nearly fell off the mole.',
          'Twenty-two years of tables, kept in a drawer. Not one star out of place. They waited. Patient things.',
        ],
      },
      {
        when: PRINCE,
        lines: ['The Prince has a shadow. A shadow is a small night. Do you see? It begins. Small nights first.'],
      },
      {
        when: { questDone: Q_DARK },
        lines: [
          'I keep the gobies in a bowl on my sill. Two little dark shapes going round. I watch them for hours.',
          'Star-gazing, I call it. Don\'t laugh. It\'s the closest I have.',
        ],
      },
      {
        when: { quest: Q_DARK },
        lines: ['Glare gobies, from the pool. Two. You\'ll need a prism rod or the glare blinds the float. Go on.'],
      },
      {
        lines: [
          'I kept the observatory on the Arcane terrace. Thirty years. Then the sun stopped and the night with it.',
          'I haven\'t seen anything dark in twenty-two years. Not truly dark. Except — there, in the pool.',
          'The fish. You can\'t see them for the glare, only their shapes. Dark shapes. The last dark on Solmara.',
        ],
      },
    ],
    barks: [
      { when: { questDone: Q_DARK }, lines: ['Round and round, two dark stars.', 'Patient things.'] },
      { lines: ['There. There goes one.', 'Thirty years of tables.', 'A dark shape. A small night.'] },
    ],
  },

  // ── Linnet Hemway — the seamstress (quest: A Curtain for the Cradle) ─
  {
    id: 'noon-linnet',
    name: 'Linnet Hemway',
    title: 'Seamstress',
    look: { body: 0xe0bca0, accent: 0x8a52c4, hat: 'veil', traits: ['satchel', 'tool'], size: 0.95, eye: 0x5a3a6a },
    at: { x: 2120, y: 1182 },
    talks: [
      {
        when: DESPOT,
        lines: [
          'I\'m sewing curtains. Real ones, for the whole terrace. Velvet. I don\'t even need them now. I just CAN.',
          'Bea sleeps in the dark every night. I watch her. Don\'t tell anyone I watch her. It\'s my secret.',
        ],
      },
      {
        when: PRINCE,
        lines: ['The Draper\'s been told to give back what he took. He gave me back a thimble. Small mercies.'],
      },
      {
        when: { questDone: Q_CURTAIN },
        lines: [
          'I stitched them back together. It\'s ugly. Four colours and a patch. Bea slept six hours under it.',
          'Six hours. She woke up and she was a different baby. Pink and furious. Perfect.',
        ],
      },
      {
        when: { quest: Q_CURTAIN },
        lines: ['He pins them up on the Clarity boards as evidence. Four boards round the court. Take them down.'],
      },
      {
        lines: [
          'My Bea is four months old and she has never once slept more than an hour. Babies need the dark.',
          'I sewed a little curtain for her cradle. Scraps. Four scraps. The Draper-Confiscator found it.',
          'He cut it up and pinned the pieces on the notice boards. "Evidence." Of a baby wanting to sleep.',
        ],
      },
    ],
    barks: [
      { when: { questDone: Q_CURTAIN }, lines: ['Six hours!', 'Pink and furious.'] },
      { lines: ['Hush, Bea. Hush.', 'Four scraps. Only four.', 'Babies need the dark.'] },
    ],
  },

  // ── Candela Brisk — the Solarium steward (quest: The Unshadowed) ─────
  {
    id: 'noon-candela',
    name: 'Candela Brisk',
    title: 'Steward of the Solarium',
    look: { body: 0xe4d0bc, accent: 0xe4b032, hat: 'veil', traits: ['book', 'glasses'], size: 1, eye: 0x8ad8ff },
    at: { x: 1640, y: 452 },
    talks: [
      {
        when: DESPOT,
        lines: [
          'His Highness stood out on the steps at sunset. Sunset! He watched his shadow get long. Longer than him.',
          'He laughed. I have been his steward fourteen years and I had never heard what his laugh sounds like.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'He sits in the Solarium with the shutters closed — closed! — looking at his shadow on the floor.',
          'He asked me if it would stay. I said they usually do, Highness. He held my hand. He has never done that.',
        ],
      },
      {
        when: { courtReady: 'noon' },
        lines: ['All five. His Highness watched from the dome. He polished his prism twice. He does that when he is afraid.'],
      },
      {
        lines: [
          'The Solarium is His Highness\'s. Glass all round, so he can be seen at every hour. All hours are noon.',
          'Prince Lumen. The Unshadowed. You will have heard. Every child on the terrace knows the story.',
          'Beat the five who keep his square bright, and I will tell you the part the children don\'t know.',
        ],
      },
    ],
    barks: [
      { when: PRINCE, lines: ['Shutters closed. CLOSED.', 'It will stay, Highness.'] },
      { lines: ['Polish the panes.', 'Every pane, every hour.', 'Mind the prism, it chips.'] },
    ],
  },

  // ── Ewan Glass — a Clear ─────────────────────────────────────────────
  {
    id: 'noon-ewan',
    name: 'Ewan Glass',
    title: 'A Clear',
    look: { body: 0xd6ecf6, accent: 0x9ec8dc, hat: 'none', traits: ['book'], size: 1, eye: 0x9ec8dc },
    at: { x: 1000, y: 980 },
    wander: 130,
    talks: [
      {
        when: DESPOT,
        lines: [
          'I stood in the dark last night. All night. Look — look at my hands. There\'s colour coming back. Pink.',
          'Only at the fingertips. It will take years. I have years. For the first time I have years.',
        ],
      },
      {
        when: PRINCE,
        lines: ['He came and stood beside me today. He has a shadow now. He tried to put it over me. To share it.'],
      },
      {
        when: { quest: Q_SHADOW, stage: 1 },
        lines: ['Go and stand in the ring, then. Where he stood. You\'ll understand him better after. I did.'],
      },
      {
        lines: [
          'Don\'t worry. Everyone looks. You can see the colossus through my chest. I\'m told it\'s very striking.',
          'I was the Prince\'s tutor. I taught him that stars are suns, only far off. Somebody heard. A shade-lesson.',
          'Clears don\'t cast shadows. We walk the square so you see what happens. So — you\'ve seen. Go well.',
        ],
      },
    ],
    barks: [
      { when: DESPOT, lines: ['Pink. At the fingertips.', 'I have years.'] },
      { lines: ['Look through me, it\'s allowed.', 'Stars are suns, far off.', 'No shadow. No shadow at all.'] },
    ],
  },
];

// ── The crowd ────────────────────────────────────────────────────────

const looks: NpcLook[] = [
  { body: 0xe4c8ac, accent: 0xefe2c4, hat: 'straw', traits: ['satchel'] },
  { body: 0xd4a888, accent: 0xc4573e, hat: 'headwrap', traits: ['apron'] },
  { body: 0xc49a7c, accent: 0x6c96ac, hat: 'cap', traits: ['glasses'] },
  { body: 0xdcbca0, accent: 0xe8a834, hat: 'none', traits: ['scarf'], size: 0.76 },
  { body: 0xb8906e, accent: 0x34323a, hat: 'tophat', traits: ['cane'], size: 1.1 },
  { body: 0xe8d0b6, accent: 0xe4b032, hat: 'veil', traits: ['book'] },
  { body: 0xd6ecf6, accent: 0x9ec8dc, hat: 'none', traits: [], size: 1 },
  { body: 0xcfa585, accent: 0x8fb8cc, hat: 'beret', traits: ['glasses', 'pack'] },
];

const barks: Talk[] = [
  {
    when: DESPOT,
    lines: [
      'I saw a star! A real one!',
      'The sun went DOWN. Down!',
      'I slept. Lying down. In the dark.',
      'My shadow\'s as long as a cart!',
    ],
  },
  {
    when: PRINCE,
    lines: [
      'The Prince has a shadow!',
      'They\'ve sheeted the Glass.',
      'Nobody\'s on the rope today.',
      'Is it still noon? It\'s still noon.',
    ],
  },
  {
    when: { courtReady: 'noon' },
    lines: ['Someone beat all five of his officers.', 'The stranger\'s going up to the Solarium.'],
  },
  {
    lines: [
      'Squint. Everyone squints.',
      'My ticket\'s for the third hour.',
      'Don\'t stand in your own shade.',
      'The bell. Hold still for the bell.',
      'Is that a cloud? No. It\'s never a cloud.',
      'Shutters open, by law.',
      'I haven\'t slept lying down since I was six.',
      'Mind the Glass.',
    ],
  },
];

export const NOON_CROWD: NonNullable<AreaDef['crowd']> = {
  count: 15,
  looks,
  paths: [
    // Up and down the Sun Road.
    [{ x: 1200, y: 1600 }, { x: 1200, y: 1180 }, { x: 1200, y: 520 }, { x: 1200, y: 1180 }],
    // Along the Meridian Line, both ways.
    [{ x: 90, y: 850 }, { x: 760, y: 850 }, { x: 1640, y: 850 }, { x: 2310, y: 850 }],
    [{ x: 2310, y: 850 }, { x: 1640, y: 850 }, { x: 760, y: 850 }, { x: 90, y: 850 }],
    // Round the plaza, past the four sundials.
    [{ x: 960, y: 620 }, { x: 1440, y: 620 }, { x: 1560, y: 860 }, { x: 1440, y: 1100 }, { x: 960, y: 1100 }, { x: 840, y: 860 }],
    // Down to the Dusk-house queue and back.
    [{ x: 760, y: 900 }, { x: 640, y: 1160 }, { x: 320, y: 1290 }, { x: 640, y: 1160 }],
    // The south terraces: shop, waystone, belfry, bakery.
    [{ x: 700, y: 1640 }, { x: 1100, y: 1560 }, { x: 1560, y: 1600 }, { x: 1960, y: 1640 }, { x: 1560, y: 1600 }, { x: 1100, y: 1560 }],
    // Up to the Solarium forecourt to gawp.
    [{ x: 1300, y: 600 }, { x: 1600, y: 470 }, { x: 2050, y: 470 }, { x: 1600, y: 470 }],
  ],
  barks,
};
