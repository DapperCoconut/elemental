import type { AreaDef, NpcDef, NpcLook, Talk } from '../../../../IslesTypes';

/**
 * The people of the Halflife Court.
 *
 * Halflife pays the Draw in ore, not in cranking: one hod of pitch-blende a household a night,
 * weighed at the Tally House before the Brownout Bell and fed to Prince Isotope's reactor, which
 * turns it to current down the Grid. The Prince *lends* lead — roofs, aprons, shutters — to
 * households in good standing, because lead keeps the glow in; fall short and the lead is
 * recalled (switched off, here, means your roof is stripped to the rafters and your door-lock
 * cut), and a household switched off three times is earthed. Decay clocks on every corner count
 * down each household's grace. People here measure everything in halves, glow faintly at the
 * fingertips, and are very polite about it.
 */

const PRINCE = { prince: 'isotope' } as const;
const EMPRESS = { monarch: 'ohmrine' } as const;

export const Q_LEAD = 'halflife-q-lead-roof';
export const Q_GAR = 'halflife-q-gar-broth';
export const Q_CLOCKS = 'halflife-q-wind-back';
export const Q_TICKET = 'halflife-q-hot-ticket';
export const Q_DOME = 'halflife-q-dome';

export const HALFLIFE_NPCS: NpcDef[] = [
  // ── Ada Becquerel — the shop ─────────────────────────────────────────
  {
    id: 'halflife-becquerel',
    name: 'Ada Becquerel',
    title: 'Lead & Luckpieces',
    look: { body: 0xd8c8b0, accent: 0xffb02a, hat: 'hazmat', traits: ['apron', 'glasses', 'satchel'], size: 1, eye: 0x7dff5a },
    at: { x: 980, y: 990 },
    role: { kind: 'shop', id: 'halflife-shop' },
    talks: [
      {
        when: EMPRESS,
        lines: [
          'The Grid\'s cut. The dome\'s banked down to a simmer. And I have sold every lead charm I own as a keepsake.',
          'People want to keep the lead. Funny. We hated it. It\'s ours now, see. Nobody can recall it.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'His Highness sent down a cart of lead this morning. Every stripped roof in Leadrow. No tally, no note.',
          'Just "for the houses". I\'ve been selling lead to these people for twenty years. I wept on the cart.',
        ],
      },
      {
        when: { questDone: Q_LEAD },
        lines: [
          'Marrow Pewter\'s got her roof back on and she\'s sleeping under it. First time in a month.',
          'Bought her own nails off me. Paid in full. Wouldn\'t take a discount, the proud old thing.',
        ],
      },
      {
        lines: [
          'Lead and luckpieces, love. Lead to keep the glow in, luck for when the lead runs out.',
          'Here the Draw\'s paid in ore. A hod a house a night, weighed at the Tally before the Bell.',
          'Short, and His Highness recalls his lead. Your roof comes off. Then the glow gets in your bones.',
          'Charms are on the hooks — wear three. Pit-made, every one. They\'ll fight for you.',
        ],
      },
    ],
    barks: [
      { when: PRINCE, lines: ['Free lead! Well — paid for. Long ago.', 'Roofs going back on all down Leadrow!'] },
      { lines: ['Lead and luckpieces!', 'Badges read while you wait!', 'Glowcap in a jar, two coins!', 'Mind the hooks, they\'re hot.'] },
    ],
  },

  // ── Widow Marrow Pewter — the stripped roof ──────────────────────────
  {
    id: 'halflife-pewter',
    name: 'Marrow Pewter',
    title: 'Leadrow, Number Six',
    look: { body: 0xc8b8a8, accent: 0x5e6670, hat: 'hood', traits: ['cane', 'scarf'], size: 0.88, eye: 0x9aff7a },
    at: { x: 440, y: 1110 },
    talks: [
      {
        when: EMPRESS,
        lines: [
          'I slept with the shutters open last night. Open! There\'s nothing out there now but weather.',
          'Forty years under the Prince\'s lead. It\'s my lead now. I\'ve scratched my name in every sheet.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'They say he walks about without his gloves now. Shakes hands. Burns them a little and says sorry.',
          'I\'d shake his hand. I\'ve been burnt by worse and nobody ever said sorry.',
        ],
      },
      {
        when: { questDone: Q_LEAD },
        lines: [
          'Roof\'s on. Nailed down. I lie in bed and I can\'t see the storm through the rafters any more.',
          'My hands have stopped glowing. Look. Well. Mostly stopped. Thank you, dear.',
        ],
      },
      {
        when: { quest: Q_LEAD },
        lines: [
          'The neighbours hid my sheets about the row when the recall came. Behind the houses, under the steps.',
          'Bring them to Clerk Gauss at the Tally House. She\'ll have to write me back in good standing.',
        ],
      },
      {
        lines: [
          'That\'s mine, the house with no roof. Number Six. My Edwin was earthed in the spring. Three times short.',
          'Without him I can\'t lift a hod. So the Prince recalled the lead. Off it came, sheet by sheet.',
          'Now the glow gets in. You can see it on my hands at night. Pretty, isn\'t it. It doesn\'t feel pretty.',
        ],
      },
    ],
    barks: [
      { when: { questDone: Q_LEAD }, lines: ['Roof\'s on!', 'Dry as a cask.'] },
      { lines: ['You can see the storm through my ceiling.', 'Edwin always did the hod.', 'Glowing again. Hm.'] },
    ],
  },

  // ── Tobern Scrill — the pond fisher ──────────────────────────────────
  {
    id: 'halflife-tobern',
    name: 'Tobern Scrill',
    title: 'Pondside',
    look: { body: 0xb8a890, accent: 0x1f8a7a, hat: 'souwester', traits: ['rod', 'beard', 'pipe'], size: 1.1, eye: 0x6ff0d0 },
    at: { x: 1592, y: 1170 },
    talks: [
      {
        when: EMPRESS,
        lines: [
          'The pond\'s going clear. You can see the old rods on the bottom, all gone dull.',
          'The gar\'ll go dull too, in time. I\'ll miss the glow. That\'s a strange thing to say, isn\'t it.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The Prince came down to the kerb and sat. Took his gloves off and put his hands in the water.',
          'The gar came up round him like moths to a lamp. I\'ve never seen them do that for anyone.',
        ],
      },
      {
        when: { questDone: Q_GAR },
        lines: [
          'Nurse Fenn says the broth\'s working. The little Hodd boy\'s gone from green to grey. Grey\'s good!',
          'Cast where the water\'s bluest. Gar like it warm. Mind your rod — insulated, or you\'ll feel it.',
        ],
      },
      {
        lines: [
          'Coolant pond. Water off the dome runs through here to cool. Fish live in it. Glowing fish.',
          'Glow gar drink the glow, see. Out of the water, out of you. The Ward packs them on the sick.',
          'Can\'t fish it with any old stick. The water bites. You want an insulated rod — Terminus sells \'em.',
        ],
      },
    ],
    barks: [
      { lines: ['Bites like a live wire, the koi.', 'Warm today. Gar\'ll be up.', 'Don\'t drink it. Obviously.'] },
    ],
  },

  // ── Mabel Halloway — the clock-winder ────────────────────────────────
  {
    id: 'halflife-mabel',
    name: 'Mabel Halloway',
    title: 'Winder of the Decay Clocks',
    look: { body: 0xe0ccb4, accent: 0xffb02a, hat: 'tophat', traits: ['glasses', 'tool', 'satchel'], size: 0.95, eye: 0xffe08a },
    at: { x: 1350, y: 1000 },
    talks: [
      {
        when: EMPRESS,
        lines: [
          'I stopped every clock in the court this morning. Every one. On the half. They\'ll stay there.',
          'Nobody in Halflife is counting down to anything any more. I\'ve put my key on a string round my neck.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'His Highness asked me how long he has. He meant it. He\'s been glowing since he was six.',
          'I told him a decay clock never reaches nought. Each half takes as long as the whole. That cheered him.',
        ],
      },
      {
        when: { questDone: Q_CLOCKS },
        lines: [
          'Three households wound back a whole half. Three more months of grace. They don\'t know it was me.',
          'Varley\'s sulking in the Tally. Let him sulk. Clocks are mine. I wind them.',
        ],
      },
      {
        lines: [
          'Every corner has a decay clock, and every clock counts a household. The hand creeps toward nought.',
          'Each half takes as long as the whole before it. So it\'s always nearly there. That\'s the cruelty.',
          'When it gets there the house is short, and the lead comes off. I wind them. I\'m not proud of it.',
        ],
      },
    ],
    barks: [
      { lines: ['Half past nearly.', 'Tick. Tock. Halve.', 'Three-quarters gone, poor Kettles.', 'Who wound this one?'] },
    ],
  },

  // ── Linnet Hodd — the miner's daughter ───────────────────────────────
  {
    id: 'halflife-linnet',
    name: 'Linnet Hodd',
    title: 'The Hodd Household',
    look: { body: 0xd8bea4, accent: 0x7dff5a, hat: 'miner', traits: ['lantern', 'pack'], size: 0.72, eye: 0x7dff5a },
    at: { x: 380, y: 720 },
    talks: [
      {
        when: EMPRESS,
        lines: [
          'Da\'s coming DOWN. Down the Crown Coil. They\'re bringing all the earthed down tonight!',
          'I\'m going to meet him at the bottom. I\'ve got his badge. It still says he\'s hot. I\'m going to bin it.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'Nobody\'s reading badges at the pit-head. Nobody! The miners just come up and go home.',
          'Da would have liked that. Just coming up and going home.',
        ],
      },
      {
        when: { questDone: Q_TICKET },
        lines: [
          'Gauss read the slates out loud at the Tally. Da\'s count was honest. Every hod.',
          'Click got his counter broke and his ears boxed. Da\'s off the hot list. If he comes back, he can come home.',
        ],
      },
      {
        when: { quest: Q_TICKET },
        lines: [
          'Da kept his tallies on slates in the pit. Three of them, on the benches. Bring them up.',
          'If Click sees you with them he\'ll come for you. He can hear a slate scrape at a hundred yards.',
        ],
      },
      {
        lines: [
          'Counter Click read Da\'s badge at the pit-head and said HOT. Hot miners don\'t go home. Hot is short.',
          'Da\'s been switched off twice. Once more and he\'s earthed. Taken up the Coil to crank forever.',
          'But Da was never hot. Click clicks his counter when he wants. I know. I\'ve watched him.',
        ],
      },
    ],
    barks: [
      { when: { questDone: Q_TICKET }, lines: ['Honest count!', 'Da\'s off the list!'] },
      { lines: ['Click clicks when he likes.', 'Da\'s badge was COLD.', 'I can carry a hod. Half a hod.'] },
    ],
  },

  // ── Halvard Moss — the Prince's steward ──────────────────────────────
  {
    id: 'halflife-moss',
    name: 'Halvard Moss',
    title: 'Steward of the Dome',
    look: { body: 0xc4b8a8, accent: 0x3fb8ff, hat: 'hazmat', traits: ['book', 'apron'], size: 1.15, eye: 0x3fb8ff },
    at: { x: 1740, y: 500 },
    talks: [
      {
        when: EMPRESS,
        lines: [
          'The Grid is cut and the dome is banked. His Highness sleeps. Properly. Eight hours. I timed it.',
          'He used to sleep in halves. Four hours, two, one, a half. You can\'t imagine how that ends.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'His Highness is in the forecourt without his gloves. He has asked me to find him someone to hold hands with.',
          'I have volunteered. My hand has blistered. I have not let go.',
        ],
      },
      {
        when: { courtReady: 'halflife' },
        lines: [
          'All five of them. His Highness watched from the portholes. He says you are "very stable".',
          'From him that is a declaration of love. Or of war. With him I can never tell which.',
        ],
      },
      {
        lines: [
          'The Reactor Dome. His Highness Prince Isotope lives in it, governs from it, and very rarely leaves it.',
          'He does not like to be touched. He does not like anything that lasts. Please do not knock.',
          'If you wish an audience, you will have to be more interesting than his core. Few are.',
        ],
      },
    ],
    barks: [
      { lines: ['Do not knock.', 'His Highness is at half. Come back at a quarter.', 'Gloves on. Always gloves.'] },
    ],
  },

  // ── Nurse Ottilie Fenn — the Glow Ward ───────────────────────────────
  {
    id: 'halflife-fenn',
    name: 'Ottilie Fenn',
    title: 'Nurse of the Glow Ward',
    look: { body: 0xe8d8c4, accent: 0x4affc8, hat: 'veil', traits: ['apron', 'satchel'], size: 1, eye: 0x4affc8 },
    at: { x: 1350, y: 1162 },
    talks: [
      {
        when: EMPRESS,
        lines: [
          'Empty beds. Two of them. I don\'t remember the last time I had an empty bed.',
          'I\'m going to sit in one. Just for a minute. Wake me if anyone glows.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'He came to the Ward. Held every hand in it. Burnt every one, a little. They held on anyway.',
          'He was six when I first nursed him. He\'s never been held without somebody wincing. They didn\'t wince.',
        ],
      },
      {
        when: { questDone: Q_GAR },
        lines: [
          'The gar broth is doing what a doctor never could. The Hodd boy is GREY. Lovely, healthy grey.',
          'If you catch more gar, bring them. There\'s always someone glowing.',
        ],
      },
      {
        lines: [
          'The Glow Ward. Whoever\'s roof comes off ends up here sooner or later. Glowing at the fingertips first.',
          'Then the eyes. Then they stop needing a lamp to read by. That\'s when I worry.',
          'Lead keeps it out, and the Prince owns all the lead. So I make do with glowcap tea and gar.',
        ],
      },
    ],
    barks: [
      { lines: ['Fingers out, let me see.', 'Glowcap tea, three times a day.', 'You\'re a bit green. Sit.'] },
    ],
  },

  // ── Dimity Gauss — the Tally clerk ───────────────────────────────────
  {
    id: 'halflife-gauss',
    name: 'Dimity Gauss',
    title: 'Clerk of the Tally House',
    look: { body: 0xdcc8b0, accent: 0xc8763a, hat: 'antenna', traits: ['glasses', 'book'], size: 0.95, eye: 0xffb02a },
    at: { x: 900, y: 704 },
    talks: [
      {
        when: EMPRESS,
        lines: [
          'I have closed the Tally. Locked it. Posted the key down the main shaft. Nobody owes anybody a hod.',
          'I kept one book. The honest one. Somebody ought to know what was taken.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'His Highness has struck every household off the short list. Every one. In his own hand.',
          'His writing glows. You can read the list in the dark. I never noticed that before.',
        ],
      },
      {
        lines: [
          'Tally House. Hod on the pan, needle on the dial, figure in the book. Every household, every night.',
          'Short goes on the board in red. Red twice and you\'re switched off. Red three times, earthed.',
          'I write what the needle says. I\'d like to say I\'m only the clerk. The needle doesn\'t care either.',
        ],
      },
    ],
    barks: [
      { lines: ['Hod on the pan.', 'Next household.', 'Short. Sorry. Short.', 'Full measure, number nine!'] },
    ],
  },

  // ── Esk — the candlewife ─────────────────────────────────────────────
  {
    id: 'halflife-esk',
    name: 'Esk',
    title: 'Candlewife (Unlicensed)',
    look: { body: 0xc8a888, accent: 0xff6a2a, hat: 'headwrap', traits: ['lantern', 'scarf'], size: 0.9, eye: 0xffc070 },
    at: { x: 230, y: 1492 },
    talks: [
      {
        when: EMPRESS,
        lines: [
          'I put a candle in my window last night. In the WINDOW. Wren Filament walked past and saluted it.',
          'Flame\'s honest light. It burns what it burns and then it\'s done. Not like the glow.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The Prince saw my candle. He stopped and looked at it a long time. Then he said "it ends". And smiled.',
          'I\'ve never seen anyone smile at a thing ending. Not here.',
        ],
      },
      {
        lines: [
          'Psst. You. You\'ve got a stranger\'s face. Don\'t tell the Tally I\'m here.',
          'Flame\'s contraband on Voltreach. Theft from the Grid, they say. I make candles anyway. From pit tallow.',
          'In Halflife everything glows and nothing burns. A candle at least has the decency to go out.',
        ],
      },
    ],
    barks: [
      { lines: ['Candles. Shh.', 'Honest light, going cheap.', 'Wren was here last week. Don\'t ask.'] },
    ],
  },
];

