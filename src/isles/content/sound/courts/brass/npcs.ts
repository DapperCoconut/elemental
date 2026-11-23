import type { AreaDef, NpcDef, NpcLook, Talk } from '../../../../IslesTypes';

/**
 * The people of the Brass Court.
 *
 * Brass is the first court up from Carillon Quay, so its people do the explaining: what a
 * *Part* is (one note, stamped on the brass tuning-reed every child is pinned with at birth),
 * what the *Hours* are (Matins, Vespers, Compline, when the whole isle stands and sings the
 * Score, called first from the Fanfare Gate), what *noise* is (talk between the Hours, fined
 * by the Hush), and what *muting* is (a faltering voice taken by the Tuners and sealed in a pipe
 * of the Great Organ). They are bandsmen: loud on the beat, whispering between, and some of
 * them — the muted, with the white silk ribbon at the throat — talk only with their hands.
 */

const PRINCE = { prince: 'fanfare' } as const;
const MAESTRO = { monarch: 'cadenza' } as const;

const Q_REED = 'brass-q-wrong-reed';
const Q_WIND = 'brass-q-wind-for-wheezy';
const Q_TUNE = 'brass-q-own-tune';
const Q_DRUM = 'brass-q-drummed-out';
const Q_HALL = 'brass-q-bandhall';

