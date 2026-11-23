import type { AreaDef, NpcDef, NpcLook, Talk } from '../../../../IslesTypes';

/**
 * The people of the Remembrance Court.
 *
 * Here the drawn pay the Draw in memories. A number called for the pledge walks up Pawn Row,
 * chooses a memory (or has one chosen), and the pawnbroker draws it off into a bottle and writes
 * a ticket. Redeem the ticket by the second Draw and you may have it back — for a fee nobody
 * can pay. Lapsed bottles go to the Lethe, where they are poured out and the sheets wrung grey.
 * People here keep lists of what they still remember, tie string round their fingers, and walk
 * in the forget-me-not fields to hold on. Those who pawned too much live on the Quiet Street
 * with their windows painted white, so as not to see what they can't place.
 */

const PRINCE = { prince: 'hindsight' } as const;
const KING = { monarch: 'lucan' } as const;

export const Q_ELSIE = 'remembrance-q-elsie';
export const Q_FLUKES = 'remembrance-q-flukes';
export const Q_PORTRAIT = 'remembrance-q-portrait';
export const Q_FORTY_ONE = 'remembrance-q-forty-one';
export const Q_ARCHIVE = 'remembrance-q-archive';

export const REMEMBRANCE_NPCS: NpcDef[] = [
  // ── Agatha Keepsake — the shop ───────────────────────────────────────
  {
    id: 'remembrance-agatha',
    name: 'Agatha Keepsake',
    title: 'Keepsakes & Curios',
    look: { body: 0xd8c0a0, accent: 0x2f6a4a, hat: 'visor', traits: ['glasses', 'apron', 'satchel'], size: 1 },
    at: { x: 460, y: 760 },
    role: { kind: 'shop', id: 'remembrance-shop' },
    talks: [
      {
        when: KING,
        lines: [
          'People are coming in to SELL me things now. Lockets. Letters. Things they remember the stories of.',
          'I don\'t take pledges any more. I only buy. The charms are still on the shelf, if you\'re fighting on.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The Archive doors are open and people are walking out with their own bottles under their arms.',
          'Nobody\'s pawning. My trade is dead. I have never been so happy to be ruined.',
        ],
      },
      {
        lines: [
          'Keepsakes and curios. I don\'t take pledges — that\'s Tally\'s, next door. I sell what helps you keep.',
          'A number drawn for the pledge comes up this row and leaves a memory in a bottle. A good one. They insist.',
          'Redeem it by the second Draw and you can have it back. The fee is always a little more than anyone has.',
          'Charms on the green shelf, three to a person. They\'re made from things people refused to forget.',
        ],
      },
    ],
    barks: [
      { when: PRINCE, lines: ['Nothing pawned today!', 'Bring your own bottle home!'] },
      { lines: ['Keepsakes, curios!', 'String for your finger, a penny.', 'Hold on to it, love.', 'Charms on the green shelf.'] },
    ],
  },

  // ── Tobiah Wren — the widower who pawned his wife's face ─────────────
  {
    id: 'remembrance-tobiah',
    name: 'Tobiah Wren',
    title: 'Number 2207',
    look: { body: 0xc8b096, accent: 0x5a4a6a, hat: 'tophat', traits: ['cane', 'scarf'], size: 0.95 },
    at: { x: 1090, y: 900 },
    talks: [
      {
        when: KING,
        lines: [
          'Elsie liked the sea. I\'d forgotten that too, it turns out. It came back with her face.',
          'I go down to Tosswater every morning now and look at it for her. Very loud, the sea. She was right.',
        ],
      },
      {
        when: { questDone: Q_ELSIE },
        lines: [
          'She had a gap in her teeth. Here. Right here. She hated it. I spent forty years loving it.',
          'I can see her. When I close my eyes, I can see her. Thank you. I keep saying it. Thank you.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The Prince fell and the Archive opened, and I went looking, but my ticket had lapsed. She\'d gone.',
          'Then a stranger brought her back to me. I\'ll be all right. Don\'t mind the bench. It\'s my bench.',
        ],
      },
      {
        when: { quest: Q_ELSIE },
        lines: [
          'Tally will know where she\'s shelved. Then the Unclaimed Shelves, by the Ledger Office.',
          'A blue bottle. Number 2207. Tied with a bit of yellow ribbon, if they kept it on. She liked yellow.',
        ],
      },
      {
        lines: [
          'Two Draws back they called my number for the pledge. I had nothing they wanted. Except Elsie.',
          'My wife. Thirty years gone. They took her face. I remember her laugh and her coat and not her face.',
          'My ticket lapses tomorrow at the Draw. Then she goes in the Lethe. I sit here. I try to picture her.',
        ],
      },
    ],
    barks: [
      { when: { questDone: Q_ELSIE }, lines: ['A gap in her teeth.', 'Elsie. Elsie Wren.'] },
      { lines: ['I had her face this morning. No.', 'Yellow. She liked yellow.', 'Two thousand two hundred and seven.'] },
    ],
  },

  // ── Miriam Tally — the pawn clerk ────────────────────────────────────
  {
    id: 'remembrance-tally',
    name: 'Miriam Tally',
    title: 'Tally & Daughters, Pledges',
    look: { body: 0xe0caa8, accent: 0x7a2a22, hat: 'visor', traits: ['book', 'glasses'], size: 0.92 },
    at: { x: 670, y: 760 },
    talks: [
      {
        when: KING,
        lines: [
          'I\'m giving the shop to my daughters, and they\'re turning it into a lending library. Of stories.',
          'You bring a memory and tell it out loud, and someone writes it down, and you keep the memory. Imagine.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'I\'ve burnt the ticket book. All of it. Let them come and arrest me — they\'d have to remember to.',
          'Every pledge in my hand is void. I wrote that on the window in soap, so it\'s nearly official.',
        ],
      },
      {
        when: { questDone: Q_ELSIE },
        lines: [
          'Old Wren came in this morning to thank me. He brought cake. He told me what his wife looked like.',
          'Forty years I\'ve drawn faces off people. Nobody ever told me one before.',
        ],
      },
      {
        lines: [
          'Pledges, love? Number first, then the memory. A good one, mind — the House won\'t take a dull week.',
          'I draw it off with the glass, cork it, write it up. You get the ticket. Second Draw, it lapses.',
          'I don\'t like it. My mother did it and her mother. You keep a trade so somebody kinder doesn\'t get it.',
        ],
      },
    ],
    barks: [
      { lines: ['Number first, then the memory.', 'Mind the glass, love, it\'s cold.', 'Next pledge!'] },
    ],
  },

  // ── Mother Sudds — the Lethe washerwoman ─────────────────────────────
  {
    id: 'remembrance-sudds',
    name: 'Mother Sudds',
    title: 'Washerwoman of the Lethe',
    look: { body: 0xd4bea4, accent: 0x9fb4b2, hat: 'headwrap', traits: ['apron', 'tool'], size: 1.15 },
    at: { x: 1760, y: 930 },
    talks: [
      {
        when: KING,
        lines: [
          'I\'ve hung the sheets out and left them. Wind\'ll take whatever\'s in them. Let it go up, not down.',
          'Ned\'s teaching me cards. He\'s a terrible cheat. He gets that from his mother. I remember that now.',
        ],
      },
      {
        when: { questDone: Q_FLUKES },
        lines: [
          'Ned knew me this morning. Came down to the copper and said "Gran". Just like that. "Gran."',
          'I\'ve washed a thousand people out of these sheets. I\'d have washed a thousand more for that.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'No more lapsed bottles coming down. The coppers are cold. I don\'t know what to do with my hands.',
          'I\'ve started washing actual laundry. Strangest thing. It comes out clean and it\'s still a shirt.',
        ],
      },
      {
        when: { quest: Q_FLUKES },
        lines: [
          'Flukes. Forgetful flukes, off the Lethe. Fortune rod, mind. They feed on what we pour out.',
          'If my Ned\'s mother is anywhere, it\'s in the belly of a fluke. Bring me two. I\'ll do the rest.',
        ],
      },
      {
        lines: [
          'Lapsed bottles come down here, and I pour them in, and the water takes them. Then I wring the sheets.',
          'My grandson Ned pawned his mother when he was nine. His number came up. He didn\'t know what to give.',
          'He chose the nicest thing he had. They always do, the young ones. He doesn\'t remember her at all.',
        ],
      },
    ],
    barks: [
      { when: { questDone: Q_FLUKES }, lines: ['"Gran," he said.', 'Just like that.'] },
      { lines: ['Wring it out, wring it out.', 'Don\'t drink that, love.', 'Another crate of lapsed.'] },
    ],
  },

  // ── Oriel Fenn — the portrait painter ────────────────────────────────
  {
    id: 'remembrance-oriel',
    name: 'Oriel Fenn',
    title: 'Portraitist',
    look: { body: 0xe4ccb0, accent: 0x8a5a7a, hat: 'beanie', traits: ['tool', 'scarf'], size: 0.9, eye: 0x9cc4ff },
    at: { x: 300, y: 600 },
    talks: [
      {
        when: KING,
        lines: [
          'I\'m painting the whole town. Everyone. In colour. Sepia is a fine wash for a Prince and no one else.',
          'The Curator says portraits must be dignified. I\'ve painted her laughing. She\'s furious. It\'s lovely.',
        ],
      },
      {
        when: { questDone: Q_PORTRAIT },
        lines: [
          'My mother. Back on the wall. Patched, but back. People stop in front of it and say "I knew her".',
          'That\'s all a portrait is for, really. So someone can stand in front of it and say "I knew her".',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The gallery\'s faces are coming back. Faint at first, then more. I\'ve been touching them up.',
          'Some of them I painted. I didn\'t know until they came back. My own work, and I\'d forgotten it.',
        ],
      },
      {
        when: { quest: Q_PORTRAIT, stage: 1 },
        lines: [
          'All the strips. Good. The Curator\'s on the forecourt with her chalks. She\'ll want them back.',
          'She tore it, you know. My mother. Said a pawned face mustn\'t hang where it reminds people.',
        ],
      },
      {
        when: { quest: Q_PORTRAIT },
        lines: [
          'The strips blew all over the forecourt and the lawn behind. Four of them. Canvas, brown on the back.',
        ],
      },
      {
        lines: [
          'I painted portraits for the gallery for twenty years. Then they started forgetting on the wall.',
          'When a face is pawned, its portrait fades. Canvas, blank, by the next Draw. That\'s the Prince\'s rule.',
          'My mother pawned her own face for my sister\'s week. Her portrait went blank, and then it was torn.',
        ],
      },
    ],
    barks: [
      { lines: ['Hold still. Don\'t hold still. No — hold still.', 'Burnt umber. Always burnt umber.', 'Faces, faces.'] },
    ],
  },

  // ── Number Forty-One — a busted croupier ─────────────────────────────
  {
    id: 'remembrance-forty-one',
    name: 'Forty-One',
    title: 'Busted — black chip',
    look: { body: 0xb8a48c, accent: 0x141210, hat: 'visor', traits: ['bandage', 'tool'], size: 1.05 },
    at: { x: 1540, y: 860 },
    wander: 50,
    talks: [
      {
        when: KING,
        lines: [
          'They melted the black chips into a bell. I rang it. Hollis Mabbott rang the bell. HOLLIS MABBOTT.',
          'I\'m going to say it until I\'m sick of it. I don\'t think I\'ll ever be sick of it.',
        ],
      },
      {
        when: { questDone: Q_FORTY_ONE },
        lines: [
          'Hollis. Hollis Mabbott. I\'m not allowed to say it on duty. I\'m saying it under my breath. Hollis.',
          'I swept this lane eleven years without a name. I\'m going to sweep it once more with one. Then stop.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The House hasn\'t sent the sweep rota. Do I sweep? Nobody\'s said. I swept. Habit. Forty-One sweeps.',
        ],
      },
      {
        when: { quest: Q_FORTY_ONE },
        lines: [
          'The Ledger Office. Quill keeps the books. My name\'s in one of them, struck through.',
          'Read it to me. Don\'t write it. If it\'s written they can strike it again.',
        ],
      },
      {
        lines: [
          'Forty-One, sir. Busted. Black chip. I wagered at the House for my daughter\'s re-draw. House won.',
          'A busted man serves by number and may not speak his name. I did as told. Now I can\'t remember it.',
          'It\'s in the Ledger Office somewhere. Struck through. Would — no. Never mind. I\'ll sweep.',
        ],
      },
    ],
    barks: [
      { when: { questDone: Q_FORTY_ONE }, lines: ['Hollis.', 'Hollis Mabbott, sweeping.'] },
      { lines: ['Forty-One, sweeping.', 'Mind your feet, sir.', 'Black chip, sir. No name, sir.'] },
    ],
  },

  // ── Absalom Quill — the ledger-keeper ────────────────────────────────
  {
    id: 'remembrance-quill',
    name: 'Absalom Quill',
    title: 'Keeper of the Ledgers',
    look: { body: 0xd0bca0, accent: 0x3a3060, hat: 'nightcap', traits: ['glasses', 'book', 'pipe'], size: 1.05 },
    at: { x: 2040, y: 610 },
    talks: [
      {
        when: KING,
        lines: [
          'I am un-striking. It\'s slower than striking. You have to read every name and say it, then rule it clean.',
          'Eleven thousand, four hundred so far. My voice has gone. I\'m mouthing them. It still counts.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'His Highness said the ledgers may be opened. Opened! I have never opened a ledger for reading.',
          'Only for writing in. Did you know the bindings creak differently when it\'s reading? Higher.',
        ],
      },
      {
        when: { questDone: Q_FORTY_ONE },
        lines: [
          'Mabbott, H. I read it aloud. To a stranger, in my own office. The Censor will have my nib for it.',
          'Let her. I\'ve been looking at the names under the lines all morning. You can read most of them.',
        ],
      },
      {
        lines: [
          'Every pledge in the court comes to me in a clerk\'s hand. I enter it. Number, memory, date, fee.',
          'Lapsed, I strike it. A busted name, I strike it. A struck name is not to be read. That\'s the rule.',
          'The ink\'s thin, though. You can always read under the line, if you hold it to the window. I don\'t.',
        ],
      },
    ],
    barks: [
      { lines: ['Number, memory, date, fee.', 'Rule it, blot it, shelve it.', 'Not to be read. Not to be read.'] },
    ],
  },

  // ── Rosamund Beck — the Prince's old nurse ───────────────────────────
  {
    id: 'remembrance-beck',
    name: 'Rosamund Beck',
    title: 'Once Nurse to the Prince',
    look: { body: 0xe8d6c0, accent: 0x6a4a5a, hat: 'veil', traits: ['cane', 'glasses'], size: 0.85 },
    at: { x: 1500, y: 1475 },
    talks: [
      {
        when: KING,
        lines: [
          'I\'ve scraped my windows. All of them. I can see the street now. I know most of it.',
          'He comes on Sundays, the boy. He brings photographs. We sort them together, his and mine.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'He came down the Quiet Street this morning. Alone. He knocked. He asked me what he was like.',
          'I told him he was a kind boy who cried at Draws. He said he\'d like to be again. Imagine that.',
        ],
      },
      {
        when: { quest: Q_ARCHIVE },
        lines: [
          'You want to know about little Hindsight? Sit. My windows are white, but my memory\'s good. Mostly.',
        ],
      },
      {
        lines: [
          'I nursed one of the King\'s lucky children, once. A long time ago. I paint my windows so I won\'t look.',
          'Painting your windows is a thing we do on this street. What you can\'t see you can\'t miss.',
          'I won\'t say which child. I signed something. I don\'t remember what. I remember signing.',
        ],
      },
    ],
    barks: [
      { lines: ['White windows, quiet street.', 'Is it Draw day? Is it?', 'He used to cry at Draws, that boy.'] },
    ],
  },

  // ── Steward Lisle — the Prince's steward ─────────────────────────────
  {
    id: 'remembrance-lisle',
    name: 'Steward Lisle',
    title: 'Steward of the Archive',
    look: { body: 0xdcc8ac, accent: 0x8a5a7a, hat: 'tophat', traits: ['book', 'glasses'], size: 1.1, eye: 0xf6c060 },
    at: { x: 1300, y: 420 },
    talks: [
      {
        when: KING,
        lines: [
          'The King is fallen and the drum had a false bottom, and the favourites\' Lots were all in it. All of them.',
          'His Highness\'s was there. He has been holding it all morning. He was never drawn. He never could be.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'His Highness is in the reading room. With the doors open. Handing bottles back by number.',
          'He reads each ticket aloud and says "I\'m sorry" to the name on it. It will take him a year.',
        ],
      },
      {
        when: { courtReady: 'remembrance' },
        lines: [
          'All five of them. His Highness watched from the spyglass. He says he knew you would. He always says that.',
        ],
      },
      {
        lines: [
          'The Archive of His Highness. Every memory pawned in the court is catalogued here, by number.',
          'His Highness sees the town through the spyglass, backwards. He says it is the only way to see it clearly.',
          'Petitions to redeem are heard on no day of the week. Good afternoon.',
        ],
      },
    ],
    barks: [
      { lines: ['Catalogued. Shelved. Closed.', 'His Highness is not receiving.', 'By number, please.'] },
    ],
  },
];

