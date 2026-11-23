import type { Cond, NpcDef, Pt, Talk } from '../../IslesTypes';

/**
 * Fallpoint's onlookers — four people who saw the second star come down and rowed out to look, and the
 * Ferryman, who rows everybody. Every block tracks the meteor's three moods and the end:
 * the King's appeal dismissed (`fall-won`), inside the Fall (`{ fall: true }`), the shell open
 * (`meteor-open`), and sealed — listed most specific first.
 *
 * Inside the Fall they are in the dream too, and it shows: they half-say the things people said
 * under the crowns, and catch themselves.
 */

export const WON: Cond = { flag: 'fall-won' };
export const FALL: Cond = { fall: true };
export const OPEN: Cond = { flag: 'meteor-open' };

/** One person's four states, most specific first. */
const states = (won: string[], fall: string[], open: string[], sealed: string[]): Talk[] => [
  { when: WON, lines: won },
  { when: FALL, lines: fall },
  { when: OPEN, lines: open },
  { lines: sealed },
];

/** Where they stand, and their bits of kit (the painter draws those beside them). */
export const AT = {
  ida: { x: 1170, y: 1070 },
  anselm: { x: 1340, y: 600 },
  corwen: { x: 610, y: 620 },
  nell: { x: 560, y: 1000 },
} satisfies Record<string, Pt>;

export const FALLPOINT_NPCS: NpcDef[] = [
  // ── Ida Salt — an Emberport oyster-woman, first boat out ─────────
  {
    id: 'fp-ida', name: 'Ida Salt', title: 'Oyster-Woman of Emberport', at: AT.ida,
    look: { body: 0x6a7a8a, accent: 0xd8c8a0, hand: 0xb08a6a, hat: 'souwester', traits: ['apron', 'satchel'], size: 1.05, eye: 0x3a4a5a },
    talks: states(
      [
        'It went grey round midnight. Then dark. Then the glass under my feet went cold as a doorstep. Proper cold.',
        'I have been stood on this reef three weeks waiting to be frightened of it. I think I can stop now.',
        'The oysters on the outer edge are opening again. They know. They always know before people do.',
      ],
      [
        'You hear that bell? Tithe bell. Somebody must have — no. That is not right. There is no tithe. Is there?',
        'I keep counting my oysters to see what the Kiln takes. Then I remember the Kiln is cold. Then I forget.',
        'Go on and finish it, love. I do not like it in here. Like a song you hate and know every word of.',
      ],
      [
        'It sat up. Did you see? Sat up and said good evening, like a gentleman come to buy a dozen.',
        'Polite ones are the worst. The Tithe-men were polite. They said please when they took your boat.',
        'Whatever he is asking you, love, you can say no. That is the whole point of you. You taught us that.',
      ],
      [
        'I saw it come down from my step. Like a coal off the Kiln, but slower, and sorry about it.',
        'Rowed out at first light. First boat. My oysters were all shut tight on the outer reef. Every one.',
        'There is a hole in the sky where it was. Look up. Count along the Ladle. One rung missing.',
      ],
    ),
  },

  // ── Anselm Vey — a star-counter from Highspire, with his glass ───
  {
    id: 'fp-anselm', name: 'Anselm Vey', title: 'Counter of Stars', at: AT.anselm,
    look: { body: 0x3a3a5a, accent: 0xc8c0e0, hand: 0xd0b090, hat: 'nightcap', traits: ['glasses', 'book', 'scarf'], size: 0.95, eye: 0x8aa0d0 },
    talks: states(
      [
        'Four thousand and twelve. Four thousand and TWELVE. It is back — no. It is not back. It never left.',
        'The gap in the Ladle is gone. I have been up all night trying to find which star filled it. None did.',
        'There was never a gap. There was a cinder in front of a star, burning, and now it is not. Write that down.',
      ],
      [
        'In here there are four thousand and eleven again. And ten new ones, low on the horizon, shaped like crowns.',
        'I tried to name them. The book would only let me write "Their Majesties". My own hand did it.',
        'When you wake, take me with you. I do not want to count these. I do not want to be good at it.',
      ],
      [
        'It is not a star. Stars do not sit up. Stars do not say good evening. I must reclassify him.',
        'Something between a comet and a magistrate. I have no column for it. I have drawn a new column.',
        'He said "appeal". I looked it up. It means "to call back". He wants the case called back. Gods.',
      ],
      [
        'Four thousand and twelve stars on a clear night, I make it. Last night: four thousand and eleven.',
        'That one fell here. I have the angle, the hour, the colour. Gold going on red. Like a man blushing.',
        'Most falling stars are pebbles. This one is the size of a person. I measured. Twice. I wish I had not.',
      ],
    ),
  },

  // ── Corwen Hask — once a copying-clerk at the Pinnacle ───────────
  {
    id: 'fp-corwen', name: 'Corwen Hask', title: 'Copying-Clerk, Retired', at: AT.corwen,
    look: { body: 0x2a2630, accent: 0xb8b2a8, hand: 0xc8a890, hat: 'coif', traits: ['glasses', 'book', 'cane'], size: 0.9, eye: 0x6a6a7a },
    talks: states(
      [
        'Dismissed. On the law. I would have liked to have copied that judgment. Just once, a fair one.',
        'Forty years I wrote down his verdicts in my best hand. I am going to learn to write badly now. Freely.',
        'Thank you for hearing the whole case. Nobody ever heard a whole case, up there. They only heard the end.',
      ],
      [
        'Clause nine, Ten Laws, the Draw: a court may sit without the accused. I remember copying it. Oh, no.',
        'I keep reaching for a pen to take this down. That is the dream doing it. I gave the pen up. I did.',
        'He is fighting fair, in there. That is the frightening part. He has read everything. So had I.',
      ],
      [
        'An appeal. I know the form. I copied the form. Nobody ever lodged one. He saw to that. Now he lodges one.',
        'He will be courteous. He will be precise. He will cite every page. He cannot help it. Neither could I.',
        'You may decline to hear it. That is in the form too. I wrote it in very small letters. Sorry.',
      ],
      [
        'Sixty keyholes. One for each seat of the Council. Each shaped like a mask slit. I knew those masks.',
        'I copied the Ten Laws for them, clause by clause, for forty years. Every seat signed with a key.',
        'The keys the princes gave you were never prizes. They were signatures. Somebody has to sign a sentence.',
      ],
    ),
  },

  // ── Nell Tarrow — a ship's girl who came out to see the glass fish ─
  {
    id: 'fp-nell', name: 'Nell Tarrow', title: 'Ship’s Girl', at: AT.nell,
    look: { body: 0xa85a3a, accent: 0xe8d8b0, hand: 0xc89a7a, hat: 'bandana', traits: ['pack', 'rod'], size: 0.78, eye: 0x3a6a4a },
    talks: states(
      [
        'The fish in the glass went cloudy at midnight. Like breath on a window. I think they are just glass now.',
        'Mister Ferryman says they were never alive in there. I said I know. I still said goodbye to them.',
        'Can I come on the boat back? I promise I will not touch the oar. I will touch the oar a bit.',
      ],
      [
        'Everyone keeps saying "Your Majesty" at the sea. I said it too. Then I bit my tongue. Hard. Look.',
        'The fish in the glass are swimming in here. Very slow. Like they are trying to get to the edge before it sets.',
        'You are going to win again, aren\'t you? Win quicker. I want to go home where nobody bows.',
      ],
      [
        'He looked at me! Out of the shell! He looked at me and nodded, like a schoolmaster who forgot my name.',
        'His eyes are the colour of the bit of a fire you are not meant to poke. I want to poke it. I won\'t.',
        'Is he a king? He has no crown. Just a mark where it was, like when you take off a ring.',
      ],
      [
        'There are FISH in the glass! Look — that one was turning round when the sea went hard. Poor thing.',
        'And a whole ship\'s plank with the nails in, and shells, and a boot. Whose boot? Nobody\'s now.',
        'Ma says do not touch the black bit in the middle. It hums. I did not touch it. I listened, though.',
      ],
    ),
  },
];

