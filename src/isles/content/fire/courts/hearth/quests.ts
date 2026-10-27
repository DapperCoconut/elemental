import type { QuestDef } from '../../../../IslesTypes';
import { GREAT_HEARTH } from './area';

/**
 * The Hearth Court's five side quests.
 *
 * The court is the isle's front door, so between them the five quests walk a new player through
 * every objective the Isles use — gather (Sorrel), fish and hand over (Wick), fight a champion
 * (Pim), carry something across town (Varnaby), and finally go and see the Prince (Embry) —
 * each as a small story about somebody trying to get one over on the tithe.
 */
export const HEARTH_QUESTS: QuestDef[] = [
  // ── 1. A Hearth Gone Cold — collect + talk + duel ───────────────────────────
  {
    id: 'hearth-q-cold-hearth',
    area: 'hearth',
    name: 'A Hearth Gone Cold',
    giver: 'hearth-sorrel',
    offer: [
      'Oh! You\'re not a tithe-man. Thank the ash. Dear, my fire\'s down to one sulking coal.',
      'The coal-cart spills along the lower terrace every morning. The gutters are full of lumps.',
      'Five would do me. Five lumps, and somebody who can make a fire out of nearly nothing.',
    ],
    accept: [
      'Bless you. Look in the gutters and round the coal bunker. They glint a bit if you squint.',
    ],
    stages: [
      {
        objective: {
          kind: 'collect', area: 'hearth', label: 'Spilled coal', emoji: '🪨', color: 0x2b2725,
          spots: [{ x: 300, y: 1410 }, { x: 640, y: 1430 }, { x: 760, y: 1625 }, { x: 1560, y: 1600 }, { x: 2150, y: 1420 }],
        },
        hint: 'Pick up 5 lumps of spilled coal on the lower terrace',
      },
      {
        objective: {
          kind: 'talk', npc: 'hearth-pim',
          lines: [
            'Sorrel\'s fire? Number Nine? I know that flue. It draws crooked, you have to blow from the left.',
            'Give us the coal. Right. Only — Coal-Tally Grest counts the spill. Every lump. It\'s the Prince\'s, he says.',
            'He\'ll be at Number Nine for it before I\'m down the chimney. Don\'t let him in the door.',
          ],
        },
        hint: 'Ask Pim the climbing boy, by the stair, to light the fire',
      },
      {
        objective: {
          kind: 'duel', area: 'hearth',
          foe: {
            id: 'hearth-q-cold-hearth-duel',
            court: 'hearth',
            name: 'Counted Coal',
            foeName: 'Coal-Tally Grest',
            foeElement: 'gunpowder',
            difficulty: 1,
            hpMult: 0.9,
            gimmick: '',
            at: { x: 560, y: 1370 },
            look: { body: 0x8a7d74, accent: 0x231f1d, hat: 'cap', traits: ['satchel', 'book', 'brand'], size: 1.1 },
            challenge: [
              'Five lumps short on the lower gutter. Five. And here\'s smoke out of Number Nine\'s pot. Funny, that.',
              'Spilled coal is the Prince\'s coal. I\'ll have it back out of her grate, lit or not.',
              'Stand aside or go up with it. Coal dust burns lovely when you know how.',
            ],
            beaten: ['Mark it... "lost to the gutter". Five lumps. The book will believe it.'],
            coins: 30,
          },
        },
        hint: 'Stop Coal-Tally Grest taking the coal back from Sorrel\'s door',
      },
    ],
    complete: [
      'Pim came down MY chimney, the little monkey. Blew once. Look at it go.',
      'And you saw off Grest on my own step. He\'ll not count my grate again in a hurry.',
      'Here. It\'s not much — the tithe takes most things — but it\'s yours, with an old woman\'s thanks.',
    ],
    reward: { orbs: 2, coins: 30 },
  },

  // ── 2. Paid in Claws — fish + deliver + duel ────────────────────────────────
  {
    id: 'hearth-q-cistern',
    area: 'hearth',
    name: 'Paid in Claws',
    giver: 'hearth-wick',
    offer: [
      'The Prince taxes my catch by the claw. I\'m two crayfish short this quarter. Two!',
      'Varnaby the clerk takes tithe in kind if you bring it to him at the office. Up top, by the lamps.',
      'Catch me two soot crayfish and walk them up to him on my account? My knees don\'t climb.',
    ],
    accept: [
      'Stand at the cistern\'s edge and cast. When it bites, keep it in the bar. Crayfish are lazy.',
    ],
    stages: [
      {
        objective: { kind: 'fish', fish: 'fish-soot-crayfish', count: 2 },
        hint: 'Catch 2 soot crayfish in the cistern',
      },
      {
        objective: {
          kind: 'deliver', npc: 'hearth-varnaby', item: 'fish-soot-crayfish', count: 2,
          lines: [
            'Two soot crayfish, on account of W. Dunmore. Paid. In full.',
            'Between us, his account says he paid six. Tell him nothing. He\'ll only worry.',
            'One thing. Bailiff Sluice watched you fish. The cistern\'s the Prince\'s water. He\'ll want a rod-fee.',
            'He waits at the foot of the middle stair. He charges whatever you\'ve got. Don\'t pay him.',
          ],
        },
        hint: 'Take 2 soot crayfish up to Varnaby at the tithe office',
      },
      {
        objective: {
          kind: 'duel', area: 'hearth',
          foe: {
            id: 'hearth-q-cistern-duel',
            court: 'hearth',
            name: 'Rod-Fee',
            foeName: 'Water-Bailiff Sluice',
            foeElement: 'water',
            difficulty: 1,
            hpMult: 0.9,
            gimmick: '',
            at: { x: 1200, y: 960 },
            look: { body: 0x7f8f96, accent: 0x2b3a44, hat: 'tricorn', traits: ['rod', 'satchel', 'brand'], size: 1.15 },
            challenge: [
              'You dipped a line in the Prince\'s cistern. Two claws out. That\'s a rod-fee, and the fee is everything.',
              'Dunmore\'s paid up? Lovely. Then you can pay for him. Turn out your pockets.',
            ],
            beaten: ['Fine. Fine! Fish where you like. I\'ll say the crayfish jumped out on their own.'],
            coins: 30,
          },
        },
        hint: 'Refuse Water-Bailiff Sluice his rod-fee at the middle stair',
      },
    ],
    complete: [
      '"Paid in full"? He wrote that? In the book? Varnaby never wrote "full" in his life.',
      'And Sluice is off the stair? He\'s had a fee off me every quarter for nine years. Ha!',
      'Here — it was my da\'s. Don\'t look at me like that, it\'s only a few orbs. Take it.',
    ],
    reward: { orbs: 3 },
  },

  // ── 3. Up the Flue — collect + defeat ────────────────────────────────
  {
    id: 'hearth-q-flue',
    area: 'hearth',
    name: 'Up the Flue',
    giver: 'hearth-pim',
    offer: [
      'I dropped my brushes. All four. Off the roofs on the cross street when the wind got up.',
      'Captain Mottle docks a day\'s pay per brush. That\'s four days. That\'s a month of no supper.',
      'Find \'em? And then... could you tell the Captain? Loudly? With your fists, I mean?',
    ],
    accept: [
      'They\'re black and bristly and about as big as me. They\'ll be in the street or the gutters.',
    ],
    stages: [
      {
        objective: {
          kind: 'collect', area: 'hearth', label: 'Flue brush', emoji: '🧹', color: 0x1d1a19,
          spots: [{ x: 240, y: 915 }, { x: 540, y: 700 }, { x: 1320, y: 965 }, { x: 2300, y: 905 }],
        },
        hint: 'Find Pim\'s 4 flue brushes along the middle terrace',
      },
      {
        objective: { kind: 'defeat', encounter: 'hearth-soot-season' },
        hint: 'Beat Sweep-Captain Mottle (Soot Season) on the cross street',
      },
    ],
    complete: [
      'He PAID me! All four days! And he said "the boy can keep his brushes, they\'re cursed anyway".',
      'I don\'t know what that means but I\'m keeping them. Here, this is from my secret tin.',
    ],
    reward: { orbs: 3, coins: 20 },
  },

  // ── 4. Cooked Books — collect + talk + defeat ────────────────────────
  {
    id: 'hearth-q-ledger',
    area: 'hearth',
    name: 'Cooked Books',
    giver: 'hearth-varnaby',
    requires: { questDone: 'hearth-q-cistern' },
    offer: [
      'You know how to keep your mouth shut. Wick said so. Listen. I have a confession and an errand.',
      'I have been marking cold hearths as "paid". Thirty-one of them. The receipts are... fictions.',
      'The wind took them across the terrace. If a tithe-man finds one, thirty-one families go to the Kiln.',
    ],
    accept: [
      'Gather them — four sheets, brand-stamped — and take them to Hessa\'s forge. She\'ll burn them.',
    ],
    stages: [
      {
        objective: {
          kind: 'collect', area: 'hearth', label: 'Forged receipt', emoji: '📜', color: 0xd8ccb0,
          spots: [{ x: 190, y: 495 }, { x: 1000, y: 505 }, { x: 1260, y: 300 }, { x: 2210, y: 470 }],
        },
        hint: 'Gather Varnaby\'s 4 forged receipts on the upper terrace',
      },
      {
        objective: {
          kind: 'talk', npc: 'hearth-hessa',
          lines: [
            'Varnaby\'s handwriting. He forms his sevens like a coward. Give them here.',
            'There. Ash. But Ostra up the street keeps a copy of every brand she\'s issued. She\'ll notice.',
          ],
        },
        hint: 'Have Hessa burn the receipts in her forge',
      },
      {
        objective: { kind: 'defeat', encounter: 'hearth-three-brands' },
        hint: 'Beat Brandwright Ostra (Three Brands) before she checks her copies',
      },
    ],
    complete: [
      'Ostra\'s copies? Burned in her own forge, during your... discussion. What a terrible accident.',
      'Thirty-one families. You will never be thanked by any of them, because they must never know. I thank you.',
    ],
    reward: { orbs: 4, coins: 40 },
  },

  // ── 5. The Kept Flame — visit + prince ───────────────────────────────
  {
    id: 'hearth-q-kept-flame',
    area: 'hearth',
    name: 'The Kept Flame',
    giver: 'hearth-embry',
    requires: { courtReady: 'hearth' },
    offer: [
      'Five champions. All of them. I\'ve been watching from the stair. So has the Prince.',
      'Before you go in: the Great Hearth, on this terrace. Go and stand in front of it.',
      'It\'s the first fire the King ordered kept. Every tithe in this town comes back to that one.',
    ],
    accept: [
      'Look at it properly. Then go up to the manor and tell Kindle what you think of it.',
    ],
    stages: [
      {
        objective: { kind: 'visit', area: 'hearth', at: { x: GREAT_HEARTH.x, y: GREAT_HEARTH.y + 70 }, r: 90, label: 'The Great Hearth' },
        hint: 'Stand before the Great Hearth on the upper terrace',
      },
      {
        objective: { kind: 'prince', prince: 'kindle' },
        hint: 'Face Prince Kindle at the manor',
      },
    ],
    complete: [
      'He yielded. I heard it through the door. "Then let them keep their own." That\'s what he said.',
      'The watch is yours if you ever want it. You won\'t. Take this instead. And my thanks. And my oath.',
    ],
    reward: { orbs: 6, coins: 100 },
  },
];
