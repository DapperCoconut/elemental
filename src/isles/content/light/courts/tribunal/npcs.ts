import type { AreaDef, NpcDef, NpcLook, Talk } from '../../../../IslesTypes';

/**
 * The people of the Tribunal Court.
 *
 * The Tribunal is the court the rest of Solmara is frightened of, so its people do the explaining
 * of how the Noon is *enforced*: what a shade-thief is (anyone caught in unlicensed shade — under a
 * cart, under a hat-brim, under a blanket), what a trial is (public, at noon, under glass, never an
 * acquittal), what bleaching is (the Burning Glass down in the Noon Court, which turns you into a
 * Clear), and who is up the Heliostat. Everyone here is squinting and nobody has slept. They talk
 * about shade the way other towns talk about drink.
 */

const PRINCE = { prince: 'verdict' } as const;
const DESPOT = { monarch: 'auriel' } as const;

const Q_CART = 'tribunal-q-under-the-cart';
const Q_BAIL = 'tribunal-q-bail-in-barbels';
const Q_JUROR = 'tribunal-q-juror-seven';
const Q_BLANKET = 'tribunal-q-blanket';
const Q_APPEAL = 'tribunal-q-appeal';

/** A Clear's look: almost no colour left, a pale blue at the edges. */
const CLEAR = 0xeef6fb;

