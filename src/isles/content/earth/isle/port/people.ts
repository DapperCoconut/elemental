import type { Cond, NpcDef, NpcLook, Pt, Talk } from '../../../../IslesTypes';

/**
 * The people of Quarrymouth — the harbour cut into the old quarry face, where every crossing to
 * Bedrock Hold lands.
 *
 * The town lives on three benches the quarrymen left as they cut downward: the Rim (the
 * stonecutters' yards and the mason's lodge), the Long Step (houses chiselled into the face, the
 * Hearthstone, the store, the plaza where the Regent's statue stands on top of the Old King's), and
 * the quay, where the great brass Tithe Scales stand. Every season each household carries a block
 * of cut stone down to be weighed against the Regent's basalt. Who falls short is collared in stone
 * and carted up the Haul Road to the Sepulchre, "until the debt is quarried by others" — so the
 * town quarries all night, for the neighbours it has lost. Nobody says "interred". They say "gone
 * up the road", or "resting", which is what the Regent says of the Old King.
 *
 * Dialogue blocks are listed most specific first: Regent down → a prince down → their quest done →
 * default. One person only comes home once the Regent falls.
 */

const REGENT: Cond = { monarch: 'gravane' };
const princes = (count: number): Cond => ({ princesOfIsle: 'earth', count });

// ── Positions (shared with the area's pieces, POIs and quests) ──────

export const AT = {
  dock: { x: 1470, y: 1232 },
  store: { x: 1760, y: 648 },
  tackle: { x: 2160, y: 1196 },
  baker: { x: 800, y: 636 },
  keeper: { x: 860, y: 1226 },
  mason: { x: 640, y: 252 },
  lift: { x: 2390, y: 1012 },
  hobb: { x: 300, y: 404 },
  pip: { x: 1300, y: 626 },
  tumble: { x: 2200, y: 404 },
  dilly: { x: 346, y: 420 },
} satisfies Record<string, Pt>;

