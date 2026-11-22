import type { AreaDef, NpcDef, NpcLook, Talk } from '../../../../IslesTypes';

/**
 * The people of the Web Court.
 *
 * The silk town in the canopy: everyone here spins, winds, dyes, dries or carries silk, and every
 * household owes twelve skeins of it to the Moult-Tithe each new moon. The farmed spiders give the
 * silk; the people give the spiders their days. And over it all is the Spymaster's Web — a map of
 * the isle strung in thread on the plaza, one strand for every informer, a paper tag knotted on for
 * every name reported. Prince Weft listens along those strands. People here talk quietly, look at
 * the threads before they speak, and say "the web hears" the way other towns say "walls have ears".
 */

const PRINCE = { prince: 'weft' } as const;
const MATRIARCH = { monarch: 'nyxa' } as const;

export const Q_KNOTS = 'web-q-thief-knot';
export const Q_MAUD = 'web-q-old-maud';
export const Q_STRAND = 'web-q-cut-strand';
export const Q_BRIDGE = 'web-q-cut-bridge';
export const Q_LOFT = 'web-q-loft';

export const WEB_NPCS: NpcDef[] = [
  // ── Bobbin Twill — the shop ──────────────────────────────────────────
  {
    id: 'web-bobbin',
    name: 'Madam Bobbin Twill',
    title: 'Twill & Daughters, Silk-Mercers',
    look: { body: 0xd8bfa4, accent: 0x5a3a6a, hat: 'veil', traits: ['scarf', 'glasses', 'satchel'], size: 1.1, eye: 0xd8c0f0 },
    at: { x: 1700, y: 808 },
    role: { kind: 'shop', id: 'web-shop' },
    talks: [
      {
        when: MATRIARCH,
        lines: [
          'I am selling silk to people who are going to WEAR it. Not tithe it. Wear it. Fancy that.',
          'The charms are where they always were. I have put the dye-pots out for anyone. Purple for everybody.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'His Highness came down the ladder this morning and bought a bolt of plain grey. Paid for it. In coin.',
          'He said he wanted to make something that was not a net. I nearly dropped the shears.',
        ],
      },
      {
        when: { quest: Q_LOFT },
        lines: [
          'Weft as a boy? Thin. Big eyes. The runt of her clutch, and the quietest. She gave him the listening.',
          'Every other broodling got a court to rule. He got a thread to hold and told to say what he heard.',
          'He held it so long he forgot how to say anything else. Go gently up there. Or don\'t. He\'ll know which.',
        ],
      },
      {
        lines: [
          'Twill and Daughters. Silk by the skein, the bolt, the yard. Spider-dyed. Nobody dyes purple like us.',
          'Twelve skeins a household, every new moon, on the Tithe Reel. Short skeins, short doses. You know the rest.',
          'The charms on the top rack — you can wear three. Odd little things. Spiders\' things, mostly. They bite.',
          'Mind what you say in my shop. The web hears. Not because I\'d tell. Because it does.',
        ],
      },
    ],
    barks: [
      { when: PRINCE, lines: ['Plain grey! For the Prince!', 'No tithe this moon! Buy for yourself!'] },
      {
        lines: [
          'Silk by the yard!', 'Spider-dyed, colour-fast!', 'Twelve skeins, madam? You\'ll want thirteen.',
          'Charms on the top rack.', 'Hush — he\'s listening.',
        ],
      },
    ],
  },

  // ── Old Flax — the spinner with grey fingers ─────────────────────────
  {
    id: 'web-flax',
    name: 'Old Flax',
    title: 'Spinner, Third Frame',
    look: { body: 0xb8b4a8, accent: 0x8a7656, hat: 'beanie', traits: ['beard', 'apron', 'bandage'], size: 0.95 },
    at: { x: 250, y: 578 },
    talks: [
      {
        when: MATRIARCH,
        lines: [
          'They gave me the cure. A real one. Not a dose — a cure. My fingers are pink again. Look at them. Pink.',
          'I spun a skein this morning for nobody. Just to feel it run. Fastest I\'ve spun in thirty years.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The Tithe Reel\'s stood still all week. Nobody\'s weighing. I keep spinning out of habit.',
          'My hands are still grey. But the Prince sent down a dose with no name on it. Somebody told him, then.',
        ],
      },
      {
        when: { questDone: Q_KNOTS },
        lines: [
          'Back on the roll. Back in the queue. Back on the Draught. Dorcas read every knot out loud at the Reel.',
          'Hank\'s gone off the mill. Gone to tie knots for the brood pens. The spiders can count, at least.',
        ],
      },
      {
        when: { quest: Q_KNOTS },
        lines: [
          'Four tally-cords, one on each frame-post along the mill. My week\'s on all of them. Bring them down.',
          'Then take them to Dorcas at the racks. She reads knots like you read a sign. She\'ll see the lie in them.',
        ],
      },
      {
        lines: [
          'Look at my hands. Grey to the second knuckle. That\'s the Mark, waking up. That\'s no Draught last moon.',
          'Passed over. Because the tally says I spun eight skeins, not twelve. I spun twelve. I always spin twelve.',
          'The tally\'s kept in knots, on cords on the frame-posts. Hank the Tallyman ties them. Hank ties them wrong.',
        ],
      },
    ],
    barks: [
      { when: { questDone: Q_KNOTS }, lines: ['Twelve. Twelve! Always twelve.', 'Back on the roll.'] },
      { lines: ['Can\'t feel the thread.', 'Twelve skeins. I spun twelve.', 'Cold. Always cold now.'] },
    ],
  },

  // ── Lisle — the spider-feeder ────────────────────────────────────────
  {
    id: 'web-lisle',
    name: 'Lisle',
    title: 'Feeds the Pens',
    look: { body: 0xe2c8ae, accent: 0xd8402e, hat: 'bandana', traits: ['satchel'], size: 0.74, eye: 0x9ad04a },
    at: { x: 2090, y: 582 },
    talks: [
      {
        when: MATRIARCH,
        lines: [
          'Nobody\'s milking the spiders today. I opened all the gates. Most of them stayed. They LIKE it here.',
          'Maud is spinning a web across the whole pen. Just for herself. It\'s got a hole shaped like a door.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The Pen-Warden says no more spent spiders go to the brood. Prince\'s orders. He was cross about it.',
          'Maud sits in the sun now. She\'s too old to spin much. She doesn\'t have to.',
        ],
      },
      {
        when: { questDone: Q_MAUD },
        lines: [
          'Maud spun! Gold! A whole strand of it, after the shiners. The Pen-Warden had to write her down as working.',
          'Working spiders don\'t go to the brood pens. That\'s the rule. Maud is WORKING.',
        ],
      },
      {
        when: { quest: Q_MAUD },
        lines: [
          'Spinner-shiners, from the silk pool. Two. They\'re the little ones that flash. Maud loves them best.',
          'Bring them straight here. The Pen-Warden comes round at dusk with his goad.',
        ],
      },
      {
        lines: [
          'That\'s Maud. The big one in the end pen. She\'s the oldest spider in the court. Older than my gran.',
          'She\'s stopped spinning. The Pen-Warden says spent spiders go to the brood pens. As food. For the babies.',
          'I think she\'s just hungry. Nobody feeds the old ones properly. They give it all to the young ones.',
        ],
      },
    ],
    barks: [
      { when: { questDone: Q_MAUD }, lines: ['Maud\'s WORKING!', 'Gold thread! Gold!'] },
      { lines: ['Here, spider-spider.', 'Don\'t touch the hourglass ones.', 'Maud, eat up.'] },
    ],
  },

  // ── Tatting Moss — clerk of the Spymaster's Web ─────────────────────
  {
    id: 'web-tatting',
    name: 'Tatting Moss',
    title: 'Knotter to the Spymaster\'s Web',
    look: { body: 0xcab49c, accent: 0xe2c25c, hat: 'hood', traits: ['glasses', 'book'], size: 0.95, eye: 0xe2c25c },
    at: { x: 1010, y: 745 },
    talks: [
      {
        when: MATRIARCH,
        lines: [
          'I\'m untying it. All of it. Every tag, every name. It\'ll take me a year. I\'m going to enjoy every knot.',
          'The town wants to burn it. I said no. Untie it. Burning is quick. People should watch it come apart.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'His Highness came down to the Web and stood in front of it a long time. Then he cut the first strand.',
          'He didn\'t say anything. He gave me the knife and went back up. I think he wanted me to do the rest.',
        ],
      },
      {
        when: { questDone: Q_STRAND },
        lines: [
          'Netty\'s tag is gone. I took it off myself, with the strand cut there was nothing to hold it.',
          'Three listeners are deaf on our street now. The web sings a little quieter. I like it quieter.',
        ],
      },
      {
        when: { quest: Q_STRAND },
        lines: [
          'Read the tag on the Web first — the low strand, west side. Then follow its three listeners.',
          'Each listener has an ear-trumpet set on a line. Cut the line at the trumpet. Don\'t touch the Web itself.',
        ],
      },
      {
        lines: [
          'I tie the tags. A report comes in, I knot a slip on the informer\'s strand. Name, street, what was said.',
          'His Highness reads the Web every evening. Tags on a household\'s name, and the Draught House is told.',
          'Today I tied my own sister\'s name. Netty. She said the Draught tasted thin. Somebody listening wrote it down.',
        ],
      },
    ],
    barks: [
      { when: { questDone: Q_STRAND }, lines: ['Quieter. Much quieter.', 'One knot less.'] },
      { lines: ['Name, street, what was said.', 'Don\'t lean on the rail.', 'The Web is reading you back.'] },
    ],
  },

  // ── Hemp Lacewing — the bridgewright ─────────────────────────────────
  {
    id: 'web-lacewing',
    name: 'Hemp Lacewing',
    title: 'Bridgewright',
    look: { body: 0xc69e7e, accent: 0xa48b62, hat: 'cap', traits: ['tool', 'pack', 'beard'], size: 1.2 },
    at: { x: 880, y: 1205 },
    talks: [
      {
        when: MATRIARCH,
        lines: [
          'I\'m building bridges to every pod in the court. EVERY one. Even the ones nobody\'s spoken to in years.',
          'A town in the trees should be all bridges. That\'s the whole point of a town in the trees.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'No more cutting. That\'s the word from the Loft. Nobody\'s bridge comes down for being grey.',
          'I dropped my axe through the big tear by the racks. Listened for the splash. Never heard it.',
        ],
      },
      {
        when: { questDone: Q_BRIDGE },
        lines: [
          'Teasel\'s bridge is up. New rope, new planks. She walked it with a stick, but she walked it.',
          'Snare\'s wires are gone and he\'s gone with them. I\'ll take that trade every moon.',
        ],
      },
      {
        when: { quest: Q_BRIDGE },
        lines: [
          'Talk to Teasel first — she\'ll want to know who\'s coming. Then my rope. Three coils, round the racks.',
          'And mind your feet near the Strand. Snare wires everything. You won\'t see it until you\'re on it.',
        ],
      },
      {
        lines: [
          'Bridgewright. Forty years. I\'ve strung every bridge in this court, and I\'ve cut nine of them.',
          'When a household\'s passed over, the bridge to it comes down. Orders. So the grey can\'t reach the queue.',
          'Widow Teasel, out on the west pod. I cut hers a month ago. I can\'t sleep. I want to string it back.',
        ],
      },
    ],
    barks: [
      { when: { questDone: Q_BRIDGE }, lines: ['Good rope. Good rope.', 'Every pod a bridge.'] },
      { lines: ['Mind the gap.', 'Nine bridges. Nine.', 'Rope don\'t lie.'] },
    ],
  },

  // ── Widow Teasel — the passed-over ───────────────────────────────────
  {
    id: 'web-teasel',
    name: 'Widow Teasel',
    title: 'The West Pod',
    look: { body: 0xa8aaa4, accent: 0x6e7566, hat: 'hood', traits: ['cane', 'scarf'], size: 0.88, eye: 0xc8ccc4 },
    at: { x: 300, y: 1458 },
    talks: [
      {
        when: MATRIARCH,
        lines: [
          'I\'m not grey any more. Pink as a shrimp. Tansy Rue gave me the cure with her own hands.',
          'I walked to the plaza and back twice, for the fun of it. Over the new bridge. Every plank.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'A dose came across this morning, with no name on it. In a basket on a line. I don\'t know who sent it.',
          'Somebody in that Loft has decided to stop listening and start looking. About time.',
        ],
      },
      {
        when: { questDone: Q_BRIDGE },
        lines: [
          'A bridge. My own bridge. I stood on the end of it and cried, and Lacewing cried, and we were a sight.',
          'I can get to the queue now. They may still pass me over. But I can STAND in it.',
        ],
      },
      {
        when: { quest: Q_BRIDGE },
        lines: [
          'Hemp\'s going to string it back? The fool. They\'ll cut his next. Tell him… tell him thank you.',
          'Watch for Snare. He wired the end of my bridge himself the day they cut it. He likes his work.',
        ],
      },
      {
        lines: [
          'Grey to the elbow. It\'s quite pretty, really. Like ash on a fire. It doesn\'t hurt. It just goes cold.',
          'They cut my bridge when the Web put my name up. My husband said a thing at the Reel. He\'s in the Grave Court.',
          'Too far round on the Sheet, for me. It tears where it\'s old. So I sit on my step and watch the queue.',
        ],
      },
    ],
    barks: [
      { when: { questDone: Q_BRIDGE }, lines: ['My own bridge.', 'Every plank.'] },
      { lines: ['Cold today.', 'Grey to the elbow.', 'I can see the queue from here.'] },
    ],
  },

  // ── Dorcas Reel — the rack-mistress ──────────────────────────────────
  {
    id: 'web-dorcas',
    name: 'Dorcas Reel',
    title: 'Mistress of the Racks',
    look: { body: 0xd4b096, accent: 0xc6bce2, hat: 'straw', traits: ['apron', 'tool'], size: 1.05 },
    at: { x: 460, y: 1142 },
    talks: [
      {
        when: MATRIARCH,
        lines: [
          'Sheets on the racks and nobody owed a thread. I\'ve dyed one green. Bright green. To spite her memory.',
          'I read knots for forty years. Last night I tied one just for me. A bow. Nothing in it but a bow.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'No tithe this moon. The racks are full and nobody\'s weighing. It looks like washing day. Just washing.',
          'Hank\'s been to see me. Wants to learn to read knots honest. I said start with your own name.',
        ],
      },
      {
        when: { questDone: Q_KNOTS },
        lines: [
          'A thief\'s knot. Tied left over right, then back through itself. Looks like a reef knot. Isn\'t.',
          'Forty skeins Hank kept back this year, off grey hands. Sold to the Loft\'s listeners for extra doses.',
        ],
      },
      {
        when: { quest: Q_KNOTS },
        lines: [
          'Flax\'s cords? Bring them here. I read every knot on this court\'s racks. I\'ll read Hank\'s.',
        ],
      },
      {
        lines: [
          'Sheets off the mills, onto the racks, dry by morning, onto the Reel. Every skein knotted with its maker.',
          'The knots are the books. Who spun, how much, whose hands. I read them. I\'ve never once read them wrong.',
          'There\'s a kind of knot that lies. A thief\'s knot. You only see it if you know to look.',
        ],
      },
    ],
    barks: [
      { lines: ['Dry by morning!', 'Turn that sheet.', 'Knotted and counted.', 'Mind the dye, it stains.'] },
    ],
  },

  // ── Seneschal Skein — the Prince's steward ──────────────────────────
  {
    id: 'web-skein',
    name: 'Seneschal Skein',
    title: 'Steward of the Loft',
    look: { body: 0xd2c4b2, accent: 0x8676a6, hat: 'tophat', traits: ['glasses', 'cane', 'book'], size: 1.05, eye: 0xddd4f0 },
    at: { x: 1335, y: 378 },
    talks: [
      {
        when: MATRIARCH,
        lines: [
          'The Matriarch is gone and the Loft is very quiet. His Highness has taken his ear off the threads.',
          'He sleeps now. Did you know he never slept? He said sleep was where you missed things.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'His Highness is in the gallery, cutting threads. One at a time. He asked me to count them as they go.',
          'I am up to four hundred and twelve. He says he can hear himself think. He says it is very loud.',
        ],
      },
      {
        when: { questDone: Q_LOFT },
        lines: ['You have been up. He is cutting threads. Let him.'],
      },
      {
        when: { courtReady: 'web' },
        lines: [
          'All five of his champions down. His Highness knew before the last one fell. He knew from the threads.',
          'He is expecting you. He has been expecting you since you came over the bridge from the Fang Court.',
        ],
      },
      {
        lines: [
          'The Loft. His Highness Prince Weft, the Spymaster, governs the Web Court from the gallery up there.',
          'He sees no one who has not beaten his five. That is not cruelty. He simply does not need to.',
          'He already knows what you would say. He has heard it along a thread somewhere. Usually twice.',
        ],
      },
    ],
    barks: [
      { lines: ['The Loft is listening.', 'His Highness is not receiving.', 'Wipe your feet.'] },
    ],
  },

  // ── Eavesdrop Noll — an informer ─────────────────────────────────────
  {
    id: 'web-noll',
    name: 'Eavesdrop Noll',
    title: 'Listener (Paid in Doses)',
    look: { body: 0x9a9286, accent: 0x2c2238, hat: 'cowl', traits: ['mask', 'satchel'], size: 0.92, eye: 0xd8402e },
    at: { x: 1300, y: 905 },
    wander: 70,
    talks: [
      {
        when: MATRIARCH,
        lines: [
          'No more doses for listening. So I\'ve stopped listening. Funny — the town\'s got louder since.',
          'People shout now. In the street. About nothing. I didn\'t know how much nothing there was to shout about.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The Loft\'s stopped paying for tags. Stopped! I\'ve a satchel of names and nobody to sell them to.',
          'I tried giving one away. To the man whose name it was. He hit me. Fair enough.',
        ],
      },
      {
        when: { questDone: Q_STRAND },
        lines: ['Somebody cut three trumpets off the Web. Three good listeners, deaf. I didn\'t see who. Honest.'],
      },
      {
        lines: [
          'Nice day. Nice day for talking. Lots of people talk on a nice day. Go on. Talk. I\'m not anybody.',
          'What did you think of the Draught last moon? Thin, would you say? People say thin. I\'m just asking.',
          'Extra dose for a good tag. That\'s all. A man\'s got to keep his fingers pink.',
        ],
      },
    ],
    barks: [
      { when: PRINCE, lines: ['Names for sale, cheap!', 'Nobody\'s buying.'] },
      { lines: ['Lovely weather.', 'Say that again?', 'I\'m not listening.', 'Thin, was it?'] },
    ],
  },
];

