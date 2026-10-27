import type { AreaDef, NpcDef } from '../../../../IslesTypes';

/**
 * The people of the Corona plateau. The sun never sets here — Prince Flux keeps it in a cage —
 * and every household's share of its warmth is metered by mirror: keep your Tithe Fire lit and
 * the clerks turn your ration mirror to the sun; let it go cold and they turn it to the ground.
 * Everybody squints. Nobody has seen a star in eleven years.
 */

const PRINCE_DOWN = { prince: 'flux' } as const;
const KING_DOWN = { monarch: 'ashgrave' } as const;

export const CORONA_NPCS: NpcDef[] = [
  {
    id: 'corona-ottoline',
    name: 'Ottoline Brightwell',
    title: 'Lenswright',
    look: { body: 0xe8c8a0, accent: 0x5a1fa8, hat: 'goggles', traits: ['apron', 'glasses'], eye: 0xb36bff },
    at: { x: 760, y: 692 },
    role: { kind: 'shop', id: 'corona-shop' },
    talks: [
      { when: KING_DOWN, lines: [
        'The Kiln is cold and the whole isle wants spectacles to look at the sky with. Business has never been better.',
        'I am grinding star-lenses now. Proper ones. For looking at things that are far away and free.',
      ] },
      { when: PRINCE_DOWN, lines: [
        'With the Prince gone the clerks stopped buying ration-glass. I have a barrel of it. Want a barrel?',
        'Mostly I am selling dark lenses now. People want to look straight at the sun and laugh at it.',
      ] },
      { lines: [
        'Brightwell\'s Lenses! Charms, curios, and the only honest glass on the plateau.',
        'Everything here was fused by the captive sun. I just pick it up, polish it, and charge you for my trouble.',
        'I buy fish too. Glass-pool fish keep their light for days — the Prince\'s people pay well for lamp-stock.',
      ] },
    ],
    barks: [
      { when: PRINCE_DOWN, lines: ['Dark lenses! Look the sun in the eye!', 'Ration-glass, going cheap, going cheaper.'] },
      { lines: ['Charms! Fused by a captive star!', 'Mind the window, it focuses.', 'Polish, polish, polish...'] },
    ],
  },
  {
    id: 'corona-dimm',
    name: 'Abelard Dimm',
    title: 'Meter-Clerk',
    look: { body: 0xb8b0c8, accent: 0x2a2630, hat: 'tophat', traits: ['book', 'glasses'], size: 0.95 },
    at: { x: 1160, y: 742 },
    wander: 30,
    talks: [
      { when: KING_DOWN, lines: [
        'I burned the ledger. All nine volumes. It made a very small fire for something that ruined so many people.',
        'I am learning to fish. Calla is teaching me. She is a very patient woman. Considering.',
      ] },
      { when: PRINCE_DOWN, lines: [
        'No Prince, no meter. I have nothing to clerk. I keep opening the ledger and closing it again.',
        'Who decides who gets the light now? ...Everyone? Is that allowed? Is that written down anywhere?',
      ] },
      { when: { questDone: 'corona-cold-mirror' }, lines: [
        'Calla\'s mirror faces the sun again. I signed the correction myself. My hand shook. It still shakes.',
        'Do not tell the Prince. Or do. I find I am tired of being afraid of a man who lives in a lamp.',
      ] },
      { lines: [
        'Name? Household? Is your Tithe Fire lit? Show me your brand. ...Oh. You are not from here.',
        'I meter the light. Every household\'s ration mirror is turned by my order. Warm hearth, warm mirror.',
        'Cold hearth, cold mirror. It is very simple. It is written down. It is not my fault it is written down.',
      ] },
    ],
    barks: [
      { when: PRINCE_DOWN, lines: ['Nothing to meter...', 'Is light... free now? Shall I write that down?'] },
      { lines: ['Lumens in, lumens out.', 'Household forty, ration reduced.', 'Squint quieter, please.'] },
    ],
  },
  {
    id: 'corona-hesper',
    name: 'Old Hesper',
    title: 'Blind Astronomer',
    look: { body: 0xd8cfe0, accent: 0x3d5a58, hat: 'wizard', traits: ['cane', 'scarf'], eye: 0x9a9aa0, size: 0.9 },
    at: { x: 500, y: 474 },
    talks: [
      { when: KING_DOWN, lines: [
        'The isle is quiet tonight. I can hear the night-birds. Eleven years they waited in the cliffs.',
        'Describe the stars to me again. Slowly. Leave nothing out. I have time now.',
      ] },
      { when: PRINCE_DOWN, lines: [
        'I felt it on my face when the cage opened. Cool. Then cooler. Then — oh — then night.',
        'I was his tutor, you know. Flux. He asked me once what was behind the sky. I should have said "us".',
      ] },
      { when: { questDone: 'corona-blind-hesper' }, lines: [
        'The sunscale is under my pillow. Warm as a hand. I dream in colours I had forgotten were colours.',
        'You wrestled the little sun and won me a fish. That is the best sentence I have ever said aloud.',
      ] },
      { lines: [
        'Come closer, I cannot see you. I looked at the captive sun the day it was caged. Just the once.',
        'This was my observatory. The Prince lets me keep it. A kindness, he says. A blind astronomer.',
        'Every night for forty years I charted stars. Now there are no nights, and I chart the warmth on my hands.',
      ] },
    ],
    barks: [
      { when: PRINCE_DOWN, lines: ['Is it dark yet? Tell me when it is dark.', 'I can feel the cool coming.'] },
      { lines: ['Someone is squinting near me.', 'Mind the telescope, it bites.', 'Hm. Hot side of noon again.'] },
    ],
  },
  {
    id: 'corona-pip',
    name: 'Pip Glaze',
    title: 'Pool Urchin',
    look: { body: 0xf0c890, accent: 0x4f9c8a, hat: 'straw', traits: ['rod'], size: 0.72 },
    at: { x: 700, y: 1006 },
    wander: 40,
    talks: [
      { when: KING_DOWN, lines: [
        'The tetras blink at night! All at once! Like the pool is talking! Hesper says that is what stars looked like.',
        'I am going to catch the biggest sunscale in the WORLD and name it after you. Probably.',
      ] },
      { when: PRINCE_DOWN, lines: [
        'Is it true it gets dark now? Like properly dark? Mam says I have to go to bed when it gets dark. Unfair.',
        'Zenith says the sun is "on loan" now. I asked who we borrowed it from and nobody would say.',
      ] },
      { lines: [
        'This is the glass pool! The bottom is made of glass and the top is made of water. I checked.',
        'Little ones are photon tetras. They blink. The big gold one is a sunscale and it bites and I hate it.',
        'If you have a rod you can fish anywhere round the edge. Ottoline buys them. She pays in coins, not sweets.',
      ] },
    ],
    barks: [
      { lines: ['Blink, blink, blink!', 'I nearly had it!', 'Don\'t scare the tetras!'] },
    ],
  },
  {
    id: 'corona-galvana',
    name: 'Galvana Reed',
    title: 'Pylon Lineworker',
    look: { body: 0x9a7a5a, accent: 0xc8963a, hat: 'helmet', traits: ['tool', 'satchel', 'glasses'], eye: 0xe6d2ff },
    at: { x: 1905, y: 645 },
    wander: 50,
    talks: [
      { when: KING_DOWN, lines: [
        'I am rewiring the pylons to light the town instead of fence it in. Same copper. Better reason.',
        'Ampere comes by in the evenings to help. He still counts to three before he touches anything.',
      ] },
      { when: PRINCE_DOWN, lines: [
        'Pylons are humming softer now. Nobody is pushing current through them to scare us.',
        'Flux built these to "contain an outbreak". The outbreak was people leaving at night. Not that there was night.',
      ] },
      { when: { questDone: 'corona-fuse-run' }, lines: [
        'Every fuse back where it belongs, and the arcs run where I say. You are a terrible influence on Ampere.',
        'He showed up for work humming. HUMMING. I think you knocked something loose in him. Something good.',
      ] },
      { lines: [
        'Don\'t touch the pylons. Don\'t stand under the arcs. Don\'t lick anything copper. That covers most of it.',
        'I keep the line running. Ampere keeps the schedule. Between us, the town stays inside the fence.',
      ] },
    ],
    barks: [
      { lines: ['Three... two... one... zap.', 'Who left this fuse loose?', 'Smell that? Ozone. Lovely.'] },
    ],
  },
  {
    id: 'corona-umbrel',
    name: 'Brother Umbrel',
    title: 'Keeper of the Shade',
    look: { body: 0x4a4458, accent: 0x07040c, hat: 'hood', traits: ['lantern', 'beard'], eye: 0xb36bff },
    at: { x: 2000, y: 1000 },
    talks: [
      { when: KING_DOWN, lines: [
        'There is shade everywhere now. Every evening. I am a keeper of something nobody needs kept. It is wonderful.',
        'I have taken up stargazing. Badly. Hesper corrects me. She is blind and still correct.',
      ] },
      { when: PRINCE_DOWN, lines: [
        'The night came. The children ran out of the circle and lay on the glass and just looked up.',
        'Nobody needed my lantern. I lit it anyway. Habit. A small dark lantern, for old times.',
      ] },
      { lines: [
        'Welcome to the circle. These stones throw the only true shadows on the plateau. We keep them.',
        'When the flares come, the whole town crowds in here. The shade is small. We share it. We always share it.',
        'My lantern burns dark — a lamp that makes a little night. It is the last night left on Brandmark.',
      ] },
    ],
    barks: [
      { when: PRINCE_DOWN, lines: ['Look up. Just look up.', 'The shade is everywhere now.'] },
      { lines: ['Stand in the shade, friend.', 'The stones remember night.', 'Hush. Let your eyes rest.'] },
    ],
  },
  {
    id: 'corona-calla',
    name: 'Calla Wren',
    title: 'Mirror-Widow',
    look: { body: 0xcab8a8, accent: 0x3d3a44, hat: 'veil', traits: ['scarf', 'brand'], size: 0.95 },
    at: { x: 1080, y: 1468 },
    talks: [
      { when: KING_DOWN, lines: [
        'My hearth is lit. Not for any king. For me, because I like the colour. Come and warm your hands.',
        'Dimm comes to fish with me. He is very bad at it. I am making him wait for the big ones.',
      ] },
      { when: PRINCE_DOWN, lines: [
        'The clerks took their seal off my post. I did not ask them to. They just came, and did it, and left.',
        'I sat in the sun all morning. My own share of it. I cried a bit. Then I made soup.',
      ] },
      { when: { questDone: 'corona-cold-mirror' }, lines: [
        'The mirror faces the sun again. My kitchen is warm. I keep touching the walls to make sure.',
        'You and that mad clerk. I never thought Dimm had a spine. Turns out he keeps it in a ledger.',
      ] },
      { lines: [
        'That is my mirror. Turned to the ground, with the clerk\'s seal on it. My hearth went cold the winter Tam died.',
        'Cold hearth, cold mirror. That is the rule. So now my house is cold too, and the rule is very happy.',
      ] },
    ],
    barks: [
      { when: { questDone: 'corona-cold-mirror' }, lines: ['Warm walls. Warm walls.', 'Mind the soup.'] },
      { lines: ['Cold again today.', 'Tam would have kicked that post over.', 'They call me the mirror-widow.'] },
    ],
  },
  {
    id: 'corona-fenwick',
    name: 'Doctor Quillon Fenwick',
    title: 'Laboratory Assistant',
    look: { body: 0xe0d4c0, accent: 0xf4fff8, hat: 'none', traits: ['glasses', 'book', 'satchel'], eye: 0x8fb3ad },
    at: { x: 880, y: 524 },
    wander: 25,
    talks: [
      { when: KING_DOWN, lines: [
        'Quentin and I are writing the true account of the laboratory. All of it. It will be very long and very unkind.',
        'He remembers more every week. Yesterday: his mother\'s name. Today: that he hated mushrooms.',
      ] },
      { when: PRINCE_DOWN, lines: [
        'I unlocked every tank in the vault. Most were empty. The ones that were not... they are being looked after.',
        'I worked for the Prince for nine years. I wrote down everything. I am going to have to read it all back now.',
      ] },
      { when: { questDone: 'corona-q7' }, lines: [
        'Quentin Seward. His name was Quentin Seward. He is sitting in the vault with the door open, just... sitting.',
        'He does not want to leave yet. He says the plates are comfortable. I suppose they would be.',
      ] },
      { lines: [
        'Hm? Oh. Fenwick. Assistant to the Prince. Assistant to the experiments. Assistant to... no. Assistant.',
        'If you hear something howling behind the west observatory, that is Q-7. Do not let it get bright near you.',
      ] },
    ],
    barks: [
      { when: PRINCE_DOWN, lines: ['So many notes.', 'Unlocked. All unlocked.'] },
      { lines: ['Containment nominal. Nominal. Nominal...', 'Where did I put the plates?', 'He was a lamplighter...'] },
    ],
  },
];

