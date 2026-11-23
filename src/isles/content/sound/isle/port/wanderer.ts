import type { Cond, Talk, WandererDef } from '../../../../IslesTypes';

/**
 * Lark Halloway — Choirholm's wanderer. A busker whose voice the Maestro took for the Organ because
 * she sang her own songs in the Carillon Quay market. She busks still: a hurdy-gurdy on a strap,
 * a coat sewn with bells she has stuffed with wool so they cannot ring, a white silk ribbon at her
 * throat. She talks with her hands. Her mynah bird Patter learned her voice before it was taken,
 * and speaks for her in it — so her lines are Patter's, in quotes, with her signing in brackets.
 * She is quick, wry, unafraid, and very tired of whispering.
 *
 * She is the isle's narrator: the tutorial nudges (the Part and the Hours, resonant and still
 * fishing, the tuning rod, the Outer Sea), gossip about every first chair, a reaction to each court
 * freed — and her own story, which only moves once the Maestro falls. The Organ is opened pipe by
 * pipe and the voices go home; Lark insists hers comes out last; and the first thing she sings, on
 * the Quay, is the market song he muted her for, and the whole isle joins in, badly, in a thousand keys.
 *
 * Blocks are listed most specific first. Once the Maestro falls her arc is a chain of flags
 * (`lark-voice-1` … `lark-voice-4`), each link holding on its own so the next step always plays
 * next. Step 2 plays only in the Organ or the cathedral, step 4 only on Carillon Quay.
 */

const MAESTRO: Cond = { monarch: 'cadenza' };
/** True only before the Maestro falls — keeps the old lines out of the rotation once he is down. */
const pre = (c: Cond): Cond => ({ all: [c, { not: MAESTRO }] });
const princes = (count: number): Cond => ({ princesOfIsle: 'sound', count });
const voice = (n: number): Cond => ({ flag: `lark-voice-${n}` });
const between = (a: number, b: number): Cond => ({ all: [voice(a), { not: voice(b) }] });

// ── The voice arc (after the Maestro) ───────────────────────────────

/** Step 1 — anywhere: the Organ is to be opened. */
const ARC_OPENING: Talk = {
  when: { all: [MAESTRO, { not: voice(1) }] },
  sets: 'lark-voice-1',
  lines: [
    '"He is down. The baton is in two pieces on the Console. I saw a choirboy pick up half and conduct a gull."',
    '(She signs, fast:) The pipes. They are going to open the pipes. All of them. One at a time.',
    '"Every voice in that Organ goes home. Someone has to hold the ladder. I am going up."',
    '(She taps her ribbon, then holds up one finger, and puts it at the end of a long line in the air.)',
    '"Mine last. Do not argue. Patter, tell them not to argue." — "Do not argue."',
  ],
};

/** Step 2 — the Organ or the cathedral: the pipes are opened; she holds the ladder. */
const ARC_PIPES: Talk = {
  when: between(1, 2),
  sets: 'lark-voice-2',
  lines: [
    '"They take a pipe down, ease the seal off — and the voice comes out like a breath you have held for years."',
    '(She mimes a mouth opening. Then a woman far below on the stair putting both hands to her throat.)',
    '"Hers. It found her. They always find their own. A voice knows its throat the way a dog knows its door."',
    '"Four hundred this morning. The Quay folk first. Hester Fathom laughed so loud the candles went out."',
    '(She points to one small pipe high on the Rose, out of the way, and signs: that one. Mine. Not yet.)',
    '"Last. I said last. I want to hear every one of them go home first. I have waited this long."',
  ],
};

/** Step 3 — anywhere: hers is opened. The first lines in her own voice; Patter goes quiet. */
const ARC_LAST_PIPE: Talk = {
  when: between(2, 3),
  sets: 'lark-voice-3',
  lines: [
    '(She opens her mouth. Nothing. Then:) ...Oh. Oh, that is — that is rough. That is me. I sound like a gate.',
    'Patter will not look at me. He keeps saying my old voice at me, very offended, like I have stolen it.',
    'Eleven years. I have forgotten where my breath goes. My hands keep signing on their own. Look at them.',
    'I know what I am going to sing first. You know too. Come to the Quay. The market. Come and hear it.',
  ],
};

