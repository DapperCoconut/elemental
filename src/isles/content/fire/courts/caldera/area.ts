import type { AreaDef, NpcDef, NpcLook, Talk } from '../../../../IslesTypes';
import { CAL } from './palette';
import { H, KEEP, KILN_DOOR, LAKE, W } from './layout';
import { SOLIDS } from './layout';
import { makeCalderaPainter } from './painter';

/**
 * The Caldera Court — inside the crater on Brandmark's peak. Prince Basalt keeps the miners
 * of the forge camp cutting obsidian for his father's Kiln, whose sealed door stands on the
 * north rim. Everyone here is tired, hot, and counting.
 */

const KING = { monarch: 'ashgrave' };
const PRINCE = { prince: 'basalt' };

// ── People ───────────────────────────────────────────────────────────

const scoria: NpcDef = {
  id: 'caldera-scoria',
  name: 'Mother Scoria',
  title: 'Commissary Keeper',
  look: { body: 0x8a6a56, accent: 0x3a3436, hand: 0x6a4e3e, hat: 'bandana', traits: ['apron', 'glasses', 'brand'], size: 1.1 },
  at: { x: 690, y: 1455 },
  role: { kind: 'shop', id: 'caldera-shop' },
  talks: [
    { when: KING, lines: [
      'The King is gone and I still open at the bell. Habit. Also, people still need buckets.',
      'Prices are down. Nobody is docking wages for "glass breakage" anymore, so I can afford to be kind.',
    ] },
    { when: PRINCE, lines: [
      'You did it. The tower bell has not rung all day. Do you know how loud quiet is?',
      'Charms are on the counter. I will not give them away — I have grandchildren — but I will smile while I sell.',
    ] },
    { when: { questDone: 'caldera-quota' }, lines: [
      'Pell\'s crew made tally because of you. They bought nothing but bread with the coin. Good.',
      'Charms on the counter. Pick wisely — down here the clever ones live longer than the strong ones.',
    ] },
    { lines: [
      'Commissary. Everything a miner needs and nothing a miner can afford.',
      'I am not the one who sets the prices. The Prince takes a cut of the cut. Buy anyway — the charms work.',
      'Fish? I buy fish. Lava fish fetch a good price, if you are fool enough to catch one.',
    ] },
  ],
  barks: [
    { when: PRINCE, lines: ['Half price on buckets! Celebration buckets!'] },
    { lines: ['Buckets, picks, charms. No credit.', 'Mind the glass on the counter, it bites.', 'Another day, another tithe.'] },
  ],
};

const pell: NpcDef = {
  id: 'caldera-pell',
  name: 'Pell Greywick',
  title: 'Crew Chief',
  look: { body: 0x7a5e4a, accent: 0x4a4a4e, hand: 0x5a4434, hat: 'helmet', traits: ['tool', 'brand', 'bandage'], size: 1.05 },
  at: { x: 470, y: 1400 },
  talks: [
    { when: KING, lines: [
      'We are cutting glass again. Our own glass. For windows. Down in the Hearth, for people who asked nicely.',
      'Turns out I like cutting when nobody is counting.',
    ] },
    { when: PRINCE, lines: [
      'Picks down. That was the best order I ever gave.',
      'Some of the crews are walking down to the Hearth to see family. First time in years.',
    ] },
    { when: { questDone: 'caldera-quota' }, lines: [
      'We made tally, and nobody rode the cart. I will remember your face when I am old.',
      'If you are going after the Prince... the crews are with you. Quietly. But with you.',
    ] },
    { lines: [
      'Crew chief. Which means I am the one who tells the Prince why we are short.',
      'Short crews ride the cart up to the Kiln door. They do not ride back.',
    ] },
  ],
  barks: [
    { when: PRINCE, lines: ['Picks down, all of you!', 'Somebody fetch the kid a cake.'] },
    { lines: ['Five short. Always five short.', 'Swing from the hip, not the shoulder.', 'Do not look at the tower.'] },
  ],
};

