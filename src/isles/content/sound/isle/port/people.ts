import type { Cond, NpcDef, NpcLook, Pt, Talk } from '../../../../IslesTypes';

/**
 * The people of Carillon Quay — the harbour of bells, where every crossing to Choirholm lands.
 *
 * The Quay rings the Hours for the shipping, so it is the loudest place on the isle three times a
 * day and the quietest in between. Talk is "noise" and noise is fined; people speak in whispers,
 * or not at all. Every sailor who steps off a boat is given a Part at the Tuners' customs house: a
 * brass reed with one note on it, which is the only note they may sing. A good third of the town
 * has somebody in the Organ, and the muted — white silk ribbon at the throat — talk with their hands.
 *
 * Dialogue blocks are listed most specific first: Maestro down → a prince down → their quest done
 * → default. Hester Fathom's lines are signed, and written as what her hands say.
 */

const MAESTRO: Cond = { monarch: 'cadenza' };
const princes = (count: number): Cond => ({ princesOfIsle: 'sound', count });

// ── Positions (shared with the area's POIs and quests) ──────────────

export const AT = {
  dock: { x: 690, y: 1215 },
  store: { x: 1960, y: 852 },
  tackle: { x: 2230, y: 1150 },
  baker: { x: 1080, y: 852 },
  customs: { x: 1070, y: 1122 },
  founder: { x: 700, y: 1032 },
  hymnal: { x: 1640, y: 794 },
  ringer: { x: 1440, y: 1096 },
  hester: { x: 2420, y: 996 },
  pip: { x: 1360, y: 900 },
} satisfies Record<string, Pt>;

