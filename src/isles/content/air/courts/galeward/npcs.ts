import type { AreaDef, NpcDef, NpcLook, Talk } from '../../../../IslesTypes';

/**
 * The people of the Galeward Court.
 *
 * Galeward is the first court up Vane Street from Windlass, so its people do the explaining: what
 * the Breath Tax is (every breath above the cloud line metered by the brass dial on your chest,
 * and billed), what being *becalmed* means (your breath corked into a bottle and racked at the
 * toll-bellows for the lift up to the Lung, and you laid down on a cot to sleep, barely
 * breathing, until somebody else works off the debt), and how Prince Zephyr runs his court on
 * it — every mill, kite and updraft metered by the turn. They are mill folk and kite folk; they
 * talk about the wind the way other towns talk about the weather and money both at once.
 */

const PRINCE = { prince: 'zephyr' } as const;
const KING = { monarch: 'aerion' } as const;

export const Q_CORKED = 'galeward-q-corked';
export const Q_LOAVES = 'galeward-q-loaves';
export const Q_NORTH = 'galeward-q-true-north';
export const Q_KITEMAIL = 'galeward-q-kite-mail';
export const Q_HOUSE = 'galeward-q-weather-house';

export const NPC = {
  lanyard: 'galeward-lanyard',
  quern: 'galeward-quern',
  skeet: 'galeward-skeet',
  wren: 'galeward-wren',
  maTolley: 'galeward-ma-tolley',
  corvin: 'galeward-corvin',
  tuck: 'galeward-tuck',
  aurelia: 'galeward-aurelia',
  nan: 'galeward-nan',
} as const;