const joss: NpcDef = {
  id: 'caldera-joss',
  name: 'Old Joss Kettleback',
  title: 'Camp Smith',
  look: { body: 0x6a4a3a, accent: 0x2a2626, hand: 0x3a2a22, hat: 'none', traits: ['beard', 'apron', 'tool'], size: 1.25 },
  at: { x: 880, y: 1590 },
  talks: [
    { when: KING, lines: [
      'I am making a plough. A plough! On a volcano! There is nothing to plough. I do not care. It is a plough.',
    ] },
    { when: PRINCE, lines: [
      'I sharpened picks for that man for twenty years. Today I melted three of them down for door hinges.',
      'There is one door left, up on the rim. My hinges will not help you with that one.',
    ] },
    { when: { questDone: 'caldera-waterboy' }, lines: [
      'The trough fills when it rains now. The boy stands under it with his mouth open. Leave him be.',
      'Quench water, too. My blades have not been this good since I was young.',
    ] },
    { lines: [
      'Smith. I keep the picks sharp and the chains mended. The Prince likes the chains mended.',
      'You want to be useful? Find the boy, Wren. He has a plan. He always has a plan.',
    ] },
  ],
  barks: [
    { when: PRINCE, lines: ['Hinges! Everyone needs hinges!'] },
    { lines: ['*clang*  ...  *clang*', 'Pass the tongs.', 'Too dry. Steel likes a drink.'] },
  ],
};

const wren: NpcDef = {
  id: 'caldera-wren',
  name: 'Wren Pumicefoot',
  title: 'Water Runner',
  look: { body: 0xa07a5a, accent: 0x5c7a96, hand: 0x7a5a42, hat: 'cap', traits: ['satchel', 'brand'], size: 0.72 },
  at: { x: 1010, y: 1520 },
  wander: 90,
  talks: [
    { when: KING, lines: [
      'I went down to the sea! The REAL sea! It is like the lake but it does not want to kill you!',
      'Mostly. Tamsin says mostly.',
    ] },
    { when: PRINCE, lines: [
      'You beat the PRINCE. You beat the actual prince. Joss says I am not allowed to try it too.',
    ] },
    { when: { questDone: 'caldera-waterboy' }, lines: [
      'The trough is full! I can fill every bucket in two trips now. I timed it.',
      'I am going to be a rainmaker when I grow up. A nice one.',
    ] },
    { lines: [
      'I am Wren. I carry the water. The buckets are bigger than me but I have a system.',
      'The system is running.',
    ] },
  ],
  barks: [
    { when: PRINCE, lines: ['No more cart! No more cart!'] },
    { lines: ['Water! Water coming through!', 'Hot hot hot hot.', 'I can carry two if nobody watches.'] },
  ],
};

const clinker: NpcDef = {
  id: 'caldera-clinker',
  name: 'Overseer Clinker',
  title: 'The Prince\'s Tally',
  look: { body: 0x5a5560, accent: 0x1f1d24, hand: 0x3a3640, hat: 'helmet', traits: ['book', 'brand', 'glasses'], size: 1.0, eye: 0xffd27a },
  at: { x: 540, y: 960 },
  talks: [
    { when: KING, lines: [
      'I count different things now. Children back from the Hearth. Windows with glass in them.',
      'It is a much better tally. The numbers only go up.',
    ] },
    { when: PRINCE, lines: [
      'I burned the tally board. Eleven years. It went up like paper.',
      'I would like to say I was only following orders. I was. That is the trouble with it.',
    ] },
    { when: { questDone: 'caldera-quota' }, lines: [
      'Pell\'s crew made tally. I ticked it. I would tick it again.',
      'Do not tell the Prince I said that. Do not tell anybody.',
    ] },
    { when: { courtReady: 'caldera' }, lines: [
      'Every champion in the crater, down. I counted. Of course I counted.',
      'I have something to ask you. Something I have wanted to ask for a long time.',
    ] },
    { lines: [
      'Clinker. Overseer. I count blocks, crews, hours, carts. The Prince likes counting. So I count.',
      'Do not stand there looking at the quarry. Every minute standing is a block not cut.',
    ] },
  ],
  barks: [
    { when: PRINCE, lines: ['...Nothing to count.'] },
    { lines: ['Forty-one. Forty-two.', 'Quota, quota, quota.', 'Keep the golem away from the stacks.'] },
  ],
};

