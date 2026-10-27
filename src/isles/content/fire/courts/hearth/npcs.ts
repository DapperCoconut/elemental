import type { AreaDef, NpcDef, NpcLook, Talk } from '../../../../IslesTypes';

/**
 * The people of the Hearth Court.
 *
 * This is the first court anyone reaches from Emberport, so its people double as the isle's
 * teachers without ever saying so: Wick shows you the rod, Sorrel sends you gathering, Varnaby
 * has you carry things, Pim points you at a fight, Captain Embry at the Prince. Each of them is
 * also somebody — a widow with one coal left, a clerk cooking the tithe books, a climbing boy
 * who has never seen the top of a chimney from outside.
 */

const PRINCE = { prince: 'kindle' } as const;
const KING = { monarch: 'ashgrave' } as const;

export const HEARTH_NPCS: NpcDef[] = [
  // ── Ottilie Grate — the shop ─────────────────────────────────────────
  {
    id: 'hearth-ottilie',
    name: 'Ottilie Grate',
    title: 'Hearthwares',
    look: { body: 0xd9a77e, accent: 0x6a3d2c, hat: 'bandana', traits: ['apron', 'glasses'], size: 1.05 },
    at: { x: 1980, y: 1332 },
    role: { kind: 'shop', id: 'hearth-shop' },
    talks: [
      {
        when: KING,
        lines: [
          'The King\'s gone. I took the brand off my sign with a chisel and a very satisfied face.',
          'Charms are still charms, love. Fire still burns. It just burns for whoever lit it now.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'Kindle\'s manor\'s dark for the first time in forty years. I keep looking up at it.',
          'Business is up, mind. People are buying hearth-things because they WANT a fire. Imagine.',
        ],
      },
      {
        when: { questDone: 'hearth-q-cold-hearth' },
        lines: [
          'You got old Sorrel\'s fire going. She came in and bought a tin of tea. First in a year.',
          'Have a look at the charms. Every one\'s made from something the tithe-men threw out.',
        ],
      },
      {
        lines: [
          'Hearthwares. Pokers, tongs, flue-brushes, and the odd charm that does a bit more than poke.',
          'Charms are permanent. You can wear three at once. Pick ones that suit how you fight.',
          'And if you\'ve been at the cistern, I\'ll buy crayfish. Everybody in this town eats crayfish.',
        ],
      },
    ],
    barks: [
      { when: PRINCE, lines: ['Two-for-one on brand-breakers, today only. Well. Today and forever.'] },
      { lines: ['Fresh flue-brushes! Tithe-approved! (Don\'t tell anyone they\'re not.)', 'Charms! Hearth-charms!'] },
    ],
  },

  // ── Wick Dunmore — the cistern, fishing ──────────────────────────────
  {
    id: 'hearth-wick',
    name: 'Wick Dunmore',
    title: 'Cistern Keeper',
    look: { body: 0xb98d6e, accent: 0x3b4a44, hat: 'beanie', traits: ['rod', 'beard', 'pipe'], size: 1.1 },
    at: { x: 1540, y: 1448 },
    talks: [
      {
        when: KING,
        lines: [
          'King\'s dead, they say. The water in this cistern\'s the same water it was. Comforting, that.',
          'The perch have started biting at dusk. They never did, with the tithe-fires all burning.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'You put the Prince down. The Prince who taxed my crayfish by the claw. By the CLAW.',
          'Fish the cistern any time. No tithe on it now. I\'ll get used to saying that.',
        ],
      },
      {
        when: { questDone: 'hearth-q-cistern' },
        lines: [
          'Varnaby took the crayfish and wrote "paid in full". Ha! First time those words were true.',
          'Soot crayfish bite easy. Tithe perch fight. Watch the bar and don\'t yank it.',
        ],
      },
      {
        lines: [
          'This cistern catches every drop that runs off the terraces. Soot, ash, and good eating.',
          'Got a rod? Stand at the edge and cast. When it bites, keep the fish inside the catch bar.',
          'Soot crayfish are easy. Tithe perch thrash. Both sell. Both cook.',
        ],
      },
    ],
    barks: [
      { when: PRINCE, lines: ['Untaxed crayfish. Tastes better. I\'m sure of it.'] },
      { lines: ['Shh. They\'re biting.', 'Mind the edge, it\'s slick with soot.', 'Cistern water. Don\'t drink it. Do fish it.'] },
    ],
  },

  // ── Sorrel Ashby — the cold hearth ───────────────────────────────────
  {
    id: 'hearth-sorrel',
    name: 'Sorrel Ashby',
    title: 'Widow of Number Nine',
    look: { body: 0xe0c2a6, accent: 0x55484a, hat: 'hood', traits: ['cane', 'scarf', 'brand'], size: 0.88 },
    at: { x: 420, y: 1338 },
    talks: [
      {
        when: KING,
        lines: [
          'I let my fire go out last night. On purpose. Sat in the cold and laughed like a girl.',
          'Then I lit it again, because it was cold. But I lit it for ME.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'Prince Kindle used to bow to me at the tithe count. Very polite. Very polite indeed.',
          'He\'d have had me in the Kiln for one cold night all the same. Thank you, dear.',
        ],
      },
      {
        when: { questDone: 'hearth-q-cold-hearth' },
        lines: [
          'Look at it burn! Pim got it going with one breath. That boy has lungs like a bellows.',
          'If you\'re going up the terraces, mind the tithe-men. They count everything twice.',
        ],
      },
      {
        when: { quest: 'hearth-q-cold-hearth' },
        lines: [
          'Five lumps, dear. The gutters on this terrace eat coal like it\'s their supper.',
          'Then fetch Pim. Only Pim can start a fire from nothing. He\'s at the foot of the stair.',
        ],
      },
      {
        lines: [
          'My hearth\'s nearly out. I fell asleep with my knitting and the coal bucket\'s empty.',
          'The tithe-men count at dusk. A cold hearth means the Kiln. They don\'t make exceptions for age.',
        ],
      },
    ],
    barks: [
      { when: PRINCE, lines: ['Warm as toast, and nobody\'s business but mine.'] },
      { when: { questDone: 'hearth-q-cold-hearth' }, lines: ['Burning nicely. Burning nicely.'] },
      { lines: ['Oh, my poor fire.', 'Is it dusk yet? Don\'t tell me if it is.'] },
    ],
  },

  // ── Pim Flewitt — the climbing boy ───────────────────────────────────
  {
    id: 'hearth-pim',
    name: 'Pim Flewitt',
    title: 'Climbing Boy',
    look: { body: 0xc9a185, accent: 0x2a2624, hat: 'cap', traits: ['pack', 'bandage'], size: 0.74 },
    at: { x: 1330, y: 1205 },
    wander: 40,
    talks: [
      {
        when: KING,
        lines: [
          'I\'m going to climb OUT of a chimney. Onto a roof. And just sit there. Looking at stuff.',
          'Captain Mottle says sweeps are still needed. I said fine, but I want lunch now. And a hat.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The Prince is beat? Then whose chimney am I sweeping? MINE? I haven\'t got one!',
          'Captain Mottle says I\'m a free sweep now. I don\'t know what that is. It sounds big.',
        ],
      },
      {
        when: { questDone: 'hearth-q-flue' },
        lines: [
          'You beat the Captain! He gave me back my pay and then he gave me a biscuit. A whole one.',
          'If a flue ever needs doing, I\'m your boy. I can get up anything wider than a cat.',
        ],
      },
      {
        when: { quest: 'hearth-q-flue' },
        lines: [
          'The brushes are up on the middle terrace, along the cross street. Four of \'em. Hurry!',
        ],
      },
      {
        lines: [
          'I\'m a climbing boy. I go up the flues and knock the soot down. Mostly onto me.',
          'I\'ve seen the inside of every chimney on this terrace. Never seen one from the roof, though.',
        ],
      },
    ],
    barks: [
      { when: PRINCE, lines: ['Free sweep! Free sweep! (What does that mean?)'] },
      { lines: ['Chim-chim-ney! Ow. Soot in my eye.', 'Up the flue and down the flue...', 'Got any biscuits?'] },
    ],
  },

  // ── Varnaby Quill — the tithe clerk ──────────────────────────────────
  {
    id: 'hearth-varnaby',
    name: 'Varnaby Quill',
    title: 'Tithe Clerk',
    look: { body: 0xd8c0a2, accent: 0x2e3440, hat: 'tophat', traits: ['glasses', 'book', 'brand'], size: 0.95 },
    at: { x: 1400, y: 442 },
    talks: [
      {
        when: KING,
        lines: [
          'I have been asked to keep the books for the new Hearth Council. Honest books. It\'s unnerving.',
          'Every column adds up. I keep checking. I feel like I\'m being followed.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The Prince\'s ledger is now evidence. I have, ahem, already corrected any inconsistencies.',
          'In the town\'s favour. Naturally. I am a clerk of principle. Recently.',
        ],
      },
      {
        when: { questDone: 'hearth-q-ledger' },
        lines: [
          'Thirty-one households marked "paid" who were not. The Prince will never read that far.',
          'You\'ll keep it quiet, of course. Of course you will. You have an honest face. Unfortunately.',
        ],
      },
      {
        when: { quest: 'hearth-q-ledger' },
        lines: [
          'The wind took my receipts right across the upper terrace. Gather them before a tithe-man does.',
        ],
      },
      {
        when: { quest: 'hearth-q-cistern', stage: 1 },
        lines: ['You\'re carrying crayfish. On Wick\'s account, I assume. Bring them here, then.'],
      },
      {
        lines: [
          'Varnaby Quill, tithe clerk to Prince Kindle. I record who kept their fire and who did not.',
          'Every name on this page is a family. Every blank line is a family in the Kiln. I hate blank lines.',
        ],
      },
    ],
    barks: [
      { when: PRINCE, lines: ['Column one: free. Column two: free. Column three... also free.'] },
      { lines: ['Number nine, Ash Row: paid. Paid. Absolutely paid.', 'Ink. More ink. Always more ink.'] },
    ],
  },

  // ── Hessa Brandt — the smith ─────────────────────────────────────────
  {
    id: 'hearth-hessa',
    name: 'Hessa Brandt',
    title: 'Smith, Unbranded Work Only',
    look: { body: 0xa87452, accent: 0x3a2a22, hat: 'goggles', traits: ['apron', 'tool', 'bandage'], size: 1.25 },
    at: { x: 1480, y: 906 },
    talks: [
      {
        when: KING,
        lines: [
          'I melted every branding iron I could find. Made a garden gate out of them. It\'s ugly. I love it.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'Ostra came by. Asked if I needed a striker. I said yes. She\'s good. Better without a brand to make.',
        ],
      },
      {
        when: { questDone: 'hearth-q-ledger' },
        lines: [
          'Those receipts burned like they were glad to go. Paper knows when it\'s been lying.',
        ],
      },
      {
        when: { encounter: 'hearth-three-brands' },
        lines: [
          'You stood up to Ostra and came out without three brands on you. That\'s more than I did.',
          'Brands wash off in time. Most of them. Mine didn\'t.',
        ],
      },
      {
        lines: [
          'Ostra up the street makes the King\'s irons. I make hinges, nails and kettles. Nothing with a sigil.',
          'If she brands you, find water. Quick. A brand that gets three deep doesn\'t fade. It goes off.',
        ],
      },
    ],
    barks: [
      { when: PRINCE, lines: ['Hinges! Kettles! No brands, ever, for anyone!'] },
      { lines: ['*clang*', 'Unbranded work only. Read the sign.', 'Mind the sparks.'] },
    ],
  },

  // ── Captain Rook Embry — the tithe watch ─────────────────────────────
  {
    id: 'hearth-embry',
    name: 'Captain Rook Embry',
    title: 'Tithe Watch',
    look: { body: 0xc49678, accent: 0x5a1f12, hat: 'helmet', traits: ['brand', 'lantern', 'beard'], size: 1.2 },
    at: { x: 1620, y: 624 },
    talks: [
      {
        when: KING,
        lines: [
          'I swore an oath to the Brand-King. The Brand-King is ash. Funny how light an oath gets.',
          'I\'m keeping the watch. Somebody should. Now it watches for fires that get out, not ones that go out.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The Prince yielded. He asked me to see the house was kept. I said I\'d see the TOWN was kept.',
          'He said that was what he meant. I\'m not sure he ever meant anything else.',
        ],
      },
      {
        when: { courtReady: 'hearth' },
        lines: [
          'You\'ve beaten every champion on the terraces. The manor door will open for you now.',
          'Kindle is not cruel. That is what makes him dangerous. He believes the fire must be kept.',
        ],
      },
      {
        lines: [
          'Halt. You\'re not branded. Visitors from the port, then. Keep your fire lit and your head down.',
          'The Prince sees no one who hasn\'t proven themselves on the terraces. Five champions. Beat them.',
          'Not that I\'m telling you to. I\'m just telling you what the rule is. Loudly. In case you\'re slow.',
        ],
      },
    ],
    barks: [
      { when: PRINCE, lines: ['Watch is kept. For the town, now.'] },
      { lines: ['Hearths lit by dusk.', 'Move along. Slowly. That\'s it.', 'Every fire counted.'] },
    ],
  },

  // ── Marta Fenn — the lamplighter's mother ────────────────────────────
  {
    id: 'hearth-marta',
    name: 'Marta Fenn',
    title: 'Lamplighter\'s Mother',
    look: { body: 0xe3c7ad, accent: 0x6b5a3e, hat: 'veil', traits: ['lantern', 'scarf'], size: 0.92 },
    at: { x: 1880, y: 1560 },
    talks: [
      {
        when: KING,
        lines: [
          'My Fenn lights the lamps at dusk now for the children to play under. Not to count the doors.',
        ],
      },
      {
        when: PRINCE,
        lines: ['Fenn came home before curfew. First time in six years. I didn\'t know what to cook.'],
      },
      {
        when: { encounter: 'hearth-curfew' },
        lines: [
          'You fought my boy in the dark and you relit his lamps. He told me. He said you were "rude about it".',
          'He\'s proud, Fenn. Being beaten in the light by someone who lights lamps is the best way to lose.',
        ],
      },
      {
        lines: [
          'My son\'s the curfew lamplighter. He snuffs the street lamps at curfew so the watch can see windows.',
          'A dark window means a cold hearth. He hates it. He does it very well. Those are not the same thing.',
        ],
      },
    ],
    barks: [
      { when: PRINCE, lines: ['Home before dark, my Fenn. Home before dark.'] },
      { lines: ['Is it curfew yet?', 'Mind the lamps, they get snuffed early on this terrace.'] },
    ],
  },
];

