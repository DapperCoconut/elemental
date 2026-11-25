import type { FallenBundle } from '../../../../../IslesTypes';
import { fallenId } from '../../../../meteor/spec';
import { FALLEN_CANDLES } from './candles';
import { FALLEN_CLOCHES } from './cloches';
import { FALLEN_CUTTERS } from './cutters';
import { FALLEN_LOAF_A_HEAD } from './loafAHead';
import { FALLEN_PENNED } from './penned';

/**
 * The Confection Court's Fallen Five — in the star's telling, the people of the sugar town who kept
 * the Sweet-Tax sweet for the crown: the tallyman who rang the bell on the short, the fencewright
 * who built the pens for the Glasshouse cart, the Prince's taster, the tinsmith who cut the town
 * to pattern, and the chandler who kept the birthday burning. Tier 2: difficulty 4,4,4,5,5; coins about
 * double the court's 65. They stand on ground the court's own five never use: the top of
 * Peppermint Way, the Treacle Road verge, the Fête road, below the Taffy Works and the west lane.
 */

const EYE = 0xffa040;

export const FALLEN: FallenBundle = {
  gimmicks: [FALLEN_LOAF_A_HEAD, FALLEN_PENNED, FALLEN_CLOCHES, FALLEN_CUTTERS, FALLEN_CANDLES],
  encounters: [
    {
      id: fallenId('confection', 'loaf-a-head'),
      court: 'confection',
      name: 'A Loaf a Head',
      foeName: 'Tallyman Pomfrey Dredge',
      foeElement: 'paper',
      difficulty: 4,
      hpMult: 1.1,
      gimmick: fallenId('confection', 'loaf-a-head'),
      at: { x: 1200, y: 120 },
      look: { body: 0xe8d4c0, accent: 0x3a5ab0, hat: 'tophat', traits: ['glasses', 'book'], size: 0.95, eye: EYE },
      challenge: [
        'One loaf a head, a head a season. I don\'t make the sums. I only ring the bell on them.',
        'There\'s one loaf on this floor and two of us. You can see the trouble. Everybody always sees it.',
        'Hold on to it, now. The bell is very fair. It only ever rings for the empty-handed.',
      ],
      beaten: [
        'Tally-sticks… I notched them for the bakery. Loaves sold, not loaves owed. Wasn\'t that it?',
        'I never rang a bell on anyone. I rang the shop bell. Ding — "morning, Mrs Pell." That bell.',
      ],
      coins: 130,
    },
    {
      id: fallenId('confection', 'penned'),
      court: 'confection',
      name: 'Penned for the Cart',
      foeName: 'Fencewright Barley Stook',
      foeElement: 'gluttony',
      difficulty: 4,
      gimmick: fallenId('confection', 'penned'),
      at: { x: 1580, y: 820 },
      look: { body: 0xd8a878, accent: 0xe0283c, hat: 'cap', traits: ['tool', 'apron', 'beard'], size: 1.25, eye: EYE },
      challenge: [
        'Every fence in this town is mine. Garden fences, yard fences. The ones by the cart road, too.',
        'Twelve posts and a flag on the last. Folk always think they\'ve time to step out. They haven\'t.',
        'Stand still, there\'s a good sort. It\'s a nicer pen if nobody fusses.',
      ],
      beaten: [
        'Gardens. I fenced gardens. To keep the goats off the gumdrop beds. Only ever gardens.',
        'Why would I build a pen for people? Who\'d ask a man that? Who told me I said yes?',
      ],
      coins: 130,
    },
    {
      id: fallenId('confection', 'cloches'),
      court: 'confection',
      name: 'The Taster\'s Cloches',
      foeName: 'Comfit Vane, Royal Taster',
      foeElement: 'illusion',
      difficulty: 4,
      hpMult: 1.05,
      gimmick: fallenId('confection', 'cloches'),
      at: { x: 2020, y: 990 },
      look: { body: 0xf0dcc8, accent: 0x9a6ad0, hat: 'none', traits: ['scarf', 'glasses'], size: 0.9, eye: EYE },
      challenge: [
        'I taste everything before His Sweetness. The good dish to him. The other dish to whoever vexed him.',
        'Watch the bonbon, darling. Watch it go under. Watch my hands. No — watch my hands.',
        'You vexed him, I hear. Pick a dome.',
      ],
      beaten: [
        'I tasted… soup. At the almshouse, for the old ones who can\'t tell if it\'s too hot. That was me.',
        'Silver domes. We never owned a silver dome. We ate off the board. Why can I see them shining?',
      ],
      coins: 130,
    },
    {
      id: fallenId('confection', 'cutters'),
      court: 'confection',
      name: 'Biscuit or Dough',
      foeName: 'Tinsmith Wenna Gauge',
      foeElement: 'metal',
      difficulty: 5,
      hpMult: 1.2,
      gimmick: fallenId('confection', 'cutters'),
      at: { x: 1700, y: 1440 },
      look: { body: 0xd8b898, accent: 0x8a8690, hat: 'bandana', traits: ['tool', 'apron', 'glasses'], size: 1.1, eye: EYE },
      challenge: [
        'Star, heart, little man. His Sweetness likes his town in shapes, and I make the shapes.',
        'Whatever fits the cutter is kept. Whatever doesn\'t fit goes back under the pin, to be rolled again.',
        'Stand inside the line, dear. Not on it. Never on it.',
      ],
      beaten: [
        'Cutters… for the children\'s Fête biscuits. A penny a tin. I let them choose the shapes themselves.',
        'I never cut a person to anything. Why does my hand know the weight of the pin?',
      ],
      coins: 140,
    },
    {
      id: fallenId('confection', 'candles'),
      court: 'confection',
      name: 'Blow Out the Candles',
      foeName: 'Candlewick Fennel, Chandler',
      foeElement: 'wax',
      difficulty: 5,
      hpMult: 1.25,
      gimmick: fallenId('confection', 'candles'),
      at: { x: 560, y: 860 },
      look: { body: 0xf2e0c8, accent: 0xf6dc5a, hat: 'chef', traits: ['apron', 'lantern'], size: 1.05, eye: EYE },
      challenge: [
        'Every day is His Sweetness\'s birthday. Six candles, burning, every day, and the town buys the wax.',
        'Snuff one and I light it. Snuff two and I light them. I have a very long taper, love.',
        'Make a wish. Go on. Nobody in this town has had one granted yet.',
      ],
      beaten: [
        'Night-lights. I made night-lights for the Saltcellar children, so they\'d not be scared below.',
        'Never a birthday candle in my life. Not one. I can still smell the wax, though. Whose was it?',
      ],
      coins: 140,
    },
  ],
};
