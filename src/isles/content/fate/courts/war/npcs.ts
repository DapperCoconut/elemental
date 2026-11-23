import type { AreaDef, NpcDef, NpcLook, Talk } from '../../../../IslesTypes';

/**
 * The people of the War Court.
 *
 * War is where the Draw stops being a number on a board. Every Sunday the Drafting Wheel turns in
 * the square and the drawn are marched up here by noon: fitted with a coat and a shako, given a
 * pike, and put in the line under the House's wall to fight a war nobody has ever been told the
 * name of. Mothers come up the Muster Road to look for sons. The busted sweep the House's step by
 * number. Everyone in the court knows the Wheel is rigged — Prince Banneret's own Lot, No. 1, has
 * never once been called — and nobody can prove it. They talk about luck the way soldiers do.
 */

const PRINCE = { prince: 'banneret' } as const;
const KING = { monarch: 'lucan' } as const;

const Q_CALLED = 'war-q-called-up';
const Q_CADENCE = 'war-q-cadence';
const Q_STEW = 'war-q-trench-stew';
const Q_NUTMEG = 'war-q-nutmeg';
const Q_ONE = 'war-q-number-one';

export const WAR_NPCS: NpcDef[] = [
  // ── Ottilie Brass — the quartermaster's stall ────────────────────────
  {
    id: 'war-brass',
    name: 'Ottilie Brass',
    title: 'Quartermaster',
    look: { body: 0xc8a080, accent: 0xb8222e, hat: 'cap', traits: ['apron', 'satchel', 'glasses'], size: 1.15 },
    at: { x: 1420, y: 1636 },
    role: { kind: 'shop', id: 'war-shop' },
    talks: [
      {
        when: KING,
        lines: [
          'I\'m issuing everything back. Coats, boots, the lot. Folk are taking the shakos home to grow beans in.',
          'Charms are still on the counter. Those were never the House\'s. Those were mine.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The Prince signed an order this morning: no draft this Sunday. In his own hand. I framed the carbon.',
          'Stores are open. Buy something before the House sends someone up to unsign it.',
        ],
      },
      {
        when: { questDone: Q_CALLED },
        lines: [
          'The Pellow boy walked down the Muster Road with no Lot on him. Nobody\'s number. Nobody stopped him.',
          'I issued him a coat on the way up. I\'m not asking for it back.',
        ],
      },
      {
        lines: [
          'Quartermaster. Everything the drawn are given, I give: coat, shako, pike, a number on the door.',
          'You\'re not drawn. You\'ve no Lot. That makes you a customer, which is rarer up here than a hero.',
          'Charms on the counter. Drill kit, mostly — you can wear three, and they fight the way the court does.',
        ],
      },
    ],
    barks: [
      { when: PRINCE, lines: ['No draft Sunday! Coats half price!', 'Everything must go — including me.'] },
      { lines: ['Coats, boots, shakos!', 'Sign for it. Everybody signs.', 'Mind the pike rack.', 'Sticks for the drummer-boys!'] },
    ],
  },

  // ── Nan Pellow — a mother come up the Muster Road ────────────────────
  {
    id: 'war-nan',
    name: 'Nan Pellow',
    title: 'Mother of No. 0917',
    look: { body: 0xe0c4a8, accent: 0x5a3a24, hat: 'hood', traits: ['scarf', 'satchel'], size: 0.92 },
    at: { x: 1000, y: 1112 },
    talks: [
      {
        when: KING,
        lines: [
          'They broke the drum open in the square. There was a false bottom. All the favourites\' Lots were in it.',
          'All those years, and the drum was just a box with a lie in it. I want to laugh. I want to sit down.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The board\'s been wiped. Clean black. I keep looking for 0917 on it out of habit, and it isn\'t there.',
        ],
      },
      {
        when: { questDone: Q_CALLED },
        lines: [
          'He\'s home. He sleeps in the afternoon like a cat. He has no Lot on him and nobody can call him.',
          'You gave me my son back, stranger. I\'ve nothing to give back but soup. Come for soup.',
        ],
      },
      {
        when: { quest: Q_CALLED },
        lines: [
          'He\'s in the line north of the trench, by the west crossing. Ask him what he needs. He won\'t tell me.',
        ],
      },
      {
        lines: [
          'That\'s his number. 0917. Struck through in red. Third week running — and they say the Wheel is fair.',
          'Three weeks. Same boy. What are the odds of that? I\'ll tell you the odds. The odds are the House.',
        ],
      },
    ],
    barks: [
      { when: { questDone: Q_CALLED }, lines: ['Nobody\'s number. Nobody\'s!', 'He\'s home. He\'s home.'] },
      { lines: ['0917. Third week.', 'They say it\'s fair.', 'Tam. Tam, love.', 'What are the odds?'] },
    ],
  },

  // ── Tam Pellow — No. 0917, in the line ───────────────────────────────
  {
    id: 'war-tam',
    name: 'Tam Pellow',
    title: 'No. 0917, Drafted',
    look: { body: 0xd8b08a, accent: 0xa02430, hat: 'shako', traits: ['pack'], size: 0.86 },
    at: { x: 600, y: 600 },
    present: { not: { questDone: Q_CALLED } },
    talks: [
      {
        when: { questDone: Q_STEW },
        lines: [
          'Hask brought tench down the line last night. Hot. With salt. First hot thing in the trench all month.',
          'We sang. Quietly. You don\'t sing loud in a trench. The House\'s wall has ears and very good lamps.',
        ],
      },
      {
        when: { quest: Q_CALLED },
        lines: [
          'Ma sent you? Course she did. Listen — I can\'t walk home. Not with my Lot on me. It\'s not on me.',
          'The Provost-Marshal takes every drawn lad\'s Lot when he reports. Keeps them in his box. So we can\'t run.',
          'A man with no Lot is nobody\'s number, see. Can\'t be called. If I had mine, I could just… not be.',
        ],
      },
      {
        lines: [
          'Head down, stranger. They lob a stone over from the House\'s side now and then, just to keep us keen.',
          'Who are we fighting? Nobody knows. The Prince says it\'s the principle of the thing. I\'ve never seen it.',
        ],
      },
    ],
    barks: [
      { lines: ['Heads down.', 'Third week running.', 'Is it Sunday yet?', 'Tell Ma I\'m fine. Don\'t tell her the rest.'] },
    ],
  },

  // ── Kit Rattle — a drummer-boy ───────────────────────────────────────
  {
    id: 'war-kit',
    name: 'Kit Rattle',
    title: 'Drummer-Boy, Third Lines',
    look: { body: 0xe2c4a4, accent: 0xd8a83a, hat: 'shako', traits: ['satchel'], size: 0.72, eye: 0xa8d0ff },
    at: { x: 830, y: 1400 },
    talks: [
      {
        when: KING,
        lines: [
          'I play anything I like now. Yesterday I played a jig at the Wheel and it just stood there. Ha!',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The Prince asked me to beat the Retreat. Not the Muster. The RETREAT. I\'ve never played it for anyone.',
        ],
      },
      {
        when: { questDone: Q_CADENCE },
        lines: [
          'Registrar Tally has the pages. He says it\'s proof. Real proof, in ink. The first ever on the hill.',
          'Tattoo\'s been reduced to drumming for the mess. I hear he\'s very bad at waltzes.',
        ],
      },
      {
        when: { quest: Q_CADENCE },
        lines: [
          'The pages are pinned up at the barracks doors — Tattoo makes us learn them by heart. Four of them.',
          'Then take them to Registrar Tally at the stage. He reads everything. He\'ll know what it means.',
        ],
      },
      {
        lines: [
          'I play the Draw cadence on Sundays while the Wheel turns. Rat-a-tat, rat, tat-tat. The Drum-Major wrote it.',
          'Only it\'s never the same twice, and the man on the crank watches my sticks the whole time. Not the drum.',
        ],
      },
    ],
    barks: [
      { lines: ['Rat-a-tat, rat, tat-tat.', 'Left! Left! Left, right, left!', 'My sticks are new.', 'I\'m not drawn. I\'m just loud.'] },
    ],
  },

  // ── Quill Tally — Registrar of the Draft ─────────────────────────────
  {
    id: 'war-quill',
    name: 'Quill Tally',
    title: 'Registrar of the Draft',
    look: { body: 0xd4bca4, accent: 0x1c1a20, hat: 'tophat', traits: ['book', 'glasses'], size: 1.02 },
    at: { x: 1540, y: 1110 },
    talks: [
      {
        when: KING,
        lines: [
          'I am rewriting the roll. Every number, and beside it a name. Do you know how long a name takes to write?',
          'Longer than a number. Much longer. I am very happy.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The Prince came to the stage and turned the crank himself. Slowly. He watched every ball go round.',
          'He didn\'t draw. He just watched. Then he asked me for the roll, and read it, all of it, aloud.',
        ],
      },
      {
        when: { questDone: Q_CADENCE },
        lines: [
          'The cadence pages are in my strongbox, copied thrice. The same favourites\' numbers, every week, in drumbeats.',
          'One day somebody will need to prove it. I keep the proof. That is what a registrar is for, it turns out.',
        ],
      },
      {
        lines: [
          'Registrar of the Draft. I enter the numbers as they fall. I do not enter names. Names are not my business.',
          'Has the Wheel ever drawn No. 1? You will find the answer in my roll. You will find it on every page.',
        ],
      },
    ],
    barks: [
      { lines: ['Entered.', 'Entered. Entered. Entered.', 'Number, not name, please.', 'Ink is cheaper than men.'] },
    ],
  },

  // ── Corporal Hask — busted, No. 4471 ─────────────────────────────────
  {
    id: 'war-hask',
    name: 'Old Hask',
    title: 'Busted, Black Chip No. 4471',
    look: { body: 0xb8a490, accent: 0x1c1a20, hat: 'cap', traits: ['beard', 'cane', 'bandage'], size: 1.05, eye: 0xc8c0d0 },
    at: { x: 1330, y: 290 },
    talks: [
      {
        when: KING,
        lines: [
          'They\'re melting the black chips into a bell. Mine went in this morning. I said my name over the pot.',
          'Hask. Corporal Abel Hask. Nobody\'s said it in nine years, me included. It still fits.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The Prince stopped on the step and asked my name. I couldn\'t say it. Not allowed. He looked ashamed.',
        ],
      },
      {
        when: { questDone: Q_STEW },
        lines: [
          'The busted ate tench last night, behind the wall. With salt. Some of them cried. Don\'t tell anyone.',
        ],
      },
      {
        lines: [
          'Four-four-seven-one. That\'s what I\'m called. I bet against the House for my boy\'s re-draw. I lost.',
          'Everyone loses. Then they snap your Lot, hang a black chip on you, and you sweep their step by number.',
          'The door behind me? Barred. Six keys, six lucky children. You\'ve beaten some of them, I hear.',
        ],
      },
    ],
    barks: [
      { lines: ['Sweep, sweep.', 'No names on the step.', 'The House always wins.', 'Mind the gilt, it marks.'] },
    ],
  },

  // ── Maud Farrow — farrier of the tilt yard ───────────────────────────
  {
    id: 'war-maud',
    name: 'Maud Farrow',
    title: 'Farrier of the Tilt Yard',
    look: { body: 0xc89a7c, accent: 0x5a3a24, hat: 'bandana', traits: ['apron', 'tool'], size: 1.2 },
    at: { x: 2200, y: 1300 },
    talks: [
      {
        when: KING,
        lines: [
          'I\'ve put the chargers out to grass on the old baize terraces. They\'re eating the card table. It\'s lovely.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'No tilts by order of the Prince. The horses don\'t know what to do with themselves. Neither does Lance.',
        ],
      },
      {
        when: { questDone: Q_NUTMEG },
        lines: [
          'Nutmeg\'s in the end stall with her nose in a bucket of oats and no shoes on. Retired. Properly.',
          'Lance came by and said sorry to her. Not to me. To her. That\'s the right way round.',
        ],
      },
      {
        when: { quest: Q_NUTMEG },
        lines: [
          'She threw three shoes in the lanes this morning. Find them before Lance does, or he\'ll nail them back.',
        ],
      },
      {
        lines: [
          'Horses are drawn by lot too, did you know? Lots on their bridles. And Nutmeg\'s number comes up every week.',
          'Nineteen years old. She\'s run more tilts than any horse on the hill. Lance rides her because she won\'t quit.',
        ],
      },
    ],
    barks: [
      { lines: ['Steady, girl.', 'Hold that hoof.', 'Shoes don\'t grow on trees.', 'Lots on the bridles now. Lots!'] },
    ],
  },

  // ── Sapper Dunne — fishing the flooded sap ───────────────────────────
  {
    id: 'war-dunne',
    name: 'Sapper Dunne',
    title: 'Keeper of the Flooded Sap',
    look: { body: 0xb89a7c, accent: 0x4a5636, hat: 'helmet', traits: ['rod', 'pipe'], size: 1.1 },
    at: { x: 1560, y: 740 },
    talks: [
      {
        when: KING,
        lines: [
          'They\'re filling the trench in. Every crossing. I asked them to leave the sap. They left the sap.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The line\'s been stood down. Lads are sitting on the parapet with their boots off. In the open!',
        ],
      },
      {
        when: { questDone: Q_STEW },
        lines: [
          'Stew went down the line and up the wall to the busted. Moil can count his rations on his fingers now.',
        ],
      },
      {
        when: { quest: Q_STEW },
        lines: [
          'Cast in the brown water there. Iron rod, mind — the sap\'s thick as gravy. Tench bite at dusk and dinner.',
        ],
      },
      {
        lines: [
          'Dug this sap myself. It flooded the first night. The Captain said dig another. I said I\'d fish this one.',
          'There\'s tench in it, and barb, and a muskie the length of a pike-shaft. Nobody knows how they got in.',
        ],
      },
    ],
    barks: [
      { lines: ['Bite, you beggar.', 'Mind the duckboards.', 'Tench at dusk.', 'Keep your head below the bags.'] },
    ],
  },

  // ── Philippa Hem — the colour-party's seamstress ─────────────────────
  {
    id: 'war-philippa',
    name: 'Philippa Hem',
    title: 'Banner-Maker to the Colours',
    look: { body: 0xe8d0b6, accent: 0xc42a34, hat: 'none', traits: ['glasses', 'scarf'], size: 0.95 },
    at: { x: 220, y: 1080 },
    talks: [
      {
        when: KING,
        lines: [
          'I\'m sewing a new banner. No suit, no Lot, no number. Just the names of every lad who came home.',
          'It\'s going to be a very long banner. I have bought all the silk on the hill.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'He brought me his standard. Torn. He asked me not to mend it. He asked me to keep it, as it is.',
        ],
      },
      {
        lines: [
          'I sew the colours. Every banner on this hill went through my hands: suits for companies, Lots for him.',
          'I made his first, when he was six. A little swallowtail with a 1 on it. He slept with it.',
        ],
      },
    ],
    barks: [
      { lines: ['Hold still, I\'m measuring.', 'Gilt thread, gilt thread…', 'Swallowtail or square?', 'Mind my pins.'] },
    ],
  },

  // ── Herald Aubade — at the pavilion step ─────────────────────────────
  {
    id: 'war-aubade',
    name: 'Aubade Vane',
    title: 'Herald to Prince Banneret',
    look: { body: 0xdcc0a0, accent: 0xd8a83a, hat: 'plume', traits: ['book', 'scarf'], size: 1.05 },
    at: { x: 780, y: 455 },
    talks: [
      {
        when: KING,
        lines: [
          'His Highness has gone down to Tosswater to stand in the queue for bread like anyone. He seems happier.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'He has taken his Lot off. It is on the table in the pavilion. He keeps looking at it, then not.',
          'He says his number was called. By you. He says it was the only fair Draw he ever saw.',
        ],
      },
      {
        when: { courtReady: 'war' },
        lines: [
          'All five of the drill-masters. His Highness watched from the pavilion and called for his sabre.',
        ],
      },
      {
        lines: [
          'Herald to Prince Banneret, the Never-Drawn, marshal of the Muster, Lot No. 1. Mind the carpet.',
          'His Highness sees nobody who has not proved themselves on the hill. Beat his five, and I will announce you.',
        ],
      },
    ],
    barks: [
      { lines: ['Off the carpet, please.', 'His Highness is reviewing.', 'Number One! Number One!', 'Announcements at noon.'] },
    ],
  },
];

