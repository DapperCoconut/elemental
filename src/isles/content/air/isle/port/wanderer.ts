import type { Cond, Talk, WandererDef } from '../../../../IslesTypes';

/**
 * Barnaby Tuft — Highspire's wanderer. A balloonist whose balloon, the *Dandelion*, was confiscated
 * for unpaid air: the collectors emptied her into thirty-four bottles on the Windlass quay in front
 * of him, corked them, and sent them up the lift. He walks the isle with the empty wicker basket
 * strapped on his back like a pack, goggles on, the deflated silk trailing behind him on a rope, and
 * he talks to his altimeter, "Old Needle", which he consults about everything. He is cheerful the way
 * a man is cheerful who has decided to be, fussy about weather, and fluent in nonsense about winds.
 *
 * He is the isle's narrator: the tutorial nudges (wind, the cargo lift, cloud fishing and the skyline
 * rod, waystones, the counters), gossip about every prince, a reaction to each court freed — and his
 * own story, which only moves once the King falls. The bottles in the Lung are broken open, all the
 * isle's stolen breath comes pouring out, and Barnaby holds the silk open over the bottling floor.
 * Thirty-four of the bottles are marked with his name. The *Dandelion* fills. He goes up.
 *
 * Blocks are listed most specific first. Once the King falls, his arc is a chain of flags
 * (`barnaby-silk-1` … `barnaby-silk-4`) and each link holds on its own, so the next step always
 * plays next. Step 2 plays only in the Lung, step 4 only in Windlass.
 */

const KING: Cond = { monarch: 'aerion' };
/** True only before the King falls — keeps the old lines out of the rotation once he is down. */
const pre = (c: Cond): Cond => ({ all: [c, { not: KING }] });
const princes = (count: number): Cond => ({ princesOfIsle: 'air', count });
const silk = (n: number): Cond => ({ flag: `barnaby-silk-${n}` });
const between = (a: number, b: number): Cond => ({ all: [silk(a), { not: silk(b) }] });
/** First time in an area (before the King): sets the area's flag. */
const first = (area: string, lines: string[]): Talk => ({
  sets: `barnaby-${area}`,
  when: { all: [{ not: { flag: `barnaby-${area}` } }, { not: KING }] },
  lines,
});

// ── The silk arc (after the King) ───────────────────────────────────

/** Step 1 — anywhere: the breath is coming home. Plays the first time he is spoken to after the King. */
const ARC_WIND: Talk = {
  when: { all: [KING, { not: silk(1) }] },
  sets: 'barnaby-silk-1',
  lines: [
    'Smell that. — No, properly. Big breath. That wind is coming DOWN the spire. Wind never comes down the spire.',
    'Old Needle has gone mad. Pressure up, pressure down, pressure sideways. That is not weather. That is people.',
    'They are breaking the bottles in the Lung. Every cork on Highspire, popped. The breath is going home.',
    'Thirty-four of those bottles were the Dandelion. My balloon. They corked her in front of me, on the quay.',
    'I am going up to the Lung with the silk. I do not know what for. A man should be there when his balloon is.',
  ],
};

/** Step 2 — the Lung: the bottling floor, the silk held open, the Dandelion fills. */
const ARC_FILL: Talk = {
  when: between(1, 2),
  sets: 'barnaby-silk-2',
  lines: [
    'Here. The bottling floor. Look at it — rows and rows, every one with a name on the wax. Smashed. Good.',
    'And here. "TUFT, B. BALLOON, CONFISCATED. 34." Thirty-four corks in a row on their own little shelf.',
    'Hold the silk with me. Wide, by the hem — over the shelf. Now — break them. Go on. All of them.',
    '...Listen to her. She is filling. That is not just my air, that is everybody\'s, rushing past. She is huge.',
    'Old Needle is twitching. The basket is lifting off my back. Barnaby Tuft, airborne indoors. Absurd. Lovely.',
  ],
};

/** Step 3 — anywhere: the balloon is full and straining; you launch from below the line. */
const ARC_TETHER: Talk = {
  when: between(2, 3),
  sets: 'barnaby-silk-3',
  lines: [
    'She is tethered to my belt and she wants to go up so badly she keeps lifting me onto my toes.',
    'You do not launch a balloon above the cloud line. It is bad manners to the air. You launch from below it.',
    'From Windlass. From the quay where they emptied her. I want the collectors\' cobbles to watch her go.',
    'Walk down with me? When you are ready. She will wait. She has waited eleven years; she can wait an hour.',
  ],
};

