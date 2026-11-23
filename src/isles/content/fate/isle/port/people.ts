import type { Cond, NpcDef, NpcLook, Pt, Talk } from '../../../../IslesTypes';

/**
 * The people of Tosswater — Lotterhaven's harbour, where every Outer Sea crossing lands and where
 * the great brass drum turns in the Draw Square every week.
 *
 * Everything in Tosswater is drawn by lot: berths, market pitches, allotment plots, which baker
 * bakes the Draw-eve bread. Every child wears a Lot at the throat from the day it is born. Every
 * week the drum turns and numbers go up on the board, and the drawn go north to the War Court, or
 * owe the Wager-Tithe, or go to pawn a memory or pay their hours. The busted — those who wagered a
 * re-draw at the House and lost everything — wear a black chip on their chain and work for the
 * House by number. Everyone knows the drum is rigged. Tosswater is cheerful about it the way people
 * are cheerful at a wake: loudly, and in company.
 *
 * Dialogue blocks are listed most specific first: the King down → a prince down → their quest done
 * → default. One man only comes home once the King falls: Jem Scrabble, drawn for the War Court.
 */

const KING: Cond = { monarch: 'lucan' };
const princes = (count: number): Cond => ({ princesOfIsle: 'fate', count });

// ── Positions (shared with the area's POIs and quests) ──────────────

export const AT = {
  dock: { x: 580, y: 1226 },
  store: { x: 1756, y: 724 },
  tackle: { x: 1652, y: 1216 },
  baker: { x: 1774, y: 1114 },
  kiosk: { x: 1440, y: 1230 },
  caller: { x: 1300, y: 906 },
  pawn: { x: 650, y: 718 },
  busted: { x: 1176, y: 684 },
  nell: { x: 2060, y: 724 },
  keeper: { x: 2392, y: 1244 },
  jem: { x: 2124, y: 728 },
} satisfies Record<string, Pt>;

