import type { AreaDef, NpcDef, NpcLook, Talk } from '../../../../IslesTypes';

/**
 * The people of the Workshop Court.
 *
 * The Workshop makes the Heliostat's mirrors: blanks blown and cast in the glassblowers' yard,
 * ground true in the grinding hall, silvered, inspected, and hoisted on the crane to the summit.
 * Everyone here makes the thing that keeps the noon pinned — and knows it. The lens-grinders are
 * going blind from the glare off their own work; the Patent Office refuses any invention that
 * casts shade, stores dark or blocks the sun; Clears are set to polish mirrors, because a Clear
 * leaves no shadow on the glass. Prince Artifex, the Radiance of the Workshop, is building the
 * Magnum Opus — a walking armature of mirrors to carry the noon into any shadow that is reported.
 * People here talk in measurements, and they are very tired.
 */

const PRINCE = { prince: 'artifex' } as const;
const DESPOT = { monarch: 'auriel' } as const;

const Q_SMOKED = 'workshop-q-smoked-glass';
const Q_SUPPER = 'workshop-q-quench-supper';
const Q_CLOUD = 'workshop-q-cloud-engine';
const Q_OWL = 'workshop-q-night-owl';
const Q_MIRROR = 'workshop-q-last-mirror';

export const WORKSHOP_NPCS: NpcDef[] = [
  // ── Odile Ferrule — the shop ─────────────────────────────────────────
  {
    id: 'workshop-ferrule',
    name: 'Odile Ferrule',
    title: 'The Spare Parts',
    look: { body: 0xdcc0a0, accent: 0xd6a646, hat: 'goggles', traits: ['apron', 'tool', 'satchel'], size: 1.05, eye: 0x8ae6ff },
    at: { x: 1400, y: 900 },
    role: { kind: 'shop', id: 'workshop-shop' },
    talks: [
      {
        when: DESPOT,
        lines: [
          'I sold a box of candles this morning. Candles! For the dark! I had to send to the Arcane Court for them.',
          'The trinkets are on the rail, same as ever. Everything else I stock is suddenly for night-time.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The Prince\'s armature is standing in the atelier with its lens covered in a cloth. A CLOTH. Shade!',
          'Half the yard\'s gone to look at it. I\'m selling more than I have all year. Tinker\'s charms, three a body.',
        ],
      },
      {
        when: { questDone: Q_CLOUD },
        lines: [
          'Hesper Vane\'s model is on her bench again. Nobody\'s said a word. Everyone\'s walked past it twice.',
          'If she ever needs a part, she gets it at cost. Don\'t tell her I said so.',
        ],
      },
      {
        lines: [
          'Spare parts! Every gear, spring and lens in that yard came through my drawers at some point.',
          'Charms on the rail — you can wear three. Bits of the Workshop that took to fighting, I like to say.',
          'Nothing that casts shade, mind. The Office sends a man round to check. He holds everything up to the sun.',
        ],
      },
    ],
    barks: [
      { when: PRINCE, lines: ['Candles, soon. Somebody find me candles.', 'Three charms a body!'] },
      { lines: ['Springs, gears, glass!', 'Spare parts for spare hands.', 'Lens-cloths, three for a coin.', 'Nothing that casts shade.'] },
    ],
  },

  // ── Wendel Pask — the lens-grinder going blind ───────────────────────
  {
    id: 'workshop-pask',
    name: 'Wendel Pask',
    title: 'Lens-Grinder, Bench Four',
    look: { body: 0xd0b498, accent: 0x8a6420, hat: 'cap', traits: ['glasses', 'apron', 'beard'], size: 1, eye: 0xd8f8ff },
    at: { x: 1000, y: 700 },
    talks: [
      {
        when: DESPOT,
        lines: [
          'I saw a shadow on the wall last night. My own, long as a ladder. I sat and watched it till I fell asleep.',
          'My good eye\'s getting better. The doctor says it\'s the dark. Imagine. A cure that\'s just — less.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The quota\'s off. The bench is quiet. I ground a lens this morning for nothing — just to see if I still could.',
          'It came out smoked. Black as a beetle. I didn\'t even try to hide it.',
        ],
      },
      {
        when: { questDone: Q_SMOKED },
        lines: [
          'I wear them at the bench now, under my goggles. The glare off a blank is just — a glow. A soft glow.',
          'Forty of us have a pair. Mother Cullet keeps fusing them. The Office hasn\'t noticed. Glass is glass.',
        ],
      },
      {
        when: { quest: Q_SMOKED },
        lines: [
          'Soot-glass. Black drops from the bottom of the furnaces — the bits the gaffers throw away. Four will do.',
          'Then Mother Cullet. She\'ll fuse them thin. Don\'t say "smoked" where the Office can hear.',
        ],
      },
      {
        lines: [
          'Bench four. Thirty-one years grinding mirror blanks for the Heliostat. Left eye\'s gone white.',
          'The glare off a true-ground blank is the sun twice over. You look away, you lose the line. So you don\'t.',
          'Every grinder in the hall is going the same way. We grind the thing that blinds us. That\'s the job.',
        ],
      },
    ],
    barks: [
      { when: { questDone: Q_SMOKED }, lines: ['Soft glow. Lovely soft glow.', 'Glass is glass.'] },
      { lines: ['Keep the line, keep the line.', 'One more pass.', 'Can\'t see the edge.', 'Rouge! Who\'s got the rouge?'] },
    ],
  },

  // ── Mother Cullet — the old glassblower ──────────────────────────────
  {
    id: 'workshop-cullet',
    name: 'Mother Cullet',
    title: 'Gaffer Emerita of the Yard',
    look: { body: 0xc8a688, accent: 0xff8a2a, hat: 'headwrap', traits: ['apron', 'pipe', 'bandage'], size: 0.95, eye: 0xffd27a },
    at: { x: 720, y: 1320 },
    talks: [
      {
        when: DESPOT,
        lines: [
          'I banked the furnace last night. Banked it! First time in twenty-two years. Sat by it in the dark.',
          'You know what glass does in the dark? It glows. Just a bit. Like it\'s remembering the fire.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'His Radiance sent down for twelve dozen bulbs of clear glass and then cancelled. Never cancelled anything.',
          'I made them anyway. Coloured. Deep blue. They throw blue on the floor. Like evening, almost.',
        ],
      },
      {
        when: { questDone: Q_SMOKED },
        lines: [
          'I fuse soot-glass for any grinder who asks, now. Thin as a fingernail. Clarity says glass. It\'s glass.',
          'Sixty years at the furnace and the best thing I ever made is a pair of spectacles you can\'t see through.',
        ],
      },
      {
        when: { quest: Q_SMOKED, stage: 1 },
        lines: [
          'Soot-glass, is it? For Wendel? Course it is. Give it here, I\'ll have it on the marver by the time you blink.',
        ],
      },
      {
        lines: [
          'Sixty years a gaffer. I blew the first blanks for the Heliostat. Didn\'t know what they were for. Nobody did.',
          'Now the yard runs both furnaces round the clock. No night to bank them in. The bricks never cool.',
          'You want to know a secret? The black drops off the bottom of the pot. Nobody wants them. I keep them.',
        ],
      },
    ],
    barks: [
      { when: PRINCE, lines: ['Blue glass. Lovely blue.', 'Let the pot rest a bit.'] },
      { lines: ['Gather, turn, blow.', 'Mind the pipe, it\'s hot!', 'Never cools, this yard.', 'Marver! Somebody wipe the marver!'] },
    ],
  },

  // ── Old Sprue — keeper of the quench tank ────────────────────────────
  {
    id: 'workshop-sprue',
    name: 'Old Sprue',
    title: 'Keeper of the Quench',
    look: { body: 0xb89a80, accent: 0x2f5654, hat: 'souwester', traits: ['rod', 'scarf'], size: 1.1, eye: 0x7ab0a8 },
    at: { x: 950, y: 1330 },
    talks: [
      {
        when: DESPOT,
        lines: [
          'The steam goes straight up now, of an evening. Evening! There\'s a word I haven\'t said since I was forty.',
          'Fish bite better at dusk. I\'d forgotten. Twenty-two years and I\'d clean forgotten.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'Nobody\'s quenched a thing in two days. The tank\'s gone cool. The fish are confused. So am I.',
        ],
      },
      {
        when: { questDone: Q_SUPPER },
        lines: [
          'Ottilie and the polishers get a bleak apiece every shift now. I bring them in my coat. Nobody checks my coat.',
          'Funny, feeding people you can see through. You can watch it go down. They don\'t mind. They laugh about it.',
        ],
      },
      {
        when: { quest: Q_SUPPER },
        lines: [
          'Brass bleak, three of them. Cast off the lip — the steam won\'t bite you if you don\'t lean in.',
          'Then take them round to Ottilie at the hall. In your coat. Not in your hands.',
        ],
      },
      {
        lines: [
          'The quench tank. Every blade, every hinge, every mirror-frame in the court goes red-hot into this water.',
          'Never cools, never stills. And yet there\'s fish in it. Brass-scaled things. Bred themselves in the heat.',
          'Anything pulled out belongs to the Workshop, the sign says. I\'ve never seen the Workshop eat a fish.',
        ],
      },
    ],
    barks: [
      { lines: ['Mind the steam.', 'Hiss, hiss, hiss.', 'Something\'s biting.', 'Brass on the line!'] },
    ],
  },

  // ── Ottilie Glim — a Clear on the polishing wheels ───────────────────
  {
    id: 'workshop-glim',
    name: 'Ottilie Glim',
    title: 'Polisher (a Clear)',
    look: { body: 0xe8f0f2, accent: 0xb9d8e0, hat: 'none', traits: ['apron', 'scarf'], size: 0.9, eye: 0xffffff },
    at: { x: 1320, y: 690 },
    talks: [
      {
        when: DESPOT,
        lines: [
          'Look at my hand. Hold it up to the dark — there. There\'s colour coming back in the knuckles. Pink.',
          'Two nights. Only two, and I\'m a bit pink. I\'m going to sit in the dark every night until I\'m me.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The Prince came down the hall when it was over and looked at us polishers. Just looked. For a long time.',
          'Then he said "you never left a mark on anything". I think he meant it kindly. I\'m not sure he knows how.',
        ],
      },
      {
        when: { questDone: Q_SUPPER },
        lines: [
          'Sprue brings us fish in his coat now. We eat behind the wheels. Well. "Behind." You can see through us.',
          'Burnish still walks the hall. He just looks at the wall a lot. I think you frightened him into kindness.',
        ],
      },
      {
        when: { quest: Q_SUPPER, stage: 1 },
        lines: [
          'Fish? For us? From Sprue? Oh — quick, before Overseer Burnish comes round. Give it here.',
        ],
      },
      {
        lines: [
          'They put Clears on the polishing wheels. A Clear leaves no shadow on the glass, see. Perfect work.',
          'I slept under a table once, in my own kitchen. Two hours. The neighbours told. Now I\'m a perfect polisher.',
          'We\'re fed once a day, in the open, in the sun. Overseer Burnish counts the bites. Clears don\'t need much.',
        ],
      },
    ],
    barks: [
      { when: { questDone: Q_SUPPER }, lines: ['Bleak for supper!', 'Pink knuckles, soon.'] },
      { lines: ['Round and round.', 'Not a mark on it.', 'Can you see me? I\'m here.', 'Rouge and water, rouge and water.'] },
    ],
  },

  // ── Hesper Vane — the inventor whose cloud engine was seized ─────────
  {
    id: 'workshop-vane',
    name: 'Hesper Vane',
    title: 'Inventor, Patent Refused',
    look: { body: 0xd8bca0, accent: 0x2a5c9a, hat: 'goggles', traits: ['book', 'satchel', 'glasses'], size: 0.95, eye: 0x8ae6ff },
    at: { x: 440, y: 680 },
    talks: [
      {
        when: DESPOT,
        lines: [
          'There are real clouds now. Real ones, coming in off the sea, because the sun moves and the air moves.',
          'I stood under one this morning and cried. Mine was the size of a hat. This one was the size of the sky.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The Patent Office has shut its glass doors. Somebody hung a coat over them from the inside. A coat!',
          'I\'m filing again. Forty-one inventions. Every one of them casts shade on purpose.',
        ],
      },
      {
        when: { questDone: Q_CLOUD },
        lines: [
          'My cloud engine is on my bench. It makes a cloud the size of a hat. It rains, a little, on the hat.',
          'I run it for children. They stand under it and look up and I tell them that\'s what the sky used to do.',
        ],
      },
      {
        when: { quest: Q_CLOUD },
        lines: [
          'The boards first — find my refusal and read what they wrote. Then the pages. They tore up my drawings.',
          'Somebody always comes when you go through the Office\'s bins. Be ready for whoever it is.',
        ],
      },
      {
        lines: [
          'I invented a cloud engine. A boiler, a cold coil, a fan. It makes a cloud. A small one. It gives shade.',
          'The Patent Office refused it in an hour and seized the model in two. "Device for the Manufacture of Shade."',
          'They melt seized models on the first of the month. That\'s nine days. I have nine days.',
        ],
      },
    ],
    barks: [
      { when: { questDone: Q_CLOUD }, lines: ['A cloud the size of a hat!', 'Patent pending. Ha!'] },
      { lines: ['Nine days.', 'A boiler, a coil, a fan.', 'Refused, refused, refused.', 'They melt them on the first.'] },
    ],
  },

  // ── Tibbet — the apprentice automaton-maker ──────────────────────────
  {
    id: 'workshop-tibbet',
    name: 'Tibbet Spindle',
    title: 'Apprentice, Automata Row',
    look: { body: 0xe4c8aa, accent: 0xc06a3a, hat: 'beanie', traits: ['tool', 'pack'], size: 0.72, eye: 0xf6d98a },
    at: { x: 1820, y: 1130 },
    talks: [
      {
        when: DESPOT,
        lines: [
          'MY OWL WORKS. It works! It opened its eyes at dusk and went HOO and flew round the stall. Twice!',
          'I saw a star. A real one. Over the crane. I named it. I\'m not telling you what. It\'s mine.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The Prince sent for me! He asked how the owl\'s eyes worked. I told him. He wrote it all down.',
          'Then he said "a device that waits for the dark" very quietly, and gave me a whole gold coin.',
        ],
      },
      {
        when: { questDone: Q_OWL },
        lines: [
          'I\'ve got the eyes back in. Gizmo said sorry. Well. He said "hmph". That\'s sorry, from Gizmo.',
          'The owl still won\'t wake up. It needs dark. Mistress says there\'ll never be dark. I\'m keeping it oiled.',
        ],
      },
      {
        when: { quest: Q_OWL },
        lines: [
          'Gizmo\'s stall is down the row — he\'s got the eyes in one of his prototypes, I KNOW he has.',
          'They\'re dark lenses. Two of them. Blue-black. Ask Odile first, she sold him the brass.',
        ],
      },
      {
        lines: [
          'I made an owl! A clockwork one. It\'s got a spring that only lets go when the light goes dim.',
          'So it wakes up at night. Only there\'s no night. So it\'s never woken up. I\'ve still got it. It\'s ready.',
          'And now its eyes are gone. Tinker Gizmo took them for a "prototype". He said apprentices don\'t patent.',
        ],
      },
    ],
    barks: [
      { when: { questDone: Q_OWL }, lines: ['Ready for the dark!', 'Hoo. Hoo hoo.'] },
      { lines: ['Wind it, wind it, wind it.', 'My owl\'s eyes!', 'Apprentices don\'t patent.', 'Tick tick tick.'] },
    ],
  },

  // ── Bosun Grue — the crane foreman ───────────────────────────────────
  {
    id: 'workshop-grue',
    name: 'Bosun Grue',
    title: 'Crane Foreman',
    look: { body: 0xb08a6a, accent: 0x4a4744, hat: 'helmet', traits: ['beard', 'pack', 'bandage'], size: 1.3, eye: 0xf2c84a },
    at: { x: 2100, y: 1110 },
    talks: [
      {
        when: DESPOT,
        lines: [
          'We\'re taking the mirrors DOWN now. Off the Heliostat, one at a time, back down on my chain.',
          'I\'m going to stack them face to the wall. Every one. Let them look at stone for a change.',
        ],
      },
      {
        when: PRINCE,
        lines: [
          'The armature\'s standing in the atelier without its last mirror. Never will have it, now. Good.',
          'I\'ve had the chain off the drum and greased it. First time it\'s stopped since I took the job.',
        ],
      },
      {
        when: { quest: Q_MIRROR },
        lines: [
          'Up the winch house, then. Look at the drum. Tell me if you think a pawl could slip on its own.',
          'Then the atelier. He\'s waiting for that mirror. He can wait for you instead.',
        ],
      },
      {
        when: { courtReady: 'workshop' },
        lines: [
          'You\'ve beaten every one of his. Then you\'re the one. Come and see me, I\'ve a thing to ask.',
        ],
      },
      {
        lines: [
          'Crane foreman. Every mirror on the Heliostat went up on my chain. Four hundred and twelve of them.',
          'This one on the hook\'s not for the Heliostat. It\'s the last plate for His Radiance\'s armature.',
          'When it\'s on, he walks that thing up and down the isle, and wherever there\'s a shadow, he puts noon in it.',
        ],
      },
    ],
    barks: [
      { when: PRINCE, lines: ['Chain\'s greased and resting.', 'Let it hang.'] },
      { lines: ['Stand clear of the load!', 'Haul away!', 'Mind the flash!', 'Four hundred and twelve.'] },
    ],
  },
];

