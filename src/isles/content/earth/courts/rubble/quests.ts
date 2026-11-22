import type { QuestDef } from '../../../../IslesTypes';
import { FEET, GRATE, NAME_STONES } from './area';
import { FISH_AXOLOTL, FISH_STURGEON } from './items';

/**
 * The Rubble Court's five side quests.
 *
 * The hardest court on Bedrock Hold, and the one where the Regent's burying is most literal: he
 * buried a whole city. Between them the quests dig five things back up — its street names
 * (Hobb), its book (Ysolde), a child (Nan), a dead man's lamp (Agnes) and, at the last, the boy
 * the Prince used to be (Penhallow). Each ends with someone whose job is keeping it buried.
 */
export const RUBBLE_QUESTS: QuestDef[] = [
  // ── 1. The Names of Streets — collect + talk + duel ──────────────────
  {
    id: 'rubble-q-street-names',
    area: 'rubble',
    name: 'The Names of Streets',
    giver: 'rubble-hobb',
    offer: [
      'Every corner of this city had a bronze plate with its name. The Effacers chiselled the letters off.',
      'But a chisel only takes the top. The grooves go deep. Under the verdigris, you can still feel the shape.',
      'Bring me five plates off the corner stones. I\'ll take rubbings, and recut them. Will you?',
    ],
    accept: [
      'Gently. Bronze is soft. And if a woman with a chisel and a very clean apron asks what you\'re doing — run.',
    ],
    stages: [
      {
        objective: {
          kind: 'collect', area: 'rubble', label: 'A blanked street plate', emoji: '🪧', color: 0x5a9a86,
          spots: NAME_STONES.map((s) => ({ x: s.x, y: s.y })),
        },
        hint: 'Prise the bronze plates off 5 blanked corner stones round the court',
      },
      {
        objective: {
          kind: 'talk', npc: 'rubble-ysolde',
          lines: [
            'Plates? Let me feel. …B. E. L. Bellfounders\' Row. Of course. The bellfounders had the second verse.',
            'This one is the Street of Lamps. This, Tanners\' Stair. This, the Little Mercy. And this — the Way itself.',
            'Its real name was the King\'s Walk. Nobody has said that aloud in forty years. Oh. Look behind you.',
          ],
        },
        hint: 'Ask Cantor Ysolde by the well what the plates said',
      },
      {
        objective: {
          kind: 'duel', area: 'rubble',
          foe: {
            id: 'rubble-q-street-names-duel',
            court: 'rubble',
            name: 'Withdrawn',
            foeName: 'Effacer Prue Blankstone',
            foeElement: 'memory',
            difficulty: 4,
            hpMult: 0.95,
            gimmick: '',
            at: { x: 1110, y: 1060 },
            look: { body: 0xe4dccc, accent: 0x9a2e26, hat: 'coif', traits: ['tool', 'apron', 'glasses'], size: 1.05, eye: 0xf0ece0 },
            challenge: [
              'Those names are withdrawn. I withdrew them. Five hundred and twelve corners, one letter at a time.',
              'A name is a debt. A street that remembers its name remembers who used to own it. The Regent owns it now.',
              'Give me the plates, and I will make you forget you ever read them. I am very good at it.',
            ],
            beaten: ['…The King\'s Walk. I had forgotten that one myself. How strange, to have forgotten on purpose.'],
            coins: 105,
          },
        },
        hint: 'Face Effacer Prue Blankstone before she takes the plates',
      },
    ],
    complete: [
      'Bellfounders\' Row. The Street of Lamps. Tanners\' Stair. The Little Mercy. The King\'s Walk.',
      'I\'ll cut them deep enough that a chisel breaks first. Here — my father\'s best burin. And a little coin.',
    ],
    reward: { orbs: 8, coins: 90 },
  },

  // ── 2. What the Well Keeps — talk + fish + deliver + duel ────────────
  {
    id: 'rubble-q-what-the-well-keeps',
    area: 'rubble',
    name: 'What the Well Keeps',
    giver: 'rubble-ysolde',
    offer: [
      'The night they pulped the Book of the Capital, I went to the well and sang all of it down into the dark.',
      'I was trying to keep it somewhere. Now I have the beginning and the end, and the middle is gone.',
      'The old wives say the tomb axolotls remember every song sung down that well. Will you bring me one?',
    ],
    accept: [
      'Ask Dredge how to reach the ledges. Bring it to me alive — I only want to sing to it, and put it back.',
    ],
    stages: [
      {
        objective: {
          kind: 'talk', npc: 'rubble-dredge',
          lines: [
            'Axolotls. On the ledges, halfway down, where the old shaft broke. You\'ll want a delver\'s rod for that.',
            'Pale, slow and slippery. Cast long and let the line settle on the ledge. Don\'t yank — they let go.',
            'And if you hook a sturgeon, keep it. They\'ve eaten half the city. Something of the Book might be in one.',
          ],
        },
        hint: 'Ask Old Dredge by the well how to reach the axolotl ledges',
      },
      {
        objective: { kind: 'fish', fish: FISH_AXOLOTL, count: 1 },
        hint: 'Catch a tomb axolotl in the collapsed well (delver rod)',
      },
      {
        objective: {
          kind: 'deliver', npc: 'rubble-ysolde', item: FISH_AXOLOTL, count: 1,
          lines: [
            'Oh, look at you. Smiling. All right. I\'ll sing the beginning, and you tell me what comes next.',
            '(she sings, very low, for a long while; then she stops, and starts again, and her voice changes) …There.',
            'There it is. The middle. It was never in the axolotl, was it. It was waiting for somebody to listen.',
            'Oh, no. The pulp-cart. He heard me singing. He always hears.',
          ],
        },
        hint: 'Bring the axolotl to Cantor Ysolde',
      },
      {
        objective: {
          kind: 'duel', area: 'rubble',
          foe: {
            id: 'rubble-q-what-the-well-keeps-duel',
            court: 'rubble',
            name: 'Pulped',
            foeName: 'Pulper Gristle Ream',
            foeElement: 'paper',
            difficulty: 4,
            hpMult: 1,
            gimmick: 'rubble-aqueduct',
            at: { x: 1990, y: 1340 },
            look: { body: 0xd8d0c0, accent: 0x7a6a4a, hat: 'cap', traits: ['apron', 'tool', 'pack'], size: 1.2, eye: 0xe6dcc6 },
            challenge: [
              'A song is a book that hasn\'t been written down yet. I pulp books. I see no difference.',
              'Forty carts of the Book of the Capital, into the vat, into the well. And still she sings it.',
              'Stand aside, picker. Let\'s see how a song does in the wet.',
            ],
            beaten: ['…Sodden. Like everything I ever touched. Tell her to sing it. I will try not to listen.'],
            coins: 105,
          },
        },
        hint: 'Stop Pulper Gristle Ream at the well',
      },
    ],
    complete: [
      'I have all of it now. All eleven verses of the Colossus and the whole Street of Lamps.',
      'The axolotl is back on its ledge. Take this — it is what the Book\'s readers paid me, long ago, to sing.',
    ],
    reward: { orbs: 9, coins: 80, item: FISH_STURGEON, itemCount: 1 },
  },

  // ── 3. Kit in the Cellar — visit + collect + duel ────────────────────
  {
    id: 'rubble-q-kit-in-the-cellar',
    area: 'rubble',
    name: 'Kit in the Cellar',
    giver: 'rubble-nan',
    offer: [
      'The cellar under the Exchange came in this morning with my grandson in it. Kit. He\'s singing down there.',
      'He\'s alive. But a fallen cellar is a buried cellar, the Prince says. The Backfiller comes at dusk.',
      'We can prop it and dig him out, if we\'re quick. Will you help me? I\'m too old to carry the beams.',
    ],
    accept: [
      'Shout down the grate first so he knows we\'re coming. Then the props — old Exchange beams, round the Row.',
    ],
    stages: [
      {
        objective: { kind: 'visit', area: 'rubble', at: { x: GRATE.x, y: GRATE.y + 30 }, r: 60, label: 'The cellar grate' },
        hint: 'Call down through the cellar grate by the Exchange',
      },
      {
        objective: {
          kind: 'collect', area: 'rubble', label: 'A shoring beam', emoji: '🪵', color: 0x7a5a3a,
          spots: [{ x: 540, y: 1260 }, { x: 960, y: 1250 }, { x: 860, y: 1440 }, { x: 1150, y: 1340 }],
        },
        hint: 'Gather 4 old Exchange beams to prop the cellar',
      },
      {
        objective: {
          kind: 'duel', area: 'rubble',
          foe: {
            id: 'rubble-q-kit-in-the-cellar-duel',
            court: 'rubble',
            name: 'Backfilled',
            foeName: 'Backfiller Sod Mattock',
            foeElement: 'earth',
            difficulty: 5,
            hpMult: 0.95,
            gimmick: 'rubble-sinkhole',
            at: { x: 1000, y: 1490 },
            look: { body: 0xa08a70, accent: 0x5f5a52, hat: 'helmet', traits: ['tool', 'beard', 'pack'], size: 1.3, eye: 0xc09a6a },
            challenge: [
              'A fallen cellar is a buried cellar. That is not cruelty. That is just how holes work.',
              'I have filled four hundred holes in this city. Some of them were singing. They all stopped eventually.',
              'Put those beams down, picker. You\'re standing on my next job.',
            ],
            beaten: ['…Prop it, then. I\'ll write it down as filled. Nobody ever comes to check a filled hole.'],
            coins: 105,
          },
        },
        hint: 'See off Backfiller Sod Mattock at the grate',
      },
    ],
    complete: [
      'He\'s out! Grey with dust from his hair to his boots, and he came up still singing, the little horror.',
      'This was his grandfather\'s. A picker\'s purse. It\'s yours. He says thank you too, when he stops singing.',
    ],
    reward: { orbs: 8, coins: 100 },
  },

  // ── 4. Tam's Lamp — talk + visit + duel ──────────────────────────────
  {
    id: 'rubble-q-tams-lantern',
    area: 'rubble',
    name: 'Tam\'s Lamp',
    giver: 'rubble-agnes',
    offer: [
      'My Tam lit the lamps on the Street of Lamps. When the city was buried, he went with it.',
      'There used to be a lamp on the Way for every one of the buried, so they could find their names at dusk.',
      'The Regent\'s Snuffer puts them out each night. Would you light Tam\'s? Just his. I\'d like him to see.',
    ],
    accept: [
      'The Sexton up at the gate has the Roll. He\'ll know which lamp is Tam\'s. I\'ll wait on the Way.',
    ],
    stages: [
      {
        objective: {
          kind: 'talk', npc: 'rubble-crouch',
          lines: [
            'Tallis, Tamsin. Lamplighter, the Street of Lamps. Row forty, page nine.',
            'His lamp is the ninth up from the gate on the west side of the Way, by the tomb steps.',
            'Light it if you like. The Snuffer comes at dusk. He is always on time. It is his only virtue.',
          ],
        },
        hint: 'Ask Sexton Crouch at the Sepulchre gate which lamp is Tam\'s',
      },
      {
        objective: { kind: 'visit', area: 'rubble', at: { x: 1150, y: 330 }, r: 60, label: 'Tam\'s lamp' },
        hint: 'Light Tam\'s lamp by the tomb steps',
      },
      {
        objective: {
          kind: 'duel', area: 'rubble',
          foe: {
            id: 'rubble-q-tams-lantern-duel',
            court: 'rubble',
            name: 'Snuffed',
            foeName: 'Snuffer Wick Morrow',
            foeElement: 'shadow',
            difficulty: 5,
            hpMult: 0.95,
            gimmick: 'rubble-procession',
            at: { x: 1290, y: 420 },
            look: { body: 0x9a948a, accent: 0x1e1a18, hat: 'tophat', traits: ['cane', 'scarf'], size: 1.1, eye: 0xa8a4c8 },
            challenge: [
              'Dusk. And a lamp is lit on the Way. That is my lamp to snuff, and my dark to keep.',
              'A dead man who can see his name might stop walking. A dead man who stops might ask to be dug up.',
              'Stand away from the wick.',
            ],
            beaten: ['…Leave it burning. I shall say the wind was wrong tonight. It so rarely is.'],
            coins: 105,
          },
        },
        hint: 'Keep Snuffer Wick Morrow off Tam\'s lamp',
      },
    ],
    complete: [
      'The Procession came up the Way and Tam lifted his head when he passed his lamp. Only a little.',
      'I have nothing worth giving but this. It was his — a lamplighter\'s wage for a year. He\'d want you to have it.',
    ],
    reward: { orbs: 7, coins: 110 },
  },

  // ── 5. The Old Capital — talk + visit + prince ───────────────────────
  {
    id: 'rubble-q-the-old-capital',
    area: 'rubble',
    name: 'The Old Capital',
    giver: 'rubble-penhallow',
    requires: { courtReady: 'rubble' },
    offer: [
      'All five of his crew in the dust. He\'s in the yard by the crane. He\'s asked for the long chain.',
      'Before you go in you should know something about the boy. The Sexton was there. Ask him what happened.',
      'And then go and stand under the colossus\'s feet. Everyone in the court should, once.',
    ],
    accept: [
      'The Sexton, then the feet. Then the yard. Mind the ball. He never misses twice.',
    ],
    stages: [
      {
        objective: {
          kind: 'talk', npc: 'rubble-crouch',
          lines: [
            'Wreck? He built a tower of offcuts in the palace yard when he was nine. Higher than the wall. Very fine.',
            'His father had it buried. With the boy watching. He said a king\'s son builds nothing that might outlast him.',
            'Two years later the boy pulled the colossus over himself. Eleven. He stood on its face and cried.',
          ],
        },
        hint: 'Ask Sexton Crouch about the Prince as a boy',
      },
      {
        objective: { kind: 'visit', area: 'rubble', at: { x: FEET.x, y: FEET.y + 50 }, r: 80, label: 'The colossus\'s feet' },
        hint: 'Stand under the colossus\'s feet on the plinth',
      },
      {
        objective: { kind: 'prince', prince: 'wreck' },
        hint: 'Face Prince Wreck in the Wrecker\'s Yard',
      },
    ],
    complete: [
      'He\'s stopped the crane. He sat on the plinth an hour and then asked me whether I still had the palace plans.',
      'I said I had. He said good. Take the foreman\'s purse — the works will be needing a new one now. Building.',
    ],
    reward: { orbs: 10, coins: 160 },
  },
];
