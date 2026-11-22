import type { Cond, NpcDef, NpcLook, Pt, Talk } from '../../../../IslesTypes';
import { AT } from './layout';

/**
 * The people of Terminus — Voltreach's harbour, where the great cable comes ashore and every
 * Outer Sea crossing lands.
 *
 * Every household owes the Draw: a quota of current cranked by hand through the day, drawn off down
 * the wires each night when the Brownout Bell rings. A house that falls short is switched off — its
 * lights, its heat and the electric lock on its own front door cut — and gets a red tag nailed by
 * the door. Three tags and the house is earthed: its people go up the Crown Coil to crank in the
 * Treadmill Galleries. Terminus is a port, so it also knows what the crossing is like, and that
 * the lighthouse has been on a quarter-ration for nine years.
 *
 * Dialogue blocks are listed most specific first: Empress down → a prince down → their quest done →
 * default.
 */

const EMPRESS: Cond = { monarch: 'ohmrine' };
const princes = (count: number): Cond => ({ princesOfIsle: 'electricity', count });

export const TERMINUS_NPCS: NpcDef[] = [
  // ── Dockmaster / boatwright ───────────────────────────────────────
  {
    id: 'terminus-dock', name: 'Marlo Ferrule', title: 'Dockmaster & Boatwright', at: AT.dock,
    role: { kind: 'dock', id: 'terminus-dock' },
    look: { body: 0x7a6a62, accent: 0x2a3a5a, hat: 'souwester', traits: ['beard', 'tool', 'apron'], size: 1.25, eye: 0xc8e0ff },
    talks: [
      {
        when: EMPRESS,
        lines: [
          'The wires are down off the Cable House. All of them. I stood under the first pylon and it was SILENT.',
          'Forty years that hum was in my teeth. I thought it was my teeth. It was her. Now I can hear the sea.',
          'Want a hull? I can caulk with pitch heated over a fire now. A real fire. I keep looking at it.',
        ],
      },
      {
        when: { prince: 'sprocket' },
        lines: [
          'Sprocket\'s down and the Bounce Court is selling rubber again. Fenders! I have real fenders on the slip.',
          'Hulls used to come back from the Breakers stove in. Now they bounce. Sort of. It is very undignified.',
        ],
      },
      {
        when: { questDone: 'terminus-short-current' },
        lines: [
          'Cutwell went off up the Cableway with his tag-pouch empty. Abel Pennick bought me a drink. Abel!',
          'You came off the Outer Sea and stopped an earthing before your boots dried. Terminus noticed.',
        ],
      },
      {
        lines: [
          'You came over the Breakers in THAT? And you are standing up? Sit down. Have a rail. Everyone grips one.',
          'Welcome to Terminus. The cable comes ashore here — that black thing on the trestles. Do not lick it.',
          'Boats and hulls: me. Fishing: Gus, east quay. Bread: Delphine at the Element. Quotas: the Meter House.',
        ],
      },
    ],
    barks: [
      { when: EMPRESS, lines: ['Hear that? Nothing! Lovely nothing!', 'Pitch on a real fire!'] },
      { lines: ['Grip a rail, the quay still rolls.', 'Mind the trestles.', 'Breakers again tonight.', 'Tar, oakum, rivets.'] },
    ],
  },

  // ── General store ─────────────────────────────────────────────────
  {
    id: 'terminus-store', name: 'Ottoline Brass', title: 'Sockets & Sundries', at: AT.store,
    role: { kind: 'shop', id: 'terminus-store' },
    look: { body: 0xb0948a, accent: 0x2e5a46, hat: 'goggles', traits: ['glasses', 'satchel', 'apron'], size: 0.92, eye: 0xa8ffd0 },
    talks: [
      {
        when: EMPRESS,
        lines: [
          'I have a box of candles under the counter. I have had it for eleven years. I am putting it ON the counter.',
          'Fuses are half price. Nobody needs as many fuses when nobody is drawing you off down a wire every night.',
        ],
      },
      {
        when: { prince: 'byte' },
        lines: [
          'Byte\'s down. The Tabulator in the Circuit Court reckoned every price on the isle. It has stopped.',
          'So I have had to decide what things cost myself. It is exhausting. I have priced a crank-handle at "fair".',
        ],
      },
      {
        when: { questDone: 'terminus-short-current' },
        lines: [
          'The Pennicks bought a new crank-wheel off me on credit. First credit I have given in years. Do not tell.',
          'They paid a turn of it already, in cranked current. I have a jar of it. I do not know what to do with it.',
        ],
      },
      {
        lines: [
          'Sockets & Sundries! Fuses, bulbs, crank-handles, wire by the yard. And charms, for the visitor who fights.',
          'A charm runs while you fight. Equip three — TAB, then pick. The bulb sign is lit. I paid. I always pay.',
          'Food is at the counter too. Crank-cake keeps you on your feet. Brine tea keeps you awake through the Bell.',
        ],
      },
    ],
    barks: [
      { when: EMPRESS, lines: ['Candles! Openly! On the counter!'] },
      { lines: ['Fuses by the jar!', 'Wire by the yard.', 'Bulbs graded bright to dim.', 'Paid my Draw. Always do.'] },
    ],
  },

  // ── Tackle shop ───────────────────────────────────────────────────
  {
    id: 'terminus-tackle', name: 'Gus Varnish', title: 'Varnish & Line', at: AT.tackle,
    role: { kind: 'tackle', id: 'terminus-tackle' },
    look: { body: 0x8a7a6a, accent: 0x1a1612, hat: 'beanie', traits: ['rod', 'pipe', 'apron'], size: 1.08, eye: 0xc8e8ff },
    talks: [
      {
        when: EMPRESS,
        lines: [
          'The cable eels have gone quiet. No current in the cable to eat, see. They are just eels now. Sulking.',
          'I hooked a thunder marlin off the pier at dawn and she lit the whole harbour. Let her go. Felt right.',
        ],
      },
      {
        when: { prince: 'isotope' },
        lines: [
          'Isotope\'s down. The Halflife cooling pond is fishable now nobody is metering every glowing gar.',
          'Insulated rod only. Anything else, the line goes green and so do you. I sell the insulated rod. Funny that.',
        ],
      },
      {
        when: { questDone: 'terminus-fishlight' },
        lines: [
          'Fenna\'s lamp is running on herring. Every fisher in Terminus has started bringing her the bright ones.',
          'Best use of a volt herring I ever heard of. Better than eating it. Mind, I still eat it.',
        ],
      },
      {
        lines: [
          'Varnish & Line. Every rod dipped in rubber at the butt — out here, the fish bite back with current.',
          'Sea fish take any rod. Off the pier or the jetty: herring for learning, snapper for supper, eels for trouble.',
          'The mill race and the cooling pond and that well in the Superposition — insulated rod. I make them. Dear.',
        ],
      },
    ],
    barks: [
      { when: EMPRESS, lines: ['Eels are just eels now.', 'Insulated rods, half off!'] },
      { lines: ['Rubber on the butt!', 'Herring running bright.', 'Mind the eel, it bites in volts.', 'Gutta-percha, hot.'] },
    ],
  },

  // ── Bakery ────────────────────────────────────────────────────────
  {
    id: 'terminus-baker', name: 'Delphine Coyle', title: 'The Element', at: AT.baker,
    role: { kind: 'bakery', id: 'terminus-bakery' },
    look: { body: 0xc8a08a, accent: 0xd8603a, hat: 'chef', traits: ['apron', 'scarf'], size: 1.1, eye: 0xffc890 },
    talks: [
      {
        when: EMPRESS,
        lines: [
          'I built a wood oven in the yard yesterday. Out of bricks off the Meter House steps. Do not tell Imogen.',
          'The bread is worse. Smoky. Lumpy. I have never been so happy with a bad loaf. Have one. Have three.',
        ],
      },
      {
        when: { prince: 'volt' },
        lines: [
          'Volt\'s down and the Dynamo is not taking its cut off the line. My oven ran hot for nothing last night.',
          'I baked till the Bell out of spite. Forty loaves. Gave them away on the Row. Everybody cried. Crumbs too.',
        ],
      },
      {
        lines: [
          'The Element! Named for my oven. Look at it glow — nichrome, coiled. It eats a household\'s Draw a day.',
          'So I bake for half the Row, and they crank for me. A loaf is a turn. That is the only sum I like.',
          'Bring me fish and coin and I will bake you something for a fight. One fight. The oven does not do for ever.',
        ],
      },
    ],
    barks: [
      { when: EMPRESS, lines: ['Smoky bread! Hot!', 'Real crust, from a real fire!'] },
      { lines: ['Hot from the element!', 'A loaf is a turn!', 'Herring pasties!', 'Mind the coil, it is red for a reason.'] },
    ],
  },

  // ── The Meter House chalker ───────────────────────────────────────
  {
    id: 'terminus-chalker', name: 'Imogen Slate', title: 'Chalker of the Meter House', at: AT.chalker,
    look: { body: 0xa89a92, accent: 0x6a8aff, hat: 'cap', traits: ['book', 'glasses'], size: 0.96, eye: 0xd8e8ff },
    talks: [
      {
        when: EMPRESS,
        lines: [
          'I wiped the board this morning. All of it. Every name and every stroke. It took me until noon.',
          'Then I wrote the names back up. Without the strokes. Just the names. It looked like a war memorial.',
          'So I wrote under it: "Lit." That is the whole board now. Every house in Terminus: lit.',
        ],
      },
      {
        when: { prince: 'both' },
        lines: [
          'Both is down. The Superposition prince. His tallies were the worst: a house there was short AND paid.',
          'I always chalked the short. Now I find I cannot remember why I chose that one.',
        ],
      },
      {
        when: { questDone: 'terminus-last-bell' },
        lines: [
          'I gave you the clapper key and I have not been switched off for it. I keep checking the door-lock.',
          'Twenty years I chalked the short houses. I am not proud. I am trying to be something else now.',
        ],
      },
      {
        when: { questDone: 'terminus-short-current' },
        lines: [
          'I chalked the Pennicks forty turns short and you stopped the tag. I wrote "paid" over it. In red.',
          'Nobody checks. Nobody ever checks the chalk. That is the trick of it. That has always been the trick.',
        ],
      },
      {
        lines: [
          'Name? — Visitor. Visitors owe a quarter-turn for the night they land. I will chalk you in. There.',
          'That is the board. Every house on the isle\'s south shore. Strokes cranked; red is short; copper is earthed.',
          'I only chalk. I do not switch anyone off. That is the Linesmen. I want that clear.',
        ],
      },
    ],
    barks: [
      { when: EMPRESS, lines: ['Lit. Lit. Lit. Lit.'] },
      { lines: ['Strokes in fives, please.', 'Red is short.', 'I only chalk.', 'Bell in an hour.'] },
    ],
  },

  // ── The ringer of the Brownout Bell ───────────────────────────────
  {
    id: 'terminus-ringer', name: 'Ambrose Toll', title: 'Ringer of the Brownout Bell', at: AT.ringer,
    look: { body: 0x8a8078, accent: 0x6a4a1e, hat: 'hood', traits: ['cane', 'beard', 'scarf'], size: 1.02, eye: 0xd8c8a8 },
    talks: [
      {
        when: EMPRESS,
        lines: [
          'I rang it once more. Wren asked me to. Once, long, for the Grid going out. Then I sat down under it.',
          'My hands do not know what to do at nightfall. They keep reaching for the rope. I sit on them.',
        ],
      },
      {
        when: princes(4),
        lines: [
          'Four courts. The Bell still rings, and still the Draw comes down the wire. But the wire comes down thinner.',
          'I can tell by the rope. The Grid pulls on it, somehow, through the bell. Tonight it pulled like an old man.',
        ],
      },
      {
        when: { questDone: 'terminus-last-bell' },
        lines: [
          'The clapper is at the bottom of the harbour and the Bellwarden is in bed with a cold compress. Hah.',
          'No Bell, no Draw. It is in their own law. Terminus slept with its lights on. First time in forty years.',
        ],
      },
      {
        lines: [
          'Forty years I have rung the Brownout Bell. Every night. At the stroke, the lights in Terminus dip.',
          'That is the Draw going up the wire. Every turn the town cranked all day, pulled away while it rings.',
          'And the houses that came up short go dark and stay dark. I can see which, from here. Every night.',
        ],
      },
    ],
    barks: [
      { when: EMPRESS, lines: ['My hands want the rope.', 'One last time. That was enough.'] },
      { lines: ['An hour to the Bell.', 'Forty years.', 'Crank, Terminus, crank.', 'Mind the rope.'] },
    ],
  },

  // ── Abel Pennick, two tags by his door ────────────────────────────
  {
    id: 'terminus-pennick', name: 'Abel Pennick', title: 'Crank-Hand, Crank South', at: AT.pennick,
    look: { body: 0x9a8070, accent: 0x5a3a2a, hat: 'beanie', traits: ['tool', 'bandage'], size: 1.12, eye: 0xc8d8f0 },
    talks: [
      {
        when: EMPRESS,
        lines: [
          'I took the tags off the door and burned them. In the grate. A fire, in my own grate. Wynn watched.',
          'She has never seen one. She put her hand out to it. I said careful. She said "it is warm, Da". It is.',
        ],
      },
      {
        when: princes(2),
        lines: [
          'Two princes! Wynn cranked for fun yesterday. For FUN. She lit her own room with it and read a book.',
          'The Linesmen have not come down Crank South in a week. People leave their doors on the latch.',
        ],
      },
      {
        when: { questDone: 'terminus-short-current' },
        lines: [
          'Ottoline gave us a new wheel on credit. It turns like butter. Wynn can do a hundred turns before supper.',
          'Two tags still on the door. But not three. Not three. I touch them every morning to be sure.',
        ],
      },
      {
        lines: [
          'Our wheel cracked on Tuesday. The rim, right through. I have been cranking the stub of it with a spanner.',
          'Wynn does the night shift. She is eleven. She does it with both hands and her eyes shut.',
          'Two tags on the door. Tonight makes three if we are short. Three and they take us up the Coil.',
        ],
      },
    ],
    barks: [
      { when: EMPRESS, lines: ['A fire in the grate!', 'Careful, Wynn. It is warm.'] },
      { lines: ['Two tags. Not three.', 'Turn, turn, turn.', 'My arms.', 'Wynn, go to bed. I will do it.'] },
    ],
  },

  // ── Nan Wickersley, a lamplighter's widow ─────────────────────────
  {
    id: 'terminus-nan', name: 'Nan Wickersley', title: 'Lamplighter\'s Widow', at: AT.nan,
    look: { body: 0xb8a8a0, accent: 0x3a2a3a, hat: 'hood', traits: ['cane', 'scarf', 'satchel'], size: 0.86, eye: 0xffd890 },
    talks: [
      {
        when: EMPRESS,
        lines: [
          'Wren lit Tam\'s round last night. All of it. Every lamp he ever trimmed. I walked behind her.',
          'At the end of the Row she gave me the pole and I lit the last one. My hands shook. It caught first go.',
          'They say the earthed are coming down from the Coil. I have put his slippers by the door. Just in case.',
        ],
      },
      {
        when: princes(3),
        lines: [
          'Half the courts! I lit my candle last night at the window with the curtain OPEN. Nobody came.',
          'I sat up till dawn waiting for the Flame Watch to come. Nobody came. I have not slept so well in years.',
        ],
      },
      {
        when: { questDone: 'terminus-last-candle' },
        lines: [
          'His wicks, all four, twisted together into one candle. It burned three hours. I timed it by his watch.',
          'The Snuffer went off with frost on his eyebrows. Tam would have laughed till he cried. So did I.',
        ],
      },
      {
        lines: [
          'This was the Lamplighters\' Hall. Five ladders. Tam\'s was the end one. The empty chain, see?',
          'They earthed the lamplighters first. Twelve years ago. "A candle is a theft from the Grid."',
          'Every lamp on the isle is still standing. Cold. The Grid never bothered taking them down. Why would it?',
        ],
      },
    ],
    barks: [
      { when: EMPRESS, lines: ['Every lamp, lit.', 'His slippers are by the door.'] },
      { lines: ['Tam\'s was the end ladder.', 'Cold lamps, cold lamps.', 'I keep his watch wound.'] },
    ],
  },

  // ── The captain of the cable-ship ─────────────────────────────────
  {
    id: 'terminus-captain', name: 'Captain Rhosyn Splice', title: 'Master of the Long Patience', at: AT.captain,
    look: { body: 0x8a7064, accent: 0x6a1e16, hat: 'tricorn', traits: ['pipe', 'scarf', 'eyepatch'], size: 1.15, eye: 0xc8e8ff },
    talks: [
      {
        when: EMPRESS,
        lines: [
          'The Grid is cut and the cable is dead and for the first time in her life the Long Patience has no job.',
          'I am going to take her out past the Breakers and just... sail. Nowhere. With the crew. Paid in herring.',
        ],
      },
      {
        when: { prince: 'polar' },
        lines: [
          'Polar\'s down and my compass points north again instead of at the Lodestar. I nearly ran us onto a rock.',
          'Forty years correcting for a lodestone. Now I have to steer straight. My arms do not know how.',
        ],
      },
      {
        when: { questDone: 'terminus-chewed-cable' },
        lines: [
          'The Purser has refunded the crew. Refunded! He had to sit down to write it. I lent him my pipe.',
          'And Hobb is to come down from the Galleries. The Meter House said "an error". An error. Forty weeks.',
        ],
      },
      {
        lines: [
          'The Long Patience. Cable-ship. We lay the line and mend it — out past the Breakers, in the Outer Sea.',
          'The great cable runs from here to the storm-rods out on the reefs. Every one of them is drinking the sky.',
          'And when the line faults, the Grid docks my crew for every amp that spilled. We crank it back. All of it.',
        ],
      },
    ],
    barks: [
      { when: EMPRESS, lines: ['No job! Marvellous!', 'Where shall we not go today?'] },
      { lines: ['Splice tight, splice dry.', 'Breakers again.', 'Faulted at the eleventh rod.', 'Mind the gangway.'] },
    ],
  },

  // ── The keeper of the light ───────────────────────────────────────
  {
    id: 'terminus-keeper', name: 'Fenna Rook', title: 'Keeper of the Light', at: AT.keeper,
    look: { body: 0x9a8a80, accent: 0x2a4a6a, hat: 'goggles', traits: ['lantern', 'scarf', 'glasses'], size: 1.0, eye: 0xc8f0ff },
    talks: [
      {
        when: EMPRESS,
        lines: [
          'Full light. FULL. I put in Ottoline\'s best bulb and a can of oil besides. You can see the Breakers from here.',
          'Eleven boats came in last night. Eleven! Nobody hit anything. I made a mark on the wall for each.',
        ],
      },
      {
        when: princes(2),
        lines: [
          'The herring lamp is holding. Two princes down and the boats are coming in by fishlight. Fishlight!',
          'A boy from the Halflife road brought me a glowing gar to add. I said no. It glowed the wrong colour.',
        ],
      },
      {
        when: { questDone: 'terminus-fishlight' },
        lines: [
          'Look at her burn! Four herring in the lens jars, blinking blue. The Assessor\'s needle went right round.',
          'It is not metered light. It is fish. You cannot meter a fish. I checked. There is no form.',
        ],
      },
      {
        lines: [
          'The light is on a quarter-ration. A lighthouse "draws a household\'s quota a night", says the Grid.',
          'So it gutters. Out past the Breakers they cannot see it. Boats come in blind over the Outer Sea.',
          'That rod on top takes the storm every few seconds, and every bolt goes up the wire to the Coil. Not to me.',
        ],
      },
    ],
    barks: [
      { when: EMPRESS, lines: ['Full light!', 'Eleven boats, eleven marks.'] },
      { lines: ['Quarter-ration.', 'Mind the rod, it bites.', 'Boats coming in blind.', 'There goes another bolt.'] },
    ],
  },
];

