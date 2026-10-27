import type { AreaDef, NpcDef, NpcLook, Talk } from '../../../../IslesTypes';
import { HW } from './palette';
import {
  CX, GLASS_DOOR, H, HEARTROOM, MILL, POOL, PIPE_HEAD, SCALES, SHOP, SOLIDS, STAIR_FOOT, W,
} from './layout';
import { makeHeartwoodPainter } from './painter';

/**
 * The Heartwood Court — a city in and on a birch the size of a mountain. Its people live in
 * knot-holes on the trunk and owe the Bloom Tithe in sap: every household's spile must fill its
 * measure by the season's turn, weighed on the scales at the Lantern Ledge. A household that
 * falls short gets a white ring daubed round its knot. Then the pruners come, and the family is
 * walked up the trunk to the Glasshouse and grafted into the Empress's hedges — and Prince
 * Birchbark, who is half tree himself, has the bark grow shut over their door behind them.
 */

const EMPRESS = { monarch: 'verdigra' };
const PRINCE = { prince: 'birchbark' };

// ── People ───────────────────────────────────────────────────────────

const burl: NpcDef = {
  id: 'heartwood-burl',
  name: 'Tamsel Burl',
  title: 'Keeper of the Burl',
  look: { body: 0xb08a68, accent: 0x7c2f1d, hand: 0x8a6a4c, hat: 'cap', traits: ['apron', 'glasses'], size: 1.15 },
  at: { x: SHOP.x, y: SHOP.y + 48 },
  role: { kind: 'shop', id: 'heartwood-shop' },
  talks: [
    { when: EMPRESS, lines: [
      'The Glasshouse doors are open and the hedges are walking home. Mrs Ashlock came in for a charm. Mrs ASHLOCK.',
      'Ten years a privet and she still haggles. I gave it her for nothing. Don\'t tell her I can afford to.',
    ] },
    { when: PRINCE, lines: [
      'The prince is down and the knots he had grown shut are opening. You can hear them, at night. Like a sigh.',
      'Everything on the counter\'s the same price. Freedom doesn\'t make amber any cheaper to cut.',
    ] },
    { when: { questDone: 'heartwood-tithe' }, lines: [
      'Old Wren Larchmere\'s ring is scrubbed off. My mother sat with her every tithe-day for forty years. Thank you.',
      'Have a look at the wares. Pick something that\'ll keep you standing.',
    ] },
    { lines: [
      'Welcome to the Burl. Oldest knot on the trunk — the tree grew round my great-grandmother\'s counter.',
      'Charms worked from amber, bark and bone of birch. I buy fish too. Root-pool carp fetch a good price.',
      'Mind you don\'t lean on the walls. The tree feels it. The tree tells HIM.',
    ] },
  ],
  barks: [
    { when: PRINCE, lines: ['Open late! I can stay open late now!'] },
    { lines: ['The Burl, open for trade.', 'Amber by the bead or by the lump.', 'Don\'t lean on the bark.', 'Fish bought.'] },
  ],
};

const ottilie: NpcDef = {
  id: 'heartwood-ottilie',
  name: 'Ottilie Spurwheel',
  title: 'Millkeeper',
  look: { body: 0x9a7a62, accent: 0x3e4a3a, hand: 0x7a5a44, hat: 'bandana', traits: ['tool', 'apron'], size: 1.05 },
  at: { x: MILL.x - 60, y: MILL.y + 50 },
  talks: [
    { when: EMPRESS, lines: [
      'I took the blade off the arbor this morning. Took six of us. We\'re going to hang it in the Ledge as a gong.',
      'Every time somebody rings it, it\'ll say what it never got to say: nothing. Nothing at all.',
    ] },
    { when: PRINCE, lines: [
      'He kept the key to this padlock on a twig behind his ear. I saw it fall when you brought him down.',
      'I have it in my apron. I keep checking it\'s still there. It\'s a very small key for such a big fear.',
    ] },
    { when: { questDone: 'heartwood-mill' }, lines: [
      'Every wedge hammered home, and Kerf\'s gone back to sharpening his pencils. The mill sleeps.',
      'I grease it every week like I\'m told. Funny how the grease never quite reaches the arbor.',
    ] },
    { lines: [
      'This is the mill. The Empress had it built "for the day the tree stops giving". It has never once run.',
      'I keep it greased, by order. And I jam it with oak wedges every night, by me. Nobody\'s ordered me not to.',
      'If that blade ever turns, it\'s the boughs of the short households first. Then the tree. Then him.',
    ] },
  ],
  barks: [
    { when: PRINCE, lines: ['Little key. Big padlock. Ha.'] },
    { lines: ['Never run. Never.', 'Greased, chained, and jammed.', 'The whistle\'s gone green. Good.', 'Mind the blade.'] },
  ],
};

