import type { QuestDef } from '../../../../IslesTypes';
import { CART, HOB_CLOCHE } from './area';
import { FISH_KOI, FISH_PERCH } from './items';

/**
 * The Bloom Court's five side quests.
 *
 * The first court on Thornwild, so between them they show how the garden works: the Tithe and
 * its weighing (Tansy), the pond and who owns its fish (Aldous), what being put under glass is
 * (Pip), the prune list and the crew who carry it out (Burdock), and finally the cart north to
 * the Glasshouse before you face the Prince (Quince). Each is somebody refusing to be tidied.
 */
export const BLOOM_QUESTS: QuestDef[] = [
  // ── 1. A Measure Short — collect + talk + duel ───────────────────────
  {
    id: 'bloom-q-measure-short',
    area: 'bloom',
    name: 'A Measure Short',
    giver: 'bloom-tansy',
    offer: [
      'Six days to the turn and my stripe\'s a measure short. Blight. Black on the roots. Nothing to be done.',
      'Short is pruned. They\'d take my grandson — he\'s the one whose hand is on the stripe this year.',
      'But the neighbours… they\'ve each left a marigold at the foot of their own stakes. For us. Quietly.',
      'Would you gather them? I can\'t bend so far. And mind — don\'t pull any that aren\'t left out.',
    ],
    accept: [
      'Bless you. Along the paths by the stakes. Then take them to Amaranth at the scales — she weighs true.',
    ],
    stages: [
      {
        objective: {
          kind: 'collect', area: 'bloom', label: 'A neighbour\'s marigold', emoji: '🌼', color: 0xf2b632,
          spots: [{ x: 300, y: 990 }, { x: 760, y: 990 }, { x: 380, y: 1285 }, { x: 820, y: 1285 }, { x: 420, y: 1600 }],
        },
        hint: 'Gather 5 marigolds the neighbours left on the paths through the Tithe Beds',
      },
      {
        objective: {
          kind: 'talk', npc: 'bloom-amaranth',
          lines: [
            'Weatherby, stripe six. Basket on the pan, please. …Four measures and three quarters. And the marigolds…',
            'Full measure. Full and a bit. I\'ll write it in.',
            'Oh. Oh dear. The Weigh-Warden saw you carrying them. She says a measure must be grown by the hand that pays.',
            'She says the gift is a theft of the Tithe. She is coming over. She has her rule with her.',
          ],
        },
        hint: 'Take the marigolds to Clerk Amaranth at the tithe balance',
      },
      {
        objective: {
          kind: 'duel', area: 'bloom',
          foe: {
            id: 'bloom-q-measure-short-duel',
            court: 'bloom',
            name: 'Grown by the Hand That Pays',
            foeName: 'Weigh-Warden Crane Assize',
            foeElement: 'justice',
            difficulty: 2,
            hpMult: 0.95,
            gimmick: '',
            at: { x: 1290, y: 1460 },
            look: { body: 0xc8b8a4, accent: 0x24665c, hat: 'mitre', traits: ['book', 'cane', 'glasses'], size: 1.15, eye: 0x7fd6c6 },
            challenge: [
              'A measure is grown by the hand that pays it. That is the whole of the law, and the whole of its beauty.',
              'Five marigolds from five stripes is five thefts and one fraud. I tied the ribbon on that stake myself.',
              'Put the flowers on the pan for the Crown, and step away from the scales.',
            ],
            beaten: ['…Full measure. Let the book say full measure. I will find the law about gifts later. There is one.'],
            coins: 55,
          },
        },
        hint: 'Face Weigh-Warden Crane Assize at the tithe balance',
      },
    ],
    complete: [
      'Full measure. FULL. Amaranth wrote it in her best hand and blotted it twice.',
      'Every stripe in the court gave us one. Even Pelham. I shall have to be nice to Pelham now. Take this.',
    ],
    reward: { orbs: 5, coins: 50 },
  },

  // ── 2. Soup for the Thin Stripes — fish + deliver + duel ─────────────
  {
    id: 'bloom-q-thin-soup',
    area: 'bloom',
    name: 'Soup for the Thin Stripes',
    giver: 'bloom-aldous',
    offer: [
      'The families with thin stripes stop eating near the turn. They give the beds the water. It never helps.',
      'Sister Nettle cooks them a pot when she can. I can\'t give her koi — the koi are counted. But the perch…',
      'Nobody counts the perch. Catch three off the pond for Nettle\'s pot, would you? I\'ll show you how.',
    ],
    accept: [
      'Cast from the kerb. When the float goes, reel and keep him in the bar. Perch bite at anything.',
    ],
    stages: [
      {
        objective: { kind: 'fish', fish: FISH_PERCH, count: 3 },
        hint: 'Catch 3 lilypad perch in the lily pond',
      },
      {
        objective: {
          kind: 'deliver', npc: 'bloom-nettle', item: FISH_PERCH, count: 3,
          lines: [
            'Perch! Three of them, and fat. Aldous sent you? Of course he did. Sit, they\'ll be in the pot by dusk.',
            'Oh — no. That\'s the Pond-Bailiff on the path. He\'ll say they\'re the Prince\'s. He says everything wet is.',
          ],
        },
        hint: 'Bring the 3 perch to Sister Nettle in the knot garden',
      },
      {
        objective: {
          kind: 'duel', area: 'bloom',
          foe: {
            id: 'bloom-q-thin-soup-duel',
            court: 'bloom',
            name: 'Everything Wet',
            foeName: 'Pond-Bailiff Ottoline Reed',
            foeElement: 'water',
            difficulty: 2,
            hpMult: 0.9,
            gimmick: '',
            at: { x: 1600, y: 1130 },
            look: { body: 0xb8c4b0, accent: 0x274f58, hat: 'souwester', traits: ['rod', 'satchel'], size: 1.1 },
            challenge: [
              'Every fish in every water of this court belongs to His Highness. The pond. The fountain. The puddles.',
              'Uncounted perch is unpaid tithe. Unpaid tithe goes on somebody\'s stripe. Shall it go on yours?',
              'Hand over the creel.',
            ],
            beaten: ['…The perch are not on the list. Strictly. I shall have to write a list. Go and eat your soup.'],
            coins: 55,
          },
        },
        hint: 'See off Pond-Bailiff Ottoline Reed on the pond path',
      },
    ],
    complete: [
      'Nettle says the pot fed eleven. Eleven! Off three perch and her cleverness.',
      'Here — take a koi. I caught it myself and I didn\'t count it. Don\'t tell anybody, and don\'t tell the koi.',
    ],
    reward: { orbs: 4, coins: 40, item: FISH_KOI, itemCount: 1 },
  },

  // ── 3. Under Glass — talk + collect + duel ───────────────────────────
  {
    id: 'bloom-q-under-glass',
    area: 'bloom',
    name: 'Under Glass',
    giver: 'bloom-pip',
    offer: [
      'That\'s my Da, under the big bell. The Weigh-Warden called our stripe leggy and he told her she was wrong.',
      'So they put him under glass. To bring him on, they said. Like a lettuce. It\'s been four days.',
      'I can\'t lift it. I\'m not big enough. Will you? Talk to him first — he\'ll know how.',
    ],
    accept: [
      'Shout. The glass is thick. Tell him I\'ve been brave. I have, mostly.',
    ],
    stages: [
      {
        objective: {
          kind: 'talk', npc: 'bloom-hob',
          lines: [
            '(through the glass) Who\'s that? A stranger? Is Pip all right? Good. GOOD. Tell her it\'s cosy in here.',
            '(muffled) Listen. The bell\'s pinned to an iron ring by three pegs, driven in round the rim.',
            '(muffled) Pull all three and it lifts. The Cloche-Warden checks them at dusk. Be quick.',
          ],
        },
        hint: 'Shout through the glass to Hob Larkspur on the forcing lawn',
      },
      {
        objective: {
          kind: 'collect', area: 'bloom', label: 'Cloche peg', emoji: '📍', color: 0x7c5c22,
          spots: [{ x: HOB_CLOCHE.x - 54, y: HOB_CLOCHE.y + 40 }, { x: HOB_CLOCHE.x + 58, y: HOB_CLOCHE.y + 36 }, { x: HOB_CLOCHE.x + 2, y: HOB_CLOCHE.y + 66 }],
        },
        hint: 'Pull the 3 iron pegs pinning Hob\'s cloche to the lawn',
      },
      {
        objective: {
          kind: 'duel', area: 'bloom',
          foe: {
            id: 'bloom-q-under-glass-duel',
            court: 'bloom',
            name: 'Brought On',
            foeName: 'Cloche-Warden Vitrine Hale',
            foeElement: 'crystal',
            difficulty: 3,
            hpMult: 0.95,
            gimmick: 'bloom-sundial',
            at: { x: 760, y: 800 },
            look: { body: 0xd8e4e4, accent: 0x8fb9bb, hat: 'goggles', traits: ['glasses', 'tool'], size: 1.05, eye: 0xcfeff0 },
            challenge: [
              'Those are my pegs. I drive every one myself, at noon, when the glass is hottest. It brings them on.',
              'A man under glass learns to flower. Four days and he has learnt to shout. Another week, he\'ll learn quiet.',
              'Out on the dial with you. We\'ll see how you do in the sun.',
            ],
            beaten: ['…Lift it, then. Glass is for lettuces. I may have forgotten that.'],
            coins: 55,
          },
        },
        hint: 'Beat Cloche-Warden Vitrine Hale before she drives the pegs back in',
      },
    ],
    complete: [
      'DA! He\'s red as a radish and he smells like a greenhouse, and he picked me UP.',
      'He says to give you this. It\'s our savings. It was for the measure next year. He says we\'ll grow beanpoles.',
    ],
    reward: { orbs: 6, coins: 60 },
  },

  // ── 4. The Prune List — collect + defeat ─────────────────────────────
  {
    id: 'bloom-q-prune-list',
    area: 'bloom',
    name: 'The Prune List',
    giver: 'bloom-burdock',
    offer: [
      'The list for this turn is posted. Four copies, all in the Warden\'s hand, all sealed. Twelve names.',
      'The crew read the names off the list at the cart. No list, no names. No names — nobody goes north.',
      'They\'ll write another next season. But this one… this one has the Hollyocks\' baby on it.',
      'I can\'t walk out in the open. Sabine would see me. You can.',
    ],
    accept: [
      'The board by the scales, the cart on the Heartwood road, the orangery door, and the end of the sheds.',
    ],
    stages: [
      {
        objective: {
          kind: 'collect', area: 'bloom', label: 'Copy of the prune list', emoji: '📜', color: 0x43a89a,
          spots: [{ x: 1560, y: 1600 }, { x: CART.x + 80, y: CART.y + 30 }, { x: 1760, y: 410 }, { x: 2160, y: 1090 }],
        },
        hint: 'Take down the 4 copies of the prune list posted round the court',
      },
      {
        objective: { kind: 'defeat', encounter: 'bloom-deadheading' },
        hint: 'Face Pruner Sabine (Deadheading) in the Tithe Beds when she finds the lists gone',
      },
    ],
    complete: [
      'Sabine came looking for the lists and went home with nothing in her hands. Nothing! I watched from the shed.',
      'One turn. One whole season of nobody. Here — my last wages as a pruner. They were never clean money.',
    ],
    reward: { orbs: 5, coins: 50 },
  },

  // ── 5. The Cart North — talk + visit + prince ────────────────────────
  {
    id: 'bloom-q-orangery',
    area: 'bloom',
    name: 'The Cart North',
    giver: 'bloom-quince',
    requires: { courtReady: 'bloom' },
    offer: [
      'All five of them. His Highness watched from the dome. He has asked for his good gloves.',
      'Before you go in, you should know what you are fighting for. Sister Nettle nursed him as a boy. Ask her.',
      'And go and stand by the cart on the Heartwood road. Everyone in this court has stood there once.',
    ],
    accept: [
      'Nettle, then the cart. Then the orangery door. I will have swept the step.',
    ],
    stages: [
      {
        objective: {
          kind: 'talk', npc: 'bloom-nettle',
          lines: [
            'Petalis. He was a sweet boy. He cried for a week when his first rose fell, and his mother came to see why.',
            'She told him what falls is what did not try. Then she had the gardener who grew it pruned. For not trying.',
            'He has never let a petal fall since. Not one. You can\'t imagine how tired he must be.',
          ],
        },
        hint: 'Ask Sister Nettle about the Prince as a boy',
      },
      {
        objective: { kind: 'visit', area: 'bloom', at: { x: CART.x, y: CART.y + 40 }, r: 80, label: 'The pruning cart' },
        hint: 'Stand by the pruning cart on the Heartwood road',
      },
      {
        objective: { kind: 'prince', prince: 'petalis' },
        hint: 'Face Prince Petalis at the orangery',
      },
    ],
    complete: [
      'He has opened the orangery doors and he is sitting on the step. There are petals all round him.',
      'He asked me not to sweep them. I have been his steward eleven years and he has never asked me not to sweep.',
      'Take the steward\'s purse. He says the garden is to be untidy now, and untidiness is expensive.',
    ],
    reward: { orbs: 8, coins: 140 },
  },
];
