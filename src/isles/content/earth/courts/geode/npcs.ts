import type { AreaDef, NpcDef, NpcLook, Talk } from '../../../../IslesTypes';

/**
 * The people of the Geode Court.
 *
 * The Geode Court pays the Stone Tithe in cut gems, by the carat, and every stone is graded first
 * at the Loupe Table: a stone with a flaw counts for nothing and goes to the Grinding Wheel. A
 * household whose stones grade short is *interred* — walled up down in the Regent's Sepulchre
 * until others cut the debt. Prince Facet grades the hardest stones himself. Besides stone, the
 * Cutting-House tithes *light*: lamp oil goes up to light the Prince's chandeliers, so at night
 * the town sits in the dark under its own glittering walls. Songs are buried here as everywhere,
 * but the old chimers sang theirs into crystal first, and crystal remembers. Everyone in the court
 * talks about stone the way other towns talk about weather.
 */

const PRINCE = { prince: 'facet' } as const;
const REGENT = { monarch: 'gravane' } as const;

const Q_LOUPE = 'geode-q-scratched-loupe';
const Q_LAMP = 'geode-q-lamplight';
const Q_SONG = 'geode-q-buried-song';
const Q_SIGNAL = 'geode-q-signal';
const Q_BACK = 'geode-q-back-of-the-stone';

