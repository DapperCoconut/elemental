import type { Cond, Talk, WandererDef } from '../../../../IslesTypes';

/**
 * Gideon Flint — Bedrock Hold's wanderer. A quarryman, interred nine years ago for a block three
 * pounds short, who dug himself out of his cell in the Galleries with a spoon and a great deal of
 * patience. He still wears the stone collar they sealed him in by — a ring of cut granite round
 * his neck, eleven pounds, pinned with iron that only the Regent's mason's chisel fits — and carries
 * a pick over one shoulder and, in a little brass cage on the other, a canary he calls the Duchess
 * and consults on everything. Canaries go down mines to tell you when the air is bad. Gideon takes
 * her everywhere, and says the air on Bedrock Hold has been bad for forty years.
 *
 * He is the isle's narrator: the tutorial nudges (the Tithe Scales, the lift, sand and cavern
 * fishing and the delver rod, waystones, the counters), gossip about every prince, a reaction to
 * each court freed — and his own story, which only moves once the Regent falls. The cells are
 * opened; the Old King's tomb, at the bottom of the Sepulchre, is unsealed and found empty but for a
 * note and a worn-down spoon (the King dug out, too, forty years ago); and Ruth Ashlar, the mason
 * who closed his collar, strikes it off on the Tithe Scales in front of the whole quay.
 *
 * Blocks are listed most specific first. Once the Regent falls, his arc is a chain of flags
 * (`gideon-arc-1` … `gideon-arc-3`) and each link holds on its own, so the next step always plays
 * next. Step 2 plays only in the Sepulchre, step 3 only in Quarrymouth.
 */

const REGENT: Cond = { monarch: 'gravane' };
/** True only before the Regent falls — keeps the old lines out of the rotation once he is down. */
const pre = (c: Cond): Cond => ({ all: [c, { not: REGENT }] });
const princes = (count: number): Cond => ({ princesOfIsle: 'earth', count });
const arc = (n: number): Cond => ({ flag: `gideon-arc-${n}` });
const between = (a: number, b: number): Cond => ({ all: [arc(a), { not: arc(b) }] });

// ── The collar arc (after the Regent) ───────────────────────────────

/** Step 1 — anywhere: the cells are opened, and the crypt's seal has cracked. */
const ARC_CELLS: Talk = {
  when: { all: [REGENT, { not: arc(1) }] },
  sets: 'gideon-arc-1',
  lines: [
    'They are opening the cells. All of them. Ruth is going gallery by gallery with her chisel and a lamp.',
    'I went up the Haul Road to watch. I did not mean to. My feet went. The Duchess sang the whole way up.',
    'Nine hundred cells, and they come out blinking, and somebody puts a slit-loaf in every pair of hands.',
    'And at the very bottom, the Old King\'s tomb. The Regent\'s seal on it has cracked. Nobody has gone in.',
    'I am going in. Forty years "resting". I dug my way out of a cell. I can surely walk into a tomb.',
  ],
};

/** Step 2 — the Sepulchre: the tomb is empty. */
const ARC_TOMB: Talk = {
  when: between(1, 2),
  sets: 'gideon-arc-2',
  lines: [
    'Here. The crypt. The lid is off the sarcophagus. Look in. Go on — the Duchess is singing; the air is good.',
    'Empty. No king. No bones. A cot, a candle-end, a jug. And a note, scratched in the lid from the inside.',
    '"A king who must be sealed in to stay king is no king. I have gone out the back. Do not wait. Dig."',
    'And on the floor under it — a spoon. Worn down to the handle. Worn exactly like mine. He dug out too.',
    'Forty years the Regent ruled "until the King wakes". He was awake. He was gone before the mortar set.',
    '…I am laughing. I am sorry. I cannot stop. The Duchess thinks it is very funny too. Listen to her.',
  ],
};