const larchmere: NpcDef = {
  id: 'heartwood-larchmere',
  name: 'Goody Wren Larchmere',
  title: 'Widow of the Low Knot',
  look: { body: 0xa89280, accent: 0x5a4a6a, hand: 0x887060, hat: 'hood', traits: ['cane', 'scarf'], size: 0.85 },
  at: { x: 770, y: 1185 },
  talks: [
    { when: EMPRESS, lines: [
      'My Tobin came home. Out of the Glasshouse, down the root stairs, still with leaves in his hair. Still my boy.',
      'He keeps watering himself at the pump. Habit, he says. I let him. He looks well on it.',
    ] },
    { when: PRINCE, lines: [
      'The prince fell and my door didn\'t heal shut. That\'s all I wanted. For my door to stay a door.',
      'I put the kettle on and it whistled and I didn\'t jump. First time in nine years.',
    ] },
    { when: { questDone: 'heartwood-tithe' }, lines: [
      'Whitlow\'s paint is scrubbed off and the measure\'s in. The scales took a carp for amber. Imagine.',
      'I keep touching the bark where the ring was. It\'s cold. Bark always is, where the paint\'s been.',
    ] },
    { lines: [
      'See the white ring round my knot? That\'s the tithe-mark. My spile came up short. Someone tapped it dry.',
      'Two more days to the season\'s turn. Then the pruners. My son went into the hedges three tithes back.',
      'I am eighty-one. I don\'t know what shape they\'d clip me into. Something bent, I expect.',
    ] },
  ],
  barks: [
    { when: PRINCE, lines: ['Still a door. Still a door.'] },
    { lines: ['Two days.', 'Tobin liked the autumn.', 'My spile was full on Sunday.', 'Who taps an old woman dry?'] },
  ],
};

const pollard: NpcDef = {
  id: 'heartwood-pollard',
  name: 'Weigher Ambrose Pollard',
  title: 'Tithe-Weigher',
  look: { body: 0x8a7a6a, accent: 0x2a3a2e, hand: 0x6a5a4a, hat: 'tophat', traits: ['book', 'glasses'], size: 1.1 },
  at: { x: SCALES.x + 26, y: SCALES.y + 50 },
  talks: [
    { when: EMPRESS, lines: [
      'I melted my weights into a bell for the Ledge. It rings slightly flat. That seems right.',
      'Forty years I weighed what people owed. Now I weigh flour for the bakery on a Tuesday. It\'s much nicer.',
    ] },
    { when: PRINCE, lines: [
      'No prince, no tithe-day. I sat by the scales all morning out of habit. Nobody came. Nobody had to.',
    ] },
    { when: { questDone: 'heartwood-tithe' }, lines: [
      'The scales said amber, so it was amber. I don\'t argue with the scales. I simply... didn\'t look too closely.',
      'Carp scales and amber weigh much alike, if the weigher squints. I have always had poor eyes, you know.',
    ] },
    { lines: [
      'Every household\'s sap, weighed at the season\'s turn. Full measure, a nod. Short, a ring. Then the pruners.',
      'I don\'t make the measure. I only read the beam. The beam is very honest. I wish it were less so.',
      'Amber counts, if you\'ve no sap. Amber is sap that has had time to think about it.',
    ] },
  ],
  barks: [
    { when: PRINCE, lines: ['Nobody to weigh. Wonderful.'] },
    { lines: ['Full measure. Next.', 'The beam does not lie.', 'Amber counts.', 'Mind the pans.'] },
  ],
};