export const GEODE_NPCS: NpcDef[] = [
  // ── Opaline Grist — the shop ─────────────────────────────────────────
  {
    id: 'geode-grist',
    name: 'Opaline Grist',
    title: 'Settings & Sundries',
    look: { body: 0xd8c0a8, accent: 0x8a52c4, hat: 'goggles', traits: ['apron', 'glasses', 'satchel'], size: 1 },
    at: { x: 590, y: 1240 },
    role: { kind: 'shop', id: 'geode-shop' },
    talks: [
      {
        when: REGENT,
        lines: [
          'A woman came in and bought a flawed stone. On purpose. She said she liked the feather in it.',
          'I sold her a setting for it. Gold. I have never set a flawed stone in my life. It looks lovely.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The Grinding Wheel has stopped. First time in my life I have heard this street without it.',
          'Everyone keeps stopping in the doorway to listen to nothing. Charms are on the tray, same as ever.',
        ],
      },
      {
        when: { questDone: Q_LOUPE },
        lines: [
          'The grading loupe was scratched. All those years. All those stones gone to the Wheel for a scratch.',
          'Half the Row has been in asking for their rejects back. The rejects are dust. Still. They asked.',
        ],
      },
      {
        lines: [
          'Settings, sundries, and charms. Mind the tray — those are cut, and so are you if you grab.',
          'The Tithe here is a weight of cut stone, graded at the Loupe Table. Only flawless counts.',
          'A flawed stone goes to the Grinding Wheel. A household that grades short goes down to the Sepulchre.',
          'The charms on the top tray are lapidary\'s tools. You can wear three. They work on people, too.',
        ],
      },
    ],
    barks: [
      { when: PRINCE, lines: ['Listen. No Wheel.', 'Settings for flawed stones! Gold or brass!'] },
      { lines: ['Cut, set, polished!', 'Loupes, forks, prisms!', 'Mind the tray.', 'Flawless or nothing, dear.'] },
    ],
  },

  // ── Assayer Beryl Sounding — the Loupe Table ─────────────────────────
  {
    id: 'geode-beryl',
    name: 'Beryl Sounding',
    title: 'Assayer at the Loupe Table',
    look: { body: 0xe0d0c0, accent: 0xc8a050, hat: 'hood', traits: ['glasses', 'book', 'cane'], size: 0.9, eye: 0xe8e0ff },
    at: { x: 420, y: 730 },
    talks: [
      {
        when: REGENT,
        lines: [
          'They took the great loupe down off the table this morning. Took it down and laid it in the pool.',
          'I sat here and graded nothing all day. I graded the light on the water. It was flawless.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'He came down to the table. The Prince. He sat on the reject pile and asked me to grade him.',
          'I would not. I told him I had graded him once, when he was nine, and I was not going to again.',
        ],
      },
      {
        when: { quest: Q_BACK },
        lines: [
          'You want to know about the boy. Sit. The Regent brought him to this table at nine years old.',
          'He had me grade his son like a stone. I found the crack down his back. I had to say it aloud.',
        ],
      },
      {
        when: { questDone: Q_LOUPE },
        lines: [
          'I have graded through a scratch for nineteen years. Every stone I failed, I failed for a scratch.',
          'I am going to have to live with that. Thank you for making me. I mean it, mostly.',
        ],
      },
      {
        lines: [
          'Stones on the tray, please, face up. I grade through the great loupe; it finds every flaw there is.',
          'Flawless counts toward the Tithe by the carat. Flawed goes to the Wheel and counts for nothing.',
          'The Prince grades the large stones himself. He has never passed a flawed stone. Not once.',
        ],
      },
    ],
    barks: [
      { when: PRINCE, lines: ['Nothing to grade.', 'Grade the light, then.'] },
      { lines: ['Face up, please.', 'Flawed. Wheel.', 'Next tray.', 'Mm. Inclusion. Wheel.'] },
    ],
  },

  // ── Agate Mullion — the household short ──────────────────────────────
  {
    id: 'geode-agate',
    name: 'Agate Mullion',
    title: 'Third House, Lapidaries\' Row',
    look: { body: 0xd0b498, accent: 0xb88a6a, hat: 'headwrap', traits: ['apron', 'tool'], size: 0.95 },
    at: { x: 520, y: 1050 },
    talks: [
      {
        when: REGENT,
        lines: [
          'My cousin came up out of the Sepulchre today. Up the lift. She had been down there two years.',
          'She asked for a cup of tea and then she asked whether her stones were flawless. I said nobody cares.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'No grading this season. They\'ve chalked "NO TITHE" on the Loupe Table. Somebody\'s chalked a face too.',
          'It looks like the Prince. It\'s smiling. I\'ve never seen him smile, so I don\'t know if it\'s good.',
        ],
      },
      {
        when: { questDone: Q_LOUPE },
        lines: [
          'Beryl graded my stones again, through an honest glass. Eleven flawless. ELEVEN. Every one I cut.',
          'We make weight. My boy stays. You don\'t know. Nobody who hasn\'t cut a debt knows.',
        ],
      },
      {
        when: { quest: Q_LOUPE },
        lines: [
          'Ask Beryl to let you look through the great loupe. Then go round the Row. Every bench keeps a glass.',
          'Honest glasses, three of them, side by side with hers. That\'s the only argument a grader hears.',
        ],
      },
      {
        lines: [
          'Eleven stones I cut this season, and every one graded flawed. Every one. I\'ve cut stone for thirty years.',
          'I held them up to the crack at noon. Clean as water. But through the great loupe, there\'s a line.',
          'The same line. In every stone. In the same place. I don\'t think the line is in the stones.',
        ],
      },
    ],
    barks: [
      { when: { questDone: Q_LOUPE }, lines: ['Eleven flawless!', 'My boy stays.'] },
      { lines: ['The same line, every stone.', 'Clean as water.', 'Thirty years cutting.'] },
    ],
  },

  // ── Corwen Drusy — keeper of the pool ────────────────────────────────
  {
    id: 'geode-corwen',
    name: 'Corwen Drusy',
    title: 'Keeper of the Crystal Pool',
    look: { body: 0xc8b8a8, accent: 0x5a7ab8, hat: 'beanie', traits: ['rod', 'beard', 'pipe'], size: 1.1 },
    at: { x: 950, y: 1300 },
    talks: [
      {
        when: REGENT,
        lines: [
          'They put the great loupe in my pool. It\'s down there now, on the points. The pike are using it.',
          'Strange times, when a fish looks through a grader\'s glass and doesn\'t much care for what it sees.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'Oil came back down from the Cutting-House this morning. Barrels of it. Every lamp in the Row is lit.',
          'The tetras are sulking in their jars. Nobody needs them. I\'ll let them back in the pool tonight.',
        ],
      },
      {
        when: { questDone: Q_LAMP },
        lines: [
          'Ilse says every jar\'s gone out the door to a house with a little one. Every one.',
          'You walk down the Row tonight, look in the windows. Violet. All violet. Like the walls came in.',
        ],
      },
      {
        when: { quest: Q_LAMP },
        lines: [
          'Cast off the lip. Tetras run small and quick — hold the line in the bar, they tire fast.',
          'Three, then take them to Ilse at the lamp-house. She has the jars.',
        ],
      },
      {
        lines: [
          'The pool\'s the only thing in this court nobody grades. Clear right down to the points.',
          'Tetras, and the pike that eat them. You can see both before they bite. Doesn\'t help.',
          'Fish are the Prince\'s, they say. Everything here is the Prince\'s. But he\'s never come for a tetra.',
        ],
      },
    ],
    barks: [
      { when: PRINCE, lines: ['Back you go, little lamps.', 'Oil in every window.'] },
      { lines: ['Clear to the points.', 'Pike\'s under the big one.', 'Tetras bite at dusk.'] },
    ],
  },

  // ── Ilse Lantern — the lamp-mother ───────────────────────────────────
  {
    id: 'geode-ilse',
    name: 'Ilse Lantern',
    title: 'The Lamp-House',
    look: { body: 0xe4cfb8, accent: 0xf0c048, hat: 'bandana', traits: ['lantern', 'apron'], size: 1 },
    at: { x: 1580, y: 1060 },
    talks: [
      {
        when: REGENT,
        lines: [
          'I have nothing to do. Every lamp is lit. I sat in my own doorway and watched the walls glitter.',
          'I\'d forgotten the walls glitter at night. When the town is lit they glitter back.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The oil\'s back. The Prince sent it down himself, with a note. "For the dark." That was all.',
          'I\'m keeping the note. I don\'t know why. It\'s the only thing he\'s ever given anybody.',
        ],
      },
      {
        when: { questDone: Q_LAMP },
        lines: [
          'Every jar went to a house with a child in it. Little violet lights in every window on the Row.',
          'The Light-Warden came by and stood in the street and looked at them, and went home. Imagine.',
        ],
      },
      {
        lines: [
          'The Cutting-House tithes oil. Lamp oil, candle tallow, anything that burns. For the chandeliers.',
          'The Prince likes his stones seen in a good light. So the Row sits in the dark after the crack goes.',
          'Children don\'t sleep in the dark in here. The walls creak. I hand out what light I can.',
        ],
      },
    ],
    barks: [
      { when: PRINCE, lines: ['"For the dark."', 'Every wick lit!'] },
      { lines: ['Mind the wick.', 'One jar to a house.', 'Dark by the fourth bell.'] },
    ],
  },

  // ── Wren Celestine — the girl with a song ────────────────────────────
  {
    id: 'geode-wren',
    name: 'Wren Celestine',
    title: 'Chimer\'s Granddaughter',
    look: { body: 0xe8d4c0, accent: 0xc8f0ff, hat: 'none', traits: ['scarf'], size: 0.75, eye: 0xc8f0ff },
    at: { x: 1640, y: 1250 },
    talks: [
      {
        when: REGENT,
        lines: [
          'Everybody\'s singing! Out loud, in the street! Some of them are very bad at it!',
          'I taught Mister Quartz the words. He cried. He says it was the dust. There isn\'t any dust today.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'I sang Grandad\'s song at the Loupe Table today and nobody stopped me. Not one person.',
          'Beryl sang the second verse. She knew it! She\'s known it all along and never said.',
        ],
      },
      {
        when: { questDone: Q_SONG },
        lines: [
          'I know all of it now. Every word. The rod sang it twice and I sang it back the second time.',
          'I\'m not allowed to sing it. I sing it in my head. My head\'s mine.',
        ],
      },
      {
        when: { quest: Q_SONG },
        lines: [
          'Brother Ostrum knows which rod. He was Grandad\'s friend. He\'s by the big chimes, being quiet.',
        ],
      },
      {
        lines: [
          'Grandad was a chimer. When they buried the songs he sang his into a rod first. Crystal keeps things.',
          'He said one rod in the garden still has it. If you strike it right, it sings the whole song back.',
          'I never heard it. He went down to the Sepulchre before he showed me. I want to know the words.',
        ],
      },
    ],
    barks: [
      { when: { questDone: Q_SONG }, lines: ['(humming)', 'Second verse, second verse…'] },
      { lines: ['Which rod, which rod.', 'Crystal keeps things.', 'Grandad knew.'] },
    ],
  },

  // ── Brother Ostrum — the old chimer ──────────────────────────────────
  {
    id: 'geode-ostrum',
    name: 'Brother Ostrum',
    title: 'Last of the Chimers',
    look: { body: 0xd4c4b4, accent: 0x6a5a52, hat: 'mitre', traits: ['beard', 'cane'], size: 1.05, eye: 0xd8c8ff },
    at: { x: 1960, y: 1270 },
    talks: [
      {
        when: REGENT,
        lines: [
          'Forty years we have kept the songs in the rods. Forty years of striking them softly, in the dark.',
          'Today I struck them all at once, as hard as I could. The whole geode rang. I hope he heard it below.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The Prince came to the garden. He asked which rod was mine. I told him. He did not strike it.',
          'He stood beside it a long time. I think he wanted to know if there was one with his mother\'s song.',
        ],
      },
      {
        when: { questDone: Q_SONG },
        lines: [
          'The child has the song. Then it is out of the crystal and into a person. That is where songs live.',
          'The rod is just a rod again. Good. Rods are for ringing.',
        ],
      },
      {
        lines: [
          'When the Regent buried the songs we were chimers. We sang every one into the rods before they came.',
          'Crystal remembers a note, if you hold it steady. The rods remember whole songs, if you ask right.',
          'The Cutting-House sends a man to grind the ones it suspects. We moved them. He has not found them all.',
        ],
      },
    ],
    barks: [
      { when: PRINCE, lines: ['Ring them all.', 'Rods are for ringing.'] },
      { lines: ['Softly. Softly.', 'Hold the note.', 'Crystal remembers.'] },
    ],
  },

  // ── Tamsin Heliograph — the signaller ────────────────────────────────
  {
    id: 'geode-tamsin',
    name: 'Tamsin Heliograph',
    title: 'Ledge-Climber',
    look: { body: 0xc8a888, accent: 0xff5a5a, hat: 'miner', traits: ['pack', 'scarf'], size: 1 },
    at: { x: 1290, y: 300 },
    talks: [
      {
        when: REGENT,
        lines: [
          'My brother walked down from the Forge this morning. Walked. Through the front, past nobody.',
          'He said he never once missed a flash. Every noon for two years. He waved back with a shovel.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'I flashed the whole message today. Long and short, all of it, in plain sight. Nobody turned the prisms.',
          'The Forge flashed back from the iron hills. Three long. That means "how". I\'ll tell him how later.',
        ],
      },
      {
        when: { questDone: Q_SIGNAL },
        lines: [
          'He flashed back! Three short and a long — it means "alive". He\'s alive up in the iron hills.',
          'Prism will set his beams to block the crack again. Let him. We know how to talk around him now.',
        ],
      },
      {
        when: { quest: Q_SIGNAL },
        lines: [
          'Three mirror shards — I hid them where the Light-Warden doesn\'t look. Then up to the ledge under the crack.',
          'At noon the crack lets in the sun. A mirror up there throws it all the way to the Forge.',
        ],
      },
      {
        lines: [
          'My brother was sent to the Forge Court to work off our debt. Two years. No letters allowed out.',
          'But light goes where it likes. Up on the ledge, at noon, a mirror could flash a message to the hills.',
          'Prism keeps his beams across the crack at noon. Says the Prince\'s light is not for flashing about.',
        ],
      },
    ],
    barks: [
      { when: { questDone: Q_SIGNAL }, lines: ['Three short, one long!', 'Alive!'] },
      { lines: ['Long, short, short…', 'Noon is the only hour.', 'He\'ll be looking.'] },
    ],
  },

  // ── Steward Sard — the Prince's steward ──────────────────────────────
  {
    id: 'geode-sard',
    name: 'Steward Sard',
    title: 'Of the Cutting-House',
    look: { body: 0xd8c8b8, accent: 0xb8a4f0, hat: 'tophat', traits: ['glasses', 'book'], size: 1.1, eye: 0xe8e0ff },
    at: { x: 1640, y: 580 },
    talks: [
      {
        when: REGENT,
        lines: [
          'His Highness has taken the crown stone off. He keeps it on the windowsill. It catches the light.',
          'He sits with his back to the open door now. He says it is so he can feel the draught. I believe him.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'His Highness has asked for a mirror. A second one. So he can see his own back.',
          'He looked for a long time. Then he said "it is only a crack". I have served him nineteen years.',
        ],
      },
      {
        when: { courtReady: 'geode' },
        lines: [
          'All five of his craftsmen beaten. He has polished his crown stone twice this hour.',
          'If you mean to go in, I would like a word first. About the boy he was.',
        ],
      },
      {
        lines: [
          'The Cutting-House grades the Tithe of the whole court. Every stone passes under His Highness\'s loupe.',
          'He has never passed a flawed stone, and he will not be seen from behind. Do not try to pass him.',
          'If you mean to see him, you will have to beat his five first. They are proud of him. Mostly.',
        ],
      },
    ],
    barks: [
      { when: PRINCE, lines: ['A second mirror, he says.', 'Only a crack.'] },
      { lines: ['The Cutting-House is closed.', 'Face His Highness. Always.', 'Polish, polish.'] },
    ],
  },
];

