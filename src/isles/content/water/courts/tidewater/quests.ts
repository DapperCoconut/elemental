import type { QuestDef } from '../../../../IslesTypes';
import { LOW_WATER_STONE } from './area';
import { FISH_BLENNY, FOOD_DAB, RECIPE_PASTY } from './items';

/**
 * The Tidewater Court's five side quests.
 *
 * The first court on the isle, so between them they teach the tide town's ways — wade into the
 * drowned row at low water (Pell), fish the pools and bake (Morwenna), read a tide-staff and
 * gather (Teague), go out on the sandbars (Kip), and finally go down to the Low-Water Stone
 * where the Prince calls the sea (Hesper). Each is somebody trying to keep one thing dry.
 */
export const TIDEWATER_QUESTS: QuestDef[] = [
  // ── 1. Left Under — collect + talk + duel ────────────────────────────
  {
    id: 'tidewater-q-left-under',
    area: 'tidewater',
    name: 'Left Under',
    giver: 'tidewater-pell',
    offer: [
      'You\'re not from the ledger, are you. Good. Nobody from the ledger looks at Number Four that long.',
      'We were one coin short at the count. The Prince let the tide in and never gave the floor back.',
      'Everything we had is in there. Ned\'s compass. The kettle. The boy\'s first boots. Ned\'s letters to me.',
      'It\'s low water. Somebody young could go in by the windows. Tithe-Reeve Cobb says no salvage. I say please.',
    ],
    accept: [
      'Bless you. Step on the planks the neighbours laid — the lagoon\'s deeper than it looks by the doors.',
    ],
    stages: [
      {
        objective: {
          kind: 'collect', area: 'tidewater', label: 'Keepsake from Number Four', emoji: '🧳', color: 0xd6cbb2,
          spots: [{ x: 250, y: 1332 }, { x: 420, y: 1388 }, { x: 560, y: 1298 }, { x: 150, y: 1252 }],
        },
        hint: 'Salvage 4 of the Mudges\' keepsakes from the drowned row at low water',
      },
      {
        objective: {
          kind: 'talk', npc: 'tidewater-tamsy',
          lines: [
            'Ooh. Is that Mrs Mudge\'s kettle? I know that kettle. It whistles in B flat.',
            'I\'ve got something of hers too — found it in the creek after they were left under. A locket. With a man in.',
            'You give it her. She shouts at me when I go near the low row. She says it\'s for my own good. It probably is.',
            'Oh — and Cobb\'s coming. Tithe-Reeve Cobb. He counts salvage like it\'s still the Prince\'s. He\'s got a padlock.',
          ],
        },
        hint: 'Ask Tamsy the mudlark what she found in the creek',
      },
      {
        objective: {
          kind: 'duel', area: 'tidewater',
          foe: {
            id: 'tidewater-q-left-under-duel',
            court: 'tidewater',
            name: 'No Salvage',
            foeName: 'Tithe-Reeve Cobb',
            foeElement: 'metal',
            difficulty: 2,
            hpMult: 0.95,
            gimmick: '',
            at: { x: 560, y: 1190 },
            look: { body: 0x9a8d80, accent: 0x7a2219, hat: 'helmet', traits: ['satchel', 'tool'], size: 1.25 },
            challenge: [
              'That\'s Crown salvage under your arm. Left under means left. It\'s the Prince\'s now, and so are you.',
              'I padlock the doors of the low row myself. Every door. I have a great many padlocks.',
              'Put it back, or I\'ll lock you in with it.',
            ],
            beaten: ['...Mark it "lost to the tide". It happens. Things get lost to the tide. All the time.'],
            coins: 45,
          },
        },
        hint: 'Stand up to Tithe-Reeve Cobb at the edge of the drowned row',
      },
    ],
    complete: [
      'The kettle. The boots. His letters, all run together, but his hand. Oh, I know his hand.',
      'And the locket. Tamsy had it? That child. That dreadful, wonderful child.',
      'Ned\'s compass still points north. He always said it pointed home. Here — take this, and my thanks.',
    ],
    reward: { orbs: 4, coins: 40 },
  },

  // ── 2. The First Pasty — fish + cook + duel ──────────────────────────
  {
    id: 'tidewater-q-first-pasty',
    area: 'tidewater',
    name: 'The First Pasty',
    giver: 'tidewater-morwenna',
    offer: [
      'Every batch I bake, the first pasty goes to the Prince. Not to eat. To be TASTED. By Brill Salter.',
      'He takes one bite and if it\'s not salt enough for the Crown he has the whole batch thrown in the creek.',
      'I\'m baking blenny pasties for the children on the low row, and Brill is not having the first one.',
      'Catch me two blennies off the tide pools and bring a bit of samphire from Gilly\'s. Then we\'ll bake.',
    ],
    accept: [
      'Fen Netley\'s down at the pools — he\'ll show you how to cast. Blennies bite at anything.',
    ],
    stages: [
      {
        objective: { kind: 'fish', fish: FISH_BLENNY, count: 2 },
        hint: 'Catch 2 tidepool blennies in the tide pools',
      },
      {
        objective: { kind: 'cook', recipe: RECIPE_PASTY },
        hint: 'Have Morwenna bake a Blenny Pasty at the Low-Tide Larder (needs samphire from Gilly\'s)',
      },
      {
        objective: {
          kind: 'duel', area: 'tidewater',
          foe: {
            id: 'tidewater-q-first-pasty-duel',
            court: 'tidewater',
            name: 'Salt Enough for the Crown',
            foeName: 'Taster Brill Salter',
            foeElement: 'gum',
            difficulty: 2,
            hpMult: 0.9,
            gimmick: '',
            at: { x: 840, y: 1150 },
            look: { body: 0xe8d6c0, accent: 0xf1ecdf, hat: 'chef', traits: ['apron', 'glasses'], size: 1.1 },
            challenge: [
              'I smell crust. Blenny. Samphire. And no Taster at the oven door. Tsk.',
              'The first bite of every batch is the Crown\'s. Hand it over and I\'ll tell you if it\'s salt enough.',
              'It won\'t be. It never is. That is rather the point of me.',
            ],
            beaten: ['Too... sweet. Too sweet by half. Fine. FINE. Give it to the children.'],
            coins: 45,
          },
        },
        hint: 'Keep the first pasty out of Taster Brill Salter\'s mouth',
      },
    ],
    complete: [
      'Ha! He went off down the walk spitting samphire. First pasty of the batch to a child on the low row.',
      'Have a pair of my dabs in batter on the house, and something for the trouble.',
    ],
    reward: { orbs: 3, coins: 30, item: FOOD_DAB, itemCount: 2 },
  },

  // ── 3. The Gauge Runs Fast — visit + collect + duel ──────────────────
  {
    id: 'tidewater-q-gauge',
    area: 'tidewater',
    name: 'The Gauge Runs Fast',
    giver: 'tidewater-teague',
    offer: [
      'The Gauge is fast. Four minutes in the hour. I can hear it — the tick is wrong, it hurries.',
      'Four minutes. A family halfway up a ladder with their coin when the bell rings and the hand hits the blue.',
      'Someone has been at the escapement. Three brass pins are gone from it; I found the case scratched.',
      'Will you check the Gauge against the sea? The old staff on the flats is true — my grandmother set it.',
    ],
    accept: [
      'The red-and-white staff south of the stranded boat. Read it, then look for my pins. They\'ll glint.',
    ],
    stages: [
      {
        objective: { kind: 'visit', area: 'tidewater', at: { x: 1380, y: 1440 }, r: 70, label: 'Grandmother Ashlock\'s tide-staff' },
        hint: 'Read the old tide-staff on the flats south of the stranded boat',
      },
      {
        objective: {
          kind: 'collect', area: 'tidewater', label: 'Escapement pin', emoji: '⚙️', color: 0xd2a64a,
          spots: [{ x: 1000, y: 700 }, { x: 1420, y: 960 }, { x: 1214, y: 612 }],
        },
        hint: 'Find the Tide Gauge\'s 3 missing escapement pins around the plaza',
      },
      {
        objective: {
          kind: 'duel', area: 'tidewater',
          foe: {
            id: 'tidewater-q-gauge-duel',
            court: 'tidewater',
            name: 'Four Minutes Fast',
            foeName: 'Regulator Pendle',
            foeElement: 'sand',
            difficulty: 3,
            hpMult: 0.95,
            gimmick: '',
            at: { x: 1200, y: 1070 },
            look: { body: 0xcbb8a0, accent: 0x7f5f22, hat: 'tophat', traits: ['glasses', 'cane', 'book'], size: 1.05, eye: 0xf2d58a },
            challenge: [
              'Those are the Prince\'s pins. The Gauge keeps the Prince\'s time, and the Prince\'s time is a little early.',
              'Four minutes, honestly. Who misses four minutes? Twelve families a month, apparently.',
              'Give them here, and I\'ll be very prompt about forgetting your face.',
            ],
            beaten: ['Two minutes slow. Ashlock\'s time. Very well. Late is a kind of mercy, I suppose.'],
            coins: 45,
          },
        },
        hint: 'Stop Regulator Pendle taking the pins back below the plaza',
      },
    ],
    complete: [
      'Listen. *tick*. *tick*. That is an honest tick. Two minutes slow, the way it was built to be.',
      'Two minutes is the length of a ladder and a coin purse. You have bought every family on the flats two minutes.',
      'Here. I keep this for winding days. Today is a winding day.',
    ],
    reward: { orbs: 5, coins: 50 },
  },

  // ── 4. The Crown Pots — collect + defeat ─────────────────────────────
  {
    id: 'tidewater-q-crab-pots',
    area: 'tidewater',
    name: 'The Crown Pots',
    giver: 'tidewater-kip',
    offer: [
      'Da has to put a hundred crabs a tide in the crown pots. They go to the Prince\'s pool and they just... sit.',
      'Nobody eats them. Nobody even LOOKS at them. They sit in the lighthouse pool with their little faces.',
      'There are four crown pots out on the flats today. Red tags. If somebody opened them...',
      'Da would be cross. Da would want to fight about it. Da loses fights, though, mostly.',
    ],
    accept: [
      'Flip the lids and stand back. They come out sideways and fast. Don\'t let \'em grab your ankles!',
    ],
    stages: [
      {
        objective: {
          kind: 'collect', area: 'tidewater', label: 'Crown crab pot', emoji: '🦀', color: 0xc2412f,
          spots: [{ x: 880, y: 1230 }, { x: 1350, y: 1290 }, { x: 1450, y: 1480 }, { x: 680, y: 1520 }],
        },
        hint: 'Open the 4 red-tagged crown crab pots out on the flats',
      },
      {
        objective: { kind: 'defeat', encounter: 'tidewater-crab-season' },
        hint: 'Face Crabber Dunwick (Crab Season) on the west Low Walk when he finds out',
      },
    ],
    complete: [
      'Da came home with crab pinches all up his shins and said the pots "broke on their own".',
      'Then he gave me a crab to keep. I named it Captain. Here, this is my savings. Some of it\'s shells.',
    ],
    reward: { orbs: 4, coins: 30 },
  },

  // ── 5. Slack Water — talk + visit + prince ───────────────────────────
  {
    id: 'tidewater-q-slack-water',
    area: 'tidewater',
    name: 'Slack Water',
    giver: 'tidewater-hesper',
    requires: { courtReady: 'tidewater' },
    offer: [
      'All five of his. I watched from the lamp-room. So did he — he hasn\'t taken his eyes off the flats in days.',
      'Before you go up, you should see where he does it. Where the tide is called. The Low-Water Stone.',
      'Spratt at the tithe booth keeps the ledger of who is called under. Ask him what it says about the stone.',
    ],
    accept: [
      'Spratt first. Then the stone, at the sea\'s edge. Then come up the headland. He\'ll be waiting. He\'s exact.',
    ],
    stages: [
      {
        objective: {
          kind: 'talk', npc: 'tidewater-spratt',
          lines: [
            'The stone. Yes. The Prince stands on it at slack water — the moment the sea stops, between ebb and flood.',
            'He reads the ledger aloud. Every house one coin short. Then he lifts his staff and the sea comes for them.',
            'I just write the names. I... here. This is the ledger key. I\'d rather not have it any more.',
          ],
        },
        hint: 'Ask Tollkeeper Spratt at the Dry Tithe booth about the Low-Water Stone',
      },
      {
        objective: { kind: 'visit', area: 'tidewater', at: { x: LOW_WATER_STONE.x, y: LOW_WATER_STONE.y - 30 }, r: 80, label: 'The Low-Water Stone' },
        hint: 'Stand on the Low-Water Stone at the sea\'s edge',
      },
      {
        objective: { kind: 'prince', prince: 'ebb' },
        hint: 'Face Prince Ebb at the lighthouse-manor on the headland',
      },
    ],
    complete: [
      'He came down the tower on his own feet. He stood at the window for an hour, watching the tide not be called.',
      'Then he said: "Let it go where it likes, Hesper. I want to see where it likes." I think he meant it.',
      'Take the lamp-room purse; he never spent a coin of it. I\'ve kept a light for years. Now I can see by it.',
    ],
    reward: { orbs: 7, coins: 120 },
  },
];