export const TRIBUNAL_NPCS: NpcDef[] = [
  // ── Ottilie Brief — the shop ─────────────────────────────────────────
  {
    id: 'tribunal-ottilie',
    name: 'Ottilie Brief',
    title: 'Notary & Seals',
    look: { body: 0x5a2a6a, accent: 0xe2b440, hat: 'coif', traits: ['glasses', 'book'], size: 1 },
    at: { x: 930, y: 1298 },
    role: { kind: 'shop', id: 'tribunal-shop' },
    talks: [
      {
        when: DESPOT,
        lines: [
          'I notarised a sunset this evening. "Witnessed: the sun went down." Signed it, sealed it, wept on it.',
          'Charms are still on the rack. The seals are for sale too, now. Nobody has to seal anything any more.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The Prince signed nothing today. Nothing! I sat here with my wax hot and my ribbon cut for nothing.',
          'Someone asked me to notarise an acquittal. I had to look up the form. There wasn\'t one. I made one.',
        ],
      },
      {
        when: { questDone: Q_CART },
        lines: [
          'Old Hesper\'s witness statements went into the record. I sealed them myself. My best wax.',
          'An adjournment. I\'ve never sealed an adjournment. I had to make up how the ribbon goes.',
        ],
      },
      {
        lines: [
          'Notary to the Tribunal. Everything in this court is sworn, sealed and witnessed. Twice. In the sun.',
          'Clarity, stranger: everything must be seen. Doors of glass. No curtains. Nothing folded where it can hide.',
          'Even a letter must be opened in the light before it is sent. I unseal them, read them, reseal them.',
          'Charms on the rack — instruments of the court. You may wear three. They\'re honest. More than most here.',
        ],
      },
    ],
    barks: [
      { when: PRINCE, lines: ['Acquittals! Sealed while you wait!', 'Nothing to witness today. Wonderful!'] },
      {
        lines: [
          'Seals and ribbons!', 'Affidavits sworn in the light!', 'Wax hot, ribbon cut.',
          'Everything witnessed, nothing hidden.',
        ],
      },
    ],
  },

  // ── Linnet Dimm — the granddaughter ──────────────────────────────────
  {
    id: 'tribunal-linnet',
    name: 'Linnet Dimm',
    title: 'Of the Dimms\' Vegetable Cart',
    look: { body: 0xe8c8a8, accent: 0x7aa84a, hat: 'straw', traits: ['satchel'], size: 0.75 },
    at: { x: 780, y: 1524 },
    wander: 40,
    talks: [
      {
        when: DESPOT,
        lines: [
          'Gran and me sat under the cart last night. In the DARK. On purpose. Nobody came.',
          'There were little lights all over the sky. Gran says they\'re stars. I think she\'s making it up.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'They let Gran out of the cage. She said the first thing she wanted was a nap. In the shade. Legally.',
          'Verdict\'s sitting under the big scale. Gran went and sat next to him. She says he snores.',
        ],
      },
      {
        when: { questDone: Q_CART },
        lines: [
          'Adjourned! Gran\'s trial is adjourned! Nobody knows what that means but it isn\'t GUILTY.',
          'She waves at me from six sides at once. I wave back from one. It\'s fine. It\'s nearly fine.',
        ],
      },
      {
        when: { quest: Q_CART },
        lines: [
          'Gran says three people saw our cart and kept quiet. Kept quiet is brave here. Find what they wrote.',
          'Mind the Prosecutor. He says things back to you slower, till they sound like crimes.',
        ],
      },
      {
        lines: [
          'That\'s my gran, in the mirror cage. Hesper Dimm. She was caught asleep under our cart. In its shade.',
          'Shade-thief, they call it. Anyone in shade that isn\'t a licensed Dusk-house. One hour a day, a ticket.',
          'She gave her ticket to me. I\'m eleven. I\'ve never seen a night. Gran says it\'s like a blanket for the sky.',
        ],
      },
    ],
    barks: [
      { when: { questDone: Q_CART }, lines: ['Adjourned! ADJOURNED!', 'Hi Gran! Hi Gran! Hi Gran!'] },
      { lines: ['Hi Gran!', 'Don\'t touch the glass, it\'s hot.', 'Is it noon? It\'s always noon.'] },
    ],
  },

  // ── Hesper Dimm — in the mirror cage ─────────────────────────────────
  {
    id: 'tribunal-hesper',
    name: 'Hesper Dimm',
    title: 'The Accused, Cage Four',
    look: { body: 0xb8a888, accent: 0x7aa84a, hat: 'nightcap', traits: ['cane'], size: 0.9 },
    at: { x: 520, y: 1384 },
    talks: [
      {
        when: DESPOT,
        lines: [
          '(sitting on the empty plinth) They took the cage away. I asked to keep the plinth. It\'s a lovely seat.',
          'I saw a night, dear. A whole one. Seventy-one years and twenty-two of them noon. I didn\'t sleep a wink.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          '(through the open door) They\'ve unlocked it. I\'m sitting in it anyway. I\'ve got used to the view.',
          'The Prince walked past just now. I could see him from six sides. From every side he looked tired.',
        ],
      },
      {
        when: { questDone: Q_CART },
        lines: [
          '(through the glass) Adjourned! Do you know, I think the Prosecutor was relieved. From the left, anyway.',
          'I\'ll sleep tonight. Well — there\'s no tonight. I\'ll sleep at the time tonight would be.',
        ],
      },
      {
        when: { quest: Q_CART },
        lines: [
          '(through the glass) Three statements, dear. Tucked where nobody reads. Which is anywhere in this court.',
        ],
      },
      {
        lines: [
          '(through the glass) Hello, dear! Mind the reflections. You\'ll see the back of your own head in here.',
          'I slept under my cart. It was the best hour I\'ve had in twenty-two years. They\'ll bleach me for it.',
          'I don\'t mind being a Clear so much. I mind that Linnet will have to look through me.',
        ],
      },
    ],
    barks: [
      { lines: ['(waving)', 'Hello, dear!', 'Lovely day. Always is.', 'Is that a cloud? No.'] },
    ],
  },

  // ── Mott Haddle — the fishwife ───────────────────────────────────────
  {
    id: 'tribunal-mott',
    name: 'Mott Haddle',
    title: 'Fishwife, Formerly',
    look: { body: 0xc89878, accent: 0x3a8aa4, hat: 'bandana', traits: ['apron', 'rod'], size: 1.1 },
    at: { x: 2060, y: 1650 },
    wander: 30,
    talks: [
      {
        when: DESPOT,
        lines: [
          'Tam wore his hat down over his eyes all evening. In front of everyone. I\'ve never been prouder.',
          'Somebody wants to change the bail law back. I said leave it. Barbels are the best law we ever had.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'They\'re opening the cells. Every cell. The Bailiff\'s handing out his keys like sweets.',
          'Tam wants to be a fisher. In the Fountain. I said you can\'t, it\'s the Fountain of Testimony. He said watch me.',
        ],
      },
      {
        when: { questDone: Q_BAIL },
        lines: [
          'Tam\'s home. He sleeps with his face in the pillow. I don\'t tell anyone. A pillow is a kind of shade.',
          'Two barbels. Forty years of a clerk\'s spelling and two fish. I\'ll never eat barbel again. Never.',
        ],
      },
      {
        when: { quest: Q_BAIL },
        lines: [
          'Bail barbels, two of them, from the Fountain. They hide under the coins at the bottom. Smart fish.',
          'Then take them to Pettifer on the courthouse steps. Mind the Bailiff. He reads over shoulders.',
        ],
      },
      {
        lines: [
          'My boy\'s in the cells. Pulled his hat down over his eyes against the glare. That\'s shade, they said.',
          'Bail\'s set in barbels. Two. On account of a clerk\'s spelling, forty years back. Nobody dared fix it.',
          'I sold fish on the quay thirty years. Now my hands shake in the heat. Can you fish, stranger?',
        ],
      },
    ],
    barks: [
      { when: { questDone: Q_BAIL }, lines: ['Tam\'s home!', 'No more barbel. Ever.'] },
      { lines: ['Two barbels for a boy.', 'Hat over his EYES.', 'My hands, my hands.'] },
    ],
  },

  // ── Inkle Pettifer — the Clerk of Bail ───────────────────────────────
  {
    id: 'tribunal-pettifer',
    name: 'Inkle Pettifer',
    title: 'Clerk of Bail',
    look: { body: 0x4a4a5a, accent: 0xf2e6c4, hat: 'cap', traits: ['book', 'glasses'], size: 0.95 },
    at: { x: 1560, y: 880 },
    talks: [
      {
        when: DESPOT,
        lines: [
          'I\'ve been asked to write the first by-law of the new court. I wrote "it is permitted to close a door."',
          'Then I closed one. It was the most frightening thing I\'ve ever done. I did it six more times.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'No trials today. I\'ve sat here with my ledger open, taking no bail. I\'ve never been so idle. I love it.',
        ],
      },
      {
        when: { questDone: Q_BAIL },
        lines: [
          'Bail posted, two barbels, stamped and stored in the cool cellar. Which is shade. Don\'t tell anyone.',
          'The Bailiff has agreed the bottom of the Fountain is bright. In writing. I\'ve framed it.',
        ],
      },
      {
        lines: [
          'Clerk of Bail. I take what the law says bail is and I write that it was taken. The law says barbels.',
          'A clerk wrote "barbel" for "bail" in my grandfather\'s day. Under Clarity, what is written is seen.',
          'And what is seen is true. So bail is fish. I don\'t make the law. I only make it legible.',
        ],
      },
    ],
    barks: [
      { lines: ['Next. Two barbels, please.', 'Stamp. Stamp. Blot.', 'Legible is lawful.'] },
    ],
  },

  // ── Ambrose Tull — Juror Seven ───────────────────────────────────────
  {
    id: 'tribunal-tull',
    name: 'Ambrose Tull',
    title: 'Juror Seven',
    look: { body: 0x6a5a48, accent: 0xb070ff, hat: 'tophat', traits: ['cane', 'scarf'], size: 1.05 },
    at: { x: 430, y: 1046 },
    talks: [
      {
        when: DESPOT,
        lines: [
          'There\'s talk of a real jury. Twelve people, no foreman, a room with a door that shuts. To THINK in.',
          'I put my name down. I\'ll probably say guilty sometimes. But it\'ll be me saying it.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The box sat empty today. All twelve of us on the gallery steps, talking. Just talking. Out loud.',
        ],
      },
      {
        when: { questDone: Q_JUROR },
        lines: [
          'I sat in on a trial this afternoon. I listened to every word. I could hear my own thoughts underneath.',
          'They were mostly "it\'s hot." But they were MINE.',
        ],
      },
      {
        when: { quest: Q_JUROR },
        lines: [
          'Old Marrable on the plaza. She\'s a Clear now — they bleached her for defending a shade-thief.',
          'She\'ll know how a juror gets his head back. She lost hers doing it for someone else.',
        ],
      },
      {
        lines: [
          'Juror Seven. Four hundred and twelve trials, four hundred and twelve guilties. That\'s the gallery.',
          'The public must watch. In the sun. We sit up there squinting while the court does its work.',
          'Nobody\'s ever been acquitted. The Prince says that\'s because the court has never been wrong.',
        ],
      },
    ],
    barks: [
      { when: { questDone: Q_JUROR }, lines: ['My own head!', 'I thought something. Myself!'] },
      { lines: ['Guilty. Guilty. Guilty.', 'I didn\'t mean to.', 'The Foreman\'s looking.'] },
    ],
  },

  // ── Orla Weft — the hood-sewer ───────────────────────────────────────
  {
    id: 'tribunal-orla',
    name: 'Orla Weft',
    title: 'Seamstress of Hoods',
    look: { body: 0xf2ece0, accent: 0x1e1a24, hat: 'hood', traits: ['apron', 'tool'], size: 0.95 },
    at: { x: 2120, y: 1290 },
    talks: [
      {
        when: DESPOT,
        lines: [
          'I\'ve stopped sewing hoods. I sew curtains now. Black ones. The queue goes round the Records.',
          'Wrenna came by with her colour coming back — she\'s nearly freckled. She ordered a pair for her window.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'No hoods ordered today. I sat with my needle in my lap and nothing to finish. I sewed a pocket. For fun.',
        ],
      },
      {
        when: { questDone: Q_BLANKET },
        lines: [
          'The blanket\'s on the bench. The Clears take turns under it. The ushers pretend not to see.',
          'You can see their colour come back. Faint as a blush. Thirty years of hoods, and I made one good thing.',
        ],
      },
      {
        when: { quest: Q_BLANKET },
        lines: [
          'By the Records, by the railings, by the Heliostat door, by the cages. Mind the Informer — she counts.',
        ],
      },
      {
        lines: [
          'I sew the white hoods the condemned wear down to the Burning Glass. Thirty years. White outside.',
          'Black inside, so they can\'t see the lens coming. It\'s the only mercy the court allows. I sew it in.',
          'And the scraps of black I keep. Every one. They say a Clear\'s colour comes back in the dark.',
        ],
      },
    ],
    barks: [
      { when: { questDone: Q_BLANKET }, lines: ['Under the blanket, all three!', 'Pink! Her cheeks were pink!'] },
      { lines: ['White out, black in.', 'Thread, needle, thread.', 'Another hood, another Clear.'] },
    ],
  },

  // ── Defender Marrable — a Clear ──────────────────────────────────────
  {
    id: 'tribunal-marrable',
    name: 'Defender Marrable',
    title: 'Advocate, Struck Off (a Clear)',
    look: { body: CLEAR, accent: 0x9ac4e8, hat: 'wig', traits: ['cane', 'book'], size: 1 },
    at: { x: 1320, y: 1250 },
    talks: [
      {
        when: DESPOT,
        lines: [
          'I stood out last night, all night, with my face up. Look at my hands. There\'s a little colour in them.',
          'I shall apply to be readmitted to the bar. In a room with a door. I may ask for the curtains shut.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'He sat down in the shade of his own scale and nobody arrested him. That was the appeal. It was granted.',
          'You can see the Heliostat\'s legs through me, still. But I think I see a little less of them.',
        ],
      },
      {
        when: { questDone: Q_JUROR },
        lines: [
          'Juror Seven came by. He said he\'d had a thought of his own. He looked terrified. I was so proud.',
        ],
      },
      {
        when: { courtReady: 'tribunal' },
        lines: [
          'All five of his officers down, in the open. The terrace is whispering. That is how appeals begin.',
        ],
      },
      {
        lines: [
          'You can see the plaza through me. Don\'t be polite about it. I was bleached for a defence I made.',
          'I said a woman in shade might only be tired. That was enough. Shade is evidence; so is the defence.',
          'We are called Clears. We cast no shadow. We are made to walk in the open, so everyone sees what we are.',
        ],
      },
    ],
    barks: [
      { lines: ['(a faint shimmer of light)', 'Shade is evidence.', 'No shadow. Not even mine.'] },
    ],
  },

  // ── Gatewarden Tallis — the Heliostat door ──────────────────────────
  {
    id: 'tribunal-tallis',
    name: 'Tallis Brass',
    title: 'Gatewarden of the Heliostat',
    look: { body: 0x7a5a3a, accent: 0xe2b440, hat: 'helmet', traits: ['lantern', 'beard'], size: 1.2 },
    at: { x: 1310, y: 212 },
    talks: [
      {
        when: DESPOT,
        lines: [
          'The mirrors are turning away, one by one. I can hear them groan up there. And the sun is going DOWN.',
          'I\'ve stood at this door twenty-two years and I\'m going to stand here tonight. To see the first dark.',
        ],
      },
      {
        when: { princesOfIsle: 'light', count: 6 },
        lines: [
          'Six keys. All six Radiances. The lock\'s turned on its own, stranger. The lift\'s waiting.',
          'He\'s up at the Crown, under the sun he pinned there. Mind the lenses on the way. They walk.',
        ],
      },
      {
        when: { questDone: Q_APPEAL },
        lines: [
          'You stood at the scale. I watched from here. I saw the Prince look in the pan. It was empty.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'Verdict\'s key has turned in the lock. One of six. The door shivers every time another goes.',
        ],
      },
      {
        lines: [
          'The Heliostat. A crown of iron and a thousand mirrors, every one turned on the sun to pin it there.',
          'Twenty-two years of noon, held up by those legs. The Despot lives at the top, in the Crown.',
          'Six keyholes in the lock, one for each Radiance. Bring down all six princes and the door opens.',
        ],
      },
    ],
    barks: [
      { lines: ['Six keys. No fewer.', 'Hear them creak up there?', 'Hot iron. Mind your hands.'] },
    ],
  },
];

