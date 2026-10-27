import type { Cond, Talk, WandererDef } from '../../../../IslesTypes';

/**
 * Wendeline Burrows — Thornwild's wanderer. A beekeeper who has walked the isle for thirty years
 * behind one hive, which she carries on her back in a straw skep and talks to as "the Ladies". She
 * never takes off her veil. She goes wherever the Ladies want to forage, and the Ladies, whenever
 * she lets them out, fly north — toward the Heartwood's crown and the Glasshouse. She has always
 * assumed they want the Empress's roses. She is dry, kind, unhurried, and listens to bees.
 *
 * She is the isle's narrator: the tutorial nudges (pollen, bogs, the syrup river and the briarwood
 * rod, the bone-well, waystones, the counters), gossip about every prince, a reaction to each court
 * freed — and her own story, which only moves once the Empress falls. The Ladies swarm the
 * Glasshouse at dawn and settle on one hedge in the gallery: her sister Primrose, pruned thirty years
 * ago in the wet summer the Burrows' honey came up short. The bees have been feeding her every day.
 *
 * Blocks are listed most specific first. Once the Empress falls, her arc is a chain of flags
 * (`wendeline-hive-1` … `wendeline-hive-4`) and each link holds on its own, so the next step always
 * plays next. Step 2 plays only in the Glasshouse, step 4 only in Mossgate.
 */

const EMPRESS: Cond = { monarch: 'verdigra' };
/** True only before the Empress falls — keeps the old lines out of the rotation once she is down. */
const pre = (c: Cond): Cond => ({ all: [c, { not: EMPRESS }] });
const princes = (count: number): Cond => ({ princesOfIsle: 'life', count });
const hive = (n: number): Cond => ({ flag: `wendeline-hive-${n}` });
const between = (a: number, b: number): Cond => ({ all: [hive(a), { not: hive(b) }] });

// ── The hive arc (after the Empress) ────────────────────────────────

/** Step 1 — anywhere: the Ladies have swarmed. Plays the first time she is spoken to after the Empress. */
const ARC_SWARM: Talk = {
  when: { all: [EMPRESS, { not: hive(1) }] },
  sets: 'wendeline-hive-1',
  lines: [
    'They have gone. The Ladies. I opened the skep at dawn and they came out in one cloud and did not come back.',
    'North. They went north, the way they always go. Thirty years, every time I let them out: north.',
    'I always thought it was her roses. The Glasshouse is full of roses; bees are not complicated.',
    'But a hive does not swarm in a body without its queen unless something is calling it. Something is.',
    'I am going to the Glasshouse. I have walked behind those bees for thirty years. I can walk a bit further.',
  ],
};

/** Step 2 — the Glasshouse: the swarm has settled on one hedge, and it is Primrose. */
const ARC_HEDGE: Talk = {
  when: between(1, 2),
  sets: 'wendeline-hive-2',
  lines: [
    'Here. In the hedge gallery. Every one of them, on one hedge, humming like a kettle. Look at the shape of it.',
    'Primroses. All over it. Primroses do not grow on a hedge. They grow on a bank, in a wet spring, at home.',
    'It has a face. Under the leaves. It is breathing, very slow. It is my sister.',
    'Primrose. They pruned her the wet summer our honey came up short. I was seventeen. She was fourteen.',
    'And the Ladies have come here every single day for thirty years. Into her flowers. Feeding her.',
    'I thought I was following them. They were taking me to her, and I never once followed far enough.',
  ],
};

/** Step 3 — anywhere: Primrose is unpicked, and asks for honey. */
const ARC_UNPICKED: Talk = {
  when: between(2, 3),
  sets: 'wendeline-hive-3',
  lines: [
    'They are unpicking the grafted out of the hedges. Slowly. The roots go into the soil and into them both.',
    'The gardeners — the Empress\'s own gardeners — are doing it on their knees, with their fingers. Good.',
    'They got her feet free this morning. Her hands are still bark. And her first words in thirty years —',
    '"Is there honey?" — Is there honey. Of course there is honey. There has only ever been honey.',
    'I have carried her down to Mossgate. Dorcas has given her the bed by the oven. Go and see her. Please.',
  ],
};

