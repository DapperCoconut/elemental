import type { Pt, QuestDef } from '../../../../IslesTypes';
import { ENC_BAD_DREAM } from './encounters';
import { CHARM_BELL, FISH_PIKE } from './items';

/**
 * The Slumber Court's five side stories — the town where the becalmed are laid down to sleep. A
 * child counting her mother's breaths and finding the Night-Collector still corking a paid debt;
 * a lamplighter keeping one lamp alight on a row the King wants dark; an old angler who wants to
 * know what the nightmare pike has been eating; a dream-reader who hears thirty sleepers dreaming
 * the same bad dream; and — once Reverie is down — a bellringer who wants to ring the lullaby bell
 * the other way, just once. Every one ends in a fight, and no element fights twice here.
 */

export const NPC = {
  eiderdown: 'slumber-eiderdown',
  pip: 'slumber-pip',
  wick: 'slumber-wick',
  fennick: 'slumber-fennick',
  lull: 'slumber-lull',
  coverlet: 'slumber-coverlet',
  tolly: 'slumber-tolly',
  abelard: 'slumber-abelard',
} as const;

export const Q_BREATHS = 'slumber-counting-breaths';
export const Q_LAMPS = 'slumber-lights-low';
export const Q_PIKE = 'slumber-what-the-pike-ate';
export const Q_DREAM = 'slumber-the-same-bad-dream';
export const Q_BELL = 'slumber-the-waking-bell';

/** Places the quests send you, shared with the area painter. */
export const BED_NINE: Pt = { x: 1010, y: 792 };
export const LAMPLESS_LAMPS: Pt[] = [{ x: 1845, y: 930 }, { x: 2030, y: 1116 }, { x: 2240, y: 1306 }, { x: 2276, y: 1528 }];

