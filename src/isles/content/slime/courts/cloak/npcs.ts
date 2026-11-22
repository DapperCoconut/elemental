import type { AreaDef, NpcDef, NpcLook, Talk } from '../../../../IslesTypes';

/**
 * The people of the Cloak Court.
 *
 * Cloak is Fangmire's informers' town, so its people do the explaining about *being heard*: the
 * Asp's Mouth (a stone serpent you post denunciations into), the Pay Office (where informers are
 * paid in extra doses of the Draught), the ear-trumpets on every corner that run under the
 * streets to Prince Whisper's Hall of Letters, and what it means to be *named* — your household
 * passed over at the Draught House until you go grey. Everybody here talks in a low voice, looks
 * over their shoulder mid-sentence, and has informed on somebody once. They are ashamed of it.
 */

const PRINCE = { prince: 'whisper' } as const;
const MATRIARCH = { monarch: 'nyxa' } as const;

const Q_MOUTH = 'cloak-q-asps-mouth';
const Q_CARP = 'cloak-q-fish-that-read';
const Q_MASKS = 'cloak-q-faces';
const Q_GREY = 'cloak-q-grey-fingertips';
const Q_LAST = 'cloak-q-last-letter';

export const CLOAK_NPCS: NpcDef[] = [
  // ── Hesper Latch — the shop ──────────────────────────────────────────
  {
    id: 'cloak-hesper',
    name: 'Hesper Latch',
    title: 'Latch & Lining — Quiet Things',
    look: { body: 0xc8b4a4, accent: 0x3b2a4c, hat: 'cowl', traits: ['satchel', 'glasses'], size: 0.95, eye: 0xe0d0ff },
    at: { x: 980, y: 1195 },
    role: { kind: 'shop', id: 'cloak-shop' },
    talks: [
      {
        when: MATRIARCH,
        lines: [
          'People keep coming in to buy loud things. Bells. Whistles. A man bought a drum and walked off playing it.',
          'I don\'t stock loud things. I may have to start. Charms are on the hook, same as ever.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The horns have gone quiet. Somebody stuffed rags in the one on my corner, and nobody came to take them out.',
          'I sold three shutter-bolts this morning — to people locking themselves OUT. Out! Fresh air, they said.',
        ],
      },
      {
        when: { questDone: Q_MASKS },
        lines: [
          'Young Pim was in here with his eyes shining. He says some of his faces got out past the Name Booth.',
          'I never saw any masks. I want that understood. I never see anything. It\'s how I\'ve kept the shop.',
        ],
      },
      {
        lines: [
          '(low) Quiet things, friend. Latches, linings, soft-soled boots. Things that help a body not be heard.',
          'Every ear-trumpet on every corner runs under the streets to the Hall. Mind what you say near the brass.',
          'Charms on the hook — you can wear three. Informers\' tools, mostly. Turned round to point the other way.',
        ],
      },
    ],
    barks: [
      { when: PRINCE, lines: ['Rags for the horns! Stuff your trumpet!', 'Shutters open — imagine.'] },
      { lines: ['Soft soles, half price.', '(low) Latches. Linings.', 'Mind the brass.', 'Quiet things for quiet folk.'] },
    ],
  },

  // ── Wenna Quill — the public letter-writer ───────────────────────────
  {
    id: 'cloak-wenna',
    name: 'Wenna Quill',
    title: 'Letters Written, Any Hand',
    look: { body: 0xd8c4b0, accent: 0x2a2a3e, hat: 'none', traits: ['glasses', 'book', 'scarf'], size: 0.9, eye: 0xc0b0ff },
    at: { x: 1000, y: 750 },
    talks: [
      {
        when: MATRIARCH,
        lines: [
          'I wrote forty letters today. Love letters. Letters home. One man wanted to apologise to his brother.',
          'Forty letters, and not one of them named anybody. My hand hasn\'t shaken all day.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'They\'re taking the letters off the Hall. Unpicking the nails. People are reading them aloud in the square.',
          'Some of them are in my hand. I stood and listened to every one. It seemed the least I owed.',
        ],
      },
      {
        when: { questDone: Q_MOUTH },
        lines: [
          'The Ashbys still have their vial and their doses. Nobody will ever know I wrote it. Except me.',
          'I\'ve put my price up for denunciations. Ten crowns. Nobody pays ten crowns to be a coward.',
        ],
      },
      {
        when: { quest: Q_MOUTH },
        lines: [
          'Warn Mother Ashby first — the house with the green door by the market. Then the Mouth.',
          'Reach in past the fangs. It\'ll be the top letter. Sealed in red, with a thumbprint. Mine.',
        ],
      },
      {
        lines: [
          'Letters written, any hand, any purpose. Most people in Cloak can\'t write. They still want to be heard.',
          '(low) Most of what I write goes in the Asp\'s Mouth. I don\'t ask what it says. I write what I\'m told.',
          'Well. I didn\'t ask. Until this morning.',
        ],
      },
    ],
    barks: [
      { when: { questDone: Q_MOUTH }, lines: ['Ten crowns a denunciation.', 'Love letters half price.'] },
      { lines: ['Letters written!', 'Any hand, any purpose.', '(low) …a thumbprint in the wax…', 'Petitions, wills, confessions.'] },
    ],
  },

  // ── Mother Ashby — the household named ───────────────────────────────
  {
    id: 'cloak-ashby',
    name: 'Mother Ashby',
    title: 'The Green Door',
    look: { body: 0xc4ac98, accent: 0x2b3d33, hat: 'hood', traits: ['apron', 'cane'], size: 0.92 },
    at: { x: 930, y: 1048 },
    talks: [
      {
        when: MATRIARCH,
        lines: [
          'I put the vial on the windowsill this morning. On the sill! Where anybody could see it.',
          'Nobody\'s going grey in this house. Nobody\'s going grey in this street. Imagine saying that out loud.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The horn on our corner went quiet. My grandson put his ear to it and heard nothing but drips.',
          'He laughed. I haven\'t heard him laugh at a horn before. They\'re meant to be frightening.',
        ],
      },
      {
        when: { questDone: Q_MOUTH },
        lines: [
          'We kept the vial. And the doses. The Collector never came. You can\'t know what that means.',
          'Wenna came round with a cake. She didn\'t say why. She didn\'t have to.',
        ],
      },
      {
        lines: [
          'Green door. Yes. We\'re good. We\'re very good. We pay the Tithe in skins and we never say a word.',
          'Doses come every new moon, regular as rain. Every one of us. Even the little ones.',
          '(very low) We don\'t keep anything we shouldn\'t. Nothing. There\'s nothing in this house.',
        ],
      },
    ],
    barks: [
      { lines: ['Nothing in this house.', 'Regular as rain.', '(sweeping the step, too hard)', 'Green door. Good door.'] },
    ],
  },

  // ── Thessaly Drum — the cistern keeper, deaf as a post ───────────────
  {
    id: 'cloak-thessaly',
    name: 'Thessaly Drum',
    title: 'Keeper of the Letter Cistern',
    look: { body: 0xb8a490, accent: 0x274f58, hat: 'souwester', traits: ['rod', 'pipe'], size: 1.05, eye: 0x9adfe0 },
    at: { x: 1630, y: 1250 },
    talks: [
      {
        when: MATRIARCH,
        lines: [
          'WHAT? THE MATRIARCH? GONE? …I SAW THE BELLS RINGING. THOUGHT IT WAS A FIRE.',
          'BEST NEWS IN FORTY YEARS AND I HAD TO READ IT OFF A CHILD\'S LIPS. STILL. I READ IT.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'THEY SAY THE HORNS HAVE STOPPED. I WOULDN\'T KNOW. THEY NEVER STARTED, FOR ME.',
          'NOBODY\'S DROPPED A LETTER IN THE CISTERN ALL WEEK. CARP ARE STARVING. GOOD.',
        ],
      },
      {
        when: { questDone: Q_CARP },
        lines: [
          'COBB READ YOU THE NAMES? AND THE RUNNERS NEVER GOT THEM? HA! THE CARP ATE THE PRINCE\'S POST.',
          'BEST FISH IN THE COURT, CIPHER CARP. I\'VE ALWAYS SAID SO. I\'VE ALWAYS SAID IT VERY LOUD.',
        ],
      },
      {
        when: { quest: Q_CARP },
        lines: [
          'CIPHER CARP! THE FAT BLACK ONES! YOU\'LL NEED AN IRON ROD AT LEAST. THEN TAKE THEM TO COBB.',
        ],
      },
      {
        lines: [
          'EH? SPEAK UP. I\'M THE ONE PERSON IN CLOAK NOBODY BOTHERS TO WHISPER ROUND. DEAF AS A POST.',
          'SO THEY TALK IN FRONT OF ME. RUNNERS. SPIES. THEY DROP LETTERS IN MY CISTERN FOR THE HALL TO FISH OUT.',
          'AND MY CARP EAT \'EM. HA! YOU CAN FISH HERE IF YOU LIKE. IT\'S INK, MIND. BRING A PROPER ROD.',
        ],
      },
    ],
    barks: [
      { lines: ['EH?', 'SPEAK UP!', 'CARP\'RE BITING!', 'NOBODY WHISPERS ROUND ME.', 'INK WATER, IRON ROD!'] },
    ],
  },

  // ── Brother Cobb — the defrocked scribe who reads cipher ─────────────
  {
    id: 'cloak-cobb',
    name: 'Brother Cobb',
    title: 'Once of the Hall',
    look: { body: 0xc0a890, accent: 0x5a4a3a, hat: 'hood', traits: ['beard', 'book', 'glasses'], size: 1.1, eye: 0xd8d0b8 },
    at: { x: 1990, y: 1055 },
    talks: [
      {
        when: MATRIARCH,
        lines: [
          'I\'m teaching the children their letters. Out loud, in the square. Every letter, a sound.',
          'Forty years I turned words into code so nobody could hear them. Now I turn them back.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The Hall\'s doors are open and the clerks have gone home. I walked in. Nobody stopped me.',
          'I sat at my old desk. Somebody had kept my pen. I don\'t know whether to be touched or frightened.',
        ],
      },
      {
        when: { questDone: Q_CARP },
        lines: [
          'Seven names in that letter. Seven households told before the Collector knocked. Seven, out of hundreds.',
          'It isn\'t enough. It\'s seven more than I\'ve ever saved. I\'m going to keep count now.',
        ],
      },
      {
        lines: [
          'I wrote the Hall\'s cipher. Thirty years a clerk to the Prince. Then I put a comma in the wrong place.',
          'One comma, and a household was passed over that wasn\'t meant to be. I left. They let me — I know too much.',
          'If you ever find a letter in that cipher, bring it to me. I owe a great many commas.',
        ],
      },
    ],
    barks: [
      { when: MATRIARCH, lines: ['A for asp! B for… bootleg!', 'Every letter a sound!'] },
      { lines: ['One comma.', '(muttering numbers)', 'The cipher turns on the seventh letter…', 'I owe commas.'] },
    ],
  },

  // ── Pim — Visage's apprentice ────────────────────────────────────────
  {
    id: 'cloak-pim',
    name: 'Pim',
    title: 'Apprentice Maskmaker',
    look: { body: 0xdcc4ac, accent: 0x7a4aa0, hat: 'cap', traits: ['apron', 'mask'], size: 0.78, eye: 0xf4e2ff },
    at: { x: 420, y: 1248 },
    talks: [
      {
        when: MATRIARCH,
        lines: [
          'I made a mask today that\'s just a face. My face. Painted on. Everybody laughed. It\'s the best I\'ve done.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'Nobody\'s buying informer masks. Visage is painting them as party faces now. Party faces! In Cloak!',
          'She asked me to help. She said "help". She\'s never said help.',
        ],
      },
      {
        when: { questDone: Q_MASKS },
        lines: [
          'Four faces got out past the Name Booth. Four families walking to Stilthaven in other people\'s faces.',
          'Visage knows. She hasn\'t said. She let me keep the gesso. I think that means something.',
        ],
      },
      {
        when: { quest: Q_MASKS },
        lines: [
          'They\'re about the market — dropped when the watch came through. White, gold, a moon, a little bird.',
          'Get them before somebody hands them in. A face with a name on the back is a confession.',
        ],
      },
      {
        lines: [
          'Visage makes every informer\'s mask in Cloak. Nobody knows who\'s behind which. That\'s the point.',
          'I make masks too. Different ones. At night. For people who need to walk out past the Name Booth.',
          '(very low) Faces nobody\'s ever seen. You can\'t name a face nobody\'s seen.',
        ],
      },
    ],
    barks: [
      { lines: ['Gesso, chalk, glue.', '(painting an eyebrow)', 'Nobody\'s face. That\'s the trick.', 'Masks! Mended!'] },
    ],
  },

  // ── Orrin Fathom — the named man ─────────────────────────────────────
  {
    id: 'cloak-orrin',
    name: 'Orrin Fathom',
    title: 'Named, Third Moon Past',
    look: { body: 0xb8a898, accent: 0x4c2a2c, hat: 'beanie', traits: ['bandage', 'pack'], size: 1.1 },
    at: { x: 470, y: 655 },
    talks: [
      {
        when: MATRIARCH,
        lines: [
          'Lise held a cup this morning. Both hands, no shaking. The grey\'s going back down her fingers.',
          'I queued at the Draught House one last time — for a cure. Then we burned the ration book. Lovely smoke.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The Pay Office is shut. The window\'s boarded. Somebody\'s written HUSH on the boards in red.',
          'I don\'t know who. I\'m not going to ask. I\'ve had enough of people asking who.',
        ],
      },
      {
        when: { questDone: Q_GREY },
        lines: [
          'Three doses. Lise had one that night and the grey stopped at her knuckles. Stopped. Just stopped.',
          'I\'ll be named again. I\'m always named. But this moon we\'re ahead of it.',
        ],
      },
      {
        when: { quest: Q_GREY },
        lines: [
          'Talk to Lise first. She\'ll tell you not to. Then the chits — the informers drink them away at the Cups.',
        ],
      },
      {
        lines: [
          'Somebody named me. I don\'t know who. The letter went up on the Hall with my name on it, and that was that.',
          'Passed over at the Draught House. Three moons, no doses. I\'m big. I\'m holding. My wife isn\'t.',
          'I queue here every day. Not for doses. To look at the faces of the men who get paid. One of them\'s him.',
        ],
      },
    ],
    barks: [
      { lines: ['(staring at the queue)', 'One of them.', 'Three moons.', 'Hold on, Lise.'] },
    ],
  },

  // ── Lise Fathom — going grey ─────────────────────────────────────────
  {
    id: 'cloak-lise',
    name: 'Lise Fathom',
    title: 'Grey to the Wrist',
    look: { body: 0xa8a8ac, accent: 0x3a3a4a, hat: 'veil', traits: ['scarf', 'bandage'], size: 0.9, eye: 0xc8c8d0 },
    at: { x: 250, y: 775 },
    talks: [
      {
        when: MATRIARCH,
        lines: [
          'Look. LOOK. Pink, under the nail. That\'s me coming back. Orrin cried. Don\'t tell him I told you.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The chill\'s still in my hands. But the house across the way opened its shutters and waved at me.',
          'Nobody waves at a grey woman. They did. I waved back. It took a while.',
        ],
      },
      {
        when: { questDone: Q_GREY },
        lines: [
          'It stopped at the knuckles. I can feel my thumbs. You don\'t know how much you love your thumbs.',
        ],
      },
      {
        lines: [
          'Don\'t shake my hand, love. It\'s cold. It starts at the fingertips — the grey. Mine\'s at the wrist.',
          'When it reaches the heart they carry you to the Grave Court. Orrin thinks I don\'t know. I know.',
          'He wants to steal for me. I\'ve told him no. Somebody would have to go without. That\'s how it works.',
        ],
      },
    ],
    barks: [
      { lines: ['(rubbing her hands)', 'Cold today.', 'Don\'t worry about me.', 'The grey\'s only a colour.'] },
    ],
  },

  // ── Clerk Penhallow — keeper of the Hall of Letters ──────────────────
  {
    id: 'cloak-penhallow',
    name: 'Clerk Penhallow',
    title: 'Keeper of the Hall of Letters',
    look: { body: 0xd4c4b0, accent: 0x3e3150, hat: 'tophat', traits: ['glasses', 'book', 'tool'], size: 1, eye: 0xd8d0b8 },
    at: { x: 1760, y: 525 },
    talks: [
      {
        when: MATRIARCH,
        lines: [
          'I am taking the letters down. Every one. I have given myself a year. I\'ve done nine.',
          'Each one I read before I burn. Somebody should know what was said. Then nobody need ever again.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'His Highness has asked for paper. Plain paper. He says he wishes to write something with no name in it.',
          'I have been his clerk nineteen years. I gave him the whole ream.',
        ],
      },
      {
        when: { quest: Q_LAST },
        lines: [
          'Nanny Velour first — she sits on the step at the east end of the forecourt. Then the gallery.',
          'Stand in the middle of it and say nothing. The gallery will tell you the rest. It always does.',
        ],
      },
      {
        when: { courtReady: 'cloak' },
        lines: [
          'All five of his listeners. He heard every one of those fights through the horns. He hasn\'t moved since.',
        ],
      },
      {
        lines: [
          'The Hall of Letters. Every denunciation from the Asp\'s Mouth is read, sealed, and nailed up here.',
          'The town reads the wall each morning to see who is named. Named households are passed over. That is all.',
          'I nail them up. I have nailed up eleven thousand, four hundred and six. I count. One must count.',
        ],
      },
    ],
    barks: [
      { when: PRINCE, lines: ['Plain paper. A whole ream.', '(unpicking a nail, carefully)'] },
      { lines: ['Eleven thousand, four hundred and six.', '(tapping a nail in)', 'One must count.', 'Read, sealed, nailed.'] },
    ],
  },

  // ── Nanny Velour — who raised the Prince ─────────────────────────────
  {
    id: 'cloak-velour',
    name: 'Nanny Velour',
    title: 'Once of the Nest',
    look: { body: 0xd0bca8, accent: 0x5a2a4a, hat: 'cowl', traits: ['cane', 'scarf'], size: 0.85, eye: 0xe8dcff },
    at: { x: 2060, y: 545 },
    talks: [
      {
        when: MATRIARCH,
        lines: [
          'He came to see me. My boy. He sat on that step and said "Nanny" out loud. Out loud.',
          'I told him a story. A loud one, with voices. He laughed. I\'ve waited thirty years to hear that.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'You beat him and you didn\'t shout at him. He told me. He said nobody had ever not shouted at him.',
          'He isn\'t whispering now. He isn\'t saying much at all. It\'s a start.',
        ],
      },
      {
        lines: [
          'I nursed all six of them in the nest. Whisper was the quiet one. The one his mother never had to hear.',
          'I sit by his Hall so he knows somebody is near who isn\'t listening. Somebody just being near.',
        ],
      },
    ],
    barks: [
      { lines: ['(humming, very softly)', 'My quiet boy.', 'Somebody just being near.', 'Six of them. Six.'] },
    ],
  },
];