// ── The crowd ────────────────────────────────────────────────────────

const looks: NpcLook[] = [
  { body: 0xd2b49a, accent: 0x5a3a6a, hat: 'hood', traits: ['satchel'] },
  { body: 0xc4a488, accent: 0xa48b62, hat: 'cap', traits: ['tool'] },
  { body: 0xe0c6aa, accent: 0xc6bce2, hat: 'veil', traits: ['scarf'] },
  { body: 0xb89a80, accent: 0x8676a6, hat: 'beanie', traits: ['apron'], size: 0.76 },
  { body: 0xa8a49a, accent: 0x6e7566, hat: 'hood', traits: ['cane'], eye: 0xc8ccc4 },
  { body: 0xd8bc9e, accent: 0xd8402e, hat: 'bandana', traits: ['pack'] },
  { body: 0x9a9286, accent: 0x2c2238, hat: 'cowl', traits: ['mask'] },
  { body: 0xcaa88a, accent: 0x4f6d3a, hat: 'snake', traits: ['satchel'], size: 1.1 },
];

const barks: Talk[] = [
  {
    when: MATRIARCH,
    lines: [
      'No more Reel!', 'They\'re untying the Web!', 'I wore my own silk today.',
      'The grey are coming home over the bridges!', 'Say what you like — nobody\'s listening!',
    ],
  },
  {
    when: PRINCE,
    lines: [
      'The Prince cut a thread.', 'No weighing this moon!', 'Is anyone on the trumpets?',
      'He came DOWN the ladder.',
    ],
  },
  {
    when: { courtReady: 'web' },
    lines: ['All five of his, beaten.', 'The stranger\'s going up to the Loft.'],
  },
  {
    lines: [
      'Twelve skeins.', 'Hush — the web hears.', 'Mind the tear.', 'Who\'s on the trumpets today?',
      'Short skeins, short doses.', 'She\'s gone grey to the wrist.', 'Don\'t touch the threads.',
      'Is your name up?',
    ],
  },
];

