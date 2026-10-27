import type { AreaDef, NpcDef } from '../../../../IslesTypes';
import { SHOP } from './layout';

/**
 * The people of the Spore Court. They live inside mushrooms, they fish a black mere, and they owe
 * the Empress a Bloom Tithe in caps, truffles and spore, weighed on the Spore Scales at each
 * season's turn. Every household knows the Prince's threads run under its floor and that what is
 * said on a doorstep reaches the Mycelarium by morning — so people here talk softly, look at
 * their feet when they say anything that matters, and never, ever say "short".
 */

const PRINCE_DOWN = { prince: 'mycel' } as const;
const EMPRESS_DOWN = { monarch: 'verdigra' } as const;

export const SPORE_NPCS: NpcDef[] = [
  {
    id: 'spore-gillie',
    name: 'Morwen Gillie',
    title: 'Forager-Chemist',
    look: { body: 0xe6d9bd, accent: 0x5e3f80, hat: 'mushroom', traits: ['apron', 'satchel', 'glasses'], eye: 0x6effd2 },
    at: { x: SHOP.x, y: SHOP.y + 44 },
    role: { kind: 'shop', id: 'spore-shop' },
    talks: [
      { when: EMPRESS_DOWN, lines: [
        'No more tithe-baskets! I picked a whole ring of chanterelles this morning and every one of them is MINE.',
        'People keep coming in to buy things just because they can. I have never been so rude to so many happy faces.',
      ] },
      { when: PRINCE_DOWN, lines: [
        'The threads under the shop have gone dark. I said "short" out loud this morning, three times. Nothing came.',
        'I am stocking the good jars again. The ones I hid when the Prince\'s Ear came round to count my shelves.',
      ] },
      { lines: [
        'The Gill & Gather. Charms grown, picked, potted or bottled — nothing in here that was ever weighed for the tithe.',
        'Puffball pouches, glowcap jars, rot in a cloth and a wisp that will not leave. They work. Do not ask me how.',
        'And I buy fish. Mere fish keep in brine for the winter, when the caps stop and the Scales do not.',
      ] },
    ],
    barks: [
      { when: PRINCE_DOWN, lines: ['Short! Short, short, short!', 'Speak up, love, nobody\'s listening.'] },
      { lines: ['Jars, charms, a little rot...', 'Mind the step, it\'s gill.', 'Hush. The floor has ears.'] },
    ],
  },
  {
    id: 'spore-tansy',
    name: 'Old Tansy Mould',
    title: 'Midwife',
    look: { body: 0xb8a585, accent: 0xa8382a, hat: 'hood', traits: ['cane', 'scarf'], size: 0.85, eye: 0xf4ecd6 },
    at: { x: 960, y: 800 },
    wander: 24,
    talks: [
      { when: EMPRESS_DOWN, lines: [
        'The rings have started going somewhere warm again. The young ones step in for a dare and come out laughing.',
        'Seventy years I have midwifed this bog, and this is the first spring I have not counted heads for the Scales.',
      ] },
      { when: PRINCE_DOWN, lines: [
        'With the Prince down the Green has gone quiet. The rings still close, but they only go round the corner now.',
        'Wat is asleep by my fire. The real one. He snores like his grandad. I could listen to it all night.',
      ] },
      { when: { questDone: 'spore-changeling' }, lines: [
        'He knew the song. He knew all the verses, even the rude one. That is my Wat. Thank you, dear.',
        'The thing that came back in his place — I hope it found its own way home. Even it must have had a mother.',
      ] },
      { lines: [
        'Mind the rings on the Green. Puck keeps them for the Prince, and a ring is a door with no house round it.',
        'When a family comes up short at the Scales, the rings take the children first. Tidy, he calls it.',
        'I have delivered half this bog. I know every face in it. That is how I know when one comes back wrong.',
      ] },
    ],
    barks: [
      { when: PRINCE_DOWN, lines: ['Hush, he\'s sleeping.', 'Lovely quiet.'] },
      { lines: ['Seven, eight... there should be nine.', 'Keep out of the ring, child.', 'My knees know the weather.'] },
    ],
  },
  {
    id: 'spore-pip',
    name: 'Pip Puddock',
    title: 'Frog-Keeper',
    look: { body: 0x5f8240, accent: 0x34502a, hat: 'beanie', traits: ['satchel', 'bandage'], size: 0.72, eye: 0xd9c27a },
    at: { x: 700, y: 700 },
    wander: 30,
    talks: [
      { when: EMPRESS_DOWN, lines: [
        'The frogs sing all night now and nobody comes to weigh them! Gerald is the loudest. Gerald is ENORMOUS.',
      ] },
      { when: PRINCE_DOWN, lines: [
        'The Prince is gone and the frogs sang ALL night. Mam says it is the loudest the bog has been since she was small.',
      ] },
      { when: { questDone: 'spore-frog-song' }, lines: [
        'Gerald and Mabel! They are singing already. Listen — the deep one is Gerald. He is singing about you.',
        'Plumb went off with his weights round his neck. Serves him right. Frogs are not a tithe. Frogs are FRIENDS.',
      ] },
      { lines: [
        'I had a whole choir. Mire frogs, nine of them, in the ditch by our house. The Bailiff took them for the Scales.',
        'He said frogs are "produce". Frogs are not produce. Frogs are a choir.',
        'Mister Mossop says the big ones live in the Black Mere. I am not allowed near the Mere. Are YOU allowed?',
      ] },
    ],
    barks: [
      { lines: ['Ribbit. That means hello.', 'Have you seen a frog called Gerald?', 'Brup! Brup!'] },
    ],
  },
  {
    id: 'spore-russula',
    name: 'Brother Russula',
    title: 'Lamplighter',
    look: { body: 0x1f3a33, accent: 0x6effd2, hat: 'mushroom', traits: ['lantern', 'book'], size: 1.05, eye: 0x6effd2 },
    at: { x: 1560, y: 650 },
    wander: 22,
    talks: [
      { when: EMPRESS_DOWN, lines: [
        'I light the lamps because I like them now. Not because the Prince wants to see who walks past them.',
        'They say the Glasshouse is open and the hedges are walking home. Every lamp in the bog is lit for them.',
      ] },
      { when: PRINCE_DOWN, lines: [
        'The net beneath the lamps has gone still. For the first time in my life a glowcap is only a light.',
        'I have started reading by them. Just reading. Nobody is reading over my shoulder through the floor.',
      ] },
      { when: { questDone: 'spore-lamplighter' }, lines: [
        'Every lamp on the bank is lit again, and Hypha has stopped drumming them. The low street can see its feet.',
        'He came by and asked me how a lamp is lit. Not tapped, not wired. Lit. I showed him. He was very gentle.',
      ] },
      { lines: [
        'Every glowcap lamp in the bog is mine to tend. Hypha wires them into the net so the Prince sees by them.',
        'When a household speaks against the tithe, its lamp goes out. Then everybody knows. That is the point.',
        'Peace on your boards, friend. Keep to the lit side.',
      ] },
    ],
    barks: [
      { when: PRINCE_DOWN, lines: ['Only a light. Only a light.', 'Lovely glow tonight.'] },
      { lines: ['Peace on your boards.', 'This one\'s been snuffed again.', 'Keep to the lit side.'] },
    ],
  },
  {
    id: 'spore-ambrosine',
    name: 'Ambrosine Peat',
    title: 'Widow of the Fen',
    look: { body: 0xbfe4ff, accent: 0x1d1712, hat: 'veil', traits: ['lantern', 'scarf'], eye: 0x4c7fb0 },
    at: { x: 1990, y: 1250 },
    wander: 16,
    talks: [
      { when: EMPRESS_DOWN, lines: [
        'Edric came home from the Glasshouse yesterday. Green in the face, sap under his nails, and grumbling. Mine.',
        'The wisps have stopped. I think they were only ever waiting for someone to open a door.',
      ] },
      { when: PRINCE_DOWN, lines: [
        'The Prince is down, and the wisps hang still over the fen, as if they are waiting to see what happens next.',
        'So am I. Edric is still in the hedges. But I know which way to walk now.',
      ] },
      { when: { questDone: 'spore-wisp-road' }, lines: [
        'No false lights on the fen tonight. Only the real ones, and they all lean north. Toward the Glasshouse.',
        'Edric is up there, then. In the hedges. Still breathing. "Until he learns to flower." Well. I will go and get him.',
      ] },
      { lines: [
        'My Edric came up a basket short at the autumn weighing. Six caps short. They pruned him for six caps.',
        'Every night since, I walk the fen after the wisps. They always lean the same way. Fen says I am mad.',
        'But some lights on the fen are not wisps. Somebody hangs lanterns out there to walk people into the deep.',
      ] },
    ],
    barks: [
      { when: PRINCE_DOWN, lines: ['North. They all lean north.', 'Soon, love.'] },
      { lines: ['Six caps.', 'Follow the cold ones, not the warm ones.', 'Edric?'] },
    ],
  },
  {
    id: 'spore-corvin',
    name: 'Corvin Spade',
    title: 'Sexton of the Pits',
    look: { body: 0x7a4c58, accent: 0x110d0a, hat: 'cap', traits: ['tool', 'beard', 'bandage'], size: 1.2, eye: 0xd5603f },
    at: { x: 560, y: 1355 },
    wander: 20,
    talks: [
      { when: EMPRESS_DOWN, lines: [
        'The pits are for leaves and logs now. Leaves and logs. I go home and sleep at night like a decent man.',
      ] },
      { when: PRINCE_DOWN, lines: [
        'The Prince is down, and the floor is just floor. I stamped on it for an hour. Felt marvellous.',
        'I am digging up the old turning-beds. Every one of them had a name. I am going to find out what they were.',
      ] },
      { lines: [
        'Everything that falls in this bog comes to the pits. The Prince sends down the windfall. And worse.',
        'Morel turns it. I dig it in. Thirty years of digging and I never once looked at what was in the barrow.',
        'The threads all run one way, you know. Toward the Mycelarium. Like roots to a tree. Like veins to a heart.',
      ] },
    ],
    barks: [
      { when: PRINCE_DOWN, lines: ['Just floor! Just floor!', 'Leaves and logs, that\'s all.'] },
      { lines: ['Dig it in, dig it in.', 'Don\'t look in the barrow.', 'Smells like spring. It isn\'t.'] },
    ],
  },
  {
    id: 'spore-dace',
    name: 'Dace Mossop',
    title: 'Mere-Fisher',
    look: { body: 0x8a8a4a, accent: 0x34261a, hat: 'souwester', traits: ['rod', 'pipe', 'beard'], size: 1.1, eye: 0xe6d9bd },
    at: { x: 600, y: 615 },
    talks: [
      { when: EMPRESS_DOWN, lines: [
        'Fish what you like, keep what you catch. Strangest law I ever heard, and the oldest one. Pull up a stool.',
      ] },
      { when: PRINCE_DOWN, lines: [
        'The Mere\'s gone still since the Prince fell. The eels have stopped glowing quite so nervously.',
      ] },
      { lines: [
        'The Black Mere. Bog water. Your driftwood rod will rot in it — you want iron at least, or better.',
        'Loach in the peat at the edge, glowcap eels out in the middle where the drowned caps are, and mire frogs.',
        'A mire frog is a big black thing that fights like a cat in a bag. The tithe-weighers take them by the sack.',
      ] },
    ],
    barks: [
      { lines: ['Bite\'s slow under the peat.', 'Iron rod, or don\'t bother.', 'Shh. Eel.'] },
    ],
  },
  {
    id: 'spore-clump',
    name: 'Osric Clump',
    title: 'Tithe-Weigher',
    look: { body: 0xbb8a52, accent: 0x34261a, hat: 'tophat', traits: ['book', 'glasses'], size: 1.15, eye: 0x6effd2 },
    at: { x: 1395, y: 790 },
    talks: [
      { when: EMPRESS_DOWN, lines: [
        'I have taken the Scales apart. The pans are going to be bird baths. One of them, anyway. The other is a hat.',
      ] },
      { when: PRINCE_DOWN, lines: [
        'I suppose there is no point weighing anything now. I weighed a cabbage this morning out of habit. It was fine.',
        'I always gave a little on the pan. A thumb\'s worth. For the ones who were close. Tell people that, would you?',
      ] },
      { when: { questDone: 'spore-frog-song' }, lines: [
        'Plumb\'s lead weights went into the Mere. I have no idea how. I have recorded it as "settled by the bog".',
      ] },
      { lines: [
        'The Spore Scales. Every household, every season: caps, truffles and spore, weighed to the Empress\'s measure.',
        'I do not decide who is short. The Scales decide. And the Scales are always a little heavy on the far pan.',
        'Bailiff Plumb brings the weights. I just read them. Please do not look at me like that.',
      ] },
    ],
    barks: [
      { when: PRINCE_DOWN, lines: ['A cabbage. Perfectly fine.', 'No weighing today.'] },
      { lines: ['Next basket.', 'A thumb short... a thumb short...', 'Step up to the pan.'] },
    ],
  },
];

