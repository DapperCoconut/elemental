import type { AreaDef, Cond, NpcDef, NpcLook } from '../../../../IslesTypes';

/**
 * The people of the Powder Court. A garrison town: everyone here either fires the guns, feeds the
 * guns or patches up the people standing near the guns. Under the drill they are quietly on the
 * people's side. Blocks are listed most specific first: King fallen → Prince fallen → quest done →
 * quest underway → default.
 */

const KING: Cond = { monarch: 'ashgrave' };
const PRINCE: Cond = { prince: 'fuse' };

export const POWDER_NPCS: NpcDef[] = [
  {
    id: 'powder-dobbin',
    name: 'Dobbin Saltpetre',
    title: 'Quartermaster',
    look: { body: 0xc89a74, accent: 0x3a4a2a, hat: 'cap', traits: ['apron', 'glasses'], size: 1.15 },
    at: { x: 1020, y: 650 },
    role: { kind: 'shop', id: 'powder-shop' },
    talks: [
      { when: KING, lines: ['The King\'s gone? Then the ledgers are mine to close.', 'Forty years of counting kegs for a fire that never needed them. Buy something. I\'m celebrating.'] },
      { when: PRINCE, lines: ['Fuse is down and the magazine\'s under my key now.', 'I\'ve started selling the good stock. The Prince always kept the good stock for "occasions".'] },
      { when: { questDone: 'powder-wet-powder' }, lines: ['Damp corner\'s doing nicely. Terrible weather, this year. Terrible.', 'What\'ll it be? Charms are dry, at least.'] },
      { when: { quest: 'powder-wet-powder' }, lines: ['You\'re dripping on my floor. I\'m not looking at it. I\'m looking at my ledger.'] },
      { lines: ['Quartermastery. Everything signed for, everything counted, everything for sale if the price is right.', 'Charms from the armoury, fish bought by the pound. Speak up, the noon gun\'s due.'] },
    ],
    barks: [
      { when: KING, lines: ['Ledger closed. Ha!', 'No more tithe columns. Lovely.'] },
      { when: PRINCE, lines: ['Stock-take! Everything must go!', 'Magazine key. Mine. Imagine.'] },
      { lines: ['Forty-one kegs. No — forty.', 'Sign here. And here. And here.', 'Counting, always counting.'] },
    ],
  },
  {
    id: 'powder-wadding',
    name: 'Mother Wadding',
    title: 'Cooper',
    look: { body: 0x9a6a4a, accent: 0x6a4a2a, hat: 'bandana', traits: ['apron', 'tool'], size: 1.1 },
    at: { x: 900, y: 1300 },
    talks: [
      { when: KING, lines: ['I\'m making barrels for apples now. APPLES. Nobody will ever light an apple.', 'Ash says hello. He\'s inside, sanding staves, sulking. Best day of my life.'] },
      { when: { all: [PRINCE, { questDone: 'powder-deserter' }] }, lines: ['My boy\'s home. He sulks, he eats, he sands staves badly.', 'I\'d box his ears if I weren\'t so busy hugging him.'] },
      { when: PRINCE, lines: ['Fuse is down. Every keg I made him is still in the store, wet as a herring.', 'That\'s my war, that was. Forty kegs of nothing.'] },
      { when: { questDone: 'powder-wet-powder' }, lines: ['Forty kegs, sealed tight, wet as the moat. Fuse will test them with his match.', 'And nothing will happen. I\'d pay to see his face.'] },
      { when: { quest: 'powder-wet-powder' }, lines: ['Five rags, from the alley gutters. Quietly. Rags drip; drips talk.'] },
      { lines: ['Mind the staves. A keg\'s a promise held together with iron — that\'s the trade.', 'Bram rolls them, Fuse fills them, the King burns them. I just make them. More\'s the pity.'] },
    ],
    barks: [
      { when: PRINCE, lines: ['Apple barrels next. Mark me.', 'No more powder. Lovely.'] },
      { lines: ['*tap tap tap* — hoop on.', 'Dry oak, wet powder. Hm.', 'Where\'s that boy got to…'] },
    ],
  },
  {
    id: 'powder-pim',
    name: 'Ensign Pim Lanyard',
    title: 'Signal Ensign',
    look: { body: 0xe8c8a8, accent: 0x2f4f8f, hat: 'cap', traits: ['satchel'], size: 0.85 },
    at: { x: 1440, y: 700 },
    talks: [
      { when: KING, lines: ['I flew THE KING IS DOWN up the mast and every mast on the isle flew it back!', 'Even the lighthouse at Emberport. I didn\'t know they had the code. Everyone has the code!'] },
      { when: PRINCE, lines: ['Today\'s signal: COURT FREE. Twenty times. I\'ve run out of rope.', 'Brisket\'s been teaching the whole barracks the flags. We\'re going to need a bigger mast.'] },
      { when: { questDone: 'powder-semaphore' }, lines: ['HELP. FREE. COURT. — and now, underneath: READ YOU. Brisket answered!', 'Two of us knowing the code is a conspiracy. One of us was just a boy with flags.'] },
      { when: { quest: 'powder-semaphore' }, lines: ['Can they see it? Go and look! North gate gun-step, then the range tower!'] },
      { lines: ['Blue over red is "powder coming". Red over blue is "powder going". Red alone is "duck".', 'I fly other signals too. Nobody reads those. Nobody looks up, here.'] },
    ],
    barks: [
      { when: PRINCE, lines: ['COURT. FREE. Again!', 'More rope! More flags!'] },
      { lines: ['Hoist! …and hold.', 'Red alone. Duck.', 'Nobody ever looks up.'] },
    ],
  },
  {
    id: 'powder-brisket',
    name: 'Old Gunner Brisket',
    title: 'Retired Artillerist',
    look: { body: 0xb08868, accent: 0xa3262a, hat: 'tricorn', traits: ['beard', 'cane', 'pipe'], size: 1.05 },
    at: { x: 1010, y: 215 },
    talks: [
      { when: KING, lines: ['WHAT? The King? DOWN? Speak up, I\'m — ha! I heard you. I heard you the first time.', 'Fired a salute at dawn. Twenty-one guns. Hask loaded, I laid. Best gunnery of my life.'] },
      { when: PRINCE, lines: ['The young Prince is down. He loved the guns, I\'ll give him that. Loved them wrong.', 'You fire a gun to end a thing, not because the bang is pretty.'] },
      { when: { questDone: 'powder-lanyard' }, lines: ['Lanyard\'s back on my hip where it lives. Splice and all.', 'Hask came by. Said sorry. Gunner to gunner. Took her long enough.'] },
      { when: { quest: 'powder-lanyard' }, lines: ['Hask\'s up on the ridge with my lanyard. Go and fetch it like a proper recruit.'] },
      { lines: ['EH? Speak up! Forty years on the north guns, you\'d be deaf too.', 'I can still lay a twelve-pounder on a tithe-collector\'s hat at a mile. Not that I would. Often.'] },
    ],
    barks: [
      { when: PRINCE, lines: ['Guns at rest. As they should be.', 'EH? Oh. Good day to you!'] },
      { lines: ['EH?', 'Third gun pulls left.', 'Younger ears, she says. Hah.'] },
    ],
  },
  {
    id: 'powder-tamp',
    name: 'Sister Tamp',
    title: 'Field Surgeon',
    look: { body: 0xdcbca0, accent: 0xece4d2, hat: 'veil', traits: ['bandage', 'satchel'], size: 0.95 },
    at: { x: 1760, y: 600 },
    talks: [
      { when: KING, lines: ['The King is dead and my infirmary is empty. I don\'t know what to do with my hands.', 'Perhaps I\'ll learn to fish. Nell says I\'d be hopeless. Nell is right.'] },
      { when: PRINCE, lines: ['No more drills, no more mine-burns, no more "accidents" at the range.', 'I bandaged the Prince, you know. After. He said thank you. First time.'] },
      { when: { questDone: 'powder-hardtack' }, lines: ['Fish broth, every evening now. The lads call it "Sister\'s Shot". Better than the other kind.'] },
      { when: { quest: 'powder-hardtack' }, lines: ['Minnows first, then pike. Nell by the moat knows every hole in it.'] },
      { lines: ['Burns, ears, fingers. In that order. The Powder Court is very hard on fingers.', 'If you\'re hurt, sit. If you\'re not, don\'t stand near the range.'] },
    ],
    barks: [
      { when: PRINCE, lines: ['Empty beds. Lovely.', 'Fewer fingers lost this week. None, in fact.'] },
      { lines: ['Hold still.', 'Another burn. Of course.', 'Keep your fingers, lads.'] },
    ],
  },
  {
    id: 'powder-nell',
    name: 'Reedy Nell',
    title: 'Moat Angler',
    look: { body: 0xa88a6a, accent: 0x4a5a3a, hat: 'straw', traits: ['rod', 'pipe'], size: 0.9 },
    at: { x: 760, y: 785 },
    talks: [
      { when: KING, lines: ['King\'s gone and the moat\'s still full of pike. Some things just keep biting.', 'They\'re going to drain the moat for a garden, they say. Over my rod.'] },
      { when: PRINCE, lines: ['No more noon gun. The pike don\'t know what to do — they\'re biting all day now.'] },
      { when: { quest: 'powder-hardtack' }, lines: ['For Sister Tamp? Minnows school by the bridge pilings. Pike lie deep under the keep wall.', 'Pike fight like a gun crew. Give them line, then haul.'] },
      { lines: ['Moat fishing. Flint pike, fuse minnows, and the odd boot. All edible if you\'re brave.', 'The pike bite after the noon gun. Shock wakes them up. Wakes me up too.'] },
    ],
    barks: [
      { when: PRINCE, lines: ['Biting all day now.', 'Quiet water. Good water.'] },
      { lines: ['Shh. Pike.', 'Noon gun\'s due. Ready…', 'Minnows by the pilings.'] },
    ],
  },
  {
    id: 'powder-ash',
    name: 'Ash Vell',
    title: 'Deserter',
    look: { body: 0xc8a888, accent: 0xa3262a, hat: 'none', traits: ['bandage'], size: 0.85 },
    at: { x: 2240, y: 1490 },
    present: { not: { questDone: 'powder-deserter' } },
    talks: [
      { when: PRINCE, lines: ['Is it true? Is he down? Then the list is just paper, and I can go home?', 'Don\'t go yet. Hear me out first.'] },
      { when: { quest: 'powder-deserter', stage: 2 }, lines: ['You told her. Was she angry? …Was she crying? Don\'t tell me. I\'ll cry too.'] },
      { when: { quest: 'powder-deserter' }, lines: ['Still a crater. Still not here. Ironsides first, if you can.'] },
      { lines: ['Psst. Down here. In the crater. No — don\'t look at me, look at the targets.'] },
    ],
    barks: [
      { lines: ['Psst!', 'Not here. Crater.', '*sniff* Smells of Mum\'s stave-oil out here.'] },
    ],
  },
  {
    id: 'powder-hobb',
    name: 'Hobb',
    title: 'Powder Monkey',
    look: { body: 0xe0b890, accent: 0x5a3a22, hat: 'cap', traits: ['satchel'], size: 0.72 },
    at: { x: 1180, y: 920 },
    wander: 150,
    talks: [
      { when: KING, lines: ['I don\'t have to carry powder anymore! I carry apples now! For Mother Wadding\'s barrels!', 'Apples are heavier. I don\'t mind. They don\'t go bang.'] },
      { when: PRINCE, lines: ['The Prince gave me his hat. Well, he dropped it. I picked it up. Same thing!'] },
      { lines: ['I\'m a powder monkey! I carry cartridges to the guns. Fast as fast, or it\'s a docked supper.', 'Never run with a lit match. Never walk with one either. Never HAVE one, really.'] },
    ],
    barks: [
      { when: PRINCE, lines: ['Look at my hat!', 'No more running cartridges!'] },
      { lines: ['Coming through! Powder!', 'Fast as fast!', 'Docked supper, docked supper…'] },
    ],
  },
];