/** Step 4 — Mossgate: the veil comes off. */
const ARC_VEIL: Talk = {
  when: between(3, 4),
  sets: 'wendeline-hive-4',
  lines: [
    'When they took her I made a promise, to the sky, which is a silly thing to promise anything to.',
    'That it would not see my face again until I found her. Thirty years under a veil. The Ladies did not mind.',
    'Well. I found her. Or they did, and let me come along. So.',
    '...There. That is my face. It has got older under there. It has got older looking for her.',
    'The wind is very strange on it. Primrose says I look like Mother. I do not know if that is a kindness.',
  ],
};

/** Step 5 — after: the face, the sisters, the Ladies back in the skep. */
const ARC_HOME: Talk = {
  when: hive(4),
  lines: [
    'The Ladies came home last night, every one, and went into the skep like nothing had happened. Bees.',
    'Primrose sits by the oven with her bark hands in a bowl of warm honey. The herb-wife says it helps.',
    'I keep the veil in my pocket. In case. Of what, I do not know. Habit. It was a very long habit.',
    'We are going to keep bees together. A proper apiary, on the bank above Mossgate, where the primroses grow.',
    'Thank you. The Ladies say thank you too. They say it by not stinging you, which is high praise.',
  ],
};

/** In every other area, after the swarm and before she has found the hedge: the pull north. */
const homeNudge = (lines: string[]): Talk => ({ when: between(1, 2), lines });

/** Anywhere but Mossgate, once Primrose is unpicked and before the veil comes off. */
const NUDGE_HOME: Talk = {
  when: between(3, 4),
  lines: [
    'Primrose is in Mossgate, by Dorcas\'s oven. I keep finding reasons to be somewhere else. I am frightened.',
    'Thirty years, and I am frightened of a woman eating toast. Walk back with me? To Mossgate. Soon.',
  ],
};

