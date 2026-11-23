import type { AreaDef, NpcDef, NpcLook, Talk } from '../../../../IslesTypes';

/**
 * The people of the Mural Court.
 *
 * Everyone here paints, and everyone paints the same thing: the Despot, arms wide, at noon. The
 * court's law on top of Clarity is the **Canon of Light** — no shadow may be painted, ever, on
 * anything; the dark pigments (umber, lamp-black, Payne's grey) are contraband; a censor with a
 * lime bucket walks every street and whitewashes anything darker than ochre. A painter caught
 * painting a shadow is bleached like any shade-thief. So they talk about colour the way other
 * towns talk about money or weather — and about the colours they are not allowed, in whispers.
 */

const PRINCE = { prince: 'hue' } as const;
const DESPOT = { monarch: 'auriel' } as const;

const Q_UMBER = 'mural-q-umber';
const Q_BLACK = 'mural-q-lampblack';
const Q_WALL = 'mural-q-face-to-wall';
const Q_CHALK = 'mural-q-chalk-shadows';
const Q_GALLERY = 'mural-q-gallery';

export const MURAL_NPCS: NpcDef[] = [
  // ── Ottavio Madder — the colourman, the shop ─────────────────────────
  {
    id: 'mural-madder',
    name: 'Ottavio Madder',
    title: 'Colourman',
    look: { body: 0xe0b894, accent: 0xd8507e, hat: 'beret', traits: ['apron', 'glasses'], size: 1.1, eye: 0x9a2414 },
    at: { x: 980, y: 1146 },
    role: { kind: 'shop', id: 'mural-shop' },
    talks: [
      {
        when: DESPOT,
        lines: [
          'The sun went DOWN. I sold out of lamp-black by the second evening. I had to grind more. Openly. In a window.',
          'Charms are where they always were. Everything else in this shop is suddenly the wrong colour. Glorious.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'A man came in this morning and asked for umber. Out loud. In daylight. I nearly dropped the vermilion.',
          'I sold it him. Under the counter, mind. Habits. Charms on the top shelf, as ever.',
        ],
      },
      {
        when: { questDone: Q_BLACK },
        lines: [
          'Mother Ochre says there\'s a bolt of black cloth in the dye works. Black. I have not seen black in years.',
          'I have not heard anything about it. I have never heard anything about anything. What\'ll it be?',
        ],
      },
      {
        lines: [
          'Madder\'s Colours. Every pigment the Canon allows, ground fine, bound in good linseed. Thirty-one of them.',
          'The Canon of Light, friend: nothing painted may hold a shadow. So the dark earths are off the shelf.',
          'Umber. Lamp-black. Payne\'s grey. You\'ll not find them here. You\'ll not find them anywhere. Officially.',
          'Charms on the top shelf — wear three. Painters\' tools, but His Highness\'s champions don\'t fight fair.',
        ],
      },
    ],
    barks: [
      { when: PRINCE, lines: ['Umber! Who wants umber!', 'Black, by the jar! Shh. No. Out loud!'] },
      {
        lines: [
          'Vermilion, fresh ground!', 'Cadmium for the halo, madam?', 'Gold size and leaf!',
          'No, sir, I have never heard of umber.', 'Linseed, poppy, walnut!',
        ],
      },
    ],
  },

  // ── Tobiah Fresco — the scaffold painter (quest: A Drop of Umber) ─────
  {
    id: 'mural-tobiah',
    name: 'Tobiah Fresco',
    title: 'Painter of the Left Eye',
    look: { body: 0xd8b088, accent: 0xe0402a, hat: 'beret', traits: ['apron', 'beard', 'tool'], size: 1.05, eye: 0x3a6ac8 },
    at: { x: 820, y: 440 },
    talks: [
      {
        when: DESPOT,
        lines: [
          'Nobody\'s re-painted the Mural in a week. His left eye\'s faded to nothing. I went up and looked at it.',
          'Then I painted a shadow under his foot. A big one. Then I came down and slept fourteen hours.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The scaffold\'s still up and nobody\'s told me to climb it. I\'ve been sitting at the bottom since dawn.',
          'There\'s been dawn every hour since I was born. You know what I mean. The idea of a dawn.',
        ],
      },
      {
        when: { questDone: Q_UMBER },
        lines: [
          'It\'s still there. A thumbnail of umber under his heel. The censors walk past it every morning.',
          'They look straight at the light. Nobody in this court has looked at a foot in twenty-two years.',
        ],
      },
      {
        when: { quest: Q_UMBER },
        lines: [
          'The eels in the river below the bridge. Their ink is umber, real umber. Nobody fishes them. Nobody dares.',
          'One eel. Bring it to me and I\'ll go up on the boards and do it. Before the sun bleaches me out of nerve.',
        ],
      },
      {
        lines: [
          'I paint His Radiance\'s left eye. Every day. The sun bleaches it out by evening, so I paint it again.',
          'Twenty-two years. Forty thousand left eyes. I could paint it asleep. I have painted it asleep.',
          'Do you know what I\'ve never painted? A shadow. Not one. Not even a little one under a foot.',
        ],
      },
    ],
    barks: [
      { when: { questDone: Q_UMBER }, lines: ['Still there. Still there!', 'A thumbnail. Just a thumbnail.'] },
      { lines: ['Left eye. Again.', 'Mind the drips below!', 'Forty thousand and one.', 'The sun ate him again.'] },
    ],
  },

  // ── Mother Ochre — the colour-mill (quest: Lamp-Black) ─────────────────
  {
    id: 'mural-ochre',
    name: 'Mother Ochre',
    title: 'Miller of Colours',
    look: { body: 0xc8946a, accent: 0xd49a3a, hat: 'headwrap', traits: ['apron', 'satchel'], size: 1.15, eye: 0x6a4a2a },
    at: { x: 230, y: 1380 },
    talks: [
      {
        when: DESPOT,
        lines: [
          'I ground lamp-black in the open this morning. The wheel didn\'t care. The river didn\'t care. I wept.',
          'Go and look at the night tonight, dear. I\'ve ground that colour in secret since I was a girl.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The censors haven\'t been over the bridge all week. They\'re frightened of the far bank now. Good.',
          'Mills don\'t stop for princes. But they turn easier, somehow, when nobody\'s watching them.',
        ],
      },
      {
        when: { questDone: Q_BLACK },
        lines: [
          'Indigo\'s dyed it. One bolt of black. Enough for one curtain. One room, somewhere, gets a night.',
          'I\'ve put my name down for it. So has everybody. We\'ll draw lots. I\'ve never wanted to win anything so much.',
        ],
      },
      {
        when: { quest: Q_BLACK },
        lines: [
          'Four bags of lamp-black I hid round the court before the censors came. Soot in a sack. You\'ll know them.',
          'Bring them to Indigo at the dye works. He knows what to do with black. Somewhere under all that blue.',
        ],
      },
      {
        lines: [
          'Vermilion off the north wheel, ultramarine off this one. I grind what the Canon allows, and I grind it fine.',
          'The censors come over the bridge twice a day to sniff my stones for umber. They never find any.',
          'Because I clean the stones, dear. Not because I don\'t grind it.',
        ],
      },
    ],
    barks: [
      { when: { questDone: Q_BLACK }, lines: ['One curtain. One room.', 'I\'ve put my name down.'] },
      { lines: ['Grind it fine.', 'Mind the wheel, it bites.', 'Stones clean, censors happy.', 'Red off the north wheel.'] },
    ],
  },

  // ── Indigo Crabbe — the dyer ───────────────────────────────────────────
  {
    id: 'mural-indigo',
    name: 'Indigo Crabbe',
    title: 'Dyer, Blue to the Elbow',
    look: { body: 0xb8a088, accent: 0x2c52d4, hat: 'cap', traits: ['apron', 'tool'], size: 1, eye: 0x1a2e86 },
    at: { x: 560, y: 600 },
    talks: [
      {
        when: DESPOT,
        lines: [
          'Black cloth. I\'ve orders for forty curtains. FORTY. The vats can\'t keep up. I\'ve never been so happy.',
          'Look at my arms. Still blue. I\'ll be blue in my coffin. But my coffin\'s going to be lined in black.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The Prince used to come down and inspect the river. Make sure no stripe ran darker than the Canon.',
          'Nobody\'s inspected anything since you went in the Gallery. I let the blue run a shade deep. Lovely.',
        ],
      },
      {
        when: { questDone: Q_BLACK },
        lines: [
          'That bolt\'s hid where nobody looks. In the indigo vat. Black under blue. The censors stir it daily.',
          'Never once lifted it out. Nobody stirs a vat hoping to find something. Only hoping not to.',
        ],
      },
      {
        lines: [
          'The vats let into the river through five sluices. Red, yellow, green, blue, rose. Five stripes. By law.',
          'They mix down by the sea, Sepp says. Go brown. Muddy. A shadow-colour. Nobody inspects the sea.',
          'I dye the court\'s banners and the censors\' tabards. Lime-white. I hate lime-white. It\'s not a colour.',
        ],
      },
    ],
    barks: [
      { when: PRINCE, lines: ['A shade deeper. Go on.', 'Nobody inspects the blue now.'] },
      { lines: ['Five sluices, five stripes.', 'Blue to the elbow.', 'Stir it, don\'t drown in it.', 'Not lime-white again.'] },
    ],
  },

  // ── Signora Ombretta Vell — a Clear, an old portraitist (quest) ─────────
  {
    id: 'mural-ombretta',
    name: 'Signora Ombretta Vell',
    title: 'Formerly of Atelier Row',
    look: { body: 0xeef2f4, accent: 0xc8d4dc, hat: 'veil', traits: ['cane', 'scarf'], size: 0.92, eye: 0xd8e4ec },
    at: { x: 2220, y: 1240 },
    talks: [
      {
        when: DESPOT,
        lines: [
          'I sat in the dark last night. The first dark. Look — my hands. There\'s a little pink back in them.',
          'I\'m going to paint again. In the evenings. Only in the evenings. With every shadow I can find.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'You can still see the flagstones through me. Don\'t apologise for looking. Everyone looks.',
          'Hue painted me, you know. Before. When he was a boy with a box of chalks. He drew my daughter\'s shadow.',
        ],
      },
      {
        when: { questDone: Q_WALL },
        lines: [
          'She\'s hanging in my window now, face to the street. Liesl, at six, with her shadow beside her on the floor.',
          'People stop. They\'re not looking at Liesl. They\'re looking at the shadow. They\'ve forgotten what one is.',
        ],
      },
      {
        when: { quest: Q_WALL },
        lines: [
          'The Curator keeps confiscated canvases in the Gallery\'s back room, faces to the wall. Ask him.',
          'He\'s not unkind, Lustre. He\'s frightened. Everyone with a key in this court is frightened.',
        ],
      },
      {
        lines: [
          'You can see the street through me. I know. Don\'t step round me, dear. I\'m quite solid. Mostly.',
          'I painted my daughter\'s portrait twenty years ago with her shadow on the floor beside her. A small one.',
          'They held me in the Burning Glass until I went like this. A Clear. My colour only comes back in the dark.',
        ],
      },
    ],
    barks: [
      { when: DESPOT, lines: ['A little pink. Look.', 'Evenings. I\'ll paint in the evenings.'] },
      { lines: ['Don\'t mind me. Look through.', 'Liesl was six.', 'They took the canvas too.', 'No shade. Not even mine.'] },
    ],
  },

  // ── Wren Gesso — the chalk girl (quest: Chalk Shadows) ─────────────────
  {
    id: 'mural-wren',
    name: 'Wren Gesso',
    title: 'Apprentice, Unofficially',
    look: { body: 0xe8c8a8, accent: 0x8a4ec8, hat: 'beret', traits: ['satchel', 'scarf'], size: 0.74, eye: 0x28a07a },
    at: { x: 1380, y: 1080 },
    talks: [
      {
        when: DESPOT,
        lines: [
          'I saw a STAR. And then another one. And then about a million. Nobody told me there were a million.',
          'I\'m going to chalk them on the square. Every one. It\'ll take till I\'m old. I don\'t mind.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'I chalked a shadow under the Prince\'s statue and nobody limed it. It\'s been there since breakfast!',
          'Everyone keeps walking round it so they don\'t scuff it. Like it\'s a puddle. A puddle of night.',
        ],
      },
      {
        when: { questDone: Q_CHALK },
        lines: [
          'My chalks! Charcoal and all. I drew a shadow under Mister Madder\'s stall and he pretended not to see.',
          'He gave me a biscuit. Then he swept it out a bit, so it\'d look like dust. That\'s nearly helping.',
        ],
      },
      {
        when: { quest: Q_CHALK },
        lines: [
          'The censor tipped my satchel out and kicked the sticks everywhere. Four charcoals. They\'re black, you\'ll see.',
          'Don\'t let the bill-sticker see you pick them up. He papers over anything I draw. With HIS face.',
        ],
      },
      {
        lines: [
          'I draw shadows. Under things. Under benches and easels and people standing still. In charcoal.',
          'Nobody\'s got one, see, so I give them one. Then the censor comes with the bucket and it\'s gone.',
          'I\'ve never seen a real one. Sable at the quay says hers was long in the evening. What\'s evening like?',
        ],
      },
    ],
    barks: [
      { when: { questDone: Q_CHALK }, lines: ['Charcoal\'s back!', 'Stand still, I\'ll give you a shadow.'] },
      { lines: ['Stand still! Just a second!', 'There. Now you\'ve got one.', 'Don\'t tell the censor.', 'What\'s a sunset?'] },
    ],
  },

  // ── Curator Lustre Abbot — the Gallery's steward (quest: the Gallery) ────
  {
    id: 'mural-lustre',
    name: 'Curator Lustre Abbot',
    title: 'Keeper of the Shadowless Gallery',
    look: { body: 0xe4ccb0, accent: 0xe8b830, hat: 'tophat', traits: ['glasses', 'book', 'cane'], size: 1.05, eye: 0xfff0a0 },
    at: { x: 2140, y: 660 },
    talks: [
      {
        when: DESPOT,
        lines: [
          'I have turned every confiscated canvas round to face the room. Four hundred and twelve. All with shadows.',
          'The Gallery has never been so dark. People come and stand in front of them and cry. So do I. Daily.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'His Highness is in the back room with the confiscated work. He\'s turning them round one by one.',
          'He asked me for a lamp. Not for light. To make the shadows longer. I\'ve no idea where to buy one.',
        ],
      },
      {
        when: { questDone: Q_WALL },
        lines: [
          'One canvas fewer in the back room. I counted. I shall have to tell the Prince the count is wrong.',
          'I shall tell him the damp got it. There\'s no damp on Solmara. He won\'t check. He never looks back there.',
        ],
      },
      {
        lines: [
          'Welcome to the Shadowless Gallery. Every work is lit from directly above, through glass, at all hours.',
          'Nothing hung here has ever had a shadow fall across it. His Highness designed the roof himself.',
          'There is a back room. There is not a back room. Please enjoy the front room.',
        ],
      },
    ],
    barks: [
      { when: PRINCE, lines: ['He wants a lamp. A LAMP.', 'Four hundred and twelve.'] },
      { lines: ['No touching the gilt.', 'Lit from above. Always.', 'There is no back room.', 'Mind the glare, sir.'] },
    ],
  },

  // ── Sepp Bargeman — the angler by the river ─────────────────────────────
  {
    id: 'mural-sepp',
    name: 'Sepp Tiller',
    title: 'Bargeman, Retired',
    look: { body: 0xc8a07c, accent: 0x28a07a, hat: 'straw', traits: ['rod', 'pipe', 'beard'], size: 1.1, eye: 0x6ad8b0 },
    at: { x: 500, y: 1180 },
    talks: [
      {
        when: DESPOT,
        lines: [
          'The river runs black at night now. All the stripes, gone to one dark. You can\'t tell where the fish are.',
          'Haven\'t caught a thing in a week. Never been happier. Sat here and watched the stars come out in it.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'Snapper are biting in the red stripe. They always do when nobody\'s watching the river.',
          'Censors used to count my catch for anything dark. Umber eel\'s a crime to land, did you know? Not now.',
        ],
      },
      {
        lines: [
          'The pigment river. Five stripes off the dye works. Iron rod or better — the colour gums a soft line.',
          'Perch in every stripe, painted like the stripe they live in. Snapper in the red, if you\'re patient.',
          'And the umber eel, at the bottom where it\'s darkest. Illegal to land. Inks like a shadow when it bites.',
        ],
      },
    ],
    barks: [
      { lines: ['Red stripe\'s biting.', 'Iron rod, mind.', 'Shh. Snapper.', 'Mixes brown at the sea, the whole lot.'] },
    ],
  },

  // ── Censor Agnes Whitlow — a censor with doubts ─────────────────────────
  {
    id: 'mural-whitlow',
    name: 'Agnes Whitlow',
    title: 'Censor, Third Ward',
    look: { body: 0xf0ece4, accent: 0xd8e2e6, hat: 'hood', traits: ['apron', 'tool'], size: 1, eye: 0xaebcc2 },
    at: { x: 1480, y: 1250 },
    talks: [
      {
        when: DESPOT,
        lines: [
          'I put my bucket down at sunset. The first sunset. Everything went shadow at once. I couldn\'t lime it all.',
          'So I sat down on the bucket and watched. I\'m told I\'m out of a job. I\'ve started painting. Badly.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The Office hasn\'t issued a lime chit in days. I walk my ward with the bucket out of habit.',
          'Saw a chalked shadow under the statue. Walked past it. My feet decided. I just followed them.',
        ],
      },
      {
        when: { questDone: Q_CHALK },
        lines: [
          'The girl\'s drawing shadows again. I\'m supposed to report it. I\'ve put it down as "dust".',
          'Dust has no shadow. Dust is regulation. I am a very good censor about dust.',
        ],
      },
      {
        lines: [
          'Third Ward censor. I walk from the Mural to the river twice a day and lime anything darker than ochre.',
          'Painted shadows, chalked shadows, a stain that looks too much like one. It all gets the bucket.',
          'Sometimes I lime a thing and I don\'t remember if it was a shadow. Just that it was dark. Is that the same?',
        ],
      },
    ],
    barks: [
      { when: PRINCE, lines: ['That\'s dust. Definitely dust.', 'Bucket\'s heavy today.'] },
      { lines: ['Darker than ochre? Bucket.', 'Report all shadows.', 'Lime is free.', 'Was that a shadow? Bucket.'] },
    ],
  },
];