/** Step 4 — Windlass: the launch. */
const ARC_LAUNCH: Talk = {
  when: between(3, 4),
  sets: 'barnaby-silk-4',
  lines: [
    'Here. This flagstone. This is where they uncorked her, with the whole quay watching and nobody saying a word.',
    'Tam has the guy-ropes. The wheel lads have the basket. Ada is crying. Hob is pretending not to.',
    'Old Needle, we are at sea level. We are about to not be. — Let go the ropes! LET HER GO!',
    '...Up. Up. Past the Turns, past the Lift Ledge, into the cloud — and out of it! I can see the whole isle!',
    'I am breathing as hard as I like! Above the line! Nobody is counting! — I will come down. Later. Goodbye!',
  ],
};

/** Step 5 — after: he came back down, as balloonists do, wherever the wind put him. */
const ARC_HOME: Talk = {
  when: silk(4),
  lines: [
    'Came down in a turnip field in Galeward this morning. Wind put me there. The farmer gave me tea. Tradition.',
    'I went up past the summit. Higher than the Lung. Higher than Starfall. Old Needle ran off the end of his dial.',
    'And I breathed. Great big greedy lungfuls, all the way up, and the only thing counting was my heart.',
    'The Dandelion is moored on the Lift Ledge now. Tam lets the wheel lads ride her up and down. For free.',
    'Thank you. Old Needle says thank you too. He says it by pointing up, which is the most he ever says.',
  ],
};

/** In every other area, after the wind turns and before the silk is filled: the pull to the Lung. */
const lungNudge = (lines: string[]): Talk => ({ when: between(1, 2), lines });

/** Anywhere but Windlass, once the Dandelion is full and before she launches. */
const NUDGE_LAUNCH: Talk = {
  when: between(3, 4),
  lines: [
    'She is still tied to my belt. Every gust, I go up on my toes. People think I am excited. I am, but also.',
    'Windlass. The quay where they emptied her. Walk me down? She wants to go up from where she came down.',
  ],
};

