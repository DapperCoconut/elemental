import type { AreaDef, NpcDef, NpcLook, Talk } from '../../../../IslesTypes';

/**
 * The people of the Stonehold Court.
 *
 * Stonehold is the first court up from Quarrymouth, so its people do the explaining: what the
 * Stone Tithe is (a weight of cut stone a household, each season, rolled down to the Scales),
 * what *interment* is (who falls short is walled up in a cell in the Sepulchre "until the debt is
 * quarried by others" — and here the masons start by walling up your own front door), and what
 * the Regent buries besides people: the old street names cut in every lintel, plastered over one
 * by one. They are quarry folk. They talk about weight the way other towns talk about money, and
 * about the Old King the way you talk about weather that has not come yet.
 */

const PRINCE = { prince: 'bould' } as const;
const REGENT = { monarch: 'gravane' } as const;

const Q_NAMES = 'stonehold-q-buried-names';
const Q_CARP = 'stonehold-q-carps-weight';
const Q_RUNAWAY = 'stonehold-q-runaway-stone';
const Q_WALLED = 'stonehold-q-walled-in';
const Q_UNMOVED = 'stonehold-q-unmoved';

export const STONEHOLD_NPCS: NpcDef[] = [
  // ── Dunstan Quoit — the shop ─────────────────────────────────────────
  {
    id: 'stonehold-quoit',
    name: 'Dunstan Quoit',
    title: 'Keepsakes, under the Dolmen',
    look: { body: 0xc8a888, accent: 0x5b4a6e, hat: 'cap', traits: ['satchel', 'pipe', 'beard'], size: 1.1 },
    at: { x: 640, y: 996 },
    role: { kind: 'shop', id: 'stonehold-shop' },
    talks: [
      {
        when: REGENT,
        lines: [
          'They\'re opening the cells under the mountain. People are coming home grey with dust and blinking.',
          'I\'ve sold out of everything shiny. Turns out folk want something pretty after forty years of grey.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The Prince came down off his gate this morning. Walked the road. Stopped at my stall.',
          'Bought a marble. Paid for it, too. Stood there turning it in his fingers like he\'d never held one.',
        ],
      },
      {
        when: { questDone: Q_NAMES },
        lines: [
          'Kingsway. Lantern Row. Heron Steps. People are saying the old names out loud on my corner.',
          'Nobody\'s been interred for it yet. Give it time. But I\'ve put a sign up. I\'m not proud of the spelling.',
        ],
      },
      {
        lines: [
          'Keepsakes, stranger. Bits of the court, made small. My stall\'s an old tomb, so I don\'t pay rent on it.',
          'The Stone Tithe: a weight of cut stone each household owes, each season. It\'s rolled down to the Scales.',
          'Short weight, and you\'re interred. Walled up in the Sepulchre until somebody else quarries your debt.',
          'Charms on the capstone shelf — wear three. And spelt for the bakery, if you\'re going Bryn\'s way.',
        ],
      },
    ],
    barks: [
      { when: PRINCE, lines: ['The Prince bought a marble!', 'Keepsakes! Something light, for a change!'] },
      { lines: ['Keepsakes and charms!', 'Spelt for the Flatbread Stone!', 'Lucky stones, two a copper.', 'Mind the capstone, it drips.'] },
    ],
  },

  // ── Bryn Hearth — the Flatbread Stone (bakery) ───────────────────────
  {
    id: 'stonehold-bryn',
    name: 'Bryn Hearth',
    title: 'The Flatbread Stone',
    look: { body: 0xe0b890, accent: 0xff8a3a, hat: 'chef', traits: ['apron', 'tool'], size: 1.15 },
    at: { x: 1700, y: 812 },
    role: { kind: 'bakery', id: 'stonehold-flatbread' },
    talks: [
      {
        when: REGENT,
        lines: [
          'The interred are coming home hungry. I\'ve had the stone hot since midnight and I\'m not letting it cool.',
          'Every flatbread\'s free today. Don\'t tell Quoit. He\'ll want one, and he can pay.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'His Highness stood at my stone for an hour. Watching the breads rise. He said he\'d never seen bread rise.',
          'I gave him one. He ate it standing up, like the pit gang. Then he asked if he could have a go at the slap.',
        ],
      },
      {
        when: { questDone: Q_CARP },
        lines: [
          'The pit gang ate carp for the first time in a year. Fat Lugg weighed the bones afterward. Out of spite.',
          'I\'ve put Carp in the Coals on the slate for good. Bring me a boulder carp and a sack of spelt.',
        ],
      },
      {
        when: { quest: Q_CARP },
        lines: [
          'Ness sent you? For the pit gang? Bring the carp, I\'ll bury them in the coals.',
          'Boulder carp, two. They\'re slow, they\'re old, and they fight like a cart going downhill.',
        ],
      },
      {
        lines: [
          'The Flatbread Stone. That slab out front has been hot every day for three hundred years. Never cooled once.',
          'Bring me fish and a sack of Quoit\'s spelt and I\'ll slap you something on it. Eat before a fight — it holds.',
          'I\'ll bake the harbour\'s fish too. Bream, sole. Anything that comes up the road that isn\'t stone.',
        ],
      },
    ],
    barks: [
      { when: PRINCE, lines: ['The Prince tried the slap! Burnt his thumb!', 'Free crust for the Prince\'s conqueror!'] },
      { lines: ['Hot off the stone!', 'Flatbread! Fold it, eat it, go!', 'Mind the coals.', 'Stone\'s hot, bread\'s hot, sun\'s hot.'] },
    ],
  },

  // ── Ysolde Carver — the letter-cutter ────────────────────────────────
  {
    id: 'stonehold-ysolde',
    name: 'Ysolde Carver',
    title: 'Letter-Cutter',
    look: { body: 0xd8b49a, accent: 0xe8e2d4, hat: 'bandana', traits: ['tool', 'apron', 'glasses'], size: 0.95 },
    at: { x: 560, y: 826 },
    talks: [
      {
        when: REGENT,
        lines: [
          'I\'ve been asked to cut a new lintel. For the Sepulchre. It\'s to say what it was, so nobody forgets.',
          'Forty years I cut nothing but tithe numbers. My hand shook on the first letter. It\'s stopped shaking.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'Nobody\'s come with a plaster bucket since the Prince fell. I\'ve been scraping lintels all week.',
          'Every name on this road is showing again. I cut half of them myself when I was a girl.',
        ],
      },
      {
        when: { questDone: Q_NAMES },
        lines: [
          'Kingsway. Lantern Row. Heron Steps. Weaver\'s End. Old Abner read them out and I cried into my chisel.',
          'Grout will be back with his bucket. Let him come. I can cut faster than he can plaster.',
        ],
      },
      {
        when: { quest: Q_NAMES },
        lines: [
          'The four houses along this side of the road. The plaster\'s still soft, it\'ll come off with a thumbnail.',
          'Then old Abner, south of the road. He\'ll read them for you. He\'s the only one who still knows the letters.',
        ],
      },
      {
        lines: [
          'Every house in Stonehold has its name cut in the lintel over the door. Every street had one, too.',
          'The Regent buries names. His men come round with a bucket of lime-plaster and a trowel, door by door.',
          'I cut those letters. I can\'t un-plaster them myself — Grout knows my face. But a stranger\'s thumb…',
        ],
      },
    ],
    barks: [
      { when: { questDone: Q_NAMES }, lines: ['Kingsway, Lantern Row…', 'Faster than he can plaster.'] },
      { lines: ['Tap. Tap. Tap.', 'Another one plastered.', 'I cut that one. I remember.', 'Lime\'s soft till dusk.'] },
    ],
  },

  // ── Abner Menhenick — the old man who remembers ──────────────────────
  {
    id: 'stonehold-abner',
    name: 'Abner Menhenick',
    title: 'Remembers the Old King',
    look: { body: 0xe4d0bc, accent: 0x76804a, hat: 'beanie', traits: ['cane', 'beard', 'scarf'], size: 0.85 },
    at: { x: 330, y: 1046 },
    talks: [
      {
        when: REGENT,
        lines: [
          'They opened the Old King\'s tomb. Empty, they say. Just a note. I could have told them. He\'d have hated it.',
          'He went down to rest, and when he came up there was a regent. Maybe he just kept walking. Good for him.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'Young Bould came to see me. Sat on my step. Asked what his grandfather — the Old King — was like.',
          'I told him the Old King never sat still in his life. The boy laughed. First time I\'ve heard it.',
        ],
      },
      {
        when: { questDone: Q_UNMOVED },
        lines: [
          'You stood by the fallen stone. Good. I helped raise it, you know. Sixty of us on the ropes.',
        ],
      },
      {
        when: { questDone: Q_NAMES },
        lines: [
          'I read the names out loud and nobody came to wall me up. I\'m ninety-one. I\'ve nothing left to fear but stairs.',
        ],
      },
      {
        lines: [
          'I\'m old enough to remember the Old King. Big laugh, small crown, always walking. He\'d stop and talk to you.',
          'Then he went down into his tomb to rest a while, and the steward sealed it behind him. Forty years ago.',
          '"Until the Old King wakes," says the Regent. He sealed it himself. I don\'t think he expects a knock.',
        ],
      },
    ],
    barks: [
      { lines: ['Kingsway, that was. Kingsway.', 'Big laugh, small crown.', 'My knees know the weather.', 'Forty years. Forty.'] },
    ],
  },

  // ── Tallyman Plumb — the Tithe pit clerk ─────────────────────────────
  {
    id: 'stonehold-plumb',
    name: 'Tallyman Plumb',
    title: 'Keeps the Pit Board',
    look: { body: 0xc8b49c, accent: 0x5b4a6e, hat: 'miner', traits: ['book', 'glasses'], size: 1 },
    at: { x: 452, y: 1180 },
    talks: [
      {
        when: REGENT,
        lines: [
          'I wiped the board this morning. Every household, every season, gone in one wet rag.',
          'Then I chalked one line at the top. "Owed: nothing." It looks very strange. I keep reading it.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'No stone\'s come down the wheel all week. The pit gang are sitting on the blocks playing knucklebones.',
          'I\'ve been told to keep tallying. Tallying what? I\'ve started tallying clouds.',
        ],
      },
      {
        when: { questDone: Q_RUNAWAY },
        lines: [
          'The Tumbles\' stone made the Scales after all. Short of nothing. Cobb pushed it down himself, they say.',
        ],
      },
      {
        when: { quest: Q_RUNAWAY },
        lines: [
          'The Tumble boy\'s stone? Jumped the runnel at the bend. Law of the road says what jumps is Cobb\'s.',
          'It\'s not a law. It\'s a thing Cobb says. But nobody\'s ever argued with him and walked straight after.',
        ],
      },
      {
        lines: [
          'Every household lowers its stone by the wheel, and I chalk it. Mark, weight, season. Then it rolls.',
          'The board goes down to Quarrymouth with the stone. If my chalk says short, the Scales will say short.',
          'Those rings round a mark? Short. Those households get a visit from the masons. I just keep the board.',
        ],
      },
    ],
    barks: [
      { when: PRINCE, lines: ['Nothing to tally.', 'One cloud. Two clouds.'] },
      { lines: ['Mark it, weigh it, roll it.', 'Chalk\'s low again.', 'Who\'s next on the wheel?', 'Short. Ring it.'] },
    ],
  },

  // ── Ness Gudgeon — fishes the quarry pool ────────────────────────────
  {
    id: 'stonehold-ness',
    name: 'Ness Gudgeon',
    title: 'Fishes the Quarry Pool',
    look: { body: 0xd4b8a0, accent: 0x3e6c74, hat: 'souwester', traits: ['rod', 'pipe'], size: 1 },
    at: { x: 1612, y: 1300 },
    talks: [
      {
        when: REGENT,
        lines: [
          'The pool\'s for everyone now. Children were swimming in it this morning. In a TITHE pit. Imagine.',
          'I let them. The carp didn\'t mind. The carp have seen three hundred years of worse.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'Lugg hasn\'t been round with his scale since the Prince fell. I\'ve caught nine carp. Weighed none.',
        ],
      },
      {
        when: { questDone: Q_CARP },
        lines: [
          'The pit gang came to thank me. Twelve of them, dusty as moles. One of them hugged me. I let him.',
          'Fish the pool any time, stranger. Dace for the stone, carp for a fight. Lugg\'s got no claim on you.',
        ],
      },
      {
        when: { quest: Q_CARP },
        lines: [
          'Boulder carp lie deep. Cast long, and when he takes it don\'t yank — let him pull, then lean back.',
        ],
      },
      {
        lines: [
          'This was the first quarry in Stonehold. They dug it so deep they hit a spring. Now it\'s a pool.',
          'Pebble dace in the shallows, boulder carp in the deep. Old as the town, some of those carp.',
          'Cast from the ledges. Your driftwood rod will do. Mind the Pit-Reeve — he weighs fish as tithe.',
        ],
      },
    ],
    barks: [
      { lines: ['Bite, you old stone.', 'Deep water, deep fish.', 'Lugg\'s coming. Hide the creel.', 'Dace. Again. Fine.'] },
    ],
  },

  // ── Kit Tumble — the boy whose stone jumped ──────────────────────────
  {
    id: 'stonehold-kit',
    name: 'Kit Tumble',
    title: 'Rolled the Family Stone',
    look: { body: 0xe6c8a8, accent: 0xb4673f, hat: 'cap', traits: ['scarf'], size: 0.7 },
    at: { x: 1110, y: 1420 },
    talks: [
      {
        when: REGENT,
        lines: [
          'I\'m cutting a stone anyway. A round one. Just for rolling. Not for anyone. Just to watch it go.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The Prince rolled a boulder down the road on his own this morning. Just for fun. Cobb timed it.',
        ],
      },
      {
        when: { questDone: Q_RUNAWAY },
        lines: [
          'It made the Scales! Mum cried. Dad says I\'m never pushing again. Cobb says I\'ve got the arm for it.',
          'I don\'t know which one to listen to. Cobb, probably. Don\'t tell Dad.',
        ],
      },
      {
        when: { quest: Q_RUNAWAY },
        lines: [
          'It jumped at the bend. Right where the kerb\'s all scraped. I watched it go into Cobb\'s yard.',
        ],
      },
      {
        lines: [
          'I rolled our stone this season. My first time. Dad\'s back is bad, so it was me. I pushed too hard.',
          'It jumped the runnel at the bend and went right into Roller Cobb\'s yard. He says it\'s his now.',
          'That\'s our whole season. If it\'s not on the Scales by the weighing, we\'re short. They\'ll wall us up.',
        ],
      },
    ],
    barks: [
      { when: { questDone: Q_RUNAWAY }, lines: ['It made the Scales!', 'Cobb says I\'ve got the arm.'] },
      { lines: ['I pushed too hard.', 'It just JUMPED.', 'Our whole season.', 'Don\'t tell Dad.'] },
    ],
  },

  // ── Agnes Hollin — her mother is being walled in ─────────────────────
  {
    id: 'stonehold-agnes',
    name: 'Agnes Hollin',
    title: 'Outside Her Mother\'s Door',
    look: { body: 0xd8bca4, accent: 0x76804a, hat: 'hood', traits: ['satchel', 'bandage'], size: 1 },
    at: { x: 1960, y: 1046 },
    talks: [
      {
        when: REGENT,
        lines: [
          'Mum went down to the Sepulchre this morning. On her own feet. To help open the other cells.',
          'She says she knows what it is to hear a block go in. She wants to be there when they come out.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'Nobody\'s been to wall anyone up since the Prince fell. Mum leaves her door wide open now. All night.',
        ],
      },
      {
        when: { questDone: Q_WALLED },
        lines: [
          'Mum\'s door is open. She sat on the step in the sun for three hours. Didn\'t say a word. Just sat.',
          'The new blocks are stacked by the cart. We\'re going to build a bench out of them. A long one.',
        ],
      },
      {
        when: { quest: Q_WALLED },
        lines: [
          'The newest blocks are the ones still wet with mortar. Pull those three and she can squeeze out.',
          'Stoop will come back when he hears. He always comes back. He likes his walls to stand.',
        ],
      },
      {
        lines: [
          'That\'s my mother\'s house. Short last season — two blocks short, after the frost cracked her face.',
          'Interment starts at home, here. The masons wall your door up first, so you can\'t run before the cart.',
          'They\'ve done three courses. She\'s in there. I pass her bread through the gap at the top.',
          'Stoop the mason does the walling. Will you help me pull the fresh blocks? I can\'t lift them.',
        ],
      },
    ],
    barks: [
      { when: { questDone: Q_WALLED }, lines: ['Door\'s open!', 'A long bench. For everyone.'] },
      { lines: ['Mum? Mum, it\'s me.', 'Three courses now.', 'Bread through the gap.', 'Two blocks short. TWO.'] },
    ],
  },

  // ── Mother Shale — Prince Bould's old nurse ──────────────────────────
  {
    id: 'stonehold-shale',
    name: 'Mother Shale',
    title: 'Nursed the Prince',
    look: { body: 0xe0ccb8, accent: 0x8d7f6a, hat: 'veil', traits: ['cane', 'apron'], size: 0.9 },
    at: { x: 1560, y: 512 },
    talks: [
      {
        when: REGENT,
        lines: [
          'His father\'s gone into the earth he stole. My boy went to the funeral. Stood at the back. Didn\'t sit.',
          'He\'s walking the whole isle now. Every road. He says he wants to see what he\'s been sitting on.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'He came out of the keep and walked down to the Moot Ring and just stood in it, looking at the stones.',
          'Then he sat down in the dust. In the DUST. Like a boy. I have waited thirty years to see that.',
        ],
      },
      {
        when: { quest: Q_UNMOVED },
        lines: [
          'Go and see the fallen stone, and talk to old Abner. Then come to the gate. I\'ll be here. I\'m always here.',
        ],
      },
      {
        lines: [
          'I nursed the Prince. He was a lively thing — climbed everything, rolled down every slope in the court.',
          'His father caught him at it once. "A stone does not move," he said, "and a stone is not moved."',
          'He hasn\'t run since. Thirty years. He sits on that gate and he is very, very good at being a stone.',
        ],
      },
    ],
    barks: [
      { when: PRINCE, lines: ['He sat in the dust!', 'My boy\'s walking.'] },
      { lines: ['Sit up straight, love.', 'Nine days on that gate.', 'He used to roll down the scree.', 'Stone, stone, stone.'] },
    ],
  },
];

