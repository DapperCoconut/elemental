import type { Cond, Talk, WandererDef } from '../../../IslesTypes';
import { BENCHES, KING_ID, PIN_LANDING, PIN_SUMMIT } from '../spec';

/**
 * The Ferryman — the Pinnacle's wanderer. The hooded old boatman who rowed the player to Brandmark
 * at the very start ("past all ten isles, they say, a black spire waits"), and who has rowed
 * challengers to this beach before: more than he counted. He never rowed one back. He never once
 * went further than the shingle, either; he waited on the beach and watched the lamps in the stair's
 * niches, which light one per bench broken, and that is how he knows how far each of them got. Most
 * lit one. A gardener once lit three. Nobody ever lit four.
 *
 * This time he climbs with the player, and from the fourth bench on he is somewhere he has never
 * been. He is terse, dry, weathered, quietly superstitious — "there is always a last one" — and by
 * the top he has admitted what he wants: for the last one he brings to be the first he rows home.
 *
 * Blocks are listed most specific first. Each bench has a line for walking in and one for when its
 * six seats are empty (`{ courtReady }`); the landing tracks the climb by `{ seats }`; the summit
 * and every area change once the King falls.
 */

const KING: Cond = { monarch: KING_ID };
const S20: Cond = { seats: 20 };
const S60: Cond = { seats: 60 };
const MET = 'pin-ferryman-met';

/** A bench's two beats: walking in, and when its six seats are empty. */
const bench = (id: string, enter: string[], ready: string[]): [string, Talk[]] => [
  id,
  [{ when: KING, lines: AFTER_ON_THE_STAIR }, { when: { courtReady: id }, lines: ready }, { lines: enter }],
];

/** On any bench once the King is down. */
const AFTER_ON_THE_STAIR = [
  'Just glass now. Look at it — you can see the sea through the floor. I never knew it was so blue.',
  'Down, when you are ready. The boat is where I left it. It has never once been waited on before.',
];

const BENCH_LINES: [string, Talk[]][] = [
  bench(BENCHES[0].id,
    [
      'The Ember Bench. I only ever saw it as a lamp, from the beach. Most of the ones I brought never lit it.',
      'Six masks. Each will tell you which clause it drafted. They are proud of their drafting. Let them be, after.',
    ],
    ['There. The first lamp. I watched the shingle for that light more nights than I can count.']),
  bench(BENCHES[1].id,
    [
      'The Tide Bench. Cold all the way through. The second lamp. A good many lit one, and never two.',
      'A fisherman I brought swore this place smelled of the Undertow. I thought he was frightened. He was right.',
    ],
    ['Two lamps. That fisherman would have bought you a drink. He would have bought you the whole tavern.']),
  bench(BENCHES[2].id,
    [
      'The Thorn Bench. Green in the glass — that is new. The isles are pushing back in through the cracks.',
      'A gardener came once, secateurs and all. She lit three lamps. The most I ever saw. Until now.',
    ],
    ['Three. Her mark. You have matched her. Now go past it — for her.']),
  bench(BENCHES[3].id,
    [
      'The Gale Bench. Outside the spire. Nobody I brought got this far. Nobody. I do not know this place.',
      'Keep to the middle of the bridges. That is not knowledge. That is just sense, and I am an old man.',
    ],
    ['Four lamps. From the beach, four would have looked like a festival. The Muster will be making a racket.']),
  bench(BENCHES[4].id,
    [
      'The Stone Bench. Every isle\'s stone laid in the glass in layers, like a ledger you can walk through.',
      'I have nothing to tell you about it. I am as new here as you are. A strange thing, at my age.',
    ],
    ['Halfway. Five lamps. Gideon will be telling the rock about it. The rock will be listening.']),
  bench(BENCHES[5].id,
    [
      'The Storm Bench. Mind the walls; they crawl. I can feel it in my oar-hand.',
      'I have been thinking about the ones before. They had nobody on the beach. You have ten. That counts.',
    ],
    ['Six. I have stopped counting lamps from the bottom. I count from the top now. Four to go.']),
  bench(BENCHES[6].id,
    [
      'The Venom Bench. A wall of names, every one struck through. I looked for mine. Ferrymen do not get names.',
      'Tansy would have every plaque off that wall with her teeth. I shall tell her it is here.',
    ],
    ['Seven. The air is cleaner already. Or I am. Hard to tell, this high.']),
  bench(BENCHES[7].id,
    [
      'The Lot Bench. The Wheel of Sixty in the floor, one pocket a seat. Count the empty ones as you go.',
      'I lost a game of chance once, to see who would row the last boat out here. That is how I got the job.',
    ],
    ['Eight. The wheel has stopped. I did not know it could.']),
  bench(BENCHES[8].id,
    [
      'The Choir Bench. Jars of stolen voices. Listen — humming. Every one of them still trying to sing.',
      'Lark would open every jar. I would hold the ladder for her. I would like that, I think.',
    ],
    ['Nine. One more. My knees have opinions about all these stairs. I am ignoring them.']),
  bench(BENCHES[9].id,
    [
      'The Noon Bench. Look up: gold in the ceiling cracks. The star. First warm light I ever saw on this glass.',
      'It is very beautiful. Do not trust that. Do not distrust it, either. Just climb.',
    ],
    [
      'Ten lamps. From the beach the whole stair must look like a candle somebody has finally lit end to end.',
      'The door above wants sixty seats, and you have them. I stop at the door. This last bit is yours.',
    ]),
];

