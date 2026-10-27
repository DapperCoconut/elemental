import type { AreaDef, NpcDef, NpcLook, Talk } from '../../../../IslesTypes';
import { ABY } from './palette';
import { BREATHWORKS, GAPE, H, PLAZA, SHOP, STAIR, TRENCH, W } from './layout';
import { SOLIDS } from './layout';
import { makeAbyssalPainter } from './painter';

/**
 * The Abyssal Court — a sunken city inside one vast bubble of air at the bottom of the trench.
 * The people here are the families of the drowned: when the Queen leaves a house under, its
 * sleepers are carried down the maelstrom stair to the Undertow, and their kin follow as far
 * down as anyone can go and still breathe. Prince Lanternjaw governs them. He sells them their
 * air through the Breathworks, and his lure hangs over every house the Queen means to take.
 */

const QUEEN = { monarch: 'maresa' };
const PRINCE = { prince: 'lanternjaw' };

// ── People ───────────────────────────────────────────────────────────

const gilly: NpcDef = {
  id: 'abyssal-gilly',
  name: 'Purser Gilly Barnacle',
  title: 'The Pressure Hull',
  look: { body: 0x7a6a5e, accent: 0x1f2c48, hand: 0x5a4a40, hat: 'cap', traits: ['satchel', 'glasses'], size: 1.2 },
  at: { x: SHOP.x, y: SHOP.y + 34 },
  role: { kind: 'shop', id: 'abyssal-shop' },
  talks: [
    { when: QUEEN, lines: [
      'The Queen\'s gone and the tide\'s just the tide again. I\'m selling charms to people who mean to go UP.',
      'Up! Do you know how long since anyone bought anything down here for going up?',
    ] },
    { when: PRINCE, lines: [
      'No more lure over the houses. My till doesn\'t know what to do with itself — folk are buying for joy.',
      'Charms on the counter. Same prices. I\'m kind, not daft.',
    ] },
    { when: { questDone: 'abyssal-lamps' }, lines: [
      'Nell says you kept the lamps lit on her row. That\'s the row my mother lives on. Thank you.',
      'Have a look at the wares. A diver who keeps lamps lit deserves something that keeps her lit.',
    ] },
    { lines: [
      'Welcome aboard the Pressure Hull. She was a purser\'s bell once. Now she\'s a purser\'s shop.',
      'Charms for the deep — every one tried on somebody braver than me. Fish bought, too. Trench fish fetch silver.',
      'Mind your breath in here. The Breathworks pumps by the coin, and I\'m behind on my share.',
    ] },
  ],
  barks: [
    { when: PRINCE, lines: ['Fresh air! Well. Recycled air, but FREE recycled air!'] },
    { lines: ['Pressure Hull, open for trade.', 'No credit. Credit drowns.', 'Lanternfish, gulper, grenadier — I buy the lot.'] },
  ],
};

const nell: NpcDef = {
  id: 'abyssal-nell',
  name: 'Nell Wickfin',
  title: 'Lamplighter',
  look: { body: 0x8a7a6a, accent: 0x2a3a30, hand: 0x6a5a4a, hat: 'souwester', traits: ['lantern', 'pack'], size: 0.95, eye: 0xffe9a8 },
  at: { x: 980, y: 1500 },
  wander: 80,
  talks: [
    { when: QUEEN, lines: [
      'I lit the whole row last night and nobody came down the stair after the light. Not one.',
      'I sat on a step and cried into my roe-bucket. Good crying. The anglers watched me like they understood.',
    ] },
    { when: PRINCE, lines: [
      'His lure\'s out. The big one over the Gape. You can see the ceiling of the bubble for the first time in years.',
      'It\'s just water. Black, cold water. I thought it would be scarier. It isn\'t, without him hanging in it.',
    ] },
    { when: { questDone: 'abyssal-lamps' }, lines: [
      'Every lamp on the row is feeding and fat. Pike\'s snuffing-pole is in my woodpile. Lovely kindling.',
      'A lamp that\'s lit means a house that\'s paid, as far as the prince is concerned. Paid or not, they\'re lit now.',
    ] },
    { lines: [
      'Every lamp in this city is a live angler in a jar. Feed it glow-roe, it lights your door. Starve it, it dies.',
      'The prince says a dark door is a door that hasn\'t paid for its light. Dark doors are the ones his lure finds.',
      'I light them anyway. Somebody has to.',
    ] },
  ],
  barks: [
    { when: PRINCE, lines: ['Lamps for everyone!', 'Who wants roe? Nobody? Fine, the anglers do.'] },
    { lines: ['There, there, little lamp.', 'Hungry, aren\'t you.', 'Roe\'s short again.', 'Keep your door lit, love.'] },
  ],
};

