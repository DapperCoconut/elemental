import type { Cond, Talk, WandererDef } from '../../../../IslesTypes';

/**
 * Odo Fathomsby — the Drowned Reach's wanderer. A salvage diver who has been stuck inside his own
 * brass helmet for three years. The helmet locks to its breastplate with a key, so a current cannot
 * tear it off; the key was on his first mate's belt when their salvage ship, the Merrow's Ladle,
 * went down off the Abyssal shelf with her aboard. He came up alone, still bolted in. He calls the
 * helmet "the Bell" and talks to it. He is muffled, echoing, and relentlessly cheerful.
 *
 * He is the isle's narrator: the tutorial nudges (tides, fishing, the whalebone rod for the trench,
 * waystones, the counters), gossip about every prince, a reaction to each court freed — and his own
 * story, which only moves once the Queen falls and the drowned walk home out of the Undertow. One of
 * them is Tilly Brackwater, who has had the key round her neck the whole time.
 *
 * Blocks are listed most specific first. Once the Queen falls, his key arc is a chain of flags
 * (`odo-key-1` … `odo-key-4`) and each link holds on its own, so the next step always plays next.
 */

const QUEEN: Cond = { monarch: 'maresa' };
/** True only before the Queen falls — keeps the old lines out of the rotation once she is down. */
const pre = (c: Cond): Cond => ({ all: [c, { not: QUEEN }] });
const princes = (count: number): Cond => ({ princesOfIsle: 'water', count });
const key = (n: number): Cond => ({ flag: `odo-key-${n}` });
const between = (a: number, b: number): Cond => ({ all: [key(a), { not: key(b) }] });

// ── The key arc (after the Queen) ───────────────────────────────────

/** Step 1 — anywhere: the drowned are waking. Plays the first time he is spoken to after the Queen. */
const ARC_WAKING: Talk = {
  when: { all: [QUEEN, { not: key(1) }] },
  sets: 'odo-key-1',
  lines: [
    'Did you — did you HEAR it? Under everything. Like a held breath going out.',
    'The drowned are waking. All of them. In the Undertow, in their bubbles, blinking like new-hatched crabs.',
    'They are walking up the trench road in a line, holding hands so nobody gets lost. I saw them.',
    'I have been looking at every face. Every one. You know why? I will tell you why. Bell, shall I tell them?',
    'Three years ago the Merrow\'s Ladle went down off the shelf while I was under. My first mate went with her.',
    'Tilly Brackwater. Best hands on the Reach. She had the key to the Bell on her belt.',
    'If she is walking home... she will walk to Brinehollow. Everyone does. Meet me there?',
  ],
};

/** Step 2 — Brinehollow: Tilly is home, with the key round her neck. */
const ARC_TILLY: Talk = {
  when: between(1, 2),
  sets: 'odo-key-2',
  lines: [
    'She is HERE. Tilly. Down by the harbour front, at the foot of Ladder Street. Wet through and furious.',
    'She walked straight up to me and knocked on the Bell. Twice. Like a door. "Anyone home?"',
    'And round her neck, on a bit of tarred cord — the key. She grabbed it when the Ladle went down.',
    'Three years asleep in the Undertow with my key over her heart. I have not got a single word for that.',
    'Well. I have several. They are all muffled. Go and say hello to her; I need a moment. The Bell is fogging.',
  ],
};

/** Step 3 — Brinehollow: the key goes in and will not turn. */
const ARC_RUST: Talk = {
  when: between(2, 3),
  sets: 'odo-key-3',
  lines: [
    'The key is in. — It does not turn. Three years in salt water round a sleeping woman\'s neck. It is rust.',
    'Tilly tried. Pernille tried. Hob Dunnage tried with a pair of pliers and a prayer. Nothing.',
    'Jory has it soaking in whale oil in a jar on his counter. "Overnight," he says. Overnight!',
    'Three years in the Bell and I cannot do one more night. ...I can do one more night. Come back tomorrow?',
  ],
};