export const GALEWARD_NPCS: NpcDef[] = [
  // ── Hesper Lanyard — the Ropewalk (shop) ─────────────────────────────
  {
    id: NPC.lanyard,
    name: 'Hesper Lanyard',
    title: 'Ropewright · Lanyard\'s Ropewalk',
    look: { body: 0xd6b494, accent: 0xc8402e, hat: 'bandana', traits: ['apron', 'tool'], size: 1.05, eye: 0xf4d68e },
    at: { x: 1500, y: 1024 },
    role: { kind: 'shop', id: 'galeward-shop' },
    talks: [
      {
        when: KING,
        lines: [
          'The bottles came down from the Lung in a net. Every one of them. They\'re uncorking them on the street.',
          'More kite line sold this morning than in nine years. People want things in the sky that aren\'t taxed.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'Zephyr\'s taken the meter off his own chest. Hung it on the Weather House door like a horseshoe.',
          'Nobody\'s sure what it means. I\'m selling twice the line on the strength of not being sure.',
        ],
      },
      {
        when: { questDone: Q_KITEMAIL },
        lines: [
          'Tuck\'s letters got through. He came in to buy a whole spool with the coppers the families gave him.',
          'I gave it him for nothing. Don\'t tell anyone. Glass line\'s dear and the Prince taxes the yard.',
        ],
      },
      {
        lines: [
          'The Ropewalk. Every line on every kite and every mill in Galeward was twisted under this roof.',
          'The Prince taxes rope by the yard of air it holds up. Kite line is dearest. A sail-sheet\'s worse.',
          'Charms on the hooks — three at once is all a body can carry. They\'re wind things. They\'ll fight for you.',
          'And mind that brass on your chest. Nobody leaves the toll without one. It reads every breath you take.',
        ],
      },
    ],
    barks: [
      { when: PRINCE, lines: ['Line by the yard — untaxed!', 'Fly something, it\'s free now!'] },
      {
        lines: [
          'Glass line, hemp line, sail-sheet!', 'Mind the jack, it bites.', 'Charms on the hooks.',
          'Every yard\'s metered, love. Every yard.',
        ],
      },
    ],
  },

  // ── Dusty Quern — the Millstone (bakery) ─────────────────────────────
  {
    id: NPC.quern,
    name: 'Dusty Quern',
    title: 'Miller-Baker · The Millstone',
    look: { body: 0xe8d4bc, accent: 0xf6f0e2, hat: 'chef', traits: ['apron', 'beard'], size: 1.25, eye: 0xd8b46a },
    at: { x: 918, y: 1150 },
    role: { kind: 'bakery', id: 'galeward-millstone' },
    talks: [
      {
        when: KING,
        lines: [
          'The Lung\'s bellows have stopped. Do you know what that means for a miller? The wind\'s come back to the sails.',
          'All of it. The Grindstone\'s turning like she\'s young. Bring me anything you\'ve caught — the oven\'s free.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The Prince sent down for a loaf this morning. Plain. "Whatever the wind brought," he said.',
          'I sent him a sprat bap. He sent back the plate, clean. That\'s never happened.',
        ],
      },
      {
        when: { quest: Q_LOAVES, stage: 1 },
        lines: [
          'Skeet\'s sprats? Bless him. Two to a bap and a pinch of the Grindstone\'s flour. Pick the bap off the board.',
          'Every loaf\'s rise is taxed, you know. Air in the crumb. I bake them flat for the sleepers\' families.',
        ],
      },
      {
        when: { questDone: Q_LOAVES },
        lines: [
          'The Assessor\'s gone off to measure somebody else\'s bread. Every family on the cots got a bap.',
          'And they rose. I let them rise. Bring me fish, any fish. The Millstone bakes for whoever\'s hungry.',
        ],
      },
      {
        lines: [
          'The Millstone. Mill on one side, oven on the other — I grind it, I bake it, and the Prince taxes both.',
          'The wind that turns the stone is metered. The breath in the dough is metered. I\'m metered.',
          'Bring me fish off the cliffs and flour from Lanyard\'s and I\'ll bake you something to fight on.',
        ],
      },
    ],
    barks: [
      { when: PRINCE, lines: ['Risen bread! Fully risen!', 'Flour on everything. Good.'] },
      { lines: ['Out of the oven, into the meter...', 'Bake it flat, tax it less.', 'Mind the flour, it gets everywhere.'] },
    ],
  },

  // ── Old Skeet Halyard — the Cloudbank fisher ─────────────────────────
  {
    id: NPC.skeet,
    name: 'Skeet Halyard',
    title: 'Cloud-Angler · the Cloudbank',
    look: { body: 0xc8a888, accent: 0x3a6fb8, hat: 'souwester', traits: ['rod', 'pipe', 'beard'], size: 1.05 },
    at: { x: 300, y: 1150 },
    talks: [
      {
        when: KING,
        lines: [
          'The flyingfish have been coming up out of the cloud in shoals all morning. Like they heard.',
          'Fifty years on this edge and I\'ve never seen the cloud so white. It\'s all the breath, gone back to the sky.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The Prince came down the cliff path and asked me how you fish a cloud. Sat right there.',
          'Caught a sprat and let it go. Said he\'d never held anything that wasn\'t metered. Odd lad. Not a bad one.',
        ],
      },
      {
        when: { questDone: Q_LOAVES },
        lines: [
          'Quern says the sprat baps went round every cot. Every one. Off three little sprats and your casting arm.',
          'You\'ve the wrist for it. Come back with a skyline rod and try for a flyingfish. They fight like the wind.',
        ],
      },
      {
        lines: [
          'Cloud fishing. You need a skyline rod — they sell them down at Windlass. Line long enough to reach the sea.',
          'You cast off the edge, into the white. Sprats bite in the tops. Flyingfish come up from underneath.',
          'Air\'s cheaper down there below the cloud line. Fish don\'t pay the tax. Lucky fish.',
        ],
      },
    ],
    barks: [
      { lines: ['Into the white, and wait.', 'Sprat\'s biting.', 'Mind the edge, it\'s a long way to the sea.'] },
    ],
  },

  // ── Wren Tolley — whose mother is becalmed ───────────────────────────
  {
    id: NPC.wren,
    name: 'Wren Tolley',
    title: 'Of the Becalmed Cots',
    look: { body: 0xe4c8ac, accent: 0x4f9a5a, hat: 'beanie', traits: ['scarf'], size: 0.85, eye: 0xcde9fb },
    at: { x: 1010, y: 1500 },
    talks: [
      {
        when: KING,
        lines: [
          'Every cot in the row\'s empty. EMPTY. Ma\'s down at the Ropewalk buying kite line like a girl.',
          'She says she\'s going to fly the biggest kite on Highspire, and it\'s going to have a rude face on it.',
        ],
      },
      {
        when: { questDone: Q_CORKED },
        lines: [
          'She sat up. She sat up and asked what day it was and then she asked why I hadn\'t brushed my hair.',
          'Ma\'s back. That\'s her, there, being cross at the toll-house. Isn\'t it the best noise you ever heard?',
        ],
      },
      {
        when: { quest: Q_CORKED },
        lines: [
          'Her bottle\'s on the end rack by the bellows. TOLLEY, it says, on a brass tag. Third row.',
          'The lift goes up at dusk. If it goes up with her in it, she never wakes. Please hurry.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'They say the Prince yielded. The cots are still full, though. The bottles are still on the rack.',
          'Nobody\'s said we can take them back. Nobody\'s said we can\'t. Everyone\'s just… looking at them.',
        ],
      },
      {
        lines: [
          'That\'s my Ma on the cot. She\'s not ill. She\'s becalmed. We fell behind on the tax at the turn of the month.',
          'The collectors corked her breath into a bottle and laid her down to sleep. She breathes, but only just.',
          'I\'m meant to work off the debt. I\'m eleven. I\'ve worked out it\'ll take me till I\'m forty.',
        ],
      },
    ],
    barks: [
      { when: { questDone: Q_CORKED }, lines: ['Ma! Ma, don\'t shout at the meter-man!', 'She\'s awake!'] },
      { lines: ['Breathe, Ma. Just a little.', 'The lift goes at dusk.', 'Third row. Brass tag.'] },
    ],
  },

  // ── Ma Tolley — only once her breath is home ─────────────────────────
  {
    id: NPC.maTolley,
    name: 'Ma Tolley',
    title: 'Lately Becalmed',
    look: { body: 0xd8b8a0, accent: 0x4f9a5a, hat: 'beanie', traits: ['apron', 'cane'], size: 1.05 },
    at: { x: 940, y: 1520 },
    present: { questDone: Q_CORKED },
    talks: [
      {
        when: KING,
        lines: [
          'I slept through three days of my own life on that cot. I dreamt I was a bottle on a shelf. I was.',
          'Now I\'m going to stay up for three days out of spite. Starting with this kite.',
        ],
      },
      {
        lines: [
          'You\'re the one who uncorked me. Wren told me. Wren tells everybody. Thank you — I mean it.',
          'It\'s like breathing through a wet sheet, being becalmed. You hear everything. You can\'t say a word.',
          'I heard the bellows every night. In, out. In, out. Like the whole spire was breathing for the King.',
        ],
      },
    ],
    barks: [{ lines: ['I can SHOUT again.', 'Nobody\'s corking me twice.', 'Where\'s that girl\'s hairbrush?'] }],
  },

  // ── Corvin Brass — the vane-smith ─────────────────────────────────────
  {
    id: NPC.corvin,
    name: 'Corvin Brass',
    title: 'Vane-Smith',
    look: { body: 0xb8906e, accent: 0x7e5c20, hat: 'goggles', traits: ['tool', 'apron', 'beard'], size: 1.15, eye: 0xf4d68e },
    at: { x: 1060, y: 690 },
    talks: [
      {
        when: KING,
        lines: [
          'I\'ve taken every pin out of every vane on the spire. They spin like tops. Nobody knows where the wind\'s from.',
          'Isn\'t it marvellous? We\'ll have to go outside and lick a finger like in the old days.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The Prince\'s own cock on the Weather House spun free last night. First time in his life.',
          'He stood under it in his nightshirt and watched. I know, because I was under there too.',
        ],
      },
      {
        when: { questDone: Q_NORTH },
        lines: [
          'Four vanes, four pins out, four true winds. The millers know when the gust is coming again.',
          'The Grindstone ran two hours on last night\'s blow. That\'s two hours of flour the meter never saw coming.',
        ],
      },
      {
        when: { quest: Q_NORTH },
        lines: [
          'The pins are at the foot of each pole, in the collar. Big brass ones with the Prince\'s mark. Pull them.',
          'The square\'s north-west vane, its north-east, the one by the bakery path, and the one on the east road.',
        ],
      },
      {
        lines: [
          'Every vane in this town is mine. Forty years I\'ve made them. Every one\'s a liar now.',
          'The Prince had them pinned. They all point at the toll-house, whatever the wind does. "Pay that way."',
          'A miller who can\'t read the wind misses the gust. A mill that misses the gust grinds short. Short is debt.',
        ],
      },
    ],
    barks: [
      { when: PRINCE, lines: ['Spin, you beauty!', 'True north! Whatever that is today!'] },
      { lines: ['Liars, all of them.', 'That one points at the toll. They all point at the toll.', 'Forty years.'] },
    ],
  },

  // ── Tuck Tailwind — the kite-boy ─────────────────────────────────────
  {
    id: NPC.tuck,
    name: 'Tuck Tailwind',
    title: 'Kite-Boy',
    look: { body: 0xe8d0b6, accent: 0xe0a02a, hat: 'aviator', traits: ['pack'], size: 0.75, eye: 0xcde9fb },
    at: { x: 1570, y: 1210 },
    talks: [
      {
        when: KING,
        lines: [
          'I flew a kite with NOTHING on it. No letter, no stamp, no meter-tag. Just to see.',
          'It went so high I lost it. I don\'t even care. Another one, I reckon. Bigger.',
        ],
      },
      {
        when: { questDone: Q_KITEMAIL },
        lines: [
          'All three letters got where they were going! The Hollins\' boy is coming home on the next lift down.',
          'Oriel came by after. Said she\'d fly the post for us herself. Glass line and all. Weird day.',
        ],
      },
      {
        when: { quest: Q_KITEMAIL },
        lines: [
          'The letters came down on the Kite Field when Oriel cut the lines. Over the bridges, in the grass by the posts.',
          'Find them before she does. She takes them to the Prince and he reads them out at supper. Out loud.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The Prince came out on the Kite Field and flew one. Badly. Really badly.',
          'I showed him how to let line out on a gust. He said thank you. Princes don\'t say that, do they?',
        ],
      },
      {
        lines: [
          'You can cross the bridges if you pay the breath on them. Or you can fly a letter over the gorge for nothing.',
          'Tie it to a kite, fly it across, the families on the far side reel it in. That\'s Kite Mail. It\'s illegal.',
          'Everything\'s illegal, if it\'s free. That\'s how you know it\'s good.',
        ],
      },
    ],
    barks: [
      { lines: ['Let it OUT, let it out!', 'Kite Mail! Free post!', 'Oriel\'s coming, hide the string!'] },
    ],
  },

  // ── Aurelia Gust — the Prince's steward ──────────────────────────────
  {
    id: NPC.aurelia,
    name: 'Aurelia Gust',
    title: 'Steward of the Weather House',
    look: { body: 0xe0ccb8, accent: 0x2c5a8a, hat: 'plume', traits: ['book', 'glasses'], size: 1.05, eye: 0x9fd0f2 },
    at: { x: 1400, y: 506 },
    talks: [
      {
        when: KING,
        lines: [
          'The Weather House is a weather house again. We tell people what the wind is doing. That is all.',
          'His Highness reads the barometer every morning and says "fair" whatever it says. He is learning.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'He has asked for the tally-books to be opened to the town. All of them. I said it would take a week.',
          'He said "then take a fortnight, and let them come in and read." I have been his steward nine years.',
        ],
      },
      {
        when: { courtReady: 'galeward' },
        lines: [
          'All five. His Highness watched every one from the cupola. He was quiet for an hour after the last.',
          'He is not a cruel man. He is a measuring man. His father taught him that everything has a price in air.',
        ],
      },
      {
        lines: [
          'The Weather House. His Highness Prince Zephyr governs Galeward from here for the King, his father.',
          'Every gust that crosses the shoulder is logged in this house, and every lungful drawn in it is billed.',
          'Should you wish an audience, the court\'s five champions must be met first. That is the custom.',
        ],
      },
    ],
    barks: [
      { lines: ['Fair, with gusts.', 'The cupola is not open to the public.', 'His Highness is reading the glass.'] },
    ],
  },

  // ── Old Nan Brisk — the oldest kite-flyer ────────────────────────────
  {
    id: NPC.nan,
    name: 'Nan Brisk',
    title: 'Oldest Kite on the Shoulder',
    look: { body: 0xd8c0a8, accent: 0xe8642a, hat: 'plume', traits: ['cane', 'scarf', 'glasses'], size: 0.85 },
    at: { x: 1300, y: 760 },
    talks: [
      {
        when: KING,
        lines: [
          'I taught that boy to fly a kite when he was four. He\'s promised to come and fly one with me Sunday.',
          'I\'ll be ninety-one. I intend to beat him.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'He came and sat on this bench. Didn\'t say much. Asked if I still had the red kite. I have.',
          'I gave it him. He held it like it might bite. Then he took it up the Leap. Good lad.',
        ],
      },
      {
        lines: [
          'Ninety years I\'ve watched the wind on this square. Used to be free, the wind. Can you imagine?',
          'The Prince was the best kite-flyer this shoulder ever saw, as a boy. Better than Oriel. Better than me.',
          'His father took the line off him and gave him an anemometer instead. Said play was air wasted.',
        ],
      },
    ],
    barks: [
      { lines: ['Free, it used to be.', 'Red kite. Long tail.', 'Sit down, you\'re in my wind.'] },
    ],
  },
];