// ── The crowd ──────────────────────────────────────────────────────────

const looks: NpcLook[] = [
  { body: 0xb8a898, accent: 0x3b2a4c, hat: 'cowl', traits: ['lantern'] },
  { body: 0xc8b4a0, accent: 0x2a3c3c, hat: 'hood', traits: ['scarf'] },
  { body: 0xa89884, accent: 0x4c2a2c, hat: 'tricorn', traits: ['satchel'] },
  { body: 0xd4c0ac, accent: 0x262a3e, hat: 'cowl', traits: ['mask'], size: 0.95 },
  { body: 0xc0ac98, accent: 0x56483a, hat: 'plague', traits: ['cane'] },
  { body: 0xd8c4b0, accent: 0x3a3a2a, hat: 'veil', traits: ['book'], size: 0.9 },
  { body: 0xb4a090, accent: 0x5a2a4a, hat: 'beanie', traits: ['pack'], size: 0.76 },
  { body: 0xa8a8ac, accent: 0x3a3a4a, hat: 'hood', traits: ['bandage'], size: 1.05 },
];

const barks: Talk[] = [
  {
    when: MATRIARCH,
    lines: [
      'The Draught House is giving it away!',
      'I said it out LOUD.',
      'They\'re burning the ration books!',
      'Open the shutters!',
    ],
  },
  {
    when: PRINCE,
    lines: [
      'The horns have gone quiet.',
      'Somebody stuffed rags in the trumpet!',
      'They\'re reading the Hall wall aloud.',
      'Nobody\'s queuing at the Pay Office.',
    ],
  },
  {
    when: { courtReady: 'cloak' },
    lines: [
      '(low) All five of his listeners…',
      '(low) …going to the Hall, they say.',
    ],
  },
  {
    lines: [
      '(low) Not here. The horn.',
      '(low) …named, I heard.',
      'Nice evening. Nothing to report.',
      '(low) Who\'s asking?',
      'Mind your voice.',
      '(low) Three doses a week, he gets.',
      'I didn\'t see anything.',
      '(low) …grey to the elbow…',
    ],
  },
];

