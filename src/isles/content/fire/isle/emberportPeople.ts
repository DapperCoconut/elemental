import type { NpcDef, NpcLook, Pt, Talk } from '../../../IslesTypes';

/**
 * The people of Emberport — the harbour every voyage to Brandmark starts from.
 *
 * Emberport is the King's least favourite town: it smells of fish, it trades with ships he does
 * not own, and it keeps its Tithe Fire burning with the bare minimum of enthusiasm. Its people
 * are wry, tired and quietly brave. Each of them changes their tune as the courts fall — the
 * Hearth first (it is the court that taxes the port), then the King himself.
 *
 * Dialogue blocks are listed most specific first: King down → their prince down → their quest
 * done → default.
 */

const KING: Talk['when'] = { monarch: 'ashgrave' };

// ── Positions (shared with the area's POIs and quests) ──────────────

export const AT = {
  harbourmaster: { x: 1540, y: 1050 },
  boatwright: { x: 1990, y: 1222 },
  tackle: { x: 760, y: 1042 },
  store: { x: 900, y: 684 },
  baker: { x: 1700, y: 688 },
  fishwife: { x: 1015, y: 1058 },
  keeper: { x: 340, y: 1210 },
  netmender: { x: 600, y: 1218 },
  agna: { x: 560, y: 466 },
  corrow: { x: 1392, y: 700 },
  wick: { x: 1200, y: 862 },
  ruddock: { x: 2160, y: 1046 },
} satisfies Record<string, Pt>;