const looks: NpcLook[] = [
  { body: 0xc8a888, accent: 0x8d7f6a, hat: 'miner', traits: ['tool'] },
  { body: 0xd8bca4, accent: 0xb4673f, hat: 'headwrap', traits: ['pack'] },
  { body: 0xb8906e, accent: 0x5b4a6e, hat: 'cap', traits: ['apron', 'beard'], size: 1.15 },
  { body: 0xe4c8ac, accent: 0x76804a, hat: 'hood', traits: ['satchel'] },
  { body: 0xc49a7c, accent: 0xc9965f, hat: 'miner', traits: ['tool', 'beard'], size: 1.2 },
  { body: 0xdcbca0, accent: 0xe0c493, hat: 'bandana', traits: ['scarf'], size: 0.76 },
  { body: 0xcfa585, accent: 0x3d4048, hat: 'coif', traits: ['apron', 'tool'] },
  { body: 0xd9b89a, accent: 0x9b958a, hat: 'none', traits: ['pack'], size: 0.72 },
];

const barks: Talk[] = [
  {
    when: REGENT,
    lines: [
      'They\'re opening the cells!',
      'My uncle came home. Grey as a ghost.',
      'No Tithe! No Scales! No masons!',
      'Somebody\'s carving names on EVERYTHING.',
    ],
  },
  {
    when: PRINCE,
    lines: [
      'The Prince got off his gate!',
      'He walked the road like anyone.',
      'Nobody\'s weighing this week.',
      'Is the Tithe still on? Plumb says he\'s tallying clouds.',
    ],
  },
  {
    when: { courtReady: 'stonehold' },
    lines: [
      'Someone\'s beaten all five of the Prince\'s.',
      'The stranger\'s going up to the keep.',
    ],
  },
  {
    lines: [
      'Two blocks short. Two.',
      'Mind the runnel!',
      'The masons were on Heron — on the steps again.',
      'Don\'t say the old name.',
      'Weigh heavy, roll straight.',
      'Dust in the bread again.',
      'The Hollins have three courses up.',
      'Grout\'s got his bucket out.',
    ],
  },
];

