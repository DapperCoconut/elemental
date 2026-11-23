import type { AreaDef, NpcDef, NpcLook, Talk } from '../../../../IslesTypes';

/**
 * The people of the Hush Court.
 *
 * Hush keeps the silence between the Hours. Its wardens fine "noise" — any word above a whisper,
 * a dropped pan, a laugh, a creaking board — and a voice that sings its own tune is taken by the
 * Tuners, brought to the Quiet House, and piped up the mountain into the Great Organ. So people
 * here whisper, or sign with the four permitted hand-shapes (STOP, HOLD, GO, HUSH), and the muted
 * — a white silk ribbon at the throat — sign only. Written lines in brackets are what someone
 * signs; quiet lines are whispered. Everyone pads everything. Everyone knows a voice in the Organ.
 */

const PRINCE = { prince: 'mute' } as const;
const MAESTRO = { monarch: 'cadenza' } as const;

export const Q_CLAPPER = 'hush-q-clapper';
export const Q_TABLE = 'hush-q-quiet-table';
export const Q_SIGN = 'hush-q-sign-name';
export const Q_TRUMPETS = 'hush-q-listening-trumpets';
export const Q_HOUSE = 'hush-q-quiet-house';

export const HUSH_NPCS: NpcDef[] = [
  // ── Fleece Hartwell — the shop ───────────────────────────────────────
  {
    id: 'hush-fleece',
    name: 'Fleece Hartwell',
    title: 'Felts, Muffs & Mufflers',
    look: { body: 0xd8c0a8, accent: 0x6e5466, hat: 'earmuffs', traits: ['scarf', 'apron', 'satchel'], size: 1.05 },
    at: { x: 640, y: 962 },
    role: { kind: 'shop', id: 'hush-shop' },
    talks: [
      {
        when: MAESTRO,
        lines: [
          'I sold a set of brass bells this morning. To sew on a coat. ON PURPOSE. I nearly fainted on the counter.',
          'Felt\'s still felt. Keeps the cold out. The charms are on the rail, same as ever. Ring something on the way.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'Nobody wants mufflers! Three days and not one muffler. Everybody wants a scarf you can talk through.',
          'I\'m cutting the old wardens\' earmuffs down into mittens. Waste not. Charms are on the rail.',
        ],
      },
      {
        when: { questDone: Q_TRUMPETS },
        lines: [
          '(whispering) The trumpets are gone off the eaves. I said "blast" in my own kitchen and nobody came.',
          'I said it again, louder. Nobody came. Charms on the rail, love — and I\'m not whispering that bit.',
        ],
      },
      {
        lines: [
          '(whispering) Off the Padded Way and through the gate — fine number one, you spoke at the sentry box.',
          '(whispering) Wardens fine noise between the Hours. Talk above a whisper, drop a pan, creak a board.',
          '(whispering) Sing your own tune and it\'s not a fine. It\'s the Tuners. So we pad everything.',
          '(whispering) Charms on the rail. Wear three. Felt things, but they\'ll fight. I\'d buy the earmuffs.',
        ],
      },
    ],
    barks: [
      { when: PRINCE, lines: ['Scarves you can TALK through!', 'Mittens from earmuffs, half price!'] },
      {
        lines: [
          '(whispering) Muffs, mufflers, earmuffs.', '(whispering) Felt soles, two a pair.', '(signs HOLD at a child)',
          '(whispering) Pad your pans, madam.',
        ],
      },
    ],
  },

  // ── Agnes Bellamy — the old bellwright ───────────────────────────────
  {
    id: 'hush-agnes',
    name: 'Agnes Bellamy',
    title: 'Bellwright, Retired by Order',
    look: { body: 0xc8a890, accent: 0x9a7a4a, hat: 'beanie', traits: ['cane', 'glasses', 'scarf'], size: 0.92 },
    at: { x: 1010, y: 890 },
    talks: [
      {
        when: MAESTRO,
        lines: [
          'I rang it at noon. Not for an Hour. For nothing. For the sound of it. They heard it in the Carillon.',
          'Sixty years I made bells and forty I wasn\'t allowed to ring one. Ring it yourself. Go on. Pull.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The clapper\'s back on its hook. I hung it myself with a ladder and a grandson. It\'s been rung twice.',
          'The first time everybody on the green fell down flat. The second time a few of them laughed.',
        ],
      },
      {
        when: { questDone: Q_CLAPPER },
        lines: [
          'The clapper\'s whole. Sexton Toll\'s sitting on his own front step with his head in his hands.',
          'I\'m keeping it under my bed for now. When the Prince falls, it goes back where it belongs.',
        ],
      },
      {
        when: { quest: Q_CLAPPER },
        lines: [
          '(whispering) Three pieces. The mill yard, the boardwalk end, the drift by the Sign School.',
          '(whispering) My husband buried them where nobody digs. Snow nobody shovels. Bring them to me.',
        ],
      },
      {
        lines: [
          '(whispering) That\'s my bell. I cast it, sixty years back. Best tone on the isle. A true E, a big one.',
          '(whispering) When the Maestro came he had the clapper drawn. Now the sexton swings it and it says nothing.',
          '(whispering) "A silent toll," they call it. Everyone stops. Nobody hears it, so everybody obeys it.',
          '(whispering) A bell that can\'t ring. What a thing to do to a bell. What a thing to do to a town.',
        ],
      },
    ],
    barks: [
      { when: PRINCE, lines: ['Pull the rope, dear. It\'s allowed.', 'A true E. Listen to it.'] },
      { lines: ['(whispering) A true E, it was.', '(whispering) Nothing in its mouth.', '(signs HUSH, very sadly)'] },
    ],
  },

  // ── Hettie Muff — the Quiet Table ────────────────────────────────────
  {
    id: 'hush-hettie',
    name: 'Hettie Muff',
    title: 'Cook at the Quiet Table',
    look: { body: 0xe0c4ac, accent: 0x6f7a5e, hat: 'chef', traits: ['apron', 'scarf'], size: 1.12 },
    at: { x: 960, y: 1290 },
    talks: [
      {
        when: MAESTRO,
        lines: [
          'I banged the pot with the ladle to call them in. BANG BANG BANG. Thirty years I\'ve wanted to do that.',
          'They come in talking now. Some of them\'ve got voices back already. One of them sang the soup.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The muted are still muted — their voices are up the mountain in the Organ. But they\'re laughing.',
          'You can hear a muted laugh, you know. It\'s all breath. It\'s the loveliest noise at this table.',
        ],
      },
      {
        when: { questDone: Q_TABLE },
        lines: [
          '(whispering) Mullet soup, three days running, and the fine book closed. The table\'s full every night.',
          '(whispering) Pennywhisper hasn\'t been back. If she comes, there\'s a bowl for her. Even her.',
        ],
      },
      {
        when: { quest: Q_TABLE },
        lines: [
          '(whispering) Three mute mullet off the mere. Gaffer Hollin will lend you the knack of it. Then bring them.',
        ],
      },
      {
        lines: [
          '(whispering) This is the Quiet Table. The muted eat here. They can\'t pay a fine, so they can\'t buy bread.',
          '(whispering) Can\'t argue a fine, either — no voice. So the wardens fine them twice as often.',
          '(whispering) Spoons wrapped in rag so they don\'t clink. Bowls on felt. Nobody says grace. They sign it.',
        ],
      },
    ],
    barks: [
      { when: PRINCE, lines: ['Soup! SOUP!', 'Come and eat, loud as you like!'] },
      { lines: ['(whispering) Soup\'s on.', '(signs GO toward the bowls)', '(whispering) Mind the spoons.'] },
    ],
  },

  // ── Tobin Ashby — the boy who wants his name ─────────────────────────
  {
    id: 'hush-tobin',
    name: 'Tobin Ashby',
    title: 'Pupil of the Sign School',
    look: { body: 0xe8ccb0, accent: 0x5a6e8a, hat: 'beanie', traits: ['scarf', 'satchel'], size: 0.72 },
    at: { x: 2000, y: 968 },
    talks: [
      {
        when: MAESTRO,
        lines: [
          'Mam got her voice back! It came out of a pipe like steam and went straight down the mountain to her.',
          'She said my name out loud. Then she said it in sign. Then out loud again. She keeps doing both.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The Sign School\'s teaching a fifth shape now. And a sixth! Miss says we can make up as many as we like.',
          'I made one for "snowball". It\'s mostly throwing.',
        ],
      },
      {
        when: { questDone: Q_SIGN },
        lines: [
          '(he signs it, grinning: a little bird on the palm, flying off) That\'s me. That\'s my name. Mam made it.',
          '(whispering) The posts are scrubbed white again, but I\'ve got it in my hands now. You can\'t scrub hands.',
        ],
      },
      {
        when: { quest: Q_SIGN },
        lines: [
          '(whispering) Mam chalked it under three of the signing-posts so I\'d find it. Before they scrub them.',
          '(whispering) Copy them down — the green one, the north road, the school. Then take them to Mam.',
        ],
      },
      {
        lines: [
          '(whispering) My mam\'s muted. She wears the ribbon. She sang a lullaby that wasn\'t in the Score.',
          '(whispering) At school we learn the four shapes. STOP, HOLD, GO, HUSH. There\'s no shape for a name.',
          '(whispering) Mam had a name for me in sign before they took her voice. She can\'t teach it. It\'s a fifth shape.',
        ],
      },
    ],
    barks: [
      { when: PRINCE, lines: ['Snowball! (that\'s the shape)', 'Five shapes! Six!'] },
      { lines: ['(signs STOP, HOLD, GO, HUSH)', '(whispering) There\'s no shape for a name.', '(practises in his mittens)'] },
    ],
  },

  // ── Wren Ashby — muted ───────────────────────────────────────────────
  {
    id: 'hush-wren',
    name: 'Wren Ashby',
    title: 'Muted (a white ribbon)',
    look: { body: 0xd8bca8, accent: 0xfbfaf4, hat: 'hood', traits: ['scarf', 'bandage'], size: 0.96 },
    at: { x: 2260, y: 1150 },
    talks: [
      {
        when: MAESTRO,
        lines: [
          'I sang him the lullaby. The one they took me for. Out loud. In my own voice. It\'s a bit cracked now.',
          'Cracked is mine. Thank you. Thank you. I\'ll say it till it wears out.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          '(she signs, fast, with shapes you have never seen — then laughs, a breath with no voice in it)',
          '(she points up the mountain, to the Organ, and makes a fist, and opens it: "soon")',
        ],
      },
      {
        when: { questDone: Q_SIGN },
        lines: [
          '(she signs his name — a bird on the palm, flying off — and then the shape for "you", and bows)',
          '(she touches the ribbon at her throat, and then your hand, and holds it a long moment)',
        ],
      },
      {
        lines: [
          '(she wears a white silk ribbon at her throat. She signs HOLD, then points at her mouth, then shakes her head)',
          '(she points across the mere to the Sign School, where a small boy is practising, and smiles)',
          '(she signs HUSH, very slowly, and then — when no warden is looking — a shape that isn\'t one of the four)',
        ],
      },
    ],
    barks: [
      { lines: ['(she signs HOLD)', '(she watches the school across the mere)', '(a breath that might be humming)'] },
    ],
  },

  // ── Cordwain Soft — the wardens' bootmaker ───────────────────────────
  {
    id: 'hush-cordwain',
    name: 'Cordwain Soft',
    title: 'Bootmaker to the Wardens',
    look: { body: 0xb8987c, accent: 0x44352a, hat: 'cap', traits: ['apron', 'tool', 'glasses', 'beard'], size: 1.08 },
    at: { x: 760, y: 610 },
    talks: [
      {
        when: MAESTRO,
        lines: [
          'I\'m making boots with hobnails. Big ones. You\'ll hear my customers from the Carillon.',
          'First pair\'s for Agnes. She wants to stamp up the Organ stairs and kick a pipe.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'Three wardens came in wanting their felt soles off. Off! They want to hear themselves walk.',
          'I said it\'d cost them. They said fine. Then they laughed, because fine. Everybody\'s laughing at "fine".',
        ],
      },
      {
        when: { questDone: Q_TRUMPETS },
        lines: [
          '(whispering, then not) The trumpets are down, and Tiptoe\'s beat. People are talking in their kitchens.',
          'Not loud. Just talking. Do you know what that sounds like through a wall? Like rain. Like being alive.',
        ],
      },
      {
        when: { quest: Q_TRUMPETS },
        lines: [
          '(whispering) Four trumpets: the cottage by the gate, under the green, the house on the east road, north road.',
          '(whispering) Pull them off the eaves. Tiptoe listens at them on his rounds. He\'ll come looking.',
        ],
      },
      {
        lines: [
          '(whispering) I sew the wardens\' soles. Felt, three layers, a quilt of fleece between. Not a footfall.',
          '(whispering) That\'s how they walk up on you. That\'s how they hear you before you hear them.',
          '(whispering) And brass trumpets on the eaves, turned to the windows. I made the brackets. God help me.',
          '(whispering) I want to put it right. I need somebody who doesn\'t mind being heard.',
        ],
      },
    ],
    barks: [
      { when: PRINCE, lines: ['Hobnails! Who wants hobnails?', 'Stamp, why don\'t you!'] },
      { lines: ['(whispering) Three layers, a quilt between.', '(stitching, very quietly)', '(whispering) Not a footfall.'] },
    ],
  },

  // ── Sister Lintel — clerk of the Quiet House ─────────────────────────
  {
    id: 'hush-lintel',
    name: 'Sister Lintel',
    title: 'Register-Keeper of the Quiet House',
    look: { body: 0xd8d0c4, accent: 0x2c3352, hat: 'veil', traits: ['book', 'glasses'], size: 1 },
    at: { x: 1770, y: 630 },
    talks: [
      {
        when: MAESTRO,
        lines: [
          'I am reading the register aloud on the green. Every name. It will take nine days. People are coming.',
          'When I read a name, somebody in the crowd shouts "HERE". Even when they aren\'t back yet. Especially then.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'His Highness has sat down on the step among the ribbons. He is untying them. One at a time.',
          'He asks me each name before he unties it. I read it out. He says it after me. He has a soft voice.',
        ],
      },
      {
        when: { courtReady: 'hush' },
        lines: [
          '(whispering) Five of his wardens beaten. He watched from the bell-cote. He has not moved since.',
          '(whispering) I keep the register of the muted. Every ribbon on that rail is a line in my book.',
        ],
      },
      {
        lines: [
          '(whispering) The Quiet House. The muted are brought here first, gently, with a blanket round them.',
          '(whispering) The Tuners take the voice in the back room. It goes up the pipe to the Organ in the night.',
          '(whispering) I write the name. A warden ties the ribbon. I have written eleven hundred names.',
          '(whispering) His Highness reads the register every evening. He has never said why. He has no voice either.',
        ],
      },
    ],
    barks: [
      { when: PRINCE, lines: ['Here! (she says it for every name)', 'He\'s untying them.'] },
      { lines: ['(whispering) Eleven hundred and four.', '(she turns a page without a sound)', '(signs HUSH)'] },
    ],
  },

  // ── Gaffer Hollin — the mere's old fisherman ─────────────────────────
  {
    id: 'hush-hollin',
    name: 'Gaffer Hollin',
    title: 'Keeper of the Still Mere',
    look: { body: 0xc4a88e, accent: 0x3a4a5e, hat: 'souwester', traits: ['rod', 'pipe', 'beard'], size: 1.04 },
    at: { x: 1590, y: 1150 },
    talks: [
      {
        when: MAESTRO,
        lines: [
          'I SPLASHED. On purpose. Threw a stone in the mere and watched the rings go all the way to the far bank.',
          'Fish didn\'t mind. Fish never minded. It was only ever the wardens who minded.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The sturgeon came up and rolled this morning. Big as a coffin. Showed me his belly and went down again.',
          'I think he\'d been waiting for a noise. Go on, cast. Splash your landing. Nobody will fine you.',
        ],
      },
      {
        lines: [
          '(whispering) Still mere. Mirror flat. A splash carries to the far bank and the wardens fine you for it.',
          '(whispering) You\'ll want a tuning rod — they sell them down the Carillon. Plain rods spook the fish here.',
          '(whispering) Mullet bite easy. Whiting\'s quicker. The sturgeon — the sturgeon you feel before you see.',
          '(whispering) Cast soft. Reel soft. Land him in the snow, not on the boards. Boards creak.',
        ],
      },
    ],
    barks: [
      { when: PRINCE, lines: ['SPLASH, I say!', 'Rings to the far bank!'] },
      { lines: ['(whispering) Cast soft.', '(whispering) Boards creak.', '(he watches the float, not breathing)'] },
    ],
  },

  // ── Warden Hask — the West Gate ──────────────────────────────────────
  {
    id: 'hush-hask',
    name: 'Warden Hask',
    title: 'Sentry of the West Gate',
    look: { body: 0xb8a898, accent: 0x2c3352, hat: 'earmuffs', traits: ['lantern', 'book'], size: 1.16, eye: 0xffd88a },
    at: { x: 190, y: 950 },
    talks: [
      {
        when: MAESTRO,
        lines: [
          'I\'ve torn up the fine book. Page by page, in the square, loud as I could tear. It was very satisfying.',
          'I\'m on the gate still. Now I just say "hello" to people. Out loud. I\'m terrible at it. I\'m practising.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'No fines today. Orders. Well — no orders. Nobody\'s giving orders. I\'m standing here out of habit.',
          'I took the earmuffs off. It\'s very loud out here. A crow. A cart. Is it always this loud?',
        ],
      },
      {
        lines: [
          '(he holds up a ledger and taps a page) Speaking at the gate. One fine. Speaking in the street. Two.',
          '(whispering) Between the Hours, everything is noise. At the Hours, you sing your Part. Simple.',
          '(whispering) I\'ve written you down already. You walked in with boots on. Get some felt on those.',
        ],
      },
    ],
    barks: [
      { when: PRINCE, lines: ['Hello! (too loud) Sorry. Hello.', 'Is it always this loud?'] },
      { lines: ['(taps the fine book)', '(whispering) Noise.', '(signs STOP)'] },
    ],
  },
];