export const BARNABY: WandererDef = {
  id: 'air-wanderer-barnaby',
  name: 'Barnaby Tuft',
  title: 'Balloonist, Grounded for Unpaid Air',
  look: {
    body: 0xd8b08e, accent: 0x7a5a3a, hand: 0x8a6a4a, hat: 'aviator',
    traits: ['pack', 'scarf', 'satchel'], size: 1.05, eye: 0xd8f0ff,
  },

  byArea: {
    // ── Windlass ────────────────────────────────────────────────────
    windlass: [
      ARC_WIND,
      { when: between(1, 2), lines: [
        'The wind is pouring down the Turns. You can hear the corks from here if you hold your breath. Ha. Habit.',
        'The Lung is at the summit — up through Galeward, up through Starfall, through the door. Walk with me?',
      ] },
      ARC_TETHER, ARC_LAUNCH, ARC_HOME,
      {
        when: pre(princes(6)),
        lines: [
          'Six princes. The door to the Lung on the summit is open. Old Needle has been pointing straight up all day.',
          'The bottles are up there. Every becalmed breath on Highspire. Mine too. Thirty-four of them.',
          'Eat at the Rising Loaf before you go. The palace is bellows and blades and bottles. Bring your best charms.',
        ],
      },
      {
        when: pre(princes(3)),
        lines: [
          'Half the courts! Ada says the meters have stopped ticking in three courts. You can hear people sigh again.',
          'The lift came down with half its crates empty today. Tam rode it down, grinning. Nobody stopped him.',
          'Old Needle reads a little higher every morning. He is an optimist. I let him be.',
        ],
      },
      {
        when: pre({ prince: 'zephyr' }),
        lines: [
          'Zephyr is down. The Galeward prince. He ran the toll-bellows — every mill-sail on the shoulder, metered.',
          'Ada says every meter in the House twitched at once when he fell. Like the whole isle took a breath.',
          'Five more. West to the stories, east to the orrery, up through Galeward to the sleep, the storm, the stars.',
        ],
      },
      {
        when: pre({ questDone: 'windlass-below-the-line' }),
        lines: [
          'Brusk went back up the lift with an empty crate. The whole quay heard. Old Needle went up three feet.',
          'Touch the waystone on the waterfront if you have not. M opens the isle map; you can walk the roads in a blink.',
          'The Long Line sells the skyline rod. Dear. The only rod on Highspire that fishes the cloud sea.',
        ],
      },
      {
        when: pre({ flag: 'barnaby-met' }),
        lines: [
          'Still in Windlass? It is a good town. Cold, kind, and very careful how it breathes. Most of Highspire is.',
          'North up the Hundred Turns is Galeward — windmills. West is the Fable Court. East is the Orbit Court.',
          'Fish off the Gull Mole for herring and cod. Fen at the Long Line sells rods and buys what you catch.',
          'Hester at the Rising Loaf bakes what you catch. A meal lasts one fight. A charm lasts for ever.',
        ],
      },
      {
        when: { all: [{ not: { flag: 'barnaby-met' } }, { not: KING }] },
        sets: 'barnaby-met',
        lines: [
          'Mind the silk! — Thank you. People tread on it. It is a balloon. Was. Is. It is a balloon in waiting.',
          'Barnaby Tuft, aeronaut, currently pedestrian. And this is Old Needle. — Needle, a visitor. Sea level. Be nice.',
          'You have landed in Windlass, at the foot of Highspire. Look up. That cloud is the line. Above it, you pay.',
          'Walk up to anyone and press E. Hob on the quay first. Then the Meter House. They will fit you. Everyone.',
          'TAB opens your pack, if you are wondering. I will be about. Look for the silk. People always tread on it.',
        ],
      },
    ],

    // ── The Galeward Court ──────────────────────────────────────────
    galeward: [
      ARC_WIND,
      ARC_TETHER,
      NUDGE_LAUNCH,
      { when: silk(4), lines: [
        'The windmills are grinding for bread again. The toll-bellows stand still with a family of jackdaws in them.',
        'I landed in this very field. Turnips. The farmer said I was the second-best thing to fall from the sky.',
      ] },
      lungNudge([
        'Every windmill on the shoulder is spinning backwards. The wind is coming down. Old Needle is beside himself.',
        'Zephyr stands on his manor roof watching the vanes. He says he has never seen the wind change its mind.',
        'Up. Through Starfall. The Lung. I can almost hear the corks from here.',
      ]),
      {
        when: pre(princes(6)),
        lines: [
          'All six! The summit door is open. The mills are turning slow, like they are listening.',
          'The Lung is north, through Starfall, at the very top. Bellows halls, a bottling floor, a gallery of vanes.',
          'Then him. In the hub of his sails. Old Needle will not stop pointing at it.',
        ],
      },
      {
        when: pre({ prince: 'zephyr' }),
        lines: [
          'You beat Zephyr! The weathervane prince. He used to set the vanes to tell the mills which way to pay.',
          'The cloud edge fishes kindly now — cirrus sprat, gale flyingfish. Skyline rod only; the rest blow away.',
          'The Millstone bakes here. Flour from the mills, sprat from the cloud. Very light. You have to hold it down.',
        ],
      },
      {
        when: pre({ courtReady: 'galeward' }),
        lines: [
          'Five champions down. Zephyr\'s manor is open. A fair wind first — gliding, kite-blades, crosswinds.',
          'Then he becomes the gale. A whirlwind with a face, and the whole yard turning round him. Lean into it.',
          'Old Needle says the pressure drops before every gust. Watch the grass. The grass always knows first.',
        ],
      },
      {
        when: pre({ flag: 'barnaby-galeward' }),
        lines: [
          'Every champion here plays a rule — wind, kites, a mill, a meter, a vent. The fight card tells you which.',
          'Lose? You wake where you stood, a bit windswept. Win and the court pays. Coin buys charms.',
          'The cloud edge is fishable with a skyline rod. You let it fly down off the bridge. Fen in Windlass sells them.',
        ],
      },
      first('galeward', [
        'The Galeward Court! Windmills in rows, vanes on every roof, rope bridges out over the cloud. Glorious air.',
        'And every mill-sail on the shoulder is metered. The wind turns them; the toll-bellows charges the miller.',
        'Prince Zephyr keeps it from his weathervane manor. He has never once let the wind blow for free.',
        'Five champions guard it. Beat them and Zephyr has to come down off his roof himself.',
      ]),
    ],

    // ── The Slumber Court ───────────────────────────────────────────
    slumber: [
      ARC_WIND,
      ARC_TETHER,
      NUDGE_LAUNCH,
      { when: silk(4), lines: [
        'Every bed in the Slumber Court is empty. The feathers are blowing down the streets like snow.',
        'The dream-sheep are still grazing on the clouds. Nobody needs them now. The children are feeding them.',
      ] },
      lungNudge([
        'They are waking up. All of them. Rubbing their eyes, coming out of the feather beds, asking what month it is.',
        'Every time a cork pops up in the Lung, somebody here sits up in bed. I watched it happen. Twice.',
        'Up, to the Lung. Every bottle we break is somebody here getting out of bed.',
      ]),
      {
        when: pre({ prince: 'reverie' }),
        lines: [
          'Reverie is down! The sleep prince. He kept the becalmed dreaming, so they would not wake and ask.',
          'The Lake of Nod fishes now — dozing carp, lullaby loach, and a nightmare pike that bites in your sleep.',
          'Nobody has woken up yet. The breath is still in the bottles. But they are dreaming their own dreams again.',
        ],
      },
      {
        when: pre({ courtReady: 'slumber' }),
        lines: [
          'Five down. Reverie is in the bell tower. Sweet dreams first — sleepy bubbles, a stampede of sheep.',
          'Then the dream sours. Hands come up out of the floor. Do not stand still in a nightmare. Nobody should.',
          'Old Needle is drowsy here. I keep tapping him. Tap yours.',
        ],
      },
      {
        when: pre({ flag: 'barnaby-slumber' }),
        lines: [
          'Keep moving in the feather streets. Stand still and you yawn. Yawn and you sit down. Sit down and, well.',
          'The Lake of Nod fishes with any rod. The fish are half asleep. So, after a while, are you.',
          'That bell tower rings the lullaby. Every hour. Plug your ears with something. Not feathers. Feathers tickle.',
        ],
      },
      first('slumber', [
        'The Slumber Court. Shh. Feather-bed streets, lamps turned low. This is where the becalmed are laid down.',
        'Every bed in every house — someone who fell behind on their breath. Asleep, barely breathing, being counted.',
        'Prince Reverie keeps it. The nurses count the breaths. The breaths go up the spire in bottles.',
        'Mind the sheep. They are dreams. They are surprisingly solid when they run you over.',
      ]),
    ],

    // ── The Fable Court ─────────────────────────────────────────────
    fable: [
      ARC_WIND,
      ARC_TETHER,
      NUDGE_LAUNCH,
      { when: silk(4), lines: [
        'The censors\' bonfire is out. They are reading the banned books aloud in the square. One a night.',
        'Somebody wrote a story about a balloonist. It ends badly. I have asked them to change it. They will not.',
      ] },
      lungNudge([
        'The pop-up houses have all opened at once. Every page standing up. Legend says the books can feel the wind.',
        'The dragon in the tower woke and breathed — just breathed, for the joy of it. Nobody minded the singeing.',
      ]),
      {
        when: pre({ prince: 'legend' }),
        lines: [
          'Legend is down! The story prince. He wrote what Highspire was allowed to say, and burned the rest.',
          'The castle moat fishes now — wishing carp and a bard bass that hums. Any rod will do it.',
          'The censors are standing round their bonfire not knowing what to do with their hands. Give them a book.',
        ],
      },
      {
        when: pre({ courtReady: 'fable' }),
        lines: [
          'Five champions down. Legend is in his great book. Once upon a time — every page turned is a new attack.',
          'Then the book slams shut, and everything in it jumps out. Every character at once. Read ahead if you can.',
          'Old Needle does not care for stories. He likes numbers. He says this court is full of lies. It is.',
        ],
      },
      {
        when: pre({ flag: 'barnaby-fable' }),
        lines: [
          'The houses here are pop-up books. Mind the pages when they fold. They fold quickly and they fold hard.',
          'The giant\'s boot is real. Nobody knows where the rest of the giant is. Nobody wants to find out.',
          'The censors burn a story every evening. Any story that mentions breathing freely. They burn a lot.',
        ],
      },
      first('fable', [
        'The Fable Court. Houses that are books, a beanstalk into the cloud, a dragon chained in a tower. Storybook.',
        'Prince Legend keeps it. He decides which stories are true. The rest go on the censors\' bonfire.',
        'There used to be a story about a balloon that flew over the Lung. It is not allowed any more. I miss it.',
        'Five champions. Each one plays a story. Know your fairy tales; they know theirs.',
      ]),
    ],

    // ── The Orbit Court ─────────────────────────────────────────────
    orbit: [
      ARC_WIND,
      ARC_TETHER,
      NUDGE_LAUNCH,
      { when: silk(4), lines: [
        'The islets have stopped circling the lodestone so fast. They are drifting, slowly, like boats at anchor.',
        'I took the Dandelion round the orrery. The islets went past beneath me like a clock with the lid off.',
      ] },
      lungNudge([
        'The lodestone moon is wobbling. All that breath in the air is pushing at it. Perigee is holding on.',
        'Up! The Lung! Old Needle keeps swinging between the summit and the lodestone. Summit first, Needle.',
      ]),
      {
        when: pre({ prince: 'perigee' }),
        lines: [
          'Perigee is down. The gravity prince. He held the debtors down — literally. Heavier the more they owed.',
          'The moonpool fishes now — orbit goby, tidal moonfish. It is a ball of water floating in the air. Cast up.',
          'People here are bouncing. Not jumping. Bouncing. They have not been light in years. Let them.',
        ],
      },
      {
        when: pre({ courtReady: 'orbit' }),
        lines: [
          'Five champions down. Perigee waits in the hub of the orrery. Moons circle him; wells pull you in.',
          'Then down turns from wall to wall. Watch which way your feet want to go and do not argue with them.',
          'Old Needle is useless here. He reads the height off whichever islet is under us. He gets very dizzy.',
        ],
      },
      {
        when: pre({ flag: 'barnaby-orbit' }),
        lines: [
          'The ring-streets move. Wait for the tether bridge to line up before you cross. It always comes round.',
          'Gravity tilts near the lodestone. If you feel heavy, walk away from the black moon. If light, enjoy it.',
          'The moonpool is a ball of water hanging in the air. Fish swim round and round in it. So does your line.',
        ],
      },
      first('orbit', [
        'The Orbit Court! Brass islets circling a black lodestone moon, chained together. An orrery you live in.',
        'Prince Perigee keeps it. The more a house owes, the heavier he makes it. Debtors here can barely stand.',
        'Old Needle hates it. Every islet is a different height. He spins round and round. Poor Needle.',
        'Five champions. Mind the moons. They do not stop for anyone.',
      ]),
    ],

    // ── The Stormeye Court ──────────────────────────────────────────
    stormeye: [
      ARC_WIND,
      ARC_TETHER,
      NUDGE_LAUNCH,
      { when: silk(4), lines: [
        'The storm has broken up. There is sky over Stormeye. Blue sky. People are standing on the walls staring at it.',
        'The lightning rods are full of nesting gulls now. Moll Gannet came up to count them. Forty-one.',
      ] },
      lungNudge([
        'The stormwall is thinning. The storm was spun out of stolen breath, Squall says. Now it is all going home.',
        'Every time a bottle breaks up in the Lung the storm loses a cloud. Keep breaking them.',
      ]),
      {
        when: pre({ prince: 'squall' }),
        lines: [
          'Squall is down! The storm prince. He kept the storm turning round this town so nobody could leave unmetered.',
          'The cisterns fish now — squall shad, thunderhead gar, a hailstone crab. Any rod; mind the lightning.',
          'The storm still turns. It is the King\'s, not Squall\'s. But the eye has stopped closing on people.',
        ],
      },
      {
        when: pre({ courtReady: 'stormeye' }),
        lines: [
          'Five champions down. Squall is in the barometer tower. Gathering clouds first — rain bands, delayed forks.',
          'Then the eye closes. The wall comes in and tornadoes walk across the yard. Keep to the calm, however small.',
          'Old Needle has been pinned to STORMY since we came through the gate. He does not exaggerate.',
        ],
      },
      {
        when: pre({ flag: 'barnaby-stormeye' }),
        lines: [
          'Count between the flash and the thunder. Every count is a few hundred feet. Old Needle taught me that.',
          'Stay off the walls when the lightning gathers. It strikes the highest thing, and the walls are high.',
          'The cisterns fish well. Storm fish are fat and angry. Hester will bake them in a fury.',
        ],
      },
      first('stormeye', [
        'The Stormeye Court. A walled town in the calm eye of a storm that never ends. Hear that? That is the wall.',
        'Prince Squall keeps it. The storm goes round and round. You only leave by his gate, past his meters.',
        'Old Needle says the pressure here would flatten a pancake. A pancake. He has a turn of phrase.',
        'Five champions. All weather. Bring a hat. Bring two.',
      ]),
    ],

    // ── The Starfall Court ──────────────────────────────────────────
    starfall: [
      ARC_WIND,
      ARC_TETHER,
      NUDGE_LAUNCH,
      { when: silk(4), lines: [
        'It is still night up here. But the telescopes point at whatever people like now, not at debts.',
        'I flew the Dandelion up here at midnight. Above the observatory. The stars were close enough to dent.',
      ] },
      lungNudge([
        'The door. The Lung. Look at it — the sails are turning backwards. It is breathing OUT. Come on!',
        'Old Needle has gone right off the top of his dial. I have never seen him so happy.',
      ]),
      {
        when: pre(princes(6)),
        lines: [
          'All six! The Lung\'s door at the peak is open. You can hear the bellows from here. In. Out. In.',
          'Three halls: bellows that blow and draw, a bottling floor of breath on belts, a gallery of turning vanes.',
          'Then him, in the hub of his sails. The bottles are in there. Mine are in there. Go carefully.',
        ],
      },
      {
        when: pre({ prince: 'nova' }),
        lines: [
          'Nova is down. The star prince. He read every debtor\'s name off the sky and wrote it in the ledger of stars.',
          'The starpool fishes now — comet minnows, nebula rays, meteor perch. Skyline rod only; the rest fray.',
          'The Lung door is at the peak. Sealed six ways. You have one more broken.',
        ],
      },
      {
        when: pre({ courtReady: 'starfall' }),
        lines: [
          'Five champions down. Nova waits at the great telescope. Starlight first — constellation lines snapping shut.',
          'Then he swells. Red and huge, his corona burning everything near. Keep your distance and keep moving.',
          'Old Needle is at the top of his dial and still climbing. I did not know he could do that.',
        ],
      },
      {
        when: pre({ flag: 'barnaby-starfall' }),
        lines: [
          'It is always night up here. The cloud is below us. The stars are so close you could hook one. Some do.',
          'The starpool wants a skyline rod. Anything else frays to light the moment it touches.',
          'The door at the very top is the Lung. Six seals. Not yet. Not for a long while yet.',
        ],
      },
      first('starfall', [
        'Starfall. The summit, above the cloud, in endless night. Observatories, telescopes, fallen-star craters.',
        'Prince Nova keeps it. His astronomers read the sky for the King. Every star a ledger line.',
        'And up there — that windmill on the peak, with sails bigger than ships. That is the Lung. His palace.',
        'The Dandelion\'s bottles went in there eleven years ago. I have never been allowed to follow.',
      ]),
    ],

    // ── The Lung ────────────────────────────────────────────────────
    lung: [
      ARC_WIND,
      ARC_FILL,
      ARC_TETHER,
      NUDGE_LAUNCH,
      { when: silk(4), lines: [
        'The bottling floor is empty. Every shelf. The belts still run, carrying nothing. It is a beautiful nothing.',
        'The sails turn the other way now. The Lung breathes out. All day. The whole isle feels it, coming down.',
      ] },
      {
        when: pre(princes(6)),
        lines: [
          'The Lung. Listen — the bellows. In. Out. That is everyone\'s breath, going in and never coming out.',
          'The bellows hall blows and draws on a rhythm. The bottling floor runs on belts. The vanes are blades.',
          'Walk the markers. Caught, you wake at the last one, out of breath. Ironic. I know.',
          'Old Needle is very quiet. He knows this place. He has been pointing at it for eleven years.',
        ],
      },
      {
        when: { not: KING },
        lines: [
          'How did you get in here? — No. Do not tell me. Old Needle is nervous enough already.',
          'Keep moving. Keep to the markers. Do not breathe more than you have to. It counts in here. Everything counts.',
        ],
      },
    ],
  },

  general: [
    { when: silk(4), lines: [
      'I have a balloon again. People keep looking up. I keep looking down at them. It is a fair trade.',
      'Nine more isles with nine more crowns, they say. I might go and look at some of them. From above.',
      'If you sail on, take a breath of Highspire with you. Free. Unbottled. Nobody counting. Best kind.',
    ] },
    { when: { all: [KING, { not: silk(4) }] }, lines: [
      'King Aerion is down. The Lung is breathing out. The becalmed are waking up all over the isle.',
      'The boatwright can fit an Uber-upgrade if you ever pull one off a sea beast. The Skyray drops one.',
      'I am a little lost. Eleven years of being angry at a balloon in a bottle. It is very quiet, not being angry.',
    ] },
    { when: princes(6), lines: [
      'All six princes. The door to the Lung on the Starfall summit is open. Three halls, three wardens, then him.',
      'Take meals from the Rising Loaf. Take your best charms. Breathe while you can.',
      'Old Needle has been pointing straight up for three days. He is very sure of himself.',
    ] },
    { when: princes(5), lines: [
      'Five princes! They say the King has started metering his own courtiers. He cannot stop counting.',
      'Charms last forever, meals last one fight. Three charms at once. Pick the ones that get on.',
      'One court left. Then the door on the summit opens.',
    ] },
    { when: princes(4), lines: [
      'Four courts free! Ada says half her meters have come back to the House unworn. Half!',
      'Have you spent your Orbs? G opens the gene tree. Grow something. Up, preferably.',
      'Old Needle reads two hundred feet higher than yesterday, standing in the same place. He is just pleased.',
    ] },
    { when: princes(3), lines: [
      'Three courts down! Half the isle! People are going up the Turns breathing normally. Normally!',
      'Have you a boat yet? Hob on the quay builds them. You will want one when the King is done.',
      'Ada Bellweather at the Meter House thinks the meters run fast. She is a careful woman. Hear her out.',
    ] },
    { when: princes(2), lines: [
      'Two princes! The King knows your face now. He has a meter with your name on it, I would bet.',
      'Quests pay mostly in Orbs — those lights. Every quest on Highspire ends with a fight. Every one.',
      'If one court is too hard, try another and come back. The roads all go round. So does the wind.',
    ] },
    { when: princes(1), lines: [
      'One prince down! Every prince drops something of theirs — an artifact. You can wear one at a time.',
      'And a key. Keys open things. Not bottles; bottles you just break. Different skill entirely.',
      'Galeward is gentlest. Starfall is hardest — leave it. The rest sit somewhere in between, like weather.',
    ] },
    {
      lines: [
        'Six courts, six princes, and one King at the top of a needle. Start with Galeward, up the Hundred Turns.',
        'Press E near anyone to talk. Near water with a rod, E casts. Near a counter, E opens it.',
        'TAB is your pack — charms go on there. G is your gene tree; Orbs grow it. M is the isle map.',
        'Fish off the Gull Mole in Windlass. Fen sells rods. Hester at the Rising Loaf bakes what you catch.',
        'Each court has its own water — a cloud edge, a lake, a moat, a moonpool, a cistern and a starpool.',
        'Driftwood for sea and ponds. The cloud edge and the starpool want a skyline rod. Nothing else will do.',
        'Waystones! Touch one in every court and the map lets you jump between them. My knees thank you.',
        'Watch the wind. It blows you about out here, and it blows shots about too. Old Needle always knows first.',
        'The lift is cargo only. People go up the Turns. A hundred turns. I counted. Old Needle counted higher.',
        'Above the cloud line every breath is metered. Fall behind and they cork you. I will not say more. Yet.',
        'Lose a fight and you wake where you stood, a bit out of breath. Highspire is used to that.',
      ],
    },
  ],
};
