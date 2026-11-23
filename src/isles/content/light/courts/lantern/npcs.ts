import type { AreaDef, NpcDef, NpcLook, Talk } from '../../../../IslesTypes';

/**
 * The people of the Lantern Court.
 *
 * Down in the gorge everyone works for the dead. When somebody on Solmara is dying, a *Catcher* sits
 * by them with an open lantern and shuts it on their last breath; the lantern is brought here, tagged,
 * and hung on one of the fourteen wires, where it glows pale blue for ever — by order of Prince Wisp,
 * because no soul may lie in the dark. Lantern-makers build them, chandlers sell the wax, wick-keepers
 * climb ladders all day trimming them, and families pay for the wax or the wick gutters and the soul
 * escapes as a wailing wisp ("lost to the dark") — and the family is fined. The bereaved mourn in a
 * house whose shutters are nailed open. Nobody here has slept in the dark in twenty-two years, and
 * the living talk about their dead as if they were neighbours across the wire.
 */

const PRINCE = { prince: 'wisp' } as const;
const DESPOT = { monarch: 'auriel' } as const;

const Q_WIRE = 'lantern-q-wire-nine';
const Q_BOAT = 'lantern-q-empty-boat';
const Q_SHUTTERS = 'lantern-q-nailed-open';
const Q_ARREARS = 'lantern-q-arrears';
const Q_NICHE = 'lantern-q-lowest-niche';

