import type { NpcDef, NpcLook, Talk } from '../../../../IslesTypes';
import { ENC_BEANSTALK, ENC_GOOSE, ENC_HOARD, ENC_HUFF, ENC_MIRROR } from './encounters';

/**
 * The people of the Fable Court. On Highspire every breath drawn above the cloud line is metered,
 * and a story told aloud is the longest breath there is — so in Fable stories are taxed by the
 * word. Prince Legend licenses which tales may be told (the ones where a prince saves the day),
 * casts the town to perform them, and has the censors burn the rest on the square. A household
 * that falls behind is becalmed: its pop-up house is folded shut over it, the book clasped with
 * a breath-meter, and the family sleeps inside, barely breathing, until somebody pays.
 *
 * Every NPC answers to the court's state: their own quest done, Prince Legend down, the King
 * down. Blocks are listed most specific first.
 */

export const NPC_QUIRE = 'fable-quire';
export const NPC_YARROW = 'fable-yarrow';
export const NPC_ANSEL = 'fable-ansel';
export const NPC_TOBIAH = 'fable-tobiah';
export const NPC_ELLA = 'fable-ella';
export const NPC_CORWIN = 'fable-corwin';
export const NPC_PELL = 'fable-pell';
export const NPC_WICK = 'fable-wick';
export const NPC_LACEY = 'fable-lacey';
export const NPC_BRAMWELL = 'fable-bramwell';

export const Q_PAGE = 'fable-the-unburnt-page';
export const Q_CRUMBS = 'fable-breadcrumbs';
export const Q_STRINGS = 'fable-no-strings';
export const Q_MIDNIGHT = 'fable-before-midnight';
export const Q_CHAPTER = 'fable-the-last-chapter';

const PRINCE = { prince: 'legend' } as const;
const KING = { monarch: 'aerion' } as const;

const look = (l: NpcLook): NpcLook => l;

