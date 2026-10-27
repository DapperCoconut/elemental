import type { NpcDef, NpcLook, Talk } from '../../../../IslesTypes';
import { NPC, Q_HIVE, Q_INCH_TAX, Q_LEDGER, Q_NAVE, Q_POND } from './quests';

/**
 * The people of Candlewick. Every one of them lives in a candle, pays the Inch-Tax and has an
 * opinion about Prince Tallow's height. Lines are keyed most-specific first: King fallen →
 * Prince fallen → their quest done → default.
 */

const KING = { monarch: 'ashgrave' } as const;
const PRINCE = { prince: 'tallow' } as const;

export const CANDLEWICK_NPCS: NpcDef[] = [
  {
    id: NPC.cerelle, name: 'Mother Cerelle', title: 'Chandler · Cerelle\'s Chandlery',
    look: { body: 0xf0dcb0, accent: 0x6a2a3a, hat: 'beanie', traits: ['apron', 'glasses'], size: 1.1 },
    at: { x: 900, y: 728 },
    role: { kind: 'shop', id: 'candlewick-shop' },
    talks: [
      { when: KING, lines: [
        'The King\'s gone. I dipped a hundred candles this morning and not one of them for him.',
        'They\'re lopsided. I was laughing too hard. Buy one anyway.',
      ] },
      { when: PRINCE, lines: [
        'The Tall Candle, out. I\'d have paid to see that. Actually, I suppose I did — you bought my charms.',
        'The Inchwardens have all gone very quiet. One asked me for work. I said I\'d measure him for it.',
      ] },
      { when: { questDone: Q_INCH_TAX }, lines: [
        'That Tallowby wick\'s holding, I hear. Of course it is. I braided it.',
        'Now, are you buying, or are you just here to be thanked?',
      ] },
      { lines: [
        'Mind the counter, it\'s still soft. Everything in Candlewick is still soft.',
        'Charms, honey, wax. The charms are good. The honey is better. The wax is whatever the Inchwardens left me.',
      ] },
    ],
    barks: [
      { when: PRINCE, lines: ['Free candles! Well. Cheaper candles.', 'Nobody\'s counting my wicks any more. I keep counting anyway.'] },
      { lines: ['Three strands and a twist...', 'Wax doesn\'t wait.', 'If it drips, it\'s mine.'] },
    ],
  },

  {
    id: NPC.bettony, name: 'Bettony Hivewright', title: 'Baker · The Honeyed Wick',
    look: { body: 0xf2c86a, accent: 0xf6f0e0, hat: 'chef', traits: ['apron'], size: 1.25 },
    at: { x: 1560, y: 838 },
    role: { kind: 'bakery', id: 'candlewick-bakery' },
    talks: [
      { when: KING, lines: [
        'No more tithe loaves for the Kiln. Everything that comes out of my oven now stays in Candlewick.',
        'Well. And whatever you can carry.',
      ] },
      { when: PRINCE, lines: [
        'I baked a cake in the shape of the Prince. Very tall. Then I cut it in half. Very satisfying.',
        'Bring me fish and comb. I\'ve got a great deal of celebrating to cater.',
      ] },
      { when: { questDone: Q_POND }, lines: [
        'Marisol\'s candles! Did you see? White as milk. I\'ve been saving her every drop of trout fat since.',
      ] },
      { lines: [
        'The Honeyed Wick! Bring me a catch from the pond and a bit of comb, I\'ll send you off fed.',
        'A meal here lasts you one good scrap. Eat before you pick a fight, not after.',
        'Wickfin on a taper, tallow trout in a seal, honeycomb ray pie... and the hive-loaf, if you\'ve sea mackerel.',
      ] },
    ],
    barks: [
      { when: PRINCE, lines: ['Short cake! Get your short cake!', 'Fresh out of the oven and nobody to tithe it to.'] },
      { lines: ['Mind, the oven\'s hot.', 'Honey on everything. That\'s the rule.', 'Who brought a sprat? I can smell a sprat.'] },
    ],
  },

  {
    id: NPC.pip, name: 'Pip Tallowby', title: 'Wick-Runner',
    look: { body: 0xf6e6c4, accent: 0x3a6aa8, hat: 'cap', traits: ['satchel'], size: 0.72 },
    at: { x: 1110, y: 990 }, wander: 60,
    talks: [
      { when: KING, lines: [
        'Is it true the King\'s gone? Does that mean I can let our candle go out sometimes? Just to see?',
        'Mum says no. Mum says we light it for us now.',
      ] },
      { when: PRINCE, lines: [
        'The Inchwardens threw their rods in the wax pond! Marisol\'s been fishing them out to use as kindling.',
        'I measured myself on one. I\'m forty inches. That\'s taller than the Prince\'s stub now!',
      ] },
      { when: { questDone: Q_INCH_TAX }, lines: [
        'Our house is burning just right. The Inchwarden said "acceptable" and wrote it in his book.',
        'Acceptable! That\'s the best one!',
      ] },
      { when: { quest: Q_INCH_TAX, stage: 2 }, lines: ['You got the wick? Quick, before dawn! Our house is on Wick Street — the leaning one.'] },
      { when: { quest: Q_INCH_TAX }, lines: ['Five wick-ends from Chandlers\' Lane. Little black curly ones. Please hurry.'] },
      { lines: [
        'Are you from off-island? Do your houses burn too? Ours do. All the time. On purpose.',
        'I run wicks. Sometimes I run messages. Mostly I run away from the Inchwardens.',
      ] },
    ],
    barks: [
      { when: PRINCE, lines: ['Forty inches!', 'I\'m taller than a prince!'] },
      { when: { questDone: Q_INCH_TAX }, lines: ['Acceptable! Acceptable!'] },
      { lines: ['Wick! Wick for sale! Barely used!', 'Don\'t step in the runnels.', 'Our candle\'s going out...'] },
    ],
  },

  {
    id: NPC.wenna, name: 'Canoness Wenna', title: 'Keeper of the Taper Cathedral',
    look: { body: 0xf3ead6, accent: 0x5a2a6a, hat: 'mitre', traits: ['book'], size: 1.05 },
    at: { x: 604, y: 520 },
    talks: [
      { when: KING, lines: [
        'Every taper in the nave is lit tonight. Every one for someone the Kiln took.',
        'The King gave us a thousand reasons to light candles. We will keep lighting them, for better ones.',
      ] },
      { when: { questDone: Q_LEDGER }, lines: [
        'The knots hang from the rafters now. When the wind comes through the nave, they move, and I say their names.',
      ] },
      { when: PRINCE, lines: [
        'The Prince is out. I lit a candle for him too. Someone ought to, and nobody else would.',
        'Old Snuff has been asking for you, I think. He keeps looking at the door.',
      ] },
      { when: { questDone: Q_NAVE }, lines: [
        'We poured the great candle from the stubs. It is lopsided and enormous and I love it.',
        'Old Snuff lights it every evening now. His hands shake. He does not let anyone help.',
      ] },
      { when: { quest: Q_NAVE }, lines: ['Amonet keeps her vigil on the steps. Please — gently, if you can manage it.'] },
      { lines: [
        'Welcome to the Taper Cathedral. Mind the drips; the spires are older than the King.',
        'A candle is a prayer you do not have to say. Lately there is no one left to hear them.',
      ] },
    ],
    barks: [
      { when: PRINCE, lines: ['Light one for whoever you like.', 'The nave is warm again.'] },
      { lines: ['Hush, now. The tapers are listening.', 'So much smoke in the mornings...'] },
    ],
  },

  {
    id: NPC.hob, name: 'Hob Combsby', title: 'Beekeeper',
    look: { body: 0xe0b860, accent: 0xf0ecd8, hat: 'straw', traits: ['beard', 'satchel'], size: 1.15 },
    at: { x: 1752, y: 478 },
    talks: [
      { when: KING, lines: [
        'The bees have started building comb on the King\'s statue in the square. I\'m not stopping them.',
      ] },
      { when: { questDone: Q_HIVE }, lines: [
        'Hear that? Right pitch. Every tower\'s got a queen again.',
        'I\'ve named the biggest one after you. Don\'t be flattered, she\'s very bad-tempered.',
      ] },
      { when: PRINCE, lines: [
        'The palace bees came out when the Prince went down. Half of them went straight to Hum, the traitors.',
      ] },
      { when: { quest: Q_HIVE, stage: 2 }, lines: ['You found them? Then bring me two slabs of comb. Cerelle sells it, the robber.'] },
      { when: { quest: Q_HIVE }, lines: ['Get past Hum, then round the back of the palace. The royal apiary. You\'ll hear it.'] },
      { lines: [
        'Wax comes from bees, you know. Every candle in this court started in one of my towers.',
        'The Prince forgets that. Bees don\'t.',
      ] },
    ],
    barks: [
      { when: { questDone: Q_HIVE }, lines: ['Right pitch. Right pitch.', 'Hello, girls.'] },
      { lines: ['Hear that? Wrong pitch.', 'Move slow round the skeps.', 'Bzz. Sorry. Habit.'] },
    ],
  },

  {
    id: NPC.marisol, name: 'Marisol Dipwell', title: 'Pond-Fisher',
    look: { body: 0xd8b888, accent: 0x2a5a5a, hat: 'straw', traits: ['rod', 'scarf'], size: 1 },
    at: { x: 600, y: 1094 },
    talks: [
      { when: KING, lines: [
        'I light an unbranded candle on the pier every night now. Last night there were forty others beside it.',
      ] },
      { when: { questDone: Q_POND }, lines: [
        'The candle burned all night without a flicker. No brand, no tax, no Inchwarden.',
        'Catch me more wickfin and I\'ll make one for every house on Wick Street.',
      ] },
      { when: PRINCE, lines: [
        'The Inchwardens threw their measuring rods in my pond. I\'ve hooked six so far. Fish don\'t like them either.',
      ] },
      { when: { quest: Q_POND }, lines: ['Three wickfin and a tallow trout. Iron rod. Let the line sink; they bite on the way down.'] },
      { lines: [
        'This is the wax pond. Hot on top, warm underneath, and full of fish that shouldn\'t exist.',
        'Bring an iron rod. A wooden one sets solid the moment it touches the surface.',
      ] },
    ],
    barks: [
      { when: { questDone: Q_POND }, lines: ['No brand on that one.', 'White as milk.'] },
      { lines: ['Shh. Something\'s nibbling.', 'Another candle in the pond...', 'Wickfin\'s running.'] },
    ],
  },

  {
    id: NPC.snuff, name: 'Old Snuff', title: 'Sexton',
    look: { body: 0xc8bca8, accent: 0x2a2a30, hat: 'hood', traits: ['cane', 'lantern'], size: 0.92 },
    at: { x: 984, y: 566 },
    talks: [
      { when: KING, lines: [
        'The King is gone. I lit a candle and did not snuff it, and nobody came to tell me off.',
        'I sat and watched it burn right down. It took four hours. It was the best four hours of my life.',
      ] },
      { when: { questDone: Q_LEDGER }, lines: ['Every name, hanging in the nave. I could not say them. Now I do not have to. She does.'] },
      { when: PRINCE, lines: [
        'The Prince is out. Then... perhaps it is time I handed over what I kept.',
      ] },
      { when: { questDone: Q_NAVE }, lines: [
        'I light the great candle every evening now. The one made of all the ones I put out.',
        'It is hard work for an old man. I hope it stays hard. I deserve that.',
      ] },
      { lines: [
        'Mind the step, mind the step. Forty years I have swept wax off these steps.',
        'Do not light anything in there unless it is for the King. I mean it. For your own sake.',
      ] },
    ],
    barks: [
      { when: PRINCE, lines: ['Five bundles. Five...', 'Somebody ought to know their names.'] },
      { lines: ['Snuff, snuff...', 'Not for the King? Then out it goes.', 'My knees, my knees.'] },
    ],
  },

  {
    id: NPC.jack, name: 'Gutter-Jack', title: 'Runnel-Sweep',
    look: { body: 0xe6d4aa, accent: 0x5a4a2a, hat: 'cap', traits: ['tool', 'scarf'], size: 1 },
    at: { x: 700, y: 862 }, wander: 90,
    talks: [
      { when: KING, lines: [
        'Runnels are flowing clean for the first time since I was a lad. The wax goes where it likes now.',
        'Downhill, mostly. Like the King.',
      ] },
      { when: PRINCE, lines: [
        'Know what\'s in the runnels this morning? Whole candles. People threw their tithe candles in the gutter.',
        'I\'m not sweeping them. I\'m sitting on them. Best seat in Candlewick.',
      ] },
      { lines: [
        'Every candle in the court drips into the street, and every drip runs into a runnel, and I sweep the runnels.',
        'The Prince says the wax belongs to the King. I say it belongs to whoever has to scrape it up.',
        'Watch your footing in the runnels. Fresh wax is slick as a lie.',
      ] },
    ],
    barks: [
      { when: PRINCE, lines: ['Sitting on my tithe.', 'Let it run.'] },
      { lines: ['Slick as a lie.', 'Mind the runnel.', 'Scrape, scrape, scrape.'] },
    ],
  },

  {
    id: NPC.plum, name: 'Inchwarden Plum', title: 'Measurer to the Prince',
    look: { body: 0xf0e0c0, accent: 0x8a1a22, hat: 'tophat', traits: ['glasses', 'book'], size: 1.2 },
    at: { x: 1950, y: 1110 },
    talks: [
      { when: KING, lines: [
        'I have been re-employed by the guild. I measure wicks for quality now. Merely for quality.',
        'It is a great deal less satisfying. I am told that is the point.',
      ] },
      { when: PRINCE, lines: [
        'I measured him, at the end. The Prince. One and three-eighths inches. I did not write it down.',
        'I think I shall not write anything down for a while.',
      ] },
      { when: { courtReady: 'candlewick' }, lines: [
        'Every champion of the court, beaten. By someone who did not even stand up straight.',
        'His Highness will receive you. Do not slouch. He notices.',
      ] },
      { lines: [
        'Halt. Hold still. Five foot... nothing. Hm. Unacceptable.',
        'His Highness receives no one who has not been measured against the champions of his court.',
        'Five of them. Come back when you are taller. Figuratively.',
      ] },
    ],
    barks: [
      { when: PRINCE, lines: ['One and three-eighths...', 'I have put my rod away.'] },
      { lines: ['Too short.', 'Burning too fast, that one.', 'Hoarding light, are we?'] },
    ],
  },
];

