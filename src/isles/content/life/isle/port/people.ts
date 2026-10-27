import type { Cond, NpcDef, NpcLook, Pt, Talk } from '../../../../IslesTypes';

/**
 * The people of Mossgate — the harbour town that grew inside the Fallen Elder, and where every
 * crossing to Thornwild lands.
 *
 * Four times a year, at the turn of each season, every household carries its Bloom Tithe down to
 * the great scales on the waterfront and sets it in the pan against the Empress's brass acorns. A
 * house that tips short is pruned: someone from it goes up the north road in the pruning cart, to
 * be grafted into the Glasshouse hedges "until they learn to flower". Mossgate weighs everything
 * now — bread, babies, words — and is very gentle with itself about how frightened it is.
 *
 * Dialogue blocks are listed most specific first: Empress down → a prince down → their quest done
 * → default. Two people only come home once the Empress falls: the pruned are unpicked from her
 * hedges, and one is fetched down from them by a swarm of bees.
 */

const EMPRESS: Cond = { monarch: 'verdigra' };
const princes = (count: number): Cond => ({ princesOfIsle: 'life', count });

// ── Positions (shared with the area's POIs and quests) ──────────────

export const AT = {
  dock: { x: 1470, y: 1218 },
  store: { x: 1660, y: 646 },
  tackle: { x: 2400, y: 1168 },
  baker: { x: 940, y: 1034 },
  weigher: { x: 1580, y: 1238 },
  hollin: { x: 214, y: 600 },
  sorrel: { x: 1130, y: 276 },
  linnet: { x: 2200, y: 600 },
  tobias: { x: 262, y: 628 },
  primrose: { x: 1046, y: 1050 },
} satisfies Record<string, Pt>;

