import type { QuestDef } from '../../../../IslesTypes';
import { BONFIRE, THEATRE, TOLLHOUSE } from './areaArt';
import {
  NPC_ANSEL, NPC_BRAMWELL, NPC_CORWIN, NPC_ELLA, NPC_QUIRE, NPC_TOBIAH, NPC_WICK, NPC_YARROW, Q_CHAPTER,
  Q_CRUMBS, Q_MIDNIGHT, Q_PAGE, Q_STRINGS,
} from './npcs';

/**
 * Five small stories from the Fable Court: an old teller's banned book, its pages blown off the
 * censors' bonfire before the fire could finish them; a woodcutter's twins who followed a sugar
 * trail to a tollhouse that buys children's breath; a toymaker's wooden boy strung up to play the
 * Prince's squire because a boy who never breathes is never taxed; a scullery maid whose household
 * is folded shut at midnight unless a wishing carp buys her an hour; and the ending of Prince
 * Legend's own story, which a dragon was chained for telling.
 */

const AREA = 'fable';

export const FABLE_QUESTS: QuestDef[] = [
  {
    id: Q_PAGE, area: AREA, name: 'The Unburnt Page', giver: NPC_YARROW,
    offer: [
      'When they threw my book on, the updraught took some of it. I saw four pages go up and over the stones.',
      'They\'ll be scorched. They\'ll be lying about the square where the censors haven\'t swept yet.',
      'Four pages is a story, dear. A short one. The one about the girl who walked down through the clouds.',
      'Will you pick them up before Blotwell does?',
    ],
    accept: [
      'Quickly, and don\'t read them aloud. Every word on those pages would cost you breath you can\'t spare.',
    ],
    stages: [
      {
        objective: {
          kind: 'collect', area: AREA, label: 'Scorched page', emoji: '📜', color: 0xeadcb4,
          spots: [{ x: 1010, y: 885 }, { x: 1290, y: 800 }, { x: 1245, y: 1010 }, { x: 1060, y: 1005 }],
        },
        hint: 'Gather 4 scorched pages blown across Pagehall Square',
      },
      {
        objective: {
          kind: 'talk', npc: NPC_QUIRE,
          lines: [
            'Yarrow\'s Low Road pages? Give them here. Scorched at the edges — good, it makes them look licensed-old.',
            'A sewn signature, a plain board, a dull brown cover nobody looks at twice. There. A story in disguise.',
            'Blotwell will smell the smoke on it, mind. Censors always come back for what got away.',
          ],
        },
        hint: 'Take the pages to Quire Hollowell at The Last Page to be rebound',
      },
      {
        objective: {
          kind: 'duel', area: AREA,
          foe: {
            id: 'fable-the-unburnt-page-duel', court: AREA, name: 'Struck from the Record',
            foeName: 'Censor Blotwell', foeElement: 'ink', difficulty: 3, gimmick: '',
            at: { x: BONFIRE.x, y: BONFIRE.y + 120 },
            look: { body: 0xd8c8b8, accent: 0x2a2236, hat: 'tophat', traits: ['book', 'glasses', 'mask'], size: 1.1, eye: 0xa0202a },
            challenge: [
              'Four pages short on the bonfire tally. Unlicensed. Unmetered. Unforgivable. Hand them over.',
              'I don\'t burn stories, citizen. I correct them. Hold still while I blot you out.',
            ],
            beaten: ['My stamp... my ink... Let the record show the record has been — oh, just let it go.'],
            coins: 70,
          },
        },
        hint: 'Stop Censor Blotwell at the bonfire before he burns the book again',
      },
    ],
    complete: [
      'The girl who walked down through the clouds. I can feel it through the cover. Warm, still.',
      'I\'ll never read it aloud. I\'ll lend it, though. One reader at a time, under a shawl. Take this, dear.',
    ],
    reward: { orbs: 6, coins: 45 },
  },
  {
    id: Q_CRUMBS, area: AREA, name: 'Breadcrumbs', giver: NPC_ANSEL,
    offer: [
      'Somebody lays a trail of sugared crumbs from the square down into the wood every night. Children follow it.',
      'At the end is Mother Treacle\'s tollhouse. A sweet for a breath, she says. Children don\'t know what that costs.',
      'My twins are in her larder, sleeping, their meters ticking down. I can\'t get in. But you could stop the trail.',
      'Pick up the crumbs so no one else follows, and then — then knock on her door for me.',
    ],
    accept: [
      'Five crumbs, from the square to the candy posts. Don\'t eat any. I mean it. Not one.',
    ],
    stages: [
      {
        objective: {
          kind: 'collect', area: AREA, label: 'Sugared crumb', emoji: '🍬', color: 0xf4c8d8,
          spots: [{ x: 1150, y: 1080 }, { x: 1110, y: 1180 }, { x: 1250, y: 1225 }, { x: 1030, y: 1305 }, { x: 1320, y: 1300 }],
        },
        hint: 'Pick up the 5 sugared crumbs on the path into the Deep Dark Wood',
      },
      {
        objective: { kind: 'visit', area: AREA, at: { x: TOLLHOUSE.x - 50, y: TOLLHOUSE.y + 30 }, r: 70, label: 'The tollhouse window' },
        hint: 'Look in at the window of the gingerbread tollhouse',
      },
      {
        objective: {
          kind: 'duel', area: AREA,
          foe: {
            id: 'fable-breadcrumbs-duel', court: AREA, name: 'A Sweet for a Breath',
            foeName: 'Mother Treacle', foeElement: 'gum', difficulty: 4, gimmick: '',
            at: { x: TOLLHOUSE.x + 10, y: TOLLHOUSE.y + 70 },
            look: { body: 0xf0c8b8, accent: 0xe87ab8, hat: 'wizard', traits: ['apron', 'cane'], size: 1.15, eye: 0xffa0d0 },
            challenge: [
              'Picking up my crumbs? Naughty. Those were a gift. Every gift has a little price, dear. Just a breath.',
              'You\'re too tall for the door, so I\'ll come out. I\'ll sugar you and salt you and put you on the shelf.',
            ],
            beaten: ['Not the oven — the — oh. You only knocked me down. How... unfairy-tale of you. Take the brats.'],
            coins: 75,
          },
        },
        hint: 'Face Mother Treacle at her tollhouse door',
      },
    ],
    complete: [
      'They walked out holding hands, sticky to the elbows, yawning. Gretl said "Papa, I owe a lady nine breaths."',
      'I said you don\'t, love. You don\'t owe anyone anything. Here — it\'s from the woodpile money. Take it.',
    ],
    reward: { orbs: 7, coins: 40 },
  },
  {
    id: Q_STRINGS, area: AREA, name: 'No Strings', giver: NPC_TOBIAH,
    offer: [
      'Pinchbeck is strung on nine lines from the fly-loft. Marionne works him from the bridge above the stage.',
      'I asked to buy him back. She laughed. "A boy who never breathes? He\'s worth more than the castle."',
      'Wick the stagehand is a good lad. He hates it up there. He might tell you how the loft is rigged.',
    ],
    accept: [
      'Wick hangs about the side of the Playhouse between shows. Talk to him. Please hurry — the six o\'clock is next.',
    ],
    stages: [
      {
        objective: {
          kind: 'talk', npc: NPC_WICK,
          lines: [
            'Pinchbeck\'s lines all run to one cleat, round the back, behind the backdrop. One cleat. Marionne\'s lazy.',
            'Slip that and he drops — gently, the counterweights see to that — right into the prompt box.',
            'But Marionne feels a slack line through her fingers before it hits the floor. She\'ll be down in a blink.',
          ],
        },
        hint: 'Ask Wick Flint how the Playhouse fly-loft is rigged',
      },
      {
        objective: { kind: 'visit', area: AREA, at: { x: THEATRE.x + 150, y: THEATRE.y - 20 }, r: 60, label: 'The fly-line cleat' },
        hint: 'Slip Pinchbeck\'s cleat behind the Playhouse backdrop',
      },
      {
        objective: {
          kind: 'duel', area: AREA,
          foe: {
            id: 'fable-no-strings-duel', court: AREA, name: 'Cut Loose',
            foeName: 'Puppetmaster Marionne', foeElement: 'string', difficulty: 4, gimmick: '',
            at: { x: THEATRE.x, y: THEATRE.y + 80 },
            look: { body: 0xe8d8d0, accent: 0x8a1a2a, hat: 'tophat', traits: ['mask', 'scarf'], size: 1.05, eye: 0xd8d8ff },
            challenge: [
              'My squire\'s line went SLACK. Mid-scene. In front of the licensed audience. Do you know what that costs?',
              'Every string I own is tied to something. Let\'s see what yours are tied to.',
            ],
            beaten: ['My hands are shaking. I can\'t feel the lines. Is this what it\'s like for them? All of them?'],
            coins: 75,
          },
        },
        hint: 'Face Puppetmaster Marionne in front of the Playhouse stage',
      },
    ],
    complete: [
      'He walked in on his own two feet. Lime-wood feet. He said "Father, I missed the end of the play."',
      'I said you can make up your own end now. He hasn\'t stopped since. Here. This is for the cleat.',
    ],
    reward: { orbs: 7, coins: 35 },
  },
  {
    id: Q_MIDNIGHT, area: AREA, name: 'Before Midnight', giver: NPC_ELLA,
    offer: [
      'Midnight is when the Clockwarden strikes the debts. Twelve strokes, and our book folds shut over us.',
      'A wishing carp caught fair grants one small wish. I only need a small one. One more hour, that\'s all.',
      'One more hour, and the coal-money comes in, and we\'re paid. Will you catch me a carp?',
    ],
    accept: [
      'The moat by the drawbridge. Pell says they bite best where the lilies are thick. Hurry — it\'s gone ten.',
    ],
    stages: [
      {
        objective: { kind: 'fish', fish: 'fish-wishing-carp', count: 1 },
        hint: 'Catch a Wishing Carp in the castle moat',
      },
      {
        objective: {
          kind: 'deliver', npc: NPC_ELLA, item: 'fish-wishing-carp', count: 1,
          lines: [
            'Oh, look at its face. It looks like my grandfather. All right, carp. One more hour. Please.',
            '...It blinked. Did you see? It blinked! Listen — the castle clock. It\'s gone back. It\'s eleven again.',
            'Oh no. He\'ll notice. The Clockwarden notices everything that runs slow. He\'ll come to wind it.',
          ],
        },
        hint: 'Bring the Wishing Carp to Ella Hearthstone on the castle road',
      },
      {
        objective: {
          kind: 'duel', area: AREA,
          foe: {
            id: 'fable-before-midnight-duel', court: AREA, name: 'The Twelfth Stroke',
            foeName: 'Clockwarden Twelve', foeElement: 'sand', difficulty: 4, gimmick: '',
            at: { x: 380, y: 700 },
            look: { body: 0xd0c8b8, accent: 0x7a5a24, hat: 'tophat', traits: ['cane', 'glasses'], size: 1.2, eye: 0xffe08a },
            challenge: [
              'The castle clock lost an hour. Clocks do not LOSE hours. Somebody wished. Wishes are unlicensed.',
              'I shall wind it forward two. Then I shall strike. One stroke for the household. Eleven for you.',
            ],
            beaten: ['Tick... tick... I appear to have run down. Wind me later. Or don\'t. It\'s so quiet without the ticking.'],
            coins: 75,
          },
        },
        hint: 'Stop Clockwarden Twelve on the castle road before he winds the clock',
      },
    ],
    complete: [
      'The coal-money came at a quarter to. We paid with eleven minutes spare. I spent them sitting on the step.',
      'Just sitting. Breathing. It was the best eleven minutes of my life. Here — you\'ve earned all of this.',
    ],
    reward: { orbs: 6, coins: 50 },
  },
  {
    id: Q_CHAPTER, area: AREA, name: 'The Last Chapter', giver: NPC_CORWIN,
    requires: { questDone: Q_PAGE },
    offer: [
      'Granny Yarrow\'s book is back. Good. Now there\'s one story left that nobody in Fable is allowed to finish.',
      'The Prince\'s own. The Legend of Legend. Every licensed copy stops at "and he was given the pen."',
      'The old ending was sung on the moat once, years back. The bard bass still hum it, if you can land one.',
      'Catch me a bass and I\'ll learn the tune. Then we\'ll go and ask the dragon for the words.',
    ],
    accept: [
      'Bard bass lie deep under the drawbridge. They fight like a chorus. Bring one back still humming.',
    ],
    stages: [
      {
        objective: { kind: 'fish', fish: 'fish-bard-bass', count: 1 },
        hint: 'Catch a Bard Bass in the castle moat',
      },
      {
        objective: {
          kind: 'deliver', npc: NPC_CORWIN, item: 'fish-bard-bass', count: 1,
          lines: [
            'Hold it up. Listen. Mm-mm-mmm... that\'s it. That\'s the old tune. A minor key. It ends low.',
            'Not "and the Prince saved the day." It ends on the dragon\'s note. Go to Bramwell. He reads to her.',
          ],
        },
        hint: 'Bring the Bard Bass to Corwin Lark on Once Street',
      },
      {
        objective: {
          kind: 'talk', npc: NPC_BRAMWELL,
          lines: [
            'The ending? She told it once, on the square, forty years ago. They chained her by nightfall.',
            '"And the boy was given the pen, and wrote himself a hero, and wrote the rest of us as his crowd."',
            '"And the crowd closed its books, one by one, and the hero was left all alone on his page." That\'s it.',
            'Go and read it to him. He\'s never once heard it. He\'s up in Evermore, waiting for applause.',
          ],
        },
        hint: 'Ask Bramwell Oakes at the dragon\'s tower for the old ending',
      },
      {
        objective: { kind: 'prince', prince: 'legend' },
        hint: 'Tell Prince Legend the end of his story at Castle Evermore',
      },
    ],
    complete: [
      'You read him his ending and he couldn\'t argue with it. A hero, alone on a page. Nobody clapping.',
      'I\'ve put it in a song. Seven verses, sung in the open, every word paid for by nobody. Here — and thank you.',
    ],
    reward: { orbs: 9, coins: 100 },
  },
];