// ── The crowd ─────────────────────────────────────────────────────────

const looks: NpcLook[] = [
  { body: 0xc49a7c, accent: 0x3b3633, hat: 'cap', traits: ['brand'] },
  { body: 0xe0c2a6, accent: 0x5a4a44, hat: 'hood', traits: ['scarf', 'brand'] },
  { body: 0xa87452, accent: 0x2a2624, hat: 'none', traits: ['apron', 'brand'] },
  { body: 0xd9b08c, accent: 0x4a3828, hat: 'beanie', traits: ['satchel', 'brand'] },
  { body: 0xb98d6e, accent: 0x353a42, hat: 'cap', traits: ['pack'], size: 0.78 },
  { body: 0xd8c0a2, accent: 0x6a3d2c, hat: 'bandana', traits: ['brand', 'tool'] },
  { body: 0xc9a185, accent: 0x2e2a28, hat: 'none', traits: ['pipe', 'beard', 'brand'], size: 1.15 },
  { body: 0xe3c7ad, accent: 0x55484a, hat: 'veil', traits: ['brand'] },
];

const barks: Talk[] = [
  {
    when: KING,
    lines: [
      'No more tithe. I keep saying it out loud.',
      'I let my fire go out and nobody came.',
      'The Kiln\'s cold. The KILN\'s cold!',
      'I\'m painting over my brand. Blue. Why blue? Why not!',
    ],
  },
  {
    when: PRINCE,
    lines: [
      'The manor\'s gone dark.',
      'Did you hear? Kindle yielded!',
      'Is the tithe still on? Nobody knows.',
      'My door\'s still branded. Doesn\'t feel like it, though.',
    ],
  },
  {
    when: { courtReady: 'hearth' },
    lines: [
      'They say someone\'s going up to the manor.',
      'Every champion on the terraces, beaten. By one stranger.',
    ],
  },
  {
    lines: [
      'Coal\'s gone up again.',
      'Mind your hearth.',
      'Dusk soon. Better check the grate.',
      'They took the Hollins family last week.',
      'Smoke\'s thick today.',
      'Keep your head down, stranger.',
      'Number six went cold. Number six is empty now.',
      'Tithe-men on the stair.',
    ],
  },
];

