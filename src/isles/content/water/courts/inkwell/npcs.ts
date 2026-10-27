import type { AreaDef, NpcDef } from '../../../../IslesTypes';

/**
 * The people of the Inkwell. Everything the Drowned Reach pays the Queen passes through this
 * town on paper: every Dry Tithe receipt is printed at the Pressworks, signed in squid ink and
 * sealed in blue. A house whose receipt is not on file is left under at the next tide, and its
 * family's names are blotted out of the registry — as if they had never been written at all.
 * Prince Blot governs by redaction. People here talk quietly, and nobody writes anything down.
 */

const PRINCE_DOWN = { prince: 'blot' } as const;
const QUEEN_DOWN = { monarch: 'maresa' } as const;

export const INKWELL_NPCS: NpcDef[] = [
  {
    id: 'inkwell-nib',
    name: 'Ottilie Nib',
    title: 'Stationer',
    look: { body: 0xf2eee3, accent: 0x111116, hat: 'tophat', traits: ['apron', 'glasses'], eye: 0x2b5cff },
    at: { x: 1470, y: 655 },
    role: { kind: 'shop', id: 'inkwell-shop' },
    talks: [
      { when: QUEEN_DOWN, lines: [
        'People are buying notebooks. NOTEBOOKS. To write in. Their own words, in their own hand. I cried at the till.',
        'The sea goes where it likes now. So do the ink sacs. I am stocking blue for the first time — any blue at all.',
      ] },
      { when: PRINCE_DOWN, lines: [
        'No more censor\'s licence on the pens I sell. You can write the word "Queen" without a stamp beside it. Try it!',
        'I sold forty bottles of ink this morning and not one of them was for a receipt.',
      ] },
      { lines: [
        'Nib & Sac, stationers. Charms, curios, and ink that has never once been used to sign anything ugly.',
        'Squid-sac charms, type slugs, errata slips — old scriptorium habits. They work better than they ought.',
        'And I buy fish. Canal fish soak up ink; the Pressworks pays me for it and I pay you. Everyone smudges a bit.',
      ] },
    ],
    barks: [
      { when: PRINCE_DOWN, lines: ['Notebooks! Blank ones!', 'Write what you like, love.'] },
      { lines: ['Licensed nibs only, by order.', 'Ink sacs, fresh from the pens.', 'Blot, blot, blot...'] },
    ],
  },
  {
    id: 'inkwell-vellum',
    name: 'Hartsease Vellum',
    title: 'Archivist',
    look: { body: 0xd8d2c3, accent: 0x24242b, hat: 'wizard', traits: ['book', 'glasses', 'cane'], size: 0.9, eye: 0x93b0ff },
    at: { x: 1640, y: 1385 },
    wander: 20,
    talks: [
      { when: QUEEN_DOWN, lines: [
        'The drowned are coming home from the Undertow, and every one of them wants to see their name written down.',
        'I have a queue round the canal. I have never been so tired or so happy. Pass me the good nib.',
      ] },
      { when: PRINCE_DOWN, lines: [
        'The registry came back from the Well — every blotted page. I can read through the ink, if I hold it to a lamp.',
        'Three thousand names. I am copying them out one at a time. You may sit with me, if you are quiet.',
      ] },
      { when: { questDone: 'inkwell-charter' }, lines: [
        'The charter is whole. "The waters of this town belong to those who live upon them." In plain ink. Ha!',
        'Slug printed a thousand of them. They are pasted over the decrees on every wall. Blot will be livid.',
      ] },
      { lines: [
        'Mind the stacks. That is the town\'s memory, what is left of it, drying on the step.',
        'This was the Archive. The Queen floods this street first, every tide. The Prince says it is a coincidence.',
        'Paper forgets when it gets wet. That is the point. That has always been the point.',
      ] },
    ],
    barks: [
      { when: PRINCE_DOWN, lines: ['Name, name, name...', 'I can read through the blot.'] },
      { lines: ['Careful, it is still damp.', 'Page ninety, gone. Page ninety-one, gone.', 'Hush. I am reading.'] },
    ],
  },
  {
    id: 'inkwell-tess',
    name: 'Tess Inkling',
    title: 'Pen-Girl',
    look: { body: 0xf2eee3, accent: 0x2b5cff, hat: 'souwester', traits: ['bandage', 'satchel'], size: 0.74, eye: 0x111116 },
    at: { x: 230, y: 945 },
    wander: 30,
    talks: [
      { when: QUEEN_DOWN, lines: [
        'Old Gloom went out with the spring tide. Straight out to sea, never looked back. I waved anyway.',
        'I am looking after the little ones now. Not milking. LOOKING AFTER. There is a difference and I am it.',
      ] },
      { when: PRINCE_DOWN, lines: [
        'Nobody has come to tap the squids for three whole days. Old Gloom ate a whole herring. A WHOLE one.',
        'Murk says the pens are "under review". I said review THIS and opened a net. Only a small one.',
      ] },
      { when: { questDone: 'inkwell-old-gloom' }, lines: [
        'No needles! She has not had a needle in her in a week and her ink is coming back proper black.',
        'She squirted Murk in the face yesterday. Right in it. I have never been prouder of anybody.',
      ] },
      { lines: [
        'The big one in the middle pen is Old Gloom. Oldest squid in the Reach. They milk her twice a day.',
        'Every Dry Tithe receipt is signed in her ink. Every house kept dry, she paid for. She gets no receipt.',
        'I mind the nets for Murk. He pays me in herring heads. I give them to Gloom. Do not tell him.',
      ] },
    ],
    barks: [
      { when: { questDone: 'inkwell-old-gloom' }, lines: ['Squirt him again, Gloomy!', 'No needles today!'] },
      { lines: ['Hush, Gloomy, hush.', 'Mind your boots, they squirt.', 'Herring heads for the good girl.'] },
    ],
  },
  {
    id: 'inkwell-mabry',
    name: 'Mabry Penhallow',
    title: 'Forger',
    look: { body: 0x7d7a72, accent: 0x0e0e12, hat: 'hood', traits: ['mask', 'satchel', 'glasses'], eye: 0xf2eee3 },
    at: { x: 1000, y: 1385 },
    talks: [
      { when: QUEEN_DOWN, lines: [
        'No more tithe. No more receipts. No more forging. I am going to have to learn to write my own name.',
        'I tried it this morning. It came out in Sumi\'s hand. Twenty years. It will take a while.',
      ] },
      { when: PRINCE_DOWN, lines: [
        'With the Prince down the auditors are hiding. I have been forging receipts out in the open, in a hat.',
        'Ninety houses kept dry this tide that could not pay. Ninety floors given back. Not bad for a criminal.',
      ] },
      { when: { questDone: 'inkwell-forged-receipts' }, lines: [
        'Look at that — "PAID IN FULL", in Sumi\'s very hand, blotted on ray-skin. The clerks cannot tell it from real.',
        'The Hobb family\'s floor came back this morning. Six children, dry socks. You did that.',
      ] },
      { lines: [
        'Keep walking. You did not see me. Nobody in this alley has ever seen me, that is the whole arrangement.',
        'I make receipts. For people who cannot pay the Dry Tithe and would rather not be left under. Very illegal.',
        'The trouble is Sumi\'s hand. Every real receipt is signed by her brush, and I cannot quite catch it.',
      ] },
    ],
    barks: [
      { when: PRINCE_DOWN, lines: ['Receipts! Free receipts!', 'Hat\'s open, take one.'] },
      { lines: ['Nothing to see.', 'Wrong alley, friend.', 'Sumi loops her S. Why does she loop it...'] },
    ],
  },
  {
    id: 'inkwell-ned',
    name: 'Ned Holler',
    title: 'Crier\'s Boy',
    look: { body: 0xf2eee3, accent: 0x2b5cff, hat: 'tricorn', traits: ['scarf', 'book'], size: 0.82 },
    at: { x: 1330, y: 705 },
    wander: 35,
    talks: [
      { when: QUEEN_DOWN, lines: [
        'I cried my first proper news this morning: "THE SEA IS NOBODY\'S." Everybody cheered! At ME!',
        'I can read nearly all the words now. Except "fathom". Nobody can spell "fathom". It is a trick word.',
      ] },
      { when: PRINCE_DOWN, lines: [
        'There are no decrees to cry today. I cried the weather instead. It was "nice". Everyone already knew.',
        'Miss Vellum is teaching me letters. I can do my name and "squid" and "NO". "NO" is easy. "NO" is my favourite.',
      ] },
      { when: { questDone: 'inkwell-decrees' }, lines: [
        'Pay, pay, pay. All of them said pay. I have been shouting "pay" at my own mam for two years and never knew.',
        'Bellow got the bell. I mean — I got Bellow\'s bell. I am going to ring it for nice things only.',
      ] },
      { lines: [
        'HEAR YE — um. Hear the Queen. Something. It is on the paper. It says to do it, whatever it is.',
        'I cry the decrees. Bellow hands me one, I shout it, everyone looks scared, I go home. Every day.',
        'I cannot read. Bellow says I do not need to. He says the less a crier knows, the louder he gets.',
      ] },
    ],
    barks: [
      { when: { questDone: 'inkwell-decrees' }, lines: ['Ding! Nice weather!', 'Hear ye: you\'re all right!'] },
      { lines: ['HEAR YE! Er...', 'By order of — somebody!', 'PAY! I think it says pay.'] },
    ],
  },
  {
    id: 'inkwell-agathe',
    name: 'Mother Agathe Lorn',
    title: 'Canal-Watcher',
    look: { body: 0xb9b2a1, accent: 0x13297a, hat: 'veil', traits: ['scarf', 'lantern'], size: 0.92, eye: 0x93b0ff },
    at: { x: 1500, y: 968 },
    talks: [
      { when: QUEEN_DOWN, lines: [
        'He came up the canal steps this morning, wet to the bone, asking why I looked so old. Teodor. My Teo.',
        'He remembers everything. He remembers being asleep. He says it was blue, and the Queen sang. I hate her.',
      ] },
      { when: { questDone: 'inkwell-blotted-name' }, lines: [
        '"Teodor Lorn, apprentice compositor, aged nineteen." It is written. In the registry. In ink that stays.',
        'They say the drowned are only sleeping in the Undertow. Then he will wake up and find himself written down.',
      ] },
      { when: PRINCE_DOWN, lines: [
        'The Prince is down. The registry is open. I cannot make myself go and look. Not yet. Not on my own.',
      ] },
      { lines: [
        'I watch the canal. My boy went under with our house, the tide before last. We could not pay.',
        'When I asked the registry for his name, there was a blot where he should have been. Square and very neat.',
        'He is not dead, they say. Kept, in the Undertow. Kept by whom? Under what name? They took his name.',
      ] },
    ],
    barks: [
      { when: { questDone: 'inkwell-blotted-name' }, lines: ['Teodor Lorn. Teodor Lorn.', 'It is written.'] },
      { lines: ['Teo...', 'The water is very black today.', 'Square, and very neat.'] },
    ],
  },
  {
    id: 'inkwell-slug',
    name: 'Gideon Slug',
    title: 'Compositor',
    look: { body: 0xd8d2c3, accent: 0x0e0e12, hat: 'cap', traits: ['apron', 'tool', 'beard'], size: 1.2 },
    at: { x: 690, y: 805 },
    wander: 25,
    talks: [
      { when: QUEEN_DOWN, lines: [
        'We printed a newspaper. Page one: SHE\'S GONE. Page two: SO ARE THE TIDES. Page three: fish.',
        'Teodor Lorn is back at his case, faster than me. I gave him "welcome" to set and he set it backwards.',
      ] },
      { when: PRINCE_DOWN, lines: [
        'The presses are quiet. No receipts, no decrees, no blot-orders. I have been setting poems. Badly.',
      ] },
      { when: { questDone: 'inkwell-charter' }, lines: [
        'A thousand copies of the charter, set in the old Founders\' face. My hands have not shaken like this in years.',
      ] },
      { lines: [
        'Mind the press. Everything the Queen says comes out of that door: decrees, receipts, and blot-orders.',
        'A blot-order is a list of names. I set it, we print it, and the censors ink them out of the registry.',
        'I set my own apprentice\'s name in a blot-order last spring. Teodor. I set it very carefully. I am that good.',
      ] },
    ],
    barks: [
      { when: PRINCE_DOWN, lines: ['Roses are... no.', 'Setting poems. Badly.'] },
      { lines: ['Backwards and upside down.', 'Mind your fingers.', 'Another blot-order. Another.'] },
    ],
  },
  {
    id: 'inkwell-wick',
    name: 'Wick Ferrule',
    title: 'Punter',
    look: { body: 0x7d7a72, accent: 0xf2eee3, hat: 'souwester', traits: ['rod', 'pipe', 'beard'], eye: 0xf2eee3 },
    at: { x: 2150, y: 966 },
    wander: 30,
    talks: [
      { when: QUEEN_DOWN, lines: [
        'The canal is running clear at the edges. CLEAR. I saw the bottom yesterday. It is mostly bicycles.',
        'The rays are still black, mind. That is just how rays are. Some things were always going to be black.',
      ] },
      { when: PRINCE_DOWN, lines: [
        'Fish are biting easier with the presses quiet. Less ink in the water. They can see the hook coming. Ha!',
      ] },
      { lines: [
        'This is the reach — quietest stretch of the Grand Canal. Cast off my stage if you have an iron rod.',
        'Inkfin squid shoal by the bridge. Quill pike sit still as a pen and bite like a censor. Blotted rays are rare.',
        'A ray\'s back takes up ink like a blotter. The forgers would kill for one. Not that I know any forgers.',
      ] },
    ],
    barks: [
      { lines: ['Pole, push, pole, push.', 'Bites are slow under the ink.', 'Mind the stage, it\'s wet.'] },
    ],
  },
];

