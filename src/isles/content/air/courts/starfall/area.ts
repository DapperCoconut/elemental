import type { AreaDef, NpcDef, NpcLook, Talk } from '../../../../IslesTypes';
import { SF } from './palette';
import { CX, H, LUNG_DOOR, METER_HOUSE, POOL, REGISTRY, SHOP, SIPHON, SOLIDS, TOWER, W } from './layout';
import { makeStarfallPainter } from './painter';

/**
 * The Starfall Court — the summit of Highspire, above the clouds, where it is always night. Its
 * people are astronomers by trade and by order: Prince Nova keeps the Ledger of Stars, in which
 * every soul on the isle has a star named for them at birth. Breath drawn above the cloud line is
 * metered dearest of all up here, where the air is thinnest; and when a household falls behind,
 * the Prince inks their star out of the chart. A snuffed star is a becalmed house — the collectors
 * come up the Cloudstair with their bottles, cork the debtors' breath, and carry it the last few
 * steps up the Last Stair to the Lung.
 */

const KING = { monarch: 'aerion' };
const PRINCE = { prince: 'nova' };

// ── People ───────────────────────────────────────────────────────────

const quillon: NpcDef = {
  id: 'starfall-quillon',
  name: 'Hesper Quillon',
  title: 'Keeper of the Almanac',
  look: { body: 0x9a90b8, accent: 0x3a2a8e, hand: 0x7a7098, hat: 'wizard', traits: ['glasses', 'book'], size: 1.05, eye: 0xffe08a },
  at: { x: SHOP.x, y: SHOP.y + 48 },
  role: { kind: 'shop', id: 'starfall-shop' },
  talks: [
    { when: KING, lines: [
      'The Lung\'s bottles are broken and the breath\'s gone back where it came from. My chest feels... roomy.',
      'I printed a new almanac. Same stars. I took out the column for "debts". It\'s a much thinner book.',
    ] },
    { when: PRINCE, lines: [
      'The Prince is down, and the Ledger\'s shut. I sold three star-charts this morning to people buying for fun.',
      'For FUN. Do you know how long it\'s been since anyone up here looked at the sky for fun?',
    ] },
    { when: { questDone: 'starfall-newstar' }, lines: [
      'Little Dot\'s nova is in my new edition. "Ashwick\'s Star". First star in forty years named by its finder.',
      'Have a look at the wares. Everything up here is made of something that fell.',
    ] },
    { lines: [
      'Welcome to the Almanac. Star-charts, tide-tables for the cloud sea, and charms ground from fallen glass.',
      'I buy fish. The Starpool kind — they keep their light for a week if you salt them.',
      'Breathe slowly in here. The meter-men count from the door. I don\'t charge for browsing; the King does.',
    ] },
  ],
  barks: [
    { when: PRINCE, lines: ['Charts! For looking at!'] },
    { lines: ['Almanacs, this year\'s.', 'Mind your breath.', 'Fish bought, Starpool only.', 'Fallen-glass charms.'] },
  ],
};

const dimm: NpcDef = {
  id: 'starfall-dimm',
  name: 'Registrar Ptolemy Dimm',
  title: 'Keeper of the Registry',
  look: { body: 0x8a8aa0, accent: 0x2a2d40, hand: 0x6a6a80, hat: 'tophat', traits: ['book', 'glasses', 'cane'], size: 1.1 },
  at: { x: REGISTRY.x + 60, y: REGISTRY.y + 60 },
  talks: [
    { when: KING, lines: [
      'I have taken the ink out of the Registry. All of it. Every pot. I poured it off the rim into the clouds.',
      'The plaques are going back up, polished. Snuffed or not. A star is still a star when you can\'t see it.',
    ] },
    { when: PRINCE, lines: [
      'No Prince, no snuffings. I sat at the Ledger all night with the pen in my hand and wrote nothing at all.',
      'It was the best night\'s work I have done in thirty years.',
    ] },
    { when: { questDone: 'starfall-snuffed' }, lines: [
      'Brightwell\'s star is re-lit in the Ledger and Quire\'s pen is in a drawer I have lost the key to.',
      'I should have checked his spike years ago. I am a registrar. I register. I did not want to look.',
    ] },
    { lines: [
      'The Registry of Stars. Every soul on Highspire has a star in here, named at birth. Yours too, I expect.',
      'Pay your breath and your plaque shines. Fall behind and the Prince inks it out. Then the collectors come.',
      'I only keep the books. My clerk does the inking. I try not to watch him do it.',
    ] },
  ],
  barks: [
    { when: PRINCE, lines: ['Not one star inked tonight.'] },
    { lines: ['Name and date of birth?', 'The Ledger is closed to the public.', 'Mind the plaques.', 'Ink, always ink.'] },
  ],
};