export const BRASS_NPCS: NpcDef[] = [
  // ── Cornelius Slide — the shop ───────────────────────────────────────
  {
    id: 'brass-slide',
    name: 'Cornelius Slide',
    title: 'Valves & Mouthpieces',
    look: { body: 0xd8b48e, accent: 0xd8a83a, hat: 'bandmaster', traits: ['apron', 'glasses', 'tool'], size: 1.05 },
    at: { x: 760, y: 1235 },
    role: { kind: 'shop', id: 'brass-shop' },
    talks: [
      {
        when: MAESTRO,
        lines: [
          'Somebody came in this morning and bought a mouthpiece for a SONG. Their own song. Played it at me.',
          'It was dreadful. I gave them a discount. Charms on the rack, same as ever. Everything else is new.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The Prince sent his trumpet down to be re-lacquered. Then he sent word: no hurry. NO HURRY.',
          'Twenty years he\'s had it back the same day. Something\'s changed up there. You did that.',
        ],
      },
      {
        when: { questDone: Q_REED },
        lines: [
          'Ingot stamped a reed for the Pennywhistle girl. An E. Her own E. You should hear her.',
          '(quieter) You should hear her quietly, mind. It\'s still between the Hours.',
        ],
      },
      {
        lines: [
          '(whispering) Valves, slides, mouthpieces. Keep your voice down, friend. It\'s between the Hours.',
          'Talk between the Hours is noise, and the Hush fine noise. A bandsman can only be loud on the beat.',
          'Every child here gets a Part at birth: one note on a brass reed at the collar. Sing that, and nothing else.',
          'Charms on the rack — you can wear three. Band kit, but it\'ll fight for you. Flour for Bertha, too.',
        ],
      },
    ],
    barks: [
      { when: PRINCE, lines: ['No hurry, he says!', 'Mouthpieces! Any key you like!'] },
      { lines: ['(whisper) Valve oil?', '(whisper) Mind the slide.', '(whisper) Charms on the rack.', '(whisper) Not till the Hour.'] },
    ],
  },

  // ── Bertha Bunce — The Oompah Bun ────────────────────────────────────
  {
    id: 'brass-bunce',
    name: 'Bertha Bunce',
    title: 'The Oompah Bun',
    look: { body: 0xe8c8a8, accent: 0xb8262e, hat: 'chef', traits: ['apron'], size: 1.2 },
    at: { x: 1840, y: 1648 },
    role: { kind: 'bakery', id: 'brass-bun' },
    talks: [
      {
        when: MAESTRO,
        lines: [
          'I sang while I kneaded this morning. Out loud. In my own key, which turns out to be a terrible one.',
          'The dough rose anyway. Bring me fish and flour, love — everything\'s on the house till Tuesday.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The Prince came down himself for a bun. He paid. He said please. He said it QUIETLY.',
          'I\'ve known him since he was Toby Blare from the tannery. He used to say please then, too.',
        ],
      },
      {
        when: { questDone: Q_WIND },
        lines: [
          'Wheezy played the whole of Vespers on that cornetto and never once ran out of puff. He wept after.',
          'Bring me carp and bream any time, dear. I\'ll always find an oven for you.',
        ],
      },
      {
        when: { quest: Q_WIND },
        lines: [
          'Two cornet carp out of the Bandlake, then come and cook the cornetto here at my oven.',
          'Then up to Wheezy at the little east bandstand, before Vespers. Quick as you can, love.',
        ],
      },
      {
        lines: [
          'The Oompah Bun! Buns for the band, pies for the march. (whispering) Sorry. Buns. Quietly.',
          'Bring me a fish from the Bandlake and a bag of Slide\'s flour and I\'ll bake you something that blows.',
          'A full belly sings steady, and a steady voice is never muted. That\'s what my mother said.',
        ],
      },
    ],
    barks: [
      { when: PRINCE, lines: ['Buns! LOUD buns!', 'He said please!'] },
      { lines: ['(whisper) Hot buns.', '(whisper) Pie for the march?', '(whisper) Mind the oven.'] },
    ],
  },

  // ── Nell Pennywhistle — the girl with the wrong reed ─────────────────
  {
    id: 'brass-nell',
    name: 'Nell Pennywhistle',
    title: 'Aged Eleven, an F (she says)',
    look: { body: 0xecd0b4, accent: 0x7ab8f0, hat: 'beanie', traits: ['scarf'], size: 0.72 },
    at: { x: 1330, y: 1600 },
    talks: [
      {
        when: MAESTRO,
        lines: [
          'I threw my reed in the Bandlake! Then I fished it out. It\'s an E. My E. I\'m keeping it.',
          'Mum says I can sing any note I like now. I\'ve been singing ALL of them. Mostly at the cat.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The Prince walked past at Vespers and didn\'t blow over the top of us. You could hear everyone.',
          'You could hear the ORGAN. Mum cried. She says that\'s Gran in there, the high bit.',
        ],
      },
      {
        when: { questDone: Q_REED },
        lines: [
          'Look! E! A proper E, stamped by Mister Ingot himself. When I sing it, it matches. It MATCHES.',
          'I sang it at Matins and nobody looked round at all. Do you know how good it is when nobody looks?',
        ],
      },
      {
        when: { quest: Q_REED },
        lines: [
          'Mister Ingot\'s at the foundry. He stamped my reed. He\'ll know if he can stamp another.',
          'Hurry, please. Tuner Sharpe tests the reeds again at the next Hour. He tests mine twice.',
        ],
      },
      {
        lines: [
          '(whispering) My reed says F. It\'s pinned on my collar, see? F. I was given it when I was born.',
          'But my voice came in an E. A little bit low. Every Hour I try for the F, and it comes out E.',
          'Tuner Sharpe heard it at Matins. He wrote my name down. Next time he hears it, they take my voice.',
        ],
      },
    ],
    barks: [
      { when: { questDone: Q_REED }, lines: ['Mmmmm — E!', 'It matches!'] },
      { lines: ['(whisper) F. F. F...', '(whisper) It keeps coming out E.', '(whisper) He wrote me down.'] },
    ],
  },

  // ── Gaffer Ingot — the reed-stamper ──────────────────────────────────
  {
    id: 'brass-ingot',
    name: 'Gaffer Ingot',
    title: 'Reed-Stamper to the Foundry',
    look: { body: 0xc8a080, accent: 0xa8652e, hat: 'cap', traits: ['apron', 'beard', 'tool'], size: 1.15 },
    at: { x: 340, y: 1245 },
    talks: [
      {
        when: MAESTRO,
        lines: [
          'I\'ve stamped my last Part. Forty years of Fs and Gs and Cs on little brass tongues. No more.',
          'I\'m spinning the scrap into bells. Proper bells, for ringing whenever you please. Ha!',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'I stamped Toby Blare\'s reed, you know. The Prince. A loud little B-flat. He\'s still got it on.',
          'He came by. He asked if I\'d ever stamped a reed wrong. I told him the truth: hundreds.',
        ],
      },
      {
        when: { questDone: Q_REED },
        lines: [
          'One reed, stamped to fit a child, not a child stamped to fit a reed. First one in forty years.',
          'I think I shall do it again. Quietly. Send them to me — the ones whose voices come in wrong.',
        ],
      },
      {
        lines: [
          'Reeds. I stamp the Parts. Every newborn on this terrace gets one from my die. Pinned on at the font.',
          'Note\'s chosen by the Tuners from the Organ\'s gaps — whatever the Score\'s short of that year.',
          'The voice grows into the reed, they say. Mostly it does. When it doesn\'t... well. The Organ fills up.',
        ],
      },
    ],
    barks: [
      { lines: ['(tap, tap) F.', '(tap, tap) G.', 'Mind the die, it\'s hot.', '(whisper) Another baby, another reed.'] },
    ],
  },

  // ── Wheezy Bellows — the old tubist ──────────────────────────────────
  {
    id: 'brass-wheezy',
    name: 'Wheezy Bellows',
    title: 'Second Tuba, Fifty-One Years',
    look: { body: 0xd4b8a0, accent: 0x223060, hat: 'bandmaster', traits: ['beard', 'cane', 'pipe'], size: 1.1 },
    at: { x: 2250, y: 1108 },
    talks: [
      {
        when: MAESTRO,
        lines: [
          'I\'ve put the tuba down. Fifty-one years. I\'m going to learn the fiddle. Quiet thing, the fiddle.',
          'You can play a fiddle any tune you like and nobody marches to it. I\'m looking forward to that.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'I played under young Toby\'s father, and young Toby played under me — second cornet, aged ten.',
          'Fine little player. Loud. Got louder every year after his mam was taken. I always knew why.',
        ],
      },
      {
        when: { questDone: Q_WIND },
        lines: [
          'I got through Vespers! Every oom and every pah. Never once ran out. Bertha\'s cornetto, that was.',
          'They\'ve let me off the list. Sit down, young one. Sit by an old tuba for a minute.',
        ],
      },
      {
        when: { quest: Q_WIND },
        lines: [
          '(wheeze) Carp... in a cornetto. Bertha knows. A good fish dinner and I\'ll have wind for a week.',
        ],
      },
      {
        lines: [
          '(wheezing) Fifty-one years on the tuba. I\'ve no wind left, friend. I ran short at Compline.',
          'Ran short. That\'s faltering, that is. The Lung-Warden marked it. One more and they\'ll take my voice.',
          'Bertha says she could feed me up. Ask her, would you? I can\'t walk to the lake and back. Not now.',
        ],
      },
    ],
    barks: [
      { when: { questDone: Q_WIND }, lines: ['Oom! Pah!', 'Wind for a week!'] },
      { lines: ['(wheeze)', '(wheeze) One more bar...', '(wheeze) Not yet, not yet.'] },
    ],
  },

  // ── Tilly Tacet — the muted widow ────────────────────────────────────
  {
    id: 'brass-tilly',
    name: 'Tilly Tacet',
    title: 'Muted (a white ribbon at her throat)',
    look: { body: 0xe4ccb4, accent: 0xfbfaf4, hat: 'veil', traits: ['scarf'], size: 0.95 },
    at: { x: 1490, y: 1462 },
    talks: [
      {
        when: MAESTRO,
        lines: [
          '"...Hello." (Her voice — thin, rusty, and her own.) "Hello. Hello. They opened the pipes."',
          '"Ned\'s came home too. He\'s been singing his tune at me all morning. I\'d forgotten how flat he is."',
        ],
      },
      {
        when: PRINCE,
        lines: [
          '(She signs, slowly: the Prince — trumpet — lowered. Then: Organ — listen. She touches her ear.)',
          '(She signs: at Compline, last night, she heard Ned. In the Organ. Third pipe from the left.)',
        ],
      },
      {
        when: { questDone: Q_TUNE },
        lines: [
          '(She signs: Hazel played it. Ned\'s tune. On the Great Bandstand, at dusk, very soft.)',
          '(She signs: people stopped. Nobody sang. Nobody fined anyone. She touches her ribbon and smiles.)',
        ],
      },
      {
        when: { quest: Q_TUNE },
        lines: [
          '(She signs: the pages — blown all along the shore. Four. Please. Then Hazel, at the bandstand.)',
        ],
      },
      {
        lines: [
          '(A white silk ribbon at her throat. She can\'t speak. She signs, carefully, so you can follow.)',
          '(She signs: her husband — Ned — a cornet — he played his OWN tune, once, at Vespers. Muted. Both.)',
          '(She signs: she wrote his tune down. The Hush tore it up. The pages blew along the lakeshore.)',
          '(She signs: find them? And give them to Hazel. Hazel plays the cornet. Hazel was his pupil.)',
        ],
      },
    ],
    barks: [
      { when: { questDone: Q_TUNE }, lines: ['(She hums, without a voice. You can see it.)'] },
      { lines: ['(She signs: hello.)', '(She signs: quiet now.)', '(She touches her ribbon.)'] },
    ],
  },

  // ── Hazel Flugel — the cornetist ─────────────────────────────────────
  {
    id: 'brass-hazel',
    name: 'Hazel Flugel',
    title: 'First Cornet, the Great Bandstand',
    look: { body: 0xdcb898, accent: 0xb8262e, hat: 'bandmaster', traits: ['satchel'], size: 0.95 },
    at: { x: 1060, y: 1012 },
    talks: [
      {
        when: MAESTRO,
        lines: [
          'We played Ned\'s tune at Matins. All of us. The whole band. The cathedral bells joined in, I swear.',
          'I\'m writing my own now. It\'s awful. It\'s MINE. Come and hear it when it\'s less awful.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'Baton\'s let us practise anything we like at the half-hour. Anything! We don\'t know any anything.',
          'We\'re learning. Ned\'s tune first. Then I think we\'ll try the market songs. Lark\'s songs.',
        ],
      },
      {
        when: { questDone: Q_TUNE },
        lines: [
          'I played it soft enough that the Hush couldn\'t prove it was a tune. Just a cornet warming up.',
          'Four bars of warming up. Ned would have laughed. Tilly did. Without a sound. I saw her.',
        ],
      },
      {
        lines: [
          'First cornet. I play the Score from the Great Bandstand every Hour, and it goes up the whole isle.',
          'Ned Tacet taught me. He was better than me. He played one tune of his own, once, in public.',
          'Now his voice is in a pipe and his cornet\'s in the foundry for scrap. I still have his mouthpiece.',
        ],
      },
    ],
    barks: [
      { lines: ['(warming up, very soft)', '(whisper) Valves... valves...', '(whisper) Four bars till the Hour.'] },
    ],
  },

  // ── Tam Rattle — the drummer boy ─────────────────────────────────────
  {
    id: 'brass-tam',
    name: 'Tam Rattle',
    title: 'Side Drum (Drummed Out)',
    look: { body: 0xe8c8a4, accent: 0xb8262e, hat: 'cap', traits: ['bandage'], size: 0.78 },
    at: { x: 930, y: 560 },
    talks: [
      {
        when: MAESTRO,
        lines: [
          'I\'m playing a RAGTIME. I don\'t know what a ragtime is. Hazel says it goes wrong on purpose.',
          'Strut taught me the paradiddle. He came round this morning and taught me a new one. Off the beat.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'Strut\'s let me back in the band! Third side drum! I\'m allowed to march at the BACK.',
          'He says I still rush. He\'s right. I do rush. Nobody\'s going to get muted for rushing now, though.',
        ],
      },
      {
        when: { questDone: Q_DRUM },
        lines: [
          'You beat Strut! In front of the whole square! The band went round you like you were a lamp-post.',
          'My drum\'s back together. The head\'s got a patch. I\'m going to play it at the back of the queue.',
        ],
      },
      {
        when: { quest: Q_DRUM },
        lines: [
          'The hoop, the head and my sticks — he threw them right across the square. Look along the edges.',
          'Then — then show him. Somebody should march out of step in front of him and not get drummed out.',
        ],
      },
      {
        lines: [
          'I rushed. At Vespers. Half a beat ahead, on the roll. Drum-Major Strut stopped the whole band.',
          'He took my drum and slit the head with his mace and threw the bits across the square. Drummed out.',
          'If you\'re drummed out three times, the Tuners come. That was two. I\'m nine.',
        ],
      },
    ],
    barks: [
      { when: { questDone: Q_DRUM }, lines: ['Rat-a-tat!', 'Too fast? GOOD.'] },
      { lines: ['(tapping his knee)', '(whisper) Left, right...', '(whisper) I didn\'t mean to rush.'] },
    ],
  },

  // ── Mistress Crook — the Prince's steward ────────────────────────────
  {
    id: 'brass-crook',
    name: 'Mistress Ada Crook',
    title: 'Steward of the Bandhall',
    look: { body: 0xd8c0a8, accent: 0x223060, hat: 'bandmaster', traits: ['book', 'glasses'], size: 1.0 },
    at: { x: 1700, y: 524 },
    talks: [
      {
        when: MAESTRO,
        lines: [
          'The Prince is at the cathedral, at the Organ, helping to open the pipes. With a spanner. Himself.',
          'He asked for the third pipe on the west side to be opened first. I didn\'t ask whose. I know whose.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'He\'s in the Bandhall with the doors open and no trumpet in his hands. Just sitting. Listening.',
          'At Compline he stood on the step and heard the Organ for the first time in thirty years.',
        ],
      },
      {
        lines: [
          '(whispering) The Bandhall. His Highness is not receiving. His Highness is practising.',
          'He practises every hour there isn\'t an Hour. Scales, mostly. Louder every time.',
          'When the court\'s five champions have all been answered, he\'ll see you. Not before. He\'s a herald.',
        ],
      },
    ],
    barks: [
      { when: PRINCE, lines: ['Shh. He\'s listening.', 'The doors are open.'] },
      { lines: ['(whisper) Not receiving.', '(whisper) He\'s practising.', 'Mind the drums on the step.'] },
    ],
  },

  // ── Herald Tantara — the gate herald ─────────────────────────────────
  {
    id: 'brass-tantara',
    name: 'Young Tantara',
    title: 'Under-Herald of the Fanfare Gate',
    look: { body: 0xecd2b0, accent: 0xf8e08a, hat: 'plume', traits: ['scarf'], size: 0.9 },
    at: { x: 1120, y: 252 },
    talks: [
      {
        when: MAESTRO,
        lines: [
          'No more Hours to call! I blew a fanfare this morning just because the sun came up. It felt GOOD.',
          'Through the gate\'s the cathedral. Everyone\'s going up to listen to the Organ being emptied.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'Herald Clarion says we may call the Hours "a bit softer". I don\'t know how to blow softer.',
          'Up through the gate is the cathedral, stranger. The Maestro\'s waiting at the top. He always is.',
        ],
      },
      {
        lines: [
          'The Fanfare Gate! Through it, the road to the cathedral, and the Great Organ in its roof.',
          'Herald Clarion calls the Hours from here: Matins at dawn, Vespers at dusk, Compline at night.',
          'When we sound, the whole isle stands where it is and sings. If you hear us, stand. Please. For me.',
        ],
      },
    ],
    barks: [
      { lines: ['(polishing his bell)', 'Next Hour at dusk!', '(whisper) Stand when we sound.'] },
    ],
  },
];

