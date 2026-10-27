import type { QuestDef } from '../../../../IslesTypes';

/**
 * Five small stories from the town in the eye. Each is about something the Prince's weather took
 * and the town taking it back: a widow's things blown off a torn-open street, a sleeping girl's
 * bottled breath, a cook's right to the rain, the truth about the great dial — and, at the last, the
 * calm itself, which was never his.
 */
export const STORMEYE_QUESTS: QuestDef[] = [
  {
    id: 'stormeye-torn-row',
    area: 'stormeye',
    name: 'Torn Row: Weather',
    giver: 'stormeye-tamsin',
    offer: [
      'Three weeks behind on the calm-rent, and the forecast said "Torn Row: weather".', 'That night they knocked our wall down.',
      'The gale came over and took my Hob\'s things out the window — his barometer, his pipe, the old kettle.', 'All I had of him.',
      'Some of it must have come down in the town. Ask the clerk at the Meter Office. He knows where things go.',
    ],
    accept: ['Thank you. Mind the gutters by the Row. They run like rivers when it comes over.'],
    stages: [
      {
        objective: {
          kind: 'talk', npc: 'stormeye-crane',
          lines: [
            'Furrow, Tamsin. Torn Row. Arrears, three weeks. Named for weather on the ninth. ...I wrote that. I\'m sorry.',
            'After the gale, Wallwarden Hask goes through a named street. He tags what he finds as "salvage".', 'It goes up to the Lung auction.',
            'Some of it blew clear before he got there — look round the Row\'s ends.', 'He has the rest on his cart, and his maul.',
          ],
        },
        hint: 'Ask Tally-Clerk Crane at the Meter Office where the Torn Row\'s things went',
      },
      {
        objective: {
          kind: 'collect', area: 'stormeye', label: 'Hob Furrow\'s keepsake', emoji: '🫖', color: 0xc07a44,
          spots: [{ x: 1660, y: 1250 }, { x: 1830, y: 1235 }, { x: 1975, y: 1140 }],
        },
        hint: 'Find Hob Furrow\'s barometer, pipe and kettle blown about the Torn Row',
      },
      {
        objective: {
          kind: 'duel', area: 'stormeye',
          foe: {
            id: 'stormeye-torn-row-duel',
            court: 'stormeye',
            name: 'Salvage Rights',
            foeName: 'Wallwarden Hask',
            foeElement: 'earth',
            difficulty: 4,
            gimmick: '',
            at: { x: 1620, y: 1290 },
            look: { body: 0xb8a08a, accent: 0x48505c, hat: 'helmet', traits: ['tool', 'beard'], size: 1.35 },
            challenge: [
              'That kettle\'s tagged. Salvage of a named street belongs to the court.', 'I knocked that wall down fair and square.',
              'Three courses off the top, by the forecast.', 'Every stone where I put it. Put the kettle back where the wind put it.',
            ],
            beaten: ['...Take the kettle. Take the lot. I\'ve knocked down nine streets\' walls. I can still hear every one of them.'],
            coins: 80,
          },
        },
        hint: 'Wallwarden Hask is claiming Hob\'s things as salvage — face him by the Torn Row',
      },
    ],
    complete: [
      'His barometer. Still stuck at STORMY. Hob always said it was the only honest thing in Stormeye.',
      'And the kettle — dented. It looks braver dented. Like the rest of us.',
      'Take this. It was for the calm-rent. I don\'t think I\'ll be paying it again.',
    ],
    reward: { orbs: 6, coins: 70 },
  },
  {
    id: 'stormeye-bottled-breath',
    area: 'stormeye',
    name: 'Bottle Four-Four-Seven-One',
    giver: 'stormeye-ozias',
    offer: [
      'Every night I light the way for the tax-carts going up to the Lung.', 'Every night. And one night it was my Elsie\'s breath on the cart.',
      'She\'s asleep in our back room. Becalmed. Eleven years old.', 'Her breath\'s in a bottle on the Meter Office racks, waiting for the next cart.',
      'If it goes up to the Lung, I\'ll never get it back. Ask Crane which bottle. He\'ll know. He numbers everything.',
    ],
    accept: ['Bless you. I\'ll leave the cart-lamps unlit tonight. Let them find the road in the dark.'],
    stages: [
      {
        objective: {
          kind: 'talk', npc: 'stormeye-crane',
          lines: [
            'Wick, Elsie. Bottle four-four-seven-one. Blue seal — the blue are children.', 'There are three blue seals on the east racks.',
            'I can\'t give you a bottle. I can turn round and count the window-panes for a while.', 'There are a great many panes.',
            'Bellweather loads the cart at dusk. He corks them himself. He\'d know if one was missing. He\'d mind.',
          ],
        },
        hint: 'Ask Tally-Clerk Crane which bottle on the racks holds Elsie Wick\'s breath',
      },
      {
        objective: {
          kind: 'collect', area: 'stormeye', label: 'Blue-sealed breath bottle', emoji: '🍾', color: 0x8ec8f0,
          spots: [{ x: 1010, y: 1200 }, { x: 1060, y: 1205 }, { x: 1185, y: 1262 }],
        },
        hint: 'Take the three blue-sealed bottles off the Meter Office\'s east racks and the cart',
      },
      {
        objective: {
          kind: 'duel', area: 'stormeye',
          foe: {
            id: 'stormeye-bottled-breath-duel',
            court: 'stormeye',
            name: 'Corked',
            foeName: 'Corker Bellweather',
            foeElement: 'air',
            difficulty: 4,
            gimmick: '',
            at: { x: 1000, y: 1270 },
            look: { body: 0xe0ccb8, accent: 0xc9a440, hat: 'tophat', traits: ['satchel', 'glasses'], size: 1.1 },
            challenge: [
              'Three bottles short on the cart. Three. Do you know what a bottle short costs? A breath for a breath, friend.',
              'I have corked four thousand people. I can cork one more without even taking off my gloves.',
            ],
            beaten: ['Keep them. Keep the bottles. ...I\'ll write "broken in transit". It happens. Glass is glass.'],
            coins: 75,
          },
        },
        hint: 'Corker Bellweather wants his bottles back — stop him at the Meter Office yard',
      },
    ],
    complete: [
      'Blue seal. Four-four-seven-one.', 'That\'s her handwriting on the tag — they make them write their own number. She dotted the sevens.',
      'I won\'t uncork it. They say it\'s dangerous before the King goes.', 'But I\'ll keep it by her bed so she can hear it.',
      'The other two blues — I\'ll find their families tonight. I know every door in this town; I light them all.',
    ],
    reward: { orbs: 6, coins: 60 },
  },
  {
    id: 'stormeye-cistern-supper',
    area: 'stormeye',
    name: 'Rain Belongs to Everybody',
    giver: 'stormeye-nan',
    offer: [
      'I feed the becalmed. Broth, mostly — you can\'t chew asleep.', 'Cistern fish make the best of it, and the cistern\'s right there.',
      'But Sluicewarden Dredge says the rain is the Prince\'s, so the fish in it are the Prince\'s.', 'So it\'s permits or nothing.',
      'Catch me two shad and a hailstone crab, and I\'ll cook in plain sight.', 'Let him come and take a sleeping girl\'s supper.',
    ],
    accept: ['Shad first — silver as a flash, they rise in the rain.', 'Any rod does. Crab after; they hide in the hail on the bottom.'],
    stages: [
      { objective: { kind: 'fish', fish: 'fish-squall-shad', count: 2 }, hint: 'Catch 2 Squall Shad in the Great Cistern' },
      {
        objective: {
          kind: 'deliver', npc: 'stormeye-nan', item: 'fish-hailstone-crab', count: 1,
          lines: [
            'Oh, look at him. White as hail and twice as cold.', 'Mashed fine with the shad, he\'ll go down a sleeper\'s throat like milk.',
            'There. Pot\'s on, smoke\'s up, and here comes a brass helmet down the cistern steps. Right on time.',
          ],
        },
        hint: 'Bring a Hailstone Crab to Nan Drizzle by the Great Cistern',
      },
      {
        objective: {
          kind: 'duel', area: 'stormeye',
          foe: {
            id: 'stormeye-cistern-supper-duel',
            court: 'stormeye',
            name: 'Permits Only',
            foeName: 'Sluicewarden Dredge',
            foeElement: 'depths',
            difficulty: 4,
            gimmick: '',
            at: { x: 1750, y: 1060 },
            look: { body: 0xa8b8c0, accent: 0x3a5a6e, hat: 'diving', traits: ['tool', 'satchel'], size: 1.25 },
            challenge: [
              'Unpermitted fish. Unpermitted fire. An unpermitted pot. That\'s three infractions and a smell.',
              'The rain falls on the Prince\'s town, so the rain is the Prince\'s.', 'I go down to the bottom of it so he doesn\'t have to.',
            ],
            beaten: ['...It does smell good. Fine. I didn\'t see a pot. I don\'t see very much through this glass anyway.'],
            coins: 75,
          },
        },
        hint: 'Sluicewarden Dredge has come for Nan\'s pot — stand by the cistern',
      },
    ],
    complete: [
      'Shad stew for the sleepers, every Thursday, permit or no permit. You\'re the first name on the list of cooks.',
      'Take a gar for your trouble. They only bite after thunder — count to three and strike, my mother used to say.',
    ],
    reward: { orbs: 5, coins: 50, item: 'fish-thunderhead-gar', itemCount: 1 },
  },
  {
    id: 'stormeye-false-glass',
    area: 'stormeye',
    name: 'The Glass Is Lying',
    giver: 'stormeye-maud',
    offer: [
      'I\'ve read the weather here for fifty years, and the great dial on the Tower has not told the truth for twenty.',
      'His Glass-Reader, Mercurio, sets the needle by the arrears book, not the air.', 'STORMY over the poor streets. FAIR over the Tower.',
      'My three posts read true. Take their readings, set them against the great dial, and you\'ll see.', 'Then tell him to his face.',
    ],
    accept: ['By me, by the Lightning Jar, and by the east cisterns. Read the little glass on each and bring it to the dial.'],
    stages: [
      {
        objective: {
          kind: 'collect', area: 'stormeye', label: 'Weather-post reading', emoji: '🌡️', color: 0xd04848,
          spots: [{ x: 862, y: 434 }, { x: 1540, y: 1312 }, { x: 1980, y: 655 }],
        },
        hint: 'Read the rain-glass on Maud\'s three weather posts',
      },
      { objective: { kind: 'visit', area: 'stormeye', at: { x: 1200, y: 560 }, r: 80, label: 'Under the great dial' }, hint: 'Hold the readings up against the great dial of the Barometer Tower' },
      {
        objective: {
          kind: 'duel', area: 'stormeye',
          foe: {
            id: 'stormeye-false-glass-duel',
            court: 'stormeye',
            name: 'High Pressure',
            foeName: 'Glass-Reader Mercurio',
            foeElement: 'pressure',
            difficulty: 5,
            gimmick: '',
            at: { x: 1090, y: 590 },
            look: { body: 0xe8e0d8, accent: 0xd0d8e0, hat: 'wizard', traits: ['glasses', 'book', 'cane'], size: 1.0, eye: 0xd0d8e0 },
            challenge: [
              'Readings? From a weatherwife\'s sticks? The great dial is calibrated.', 'By me. Against the ledger. Which is accurate.',
              'The pressure on the poor streets is very high. I know because I apply it. Shall I show you?',
            ],
            beaten: ['...Low. Everything low. Very well — I will set the needle by the sky tomorrow. If the Prince allows. If.'],
            coins: 80,
          },
        },
        hint: 'Glass-Reader Mercurio has seen you at the dial — prove the glass is lying',
      },
    ],
    complete: [
      'Heavy over the Row, light over the Tower.', 'And now half the town has stood at the dial and seen it for themselves.',
      'Fifty years I\'ve said the weather here was made, not born.', 'Nobody listens to a weatherwife till the glass breaks.',
      'Take my spare glass-money. A good forecast should always pay the one who carried it.',
    ],
    reward: { orbs: 7, coins: 60 },
  },
  {
    id: 'stormeye-into-the-eye',
    area: 'stormeye',
    name: 'The Calm Was Never His',
    giver: 'stormeye-orrin',
    requires: { questDone: 'stormeye-torn-row' },
    offer: [
      'I built that wall, and I built the tower before it.', 'I know what\'s under the floor of the gallery: storm-anchors.',
      'Three iron keys lock the eye to the tower: one at each gate, one in the Row\'s wall.', 'I set them there forty years ago.',
      'He holds the calm open with them, and shrinks it as he likes.', 'Turn the keys, and the eye\'s held by nothing but the weather.',
      'Then go up and tell him so.',
    ],
    accept: ['West gate, south gate, and the broken wall behind the Row.', 'Turn them widdershins — the old way. He never learned it.'],
    stages: [
      {
        objective: {
          kind: 'collect', area: 'stormeye', label: 'Storm-anchor key', emoji: '🗝️', color: 0x6a7380,
          spots: [{ x: 250, y: 760 }, { x: 1200, y: 1400 }, { x: 1790, y: 1235 }],
        },
        hint: 'Turn the three storm-anchor keys at the West Gate, the South Gate and the Torn Row',
      },
      { objective: { kind: 'prince', prince: 'squall' }, hint: 'Climb the Barometer Tower and bring down Prince Squall' },
    ],
    complete: [
      'The eye\'s holding on its own. No grip on it, no one shrinking it.', 'Turns out the storm keeps a calm because storms do.',
      'I\'m relaying every wall he had knocked down.', 'Nobody will point the gale at a street again — not while I\'ve hands.',
      'This was in his forecast-box, under a stack of tomorrows. Spend it on something that doesn\'t need a roof.',
    ],
    reward: { orbs: 9, coins: 100 },
  },
];
