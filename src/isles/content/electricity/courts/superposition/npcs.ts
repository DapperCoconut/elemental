import type { AreaDef, NpcDef, NpcLook, Talk } from '../../../../IslesTypes';

/**
 * The people of the Superposition Court.
 *
 * The highest court on Voltreach, under the Crown Coil itself, and the strangest: every house here
 * is in two states until somebody looks, so every house is metered twice and owes the Draw on
 * both. A meter that has not been read is read as short. People here talk in *maybes* and *boths*
 * without noticing, keep their lights in two minds, and are very polite about boxes. The earthed
 * go up the Coil from here, past everyone's windows, which is why nobody on the Coil road looks out.
 */

const PRINCE = { prince: 'both' } as const;
const EMPRESS = { monarch: 'ohmrine' } as const;

const Q_OFF = 'superposition-q-both-off';
const Q_CAT = 'superposition-q-cat-crate';
const Q_FISH = 'superposition-q-probably-perch';
const Q_TWICE = 'superposition-q-twice';
const Q_COLLAPSE = 'superposition-q-collapse';

export const SUPERPOSITION_NPCS: NpcDef[] = [
  // ── Ottilie Eigen — the shop ─────────────────────────────────────────
  {
    id: 'superposition-eigen',
    name: 'Ottilie Eigen',
    title: 'Eigenstates & Sundries',
    look: { body: 0xd8c4b0, accent: 0x9a6cff, hat: 'tophat', traits: ['glasses', 'apron', 'satchel'], size: 1 },
    at: { x: 1450, y: 1250 },
    role: { kind: 'shop', id: 'superposition-shop' },
    talks: [
      {
        when: EMPRESS,
        lines: [
          'The Grid\'s cut and every house on the hill has picked a state. Just one! On their own! It\'s chaos.',
          'Lovely chaos. The charms still work both ways. I checked. Twice.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The Prince came down to the square and bought a candle. A candle! He held it and it was only lit.',
          'Not lit-and-not. Only lit. He looked so pleased. I gave it him for nothing.',
        ],
      },
      {
        when: { questDone: Q_CAT },
        lines: [
          'Quill\'s cat came in this morning and sat on my counter. Decidedly. One cat, entirely present.',
          'Felis has stopped boxing pets. I\'ve stopped selling her the straps. We all meet in the middle.',
        ],
      },
      {
        lines: [
          'Eigenstates and sundries, my dear. Everything on the shelf is two things until you buy it.',
          'Then it\'s one, and it\'s yours, and I can\'t take it back, because the other one\'s gone.',
          'The Draw, here, is metered twice: once for each state of your house. You pay on both.',
          'Charms are in the top drawers — the open ones. Also the shut ones. You can wear three.',
        ],
      },
    ],
    barks: [
      { when: PRINCE, lines: ['Candles! Single-state candles!', 'Everything half price — the other half is free!'] },
      {
        lines: [
          'Locket, dial, coin or lens!', 'Two of everything, one at a time.', 'Mind the drawers — both of them.',
          'Bought is decided, dear.',
        ],
      },
    ],
  },

  // ── Hesper Ket — the household both switched off and not ─────────────
  {
    id: 'superposition-hesper',
    name: 'Hesper Ket',
    title: 'Number Three, Lower Either Row',
    look: { body: 0xe0c8b4, accent: 0x3fd8e8, hat: 'hood', traits: ['scarf', 'cane'], size: 0.92 },
    at: { x: 620, y: 1690 },
    talks: [
      {
        when: EMPRESS,
        lines: [
          'I took the meter off my wall with a bread knife. Both needles. I\'m using it as a clock. It\'s always teatime.',
          'My grandsons are down from the Galleries. Both of them, and both of them are definitely home.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The Prince yielded, they say, and he\'s only one of himself now. I hope it doesn\'t hurt.',
          'My lights came on this morning and stayed on. Only on. I sat and looked at them for an hour.',
        ],
      },
      {
        when: { questDone: Q_OFF },
        lines: [
          'Read as paid. PAID. The needle went the right way while you watched it and it stayed there.',
          'I can open my own front door. You don\'t know what that is till it\'s been locked from the wall.',
        ],
      },
      {
        when: { quest: Q_OFF },
        lines: [
          'Probst is at the board. He\'ll tell you it\'s nothing personal. It never is, with meters.',
          'If you watch the meter at the Bell, he says, it has to pick. If it picks short, I\'m switched off.',
        ],
      },
      {
        lines: [
          'My house is switched off and it isn\'t. Look — the door-lock light: red, and also green.',
          'I cranked the full Draw. In this state. In the other state, they say I\'m short. Nobody can tell.',
          'Twice switched off already. Three times and you\'re earthed. Up the Coil, to the Galleries.',
        ],
      },
    ],
    barks: [
      { when: { questDone: Q_OFF }, lines: ['Read as paid!', 'My door, my key, my lock.'] },
      { lines: ['Red and green. Red and green.', 'I cranked it. I did.', 'Twice switched off.'] },
    ],
  },

  // ── Meterman Probst — reads the Draw ─────────────────────────────────
  {
    id: 'superposition-probst',
    name: 'Meterman Probst',
    title: 'Reader of the Draw',
    look: { body: 0xc8bca8, accent: 0xc0703a, hat: 'cap', traits: ['book', 'satchel', 'glasses'], size: 1.1 },
    at: { x: 960, y: 1600 },
    talks: [
      {
        when: EMPRESS,
        lines: [
          'No more readings. They took the board for firewood. FIREWOOD. Somebody lit a fire. In the street.',
          'I stood and warmed my hands at it. Forty years a meterman. It was very warm.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The Prince sent down: all meters to be read once only, in whichever state they\'re in.',
          'Halves my round. I don\'t know what to do with my afternoons. I\'ve started looking at things.',
        ],
      },
      {
        when: { questDone: Q_OFF },
        lines: [
          'Number Three read as paid, at the Bell, observed. Can\'t argue with observed. That\'s the whole rule.',
          'The Auditor was very cross. I wrote "observed" very neatly. Twice.',
        ],
      },
      {
        lines: [
          'Two columns on the board: one for each state of every house. Owed on both, paid on both.',
          'An unread meter is read as short. Not my rule. The Grid\'s rule. I just carry the chalk.',
          'The Brownout Bell is when they pick, if anyone\'s looking. Mostly nobody\'s looking. So: short.',
        ],
      },
    ],
    barks: [
      { lines: ['Two columns, two readings.', 'Unread is short.', 'Not personal. Never personal.', 'Chalk and meter.'] },
    ],
  },

  // ── Quill — the child whose cat was boxed ────────────────────────────
  {
    id: 'superposition-quill',
    name: 'Quill',
    title: 'Owner of a Cat (Possibly)',
    look: { body: 0xe8d0b8, accent: 0xf2b85a, hat: 'beanie', traits: ['scarf'], size: 0.7 },
    at: { x: 620, y: 1120 },
    wander: 24,
    talks: [
      {
        when: EMPRESS,
        lines: [
          'Pounce sleeps on the meter now. It\'s warm because it doesn\'t do anything any more.',
          'Felis lets me help unbox the old boxes. Most of them are candles. One was a whole birthday.',
        ],
      },
      {
        when: { questDone: Q_CAT },
        lines: [
          'POUNCE. He\'s only one cat. He was always only one cat. I KNEW it.',
          'He bit Felis on the way out. I said sorry. I didn\'t mean it, and I said that too.',
        ],
      },
      {
        when: { quest: Q_CAT },
        lines: [
          'Tamsin builds all the boxes. She\'ll know which ones have air holes. Cats need air holes.',
          'Don\'t open any where Felis can see. She says it makes them the bad thing. I believe her.',
        ],
      },
      {
        lines: [
          'The Box Wardens took Pounce. He was on the meter when they read it, so he went in the box with it.',
          'Undecided goods, they said. Is he in there or isn\'t he. I said HE IS. They said: maybe.',
          'I\'m not allowed to open the boxes. Grown-ups get switched off for it. I\'m only small.',
        ],
      },
    ],
    barks: [
      { when: { questDone: Q_CAT }, lines: ['Pounce! Here, Pounce!', 'One cat. ONE.'] },
      { lines: ['He IS in there.', 'Pounce?', 'Cats need air holes.'] },
    ],
  },

  // ── Tamsin Hollow — the crate-wright ─────────────────────────────────
  {
    id: 'superposition-tamsin',
    name: 'Tamsin Hollow',
    title: 'Crate-Wright to the Grid',
    look: { body: 0xc8a888, accent: 0xb89a6a, hat: 'bandana', traits: ['apron', 'tool', 'beard'], size: 1.15 },
    at: { x: 300, y: 830 },
    talks: [
      {
        when: EMPRESS,
        lines: [
          'I\'m making shelves now. Open ones. You put a thing on a shelf and everyone can see it. Radical.',
          'Last box I ever nailed shut, I nailed it shut on the Auditor\'s ledger. Felt right.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'No more sealing orders from the House. I\'ve forty crates half-built. Firewood, I think. Shh.',
        ],
      },
      {
        when: { questDone: Q_CAT },
        lines: [
          'The air-hole crates — I\'ve been drilling them twice as big for years. In case. Nobody checked.',
          'I don\'t make boxes for living things now. I told Felis. She said she\'d never asked me to. Liar.',
        ],
      },
      {
        lines: [
          'Every box in the yard is mine. Deal planks, two straps, the Grid\'s wax. Sealed undecided.',
          'Candles go in them. Letters. Lamps that might be lit. Anything the Grid can\'t bill till it\'s one thing.',
          'Felis keeps the keys and the ledger. She opens them for the Prince, in front of the right people.',
        ],
      },
    ],
    barks: [
      { lines: ['Two straps, one seal.', 'Mind the nails.', 'Deal wood, dry and true.', 'Sealed is safe. Supposedly.'] },
    ],
  },

  // ── Fennick Lowe — the Well-Warden ───────────────────────────────────
  {
    id: 'superposition-fennick',
    name: 'Fennick Lowe',
    title: 'Warden of the Quantum Well',
    look: { body: 0xb8b0a8, accent: 0x2a1a52, hat: 'souwester', traits: ['rod', 'pipe', 'beard'], size: 1.05 },
    at: { x: 740, y: 1290 },
    talks: [
      {
        when: EMPRESS,
        lines: [
          'The well\'s only one colour now. Purple. Just purple. The fish are confused and so am I.',
          'Bring your insulated rod. They\'re biting both ways, out of habit.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'He used to come and sit on the rim as a boy, when they let him out of the box. Never said much.',
          'Said he liked the well because nobody could tell what was in it. I\'d say "fish". He\'d laugh.',
        ],
      },
      {
        when: { questDone: Q_FISH },
        lines: [
          'Hesper ate both perch and said they were the best she\'s had, and also the only ones. Both true.',
          'The Odds-Clerk hasn\'t been back. I think he couldn\'t work out the odds of you.',
        ],
      },
      {
        when: { quest: Q_FISH },
        lines: [
          'Probability perch — striped little things, bite when they\'re likely to. Cast and wait.',
          'Then take them to Hesper Ket on the Row. Her house is switched off. No heat but her own.',
        ],
      },
      {
        lines: [
          'The Quantum Well. Water from under the Coil. Charged, and in two minds. You\'ll want insulation.',
          'Insulated rod, sold down in Terminus. Anything else and the line\'s live, and so are you.',
          'Sprat, perch, and the eels that come in pairs. Catch one, someone somewhere feels the other bite.',
        ],
      },
    ],
    barks: [
      { lines: ['Mind the rim, it\'s live.', 'Both ripples. Always both.', 'Bite, or don\'t. Your choice.', 'Insulated rods only.'] },
    ],
  },

  // ── Ambrose Twice — the man who is two men ───────────────────────────
  {
    id: 'superposition-ambrose',
    name: 'Ambrose Twice',
    title: 'Number Nine, the Watched Street',
    look: { body: 0xd4c0a8, accent: 0x9a6cff, hat: 'cap', traits: ['pipe', 'glasses'], size: 1 },
    at: { x: 480, y: 490 },
    talks: [
      {
        when: EMPRESS,
        lines: [
          'The other one of me and I have bought a house each. Next door to each other. We wave.',
          'It\'s very restful, being a different person from myself.',
        ],
      },
      {
        when: { questDone: Q_TWICE },
        lines: [
          'The census says: Ambrose Twice, two persons, both resident. In ink. Hora signed it herself.',
          'Neither of us is going up the Coil. We had a little drink about it. Two little drinks.',
        ],
      },
      {
        when: { quest: Q_TWICE },
        lines: [
          'The other one of me is down at the Twin Squares. I can\'t go — if we stand together we cancel.',
          'Tell him the census post is up. He\'ll know what that means. He always knows what I\'d know.',
        ],
      },
      {
        lines: [
          'I was switched off three times. Or I was twice and he was once. Or the other way about.',
          'Ambrose Twice, that\'s me. Both of me. When the Observatory looked away one night, I came out double.',
          'The census will take one of us up the Coil to be earthed. Neither of us can work out which.',
        ],
      },
    ],
    barks: [
      { lines: ['Is he still down there?', 'I said that. Or he did.', 'One of me is earthed. Possibly.'] },
    ],
  },

  // ── Ambrose Twice (the other one) ────────────────────────────────────
  {
    id: 'superposition-ambrose-other',
    name: 'Ambrose Twice',
    title: 'Also Number Nine, the Watched Street',
    look: { body: 0xd4c0a8, accent: 0x3fd8e8, hat: 'cap', traits: ['pipe', 'glasses'], size: 1 },
    at: { x: 2120, y: 1340 },
    talks: [
      {
        when: EMPRESS,
        lines: [
          'I\'ve grown a beard so people can tell us apart. He\'s grown one too. We are hopeless.',
        ],
      },
      {
        when: { questDone: Q_TWICE },
        lines: [
          'Both resident! In ink! I\'ve never been anything in ink. Now I\'m half of something in ink.',
        ],
      },
      {
        when: { quest: Q_TWICE },
        lines: [
          'He sent you? Of course he did. I\'d have sent you. The census post is up, is it.',
          'Then Hora Tally is coming. She counts everything at one time, so nobody can be two.',
          'Go and stand at the post. She\'ll come to you. She can\'t bear a stranger near her figures.',
        ],
      },
      {
        lines: [
          'You\'ve met me? Up on the Watched Street? That\'s me. Not me. Me.',
          'I stand on the Twin Squares because here there\'s two of everything and nobody counts.',
        ],
      },
    ],
    barks: [
      { lines: ['Is he still up there?', 'He said that. Or I did.', 'Twice the man. Half the Draw.'] },
    ],
  },

  // ── Steward Either Orr — the Prince's steward ────────────────────────
  {
    id: 'superposition-orr',
    name: 'Either Orr',
    title: 'Steward of the House of Both',
    look: { body: 0xe0d0c0, accent: 0x8a5cf0, hat: 'tophat', traits: ['book', 'cane'], size: 1.05, eye: 0xd8c8ff },
    at: { x: 1640, y: 520 },
    talks: [
      {
        when: EMPRESS,
        lines: [
          'His Highness has gone up the Coil to help bring the earthed down. Personally. Only one of him.',
          'I have changed my name. I am simply Orr now. The Either felt like a hedge.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'He is sitting in the left half of the house today. Only the left half. He says it\'s very quiet.',
          'He asked me for a cup of tea and I brought one cup. He didn\'t send it back. Thank you.',
        ],
      },
      {
        when: { quest: Q_COLLAPSE },
        lines: [
          'Fennick, then the door of the Coil. Then come back to the step and knock. Once, please.',
        ],
      },
      {
        lines: [
          'The House of Both. His Highness is in. And out. One of the two is receiving.',
          'He is gentle, you should know. He thinks owing on both states is the fairest thing in the world.',
          'He has never been one thing, you see. He doesn\'t know what one thing costs.',
        ],
      },
    ],
    barks: [
      { lines: ['Receiving, and not receiving.', 'Mind the seam.', 'His Highness is in two minds.'] },
    ],
  },
];