const looks: NpcLook[] = [
  { body: 0xd6b494, accent: 0xb8262e, hat: 'bandmaster', traits: ['satchel'] },
  { body: 0xe4c8ac, accent: 0x223060, hat: 'bandmaster', traits: ['beard'] },
  { body: 0xc49a7c, accent: 0xd8a83a, hat: 'cap', traits: ['apron', 'tool'] },
  { body: 0xdcbca0, accent: 0xfbfaf4, hat: 'veil', traits: ['scarf'], size: 0.9 },
  { body: 0xb8906e, accent: 0xb8262e, hat: 'bandmaster', traits: ['pack'], size: 1.15 },
  { body: 0xe8d0b6, accent: 0x7ab8f0, hat: 'beanie', traits: ['scarf'], size: 0.74 },
  { body: 0xcfa585, accent: 0xa8652e, hat: 'straw', traits: ['apron'] },
  { body: 0xd9b89a, accent: 0x5aa894, hat: 'none', traits: ['book', 'glasses'] },
];

const barks: Talk[] = [
  {
    when: MAESTRO,
    lines: [
      'They\'re opening the pipes!',
      'I can hear my brother!',
      'Sing ANYTHING!',
      'My reed\'s in the lake and I don\'t care!',
    ],
  },
  {
    when: PRINCE,
    lines: [
      'The Prince put his trumpet down!',
      'You can hear the Organ at Compline now.',
      'Talking! Out loud! Between the Hours!',
      'Is that allowed? Nobody\'s fined me.',
    ],
  },
  {
    when: { courtReady: 'brass' },
    lines: [
      '(whisper) All five of the band beaten.',
      '(whisper) The stranger\'s going to the Bandhall.',
    ],
  },
  {
    lines: [
      '(whisper) Not till the Hour.',
      '(whisper) Mind your Part.',
      '(whisper) Shh. Hush wardens.',
      'Left, right. Left, right.',
      '(whisper) Vespers soon.',
      '(signs: hello)',
      '(whisper) Polish your reed.',
      '(humming, very low, one note)',
    ],
  },
];