export const FABLE_NPCS: NpcDef[] = [
  {
    id: NPC_QUIRE, name: 'Quire Hollowell', title: 'Bookbinder, The Last Page',
    look: look({ body: 0xe0c0a0, accent: 0x3e5c9a, hat: 'plume', traits: ['glasses', 'apron', 'book'], size: 0.95, hand: 0x6a4a3a }),
    at: { x: 980, y: 770 },
    role: { kind: 'shop', id: 'fable-shop' },
    talks: [
      { when: KING, lines: [
        'The Lung\'s bottles are broken and I\'ve had people in all morning asking for blank books. Blank!',
        'Everyone wants to write their own down. I\'ve run out of glue. I\'ve never been happier.',
      ] },
      { when: PRINCE, lines: [
        'No more licences. I\'m binding everything — the Low Road tales, the nursery rhymes, the rude ones.',
        'The charms are still on the shelf. Each one\'s a tale too short to bind. Carry one. It carries you.',
      ] },
      { lines: [
        'The Last Page. Licensed bindings only, says the sign. The sign is a liar and so am I, a little.',
        'Those charms are tales too short for a book. A garter that walks seven leagues, a seed, a locket.',
        'A story you carry and never speak aloud costs no breath. The meter can\'t hear a pocket.',
        'I buy fish as well. Wishing carp from the moat. A bard bass, if you\'re lucky, still humming.',
      ] },
    ],
    barks: [
      { when: PRINCE, lines: ['Blank books! Write your own!'] },
      { lines: ['Licensed bindings only. Ahem.', 'Mind the glue-pot.'] },
    ],
  },
  {
    id: NPC_YARROW, name: 'Granny Yarrow', title: 'Teller of the Low Road',
    look: look({ body: 0xd8c0a8, accent: 0x6a3e7a, hat: 'hood', traits: ['cane', 'scarf', 'glasses'], size: 0.85 }),
    at: { x: 1290, y: 940 },
    talks: [
      { when: KING, lines: [
        'I told the whole Low Road book out loud on the square last night. Every word. Nobody metered a breath.',
        'Took me four hours. I\'m hoarse as a crow. Best night of my life.',
      ] },
      { when: PRINCE, lines: [
        'The censors\' post is firewood. The bonfire\'s out. The children are telling each other the wolf wins.',
        'He doesn\'t, mind. But they\'re allowed to say he does. That\'s the whole of it, dear. Being allowed.',
      ] },
      { when: { questDone: Q_PAGE }, lines: [
        'Quire bound it back up, scorch and all. I keep it under my shawl. I read it to myself without moving my lips.',
        'Blotwell\'s been stamping licences with his left hand. Funny, that.',
      ] },
      { lines: [
        'They burned my book this morning. The Tales of the Low Road. My grandmother\'s grandmother wrote it down.',
        'Stories of the folk under the clouds. No princes in them. That\'s why it burned.',
        'I sit here so the smoke knows somebody\'s watching. Every page I watch go up, I say the first line of it.',
      ] },
    ],
    barks: [
      { when: PRINCE, lines: ['Once upon a time — and it costs nothing!'] },
      { lines: ['There was once a girl who... no. Hush, Yarrow. The meter.', 'Every page. I say every page.'] },
    ],
  },
  {
    id: NPC_ANSEL, name: 'Ansel Fell', title: 'Woodcutter',
    look: look({ body: 0xc89a78, accent: 0x8a3a2a, hat: 'beanie', traits: ['beard', 'tool'], size: 1.3, hand: 0x5a3a20 }),
    at: { x: 1030, y: 1240 },
    talks: [
      { when: KING, lines: [
        'Hob wants to be a woodcutter. Gretl wants to be a witch — a good one, she says. I said both, then. Why not.',
      ] },
      { when: PRINCE, lines: [
        'The tollhouse is just a house now. The twins took the barley-sugar bar home. They lick it on Sundays.',
      ] },
      { when: { questDone: Q_CRUMBS }, lines: [
        'They\'re home. They\'re sleeping in their own beds and breathing loud enough to wake the street. Listen!',
        'I\'ve put a bell on the woods path. If anyone leaves a sugar trail again, I\'ll hear it and come with my axe.',
      ] },
      { lines: [
        'My twins followed a trail of sugar into the wood three days gone. Hob and Gretl. Seven, the pair of them.',
        'There\'s a tollhouse in the wood made of gingerbread. Mother Treacle buys children\'s breath for sweets.',
        'I\'ve walked round it forty times with my axe. The door won\'t open for anyone over four foot.',
      ] },
    ],
    barks: [
      { when: { questDone: Q_CRUMBS }, lines: ['Hear that? That\'s them, breathing.'] },
      { lines: ['Hob! Gretl!', 'Don\'t eat anything you find on a path.'] },
    ],
  },
  {
    id: NPC_TOBIAH, name: 'Tobiah Whittle', title: 'Toymaker',
    look: look({ body: 0xd0b090, accent: 0x5a6a3a, hat: 'cap', traits: ['glasses', 'apron', 'tool'], size: 0.9 }),
    at: { x: 760, y: 1000 },
    talks: [
      { when: KING, lines: [
        'Pinchbeck asked me last night if he\'ll ever breathe. I said I don\'t know. He said good, then he won\'t owe.',
        'Then he laughed. I didn\'t carve that laugh. I\'d remember.',
      ] },
      { when: PRINCE, lines: [
        'The Playhouse is dark. All the puppets were cut down and given back to their makers. Some of them cried.',
      ] },
      { when: { questDone: Q_STRINGS }, lines: [
        'He\'s on the bench by the window, sanding his own knees. He says they squeak when he runs. He runs everywhere.',
        'I keep his strings in a drawer. I\'ll never use them. I just like knowing where they are.',
      ] },
      { lines: [
        'I carved a boy. Pinchbeck. Lime-wood, walnut eyes. One morning he sat up and asked me for breakfast.',
        'The Prince heard. A boy that talks and never breathes? The perfect actor. Never taxed. Never fined.',
        'They strung him up in the Playhouse. He plays the Prince\'s squire, three shows a day. I go to all three.',
      ] },
    ],
    barks: [
      { when: { questDone: Q_STRINGS }, lines: ['Walk, Pinchbeck. Don\'t run in the shop.'] },
      { lines: ['Third show at six. I\'ll be in the front row.', 'Lime-wood. Walnut eyes. He\'s mine.'] },
    ],
  },
  {
    id: NPC_ELLA, name: 'Ella Hearthstone', title: 'Scullery Maid of Castle Evermore',
    look: look({ body: 0xe8c8a8, accent: 0x6a8ab8, hat: 'veil', traits: ['apron', 'scarf'], size: 0.9 }),
    at: { x: 640, y: 740 },
    talks: [
      { when: KING, lines: [
        'I wore the blue dress to the square and danced till three. Nobody struck anything. Clocks are just clocks now.',
      ] },
      { when: PRINCE, lines: [
        'I\'ve quit the scullery. I\'m going to sweep chimneys instead. At least the soot doesn\'t keep a ledger.',
      ] },
      { when: { questDone: Q_MIDNIGHT }, lines: [
        'Midnight came and went and the meter on my chest never moved. Twelve stopped him. You stopped Twelve.',
        'I keep wishing on the carp anyway. Small things. Dry socks. It\'s nice to wish for small things.',
      ] },
      { lines: [
        'Our household\'s three breaths short. At midnight the Clockwarden strikes, and our book shuts on us.',
        'Stepsisters, mother, me. All folded up together in the dark till somebody pays. Somebody never pays.',
        'They say a wishing carp in the moat will grant one wish if you catch it fair. I can\'t fish. Can you?',
      ] },
    ],
    barks: [
      { when: { questDone: Q_MIDNIGHT }, lines: ['Dry socks. That\'s my wish today.'] },
      { lines: ['Is it eleven yet?', 'Mind the ashes, I\'ve only just swept.'] },
    ],
  },
  {
    id: NPC_CORWIN, name: 'Corwin Lark', title: 'Unlicensed Bard',
    look: look({ body: 0xd8b494, accent: 0xb84a52, hat: 'plume', traits: ['scarf', 'satchel'], size: 1.05, eye: 0xffe08a }),
    at: { x: 1500, y: 880 },
    wander: 30,
    talks: [
      { when: KING, lines: [
        'I\'ve written a song about you. It\'s eleven verses. You can\'t stop me singing it. Nobody can now!',
      ] },
      { when: PRINCE, lines: [
        'Every tale in Fable has an ending now. The Prince\'s ends with you. I\'ve sung it twice already today.',
      ] },
      { when: { questDone: Q_CHAPTER }, lines: [
        'The last chapter\'s written. I sang it at the drawbridge and the chains on the tower rang in tune.',
      ] },
      { lines: [
        'I sing with my mouth shut. Hum, really. The meter catches words, not hums. Mostly.',
        'Every licensed tale in Fable ends "and the Prince saved the day". Every single one. Even the goose one.',
        'There used to be a different ending to the Prince\'s own story. The dragon in the tower knew it.',
      ] },
    ],
    barks: [
      { when: PRINCE, lines: ['And THEN — oh, you\'ll love this bit —'] },
      { lines: ['Mm-mm-mmm. Mm-mmm.', 'Hum along, if you like. Humming\'s free.'] },
    ],
  },
  {
    id: NPC_PELL, name: 'Pell Dabney', title: 'Keeper of the Moat',
    look: look({ body: 0xc8a888, accent: 0x3e7a5e, hat: 'souwester', traits: ['rod', 'pipe'], size: 1.05 }),
    at: { x: 740, y: 660 },
    wander: 20,
    talks: [
      { when: KING, lines: [
        'Moat\'s full of wishes nobody\'s afraid to make any more. The carp look exhausted.',
      ] },
      { when: PRINCE, lines: [
        'Drawbridge is down and it\'s staying down. I chopped through the chain myself. Felt like a wish come true.',
      ] },
      { when: { questDone: Q_MIDNIGHT }, lines: [
        'Heard you hooked a carp for the Hearthstone girl. Fair catch too. The carp\'ll honour that.',
      ] },
      { lines: [
        'I keep the moat. Skim the lilies, feed the carp, fish out the odd licence somebody threw in.',
        'Wishing carp — gold fins, wise old faces. Catch one fair and it owes you a small wish. Small, mind.',
        'And the bard bass. Sing near the water and they hum it back for a year. Half the town\'s songs live in there.',
      ] },
    ],
    barks: [
      { lines: ['Lilies want skimming.', 'Easy on the bank, it crumbles.'] },
    ],
  },
  {
    id: NPC_WICK, name: 'Wick Flint', title: 'Stagehand at the Prince\'s Playhouse',
    look: look({ body: 0xd8b8a0, accent: 0x2a2236, hat: 'cap', traits: ['tool', 'satchel', 'bandage'], size: 0.8 }),
    at: { x: 470, y: 1000 },
    wander: 25,
    talks: [
      { when: KING, lines: [
        'We\'re putting on a play the town wrote itself. It\'s terrible. Everybody loves it.',
      ] },
      { when: PRINCE, lines: [
        'No more shows by licence. I\'ve taken the fly-lines down and used them for a washing line. Better use.',
      ] },
      { when: { questDone: Q_STRINGS }, lines: [
        'Marionne\'s been sitting in the empty stalls all week watching an empty stage. I sweep round her.',
      ] },
      { lines: [
        'I work the fly-loft. Ropes, sandbags, the moon on a pulley. And the puppets\' lines — the strings, I mean.',
        'The puppets never breathe so the Prince never pays them. Never fines them either. They\'re his favourites.',
      ] },
    ],
    barks: [
      { lines: ['Mind your head, there\'s a moon up there.', 'Places in ten!'] },
    ],
  },
  {
    id: NPC_LACEY, name: 'Mother Lacey', title: 'Who Lives in the Boot',
    look: look({ body: 0xd8b8a0, accent: 0xb84a52, hat: 'nightcap', traits: ['apron', 'cane'], size: 1.15 }),
    at: { x: 2060, y: 530 },
    talks: [
      { when: KING, lines: [
        'All twenty-two of them awake at once. Running up and down the laces. I don\'t know what to do. Isn\'t it grand?',
      ] },
      { when: PRINCE, lines: [
        'The meters are coming off the little ones one by one. Their breath comes back in sighs. Little warm sighs.',
      ] },
      { when: { encounter: ENC_BEANSTALK }, lines: [
        'You beat young Jem? Good. He\'s a sweet boy, but that matinee brings the giant\'s other boot down every day.',
      ] },
      { lines: [
        'The giant left this boot when Jem first chopped the stalk. I moved in. Then the children came.',
        'Twenty-two of them. Becalmed households\' little ones, the ones whose books were shut while they were out.',
        'They sleep up in the cuff in rows, meters ticking. I tuck them in. I can\'t do more than tuck them in.',
      ] },
    ],
    barks: [
      { lines: ['Shh — they\'re asleep. They\'re always asleep.', 'Twenty-two. I count them every hour.'] },
    ],
  },
  {
    id: NPC_BRAMWELL, name: 'Bramwell Oakes', title: 'Keeper of the Dragon\'s Chain',
    look: look({ body: 0xb89878, accent: 0x5a5a6a, hat: 'helmet', traits: ['lantern', 'beard', 'book'], size: 1.2, hand: 0x3a3a44 }),
    at: { x: 430, y: 1330 },
    talks: [
      { when: KING, lines: [
        'She flew last night. Once round the spire and back to the tower. She came back. She didn\'t have to.',
      ] },
      { when: PRINCE, lines: [
        'I\'ve unpegged the chains. Old Wyrmwood just lies there with her eyes open, listening to the town talk.',
        'Forty years I kept her. She was never my prisoner. I was her audience.',
      ] },
      { when: { encounter: ENC_HOARD }, lines: [
        'You woke her up and pointed her at a knight. She hasn\'t laughed like that since before my beard.',
      ] },
      { lines: [
        'That\'s Wyrmwood up top. Fable\'s old teller, before the licences. They chained her for one ending she told.',
        'The hoard round the tower is the fines paid by people who told stories. She won\'t let anyone take it back.',
        'I bring her lamp-oil and read to her. Licensed tales. She sighs at every one. Little puffs of smoke.',
      ] },
    ],
    barks: [
      { lines: ['Quiet near the tower.', 'She\'s listening. She\'s always listening.'] },
    ],
  },
];