export const TOSSWATER_NPCS: NpcDef[] = [
  // ── Dockmaster / boatwright ───────────────────────────────────────
  {
    id: 'tosswater-dock', name: 'Barnaby Gunwale', title: 'Dockmaster & Boatwright', at: AT.dock,
    role: { kind: 'dock', id: 'tosswater-dock' },
    look: { body: 0xa07a5a, accent: 0x2a3a5a, hat: 'souwester', traits: ['tool', 'beard', 'pipe'], size: 1.25 },
    talks: [
      {
        when: KING,
        lines: [
          'I gave out the berths this morning by asking folk where they wanted to tie up. They looked at me like a ghost.',
          'Then they told me. And I wrote it down. And that was where they tied up. Imagine that. A harbour by asking.',
          'Want a hull? No number on the bow. Paint your own name on her, or nothing. She sails the same either way.',
        ],
      },
      {
        when: { prince: 'banneret' },
        lines: [
          'Banneret is down! The War Court has stopped taking shipwrights for the siege-yards. My lads are home.',
          'I have four apprentices back and only one boat to build. We are building it very, very slowly. Together.',
        ],
      },
      {
        when: { questDone: 'tosswater-berth-lottery' },
        lines: [
          'Capstan towed nobody off my quay this week. First week in nine years. The berth-hooks are rusting. Good.',
          'Your boat is in berth nought, where the House\'s yacht should be. Nobody dares move it. It is very funny.',
        ],
      },
      {
        lines: [
          'Off the jetty and welcome to Tosswater. Mind the bollards — they are dice, and they bark your shins.',
          'Every berth in this harbour is drawn by lot, weekly. Yours too. Lottie at the kiosk draws them. Go and see.',
          'Hulls and mending, that is me, here at the slip. Fish is Silas, east on the quay. Bread is Hetty.',
        ],
      },
    ],
    barks: [
      { when: KING, lines: ['Where do you want to tie up? Truly?', 'No numbers on the bows!'] },
      { lines: ['Mind the dice.', 'Tar, oakum, and a bit of luck.', 'Berth by lot. Berth by lot.', 'Nine years at this slip.'] },
    ],
  },

  // ── General store ─────────────────────────────────────────────────
  {
    id: 'tosswater-store', name: 'Peg Halfpenny', title: 'Odds & Ends', at: AT.store,
    role: { kind: 'shop', id: 'tosswater-store' },
    look: { body: 0xc8a088, accent: 0x7a2a3a, hat: 'none', traits: ['glasses', 'apron', 'satchel'], size: 0.92 },
    talks: [
      {
        when: KING,
        lines: [
          'I have marked every price in the shop with a number. A real one. It does not change on Draw day. Ever.',
          'People keep asking what the odds are on a loaf. I say "one loaf, one loaf". They cry. It is a good loaf.',
        ],
      },
      {
        when: { prince: 'bullion' },
        lines: [
          'Bullion is down and the mint has stopped clipping the coin. A penny weighs a penny again. I weighed one.',
          'I have been short-changed by the King\'s own coin for thirty years. I sat down on the step and laughed.',
        ],
      },
      {
        when: { questDone: 'tosswater-lucky-number' },
        lines: [
          'Winnie Scrabble got her Lot. A plain one, honest number, no notch. Nell showed it to the whole street.',
          'I have started selling chains. Plain chains. For people who want to wear something that is not a number.',
        ],
      },
      {
        lines: [
          'Odds & Ends! Mostly ends. The odds are all up at the House, and the House keeps them.',
          'Charms — the lucky kind and the honest kind. I will not tell you which is which. That is the fun of it.',
          'Equip three — TAB, then pick. Food at the counter too. The chips are hot. The tea is Draw-day strong.',
        ],
      },
    ],
    barks: [
      { when: KING, lines: ['One loaf, one loaf!', 'Prices that stay put!'] },
      { lines: ['Hot chips! Not the House kind!', 'Charms, chains, string.', 'Odds and ends. Mostly ends.'] },
    ],
  },

  // ── Tackle shop ───────────────────────────────────────────────────
  {
    id: 'tosswater-tackle', name: 'Silas Longodds', title: 'The Long Shot', at: AT.tackle,
    role: { kind: 'tackle', id: 'tosswater-tackle' },
    look: { body: 0x9a7a62, accent: 0x2e5a4a, hat: 'cap', traits: ['rod', 'pipe', 'beard'], size: 1.05 },
    talks: [
      {
        when: KING,
        lines: [
          'I landed the jackpot marlin at dawn. Third time in my life. Let her go. Felt like the right bet, for once.',
          'Nobody is making book on my catches now. A man can fish without the whole quay wagering on his line.',
        ],
      },
      {
        when: { prince: 'hindsight' },
        lines: [
          'Hindsight is down. The Lethe pool up at the Remembrance Court fishes now — pale fish, very forgetful.',
          'Only the fortune rod will take it. Anything else comes up and you cannot remember why you are holding it.',
        ],
      },
      {
        when: { prince: 'bullion' },
        lines: [
          'Bullion is down. The gilded pool under the mint is open. Fish made of spill and greed. Fortune rod only.',
          'Gold water eats an ordinary line. It is a very rich man\'s pool. Like everything up there.',
        ],
      },
      {
        when: { questDone: 'tosswater-wreckers-light' },
        lines: [
          'Wynn\'s top has spun every night since. Three boats in through the fog this week and not a plank lost.',
          'Slate\'s book is at the bottom of the harbour. I have caught two dabs reading it.',
        ],
      },
      {
        lines: [
          'The Long Shot. Rods, hooks, and the only fortune rod on Lotterhaven. Fish the quay or either pier.',
          'Lotfish for learning. Dice dabs lie on the sand showing their pips. The jackpot marlin wants an iron rod.',
          'The mint\'s gilded pool and the Lethe at the Remembrance Court want the fortune rod. It is not cheap.',
        ],
      },
    ],
    barks: [
      { when: KING, lines: ['Let her go. Right bet.', 'Nobody wagering on my line!'] },
      { lines: ['Lotfish off the pier!', 'The long shot\'s the only shot.', 'Mind the hook, mind the odds.'] },
    ],
  },

  // ── Bakery ────────────────────────────────────────────────────────
  {
    id: 'tosswater-baker', name: 'Hetty Wishbone', title: 'The Lucky Loaf', at: AT.baker,
    role: { kind: 'bakery', id: 'tosswater-bakery' },
    look: { body: 0xd8b498, accent: 0xc8303e, hat: 'chef', traits: ['apron'], size: 1.1 },
    talks: [
      {
        when: KING,
        lines: [
          'Rosalind came to the back door last night. Said her own name. I gave her the whole tray. All of it.',
          'I bake a button into every loaf now, not just the Draw-eve one. Everybody finds one. Everybody wins.',
        ],
      },
      {
        when: { prince: 'ante' },
        lines: [
          'Ante is down! The Card Court is sending flour honest-weight. No cut of the deck taken from my sacks.',
          'There is a cookie-baker up there, at the Fortune Cookie. We have started trading fortunes. Hers are better.',
        ],
      },
      {
        when: { questDone: 'tosswater-black-chip-supper' },
        lines: [
          'She ate the pie. Four-Four-One-Seven, on the Hall steps, in front of everyone. I saw her chew. I cried.',
          'Marrow has not been back. If he comes I have a rolling pin and a long memory.',
        ],
      },
      {
        lines: [
          'The Lucky Loaf! Every Draw-eve loaf has a brass button baked in. Find it and you are lucky. Allegedly.',
          'Nobody finds it the week they are drawn. Funny, that. Bring me fish and I will bake you something.',
          'Lotfish, dice dabs, and the odd thing from up the hill. A meal lasts one fight. Pick it like a card.',
        ],
      },
    ],
    barks: [
      { when: KING, lines: ['A button in every loaf!', 'Everybody wins today!'] },
      { lines: ['Lucky loaves! Hot from the drum-oven!', 'Find the button, find your luck.', 'Wishbone pie on Draw-eve!'] },
    ],
  },

  // ── The berth kiosk ───────────────────────────────────────────────
  {
    id: 'tosswater-kiosk', name: 'Lottie Spindle', title: 'Berth Lottery Kiosk', at: AT.kiosk,
    look: { body: 0xd0aa90, accent: 0x1c1a22, hat: 'visor', traits: ['glasses'], size: 0.9, eye: 0x9ae8b0 },
    talks: [
      {
        when: KING,
        lines: [
          'I have taken the wheel off the kiosk roof. I am selling ices out of it now. Raspberry, and black cherry.',
          'Raspberry is red and black cherry is black. Habit. I cannot help it. People like them anyway.',
        ],
      },
      {
        when: { questDone: 'tosswater-berth-lottery' },
        lines: [
          'Berth nought, still. I spin the little wheel and it comes up nought for you every time. I fixed it.',
          'Nobody can prove it. That is the House\'s favourite trick. I learned it from the best.',
        ],
      },
      {
        lines: [
          'Berth lottery! Every hull, every week. You came in on the Outer Sea? Then you draw a berth like anyone.',
          'Spin the wheel, read the wedge. Red berths are on the quay, black berths are out on the piers.',
          'And green is nought. Nought is the House\'s berth. Nobody draws nought. Nobody draws nought, ever.',
        ],
      },
    ],
    barks: [
      { when: KING, lines: ['Ices! Red or black!', 'No wheel today!'] },
      { lines: ['Berth by lot!', 'Spin it, love.', 'Red quay, black pier.', 'Nobody draws nought.'] },
    ],
  },

  // ── The Draw-caller ───────────────────────────────────────────────
  {
    id: 'tosswater-caller', name: 'Felix Tumble', title: 'Caller of the Draw', at: AT.caller,
    look: { body: 0xb89a82, accent: 0x1e5a32, hat: 'visor', traits: ['book', 'scarf'], size: 1.05, eye: 0xf0e090 },
    talks: [
      {
        when: KING,
        lines: [
          'Twenty-two years I turned that drum. Every week, every number, in my own voice. I read them out.',
          'And I never once read out a name. Marlo did it in an afternoon. I stood at the back and wept like a pipe.',
          'They are melting the chips into a bell. I have asked to ring it. They said yes. They said, of course.',
        ],
      },
      {
        when: { questDone: 'tosswater-light-drum' },
        lines: [
          'The tallies are hidden in my mother\'s hatbox. Twenty-two years of sheets. Not one favourite, called.',
          'It is not proof. The House says chance is streaky. But I know the drum\'s weight like my own child\'s.',
        ],
      },
      {
        when: princes(4),
        lines: [
          'Four courts down and the drum turns slower. I am turning it slower. Nobody has told me not to. Yet.',
          'Last week three numbers came up that never come up. I called them. My voice shook. Nobody noticed.',
        ],
      },
      {
        lines: [
          'I am the Caller. I turn the great drum and read the numbers onto the board. I do not choose them.',
          'I want you to understand that. I do not choose them. I turn the handle, and the drum chooses.',
          'That is what I tell myself. Every week. Turn the handle, read the number. The drum chooses.',
        ],
      },
    ],
    barks: [
      { when: KING, lines: ['I read out a name today!', 'May I ring the bell?'] },
      { lines: ['The drum chooses.', 'Turn and read. Turn and read.', 'Four-two-nine-nine... no. Not yet.'] },
    ],
  },

  // ── The pawnbroker ────────────────────────────────────────────────
  {
    id: 'tosswater-pawn', name: 'Agatha Pledge', title: 'Under the Three Balls', at: AT.pawn,
    look: { body: 0xb0927a, accent: 0x3a2a3a, hat: 'veil', traits: ['glasses', 'cane'], size: 1.0, eye: 0xd8c890 },
    talks: [
      {
        when: KING,
        lines: [
          'Everybody is coming to redeem. Rings, fiddles, Lots. I am giving them back. No ticket. I know their faces.',
          'Forty years of pledges, and I have never once been this busy and this poor. It is wonderful.',
        ],
      },
      {
        when: { prince: 'hindsight' },
        lines: [
          'Hindsight is down. The memory-pawn up the hill has stopped buying. I never would. I only buy things.',
          'A ring you can redeem. An afternoon you spent being happy — there is no ticket for that. I told them.',
        ],
      },
      {
        when: { questDone: 'tosswater-lucky-number' },
        lines: [
          'Notched. Every favourite\'s Lot a hair thinner at the rim. I keep the four in my safe. Under a cloth.',
          'Not proof, the Lot-Smith said. Well, he is not the one with the loupe. I am.',
        ],
      },
      {
        lines: [
          'Three balls over the door. Two to one you will not come back for it. That is the old pawnbroker\'s joke.',
          'Rings, watches, fiddles. And Lots — families pledge their Lots against a re-draw, when it gets bad.',
          'You cannot pawn a Lot, of course. It is the law. So they are not Lots, on my tickets. They are "brass".',
        ],
      },
    ],
    barks: [
      { when: KING, lines: ['Come and redeem! No ticket!', 'I know your face.'] },
      { lines: ['Two to one you won\'t be back.', 'Brass, love. Just brass.', 'Everything has a price but me.'] },
    ],
  },

  // ── Number Four-Four-One-Seven, busted ────────────────────────────
  {
    id: 'tosswater-busted', name: 'Four-Four-One-Seven', title: 'Busted, Serving the House', at: AT.busted,
    look: { body: 0x9a9088, accent: 0x121016, hat: 'visor', traits: ['scarf'], size: 0.95, eye: 0xb8b0a8 },
    talks: [
      {
        when: KING,
        lines: [
          'Rosalind. My name is Rosalind Merriweather. I am saying it to everybody. I said it to a gull this morning.',
          'They read it out in the square. Marlo did. I did not know it. I had to be told my own name, and I cried.',
          'I am going to apprentice with Hetty again. Where I was, before the House. Before the number.',
        ],
      },
      {
        when: { questDone: 'tosswater-light-drum' },
        lines: [
          'I told you what I saw. A drawer. Under the drum, in the House. That is all a croupier may say.',
          'Four-Four-One-Seven may not have opinions. But she has eyes, and eyes are not in the rules.',
        ],
      },
      {
        when: { questDone: 'tosswater-black-chip-supper' },
        lines: [
          'Four-Four-One-Seven thanks you. She has no name to thank you with. The pie was very good.',
          'The busted may not take gifts. She took one. The chip on her chain felt lighter. That is not allowed either.',
        ],
      },
      {
        lines: [
          'Four-Four-One-Seven, busted, serving the House. Draw-day attendant. How may the House be of service.',
          'She may not give her name. She wagered it, and the House won it. The House always wins. That is the rule.',
          'She sweeps the Hall steps. She stacks the chips. She was a baker once. That is not in the rules either.',
        ],
      },
    ],
    barks: [
      { when: KING, lines: ['Rosalind. Rosalind!', 'My name is Rosalind.'] },
      { lines: ['The House is served.', 'Four-Four-One-Seven, attending.', '...', 'The House always wins.'] },
    ],
  },

  // ── Nell Scrabble ─────────────────────────────────────────────────
  {
    id: 'tosswater-nell', name: 'Nell Scrabble', title: 'With a Baby on Her Hip', at: AT.nell,
    look: { body: 0xc89a80, accent: 0x4a6a8a, hat: 'hood', traits: ['satchel', 'scarf'], size: 0.98 },
    talks: [
      {
        when: KING,
        lines: [
          'Jem is home. Drawn for the War Court two winters ago and he walked in last night with his boots off.',
          'He held Winnie and she screamed at him. He said it was the best thing he had heard in two years.',
        ],
      },
      {
        when: { prince: 'banneret' },
        lines: [
          'Banneret is down. The Drafting Wheel has stopped. Jem\'s regiment is standing in a field with no orders.',
          'He wrote. Two lines. "No orders. Coming when they let us." I have read it nine hundred times.',
        ],
      },
      {
        when: { questDone: 'tosswater-lucky-number' },
        lines: [
          'Winnie\'s Lot is the plainest number in Tosswater. No notch. No favour. She will be drawn like anyone.',
          'I would rather that than have her bought. Is that wicked? Peg says it is the bravest thing she has heard.',
        ],
      },
      {
        lines: [
          'This is Winnie. Two weeks old. Tomorrow she gets her Lot at the Hall. Every baby does. Like a christening.',
          'Her father was drawn for the War Court two winters ago. We were not favourites. We will never be.',
          'Mind the step. It is a die. Everything here is a die. Even the houses. We live in a two.',
        ],
      },
    ],
    barks: [
      { when: KING, lines: ['Jem is home!', 'Winnie, that is your father. Stop screaming.'] },
      { lines: ['Shh, Winnie.', 'Two weeks old and already numbered.', 'Mind the step.'] },
    ],
  },

  // ── The lighthouse keeper ─────────────────────────────────────────
  {
    id: 'tosswater-keeper', name: 'Wynn Topsy', title: 'Keeper of the Spinning Top', at: AT.keeper,
    look: { body: 0xb08870, accent: 0xc8303e, hat: 'beanie', traits: ['lantern', 'tool'], size: 1.15 },
    talks: [
      {
        when: KING,
        lines: [
          'The top spins and nobody bets on it. Ships come in and nobody bets on them. The fog is just fog now.',
          'I have taught three children to whip the top. One of them is better than me already. Little beast.',
        ],
      },
      {
        when: { questDone: 'tosswater-wreckers-light' },
        lines: [
          'New cord, tarred and whipped. She spins all night and the beam goes round like it should. Look at her go.',
          'Slate had been stopping her on foggy nights. Holding her still with a hook, so the light pointed wrong.',
          'And then he took bets on which boat would find the rocks. The House paid out. The House always pays.',
        ],
      },
      {
        lines: [
          'The lighthouse is a top. Yes. A spinning top. It spins on its point and the lamp in its stem goes round.',
          'I whip it every dusk with that whip on the post, and it spins till dawn. Then I sleep. I sleep a lot.',
          'You are standing on my rock. That is fine. Mind the cords. Mind the whip. Mind the point; it is sharp.',
        ],
      },
    ],
    barks: [
      { when: KING, lines: ['Spin, my lovely!', 'Just fog. Only fog.'] },
      { lines: ['Round she goes.', 'Mind the point.', 'Whip at dusk, sleep at dawn.'] },
    ],
  },

  // ── Jem Scrabble (only after the King) ────────────────────────────
  {
    id: 'tosswater-jem', name: 'Jem Scrabble', title: 'Home from the War Court', at: AT.jem, present: KING,
    look: { body: 0xa8846a, accent: 0x5a5a3a, hat: 'none', traits: ['pack', 'bandage'], size: 1.2 },
    talks: [
      {
        lines: [
          'Drawn two winters ago. Number Two-Two-Eight-Six. Pike drill, trench drill, and waiting. Mostly waiting.',
          'They told us the Draw chose us. Then we heard the drum had a false bottom. Half the regiment sat down.',
          'I walked home barefoot. I wanted to feel every step of it. My daughter screams at me. It is perfect.',
        ],
      },
    ],
    barks: [{ lines: ['Home.', 'Barefoot all the way.', 'Winnie, it is me.'] }],
  },
];