export const LANTERN_NPCS: NpcDef[] = [
  // ── Wenna Lamplugh — the shop ────────────────────────────────────────
  {
    id: 'lantern-wenna',
    name: 'Wenna Lamplugh',
    title: 'Lanterns & Wicks',
    look: { body: 0xe2c8ac, accent: 0x6a9fd8, hat: 'candle', traits: ['apron', 'glasses', 'tool'], size: 1.05, eye: 0x9fd8ff },
    at: { x: 1900, y: 760 },
    role: { kind: 'shop', id: 'lantern-shop' },
    talks: [
      {
        when: DESPOT,
        lines: [
          'Nobody\'s ordered a lantern in a week. They\'re ordering shutters. SHUTTERS. I\'ve had to learn hinges.',
          'The charms are still on the shelf. I make them from the old frames now. Frames that held nobody.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The Prince opened a lantern on the Columbarium steps and just… let it go. In front of everyone.',
          'I\'ve sold nothing since but empty ones. People want to hold them. I don\'t ask why.',
        ],
      },
      {
        when: { questDone: Q_WIRE },
        lines: [
          'Hesper\'s Aldo is on Wire Two now, over the lake. She sits under him with her knitting. It\'s lovely.',
          'The Registrar\'s furious. I sold him a lantern for his own office. He hasn\'t noticed the irony.',
        ],
      },
      {
        lines: [
          'Lanterns, wicks, panes, shades. Every lantern on every wire in this gorge came off a bench on this row.',
          'When someone\'s going, the Catcher sits with them holding one open. Last breath — snap. Then it comes here.',
          'We tag it, the binders hang it, and it glows. For ever. Wax permitting. That\'s the Prince\'s law.',
          'Charms are on the top shelf — wear three. They\'re lantern-work. They\'ll hold something for you too.',
        ],
      },
    ],
    barks: [
      { when: PRINCE, lines: ['Empty lanterns! Nobody in them!', 'Shutters, by the yard!'] },
      {
        lines: [
          'Panes, frames, shades and wicks!', 'Mind the drying shades, love.', 'A Catcher\'s lantern? Half price this week.',
          'Charms on the top shelf.',
        ],
      },
    ],
  },

  // ── Old Tobias Wick — the wick-keeper on his ladder ──────────────────
  {
    id: 'lantern-tobias',
    name: 'Tobias Wick',
    title: 'Wick-Keeper, Forty Years',
    look: { body: 0xcfae8e, accent: 0x5a4430, hat: 'candle', traits: ['beard', 'tool', 'pack'], size: 0.95, eye: 0xf0d68a },
    at: { x: 1385, y: 610 },
    talks: [
      {
        when: DESPOT,
        lines: [
          'I climbed up last night — NIGHT, mind — and every lantern on Wire Six was looking up. At the stars.',
          'I left the little doors open. Forty years I kept them in. You let a thing see the stars, you let it go.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'Wisp came down to the square and asked me to teach him to trim a wick. Him! I taught him when he was six.',
          'He\'s forgotten how. He kept looking at the flame like he\'d never seen one go out on its own.',
        ],
      },
      {
        when: { questDone: Q_ARREARS },
        lines: [
          'Pellam\'s mother burns on Wire Three, steady as you like. I trim her myself now. No charge. Don\'t tell Snuff.',
          'Snuff still lets the debtors\' wicks go, mind. Just not that one. One\'s a start.',
        ],
      },
      {
        when: { quest: Q_WIRE },
        lines: [
          'Wrong wire, is he? Happens. The tags fall off in the heat and the Registrar guesses.',
          'I\'ll move him if the Registrar signs a transfer. He never signs anything. Bring him round, gently.',
        ],
      },
      {
        lines: [
          'Forty years up this ladder. Trim the wick, wipe the glass, top the wax. Eight hundred lanterns a day.',
          'You let a wick go, the soul gets out. Wails something awful and goes looking for anyone warm.',
          'That\'s "lost to the dark", they call it. Funny name. There isn\'t any dark. Not on this island.',
        ],
      },
    ],
    barks: [
      { when: PRINCE, lines: ['He asked me how to trim a wick!', 'Doors open on Wire Six.'] },
      { lines: ['Trim, wipe, top.', 'Mind below!', 'Eight hundred a day.', 'That one\'s guttering. Hold on, love.'] },
    ],
  },

  // ── Hesper Vane — her husband hung on the wrong wire ─────────────────
  {
    id: 'lantern-hesper',
    name: 'Hesper Vane',
    title: 'Widow, Under Wire Nine',
    look: { body: 0xe6ccb2, accent: 0xf4f1ea, hat: 'veil', traits: ['scarf', 'satchel'], size: 0.92, eye: 0xa8c8e0 },
    at: { x: 1480, y: 1440 },
    talks: [
      {
        when: DESPOT,
        lines: [
          'It got dark last night and Aldo\'s lantern was the brightest thing over the lake. I knew him at once.',
          'Thirty-one years married. He always did like to be seen. Now he can see the stars as well.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'They say the Prince is opening the lanterns. Letting them go. I don\'t know if I\'m ready to let Aldo go.',
          'I\'ll sit under him a while longer first. He won\'t mind. He was always patient.',
        ],
      },
      {
        when: { questDone: Q_WIRE },
        lines: [
          'He\'s on Wire Two now. Over the lake, where he asked me to marry him. In a paper boat, the great fool.',
          'I can sit on the shore and knit and look up. You\'ve no idea. Or perhaps you have. Thank you.',
        ],
      },
      {
        when: { quest: Q_WIRE },
        lines: [
          'His tag will have fallen. They do in the heat. Look along the south walk — brass, about so big.',
          'Bring them to Tobias. He knows which lantern is whose by the way they flicker. Don\'t ask me how.',
        ],
      },
      {
        lines: [
          'That\'s supposed to be my Aldo on Wire Nine. Third from the bottom. Only it isn\'t him. I\'d know.',
          'He flickered left when he laughed. That one flickers right. Some stranger\'s in my husband\'s place.',
          'And somewhere my husband is hanging among strangers. He hated strangers. He\'d hate that.',
        ],
      },
    ],
    barks: [
      { when: { questDone: Q_WIRE }, lines: ['Over the lake, where he asked me.', 'Wire Two. My Aldo.'] },
      { lines: ['That isn\'t him.', 'He flickered left.', 'Somewhere among strangers.'] },
    ],
  },

  // ── Isolde Ashcombe — the Mourning House ─────────────────────────────
  {
    id: 'lantern-isolde',
    name: 'Isolde Ashcombe',
    title: 'Sitting Up, the Mourning House',
    look: { body: 0xdcc0a4, accent: 0xf4f1ea, hat: 'veil', traits: ['book', 'scarf'], size: 1, eye: 0x7a9ab8 },
    at: { x: 1660, y: 1352 },
    talks: [
      {
        when: DESPOT,
        lines: [
          'The sun went down and the whole Mourning House wept at once. Twenty-two years of it, all at once.',
          'Then we slept. In the dark. On the floor, in our crepe, like children. I dreamed of my boy.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The Prince\'s men came and took the nails out of every shutter. Quietly. They didn\'t say anything.',
          'Nobody\'s closed one yet. We\'re all too frightened. But we know we can. That\'s nearly enough.',
        ],
      },
      {
        when: { questDone: Q_SHUTTERS },
        lines: [
          'One minute of dark. I said goodbye to Tam in the old words, and the old words need the dark. They do.',
          'The Inspector will come back with new nails. Let him. I\'ve had my minute. Nobody can unsay it.',
        ],
      },
      {
        when: { quest: Q_SHUTTERS },
        lines: [
          'Four nails hold the shutters on the end window. Prise them out. Mind your fingers, they\'re hot.',
          'Then come back and I\'ll close them. Just for a minute. Just long enough to say it.',
        ],
      },
      {
        lines: [
          'My son\'s lantern went up on Wire Twelve a month ago. Tam. He was nineteen. He fell from the Heliostat.',
          'The old rite says you sit with them one night in the dark, and say the parting in the dark. Only then.',
          'But the shutters are nailed open. Grief must be seen, the Office of Clarity says. I\'ve not said it.',
        ],
      },
    ],
    barks: [
      { when: { questDone: Q_SHUTTERS }, lines: ['I said it. In the dark.', 'One minute. Nobody can unsay it.'] },
      { lines: ['Sitting up.', 'Not said it yet.', 'Tam. Wire Twelve.', 'Grief must be seen, they say.'] },
    ],
  },

  // ── Nell Bobbin — folds the paper boats ──────────────────────────────
  {
    id: 'lantern-nell',
    name: 'Nell Bobbin',
    title: 'Boat-Folder, the Landing',
    look: { body: 0xecd2b8, accent: 0xd8505e, hat: 'none', traits: ['satchel', 'book'], size: 0.74, eye: 0x9fd8ff },
    at: { x: 1000, y: 700 },
    talks: [
      {
        when: DESPOT,
        lines: [
          'I put a boat out on the lake last night with nothing in it but a candle. A real one. Yellow!',
          'It went all the way across and I could see it the whole time because it was DARK. Best thing ever.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The Lake-Warden\'s stopped counting the boats. He sat on the landing and helped me fold. Badly.',
          'His boats sink. I didn\'t tell him. He looked so pleased.',
        ],
      },
      {
        when: { questDone: Q_BOAT },
        lines: [
          'Granny\'s wick-bead went down with the carp. Right to the bottom, where it\'s dark. She can rest now.',
          'Probably. That\'s what the old folk say. I\'m choosing to believe them. You should too.',
        ],
      },
      {
        when: { quest: Q_BOAT },
        lines: [
          'A soul carp! Big pale one, with a light in its tummy. Cast off the kerb — you\'ll need a fortune rod.',
          'Or a prism one. They\'re fussy, soul carp. They only bite at things that shine.',
        ],
      },
      {
        lines: [
          'I fold the boats. Two hundred a day. A lantern goes in each and the boat takes it across to the Columbarium.',
          'Granny said soul carp swallow the light that drips off the lanterns and carry it to the bottom, to the dark.',
          'She said down there the drips can rest. Granny\'s on Wire Four. I kept her wick-bead. Look. It still glows.',
        ],
      },
    ],
    barks: [
      { when: { questDone: Q_BOAT }, lines: ['Right to the bottom!', 'She can rest now. Probably.'] },
      { lines: ['Fold, crease, fold.', 'Two hundred a day.', 'That one\'s leaking.', 'Off you go, little boat.'] },
    ],
  },

  // ── Pellam Glass — a Clear ───────────────────────────────────────────
  {
    id: 'lantern-pellam',
    name: 'Pellam Glass',
    title: 'a Clear',
    look: { body: 0xeef4f8, accent: 0xd8e6ee, hat: 'none', traits: ['scarf'], size: 1.05, eye: 0xdff2f6 },
    at: { x: 1560, y: 900 },
    talks: [
      {
        when: DESPOT,
        lines: [
          'Look at my hand. In the dark you can see it. Just a little. A little grey, at the knuckles.',
          'Colour comes back in the dark, they always said. I thought it was a story they told us to be cruel.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'I walked up to the Columbarium today. Up the steps. Nobody stopped me. Clears aren\'t allowed on the steps.',
          'I stood there in the door and the souls lit me up from inside. I looked like a lantern myself.',
        ],
      },
      {
        when: { questDone: Q_ARREARS },
        lines: [
          'Mother burns on Wire Three, and Tobias says she\'ll stay lit. I stood under her. She can\'t see me, of course.',
          'Nobody sees a Clear. That\'s the point of us. But I saw her. Thank you.',
        ],
      },
      {
        when: { quest: Q_ARREARS },
        lines: [
          'Tobias will know her lantern. He knows them all. Then the Wire Three post — I can\'t, I\'d be seen.',
          'Odd thing for a Clear to say. Everyone sees right through me. But they still see me standing there.',
        ],
      },
      {
        lines: [
          'You\'re looking at the fountain through my chest. It\'s all right. Everybody does.',
          'I kept a blanket over my window for one hour a week. Shade-thief. They held me in the Burning Glass.',
          'My mother\'s lantern is on Wire Three. Snuff says the wax is in arrears. He\'ll let her gutter.',
          'A Clear can\'t pay. A Clear can\'t work. And a Clear may not go near the wires. I\'ve asked.',
        ],
      },
    ],
    barks: [
      { when: DESPOT, lines: ['A little grey, at the knuckles.', 'Colour comes back in the dark.'] },
      { lines: ['Don\'t mind me.', 'See-through, that\'s all.', 'Wire Three.', 'No shadow. Never again.'] },
    ],
  },

  // ── Verger Amice Lowe — the Columbarium ──────────────────────────────
  {
    id: 'lantern-amice',
    name: 'Amice Lowe',
    title: 'Verger of the Columbarium',
    look: { body: 0xd8bea2, accent: 0x2a3f6e, hat: 'hood', traits: ['lantern', 'book'], size: 1.1, eye: 0x8fc8ff },
    at: { x: 1290, y: 400 },
    talks: [
      {
        when: DESPOT,
        lines: [
          'The Columbarium doors stand open all night now. The souls go out as they please. Most go up.',
          'A few come back in the morning and sit in their old niches. Habit, I suppose. I leave the doors open.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'His Highness sits by the lowest niche with the little lantern in his lap. He has opened its door.',
          'He says it was always empty. He says he knew. He has asked me to bring him a blanket. For the night.',
        ],
      },
      {
        when: { courtReady: 'lantern' },
        lines: [
          'All five. The Lamplighter has heard. He is walking the galleries with his great lantern, trimming niches.',
          'He does that when he is afraid. He has done it every night for twenty-two years. Every… every day.',
        ],
      },
      {
        lines: [
          'The Columbarium of Lights. Ten thousand niches, and a lantern in each — the oldest souls on the island.',
          'His Highness is the Lamplighter. He has not let a single soul go into the dark since the Noon began.',
          'People think it is cruelty. I have served him eighteen years. It is not cruelty. It is fear.',
        ],
      },
    ],
    barks: [
      { when: PRINCE, lines: ['A blanket. For the night.', 'The door is open.'] },
      { lines: ['Ten thousand niches.', 'Hush, on the steps.', 'He trims them himself, you know.'] },
    ],
  },

  // ── Kit Hollow — a child who has never seen the dark ─────────────────
  {
    id: 'lantern-kit',
    name: 'Kit Hollow',
    title: 'Aged Nine',
    look: { body: 0xecd0b4, accent: 0xe8b048, hat: 'cap', traits: ['pack'], size: 0.7, eye: 0x6a9fd8 },
    at: { x: 1330, y: 890 },
    wander: 60,
    talks: [
      {
        when: DESPOT,
        lines: [
          'THE SKY WENT OUT. And then there were holes in it. Little bright holes, millions! Gran says they\'re STARS.',
          'I screamed. Everyone screamed. Then I stopped screaming and just looked and looked.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The Prince let one go! It went up and up and got tiny and then I couldn\'t see it. Where did it go?',
          'Gran says up. But what\'s up there? Just more sun?',
        ],
      },
      {
        lines: [
          'What\'s the dark like? Gran says it\'s like inside a cupboard but everywhere. That sounds AWFUL.',
          'I shut my eyes once for a whole minute. It was orange. Is the dark orange?',
          'The lanterns go WOOO when they get out. Tobias says don\'t stand near them. I stand a bit near.',
        ],
      },
    ],
    barks: [
      { when: DESPOT, lines: ['STARS!', 'Is it dark again yet?'] },
      { lines: ['Is the dark orange?', 'WOOO!', 'I counted nine hundred lanterns.', 'Gran\'s on Wire Seven.'] },
    ],
  },
];

