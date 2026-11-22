import type { AreaDef, NpcDef, NpcLook, Talk } from '../../../../IslesTypes';

/**
 * The people of the Forge Court.
 *
 * Forge pays the Stone Tithe in iron: the season's stone is owed as ore, smelted, and hung on the
 * Tithe Hook as pig, by weight. A household that hangs light is *interred* — the smith walled up
 * in a Sepulchre cell, the forge bricked up and the Regent's seal riveted over its door, and a
 * bell cast in the pit with the name round its lip, to be rung once and never again. The old
 * hammer-songs are buried too: every smith in town strikes to the Great Trip-Hammer's beat, in
 * silence, and a smith caught singing at the anvil is weighed short on the spot. People here talk
 * in weights and heats, and they listen for the hammer even in their sleep.
 */

const PRINCE = { prince: 'anvil' } as const;
const REGENT = { monarch: 'gravane' } as const;

const Q_WEIGHT = 'forge-q-short-weight';
const Q_PERCH = 'forge-q-night-shift';
const Q_SONG = 'forge-q-song-in-the-bell';
const Q_COLLARS = 'forge-q-collar-blanks';
const Q_HEAT = 'forge-q-last-heat';

export const FORGE_NPCS: NpcDef[] = [
  // ── Mags Clinker — the shop ──────────────────────────────────────────
  {
    id: 'forge-mags',
    name: 'Mags Clinker',
    title: 'Clinker & Daughter, Ironmongers',
    look: { body: 0xc89a7a, accent: 0x7a4a34, hat: 'coif', traits: ['apron', 'tool'], size: 1.1, eye: 0xffc23a },
    at: { x: 740, y: 764 },
    role: { kind: 'shop', id: 'forge-shop' },
    talks: [
      {
        when: REGENT,
        lines: [
          'They\'re unsealing the cells. I\'ve a crowbar for every household on the Row and I\'m giving them away.',
          'Giving! Me! Ezra would laugh himself silly. Charms are still for sale. I\'m not a saint.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The Great Hammer\'s stopped. First time in thirty years. I can hear my own kettle.',
          'He came by the shop. The Prince. Stood in the door like a boy. Asked if Ezra\'s tongs were still here.',
        ],
      },
      {
        when: { quest: Q_HEAT },
        lines: [
          'He was a gentle boy, you know. Liked hinges. Liked things that swung and chimed.',
          'Ezra taught him for a year. Then the Regent came to watch a lesson, and Ezra was interred for "softness".',
        ],
      },
      {
        lines: [
          'Clinker and Daughter. I\'m the daughter. Clinker\'s been in the Sepulchre eleven years. He hung light.',
          'The Iron Tithe, love: your stone\'s owed as ore, smelted, and hung on the Hook as pig. By weight.',
          'Hang light and they wall you up. Brick your forge. Cast your name on a bell. You\'ll see the bells.',
          'Charms on the rail behind me. Three at a time, they\'ll take. Forge-made. They\'ll fight with you.',
        ],
      },
    ],
    barks: [
      { when: PRINCE, lines: ['Listen! No hammer!', 'I can hear the kettle!'] },
      { lines: ['Nails, hinges, charms!', 'Don\'t touch that, it\'s hot.', 'Everything\'s hot, love. That\'s the trade.', 'Mind the Hook.'] },
    ],
  },

  // ── Ada Ferrous — the household that hangs light ─────────────────────
  {
    id: 'forge-ada',
    name: 'Ada Ferrous',
    title: 'Railhand\'s Girl',
    look: { body: 0xd8b090, accent: 0xb07a3a, hat: 'cap', traits: ['satchel', 'scarf'], size: 0.74, eye: 0xffd080 },
    at: { x: 1300, y: 1396 },
    talks: [
      {
        when: REGENT,
        lines: [
          'Ma\'s teaching me to tap a furnace. Proper, not for the Hook. Just because it\'s good iron.',
          'I\'m going to make a rail of my own, all the way to the sea. Nobody hangs rails.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The Hook\'s chained up! Prudence put a padlock on it and sat on the counterweight.',
          'Ma says we don\'t have to hang anything ever again. I\'m going to hang my coat on it.',
        ],
      },
      {
        when: { questDone: Q_WEIGHT },
        lines: [
          'Full weight. FULL. Ma cried, then she shouted at the Hookwarden, then she cried again.',
          'I\'m still bringing slag home, though. You never know. You never ever know.',
        ],
      },
      {
        when: { quest: Q_WEIGHT },
        lines: [
          'Round the slag heaps, in the scrapyard. Little nuggets with a shine. Iron the furnace missed.',
          'Then to Prudence at the Hook. She weighs straight. Mostly. She weighs straight for us.',
        ],
      },
      {
        lines: [
          'Our pig\'s light. Seven stone short. The furnace ate a charge — it happens, it HAPPENS — and we\'re short.',
          'Ma says don\'t worry. Ma\'s been at the Hook every night measuring, so she\'s worried.',
          'They brick the door. They take you down the hill. I\'ve seen it. I\'ve seen it done to the Pecks.',
        ],
      },
    ],
    barks: [
      { when: { questDone: Q_WEIGHT }, lines: ['Full weight!', 'Ma\'s still home!'] },
      { lines: ['Seven stone short.', 'Cart coming!', 'Off the rails, you lot!'] },
    ],
  },

  // ── Prudence Tare — the clerk of the Hook ────────────────────────────
  {
    id: 'forge-prudence',
    name: 'Prudence Tare',
    title: 'Clerk of the Tithe Hook',
    look: { body: 0xe0c8b0, accent: 0x3c4046, hat: 'tophat', traits: ['book', 'glasses'], size: 0.95 },
    at: { x: 1110, y: 860 },
    talks: [
      {
        when: REGENT,
        lines: [
          'I am reading the ledger backwards. Every name that was hung light, I am writing to their cell.',
          'Six hundred letters. I have the hand for it. I have nothing but the hand for it.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'I have chained the steelyard. The Hookwarden asked by what authority. I said: mine. He went away.',
          'I have never said "mine" before about anything. It was very exciting. I had to sit down.',
        ],
      },
      {
        when: { questDone: Q_WEIGHT },
        lines: [
          'Ferrous, Ada\'s household: full weight. Written in ink. Ink does not come off.',
          'The Hookwarden says I weighed slag. I weighed iron. Whose furnace it came out of is not a weight.',
        ],
      },
      {
        lines: [
          'Clerk of the Hook. I read the beam and write the weight. That is the whole of my job. That is all.',
          'The beam is honest. The counterpoise is honest. It is only what comes after that is not.',
          'Short households I write in red. I have used more red ink this year than in my whole life.',
        ],
      },
    ],
    barks: [
      { when: PRINCE, lines: ['Mine. It\'s mine. The chain is mine.', 'No more red ink.'] },
      { lines: ['Next household.', 'Hold still, it\'s swinging.', 'Ninety-one stone, four.', 'In red. I\'m sorry.'] },
    ],
  },

  // ── Nan Haskell — the slag-picker who feeds the night shift ──────────
  {
    id: 'forge-nan',
    name: 'Nan Haskell',
    title: 'Slag-Picker',
    look: { body: 0xb89070, accent: 0x5a3a24, hat: 'hood', traits: ['pack', 'cane'], size: 0.88, eye: 0xd8e2e8 },
    at: { x: 360, y: 1276 },
    talks: [
      {
        when: REGENT,
        lines: [
          'The cells are open and half the town is coming home thin as rail. My pot\'s been on since dawn.',
          'Bring me perch, if you\'re passing. The pond\'s anyone\'s now. It was always anyone\'s.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The Prince sent a cart of coal to my door. Didn\'t say why. I know why. Guilt burns well.',
        ],
      },
      {
        when: { questDone: Q_PERCH },
        lines: [
          'Fed the whole night shift off your perch, and Fenwick had seconds and thirds.',
          'The Reeve\'s still sulking at the pond. Let her. Cold women sulk longest.',
        ],
      },
      {
        when: { quest: Q_PERCH },
        lines: [
          'Ironscale perch, three. Cast off the kerb where the steam\'s thickest — they like it warm.',
          'Then take them to Fenwick at the third furnace. He\'ll say he\'s not hungry. Feed him anyway.',
        ],
      },
      {
        lines: [
          'I pick the slag heaps for what the furnace missed. A good week, I find a pound. A bad week, a burn.',
          'The night shift work till dawn on nothing. Nobody eats before the Hook. Eat, and you\'re short.',
          'That\'s the Tithe, here. Not just the iron. Everything around it, too.',
        ],
      },
    ],
    barks: [
      { when: { questDone: Q_PERCH }, lines: ['Soup\'s on!', 'Thirds, Fenwick? THIRDS?'] },
      { lines: ['Pound a week.', 'Mind the hot ones.', 'Slag\'s sharp as gossip.'] },
    ],
  },

  // ── Fenwick Bellows — the old bellows-man at the third furnace ───────
  {
    id: 'forge-fenwick',
    name: 'Fenwick Bellows',
    title: 'Blower at Number Three',
    look: { body: 0xc4987a, accent: 0x6a3428, hat: 'beanie', traits: ['beard', 'apron'], size: 1.2, eye: 0xf06a1a },
    at: { x: 1000, y: 540 },
    talks: [
      {
        when: REGENT,
        lines: [
          'WHAT? THE REGENT? GONE? GOOD! I SAID GOOD! I\'LL BLOW THE FURNACE FOR A WEEK, CELEBRATING!',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'THE HAMMER\'S STOPPED! I CAN\'T HEAR IT! I COULDN\'T HEAR IT BEFORE EITHER! I CAN FEEL IT\'S STOPPED!',
        ],
      },
      {
        when: { questDone: Q_PERCH },
        lines: [
          'PERCH! I HAD THREE BOWLS! NAN SAYS IT WAS FOUR! NAN CAN\'T COUNT, SHE PICKS SLAG!',
        ],
      },
      {
        lines: [
          'WHAT? SPEAK UP! FORTY YEARS AT THE BELLOWS! THE HAMMER TOOK MY EARS, THE FURNACE TOOK MY EYEBROWS!',
          'NUMBER THREE\'S THE HOTTEST IN TOWN! THE PRINCE SAYS SO! THE PRINCE CAME UP HERE AS A BOY, YOU KNOW!',
          'STOOD RIGHT THERE! WATCHED THE TAP! CRIED! NOBODY BELIEVES ME! HE CRIED AT THE IRON!',
        ],
      },
    ],
    barks: [
      { lines: ['HOT ENOUGH!', 'BLOW, BLOW, BLOW!', 'WHAT?', 'MIND YOUR EYEBROWS!'] },
    ],
  },

  // ── Osric Toll — the bellwright ──────────────────────────────────────
  {
    id: 'forge-osric',
    name: 'Osric Toll',
    title: 'Bellwright of the Pit',
    look: { body: 0xd4b496, accent: 0xb07a38, hat: 'coif', traits: ['glasses', 'apron', 'book'], size: 1, eye: 0xe0ae62 },
    at: { x: 1000, y: 1160 },
    talks: [
      {
        when: REGENT,
        lines: [
          'I\'m melting the name-bells down. Every one. I\'ll cast one bell for the whole town, and it can be loud.',
          'Wim\'s going to sing at the pour. Out loud, in daylight. I may cry into the bronze. It\'s good for the tone.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The Prince came to the pit. He asked me to ring the old song bell. Just once. He knew the tune.',
        ],
      },
      {
        when: { questDone: Q_SONG },
        lines: [
          'The bell\'s cooling in the sand. When they ring it for the Regent, it will ring the hammer-song.',
          'Every note. In bronze, where nobody can bury it. He will have to bury the bell. It weighs four ton.',
        ],
      },
      {
        when: { quest: Q_SONG },
        lines: [
          'Wim at the first furnace knows the song. All of it. He hums it when he thinks the hammer hides him.',
        ],
      },
      {
        lines: [
          'I cast the Regent\'s bells. Name-bells. Each interred household gets one, with the name round the lip.',
          'Rung once, the day they go down. Then hung in the Sepulchre, silent. I have cast three hundred.',
          'I cast the names neatly. It is the only kindness I am allowed. It is not much of one.',
        ],
      },
    ],
    barks: [
      { when: { questDone: Q_SONG }, lines: ['It\'s cooling. It\'s singing.', 'Four ton of song.'] },
      { lines: ['Neat letters. Neat letters.', 'Mind the pit.', 'Bronze forgives nothing.'] },
    ],
  },

  // ── Wim Tapper — the furnace tapper who remembers the songs ──────────
  {
    id: 'forge-wim',
    name: 'Wim Tapper',
    title: 'Tapper at Number One',
    look: { body: 0xb0805e, accent: 0xf06a1a, hat: 'helmet', traits: ['tool', 'scarf'], size: 1.15, eye: 0xffc23a },
    at: { x: 360, y: 548 },
    talks: [
      {
        when: REGENT,
        lines: [
          'I sang the Long Heat on Hammer Row this morning. All nine verses. A child joined in on the fourth.',
          'She didn\'t know the words. She sang them anyway. That\'s how songs are, see. They come back up.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'I hummed it at the tap this morning and nobody looked round. Thirty years I\'ve been looking round.',
        ],
      },
      {
        when: { questDone: Q_SONG },
        lines: [
          'In the bell. The Long Heat, in a bell. Old Osric. Cleverest coward I ever knew. I mean it kindly.',
        ],
      },
      {
        lines: [
          'I tap Number One. Knock out the clay, the iron comes. You stand very still and you don\'t sing.',
          'We used to sing at the tap. The Long Heat. Nine verses, one for each hour of a blow.',
          'Songs are buried now. The hammer keeps the time and we keep our mouths shut. Mostly.',
        ],
      },
    ],
    barks: [
      { lines: ['Hm-hm-hmm. Nothing. Nothing.', 'Stand back for the tap.', 'Here she comes.'] },
    ],
  },

  // ── Linka Shackleby — the chainmaker who forged the collars ──────────
  {
    id: 'forge-linka',
    name: 'Linka Shackleby',
    title: 'Chainmaker, the Bridge Works',
    look: { body: 0xc8a080, accent: 0x6a7078, hat: 'bandana', traits: ['apron', 'tool', 'bandage'], size: 1.05, eye: 0x9aa4ae },
    at: { x: 1720, y: 880 },
    talks: [
      {
        when: REGENT,
        lines: [
          'The mason\'s striking the collars off, one by one, down the hill. I went and held the chisel for him.',
          'Every collar I made, I\'ll know by the weld. I\'m going to stand there till I\'ve seen the last one off.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The Hall\'s stopped ordering collars. No letter, no reason. The orders just stopped.',
        ],
      },
      {
        when: { questDone: Q_COLLARS },
        lines: [
          'The blanks are at the bottom of the Runnel. Slag by now. Rusk can scrap the Runnel if he likes.',
          'There\'ll be a new order. There always is. But this season, nobody goes down the hill in mine.',
        ],
      },
      {
        when: { quest: Q_COLLARS },
        lines: [
          'Four blanks, in the forecourt of the Hall. Iron rings, open, waiting to be closed. Bring them here.',
        ],
      },
      {
        lines: [
          'I make the chains for the bridges. And I make the collars. For the interred. A ring of iron, welded shut.',
          'They don\'t come off. Not without the Regent\'s mason. I made it so. I\'m very good at my trade.',
          'You can tell a Shackleby weld anywhere. I\'ve seen one round a neck, on the road, with a canary.',
        ],
      },
    ],
    barks: [
      { when: { questDone: Q_COLLARS }, lines: ['Not in mine. Not this season.'] },
      { lines: ['Link, weld, link.', 'Don\'t lean on the chains.', 'Every one welded shut.'] },
    ],
  },

  // ── Hollin Grieve — the Hall's steward ───────────────────────────────
  {
    id: 'forge-hollin',
    name: 'Hollin Grieve',
    title: 'Steward of the Anvil Hall',
    look: { body: 0xd0b8a0, accent: 0x1e242c, hat: 'none', traits: ['cane', 'glasses'], size: 1, eye: 0x8a9aac },
    at: { x: 1840, y: 600 },
    talks: [
      {
        when: REGENT,
        lines: [
          'His Highness has asked for a hammer-song to be sung at dinner. I do not know any. I am learning.',
          'It is very hard to sing and pour soup. The Prince says that is the point.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'He has put down the hammer. Literally — it is on the floor of the Hall. Nobody can lift it, so it stays.',
          'He has asked for a set of tongs. Small ones. Old ones. I have sent to Mrs Clinker.',
        ],
      },
      {
        when: { courtReady: 'forge' },
        lines: [
          'All five. His Highness has watched from the slit windows. He has asked for the quench tank filled.',
          'That means he will fight. It also means he expects to need cooling. Make of that what you like.',
        ],
      },
      {
        lines: [
          'Steward of the Hall. I keep the doors, the books and the Prince\'s temper. Two of those are iron.',
          'His Highness does not receive petitioners. He receives ore. If you wish to be received, beat his smiths.',
          'There are five who keep the court for him. Beat them all, and the Hall\'s doors will open for you.',
        ],
      },
    ],
    barks: [
      { lines: ['The Hall is not receiving.', 'Mind the forecourt plates. They\'re warm.', 'Ore, not petitions.'] },
    ],
  },
];