export const CLOAK_CROWD: NonNullable<AreaDef['crowd']> = {
  count: 14,
  looks,
  paths: [
    // Up and down Hush Street.
    [{ x: 160, y: 805 }, { x: 900, y: 805 }, { x: 1500, y: 805 }, { x: 1880, y: 805 }, { x: 900, y: 805 }],
    [{ x: 1880, y: 815 }, { x: 1300, y: 815 }, { x: 300, y: 815 }, { x: 1300, y: 815 }],
    // Round Tattle Square.
    [{ x: 1000, y: 880 }, { x: 1200, y: 960 }, { x: 1420, y: 880 }, { x: 1200, y: 800 }],
    // Up to the Whispering Gallery and back.
    [{ x: 1200, y: 800 }, { x: 1200, y: 520 }, { x: 1200, y: 380 }, { x: 1200, y: 520 }],
    // Through the Mask Market.
    [{ x: 300, y: 1245 }, { x: 860, y: 1245 }, { x: 980, y: 1245 }, { x: 600, y: 1245 }],
    // Down to the cistern.
    [{ x: 1200, y: 1000 }, { x: 1200, y: 1250 }, { x: 1600, y: 1250 }, { x: 1600, y: 1080 }, { x: 1200, y: 1080 }],
    // The queue at the Pay Office.
    [{ x: 520, y: 800 }, { x: 520, y: 640 }, { x: 600, y: 610 }, { x: 520, y: 640 }],
    // Up to the Hall.
    [{ x: 1900, y: 800 }, { x: 1900, y: 560 }, { x: 1700, y: 540 }, { x: 1900, y: 560 }],
  ],
  barks,
};