export const MOSSGATE_NPCS: NpcDef[] = [
  // ── Dockmaster / boatwright ───────────────────────────────────────
  {
    id: 'mossgate-dock', name: 'Bram Underbough', title: 'Dockmaster & Boatwright', at: AT.dock,
    role: { kind: 'dock', id: 'mossgate-dock' },
    look: { body: 0x9a7254, accent: 0x4a6a2e, hat: 'cap', traits: ['tool', 'beard', 'apron'], size: 1.25 },
    talks: [
      {
        when: EMPRESS,
        lines: [
          'The scales are still up on the quay. Nobody has touched them. We just walk round them now, like a grave.',
          'I built a hull this week with no tithe-notch cut in the keel. Felt like building it naked.',
          'Want one? Heartwood keel, moss caulking. She will not sink. She might sprout. That is a Mossgate boat.',
        ],
      },
      {
        when: { prince: 'birchbark' },
        lines: [
          'Birchbark is down and the Heartwood is letting us cut timber again. Dead timber. We are not monsters.',
          'Thirty years I have patched hulls with moss and spit. I nearly wept at a plank.',
        ],
      },
      {
        when: { questDone: 'mossgate-short-weight' },
        lines: [
          'Hask went up the north road with his shears in a sling. First time the cart has gone back empty.',
          'Fennel Hollin has been following me about the slip all week. Wants to be a boatwright. Heaven help him.',
        ],
      },
      {
        lines: [
          'Off the Taproot and onto the quay — mind the root, it humps. Welcome to Mossgate. Inside the tree, yes.',
          'You landed on Weighing Day. Season\'s turn. Everybody carries their tithe down to the scales today.',
          'Boats, hulls, mending: that is me. Fishing is Ezra, east under the last arch. Bread is Dorcas, in the Burl.',
        ],
      },
    ],
    barks: [
      { when: EMPRESS, lines: ['No notch in the keel!', 'She might sprout. They do that.'] },
      { lines: ['Mind the root. It humps.', 'Moss in the seams, tar on the moss.', 'Weighing Day. Keep your head down.'] },
    ],
  },

  // ── General store ─────────────────────────────────────────────────
  {
    id: 'mossgate-store', name: 'Tansy Knott', title: 'The Knothole Emporium', at: AT.store,
    role: { kind: 'shop', id: 'mossgate-store' },
    look: { body: 0xc89a78, accent: 0x7a3a5a, hat: 'wreath', traits: ['glasses', 'satchel'], size: 0.92 },
    talks: [
      {
        when: EMPRESS,
        lines: [
          'I have taken the acorn scale out of the shop. Things cost what they cost now. Not what they weigh.',
          'Somebody asked me how much a loaf weighs and I said "I have no idea" and it was the best day of my life.',
        ],
      },
      {
        when: { prince: 'saccharo' },
        lines: [
          'Sugar from the Confection Court has come down the west road at a fair price. Saccharo tithed it twice.',
          'I have sold Moss Tea sweetened for the first time in years. People cried into it. It was not that good.',
        ],
      },
      {
        when: { questDone: 'mossgate-seedlings' },
        lines: [
          'The Ashby twins are walking about a finger taller than God made them and nobody can prove a thing.',
          'Cork insoles are now my best-selling line. I did not foresee that. I have a waiting list of mothers.',
        ],
      },
      {
        lines: [
          'The Knothole Emporium! It was a knot. Now it is a shop. That is how everything in Mossgate happens.',
          'Charms with a bit of the Elder in them — moss that grows north, seeds that sprout under your enemy.',
          'Equip three — TAB, then pick. Food at the counter too. I do not weigh it. I am told I ought to.',
        ],
      },
    ],
    barks: [
      { when: EMPRESS, lines: ['No idea what it weighs! None!'] },
      { lines: ['Moss tea! Acorn cake!', 'Seeds, charms, cork, string.', 'I do not weigh it. Do not tell anyone.'] },
    ],
  },

  // ── Tackle shop ───────────────────────────────────────────────────
  {
    id: 'mossgate-tackle', name: 'Ezra Reedbottom', title: 'The Hook & Bramble', at: AT.tackle,
    role: { kind: 'tackle', id: 'mossgate-tackle' },
    look: { body: 0xa07a5c, accent: 0x3a5a3a, hat: 'straw', traits: ['rod', 'pipe', 'beard'], size: 1.05 },
    talks: [
      {
        when: EMPRESS,
        lines: [
          'Elspeth\'s baby came this morning. I was going to say "and nobody weighed her". I keep saying it. Nobody.',
          'I landed a verdant sturgeon at dawn. Green as a leaf, long as a bench. Let her go. Felt right.',
        ],
      },
      {
        when: { prince: 'saccharo' },
        lines: [
          'Saccharo\'s down. The syrup river is fishable now he is not tithing every jar of it. Sticky work.',
          'Only the briarwood will take syrup. Anything else gums solid on the first cast. I have the briarwood.',
        ],
      },
      {
        when: { questDone: 'mossgate-wedding' },
        lines: [
          'Elspeth wed in the root-arches with the whole quay singing, and the first slice went where it belonged.',
          'Vetch\'s little silver tasting-fork washed up under the Crook. I use it for picking out hooks.',
        ],
      },
      {
        lines: [
          'The Hook & Bramble. Driftwood for the sea, iron for the bog, briarwood for everything — even the syrup.',
          'Briarwood is grown, not cut. Bent on a frame for nine years. Thorns left on, so the line never slips.',
          'Fish off the Crook — the bent root that runs out under the last arch. Mullet for learning. Rays for pride.',
          'And I buy fish. Somebody has to. The Empress only buys fish by the pound, and only her own pounds.',
        ],
      },
    ],
    barks: [
      { when: EMPRESS, lines: ['Nobody weighed her!', 'Let her go. Felt right.'] },
      { lines: ['Mullet\'s running!', 'Briarwood: grown, not cut.', 'Thorns on, so the line never slips.'] },
    ],
  },

  // ── Baker ─────────────────────────────────────────────────────────
  {
    id: 'mossgate-baker', name: 'Dorcas Thistlewaite', title: 'The Crumb & Thistle', at: AT.baker,
    role: { kind: 'bakery', id: 'mossgate-bakery' },
    look: { body: 0xd8aa88, accent: 0xb85a8a, hat: 'chef', traits: ['apron'], size: 1.25 },
    talks: [
      {
        when: { flag: 'wendeline-hive-3' },
        lines: [
          'I have a woman sleeping by my oven who was a hedge a fortnight ago. She eats like a tree drinks.',
          'Honey on everything. Honey on the honey. I have never been so glad to be robbed.',
        ],
      },
      {
        when: EMPRESS,
        lines: [
          'I baked a loaf this morning and did not weigh it. It came out lopsided. I put it in the window anyway.',
          'People stood outside looking at it. A lopsided loaf. Like it was a painting.',
        ],
      },
      {
        when: { prince: 'mycel' },
        lines: [
          'Mycel is down. The Spore Court is sending us their bog-fish again. A glowcap eel in a pie — it glows. Really.',
        ],
      },
      {
        when: { questDone: 'mossgate-wedding' },
        lines: [
          'That bride-pie! I have had six orders for it since. All weddings. Mossgate is getting married at me.',
        ],
      },
      {
        lines: [
          'The Crumb & Thistle! Oven in the burl, thistle on the crust. Everything here is baked with a prickle.',
          'Bring me fish — sea fish off the Crook, court fish from up the roads — and I make you a meal.',
          'One meal, one fight. It wears off with the bell. And for pity\'s sake do not weigh it.',
        ],
      },
    ],
    barks: [
      { when: EMPRESS, lines: ['Lopsided! Look at it!'] },
      { lines: ['Thistle crust, hot!', 'Mind the oven — it is a tree.', 'A prickle in every loaf. For luck.'] },
    ],
  },

  // ── Tithe-weigher ─────────────────────────────────────────────────
  {
    id: 'mossgate-weigher', name: 'Agnes Tare', title: 'Reader of the Beam', at: AT.weigher,
    look: { body: 0xb89a84, accent: 0x24602a, hat: 'veil', traits: ['book', 'glasses'], size: 0.95, eye: 0xc8f0a8 },
    talks: [
      {
        when: EMPRESS,
        lines: [
          'I read the beam for twenty years. Every short house. Every name that went up the north road in the cart.',
          'They are coming down the road now, unpicked, with moss in their hair. I am standing here to meet them.',
          'I owe them that. I owe them a great deal more. I will start with standing here.',
        ],
      },
      {
        when: { questDone: 'mossgate-thumb-on-the-scale' },
        lines: [
          'Plumb\'s acorns are at the bottom of the harbour. The town\'s old pound-stones are back in the pan.',
          'Half of Mossgate weighed true this season. Half. Do you know how many carts that is? I do. I counted.',
        ],
      },
      {
        when: { prince: 'petalis' },
        lines: [
          'Petalis is down. The Bloom Court used to send the cart for our short houses. It did not come this week.',
          'I read the beam anyway. Habit. It tipped short for the Marchbanks. I wrote "even". Nobody checked.',
        ],
      },
      {
        when: { questDone: 'mossgate-short-weight' },
        lines: [
          'You are in the book: "One visitor. Weighed against an acorn. Even." Nobody is ever even. You were.',
          'The Hollins are still a pound short. They will be a pound short next season too. I will still read it.',
        ],
      },
      {
        lines: [
          'Step up. — No, not on the pan. In front of it. I read the beam; Master Plumb brings the weights.',
          'Every house sets its tithe in that pan against the Empress\'s brass acorns. Honey, turnips, bread, wool.',
          'If the beam tips your way, you are even. If it tips hers, you are short. Short houses are pruned.',
          'I do not make the weights. I only read the beam. You would be amazed how often I have said that today.',
        ],
      },
    ],
    barks: [
      { when: EMPRESS, lines: ['Welcome home. Welcome home.'] },
      { lines: ['Even. ...Short. ...Even.', 'Next house, step up.', 'I only read the beam.'] },
    ],
  },

  // ── Maud Hollin ───────────────────────────────────────────────────
  {
    id: 'mossgate-hollin', name: 'Maud Hollin', title: 'Honey & Turnips, a Pound Short', at: AT.hollin,
    look: { body: 0xb0866a, accent: 0x8a6a2a, hat: 'beanie', traits: ['apron', 'satchel'], size: 1.05 },
    talks: [
      {
        when: EMPRESS,
        lines: [
          'Tobias came down the north road this morning. Barefoot. Leaves in his beard. He knew me straight away.',
          'He has bark on his left hand still. The herb-wife says it will peel by midsummer. I will help it.',
        ],
      },
      {
        when: { questDone: 'mossgate-short-weight' },
        lines: [
          'Fennel is still here. Still eating. Still loud. Still mine. Every morning I count him, like a fool.',
          'We are still a pound short. We will be short next season too. But Hask went home with his arm in a sling.',
        ],
      },
      {
        when: { prince: 'petalis' },
        lines: [
          'They say Petalis kept the pruned in his orangery to "harden off" before the Glasshouse. Tobias went there.',
          'You beat him? Then maybe someone was let out. Maybe someone is walking about with a leaf in his hair.',
        ],
      },
      {
        lines: [
          'A pound and a quarter short. Honey and turnips. It was a wet spring; the bees would not fly, nothing swelled.',
          'Tobias went up the north road last spring for the same. Now they want Fennel. He is nine.',
          'I have weighed that boy on my own kitchen scale every night this month. He is not getting any lighter.',
        ],
      },
    ],
    barks: [
      { when: EMPRESS, lines: ['Tobias! Shoes! You have shoes!'] },
      { lines: ['A pound and a quarter.', 'Fennel! In. Now.', 'Wet spring. Bees would not fly.'] },
    ],
  },

  // ── Old Mother Sorrel ─────────────────────────────────────────────
  {
    id: 'mossgate-sorrel', name: 'Old Mother Sorrel', title: 'Keeper of the Green Shoot', at: AT.sorrel,
    look: { body: 0xa8907a, accent: 0x5a7a3a, hat: 'hood', traits: ['cane', 'scarf'], size: 0.88, eye: 0xd8f0b0 },
    talks: [
      {
        when: EMPRESS,
        lines: [
          'The shoot put out four leaves last night. Four! It has been one leaf a year since before your grandmother.',
          'The Elder is not dead. I always said. It was only holding its breath, like the rest of us.',
        ],
      },
      {
        when: { questDone: 'mossgate-green-shoot' },
        lines: [
          'Cerewick\'s wax pot is in my kitchen. I use it to seal jam. He would hate that. Good.',
          'The shoot is green and still ours. Look at it, standing up out of the floor like it owns the place. It does.',
        ],
      },
      {
        when: { prince: 'birchbark' },
        lines: [
          'Birchbark is down? The Heartwood is the Elder\'s sister, you know. Same seed-year. She will feel it.',
        ],
      },
      {
        lines: [
          'The Elder fell a hundred years ago, in the Empress\'s first storm. Crown north, roots in the sea.',
          'We built in it because it would not stop being shelter. Mossgate is a town living in a kind old corpse.',
          'Except — look. Here. One green shoot, out of the heartwood. While it is green, Mossgate is its own.',
        ],
      },
    ],
    barks: [
      { when: EMPRESS, lines: ['Four leaves!'] },
      { lines: ['Still green. Still green.', 'Mind my shoot.', 'The Elder is only holding its breath.'] },
    ],
  },

  // ── Linnet Ashby ──────────────────────────────────────────────────
  {
    id: 'mossgate-linnet', name: 'Linnet Ashby', title: 'Mother of Two Seedlings', at: AT.linnet,
    look: { body: 0xc8a28a, accent: 0x3a6a5a, hat: 'none', traits: ['scarf', 'satchel'], size: 1.0 },
    talks: [
      {
        when: EMPRESS,
        lines: [
          'I burned the Seed Ledger page with my twins on it. Then I burned the page with me on it. From when I was two.',
          'Burdock asked what we were burning. I said "the Empress\'s homework". He thought that was very funny.',
        ],
      },
      {
        when: { questDone: 'mossgate-seedlings' },
        lines: [
          'They walk a little funny in the cork. Like ducks on a deck. But they measured a finger over the notch.',
          'Quire wrote "thriving". THRIVING. I have it framed. I have the page framed. I stole the page.',
        ],
      },
      {
        when: { prince: 'mycel' },
        lines: [
          'They say Mycel measured the Spore children by how much they glowed. At least ours are only measured by height.',
        ],
      },
      {
        lines: [
          'Every child in Mossgate is written in the Seed Ledger as a seedling. Every season, they are measured.',
          'At the notch-post by the Knot Well. A seedling that has not grown a finger since last season is "stunted".',
          'Mine are twins, and it was a hungry winter. They are exactly where they were. Exactly. To the hair.',
        ],
      },
    ],
    barks: [
      { when: EMPRESS, lines: ['Burn it all!'] },
      { lines: ['Stand up straight, both of you.', 'A finger. Just one finger.', 'Burdock, Bryony — here.'] },
    ],
  },

  // ── Tobias Hollin (only after the Empress falls) ──────────────────
  {
    id: 'mossgate-tobias', name: 'Tobias Hollin', title: 'Unpicked from the Hedges', at: AT.tobias,
    present: EMPRESS,
    look: { body: 0xa88a6a, accent: 0x4a7a34, hat: 'wreath', traits: ['beard', 'bandage'], size: 1.1, eye: 0xc8f0a8 },
    talks: [
      {
        when: { questDone: 'mossgate-short-weight' },
        lines: [
          'Maud says you stopped them taking Fennel. I was a hedge at the time, so I could not say thank you.',
          'I am saying it now. My hand is still bark. It will shake yours anyway. There. Rough, is it? Sorry.',
        ],
      },
      {
        lines: [
          'I was in the Bloom orangery a month, then the Glasshouse. They clip you every morning. It does not hurt.',
          'That is the worst of it. It does not hurt. You just get greener and quieter, and quieter, and greener.',
          'Then one morning the shears stopped, and somebody was pulling the roots out of my feet. Here I am.',
        ],
      },
    ],
    barks: [{ lines: ['Shoes. Shoes are strange.', 'Is it spring? It smells like spring.'] }],
  },

  // ── Primrose Burrows (once the Ladies have fetched her home) ──────
  {
    id: 'mossgate-primrose', name: 'Primrose Burrows', title: 'Thirty Years a Hedge', at: AT.primrose,
    present: { flag: 'wendeline-hive-3' },
    look: { body: 0xb8a088, accent: 0xe8d870, hat: 'wreath', traits: ['scarf'], size: 0.92, eye: 0xf0e8a0 },
    talks: [
      {
        when: { flag: 'wendeline-hive-4' },
        lines: [
          'She took the veil off. Did you see? Thirty years. She has got old. She has got old looking for me.',
          'I keep telling her I am sorry and she keeps putting honey in my mouth so I cannot finish.',
        ],
      },
      {
        lines: [
          'Is there honey? — There is always honey here. I like it here. It is warm, and it smells of bread.',
          'The bees came every day. Thirty years. Into my flowers, out again. I thought they were dreams.',
          'They were Wendy\'s. They were always Wendy\'s. She sent them every day and did not know she was sending them.',
        ],
      },
    ],
    barks: [{ lines: ['Is there honey?', 'Wendy. Wendy, sit down.', 'Bread smells like a person.'] }],
  },
];