// ── The crowd ────────────────────────────────────────────────────────

const looks: NpcLook[] = [
  { body: 0xd8b08a, accent: 0xa02430, hat: 'shako', traits: ['pack'] },
  { body: 0xc89a78, accent: 0xa02430, hat: 'shako', traits: ['pack'], size: 1.1 },
  { body: 0xe2c6aa, accent: 0x5a3a24, hat: 'hood', traits: ['scarf'] },
  { body: 0xb8a490, accent: 0x1c1a20, hat: 'cap', traits: ['bandage'] },
  { body: 0xdcbca0, accent: 0xd8a83a, hat: 'shako', traits: ['satchel'], size: 0.74 },
  { body: 0xcfa585, accent: 0xb8222e, hat: 'helmet', traits: ['tool'] },
  { body: 0xe8d0b6, accent: 0x3e7646, hat: 'none', traits: ['apron'] },
  { body: 0xc4a080, accent: 0x9a6a34, hat: 'goggles', traits: ['tool', 'beard'], size: 1.15 },
];

const barks: Talk[] = [
  {
    when: KING,
    lines: [
      'The drum had a false bottom!',
      'Every number won. Every one!',
      'I said my name in the square.',
      'They\'re melting the chips into a bell.',
    ],
  },
  {
    when: PRINCE,
    lines: [
      'No draft Sunday!',
      'The Prince took his Lot off.',
      'Boots off on the parapet!',
      'Number One was called. By the stranger.',
    ],
  },
  {
    when: { courtReady: 'war' },
    lines: [
      'The stranger\'s beaten all five drill-masters.',
      'They\'re going to the pavilion.',
    ],
  },
  {
    lines: [
      'Is it Sunday?',
      'My number\'s due, I can feel it.',
      'Left, right, left.',
      'Nobody\'s ever seen No. 1 drawn.',
      'Heads below the bags.',
      'Who are we even fighting?',
      'The Wheel loves the Prince.',
      'Polish your Lot, it\'s inspection.',
    ],
  },
];