const brightwell: NpcDef = {
  id: 'starfall-brightwell',
  name: 'Lyra Brightwell',
  title: 'Lens-Grinder\'s Wife',
  look: { body: 0xa898b0, accent: 0x6a4cff, hand: 0x887890, hat: 'veil', traits: ['scarf', 'satchel'], size: 0.95, eye: 0xb9a6ff },
  at: { x: 870, y: 1620 },
  talks: [
    { when: KING, lines: [
      'They broke the bottles in the Lung and Corvin sat up. Just sat up, and asked what day it was.',
      'I told him eleven weeks. He said he\'d had the strangest dream about being a draught under a door.',
    ] },
    { when: PRINCE, lines: [
      'The Prince has fallen. Corvin\'s still asleep — his breath is still up in the Lung, in a bottle with his name.',
      'But nobody\'s coming to take mine. I can sit with him without counting. That\'s something.',
    ] },
    { when: { questDone: 'starfall-snuffed' }, lines: [
      'The Ledger says Corvin\'s star is lit. Paid in full. It always WAS paid in full.',
      'They\'ll bring his bottle down from the Lung, Dimm says. Once someone\'s brave enough to go and ask for it.',
    ] },
    { lines: [
      'My Corvin grinds lenses. Ground them. He paid every breath on the nail — I have the receipt stub, look.',
      'And still they snuffed his star, and the collectors corked him, and he\'s lying in there barely breathing.',
      'I haven\'t the breath to argue with the Registry. Every word costs, up here. I\'ve been saving them.',
    ] },
  ],
  barks: [
    { when: PRINCE, lines: ['Sleep easy, love. Nobody\'s counting.'] },
    { lines: ['Paid in full.', 'He\'s barely breathing.', 'I kept the stub.', 'Every word costs.'] },
  ],
};

const halloran: NpcDef = {
  id: 'starfall-halloran',
  name: 'Old Halloran Tail',
  title: 'Starpool Angler',
  look: { body: 0x7a7488, accent: 0x3f8fc4, hand: 0x5a5468, hat: 'aviator', traits: ['rod', 'pipe', 'beard'], size: 1.1 },
  at: { x: POOL.x - 30, y: POOL.y + POOL.h - 10 },
  talks: [
    { when: KING, lines: [
      'The pool\'s brighter than I\'ve ever seen it. All the light the King had bottled ran back downhill. Into here.',
      'I caught a perch last night that lit up the whole of my hut. I put it back. Felt rude not to.',
    ] },
    { when: PRINCE, lines: [
      'Prince down, eh? The comets are running thick tonight. They always did love a bit of chaos.',
    ] },
    { when: { questDone: 'starfall-starpool' }, lines: [
      'Siphon\'s out and the pool\'s filling back up with light. You can see your face in it again. More\'s the pity.',
      'Bring the skyline rod by any night. It\'s always night. That\'s the best thing about up here.',
    ] },
    { lines: [
      'The Starpool. Not water — starlight, pooled up where it fell and cooling. You need the skyline rod for it.',
      'Comet minnows in the shallows, nebula rays gliding, and meteor perch at the bottom, heavy as sin.',
      'Mind, the pool\'s been going dim. The lampwrights stuck copper in it. Says it\'s for the Lung\'s lamps.',
    ] },
  ],
  barks: [
    { lines: ['Shh. Comets running.', 'Pool\'s dim again.', 'Skyline rod or nothing.', 'Tch. That copper.'] },
  ],
};

