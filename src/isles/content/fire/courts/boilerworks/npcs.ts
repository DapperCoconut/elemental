import type { NpcDef, NpcLook, Talk } from '../../../../IslesTypes';
import { ENC_CONVEYOR, ENC_OVERPRESSURE } from './encounters';

/**
 * The people of the Boilerworks — branded stokers, a bunkhouse matron, a child who runs grease,
 * a union whisperer, the overseer who counts them all, and the Company Store's quartermaster.
 * Every NPC answers to the court's state: their quest done, Prince Gauge down, the King down.
 */

export const NPC_OTTILIE = 'boilerworks-ottilie';
export const NPC_WENDEL = 'boilerworks-wendel';
export const NPC_NAN = 'boilerworks-nan';
export const NPC_PIP = 'boilerworks-pip';
export const NPC_CRANKSHAW = 'boilerworks-crankshaw';
export const NPC_DAGNY = 'boilerworks-dagny';
export const NPC_AMBROSE = 'boilerworks-ambrose';
export const NPC_IDA = 'boilerworks-ida';

export const Q_BELL = 'boilerworks-ring-early';
export const Q_BREAM = 'boilerworks-bream-supper';
export const Q_GOBY = 'boilerworks-true-reading';
export const Q_GREASE = 'boilerworks-grease-run';
export const Q_WHISTLE = 'boilerworks-blow-whistle';

const PRINCE = { prince: 'gauge' } as const;
const KING = { monarch: 'ashgrave' } as const;

const look = (l: NpcLook): NpcLook => l;

