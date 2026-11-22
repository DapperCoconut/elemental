import type { QuestDef } from '../../../../IslesTypes';

/**
 * Quarrymouth's five quests. The first is the isle's welcome — you arrive on a Tithe Day and watch a
 * family come up three pounds short because a boy chipped a corner off their block. The second
 * bakes bread small enough to pass through a cell door. The rest are about what the Regent buries:
 * a song, the names in a lift's counterweight, and the book in which his own mason wrote down
 * everyone she ever walled up.
 *
 * Every quest ends in a fight with one of the Regent's servants on the quay or the Long Step. Their
 * elements are all different: bind, shadow, silence, gravity, paper.
 */
export const QUARRYMOUTH_QUESTS: QuestDef[] = [
  // ── 1. A Stone Short ──────────────────────────────────────────────
  {
    id: 'quarrymouth-short-stone', area: 'quarrymouth', name: 'A Stone Short', giver: 'quarrymouth-dock',
    offer: [
      'Tithe Day, and you walk off a barge into the thick of it. Every house in town brings a block to the Scales.',
      'Abel has just read the Hobbs short. Three pounds, on a block that size. Three pounds is a corner.',
      'The collar cart is parked by the Scales already. Go up the Grand Stair and ask Marl what happened. Please.',
    ],
    accept: [
      'Marl lives on the Long Step, west end, the door with the perfect blocks stacked outside it. Up the stair.',
      'If you hear a bell from the quay, that is the weighing closing. Do not hear a bell.',
    ],
    stages: [
      {
        objective: {
          kind: 'talk', npc: 'quarrymouth-hobb',
          lines: [
            'Three pounds. I know. It was Pip — the Scrabble boy. He chipped a corner off it to carve a little boat.',
            'He did not know. He is eight. He thought a block was a block. Nobody tells children what a block is for.',
            'I cannot cut another by the bell. But Ruth leaves her spalls on the Rim. Three pounds of offcuts would do it.',
          ],
        },
        hint: 'Ask Marl Hobb on the Long Step what happened to his block',
      },
      {
        objective: {
          kind: 'collect', area: 'quarrymouth', label: 'spall', emoji: '🪨', color: 0xd8ccb0,
          spots: [{ x: 180, y: 250 }, { x: 460, y: 70 }, { x: 980, y: 268 }],
        },
        hint: 'Gather 3 spalls from the heaps in the stonecutters\' yard on the Rim',
      },
      {
        objective: {
          kind: 'talk', npc: 'quarrymouth-keeper',
          lines: [
            'Spalls. In the household pan, with the block. Hm. The rule says a block. It does not say one piece.',
            'And the beam says… even. Even! The Hobbs are even. I have not read a Hobb block even in my life.',
            '— That was the bell. And here is Dredge, off the cart, with a collar open in both hands. He heard it too.',
          ],
        },
        hint: 'Bring the spalls to Abel Trone at the Tithe Scales',
      },
      {
        objective: {
          kind: 'duel', area: 'quarrymouth',
          foe: {
            id: 'quarrymouth-short-stone-duel', court: 'quarrymouth', name: 'After the Bell',
            foeName: 'Collarman Dredge', foeElement: 'bind', difficulty: 3, hpMult: 0.95,
            gimmick: '', at: { x: 1140, y: 1220 }, coins: 55,
            look: { body: 0x7a6a5a, accent: 0x352c40, hat: 'helmet', traits: ['tool', 'mask', 'apron'], size: 1.3, eye: 0xa8a0c8 },
            challenge: [
              'Hobb. Weighed short at the first reading. The second reading was after the bell. After the bell is nothing.',
              'It is a good collar. Ruth made it. It fits any neck, and it never comes off. That is the craft of it.',
              'The visitor. Step out of the pan, or I will see how a collar sits on someone who was never tithed.',
            ],
            beaten: ['My chain — you have — fine. The cart goes up empty. Let the Galleries wait a season for a Hobb.'],
          },
        },
        hint: 'Collarman Dredge is at the Scales with a collar for Marl — stop him',
      },
    ],
    complete: [
      'The cart went up the Haul Road EMPTY? On your first day ashore? I heard Dredge swearing from the slip.',
      'That is the Stone Tithe. Now you know what three pounds costs. Six princes keep it up those three roads.',
      'North up the Haul Road to the Stonehold is gentlest. Here — harbour dues, refunded. You earned them twice.',
    ],
    reward: { orbs: 6, coins: 55 },
  },

  // ── 2. Bread Through the Slit ─────────────────────────────────────
  {
    id: 'quarrymouth-slit-loaf', area: 'quarrymouth', name: 'Bread Through the Slit', giver: 'quarrymouth-baker',
    offer: [
      'The interred are fed once a day, through a slit in the cell door two fingers wide. Whatever fits, they eat.',
      'So we bake slit-pies: long, flat, two fingers wide. My brother is in the Galleries. Nine years. I bake his.',
      'But Turnkey Murk weighs every pie at the Sepulchre cart and takes "the excess". All of it is excess, to Murk.',
    ],
    accept: [
      'A proper slit-pie: two quarry bream and a cliff crab, baked hard. Too hard to break. Too good to take.',
      'Fish off the crane pier or the quay edge. Bream are everywhere. Crabs hide under the blocks by the piers.',
    ],
    stages: [
      {
        objective: { kind: 'fish', fish: 'fish-quarry-bream', count: 2 },
        hint: 'Catch 2 Quarry Bream in the harbour',
      },
      {
        objective: { kind: 'fish', fish: 'fish-cliff-crab', count: 1 },
        hint: 'Catch a Cliff Crab (they hide under the fallen blocks near the piers)',
      },
      {
        objective: { kind: 'cook', recipe: 'recipe-quarrymouth-slit-pie' },
        hint: 'Have the Hearthstone bake a Slit-Pie (2 Quarry Bream, 1 Cliff Crab)',
      },
      {
        objective: {
          kind: 'duel', area: 'quarrymouth',
          foe: {
            id: 'quarrymouth-slit-loaf-duel', court: 'quarrymouth', name: 'The Excess',
            foeName: 'Turnkey Murk', foeElement: 'shadow', difficulty: 3, hpMult: 1,
            gimmick: '', at: { x: 980, y: 726 }, coins: 60,
            look: { body: 0x5a5260, accent: 0x1e1a24, hat: 'hood', traits: ['lantern', 'satchel'], size: 1.05, eye: 0xc8b8ff },
            challenge: [
              'Slit-pies for the Galleries. Let me weigh them. A ration is a ration. Anything over is excess.',
              'The dark is very good for the interred. It rests the eyes. Bread only excites them. Crust, especially.',
              'That one is heavy. Crab, is it? Hand it over, visitor, or I will put out your lamp and find it myself.',
            ],
            beaten: ['My lantern — out — I cannot see — take your pie. Take it through the slit yourself. I am going home.'],
          },
        },
        hint: 'Turnkey Murk has come down the Long Step for the pie cart — keep him off the Slit-Pie',
      },
    ],
    complete: [
      'He went off up the Haul Road in his own dark, feeling his way along the face. I watched him the whole way.',
      'The cart goes up honest tomorrow. My brother will get a whole pie through that slit, crab and all.',
      'Fisher\'s pay, and a sister\'s thanks. I wrote your name on his crust with a skewer. He will wonder who you are.',
    ],
    reward: { orbs: 6, coins: 50 },
  },

  // ── 3. The Quarry Chant ───────────────────────────────────────────
  {
    id: 'quarrymouth-quarry-chant', area: 'quarrymouth', name: 'The Quarry Chant', giver: 'quarrymouth-pip',
    requires: { questDone: 'quarrymouth-short-stone' },
    offer: [
      'Look what I dug up from under the quay! A paving stone with WORDS on the bottom. Upside down. On purpose!',
      '"Heave on the one, and the stone comes up." Granny Tumble went white when I read it. Then she cried.',
      'She says it is the Quarry Chant, and there are three more stones. I can only lift one. You are bigger.',
    ],
    accept: [
      'They are on the quay. The ones with the grout scraped fresh round them. Somebody dug them in, not so long ago.',
      'Granny lives at the east end of the Long Step, the door with the rope on the bench. Bring them to her.',
    ],
    stages: [
      {
        objective: {
          kind: 'collect', area: 'quarrymouth', label: 'verse-stone', emoji: '📜', color: 0xe0d0a8,
          spots: [{ x: 380, y: 1000 }, { x: 1040, y: 990 }, { x: 1780, y: 1040 }, { x: 2250, y: 1260 }],
        },
        hint: 'Prise up 4 verse-stones from the quay paving',
      },
      {
        objective: {
          kind: 'talk', npc: 'quarrymouth-tumble',
          lines: [
            'Lay them in order. One, two, three, four. — "Heave on the one, and the stone comes up. Lower on four."',
            'We sang it forty years on the cranes. You heave when you hear the one. Nobody lost a finger. Nobody.',
            'Listen. They are singing it on the west crane. Badly. — And there is the Hushwarden, coming down the stair.',
          ],
        },
        hint: 'Bring the verse-stones to Granny Tumble on the Long Step',
      },
      {
        objective: {
          kind: 'duel', area: 'quarrymouth',
          foe: {
            id: 'quarrymouth-quarry-chant-duel', court: 'quarrymouth', name: 'Lower on Four',
            foeName: 'Hushwarden Lull', foeElement: 'silence', difficulty: 4, hpMult: 0.95,
            gimmick: '', at: { x: 1300, y: 470 }, coins: 65,
            look: { body: 0x8a8296, accent: 0x352c40, hat: 'veil', traits: ['book', 'scarf'], size: 1.0, eye: 0xe0e0f0 },
            challenge: [
              'Singing. On a crane. On a Tithe Day. Songs are buried, by order. The Regent finds them very loud.',
              'I bury them carefully. Face down, so they cannot hear themselves. It is kinder for a song, really.',
              'Give me the stones, visitor. Or be quiet yourself. I can make anyone quiet. Ask the Galleries.',
            ],
            beaten: ['…Fine. Let them sing. Badly. It is still — it is still rather a good tune. Do not tell him I said so.'],
          },
        },
        hint: 'Hushwarden Lull has come to bury the Chant again — stop her at the plaza',
      },
    ],
    complete: [
      'She went up the Rim with her fingers in her ears! And the cranes were singing the whole time! ALL of it!',
      'Granny says I can keep the first stone. It is going under my bed. Face UP.',
      'Here. It is my button collection. Not all of it. Some of it. The good ones are still mine.',
    ],
    reward: { orbs: 7, coins: 45 },
  },

  // ── 4. Counterweight ──────────────────────────────────────────────
  {
    id: 'quarrymouth-counterweight', area: 'quarrymouth', name: 'Counterweight', giver: 'quarrymouth-lift',
    requires: { questDone: 'quarrymouth-short-stone' },
    offer: [
      'The lift has a counterweight. Up on the Rim, by the headframe. Forty blocks in a cradle. I wind past it daily.',
      'Last week I looked. Every one has a household mark. They are tithe-blocks. From houses that came up short.',
      'Short is short, the Regent says — so he kept the stone AND the person. And now Thole wants ten more blocks.',
    ],
    accept: [
      'Take the lift — it is right behind me — or the stair. Look at the marks. Then ask Ruth Ashlar what they say.',
      'Ruth cut most of them. She is the only one who can read a mark properly. She will not like being asked.',
    ],
    stages: [
      {
        objective: { kind: 'visit', area: 'quarrymouth', at: { x: 2440, y: 200 }, r: 110, label: 'The counterweight' },
        hint: 'Go up to the lift\'s counterweight on the Rim and look at the marks',
      },
      {
        objective: {
          kind: 'talk', npc: 'quarrymouth-mason',
          lines: [
            'You have been looking at Jenny\'s counterweight. I know. I can see it from the lodge. I try not to.',
            'Cross in a ring: the Pratts. Three strokes: Old Tamsin. The fish: the Seddons, all four. I cut them.',
            'Twelfth from the top, the little boat. That is the Hobbs. Dilly\'s block. Marl does not know. Tell him.',
          ],
        },
        hint: 'Ask Ruth Ashlar at the mason\'s lodge to read the marks',
      },
      {
        objective: {
          kind: 'talk', npc: 'quarrymouth-hobb',
          lines: [
            'Dilly\'s block. In the lift. I have ridden past it — every morning — nine years — going up to cut her debt.',
            'I am going to put my hand on it. Every morning. That is all. That is all I am going to do.',
            '…Is that Thole on the quay? With a barrow? With BLOCKS in it? Go. Go, before I do. I am holding a pick.',
          ],
        },
        hint: 'Tell Marl Hobb what Ruth read',
      },
      {
        objective: {
          kind: 'duel', area: 'quarrymouth',
          foe: {
            id: 'quarrymouth-counterweight-duel', court: 'quarrymouth', name: 'Dead Weight',
            foeName: 'Winchmaster Thole', foeElement: 'gravity', difficulty: 4, hpMult: 1,
            gimmick: '', at: { x: 2290, y: 1040 }, coins: 70,
            look: { body: 0x8a7a68, accent: 0x5a4e6a, hat: 'miner', traits: ['tool', 'pack', 'beard'], size: 1.35, eye: 0xd8c890 },
            challenge: [
              'Ten more for the counterweight, Pulley. The Regent wants the lift heavier. The stone has to go somewhere.',
              'Stone is stone. The names do not weigh anything. I have checked. I weighed one with and without.',
              'Out of the way of the barrow, visitor. Or you go in the cradle. You would balance about two blocks.',
            ],
            beaten: ['The barrow\'s over — the blocks — fine. Forty. Leave it at forty. I never liked the sound it made.'],
          },
        },
        hint: 'Winchmaster Thole has brought ten more tithe-blocks to the lift foot — stop him',
      },
    ],
    complete: [
      'Forty. Not one block more. I chalked a name on each of the ten he dropped and gave them back to their houses.',
      'Marl rode up with me this morning. He did not say anything. He just put his hand on it. Twelfth from the top.',
      'Take this. Lift-winder\'s wages. The Regent pays me in counterweight-polish. I trade it for coin.',
    ],
    reward: { orbs: 7, coins: 60 },
  },

  // ── 5. The Book of Marks ──────────────────────────────────────────
  {
    id: 'quarrymouth-book-of-marks', area: 'quarrymouth', name: 'The Book of Marks', giver: 'quarrymouth-mason',
    requires: { princesOfIsle: 'earth', count: 2 },
    offer: [
      'Two of his children down. Now I can ask. I have closed two hundred and twelve collars. I wrote each one down.',
      'Name, mark, cell, the day. The Book of Marks. When the Scales were re-set, he had it buried under them.',
      'So nobody could ever count. I want it dug up. I want them to count. Abel holds the hatch to the footing.',
    ],
    accept: [
      'Abel will be frightened. Abel is always frightened. He will open it anyway. He is a better man than his job.',
      'The Book was split in three and sealed in lead, so one find would not be the whole of it. I split it myself.',
    ],
    stages: [
      {
        objective: {
          kind: 'talk', npc: 'quarrymouth-keeper',
          lines: [
            'The Book. Under my Scales. — I knew. I have stood on it forty years. Every reading. On top of it.',
            'The hatch is in the weighing-floor. Here is the key. My hands are shaking. Do not look at my hands.',
            'Three lead cases, under the flags round the plinth. One each side and one in front. Quickly.',
          ],
        },
        hint: 'Ask Abel Trone for the key to the Scales\' footing',
      },
      {
        objective: {
          kind: 'collect', area: 'quarrymouth', label: 'lead-sealed folio', emoji: '📕', color: 0x8a8296,
          spots: [{ x: 700, y: 1220 }, { x: 1000, y: 1232 }, { x: 860, y: 1262 }],
        },
        hint: 'Dig up the 3 lead-sealed folios of the Book from under the weighing-floor',
      },
      {
        objective: {
          kind: 'talk', npc: 'quarrymouth-mason',
          lines: [
            'All three. Look — my hand. Year by year. Here is the first collar I ever closed. I was nineteen.',
            'Two hundred and twelve. Every one with a cell number. Every family can go to the Galleries and knock.',
            'And there — on the stair — Expunger Vellum, with his scraper and his ink-pot. He has come to unwrite it.',
          ],
        },
        hint: 'Bring the folios back to Ruth Ashlar on the Rim',
      },
      {
        objective: {
          kind: 'duel', area: 'quarrymouth',
          foe: {
            id: 'quarrymouth-book-of-marks-duel', court: 'quarrymouth', name: 'Unwritten',
            foeName: 'Expunger Vellum', foeElement: 'paper', difficulty: 4, coins: 80,
            gimmick: '', at: { x: 500, y: 1220 },
            look: { body: 0x9a8e86, accent: 0x5a4e6a, hat: 'tophat', traits: ['book', 'glasses', 'scarf'], size: 1.2, eye: 0xd8d0f0 },
            challenge: [
              'Ashlar. A book. Under the Scales. Buried by order and dug up by — whom? Ah. The visitor.',
              'I am the Regent\'s Expunger. I scrape names off things. Street signs, songs, ledgers. It is clean work.',
              'Give me the folios and I will make them blank as a new block. Or stand there, and I will start on you.',
            ],
            beaten: ['My scraper — blunt. My ink — spilt. …There are too many names in it. I could never have scraped them all.'],
          },
        },
        hint: 'Expunger Vellum is on the quay to scrape the Book blank — make him answer for it',
      },
    ],
    complete: [
      'The Book is on my bench, open. There is a queue down the Grand Stair. They are reading for their own.',
      'I am going to keep cutting collars when the order comes. Badly. With a flaw in the grain. They will crack.',
      'Take this. A copy of the first page, cut in slate. Every name I wrote. Carry it, so somebody always counts.',
    ],
    reward: { orbs: 9, coins: 120, item: 'charm-quarrymouth-book-of-marks' },
  },
];
