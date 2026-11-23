import type { AreaDef, NpcDef, NpcLook, Talk } from '../../../../IslesTypes';
import { POOL_RECT, SHELL, STALL } from './spots';

/**
 * The people of the Cavern Court.
 *
 * The Echo Caves are where the Score never stops. It was sung into the rock long ago and it keeps
 * coming back — faint, always, under everything — and every morning each household goes to the
 * Echo Wall and gives it their verse, to keep the Repeat topped up. Talk is noise, and down here
 * noise carries: the Tuners' listening post hears every word that comes back wrong. So people
 * whisper, or sign, or say things twice so nobody can say they meant something else. The muted
 * wear white silk ribbons and talk with their hands; at Compline the listening-horn chimneys
 * carry the Great Organ down into every hearth, and families sit very still and listen for their own.
 */

const PRINCE = { prince: 'reprise' } as const;
const MAESTRO = { monarch: 'cadenza' } as const;

const Q_VOICE = 'cavern-q-fading-voice';
const Q_REST = 'cavern-q-a-rest';
const Q_LESSON = 'cavern-q-under-the-part';
const Q_BRIDGE = 'cavern-q-handropes';
const Q_ONCE = 'cavern-q-once';

export const CAVERN_NPCS: NpcDef[] = [
  // ── Mabyn Ringwell — the shop ────────────────────────────────────────
  {
    id: 'cavern-mabyn',
    name: 'Mabyn Ringwell',
    title: 'Chimes & Lanterns',
    look: { body: 0xd8c4a8, accent: 0x5ab8cc, hat: 'headwrap', traits: ['apron', 'lantern', 'glasses'], size: 1.05 },
    at: { x: STALL.x, y: STALL.y + 46 },
    role: { kind: 'shop', id: 'cavern-shop' },
    talks: [
      {
        when: MAESTRO,
        lines: [
          'I sold a chime this morning to a man who wants it to ring out of tune. On purpose. For his wife.',
          'Charms are on the rack, same as ever. Everything else down here has gone and got loud.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The Prince said something new this morning. I heard it from three people. Nobody can agree what it was.',
          'That\'s the first time in eleven years anything in this cave has been heard differently twice.',
        ],
      },
      {
        when: { questDone: Q_BRIDGE },
        lines: ['Hamish says the Lower Bridge has handropes again. I sold him my last good lantern for the far post.'],
      },
      {
        lines: [
          '(low) Chimes and lanterns. Keep your voice down near the post — the horn\'s turned this way today.',
          'Down here the Score never stops. Sung into the rock before I was born. It just keeps coming back.',
          'Every morning we give the Echo Wall our verse, so the Repeat never runs thin. That\'s the law.',
          'Charms on the rack — you can wear three. Things that hold a sound and give it back. Cave things.',
        ],
      },
    ],
    barks: [
      { when: PRINCE, lines: ['Lanterns! Bright ones! Nobody\'s hiding now!', 'Chimes that ring however they like!'] },
      { lines: ['(whisper) Chimes and lanterns.', '(whisper) Glowworm jars, fresh-fed.', '(whisper) Conchs, half price.', 'Shh — the horn.'] },
    ],
  },

  // ── Maud Penrose — the widow at the gallery ──────────────────────────
  {
    id: 'cavern-maud',
    name: 'Maud Penrose',
    title: 'Who Listens at the Gallery',
    look: { body: 0xc8b4a0, accent: 0x3a3a5a, hat: 'veil', traits: ['cane', 'scarf'], size: 0.92 },
    at: { x: 740, y: 720 },
    talks: [
      {
        when: MAESTRO,
        lines: [
          'They opened Tam\'s pipe. I heard him come down the mountain singing it — his own song. Out of tune.',
          'He always sang it out of tune. I never told him. I\'m going to tell him tonight, and he\'s going to laugh.',
        ],
      },
      {
        when: PRINCE,
        lines: ['The gallery still carries his song. Fainter. I sit at the far plate and it comes to me like a wave.'],
      },
      {
        when: { questDone: Q_VOICE },
        lines: [
          'The reeds are out of the walls. I sat at the plate an hour this morning and heard him three times.',
          'It\'s only the end of the second verse, mind. The bit he always got wrong. That\'s the bit that stayed.',
        ],
      },
      {
        when: { quest: Q_VOICE },
        lines: [
          'Into the gallery. Find where they\'ve pinned the tuning-reeds into the rim — four, I counted. Pull them.',
          'And mind Murmur. He hears you pulling them. He hears everything there.',
        ],
      },
      {
        lines: [
          '(whispering) My husband Tam sang his own tune at Vespers. Just once. Just a few bars of it.',
          'The Tuners took his voice for the Organ. But the gallery had already caught those few bars.',
          'They\'re still in there. If I sit on the far plate I can hear him. They\'re trying to drown him out.',
        ],
      },
    ],
    barks: [
      { when: { questDone: Q_VOICE }, lines: ['Three times this morning.', 'The bit he got wrong.'] },
      { lines: ['(whisper) Listen…', '(whisper) There. Did you hear?', '(whisper) Fainter today.'] },
    ],
  },

  // ── Wren Tallow — the girl who wants to hear her own voice ───────────
  {
    id: 'cavern-wren',
    name: 'Wren Tallow',
    title: 'Too Loud, Everyone Says',
    look: { body: 0xe2c8ac, accent: 0xf2b632, hat: 'beanie', traits: ['satchel'], size: 0.72 },
    at: { x: 1460, y: 520 },
    talks: [
      {
        when: MAESTRO,
        lines: [
          'I shouted MY NAME at the Echo Wall and it shouted WREN back! Mine! Not a single note of the Score!',
          'Everyone came running. Then everyone started shouting their names. It sounds like a market. It\'s BRILLIANT.',
        ],
      },
      {
        when: PRINCE,
        lines: ['The wall\'s quieter. You can hear a bit of you in it now, under the Score. Like a cat under a blanket.'],
      },
      {
        when: { questDone: Q_REST },
        lines: [
          'I go to the dead spot every day after Matins. I sing whatever I like and nothing comes back.',
          'Glimmer says that\'s what a rest is. A place in the music where it\'s your turn.',
        ],
      },
      {
        when: { quest: Q_REST },
        lines: ['Glimmer knows every crack in the roof. Ask her where the echo can\'t reach. She won\'t tell ME.'],
      },
      {
        lines: [
          'Do you know what my voice sounds like? Neither do I. Every time I shout, the cave shouts the Score back.',
          'I\'m given an E. My Part. I\'ve sung an E at the wall every morning since I was four. It sends back the Score.',
          'There must be somewhere it can\'t reach. Somewhere it would just be ME. Will you help me look?',
        ],
      },
    ],
    barks: [
      { when: MAESTRO, lines: ['WREN! …WREN!', 'Listen! That\'s ME!'] },
      { lines: ['Eeeeee.', 'Still the Score.', 'Where does it NOT reach?', 'I\'m not loud, I\'m just here.'] },
    ],
  },

  // ── Glimmer Sedge — the glowworm-keeper ──────────────────────────────
  {
    id: 'cavern-glimmer',
    name: 'Glimmer Sedge',
    title: 'Keeper of the Glowworm Roof',
    look: { body: 0xb8c4c0, accent: 0x5ad0e8, hat: 'miner', traits: ['pack', 'lantern'], size: 1 },
    at: { x: 1150, y: 1320 },
    talks: [
      {
        when: MAESTRO,
        lines: ['The worms are brighter. Nobody believes me. They like noise, I think. Proper noise, not the Score.'],
      },
      {
        when: PRINCE,
        lines: ['I\'ve kept this roof thirty years and never once heard it hum a different tune. Today it hummed two.'],
      },
      {
        when: { questDone: Q_REST },
        lines: ['The girl\'s at the dead spot every morning. I go and keep watch with the lamp shut. Don\'t tell anyone.'],
      },
      {
        lines: [
          'Glowworms. Every thread on that roof is a worm fishing for midges. I feed them, I count them, I mend the dark.',
          'The Tuners say the roof must stay lit for the Repeat. Something about the stone singing best in blue light.',
          'I just like the worms. They don\'t sing. They don\'t whisper. They glow and that is the whole of it.',
        ],
      },
    ],
    barks: [{ lines: ['Mind the threads.', 'Sixty-one… sixty-two…', 'Midges for the roof.', 'Bright tonight.'] }],
  },

  // ── Agnes Lowe — the pool angler ─────────────────────────────────────
  {
    id: 'cavern-agnes',
    name: 'Agnes Lowe',
    title: 'Angler of the Ringing Pool',
    look: { body: 0xd0b494, accent: 0x274f58, hat: 'souwester', traits: ['rod', 'satchel', 'pipe'], size: 1.05 },
    at: { x: POOL_RECT.x + POOL_RECT.w / 2 + 60, y: POOL_RECT.y + POOL_RECT.h + 60 },
    talks: [
      {
        when: MAESTRO,
        lines: ['Pool rang for an hour after the Maestro fell. A different note every ripple. I caught nothing. Worth it.'],
      },
      {
        when: PRINCE,
        lines: ['The grouper boomed this morning like it meant it. First time I\'ve heard that fish sound happy.'],
      },
      {
        when: { questDone: Q_LESSON },
        lines: ['Cantle\'s bucket of roach is going like a chandelier in a gale. Whatever he\'s teaching, nobody can hear it.'],
      },
      {
        lines: [
          'This pool rings. Drop a pebble in and it sings like struck glass, and the cave sings it back.',
          'A plain line won\'t hold here — the ringing shakes it slack. You want a tuning rod, from the quay tackle.',
          'Roach bite at anything. The echo eel clicks before it takes. And the hollow grouper… patience.',
        ],
      },
    ],
    barks: [{ lines: ['(whisper) Ringing well today.', 'Shh. Eel.', 'Tuning rod, or don\'t bother.', 'There\'s a grouper in there.'] }],
  },

  // ── Brother Cantle — the cave-choir master ───────────────────────────
  {
    id: 'cavern-cantle',
    name: 'Brother Cantle',
    title: 'Master of the Cave-Choir',
    look: { body: 0xd8c8b0, accent: 0x6a4a8a, hat: 'hood', traits: ['book', 'glasses', 'beard'], size: 1.1 },
    at: { x: 1640, y: 410 },
    talks: [
      {
        when: MAESTRO,
        lines: [
          'The children sang a chord at the Echo Wall today. In the open. Three parts. Nobody fined anyone.',
          'I wept like a broken drain. They had to finish it without me. They didn\'t need me. That is the point.',
        ],
      },
      {
        when: PRINCE,
        lines: ['I taught the lesson in the open this morning. The bats stayed in the Hollow. Nobody came.'],
      },
      {
        when: { questDone: Q_LESSON },
        lines: ['Chirrup\'s bats stay in now. The children sing under their Parts every evening. A second note. Theirs.'],
      },
      {
        when: { quest: Q_LESSON, stage: 1 },
        lines: ['Bring the roach in the bucket — I\'ll set it by the stalls. Every flip is a peal. Wonderful.'],
      },
      {
        lines: [
          'I train the cave-choir. One Part each, as the law says. I teach them to sing it straight and true.',
          '(lower) And when the Tuners aren\'t listening, I teach them to sing a little something underneath.',
          'Not a different note. A harmony. The Score never said a choir couldn\'t lean on itself.',
        ],
      },
    ],
    barks: [
      { when: PRINCE, lines: ['And — THREE parts!', 'Lean on it. Lean.'] },
      { lines: ['(whisper) From the second bar.', '(whisper) Straight and true.', '(whisper) Softer. Softer.'] },
    ],
  },

  // ── Hamish Knott — the ropewright ────────────────────────────────────
  {
    id: 'cavern-hamish',
    name: 'Hamish Knott',
    title: 'Ropewright of the Bridges',
    look: { body: 0xc4a07c, accent: 0xa88a58, hat: 'cap', traits: ['tool', 'beard', 'pack'], size: 1.25 },
    at: { x: 1010, y: 590 },
    talks: [
      {
        when: MAESTRO,
        lines: ['I\'m putting a third bridge over. Right where the Prince said nobody needed one. Lovely thick rope.'],
      },
      {
        when: PRINCE,
        lines: ['Both bridges up, both handropes tarred. Folk crossing to the gallery whenever they like. As it should be.'],
      },
      {
        when: { questDone: Q_BRIDGE },
        lines: ['Look at them. Handropes, both sides, tarred to a shine. Shale won\'t be cutting them again soon.'],
      },
      {
        when: { quest: Q_BRIDGE },
        lines: ['Four coils. I stashed them round the court before the Tuners came asking. Fetch them back here.'],
      },
      {
        lines: [
          'Ropewright. I keep both bridges over the chasm. Upper one here, the Lower down by the pool road.',
          'Last week somebody cut the Lower Bridge\'s handropes. Clean through. Right after the choir crossed for Vespers.',
          'The Prince says nobody needs to cross to the gallery but the keepers. You know who listens at the gallery.',
        ],
      },
    ],
    barks: [{ lines: ['Mind the ninth plank.', 'Hold the rope, not the rail.', 'Tar and twine.', 'Clean cut. Clean.'] }],
  },

  // ── Ansel Bourne — old, muted, signing ───────────────────────────────
  {
    id: 'cavern-ansel',
    name: 'Ansel Bourne',
    title: 'Muted (white ribbon)',
    look: { body: 0xd4c4b0, accent: 0xf6f6f0, hat: 'none', traits: ['scarf', 'cane', 'beard'], size: 0.95 },
    at: { x: 2080, y: 470 },
    talks: [
      {
        when: MAESTRO,
        lines: [
          '(He opens his mouth. A voice comes out — cracked, enormous.) I SANG BASS. I SANG BASS IN HIS CHOIR.',
          '(He laughs, and cannot stop, and signs between the laughing:) Forty years. Forty years in a pipe.',
        ],
      },
      {
        when: PRINCE,
        lines: ['(He signs slowly:) Rep-rise. Small boy. Asked me once — if a thing is said once — is it true? (He shrugs.)'],
      },
      {
        lines: [
          '(He touches the white ribbon at his throat, then signs: a hand cupped to the ear, then pointing up.)',
          '(He signs: the Organ. Then taps his chest. Then holds up four fingers, four times.) Forty years.',
          '(He signs, smiling: at Compline, listen to the chimney. Lowest note. That is me.)',
        ],
      },
    ],
    barks: [{ lines: ['(signs: hello)', '(signs: listen)', '(taps the ribbon, smiles)', '(signs: lowest note)'] }],
  },

  // ── Coda Mallory — Reprise's steward ─────────────────────────────────
  {
    id: 'cavern-coda',
    name: 'Coda Mallory',
    title: 'Steward of the Sounding Shell',
    look: { body: 0xc8c0d8, accent: 0x8a8ce8, hat: 'tophat', traits: ['book', 'glasses'], size: 1.05 },
    at: { x: SHELL.x + 190, y: SHELL.y + 90 },
    talks: [
      {
        when: MAESTRO,
        lines: ['He\'s writing. His own words, in a book. He tears out every page and starts over. He seems happy.'],
      },
      {
        when: PRINCE,
        lines: [
          'He said, "Thank you." Just once. I waited for the second one. It never came. I think he meant it.',
        ],
      },
      {
        when: { courtReady: 'cavern' },
        lines: [
          'Five of his keepers, beaten. His Highness has heard. He has said so — twice, as always.',
          'If you mean to go in, go and learn who he was first. There is a man at the grotto doors who knew.',
        ],
      },
      {
        lines: [
          'I keep the Shell for His Highness. Anything said inside comes out at the mouth a moment later. Louder.',
          'He says nothing that hasn\'t been said before. He finds it restful. I find it… I find it restful too. Too.',
          'Mind you speak plainly, if you speak to him. He will repeat whatever you say, and it will become the law.',
        ],
      },
    ],
    barks: [{ lines: ['(whisper) Twice heard, never wrong.', 'The Shell is listening.', 'Speak plainly. Plainly.'] }],
  },
];

