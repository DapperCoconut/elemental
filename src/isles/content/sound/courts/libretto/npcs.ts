import type { AreaDef, NpcDef, NpcLook, Talk } from '../../../../IslesTypes';

/**
 * The people of the Libretto Court.
 *
 * Libretto writes the words of the Maestro's Score. Copyists copy it four hundred times a day in
 * the scriptoria; the presses print it as hymn sheets for every house; the Censor reads every
 * other word anybody writes and strikes it out in red. Paper and ink are rationed by his Office,
 * letters are read before they are sent and most are not sent. So people here talk the way they
 * write: carefully, quietly, and with half of it left out. Many whisper (talk between the Hours
 * is noise); the muted sign; and everyone knows somebody whose words are in the Censor's bins.
 */

const PRINCE = { prince: 'folio' } as const;
const MAESTRO = { monarch: 'cadenza' } as const;

const Q_LULLABY = 'libretto-q-lullaby';
const Q_INK = 'libretto-q-signers-ink';
const Q_LETTERS = 'libretto-q-dead-letters';
const Q_MARGIN = 'libretto-q-marginalia';
const Q_RAGBOY = 'libretto-q-rag-boy';

export const LIBRETTO_NPCS: NpcDef[] = [
  // ── Odile Foolscap — the stationer (shop) ────────────────────────────
  {
    id: 'libretto-foolscap',
    name: 'Odile Foolscap',
    title: 'Quires & Quills',
    look: { body: 0xe0c8b0, accent: 0xc8242c, hat: 'beanie', traits: ['apron', 'glasses', 'satchel'], size: 1 },
    at: { x: 1020, y: 1015 },
    role: { kind: 'shop', id: 'libretto-shop' },
    talks: [
      {
        when: MAESTRO,
        lines: [
          'I sold a whole ream this morning to a woman who said she was going to write a song. A WHOLE REAM.',
          'No ration slip. No proof. She just wanted it. Charms are on the board, same as ever. Everything else is free.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The Office is shut. The Censor\'s been sat on his own step all morning reading a book. For pleasure.',
          'People are buying paper with nothing printed on it. Blank paper! I had to find some at the back.',
        ],
      },
      {
        when: { questDone: Q_MARGIN },
        lines: [
          '(whispering) Somebody pinned a little drawing on the Galley. A cat, in a margin. Half the court went to look.',
          'Nobody struck it out. I sold out of pencils by noon. I\'m choosing not to ask why.',
        ],
      },
      {
        lines: [
          '(whispering) Quires and quills. Ink by the ration slip, paper by the ration slip, sealing wax by the stick.',
          'You can buy as much as you like. You can only write what the Office passes. That\'s the trouble.',
          'Charms are on the board — you can wear three. Stationer\'s things, but the copyists swear by them.',
          'Mind you whisper. It\'s not an Hour, and the wardens from the Hush come down this terrace on Thursdays.',
        ],
      },
    ],
    barks: [
      { when: PRINCE, lines: ['Blank paper! Blank, for anything!', 'No slip needed!'] },
      { lines: ['(whispering) Quills, fresh cut.', '(whispering) Ruled or plain?', '(whispering) Slip, please.', '(whispering) Sealing wax, red only.'] },
    ],
  },

  // ── Ezra Quoin — the old compositor ──────────────────────────────────
  {
    id: 'libretto-quoin',
    name: 'Ezra Quoin',
    title: 'Compositor, the Press Hall',
    look: { body: 0xc8b8a4, accent: 0x6e7076, hat: 'cap', traits: ['apron', 'glasses', 'beard'], size: 0.95 },
    at: { x: 1880, y: 1240 },
    talks: [
      {
        when: MAESTRO,
        lines: [
          'I set a song this morning. A whole song, mine, start to finish. Fourteen lines. My hands shook the whole time.',
          'The type didn\'t care. It never did. Lead doesn\'t know what it\'s saying. That was always the trouble.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The Prince came down to the Hall and asked to see the lullaby. Asked! He read it twice. He didn\'t strike it.',
          'He said he used to know one like it. Then he went very quiet and helped me ink the forme.',
        ],
      },
      {
        when: { questDone: Q_LULLABY },
        lines: [
          'Forty copies. Forty, pulled on the old press while the Inspector was busy being knocked about by you.',
          'Every cradle on this terrace has one tucked under the blanket. Folded small. Mothers hum it. Very quietly.',
        ],
      },
      {
        when: { quest: Q_LULLABY },
        lines: [
          '(whispering) The four sorts are hidden round the yard — by the presses, in the type case, under the bundles.',
          'Bring them to Nib. He\'ll lock the forme up and pull a proof before anybody thinks to look.',
        ],
      },
      {
        lines: [
          '(whispering) Forty years I\'ve set the Score in lead. Every word the isle sings, I\'ve had backwards in my hand.',
          'You read type backwards, you know. Mirror-wise. After forty years I read the Score backwards, in my head.',
          'It\'s much better backwards. You can\'t tell what it\'s ordering you to do.',
        ],
      },
    ],
    barks: [
      { when: { questDone: Q_LULLABY }, lines: ['(humming, very low)', 'Forty copies.'] },
      { lines: ['(whispering) Mind the quoins.', '(whispering) Backwards, always backwards.', '(whispering) Ink the forme.'] },
    ],
  },

  // ── Nib — the printer's devil ────────────────────────────────────────
  {
    id: 'libretto-nib',
    name: 'Nib',
    title: 'Printer\'s Devil',
    look: { body: 0x9a7a62, accent: 0x16141c, hat: 'cap', traits: ['apron', 'tool'], size: 0.75 },
    at: { x: 2120, y: 1245 },
    talks: [
      {
        when: MAESTRO,
        lines: [
          'I\'m printing a newspaper! Well. A sheet. It\'s got the weather on it and a drawing of a dog.',
          'Quoin says nobody\'s printed weather on Choirholm for forty years. It\'s going to snow. I printed that.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The presses still go, but nobody\'s brought the day\'s Score down from the Bindery. So we\'re just… printing.',
          'Quoin let me set my own name. In big type. It\'s on the wall. N, I, B.',
        ],
      },
      {
        when: { questDone: Q_LULLABY },
        lines: [
          'I pulled every one of those copies myself. My arms! You have to lean on the bar with your whole weight.',
          'My mum hummed it last night. She didn\'t know I\'d printed it. I didn\'t tell her. It\'s better a secret.',
        ],
      },
      {
        lines: [
          'I\'m the devil. Not a real one. A printer\'s devil — it means the boy who gets inky. That\'s all I am, inky.',
          'I can lock a forme and pull a proof faster than anyone. Quoin says so. Don\'t tell the Inspector.',
        ],
      },
    ],
    barks: [{ lines: ['Pull!', 'Inky again.', 'Mind your sleeve on the ink ball!', 'One more for the Office…'] }],
  },

  // ── Hester Vellum — the signer ───────────────────────────────────────
  {
    id: 'libretto-vellum',
    name: 'Hester Vellum',
    title: 'Teacher of Hands',
    look: { body: 0xe8dcc8, accent: 0xf4f6fa, hat: 'veil', traits: ['scarf', 'book'], size: 0.95 },
    at: { x: 1090, y: 650 },
    talks: [
      {
        when: MAESTRO,
        lines: [
          '(her ribbon is gone. Her voice, when it comes, is cracked from twenty years in a pipe.) Hello.',
          '(she laughs, then signs, from habit:) I keep forgetting I can say it. Hello. Hello. Thank you.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          '(she signs, fast and bright: The Office says paper is unrationed. My pupils wrote all morning.)',
          '(signs: One wrote a whole page to her mother in the Organ. She will read it to her when she comes home.)',
        ],
      },
      {
        when: { questDone: Q_INK },
        lines: [
          '(she signs, and points at her pupils on the step, each with an inkpot: Ink. Their own. Unrationed.)',
          '(signs: The muted cannot speak, so we write. Now we can write. Thank you — this sign is "thank you".)',
        ],
      },
      {
        when: { quest: Q_INK },
        lines: [
          '(she signs a fish, a long one with a pointed snout, then a pen: The nib pike. Their ink is free.)',
          '(signs: Two of them. Take them to Gall at the Inkwell. She knows how to make ink of them. Quietly.)',
        ],
      },
      {
        lines: [
          '(a woman with a white silk ribbon at her throat. She signs, slowly, so you can follow: Hello. Hester.)',
          '(signs: I teach the muted to talk with their hands. Hands are not noise. The wardens cannot fine hands.)',
          '(signs: But some things need writing down. And ink is rationed by the Office. And the muted get no slip.)',
        ],
      },
    ],
    barks: [
      { when: MAESTRO, lines: ['Hello! Hello.', '(singing, off-key, delighted)'] },
      { lines: ['(signs: good morning)', '(signs: slower — again)', '(signs: well done)'] },
    ],
  },

  // ── Gall Oakapple — the ink-maker ────────────────────────────────────
  {
    id: 'libretto-gall',
    name: 'Gall Oakapple',
    title: 'Ink-Maker, the Inkwell',
    look: { body: 0x8a7a6a, accent: 0x1f2a4a, hat: 'hood', traits: ['apron', 'rod'], size: 1.1 },
    at: { x: 950, y: 1345 },
    talks: [
      {
        when: MAESTRO,
        lines: [
          'I made a blue this morning. Blue! Out of a pike, some woad and a lot of swearing. Nobody\'s had blue in years.',
          'The Office only ever allowed black. Black for the Score and red for the striking. I\'m making green next.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The Rationer dropped her ledger in the Inkwell. Watched it sink. Then she bought ink. From me.',
          'Paid for it like anybody. Asked for a nice black. I gave her the nicest black I\'ve got.',
        ],
      },
      {
        when: { questDone: Q_INK },
        lines: [
          'Hester\'s pupils have ink of their own now — enough for a winter, out of your two pike.',
          'The Rationer still has a bruise. I hear she has started rationing her own words. I wish her luck.',
        ],
      },
      {
        lines: [
          'Ink-maker. Oak-gall and iron and gum for the Score\'s black. The Office rations every drop I make. Every drop.',
          'There is one ink they don\'t ration, because they don\'t know about it: the sac of a nib pike. Lovely and dark.',
          'The Inkwell\'s full of them. You\'d need a decent rod. Don\'t tell the Office I told you.',
        ],
      },
    ],
    barks: [{ lines: ['Black. Always black.', 'Mind the drips.', 'Pike are biting.', 'Gall and iron, gall and iron…'] }],
  },

  // ── Tibb Ashlar — the boy who writes to the Organ ────────────────────
  {
    id: 'libretto-tibb',
    name: 'Tibb Ashlar',
    title: 'Letter-Writer, Aged Nine',
    look: { body: 0xd8b494, accent: 0x5a86d8, hat: 'beanie', traits: ['scarf', 'satchel'], size: 0.7 },
    at: { x: 1310, y: 1060 },
    talks: [
      {
        when: MAESTRO,
        lines: [
          'They\'re opening the pipes! One a day! Gran\'s pipe is number four hundred and twelve. That\'s soon, Quoin says.',
          'I\'m going to read her all my letters out loud. All of them. Even the boring ones about porridge.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The Dead Letter Office is open and you can just take your letters back. I took eleven.',
          'There were thousands in there. Sacks. Everybody on the terrace went in. Some people were crying.',
        ],
      },
      {
        when: { questDone: Q_LETTERS },
        lines: [
          'You sent them up the mountain! On the wind! Gran can\'t read them, she\'s in a pipe. But she might hear them.',
          'Rubric says the caves remember everything you say. So I said them all out loud, first. To make sure.',
        ],
      },
      {
        when: { quest: Q_LETTERS },
        lines: [
          'The bins are by the Office door — the wire ones. My letters are the ones with the blue string. Three.',
          'Then up the North Road to the cave-mouth. The wind goes up there. It goes all the way to the cathedral.',
        ],
      },
      {
        lines: [
          'I write to my gran every week. She\'s in the Organ. She sang her own words at a christening once.',
          'At Compline you can hear her. Four hundred and twelfth pipe. A bit flat. She was always a bit flat.',
          'I post the letters at the Office. They go in the bins. The Censor says the Organ doesn\'t get post.',
        ],
      },
    ],
    barks: [
      { when: { questDone: Q_LETTERS }, lines: ['They went up the mountain!', 'Dear Gran…'] },
      { lines: ['Dear Gran…', '(whispering) Four hundred and twelve.', 'Is it Compline yet?'] },
    ],
  },

  // ── Marginalia Fell — the copyist who draws ──────────────────────────
  {
    id: 'libretto-fell',
    name: 'Marginalia Fell',
    title: 'Copyist, the West Scriptorium',
    look: { body: 0xe6d0b8, accent: 0x8a52c4, hat: 'nightcap', traits: ['glasses', 'book', 'scarf'], size: 0.95 },
    at: { x: 880, y: 515 },
    talks: [
      {
        when: MAESTRO,
        lines: [
          'I am drawing on a whole page. Not in the margin. In the MIDDLE. A cat. A big one. It\'s taking me all week.',
          'Rubric comes by and looks at it every hour and tuts and smiles. He has started bringing biscuits.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The Prince came into the scriptorium. Walked down the desks. Stopped at mine, and looked at the margins.',
          'He said, "Is that a cat?" I said yes. He said, "I used to draw birds." Then he left. Isn\'t that odd?',
        ],
      },
      {
        when: { questDone: Q_MARGIN },
        lines: [
          'My cat\'s on the Galley! Right in the middle of all the struck verses. And Blackline came, and you saw him off.',
          'Four hundred copies a day of the Score, and one cat. I think that\'s a fair ratio. I\'m keeping it.',
        ],
      },
      {
        when: { quest: Q_MARGIN },
        lines: [
          '(whispering) Rubric has my book in the east scriptorium. Ask him nicely. He\'s softer than he looks.',
          'Then pin a page on the Galley in the square. Just one. Just so it was there, once, for everyone.',
        ],
      },
      {
        lines: [
          '(whispering) Four hundred copies of the Score a day. Every letter the same. Every margin a hand\'s breadth.',
          'I draw in the margins. Little things. A cat, a cup, a bird on a stave. Then I scrape them off before proof.',
          'Mostly. Rubric found a whole book of them. He took it. He hasn\'t handed it in. Yet.',
        ],
      },
    ],
    barks: [
      { when: { questDone: Q_MARGIN }, lines: ['A cat on the Galley!', 'Margins are for cats.'] },
      { lines: ['(whispering) A hand\'s breadth.', '(whispering) Same letter, same letter.', '(whispering) Scrape it off.'] },
    ],
  },

  // ── Precentor Rubric — head of the scriptoria ────────────────────────
  {
    id: 'libretto-rubric',
    name: 'Precentor Rubric',
    title: 'Master of the Scriptoria',
    look: { body: 0xd0c0a8, accent: 0xc8242c, hat: 'mitre', traits: ['book', 'glasses', 'cane'], size: 1.15 },
    at: { x: 1520, y: 515 },
    talks: [
      {
        when: MAESTRO,
        lines: [
          'The copyists have asked what they should copy now. I said: whatever you like. They stared at me for an hour.',
          'Then one of them started copying a recipe for jam. In her best hand. It is the most beautiful thing I own.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'His Highness used to come to the scriptoria as a boy, from the mill. He would stand at the windows and watch.',
          'He drew birds on the frost on the glass. I wiped them off. I was very conscientious in those days.',
        ],
      },
      {
        when: { questDone: Q_MARGIN },
        lines: [
          'I gave the girl her book back. I should have handed it to the Office. I have been the Precentor thirty years.',
          'And I find I did not want to. It is a very good cat. The Score has no cats in it. That was always its fault.',
        ],
      },
      {
        lines: [
          'I keep the scriptoria: two halls, two hundred desks, four hundred copies of the Score a day, all true.',
          'The copy is checked against the Prince\'s fair copy, line by line. A blot is a fine. A flourish is a fine.',
          'A drawing in a margin is noise, written down. I am supposed to know what to do with noise. I always have.',
        ],
      },
    ],
    barks: [{ lines: ['Line by line.', 'A hand\'s breadth, there.', 'Slower, and truer.', 'The Hour approaches.'] }],
  },

  // ── Archivist Colophon — keeper of the Bindery ───────────────────────
  {
    id: 'libretto-colophon',
    name: 'Archivist Colophon',
    title: 'Keeper of the Bindery',
    look: { body: 0xc8b49a, accent: 0xd8a93c, hat: 'tophat', traits: ['book', 'glasses', 'beard'], size: 1.05 },
    at: { x: 2160, y: 580 },
    talks: [
      {
        when: MAESTRO,
        lines: [
          'The Bindery is binding a new book: every song the muted sing as they come home, set down as they sing it.',
          'It will be the worst-edited book in the history of Choirholm. Every page a different hand. I adore it.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'His Highness has taken the scrap out of his pocket and pinned it to the Bindery door. His song. The rag-boy\'s.',
          'People come and read it. It isn\'t very good. He knows. He says that\'s why he wants it read.',
        ],
      },
      {
        when: { courtReady: 'libretto' },
        lines: [
          'All five of his clerks, struck through. His Highness heard. He has sent for his red pen and his oldest coat.',
          'Before you go in to him — I have something to ask. About a scrap of paper, and a boy from the mill.',
        ],
      },
      {
        lines: [
          'The Bindery. Every Score the isle sings is sewn and cased here, in the Maestro\'s red and gilt. I keep them.',
          'His Highness writes every word. Every Hour, a new verse, and the old ones struck. He never writes his own.',
          'He was not always like this. Bring down his five clerks and come back. Then I will tell you about the mill.',
        ],
      },
    ],
    barks: [{ lines: ['Sixteen pages to a quire.', 'Gilt on the spine.', '(whispering) Not yet. Not yet.'] }],
  },

  // ── Vatman Brede — the paper mill ────────────────────────────────────
  {
    id: 'libretto-brede',
    name: 'Vatman Brede',
    title: 'The Paper Mill',
    look: { body: 0xb89a80, accent: 0x5e7a7a, hat: 'souwester', traits: ['apron', 'beard', 'tool'], size: 1.25 },
    at: { x: 330, y: 615 },
    talks: [
      {
        when: MAESTRO,
        lines: [
          'The rag carts are coming in full. Everybody\'s giving up their Hours robes — the grey ones — to be pulped.',
          'Good paper, grey robes. Soft. I\'ve made a ream. Folio took the first sheet. He says he\'ll write on it.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'He came to the mill. Stood at the vat where he stood as a lad. Put his hands in the pulp, to the wrist.',
          'Didn\'t say anything. Stood there till the water-wheel had gone round a hundred times. Then he went home.',
        ],
      },
      {
        when: { questDone: Q_RAGBOY },
        lines: [
          'You gave him his song back. Or you gave him the nerve to take it back. Same thing, from where I\'m standing.',
          'Come by the vat any time. I\'ll show you how to lay a sheet. Everybody ought to make one sheet in their life.',
        ],
      },
      {
        lines: [
          'Vatman. I dip the mould in the pulp and lift a sheet. Forty years, ten thousand a day. Every sheet here.',
          'Rags in, paper out. Old shirts, old sails, old Hours robes. You\'d be surprised what the Score is written on.',
          'The water-wheel never stops. I\'ve stopped listening to it. You don\'t, after a while. You can\'t.',
        ],
      },
    ],
    barks: [{ lines: ['Dip, lift, shake.', 'Rags in, paper out.', 'Mind the race.', 'Ten thousand and one.'] }],
  },
];