// ── The crowd ────────────────────────────────────────────────────────

const looks: NpcLook[] = [
  { body: 0xc89a7a, accent: 0x3c4046, hat: 'coif', traits: ['apron'] },
  { body: 0xb88a6a, accent: 0x7a4a34, hat: 'cap', traits: ['tool'] },
  { body: 0xd8b494, accent: 0xb07a3a, hat: 'bandana', traits: ['satchel'], size: 0.76 },
  { body: 0xa87a5a, accent: 0x6a3428, hat: 'helmet', traits: ['beard', 'tool'], size: 1.2 },
  { body: 0xd0a888, accent: 0x9a4a22, hat: 'beanie', traits: ['pack'] },
  { body: 0xc09070, accent: 0x5a3a24, hat: 'coif', traits: ['apron', 'tool'], size: 1.1 },
  { body: 0xe0c0a0, accent: 0x6a7078, hat: 'hood', traits: ['scarf'] },
  { body: 0xb08060, accent: 0xf06a1a, hat: 'miner', traits: ['lantern'] },
];

const barks: Talk[] = [
  {
    when: REGENT,
    lines: [
      'They\'re coming up the hill! The interred!',
      'Sing it! Sing the Long Heat!',
      'Unbrick the Pecks\' door!',
      'No Hook, no Tithe, no hammer!',
    ],
  },
  {
    when: PRINCE,
    lines: [
      'The Great Hammer\'s stopped!',
      'Prudence chained the Hook!',
      'The Prince yielded to a stranger!',
      'I can hear the birds. Are those birds?',
    ],
  },
  {
    when: { courtReady: 'forge' },
    lines: [
      'All five of the Prince\'s smiths, beaten.',
      'The Hall\'s filling the quench tank.',
    ],
  },
  {
    lines: [
      'Strike on the beat.',
      'Hung light. Poor Pecks.',
      'Cart coming — off the rails!',
      'Don\'t hum. Don\'t.',
      'Ninety stone and the furnace ate a charge.',
      'Another bell in the pit.',
      'Hot iron, cold Hook.',
      'Mind the Runnel.',
    ],
  },
];