const looks: NpcLook[] = [
  { body: 0x5a2a6a, accent: 0xe2b440, hat: 'wig', traits: ['book'] },
  { body: 0xd8b494, accent: 0xe2b440, hat: 'straw', traits: ['satchel'] },
  { body: 0xc8a07a, accent: 0xd8344a, hat: 'none', traits: ['scarf'] },
  { body: 0x3a2a40, accent: 0xf2e6c4, hat: 'coif', traits: ['glasses', 'book'] },
  { body: CLEAR, accent: 0x9ac4e8, hat: 'none', traits: [], size: 0.95 },
  { body: 0xe8c8a8, accent: 0x7aa84a, hat: 'straw', traits: [], size: 0.72 },
  { body: 0x6a3a3a, accent: 0xb8202a, hat: 'helmet', traits: ['cane'], size: 1.2 },
  { body: CLEAR, accent: 0xc4d6e4, hat: 'hood', traits: ['cane'] },
];

const barks: Talk[] = [
  {
    when: DESPOT,
    lines: [
      'The sun went DOWN.',
      'I saw a star! A real one!',
      'Curtains! Who\'s got curtains?',
      'I slept. I actually slept.',
    ],
  },
  {
    when: PRINCE,
    lines: [
      'The Prince is sitting in the shade!',
      'No trials today!',
      'Acquitted — is that the word?',
      'Somebody pulled their hat down and NOTHING HAPPENED.',
    ],
  },
  {
    when: { courtReady: 'tribunal' },
    lines: [
      'All five officers, beaten in the open.',
      'They say the stranger\'s going in to the Prince.',
    ],
  },
  {
    lines: [
      'Is it noon? It\'s always noon.',
      'Mind your shadow.',
      'Eyes up, hands visible.',
      'Hesper Dimm. Under her CART.',
      'My Dusk Ticket\'s for Thursday.',
      'Don\'t stand behind the scale.',
      'Watch the trial, it\'s the law.',
      'I can\'t remember the last time I blinked.',
    ],
  },
];