const looks: NpcLook[] = [
  { body: 0xe0c8b0, accent: 0x16141c, hat: 'hood', traits: ['book'] },
  { body: 0xd4b89c, accent: 0xc8242c, hat: 'cap', traits: ['apron', 'satchel'] },
  { body: 0xc8a888, accent: 0x5e7a7a, hat: 'beanie', traits: ['scarf'] },
  { body: 0xe8d4bc, accent: 0xd8a93c, hat: 'nightcap', traits: ['glasses', 'book'] },
  { body: 0xb8987c, accent: 0x6a2e22, hat: 'tophat', traits: ['cane'], size: 1.1 },
  { body: 0xdcc0a4, accent: 0x8a52c4, hat: 'none', traits: ['pack'], size: 0.72 },
  { body: 0xe4ccb4, accent: 0xf4f6fa, hat: 'veil', traits: ['scarf'] },
  { body: 0xc4a68a, accent: 0x1f2a4a, hat: 'earmuffs', traits: ['lantern'] },
];

const barks: Talk[] = [
  {
    when: MAESTRO,
    lines: [
      'I wrote my name! On a wall!',
      'Blank paper, for anything!',
      'My brother\'s pipe opens tomorrow!',
      'Sing it however you like!',
    ],
  },
  {
    when: PRINCE,
    lines: [
      'The Office is shut!',
      'The Prince yielded!',
      'Nobody struck it out!',
      '(whispering) Is it allowed? Is it really?',
    ],
  },
  {
    when: { courtReady: 'libretto' },
    lines: [
      '(whispering) All five of the Prince\'s clerks…',
      '(whispering) The stranger\'s going to the Bindery.',
    ],
  },
  {
    lines: [
      '(whispering) Is it near Vespers?',
      '(whispering) Slip, please.',
      '(whispering) They struck my verse again.',
      '(whispering) Shh — a warden.',
      '(signs: hello)',
      '(whispering) Four hundred copies by Compline.',
      '(whispering) Don\'t blot it.',
      '(whispering) He\'s in the Organ now.',
    ],
  },
];