const dot: NpcDef = {
  id: 'starfall-dot',
  name: 'Dot Ashwick',
  title: 'Stargazer, aged nine',
  look: { body: 0xb0a8c0, accent: 0xffe08a, hand: 0x9088a0, hat: 'beanie', traits: ['satchel', 'glasses'], size: 0.7, eye: 0xffffff },
  at: { x: 1380, y: 1500 },
  wander: 80,
  talks: [
    { when: KING, lines: [
      'I went up the Last Stair and into the Lung. It\'s just a big windmill inside. With bottles. LOTS of bottles.',
      'We broke them. Mum broke forty. I broke a hundred and six. I counted. Astronomers count.',
    ] },
    { when: PRINCE, lines: [
      'You put out the Prince! Like a candle! Ffff! I watched through Grandad\'s scope the whole time.',
    ] },
    { when: { questDone: 'starfall-newstar' }, lines: [
      'It\'s called ASHWICK\'S STAR. In the real almanac! Not "Ill Wind". Just mine. Well — ours.',
      'Professor Sextant says when I\'m grown I can have a desk at the Registry. I said only if there\'s no ink.',
    ] },
    { lines: [
      'I found a new star! Look — there, past the Kite\'s tail. It wasn\'t there on Tuesday. Now it\'s BRIGHT.',
      'If you find one first you get to name it. That\'s the rule. Everybody knows that\'s the rule.',
      'Except Mum says the Prince owns every new light. Mum says don\'t say it too loud.',
    ] },
  ],
  barks: [
    { when: PRINCE, lines: ['Ffff! Out like a candle!'] },
    { lines: ['There! Past the Kite!', 'I saw it first.', 'Astronomers count.', 'Don\'t breathe on the lens.'] },
  ],
};

const sconce: NpcDef = {
  id: 'starfall-sconce',
  name: 'Ottoline Sconce',
  title: 'Starlighter',
  look: { body: 0x9a8a7a, accent: 0xc89a4a, hand: 0x7a6a5a, hat: 'plume', traits: ['lantern', 'pack', 'scarf'], size: 1.0, eye: 0xffe08a },
  at: { x: 1130, y: 1260 },
  wander: 90,
  talks: [
    { when: KING, lines: [
      'I lit every lantern on the summit tonight, ladder by ladder, and puffed as hard as I liked doing it.',
      'Puffed and PANTED. Out loud. Nobody wrote it down. I may never stop panting, just to make the point.',
    ] },
    { when: PRINCE, lines: [
      'The meter on my chest still ticks. But it ticks slower, I swear, now the Prince isn\'t there to read it.',
    ] },
    { when: { questDone: 'starfall-lamps' }, lines: [
      'Rime\'s off the frost-glass and my reading came down by half. Half! I\'d been paying his breath too.',
      'The lanterns are lit, my chest is out of the red, and I\'m going to climb a ladder just for the view.',
    ] },
    { lines: [
      'I light the star-lanterns. Up the ladder, catch a mote, cage it, down the ladder. Sixteen poles a night.',
      'Climbing costs breath. Breath costs coin. The meter-house reads me as if I ran up the Cloudstair twice.',
      'Another week in the red and I\'m becalmed. And then who lights the lanterns? Nobody. Dark summit.',
    ] },
  ],
  barks: [
    { when: PRINCE, lines: ['Ticking slower. I swear it.'] },
    { lines: ['Sixteen poles.', 'Don\'t make me climb that twice.', 'Mind the ladder.', 'My needle\'s in the red.'] },
  ],
};