const looks: NpcLook[] = [
  { body: 0xd6c0a4, accent: 0x5ab8cc, hat: 'headwrap', traits: ['lantern'] },
  { body: 0xc8b49c, accent: 0xf6f6f0, hat: 'none', traits: ['scarf'] },
  { body: 0xbca08a, accent: 0x6a4a8a, hat: 'hood', traits: ['book'] },
  { body: 0xe0ccb4, accent: 0xf2b632, hat: 'beanie', traits: ['satchel'], size: 0.74 },
  { body: 0xb49a80, accent: 0x274f58, hat: 'miner', traits: ['tool', 'beard'], size: 1.15 },
  { body: 0xd8c8b8, accent: 0xb8843e, hat: 'cap', traits: ['pack'] },
  { body: 0xc8b8a8, accent: 0xf6f6f0, hat: 'veil', traits: ['cane'] },
  { body: 0xd0b8a0, accent: 0x3a3a5a, hat: 'bandmaster', traits: ['scarf'], size: 0.9 },
];

const barks: Talk[] = [
  {
    when: MAESTRO,
    lines: [
      'My brother\'s voice came home!',
      'Sing anything! ANYTHING!',
      'The wall\'s saying my name!',
      'No more verses for the Repeat!',
    ],
  },
  {
    when: PRINCE,
    lines: [
      'The Prince said something new!',
      'Nobody gave the wall a verse today.',
      'Did you hear? He only said it once.',
      'The post\'s horn is turned to the rock.',
    ],
  },
  {
    when: { courtReady: 'cavern' },
    lines: ['(whisper) All five keepers, beaten.', '(whisper) The stranger\'s going to the Shell.'],
  },
  {
    lines: [
      '(whisper) Have you given your verse?',
      '(whisper) The horn\'s turned this way.',
      '(signs: be careful)',
      '(whisper) Vespers soon.',
      '(whisper) Mind the ninth plank.',
      '(humming the Score, very softly)',
      '(whisper) Say it twice.',
      '(signs: listen — Compline)',
    ],
  },
];

