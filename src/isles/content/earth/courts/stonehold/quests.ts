import type { QuestDef } from '../../../../IslesTypes';
import { FALLEN, HOLLIN_HOUSE, PLASTERED, RUNNEL_BEND } from './area';
import { FISH_CARP, FOOD_CARP_COALS } from './items';

/**
 * The Stonehold Court's five side quests.
 *
 * The first court on Bedrock Hold, so between them they show what the Regent buries: names
 * (Ysolde's plastered lintels), food (the pool's carp, weighed as tithe), a family's whole season
 * (Kit's runaway stone), a person (Agnes's mother, walled up in her own house), and finally the
 * Prince himself, who was buried alive in his father's one rule. Each is somebody refusing to
 * stay put under the stone.
 */
export const STONEHOLD_QUESTS: QuestDef[] = [
  // ── 1. The Buried Names — collect + talk + duel ──────────────────────
  {
    id: 'stonehold-q-buried-names',
    area: 'stonehold',
    name: 'The Buried Names',
    giver: 'stonehold-ysolde',
    offer: [
      'See the lintels on this side of the road? Fresh plaster on four of them. Grout did them yesterday.',
      'Under the plaster are the house names. I cut them, forty years back. Heron Steps. Lantern Row.',
      'Lime stays soft till it cures. A thumb would have it off. Not mine — Grout knows my thumb.',
      'Scrape them clean, and then find old Abner. He\'s the last who can read the old letters aloud.',
    ],
    accept: [
      'The four doors on this side of the road. Quick, before it cures — and before Grout finishes his lunch.',
    ],
    stages: [
      {
        objective: {
          kind: 'collect', area: 'stonehold', label: 'Plastered lintel', emoji: '🪧', color: 0xe8e2d4,
          spots: PLASTERED.map((p) => ({ x: p.x, y: p.y + 40 })),
        },
        hint: 'Scrape the fresh plaster off 4 lintels along the west road',
      },
      {
        objective: {
          kind: 'talk', npc: 'stonehold-abner',
          lines: [
            'Let me see. My eyes. Ah. "Kingsway". That one\'s Kingsway — the whole road was Kingsway, once.',
            '"Lantern Row". "Heron Steps". "Weaver\'s End". Oh, I haven\'t said those aloud in forty years.',
            'Listen — that\'s a bucket. Grout heard me. He has ears like a cave. He\'s coming with his trowel.',
          ],
        },
        hint: 'Have old Abner Menhenick read the uncovered names aloud',
      },
      {
        objective: {
          kind: 'duel', area: 'stonehold',
          foe: {
            id: 'stonehold-q-buried-names-duel',
            court: 'stonehold',
            name: 'Lime and Trowel',
            foeName: 'Plasterer Grout Whitlow',
            foeElement: 'chalk',
            difficulty: 3,
            hpMult: 0.95,
            gimmick: '',
            at: { x: 800, y: 870 },
            look: { body: 0xe8e2d4, accent: 0x5b4a6e, hat: 'cap', traits: ['tool', 'apron'], size: 1.15, eye: 0xf0ecdc },
            challenge: [
              'A name is a thing a man remembers. A remembered thing is a thing he wants back. So: plaster.',
              'I have smoothed over eleven hundred names in this court. Every one of them a kindness.',
              'You scratched four of my kindnesses. I have a whole bucket. Let us see how white I can make you.',
            ],
            beaten: ['…The lime\'s cured round them now. Hard as the stone. Fine. Let them read it. I\'m going home.'],
            coins: 70,
          },
        },
        hint: 'Stop Plasterer Grout Whitlow before he smooths the names over again',
      },
    ],
    complete: [
      'Kingsway! I heard it from my window. Abner shouting it in the street like a market-man.',
      'Take this. It\'s my chisel money. I shan\'t need to buy plaster-scrapers now — the names have you.',
    ],
    reward: { orbs: 7, coins: 60 },
  },

  // ── 2. A Carp's Weight — fish + deliver + duel ───────────────────────
  {
    id: 'stonehold-q-carps-weight',
    area: 'stonehold',
    name: 'A Carp\'s Weight',
    giver: 'stonehold-ness',
    offer: [
      'The pit gang work the treadwheel all season for nothing. It\'s their own tithe, walking. They eat dust.',
      'Bryn would bake them Carp in the Coals if she had carp. I\'ve no luck — the big ones know my face.',
      'Catch two boulder carp for Bryn? Only — mind Pit-Reeve Lugg. He weighs fish as tithe. Anything heavy is.',
    ],
    accept: [
      'Cast long from the ledges. Let the old ones pull. When they tire, lean back like a man on a rope.',
    ],
    stages: [
      {
        objective: { kind: 'fish', fish: FISH_CARP, count: 2 },
        hint: 'Catch 2 boulder carp in the quarry pool',
      },
      {
        objective: {
          kind: 'deliver', npc: 'stonehold-bryn', item: FISH_CARP, count: 2,
          lines: [
            'Two boulder carp! Look at the size of them. Into the coals with you, gentlemen.',
            'Oh, stone and sorrow. That\'s Lugg on the road with his steelyard. He\'s seen the carp tails. Run — no. Fight.',
          ],
        },
        hint: 'Bring the 2 boulder carp to Bryn Hearth at the Flatbread Stone',
      },
      {
        objective: {
          kind: 'duel', area: 'stonehold',
          foe: {
            id: 'stonehold-q-carps-weight-duel',
            court: 'stonehold',
            name: 'Weighed and Found Wanting',
            foeName: 'Pit-Reeve Ottery Lugg',
            foeElement: 'metal',
            difficulty: 3,
            hpMult: 0.95,
            gimmick: 'stonehold-tithe-scales',
            at: { x: 1560, y: 880 },
            look: { body: 0xb8a088, accent: 0x4a4a52, hat: 'helmet', traits: ['tool', 'beard'], size: 1.3, eye: 0xc9a24a },
            challenge: [
              'Weight is weight, stranger. A stone is a weight. A carp is a weight. A pit gang\'s lunch is a weight.',
              'Every pound that leaves that pool is a pound short of somebody\'s Tithe. I hang it on my steelyard.',
              'Let\'s see what you weigh. Onto the scales with you.',
            ],
            beaten: ['…Let the carp go in the coals, then. Write it down as a loss. I\'ll find the weight elsewhere.'],
            coins: 70,
          },
        },
        hint: 'See off Pit-Reeve Ottery Lugg on the east road',
      },
    ],
    complete: [
      'The pit gang ate like kings. Bryn sent you one too, in a cloth, still hot. Mind your fingers.',
      'And Lugg\'s steelyard is in my pool now. Somebody dropped it. Wasn\'t me. Probably wasn\'t you.',
    ],
    reward: { orbs: 6, coins: 40, item: FOOD_CARP_COALS, itemCount: 1 },
  },

  // ── 3. The Runaway Stone — visit + talk + defeat ─────────────────────
  {
    id: 'stonehold-q-runaway-stone',
    area: 'stonehold',
    name: 'The Runaway Stone',
    giver: 'stonehold-kit',
    offer: [
      'Our stone jumped the runnel. Our whole season, cut round to roll, and I pushed it too hard.',
      'It went into Roller Cobb\'s yard and he says it\'s his. Law of the road, he says. What jumps is his.',
      'If it doesn\'t reach the Scales we\'re short. Would you go and see where it jumped? And ask Plumb?',
    ],
    accept: [
      'The bend. Where the kerb\'s scratched. Then Plumb at the pit — he knows all the rules, even the fake ones.',
    ],
    stages: [
      {
        objective: { kind: 'visit', area: 'stonehold', at: { x: RUNNEL_BEND.x + 50, y: RUNNEL_BEND.y }, r: 70, label: 'The runnel bend' },
        hint: 'Look at the bend in the runnel where the Tumbles\' stone jumped',
      },
      {
        objective: {
          kind: 'talk', npc: 'stonehold-plumb',
          lines: [
            'The bend? Scraped fresh, is it. That\'s Cobb. He chips the kerb low so the fast ones jump. Always has.',
            '"Law of the road" is Cobb\'s, not the Regent\'s. Nobody\'s ever made him prove it. They\'re scared of her.',
            'Of his boulder, I mean. He calls it "her". Beat him at his own game and he\'ll roll it down himself.',
          ],
        },
        hint: 'Ask Tallyman Plumb at the Tithe pit about the "law of the road"',
      },
      {
        objective: { kind: 'defeat', encounter: 'stonehold-rolling-stone' },
        hint: 'Beat Roller Cobb (Rolling Stone) in his yard by the runnel',
      },
    ],
    complete: [
      'Cobb rolled it down himself! He walked beside it the whole way to the Scales, talking to it.',
      'Dad gave me this to give you. It\'s what we\'d saved for the masons\' fine. We don\'t need it now!',
    ],
    reward: { orbs: 6, coins: 55 },
  },

  // ── 4. Walled In — collect + duel ────────────────────────────────────
  {
    id: 'stonehold-q-walled-in',
    area: 'stonehold',
    name: 'Walled In',
    giver: 'stonehold-agnes',
    offer: [
      'Mum was two blocks short. The frost cracked her quarry face and the stone came out in rubble.',
      'So Stoop the mason walled up her door. Three courses so far. Tomorrow the fourth, then the cart.',
      'The newest blocks are still wet with mortar. Pull three, and there\'s a gap she can get out of.',
      'He\'ll come back. He always comes back to see his walls stand. Will you be there when he does?',
    ],
    accept: [
      'The wet ones are darker. Round the door. Pull them out — mind your back, they\'re a full tithe-weight each.',
    ],
    stages: [
      {
        objective: {
          kind: 'collect', area: 'stonehold', label: 'Wet-mortared block', emoji: '🧱', color: 0xa8a8a4,
          spots: [
            { x: HOLLIN_HOUSE.x - 34, y: HOLLIN_HOUSE.y + 34 },
            { x: HOLLIN_HOUSE.x + 34, y: HOLLIN_HOUSE.y + 34 },
            { x: HOLLIN_HOUSE.x, y: HOLLIN_HOUSE.y + 52 },
          ],
        },
        hint: 'Pull the 3 fresh blocks out of the Hollins\' walled-up door',
      },
      {
        objective: {
          kind: 'duel', area: 'stonehold',
          foe: {
            id: 'stonehold-q-walled-in-duel',
            court: 'stonehold',
            name: 'Three Courses and a Cart',
            foeName: 'Mason Corbel Stoop',
            foeElement: 'bind',
            difficulty: 4,
            hpMult: 0.95,
            gimmick: '',
            at: { x: 2110, y: 1090 },
            look: { body: 0xa8a8a4, accent: 0x5b4a6e, hat: 'coif', traits: ['tool', 'apron', 'beard'], size: 1.25, eye: 0xd8dade },
            challenge: [
              'I lay a course a day. Neat. Plumb. You could run a level along any wall of mine and the bubble wouldn\'t move.',
              'You\'ve pulled three of my blocks. Three. Do you know how long it takes the mortar to go off?',
              'Never mind. There are plenty of blocks. And I\'ve walled up bigger than you.',
            ],
            beaten: ['…Leave it down, then. A wall nobody wants to stand isn\'t a wall. It\'s a heap. I don\'t build heaps.'],
            coins: 70,
          },
        },
        hint: 'Face Mason Corbel Stoop when he comes back to his wall',
      },
    ],
    complete: [
      'She came out through the gap on her hands and knees and she was LAUGHING. Dust in her hair and laughing.',
      'She says take this. It was the fine money, for the two blocks short. "Spend it on something round," she said.',
    ],
    reward: { orbs: 8, coins: 70 },
  },

  // ── 5. The Unmoved — visit + talk + prince ───────────────────────────
  {
    id: 'stonehold-q-unmoved',
    area: 'stonehold',
    name: 'The Unmoved',
    giver: 'stonehold-shale',
    requires: { courtReady: 'stonehold' },
    offer: [
      'All five of them. He watched from the gate. He didn\'t move, of course. But his fingers did.',
      'Before you go up, see the stone they pulled down by the avenue — the one with the Old King\'s mark.',
      'Then ask Abner who raised it. And then come and knock. Somebody should knock on that gate.',
    ],
    accept: [
      'The fallen stone, then Abner. I\'ll sit here and wait. I\'m better at waiting than he is. I taught him.',
    ],
    stages: [
      {
        objective: { kind: 'visit', area: 'stonehold', at: { x: FALLEN.x, y: FALLEN.y + 46 }, r: 80, label: 'The fallen stone' },
        hint: 'Stand by the Old King\'s fallen stone beside the menhir avenue',
      },
      {
        objective: {
          kind: 'talk', npc: 'stonehold-abner',
          lines: [
            'That stone? The Old King raised it with us. He was on the rope himself, front of the line, laughing.',
            'He said a stone stands best when it\'s been moved to where it\'s wanted. Then he moved on, as he did.',
            'The Regent pulled it down the year he sealed the tomb. Said a stone that\'s been moved is a stone that can be.',
            'Young Bould was there. He was four. He watched it fall, and he went and sat on his father\'s gate.',
          ],
        },
        hint: 'Ask Abner Menhenick who raised the fallen stone',
      },
      {
        objective: { kind: 'prince', prince: 'bould' },
        hint: 'Face Prince Bould at his boulder keep',
      },
    ],
    complete: [
      'He came down off the gate. He walked right past me to the avenue and put his hands on the fallen stone.',
      'Then he pushed it. Just a little. It rocked. He laughed like he was four. I heard it from here.',
      'Take the keep\'s purse. He says it\'s to pay for raising the stone again. Somebody else can sit on the gate.',
    ],
    reward: { orbs: 10, coins: 150 },
  },
];