const looks: NpcLook[] = [
  { body: 0xd0bca8, accent: 0x9a6cff, hat: 'cap', traits: ['satchel'] },
  { body: 0xe0c8b4, accent: 0xe04ab8, hat: 'hood', traits: ['scarf'] },
  { body: 0xc4a890, accent: 0x3fd8e8, hat: 'antenna', traits: ['tool'] },
  { body: 0xd8c0a8, accent: 0xc0703a, hat: 'beanie', traits: ['pack'], size: 0.76 },
  { body: 0xb89c84, accent: 0x2a2a32, hat: 'tophat', traits: ['cane', 'glasses'], size: 1.1 },
  { body: 0xe4d0bc, accent: 0xcfa94e, hat: 'bandana', traits: ['apron'] },
  { body: 0xc8b49c, accent: 0x45297e, hat: 'goggles', traits: ['book'] },
  { body: 0xdcc4ac, accent: 0x7af0ff, hat: 'none', traits: ['lantern'], size: 0.8 },
];

const barks: Talk[] = [
  {
    when: EMPRESS,
    lines: [
      'My lights are only on!',
      'The Coil\'s gone dark.',
      'I\'m just the one me now.',
      'Somebody lit a candle and nobody billed it!',
    ],
  },
  {
    when: PRINCE,
    lines: [
      'The Prince yielded — both of him!',
      'Read once. Only once!',
      'He bought a candle, they say.',
      'The House is only one house today.',
    ],
  },
  {
    when: { courtReady: 'superposition' },
    lines: [
      'All five of the House\'s keepers beaten!',
      'The stranger\'s going up to the House of Both.',
    ],
  },
  {
    lines: [
      'Switched off and not.',
      'Don\'t look at the boxes.',
      'Was that me? Or the other me?',
      'Two columns. Two readings.',
      'The Bell\'s soon.',
      'Mind the Coil road.',
      'Unread is short.',
      'Maybe. Maybe not. Both.',
    ],
  },
];

