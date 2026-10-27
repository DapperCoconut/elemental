import type { QuestDef } from '../../../../IslesTypes';
import { BLUE, PAPER } from './palette';
import { TOWERS } from './layout';

/**
 * Five small stories in the Inkwell. Each one is about what gets written down here — and what
 * gets blotted out: the town's own charter, a squid milked for the Queen's receipts, a forger who
 * keeps families dry, a crier who cannot read what he shouts, and a mother whose son was struck
 * from the registry the night his house went under.
 */
export const INKWELL_QUESTS: QuestDef[] = [
  {
    id: 'inkwell-charter',
    area: 'inkwell',
    name: 'The Missing Page',
    giver: 'inkwell-vellum',
    offer: [
      'The town charter had four pages. The censors took the fourth — the one that says who the canals belong to.',
      'They did not burn it. Blot never burns anything. He tears it, and lets the canal take the pieces.',
      'The current runs east. The scraps catch on the coping stones along the towpath. Would you look?',
    ],
    accept: [
      'Four scraps should be enough to read it. Bring them to Gideon at the Pressworks — he can set it whole again.',
    ],
    stages: [
      {
        objective: {
          kind: 'collect', area: 'inkwell', label: 'Scrap of the charter', emoji: '📜', color: PAPER,
          spots: [{ x: 700, y: 978 }, { x: 1360, y: 978 }, { x: 2060, y: 972 }, { x: 1780, y: 1310 }],
        },
        hint: 'Find 4 scraps of the town charter caught along the canal towpath',
      },
      {
        objective: {
          kind: 'talk', npc: 'inkwell-slug', lines: [
            'Let me see. "...the waters of this town belong to those who live upon them, and no tithe..." Ha!',
            'I can set this. Founders\' face, the old type. A thousand copies by morning, if the press holds.',
            'But Sheaf will smell the ink. The inspector checks every forme that leaves this door. He is out there now.',
          ],
        },
        hint: 'Bring the scraps to Gideon Slug, the compositor at the Pressworks',
      },
      {
        objective: {
          kind: 'duel', area: 'inkwell',
          foe: {
            id: 'inkwell-charter-duel',
            court: 'inkwell',
            name: 'Proof Copy',
            foeName: 'Inspector Sheaf',
            foeElement: 'paper',
            difficulty: 3,
            gimmick: '',
            at: { x: 700, y: 885 },
            look: { body: 0xf2eee3, accent: 0x7d7a72, hat: 'tophat', traits: ['book', 'glasses'], eye: 0x2b5cff },
            challenge: [
              'A forme of unlicensed type left the Pressworks today. It smelled of charter. I have a nose for charter.',
              'Every page in this town is folded, filed or pulped. Choose which, and quickly.',
            ],
            beaten: ['Fine. Fine! Let them paste it on every wall. Paper tears, you know. ...Mine does, apparently.'],
            coins: 65,
          },
        },
        hint: 'Stop Inspector Sheaf seizing the charter forme (the press yard, by the drying line)',
      },
    ],
    complete: [
      'You found all four, and Sheaf is sulking in the gutter? Look — look what Gideon has pasted on my door.',
      '"The waters of this town belong to those who live upon them." Read it aloud. Louder. Let the tower hear.',
    ],
    reward: { orbs: 4, coins: 60 },
  },
  {
    id: 'inkwell-old-gloom',
    area: 'inkwell',
    name: 'Old Gloom',
    giver: 'inkwell-tess',
    offer: [
      'They tap Old Gloom twice a day. Needles in her mantle, ink in a bucket, the bucket to the Pressworks.',
      'Murk says she is the best stock in the Reach. She is the OLDEST, and she is tired, and she has scars.',
      'If Murk was beaten fair, he might listen. And then somebody has to deal with the needles.',
    ],
    accept: ['Murk is on the pen bank. Do not stand near the pens — the girls squirt. Grab the herring if you see it!'],
    stages: [
      { objective: { kind: 'defeat', encounter: 'inkwell-squid-pens' }, hint: 'Beat Squidherder Murk at the Squid Pens' },
      {
        objective: {
          kind: 'collect', area: 'inkwell', label: 'Tapping needle', emoji: '🪡', color: BLUE,
          spots: [{ x: 150, y: 955 }, { x: 360, y: 975 }, { x: 500, y: 960 }],
        },
        hint: 'Gather the 3 tapping needles left on the pen bank',
      },
      {
        objective: {
          kind: 'duel', area: 'inkwell',
          foe: {
            id: 'inkwell-old-gloom-duel',
            court: 'inkwell',
            name: 'The Tapper',
            foeName: 'Ink-Tapper Grue',
            foeElement: 'slime',
            difficulty: 3,
            gimmick: '',
            at: { x: 260, y: 880 },
            look: { body: 0x7d7a72, accent: 0x13297a, hat: 'beanie', traits: ['tool', 'apron', 'mask'], eye: 0x93b0ff },
            challenge: [
              'Those are my needles. Do you know how hard it is to find a needle that goes through squid?',
              'Murk can go soft if he likes. The Pressworks still wants its buckets, and I still get paid by the bucket.',
            ],
            beaten: ['All right! All right. No more tapping. I will... I will go and milk something that does not look at me.'],
            coins: 65,
          },
        },
        hint: 'Run Ink-Tapper Grue off the pen bank',
      },
    ],
    complete: [
      'No needles! And Grue went off down the towpath with his bucket on his head. Gloomy, did you see?',
      'She squirted. Right at me. That is how squids say thank you. I am almost certain.',
    ],
    reward: { orbs: 4, coins: 30 },
  },
  {
    id: 'inkwell-forged-receipts',
    area: 'inkwell',
    name: 'Paid in Full',
    giver: 'inkwell-mabry',
    requires: { questDone: 'inkwell-charter' },
    offer: [
      'You set the charter loose. That buys you a look behind the curtain. I make Dry Tithe receipts. Fake ones.',
      'A family with a receipt on file keeps its floor at the tide. Without one, it goes under. I level the odds.',
      'But the clerks check the signature — Sumi\'s brush. Beat her and she will sign your defeat. Bring me the sheet.',
    ],
    accept: [
      'And I need a blotter that drinks her ink clean — a blotted ray\'s back. Wick will tell you where they sit.',
    ],
    stages: [
      { objective: { kind: 'defeat', encounter: 'inkwell-wet-ink' }, hint: 'Beat Calligrapher Sumi in the scriptorium lane' },
      { objective: { kind: 'fish', fish: 'fish-blotted-ray', count: 1 }, hint: 'Land a blotted ray in the Grand Canal reach' },
      {
        objective: {
          kind: 'duel', area: 'inkwell',
          foe: {
            id: 'inkwell-forged-receipts-duel',
            court: 'inkwell',
            name: 'Audit',
            foeName: 'Tithe-Auditor Ledgerwick',
            foeElement: 'fortune',
            difficulty: 4,
            gimmick: '',
            at: { x: 1300, y: 1385 },
            look: { body: 0xd8d2c3, accent: 0x13297a, hat: 'tophat', traits: ['book', 'glasses', 'satchel'], eye: 0x5b84ff },
            challenge: [
              'Ninety receipts this tide from a street that has not paid in a year. Somebody is very good at S\'s.',
              'I count coins. I count heads. I count floors. Today, friend, I am counting you.',
            ],
            beaten: ['My ledger does not balance. It has never not balanced. ...I am going to need to sit in the canal for a bit.'],
            coins: 65,
          },
        },
        hint: 'Keep Tithe-Auditor Ledgerwick out of Mabry\'s alley (the south street)',
      },
    ],
    complete: [
      'Sumi\'s signature, a ray-skin blotter, and the auditor sat in a gutter doing sums on his fingers. Perfect.',
      'Watch. One stroke, loop UNDER — she told you that? Ha. PAID IN FULL. The Hobbs keep their floor tonight.',
    ],
    reward: { orbs: 5, coins: 50 },
  },
  {
    id: 'inkwell-decrees',
    area: 'inkwell',
    name: 'What the Lines Say',
    giver: 'inkwell-ned',
    offer: [
      'Every morning I cry the decrees off the lines. Everybody goes pale. I have never known what I am saying.',
      'Bellow — he is the real crier, I am his boy — says it is better that way. But my mam went pale too.',
      'Miss Vellum at the Archive can read anything. Would you ask her what they say? I want to know. I think.',
    ],
    accept: ['The Archive is down the south street, east end. She smells of wet paper. In a nice way.'],
    stages: [
      {
        objective: {
          kind: 'talk', npc: 'inkwell-vellum', lines: [
            'The decrees? I have read every one this year. Shall I tell you what they say? All of them?',
            '"Pay." Dressed up in forty different ways — the Tide-Rate, the Floor-Due, the Dry Tithe — but: pay.',
            'Tell the boy to take them down. All of them. Every line in the square. He has cried enough of them.',
          ],
        },
        hint: 'Ask Archivist Vellum what the decrees say',
      },
      {
        objective: {
          kind: 'collect', area: 'inkwell', label: 'Decree off the line', emoji: '📃', color: PAPER,
          spots: [{ x: 1080, y: 615 }, { x: 1320, y: 615 }, { x: 1095, y: 770 }, { x: 1305, y: 770 }, { x: 830, y: 905 }],
        },
        hint: 'Pull 5 decrees down off the drying lines in Decree Square and the press yard',
      },
      {
        objective: {
          kind: 'duel', area: 'inkwell',
          foe: {
            id: 'inkwell-decrees-duel',
            court: 'inkwell',
            name: 'Hue and Cry',
            foeName: 'Town Crier Bellow',
            foeElement: 'sound',
            difficulty: 4,
            gimmick: '',
            at: { x: 1200, y: 820 },
            look: { body: 0xf2eee3, accent: 0x0e0e12, hat: 'tricorn', traits: ['scarf', 'lantern'], size: 1.25, eye: 0x13297a },
            challenge: [
              'OI! Those are DECREES. You do not take down decrees, you STAND under them and you LISTEN.',
              'Doesn\'t matter what they say. Never did. It\'s how LOUD they say it. Let me show you LOUD.',
            ],
            beaten: ['...Fine. Take the bell. My throat\'s gone anyway. Thirty years of shouting "pay" at people. Sorry, lad.'],
            coins: 65,
          },
        },
        hint: 'Face Town Crier Bellow on the south road below the square',
      },
    ],
    complete: [
      'Pay. They all just say PAY? I have been shouting "pay" at my own mam for two years.',
      'Bellow gave me his bell! I will only ring it for nice things. "It is not raining." "You are all right."',
    ],
    reward: { orbs: 4, coins: 40 },
  },
  {
    id: 'inkwell-blotted-name',
    area: 'inkwell',
    name: 'The Blotted Name',
    giver: 'inkwell-agathe',
    requires: { encounter: 'inkwell-redaction' },
    offer: [
      'You beat Quill. Then you have been inside his tower. The censors keep the blot-orders up there, in a ledger.',
      'My Teodor went under with our house. When I asked the registry for his name, there was a square black blot.',
      'If his name is in the ledger, then it was written once. And if it was written once, it can be written again.',
    ],
    accept: ['The tower door has a bar across it. Quill will not stop you now. I do not think he will stop anybody.'],
    stages: [
      {
        objective: { kind: 'visit', area: 'inkwell', at: { x: TOWERS[0].x + 30, y: TOWERS[0].y + 60 }, r: 70, label: 'The censor\'s tower door' },
        hint: 'Search Censor Quill\'s tower for the blot-order ledger',
      },
      {
        objective: {
          kind: 'talk', npc: 'inkwell-slug', lines: [
            'That is a blot-order. My setting — I know my own kerning. Spring, the week of the high tides.',
            'Fourth name down: Teodor Lorn. I set my own apprentice\'s name, and printed it, and gave it to the tower.',
            'The registry is in the Well itself. The Prince keeps it under his seal. Only he can open it.',
          ],
        },
        hint: 'Show the blot-order to Gideon Slug at the Pressworks',
      },
      { objective: { kind: 'prince', prince: 'blot' }, hint: 'Defeat Prince Blot and open the registry' },
      {
        objective: {
          kind: 'duel', area: 'inkwell',
          foe: {
            id: 'inkwell-blotted-name-duel',
            court: 'inkwell',
            name: 'Struck From the Record',
            foeName: 'Registrar Nil',
            foeElement: 'memory',
            difficulty: 4,
            gimmick: 'inkwell-redaction',
            at: { x: 980, y: 545 },
            look: { body: 0xb9b2a1, accent: 0x0e0e12, hat: 'veil', traits: ['book', 'lantern'], eye: 0xf2eee3 },
            challenge: [
              'The Prince is down, and the registry is open. I am its keeper still. I keep it closed.',
              'A blotted name is not lost. It is forgotten, carefully, by me. Three thousand so far. I can forget one more.',
            ],
            beaten: ['Teodor Lorn. ...I remember him. I remember all of them. That was always the worst part of the job.'],
            coins: 65,
          },
        },
        hint: 'Get past Registrar Nil on the manor steps and into the registry',
      },
    ],
    complete: [
      'You have it? Read it to me. No — let me. "Teodor Lorn. Apprentice compositor. Aged nineteen."',
      'Kept, they say. Sleeping, in the Undertow. Then he will wake up and find himself written down. Thank you.',
    ],
    reward: { orbs: 7, coins: 90 },
  },
];
