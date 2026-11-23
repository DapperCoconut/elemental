import type { QuestDef } from '../../../../IslesTypes';
import { QUIET_HOUSE, TRUMPET_SPOTS } from './area';
import { FISH_MULLET, FISH_WHITING } from './items';
import { Q_CLAPPER, Q_HOUSE, Q_SIGN, Q_TABLE, Q_TRUMPETS } from './npcs';

/**
 * The Hush Court's five side quests.
 *
 * Between them they show how the silence is kept: the bell that tolls without a sound (Agnes),
 * the muted who cannot pay a fine and so cannot buy bread (Hettie), the four permitted shapes and
 * the names they leave out (Tobin and Wren), the wardens' ears on every eave (Cordwain), and the
 * register of the taken that Prince Mute reads every night (Lintel). Each is somebody making a
 * noise on purpose.
 */
export const HUSH_QUESTS: QuestDef[] = [
  // ── 1. The True E — collect + talk + defeat ──────────────────────────
  {
    id: Q_CLAPPER,
    area: 'hush',
    name: 'The True E',
    giver: 'hush-agnes',
    offer: [
      '(whispering) When they drew the clapper, they gave it to my husband to melt. He was the bellfounder.',
      '(whispering) He didn\'t melt it. He broke it in three, at the joins, and hid the pieces in the snow.',
      '(whispering) He died with the Organ playing his voice. He told me where with his hands, at the end.',
      '(whispering) Bring them to me. A bell ought to be able to say its own name. Will you?',
    ],
    accept: [
      '(whispering) The mill yard by the racks. The far end of the boardwalk. The drift by the Sign School.',
    ],
    stages: [
      {
        objective: {
          kind: 'collect', area: 'hush', label: 'A piece of the clapper', emoji: '🔩', color: 0x9a7a4a,
          spots: [{ x: 330, y: 1384 }, { x: 2124, y: 1138 }, { x: 2230, y: 1024 }],
        },
        hint: 'Dig up the 3 pieces of the Hush Bell\'s clapper: the mill yard, the boardwalk end, the school drift',
      },
      {
        objective: {
          kind: 'talk', npc: 'hush-agnes',
          lines: [
            '(she fits them together on her apron, ball, shank and flight, with hands that do not shake at all)',
            '(whispering) Whole. Forty years in the snow and not a spot of rust. He oiled it first. Of course he did.',
            '(whispering) Oh — oh, no. Toll\'s seen. He\'s coming off the frame with that look. Stand in front of me?',
          ],
        },
        hint: 'Bring the clapper pieces to Agnes Bellamy on Bell Green',
      },
      {
        objective: { kind: 'defeat', encounter: 'hush-clapperless-bell' },
        hint: 'Face Sexton Toll (The Clapperless Bell) under the Hush Bell',
      },
    ],
    complete: [
      'He went and sat on the sill beam and covered his ears. And then he uncovered them. I saw him.',
      'It goes back on its hook the day the Prince falls. Here. My husband\'s last wages. He\'d want them rung.',
    ],
    reward: { orbs: 12, coins: 90 },
  },

  // ── 2. Soup Without a Sound — fish + deliver + duel ──────────────────
  {
    id: Q_TABLE,
    area: 'hush',
    name: 'Soup Without a Sound',
    giver: 'hush-hettie',
    offer: [
      '(whispering) The pot\'s empty. The fine book says the Quiet Table owes for "clatter of spoons". Again.',
      '(whispering) They took the barley. Barley! I can make soup out of anything but I can\'t make it out of air.',
      '(whispering) The mere\'s full of mute mullet. Nobody fishes them — a splash is a fine. You don\'t mind fines?',
    ],
    accept: [
      '(whispering) Three mullet. Cast soft. Gaffer Hollin on the boardwalk will show you the still-water way.',
    ],
    stages: [
      {
        objective: { kind: 'fish', fish: FISH_MULLET, count: 3 },
        hint: 'Catch 3 mute mullet in the Hush Mere (tuning rod)',
      },
      {
        objective: {
          kind: 'deliver', npc: 'hush-hettie', item: FISH_MULLET, count: 3,
          lines: [
            '(whispering) Three! Fat ones! In the pot with you, my lovelies, and an onion I was saving.',
            '(whispering) Oh, no. Pennywhisper. The fine-collector. She can smell soup from the Quiet House.',
          ],
        },
        hint: 'Bring the 3 mullet to Hettie Muff at the Quiet Table',
      },
      {
        objective: {
          kind: 'duel', area: 'hush',
          foe: {
            id: 'hush-q-quiet-table-duel',
            court: 'hush',
            name: 'Clatter of Spoons',
            foeName: 'Fine-Collector Pennywhisper',
            foeElement: 'fortune',
            difficulty: 5,
            hpMult: 0.95,
            gimmick: '',
            at: { x: 1150, y: 1380 },
            look: { body: 0xc8b8a4, accent: 0x2c3352, hat: 'earmuffs', traits: ['book', 'satchel', 'glasses'], size: 1.08, eye: 0xd0ae72 },
            challenge: [
              '(whispering) Fishing the mere: a splash. Landing on the boards: a thump. Three fish, three of each.',
              '(whispering) Soup at the Quiet Table, stirred with an unwrapped spoon. I heard it from the road.',
              '(whispering) Pay up, or the pot is the Prince\'s. Coins on the ledger, please. Quietly.',
            ],
            beaten: ['(whispering) …I shall write "paid in full". I shall not say by whom. Is there a bowl going?'],
            coins: 130,
          },
        },
        hint: 'See off Fine-Collector Pennywhisper on the road by the Quiet Table',
      },
    ],
    complete: [
      '(whispering) Mullet soup for thirty. Thirty! Nobody\'s eaten hot on a Vespers night in a month.',
      '(whispering) Take this — a whiting Hollin brought me. And the coins Pennywhisper dropped. She won\'t miss them.',
    ],
    reward: { orbs: 11, coins: 70, item: FISH_WHITING, itemCount: 1 },
  },

  // ── 3. A Fifth Shape — collect + talk + duel ─────────────────────────
  {
    id: Q_SIGN,
    area: 'hush',
    name: 'A Fifth Shape',
    giver: 'hush-tobin',
    offer: [
      '(whispering) Mam had a name for me, in sign. Before they took her voice. She can\'t teach it to me now.',
      '(whispering) It\'s not one of the four shapes. If she makes it where a warden sees, that\'s noise.',
      '(whispering) So she chalked it. Under three signing-posts. A bit at each. Before Limewash scrubs them.',
      '(whispering) Will you copy them down for me? I\'m not allowed out past the school.',
    ],
    accept: [
      '(whispering) The post on the green, the one up the north road, and the one by my school. Then go to Mam.',
    ],
    stages: [
      {
        objective: {
          kind: 'collect', area: 'hush', label: 'A chalked hand-shape', emoji: '✋', color: 0xfbfaf4,
          spots: [{ x: 960, y: 1090 }, { x: 1340, y: 730 }, { x: 1960, y: 902 }],
        },
        hint: 'Copy the 3 chalk marks under the signing-posts: the green, the north road, the Sign School',
      },
      {
        objective: {
          kind: 'talk', npc: 'hush-wren',
          lines: [
            '(she takes the copies and lays them in a row on the snow: a palm, a curl, a flick of the fingers)',
            '(she puts them together with her hands — a little bird sitting on the palm, and then it flies off)',
            '(she points to the school, to the small boy at the window, and makes it again, and again)',
            '(then her face changes. She signs STOP, sharp, and points behind you. Somebody with a bucket.)',
          ],
        },
        hint: 'Take the copies to Wren Ashby at her cottage across the mere',
      },
      {
        objective: {
          kind: 'duel', area: 'hush',
          foe: {
            id: 'hush-q-sign-name-duel',
            court: 'hush',
            name: 'Scrubbed White',
            foeName: 'Whitewasher Lyle Limewash',
            foeElement: 'chalk',
            difficulty: 5,
            hpMult: 0.95,
            gimmick: 'hush-sign-language',
            at: { x: 2040, y: 1050 },
            look: { body: 0xe0d8cc, accent: 0xd8d0c2, hat: 'cap', traits: ['tool', 'apron'], size: 1.12, eye: 0xffffff },
            challenge: [
              '(whispering) Three marks under three posts. Chalk. A fifth shape. That\'s noise written down.',
              '(whispering) I scrub what isn\'t one of the four. Walls, posts, slates, the backs of hands.',
              '(whispering) Let\'s see you stand on the four, then. Every child in Hush learns to in the end.',
            ],
            beaten: ['(he looks at his bucket, and the white on his hands, and very slowly makes the little bird)'],
            coins: 130,
          },
        },
        hint: 'Stop Whitewasher Lyle Limewash before he scrubs the posts — and the copies',
      },
    ],
    complete: [
      '(he makes it — a bird on the palm, flying off — and laughs out loud, and slaps both hands over his mouth)',
      '(whispering) Mam says thank you. She signed it. In a shape I didn\'t know, but I knew. Take this. It\'s hers.',
    ],
    reward: { orbs: 13, coins: 80 },
  },

  // ── 4. Ears on the Eaves — collect + defeat ──────────────────────────
  {
    id: Q_TRUMPETS,
    area: 'hush',
    name: 'Ears on the Eaves',
    giver: 'hush-cordwain',
    offer: [
      '(whispering) See the brass on the eaves? Listening-trumpets. Bell to the window, stem to a pipe.',
      '(whispering) Tiptoe walks his round and puts his ear to the pipes. He hears people\'s kitchens. Their beds.',
      '(whispering) I made the brackets. He paid me in fines I didn\'t have to pay. I want them down.',
      '(whispering) Four of them. You pull them, and when he comes for you — I hope you\'re louder than he is.',
    ],
    accept: [
      '(whispering) The cottage by the West Gate, the house above the green, the east road, the north road.',
    ],
    stages: [
      {
        objective: {
          kind: 'collect', area: 'hush', label: 'Listening-trumpet', emoji: '📯', color: 0xd0ae72,
          spots: TRUMPET_SPOTS,
        },
        hint: 'Pull the 4 listening-trumpets off the eaves round the court',
      },
      {
        objective: { kind: 'defeat', encounter: 'hush-creaking-boards' },
        hint: 'Face Sneak Tiptoe (Creaking Boards) on the mere boardwalk when he comes looking',
      },
    ],
    complete: [
      '(whispering, then, deliberately, not) There. I said "there". In the shop. With the door open.',
      'I\'m melting the trumpets down for hobnails. Here — I was saving this for a felt order. I shan\'t need it.',
    ],
    reward: { orbs: 12, coins: 90 },
  },

  // ── 5. The Register — talk + visit + prince ──────────────────────────
  {
    id: Q_HOUSE,
    area: 'hush',
    name: 'The Register',
    giver: 'hush-lintel',
    requires: { courtReady: 'hush' },
    offer: [
      '(whispering) All five of his wardens. He watched from the bell-cote. Now he is sitting with the register.',
      '(whispering) Before you go in, you should know whose name is on the first line. Ask Hask, at the gate.',
      '(whispering) And stand at the railing a moment. Every ribbon on it is somebody. It is only polite.',
    ],
    accept: [
      '(whispering) Hask, then the railing. Then the door. I will hold it for you. It is very heavy.',
    ],
    stages: [
      {
        objective: {
          kind: 'talk', npc: 'hush-hask',
          lines: [
            '(whispering) The first line? I was on this gate the night of the first Compline. Thirty years back.',
            '(whispering) A choirboy sang a descant over the Score. His own. Pretty thing. Floated right up over it.',
            '(whispering) The Maestro took the voice before the last note. Then gave the boy the Hush to keep.',
            '(whispering) He\'s kept it ever since. His own name\'s line one in the register. He reads it every night.',
          ],
        },
        hint: 'Ask Warden Hask at the West Gate whose name is on the register\'s first line',
      },
      {
        objective: { kind: 'visit', area: 'hush', at: { x: QUIET_HOUSE.x - 150, y: QUIET_HOUSE.y + 46 }, r: 80, label: 'The ribbon railing' },
        hint: 'Stand a moment at the ribbon railing of the Quiet House',
      },
      {
        objective: { kind: 'prince', prince: 'mute' },
        hint: 'Face Prince Mute at the Quiet House',
      },
    ],
    complete: [
      '(whispering, then aloud, as if testing it) He is on the step, untying the ribbons, one at a time.',
      'He hands me each one and I read the name. He mouths it after me. Take the house purse. Buy something loud.',
    ],
    reward: { orbs: 14, coins: 160 },
  },
];
