import type { QuestDef } from '../../../../IslesTypes';
import { BELL_PIT, TRIP } from './area';
import { FISH_PERCH, FISH_SUCKER } from './items';

/**
 * The Forge Court's five side quests.
 *
 * Between them they show how the Iron Tithe bites: the Hook and the households that hang light
 * (Ada), the night shift that may not eat before the weighing (Nan), the buried hammer-songs and
 * the name-bells cast for the interred (Osric), the collars welded round the interred's necks
 * (Linka), and finally the boy the Prince was before he was quenched (Hollin). Each is somebody
 * doing one small thing the Hook can't weigh.
 */
export const FORGE_QUESTS: QuestDef[] = [
  // ── 1. Short Weight — collect + talk + duel ──────────────────────────
  {
    id: 'forge-q-short-weight',
    area: 'forge',
    name: 'Short Weight',
    giver: 'forge-ada',
    offer: [
      'Our pig\'s seven stone light. The furnace ate a charge. Ma says it happens. Ma says it like a prayer.',
      'There\'s iron in the slag heaps. Little nuggets the furnace missed — Nan finds a pound a week.',
      'I\'m not allowed in the scrapyard. Rusk chases me. Would you pick some for us? Five should do it.',
    ],
    accept: [
      'Shiny ones! Round the heaps and the scrap piles. Then take them to Prudence at the Hook.',
    ],
    stages: [
      {
        objective: {
          kind: 'collect', area: 'forge', label: 'Slag-iron nugget', emoji: '🪨', color: 0x9aa4ae,
          spots: [{ x: 2080, y: 1210 }, { x: 2270, y: 1070 }, { x: 2170, y: 1290 }, { x: 1900, y: 1350 }, { x: 2280, y: 1300 }],
        },
        hint: 'Pick 5 slag-iron nuggets round the slag heaps beyond the Runnel',
      },
      {
        objective: {
          kind: 'talk', npc: 'forge-prudence',
          lines: [
            'Ferrous household. On the cradle, please. Ninety-one stone, four… and the nuggets… ninety-eight. Full weight.',
            'Full. I shall write it in black. I have not written a black line since the spring.',
            'Oh. Oh no. The Hookwarden has seen. He says nuggets from the heaps are the Prince\'s slag, not your iron.',
            'He says it is a theft from the Tithe to pay the Tithe. He is coming down off the gantry.',
          ],
        },
        hint: 'Take the nuggets to Prudence Tare at the Tithe Hook',
      },
      {
        objective: {
          kind: 'duel', area: 'forge',
          foe: {
            id: 'forge-q-short-weight-duel',
            court: 'forge',
            name: 'Whose Slag',
            foeName: 'Hookwarden Corvin Plumb',
            foeElement: 'metal',
            difficulty: 4,
            hpMult: 0.95,
            gimmick: '',
            at: { x: 1300, y: 860 },
            look: { body: 0xb8a898, accent: 0x3c4046, hat: 'helmet', traits: ['book', 'tool'], size: 1.2, eye: 0x9aa4ae },
            challenge: [
              'Slag is the Prince\'s. What the furnace leaves is the Prince\'s. What you picked off it is the Prince\'s.',
              'A household pays in its own iron or it is short. That is the whole of the Hook. It is a beautiful thing.',
              'Take the nuggets off the cradle, stranger. Or I take them off you.',
            ],
            beaten: ['…The beam reads ninety-eight. The beam is honest. I will have to think about the beam.'],
            coins: 95,
          },
        },
        hint: 'Face Hookwarden Corvin Plumb under the Tithe Hook',
      },
    ],
    complete: [
      'Black ink! Prudence wrote us in BLACK. Ma went and read it three times.',
      'She sent you this. It was for bricks — for when they bricked our door. We won\'t need bricks.',
    ],
    reward: { orbs: 7, coins: 70 },
  },

  // ── 2. The Night Shift — fish + deliver + duel ───────────────────────
  {
    id: 'forge-q-night-shift',
    area: 'forge',
    name: 'The Night Shift',
    giver: 'forge-nan',
    offer: [
      'The furnace crews work the night through on an empty belly. Eat before the Hook, they say, and you\'re short.',
      'Nobody weighs a fish, though. Not a perch out of the quench pond. I\'d make a stew, if I had the perch.',
      'Three ironscale perch. Catch them for me, love, and take them up to Fenwick at Number Three.',
    ],
    accept: [
      'Cast off the kerb where the steam\'s thickest. Perch like it warm. Mind the Reeve — she hates anglers.',
    ],
    stages: [
      {
        objective: { kind: 'fish', fish: FISH_PERCH, count: 3 },
        hint: 'Catch 3 ironscale perch in the quench pond',
      },
      {
        objective: {
          kind: 'deliver', npc: 'forge-fenwick', item: FISH_PERCH, count: 3,
          lines: [
            'PERCH? FOR ME? NAN SENT YOU? I\'M NOT HUNGRY! …I\'M VERY HUNGRY! THE CREW\'LL HAVE A STEW!',
            'OH! THERE\'S THE QUENCH-REEVE! SHE\'S COMING UP FROM THE POND! SHE SAYS THE PERCH COOL THE WATER!',
          ],
        },
        hint: 'Bring the 3 perch to Fenwick Bellows at the third furnace',
      },
      {
        objective: {
          kind: 'duel', area: 'forge',
          foe: {
            id: 'forge-q-night-shift-duel',
            court: 'forge',
            name: 'The Cold End',
            foeName: 'Quench-Reeve Edda Rime',
            foeElement: 'ice',
            difficulty: 4,
            hpMult: 0.9,
            gimmick: '',
            at: { x: 420, y: 1280 },
            look: { body: 0xd0dce4, accent: 0x6a8ea0, hat: 'hood', traits: ['rod', 'satchel'], size: 1.05, eye: 0xc8e8ff },
            challenge: [
              'The quench pond is the Prince\'s temper. Every fish in it keeps the water cold. Cold water, hard steel.',
              'Three perch gone and the Prince\'s blades come out soft. Soft blades. Do you know what that costs?',
              'I keep the cold end. I\'ll keep you there too.',
            ],
            beaten: ['…The water was cold anyway. It\'s always cold. I keep it cold. Eat your stew.'],
            coins: 95,
          },
        },
        hint: 'See off Quench-Reeve Edda Rime by the quench pond',
      },
    ],
    complete: [
      'Fed the whole night shift! Three crews! Fenwick had thirds and swore it was seconds.',
      'Here — a slag sucker. Caught it off the bottom with a bit of bacon. Don\'t ask where I got the bacon.',
    ],
    reward: { orbs: 6, coins: 50, item: FISH_SUCKER, itemCount: 1 },
  },

  // ── 3. The Song in the Bell — talk + collect + duel ──────────────────
  {
    id: 'forge-q-song-in-the-bell',
    area: 'forge',
    name: 'The Song in the Bell',
    giver: 'forge-osric',
    offer: [
      'The Regent has ordered a great bell. Four ton. To ring over the Sepulchre "so the buried hear no other sound".',
      'He buried the hammer-songs. I cannot unbury them. But a bell\'s lip can be cut to ring any tune at all.',
      'If I had the Long Heat, every note, I would tune his bell to it. He would ring it himself.',
      'Wim at Number One knows the song. Ask him. Quietly.',
    ],
    accept: [
      'Quietly. The Knell-Warden listens at the pit. She has very good ears. It is her whole job.',
    ],
    stages: [
      {
        objective: {
          kind: 'talk', npc: 'forge-wim',
          lines: [
            'The Long Heat? For the bell? Old Osric. Ha. Ha! I can\'t sing it you here. The hammer\'s listening.',
            'But when they buried the songs, we buried the music plates — tin, punched, off the old smithy organ.',
            'Four of them, under the casting floor sand. By the pig beds. Dig them up. The holes are the notes.',
          ],
        },
        hint: 'Ask Wim Tapper at the first furnace about the Long Heat',
      },
      {
        objective: {
          kind: 'collect', area: 'forge', label: 'Punched music plate', emoji: '🎼', color: 0xe0ae62,
          spots: [{ x: 290, y: 590 }, { x: 500, y: 470 }, { x: 760, y: 590 }, { x: 990, y: 460 }],
        },
        hint: 'Dig up the 4 music plates buried in the casting floor sand',
      },
      {
        objective: {
          kind: 'duel', area: 'forge',
          foe: {
            id: 'forge-q-song-in-the-bell-duel',
            court: 'forge',
            name: 'Not a Note',
            foeName: 'Knell-Warden Sabra Hush',
            foeElement: 'silence',
            difficulty: 5,
            hpMult: 0.95,
            gimmick: 'forge-crucible',
            at: { x: BELL_PIT.x + 40, y: BELL_PIT.y + 150 },
            look: { body: 0xd8d0c8, accent: 0x2a2a2e, hat: 'veil', traits: ['book', 'lantern'], size: 1.1, eye: 0xb0b0c0 },
            challenge: [
              'Music plates. From under the sand. I heard you dig. I hear everything. I am the Knell-Warden.',
              'A bell rings one note: the name of the one going down. That is all a bell is for.',
              'Hand me the plates. I will melt them into the pour myself, and nobody will hear a thing.',
            ],
            beaten: ['…Go. Go and tune it. I will not hear it. I have decided not to hear it. It is my whole job.'],
            coins: 95,
          },
        },
        hint: 'Beat Knell-Warden Sabra Hush at the bell pit before she melts the plates',
      },
    ],
    complete: [
      'I have cut the lip. Nine verses round the soundbow. When they strike it, it will sing the Long Heat.',
      'Every time they ring it for a burial, the whole Hold will hear the song. Take this. It was for my own bell.',
    ],
    reward: { orbs: 8, coins: 80 },
  },

  // ── 4. Collar Blanks — collect + defeat ──────────────────────────────
  {
    id: 'forge-q-collar-blanks',
    area: 'forge',
    name: 'Collar Blanks',
    giver: 'forge-linka',
    offer: [
      'This season\'s collars are made. Blanks, open rings, waiting in the Hall\'s forecourt to be stamped and welded.',
      'One for every household that hangs light at the turn. I made every one. My best work. I want it back.',
      'I can\'t walk into the forecourt — I\'m expected there, at the turn, with my torch. You can.',
    ],
    accept: [
      'Four crates of them, round the forecourt plates. Bring them to the bridge and I\'ll tip them in the Runnel.',
    ],
    stages: [
      {
        objective: {
          kind: 'collect', area: 'forge', label: 'Collar blank', emoji: '⭕', color: 0x6a7078,
          spots: [{ x: 1730, y: 610 }, { x: 2000, y: 600 }, { x: 2190, y: 640 }, { x: 2280, y: 560 }],
        },
        hint: 'Take the 4 crates of collar blanks from the Anvil Hall\'s forecourt',
      },
      {
        objective: { kind: 'defeat', encounter: 'forge-scrap-magnet' },
        hint: 'Rusk buys every scrap of iron for the Hall — beat him (Scrap Magnet) before he weighs the blanks back in',
      },
    ],
    complete: [
      'In the Runnel. Every one. Hissed like snakes going down. Rusk stood on the bridge and swore at the slag.',
      'They\'ll order more. But not this season. Here — my torch money. I won\'t need the torch.',
    ],
    reward: { orbs: 7, coins: 75 },
  },

  // ── 5. The Last Heat — talk + visit + prince ─────────────────────────
  {
    id: 'forge-q-last-heat',
    area: 'forge',
    name: 'The Last Heat',
    giver: 'forge-hollin',
    requires: { courtReady: 'forge' },
    offer: [
      'All five of his smiths. His Highness has asked for the quench tank filled, and his hammer.',
      'Before you go in: Mrs Clinker taught him, or her husband did. Ask her who he was before he was hard.',
      'And stand by the Great Hammer for a while. Everyone in this court has had to learn to stand still by it.',
    ],
    accept: [
      'Mrs Clinker, then the Great Hammer, then the Hall. I will open the doors myself.',
    ],
    stages: [
      {
        objective: {
          kind: 'talk', npc: 'forge-mags',
          lines: [
            'He was a gentle boy. Ten years old, sent to Ezra to be made hard. He made a hinge. A perfect little hinge.',
            'He swung it back and forth for an hour and laughed. The Regent came to watch the lesson that day.',
            'Ezra was interred for softness. The boy was quenched in Hild\'s pond. He never made a hinge again.',
          ],
        },
        hint: 'Ask Mags Clinker who the Prince was as a boy',
      },
      {
        objective: { kind: 'visit', area: 'forge', at: { x: TRIP.x - 20, y: TRIP.y + 70 }, r: 80, label: 'The Great Trip-Hammer' },
        hint: 'Stand by the Great Trip-Hammer on Hook Square',
      },
      {
        objective: { kind: 'prince', prince: 'anvil' },
        hint: 'Face Prince Anvil at the Anvil Hall',
      },
    ],
    complete: [
      'He has stopped the Great Hammer. He walked out and put his hand on the cam, and it stopped.',
      'He has asked for small tongs and a piece of soft iron. He says he wants to make a hinge.',
      'Take the Hall\'s purse. He says he has a lot of doors to open now, and will need very good hinges.',
    ],
    reward: { orbs: 10, coins: 150 },
  },
];
