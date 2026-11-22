import type { QuestDef } from '../../../../IslesTypes';
import { EAR_BOXES, SPOTS } from './stilthaven';

/**
 * Stilthaven's five quests. The first is the isle's welcome in disguise — you land on Draught Night,
 * unmarked, and the Markwarden comes down the walk to fix that. The second is a bakery job with
 * contraband in the honey. The rest are small stories about a town that lives one dose at a time:
 * a tannery a skin short of its tithe, a child who wants a black line rubbed off a board, and a
 * lighthouse keeper who wants a lantern for the people the mire took.
 *
 * Every quest ends in a fight with one of the Matriarch's servants in the port. Their elements are all
 * different: venom, memory, oil, ink, depths.
 */
export const STILTHAVEN_QUESTS: QuestDef[] = [
  // ── 1. New Moon ───────────────────────────────────────────────────
  {
    id: 'stilthaven-new-moon', area: 'stilthaven', name: 'New Moon', giver: 'stilthaven-dock',
    offer: [
      'New moon tonight. You have come in on Draught Night — the one night every soul in Stilthaven queues.',
      'And there is no Draught for strangers. You are not Marked. The Markwarden fixes that, at the rope.',
      'Go and look at the queue before she looks at you. Clerk Vellum keeps the board. She is kinder than it.',
    ],
    accept: [
      'The Draught House is up the spine, on the big deck east of it. Green dome. Smells of almonds.',
      'Keep your sleeve down. Everybody looks at a wrist first, here, and a face second.',
    ],
    stages: [
      {
        objective: { kind: 'visit', area: 'stilthaven', at: SPOTS.queue, r: 120, label: 'The Draught queue' },
        hint: 'Walk up the spine to the queue on the Draught House deck',
      },
      {
        objective: {
          kind: 'talk', npc: 'stilthaven-clerk',
          lines: [
            'Name? — No. You have no name in my book. No Mark, no name, no dose. It is not cruelty. It is arithmetic.',
            'Every child is bitten at a week old. Her venom sleeps as long as the Draught comes. One dose a moon.',
            'And the Markwarden saw you come up the walk. Here she comes, with the fang. Strangers get Marked here.',
          ],
        },
        hint: 'Read the ration board with Clerk Agatha Vellum',
      },
      {
        objective: {
          kind: 'duel', area: 'stilthaven',
          foe: {
            id: 'stilthaven-new-moon-duel', court: 'stilthaven', name: 'Strangers Are Marked',
            foeName: 'Markwarden Sallow Fenn', foeElement: 'slime', difficulty: 3, hpMult: 0.95,
            gimmick: '', at: { x: 1580, y: 752 }, coins: 70,
            look: { body: 0x9aa08a, accent: 0x3e5a24, hat: 'plague', traits: ['satchel', 'tool'], size: 1.1, eye: 0xd0f070 },
            challenge: [
              'A stranger on the walk at new moon, and not a mark on that wrist. Hold your arm out. It is quick.',
              'Two little holes. Then you are hers like the rest of us, and the Draught keeps you. That is mercy.',
              'Unmarked, you are contraband. And contraband goes in the mire. Arm out, stranger, or I take it.',
            ],
            beaten: ['Put — put the fang down, it is full. ...Keep your wrist. Somebody on this isle may as well.'],
          },
        },
        hint: 'Markwarden Sallow Fenn has come down the High Stilts to Mark you — refuse her',
      },
    ],
    complete: [
      'You sent the Markwarden back up the Fen Road with her fang in her boot? On your first night? Ha!',
      'That is the Mark, then. Everybody here has two little scars, and one dose a moon between them and grey.',
      'Six broodlings hold the courts up those roads. North is the Fang Court. Here — landing money, from the box.',
    ],
    reward: { orbs: 8, coins: 60 },
  },

  // ── 2. Honey on the Tongue ────────────────────────────────────────
  {
    id: 'stilthaven-grey-day-buns', area: 'stilthaven', name: 'Honey on the Tongue', giver: 'stilthaven-baker',
    offer: [
      'Old Ottilie Pell has been passed over. Third moon running. Her fingertips are going grey — it creeps.',
      'I bake her a bun every new moon. Honey on it. And a drop of something in the honey that is not on the board.',
      'Two mire mullet and a fanged herring, off the Gaff. I am out of fish, and Ottilie is out of time.',
    ],
    accept: [
      'The Gaff is the thin pier at the west end of the Mooring Walk. Press E at the water and wait for the tug.',
      'Herring have teeth. Hold them by the gills. Bring the fish to my counter and I will do the rest.',
    ],
    stages: [
      {
        objective: { kind: 'fish', fish: 'fish-mire-mullet', count: 2 },
        hint: 'Catch 2 Mire Mullet off the Gaff or the Landing Pier',
      },
      {
        objective: { kind: 'fish', fish: 'fish-fanged-herring', count: 1 },
        hint: 'Catch a Fanged Herring (they school in the fangs\' shadows)',
      },
      {
        objective: { kind: 'cook', recipe: 'recipe-stilthaven-grey-day-buns' },
        hint: 'Have the Honeyed Fang bake Grey-Day Buns (2 Mire Mullet, 1 Fanged Herring)',
      },
      {
        objective: {
          kind: 'deliver', npc: 'stilthaven-gran', item: 'meal-stilthaven-grey-day-buns', count: 1,
          lines: [
            'A honey bun. From Hetty. ...It tastes of almonds under the honey. She has put something in it again.',
            'Look. My fingertip. It was grey this morning to the knuckle. It is pink at the end. Look at it.',
            '— Hide the bag. There is a man on the walk who never forgets a face. Quill. He is looking at my hand.',
          ],
        },
        hint: 'Take the Grey-Day Buns to Ottilie Pell at her door on the Mooring Walk',
      },
      {
        objective: {
          kind: 'duel', area: 'stilthaven',
          foe: {
            id: 'stilthaven-grey-day-duel', court: 'stilthaven', name: 'Never Forgets',
            foeName: 'Remembrancer Quill', foeElement: 'memory', difficulty: 3, hpMult: 0.95,
            gimmick: '', at: { x: 820, y: 1240 }, coins: 70,
            look: { body: 0xa8a090, accent: 0x2a2430, hat: 'cowl', traits: ['book', 'scarf'], size: 1.0, eye: 0xd8e070 },
            challenge: [
              'Ottilie Pell. Passed over at the dark of the moon. Grey to the knuckle on Tuesday. Pink today. Interesting.',
              'I remember every face in that queue, and every finger. And I remember the baker buys almonds.',
              'Every name I bring the Draught House is a dose for me. Hers will do nicely. Unless you make me forget.',
            ],
            beaten: ['I... the baker. The baker who? A bun? — I do not remember why I came. Do not let me remember.'],
          },
        },
        hint: 'Remembrancer Quill is on the Mooring Walk — make him forget what he saw',
      },
    ],
    complete: [
      'Quill went up the Dark Walk asking people what his own name was. Good. Let him queue for that.',
      'Ottilie is pink to the second knuckle. A drop a moon does not cure her. It keeps the cold back.',
      'Tansy Rue brews it. You did not hear that from me. Take this — and a bun for the road. Honey keeps.',
    ],
    reward: { orbs: 9, coins: 55 },
  },

  // ── 3. The Moult-Tithe ────────────────────────────────────────────
  {
    id: 'stilthaven-moult-tithe', area: 'stilthaven', name: 'The Moult-Tithe', giver: 'stilthaven-tanner',
    offer: [
      'The Moult-Tithe is due at the dark of the moon. Forty whole skins from this tannery, cured, for Her.',
      'Forty! The mire went cold this spring and the snakes have not shed. I have thirty-five and a patched one.',
      'A skin short and the tannery is passed over. All eleven of us. There are sheds hung in the mangroves. Look.',
    ],
    accept: [
      'Snakes shed against rough bark. Look on the mangrove roots on the bank, and along the side-walks.',
      'Whole skins, mind. A shed skin has the eye-caps in it. That is how the Reeve tells. He tells by lamp.',
    ],
    stages: [
      {
        objective: {
          kind: 'collect', area: 'stilthaven', label: 'shed snakeskin', emoji: '🐍', color: 0xd8d0a0,
          spots: [{ x: 250, y: 340 }, { x: 600, y: 270 }, { x: 1860, y: 380 }, { x: 2420, y: 380 }, { x: 420, y: 1040 }],
        },
        hint: 'Find 5 whole shed snakeskins on the mangroves of the bank and along the Tannery Walk',
      },
      {
        objective: {
          kind: 'talk', npc: 'stilthaven-tanner',
          lines: [
            'Five! Whole, eye-caps in. Forty exactly — look at them on the frames, like washing on a line.',
            'Now I stretch and oil them, and the Reeve comes to count. He counts with a lamp. He burns the bad ones.',
            'Oh no. He is early. That is Tithe-Reeve Tallowby, and he has brought his oil can. That is not for skins.',
          ],
        },
        hint: 'Bring the skins to Scutch Varley at the tannery',
      },
      {
        objective: {
          kind: 'duel', area: 'stilthaven',
          foe: {
            id: 'stilthaven-moult-tithe-duel', court: 'stilthaven', name: 'Counted by Lamplight',
            foeName: 'Tithe-Reeve Tallowby', foeElement: 'oil', difficulty: 4, hpMult: 0.95,
            gimmick: '', at: { x: 300, y: 752 }, coins: 75,
            look: { body: 0xb09a7a, accent: 0x3a2a1a, hat: 'tophat', traits: ['lantern', 'glasses', 'apron'], size: 1.2, eye: 0xffd880 },
            challenge: [
              'Forty skins, the tanner says. I will count them myself. By lamp. One at a time. Very near the lamp.',
              'Oh dear, that one caught. And that one. Thirty-eight. Short. What a pity. The tannery is passed over.',
              'You object? Then you can be skin forty-one. Hold still, now. I oil everything before I count it.',
            ],
            beaten: ['My can — it is empty. Forty. It is forty. I counted forty. Do not tell her I counted honestly.'],
          },
        },
        hint: 'Tithe-Reeve Tallowby is on the High Stilts with a lamp and an oil can — stop him burning the count',
      },
    ],
    complete: [
      'Forty skins, signed for in the Reeve\'s own hand. His hand was shaking. I did not say anything about it.',
      'Eleven of us drink this moon. Eleven! Here — orbs I took in trade, and my thanks, which are not much.',
    ],
    reward: { orbs: 10, coins: 70 },
  },

  // ── 4. Struck Through ─────────────────────────────────────────────
  {
    id: 'stilthaven-struck-names', area: 'stilthaven', name: 'Struck Through', giver: 'stilthaven-wren',
    requires: { questDone: 'stilthaven-new-moon' },
    offer: [
      'Gran is on the board with a line through her. A black line. Clerk Vellum says she did not choose it.',
      'Somebody pays to have names struck. They get the dose for it. Gran says there is a box you post names in.',
      'There are ear-boxes on posts all over Stilthaven. You post a slip, a name comes off the board. Help me.',
    ],
    accept: [
      'The ear-boxes look like a brass ear on a post. Pull the slips out of the slot. Do not let anybody see you.',
    ],
    stages: [
      {
        objective: {
          kind: 'collect', area: 'stilthaven', label: 'denunciation slip', emoji: '📜', color: 0xe8e0c0,
          spots: [
            { x: EAR_BOXES[0].x + 10, y: EAR_BOXES[0].y + 40 }, { x: EAR_BOXES[1].x + 50, y: EAR_BOXES[1].y },
            { x: EAR_BOXES[2].x + 10, y: EAR_BOXES[2].y + 40 }, { x: EAR_BOXES[3].x - 50, y: EAR_BOXES[3].y + 40 },
          ],
        },
        hint: 'Pull the slips out of 4 brass ear-boxes on the walks',
      },
      {
        objective: {
          kind: 'talk', npc: 'stilthaven-clerk',
          lines: [
            'These are slips. "Ottilie Pell keeps contraband." "The Pells speak against Her." All the same hand.',
            'The same hand as the ration book. The Ration-Scribe writes the slips, then strikes the names himself.',
            'He draws the struck doses and sells them up the roads. — And there he is, with his black quill.',
          ],
        },
        hint: 'Show the slips to Clerk Vellum at the ration board',
      },
      {
        objective: {
          kind: 'duel', area: 'stilthaven',
          foe: {
            id: 'stilthaven-struck-names-duel', court: 'stilthaven', name: 'Struck Through',
            foeName: 'Ration-Scribe Inkle Marsh', foeElement: 'ink', difficulty: 4, hpMult: 1,
            gimmick: '', at: { x: 1780, y: 676 }, coins: 75,
            look: { body: 0x9a9080, accent: 0x1a1a24, hat: 'tophat', traits: ['book', 'glasses', 'scarf'], size: 1.05, eye: 0xc8d0e0 },
            challenge: [
              'Ah. My slips. My slips in a child\'s hands, at the board. You have been reading my handwriting.',
              'The Matriarch reads every slip. She likes a town that tells on itself. I give her plenty to read.',
              'One stroke of this quill and you are passed over too, stranger. You do not even have a Mark. Easy.',
            ],
            beaten: ['My nib is split. — Fine! Un-strike her. Un-strike them all. Ink is cheap. I will write more.'],
          },
        },
        hint: 'Ration-Scribe Inkle Marsh is at the ration board — break his quill',
      },
    ],
    complete: [
      'Gran is on the board with no line! Clerk Vellum rubbed it out with her thumb. Her thumb went black.',
      'Gran says she is getting her dose this moon and I am to have the bun. Here — I saved these. They glow.',
    ],
    reward: { orbs: 10, coins: 65 },
  },

  // ── 5. Lanterns for the Lowered ───────────────────────────────────
  {
    id: 'stilthaven-lowered', area: 'stilthaven', name: 'Lanterns for the Lowered', giver: 'stilthaven-keeper',
    requires: { princesOfIsle: 'slime', count: 2 },
    offer: [
      'The greyed who die before the boat can take them to the Grave Court are Lowered. Off the stage, west end.',
      'A stone at the feet, and the mire takes them. It has no bottom. No lantern either: to mourn is disloyal.',
      'My brother went off that stage. I want a lantern lit for him, and for all of them. Viper-eel oil burns clean.',
    ],
    accept: [
      'Two viper eels — they lie in the weed off the piers. And the old lanterns were thrown in off the Mooring Walk.',
      'They are tin. They float a while, then catch on the stilts. Fish them out and bring them to the stage.',
    ],
    stages: [
      {
        objective: { kind: 'fish', fish: 'fish-viper-eel', count: 2 },
        hint: 'Catch 2 Viper Eels off the piers (for the lantern oil)',
      },
      {
        objective: {
          kind: 'collect', area: 'stilthaven', label: 'drowned lantern', emoji: '🏮', color: 0xffc870,
          spots: [{ x: 320, y: 1272 }, { x: 860, y: 1274 }, { x: 1760, y: 1274 }, { x: 2300, y: 1272 }],
        },
        hint: 'Fish 4 drowned lanterns out from under the edge of the Mooring Walk',
      },
      {
        objective: { kind: 'visit', area: 'stilthaven', at: SPOTS.stage, r: 90, label: 'The Lowering Stage' },
        hint: 'Set the lanterns out on the Lowering Stage at the west end of the Mooring Walk',
      },
      {
        objective: {
          kind: 'duel', area: 'stilthaven',
          foe: {
            id: 'stilthaven-lowered-duel', court: 'stilthaven', name: 'No Lanterns',
            foeName: 'Dredgemaster Silt', foeElement: 'depths', difficulty: 4, hpMult: 1.05,
            gimmick: '', at: { x: 270, y: 1242 }, coins: 95,
            look: { body: 0x7a8278, accent: 0x1a2a2a, hat: 'diving', traits: ['tool', 'bandage'], size: 1.3, eye: 0xa8e0c0 },
            challenge: [
              'Lanterns. On the Lowering Stage. Lit. Do you know how far a light shows across the mire at night?',
              'All the way up the Fen Road. To the Fang Court. To her. The Lowered are lowered so nobody looks for them.',
              'I keep the stage clean. I drag back up what floats. Lanterns go down. So do the people who light them.',
            ],
            beaten: ['Leave them burning, then. ...I lowered your brother, keeper. I did it gently. I always did it gently.'],
          },
        },
        hint: 'Dredgemaster Silt has come down the Mooring Walk to sink the lanterns — stand in his way',
      },
    ],
    complete: [
      'Forty lanterns on the stage tonight. Forty. Half the town came down the walk and nobody said a word.',
      'I lit my brother\'s first. Then I went up and lit the big lamp with honest oil. Let her see that from the nest.',
      'Take my old lantern. It found boats in the mire for thirty years. It will find you the way back.',
    ],
    reward: { orbs: 12, coins: 120, item: 'charm-stilthaven-lowering-lantern' },
  },
];
