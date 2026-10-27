import type { QuestDef } from '../../../../IslesTypes';
import { ENC_FULL_SAIL, ENC_LOOM } from './encounters';
import { FISH_BASS, FISH_GAR } from './items';

/**
 * The Sailmaker's five side stories. Each is a small life under the Yardage — a yard of sailcloth
 * owed per head per day: a girl whose family is one yard short and one brother from the looms;
 * the bound weavers whose indentures are wound on spindles in the Loom House; a netmender feeding
 * the families whose cove cottages were left under; a shipwright secretly building a boat for
 * them out of the Queen's offcuts; and — once Hem is down — a widow who sews the drowned into
 * their shrouds properly, last stitch and all.
 */

export const NPC = {
  selvedge: 'sailmaker-selvedge',
  oakum: 'sailmaker-oakum',
  linnet: 'sailmaker-linnet',
  ludda: 'sailmaker-ludda',
  purl: 'sailmaker-purl',
  kell: 'sailmaker-kell',
  tam: 'sailmaker-tam',
  bight: 'sailmaker-bight',
  bodkin: 'sailmaker-bodkin',
} as const;

export const Q_YARD = 'sailmaker-a-yard-a-head';
export const Q_BOLT = 'sailmaker-bound-to-the-bolt';
export const Q_COVE = 'sailmaker-what-the-cove-keeps';
export const Q_BOAT = 'sailmaker-second-chance';
export const Q_SHROUD = 'sailmaker-the-last-stitch';

/** The Warp family's cottage (Linnet's) — the area paints a chalked tally on its door. */
export const WARP_COTTAGE = { x: 1420, y: 470 };