/** The squinting townsfolk of the plateau, walking the glass lanes between home and the shade. */
export const CORONA_CROWD: NonNullable<AreaDef['crowd']> = {
  count: 8,
  looks: [
    { body: 0xd8b890, accent: 0x5a1fa8, hat: 'straw', traits: ['scarf'] },
    { body: 0xc0a080, accent: 0x3d5a58, hat: 'goggles', traits: ['satchel'] },
    { body: 0xe0c8b0, accent: 0xc8963a, hat: 'hood', traits: ['brand'] },
    { body: 0xa88870, accent: 0x7a2a10, hat: 'veil', traits: ['glasses'] },
    { body: 0xf0d0a8, accent: 0x4f9c8a, hat: 'cap', size: 0.75 },
    { body: 0xb8a090, accent: 0x2a2630, hat: 'beanie', traits: ['pack', 'glasses'] },
  ],
  paths: [
    [{ x: 120, y: 800 }, { x: 760, y: 765 }, { x: 1150, y: 795 }, { x: 760, y: 765 }],
    [{ x: 1290, y: 900 }, { x: 1270, y: 1200 }, { x: 1215, y: 1450 }, { x: 1270, y: 1200 }],
    [{ x: 1400, y: 850 }, { x: 1700, y: 900 }, { x: 1900, y: 990 }, { x: 1700, y: 900 }],
    [{ x: 1160, y: 1340 }, { x: 900, y: 1405 }, { x: 600, y: 1395 }, { x: 360, y: 1335 }, { x: 600, y: 1395 }],
    [{ x: 820, y: 800 }, { x: 790, y: 960 }, { x: 860, y: 1000 }, { x: 790, y: 960 }],
    [{ x: 1500, y: 760 }, { x: 1720, y: 655 }, { x: 1930, y: 490 }, { x: 1720, y: 655 }],
    [{ x: 1300, y: 1135 }, { x: 1480, y: 1235 }, { x: 1550, y: 1380 }, { x: 1480, y: 1235 }],
  ],
  barks: [
    { when: KING_DOWN, lines: [
      'The Kiln is out! The Kiln is out!', 'I lit my hearth for supper. Just for supper.', 'Look — a star. Another one!',
      'No brand on the baby. No brand at all.',
    ] },
    { when: PRINCE_DOWN, lines: [
      'It got dark last night. Properly dark!', 'I slept eleven hours. ELEVEN.', 'My mirror\'s mine now.',
      'Did you see the cage open? Like a flower.',
    ] },
    { lines: [
      'Squint, squint...', 'Is my hearth lit? I think my hearth is lit.', 'Flare weather coming, feel it?',
      'Meter-clerks on the south lane.', 'Mirror turned two degrees off. Two degrees!', 'Stay near the stones.',
      'Eleven years of noon.', 'Don\'t look up. Never look up.',
    ] },
  ],
};