const looks: NpcLook[] = [
  { body: 0xe0b894, accent: 0xe0402a, hat: 'beret', traits: ['apron'] },
  { body: 0xd8b088, accent: 0x2c52d4, hat: 'beret', traits: ['tool', 'satchel'] },
  { body: 0xf0ece4, accent: 0xd8e2e6, hat: 'hood', traits: ['tool'] },
  { body: 0xe8c8a8, accent: 0xf6c628, hat: 'none', traits: ['scarf'], size: 0.78 },
  { body: 0xc8946a, accent: 0x28a07a, hat: 'straw', traits: ['pack'] },
  { body: 0xdcbca0, accent: 0xd8507e, hat: 'beret', traits: ['glasses', 'book'] },
  { body: 0xeef2f4, accent: 0xc8d4dc, hat: 'none', traits: [], size: 0.95 },
  { body: 0xb8906e, accent: 0xd49a3a, hat: 'cap', traits: ['apron', 'beard'], size: 1.15 },
];

const barks: Talk[] = [
  {
    when: DESPOT,
    lines: [
      'The sun SET!', 'My shadow\'s longer than me!', 'Paint the night! Paint the night!',
      'There\'s a colour called dusk.', 'The censors have gone home.',
    ],
  },
  {
    when: PRINCE,
    lines: [
      'The Prince is turning the pictures round!', 'Nobody limed it!', 'Is umber legal now?',
      'Someone painted a shadow on the Mural!',
    ],
  },
  {
    when: { courtReady: 'mural' },
    lines: ['All five of the Prince\'s champions, beaten.', 'They say the stranger\'s going to the Gallery.'],
  },
  {
    lines: [
      'Left eye\'s fading again.', 'Mind the wet paint!', 'Darker than ochre, you\'re for the bucket.',
      'His Radiance, at noon. Again.', 'My Dusk Ticket\'s for Thursday.', 'Don\'t stand still near Wren.',
      'Lime chit for the Third Ward.', 'Gold leaf\'s gone up again.',
    ],
  },
];

