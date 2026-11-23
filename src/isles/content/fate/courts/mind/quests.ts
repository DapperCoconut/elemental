import type { QuestDef } from '../../../../IslesTypes';
import { BOARD_KING_SQUARE, SPIRIT_BOARD } from './area';
import { FISH_BASS, FISH_TROUT } from './items';
import { Q_MARKET, Q_MATE, Q_NAME, Q_READER, Q_WELL } from './npcs';

/**
 * The Mind Court's five side quests.
 *
 * Between them they show what the readers are for: what the Playhouse does to the busted (Wren
 * and her brother's name), where read thoughts go (Quill and the Exchange's lot-boards), what
 * the well remembers and why the House wants it hushed (Hesper), what it costs to be good at
 * reading (Pim), and finally the living board and the Prince who plays it (Caissa). Each is
 * somebody choosing not to be read.
 */
export const MIND_QUESTS: QuestDef[] = [
  // ── 1. The Name Under the Number — talk + collect + duel ─────────────
  {
    id: Q_NAME,
    area: 'mind',
    name: 'The Name Under the Number',
    giver: 'mind-wren',
    offer: [
      'My brother can\'t say his name. The Playhouse took it. Took all their names — every busted on the board.',
      'They say Swoon keeps them. Written out on cue cards, in the prop room, so nobody can say them back.',
      'Will you talk to him? And then — if there are cards — find his?',
    ],
    accept: [
      'Forty-one, south edge of the board. Be kind. He tries so hard to say it his face goes red.',
    ],
    stages: [
      {
        objective: {
          kind: 'talk', npc: 'mind-forty-one',
          lines: [
            'Forty-one. Pawn. Sorry. You know Wren? Wren. I can say HER name. Isn\'t that strange?',
            'On stage he showed me a card with my name on it, and said "you will never say this again".',
            'Then he tore it in three and gave the pieces to the stagehands. The Playhouse, round the back.',
          ],
        },
        hint: 'Talk to Forty-One on the south edge of the Plaza Board',
      },
      {
        objective: {
          kind: 'collect', area: 'mind', label: 'A torn cue card', emoji: '🎴', color: 0xf0e6cc,
          spots: [{ x: 330, y: 470 }, { x: 800, y: 470 }, { x: 560, y: 180 }],
        },
        hint: 'Find the 3 pieces of the torn cue card round the Swoon Playhouse',
      },
      {
        objective: {
          kind: 'duel', area: 'mind',
          foe: {
            id: 'mind-q-name-duel',
            court: 'mind',
            name: 'Strike the Set',
            foeName: 'Usher Velvet Glamour',
            foeElement: 'illusion',
            difficulty: 5,
            hpMult: 0.95,
            gimmick: '',
            at: { x: 700, y: 700 },
            look: { body: 0xd8c0b0, accent: 0x9e2630, hat: 'tophat', traits: ['mask', 'cane'], size: 1.05, eye: 0xe2ccff },
            challenge: [
              'Props are the property of the Playhouse. Including the ones with names on.',
              'A busted man doesn\'t need a name. It only makes the numbering harder. Give those here.',
              'Look closely at me, now. Closer. Which one of me are you going to hit?',
            ],
            beaten: ['…Fine. Keep the card. The show must go on without it. It always does.'],
            coins: 125,
          },
        },
        hint: 'See off Usher Velvet Glamour by the Playhouse',
      },
    ],
    complete: [
      'I showed him the pieces and he read it, and then — he said it. "Tobias." Out loud. In the square.',
      'Here. It\'s the ribbon money. All of it. Don\'t argue, he\'d want you to have it. Tobias would.',
    ],
    reward: { orbs: 11, coins: 100 },
  },

  // ── 2. Thoughts at Market — collect + talk + duel ────────────────────
  {
    id: Q_MARKET,
    area: 'mind',
    name: 'Thoughts at Market',
    giver: 'mind-quill',
    offer: [
      'Lot fourteen. "A household on the Row, thinking of the night boat before the Draw." That\'s the Marrows.',
      'Quist read it off the father at a booth last week. Tonight at the bell it sells. Informers buy it.',
      'The slips are pinned to the lot-boards. If the slips are gone, there\'s no lot. Could you…?',
    ],
    accept: [
      'Four boards: two on the forecourt, two up the booth road. Quick, and don\'t look guilty.',
    ],
    stages: [
      {
        objective: {
          kind: 'collect', area: 'mind', label: 'A lot-slip', emoji: '📜', color: 0xe8e8e0,
          spots: [{ x: 1700, y: 1320 }, { x: 2100, y: 1320 }, { x: 1680, y: 860 }, { x: 2180, y: 860 }],
        },
        hint: 'Take down the 4 slips for lot fourteen from the Exchange\'s lot-boards',
      },
      {
        objective: {
          kind: 'talk', npc: 'mind-quist',
          lines: [
            'Ah. You have something in your pocket you are trying very hard not to think about. Paper. Four slips.',
            'I won\'t say. I read it off Marrow; I don\'t have to like it. But Margin will know — he counts his lots.',
            'He is coming down from the Exchange now. He walks like a man doing sums.',
          ],
        },
        hint: 'Ask Dr. Quist at Booth Three whether anyone saw',
      },
      {
        objective: {
          kind: 'duel', area: 'mind',
          foe: {
            id: 'mind-q-market-duel',
            court: 'mind',
            name: 'Lot Fourteen',
            foeName: 'Thought-Broker Silas Margin',
            foeElement: 'fortune',
            difficulty: 5,
            hpMult: 1,
            gimmick: 'mind-poker-face',
            at: { x: 2100, y: 1240 },
            look: { body: 0xd4bca0, accent: 0xd8b048, hat: 'tophat', traits: ['cane', 'glasses'], size: 1.15, eye: 0xf4dc8a },
            challenge: [
              'Lot fourteen was bought and paid for before it was read. You are holding my property.',
              'A thought is the only thing on this isle that costs nothing to make and sells for six crowns.',
              'Let\'s play for it. Card each. I can see yours. You can see mine. That\'s fair, isn\'t it?',
            ],
            beaten: ['…Lot fourteen is withdrawn. I shall write it off. I hate writing things off.'],
            coins: 125,
          },
        },
        hint: 'Beat Thought-Broker Silas Margin on the Exchange forecourt',
      },
    ],
    complete: [
      'WITHDRAWN. I chalked it myself. The Marrows went down to Tosswater an hour ago with one bag each.',
      'Take my week\'s chalk money. And a trout — Hesper sent it. She says you\'ll want to meet her.',
    ],
    reward: { orbs: 12, coins: 90, item: FISH_TROUT, itemCount: 1 },
  },

  // ── 3. What the Well Heard — fish + deliver + duel ───────────────────
  {
    id: Q_WELL,
    area: 'mind',
    name: 'What the Well Heard',
    giver: 'mind-hesper',
    offer: [
      'Pell drowned three years ago, swimming the breakwater at night. Something made him swim.',
      'His last thought is in the well. The trout eat them. Eat a trout, and for a moment you hear it.',
      'I can\'t cast any more — my hands. Two trout. Will you? The well wants the insulated kind of rod.',
    ],
    accept: [
      'Strike before you mean to. Thought trout rise to the cast you were about to make.',
    ],
    stages: [
      {
        objective: { kind: 'fish', fish: FISH_TROUT, count: 2 },
        hint: 'Catch 2 thought trout in the séance well',
      },
      {
        objective: {
          kind: 'deliver', npc: 'mind-hesper', item: FISH_TROUT, count: 2,
          lines: [
            '(she eats, eyes shut) …The Draw Hall. Night. Pell, cleaning. The great drum, open on its side.',
            'A false bottom. Lots in it. Never in the drum — under it. The King\'s favourites. He saw it.',
            'He swam to tell Tosswater. Oh, Pell. And here comes the hush. They always know when the well speaks.',
          ],
        },
        hint: 'Bring the 2 trout to Hesper Marrow at the well',
      },
      {
        objective: {
          kind: 'duel', area: 'mind',
          foe: {
            id: 'mind-q-well-duel',
            court: 'mind',
            name: 'Hushed',
            foeName: 'Hushwarden Ottoline Shade',
            foeElement: 'silence',
            difficulty: 5,
            hpMult: 0.95,
            gimmick: '',
            at: { x: 1250, y: 1440 },
            look: { body: 0xcfc4cc, accent: 0x361445, hat: 'cowl', traits: ['lantern'], size: 1.05 },
            challenge: [
              'Shh. The well has said something it shouldn\'t. It happens. Then I come.',
              'A thought that is heard by one woman is a rumour. Heard by a stranger, it is a story.',
              'I hush stories. Stand still. This will be very quiet.',
            ],
            beaten: ['…Too loud. You\'re all too loud. It\'s out now. Nobody can hush a whole town.'],
            coins: 125,
          },
        },
        hint: 'Stand between Hesper and Hushwarden Ottoline Shade',
      },
    ],
    complete: [
      'The drum has a false bottom. I said it in the Row, and in the Exchange, and to Quist at his booth.',
      'Nobody can prove it yet. But everybody knows it now. Here — Pell\'s savings. He\'d want you fed.',
    ],
    reward: { orbs: 10, coins: 120, item: FISH_BASS, itemCount: 1 },
  },

  // ── 4. A Reader Who Won't — visit + talk + defeat ────────────────────
  {
    id: Q_READER,
    area: 'mind',
    name: 'A Reader Who Won\'t',
    giver: 'mind-pim',
    offer: [
      'My test is tonight. Ouija sits me at the board and has me read a stranger. If I pass, I get a booth.',
      'I don\'t want a booth. I don\'t want to tell the House who\'s lying so it only takes the losing bets.',
      'If somebody beat her on her own board… she couldn\'t very well test anybody on it. Could she?',
    ],
    accept: [
      'Go and stand on the board first. Feel it. Then ask Orsola — she sold Ouija that planchette.',
    ],
    stages: [
      {
        objective: { kind: 'visit', area: 'mind', at: SPIRIT_BOARD, r: 90, label: 'The spirit board on Séance Row' },
        hint: 'Stand on the spirit board laid out south of the parlours',
      },
      {
        objective: {
          kind: 'talk', npc: 'mind-orsola',
          lines: [
            'The planchette? Glass-windowed, walnut, felt feet. Mine. She reads where it\'s going, so she always moves first.',
            'But it\'s only wood. Knock it and it skips. Knock it toward her and the next letter is hers.',
            'Don\'t tell her I told you. Tell Pim he can come and sweep my shop any time he likes.',
          ],
        },
        hint: 'Ask Orsola Glass about Ouija\'s planchette',
      },
      {
        objective: { kind: 'defeat', encounter: 'mind-mind-reader' },
        hint: 'Beat Medium Ouija at her board on Séance Row (Mind Reader)',
      },
    ],
    complete: [
      'She\'s cancelled it. "Postponed indefinitely". She says the board is "unwell". The board!',
      'I\'m going to sweep Orsola\'s shop and read nobody. Here — my test fee. I won\'t be needing it.',
    ],
    reward: { orbs: 9, coins: 110 },
  },

  // ── 5. Checkmate — talk + visit + prince ─────────────────────────────
  {
    id: Q_MATE,
    area: 'mind',
    name: 'Checkmate',
    giver: 'mind-caissa',
    requires: { courtReady: 'mind' },
    offer: [
      'Five readers down. He watched every one from the ball on his roof. He has sent for his good board.',
      'Before you go in: talk to one of the pieces. You should know who you are playing for.',
      'Then stand on the king\'s square on my board. Everyone who has ever beaten him… no. Nobody has.',
    ],
    accept: [
      'Forty-one, then the white king\'s square, fourth file, near rank. Then the Deep Think. Good luck.',
    ],
    stages: [
      {
        objective: {
          kind: 'talk', npc: 'mind-forty-one',
          lines: [
            'He plays us with his eyes shut. He says he can see the whole board in his head. He can.',
            'But he plays the board, not us. He doesn\'t know which pawn is Wren\'s brother.',
            'If you beat him, make him say the pieces\' names. Just once. That\'s all I\'d ask.',
          ],
        },
        hint: 'Talk to Forty-One about the Prince\'s game',
      },
      {
        objective: { kind: 'visit', area: 'mind', at: BOARD_KING_SQUARE, r: 50, label: 'The white king\'s square' },
        hint: 'Stand on the white king\'s square on the Plaza Board',
      },
      {
        objective: { kind: 'prince', prince: 'gambit' },
        hint: 'Face Prince Gambit at the Deep Think',
      },
    ],
    complete: [
      'He resigned. Then he came down to the board and asked each piece its name. Every one. He wrote them down.',
      'He said he\'d never once lost a game he could see. He couldn\'t see you. Take the arbiter\'s purse.',
    ],
    reward: { orbs: 13, coins: 220 },
  },
];