const mossjaw: NpcDef = {
  id: 'heartwood-mossjaw',
  name: 'Gaffer Mossjaw',
  title: 'Root-Pool Angler',
  look: { body: 0x7a6a52, accent: 0x3e5523, hand: 0x5a4a36, hat: 'straw', traits: ['rod', 'pipe', 'beard'], size: 1.1 },
  at: { x: POOL.x + POOL.w + 40, y: POOL.y + POOL.h - 10 },
  talks: [
    { when: EMPRESS, lines: [
      'The pipe\'s dug out and the pool\'s back up to the third root. The carp came out of hiding like old men.',
      'There\'s a trout in there now as long as my arm. I\'m not catching it. We have an understanding.',
    ] },
    { when: PRINCE, lines: [
      'The prince down, eh? The roots feel looser. Daft thing to say about roots. They do, though.',
    ] },
    { when: { questDone: 'heartwood-pool' }, lines: [
      'Mudge\'s valve is bent shut and the pool\'s rising. You can see the waterline creeping up the moss.',
      'Bring your rod by any time. Amber carp come up at dusk, if you\'re quiet.',
    ] },
    { lines: [
      'Root pool. Spring comes up through the Heartwood\'s own roots — taste it, it\'s sweet. Little sap in it.',
      'Sapling trout in the shallows, chub down by the rootworms, and amber carp if you\'re lucky. Any rod\'ll do.',
      'Except it\'s dropping. Look at the moss. Something\'s drinking my pool, and I know which something.',
    ] },
  ],
  barks: [
    { lines: ['Shh. They\'re rising.', 'Pool\'s down again.', 'Sweet water, this.', 'Tch. That pipe.'] },
  ],
};

const bryony: NpcDef = {
  id: 'heartwood-bryony',
  name: 'Herbwife Bryony Catkin',
  title: 'Bark-Doctor',
  look: { body: 0x9a8a6a, accent: 0x55662a, hand: 0x7a6a4a, hat: 'wreath', traits: ['satchel', 'tool'], size: 0.95, eye: 0xdff0b0 },
  at: { x: 1560, y: 1300 },
  wander: 60,
  talks: [
    { when: EMPRESS, lines: [
      'I\'ve been called up to the Glasshouse to doctor the grafted. Unpicking a person from a hedge. Slowly.',
      'They come apart. They come back. Mostly they want soup. I\'ve learned to make a great deal of soup.',
    ] },
    { when: PRINCE, lines: [
      'The bark\'s knitting clean round the old taps now. The tree was ill under him. It feels it, when he\'s gone.',
    ] },
    { when: { questDone: 'heartwood-mistletoe' }, lines: [
      'Not one berry left on the low terrace. The Pinewicks\' spile ran full for the first time in a year.',
      'Mab\'s basket is in my fireplace. Burns very prettily. Don\'t breathe the smoke.',
    ] },
    { lines: [
      'Bark-doctor. I salve the splits and pull the bore-beetles. But there\'s a sickness I can\'t salve.',
      'Mistletoe. On the boughs over the poorest knots. It drinks a house\'s sap before the spile can catch it.',
      'Short houses get the ring. Ringed houses get pruned. And the mistletoe was never there before this year.',
    ] },
  ],
  barks: [
    { when: PRINCE, lines: ['Clean bark. Good bark.'] },
    { lines: ['Hold still, I\'m salving.', 'White berries. Sticky.', 'Someone\'s planting it.', 'Poor tree.'] },
  ],
};