export const SUPERPOSITION_CROWD: NonNullable<AreaDef['crowd']> = {
  count: 14,
  looks,
  paths: [
    // Up from the Row through either slit to the square, and back.
    [{ x: 1200, y: 1700 }, { x: 1105, y: 1560 }, { x: 1105, y: 1420 }, { x: 1200, y: 1250 }, { x: 1295, y: 1420 }, { x: 1295, y: 1560 }],
    // Along Lower Either Row.
    [{ x: 160, y: 1710 }, { x: 1000, y: 1710 }, { x: 1400, y: 1710 }, { x: 2260, y: 1710 }],
    [{ x: 2260, y: 1710 }, { x: 1400, y: 1710 }, { x: 1000, y: 1710 }, { x: 160, y: 1710 }],
    // Round Either Square.
    [{ x: 990, y: 980 }, { x: 1200, y: 1130 }, { x: 1410, y: 980 }, { x: 1200, y: 860 }],
    // The Watched Street.
    [{ x: 180, y: 485 }, { x: 1000, y: 485 }, { x: 180, y: 485 }],
    // Square to the Twin Squares and back.
    [{ x: 1410, y: 1000 }, { x: 1640, y: 1180 }, { x: 2060, y: 1180 }, { x: 1640, y: 1180 }],
    // Up the Coil road, eyes down.
    [{ x: 1200, y: 860 }, { x: 1200, y: 300 }, { x: 1200, y: 860 }],
  ],
  barks,
};
