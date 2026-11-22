import type { AreaDef, NpcDef, NpcLook, Talk } from '../../../../IslesTypes';

/**
 * The people of the Dynamo Court.
 *
 * Dynamo is the first court up the cable road from Terminus, so its people do the explaining: what
 * the Draw is (a quota of current every household cranks by hand, drawn off down the wires at the
 * Brownout Bell), what *switched off* means (lights, heat and your own electric door-lock cut until
 * the debt is paid — locked out of your house, or in it), and what *earthed* means (three times
 * off, and the cage takes you up the Crown Coil to crank in the Treadmill Galleries). Everyone here
 * cranks. They talk about current the way other towns talk about bread — and the Ovenlight is the
 * one place in the court where they can still talk about bread.
 */

const PRINCE = { prince: 'volt' } as const;
const EMPRESS = { monarch: 'ohmrine' } as const;

const Q_METER = 'dynamo-q-crooked-meter';
const Q_LOAF = 'dynamo-q-brownout-loaf';
const Q_CAGE = 'dynamo-q-three-times-off';
const Q_RACE = 'dynamo-q-race-grilles';
const Q_BELL = 'dynamo-q-brownout-bell';

export const DYNAMO_NPCS: NpcDef[] = [
  // ── Ottilie Spool — the shop ─────────────────────────────────────────
  {
    id: 'dynamo-ottilie',
    name: 'Ottilie Spool',
    title: 'Spool & Sons, Cablewrights',
    look: { body: 0xc8a48a, accent: 0xc9763b, hat: 'goggles', traits: ['apron', 'tool'], size: 1.05, eye: 0xf2ac6c },
    at: { x: 680, y: 1452 },
    role: { kind: 'shop', id: 'dynamo-shop' },
    talks: [
      {
        when: EMPRESS,
        lines: [
          'They\'re taking the Grid down. Pylon by pylon. Asked me to coil the cable. Me! I wound half of it.',
          'I\'ll wind it into washing lines. Copper washing lines. Sheets on every roof, and no meter on any of them.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The hall\'s gone quiet. You can hear the race again. I\'d forgotten the race had a voice of its own.',
          'Charms are still on the bench. The copper doesn\'t care who\'s in charge. It just carries.',
        ],
      },
      {
        when: { questDone: Q_METER },
        lines: [
          'Quill Tally\'s seals, scratched, all down the row. And everyone thought it was just a lean season.',
          'Hettie\'s at the Board making Ambrose re-chalk the whole terrace. He\'s doing it. He looks relieved.',
        ],
      },
      {
        lines: [
          'Spool and Sons. There are no sons. There was a Spool. Now there\'s me, and a lot of copper.',
          'Every inch of cable over your head came off my frame. I wound the wire that switches people off.',
          'Somebody would have. I tell myself that on the nights the Bell goes and a door goes dark.',
          'Charms on the bench — you can wear three. Wound copper does what it\'s told. Tell it something good.',
          'Meal\'s in the sack by the door, for the Ovenlight. Bettony won\'t bake on an empty bin.',
        ],
      },
    ],
    barks: [
      { when: PRINCE, lines: ['Washing lines! Who wants copper washing lines?', 'Listen — the race.'] },
      {
        lines: [
          'Wound copper, fair weight!', 'Mind the drum, it rolls.', 'Insulators, two a penny.',
          'Charms on the bench.', 'Every inch off my frame.',
        ],
      },
    ],
  },

  // ── Bettony Crust — the Ovenlight (bakery) ───────────────────────────
  {
    id: 'dynamo-bettony',
    name: 'Bettony Crust',
    title: 'The Ovenlight',
    look: { body: 0xe6c6a6, accent: 0xff8a3a, hat: 'chef', traits: ['apron', 'satchel'], size: 1.15, eye: 0xffd98a },
    at: { x: 1720, y: 1452 },
    role: { kind: 'bakery', id: 'dynamo-ovenlight' },
    talks: [
      {
        when: EMPRESS,
        lines: [
          'Wren Filament came in last night with her lantern lit and set it on my counter. A FLAME. In my shop.',
          'I\'ve wanted to bake over a flame my whole life. Coils are cold-hearted things. Pass me that match.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The Bell didn\'t ring last night. I baked till dawn anyway — habit. Then I gave the lot away on the step.',
          'Bring me fish and I\'ll bake for you. Same as always. The ovens are still metered. For now.',
        ],
      },
      {
        when: { questDone: Q_LOAF },
        lines: [
          'The Draycott children ate a whole loaf between them standing at the door. Crumbs on the frost.',
          'Rimewell Sharpe wrote me up for "heat loss to an unmetered house". I\'ve framed it.',
        ],
      },
      {
        when: { quest: Q_LOAF },
        lines: [
          'Spark minnows, off the race by the wheelhouses. Two of them. They keep a loaf soft in the cold.',
          'Then bring them here and I\'ll bake. A switched-off kitchen can\'t, you see. No current, no oven.',
        ],
      },
      {
        lines: [
          'The Ovenlight. Coil ovens, behind that round window. Mine\'s the last warm glass on the lane after the Bell.',
          'Flame is contraband, love. So I bake on current — and the ovens draw double the Draw, every night.',
          'I crank for the shop with my own two arms, and my nephew does the night turn. We are never short.',
          'Bring me fish, and meal from Spool\'s, and I\'ll bake you something to fight on. Or something to give away.',
        ],
      },
    ],
    barks: [
      { when: PRINCE, lines: ['Free loaves on the step!', 'No Bell! Bake all night!'] },
      {
        lines: [
          'Hot bread! Metered, mind.', 'Mind the coils, they bite.', 'Fish for the oven?',
          'Ovenlight\'s open till the Bell.', 'Crust on everything.',
        ],
      },
    ],
  },

  // ── Hettie Whitlow — Crank Row, No. 12 ───────────────────────────────
  {
    id: 'dynamo-hettie',
    name: 'Hettie Whitlow',
    title: 'Crank Row, No. 12',
    look: { body: 0xd4b294, accent: 0x6cc6a6, hat: 'bandana', traits: ['apron', 'tool'], size: 0.95 },
    at: { x: 400, y: 1452 },
    talks: [
      {
        when: EMPRESS,
        lines: [
          'I took the crank handle out of the wall this morning. There\'s a hole now. The wind comes in. I love it.',
          'My lads are asleep. At noon! Asleep, in a house with the lights on, and nobody counting.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The Board\'s been wiped. Ambrose wiped it himself. No tags. Not one red tag on the whole Row.',
          'I keep cranking at night. My arms don\'t know how to stop. My lads tell me to sit down. I can\'t yet.',
        ],
      },
      {
        when: { questDone: Q_METER },
        lines: [
          'Ambrose re-chalked us. Full Draw, every night for a month. FULL. And the tag\'s off my door.',
          'Tally\'s been taken off the round. They say he\'ll be cranking himself, now. Let his arms learn.',
        ],
      },
      {
        when: { quest: Q_METER },
        lines: [
          'The seals on the meters — the little brass ones the reader stamps. Look at the neighbours\' doors.',
          'If they\'re scratched like mine, take them to Ambrose at the Board. He reads true, when he\'s let.',
        ],
      },
      {
        lines: [
          'That\'s mine, twelve. The one with the red tag. Switched off once already. Two more and we\'re earthed.',
          'We crank full. Me and my two lads, all night, on the crank in the kitchen. Full. Every night.',
          'And every morning the meter reads short. Like the current goes somewhere on its way to the wire.',
        ],
      },
    ],
    barks: [
      { when: { questDone: Q_METER }, lines: ['Full Draw! Chalked full!', 'Tag\'s off the door.'] },
      { lines: ['Crank, lads, crank.', 'Short again. SHORT.', 'Where does it go?', 'One tag. Only one.'] },
    ],
  },

  // ── Ambrose Ledger — the Meter Board ─────────────────────────────────
  {
    id: 'dynamo-ambrose',
    name: 'Ambrose Ledger',
    title: 'Clerk of the Meter Board',
    look: { body: 0xd8c4ae, accent: 0x2a3038, hat: 'tophat', traits: ['glasses', 'book'], size: 0.95, eye: 0xe6e2d6 },
    at: { x: 980, y: 1626 },
    talks: [
      {
        when: EMPRESS,
        lines: [
          'I have wiped the Board. I have broken the chalk. I have kept the ledger, though. Somebody should remember.',
          'Every household, every night, every tag. It will be read aloud one day, to someone who has to listen.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'No Draw was taken last night. I stood at the Board at the Bell with my chalk up, and nothing came.',
          'I wrote "nothing" in the ledger. Nine letters\' worth of nothing. Best line I\'ve ever written.',
        ],
      },
      {
        when: { questDone: Q_METER },
        lines: [
          'I have re-chalked Crank Row back a month. Eleven tags came off. Eleven doors with the lights back.',
          'I should have looked at the seals myself. I read numbers. Nobody ever asked me to read people.',
        ],
      },
      {
        lines: [
          'The Meter Board. Every household\'s Draw, chalked nightly from the master meter at the Bell.',
          'Short is tagged red. Three tags and the household is earthed — I write the name; the cage does the rest.',
          'I only write what the meter says. The meter is never wrong. That is the whole of my faith.',
        ],
      },
    ],
    barks: [
      { lines: ['Number nine, full.', 'Number twelve… short.', 'Chalk. More chalk.', 'The meter is never wrong.'] },
    ],
  },

  // ── Sal Draycott — Crank Row, No. 13, switched off twice ─────────────
  {
    id: 'dynamo-sal',
    name: 'Sal Draycott',
    title: 'Crank Row, No. 13',
    look: { body: 0xc4a68a, accent: 0x9ed6e6, hat: 'hood', traits: ['scarf', 'pack'], size: 0.9 },
    at: { x: 290, y: 1452 },
    talks: [
      {
        when: EMPRESS,
        lines: [
          'The door unlocked itself at dawn. Just — click. Every door on the Row did it at once. We all came out.',
          'Nobody said anything. We stood in the street in our blankets and listened to the doors.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The current came back on in the night. The lock clicked. The kettle started singing all on its own.',
          'My girls thought it was a ghost. It was only the Grid, letting go.',
        ],
      },
      {
        when: { questDone: Q_LOAF },
        lines: [
          'Bread. Warm bread, through the door, on a switched-off night. My girls held it like a lamp.',
          'Tell Bettony she\'s mad. Tell her thank you. Tell her both, she\'ll know which is which.',
        ],
      },
      {
        lines: [
          'Thirteen. Two tags. The lock\'s dead, so I can\'t get in my own door till the debt\'s cranked off.',
          'My girls are inside. I talk to them through the letterbox. It\'s cold in there. No current, no heat.',
          'I crank on the treadwheel by day to pay it off. One more short night and we\'re all earthed.',
        ],
      },
    ],
    barks: [
      { when: { questDone: Q_LOAF }, lines: ['Warm bread!', 'Crumbs on the frost.'] },
      { lines: ['(at the letterbox) Mummy\'s here.', 'Two tags.', 'So cold in there.', 'One more night.'] },
    ],
  },

  // ── Ada Coil — her brother is three times off ────────────────────────
  {
    id: 'dynamo-ada',
    name: 'Ada Coil',
    title: 'Sister of the Earthed',
    look: { body: 0xd0aa8c, accent: 0x52bfff, hat: 'beanie', traits: ['satchel', 'scarf'], size: 0.95 },
    at: { x: 1112, y: 340 },
    talks: [
      {
        when: EMPRESS,
        lines: [
          'The earthed are coming down the rails on foot. Hundreds. Jory says he saw the Empress\'s chair, empty.',
          'He says the Galleries are quiet now. He says he can\'t sleep for the quiet.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The cage is standing open and nobody\'s guarding it. Children are playing in it. I let them.',
          'Jory\'s mending our crank. Not to crank — just to hear it go round with nobody owing anything.',
        ],
      },
      {
        when: { questDone: Q_CAGE },
        lines: [
          'Jory\'s home. Thin as a wire and twice as stubborn. He\'s asleep across the doorway so nobody can take him.',
          'Mott let the cage go up empty. Empty! He signed for it full. Brave old fool.',
        ],
      },
      {
        when: { quest: Q_CAGE },
        lines: [
          'Talk to Mott. He keeps the cage. He\'s not a bad man — he just has the key, and keys are heavy.',
        ],
      },
      {
        lines: [
          'That\'s my brother in the cage. Jory. Three times off. He goes up the rails tonight, at the Bell.',
          'Three short nights. He hurt his hand on the crank, and he cranked one-handed, and it wasn\'t enough.',
          'They say the Galleries need arms. They don\'t say when they give the arms back.',
        ],
      },
    ],
    barks: [
      { when: { questDone: Q_CAGE }, lines: ['He\'s home. He\'s HOME.'] },
      { lines: ['Jory. I\'m here.', 'At the Bell. Tonight.', 'Three short nights.', 'One hand. He had one hand.'] },
    ],
  },

  // ── Mott Earley — turnkey of the earthing cage ───────────────────────
  {
    id: 'dynamo-mott',
    name: 'Mott Earley',
    title: 'Turnkey of the Earthing Cage',
    look: { body: 0xb89a7e, accent: 0x7a3e1d, hat: 'helmet', traits: ['tool', 'beard'], size: 1.2 },
    at: { x: 1040, y: 302 },
    talks: [
      {
        when: EMPRESS,
        lines: [
          'I\'ve thrown the key in the race. Heard it go plink off the wheel. Best sound I ever heard it make.',
          'I\'ll be needing work. I\'m good with locks. Opening them, I mean. I\'ve decided I\'m good at opening them.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'No orders come down from the hall. The cage stands where it stands. I oil the wheels from habit.',
        ],
      },
      {
        when: { questDone: Q_CAGE },
        lines: [
          'The cage went up empty last night. The book says full. I\'ve a steady hand for a book. Always had.',
          'If they ask, the lock failed. Locks fail. It\'s a dreadful thing, how often locks fail.',
        ],
      },
      {
        lines: [
          'Turnkey. I see the earthed into the cage at the Bell, and the cage up the rails to the Coil.',
          'My father went up in it. I was twelve. They gave me his key, so to speak. A job for a job.',
          'The lock\'s live, see — current holds it shut, not me. I couldn\'t open it if I wanted. Mostly.',
        ],
      },
    ],
    barks: [
      { lines: ['Stand back of the bars.', 'Current holds it. Not me.', 'At the Bell, she rolls.', 'Oil on the wheels.'] },
    ],
  },

  // ── Bram Sluice — keeper of the race ─────────────────────────────────
  {
    id: 'dynamo-bram',
    name: 'Bram Sluice',
    title: 'Keeper of the Race',
    look: { body: 0xc8aa8e, accent: 0x183844, hat: 'souwester', traits: ['rod', 'satchel', 'pipe'], size: 1.1 },
    at: { x: 2170, y: 1300 },
    talks: [
      {
        when: EMPRESS,
        lines: [
          'They\'ve lifted all the grilles. The trout are running up the race and nobody minds a wheel stopping.',
          'A wheel stopping! I used to dream about it. Bad dreams. Now I dream it on purpose.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'Tessa came by and said sorry. For the fines. Didn\'t know she had the word in her. Nor did she.',
          'Fish the race all you like, friend. It\'s only water again.',
        ],
      },
      {
        when: { questDone: Q_RACE },
        lines: [
          'Grilles clear, the wheels turning, and Tessa sat in the race up to her middle, laughing. Well done.',
          'Ivy had a trout on the wheel. First fish she\'s eaten in a month. She said it tasted of the river.',
        ],
      },
      {
        lines: [
          'The race. Cut straight off the storm river to drive the wheelhouses. I keep the grilles clean.',
          'Fish clog the grilles, the wheel stops, the Wheelhouse comes up short, and the fine lands on me.',
          'Fishing here needs an insulated rod — the race is charged. Terminus sells them. The fish fight back.',
        ],
      },
    ],
    barks: [
      { lines: ['Mind the grilles!', 'Trout in the wheel again.', 'Charged water, friend.', 'The race never stops.'] },
    ],
  },

  // ── Ivy Faraday — on the treadwheel, once the Prince's governess ──────
  {
    id: 'dynamo-ivy',
    name: 'Ivy Faraday',
    title: 'On the Treadwheel',
    look: { body: 0xe0ccb8, accent: 0x6a4a30, hat: 'none', traits: ['glasses', 'scarf', 'book'], size: 0.9, eye: 0xd6f4ff },
    at: { x: 330, y: 730 },
    talks: [
      {
        when: EMPRESS,
        lines: [
          'I have stepped off the wheel. It went on turning for a while without me. Then it stopped.',
          'I should like to teach again. Something useless. Poetry. The names of stars nobody can see in this storm.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'He came to the yard. Volt. He stood at the wheel and asked me to stop walking. Asked, not told.',
          'I stepped off. He held my hand to steady me. His hand was shaking. It always was, poor boy.',
        ],
      },
      {
        when: { questDone: Q_RACE },
        lines: [
          'Trout! A whole trout, on the wheel, from a stranger. I ate it walking. I am very good at eating walking.',
        ],
      },
      {
        lines: [
          'Don\'t mind me. I walk the wheel by day for the households behind on the Draw. One step, one spark.',
          'I was a governess once, up at the hall. I taught a little prince his letters. He couldn\'t sit still.',
          'Now I am a unit of current. It is very restful, being a unit. Nobody asks a unit anything.',
        ],
      },
    ],
    barks: [
      { lines: ['One step, one spark.', 'Left. Right. Left.', 'Mind the slats.', 'He never could sit still.'] },
    ],
  },

  // ── Sexton Dunmore — ringer of the Brownout Bell ─────────────────────
  {
    id: 'dynamo-dunmore',
    name: 'Sexton Dunmore',
    title: 'Ringer of the Brownout Bell',
    look: { body: 0xbca58e, accent: 0xc8a24a, hat: 'antenna', traits: ['cane', 'glasses'], size: 1, eye: 0xffe45e },
    at: { x: 1330, y: 1644 },
    talks: [
      {
        when: EMPRESS,
        lines: [
          'One last time, Wren says. She wants the Bell rung once more, and then never. I\'m to do it. My last ring.',
          'I shall ring it slow. Let them all hear it go. Then I\'ll take the hammer off and use it for a doorstop.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'His Highness came down at the Bell and didn\'t ring it. Stood under it with his hand on the bronze.',
          'Then he went and sat on the Ovenlight step. I\'ve never seen him sit. I didn\'t know he had a sitting shape.',
        ],
      },
      {
        when: { questDone: Q_BELL },
        lines: [
          'You put him down. The Bell\'s still hanging, but nobody\'s rung it. The hammer\'s cold.',
        ],
      },
      {
        when: { courtReady: 'dynamo' },
        lines: [
          'All five of the Prince\'s champions down. He\'ll have heard. He hears everything over the wires.',
        ],
      },
      {
        lines: [
          'The Brownout Bell. I don\'t ring it — the solenoid does. I only watch the hammer fall, every night.',
          'At the Bell the Draw goes up the wires. Every lamp dims. Then the short houses go dark, one by one.',
          'And the Prince comes running down from the hall to watch. Every night. He runs everywhere, that boy.',
        ],
      },
    ],
    barks: [
      { lines: ['An hour to the Bell.', 'Hammer\'s warm.', 'Mind under the tower.', 'Dim, then dark.'] },
    ],
  },
];

