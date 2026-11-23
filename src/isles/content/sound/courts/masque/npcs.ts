import type { AreaDef, NpcDef, NpcLook, Talk } from '../../../../IslesTypes';

/**
 * The people of the Masquerade Court.
 *
 * The canal town where the Maestro's choir is kept faceless. Prince Facade's decree: a choir has
 * no faces, only Parts — so everyone over seven goes masked from the morning bell to the Compline
 * fireworks, and every mask carries its wearer's Part painted small on the brow, so that the
 * Tuners, who cannot see who you are, can always see what you are meant to sing. Taking off your
 * mask in the street is noise. The balls never stop, because a ball is a place where nobody need
 * speak. People here whisper behind fans, talk in the language of masks (a tilt, a touch to the
 * brow), and the muted — white ribbon at the throat — sign under the music.
 */

const PRINCE = { prince: 'facade' } as const;
const MONARCH = { monarch: 'cadenza' } as const;

const Q_BLANK = 'masque-q-blank-face';
const Q_CORNERS = 'masque-q-corner-mirrors';
const Q_TUBE = 'masque-q-night-boats';
const Q_QUIET = 'masque-q-quiet-compline';
const Q_FACE = 'masque-q-his-own-face';

export const MASQUE_NPCS: NpcDef[] = [
  // ── Ottavia Gesso — the mask-maker, the court shop ───────────────────
  {
    id: 'masque-ottavia',
    name: 'Ottavia Gesso',
    title: 'Masks & Mirrors',
    look: { body: 0xd8b49a, accent: 0xf0c75a, hat: 'domino', traits: ['apron', 'glasses', 'tool'], size: 1.05, eye: 0x9a7428 },
    at: { x: 430, y: 1062 },
    role: { kind: 'shop', id: 'masque-shop' },
    talks: [
      {
        when: MONARCH,
        lines: [
          'I have a commission for forty masks, and not one of them is to have a Part on the brow. Forty!',
          'People want faces that look like their faces. I have had to learn to paint freckles.',
          'Charms are on the shelf as always. Everything else here is suddenly a portrait.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'He came to the shop. My brother. He stood in the door without his mask and asked if I knew him.',
          'I said I would know that nose anywhere, and he laughed out loud in the street. Out LOUD.',
        ],
      },
      {
        when: { questDone: Q_FACE },
        lines: [
          'You took him the dory. Our mother\'s way, with onions and raisins. He will know what it means.',
          'Whatever happens in there — thank you for not going in angry.',
        ],
      },
      {
        when: { questDone: Q_BLANK },
        lines: [
          'Pippo\'s mask. No note on the brow. Do you know how long since I made a blank one? Twenty-two years.',
          'The last was for my brother. He wore it one day, and then they gave him another.',
        ],
      },
      {
        lines: [
          'Masks and mirrors, signore. Papier-mâché off last year\'s Score, gesso, gilt. Every face in this court.',
          'Prince Facade\'s decree: a choir has no faces, only Parts. So everyone over seven goes masked.',
          'And on every brow, small, in brass: the Part. The Tuners can\'t see who you are. Only what you sing.',
          'Charms are on the top shelf — you may wear three. They\'re masquerade things. They fight dirty.',
        ],
      },
    ],
    barks: [
      { when: PRINCE, lines: ['Freckles! Who wants freckles!', 'Plain faces, half price.'] },
      {
        lines: [
          'Volto, colombina, bauta…', 'Mind the gesso, it\'s wet.', 'A mask for the Hours, signora?',
          'Charms on the top shelf.',
        ],
      },
    ],
  },

  // ── Pippo — the boy who turns seven ──────────────────────────────────
  {
    id: 'masque-pippo',
    name: 'Pippo Scaglia',
    title: 'Six and Three Quarters',
    look: { body: 0xe2c6aa, accent: 0xff6ab4, hat: 'none', traits: ['scarf'], size: 0.72, eye: 0x4ae0d0 },
    at: { x: 380, y: 700 },
    wander: 50,
    talks: [
      {
        when: MONARCH,
        lines: [
          'I sang a song I made up on the bridge and NOBODY fined me. Mamma cried. The good kind.',
          'It was about a fish. It isn\'t a very good song. That\'s allowed now, isn\'t it? Bad songs?',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The Prince walked across the campo with his face out! He has a big nose! Everybody looked!',
          'Then somebody else took theirs off. Then everybody. It was like a ball, but backwards.',
        ],
      },
      {
        when: { questDone: Q_BLANK },
        lines: [
          'Look! Nothing on the brow. When I sing behind it nobody knows what I\'m meant to be singing.',
          'I\'m going to sing ALL the notes. Not now. Quietly. At Compline, with the fireworks going.',
        ],
      },
      {
        when: { quest: Q_BLANK },
        lines: [
          'The paper\'s in the calli between the mask shops. Old hymn-sheets blow down there and stick.',
          'Ottavia needs four sheets. She says the Score makes the best papier-mâché. It\'s very stiff.',
        ],
      },
      {
        lines: [
          'I\'m seven on Sunday. On your seventh, the Part-Painter comes and paints your note on your mask.',
          'Mine\'s G. Low G. Then I have to sing low G at every Hour forever. Only low G. Forever.',
          'My nonna\'s note was E and she sang a whole song once, at a wedding. Now she\'s in the Organ.',
        ],
      },
    ],
    barks: [
      { when: { questDone: Q_BLANK }, lines: ['La la LA la!', '(humming every note)'] },
      { lines: ['Low G. Low G. Low G.', 'Four more days.', 'I don\'t WANT a note.'] },
    ],
  },

  // ── Bepi Sandolo — the gondolier ─────────────────────────────────────
  {
    id: 'masque-bepi',
    name: 'Bepi Sandolo',
    title: 'Gondolier, the Grand Canal',
    look: { body: 0xc49a7c, accent: 0x14121a, hat: 'straw', traits: ['rod', 'scarf'], size: 1.2, eye: 0x3f7f78 },
    at: { x: 1420, y: 960 },
    talks: [
      {
        when: MONARCH,
        lines: [
          'OE! PREMI! Ha — d\'you hear that? Forty years I\'ve wanted to shout that round a corner again.',
          'The boys are singing barcaroles on the water at night. Badly. I\'ve never heard anything so good.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'His Highness took a gondola down the Grand Canal this morning. Face bare. Asked me for a song.',
          'I said I\'d been fined for that. He said: then fine me. So I sang. He didn\'t fine anybody.',
        ],
      },
      {
        when: { questDone: Q_CORNERS },
        lines: [
          'No crashes this week. Not one. We look in Nane\'s mirrors and we see each other coming.',
          'Silent as you like, and nobody fined for it. The Warden\'s furious. He loves a crash.',
        ],
      },
      {
        when: { quest: Q_CORNERS },
        lines: [
          'The Hall of Mirrors throws out its off-cuts round the back and along its sides. Bring me three.',
          'Then take them to Nane the lamplighter. He\'s got brackets on every corner he lights.',
        ],
      },
      {
        lines: [
          'Gondoliers used to call out at the blind corners. "Oe, premi!" — I\'m coming, keep right.',
          'Calling is noise now. So we come round the corners silent and we hit each other. Every week.',
          'And the Canal Warden fines both boats. For the noise of the crash. Bang, fine, bang, fine.',
        ],
      },
    ],
    barks: [
      { when: PRINCE, lines: ['OE! PREMI!', 'A song, signore? Free today.'] },
      { lines: ['Gondola, signore?', '(whispered) Mind the corner.', 'Bang, fine. Bang, fine.'] },
    ],
  },

  // ── Nane Ferro — the lamplighter ─────────────────────────────────────
  {
    id: 'masque-nane',
    name: 'Nane Ferro',
    title: 'Lamplighter',
    look: { body: 0xb8906e, accent: 0x2a2830, hat: 'cap', traits: ['lantern', 'beard', 'cane'], size: 0.95, eye: 0xffd890 },
    at: { x: 880, y: 800 },
    wander: 120,
    talks: [
      {
        when: MONARCH,
        lines: [
          'I lit the lamps last night and the whole riva was singing under them. Every key there is.',
          'I\'m seventy-one and I have never wanted so badly to be deaf and never been so glad I\'m not.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'I lit the nursery lamp at the Palazzo Facciata for forty years. Last night he lit it himself.',
          'He held the taper with his own face bare, and his hand shook. Like a boy\'s.',
        ],
      },
      {
        when: { questDone: Q_FACE },
        lines: ['Mind how you go in there. He was a sweet lad. Sweetness goes strange, kept under porcelain.'],
      },
      {
        when: { questDone: Q_CORNERS },
        lines: [
          'Three mirrors on three brackets. Bepi\'s boys see each other round the corners now.',
          'The Warden asked me whose idea it was. I said the lamps\'. Lamps can\'t be fined.',
        ],
      },
      {
        when: { quest: Q_CORNERS, stage: 1 },
        lines: [
          'Mirrors for the corners? Bepi\'s idea. Give them here. I\'ve brackets going spare on every turning.',
        ],
      },
      {
        lines: [
          'Lamps at dusk and out at dawn. Three hundred and twelve of them, and every one has a mask over it.',
          'Did you notice? Tin masks on the lanterns. So even the light doesn\'t show a face.',
          'I lit the Prince\'s nursery lamp when he was a boy. He used to wave. Before.',
        ],
      },
    ],
    barks: [
      { lines: ['Three hundred and twelve.', 'Lamp\'s going up.', 'Mind the taper.'] },
    ],
  },

  // ── Lucia Merletti — the muted lacemaker ─────────────────────────────
  {
    id: 'masque-lucia',
    name: 'Lucia Merletti',
    title: 'Lacemaker, Muted',
    look: { body: 0xe8d0b6, accent: 0xfafafa, hat: 'veil', traits: ['scarf', 'book'], size: 0.95, eye: 0xb07aff },
    at: { x: 1100, y: 1300 },
    talks: [
      {
        when: MONARCH,
        lines: [
          '(She opens her mouth. Nothing — then a small, rusty sound, and her eyes go wide.)',
          '"…Hello." (She laughs, and the laugh is out loud, and it is hers.)',
        ],
      },
      {
        when: PRINCE,
        lines: [
          '(She signs fast: a mask lifted off, a face, a hand over the heart.)',
          '(She points north, toward the cathedral, and makes the sign for "next". Then "please".)',
        ],
      },
      {
        when: { quest: Q_QUIET, stage: 1 },
        lines: [
          '(She listens to you, then signs slowly so you can follow: a pipe, a voice, three fingers — skip.)',
          '(She writes in the dust: HER MOTHER SKIPPED THE THIRD BAR. ALWAYS. LISTEN FOR THE SKIP.)',
          '(She draws a heart beside it, then wipes it all away with her foot before anyone sees.)',
        ],
      },
      {
        lines: [
          '(She wears a white silk ribbon at the throat. She smiles, and signs a greeting — a hand from the brow.)',
          '(She lifts a lace mask from her basket: no Part on the brow, only a hole where a note would be.)',
          '(She signs: "my brother" — then mimes a pipe, a long one, and taps her own throat.)',
        ],
      },
    ],
    barks: [
      { when: MONARCH, lines: ['"Hello."', '(singing, very softly)'] },
      { lines: ['(signing to a neighbour)', '(her bobbins click)', '(a nod, brow to brow)'] },
    ],
  },

  // ── Zanetta Squerariol — the boatwright ──────────────────────────────
  {
    id: 'masque-zanetta',
    name: 'Zanetta Squerariol',
    title: 'Boatwright, the Squero',
    look: { body: 0xc8a080, accent: 0x14121a, hat: 'bandana', traits: ['tool', 'apron'], size: 1.1, eye: 0x3f7f78 },
    at: { x: 1840, y: 1470 },
    talks: [
      {
        when: MONARCH,
        lines: [
          'I\'m building a gondola with a bench in the stern for singing. A choir boat. Bepi wants the first one.',
          'Eleven black boats on the slip, and I\'m painting every one of them yellow. Bright, stupid yellow.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'No night boats have gone up the hill since you came. The Tuners\' gondolas sit on my slip, rotting.',
          'I sold one of them to a fisherman. He\'s painted a face on its bow. Smiling.',
        ],
      },
      {
        when: { questDone: Q_TUBE },
        lines: [
          'Remo came back without his boat. He sat on the slip and asked me how long it takes to build one.',
          'I told him a year. He said good. He said he\'d help. I think he meant it.',
        ],
      },
      {
        when: { quest: Q_TUBE },
        lines: [
          'The night boats are moored round the yard. Pull the forcola off each — no oarlock, no rowing.',
          'Remo will come looking. He always comes when a boat\'s touched. He loves those boats more than people.',
        ],
      },
      {
        lines: [
          'I build gondolas. Black, by law — every one the same, so no boat stands out. Like the masks.',
          'And the night boats. Covered, curtained, for the Tuners. They take the muted up the hill after Compline.',
          'I build them. I have to. Remo rows them. He sings while he rows, and nobody fines him for it.',
        ],
      },
    ],
    barks: [
      { lines: ['Mind the tar.', '(the rasp of a plane)', 'Black, black, black.'] },
    ],
  },

  // ── Scintilla Polvere — the fireworks apprentice ─────────────────────
  {
    id: 'masque-scintilla',
    name: 'Scintilla Polvere',
    title: 'Apprentice, the Fireworks Barges',
    look: { body: 0xd9b89a, accent: 0xff5a4a, hat: 'goggles', traits: ['satchel', 'bandage'], size: 0.9, eye: 0xffd24a },
    at: { x: 2150, y: 420 },
    talks: [
      {
        when: MONARCH,
        lines: [
          'We let the fireworks off for nothing last night. For nothing! Just because they\'re lovely!',
          'Mamma watched from the quay. With her voice back. She shouted every time one went off.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'No fireworks at Compline any more, the Prince says. He says he wants to hear the Organ, now.',
          'He says he wants to hear who he put in it. I don\'t know if that\'s brave or terrible.',
        ],
      },
      {
        when: { questDone: Q_QUIET },
        lines: [
          'I heard her. Third bar, skipped, like always. She was a little flat. She was always a little flat.',
          'I stood on the quay and I laughed and cried and nobody heard because the whole court was crying.',
        ],
      },
      {
        when: { quest: Q_QUIET },
        lines: [
          'The slow-match is coiled by the rocket stands along the quay. Four coils. Without it, nothing lights.',
        ],
      },
      {
        lines: [
          'Every Compline, the whole lagoon goes up. Red, gold, green. You can\'t hear yourself think.',
          'That\'s the point. At Compline you can hear the Organ playing the voices. Your own people, in pipes.',
          'The Prince says it\'s kinder not to hear. So we drown them out. Every night. Mamma included.',
        ],
      },
    ],
    barks: [
      { lines: ['Mind the powder!', 'Fuse, fuse, fuse…', 'BANG. Sorry.'] },
    ],
  },

  // ── Ser Ventaglio — the Prince's major-domo ──────────────────────────
  {
    id: 'masque-ventaglio',
    name: 'Ser Ventaglio',
    title: 'Major-domo of the Palazzo Facciata',
    look: { body: 0xc8b8a4, accent: 0x5b3f9a, hat: 'tophat', traits: ['glasses', 'cane'], size: 1.15, eye: 0xc8b4f0 },
    at: { x: 1320, y: 450 },
    talks: [
      {
        when: MONARCH,
        lines: [
          'His Highness has given the palazzo\'s mirrors to the Hall. He says he has seen enough of himself.',
          'He goes about with his face out and his hair uncombed. I have resigned twice. He won\'t accept it.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'He ate the dory. All of it. Then he sat at the table with the mask in his lap until the candles went.',
          'I have served him nineteen years. I had never seen his chin. It is a perfectly ordinary chin.',
        ],
      },
      {
        when: { courtReady: 'masque' },
        lines: [
          'All five of his dancers, down. His Highness watched from the eye window. He has changed masks twice.',
        ],
      },
      {
        lines: [
          'The Palazzo Facciata. His Highness Prince Facade receives no one. Leave a card, if you have a face.',
          'The windows are his eyes, you see. He likes to think the house is watching. It is.',
        ],
      },
    ],
    barks: [
      { lines: ['His Highness is not receiving.', 'A card, signore?', '(a flick of the fan: go away)'] },
    ],
  },

  // ── Fiore — the actress of the Teatrino ──────────────────────────────
  {
    id: 'masque-fiore',
    name: 'Fiore Ballerin',
    title: 'Columbina of the Teatrino',
    look: { body: 0xe4c8ac, accent: 0xd83a3a, hat: 'domino', traits: ['scarf'], size: 0.95, eye: 0xff6ab4 },
    at: { x: 2250, y: 900 },
    talks: [
      {
        when: MONARCH,
        lines: [
          'We\'re putting on a new play. With words! Spoken! Patch wrote it in a night. It\'s dreadful.',
          'Pantalone gets his voice back and then won\'t stop talking. The children scream with laughter.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The Prince came to the Teatrino and sat in the front with his face bare, and laughed at Pierrot.',
          'Nobody\'s laughed at Pierrot for years. He\'s meant to be sad. He was so pleased he fell off.',
        ],
      },
      {
        when: { encounter: 'masque-commedia' },
        lines: ['You beat Patch at his own play. He\'s sulking behind the curtain. He\'ll be out by the second act.'],
      },
      {
        lines: [
          'The commedia is the only theatre allowed: no words, just masks and slapstick. Masks can\'t sing flat.',
          'Pierrot weeps, Harlequin cracks his stick, Columbine throws hearts. Patch plays all three.',
          'Mind him if you go up. He changes the rules every time somebody new walks on.',
        ],
      },
    ],
    barks: [
      { lines: ['(a curtsey, silent)', '(miming a heart, thrown)', 'Second act at the bell.'] },
    ],
  },
];

