import type { NpcDef, NpcLook, Talk } from '../../../../IslesTypes';
import { ENC_FALCON, ENC_HORN, ENC_QUARRY, ENC_STAG } from './encounters';

/**
 * The people of the Wildhunt. Here the Bloom Tithe is paid in game — a brace a household a week,
 * weighed at the Game Larder — and a household that comes up short at the season's turn is not
 * sent to the Glasshouse at once. It is penned, capped with antlers, and run through the deer park
 * for the Prince's hunt first. The ones the hounds do not catch are pruned anyway. So every hunter
 * here hunts for two reasons: to make the weight, and so that it is never their own family in the
 * caps.
 *
 * Every NPC answers to the court's state: their own quest done, Prince Fang down, the Empress
 * down. Blocks are listed most specific first.
 */

export const NPC_THRUM = 'wildhunt-thrum';
export const NPC_BURDOCK = 'wildhunt-burdock';
export const NPC_PIP = 'wildhunt-pip';
export const NPC_GRIMBLE = 'wildhunt-grimble';
export const NPC_OTTILIE = 'wildhunt-ottilie';
export const NPC_FEWTRELL = 'wildhunt-fewtrell';
export const NPC_SORREL = 'wildhunt-sorrel';
export const NPC_MAB = 'wildhunt-mab';
export const NPC_WREN = 'wildhunt-wren';

export const Q_PENS = 'wildhunt-the-open-pen';
export const Q_RING = 'wildhunt-ring-in-the-pike';
export const Q_HOUND = 'wildhunt-bramble-wont-hunt';
export const Q_TRAPS = 'wildhunt-mantraps';
export const Q_LASTRUN = 'wildhunt-the-last-run';

const PRINCE = { prince: 'fang' } as const;
const EMPRESS = { monarch: 'verdigra' } as const;

const look = (l: NpcLook): NpcLook => l;

