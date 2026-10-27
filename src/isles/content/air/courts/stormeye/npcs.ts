import type { AreaDef, Cond, NpcDef, NpcLook } from '../../../../IslesTypes';

/**
 * The people of the Stormeye Court. They live in the one calm place in a storm that never ends,
 * and they pay for it twice: the Breath Tax every chest on Highspire pays, and the Prince's own
 * levy on the calm itself. Every dawn Prince Squall posts the forecast, and the forecast is a
 * ledger — streets in arrears are named for "weather", and that night the wall behind them comes
 * down a course and the gale walks in. They are wet, stubborn, practical people who count the
 * seconds between flash and thunder without thinking about it. Blocks are listed most specific
 * first: King fallen → Prince fallen → quest done → quest underway → default.
 */

const KING: Cond = { monarch: 'aerion' };
const PRINCE: Cond = { prince: 'squall' };

export const STORMEYE_NPCS: NpcDef[] = [
  {
    id: 'stormeye-brassey',
    name: 'Mercy Brassey',
    title: 'Storm Chandler',
    look: { body: 0xe8c8a8, accent: 0xe8c23a, hat: 'souwester', traits: ['apron', 'lantern'], size: 1.05 },
    at: { x: 520, y: 790 },
    role: { kind: 'shop', id: 'stormeye-shop' },
    talks: [
      { when: KING, lines: ['Sold my last oilskin to a man going UP to the Lung to smash bottles. Gave him a discount. Twice.', 'There\'s sun on the wall-walk some mornings now. I don\'t know what to stock for sun.'] },
      { when: PRINCE, lines: ['No forecast posted this morning. Nobody knows what to wear. Business has never been better.', 'Charms on the bench. The copper\'s honest even when the weather isn\'t.'] },
      { when: { questDone: 'stormeye-torn-row' }, lines: ['Orrin bought every sack of mortar I had for the Torn Row. Paid in coin, not breath. I nearly wept.'] },
      { lines: ['Brassey\'s. Oilskins, copper braid, storm glass, and charms for folk who\'d like to see tomorrow.', 'Everything here has been struck by lightning at least once. That\'s not a boast, it\'s just Stormeye.'] },
    ],
    barks: [
      { when: KING, lines: ['Sunhats? Do we sell sunhats?', 'Blue sky. Imagine.'] },
      { when: PRINCE, lines: ['No forecast! Ha!', 'Copper, coats, charms.'] },
      { lines: ['Oilskins! Dry as a sermon!', 'Copper braid by the yard.', 'Mind the gutter, it bites.'] },
    ],
  },
  {
    id: 'stormeye-tamsin',
    name: 'Tamsin Furrow',
    title: 'Last Tenant of the Torn Row',
    look: { body: 0xdcc0a8, accent: 0x5a6070, hat: 'hood', traits: ['scarf', 'cane'], size: 0.92 },
    at: { x: 1690, y: 1250 },
    talks: [
      { when: KING, lines: ['My Hob\'s breath came down from the Lung in its bottle. I uncorked it at the window. The whole row cheered.'] },
      { when: PRINCE, lines: ['Orrin\'s building the wall back up behind us. A course a day. Nobody\'s knocking it down tonight.'] },
      { when: { questDone: 'stormeye-torn-row' }, lines: ['Hob\'s barometer, his pipe, the kettle. All back on my shelf, all dented. They look braver dented.', 'Hask won\'t come down this row again. He walks the long way round. Good.'] },
      { when: { quest: 'stormeye-torn-row' }, lines: ['The clerk at the Meter Office keeps the arrears book. He\'ll tell you why the Row was named. He\'s not cruel.'] },
      { lines: ['Three weeks behind on the calm-rent, and the forecast said "Torn Row: weather". That night the wall came down.', 'The gale took the roof off over my head and everything we owned out the window. My Hob\'s things. Gone over.'] },
    ],
    barks: [
      { when: { questDone: 'stormeye-torn-row' }, lines: ['Dented and braver.', 'A course a day.'] },
      { lines: ['Torn Row: weather.', 'Hob\'s kettle. Hob\'s glass.', 'Every night it comes over.'] },
    ],
  },
  {
    id: 'stormeye-crane',
    name: 'Nimbus Crane',
    title: 'Tally-Clerk of the Meter Office',
    look: { body: 0xe8dccc, accent: 0xc9a440, hat: 'tophat', traits: ['book', 'glasses'], size: 0.98 },
    at: { x: 900, y: 1215 },
    talks: [
      { when: KING, lines: ['The bottles are all going back where they came from. I am writing the address on every cork. In my best hand.'] },
      { when: PRINCE, lines: ['The arrears book is closed. I sat on it, to be sure. Then I posted a forecast of my own: "Fair."'] },
      { when: { questDone: 'stormeye-bottled-breath' }, lines: ['Bottle four-four-seven-one is entered as "broken in transit". The ink was very steady. I practised.'] },
      { when: { quest: 'stormeye-bottled-breath', stage: 1 }, lines: ['Third rack, east side. The cork with the blue seal. Please don\'t take any others. Please take some others.'] },
      { when: { quest: 'stormeye-torn-row', stage: 1 }, lines: ['Hask has the Row\'s things in his cart for the Lung auction. Kettles, glasses, pipes. Tagged "salvage".'] },
      { lines: ['Breath Tax at the left window, calm-rent at the right. Every breath above the cloud line, metered. Next.', 'I only add the numbers. I don\'t make them. I tell myself that every morning, and it is getting harder.'] },
    ],
    barks: [
      { when: PRINCE, lines: ['Forecast: fair.', 'Closed. Sat on.'] },
      { lines: ['Next window, please.', 'Every breath, metered.', 'I only add the numbers.'] },
    ],
  },
  {
    id: 'stormeye-ozias',
    name: 'Ozias Wick',
    title: 'Lamplighter',
    look: { body: 0xd8b898, accent: 0x3a4048, hat: 'cap', traits: ['lantern', 'pack', 'beard'], size: 1.1 },
    at: { x: 800, y: 830 },
    wander: 90,
    talks: [
      { when: KING, lines: ['Elsie\'s up and running about. Too much breath in her now, she says. I told her that\'s not possible.'] },
      { when: PRINCE, lines: ['I lit every lamp in Stormeye last night and none of them were for the tax-carts. It felt like a festival.'] },
      { when: { questDone: 'stormeye-bottled-breath' }, lines: ['Elsie\'s breath, home in its bottle. She\'s still asleep — they\'re always asleep till the King goes.', 'But I open the cork a crack at night so she can hear the rain. Her eyelids flutter.'] },
      { when: { quest: 'stormeye-bottled-breath' }, lines: ['Crane\'s at the Meter Office. Don\'t be loud with him. Loud makes him write things down.'] },
      { lines: ['Lamplighter. I light the way for the tax-carts going up to the Lung. Every night. Every cart.', 'One of those bottles is my Elsie\'s breath. She\'s eleven. She sleeps in our back room and barely breathes.'] },
    ],
    barks: [
      { when: PRINCE, lines: ['Lamps for nobody!', 'A festival of wicks.'] },
      { lines: ['Lamps for the carts. Always the carts.', 'Eleven. She\'s eleven.', 'Wick and flint, wick and flint.'] },
    ],
  },
  {
    id: 'stormeye-nan',
    name: 'Nan Drizzle',
    title: 'Cook at the Great Cistern',
    look: { body: 0xe4c4a4, accent: 0x4fa08c, hat: 'beanie', traits: ['apron', 'rod'], size: 1.15 },
    at: { x: 1590, y: 1030 },
    talks: [
      { when: KING, lines: ['Fish soup for the whole isle, I said. They came up from Windlass with pots. I said: bring bigger pots.'] },
      { when: PRINCE, lines: ['No permits, no Dredge, no tithe. Just a woman, a pot and a cistern. Pull up a crate.'] },
      { when: { questDone: 'stormeye-cistern-supper' }, lines: ['Shad stew on the boil and a crab for the becalmed, mashed fine so they can sip it.', 'Every Thursday from now on. Dredge can come and eat it if he likes. He won\'t.'] },
      { when: { quest: 'stormeye-cistern-supper', stage: 1 }, lines: ['Crabs hide in the hail at the bottom. Cold, slow, and sweet as you like. Bring me one.'] },
      { when: { quest: 'stormeye-cistern-supper' }, lines: ['Shad first. They come up in the rain, silver as a flash. Any rod does.'] },
      { lines: ['I feed the becalmed. Broth, mostly — they can\'t chew asleep. The cistern\'s fish are the best thing for it.', 'But Sluicewarden Dredge says the fish are the Prince\'s rain, so they\'re the Prince\'s fish. Permits only.'] },
    ],
    barks: [
      { when: PRINCE, lines: ['Pull up a crate!', 'No permits, love.'] },
      { lines: ['Broth for the sleepers.', 'Shad in the rain.', 'Permits, he says. Permits.'] },
    ],
  },
  {
    id: 'stormeye-maud',
    name: 'Maud Isobar',
    title: 'Weatherwife',
    look: { body: 0xe8d0c0, accent: 0x6a88a8, hat: 'plume', traits: ['glasses', 'book'], size: 0.96 },
    at: { x: 880, y: 470 },
    talks: [
      { when: KING, lines: ['Forecast for Highspire: breath, plenty, for everyone. No charge. You may quote me.'] },
      { when: PRINCE, lines: ['The great needle has swung to CHANGE and stuck there. Best reading I\'ve seen in fifty years.'] },
      { when: { questDone: 'stormeye-false-glass' }, lines: ['Mercurio\'s glass is in the Calm, smashed, and the mercury\'s all run into the cracks of the rose.', 'My posts read true. The air\'s heavy over the Row and light over the Tower. The town can see it now.'] },
      { when: { quest: 'stormeye-false-glass' }, lines: ['Three posts: by me, by the Lightning Jar, and out by the east cisterns. Read the glass on each.'] },
      { lines: ['I\'ve read the weather here for fifty years.', 'The Prince\'s forecast isn\'t weather. It\'s a debt-list with clouds on it.', 'And his Glass-Reader fiddles the great dial so the town believes it. I can prove it, with my posts.'] },
    ],
    barks: [
      { when: PRINCE, lines: ['CHANGE. Stuck at CHANGE!', 'Fifty years for this.'] },
      { lines: ['Glass is falling. As ever.', 'Wind sou\'-sou\'-west. As ever.', 'A debt-list with clouds on it.'] },
    ],
  },
  {
    id: 'stormeye-pip',
    name: 'Pip Lull',
    title: 'Clapper\'s Apprentice',
    look: { body: 0xf0d4b8, accent: 0x7a4428, hat: 'aviator', traits: ['satchel'], size: 0.72 },
    at: { x: 720, y: 740 },
    wander: 50,
    talks: [
      { when: KING, lines: ['I counted to forty yesterday between a flash and a thunder. FORTY. The storm\'s going away!'] },
      { when: PRINCE, lines: ['Boom lets me shake the thunder-sheet now. I\'m better at it than the sky.'] },
      { when: { encounter: 'stormeye-thunderclap' }, lines: ['You beat Boom! He says you counted it in right. He says that\'s the only thing that matters.'] },
      { lines: ['Flash — one, two, three — BOOM. Three is a mile. That\'s how far the bang is. Boom taught me.', 'If you can\'t count to three before it, run. That\'s the other thing Boom taught me.'] },
    ],
    barks: [
      { when: PRINCE, lines: ['Shake, shake, BOOM!', 'Better than the sky!'] },
      { lines: ['One… two… three…', 'Three is a mile!', 'I\'m not scared. Much.'] },
    ],
  },
  {
    id: 'stormeye-orrin',
    name: 'Orrin Stack',
    title: 'Wall-Mason',
    look: { body: 0xc0a088, accent: 0x6a7380, hat: 'helmet', traits: ['tool', 'beard'], size: 1.3 },
    at: { x: 1800, y: 1215 },
    talks: [
      { when: KING, lines: ['I\'m building a window into the storm wall. A big one. So the children can watch the gale and not be in it.'] },
      { when: { questDone: 'stormeye-into-the-eye' }, lines: ['The anchors are out of the tower and the eye\'s holding on its own. Turns out the calm was never his.'] },
      { when: PRINCE, lines: ['The storm\'s still out there. It\'ll always be out there. But nobody gets to point it at a street again.'] },
      { when: { quest: 'stormeye-into-the-eye' }, lines: ['Three storm-anchor keys: one at each gate and one in the breach.', 'Turn them, and the tower\'s grip on the eye slips.'] },
      { when: { questDone: 'stormeye-torn-row' }, lines: ['Hask\'s hammer is under my bench. I\'m relaying the Row\'s wall with it. A course a day.', 'Come back when you\'ve a mind to go further. There\'s more to the eye than a wall.'] },
      { lines: ['I built that wall. Forty years of it.', 'And I watched them knock the top off behind the Row for three weeks\' rent.', 'I could put it back by morning. But Wallwarden Hask stands there with his maul and the forecast in his fist.'] },
    ],
    barks: [
      { when: PRINCE, lines: ['Nobody points the storm.', 'Course and mortar.'] },
      { lines: ['Forty years of wall.', 'Three weeks\' rent. Three.', 'A course a day.'] },
    ],
  },
];

