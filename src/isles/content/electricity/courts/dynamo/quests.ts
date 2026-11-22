import type { QuestDef } from '../../../../IslesTypes';
import { BELL, CAGE, CIRCUIT_SEVEN, ROW_N } from './area';
import { FISH_MINNOW, FISH_TROUT, FOOD_LOAF, RECIPE_LOAF } from './items';

/**
 * The Dynamo Court's five side quests.
 *
 * The first court on Voltreach, so between them they show how the Draw works: the meter at the
 * door and who reads it (Hettie), what *switched off* means on a cold night (Bettony and Sal), what
 * *earthed* means and where the cage goes (Ada), the wheels and the fines that keep them turning
 * (Bram), and finally the Bell and the boy who runs down to watch it ring (Dunmore). Each is
 * somebody refusing to go dark.
 */

/** A meter seal on a neighbour's door, a step out into the lane. */
const seal = (x: number) => ({ x: x - 5, y: ROW_N + 26 });

export const DYNAMO_QUESTS: QuestDef[] = [
  // ── 1. The Crooked Meter — collect + talk + duel ─────────────────────
  {
    id: 'dynamo-q-crooked-meter',
    area: 'dynamo',
    name: 'The Crooked Meter',
    giver: 'dynamo-hettie',
    offer: [
      'We crank full. Every night. And every morning the meter at our door reads short. One tag already.',
      'The reader stamps a brass seal on each meter so nobody can tamper. Mine\'s been scratched open.',
      'If it\'s only mine, it\'s me. If the neighbours\' are scratched too… Would you look at four doors?',
    ],
    accept: [
      'Fourteen, thirteen, nine and eight. Look close at the seals. Then take them to Ambrose at the Board.',
    ],
    stages: [
      {
        objective: {
          kind: 'collect', area: 'dynamo', label: 'Scratched meter seal', emoji: '🔩', color: 0xc8a24a,
          spots: [seal(180), seal(290), seal(880), seal(990)],
        },
        hint: 'Check the meter seals on four doors along Crank Row',
      },
      {
        objective: {
          kind: 'talk', npc: 'dynamo-ambrose',
          lines: [
            'Seals? Let me see. …Scratched. All four, the same tool, the same way. Set back a tenth each night.',
            'A tenth of a Draw, off every house on the Row, every night for a year. Where would that go?',
            'Into a reader\'s pocket, I suppose. Sold on to the hall as "surplus". Quill Tally reads the Row.',
            'Oh. Oh no. He\'s here. He reads at this hour. He has seen the seals in your hand.',
          ],
        },
        hint: 'Show the seals to Ambrose Ledger at the Meter Board',
      },
      {
        objective: {
          kind: 'duel', area: 'dynamo',
          foe: {
            id: 'dynamo-q-crooked-meter-duel',
            court: 'dynamo',
            name: 'A Tenth Each Night',
            foeName: 'Meter-Reader Quill Tally',
            foeElement: 'technology',
            difficulty: 3,
            hpMult: 0.95,
            gimmick: '',
            at: { x: 640, y: 1500 },
            look: { body: 0xc8b4a0, accent: 0xc8a24a, hat: 'tophat', traits: ['glasses', 'book', 'tool'], size: 0.95, eye: 0xf0d68a },
            challenge: [
              'A tenth. A TENTH. Nobody misses a tenth. Nobody but a widow with a stranger at her elbow.',
              'Those are the Grid\'s seals. Tampering with a seal is theft from the Grid. I\'ll swear you did it.',
              'Give them here, and I\'ll read your meter too.',
            ],
            beaten: ['…Re-chalk them, then. All of them. I\'ll walk the wheel. I\'ve always wondered what it was like.'],
            coins: 70,
          },
        },
        hint: 'Stop Meter-Reader Quill Tally on Crank Row',
      },
    ],
    complete: [
      'Full! Ambrose chalked us FULL, back a whole month. The tag\'s off. My lads slept in a warm house.',
      'Here — the money we\'d put by for when they came for us. We won\'t need it now. Not this year.',
    ],
    reward: { orbs: 8, coins: 60 },
  },

  // ── 2. A Loaf for the Switched-Off — fish + cook + deliver + duel ────
  {
    id: 'dynamo-q-brownout-loaf',
    area: 'dynamo',
    name: 'A Loaf for the Switched-Off',
    giver: 'dynamo-bettony',
    offer: [
      'Sal Draycott\'s house is off. Her girls are locked inside it — the lock\'s on the current, see.',
      'No heat in there, no oven. And it\'s a theft from the Grid to pass warm food to an unmetered house.',
      'So I bake a Brownout Loaf. Spark minnow through the crumb keeps it soft in the cold. Catch me two?',
    ],
    accept: [
      'Off the race by the wheelhouses — you\'ll want an insulated rod. Then bring them here and I\'ll bake.',
    ],
    stages: [
      {
        objective: { kind: 'fish', fish: FISH_MINNOW, count: 2 },
        hint: 'Catch 2 spark minnows in the Mill Race',
      },
      {
        objective: { kind: 'cook', recipe: RECIPE_LOAF },
        hint: 'Have Bettony bake Brownout Loaves at the Ovenlight',
      },
      {
        objective: {
          kind: 'deliver', npc: 'dynamo-sal', item: FOOD_LOAF, count: 2,
          lines: [
            'Bread? Warm bread? Through the letterbox — careful — girls, come here. Come HERE.',
            'They\'ve got it. They\'re eating it by the door. Oh, that\'s the first warm thing in that house in a week.',
            '…That\'s Rimewell Sharpe coming down the Row. The Cold-Warden. She checks switched-off houses stay cold.',
          ],
        },
        hint: 'Pass the 2 loaves through Sal Draycott\'s letterbox on Crank Row',
      },
      {
        objective: {
          kind: 'duel', area: 'dynamo',
          foe: {
            id: 'dynamo-q-brownout-loaf-duel',
            court: 'dynamo',
            name: 'Heat Is Current',
            foeName: 'Cold-Warden Rimewell Sharpe',
            foeElement: 'ice',
            difficulty: 3,
            gimmick: 'dynamo-brownout',
            at: { x: 360, y: 1505 },
            look: { body: 0xd6dce4, accent: 0x9ed6e6, hat: 'beanie', traits: ['scarf', 'cane', 'glasses'], size: 1.05, eye: 0xd6f4ff },
            challenge: [
              'Heat is current. Bread warm from an oven is current. You have passed current into a house that is off.',
              'A switched-off house is cold. That is what switched off MEANS. Otherwise, why pay?',
              'Hand me what\'s left of the loaf, and stand in the dark where you belong.',
            ],
            beaten: ['…The bread\'s gone cold anyway, by now. Cold is cold. I\'ll write it as cold.'],
            coins: 70,
          },
        },
        hint: 'Face Cold-Warden Rimewell Sharpe outside No. 13',
      },
    ],
    complete: [
      'Rimewell wrote me up for heat loss. I\'ve pinned the ticket by the oven where I can see it.',
      'Take a share of the till, love. I\'ll bake another batch tonight. There are more houses off than Sal\'s.',
    ],
    reward: { orbs: 9, coins: 50 },
  },

  // ── 3. Three Times Off — talk + visit + duel ─────────────────────────
  {
    id: 'dynamo-q-three-times-off',
    area: 'dynamo',
    name: 'Three Times Off',
    giver: 'dynamo-ada',
    offer: [
      'My brother Jory is in that cage. Three times switched off. At the Bell it takes him up the rails.',
      'To the Treadmill Galleries in the Crown Coil. Nobody I know has come back down.',
      'The lock\'s held by current, not a key. Mott keeps it. Talk to him? He knew our father.',
    ],
    accept: ['Be quick. The Bell rings when it rings. It doesn\'t wait for anybody.'],
    stages: [
      {
        objective: {
          kind: 'talk', npc: 'dynamo-mott',
          lines: [
            'I can\'t open it. Current holds the lock, and the current comes from the switchyard. Circuit seven.',
            'If somebody were to throw circuit seven\'s breaker, the lock would just… let go. Shocking, how locks fail.',
            'Sergeant Wirrow rides the cage up. He\'ll come running when it drops. I\'d not be standing here when he does.',
          ],
        },
        hint: 'Ask Mott Earley, the turnkey, about the cage lock',
      },
      {
        objective: { kind: 'visit', area: 'dynamo', at: CIRCUIT_SEVEN, r: 60, label: 'Circuit seven\'s breaker' },
        hint: 'Throw the breaker for circuit seven in the Switchyard',
      },
      {
        objective: {
          kind: 'duel', area: 'dynamo',
          foe: {
            id: 'dynamo-q-three-times-off-duel',
            court: 'dynamo',
            name: 'Earthed',
            foeName: 'Earthing-Sergeant Holdfast Wirrow',
            foeElement: 'bind',
            difficulty: 4,
            hpMult: 0.95,
            gimmick: 'dynamo-lightning-rods',
            at: { x: CAGE.x + 110, y: CAGE.y + 110 },
            look: { body: 0xb0a090, accent: 0x7a3e1d, hat: 'helmet', traits: ['tool', 'bandage', 'beard'], size: 1.25, eye: 0xd8382e },
            challenge: [
              'Circuit seven went dark and the lock went with it. Locks don\'t fail. People fail locks.',
              'Three times off is earthed. That is the law the Empress wrote, and the cage is the law with wheels on.',
              'I\'ll take him up myself, on foot if I have to. And you can walk up beside him.',
            ],
            beaten: ['…Write it in the book as a failed lock. Write it neat. I\'ll sign it. My hand\'s shaking. Write it.'],
            coins: 80,
          },
        },
        hint: 'Stop Earthing-Sergeant Wirrow at the cage before he takes Jory up the rails',
      },
    ],
    complete: [
      'He\'s out. He\'s OUT. He walked out of the cage and sat down on the road and cried, and I sat with him.',
      'Mott signed the cage up the rails empty. Here — it\'s what we saved to visit him. We won\'t need to now.',
    ],
    reward: { orbs: 10, coins: 70 },
  },

  // ── 4. Grilles of the Race — fish + deliver + defeat ─────────────────
  {
    id: 'dynamo-q-race-grilles',
    area: 'dynamo',
    name: 'Grilles of the Race',
    giver: 'dynamo-bram',
    offer: [
      'Turbine trout. Fat as loaves this season, and lazy. They lie up behind the wheels and clog my grilles.',
      'A clogged grille, a stopped wheel, a short Wheelhouse — and Tessa fines me for it. Fines are paid in Draw.',
      'Catch me three of them out of the race? Nobody\'s allowed to eat them, mind. They\'re the Grid\'s fish.',
    ],
    accept: ['You\'ll need an insulated rod. The race is live — the fish are half current themselves.'],
    stages: [
      {
        objective: { kind: 'fish', fish: FISH_TROUT, count: 3 },
        hint: 'Catch 3 turbine trout in the Mill Race',
      },
      {
        objective: {
          kind: 'deliver', npc: 'dynamo-ivy', item: FISH_TROUT, count: 2,
          lines: [
            'For me? On the wheel? …Bram sent you. He always says the fish are the Grid\'s, and then he does this.',
            'I shall eat one walking and keep one for the yard. Oh, that smells of the river. Thank you.',
            'Tessa is watching from the bank, dear. She has a list of fish in her pocket. You are on it now.',
          ],
        },
        hint: 'Take 2 of the trout to Ivy Faraday on the treadwheel',
      },
      {
        objective: { kind: 'defeat', encounter: 'dynamo-mill-race' },
        hint: 'Face Millwright Tessa (Mill Race) on the race bank',
      },
    ],
    complete: [
      'Grilles clean, wheels turning, and Tessa sat down in her own race. Never seen her wet above the boots.',
      'She\'s cancelled my fines. All of them. Here — the fine money I\'d put aside. Spend it on something dry.',
    ],
    reward: { orbs: 7, coins: 55 },
  },

  // ── 5. The Brownout Bell — talk + visit + prince ─────────────────────
  {
    id: 'dynamo-q-brownout-bell',
    area: 'dynamo',
    name: 'The Brownout Bell',
    giver: 'dynamo-dunmore',
    requires: { courtReady: 'dynamo' },
    offer: [
      'All five of his champions down, and he\'ll have heard it over the wires. He\'s pacing. He\'s always pacing.',
      'Before you go up to the hall, ask Ivy Faraday about him. On the treadwheel. She raised him, near enough.',
      'And put your hand on the Bell. Everyone in this court has stood under it, waiting to see if their lights go.',
    ],
    accept: ['Ivy, then the Bell. Then up to the hall. He\'ll be at the door before you are. He always is.'],
    stages: [
      {
        objective: {
          kind: 'talk', npc: 'dynamo-ivy',
          lines: [
            'Volt was frightened of the dark. Terribly. He\'d sit up in bed all night with a lamp in each hand.',
            'His mother came once, to see why the lamps in the nursery drew so much. He told her he was frightened.',
            'She said, then never let it be dark. And he hasn\'t. He hasn\'t stopped moving since. Poor boy.',
          ],
        },
        hint: 'Ask Ivy Faraday on the treadwheel about the Prince',
      },
      {
        objective: { kind: 'visit', area: 'dynamo', at: { x: BELL.x, y: BELL.y + 26 }, r: 70, label: 'The Brownout Bell' },
        hint: 'Lay a hand on the Brownout Bell at the court gate',
      },
      {
        objective: { kind: 'prince', prince: 'volt' },
        hint: 'Face Prince Volt at the Generator Hall',
      },
    ],
    complete: [
      'He didn\'t ring it. He stood under it at the hour with his hand on the bronze, and he didn\'t ring it.',
      'Then he walked — walked — to the Ovenlight and sat down on the step. Bettony gave him a bun.',
      'Take the bell fund. It was for a new hammer. I think we\'ve done with hammers.',
    ],
    reward: { orbs: 11, coins: 150 },
  },
];