// ── The crowd ────────────────────────────────────────────────────────

const CROWD_LOOKS: NpcLook[] = [
  { body: 0xc8a08a, accent: 0xc8303e, hat: 'cap', traits: ['satchel'] },
  { body: 0xb08a6a, accent: 0x1c1a22, hat: 'visor' },
  { body: 0xd0aa90, accent: 0x2e7a4c, hat: 'none', traits: ['apron'] },
  { body: 0x9a7a62, accent: 0x2a3a5a, hat: 'souwester', traits: ['rod'] },
  { body: 0xa88a7a, accent: 0x121016, hat: 'visor', traits: ['scarf'], size: 0.95 },
  { body: 0xc89a82, accent: 0xd8b04a, hat: 'beanie', size: 0.74 },
  { body: 0xb89878, accent: 0x7a2a3a, hat: 'tophat', traits: ['cane'] },
  { body: 0xc0a088, accent: 0x4a6a8a, hat: 'hood', traits: ['pack'], size: 1.15 },
];

export const TOSSWATER_CROWD: { count: number; looks: NpcLook[]; paths: Pt[][]; barks: Talk[] } = {
  count: 14,
  looks: CROWD_LOOKS,
  paths: [
    // The quay, end to end, past the slip and the kiosks.
    [{ x: 200, y: 1232 }, { x: 1000, y: 1236 }, { x: 1800, y: 1242 }, { x: 2300, y: 1226 }],
    // The west road, to the pawnshop and back.
    [{ x: 120, y: 760 }, { x: 600, y: 762 }, { x: 1040, y: 758 }],
    // The east road, past Odds & Ends.
    [{ x: 1560, y: 760 }, { x: 2000, y: 764 }, { x: 2480, y: 760 }],
    // Round the Draw Square, keeping off the dais.
    [{ x: 1120, y: 700 }, { x: 1480, y: 704 }, { x: 1490, y: 960 }, { x: 1110, y: 964 }],
    // Up and down the north road.
    [{ x: 1300, y: 140 }, { x: 1300, y: 420 }, { x: 1300, y: 620 }],
    // Along the upper terrace, under the Lot Wall.
    [{ x: 200, y: 424 }, { x: 1000, y: 420 }, { x: 1600, y: 410 }, { x: 2400, y: 420 }],
    // Jetty Street down to the landing.
    [{ x: 1300, y: 1010 }, { x: 1300, y: 1240 }, { x: 1300, y: 1400 }],
    // The bakery queue.
    [{ x: 1700, y: 1130 }, { x: 1900, y: 1140 }, { x: 1950, y: 1236 }, { x: 1690, y: 1146 }],
  ],
  barks: [
    { when: KING, lines: [
      'They read my name out! My NAME!', 'The drum had a drawer in it. A drawer!', 'Every number won. Every one.',
      'They are melting the chips for a bell.', 'Nobody is drawn this week. Or ever.',
    ] },
    { when: princes(4), lines: [
      'Four courts!', 'The drum turned slow last week.', 'They say the King has stopped smiling.',
    ] },
    { when: { prince: 'ante' }, lines: [
      'The Card prince is down!', 'Shh — not by the drum.', 'They say Ante\'s deck was all aces.',
    ] },
    { lines: [
      'Draw day tomorrow.', 'What\'s your number? No — don\'t tell me.', 'Never drawn, the Fitch-Vanes. Never once.',
      'Mind the dice.', 'Lotfish off the pier.', 'My aunt paid three afternoons last week.', 'Red berth or black?',
      'Find the button in the loaf?', 'The House always wins. Shh.',
    ] },
  ],
};