// ── The crowd ───────────────────────────────────────────────────────

const CROWD_LOOKS: NpcLook[] = [
  { body: 0x8a7a70, accent: 0x2a3a5a, hat: 'cap', traits: ['tool'] },
  { body: 0xa8948a, accent: 0x5a3a2a, hat: 'beanie', traits: ['satchel'] },
  { body: 0x7a6a62, accent: 0x1a1612, hat: 'souwester', traits: ['rod'], size: 1.15 },
  { body: 0xb0a098, accent: 0x6a8aff, hat: 'none', traits: ['apron'] },
  { body: 0x9a8a80, accent: 0x3a2a3a, hat: 'hood', traits: ['cane'] },
  { body: 0x8a7064, accent: 0xc8783e, hat: 'antenna', traits: ['pack'] },
  { body: 0xb8a8a0, accent: 0x4a2e28, hat: 'none', size: 0.74 },
  { body: 0x7a7068, accent: 0x2e5a46, hat: 'cap', traits: ['bandage', 'tool'] },
];

export const TERMINUS_CROWD: { count: number; looks: NpcLook[]; paths: Pt[][]; barks: Talk[] } = {
  count: 14,
  looks: CROWD_LOOKS,
  paths: [
    // The Cableway, the landing to the north road and back.
    [{ x: 1300, y: 1250 }, { x: 1300, y: 900 }, { x: 1300, y: 400 }, { x: 1300, y: 140 }, { x: 1300, y: 760 }],
    // Brownout Row, end to end.
    [{ x: 160, y: 750 }, { x: 800, y: 744 }, { x: 1600, y: 756 }, { x: 2440, y: 750 }],
    // The quay: the slip, the landing, the cable-ship.
    [{ x: 700, y: 1240 }, { x: 1100, y: 1270 }, { x: 1600, y: 1260 }, { x: 2150, y: 1250 }, { x: 1500, y: 1220 }],
    // The queue at the Meter House to have the day's turns chalked.
    [{ x: 820, y: 620 }, { x: 1120, y: 620 }, { x: 1140, y: 680 }, { x: 830, y: 680 }],
    // Crank Row West.
    [{ x: 140, y: 440 }, { x: 700, y: 440 }, { x: 720, y: 560 }, { x: 140, y: 560 }],
    // Crank Row East.
    [{ x: 1620, y: 350 }, { x: 2460, y: 350 }, { x: 2460, y: 460 }, { x: 1620, y: 460 }],
    // From the Grid Stores to the cable-ship.
    [{ x: 1620, y: 1120 }, { x: 1900, y: 1130 }, { x: 1950, y: 1270 }, { x: 1700, y: 1250 }],
    // Round the shops in the east.
    [{ x: 1600, y: 640 }, { x: 2200, y: 640 }, { x: 2260, y: 860 }, { x: 1640, y: 860 }],
  ],
  barks: [
    { when: EMPRESS, lines: [
      'The wires are quiet!', 'Wren lit the lamp on our corner.', 'My door opened without a meter.',
      'My uncle came down from the Coil. He cannot stop walking.', 'Fire! In the open!',
    ] },
    { when: princes(4), lines: [
      'Four courts free!', 'The Linesmen are not coming down the Row.', 'They say the Coil is drinking itself dry.',
    ] },
    { when: { prince: 'volt' }, lines: [
      'The Dynamo prince is down!', 'Lights did not dip at the Bell last night.', 'Shh — not by the Meter House.',
    ] },
    { lines: [
      'Crank, crank, crank.', 'How many turns are you short?', 'The Bell in an hour.', 'They earthed the Morrows on Tuesday.',
      'Mind the trestles.', 'Herring running bright tonight.', 'Two tags. Two.', 'Do not look at the Meter House.',
    ] },
  ],
};
