import type { Cond, Talk, WandererDef } from '../../../../IslesTypes';

/**
 * Tansy Rue — Fangmire's wanderer. A hedge-apothecary who brews bootleg Draught in a copper kettle
 * under the mangroves and gives it away to the passed-over: the most wanted woman on the isle. She has
 * been bitten so many times she says she is now mostly venom herself. A satchel of clinking vials, a
 * mortar on a cord round her neck, and on her shoulder a mongoose called Pestle, who growls at informers
 * and has never once been wrong. She is quick, warm, unafraid, and talks to Pestle as an equal.
 *
 * She is the isle's narrator: the tutorial nudges (the Mark and the Draught, venom and blackwater fishing,
 * the antivenin rod, waystones, the Outer Sea), gossip about every prince, a reaction to each court freed —
 * and her own story, which only moves once the Matriarch falls. The Draught Houses are thrown open, but a
 * dose is still a dose. Tansy goes to the Matriarch's still in the nest and reads the true recipe off the
 * copper: the Draught was always half a cure on purpose, and the missing half is fang-honey — honey from
 * the wild bees that nest in the hollow fangs, every hive of which the Matriarch smoked out generations
 * ago. Every hive but one, hidden in a bakery in Stilthaven. The whole isle queues one last time — for a
 * cure, not a dose — and burns the ration books.
 *
 * Blocks are listed most specific first. Once the Matriarch falls, her arc is a chain of flags
 * (`tansy-cure-1` … `tansy-cure-4`) and each link holds on its own, so the next step always plays
 * next. Step 2 plays only in the Slough, step 4 only in Stilthaven.
 */

const NYXA: Cond = { monarch: 'nyxa' };
/** True only before the Matriarch falls — keeps the old lines out of the rotation once she is down. */
const pre = (c: Cond): Cond => ({ all: [c, { not: NYXA }] });
const princes = (count: number): Cond => ({ princesOfIsle: 'slime', count });
const cure = (n: number): Cond => ({ flag: `tansy-cure-${n}` });
const between = (a: number, b: number): Cond => ({ all: [cure(a), { not: cure(b) }] });

// ── The cure arc (after the Matriarch) ──────────────────────────────

/** Step 1 — anywhere: the Draught Houses are open, and a dose is still a dose. */
const ARC_OPEN: Talk = {
  when: { all: [NYXA, { not: cure(1) }] },
  sets: 'tansy-cure-1',
  lines: [
    'They have thrown the Draught Houses open. Doses on trestles, no ledger, no rope. Take one. Anybody.',
    'And next moon? A dose is still a dose. The Mark is still in every wrist. Nothing is cured. Nothing.',
    'She had a still in the nest, Pestle and I always said so. Where the Draught was brewed from her own milk.',
    'If there is a real recipe on Fangmire, it is written on that still. I am going to read it.',
    'Into the Slough, up the cast skin, to the skull. You know the way better than I do. Walk with me.',
  ],
};

/** Step 2 — the Slough: the recipe on the still, and the missing half. */
const ARC_STILL: Talk = {
  when: between(1, 2),
  sets: 'tansy-cure-2',
  lines: [
    'Here it is. Her still. Look at the coils — she scratched the recipe into the copper, as if she forgot it.',
    'Milked venom, mangrove ash, salt, river water... and a line scratched out. Scratched out hard. Pestle, light.',
    '"Honey of the hollow tooth." Fang-honey. From the wild bees that nest inside the fangs. That is the half.',
    'With it, the Draught does not hold the venom back. It draws it out. Once. A cure. Not a dose. A cure.',
    'And she smoked out every fang-hive on Fangmire, generations ago. Every one. That is why she scratched it.',
    '...Every one? Pestle. Pestle, what is that bakery in Stilthaven called?',
  ],
};