/** Step 4 — Carillon Quay: the market song. */
const ARC_MARKET: Talk = {
  when: between(3, 4),
  sets: 'lark-voice-4',
  lines: [
    'Here. This is my spot — the third bollard. Pitch in the cap, gurdy on the strap. The wool out of the bells.',
    '...There. That is the market song. All three verses. I cracked on the high bit. I always did. Listen —',
    'Pim is singing it. Out of the hymn sheet, the back of it. Ada is singing it. Abel. Pip, very loud.',
    'Badly. All of them badly, in a thousand keys, not one of them the same. It is the worst thing I ever heard.',
    'It is the best thing I ever heard. Patter is singing it in my old voice and I am singing it in my new one.',
  ],
};

/** Step 5 — after: home. */
const ARC_HOME: Talk = {
  when: voice(4),
  lines: [
    'I busk every afternoon now on the third bollard, out loud. People stop and talk over me. I love it.',
    'Patter has learned the new voice. He does it better than me. I may have to let him take the high bit.',
    'I keep the ribbon in my pocket. I cannot quite throw it away. Ada says she will cast it into a bell.',
    'Thank you. For the Organ, and the market, and for standing there while I cracked on the high bit.',
  ],
};

/** In every area but the Organ and the cathedral, after the opening and before the pipes. */
const NUDGE_ORGAN: Talk = {
  when: between(1, 2),
  lines: [
    '"Up to the cathedral, and into the Organ. They are bringing the ladders. Walk with me?"',
    '(She makes a long ladder of her two hands, climbing.) "All the way up. To the Rose."',
  ],
};

/** Anywhere but Carillon Quay, once her voice is back and before the market. */
const NUDGE_MARKET: Talk = {
  when: between(3, 4),
  lines: [
    'Down to the Quay. To the market. I have a song to finish. I started it eleven years ago.',
    'Walk with me? My legs are fine. It is my nerve. I have not sung in front of anyone in eleven years.',
  ],
};

/** The arc as it plays in an ordinary area (not the Quay, the Organ or the cathedral). */
const arcElsewhere: Talk[] = [ARC_OPENING, NUDGE_ORGAN, ARC_LAST_PIPE, NUDGE_MARKET, ARC_HOME];

