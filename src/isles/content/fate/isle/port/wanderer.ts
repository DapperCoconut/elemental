import type { Cond, Talk, WandererDef } from '../../../../IslesTypes';

/**
 * Marlo Fairshake — Lotterhaven's wanderer. A card-sharp, the best on the isle once, who went up to
 * the House to wager a re-draw and was cheated out of everything she had, including two years of
 * hours (she lost them in an afternoon; she woke up with grey in her hair). Now she plays only
 * honest games, on an upturned crate, for buttons, and wins most of them, and gives the buttons
 * back. Long coat, cards up both sleeves, a cracked monocle, and a Lot on her chain that she says is
 * a forgery. Her magpie Tuppence steals shiny things off the House's informers and drops them at
 * her feet; Marlo returns them, by post, with a note.
 *
 * She is the isle's narrator: the tutorial nudges (the Lot and the Draw, gilded and lethe fishing,
 * the fortune rod, the Outer Sea), gossip about every prince, a reaction to each court freed — and
 * her own story, which only moves once the King falls. The drum is broken open in Tosswater and has
 * a false bottom full of the favourites' Lots. In the House's counting-room she finds the Book of
 * Numbers, every busted number beside the name it took — her own among them: the forged Lot was to
 * hide a black chip. She runs the last Draw in the square, where every number wins, and what it wins
 * is its owner's name, read aloud. The black chips are melted into a bell.
 *
 * Blocks are listed most specific first. Once the King falls, her arc is a chain of flags
 * (`marlo-draw-1` … `marlo-draw-4`) and each link holds on its own, so the next step always plays
 * next. Steps 2 and 4 play only in Tosswater, step 3 only in the House.
 */

const KING: Cond = { monarch: 'lucan' };
/** True only before the King falls — keeps the old lines out of the rotation once he is down. */
const pre = (c: Cond): Cond => ({ all: [c, { not: KING }] });
const princes = (count: number): Cond => ({ princesOfIsle: 'fate', count });
const draw = (n: number): Cond => ({ flag: `marlo-draw-${n}` });
const between = (a: number, b: number): Cond => ({ all: [draw(a), { not: draw(b) }] });

// ── The last Draw (after the King) ──────────────────────────────────

/** Step 1 — anywhere: the House has fallen, and the drum is coming down to the square. */
const ARC_OPEN: Talk = {
  when: { all: [KING, { not: draw(1) }] },
  sets: 'marlo-draw-1',
  lines: [
    'Lucan is down. The Croupier-King, flat on his own baize. Tuppence brought me one of his cufflinks. Look.',
    'And they are going to open the drum. In Tosswater, in the square, in front of everybody. At noon.',
    'Twenty years I have said it was rigged. Twenty years I have been right with no way to show it.',
    'I want to be there when the lid comes off. I want to see their faces. I want to see mine, honestly.',
    'Walk down to Tosswater with me? The Draw Square. Tuppence is already there. She has a good spot.',
  ],
};

/** Step 2 — Tosswater: the drum is opened, and it has a false bottom. */
const ARC_BOTTOM: Talk = {
  when: between(1, 2),
  sets: 'marlo-draw-2',
  lines: [
    'Felix has the crowbar. Felix, who turned it for twenty-two years. His hands are shaking. Mine would.',
    'There. The lid. Four thousand Lots, tumbling about like they always — and a second floor under them.',
    'A false bottom, on a hinge, with a brass comb across it. The notched Lots fall through the comb. Down there.',
    'A drawer full. Fitch-Vane. Goldwater. Pellington. Every favourite on the isle, safe in the dark, never drawn.',
    'Nobody is shouting. I thought they would shout. They are just looking. Agatha has started to cry.',
    'Tuppence has gone to the House. She says there is something shiny in the counting-room. I believe her.',
  ],
};

