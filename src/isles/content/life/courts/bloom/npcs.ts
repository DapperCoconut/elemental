import type { AreaDef, NpcDef, NpcLook, Talk } from '../../../../IslesTypes';

/**
 * The people of the Bloom Court.
 *
 * Bloom is the first court up the Great Walk from Mossgate, so its people do the explaining:
 * what the Bloom Tithe is (a measure of whatever a household grows, weighed at the season's
 * turn), what *pruning* is (the short are carted north to the Glasshouse and grafted into the
 * Empress's hedges, alive, "until they learn to flower"), and what being put *under glass* means
 * here (a cloche on the forcing lawn, for answering back). Everyone in the court gardens, and
 * everyone counts their stripe. They talk about flowers the way other towns talk about money.
 */

const PRINCE = { prince: 'petalis' } as const;
const EMPRESS = { monarch: 'verdigra' } as const;

const Q_MEASURE = 'bloom-q-measure-short';
const Q_SOUP = 'bloom-q-thin-soup';
const Q_GLASS = 'bloom-q-under-glass';
const Q_LIST = 'bloom-q-prune-list';
const Q_ORANGERY = 'bloom-q-orangery';

export const BLOOM_NPCS: NpcDef[] = [
  // ── Hesketh Dibble — the shop ────────────────────────────────────────
  {
    id: 'bloom-dibble',
    name: 'Hesketh Dibble',
    title: 'Seeds & Sundries',
    look: { body: 0xd8b48e, accent: 0x43a89a, hat: 'straw', traits: ['apron', 'glasses', 'satchel'], size: 1.05 },
    at: { x: 1000, y: 1124 },
    role: { kind: 'shop', id: 'bloom-shop' },
    talks: [
      {
        when: EMPRESS,
        lines: [
          'I sold a packet of dandelion seed this morning. DANDELION. Somebody wants weeds. On purpose.',
          'I could weep. Charms are on the shelf, same as ever. Everything else is suddenly allowed.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The orangery door\'s open and nobody\'s weighing anything. I\'ve had three customers ask for vegetables.',
          'Vegetables! In the Bloom Court! I\'ve got turnip seed somewhere. Under the marigolds.',
        ],
      },
      {
        when: { questDone: Q_MEASURE },
        lines: [
          'The Weatherbys made weight. With help, they\'re saying. With help! In this court!',
          'Every household sent a marigold. I sold the seed for every one of them. I\'m choosing to feel good about it.',
        ],
      },
      {
        lines: [
          'Seeds and sundries. Every stripe in those beds started in one of my drawers, and every stripe gets weighed.',
          'The Bloom Tithe, friend: a measure from each household, of whatever it grows, at each season\'s turn.',
          'Short of the measure and you\'re pruned. Carted north to the Glasshouse. So people buy good seed.',
          'Charms are on the top shelf — you can wear three. They\'re garden things, but they\'ll fight for you.',
        ],
      },
    ],
    barks: [
      { when: PRINCE, lines: ['Turnips! Who wants turnips!', 'No weighing today! Buy something heavy!'] },
      {
        lines: [
          'Seed, bulb and cutting!', 'Marigold for the measure, madam?', 'Sow early, weigh heavy.',
          'Charms on the top shelf — mind the snips.',
        ],
      },
    ],
  },

  // ── Tansy Weatherby — the household short of the measure ─────────────
  {
    id: 'bloom-tansy',
    name: 'Tansy Weatherby',
    title: 'Stripe Six, the Fourth Bed',
    look: { body: 0xe2c6aa, accent: 0xf2b632, hat: 'wreath', traits: ['cane', 'apron'], size: 0.9 },
    at: { x: 585, y: 1460 },
    talks: [
      {
        when: EMPRESS,
        lines: [
          'I dug up my stripe this morning. All of it. I\'m putting in potatoes. Potatoes don\'t get weighed.',
          'Forty years of marigolds. I never liked marigolds. Did you know that? Nobody ever asked.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The scales are standing level with nothing on them. I went and looked. I\'d never seen them level.',
          'They say the Prince sits in his orangery with the doors open. Just sits. Like a flower in the sun.',
        ],
      },
      {
        when: { questDone: Q_MEASURE },
        lines: [
          'Every stripe in the court sent me a marigold. Every one. Even old Pelham\'s, and he hates us.',
          'We made weight. My grandson\'s still at home. You can\'t know. You can\'t know what that is.',
        ],
      },
      {
        when: { quest: Q_MEASURE },
        lines: [
          'The neighbours leave a bloom at the foot of their stakes. Gather them up — mind you don\'t pull any.',
          'Then take them to Amaranth at the scales. She\'ll tell you if it\'s enough. She always tells the truth.',
        ],
      },
      {
        lines: [
          'That\'s my stripe there. Number six, the fourth bed. The thin one with the red ribbon on its stake.',
          'Blight took the marigolds. Comes up through the soil, black on the roots. Nothing you can do.',
          'The ribbon means the Weigh-Warden has seen it. At the turn, the short are pruned. That\'s the word.',
        ],
      },
    ],
    barks: [
      { when: { questDone: Q_MEASURE }, lines: ['Made weight. Made weight!', 'Every stripe sent one.'] },
      { lines: ['Come on, come on, come up.', 'Blight. Black on the roots.', 'Six days to the turn.'] },
    ],
  },

  // ── Clerk Amaranth Vetch — keeps the weigh-book ──────────────────────
  {
    id: 'bloom-amaranth',
    name: 'Amaranth Vetch',
    title: 'Clerk of the Weigh-Book',
    look: { body: 0xcfb59c, accent: 0x24665c, hat: 'tophat', traits: ['book', 'glasses'], size: 1 },
    at: { x: 1296, y: 1548 },
    talks: [
      {
        when: EMPRESS,
        lines: [
          'I closed the weigh-book. Then I opened it again and wrote, in the margin: "The garden is its own."',
          'Then I closed it again. I have been closing it, on and off, all morning.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'No weighing until a new order comes. None will. I sit by the scales out of habit.',
          'I find I like the scales better empty. They look like a pair of open hands.',
        ],
      },
      {
        when: { questDone: Q_MEASURE },
        lines: [
          'Weatherby, stripe six, the fourth bed: full measure. I wrote it in my best hand.',
          'The Weigh-Warden says the measure was not lawfully grown. I wrote that down too. Then I lost the page.',
        ],
      },
      {
        lines: [
          'Every household in the court owes the Bloom Tithe: one measure of what it grows. Here, that\'s flowers.',
          'In the Spore Court it\'s mushrooms, at the Confection it\'s sugar, the Wildhunt pays in meat. All weighed.',
          'I record the weights. The Weigh-Warden reads the book. The short go on the prune list by the board.',
          'Pruning is… you\'ll hear it called a gardening word. It\'s the cart. North. The Glasshouse. The hedges.',
          'They say the pruned are grafted into the Empress\'s hedges, living, until they flower. I write it down.',
        ],
      },
    ],
    barks: [
      { when: PRINCE, lines: ['Nothing to weigh.', 'The book is very quiet.'] },
      { lines: ['Four measures and a quarter. Next.', 'Ink, sand, weight. Next.', 'Stand back from the pans, please.'] },
    ],
  },

  // ── Aldous Brook — keeps the fountains and the pond ──────────────────
  {
    id: 'bloom-aldous',
    name: 'Aldous Brook',
    title: 'Keeper of the Waters',
    look: { body: 0xc8a888, accent: 0x3f7f86, hat: 'cap', traits: ['rod', 'pipe', 'beard'], size: 1.15 },
    at: { x: 1600, y: 1300 },
    wander: 30,
    talks: [
      {
        when: EMPRESS,
        lines: [
          'I let the fountain run all night. Nobody\'s counting the water now. Listen to it — it sounds different.',
          'Fish the pond whenever you like. The koi aren\'t counted any more. They never knew they were.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The Prince came down to the pond after you beat him. Sat on the kerb. Fed the koi out of his hand.',
          'Didn\'t count them. First time in nine years nobody counted them.',
        ],
      },
      {
        when: { questDone: Q_SOUP },
        lines: [
          'Nettle\'s pot\'s full of perch and the Bailiff\'s off nursing his pride. Good fishing, that.',
          'Perch bite at anything. The koi\'re fussier — they want a still line and a patient hand.',
        ],
      },
      {
        lines: [
          'That\'s the lily pond. Lilypad perch in it, nobody\'s, and petal koi — those are the Prince\'s.',
          'Every koi\'s counted into the Tithe at the turn. A koi short and it\'s the keeper\'s stripe they weigh.',
          'Cast from the kerb. When the float goes under, reel; keep the fish inside the bar. You\'ll get the knack.',
        ],
      },
    ],
    barks: [
      { when: PRINCE, lines: ['Nobody counting the koi.', 'Fountain\'s running all night.'] },
      { lines: ['Bite\'s on.', 'Fourteen koi. Fourteen. Good.', 'Mind the kerb, it\'s slick.'] },
    ],
  },

  // ── Sister Nettle — the herb-woman ───────────────────────────────────
  {
    id: 'bloom-nettle',
    name: 'Sister Nettle',
    title: 'The Knot Garden',
    look: { body: 0xd7bea4, accent: 0x6f8f4a, hat: 'hood', traits: ['satchel', 'bandage'], size: 0.95, eye: 0xc8e8a8 },
    at: { x: 300, y: 800 },
    talks: [
      {
        when: EMPRESS,
        lines: [
          'The Glasshouse doors are open, they say. They\'re bringing the grafted home. Some of them still have leaves.',
          'I\'ve a great deal of salve to make. I\'ve never been so glad to be busy.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'I nursed that boy through a fever when he was six. Petalis. He cried for a week when his first rose fell.',
          'His mother told him the fallen ones are the ones that didn\'t try. He believed her. Children do.',
        ],
      },
      {
        when: { questDone: Q_SOUP },
        lines: [
          'The thin stripes have eaten perch three nights running. You can see it in their hands. Steadier.',
          'If you\'re scratched, come to me. Thorn-scratch festers in this court. Everything here grows too well.',
        ],
      },
      {
        lines: [
          'Thyme, rue, feverfew, heal-all. A knot garden — every herb in its loop, like everything here.',
          'I tend the scratched. Pruners\' thorns, the dead-heads\' briars. And I feed the thin stripes, when I can.',
          'Families short of the measure stop eating, to give the beds the water. It never works. Bless them.',
        ],
      },
    ],
    barks: [
      { lines: ['Rue for sorrow, thyme for courage.', 'Hold still, it\'ll sting.', 'Mind the thorns on the white roses.'] },
    ],
  },

  // ── Pip Larkspur — a child whose father is under glass ───────────────
  {
    id: 'bloom-pip',
    name: 'Pip Larkspur',
    title: 'Waiting on the Forcing Lawn',
    look: { body: 0xe6c9ac, accent: 0x8a52c4, hat: 'beanie', traits: ['satchel'], size: 0.72 },
    at: { x: 920, y: 790 },
    talks: [
      {
        when: EMPRESS,
        lines: [
          'Da\'s planting larkspur in our stripe. Blue ones. He says they don\'t weigh anything at all. Perfect.',
        ],
      },
      {
        when: { questDone: Q_GLASS },
        lines: [
          'Da\'s out! He smells like a greenhouse and he\'s sunburnt on his nose, but he\'s OUT.',
          'He says you lifted the glass like it was nothing. I\'m going to be strong like that.',
        ],
      },
      {
        when: { quest: Q_GLASS },
        lines: [
          'Talk to him first — put your ear to the glass, he can hear you if you shout.',
          'There\'s pegs. Big iron ones in the grass, holding the bell down. I can\'t pull them. I\'ve tried.',
        ],
      },
      {
        lines: [
          'That\'s my Da. Under the big bell. They put him under glass for telling the Weigh-Warden she was wrong.',
          'She WAS wrong. Our stripe was full. She said it was "leggy". That\'s not even a weight.',
          'Under glass is how the Prince forces things — makes them grow quick. Da\'s been under four days.',
        ],
      },
    ],
    barks: [
      { when: { questDone: Q_GLASS }, lines: ['Da\'s out!', 'Sunburnt nose!'] },
      { lines: ['Hold on, Da.', 'It\'s not even a weight.', 'I brought you water. They won\'t let me give it you.'] },
    ],
  },

  // ── Hob Larkspur — under the cloche ──────────────────────────────────
  {
    id: 'bloom-hob',
    name: 'Hob Larkspur',
    title: 'Under Glass',
    look: { body: 0xd0a88a, accent: 0x5a86d8, hat: 'none', traits: ['beard', 'bandage'], size: 1.1 },
    at: { x: 860, y: 712 },
    present: { not: { questDone: Q_GLASS } },
    talks: [
      {
        when: { quest: Q_GLASS },
        lines: [
          '(through the glass) …the PEGS. Three of them. In the turf, round the rim. Pull them and the bell lifts.',
        ],
      },
      {
        lines: [
          '(muffled, through the glass) …hot in here. HOT. The Prince says it brings a man on. I am very brought on.',
          '(muffled) Is Pip all right? Don\'t tell her I said hot. Tell her it\'s cosy.',
        ],
      },
    ],
    barks: [
      { lines: ['(a muffled thump on the glass)', '(muffled) …cosy…', '(muffled) Water?'] },
    ],
  },
  {
    id: 'bloom-hob-free',
    name: 'Hob Larkspur',
    title: 'Out from Under',
    look: { body: 0xd8a088, accent: 0x5a86d8, hat: 'straw', traits: ['beard', 'tool'], size: 1.1 },
    at: { x: 990, y: 772 },
    present: { questDone: Q_GLASS },
    talks: [
      {
        when: EMPRESS,
        lines: [
          'Glass is glass again. I put a cloche over a lettuce this morning, the way you\'re meant to. Felt odd.',
          'Lettuce didn\'t say a word. Good lettuce.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'They\'re lifting all the bells on the forcing lawn. Only roses under them now. I check every morning.',
        ],
      },
      {
        lines: [
          'Four days. You\'d think you\'d go mad. You don\'t. You just watch the shadow go round the dial.',
          'Leggy, she said. Our stripe. I\'ll show her leggy. I\'ll plant beanpoles.',
        ],
      },
    ],
    barks: [{ lines: ['Never again under glass.', 'Beanpoles. Ten foot.'] }],
  },

  // ── Burdock — a pruner who threw down his shears ─────────────────────
  {
    id: 'bloom-burdock',
    name: 'Burdock',
    title: 'Late of the Pruning Crew',
    look: { body: 0xb8916e, accent: 0x5a3f2a, hat: 'hood', traits: ['tool', 'scarf'], size: 1.25 },
    at: { x: 2300, y: 1110 },
    talks: [
      {
        when: EMPRESS,
        lines: [
          'I went up to the Glasshouse. Found my sister in the hedge. She knew me. She said my name.',
          'They\'re cutting her out slow, so it doesn\'t hurt. I\'m going back up tomorrow. And every day.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'I can stand in the open now. Sabine walked past me this morning and looked at the ground.',
        ],
      },
      {
        when: { questDone: Q_LIST },
        lines: [
          'No list, no names. No names, no cart. They\'ll write another. But this turn, nobody goes north.',
          'One turn. One whole season of nobody. You don\'t know what you\'ve bought.',
        ],
      },
      {
        when: { quest: Q_LIST },
        lines: [
          'Four copies: the board by the scales, the cart, the orangery door, the end of the sheds. Every one.',
        ],
      },
      {
        lines: [
          '…You didn\'t see me. I\'m behind a shed. I\'m a shed.',
          'I cut for Sabine\'s crew. Deadheading, they call it — the weak ones taken off so the plant grows stronger.',
          'People, they mean. Last season the list had my sister on it. I put my shears down and ran.',
        ],
      },
    ],
    barks: [
      { lines: ['…shh.', 'Is that Sabine?', 'I\'m a shed.'] },
    ],
  },

  // ── Quince — the orangery steward ────────────────────────────────────
  {
    id: 'bloom-quince',
    name: 'Quince',
    title: 'Steward of the Orangery',
    look: { body: 0xe4ccb0, accent: 0xf0902a, hat: 'none', traits: ['apron', 'glasses'], size: 1 },
    at: { x: 1700, y: 440 },
    talks: [
      {
        when: EMPRESS,
        lines: [
          'His Highness has asked me to plant a tree that is allowed to grow crooked. I have never been so honoured.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'He let the oranges fall. He watched them fall, and he didn\'t send for the pruners. He just watched.',
          'He asked me if they minded. Falling. I said I thought they were made for it. He was quiet a long time.',
        ],
      },
      {
        when: { courtReady: 'bloom' },
        lines: [
          'All five of them. He saw you from the dome. He has asked for his good gloves.',
        ],
      },
      {
        lines: [
          'The orangery is closed to visitors. His Highness is deadheading. He does it himself, every morning, alone.',
          'Every fallen petal is swept up before he sees it. That is my first duty. He cannot bear to see them.',
          'Beat the five who keep his garden and he will see you. He sees everything, from the dome.',
        ],
      },
    ],
    barks: [
      { lines: ['Not one petal on the step.', 'His Highness is not receiving.', 'Sweep, sweep.'] },
    ],
  },
];

