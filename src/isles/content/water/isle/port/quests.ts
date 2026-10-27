import type { QuestDef } from '../../../../IslesTypes';

/**
 * Brinehollow's five quests. The first is the isle's welcome in disguise — you are written into the
 * Dry Tithe ledger and shown what happens to the houses that cannot pay. The second sends you off the
 * fishing pier. The rest are small stories about a town that counts its floors twice a day.
 *
 * Every quest ends in a fight with one of the Queen's servants in the port. Their elements are all
 * different: gravity, electricity, depths, memory, illusion.
 */
export const BRINEHOLLOW_QUESTS: QuestDef[] = [
  // ── 1. A Coin a Head ──────────────────────────────────────────────
  {
    id: 'brinehollow-dry-tithe', area: 'brinehollow', name: 'A Coin a Head', giver: 'brinehollow-dock',
    offer: [
      'You picked tithe-day to land. Everyone does. It is every day, twice.',
      'Every head on Brinehollow pays a coin a tide to have its floor given back at low water. Visitors count.',
      'Get yourself written in at the tithe-house before a bailiff writes you in for me. Then go and look west.',
    ],
    accept: [
      'Up Ladder Street to the plaza — the stone house with a clock for a face. Ask for Sump. Be polite.',
      'I have paid your first coin. Do not thank me. Pay it back by being trouble.',
    ],
    stages: [
      {
        objective: {
          kind: 'talk', npc: 'brinehollow-reeve',
          lines: [
            'Name? — No. "Foreign". One head. Hesper Gullwing has paid your first tide. She does that for strays.',
            'The noon flood comes in at the second bell and goes out for every floor that is paid. Not the others.',
            'If you want to see the arithmetic, go and look at Gannet Street. West end of Tithe Row. Mind the edge.',
          ],
        },
        hint: 'Register with Tithe-Reeve Sump at the tithe-house on the plaza',
      },
      {
        objective: { kind: 'visit', area: 'brinehollow', at: { x: 520, y: 850 }, r: 110, label: 'Gannet Street' },
        hint: 'Go and look at the drowned low quarter — Gannet Street, west down Tithe Row',
      },
      {
        objective: {
          kind: 'talk', npc: 'brinehollow-ferry',
          lines: [
            'You are looking at Gannet Street. Forty doors. The year the tithe went up, eleven could not pay.',
            'The noon flood came in for all of them, and went out for twenty-nine. That is the Dry Tithe.',
            'And here comes Holdfast, with his anchor. He sinks a door a month on purpose, so the rest of us pay.',
          ],
        },
        hint: 'Speak to Lune Marrowby, the ferrywoman at the north rim of the drowned quarter',
      },
      {
        objective: {
          kind: 'duel', area: 'brinehollow',
          foe: {
            id: 'brinehollow-dry-tithe-duel', court: 'brinehollow', name: 'The Weight of the Tithe',
            foeName: 'Bailiff Holdfast', foeElement: 'gravity', difficulty: 2, hpMult: 0.9,
            gimmick: '', at: { x: 830, y: 828 }, coins: 40,
            look: { body: 0x8a7a6a, accent: 0x1a5a62, hat: 'tricorn', traits: ['tool', 'bandage'], size: 1.3, eye: 0x9ae0e6 },
            challenge: [
              'The foreign head. Written in this morning and already down on Gannet Street, gawping at the arrears.',
              'Every month I drop this anchor through one unpaid roof, and the rest of the town pays on time. Watch.',
              '...Or stand in my way, and I will see how heavy a visitor is.',
            ],
            beaten: ['My anchor-arm. My — Fine. No roof goes down this month. Write that in your ledger, foreigner.'],
          },
        },
        hint: 'Bailiff Holdfast is at the rim of Gannet Street with his anchor — stop him sinking another roof',
      },
    ],
    complete: [
      'Holdfast walked back up the hill holding his arm and nobody\'s roof went under? On your first day?',
      'That is the Dry Tithe, then. Now you have seen it. Six princes collect it up those three roads.',
      'North to Tidewater is the gentlest. Here — a coin back for the one I paid, and something more besides.',
    ],
    reward: { orbs: 3, coins: 40 },
  },

  // ── 2. The Herring Run ────────────────────────────────────────────
  {
    id: 'brinehollow-herring-run', area: 'brinehollow', name: 'The Herring Run', giver: 'brinehollow-creel',
    offer: [
      'The herring are running under the piers, thick as porridge. And the Queen\'s ballast-boats are coming.',
      'They net the lot for the Undertow larders. Her drowned have to eat, apparently. Our herring.',
      'What is already in Agathe\'s oven, they cannot take. Get a rod and get out on the fishing pier. Quick.',
    ],
    accept: [
      'Jory sells rods — the shack under the whale\'s jawbone. Tell him Tobiah sent you. He will pretend to sigh.',
    ],
    stages: [
      {
        objective: {
          kind: 'talk', npc: 'brinehollow-tackle',
          lines: [
            'Tobiah sent you after the run. Good. A driftwood rod does herring fine; they fight like wet paper.',
            'Out on the fishing pier — the thin one. Press E at the water, wait for the tug, keep the fish in the bar.',
            'Stilt crabs climb the line instead of pulling. Reel slow or they let go at the planks.',
          ],
        },
        hint: 'Ask Jory Gullet at the Gaff & Gullet (under the jawbone arch) about the herring run',
      },
      {
        objective: { kind: 'fish', fish: 'fish-brine-herring', count: 4 },
        hint: 'Catch 4 Brine Herring off the fishing pier',
      },
      {
        objective: { kind: 'fish', fish: 'fish-stilt-crab', count: 1 },
        hint: 'Catch a Stilt Crab off the pier (they come up clinging to the line)',
      },
      {
        objective: {
          kind: 'deliver', npc: 'brinehollow-baker', item: 'fish-brine-herring', count: 4,
          lines: [
            'Herring! Into the hardtack you go, every one, before the Crown can count you. Bless you.',
            'Keep the crab. Bring it back with a Tidewater sand dab some day and I will make you a pasty.',
            'Oh — look down at the fishing pier. That is Skerritt\'s boat. The net-warden. He shocks the water.',
          ],
        },
        hint: 'Take 4 Brine Herring up to Agathe Saltbread at the Brine Oven',
      },
      {
        objective: {
          kind: 'duel', area: 'brinehollow',
          foe: {
            id: 'brinehollow-herring-run-duel', court: 'brinehollow', name: 'Shocking the Shoal',
            foeName: 'Net-Warden Skerritt', foeElement: 'electricity', difficulty: 2, hpMult: 0.95,
            gimmick: '', at: { x: 1750, y: 1372 }, coins: 40,
            look: { body: 0x9a8070, accent: 0x2a4a6a, hat: 'souwester', traits: ['rod', 'satchel', 'eyepatch'], size: 1.05, eye: 0xc8f0ff },
            challenge: [
              'Every herring under these piers is ballast-stock for the Undertow larder. Crown property, swimming.',
              'I put three eels in a copper cage and dip it. The shoal floats up stunned. The nets do the rest.',
              'And somebody has been taking Crown herring off my pier with a rod. Somebody is standing in front of me.',
            ],
            beaten: ['My eels have gone. You have frightened my eels. ...Keep the herring. They were always yours.'],
          },
        },
        hint: 'Net-Warden Skerritt is at the end of the fishing pier with his eel-cage — see him off',
      },
    ],
    complete: [
      'Skerritt rowed off without his cage, and the whole low quarter gets hardtack at high water? Ha!',
      'Hauler\'s pay. And whenever the herring are running, you know where the pier is. The sea is yours too.',
    ],
    reward: { orbs: 3, coins: 35 },
  },

  // ── 3. What the Tide Kept ─────────────────────────────────────────
  {
    id: 'brinehollow-left-under', area: 'brinehollow', name: 'What the Tide Kept', giver: 'brinehollow-ferry',
    requires: { questDone: 'brinehollow-dry-tithe' },
    offer: [
      'At low water the sea throws things up onto the bridge and the boards. Things from Gannet Street.',
      'A pipe. A shell. A spoon with a name scratched on it. I cannot walk the boards any more; my knees.',
      'Bring them up and take them to Brother Kelp on the crossing. He will read the names over them. Out loud.',
    ],
    accept: [
      'Mind the gaps in the bridge. The water underneath is deeper than it looks. It always is.',
    ],
    stages: [
      {
        objective: {
          kind: 'collect', area: 'brinehollow', label: 'keepsake', emoji: '🐚', color: 0xe8dcc8,
          spots: [{ x: 200, y: 1028 }, { x: 380, y: 1028 }, { x: 700, y: 1028 }, { x: 880, y: 1028 }, { x: 520, y: 1170 }],
        },
        hint: 'Gather 5 keepsakes the tide left on the Gannet Street rope bridge and boardwalk',
      },
      {
        objective: {
          kind: 'talk', npc: 'brinehollow-kelp',
          lines: [
            'Set them down. Gently. — Aldous Marrowby, his pipe. Wenna Penhallow, her shell. Old Gidley, his spoon.',
            'Hester Crane. The two Pollard boys, one ring between them. Sleep, all of you. We have not forgotten.',
            'Now — there is a man on the south boards in an iron suit. The Crown Salvor. He has seen you carrying.',
            'Everything under the water belongs to the Queen, he says. Including these. Including them.',
          ],
        },
        hint: 'Take the keepsakes to Brother Kelp on the crossing in the middle of Gannet Street',
      },
      {
        objective: {
          kind: 'duel', area: 'brinehollow',
          foe: {
            id: 'brinehollow-left-under-duel', court: 'brinehollow', name: 'Salvage Rights',
            foeName: 'Crown Salvor Grimmet', foeElement: 'depths', difficulty: 3, hpMult: 0.95,
            gimmick: '', at: { x: 560, y: 1230 }, coins: 50,
            look: { body: 0x6a7a7a, accent: 0x2a3a3a, hat: 'diving', traits: ['tool', 'lantern'], size: 1.25, eye: 0x9ae0e6 },
            challenge: [
              'Everything below the high-water mark is Crown salvage. Every spoon, every pipe, every sleeper.',
              'Those trinkets came off Gannet Street. That makes them the Queen\'s, and you a thief with wet boots.',
              'Hand them over and I will forget I saw you. I am very good at forgetting. It is most of the job.',
            ],
            beaten: ['Keep them, then. Keep the lot. ...I knew Hester Crane. I am not good at forgetting at all.'],
          },
        },
        hint: 'Crown Salvor Grimmet waits at the south end of the boardwalk — keep the keepsakes from him',
      },
    ],
    complete: [
      'Kelp sent word. He read all eleven names over the water and the water went still while he did it.',
      'And the Salvor walked off along the shingle with his helmet in his hands. People saw.',
      'This is from Aldous\'s tobacco tin. He would want it spent on somebody who walks the boards.',
    ],
    reward: { orbs: 4, coins: 30 },
  },

  // ── 4. Another Mouth ──────────────────────────────────────────────
  {
    id: 'brinehollow-another-mouth', area: 'brinehollow', name: 'Another Mouth', giver: 'brinehollow-dunnage',
    requires: { questDone: 'brinehollow-dry-tithe' },
    offer: [
      'Four heads, four coins a tide. On Firstday we got a fifth. A girl. Very loud. Perfect.',
      'Five coins we do not have. And Ottoline Tally comes round counting cradles at the next low water.',
      'Brother Kelp keeps going on about an old law. Would you ask him? I cannot put the bucket down.',
    ],
    accept: [
      'Kelp keeps his book on the crossing in the middle of Gannet Street. Over the rope bridge. Thank you.',
    ],
    stages: [
      {
        objective: {
          kind: 'talk', npc: 'brinehollow-kelp',
          lines: [
            'The old law: a child born at slack water belongs to the sea, not to any ledger. Older than the crown.',
            'Nobody remembers it, because nobody wrote it in the Queen\'s book. I wrote it in mine.',
            'To claim her, the old way: a Slack-Water Bun on the doorstep. Herring and cod. Agathe knows the bake.',
          ],
        },
        hint: 'Ask Brother Kelp at the Gannet Street crossing about the old law',
      },
      {
        objective: { kind: 'cook', recipe: 'recipe-brinehollow-slack-water-bun' },
        hint: 'Have the Brine Oven bake a Slack-Water Bun (2 Brine Herring, 1 Gullet Cod)',
      },
      {
        objective: {
          kind: 'deliver', npc: 'brinehollow-dunnage', item: 'meal-brinehollow-slack-water-bun', count: 1,
          lines: [
            'On the step it goes. Like that? — Like that. There. She is the sea\'s, Kelp says. Not the Queen\'s.',
            'Oh no. That is Ottoline Tally at the top of the lane, with her abacus. She never forgets a cradle.',
            'If she gets to the door she will count five. Please. I will hold the baby. You hold the lane.',
          ],
        },
        hint: 'Lay the Slack-Water Bun on Hob Dunnage\'s doorstep',
      },
      {
        objective: {
          kind: 'duel', area: 'brinehollow',
          foe: {
            id: 'brinehollow-another-mouth-duel', court: 'brinehollow', name: 'Every Cradle Counted',
            foeName: 'Headcounter Ottoline Tally', foeElement: 'memory', difficulty: 3, hpMult: 0.95,
            gimmick: '', at: { x: 240, y: 762 }, coins: 45,
            look: { body: 0xc0a090, accent: 0x1a5a62, hat: 'veil', traits: ['book', 'glasses'], size: 0.95, eye: 0x9ae0e6 },
            challenge: [
              'Dunnage. Four heads at the last count. I heard a fifth through the shutters on Firstday. I remember.',
              'I remember every cradle on Tithe Row. Every one. I have never once forgotten a head.',
              'A bun on the step will not change my arithmetic. Stand aside, or be counted with them.',
            ],
            beaten: ['Four. I... I count four. Was it four? I remember — I do not remember. Four. I will write four.'],
          },
        },
        hint: 'Headcounter Ottoline Tally is coming down Tithe Row — keep her from counting the Dunnage cradle',
      },
    ],
    complete: [
      'She wrote four. FOUR. Stood at the top of the lane scratching her head and wrote four!',
      'The little one is called Marisa. — Yes, I know. It is a family name. It was a family name first.',
      'Take this. It was for the fifth coin. We will not be needing a fifth coin.',
    ],
    reward: { orbs: 5, coins: 40 },
  },

  // ── 5. The Broken Light ───────────────────────────────────────────
  {
    id: 'brinehollow-broken-light', area: 'brinehollow', name: 'The Broken Light', giver: 'brinehollow-keeper',
    requires: { princesOfIsle: 'water', count: 2 },
    offer: [
      'My tower showed ships the safe channel past the maelstrom. So a wave came at the wrong hour and broke it.',
      'Two of her children are down. She is busy. If I had glass and clean oil I could put a beam on the stump.',
      'The prisms are on the rocks where the top came down. And Undertow eel oil burns clear. Off the pier end.',
    ],
    accept: [
      'Mind your footing on the headland. Half those rocks are lighthouse.',
    ],
    stages: [
      {
        objective: {
          kind: 'collect', area: 'brinehollow', label: 'lens prism', emoji: '🔷', color: 0xd8f4f4,
          spots: [{ x: 2236, y: 1262 }, { x: 2300, y: 1310 }, { x: 2384, y: 1268 }, { x: 2546, y: 1328 }],
        },
        hint: 'Gather 4 lens prisms from the rocks of the lighthouse headland',
      },
      {
        objective: { kind: 'fish', fish: 'fish-undertow-eel', count: 2 },
        hint: 'Catch 2 Undertow Eels off the piers (they rise on the ebb and fight hard)',
      },
      {
        objective: {
          kind: 'deliver', npc: 'brinehollow-keeper', item: 'fish-undertow-eel', count: 2,
          lines: [
            'Render the eel, trim the wick, seat the prisms. — There. Light. Look at it go across the channel.',
            'Low, but true. A ship could find the way in on that. — Wait. Out on the rocks. That is not my lantern.',
            'Wreckers. The Queen\'s wreckers hang false lights on the rocks to pull ships in. She is out there now.',
          ],
        },
        hint: 'Bring 2 Undertow Eels to Ambrose Tallis for the lamp oil',
      },
      {
        objective: {
          kind: 'duel', area: 'brinehollow',
          foe: {
            id: 'brinehollow-broken-light-duel', court: 'brinehollow', name: 'False Light',
            foeName: 'Wrecker Moll Sallow', foeElement: 'illusion', difficulty: 3, coins: 55,
            gimmick: '', at: { x: 2232, y: 1302 },
            look: { body: 0xa88a78, accent: 0x3a2a4a, hat: 'hood', traits: ['lantern', 'scarf', 'mask'], size: 1.0, eye: 0xffd88a },
            challenge: [
              'A true light on the stump? That will not do. My lanterns say the channel is three cables east of it.',
              'Ships believe the brighter light, and mine is very bright. The rocks do the rest; the Crown gets the cargo.',
              'Put the old man\'s lamp out, or I put a lantern on you and let them steer by that.',
            ],
            beaten: ['Which light was real? ...Yours. It was always yours. I will take my lanterns home.'],
          },
        },
        hint: 'Wrecker Moll Sallow is hanging false lights on the headland rocks — stop her',
      },
    ],
    complete: [
      'Her lanterns are in the sea and mine is on the stump. Forty feet short, and it still finds the channel.',
      'A brig came in on it an hour ago. Sixty souls off Brandmark, and not a scrape on her.',
      'Take the old wick. It has shown ships the rocks for forty years. Let it show you where they are.',
    ],
    reward: { orbs: 6, coins: 120, item: 'charm-brinehollow-keepers-flame' },
  },
];
