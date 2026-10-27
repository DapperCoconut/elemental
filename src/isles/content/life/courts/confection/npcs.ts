import type { NpcDef, NpcLook, Talk } from '../../../../IslesTypes';
import { NPC, Q_CAVITY, Q_GLASS, Q_LULLABY, Q_SALT, Q_SCALE } from './quests';

/**
 * The people of the Confection Court. Every one of them owes the Sweet-Tax — a sugar loaf a head
 * each season, weighed on the scales in Sugarloaf Square — and every one of them knows a family
 * that came up short and went up the hill to the Glasshouse. The town is pink and iced on top and
 * grey with salt underneath, and they all live in both halves. Lines are most-specific first:
 * Empress fallen → Prince fallen → their quest done / under way → default.
 */

const EMPRESS = { monarch: 'verdigra' } as const;
const PRINCE = { prince: 'saccharo' } as const;

export const CONFECTION_NPCS: NpcDef[] = [
  {
    id: NPC.marzipan, name: 'Mistress Marzipan', title: 'Sweetmeats & Notions',
    look: { body: 0xf4dcc8, accent: 0xf27aa8, hat: 'veil', traits: ['apron', 'glasses'], size: 1.1 },
    at: { x: 1480, y: 748 },
    role: { kind: 'shop', id: 'confection-shop' },
    talks: [
      { when: EMPRESS, lines: [
        'The Glasshouse is open, they say. People coming down the hill with leaves still in their hair.',
        'I\'ve sold out of everything sour. Everybody wants to taste something that isn\'t sweet. Browse, love.',
      ] },
      { when: PRINCE, lines: [
        'His Highness ran a tab here for nine years. Sugared violets, mostly. He never paid a penny.',
        'I\'ve framed the bill. It\'s over the counter. Customers like to read it.',
      ] },
      { when: { questDone: Q_SCALE }, lines: [
        'Thirty-one families full weight all along! I gave the Fondant boy a whole box of creams. He cried into it.',
        'Now then. A charm? The lozenge is real lead, mind. Real Sweet-Tax lead. Very fashionable this week.',
      ] },
      { lines: [
        'Marzipan\'s. Tongs, hooks, spoons, weights — the little tools of a sweet town. And salt, under the counter.',
        'Everything up front is pink. Everything at the back is useful. Don\'t tell the Weighmaster which is which.',
      ] },
    ],
    barks: [
      { when: PRINCE, lines: ['Read the bill! Nine years!', 'Sour drops, half price!'] },
      { lines: ['Sugared almonds! Mind the lead ones.', 'Salt? Never heard of it. Back room.', 'Pink, pink, pink...'] },
    ],
  },

  {
    id: NPC.demerara, name: 'Dame Demerara', title: 'Baker · The Sugar Loaf',
    look: { body: 0xc8946a, accent: 0xfdf8f2, hat: 'chef', traits: ['apron'], size: 1.25 },
    at: { x: 900, y: 902 },
    role: { kind: 'bakery', id: 'confection-sugarloaf' },
    talks: [
      { when: EMPRESS, lines: [
        'The Empress is down and the first thing anyone in this town asked me for was bread. Plain bread. No sugar.',
        'I\'ve baked six hundred loaves of it. It\'s the best thing I ever made, and it tastes of nothing at all.',
      ] },
      { when: { questDone: Q_CAVITY }, lines: [
        'Two hundred and six cupboards with their own sugar back in them. I counted them on my fingers twice.',
        'Bring me anything you\'ve caught. My ovens are free now, and so am I.',
      ] },
      { when: { quest: Q_CAVITY }, lines: ['The vault\'s on the west side of the Sweet-Tax House. Tallies first, then whatever\'s eating the sugar.'] },
      { when: PRINCE, lines: [
        'Saccharo used to send down for a cake every morning and eat the icing off it. Just the icing.',
        'The rest came back to me. I fed it to the Saltcellar children. He never knew, and they never thanked him.',
      ] },
      { when: { quest: Q_LULLABY, stage: 1 }, lines: ['A caramel eel and a pinch of rock salt and I\'ll have that tonic stewed in no time. Bitter as a bill.'] },
      { when: { quest: Q_SCALE, stage: 1 }, lines: ['Lozenges? Bring one here. My kitchen scale was my mother\'s. It has never once lied to me.'] },
      { lines: [
        'The Sugar Loaf. Fish from the Pool, sugar from the mill, salt from under the floor — that\'s every recipe in Confection.',
        'Everything sweet in this town is made by somebody who\'s never allowed to eat it. Except here. Sit down.',
      ] },
    ],
    barks: [
      { when: PRINCE, lines: ['Plain bread! Who wants plain bread?', 'Mind the oven, it\'s finally mine.'] },
      { lines: ['Out of the oven, into the tithe...', 'Salt in the dough. Always salt in the dough.', 'Don\'t lean on the counter, it\'s gingerbread.'] },
    ],
  },

  {
    id: NPC.fondant, name: 'Weigher Fondant', title: 'Junior Clerk · the Sweet-Tax House',
    look: { body: 0xf0e0d0, accent: 0x3f9a7c, hat: 'cap', traits: ['book', 'glasses'], size: 0.9 },
    at: { x: 1124, y: 660 },
    talks: [
      { when: EMPRESS, lines: [
        'They\'ve made me Weighmaster. Me! I asked what we\'re weighing and nobody could tell me.',
        'So I weighed the scales. Then I sold them for scrap and bought everybody on the square a bun.',
      ] },
      { when: PRINCE, lines: [
        'No Prince, no Sweet-Tax. The book\'s still open on the desk. I keep looking at the last line.',
        'It says "Cane household — short." I crossed it out. It\'s the only thing I\'ve ever crossed out.',
      ] },
      { when: { questDone: Q_SCALE }, lines: [
        'Thirty-one families! Troy re-weighed every one with Mam\'s scale next to his. His hand shook. Mine didn\'t.',
      ] },
      { when: { quest: Q_SCALE, stage: 2 }, lines: ['Troy\'s at the scales. He knows. He always knows. Please — please be quick.'] },
      { when: { quest: Q_SCALE, stage: 1 }, lines: ['Take them to Dame Demerara. Her mother\'s scale is the only honest one in the court.'] },
      { when: { quest: Q_SCALE }, lines: ['Round the square. Lead lozenges, iced white with a pink stripe. Don\'t let him see you.'] },
      { lines: [
        'Sweet-Tax House. I record the weights. A loaf a head a season, and the Gardener\'s rose on the receipt.',
        'If you\'re short, you go up the hill. I write that down as well. I don\'t sleep very much.',
      ] },
    ],
    barks: [
      { when: PRINCE, lines: ['Crossed out. Crossed OUT.', 'Fourteen ounces... no more.'] },
      { lines: ['Fourteen ounces... fourteen ounces...', 'Next household, please.', 'I only write it down.'] },
    ],
  },

  {
    id: NPC.humbug, name: 'Grandfather Humbug', title: 'Millwright · the Cane Mill',
    look: { body: 0xc8a888, accent: 0x6e3a18, hat: 'cap', traits: ['beard', 'tool', 'pipe'], size: 1.15 },
    at: { x: 620, y: 470 },
    talks: [
      { when: EMPRESS, lines: [
        'They came down from the Glasshouse yesterday. Not all of them. Not Barley. But some of the glass children\'s mams.',
        'I\'ve stopped the mill for a day so we can all hear each other. First time in forty years she\'s been quiet.',
      ] },
      { when: { questDone: Q_GLASS }, lines: [
        'Barley\'s in the window. The sun comes through him in the mornings, and the mill hands touch their caps to him.',
      ] },
      { when: PRINCE, lines: [
        'The Prince is down. The Glass Walk\'s still up there, two hundred children shining in the rain.',
        'Somebody ought to bring them home. Every family wants theirs. Every family\'s afraid to go and look.',
      ] },
      { when: { quest: Q_GLASS, stage: 1 }, lines: ['Florentine works the palace kitchens. She\'s the only one up there who says good morning to us.'] },
      { when: { quest: Q_GLASS }, lines: ['Up the drive and round the back of the palace. Third from the fountain, if he\'s there. Sleeves rolled up.'] },
      { lines: [
        'Forty years I\'ve kept this mill turning. Cane in, syrup out, cubes off the press. The wheel never stops.',
        'The wheel doesn\'t care who feeds it. I used to think that was a mercy.',
      ] },
    ],
    barks: [
      { when: { questDone: Q_GLASS }, lines: ['Morning, Barley.', 'Taller than I thought.'] },
      { lines: ['Grease the governor...', 'Mind the crusher, lad.', 'She\'s running fast today.'] },
    ],
  },

  {
    id: NPC.candymae, name: 'Candy Mae Cane', title: 'Cube-Presser',
    look: { body: 0xf4dcc8, accent: 0xe0283c, hat: 'bandana', traits: ['apron'], size: 0.72 },
    at: { x: 820, y: 544 }, wander: 40,
    talks: [
      { when: EMPRESS, lines: [
        'I don\'t work at the press any more. I go to school. School is where they let you count things for yourself.',
        'I counted the glass children. Two hundred and twelve. I\'m going to learn all their names.',
      ] },
      { when: PRINCE, lines: [
        'The Glass Walk man ran away! My figure doesn\'t have a nose. Da says that\'s the luckiest nose in Thornwild.',
      ] },
      { when: { questDone: Q_LULLABY }, lines: [
        'Everything tastes funny now. Sour. Da says that\'s what real things taste like and I\'ll get used to it.',
        'I don\'t like the press any more. I used to love it. I didn\'t know I didn\'t.',
      ] },
      { when: { quest: Q_LULLABY, stage: 2 }, lines: ['Da says you\'re bringing me something nasty. Is it nasty? Will it make me sad? I\'m never sad.'] },
      { lines: [
        'Hello! I press cubes! Six hundred an hour! Nanny Sugarplum gives us a spoonful at the gate so we\'re happy!',
        'I\'m always happy. I don\'t remember being anything else. Isn\'t that lovely?',
      ] },
    ],
    barks: [
      { when: { questDone: Q_LULLABY }, lines: ['Ow. My hands.', 'Sour! Everything\'s sour!'] },
      { lines: ['Press, press, press!', 'Six hundred and one...', 'La la la...'] },
    ],
  },

  {
    id: NPC.jack, name: 'Licorice Jack', title: 'Angler · the Treacle Pool',
    look: { body: 0xb8946a, accent: 0x221a1e, hat: 'straw', traits: ['rod', 'beard'], size: 1.1 },
    at: { x: 640, y: 1296 },
    talks: [
      { when: EMPRESS, lines: [
        'Pool\'s running clearer since the Empress went. Thinner syrup. Fish don\'t know what to make of it.',
        'Neither do I. Sit down. Cast a line. Nobody\'s weighing anything any more.',
      ] },
      { when: { questDone: Q_LULLABY }, lines: [
        'Mae slept a whole night through. Cried half of it. That\'s all right. Crying\'s awake.',
        'There\'s eels deep in the Pool if you want another. The gall\'s in demand now. Every mill parent wants a bottle.',
      ] },
      { when: { quest: Q_LULLABY, stage: 3 }, lines: ['Sugarplum\'s gone up the mill yard. She never lets a child stop smiling for long. Go!'] },
      { when: { quest: Q_LULLABY, stage: 2 }, lines: ['Take it to Mae at the press. Hold her nose if you have to. I always did.'] },
      { when: { quest: Q_LULLABY }, lines: ['Eel first. Deep water, dark syrup, briarwood rod. They pull like a cart-horse.'] },
      { when: PRINCE, lines: ['The Prince is gone and the palace bins are full of cake. The catfish are fat as pigs.'] },
      { lines: [
        'Syrup fishing\'s not like water. You don\'t reel, you haul. Bring a briarwood rod or don\'t bother.',
        'Gummies near the top, toffee cats on the bottom, and the caramel eels where it\'s darkest. Mind your fingers.',
      ] },
    ],
    barks: [
      { lines: ['Sticky line, sticky line...', 'Haul, don\'t reel.', 'Something big down there.'] },
    ],
  },

  {
    id: NPC.saltash, name: 'Granny Saltash', title: 'Matriarch of the Saltcellar',
    look: { body: 0xa8a098, accent: 0x6e6e68, hat: 'hood', traits: ['cane', 'scarf'], size: 0.95 },
    at: { x: 904, y: 1448 },
    talks: [
      { when: EMPRESS, lines: [
        'The Empress is down, so they tell me. Up there it\'s parties. Down here we\'re digging salt, same as always.',
        'Only now we\'re selling it. For money. Real coin. I bit one. It tasted of nothing. Lovely.',
      ] },
      { when: { questDone: Q_SALT }, lines: [
        'Frappé\'s ices won\'t set. The Prince had sorbet soup. I\'ve never heard a better story in my life.',
      ] },
      { when: { quest: Q_SALT, stage: 1 }, lines: ['Five sacks, love? Down the Steps with them. Quick, before the cold comes.'] },
      { when: { quest: Q_SALT }, lines: ['The carts are up Palace Drive. Grey sacks, green string. Cut the string.'] },
      { when: PRINCE, lines: [
        'Saccharo used to call us the seasoning. As if we were something you sprinkled on.',
        'Every sugar loaf in that town stood on our backs. Salt holds up sugar. Always has.',
      ] },
      { lines: [
        'The Saltcellar, love. Under every sweet town there\'s a salt one. We dig it, we cart it, we don\'t get the cake.',
        'Mind your step. The houses are salt-block. They weep when it rains. So do we.',
      ] },
    ],
    barks: [
      { when: { questDone: Q_SALT }, lines: ['Sorbet soup! Ha!', 'Damp, he said. Damp!'] },
      { lines: ['Salt holds up sugar.', 'Mind the weep-stones.', 'Dig, child, dig.'] },
    ],
  },

  {
    id: NPC.florentine, name: 'Florentine', title: 'Pastry Cook · the Bonbonnière',
    look: { body: 0xe8c8a8, accent: 0x5a321e, hat: 'chef', traits: ['apron', 'scarf'], size: 1.0 },
    at: { x: 2160, y: 566 },
    talks: [
      { when: EMPRESS, lines: [
        'I\'m opening a shop in the square. Florentines. The biscuit. I\'ve never been allowed to bake my own name before.',
      ] },
      { when: PRINCE, lines: [
        'The palace kitchens are mine now, I suppose. Nobody else wants them. I\'ve been giving the cake away at the back door.',
        'We\'re carrying the glass children down, one family at a time. Gently. Glass remembers fingers.',
      ] },
      { when: { questDone: Q_GLASS }, lines: ['I carried Barley down in my apron. Glacé\'s gone to ground. Candy Mae\'s figure has no nose. Good.'] },
      { when: { quest: Q_GLASS, stage: 2 }, lines: ['Glacé\'s at his bench on the Glass Walk. His pipe\'s still warm. Hurry.'] },
      { lines: [
        'I bake for the Prince. Spun sugar, violets, swans of choux. He eats the icing and sends the rest down.',
        'I say good morning to the mill hands at the gate. It\'s not much. It\'s what I\'ve got.',
      ] },
    ],
    barks: [
      { lines: ['Choux swans, sixty of them...', 'Mind the glass.', 'Back door\'s open, if you\'re hungry.'] },
    ],
  },
];