/** Step 3 — anywhere: the last hive, and a brew in the Draught House's own vats. */
const ARC_HONEY: Talk = {
  when: between(2, 3),
  sets: 'tansy-cure-3',
  lines: [
    'The Honeyed Fang. Hetty Combe\'s grandmother hid a hive in that tooth when the smoke came. The last one.',
    'Hetty knew it was precious. She did not know why. She has been putting it on buns for the passed-over.',
    'It was helping, all along. A smear of the cure on a bun. That is why Ottilie Pell\'s fingers went pink.',
    'Hetty gave me every jar. The bees made more while I brewed. I am brewing in the Draught House\'s own vats.',
    'Come to Stilthaven. The whole isle is coming. The last queue on Fangmire. Come and stand in it.',
  ],
};

/** Step 4 — Stilthaven: the last queue, and the bonfire. */
const ARC_QUEUE: Talk = {
  when: between(3, 4),
  sets: 'tansy-cure-4',
  lines: [
    'Look at it. The queue goes off the deck, down the spine, along the Mooring Walk and out to the Fang Light.',
    'Every soul on Fangmire. Not for a dose. For the cure. One cup each, once, and then never again.',
    'Agatha Vellum is reading out every name on the board, and after every name she says "cured". Every one.',
    'And when the last cup was drunk they carried the ration books onto the deck and set them alight.',
    'I am not having a cup. If you drew the venom out of me there would be nothing left but Pestle. Ha!',
    'There. That is the whole of it. Go and warm your hands. Everybody else is.',
  ],
};

/** Step 5 — after: the cure taken, the Mark just two little scars. */
const ARC_AFTER: Talk = {
  when: cure(4),
  lines: [
    'Two little scars on every wrist and nothing behind them. They will fade. Mine will not. I like mine.',
    'Hetty is teaching people to keep bees in the fangs again. There are a lot of fangs. There will be honey.',
    'Pestle has nobody to growl at. He has started growling at the gulls. The gulls deserve it.',
    'Thank you. Fangmire says it too. It says it quietly — habit — but it says it, out loud, in the open.',
  ],
};

/** In every other area, after the Draught Houses open and before the still: the pull to the Slough. */
const sloughNudge = (lines: string[]): Talk => ({ when: between(1, 2), lines });

/** Anywhere but Stilthaven, once the cure is brewing and before the last queue. */
const NUDGE_HOME: Talk = {
  when: between(3, 4),
  lines: [
    'The cure is brewing in Stilthaven. The whole isle is walking there. I want you in that queue.',
    'Back down to the stilts. I will meet you at the rope. The last rope.',
  ],
};