/** Step 4 — Brinehollow: the key turns. */
const ARC_TURN: Talk = {
  when: between(3, 4),
  sets: 'odo-key-4',
  lines: [
    'Jory brought the jar down at dawn. The key came out black and dripping. Tilly put it in. Turned it.',
    '...Click.',
    'Hold the Bell. Hold it — both sides — lift. LIFT. Mind my ears, I have had them folded three years —',
    'Oh. Oh, the AIR. It is cold. It smells of fish and tar and smoke from the Brine Oven. It is WONDERFUL.',
    'My voice! Listen to my voice! It goes OUT. It does not just go round and round in here.',
    'Hello. Hello. I am Odo Fathomsby, and this is my face. It is not much of a face. It is all mine.',
  ],
};

/** Step 5 — after: the face, the plans, the Bell under his arm. */
const ARC_FREE: Talk = {
  when: key(4),
  lines: [
    'You are going to tell me my face looks pale. Everyone does. It has been in a bucket. It is allowed.',
    'I keep the Bell under my arm. Pip wants it for a flower pot. Hob wants it for a bucket. It is MINE.',
    'Tilly and I are going to raise the Ladle. Her, me, and the Bell, one last dive. With the key in my pocket.',
    'I put the helmet on for the walk sometimes. Habit. And the wind off the sea is sharp after three years.',
    'Thank you. That is all. I have had three years to think of something better and that is all there is.',
  ],
};

/** In every other area, after the Queen and before the helmet comes off. */
const homeNudge = (lines: string[]): Talk => ({ when: { all: [key(1), { not: key(4) }] }, lines });