export const WAR_CROWD: NonNullable<AreaDef['crowd']> = {
  count: 14,
  looks,
  paths: [
    // Up and down the Muster Road.
    [{ x: 1200, y: 1700 }, { x: 1200, y: 1250 }, { x: 1200, y: 760 }, { x: 1200, y: 1250 }],
    // Along the Cross Road both ways.
    [{ x: 180, y: 1150 }, { x: 980, y: 1150 }, { x: 1420, y: 1150 }, { x: 2220, y: 1150 }],
    [{ x: 2220, y: 1150 }, { x: 1420, y: 1150 }, { x: 980, y: 1150 }, { x: 180, y: 1150 }],
    // Drilling round the parade ground.
    [{ x: 300, y: 850 }, { x: 860, y: 850 }, { x: 860, y: 1030 }, { x: 300, y: 1030 }],
    // Through the lines, hut to hut.
    [{ x: 740, y: 1360 }, { x: 740, y: 1690 }, { x: 900, y: 1690 }, { x: 740, y: 1520 }],
    // Behind the trench, along the North Road.
    [{ x: 340, y: 470 }, { x: 1100, y: 470 }, { x: 1500, y: 470 }, { x: 2100, y: 470 }, { x: 1500, y: 470 }],
    // Round the Drafting Square.
    [{ x: 1040, y: 1060 }, { x: 1360, y: 1240 }, { x: 1040, y: 1240 }, { x: 1300, y: 1110 }],
  ],
  barks,
};
