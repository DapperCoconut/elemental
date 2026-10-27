import type { QuestDef } from '../../../../IslesTypes';
import { PLASMA, SUN } from './palette';
import { OBS_NE, STONE_RING } from './layout';

/**
 * Five small stories on the plateau. Each is about the light — who gets it, who was burned by it,
 * and the one thing the captive sun took that nobody can meter back: night.
 */
export const CORONA_QUESTS: QuestDef[] = [
  {
    id: 'corona-cold-mirror',
    area: 'corona',
    name: 'Cold Hearth, Cold Mirror',
    giver: 'corona-calla',
    offer: [
      'The clerks turned my mirror to the ground when my hearth went cold. Then they cracked the face, to be sure.',
      'Sun-bright glass, the kind that forms in the lee of the standing stones, would make a new face.',
      'And then someone would have to make Dimm sign the correction. He won\'t. But someone would have to.',
    ],
    accept: [
      'Look by the lone stones out on the glass — the bright bits pool in their shadows. Four should do.',
    ],
    stages: [
      {
        objective: {
          kind: 'collect', area: 'corona', label: 'Sun-bright glass', emoji: '✨', color: SUN,
          spots: [{ x: 520, y: 610 }, { x: 1000, y: 1130 }, { x: 1640, y: 790 }, { x: 2130, y: 1400 }],
        },
        hint: 'Gather 4 pieces of sun-bright glass from beside the lone standing stones',
      },
      {
        objective: {
          kind: 'talk', npc: 'corona-dimm', lines: [
            'A correction? For household sixty-one? Her hearth is cold. It is written down. It is—',
            '...She lost her husband and the clerks cracked her mirror for it. Is that written down?',
            'No. No, it is not. Give me the pen. Before I think about it.',
            'Hurry, though. Assessor Grell cracked that mirror. He will be on the lower lane, and he hates a correction.',
          ],
        },
        hint: 'Make Meter-Clerk Dimm sign the correction on the plaza',
      },
      {
        objective: {
          kind: 'duel', area: 'corona',
          foe: {
            id: 'corona-cold-mirror-duel',
            court: 'corona',
            name: 'Cracked Face',
            foeName: 'Assessor Grell',
            foeElement: 'metal',
            difficulty: 3,
            gimmick: '',
            at: { x: 900, y: 1400 },
            look: { body: 0x8a8a96, accent: 0x2a2630, hat: 'tophat', traits: ['book', 'tool'], eye: 0xd8d8e0 },
            challenge: [
              'A correction? Signed by Dimm? Dimm signs what I put in front of him.',
              'Household sixty-one is cold. I cracked that mirror myself, and I brought the hammer back for the new one.',
            ],
            beaten: ['Fine. Sixty-one is warm. I will need a new form for that. I will need a lie-down.'],
            coins: 55,
          },
        },
        hint: 'Stop Assessor Grell from cracking Calla\'s new mirror (lower lane, west of her cottage)',
      },
    ],
    complete: [
      'Dimm signed, and Grell went home with his hammer in two pieces? ...Help me fit the glass. There. Turn it.',
      'Oh. Oh, that is warm. I had forgotten the kitchen could be this colour.',
    ],
    reward: { orbs: 3, coins: 40 },
  },
  {
    id: 'corona-blind-hesper',
    area: 'corona',
    name: 'Colour on the Palm',
    giver: 'corona-hesper',
    offer: [
      'Sunwarden Helia walks a little sun about on a leash. Hers is a cutting from the big one — same light, smaller.',
      'Beat her and she will let you near the glass pool without her clerks. The sunscales there hold light for days.',
      'Bring me one. If I hold it, I think I will feel what colour it is. I would like to know one colour again.',
    ],
    accept: ['Helia is on the plaza under the cage. Be careful in the warm band — it makes everyone hit harder.'],
    stages: [
      { objective: { kind: 'defeat', encounter: 'corona-captive-sun' }, hint: 'Beat Sunwarden Helia in the Captive Sun' },
      { objective: { kind: 'fish', fish: 'fish-sunscale', count: 1 }, hint: 'Land a sunscale in the glass pool' },
      {
        objective: {
          kind: 'duel', area: 'corona',
          foe: {
            id: 'corona-blind-hesper-duel',
            court: 'corona',
            name: 'Metered Catch',
            foeName: 'Pool-Clerk Facet',
            foeElement: 'crystal',
            difficulty: 3,
            gimmick: '',
            at: { x: 840, y: 1300 },
            look: { body: 0xc8e8f0, accent: 0x3d5a58, hat: 'cap', traits: ['book', 'glasses'], eye: 0xf4fff8 },
            challenge: [
              'A sunscale holds three days of light. Light is metered. That fish belongs in my ledger, not your pocket.',
              'Helia let you near the pool. She did not let you leave with it.',
            ],
            beaten: ['Keep the fish. I will write it down as "lost to evaporation". Everyone does.'],
            coins: 55,
          },
        },
        hint: 'Keep the sunscale from Pool-Clerk Facet (east bank of the glass pool)',
      },
    ],
    complete: [
      'You fought a clerk for it? Oh, it is heavy. And warm all through. Let me — hush — let me hold it.',
      'Gold. Not yellow. Gold, with red at the gills. I remember. I remember gold.',
      'Forty years of charting and the last colour I will ever see is a fish. I find that I do not mind at all.',
      'Take these. Orbs, the old astronomers called them — little captured suns. They suit you better than me.',
    ],
    reward: { orbs: 4 },
  },
  {
    id: 'corona-fuse-run',
    area: 'corona',
    name: 'Ampere\'s Schedule',
    giver: 'corona-galvana',
    offer: [
      'Someone pulled four fuses off my pylons and re-routed the arcs across the town lanes. On a schedule.',
      'It is Ampere. It is always Ampere. The Prince told him the town needs "fencing in at the busy hours".',
      'Fetch the fuses — they will be lying near the pylon bases — and then go and argue with him. With your fists.',
    ],
    accept: ['Spent fuses glow violet. Do not pick them up with wet hands. Do not pick them up with your mouth.'],
    stages: [
      {
        objective: {
          kind: 'collect', area: 'corona', label: 'Pulled arc-fuse', emoji: '🔩', color: PLASMA,
          spots: [{ x: 1610, y: 590 }, { x: 1860, y: 570 }, { x: 2050, y: 630 }, { x: 1450, y: 1240 }],
        },
        hint: 'Find 4 pulled arc-fuses near the pylon bases',
      },
      { objective: { kind: 'defeat', encounter: 'corona-arc-pylons' }, hint: 'Talk Pylon-Keeper Ampere out of his schedule' },
    ],
    complete: [
      'All four! And Ampere came round an hour ago, very quiet, and asked if he could help re-seat them.',
      'I said yes. I am not a monster. I did make him do the high ones.',
    ],
    reward: { orbs: 3, coins: 60 },
  },
  {
    id: 'corona-q7',
    area: 'corona',
    name: 'Specimen Q-7',
    giver: 'corona-fenwick',
    offer: [
      'Q-7 breached again. It does that when it is frightened. It is frightened when it is... awake.',
      'I need it calmed, and I need someone to look in the vault behind the west observatory. I cannot go in.',
      'There is a label on the tank. Under the label there is another label. I have never had the nerve to peel it.',
    ],
    accept: ['Drive it onto the brass plates when it gets bright. The plates drink the nova. I designed them. Badly.'],
    stages: [
      { objective: { kind: 'defeat', encounter: 'corona-containment-breach' }, hint: 'Calm Specimen Q-7 outside the containment vault' },
      {
        objective: { kind: 'visit', area: 'corona', at: { x: 700, y: 452 }, r: 70, label: 'The containment vault' },
        hint: 'Look at the vault hatch behind the west observatory',
      },
      {
        objective: {
          kind: 'talk', npc: 'corona-hesper', lines: [
            '"Q. Seward, Lamplighter." Quentin? Quentin Seward lit my observatory lamps for twenty years.',
            'He went missing the summer the sun was caged. We thought he walked off the rim. We thought — oh, Quentin.',
            'Someone has been standing on the path all this while, very quiet. Go round her. Tell Fenwick.',
          ],
        },
        hint: 'Ask Old Hesper about the name under the label',
      },
      {
        objective: {
          kind: 'duel', area: 'corona',
          foe: {
            id: 'corona-q7-duel',
            court: 'corona',
            name: 'Under the Label',
            foeName: 'Vault-Warden Hush',
            foeElement: 'silence',
            difficulty: 4,
            gimmick: '',
            at: { x: 620, y: 560 },
            look: { body: 0x4a4458, accent: 0x1a1226, hat: 'veil', traits: ['lantern', 'brand'], eye: 0xb36bff },
            challenge: [
              'You peeled the label. The Prince keeps two labels for a reason. One is for people like you.',
              'Quentin Seward walked off the rim. That is what is written. You will not be carrying a different name to Fenwick.',
            ],
            beaten: ['Say the name, then. Say it loud. I was only ever paid to keep it quiet.'],
            coins: 55,
          },
        },
        hint: 'Get past Vault-Warden Hush on the path to Doctor Fenwick',
      },
    ],
    complete: [
      'Quentin Seward. A lamplighter. And the warden tried to stop you saying it. The Prince wanted someone who understood light.',
      'I helped. I helped.',
      'I am going to open the tank. Properly. Tonight — or whatever passes for tonight here. Thank you. Truly.',
    ],
    reward: { orbs: 5 },
  },
  {
    id: 'corona-first-night',
    area: 'corona',
    name: 'The First Night',
    giver: 'corona-umbrel',
    requires: { encounter: 'corona-flare-weather' },
    offer: [
      'There are children in this town who have never seen a night. Not one. They think stars are a story I tell.',
      'The cage that holds the sun opens from the inside. Only the Prince has the key. Only the Prince ever will.',
      'First, find Hesper\'s old star charts in the north-east observatory. I want to show them what to look for.',
    ],
    accept: ['Quietly, friend. We have kept the dark a long time. We can keep it a little longer.'],
    stages: [
      {
        objective: { kind: 'visit', area: 'corona', at: { x: OBS_NE.x, y: OBS_NE.y + 118 }, r: 80, label: 'North-east observatory' },
        hint: 'Search the north-east observatory for Hesper\'s star charts',
      },
      {
        objective: {
          kind: 'talk', npc: 'corona-hesper', lines: [
            'My charts! I thought he burned them. Unroll it — no, the other way. Put my finger on... there.',
            'That is the Kettle. Seven stars. Tell the children to find the Kettle first, and the rest will follow.',
          ],
        },
        hint: 'Bring the charts to Old Hesper so she can mark the first stars',
      },
      { objective: { kind: 'prince', prince: 'flux' }, hint: 'Defeat Prince Flux and open the sun cage' },
      {
        objective: { kind: 'visit', area: 'corona', at: { x: STONE_RING.x, y: STONE_RING.y }, r: 90, label: 'The stone circle at nightfall' },
        hint: 'Go to the stone circle as the first night falls',
      },
      {
        objective: {
          kind: 'duel', area: 'corona',
          foe: {
            id: 'corona-first-night-duel',
            court: 'corona',
            name: 'The Last Hour',
            foeName: 'Hour-Keeper Morrow',
            foeElement: 'sand',
            difficulty: 4,
            gimmick: '',
            at: { x: 1680, y: 1030 },
            look: { body: 0xd8b890, accent: 0x7a2a10, hat: 'tophat', traits: ['cane', 'glasses'], eye: 0xfff0b0 },
            challenge: [
              'It is two o\'clock in the afternoon. It has been two o\'clock for thirty years. I keep the hours.',
              'Step aside. I am winding the day back. The children are out past their meter.',
            ],
            beaten: ['My clock says night. I have never seen it say that. ...Go on. Let them look.'],
            coins: 55,
          },
        },
        hint: 'Stop Hour-Keeper Morrow from winding the day back (walkway west of the stone circle)',
      },
    ],
    complete: [
      'Morrow\'s clock has stopped, and the dark has held. Look at them all lying on the glass. Nobody is speaking.',
      'That is the Kettle, little one. Seven stars. Yes. It was always there. We just could not see it.',
    ],
    reward: { orbs: 6, coins: 80 },
  },
];