const looks: NpcLook[] = [
  { body: 0xd6b494, accent: 0xd6a646, hat: 'goggles', traits: ['apron', 'tool'] },
  { body: 0xc49a7c, accent: 0xff8a2a, hat: 'headwrap', traits: ['apron'] },
  { body: 0xe4c8ac, accent: 0x2a5c9a, hat: 'cap', traits: ['book', 'glasses'] },
  { body: 0xb8906e, accent: 0x4a4744, hat: 'helmet', traits: ['pack', 'beard'], size: 1.15 },
  { body: 0xe8f0f2, accent: 0xb9d8e0, hat: 'none', traits: ['apron'], size: 0.92 },
  { body: 0xdcbca0, accent: 0xc06a3a, hat: 'beanie', traits: ['tool'], size: 0.76 },
  { body: 0xcfa585, accent: 0x8a6420, hat: 'cap', traits: ['satchel', 'glasses'] },
  { body: 0xd9b89a, accent: 0xb83a3a, hat: 'bandana', traits: ['apron', 'tool'] },
];

const barks: Talk[] = [
  {
    when: DESPOT,
    lines: [
      'The sun went DOWN. It went down!',
      'I banked my forge for the night!',
      'Making shutters. Hundreds of shutters.',
      'Who\'s got a candle?',
    ],
  },
  {
    when: PRINCE,
    lines: [
      'The Radiance yielded!',
      'Somebody covered the armature\'s lens.',
      'No quota today. No quota!',
      'The crane\'s stopped.',
    ],
  },
  {
    when: { courtReady: 'workshop' },
    lines: [
      'Someone\'s beaten all five of His Radiance\'s.',
      'They say the stranger\'s going to the atelier.',
    ],
  },
  {
    lines: [
      'Quota\'s up again.',
      'Can\'t see the edge for the glare.',
      'Office man\'s coming — look busy.',
      'Mind the crane!',
      'Forty blanks by the bell.',
      'Every bench in the sun.',
      'Who took my calipers?',
      'My eyes. My eyes.',
    ],
  },
];