export const EMBERPORT_NPCS: NpcDef[] = [
  // ── Harbourmaster ─────────────────────────────────────────────────
  {
    id: 'emberport-harbourmaster', name: 'Odile Brack', title: 'Harbourmaster', at: AT.harbourmaster,
    look: { body: 0x9a7a62, accent: 0x24384a, hat: 'tricorn', traits: ['pipe', 'book'], size: 1.05 },
    talks: [
      {
        when: KING,
        lines: [
          'I have been harbourmaster eleven years and this is the first morning I have not logged a tithe barge.',
          'Ships from three isles in the roads already. Word travels faster than a brigantine, it seems.',
          'Whatever you are sailing toward next — the port is yours to come back to. Always.',
        ],
      },
      {
        when: { prince: 'kindle' },
        lines: [
          'The Hearth Court used to send its collectors down every Firstday. This week? Nobody came.',
          'I sat at my desk with the tithe ledger open, waiting, like a fool. Then I closed it.',
          'Five more princes up those roads. Kindle was the youngest. Do not get comfortable.',
        ],
      },
      {
        when: { questDone: 'emberport-unbranded' },
        lines: [
          'You made it to the Hearth gate and back with all your skin. Good. That is more than most do.',
          'Mind Corrow at the Tithe Fire. He counts faces. He has started counting yours.',
        ],
      },
      {
        lines: [
          'Name? Cargo? Brand? — Hold on. No brand. Where in the ash did you sail in from?',
          'Every soul on Brandmark wears the King\'s sigil on the wrist. Every one. You are a walking accusation.',
          'Do not stand in the plaza gawking. Come here. I have an idea, and it is not a good one.',
        ],
      },
    ],
    barks: [
      { when: KING, lines: ['Free port. Free port! I keep saying it to hear how it sounds.'] },
      { when: { prince: 'kindle' }, lines: ['No collectors this week. Strange, quiet, wonderful.'] },
      { lines: ['Three barges of coal to the Kiln and not one crate of bread back.', 'Tide turns in an hour. Somebody move that sloop.'] },
    ],
  },

  // ── Boatwright ────────────────────────────────────────────────────
  {
    id: 'emberport-boatwright', name: 'Hobb Tarrow', title: 'Boatwright', at: AT.boatwright,
    role: { kind: 'dock', id: 'emberport-dock' },
    look: { body: 0x7a5a44, accent: 0x6b3a26, hat: 'bandana', traits: ['beard', 'tool', 'apron'], size: 1.25 },
    talks: [
      {
        when: KING,
        lines: [
          'Do you know what I am building? A boat with no sigil on the bow. First in my life.',
          'I keep carving the King\'s flame on out of habit and then planing it off again.',
          'Need a hull? You get the friend price. The friend price is the normal price, but said warmly.',
        ],
      },
      {
        when: { prince: 'fuse' },
        lines: [
          'With Fuse gone, the Powder Court stopped requisitioning my pitch for their kegs. My hulls rejoice.',
          'Out on the water you will want a cannon. I can bolt one on. Ask about the Bow Cannon.',
        ],
      },
      {
        when: { questDone: 'emberport-lens' },
        lines: [
          'Iven tells me the lens is whole again. Fish-glue. My fish-glue! Finest on the isle.',
          'If that lamp ever burns plain gold again, I will build a boat named after it.',
        ],
      },
      {
        lines: [
          'You want off this rock, or round it? Either way you need a hull under you.',
          'Raft for the brave, sloop for the sensible, brigantine for the rich. A sunk boat is a lost boat.',
          'Sea\'s rough past the shallows. Beasts out there with teeth like harbour chains.',
        ],
      },
    ],
    barks: [
      { when: KING, lines: ['No sigil on the bow. No sigil! Ha!'] },
      { lines: ['Caulk, pitch, plank. Caulk, pitch, plank.', 'Mind the slipway. It bites ankles.'] },
    ],
  },

  // ── Tackle seller ─────────────────────────────────────────────────
  {
    id: 'emberport-tackle', name: 'Sal Gudgeon', title: 'Tackle & Bait', at: AT.tackle,
    role: { kind: 'tackle', id: 'emberport-tackle' },
    look: { body: 0xb08a6a, accent: 0x3a6a5a, hat: 'straw', traits: ['rod', 'satchel'] },
    talks: [
      {
        when: KING,
        lines: [
          'King\'s gone and the Kingscale\'s still out there. Funny. Fish never cared who wore the crown.',
          'I am changing the name of it, mind. "Freescale". Pell says it is stupid. Pell is right.',
        ],
      },
      {
        when: { prince: 'basalt' },
        lines: [
          'Basalt\'s fallen? Then the Caldera lava\'s open for fishing. Proper fishing! Magma carp!',
          'Driftwood burns, iron melts. You want obsidian for lava. I have exactly one. Guess the price.',
        ],
      },
      {
        when: { questDone: 'emberport-kingscale' },
        lines: [
          'You landed a Kingscale and old Pell let it go. Of course he did. Soft as wet rope, that one.',
          'Best story this pier has had in forty years. I tell it wrong on purpose so people come ask you.',
        ],
      },
      {
        lines: [
          'Rods, line, hooks. Driftwood rod for the shallows, iron-ringed for the boiling ponds.',
          'Obsidian for lava, if you are mad. Stand at the pier, press E at the water, and mind the tug.',
          'And I buy fish. Whatever you pull out, I will pay for it — less than it is worth, naturally.',
        ],
      },
    ],
    barks: [
      { when: { prince: 'basalt' }, lines: ['Lava fishing! In my lifetime!'] },
      { lines: ['Bait! Fresh bait! Worms that have never seen daylight!', 'Bit of a nibble out by the pier today.'] },
    ],
  },

  // ── General store ─────────────────────────────────────────────────
  {
    id: 'emberport-store', name: 'Marrit Fenwick', title: 'Sundries & Charms', at: AT.store,
    role: { kind: 'shop', id: 'emberport-store' },
    look: { body: 0xc89a7a, accent: 0x7a3a4a, hat: 'none', traits: ['glasses', 'apron', 'scarf'] },
    talks: [
      {
        when: KING,
        lines: [
          'I have been selling sea-charms to frightened people for twenty years. Now I sell them to proud ones.',
          'Same charms. Different faces. I prefer the new faces.',
        ],
      },
      {
        when: { prince: 'fuse' },
        lines: [
          'Powder Court\'s gunpowder levy is lifted, so the charm-makers can afford brass again. Bells are back.',
          'Three charms at once is the limit. Any more and they start arguing with each other. Truly.',
        ],
      },
      {
        lines: [
          'Fenwick\'s Sundries. Pitch, sailcloth, and the best sea-charms south of the Kiln.',
          'Charms are not stats in a bottle — every one has a little trick. A bell, a lantern, a gull.',
          'Press TAB when you have bought some. Equip three. Fight with them. Thank me after.',
        ],
      },
    ],
    barks: [
      { when: KING, lines: ['Charms for proud people! Get your charms!'] },
      { lines: ['Lanterns, bells, knots and lenses!', 'Buy something before the wardens tax it.'] },
    ],
  },

  // ── Baker ─────────────────────────────────────────────────────────
  {
    id: 'emberport-baker', name: 'Bettany Crust', title: 'The Scorched Loaf', at: AT.baker,
    role: { kind: 'bakery', id: 'emberport-bakery' },
    look: { body: 0xd8a888, accent: 0xf0e0c8, hat: 'chef', traits: ['apron'], size: 1.15 },
    talks: [
      {
        when: KING,
        lines: [
          'I baked a loaf shaped like the King\'s crown and let the whole port tear it apart. Best day of trade ever.',
          'The oven is the only fire on this isle I ever loved. Now it is the only fire anybody has to keep.',
        ],
      },
      {
        when: { prince: 'tallow' },
        lines: [
          'Candlewick honey is coming down the road again — Tallow used to take every comb for his candles.',
          'You will taste it in the glaze. Go on. Taste it in the glaze.',
        ],
      },
      {
        lines: [
          'Welcome to the Scorched Loaf! The name is a warning and a promise.',
          'Bring me fish from the sea and fish from the courts and I will make you a meal worth a fight.',
          'One meal, one fight. Eat before you go in. It wears off when the bell rings — that is cooking.',
        ],
      },
    ],
    barks: [
      { when: KING, lines: ['Crown bread! Tear the crown!'] },
      { lines: ['Loaves out! Mind, they are hot!', 'Bring me a crayfish and I will show you breakfast.'] },
    ],
  },

  // ── Fishwife ──────────────────────────────────────────────────────
  {
    id: 'emberport-fishwife', name: 'Nella Scald', title: 'Fishwife', at: AT.fishwife,
    look: { body: 0xb87a5a, accent: 0x4a6a7a, hat: 'bandana', traits: ['apron', 'bandage'], size: 1.1 },
    talks: [
      {
        when: KING,
        lines: [
          'Half my catch used to go up the mountain as tithe. Half! Now I have too much fish. Lovely problem.',
          'Sprats are half price today. To celebrate. Do not tell Bettany; she will buy them all.',
        ],
      },
      {
        when: { prince: 'gauge' },
        lines: [
          'The Boilerworks stopped dumping hot slurry into the bay now Gauge is gone. The water is clearing!',
          'Saw an ember ray in the shallows yesterday, wings glowing like a stove. Never seen one so close.',
        ],
      },
      {
        when: { questDone: 'emberport-first-catch' },
        lines: [
          'There is the sprat-catcher! Still smells of the pier. Good. Smell like the pier, live like the pier.',
          'Sal buys fish. Bettany cooks them. I just shout about them. Somebody has to.',
        ],
      },
      {
        lines: [
          'FRESH SPRAT! MACKEREL! EEL THAT IS DEFINITELY NOT BRANDED! — Oh. You are not buying, you are staring.',
          'Never held a rod, have you? Nobody in this town would let a pair of hands go that idle. Come here.',
        ],
      },
    ],
    barks: [
      { when: KING, lines: ['Half-price sprats! Freedom sprats!'] },
      { lines: ['Sprat! Mackerel! Eel!', 'Who wants a fish? Everyone wants a fish.'] },
    ],
  },

  // ── Lighthouse keeper ─────────────────────────────────────────────
  {
    id: 'emberport-keeper', name: 'Iven Lanthorn', title: 'Lighthouse Keeper', at: AT.keeper,
    look: { body: 0xa89078, accent: 0x2a2a3a, hat: 'beanie', traits: ['lantern', 'beard'] },
    talks: [
      {
        when: KING,
        lines: [
          'Tonight I am lighting the lamp plain gold. Not brand-red. Not by decree. Gold, the way my father did.',
          'Ships will see it from three isles away. Let them come and look.',
        ],
      },
      {
        when: { prince: 'flux' },
        lines: [
          'Flux kept the Corona\'s captive sun lit with plasma bled from every lamp on the isle. Mine too.',
          'Last night the lamp burned brighter than it has in years. The sun let go of its share.',
        ],
      },
      {
        when: { questDone: 'emberport-lens' },
        lines: [
          'The lens is whole. Every shard. The wardens will notice the beam is not quite the right red.',
          'Let them notice. Some nights I tilt it so it paints the Kiln. Just to remind it we are watching.',
        ],
      },
      {
        lines: [
          'A decree came down: the beam must burn the King\'s red. They smashed my lens to fit a red glass.',
          'The shards went off the gallery and onto the beach. I am too old to go crawling for them.',
        ],
      },
    ],
    barks: [
      { when: KING, lines: ['Gold tonight. Plain gold.'] },
      { lines: ['Red light. Red light. Ships hate the red light.', 'Mind the rocks. Everyone minds the rocks eventually.'] },
    ],
  },

  // ── Net-mender ────────────────────────────────────────────────────
  {
    id: 'emberport-netmender', name: 'Old Pell', title: 'Net-Mender', at: AT.netmender,
    look: { body: 0x9a8070, accent: 0x5a5040, hat: 'beanie', traits: ['beard', 'cane'], size: 0.9 },
    talks: [
      {
        when: KING,
        lines: [
          'Seventy-one years old and the first year I can say the sea belongs to nobody.',
          'Do not you dare get sentimental at me. Mend a net. Nets are better than speeches.',
        ],
      },
      {
        when: { questDone: 'emberport-kingscale' },
        lines: [
          'I held a Kingscale. Gold and red, cold as a coin, heavier than a grandchild.',
          'And I let it go. Some things should not be owned. Took me fifty years to say that out loud.',
        ],
      },
      {
        when: { prince: 'kindle' },
        lines: [
          'Young Kindle fell? Pity. He was the only one of them that ever looked sorry when he took a tithe.',
          'Still took it, mind. Sorry is cheap. Nets are expensive.',
        ],
      },
      {
        lines: [
          'Mind the nets. That one is the King\'s net, that one is my net, and they look identical. Do not ask.',
          'Fifty years mending, and the one fish I never landed is the Kingscale. It took my best hook in \'38.',
        ],
      },
    ],
    barks: [
      { when: KING, lines: ['Nobody\'s sea. Nobody\'s! Mend, mend.'] },
      { lines: ['Over, under, knot. Over, under, knot.', 'Kingscale in the bay tonight, I can feel it in the knees.'] },
    ],
  },

  // ── Agna ──────────────────────────────────────────────────────────
  {
    id: 'emberport-agna', name: 'Agna Sootley', title: 'Widow of Cinder Row', at: AT.agna,
    look: { body: 0xc0a090, accent: 0x3a3440, hat: 'veil', traits: ['scarf', 'brand'], size: 0.95 },
    talks: [
      {
        when: KING,
        lines: [
          'I let the fire go out last night. On purpose. Just to see what it felt like to have a cold hearth.',
          'It felt like sleeping. Then I lit it again because I was cold. That is what fires are for.',
          'Teo is asking when you are coming to supper. He has drawn you twice. You are very tall in both.',
        ],
      },
      {
        when: { prince: 'kindle' },
        lines: [
          'The Hearth Court\'s rounds have stopped. Kindle\'s wardens were the ones who counted the hearths.',
          'For the first time in four years I sat up late without watching the coals. I watched Teo instead.',
        ],
      },
      {
        when: { questDone: 'emberport-cold-hearth' },
        lines: [
          'The fire is in. The wardens came, looked at the coals, scratched their ledger and walked on.',
          'Teo slept through it all. He does not know how close it was. I mean to keep it that way.',
        ],
      },
      {
        lines: [
          'Please — keep your voice down. My tithe fire went out while I sat up with my boy. He has a fever.',
          'A cold hearth means the Kiln. For both of us. The wardens walk Cinder Row at dusk.',
        ],
      },
    ],
    barks: [
      { when: KING, lines: ['Teo! Supper! — Oh, it is you. Come and eat.'] },
      { when: { questDone: 'emberport-cold-hearth' }, lines: ['The fire is in. Thank the tide.'] },
      { lines: ['Please catch, please catch...', 'Dusk is coming. Dusk is always coming.'] },
    ],
  },

  // ── Brand-Sergeant Corrow ─────────────────────────────────────────
  {
    id: 'emberport-corrow', name: 'Brand-Sergeant Corrow', title: 'Tithe-Warden of Emberport', at: AT.corrow,
    look: { body: 0x8a6a5a, accent: 0x6a1a14, hat: 'helmet', traits: ['brand', 'cane'], size: 1.2, eye: 0xffb070 },
    talks: [
      {
        when: KING,
        lines: [
          'I have tended this fire nineteen years. I do not know how to stand anywhere else.',
          'Nobody has thrown a stone at me yet. I keep waiting. I would understand.',
          'Bettany gave me a loaf this morning. For nothing. I sat on the step and ate it and could not stop shaking.',
        ],
      },
      {
        when: { prince: 'kindle' },
        lines: [
          'Prince Kindle\'s orders stopped coming. The court says he is "indisposed". I know what that means.',
          'I still tend the fire. Someone has to. If I stop, they will send someone worse.',
        ],
      },
      {
        when: { questDone: 'emberport-cold-hearth' },
        lines: [
          'The widow Sootley\'s hearth was lit when I passed. Funny. I would have sworn it was cold at noon.',
          'I wrote "lit" in the ledger. Do you understand me? I wrote "lit".',
        ],
      },
      {
        lines: [
          'Halt. Wrist. — Burn, is it? Under a scarf. How tragic.',
          'The Tithe Fire burns in the King\'s name. Every hearth in this port answers to it. Remember that.',
          'Move along. I am counting faces, and yours is new.',
        ],
      },
    ],
    barks: [
      { when: KING, lines: ['...nineteen years.'] },
      { lines: ['Feed the fire. In his name.', 'Faces. I count faces.', 'Cold hearth, cold heart, cold Kiln.'] },
    ],
  },

  // ── Wick ──────────────────────────────────────────────────────────
  {
    id: 'emberport-wick', name: 'Wick', title: 'Harbour Urchin', at: AT.wick, wander: 140,
    look: { body: 0xc89878, accent: 0x8a4a2a, hat: 'cap', traits: ['satchel'], size: 0.72 },
    talks: [
      {
        when: KING,
        lines: [
          'IS IT TRUE? Did you punch the King? Right in the crown? Did it go clang?',
          'Me and Teo are playing Kiln. I am you. Teo has to be the King because he lost at stones.',
        ],
      },
      {
        when: { princesOfIsle: 'fire', count: 3 },
        lines: [
          'Three princes! Everyone at the market says it. Some of them say it quiet and some say it LOUD.',
          'Corrow told me to stop saying it. Then he said "three?" really quiet, like he was checking.',
        ],
      },
      {
        when: { prince: 'kindle' },
        lines: [
          'You beat Prince Kindle?! He has a horse made of fire! — Had. Did he cry? I bet he cried.',
        ],
      },
      {
        lines: [
          'You came off a boat. Nobody comes off a boat. Boats only go out with coal and come back empty.',
          'Want to know a secret? There\'s a chest behind the lighthouse rocks. I can\'t open it. Too rusty.',
          'And there\'s one by the old wreck on the east beach. Don\'t tell Pell I told you.',
        ],
      },
    ],
    barks: [
      { when: KING, lines: ['CLANG! Right in the crown!'] },
      { lines: ['Got a coin? Got a fish? Got a story?', 'I can hold my breath for a whole minute. Watch. — Hhhh.'] },
    ],
  },

  // ── Ruddock ───────────────────────────────────────────────────────
  {
    id: 'emberport-ruddock', name: 'Ruddock', title: 'Smokehouse Master', at: AT.ruddock,
    look: { body: 0x7a5040, accent: 0x3a2a24, hat: 'hood', traits: ['apron', 'pipe'], size: 1.15 },
    talks: [
      {
        when: KING,
        lines: [
          'All my life I smoked fish over the King\'s coals. Taxed coals. Tonight I smoke them over driftwood.',
          'Tastes of the beach. Tastes of nothing owned. Best mackerel I ever made.',
        ],
      },
      {
        when: { prince: 'basalt' },
        lines: [
          'With Basalt gone the Caldera\'s coal is ours to dig. Cheaper fire, longer smoke. Life is a mackerel.',
        ],
      },
      {
        lines: [
          'Smoke is patience, stranger. You cannot hurry a mackerel. Nor a revolution, I am told.',
          'I did not say revolution. You misheard. I said "ration". Smoke in your ears.',
        ],
      },
    ],
    barks: [
      { lines: ['Low and slow. Low and slow.', 'Mind the smoke — it gets in your hair for a week.'] },
    ],
  },
];