export const LIBRETTO_CROWD: NonNullable<AreaDef['crowd']> = {
  count: 15,
  looks,
  paths: [
    // Lantern Street, in from the Quay and back.
    [{ x: 2300, y: 810 }, { x: 1700, y: 815 }, { x: 1400, y: 820 }, { x: 1700, y: 815 }],
    [{ x: 1420, y: 840 }, { x: 2000, y: 830 }, { x: 2300, y: 820 }, { x: 2000, y: 830 }],
    // Up and down the North Road between the scriptoria.
    [{ x: 1200, y: 640 }, { x: 1200, y: 380 }, { x: 1200, y: 130 }, { x: 1200, y: 380 }],
    // Round Proof Square.
    [{ x: 1040, y: 760 }, { x: 1360, y: 760 }, { x: 1360, y: 900 }, { x: 1040, y: 900 }],
    // West Street over the race to the mill.
    [{ x: 1000, y: 810 }, { x: 700, y: 810 }, { x: 450, y: 800 }, { x: 330, y: 640 }, { x: 450, y: 800 }, { x: 700, y: 810 }],
    // The South Lane down to the Office and along to the Press Hall.
    [{ x: 1200, y: 1000 }, { x: 1200, y: 1420 }, { x: 1700, y: 1430 }, { x: 1960, y: 1380 }, { x: 1700, y: 1430 }, { x: 1200, y: 1420 }],
    // Down to the Inkwell.
    [{ x: 760, y: 870 }, { x: 760, y: 1140 }, { x: 900, y: 1420 }, { x: 760, y: 1140 }],
  ],
  barks,
};