const SOLDIER: NpcLook = { body: 0xd8b090, accent: 0xa3262a, hat: 'tricorn', traits: ['satchel'] };
const GUNNER: NpcLook = { body: 0xb08060, accent: 0x3b3d42, hat: 'helmet', traits: ['tool'] };
const TOWNSFOLK: NpcLook = { body: 0xc8a080, accent: 0x6a5a3a, hat: 'beanie', traits: ['brand'] };
const SAPPER: NpcLook = { body: 0x9a7a5a, accent: 0x5e4c34, hat: 'cap', traits: ['tool', 'beard'], size: 1.15 };
const LAUNDRESS: NpcLook = { body: 0xe0c0a0, accent: 0x8a3a3a, hat: 'bandana', traits: ['apron', 'brand'], size: 0.95 };

export const POWDER_CROWD: NonNullable<AreaDef['crowd']> = {
  count: 11,
  looks: [SOLDIER, GUNNER, TOWNSFOLK, SAPPER, LAUNDRESS, SOLDIER],
  paths: [
    // Drill square, round and round.
    [{ x: 1000, y: 700 }, { x: 1460, y: 700 }, { x: 1460, y: 960 }, { x: 1000, y: 960 }],
    // East road, gate to yard.
    [{ x: 2200, y: 800 }, { x: 1700, y: 810 }, { x: 1520, y: 800 }],
    // North road, gate to yard.
    [{ x: 1200, y: 220 }, { x: 1200, y: 480 }, { x: 1200, y: 640 }],
    // Barracks to range.
    [{ x: 1800, y: 620 }, { x: 1760, y: 900 }, { x: 1680, y: 1120 }],
    // Down to the alley and back.
    [{ x: 980, y: 1000 }, { x: 860, y: 1200 }, { x: 600, y: 1300 }],
  ],
  barks: [
    { when: KING, lines: ['Long live nobody!', 'No more tithe fires. I let mine go out. It felt like breathing.', 'Apple barrels, she says. Apples!'] },
    { when: PRINCE, lines: ['Guns at rest. Strange, the quiet.', 'Who\'s keeping the magazine now? Dobbin? God help us.', 'Fuse hit the floor like a dropped keg.', 'No drill tomorrow!'] },
    {
      lines: [
        'Left, right, left…',
        'Keep your match dry and your tithe hot.',
        'Noon gun\'s late again.',
        'They tested the mines at dawn. Ears still ringing.',
        'Hot enough to light a match from, the Prince says. Every hearth.',
        'Mind the kegs, they roll.',
        'Saw the Prince on the range. He was laughing.',
      ],
    },
  ],
};