export const STONEHOLD_CROWD: NonNullable<AreaDef['crowd']> = {
  count: 14,
  looks,
  paths: [
    // Up and down the rolling-stone road.
    [{ x: 1180, y: 1600 }, { x: 1180, y: 1100 }, { x: 1200, y: 960 }, { x: 1180, y: 1100 }],
    // The west and east roads.
    [{ x: 140, y: 870 }, { x: 900, y: 870 }, { x: 1500, y: 870 }, { x: 2260, y: 870 }],
    [{ x: 2260, y: 880 }, { x: 1500, y: 880 }, { x: 900, y: 880 }, { x: 140, y: 880 }],
    // Round the Tithe pit and to the board.
    [{ x: 470, y: 1110 }, { x: 860, y: 1110 }, { x: 900, y: 1380 }, { x: 620, y: 1500 }, { x: 330, y: 1400 }, { x: 380, y: 1200 }],
    // Round the Moot Ring.
    [{ x: 1060, y: 780 }, { x: 1340, y: 780 }, { x: 1360, y: 930 }, { x: 1040, y: 930 }],
    // Up the avenue and back.
    [{ x: 1200, y: 700 }, { x: 1200, y: 240 }, { x: 1200, y: 700 }],
    // Down to the pool.
    [{ x: 1300, y: 900 }, { x: 1500, y: 1110 }, { x: 1660, y: 1470 }, { x: 1300, y: 1300 }],
  ],
  barks,
};
