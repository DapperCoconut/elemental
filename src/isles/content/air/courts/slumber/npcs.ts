import type { NpcDef, NpcLook, Talk } from '../../../../IslesTypes';
import { NPC, Q_BELL, Q_BREATHS, Q_DREAM, Q_LAMPS, Q_PIKE } from './quests';

/**
 * The people of the Slumber Court — the ones still awake. Everyone here is either asleep in a bed
 * in the street, or sitting up with someone who is. The becalmed are laid down along the Long
 * Ward, a brass breath-meter on every chest and the King's collectors corking a bottle off them
 * each night, and the waking whisper so as not to stir them (and so as not to breathe too deep —
 * every breath above the cloud line is metered). Lines are most-specific first: King fallen →
 * their quest done / under way → Prince fallen → default.
 */

const KING = { monarch: 'aerion' } as const;
const PRINCE = { prince: 'reverie' } as const;

export const SLUMBER_NPCS: NpcDef[] = [
  {
    id: NPC.eiderdown, name: 'Mother Eiderdown', title: 'Feathers & Bedding',
    look: { body: 0xf0e0d8, accent: 0x8a5a7a, hat: 'nightcap', traits: ['apron', 'glasses'], size: 1.2 },
    at: { x: 1480, y: 706 },
    role: { kind: 'shop', id: 'slumber-shop' },
    talks: [
      { when: KING, lines: [
        'They broke the bottles in the Lung and the breath came down the mountain like a warm wind. I felt it.',
        'Six hundred beds on the Long Ward, and I\'m selling every one of them a pair of slippers. Browse, dear.',
      ] },
      { when: PRINCE, lines: [
        'The Prince ordered a pillow every week. Swansdown, lilac case. Never slept on one. He liked ordering.',
        'I\'ve sent the last six to the Long Ward. Nine years of pillows, back to the people they were taxed from.',
      ] },
      { when: { questDone: Q_BREATHS }, lines: [
        'Pip Dozey came in with her slate — fourteen a minute! I gave her a pillow with her mam\'s name on it.',
        'Now then. Something for the road? The ribbon\'s the dearest. It remembers where you walked. Uncanny.',
      ] },
      { lines: [
        'Eiderdown\'s. Feathers, bedding, and the odd useful little thing you\'d keep by a bed. Mind your voice, love.',
        'Everything I sell is soft. Some of it is soft the way a snuffer is soft. Have a look.',
      ] },
    ],
    barks: [
      { when: KING, lines: ['Slippers! Slippers for the waking!', 'Breathe as deep as you like, dear. It\'s free.'] },
      { when: PRINCE, lines: ['Swansdown, half price.', 'Lilac cases, going cheap. Can\'t think why.'] },
      { lines: ['Shh. Pillows, pillows...', 'Goose or duck, love? Goose for the dear ones.', 'Breathe shallow in here, the meter-man walks by.'] },
    ],
  },

  {
    id: NPC.pip, name: 'Pip Dozey', title: 'Counting by Bed Nine',
    look: { body: 0xf0d8c0, accent: 0xd8a6b6, hat: 'beanie', traits: ['scarf', 'book'], size: 0.74 },
    at: { x: 950, y: 800 },
    talks: [
      { when: KING, lines: [
        'Mam sat up! She SAT UP. She said "Pip, it\'s cold, where\'s my shawl" like nothing happened at all.',
        'I don\'t have to count any more. I count anyway. Habit. She breathes eighteen a minute when she laughs.',
      ] },
      { when: { questDone: Q_BREATHS }, lines: [
        'Fourteen a minute, every night now. Sometimes fifteen. I underline the fifteens.',
        'She talks in her sleep. Mostly about turnips. I don\'t mind. It\'s her voice.',
      ] },
      { when: { quest: Q_BREATHS, stage: 2 }, lines: ['He\'s on Hushing Way with the cart. Brass coat. You\'ll hear the bottles clink.'] },
      { when: { quest: Q_BREATHS, stage: 1 }, lines: ['The cart goes east along Hushing Way. Things fall off it on the cobbles. Bottles do.'] },
      { when: { quest: Q_BREATHS }, lines: ['Bed nine. Rose quilt. The meter on her chest — look where the needle is.'] },
      { when: PRINCE, lines: [
        'Is the Prince really gone? Then why is Mam still asleep? They say her breath is up the top of the mountain.',
        'In a bottle. With the King. I\'m going to go up there when I\'m bigger.',
      ] },
      { lines: [
        'Eight. Nine. Shh, I\'m counting. Ten... that\'s eleven seconds. That\'s too long between.',
        'That\'s my mam on bed nine. I count her breaths. Somebody has to.',
      ] },
    ],
    barks: [
      { when: KING, lines: ['She\'s AWAKE!', 'Eighteen when she laughs!'] },
      { when: { questDone: Q_BREATHS }, lines: ['Fourteen... fifteen! Fifteen!', 'Underlined.'] },
      { lines: ['...six... seven...', 'Shh! I\'m counting.', 'Too long between. Too long.'] },
    ],
  },

  {
    id: NPC.wick, name: 'Lamplighter Wick', title: 'Under the Dimming Order',
    look: { body: 0xe0d0c0, accent: 0x3a4060, hat: 'cap', traits: ['lantern', 'tool'], size: 1.05 },
    at: { x: 1740, y: 960 },
    talks: [
      { when: KING, lines: [
        'I burnt the felt cowls. All of them. In one heap in the square, and we warmed our hands at them.',
        'Every lamp in the court is up full tonight. People stand under them just to look at each other\'s faces.',
      ] },
      { when: { questDone: Q_LAMPS }, lines: [
        'Lampless Row\'s lit, four lamps bright as you like. I\'m to be reprimanded. I\'ve framed the reprimand.',
        'Mother sleeps with her hand out toward the light. Like a cat in a sunbeam.',
      ] },
      { when: { quest: Q_LAMPS, stage: 2 }, lines: ['He\'s at the bottom of the row with his pole. Grimsby. Don\'t let him reach the lamps.'] },
      { when: { quest: Q_LAMPS, stage: 1 }, lines: ['Tell Sister Coverlet. She\'ll have seen the needles move. She sees everything on the ward.'] },
      { when: { quest: Q_LAMPS }, lines: ['Four lamps down Lampless Row. Cowl off, wick up. Quick and quiet.'] },
      { when: PRINCE, lines: [
        'The Dimming Order had the Prince\'s seal on it. Does it still count, now he\'s down? Nobody will tell me.',
        'So I\'m doing it halfway. Half a hair of flame. It\'s the most rebellious thing I\'ve ever done.',
      ] },
      { lines: [
        'Evening. Mind your step, the lamps are hooded — Dimming Order. A lit lamp wakes a sleeper, they say.',
        'I\'ve been lighting lamps thirty years. These last nine I\'ve been putting them out. It\'s not the same job.',
      ] },
    ],
    barks: [
      { when: KING, lines: ['Full flame! Full flame everywhere!', 'Look at your face! I can see your face!'] },
      { lines: ['Cowl down... cowl down...', 'A hair of flame. Not a hair more.', 'Lampless Row. Who names a row Lampless?'] },
    ],
  },

  {
    id: NPC.fennick, name: 'Old Fennick', title: 'Angler on the Lake of Nod',
    look: { body: 0xd0c0a8, accent: 0x2e3268, hat: 'souwester', traits: ['rod', 'beard', 'pipe'], size: 1.1 },
    at: { x: 1000, y: 1230 },
    talks: [
      { when: KING, lines: [
        'The lake\'s gone clear as a window since the King fell. You can see right to the bottom. Not a bad dream in it.',
        'Carp are getting thin. Serves them right. Here — try a cast. Everything bites easy now.',
      ] },
      { when: { questDone: Q_PIKE }, lines: [
        'Still fizzing! Dreams going home all night long, uphill to their beds. The carp can\'t believe their luck.',
        'That pike\'s still in there, mind. Sulking. Bring me another one some day and I\'ll shake your hand twice.',
      ] },
      { when: { quest: Q_PIKE, stage: 2 }, lines: ['Glumm? A collector? On the bottom of MY lake? South shore, you say. Mind the mist.'] },
      { when: { quest: Q_PIKE, stage: 1 }, lines: ['Got him! Lord, look at the teeth. Take him to Lull\'s booth, up by the ward. Quick, he\'s glaring.'] },
      { when: { quest: Q_PIKE }, lines: ['Deep water, dark bait. The pike lies under where the mist is thickest.'] },
      { when: PRINCE, lines: [
        'The Prince fished here once. Caught a dozing carp, said "how restful," and threw it back. Odd lad.',
      ] },
      { lines: [
        'Lake of Nod. The sweetest fishing on the spire, if you can keep your eyes open. I mostly can.',
        'Carp, loach, and the pike. Don\'t look the pike in the eye. Driftwood rod does fine here.',
      ] },
    ],
    barks: [
      { when: { questDone: Q_PIKE }, lines: ['Fizzing! Still fizzing!', 'Go home, little dreams.'] },
      { lines: ['...hm? Wasn\'t asleep. Wasn\'t.', 'Bite, you dozy beggar.', 'Mist\'s up. Pike weather.'] },
    ],
  },

  {
    id: NPC.lull, name: 'Dreamwright Lull', title: 'Reader of Dreams',
    look: { body: 0xd8c8e0, accent: 0xb89cff, hat: 'wizard', traits: ['book', 'glasses'], size: 1.0, eye: 0xe4d8ff },
    at: { x: 860, y: 1012 },
    talks: [
      { when: KING, lines: [
        'Nobody needs their dreams read any more. They wake up and tell each other at breakfast. Badly. It\'s wonderful.',
        'I\'ve taken up listening to the bell instead. It has a great deal to say for itself, now.',
      ] },
      { when: { questDone: Q_DREAM }, lines: [
        'The ward dreams of ordinary things again. Cheese. A dog called Biscuit. Being late for a wedding.',
        'I put my trumpet to bed thirty-one last night and she was dreaming of the sea. She\'s never seen the sea.',
      ] },
      { when: { quest: Q_DREAM, stage: 1 }, lines: ['Mara. On Lampless Row. A black lantern is still only a lantern. Break it.'] },
      { when: { quest: Q_DREAM }, lines: ['Sister Coverlet, by the pump on the Long Ward. Softly.'] },
      { when: { quest: Q_PIKE, stage: 1 }, lines: ['A nightmare pike? Bring it. I have never read a fish. I\'ve always wanted to.'] },
      { when: PRINCE, lines: [
        'I read the Prince once, asleep in his great bed. He dreams of being woken up. Nobody ever does.',
      ] },
      { lines: [
        'Dreams read, a penny a pillow. I listen through the trumpet. Most people dream of the thing they\'re owed.',
        'Up here they dream of breathing. Long, deep breaths, and nobody counting. Every one of them.',
      ] },
    ],
    barks: [
      { lines: ['A penny a pillow...', 'Shh. Someone\'s dreaming of the sea.', 'Bad dream on bed forty. Same one.'] },
    ],
  },

  {
    id: NPC.coverlet, name: 'Sister Coverlet', title: 'Night Nurse, the Long Ward',
    look: { body: 0xf0e4dc, accent: 0xefe4d2, hat: 'veil', traits: ['satchel', 'lantern'], size: 1.05 },
    at: { x: 1392, y: 812 },
    talks: [
      { when: KING, lines: [
        'They\'re waking, row by row from the east end, as the air comes down. I\'ve run out of shawls and tea.',
        'Six hundred people asking me what day it is. I don\'t know! I haven\'t known for nine years! It\'s glorious.',
      ] },
      { when: { questDone: Q_DREAM }, lines: [
        'No lantern last night. The needles held steady from bell to dawn. I slept an hour in my chair. An HOUR!',
      ] },
      { when: { questDone: Q_LAMPS }, lines: [
        'The Lampless Row needles are still up off the red. A little light is a little breath. Who\'d have thought.',
      ] },
      { when: { quest: Q_DREAM }, lines: ['The black lantern walks after the bell. Under the last lamps on Lampless Row, she stands.'] },
      { when: PRINCE, lines: [
        'The Prince is down, but the ward still sleeps. Their breath is still bottled up in the Lung.',
        'I turn them every four hours so they don\'t get sore. I\'ll keep turning them till someone fetches it back.',
      ] },
      { lines: [
        'Hush, please. I\'m the night nurse. I turn them, I wipe their faces, I read their meters. I can\'t wake them.',
        'Six hundred beds. Every one of them owes the King breath. Every one of them is paying it off in their sleep.',
      ] },
    ],
    barks: [
      { when: KING, lines: ['Tea! Who wants tea?', 'Slowly, sit up slowly!'] },
      { lines: ['Turn, and turn...', 'Needle\'s low on forty-two.', 'Shh, shh.'] },
    ],
  },

  {
    id: NPC.tolly, name: 'Bellringer Tolly', title: 'Keeper of the Lullaby Belfry',
    look: { body: 0xd8c8b8, accent: 0x6a4a7a, hat: 'plume', traits: ['scarf', 'beard'], size: 1.1 },
    at: { x: 1330, y: 500 },
    talks: [
      { when: KING, lines: [
        'I ring it every morning now. DONNNG. People complain. I love it when they complain. It means they\'re up.',
      ] },
      { when: { questDone: Q_BELL }, lines: [
        'DONNNG. Did you hear it from the lake? They heard it in Galeward. Six hundred sleepers turned over at once.',
        'Not awake yet. But dreaming of getting up. And when the King\'s down — I\'ll ring it till my arms come off.',
      ] },
      { when: { quest: Q_BELL, stage: 1 }, lines: ['That\'s the clapper — all three bits. Mumm\'s on the Belfry steps. He knows. He always knows.'] },
      { when: { quest: Q_BELL }, lines: ['Sheepfold, Down Mill yard, lake shore. The Feltmaker isn\'t clever. Just thorough.'] },
      { when: PRINCE, lines: [
        'The Prince is down. And still I go up those steps every evening and still the bell hums them down. Habit.',
        'I keep thinking. A bell rung true... no. Not yet. Ask me tomorrow.',
      ] },
      { lines: [
        'The Lullaby Belfry. I ring the bell every evening and the whole court goes down like a lamp.',
        'It\'s wrapped in felt by order. It doesn\'t ring, it hums. Dong-hmmm. I\'d give a lot to hear it ring.',
      ] },
    ],
    barks: [
      { when: { questDone: Q_BELL }, lines: ['DONNNG!', 'Hear that? That\'s a BELL.'] },
      { lines: ['Dong-hmmm...', 'Felt. Nine years of felt.', 'Mind the steps, they\'re padded.'] },
    ],
  },

  {
    id: NPC.abelard, name: 'Abelard', title: 'Sleepwalking (do not wake)',
    look: { body: 0xe8dcd0, accent: 0xa2bcdc, hat: 'nightcap', traits: ['lantern'], size: 1.15, eye: 0xb89cff },
    at: { x: 1600, y: 814 }, wander: 120,
    talks: [
      { when: KING, lines: [
        'Hm? Oh! Oh, I\'m awake. I\'m AWAKE. Where are my trousers? Why am I in the road? Why is it so bright?',
        'I dreamt I was walking for nine years. My feet hurt like I was walking for nine years.',
      ] },
      { when: PRINCE, lines: [
        '...the Prince has fallen out of bed... out of bed... someone should tuck him in... tuck him... mm...',
      ] },
      { lines: [
        '...forty-one breaths... forty-two... pay the man... pay the nice man in brass... mm...',
        '...mother, the sheep are on the roof again... count them... count them down off the roof...',
      ] },
    ],
    barks: [
      { when: KING, lines: ['Where are my TROUSERS?', 'Why is it so bright?'] },
      { lines: ['...mm... the sheep...', '...pay the nice man...', '...forty-three... forty-four...'] },
    ],
  },
];