export const TRIBUNAL_CROWD: NonNullable<AreaDef['crowd']> = {
  count: 14,
  looks,
  paths: [
    // Up and down the Processional (round the plaza).
    [{ x: 1200, y: 1700 }, { x: 1200, y: 1290 }, { x: 1000, y: 1150 }, { x: 1000, y: 920 }, { x: 1200, y: 760 }, { x: 1200, y: 320 }, { x: 1200, y: 760 }, { x: 1400, y: 920 }, { x: 1400, y: 1150 }, { x: 1200, y: 1290 }],
    // The Cross Walk, both ways.
    [{ x: 120, y: 1080 }, { x: 960, y: 1080 }, { x: 1440, y: 1080 }, { x: 2280, y: 1080 }],
    [{ x: 2280, y: 1080 }, { x: 1440, y: 1080 }, { x: 960, y: 1080 }, { x: 120, y: 1080 }],
    // Past the cages and the kiosk.
    [{ x: 272, y: 1474 }, { x: 1120, y: 1474 }, { x: 1120, y: 1620 }, { x: 760, y: 1640 }, { x: 272, y: 1474 }],
    // To the courthouse steps and back.
    [{ x: 1500, y: 1080 }, { x: 1830, y: 1080 }, { x: 1830, y: 880 }, { x: 1830, y: 1080 }],
    // The Records walk.
    [{ x: 1500, y: 1040 }, { x: 1500, y: 560 }, { x: 2280, y: 560 }, { x: 1500, y: 560 }],
    // Along the palace railings.
    [{ x: 140, y: 680 }, { x: 1120, y: 680 }, { x: 560, y: 680 }, { x: 560, y: 1040 }],
    // Round the fountain.
    [{ x: 1300, y: 1610 }, { x: 2280, y: 1610 }, { x: 2200, y: 1120 }, { x: 2200, y: 1610 }],
  ],
  barks,
};