const looks: NpcLook[] = [
  { body: 0xd8c0a8, accent: 0x7d8290, hat: 'earmuffs', traits: ['scarf'] },
  { body: 0xc8a890, accent: 0x2c3352, hat: 'earmuffs', traits: ['lantern'], size: 1.1 },
  { body: 0xe4c8ac, accent: 0x6e5466, hat: 'beanie', traits: ['scarf', 'satchel'] },
  { body: 0xdcc0a4, accent: 0xfbfaf4, hat: 'hood', traits: ['scarf'] },
  { body: 0xb89878, accent: 0x6f7a5e, hat: 'cap', traits: ['pack', 'beard'], size: 1.12 },
  { body: 0xe8d0b8, accent: 0x5a6e8a, hat: 'beanie', traits: ['scarf'], size: 0.74 },
  { body: 0xcfae94, accent: 0xc9b99a, hat: 'hood', traits: ['book'] },
  { body: 0xd4b49a, accent: 0xfbfaf4, hat: 'none', traits: ['scarf', 'cane'], size: 0.9 },
];

const barks: Talk[] = [
  {
    when: MAESTRO,
    lines: [
      'I can hear my sister!', 'They\'re opening the pipes!', 'SING SOMETHING! Anything!',
      'Out of tune and proud of it!',
    ],
  },
  {
    when: PRINCE,
    lines: [
      'The Prince is untying the ribbons!', 'Talk! You can TALK!', 'No fines today!', 'Somebody whistled!',
    ],
  },
  {
    when: { courtReady: 'hush' },
    lines: ['(whispering) All five wardens beaten.', '(whispering) The stranger\'s going to the Quiet House.'],
  },
  {
    lines: [
      '(whispering) Vespers soon.', '(signs HUSH)', '(whispering) Mind the boards.', '(whispering) Pad your pans.',
      '(signs STOP, then GO)', '(whispering) Not so loud.', '(whispering) Fined again.', '(a breath with no voice in it)',
    ],
  },
];