export const CARILLON_NPCS: NpcDef[] = [
  // ── Harbourmistress / boatwright ──────────────────────────────────
  {
    id: 'carillon-dock', name: 'Ottilie Brasswick', title: 'Harbourmistress & Boatwright', at: AT.dock,
    role: { kind: 'dock', id: 'carillon-dock' },
    look: { body: 0xb08a6a, accent: 0x2a3a5a, hat: 'souwester', traits: ['tool', 'apron', 'scarf'], size: 1.2 },
    talks: [
      {
        when: MAESTRO,
        lines: [
          'I built a hull this week and bolted a bell to her stem that rings any note it likes. Out of tune. Glorious.',
          'Sailors come off the boats and nobody gives them a reed. They stand on the quay looking lost. Then they sing.',
          'Want a boat? I will even let you name her something that is not in the Score.',
        ],
      },
      {
        when: { prince: 'mute' },
        lines: [
          'Mute is down, and the Hush wardens stopped fining the slip. You know what a slipway sounds like? Mallets!',
          'Thirty years I have caulked a hull with a felt mallet so nobody would hear. I nearly wept at a wooden one.',
        ],
      },
      {
        when: { questDone: 'carillon-given-a-part' },
        lines: [
          'You sang your own note on the singing-mark. At the Hour. With Semitone stood there. I heard it from the slip.',
          'Half the quay has been whistling one wrong note ever since. Yours. Very quietly. Under their breath.',
        ],
      },
      {
        lines: [
          'Off the jetty — mind the ferry-horns, they bite your elbow. Welcome to Carillon Quay. Keep your voice down.',
          'You will want the customs house before anything. The red door. They give every sailor a Part. A note.',
          'Boats, hulls, mending: that is me. Fish is Abel, east by the jetty. Bread is Marta, up at the Rising Loaf.',
        ],
      },
    ],
    barks: [
      { when: MAESTRO, lines: ['Mallets! Loud ones!', 'Ring, you beauty. Any note.'] },
      { lines: ['Mind the horns.', 'Felt on the mallet. Felt on everything.', 'Shh. It is between the Hours.'] },
    ],
  },

  // ── General store ─────────────────────────────────────────────────
  {
    id: 'carillon-store', name: 'Dorrit Chime', title: 'Chime & Sundry', at: AT.store,
    role: { kind: 'shop', id: 'carillon-store' },
    look: { body: 0xd0a890, accent: 0x6a3a5a, hat: 'beanie', traits: ['glasses', 'satchel', 'scarf'], size: 0.92 },
    talks: [
      {
        when: MAESTRO,
        lines: [
          'I took the felt off the shop bell. Every customer is a little concert now. I have had to sit down twice.',
          'The woolled bells are selling to people who want to pull the wool out themselves. I understand completely.',
        ],
      },
      {
        when: { prince: 'folio' },
        lines: [
          'Folio is down and the hymn sheets came in this week with words crossed back IN. In pencil. Somebody\'s hand.',
          'I sold a songbook with a song in it that is not the Score. Under the counter. I felt about nineteen.',
        ],
      },
      {
        when: { questDone: 'carillon-fair-copy' },
        lines: [
          'Pim\'s hymn sheets have a second song on the back now. Folded over. Everyone buys two. Nobody says why.',
          'If the Tuners ask, I have never heard the market song. Not once. I could not hum it. — Like that? Like that.',
        ],
      },
      {
        lines: [
          'Chime & Sundry, love. Mind the bell over the door — it is stuffed with felt. A warden came round about it.',
          'Charms with the harbour in them. A buoy\'s clapper. A carillon you can fit in a pocket. A woolled bell.',
          'Equip three — TAB, then pick. Biscuits and tea on the counter too. Eat quietly. I mean it, eat quietly.',
        ],
      },
    ],
    barks: [
      { when: MAESTRO, lines: ['Ding! Ding! Ha!', 'Come in, come in — loudly!'] },
      { lines: ['Charms, biscuits, wool, string.', 'Shh — the bell.', 'Bell biscuits. Tap them; they ring.'] },
    ],
  },

  // ── Tackle shop ───────────────────────────────────────────────────
  {
    id: 'carillon-tackle', name: 'Abel Fathom', title: 'The Singing Line', at: AT.tackle,
    role: { kind: 'tackle', id: 'carillon-tackle' },
    look: { body: 0xa07a5c, accent: 0x3a4a5a, hat: 'souwester', traits: ['rod', 'pipe', 'beard'], size: 1.05 },
    talks: [
      {
        when: MAESTRO,
        lines: [
          'My mother came home from the Organ on Tuesday. She has not stopped talking since. I have not asked her to.',
          'I landed an aria marlin at dawn. It sang. I sang back. Let it go. We are even, me and that fish.',
        ],
      },
      {
        when: { prince: 'reprise' },
        lines: [
          'Reprise is down. The cave pool in the Echo Caves rings when you so much as breathe on it. Fish it anyway.',
          'Only the tuning rod takes a singing pool. Anything else shatters on the first strike. I have the tuning rod.',
        ],
      },
      {
        when: { questDone: 'carillon-supper' },
        lines: [
          'We ate together. Mother and me. At a table. She signed the whole time and I talked with my mouth full.',
          'Lull went off up the east road with no fine-book. Mother signs that she would like to see him fined.',
        ],
      },
      {
        lines: [
          'The Singing Line. Hooks, lines, rods — and the tuning rod, which is the only thing that fishes a singing pool.',
          'Off the east jetty is best. Chimefish round the buoys for learning; bellmouth deeper. Press E at the water.',
          'The aria marlin wants an iron rod at least. It sings before it runs. If you hear it, hold on.',
        ],
      },
    ],
    barks: [
      { when: MAESTRO, lines: ['Mother says the fish were always out of tune.', 'Sing to them! They like it!'] },
      { lines: ['Chimefish round the buoys.', 'Hear that? Bellmouth.', 'Tuning rod, iron rod, driftwood.'] },
    ],
  },

  // ── Bakery ────────────────────────────────────────────────────────
  {
    id: 'carillon-baker', name: 'Marta Leaven', title: 'The Rising Loaf', at: AT.baker,
    role: { kind: 'bakery', id: 'carillon-bakery' },
    look: { body: 0xe0b898, accent: 0xf0e8d8, hat: 'chef', traits: ['apron'], size: 1.15 },
    talks: [
      {
        when: MAESTRO,
        lines: [
          'I sang to the dough this morning. Out loud. Whatever came into my head. It rose higher than it ever has.',
          'You can taste it, I swear. Bread that was sung to. Have a bap. Have two. Sing something.',
        ],
      },
      {
        when: { prince: 'fanfare' },
        lines: [
          'Fanfare is down and the Brass Court bands have been playing whatever they like on the greens. Polkas!',
          'Cornet carp have come down the north road for the first time in years. My fiddler turnovers are back.',
        ],
      },
      {
        when: { questDone: 'carillon-supper' },
        lines: [
          'Abel ate a Compline Pie at a table with his mother, in a whisper, and the warden got nothing. Good.',
          'I have had six orders for Compline Pie since. Families. Eating together after the last Hour. Quietly.',
        ],
      },
      {
        lines: [
          'The Rising Loaf. Bring me fish and I will bake you something to fight on. One meal, one fight.',
          'I bake between the Hours, with the oven door shut. Dough is not noise. The wardens checked.',
          'Chimefish make a bap. Chimefish and a bellmouth make a Compline Pie. The rest, ask and I will tell you.',
        ],
      },
    ],
    barks: [
      { when: MAESTRO, lines: ['Up, dough! Up!', 'Sung bread! Sung bread!'] },
      { lines: ['Baps, pies, turnovers.', 'Dough is not noise.', 'Mind the peel.'] },
    ],
  },

  // ── The Tuners' customs clerk ─────────────────────────────────────
  {
    id: 'carillon-customs', name: 'Wren Quaver', title: 'Clerk of Parts, the Customs House', at: AT.customs,
    look: { body: 0xc8a890, accent: 0x8a2a2e, hat: 'visor', traits: ['book', 'glasses'], size: 0.95, eye: 0xe0c070 },
    talks: [
      {
        when: MAESTRO,
        lines: [
          'I closed the customs house this morning and put the reeds in a sack and dropped the sack in the harbour.',
          'The chimefish have been nosing at it all day. Ringing. I think they like brass. I am going to keep this job.',
          'It is called Harbour Welcome now. I give sailors a cup of tea. Nobody gets a note.',
        ],
      },
      {
        when: { prince: 'vesper' },
        lines: [
          'Vesper is down. The cathedral is not ringing Compline tonight. I do not know what to do with my evening.',
          'I sat on the step and listened to the sea. It was very loud. I never noticed it was so loud.',
        ],
      },
      {
        when: { questDone: 'carillon-given-a-part' },
        lines: [
          'I gave you a blank reed and you sang on the mark. I have stamped four hundred reeds and never seen that.',
          'I have been giving out blanks ever since. Quietly. If anyone asks, they are very high notes.',
        ],
      },
      {
        lines: [
          'Customs. A Part for every sailor, by order of the Maestro. Stand at the counter. Do not hum.',
          'I stamp the note on the reed. You pin it at the collar. You sing it at the Hours. Only it.',
          'Do not look at me like that. I only stamp the reeds. Someone always only stamps the reeds.',
        ],
      },
    ],
    barks: [
      { when: MAESTRO, lines: ['Tea? Tea. No reed.', 'Harbour Welcome!'] },
      { lines: ['Next. Quietly.', 'B-flat, B-flat, A.', 'Pin it at the collar.'] },
    ],
  },

  // ── The bell-founder ──────────────────────────────────────────────
  {
    id: 'carillon-founder', name: 'Mother Ada Clapperton', title: 'Bell-Founder', at: AT.founder,
    look: { body: 0xa87a60, accent: 0x5a3a2a, hat: 'goggles', traits: ['apron', 'tool', 'bandage'], size: 1.25, eye: 0xffc870 },
    talks: [
      {
        when: MAESTRO,
        lines: [
          'The Organ\'s pipes are coming down the hill by cart. Silver. Fine metal. Every one empty now, thank God.',
          'I am going to melt them into bells for the Quay. Every bell a different note. Every one wrong.',
        ],
      },
      {
        when: { questDone: 'carillon-wrong-note' },
        lines: [
          'The wrong bell is hanging in my yard. When the wind takes it, people stop in the street and look up.',
          'Forke came back for his tuning fork with a bandage on his ear. I told him it was in the casting pit. It is.',
        ],
      },
      {
        when: { prince: 'fanfare' },
        lines: [
          'Fanfare is down. Half my orders were herald trumpets for him. I shall have to cast something useful.',
        ],
      },
      {
        lines: [
          'Mind the pit, it is still warm. Clapperton Foundry. We cast every bell on the Quay, and the buoys\'.',
          'Every bell in the Score\'s keys. The Assayer comes down from the Brass Court and tests them with a fork.',
          'A bell that rings off the Score, he smashes. Forty years, and I have never once cast the note I want.',
        ],
      },
    ],
    barks: [
      { when: MAESTRO, lines: ['Wrong! All wrong! Lovely!', 'Feed the pit!'] },
      { lines: ['Mind the pit.', 'Still cooling.', 'Bronze is patient. Founders are not.'] },
    ],
  },

  // ── The hymn-sheet seller ─────────────────────────────────────────
  {
    id: 'carillon-hymnal', name: 'Pim Staveley', title: 'Hymn-Sheet Seller', at: AT.hymnal,
    look: { body: 0xd8b898, accent: 0x2a3a2a, hat: 'tophat', traits: ['book', 'scarf'], size: 1.0 },
    talks: [
      {
        when: MAESTRO,
        lines: [
          'I have printed nothing but the market song all week. People are buying it to sing. Badly. In the street.',
          'The Libretto Court sent a letter. I used it to light the press-room stove. It burned in a lovely key.',
        ],
      },
      {
        when: { prince: 'folio' },
        lines: [
          'Folio is down. The censors have stopped coming to the stall. I have not stopped looking over my shoulder.',
        ],
      },
      {
        when: { questDone: 'carillon-fair-copy' },
        lines: [
          'The market song is in every hymn sheet I sell, folded inside the Score. Nobody has told on me yet.',
          'Lark came by and touched the page and Patter sang a line of it in her voice. I had to sit down.',
        ],
      },
      {
        lines: [
          'Hymn sheets! The Score for the Hours, word for word, Libretto Court licensed. A copper a sheet.',
          'You will need one for Vespers. Everyone stands and sings. If you do not know the words, mouth them.',
          'I print what they send me. Every word. My press has never set a word of its own. More is the pity.',
        ],
      },
    ],
    barks: [
      { when: MAESTRO, lines: ['The market song! A copper!', 'Sing it wrong! Everyone does!'] },
      { lines: ['Hymn sheets! The Score!', 'Word for word, licensed.', 'A copper a sheet.'] },
    ],
  },

  // ── The carillonneur ──────────────────────────────────────────────
  {
    id: 'carillon-ringer', name: 'Old Tobiah Peal', title: 'Carillonneur of the Quay', at: AT.ringer,
    look: { body: 0xb89a80, accent: 0x2a2a3a, hat: 'beanie', traits: ['beard', 'cane', 'scarf'], size: 1.05 },
    talks: [
      {
        when: MAESTRO,
        lines: [
          'I rang nothing at Matins. Nothing! The town woke up on its own. Came out and looked at the tower. Laughed.',
          'Then I rang the changes for an hour, any order I liked. My arms are ruined. My heart is twenty.',
        ],
      },
      {
        when: { questDone: 'carillon-ring-the-changes' },
        lines: [
          'I rang the buoy\'s note from the tower at Vespers. Just once, in the middle of the Score. One wrong bell.',
          'The whole Quay stopped singing to listen. A hundred people, mouths open. Silence. Then they sang on.',
          'Tempo went up the hill with his metronome broken. I have been sleeping like a child.',
        ],
      },
      {
        when: { prince: 'vesper' },
        lines: ['Vesper is down. The cathedral bells are quiet. Mine will have to do. They always did, frankly.'],
      },
      {
        lines: [
          'I ring the Hours for the shipping. Matins, Vespers, Compline. Fifty years. The same peal. To the second.',
          'Stand on the singing-mark under the tower at the Hour and the whole Quay can hear you. That is the point.',
          'Mind the ropes. If you pull one between the Hours they fine me, not you. They always fine me.',
        ],
      },
    ],
    barks: [
      { when: MAESTRO, lines: ['Any order! Any order I like!', 'Ow. My arms. Ha.'] },
      { lines: ['Not long to the Hour.', 'Mind the ropes.', 'Fifty years, to the second.'] },
    ],
  },

  // ── Hester Fathom (muted) ─────────────────────────────────────────
  {
    id: 'carillon-hester', name: 'Hester Fathom', title: 'Muted (her voice is in the Organ)', at: AT.hester,
    look: { body: 0xc8a898, accent: 0x5a5a6a, hat: 'none', traits: ['scarf', 'cane'], size: 0.92, eye: 0xd8e0f0 },
    talks: [
      {
        when: MAESTRO,
        lines: [
          '"...Hello. Hello. Is that — that is me. That is my voice. It sounds old. It has got old without me."',
          '"I have not said a word aloud in eleven years. I keep signing and talking at once. My hands will not stop."',
          '"Abel cried. He has his father\'s face when he cries. I told him so. Out loud. Ha!"',
        ],
      },
      {
        when: { questDone: 'carillon-supper' },
        lines: [
          '(She signs, slowly so you can follow:) Supper. At a table. With my son. You fought the warden for it.',
          '(She taps her white ribbon, then your hand.) They took the voice. They did not take the supper.',
        ],
      },
      {
        when: { prince: 'mute' },
        lines: [
          '(She signs, quick and fierce:) Mute is down. The Quiet House is open. Some came home. Not voices. People.',
        ],
      },
      {
        lines: [
          '(She touches the white silk ribbon at her throat and shakes her head, smiling a little.)',
          '(She signs: a hand flat on the chest, lifted up toward the summit, the fingers closing.) Taken. Up there.',
          '(Then a hand cupped at her ear, and three fingers.) At Compline you can hear it. Mine is the low one.',
        ],
      },
    ],
    barks: [
      { when: MAESTRO, lines: ['"Hello! Hello!"', '"Abel! Supper!"'] },
      { lines: ['(She signs: good day.)', '(She points at the sky, then her ribbon.)', '(She waves.)'] },
    ],
  },

  // ── Pip Staveley (a child) ────────────────────────────────────────
  {
    id: 'carillon-pip', name: 'Pip Staveley', title: 'Seven, and a Part in G', at: AT.pip, wander: 60,
    look: { body: 0xe0c0a0, accent: 0x4a6a8a, hat: 'beanie', traits: ['scarf'], size: 0.72 },
    talks: [
      {
        when: MAESTRO,
        lines: [
          'I sang a song I made up! About a gull! It does not have a G in it at all!',
          'Dad says I am the first one in our family to sing a whole song. He keeps crying. Is that normal?',
        ],
      },
      {
        when: princes(3),
        lines: [
          'Dad says three courts are gone. I asked if I can sing an A now. He said "not yet, Pip". Then he hummed one.',
        ],
      },
      {
        lines: [
          'I have a G. Look — on the reed. I sing it at the Hours. Ggggg. Only G. Never anything else.',
          'Sometimes in bed I sing an A. Very quiet. Into the pillow. Do not tell the wardens.',
          'Did you get a note? What is yours? You can tell me. I can keep a secret. Mostly.',
        ],
      },
    ],
    barks: [
      { when: MAESTRO, lines: ['A gull, a gull, a big white gull!', 'La la LA!'] },
      { lines: ['Ggggg.', 'Shh, it is not the Hour.', 'Have you got a note?'] },
    ],
  },
];

