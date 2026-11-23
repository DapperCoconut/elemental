import type { QuestDef } from '../../../../IslesTypes';
import { ASTRO, BRIDGES, CUT, HOUR_CART } from './area';
import { FISH_EEL, FISH_MINNOW } from './items';

/**
 * The Clockwork Court's five side quests.
 *
 * Between them they show how the hours are taken: the slip and the window (Hettie), the oil that
 * keeps the Row's clocks honest (Gus), the great clock's thirteenth stroke that rings the week's
 * hours up the tube (Wren), the drawn children swung as counterweights (Wick), and finally where
 * all those hours go — the Regulator, and the boy who wears them (Marguerite).
 */
export const CLOCKWORK_QUESTS: QuestDef[] = [
  // ── 1. An Afternoon in the Queue — talk + collect + duel ─────────────
  {
    id: 'clockwork-q-afternoon',
    area: 'clockwork',
    name: 'An Afternoon in the Queue',
    giver: 'clockwork-hettie',
    offer: [
      'Lot four-four-seven-one. Four hours due tomorrow — the afternoon. Posy\'s seventh birthday afternoon.',
      'I\'ve missed two of her birthdays already, sat on that bench with my eyes shut, being paid.',
      'I can\'t pay twice. I can\'t buy a re-draw — nobody wins at the House. But Ida at the fourth window…',
      'Ida knows how the slips work. Will you ask her? Quietly. The Collector walks the queue.',
    ],
    accept: ['Fourth window. Green visor. Tell her Hettie sent you. Tell her it\'s for Posy.'],
    stages: [
      {
        objective: {
          kind: 'talk', npc: 'clockwork-ida',
          lines: [
            'Larkwell. Four-four-seven-one. Four hours. I have the ledger open. I can\'t close it. I\'m a clerk.',
            'But. A slip is posted three ways: on the board, on the cart, and in the hopper at the tube\'s foot.',
            'No slip, no collection. That is the rule. The rule was written by someone who never lost a slip.',
            'I didn\'t say any of that. I stamped something. Good afternoon.',
          ],
        },
        hint: 'Ask Ida Quarterly at the fourth window of the Hour Office',
      },
      {
        objective: {
          kind: 'collect', area: 'clockwork', label: 'Hettie\'s hour-slip', emoji: '🧾', color: 0xf4ecd8,
          spots: [{ x: 1690, y: 684 }, { x: HOUR_CART.x, y: HOUR_CART.y + 36 }, { x: 2196, y: 560 }],
        },
        hint: 'Lift Hettie\'s 3 hour-slips: the board, the cart of paid hours and the hopper at the tube\'s foot',
      },
      {
        objective: {
          kind: 'duel', area: 'clockwork',
          foe: {
            id: 'clockwork-q-afternoon-duel',
            court: 'clockwork',
            name: 'Hours Due',
            foeName: 'Collector Ledgerwind',
            foeElement: 'sand',
            difficulty: 4,
            hpMult: 0.95,
            gimmick: '',
            at: { x: 1900, y: 690 },
            look: { body: 0xa8a8a0, accent: 0x3a3a40, hat: 'tophat', traits: ['book', 'glasses'], size: 1.15, eye: 0xd8d8d0 },
            challenge: [
              'Three slips missing for one Lot. One is an accident. Three is a person. You are the person.',
              'Hours owed are hours owed. If Larkwell can\'t pay, the Office takes them off whoever stood in her way.',
              'Hold still. This won\'t take more than an afternoon.',
            ],
            beaten: ['…No slip, no collection. That is the rule. I hate the rule. I wrote the rule.'],
            coins: 110,
          },
        },
        hint: 'Face Collector Ledgerwind by the queue rail',
      },
    ],
    complete: [
      'No slip, no collection! Ida wrote "mislaid" in the ledger! In INK!',
      'I\'ll be there. Every hour of it. Here — it was the money for the re-draw. I won\'t need it now.',
    ],
    reward: { orbs: 10, coins: 120 },
  },

  // ── 2. Oil for Number Four — fish + deliver + duel ───────────────────
  {
    id: 'clockwork-q-oil',
    area: 'clockwork',
    name: 'Oil for Number Four',
    giver: 'clockwork-gus',
    offer: [
      'Old Ottilie at number four, Cuckoo Row. Her gable clock\'s dry. Losing a minute a day.',
      'A minute slow on the Row is an hour fined. She\'s paid three hundred hours this year, and she\'s no time left.',
      'Clock oil\'s sold by the hour at the Oil Office. But an escapement eel\'s full of it. The best there is.',
      'Catch me two out of the sump. Take them to her. Don\'t let Gallon see you carry them.',
    ],
    accept: ['Iron rod or better. They swim in jerks, tick, tick. Keep them in the bar and don\'t let go.'],
    stages: [
      {
        objective: { kind: 'fish', fish: FISH_EEL, count: 2 },
        hint: 'Catch 2 escapement eels in the oil sump',
      },
      {
        objective: {
          kind: 'deliver', npc: 'clockwork-pennywhistle', item: FISH_EEL, count: 2,
          lines: [
            'Eels! Oh, look at the shine on them. Gus sent you? Of course. He used to carry my shopping.',
            'One drop on the pallets, one on the pivots — listen! Listen to her! She\'s caught up already!',
            'Oh dear. That\'s Gallon. The Oil-Warden. He smells unlicensed oil like a dog smells sausages.',
          ],
        },
        hint: 'Bring the 2 eels to Ottilie Pennywhistle at No. 4, Cuckoo Row',
      },
      {
        objective: {
          kind: 'duel', area: 'clockwork',
          foe: {
            id: 'clockwork-q-oil-duel',
            court: 'clockwork',
            name: 'Unlicensed Oil',
            foeName: 'Oil-Warden Gallon',
            foeElement: 'oil',
            difficulty: 5,
            hpMult: 0.95,
            gimmick: 'clockwork-cogwork',
            at: { x: 2160, y: 1410 },
            look: { body: 0xc0a080, accent: 0x15120f, hat: 'souwester', traits: ['satchel', 'glasses'], size: 1.2, eye: 0x6a4aa8 },
            challenge: [
              'Every drop of oil on this hill is an hour to the Office. A clock oiled free is a clock oiled from theft.',
              'Two eels, unlicensed, on a gable. That\'s an hour a drop, madam. I\'ve counted the drops.',
              'You, stranger. You smell of sump. Come and stand on the gears and let\'s see you keep your footing.',
            ],
            beaten: ['…Fine. One clock. One. If the whole Row comes for eels, I\'ll — I\'ll write it down.'],
            coins: 110,
          },
        },
        hint: 'See off Oil-Warden Gallon on Cuckoo Row',
      },
    ],
    complete: [
      'Ottilie\'s clock is keeping the Regulator\'s time to the second. She stood in the lane and cried at it.',
      'Here — have a pail of minnows too. They\'re not counted. They\'re too small to count. Like us.',
    ],
    reward: { orbs: 11, coins: 100, item: FISH_MINNOW, itemCount: 3 },
  },

  // ── 3. The Thirteenth Stroke — collect + visit + duel ────────────────
  {
    id: 'clockwork-q-thirteenth',
    area: 'clockwork',
    name: 'The Thirteenth Stroke',
    giver: 'clockwork-wren',
    offer: [
      'The great clock strikes thirteen on Draw day. The thirteenth is the hour-bell — it rings the hours up the tube.',
      'Every hour owed that week, all at once, up to the Regulator. You can feel it go out of you. In your teeth.',
      'I can\'t stop the gearing. Reprise would know. But a bell with felt in its mouth doesn\'t ring.',
      'Bring me three pieces of baize — the card-folk\'s green felt, thick — and I\'ll wedge the clapper.',
    ],
    accept: ['The lawns round the court. Folk leave old table-cloth on the benches. Thick ones. Green.'],
    stages: [
      {
        objective: {
          kind: 'collect', area: 'clockwork', label: 'A square of green baize', emoji: '🟩', color: 0x2f6b3f,
          spots: [{ x: 880, y: 852 }, { x: 1480, y: 1480 }, { x: 1080, y: 470 }],
        },
        hint: 'Gather 3 squares of green baize left on the court\'s lawns',
      },
      {
        objective: { kind: 'visit', area: 'clockwork', at: { x: ASTRO.x, y: ASTRO.y + 40 }, r: 80, label: 'The great clock\'s door' },
        hint: 'Climb to the bell with Wren: go to the great clock\'s door',
      },
      {
        objective: {
          kind: 'duel', area: 'clockwork',
          foe: {
            id: 'clockwork-q-thirteenth-duel',
            court: 'clockwork',
            name: 'The Bell Must Ring',
            foeName: 'Bellfounder Clangor',
            foeElement: 'metal',
            difficulty: 5,
            gimmick: '',
            at: { x: 1440, y: 770 },
            look: { body: 0xc89a78, accent: 0x7a5a22, hat: 'helmet', traits: ['tool', 'apron', 'beard'], size: 1.35, eye: 0xf0d58a },
            challenge: [
              'I cast that bell. Eight ton of bronze. Its voice carries to the House and the King hears it every Draw.',
              'Felt. FELT. In my bell. The girl I can forgive. She\'s twelve. You I\'ll ring like a clapper.',
              'Stand still and I\'ll hammer you in tune.',
            ],
            beaten: ['…Thup. My bell goes "thup." Forty years. Go away and let me hear it in peace.'],
            coins: 110,
          },
        },
        hint: 'Stand up to Bellfounder Clangor at the foot of the great clock',
      },
    ],
    complete: [
      'The Draw came. Twelve strokes, and then… thup. The tube never even rattled. Not one hour went up.',
      'They\'ll fix it. But one week — one whole week, nobody on the hill paid an hour. Take this. I\'d saved it.',
    ],
    reward: { orbs: 12, coins: 110 },
  },

  // ── 4. Counterweights — collect + defeat ─────────────────────────────
  {
    id: 'clockwork-q-counterweights',
    area: 'clockwork',
    name: 'Counterweights',
    giver: 'clockwork-wick',
    offer: [
      'My nephew Jory\'s on the bobs. Tied to the gantry rods as a counterweight, with two other boys.',
      'Bob books it as hours paid — an hour a swing. They swing all day. Jory\'s eleven and he\'s got grey hair.',
      'The tethers are knotted on the gantries, both bridges. Cut them and the boys drop on the bank.',
      'Bob will come for whoever did it. I can\'t fight him. I\'m thirty-one. Look at me.',
    ],
    accept: ['Both bridges. The south bank and the north. Three tethers. Cut them all and get clear.'],
    stages: [
      {
        objective: {
          kind: 'collect', area: 'clockwork', label: 'Counterweight tether', emoji: '🪢', color: 0xc9a04a,
          spots: [{ x: BRIDGES[0], y: CUT.y + CUT.h + 50 }, { x: BRIDGES[1], y: CUT.y + CUT.h + 50 }, { x: BRIDGES[0] + 14, y: CUT.y - 50 }],
        },
        hint: 'Cut the 3 counterweight tethers at the pendulum gantries over the Escapement Cut',
      },
      {
        objective: { kind: 'defeat', encounter: 'clockwork-pendulum' },
        hint: 'Face Swinger Bob (Pendulum) on the road under the gantries',
      },
    ],
    complete: [
      'Jory\'s home. He walked in and sat down and ate four bowls of soup and fell asleep in the fourth.',
      'His hair will stay grey, they say. He doesn\'t mind. He says he looks like a sea captain. Take this.',
    ],
    reward: { orbs: 9, coins: 100 },
  },

  // ── 5. The Regulator — talk + visit + prince ─────────────────────────
  {
    id: 'clockwork-q-regulator',
    area: 'clockwork',
    name: 'The Regulator',
    giver: 'clockwork-fusee',
    requires: { courtReady: 'clockwork' },
    offer: [
      'All five. The Prince will have felt every one of them in his spring. He will be counting the seconds.',
      'Before you go in, ask the clerk where the hours go. Not the rule. Where they actually go.',
      'Then go and look at what the hours look like, on the cart. And then go and see him.',
    ],
    accept: ['Ida at the fourth window. The cart. Then the Regulator. He will be expecting you to be punctual.'],
    stages: [
      {
        objective: {
          kind: 'talk', npc: 'clockwork-ida',
          lines: [
            'Where do they go? Up the tube. To the Regulator. To the spring at the heart of the great case.',
            'He winds himself on them. Every Draw. That\'s why he never ages. We all know. We stamp it anyway.',
            'Once, a vial came back down the tube. Mine, from when I was twenty. I drank it. I remembered a picnic.',
          ],
        },
        hint: 'Ask Ida Quarterly where the paid hours really go',
      },
      {
        objective: { kind: 'visit', area: 'clockwork', at: { x: HOUR_CART.x, y: HOUR_CART.y + 40 }, r: 70, label: 'The cart of paid hours' },
        hint: 'Look at the cart of paid hours outside the Hour Office',
      },
      {
        objective: { kind: 'prince', prince: 'tock' },
        hint: 'Face Prince Tock at the Regulator',
      },
    ],
    complete: [
      'He has let the spring run down. You can hear it from here: the Regulator ticking like an ordinary clock.',
      'He asked me to wind his watch for him. Just a watch. I have not been asked that since he was eight.',
      'Take what was in the hopper. He said to give it to whoever made him late.',
    ],
    reward: { orbs: 13, coins: 220 },
  },
];