export const BRASS_CROWD: NonNullable<AreaDef['crowd']> = {
  count: 14,
  looks,
  paths: [
    // Up and down the Parade, round the ring drive at the crossing.
    [{ x: 1200, y: 1600 }, { x: 1200, y: 1080 }, { x: 990, y: 1000 }, { x: 960, y: 850 }, { x: 1200, y: 640 }, { x: 1200, y: 300 }, { x: 1200, y: 640 }, { x: 1410, y: 850 }, { x: 1200, y: 1080 }],
    // The Promenade, both ways, skirting the stand.
    [{ x: 120, y: 850 }, { x: 960, y: 850 }, { x: 1200, y: 1060 }, { x: 1440, y: 850 }, { x: 2280, y: 850 }],
    [{ x: 2280, y: 850 }, { x: 1440, y: 850 }, { x: 1200, y: 640 }, { x: 960, y: 850 }, { x: 120, y: 850 }],
    // Down to the foundry yard and back.
    [{ x: 1150, y: 1300 }, { x: 820, y: 1300 }, { x: 540, y: 1320 }, { x: 820, y: 1300 }],
    // Round the lakeside walk to the bakery.
    [{ x: 1480, y: 1060 }, { x: 2140, y: 1070 }, { x: 2330, y: 1090 }, { x: 2330, y: 1500 }, { x: 1840, y: 1500 }, { x: 1500, y: 1500 }],
    // Along the drill square's edge.
    [{ x: 950, y: 490 }, { x: 950, y: 680 }, { x: 240, y: 680 }, { x: 950, y: 680 }],
    // Up the Bandhall drive to the tuning yard.
    [{ x: 1250, y: 600 }, { x: 1860, y: 600 }, { x: 2160, y: 680 }, { x: 1860, y: 600 }],
  ],
  barks,
};