// ── The crowd ────────────────────────────────────────────────────────

const looks: NpcLook[] = [
  { body: 0xd8c0a0, accent: 0x5a8ee0, hat: 'cap', traits: ['scarf'] },
  { body: 0xc8a888, accent: 0x8c4a3c, hat: 'tophat', traits: ['cane'] },
  { body: 0xe4d0b4, accent: 0x6a4a5a, hat: 'veil', traits: ['book'] },
  { body: 0xb89878, accent: 0x2f6a4a, hat: 'visor', traits: ['satchel'] },
  { body: 0xdcc4a8, accent: 0x9cc4ff, hat: 'none', traits: ['scarf'], size: 0.76 },
  { body: 0xc0a080, accent: 0x141210, hat: 'cap', traits: ['tool', 'bandage'] },
  { body: 0xe8d8c0, accent: 0xd2a448, hat: 'hood', traits: ['lantern'] },
  { body: 0xccb090, accent: 0x7a6246, hat: 'nightcap', traits: ['glasses', 'cane'], size: 0.9 },
  { body: 0xd4bc9c, accent: 0xa880f0, hat: 'jester', traits: ['pack'], size: 0.8 },
];

const barks: Talk[] = [
  {
    when: KING,
    lines: [
      'The drum had a false bottom!',
      'I said my own name in the square!',
      'I remember my wedding. I REMEMBER it.',
      'Scrape your windows, Doris!',
    ],
  },
  {
    when: PRINCE,
    lines: [
      'The Archive\'s handing bottles back!',
      'He said sorry. The Prince said sorry.',
      'I got my first snow back. It was cold!',
      'Nobody\'s pawning today.',
    ],
  },
  {
    when: { courtReady: 'remembrance' },
    lines: [
      'All five of them beaten. By a stranger.',
      'The stranger\'s going up to the Archive.',
    ],
  },
  {
    lines: [
      'Is it Draw week? I forget.',
      'Tie a string on it, then.',
      'My number came up for the pledge.',
      'Walk in the blue. It helps you keep.',
      'Don\'t look at the white windows.',
      'Second Draw and it\'s lapsed.',
      'I had a dog. I think I had a dog.',
      'They took my first snow.',
      'Somebody\'s face. Whose face?',
    ],
  },
];

