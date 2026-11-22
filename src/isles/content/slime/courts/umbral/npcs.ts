import type { AreaDef, NpcDef, NpcLook, Talk } from '../../../../IslesTypes';

/**
 * The people of the Umbral Court.
 *
 * Umbral is the dark court: nobody here has seen the sun, and the Prince has made the dark a law.
 * The lamps burn black by order; a yellow flame is contraband, like a Draught not from the
 * Matriarch's hand, and the informers who sit in the dark are paid in extra doses. The Moult-Tithe
 * here is shadow-cloth, woven from people's own shadows on the looms — and the passed-over, going
 * grey, cast thinner shadows every month, so a greying household falls short of its cloth, and is
 * passed over again. People talk quietly here, and they always know where the nearest lamp is.
 */

const PRINCE = { prince: 'dusk' } as const;
const MATRIARCH = { monarch: 'nyxa' } as const;

export const Q_CANDLE = 'umbral-q-candle';
export const Q_SHADOW = 'umbral-q-runaway-shadow';
export const Q_GREY = 'umbral-q-bitter-liver';
export const Q_TITHE = 'umbral-q-short-of-cloth';
export const Q_LANTERN = 'umbral-q-lantern';

export const UMBRAL_NPCS: NpcDef[] = [
  // ── Mother Velvet — the shop ─────────────────────────────────────────
  {
    id: 'umbral-velvet',
    name: 'Mother Velvet',
    title: 'The Unlit Window',
    look: { body: 0xc8b8c8, accent: 0x2a1a3a, hat: 'cowl', traits: ['satchel', 'glasses'], size: 1.05, eye: 0xb0a0e8 },
    at: { x: 860, y: 1046 },
    role: { kind: 'shop', id: 'umbral-shop' },
    talks: [
      {
        when: MATRIARCH,
        lines: [
          'The Draught House is open and nobody is queuing. They say there is a cure. A CURE, dear.',
          'I have put a candle in my window. In the window! I keep going outside to look at it.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'His Highness lit a lamp. A yellow one, in the Bole\'s door. People have stood before it for hours.',
          'Just standing. Looking at their own hands. Charms are where they always were, dear.',
        ],
      },
      {
        when: { questDone: Q_TITHE },
        lines: [
          'Sable\'s yard made its cloth. Grim went away empty-handed. I sold him a scarf on his way out. Cold man.',
        ],
      },
      {
        lines: [
          'The Unlit Window, dear. I sell what a body needs in the dark. Come in. Mind the step; there\'s no light.',
          'You\'re new. You look up when you walk in here. Everyone new does. There\'s nothing up there. Leaves.',
          'Charms on the shelf by feel — you can wear three. A hook, a pin, a locket, a ring. All of them work blind.',
        ],
      },
    ],
    barks: [
      { when: PRINCE, lines: ['A lamp! A yellow lamp!', 'Charms, dear. In the light, now.'] },
      { lines: ['Charms by feel.', 'Mind the step, dear.', 'Something for the dark?', 'Hush. Somebody\'s listening.'] },
    ],
  },

  // ── Lampwarden Oriel Snuff ───────────────────────────────────────────
  {
    id: 'umbral-oriel',
    name: 'Oriel Snuff',
    title: 'Lampwarden of the Dimming Road',
    look: { body: 0xb4a49a, accent: 0x2e2a30, hat: 'tophat', traits: ['lantern', 'tool', 'beard'], size: 1.1, eye: 0x9a90b0 },
    at: { x: 430, y: 870 },
    wander: 50,
    talks: [
      {
        when: MATRIARCH,
        lines: [
          'I have taken the black wicks out of every lamp on the road. Forty years I trimmed them. Forty.',
          'Tonight they\'ll burn yellow. Tomorrow too. I\'ve had a cart of tallow sent from Stilthaven. A CART.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'He sent for me. For the first time since he was small. He asked me to light the nursery lamp.',
          'I still had the wick. Yellow. I\'d kept it in my coat all these years. I don\'t know why.',
        ],
      },
      {
        when: { quest: Q_LANTERN, stage: 1 },
        lines: [
          'Go and stand on the dial, then. At the top, where the full moon is. He used to wait there for morning.',
        ],
      },
      {
        lines: [
          'Lampblack, stranger. Pressed from the black oil of the mire. It burns, and it throws dark instead of light.',
          'Every lamp on the Dimming Road is mine to keep black. A yellow flame signals the informers. So they say.',
          'Mind your shadow under my lamps. It goes the wrong way here. Toward them, not away.',
        ],
      },
    ],
    barks: [
      { when: PRINCE, lines: ['Yellow wicks, all of them.', 'Light, on the Dimming Road.'] },
      { lines: ['Lampblack and trim.', 'Black and steady.', 'Another lamp, another dark.', 'Mind your shadow.'] },
    ],
  },

  // ── Ember Hush — the candle-maker ────────────────────────────────────
  {
    id: 'umbral-ember',
    name: 'Ember Hush',
    title: 'A Woman with Warm Hands',
    look: { body: 0xe0c0a0, accent: 0x6a3a1a, hat: 'hood', traits: ['apron', 'satchel'], size: 0.95, eye: 0xffd27a },
    at: { x: 2250, y: 1440 },
    talks: [
      {
        when: MATRIARCH,
        lines: [
          'I\'m making candles in the street. In the STREET. A child came and watched me dip them. Nobody stopped her.',
          'I\'ve got so many orders I\'ve run out of tallow. That\'s a sentence I never thought I\'d say out loud.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'A yellow lamp in the Bole\'s door. Do you know what I\'d have got for that last month? The grey cart.',
          'I\'m going to make him a candle. A good one. Beeswax. He can have it for nothing.',
        ],
      },
      {
        when: { questDone: Q_CANDLE },
        lines: [
          'Little Wick slept through. First time in his life. His mother came and kissed my hands. My HANDS.',
          'Dimm\'s still sniffing round the mere. Let him sniff. Tallow smells like soup if you\'re careful.',
        ],
      },
      {
        when: { quest: Q_CANDLE },
        lines: [
          'Four stubs. I hid them where the lampwardens never look: by the houses that are already grey.',
          'Then take the light to the boy at the dial. Shade it with your hand. Somebody always sees.',
        ],
      },
      {
        lines: [
          '(she snaps a shutter closed) Who\'s that? Oh. A stranger. You don\'t smell like an informer.',
          'You can smell it, you know. The extra dose. Bitter almonds, on the breath.',
          'I make candles. Real ones. Yellow. It\'s contraband here, same as a Draught not from Her hand.',
        ],
      },
    ],
    barks: [
      { when: PRINCE, lines: ['Candles! Real ones!', 'Light for nothing!'] },
      { lines: ['(hums, very quietly)', 'Was that a knock?', 'Warm hands, cold court.'] },
    ],
  },

  // ── Wick Tarrow — the boy afraid of the dark ─────────────────────────
  {
    id: 'umbral-wick',
    name: 'Wick Tarrow',
    title: 'Afraid of the Dark',
    look: { body: 0xd8c4b4, accent: 0x4a3a6a, hat: 'beanie', traits: ['scarf'], size: 0.72, eye: 0xc8d8ff },
    at: { x: 1320, y: 1010 },
    talks: [
      {
        when: MATRIARCH,
        lines: [
          'My shadow and me play a game now. I put the candle down and it has to stay where it is. It\'s rubbish at it.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The Prince was scared of the dark when he was little. Oriel told me. He\'s grown-up and he still is!',
          'I\'m not any more. I\'ve got a candle and a shadow that\'s been sewn on twice.',
        ],
      },
      {
        when: { questDone: Q_SHADOW },
        lines: [
          'It\'s sewn on! Look — it does what I do now. Mostly. It\'s a bit slow on the left foot.',
        ],
      },
      {
        when: { quest: Q_SHADOW },
        lines: [
          'It went off bits at a time. It snagged on things. Bring the bits to Sable at the looms — she sews shadows.',
        ],
      },
      {
        when: { questDone: Q_CANDLE },
        lines: [
          'I had a candle! For one whole night! And then — then my SHADOW saw it, and it got up and walked off.',
          'Mum says shadows here do that if they see real light. They don\'t know what it is. They get scared.',
        ],
      },
      {
        lines: [
          'I\'m not scared. I\'m just stood by the dial because it\'s got the moons on it. They\'re nearly light.',
          'Mum asked the candle lady for a candle. You\'re not supposed to. The snuffers come.',
        ],
      },
    ],
    barks: [
      { when: { questDone: Q_SHADOW }, lines: ['Copy me! Copy me!', 'Slow on the left foot.'] },
      { lines: ['I\'m not scared.', 'The moons are nearly light.', 'Was that my shadow?'] },
    ],
  },

  // ── Sable Thrum — the shadow-weaver ──────────────────────────────────
  {
    id: 'umbral-sable',
    name: 'Sable Thrum',
    title: 'Mistress of the Looms',
    look: { body: 0xc8b4a4, accent: 0x0e0a14, hat: 'veil', traits: ['tool', 'apron'], size: 1.05, eye: 0xb0a0e8 },
    at: { x: 540, y: 1300 },
    talks: [
      {
        when: MATRIARCH,
        lines: [
          'We\'re weaving for ourselves. Shadow-cloth makes the warmest coat on the isle. Did you know? Nobody here did.',
          'Forty years of Tithe and not one of us owned a scrap of it. I\'m making my granddaughter a cloak.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'No collection this moon. The Prince sent word: the cloth stays with the weavers. I sat down on the floor.',
        ],
      },
      {
        when: { questDone: Q_TITHE },
        lines: [
          'Grim walked out of my yard with nothing. NOTHING. The looms sang all night after.',
          'We\'ll be short again next moon. But this moon we\'re not, and that\'s a month.',
        ],
      },
      {
        when: { quest: Q_TITHE },
        lines: [
          'Three bolts, hidden round the yard. Move them where his shade can\'t reach, and he\'ll come for us. Then you.',
        ],
      },
      {
        lines: [
          'Shadow-cloth. Woven from shadows — yours, mine, anyone\'s. You stand by the loom and it draws a little off.',
          'It grows back. Mostly. Unless you\'re going grey. The grey cast thin shadows. Thin shadows make thin cloth.',
          'So a grey house falls short of its Tithe, and gets passed over again, and goes greyer. That\'s the wheel.',
        ],
      },
    ],
    barks: [
      { when: PRINCE, lines: ['The cloth stays!', 'Warp for ourselves now.'] },
      { lines: ['Hold still, I\'m drawing a thread.', 'Thin this moon. Thin.', 'Mind the warp.', 'Shuttle\'s coming through.'] },
    ],
  },

  // ── Perrin Gloam — the fisher ────────────────────────────────────────
  {
    id: 'umbral-perrin',
    name: 'Perrin Gloam',
    title: 'Fisher on the Shadow Mere',
    look: { body: 0xb0a49a, accent: 0x2a2048, hat: 'souwester', traits: ['rod', 'pipe'], size: 1.15, eye: 0x9a90b0 },
    at: { x: 1550, y: 1250 },
    talks: [
      {
        when: MATRIARCH,
        lines: [
          'Hesper\'s hands are pink again. Pink! She keeps holding them up in front of my face. I keep crying.',
          'Fish are biting like they know. Take a rod. Take two.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'They\'re saying the Draught House will dose everybody at the new moon. Everybody. Even the grey.',
        ],
      },
      {
        when: { questDone: Q_GREY },
        lines: [
          'The pike liver\'s holding it. Her fingertips are no greyer than last week. That\'s all I ask of a week now.',
        ],
      },
      {
        when: { quest: Q_GREY },
        lines: [
          'An umbra pike. Long, black, mean. Antivenin rod — blackwater eats an ordinary line. Then to Hesper.',
        ],
      },
      {
        lines: [
          'Blackwater. Nothing in it casts a shadow, so you fish by feel. You\'ll need an antivenin rod for it.',
          'Shade perch near the bank. Pike further out. And the eclipse eel, which bites only in the dark of the dark.',
          'My Hesper\'s going grey. We were late with the cloth. They passed us over. Twice now.',
        ],
      },
    ],
    barks: [
      { lines: ['Feel for it.', 'Nothing casts a shadow out there.', 'Pike\'s turning.'] },
    ],
  },

  // ── Hesper Gloam — going grey ────────────────────────────────────────
  {
    id: 'umbral-hesper',
    name: 'Hesper Gloam',
    title: 'Passed Over',
    look: { body: 0x9a9aa4, accent: 0x5a5468, hat: 'hood', traits: ['bandage', 'cane'], size: 0.9, eye: 0xd8d0e0 },
    at: { x: 1950, y: 1530 },
    talks: [
      {
        when: MATRIARCH,
        lines: [
          'Look. LOOK. (she holds up her hands) Pink to the nails. I wiggle them all day. Perrin\'s sick of it.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'They say the grey cart isn\'t going this moon. That\'s the first new moon I\'ve not dreaded since spring.',
        ],
      },
      {
        when: { questDone: Q_GREY },
        lines: [
          'Bitter as sin, that liver. I\'d eat a bucket. My fingertips stopped going. They just stopped.',
        ],
      },
      {
        lines: [
          'Don\'t mind the bandages. It starts in the fingertips, the grey. Cold. Like holding snow you can\'t put down.',
          'We were three days late with the cloth. Three days. They passed us over. Then again for being short.',
          'The grey cart comes for you at the new moon, when it\'s up past your wrists. I\'ve got a while yet.',
        ],
      },
    ],
    barks: [
      { lines: ['Cold. So cold.', 'Up to the knuckle now.', 'Perrin? Is that you?'] },
    ],
  },

  // ── Steward Vesper Lull ──────────────────────────────────────────────
  {
    id: 'umbral-vesper',
    name: 'Vesper Lull',
    title: 'Steward of the Bole',
    look: { body: 0xc0b4cc, accent: 0x1a1230, hat: 'cowl', traits: ['book', 'cane'], size: 1, eye: 0xb0a0e8 },
    at: { x: 1860, y: 640 },
    talks: [
      {
        when: MATRIARCH,
        lines: [
          'His Highness has had the Bole\'s shutters taken off. All of them. He sits in the gallery, watching the lamps.',
          'He says the dark was never his. It was his mother\'s, lent. He has given it back.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'He asked for a yellow lamp in the door. I had to send to Stilthaven. Nobody here would admit to owning one.',
          'And then three people came to the door with one each. Shaking. I took them all.',
        ],
      },
      {
        when: { courtReady: 'umbral' },
        lines: [
          'All five. He heard every fight from the gallery. He asked me whether you carry a light.',
        ],
      },
      {
        lines: [
          'The Bole receives in the dark. Petitioners will not bring a light. I take names at the door.',
          'His Highness hears the court\'s keepers have their hands full with a stranger. He finds it… interesting.',
          'When all five have stood aside, I will take your name to him. He will see you. In a manner of speaking.',
        ],
      },
    ],
    barks: [
      { when: PRINCE, lines: ['A lamp in the door, by order.', 'He is in the gallery.'] },
      { lines: ['No lights past the step.', 'Names at the door.', 'The Prince is listening.'] },
    ],
  },
];