// ── The crowd ───────────────────────────────────────────────────────

const CROWD_LOOKS: NpcLook[] = [
  { body: 0xb08a6a, accent: 0x2a3a5a, hat: 'souwester', traits: ['pack'] },
  { body: 0xc8a08a, accent: 0x6a3a4a, hat: 'beanie', traits: ['scarf'] },
  { body: 0x8a6a52, accent: 0x3a3a4a, hat: 'cap', traits: ['tool'], size: 1.15 },
  { body: 0xd0aa90, accent: 0xe8e4f0, hat: 'none', traits: ['scarf'] },
  { body: 0x9a7a62, accent: 0x4a2a2a, hat: 'hood', traits: ['cane'] },
  { body: 0xb89878, accent: 0x8a2a2e, hat: 'bandmaster' },
  { body: 0xc89a82, accent: 0x4a6a8a, hat: 'beanie', size: 0.74 },
  { body: 0xa88a7a, accent: 0x5a5a6a, hat: 'earmuffs', traits: ['lantern'] },
  { body: 0xd8b8a0, accent: 0x2a2a2a, hat: 'tophat', traits: ['book'] },
];

export const CARILLON_CROWD: { count: number; looks: NpcLook[]; paths: Pt[][]; barks: Talk[] } = {
  count: 14,
  looks: CROWD_LOOKS,
  paths: [
    // The quay, from the slipway to the tackle shed and back.
    [{ x: 300, y: 1190 }, { x: 860, y: 1200 }, { x: 1300, y: 1210 }, { x: 1800, y: 1200 }, { x: 2400, y: 1200 }],
    // Up and down the landing jetty.
    [{ x: 1300, y: 1220 }, { x: 1300, y: 1440 }, { x: 1300, y: 1250 }, { x: 1180, y: 1180 }],
    // Round the Singing Square.
    [{ x: 1280, y: 700 }, { x: 1760, y: 700 }, { x: 1760, y: 960 }, { x: 1300, y: 980 }],
    // The Paper Road out west and back.
    [{ x: 1200, y: 760 }, { x: 800, y: 760 }, { x: 400, y: 760 }, { x: 140, y: 760 }],
    // The Muffled Road out east and back.
    [{ x: 1800, y: 1000 }, { x: 2200, y: 960 }, { x: 2300, y: 780 }, { x: 2460, y: 760 }],
    // Up the great stair and along the upper terrace.
    [{ x: 1300, y: 640 }, { x: 1300, y: 460 }, { x: 900, y: 440 }, { x: 1300, y: 200 }, { x: 1700, y: 440 }],
    // The west stair and the foundry yard.
    [{ x: 420, y: 470 }, { x: 420, y: 620 }, { x: 600, y: 1010 }, { x: 880, y: 1000 }],
    // The east stair down to the store.
    [{ x: 2160, y: 460 }, { x: 2160, y: 640 }, { x: 2000, y: 900 }, { x: 1800, y: 880 }],
  ],
  barks: [
    { when: MAESTRO, lines: [
      'My brother came down from the Organ this morning!', 'I sang in the street! The street!',
      'Nobody gave the sailors a reed today.', 'Listen — somebody is whistling the market song.', 'Loud! Say it loud!',
    ] },
    { when: princes(4), lines: [
      'Four courts free.', 'A warden smiled at me. I think.', 'They say the Organ played a wrong note at Compline.',
    ] },
    { when: { prince: 'mute' }, lines: ['Shh — no, wait. No more shh.', 'The Quiet House is empty!', 'Speak up, I think we can.'] },
    { when: { prince: 'fanfare' }, lines: ['Fanfare is down!', 'The bands are playing polkas on the greens.', 'Quiet — not by the customs house.'] },
    { lines: [
      'Shh.', 'Not long to the Hour.', 'Have you got your sheet for Vespers?', 'Mind the horns.',
      'Felt on the mallets, please.', 'They muted the Dunnings\' girl last week.', 'Hum your Part. Only your Part.',
    ] },
  ],
};