/** Wandering townsfolk: candle-hatted, aproned, sticky with wax. */
export const CROWD_LOOKS: NpcLook[] = [
  { body: 0xf3e3bf, accent: 0x7a4a2a, hat: 'candle', traits: ['apron'] },
  { body: 0xe8d4a8, accent: 0x3a5a7a, hat: 'cap' },
  { body: 0xf6ead0, accent: 0x6a2a3a, hat: 'candle', traits: ['scarf'] },
  { body: 0xe0c890, accent: 0x4a6a3a, hat: 'straw', traits: ['satchel'] },
  { body: 0xd8c8a8, accent: 0x5a3a6a, hat: 'beanie', size: 0.8 },
  { body: 0xf0dcb0, accent: 0x8a5a2a, hat: 'none', traits: ['brand', 'apron'], size: 1.1 },
];

export const CROWD_BARKS: Talk[] = [
  { when: KING, lines: [
    'Let it gutter! Let it gutter!', 'I blew mine out last night just to see. Nobody came.',
    'The Kiln\'s cold. Imagine that.', 'I\'m pouring a candle the shape of a duck. Because I can.',
  ] },
  { when: PRINCE, lines: [
    'The Tall Candle\'s a stub!', 'No Inchwardens on Wick Street today.', 'I let my candle burn crooked. On purpose.',
    'Did you hear? He was barely taller than a door at the end.',
  ] },
  { lines: [
    'Keep it burning, keep it burning...', 'An Inchwarden measured my door yesterday. My door!',
    'Mind the drip.', 'The bees are angry today.', 'Too fast and you\'re wasting, too slow and you\'re hoarding.',
    'Did you trim your wick?', 'Wax in my hair again.',
  ] },
];