/** Step 3 — Quarrymouth: Ruth strikes the collar off on the Tithe Scales. */
const ARC_COLLAR: Talk = {
  when: between(2, 3),
  sets: 'gideon-arc-3',
  lines: [
    'Ruth said she would do it here. On the Scales, in front of the whole quay. She insisted. So did the Duchess.',
    '"Head on the pan, Gideon. Hold still. One blow. It knows me." — and —',
    '…Oh. Oh, that is my neck. That is what a neck feels like. I had quite forgotten I had one.',
    'She weighed it for me, after. Eleven pounds. Nine years I have carried eleven pounds of his round my throat.',
    'Abel read the beam out loud. "Even," he said. Even. The whole quay cheered a set of scales.',
  ],
};

/** After: the spoon, the collar on Ruth's bench, and a king to go and find. */
const ARC_HOME: Talk = {
  when: arc(3),
  lines: [
    'I gave the collar to Ruth. She keeps it on her bench, to remember by. I keep the King\'s spoon. Fair trade.',
    'The Duchess sings all day now. Canaries are for bad air, they say. She seems to like the good stuff better.',
    'I think I will go and look for the Old King. He went out the back with a spoon. I know how far that gets you.',
    'Not far, and slowly, and then — out. Thank you, friend. Mind your weight. The Duchess says so.',
  ],
};

/** Anywhere but the Sepulchre, after the cells open and before the tomb: the pull downward. */
const NUDGE_TOMB: Talk = {
  when: between(1, 2),
  lines: [
    'The crypt is at the very bottom of the Sepulchre, under the throne. Up the Haul Road, through the Rubble.',
    'Walk down with me? I have done the Galleries in the dark once. I would like to do them with a lamp.',
  ],
};

/** Anywhere but Quarrymouth, after the tomb and before the collar comes off. */
const NUDGE_QUAY: Talk = {
  when: between(2, 3),
  lines: [
    'Ruth wants to strike the collar off on the Scales at Quarrymouth. In front of everybody. She is like that.',
    'I keep finding reasons to be somewhere else. Nine years with it on. I am frightened of my own neck. Silly.',
  ],
};

/** The arc blocks every area but Quarrymouth and the Sepulchre lists first. */
const ARC_ELSEWHERE: Talk[] = [ARC_CELLS, NUDGE_TOMB, NUDGE_QUAY, ARC_HOME];