export const HUSH_CROWD: NonNullable<AreaDef['crowd']> = {
  count: 13,
  looks,
  paths: [
    // Up and down the Padded Way.
    [{ x: 120, y: 1000 }, { x: 700, y: 1000 }, { x: 930, y: 960 }, { x: 700, y: 1000 }],
    // Round Bell Green.
    [{ x: 960, y: 900 }, { x: 1150, y: 1010 }, { x: 1340, y: 900 }, { x: 1150, y: 700 }],
    // The north road to the Quiet House and back.
    [{ x: 1250, y: 680 }, { x: 1400, y: 450 }, { x: 1700, y: 570 }, { x: 2200, y: 580 }, { x: 1700, y: 570 }, { x: 1400, y: 450 }],
    // The east street to the Sign School.
    [{ x: 1380, y: 910 }, { x: 1800, y: 920 }, { x: 2280, y: 930 }, { x: 1800, y: 920 }],
    // Down to the Quiet Table.
    [{ x: 1150, y: 1040 }, { x: 1150, y: 1320 }, { x: 1150, y: 1040 }],
    // Lantern Lane.
    [{ x: 390, y: 980 }, { x: 460, y: 740 }, { x: 470, y: 480 }, { x: 460, y: 740 }],
    // Along the boardwalk.
    [{ x: 1460, y: 1136 }, { x: 2120, y: 1136 }],
  ],
  barks,
};