/** Townsfolk: mill hands in aprons, pink-capped confectioners, grey Saltcellar diggers, clerks. */
export const CROWD_LOOKS: NpcLook[] = [
  { body: 0xf0d8c8, accent: 0xf27aa8, hat: 'chef', traits: ['apron'] },
  { body: 0xc8a888, accent: 0x6fd8b2, hat: 'bandana', traits: ['apron'] },
  { body: 0xa8a098, accent: 0x6e6e68, hat: 'hood', traits: ['tool'] },
  { body: 0xb8b0a8, accent: 0x5a5a52, hat: 'cap', traits: ['pack'], size: 1.15 },
  { body: 0xf4e0d0, accent: 0xf6dc5a, hat: 'none', traits: ['satchel'], size: 0.78 },
  { body: 0xd8c0a0, accent: 0x3f9a7c, hat: 'tophat', traits: ['book'] },
  { body: 0xe0c8b0, accent: 0x9a6ad0, hat: 'straw', traits: ['scarf'] },
  { body: 0x988e86, accent: 0x4a4650, hat: 'beanie', traits: ['bandage'] },
];

export const CROWD_BARKS: Talk[] = [
  { when: EMPRESS, lines: [
    'They came down the hill! Leaves in their hair!',
    'No Tithe-Day! No Tithe-Day ever!',
    'Plain bread for everybody!',
    'The salt-folk are selling to US now. Ha!',
  ] },
  { when: PRINCE, lines: [
    'The Prince melted, they say. Right there on his ballroom floor.',
    'Nobody weighed my loaf today. Nobody!',
    'Still the Empress, though. Still the Glasshouse.',
    'The Glass Walk... my sister\'s up there.',
  ] },
  { lines: [
    'A loaf a head, a head a season...',
    'Short again. Fourteen ounces.',
    'Smile, the Weighmaster\'s looking.',
    'My cousin went up the hill at Michaelmas.',
    'Sweet on top. Salt underneath.',
    'Mind the lead ones.',
    'Another cart for the Bonbonnière.',
    'Don\'t eat the gingerbread fences. They count them.',
  ] },
];
