import type { WandererDef } from '../../../IslesTypes';

/**
 * Tamsin Coalwhistle — Brandmark's wanderer. A soot-streaked travelling tinker with a pack of
 * clattering pans who turns up wherever you are, mends things, sells nothing, and talks.
 *
 * She is the isle's narrator: the tutorial nudges (E, TAB, G, M, fishing, boats), the gossip on
 * every prince, the reactions to each court as it falls — and her own story. Twenty years ago,
 * when she was nine, she let her family's tithe fire go out. The wardens took her brother Hal
 * to the Kiln in her place. She has walked every road on the isle since, and never the one that
 * climbs to the citadel. Her arc runs from that guilt, through hope, into the Kiln itself, and
 * out the other side.
 *
 * Blocks are listed most specific first; the engine plays the first one whose `when` holds.
 */

const KING = { monarch: 'ashgrave' } as const;
const princes = (count: number) => ({ princesOfIsle: 'fire', count });

export const TAMSIN: WandererDef = {
  id: 'fire-wanderer-tamsin',
  name: 'Tamsin Coalwhistle',
  title: 'Travelling Tinker',
  look: {
    body: 0xc09878, accent: 0x5a4a3a, hand: 0x3a2a22, hat: 'goggles',
    traits: ['pack', 'scarf', 'tool', 'brand'], size: 0.95, eye: 0xffe0b0,
  },

  byArea: {
    // ── Emberport ───────────────────────────────────────────────────
    emberport: [
      {
        when: KING,
        lines: [
          'Listen to the port. That is not the market. That is singing. Badly, but singing.',
          'Corrow is sitting on the step by the Tithe Fire with Bettany\'s loaf in his lap. Nobody is stopping him.',
          'I bought a sloop. Me! Twenty years of selling pans and I bought a boat with the lot.',
          'There are nine more isles out there with nine more crowns. Somebody should tell them this one fell.',
          'Somebody with a very loud pack of pans, I think.',
        ],
      },
      {
        when: princes(6),
        lines: [
          'Six princes. Every court on Brandmark answers to nobody tonight. Except the Kiln.',
          'The barges have stopped. The coal sits on the quay going cold. The port is holding its breath.',
          'The Caldera rim. That is where the Kiln door is. I have never once walked up there. Not once.',
        ],
      },
      {
        when: princes(3),
        lines: [
          'Half the courts! Wick has been running up and down the boardwalk shouting it since dawn.',
          'Odile closed the tithe ledger. Nella dropped her prices. Marrit sold out of gull feathers.',
          'And me? I have been sleeping. Properly. First time in years.',
        ],
      },
      {
        when: { prince: 'kindle' },
        lines: [
          'Kindle\'s collectors did not come down the north road this week. The whole port noticed.',
          'Agna\'s Teo came out to play on the beach. In daylight. The wardens used to count children too.',
          'One court down, five to go. Do the far ones before the near ones forget you.',
        ],
      },
      {
        when: { flag: 'tamsin-met' },
        lines: [
          'Still in the port? It is a good port. Smells of fish, not of the King. Rare thing on this isle.',
          'The north road goes to the Hearth Court. West is Powder, east is Candlewick. All roads, eventually, go up.',
          'If you see a waystone, touch it. Then M opens the map and you can walk the roads in a blink.',
        ],
      },
      {
        sets: 'tamsin-met',
        lines: [
          'Oh! Sorry, sorry — the pans. They go off like a dinner bell whenever I turn round.',
          'Tamsin Coalwhistle. Tinker. I mend kettles and hinges and the occasional heart. Mostly kettles.',
          'You came off a ship. A ship! Nobody comes TO Brandmark. They come FROM it, in chains, to the Kiln.',
          'And your wrist is bare. No brand. Do you know what that makes you here? A miracle, or a corpse.',
          'Talk to folk — walk up and press E. Odile at the harbour office will know what to do with you.',
          'TAB opens your pack, if you are wondering where things go. I will be about. I always am.',
        ],
      },
    ],

    // ── The Hearth Court ────────────────────────────────────────────
    hearth: [
      {
        when: KING,
        lines: [
          'The Hearth Court let its tithe fires go out one by one last night. On purpose. To see the stars.',
          'Kindle is helping. Did you know? He carries the ash buckets. Nobody asked him to.',
          'I was born four streets that way. I walked past the house today. Somebody has painted over the brand.',
        ],
      },
      {
        when: { prince: 'kindle' },
        lines: [
          'You beat Kindle. The youngest. He used to cry at the brandings, you know. Cried and did it anyway.',
          'That is what this isle does — it makes the soft ones do the hard things and calls it duty.',
          'The house I grew up in is on the third terrace. I have not knocked on the door. Not yet.',
        ],
      },
      {
        when: { courtReady: 'hearth' },
        lines: [
          'Five champions down. Prince Kindle\'s manor gate is open — the big house with the brand on every door.',
          'He fights with tithe hearths. Little iron braziers. He plants them round the room and they answer him.',
          'Put them out and he is just a boy with a torch. A boy with a very big torch.',
        ],
      },
      {
        when: { flag: 'tamsin-hearth' },
        lines: [
          'Each champion here has a trick to their fight. Read the card before you swing — it tells you the rule.',
          'Lose? No shame. You wake up where you started with your pride a bit singed. Try again.',
          'Win and you get coin. Coin buys charms. Charms do odd clever things. Odd clever things win fights.',
        ],
      },
      {
        sets: 'tamsin-hearth',
        lines: [
          'The Hearth Court. Chimneys stacked like teeth, every window glowing — every glow counted.',
          'Look at the doors. Every one branded. Kindle\'s wardens walk the terraces with ledgers at dusk.',
          'I grew up here. Third terrace. I was nine when our fire went out. That is all I will say about it today.',
          'Five champions guard the court. Beat them all and the prince has to answer the door himself.',
        ],
      },
    ],

    // ── The Powder Court ────────────────────────────────────────────
    powder: [
      {
        when: KING,
        lines: [
          'They are firing the ramparts\' cannons. No shot — just powder. A salute. Twenty-one, then they lost count.',
          'Fuse is teaching the children to make fireworks. Proper ones. Colours I did not know powder could do.',
        ],
      },
      {
        when: { prince: 'fuse' },
        lines: [
          'Fuse is down and the magazine is quiet. Too quiet. Everybody keeps flinching at nothing.',
          'You can only live next to that much powder so long before you start counting your fingers.',
          'The Powder Court made shot for the King\'s ships. Now they can make doorknobs. I mean it — doorknobs.',
        ],
      },
      {
        when: { courtReady: 'powder' },
        lines: [
          'The magazine door is open. Prince Fuse is inside, and he fights the way his court builds: everything explodes.',
          'His barrages crawl. Watch the ground, not the sky. And when the powder trail lights, follow the gaps.',
        ],
      },
      {
        lines: [
          'The Powder Court. Ramparts, cannons, sandbags, and a firing range where nobody is allowed to miss.',
          'Prince Fuse has never smiled in public. They say he keeps a match lit in his pocket at all times.',
          'Do not knock on anything here. Do not drop anything. Honestly, do not sneeze.',
          'My pans have never sounded so loud. I am walking very, very slowly.',
        ],
      },
    ],

    // ── The Boilerworks Court ───────────────────────────────────────
    boilerworks: [
      {
        when: KING,
        lines: [
          'The Boilerworks is running at half pressure for the first time since it was built. You can hear birds.',
          'Gauge took the gauges off the walls. All of them. He is building something with them. Will not say what.',
        ],
      },
      {
        when: { prince: 'gauge' },
        lines: [
          'Gauge is down and somebody opened the relief valves. The whole yard sighed like an old dog.',
          'The cooling ponds are clearing. Good fishing if you have an iron-ringed rod — steam melts driftwood.',
          'He measured everything. Hours worked, coal burned, words spoken. I hope he finds something worth not counting.',
        ],
      },
      {
        when: { courtReady: 'boilerworks' },
        lines: [
          'Gauge\'s gate stands open. He wears a pressure gauge on his back. When it hits red, he gets worse.',
          'Strike the valve, I heard a stoker say. Strike the valve and he vents. Then hit him while he wheezes.',
        ],
      },
      {
        lines: [
          'The Boilerworks. Pipes, pistons, gauges, steam. The King\'s ships run on what is made here.',
          'Prince Gauge runs it like a pocket watch. Every worker\'s day is measured in pressure.',
          'Those ponds are hot enough to poach an egg. Fish live in them anyway. Fish are braver than us.',
          'Mind the vents. They whistle before they blow. They always whistle. Listen.',
        ],
      },
    ],

    // ── The Candlewick Court ────────────────────────────────────────
    candlewick: [
      {
        when: KING,
        lines: [
          'Candlewick lit every candle in the city at once last night. You could see it from the sea, they say.',
          'Tallow lit the last one himself. Then he sat down beside it and watched it burn all the way to nothing.',
        ],
      },
      {
        when: { prince: 'tallow' },
        lines: [
          'Tallow is down and the wax is cooling in the streets. You can walk without sticking for once.',
          'The bees are back in the apiaries. He used to take every comb for candles. Bettany will have honey.',
          'He burned himself shorter every year to keep the city lit. I did not know that. I wish I had.',
        ],
      },
      {
        when: { courtReady: 'candlewick' },
        lines: [
          'The taper cathedral is open. Prince Tallow is the tallest candle in the city, and he drips.',
          'When he burns down, the room floods with wax. Keep moving or you will set like a fly in honey.',
        ],
      },
      {
        lines: [
          'The Candlewick Court. A city of candles, melting into its own streets. Watch your boots.',
          'Prince Tallow is the eldest. He has burned so long they say there is barely any of him left.',
          'The wax pond takes an iron-ringed rod. Wickfin bite at dusk. Honeycomb rays bite whenever they want.',
          'I love it here and I hate it here. It is beautiful, and every light in it is a tithe.',
        ],
      },
    ],

    // ── The Corona Court ────────────────────────────────────────────
    corona: [
      {
        when: KING,
        lines: [
          'They let the captive sun go. Opened the bottle at dawn. It just... drifted up and kept going.',
          'Flux watched until it was a dot. Then he said "it was always going to leave". He did not sound sad.',
        ],
      },
      {
        when: { prince: 'flux' },
        lines: [
          'Flux is down. The sun-lamp is flickering in its bottle like it is deciding something.',
          'Every lamp on the isle was bled to keep it lit. Iven at the lighthouse says his lamp is brighter already.',
        ],
      },
      {
        when: { courtReady: 'corona' },
        lines: [
          'Flux\'s observatory is open. He throws arcs of plasma that loop back on themselves. Read the loop.',
          'When he splits in two, the lobes chase each other. Get between them at the wrong moment and — well.',
        ],
      },
      {
        lines: [
          'The Corona Court. They caught a sun. A small one. They keep it in a bottle of magnets on that plateau.',
          'The glass under your feet was sand once. The sun-lamp fused it. Do not look straight up. I mean it.',
          'Prince Flux is the clever one. Too clever. He talks about the sun like it is a pet he is fond of.',
          'My pans are humming. Literally. Something about the conduits. Do not touch the blue pipes.',
        ],
      },
    ],

    // ── The Caldera Court ───────────────────────────────────────────
    caldera: [
      {
        when: KING,
        lines: [
          'The Kiln door is open and the furnace is out. You can see the stars through the citadel roof.',
          'Basalt sits on the rim most nights. He says the mountain is quieter without its father in it.',
        ],
      },
      {
        when: princes(6),
        lines: [
          'All six. That is the Kiln door up on the north rim. It is unlocked now. I can feel it from here.',
          'I said I would never walk up there. Twenty years of every road on the isle but that one.',
          'Go on ahead. I will be... I will be behind you. A little behind you. Go.',
        ],
      },
      {
        when: { prince: 'basalt' },
        lines: [
          'Basalt is down. The lava rivers are crusting over. Fishers will be up here with obsidian rods by dawn.',
          'He was the eldest son. Stone through and through, they said. He held the Kiln door for his father.',
          'The door up on the rim stays shut until every prince is down. All six. That is the King\'s seal.',
        ],
      },
      {
        when: { courtReady: 'caldera' },
        lines: [
          'Basalt\'s keep is open. He stands in basalt columns and the floor gives way to lava around him.',
          'When the caldera wakes, find high ground. When he armours up, make him erupt and crack his own shell.',
        ],
      },
      {
        lines: [
          'The Caldera Court. The inside of the mountain, with the lid off. Everything here is either hot or hotter.',
          'Up on the north rim — see that iron door? That is the way into the Kiln. Six seals. One per prince.',
          'The lava fishes, if you have an obsidian rod. Magma carp. Do not ask what they eat.',
          'I have not been this close to the Kiln since I was nine. My hands will not stop shaking. Ignore them.',
        ],
      },
    ],

    // ── The Kiln ────────────────────────────────────────────────────
    kiln: [
      {
        when: KING,
        lines: [
          'I came up after all. All the way. Every hall.',
          'I found Hal\'s cup. On a ledge in the stoker\'s gallery. Tin, dented, his name scratched on the bottom.',
          'There are tally marks scratched by it. Hundreds. He worked the furnaces for years. He was alive. For years.',
          'And under the tallies, small, like he was hiding it: "Tam — not your fault."',
          'I have been carrying that fire for twenty years. I think... I think I can put it down now.',
          'Thank you. That is all. Thank you. Now let us get out of this oven.',
        ],
      },
      {
        when: { encounter: 'kiln-warden-3' },
        lines: [
          'The last gate. The throne room is up there. I can hear him — the King breathes like a forge.',
          'He has four ways of burning. Seated, standing, the room itself, and then himself. Do not stop moving.',
          'I am right behind you. I mean it this time. Right behind.',
        ],
      },
      {
        when: { encounter: 'kiln-warden-2' },
        lines: [
          'The bellows gallery. Feel that wind? It is breathing for the whole citadel.',
          'There is a quench lever on the west side. Pull it and the slag channel crusts over. Do not walk it hot.',
          'The stokers lived up here. There are cots in the alcoves. Cups. Spoons. They lived here.',
        ],
      },
      {
        when: { encounter: 'kiln-warden-1' },
        lines: [
          'The brandline. Those irons on the belts were heated for every child born on this isle.',
          'The belts push you. Cross them at an angle and do not fight them head on.',
          'And the arms sweep in a circle. Count them round. Go when they pass. Go, do not wait.',
        ],
      },
      {
        lines: [
          'I am here. I am inside the Kiln. I said I never would, and I am standing in it.',
          'The jets fire in a pattern. Watch two rounds before you move. If you get caught, you wake at the last marker.',
          'There is a quench lever in the east alcove. Pull it before you try the slag channel. Please.',
          'If you find anything up here — a cup, a name, anything with "Hal" on it — tell me. Just tell me.',
        ],
      },
    ],
  },

  general: [
    {
      when: KING,
      lines: [
        'King Ashgrave is ash. I keep saying it under my breath like a charm.',
        'The tithe fires are going out across the isle. Not cold — just let go. People are choosing their own fires.',
        'Somebody asked me what I will do now. I said I will mend kettles. Then I said I will go to sea. Both, maybe.',
        'Your genes — the G key, the tree of whatever-it-is you grow with Orbs. You must have a forest by now.',
        'When you sail on, the boatwright can fit an Uber-upgrade if you ever pull one off a sea beast. Brazier turret!',
        'Go. Other isles. Other crowns. I will be the loud boat behind you with all the pans.',
      ],
    },
    {
      when: princes(6),
      lines: [
        'All six princes. The isle is free except for one mountain. You know which.',
        'The Kiln door is up on the Caldera\'s north rim. Six seals, all broken now.',
        'Three halls, a warden at the end of each. Then the throne. Eat something at the Scorched Loaf first.',
        'Hal went up that road when he was twelve. I was nine. I let the fire go out. I was supposed to watch it.',
        'I have never told anyone that out loud. Funny who you tell things to.',
      ],
    },
    {
      when: princes(5),
      lines: [
        'Five princes! One left. The isle can smell it — the barges are sitting idle at the quay.',
        'The King has not been seen in a week. They say he sits on his throne in the Kiln and does not move.',
        'He is not resting. He is waiting. That is worse.',
        'Remember: meals from the bakery last one fight. Charms last forever. Three at once, choose well.',
      ],
    },
    {
      when: princes(4),
      lines: [
        'Four courts! People are starting to say your name in the market. Not loudly. But saying it.',
        'The wardens look at the ground now when they pass. They used to look at wrists.',
        'Have you been spending your Orbs? G opens your gene tree. The deeper roots are worth the climb.',
        'I told someone about Hal yesterday. My brother. I have never told anyone. I will tell you, one day.',
      ],
    },
    {
      when: princes(3),
      lines: [
        'Three courts. Half the isle. I keep catching myself whistling. Coalwhistle by name, it turns out.',
        'Have you a boat yet? Hobb at the Emberport dock builds them. You will want one when this is done.',
        'Somebody painted over a brand on a door in Candlewick. Just white. Just a white door. People stop and stare.',
      ],
    },
    {
      when: princes(2),
      lines: [
        'Two princes down. The King knows your face now, I would bet on it.',
        'Quests pay in Orbs mostly — those little lights. Folk here do not know what they are. You do, I hope.',
        'If you get stuck on a fight, try another court and come back stronger. The roads all go round.',
        'Old Pell at the nets has a story about a Kingscale. Ask him. Then get an iron rod. You will see.',
      ],
    },
    {
      when: princes(1),
      lines: [
        'One prince down! I heard it from three different pans — I mean people. Three different people.',
        'Every prince drops something of theirs. An artifact. You can wear one at a time. Pick the loud one.',
        'Each prince also leaves a key. Keys open things — gates, coves, the odd sealed chest.',
        'Some of the courts are harder than others. Powder and Boilerworks next, I would say. Caldera last.',
      ],
    },
    {
      lines: [
        'Six courts, six princes, one King. The Hearth Court first — it is the gentlest, if anything here is gentle.',
        'Press E near anyone to talk. Near water with a rod, E casts. Near a counter, E opens the counter.',
        'TAB is your pack. Equip charms there. G is your gene tree — Orbs grow it. M is the isle map.',
        'Fish in the sea off the Emberport pier. Sal sells the rods. Bettany cooks what you catch into meals.',
        'Boats are at Hobb\'s dock on the east beach. Not yet, though — the isle first. The sea will wait.',
        'Waystones! Touch one in every court and the map lets you jump between them.',
        'My pans? Tin, copper, one iron one I use for hitting wardens. Allegedly. Never proven.',
        'Lose a fight and you wake where you stood before it, a bit scorched. Nothing on this isle is final. Almost.',
        'If a road is barricaded, somebody wants something done first. Ask around. Somebody always knows.',
      ],
    },
  ],
};