/**
 * The Ferryman's lines out here (the Pinnacle wanderer's `byArea.fallpoint`). He rowed you to Brandmark on
 * the first day and to the spire on the last. He rowed out here because somebody had to.
 */
export const FERRYMAN_TALKS: Talk[] = [
  {
    when: WON,
    lines: [
      'Dark. Properly dark, all the way through. I have rowed out every night to check, and tonight I can stop.',
      'There is the whole sky. Every star in its place. I counted. Do not tell Anselm, he will want to check my sums.',
      'Home, then. No fare. There never was a fare, not for you. I only said so to see if you would argue.',
    ],
  },
  {
    when: FALL,
    lines: [
      'Again, then. I knew these waters the moment we stepped in. I rowed them for forty years, under the crowns.',
      'Mind how they talk in here. It is the dream talking, not them. Say the word to the star and we wake.',
      'My hands keep reaching for the old tithe-tally on the thwart. It is not there. Good. Good.',
    ],
  },
  {
    when: OPEN,
    lines: [
      'He sat up and said good evening. Forty years I rowed for him, one way or the other. Never once a good evening.',
      'Whatever he is asking, you need not answer tonight. The sea will keep. It has kept worse.',
      'If you do go in, I am coming. I rowed you to Brandmark on the first day. I am not stopping now.',
    ],
  },
  {
    lines: [
      'Here we are. The sea boiled to glass, again. I did hope I would only have to see that the once.',
      'That is what is left of the star. It did not go out. They do not, much, whatever the stories say.',
      'Sixty locks on it. Count your keys before you go knocking. And mind the shell. It is warm.',
    ],
  },
];
