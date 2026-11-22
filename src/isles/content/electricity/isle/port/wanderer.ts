import type { Cond, Talk, WandererDef } from '../../../../IslesTypes';

/**
 * Wren Filament — Voltreach's wanderer, and the last lamplighter. The other four were earthed in
 * one night twelve years ago; Wren was never caught, because nobody on the isle can run a roof like
 * a lamplighter. She carries a lit oil lantern quite openly (contraband, and she is very proud of
 * it), her lamplighter's pole with its hook and snuffer, and a hand-cranked radio on which she
 * listens to the pirate broadcasts of "Radio Candle". She is quick, cheerful, rude about the Grid
 * and kind about everybody else.
 *
 * She is the isle's narrator: the tutorial nudges (the Brownout Bell, the Outer Sea, charged and
 * coolant and quantum fishing, the insulated rod), gossip about every prince, a reaction to each
 * court freed — and her own story, which only moves once the Empress falls. The Grid is cut; the
 * Brownout Bell is rung one last time in Terminus and never again; the earthed lamplighters come
 * down from the Treadmill Galleries; and one night Wren lights every street lamp on the isle by
 * hand, from the Crown Coil down to the lighthouse, with the whole isle walking behind her.
 *
 * Blocks are listed most specific first. Once the Empress falls the arc is a chain of flags
 * (`wren-lamp-1` … `wren-lamp-4`) and each link holds on its own, so the next step always plays
 * next. Steps 2 and 4 play only in Terminus.
 */

const EMPRESS: Cond = { monarch: 'ohmrine' };
/** True only before the Empress falls — keeps the old lines out of the rotation once she is down. */
const pre = (c: Cond): Cond => ({ all: [c, { not: EMPRESS }] });
const princes = (count: number): Cond => ({ princesOfIsle: 'electricity', count });
const lamp = (n: number): Cond => ({ flag: `wren-lamp-${n}` });
const between = (a: number, b: number): Cond => ({ all: [lamp(a), { not: lamp(b) }] });
/** The first time she is met in an area (sets that area's flag). */
const first = (flag: string, lines: string[]): Talk => ({ when: { all: [{ not: { flag } }, { not: EMPRESS }] }, sets: flag, lines });

// ── The lamp arc (after the Empress) ────────────────────────────────

/** Step 1 — anywhere: the Grid is cut. Plays the first time she is spoken to after the Empress. */
const ARC_CUT: Talk = {
  when: { all: [EMPRESS, { not: lamp(1) }] },
  sets: 'wren-lamp-1',
  lines: [
    'Listen. Go on, listen. — Nothing. No hum. The wires are dead from the Coil to the sea. She is DOWN.',
    'Radio Candle has been playing the same song for an hour. I think whoever runs it is crying on the crank.',
    'Every house on Voltreach is dark tonight, and nobody is frightened of it. Look at them. Out in the street.',
    'And I am the only one on the isle with a light. Well. That will not do. That will not do at all.',
    'Come to Terminus. Ambrose is sitting under the Brownout Bell and I do not think he knows how to stand up.',
  ],
};

/** Step 2 — Terminus: the Brownout Bell, rung one last time. */
const ARC_BELL: Talk = {
  when: between(1, 2),
  sets: 'wren-lamp-2',
  lines: [
    'Ambrose. — Ambrose, it is Wren. Up you get. One more. Not for her. For the Grid going out. A long one.',
    '...Listen to it. All the way out over the Breakers. Every house on the shore with its door open, listening.',
    'Forty years that Bell meant "you are switched off". Tonight it means "she is". Then never again.',
    'He asked me to tie the rope up out of reach. I used a lamplighter\'s knot. Nobody can undo those.',
    'Every lamp on this isle is still standing, cold. Tam Wickersley trimmed his round the night they took him.',
  ],
};

