import type { QuestDef } from '../../../../IslesTypes';
import { HALL, MILL, STONE_AT, TABLES } from './area';
import { FISH_ANGLER, FISH_SOLE } from './items';
import { Q_LAST, Q_MARKED, Q_NAME, Q_READING, Q_REDRAW } from './npcs';

/**
 * The Card Court's five side quests.
 *
 * The first court on Lotterhaven, so between them they show how the isle's tyranny works: that the
 * decks are marked (Ninian), what being busted costs (Forty-One), who reads the House's fortunes
 * (Querida), what a re-draw is and why nobody wins one (Dorrit), and finally who the Prince was
 * before he was the Prince (Nan Clubb). Each one is somebody proving the game is rigged.
 */
export const CARD_QUESTS: QuestDef[] = [
  // ── 1. The Marked Deck — collect + talk + duel ───────────────────────
  {
    id: Q_MARKED,
    area: 'card',
    name: 'The Marked Deck',
    giver: 'card-ninian',
    offer: [
      'Every deck I print has a nick in the lattice. Every fourth diamond. From the House\'s own plate.',
      'If the Hall\'s sharps can read it, then every hand dealt in this court is read before it\'s played.',
      'I need proof that isn\'t mine. Take a card from each table on the Rail — from their own decks.',
      'If they\'re marked out there, in a game I never touched, then it isn\'t my press. It\'s theirs.',
    ],
    accept: [
      'Four tables on the lawn before the mill. Palm one card from each. Nobody watches the deck. Only the hands.',
    ],
    stages: [
      {
        objective: {
          kind: 'collect', area: 'card', label: 'A card from the Rail', emoji: '🃏', color: 0xc9202f,
          spots: TABLES.map((t) => ({ x: t.x, y: t.y + 26 })),
        },
        hint: 'Palm a card from each of the 4 tables on the Rail, before the Shuffling Mill',
      },
      {
        objective: {
          kind: 'talk', npc: 'card-corvina',
          lines: [
            'Four cards. Let me see. Under the lamp — no, closer. The top left of the lattice… there.',
            'And there. And there. Every fourth diamond, a nick you could catch a fingernail in.',
            'I\'ve sold these for twenty years. Oh, the Deck-Marshal\'s in the door. He\'ll want those back.',
          ],
        },
        hint: 'Show the cards to Corvina Sleeve at Sleeve & Deck',
      },
      {
        objective: {
          kind: 'duel', area: 'card',
          foe: {
            id: 'card-q-marked-deck-duel',
            court: 'card',
            name: 'Every Fourth Diamond',
            foeName: 'Deck-Marshal Vane Marquetry',
            foeElement: 'subterfuge',
            difficulty: 4,
            hpMult: 0.95,
            gimmick: 'card-cut-the-deck',
            at: { x: 900, y: 520 },
            look: { body: 0xd0bca4, accent: 0x26242c, hat: 'tophat', traits: ['cane', 'glasses'], size: 1.1, eye: 0xd8a636 },
            challenge: [
              'Four cards off the Rail. Palmed. That\'s a cheat, friend, and cheats are the House\'s to deal with.',
              'A nick? A flaw in the plate. Nobody can read a flaw. I certainly can\'t. Hand them over.',
              'We\'ll cut for them. I\'ll know what\'s on top. That\'s not cheating. That\'s the Marshal\'s office.',
            ],
            beaten: ['…Keep them, then. Show whoever you like. Nobody believes a card. They believe the House.'],
            coins: 100,
          },
        },
        hint: 'Face Deck-Marshal Vane Marquetry on the Rail',
      },
    ],
    complete: [
      'Proof. Out of their own decks, off their own tables. Anyone can see it, now they know where to look.',
      'I\'m cutting a new back plate tonight. Plain. Take this — it\'s the last of the House\'s fee. Spend it badly.',
    ],
    reward: { orbs: 10, coins: 90 },
  },

  // ── 2. No Name Spoken — collect + talk + duel ────────────────────────
  {
    id: Q_NAME,
    area: 'card',
    name: 'No Name Spoken',
    giver: 'card-forty-one',
    offer: [
      'When they bust you, they snap your Lot on the step. Two halves. They throw them away like nothing.',
      'My mother scratched something on the back of mine. I was a baby. I never read it. I never thought to.',
      'Eleven years I\'ve been Forty-One. I\'d like to know what she called me. I can\'t go and look. You can.',
    ],
    accept: [
      'One half in the Hall\'s sweepings, by the step. One in the gutter on Deuce Row. Please. Quickly.',
    ],
    stages: [
      {
        objective: {
          kind: 'collect', area: 'card', label: 'Half a snapped Lot', emoji: '🪙', color: 0xb8903e,
          spots: [{ x: HALL.x - 120, y: HALL.y + 60 }, { x: 300, y: 1346 }],
        },
        hint: 'Find the two halves of Forty-One\'s Lot: by the Dealing Hall\'s step, and in the Deuce Row gutter',
      },
      {
        objective: {
          kind: 'talk', npc: 'card-bertil',
          lines: [
            'Two halves of a Lot. Busted, by the snap. Let me get my glass on it. The number\'s stamped — 3-1-1-7.',
            'And the back… someone scratched it with a pin. A mother, by the hand. A-U-B… Aubrey. Aubrey Kettle.',
            'Mind — that\'s the Chip-Warden coming. The busted aren\'t to be named. It\'s his whole job.',
          ],
        },
        hint: 'Take the halves to Bertil Weight on Deuce Row — he has a glass for reading stamps',
      },
      {
        objective: {
          kind: 'duel', area: 'card',
          foe: {
            id: 'card-q-no-name-duel',
            court: 'card',
            name: 'Numbers Only',
            foeName: 'Chip-Warden Obol Hush',
            foeElement: 'shadow',
            difficulty: 4,
            hpMult: 0.95,
            gimmick: '',
            at: { x: 1440, y: 612 },
            look: { body: 0xb8a8a0, accent: 0x121216, hat: 'cowl', traits: ['lantern'], size: 1.15, eye: 0x9a9aa0 },
            challenge: [
              'A busted Lot is the House\'s scrap. Picking it up is theft. Reading it is worse.',
              'Forty-One has a number. A number is enough for a croupier. A name gives them ideas.',
              'Give me the halves, and forget what the weight-maker read. I\'m very good at forgetting.',
            ],
            beaten: ['…Say it to him, then. It\'s only a name. It\'s never only a name. Go on.'],
            coins: 100,
          },
        },
        hint: 'See off Chip-Warden Obol Hush by the Dealing Hall',
      },
    ],
    complete: [
      'Aubrey. Aubrey Kettle. Say it again? …Aubrey Kettle. That\'s me. That\'s who I was before the step.',
      'I haven\'t much. Croupiers keep tips in their shoes. Here. It smells of shoe. It\'s yours.',
    ],
    reward: { orbs: 11, coins: 80 },
  },

  // ── 3. A Reading in Scales — fish + deliver + defeat ─────────────────
  {
    id: Q_READING,
    area: 'card',
    name: 'A Reading in Scales',
    giver: 'card-querida',
    offer: [
      'The Seer took my Major Arcana. Twenty-two cards, my grandmother\'s. She reads for the House with them.',
      'She tells the drawn they were always going to be drawn. It goes down easier, coming from a Tower.',
      'I can\'t read without something to read. The spade soles in the baize pond — their backs are lattice.',
      'Catch me two. I\'ll read in their scales, and I\'ll tell you how to get my cards back.',
    ],
    accept: [
      'Cast from the stone kerb. Soles lie flat on the bottom. Be patient with them — they are patient with you.',
    ],
    stages: [
      {
        objective: { kind: 'fish', fish: FISH_SOLE, count: 2 },
        hint: 'Catch 2 spade soles in the baize pond',
      },
      {
        objective: {
          kind: 'deliver', npc: 'card-querida', item: FISH_SOLE, count: 2,
          lines: [
            'Two soles. Lay them there, on the cloth. Let me look. …The lattice runs crooked. Here, and here.',
            'The Seer never shows the Star twice in the same place. She shuffles three times, and she watches your eyes.',
            'Watch the card, not her hands, and you\'ll beat her. She keeps my deck in her sleeve. Win it back.',
          ],
        },
        hint: 'Bring the 2 spade soles to Madame Querida at the tents',
      },
      {
        objective: { kind: 'defeat', encounter: 'card-tarot' },
        hint: 'Beat Seer Arcana (Tarot) among the tents and win back Querida\'s deck',
      },
    ],
    complete: [
      'My Arcana! Every card, even the Fool. The Tower is creased. I shall keep the crease. It\'s honest.',
      'Here — an angler I caught the honest way, and a little coin. I read that you\'d need both.',
    ],
    reward: { orbs: 9, coins: 60, item: FISH_ANGLER, itemCount: 1 },
  },

  // ── 4. A Re-Draw — talk + collect + duel ─────────────────────────────
  {
    id: Q_REDRAW,
    area: 'card',
    name: 'A Re-Draw',
    giver: 'card-dorrit',
    offer: [
      'Hal\'s number was called for the War Court. I\'ve bought a re-draw. Everything we own, on one hand.',
      'The deck for a re-draw comes out of the Shuffling Mill sealed, in a red-banded crate. Special order.',
      'Special. Why would a fair shuffle need a special order? Spindle Harrow runs the drums. Ask him.',
    ],
    accept: [
      'Spindle\'s by the treadwheel. He\'s a decent man. He\'s been there forty years. He must have seen.',
    ],
    stages: [
      {
        objective: {
          kind: 'talk', npc: 'card-spindle',
          lines: [
            'Red bands. Aye. Those come off the left drum after I\'ve gone home. The Mill-Master runs them himself.',
            'There\'s a cam on the left drum. I always thought it was for balance. It isn\'t, is it.',
            'Three red-banded decks went out to the crates today. Swap them for plain ones off the belt. I\'ll not see you.',
          ],
        },
        hint: 'Ask Spindle Harrow at the Shuffling Mill how the re-draw decks are shuffled',
      },
      {
        objective: {
          kind: 'collect', area: 'card', label: 'Red-banded deck', emoji: '🟥', color: 0xc9202f,
          spots: [{ x: MILL.x + 190, y: MILL.y + 28 }, { x: MILL.x + 100, y: MILL.y + 34 }, { x: MILL.x - 60, y: MILL.y + 40 }],
        },
        hint: 'Swap the 3 red-banded decks at the Shuffling Mill for honest ones',
      },
      {
        objective: {
          kind: 'duel', area: 'card',
          foe: {
            id: 'card-q-redraw-duel',
            court: 'card',
            name: 'The Left Drum',
            foeName: 'Mill-Master Riffle Crank',
            foeElement: 'technology',
            difficulty: 5,
            hpMult: 0.95,
            gimmick: 'card-snap',
            at: { x: 640, y: 672 },
            look: { body: 0xc0a488, accent: 0x5e2a1a, hat: 'goggles', traits: ['tool', 'apron'], size: 1.2, eye: 0xd8a636 },
            challenge: [
              'Somebody\'s been at my crates. Red bands are a special order. Special orders are the House\'s business.',
              'A mill\'s a machine, stranger. It does what it\'s built to do. I build it to do what I\'m told.',
              'Stand on the floor, then. Mind the cards. They spark, round my machines.',
            ],
            beaten: ['…The re-draw goes out plain, then. One plain deck. See how long that lasts.'],
            coins: 100,
          },
        },
        hint: 'Beat Mill-Master Riffle Crank before the re-draw is dealt',
      },
    ],
    complete: [
      'The deck was plain and the cards fell how they fell. Hal\'s number didn\'t come up. It didn\'t come UP.',
      'They let us keep the stake. I\'ve never seen them hand a stake back. Half of it\'s yours. Don\'t argue.',
    ],
    reward: { orbs: 12, coins: 100 },
  },

  // ── 5. The Last Hand — talk + visit + prince ─────────────────────────
  {
    id: Q_LAST,
    area: 'card',
    name: 'The Last Hand',
    giver: 'card-nan-clubb',
    requires: { courtReady: 'card' },
    offer: [
      'All five of his, beaten. He\'s at the big table under the lamp, shuffling. He\'s never been nervous.',
      'When he was nine, the day he was given the court, a baker gave him a fortune cookie for luck.',
      'He never opened it. Said he didn\'t need luck. He left it with her to keep. Biscotta\'s mother.',
      'Fetch it from Biscotta. Stand where he was crowned. Then go in and play him.',
    ],
    accept: [
      'Biscotta first. Then the Cutting Stone. Then the Hall. I\'ll be on the step.',
    ],
    stages: [
      {
        objective: {
          kind: 'talk', npc: 'card-biscotta',
          lines: [
            'The Prince\'s cookie! Mother kept it in a tin behind the flour for sixteen years. Here — it\'s stale as slate.',
            'She wrote the slip herself. She never told me what. She said he\'d open it when he needed to.',
          ],
        },
        hint: 'Ask Biscotta at The Fortune Cookie for the Prince\'s unopened fortune',
      },
      {
        objective: { kind: 'visit', area: 'card', at: { x: STONE_AT.x, y: STONE_AT.y + 90 }, r: 80, label: 'The Cutting Stone' },
        hint: 'Stand at the Cutting Stone, where the boy was given the court',
      },
      {
        objective: { kind: 'prince', prince: 'ante' },
        hint: 'Face Prince Ante in the Dealing Hall',
      },
    ],
    complete: [
      'He lost, and he sat on the step, and he opened the cookie. Sixteen years. It said: you will lose, and live.',
      'He laughed. I\'ve not heard him laugh since he was nine. Take the purse. He said to. He said: you won it.',
    ],
    reward: { orbs: 13, coins: 220 },
  },
];