// ── The crowd ────────────────────────────────────────────────────────

const CROWD_LOOKS: NpcLook[] = [
  { body: 0xb08870, accent: 0x3a4a5a, hat: 'beanie' },
  { body: 0xc8a080, accent: 0x6a3a2a, hat: 'bandana', traits: ['apron'] },
  { body: 0x8a6a58, accent: 0x2a3a3a, hat: 'cap', traits: ['rod'] },
  { body: 0xd0a888, accent: 0x5a2a3a, hat: 'none', traits: ['scarf'] },
  { body: 0x9a7a6a, accent: 0x4a4a3a, hat: 'straw', traits: ['satchel'] },
  { body: 0xa88a72, accent: 0x7a5a3a, hat: 'none', traits: ['pack'], size: 1.15 },
  { body: 0xc89a82, accent: 0x2a2a3a, hat: 'hood', size: 0.8 },
];

export const EMBERPORT_CROWD: { count: number; looks: NpcLook[]; paths: Pt[][]; barks: Talk[] } = {
  count: 11,
  looks: CROWD_LOOKS,
  paths: [
    // The harbour-front boardwalk, end to end.
    [{ x: 420, y: 1090 }, { x: 900, y: 1092 }, { x: 1400, y: 1090 }, { x: 1900, y: 1094 }, { x: 2300, y: 1090 }],
    // Round the plaza and the Tithe Fire.
    [{ x: 1180, y: 700 }, { x: 1420, y: 690 }, { x: 1440, y: 820 }, { x: 1170, y: 830 }],
    // Market to pier head and back.
    [{ x: 960, y: 1070 }, { x: 1290, y: 1150 }, { x: 1300, y: 1300 }, { x: 1290, y: 1150 }],
    // Up the avenue toward the Hearth road.
    [{ x: 1252, y: 1040 }, { x: 1252, y: 760 }, { x: 1300, y: 300 }, { x: 1252, y: 640 }],
    // Cinder Row, the cross road west.
    [{ x: 300, y: 752 }, { x: 800, y: 748 }, { x: 1100, y: 752 }],
    // Cross road east, past the bakery.
    [{ x: 1500, y: 752 }, { x: 1900, y: 748 }, { x: 2350, y: 752 }],
    // Along the black sand at the waterline.
    [{ x: 480, y: 1236 }, { x: 1100, y: 1232 }, { x: 1600, y: 1236 }, { x: 2200, y: 1234 }],
  ],
  barks: [
    { when: KING, lines: [
      'The King is ASH! Pass it on!', 'I let my tithe fire go out on purpose. Then lit it again. For warmth.',
      'Ships from the Drowned Reach in the roads. Ships!', 'Somebody tell Corrow he can sit down.',
    ] },
    { when: { princesOfIsle: 'fire', count: 4 }, lines: [
      'Four courts free. Four!', 'The Kiln barges are sitting empty at the quay.', 'They say the King has not left his throne in a week.',
    ] },
    { when: { prince: 'kindle' }, lines: [
      'No collectors from the Hearth this week.', 'Did you hear? Prince Kindle.', 'Shh — not in the plaza.',
    ] },
    { lines: [
      'Feed the fire, keep the head.', 'Mackerel\'s up two coppers. Tithe\'s up three.', 'Another coal barge for the Kiln.',
      'Wrist, wrist — keep your sleeve down near Corrow.', 'Gulls got the sergeant\'s hat again.', 'Fog on the water. Good fishing.',
    ] },
  ],
};