const coddle: NpcDef = {
  id: 'abyssal-coddle',
  name: 'Coddle Ribwright',
  title: 'Bone-Carver',
  look: { body: 0x9a8a72, accent: 0x3a3028, hand: 0x7a6a52, hat: 'none', traits: ['beard', 'tool', 'apron'], size: 1.2 },
  at: { x: 440, y: 1430 },
  talks: [
    { when: QUEEN, lines: [
      'I\'m carving a cradle out of a jawbone. Nobody\'s had a baby down here in nine years. Now somebody has.',
      'Old Grey would have liked that. Whales are fond of children. Everybody knows that.',
    ] },
    { when: PRINCE, lines: [
      'The Gape\'s doors were open this morning. Folk walked right into his jaws and nobody got bit.',
      'I\'ve been asked to carve a plaque for the gate. I\'m thinking: "MIND THE TEETH". Just that.',
    ] },
    { when: { questDone: 'abyssal-ribs' }, lines: [
      'Old Grey\'s ribs are ours again. Vey\'s chisels are at the bottom of the trench where they belong.',
      'I\'m carving the names of the left-under into the long rib. Every house. Take your time reading them.',
    ] },
    { lines: [
      'That\'s Old Grey. Fell here before there was a bubble, before there was a city. We built round her.',
      'Every bone in this city is hers or her cousins\'. Every lamp-post, every arch. She keeps us up.',
      'And now the prince wants her ribs for his throne room. Orla\'s picking her clean for him, bit by bit.',
    ] },
  ],
  barks: [
    { when: PRINCE, lines: ['MIND THE TEETH. Good plaque, that.'] },
    { lines: ['*scrape*  ...  *scrape*', 'Grain runs this way, see.', 'Good old girl.', 'Bone remembers.'] },
  ],
};

const mira: NpcDef = {
  id: 'abyssal-mira',
  name: 'Mira Fathom',
  title: 'Letter-Writer',
  look: { body: 0xa08a78, accent: 0x5c7a96, hand: 0x806a5a, hat: 'beanie', traits: ['satchel'], size: 0.72 },
  at: { x: 2220, y: 830 },
  talks: [
    { when: QUEEN, lines: [
      'Da\'s AWAKE. He came up the stair with everyone else, all blinking and confused, asking why it\'s so dark.',
      'He read every one of my letters. He says my spelling is awful. He says it like it\'s the best news ever.',
    ] },
    { when: PRINCE, lines: [
      'You beat the prince. Quell says that\'s one door, and the stair has six locks. Five more to go, then.',
      'I\'m writing Da about it. A long one. With pictures.',
    ] },
    { when: { questDone: 'abyssal-letters' }, lines: [
      'Quell took my letters down himself. He said he\'d put them in Da\'s hand. Quell hasn\'t the face for lying.',
      'Grell\'s hook bent right in half. I kept a bit. It\'s on a string. It\'s my lucky hook.',
    ] },
    { lines: [
      'My Da\'s house got left under. He wasn\'t awake to pay, he was ill. The tide came in and took the whole floor.',
      'They say the drowned aren\'t dead, just sleeping down in the Undertow. "Ballast for the crown."',
      'I write him letters and push them through the wall in bottles. I don\'t know if the deep gives them to him.',
    ] },
  ],
  barks: [
    { when: PRINCE, lines: ['Dear Da — guess WHAT.'] },
    { lines: ['Dear Da,', 'How do you spell "Undertow"?', 'One more bottle.', 'I\'m not crying, it\'s condensation.'] },
  ],
};