export const WORKSHOP_CROWD: NonNullable<AreaDef['crowd']> = {
  count: 14,
  looks,
  paths: [
    // Up and down Grinders' Row.
    [{ x: 160, y: 800 }, { x: 1200, y: 800 }, { x: 2150, y: 800 }, { x: 1200, y: 800 }],
    [{ x: 2150, y: 800 }, { x: 1200, y: 800 }, { x: 160, y: 800 }, { x: 1200, y: 800 }],
    // The quench road south and back.
    [{ x: 1200, y: 820 }, { x: 1200, y: 1500 }],
    // Patent Row to the Office steps and back.
    [{ x: 520, y: 800 }, { x: 520, y: 470 }],
    // Through the automata market.
    [{ x: 1300, y: 1130 }, { x: 1980, y: 1130 }],
    // Round the glassblowers' yard.
    [{ x: 300, y: 1360 }, { x: 760, y: 1360 }, { x: 760, y: 1520 }, { x: 300, y: 1520 }],
    // Up to the atelier forecourt to gawp at the armature.
    [{ x: 1600, y: 800 }, { x: 1700, y: 560 }, { x: 1900, y: 500 }, { x: 1700, y: 560 }],
    // Along the front of the grinding hall.
    [{ x: 860, y: 690 }, { x: 1440, y: 690 }],
  ],
  barks,
};