export const GIDEON: WandererDef = {
  id: 'earth-wanderer-gideon',
  name: 'Gideon Flint',
  title: 'Escaped Quarryman, Still Collared',
  look: {
    body: 0x9a8a7a, accent: 0x8c8782, hand: 0x7a6a5a, hat: 'miner',
    traits: ['tool', 'beard', 'scarf', 'lantern'], size: 1.1, eye: 0xf0e0a0,
  },

  byArea: {
    // ── Quarrymouth ─────────────────────────────────────────────────
    quarrymouth: [
      ARC_CELLS,
      { when: between(1, 2), lines: [
        'The crypt is at the bottom of the Sepulchre. Haul Road north, then through the Rubble to the mountain door.',
        'I keep looking at the Scales and thinking: the Old King is under there somewhere. Under all of it.',
      ] },
      ARC_COLLAR, ARC_HOME,
      {
        when: pre(princes(6)),
        lines: [
          'Six princes. The Sepulchre door in the Rubble\'s mountain face will be standing open now.',
          'The Duchess has gone quiet. She does that at a shaft-head, before the cage goes down. Listening.',
          'Eat at the Hearthstone before you go. The halls in there drop, grind and bury. I know. I lived in one.',
        ],
      },
      {
        when: pre(princes(3)),
        lines: [
          'Half the Hold! Abel read three houses even this morning. In a row. He had to sit down on the plinth.',
          'People bring their blocks down slowly now, the long way round. Nobody is in a hurry to be weighed.',
          'The Duchess is singing more. She only sings when the air is good. I have not heard her this much in years.',
        ],
      },
      {
        when: pre({ prince: 'bould' }),
        lines: [
          'Bould is down. The Regent\'s eldest. No more rolling stones on the Haul Road; the carters are giddy.',
          'Five more. West to the sands, east to the geode. Or up the Stonehold to the clay, the iron, the ruin.',
        ],
      },
      {
        when: pre({ questDone: 'quarrymouth-short-stone' }),
        lines: [
          'The collar cart went up empty! Ruth will have a collar left over. I hope she drops it in the harbour.',
          'Touch the waystone by the Scales if you have not. M opens the isle map; walk the roads in a blink.',
          'Silas at Lode & Line sells the delver rod. Dear. The only thing on the Hold that will fish sand or a dry well.',
        ],
      },
      {
        when: pre({ flag: 'gideon-met' }),
        lines: [
          'Still on the quay? It is a good town. Dusty, stubborn, and terrified of a set of scales. Most towns are.',
          'The Grand Stair goes up to the Long Step and the Rim. Or take Jenny\'s lift, by the east face. Free ride.',
          'Fish off the crane pier. Bream for learning. Nan at the Hearthstone bakes your catch; a meal lasts a fight.',
          'North up the Haul Road: the Stonehold. West: the Dunesea. East, through the Glint Cut: the Geode.',
        ],
      },
      {
        when: { all: [{ not: { flag: 'gideon-met' } }, { not: REGENT }] },
        sets: 'gideon-met',
        lines: [
          'Do not stare at the collar. Everybody does. Granite, eleven pounds, pinned shut. I have stopped noticing it.',
          'Gideon Flint. Quarryman. Interred nine years ago for a block three pounds short. Then I left.',
          'With a spoon. It took four years. I would not recommend it, but I would not un-recommend it either.',
          'This is the Duchess. She is a canary. Canaries tell you when the air is bad. The air on the Hold is bad.',
          'Those are the Tithe Scales. Every house, a block a season. Short houses go up the Haul Road in a collar.',
          'You have a look about you. The look of somebody who tips scales over. Come and find me; I wander.',
        ],
      },
      {
        lines: [
          'The Duchess says hello. That is what that chirp means. Mostly. Sometimes it means "seed".',
          'Mind the bollards. Mind the Scales. Mind, generally. Quarrymouth is a town for minding.',
        ],
      },
    ],

    // ── The Stonehold Court ─────────────────────────────────────────
    stonehold: [
      ...ARC_ELSEWHERE,
      {
        when: pre({ prince: 'bould' }),
        lines: [
          'Bould is down and the menhir avenue is just an avenue again. People are leaning on the stones. Leaning!',
          'The Tithe pit here is filling with rainwater. Somebody has put fish in it. I like this court.',
          'Have you tried the Flatbread Stone? Theirs is thinner than Nan\'s. Do not tell Nan I said so. Ever.',
        ],
      },
      {
        when: pre({ courtReady: 'stonehold' }),
        lines: [
          'All five of Bould\'s yard-champions beaten. His keep is open to you. He will curl up when he sees you.',
          'Literally. He curls into a boulder and caroms off the walls, shedding scree. Then he plants himself.',
          'When he plants, he does not move. He raises menhirs and sends the ground out in rings. Jump the rings.',
        ],
      },
      {
        when: { not: REGENT },
        lines: [
          'The Stonehold. Houses inside standing stones; the doors are where the stone was split. Very cosy. Very heavy.',
          'Prince Bould is the Regent\'s eldest. Rolls a stone down the road to your door. If it stops, you owe.',
          'Five champions in the yards before he will see you. Watch the rolling stone, the ley lines, the causeway.',
        ],
      },
    ],

    // ── The Potter's Court ──────────────────────────────────────────
    potter: [
      ...ARC_ELSEWHERE,
      {
        when: pre({ prince: 'glaze' }),
        lines: [
          'Glaze is down. They are breaking the terracotta soldiers open, the ones with no faces. Nobody inside. Good.',
          'The kilns are firing pots again. Ordinary pots. For soup. I nearly cried at a soup pot. Do not tell anyone.',
        ],
      },
      {
        when: pre({ courtReady: 'potter' }),
        lines: [
          'Glaze will see you now. He throws pots from a spinning wheel; they burst into shards and slip.',
          'Then he walks into his own kiln and comes out glazed. A shell you cannot dent. Wait for the glaze to drip.',
        ],
      },
      {
        when: { not: REGENT },
        lines: [
          'The Potter\'s Court. Look at the army — rows of clay soldiers. That is the tithe here: fired men. Life-size.',
          'Prince Glaze takes a house\'s clay in place of stone. A potter short on clay sits for the mould. You see.',
          'There is fishing in the slip pond. Loach and catfish, all the colour of mud. They taste of it as well.',
        ],
      },
    ],

    // ── The Dunesea Court ───────────────────────────────────────────
    dunesea: [
      ...ARC_ELSEWHERE,
      {
        when: pre({ prince: 'sirocco' }),
        lines: [
          'Sirocco\'s down. The sand-ships are sailing round the point to trade. Runners on the sea, if you please.',
          'The buried city\'s domes are being dug out. The Duchess went into one and came back very pleased.',
        ],
      },
      {
        when: pre({ courtReady: 'dunesea' }),
        lines: [
          'Sirocco rides the sandstorm. Sand lanes, dune waves. Then he sinks and circles under you like a shark.',
          'Watch the fin. When it stops, move. There is a quicksand vortex where it stops. Ask me how I know.',
        ],
      },
      {
        when: pre({ item: 'rod-delver' }),
        lines: [
          'You have the delver! Good. Cast it into the sands like water. The pick bites, the line goes down.',
          'Then wait for the dune to move. That is a fish. Dune eels, sandskippers, and the scarab ray, if you are lucky.',
        ],
      },
      {
        when: { not: REGENT },
        lines: [
          'The Dunesea. The mesa\'s rain-shadow. A whole sea of sand, and under it a city the Regent buried by wind.',
          'Fish swim in the sand here. I know. You need Silas\'s delver rod; anything else just lies on the top.',
          'Prince Sirocco tithes by the sandglass: what is not paid when the glass runs out is buried where it stands.',
        ],
      },
    ],

    // ── The Geode Court ─────────────────────────────────────────────
    geode: [
      ...ARC_ELSEWHERE,
      {
        when: pre({ prince: 'facet' }),
        lines: [
          'Facet\'s down. The cutting-house is cutting lenses for lamps. Mags has ordered forty. She is glowing.',
          'The light in here — have you looked up? It comes in through the crack and goes every colour. Every colour.',
        ],
      },
      {
        when: pre({ courtReady: 'geode' }),
        lines: [
          'Facet fights in beams. They bounce off crystal panels round his room. Count the bounces before you step.',
          'Then he grows crystal copies of himself. They shatter. Do not be standing next to a copy. Ever.',
        ],
      },
      {
        when: { not: REGENT },
        lines: [
          'The Geode. A town inside a split stone. Amethyst walls, a crack of sky at the top. Mind the prisms.',
          'Prince Facet tithes in gems. A house short a gem gives a tooth. He likes them cut. He has a drawer.',
          'Crystal-pool fishing in the middle. Tetra and pike. You can see them through the water. They see you too.',
        ],
      },
    ],

    // ── The Forge Court ─────────────────────────────────────────────
    forge: [
      ...ARC_ELSEWHERE,
      {
        when: pre({ prince: 'anvil' }),
        lines: [
          'Anvil\'s down. The bell-pit is casting a bell. Not a tithe-bell. A bell for the Grand Stair. Just a bell.',
          'And the pins. The collar pins are forged here. They have stopped forging them. The Duchess sang at that.',
        ],
      },
      {
        when: pre({ courtReady: 'forge' }),
        lines: [
          'Anvil swings a hammer the size of a door. Shockwaves off every slam; tongs if you get close.',
          'Then he goes white-hot and the yard pours molten. Watch for ingots falling. Shadows first, always shadows.',
        ],
      },
      {
        when: { not: REGENT },
        lines: [
          'The Forge Court. Blast furnaces, ore carts, trip-hammers. The iron pin in my collar was made here.',
          'Prince Anvil tithes in iron. A house short on iron forges it out of its own pots and hinges. Doors fall off.',
          'Quench-pond fishing. The perch are scaled like armour. The slag-suckers are better not described.',
        ],
      },
    ],

    // ── The Rubble Court ────────────────────────────────────────────
    rubble: [
      ...ARC_ELSEWHERE,
      {
        when: pre(princes(6)),
        lines: [
          'The door in the mountain is open. The Sepulchre. My Galleries are down there. I know the way. Mostly.',
          'Tithe Shafts first: lifts rising and falling, blocks dropped on shadows. Then the Galleries. Then the crypt.',
          'The Regent sits at the bottom on the Old King\'s sarcophagus. Like a man sitting on a lid to keep it down.',
        ],
      },
      {
        when: pre({ prince: 'wreck' }),
        lines: [
          'Wreck is down. They are digging out the old capital. Yesterday they found a street sign. It said HOME STREET.',
          'The well can be fished now — down in the dark. Blind fish, older than the Regent. The delver will reach.',
        ],
      },
      {
        when: pre({ courtReady: 'rubble' }),
        lines: [
          'Wreck swings a wrecking ball on a chain. Big arcs. Stand inside the arc, not at the end of it.',
          'Then he blows the last towers. Walls fall the way they lean — look at the lean.',
        ],
      },
      {
        when: pre({ item: 'rod-delver' }),
        lines: [
          'The collapsed well, there. With the delver you can fish it. Drop the line down the dark till it stops falling.',
          'Cavefish. No eyes. Sturgeon covered in old coins. A tomb axolotl, which smiles. The Duchess hates it.',
        ],
      },
      {
        when: { not: REGENT },
        lines: [
          'The Rubble. This was the capital before the Regent buried it. Towers, aqueducts, a colossus. Now: this.',
          'The Sepulchre\'s gate is in the mountain face, north. Sealed till all six princes are down. I came out of it.',
          'There is a well here that goes down a long way. Only a delver rod will fish it. Silas sells them.',
        ],
      },
    ],

    // ── The Sepulchre ───────────────────────────────────────────────
    sepulchre: [
      ARC_CELLS, ARC_TOMB, NUDGE_QUAY, ARC_HOME,
      {
        when: { not: REGENT },
        lines: [
          'Back down here. The Duchess is very quiet. That is not the air; that is just her, remembering.',
          'Cell nine-oh-four, the Galleries. That was mine. Four foot by six. You will pass it. The hole is still there.',
          'The halls drop and grind and close. Do not be under a shadow. Do not be between two doors on the beat.',
          'And at the bottom, him. On a coffin. He has not stood up in forty years, I think. Make him.',
        ],
      },
    ],
  },

  general: [
    ARC_CELLS, NUDGE_TOMB, NUDGE_QUAY, ARC_HOME,
    {
      when: princes(4),
      lines: [
        'Four courts. The collar cart did not come down the Haul Road this season. The Duchess sang at the empty road.',
        'Keep going. Nobody on this isle has been even in forty years. You are making it even.',
      ],
    },
    {
      lines: [
        'The Duchess says the air is bad here. The Duchess says the air is bad everywhere on the Hold. She is right.',
        'If you get lost, look for the dust. It always drifts down toward the sea. Quarrymouth is where it lands.',
      ],
    },
  ],
};
