import type { AreaDef, NpcDef, NpcLook, Talk } from '../../../../IslesTypes';

/**
 * The people of the Bounce Court.
 *
 * Bounce pays the Draw in *turns*. Every attic holds a skein — a great rope of twisted rubber, a
 * motor as thick as a man — and every household winds its skein by hand all day on the crank
 * wheel on its wall. At the Brownout Bell the Toy Works throws a lever and every skein in the
 * town unwinds at once down the wires into the Prince's dynamos. A skein that is slack at the
 * Bell is short: the house is *switched off* (dark windows, cold stove, its own electric lock
 * shut on it), and switched off three times it is *put away* — into the Toy Box by the Works,
 * and from there up the Crown Coil to crank in the Treadmill Galleries.
 *
 * Prince Sprocket, the Empress's youngest, treats the town as his toy box. People here talk
 * about winding the way other towns talk about rent, and everything bounces, even the grief.
 */

const PRINCE = { prince: 'sprocket' } as const;
const EMPRESS = { monarch: 'ohmrine' } as const;

const Q_SKEIN = 'bounce-q-skein';
const Q_POST = 'bounce-q-balloon-post';
const Q_SUPPER = 'bounce-q-warm-supper';
const Q_BALLS = 'bounce-q-confiscated';
const Q_WOUND = 'bounce-q-wound-down';