/** Step 3 — anywhere: the candles come out, and the lamplighters come home. */
const ARC_CANDLES: Talk = {
  when: between(2, 3),
  sets: 'wren-lamp-3',
  lines: [
    'You will not believe this. People keep coming up to me with candles. Hidden ones. In socks, in loaves.',
    'Ottoline had a box of eleven years\' worth under her counter. Nan Wickersley had a match up her sleeve.',
    'And the earthed are coming down from the Galleries. Slowly. Their legs still think they are cranking.',
    'Three of the lamplighters are alive. Three! Old Corrie and the Fenwick brothers. Not Tam. Not Tam.',
    'They cannot climb yet. So I am going to do the round myself. Every lamp on Voltreach. One night. Come.',
  ],
};

/** Step 4 — Terminus: the night of the lamps, told at the end of it. */
const ARC_ROUND: Talk = {
  when: between(3, 4),
  sets: 'wren-lamp-4',
  lines: [
    'We started at the foot of the Coil at dusk. Corrie in a wheelbarrow, pointing. "That one. Mind the hood."',
    'Down through the Superposition — the lamps there were lit AND not, I will not explain it — and the Dynamo.',
    'By the Lodestar there were two hundred people behind me. By the Halflife, a thousand, and their lead aprons.',
    'And every lamp caught, first go. Twelve years cold. Every wick still straight. Lamplighters cut them to last.',
    'Nan lit the last one on the Row. Then the lighthouse — Fenna let me, full oil, full lens. Look. Look at it.',
    '...That is the whole isle lit. By hand. With fire. Nobody metered a single flame of it.',
  ],
};

/** Step 5 — after. */
const ARC_HOME: Talk = {
  when: lamp(4),
  lines: [
    'I am going to be a lamplighter. Properly. With a round and a wage and a hall with the boards off the windows.',
    'Corrie is teaching the Pennick girl. Wynn. She climbs like a cat. She asked if she could keep the snuffer.',
    'Radio Candle has stopped broadcasting. I asked why. "There is no need to tell anybody where the light is."',
    'If you sail on — out past the Breakers to the next isle — take a lantern. I have spares. Openly. Ha.',
  ],
};

/** In every other area, after the Grid is cut and before the Bell: the pull to Terminus. */
const nudgeBell = (lines: string[]): Talk => ({ when: between(1, 2), lines });

/** Anywhere but Terminus, once the candles are out and before the round is done. */
const NUDGE_ROUND: Talk = {
  when: between(3, 4),
  lines: [
    'Tonight. Every lamp on the isle, from the Coil to the sea. I end in Terminus, at the lighthouse.',
    'Meet me there when it is done? I want to tell somebody who was not walking behind me. Terminus, the quay.',
  ],
};

