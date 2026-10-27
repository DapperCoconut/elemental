import type { QuestDef } from '../../../../IslesTypes';
import { ENC_HIVE, ENC_VIGIL } from './encounters';
import { FISH_TROUT, FISH_WICKFIN, HONEYCOMB, RECIPE_TROUT, ROYAL_JELLY } from './items';

/**
 * Candlewick's five side stories. Each is a small life under the Inch-Tax: a boy whose family
 * candle is guttering, a cathedral whose tapers are snuffed for the wrong dead, a beekeeper whose
 * queens were taken for the Prince's tower, a fisher making candles the King cannot brand, and
 * — once Tallow is out — the old sexton who kept count of everyone the tax sent to the Kiln.
 */

export const NPC = {
  cerelle: 'candlewick-cerelle',
  bettony: 'candlewick-bettony',
  pip: 'candlewick-pip',
  wenna: 'candlewick-wenna',
  hob: 'candlewick-hob',
  marisol: 'candlewick-marisol',
  snuff: 'candlewick-snuff',
  jack: 'candlewick-gutterjack',
  plum: 'candlewick-plum',
} as const;

export const Q_INCH_TAX = 'candlewick-inch-tax';
export const Q_NAVE = 'candlewick-smoke-in-the-nave';
export const Q_HIVE = 'candlewick-smaller-hive';
export const Q_POND = 'candlewick-what-the-pond-keeps';
export const Q_LEDGER = 'candlewick-ledger-of-wicks';

/** Where Pip's family candle stands on Wick Street — the area paints this house. */
export const PIP_HOUSE = { x: 470, y: 640 };