export const BOUNCE_NPCS: NpcDef[] = [
  // ── Gutta Percival — the shop ────────────────────────────────────────
  {
    id: 'bounce-percival',
    name: 'Gutta Percival',
    title: 'Elastics & Notions',
    look: { body: 0xd8b494, accent: 0xe0403a, hat: 'tophat', traits: ['apron', 'glasses', 'satchel'], size: 1.05, eye: 0xf4c832 },
    at: { x: 1600, y: 780 },
    role: { kind: 'shop', id: 'bounce-shop' },
    talks: [
      {
        when: EMPRESS,
        lines: [
          'The skeins are slack in every attic and nobody\'s winding. I sold a band this morning for a CATAPULT.',
          'For fun, she said. Fun! I\'d forgotten rubber did that. Charms are on the hook, same as ever.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The Toy Works hasn\'t thrown its lever two nights running. My arm\'s gone soft. Look at it. Soft!',
          'People are buying elastic for garters again. Garters. I could weep. Have a look at the charms.',
        ],
      },
      {
        when: { questDone: Q_SKEIN },
        lines: [
          'The Lattimers spliced their skein with fresh milk off the trees, I hear. Lovely job. Holds like a promise.',
          'I sold them the binding. At cost. Don\'t tell anyone; it\'d ruin me.',
        ],
      },
      {
        lines: [
          'Bands, belts, garters, gaskets, bungs and bumpers. If it stretches, Percival\'s sells it.',
          'Skein splice? Crank grease? You\'re not from a crank-house, are you. No winder\'s callus on you.',
          'Every attic in Bounce has a skein. You wind it all day; the Toy Works unwinds it all at the Bell.',
          'Slack at the Bell, you\'re switched off. The charms on the hook fight better than they look. Three, mind.',
        ],
      },
    ],
    barks: [
      { when: PRINCE, lines: ['Garters! Catapults! Fun!', 'Nobody winding — buy a band for a laugh!'] },
      {
        lines: [
          'If it stretches, I sell it!', 'Fresh splice, guaranteed to the Bell!', 'Crank grease, two a tin!',
          'Charms on the hook — wear three.',
        ],
      },
    ],
  },

  // ── Nan Lattimer — the snapped skein (quest 1) ───────────────────────
  {
    id: 'bounce-nan',
    name: 'Nan Lattimer',
    title: 'Number Four, Crank Row',
    look: { body: 0xe2c6aa, accent: 0x9a5ad8, hat: 'hood', traits: ['cane', 'scarf'], size: 0.9 },
    at: { x: 1925, y: 1440 },
    talks: [
      {
        when: EMPRESS,
        lines: [
          'I cut our skein down from the attic and gave it to the children. They\'ve made a swing of it. A swing!',
          'Sixty years I wound that thing. Every turn of it went up the wires. Now it goes up and down, for nothing.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'No lever last night. I sat in the dark waiting for it like waiting for a slap. It never came.',
          'Then the lights came on by themselves. Our own skein, unwinding into our own house. Imagine.',
        ],
      },
      {
        when: { questDone: Q_SKEIN },
        lines: [
          'The skein held to the Bell. Wound to the mark, and the meter man gone home with a black eye. Ha!',
          'Two strikes on our door, and no third. Not this month. You don\'t know what a month is, to us.',
        ],
      },
      {
        when: { quest: Q_SKEIN },
        lines: [
          'Fresh latex off the plantation trees — four cups, from the tapped ones by the pool. Hevea will splice.',
          'Quick as you can, dear. My grandson\'s up there winding a snapped rope round and round for nothing.',
        ],
      },
      {
        lines: [
          'Our skein went in the night. Snapped clean through, up in the attic. You heard it from the street.',
          'Two strikes on our door already — see the chalk? A third and the Box takes us. My grandson first.',
        ],
      },
    ],
    barks: [
      { when: { questDone: Q_SKEIN }, lines: ['Wound to the mark!', 'No third strike. No third!'] },
      { lines: ['Snapped clean through.', 'Two strikes. Two.', 'Wind, Tobias. Wind.'] },
    ],
  },

  // ── Hevea Coombs — the tapper (quest 1, splices the skein) ───────────
  {
    id: 'bounce-hevea',
    name: 'Hevea Coombs',
    title: 'Head Tapper',
    look: { body: 0xb88a6a, accent: 0xf2ead2, hat: 'straw', traits: ['tool', 'apron', 'satchel'], size: 1.05, eye: 0xf2ead2 },
    at: { x: 300, y: 1112 },
    wander: 40,
    talks: [
      {
        when: EMPRESS,
        lines: [
          'The trees don\'t know the Empress is gone. They bleed the same. But the milk goes where WE say now.',
          'I\'m tapping for a bouncy floor in the school. A whole floor. The children have voted on the colour.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'His Highness came down the rows yesterday. On foot. He asked how a tree is tapped. I showed him.',
          'He held the cup and watched it fill for an hour. Didn\'t bounce once. I\'ve never seen him still.',
        ],
      },
      {
        when: { questDone: Q_SKEIN },
        lines: [
          'That splice I did for the Lattimers will outlast the house. Fresh milk, hot-cured, wrapped twelve turns.',
          'Take some of my rubber guppies from the pool if you\'re fishing. They squeak. Children love them.',
        ],
      },
      {
        lines: [
          'Score the bark, half a spiral, never too deep. Milk runs down the cut into the cup. That\'s tapping.',
          'All of it goes to the works. Cured, it\'s the Grid\'s insulation — every cable on the isle wears our milk.',
          'Fish the pool if you\'ve the patience. Briar rod or better; the latex holds the line like glue.',
        ],
      },
    ],
    barks: [
      { lines: ['Half a spiral. Never deep.', 'Milk\'s running well tonight.', 'Mind the cups!'] },
    ],
  },

  // ── Tilly Tether — the balloon post (quest 2) ────────────────────────
  {
    id: 'bounce-tilly',
    name: 'Tilly Tether',
    title: 'Of a Switched-Off House',
    look: { body: 0xe8d0b6, accent: 0xf07ab0, hat: 'beanie', traits: ['scarf'], size: 0.72 },
    at: { x: 2060, y: 1095 },
    talks: [
      {
        when: EMPRESS,
        lines: [
          'Mum came DOWN the Crown Coil this morning. Walking! She had her own two legs and everything!',
          'I gave her my last balloon. She cried. Grown-ups cry at balloons, it turns out.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The Prince let all the balloons off the Toy Works roof last night. Hundreds. They went up the Coil.',
          'I think some of them were letters. I think other people had the same idea as me.',
        ],
      },
      {
        when: { questDone: Q_POST },
        lines: [
          'Mr Loft says my balloon went right up past the third ring of the Coil. Right up to the Galleries.',
          'Mum will see it. She\'ll know it\'s mine. I drew a cat on it. She knows my cats.',
        ],
      },
      {
        when: { quest: Q_POST },
        lines: [
          'Mr Loft makes the balloons. He\'s in the big shop with the red stripes. He said he\'d help.',
          'Please hurry. The wind goes up the Coil tonight. It only does that sometimes.',
        ],
      },
      {
        lines: [
          'Mum got put away. Three strikes. The Box first, then up the Coil. That was in the autumn.',
          'The wind goes up the Coil some nights. If a balloon went with it, with a letter on, she might see.',
        ],
      },
    ],
    barks: [
      { when: { questDone: Q_POST }, lines: ['Right up past the third ring!', 'I drew a cat on it.'] },
      { lines: ['The wind goes up tonight.', 'Mum\'s in the Galleries.', 'I can draw cats. Look.'] },
    ],
  },

  // ── Fennimore Loft — the balloon maker (quest 2) ─────────────────────
  {
    id: 'bounce-fennimore',
    name: 'Fennimore Loft',
    title: 'Balloonwright',
    look: { body: 0xdcbca0, accent: 0xe0403a, hat: 'propeller', traits: ['apron', 'pipe', 'glasses'], size: 1.15, eye: 0x9adcff },
    at: { x: 1900, y: 1078 },
    talks: [
      {
        when: EMPRESS,
        lines: [
          'I am making a balloon big enough to carry a person. Just to see. Nobody\'s told me not to.',
          'Puff says she\'ll go up first. Puff would. Puff has never been afraid of anything that floats.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'He let them all go. Every gasbag on the Works roof. I watched four years of my work drift up.',
          'Best sight I ever saw. I\'m not even angry. I\'m making more, for no reason at all.',
        ],
      },
      {
        when: { questDone: Q_POST },
        lines: [
          'Little Tilly\'s balloon caught the updraught perfectly. I tied that knot myself. Three half-hitches.',
          'If the Linemen ask, you never saw a balloon. Balloons are gasbags for the Grid\'s cable-floats. Ahem.',
        ],
      },
      {
        lines: [
          'Gasbags, friend. Every cable float on the Grid hangs off one of mine. Puff blows them, I tie them.',
          'Party balloons? Unlicensed. A balloon is a Grid float or it is litter. The Linemen shoot litter down.',
        ],
      },
    ],
    barks: [
      { lines: ['Three half-hitches.', 'Mind the gas, it\'s touchy.', 'Gasbags for the Grid!'] },
    ],
  },

  // ── Dr Ada Plimsoll — supper for the switched-off (quest 3) ──────────
  {
    id: 'bounce-plimsoll',
    name: 'Dr Ada Plimsoll',
    title: 'Physician, Crank Row',
    look: { body: 0xc49a7c, accent: 0x3a8ae0, hat: 'cap', traits: ['satchel', 'glasses'], size: 1.0, eye: 0xa8d8ff },
    at: { x: 2180, y: 1440 },
    talks: [
      {
        when: EMPRESS,
        lines: [
          'I prescribed a fire this morning. A fire, in a grate, on purpose. The patient wept with joy.',
          'The lamplighter came through last night and lit Crank Row by hand. Every lamp. I followed her.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The switched-off houses came back on together, after the Prince fell. Twenty stoves at once.',
          'Half my patients got better overnight. Cold was all it was. I knew that. I couldn\'t write it down.',
        ],
      },
      {
        when: { questDone: Q_SUPPER },
        lines: [
          'Gussie\'s pot fed Crank Row two nights. Warm food in cold houses. My patients slept for the first time.',
          'The Flame-Finder hasn\'t come back. I think you frightened him. I find I don\'t mind that at all.',
        ],
      },
      {
        when: { quest: Q_SUPPER },
        lines: [
          'Two bounce bass out of the latex pool, for Gussie at the works\' back door. She has the only warm stove.',
          'Licensed fire, you understand. For the Grid. Not for soup. She uses it for soup.',
        ],
      },
      {
        lines: [
          'Half of Crank Row is switched off. No light, no heat, and their own door-locks shut against them.',
          'They\'re not sick. They\'re cold. Cold looks like every sickness in my book, and none of them cure it.',
          'A hot meal would do more than all my bottles. But flame is contraband, and every stove is electric.',
        ],
      },
    ],
    barks: [
      { when: { questDone: Q_SUPPER }, lines: ['Warm food. Doctor\'s orders.', 'They slept! They slept.'] },
      { lines: ['Keep moving, keep warm.', 'Cold is the sickness.', 'Another house off tonight.'] },
    ],
  },

  // ── Ma Gussie Brimstone — the works' back-door cook (quest 3) ────────
  {
    id: 'bounce-gussie',
    name: 'Ma Gussie Brimstone',
    title: 'Cook to the Works',
    look: { body: 0xcfa585, accent: 0xe6d23a, hat: 'chef', traits: ['apron', 'tool'], size: 1.25, eye: 0xffc070 },
    at: { x: 250, y: 500 },
    talks: [
      {
        when: EMPRESS,
        lines: [
          'I\'ve put a cookfire in the middle of the Trampoline Square. Out in the open. Licensed by nobody!',
          'Sulph\'s bringing the coal. The whole town\'s eating. I haven\'t sat down in a day and I don\'t care.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'His Highness came round the back for a bowl. Ate it standing. Said it was the warmest thing he\'d had.',
          'I said that\'s what food\'s for, pet. He looked at me like nobody\'d ever told him.',
        ],
      },
      {
        when: { questDone: Q_SUPPER },
        lines: [
          'Bass and potato, simmered on the curing fire. Licensed for the Grid. The Grid never asked for soup.',
          'You come round the back any time, you hear? There\'s always a bowl on Ma Gussie\'s stove.',
        ],
      },
      {
        lines: [
          'This is the back door of the only licensed fire on Voltreach. I cook the curers\' dinners on it.',
          'Mostly the curers\'. Some nights a pot goes out the gate for Crank Row. Nobody counts the pots.',
          'The Flame-Finder counts. He sniffs round the yard with his snuffer, smelling for unlicensed stew.',
        ],
      },
    ],
    barks: [
      { lines: ['Mind the stove, pet.', 'There\'s always a bowl.', 'Who\'s been at the ladle?'] },
    ],
  },

  // ── Nibs Hopper — the confiscated balls (quest 4) ────────────────────
  {
    id: 'bounce-nibs',
    name: 'Nibs Hopper',
    title: 'Ball Court Captain (Disbanded)',
    look: { body: 0xd9b89a, accent: 0x48b860, hat: 'cap', traits: ['bandage'], size: 0.76 },
    at: { x: 1000, y: 1060 },
    wander: 30,
    talks: [
      {
        when: EMPRESS,
        lines: [
          'We\'re playing a match against the Circuit kids. Our court. Our balls. Proper rules, no licence.',
          'Ricochet\'s refereeing. He\'s actually fair! He says he always was, he just wasn\'t allowed.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The Ball Court\'s open all night now. No half hour, no licence. We\'ve been playing for a DAY.',
          'Ricochet came and watched. He showed us a trick shot off three walls. He was smiling, nearly.',
        ],
      },
      {
        when: { questDone: Q_BALLS },
        lines: [
          'We\'ve got our balls back AND Ricochet got told. By you! By a stranger! Best day of my life.',
          'You can be on our team. You\'d have to learn the rules. There aren\'t many. Don\'t get hit.',
        ],
      },
      {
        when: { quest: Q_BALLS },
        lines: [
          'Ricochet threw them where we can\'t reach. Up on the cables, in the gutters. Four of them.',
          'Get them down, and then — then somebody\'s got to tell him. Somebody big.',
        ],
      },
      {
        lines: [
          'Pitcher Ricochet took all our balls. He says they\'re the Toy Works\'. He says play is by licence.',
          'The licence is a turn on your skein. Kids from switched-off houses can\'t pay. So we can\'t play.',
        ],
      },
    ],
    barks: [
      { when: { questDone: Q_BALLS }, lines: ['Three walls, one shot!', 'Don\'t get hit — that\'s the rule!'] },
      { lines: ['No licence, no ball.', 'He threw them on the WIRES.', 'Bet I could hit that.'] },
    ],
  },

  // ── Winder Marguerite Ratchet — the Prince's key-winder (quest 5) ────
  {
    id: 'bounce-marguerite',
    name: 'Marguerite Ratchet',
    title: 'Winder to His Highness',
    look: { body: 0xe8d4b4, accent: 0xd0a040, hat: 'veil', traits: ['tool', 'glasses'], size: 1.0, eye: 0xf4d488 },
    at: { x: 1600, y: 500 },
    talks: [
      {
        when: EMPRESS,
        lines: [
          'I put the winding-key in a drawer this morning. Then I took it out and polished it. Then back in.',
          'He doesn\'t need it. He never did. But I was his winder twelve years, and you don\'t just stop.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'He sat down. On the step. He hasn\'t sat down since he was four. I didn\'t know what to do with my hands.',
          'He asked me to stop winding him. I asked him if he was sure. He said, "Let\'s find out."',
        ],
      },
      {
        when: { courtReady: 'bounce' },
        lines: [
          'All five of his champions. His Highness is bouncing so fast in there the floor\'s cracking.',
          'I have the morning winding to do. Every morning, a hundred turns. He counts them with me.',
        ],
      },
      {
        lines: [
          'I wind His Highness every morning. A hundred turns of the key in his back. He counts along.',
          'If he runs down, his mother has him put away. She said so when he was small. He\'s never forgotten.',
          'So he never stops. Bouncing, all day, all night. You can hear him through the walls of the Works.',
        ],
      },
    ],
    barks: [
      { when: PRINCE, lines: ['He sat down.', 'Let\'s find out, he said.'] },
      { lines: ['Ninety-eight. Ninety-nine.', 'Tight, Highness. Tight.', 'He never stops.'] },
    ],
  },

  // ── Escapement Hobb — the old toymaker (quest 5) ─────────────────────
  {
    id: 'bounce-hobb',
    name: 'Escapement Hobb',
    title: 'Toymaker, Retired',
    look: { body: 0xe4c8ac, accent: 0x5a4a6a, hat: 'goggles', traits: ['beard', 'glasses', 'cane'], size: 0.95, eye: 0xd0a040 },
    at: { x: 1110, y: 400 },
    talks: [
      {
        when: EMPRESS,
        lines: [
          'I\'m making toys again. Plain ones. A top, a hoop, a cup-and-ball. Nothing with a key in it.',
          'Everything I made for that family had a key. I\'m done with keys. Spin it with your fingers, child.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'You told him. Good. Somebody had to, and I was too old and too frightened. He took it well?',
          'He came to my workshop and asked me to take the key out of his back. I did. It took a minute.',
        ],
      },
      {
        when: { questDone: Q_WOUND },
        lines: [
          'A key that winds nothing. Twelve years. And a whole town wound to the bone to keep him company.',
        ],
      },
      {
        lines: [
          'I built toys for the Toy Works for forty years. Clockwork soldiers, jack-boxes, spinning tops.',
          'Then I was retired. Not earthed. Retired. There is a difference, and I am grateful every day.',
          'I don\'t talk about the Prince. I built something for him once. A long time ago. Ask me another time.',
        ],
      },
    ],
    barks: [
      { lines: ['Tick, tock, tick.', 'Forty years of keys.', 'Spin it with your fingers.'] },
    ],
  },
];