const twig: NpcDef = {
  id: 'heartwood-twig',
  name: 'Twig Ashlock',
  title: 'Climber',
  look: { body: 0xb89a7a, accent: 0xc9642b, hand: 0x987a5a, hat: 'beanie', traits: ['pack'], size: 0.7 },
  at: { x: 1120, y: 900 },
  wander: 120,
  talks: [
    { when: EMPRESS, lines: [
      'MY MUM\'S HOME. She was a privet. She says she doesn\'t remember. She keeps standing very straight, though.',
      'I climbed all the way to the Glasshouse dome and sat ON it. Sister Espalier didn\'t even shout.',
    ] },
    { when: PRINCE, lines: [
      'You beat the prince! I saw it from the east bough! He went over like a — like a tree! TIMBER!',
    ] },
    { when: { questDone: 'heartwood-mistletoe' }, lines: [
      'I told you it was the berry-lady! Nobody listens to the climber. EVERYBODY should listen to the climber.',
    ] },
    { lines: [
      'I can climb anywhere on the trunk. Even the eyes. You\'re not supposed to climb the eyes. They blink.',
      'My mum went into the hedges two tithes ago. I go up to the Glasshouse and wave. I don\'t know which one she is.',
      'Don\'t tell Sister Espalier I go up there. She does a face.',
    ] },
  ],
  barks: [
    { when: PRINCE, lines: ['TIMBER!'] },
    { lines: ['Race you up the stairs!', 'I saw the eye blink!', 'Wave at the Glasshouse.', 'Bet you can\'t climb the scar.'] },
  ],
};

const hazel: NpcDef = {
  id: 'heartwood-hazel',
  name: 'Rootwarden Hazel Underbough',
  title: 'Keeper of the Root Stairs',
  look: { body: 0x8a7a68, accent: 0x5a3a24, hand: 0x6a5a48, hat: 'hood', traits: ['cane', 'lantern', 'beard'], size: 1.2, eye: 0xffd76e },
  at: { x: STAIR_FOOT.x + 76, y: STAIR_FOOT.y + 6 },
  talks: [
    { when: EMPRESS, lines: [
      'The roots have stopped aching. I\'ve kept these stairs fifty years and I never knew the tree hurt till now.',
      'Go well, climber. Everyone who comes down the stairs this season comes down smiling. I count them.',
    ] },
    { when: { princesOfIsle: 'life', count: 6 }, lines: [
      'All six of her children down. The Glasshouse door at the crown will open for you now.',
      'Inside: the hedges, the shears, and her. Bring every one of them home, if you can. Bring them down my stairs.',
    ] },
    { when: { questDone: 'heartwood-birchbark' }, lines: [
      'Cinderby\'s torch is out in the root pool, hissing. The stairs are whole. The Heartroom stands empty.',
      'Every knot he grew shut is opening. Twenty-two households. I am going to sit on my stairs and weep a bit.',
    ] },
    { when: { courtReady: 'heartwood' }, lines: [
      'Every champion on the trunk, beaten. Even Mandible. The whole tree is holding its breath.',
      'I have something to ask you. I have been waiting forty years to ask it of anyone.',
    ] },
    { lines: [
      'Rootwarden. I keep the root stairs — who comes up, who goes down. Lately, mostly who goes up.',
      'The pruned go up these stairs with Sister Espalier and never come down. I sweep up the leaves they shed.',
      'Five champions hold the trunk for the prince. Beat them, and he will have to come out of his Heartroom.',
    ] },
  ],
  barks: [
    { when: PRINCE, lines: ['Mind the third rung.'] },
    { lines: ['Up or down?', 'Mind the third rung.', 'The roots are aching tonight.', 'Sweep, sweep.'] },
  ],
};