const looks: NpcLook[] = [
  { body: 0xc8a88c, accent: 0xc9763b, hat: 'antenna', traits: ['tool'] },
  { body: 0xd8bca0, accent: 0x52bfff, hat: 'cap', traits: ['apron'] },
  { body: 0xb8967a, accent: 0x6cc6a6, hat: 'bandana', traits: ['satchel'] },
  { body: 0xdcc0a4, accent: 0xd8382e, hat: 'propeller', traits: ['scarf'], size: 0.74 },
  { body: 0xa8886e, accent: 0x3b414b, hat: 'helmet', traits: ['tool', 'beard'], size: 1.15 },
  { body: 0xe4ccb4, accent: 0xc8a24a, hat: 'hood', traits: ['pack'] },
  { body: 0xc49c80, accent: 0x9ed6e6, hat: 'goggles', traits: ['apron', 'tool'] },
  { body: 0xd2b090, accent: 0xb59cff, hat: 'beanie', traits: ['scarf'], size: 0.78 },
];

const barks: Talk[] = [
  {
    when: EMPRESS,
    lines: [
      'The Grid\'s coming down!', 'My door opened on its own!', 'Wren lit a lamp. A real one!',
      'Nobody\'s cranking!', 'I can hear my own feet.',
    ],
  },
  {
    when: PRINCE,
    lines: [
      'The Prince yielded!', 'No Draw tonight?', 'The hall\'s gone dark.', 'Is the Bell still on?',
      'Ambrose wiped the Board!',
    ],
  },
  {
    when: { courtReady: 'dynamo' },
    lines: ['All five of them, beaten.', 'They say the stranger\'s going up to the hall.'],
  },
  {
    lines: [
      'An hour to the Bell.', 'Crank, crank, crank.', 'Number nine\'s full.', 'Two tags on the Draycotts.',
      'Mind the wire.', 'Don\'t stand under the rods.', 'Short again.', 'Who\'s on the wheel tonight?',
      'Smell that? Bread.', 'No candles. NO candles.',
    ],
  },
];