export const FABLE_CROWD_BARKS: Talk[] = [
  { when: KING, lines: [
    'Tell me a story! Any story! A long one!',
    'I said "once upon a time" out loud and nothing ticked. Nothing!',
    'They opened all the books on Once Street. Whole families, yawning in the sun.',
  ] },
  { when: PRINCE, lines: [
    'The censors\' post is down. Somebody made a swing out of it.',
    'My book\'s open again. My house is standing up again! Look at it!',
    'They\'re telling the wolf\'s side at the Playhouse tonight. I\'m going.',
    'Castle Evermore\'s gate is open and there\'s nothing in there but blank pages.',
  ] },
  { when: { encounter: ENC_HUFF }, lines: [
    'Lupo\'s been helping rebuild the straw house. With mittens on.',
  ] },
  { when: { encounter: ENC_MIRROR }, lines: [
    'Gilt turned the mirror round. It\'s been sulking at the hedge all day.',
  ] },
  { when: { encounter: ENC_GOOSE }, lines: [
    'Hen\'s goose hatched a grey gosling. Hen\'s calling it Pebble.',
  ] },
  { lines: [
    'Mind what you say on the square. Every word costs.',
    'Short sentences. Short breaths. That\'s how we live here.',
    'Licensed tale at six: the Prince and the Dragon. Again.',
    'The Hartwells\' book shut last night. Just folded, like that. Clasp and meter.',
    'Don\'t hum near the Office. They\'ll say it\'s an unlicensed tune.',
    'Ever notice every story ends with the Prince? Shh. Don\'t say I said.',
  ] },
];