/** Step 3 — the House: the Book of Numbers, and Marlo's own number in it. */
const ARC_LEDGER: Talk = {
  when: between(2, 3),
  sets: 'marlo-draw-3',
  lines: [
    'The counting-room. Tuppence is sitting on it. A book the size of a door, bound in green baize.',
    'The Book of Numbers. Every busted soul on the isle: the number they wear, and the name the House took.',
    'Four-Four-One-Seven — Rosalind Merriweather. Two-Two-Eight-Six... no, he was drawn, not busted. Here. Here.',
    'Oh-Nine-Oh-Nine. Marlo Fairshake. ...Yes. Well. You had to find out somewhere. It might as well be here.',
    'I lost my name at this table, twenty years back. They hung a black chip on me. I ran before they numbered me.',
    'The Lot on my chain is a forgery. Not to cheat the Draw. To hide the chip. I have been hiding it ever since.',
    'Help me carry the book down to Tosswater. Everybody in it is going to hear their name. Me last.',
  ],
};

/** Step 4 — Tosswater: the last Draw, where every number wins its name. */
const ARC_LAST_DRAW: Talk = {
  when: between(3, 4),
  sets: 'marlo-draw-4',
  lines: [
    'Right. The last Draw. My crate, the book, and every black chip in Tosswater lined up round the square.',
    'Felix turns the drum. Out comes a number, and I read it — and then I read what it wins. Its name.',
    'Four-Four-One-Seven. ...Rosalind Merriweather. — Look at her. She did not know it. Hetty is holding her up.',
    'Three hundred and eleven names. Every number wins. That is how a draw ought to work, if you ask me.',
    'And the last one. Oh-Nine-Oh-Nine. ...Marlo Fairshake. — There. I said it out loud. In the square.',
    'Tuppence has taken my chip. Took it right off the chain. She is giving it to the smith. Good bird.',
  ],
};

/** Step 5 — after: the bell. Tosswater has the long version; elsewhere, a line about it. */
const ARC_BELL: Talk = {
  when: draw(4),
  lines: [
    'They melted the black chips down — three hundred and eleven of them — and cast a bell. It hangs in the tower.',
    'Felix rings it. Not for the Draw. There is no Draw. He rings it whenever anybody asks. People ask a lot.',
    'I still play on my crate. Honest games, for buttons. I lose more now. I think my hands have stopped hiding.',
    'The forged Lot is in the harbour. Tuppence dropped it in off the Kiosk Pier. She was very firm about it.',
    'Thank you. For the drum and the book and the walking. A card-sharp does not say that. Marlo Fairshake does.',
  ],
};

/** Anywhere but Tosswater, between the King and the opening of the drum. */
const NUDGE_SQUARE: Talk = {
  when: between(1, 2),
  lines: [
    'Noon, in the Draw Square, in Tosswater. The drum. I do not want to miss it, and I do not want to go alone.',
    'Tuppence has been sitting on the drum since dawn. Nobody can shift her. Walk down with me?',
  ],
};

/** Anywhere but the House, once the drum is open and before the book is found. */
const NUDGE_HOUSE: Talk = {
  when: between(2, 3),
  lines: [
    'Tuppence is up in the House, in the counting-room, shrieking at something. She does not shriek for nothing.',
    'North, through the War Court, and in at the cellar door. It is open now. Everything up there is open.',
  ],
};

/** Anywhere but Tosswater, once the book is found and before the last Draw. */
const NUDGE_DRAW: Talk = {
  when: between(3, 4),
  lines: [
    'The book is in Tosswater, on my crate, in the square. Three hundred and eleven names to read.',
    'I keep finding reasons to be somewhere else. My own name is in it. Walk me back? I want to read it.',
  ],
};

