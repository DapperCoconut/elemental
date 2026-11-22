import type { QuestDef } from '../../../../IslesTypes';
import { TAPPED, TOY_BOX } from './area';
import { CHARM_GASBAG, FISH_BASS } from './items';

/**
 * The Bounce Court's five side quests.
 *
 * Between them they show how the rubber town pays the Draw and what it costs: a snapped skein and
 * a house one strike from the Toy Box (Nan), a balloon post to a mother cranking in the Galleries
 * (Tilly), hot supper for the switched-off cooked on the only licensed fire (Dr Plimsoll), the
 * children's confiscated balls (Nibs), and at last the truth about the key in the Prince's back
 * (Marguerite). Each is somebody refusing to be wound up.
 */
export const BOUNCE_QUESTS: QuestDef[] = [
  // ── 1. A Skein Short — collect + talk + duel ─────────────────────────
  {
    id: 'bounce-q-skein',
    area: 'bounce',
    name: 'A Skein Short',
    giver: 'bounce-nan',
    offer: [
      'Our skein snapped in the night. Two strikes on our door already. A third at the Bell and it\'s the Box.',
      'Hevea can splice it, she says, if she has fresh milk — warm off the tree, not from the works\' drums.',
      'The tapped trees by the latex pool. Four cups. Would you? My knees don\'t do the plantation any more.',
    ],
    accept: [
      'Bless you. Mind you take only the full cups — the tappers have to make their weight as well.',
    ],
    stages: [
      {
        objective: {
          kind: 'collect', area: 'bounce', label: 'A cup of fresh latex', emoji: '🥛', color: 0xf2ead2,
          spots: TAPPED,
        },
        hint: 'Take 4 full latex cups from the tapped trees by the latex pool',
      },
      {
        objective: {
          kind: 'talk', npc: 'bounce-hevea',
          lines: [
            'Warm milk, four cups. Good. Hold the ends while I wrap — twelve turns, hot, and she\'ll hold.',
            'There. Better than new. Run it up to Nan\'s attic, they\'ve still time to wind it to the mark.',
            '…Ah. Don\'t look now. That\'s the Meter-Reader going up Crank Row, and he has his book out.',
            'A splice is "tampering with a Grid motor". He\'ll write them down for a strike. Unless he can\'t.',
          ],
        },
        hint: 'Bring the cups to Hevea Coombs on the plantation walk to splice the skein',
      },
      {
        objective: {
          kind: 'duel', area: 'bounce',
          foe: {
            id: 'bounce-q-skein-duel',
            court: 'bounce',
            name: 'Tampering with a Grid Motor',
            foeName: 'Meter-Reader Ohmsworth Tally',
            foeElement: 'technology',
            difficulty: 3,
            hpMult: 0.95,
            gimmick: '',
            at: { x: 1700, y: 1440 },
            look: { body: 0xc8b8a4, accent: 0xc87a3a, hat: 'antenna', traits: ['book', 'glasses', 'satchel'], size: 1.05, eye: 0x9adcff },
            challenge: [
              'Number Four, Crank Row. Skein spliced without a permit. That\'s tampering. That\'s a strike.',
              'Three strikes is the Box. I don\'t make the rules. I only read the meters, and the meters never lie.',
              'Stand aside. I have my book, and my pencil, and I am going to write.',
            ],
            beaten: ['…The pencil\'s broken. I seem to have broken it. I\'ll have to write them up next month.'],
            coins: 90,
          },
        },
        hint: 'Stop Meter-Reader Ohmsworth Tally on Crank Row before he writes the Lattimers up',
      },
    ],
    complete: [
      'Wound to the mark by the Bell! The lever went, and our lights stayed on. Tobias cried. I cried.',
      'Two strikes. Two, not three. Here — the rainy-day tin. It was for the day the Box came. It didn\'t.',
    ],
    reward: { orbs: 8, coins: 90 },
  },

  // ── 2. The Balloon Post — talk + collect + duel ──────────────────────
  {
    id: 'bounce-q-balloon-post',
    area: 'bounce',
    name: 'The Balloon Post',
    giver: 'bounce-tilly',
    offer: [
      'My mum got put away. She\'s up the Crown Coil cranking. I wrote her a letter on a balloon. In crayon.',
      'The wind goes up the Coil tonight. But I need the gas. Mr Loft has gas. He won\'t give it to a kid.',
      'He might give it to you. You look like you could get gas off anyone.',
    ],
    accept: [
      'Mr Loft\'s the big shop with the red stripes. Tell him it\'s for Tilly. He knows my cats.',
    ],
    stages: [
      {
        objective: {
          kind: 'talk', npc: 'bounce-fennimore',
          lines: [
            'For Tilly? Party balloons are litter, friend. The Linemen shoot litter off the wires for practice.',
            '…Oh, hang it. Here\'s the gas. But you\'ll need the old bags to patch — the good rubber.',
            'Three of my floats blew off the Row in last night\'s storm. They\'re snagged on the pylons. Fetch them.',
          ],
        },
        hint: 'Ask Fennimore Loft on Gasbag Row for the gas',
      },
      {
        objective: {
          kind: 'collect', area: 'bounce', label: 'A snagged gasbag', emoji: '🎈', color: 0xe0403a,
          spots: [{ x: 1800, y: 930 }, { x: 1430, y: 950 }, { x: 1120, y: 1120 }],
        },
        hint: 'Pull down 3 gasbags snagged on the pylons over Main Street and the South Lane',
      },
      {
        objective: {
          kind: 'duel', area: 'bounce',
          foe: {
            id: 'bounce-q-balloon-post-duel',
            court: 'bounce',
            name: 'Litter on the Wires',
            foeName: 'Lineman Crackett Spool',
            foeElement: 'electricity',
            difficulty: 4,
            hpMult: 0.95,
            gimmick: 'bounce-balloon-works',
            at: { x: 1560, y: 1095 },
            look: { body: 0xb8a48e, accent: 0xc87a3a, hat: 'helmet', traits: ['tool', 'pack'], size: 1.15, eye: 0xdff4ff },
            challenge: [
              'Those are Grid floats you\'ve got there. Off the wires. That makes them salvage, and salvage is ours.',
              'A float that\'s not on a cable is litter. Litter I shoot. I\'ve never missed a balloon.',
              'Put them down, or I\'ll show you what a spark does to a gasbag.',
            ],
            beaten: ['…I missed. I never miss. Go on, then. I didn\'t see anything go up. Nobody looks up here.'],
            coins: 90,
          },
        },
        hint: 'See off Lineman Crackett Spool on Gasbag Row',
      },
    ],
    complete: [
      'It\'s going UP! Right up! Past the pylons, past the Toy Works, into the clouds — up the Coil!',
      'Mr Loft says you can have this. He says it\'s for being brave at the doctor\'s. I said you were braver.',
    ],
    reward: { orbs: 8, coins: 60, item: CHARM_GASBAG, itemCount: 1 },
  },

  // ── 3. Supper for the Switched-Off — fish + deliver + duel ───────────
  {
    id: 'bounce-q-warm-supper',
    area: 'bounce',
    name: 'Supper for the Switched-Off',
    giver: 'bounce-plimsoll',
    offer: [
      'Half of Crank Row is switched off. No heat, no stove. They\'re not ill, they\'re cold, and they\'re starving.',
      'Ma Gussie cooks on the curing fire at the works\' back door. Licensed for the Grid. Not for soup.',
      'Bring her two bounce bass from the latex pool and she\'ll do a pot for the Row. I\'ll carry it myself.',
    ],
    accept: [
      'The bass live deep in the latex. Strong rod, steady hands. They come up with a boing.',
    ],
    stages: [
      {
        objective: { kind: 'fish', fish: FISH_BASS, count: 2 },
        hint: 'Catch 2 bounce bass in the latex pool',
      },
      {
        objective: {
          kind: 'deliver', npc: 'bounce-gussie', item: FISH_BASS, count: 2,
          lines: [
            'Two bass, fat as pillows. For the Row? Course it is. Pot\'s on. Potatoes, bass, a bit of sulphur. Joking.',
            'Oh — get behind the racks, pet. That sniffing at the gate. That\'s the Flame-Finder, nose first.',
            'He smells a cookpot on licensed fire, he\'ll call it theft and take the fire AND the pot. Go on, stop him.',
          ],
        },
        hint: 'Bring the 2 bass to Ma Gussie at the vulcanizing works\' back door',
      },
      {
        objective: {
          kind: 'duel', area: 'bounce',
          foe: {
            id: 'bounce-q-warm-supper-duel',
            court: 'bounce',
            name: 'Unlicensed Stew',
            foeName: 'Flame-Finder Ashby Snuff',
            foeElement: 'fire',
            difficulty: 4,
            hpMult: 0.95,
            gimmick: 'bounce-vulcanize',
            at: { x: 470, y: 670 },
            look: { body: 0xd0bca4, accent: 0x3a3e46, hat: 'tophat', traits: ['lantern', 'cane', 'mask'], size: 1.1, eye: 0xf08a2a },
            challenge: [
              'I smell it. Onion. Bass. A flame turned to a private use. Every flame on Voltreach belongs to the Grid.',
              'I keep the confiscated ones in jars on my belt. Lovely little things. They\'d like company.',
              'Step out of the yard. I\'ll snuff that pot, and anything standing between me and it.',
            ],
            beaten: ['…My jars. You\'ve let my jars out. Oh, they\'re everywhere. Oh, they\'re warm. Oh dear.'],
            coins: 90,
          },
        },
        hint: 'Drive Flame-Finder Ashby Snuff out of the works yard',
      },
    ],
    complete: [
      'Twenty-two bowls down Crank Row, and the Moffats\' little girl asked for seconds. SECONDS.',
      'Warm food. That\'s the whole prescription, and I can\'t write it. Take my fee. I haven\'t earned it; you have.',
    ],
    reward: { orbs: 9, coins: 110 },
  },

  // ── 4. Confiscated — collect + defeat ────────────────────────────────
  {
    id: 'bounce-q-confiscated',
    area: 'bounce',
    name: 'Confiscated',
    giver: 'bounce-nibs',
    offer: [
      'Ricochet took every ball off the Ball Court. Play is by licence. The licence is a turn of your skein.',
      'Kids from switched-off houses can\'t pay a turn. So we don\'t play. That\'s the rule. It\'s a stupid rule.',
      'He threw the extras where we can\'t get them. On the wires. In gutters. Get them, and then tell him. Please.',
    ],
    accept: [
      'Four balls. One in the works yard, one up Key Street, one on the plantation, one by the square. I think.',
    ],
    stages: [
      {
        objective: {
          kind: 'collect', area: 'bounce', label: 'A confiscated ball', emoji: '🔴', color: 0xe0403a,
          spots: [{ x: 1080, y: 470 }, { x: 2060, y: 560 }, { x: 600, y: 1480 }, { x: 1470, y: 760 }],
        },
        hint: 'Find the 4 balls Ricochet threw away round the town',
      },
      {
        objective: { kind: 'defeat', encounter: 'bounce-superball' },
        hint: 'Tell Pitcher Ricochet (Superball) at the Ball Court — in the only language he takes',
      },
    ],
    complete: [
      'We played a match. A real one! Two hours, no licence, and nobody got put in the Box for it.',
      'Ricochet came and watched from the wall. Here — the team saved this up. It was for a new ball. We don\'t need one.',
    ],
    reward: { orbs: 7, coins: 70 },
  },

  // ── 5. Wound Down — talk + visit + prince ────────────────────────────
  {
    id: 'bounce-q-wound-down',
    area: 'bounce',
    name: 'Wound Down',
    giver: 'bounce-marguerite',
    requires: { courtReady: 'bounce' },
    offer: [
      'All five of his playmates beaten. His Highness is bouncing so fast in there the floorboards are splitting.',
      'Before you go in, talk to old Hobb on the North Road. He built the key in the Prince\'s back. Ask him why.',
      'And stand by the Toy Box. Everyone in this town has looked into it once. You should too.',
    ],
    accept: [
      'Hobb first, then the Box. Then the Works. I\'ll do his morning winding early. He\'ll want to be tight.',
    ],
    stages: [
      {
        objective: {
          kind: 'talk', npc: 'bounce-hobb',
          lines: [
            'The key. Yes. Her Majesty brought me the boy when he was four. He wouldn\'t sit still. She hated that.',
            'She said: make him a toy\'s back, with a key, and tell him toys that run down are put away.',
            'So I did. The key turns. It turns nothing. There is no spring behind it. There never was.',
            'He has bounced for twelve years so as not to run down. He was never wound. He was only frightened.',
          ],
        },
        hint: 'Ask Escapement Hobb on the North Road about the key in the Prince\'s back',
      },
      {
        objective: { kind: 'visit', area: 'bounce', at: { x: TOY_BOX.x, y: TOY_BOX.y + 50 }, r: 80, label: 'The Toy Box' },
        hint: 'Stand by the Toy Box beside the Toy Works',
      },
      {
        objective: { kind: 'prince', prince: 'sprocket' },
        hint: 'Face Prince Sprocket at the Toy Works',
      },
    ],
    complete: [
      'He\'s sitting on the step. Just sitting. He asked me to take the key out, and then he asked Hobb.',
      'He hasn\'t bounced in an hour. He keeps checking he hasn\'t run down. He hasn\'t. He\'s just still.',
      'Take the winder\'s purse. I shan\'t need it. Nobody in this town needs winding now.',
    ],
    reward: { orbs: 11, coins: 180 },
  },
];
