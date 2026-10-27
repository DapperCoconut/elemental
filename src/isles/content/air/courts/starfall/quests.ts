import type { QuestDef } from '../../../../IslesTypes';
import { CX, SIPHON } from './layout';

/**
 * Five small stories from the summit: a wife whose husband's star was inked out though his breath
 * was paid, an old angler whose Starpool is being drained for the Lung's lamps, a nine-year-old who
 * found a new star the court means to steal, a lamplighter metered into the red for climbing her
 * own ladders, and the Warden of the Last Stair, who has watched every bottle go up and none come
 * down.
 *
 * Duel foes: paper, electricity, illusion, ice, air — none of them a champion's element.
 */
export const STARFALL_QUESTS: QuestDef[] = [
  {
    id: 'starfall-snuffed',
    area: 'starfall',
    name: 'A Star Gone Out',
    giver: 'starfall-brightwell',
    offer: [
      'Corvin paid his breath to the last puff. Here\'s the stub. And still his star was inked and he was corked.',
      'Registrar Dimm keeps the Ledger. He\'s not cruel — just tired. He might listen to someone with breath to spare.',
      'Will you ask him? I\'d go, but every word up here costs, and I\'ve hardly any left.',
    ],
    accept: [
      'The Registry\'s west of the plaza, all columns. Dimm will be at his desk. He\'s always at his desk.',
    ],
    stages: [
      {
        objective: {
          kind: 'talk', npc: 'starfall-dimm',
          lines: [
            'Brightwell. Inked on the ninth. Says here: "in arrears". Paid receipts go on the spike — let me see.',
            '...The spike is empty. It\'s never empty. Quire empties it. Into the — oh. Oh, no.',
            'He\'s been throwing paid receipts off the rim. They blow about the craters before they go over.',
          ],
        },
        hint: 'Ask Registrar Dimm at the Registry of Stars why Corvin Brightwell\'s star was inked',
      },
      {
        objective: {
          kind: 'collect', area: 'starfall', label: 'Paid receipt', emoji: '🧾', color: 0xe8dcc0,
          spots: [{ x: 520, y: 1290 }, { x: 760, y: 1520 }, { x: 380, y: 1130 }, { x: 940, y: 1420 }],
        },
        hint: 'Gather 4 paid breath-receipts blowing about the craters before the wind takes them over the rim',
      },
      {
        objective: {
          kind: 'duel', area: 'starfall',
          foe: {
            id: 'starfall-snuffed-duel',
            court: 'starfall',
            name: 'Arrears',
            foeName: 'Clerk Quire',
            foeElement: 'paper',
            difficulty: 5,
            gimmick: '',
            at: { x: 840, y: 850 },
            look: { body: 0xd8d0c0, accent: 0x10101c, hand: 0xe8dcc0, hat: 'cap', traits: ['book', 'glasses', 'satchel'], size: 0.95, eye: 0xe8dcc0 },
            challenge: [
              'The Prince sets a quota. So many stars a month. Paid or not, the quota must be inked. It\'s arithmetic.',
              'Those receipts were litter. I keep the Registry tidy. Put them down or I\'ll file you with them.',
            ],
            beaten: ['My pen... my good pen. Fine. FINE. Re-light the wretched star. The quota can count itself.'],
            coins: 100,
          },
        },
        hint: 'Clerk Quire has seen you with the receipts — face him by the Registry steps',
      },
    ],
    complete: [
      'Dimm came himself. He re-lit the plaque with his own sleeve. Corvin\'s star is shining in the Ledger.',
      'They say his bottle\'s still up in the Lung. But the debt\'s gone. Here — the breath-money I\'d been saving.',
    ],
    reward: { orbs: 6, coins: 70 },
  },
  {
    id: 'starfall-starpool',
    area: 'starfall',
    name: 'The Starpool Run',
    giver: 'starfall-halloran',
    offer: [
      'The pool\'s dimming. Every week, a shade darker. Comets used to run so thick you could read by them.',
      'The Lamp-Office sank copper rods in it last spring. Draws the light off into jars, for the Lung\'s lamps.',
      'Catch me a few, so I know they\'re still running. Then let\'s go and look at that copper together.',
    ],
    accept: ['Skyline rod, mind. Anything else melts. Minnows in the shallows; perch sit deep and fight like falling.'],
    stages: [
      { objective: { kind: 'fish', fish: 'fish-comet-minnow', count: 2 }, hint: 'Catch 2 Comet Minnows in the Starpool (skyline rod)' },
      { objective: { kind: 'fish', fish: 'fish-meteor-perch', count: 1 }, hint: 'Land a Meteor Perch from the bottom of the Starpool' },
      { objective: { kind: 'visit', area: 'starfall', at: { x: SIPHON.x, y: 1390 }, r: 70, label: 'The Lamp-Office siphon' }, hint: 'Look at the copper siphon on the Starpool\'s east rim' },
      {
        objective: {
          kind: 'duel', area: 'starfall',
          foe: {
            id: 'starfall-starpool-duel',
            court: 'starfall',
            name: 'Draw-Off',
            foeName: 'Lampwright Ferrule',
            foeElement: 'electricity',
            difficulty: 5,
            gimmick: '',
            at: { x: 1820, y: 1420 },
            look: { body: 0x8a7a6a, accent: 0xc87a48, hand: 0xffe08a, hat: 'goggles', traits: ['tool', 'apron', 'pack'], size: 1.15, eye: 0x8fe3ff },
            challenge: [
              'The Lung burns nine hundred lamps a night, and every one of them wants starlight. This pool is full of it.',
              'Old Tail can fish somewhere darker. Hands off my copper — it\'s live, and so am I.',
            ],
            beaten: ['Rods are bent. Jars are smashed. The Office will want a report. I\'ll write that the pool fought back.'],
            coins: 100,
          },
        },
        hint: 'Lampwright Ferrule has come to change the jars — stop him at the siphon',
      },
    ],
    complete: [
      'Copper out and the pool filling with light again. Look — you can see the comets turning in it.',
      'Here. Fishing money. I\'ve nothing to spend it on but hooks, and the hooks never wear out up here.',
    ],
    reward: { orbs: 6, coins: 60 },
  },
  {
    id: 'starfall-newstar',
    area: 'starfall',
    name: 'Dot\'s Star',
    giver: 'starfall-dot',
    offer: [
      'I found a new star and nobody will believe me because I\'m nine. Grandad\'s scope isn\'t big enough to PROVE it.',
      'The Great Telescope could. But Galilee won\'t let anyone near the big lens. He says it\'s the Prince\'s.',
      'And Mum says the Court Astrologer is going to "register" it. With a horoscope. A BAD one. About us.',
    ],
    accept: ['If you beat Galilee he has to let you use it. That\'s the rule. Then show the plate to Professor Sextant!'],
    stages: [
      { objective: { kind: 'defeat', encounter: 'starfall-telescope' }, hint: 'Beat Astronomer Galilee at the Great Telescope (Telescope)' },
      {
        objective: {
          kind: 'talk', npc: 'starfall-sextant',
          lines: [
            'A plate from the great lens? Give it here. Past the Kite\'s tail... There. Oh, there it is. A nova. A real one.',
            'And here\'s the Registry\'s draft: "Ill Wind over the Ashwicks — a portent of debt." Signed Mirabel Haze.',
            'A bad omen raises a house\'s rate. That is all horoscopes are for, up here. Haze will be at the plaza.',
          ],
        },
        hint: 'Take the telescope plate to Professor Sextant by the Eclipse Terrace road',
      },
      {
        objective: {
          kind: 'duel', area: 'starfall',
          foe: {
            id: 'starfall-newstar-duel',
            court: 'starfall',
            name: 'Ill Omen',
            foeName: 'Court Astrologer Mirabel Haze',
            foeElement: 'illusion',
            difficulty: 5,
            gimmick: '',
            at: { x: 1060, y: 870 },
            look: { body: 0x9a7aa8, accent: 0xd77ad8, hand: 0xf4f0ff, hat: 'veil', traits: ['mask', 'book'], size: 1.05, eye: 0xd77ad8 },
            challenge: [
              'Every new light belongs to the Prince. And every light means something. I decide what. This one means debt.',
              'The child will forget. Children forget. The Ledger does not. Stand aside — the stars are speaking.',
            ],
            beaten: ['The stars say... the stars say I should go and lie down. For once I think they mean it.'],
            coins: 100,
          },
        },
        hint: 'Court Astrologer Mirabel Haze is posting the false horoscope on the plaza — stop her',
      },
    ],
    complete: [
      'IT\'S MINE. Well, it\'s the sky\'s. But I get to name it. I\'m calling it Ashwick\'s Star. After all of us.',
      'Here — my pocket money. And Grandad says have his best nebula ray. It\'s full of tiny stars. Like mine.',
    ],
    reward: { orbs: 7, coins: 40, item: 'fish-nebula-ray', itemCount: 1 },
  },
  {
    id: 'starfall-lamps',
    area: 'starfall',
    name: 'The Lamplighter\'s Breath',
    giver: 'starfall-sconce',
    offer: [
      'Sixteen lanterns, every night, up and down the ladders. And the meter-house reads me like a racehorse.',
      'I\'m one bad reading from becalmed. Tonight five lanterns are still dark and I can\'t climb another rung.',
      'Light them for me? Then come with me to the meter-house. I want to see that frost-glass for myself.',
    ],
    accept: ['Tap the cage at the top of each pole and the mote catches. The dark ones are scattered all over the summit.'],
    stages: [
      {
        objective: {
          kind: 'collect', area: 'starfall', label: 'Light the star-lantern', emoji: '🏮', color: 0xffe08a,
          spots: [{ x: 1120, y: 1470 }, { x: 680, y: 910 }, { x: 1720, y: 960 }, { x: 1470, y: 680 }, { x: 900, y: 1390 }],
        },
        hint: 'Light 5 dark star-lanterns across the summit for Ottoline',
      },
      {
        objective: {
          kind: 'talk', npc: 'starfall-hobb',
          lines: [
            'Sconce\'s reading? Here, on the frost-glass. You breathe on it, the fog spreads, I read off the rings.',
            'Hm. That\'s a lot of fog for one small woman. That\'s... that\'s a big man\'s fog. A big, cold man\'s.',
            'The Assessor reads the glass before I do. Every morning. Breathing very close to it. Oh, Rime, you devil.',
          ],
        },
        hint: 'Ask Ansel Hobb at the Cloud Line meter-house to show you Ottoline\'s frost-glass reading',
      },
      {
        objective: {
          kind: 'duel', area: 'starfall',
          foe: {
            id: 'starfall-lamps-duel',
            court: 'starfall',
            name: 'Frost-Glass',
            foeName: 'Frost-Assessor Rime',
            foeElement: 'ice',
            difficulty: 5,
            gimmick: '',
            at: { x: 1080, y: 1680 },
            look: { body: 0xb8c8d8, accent: 0x5a7a9a, hand: 0xe8f4ff, hat: 'tophat', traits: ['book', 'scarf', 'glasses'], size: 1.3, eye: 0xc8e8ff },
            challenge: [
              'I assess. Breath fogs the glass, the fog is assessed. If a little of the fog is mine, who is to say?',
              'The Prince pays me by the reading. Higher readings, happier Prince. Step away from my glass.',
            ],
            beaten: ['All right! I breathed on it! A little! Every morning! It\'s very cold up here and the glass was warm.'],
            coins: 100,
          },
        },
        hint: 'Frost-Assessor Rime is at the meter-house — catch him at his glass',
      },
    ],
    complete: [
      'My true reading. Half what I\'ve been paying. HALF. I\'ve been breathing for that man for three years.',
      'The lanterns are lit and so am I. Take this — and if you see me running up a ladder, that\'s just for joy.',
    ],
    reward: { orbs: 5, coins: 80 },
  },
  {
    id: 'starfall-nova',
    area: 'starfall',
    name: 'Put Out the Evening Star',
    giver: 'starfall-keel',
    requires: { courtReady: 'starfall' },
    offer: [
      'Every champion on the summit beaten. The Ledger\'s quiet. The Prince hasn\'t inked a star in three nights.',
      'He keeps his tower on the north-west spur. He\'ll be at his chart, counting what he\'s lost.',
      'Put him out. If the Evening Star sets, nobody on this rock gets snuffed again. Not by him.',
    ],
    accept: ['He starts small and bright. Then he gets very big. Watch his lines — and then watch your feet.'],
    stages: [
      { objective: { kind: 'prince', prince: 'nova' }, hint: 'Defeat Prince Nova at the Zenith Tower on the north-west spur' },
      {
        objective: {
          kind: 'duel', area: 'starfall',
          foe: {
            id: 'starfall-nova-duel',
            court: 'starfall',
            name: 'Corked',
            foeName: 'Bottler-General Corkwell',
            foeElement: 'air',
            difficulty: 5,
            hpMult: 1.15,
            gimmick: '',
            at: { x: CX, y: 340 },
            look: { body: 0x5a6a62, accent: 0x1f3a32, hand: 0x9ad6c6, hat: 'helmet', traits: ['pack', 'mask', 'tool'], size: 1.35, eye: 0x9ad6c6 },
            challenge: [
              'Down from the Lung, by His Majesty\'s order. A summit that puts out its prince breathes far too much.',
              'Every chest on this hill is getting corked tonight. Starting with the one in front of me.',
            ],
            beaten: ['My crates... empty. My corks... everywhere. The King will hear of this. Well. He\'ll hear me wheezing it.'],
            coins: 100,
          },
        },
        hint: 'Bottler-General Corkwell has come down the Last Stair to cork the summit — stop him',
      },
    ],
    complete: [
      'The Evening Star is set and Corkwell\'s crates are rolling down the Cloudstair, empty. Listen to them clatter.',
      'One cork on the Lung\'s door has popped. His. Take this — all of it. I\'ve nothing to spend it on but lamp-oil.',
      'Five more of the King\'s children to go. When all six corks pop, the Lung will open. I\'ll be here.',
    ],
    reward: { orbs: 9, coins: 200 },
  },
];