export const FERRYMAN: WandererDef = {
  id: 'pinnacle-wanderer-ferryman',
  name: 'The Ferryman',
  title: 'who rowed you in',
  look: { body: 0x6a5a4a, accent: 0x2a2a34, hat: 'hood', traits: ['lantern', 'beard'], size: 1.1 },

  byArea: {
    // ── Glasswater Landing ──────────────────────────────────────────
    [PIN_LANDING]: [
      {
        when: KING,
        lines: [
          'I rowed you in at Brandmark and said good luck. I meant it the way you say it to the drowned. Forgive me.',
          'Get in the boat. I am rowing somebody back. First time. I want to know what it feels like.',
          'It feels like this, I expect: oars, water, and nothing behind you that wants you. Get in.',
        ],
      },
      {
        when: S60,
        lines: [
          'Sixty seats. Further than anyone. I have run out of things I know about this place.',
          'Whatever waits past the last door, I have only ever heard it through the glass. None of them saw it.',
        ],
      },
      {
        when: S20,
        lines: [
          'The niche-lamps are lighting on the stair, one a bench. Nobody I brought lit more than three.',
          'Eat. Sleep, if you can. The beach was never this loud with the others. They came alone.',
        ],
      },
      {
        when: { not: { flag: MET } },
        sets: MET,
        lines: [
          'So. Here we are. I told you at Brandmark: past all ten isles, a black spire waits. I did not say I knew it.',
          'I have rowed challengers to this beach before. More than I counted. The Tally Stone counted for me.',
          'I never rowed one back. There is always a last one. I should like the last one I bring to be you.',
          'Ten benches up the First Stair, six seats to a bench. I always waited on the shingle. This time I come up.',
        ],
      },
      {
        lines: [
          'The niches up the stair light one for each bench broken. I watched them from here, every time. Most lit one.',
          'The Muster came for you. Nobody came for the others. Remember that on the stair.',
        ],
      },
    ],
    // ── The ten benches ─────────────────────────────────────────────
    ...Object.fromEntries(BENCH_LINES),
    // ── The Crownless Hall ──────────────────────────────────────────
    [PIN_SUMMIT]: [
      {
        when: KING,
        lines: [
          'He is gone. The hall is only a hall now. Glass, and the morning coming through it.',
          'Come down. I am rowing somebody home. I have been practising the words a long while: "Mind the step."',
        ],
      },
      {
        lines: [
          'This is as far as I go. Every one I brought came because someone like me said a spire was waiting.',
          'He is up those steps, on his chair, and he has never once got up. Make him.',
          'There is always a last one. Go and tell him it is you.',
        ],
      },
    ],
  },

  general: [
    { when: KING, lines: ['The boat is on the beach. Whenever you are ready. There is no hurry now. None at all.'] },
    {
      lines: [
        'Keep climbing. I am right behind you. I have always been right behind somebody.',
        'There is always a last one. I would like, just once, to be wrong about who.',
      ],
    },
  ],
};