export const MARLO: WandererDef = {
  id: 'fate-wanderer-marlo',
  name: 'Marlo Fairshake',
  title: 'Honest Card-Sharp, with Tuppence',
  look: {
    body: 0xc8a890, accent: 0x2a2430, hand: 0xe8e0d0, hat: 'tophat',
    traits: ['glasses', 'scarf', 'satchel'], size: 1.0, eye: 0xf0d890,
  },

  byArea: {
    // ── Tosswater ───────────────────────────────────────────────────
    tosswater: [
      ARC_OPEN, ARC_BOTTOM, NUDGE_HOUSE, ARC_LAST_DRAW, ARC_BELL,
      {
        when: pre(princes(6)),
        lines: [
          'Six princes. The House door on the War Court summit is open. Lucan is up there, dealing to himself.',
          'Roulette Floor, Dice Stair, Card Gallery, then the High Table. Each hall ends in a warden.',
          'Eat at the Lucky Loaf before you go. Hetty\'s Jackpot Steak, if you can catch the marlin for it.',
        ],
      },
      {
        when: pre(princes(3)),
        lines: [
          'Half the courts! Felix turned the drum slow last week. Three numbers came up that never come up.',
          'People are wearing their Lots outside their shirts. Like a dare. Tuppence approves of the shine.',
          'If Felix asks you to count something for him, count it. He has been counting for twenty-two years.',
        ],
      },
      {
        when: pre({ prince: 'ante' }),
        lines: [
          'Ante is down! The Card Court prince. He dealt himself aces from a deck he printed. I watched him once.',
          'Five more. West to the mint, east to the mentalists. Or north, through the cards, to the clocks and the war.',
          'The Card Court\'s baize pond fishes kindly now. Driftwood rod. Aces bite on anything.',
        ],
      },
      {
        when: pre({ questDone: 'tosswater-berth-lottery' }),
        lines: [
          'Berth nought! Tuppence brought me Capstan\'s hook. I am sending it back to him by post, with a note.',
          'Touch the waystone by the landing if you have not. M opens the isle map; you can walk the roads in a blink.',
          'Silas at the Long Shot sells the fortune rod. Dear. The only thing on the isle that fishes gold and Lethe.',
        ],
      },
      {
        when: pre({ flag: 'marlo-met' }),
        lines: [
          'Still in Tosswater? It is a good town. Loud, kind, and frightened of a drum. Most towns are, here.',
          'North up the hill is the Card Court. West is the mint. East is the mind-readers. Mind your thoughts.',
          'Fish off either pier. Lotfish for learning. Silas will sell you a rod; Hetty will bake what you catch.',
          'A meal lasts one fight. A charm lasts for ever. Equip three. Pick ones that play well at the same table.',
        ],
      },
      {
        when: { all: [{ not: { flag: 'marlo-met' } }, { not: KING }] },
        sets: 'marlo-met',
        lines: [
          'Pick a card. Any card. — Seven of clubs. Yes? Good. It was up my left sleeve. I am telling you that.',
          'Marlo Fairshake. Honest games, for buttons. This is Tuppence. Do not leave anything shiny near her.',
          'You came in over the Outer Sea. This is Lotterhaven. Everything here is drawn by lot. Everything.',
          'See the brass on everybody\'s chain? That is their Lot. Every child gets one at birth. A number for life.',
          'Each week the drum turns and the numbers go up. The drawn go to war, or pay. Go and see the board.',
          'Walk up to anyone and press E. Barnaby at the slip first. TAB is your pack. Look for the magpie.',
        ],
      },
    ],

    // ── The Card Court ──────────────────────────────────────────────
    card: [
      ARC_OPEN, NUDGE_SQUARE, NUDGE_HOUSE, NUDGE_DRAW,
      { when: draw(4), lines: [
        'The card-houses are just houses now. Nobody has to keep them standing for a prince. Some fell down. Fine.',
        'Ante is teaching children to shuffle. Honestly. He is very bad at honestly. They are teaching him back.',
      ] },
      {
        when: pre({ prince: 'ante' }),
        lines: [
          'You beat Ante. Lucky child number one. He dealt the Card Court for the King and never lost a hand.',
          'His deck is on the floor of the Dealing Hall. Tuppence went through it. Fifty-two aces. Fifty-two.',
          'The baize pond fishes now — aces and spades. A driftwood rod will do. Tuppence likes the aces.',
        ],
      },
      {
        when: pre({ courtReady: 'card' }),
        lines: [
          'Five champions down. Ante will come out of the Dealing Hall. He deals first: cards stuck in the floor.',
          'They flip to show their suit, and the suit is what they do. Spades cut. Hearts heal him. Diamonds burst.',
          'Then he rolls dice the size of carts. Count the pips. That many shots. Every time. He cannot help it.',
        ],
      },
      {
        when: pre({ flag: 'marlo-card' }),
        lines: [
          'Every champion here plays a rule — a deck to cut, a house to topple, tarot underfoot. Read the fight card.',
          'Lose and you wake where you stood, a little poorer. Win and the court pays. Coin buys charms.',
          'The Fortune Cookie bakes up here. Ask for your fortune. It is always good. That is the trick.',
        ],
      },
      {
        sets: 'marlo-card',
        when: { all: [{ not: { flag: 'marlo-card' } }, { not: KING }] },
        lines: [
          'The Card Court. I learned to deal here, on that lawn, under that lamp. I was very good. Too good.',
          'The houses are built of cards. Real cards, the size of doors. Paperweights on the roofs for the wind.',
          'Prince Ante keeps it. Lucky child number one. Five champions guard him. Beat them and he deals.',
        ],
      },
    ],

    // ── The Treasury Court ──────────────────────────────────────────
    treasury: [
      ARC_OPEN, NUDGE_SQUARE, NUDGE_HOUSE, NUDGE_DRAW,
      { when: draw(4), lines: [
        'The vault is open. People are walking in and taking out exactly what the Wager-Tithe took. Exactly.',
        'Bullion is keeping the books for them. Honest books. He says it is the hardest work he has ever done.',
      ] },
      {
        when: pre({ prince: 'bullion' }),
        lines: [
          'Bullion is down! The mint prince. He weighed every coin and clipped every one, for thirty years.',
          'The presses have stopped. The quiet up there is enormous. Tuppence cannot cope with so much gold.',
          'The gilded pool fishes now. The fortune rod only — gold water eats any other line in an afternoon.',
        ],
      },
      {
        when: pre({ courtReady: 'treasury' }),
        lines: [
          'Five down. Bullion tosses coins first — watch the shadows. Heads bursts. Tails leaves a pool of gold.',
          'Then he gilds himself. Gold from the front, nothing gets through. Get round him. The gilt flakes behind.',
          'A rich man never looks behind him. Bullion has never once looked behind him.',
        ],
      },
      {
        when: pre({ flag: 'marlo-treasury' }),
        lines: [
          'Every champion here plays a rule. Presses, ledgers, tolls, scales. The fight card says which.',
          'The gilded pool under the mint is where the spill settles. Fortune rod, from Silas. Gold fish.',
          'Mind the toll bridge. It costs. Everything up here costs. Even standing still costs a little.',
        ],
      },
      {
        sets: 'marlo-treasury',
        when: { all: [{ not: { flag: 'marlo-treasury' } }, { not: KING }] },
        lines: [
          'The Treasury Court. The King\'s mint. Listen to the presses — thump, thump — like a heart with money in.',
          'The Wager-Tithe comes here. Every stake the House wins. The vault is the size of a hill. It is a hill.',
          'Prince Bullion keeps it. Five champions. Tuppence wants everything in this court. I have her on a string.',
        ],
      },
    ],

    // ── The Clockwork Court ─────────────────────────────────────────
    clockwork: [
      ARC_OPEN, NUDGE_SQUARE, NUDGE_HOUSE, NUDGE_DRAW,
      { when: draw(4), lines: [
        'The Hour Office is giving hours back. Not all of them. They cannot. But they are trying, by the minute.',
        'I asked for mine. Two years. They gave me a receipt. It is the most honest thing anyone has given me.',
      ] },
      {
        when: pre({ prince: 'tock' }),
        lines: [
          'Tock is down! The clock prince. Every hour paid into his clocks, he wound into his own spring.',
          'The great clock in the square has stopped at the moment you beat him. They are leaving it like that.',
          'The oil sump under the works fishes now. Iron rod at least. Cogs and minnows. Mind the gears.',
        ],
      },
      {
        when: pre({ courtReady: 'clockwork' }),
        lines: [
          'Five down. Tock attacks on the beat — watch the metronome, not him. Dodge on the tick, not before.',
          'Then gears. Rolling, meshing where they cross, and a spring he winds up and lets go in a dash.',
          'Count. Out loud if you must. Tuppence counts in shrieks. It helps, oddly.',
        ],
      },
      {
        when: pre({ flag: 'marlo-clockwork' }),
        lines: [
          'Every champion here plays a rule with time in it. Pendulums, cogs, hourglasses. The card says which.',
          'The Hour Office is the long queue. People paying their afternoons. Do not stand in it by mistake.',
          'This is where I lost my two years. In that office. In one afternoon. I woke up grey. Look.',
        ],
      },
      {
        sets: 'marlo-clockwork',
        when: { all: [{ not: { flag: 'marlo-clockwork' } }, { not: KING }] },
        lines: [
          'The Clockwork Court. Where the drawn pay their hours. You sit down, you hand them over, you wake up older.',
          'Hear it? Ten thousand clocks. Every one is somebody\'s afternoon, ticking. Prince Tock winds them.',
          'Five champions. Then Tock. I will not go into the Hour Office. Not again. I will wait by the gears.',
        ],
      },
    ],

    // ── The Remembrance Court ───────────────────────────────────────
    remembrance: [
      ARC_OPEN, NUDGE_SQUARE, NUDGE_HOUSE, NUDGE_DRAW,
      { when: draw(4), lines: [
        'They are uncorking the bottles. Every pawned memory, let out of its glass, finding its way home.',
        'Rosalind came up to look for hers. She found one. Her brother, laughing at a fair. She sat down on the step.',
      ] },
      {
        when: pre({ prince: 'hindsight' }),
        lines: [
          'Hindsight is down. The memory prince. Every pawned memory on the isle, he had a look at first.',
          'The bottles in the windows are glowing brighter. Somebody said they are remembering who they belong to.',
          'The Lethe pool fishes now. Fortune rod only. The fish come up and forget they were caught. So might you.',
        ],
      },
      {
        when: pre({ courtReady: 'remembrance' }),
        lines: [
          'Five down. Hindsight remembers you. A copy of you walks where you walked and strikes where you stood.',
          'So do not stand where you stood. Then the floor forgets itself — holes, here and gone. Keep moving.',
          'I have never once looked back in my life. Do as I say, for once, not as I am.',
        ],
      },
      {
        when: pre({ flag: 'marlo-remembrance' }),
        lines: [
          'Every champion here plays a rule with memory in it. Bottles, flowers, portraits. The card says which.',
          'The Lethe pool is pale water where pawned memories are washed out. Fortune rod. Lethe fish.',
          'Do not drink it. Whatever you do. Tuppence drank it once and forgot she was a magpie for a week.',
        ],
      },
      {
        sets: 'marlo-remembrance',
        when: { all: [{ not: { flag: 'marlo-remembrance' } }, { not: KING }] },
        lines: [
          'The Remembrance Court. Memory-pawnbrokers. You owe the Draw, you pawn a memory. A good one. They check.',
          'All those bottles glowing in the windows. Every one is somebody\'s best day, for sale.',
          'Prince Hindsight keeps them. Five champions. The mist here is sepia. You will feel nostalgic. Resist it.',
        ],
      },
    ],

    // ── The Mind Court ──────────────────────────────────────────────
    mind: [
      ARC_OPEN, NUDGE_SQUARE, NUDGE_HOUSE, NUDGE_DRAW,
      { when: draw(4), lines: [
        'The mind-readers have stopped reading. They put cloths over the crystal balls. Out of politeness.',
        'The living chessboard has been let go. The pieces are wandering about the town still in their hats.',
      ] },
      {
        when: pre({ prince: 'gambit' }),
        lines: [
          'Gambit is down. The mind prince. He read every bet in Lotterhaven before it was placed. Every bluff.',
          'Nobody can read you now. I played a hand on my crate last night and bluffed, and won. I nearly fainted.',
          'The séance well fishes now. Thought trout. Insulated rod, or the fortune rod. The fish think back.',
        ],
      },
      {
        when: pre({ courtReady: 'mind' }),
        lines: [
          'Five down. Gambit reads you. He aims where you are going, not where you are. Faint arcs show his guess.',
          'So go somewhere else. Then he plays chess with the floor. Rooks, bishops, knights. Learn the moves.',
          'I bluffed Gambit once. Once. He let me. That was the bluff. I hate him a little.',
        ],
      },
      {
        when: pre({ flag: 'marlo-mind' }),
        lines: [
          'Every champion here plays a rule with your head in it. Boards, spirals, swapped minds. The card says.',
          'The séance well fishes things that are and are not there. Insulated rod, or the fortune rod.',
          'Think of something boring while you walk through. I think of the tide tables. They hate it.',
        ],
      },
      {
        sets: 'marlo-mind',
        when: { all: [{ not: { flag: 'marlo-mind' } }, { not: KING }] },
        lines: [
          'The Mind Court. Mentalists. Every bet at the House is checked here, by someone reading the bettor.',
          'So nobody can bluff the House. Not even me. Especially not me. They know my face up here.',
          'Prince Gambit keeps it. Five champions, a chessboard plaza with living pieces. Do not be a pawn.',
        ],
      },
    ],

    // ── The War Court ───────────────────────────────────────────────
    war: [
      ARC_OPEN, NUDGE_SQUARE, NUDGE_HOUSE, NUDGE_DRAW,
      { when: draw(4), lines: [
        'The Drafting Wheel is in pieces in the parade ground. Somebody planted beans in the trench line.',
        'Banneret is teaching the regiments to march home. In step. He says it is the only drill he knows.',
      ] },
      {
        when: pre({ prince: 'banneret' }),
        lines: [
          'Banneret is down! The war prince. Every conscript drawn on Lotterhaven marched under his banner.',
          'The Drafting Wheel has stopped. The regiments are standing in the yard with no orders. Waiting.',
          'The trench fishes now — tench and muskie. Iron rod at least. Bring boots.',
        ],
      },
      {
        when: pre({ courtReady: 'war' }),
        lines: [
          'Five down. Banneret charges in lanes, banner up, riders either side. Stand between the lanes.',
          'Then he draws lots — ranks of conscripts with pikes, marching across in lines. Find the gap.',
          'The gaps are always there. Somebody in every rank is not quite in step. Bless them.',
        ],
      },
      {
        when: pre({ flag: 'marlo-war' }),
        lines: [
          'Every champion here plays a rule of war. Drums, trebuchets, banners, a tilt rail. The card says which.',
          'The House door is at the top of the court. It opens when all six princes are down. Not before.',
          'Jem Scrabble is somewhere in these barracks. Nell\'s husband, from Tosswater. Drawn two winters ago.',
        ],
      },
      {
        sets: 'marlo-war',
        when: { all: [{ not: { flag: 'marlo-war' } }, { not: KING }] },
        lines: [
          'The War Court. Where the drawn are sent. The Drafting Wheel picks your regiment. The drum picked you.',
          'Banners on everything. Mud on everything else. Prince Banneret keeps it, five champions under him.',
          'And at the top — the House. Lucan\'s palace, the great Wheel on its roof. You can see it from the sea.',
        ],
      },
    ],

    // ── The House ───────────────────────────────────────────────────
    house: [
      ARC_OPEN, NUDGE_SQUARE, ARC_LEDGER, NUDGE_DRAW,
      { when: draw(4), lines: [
        'The House is empty. Somebody has taken the felt off the High Table. It is just a table. Oak. Plain.',
        'Tuppence comes up here to look at herself in the mirrors. There is nothing else up here she wants.',
      ] },
      {
        when: pre({ flag: 'marlo-house' }),
        lines: [
          'Three halls — the Roulette Floor, the Dice Stair, the Card Gallery — each with a warden at the end.',
          'Then the High Table, under the Wheel. He deals you rules. Strike them off. Do not play by them.',
          'And when he goes all in, hit him more than he hits you. That is the only bet worth making here.',
        ],
      },
      {
        sets: 'marlo-house',
        when: { all: [{ not: { flag: 'marlo-house' } }, { not: KING }] },
        lines: [
          'The House. I have been here once. I walked in with everything and walked out with my coat.',
          'He smiles at you the whole time. Lucan. He smiles and says chance is the only fair ruler.',
          'The drum is rigged. I know it. I cannot prove it. Go up and beat him, and then we will look.',
        ],
      },
    ],
  },

  general: [
    { when: { all: [KING, { not: draw(4) }] }, lines: [
      'Lucan is down. The Draw has stopped. Nobody knows what to do on a Thursday any more.',
      'The boatwright can fit an Uber-upgrade if you pull one off a sea beast. The Wheelback drops one.',
      'Tuppence has been very quiet. She is waiting for something. So am I.',
    ] },
    ARC_BELL,
    { when: princes(6), lines: [
      'All six princes. The House door on the War Court summit is open. Three halls, three wardens, then him.',
      'Take meals from the Lucky Loaf. Take your best charms. Do not take any bet he offers. Ever.',
      'Tuppence keeps flying north and coming back with nothing. Something up there is too shiny even for her.',
    ] },
    { when: princes(5), lines: [
      'Five princes! The King has stopped smiling, they say. He sits at the High Table shuffling and shuffling.',
      'Charms last forever, meals last one fight. Three charms at once. Pick the ones that play together.',
      'One court left. Then the House door opens.',
    ] },
    { when: princes(4), lines: [
      'Four courts free! The Draw this week called a Pellington. A favourite. The whole square went silent.',
      'Have you spent your Orbs? G opens the gene tree. Grow something. That is what they are for.',
      'Tuppence brought me a favourite\'s cufflink. Notched. She knows. Birds always know.',
    ] },
    { when: princes(3), lines: [
      'Three courts down! Half the isle! People in Tosswater are wearing their Lots outside their shirts.',
      'Have you a boat yet? Barnaby at the slip builds them. You will want one when the King is done.',
      'Felix the Caller thinks the drum weighs light. He is a careful man. Hear him out.',
    ] },
    { when: princes(2), lines: [
      'Two princes! The King knows your face now. He has had a card printed with it. Tuppence stole one.',
      'Quests pay mostly in Orbs — those lights. Every quest on Lotterhaven ends with a fight. Every one.',
      'If one court is too hard, try another and come back. The roads all go round. So does the Wheel.',
    ] },
    { when: princes(1), lines: [
      'One prince down! Every prince drops something of theirs — an artifact. You can wear one at a time.',
      'And a key. Keys open things. Not the drum. The drum needs a crowbar and the whole town watching.',
      'The Card Court is gentlest. The War Court is hardest — leave it. Mint and clocks sit between.',
    ] },
    {
      lines: [
        'Six courts, six princes, and one King at the top of the hill dealing to himself. Start with the Card Court.',
        'Press E near anyone to talk. Near water with a rod, E casts. Near a counter, E opens it.',
        'TAB is your pack — charms go on there. G is your gene tree; Orbs grow it. M is the isle map.',
        'Fish off the piers in Tosswater. Silas sells rods. Hetty at the Lucky Loaf bakes what you catch.',
        'Each court has its own water — a baize pond, a gilded pool, an oil sump, the Lethe, a well, a trench.',
        'Driftwood for sea and ponds. Iron for oil and the trench. Gold water and the Lethe want the fortune rod.',
        'The séance well wants the insulated rod or the fortune rod. The fortune rod takes everything but fire.',
        'Waystones! Touch one in every court and the map lets you jump between them. My feet thank you.',
        'The Lot on my chain? A forgery. I made it myself. Why? Ask me when the King is down.',
        'Lose a fight and you wake where you stood, a little poorer. The House always wins. Not always. Not today.',
        'The Outer Sea is rough. Good boat, good charms. Something huge out there wears a roulette wheel on its back.',
      ],
    },
  ],
};