const keel: NpcDef = {
  id: 'starfall-keel',
  name: 'Warden Aldous Keel',
  title: 'Keeper of the Last Stair',
  look: { body: 0x7a7a8a, accent: 0x2a2d40, hand: 0x5a5a6a, hat: 'helmet', traits: ['cane', 'lantern', 'beard'], size: 1.25, eye: 0x9ad6c6 },
  at: { x: LUNG_DOOR.x - 120, y: LUNG_DOOR.y + 40 },
  talks: [
    { when: KING, lines: [
      'The sails have stopped. First time in my life the summit\'s been quiet. It\'s loud, quiet. You get used to it.',
      'I\'m going to sit on the Last Stair and breathe. Big ones. As many as I like. Go well.',
    ] },
    { when: { princesOfIsle: 'air', count: 6 }, lines: [
      'All six of his children down. The six corks on the Lung\'s door have popped, every one.',
      'The door will open for you now. Inside: the bellows, the bottling floor, the vanes. And him, at the hub.',
      'Every bottle up there has somebody\'s breath in it. Break them. Bring the breath home.',
    ] },
    { when: { questDone: 'starfall-nova' }, lines: [
      'Corkwell\'s crates are rolling down the Cloudstair, empty. The Prince is down and the summit still breathes.',
      'One cork on the door has popped. His. Five more to go, one for each of his brothers and sisters.',
    ] },
    { when: { courtReady: 'starfall' }, lines: [
      'Every champion on the summit beaten. Even Betel let her star die. The whole court is holding its breath.',
      'Which, up here, is cheaper. I have something to ask you, and I\'ve waited a long time to ask it.',
    ] },
    { lines: [
      'Warden of the Last Stair. Everything that goes up to the Lung passes me: bottles, crates, collectors.',
      'Six corks seal that door, one for each of the King\'s children. While any holds, it won\'t open.',
      'Five champions hold the summit for Prince Nova. Beat them and he\'ll have to come down out of his tower.',
    ] },
  ],
  barks: [
    { when: PRINCE, lines: ['One cork popped.'] },
    { lines: ['Crates up, nothing down.', 'Mind the sails.', 'Six corks. Count them.', 'Listen to it breathe.'] },
  ],
};

const hobb: NpcDef = {
  id: 'starfall-hobb',
  name: 'Ansel Hobb',
  title: 'Keeper of the Cloud Line',
  look: { body: 0x8a8070, accent: 0xc89a4a, hand: 0x6a6050, hat: 'cap', traits: ['book', 'pipe', 'glasses'], size: 1.15 },
  at: { x: METER_HOUSE.x + 84, y: METER_HOUSE.y + 6 },
  talks: [
    { when: KING, lines: [
      'I took the meters off the arch with a crowbar. All of them. My arms are tired. My chest isn\'t. Odd, that.',
      'They want the arch for a gate to nowhere. Just to walk under. I said grand. Walk under it all day.',
    ] },
    { when: PRINCE, lines: [
      'Prince fell, and every meter on the arch dropped a notch at once. Like they all breathed out. Spooky.',
    ] },
    { when: { questDone: 'starfall-lamps' }, lines: [
      'The frost-glass reads clean now. Turns out it reads a lot less when the Assessor isn\'t breathing on it.',
      'I\'m not saying I knew. I\'m saying I didn\'t look. Up here that\'s practically the same thing.',
    ] },
    { lines: [
      'The Cloud Line. Below it, breath is taxed. Above it, it\'s taxed double. Thin air\'s dear, they say.',
      'Every chest past the arch gets read on the frost-glass. Breathe on it, the fog shows what you owe.',
      'Champions in the court, the Prince up his tower, the King\'s Lung above it all. Mind how you breathe.',
    ] },
  ],
  barks: [
    { when: PRINCE, lines: ['All the needles dropped. Huh.'] },
    { lines: ['Breathe on the glass, please.', 'Thin air\'s dear.', 'Over the line, double rate.', 'Next.'] },
  ],
};