const ysolde: NpcDef = {
  id: 'caldera-ysolde',
  name: 'Ysolde',
  title: 'Sulphur-Reader',
  look: { body: 0x8a7a4a, accent: 0xe4d94a, hand: 0x6a5a34, hat: 'veil', traits: ['scarf', 'lantern'], size: 0.95, eye: 0xfff3a0 },
  at: { x: 1420, y: 545 },
  talks: [
    { when: KING, lines: [
      'The vents are quiet now. Not silent — content. I did not know they could be content.',
    ] },
    { when: PRINCE, lines: [
      'He cracked, did he not? When he boiled over. The vents told you. The vents always tell.',
      'Now there is only the door. The vents will not speak of the door. They are afraid of it.',
    ] },
    { when: { questDone: 'caldera-omens' }, lines: [
      'Wait for the crack. Wait for the crack. I say it to myself at night, for you.',
    ] },
    { lines: [
      'Smell that? Rotten eggs and prophecy. Nine years I have listened to these vents.',
      'They gossip about the Prince. Terrible gossips, vents. Mostly right.',
    ] },
  ],
  barks: [
    { lines: ['Shh. The vent is talking.', 'Breathe through your sleeve.', 'Yellow means yes.'] },
  ],
};

const ferro: NpcDef = {
  id: 'caldera-ferro',
  name: 'Ferro Lavaline',
  title: 'Lava Angler',
  look: { body: 0x9a5a3a, accent: 0x2a2626, hand: 0x5a3422, hat: 'straw', traits: ['rod', 'pipe', 'eyepatch'], size: 1.0 },
  at: { x: 1730, y: 955 },
  talks: [
    { when: KING, lines: [
      'They are calling me "the angler of the crater" down in Emberport. They are buying my carp, too.',
      'I always knew lava fishing would catch on.',
    ] },
    { when: PRINCE, lines: [
      'The Prince used to come down to the jetty and watch me fish. Never said a word. Just watched.',
      'I think he wanted to be something that floated. Well. He is not floating now.',
    ] },
    { when: { questDone: 'caldera-hooked' }, lines: [
      'Gar season is nearly over. Come back anyway — the carp do not have seasons, they have moods.',
    ] },
    { lines: [
      'Lava fishing. You need an obsidian rod — anything else is a torch with ambitions.',
      'The patch, before you ask: a magma carp. I leaned over. Do not lean over.',
    ] },
  ],
  barks: [
    { lines: ['Bite, you beauty. Bite.', 'Do not lean over.', 'Felt a gar nibble. Felt it.'] },
  ],
};

const ashlock: NpcDef = {
  id: 'caldera-ashlock',
  name: 'Doorwarden Ashlock',
  title: 'Keeper of the Kiln Door',
  look: { body: 0x3a2e2e, accent: 0x6a2a14, hand: 0x1a1414, hat: 'helmet', traits: ['brand', 'mask', 'lantern'], size: 1.3, eye: 0xff7a2f },
  at: { x: 1095, y: 385 },
  talks: [
    { when: KING, lines: [
      'The door is open and the fire is out. Forty years I kept it, and now I do not know what to do with my hands.',
      'Perhaps I will learn to fish.',
    ] },
    { when: { princesOfIsle: 'fire', count: 6 }, lines: [
      'All six locks have gone dark. The King\'s children are fallen, every one.',
      'The door will open for you now. Inside is the Kiln, and he is waiting at the top of it.',
      'I will not stop you. I am not sure I ever could have.',
    ] },
    { when: PRINCE, lines: [
      'The Prince\'s lock has gone dark — the red one. I saw it go out from here.',
      'Count the others. Every one must be dark before this door will move.',
    ] },
    { lines: [
      'This is the Kiln door. Six locks, one for each of the King\'s children. Each burns while its prince stands.',
      'No hand opens it. No ram, no key. Only six dark locks.',
      'Do not ask me what is behind it. You have seen the carts. You know.',
    ] },
  ],
  barks: [
    { when: KING, lines: ['...I could paint it. The door. Something cheerful.'] },
    { lines: ['Stand back from the door.', 'Six locks. Count them.', 'The door is warm. It is always warm.'] },
  ],
};

const NPCS: NpcDef[] = [scoria, pell, joss, wren, clinker, ysolde, ferro, ashlock];

// ── Crowd ────────────────────────────────────────────────────────────

const MINER_LOOKS: NpcLook[] = [
  { body: 0x7a5a46, accent: 0x4a4a4e, hat: 'helmet', traits: ['tool', 'brand'] },
  { body: 0x6a4e3e, accent: 0x3a3436, hat: 'bandana', traits: ['brand', 'bandage'] },
  { body: 0x8a6a52, accent: 0x5a5250, hat: 'helmet', traits: ['pack', 'brand'], size: 1.1 },
  { body: 0x5e4a3e, accent: 0x2a2626, hat: 'cap', traits: ['brand', 'satchel'], size: 0.9 },
  { body: 0x9a7a5e, accent: 0x6a2a14, hat: 'hood', traits: ['brand', 'scarf'] },
];