const espalier: NpcDef = {
  id: 'heartwood-espalier',
  name: 'Sister Espalier',
  title: 'Keeper of the Glasshouse Door',
  look: { body: 0x8a9a8a, accent: 0x2a5a4c, hand: 0x6a7a6a, hat: 'veil', traits: ['book', 'scarf'], size: 1.05, eye: 0xbfe6dc },
  at: { x: GLASS_DOOR.x - 104, y: GLASS_DOOR.y + 30 },
  talks: [
    { when: EMPRESS, lines: [
      'I walked them in, every one. I have spent this week walking them out. It is the same door. It is a different walk.',
      'The Order of the Trellis is disbanded. I am going to grow beans, and let them climb where they like.',
    ] },
    { when: { princesOfIsle: 'life', count: 6 }, lines: [
      'All six iron buds on the door have opened. The Empress\'s children are fallen. The Glasshouse is unlocked.',
      'Inside is the Pruning Gallery. Then the Maze. Then the Nursery. Then her. Do not let them graft you.',
    ] },
    { when: PRINCE, lines: [
      'One bud on the door has opened. His. Five are still shut — one for each of his brothers and sisters.',
      'Until every bud is open, the door will not admit anyone who means to walk out again.',
    ] },
    { lines: [
      'Sister of the Trellis. I walk the pruned to this door and see them in. I tell them it will not hurt for long.',
      'Six iron buds on the door, one for each of the Empress\'s children. While any is shut, the door stays shut.',
      'I lie to them, about the hurting. It is the only kindness I am still allowed.',
    ] },
  ],
  barks: [
    { when: PRINCE, lines: ['One bud open.'] },
    { lines: ['Stand back from the glass.', 'Six buds. Count them.', 'They are breathing in there.', 'Hush.'] },
  ],
};

const NPCS: NpcDef[] = [burl, ottilie, larchmere, pollard, mossjaw, bryony, twig, hazel, espalier];

// ── Crowd ────────────────────────────────────────────────────────────

const TREE_LOOKS: NpcLook[] = [
  { body: 0xb09478, accent: 0x7c2f1d, hat: 'cap', traits: ['satchel'] },
  { body: 0xa08a70, accent: 0x55662a, hat: 'wreath', traits: ['scarf'] },
  { body: 0x9a8268, accent: 0x5a4329, hat: 'none', traits: ['tool', 'apron'], size: 1.1 },
  { body: 0xb8a088, accent: 0xc9642b, hat: 'beanie', traits: ['pack'], size: 0.8 },
  { body: 0x8a7660, accent: 0x3e5523, hat: 'hood', traits: ['lantern'] },
  { body: 0xa89070, accent: 0xa65a0b, hat: 'straw', traits: ['rod'], size: 0.95 },
];

const CROWD_BARKS: Talk[] = [
  { when: EMPRESS, lines: [
    'My aunt came down from the Glasshouse!', 'She still has a bit of box hedge on her elbow.',
    'No tithe-day this season!', 'Somebody scrubbed every ring off the trunk overnight.',
  ] },
  { when: PRINCE, lines: [
    'The knots are opening!', 'Did you hear him fall? The whole tree shook.', 'No ring-paint today.',
    'The Heartroom\'s empty. Kids are playing in it.',
  ] },
  { lines: [
    'Is your spile full?', 'Two days to the turn.', 'Don\'t lean on the bark.', 'The Pinewicks got ringed.',
    'Mind the third rung.', 'Did the eye just move?', 'Never heard the mill whistle. Never want to.',
    'Sap\'s running thin this year.',
  ] },
];

// ── The area ─────────────────────────────────────────────────────────

