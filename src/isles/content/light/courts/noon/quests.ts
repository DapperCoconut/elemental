import type { QuestDef } from '../../../../IslesTypes';
import { BLEACH_RING, DUSK_HATCH, NOTICES } from './area';
import { FISH_GOBY, FISH_KOI } from './items';

/**
 * The Noon Court's five side quests.
 *
 * The first court up from the quay, so between them they show how the Noon works: the Dusk
 * Ticket and the Clerk's stopwatch (Mirela), the Burning Glass and the people waiting for it
 * (Tam), the last dark things on Solmara (Halloran), Clarity's war on curtains (Linnet), and —
 * before you face him — how the Prince came to have no shadow (Candela). Each is somebody
 * wanting a little darkness and being told it is a crime.
 */
export const NOON_QUESTS: QuestDef[] = [
  // ── 1. An Hour for Wren — talk + visit + duel ────────────────────────
  {
    id: 'noon-q-an-hour',
    area: 'noon',
    name: 'An Hour for Wren',
    giver: 'noon-mirela',
    offer: [
      'Gran\'s ticket was stamped spent and she never got through the door. Eighty-one. She hasn\'t slept in two days.',
      'The Clerk keeps the time on his stopwatch. His watch says she had her hour. Nobody can argue with his watch.',
      'Would you try? Ask Gran first. She was watching him the whole time. She watches everything.',
    ],
    accept: ['She\'s on the bench by the hatch. Speak up, she pretends she can\'t hear in the glare.'],
    stages: [
      {
        objective: {
          kind: 'talk', npc: 'noon-wren',
          lines: [
            'The Clerk? Oh, I watched him. He has a little brass key. He winds the watch with it under the counter.',
            'Wound tight it runs double. Thirty minutes is an hour, by his watch. Half the queue go in for half an hour.',
            'And the other half go in for none, if he likes. He didn\'t like me. I asked him the time once, you see.',
          ],
        },
        hint: 'Ask Granny Wren on the bench what she saw the Clerk do',
      },
      {
        objective: { kind: 'visit', area: 'noon', at: DUSK_HATCH, r: 60, label: 'The Dusk-house ticket hatch' },
        hint: 'Go to the Dusk-house ticket hatch and ask to see the watch',
      },
      {
        objective: {
          kind: 'duel', area: 'noon',
          foe: {
            id: 'noon-q-an-hour-duel',
            court: 'noon',
            name: 'Time Is Kept by the Clerk',
            foeName: 'Dusk-Clerk Horace Second',
            foeElement: 'sand',
            difficulty: 4,
            hpMult: 0.95,
            gimmick: 'noon-high-noon',
            at: { x: 565, y: 1212 },
            look: { body: 0xd8c0a8, accent: 0x3c3850, hat: 'visor', traits: ['glasses', 'book'], size: 0.95, eye: 0xc89a3e },
            challenge: [
              'The watch is the watch. An hour is what the watch says. If the watch says she had it, she had it.',
              'Show you the winding key? There is no key. And if there were a key, it would be licensed.',
              'Step away from the hatch. You\'re casting a shadow on my ledger. That\'s a fine in itself.',
            ],
            beaten: [
              '…There. The key. Take it. It runs true unwound. Mrs Ashby may have her hour. Her full hour. By the watch.',
            ],
            coins: 110,
          },
        },
        hint: 'Make Dusk-Clerk Horace Second hand over his winding key',
      },
    ],
    complete: [
      'Gran\'s gone in. A whole hour, by a true watch. The Clerk stood there holding the door like a footman.',
      'Here — Gran\'s savings, from before the Noon. Coins with the old king on. She says spend it on something dark.',
    ],
    reward: { orbs: 11, coins: 90 },
  },

  // ── 2. Out of Focus — talk + collect + defeat ────────────────────────
  {
    id: 'noon-q-out-of-focus',
    area: 'noon',
    name: 'Out of Focus',
    giver: 'noon-tam',
    offer: [
      'Mam goes in the Glass at the next bell. Till she\'s Clear, like the two by the gantry. You see through them.',
      'She cleaned the Glass for six years, before. She says she knows how to make it not work. She says it quiet.',
      'Talk to her? I can\'t go near the rope. Kindler shouts.',
    ],
    accept: ['She\'s at the front of the rope. The one with red hair. It\'s still red. Go quick.'],
    stages: [
      {
        objective: {
          kind: 'talk', npc: 'noon-orla',
          lines: [
            'Tam sent you. Of course he did. Listen, quick — the lens hangs on two trunnions off the girder.',
            'Kindler sets the focus with brass wedges. He keeps three spare in the wedge-boxes at the gantry feet.',
            'Without them he can\'t re-set it after the bell shakes it off. Take all three. The Glass only warms.',
          ],
        },
        hint: 'Speak to Orla Vell at the front of the rope',
      },
      {
        objective: {
          kind: 'collect', area: 'noon', label: 'Brass focusing wedge', emoji: '📐', color: 0xc89a3e,
          spots: [{ x: 395, y: 738 }, { x: 726, y: 742 }, { x: 560, y: 628 }],
        },
        hint: 'Take the 3 brass focusing wedges from the Burning Glass gantry',
      },
      {
        objective: { kind: 'defeat', encounter: 'noon-burning-glass' },
        hint: 'Lensman Kindler has noticed his wedges are gone — face him (Burning Glass)',
      },
    ],
    complete: [
      'The bell went and Mam stood in the ring and it just went warm. Warm! Kindler said "well, that\'s that, then".',
      'They let her go home. She made tea. Here — she says you\'re to have this. It\'s from the tin. All of it.',
    ],
    reward: { orbs: 13, coins: 100 },
  },

  // ── 3. Something Dark — fish + deliver + duel ────────────────────────
  {
    id: 'noon-q-something-dark',
    area: 'noon',
    name: 'Something Dark',
    giver: 'noon-halloran',
    offer: [
      'I kept the observatory for thirty years. Twenty-two of them I have had nothing to look at.',
      'But in the pool — the gobies. You only see them as dark specks under the glare. Little moving nights.',
      'Would you catch me two? I want to hold something dark in my hands. Before my eyes go entirely.',
    ],
    accept: ['You\'ll need a prism rod — the glare blinds an ordinary float. The quay\'s tackle shop sells them.'],
    stages: [
      {
        objective: { kind: 'fish', fish: FISH_GOBY, count: 2 },
        hint: 'Catch 2 glare gobies in the reflecting pool (prism rod)',
      },
      {
        objective: {
          kind: 'deliver', npc: 'noon-halloran', item: FISH_GOBY, count: 2,
          lines: [
            'Oh. Oh, look at them. In the bowl. Two dark specks going round and round. Like a double star.',
            'I can see them. Truly see them. Dark against the light. I\'d forgotten what it does to your chest.',
            'Ah. The Inspector of Clarity. She\'s seen me with a bowl of darkness. She will call it concealment.',
          ],
        },
        hint: 'Bring the 2 gobies to Old Halloran by the pool',
      },
      {
        objective: {
          kind: 'duel', area: 'noon',
          foe: {
            id: 'noon-q-something-dark-duel',
            court: 'noon',
            name: 'Concealed Darkness',
            foeName: 'Inspector Vitrea Plain',
            foeElement: 'crystal',
            difficulty: 4,
            hpMult: 0.95,
            gimmick: '',
            at: { x: 1790, y: 1120 },
            look: { body: 0xe4ecf0, accent: 0x8fb8cc, hat: 'tophat', traits: ['glasses', 'book', 'cane'], size: 1.1, eye: 0xdcf2fb },
            challenge: [
              'A bowl of dark things, kept on a windowsill, gazed into for pleasure. That is concealment, sir.',
              'Darkness is where lies live. Two darknesses are two lies. I am obliged to bleach them.',
              'And you, stranger, caught them. Accessory. Hold still while I take your particulars.',
            ],
            beaten: ['…They are fish. I shall write that they are fish. Fish are not, strictly, darkness. Strictly.'],
            coins: 110,
          },
        },
        hint: 'See off Inspector Vitrea Plain before she confiscates the gobies',
      },
    ],
    complete: [
      'Two dark stars in a bowl on my sill. I shall chart them. Nobody has charted a goby. I will be the first.',
      'Take this — a zenith koi I caught myself years ago and kept in the cistern. Its spot is the darkest of all.',
    ],
    reward: { orbs: 12, coins: 60, item: FISH_KOI, itemCount: 1 },
  },

  // ── 4. A Curtain for the Cradle — collect + duel ─────────────────────
  {
    id: 'noon-q-cradle-curtain',
    area: 'noon',
    name: 'A Curtain for the Cradle',
    giver: 'noon-linnet',
    offer: [
      'My Bea is four months old and she has never slept more than an hour. Babies need the dark. Everyone knows.',
      'I sewed her a curtain for the cradle. Four scraps. The Draper-Confiscator found it and cut it up.',
      'He pinned the pieces on the Clarity boards round the court. As evidence. Would you bring them back?',
    ],
    accept: ['One by the plaza steps, one by the Solarium, one on the Lantern road, one here on the terrace.'],
    stages: [
      {
        objective: {
          kind: 'collect', area: 'noon', label: 'Scrap of Bea\'s curtain', emoji: '🧵', color: 0x3c3850,
          spots: NOTICES.map((n) => ({ x: n.x, y: n.y + 26 })),
        },
        hint: 'Take down the 4 scraps of curtain pinned to the Clarity boards',
      },
      {
        objective: {
          kind: 'duel', area: 'noon',
          foe: {
            id: 'noon-q-cradle-curtain-duel',
            court: 'noon',
            name: 'Evidence',
            foeName: 'Draper-Confiscator Muslin',
            foeElement: 'cloth',
            difficulty: 5,
            hpMult: 0.9,
            gimmick: 'noon-awnings',
            at: { x: 2030, y: 1210 },
            look: { body: 0xd8c4b0, accent: 0x1e1c2a, hat: 'tophat', traits: ['tool', 'satchel', 'scarf'], size: 1.15, eye: 0xefe2c4 },
            challenge: [
              'Those are exhibits. Four exhibits. Lightproof, close-woven, hemmed to fit a cradle. Premeditated shade.',
              'I wear what I confiscate, stranger. Every curtain on this terrace is somewhere on my coat.',
              'Give them here. We will settle it under the awnings, where it is licensed.',
            ],
            beaten: ['…Take them. The baby may have the curtain. I may have a lie-down. I may have a very long lie-down.'],
            coins: 110,
          },
        },
        hint: 'Draper-Confiscator Muslin wants his exhibits back — stop him',
      },
    ],
    complete: [
      'All four. A bit stretched. I\'ll stitch them up by the bell — it\'ll be ugly. Bea won\'t mind. Bea will SLEEP.',
      'Take this. It was for a new needle. I\'d rather you had it. I\'ve got thread, and now I\'ve got the dark.',
    ],
    reward: { orbs: 12, coins: 110 },
  },

  // ── 5. The Unshadowed — talk + visit + prince ────────────────────────
  {
    id: 'noon-q-unshadowed',
    area: 'noon',
    name: 'The Unshadowed',
    giver: 'noon-candela',
    requires: { courtReady: 'noon' },
    offer: [
      'All five. His Highness watched from the dome. He has asked for his prism to be polished. Twice.',
      'Before you go in, you should know what he is. Not a tyrant — what was done to him. Ewan Glass knows. Ask him.',
      'And then go and stand in the ring under the Glass. Everyone should, once. He did.',
    ],
    accept: ['Ewan walks the plaza. You will see him — or you will see through him. Then the ring. Then the doors.'],
    stages: [
      {
        objective: {
          kind: 'talk', npc: 'noon-ewan',
          lines: [
            'Lumen. He was seven when the Heliostat went up. Frightened of his own shadow — it followed him, he said.',
            'His father said a prince must fear nothing. So he had the shadow burnt off him. In the Glass. The first.',
            'He didn\'t go Clear. He just never cast a shadow again. He has been alone in the light ever since.',
          ],
        },
        hint: 'Ask Ewan Glass, the Clear, about the Prince',
      },
      {
        objective: { kind: 'visit', area: 'noon', at: BLEACH_RING, r: 60, label: 'The bleaching ring' },
        hint: 'Stand in the bleaching ring under the Burning Glass',
      },
      {
        objective: { kind: 'prince', prince: 'lumen' },
        hint: 'Face Prince Lumen at the Solarium',
      },
    ],
    complete: [
      'He has closed the shutters. CLOSED them. He is sitting on the floor of the Solarium looking at his shadow.',
      'He asked me if it would go away again. I told him no, Highness, they stay. He said "good". Just "good".',
      'Take the stewardship purse. He says the Solarium needs curtains now, and curtains are expensive.',
    ],
    reward: { orbs: 15, coins: 220 },
  },
];