export const TANSY: WandererDef = {
  id: 'slime-wanderer-tansy',
  name: 'Tansy Rue',
  title: 'Hedge-Apothecary, Wanted Woman',
  look: {
    body: 0xb89a7a, accent: 0x4a6a3a, hand: 0x7a8a5a, hat: 'hood',
    traits: ['satchel', 'pack', 'scarf'], size: 0.95, eye: 0xd0f070,
  },

  byArea: {
    // ── Stilthaven ──────────────────────────────────────────────────
    stilthaven: [
      ARC_OPEN,
      { when: between(1, 2), lines: [
        'The still is in the nest, at the top of the Slough. North through the Grave Court. Pestle is pulling.',
        'Bring your best meal from the Honeyed Fang. Ha — the Honeyed Fang. I will tell you later.',
      ] },
      ARC_HONEY, ARC_QUEUE, ARC_AFTER,
      {
        when: pre(princes(6)),
        lines: [
          'Six princes. The Slough\'s door in the Grave Court is open. Her cast skin, coiled in the deepest mire.',
          'You walk it from the tail up to the head. The nest is in the skull. And her still. I would love to see it.',
          'Eat at the Honeyed Fang before you go. Take your best charms. Pestle says take him. Pestle is not going.',
        ],
      },
      {
        when: pre(princes(3)),
        lines: [
          'Half the courts! Clerk Vellum read the board last night and there were only four black lines. Four!',
          'People are queueing slower. Talking in the queue. Pestle growled at the ear-box and nobody shushed him.',
          'If you have not, fish the black meres — Umbral, the Grave pool. The antivenin rod. Strange fish there.',
        ],
      },
      {
        when: pre({ prince: 'venin' }),
        lines: [
          'Venin is down. The Fang Court\'s prince — he ran the milking sheds. No milkers came down the road today.',
          'Five more. West along the chains, east into the dark, or on up the Fen Road past the fangs.',
          'The fen up there fishes now — adder minnows, cobra catfish. Only the antivenin rod lives in that water.',
        ],
      },
      {
        when: pre({ questDone: 'stilthaven-new-moon' }),
        lines: [
          'You sent the Markwarden home with her fang in her boot. Pestle has not stopped chattering about it.',
          'Touch the waystone on the Mooring Walk if you have not. M opens the isle map; walk the roads in a blink.',
          'Saul at the Bitten Hook sells the antivenin rod. Dear. The only rod that takes venom-water or blackwater.',
        ],
      },
      {
        when: pre({ flag: 'tansy-met' }),
        lines: [
          'Still in Stilthaven? It is a good town. Wet, quiet, polite, frightened of a velvet rope. Most towns are.',
          'North up the Fen Road is the Fang Court. West along the Chain Causeway, the Shackle. East, the Dark Walk.',
          'Fish off the Gaff at the west end. Mullet for learning. Saul at the Bitten Hook will sell you a rod.',
          'Hetty at the Honeyed Fang bakes what you catch. A meal lasts one fight. A charm lasts for ever.',
        ],
      },
      {
        when: { all: [{ not: { flag: 'tansy-met' } }, { not: NYXA }] },
        sets: 'tansy-met',
        lines: [
          'Do not mind Pestle. He only growls at informers. — See? Nothing. You are not an informer. Good.',
          'Tansy Rue. Hedge-apothecary. Wanted, mostly. I brew the Draught under the mangroves and give it away.',
          'You have no Mark. Show me. — Nothing! Every wrist on this isle is bitten at a week old. Not yours.',
          'Talk to anyone — press E. Morrow on the slip first. Then go and look at the queue. Everyone does.',
          'TAB opens your pack. If anyone asks, you have never seen me. Pestle, say goodbye. — He will not.',
        ],
      },
    ],

    // ── The Fang Court ──────────────────────────────────────────────
    fang: [
      ARC_OPEN,
      sloughNudge([
        'Straight on north, through the Grave Court, to the Slough. Pestle has smelled the still from here.',
        'The milkers are letting the snakes go. Whole pits of them, out into the fen. The snakes seem confused.',
      ]),
      ARC_HONEY, NUDGE_HOME,
      { when: cure(4), lines: [
        'The milking sheds are empty. They are going to dry herbs in them. My herbs. I am a supplier now. Legal!',
        'The fangs out there — every one of them has a hive in it now, or will. Hetty is very busy.',
      ] },
      {
        when: pre({ prince: 'venin' }),
        lines: [
          'You beat Venin. In his own Milking Hall, among his racks. He milked a snake a minute, they say. For her.',
          'The venom troughs are dry. The milkers sat down on the floor of the shed and cried. Pestle helped.',
          'The fen fishes now. Adder minnows, cobra catfish — antivenin rod only. And the Charmer\'s Basket bakes.',
        ],
      },
      {
        when: { not: NYXA },
        lines: [
          'The Fang Court. The milking town. Everything she drinks, and everything you are dosed with, starts here.',
          'Venin is her eldest. Plants himself, flares his hood, rakes the room with spit. Do not stand where it lands.',
          'Those white teeth in the fen are fangs, yes. Of what, nobody knows. Something that bit the whole isle.',
          'The fen is venom-water — antivenin rod or nothing. Pestle will not go near it. Sensible animal.',
        ],
      },
    ],

    // ── The Web Court ───────────────────────────────────────────────
    web: [
      ARC_OPEN,
      sloughNudge([
        'The Slough is north and east of here — back through the Fang Court. Mind the silk on the way. Pestle hates it.',
      ]),
      ARC_HONEY, NUDGE_HOME,
      { when: cure(4), lines: [
        'The spiders are spinning for nobody now. The weavers are making sails. Silk sails! Boats will fly.',
        'They kept one thread of the Spymaster\'s map. Just one. Tied it round the old mill as a reminder.',
      ] },
      {
        when: pre({ prince: 'weft' }),
        lines: [
          'Weft is down! The Spymaster. He had a thread for every spy on the isle, strung across a map of it.',
          'They are cutting the threads one at a time. Every time one goes, somewhere a spy feels it. Ha!',
          'The silk pool fishes now. It is boggy — iron rod will do. Silkfin are lovely. Pestle tried to eat one.',
        ],
      },
      {
        when: { not: NYXA },
        lines: [
          'The silk town. Spiders as big as punts, farmed for the Moult-Tithe. Pestle is staying in my satchel.',
          'Weft is her spymaster. Spins web across the room, and plucks threads that run strikes down them.',
          'Burn his cocoon if he hides in one — they say he does, when it goes badly. Silk burns lovely.',
        ],
      },
    ],

    // ── The Shackle Court ───────────────────────────────────────────
    shackle: [
      ARC_OPEN,
      sloughNudge([
        'North to the Web, then east to the Fang Court, then north again to the Slough. Pestle has the route.',
      ]),
      ARC_HONEY, NUDGE_HOME,
      { when: cure(4), lines: [
        'The great ledger is face-down in the moat. They are using the chains to moor boats. Better use.',
        'Half the debtors here were in for owing doses. Owing doses! To her! The ledger is soup now.',
      ] },
      {
        when: pre({ prince: 'fetter' }),
        lines: [
          'You beat Fetter! The gaoler prince. The chain-gangs are walking down the causeway still in their chains.',
          'Nobody has a key. Nobody ever had a key. The smiths are cutting them off one by one. It is a long line.',
          'The chain moat fishes — a pond, driftwood rod will do. Shackle shad. Hetty uses them in her chowder.',
        ],
      },
      {
        when: { not: NYXA },
        lines: [
          'The debtors\' town. Owe a skin, owe a dose, owe a word — they chain you to the causeway till you pay.',
          'Fetter throws chains that tether you to posts. Run round the post. Do not pull against it. It pulls back.',
          'See the ledger chained to the gaol wall? The size of a door. Every debt on Fangmire. Pestle bit it once.',
        ],
      },
    ],

    // ── The Cloak Court ─────────────────────────────────────────────
    cloak: [
      ARC_OPEN,
      sloughNudge([
        'West to the Fang Court, then north through the Grave to the Slough. Pestle, stop growling, they are freed.',
      ]),
      ARC_HONEY, NUDGE_HOME,
      { when: cure(4), lines: [
        'The Hall of Letters is a library now. They are reading all the denunciations out loud. People laugh.',
        'Pestle walked through the whole town and growled at nobody. He looked lost. Then he growled at me. Fair.',
      ] },
      {
        when: pre({ prince: 'whisper' }),
        lines: [
          'Whisper is down! The informers\' prince. The masks are coming off all over the town. Small faces under them.',
          'Pestle has not stopped growling since we came in. This town is still full of them. Habit, I suppose.',
          'The cistern fishes — ink-water, iron rod. Eavesdrop eels. They come up the line listening.',
        ],
      },
      {
        when: { not: NYXA },
        lines: [
          'The Cloak Court. Every ear-trumpet in Stilthaven reports here. Pestle has never growled so much in his life.',
          'Whisper vanishes among decoys and knifes from behind. Watch the one that does not move like the others.',
          'Do not say my name in this town. Not even to me. Especially not to me.',
        ],
      },
    ],

    // ── The Umbral Court ────────────────────────────────────────────
    umbral: [
      ARC_OPEN,
      sloughNudge([
        'North to the Cloak, west to the Fang Court, then north to the Slough. Bring a light. Ha. It will not help.',
      ]),
      ARC_HONEY, NUDGE_HOME,
      { when: cure(4), lines: [
        'They have cut one hole in the canopy. One. A single beam comes down at noon and the whole town stands in it.',
        'The shadow-weavers are weaving curtains. For the beam. So they can open them. Slowly. Like a gift.',
      ] },
      {
        when: pre({ prince: 'dusk' }),
        lines: [
          'You beat Dusk! In the dark, with only his lantern to see by. Pestle hid in my satchel the whole time.',
          'The black lamps have gone out. The shadows are just shadows again — they stay where they are put.',
          'The shadow mere fishes now. Blackwater — antivenin rod. You reel in a shape, and it is cold. Lovely.',
        ],
      },
      {
        when: { not: NYXA },
        lines: [
          'No light reaches here. The canopy is that thick. The lamps burn black. Do not ask me how; I do not know.',
          'Dusk only takes a blow where his lantern shines. Stay in the light with him. Close. Uncomfortably close.',
          'The mere is blackwater. Its fish are shadows. Antivenin rod, or the line just goes cold and slack.',
        ],
      },
    ],

    // ── The Grave Court ─────────────────────────────────────────────
    grave: [
      ARC_OPEN,
      sloughNudge([
        'The Slough\'s door is north, at the top of the churchyard. Her cast skin. The still is in the skull.',
        'Pestle has gone very quiet. He does that near her. He has met her. I did not ask how.',
      ]),
      ARC_HONEY, NUDGE_HOME,
      { when: cure(4), lines: [
        'The bells are ringing on every grave. Not for the dead. For the greyed who were only cold, digging out.',
        'I gave the cure to six people in the Lych House this morning. Six. They had been "dead" since spring.',
      ] },
      {
        when: pre(princes(6)),
        lines: [
          'All six! The Slough\'s door is open, north of the Lych House. Her cast skin, tail first, up to the head.',
          'Three halls and three wardens inside, then her. Pestle is shaking. Pestle has never once shaken.',
        ],
      },
      {
        when: pre({ prince: 'mortis' }),
        lines: [
          'Mortis is down. The gravedigger prince. They are opening the graves — some of the greyed were only cold.',
          'Only cold. Carried off grey and buried breathing. I want to put my mortar through her nest.',
          'The lych pool fishes — blackwater, antivenin rod. Bonefish, wraith roach. Hetty will bake those too.',
        ],
      },
      {
        when: { not: NYXA },
        lines: [
          'Where the passed-over end up. Carried here grey, and the mire takes the churchyard down an inch a year.',
          'Mortis tolls a great bell; the ghosts of the greyed rise. Keep moving near him — he stiffens what stands.',
          'Every grave has a bell, in case. I have heard one ring. I do not talk about it.',
        ],
      },
    ],

    // ── The Slough ──────────────────────────────────────────────────
    slough: [
      ARC_OPEN,
      ARC_STILL,
      ARC_HONEY, NUDGE_HOME,
      { when: cure(4), lines: [
        'The still is cold. I come up here sometimes and read the recipe on the copper. Out loud, to Pestle.',
        'Somebody has scratched a new line under hers: "and honey". Not me. Pestle cannot write. A mystery.',
      ] },
      {
        when: { not: NYXA },
        lines: [
          'Her cast skin. We are inside it. Every scale above us is the size of a door. Pestle will not stop shaking.',
          'The milking sheds, then the moult, then the clutch, then the skull. She is coiled round her still up there.',
          'She rations — the antidote on the floor, her venom on you. Get to the vials first. She drinks them.',
        ],
      },
    ],
  },

  general: [
    { when: cure(4), lines: [
      'The Mark is two little scars and nothing behind them. Fangmire is just an isle now. A damp one.',
      'There are three more isles out there, they say, with three more crowns. I hope every one has a Hetty.',
      'If you sail on, take a jar of fang-honey. Honey never spoils. Neither does a cure, I hope.',
    ] },
    { when: { all: [NYXA, { not: cure(4) }] }, lines: [
      'Matriarch Nyxa is down. The Draught Houses are open. But a dose is still a dose. I am working on it.',
      'The boatwright can fit an Uber-upgrade if you ever take one off a sea beast. The Mire Hydra drops one.',
      'Pestle has nobody to growl at. He keeps looking at me, as if I ought to fix it.',
    ] },
    { when: princes(6), lines: [
      'All six princes. The Slough\'s door in the Grave Court is open. Three halls, three wardens, then her.',
      'Take meals from the Honeyed Fang. Take your best charms. Do not let her drink the vials first.',
      'Pestle has stopped eating. He knows where we are going.',
    ] },
    { when: princes(5), lines: [
      'Five princes! The Draught Houses are short this moon, they say. She is rationing her own brood now.',
      'Charms last forever, meals last one fight. Three charms at once. Pick the ones that get on together.',
      'One court left. Then the Slough opens.',
    ] },
    { when: princes(4), lines: [
      'Four courts free! The ear-boxes are filling up with rude drawings instead of names. Progress.',
      'Have you spent your Orbs? G opens the gene tree. Grow something. Pestle wants you to have claws.',
      'The Markwarden has not been seen in a week. Nobody is being bitten. The babies are just babies.',
    ] },
    { when: princes(3), lines: [
      'Three courts down! Half the isle! The queue at the Draught House is very slow and very loud now.',
      'Have you a boat yet? Morrow Gall on the slip builds them. The Outer Sea is rough. Take weight.',
      'If you meet Hetty Combe, buy a bun. Do not ask what is in the honey. I do not know either. Yet.',
    ] },
    { when: princes(2), lines: [
      'Two princes! The Matriarch knows your face now. Every spy on the isle is drawing it on a slip.',
      'Quests pay mostly in Orbs — those lights. Every quest on Fangmire ends with a fight. Every one.',
      'If one court is too hard, try another and come back. The walks all go round. So do snakes.',
    ] },
    { when: princes(1), lines: [
      'One prince down! Every prince drops an artifact of theirs. You can wear one at a time.',
      'And a key. Keys open things. Not the Draught House strongroom. Yet. Pestle has his eye on it.',
      'Fang is gentlest. The Grave is hardest — leave it. The rest are somewhere between, like everything.',
    ] },
    {
      lines: [
        'Six courts, six broodlings, and one Matriarch coiled in the mire. Start at the Fang Court, north.',
        'Press E near anyone to talk. Near water with a rod, E casts. Near a counter, E opens it.',
        'TAB is your pack — charms go on there. G is your gene tree; Orbs grow it. M is the isle map.',
        'Every child here is bitten at a week old — the Mark. Her venom sleeps as long as the Draught comes.',
        'One dose a moon, rationed by loyalty. Late with the tithe, named by a spy — passed over. Then grey.',
        'Each court has its water — a venom fen, a silk pool, a chain moat, a cistern, a shadow mere, a lych pool.',
        'Driftwood for sea and ponds, iron for the bog and the ink. Venom and blackwater want the antivenin rod.',
        'Waystones! Touch one in every court and the map jumps you between them. My feet are grateful.',
        'Fangmire is past the Breakwater. The Outer Sea out there is rough — breakers, swells. Take a heavy hull.',
        'Something with five heads lives out past the Fang Light. Its slicks eat hulls. Pestle hates it most of all.',
        'Lose a fight and you wake where you stood, a little bitten. Everybody here is a little bitten.',
      ],
    },
  ],
};