const looks: NpcLook[] = [
  { body: 0xc4b4a8, accent: 0x2a1a3a, hat: 'cowl', traits: ['satchel'] },
  { body: 0xd0c0b4, accent: 0x0e0a14, hat: 'veil', traits: ['apron'] },
  { body: 0xb4a49a, accent: 0x4a3a6a, hat: 'hood', traits: ['scarf'] },
  { body: 0xc8bcb0, accent: 0x2e2a30, hat: 'tophat', traits: ['lantern'], size: 1.1 },
  { body: 0x9a9aa4, accent: 0x5a5468, hat: 'hood', traits: ['bandage', 'cane'], size: 0.92 },
  { body: 0xd8c8bc, accent: 0x3a2a4a, hat: 'beanie', traits: ['pack'], size: 0.74 },
  { body: 0xb8a898, accent: 0x1a1230, hat: 'cowl', traits: ['mask'] },
  { body: 0xc0b0a4, accent: 0x6a3a9a, hat: 'plague', traits: ['satchel', 'tool'] },
];

const barks: Talk[] = [
  {
    when: MATRIARCH,
    lines: [
      'The Draught House is giving it away!',
      'My hands are warm.',
      'Light the lamps! All of them!',
      'I burnt the ration board.',
    ],
  },
  {
    when: PRINCE,
    lines: [
      'There\'s a yellow lamp at the Bole!',
      'No collection this moon.',
      'Is it allowed? The light?',
      'I can see my own feet.',
    ],
  },
  {
    when: { courtReady: 'umbral' },
    lines: [
      'All five of them. All five.',
      'The stranger\'s going to the Bole.',
    ],
  },
  {
    lines: [
      'Hush.',
      'New moon in six days.',
      'Who\'s that behind you?',
      'Was that your shadow or mine?',
      'Thin cloth this moon.',
      'Don\'t look at the lamps.',
      'Bitter almonds. Informer.',
      'The Gloams are going grey.',
    ],
  },
];