// ── The crowd ─────────────────────────────────────────────────────────

const looks: NpcLook[] = [
  { body: 0xd6b494, accent: 0xf6f0e2, hat: 'cap', traits: ['apron'] },
  { body: 0xe4c8ac, accent: 0xc8402e, hat: 'aviator', traits: ['scarf'], size: 0.78 },
  { body: 0xc49a7c, accent: 0x3a6fb8, hat: 'beanie', traits: ['satchel'] },
  { body: 0xdcbca0, accent: 0xe0a02a, hat: 'plume', traits: ['scarf'] },
  { body: 0xb8906e, accent: 0x5a4430, hat: 'cap', traits: ['tool', 'beard'], size: 1.15 },
  { body: 0xe8d0b6, accent: 0x4f9a5a, hat: 'souwester', traits: ['rod'] },
  { body: 0xcfa585, accent: 0xd2a446, hat: 'tophat', traits: ['book', 'glasses'] },
  { body: 0xd9b89a, accent: 0xe8642a, hat: 'none', traits: ['pack'], size: 0.72 },
];

const barks: Talk[] = [
  {
    when: KING,
    lines: [
      'They\'re breaking the bottles at the Lung!',
      'I took my meter off. LOOK. Nothing.',
      'Breathe in! Go on! All of it!',
      'The bellows have stopped!',
    ],
  },
  {
    when: PRINCE,
    lines: [
      'The Prince yielded!',
      'The cock on the Weather House is spinning free.',
      'Is the toll still on? Nobody\'s at the bellows.',
      'Fly something. Go on.',
    ],
  },
  {
    when: { courtReady: 'galeward' },
    lines: [
      'Someone\'s beaten all five of the Prince\'s.',
      'They say the stranger\'s going up to the Weather House.',
    ],
  },
  {
    lines: [
      'Don\'t breathe so loud, the meter hears.',
      'Wind\'s up. Mills\'ll turn.',
      'The lift goes at dusk.',
      'Short breaths. Short breaths.',
      'My needle\'s in the yellow.',
      'Gust coming — hold your hat.',
      'Three more on the cots this week.',
      'Kite\'s up! Somebody\'s kite\'s up!',
    ],
  },
];