export const HEARTWOOD_AREA: AreaDef = {
  id: 'heartwood',
  isle: 'life',
  court: 'heartwood',
  name: 'The Heartwood Court',
  subtitle: 'A city on a birch the size of a mountain',
  w: W,
  h: H,
  bg: HW.canopy,
  accent: 0xe9bc33,
  weather: 'leaves',
  spawn: { x: CX, y: 1700 },
  painter: makeHeartwoodPainter(),
  solids: SOLIDS,
  exits: [
    { side: 's', to: 'bloom', label: 'Down through the roots to the Bloom Court' },
  ],
  pois: [
    { kind: 'encounter', id: 'heartwood-sap-tap' },
    { kind: 'encounter', id: 'heartwood-growth-rings' },
    { kind: 'encounter', id: 'heartwood-woodpecker' },
    { kind: 'encounter', id: 'heartwood-leaf-fall' },
    { kind: 'encounter', id: 'heartwood-termites' },
    { kind: 'prince', id: 'birchbark', at: { x: HEARTROOM.x + 25, y: HEARTROOM.y + 68 } },
    { kind: 'waystone', at: { x: 1320, y: 1700 } },
    {
      kind: 'door',
      at: { x: GLASS_DOOR.x, y: GLASS_DOOR.y },
      to: 'glasshouse',
      arrive: { x: 900, y: 2440 },
      label: 'The Glasshouse',
      open: { princesOfIsle: 'life', count: 6 },
      lockedText: 'Six iron buds bind the Glasshouse door, one for each of the Empress\'s children. It stays shut till all six open.',
    },
    { kind: 'water', id: 'heartwood-pool', shape: { x: POOL.x, y: POOL.y, w: POOL.w, h: POOL.h }, fishery: 'heartwood-pool' },
    { kind: 'sign', at: { x: 1270, y: 1560 }, text: 'UP: the root stairs, the Lantern Ledge and the crown. WEST: the root pool. EAST: the mill. Mind the third rung.' },
    { kind: 'sign', at: { x: PIPE_HEAD.x + 20, y: PIPE_HEAD.y - 70 }, text: 'PROPERTY OF THE GLASSHOUSE. This water is required for the Empress\'s hedges. Do not obstruct the pipe.' },
    { kind: 'sign', at: { x: MILL.x - 160, y: MILL.y + 30 }, text: 'THE MILL. Kept in readiness by order of the Empress, for the day the tree stops giving. Do not touch the chain.' },
    { kind: 'chest', id: 'heartwood-chest-loft', at: { x: 2130, y: 470 }, coins: 160, orbs: 1 },
    { kind: 'chest', id: 'heartwood-chest-mill', at: { x: 2230, y: 1690 }, coins: 130, open: { questDone: 'heartwood-mill' } },
  ],
  npcs: NPCS,
  crowd: {
    count: 9,
    looks: TREE_LOOKS,
    paths: [
      [{ x: CX, y: 1680 }, { x: CX, y: 1460 }, { x: CX - 20, y: 1300 }, { x: CX, y: 1460 }],
      [{ x: 1180, y: 1250 }, { x: 960, y: 1255 }, { x: 820, y: 1250 }, { x: 960, y: 1255 }],
      [{ x: 1230, y: 1250 }, { x: 1480, y: 1250 }, { x: 1640, y: 1240 }, { x: 1480, y: 1250 }],
      [{ x: 1080, y: 1060 }, { x: 1200, y: 1150 }, { x: 1320, y: 1080 }, { x: 1200, y: 960 }],
      [{ x: 1180, y: 880 }, { x: 900, y: 885 }, { x: 1180, y: 880 }, { x: 1460, y: 885 }],
      [{ x: CX + 30, y: 900 }, { x: CX + 30, y: 600 }, { x: CX + 30, y: 420 }, { x: CX + 30, y: 600 }],
      [{ x: 960, y: 1590 }, { x: 760, y: 1580 }, { x: 960, y: 1590 }, { x: 1150, y: 1600 }],
      [{ x: 1460, y: 1660 }, { x: 1700, y: 1640 }, { x: 1460, y: 1660 }, { x: 1250, y: 1640 }],
      [{ x: 1100, y: 500 }, { x: 860, y: 495 }, { x: 1100, y: 500 }, { x: 1330, y: 500 }],
    ],
    barks: CROWD_BARKS,
  },
};
