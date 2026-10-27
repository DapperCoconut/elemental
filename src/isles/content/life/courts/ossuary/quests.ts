import type { QuestDef } from '../../../../IslesTypes';

/**
 * Five small stories from the garden of the dead. Every one is about giving something back that
 * the Empress's tidiness took: a dead man's name, a well's honest catch, a sister's flowers, the
 * hymns that hide the names, and — at the last — the bones the Prince strung up to dance.
 */
export const OSSUARY_QUESTS: QuestDef[] = [
  {
    id: 'ossuary-ewan',
    area: 'ossuary',
    name: 'Bed Nine',
    giver: 'ossuary-nell',
    offer: [
      'My Ewan came down the hill in the summer, dead of the hedges, and they put him in the Long Beds without his name.',
      'I want something of him back. His ring, his pipe, the horn button off his coat. They\'d have gone in with him.',
      'The Registrar knows which bed. Will you ask him for me? I can\'t go in there. I\'ve tried.',
    ],
    accept: ['Thank you. Be gentle with Pallid. He writes things down because it is the only thing he is allowed to do.'],
    stages: [
      {
        objective: {
          kind: 'talk', npc: 'ossuary-pallid',
          lines: [
            'Ashby. Ewan. Entered the third of Fallow — weight nine stone four, much reduced. Bed nine, row two, the Long Beds.',
            'I have his name in the margin. Here. You see? Very small. I am sorry it is so small.',
            'Grubb turns that row. He keeps what he turns up, and he does not like visitors in his rows.',
          ],
        },
        hint: 'Ask Registrar Pallid which bed Ewan Ashby went into',
      },
      {
        objective: {
          kind: 'collect', area: 'ossuary', label: 'Ewan\'s keepsake', emoji: '💍', color: 0xc9a84a,
          spots: [{ x: 1700, y: 1420 }, { x: 1880, y: 1300 }, { x: 2050, y: 1460 }],
        },
        hint: 'Find Ewan\'s ring, pipe and button in bed nine of the Long Beds',
      },
      {
        objective: {
          kind: 'duel', area: 'ossuary',
          foe: {
            id: 'ossuary-ewan-duel',
            court: 'ossuary',
            name: 'Turned Under',
            foeName: 'Turner Grubb',
            foeElement: 'death',
            difficulty: 4,
            gimmick: '',
            at: { x: 1920, y: 1390 },
            look: { body: 0xa08a70, accent: 0x3a2a20, hat: 'hood', traits: ['tool', 'bandage'], size: 1.3 },
            challenge: [
              'Them\'s mine. What the fork turns up, the turner keeps. Rule of the beds, older than you.',
              'Rings, buttons, teeth. Nobody misses \'em. Nobody\'s allowed to. Put them back in the loam.',
            ],
            beaten: ['Take the trinkets. Take \'em. ...I kept a jar of them. Hundreds. I\'ll give them to Pallid. He can work out whose.'],
            coins: 70,
          },
        },
        hint: 'Turner Grubb wants Ewan\'s things back — stand your ground in the Long Beds',
      },
    ],
    complete: [
      'His ring. Oh, it\'s been in the ground and it still shines. He polished it every Sunday on his sleeve.',
      'And the button — I sewed that on. Crooked. He never let me redo it.',
      'Take this. It was the honey money. The three pounds. I don\'t want it in the house.',
    ],
    reward: { orbs: 5, coins: 60 },
  },
  {
    id: 'ossuary-deep-well',
    area: 'ossuary',
    name: 'What the Well Keeps',
    giver: 'ossuary-brandt',
    offer: [
      'Half of every catch out of the Deep Well goes up the hill to the Glasshouse kitchens. The Leech-Warden sees to it.',
      'Only Sallow takes the half and then bleeds the rest — sets his leeches on the catch and sells what they suck out as "tonic".',
      'Bring up a pair of lampreys, then the old carp from the deep. I\'ll weigh them in front of him, and we\'ll see whose they are.',
    ],
    accept: ['Good. Whalebone rod or briarwood, mind, or the marrow will have your line before the fish do.'],
    stages: [
      { objective: { kind: 'fish', fish: 'fish-marrow-lamprey', count: 2 }, hint: 'Catch 2 Marrow Lampreys in the Deep Marrow Well (whalebone or briarwood rod)' },
      {
        objective: {
          kind: 'deliver', npc: 'ossuary-brandt', item: 'fish-reliquary-carp', count: 1,
          lines: [
            'Look at her. Gold to the gills. The wellmen say she swallowed a saint\'s knuckle. I believe it, looking at her.',
            'That\'s ours. All of her. Not half, not a leech\'s worth — all.',
            'And there\'s Sallow coming down the steps with his jar. Stand by me, would you?',
          ],
        },
        hint: 'Bring a Reliquary Carp to Old Brandt at the Deep Well',
      },
      {
        objective: {
          kind: 'duel', area: 'ossuary',
          foe: {
            id: 'ossuary-deep-well-duel',
            court: 'ossuary',
            name: 'Bled Dry',
            foeName: 'Leech-Warden Sallow',
            foeElement: 'slime',
            difficulty: 4,
            gimmick: '',
            at: { x: 1960, y: 1150 },
            look: { body: 0xc8c0a8, accent: 0x4a5a3a, hat: 'tophat', traits: ['satchel', 'glasses'], size: 1.05 },
            challenge: [
              'A whole carp kept back from the tithe? That\'s an irregularity, and irregularities need bleeding.',
              'My leeches are very hungry. They are always very hungry. Hold still for them.',
            ],
            beaten: ['My jars. My lovely jars. ...Fine. The well\'s yours. Half of it. All of it. Stop hitting me.'],
            coins: 70,
          },
        },
        hint: 'Drive Leech-Warden Sallow off the Deep Well',
      },
    ],
    complete: [
      'Sallow\'s leeches are in the marrow where they belong, and he\'s gone up the hill without his jars.',
      'Every catch out of this well is honest weight from today. Take a share of the first honest one.',
    ],
    reward: { orbs: 5, coins: 50, item: 'fish-bonefish', itemCount: 2 },
  },
  {
    id: 'ossuary-white-lilies',
    area: 'ossuary',
    name: 'Flowers for a Hedge',
    giver: 'ossuary-lily',
    offer: [
      'Tam\'s name is on the Pruned\'s Wall. I put lilies under it every week, and every week the Gardener cuts them.',
      'He says flowers on the Wall are untidy. He says Tam is a hedge now and hedges don\'t need flowers.',
      'Pick me five of the tallest lilies out of the beds, and put them on the Wall for me — and then make him stop.',
    ],
    accept: ['The tallest! The ones with gold inside. Not by the shed — those are the Prince\'s.'],
    stages: [
      {
        objective: {
          kind: 'collect', area: 'ossuary', label: 'Tall white lily', emoji: '🪷', color: 0xf7f5ee,
          spots: [{ x: 1560, y: 1300 }, { x: 1760, y: 1480 }, { x: 1980, y: 1260 }, { x: 2140, y: 1400 }, { x: 1620, y: 1440 }],
        },
        hint: 'Pick 5 tall white lilies in the Long Beds',
      },
      { objective: { kind: 'visit', area: 'ossuary', at: { x: 640, y: 470 }, r: 80, label: 'The Pruned\'s Wall' }, hint: 'Lay the lilies under Tam Quill\'s name on the Pruned\'s Wall' },
      { objective: { kind: 'defeat', encounter: 'ossuary-bone-garden' }, hint: 'Beat Gardener Sternum in the Bone Garden so the flowers stay' },
    ],
    complete: [
      'They\'re still there! Five lilies, under Tam\'s name, and nobody\'s cut them!',
      'Sternum walked past and looked at them and didn\'t do anything. He just looked.',
      'These are for you — coins I found in the beds. Tam would want you to have them.',
    ],
    reward: { orbs: 4, coins: 50 },
  },
  {
    id: 'ossuary-hymnbook',
    area: 'ossuary',
    name: 'The Book of Lights',
    giver: 'ossuary-wilfrida',
    offer: [
      'The Book of Lights is our hymnbook. Every hymn in it has the names of the rendered hidden in its verses.',
      'Choirmaster Hushwell took it "for revision". He wants a court that sings nothing — no hymns, no names, only quiet.',
      'If he burns it, the names go with it. Please get it back before vespers.',
    ],
    accept: ['Ask Tobiah at the Rattling Jaw. That boy sees everything that comes along the Lily Road.'],
    stages: [
      {
        objective: {
          kind: 'talk', npc: 'ossuary-tobiah',
          lines: [
            'The Choirmaster? He came by tearing pages out of a big book and letting the wind have them.',
            'Three went down the road like moths. He went back toward the chapel with the rest, humming. Except not humming. The opposite.',
          ],
        },
        hint: 'Ask Tobiah at the Rattling Jaw which way the Choirmaster went',
      },
      {
        objective: {
          kind: 'collect', area: 'ossuary', label: 'Torn hymn page', emoji: '📜', color: 0xf0ead8,
          spots: [{ x: 700, y: 830 }, { x: 890, y: 795 }, { x: 980, y: 840 }],
        },
        hint: 'Gather the 3 torn hymn pages blowing along the Lily Road',
      },
      {
        objective: {
          kind: 'duel', area: 'ossuary',
          foe: {
            id: 'ossuary-hymnbook-duel',
            court: 'ossuary',
            name: 'Vespers',
            foeName: 'Choirmaster Hushwell',
            foeElement: 'silence',
            difficulty: 4,
            gimmick: '',
            at: { x: 900, y: 530 },
            look: { body: 0xe8dcd0, accent: 0x1a1418, hat: 'mitre', traits: ['book', 'mask'], size: 1.1 },
            challenge: [
              '…',
              'Shh. The names are untidy. The hymns are untidy. A court that sings is a court that remembers.',
              'Give me the pages. Then nobody will have to say anything ever again.',
            ],
            beaten: ['...Fine. Sing, then. Sing all of them. I suppose I always knew the words.'],
            coins: 70,
          },
        },
        hint: 'Take the Book of Lights back from Choirmaster Hushwell outside the chapel',
      },
    ],
    complete: [
      'The Book of Lights! And the torn pages — I can stitch those back. Thread and a steady hand.',
      'Tonight we sing every name in it, hidden in the verses, as loud as we like.',
      'Take this, from the collection plate. Saints don\'t mind. I asked.',
    ],
    reward: { orbs: 5, coins: 60 },
  },
  {
    id: 'ossuary-unstrung',
    area: 'ossuary',
    name: 'Cut the Strings',
    giver: 'ossuary-mattock',
    requires: { questDone: 'ossuary-ewan' },
    offer: [
      'You heard the clicking? That\'s the nave. The Prince keeps the best of the bones and strings them up as dancers.',
      'Hundreds of them, hanging from the Rood, for his mother\'s festivals. Ewan Ashby\'s up there. I recognised his crooked button-hole.',
      'The strings are tied off round the keep\'s steps. Cut them, and they\'ll fall, and I can bury them. Then deal with him.',
    ],
    accept: ['Go to the keep. Mind the steps — they\'re worn hollow by people being carried up them.'],
    stages: [
      { objective: { kind: 'visit', area: 'ossuary', at: { x: 1250, y: 570 }, r: 90, label: 'The steps of the Ossuary Throne' }, hint: 'Go to the steps of the Ossuary Throne' },
      {
        objective: {
          kind: 'collect', area: 'ossuary', label: 'Cut puppet-string', emoji: '🧵', color: 0xd8505a,
          spots: [{ x: 1110, y: 540 }, { x: 1390, y: 540 }, { x: 1150, y: 650 }, { x: 1350, y: 650 }],
        },
        hint: 'Cut the 4 puppet-strings tied off round the keep',
      },
      { objective: { kind: 'prince', prince: 'sinew' }, hint: 'Go into the Ossuary Throne and bring down Prince Sinew' },
    ],
    complete: [
      'They came down in the night, every one, all in a heap in the nave. Quiet. No more clicking.',
      'I\'ll bury them properly, each in their own bed, with their names off Pallid\'s margins.',
      'This was in the Prince\'s offering-box. He told me to give it to you. He said "thank you". Strange lad.',
    ],
    reward: { orbs: 7, coins: 90 },
  },
];