const looks: NpcLook[] = [
  { body: 0xd6b494, accent: 0xff6ab4, hat: 'domino', traits: ['scarf'] },
  { body: 0xe4c8ac, accent: 0x5b3f9a, hat: 'domino', traits: ['mask'] },
  { body: 0xc49a7c, accent: 0xa01e3a, hat: 'tricorn', traits: ['mask', 'cane'] },
  { body: 0xdcbca0, accent: 0x4ae0d0, hat: 'domino', traits: ['mask'], size: 0.78 },
  { body: 0xb8906e, accent: 0x14121a, hat: 'plague', traits: ['mask'], size: 1.1 },
  { body: 0xe8d0b6, accent: 0xffd24a, hat: 'veil', traits: ['mask'] },
  { body: 0xcfa585, accent: 0xfafafa, hat: 'tophat', traits: ['mask', 'scarf'] },
  { body: 0xd9b89a, accent: 0xb07aff, hat: 'domino', traits: ['mask'], size: 0.82 },
];

const barks: Talk[] = [
  {
    when: MONARCH,
    lines: [
      'I can SEE you! Your face!',
      'Sing it again, the bad version!',
      'There are pipes coming down from the cathedral!',
      'My mother\'s home. My mother\'s HOME.',
    ],
  },
  {
    when: PRINCE,
    lines: [
      'The Prince took his mask off!',
      'He has a big nose. Who knew?',
      'No fireworks at Compline tonight.',
      'I\'m taking mine off. No — you first.',
    ],
  },
  {
    when: { courtReady: 'masque' },
    lines: [
      'All five of his dancers.',
      'The stranger goes to the Facciata next.',
    ],
  },
  {
    lines: [
      '(whispered) Lovely mask.',
      '(a tilt of the brow, meaning "later")',
      'Is that a D on your brow?',
      'Shh. The Warden.',
      'The ball never ends.',
      'Compline\'s soon. Fireworks.',
      '(a fan snaps shut)',
      'Don\'t look at the Organ.',
    ],
  },
];

