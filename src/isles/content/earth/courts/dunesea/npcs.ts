import type { AreaDef, NpcDef, NpcLook, Talk } from '../../../../IslesTypes';

/**
 * The people of the Dunesea Court.
 *
 * The Dunesea pays the Stone Tithe out of the city under its feet: every household works a pit
 * into Old Hamra and cuts its season's weight from the buried streets, and the sand-ships carry it
 * to the Scales at Quarrymouth. Short households are interred in the Sepulchre like anywhere on the
 * Hold — but Prince Sirocco adds his own touch. He moves the dunes. A pit the dune covers before
 * its stone is out is "forfeit to the wind"; a house that complains wakes up with a dune on its
 * roof. Those households live in the Sanded Camp now. Nobody here says the Prince did a thing:
 * they say "the wind did it", and everybody knows what they mean.
 */

const PRINCE = { prince: 'sirocco' } as const;
const REGENT = { monarch: 'gravane' } as const;

const Q_PIT = 'dunesea-q-before-the-dune';
const Q_SOUP = 'dunesea-q-skipper-soup';
const Q_LIBRARY = 'dunesea-q-drowned-library';
const Q_SAIL = 'dunesea-q-last-sail';
const Q_WIND = 'dunesea-q-where-the-wind-goes';

export const DUNESEA_NPCS: NpcDef[] = [
  // ── Halima Saddlebag — the shop ──────────────────────────────────────
  {
    id: 'dunesea-halima',
    name: 'Halima Saddlebag',
    title: 'Stalls of the Caravanserai',
    look: { body: 0xb8865e, accent: 0xb8382c, hat: 'headwrap', traits: ['satchel', 'scarf'], size: 1.05, eye: 0xf2d496 },
    at: { x: 1820, y: 650 },
    role: { kind: 'shop', id: 'dunesea-shop' },
    talks: [
      {
        when: REGENT,
        lines: [
          'The Regent\'s under the mountain he dug. I\'ve sold every shovel I had. People are digging UP, now.',
          'Out of the camp, out of the dunes, back into their own front rooms. Charms are where they always are.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The wind\'s dropped. First still day in eleven years. The camels don\'t know what to do with themselves.',
          'I\'ve had diggers in here buying sweets. SWEETS. Nobody buys sweets with a dune coming.',
        ],
      },
      {
        when: { questDone: Q_SAIL },
        lines: [
          'Ezra sailed her! Down the Strand and back, sail full, and the Anchor-Master shaking his fist at the stern.',
          'I hid that tiller under the date sacks for a month. Worth every itch.',
        ],
      },
      {
        lines: [
          'Saddlebags, sandals, salt, shade-cloth. Whatever a caravan forgets, Halima remembers.',
          'You\'re new on the dunes. Rule one: the wind does what the Prince wants. Rule two: never say rule one.',
          'Charms on the back rail — you can wear three. Every one of them was made by somebody the sand took.',
        ],
      },
    ],
    barks: [
      { when: PRINCE, lines: ['Sweets! Sweets for a still day!', 'Shade-cloth half price — no sun-storm coming!'] },
      { lines: ['Salt and shade-cloth!', 'Charms, friend — the back rail.', 'Water\'s rationed. Dates aren\'t.', 'Mind the camel. He bites.'] },
    ],
  },

  // ── Nadia Hazim — a household racing the dune ────────────────────────
  {
    id: 'dunesea-nadia',
    name: 'Nadia Hazim',
    title: 'Pit Nine, Old Hamra',
    look: { body: 0xc8966a, accent: 0x34346e, hat: 'headwrap', traits: ['tool', 'bandage'], size: 0.95 },
    at: { x: 390, y: 985 },
    talks: [
      {
        when: REGENT,
        lines: [
          'I went down the pit this morning and didn\'t cut anything. Just looked. There\'s a painted wall down there.',
          'Birds on it. Blue ones. Somebody painted birds in Old Hamra and the sand kept them for a thousand years.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The dune by our pit has stopped. It just stopped, halfway down the shoring. I sat and watched it not move.',
        ],
      },
      {
        when: { questDone: Q_PIT },
        lines: [
          'The stone\'s on Ezra\'s deck and the pit\'s still open. Petra went home empty-handed. EMPTY.',
          'My brother can stop sleeping in his boots. Thank you. That\'s too small a word. It\'s the one I have.',
        ],
      },
      {
        when: { quest: Q_PIT },
        lines: [
          'The blocks are cut — they\'re just lying round the lip where I couldn\'t haul them. Four of them.',
          'Bring them down to the pile by the shaduf, and then to Ezra on the Strand. Before the dune does.',
        ],
      },
      {
        lines: [
          'Pit nine. Hazim. Three generations cutting stone out of a street called the Street of Lamps.',
          'We\'re one block short and the dune\'s coming down on us. You can see it lean. It leans more every night.',
          'If it covers the pit, the stone\'s forfeit — "the wind decided". Then my brother goes to the Sepulchre.',
        ],
      },
    ],
    barks: [
      { when: { questDone: Q_PIT }, lines: ['Pit nine stands!', 'Stone\'s on the deck.'] },
      { lines: ['Lean, then. Lean all you like.', 'One block short.', 'Mind the shoring!', 'Street of Lamps, pit nine.'] },
    ],
  },

  // ── Ezra Dunewright — the old shipwright ─────────────────────────────
  {
    id: 'dunesea-ezra',
    name: 'Ezra Dunewright',
    title: 'Shipwright of the Strand',
    look: { body: 0xa87a54, accent: 0x9a7048, hat: 'straw', traits: ['beard', 'tool', 'apron'], size: 1.1, eye: 0xd8e0e0 },
    at: { x: 1380, y: 1030 },
    talks: [
      {
        when: REGENT,
        lines: [
          'I\'m building a ship that doesn\'t carry stone. First one in forty years. Haven\'t decided what she carries.',
          'People, maybe. Out to the far dunes, for a look. Nobody\'s been for a look in my lifetime.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'No wind. My ships sit on the sand like ducks on a pond. I could weep. I won\'t. I\'ll caulk something.',
        ],
      },
      {
        when: { questDone: Q_SAIL },
        lines: [
          'The Sabra sailed. Old girl. Down the Strand with her sail full and a stranger at the broadside.',
          'They\'ll chain her again. Let them. She\'s been out. You can\'t chain that back in.',
        ],
      },
      {
        when: { quest: Q_SAIL },
        lines: [
          'Halima has the tiller. Then the mooring post on the Strand — that\'s where he chains her.',
        ],
      },
      {
        lines: [
          'Sand-ships. Hull on runners, lateen sail, she goes like a hawk on a good wind. I\'ve built sixty.',
          'Every one of them carries Tithe stone to the Scales now. Sixty ships and not one of them goes anywhere else.',
          'The wind belongs to the Prince, they say. I say the wind never signed anything.',
        ],
      },
    ],
    barks: [
      { lines: ['Pitch, plank and peg.', 'She\'ll sail. She always sails.', 'Wind\'s backing east.', 'Mind the runners.'] },
    ],
  },

  // ── Brother Sabil — keeper of the Drowned Library ────────────────────
  {
    id: 'dunesea-sabil',
    name: 'Brother Sabil',
    title: 'Keeper of the Drowned Library',
    look: { body: 0xd0a07a, accent: 0x1e6a68, hat: 'hood', traits: ['book', 'glasses', 'lantern'], size: 0.95, eye: 0x84e0d4 },
    at: { x: 330, y: 530 },
    talks: [
      {
        when: REGENT,
        lines: [
          'The Regent buried books. Here\'s a thing about books: they keep. Under sand, they keep very well.',
          'I have read eleven this week that nobody had read in forty years. I am hoarse from reading them aloud.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The Library door is open and the wind isn\'t filling it. I am going to sweep a whole room. A WHOLE ROOM.',
        ],
      },
      {
        when: { questDone: Q_LIBRARY },
        lines: [
          'Four books, out of the sand, dried, read and hidden somewhere Hollin will never think to look.',
          'In the camp. Under the children\'s pillows. Sefa reads them the stories. They are mostly about camels.',
        ],
      },
      {
        when: { quest: Q_LIBRARY },
        lines: [
          'The books the sand spat out — the wind turns them up round the old city. Look for a corner of binding.',
        ],
      },
      {
        lines: [
          'That dome is the Library of Old Hamra. Nine rooms. The sand had seven before anybody now was born.',
          'I kept the last two. Then the Regent sent a man to fill the door. Books are "a weight the Hold can\'t carry".',
          'I am the keeper of a library I may not enter. It is a very peaceful job. I hate it.',
        ],
      },
    ],
    barks: [
      { lines: ['Room eight, the poets.', 'Sand keeps everything. Everything.', 'Don\'t tread on the cornice.', 'Hush.'] },
    ],
  },

  // ── Yusuf — a boy fishing the sand sea ───────────────────────────────
  {
    id: 'dunesea-yusuf',
    name: 'Yusuf',
    title: 'Of the Sanded Camp',
    look: { body: 0xb4825a, accent: 0xe8a628, hat: 'headwrap', traits: ['rod'], size: 0.72 },
    at: { x: 520, y: 1100 },
    talks: [
      {
        when: REGENT,
        lines: [
          'My dad\'s coming home from the Sepulchre! He sent a message. It said "tell Yusuf to wash". Typical.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'There\'s no wind! The sand sea\'s gone flat and you can see the skippers jumping all the way across!',
        ],
      },
      {
        when: { questDone: Q_SOUP },
        lines: [
          'Gran made the soup and everybody in the camp had some, and the Glass-Timer\'s hourglass is in our fire.',
          'It went POP. It was brilliant.',
        ],
      },
      {
        when: { quest: Q_SOUP },
        lines: [
          'You need a delver rod — the drill-lure bites into the sand. They sell them at the Quarrymouth tackle.',
          'Three skippers. They jump when you\'re close. Gran\'s at the fire in the camp.',
        ],
      },
      {
        lines: [
          'I fish the sand. You can, you know — the sand sea flows like water, and things live in it.',
          'Sandskippers. Gran makes soup with them. Only I haven\'t caught one in a week, and the camp\'s hungry.',
          'Our house is under that dune by the camp. The wind put it there. That\'s what you say. "The wind."',
        ],
      },
    ],
    barks: [
      { lines: ['Come on, skipper.', 'Bite, bite, bite.', 'I nearly had one!', 'Gran says patience. Gran says lots.'] },
    ],
  },

  // ── Grandmother Sefa — the camp's storyteller ────────────────────────
  {
    id: 'dunesea-sefa',
    name: 'Grandmother Sefa',
    title: 'Storyteller of the Sanded Camp',
    look: { body: 0xc8a080, accent: 0x34346e, hat: 'veil', traits: ['cane', 'scarf'], size: 0.85, eye: 0xf0e2c4 },
    at: { x: 390, y: 1400 },
    talks: [
      {
        when: REGENT,
        lines: [
          'They are singing the old songs in Quarrymouth. My songs. I taught them to children and the children grew.',
          'Forty years buried and they came up word-perfect. Sand keeps things. So do grandmothers.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The boy put the wind down. I knew he would, one day. He was never the wind. He was a boy with a kite.',
        ],
      },
      {
        when: { questDone: Q_WIND },
        lines: [
          'You went to the kite dune. Then you went to him. And he sat down on his own stair and let the wind go.',
        ],
      },
      {
        when: { questDone: Q_SOUP },
        lines: [
          'Skipper soup for the whole camp, and a Glass-Timer\'s hourglass to boil it on. Best fuel I ever burned.',
        ],
      },
      {
        lines: [
          'Sit. The fire\'s small but the stories are big. I know four hundred. The Regent has buried three hundred.',
          'Songs, too. "A weight the Hold can\'t carry." So I carry them. They weigh nothing. Never tell him that.',
          'This camp is every house the wind took. Mine is under the third dune. I hear it sometimes, settling.',
        ],
      },
    ],
    barks: [
      { lines: ['Once, when the sand was young…', 'Stir the pot, somebody.', 'That one\'s a camel story.', 'Hush, I\'m remembering.'] },
    ],
  },

  // ── Qadira — the wind-watcher ────────────────────────────────────────
  {
    id: 'dunesea-qadira',
    name: 'Qadira Vanewright',
    title: 'Wind-Watcher to the Palace',
    look: { body: 0xb88a64, accent: 0x3ab0a8, hat: 'headwrap', traits: ['glasses', 'book', 'scarf'], size: 1, eye: 0x9ae0d8 },
    at: { x: 2200, y: 1450 },
    talks: [
      {
        when: REGENT,
        lines: [
          'I read the wind for the Palace for thirty years. Now I read it for whoever asks. A child asked this morning.',
          'Tomorrow: a light westerly, kite weather. I told her that. She ran off screaming. Good.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The vanes hang straight down. I have never seen them hang. The wind was always somewhere he wanted.',
          'He came up the tower last night and asked me what the weather would be. Just asked. Like anybody.',
        ],
      },
      {
        when: { courtReady: 'dunesea' },
        lines: [
          'All five of his. He\'s pacing the windward gallery — I can see the dust of him from here.',
          'Before you go in, there\'s something you should hear. Come and ask me about the kite.',
        ],
      },
      {
        lines: [
          'Wind-watcher. I tell the Palace where the wind will be tomorrow, and the Palace makes sure it is there.',
          'If a pit is to be covered, I am asked which way the dune will fall. I answer. I try to answer wrong.',
          'His Highness is not the wind, whatever he says. The wind is old. He is thirty and frightened of his father.',
        ],
      },
    ],
    barks: [
      { lines: ['Westerly, freshening.', 'Vanes are restless.', 'Dust by noon.', 'He\'s on the gallery again.'] },
    ],
  },

  // ── Dust-Herald Oren — reads the burials ─────────────────────────────
  {
    id: 'dunesea-oren',
    name: 'Dust-Herald Oren',
    title: 'Crier of the Wind\'s Decisions',
    look: { body: 0xc8a07c, accent: 0xd8843a, hat: 'tophat', traits: ['book', 'scarf'], size: 1.1, eye: 0xffd08a },
    at: { x: 1270, y: 720 },
    talks: [
      {
        when: REGENT,
        lines: [
          'I have nothing to cry. Nobody is being buried. I am practising other words. "Good morning." It is difficult.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The wind has… made no decisions this week. I have checked with the Palace. The Palace says "let it rest".',
          'I don\'t know how to cry "let it rest". I have been standing here not crying it.',
        ],
      },
      {
        lines: [
          'HEAR THE WIND\'S DECISIONS. Pit four, forfeit. Pit twelve, forfeit. The house of Barakat, sanded.',
          'I only read them. The wind decides. I want that very clear. I am a man who reads.',
          'The list is long this season. The wind has been… thorough.',
        ],
      },
    ],
    barks: [
      { when: PRINCE, lines: ['No decisions today!', 'The wind… rests.'] },
      { lines: ['HEAR THE WIND\'S DECISIONS!', 'Pit four, forfeit!', 'The house of Barakat, sanded!', 'The wind decides!'] },
    ],
  },

  // ── Hamid — the camel-man ────────────────────────────────────────────
  {
    id: 'dunesea-hamid',
    name: 'Hamid of the String',
    title: 'Camel-Master',
    look: { body: 0x9a6e4a, accent: 0xe8a628, hat: 'headwrap', traits: ['cane', 'beard', 'pipe'], size: 1.2 },
    at: { x: 1580, y: 650 },
    talks: [
      {
        when: REGENT,
        lines: [
          'Caravans to anywhere! I took a family to the far dunes yesterday for a picnic. A PICNIC. On the dunes.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'Still air. My camels are happy. When camels are happy they make a noise like a drain. Listen. Hear that?',
        ],
      },
      {
        lines: [
          'Seven camels, all named for the Prince\'s bad days. That\'s Tuesday. She spits at stonecutters.',
          'I carry what the ships can\'t — water to the pits, people to the camp. One-way, mostly. The camp.',
          'If a dune moves in the night, the camels know first. They stand up and face it. Then I wake the street.',
        ],
      },
    ],
    barks: [
      { lines: ['Hup, Tuesday, hup.', 'Water for the pits!', 'Don\'t stand behind her.', 'Camels know.'] },
    ],
  },
];

