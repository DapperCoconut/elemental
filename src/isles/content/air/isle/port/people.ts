import type { Cond, NpcDef, NpcLook, Pt, Talk } from '../../../../IslesTypes';

/**
 * The people of Windlass — the cliff harbour at the foot of Highspire, and where every crossing to
 * the Air Isle lands.
 *
 * Windlass is the one town on the isle that sits below the cloud line, so the air down here is the
 * only free air on Highspire — and everybody in it works above the line. Every morning the town goes
 * up the spire on the lift or the Hundred Turns to the mills and the courts, and every one of them
 * wears a brass breath-meter strapped over the heart, fitted at the Meter House on the Lift Yard.
 * Every breath drawn up there is ticked off on the dial and owed. A household that falls behind is
 * *becalmed*: the collectors cork its breath into bottles that go up the lift in crates, and the
 * debtor is laid down asleep in the Slumber Court until somebody else works the debt off.
 *
 * Windlass breathes carefully. It talks quietly, laughs into its sleeve, and never, ever runs uphill.
 * Dialogue blocks are listed most specific first: King down → a prince down → their quest done →
 * default. One man only comes home once the King falls: Absalom Ribbonsby, becalmed last winter.
 */

const KING: Cond = { monarch: 'aerion' };
const princes = (count: number): Cond => ({ princesOfIsle: 'air', count });

// ── Positions (shared with the area's POIs and quests) ──────────────

export const AT = {
  dock: { x: 1360, y: 1212 },
  store: { x: 2150, y: 1000 },
  tackle: { x: 2310, y: 1210 },
  baker: { x: 1000, y: 1000 },
  fitter: { x: 2200, y: 690 },
  foreman: { x: 1760, y: 478 },
  kite: { x: 770, y: 676 },
  gull: { x: 290, y: 1090 },
  saul: { x: 470, y: 452 },
  absalom: { x: 836, y: 700 },
} satisfies Record<string, Pt>;