export const MASQUE_CROWD: NonNullable<AreaDef['crowd']> = {
  count: 15,
  looks,
  paths: [
    // Along the riva from the Brass road to the bridge and back.
    [{ x: 120, y: 800 }, { x: 700, y: 800 }, { x: 1300, y: 800 }, { x: 1700, y: 800 }, { x: 1300, y: 800 }, { x: 700, y: 800 }],
    // Round the Campo della Danza.
    [{ x: 300, y: 500 }, { x: 840, y: 500 }, { x: 840, y: 720 }, { x: 300, y: 720 }],
    // The fondamenta of the mask-makers.
    [{ x: 60, y: 1065 }, { x: 640, y: 1065 }, { x: 1300, y: 1065 }, { x: 640, y: 1065 }],
    // The Campo Facciata, past the steps.
    [{ x: 940, y: 460 }, { x: 1420, y: 460 }, { x: 1420, y: 700 }, { x: 940, y: 700 }],
    // The fireworks quay.
    [{ x: 1660, y: 440 }, { x: 2340, y: 440 }, { x: 2340, y: 540 }, { x: 1660, y: 540 }],
    // The Campo del Teatro.
    [{ x: 1700, y: 880 }, { x: 2300, y: 980 }, { x: 1800, y: 1030 }],
    // Down to the Hush road, over the south bridge, to the squero.
    [{ x: 1200, y: 1200 }, { x: 1200, y: 1520 }, { x: 1300, y: 1370 }, { x: 1700, y: 1370 }, { x: 1800, y: 1470 }, { x: 1300, y: 1370 }],
  ],
  barks,
};