// ── The crowd ────────────────────────────────────────────────────────

const looks: NpcLook[] = [
  { body: 0xdcc0a4, accent: 0xf4f1ea, hat: 'veil', traits: ['scarf'] },
  { body: 0xc8a888, accent: 0x5a4430, hat: 'candle', traits: ['tool', 'pack'] },
  { body: 0xe4caae, accent: 0x6a9fd8, hat: 'cap', traits: ['lantern'] },
  { body: 0xeef4f8, accent: 0xd8e6ee, hat: 'none', traits: [], size: 1 },
  { body: 0xd2b090, accent: 0xd8505e, hat: 'hood', traits: ['apron', 'satchel'] },
  { body: 0xe8d0b6, accent: 0xf4f1ea, hat: 'veil', traits: ['book'], size: 0.9 },
  { body: 0xcfa585, accent: 0xe8b048, hat: 'none', traits: ['pack'], size: 0.74 },
  { body: 0xbe9c7c, accent: 0x2a3f6e, hat: 'hood', traits: ['lantern', 'cane'], size: 1.1 },
];

const barks: Talk[] = [
  {
    when: DESPOT,
    lines: [
      'It\'s DARK!', 'The lanterns are going up!', 'I slept. I actually slept.', 'Look at the little lights in the sky!',
    ],
  },
  {
    when: PRINCE,
    lines: [
      'He let one go!', 'The Columbarium doors are open.', 'Nobody\'s been fined all week.', 'Did you see it go up?',
    ],
  },
  {
    when: { courtReady: 'lantern' },
    lines: ['Someone beat all five of the Lamplighter\'s.', 'The stranger\'s going up to the Columbarium.'],
  },
  {
    lines: [
      'Wax is up again.', 'Mind the drips.', 'My father\'s on Wire Five.', 'Is that one guttering?',
      'Snuff let the Kellys\' go.', 'Catcher\'s on the stair.', 'Hush, it\'s a new one.', 'Two hundred boats today.',
      'So bright down here.', 'Squint, love, squint.',
    ],
  },
];

