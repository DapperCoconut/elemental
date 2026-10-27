import type { QuestDef } from '../../../../IslesTypes';
import { ENC_GUSHER } from './encounters';
import { NODDERS, PIERS, SEA_Y } from './areaArt';
import {
  NPC_BESSA, NPC_FENWICK, NPC_ILSE, NPC_NELL, NPC_OSSIE, NPC_PENNOCK, NPC_PRUETT,
  Q_CHOWDER, Q_LAMPS, Q_PUMPS, Q_RAINBOW, Q_TIDEMARK,
} from './npcs';

/**
 * Five small stories from Slickharbor: four lamps lit on the dark Black Row in defiance of the
 * snuffers; a chowder the tithe-barge wants its cut of; a family's keepsakes waded out of a house
 * left under; a fish that proves the Prince waters his own crude; and every pump in the Nodding
 * Field stopped at once, so that the Prince has to come down and look.
 */

const AREA = 'slickharbor';

export const SLICKHARBOR_QUESTS: QuestDef[] = [
  {
    id: Q_LAMPS, area: AREA, name: 'Lights on the Black Row', giver: NPC_PENNOCK,
    offer: [
      'Every night I twist wicks for the Queen\'s lamps and walk home past them to a dark house.',
      'The pump-jacks drip, dearie. A drop on every stroke, into the trays under the wellheads.',
      'Nobody counts drip. Four cans of it would light four windows on the Row for a week.',
      'It\'s still theft, they\'d say. Lamp-thieves get the snuffer. Will you fetch it for me anyway?',
    ],
    accept: [
      'The drip-cans hang under the pump-jacks in the Nodding Field, and there\'s one by the oil main.',
      'Don\'t let Pitch see you. He\'s not cruel, but he counts.',
    ],
    stages: [
      {
        objective: {
          kind: 'collect', area: AREA, label: 'Drip-can', emoji: '🛢️', color: 0x5a3c1e,
          spots: [
            { x: NODDERS[0].x - 70, y: NODDERS[0].y + 30 },
            { x: NODDERS[1].x - 90, y: NODDERS[1].y + 34 },
            { x: NODDERS[2].x - 70, y: NODDERS[2].y + 32 },
            { x: NODDERS[3].x - 80, y: NODDERS[3].y + 34 },
          ],
        },
        hint: 'Collect 4 drip-cans from under the pump-jacks',
      },
      {
        objective: {
          kind: 'talk', npc: NPC_PENNOCK,
          lines: [
            'Four cans! Oh, look at the colour on it. Pour, wick, light — there. And there. And there.',
            'Four windows on the Black Row, lit. Listen to them all coming out to look.',
            'Oh no. That bell. That\'s Dimmock, the lamp-warden, with his snuffer pole. He\'s seen.',
          ],
        },
        hint: 'Bring the drip-oil to Ma Pennock at the wick-house',
      },
      {
        objective: {
          kind: 'duel', area: AREA,
          foe: {
            id: 'slickharbor-black-row-lamps-duel',
            court: AREA,
            name: 'Lights Out',
            foeName: 'Lamp-Warden Dimmock',
            foeElement: 'silence',
            difficulty: 2,
            gimmick: '',
            at: { x: 160, y: 1268 },
            look: { body: 0xa89a8a, accent: 0x1a1a1e, hat: 'tophat', traits: ['cane', 'lantern'], size: 1.1, eye: 0xd8d8d8 },
            challenge: [
              'Unlicensed flame on the Black Row. Four counts. The Crown\'s light is for the Crown\'s road.',
              'Stand aside. I snuff lamps. I can snuff you just as quietly.',
            ],
            beaten: ['...Let them burn, then. The dark never needed me as much as I thought.'],
            coins: 50,
          },
        },
        hint: 'Stop Lamp-Warden Dimmock snuffing the Black Row\'s lamps (by the shanties)',
      },
    ],
    complete: [
      'Dimmock walked off with his snuffer over his shoulder like a fishing pole. Didn\'t look back.',
      'Four windows, lit. Children reading by them. I twisted those wicks for the Queen. Now they\'re ours.',
    ],
    reward: { orbs: 4, coins: 45 },
  },
  {
    id: Q_CHOWDER, area: AREA, name: 'Chowder for the Night Gang', giver: NPC_BESSA,
    offer: [
      'The night gang come off the tanker at dawn with nothing in them but crude fumes.',
      'I\'d make them a chowder — a proper one, catfish and biscuit — but the tithe-barge takes my fish.',
      'Bring me three tar catfish out of the Slick. Bottom-feeders. They taste of oil and they\'re lovely.',
    ],
    accept: [
      'Fenwick on the west jetty knows where they lie. Iron rod, mind. The Slick eats wood.',
    ],
    stages: [
      {
        objective: { kind: 'fish', fish: 'fish-tar-catfish', count: 3 },
        hint: 'Catch 3 Tar Catfish in the Slick',
      },
      {
        objective: {
          kind: 'deliver', npc: NPC_BESSA, item: 'fish-tar-catfish', count: 3,
          lines: [
            'Three! And fat! Into the pot, the lot of you, whiskers and all.',
            'Oh, stars. Bargemaster Tolle\'s on the oil jetty already, sniffing. He\'ll want one in three.',
            'One in three of three is one, and one is the difference between chowder and soup. Stop him?',
          ],
        },
        hint: 'Bring the catfish to Bessa at the Bilge & Biscuit',
      },
      {
        objective: {
          kind: 'duel', area: AREA,
          foe: {
            id: 'slickharbor-catfish-chowder-duel',
            court: AREA,
            name: 'One in Three',
            foeName: 'Bargemaster Tolle',
            foeElement: 'water',
            difficulty: 3,
            gimmick: '',
            at: { x: PIERS[1].x + PIERS[1].w / 2, y: SEA_Y + 140 },
            look: { body: 0x9ab0b8, accent: 0x1e3a4a, hat: 'souwester', traits: ['book', 'beard'], size: 1.2 },
            challenge: [
              'Fish out of royal water owe the royal barge. One in three, landed or cooked, no exceptions.',
              'Hand over the catfish or go in after it. The tide answers to my Queen, and so do I.',
            ],
            beaten: ['Entered as... lost overboard. She can keep her chowder. My barge is half sunk anyway.'],
            coins: 55,
          },
        },
        hint: 'See off Bargemaster Tolle on the oil jetty',
      },
    ],
    complete: [
      'Tolle went back to his barge without a single fish. I watched him from the hatch. Lovely sight.',
      'The night gang ate standing up and then sat down and slept on my floor. I let them. Here — for you.',
    ],
    reward: { orbs: 3, coins: 40 },
  },
  {
    id: Q_TIDEMARK, area: AREA, name: 'Under the Tidemark', giver: NPC_NELL,
    offer: [
      'At low water the Row comes up to the knee. Things wash out of the houses left under. Our things.',
      'Tibby\'s been wading for them. She thinks I don\'t know. She\'s six.',
      'Three things I\'d give my eyes for: his photograph, the baby\'s bell, and her first shoes.',
      'Will you look for them? A grown body, so my girl stops going in.',
    ],
    accept: [
      'Along the Row and the quay edge, where the tide leaves its rubbish. Look for anything that isn\'t black.',
    ],
    stages: [
      {
        objective: {
          kind: 'collect', area: AREA, label: 'Keepsake', emoji: '🧸', color: 0xd8c8a8,
          spots: [{ x: 110, y: 1306 }, { x: 268, y: 1312 }, { x: 290, y: 1104 }],
        },
        hint: 'Find 3 of the Gallons\' keepsakes along the Black Row at low water',
      },
      {
        objective: {
          kind: 'talk', npc: NPC_NELL,
          lines: [
            'His photograph. It\'s black at the edges, but it\'s his face. And the bell — listen, it still rings.',
            'Her shoes. Oh, they were so small. Thank you. Thank you, thank you.',
            'Wait — that\'s Bailiff Cask, coming down the quay. He tallies what washes up as Crown salvage.',
          ],
        },
        hint: 'Bring the keepsakes back to Nell Gallon',
      },
      {
        objective: {
          kind: 'duel', area: AREA,
          foe: {
            id: 'slickharbor-under-the-tidemark-duel',
            court: AREA,
            name: 'Crown Salvage',
            foeName: 'Bailiff Cask',
            foeElement: 'fortune',
            difficulty: 3,
            gimmick: '',
            at: { x: 505, y: 1282 },
            look: { body: 0xd8b898, accent: 0x5a4a1a, hat: 'tophat', traits: ['book', 'satchel'], size: 1.15 },
            challenge: [
              'Anything recovered from a house left under is ballast for the Crown. Photographs included.',
              'I\'ll take the bell, the shoes and the face. Then I\'ll take the fine for wading.',
            ],
            beaten: ['Salvage... unrecoverable. Write it how you like. I\'m not coming down the Row again.'],
            coins: 55,
          },
        },
        hint: 'Stop Bailiff Cask claiming the keepsakes as Crown salvage (on the quay)',
      },
    ],
    complete: [
      'Cask ran so fast he left his hat on the quay. Tibby\'s wearing it. It comes down to her chin.',
      'It isn\'t a house. But it\'s what was in it, and that was the part that mattered. Take this.',
    ],
    reward: { orbs: 5, coins: 30 },
  },
  {
    id: Q_RAINBOW, area: AREA, name: 'The Rainbow Proof', giver: NPC_ILSE,
    offer: [
      'Every household fined for short weight has been fined by my readings. My readings are honest.',
      'But the Prince\'s own wells read thinner and thinner — as if his crude is being cut with sea.',
      'There\'s a fish for it. A rainbow shiner only shows its colours in pure crude. In watered oil, grey.',
      'Catch me one out of the Slick, by the oil jetty where his wells empty. Then we\'ll see.',
    ],
    accept: [
      'Shiners swim up top, under the skin. Shy. Fenwick says they bite best when you hold very still.',
    ],
    stages: [
      {
        objective: { kind: 'fish', fish: 'fish-rainbow-shiner', count: 1 },
        hint: 'Catch a Rainbow Shiner in the Slick',
      },
      {
        objective: {
          kind: 'talk', npc: NPC_PRUETT,
          lines: [
            'A shiner? Grey as a ledger, poor thing. Grey means watered. Watered means... oh dear.',
            'The Prince\'s barrels are cut with sea and weighed full. The households\' are pure and fined short.',
            'The well logs would prove it. Riggerman Pitch keeps them on his belt. He won\'t give them up nicely.',
          ],
        },
        hint: 'Show the grey shiner to Pruett Ledgersby at the Barrel Tithe',
      },
      {
        objective: { kind: 'defeat', encounter: ENC_GUSHER },
        hint: 'Beat Riggerman Pitch in the Nodding Field for the well logs',
      },
    ],
    complete: [
      'Pitch\'s logbook. "Two parts crude, one part harbour — for the Royal Lamps." In his own hand.',
      'Every family fined short weight was carrying honest oil. I\'ll have the fines reversed if it kills me.',
    ],
    reward: { orbs: 5, coins: 50 },
  },
  {
    id: Q_PUMPS, area: AREA, name: 'Still the Pumps', giver: NPC_OSSIE,
    requires: { questDone: Q_LAMPS },
    offer: [
      'Ma Pennock\'s lamps got people talking. Talking\'s dangerous. Talking\'s how you get a plan.',
      'Here\'s the plan. Every pump in the field has a brake. If all six brakes went on at once —',
      'the Queen\'s lamps would starve by morning, and the Prince would have to come down out of his tank.',
      'Fenwick knows where the master shut-off is. He dived the main when they laid it. Ask him.',
    ],
    accept: [
      'Fenwick\'s on the west jetty. Then the brakes. Then — well. Then we see what a prince looks like close up.',
    ],
    stages: [
      {
        objective: {
          kind: 'talk', npc: NPC_FENWICK,
          lines: [
            'The master shut-off? Under the oil jetty head, on the last pile. A red wheel the size of a cartwheel.',
            'Close it and every pump-jack feels it in the rods. They\'ll nod once more and stop.',
            'Mind you, he\'ll know. The moment that field goes quiet, Crude will know.',
          ],
        },
        hint: 'Ask Fenwick Reed on the west jetty about the master shut-off',
      },
      {
        objective: {
          kind: 'visit', area: AREA, at: { x: PIERS[1].x + PIERS[1].w / 2, y: SEA_Y + 236 }, r: 70,
          label: 'Master shut-off',
        },
        hint: 'Close the master shut-off at the end of the oil jetty',
      },
      {
        objective: { kind: 'prince', prince: 'crude' },
        hint: 'The Nodding Field has stopped. Face Prince Crude at the Lamphouse Hall',
      },
    ],
    complete: [
      'Six pumps stopped and the whole Field cheered loud enough to rattle the tanks. He came down. You met him.',
      'Slickharbor\'s pumping for itself now. Daylight hours. Our lamps first. Thank you, dry-foot.',
    ],
    reward: { orbs: 7, coins: 90 },
  },
];