const quell: NpcDef = {
  id: 'abyssal-quell',
  name: 'Ferryman Quell',
  title: 'Keeper of the Maelstrom Stair',
  look: { body: 0x4a5866, accent: 0x161e2a, hand: 0x2e3844, hat: 'hood', traits: ['lantern', 'cane'], size: 1.3, eye: 0xbfe8ff },
  at: { x: 1060, y: 252 },
  talks: [
    { when: QUEEN, lines: [
      'I carried them down. Two hundred and eleven, one at a time, asleep in my arms. Now they walk up past me.',
      'Some of them thank me. I do not know what to say to that. I say "mind the fourth step". It is loose.',
    ] },
    { when: { princesOfIsle: 'water', count: 6 }, lines: [
      'All six lamps on the jaw-arch have gone out. Every one of her children has fallen.',
      'The stair will let you down now. At the bottom: the Undertow, the Queen on her clam, and all our sleepers.',
      'Go carefully. The current pulls toward her. It always has.',
    ] },
    { when: PRINCE, lines: [
      'The amber lamp on the arch is dark. That was his. I watched it gutter out like a candle.',
      'Five still burn. Until all six go out, the stair will not let down anyone who means to come back.',
    ] },
    { when: { questDone: 'abyssal-letters' }, lines: [
      'I put the girl\'s letter in her father\'s hand. He did not wake. But his fingers closed on it.',
      'Do not tell her that part. Tell her he has it. That is true enough.',
    ] },
    { lines: [
      'This is the maelstrom stair. It goes down. Further down than down. The Undertow is at the bottom.',
      'Six lamps on the arch, one for each of the Queen\'s children. While any burns, the stair is shut to the living.',
      'I carry the drowned down. That is my office. I am not proud of it. I am careful with it.',
    ] },
  ],
  barks: [
    { when: QUEEN, lines: ['Mind the fourth step.'] },
    { lines: ['Stand back from the stair.', 'Six lamps. Count them.', 'The current is strong tonight.', 'Hush. They are sleeping.'] },
  ],
};

const dorrit: NpcDef = {
  id: 'abyssal-dorrit',
  name: 'Dorrit Gulpwell',
  title: 'Trench Angler',
  look: { body: 0x8a6a56, accent: 0x2a3c46, hand: 0x6a4e3e, hat: 'souwester', traits: ['rod', 'pipe'], size: 1.05 },
  at: { x: TRENCH.x - 50, y: 1060 },
  talks: [
    { when: QUEEN, lines: [
      'Folk come down to fish the trench on PURPOSE now. Tourists! In an air bubble! I charge them for the jetty.',
    ] },
    { when: PRINCE, lines: [
      'The prince used to fish here at night. Didn\'t need a rod. Just hung his lure over the drop and waited.',
      'Everything came up to look. Then it didn\'t go back down.',
    ] },
    { when: { questDone: 'abyssal-gulper' }, lines: [
      'You\'ve the wrist for it now. Come back when the grenadiers run — they come up white as ghosts in spring.',
      'And if you see Volta\'s eel-pots, kick them in. I\'ll pretend I didn\'t see.',
    ] },
    { lines: [
      'You can\'t fish the trench with driftwood. The pressure down there crushes a soft rod like a biscuit.',
      'Whalebone, that\'s what you want. Brinehollow\'s tackle shop carves them. Pricey. Worth it.',
      'Lanternfish shallow, gulpers deeper, and ghost grenadiers right at the bottom of the line. If you\'re patient.',
    ] },
  ],
  barks: [
    { lines: ['Line\'s singing.', 'Come on, you ugly beauty.', 'Something big just looked at me.', 'Don\'t lean over the drop.'] },
  ],
};

const ilse: NpcDef = {
  id: 'abyssal-ilse',
  name: 'Breathwarden Ilse Corran',
  title: 'Keeper of the Breathworks',
  look: { body: 0x6a6e78, accent: 0x2a3446, hand: 0x4a4e58, hat: 'diving', traits: ['book', 'glasses'], size: 1.0, eye: 0xbfe8ff },
  at: { x: BREATHWORKS.x + 20, y: BREATHWORKS.y + 52 },
  talks: [
    { when: QUEEN, lines: [
      'I took the meter off the drum. It\'s in the trench. The bellows pump the same either way — they always did.',
      'The meter never did anything but count. That\'s all I did, too. I\'m learning to do other things.',
    ] },
    { when: PRINCE, lines: [
      'I opened the valves. All of them. The whole city took a breath at once — you could hear it, like a sigh.',
      'Rusk\'s locked out of the Breathworks. The air belongs to whoever is breathing it. That\'s the rule now.',
    ] },
    { when: { questDone: 'abyssal-lanternjaw' }, lines: [
      'Every house breathing, no meter, no tithe. I keep checking the gauges in case it\'s a mistake.',
      'It isn\'t a mistake. It\'s just air.',
    ] },
    { when: { courtReady: 'abyssal' }, lines: [
      'Every champion in the city, beaten. I\'ve watched the meter — folk have stopped paying on the strength of it.',
      'I have a thing to ask. I\'ve wanted to ask it for eleven years.',
    ] },
    { lines: [
      'Breathwarden. I keep the bellows pumping and the meter ticking. Every household pays for its share of air.',
      'A house that falls behind gets its valve turned down. Then the prince\'s lure starts hanging over it at night.',
      'I don\'t turn the valves. Rusk does. I only write down whose they were.',
    ] },
  ],
  barks: [
    { when: PRINCE, lines: ['Breathe, everyone. Go on. It\'s free.'] },
    { lines: ['Pressure nominal.', 'Forty-one households in arrears.', 'In, two, three. Out, two, three.', 'Mind the drum, it\'s hot.'] },
  ],
};

