import type { QuestDef } from '../../../../IslesTypes';

/**
 * Five small stories from the frozen harbour. Every one is about getting something moving that
 * the Prince has made stand still — a door sealed for debt, an honest weight, a ship, the
 * children's forts, and the names of the people lowered through the Tithe Hole.
 */
export const RIMEFAST_QUESTS: QuestDef[] = [
  {
    id: 'rimefast-iced-shut',
    area: 'rimefast',
    name: 'Iced Shut',
    giver: 'rimefast-tallis',
    offer: [
      'See my door? Under the ice, with the red tag nailed through it. A week behind on the Thaw Tithe.',
      'Ice gives to salt and hot water. Not quickly. But it gives.',
      'There\'s rock salt iced to the warehouse ramps on the south quay. Four sacks would do it.',
    ],
    accept: ['Bless you. Mind the Collector — he walks the quay with his blowlamp, re-sealing doors for sport.'],
    stages: [
      {
        objective: {
          kind: 'collect', area: 'rimefast', label: 'Sack of rock salt', emoji: '🧂', color: 0xe8e4dc,
          spots: [{ x: 860, y: 1505 }, { x: 1440, y: 1505 }, { x: 1580, y: 1510 }, { x: 1770, y: 1525 }],
        },
        hint: 'Find 4 sacks of rock salt by the warehouses on the south quay',
      },
      {
        objective: {
          kind: 'talk', npc: 'rimefast-burgoo',
          lines: [
            'Salt and a kettle for a sealed door? I\'ve been waiting three winters for somebody to ask.',
            'There — the hottest water on the quay, with the salt stirred in. Pour it slow, down the seam.',
            'Oh, mind yourself. Thaw-Collector Cinderby\'s seen the kettle. He\'s heading for her door.',
          ],
        },
        hint: 'Ask Chowder Burgoo for a kettle of hot water',
      },
      {
        objective: {
          kind: 'duel', area: 'rimefast',
          foe: {
            id: 'rimefast-iced-shut-duel',
            court: 'rimefast',
            name: 'Re-Sealed',
            foeName: 'Thaw-Collector Cinderby',
            foeElement: 'plasma',
            difficulty: 3,
            gimmick: '',
            at: { x: 330, y: 470 },
            look: { body: 0xd8c0a8, accent: 0x1f6a70, hat: 'goggles', traits: ['satchel', 'tool'], size: 1.05 },
            challenge: [
              'Hot water on a sealed door? That\'s thawing without a licence. That\'s a coin, and a coin, and a coin.',
              'My blowlamp can thaw anything, friend. It can also do the opposite. Watch.',
            ],
            beaten: ['My lamp\'s out. My ledger\'s wet. …I never saw that door. I never see any doors.'],
            coins: 60,
          },
        },
        hint: 'Stop Thaw-Collector Cinderby before he re-seals the door (Widow Firth\'s house)',
      },
    ],
    complete: [
      '*click*. Do you hear that? That\'s my latch. My own latch.',
      'Arn hung that door. I couldn\'t stand outside it one more morning.',
      'Take this — it\'s what the tithe would have been.',
    ],
    reward: { orbs: 4, coins: 40 },
  },
  {
    id: 'rimefast-short-weight',
    area: 'rimefast',
    name: 'Short Weight',
    giver: 'rimefast-augur',
    offer: [
      'Every fish out of these holes goes over the Prince\'s scales, and a tenth goes to the palace kitchens.',
      'Only Weighmaster Tare\'s tenth is more like a third. His scales lie.',
      'I can\'t prove it — he\'s the one who does the weighing.',
      'Land me some fish. Bring me a glacier cod and we\'ll weigh it on mine first. Then on his.',
    ],
    accept: ['Good. Smelt first, to warm your arms up. Then go deep for the cod.'],
    stages: [
      { objective: { kind: 'fish', fish: 'fish-icicle-smelt', count: 3 }, hint: 'Catch 3 Icicle Smelt in the Rimefast holes' },
      {
        objective: {
          kind: 'deliver', npc: 'rimefast-augur', item: 'fish-glacier-cod', count: 1,
          lines: [
            'Look at the size of her. On my scale: forty pounds and a bit. Honest iron, honest spring.',
            'Now watch Tare weigh the same fish. …Twenty-six. He calls it twenty-six, with a straight face.',
            'He\'s seen us comparing. Here he comes, scales and all.',
          ],
        },
        hint: 'Bring a Glacier Cod to Old Tom to weigh it honestly',
      },
      {
        objective: {
          kind: 'duel', area: 'rimefast',
          foe: {
            id: 'rimefast-short-weight-duel',
            court: 'rimefast',
            name: 'Thumb on the Scale',
            foeName: 'Weighmaster Tare',
            foeElement: 'justice',
            difficulty: 3,
            gimmick: '',
            at: { x: 1640, y: 960 },
            look: { body: 0xd0b8a0, accent: 0x5a5a6a, hat: 'tophat', traits: ['glasses', 'book'], size: 1.15 },
            challenge: [
              'Comparing weights is an offence against the Prince\'s measure. Which is the only measure.',
              'I find you guilty. I find everyone guilty. It saves on paperwork.',
            ],
            beaten: ['The scales… the scales are in the hole. Number three. Well. I suppose that\'s the true weight of them.'],
            coins: 60,
          },
        },
        hint: 'Settle with Weighmaster Tare by the fishing holes',
      },
    ],
    complete: [
      'His scales are at the bottom of hole number three, and every fisher on the ice is cheering.',
      'Honest weight. Do you know what that\'s worth in a place like this? About this much.',
    ],
    reward: { orbs: 3, coins: 50 },
  },
  {
    id: 'rimefast-promise',
    area: 'rimefast',
    name: 'The Promise',
    giver: 'rimefast-merrow',
    offer: [
      'The Merrow\'s Promise was running for open sea the night the harbour froze. Three winters, locked in.',
      'When the Prince falls the ice will go, but a collar this thick will crush her as it shifts.',
      'Hackle can saw it round her hull. But the breaker\'s captain will plough her under before he lets a ship go.',
    ],
    accept: ['Find Hackle by the bow. Tell him the Promise is calling in a favour.'],
    stages: [
      {
        objective: {
          kind: 'talk', npc: 'rimefast-hackle',
          lines: [
            'Cut her collar? I\'ve been aching to. Three winters looking at that hull, wanting to.',
            'Only Floe\'s lads have kicked my saw blades all over the ice for a laugh. Four of them, out there round her.',
          ],
        },
        hint: 'Talk to Hackle the ice-sawyer by the Promise',
      },
      {
        objective: {
          kind: 'collect', area: 'rimefast', label: 'Ice-saw blade', emoji: '🪚', color: 0xb8c4cc,
          spots: [{ x: 850, y: 790 }, { x: 1215, y: 790 }, { x: 905, y: 640 }, { x: 1180, y: 600 }],
        },
        hint: 'Gather Hackle\'s 4 saw blades from the ice round the Promise',
      },
      { objective: { kind: 'defeat', encounter: 'rimefast-icebreaker' }, hint: 'Beat Captain Floe so the Rimebiter stays tied up' },
    ],
    complete: [
      'Hackle\'s cut her free, and the Rimebiter\'s tied up at the ridge with her fires drawn.',
      'She\'s sitting in slush now, not ice. The first thaw will lift her.',
      'Take this — a share of her first cargo, paid in advance.',
    ],
    reward: { orbs: 5, coins: 60 },
  },
  {
    id: 'rimefast-forts',
    area: 'rimefast',
    name: 'Fort Rimeling',
    giver: 'rimefast-pip',
    offer: [
      'The snow forts by the south quay are OURS. We built them. Every block. With our own mittens.',
      'Then the Quartermaster took them for "training". Now we have nowhere to have the war.',
      'Can you win them back? You\'re big. Not as big as him. But big.',
    ],
    accept: ['YES. And if you see any mittens out there, they\'re ours. We lost a few. Running away.'],
    stages: [
      { objective: { kind: 'defeat', encounter: 'rimefast-snow-forts' }, hint: 'Beat Quartermaster Drift at the snow forts' },
      {
        objective: {
          kind: 'collect', area: 'rimefast', label: 'Lost mitten', emoji: '🧤', color: 0xa8343a,
          spots: [{ x: 1770, y: 1090 }, { x: 2160, y: 1110 }, { x: 1990, y: 1070 }, { x: 1400, y: 1090 }, { x: 1250, y: 1210 }],
        },
        hint: 'Find the children\'s 5 lost mittens on the ice',
      },
      {
        objective: {
          kind: 'duel', area: 'rimefast',
          foe: {
            id: 'rimefast-forts-duel',
            court: 'rimefast',
            name: 'Meltwater',
            foeName: 'Corporal Slush',
            foeElement: 'water',
            difficulty: 3,
            gimmick: '',
            at: { x: 1790, y: 1240 },
            look: { body: 0xb8c8d0, accent: 0x1f6a70, hat: 'helmet', traits: ['satchel'], size: 1.0 },
            challenge: [
              'The Quartermaster lost the forts? Then nobody has them. Orders. I\'m melting them down.',
              'One good bucket of meltwater in each and they\'re puddles by teatime. Stand aside.',
            ],
            beaten: ['I\'m soaked. I\'m freezing. I\'m going home. …The forts can stay. I liked them, actually.'],
            coins: 60,
          },
        },
        hint: 'Stop Corporal Slush from flooding the forts (south of the forts)',
      },
    ],
    complete: [
      'All five mittens! And the forts! And Slush ran off squelching!',
      'You\'re an honorary Rimeling now. That means you get this, and you have to be on our side forever.',
    ],
    reward: { orbs: 4, coins: 30, item: 'fish-frostback-char', itemCount: 2 },
  },
  {
    id: 'rimefast-tithe-hole',
    area: 'rimefast',
    name: 'The Tithe Hole',
    giver: 'rimefast-flurry',
    requires: { questDone: 'rimefast-iced-shut' },
    offer: [
      'Below the palace steps there\'s a hole the Prince keeps open. Households that still can\'t pay go down it.',
      '"To the Queen\'s keeping." He watches from the window. He says nothing. He just watches, so tidily.',
      'People drop keepsakes on the ice by it — a button, a comb, a name scratched on a spoon. Help me gather them.',
    ],
    accept: ['Ask Widow Firth first. She has a name for me. She always has the same name.'],
    stages: [
      {
        objective: {
          kind: 'talk', npc: 'rimefast-tallis',
          lines: [
            'Arn Firth. Net-mender\'s husband. Went down the hole the second winter, when we were two weeks short.',
            'Tell her Arn. And tell her he always paid, before.',
          ],
        },
        hint: 'Ask Widow Firth for the name she gives',
      },
      { objective: { kind: 'visit', area: 'rimefast', at: { x: 1760, y: 600 }, r: 80, label: 'The Tithe Hole' }, hint: 'Go to the Tithe Hole below the palace' },
      {
        objective: {
          kind: 'collect', area: 'rimefast', label: 'Frozen keepsake', emoji: '🪶', color: 0xd6efff,
          spots: [{ x: 1690, y: 640 }, { x: 1830, y: 615 }, { x: 1800, y: 725 }],
        },
        hint: 'Gather 3 keepsakes frozen into the ice round the hole',
      },
      { objective: { kind: 'prince', prince: 'hoarfrost' }, hint: 'Climb the palace steps and bring down Prince Hoarfrost' },
    ],
    complete: [
      'I read every name to him. Arn first. He listened to all of them. He didn\'t say a word.',
      'Then he asked me to open the window. Thank you.',
      'These were left at the palace by people who could pay. Use them.',
    ],
    reward: { orbs: 6, coins: 80 },
  },
];