export const WINDLASS_NPCS: NpcDef[] = [
  // ── Harbourmaster / boatwright ────────────────────────────────────
  {
    id: 'windlass-dock', name: 'Hob Cleat', title: 'Harbourmaster & Boatwright', at: AT.dock,
    role: { kind: 'dock', id: 'windlass-dock' },
    look: { body: 0x9a7a62, accent: 0x2e4a5a, hat: 'souwester', traits: ['tool', 'beard', 'pipe'], size: 1.3 },
    talks: [
      {
        when: { flag: 'barnaby-silk-4' },
        lines: [
          'Tuft went up off the end of my quay. Silk full of everybody\'s breath, basket and all. Straight up.',
          'Old fool waved his goggles at me the whole way. I waved back. I have not waved at anything in years.',
        ],
      },
      {
        when: KING,
        lines: [
          'I built a hull this week with no meter-hook on the thwart. Rowers breathe hard. Now they can.',
          'The lift came down empty this morning. No crates. No corks. Just Tam, laughing, riding it like a swing.',
          'Want a boat? Granite ballast, ash ribs, a sail cut for a cliff wind. She will not tip. Nothing tips now.',
        ],
      },
      {
        when: { prince: 'squall' },
        lines: [
          'Squall is down and the weather off the spire has turned decent. Proper sailing wind. I nearly wept.',
          'Thirty years of storm-shutters on every hull. I took one off today. Felt like taking off a coat.',
        ],
      },
      {
        when: { questDone: 'windlass-below-the-line' },
        lines: [
          'Brusk went back up the lift with an empty crate and a dent in his corking-iron. On your first day!',
          'Saul Pellow has been sat on my bollard all week, coughing as loud as he likes. He says it is the principle.',
        ],
      },
      {
        lines: [
          'Off the South Quay and onto the stone — mind the rings, they trip. Welcome to Windlass. Foot of the spire.',
          'Down here, under the cloud, the air is free. Up there it is the King\'s. Enjoy your breath while it is yours.',
          'Boats, hulls, mending: me. Fishing is Fen at the Long Line, east quay. Bread is Hester, at the Rising Loaf.',
        ],
      },
    ],
    barks: [
      { when: KING, lines: ['No meter-hook on the thwart!', 'Breathe, lads! Pull!'] },
      { lines: ['Mind the rings. They trip.', 'Wind\'s backing east.', 'Breathe while it is free.'] },
    ],
  },

  // ── General store ─────────────────────────────────────────────────
  {
    id: 'windlass-store', name: 'Perpetua Draught', title: 'The Lee Side', at: AT.store,
    role: { kind: 'shop', id: 'windlass-store' },
    look: { body: 0xd0a48a, accent: 0x6a4a8a, hat: 'plume', traits: ['glasses', 'satchel'], size: 0.94 },
    talks: [
      {
        when: KING,
        lines: [
          'I have taken the "Please Breathe Quietly" sign off the door. I had it up nine years. Nobody ever laughed.',
          'A man came in and sighed. A great big sigh, on purpose, at the till. We both stood there and enjoyed it.',
        ],
      },
      {
        when: { prince: 'zephyr' },
        lines: [
          'Zephyr is down. The windmills of Galeward are grinding for the town again, not for the toll-bellows.',
          'Flour came down the lift at a fair price this morning. Fair! I had to look the word up. It is a good word.',
        ],
      },
      {
        when: { questDone: 'windlass-unlicensed-air' },
        lines: [
          'Wren Ribbonsby\'s kites are flying over my roof again. I sell out of tail-ribbon every afternoon.',
          'A licence for the air. I ask you. Next they will want a licence for the shade.',
        ],
      },
      {
        lines: [
          'The Lee Side! The only shop on Highspire out of the wind. Well. Mostly out of it. The door does not shut.',
          'Charms with a breath of the isle in them — a vane that knows the wind, a kite that bites, a bottle of you.',
          'Equip three — TAB, then pick. Food at the counter too. Breathe as hard as you like in here. It is free.',
        ],
      },
    ],
    barks: [
      { when: KING, lines: ['Sigh! Go on, sigh!'] },
      { lines: ['Vanes, kites, bottles, biscuits!', 'Shut the door — oh, it does not.', 'Breathe all you like in here.'] },
    ],
  },

  // ── Tackle shop ───────────────────────────────────────────────────
  {
    id: 'windlass-tackle', name: 'Fen Halyard', title: 'The Long Line', at: AT.tackle,
    role: { kind: 'tackle', id: 'windlass-tackle' },
    look: { body: 0xa8846a, accent: 0x3a5a6a, hat: 'aviator', traits: ['rod', 'scarf', 'beard'], size: 1.05 },
    talks: [
      {
        when: KING,
        lines: [
          'I cast a skyline off the summit last night, down into the starpool, breathing like a bellows. Nobody counted.',
          'Landed a windborne marlin this morning, off the Gull Mole. Blue as the line. Let her go. She earned it.',
        ],
      },
      {
        when: { prince: 'nova' },
        lines: [
          'Nova\'s down. The starpool on the summit is fishable without a collector counting your gasps. Go on up.',
          'Comets and nebula rays, in a pool of cold starlight. Only the skyline holds in it. Which I sell. Ahem.',
        ],
      },
      {
        when: { questDone: 'windlass-gull-post' },
        lines: [
          'Moll\'s gulls are back over the quay, shrieking letters up and down the spire. Best noise in the world.',
          'Vane\'s hood washed up under the Gull Mole. I use it to keep my reels dry. He would be so annoyed.',
        ],
      },
      {
        lines: [
          'The Long Line. Driftwood for the sea, iron for the deep stuff, and the skyline for everything above it.',
          'Skyline\'s a kite-cane rod with a mile of kite line on the reel. Cast it off a ledge and it flies down.',
          'Only rod on Highspire that fishes the cloud sea or the starpool. Everything else blows sideways or frays.',
          'Off the Gull Mole for herring and cod. And I buy fish. Somebody has to. The King only buys breath.',
        ],
      },
    ],
    barks: [
      { when: KING, lines: ['Let her go. She earned it.', 'Nobody counted!'] },
      { lines: ['Herring\'s running!', 'A mile of line on that reel.', 'Cast down, not out.'] },
    ],
  },

  // ── Baker ─────────────────────────────────────────────────────────
  {
    id: 'windlass-baker', name: 'Hester Leaven', title: 'The Rising Loaf', at: AT.baker,
    role: { kind: 'bakery', id: 'windlass-bakery' },
    look: { body: 0xe0b494, accent: 0xc87a4a, hat: 'chef', traits: ['apron'], size: 1.25 },
    talks: [
      {
        when: KING,
        lines: [
          'I am baking for the wakers. The becalmed are coming down the Hundred Turns, rubbing their eyes. Starving.',
          'They have been asleep for months. They want bread. Big bread. I have never been so glad to be robbed.',
        ],
      },
      {
        when: { prince: 'reverie' },
        lines: [
          'Reverie is down. The Slumber Court is sending Lake of Nod carp. Dozy things — they fall asleep in the pie.',
        ],
      },
      {
        when: { questDone: 'windlass-long-haul' },
        lines: [
          'Those hauliers\' pasties! I have six orders a day off the wheel now. Tam says they turn faster on pastry.',
        ],
      },
      {
        lines: [
          'The Rising Loaf! Bread rises higher down here than anywhere on the isle. Free air. It gets into the dough.',
          'Bring me fish — off the Gull Mole, or the courts\' waters up the spire — and I bake you a meal.',
          'One meal, one fight. It wears off with the bell. Up the spire they charge you for the air in a loaf.',
        ],
      },
    ],
    barks: [
      { when: KING, lines: ['Big bread! Bigger!'] },
      { lines: ['Fresh off the stone!', 'Mind the oven — it breathes.', 'Free air in every loaf.'] },
    ],
  },

  // ── Meter-fitter ──────────────────────────────────────────────────
  {
    id: 'windlass-fitter', name: 'Ada Bellweather', title: 'Fitter of Meters', at: AT.fitter,
    look: { body: 0xc4a08c, accent: 0x2a5a7a, hat: 'goggles', traits: ['tool', 'glasses', 'apron'], size: 0.95, eye: 0xc8ecff },
    talks: [
      {
        when: KING,
        lines: [
          'I fitted meters for nineteen years. Every chest in Windlass. Every child, the day they first went up.',
          'Now they come in and I take them off. Strap, buckle, dial. Some of them cry. I have a box of tissues.',
          'I owe them that, and a great deal more. I am starting with the buckles.',
        ],
      },
      {
        when: { questDone: 'windlass-counted-twice' },
        lines: [
          'Vent\'s thirteen-tooth wheels are at the bottom of the harbour. I re-cut every ratchet in the House by hand.',
          'Half of Windlass came home out of debt this month. Half. Do you know how many corks that is? I counted.',
        ],
      },
      {
        when: { prince: 'zephyr' },
        lines: [
          'Zephyr is down. The Galeward toll-bellows stopped. Every meter in the House stopped ticking at once.',
          'I sat and listened to them not ticking. Four hundred dials. It was the loudest quiet I ever heard.',
        ],
      },
      {
        when: { questDone: 'windlass-below-the-line' },
        lines: [
          'You are in the House book: "One visitor. Fitted. Snug." Do not hold your breath on my account.',
          'Saul is still behind. He will be behind next month too. I will still fit him. It is what I do.',
        ],
      },
      {
        lines: [
          'Step up. — Arms out. Everyone who goes above the cloud line is fitted with a meter. Visitors too.',
          'It ticks for every breath you draw up there. Here, below the line, it sleeps. Up there, you owe.',
          'Fall behind and the collectors cork you. Your breath goes up the lift in a bottle; you go to sleep.',
          'I do not set the rates. I only fit the meters. You would be amazed how often I have said that today.',
        ],
      },
    ],
    barks: [
      { when: KING, lines: ['Arms up — off it comes.', 'Breathe. Go on. Big one.'] },
      { lines: ['Arms out. Next.', 'Snug? Snug.', 'I only fit the meters.'] },
    ],
  },

  // ── Windlass foreman ──────────────────────────────────────────────
  {
    id: 'windlass-foreman', name: 'Big Tam Capstan', title: 'Foreman of the Wheel', at: AT.foreman,
    look: { body: 0xb08060, accent: 0x5a3a2a, hat: 'bandana', traits: ['beard', 'tool'], size: 1.4 },
    talks: [
      {
        when: KING,
        lines: [
          'I rode the cage down this morning. Just rode it, nothing in it but me. Twenty years I have wanted to.',
          'The wheel lads are breathing like a gale up on the ledge. Panting for fun. Nobody\'s dial is ticking.',
        ],
      },
      {
        when: { prince: 'perigee' },
        lines: [
          'Perigee\'s down. The Orbit Court\'s lodestone used to drag the cage sideways every time it swung past.',
          'Now she hangs plumb. First time in years. The lads cheered a rope. I let them.',
        ],
      },
      {
        when: { questDone: 'windlass-long-haul' },
        lines: [
          'Pasties on the ledge every shift now. Hester sends them up in the cage. Dole sends nobody at all.',
          'Twenty men in a wheel the size of a house, chewing. Best sound on Highspire.',
        ],
      },
      {
        lines: [
          'That drum up on the ledge is the Windlass. The town is named for it. The wheel beside it is my lads.',
          'Twenty men walking inside a wheel all day, hauling the cage up the cliff. Breathing hard. Metered.',
          'The ledge is above the cloud line by a hair. A hair! And every breath on it ticks. We pant, we pay.',
        ],
      },
    ],
    barks: [
      { when: KING, lines: ['Ride the cage! Ride it!', 'Pant, lads! It is free!'] },
      { lines: ['Haul! — and breathe small.', 'Cage coming down!', 'Clear the landing!'] },
    ],
  },

  // ── Wren Ribbonsby ────────────────────────────────────────────────
  {
    id: 'windlass-kite', name: 'Wren Ribbonsby', title: 'Kite-Maker', at: AT.kite,
    look: { body: 0xd4a88e, accent: 0xe85a4a, hat: 'aviator', traits: ['scarf', 'satchel'], size: 1.0 },
    talks: [
      {
        when: KING,
        lines: [
          'Absalom came down the Hundred Turns this morning in his nightshirt. He knew me straight away.',
          'He is asleep again now, in the stall, under the kites. On purpose this time. I am letting him.',
        ],
      },
      {
        when: { questDone: 'windlass-unlicensed-air' },
        lines: [
          'Every kite on the market is up. Look at them. Every one with a line and no licence. Snipe can whistle.',
          'Absalom made that red one. I fly it every day over the Hundred Turns, in case he can see it from his bed.',
        ],
      },
      {
        when: { prince: 'reverie' },
        lines: [
          'Reverie is down? The Slumber Court is where they lay the becalmed. Absalom is there. In a feather bed.',
          'If the dream is broken, maybe he will wake. Maybe he is walking about with a feather in his hair.',
        ],
      },
      {
        lines: [
          'Kites! Diamond, box, cutter, fighter. Every one sewn here, on the market, out of the wind.',
          'My Absalom made the frames. He was becalmed last winter. A month behind. A kite-maker breathes hard.',
          'You run with a kite, you see. Uphill, into the wind. Running is the dearest thing you can do up there.',
        ],
      },
    ],
    barks: [
      { when: KING, lines: ['Absalom! Shoes! — no, let him sleep.'] },
      { lines: ['Kites! Fighters, box kites!', 'Mind the line — it cuts.', 'Up she goes.'] },
    ],
  },

  // ── Moll Gannet ───────────────────────────────────────────────────
  {
    id: 'windlass-gull', name: 'Moll Gannet', title: 'Keeper of the Gull Post', at: AT.gull,
    look: { body: 0xc8a08a, accent: 0x6a7a8a, hat: 'beanie', traits: ['satchel', 'scarf'], size: 0.78 },
    talks: [
      {
        when: KING,
        lines: [
          'Mam\'s letters come by the lift now. In the post sack, like normal letters. Nobody opens them. It is boring.',
          'The gulls are sulking. Nobody needs them. I still send one up every morning with nothing in it. For practice.',
        ],
      },
      {
        when: { questDone: 'windlass-gull-post' },
        lines: [
          'Every gull came home. Every one! Even Barnacle, who is stupid. I counted them twice. Then a third time.',
          'Mam wrote back. She says the nurses at the Slumber Court sneak her letters into the dream. She heard me.',
        ],
      },
      {
        when: { prince: 'reverie' },
        lines: [
          'Reverie is down! Mam is in the Slumber Court. Becalmed. She is a dream-sheep shepherd, in her sleep.',
          'Will she wake up? The gulls do not know. I asked every one of them.',
        ],
      },
      {
        lines: [
          'This is the Gull Post. Letters go up the spire tied to a gull. It costs a herring. The lift costs breath.',
          'Gulls do not wear meters. The King hates that. He has tried. They eat the straps.',
          'Mam is up the spire. Becalmed. I write to her every day. A nurse reads them to her while she sleeps.',
        ],
      },
    ],
    barks: [
      { when: KING, lines: ['Nothing in it! Off you go!'] },
      { lines: ['Herring for a letter!', 'Barnacle, NO.', 'Up the spire and back by noon.'] },
    ],
  },

  // ── Old Saul Pellow ───────────────────────────────────────────────
  {
    id: 'windlass-saul', name: 'Old Saul Pellow', title: 'Retired Off the Wheel', at: AT.saul,
    look: { body: 0xa89080, accent: 0x5a5a4a, hat: 'cap', traits: ['cane', 'scarf', 'pipe'], size: 0.94 },
    talks: [
      {
        when: KING,
        lines: [
          'I coughed this morning. Big one. Rattled the shutters. Then I sat here and listened to my meter not tick.',
          'It is on my mantel now, the meter. Ada took it off me. I polish it. I like knowing where it is.',
        ],
      },
      {
        when: { questDone: 'windlass-below-the-line' },
        lines: [
          'Brusk will be back. They always come back. But not today. Today I cough as loud as I like.',
          'And I owe the King eleven months of cough. He can come and get it. Bring a big bottle.',
        ],
      },
      {
        when: { prince: 'zephyr' },
        lines: [
          'Zephyr down, they say. Good. I hauled on the wheel thirty years for his father\'s bellows. Thirty years.',
        ],
      },
      {
        lines: [
          'Thirty years on the wheel and I have a chest like a bag of gravel. I cough. Coughing counts, up there.',
          'I am retired. I live down here, below the line. But I go up to see my daughter. Every visit, I cough.',
          'Eleven months behind. Ada says the collectors are coming for my breath. I would give it them, if I could.',
        ],
      },
    ],
    barks: [
      { when: KING, lines: ['HACK! — free. Free!'] },
      { lines: ['*cough*', 'Eleven months. Of cough.', 'Thirty years on the wheel.'] },
    ],
  },

  // ── Absalom Ribbonsby (only after the King falls) ─────────────────
  {
    id: 'windlass-absalom', name: 'Absalom Ribbonsby', title: 'Woken from the Becalming', at: AT.absalom,
    present: KING,
    look: { body: 0xc0a088, accent: 0xe8e4dc, hat: 'nightcap', traits: ['beard', 'scarf'], size: 1.05, eye: 0xc8ecff },
    talks: [
      {
        when: { questDone: 'windlass-unlicensed-air' },
        lines: [
          'Wren says you kept the kites flying while I slept. I saw them, you know. Red ones. In the dream.',
          'I thought they were dream-kites. They were mine. She flew them where I could see. Thank you for that.',
        ],
      },
      {
        lines: [
          'I was asleep four months. In a feather bed in the Slumber Court, breathing small, with a nurse counting.',
          'They do not let you dream your own dreams there. You dream sheep. Everyone dreams the same sheep.',
          'Then the bottles broke, up the top, and my breath came back down the wind and found me. Here I am.',
        ],
      },
    ],
    barks: [{ lines: ['No sheep. No sheep at all.', 'Is it morning? It smells like morning.'] }],
  },
];