export const CAVERN_CROWD: NonNullable<AreaDef['crowd']> = {
  count: 14,
  looks,
  paths: [
    // Along Echo Street from the mouth to the crossing and back.
    [{ x: 2240, y: 800 }, { x: 1700, y: 820 }, { x: 1200, y: 800 }, { x: 1700, y: 820 }],
    // Down the Libretto road and up again.
    [{ x: 1200, y: 820 }, { x: 1200, y: 1250 }, { x: 1200, y: 1480 }, { x: 1200, y: 1250 }],
    // To the Echo Wall to give the verse.
    [{ x: 1200, y: 800 }, { x: 1260, y: 600 }, { x: 1280, y: 450 }, { x: 1260, y: 600 }],
    // Over the upper bridge to the gallery and back.
    [{ x: 1080, y: 640 }, { x: 960, y: 556 }, { x: 780, y: 556 }, { x: 640, y: 700 }, { x: 780, y: 556 }, { x: 960, y: 556 }],
    // Round the pool's gours.
    [{ x: 1250, y: 1220 }, { x: 1800, y: 1220 }, { x: 1800, y: 900 }, { x: 1250, y: 900 }],
    // Along the grotto doors on the north side.
    [{ x: 1800, y: 480 }, { x: 2260, y: 480 }, { x: 2260, y: 620 }, { x: 1800, y: 620 }],
    // Along the south houses.
    [{ x: 1500, y: 1400 }, { x: 2250, y: 1400 }],
  ],
  barks,
};