export const QUARRYMOUTH_NPCS: NpcDef[] = [
  // ── Harbourmaster / boatwright ────────────────────────────────────
  {
    id: 'quarrymouth-dock', name: 'Hesper Bollard', title: 'Harbourmaster & Boatwright', at: AT.dock,
    role: { kind: 'dock', id: 'quarrymouth-dock' },
    look: { body: 0x9a7a5c, accent: 0x3a4a5a, hat: 'souwester', traits: ['tool', 'apron', 'pipe'], size: 1.2 },
    talks: [
      {
        when: REGENT,
        lines: [
          'I unloaded a barge this morning and nobody weighed the ballast. I stood there holding it like a fool.',
          'We have been tipping the Regent\'s basalt cubes off the end of the pier. They make a lovely noise.',
          'Want a hull? Built with no tithe-mark in the keel. First one in forty years. She floats lighter. I swear it.',
        ],
      },
      {
        when: { prince: 'sirocco' },
        lines: [
          'Sirocco\'s down, and the sand-ships are coming round the west point to trade instead of to tithe.',
          'One of them ran aground on my slip. Runners, not a keel. I spent a whole morning just looking at it.',
        ],
      },
      {
        when: { questDone: 'quarrymouth-short-stone' },
        lines: [
          'Dredge went up the Haul Road with no collar on anyone. Ruth says she will have to make one less this year.',
          'Pip Scrabble has been carving little stone boats on my slip. Says it is "making up the weight". Ha.',
        ],
      },
      {
        lines: [
          'Up off the Barge Pier — mind the bollards — and welcome to Quarrymouth. The whole town is a hole.',
          'You landed on a Tithe Day. Every house brings a block down to the Scales. Do not stand in the queue.',
          'Hulls and mending: me. Tackle: Silas, east by the crane pier. Bread: Nan, up the Grand Stair.',
        ],
      },
    ],
    barks: [
      { when: REGENT, lines: ['Plop! Another cube off the pier.', 'No mark in the keel. Feels naked.'] },
      { lines: ['Mind the bollards.', 'Barge in, barge out.', 'Tithe Day. Keep your head down.', 'Pitch on the seams, dust on the pitch.'] },
    ],
  },

  // ── General store ─────────────────────────────────────────────────
  {
    id: 'quarrymouth-store', name: 'Mags Cobble', title: 'The Chock & Chisel', at: AT.store,
    role: { kind: 'shop', id: 'quarrymouth-store' },
    look: { body: 0xc89a78, accent: 0x5a4e6a, hat: 'headwrap', traits: ['glasses', 'apron'], size: 0.95 },
    talks: [
      {
        when: REGENT,
        lines: [
          'I have taken the Regent\'s weight-chart off the wall. Under it, somebody had chalked the old street name.',
          'Cobble Row. That is where this shop is. I have been here thirty years and never once known.',
        ],
      },
      {
        when: { prince: 'facet' },
        lines: [
          'Facet is down and the Geode is selling us cut crystal at a fair price. Lamp-lenses! Proper ones!',
          'I sold one to a woman who had not seen her own kitchen clearly in eleven years. She cried at a spoon.',
        ],
      },
      {
        when: { questDone: 'quarrymouth-book-of-marks' },
        lines: [
          'Ruth Ashlar\'s book is the talk of the Long Step. People queue to find their own names in it. And others\'.',
          'I found my brother. Cell four hundred and twelve, the Galleries. I had always just said "up the road".',
        ],
      },
      {
        lines: [
          'The Chock & Chisel. My walls are made of tithe-rejects — every block the Scales would not take.',
          'Charms with a bit of the Hold in them: plumb-bobs, feathers and wedges, a keystone that keeps an arch.',
          'Equip three — TAB, then pick. Food at the counter too. I sell it by the loaf. Not by the pound. Never.',
        ],
      },
    ],
    barks: [
      { when: REGENT, lines: ['Cobble Row! It was Cobble Row!', 'Lenses from the Geode, fair price!'] },
      { lines: ['Rope, lamp-oil, chisels!', 'Hardtack! Dust-cutter!', 'Every wall a reject. Every reject a wall.'] },
    ],
  },

  // ── Tackle shop ───────────────────────────────────────────────────
  {
    id: 'quarrymouth-tackle', name: 'Silas Sounder', title: 'Lode & Line', at: AT.tackle,
    role: { kind: 'tackle', id: 'quarrymouth-tackle' },
    look: { body: 0xa07a5c, accent: 0x2e4a4a, hat: 'beanie', traits: ['rod', 'beard', 'satchel'], size: 1.05 },
    talks: [
      {
        when: REGENT,
        lines: [
          'They are dredging the harbour under the Scales. Forty years of the Regent\'s weights down there. And keys.',
          'I landed a basalt marlin off the crane pier at dawn. Black as a cell door. I let it go. Felt right.',
        ],
      },
      {
        when: { prince: 'wreck' },
        lines: [
          'Wreck is down, and the old capital\'s collapsed well can be fished. Blind fish. Older than the Regent.',
          'Delver rod only. Anything else snaps at the bottom of a hundred foot of dark. I sell the delver.',
        ],
      },
      {
        when: { prince: 'sirocco' },
        lines: [
          'The Dunesea\'s open water now Sirocco\'s down. Sand water, I should say. Eels swim in it. Ask them how.',
          'You cast a sinker into a dune and wait for it to move. Only a delver rod will take sand. I have the delver.',
        ],
      },
      {
        lines: [
          'Lode & Line. Hooks, line, sinkers, and the delver rod — the only rod on the Hold that fishes sand and dark.',
          'Driftwood does the harbour: bream, mackerel, crabs. The granite grouper wants iron. The marlin wants luck.',
          'Cast off the crane pier or the quay edge. E at the water and wait. The fish here are as heavy as the stone.',
        ],
      },
    ],
    barks: [
      { when: REGENT, lines: ['Keys in the harbour mud!', 'Let the marlin go. Felt right.'] },
      { lines: ['Delver rods, sand-tested!', 'Bream are biting.', 'Heavier than they look, every one.', 'Lead sinkers, three a copper.'] },
    ],
  },

  // ── Baker ─────────────────────────────────────────────────────────
  {
    id: 'quarrymouth-baker', name: 'Nan Quernby', title: 'The Hearthstone', at: AT.baker,
    role: { kind: 'bakery', id: 'quarrymouth-bakery' },
    look: { body: 0xd4a888, accent: 0x8a5a2a, hat: 'chef', traits: ['apron', 'scarf'], size: 1.1 },
    talks: [
      {
        when: REGENT,
        lines: [
          'My brother walked in this morning, out of the Galleries. Nine years. First thing he said: "Is it Tuesday?"',
          'It is not Tuesday. I have baked him a loaf so wide it would never fit through a slit. He ate all of it.',
        ],
      },
      {
        when: { prince: 'bould' },
        lines: [
          'Bould is down. The Stonehold flatbread-woman sent me a sack of her starter as a thank-you. It bites.',
          'Two hearthstones on one isle, both free. We are going to be insufferable about it.',
        ],
      },
      {
        when: { questDone: 'quarrymouth-slit-loaf' },
        lines: [
          'The slit-pies went up honest this week. Murk has a new turnkey now. A frightened one. Better.',
          'I have started writing on the crusts with a skewer. Little words. Names. My brother sent one back.',
        ],
      },
      {
        lines: [
          'The Hearthstone. That slab under the oven was too heavy to tithe, so the town built a bakery on it.',
          'Bring me what you catch — harbour fish, and the courts\' fish too — and I bake it on the stone. One fight.',
          'And slit-loaves, every morning. Two fingers wide. That is how wide the gap is in a cell door.',
        ],
      },
    ],
    barks: [
      { when: REGENT, lines: ['A loaf too wide for any slit!', 'Is it Tuesday? It is not Tuesday.'] },
      { lines: ['Flatbread off the stone!', 'Slit-loaves, two fingers wide.', 'Mind the oven mouth.', 'Mackerel on the stone today.'] },
    ],
  },

  // ── Keeper of the Tithe Scales ────────────────────────────────────
  {
    id: 'quarrymouth-keeper', name: 'Abel Trone', title: 'Keeper of the Tithe Scales', at: AT.keeper,
    look: { body: 0x8a7a6a, accent: 0x5a4e6a, hat: 'tophat', traits: ['glasses', 'book', 'cane'], size: 1.0, eye: 0xd8c890 },
    talks: [
      {
        when: REGENT,
        lines: [
          'The beam came level this morning. On its own. Nobody in either pan. I think it was tired.',
          'People still come down to the quay on Tithe Day. To stand by the Scales. Nobody puts anything in.',
          'I read the empty pans for them. "Even," I tell them. "Even." It is the only true thing I have ever read.',
        ],
      },
      {
        when: { questDone: 'quarrymouth-book-of-marks' },
        lines: [
          'You took the Book of Marks out from under my Scales. I held the hatch. I have never held anything so heavy.',
          'Forty years I read the beam and never asked where the short went. Ruth wrote it all down. Every one.',
        ],
      },
      {
        when: { questDone: 'quarrymouth-short-stone' },
        lines: [
          'The Hobbs came up even. Spalls and all. I have been reading this beam since I was twelve. Even is rare.',
          'Do not tell anyone, but I liked it. Even. Sounds like a bell.',
        ],
      },
      {
        lines: [
          'The Tithe Scales. A block of cut stone a season, every house, against the Regent\'s basalt.',
          'Visitors are not tithed. You may watch. Watching is what most of Quarrymouth does on a Tithe Day.',
          'The cage on the right end of the beam is where the short stand while I read it. I read it slowly.',
        ],
      },
    ],
    barks: [
      { when: REGENT, lines: ['Even. Even.', 'The beam is tired.'] },
      { lines: ['Next house.', 'The beam does not lie. It is only told.', 'Step back from the pan.', 'Short by a pound. Weigh again.'] },
    ],
  },

  // ── The Regent's mason ────────────────────────────────────────────
  {
    id: 'quarrymouth-mason', name: 'Ruth Ashlar', title: 'Mason to the Regent', at: AT.mason,
    look: { body: 0xa8948a, accent: 0x4a3e52, hat: 'coif', traits: ['tool', 'apron', 'bandage'], size: 1.15, eye: 0xb8c0c8 },
    talks: [
      {
        when: { flag: 'gideon-arc-3' },
        lines: [
          'I struck off Gideon Flint\'s collar today. On the Scales, in front of the whole quay. One blow; it knew me.',
          'Two hundred and twelve collars I closed. I am going to open every one with my own hands. It will take a while.',
          'He weighed it, after. Eleven pounds. Then he gave it to me. I have put it on my bench, where I can see it.',
        ],
      },
      {
        when: REGENT,
        lines: [
          'They are opening the cells. Every collar I ever closed has a pin in it only my chisel fits. So: me.',
          'I have a queue. I have never had a queue that was glad to see me. I do not know what to do with my face.',
        ],
      },
      {
        when: { questDone: 'quarrymouth-book-of-marks' },
        lines: [
          'The Book is out of the ground. Every name, every cell. They cannot say nobody counted. I counted.',
          'Vellum came back for it once. I was holding a mallet. He remembered an appointment somewhere else.',
        ],
      },
      {
        when: { questDone: 'quarrymouth-counterweight' },
        lines: [
          'Forty tithe-blocks in Jenny\'s counterweight, and I cut the marks on thirty of them. I knew every house.',
          'Thole has stopped asking me for more. I think I frightened him. I was holding a mallet. I often am.',
        ],
      },
      {
        lines: [
          'Ruth Ashlar. The Regent\'s mason. I dress his stone. I seal his cells. I close the collars.',
          'Each one has an iron pin through the ends that only my chisel fits. So nobody but me can open them.',
          'Do not look at the pegs. Those are for next season. Look at the block. It is a good block. I am good at this.',
        ],
      },
    ],
    barks: [
      { when: REGENT, lines: ['Next collar. Hold still.', 'One blow. It knows me.'] },
      { lines: ['Tap. Tap. Tap.', 'Mind the spalls.', 'Good grain, this.', 'Do not look at the pegs.'] },
    ],
  },

  // ── Lift-winder ───────────────────────────────────────────────────
  {
    id: 'quarrymouth-lift', name: 'Jenny Pulley', title: 'Lift-Winder', at: AT.lift,
    look: { body: 0xb8906a, accent: 0x6a3a2a, hat: 'miner', traits: ['tool', 'scarf'], size: 0.9 },
    talks: [
      {
        when: REGENT,
        lines: [
          'I took the tithe-blocks out of the counterweight and gave every one back to its house. Forty of them.',
          'The lift runs on river-stones now. They do not have anybody\'s name on them. It is a much happier lift.',
        ],
      },
      {
        when: { questDone: 'quarrymouth-counterweight' },
        lines: [
          'Thole has not come back. I have kept the counterweight at forty. Not one block more.',
          'I chalk a name on a different block every morning before the first ride. Today it was Dilly Hobb.',
        ],
      },
      {
        lines: [
          'The lift! Quay to Rim and back, the whole face in one ride. The landing is behind me. E at the cage.',
          'Saves the Grand Stair, which is four hundred steps and a dozen of them are lying about the number.',
          'Rides are free. The Regent tithes the counterweight instead. Do not ask me about the counterweight.',
        ],
      },
    ],
    barks: [
      { when: REGENT, lines: ['River-stones! Nobody\'s name!', 'Going up!'] },
      { lines: ['Going up!', 'Hands inside the cage.', 'Mind the gap at the Rim.', 'Forty blocks. Forty.'] },
    ],
  },

  // ── Marl Hobb ─────────────────────────────────────────────────────
  {
    id: 'quarrymouth-hobb', name: 'Marl Hobb', title: 'Quarryman', at: AT.hobb,
    look: { body: 0x9a7254, accent: 0x5a4a32, hat: 'miner', traits: ['tool', 'beard', 'pack'], size: 1.25 },
    talks: [
      {
        when: REGENT,
        lines: [
          'Dilly is home. She is sitting on the step in the sun and will not come in. Nine years of dark. I understand.',
          'I went out to the face last night out of habit, to cut her debt. Got there and laughed till I sat down.',
        ],
      },
      {
        when: { questDone: 'quarrymouth-counterweight' },
        lines: [
          'Jenny chalked Dilly\'s name on her block in the counterweight. I go up in the lift every morning now.',
          'Twelfth block from the top. I put my hand on it as we pass. It is warm, from the sun on the face.',
        ],
      },
      {
        when: { questDone: 'quarrymouth-short-stone' },
        lines: [
          'Even! We came up even. I have not heard Abel say that word about a Hobb block in my life.',
          'Pip\'s been told never to chip a tithe-block again. He has started chipping the rejects instead. Good lad.',
        ],
      },
      {
        lines: [
          'Marl Hobb. I cut stone all day for the town, and all night for my wife\'s debt. She went up nine years ago.',
          'Three hundred blocks owed on her, credited one a season if I cut it perfect. I cut it perfect.',
          'That is seventy-five years. I have done nine. I am very strong now. It is not a comfort.',
        ],
      },
    ],
    barks: [
      { when: REGENT, lines: ['Dilly\'s on the step!', 'No more night shift. None!'] },
      { lines: ['One more block.', 'Night shift again.', 'Perfect or it does not count.', 'Dilly, love. Nine years.'] },
    ],
  },

  // ── Pip Scrabble ──────────────────────────────────────────────────
  {
    id: 'quarrymouth-pip', name: 'Pip Scrabble', title: 'Quarry Kid', at: AT.pip, wander: 50,
    look: { body: 0xd0aa88, accent: 0x6a8a3a, hat: 'cap', traits: ['satchel'], size: 0.72 },
    talks: [
      {
        when: REGENT,
        lines: [
          'I dug up the street names! All the plaques in the Name-Pit, on the Rim. Somebody has to put them back up.',
          'This one says LANTERN LANE. I do not know where Lantern Lane was. I am going to pick somewhere nice.',
        ],
      },
      {
        when: { questDone: 'quarrymouth-quarry-chant' },
        lines: [
          'The hauliers sing the Chant on the cranes now. All four verses! The Hushwarden has not come back.',
          '"Heave on the one, and the stone comes up." Granny says I sing it flat. Granny is lying.',
        ],
      },
      {
        lines: [
          'I find things. Buried things. The Regent buries everything, so there is LOADS. Look — a button.',
          'That was a book once. It is a lump now. I keep it anyway. You never know.',
          'Grown-ups say not to dig under the quay paving. So I mostly dig under the quay paving.',
        ],
      },
    ],
    barks: [
      { when: REGENT, lines: ['LANTERN LANE!', 'Street names! Free street names!'] },
      { lines: ['Found a button!', 'Do not tell Granny.', 'Heave on the one…', 'Everything is buried here. Everything!'] },
    ],
  },

  // ── Granny Tumble ─────────────────────────────────────────────────
  {
    id: 'quarrymouth-tumble', name: 'Granny Tumble', title: 'Old Haulier', at: AT.tumble,
    look: { body: 0xb8a090, accent: 0x6a4a3a, hat: 'headwrap', traits: ['cane', 'pipe', 'scarf'], size: 0.85 },
    talks: [
      {
        when: REGENT,
        lines: [
          'I sang the Chant at the top of the Grand Stair this morning, all four verses. The whole quay came in on four.',
          'Forty years of humming it in my sleep. My Ned would have sung bass. Somebody sang bass. That was enough.',
        ],
      },
      {
        when: { questDone: 'quarrymouth-quarry-chant' },
        lines: [
          'They are singing it on the cranes. Wrong, mostly, but they are singing it. A wrong song is still a song.',
          'Pip sings it flat. Do not tell him. He thinks I am lying, and I would hate him to think I was not.',
        ],
      },
      {
        lines: [
          'I hauled blocks off this face for forty years, child. We sang to keep the time. The Quarry Chant.',
          'The Regent buried it with all the songs. Cut the verses on stones and laid them face down in the quay.',
          'Now the cranes run in silence and men lose fingers, because nobody knows when the heave is coming.',
        ],
      },
    ],
    barks: [
      { when: REGENT, lines: ['…and the stone comes UP!', 'Somebody sang bass.'] },
      { lines: ['Mm-hm-hm… heave…', 'Mind your fingers on the cranes.', 'In my day we sang.', 'Silly boy.'] },
    ],
  },

  // ── Dilly Hobb (home only once the Regent falls) ──────────────────
  {
    id: 'quarrymouth-dilly', name: 'Dilly Hobb', title: 'Home from the Galleries', at: AT.dilly, present: REGENT,
    look: { body: 0xc0a48e, accent: 0x7a8a9a, hat: 'none', traits: ['scarf', 'bandage'], size: 0.95, eye: 0xe0e8f0 },
    talks: [
      {
        lines: [
          'Do not mind me. I am sitting in the sun. I have been sitting in the sun since yesterday morning.',
          'Nine years in a cell four foot by six. Every season Marl\'s block went into the counterweight. I felt it.',
          'Not really. But I told myself I could. Every time the lift went past the face, I said: that is him.',
          'Ruth struck my collar off herself. She cried. I told her to stop it, she was dripping on my neck.',
        ],
      },
    ],
    barks: [{ lines: ['Sun. Look at it.', 'Four foot by six. Not any more.', 'Marl, the step is warm.'] }],
  },
];