export const FORGE_CROWD: NonNullable<AreaDef['crowd']> = {
  count: 14,
  looks,
  paths: [
    // Along Hammer Row, end to end, over the first chain bridge.
    [{ x: 100, y: 800 }, { x: 1100, y: 800 }, { x: 1620, y: 800 }, { x: 2300, y: 800 }, { x: 1620, y: 800 }, { x: 1100, y: 800 }],
    [{ x: 2300, y: 820 }, { x: 1620, y: 820 }, { x: 600, y: 820 }, { x: 120, y: 820 }],
    // Up and down the Ore Road.
    [{ x: 1200, y: 1560 }, { x: 1200, y: 1000 }, { x: 1200, y: 640 }, { x: 1200, y: 1000 }],
    // Out to the casting floor and back.
    [{ x: 555, y: 800 }, { x: 555, y: 560 }, { x: 960, y: 560 }, { x: 1070, y: 620 }, { x: 1070, y: 800 }],
    // Down to the pond and the pit.
    [{ x: 640, y: 820 }, { x: 640, y: 1290 }, { x: 640, y: 1400 }, { x: 1200, y: 1400 }, { x: 640, y: 1400 }],
    // Over the second bridge into the scrapyard.
    [{ x: 1300, y: 1120 }, { x: 1620, y: 1120 }, { x: 1900, y: 1180 }, { x: 1880, y: 1400 }, { x: 1620, y: 1120 }],
    // Up to the Hall's forecourt.
    [{ x: 1840, y: 820 }, { x: 1840, y: 600 }, { x: 2160, y: 600 }, { x: 1840, y: 600 }],
  ],
  barks,
};