const ostrac: NpcDef = {
  id: 'abyssal-ostrac',
  name: 'Brother Ostrac',
  title: 'Lapsed Tidepriest',
  look: { body: 0x5a6470, accent: 0x1a2c3a, hand: 0x3e4852, hat: 'hood', traits: ['scarf', 'book', 'bandage'], size: 1.0, eye: 0x9fe4ff },
  at: { x: 2030, y: 1420 },
  talks: [
    { when: QUEEN, lines: [
      'I preached the tide was the Queen\'s will for twenty years. Then the Queen fell and the tide came in anyway.',
      'So it was never hers. It was only ever the sea. That is a much better sermon. Short, too.',
    ] },
    { when: PRINCE, lines: [
      'Varn will want me back at the altar, now the prince is down. He will want someone to blame the tide on.',
      'He can blame it on the moon. The moon does not mind.',
    ] },
    { when: { encounter: 'abyssal-leviathan' }, lines: [
      'You stood in the Leviathan\'s shadow and walked out of it. Varn has preached for years that nobody can.',
      'There is no Leviathan, you know. Or there is, and it is very old, and it has never cared about any of us.',
    ] },
    { lines: [
      'I was a tidepriest. Varn\'s acolyte. We blew the conch before every Dry Tithe and told folk it was holy.',
      'One night I saw the shadow pass over the bubble, as big as the city. It was not holy. It was hungry.',
      'Varn calls it the Leviathan and says it eats the faithless. It eats whatever stands still. I left.',
    ] },
  ],
  barks: [
    { lines: ['Do not stand still in the dark.', 'The conch was only ever a shell.', 'Hush. It is passing over.'] },
  ],
};

const pip: NpcDef = {
  id: 'abyssal-pip',
  name: 'Pip Bellweather',
  title: 'Helmet-Diver (Apprentice)',
  look: { body: 0xb09078, accent: 0xc39744, hand: 0x8a7060, hat: 'diving', traits: ['pack'], size: 0.7 },
  at: { x: PLAZA.x + 110, y: PLAZA.y + 120 },
  wander: 110,
  talks: [
    { when: QUEEN, lines: [
      'I went UP! In the bell! To the TOP! There\'s a whole sky and it doesn\'t have a skin on it! It just keeps GOING!',
    ] },
    { when: PRINCE, lines: [
      'You beat Lanternjaw! I saw the lure go out from the plaza! Everyone cheered, then shushed for the anglers.',
    ] },
    { lines: [
      'This is my helmet. It\'s too big. I\'m growing into it. Odo says he grew INTO his and now he can\'t grow out.',
      'Don\'t look at the lure over the Gape too long. It makes you want to walk to it. That\'s how it gets you.',
    ] },
  ],
  barks: [
    { when: PRINCE, lines: ['No more lure! No more lure!'] },
    { lines: ['*bonk*  ...ow.', 'I can see my breath on the glass!', 'Race you to the arch!', 'I\'m not scared of the dark. Much.'] },
  ],
};

const NPCS: NpcDef[] = [gilly, nell, coddle, mira, quell, dorrit, ilse, ostrac, pip];

// ── Crowd ────────────────────────────────────────────────────────────

const DEEP_LOOKS: NpcLook[] = [
  { body: 0x7a6a5e, accent: 0x1f2c48, hat: 'souwester', traits: ['lantern'] },
  { body: 0x6a5e56, accent: 0x2a3a30, hat: 'beanie', traits: ['scarf'] },
  { body: 0x8a7a6a, accent: 0x3a3028, hat: 'none', traits: ['pack', 'bandage'], size: 1.1 },
  { body: 0x5e6670, accent: 0x161e2a, hat: 'diving', traits: ['satchel'], size: 0.95 },
  { body: 0x9a8676, accent: 0x5c3a4a, hat: 'hood', traits: ['scarf'] },
  { body: 0xa08a78, accent: 0x2a4a5a, hat: 'cap', traits: ['rod'], size: 0.85 },
];