export const GALEWARD_CROWD: NonNullable<AreaDef['crowd']> = {
  count: 14,
  looks,
  paths: [
    // Up and down Vane Street.
    [{ x: 1200, y: 1600 }, { x: 1200, y: 1060 }, { x: 1200, y: 1300 }],
    // Across the square and out the west and east roads.
    [{ x: 160, y: 850 }, { x: 1000, y: 850 }, { x: 1400, y: 850 }, { x: 2240, y: 850 }],
    [{ x: 2240, y: 850 }, { x: 1400, y: 850 }, { x: 1000, y: 850 }, { x: 160, y: 850 }],
    // Mill Row and down to the Grindstone.
    [{ x: 160, y: 450 }, { x: 900, y: 465 }, { x: 610, y: 462 }, { x: 610, y: 840 }],
    // Round the square.
    [{ x: 1040, y: 790 }, { x: 1360, y: 790 }, { x: 1360, y: 930 }, { x: 1040, y: 930 }],
    // Over the bridges to the Kite Field.
    [{ x: 1300, y: 1180 }, { x: 1620, y: 1180 }, { x: 1840, y: 1180 }, { x: 2260, y: 1180 }, { x: 1840, y: 1180 }, { x: 1620, y: 1180 }],
    // To the bakery and back.
    [{ x: 1200, y: 1120 }, { x: 960, y: 1180 }, { x: 1200, y: 1120 }, { x: 1200, y: 1400 }],
  ],
  barks,
};