// ── The crowd ────────────────────────────────────────────────────────

const CROWD_LOOKS: NpcLook[] = [
  { body: 0xb08a6a, accent: 0x4a6a2e, hat: 'straw', traits: ['satchel'] },
  { body: 0xc8a08a, accent: 0x7a4a5a, hat: 'wreath' },
  { body: 0x8a6a52, accent: 0x3a4a2a, hat: 'beanie', traits: ['pack'], size: 1.15 },
  { body: 0xd0aa90, accent: 0x5a6a3a, hat: 'none', traits: ['apron'] },
  { body: 0x9a7a62, accent: 0x6a4a2a, hat: 'hood', traits: ['cane'] },
  { body: 0xb89878, accent: 0x2e5a4a, hat: 'cap', traits: ['tool'] },
  { body: 0xc89a82, accent: 0x8a7a2a, hat: 'none', size: 0.74 },
  { body: 0xa88a7a, accent: 0x4a3a2a, hat: 'straw', traits: ['rod'] },
];

export const MOSSGATE_CROWD: { count: number; looks: NpcLook[]; paths: Pt[][]; barks: Talk[] } = {
  count: 13,
  looks: CROWD_LOOKS,
  paths: [
    // The Pith: the long street down the middle of the hollow trunk.
    [{ x: 1300, y: 160 }, { x: 1300, y: 500 }, { x: 1300, y: 860 }, { x: 1300, y: 1120 }, { x: 1300, y: 700 }],
    // The quay under the root-arches.
    [{ x: 640, y: 1200 }, { x: 1100, y: 1214 }, { x: 1700, y: 1176 }, { x: 2300, y: 1210 }],
    // The tithe queue: round the scales and back up into the trunk.
    [{ x: 1460, y: 1120 }, { x: 1760, y: 1120 }, { x: 1790, y: 1240 }, { x: 1480, y: 1250 }],
    // The Westknot lane, out to the Leaflitter and back.
    [{ x: 1200, y: 760 }, { x: 680, y: 756 }, { x: 330, y: 760 }, { x: 140, y: 740 }],
    // The Eastknot lane, out past the drying racks.
    [{ x: 1400, y: 760 }, { x: 1920, y: 756 }, { x: 2300, y: 760 }, { x: 2460, y: 740 }],
    // Round the Leaflitter's logs.
    [{ x: 160, y: 420 }, { x: 420, y: 470 }, { x: 460, y: 900 }, { x: 160, y: 960 }],
    // Burrow Row in the east quarter.
    [{ x: 2120, y: 380 }, { x: 2440, y: 460 }, { x: 2440, y: 960 }, { x: 2120, y: 940 }],
    // Inside the trunk, along the east wall past the Emporium.
    [{ x: 1600, y: 300 }, { x: 1740, y: 700 }, { x: 1700, y: 960 }, { x: 1500, y: 640 }],
  ],
  barks: [
    { when: EMPRESS, lines: [
      'The scales are just standing there!', 'My uncle walked home with a rose growing out of his ear.',
      'Agnes is meeting every one of them at the quay.', 'Nobody weighed anything today. NOTHING.', 'The shoot has four leaves now.',
    ] },
    { when: princes(4), lines: [
      'Four courts free!', 'The cart did not come for the Marchbanks.', 'They say the Empress is pruning her own hedges at night.',
    ] },
    { when: { prince: 'petalis' }, lines: [
      'The Bloom prince is down!', 'No cart from the orangery this week.', 'Shh — not by the scales.',
    ] },
    { lines: [
      'Weighing Day. Weighing Day.', 'Is your basket heavy enough?', 'They took the Pollens\' girl last spring.',
      'Mind the root, it humps.', 'Mullet on the Crook this morning.', 'Keep your tithe dry.', 'A finger a season, or the notch.',
    ] },
  ],
};