export const REMEMBRANCE_CROWD: NonNullable<AreaDef['crowd']> = {
  count: 14,
  looks,
  paths: [
    // Up and down Pawn Row.
    [{ x: 120, y: 800 }, { x: 1000, y: 800 }, { x: 1000, y: 820 }, { x: 120, y: 820 }],
    // Round Redemption Square.
    [{ x: 1040, y: 740 }, { x: 1360, y: 740 }, { x: 1360, y: 900 }, { x: 1040, y: 900 }],
    // The Archive Walk.
    [{ x: 1200, y: 640 }, { x: 1200, y: 460 }, { x: 1200, y: 640 }],
    // The east lane to the Lethe and the Ledger Office.
    [{ x: 1380, y: 800 }, { x: 2260, y: 800 }, { x: 1950, y: 800 }, { x: 1950, y: 620 }, { x: 1950, y: 800 }],
    // The south road and the field path.
    [{ x: 1200, y: 980 }, { x: 1200, y: 1250 }, { x: 200, y: 1250 }, { x: 1200, y: 1250 }],
    // The Quiet Street, slowly.
    [{ x: 1280, y: 1475 }, { x: 2250, y: 1475 }, { x: 1280, y: 1475 }],
    // Down the Lethe path.
    [{ x: 1642, y: 840 }, { x: 1642, y: 1440 }, { x: 1642, y: 840 }],
  ],
  barks,
};
