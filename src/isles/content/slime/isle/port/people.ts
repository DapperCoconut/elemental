import type { Cond, NpcDef, NpcLook, Pt, Talk } from '../../../../IslesTypes';

/**
 * The people of Stilthaven — the stilt harbour at the mire's edge, where every crossing to Fangmire
 * lands.
 *
 * Every soul in Stilthaven carries the Mark, two small scars on the wrist, and lives from new moon
 * to new moon on one dose of the Draught. On Draught Night the whole town queues on the Draught
 * House deck behind a purple velvet rope, and Clerk Vellum reads the board: a dose for every name,
 * and a black line through the passed-over. The passed-over go grey from the fingertips in. The
 * informers post their slips in the brass ear-boxes on the walks and are paid in extra doses. So
 * Stilthaven is polite, quiet, careful about whose name it says aloud — and very fond of its baker.
 *
 * Dialogue blocks are listed most specific first: Matriarch down → a prince down → their quest done
 * → default.
 */

const NYXA: Cond = { monarch: 'nyxa' };
const princes = (count: number): Cond => ({ princesOfIsle: 'slime', count });

// ── Positions (shared with the area's POIs and quests) ──────────────

export const AT = {
  dock: { x: 1196, y: 1336 },
  store: { x: 1500, y: 1178 },
  tackle: { x: 1990, y: 1178 },
  baker: { x: 1086, y: 1178 },
  clerk: { x: 1896, y: 654 },
  tanner: { x: 236, y: 676 },
  wren: { x: 556, y: 1176 },
  gran: { x: 706, y: 1172 },
  keeper: { x: 2434, y: 1334 },
  netter: { x: 2356, y: 676 },
} satisfies Record<string, Pt>;