export const UMBRAL_CROWD: NonNullable<AreaDef['crowd']> = {
  count: 13,
  looks,
  paths: [
    // Along the Dimming Road.
    [{ x: 120, y: 800 }, { x: 600, y: 810 }, { x: 960, y: 830 }, { x: 600, y: 810 }],
    // Round the night-dial.
    [{ x: 900, y: 860 }, { x: 1180, y: 1000 }, { x: 1460, y: 860 }, { x: 1180, y: 720 }],
    // The queue at the Draught House.
    [{ x: 580, y: 600 }, { x: 680, y: 600 }, { x: 760, y: 700 }, { x: 680, y: 600 }],
    // Up and down the Cloak road.
    [{ x: 1200, y: 120 }, { x: 1200, y: 420 }, { x: 1200, y: 640 }, { x: 1200, y: 420 }],
    // East to the Bole and back.
    [{ x: 1400, y: 860 }, { x: 1600, y: 780 }, { x: 1860, y: 660 }, { x: 1600, y: 780 }],
    // Through the weavers' yard.
    [{ x: 1000, y: 980 }, { x: 860, y: 1110 }, { x: 680, y: 1300 }, { x: 420, y: 1300 }, { x: 680, y: 1300 }],
    // Down to the mere.
    [{ x: 1300, y: 960 }, { x: 1440, y: 1060 }, { x: 1540, y: 1320 }, { x: 1560, y: 1460 }, { x: 1540, y: 1320 }],
  ],
  barks,
};