const looks: NpcLook[] = [
  { body: 0xc8966a, accent: 0xb8382c, hat: 'headwrap', traits: ['tool'] },
  { body: 0xb4825a, accent: 0x34346e, hat: 'headwrap', traits: ['satchel'] },
  { body: 0xd0a07a, accent: 0xe8a628, hat: 'veil', traits: ['scarf'] },
  { body: 0xa87a54, accent: 0x9a7048, hat: 'straw', traits: ['pack', 'beard'], size: 1.15 },
  { body: 0xc8a080, accent: 0x3ab0a8, hat: 'headwrap', traits: ['apron'], size: 0.76 },
  { body: 0x9a6e4a, accent: 0xb8382c, hat: 'miner', traits: ['tool'] },
  { body: 0xd8b08a, accent: 0xf0e2c4, hat: 'hood', traits: ['cane'] },
  { body: 0xb88a64, accent: 0xd8843a, hat: 'none', traits: ['pack'], size: 0.72 },
];

const barks: Talk[] = [
  {
    when: REGENT,
    lines: ['We\'re digging our house out!', 'The Sepulchre\'s open!', 'Old Hamra had painted walls!', 'No Tithe this season!'],
  },
  {
    when: PRINCE,
    lines: ['The wind\'s dropped!', 'Nobody\'s been sanded all week.', 'The Prince sat on his stair!', 'Is it always this quiet?'],
  },
  {
    when: { courtReady: 'dunesea' },
    lines: ['All five of the Prince\'s!', 'The stranger\'s going to the Palace.'],
  },
  {
    lines: [
      'The wind did it.', 'Pit four\'s forfeit.', 'Mind the dune — it\'s leaning.', 'Water\'s at noon.',
      'Shovel first, breakfast after.', 'Don\'t look at the Palace.', 'Sanded, they said. Sanded.', 'Who\'s on the list?',
    ],
  },
];