export const LANTERN_CROWD: NonNullable<AreaDef['crowd']> = {
  count: 14,
  looks,
  paths: [
    // Up and down Lantern Row.
    [{ x: 2260, y: 800 }, { x: 1620, y: 820 }, { x: 2260, y: 800 }],
    // Square to the lake landing and back.
    [{ x: 1580, y: 820 }, { x: 1080, y: 800 }, { x: 1580, y: 820 }],
    // Square up to the Columbarium.
    [{ x: 1400, y: 720 }, { x: 1250, y: 560 }, { x: 1150, y: 420 }, { x: 1250, y: 560 }],
    // The south road toward the Mural Court.
    [{ x: 1420, y: 920 }, { x: 1300, y: 1150 }, { x: 1220, y: 1420 }, { x: 1300, y: 1150 }],
    // Along the wire posts on the south walk.
    [{ x: 1360, y: 1440 }, { x: 2240, y: 1440 }, { x: 1360, y: 1440 }],
    [{ x: 200, y: 1440 }, { x: 1040, y: 1440 }, { x: 200, y: 1440 }],
    // Round the lake.
    [{ x: 1010, y: 1060 }, { x: 640, y: 1100 }, { x: 220, y: 1000 }, { x: 220, y: 560 }, { x: 640, y: 480 }, { x: 1000, y: 580 }],
    // Mourners to the Mourning House.
    [{ x: 1300, y: 1150 }, { x: 1620, y: 1350 }, { x: 2040, y: 1340 }, { x: 1620, y: 1350 }],
  ],
  barks,
};