export const DYNAMO_CROWD: NonNullable<AreaDef['crowd']> = {
  count: 14,
  looks,
  paths: [
    // Up and down the main road.
    [{ x: 1200, y: 1620 }, { x: 1200, y: 1300 }, { x: 1200, y: 900 }, { x: 1200, y: 560 }, { x: 1200, y: 900 }, { x: 1200, y: 1300 }],
    // The Cross Road, both ways.
    [{ x: 120, y: 850 }, { x: 900, y: 850 }, { x: 1500, y: 850 }, { x: 2280, y: 850 }],
    [{ x: 2280, y: 850 }, { x: 1500, y: 850 }, { x: 900, y: 850 }, { x: 120, y: 850 }],
    // Crank Row.
    [{ x: 160, y: 1470 }, { x: 600, y: 1470 }, { x: 1100, y: 1470 }, { x: 600, y: 1470 }],
    // Ovenlight Lane.
    [{ x: 1300, y: 1470 }, { x: 1720, y: 1480 }, { x: 2250, y: 1470 }, { x: 1720, y: 1480 }],
    // Over the west footbridge to the yard.
    [{ x: 500, y: 1460 }, { x: 500, y: 1200 }, { x: 500, y: 860 }, { x: 500, y: 760 }, { x: 500, y: 860 }, { x: 500, y: 1200 }],
    // Up to the hall forecourt.
    [{ x: 1200, y: 520 }, { x: 1500, y: 520 }, { x: 1950, y: 520 }, { x: 1500, y: 520 }],
    // The race bank by the wheelhouses.
    [{ x: 1300, y: 1100 }, { x: 1530, y: 1100 }, { x: 2100, y: 1100 }, { x: 1530, y: 1100 }],
  ],
  barks,
};