// ── The crowd ───────────────────────────────────────────────────────

const CROWD_LOOKS: NpcLook[] = [
  { body: 0xa88a6a, accent: 0x5a4a32, hat: 'miner', traits: ['tool'] },
  { body: 0xc8a08a, accent: 0x6a4a5a, hat: 'headwrap' },
  { body: 0x8a6a52, accent: 0x3a3a3a, hat: 'cap', traits: ['pack'], size: 1.18 },
  { body: 0xd0aa90, accent: 0x7a5a3a, hat: 'none', traits: ['apron'] },
  { body: 0x9a7a62, accent: 0x5a4e6a, hat: 'hood', traits: ['cane'] },
  { body: 0xb89878, accent: 0x4a4a3a, hat: 'beanie', traits: ['satchel'] },
  { body: 0xc89a82, accent: 0x8a6a2a, hat: 'none', size: 0.74 },
  { body: 0xa88a7a, accent: 0x3a4a5a, hat: 'souwester', traits: ['rod'] },
  { body: 0x9a8070, accent: 0x6a3a2a, hat: 'coif', traits: ['apron', 'tool'], size: 1.1 },
];

export const QUARRYMOUTH_CROWD: { count: number; looks: NpcLook[]; paths: Pt[][]; barks: Talk[] } = {
  count: 14,
  looks: CROWD_LOOKS,
  paths: [
    // The Grand Stair: quay to Rim and back down, the busiest walk in town.
    [{ x: 1300, y: 1180 }, { x: 1300, y: 980 }, { x: 1300, y: 700 }, { x: 1300, y: 400 }, { x: 1300, y: 160 }, { x: 1300, y: 700 }],
    // The tithe queue on the quay: round the Scales and back.
    [{ x: 560, y: 1230 }, { x: 760, y: 1250 }, { x: 1000, y: 1260 }, { x: 1140, y: 1140 }, { x: 600, y: 1100 }],
    // Along the quay, crane to crane.
    [{ x: 300, y: 1240 }, { x: 1180, y: 1180 }, { x: 1800, y: 1260 }, { x: 2300, y: 1210 }],
    // The Long Step, west to east.
    [{ x: 140, y: 750 }, { x: 700, y: 760 }, { x: 1300, y: 740 }, { x: 1900, y: 760 }, { x: 2460, y: 750 }],
    // Round the Long Step's doors.
    [{ x: 560, y: 420 }, { x: 1000, y: 430 }, { x: 1100, y: 680 }, { x: 600, y: 700 }],
    // The east end of the Long Step: Granny's door, the store, the lift gantry.
    [{ x: 1640, y: 430 }, { x: 2300, y: 440 }, { x: 2380, y: 700 }, { x: 1900, y: 700 }],
    // The Rim: the stonecutters' yard and the Haul Road.
    [{ x: 300, y: 260 }, { x: 900, y: 270 }, { x: 1300, y: 200 }, { x: 1700, y: 260 }, { x: 2300, y: 240 }],
    // Up and down the west stair, out to the yard.
    [{ x: 430, y: 500 }, { x: 430, y: 260 }, { x: 760, y: 90 }, { x: 430, y: 260 }],
  ],
  barks: [
    { when: REGENT, lines: [
      'The cells are open!', 'My father came down the Haul Road on his own feet.', 'Ruth is striking collars on the quay!',
      'Nobody weighed anything today. NOTHING.', 'Somebody put a flatbread on the Old King\'s head again.',
    ] },
    { when: princes(4), lines: [
      'Four courts free!', 'The collar cart did not come down this season.', 'They say the Regent is digging himself in deeper.',
    ] },
    { when: { prince: 'bould' }, lines: [
      'The Stonehold prince is down!', 'No rolling stones on the Haul Road.', 'Shh — not by the Scales.',
    ] },
    { lines: [
      'Tithe Day. Tithe Day.', 'Is your block heavy enough?', 'The Pratts went up the road last spring.',
      'Mind the bollards.', 'Bream off the crane pier.', 'They dry your block before they weigh it.', 'Gone up the road. Resting.',
    ] },
  ],
};