const CROWD_BARKS: Talk[] = [
  { when: KING, lines: [
    'I am going to sleep for a week.', 'Glass for windows! Our windows!', 'The Kiln is cold. I touched the door.',
    'My brand is just a scar now.',
  ] },
  { when: PRINCE, lines: [
    'No bell today.', 'Is it true? The Prince?', 'I put my pick down and nobody shouted.', 'The lock went dark — I saw it!',
  ] },
  { lines: [
    'Hot.', 'Mind the crust.', 'Clinker is counting again.', 'Keep your head down near the tower.',
    'Two more blocks and I can eat.', 'The cart went up again this morning.', 'Do not look at the door.',
  ] },
];

// ── The area ─────────────────────────────────────────────────────────

export const CALDERA_AREA: AreaDef = {
  id: 'caldera',
  isle: 'fire',
  court: 'caldera',
  name: 'The Caldera Court',
  subtitle: 'Inside the crater, where the King\'s glass is cut',
  w: W,
  h: H,
  bg: CAL.obsidian,
  accent: 0xff5a1a,
  weather: 'embers',
  spawn: { x: 1200, y: 1680 },
  painter: makeCalderaPainter(),
  solids: SOLIDS,
  exits: [
    { side: 's', to: 'hearth', label: 'Down to the Hearth Court' },
  ],
  pois: [
    { kind: 'encounter', id: 'caldera-crust-walk' },
    { kind: 'encounter', id: 'caldera-eruption-clock' },
    { kind: 'encounter', id: 'caldera-cooling-rain' },
    { kind: 'encounter', id: 'caldera-magma-tide' },
    { kind: 'encounter', id: 'caldera-pumice-brawl' },
    { kind: 'prince', id: 'basalt', at: { x: KEEP.x, y: KEEP.y + 62 } },
    { kind: 'waystone', at: { x: 1300, y: 1650 } },
    {
      kind: 'door',
      at: { x: KILN_DOOR.x, y: KILN_DOOR.y + 36 },
      to: 'kiln',
      arrive: { x: 900, y: 2480 },
      label: 'The Kiln',
      open: { princesOfIsle: 'fire', count: 6 },
      lockedText: 'Six locks bind the Kiln door, one burning for each of the King\'s children. All six princes must fall first.',
    },
    { kind: 'water', id: 'caldera-lava', shape: { x: LAKE.x, y: LAKE.y, w: LAKE.w, h: LAKE.h }, fishery: 'caldera-lava' },
    { kind: 'sign', at: { x: 1255, y: 1530 }, text: 'North: the Prince\'s keep and the Kiln door. West: the forge camp and quarry. East: the lake.' },
    { kind: 'sign', at: { x: 1255, y: 1185 }, text: 'Crust bridge. Walk, do not stop. — by order of the Overseer' },
    { kind: 'chest', id: 'caldera-chest-vents', at: { x: 2250, y: 410 }, coins: 120, orbs: 1 },
    { kind: 'chest', id: 'caldera-chest-quarry', at: { x: 120, y: 1100 }, coins: 90, open: { encounter: 'caldera-pumice-brawl' } },
  ],
  npcs: NPCS,
  crowd: {
    count: 7,
    looks: MINER_LOOKS,
    paths: [
      [{ x: 420, y: 1460 }, { x: 640, y: 1500 }, { x: 900, y: 1490 }, { x: 1100, y: 1470 }, { x: 760, y: 1470 }],
      [{ x: 1200, y: 1650 }, { x: 1195, y: 1300 }, { x: 1215, y: 900 }, { x: 1200, y: 700 }, { x: 1195, y: 1300 }],
      [{ x: 400, y: 1040 }, { x: 560, y: 1060 }, { x: 470, y: 960 }, { x: 250, y: 950 }],
      [{ x: 545, y: 1430 }, { x: 540, y: 1290 }, { x: 520, y: 1185 }, { x: 470, y: 1060 }, { x: 540, y: 1290 }],
      [{ x: 1260, y: 880 }, { x: 1450, y: 885 }, { x: 1680, y: 905 }, { x: 1450, y: 885 }],
    ],
    barks: CROWD_BARKS,
  },
};