export const CANDLEWICK_QUESTS: QuestDef[] = [
  {
    id: Q_INCH_TAX, area: 'candlewick', name: 'The Inch-Tax', giver: NPC.pip,
    offer: [
      'Our house is guttering. The wick\'s drowned in its own wax and Mum can\'t get it to take.',
      'The Inchwardens come round at dawn with their rods. A house that\'s gone out gets marched up the hill.',
      'Mother Cerelle could braid us a new wick if she had the ends. The chandlers drop loads of them on the lane.',
      'Would you... help me pick some up? I\'m not allowed down there after the bell.',
    ],
    accept: [
      'Five should do it! They\'re little curly bits of cotton, all black at one end. You can\'t miss them.',
      'Don\'t let Chandler Brigid see you. She counts everything.',
      'And hurry. Inchwarden Rule does our street first, and he never comes late.',
    ],
    stages: [
      {
        objective: {
          kind: 'collect', area: 'candlewick', label: 'wick-end', emoji: '🧵', color: 0xf3e3bf,
          spots: [{ x: 1185, y: 1020 }, { x: 1222, y: 1120 }, { x: 1168, y: 1302 }, { x: 1380, y: 1316 }, { x: 1522, y: 1288 }],
        },
        hint: 'Pick up 5 dropped wick-ends along Chandlers\' Lane',
      },
      {
        objective: {
          kind: 'talk', npc: NPC.cerelle, lines: [
            'Wick-ends? Off my own lane? You have some nerve. Give them here.',
            'Tallowby boy\'s house, is it. Hm. Hold still while I braid. Three strands, a twist for luck.',
            'No charge. If anyone asks, you bought a very expensive charm.',
          ],
        },
        hint: 'Bring the wick-ends to Mother Cerelle at the chandlery',
      },
      {
        objective: { kind: 'visit', area: 'candlewick', at: { x: PIP_HOUSE.x, y: PIP_HOUSE.y + 40 }, r: 60, label: 'The Tallowby house' },
        hint: 'Take the new wick to the Tallowby house on Wick Street',
      },
      {
        objective: {
          kind: 'duel', area: 'candlewick',
          foe: {
            id: 'candlewick-inch-tax-duel', court: 'candlewick', name: 'Short Measure',
            foeName: 'Inchwarden Rule', foeElement: 'justice', difficulty: 3, gimmick: '',
            at: { x: 560, y: 742 },
            look: { body: 0xf0e0c0, accent: 0x8a1a22, hat: 'tophat', traits: ['cane', 'book'], size: 1.1 },
            challenge: [
              'Tallowby house. Guttered at the last bell — I wrote it down. A relit wick is a new wick, and new wicks are taxed.',
              'Unlicensed braid, unpaid inch. The family walks up the hill at dawn. Stand aside, or be measured too.',
            ],
            beaten: ['Fine. Burning... within tolerance. I will amend the ledger. Do not tell the Prince I can be amended.'],
            coins: 50,
          },
        },
        hint: 'Stop Inchwarden Rule from marching the Tallowbys up the hill (Wick Street)',
      },
    ],
    complete: [
      'It took! And you saw off Inchwarden Rule! Mum watched from the window. She\'s crying, but the good kind.',
      'He can come back with his rod all he likes now. We\'re burning just exactly right.',
    ],
    reward: { orbs: 3, coins: 40 },
  },

  {
    id: Q_NAVE, area: 'candlewick', name: 'Smoke in the Nave', giver: NPC.wenna,
    offer: [
      'The Taper Cathedral used to hold a thousand flames. Each one somebody\'s prayer.',
      'Now the Vigil-Keeper walks the nave at night and pinches out every taper not lit for the King.',
      'People light them for the ones the Kiln took. In the morning there is nothing but smoke.',
      'If someone stood up to Amonet, I could gather what is left and start again.',
    ],
    accept: [
      'She keeps her vigil on the steps. Be gentle with her, if you can. She was not always like this.',
    ],
    stages: [
      { objective: { kind: 'defeat', encounter: ENC_VIGIL }, hint: 'Defeat Vigil-Keeper Amonet on the cathedral steps' },
      {
        objective: {
          kind: 'collect', area: 'candlewick', label: 'votive stub', emoji: '🕯️', color: 0xfff1cf,
          spots: [{ x: 600, y: 606 }, { x: 676, y: 648 }, { x: 902, y: 604 }, { x: 1012, y: 590 }, { x: 1098, y: 610 }, { x: 812, y: 662 }],
        },
        hint: 'Gather 6 snuffed votive stubs around the cathedral steps',
      },
      {
        objective: {
          kind: 'talk', npc: NPC.snuff, lines: [
            'Those are my stubs. I mean — I snuffed those. Not Amonet. Me. She only gave the order.',
            'I have carried a snuffer in this nave for forty years. I put out the King\'s enemies\' candles. I was told to.',
            'Tell the Canoness I am sorry. Tell her I kept count. I could not stop myself keeping count.',
            'But mind my acolyte, Smother. I taught him the snuffer. He still thinks the order stands. He will want those stubs.',
          ],
        },
        hint: 'Ask Old Snuff, the sexton, about the stubs',
      },
      {
        objective: {
          kind: 'duel', area: 'candlewick',
          foe: {
            id: 'candlewick-smoke-in-the-nave-duel', court: 'candlewick', name: 'Snuffer\'s Hood',
            foeName: 'Acolyte Smother', foeElement: 'shadow', difficulty: 3, gimmick: '',
            at: { x: 1080, y: 522 },
            look: { body: 0x4a4250, accent: 0x1a1a22, hat: 'hood', traits: ['lantern'], size: 0.95, eye: 0xc8b8ff },
            challenge: [
              'Those stubs were lit for the King\'s enemies. They go in the ash-pit, not back to the Canoness.',
              'Old Snuff has gone soft. I have not. Hand them over, or I put you out too.',
            ],
            beaten: ['The snuffer is... heavier than he said. Take them. I will not stop counting either, now.'],
            coins: 50,
          },
        },
        hint: 'Keep the stubs from Acolyte Smother on Taper Row by the cathedral',
      },
    ],
    complete: [
      'Snuff? Old Snuff did it? And his acolyte came for the stubs? Oh, the poor old fools.',
      'Thank you for standing in the way. Give me the stubs. We will pour one great candle for all of them.',
      'He kept count, you say. Then perhaps one day he can read us the names.',
    ],
    reward: { orbs: 4, coins: 30 },
  },

  {
    id: Q_HIVE, area: 'candlewick', name: 'Queen of a Smaller Hive', giver: NPC.hob,
    offer: [
      'Listen to them. Hear that pitch? That\'s a hive without a queen.',
      'The Prince wanted royal wax for his tower. So his apiarist took the queens. All of them. Into the palace.',
      'Hum\'s guarding the yard for him. Get past Hum, and slip round the back of the palace — there\'s a royal apiary.',
      'Bring my girls home. Or tell me where they are, at least.',
    ],
    accept: [
      'Hum knows bees better than I do. Don\'t stand still near the skeps and you\'ll be all right.',
    ],
    stages: [
      { objective: { kind: 'defeat', encounter: ENC_HIVE }, hint: 'Defeat Apiarist Hum in the apiary' },
      {
        objective: { kind: 'visit', area: 'candlewick', at: { x: 2250, y: 1070 }, r: 70, label: 'The royal apiary' },
        hint: 'Find the royal apiary behind Prince Tallow\'s palace',
      },
      {
        objective: {
          kind: 'deliver', npc: NPC.hob, item: HONEYCOMB, count: 2, lines: [
            'You found them? In glass boxes? Oh, my girls.',
            'They\'ll need fresh comb to move into. Real comb, not palace wax. Give it here.',
            'There. Smell that? They\'re ready. Now somebody has to break the glass.',
            'The palace keeps a Glasswarden on that rack. Pane, she\'s called. She won\'t open it for asking.',
          ],
        },
        hint: 'Bring Hob 2 Honeycomb Slabs for the queens to come home to',
      },
      {
        objective: {
          kind: 'duel', area: 'candlewick',
          foe: {
            id: 'candlewick-smaller-hive-duel', court: 'candlewick', name: 'Bell Jar',
            foeName: 'Glasswarden Pane', foeElement: 'crystal', difficulty: 3, gimmick: 'candlewick-hive',
            at: { x: 2290, y: 1100 },
            look: { body: 0xd8ecf4, accent: 0x6a8aa8, hat: 'goggles', traits: ['apron', 'tool'], size: 1.05, eye: 0x9ad8ff },
            challenge: [
              'Royal queens, royal glass, royal wax. Every pane on this rack is signed for. So is every bee.',
              'The beekeeper wants them back? He can file with the palace. You can file with me.',
            ],
            beaten: ['My panes! Listen to them go. That sound will be in my ears all winter.'],
            coins: 50,
          },
        },
        hint: 'Break Glasswarden Pane\'s hold on the queens at the royal apiary',
      },
    ],
    complete: [
      'You broke the glass! The first one came over the wall an hour ago. Then four more. Then a cloud.',
      'Here — royal jelly, from the queens themselves. Bettony at the Honeyed Wick will know what to do with it.',
    ],
    reward: { orbs: 4, item: ROYAL_JELLY, itemCount: 2 },
  },

  {
    id: Q_POND, area: 'candlewick', name: 'What the Pond Keeps', giver: NPC.marisol,
    offer: [
      'Every candle that gutters in Candlewick gets thrown in this pond. Hundreds a year.',
      'The wickfin grow up eating the ends. Their fins are wicks, near enough — and the brand never took on them.',
      'A candle made with a wickfin wick doesn\'t carry his mark. Doesn\'t answer to his tax.',
      'I\'m making a few. Quietly. Want to help me catch the makings?',
    ],
    accept: [
      'Three wickfin for the wicks, and a fat tallow trout for the wax. You\'ll need an iron rod; the pond eats wood.',
      'And keep an eye out for the Brander. He walks the bank sniffing for any wax that hasn\'t felt his iron.',
    ],
    stages: [
      { objective: { kind: 'fish', fish: FISH_WICKFIN, count: 3 }, hint: 'Catch 3 Wickfin in the wax pond' },
      { objective: { kind: 'fish', fish: FISH_TROUT, count: 1 }, hint: 'Catch a Tallow Trout in the wax pond' },
      {
        objective: { kind: 'cook', recipe: RECIPE_TROUT },
        hint: 'Have Bettony at the Honeyed Wick seal a trout in tallow (she keeps the drippings for me)',
      },
      {
        objective: {
          kind: 'duel', area: 'candlewick',
          foe: {
            id: 'candlewick-what-the-pond-keeps-duel', court: 'candlewick', name: 'Hot Iron',
            foeName: 'Brander Seck', foeElement: 'metal', difficulty: 3, gimmick: '',
            at: { x: 862, y: 1214 },
            look: { body: 0x9a8a7a, accent: 0x3a3a44, hat: 'helmet', traits: ['brand', 'tool'], size: 1.15 },
            challenge: [
              'Fresh tallow, and no grey in it. I can smell unbranded wax from Drip Square.',
              'Give it here. Every candle in Candlewick wears the King\'s mark, and I\'m the one who puts it there.',
            ],
            beaten: ['Iron\'s gone cold. Keep your white wax. I never smelled it.'],
            coins: 50,
          },
        },
        hint: 'Keep Brander Seck\'s iron off the unbranded tallow (east bank of the wax pond)',
      },
    ],
    complete: [
      'The Brander came for it? And went home with a cold iron? Ha!',
      'Bettony\'s drippings set white, look — no brand-grey in them at all.',
      'First unbranded candle in Candlewick in twenty years. I\'m going to light it on the pier tonight. In the open.',
    ],
    reward: { orbs: 3, coins: 60 },
  },

  {
    id: Q_LEDGER, area: 'candlewick', name: 'The Ledger of Wicks', giver: NPC.snuff,
    requires: { prince: 'tallow' },
    offer: [
      'For every candle I snuffed, I kept the wick. Tied a knot in it for the name. I hid them all over the court.',
      'Now the Prince is out, I would like the Canoness to have them. Every name.',
      'My knees will not take me round the streets any more. Would you find them?',
    ],
    accept: [
      'Five bundles. Under the eaves, in the runnels, wherever a sexton could stoop without being seen.',
      'Bring them to the altar steps. Wenna will know what to do. She always does.',
    ],
    stages: [
      {
        objective: {
          kind: 'collect', area: 'candlewick', label: 'knotted wicks', emoji: '🪢', color: 0x2a1d14,
          spots: [{ x: 300, y: 812 }, { x: 822, y: 836 }, { x: 1200, y: 690 }, { x: 1560, y: 884 }, { x: 1196, y: 1140 }],
        },
        hint: 'Find Old Snuff\'s 5 hidden bundles of knotted wicks around the court',
      },
      {
        objective: { kind: 'visit', area: 'candlewick', at: { x: 760, y: 520 }, r: 70, label: 'The cathedral altar steps' },
        hint: 'Carry the bundles to the Taper Cathedral\'s steps',
      },
      {
        objective: {
          kind: 'talk', npc: NPC.wenna, lines: [
            'Knots. Hundreds of knots. Each one a name he could not say out loud.',
            'We will hang them from the nave, every one, and light a taper under each.',
            'Not for the King. For them.',
            'But someone else kept count too. Tallyman Quire wrote the tax rolls these knots answer to. He is on the steps now.',
          ],
        },
        hint: 'Give the bundles to Canoness Wenna',
      },
      {
        objective: {
          kind: 'duel', area: 'candlewick',
          foe: {
            id: 'candlewick-ledger-of-wicks-duel', court: 'candlewick', name: 'Struck from the Rolls',
            foeName: 'Tallyman Quire', foeElement: 'paper', difficulty: 3, gimmick: '',
            at: { x: 880, y: 508 },
            look: { body: 0xf2ead6, accent: 0x3a2a1a, hat: 'cap', traits: ['glasses', 'book'], size: 1 },
            challenge: [
              'Every knot is a name, and every name is a line in my rolls with my seal beside it.',
              'The Prince is gone. My handwriting is not. Those knots go in the fire before anyone reads them aloud.',
            ],
            beaten: ['Read them, then. Read my name too. I suppose it belongs up there with theirs.'],
            coins: 50,
          },
        },
        hint: 'Stop Tallyman Quire from burning the knotted wicks (cathedral steps)',
      },
    ],
    complete: [
      'You stopped Quire on the steps? Good. Let him hear every name read out.',
      'She is hanging them now. I can hear her reading the knots like beads.',
      'Forty years of counting. I think I may sleep tonight.',
    ],
    reward: { orbs: 5, coins: 100 },
  },
];
