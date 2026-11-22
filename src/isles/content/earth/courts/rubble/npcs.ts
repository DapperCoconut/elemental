import type { AreaDef, NpcDef, NpcLook, Talk } from '../../../../IslesTypes';

/**
 * The people of the Rubble Court.
 *
 * The old capital was buried on the Regent's order forty years ago, its name withdrawn, and the
 * people who would not leave it live in it still — in cellars, in the upper rooms of sunken
 * towers, under tarps strung off the colossus's fingers. They are *pickers*: they dig out what
 * was buried and sell it, which is theft of the Tithe, so they owe more stone every season than
 * anyone on the Hold, and the Sepulchre's door is right there at the top of their street. They
 * talk about the city as if it were still standing, and use its old street names on purpose.
 */

const PRINCE = { prince: 'wreck' } as const;
const REGENT = { monarch: 'gravane' } as const;

const Q_NAMES = 'rubble-q-street-names';
const Q_WELL = 'rubble-q-what-the-well-keeps';
const Q_CELLAR = 'rubble-q-kit-in-the-cellar';
const Q_LANTERN = 'rubble-q-tams-lantern';
const Q_CAPITAL = 'rubble-q-the-old-capital';

export const RUBBLE_NPCS: NpcDef[] = [
  // ── Magpie Orra — the shop ───────────────────────────────────────────
  {
    id: 'rubble-orra',
    name: 'Magpie Orra',
    title: 'Salvage, No Questions',
    look: { body: 0xc8a888, accent: 0x8a3a2e, hat: 'headwrap', traits: ['satchel', 'glasses', 'pack'], size: 0.95 },
    at: { x: 480, y: 1545 },
    role: { kind: 'shop', id: 'rubble-shop' },
    talks: [
      {
        when: REGENT,
        lines: [
          'They opened the Sepulchre and let the interred out. Half came straight here to buy their things back.',
          'I gave them back. Don\'t tell anyone. I have a name to keep up. Charms are on the hand, same as ever.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The Prince\'s crane is standing still. Do you know how quiet the Row is without that ball going?',
          'I\'ve put my prices up. Everyone\'s buying. Hope is very good for trade.',
        ],
      },
      {
        when: { questDone: Q_NAMES },
        lines: [
          'Somebody\'s chalked the old names back on the corners. Bellfounders\' Row. The Street of Lamps.',
          'I\'ve been selling the plates for scrap twenty years. I\'m going to stop. Probably.',
        ],
      },
      {
        lines: [
          'Salvage, no questions. Everything on this board came out of the ground with somebody\'s pick in it.',
          'The Regent calls it theft of the Tithe. I call it the city paying us back.',
          'Charms on the hand there — the colossus\'s, under the tarp. You can wear three. Each one was a real thing once.',
        ],
      },
    ],
    barks: [
      { when: PRINCE, lines: ['The ball\'s stopped! Buy something heavy!', 'No crane today, no Tithe tomorrow!'] },
      { lines: ['Bronze, slate, tesserae!', 'Dug fresh this morning!', 'No questions, no receipts.', 'Mind the hand, it\'s load-bearing.'] },
    ],
  },

  // ── Hobb Castellan — the letterer ────────────────────────────────────
  {
    id: 'rubble-hobb',
    name: 'Hobb Castellan',
    title: 'Letter-Cutter',
    look: { body: 0xd8bc9c, accent: 0x5a9a86, hat: 'cap', traits: ['tool', 'glasses', 'apron'], size: 0.95 },
    at: { x: 980, y: 1060 },
    talks: [
      {
        when: REGENT,
        lines: [
          'I am cutting the name of the city on the Breach. Big letters. The Regent\'s men are helping me lift the stone.',
          'They say they always liked the old name. Funny how many people always liked it, this week.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The Prince came down the Way this morning and read a corner plate. Out loud. Bellfounders\' Row.',
          'I don\'t think he knew he was allowed to.',
        ],
      },
      {
        when: { questDone: Q_NAMES },
        lines: [
          'Five corners named again. I cut them deep this time. Let them bring a bigger chisel.',
          'My father cut the first plates. I am only putting his letters back where they were.',
        ],
      },
      {
        when: { quest: Q_NAMES },
        lines: [
          'The plates are on the corner stones round the court. Prise them off gently, the bronze is soft.',
          'Then ask the Cantor what they said. She has them in songs, where nobody could chisel them.',
        ],
      },
      {
        lines: [
          'I cut letters. I used to cut the street names on the corner plates. Then the Regent withdrew the names.',
          'Withdrew. Like a coin. His Effacers came round with chisels and took the letters off every corner.',
          'A street with no name is just a gap between two heaps. That is what he wants. A city of gaps.',
        ],
      },
    ],
    barks: [
      { when: { questDone: Q_NAMES }, lines: ['Street of Lamps. Say it with me.', 'Deeper this time.'] },
      { lines: ['Tap, tap, tap.', 'A name is only a groove in a stone.', 'Not that corner. That one\'s still mine.'] },
    ],
  },

  // ── Cantor Ysolde Marr — the singer ──────────────────────────────────
  {
    id: 'rubble-ysolde',
    name: 'Cantor Ysolde Marr',
    title: 'Singer of the Buried Book',
    look: { body: 0xe0c8b0, accent: 0x3e5e8a, hat: 'hood', traits: ['scarf', 'book'], size: 1, eye: 0xc8d8f0 },
    at: { x: 2140, y: 1340 },
    talks: [
      {
        when: REGENT,
        lines: [
          'I sang the whole Book of the Capital on the Breach last night. Four hours. Nobody left.',
          'A boy wrote it all down. Every word. It is a book again. It weighs nothing, and nobody can tithe it.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'I sang the Song of the Colossus at the Prince\'s door. He opened it. He asked for the second verse.',
          'There are eleven verses. I am going to make him wait for them.',
        ],
      },
      {
        when: { questDone: Q_WELL },
        lines: [
          'The axolotl did not sing, of course. But I sang to it, and I remembered the middle of the book. All of it.',
          'Sometimes a thing only needs a listener to come back.',
        ],
      },
      {
        when: { quest: Q_WELL },
        lines: [
          'Ask old Dredge about the ledges, then bring me a tomb axolotl. Alive, please. I will put it back.',
        ],
      },
      {
        lines: [
          'The Regent pulped the Book of the Capital. Every copy. He had them thrown down the well in the pulp-carts.',
          'I had it by heart, nearly. Nearly is the word that keeps me awake.',
          'The old wives say the tomb axolotls in the well remember any song sung down to them. I sang it all, once.',
        ],
      },
    ],
    barks: [
      { when: PRINCE, lines: ['Verse two of eleven.', 'He asked. He actually asked.'] },
      { lines: ['(humming, very low)', 'The Street of Lamps, and the lamps were lit…', 'Nearly. Nearly.'] },
    ],
  },

  // ── Nan Tolley — the boy in the cellar ───────────────────────────────
  {
    id: 'rubble-nan',
    name: 'Nan Tolley',
    title: 'Picker, Corn Exchange',
    look: { body: 0xc4a084, accent: 0x7a6a4a, hat: 'miner', traits: ['tool', 'pack'], size: 0.9 },
    at: { x: 1100, y: 1470 },
    talks: [
      {
        when: REGENT,
        lines: [
          'Kit is going to school. A real one, up at Stonehold, with a roof that is meant to be a roof.',
          'I told him the cellars will still be here. He said, Nan, that is exactly the problem.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'Krell came by and shored our cellar himself. For nothing. He would not look at me while he did it.',
        ],
      },
      {
        when: { questDone: Q_CELLAR },
        lines: [
          'He\'s out. Filthy, starving, cheeky as a sparrow. He wants to go back down for his pick. He is not going.',
          'Thank you. There is no Tithe on thank you. I checked.',
        ],
      },
      {
        when: { quest: Q_CELLAR },
        lines: [
          'Shout down the grate first, so he knows. Then the props — the old Exchange beams the Row keeps by.',
        ],
      },
      {
        lines: [
          'My grandson is under there. Kit. The cellar came in on him this morning. I can hear him singing.',
          'He sings when he is scared. He has been singing for six hours.',
          'The Backfiller is coming at dusk to fill the hole. His orders. A fallen cellar is a buried cellar.',
        ],
      },
    ],
    barks: [
      { when: { questDone: Q_CELLAR }, lines: ['Kit! Out of that hole!', 'Not down there. Not ever.'] },
      { lines: ['Keep singing, Kit!', 'Six hours. Six hours.', 'Somebody fetch a prop.'] },
    ],
  },

  // ── Kit Tolley — out of the cellar ───────────────────────────────────
  {
    id: 'rubble-kit',
    name: 'Kit Tolley',
    title: 'Picker\'s Apprentice',
    look: { body: 0xd2ae8e, accent: 0xe8c03a, hat: 'miner', traits: ['bandage'], size: 0.7 },
    at: { x: 1150, y: 1500 },
    present: { questDone: Q_CELLAR },
    talks: [
      {
        when: REGENT,
        lines: [
          'I\'m going to be a builder. A proper one. Things I build are going to stay up. That\'s the whole idea.',
        ],
      },
      {
        when: PRINCE,
        lines: ['Is it true you knocked the Prince down? Did he go over like a pillar? Did he groan first?'],
      },
      {
        lines: [
          'I found a whole room down there. Paintings on the walls. A dog, and a man with a loaf. They were laughing.',
          'Nan says I have to forget it. I\'m not going to. I\'m going to draw it on everything.',
        ],
      },
    ],
    barks: [{ lines: ['A dog and a man with a loaf!', 'I wasn\'t scared. I was singing.'] }],
  },

  // ── Agnes Tallis — the widow on the Way ──────────────────────────────
  {
    id: 'rubble-agnes',
    name: 'Agnes Tallis',
    title: 'Widow of the Street of Lamps',
    look: { body: 0xd8c4b0, accent: 0x2e3a3a, hat: 'veil', traits: ['cane', 'lantern'], size: 0.9, eye: 0xbfe0d8 },
    at: { x: 1320, y: 820 },
    talks: [
      {
        when: REGENT,
        lines: [
          'They opened the Old King\'s tomb. Empty. A note. The Procession didn\'t come last night.',
          'I think they\'re all asleep at last. I put Tam\'s lamp out myself. I said goodnight.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The memorial lamps are lit all the way up the Way. Nobody came to snuff them. Not one.',
        ],
      },
      {
        when: { questDone: Q_LANTERN },
        lines: [
          'Tam\'s lamp is lit on the Way. When the Procession passes, he lifts his head. Only a little.',
          'Forty years he has walked by me with his head down. A little is a great deal.',
        ],
      },
      {
        when: { quest: Q_LANTERN },
        lines: [
          'The Sexton keeps the roll of the buried. He\'ll tell you which lamp is Tam\'s. Then the tomb steps.',
        ],
      },
      {
        lines: [
          'My Tam was a lamplighter on the Street of Lamps. He walks in the Procession now. Every dusk.',
          'There were lamps for the dead along the Way, one each. The Regent\'s Snuffer puts them out, nightly.',
          'A dead man walking in the dark cannot find his own name. That is the point of it.',
        ],
      },
    ],
    barks: [
      { when: { questDone: Q_LANTERN }, lines: ['He lifted his head.', 'Goodnight, Tam. Goodnight.'] },
      { lines: ['Dusk soon.', 'One lamp each. That was the custom.', 'Tam. Tam.'] },
    ],
  },

  // ── Ashlar Penhallow — the old palace foreman ────────────────────────
  {
    id: 'rubble-penhallow',
    name: 'Ashlar Penhallow',
    title: 'Foreman of the Palace Works',
    look: { body: 0xc0a080, accent: 0xe8c03a, hat: 'helmet', traits: ['beard', 'cane', 'tool'], size: 1.15 },
    at: { x: 1520, y: 660 },
    talks: [
      {
        when: REGENT,
        lines: [
          'The Prince has asked me for a set of plans. The palace, as it was. He wants to put the east wing back.',
          'I have the plans. I have always had the plans. I kept them in the one place his father never looked: me.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'He came out of the yard and sat on the plinth under the colossus\'s feet. He was there an hour.',
          'He asked me if anything he built had ever stood. I said one thing did. I said: you\'re still standing.',
        ],
      },
      {
        when: { questDone: Q_CAPITAL },
        lines: ['Go well. Whatever he was, he was once a boy who liked stacking stones. I taught him that.'],
      },
      {
        when: { courtReady: 'rubble' },
        lines: [
          'All five of his crew, down in the dust. He\'s in the yard, at the crane. Waiting on you, I think.',
          'Come and talk to me before you go in. There\'s a thing you ought to know about the boy.',
        ],
      },
      {
        lines: [
          'I was foreman of the palace works. I built half that east wing. Now I watch him knock it down, stone by stone.',
          'He pays me to stand here and tell him which stone holds which. Every one I name, he drops.',
          'I keep thinking one day I\'ll name a stone wrong, and it\'ll hold.',
        ],
      },
    ],
    barks: [
      { when: PRINCE, lines: ['The ball\'s still. Listen to that.', 'An hour on the plinth.'] },
      { lines: ['That one holds the lintel.', 'Forty years, stone by stone.', 'Mind the ball.'] },
    ],
  },

  // ── Sexton Barnaby Crouch — the keeper of the gate ───────────────────
  {
    id: 'rubble-crouch',
    name: 'Sexton Barnaby Crouch',
    title: 'Keeper of the Roll',
    look: { body: 0xb8b0a4, accent: 0x9a2e26, hat: 'tophat', traits: ['book', 'glasses', 'cane'], size: 1.05 },
    at: { x: 1070, y: 270 },
    talks: [
      {
        when: REGENT,
        lines: [
          'I unrolled the Roll on the gate steps and read out every interred name. It took two days.',
          'Every one of them answered. Every one. I have kept that Roll forty years and never once heard an answer.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'Six princes of the Hold, and the Rubble\'s is down. The slab won\'t move till the last of them falls.',
          'When it does, I will hold the door for you. I have always wanted to hold it the other way.',
        ],
      },
      {
        when: { quest: Q_LANTERN },
        lines: [
          'Tallis, Tamsin, lamplighter. Row forty, page nine. His lamp is the ninth from the gate, west side.',
        ],
      },
      {
        lines: [
          'That is the Sepulchre. The Regent\'s hold, dug downward. The interred go in by this door, and nothing out.',
          'I keep the Roll: every name sealed in, row and page. Somebody must. The Regent prefers they were nobody.',
          'The slab is mortared shut in his red. It will not open while his six children hold the Hold.',
        ],
      },
    ],
    barks: [
      { when: PRINCE, lines: ['Five to go.', 'The other way. I want to hold it the other way.'] },
      { lines: ['Row forty, page nine…', 'Do not knock.', 'Everybody is somebody on the Roll.'] },
    ],
  },

  // ── Old Dredge — the well-fisher ─────────────────────────────────────
  {
    id: 'rubble-dredge',
    name: 'Old Dredge',
    title: 'Fisher of the Well',
    look: { body: 0xb8a490, accent: 0x3a5a6a, hat: 'souwester', traits: ['rod', 'pipe', 'beard'], size: 1.05 },
    at: { x: 1820, y: 1320 },
    talks: [
      {
        when: REGENT,
        lines: [
          'Fished a lead case out of the well yesterday. Full of pulp. The Cantor cried over it. Happy crying.',
        ],
      },
      {
        when: PRINCE,
        lines: ['The well\'s quiet without that crane thumping. Fish bite better. Everything bites better.'],
      },
      {
        when: { quest: Q_WELL },
        lines: [
          'Axolotls? On the ledges, halfway down, where the old shaft broke. They\'re pale, slow and fight like eels.',
          'You need a delver\'s rod — the long one from the tackle shop down in Quarrymouth. Nothing else reaches.',
        ],
      },
      {
        lines: [
          'The Well of the Capital. Fell in on itself the year they buried the city. Still deep. Still good water.',
          'Blind cavefish mostly. Sturgeon down at the bottom, old as the city, full of swallowed rubbish.',
          'You\'ll want a delver\'s rod, from Quarrymouth tackle. Cast it long, and let the line find the ledges.',
        ],
      },
    ],
    barks: [
      { when: PRINCE, lines: ['Biting today.', 'Hear that? Nothing. Lovely.'] },
      { lines: ['Long rod, long patience.', 'Pale ones on the ledges.', 'Something big down there.'] },
    ],
  },
];

