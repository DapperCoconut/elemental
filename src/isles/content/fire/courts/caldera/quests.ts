import type { QuestDef } from '../../../../IslesTypes';

/**
 * Five small stories from the crater floor: a miner short of quota, a lava angler, a water
 * boy, a sulphur-reader with a theory about the Prince, and the overseer who finally asks
 * for the thing everyone wants.
 */
export const CALDERA_QUESTS: QuestDef[] = [
  {
    id: 'caldera-quota',
    area: 'caldera',
    name: 'Quota of Glass',
    giver: 'caldera-pell',
    offer: [
      'My crew is five blocks short. Short crews get a cart ride up to the Kiln door.',
      'There is chipped glass all over the quarry floor — Rhyo throws it about when he plays.',
      'Gather five good chunks and get them weighed by Clinker before the bell. Please.',
    ],
    accept: ['Bless you. Mind the golem. He thinks everything is a game, and he is very, very big.'],
    stages: [
      {
        objective: {
          kind: 'collect', area: 'caldera', label: 'Obsidian chunk', emoji: '🔷', color: 0x2c2440,
          spots: [{ x: 180, y: 940 }, { x: 260, y: 1080 }, { x: 430, y: 925 }, { x: 480, y: 1090 }, { x: 150, y: 1060 }],
        },
        hint: 'Pick up 5 obsidian chunks on the quarry floor',
      },
      {
        objective: {
          kind: 'talk', npc: 'caldera-clinker',
          lines: [
            'What is this. Pell\'s crew? Pell\'s crew has never once been on time.',
            '...Five. Clean edges, too. Fine. Tally stands. Nobody rides the cart today.',
            'Mind Gaffer Flintwhistle on the camp road. A short crew means double rations for his.',
            'Do not look at me like that. I count. Counting is all I do.',
          ],
        },
        hint: 'Have Overseer Clinker weigh the chunks at the quarry',
      },
      {
        objective: {
          kind: 'duel', area: 'caldera',
          foe: {
            id: 'caldera-quota-duel',
            court: 'caldera',
            name: 'Short Count',
            foeName: 'Gaffer Flintwhistle',
            foeElement: 'crystal',
            difficulty: 4,
            gimmick: '',
            at: { x: 560, y: 1240 },
            look: { body: 0x4a3e5a, accent: 0x2c2440, hand: 0x8a7aa8, hat: 'helmet', traits: ['brand', 'tool', 'pipe'], size: 1.1, eye: 0xc9b8ff },
            challenge: [
              'Pell\'s crew, full tally? Then my crew eats half rations. I have counted on that cart for weeks.',
              'Those chunks were off MY face. Rhyo threw them. Hand me the chit and walk on.',
            ],
            beaten: ['Fine. Full rations for everyone, then. Do not tell my crew I said that was fair.'],
            coins: 65,
          },
        },
        hint: 'Get past Gaffer Flintwhistle on the camp road below the west bridge',
      },
    ],
    complete: [
      'He took them? He TICKED the board? And you sent Flintwhistle home with his pick dragging? Ha!',
      'First full tally in a month. Here — the crew pooled what we had. It is not much. It is everything.',
    ],
    reward: { orbs: 3, coins: 40 },
  },
  {
    id: 'caldera-hooked',
    area: 'caldera',
    name: 'Hooked on Fire',
    giver: 'caldera-ferro',
    offer: [
      'People say you cannot fish lava. People say a lot of things right before I prove them wrong.',
      'You need a rod that will not melt — obsidian, nothing else lasts a cast.',
      'Bring in two magma carp, then something with real teeth: an obsidian gar. I will make it worth it.',
    ],
    accept: [
      'Cast long, reel slow, and do not lean over the edge. The lake has eaten better anglers than us.',
      'And watch for Hookjaw Mott. He poaches for the keep kitchen, and he can smell a gar on a line.',
    ],
    stages: [
      { objective: { kind: 'fish', fish: 'fish-magma-carp', count: 2 }, hint: 'Catch 2 Magma Carp in the lava lake (obsidian rod)' },
      { objective: { kind: 'fish', fish: 'fish-obsidian-gar', count: 1 }, hint: 'Land an Obsidian Gar in the lava lake' },
      {
        objective: {
          kind: 'duel', area: 'caldera',
          foe: {
            id: 'caldera-hooked-duel',
            court: 'caldera',
            name: 'Poacher\'s Due',
            foeName: 'Hookjaw Mott',
            foeElement: 'hunt',
            difficulty: 4,
            gimmick: '',
            at: { x: 1600, y: 1000 },
            look: { body: 0x6a4a34, accent: 0x3a2e22, hand: 0x4a3426, hat: 'hood', traits: ['rod', 'satchel', 'eyepatch'], size: 1.05, eye: 0xffb347 },
            challenge: [
              'That is a gar on your hook. The Prince\'s cook pays a week\'s water for a gar.',
              'I have been tracking that fish since spring. You just pulled it out from under me. Hand it over.',
            ],
            beaten: ['Keep it. Tell Ferro he still owes me a rod. He knows which one.'],
            coins: 65,
          },
        },
        hint: 'Hookjaw Mott wants the gar — beat him on the jetty road',
      },
    ],
    complete: [
      'A gar! Look at that snout — like a glazier\'s knife. And Mott ran off with an empty sack? Good.',
      'Forty years on this jetty and you are the second person I have seen land one. The first was me.',
    ],
    reward: { orbs: 4, coins: 80 },
  },
  {
    id: 'caldera-waterboy',
    area: 'caldera',
    name: 'The Waterboy',
    giver: 'caldera-wren',
    offer: [
      'I carry the water. Well, I carry the buckets. Tull sells the water, and the buckets come back lighter.',
      'The crews are cracking their lips. Old Joss says there is a trough by the forge that used to fill with rain.',
      'If somebody made Tull stop hogging the clouds... the rain might go where it is meant to.',
    ],
    accept: ['Really? You will? Talk to Joss first — he knows where the old trough is! And watch for Tull\'s bailiff.'],
    stages: [
      {
        objective: {
          kind: 'talk', npc: 'caldera-joss',
          lines: [
            'The trough? South of my forge, half full of ash. The rain used to drift down off the rim into it.',
            'Then the Prince sold the rain to Tull, and Tull taught it to follow him around like a dog.',
            'Beat the man and the cloud goes home. Probably. Clouds are not my trade.',
          ],
        },
        hint: 'Ask Old Joss at the forge about the rain trough',
      },
      { objective: { kind: 'defeat', encounter: 'caldera-cooling-rain' }, hint: 'Beat Rainmaker Tull (Cooling Rain)' },
      { objective: { kind: 'visit', area: 'caldera', at: { x: 990, y: 1610 }, r: 80, label: 'The rain trough' }, hint: 'Check the old rain trough south of the forge' },
      {
        objective: {
          kind: 'duel', area: 'caldera',
          foe: {
            id: 'caldera-waterboy-duel',
            court: 'caldera',
            name: 'Frozen Rights',
            foeName: 'Bucket-Bailiff Rime',
            foeElement: 'ice',
            difficulty: 4,
            gimmick: '',
            at: { x: 1110, y: 1610 },
            look: { body: 0x7a96b0, accent: 0x2e4256, hand: 0xcfe6f5, hat: 'cap', traits: ['satchel', 'book'], size: 1.05, eye: 0xdff2ff },
            challenge: [
              'Tull lost the cloud. He did not lose the rights. Every drop in that trough is on my ledger.',
              'If it will not stay sold, it can stay frozen. Stand aside while I put a lid on it.',
            ],
            beaten: ['The ice is melting into the trough. I suppose that is on the ledger too. Free.'],
            coins: 65,
          },
        },
        hint: 'Stop Bucket-Bailiff Rime from freezing the rain trough',
      },
    ],
    complete: [
      'It\'s filling! Real rain, plinking in the ash! And the bailiff\'s ice melted right into it!',
      'Here. This is from all of us. Joss said not to make a speech so I am not making a speech.',
    ],
    reward: { orbs: 3, coins: 30 },
  },
  {
    id: 'caldera-omens',
    area: 'caldera',
    name: 'What the Vents Say',
    giver: 'caldera-ysolde',
    offer: [
      'The vents talk, if you can stand the smell. I have been listening for nine years.',
      'They say the Prince is hollow. Glass on the outside, fire on the in. They say he cracks when he boils over.',
      'I need two more readings: the Grandmother vent below the keep, and the high vents to the north-east.',
    ],
    accept: ['Breathe through your sleeve. Count to three before you look in. And do not argue with the vents.'],
    stages: [
      { objective: { kind: 'visit', area: 'caldera', at: { x: 930, y: 565 }, r: 90, label: 'The Grandmother vent' }, hint: 'Take a reading at the Grandmother vent below the keep' },
      { objective: { kind: 'visit', area: 'caldera', at: { x: 1990, y: 385 }, r: 90, label: 'The high vents' }, hint: 'Take a reading at the high vents in the north-east' },
      { objective: { kind: 'defeat', encounter: 'caldera-eruption-clock' }, hint: 'The high vents keep time — beat Ventkeeper Surtr (Eruption Clock)' },
      {
        objective: {
          kind: 'duel', area: 'caldera',
          foe: {
            id: 'caldera-omens-duel',
            court: 'caldera',
            name: 'Unsaid',
            foeName: 'Hushwarden Vell',
            foeElement: 'silence',
            difficulty: 4,
            gimmick: '',
            at: { x: 1300, y: 600 },
            look: { body: 0x3a3640, accent: 0x1f1d24, hand: 0x2a2630, hat: 'hood', traits: ['mask', 'brand'], size: 1.0, eye: 0xb8b0c8 },
            challenge: [
              'The keep has heard what you have been sniffing at. Readings about the Prince cracking.',
              'Those words do not reach the sulphur-reader. Nothing reaches her. That is my whole job.',
            ],
            beaten: ['Say it, then. Say it loud. He will hear it from you before he hears it from me.'],
            coins: 65,
          },
        },
        hint: 'Hushwarden Vell will not let the readings reach Ysolde — beat him below the keep road',
      },
    ],
    complete: [
      'The keep sent a hush after you? Then it is true. Grandmother says: the stone will not break for blows.',
      'High vents say: it breaks for its own heat. Surtr\'s clock says: wait, and it will open on its own.',
      'So when the Prince boils over — and he will — wait for the crack. Then hit him. Take this.',
    ],
    reward: { orbs: 5 },
  },
  {
    id: 'caldera-heir',
    area: 'caldera',
    name: 'Break the Bedrock',
    giver: 'caldera-clinker',
    requires: { courtReady: 'caldera' },
    offer: [
      'You have beaten every champion in the crater. Even the golem. Even Surtr\'s clock.',
      'I have counted blocks for that man for eleven years. I counted the carts, too. Every one.',
      'I would like, very much, to stop counting. Go up to the keep and break him.',
    ],
    accept: ['I will keep the tally board here. If you come back, I am going to burn it.'],
    stages: [
      { objective: { kind: 'prince', prince: 'basalt' }, hint: 'Defeat Prince Basalt at his keep' },
      {
        objective: {
          kind: 'duel', area: 'caldera',
          foe: {
            id: 'caldera-heir-duel',
            court: 'caldera',
            name: 'Last Cart',
            foeName: 'Cartmaster Grudd',
            foeElement: 'metal',
            difficulty: 4,
            hpMult: 1.1,
            gimmick: '',
            at: { x: 1150, y: 1380 },
            look: { body: 0x5a5a62, accent: 0x2a2626, hand: 0x8a8a94, hat: 'helmet', traits: ['brand', 'tool', 'beard'], size: 1.25, eye: 0xff8a3a },
            challenge: [
              'Prince down or not, the Kiln is owed its blocks. The cart goes up at the bell. It always goes up.',
              'Someone rides it, if the quota is short. Today the quota is everybody. Out of the road.',
            ],
            beaten: ['The axle is cracked. Huh. Eleven years, and I never once thought the cart could just... stop.'],
            coins: 65,
          },
        },
        hint: 'Stop Cartmaster Grudd from running the last quota cart (processional road)',
      },
    ],
    complete: [
      'Grudd\'s cart is in the ditch and Pell is shouting "picks DOWN" across the camp. Nobody cuts for the Kiln.',
      'The board burns. Eleven years of marks, gone up in a minute. I am crying and laughing. Both.',
      'There is one door left in this crater. Up on the rim. I do not envy you it.',
    ],
    reward: { orbs: 6, coins: 150 },
  },
];
