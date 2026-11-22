import type { QuestDef } from '../../../../IslesTypes';
import { WEEPING_FANG } from './area';
import { FISH_MINNOW, FOOD_FRITTERS, RECIPE_FRITTERS } from './items';

/**
 * The Fang Court's five side quests.
 *
 * The first court on Fangmire, so between them they show how the Matriarch's hold works: the
 * Moult-Tithe and what being passed over does to a household (Hesp), the Draught House's ledger
 * and the passed-over's bread (Pomfret and Nell), the milking that feeds the still (Tamsin), the
 * informers paid in doses (Corwen), and finally the Prince himself, who was milked first (Scutch).
 * Each is somebody refusing to go grey quietly.
 */
export const FANG_QUESTS: QuestDef[] = [
  // ── 1. Short a Skin — talk + collect + duel ──────────────────────────
  {
    id: 'fang-q-short-a-skin',
    area: 'fang',
    name: 'Short a Skin',
    giver: 'fang-hesp',
    offer: [
      'We were one skin short at the Moult-Tithe. The Reeve wrote us down. We were passed over at the Draught.',
      'If the tithe is made whole before the new moon, a house can be written back in. That\'s the law, he says.',
      'Four good skins would do it. Snakes shed all over the court. Wick knows where. Would you?',
    ],
    accept: [
      'Ask Wick first — he\'s by the pit-yard gate. Then take the skins to the Tithe-Reeve on the Hall deck.',
    ],
    stages: [
      {
        objective: {
          kind: 'talk', npc: 'fang-wick',
          lines: [
            'Gran\'s skins? Snakes shed in the long sedge where it\'s warm — they rub their noses on the stems.',
            'West of the Basket, by the old fang near the fen, and the far side of the fen. Inside out, like socks.',
            'Is Gran all right? She keeps sitting on her hands.',
          ],
        },
        hint: 'Ask Wick at the pit-yard gate where the snakes shed',
      },
      {
        objective: {
          kind: 'collect', area: 'fang', label: 'Shed snakeskin', emoji: '🐍', color: 0xd8d4b8,
          spots: [{ x: 640, y: 1000 }, { x: 1000, y: 1180 }, { x: 160, y: 1500 }, { x: 420, y: 1560 }],
        },
        hint: 'Gather 4 shed skins from the sedge round the Basket and the fen',
      },
      {
        objective: {
          kind: 'duel', area: 'fang',
          foe: {
            id: 'fang-q-short-a-skin-duel',
            court: 'fang',
            name: 'Shed by the Household',
            foeName: 'Tithe-Reeve Gall Hookworth',
            foeElement: 'bind',
            difficulty: 3,
            hpMult: 0.95,
            gimmick: 'fang-the-mark',
            at: { x: 1560, y: 600 },
            look: { body: 0xb8a890, accent: 0x3a3a3a, hat: 'tophat', traits: ['book', 'cane', 'glasses'], size: 1.1, eye: 0x9a94a0 },
            challenge: [
              'Four skins. Found in the grass. A tithe is shed by the household that owes it — not picked up off the floor.',
              'This is gathering, not shedding. Gathering is theft of the Matriarch\'s moult. Theft is a chain.',
              'Hold out your wrist. Let us see whose Draught you are drinking.',
            ],
            beaten: ['…Tithe whole. Let the book say whole. I shall find the law about gathering later. There is one.'],
            coins: 90,
          },
        },
        hint: 'Bring the skins to Tithe-Reeve Gall Hookworth on the Hall deck',
      },
    ],
    complete: [
      'Written back in! A dose came this morning with WICKERLY on the jar. The grey has stopped at the knuckle.',
      'I haven\'t much. Take this — it was put by for the long cart. I shan\'t be needing the long cart.',
    ],
    reward: { orbs: 9, coins: 60 },
  },

  // ── 2. Bread for the Grey — fish + cook + deliver + duel ─────────────
  {
    id: 'fang-q-bread-for-the-grey',
    area: 'fang',
    name: 'Bread for the Grey',
    giver: 'fang-pomfret',
    offer: [
      'Nell Mudlark\'s house is passed over. Three of them left. The Beadle takes their bread for "arrears".',
      'I can\'t send bread. He\'d see. But fritters? Fritters are fish. Fish isn\'t on his list. Yet.',
      'Catch me three adder minnows off the fen and I\'ll fry them. You carry them. He won\'t stop a stranger.',
    ],
    accept: [
      'Antivenin rod, mind — Stilthaven sells them. And bring a scoop of Scaleby\'s meal for the batter.',
    ],
    stages: [
      {
        objective: { kind: 'fish', fish: FISH_MINNOW, count: 3 },
        hint: 'Catch 3 adder minnows in the venom fen (antivenin rod)',
      },
      {
        objective: { kind: 'cook', recipe: RECIPE_FRITTERS },
        hint: 'Have The Charmer\'s Basket fry Adder Minnow Fritters (buy snakeroot meal at Scaleby\'s)',
      },
      {
        objective: {
          kind: 'deliver', npc: 'fang-nell', item: FOOD_FRITTERS, count: 2,
          lines: [
            'Fritters? Hot ones? From Pomfret? Oh — children, CHILDREN — no, wait, wait, share them—',
            'Oh no. That\'s the Beadle on the walk. He\'s seen the paper. He always sees the paper.',
          ],
        },
        hint: 'Carry 2 fritters to Nell Mudlark by the causeway',
      },
      {
        objective: {
          kind: 'duel', area: 'fang',
          foe: {
            id: 'fang-q-bread-for-the-grey-duel',
            court: 'fang',
            name: 'In Arrears',
            foeName: 'Ration-Beadle Crumb Larder',
            foeElement: 'gluttony',
            difficulty: 3,
            hpMult: 1.0,
            gimmick: '',
            at: { x: 1650, y: 1580 },
            look: { body: 0xd0a888, accent: 0x5a3a24, hat: 'helmet', traits: ['apron', 'book'], size: 1.35, eye: 0xd8b45a },
            challenge: [
              'A passed-over house is in arrears to the Hall. Arrears are paid in bread. Fritters are bread, fried.',
              'I eat what I collect. It saves on carts. Hand over the paper.',
            ],
            beaten: ['…Let them have it. I\'m full anyway. I\'m always full. It never helps.'],
            coins: 90,
          },
        },
        hint: 'See off Ration-Beadle Crumb Larder on the causeway',
      },
    ],
    complete: [
      'Nell sent the paper back with "THANK YOU" written on it in grease. I\'ve pinned it over the oven.',
      'Here — the Basket\'s tips jar. Don\'t argue. It was going to the Beadle\'s "arrears" otherwise.',
    ],
    reward: { orbs: 10, coins: 50 },
  },

  // ── 3. The Old Yoke — visit + collect + duel ─────────────────────────
  {
    id: 'fang-q-old-yoke',
    area: 'fang',
    name: 'The Old Yoke',
    giver: 'fang-tamsin',
    offer: [
      'Grandmother Mab\'s been in the end yoke forty years. Oldest adder in the shed. She\'s going dry.',
      'Hask says a dry serpent is pressed till it\'s empty. "Milked out." They don\'t come back from milked out.',
      'The end of the rack is held by three iron pins. Pull them and the yoke swings open. She\'ll do the rest.',
      'I can\'t. Hask counts my jars from his chair. You, he doesn\'t know.',
    ],
    accept: [
      'Go and stand by her first, so she knows your smell. Then the pins, along the front. Quick.',
    ],
    stages: [
      {
        objective: { kind: 'visit', area: 'fang', at: { x: 2040, y: 1300 }, r: 70, label: 'Grandmother Mab\'s yoke' },
        hint: 'Stand by Grandmother Mab at the east end of the Milking Shed',
      },
      {
        objective: {
          kind: 'collect', area: 'fang', label: 'Yoke pin', emoji: '📍', color: 0x7a7a72,
          spots: [{ x: 1640, y: 1290 }, { x: 1820, y: 1290 }, { x: 2000, y: 1300 }],
        },
        hint: 'Pull the 3 iron pins along the front of the rack',
      },
      {
        objective: {
          kind: 'duel', area: 'fang',
          foe: {
            id: 'fang-q-old-yoke-duel',
            court: 'fang',
            name: 'Milked Out',
            foeName: 'Shed-Overseer Hask Tallyhook',
            foeElement: 'metal',
            difficulty: 4,
            hpMult: 0.95,
            gimmick: '',
            at: { x: 1780, y: 1420 },
            look: { body: 0xb0a090, accent: 0x5a5a54, hat: 'plague', traits: ['tool', 'apron', 'eyepatch'], size: 1.2, eye: 0xd0d0c8 },
            challenge: [
              'That was a serpent of His Highness\'s stock. Forty years of jars. And you let her into the FEN.',
              'Every drop she had left was the Matriarch\'s. You owe the still a serpent\'s worth. I\'ll take it out of you.',
            ],
            beaten: ['…Write her down as milked out. Dead in the yoke. Nobody checks the fen.'],
            coins: 90,
          },
        },
        hint: 'Face Shed-Overseer Hask Tallyhook before he raises the shed',
      },
    ],
    complete: [
      'She went into the fen without looking back. Forty years and not a look. I\'d have looked back.',
      'Hask has written her down as dead in the yoke. Here — my jar-money. I shan\'t need it. I\'m going slower now.',
    ],
    reward: { orbs: 11, coins: 40 },
  },

  // ── 4. The Ear at the Window — collect + duel ────────────────────────
  {
    id: 'fang-q-ear-at-the-window',
    area: 'fang',
    name: 'The Ear at the Window',
    giver: 'fang-corwen',
    offer: [
      'The man under my floor is called Peep. Lattice Peep. He keeps a tally-stick for every house he listens at.',
      'A notch for every word. At the new moon he hands his sticks in at the Hall for his extra dose.',
      'Three sticks with my name burnt on them are hidden round the walk till then. Find them. Please.',
    ],
    accept: [
      'Under my stilts, along the shed\'s end, and by the vat yard. He hides them where he sits.',
    ],
    stages: [
      {
        objective: {
          kind: 'collect', area: 'fang', label: 'Informer\'s tally-stick', emoji: '🪵', color: 0x8a6a44,
          spots: [{ x: 2200, y: 950 }, { x: 1880, y: 1110 }, { x: 1720, y: 980 }],
        },
        hint: 'Find 3 tally-sticks hidden round Corwen\'s hut, the shed and the vat yard',
      },
      {
        objective: {
          kind: 'duel', area: 'fang',
          foe: {
            id: 'fang-q-ear-at-the-window-duel',
            court: 'fang',
            name: 'Notches',
            foeName: 'Informer Lattice Peep',
            foeElement: 'shadow',
            difficulty: 4,
            hpMult: 0.9,
            gimmick: 'fang-shed-skin',
            at: { x: 2230, y: 1210 },
            look: { body: 0x9a9488, accent: 0x2a2a30, hat: 'cowl', traits: ['mask', 'satchel'], size: 0.9, eye: 0xf2d232 },
            challenge: [
              'Those are mine. A man\'s notches are his living. I\'ve a Mark like anyone — and only one dose a moon.',
              'Two doses for a name. Three for a name and a word. You know what the long cart is. So do I.',
              'Give them back, and I\'ll forget your face. I\'m good at faces. I\'m better at forgetting, for a fee.',
            ],
            beaten: ['…Burn them, then. I\'ll tell the Hall the fen took them. The fen takes everything, they believe that.'],
            coins: 90,
          },
        },
        hint: 'Face Informer Lattice Peep when he comes for his sticks',
      },
    ],
    complete: [
      'Into the stove, all three. I watched every notch go. My girls will be on the list this moon.',
      'Take these. Good nets — net-maker\'s coin. And if you hear anything under your floor, stamp.',
    ],
    reward: { orbs: 9, coins: 70 },
  },

  // ── 5. The Milking Hall — talk + visit + prince ──────────────────────
  {
    id: 'fang-q-milking-hall',
    area: 'fang',
    name: 'The Milking Hall',
    giver: 'fang-scutch',
    requires: { courtReady: 'fang' },
    offer: [
      'All five of his hands, beaten. He watched from under the hood. He has asked for his milking gloves.',
      'Before you go in, know who he is. Granny Hesp on the fen bank nursed him. Ask her.',
      'Then stand under the Weeping Fang, north of the square. It is where she brought him every new moon.',
    ],
    accept: [
      'Hesp, then the Fang. Then the Hall. I will have the doors open.',
    ],
    stages: [
      {
        objective: {
          kind: 'talk', npc: 'fang-hesp',
          lines: [
            'Venin? The Matriarch hatched him and put him in my arms. I nursed him on goat\'s milk and the Draught.',
            'At a year old they took him to the shed and put him in a yoke, to see what he\'d give. He gave a lot.',
            'He was so proud. He showed me the jars. I have never been so sad in my life as I was being proud of him.',
          ],
        },
        hint: 'Ask Granny Hesp on the fen bank about the Prince',
      },
      {
        objective: { kind: 'visit', area: 'fang', at: { x: WEEPING_FANG.x, y: WEEPING_FANG.y + 60 }, r: 80, label: 'The Weeping Fang' },
        hint: 'Stand under the Weeping Fang, north of the Charmers\' Square',
      },
      {
        objective: { kind: 'prince', prince: 'venin' },
        hint: 'Face Prince Venin at the Milking Hall',
      },
    ],
    complete: [
      'He has taken his gloves off. He is sitting on the Hall steps holding them, as if he does not know what they are.',
      'He asked me who is on the passed-over list. All of them. By name. I am reading it to him now.',
      'Take the Hall\'s purse. He says the jars are to go where they are needed, and so is the coin.',
    ],
    reward: { orbs: 12, coins: 150 },
  },
];