const CROWD_BARKS: Talk[] = [
  { when: QUEEN, lines: [
    'My brother walked up the stair this morning!', 'I\'m going up in the bell tomorrow. Just to look.',
    'Is that what the sky does? Just — stays there?', 'Nobody\'s been left under all week.',
  ] },
  { when: PRINCE, lines: [
    'The lure\'s OUT.', 'I looked straight at the Gape and nothing happened.', 'Valves are open!',
    'Did you hear the whole city breathe in?',
  ] },
  { lines: [
    'Keep your lamp fed.', 'The meter ticked twice on me today.', 'Don\'t look at the lure.',
    'Did you feel the shadow pass?', 'Two more coin and we\'re square for the month.', 'My cousin\'s house is under now.',
    'Mind the drop by the jetty.', 'Breathe slow. It\'s cheaper.',
  ] },
];

// ── The area ─────────────────────────────────────────────────────────

export const ABYSSAL_AREA: AreaDef = {
  id: 'abyssal',
  isle: 'water',
  court: 'abyssal',
  name: 'The Abyssal Court',
  subtitle: 'A city in a bubble at the bottom of the trench',
  w: W,
  h: H,
  bg: ABY.abyss,
  accent: 0x39c6d6,
  weather: 'bubbles',
  spawn: { x: 1200, y: 1690 },
  painter: makeAbyssalPainter(),
  solids: SOLIDS,
  exits: [
    { side: 's', to: 'tidewater', label: 'Up the bell-lift to the Tidewater Court' },
  ],
  pois: [
    { kind: 'encounter', id: 'abyssal-lure' },
    { kind: 'encounter', id: 'abyssal-crush' },
    { kind: 'encounter', id: 'abyssal-whale-fall' },
    { kind: 'encounter', id: 'abyssal-glow' },
    { kind: 'encounter', id: 'abyssal-leviathan' },
    { kind: 'prince', id: 'lanternjaw', at: { x: GAPE.x, y: GAPE.y + 72 } },
    { kind: 'waystone', at: { x: 1310, y: 1650 } },
    {
      kind: 'door',
      at: { x: STAIR.x, y: 180 },
      to: 'undertow',
      arrive: { x: 900, y: 2460 },
      label: 'The Maelstrom Stair',
      open: { princesOfIsle: 'water', count: 6 },
      lockedText: 'Six lamps burn on the jaw-arch, one for each of the Queen\'s children. The stair stays shut till all are out.',
    },
    { kind: 'water', id: 'abyssal-trench', shape: { x: TRENCH.x, y: TRENCH.y, w: TRENCH.w, h: TRENCH.h }, fishery: 'abyssal-trench' },
    { kind: 'sign', at: { x: 1262, y: 1560 }, text: 'North: Lamplight Square, the Gape and the Maelstrom Stair. East: the trench. West: Old Grey.' },
    { kind: 'sign', at: { x: 1740, y: 1140 }, text: 'THE TRENCH. Whalebone rods only. Do not lean over the drop. — D. Gulpwell' },
    { kind: 'sign', at: { x: 980, y: 950 }, text: 'BREATHWORKS. Every household pays its share. Valves in arrears will be turned down. — by order of the Prince' },
    { kind: 'chest', id: 'abyssal-chest-gardens', at: { x: 2230, y: 650 }, coins: 140, orbs: 1 },
    { kind: 'chest', id: 'abyssal-chest-skull', at: { x: 150, y: 1310 }, coins: 110, open: { encounter: 'abyssal-whale-fall' } },
  ],
  npcs: NPCS,
  crowd: {
    count: 8,
    looks: DEEP_LOOKS,
    paths: [
      [{ x: 1200, y: 1660 }, { x: 1205, y: 1300 }, { x: 1200, y: 1220 }, { x: 1080, y: 1000 }, { x: 1200, y: 1220 }],
      [{ x: 960, y: 1540 }, { x: 720, y: 1570 }, { x: 460, y: 1520 }, { x: 720, y: 1570 }],
      [{ x: 1320, y: 1000 }, { x: 1440, y: 1000 }, { x: 1620, y: 1050 }, { x: 1440, y: 1000 }],
      [{ x: 1250, y: 1400 }, { x: 1460, y: 1450 }, { x: 1720, y: 1450 }, { x: 1950, y: 1500 }, { x: 1720, y: 1450 }],
      [{ x: 1190, y: 700 }, { x: 960, y: 650 }, { x: 740, y: 610 }, { x: 960, y: 650 }],
      [{ x: 1300, y: 545 }, { x: 1440, y: 560 }, { x: 1700, y: 520 }, { x: 1440, y: 560 }],
      [{ x: 960, y: 1020 }, { x: 800, y: 1090 }, { x: 960, y: 1020 }, { x: 1100, y: 1010 }],
    ],
    barks: CROWD_BARKS,
  },
};