export const SAILMAKER_QUESTS: QuestDef[] = [
  {
    id: Q_YARD, area: 'sailmaker', name: 'A Yard a Head', giver: NPC.linnet,
    offer: [
      'There\'s four of us in our house. That\'s four yards a day at the Yardstick. Mam sews, Da sews, I sew.',
      'We made three. Three and a bit. The Measurers don\'t take bits.',
      'If we\'re short tomorrow they bind somebody to the bolt. They always pick the littlest. That\'s Pip.',
      'The lofts throw out offcuts along Loft Row. If I had enough, Loftmaster Oakum could seam them into a yard...',
    ],
    accept: [
      'Five should make it! Big ones — the size of a tablecloth. They\'re all along the Row, in the gutters.',
      'Measurer Bodkin calls the Yardage at dusk. We\'ve got till then. I think.',
    ],
    stages: [
      {
        objective: {
          kind: 'collect', area: 'sailmaker', label: 'sailcloth offcut', emoji: '🏳️', color: 0xece3cc,
          spots: [{ x: 1090, y: 834 }, { x: 980, y: 852 }, { x: 880, y: 870 }, { x: 760, y: 886 }, { x: 680, y: 902 }],
        },
        hint: 'Gather 5 sailcloth offcuts from the gutters of Loft Row',
      },
      {
        objective: {
          kind: 'talk', npc: NPC.oakum, lines: [
            'Offcuts? Off MY row? Hm. Good canvas, this. Number two duck. Somebody\'s wasteful.',
            'The Warp girl\'s yard, is it. Give it here. Flat seam, two rows, sixty stitches to the foot.',
            'There. A yard and a hand over. If Bodkin finds that short, I\'ll eat my palm.',
          ],
        },
        hint: 'Have Loftmaster Oakum seam the offcuts into a yard',
      },
      {
        objective: { kind: 'visit', area: 'sailmaker', at: { x: 1300, y: 856 }, r: 60, label: 'The Yardstick' },
        hint: 'Take the yard to the Yardstick to be measured',
      },
      {
        objective: {
          kind: 'duel', area: 'sailmaker',
          foe: {
            id: 'sailmaker-yard-a-head-duel', court: 'sailmaker', name: 'Short Measure',
            foeName: 'Tithe-Clerk Ell', foeElement: 'paper', difficulty: 2, gimmick: '',
            at: { x: 1384, y: 756 },
            look: { body: 0xe8e0d0, accent: 0x2a8a88, hat: 'tophat', traits: ['book', 'glasses'], size: 1.0 },
            challenge: [
              'A yard is thirty-six inches. An ell is forty-five. The Prince measures the Yardage in ells. Did nobody say?',
              'So this is short. The Warp household is short. Somebody walks to the Loom House at dawn. Stand aside.',
            ],
            beaten: ['Fine. FINE. A yard is... a yard. I shall amend the ledger. Amending is not the same as being wrong.'],
            coins: 55,
          },
        },
        hint: 'Stand up to Tithe-Clerk Ell at the Yardstick',
      },
    ],
    complete: [
      'You did it! Ell wrote "PAID" in the book and his hand shook the whole time!',
      'Pip doesn\'t know. Pip thinks he\'s just going to bed. That\'s the best bit.',
    ],
    reward: { orbs: 3, coins: 50 },
  },

  {
    id: Q_BOLT, area: 'sailmaker', name: 'Bound to the Bolt', giver: NPC.ludda,
    offer: [
      'Every weaver bound to that loom has an indenture. You know where they keep them? Wound on spindles.',
      'Your debt, in thread, on a spindle, in a rack by the great loom. Snap the spindle, they say, and you\'re free.',
      'Shuttle guards the loom. She built it. She\'d sooner lose a hand than a pick.',
      'Get past her. Bring me the spindles. I\'ll do the snapping.',
    ],
    accept: [
      'She works the Loom House door. Bring a strong stomach — the shuttle doesn\'t slow down for anybody.',
    ],
    stages: [
      { objective: { kind: 'defeat', encounter: ENC_LOOM }, hint: 'Defeat Weaver Shuttle at the Loom House' },
      {
        objective: {
          kind: 'collect', area: 'sailmaker', label: 'indenture spindle', emoji: '🧵', color: 0xc8323a,
          spots: [{ x: 1622, y: 578 }, { x: 1704, y: 628 }, { x: 1884, y: 582 }, { x: 1962, y: 632 }],
        },
        hint: 'Carry out 4 indenture spindles from the Loom House yard',
      },
      {
        objective: {
          kind: 'talk', npc: NPC.ludda, lines: [
            'Four. Four whole families. Give them here — there. Hear that? That\'s a debt snapping.',
            'The Bond-Warden will have heard it too. Gyve keeps the bound in line. He\'ll come for whoever snapped them.',
            'That\'s me. But it\'s you he\'ll find first, standing there looking pleased with yourself.',
          ],
        },
        hint: 'Bring the spindles to Ludda Breakshuttle',
      },
      {
        objective: {
          kind: 'duel', area: 'sailmaker',
          foe: {
            id: 'sailmaker-bound-to-the-bolt-duel', court: 'sailmaker', name: 'The Bond-Warden',
            foeName: 'Bond-Warden Gyve', foeElement: 'bind', difficulty: 3, gimmick: '',
            at: { x: 1900, y: 664 },
            look: { body: 0x9a9aa8, accent: 0x2a2a3a, hat: 'helmet', traits: ['cane', 'eyepatch'], size: 1.2 },
            challenge: [
              'Someone has been snapping spindles. Indentures are not thread, stranger. They are law.',
              'Every bound weaver on this cliff signed with their own hand. I will bind yours to the bolt as well.',
            ],
            beaten: ['The bonds are... loose. All of them. I can feel it. I have never felt that before.'],
            coins: 55,
          },
        },
        hint: 'Face Bond-Warden Gyve outside the Loom House',
      },
    ],
    complete: [
      'Four families walked out of the Loom House this evening and nobody stopped them. Nobody!',
      'Shuttle watched them go. Didn\'t say a word. I think she counted them. I think she was glad.',
    ],
    reward: { orbs: 5, coins: 40 },
  },

  {
    id: Q_COVE, area: 'sailmaker', name: 'What the Cove Keeps', giver: NPC.purl,
    offer: [
      'See them roofs out in the cove? That was Lowstitch. Forty houses. The tide came in and the tithe didn\'t.',
      'The families sleep in the loft attics now, on the sail-bales. Nobody feeds them. The Prince says they\'re idle.',
      'Bass run in the cove of an evening. Rope-gar under the old roofs. I\'m too slow on the rod these days.',
      'Catch me a few, would you, dear? And the gar — I need its spine. Best netting needle there is.',
    ],
    accept: [
      'Three bass, one gar. Cast from the jetty. Mind the roofs — the lines snag on the chimneys.',
    ],
    stages: [
      { objective: { kind: 'fish', fish: FISH_BASS, count: 3 }, hint: 'Catch 3 sailfin bass in Lowstitch Cove' },
      { objective: { kind: 'fish', fish: FISH_GAR, count: 1 }, hint: 'Catch a rope-gar under the drowned roofs' },
      {
        objective: {
          kind: 'talk', npc: NPC.purl, lines: [
            'Oh, that\'s a fat one. That\'s supper for the whole Mallow attic. And the gar — look at that spine.',
            'Here comes trouble, though. That\'s the tithe-skiff, rowing in. Sluice comes for Lowstitch\'s Dry Tithe still.',
            'Says the houses are only resting. Says a coin a head and he\'ll give them back. He never gives anything back.',
          ],
        },
        hint: 'Bring the catch to Granny Purl on the jetty',
      },
      {
        objective: {
          kind: 'duel', area: 'sailmaker',
          foe: {
            id: 'sailmaker-lowstitch-duel', court: 'sailmaker', name: 'The Dry Tithe',
            foeName: 'Tithe-Boatman Sluice', foeElement: 'water', difficulty: 3, gimmick: '',
            at: { x: 526, y: 1296 },
            look: { body: 0x7a9aa8, accent: 0x13484a, hat: 'souwester', traits: ['rod', 'satchel'], size: 1.15 },
            challenge: [
              'Lowstitch is behind on its Dry Tithe. Forty houses. A coin a head. The Queen is very patient.',
              'Those fish are the cove\'s, and the cove is the Queen\'s. I\'ll take them as part payment. And you as the rest.',
            ],
            beaten: ['Keep your fish. The tide can collect its own tithe. I\'m rowing home.'],
            coins: 55,
          },
        },
        hint: 'See Tithe-Boatman Sluice off the beach',
      },
    ],
    complete: [
      'He rowed off without a single coin! Forty houses\' worth of tithe and not one coin.',
      'The Mallows ate tonight. So did the Pruetts. Take this, dear. Netmender\'s thanks.',
    ],
    reward: { orbs: 4, coins: 45 },
  },

  {
    id: Q_BOAT, area: 'sailmaker', name: 'The Second Chance', giver: NPC.kell,
    offer: [
      'Three hulls on the ways for the Queen. And one more you can\'t see — in my head, and in the offcut pile.',
      'A boat. A proper one, to get the Lowstitch families off this cliff. I\'ve been building her from scraps.',
      'She needs deadeyes for her shrouds and a sail that\'ll take the weather. I can\'t sew one under Hem\'s eye.',
      'But Gale\'s got the best sail on the cliff up on Wind Bluff. If you beat her for it, it\'s spoils, isn\'t it?',
    ],
    accept: [
      'Deadeyes first — the Measurers chuck the cracked ones off the slipways. Four of them. Then the sail.',
      'Tops\'l Tam can rig her. He\'s small, but he can climb anything.',
    ],
    stages: [
      {
        objective: {
          kind: 'collect', area: 'sailmaker', label: 'deadeye', emoji: '🪵', color: 0x8a6a4a,
          spots: [{ x: 1610, y: 1222 }, { x: 1628, y: 1290 }, { x: 1904, y: 1300 }, { x: 2200, y: 1292 }],
        },
        hint: 'Find 4 cast-off deadeyes on the slipways',
      },
      { objective: { kind: 'defeat', encounter: ENC_FULL_SAIL }, hint: 'Win Sailwright Gale\'s test sail on Wind Bluff' },
      {
        objective: {
          kind: 'talk', npc: NPC.tam, lines: [
            'Kell\'s boat? The secret one? I KNEW it was a boat. Nobody hides a shed that big for nothing.',
            'Gale\'s sail — wow. That\'s a lot of canvas. I can rig that. I can rig anything. Give me till dark.',
            'Only — Snip\'s been sniffing round the slipways with his shears. He counts every inch of the Queen\'s cloth.',
          ],
        },
        hint: 'Ask Tops\'l Tam to rig the Second Chance',
      },
      {
        objective: {
          kind: 'duel', area: 'sailmaker',
          foe: {
            id: 'sailmaker-second-chance-duel', court: 'sailmaker', name: 'Unlicensed Yardage',
            foeName: 'Shearmaster Snip', foeElement: 'metal', difficulty: 3, gimmick: 'sailmaker-drying-lines',
            at: { x: 1906, y: 1212 },
            look: { body: 0xb8b0a8, accent: 0x5a5a62, hat: 'cap', traits: ['tool', 'apron'], size: 1.05 },
            challenge: [
              'Eight yards of tanned canvas, unaccounted for. On a hull that isn\'t on the Prince\'s books.',
              'I cut the rations of anyone who wastes the Queen\'s cloth. I can cut a sail off a mast just as fast.',
            ],
            beaten: ['My shears... notched. On a peg-line. I\'ll put it down to wind damage. Nobody checks wind damage.'],
            coins: 55,
          },
        },
        hint: 'Keep Shearmaster Snip off the Second Chance',
      },
    ],
    complete: [
      'She\'s rigged. She\'s ready. The Second Chance — fourteen families, if they squeeze, and they will.',
      'Not yet. When the tide\'s right. When the Prince is looking the other way. But she\'s ready. Thank you.',
    ],
    reward: { orbs: 5, coins: 60 },
  },

  {
    id: Q_SHROUD, area: 'sailmaker', name: 'The Last Stitch', giver: NPC.bight,
    requires: { prince: 'hem' },
    offer: [
      'When a sailor dies at sea, his mates sew him into his hammock. The last stitch goes through the nose.',
      'It\'s to be sure. And it\'s so he stays down. Hem\'s men sewed the cove\'s drowned without it, for the Queen.',
      'She wanted them sleeping, not dead. Ballast, she calls them. Now he\'s gone, the shrouds wash up — stirring.',
      'Gather what\'s come ashore. I\'ll finish them. Properly. But I\'ll want someone by me when I do.',
    ],
    accept: [
      'Shroud ends — scraps of hammock canvas, still sewn. All along the beach. Five, at least.',
    ],
    stages: [
      {
        objective: {
          kind: 'collect', area: 'sailmaker', label: 'shroud end', emoji: '🪢', color: 0xc9bc98,
          spots: [{ x: 118, y: 1300 }, { x: 296, y: 1312 }, { x: 384, y: 1272 }, { x: 566, y: 1304 }, { x: 640, y: 1284 }],
        },
        hint: 'Gather 5 shroud ends washed up on Lowstitch beach',
      },
      {
        objective: {
          kind: 'talk', npc: NPC.oakum, lines: [
            'Shroud work. Bight\'s asked you to fetch my palm, has she. She\'s right to — mine\'s the oldest on the cliff.',
            'I sewed thirty men into their hammocks in the old navy. Never once skipped the last stitch. Never.',
            'Take it. And the twine — tarred, three-ply. Tell her to sew it the old way, and tell her I said so.',
          ],
        },
        hint: 'Borrow Loftmaster Oakum\'s old palm and twine',
      },
      {
        objective: {
          kind: 'duel', area: 'sailmaker',
          foe: {
            id: 'sailmaker-last-stitch-duel', court: 'sailmaker', name: 'Unshrouded',
            foeName: 'The Unshrouded', foeElement: 'soul', difficulty: 3, gimmick: '',
            at: { x: 604, y: 1292 },
            look: { body: 0xd8d8e0, accent: 0xc9bc98, hat: 'hood', traits: ['bandage'], size: 1.1, eye: 0x9ad8e8 },
            challenge: [
              '...cold. So cold, under the roofs. She said we were only resting. She said the tithe would buy us back.',
              'Do not sew me shut. I have not finished being drowned. I have not FINISHED.',
            ],
            beaten: ['...oh. It is done, then. Tell the widow it was a neat stitch. Tell her... thank you.'],
            coins: 55,
          },
        },
        hint: 'Stand by Widow Bight while she sews the last shroud',
      },
    ],
    complete: [
      'There. Every one of them sewn, nose and all. They\'ll lie quiet now. Truly quiet.',
      'The Queen\'s still got thousands more under the maelstrom. But not these. Not ours.',
    ],
    reward: { orbs: 7, coins: 70 },
  },
];
