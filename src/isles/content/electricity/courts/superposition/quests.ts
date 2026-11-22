import type { QuestDef } from '../../../../IslesTypes';
import { CENSUS, COIL_DOOR, HESPER_METER } from './area';
import { FISH_EEL, FISH_PERCH } from './items';

/**
 * The Superposition Court's five side quests.
 *
 * The highest court on the isle, so between them they show the Draw at its most absurd: a house
 * metered in both its states and short in one (Hesper), the boxes the Grid seals anything undecided
 * into (Quill's cat), a well whose fish are the Grid's "probably" (Fennick), a man who came out of
 * an unwatched night as two men and is wanted up the Coil once (Ambrose), and finally the Prince
 * himself, who has never been one thing (Orr). Each is somebody asking to be *read*, properly, once.
 */
export const SUPERPOSITION_QUESTS: QuestDef[] = [
  // ── 1. Both Switched Off — talk + visit + duel ───────────────────────
  {
    id: 'superposition-q-both-off',
    area: 'superposition',
    name: 'Both Switched Off',
    giver: 'superposition-hesper',
    offer: [
      'Twice switched off. Third time I\'m earthed, and my meter reads paid and short at once.',
      'Probst says if anyone watches the meter at the Brownout Bell, it has to pick one.',
      'Nobody watches. Nobody likes to. Would you? Ask Probst first — he\'ll tell you how it\'s done.',
    ],
    accept: [
      'Thank you. Probst is at the reading board, by the waystone. He chalks a column for each of me.',
    ],
    stages: [
      {
        objective: {
          kind: 'talk', npc: 'superposition-probst',
          lines: [
            'Number Three? Paid in one state, short in the other. Unread, it\'s read as short. That\'s the rule.',
            'But observed at the Bell, a meter collapses. Whatever it shows then is what it was all along.',
            'Stand at her meter and keep your eyes on it. Don\'t blink. And don\'t look at me — I\'m not here.',
          ],
        },
        hint: 'Ask Meterman Probst at the reading board how a meter is read',
      },
      {
        objective: { kind: 'visit', area: 'superposition', at: HESPER_METER, r: 60, label: 'Hesper Ket\'s meter' },
        hint: 'Stand at Hesper Ket\'s meter on Lower Either Row and watch it through the Bell',
      },
      {
        objective: {
          kind: 'duel', area: 'superposition',
          foe: {
            id: 'superposition-q-both-off-duel',
            court: 'superposition',
            name: 'Read as Short',
            foeName: 'Auditor Coulomb Vane',
            foeElement: 'electricity',
            difficulty: 4,
            hpMult: 0.95,
            gimmick: '',
            at: { x: 760, y: 1700 },
            look: { body: 0xc0b8a8, accent: 0xc0703a, hat: 'helmet', traits: ['book', 'glasses', 'satchel'], size: 1.15, eye: 0xdff4ff },
            challenge: [
              'Observed by whom? A stranger. Strangers are not on the Grid. Their looking does not count.',
              'The meter collapses to short. I have the switch here. Stand aside from the lady\'s door.',
              'Or stand in front of it, and I\'ll audit you instead.',
            ],
            beaten: ['…Paid. The ledger says paid. I wrote it. Why did I write it? Your looking counted, apparently.'],
            coins: 115,
          },
        },
        hint: 'Stop Auditor Coulomb Vane switching off Hesper\'s house',
      },
    ],
    complete: [
      'Paid! The needle swung the right way while you watched, and Vane wrote it in his own hand.',
      'My door opened when I touched it. Here — it\'s what I had put by for the third time. I won\'t need it.',
    ],
    reward: { orbs: 9, coins: 110 },
  },

  // ── 2. The Cat in the Crate — talk + collect + defeat ────────────────
  {
    id: 'superposition-q-cat-crate',
    area: 'superposition',
    name: 'The Cat in the Crate',
    giver: 'superposition-quill',
    offer: [
      'They boxed Pounce. He was sitting on our meter when the Wardens came, so he went in with it.',
      'Felis says he\'s undecided now. In there or not in there. He IS in there. Cats are always in boxes.',
      'Tamsin made all the boxes. She\'ll know which. Will you find him? Please? He\'s ginger.',
    ],
    accept: [
      'Tamsin\'s at her bench in the Box Yard. She\'s big and she smells of sawdust. She\'s nice really.',
    ],
    stages: [
      {
        objective: {
          kind: 'talk', npc: 'superposition-tamsin',
          lines: [
            'The ginger? Aye. Living things get the crates with air holes. I drill those big. Always have.',
            'There\'s a docket on every air-hole crate, three this week. The one with a cat in has a scratched one.',
            'Bring me the dockets and I\'ll tell you which stack. Mind — don\'t let Felis see you reading them.',
          ],
        },
        hint: 'Ask Tamsin Hollow, the crate-wright, which crates have air holes',
      },
      {
        objective: {
          kind: 'collect', area: 'superposition', label: 'Air-hole crate docket', emoji: '🏷️', color: 0xd8be8c,
          spots: [{ x: 260, y: 760 }, { x: 470, y: 720 }, { x: 740, y: 770 }],
        },
        hint: 'Read the dockets off the 3 air-hole crates in the Box Yard',
      },
      {
        objective: { kind: 'defeat', encounter: 'superposition-box' },
        hint: 'Felis has the keys: beat Keeper Felis (Schrödinger\'s Box) in the Box Yard',
      },
    ],
    complete: [
      'POUNCE! Felis opened it herself, with her back to everybody, and he jumped straight at her face.',
      'He\'s only ONE cat. He\'s only ever been one. Here — this is my money box. It\'s not sealed, look.',
    ],
    reward: { orbs: 8, coins: 90 },
  },

  // ── 3. Probably Perch — fish + deliver + duel ────────────────────────
  {
    id: 'superposition-q-probably-perch',
    area: 'superposition',
    name: 'Probably Perch',
    giver: 'superposition-fennick',
    offer: [
      'Hesper Ket\'s house is switched off. No light, no heat, no stove. She\'s eating cold.',
      'I can\'t give her fish from the well. The well\'s the Grid\'s. Probably. The Odds-Clerk says probably.',
      'But a stranger with a rod… Two probability perch, and take them to her. If you\'ve an insulated rod.',
    ],
    accept: [
      'Cast where the two ripples cross. Perch like the bright bits. Don\'t touch the rim with a wet hand.',
    ],
    stages: [
      {
        objective: { kind: 'fish', fish: FISH_PERCH, count: 2 },
        hint: 'Catch 2 probability perch in the Quantum Well (insulated rod)',
      },
      {
        objective: {
          kind: 'deliver', npc: 'superposition-hesper', item: FISH_PERCH, count: 2,
          lines: [
            'Perch! From Fennick\'s well? Oh, he\'s a dear. I\'ll wrap them in a cloth and sit on them till they warm.',
            'Oh. That\'s the Odds-Clerk at the gate with his slate. He says there\'s a chance they\'re the Empress\'s.',
          ],
        },
        hint: 'Bring the 2 perch to Hesper Ket on Lower Either Row',
      },
      {
        objective: {
          kind: 'duel', area: 'superposition',
          foe: {
            id: 'superposition-q-probably-perch-duel',
            court: 'superposition',
            name: 'Odds Are',
            foeName: 'Odds-Clerk Marlo Quint',
            foeElement: 'fate',
            difficulty: 4,
            hpMult: 0.95,
            gimmick: 'superposition-entangle',
            at: { x: 1000, y: 1420 },
            look: { body: 0xd0c4b0, accent: 0xcfa94e, hat: 'tophat', traits: ['book', 'glasses', 'cane'], size: 1.05, eye: 0xf4dc94 },
            challenge: [
              'Every fish in the well is the Grid\'s with a probability of nine in ten. I have it on my slate.',
              'Two fish. Point nine each. One point eight fish owed. I\'ll take two and call it rounding.',
              'Or we can play it out, and see whose odds come in.',
            ],
            beaten: ['…The odds were very much against that. I shall rub out the slate. Both columns.'],
            coins: 115,
          },
        },
        hint: 'Beat Odds-Clerk Marlo Quint by the gate before he takes the perch',
      },
    ],
    complete: [
      'Hesper ate both and said they were the best she\'d had. Have an eel — they come in pairs, so I\'ve one spare.',
    ],
    reward: { orbs: 8, coins: 80, item: FISH_EEL, itemCount: 1 },
  },

  // ── 4. The Man Who Is Twice — talk + visit + duel ────────────────────
  {
    id: 'superposition-q-twice',
    area: 'superposition',
    name: 'The Man Who Is Twice',
    giver: 'superposition-ambrose',
    offer: [
      'One night the Observatory looked away from Number Nine, and in the morning there were two of me.',
      'The census says Ambrose Twice owes the Draw once, and is switched off thrice, so one of us goes up.',
      'The census post is up on the street. Would you find the other me? At the Twin Squares. He\'ll know.',
    ],
    accept: [
      'Don\'t tell him I sent you. He\'ll know anyway. He always knows what I\'d say. Usually first.',
    ],
    stages: [
      {
        objective: {
          kind: 'talk', npc: 'superposition-ambrose-other',
          lines: [
            'He sent you? Of course he did. I\'d have sent you. The census post is up, is it.',
            'Then Hora Tally is coming. She counts everything at one moment, so nobody can be two.',
            'Stand at the post. She can\'t bear a stranger near her figures. She\'ll come to you.',
          ],
        },
        hint: 'Find the other Ambrose Twice at the Twin Squares',
      },
      {
        objective: { kind: 'visit', area: 'superposition', at: { x: CENSUS.x + 30, y: CENSUS.y + 40 }, r: 70, label: 'The census post' },
        hint: 'Stand at the census post at the west end of the Watched Street',
      },
      {
        objective: {
          kind: 'duel', area: 'superposition',
          foe: {
            id: 'superposition-q-twice-duel',
            court: 'superposition',
            name: 'At One Time',
            foeName: 'Census-Taker Hora Tally',
            foeElement: 'sand',
            difficulty: 5,
            hpMult: 0.95,
            gimmick: 'superposition-tunnel',
            at: { x: 320, y: 590 },
            look: { body: 0xd8ccb8, accent: 0x7a5e22, hat: 'veil', traits: ['book', 'glasses'], size: 1.1, eye: 0xcfa94e },
            challenge: [
              'A census is a single moment, stranger. At one moment, a man is in one place. That is all a census is.',
              'Ambrose Twice was counted twice at the same moment. That is fraud, or a miracle. I don\'t do miracles.',
              'Step away from my post. I am about to make him one person again, and send the spare up.',
            ],
            beaten: ['…Two persons, both resident. In ink. I have never written that. My hand is shaking. Go away.'],
            coins: 115,
          },
        },
        hint: 'Face Census-Taker Hora Tally at the census post',
      },
    ],
    complete: [
      'Two persons, both resident! Hora wrote it herself. He came up the street and we waved — we can\'t touch.',
      'This is from both of us. We each put in half. So it\'s a whole. That\'s how it works, isn\'t it?',
    ],
    reward: { orbs: 10, coins: 100 },
  },

  // ── 5. Collapse — talk + visit + prince ──────────────────────────────
  {
    id: 'superposition-q-collapse',
    area: 'superposition',
    name: 'Collapse',
    giver: 'superposition-orr',
    requires: { courtReady: 'superposition' },
    offer: [
      'All five of his keepers. His Highness watched from both halves of the house at once.',
      'Before you go in, ask Fennick about him. He sat on the well\'s rim as a boy. Fennick knows.',
      'And go up to the Coil door. Stand where the earthed stand. Then come and knock.',
    ],
    accept: [
      'Fennick, the Coil door, then the step. Knock once. If you knock twice he answers twice.',
    ],
    stages: [
      {
        objective: {
          kind: 'talk', npc: 'superposition-fennick',
          lines: [
            'He was seven before they opened the cradle. Seven years, alive and not, in a box in the Coil.',
            'Then he came down here and sat on my rim and watched the ripples cross. Never said what he thought.',
            'I asked him once what it was like in there. He said: "Like being everything, and nobody\'s."',
          ],
        },
        hint: 'Ask Fennick Lowe at the Quantum Well about the Prince as a boy',
      },
      {
        objective: { kind: 'visit', area: 'superposition', at: { x: COIL_DOOR.x, y: COIL_DOOR.y + 70 }, r: 70, label: 'The door of the Crown Coil' },
        hint: 'Stand at the door of the Crown Coil, where the earthed go up',
      },
      {
        objective: { kind: 'prince', prince: 'both' },
        hint: 'Face Prince Both at the House of Both',
      },
    ],
    complete: [
      'He is one. Just the one. He is sitting on the step in the left half of the house, and he is crying.',
      'He says it is the first time he has known what he feels. Take the household purse. He wants it spent.',
    ],
    reward: { orbs: 11, coins: 160 },
  },
];