export const WENDELINE: WandererDef = {
  id: 'life-wanderer-wendeline',
  name: 'Wendeline Burrows',
  title: 'Beekeeper, Following the Ladies',
  look: {
    body: 0xc8a888, accent: 0xe8e2c8, hand: 0x8a7a5a, hat: 'veil',
    traits: ['pack', 'satchel', 'cane'], size: 1.0, eye: 0xf0e090,
  },

  byArea: {
    // ── Mossgate ────────────────────────────────────────────────────
    mossgate: [
      ARC_SWARM,
      { when: between(1, 2), lines: [
        'The Ladies are not here. I looked in every moss roof in Mossgate on the way. They are at the Glasshouse.',
        'North through the Bloom Court, up the Heartwood, to the crown. Walk with me, if you will.',
      ] },
      ARC_UNPICKED, ARC_VEIL, ARC_HOME,
      {
        when: pre(princes(6)),
        lines: [
          'Six princes. The Glasshouse door on the Heartwood crown is open. The Ladies have gone very quiet.',
          'They always hum toward the north. Today they are not humming at all. Listening, I think.',
          'Eat at the Crumb & Thistle before you go up. The halls in there clip, shift and grow. Bring a good rod.',
        ],
      },
      {
        when: pre(princes(3)),
        lines: [
          'Half the courts! Agnes read the beam even for four houses in a row this morning. Four. In a row.',
          'People are carrying their tithe to the scales very slowly now. Carrying it the long way round.',
          'The Ladies are restless. More than usual. They keep bumping the skep on the north side.',
        ],
      },
      {
        when: pre({ prince: 'petalis' }),
        lines: [
          'Petalis is down. The Bloom prince. He hardened off the pruned in his orangery before the Glasshouse.',
          'The cart did not come for the short houses this week. Agnes read the beam and nobody came. Imagine.',
          'Five more. West to the sugar, east to the hunt. Or up through the Bloom to the bog and the bones.',
        ],
      },
      {
        when: pre({ questDone: 'mossgate-short-weight' }),
        lines: [
          'The cart went back up the road empty. The whole quay heard Hask swearing. The Ladies enjoyed it.',
          'Touch the waystone by the scales if you have not. M opens the isle map; you can walk the roads in a blink.',
          'The Hook & Bramble sells the briarwood rod. Dear. The only thing on Thornwild that will fish syrup.',
        ],
      },
      {
        when: pre({ flag: 'wendeline-met' }),
        lines: [
          'Still in Mossgate? It is a good town. Damp, kind, and frightened of a set of scales. Most towns are.',
          'North through the trunk is the Bloom Court. West out of the Westknot is sugar. East is the hunt.',
          'Fish off the Crook, the bent root under the last arch. Mullet for learning. Ezra will sell you a rod.',
          'Dorcas at the Crumb & Thistle bakes what you catch. A meal lasts one fight. A charm lasts for ever.',
        ],
      },
      {
        when: { all: [{ not: { flag: 'wendeline-met' } }, { not: EMPRESS }] },
        sets: 'wendeline-met',
        lines: [
          'Do not swat. They will not sting you unless you swat. — There. Good. You stood still. They like you.',
          'Wendeline Burrows. And these are the Ladies. — Ladies, a visitor, off the Reach boat. Be civil.',
          'You have landed in Mossgate on Weighing Day. Inside the Elder, yes. It fell a hundred years ago.',
          'Walk up to anyone and press E. Bram on the quay first. Then go and look at the scales. Everyone does.',
          'TAB opens your pack, if you are wondering. I will be about. Look for the bees. They are hard to miss.',
        ],
      },
    ],

    // ── The Bloom Court ─────────────────────────────────────────────
    bloom: [
      ARC_SWARM,
      ARC_UNPICKED,
      NUDGE_HOME,
      { when: hive(4), lines: [
        'The cloches are open. Every glass bell in the Bloom lifted off its bed. The flowers are going wild. Good.',
        'Primrose wanted to see the gardens. She stood on the sundial lawn and cried, then ate a rose. Fair.',
      ] },
      homeNudge([
        'The Bloom gardeners are digging up the beds that were planted on people. Gently. With spoons.',
        'Petalis is helping. He knows which bed is which. He kept a list. Of course he kept a list.',
        'The Ladies did not stop here on the way north. Not one flower. They have never flown past a flower before.',
      ]),
      {
        when: pre({ prince: 'petalis' }),
        lines: [
          'You beat Petalis. The Bloom prince, among his own beds. He used to deadhead people. He called it that.',
          'The orangery is open. There were cots in it. Rows. Where the pruned waited to be "hardened off".',
          'The lily pond fishes kindly now — perch and petal koi. A driftwood rod will do. The Ladies like the lilies.',
        ],
      },
      {
        when: pre({ courtReady: 'bloom' }),
        lines: [
          'Five champions down. The orangery is open. Petalis fights in full bloom first — petal storms, beds that burst.',
          'Then he wilts. The petals drop and it is all bare stems, whipping. Thorns are faster than petals.',
          'Do not stand on the flowerbeds when they swell. The Ladies know. You can tell by how they hum.',
        ],
      },
      {
        when: pre({ flag: 'wendeline-bloom' }),
        lines: [
          'Every champion here plays a rule — blooms to cut, pollen, a sundial. The fight card tells you which.',
          'Lose? You wake where you stood, smelling of compost. Win and the court pays. Coin buys charms.',
          'Pollen clouds make you sneeze. Sneeze at the wrong moment and you are stood still. Breathe through cloth.',
        ],
      },
      {
        sets: 'wendeline-bloom',
        when: { all: [{ not: { flag: 'wendeline-bloom' } }, { not: EMPRESS }] },
        lines: [
          'The Bloom Court. Every bed in stripes. Every bush clipped into an animal. Every rose under a glass bell.',
          'Prince Petalis keeps it. Tidiest garden on Thornwild. Ask yourself where the tidiness comes from.',
          'The Ladies could feed here for a year and they never land. Not once. That has always bothered me.',
          'Five champions guard it. Beat them and Petalis has to come out of his orangery himself.',
        ],
      },
    ],

    // ── The Spore Court ─────────────────────────────────────────────
    spore: [
      ARC_SWARM,
      ARC_UNPICKED,
      NUDGE_HOME,
      { when: hive(4), lines: [
        'The fairy rings are just mushrooms again. You can stand in one and nothing happens. Primrose did. Twice.',
        'The glowcaps are brighter. The bog folk say it is because nobody is counting how bright they are.',
      ] },
      homeNudge([
        'Mycel has gone into the bog to sit with the threads. He says he can feel the whole isle in them. Waking.',
        'The Spore folk are lighting their caps every night now. No reason. Just because they can.',
        'I keep listening for the Ladies. The bog is so quiet you can hear a bee from a mile. Nothing.',
      ]),
      {
        when: pre({ prince: 'mycel' }),
        lines: [
          'Mycel is down! The spore prince. His threads ran under every house; he heard every word said on them.',
          'People are talking out loud on the boardwalks. You would not believe how loud. All of them at once.',
          'The bog fishes — loach, glowcap eel, mire frog. Iron rod at least; driftwood rots in the black water.',
        ],
      },
      {
        when: pre({ courtReady: 'spore' }),
        lines: [
          'Five down. Mycel is in his cap-hall. He fights through the floor first — threads, mushrooms erupting.',
          'Then he stands up. All of him. A fruiting body the height of a house, spores coming off the cap.',
          'Keep upwind. The Ladies hate spores. So should you.',
        ],
      },
      {
        when: pre({ flag: 'wendeline-spore' }),
        lines: [
          'The bog is soft off the boardwalks. Stand still on it and it takes you, slow. Keep to the planks.',
          'Bog fishing wants an iron rod. The black water rots anything softer. Ezra in Mossgate has iron.',
          'Do not step in a fairy ring as it closes. You come out somewhere else, and usually somewhere wetter.',
        ],
      },
      {
        sets: 'wendeline-spore',
        when: { all: [{ not: { flag: 'wendeline-spore' } }, { not: EMPRESS }] },
        lines: [
          'The Spore Court. Houses inside mushrooms, black water, rings of toadstools. The Ladies will not fly here.',
          'Prince Mycel keeps it. The threads under the bog are his; he listens through them. Mind your tongue.',
          'They pay the Bloom Tithe in mushrooms here, weighed wet. Wet mushrooms weigh more. Mycel allows it.',
          'That is the kindest thing anyone has said about a prince all day. Remember it.',
        ],
      },
    ],

    // ── The Heartwood Court ─────────────────────────────────────────
    heartwood: [
      ARC_SWARM,
      ARC_UNPICKED,
      NUDGE_HOME,
      { when: hive(4), lines: [
        'The sawmill is still not running. Nobody wants it to. They hung bells on the blades instead.',
        'Primrose climbed the root stairs with me today. All the way to the crown. Bark hands and all.',
      ] },
      homeNudge([
        'The Heartwood is the Elder\'s sister, Sorrel says. Same seed-year. Its leaves came out overnight. All of them.',
        'The Glasshouse door at the crown stands open. The Ladies went in. I am going after them.',
      ]),
      {
        when: pre(princes(6)),
        lines: [
          'All six! The Glasshouse door at the crown is open. Iron and glass, all the way up. You can see the hedges.',
          'Three halls: shears on a clock, a maze of hedges that move on a bell, and a nursery that grows over you.',
          'Then her. Under the dome, among her roses. The Ladies are pulling at their skep like dogs on a lead.',
        ],
      },
      {
        when: pre({ prince: 'birchbark' }),
        lines: [
          'Birchbark is down. The Heartwood prince. He was planted here, they say — rooted. Now he has walked.',
          'The root pool fishes now — sapling trout, amber carp, the rootworm chub. Driftwood does it.',
          'The Glasshouse is at the crown. The door is sealed six ways, one for each prince. You have one more broken.',
        ],
      },
      {
        when: pre({ courtReady: 'heartwood' }),
        lines: [
          'Five champions down. Birchbark is planted at the top of the root stairs. Roots erupt, branches sweep.',
          'Then he pulls himself up out of the ground and walks. And trees come down. Mind which way they lean.',
          'The Ladies are frantic here. The crown is just above. They have always wanted the crown.',
        ],
      },
      {
        when: pre({ flag: 'wendeline-heartwood' }),
        lines: [
          'The sawmill here is never allowed to run. The Empress forbids it. She does not like things being cut.',
          'Unless she is doing the cutting. — Sorry. The Ladies are cross today. It makes me cross.',
          'The door at the crown is the Glasshouse. Six seals. Not yet. Not for a long while yet.',
        ],
      },
      {
        sets: 'wendeline-heartwood',
        when: { all: [{ not: { flag: 'wendeline-heartwood' } }, { not: EMPRESS }] },
        lines: [
          'The Heartwood. A city on one living tree — terraces cut in the bark, stairs on the roots, sap lanterns.',
          'Prince Birchbark governs it. He has not moved from his place in years. He does not need to.',
          'Up there — right at the crown — that glint is the Glasshouse. Her palace. Iron and glass.',
          'Whenever I let the Ladies out, that is where they go. Straight up. I have never been allowed to follow.',
        ],
      },
    ],

    // ── The Wildhunt Court ──────────────────────────────────────────
    wildhunt: [
      ARC_SWARM,
      ARC_UNPICKED,
      NUDGE_HOME,
      { when: hive(4), lines: [
        'The kennels are open. The hounds have gone feral and fat. They follow the children about. Good dogs.',
        'Fang took the trophy antlers off the lodge walls. Said he could not look at them. Took him long enough.',
      ] },
      homeNudge([
        'The deer have come out of the parks and into the town. Nobody is hunting them. They seem confused.',
        'Fang sits at the ford most days, watching the water. His wolf has gone out of him, he says. He misses it.',
        'The Ladies are at the Glasshouse. I should be too. Or at Mossgate. I do not know where I should be.',
      ]),
      {
        when: pre({ prince: 'fang' }),
        lines: [
          'Fang is down. The hunting prince. When a short house ran rather than be pruned, Fang was who they sent.',
          'The ford fishes now — ford salmon, antler pike. Driftwood will do it. The water is clean and cold.',
          'Ezra in Mossgate will buy the salmon at a good price. Dorcas will bake them. Everyone wins but the salmon.',
        ],
      },
      {
        when: pre({ courtReady: 'wildhunt' }),
        lines: [
          'Five champions down. Fang\'s lodge is open. He rides first — hounds and spears, the whole chase.',
          'Then the wolf comes out of him. A great grey thing, lunging, howling. Do not run in straight lines.',
          'The Ladies will not go near him. Wolves do not like bees. Bees do not like wolves. Sensible, both.',
        ],
      },
      {
        when: pre({ flag: 'wendeline-wildhunt' }),
        lines: [
          'You leave a scent here. The hounds can follow it. Water washes it off. Remember that.',
          'The hunting stands up in the trees are the Empress\'s. She hunts here at the season\'s turn. Not deer.',
          'The ford is the best fishing on this side of the isle. Bring a rod. Bring patience.',
        ],
      },
      {
        sets: 'wendeline-wildhunt',
        when: { all: [{ not: { flag: 'wendeline-wildhunt' } }, { not: EMPRESS }] },
        lines: [
          'The Wildhunt Court. Timber halls, antlers over every door, kennels, and the river ford. Deep forest.',
          'Prince Fang keeps it. Families who run from the pruning cart end up here, and Fang hunts them back.',
          'They pay the Bloom Tithe in meat. When the meat comes up short, they pay it in runners.',
          'The Ladies are quiet in the deep woods. Bees do not like the dark under trees. Neither do I.',
        ],
      },
    ],

    // ── The Ossuary Court ───────────────────────────────────────────
    ossuary: [
      ARC_SWARM,
      ARC_UNPICKED,
      NUDGE_HOME,
      { when: hive(4), lines: [
        'They have stopped composting. Every bone in the gardens is being named. It is taking a long time.',
        'Primrose came here with me. She stood at the gate a long while. "I could have been here," she said.',
      ] },
      homeNudge([
        'Sinew is reading the names off the bone-tags out loud. All day. He has a lot to read.',
        'The white lilies are dying back now nobody is feeding them. Good. Let them.',
        'Every time I came to this court I looked at the bones, in case. I am looking now. I do not know why today.',
      ]),
      {
        when: pre({ prince: 'sinew' }),
        lines: [
          'Sinew is down. The bone prince. The pruned who never flowered came to him. He composted them.',
          'The bone-well fishes — lampreys, bonefish, the reliquary carp. It is an abyss; whalebone or briarwood only.',
          'I do not like the fish here. I do not like what they eat. Bake them; do not think about it.',
        ],
      },
      {
        when: pre({ courtReady: 'ossuary' }),
        lines: [
          'Five down. Sinew is in the bone chapel. He fights on strings first — bone spears, whips of ligament.',
          'Then he comes apart. Bones everywhere, flying, putting themselves back together. Watch where they gather.',
          'The Ladies will not come in. I will wait outside with them. Forgive me.',
        ],
      },
      {
        when: pre({ flag: 'wendeline-ossuary' }),
        lines: [
          'The bone-well is an abyss. Iron cracks in it. Whalebone or briarwood. Ezra in Mossgate has the briarwood.',
          'The lilies here are fed. You do not want to know on what. You already know on what.',
          'Thirty years I have come here and looked at the bones, in case. I do it every time. I am doing it now.',
        ],
      },
      {
        sets: 'wendeline-ossuary',
        when: { all: [{ not: { flag: 'wendeline-ossuary' } }, { not: EMPRESS }] },
        lines: [
          'The Ossuary Court. Bone trellises, marrow wells, white lilies to the horizon. The Ladies will not land.',
          'This is where the pruned come who never flowered. The Empress does not waste a thing. Not even them.',
          'Prince Sinew keeps it. He is very gentle with the bones. That is somehow the worst part.',
          'My sister was pruned, a long time ago. I come here and look. I have never found her. I keep looking.',
        ],
      },
    ],

    // ── The Confection Court ────────────────────────────────────────
    confection: [
      ARC_SWARM,
      ARC_UNPICKED,
      NUDGE_HOME,
      { when: hive(4), lines: [
        'The Sweet-Tax house is giving its sugar away by the shovel. Primrose has eaten a whole gingerbread door.',
        'The syrup river is running clear for the first time in years. Clear syrup. I did not know that existed.',
      ] },
      homeNudge([
        'Saccharo is pulling taffy in the square for the children. Badly. They are teaching him. Sticky lesson.',
        'Everything here smells of honey but is not honey. The Ladies would hate it. They are not here to hate it.',
      ]),
      {
        when: pre({ prince: 'saccharo' }),
        lines: [
          'Saccharo is down. The sugar prince. He taxed the sweetness out of everything — even the honey. Mine.',
          'The syrup river fishes now — gummy minnows, toffee catfish, caramel eels. Briarwood only; anything else gums.',
          'There is a bakery here, the Sugar Loaf. It will bake syrup fish. Do not ask me what it tastes of.',
        ],
      },
      {
        when: pre({ courtReady: 'confection' }),
        lines: [
          'Five down. Saccharo is in the candy works. Spun sugar first — floss clouds, hard-candy bullets.',
          'Then he melts. Syrup floods the floor and gumdrops fall out of the sky. Keep to the high ground.',
          'And do not eat anything in there. I mean it. I can see you thinking about it.',
        ],
      },
      {
        when: pre({ flag: 'wendeline-confection' }),
        lines: [
          'Sugar cubes give you a rush and then a crash. Eat three and you will sit down whether you mean to or not.',
          'The syrup river wants the briarwood rod. Anything else gums solid on the first cast.',
          'The Sweet-Tax house weighs every jar of honey on the isle. Mine too. They took a tenth for thirty years.',
        ],
      },
      {
        sets: 'wendeline-confection',
        when: { all: [{ not: { flag: 'wendeline-confection' } }, { not: EMPRESS }] },
        lines: [
          'The Confection Court. Gingerbread houses, candy-cane fences, a river of syrup. Do not lick anything.',
          'Prince Saccharo keeps it. The Sweet-Tax: a tenth of all the sugar on Thornwild, and a tenth of the honey.',
          'The Ladies get very excited here and then very disappointed. None of it is flowers. It just smells like it.',
          'The Sugar Loaf bakes in the square. Better than it sounds. Worse for your teeth.',
        ],
      },
    ],

    // ── The Glasshouse ──────────────────────────────────────────────
    glasshouse: [
      ARC_SWARM,
      ARC_HEDGE,
      ARC_UNPICKED,
      NUDGE_HOME,
      { when: hive(4), lines: [
        'The gallery is half empty. Every gap is someone who walked out. The gaps are the loveliest thing here.',
        'The roses are still blooming. Nobody pruned them. The Ladies feed on them now, as if they were only roses.',
      ] },
      {
        when: pre(princes(6)),
        lines: [
          'The Glasshouse. Listen — the hedges are breathing. All of them. Every hedge in here was a family.',
          'The shears in the gallery cut on a clock. The maze moves when the bell rings. The nursery grows over you.',
          'Walk the markers. Caught, you wake at the last one, leaves in your hair.',
          'The Ladies are going mad in the skep. They know this place. They have been here every day of their lives.',
        ],
      },
      {
        when: { not: EMPRESS },
        lines: [
          'How did you get in here? — No. Do not tell me. The Ladies are agitated enough already.',
          'Keep moving. Keep to the markers. Do not touch the hedges.',
        ],
      },
    ],
  },

  general: [
    { when: hive(4), lines: [
      'I have a face again. People keep looking at it. I keep looking at theirs. It is a fair trade.',
      'Nine more isles with nine more crowns, they say. I hope every one of them has someone to send bees.',
      'If you sail on, take a jar of Mossgate honey. Honey never spoils. Nothing else on this isle can say that.',
    ] },
    { when: { all: [EMPRESS, { not: hive(4) }] }, lines: [
      'Empress Verdigra is down. The hedges are being unpicked. The pruned are walking home in their own skins.',
      'The boatwright can fit an Uber-upgrade if you ever pull one off a sea beast. The Brambleback drops one.',
      'I am a little lost without the Ladies. Thirty years of a hum at my back. It is very loud, quiet.',
    ] },
    { when: princes(6), lines: [
      'All six princes. The Glasshouse door at the Heartwood crown is open. Three halls, three wardens, then her.',
      'Take meals from the Crumb & Thistle. Take your best charms. Do not touch the hedges.',
      'The Ladies are pulling north so hard the skep straps cut my shoulders. Something is up there.',
    ] },
    { when: princes(5), lines: [
      'Five princes! The Empress has started pruning her own gardeners, they say. She cannot stop cutting.',
      'Charms last forever, meals last one fight. Three charms at once. Pick the ones that get on.',
      'One court left. Then the door at the Heartwood crown opens.',
    ] },
    { when: princes(4), lines: [
      'Four courts free! The pruning carts are standing in their sheds. The horses are getting fat.',
      'Have you spent your Orbs? G opens the gene tree. Grow something. That is what this isle is for.',
      'The Ladies have started dancing in the skep. Bees dance to tell each other where the flowers are. North.',
    ] },
    { when: princes(3), lines: [
      'Three courts down! Half the isle! Mossgate is carrying its tithe to the scales very, very slowly.',
      'Have you a boat yet? Bram on the quay builds them. You will want one when the Empress is done.',
      'Agnes Tare at the scales thinks the weights are wrong. She is a careful woman. Hear her out.',
    ] },
    { when: princes(2), lines: [
      'Two princes! The Empress knows your face now. She has a hedge clipped in its shape, I would bet.',
      'Quests pay mostly in Orbs — those lights. Every quest on Thornwild ends with a fight. Every one.',
      'If one court is too hard, try another and come back. The roads all go round. So do bees.',
    ] },
    { when: princes(1), lines: [
      'One prince down! Every prince drops something of theirs — an artifact. You can wear one at a time.',
      'And a key. Keys open things. Not my veil; that is a promise, not a lock.',
      'The Bloom is gentlest. The Heartwood is hardest — leave it. The bones and the bog sit somewhere between.',
    ] },
    {
      lines: [
        'Six courts, six princes, and one Empress at the top of a tree. Start with the Bloom, north of Mossgate.',
        'Press E near anyone to talk. Near water with a rod, E casts. Near a counter, E opens it.',
        'TAB is your pack — charms go on there. G is your gene tree; Orbs grow it. M is the isle map.',
        'Fish off the Crook in Mossgate. Ezra sells rods. Dorcas at the Crumb & Thistle bakes what you catch.',
        'Each court has its own water — a lily pond, a bog, a root pool, a ford, a bone-well and a syrup river.',
        'Driftwood for sea and ponds. Iron for the bog. The bone-well wants whalebone or briarwood. Syrup, briarwood.',
        'Waystones! Touch one in every court and the map lets you jump between them. My knees thank you.',
        'Pollen is the Bloom\'s weather. Spores are the bog\'s. Breathe through your sleeve in both.',
        'Every season\'s turn, every house is weighed. A house that comes up short is pruned. I will not say more.',
        'The veil? It stays on. It is a promise. The Ladies have seen my face; nobody else needs to.',
        'Lose a fight and you wake where you stood, a little composted. Things on Thornwild grow back. Mostly.',
      ],
    },
  ],
};