export const WEB_CROWD: NonNullable<AreaDef['crowd']> = {
  count: 14,
  looks,
  paths: [
    // Along the Long Strand from the Fang bridge to the plaza and back.
    [{ x: 2250, y: 800 }, { x: 1600, y: 800 }, { x: 1380, y: 810 }, { x: 1600, y: 800 }],
    // Round the plaza deck.
    [{ x: 1080, y: 780 }, { x: 1200, y: 720 }, { x: 1320, y: 780 }, { x: 1200, y: 900 }],
    // The west bridge to the mills and the racks.
    [{ x: 1040, y: 820 }, { x: 560, y: 820 }, { x: 560, y: 600 }, { x: 560, y: 820 }, { x: 560, y: 1080 }, { x: 560, y: 820 }],
    // Up to the Loft and back.
    [{ x: 1200, y: 690 }, { x: 1200, y: 420 }, { x: 1200, y: 690 }],
    // Along the pens.
    [{ x: 1260, y: 570 }, { x: 2240, y: 570 }, { x: 1260, y: 570 }],
    // Down the south bridge to the theatre and the pool.
    [{ x: 1200, y: 940 }, { x: 1200, y: 1300 }, { x: 1480, y: 1080 }, { x: 1200, y: 1080 }],
  ],
  barks,
};