export const BOILERWORKS_NPCS: NpcDef[] = [
  {
    id: NPC_OTTILIE, name: 'Ottilie Brassbuckle', title: 'Company Store Quartermaster',
    look: look({ body: 0xe0b89a, accent: 0x6a3a22, hat: 'tophat', traits: ['glasses', 'apron'], size: 1.05 }),
    at: { x: 2050, y: 1036 },
    role: { kind: 'shop', id: 'boilerworks-shop' },
    talks: [
      { when: KING, lines: [
        'No King, no quota, no company scrip. I\'m taking real coin now, and paying it too.',
        'Strange feeling, running a shop people want to come into.',
      ] },
      { when: PRINCE, lines: [
        'The Prince\'s ledger says the workers owe the store eleven years of wages. I\'ve burned the ledger.',
        'Charms are still for sale. Honest prices. Well. Honest-ish.',
      ] },
      { lines: [
        'Welcome to the Company Store. Everything a stoker needs, at prices a stoker can\'t afford.',
        'The workers are paid in scrip that only spends here. That\'s not my idea. My idea is the charms.',
        'I take good fish off the pond too. Bream, eels. Bring me a goby and I\'ll owe you a favour.',
      ] },
    ],
    barks: [
      { when: PRINCE, lines: ['Who wants a valve that actually works?'] },
      { lines: ['Charms, tonics, cogs — step in out of the steam.', 'Scrip or coin, scrip or coin.'] },
    ],
  },
  {
    id: NPC_WENDEL, name: 'Wendel Coke', title: 'Firebox Stoker, 40 Years',
    look: look({ body: 0x8a6a56, accent: 0x2a2420, hat: 'cap', traits: ['beard', 'bandage', 'brand'], size: 1.1, hand: 0x3a2a20 }),
    at: { x: 1030, y: 478 },
    talks: [
      { when: KING, lines: [
        'Forty years I fed that fire for him. I let it go out this morning. Just to see.',
        'Didn\'t anybody get marched off. The sky didn\'t fall. Huh.',
      ] },
      { when: PRINCE, lines: [
        'They\'ve throttled the Great Boiler back to a sensible line. First time in my life it\'s been quiet.',
        'I can hear my own heart. Turns out it\'s slower than the boiler\'s.',
      ] },
      { when: { questDone: Q_GOBY }, lines: [
        'Every gauge on this yard was reading low on purpose. You put that right. Kessel can rest.',
      ] },
      { lines: [
        'Mind the firebox. It\'ll take your eyebrows and ask for your lashes.',
        'The Prince keeps every needle in the yard leaning on the red. Says pressure is loyalty.',
        'My hands don\'t feel heat anymore. That\'s not a gift. That\'s what\'s left.',
      ] },
    ],
    barks: [
      { when: PRINCE, lines: ['Sensible line. Sensible line. Never thought I\'d say it.'] },
      { lines: ['More coal, more coal...', 'Hear that knock? Third boiler. She\'s tired.'] },
    ],
  },
  {
    id: NPC_NAN, name: 'Nan Rivet', title: 'Bunkhouse Matron',
    look: look({ body: 0xd0a080, accent: 0x5a2a3a, hat: 'beanie', traits: ['apron', 'scarf'], size: 0.95 }),
    at: { x: 1880, y: 1218 },
    talks: [
      { when: KING, lines: [
        'The bunkhouses are just houses now. Folk are painting the doors. Over the brands, mostly.',
        'You come by for supper whenever you like, dear. There\'s always bream.',
      ] },
      { when: PRINCE, lines: [
        'Eight-hour shifts. Eight! The young ones don\'t know what to do with the rest of the day.',
        'I told them: sleep. Then eat. Then sleep again. That\'s a revolution if I ever saw one.',
      ] },
      { when: { questDone: Q_BREAM }, lines: [
        'That bream fed forty. You should have heard the bunkhouse. Like a feast day, it was.',
      ] },
      { lines: [
        'Shh — night shift\'s sleeping. Or trying. Eighteen hours on, six off, and the bell\'s always early.',
        'I cook for three bunkhouses on what the Company Store lets me buy. Mostly boiled water.',
      ] },
    ],
    barks: [
      { when: PRINCE, lines: ['Who wants seconds? Everyone gets seconds now.'] },
      { lines: ['Feet off the cots.', 'Somebody wake Tobin, he\'s due on the belt.'] },
    ],
  },
  {
    id: NPC_PIP, name: 'Pip Sprocket', title: 'Grease Runner',
    look: look({ body: 0xe8c0a0, accent: 0x2a3a5a, hat: 'cap', traits: ['satchel'], size: 0.72 }),
    at: { x: 1310, y: 770 }, wander: 120,
    talks: [
      { when: KING, lines: [
        'Ida says I can go to school now. What\'s school? Is there grease at school?',
        'I\'m going to learn to read the gauges proper. All of them. Even the scary ones.',
      ] },
      { when: PRINCE, lines: [
        'You knocked the Prince off his tower! Everybody saw! Kessel cried steam!',
        'I\'m still running notes. But nobody\'s scared of the notes now. They\'re just... notes.',
      ] },
      { when: { questDone: Q_GREASE }, lines: [
        'Gate didn\'t squeak once! Forty people out and back and the overseer slept right through.',
      ] },
      { lines: [
        'I\'m small enough to get under the gantries, so I carry the grease. And other things.',
        'What other things? Nothing. Grease. Just grease. Don\'t look in my satchel.',
      ] },
    ],
    barks: [
      { when: PRINCE, lines: ['Wheee — no overseer!'] },
      { lines: ['Grease for the belt! Grease for the hinges!', 'Can\'t stop, gotta run!'] },
    ],
  },
  {
    id: NPC_CRANKSHAW, name: 'Overseer Crankshaw', title: 'Keeper of the Shift Book',
    look: look({ body: 0xc8a888, accent: 0x1c1c22, hat: 'tophat', traits: ['cane', 'book', 'glasses'], size: 1.05 }),
    at: { x: 1500, y: 830 }, wander: 60,
    talks: [
      { when: KING, lines: [
        'I have been asked to work a shift. On the belt. Me.',
        'It is... harder than the book made it look. Please stop smiling.',
      ] },
      { when: PRINCE, lines: [
        'The Prince is fallen and the shift book is... misplaced. Nobody is writing anyone\'s name down.',
        'I suppose I shall have to find honest work. Is there such a thing, here?',
      ] },
      { when: { questDone: Q_WHISTLE }, lines: [
        'You and that Gasket woman. I knew she was trouble. I wrote it down. Much good it did.',
      ] },
      { when: { encounter: ENC_CONVEYOR }, lines: [
        'You put Brindle on his own belt. The book has a page about you now. A long one.',
        'The Prince reads the book every evening. Sleep well.',
      ] },
      { lines: [
        'Name? Shift? Brand number? No brand? Most irregular.',
        'Every stoker on this yard is in my book. Late, slow, coughing — it all goes to the Prince.',
        'Move along. Loitering is three marks, and three marks is the Kiln.',
      ] },
    ],
    barks: [
      { when: PRINCE, lines: ['No marks. No marks for anyone...'] },
      { lines: ['Mark. Mark. Two marks.', 'Back to the belt, you.', 'I see you coughing, Tobin.'] },
    ],
  },
  {
    id: NPC_DAGNY, name: 'Dagny Fathom', title: 'Pond Angler',
    look: look({ body: 0xb89070, accent: 0x3a5a4a, hat: 'straw', traits: ['rod', 'pipe'], size: 1 }),
    at: { x: 712, y: 1128 },
    talks: [
      { when: KING, lines: [
        'With the boilers eased off, the pond\'s cooling. The bream are getting fat and lazy. Like me.',
      ] },
      { when: PRINCE, lines: [
        'The goby\'s spots have gone calm. Pond\'s at a sensible pressure for the first time I can remember.',
        'You\'ll want an iron rod for this water. Driftwood just poaches.',
      ] },
      { when: { questDone: Q_GOBY }, lines: [
        'A goby never lies. Wendel knows it now, and so does the yard. Good fishing, stoker.',
      ] },
      { lines: [
        'This pond takes the boilers\' outflow. Warm as soup. The fish come out half-cooked.',
        'Bring an iron rod — the steam warps wood. Bream for supper, eels if you\'re quick, goby if you\'re lucky.',
      ] },
    ],
    barks: [
      { lines: ['Shh. Something\'s nibbling.', 'Warm water, warm fish, warm feet.'] },
    ],
  },
  {
    id: NPC_AMBROSE, name: 'Ambrose Toll', title: 'Shift-Bell Ringer',
    look: look({ body: 0xc09878, accent: 0x5a4a2a, hat: 'beanie', traits: ['lantern', 'scarf'], size: 0.9 }),
    at: { x: 1612, y: 598 },
    talks: [
      { when: KING, lines: [
        'I ring it for supper now. And for weddings. Had two this week. Imagine that, on the Boilerworks.',
      ] },
      { when: PRINCE, lines: [
        'The Prince is down and nobody\'s told me what hours to ring. So I ring when it feels right.',
        'Turns out, it feels right a lot less often than eighteen hours.',
      ] },
      { when: { questDone: Q_BELL }, lines: [
        'One hour early. One whole hour of sleep for the night shift. They\'ll never know who to thank.',
        'Don\'t tell them. Some kindnesses ring louder unsigned.',
      ] },
      { lines: [
        'Every shift starts on my bell. Every shift ends on it too — when the Prince says, not when I do.',
        'I\'ve rung that bell nine thousand times. I\'d like to ring it once for the right reason.',
      ] },
    ],
    barks: [
      { lines: ['Not yet... not yet...', 'Bong. Bong. That\'s what my dreams sound like.'] },
    ],
  },
  {
    id: NPC_IDA, name: 'Ida Gasket', title: 'Fitter (and Organiser)',
    look: look({ body: 0xa87a5a, accent: 0x8a2a1e, hat: 'bandana', traits: ['tool', 'brand', 'scarf'], size: 1 }),
    at: { x: 2235, y: 1290 },
    talks: [
      { when: KING, lines: [
        'The whole isle\'s talking like a bunkhouse after lights-out. Plans everywhere.',
        'We\'re electing a works council. I\'m running. You\'d vote for me, wouldn\'t you?',
      ] },
      { when: PRINCE, lines: [
        'We blew the whistle and the yard stopped. Every belt. Every hammer. The Prince\'s own works went on strike.',
        'He fought you because he couldn\'t fight us. Remember that.',
      ] },
      { when: { questDone: Q_GREASE }, lines: [
        'The night meeting went well. Better than well. Forty hands, one plan.',
        'Next is the whistle. Come and find me when you\'re ready to make some noise.',
      ] },
      { lines: [
        'You\'re not branded. You\'re not on any shift. That makes you the only free hands on this yard.',
        'Keep your voice down. Crankshaw has ears in the pipes.',
      ] },
    ],
    barks: [
      { when: PRINCE, lines: ['Solidarity, stoker.'] },
      { lines: ['...not here. Later.', 'Keep walking. Look busy.'] },
    ],
  },
];

/** The yard crowd's ambient mutters. */
export const BOILERWORKS_CROWD_BARKS: Talk[] = [
  { when: KING, lines: [
    'Painted over my brand this morning. Blue. Always liked blue.',
    'Heard the Kiln\'s gone cold. Heard it from three people. Must be true.',
    'Day off. I don\'t know what to do with my hands.',
  ] },
  { when: PRINCE, lines: [
    'Eight hours! Eight!',
    'The gauges are reading true. First time in my life.',
    'Somebody said the Prince is just sitting in his tower. Staring at a dial.',
    'Bell rang and nobody jumped. Strange.',
  ] },
  { when: { encounter: ENC_OVERPRESSURE }, lines: [
    'Kessel\'s vented. First time I\'ve seen him sit down.',
    'They say the stranger beat the boiler-heart. A person beat a boiler.',
  ] },
  { lines: [
    'Coal in, ash out. Coal in, ash out.',
    'My brand itches when the Prince walks the gantry.',
    'Don\'t stand under number two hammer. Just don\'t.',
    'Three marks this week. One more and it\'s the Kiln.',
    'Scrip again. Always scrip.',
    'Who\'s on the valves tonight? Not me, please, not me.',
  ] },
];