export const DUNESEA_CROWD: NonNullable<AreaDef['crowd']> = {
  count: 14,
  looks,
  paths: [
    // The caravan road, Quarrymouth to the Crossing and back.
    [{ x: 2300, y: 800 }, { x: 1700, y: 770 }, { x: 1250, y: 780 }, { x: 1700, y: 770 }],
    // Down the Potter's Stair to the Crossing.
    [{ x: 1200, y: 200 }, { x: 1190, y: 500 }, { x: 1200, y: 740 }, { x: 1190, y: 500 }],
    // The Crossing to the Palace forecourt.
    [{ x: 1210, y: 820 }, { x: 1220, y: 1050 }, { x: 1200, y: 1260 }, { x: 1220, y: 1050 }],
    // Out to the digs.
    [{ x: 1150, y: 800 }, { x: 980, y: 820 }, { x: 720, y: 880 }, { x: 600, y: 600 }, { x: 720, y: 880 }],
    // Round the camp.
    [{ x: 520, y: 1240 }, { x: 420, y: 1420 }, { x: 600, y: 1450 }, { x: 420, y: 1420 }],
    // To the oasis for the noon ration.
    [{ x: 1400, y: 790 }, { x: 1600, y: 1000 }, { x: 1600, y: 1150 }, { x: 1600, y: 1000 }],
    // Along the Strand.
    [{ x: 560, y: 905 }, { x: 1080, y: 905 }],
  ],
  barks,
};