const sextant: NpcDef = {
  id: 'starfall-sextant',
  name: 'Professor Almira Sextant',
  title: 'Astronomer Emerita',
  look: { body: 0xa8a0b8, accent: 0x5aa898, hand: 0x888098, hat: 'wizard', traits: ['glasses', 'book', 'cane'], size: 0.9, eye: 0xc8e8ff },
  at: { x: 780, y: 900 },
  wander: 40,
  talks: [
    { when: KING, lines: [
      'I taught the boy to read a chart. I am going to spend my last years teaching everyone else, for nothing.',
      'The first lesson: look up. That\'s all. The second lesson is the same, but longer.',
    ] },
    { when: PRINCE, lines: [
      'He was my pupil, you know. The quickest I ever had. He looked at the sky and saw a ledger.',
      'I looked at it and saw a sky. I should have made him look longer before I let him count.',
    ] },
    { when: { questDone: 'starfall-newstar' }, lines: [
      'Ashwick\'s Star. The plates were clean and the horoscope a forgery. Haze will never cast in this court again.',
      'Nine years old and a nova to her name. I was forty before I found anything but dust.',
    ] },
    { lines: [
      'Forty years on the Telescope before they gave it to Galilee. Now I read old plates and keep my mouth shut.',
      'The Prince was my pupil once. A gifted counter. He counts everything. Breaths, mostly.',
      'If you\'re here to look at the sky, look at it. If you\'re here to tax it, go away.',
    ] },
  ],
  barks: [
    { when: PRINCE, lines: ['Look up, child. Just look.'] },
    { lines: ['Plates, plates, plates.', 'He was a quick boy.', 'Look up.', 'That one\'s a double.'] },
  ],
};

const NPCS: NpcDef[] = [quillon, dimm, brightwell, halloran, dot, sconce, keel, hobb, sextant];

// ── Crowd ────────────────────────────────────────────────────────────

const SUMMIT_LOOKS: NpcLook[] = [
  { body: 0x9a94ac, accent: 0x3a2a8e, hat: 'wizard', traits: ['book'] },
  { body: 0x8a8498, accent: 0x5aa898, hat: 'aviator', traits: ['scarf'] },
  { body: 0xa49cb4, accent: 0xc89a4a, hat: 'none', traits: ['glasses', 'satchel'], size: 1.05 },
  { body: 0xb0a8c0, accent: 0x6a4cff, hat: 'beanie', traits: ['pack'], size: 0.8 },
  { body: 0x7a7488, accent: 0x2a2d40, hat: 'hood', traits: ['lantern'] },
  { body: 0x948ca4, accent: 0xd77ad8, hat: 'plume', traits: ['scarf'], size: 0.95 },
];

const CROWD_BARKS: Talk[] = [
  { when: KING, lines: [
    'I breathed in so hard I fell over!', 'The sails have stopped!', 'No meter. No meter at all.',
    'Uncle Fen came down from the Lung, yawning.',
  ] },
  { when: PRINCE, lines: [
    'Nobody\'s star got inked last night.', 'The tower\'s dark!', 'I named a star after my goat.',
    'Did you see the Prince go out? Like a match.',
  ] },
  { lines: [
    'Is your plaque still lit?', 'Breathe slow, love, breathe slow.', 'The Ashwicks\' nova\'s getting brighter.',
    'Collectors up the Cloudstair again.', 'Don\'t look at the sails too long.', 'The Kite\'s high tonight.',
    'My needle\'s nearly in the red.', 'Another one fell in the craters.',
  ] },
];

// ── The area ─────────────────────────────────────────────────────────