// ── The crowd ─────────────────────────────────────────────────────────

const looks: NpcLook[] = [
  { body: 0xd6b494, accent: 0x43a89a, hat: 'straw', traits: ['tool'] },
  { body: 0xe4c8ac, accent: 0xd8344a, hat: 'wreath', traits: ['apron'] },
  { body: 0xc49a7c, accent: 0x5a86d8, hat: 'cap', traits: ['satchel'] },
  { body: 0xdcbca0, accent: 0xf07aa8, hat: 'wreath', traits: ['scarf'], size: 0.78 },
  { body: 0xb8906e, accent: 0x2f5a2c, hat: 'straw', traits: ['tool', 'beard'], size: 1.15 },
  { body: 0xe8d0b6, accent: 0x8a52c4, hat: 'hood', traits: ['book'] },
  { body: 0xcfa585, accent: 0xf2b632, hat: 'bandana', traits: ['apron', 'tool'] },
  { body: 0xd9b89a, accent: 0xc0673f, hat: 'none', traits: ['pack'], size: 0.74 },
];

const barks: Talk[] = [
  {
    when: EMPRESS,
    lines: [
      'They\'re bringing the grafted home!',
      'I let a dandelion grow. Right in the middle.',
      'No turn, no weighing, no cart.',
      'My stripe\'s got weeds in it and I LOVE them.',
    ],
  },
  {
    when: PRINCE,
    lines: [
      'The Prince yielded!',
      'Nobody\'s swept the orangery step.',
      'There\'s a petal on the walk and nobody cares!',
      'Is the turn still on? Amaranth says no.',
    ],
  },
  {
    when: { courtReady: 'bloom' },
    lines: [
      'Someone\'s beaten all five of the Prince\'s.',
      'They say the stranger\'s going to the orangery.',
    ],
  },
  {
    lines: [
      'Six days to the turn.',
      'The Hollyocks are on the list.',
      'Deadhead it before the Warden sees.',
      'Don\'t step on the edging!',
      'Mind your stripe.',
      'The cart\'s been oiled.',
      'Weigh heavy.',
      'Leggy, she called it. LEGGY.',
    ],
  },
];

