import type { QuestDef } from '../../../../IslesTypes';
import { DIAL } from './area';
import { FISH_PIKE } from './items';
import { Q_CANDLE, Q_GREY, Q_LANTERN, Q_SHADOW, Q_TITHE } from './npcs';

/**
 * The Umbral Court's five side quests.
 *
 * Between them they show what the dark costs: a child who has never seen a flame (Ember's candle),
 * what a shadow is in a town that weaves them (Wick's runaway shadow), what going grey is and the
 * folk-cures people risk the Draught House for (the Gloams), how the cloth Tithe grinds the grey
 * down further (Sable's yard), and finally the Prince's own fear of the dark (the lantern).
 */
export const UMBRAL_QUESTS: QuestDef[] = [
  // ── 1. A Light Under a Bushel — collect + talk + duel ────────────────
  {
    id: Q_CANDLE,
    area: 'umbral',
    name: 'A Light Under a Bushel',
    giver: 'umbral-ember',
    offer: [
      'The Tarrow boy by the dial. Wick. Six years old and he has never once seen a flame that wasn\'t black.',
      'His mother came to my shutter and asked for a candle. You don\'t ask. They put you on the grey cart for asking.',
      'I\'ve the wicks. The tallow I hid round town, four stubs, where the snuffers don\'t look. Fetch them?',
    ],
    accept: [
      'By the grey houses. The ones with the rag on the door. Nobody searches a house that\'s already lost.',
    ],
    stages: [
      {
        objective: {
          kind: 'collect', area: 'umbral', label: 'A hidden tallow stub', emoji: '🕯️', color: 0xffd27a,
          spots: [{ x: 1000, y: 440 }, { x: 2160, y: 960 }, { x: 2140, y: 1540 }, { x: 300, y: 1100 }],
        },
        hint: 'Find the 4 tallow stubs Ember hid by the grey-ragged houses',
      },
      {
        objective: {
          kind: 'talk', npc: 'umbral-wick',
          lines: [
            '(you cup the little candle and strike it) Oh. Oh. It\'s… it\'s YELLOW. It\'s warm. It\'s warm on my face.',
            'Look, my hand\'s got a colour. Mum! MUM! Come and see my hand!',
            'Someone\'s coming down the road with a snuffer. A big one. He\'s sniffing. He smelt it.',
          ],
        },
        hint: 'Take the candle to Wick Tarrow by the night-dial',
      },
      {
        objective: {
          kind: 'duel', area: 'umbral',
          foe: {
            id: 'umbral-q-candle-duel',
            court: 'umbral',
            name: 'Snuffed',
            foeName: 'Snuffer Corvin Dimm',
            foeElement: 'oil',
            difficulty: 4,
            hpMult: 0.95,
            gimmick: '',
            at: { x: 1400, y: 1080 },
            look: { body: 0xa8988c, accent: 0x14081c, hat: 'plague', traits: ['tool', 'lantern'], size: 1.25, eye: 0x6a3a9a },
            challenge: [
              'Tallow. I can smell tallow from the Bole steps. Yellow light, on the Prince\'s road, in front of a child.',
              'Hand it here. One pinch and it\'s out. Then we\'ll talk about the household that asked for it.',
              'I\'ve a whole cask of black oil for people who argue.',
            ],
            beaten: ['…Fine. I smelt nothing. I\'ll smell nothing for a week. Keep it shaded, for pity\'s sake.'],
            coins: 115,
          },
        },
        hint: 'Stop Snuffer Corvin Dimm before he pinches out Wick\'s candle',
      },
    ],
    complete: [
      'He slept. Wick slept the whole night with the candle on the sill. His mother says he smiled in his sleep.',
      'Take this. It\'s what the Tarrows had. They insisted. I couldn\'t stop them pressing it on me, so — you.',
    ],
    reward: { orbs: 9, coins: 90 },
  },

  // ── 2. The Boy Whose Shadow Walked Off — collect + talk + duel ───────
  {
    id: Q_SHADOW,
    area: 'umbral',
    name: 'The Boy Whose Shadow Walked Off',
    giver: 'umbral-wick',
    requires: { questDone: Q_CANDLE },
    offer: [
      'When the candle was lit, my shadow saw it. Shadows here have never seen proper light.',
      'It got up off the floor. It looked at me. And then it RAN. It\'s out there in the dark on its own.',
      'Bits of it snagged on things as it went. Can you get them? Sable at the looms can sew a shadow back on.',
    ],
    accept: [
      'It went past the Bole and round the mere and out by the big trees. Bring the bits to Sable.',
    ],
    stages: [
      {
        objective: {
          kind: 'collect', area: 'umbral', label: 'A snagged scrap of shadow', emoji: '🌑', color: 0x2a2048,
          spots: [{ x: 2200, y: 740 }, { x: 1480, y: 1500 }, { x: 140, y: 1300 }],
        },
        hint: 'Gather the 3 scraps of Wick\'s shadow, snagged round the court',
      },
      {
        objective: {
          kind: 'talk', npc: 'umbral-sable',
          lines: [
            'A child\'s shadow. Look at it — it\'s barely a thread. He\'s been eating, at least.',
            'I can sew these to the rest of it. But the rest of it has to be HERE. It\'s in my yard. I can feel it.',
            'It\'s hiding in the looms. It\'s frightened. Frightened things bite. Catch it for me.',
          ],
        },
        hint: 'Take the scraps to Sable Thrum at the looms',
      },
      {
        objective: {
          kind: 'duel', area: 'umbral',
          foe: {
            id: 'umbral-q-shadow-duel',
            court: 'umbral',
            name: 'The Runaway Shadow',
            foeName: 'Wick\'s Shadow',
            foeElement: 'shadow',
            difficulty: 4,
            hpMult: 0.85,
            gimmick: 'umbral-shade-step',
            at: { x: 760, y: 1330 },
            look: { body: 0x1a1420, accent: 0x05030a, hat: 'beanie', traits: ['scarf'], size: 0.78, eye: 0xc8d8ff },
            challenge: [
              '(it is the shape of a small boy, flat and black, and it is shaking)',
              '(it points at the light on your face, and backs into the shade under the loom)',
            ],
            beaten: ['(it sits down on the floor in a heap, and lets Sable thread a needle through its heel)'],
            coins: 115,
          },
        },
        hint: 'Catch Wick\'s shadow in the weavers\' yard',
      },
    ],
    complete: [
      'IT\'S ON! It does what I do! Look — (he waves; a beat later, it waves) — it\'s a bit slow on the left foot.',
      'Sable says it\'ll catch up. Here. It\'s my best thing. A moon-stone, from the mere. It\'s yours.',
    ],
    reward: { orbs: 10, coins: 60 },
  },

  // ── 3. Bitter Liver — fish + deliver + duel ──────────────────────────
  {
    id: Q_GREY,
    area: 'umbral',
    name: 'Bitter Liver',
    giver: 'umbral-perrin',
    offer: [
      'My Hesper\'s going grey. Fingertips first, then the knuckles. Late with the cloth, so they passed us over.',
      'Old wives say the liver of an umbra pike slows it. Bitter as sin. The Draught House calls that contraband too.',
      'I can\'t hold a line steady any more, not with my hands shaking. Will you catch me one? Then take it to her.',
    ],
    accept: [
      'Out past the shade perch. It\'ll fight. An antivenin rod, mind — blackwater eats a common line.',
    ],
    stages: [
      {
        objective: { kind: 'fish', fish: FISH_PIKE, count: 1 },
        hint: 'Catch an umbra pike in the Shadow Mere (antivenin rod)',
      },
      {
        objective: {
          kind: 'deliver', npc: 'umbral-hesper', item: FISH_PIKE, count: 1,
          lines: [
            'A pike! Oh, he sent you. He shouldn\'t have. Give it here, I\'ll have the liver out before it stops twitching.',
            '(she eats it raw, and makes a face) Bitter. Bitter. Good. Bitter means it works, my mother said.',
            'Oh no. That\'s the Dosemaster at the gate. They count the fish that come out of the mere. Someone told.',
          ],
        },
        hint: 'Take the umbra pike to Hesper Gloam, south of the mere',
      },
      {
        objective: {
          kind: 'duel', area: 'umbral',
          foe: {
            id: 'umbral-q-grey-duel',
            court: 'umbral',
            name: 'Contraband Remedy',
            foeName: 'Dosemaster Pall',
            foeElement: 'psychic',
            difficulty: 5,
            hpMult: 0.95,
            gimmick: 'umbral-sundown',
            at: { x: 1820, y: 1490 },
            look: { body: 0xc0c0c8, accent: 0x3a6a22, hat: 'plague', traits: ['book', 'glasses'], size: 1.1, eye: 0x7ad84a },
            challenge: [
              'A remedy not from Her hand is a Draught not from Her hand. The law does not care that it is a fish.',
              'I knew what you\'d caught before you landed it. Someone here tells me everything, for doses.',
              'The household goes in the book. The stranger goes in the mere.',
            ],
            beaten: ['…The book can say it was a perch. Perches are not remedies. I shall be very sure it was a perch.'],
            coins: 115,
          },
        },
        hint: 'Face Dosemaster Pall outside the Gloams\' door',
      },
    ],
    complete: [
      'She\'s asleep. First time in a week. Her fingertips are no greyer than this morning. That\'s a good day now.',
      'Take my second-best rod money. No, take it. A man with shaking hands has no use for a second-best rod.',
    ],
    reward: { orbs: 10, coins: 80 },
  },

  // ── 4. Short of Cloth — talk + collect + defeat ──────────────────────
  {
    id: Q_TITHE,
    area: 'umbral',
    name: 'Short of Cloth',
    giver: 'umbral-sable',
    offer: [
      'Collection\'s at the new moon. Grim comes for it himself — up out of the shade behind your door.',
      'We\'re three bolts short. Three households going grey; thin shadows, thin cloth. Short is passed over.',
      'But I\'ve three bolts the yard wove in secret, a thread off everybody, hidden where the shade is. Help me?',
    ],
    accept: [
      'Ask Oriel first which lamps the shade-stalker never comes near. Then fetch the bolts out to the light.',
    ],
    stages: [
      {
        objective: {
          kind: 'talk', npc: 'umbral-oriel',
          lines: [
            'Grim? He goes through shade the way a pike goes through water. But he won\'t come up in lamplight. Any lamp.',
            'He says black lamps throw shade. They do. Right under them, though, there\'s a little ring where there isn\'t.',
            'Put the bolts there, under my lamps on the road. When he comes for them, you\'re on your own.',
          ],
        },
        hint: 'Ask Lampwarden Oriel where Grim cannot reach',
      },
      {
        objective: {
          kind: 'collect', area: 'umbral', label: 'A bolt of secret shadow-cloth', emoji: '🧶', color: 0x4a3a6a,
          spots: [{ x: 260, y: 1180 }, { x: 900, y: 1380 }, { x: 980, y: 1200 }],
        },
        hint: 'Carry the 3 hidden bolts of shadow-cloth out of the weavers\' yard',
      },
      {
        objective: { kind: 'defeat', encounter: 'umbral-shade-step' },
        hint: 'Face Stalker Grim (Shade Step) when he comes up out of the shade for the cloth',
      },
    ],
    complete: [
      'The yard\'s full weight. FULL. And Grim went off into the shade with his hands empty and frost on his collar.',
      'Here — a scrap of the secret bolt, and the yard\'s purse. Every weaver put a coin in. Even the grey ones.',
    ],
    reward: { orbs: 9, coins: 100 },
  },

  // ── 5. The Lantern in the Bole — talk + visit + prince ───────────────
  {
    id: Q_LANTERN,
    area: 'umbral',
    name: 'The Lantern in the Bole',
    giver: 'umbral-vesper',
    requires: { courtReady: 'umbral' },
    offer: [
      'His Highness will see you. Ask Oriel why the dark is his. He lit the nursery lamp.',
      'Then go and stand on the dial. At the full moon, at the top. As a boy he waited there for morning.',
    ],
    accept: [
      'Oriel, then the dial. I will tell him you are coming. He will put the lantern out.',
    ],
    stages: [
      {
        objective: {
          kind: 'talk', npc: 'umbral-oriel',
          lines: [
            'Little Dusk. He screamed in the dark. Every night. I sat with a yellow lamp by his bed till he slept.',
            'Then his mother came to see why the nursery was lit. She said if he feared the dark he should own it.',
            'She gave him all of it. Closed the canopy. Made me trim every lamp black. He never cried again. Never.',
          ],
        },
        hint: 'Ask Lampwarden Oriel about the Prince as a boy',
      },
      {
        objective: { kind: 'visit', area: 'umbral', at: { x: DIAL.x, y: DIAL.y - 110 }, r: 60, label: 'The full-moon mark on the dial' },
        hint: 'Stand on the full-moon mark at the top of the night-dial',
      },
      {
        objective: { kind: 'prince', prince: 'dusk' },
        hint: 'Face Prince Dusk at the Umbral Bole',
      },
    ],
    complete: [
      'He has asked for a yellow lamp in the door. I have never been asked to fetch a light.',
      'Three people came with lamps. They had kept them hidden for years. Take the Bole\'s purse; it is yours.',
    ],
    reward: { orbs: 12, coins: 160 },
  },
];