export const STARFALL_AREA: AreaDef = {
  id: 'starfall',
  isle: 'air',
  court: 'starfall',
  name: 'The Starfall Court',
  subtitle: 'The summit above the clouds, where it is always night',
  w: W,
  h: H,
  bg: SF.cloudDeep,
  accent: 0x6a4cff,
  weather: 'stars',
  spawn: { x: CX, y: 1700 },
  painter: makeStarfallPainter(),
  solids: SOLIDS,
  exits: [
    { side: 's', to: 'galeward', label: 'Down the Cloudstair to the Galeward Court' },
  ],
  pois: [
    { kind: 'encounter', id: 'starfall-shooting-stars' },
    { kind: 'encounter', id: 'starfall-constellation' },
    { kind: 'encounter', id: 'starfall-telescope' },
    { kind: 'encounter', id: 'starfall-eclipse' },
    { kind: 'encounter', id: 'starfall-dying-star' },
    { kind: 'prince', id: 'nova', at: { x: TOWER.x, y: TOWER.y + 70 } },
    { kind: 'waystone', at: { x: 1300, y: 1660 } },
    {
      kind: 'door',
      at: { x: LUNG_DOOR.x, y: LUNG_DOOR.y },
      to: 'lung',
      arrive: { x: 900, y: 2440 },
      label: 'The Lung',
      open: { princesOfIsle: 'air', count: 6 },
      lockedText: 'Six corks seal the Lung\'s bellows-door, one for each of King Aerion\'s children. It stays shut till all six pop.',
    },
    { kind: 'water', id: 'starfall-pool', shape: { x: POOL.x, y: POOL.y, w: POOL.w, h: POOL.h }, fishery: 'starfall-pool' },
    { kind: 'sign', at: { x: 1320, y: 1520 }, text: 'THE CLOUD LINE. All breath drawn above this line is metered at the summit rate. By order of His Majesty.' },
    { kind: 'sign', at: { x: 1300, y: 1210 }, text: 'WEST: the Registry, the Eclipse Terrace, the craters. EAST: the Great Telescope, the Starpool. NORTH: the Last Stair.' },
    { kind: 'sign', at: { x: 1060, y: 790 }, text: 'THE REGISTRY OF STARS. Every soul, a star. Every star, a debt. Plaques inked by order of the Prince.' },
    { kind: 'sign', at: { x: 1310, y: 300 }, text: 'THE LAST STAIR. Collectors and crates only. Beyond: THE LUNG. Breathe quietly in His Majesty\'s presence.' },
    { kind: 'sign', at: { x: SIPHON.x + 40, y: SIPHON.y + 50 }, text: 'PROPERTY OF THE LAMP-OFFICE. Starlight drawn for the Lung\'s lamps. Do not disturb the copper.' },
    { kind: 'chest', id: 'starfall-chest-rim', at: { x: 2100, y: 960 }, coins: 180, orbs: 1 },
    { kind: 'chest', id: 'starfall-chest-kiln', at: { x: 1860, y: 570 }, coins: 150, open: { encounter: 'starfall-dying-star' } },
  ],
  npcs: NPCS,
  crowd: {
    count: 10,
    looks: SUMMIT_LOOKS,
    paths: [
      [{ x: CX, y: 1680 }, { x: CX, y: 1480 }, { x: CX - 20, y: 1260 }, { x: CX, y: 1480 }],
      [{ x: 1040, y: 1000 }, { x: 1200, y: 1110 }, { x: 1360, y: 1000 }, { x: 1200, y: 900 }],
      [{ x: 960, y: 990 }, { x: 760, y: 940 }, { x: 620, y: 905 }, { x: 760, y: 940 }],
      [{ x: 1440, y: 1000 }, { x: 1640, y: 990 }, { x: 1760, y: 995 }, { x: 1640, y: 990 }],
      [{ x: CX, y: 820 }, { x: CX, y: 600 }, { x: CX, y: 420 }, { x: CX, y: 600 }],
      [{ x: CX, y: 640 }, { x: 990, y: 610 }, { x: 860, y: 570 }, { x: 990, y: 610 }],
      [{ x: CX, y: 660 }, { x: 1420, y: 620 }, { x: 1600, y: 615 }, { x: 1420, y: 620 }],
      [{ x: CX, y: 1380 }, { x: 960, y: 1360 }, { x: 800, y: 1340 }, { x: 960, y: 1360 }],
      [{ x: CX, y: 1330 }, { x: 1360, y: 1340 }, { x: 1460, y: 1370 }, { x: 1360, y: 1340 }],
      [{ x: 1120, y: 1530 }, { x: 1300, y: 1500 }, { x: 1120, y: 1530 }, { x: 960, y: 1520 }],
    ],
    barks: CROWD_BARKS,
  },
};