// ── The crowd ─────────────────────────────────────────────────────────

const looks: NpcLook[] = [
  { body: 0xc8b8a4, accent: 0x5e6670, hat: 'miner', traits: ['apron', 'tool'] },
  { body: 0xd8c4ac, accent: 0x7dff5a, hat: 'hazmat', traits: ['apron'] },
  { body: 0xb8a088, accent: 0xffb02a, hat: 'miner', traits: ['pack', 'beard'], size: 1.15 },
  { body: 0xe0ccb4, accent: 0x4affc8, hat: 'hood', traits: ['scarf'] },
  { body: 0xc4ac94, accent: 0xc8763a, hat: 'cap', traits: ['satchel'], size: 0.76 },
  { body: 0xd4c0a8, accent: 0x3fb8ff, hat: 'antenna', traits: ['glasses'] },
  { body: 0xbca48c, accent: 0x5e6670, hat: 'hazmat', traits: ['apron', 'tool'], size: 1.1 },
  { body: 0xdcc8b0, accent: 0x7dff5a, hat: 'none', traits: ['lantern'], size: 0.72 },
];

const barks: Talk[] = [
  {
    when: EMPRESS,
    lines: [
      'They\'re bringing the earthed home!',
      'No Bell tonight. No Bell ever.',
      'My roof\'s mine now.',
      'I lit a candle. A real one.',
    ],
  },
  {
    when: PRINCE,
    lines: [
      'The Prince shook my hand! It\'s still tingling.',
      'Nobody\'s reading badges!',
      'Lead going back on all down the row.',
      'The dome\'s gone quiet.',
    ],
  },
  {
    when: { courtReady: 'halflife' },
    lines: [
      'Someone\'s beaten all five of his.',
      'The stranger\'s going in the dome.',
      'Nobody goes in the dome.',
    ],
  },
  {
    lines: [
      'Hod on the pan before the Bell.',
      'My badge is reading warm.',
      'Halve it and halve it again.',
      'Kettles\' roof came off.',
      'Gloves on.',
      'Mind the hot spot by the tubs.',
      'Is that you glowing or me?',
      'Nine nights to my clock.',
    ],
  },
];