// ── The crowd ────────────────────────────────────────────────────────

const looks: NpcLook[] = [
  { body: 0xc8a888, accent: 0x7a6a4a, hat: 'miner', traits: ['tool'] },
  { body: 0xd8bc9c, accent: 0x8a3a2e, hat: 'headwrap', traits: ['pack'] },
  { body: 0xb89878, accent: 0x5f5a52, hat: 'cap', traits: ['satchel', 'beard'] },
  { body: 0xe0c8b0, accent: 0x3e5e8a, hat: 'hood', traits: ['scarf'], size: 0.78 },
  { body: 0xa88868, accent: 0xe8c03a, hat: 'miner', traits: ['tool', 'beard'], size: 1.15 },
  { body: 0xd8c4b0, accent: 0x2e3a3a, hat: 'veil', traits: ['lantern'] },
  { body: 0xc49a7c, accent: 0x9a5a40, hat: 'bandana', traits: ['pack', 'tool'] },
  { body: 0xd2ae8e, accent: 0xa8483a, hat: 'none', traits: ['satchel'], size: 0.72 },
];

const barks: Talk[] = [
  {
    when: REGENT,
    lines: [
      'They\'re letting the interred out!',
      'Say the name of the city. Go on. Out loud.',
      'The slab\'s open. The tomb was EMPTY.',
      'No Tithe. No Tithe at all!',
    ],
  },
  {
    when: PRINCE,
    lines: [
      'The Prince yielded!',
      'The crane\'s stopped swinging.',
      'Nobody chalked a cross on our wall today.',
      'He read a street name out loud. I heard him.',
    ],
  },
  {
    when: { courtReady: 'rubble' },
    lines: ['Someone\'s beaten all five of the Prince\'s crew.', 'They say the stranger\'s going to the Wrecker\'s Yard.'],
  },
  {
    lines: [
      'Mind the chalk crosses.',
      'Street of Lamps — oh, sorry. The Way.',
      'Dig quiet, the Effacers are about.',
      'That roof\'s got a candle in.',
      'Tithe\'s short again.',
      'Somebody\'s singing down the well.',
      'Don\'t stand still on the Sunken Street.',
      'The ball\'s swinging. Keep left.',
    ],
  },
];