const looks: NpcLook[] = [
  { body: 0xd0b498, accent: 0x8a52c4, hat: 'miner', traits: ['tool'] },
  { body: 0xe0c8b0, accent: 0xb88a6a, hat: 'headwrap', traits: ['apron'] },
  { body: 0xc4a888, accent: 0x5a7ab8, hat: 'coif', traits: ['satchel'] },
  { body: 0xdcc4ac, accent: 0xf0b0c4, hat: 'none', traits: ['scarf'], size: 0.76 },
  { body: 0xb8987a, accent: 0x6e5a48, hat: 'miner', traits: ['tool', 'beard'], size: 1.18 },
  { body: 0xe8d4bc, accent: 0xc49af0, hat: 'goggles', traits: ['glasses', 'apron'] },
  { body: 0xcfae90, accent: 0xf0c048, hat: 'headwrap', traits: ['pack'] },
  { body: 0xd8bca2, accent: 0x9aaabb, hat: 'cap', traits: ['satchel'], size: 0.8 },
];

const barks: Talk[] = [
  {
    when: REGENT,
    lines: [
      'They\'re coming up out of the Sepulchre!',
      'I kept my flawed one. It\'s my favourite.',
      'No Tithe. No grading. No Wheel.',
      'Sing it! Sing it louder!',
    ],
  },
  {
    when: PRINCE,
    lines: [
      'The Prince yielded!',
      'He turned his back on the whole Row. On purpose.',
      'The Wheel\'s stopped.',
      'Oil in the lamps tonight.',
    ],
  },
  {
    when: { courtReady: 'geode' },
    lines: [
      'All five of the Prince\'s, beaten.',
      'The stranger\'s going up to the Cutting-House.',
    ],
  },
  {
    lines: [
      'Flawed. Wheel. Next.',
      'Grading day Thursday.',
      'Don\'t walk behind him.',
      'Mind the points overhead.',
      'Dark by the fourth bell.',
      'Hold it to the crack.',
      'Three carats short.',
      'The Wheel\'s turning again.',
    ],
  },
];