export const MURAL_CROWD: NonNullable<AreaDef['crowd']> = {
  count: 14,
  looks,
  paths: [
    // Up and down North Street to the square.
    [{ x: 1200, y: 150 }, { x: 1200, y: 600 }, { x: 1170, y: 1095 }, { x: 1200, y: 600 }],
    // The Meridian road.
    [{ x: 1300, y: 800 }, { x: 1800, y: 800 }, { x: 2300, y: 800 }, { x: 1800, y: 800 }],
    // Round Palette Square.
    [{ x: 1000, y: 850 }, { x: 1200, y: 760 }, { x: 1400, y: 860 }, { x: 1200, y: 1010 }],
    // Over the bridge to the mills and back.
    [{ x: 1000, y: 960 }, { x: 600, y: 960 }, { x: 240, y: 960 }, { x: 240, y: 1150 }, { x: 240, y: 960 }, { x: 600, y: 960 }],
    // Through the colour market.
    [{ x: 600, y: 1060 }, { x: 760, y: 1200 }, { x: 760, y: 1400 }, { x: 980, y: 1300 }],
    // Atelier Row.
    [{ x: 1300, y: 1185 }, { x: 1800, y: 1185 }, { x: 2300, y: 1185 }, { x: 1800, y: 1185 }],
    // Censors on their round through the yard.
    [{ x: 1200, y: 1300 }, { x: 1500, y: 1330 }, { x: 1200, y: 1520 }],
  ],
  barks,
};