/** Townsfolk: nurses, lamplighters, bed-turners, a few sleepwalkers in nightcaps, a collector in brass. */
export const CROWD_LOOKS: NpcLook[] = [
  { body: 0xe8dcd0, accent: 0xb6a6d8, hat: 'nightcap', traits: ['lantern'], eye: 0xb89cff },
  { body: 0xf0e4dc, accent: 0xefe4d2, hat: 'veil', traits: ['satchel'] },
  { body: 0xd8c8b8, accent: 0x3a4060, hat: 'cap', traits: ['tool'] },
  { body: 0xe0d0c8, accent: 0xd8a6b6, hat: 'nightcap', traits: ['scarf'], size: 1.1 },
  { body: 0xc8c0b8, accent: 0xc9a24a, hat: 'tophat', traits: ['satchel', 'glasses'] },
  { body: 0xf0dcc8, accent: 0xa6bea6, hat: 'beanie', traits: ['pack'], size: 0.78 },
  { body: 0xd0c4d8, accent: 0x6a4a7a, hat: 'hood', traits: ['book'] },
  { body: 0xe4d4c4, accent: 0xa2bcdc, hat: 'aviator', traits: ['scarf'] },
];

export const CROWD_BARKS: Talk[] = [
  { when: KING, lines: [
    'She\'s awake! My sister\'s awake!',
    'Breathe in! All the way in! Nobody\'s counting!',
    'What day is it? Does anyone know what day it is?',
    'The meter-men have run off with their coats inside out.',
  ] },
  { when: PRINCE, lines: [
    'The Prince is down, they say. Still asleep, though, all of them.',
    'The Dimming Order\'s off. Half of it. Wick says half.',
    'Their breath\'s up in the Lung. In bottles.',
    'Somebody rang the bell wrong last night. I liked it.',
  ] },
  { lines: [
    'Shh. Breathe shallow, the meter-man\'s about.',
    'Twelve breaths short this week...',
    'My uncle\'s on bed two hundred. I turn him Sundays.',
    '...count them... count them down...',
    'Mind the beds. Mind the beds.',
    'The bell\'s soon. Best be indoors.',
    'Don\'t yawn. They tax a yawn double.',
    'Felt on everything. Even the cat.',
  ] },
];