export const WREN: WandererDef = {
  id: 'electricity-wanderer-wren',
  name: 'Wren Filament',
  title: 'The Last Lamplighter',
  look: {
    body: 0xb8a090, accent: 0xffc062, hand: 0x6a4a2a, hat: 'antenna',
    traits: ['lantern', 'pack', 'scarf'], size: 0.96, eye: 0xffd890,
  },

  byArea: {
    // ── Terminus ────────────────────────────────────────────────────
    terminus: [
      ARC_CUT, ARC_BELL, ARC_CANDLES, ARC_ROUND, ARC_HOME,
      {
        when: pre(princes(6)),
        lines: [
          'Six princes. The Crown Coil\'s door in the Superposition is open. The wires are humming in a minor key.',
          'Eat at the Element before you go up. It is three halls and three wardens, then her, at the very top.',
          'Radio Candle says the Coil is drinking so hard the Empress has started cranking it herself. Ha!',
        ],
      },
      {
        when: pre(princes(3)),
        lines: [
          'Half the courts! The lights did not dip at the Bell last night. Not on the Row, not anywhere. Ambrose wept.',
          'The Linesmen walk in pairs now. In PAIRS. Because people look at them. That is all — they just look.',
          'Gus has insulated rods back in. The waters up in the courts are live. Do not fish them with your bare line.',
        ],
      },
      {
        when: pre({ questDone: 'terminus-last-candle' }),
        lines: [
          'Nan lit a candle in her window and a Snuffer came and went away with frost running off his face. Ha!',
          'Tam was the best of us. He taught me the knot for the ladder. I still tie it every night. Out of spite.',
        ],
      },
      {
        when: pre({ questDone: 'terminus-short-current' }),
        lines: [
          'Cutwell, sent up the Cableway with a bent pole! Radio Candle had it on the air within the hour.',
          'Touch the waystone by the landing if you have not. M opens the isle map, and you can jump between them.',
          'Gus sells the insulated rod at Varnish & Line. Dear. You will need it for the waters up the roads.',
        ],
      },
      {
        when: pre({ flag: 'wren-met' }),
        lines: [
          'Still in Terminus? Good town. Wet, cranky, and frightened of a bell. Most towns are frightened of something.',
          'North up the Cableway is the Dynamo. West along the Row is the Bounce. East is the Halflife. Go and look.',
          'Fish off the pier or the jetty. Herring for learning. Gus will sell you a rod; your old one does the sea.',
          'Delphine at the Element bakes what you catch. A meal lasts one fight. A charm lasts for ever. Both help.',
        ],
      },
      first('wren-met', [
        'Do not look at the lantern like that. Yes, it is lit. Yes, it is fire. Yes, it is illegal. Lovely, no?',
        'Wren Filament. Last lamplighter on Voltreach. They earthed the others. They never caught me. Roofs, see.',
        'You came over the Breakers? Then you have earned a sit-down. That was the Outer Sea. It does not lie down.',
        'Press E near anyone to talk. Marlo on the quay first; then the Meter House. Everybody gets chalked.',
        'And when you hear a bell, stand still and watch the windows. That is the Draw. You will see what I mean.',
      ]),
    ],

    // ── The Dynamo Court ────────────────────────────────────────────
    dynamo: [
      ARC_CUT, ARC_CANDLES, NUDGE_ROUND,
      { when: lamp(4), lines: [
        'The treadwheels have stopped. Children are running round inside them, for fun, going nowhere. Wonderful.',
        'The mill race still turns the turbines. Into nothing. Volt says they will make it light the town. Ours.',
      ] },
      nudgeBell([
        'The turbine halls are silent. Volt sat on the dynamo housing all night like a boy on a wall.',
        'Terminus, now — the Bell. Ambrose has to ring it once more and he will not do it without me.',
      ]),
      {
        when: pre({ prince: 'volt' }),
        lines: [
          'You beat Volt. In his own generator hall. He used to call the Draw "the family business". It was.',
          'The treadwheels are running half speed. Nobody told them to. People just... slowed down. Lovely.',
          'The mill race is fishable — turbine trout, spark minnows. Insulated rod, or you will light up like me.',
        ],
      },
      {
        when: pre({ courtReady: 'dynamo' }),
        lines: [
          'Five champions down. Volt has to come out. First he dashes about planting pylons and stringing live wire.',
          'Do not stand between two of his pylons. Then he gets into the great dynamo and spins it: spokes of arc.',
          'Walk round with the spokes, not across them. You will feel which way they go in your teeth.',
        ],
      },
      {
        when: pre({ flag: 'wren-dynamo' }),
        lines: [
          'Every champion here plays a rule — a treadwheel, a storm, a brownout. The fight card says which.',
          'Lose? You wake where you stood, a bit singed. Win and the court pays. Coin buys charms in Terminus.',
          'The lightning rods here do not just catch the storm — they choose who it hits. Stand near one.',
        ],
      },
      first('wren-dynamo', [
        'The Dynamo Court. Turbine halls on the storm river, a forest of rods, and treadwheels the size of chapels.',
        'Prince Volt keeps it. Every turn cranked on the south shore goes through his hall on the way up.',
        'Listen to the wheels. Every one of them has somebody inside, walking. Walking for the Grid.',
        'Five champions guard it. Beat them and Volt has to come out of his generator hall himself.',
      ]),
    ],

    // ── The Circuit Court ───────────────────────────────────────────
    circuit: [
      ARC_CUT, ARC_CANDLES, NUDGE_ROUND,
      { when: lamp(4), lines: [
        'We lit the copper-trace streets by hand. The lamps here are tiny — resistor-striped, every one. Byte helped.',
        'The automatons have stopped winding. One of them followed me round the whole court holding my lantern.',
      ] },
      nudgeBell([
        'The Tabulator has stopped reckoning. The clerks are standing round it waiting for a number. It will not come.',
        'Come to Terminus. The Bell. One last time. Ambrose is waiting.',
      ]),
      {
        when: pre({ prince: 'byte' }),
        lines: [
          'You beat Byte! The Tabulator printed one card when he fell, and it just said ERROR. Framed already.',
          'The sump is fishable — solder smelt, diode darts, relay rays. Oil, so an iron rod or better.',
          'Ottoline says prices have gone strange. Good strange. Byte\'s machine set every price on the isle.',
        ],
      },
      {
        when: pre({ courtReady: 'circuit' }),
        lines: [
          'Byte is next. He turns the floor into bits — tiles flipping on and off in patterns. Read the pattern.',
          'Then he overclocks: faster and faster, and little drones that copy him. Kill the copies, not the prince.',
          'Mind the copper. It is not a floor. It is a board, and you are a component.',
        ],
      },
      {
        when: pre({ flag: 'wren-circuit' }),
        lines: [
          'The streets are traces. Pulses run along them. Stand on the board, not on the copper.',
          'The automatons march for whoever struck them last. Strike them first. Manners do not apply to clockwork.',
          'The sump fish are oily. Iron rod or better. Insulated works too. Everything works with insulated.',
        ],
      },
      first('wren-circuit', [
        'The Circuit Court. A whole town laid out like a board. That big chapel thing is the Tabulator.',
        'It reckons every household\'s Draw on the isle. Punch-cards. Millions. It decides who is short.',
        'Prince Byte runs it. Clever. Polite. Never once looked up from a card in his life.',
        'Five champions, then Byte. Mind the traces. I lost a boot-heel on one.',
      ]),
    ],

    // ── The Bounce Court ────────────────────────────────────────────
    bounce: [
      ARC_CUT, ARC_CANDLES, NUDGE_ROUND,
      { when: lamp(4), lines: [
        'The lamps here are on rubber posts. I lit one and it bounced. Took me three goes. The crowd cheered every go.',
        'Sprocket wound up every toy in the toy works and let them march down the street after us. Good boy.',
      ] },
      nudgeBell([
        'The vulcanizing works let their fires out. Real fires. Sulphur. Nobody has stopped smelling it.',
        'Terminus — the Bell. Come on. It will not ring itself. Well, it might. Not here though.',
      ]),
      {
        when: pre({ prince: 'sprocket' }),
        lines: [
          'You beat Sprocket! The toy prince. He cried, I heard. Clockwork tears. Oil, mostly.',
          'The latex pool is fishable — rubber guppies, bounce bass. Syrup, so briarwood or better. Insulated does it.',
          'Marlo has rubber fenders on the slip now. Boats come back from the Breakers bouncing.',
        ],
      },
      {
        when: pre({ courtReady: 'bounce' }),
        lines: [
          'Sprocket is a clockwork toy on a pogo spring. He bounces in arcs and stamps down. Watch the shadow.',
          'Then he stretches. Rubber arms right across the room — whips, grabs, flinging you like a catapult.',
          'Do not stand still when he winds back. That is the part where he lets go.',
        ],
      },
      {
        when: pre({ flag: 'wren-bounce' }),
        lines: [
          'The trampolines throw you. Airborne, nothing can hit you — but you cannot steer either. Choose your launch.',
          'The balloons pop with a shove. Some have tacks in. Look for the ones that sag, they are heavy.',
          'And the superball. Do not chase it. It gets faster every wall. Let it come to you.',
        ],
      },
      first('wren-bounce', [
        'The Bounce Court! Rubber trees tapped in rows, a vulcanizing works, and streets that throw you off.',
        'Prince Sprocket keeps it. Sweet, they say. Clockwork. He meters the Draw in bounces, somehow.',
        'Mind the trampoline square. Mind everything. Everything here springs.',
        'Five champions, then the toy works. Bring a sense of humour and a good pair of boots.',
      ]),
    ],

    // ── The Lodestar Court ──────────────────────────────────────────
    lodestar: [
      ARC_CUT, ARC_CANDLES, NUDGE_ROUND,
      { when: lamp(4), lines: [
        'Under the aurora with a flame. The two lights do not mix — green above, yellow below. Polar watched for hours.',
        'Every compass on the isle points north now. Rhosyn ran the Long Patience onto a sandbank. She laughed.',
      ] },
      nudgeBell([
        'The hanging boulders came down when the Grid went. Gently, mostly. One fell on the observatory roof.',
        'Terminus, please. The Bell. I need a hand with Ambrose. He is heavier than he looks.',
      ]),
      {
        when: pre({ prince: 'polar' }),
        lines: [
          'You beat Polar! The compasses on the quay all swung back north. Rhosyn nearly ran aground.',
          'The aurora tarn is fishable — loach, compass pike, aurora char. Skyline rod, or the insulated one.',
          'The iron filings here have lain down flat for the first time in years. Like a cat. I patted them.',
        ],
      },
      {
        when: pre({ courtReady: 'lodestar' }),
        lines: [
          'Polar is North first: everything slides in toward him. Iron plates and shot. Lean out, like a wind.',
          'Then South: he throws it all away from him. Rings of repulse and flung iron. Hug the walls, not him.',
          'Never wear anything iron to see Polar. I learned that with a belt buckle.',
        ],
      },
      {
        when: pre({ flag: 'wren-lodestar' }),
        lines: [
          'The lodestone pulls, then flips and flings. Count the pulls. It always flips on the same count.',
          'The aurora curtains shield you and mark you at once. Stand in one when they shoot, not when they aim.',
          'The tarn fishes aurora char. Skyline rod, or the insulated one. My rod would melt.',
        ],
      },
      first('wren-lodestar', [
        'The Lodestar Court. An iron crag round a great lodestone, and the aurora always overhead. Pretty, no?',
        'Every compass on the isle points here instead of north. Sailors hate it. So does north.',
        'Prince Polar runs it. Two moods, they say: everything to him, then everything away. Nothing between.',
        'Five champions. Mind the hanging boulders. They hang until they do not.',
      ]),
    ],

    // ── The Halflife Court ──────────────────────────────────────────
    halflife: [
      ARC_CUT, ARC_CANDLES, NUDGE_ROUND,
      { when: lamp(4), lines: [
        'We lit the lamps here in lead aprons. The pitch-blende glows so green the flames looked orange as oranges.',
        'Isotope walked the whole round with us. Both halves of him. He held the ladder. Twice.',
      ] },
      nudgeBell([
        'The reactor dome is cooling. The cooling pond has gone a softer green. The miners are taking the day off.',
        'Terminus — the Bell. Then I have a plan. A big one. Lamps.',
      ]),
      {
        when: pre({ prince: 'isotope' }),
        lines: [
          'You beat Isotope! The miners took off their lead aprons and threw them in the pond. Then fished them out.',
          'The cooling pond is fishable — glow gar, isotope koi, halflife carp. Insulated rod. Gloves too, honestly.',
          'Delphine glazes tuna with the gar. It glows in the dark. I do not ask what it does to you.',
        ],
      },
      {
        when: pre({ courtReady: 'halflife' }),
        lines: [
          'Isotope lobs canisters first. Hot puddles where they land. Do not fight in the puddles. Obviously.',
          'Then his core goes critical: a ring of heat swelling out, and slag coming down from the ceiling.',
          'Outrun the ring, or get inside it close to him. Either. Not the edge. Never the edge.',
        ],
      },
      {
        when: pre({ flag: 'wren-halflife' }),
        lines: [
          'The isotope rods halve their burn every few seconds. Wait them out, or pick one up and throw it. Ow.',
          'The lead screens slide if you strike them. Keep one between you and the vent sweep.',
          'Coolant fishing — insulated rod. The fish glow. The fishers glow. I glow, a bit, after visiting.',
        ],
      },
      first('wren-halflife', [
        'The Halflife Court. Pitch-blende pits, lead roofs, decay clocks on every corner. Mind the green.',
        'Prince Isotope keeps it. The reactor dome is his. It makes more current than all the treadwheels.',
        'And the miners crank for it anyway, because "the Draw is the Draw". Wear a lead apron, I mean it.',
        'Five champions, then the dome. Take the long way round the cooling pond.',
      ]),
    ],

    // ── The Superposition Court ─────────────────────────────────────
    superposition: [
      ARC_CUT, ARC_CANDLES, NUDGE_ROUND,
      { when: lamp(4), lines: [
        'The lamps here were lit and not lit at once until somebody looked. Everybody looked. They are lit now.',
        'Both carried my ladder. Both of him. One of him was carrying it the wrong way. Neither was sorry.',
      ] },
      nudgeBell([
        'The houses have stopped flickering. They have picked a state. Most of them picked the nicer one.',
        'Terminus. The Bell. Come on. Then lamps. Lots of them.',
      ]),
      {
        when: pre({ prince: 'both' }),
        lines: [
          'You beat Both! Both of him. Or one. He would not say which, as he fell. He fell twice.',
          'The quantum well is fishable — sprats, entangled eels, perch that are and are not. Insulated rod.',
          'And the door. The Crown Coil\'s door, north. When all six fall, it opens. Up, not down.',
        ],
      },
      {
        when: pre({ courtReady: 'superposition' }),
        lines: [
          'Both stands in two places at once. Only one is real, and a look tells which. Look before you hit.',
          'Then every attack he makes is a cloud of maybes, and it collapses to one strike. Watch where it settles.',
          'He talks to himself. Both halves answer. Do not join in. It only encourages them.',
        ],
      },
      {
        when: pre({ flag: 'wren-superposition' }),
        lines: [
          'The boxes are a cat and a vial until opened. Open them where the foe cannot see. Then it is whichever.',
          'The street is only there while somebody watches it. Walk it with a friend, or with a nervous eye.',
          'The well fishes quantum. Insulated rod. The fish may not be there when you land them. Most are.',
        ],
      },
      first('wren-superposition', [
        'The Superposition Court. A town that is two towns at once. That house there — it is a bakery and a ruin.',
        'Prince Both governs. He is two people or one, depending who asks. I have stopped asking.',
        'And north is the Crown Coil\'s door. Her tower. Six princes and it opens. Not before.',
        'Five champions, then Both. Mind the sealed boxes. Mind everything you cannot see.',
      ]),
    ],

    // ── The Crown Coil ──────────────────────────────────────────────
    crowncoil: [
      ARC_CUT, ARC_CANDLES, NUDGE_ROUND,
      { when: lamp(4), lines: [
        'The Treadmill Galleries are empty. Every belt stopped. We lit the first lamp of the round right here.',
        'It is just a tower now. A tall copper ugly tower. The storm still hits it. It goes nowhere.',
      ] },
      nudgeBell([
        'The Galleries are emptying. Slowly. People walking down the belts, which are not moving. Odd sight.',
        'Terminus. The Bell. I will meet you there. Bring Ambrose a coat.',
      ]),
      {
        when: pre(princes(6)),
        lines: [
          'The Crown Coil. Listen — the belts. The Treadmill Galleries are first. Every earthed soul on the isle.',
          'Then the Capacitor Banks — jars tall as houses, discharging at whoever is nearest. Do not be nearest.',
          'Then the Faraday Cages. Then her. Up. Always up. She is at the very top, in the last ring.',
        ],
      },
      {
        when: { not: EMPRESS },
        lines: [
          'How did you get in here? — No, do not tell me. Keep climbing. Keep to the markers.',
          'If you see an old woman with one hand on a crank and the other on her hip, that is Corrie. Tell her Wren.',
        ],
      },
    ],
  },

  general: [
    { when: lamp(4), lines: [
      'Every lamp on the isle. By hand. I keep saying it. I will keep saying it until I am old and boring.',
      'Nine isles, they say, with nine more crowns. I hope every one of them has a lamplighter left. Or a fish.',
    ] },
    { when: { all: [EMPRESS, { not: lamp(4) }] }, lines: [
      'Empress Ohmrine is down. The Grid is cut. The meters on every door are just brass now. Pretty brass.',
      'The boatwright can fit an Uber-upgrade if you ever take one off a sea beast. The Galvaneel drops one.',
      'I keep looking up at the wires. They are just wire. Birds are sitting on them. Birds! They used to fry.',
    ] },
    { when: princes(6), lines: [
      'All six princes. The Crown Coil\'s door in the Superposition is open. Three halls, three wardens, then her.',
      'Take meals from the Element. Take your best charms. Do not touch the bars in the Faraday Cages.',
      'Radio Candle is broadcasting from somewhere on the Coil itself. Somebody up there is on our side.',
    ] },
    { when: princes(5), lines: [
      'Five princes! The Empress has started drawing the Draw twice a night, they say. The Coil is thirsty.',
      'Charms last forever, meals last one fight. Three charms at once. Pick the ones that get on.',
      'One court left. Then the door north of the Superposition opens.',
    ] },
    { when: princes(4), lines: [
      'Four courts free! The Linesmen are not coming down the Row at all now. They stay in the Meter House.',
      'Have you spent your Orbs? G opens the gene tree. That is where you grow. Grow something bright.',
      'Radio Candle played a request for you last night. Anonymous. It was me. It was a sea shanty.',
    ] },
    { when: princes(3), lines: [
      'Three courts down! Half the isle! The lights did not dip at the Bell on the whole south shore.',
      'Have you a boat yet? Marlo builds them. The Outer Sea wants a good hull, and a better nerve.',
      'Ambrose at the Bell has been reading the Draw-law by candlelight. Hear him out. He is onto something.',
    ] },
    { when: princes(2), lines: [
      'Two princes! The Empress knows your face. The Meter House has a board with your name on it. No strokes.',
      'Quests pay mostly in Orbs — those lights. Every quest on Voltreach ends with a fight. Every one.',
      'If one court is too hard, try another and come back. The roads all go round. Like wires.',
    ] },
    { when: princes(1), lines: [
      'One prince down! Every prince drops something of theirs — an artifact. You can wear one at a time.',
      'And a key. Keys open things. Not my lantern. My lantern has no lock. That is the point of it.',
      'The Dynamo is gentlest. The Superposition is hardest — leave it. The rest are somewhere in between.',
    ] },
    {
      lines: [
        'Six courts, six princes, and an Empress at the top of a copper tower. Start with the Dynamo, north.',
        'Press E near anyone to talk. Near water with a rod, E casts. Near a counter, E opens it.',
        'TAB is your pack — charms go on there. G is your gene tree; Orbs grow it. M is the isle map.',
        'Every night the Brownout Bell rings and the Grid draws every house off down the wires. Watch the windows dip.',
        'Short houses are switched off. Three times and they are earthed — taken up the Coil to crank. Forever.',
        'The courts\' waters are live: a mill race, a cooling pond, a well that is and is not. Insulated rod only.',
        'The sump wants iron. The latex pool wants briarwood. The aurora tarn wants skyline. Insulated takes all.',
        'Waystones! Touch one in every court and the map lets you jump between them. Faster than roofs, nearly.',
        'You crossed the Outer Sea to get here. Past the Breakers. Thread the trough and do not look at the swell.',
        'The Galvaneel hunts out there: strings arcs between its floats. Slip through when they gutter. Or swim.',
        'The lantern? It stays lit. A theft from the Grid. I steal one flame a night and I have never been caught.',
        'Lose a fight and you wake where you stood, a little singed. Things on Voltreach come back on. Mostly.',
      ],
    },
  ],
};