export const LARK: WandererDef = {
  id: 'sound-wanderer-lark',
  name: 'Lark Halloway',
  title: 'Muted Busker, and Patter',
  look: {
    body: 0xd8b498, accent: 0x7a3a4a, hand: 0x8a6a5a, hat: 'none',
    traits: ['scarf', 'pack', 'satchel'], size: 0.98, eye: 0xf0d890,
  },

  byArea: {
    // ── Carillon Quay ───────────────────────────────────────────────
    carillon: [
      ARC_OPENING, NUDGE_ORGAN, ARC_LAST_PIPE, ARC_MARKET, ARC_HOME,
      {
        when: pre(princes(6)),
        lines: [
          '"Six first chairs. The Organ door is open at the cathedral." (She looks up the terraces, a long time.)',
          '"I can hear mine from here at Compline. It is the high one, three from the end. It still cracks."',
          '(She signs: eat at the Rising Loaf before you go up.) "Bring a good rod, too. Just in case."',
        ],
      },
      {
        when: pre(princes(3)),
        lines: [
          '"Half the courts. The customs house gave out a blank reed today. Wren swears it was an accident."',
          '(She shows a sailor pinning his reed upside down, grinning.) "People are humming between the Hours."',
          '"Patter has started whistling things he did not learn from me. I do not know where he gets them."',
        ],
      },
      {
        when: pre({ questDone: 'carillon-fair-copy' }),
        lines: [
          '(She holds a hymn sheet. On the back, in Pim\'s type, her song. She does not say anything for a while.)',
          '"Folded inside the Score. Every sheet." (She signs: I tore the first copy myself, to save Pim. Liar.)',
          '"Patter, sing the first line." — "Hats on the bollards, fish on the stones —" "...That is enough."',
        ],
      },
      {
        when: pre({ questDone: 'carillon-given-a-part' }),
        lines: [
          '"A blank reed, and you sang on the mark at Vespers. Semitone went up the road with his fork bent."',
          '(She signs: waystone.) "Touch it, by the landing. M opens the isle map; you can walk the roads in a blink."',
          '"The Singing Line sells the tuning rod. Dear. The only rod that fishes a singing pool or a still one."',
        ],
      },
      {
        when: pre({ flag: 'lark-met' }),
        lines: [
          '"Still on the Quay? It is a good town. Loud three times a day and frightened the rest. Like most."',
          '(She points north, west, east.) "Brass up the terraces. Paper to the west. The Hush to the east."',
          '"Fish off the east jetty. Chimefish round the buoys for learning. Abel will sell you a rod."',
          '"Marta at the Rising Loaf bakes what you catch. A meal lasts one fight. A charm lasts for ever."',
        ],
      },
      {
        when: { all: [{ not: { flag: 'lark-met' } }, { not: MAESTRO }] },
        sets: 'lark-met',
        lines: [
          '(A woman in a coat sewn with bells — every one stuffed with wool — stops playing. A bird on her shoulder.)',
          '"Hello, sailor." (The voice comes from the bird. Her lips do not move. A white ribbon is tied at her throat.)',
          '"This is Patter. I am Lark. He talks; I do the hands. He learned my voice before they took it."',
          '"Three times a day the tower rings the Hours — Matins, Vespers, Compline — and the whole isle sings."',
          '"Only the Score. Only your Part — one note on a reed. Sing anything else and the Tuners take the voice."',
          '(She taps the ribbon.) "Up the hill, into a pipe of the Great Organ. It plays mine at Compline. Badly."',
          '"Between the Hours, nobody talks above a whisper. The Hush wardens fine noise. I am, technically, noise."',
        ],
      },
    ],

    // ── The Brass Court ─────────────────────────────────────────────
    brass: [
      ...arcElsewhere,
      {
        when: pre({ prince: 'fanfare' }),
        lines: [
          '"Fanfare is down! The bands on the greens are playing whatever they like. That one is a polka. Badly."',
          '(She dances three steps, coat-bells thumping in their wool.) "The heralds have their trumpets backwards."',
        ],
      },
      {
        lines: [
          '"The Brass Court. The bands drill on every lawn so the Score is always being played somewhere."',
          '"Prince Fanfare is the herald. When he raises his trumpet, the beam comes out in a fan. Step between."',
          '(She signs: bandlake.) "There is a floating stage on the lake. Cornet carp under it. Driftwood rod will do."',
          '"Do not march out of step on the drill squares. They notice. They always notice the one out of step."',
        ],
      },
    ],

    // ── The Cavern Court ────────────────────────────────────────────
    cavern: [
      ...arcElsewhere,
      {
        when: pre({ prince: 'reprise' }),
        lines: [
          '"Reprise is down, and the caves are still repeating the Score — but softer. Like they are tired of it."',
          '(She claps once. The cave claps back, a beat late, then again, smaller.) "Even the echoes are relieved."',
        ],
      },
      {
        lines: [
          '"The Echo Caves. They sang the Score into the rock years ago and it has never stopped coming back."',
          '"Reprise says everything twice. His blows too — once from him, once a beat and a half later, mirrored."',
          '(She points at the pool.) "That pool rings when you touch it. Any normal rod shatters. Tuning rod only."',
          '"Abel on the Quay sells it. Dear as a boat. Worth it for the echo eels, he says. He would."',
        ],
      },
    ],

    // ── The Libretto Court ──────────────────────────────────────────
    libretto: [
      ...arcElsewhere,
      {
        when: pre({ prince: 'folio' }),
        lines: [
          '"Folio is down. The presses are printing whatever comes in. A cookbook. A love letter. Mine?"',
          '(She picks up a sheet off the street, reads it, and laughs without a sound.) "Somebody\'s bad poem. Wonderful."',
        ],
      },
      {
        lines: [
          '"The Libretto Court writes the Score\'s words, and crosses out every other word anyone ever wrote."',
          '(She draws a long red line in the air.) "The Censor\'s pen. They struck my songbook out page by page."',
          '"Prince Folio writes in ink that stands up as blades when the line is done. Read his lines before he does."',
          '"The inkwell pond takes an iron rod. Nib pike in it. They bite like a deadline."',
        ],
      },
    ],

    // ── The Masquerade Court ────────────────────────────────────────
    masque: [
      ...arcElsewhere,
      {
        when: pre({ prince: 'facade' }),
        lines: [
          '"Facade is down. People are taking off their masks on the bridges and looking at each other. Shy."',
          '(She lifts an invisible mask off her face, and makes a face under it.) "Patter, say something rude." — "No."',
        ],
      },
      {
        lines: [
          '"The Masquerade Court. Everyone masked, so the choir has no faces. You cannot tell who sang flat."',
          '"Prince Facade wears two masks, comedy and tragedy, and swaps. Then splits in four. Only one is him."',
          '(She signs: canal.) "Harlequin hake in the canals. Sea rod is fine. Mind the gondolas; they do not stop."',
        ],
      },
    ],

    // ── The Hush Court ──────────────────────────────────────────────
    hush: [
      ...arcElsewhere,
      {
        when: pre({ prince: 'mute' }),
        lines: [
          '"Mute is down. The Quiet House is open. They are coming out into the snow, the muted. Blinking."',
          '(She signs to a man in a white ribbon across the street. He signs back. They both laugh, silently.)',
        ],
      },
      {
        lines: [
          '(She goes very quiet, even for her. She points at a long felted house with no windows.) The Quiet House.',
          '"That is where they take you. You go in with a voice and come out with a ribbon. I went in singing."',
          '"Prince Mute makes no sound at all. No footfall. Watch his shadow on the snow, not him."',
          '"The mere here is so still it is a mirror. Ordinary rods go dead in it. Tuning rod — mute mullet, sturgeon."',
        ],
      },
    ],

    // ── The Cathedral Court ─────────────────────────────────────────
    cathedral: [
      ARC_OPENING, ARC_PIPES, ARC_LAST_PIPE, NUDGE_MARKET, ARC_HOME,
      {
        when: pre(princes(6)),
        lines: [
          '"The Organ door is open." (She stands at it a long time. Her hand is on her ribbon.) "I can hear it."',
          '"Bellows first, then the pipes, then the voices. The Maestro is at the Console at the top."',
          '"If you see a small pipe three from the end on the Rose, and it cracks on the high bit — that one is mine."',
        ],
      },
      {
        when: pre({ prince: 'vesper' }),
        lines: [
          '"Vesper is down. The candles are still burning. Nobody has dared blow them out. I might."',
          '(She looks up at the pipes on the roof.) "Still singing. Without her. He plays them himself now."',
        ],
      },
      {
        lines: [
          '"The summit. His cathedral of the Score. The pipes on the roof are the Great Organ. Every one has a voice."',
          '"Prince Vesper keeps the Hours. A rosary of light round her; she lashes it out a bead at a time."',
          '(She signs: pond, ice.) "The cloister pond is frozen. Cut a hole; an iron rod will do. Chorister char."',
          '"The Organ door opens when all six first chairs are down. Do not hurry. He has waited; so can we."',
        ],
      },
    ],

    // ── The Great Organ ─────────────────────────────────────────────
    organ: [
      ARC_OPENING, ARC_PIPES, ARC_LAST_PIPE, NUDGE_MARKET, ARC_HOME,
      {
        lines: [
          '"Inside the Organ. Smell it — leather and dust and breath. The bellows are as big as houses."',
          '(She steadies herself as the wind shoves.) "They breathe on a beat. Walk with the draw, not against."',
          '"Then the Pipe Forest. Each pipe sounds a column straight up when its key lights on the floor. Stay off."',
          '"The Voice Loft is after. I will not go in there with you. I will hear her. Me. I will hear me."',
        ],
      },
    ],
  },

  general: [
    ARC_OPENING, NUDGE_ORGAN, ARC_LAST_PIPE, NUDGE_MARKET, ARC_HOME,
    {
      when: pre(princes(1)),
      lines: [
        '"One first chair down. People heard. Nobody said anything. But they heard."',
        '(She signs: keep going.) "Patter, tell them to keep going." — "Keep going."',
      ],
    },
    {
      lines: [
        '"Choirholm. The fourth isle past the Breakwater. The crossing here is the worst on the Outer Sea."',
        '"You will have met the Cantor coming in. The whale with bells on. Steer through the rests in its song."',
        '(She signs: tuning rod.) "Two waters here want it — the singing pool and the still mere. Abel sells it."',
        '"And at the Hours, stand still. Even you. Mouth the words if you must. They notice who does not."',
      ],
    },
  ],
};