export const GEODE_CROWD: NonNullable<AreaDef['crowd']> = {
  count: 14,
  looks,
  paths: [
    // Along the avenue from the Quarrymouth cleft to the spires.
    [{ x: 200, y: 800 }, { x: 900, y: 800 }, { x: 1500, y: 800 }, { x: 2200, y: 800 }],
    [{ x: 2200, y: 800 }, { x: 1500, y: 800 }, { x: 900, y: 800 }, { x: 200, y: 800 }],
    // Up the north road to the crack and back.
    [{ x: 1200, y: 640 }, { x: 1200, y: 240 }, { x: 1200, y: 640 }, { x: 1200, y: 1180 }],
    // Down Lapidaries' Row.
    [{ x: 260, y: 1260 }, { x: 960, y: 1260 }, { x: 960, y: 900 }, { x: 260, y: 900 }],
    // Round Prism Square.
    [{ x: 1040, y: 680 }, { x: 1360, y: 680 }, { x: 1360, y: 920 }, { x: 1040, y: 920 }],
    // Through the Chime Garden.
    [{ x: 1500, y: 900 }, { x: 1700, y: 1270 }, { x: 2150, y: 1260 }, { x: 1700, y: 1270 }],
    // Past the Cutting-House steps.
    [{ x: 1500, y: 620 }, { x: 2100, y: 620 }, { x: 1500, y: 620 }, { x: 1500, y: 800 }],
  ],
  barks,
};
