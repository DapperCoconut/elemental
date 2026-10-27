import type { QuestDef } from '../../../../IslesTypes';

/**
 * Five small stories from the trunk: a millkeeper who jams the Empress's sawmill every night,
 * a widow whose knot has been ringed for pruning, an old angler whose pool is being drunk by
 * the Glasshouse, a bark-doctor who knows the mistletoe was planted, and the Rootwarden who
 * has watched forty years of the pruned go up her stairs and none come down.
 *
 * Duel foes: metal, chalk (Paint), water, slime (Venom), fire — none of them a champion's element.
 */
export const HEARTWOOD_QUESTS: QuestDef[] = [
  {
    id: 'heartwood-mill',
    area: 'heartwood',
    name: 'The Mill Must Not Run',
    giver: 'heartwood-ottilie',
    offer: [
      'Every night I knock four oak wedges into the arbor so that blade can\'t turn. Every morning I check them.',
      'This morning they were gone. Pulled out and flung into the roots. The blade spins free on a push.',
      'Find my wedges before someone pulls the chain. Please. It\'s the Larchmere bough they\'ve marked first.',
    ],
    accept: [
      'Oak, the length of your forearm, my mark burnt in the end — a little wheel. Look among the roots.',
      'And if you see Kerf hanging round the mill with his measuring-tape, don\'t let him near the chain.',
    ],
    stages: [
      {
        objective: {
          kind: 'collect', area: 'heartwood', label: 'Oak wedge', emoji: '🪵', color: 0xa65a0b,
          spots: [{ x: 230, y: 1520 }, { x: 860, y: 1680 }, { x: 1640, y: 1740 }, { x: 2200, y: 1600 }],
        },
        hint: 'Find Ottilie\'s 4 oak wedges flung among the roots of the forest floor',
      },
      {
        objective: {
          kind: 'talk', npc: 'heartwood-ottilie',
          lines: [
            'All four! Hold the blade still for me — there. And there. Tap, tap, and home.',
            'Hear that? Nothing. That\'s the best sound this mill makes.',
            'Oh no. Here comes Kerf with his order-paper, and he\'s brought a crowbar. Stand by the blade, would you?',
          ],
        },
        hint: 'Bring the wedges back to Ottilie at the sawmill',
      },
      {
        objective: {
          kind: 'duel', area: 'heartwood',
          foe: {
            id: 'heartwood-mill-duel',
            court: 'heartwood',
            name: 'First Cut',
            foeName: 'Sawyer-Foreman Kerf',
            foeElement: 'metal',
            difficulty: 4,
            gimmick: '',
            at: { x: 1700, y: 1640 },
            look: { body: 0x7a6a5a, accent: 0x2c2f31, hand: 0x585e60, hat: 'helmet', traits: ['tool', 'book', 'apron'], size: 1.25, eye: 0xd8dce0 },
            challenge: [
              'Order of the prince: one bough, short of tithe, to be milled. The Larchmere bough. It\'s on the paper.',
              'A mill that never runs is a mill that\'s been wasted. Step away from the chain. I\'ve waited years for this.',
            ],
            beaten: ['Fine. FINE. The paper can wait. Papers always wait. ...My crowbar\'s bent. That was my good crowbar.'],
            coins: 90,
          },
        },
        hint: 'Stop Sawyer-Foreman Kerf pulling the wedges again',
      },
    ],
    complete: [
      'Kerf\'s gone off muttering about his crowbar and the blade hasn\'t moved a hair. You did that.',
      'Here — the mill fund. I was saving it to buy more oak. I\'ll cut wedges from fallen boughs instead.',
    ],
    reward: { orbs: 5, coins: 60 },
  },
  {
    id: 'heartwood-tithe',
    area: 'heartwood',
    name: 'Short Measure',
    giver: 'heartwood-larchmere',
    offer: [
      'My spile was full on Sunday. Monday it was dry, and the bark round it scraped. Someone tapped me out.',
      'Two days to the season\'s turn. Short households get pruned. They\'ve already painted my ring.',
      'Resinia taps the lower terrace for the prince. If anyone knows where my sap went, she does.',
    ],
    accept: [
      'Pollard weighs it on the scales at the Ledge. He takes amber if there\'s no sap. Amber is sap with patience.',
      'I haven\'t any amber. I haven\'t any patience either, at my age.',
    ],
    stages: [
      { objective: { kind: 'defeat', encounter: 'heartwood-sap-tap' }, hint: 'Beat Tapper Resinia at the taps on the lower terrace (Sap Tap)' },
      {
        objective: {
          kind: 'deliver', npc: 'heartwood-pollard', item: 'fish-amber-carp', count: 1,
          lines: [
            'A carp. You are handing me a carp. For the Larchmere measure.',
            '...Its scales are amber, aren\'t they. Weighs like amber. On the pan it goes. Well. The beam says full.',
            'Full measure, Larchmere. I\'ll write it in. Whitlow won\'t like it — he\'s already been sent with his brush.',
          ],
        },
        hint: 'Resinia sold the sap on. Catch an Amber Carp in the root pool and give it to Weigher Pollard as amber',
      },
      {
        objective: {
          kind: 'duel', area: 'heartwood',
          foe: {
            id: 'heartwood-tithe-duel',
            court: 'heartwood',
            name: 'The White Ring',
            foeName: 'Ringmarker Whitlow',
            foeElement: 'chalk',
            difficulty: 4,
            gimmick: '',
            at: { x: 840, y: 1200 },
            look: { body: 0xd8d0c0, accent: 0xf6f3ea, hand: 0xf6f3ea, hat: 'beanie', traits: ['tool', 'apron', 'pack'], size: 1.0, eye: 0xffffff },
            challenge: [
              'Pollard writes what he likes. I paint what I\'m told. The prince told me white, round the Larchmere knot.',
              'One more coat and the bark takes it for good. Then it heals over the door. Out of my light, climber.',
            ],
            beaten: ['All right. I\'ll scrub it. Whitewash comes off with vinegar, you know. Everyone thinks it\'s forever.'],
            coins: 90,
          },
        },
        hint: 'Ringmarker Whitlow has come to give the Larchmere ring its last coat — stop him by her knot',
      },
    ],
    complete: [
      'The ring\'s coming off. Look — that\'s my bark under there. A bit pale. It hasn\'t seen the sun in a season.',
      'I baked. I always bake when I\'m frightened and I\'ve been frightened for a month. Take it, and this.',
    ],
    reward: { orbs: 6, coins: 40 },
  },
  {
    id: 'heartwood-pool',
    area: 'heartwood',
    name: 'The Drinking Pipe',
    giver: 'heartwood-mossjaw',
    offer: [
      'See the moss line on that root? That was the water a month ago. It\'s down a hand. Two hands.',
      'The Glasshouse sank an iron pipe in my pool to water her hedges. The hedges that used to be people.',
      'Get the trout out before the shallows dry. Then help me have a word with the pipe.',
    ],
    accept: ['Any rod\'ll do here. Trout in the shallows, chub down by the root-worms. Gently with the little ones.'],
    stages: [
      { objective: { kind: 'fish', fish: 'fish-sapling-trout', count: 2 }, hint: 'Catch 2 Sapling Trout in the root pool before the shallows dry' },
      { objective: { kind: 'fish', fish: 'fish-rootworm-chub', count: 1 }, hint: 'Land a Rootworm Chub from down by the roots' },
      { objective: { kind: 'visit', area: 'heartwood', at: { x: 340, y: 1560 }, r: 80, label: 'The Glasshouse pipe' }, hint: 'Look at the iron pipe sunk into the west side of the pool' },
      {
        objective: {
          kind: 'duel', area: 'heartwood',
          foe: {
            id: 'heartwood-pool-duel',
            court: 'heartwood',
            name: 'Water Rights',
            foeName: 'Sluice-Reeve Mudge',
            foeElement: 'water',
            difficulty: 4,
            gimmick: '',
            at: { x: 520, y: 1690 },
            look: { body: 0x6a7a72, accent: 0x2a5a4c, hand: 0x4f9e86, hat: 'souwester', traits: ['tool', 'book'], size: 1.15, eye: 0xbfe6dc },
            challenge: [
              'That valve is Glasshouse property, and so is every drop it drinks. The hedges are very thirsty this season.',
              'Hands off my pipe. The Empress\'s topiary doesn\'t water itself — though some of it tries.',
            ],
            beaten: ['The valve\'s bent. I can\'t open it. I\'ll... report that it\'s bent. In a week or so.'],
            coins: 90,
          },
        },
        hint: 'Sluice-Reeve Mudge is opening the valve wider — stop him at the pool',
      },
    ],
    complete: [
      'Valve bent shut! Listen to that — the pipe\'s coughing. And the trout in my bucket think they\'re in heaven.',
      'Pool\'ll be back up by the full moon. Here. Old fishing money. I\'ve nothing to spend it on but bait.',
    ],
    reward: { orbs: 5, coins: 70 },
  },
  {
    id: 'heartwood-mistletoe',
    area: 'heartwood',
    name: 'Kissing-Bough',
    giver: 'heartwood-bryony',
    offer: [
      'Mistletoe. On the boughs over the low knots — the poorest houses. It drinks their sap before the spile does.',
      'It never grew here. Mistletoe needs a bird, or a hand, to plant it. Birds don\'t pick only the poor.',
      'Pull the clumps before tithe-day. Then help me find out whose hand.',
    ],
    accept: ['White berries, sticky as glue. Wash your hands after — and don\'t eat any, whatever they smell like.'],
    stages: [
      {
        objective: {
          kind: 'collect', area: 'heartwood', label: 'Mistletoe clump', emoji: '🌿', color: 0xdff0b0,
          spots: [{ x: 800, y: 1240 }, { x: 1680, y: 1215 }, { x: 880, y: 1040 }, { x: 1560, y: 1100 }, { x: 900, y: 820 }],
        },
        hint: 'Pull 5 clumps of mistletoe from over the low knots on the trunk',
      },
      {
        objective: {
          kind: 'talk', npc: 'heartwood-twig',
          lines: [
            'The berry-lady! She comes up the scar at night with a basket. She squishes berries into the bark. I SAW.',
            'She said if I told anyone she\'d squish one on our knot. Our knot\'s already empty, so I don\'t care.',
            'She\'s up on the catwalks now. Bet she\'s planting more.',
          ],
        },
        hint: 'Ask Twig the climber — climbers see everything',
      },
      {
        objective: {
          kind: 'duel', area: 'heartwood',
          foe: {
            id: 'heartwood-mistletoe-duel',
            court: 'heartwood',
            name: 'Parasite',
            foeName: 'Mab Viscum, the Berry-Woman',
            foeElement: 'slime',
            difficulty: 4,
            gimmick: '',
            at: { x: 1440, y: 700 },
            look: { body: 0x9aa88a, accent: 0x3e5523, hand: 0xf6f3ea, hat: 'hood', traits: ['satchel', 'mask'], size: 0.95, eye: 0xdff0b0 },
            challenge: [
              'The prince pays by the household. One clump, one short tithe, one pruning. It\'s honest work. It\'s growing work.',
              'You\'ve been pulling my little darlings. They only want somewhere to drink. Like everyone.',
            ],
            beaten: ['Take the basket. Burn it. Don\'t breathe the smoke. ...I said don\'t breathe it, not hold your breath at me.'],
            coins: 90,
          },
        },
        hint: 'Catch Mab Viscum planting mistletoe up by the catwalks',
      },
    ],
    complete: [
      'Mab, for coin, from the prince. One clump per household he wanted pruned. I knew it. I KNEW it.',
      'The Pinewicks\' spile ran full this morning. Here — salve money, and something for your trouble.',
    ],
    reward: { orbs: 5, coins: 50 },
  },
  {
    id: 'heartwood-birchbark',
    area: 'heartwood',
    name: 'Grown Shut',
    giver: 'heartwood-hazel',
    requires: { courtReady: 'heartwood' },
    offer: [
      'Every champion on the trunk, beaten. Even Mandible\'s termites have gone quiet.',
      'Twenty-two doors on this tree the prince has had the bark grow shut over. Families behind every one, gone up.',
      'Go into the Heartroom and bring him down. If he falls, the knots open. I would like to see them open.',
    ],
    accept: ['He will not move for you at first. He will make the tree do it. Watch the floor. Then watch the walls.'],
    stages: [
      { objective: { kind: 'prince', prince: 'birchbark' }, hint: 'Defeat Prince Birchbark in the Heartroom on the west bough' },
      {
        objective: {
          kind: 'duel', area: 'heartwood',
          foe: {
            id: 'heartwood-birchbark-duel',
            court: 'heartwood',
            name: 'Reprisal',
            foeName: 'Stump-Burner Cinderby',
            foeElement: 'fire',
            difficulty: 5,
            hpMult: 1.1,
            gimmick: '',
            at: { x: 1120, y: 1460 },
            look: { body: 0x5a4a3e, accent: 0x2a2420, hand: 0xff8a3a, hat: 'hood', traits: ['lantern', 'mask', 'tool'], size: 1.2, eye: 0xffb060 },
            challenge: [
              'Sent down from the Glasshouse. A tree that throws down its prince is a tree that needs clearing. Root first.',
              'The stairs burn quick, being roots. Step aside, Rootwarden\'s friend. The Empress\'s gardener has spoken.',
            ],
            beaten: ['My torch... in the pool. Hissing. The roots are too wet to take. They\'re always too wet.'],
            coins: 90,
          },
        },
        hint: 'Stump-Burner Cinderby has come down from the Glasshouse to burn the root stairs — stop him',
      },
    ],
    complete: [
      'The prince down and the stairs whole. Listen. Can you hear it? Bark, cracking open, all up the trunk.',
      'Twenty-two doors. I am going to sit on my stairs and watch who comes out of them. Take this. Take all of it.',
      'Five more of her children to go, and then the Glasshouse at the crown. Sister Espalier keeps the door.',
    ],
    reward: { orbs: 8, coins: 180 },
  },
];