export const HEARTH_CROWD: NonNullable<AreaDef['crowd']> = {
  count: 14,
  looks,
  paths: [
    // Round the lower square.
    [{ x: 700, y: 1220 }, { x: 1300, y: 1220 }, { x: 1300, y: 1600 }, { x: 700, y: 1600 }],
    [{ x: 1150, y: 1640 }, { x: 1150, y: 1200 }, { x: 1740, y: 1200 }, { x: 1740, y: 1620 }],
    // Up and down the main climb.
    [{ x: 1220, y: 1500 }, { x: 1220, y: 840 }, { x: 1180, y: 480 }, { x: 1220, y: 840 }],
    // The cross street, both directions.
    [{ x: 120, y: 850 }, { x: 1100, y: 830 }, { x: 2300, y: 850 }],
    [{ x: 2280, y: 830 }, { x: 1300, y: 860 }, { x: 140, y: 830 }],
    // The lamp lane.
    [{ x: 160, y: 480 }, { x: 1060, y: 490 }, { x: 1560, y: 480 }, { x: 2260, y: 480 }],
    // Down the west lane to Sorrel's row.
    [{ x: 430, y: 880 }, { x: 430, y: 1240 }, { x: 640, y: 1360 }, { x: 300, y: 1380 }],
  ],
  barks,
};