export const STILTHAVEN_NPCS: NpcDef[] = [
  // ── Dockmaster / boatwright ───────────────────────────────────────
  {
    id: 'stilthaven-dock', name: 'Morrow Gall', title: 'Dockmaster & Boatwright', at: AT.dock,
    role: { kind: 'dock', id: 'stilthaven-dock' },
    look: { body: 0x8a7a62, accent: 0x3a4a2a, hat: 'souwester', traits: ['tool', 'beard', 'pipe'], size: 1.2, eye: 0xd8e0a0 },
    talks: [
      {
        when: NYXA,
        lines: [
          'I built a punt this week and nobody asked me for a skin to tithe off it. I stood there holding the skin.',
          'Hulls are cheaper now. Hulls are cheaper because I am not paying for a dose out of every plank.',
          'Want one? Mangrove keel, tar on the seams. She floats on mire. Nothing floats on mire. She does.',
        ],
      },
      {
        when: { prince: 'fetter' },
        lines: [
          'Fetter is down and the chain-gangs are walking home along the causeway. With their chains on. Carrying them.',
          'One of them stopped at my slip and asked for work. He said he can hold a plank still for a day. He can.',
        ],
      },
      {
        when: { questDone: 'stilthaven-new-moon' },
        lines: [
          'The Markwarden went back up the Fen Road holding her syringe in both hands like it might go off. Ha.',
          'You still have no Mark. You are the only wrist on Fangmire without one. Keep your sleeve down.',
          'Boats when you want them. The Outer Sea is rough out here. Take a hull with some weight in it.',
        ],
      },
      {
        lines: [
          'Off the pier, mind the gap in the boards — the mire has no bottom. Welcome to Stilthaven. On legs.',
          'You came in on a Draught Night. New moon. You will see the whole town queue tonight. Everybody does.',
          'Boats and hulls are me. Tackle is Saul, east on the walk. Bread is Hetty, in the house with the tooth.',
        ],
      },
    ],
    barks: [
      { when: NYXA, lines: ['No skin off the keel!', 'She floats. On mire. Look at her.'] },
      { lines: ['Mind the gap in the boards.', 'Tar on the seams, tar on the hands.', 'New moon. Keep your sleeve down.'] },
    ],
  },

  // ── General store ─────────────────────────────────────────────────
  {
    id: 'stilthaven-store', name: 'Pennywort Dace', title: 'The Coil & Candle', at: AT.store,
    role: { kind: 'shop', id: 'stilthaven-store' },
    look: { body: 0xb8a088, accent: 0x5a3a5c, hat: 'hood', traits: ['glasses', 'satchel'], size: 0.9, eye: 0xe0e0c0 },
    talks: [
      {
        when: NYXA,
        lines: [
          'I have taken the ear-box off my porch. I put it in the stove. It made a lovely noise going in.',
          'People are saying things in the shop now. Out loud. Prices, mostly. Complaining. It is beautiful.',
        ],
      },
      {
        when: { prince: 'whisper' },
        lines: [
          'The Cloak prince is down! The informers are walking about without their cowls. They look so small.',
          'Half my customers are buying hats. They are not used to having their faces seen. Neither am I.',
        ],
      },
      {
        when: { questDone: 'stilthaven-struck-names' },
        lines: [
          'You emptied the ear-boxes! There was a slip in there about me. "Sells candles after dark." I do. Ha.',
          'The Ration-Scribe\'s quill was found in the mire. Split nib. Nobody is fishing it out.',
        ],
      },
      {
        lines: [
          'The Coil & Candle! Rope, wicks, tallow, charms. Everything a house on legs needs to keep standing.',
          'Charms with a bit of the mire in them — a milker\'s glove, a pair of mire boots, an asp that sleeps on you.',
          'Equip three — TAB, then pick. And keep your voice down near the brass ears. They are always open.',
        ],
      },
    ],
    barks: [
      { when: NYXA, lines: ['Say it out loud! Go on!', 'Candles after dark! All night!'] },
      { lines: ['Rope! Wicks! Tallow!', 'Quietly, please. The ears.', 'Candles for the queue. You will be a while.'] },
    ],
  },

  // ── Tackle shop ───────────────────────────────────────────────────
  {
    id: 'stilthaven-tackle', name: 'Saul Mudgett', title: 'The Bitten Hook', at: AT.tackle,
    role: { kind: 'tackle', id: 'stilthaven-tackle' },
    look: { body: 0x9a826a, accent: 0x2e4a3a, hat: 'bandana', traits: ['rod', 'bandage', 'eyepatch'], size: 1.1, eye: 0xe8d890 },
    talks: [
      {
        when: NYXA,
        lines: [
          'Took the hydra sturgeon out past the lighthouse at dawn. Five gill-slits a side. Let her go again.',
          'And I fished the venom fen all night with no milker watching my creel. Every catch was mine. Mine.',
        ],
      },
      {
        when: { prince: 'venin' },
        lines: [
          'Venin\'s down! The fen up at the Fang Court is fishable now he is not milking it. Adder minnows. Catfish.',
          'Mind — only the antivenin rod will take that water. Anything else rots through on the first cast.',
        ],
      },
      {
        when: { prince: 'dusk' },
        lines: [
          'The Umbral mere has fish in it that are only shadows. Pike. Perch. You reel in a shape and it is cold.',
          'Blackwater, they call it. Antivenin rod again. The glass sleeve keeps the dark out of the line.',
        ],
      },
      {
        lines: [
          'The Bitten Hook. Yes, I was bitten. On the hook hand. By a viper eel. I named the shop after it so I remember.',
          'Driftwood for the sea, iron for the deep fish. And for the fen and the black meres — the antivenin.',
          'Glass-sleeved, gut-lined, cork grip soaked in the Draught itself. Venom slides off it. Dear. Worth it.',
        ],
      },
    ],
    barks: [
      { when: NYXA, lines: ['Every catch is mine!', 'Five gill-slits. Let her go.'] },
      { lines: ['Hold herring by the gills.', 'Eels off the Gaff, after dark.', 'Antivenin! Glass-sleeved! Dear!'] },
    ],
  },

  // ── The Honeyed Fang (bakery) ─────────────────────────────────────
  {
    id: 'stilthaven-baker', name: 'Hetty Combe', title: 'The Honeyed Fang', at: AT.baker,
    role: { kind: 'bakery', id: 'stilthaven-bakery' },
    look: { body: 0xd0a888, accent: 0xe8a828, hat: 'chef', traits: ['apron', 'scarf'], size: 1.15, eye: 0xf0d070 },
    talks: [
      {
        when: { all: [NYXA, { flag: 'tansy-cure-3' }] },
        lines: [
          'Every jar. I gave Tansy every jar of fang-honey I had, and the bees made more while she brewed. Good girls.',
          'My grandmother hid that hive in the fang when the Matriarch smoked out the rest. Now I know why she did.',
          'Bake? Of course I will bake. Bring me fish. I am going to bake until there is no flour left on this isle.',
        ],
      },
      {
        when: NYXA,
        lines: [
          'I put honey in a bun this morning and nothing else in it. Just honey. It felt very strange. Light.',
          'Bring me fish and I will bake you something. With the oven door open. With the shutters up.',
        ],
      },
      {
        when: { questDone: 'stilthaven-grey-day-buns' },
        lines: [
          'Ottilie is pink to the second knuckle. A drop a moon does not cure. It keeps the cold back. For now.',
          'And Quill wanders about asking people his own name. I sold him a bun. I did not tell him his name.',
          'Bring me fish when you like. Mullet, herring, eel — whatever the mire coughs up. I will bake it.',
        ],
      },
      {
        lines: [
          'The Honeyed Fang! Built round the tooth, yes. Wild bees in the tooth. They make the only honey on Fangmire.',
          'You bring the fish, I bake the pie, you eat it before a fight. One fight, mind. A charm lasts. A pie does not.',
          'The fang-honey takes the bitter out of anything. Even almonds. — Do not repeat that. Just a figure of speech.',
        ],
      },
    ],
    barks: [
      { when: NYXA, lines: ['Just honey! Only honey!', 'Shutters up, oven open!'] },
      { lines: ['Buns! Fang-honey buns!', 'Mind the bees, they mind you.', 'Stargazy pie, heads up!'] },
    ],
  },

  // ── The ration clerk ──────────────────────────────────────────────
  {
    id: 'stilthaven-clerk', name: 'Agatha Vellum', title: 'Clerk of the Ration Board', at: AT.clerk,
    look: { body: 0xb0a090, accent: 0x5a3a5c, hat: 'none', traits: ['glasses', 'book', 'scarf'], size: 0.95, eye: 0xd0d0c0 },
    talks: [
      {
        when: { all: [NYXA, { flag: 'tansy-cure-4' }] },
        lines: [
          'I read the board for the last time. Every name. And at the end of every name I said "cured". Every one.',
          'Then we burned it. The board, the books, the slips. My thumb is still black. I am keeping it black.',
        ],
      },
      {
        when: NYXA,
        lines: [
          'The doses are on trestles on the deck and anybody may take one. No book. No board. I keep reaching for my pen.',
          'Tansy Rue says a dose is still a dose. She says there is a real cure somewhere. I would like to read that.',
        ],
      },
      {
        when: { questDone: 'stilthaven-struck-names' },
        lines: [
          'Ottilie Pell is on the board with no line through her. I rubbed it out with my thumb. Look. Still black.',
          'I have started reading the slips before I strike anyone. Slowly. Out loud. It is amazing how few survive that.',
        ],
      },
      {
        when: { questDone: 'stilthaven-new-moon' },
        lines: [
          'You are still unmarked. I have no column for you. I have drawn one. It says "the visitor". It is empty.',
          'Do not look at the black lines. Everyone looks at the black lines. I draw them. I do not choose them.',
        ],
      },
      {
        lines: [
          'Name? — You have none in my book. Then you are a visitor, and you have come on Draught Night.',
          'One dose a moon for every Marked soul in good standing. The ones with lines are passed over this moon.',
          'I only keep the board. The slips come from the ear-boxes, and the doses come from Her. I keep the board.',
        ],
      },
    ],
    barks: [
      { when: NYXA, lines: ['Take one. Anybody. Take one.', 'No book. No board.'] },
      { lines: ['Next. Name and wrist.', 'Keep behind the rope, please.', 'Do not read the black lines.'] },
    ],
  },

  // ── The tanner ────────────────────────────────────────────────────
  {
    id: 'stilthaven-tanner', name: 'Scutch Varley', title: 'Snakeskin Tanner', at: AT.tanner,
    look: { body: 0x8a6a4a, accent: 0x6a5a2a, hat: 'cap', traits: ['apron', 'tool', 'beard'], size: 1.25, eye: 0xe0d090 },
    talks: [
      {
        when: NYXA,
        lines: [
          'I am tanning a skin for a coat. For me. Not for the Moult-Tithe. For a coat. I keep laughing at the frame.',
          'The snakes shed when they shed now. Nobody is counting. Funny. They seem to shed more when nobody counts.',
        ],
      },
      {
        when: { prince: 'venin' },
        lines: [
          'The Fang Court milkers have come down to the tannery asking how a skin is cured. They want a trade.',
          'Venin made them milk snakes and throw the skins in the mire. Waste. I told them: never throw a skin away.',
        ],
      },
      {
        when: { questDone: 'stilthaven-moult-tithe' },
        lines: [
          'Forty skins, signed for in Tallowby\'s own hand. Eleven of us drank this moon. Eleven. Every one.',
          'That patched one is still on the frame. I will not tithe it. It came from the snake under my own house.',
        ],
      },
      {
        lines: [
          'Mind the vat. That green is not venom; it is mangrove bark and brine. Cures a skin in nine days.',
          'Skins for the Moult-Tithe. Forty a moon from this tannery, cured whole, eyes and all.',
          'The mire has been cold this spring and the snakes will not shed. I am counting. I am always counting.',
        ],
      },
    ],
    barks: [
      { when: NYXA, lines: ['A coat! For me!', 'Shed when you like, my lovelies.'] },
      { lines: ['Thirty-five. Thirty-six.', 'Eyes and all, eyes and all.', 'Mind the vat.'] },
    ],
  },

  // ── Wren Pell ─────────────────────────────────────────────────────
  {
    id: 'stilthaven-wren', name: 'Wren Pell', title: 'Ottilie\'s Granddaughter', at: AT.wren,
    look: { body: 0xc8a088, accent: 0x6a8a4a, hat: 'beanie', traits: ['satchel'], size: 0.72, eye: 0xf0f0d0 },
    talks: [
      {
        when: NYXA,
        lines: [
          'Gran says she will live to be a hundred just to annoy them. There is no them now. She means to anyway.',
          'I have got the Mark and I do not care. Tansy says when the cure comes it will just be two little scars.',
        ],
      },
      {
        when: { questDone: 'stilthaven-struck-names' },
        lines: [
          'Gran is on the board with no line! I go and look at it every morning. I do not even need to. I just do.',
          'I kept one of the slips. Not hers. One that said "the Pells are a nuisance". I am going to frame it.',
        ],
      },
      {
        lines: [
          'You have not got a Mark! Show me your wrist. — Nothing! How do you not get cold?',
          'Gran is going grey. Her fingers. She hides them in her shawl. She says it is the weather.',
          'It is not the weather. I am eight. I know what grey means.',
        ],
      },
    ],
    barks: [
      { when: NYXA, lines: ['A hundred, Gran! A hundred!'] },
      { lines: ['No Mark! Look!', 'Gran, put your hands in.', 'I am not cold. I am NOT.'] },
    ],
  },

  // ── Granny Ottilie Pell ───────────────────────────────────────────
  {
    id: 'stilthaven-gran', name: 'Ottilie Pell', title: 'Passed Over', at: AT.gran,
    look: { body: 0x9a9a92, accent: 0x5a4a5a, hat: 'hood', traits: ['cane', 'scarf'], size: 0.88, eye: 0xc8c8c0 },
    talks: [
      {
        when: { all: [NYXA, { flag: 'tansy-cure-4' }] },
        lines: [
          'Look at my hands. Pink. Both of them, to the tips. I put them in the bread dough at Hetty\'s just to feel it.',
          'Cured, she said. Not dosed. Cured. I am seventy-one and I have never once been well. I am well.',
        ],
      },
      {
        when: NYXA,
        lines: [
          'The Matriarch is down and my fingers are still grey. Funny. You think it will all just stop.',
          'Tansy says there is a cure. Not a dose. I have heard that before. I would like to hear it once more.',
        ],
      },
      {
        when: { questDone: 'stilthaven-grey-day-buns' },
        lines: [
          'Pink to the second knuckle. Hetty\'s buns. Do not tell anybody what is in them; I do not know what is in them.',
          'Wren cried when she saw my hand. Then she was very cross that she had cried. She is a Pell.',
        ],
      },
      {
        lines: [
          'Do not look at my hands, dear. It is the weather. Three moons of weather. It goes up.',
          'Somebody posted our name. A slip in the ear-box, and a black line on the board. I know who. I will not say.',
          'Hetty brings me a bun every new moon. Honey on it. She is kind, Hetty. Kind is dangerous here.',
        ],
      },
    ],
    barks: [
      { when: NYXA, lines: ['Pink! Look!', 'Seventy-one and well!'] },
      { lines: ['It is only the weather.', 'Wren, my shawl.', 'Do not look at the board.'] },
    ],
  },

  // ── The lighthouse keeper ─────────────────────────────────────────
  {
    id: 'stilthaven-keeper', name: 'Ossery Blain', title: 'Keeper of the Fang Light', at: AT.keeper,
    look: { body: 0xa89070, accent: 0x2a3a4a, hat: 'cap', traits: ['lantern', 'pipe', 'beard'], size: 1.1, eye: 0xd8e8c0 },
    talks: [
      {
        when: NYXA,
        lines: [
          'I burn honest oil every night now. Yellow. Boats come in by it and nobody thinks the Draught has landed.',
          'The Lowering Stage has lanterns on it every night. Nobody lowers anyone. They go to it to sit, and talk.',
        ],
      },
      {
        when: { questDone: 'stilthaven-lowered' },
        lines: [
          'Forty lanterns on the stage. My brother\'s first. Half the town came down the walk and did not say a word.',
          'The Dredgemaster comes to the stage at night now. Sits at the end. Says nothing. I let him.',
        ],
      },
      {
        when: { prince: 'mortis' },
        lines: [
          'Mortis is down. The Grave Court is digging up its churchyard. Not all the greyed were as dead as all that.',
          'They say some were only cold. Carried off grey and still breathing. I keep thinking of the stage.',
        ],
      },
      {
        lines: [
          'This is the Fang Light. Green on Draught Nights — venom-oil. It means the Draught has come in from the nest.',
          'Every other night it burns ordinary green. Everything here is green. You stop noticing.',
          'The stage at the west end of the walk, by the dark water? Do not go there. That is the Lowering Stage.',
        ],
      },
    ],
    barks: [
      { when: NYXA, lines: ['Honest yellow! Look at it!', 'Sit on the stage. It is allowed now.'] },
      { lines: ['Green tonight. Draught Night.', 'Keep off the stage.', 'Trim the wick, trim the wick.'] },
    ],
  },

  // ── The net-mender ────────────────────────────────────────────────
  {
    id: 'stilthaven-netter', name: 'Moll Tangle', title: 'Net-Mender of the Lofts', at: AT.netter,
    look: { body: 0xb89a7a, accent: 0x4a6a5a, hat: 'headwrap', traits: ['tool', 'apron'], size: 1.0, eye: 0xe8e0b0 },
    talks: [
      {
        when: NYXA,
        lines: [
          'The silk-weavers came down from the Web Court and offered me spider-silk for my nets. Spider silk! Free!',
          'I do not know what to do with something free. I mended it into a net anyway. It catches EVERYTHING.',
        ],
      },
      {
        when: { prince: 'weft' },
        lines: [
          'Weft is down — the Web Court\'s spymaster. He had a thread for every spy on the isle. Strung on a map.',
          'They cut the threads. One whistled, they say, when it went. One was tied to the loft next door.',
        ],
      },
      {
        when: princes(3),
        lines: [
          'Three courts down. My nets have holes in them like everybody\'s, but people are mending them in the open.',
          'You can tell how a town is by its nets. Ours are hung out on the lofts in the daylight now. Brave.',
        ],
      },
      {
        lines: [
          'Mind the floats, they roll. Nets for the herring, nets for the eels, nets for the Moult-Tithe silk.',
          'We tithe silk too, the lofts. Spider silk off the mangroves. Twenty skeins a moon. I hate spiders.',
          'Every second net has an ear in it, they say. A spy. I mend round them. I mend round everything.',
        ],
      },
    ],
    barks: [
      { when: NYXA, lines: ['Free silk! FREE!', 'Catches everything!'] },
      { lines: ['Over, under, pull.', 'Mind the floats.', 'I hate spiders. I hate spiders.'] },
    ],
  },
];