export const ODO: WandererDef = {
  id: 'water-wanderer-odo',
  name: 'Odo Fathomsby',
  title: 'Salvage Diver (Stuck)',
  look: {
    body: 0x8a9a9a, accent: 0xc9a44a, hand: 0x4a5a5a, hat: 'diving',
    traits: ['pack', 'tool', 'lantern'], size: 1.15, eye: 0xbfeff0,
  },

  byArea: {
    // ── Brinehollow ─────────────────────────────────────────────────
    brinehollow: [
      ARC_WAKING, ARC_TILLY, ARC_RUST, ARC_TURN, ARC_FREE,
      {
        when: pre(princes(6)),
        lines: [
          'Six princes. Every court on the Reach answers to nobody tonight. Except the bottom of the sea.',
          'The tide clock on the plaza has stopped. Sump stood under it with his ledger and did not write a thing.',
          'The Undertow door is on the Abyssal Court\'s north rim. Six seals; you broke them all. It is open.',
          'Eat at the Brine Oven before you go down. Bring the whalebone rod. Bring me back... no. Never mind.',
        ],
      },
      {
        when: pre(princes(3)),
        lines: [
          'Half the courts! Pip has chalked a line on the tithe-house so low it is practically on the floor.',
          'The noon flood came in sulky and late today, and Sump wrote "approximately" in the ledger. Approximately!',
          'People are paying the tithe slower. Not refusing. Just... slower. That is how it starts, the Bell says.',
        ],
      },
      {
        when: pre({ prince: 'ebb' }),
        lines: [
          'Ebb is down! The tide-prince. He used to stand on the tide clock\'s roof and ring the flood in by hand.',
          'Nobody rang it this noon. The sea came in anyway — the sea does — but it came in like it was shy.',
          'Five more. West to Sailmaker\'s, east to Slickharbor. Or up through Tidewater to the cold and the ink.',
        ],
      },
      {
        when: pre({ questDone: 'brinehollow-dry-tithe' }),
        lines: [
          'You are in the ledger now. "One head, foreign." Same as me! I am "one head, brass". Sump insisted.',
          'He charges me a coin a tide for a head he has never seen. I think it is the principle of the thing.',
          'If you see a waystone, touch it. M opens the isle map after; you can walk the roads in a blink.',
        ],
      },
      {
        when: pre({ flag: 'odo-met' }),
        lines: [
          'Still in Brinehollow? Good town. Wet, but good. Everybody here has a bucket and a sense of humour.',
          'North is Tidewater — Prince Ebb, the tide clock. West is Sailmaker\'s. East is Slickharbor. Pick one.',
          'The fishing pier is the thin one east of the main pier. Herring for beginners, eels for the brave.',
          'The tide comes into the low quarter and goes out again on the clock. Watch the gauge in the plaza.',
        ],
      },
      {
        when: { all: [{ not: { flag: 'odo-met' } }, { not: QUEEN }] },
        sets: 'odo-met',
        lines: [
          'HELLO! — Sorry. Sorry. I can never tell how loud I am in here. It is all very echoey in the Bell.',
          'Odo Fathomsby. Salvage diver. Currently stuck. That is not a figure of speech. Knock if you like.',
          '(clonk) Thank you. Three years I have been in this helmet. The key went down with my ship.',
          'You came in off the Brandmark boat! Off a boat, onto the pier, on tithe-day. Brave or lost?',
          'Walk up the pier and talk to Hesper — the dockmistress. Walk up to anyone and press E, really.',
          'Up Ladder Street is the plaza and the tithe-house. You will want to see the tide clock. Everyone does.',
          'TAB opens your pack, if you are wondering. I will be about. I am hard to miss. I am mostly brass.',
        ],
      },
    ],

    // ── The Tidewater Court ─────────────────────────────────────────
    tidewater: [
      ARC_WAKING,
      { when: key(4), lines: [
        'The tide pools! I can SMELL the tide pools. Three years I could only smell the inside of a helmet.',
        'The tide clock has a new keeper. A child. She rings it whenever she feels like it. The sea does not mind.',
      ] },
      homeNudge([
        'The Tidewater folk are walking the sandbars at high water just because nobody says they cannot.',
        'Ebb is helping with the tide pools. He cannot stop timing things. He times the crabs. Leave him be.',
        'I keep looking south toward Brinehollow. If anyone came up the trench road, they would end up there.',
      ]),
      {
        when: pre({ prince: 'ebb' }),
        lines: [
          'You beat Ebb. The tide-prince, on his own tide. He used to surf the flood down the high street.',
          'He was always the one with the timetable. The Queen trusted him with the clock because he loved it.',
          'There is a little bakery here, the Low-Tide Larder. Try it. They put sand dabs in everything.',
        ],
      },
      {
        when: pre({ courtReady: 'tidewater' }),
        lines: [
          'Five champions down! Ebb\'s lighthouse-manor is open. He lives in a lighthouse. Of course he does.',
          'He fights calm first — pools, breakers rolling in. Then he floods the court and rides it like a horse.',
          'Get to high ground when the water comes. He is fastest in it. You are not. Neither is the Bell.',
        ],
      },
      {
        when: pre({ flag: 'odo-tidewater' }),
        lines: [
          'Every champion here plays a rule — the tide coming in, crabs, rip currents. The card tells you which.',
          'Lose? You wake where you stood, wetter. Win and the court pays. Coin buys charms; charms do tricks.',
          'Tide pools for fishing here. Blennies and sand dabs. Gentle stuff. A driftwood rod does fine.',
        ],
      },
      {
        sets: 'odo-tidewater',
        when: { all: [{ not: { flag: 'odo-tidewater' } }, { not: QUEEN }] },
        lines: [
          'The Tidewater Court! Stilt houses, sandbars, and that clocktower — the Tide Gauge. It rules everything.',
          'Prince Ebb sets the flood by it. The whole Reach floods when his clock says flood. Even Brinehollow.',
          'Five champions guard the court. Beat them and Ebb has to come down out of his lighthouse himself.',
          'Mind the flats when the tide turns. The water comes in faster than walking. Ask me how I know.',
        ],
      },
    ],

    // ── The Sailmaker's Court ───────────────────────────────────────
    sailmaker: [
      ARC_WAKING,
      { when: key(4), lines: [
        'Wind on my FACE. Real wind. I stood on the cliff and let it hit me for an hour. The sails were jealous.',
        'The lofts are sewing jibs for fishing boats now. Little ones. Colours! Somebody made a yellow one.',
      ] },
      homeNudge([
        'They are unpicking the Queen\'s fleet sails, seam by seam, and sewing them into blankets for the drowned.',
        'Hem is teaching them the cross-stitch. He says it is the least he can do. It is, but he is doing it.',
        'Have you been back to Brinehollow? I keep thinking I should. In case somebody... walks in.',
      ]),
      {
        when: pre({ prince: 'hem' }),
        lines: [
          'Hem is down! The tailor-prince. He measured every family on the Reach for a tithe-cloak once.',
          'The lofts have stopped sewing the Queen\'s fleet. Half-sewn sails, flapping. Let them flap.',
          'Hesper at the Brinehollow dock will be pleased. She has been begging for canvas for three years.',
        ],
      },
      {
        when: pre({ courtReady: 'sailmaker' }),
        lines: [
          'Five champions down. Hem\'s loft is open. Mind his needles — he throws them in volleys.',
          'And his measuring tape. He lashes it like a whip and it reads your inches off as you bleed.',
          'When he unravels — and he will — he comes apart in ribbons. Sail-cloth ghosts. Do not stand still.',
        ],
      },
      {
        when: pre({ flag: 'odo-sailmaker' }),
        lines: [
          'The cove below the cliffs has sailfin bass and rope-gars. Fish it from the shingle.',
          'Every bolt of canvas in this court goes into the Queen\'s new fleet. Every single bolt.',
          'What does a Queen who owns the tide need a fleet for? The Bell says: for the other isles.',
        ],
      },
      {
        sets: 'odo-sailmaker',
        when: { all: [{ not: { flag: 'odo-sailmaker' } }, { not: QUEEN }] },
        lines: [
          'The Sailmaker\'s Court! Look at the sails on the lines — big as houses, drying in the wind.',
          'Prince Hem governs here. A tailor. Collects the Dry Tithe in canvas — so many yards a head.',
          'Families who cannot sew their quota get measured for something else. A shroud. I do not like it here.',
          'Mind the ropewalks; the lines snap if you run through them taut. I have a dent in the Bell to prove it.',
        ],
      },
    ],

    // ── The Slickharbor Court ───────────────────────────────────────
    slickharbor: [
      ARC_WAKING,
      { when: key(4), lines: [
        'It smells TERRIBLE here. Crude, tar, hot iron. I love it. I love every smell. I am making up for lost time.',
        'The derricks are capped. The rainbow slicks are thinning. A gull landed on the water and took off again clean.',
      ] },
      homeNudge([
        'Crude is down on the quays with a mop. A real mop. Gunnel showed him how. He is bad at it.',
        'The fires are out. The refinery is quiet. You can hear the sea again under all of it.',
        'I keep wanting to be in Brinehollow. Silly. Just a feeling. Like a tug on a line.',
      ]),
      {
        when: pre({ prince: 'crude' }),
        lines: [
          'Crude is down! The oil-prince. He tithed in barrels, twice: once at the derrick, once at the dock.',
          'Pernille\'s lamp oil has halved in price already. The whole of Brinehollow is reading after dark.',
          'Bring an iron rod to the slick. Tar catfish, sculpins, and a shiner that shows you every colour at once.',
        ],
      },
      {
        when: pre({ courtReady: 'slickharbor' }),
        lines: [
          'Five champions down — the refinery gate is open. Crude fights in gushers and slicks first.',
          'Then the slicks catch fire, and the whole yard burns. Keep off the oil when the sparks start.',
          'The Bell is brass. Brass does not burn. I do, though. I checked once. By accident.',
        ],
      },
      {
        when: pre({ flag: 'odo-slickharbor' }),
        lines: [
          'The oil on the water here is fishable, if your rod can stand it. Iron or better; driftwood rots.',
          'Every barrel of crude pays the Dry Tithe twice. That is why Slickharbor houses never flood. They float.',
          'No open flames on the quays! They say it everywhere. Someone always forgets.',
        ],
      },
      {
        sets: 'odo-slickharbor',
        when: { all: [{ not: { flag: 'odo-slickharbor' } }, { not: QUEEN }] },
        lines: [
          'The Slickharbor Court. Black quays, nodding derricks, slicks on the water like oil on a puddle. Because it is.',
          'Prince Crude runs the refinery. The Queen needs oil for her lamps in the deep. Lots of lamps.',
          'Mind your footing — the slicks make you skate. Fast, and very, very loose.',
          'I salvaged a barrel here once. It was full of eels. I do not want to talk about it.',
        ],
      },
    ],

    // ── The Inkwell Court ───────────────────────────────────────────
    inkwell: [
      ARC_WAKING,
      { when: key(4), lines: [
        'I can READ again! Three years of everything blurred through a fogged faceplate. Look at all these words!',
        'The presses are printing a broadsheet with the drowned names on it. Every one. Somebody spelled mine wrong.',
      ] },
      homeNudge([
        'The censors\' towers are empty. Somebody hung the redacted decrees back up with the black bars cut out.',
        'Blot is writing a long letter. To everyone. He has been writing it for three days. Leave him alone.',
        'Has anyone written to Brinehollow? About who came home? I keep meaning to go and look.',
      ]),
      {
        when: pre({ prince: 'blot' }),
        lines: [
          'Blot is down! The ink-prince. He wrote the Dry Tithe ledgers. Every one Sump keeps came from here.',
          'They say the decrees on the lines are drying blank. Nobody to fill them in. Lovely, lovely blank.',
          'The canal fishes. Inkfin squid, quill-pike and a ray like a spilled bottle. Iron rod, at least.',
        ],
      },
      {
        when: pre({ courtReady: 'inkwell' }),
        lines: [
          'Five champions down — Blot\'s printing house is open. He fights in fine print. Paragraphs of it.',
          'Bullets made of lettering, in lines, in columns. Read the gaps between them, not the words.',
          'Then the well spills and he is just a shape in the ink. Find the shape. Hit the shape.',
        ],
      },
      {
        when: pre({ flag: 'odo-inkwell' }),
        lines: [
          'Everything here is black, white and that one blue. Even the gulls. They dip them, I think.',
          'The censors redact anything that mentions the left-under. Whole streets, blacked out on the map.',
          'Squid pens down the canal. Do not stand near one when it is cross. The Bell went dark for a week.',
        ],
      },
      {
        sets: 'odo-inkwell',
        when: { all: [{ not: { flag: 'odo-inkwell' } }, { not: QUEEN }] },
        lines: [
          'The Inkwell Court! Scriptoria on black canals. Decrees drying on lines. Squid pens for the ink.',
          'Prince Blot writes the law and the ledgers. If it is in writing, it is his. If it is not, it is nothing.',
          'He collects the tithe in signatures. Sign your name in the ledger, owe a coin a tide forever.',
          'I signed once. I wrote "Bell". It is still in there. "One head, brass". Sump copied it down.',
        ],
      },
    ],

    // ── The Rimefast Court ──────────────────────────────────────────
    rimefast: [
      ARC_WAKING,
      { when: key(4), lines: [
        'It is FREEZING. My ears! I forgot ears get cold. In the Bell nothing ever got cold except my soup.',
        'The harbour is cracking open. Ships iced in for years are drifting free. One still had its cargo of oranges.',
      ] },
      homeNudge([
        'The ice is melting off the houses Hoarfrost froze. The people inside are waking slow, like the drowned.',
        'Hoarfrost sits by the braziers with them. He looks warmer than I have ever seen him. Still blue, though.',
        'Brinehollow will be warm. And somebody might be there. I keep thinking that. Somebody might be there.',
      ]),
      {
        when: pre({ prince: 'hoarfrost' }),
        lines: [
          'Hoarfrost is down! The ice-prince. He did not drown houses that could not pay. He froze them. Shut.',
          'Imma at the salt pans has doubled her price. The Rimefast roads need salt again now the ice is going.',
          'The ice holes fish beautifully. Frostback char, icicle smelt, glacier cod. Iron rod or better.',
        ],
      },
      {
        when: pre({ courtReady: 'rimefast' }),
        lines: [
          'Five champions down. The icicle palace is open. Hoarfrost fights with lances of ice and a freezing floor.',
          'Then a whiteout. You cannot see him, but you can hear his armour crack. Follow the cracking.',
          'Keep moving. Standing still in Rimefast is how statues get made.',
        ],
      },
      {
        when: pre({ flag: 'odo-rimefast' }),
        lines: [
          'The ice holes are the best fishing on the Reach. Cold fish fight hard. Warm hands help.',
          'The braziers on the quays are lit for the tithe-wardens, not for anyone else. Stand by one anyway.',
          'There are ships in the ice with lamps still lit inside. Do not go knocking. I did. Nobody answered.',
        ],
      },
      {
        sets: 'odo-rimefast',
        when: { all: [{ not: { flag: 'odo-rimefast' } }, { not: QUEEN }] },
        lines: [
          'The Rimefast Court. A whole harbour frozen solid. Ships stuck in it like flies in amber.',
          'Prince Hoarfrost holds it. A house that cannot pay here is not drowned — it is iced over. Folk inside.',
          'The Bell is very cold. I am very cold inside the Bell. The Bell is a terrible coat.',
          'Mind the thin ice. Heavy hits crack it. Mine, mostly. I am a heavy hit just walking.',
        ],
      },
    ],

    // ── The Abyssal Court ───────────────────────────────────────────
    abyssal: [
      ARC_WAKING,
      { when: key(4), lines: [
        'I came back down without the Bell on. In the air bubble you can! I breathed the deep. It tastes of pennies.',
        'Tilly and I found the Ladle\'s anchor chain on the shelf. We are going to raise her. One last dive.',
      ] },
      homeNudge([
        'The whale-rib arches are lit with every lantern in the court. They light the trench road for the walkers.',
        'Lanternjaw stands at the top of the road and counts them out. Every one he carried down, he counts back up.',
        'I looked at every face coming up. Every one. I should be in Brinehollow. That is where they all go.',
      ]),
      {
        when: pre(princes(6)),
        lines: [
          'All six! The Undertow door is open, up on the north rim. Look at it — a hatch in the sea floor, spinning.',
          'Three halls down there. Sluices, currents, a flooded gallery. A warden at the end of each one.',
          'Then the Queen, on her clam. She floods the room on her own clock and drains it again. Watch the clock.',
          'The drowned are in there. Sleeping. In bubbles. I lost someone to the Ladle. She might be... no. Go.',
        ],
      },
      {
        when: pre({ prince: 'lanternjaw' }),
        lines: [
          'Lanternjaw is down! He carried the left-under down to the Undertow himself. Every one. By lure-light.',
          'The trench fishes now — lanternfish, gulper eels, the ghost grenadier. Whalebone rod only. Iron crushes.',
          'Jory sells the whalebone at the Gaff & Gullet. It is dear. It is worth it. Bone bends; iron breaks.',
        ],
      },
      {
        when: pre({ courtReady: 'abyssal' }),
        lines: [
          'Five champions down — Lanternjaw\'s gate is open. It is dark in there. Only his lure is lit.',
          'The lure leads him. Watch the light, not the jaws. Then everything has jaws. A whole swarm.',
          'Do not chase the light. That is what the light is FOR.',
        ],
      },
      {
        when: pre({ flag: 'odo-abyssal' }),
        lines: [
          'This is the deepest court. The champions here are the hardest on the Reach. Come back stronger if you must.',
          'The trench fishing needs the whalebone rod. Nothing else survives the crush. Ask Jory in Brinehollow.',
          'The north rim is where the Undertow door sits. Sealed six ways. One seal per prince.',
        ],
      },
      {
        sets: 'odo-abyssal',
        when: { all: [{ not: { flag: 'odo-abyssal' } }, { not: QUEEN }] },
        lines: [
          'The Abyssal Court. A whole city in an air bubble at the bottom of the trench. Breathe; it holds.',
          'Whale-rib arches. Coral that glows. Anglerfish on poles for street-lamps. Do not touch the lamps.',
          'The Ladle went down on the shelf above us. Three years ago. With my mate, and my key.',
          'Prince Lanternjaw takes the tithe in people. The left-under come through here on their way down.',
          'I salvage here. Coins. Lamps. Not people. Never people. The Bell and I have rules.',
        ],
      },
    ],

    // ── The Undertow ────────────────────────────────────────────────
    undertow: [
      ARC_WAKING,
      { when: key(4), lines: [
        'The halls are draining. The sluices are open and the sea is going out through them, slow and polite.',
        'All the bubbles are empty. Every sleeper woke and walked. I came down to check. Twice. With my face on.',
      ] },
      homeNudge([
        'The throne room is empty. Her clam-shell throne is split. Somebody has written "PAID" across it in chalk.',
        'Pip, I would bet. That child gets everywhere.',
        'I think I should go home to Brinehollow now. I think — I think someone is waiting for me.',
      ]),
      {
        when: pre(princes(6)),
        lines: [
          'The Undertow. Her palace. Listen — that is not the sea. That is breathing. Thousands of sleepers.',
          'The sluices fire in a pattern. Watch two rounds before you go. Caught, you wake at the last marker.',
          'A current hall with an eel that turns like a clock-hand. A gallery that floods till you pull the sluice.',
          'If you see a woman in a bubble with a key round her neck... tell me. That is all. Just tell me.',
        ],
      },
      {
        when: { not: QUEEN },
        lines: [
          'How did you get down here? — No. Do not tell me. The Bell would worry.',
          'The halls are all water and pressure. Keep moving. Keep to the markers.',
        ],
      },
    ],
  },

  general: [
    { when: key(4), lines: [
      'I have a face! I keep touching it. Is that strange? Tilly says it is strange.',
      'Nine more isles out there with nine more crowns, they say. Does any of them have a salvage diver?',
      'If you sail on, take a bit of rope from the Reach. Rope is always useful. Faces are useful too, it turns out.',
    ] },
    { when: { all: [QUEEN, { not: key(4) }] }, lines: [
      'Queen Maresa is down. The tide comes in and goes out and nobody pays a coin for it. Imagine that.',
      'The drowned are walking home. Brinehollow is filling up. I should be there. Something is tugging.',
      'The boatwright can fit an Uber-upgrade if you ever pull one off a sea beast. The Maelstrom Wyrm drops one.',
    ] },
    { when: princes(6), lines: [
      'All six princes. The Undertow door on the Abyssal rim is open. Three halls, three wardens, then her.',
      'Take meals from the Brine Oven. Take your best charms. Take the long way round the sluices.',
      'And if you find anyone asleep with a key round their neck... no. Go on. Go.',
    ] },
    { when: princes(5), lines: [
      'Five princes! The Queen has stopped letting the tide out of the low streets at all, they say. Spite.',
      'Charms last forever, meals last one fight. Three charms at once. Pick the ones that argue least.',
      'One court left. Then the door on the Abyssal rim opens.',
    ] },
    { when: princes(4), lines: [
      'Four courts free! The tithe-boats have stopped putting out from Brinehollow. They sit at the moorings.',
      'Have you spent your Orbs? G opens the gene tree. Grow the deep roots.',
      'The Bell has started to hum when I walk. I think it is happy. Or loose. Probably loose.',
    ] },
    { when: princes(3), lines: [
      'Three courts down! Half the Reach! Everybody in Brinehollow pays the tithe very, very slowly now.',
      'Have you a boat yet? Hesper at the dock builds them. You will need one when the Queen is done.',
      'Ambrose at the broken lighthouse wants glass and eel oil. Ask him. He is grumpy but he is right.',
    ] },
    { when: princes(2), lines: [
      'Two princes! The Queen knows your face now. She has many faces of her own; she collects them.',
      'Quests pay mostly in Orbs — those lights. Every quest on the Reach ends with a fight. Every one.',
      'If one court is too hard, try another and come back. The roads all go round.',
    ] },
    { when: princes(1), lines: [
      'One prince down! Every prince drops something of theirs — an artifact. You can wear one at a time.',
      'And a key. Keys open things. Not the Bell, sadly. I asked. I ask every prince\'s key.',
      'Tidewater is gentlest. Abyssal is hardest — save it. Rimefast and Inkwell sit somewhere in between.',
    ] },
    {
      lines: [
        'Six courts, six princes, one Queen at the bottom of the sea. Start with Tidewater, north of Brinehollow.',
        'Press E near anyone to talk. Near water with a rod, E casts. Near a counter, E opens it.',
        'TAB is your pack — charms go on there. G is your gene tree; Orbs grow it. M is the isle map.',
        'Fish off the Brinehollow piers. Jory sells rods. Agathe at the Brine Oven bakes what you catch.',
        'Each court has its own water. Pools, coves, oil, ink, ice holes and the trench. Each wants a rod.',
        'Driftwood for sea and pools. Iron for oil, ice and ink. The trench needs whalebone. Nothing else holds.',
        'Waystones! Touch one in every court and the map lets you jump between them. My legs thank you.',
        'Twice a day the tide comes into the low streets. Twice a day everybody pays to get their floor back.',
        'The Bell? Brass, copper rivets, a glass faceplate, and me. The key went down with the Merrow\'s Ladle.',
        'I can still salvage! Just slowly. And I cannot eat anything that does not fit through a straw.',
        'Lose a fight and you wake where you stood, a bit damp. Nothing on the Reach stays under for ever. Almost.',
      ],
    },
  ],
};