export const HALFLIFE_CROWD: NonNullable<AreaDef['crowd']> = {
  count: 14,
  looks,
  paths: [
    // The Terminus road into the square and back.
    [{ x: 120, y: 800 }, { x: 520, y: 790 }, { x: 990, y: 810 }, { x: 520, y: 790 }],
    // Up the Ore Road and back.
    [{ x: 1200, y: 700 }, { x: 1200, y: 420 }, { x: 1200, y: 150 }, { x: 1200, y: 420 }],
    // Square to the dome.
    [{ x: 1300, y: 760 }, { x: 1560, y: 700 }, { x: 1720, y: 540 }, { x: 1560, y: 700 }],
    // Down Leadrow.
    [{ x: 140, y: 1230 }, { x: 600, y: 1230 }, { x: 1100, y: 1230 }, { x: 600, y: 1230 }],
    // Round the square.
    [{ x: 1010, y: 740 }, { x: 1300, y: 740 }, { x: 1300, y: 900 }, { x: 1010, y: 900 }],
    // Down to the gardens.
    [{ x: 1150, y: 1000 }, { x: 1150, y: 1230 }, { x: 1180, y: 1520 }, { x: 1150, y: 1230 }],
    // The pond lane to the cask yard.
    [{ x: 1300, y: 900 }, { x: 1640, y: 980 }, { x: 2130, y: 990 }, { x: 2130, y: 700 }, { x: 2130, y: 990 }, { x: 1640, y: 980 }],
  ],
  barks,
};