export const RUBBLE_CROWD: NonNullable<AreaDef['crowd']> = {
  count: 13,
  looks,
  paths: [
    // Up and down the Processional Way.
    [{ x: 1200, y: 1660 }, { x: 1200, y: 1100 }, { x: 1200, y: 400 }, { x: 1200, y: 1100 }],
    // Along the Pickers' Row and through the Exchange.
    [{ x: 1180, y: 1300 }, { x: 760, y: 1300 }, { x: 430, y: 1440 }, { x: 270, y: 1570 }, { x: 430, y: 1440 }, { x: 760, y: 1300 }],
    // The bucket queue to the cistern.
    [{ x: 1180, y: 980 }, { x: 760, y: 970 }, { x: 560, y: 990 }, { x: 760, y: 970 }],
    // Out to the Sunken Street and the well.
    [{ x: 1220, y: 1400 }, { x: 1600, y: 1420 }, { x: 1900, y: 1340 }, { x: 2280, y: 1360 }, { x: 1900, y: 1340 }, { x: 1600, y: 1420 }],
    // To the colossus and back.
    [{ x: 1220, y: 1040 }, { x: 1440, y: 1040 }, { x: 1800, y: 900 }, { x: 2100, y: 860 }, { x: 1800, y: 900 }, { x: 1440, y: 1040 }],
    // Round the Wrecker's Yard, keeping clear of the ball.
    [{ x: 1220, y: 560 }, { x: 1500, y: 600 }, { x: 1700, y: 460 }, { x: 1500, y: 600 }],
  ],
  barks,
};
