import type { QuestDef } from '../../../../IslesTypes';
import { SQUARE } from './area';
import { FISH_MUSKIE, FISH_TENCH } from './items';

/**
 * The War Court's five side quests.
 *
 * The last court before the House, so between them they show what the Draw costs at the end of
 * the line: a son kept in a trench because his Lot is in a box (Nan), a drum cadence that might be
 * the first proof the Wheel is rigged (Kit), a hot meal for the line and the busted behind the
 * wall (Dunne), an old mare whose number comes up every week (Maud), and finally the boy whose
 * number never does — Prince Banneret, Lot No. 1 (Aubade). Each is someone refusing to be a number.
 */
export const WAR_QUESTS: QuestDef[] = [
  // ── 1. Called Up — talk + duel ───────────────────────────────────────
  {
    id: 'war-q-called-up',
    area: 'war',
    name: 'Called Up',
    giver: 'war-nan',
    offer: [
      'My Tam. 0917. Drawn three Sundays running and marched up here, and he hasn\'t written once.',
      'He\'s in the line past the trench. They won\'t let mothers over the crossings. They\'d let you.',
      'Will you find him? Ask him what it would take to bring him home. He\'ll tell a stranger. Not me.',
    ],
    accept: [
      'The west crossing. Look for a boy with my chin and his father\'s ears. Thank you. Go.',
    ],
    stages: [
      {
        objective: {
          kind: 'talk', npc: 'war-tam',
          lines: [
            'Ma sent you? Course she did. Listen — the Provost-Marshal has my Lot. He takes every drawn lad\'s.',
            'He keeps them in a strongbox on his belt so we can\'t desert. No Lot, and you\'re nobody\'s number.',
            'Get mine back and I just… walk down the hill. Nobody can call a man with no number. He\'s coming now.',
          ],
        },
        hint: 'Find Tam Pellow in the line north of the trench, by the west crossing',
      },
      {
        objective: {
          kind: 'duel', area: 'war',
          foe: {
            id: 'war-q-called-up-duel',
            court: 'war',
            name: 'Nobody\'s Number',
            foeName: 'Provost-Marshal Strongbox',
            foeElement: 'metal',
            difficulty: 5,
            hpMult: 0.95,
            gimmick: '',
            at: { x: 720, y: 590 },
            look: { body: 0xb8a490, accent: 0x4a4c54, hat: 'helmet', traits: ['satchel', 'cane'], size: 1.25, eye: 0xd8dade },
            challenge: [
              'Talking to the drawn, stranger? The drawn talk to me. They hand me their Lots and they say "sir".',
              'Six hundred Lots on this belt. Six hundred lads who stay because a brass coin tells them to.',
              'You want 0917? Take it off me.',
            ],
            beaten: ['…There. It\'s in the mud. Pick it up. I didn\'t see it fall. I don\'t see a great many things.'],
            coins: 135,
          },
        },
        hint: 'Take Tam\'s Lot back from Provost-Marshal Strongbox',
      },
    ],
    complete: [
      'He came down the Muster Road with his coat open and no Lot at his throat, and nobody stopped him.',
      'He\'s nobody\'s number now. My boy. Nobody\'s. Here — it\'s what we saved for the re-draw. Never needed it.',
    ],
    reward: { orbs: 11, coins: 120 },
  },

  // ── 2. The Draw Cadence — collect + talk + duel ──────────────────────
  {
    id: 'war-q-cadence',
    area: 'war',
    name: 'The Draw Cadence',
    giver: 'war-kit',
    offer: [
      'The Drum-Major writes a new cadence for the Draw every week. We learn it off pages at the barracks doors.',
      'The crank-man never looks at the Wheel. He watches my sticks. When I play a double, he slows the crank.',
      'I think the drum tells him when to palm a ball. I think it spells numbers. Will you get me the pages?',
    ],
    accept: [
      'Four pages, one on each door — two on the top hut, one on each of the others. Don\'t let Tattoo see you.',
    ],
    stages: [
      {
        objective: {
          kind: 'collect', area: 'war', label: 'Page of the Draw cadence', emoji: '📜', color: 0xf0e6cc,
          spots: [{ x: 400, y: 1345 }, { x: 610, y: 1345 }, { x: 460, y: 1505 }, { x: 560, y: 1665 }],
        },
        hint: 'Take the 4 cadence pages pinned to the barracks doors',
      },
      {
        objective: {
          kind: 'talk', npc: 'war-quill',
          lines: [
            'A drum score. Doubles and rests… and every double falls on a beat the Wheel turns past a set ball.',
            'Week after week, the same favourites\' numbers are drummed — so the crank-man knows which to let slip.',
            'This is the first proof anyone has ever held. Oh. Oh dear. The Drum-Major has seen you holding it.',
          ],
        },
        hint: 'Show the pages to Registrar Quill Tally at the Drafting stage',
      },
      {
        objective: {
          kind: 'duel', area: 'war',
          foe: {
            id: 'war-q-cadence-duel',
            court: 'war',
            name: 'Rat-a-Tat',
            foeName: 'Drum-Major Tattoo',
            foeElement: 'sound',
            difficulty: 5,
            hpMult: 0.95,
            gimmick: 'war-conscription',
            at: { x: 1300, y: 1200 },
            look: { body: 0xd0a888, accent: 0xd8a83a, hat: 'shako', traits: ['beard', 'satchel'], size: 1.3, eye: 0xffe090 },
            challenge: [
              'That\'s my score, stranger. Every bar of it is mine. A drum-major\'s cadences are his own property.',
              'What they mean is between me and the crank. And the House. And the Wheel. Mostly the House.',
              'Give them back, or I\'ll beat the Muster on you and see whose side the drum calls.',
            ],
            beaten: ['…Keep them. I\'ve played that cadence nine years. I never once played it for myself.'],
            coins: 135,
          },
        },
        hint: 'Beat Drum-Major Tattoo at the Drafting Wheel before he takes the pages back',
      },
    ],
    complete: [
      'Tally copied them three times and locked the copies in three places. Proof! Real proof, in ink!',
      'I\'m going to play a new cadence on Sunday. My own. It doesn\'t spell anything. Here — Tally paid me for the pages.',
    ],
    reward: { orbs: 12, coins: 100 },
  },

  // ── 3. Trench Stew — fish + deliver + duel ───────────────────────────
  {
    id: 'war-q-trench-stew',
    area: 'war',
    name: 'Trench Stew',
    giver: 'war-dunne',
    offer: [
      'The line eats hard tack and the busted behind the wall eat what the House leaves. Neither\'s had hot in weeks.',
      'Old Hask cooks, when he\'s given anything to cook. He\'d carry a pot down the line and up the wall both.',
      'Catch three tench out of the sap for him? Iron rod. Brown water. They\'ll come to anything that sinks.',
    ],
    accept: [
      'Cast off the south bank. When the float goes under, reel steady. Then take them to Hask at the House step.',
    ],
    stages: [
      {
        objective: { kind: 'fish', fish: FISH_TENCH, count: 3 },
        hint: 'Catch 3 trench tench in the flooded sap',
      },
      {
        objective: {
          kind: 'deliver', npc: 'war-hask', item: FISH_TENCH, count: 3,
          lines: [
            'Tench. Three fat ones. For the line? And for the — for us? Behind the wall? Nobody brings us anything.',
            'I\'ll have a pot on by dusk. Ah. Here comes Captain Moil. He\'ll say the sap\'s rations are the House\'s.',
          ],
        },
        hint: 'Bring the 3 tench to Old Hask on the House step',
      },
      {
        objective: {
          kind: 'duel', area: 'war',
          foe: {
            id: 'war-q-trench-stew-duel',
            court: 'war',
            name: 'Ration Strength',
            foeName: 'Sapper-Captain Moil',
            foeElement: 'earth',
            difficulty: 5,
            hpMult: 0.9,
            gimmick: 'war-siege-line',
            at: { x: 1420, y: 300 },
            look: { body: 0xa88a6c, accent: 0x5c4834, hat: 'miner', traits: ['tool', 'beard'], size: 1.2, eye: 0xd8c09a },
            challenge: [
              'Every fish in that sap is rations. Rations are drawn from stores. Stores belong to the House.',
              'And the busted eat what the House leaves them. That is what busted means. Read the chip.',
              'Hand over the fish. Or stand out in the open and see where my engines think you are.',
            ],
            beaten: ['…Rations are issued to the line. The busted are… on the line. Technically. Cook your fish.'],
            coins: 135,
          },
        },
        hint: 'See off Sapper-Captain Moil on the House step',
      },
    ],
    complete: [
      'Hask carried the pot down the line and up the wall, and the lads sang, quietly. You don\'t sing loud here.',
      'He said to give you this — the muskie took his old whistle. He got the whistle back. You can have the fish.',
    ],
    reward: { orbs: 10, coins: 90, item: FISH_MUSKIE, itemCount: 1 },
  },

  // ── 4. Nutmeg's Number — collect + defeat ────────────────────────────
  {
    id: 'war-q-nutmeg',
    area: 'war',
    name: 'Nutmeg\'s Number',
    giver: 'war-maud',
    offer: [
      'The horses are drawn too. Nutmeg\'s nineteen. Her number comes up every Sunday. Every one.',
      'Lance rides her because she won\'t stop. She won\'t stop because she doesn\'t know how. I know how.',
      'She threw three shoes in the lanes this morning. Fetch them for me — then tell Lance she\'s done.',
    ],
    accept: [
      'In the lanes, both sides of the rail. And mind the rail, he takes it at a gallop.',
    ],
    stages: [
      {
        objective: {
          kind: 'collect', area: 'war', label: 'Nutmeg\'s cast shoe', emoji: '🧲', color: 0x80848e,
          spots: [{ x: 1700, y: 940 }, { x: 1990, y: 1042 }, { x: 2200, y: 940 }],
        },
        hint: 'Pick up Nutmeg\'s 3 cast shoes in the tilt-yard lanes',
      },
      {
        objective: { kind: 'defeat', encounter: 'war-tilt-yard' },
        hint: 'Unhorse Jouster Lance (Tilt Yard) so he\'ll let Nutmeg retire',
      },
    ],
    complete: [
      'She\'s in the end stall with no shoes on and her nose in the oats. Retired. Lance signed it himself.',
      'I\'ve cut the Lot off her bridle. Here — that\'s what the stable keeps for a lame horse. She isn\'t lame. Take it.',
    ],
    reward: { orbs: 11, coins: 110 },
  },

  // ── 5. Number One — talk + visit + prince ────────────────────────────
  {
    id: 'war-q-number-one',
    area: 'war',
    name: 'Number One',
    giver: 'war-aubade',
    requires: { courtReady: 'war' },
    offer: [
      'All five drill-masters. His Highness has called for his sabre and his good boots.',
      'Before I announce you, you should know who you are fighting. Philippa sewed his first banner. Ask her.',
      'And go and stand in the calling circle in the square. Every drawn lad on the hill has stood there once.',
    ],
    accept: [
      'Philippa by the parade ground, then the circle. Then the carpet. You may stand on it, this once.',
    ],
    stages: [
      {
        objective: {
          kind: 'talk', npc: 'war-philippa',
          lines: [
            'He wanted to be drawn. When he was eight he sat by the Wheel every Sunday waiting for No. 1.',
            'It never came. He asked his father why. The King laughed and said, "The Wheel loves you, little one."',
            'So he rides at the front of every charge, to prove he\'d have gone. And the drum sends boys to ride with him.',
          ],
        },
        hint: 'Ask Philippa Hem, the banner-maker, about the Prince as a boy',
      },
      {
        objective: { kind: 'visit', area: 'war', at: { x: SQUARE.x, y: SQUARE.y }, r: 60, label: 'The calling circle' },
        hint: 'Stand in the calling circle in the Drafting Square',
      },
      {
        objective: { kind: 'prince', prince: 'banneret' },
        hint: 'Face Prince Banneret at his pavilion',
      },
    ],
    complete: [
      'He has taken his Lot off. It is on the map table, on the square for the House. He keeps not looking at it.',
      'He said: "Number One was called." He said it to me, and smiled, and I have never seen him smile.',
      'The marshal\'s purse. He says the Muster is stood down, and a marshal with no muster needs no purse.',
    ],
    reward: { orbs: 13, coins: 220 },
  },
];