/** Bog-folk on the boardwalks, heads down: foragers, peat-cutters, lamp-boys, the tithe-poor. */
export const SPORE_CROWD: NonNullable<AreaDef['crowd']> = {
  count: 10,
  looks: [
    { body: 0xe6d9bd, accent: 0xa8382a, hat: 'mushroom', traits: ['satchel'] },
    { body: 0x8f6438, accent: 0x5e3f80, hat: 'mushroom', traits: ['pack'] },
    { body: 0x5f8240, accent: 0x34261a, hat: 'hood', traits: ['tool'] },
    { body: 0xb8a585, accent: 0x1f3a33, hat: 'straw', traits: ['apron'] },
    { body: 0x7a4c58, accent: 0xe6d9bd, hat: 'beanie', traits: ['lantern'] },
    { body: 0xe6d9bd, accent: 0x6effd2, hat: 'mushroom', size: 0.78 },
  ],
  paths: [
    [{ x: 2300, y: 800 }, { x: 2000, y: 800 }, { x: 1700, y: 762 }, { x: 1440, y: 705 }, { x: 1700, y: 762 }],
    [{ x: 1200, y: 800 }, { x: 1200, y: 1040 }, { x: 1200, y: 1300 }, { x: 1200, y: 1040 }],
    [{ x: 1060, y: 705 }, { x: 850, y: 762 }, { x: 620, y: 822 }, { x: 420, y: 862 }, { x: 620, y: 822 }],
    [{ x: 150, y: 1312 }, { x: 560, y: 1312 }, { x: 900, y: 1302 }, { x: 560, y: 1312 }],
    [{ x: 1260, y: 1302 }, { x: 1600, y: 1306 }, { x: 1925, y: 1296 }, { x: 2280, y: 1320 }, { x: 1925, y: 1296 }],
    [{ x: 300, y: 950 }, { x: 900, y: 953 }, { x: 1500, y: 953 }, { x: 900, y: 953 }],
    [{ x: 1440, y: 705 }, { x: 1560, y: 612 }, { x: 1750, y: 582 }, { x: 1990, y: 542 }, { x: 1750, y: 582 }],
    [{ x: 1100, y: 640 }, { x: 1300, y: 650 }, { x: 1200, y: 760 }],
    [{ x: 425, y: 1300 }, { x: 425, y: 1040 }, { x: 425, y: 900 }, { x: 425, y: 1040 }],
  ],
  barks: [
    { when: EMPRESS_DOWN, lines: [
      'My aunt walked home from the Glasshouse! Leaves in her hair!', 'No weighing this season. No weighing EVER.',
      'Picked a cap and ate it. Right there. Delicious.', 'The rings go somewhere nice now.',
    ] },
    { when: PRINCE_DOWN, lines: [
      'I said it. I said "short". Nothing happened!', 'The threads have gone dark under our house.',
      'Stamp on the boards — nobody\'s listening.', 'Lamps are just lamps now.',
    ] },
    { lines: [
      'Basket full? Is your basket full?', 'Weighing\'s at the turn. Pick faster.', 'Don\'t say it. Don\'t say "short".',
      'The floor\'s listening.', 'The Hobbes\'s lamp went out last night.', 'Keep to the boards.',
      'Six caps short, they said. Six.', 'Mind the rings on the Green.',
    ] },
  ],
};