/** Townsfolk walking the streets, heads down: clerks, pen-hands, press-hands, the tide-poor. */
export const INKWELL_CROWD: NonNullable<AreaDef['crowd']> = {
  count: 9,
  looks: [
    { body: 0xf2eee3, accent: 0x0e0e12, hat: 'tophat', traits: ['book'] },
    { body: 0xd8d2c3, accent: 0x2b5cff, hat: 'cap', traits: ['satchel'] },
    { body: 0xb9b2a1, accent: 0x24242b, hat: 'hood', traits: ['scarf'] },
    { body: 0xf2eee3, accent: 0x24242b, hat: 'souwester', traits: ['apron'] },
    { body: 0x7d7a72, accent: 0xf2eee3, hat: 'beanie', traits: ['glasses', 'pack'] },
    { body: 0xf2eee3, accent: 0x13297a, hat: 'veil', size: 0.8 },
  ],
  paths: [
    [{ x: 2300, y: 800 }, { x: 1720, y: 800 }, { x: 1450, y: 765 }, { x: 1720, y: 800 }],
    [{ x: 1200, y: 780 }, { x: 1200, y: 1050 }, { x: 1200, y: 1300 }, { x: 1200, y: 1050 }],
    [{ x: 980, y: 690 }, { x: 860, y: 740 }, { x: 760, y: 800 }, { x: 620, y: 815 }, { x: 420, y: 890 }, { x: 620, y: 815 }],
    [{ x: 150, y: 1335 }, { x: 560, y: 1330 }, { x: 900, y: 1312 }, { x: 560, y: 1330 }],
    [{ x: 1250, y: 1300 }, { x: 1600, y: 1312 }, { x: 1925, y: 1300 }, { x: 2280, y: 1330 }, { x: 1925, y: 1300 }],
    [{ x: 300, y: 962 }, { x: 900, y: 976 }, { x: 1480, y: 976 }, { x: 900, y: 976 }],
    [{ x: 1470, y: 760 }, { x: 1560, y: 640 }, { x: 1620, y: 562 }, { x: 1720, y: 556 }, { x: 1960, y: 545 }, { x: 1720, y: 556 }],
    [{ x: 1100, y: 640 }, { x: 1300, y: 660 }, { x: 1200, y: 720 }],
  ],
  barks: [
    { when: QUEEN_DOWN, lines: [
      'The tide came in and went out and nobody asked for a coin!', 'My cousin\'s back from under. She smells of kelp.',
      'I wrote a letter. To nobody. Just to see.', 'Look — blue sky. Not blue ink. SKY.',
    ] },
    { when: PRINCE_DOWN, lines: [
      'The censors have taken their lamps down.', 'I said the Queen\'s name out loud and nothing happened!',
      'Tore a decree off the line. Felt lovely.', 'The registry\'s open. Go and look for yours.',
    ] },
    { lines: [
      'Receipt? Have you got your receipt?', 'Tide\'s at four. Pay by three.', 'Don\'t read the lines, just walk.',
      'Keep your name off paper.', 'Number nine went under last night.', 'Mind the lamp — the censors watch.',
      'Ink on your hands? Wash it before the tower sees.', 'One coin a head. One coin a head.',
    ] },
  ],
};