export const BLOOM_CROWD: NonNullable<AreaDef['crowd']> = {
  count: 14,
  looks,
  paths: [
    // Up and down the Great Walk.
    [{ x: 1200, y: 1600 }, { x: 1200, y: 1060 }, { x: 1200, y: 640 }, { x: 1200, y: 1060 }],
    // The Cross Walk, both ways.
    [{ x: 120, y: 850 }, { x: 1000, y: 850 }, { x: 1400, y: 850 }, { x: 2280, y: 850 }],
    [{ x: 2280, y: 850 }, { x: 1400, y: 850 }, { x: 1000, y: 850 }, { x: 120, y: 850 }],
    // Through the Tithe Beds, stripe by stripe.
    [{ x: 220, y: 1285 }, { x: 585, y: 1285 }, { x: 585, y: 1600 }, { x: 960, y: 1600 }, { x: 585, y: 1600 }, { x: 585, y: 990 }],
    // Round the fountain plaza.
    [{ x: 1060, y: 760 }, { x: 1340, y: 760 }, { x: 1340, y: 950 }, { x: 1060, y: 950 }],
    // Round the sundial.
    [{ x: 1006, y: 430 }, { x: 1200, y: 558 }, { x: 1394, y: 430 }, { x: 1200, y: 302 }],
    // Down to the pond and the Pollinarium.
    [{ x: 1600, y: 890 }, { x: 1600, y: 1420 }, { x: 2280, y: 1420 }, { x: 1600, y: 1420 }],
  ],
  barks,
};
