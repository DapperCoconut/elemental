import type { QuestDef } from '../../../../IslesTypes';
import { CRANE } from './area';
import { FISH_BLEAK } from './items';

/**
 * The Workshop Court's five side quests.
 *
 * Between them they show what the Workshop makes and what it costs: the grinders going blind on
 * their own glare (Pask), the Clears set to polish because they leave no shadow (Sprue and Ottilie),
 * the Patent Office that melts anything that makes shade (Hesper Vane), an apprentice whose owl only
 * wakes in a dark that never comes (Tibbet), and the last mirror for the Prince's armature (Grue).
 * Each is somebody making a small piece of dark on purpose.
 */
export const WORKSHOP_QUESTS: QuestDef[] = [
  // ── 1. Smoked Glass — collect + talk + duel ──────────────────────────
  {
    id: 'workshop-q-smoked-glass',
    area: 'workshop',
    name: 'Smoked Glass',
    giver: 'workshop-pask',
    offer: [
      'The glare off a true blank is the sun twice over. I\'ve one eye left and it\'s going the way of the other.',
      'If a man had a pair of spectacles in dark glass… just for the bench… he could keep his eye. And his job.',
      'Dark glass is contraband. Glass is not. You see the difference? The Office doesn\'t, but I do.',
      'There\'s soot-glass on the floor of the furnace yard — black drops the gaffers kick aside. Will you fetch some?',
    ],
    accept: [
      'Four drops. Round the furnaces and the cullet bins. Then Mother Cullet — she\'ll know what to do.',
    ],
    stages: [
      {
        objective: {
          kind: 'collect', area: 'workshop', label: 'A drop of soot-glass', emoji: '⚫', color: 0x2c2826,
          spots: [{ x: 250, y: 1370 }, { x: 670, y: 1450 }, { x: 430, y: 1190 }, { x: 120, y: 1260 }],
        },
        hint: 'Pick up 4 drops of black soot-glass round the glassblowers\' furnaces',
      },
      {
        objective: {
          kind: 'talk', npc: 'workshop-cullet',
          lines: [
            'Soot-glass, thin-fused, ground to a lens. Done it before, love. Done it for my own eyes, years back.',
            'There. Two dark moons in a wire frame. Look at the furnace through them — see? Just a glow.',
            'Oh, bother. That\'s Assessor Candour coming down the yard with his eyeglass. He holds everything to the sun.',
          ],
        },
        hint: 'Take the soot-glass to Mother Cullet at the furnaces',
      },
      {
        objective: {
          kind: 'duel', area: 'workshop',
          foe: {
            id: 'workshop-q-smoked-glass-duel',
            court: 'workshop',
            name: 'Held Up to the Sun',
            foeName: 'Assessor Plumb Candour',
            foeElement: 'justice',
            difficulty: 5,
            hpMult: 0.95,
            gimmick: 'workshop-glassblowing',
            at: { x: 600, y: 1250 },
            look: { body: 0xe0d0bc, accent: 0xf2c84a, hat: 'wig', traits: ['glasses', 'book', 'cane'], size: 1.1, eye: 0xfff4c0 },
            challenge: [
              'Glass that cannot be seen through is not glass. It is a wall. Walls are shade. Shade is an offence.',
              'I hold every pane on this terrace up to the noon. That one is black. Hand it to the Assessor.',
              'Or the Burning Glass can hold you up to the noon instead.',
            ],
            beaten: ['…I see nothing through them. Very well. I shall record that I saw nothing. That is technically true.'],
            coins: 130,
          },
        },
        hint: 'Face Assessor Plumb Candour in the furnace yard',
      },
    ],
    complete: [
      'Oh. Oh, look at that. The blank\'s just a glow. A soft glow. I can see the LINE.',
      'Cullet says she can fuse a pair a day from the drops. Forty grinders. Here — I\'ve been saving it for a doctor.',
    ],
    reward: { orbs: 12, coins: 90 },
  },

  // ── 2. Supper for the Polishers — fish + deliver + duel ──────────────
  {
    id: 'workshop-q-quench-supper',
    area: 'workshop',
    name: 'Supper for the Polishers',
    giver: 'workshop-sprue',
    offer: [
      'See the Clears on the polishing wheels? They get fed once a day, out in the sun, and Burnish counts the bites.',
      'Clears don\'t need much, he says. You can see through them, so you can see how little\'s in them.',
      'The brass bleak in my tank are nobody\'s. Catch three, and take them to Ottilie Glim. Quietly.',
    ],
    accept: [
      'Cast off the lip. Bleak bite at anything bright. Then round to the hall — in your coat, mind.',
    ],
    stages: [
      {
        objective: { kind: 'fish', fish: FISH_BLEAK, count: 3 },
        hint: 'Catch 3 brass bleak in the quench tank',
      },
      {
        objective: {
          kind: 'deliver', npc: 'workshop-glim', item: FISH_BLEAK, count: 3,
          lines: [
            'For us? Oh — three! There are five of us on the wheels, we\'ll halve them. Quick, behind the trough.',
            'Is it showing? It must be showing. You can see it go down. Oh no — that\'s Overseer Burnish.',
          ],
        },
        hint: 'Bring the 3 bleak to Ottilie Glim at the grinding hall',
      },
      {
        objective: {
          kind: 'duel', area: 'workshop',
          foe: {
            id: 'workshop-q-quench-supper-duel',
            court: 'workshop',
            name: 'Counting the Bites',
            foeName: 'Overseer Burnish',
            foeElement: 'metal',
            difficulty: 5,
            gimmick: '',
            at: { x: 1180, y: 710 },
            look: { body: 0xc8b8a8, accent: 0x4a4744, hat: 'tophat', traits: ['cane', 'glasses'], size: 1.2, eye: 0xd8dade },
            challenge: [
              'One ration, in the sun, at the bell. A Clear that eats behind a trough is a Clear that hides.',
              'I can see that fish inside her, stranger. Everybody can. That\'s rather the point of a Clear.',
              'Step away from my polishers.',
            ],
            beaten: ['Let them eat, then. Behind the trough. I shall be looking at the wall. For some time.'],
            coins: 130,
          },
        },
        hint: 'Face Overseer Burnish at the grinding hall',
      },
    ],
    complete: [
      'Ottilie came round to thank me herself. Laughing. You can watch the laugh go all the way down, you know.',
      'I\'ll bring them bleak every shift now. Take this — the Workshop paid me in it, and the Workshop can spare it.',
    ],
    reward: { orbs: 13, coins: 90 },
  },

  // ── 3. The Cloud Engine — visit + collect + duel ─────────────────────
  {
    id: 'workshop-q-cloud-engine',
    area: 'workshop',
    name: 'The Cloud Engine',
    giver: 'workshop-vane',
    offer: [
      'My cloud engine makes a cloud the size of a hat. It casts a shadow the size of a hat. That\'s all it does.',
      'Refused, seized, to be melted on the first. But a patent can be appealed — if the drawings still exist.',
      'They tore my drawings up and threw them out of the Office window. The pages blew round Patent Row.',
      'Read the seizure on the board, so you know what they called it. Then find me the pages. Three will do.',
    ],
    accept: [
      'The middle board, by the lane. Then the pages — wherever the wind left them, round the Office.',
    ],
    stages: [
      {
        objective: { kind: 'visit', area: 'workshop', at: { x: 640, y: 640 }, r: 70, label: 'The notice of seizure' },
        hint: 'Read the notice of seizure on the board by the Patent Office lane',
      },
      {
        objective: {
          kind: 'collect', area: 'workshop', label: 'A torn page of drawings', emoji: '📄', color: 0x2a5c9a,
          spots: [{ x: 320, y: 470 }, { x: 720, y: 490 }, { x: 260, y: 560 }],
        },
        hint: 'Gather 3 torn pages of Hesper Vane\'s drawings round the Patent Office',
      },
      {
        objective: {
          kind: 'duel', area: 'workshop',
          foe: {
            id: 'workshop-q-cloud-engine-duel',
            court: 'workshop',
            name: 'Device for the Manufacture of Shade',
            foeName: 'Examiner Facette Lumley',
            foeElement: 'crystal',
            difficulty: 5,
            hpMult: 1.05,
            gimmick: 'workshop-blueprint',
            at: { x: 520, y: 480 },
            look: { body: 0xe4d8cc, accent: 0x8ae6ff, hat: 'cap', traits: ['glasses', 'book', 'satchel'], size: 1, eye: 0xd8f8ff },
            challenge: [
              'Those are refused drawings. Refused drawings are the property of the Office until they are ash.',
              'I examined that engine myself. A cold coil, a fan, and malice. It makes shade on purpose.',
              'If you want them so badly, draw your way past me.',
            ],
            beaten: ['Take them. Take them. I always thought the fan was rather well designed, actually.'],
            coins: 130,
          },
        },
        hint: 'Face Examiner Facette Lumley on the Office steps',
      },
    ],
    complete: [
      'All three! The coil, the fan, the boiler. That\'s enough to appeal. That\'s enough to BUILD ANOTHER.',
      'I won\'t appeal. I\'ll just build it again. Take my filing fee — I won\'t be needing the Office any more.',
    ],
    reward: { orbs: 14, coins: 110 },
  },

  // ── 4. The Night Owl — talk + defeat ─────────────────────────────────
  {
    id: 'workshop-q-night-owl',
    area: 'workshop',
    name: 'The Night Owl',
    giver: 'workshop-tibbet',
    offer: [
      'My owl\'s got a spring that only lets go when it gets dark. So it wakes at night. Except — no night.',
      'It\'s been ready for two years. And now Tinker Gizmo\'s taken its eyes. Its dark eyes. For a PROTOTYPE.',
      'He says apprentices can\'t patent, so they\'re anybody\'s. They\'re MINE. I ground them myself.',
    ],
    accept: [
      'Ask Odile first — she sold him the brass. She knows which prototype they went in.',
    ],
    stages: [
      {
        objective: {
          kind: 'talk', npc: 'workshop-ferrule',
          lines: [
            'Gizmo? He bought a brass ring off me the size of an eye. Two of them. For number eight hundred and twelve.',
            'A lens-cannon, he said. With dark lenses in it — they keep the glare off the sight. Clever little thief.',
            'He\'s down the row, at his bench. You\'ll have to take it off him. He won\'t give it.',
          ],
        },
        hint: 'Ask Odile Ferrule which prototype the owl\'s eyes went into',
      },
      {
        objective: { kind: 'defeat', encounter: 'workshop-prototype' },
        hint: 'Beat Tinker Gizmo (Prototype) in the automata market and take back the eyes',
      },
    ],
    complete: [
      'THE EYES! Blue-black and not a scratch. Look — they\'re in. Now it\'s just waiting. Like before.',
      'Here. It\'s all my tips. You can have it. When it wakes up, you\'re the first one I\'ll tell. Promise.',
    ],
    reward: { orbs: 11, coins: 80 },
  },

  // ── 5. The Last Mirror — visit + talk + prince ───────────────────────
  {
    id: 'workshop-q-last-mirror',
    area: 'workshop',
    name: 'The Last Mirror',
    giver: 'workshop-grue',
    requires: { courtReady: 'workshop' },
    offer: [
      'That mirror on my hook is the last plate for the armature. When it\'s on, she walks, and she brings the noon.',
      'Into every cellar, every cupboard, under every blanket on Solmara. Nowhere dark left. Not one place.',
      'A pawl on a winch can slip. It happens. Go and look at my drum and tell me if you think it might.',
      'Then go up to the atelier. If he\'s busy with you, he isn\'t watching my chain.',
    ],
    accept: [
      'The winch house, at the foot of the tower. Then Wendel Pask — he knew His Radiance as a boy. Ask him.',
    ],
    stages: [
      {
        objective: { kind: 'visit', area: 'workshop', at: { x: CRANE.x - 60, y: CRANE.y + 30 }, r: 70, label: 'The crane\'s winch drum' },
        hint: 'Look over the winch drum at the foot of the crane',
      },
      {
        objective: {
          kind: 'talk', npc: 'workshop-pask',
          lines: [
            'Artifex? He was the apprentice at bench four before me. Ground the first Heliostat mirror right there.',
            'Happiest lad I ever saw. Never asked what it was for. Only ever asked "how". Still only asks "how".',
            'Somebody should ask him "why". Go and ask him. Loudly. With whatever you\'ve got.',
          ],
        },
        hint: 'Ask Wendel Pask about the Prince',
      },
      {
        objective: { kind: 'prince', prince: 'artifex' },
        hint: 'Face Prince Artifex at the atelier',
      },
    ],
    complete: [
      'The pawl slipped. Funny thing. Mirror went down forty feet onto the cobbles. Ten thousand pieces.',
      'He came out and looked at it for a long time and said, "Oh. That\'s what it\'s like." Take this. Crane wages.',
    ],
    reward: { orbs: 15, coins: 170 },
  },
];