// ── The crowd ────────────────────────────────────────────────────────

const CROWD_LOOKS: NpcLook[] = [
  { body: 0xb08a72, accent: 0x2e4a5a, hat: 'aviator', traits: ['satchel'] },
  { body: 0xc8a08a, accent: 0x7a4a6a, hat: 'plume' },
  { body: 0x8a6a56, accent: 0x3a3a4a, hat: 'beanie', traits: ['pack'], size: 1.18 },
  { body: 0xd4ac94, accent: 0x5a6a7a, hat: 'none', traits: ['apron'] },
  { body: 0x9a7a66, accent: 0x6a5a4a, hat: 'souwester', traits: ['rod'] },
  { body: 0xb89a7e, accent: 0x2a4a6a, hat: 'cap', traits: ['tool'] },
  { body: 0xc89a82, accent: 0xe85a4a, hat: 'none', size: 0.74 },
  { body: 0xa88a7a, accent: 0x4a4a5a, hat: 'goggles', traits: ['scarf'] },
];

export const WINDLASS_CROWD: { count: number; looks: NpcLook[]; paths: Pt[][]; barks: Talk[] } = {
  count: 14,
  looks: CROWD_LOOKS,
  paths: [
    // The morning queue: down the Hundred Turns, across the Lift Yard to the Meter House and back.
    [{ x: 1300, y: 440 }, { x: 1560, y: 520 }, { x: 2050, y: 680 }, { x: 1700, y: 640 }, { x: 1300, y: 520 }],
    // The waterfront, quay to quay.
    [{ x: 400, y: 1215 }, { x: 900, y: 1218 }, { x: 1500, y: 1212 }, { x: 2200, y: 1215 }],
    // Out along the South Quay and back.
    [{ x: 1220, y: 1240 }, { x: 1220, y: 1440 }, { x: 1230, y: 1300 }],
    // The kite market, round the stalls.
    [{ x: 300, y: 730 }, { x: 700, y: 760 }, { x: 1080, y: 740 }, { x: 860, y: 820 }, { x: 500, y: 810 }],
    // The west road out to the Fable road and back.
    [{ x: 1200, y: 760 }, { x: 600, y: 756 }, { x: 160, y: 750 }],
    // The east road, past the Lee Side and out toward Orbit.
    [{ x: 1400, y: 760 }, { x: 1900, y: 770 }, { x: 2440, y: 760 }, { x: 2200, y: 860 }],
    // The cliff foot west, past the rock-cut doors.
    [{ x: 120, y: 450 }, { x: 600, y: 456 }, { x: 1120, y: 452 }],
    // The Gull Post and the west quay.
    [{ x: 300, y: 1000 }, { x: 560, y: 1060 }, { x: 560, y: 1140 }, { x: 380, y: 1225 }],
  ],
  barks: [
    { when: KING, lines: [
      'I ran UPHILL this morning!', 'Listen — nobody\'s ticking.', 'The becalmed are coming down the Turns!',
      'I sighed in front of a collector. He sighed back.', 'Ada is taking the meters off. Free!',
    ] },
    { when: princes(4), lines: [
      'Four courts free!', 'The lift came down with no corks in it.', 'They say the Lung\'s bellows are wheezing.',
    ] },
    { when: { prince: 'zephyr' }, lines: [
      'The Galeward prince is down!', 'The toll-bellows stopped.', 'Shh — not by the Meter House.',
    ] },
    { lines: [
      'Breathe small, up the Turns.', 'Is your strap snug?', 'They corked the Haddows last week.',
      'Mind the rings on the quay.', 'Herring off the Mole this morning.', 'Wind\'s backing east.', 'Cage coming down!',
    ] },
  ],
};