// ── The crowd ────────────────────────────────────────────────────────

const looks: NpcLook[] = [
  { body: 0xd6b494, accent: 0xe0403a, hat: 'cap', traits: ['tool'] },
  { body: 0xe4c8ac, accent: 0xf4c832, hat: 'beanie', traits: ['apron'] },
  { body: 0xc49a7c, accent: 0x3a8ae0, hat: 'propeller', traits: ['satchel'], size: 0.76 },
  { body: 0xdcbca0, accent: 0x48b860, hat: 'antenna', traits: ['scarf'] },
  { body: 0xb8906e, accent: 0x6a3a30, hat: 'straw', traits: ['tool', 'beard'], size: 1.15 },
  { body: 0xe8d0b6, accent: 0x9a5ad8, hat: 'hood', traits: ['lantern'] },
  { body: 0xcfa585, accent: 0xe6d23a, hat: 'bandana', traits: ['apron', 'tool'] },
  { body: 0xd9b89a, accent: 0xf07ab0, hat: 'none', traits: ['pack'], size: 0.72 },
];

const barks: Talk[] = [
  {
    when: EMPRESS,
    lines: [
      'Skeins down! Swings up!',
      'The Coil\'s gone dark!',
      'My mum\'s home from the Galleries!',
      'Nobody\'s winding. NOBODY.',
    ],
  },
  {
    when: PRINCE,
    lines: [
      'The Prince sat down!',
      'No lever last night.',
      'The Toy Box is open!',
      'Our own lights, off our own skein!',
    ],
  },
  {
    when: { courtReady: 'bounce' },
    lines: [
      'All five of them, beaten!',
      'The stranger\'s going to the Toy Works.',
    ],
  },
  {
    lines: [
      'Wind it to the mark.',
      'Bell\'s at dusk.',
      'Two strikes on the Moffats\' door.',
      'Mind the trampolines.',
      'Is your skein tight?',
      'My arm, my arm.',
      'Lights flickered at ours.',
      'He\'s bouncing again. Hear it?',
    ],
  },
];

