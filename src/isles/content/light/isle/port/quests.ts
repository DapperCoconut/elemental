import type { QuestDef } from '../../../../IslesTypes';

/**
 * Meridian Quay's five quests. The first is the isle's welcome in disguise — you are emptied out on
 * the Customs table like everyone else, and shown what a lid costs. The second sends you out on the
 * Stair to fish bread for the Dusk-house queue. The rest are small stories about a town that is not
 * allowed the dark: a boy and a dead lamp, a seamstress and her bleached brother, and finally the
 * mirror-buoys that watch the quay for the hill.
 *
 * Every quest ends in a fight with one of the Despot's servants on the quay. Their elements are all
 * different: justice, sand (Time), fire, crystal, light.
 */
export const MERIDIAN_QUESTS: QuestDef[] = [
  // ── 1. Declared in Full ───────────────────────────────────────────
  {
    id: 'meridian-declared', area: 'meridian', name: 'Declared in Full', giver: 'meridian-dock',
    offer: [
      'First thing on Solmara, everybody goes through Customs. Bags on the table, open, in the sun. You too.',
      'Tamsin is on the table today. She is decent. The Inspector is not — Glaze. Lucius Glaze. Lids are his thing.',
      'Go and be declared. And ask Tamsin about Nell Gully\'s barrels while you are there. Nobody else will.',
    ],
    accept: [
      'The Customs of Clarity is the columns east of the Stair. You cannot miss it; it has no front wall.',
      'Do not hide anything in your boots. He checks boots. He once checked a horse.',
    ],
    stages: [
      {
        objective: {
          kind: 'talk', npc: 'meridian-customs',
          lines: [
            'Arrival. One. Bags — fine, fine, I can see it all. Declared in full. Welcome to Solmara. Squint a lot.',
            'Nell\'s barrels? Twelve of them, salt herring. Glaze ruled the lids a hiding place. Lids off, in the sun.',
            'Salt herring in the noon for a week. You can smell it from here. She is in the glass market, west.',
          ],
        },
        hint: 'Be declared by Tamsin Lowe at the Customs of Clarity',
      },
      {
        objective: {
          kind: 'talk', npc: 'meridian-nell',
          lines: [
            'You have been to Customs. Then you know. A lid is a hiding place. A barrel with a lid is twelve.',
            'They are going off on the slab. Twelve barrels of my winter, cooking. There is no winter. You know.',
            'And here he comes. The Inspector. With his crowbar and little mirror. He wants to see inside the fish now.',
          ],
        },
        hint: 'Find Nell Gully at the glass-roofed fish market',
      },
      {
        objective: {
          kind: 'duel', area: 'meridian',
          foe: {
            id: 'meridian-declared-duel', court: 'meridian', name: 'Lids Off',
            foeName: 'Inspector Lucius Glaze', foeElement: 'justice', difficulty: 4, hpMult: 1,
            gimmick: '', at: { x: 640, y: 1190 }, coins: 70,
            look: { body: 0xe8d8c0, accent: 0xf4f0e4, hat: 'tophat', traits: ['glasses', 'book', 'tool'], size: 1.15, eye: 0x9ac8f0 },
            challenge: [
              'Gully. Twelve barrels, twelve lids, twelve hiding places. I have brought a crowbar for the lids.',
              'And a mirror on a stick for inside the fish. One cannot be too clear. One is never too clear.',
              'The visitor, declared this morning. Stand aside, or I declare you again. All of you. On the table.',
            ],
            beaten: ['My mirror — cracked. ...Lids on, then. Lids on. I will write it up as "seen enough". It is not a lie.'],
          },
        },
        hint: 'Inspector Glaze has come for Nell\'s barrel lids — stop him',
      },
    ],
    complete: [
      'Glaze went up the hill holding half a mirror! The whole quay watched. Nell gave the Stair a free herring each.',
      'That is Clarity, then. Now you know what a lid costs here. Six Radiances hold it up those three roads.',
      'North up the Noon Steps is the Noon Court — start there. Here. For a stranger who stood in front of a crowbar.',
    ],
    reward: { orbs: 11, coins: 70 },
  },

  // ── 2. Bread for the Queue ────────────────────────────────────────
  {
    id: 'meridian-queue-bread', area: 'meridian', name: 'Bread for the Queue', giver: 'meridian-baker',
    offer: [
      'People faint in the Dusk-house queue. Old Ezekiel Hobb has gone down twice this week. He is seventy-nine.',
      'I want to bake him a queue-loaf — herring in it, and mackerel, so it keeps him on his feet till his hour.',
      'Only I cannot leave the oven, and the Stair is full of herring this noon. Two herring and a mackerel?',
    ],
    accept: [
      'Fish off the Meridian Stair, or either mole. Press E at the water and wait for the tug. Eyes half shut.',
      'The mackerel will flash the sun at you on the way up. Do not blink. That is how they get away.',
    ],
    stages: [
      {
        objective: { kind: 'fish', fish: 'fish-glint-herring', count: 2 },
        hint: 'Catch 2 Glint Herring off the Meridian Stair or the moles',
      },
      {
        objective: { kind: 'fish', fish: 'fish-mirror-mackerel', count: 1 },
        hint: 'Catch a Mirror Mackerel (they flash on the way up — don\'t blink)',
      },
      {
        objective: { kind: 'cook', recipe: 'recipe-meridian-queue-loaf' },
        hint: 'Have the Golden Crust bake a Queue-Loaf (2 Glint Herring, 1 Mirror Mackerel)',
      },
      {
        objective: {
          kind: 'deliver', npc: 'meridian-hobb', item: 'meal-meridian-queue-loaf', count: 1,
          lines: [
            'For me? From Dorrit? A queue-loaf. Still warm — well. Everything is still warm. But warm from the oven.',
            'I have not eaten in the queue for twenty years. You lose your place if you sit. I will eat it standing.',
            '...Oh. Oh, no. The watch has stopped ticking. That means the clerk is looking at me. He is coming out.',
          ],
        },
        hint: 'Bring the Queue-Loaf to Ezekiel Hobb in the Dusk-house queue',
      },
      {
        objective: {
          kind: 'duel', area: 'meridian',
          foe: {
            id: 'meridian-queue-bread-duel', court: 'meridian', name: 'Eating in the Queue',
            foeName: 'Dusk-Clerk Minim Tick', foeElement: 'sand', difficulty: 4, hpMult: 1,
            gimmick: '', at: { x: 1910, y: 760 }, coins: 75,
            look: { body: 0xb8b0a8, accent: 0x3a6a4a, hat: 'visor', traits: ['glasses', 'book'], size: 0.9, eye: 0xd8f0c8 },
            challenge: [
              'Hobb, E. Household of one. Eating in the queue. That is a breach. Breaches cost minutes.',
              'Crumbs in a queue are an obstruction. An obstruction is a delay. Delay is shade stolen from the line.',
              'Ten minutes docked. Twenty if he finishes the crust. Stand aside, visitor, or I start timing you.',
            ],
            beaten: ['My watch — my watch has stopped. ...He may keep his hour. All of it. I did not see a thing.'],
          },
        },
        hint: 'The Dusk-Clerk is docking Ezekiel\'s minutes for eating in line — stop him',
      },
    ],
    complete: [
      'He ate it in the queue and kept his whole hour! He came and told me himself, with crumbs in his beard.',
      'A baker\'s thanks and a fisher\'s pay. I will bake twelve for the line every day now. Let them dock me.',
    ],
    reward: { orbs: 12, coins: 80 },
  },

  // ── 3. The Lamp Room ──────────────────────────────────────────────
  {
    id: 'meridian-lamp-room', area: 'meridian', name: 'The Lamp Room', giver: 'meridian-jory',
    requires: { questDone: 'meridian-declared' },
    offer: [
      'Mrs Merrow kept the lighthouse before. When the noon came they broke the lens and threw it off the gallery.',
      'Bits went everywhere. Into the sea, onto the moles. They are glass prisms, like a fan, all curved.',
      'I want to put it back. Not to light. Just so it is there. So it is ready. Will you help me find the bits?',
    ],
    accept: [
      'They are along the moles and the Stair and under the light. Glass, curved. They flash. Everything flashes.',
    ],
    stages: [
      {
        objective: {
          kind: 'collect', area: 'meridian', label: 'lens prism', emoji: '🔷', color: 0xbfe6ee,
          spots: [{ x: 335, y: 1390 }, { x: 1268, y: 1380 }, { x: 2195, y: 1390 }, { x: 2470, y: 1130 }],
        },
        hint: 'Find 4 pieces of the old lighthouse lens along the moles, the Stair and the lighthouse rock',
      },
      {
        objective: {
          kind: 'talk', npc: 'meridian-jory',
          lines: [
            'Four! That is the whole bottom ring! Look — they fit. They fit like a puzzle. It is a sort of glass flower.',
            'I am going to carry them up to the lamp room. The door is nailed open but the stairs are fine. Mostly.',
            'Oh — that is the Lampwarden. He keeps the light dark. He has a big iron snuffer and he never smiles.',
          ],
        },
        hint: 'Bring the lens prisms to Jory by the lighthouse',
      },
      {
        objective: {
          kind: 'duel', area: 'meridian',
          foe: {
            id: 'meridian-lamp-room-duel', court: 'meridian', name: 'A Lamp Implies a Night',
            foeName: 'Lampwarden Corvin Strake', foeElement: 'fire', difficulty: 5, hpMult: 0.95,
            gimmick: '', at: { x: 2300, y: 1150 }, coins: 80,
            look: { body: 0x9a7a6a, accent: 0x2a2a34, hat: 'helmet', traits: ['tool', 'lantern', 'mask'], size: 1.25, eye: 0xffc070 },
            challenge: [
              'Lens prisms. In the hands of a child. On the stairs of a decommissioned light.',
              'A lamp implies a night, boy. A lit lamp is a lie told to ships. I keep this one honest. I keep it dead.',
              'Hand them over to be ground for the Heliostat — or I will melt them in your hands. Glass runs, visitor.',
            ],
            beaten: ['My snuffer... is bent. Fine. Keep your glass flower. It will never be lit. ...Will it?'],
          },
        },
        hint: 'The Lampwarden wants the lens melted down for the Heliostat — stop him',
      },
    ],
    complete: [
      'We put it back! The bottom ring, and a gap where the rest goes. It is still the best thing on the isle.',
      'Mrs Merrow stood in the lamp room and touched it. I could see the glass through her hand. She did not mind.',
      'Here — her last wage, never collected, from the keeper\'s drawer. She says it is for whoever helps.',
    ],
    reward: { orbs: 13, coins: 90 },
  },

  // ── 4. Lined with Night ───────────────────────────────────────────
  {
    id: 'meridian-lined-with-night', area: 'meridian', name: 'Lined with Night', giver: 'meridian-rosamund',
    requires: { questDone: 'meridian-declared' },
    offer: [
      'My brother Tobiah is a Clear. A Clear\'s colour comes back only in the dark, and there is no dark here.',
      'So I am going to make some. A hood. Black, lined, close-stitched, for his hour in the Dusk-house.',
      'Black dye is contraband. But there is soot. The old street lamps still have the last night\'s soot in them.',
    ],
    accept: [
      'Four lamps on the town terrace. Cold for twenty-two years. Scrape the chimney glass; do not be seen doing it.',
    ],
    stages: [
      {
        objective: {
          kind: 'collect', area: 'meridian', label: 'lamp soot', emoji: '🖤', color: 0x2a2630,
          spots: [{ x: 658, y: 796 }, { x: 1028, y: 526 }, { x: 1478, y: 836 }, { x: 2298, y: 536 }],
        },
        hint: 'Scrape the last night\'s soot from 4 cold street lamps on the town terrace',
      },
      {
        objective: {
          kind: 'talk', npc: 'meridian-rosamund',
          lines: [
            'Twenty-two years old, this soot. The last night anyone had. It goes into the linen like it was waiting.',
            'There. A hood, black as a well, lined twice. Do not look at it too long out here. It draws the eye.',
            'Take it to Tobiah on the Stair. I cannot. If I walk out there with it they will know whose it is.',
          ],
        },
        hint: 'Bring the soot to Rosamund Vell at her house on the west terrace',
      },
      {
        objective: {
          kind: 'talk', npc: 'meridian-tobiah',
          lines: [
            'From Rosamund? A — oh. Oh, it is black. It is the blackest thing I have seen in nine years.',
            'I put it on and it is dark. Inside, it is properly dark. I can feel my face. I can feel it warm up.',
            '...And there is a mirror flashing at us from the street. Ashcombe. The Mirror-Sergeant. He has seen it.',
          ],
        },
        hint: 'Take the black hood to Tobiah, the Clear on the Meridian Stair',
      },
      {
        objective: {
          kind: 'duel', area: 'meridian',
          foe: {
            id: 'meridian-lined-with-night-duel', court: 'meridian', name: 'A Shadow in Linen',
            foeName: 'Mirror-Sergeant Gleam Ashcombe', foeElement: 'crystal', difficulty: 5, hpMult: 1,
            gimmick: '', at: { x: 1300, y: 1080 }, coins: 85,
            look: { body: 0xd8c8b8, accent: 0x8ab8d8, hat: 'shako', traits: ['tool', 'glasses'], size: 1.1, eye: 0xe0f8ff },
            challenge: [
              'A hood. A black hood. On a Clear, on the Stair, at noon. Do you know what a hood is, visitor?',
              'A shadow you wear. A shade-theft with sleeves. My mirror caught it from two terraces up.',
              'The Clear will be re-bleached and the seamstress tried. Step out of my light or be tried beside her.',
            ],
            beaten: ['My mirror is facets. Little facets. ...I saw nothing. A trick of the glare. It happens. It happens a lot.'],
          },
        },
        hint: 'The Mirror-Sergeant has spotted the hood — keep him off Tobiah',
      },
    ],
    complete: [
      'He sat in my kitchen in the hood and laughed. Laughed! I have not heard him laugh in nine years.',
      'In his hour, under it, his cheek went pink. A Clear, going pink. It is the soot. The night in it.',
      'Take this — my mother\'s sewing purse. Spend it on something that casts a shadow. Anything at all.',
    ],
    reward: { orbs: 13, coins: 85 },
  },

  // ── 5. Face-Down ──────────────────────────────────────────────────
  {
    id: 'meridian-face-down', area: 'meridian', name: 'Face-Down', giver: 'meridian-tackle',
    requires: { princesOfIsle: 'light', count: 2 },
    offer: [
      'You have been wondering about the buoys. Mirrors on floats, off every mole. They are not for ships.',
      'They are heliographs. They flash the quay up the hill to the Noon: every shadow, every hood, every blanket.',
      'My father was flashed in for sleeping under a skiff. Two courts are down. I think it is time they looked away.',
    ],
    accept: [
      'Out on the ends of the moles and the Stair. Turn each mirror on its pin, face to the float. Quietly.',
      'Somebody up the hill will notice. That is all right. I want them to come down here and ask me why.',
    ],
    stages: [
      {
        objective: {
          kind: 'collect', area: 'meridian', label: 'mirror-buoy turned face-down', emoji: '🪞', color: 0xf4ffff,
          spots: [{ x: 335, y: 1468 }, { x: 1335, y: 1478 }, { x: 2195, y: 1458 }, { x: 1264, y: 1470 }],
        },
        hint: 'Turn 4 mirror-buoys face-down at the ends of the moles and the Meridian Stair',
      },
      {
        objective: {
          kind: 'talk', npc: 'meridian-tackle',
          lines: [
            'Look up the hill. The mirrors on the Noon terrace are flashing at nothing. Flashing and flashing. Blind.',
            'Nobody on this quay is being watched. Not one of us. For the first time in twenty-two years.',
            'And there — on the Stair. Gold coat, brass glass at his eye. The Signal-Master. He has come down himself.',
          ],
        },
        hint: 'Go back to Wren Halloran at the tackle kiosk',
      },
      {
        objective: {
          kind: 'duel', area: 'meridian',
          foe: {
            id: 'meridian-face-down-duel', court: 'meridian', name: 'Seen Is Safe',
            foeName: 'Signal-Master Aurelian Flint', foeElement: 'light', difficulty: 5, hpMult: 1.05,
            gimmick: '', at: { x: 1300, y: 1330 }, coins: 110,
            look: { body: 0xe8d0a8, accent: 0xe8c050, hat: 'plume', traits: ['glasses', 'tool', 'cane'], size: 1.25, eye: 0xfff4c0 },
            challenge: [
              'Four buoys dark. Four! The Noon has been looking at a blank quay for an hour. Do you know what that is?',
              'A blind spot. The only one on Solmara. A place where anyone could do anything at all, unseen.',
              'Seen is safe, visitor. I will turn every mirror up again, and the first thing they will see is you.',
            ],
            beaten: ['The glare — I cannot see. ...So this is what it is like, not to see. It is quiet. I had not known.'],
          },
        },
        hint: 'Signal-Master Flint has come down to turn the buoys back — stop him on the Stair',
      },
    ],
    complete: [
      'He went up the Noon Steps with his eyeglass in his pocket, and the buoys are still face-down.',
      'My father would have laughed. He laughed at the buoy the day it flashed him. I never understood. I do now.',
      'Take this. It is the first buoy mirror, off the end of the Stair. Face-down, it will keep watching for you.',
    ],
    reward: { orbs: 15, coins: 150, item: 'charm-meridian-face-down-mirror' },
  },
];