export const SLUMBER_QUESTS: QuestDef[] = [
  {
    id: Q_BREATHS, area: 'slumber', name: 'Counting Breaths', giver: NPC.pip,
    offer: [
      'My mam\'s on bed nine. Becalmed since the thaw. I count her breaths every night on my slate.',
      'At first it was eleven a minute. Last week, nine. Tonight it was seven. I counted three times.',
      'Her debt\'s paid. I worked it out. Every bottle they corked off her, I wrote down. It\'s paid since Lady Day.',
      'But the Night-Collector still comes round after the lullaby, and he still stops at bed nine. Will you look?',
    ],
    accept: [
      'Bed nine, north side of the Long Ward, the one with the rose quilt. Don\'t wake her. You can\'t, anyway.',
    ],
    stages: [
      {
        objective: { kind: 'visit', area: 'slumber', at: BED_NINE, r: 60, label: 'Bed nine' },
        hint: 'Look in on bed nine on the Long Ward',
      },
      {
        objective: {
          kind: 'collect', area: 'slumber', label: 'corked breath', emoji: '🍾', color: 0xcfe8ff,
          spots: [{ x: 1860, y: 806 }, { x: 2030, y: 832 }, { x: 2170, y: 786 }],
        },
        hint: 'Gather 3 breath bottles that rattled off the collector\'s cart on Hushing Way',
      },
      {
        objective: {
          kind: 'duel', area: 'slumber',
          foe: {
            id: 'slumber-counting-breaths-duel', court: 'slumber', name: 'Overdrawn',
            foeName: 'Night-Collector Phial', foeElement: 'pressure', difficulty: 3, gimmick: '',
            at: { x: 1930, y: 860 },
            look: { body: 0xc8c0b8, accent: 0xc9a24a, hat: 'tophat', traits: ['satchel', 'glasses'], size: 1.1, eye: 0xcfe8ff },
            challenge: [
              'Those bottles are the King\'s property. Every one of them sealed in his wax. Dozey, bed nine. Yes. And?',
              'Paid, paid, paid. The ledger says paid. The quota says otherwise. The quota is bigger than the ledger.',
            ],
            beaten: ['...Seven a minute. I know. I hear her too. The quota was short and she breathes so very quietly.'],
            coins: 75,
          },
        },
        hint: 'Have it out with Night-Collector Phial on Hushing Way',
      },
    ],
    complete: [
      'I uncorked them at her bedside, one at a time, right under her nose like smelling salts.',
      'Fourteen a minute. FOURTEEN. She said my name. In her sleep, but she said it. I wrote it down.',
    ],
    reward: { orbs: 6, coins: 60 },
  },

  {
    id: Q_LAMPS, area: 'slumber', name: 'Lights Low', giver: NPC.wick,
    offer: [
      'The Dimming Order, by the Prince\'s seal: every lamp in the court hooded to a hair. A lit lamp wakes a sleeper.',
      'A waking sleeper breathes deep, and a deep breath is dear. So I go round with felt cowls, turning them down.',
      'Now the Snuffer\'s coming to put Lampless Row out entirely. A sleeper in pitch dark breathes least of all.',
      'My mother sleeps on that row. She\'s been afraid of the dark since she was four. Help me light them back up.',
    ],
    accept: [
      'Four lamps down the row. Pull the cowl off, turn the wick up. Quick, before anyone official is about.',
    ],
    stages: [
      {
        objective: {
          kind: 'collect', area: 'slumber', label: 'lamp to relight', emoji: '🕯️', color: 0xffe2a0,
          spots: LAMPLESS_LAMPS.map((p) => ({ x: p.x - 30, y: p.y + 22 })),
        },
        hint: 'Relight the 4 hooded lamps down Lampless Row',
      },
      {
        objective: {
          kind: 'talk', npc: NPC.coverlet, lines: [
            'You\'ve lit the row? Their meters jumped. Every needle on that row came up off the red at once. I saw it.',
            'Old Mrs Wick turned over in her sleep. She hasn\'t turned over in two years.',
            'The Snuffer\'s been told. He\'s on his way down the row with his cap and his pole. He won\'t like it.',
          ],
        },
        hint: 'Tell Sister Coverlet on the Long Ward what you\'ve done',
      },
      {
        objective: {
          kind: 'duel', area: 'slumber',
          foe: {
            id: 'slumber-lights-low-duel', court: 'slumber', name: 'Lights Out',
            foeName: 'Snuffer Grimsby', foeElement: 'ink', difficulty: 3, gimmick: '',
            at: { x: 2250, y: 1420 },
            look: { body: 0xa8a0b0, accent: 0x1a1a22, hat: 'beanie', traits: ['tool', 'scarf'], size: 1.2, eye: 0xf0f0f0 },
            challenge: [
              'Who\'s been turning lamps UP? On MY row? Lampless Row, it says. Lamp. Less.',
              'Dark is cheap. Dark is quiet. Dark doesn\'t breathe. Step aside, I\'ve a pole and I\'m not afraid to use it.',
            ],
            beaten: ['All right. ALL RIGHT. Leave them lit. My nan was frightened of the dark too, if you must know.'],
            coins: 75,
          },
        },
        hint: 'Stop Snuffer Grimsby at the bottom of Lampless Row',
      },
    ],
    complete: [
      'Four lamps lit on Lampless Row. I\'m to be reprimanded, I expect. I\'m going to frame the reprimand.',
      'Mother sleeps with her hand out of the covers now. Toward the light. Like a cat in a sunbeam.',
    ],
    reward: { orbs: 6, coins: 55 },
  },

  {
    id: Q_PIKE, area: 'slumber', name: 'What the Pike Ate', giver: NPC.fennick,
    offer: [
      'Dreams sink, you know. A sleeper dreams, and it drifts off like a bubble and rolls downhill to the lake.',
      'The carp feed on the sweet ones. That\'s why they\'re so fat and dozy. But there\'s a pike eats the bad ones.',
      'Ten feet if he\'s an inch, and getting bigger every season. Nobody has bad dreams like that many bad dreams.',
      'Catch me a nightmare pike. Take it to Lull, the dream-reader. I want to know what\'s in its belly.',
    ],
    accept: [
      'Deep water, dark bait. And don\'t look into his eyes when you land him. You\'ll not sleep for a week.',
    ],
    stages: [
      {
        objective: { kind: 'fish', fish: FISH_PIKE, count: 1 },
        hint: 'Land a nightmare pike from the Lake of Nod',
      },
      {
        objective: {
          kind: 'deliver', npc: NPC.lull, item: FISH_PIKE, count: 1, lines: [
            'Lay it here, on the cloth. Gently. Now hush. Let me put the trumpet to it...',
            'One dream, over and over. A man at the bottom of the lake with a sack of corked dreams round his neck.',
            'A collector. Fell in with a full sack nine winters ago. He sleeps down there, feeding the pike our nightmares.',
            'His name was Glumm. He\'ll be on the south shore at low mist. Bring Fennick his lake back.',
          ],
        },
        hint: 'Take the nightmare pike to Dreamwright Lull\'s booth',
      },
      {
        objective: {
          kind: 'duel', area: 'slumber',
          foe: {
            id: 'slumber-what-the-pike-ate-duel', court: 'slumber', name: 'The Deep End',
            foeName: 'Glumm the Lake-Sleeper', foeElement: 'depths', difficulty: 3, gimmick: '',
            at: { x: 690, y: 1500 },
            look: { body: 0x6a7a8a, accent: 0x2e3268, hat: 'nightcap', traits: ['satchel', 'beard'], size: 1.25, eye: 0x8af0e0 },
            challenge: [
              'Glub. Mine. The sack is mine, the dreams are mine, the pike is mine. I collected them fair. I collected them.',
              'Nine winters on the bottom with the King\'s quota round my neck. You think I\'m letting go of it now?',
            ],
            beaten: ['The sack\'s split... they\'re all floating up. Look at them go. Oh. I\'d forgotten they were so pretty.'],
            coins: 75,
          },
        },
        hint: 'Face Glumm the Lake-Sleeper on the south shore of the Lake of Nod',
      },
    ],
    complete: [
      'The whole lake\'s fizzing! Bubbles coming up all over, rolling uphill back to the beds. Never seen the like.',
      'The carp are going mad for it. The pike\'s sulking under the jetty. Here, for your trouble.',
    ],
    reward: { orbs: 7, coins: 40 },
  },

  {
    id: Q_DREAM, area: 'slumber', name: 'The Same Bad Dream', giver: NPC.lull,
    offer: [
      'I read dreams. I put my trumpet to the pillow and I listen. It\'s honest work. It\'s quiet work.',
      'Thirty sleepers on the Long Ward dream the same dream: a woman with a black glass lantern, walking the beds.',
      'Thirty people do not dream the same woman by accident. Somebody is walking between those beds at night.',
      'Ask Sister Coverlet. She sits up with them. If anyone has seen the lantern, she has.',
    ],
    accept: [
      'Coverlet is on the Long Ward, usually by the pump. Speak softly. She hasn\'t slept properly in years.',
    ],
    stages: [
      {
        objective: {
          kind: 'talk', npc: NPC.coverlet, lines: [
            'A black lantern. Yes. Every night after the bell. She walks the aisle and the needles drop as she passes.',
            'Mara. She calls herself a Dreadmonger. She sells the Prince nightmares by the yard, and he pays her in breath.',
            'A frightened sleeper breathes small and doesn\'t stir. That suits him. She waits by Lampless Row\'s last lamp.',
          ],
        },
        hint: 'Ask Sister Coverlet about the lantern on the Long Ward',
      },
      {
        objective: { kind: 'defeat', encounter: ENC_BAD_DREAM },
        hint: 'Beat Dreadmonger Mara on Lampless Row (Bad Dream)',
      },
    ],
    complete: [
      'I\'ve been round all thirty pillows. Not one of them is dreaming of her. One of them is dreaming about cheese.',
      'A great big wheel of cheese, rolling down a hill. I could have wept. Thank you.',
    ],
    reward: { orbs: 6, coins: 50 },
  },

  {
    id: Q_BELL, area: 'slumber', name: 'The Waking Bell', giver: NPC.tolly, requires: { prince: 'reverie' },
    offer: [
      'Nine years I\'ve rung that bell in a felt jacket. It doesn\'t ring, it hums. Dong-hmm. It sings them down.',
      'The Prince is fallen but the felt\'s still on, and they still sleep. Their breath is in the King\'s bottles.',
      'But a bell rung true reaches into dreams. They\'ll dream the bell, and dream they\'re getting up. It\'s a start.',
      'The clapper\'s gone, though. The Feltmaker sawed it in three and hid the bits. I need all three to mend it.',
    ],
    accept: [
      'One\'s in the sheepfold, one\'s in the Down Mill yard, one\'s by the lake. Mumm isn\'t clever. Just thorough.',
    ],
    stages: [
      {
        objective: {
          kind: 'collect', area: 'slumber', label: 'piece of the clapper', emoji: '🔔', color: 0xc9a24a,
          spots: [{ x: 660, y: 560 }, { x: 1660, y: 1390 }, { x: 1020, y: 1470 }],
        },
        hint: 'Find the 3 pieces of the bell\'s clapper (sheepfold, Down Mill yard, lake shore)',
      },
      {
        objective: {
          kind: 'duel', area: 'slumber',
          foe: {
            id: 'slumber-the-waking-bell-duel', court: 'slumber', name: 'Muffled',
            foeName: 'Feltmaker Mumm', foeElement: 'sound', difficulty: 4, gimmick: '',
            at: { x: 1190, y: 610 },
            look: { body: 0xd0c4b8, accent: 0xb6a6d8, hat: 'beanie', traits: ['apron', 'tool'], size: 1.15, eye: 0xffe2a0 },
            challenge: [
              'I\'m paid by the yard to keep that bell quiet. Nine years of felt. Do you know how many yards that is?',
              'All the noise in this court comes to me. Every snore, every creak, every bell. I keep it. It\'s mine.',
            ],
            beaten: ['Ow. OW. That was LOUD. Was it always that loud? ...Was everything always that loud?'],
            coins: 75,
          },
        },
        hint: 'Get past Feltmaker Mumm at the foot of the Belfry',
      },
    ],
    complete: [
      'I cut the jacket off with my mother\'s shears and I rang it. Just once. DONNNG. The whole court heard it.',
      'Every sleeper on the Long Ward turned over at once. Six hundred of them. Like a field of wheat in a wind.',
      'Not awake. Not yet. But dreaming of getting up. Take this — the sheep-bell off the fold gate. It rings true.',
    ],
    reward: { orbs: 9, coins: 80, item: CHARM_BELL },
  },
];