export const WILDHUNT_NPCS: NpcDef[] = [
  {
    id: NPC_THRUM, name: 'Hesketh Thrum', title: 'Tanner, The Antler & Awl',
    look: look({ body: 0xb88a68, accent: 0x5a4a32, hat: 'cap', traits: ['apron', 'tool', 'beard'], size: 1.2, hand: 0x5a3a20 }),
    at: { x: 420, y: 735 },
    role: { kind: 'shop', id: 'wildhunt-shop' },
    talks: [
      { when: EMPRESS, lines: [
        'The Glasshouse is open and they\'re walking out of the hedges. Walking! With leaves still in their hair.',
        'I\'m tanning nothing this week. I\'m going to sit in the sun and watch them come home.',
      ] },
      { when: PRINCE, lines: [
        'Fang\'s down and the pens are open. I\'ve had three families in here buying boots. Walking boots. To leave.',
        'Charms are still on the hooks. Take what you like. I\'ll put it on the Prince\'s account. Ha!',
      ] },
      { lines: [
        'Antler & Awl. Hides, harness, horn — and a few charms off people who don\'t need them any more.',
        'Everything I stretch on that hoop came out of the Prince\'s forest. I try not to ask whose deer it was.',
        'I\'ll buy fish too. Ford salmon\'s good eating. An antler pike, now — that\'s a story on a plate.',
      ] },
    ],
    barks: [
      { when: PRINCE, lines: ['Boots! Good walking boots!'] },
      { lines: ['Hides and harness!', 'Mind the hoop, the hide\'s still wet.'] },
    ],
  },
  {
    id: NPC_BURDOCK, name: 'Mother Burdock', title: 'Grandmother of a Penned Household',
    look: look({ body: 0xc8a486, accent: 0x4a3a2a, hat: 'hood', traits: ['cane', 'scarf'], size: 0.85 }),
    at: { x: 1200, y: 1095 },
    talks: [
      { when: EMPRESS, lines: [
        'Wren asked me what a garden was for, if not for people. I said: for flowers, love. Just flowers.',
        'We\'re going back to the old house. We\'ll grow beans. Nobody will weigh them.',
      ] },
      { when: PRINCE, lines: [
        'Every pen in the court stood open by dusk. Wren\'s asleep on my knee and her cap\'s on the fire.',
        'I keep waking in the night to listen for the horn. There\'s no horn. Only owls. I\'d forgotten owls.',
      ] },
      { when: { questDone: Q_PENS }, lines: [
        'Wren\'s out, and her mother, and the little ones. The pen\'s got nobody\'s name on it now.',
        'But there are other pens, dear. Other families. The next hunt is still coming.',
      ] },
      { lines: [
        'They penned my son\'s family at the turn of the season. One brace short. One. Two hares, light.',
        'Wren is nine. She wears the antler cap they gave her. She says it makes her feel brave.',
        'I sit here every day so she can see me through the stakes. That\'s all I can do. Sit.',
      ] },
    ],
    barks: [
      { when: PRINCE, lines: ['Owls. Listen. Just owls.'] },
      { when: { questDone: Q_PENS }, lines: ['There are other pens, dear.'] },
      { lines: ['I\'m here, Wren. I\'m here.', 'One brace. One brace short.'] },
    ],
  },
  {
    id: NPC_PIP, name: 'Pip Larrow', title: 'Kennel Boy',
    look: look({ body: 0xd8b494, accent: 0x8a2a1e, hat: 'none', traits: ['satchel', 'bandage'], size: 0.75 }),
    at: { x: 700, y: 1110 },
    wander: 30,
    talks: [
      { when: EMPRESS, lines: [
        'Bramble had puppies! Five! I\'m going to teach them to find mushrooms. And lost sheep. And people, but nicely.',
      ] },
      { when: PRINCE, lines: [
        'The Kennelmaster\'s gone and I\'m in charge of all the hounds now. All of them!',
        'They don\'t have to run anybody any more. They can just be dogs. They\'re very good at being dogs.',
      ] },
      { when: { questDone: Q_HOUND }, lines: [
        'Bramble\'s sleeping under my cot. She snores like a saw. I don\'t mind.',
        'Ironsides\' chain is at the bottom of the ford. I hope a pike eats it.',
      ] },
      { lines: [
        'That\'s Ruff and Tansy and Old Grey. And that\'s Bramble — the one lying down. She won\'t get up for the hunt.',
        'The Kennelmaster says a hound that won\'t run people is a waste of meat. He says it like it\'s a joke.',
      ] },
    ],
    barks: [
      { when: PRINCE, lines: ['Sit! Good! Good dogs! All of you good!'] },
      { lines: ['Come on, Bramble. Please get up.', 'Don\'t pat Ruff, he bites. Pat Tansy.'] },
    ],
  },
  {
    id: NPC_GRIMBLE, name: 'Grimble Ash', title: 'Charcoal-Burner and Poacher',
    look: look({ body: 0x9a7a62, accent: 0x2a2a22, hat: 'beanie', traits: ['pipe', 'beard', 'pack'], size: 1.1, hand: 0x1a140c }),
    at: { x: 470, y: 450 },
    talks: [
      { when: EMPRESS, lines: [
        'Thirty years I poached the Empress\'s deer to feed the pens. Now it\'s just deer. Feels near honest.',
      ] },
      { when: PRINCE, lines: [
        'No more Verderers, no more traps, no more Fang. I took a hare out of the park in broad day. Waved to it.',
      ] },
      { when: { questDone: Q_TRAPS }, lines: [
        'Flint\'s gone off with his musket and his nose in the air. The park\'s safe for running, if you have to run.',
      ] },
      { lines: [
        'Burn charcoal by day, take a deer by night, leave the meat at the pens. Somebody has to feed them.',
        'Don\'t look at me like that. The Empress\'s deer eat better than the Empress\'s people. I fix it.',
      ] },
    ],
    barks: [
      { lines: ['Smoke\'s my alibi.', 'Didn\'t see me. Didn\'t see nothing.'] },
    ],
  },
  {
    id: NPC_OTTILIE, name: 'Ottilie Wade', title: 'Ford-Keeper',
    look: look({ body: 0xc8a088, accent: 0x2e4a4a, hat: 'souwester', traits: ['rod', 'scarf'], size: 1 }),
    at: { x: 1650, y: 1060 },
    wander: 20,
    talks: [
      { when: EMPRESS, lines: [
        'Salmon ran this morning like they had somewhere to be. I know the feeling now.',
      ] },
      { when: PRINCE, lines: [
        'Nobody\'s washing hunt-blood in my ford any more. The water\'s gone clear down to the stones.',
      ] },
      { when: { questDone: Q_RING }, lines: [
        'Tobin\'s ring is back on his finger. He wears it to fish. Says it brings the salmon. It doesn\'t. He knows.',
      ] },
      { lines: [
        'I keep the Ford. Mend the stones, pull out who falls in. Quarry, mostly. They run for the water.',
        'Hounds can\'t follow a scent through running water. Everybody knows. The hunters know too.',
        'Fish the pool if you\'ve a rod. Salmon in the deeps. And the old antler pike, if he\'s in a mood.',
      ] },
    ],
    barks: [
      { lines: ['Stones are slick, mind.', 'Water\'s up. Salmon\'ll be in.'] },
    ],
  },
  {
    id: NPC_FEWTRELL, name: 'Ambrose Fewtrell', title: 'Clerk of the Game Larder',
    look: look({ body: 0xd8c0a8, accent: 0x2a4a2a, hat: 'tophat', traits: ['book', 'glasses'], size: 0.9 }),
    at: { x: 1310, y: 770 },
    talks: [
      { when: EMPRESS, lines: [
        'I have burned the tally boards. All of them. I wept the whole time. Then I had a very large lunch.',
      ] },
      { when: PRINCE, lines: [
        'No more weighing. I have been told to "find honest work". I am considering the hares. They seem honest.',
      ] },
      { when: { questDone: Q_RING }, lines: [
        'The Reeve is quite unwell. Something about a fish. I have struck the Wade household\'s mark. Quietly.',
      ] },
      { lines: [
        'One brace a household a week, weighed on the steelyard. I write the number. The number is not my fault.',
        'If it is short, I make a mark. Five marks and the household runs. I do not run the hunt. I only count.',
        'Please stop looking at the board. Some of those names I went to school with.',
      ] },
    ],
    barks: [
      { lines: ['Light. Light again.', 'I only count. I only count.'] },
    ],
  },
  {
    id: NPC_SORREL, name: 'Sorrel Hartley', title: 'Keeper of the Deer Park Gate',
    look: look({ body: 0xa87e60, accent: 0x2a4a2a, hat: 'antlers', traits: ['lantern', 'scarf'], size: 1.05 }),
    at: { x: 1000, y: 1115 },
    talks: [
      { when: EMPRESS, lines: [
        'I\'ve taken the gate off its hinges. It\'s firewood now. The deer come and go as they like. So do I.',
      ] },
      { when: PRINCE, lines: [
        'The Last Run never happened. Do you know how long I\'ve waited to say that? Nine seasons.',
      ] },
      { when: { questDone: Q_LASTRUN }, lines: [
        'You walked into Fangholt and the hunt never rode. Every one of them is out of the caps.',
      ] },
      { lines: [
        'I open the gate for the quarry and I close it behind them. Then the horn goes and I count to a hundred.',
        'Every family I\'ve let through, I\'ve counted. Out loud. So they know somebody is.',
      ] },
    ],
    barks: [
      { when: PRINCE, lines: ['Gate\'s open. Gate stays open.'] },
      { lines: ['Ninety-eight. Ninety-nine.', 'Keep away from the paling, stranger.'] },
    ],
  },
  {
    id: NPC_MAB, name: 'Mab Cleaver', title: 'Cook of the Long Hall',
    look: look({ body: 0xc8987a, accent: 0xe8e0d0, hat: 'chef', traits: ['apron', 'tool'], size: 1.25 }),
    at: { x: 860, y: 650 },
    wander: 30,
    talks: [
      { when: EMPRESS, lines: [
        'I cooked for the whole court last night. One table, everyone at it. Even the clerk. He cried into the gravy.',
      ] },
      { when: PRINCE, lines: [
        'No more hunt feasts. I made a stew for the families out of the pens instead. Good one. Barley.',
      ] },
      { when: { encounter: ENC_HORN }, lines: [
        'Halloo came in hoarse and sat by my fire and didn\'t say a word. First quiet night in the hall I can recall.',
      ] },
      { lines: [
        'After a run the hunters feast in the Long Hall. Venison, always. I don\'t ask whose run it was.',
        'Under those antlers on the gable is every stag the Prince ever killed. Under the floor is everything else.',
      ] },
    ],
    barks: [
      { lines: ['Mind the plaza, it\'s greasy.', 'Hall\'s shut till the horn.'] },
    ],
  },
  {
    id: NPC_WREN, name: 'Wren Burdock', title: 'Nine, Uncapped',
    look: look({ body: 0xd8b494, accent: 0x6a8a3a, hat: 'wreath', traits: ['scarf'], size: 0.7 }),
    at: { x: 1240, y: 1100 },
    wander: 40,
    present: PRINCE,
    talks: [
      { when: EMPRESS, lines: [
        'Gran says the Empress is gone. I made a crown of daisies. Daisies don\'t prune anybody.',
      ] },
      { lines: [
        'I burned my cap. Gran let me light it. It smelled of the pens.',
        'I\'m going to be a ford-keeper like Ottilie. Then if anyone ever has to run, I\'ll help them over.',
      ] },
    ],
    barks: [
      { lines: ['Look, Gran! No cap!', 'Daisies!'] },
    ],
  },
];