// ── The crowd ───────────────────────────────────────────────────────

const CROWD_LOOKS: NpcLook[] = [
  { body: 0xa89078, accent: 0x5a3a5c, hat: 'hood', traits: ['satchel'] },
  { body: 0xc0a088, accent: 0x3a4a2a, hat: 'souwester', traits: ['rod'] },
  { body: 0x8a7a62, accent: 0x6a5a2a, hat: 'cap', traits: ['pack'], size: 1.15 },
  { body: 0xc8a890, accent: 0x4a6a5a, hat: 'headwrap', traits: ['apron'] },
  { body: 0x9a9a92, accent: 0x4a3a4a, hat: 'hood', traits: ['cane'], size: 0.9 },
  { body: 0xb89878, accent: 0x2e4a3a, hat: 'bandana', traits: ['tool'] },
  { body: 0xc89a82, accent: 0x7a6a3a, hat: 'beanie', size: 0.74 },
  { body: 0x9a826a, accent: 0x3a2a3a, hat: 'cowl', traits: ['scarf'] },
  { body: 0xa88a6a, accent: 0x5a6a3a, hat: 'none', traits: ['lantern'] },
];

export const STILTHAVEN_CROWD: { count: number; looks: NpcLook[]; paths: Pt[][]; barks: Talk[] } = {
  count: 14,
  looks: CROWD_LOOKS,
  paths: [
    // The High Stilts, the long walk across the town.
    [{ x: 200, y: 750 }, { x: 900, y: 752 }, { x: 1600, y: 748 }, { x: 2400, y: 752 }, { x: 1300, y: 750 }],
    // The Mooring Walk along the sea.
    [{ x: 300, y: 1240 }, { x: 1000, y: 1242 }, { x: 1700, y: 1238 }, { x: 2350, y: 1240 }],
    // The Draught queue: along the rope and back.
    [{ x: 1480, y: 676 }, { x: 1800, y: 676 }, { x: 1830, y: 760 }, { x: 1440, y: 760 }],
    // The spine, bank to sea.
    [{ x: 1300, y: 300 }, { x: 1300, y: 600 }, { x: 1300, y: 1000 }, { x: 1300, y: 1230 }, { x: 1300, y: 760 }],
    // Out along the Tannery Walk.
    [{ x: 420, y: 460 }, { x: 420, y: 760 }, { x: 420, y: 1100 }, { x: 420, y: 1230 }],
    // Out along the Loft Walk.
    [{ x: 2180, y: 460 }, { x: 2180, y: 760 }, { x: 2180, y: 1100 }, { x: 2180, y: 1230 }],
    // The bank, among the mangroves.
    [{ x: 300, y: 360 }, { x: 900, y: 380 }, { x: 1700, y: 380 }, { x: 2300, y: 370 }],
    // Out onto the Landing Pier to watch the boats.
    [{ x: 1300, y: 1240 }, { x: 1300, y: 1440 }, { x: 1300, y: 1300 }],
  ],
  barks: [
    { when: NYXA, lines: [
      'No queue tonight. No queue!', 'They burned the ration books on the deck.', 'Take a dose, anybody.',
      'My nan\'s hands are pink.', 'The ear-boxes are in the mire.', 'Say it! Say anything!',
    ] },
    { when: princes(4), lines: [
      'Four courts free.', 'The Markwarden has not been seen in a week.', 'They say the Draught House is short this moon.',
    ] },
    { when: { prince: 'venin' }, lines: [
      'The Fang prince is down!', 'No milkers on the Fen Road.', 'Shh — the ears.',
    ] },
    { lines: [
      'New moon. New moon.', 'Keep behind the rope.', 'Are we on the board?', 'Mind the ears.',
      'They passed over the Sumps.', 'Herring off the Gaff.', 'Sleeve down, sleeve down.', 'It is only the weather.',
    ] },
  ],
};