export const BOUNCE_CROWD: NonNullable<AreaDef['crowd']> = {
  count: 16,
  looks,
  paths: [
    // Main Street, both ways.
    [{ x: 2250, y: 800 }, { x: 1700, y: 805 }, { x: 1460, y: 815 }, { x: 1700, y: 805 }],
    // Up and down the North Road.
    [{ x: 1200, y: 640 }, { x: 1200, y: 300 }, { x: 1200, y: 120 }, { x: 1200, y: 300 }],
    // Round the Trampoline Square.
    [{ x: 1000, y: 820 }, { x: 1200, y: 690 }, { x: 1400, y: 820 }, { x: 1200, y: 960 }],
    // Gasbag Row and Crank Row loop.
    [{ x: 1500, y: 1090 }, { x: 2330, y: 1090 }, { x: 2330, y: 1440 }, { x: 1500, y: 1440 }],
    // Along Key Street past the Toy Works.
    [{ x: 1260, y: 520 }, { x: 1700, y: 540 }, { x: 2250, y: 520 }, { x: 1700, y: 540 }],
    // The West Lane and the plantation walk.
    [{ x: 960, y: 822 }, { x: 560, y: 822 }, { x: 920, y: 1112 }, { x: 300, y: 1112 }, { x: 920, y: 1112 }],
    // The works yard.
    [{ x: 560, y: 540 }, { x: 1100, y: 540 }, { x: 560, y: 540 }, { x: 560, y: 760 }],
  ],
  barks,
};