const OILSKIN: NpcLook = { body: 0xe0c4a4, accent: 0xe8c23a, hat: 'souwester', traits: ['scarf'] };
const RODWRIGHT: NpcLook = { body: 0xc8a888, accent: 0xc07a44, hat: 'goggles', traits: ['tool'] };
const COLLECTOR: NpcLook = { body: 0xd8ccbc, accent: 0xc9a440, hat: 'tophat', traits: ['book'] };
const AERONAUT: NpcLook = { body: 0xe8d0b8, accent: 0x6a4a3a, hat: 'aviator', traits: ['pack'] };
const CHILD: NpcLook = { body: 0xf0d4c0, accent: 0xe8c23a, hat: 'souwester', size: 0.72 };
const OLDTIMER: NpcLook = { body: 0xc8b0a0, accent: 0x5a6070, hat: 'cap', traits: ['pipe', 'beard', 'cane'], size: 1.05 };

export const STORMEYE_CROWD: NonNullable<AreaDef['crowd']> = {
  count: 13,
  looks: [OILSKIN, RODWRIGHT, COLLECTOR, AERONAUT, CHILD, OLDTIMER, OILSKIN, OILSKIN],
  paths: [
    // The main street, gate to Calm.
    [{ x: 280, y: 820 }, { x: 700, y: 820 }, { x: 1000, y: 840 }, { x: 600, y: 810 }],
    // Round the Calm.
    [{ x: 1040, y: 860 }, { x: 1200, y: 700 }, { x: 1360, y: 860 }, { x: 1200, y: 1020 }],
    // Down to the Meter Office with the day's dues, and back.
    [{ x: 1080, y: 960 }, { x: 960, y: 1080 }, { x: 930, y: 1220 }, { x: 1000, y: 1000 }],
    // East street to the cistern.
    [{ x: 1380, y: 850 }, { x: 1600, y: 840 }, { x: 1600, y: 1010 }, { x: 1500, y: 860 }],
    // The south road and the inn.
    [{ x: 1200, y: 1060 }, { x: 1200, y: 1380 }, { x: 1480, y: 1110 }, { x: 1560, y: 1220 }],
    // Rod-wrights out to the field.
    [{ x: 1290, y: 720 }, { x: 1500, y: 590 }, { x: 1650, y: 600 }, { x: 1400, y: 680 }],
  ],
  barks: [
    { when: KING, lines: ['The bottles are coming home!', 'I breathed twice today. For free.', 'Blue sky over the wall!', 'The meters are off. Off!'] },
    { when: PRINCE, lines: ['No forecast today.', 'The Row\'s wall is going back up.', 'He\'s gone quiet up in the tower.', 'Nobody\'s weather but ours.'] },
    {
      lines: [
        'Flash — one, two, three…',
        'Forecast says "weather" for Gutter Lane.',
        'Calm-rent\'s due Friday. Breath Tax Monday.',
        'Don\'t stand between the rods.',
        'Shutters up, it\'s coming round again.',
        'They took the Lantry girl\'s breath last week.',
        'Breathe shallow. It\'s cheaper.',
        'The needle\'s at STORMY. When isn\'t it.',
      ],
    },
  ],
};