export const WILDHUNT_CROWD_BARKS: Talk[] = [
  { when: EMPRESS, lines: [
    'Families coming home from the Glasshouse. Green under the nails, but home.',
    'Who\'d have thought a deer park looked so nice from inside the fence?',
    'Nobody weighed my hares this week. I ate them.',
  ] },
  { when: PRINCE, lines: [
    'Fangholt\'s doors are open. There\'s a whole wall of caps in there. Hundreds.',
    'Pens are empty. Empty!',
    'Kennel boy\'s running the pack now. They mostly lie in the sun.',
    'Haven\'t heard the horn since. I keep thinking I do.',
  ] },
  { when: { encounter: ENC_FALCON }, lines: [
    'Kestrel\'s flying Sloe at rabbits. Proper rabbits.',
  ] },
  { when: { encounter: ENC_STAG }, lines: [
    'The old stag\'s grazing by the high seat like a lamb. Rowan just sits and watches him.',
  ] },
  { when: { encounter: ENC_QUARRY }, lines: [
    'They say Bracken\'s own hounds ran him into the ford. Ha!',
  ] },
  { lines: [
    'One brace a week. One brace. My boy\'s been out every night.',
    'Don\'t stand near the pens. They\'ll write your name down.',
    'When the horn goes, you go indoors. Whoever it\'s for.',
    'Short again. Light hares this season. Everybody\'s hares are light.',
    'My sister ran last spring. They never found her. We tell ourselves that.',
    'Prince Fang counts to a hundred. Slowly, he says. Very slowly.',
  ] },
];
