import type { QuestDef } from '../../../../IslesTypes';
import { KITE_DUNE, MOORING_POST } from './area';
import { FISH_EEL, FISH_SKIPPER } from './items';

/**
 * The Dunesea Court's five side quests.
 *
 * Between them they show how the dunes are governed: a household racing the dune to get its Tithe
 * stone out of the pit (Nadia), a camp of the sanded fed off the sand sea (Yusuf), the books the
 * Regent buried and the sand kept (Sabil), the ships that may carry nothing but stone (Ezra), and
 * finally the boy with the kite who grew up to be the wind (Qadira), before you face the Prince.
 * Each is somebody refusing to be buried.
 */
export const DUNESEA_QUESTS: QuestDef[] = [
  // ── 1. Before the Dune — collect + talk + defeat ─────────────────────
  {
    id: 'dunesea-q-before-the-dune',
    area: 'dunesea',
    name: 'Before the Dune',
    giver: 'dunesea-nadia',
    offer: [
      'The dune over pit nine leans a hand\'s width more every night. Two nights left. Maybe one.',
      'The last four blocks are cut. They\'re lying round the lip where I couldn\'t haul them, I\'m alone this week.',
      'Bring them to the pile by the shaduf. Then Ezra can load them on the Strand before the wind decides.',
    ],
    accept: [
      'Round the lip — mind the shoring, it\'s older than me. Four blocks. Go, go.',
    ],
    stages: [
      {
        objective: {
          kind: 'collect', area: 'dunesea', label: 'A cut block from pit nine', emoji: '🧱', color: 0xd8b07a,
          spots: [{ x: 280, y: 838 }, { x: 290, y: 992 }, { x: 512, y: 848 }, { x: 524, y: 944 }],
        },
        hint: 'Haul the 4 cut blocks lying round the lip of pit nine',
      },
      {
        objective: {
          kind: 'talk', npc: 'dunesea-ezra',
          lines: [
            'Pit nine\'s stone? Hand it up. One, two, three, four — that\'s the Hazims\' weight and a bit. She sails tonight.',
            'Ah. Look who\'s coming up the south road with her shovel over her shoulder. Petra.',
            'She\'ll say it\'s treasure-trove — that anything a stranger lifts out of Old Hamra belongs to the Palace.',
            'Don\'t let her. Not this stone. This stone is a boy staying home.',
          ],
        },
        hint: 'Take the blocks to Ezra Dunewright at the shipyard',
      },
      {
        objective: { kind: 'defeat', encounter: 'dunesea-buried-treasure' },
        hint: 'Beat Digger Petra (Buried Treasure) at the open dig before she claims the stone',
      },
    ],
    complete: [
      'Petra went home with sand in her shovel and nothing else. Ezra sailed at dusk. Pit nine paid.',
      'My brother came and sat on the lip all night and watched the dune. It didn\'t fall. Take this. Please.',
    ],
    reward: { orbs: 7, coins: 70 },
  },

  // ── 2. Skipper Soup — fish + deliver + duel ──────────────────────────
  {
    id: 'dunesea-q-skipper-soup',
    area: 'dunesea',
    name: 'Skipper Soup',
    giver: 'dunesea-yusuf',
    offer: [
      'The camp\'s had dates for nine days. Just dates. Gran says skipper soup would put the colour back in us.',
      'But the skippers won\'t bite for me. My rod\'s only a stick with a nail. You need a proper delver.',
      'Could you catch three? Gran\'s by the fire in the camp. She\'ll know what to do with them.',
    ],
    accept: [
      'Cast from the Strand. The sand sea flows — let the lure ride it. Skippers jump when they bite.',
    ],
    stages: [
      {
        objective: { kind: 'fish', fish: FISH_SKIPPER, count: 3 },
        hint: 'Catch 3 sandskippers in the sand sea (delver rod)',
      },
      {
        objective: {
          kind: 'deliver', npc: 'dunesea-sefa', item: FISH_SKIPPER, count: 3,
          lines: [
            'Skippers! Three fat ones. Yusuf sent you, didn\'t he. Sit — the pot\'s already on.',
            'Oh, no. Here comes the Glass-Timer with his hourglass under his arm. He turns it at every tent.',
            'When the sand\'s through, a tent that hasn\'t paid is taken down. He says fish are payment. In kind.',
          ],
        },
        hint: 'Bring the 3 sandskippers to Grandmother Sefa in the Sanded Camp',
      },
      {
        objective: {
          kind: 'duel', area: 'dunesea',
          foe: {
            id: 'dunesea-q-skipper-soup-duel',
            court: 'dunesea',
            name: 'The Hour Is Up',
            foeName: 'Glass-Timer Oruz Clepsy',
            foeElement: 'sand',
            difficulty: 3,
            hpMult: 0.95,
            gimmick: 'dunesea-quicksand',
            at: { x: 560, y: 1440 },
            look: { body: 0xc8b8a4, accent: 0xd0a040, hat: 'tophat', traits: ['glasses', 'book', 'cane'], size: 1.1, eye: 0xf4d68a },
            challenge: [
              'This glass holds one season of a tent\'s life. I turn it at the door. It runs. When it\'s through, so are they.',
              'Three fish is a part-payment. A part-payment stops nothing. Look — the last grains are going.',
              'Your hour is up too, I\'m afraid. Everyone\'s is, eventually. I simply keep the count.',
            ],
            beaten: ['…The glass is broken. I don\'t know how long anything has left. How does anyone live like this?'],
            coins: 80,
          },
        },
        hint: 'Stop Glass-Timer Oruz before his hourglass runs out over the camp',
      },
    ],
    complete: [
      'The whole camp had soup. Gran used the hourglass frame for the fire. It burned blue!',
      'She says give you this — I caught it. Well. It caught itself on my nail. Same thing.',
    ],
    reward: { orbs: 6, coins: 50, item: FISH_EEL, itemCount: 1 },
  },

  // ── 3. The Drowned Library — collect + duel ──────────────────────────
  {
    id: 'dunesea-q-drowned-library',
    area: 'dunesea',
    name: 'The Drowned Library',
    giver: 'dunesea-sabil',
    offer: [
      'The wind turns things up in the old city. Last week a shoe. Yesterday — this. A page. Room six. The atlases.',
      'Four books have come up through the sand round the digs. I can see their corners from here. I can\'t go.',
      'If I leave this step, Hollin fills the last door. Would you bring them? Gently. They\'ve been asleep a long time.',
    ],
    accept: [
      'Look for leather corners in the sand. Lift, don\'t pull. And if a man in grey comes, he is Hollin.',
    ],
    stages: [
      {
        objective: {
          kind: 'collect', area: 'dunesea', label: 'A book the sand gave back', emoji: '📕', color: 0x1e6a68,
          spots: [{ x: 660, y: 410 }, { x: 440, y: 560 }, { x: 200, y: 652 }, { x: 790, y: 470 }],
        },
        hint: 'Lift the 4 buried books poking out of the sand round Old Hamra',
      },
      {
        objective: {
          kind: 'duel', area: 'dunesea',
          foe: {
            id: 'dunesea-q-drowned-library-duel',
            court: 'dunesea',
            name: 'A Weight the Hold Can\'t Carry',
            foeName: 'Sealer Dusk Hollin',
            foeElement: 'ruin',
            difficulty: 4,
            hpMult: 0.95,
            gimmick: '',
            at: { x: 450, y: 690 },
            look: { body: 0x9a9088, accent: 0x5a5048, hat: 'hood', traits: ['tool', 'mask', 'satchel'], size: 1.2, eye: 0xd8d0c8 },
            challenge: [
              'I seal doors. A cell door in the Sepulchre, a library door in Hamra. It is the same trowel.',
              'Books are a weight the Hold can\'t carry. Every word is a stone somebody has to lift. I spare them.',
              'Put the books down. They go under with the rest.',
            ],
            beaten: ['…I never read one. Not once in thirty years. Is that strange? I suppose that is strange.'],
            coins: 80,
          },
        },
        hint: 'Face Sealer Dusk Hollin under the bell-tower before he takes the books',
      },
    ],
    complete: [
      'Room six. The atlases. The sea is where we said it was, and there are islands we have no names for.',
      'Take this for the carrying. And come back when you can — I will read you one. Slowly.',
    ],
    reward: { orbs: 8, coins: 60 },
  },

  // ── 4. The Last Sail — talk + visit + duel ───────────────────────────
  {
    id: 'dunesea-q-last-sail',
    area: 'dunesea',
    name: 'The Last Sail',
    giver: 'dunesea-ezra',
    offer: [
      'The Sabra. First hull I ever built, forty-one years old. She\'s to be broken up for her ballast stone.',
      'One more sail, I said. Down the Strand and back with a wind in her. The Anchor-Master laughed at me.',
      'Halima hid her tiller for me. Fetch it, then go to the mooring post — the chain\'s his. So is the key.',
    ],
    accept: [
      'Halima\'s under the awnings at the caravanserai. Ask for "the long spoon". She\'ll know.',
    ],
    stages: [
      {
        objective: {
          kind: 'talk', npc: 'dunesea-halima',
          lines: [
            'The long spoon? Under the dates. Help me with this sack — there. Ash, steamed and bent. Ezra\'s own hand.',
            'Take it wrapped. If anyone asks, it\'s a tent pole. Everybody in the Dunesea is carrying tent poles lately.',
          ],
        },
        hint: 'Ask Halima at the caravanserai for "the long spoon"',
      },
      {
        objective: { kind: 'visit', area: 'dunesea', at: { x: MOORING_POST.x, y: MOORING_POST.y + 10 }, r: 60, label: 'The mooring post' },
        hint: 'Take the tiller to the chained mooring post on the Strand',
      },
      {
        objective: {
          kind: 'duel', area: 'dunesea',
          foe: {
            id: 'dunesea-q-last-sail-duel',
            court: 'dunesea',
            name: 'Chained to the Strand',
            foeName: 'Anchor-Master Hasp Ironside',
            foeElement: 'metal',
            difficulty: 4,
            hpMult: 1,
            gimmick: 'dunesea-sand-ships',
            at: { x: 1000, y: 905 },
            look: { body: 0xa8988a, accent: 0x4a4a50, hat: 'helmet', traits: ['beard', 'tool', 'apron'], size: 1.3, eye: 0xd8dade },
            challenge: [
              'That\'s a tiller under your arm, not a tent pole. I\'ve chained ships forty years. I know a tiller.',
              'Every hull on the Strand is the Regent\'s ballast with a sail on it. A ballast stone doesn\'t go for a sail.',
              'You want her loose? The key\'s on my belt. Come and take it off me, out on the lanes.',
            ],
            beaten: ['…Take the key. Take her out. If anyone asks, the chain rusted. Chains do, out here.'],
            coins: 80,
          },
        },
        hint: 'Take the chain key off Anchor-Master Hasp on the Strand',
      },
    ],
    complete: [
      'She SAILED. Down the Strand and back, sail full, sand flying off her runners like spray. Forty-one years.',
      'They\'ll break her up next season. Let them. Here — my wages for the Sabra\'s last voyage. They\'re yours.',
    ],
    reward: { orbs: 8, coins: 80 },
  },

  // ── 5. Where the Wind Goes — talk + visit + prince ───────────────────
  {
    id: 'dunesea-q-where-the-wind-goes',
    area: 'dunesea',
    name: 'Where the Wind Goes',
    giver: 'dunesea-qadira',
    requires: { courtReady: 'dunesea' },
    offer: [
      'All five of his. He\'s on the windward gallery, and the vanes are spinning in a circle. That means him.',
      'You should know who you\'re fighting. Ask Sefa in the camp about the boy with the kite. She was there.',
      'Then go and stand on the kite dune, south of the oasis. Then go to the Palace.',
    ],
    accept: [
      'Sefa, the kite dune, the Palace. In that order. The wind will be against you all the way. It always is.',
    ],
    stages: [
      {
        objective: {
          kind: 'talk', npc: 'dunesea-sefa',
          lines: [
            'Sirocco. He was a quiet boy. He made a kite out of a tent-wrap and flew it off the dunes. It flew so well.',
            'His father saw it over the Palace and called it a thing that went where it was not told. He buried it.',
            'The kite, the string, the dune he flew it from. The boy watched. Then he decided he would be the wind.',
          ],
        },
        hint: 'Ask Grandmother Sefa about the boy with the kite',
      },
      {
        objective: { kind: 'visit', area: 'dunesea', at: { x: KITE_DUNE.x, y: KITE_DUNE.y + 10 }, r: 70, label: 'The kite dune' },
        hint: 'Stand on the kite dune south of the oasis',
      },
      {
        objective: { kind: 'prince', prince: 'sirocco' },
        hint: 'Face Prince Sirocco at the Palace of Winds',
      },
    ],
    complete: [
      'He climbed my tower last night and asked what the weather would be. I told him: still. He sat down.',
      'He asked whether a kite would fly in still air. I said no. He said good, then he would have to run with it.',
      'Take the Palace\'s wind-money. He says he won\'t be needing to buy any more wind.',
    ],
    reward: { orbs: 10, coins: 160 },
  },
];
