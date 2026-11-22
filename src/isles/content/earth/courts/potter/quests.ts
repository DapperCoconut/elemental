import type { QuestDef } from '../../../../IslesTypes';
import { SHARD_RUCK } from './area';
import { FISH_LOACH, FISH_TENCH } from './items';

/**
 * The Potter's Court's five side quests.
 *
 * Between them they show how the court's Tithe works and how its people get round it: a
 * cracked soldier mended so it rings true (Nan), the slip and its fish and who owns them (Elwin),
 * songs the Regent buried, hidden under glaze (Granny), a donkey taken for the Prince's wheel
 * (Tobiah), and the Prince's own first pot, broken on the Ruck (the Steward). Each is somebody
 * making something whole again.
 */
export const POTTER_QUESTS: QuestDef[] = [
  // ── 1. Rings True — collect + talk + duel ────────────────────────────
  {
    id: 'potter-q-ringing',
    area: 'potter',
    name: 'Rings True',
    giver: 'potter-nan',
    offer: [
      'Davey\'s soldier dunted. Three days to muster and there\'s a hairline up its chest that\'ll ring false.',
      'There\'s an old way. Grog — fired clay ground fine — wedged with slip into the crack. It fires in.',
      'The best grog\'s off the Shard Ruck, where they throw the rejects. I can\'t climb it any more.',
      'Would you fetch me three good pieces? Then take them to Tallis. He\'ll tap it honest.',
    ],
    accept: [
      'Round the foot of the Ruck, love, by the muster ground. Pick the hard red ones. They ring when you knock them.',
    ],
    stages: [
      {
        objective: {
          kind: 'collect', area: 'potter', label: 'Hard red sherd', emoji: '🧱', color: 0xc8693c,
          spots: [{ x: SHARD_RUCK.x - 70, y: SHARD_RUCK.y + 40 }, { x: SHARD_RUCK.x + 40, y: SHARD_RUCK.y + 56 }, { x: SHARD_RUCK.x - 64, y: SHARD_RUCK.y - 60 }],
        },
        hint: 'Gather 3 hard red sherds round the foot of the Shard Ruck',
      },
      {
        objective: {
          kind: 'talk', npc: 'potter-tallis',
          lines: [
            'Grog in the crack, wedged and fired? Nan always did know the old ways. Hold still, soldier…',
            '(ting) …It rings. It RINGS. Third rank, file three: rings true. I\'m writing it down in ink.',
            'Oh. Oh, no. That\'s the Rank-Warden coming down the aisle. He heard it ring. He doesn\'t like it.',
            'He says a mend is a fraud on the Tithe. He\'s got his iron hammer out. He\'ll tap it till it breaks.',
          ],
        },
        hint: 'Take the sherds to Muster-Clerk Tallis Marl at the Muster House',
      },
      {
        objective: {
          kind: 'duel', area: 'potter',
          foe: {
            id: 'potter-q-ringing-duel',
            court: 'potter',
            name: 'A Fraud on the Tithe',
            foeName: 'Rank-Warden Ferric Dunt',
            foeElement: 'metal',
            difficulty: 3,
            hpMult: 0.95,
            gimmick: 'potter-army',
            at: { x: 1660, y: 1050 },
            look: { body: 0xb8a898, accent: 0x3c3a3c, hat: 'helmet', traits: ['tool', 'beard'], size: 1.25, eye: 0xd0d0d8 },
            challenge: [
              'A soldier is fired whole or it is short. Whole. Grog in a crack is a lie told in clay.',
              'I have tapped four thousand soldiers. I know a mend by the ring. It rings too sweetly.',
              'Stand aside, stranger, or stand in the ranks. They\'ll have you either way.',
            ],
            beaten: ['…It rang. I tapped it eleven times and it rang every time. Write it down, then. Write it down.'],
            coins: 80,
          },
        },
        hint: 'Stop Rank-Warden Ferric Dunt before he breaks Davey\'s soldier',
      },
    ],
    complete: [
      'Rang true. Tallis wrote it in INK. Davey\'s soldier is standing in the ranks, mended, and Davey\'s home.',
      'I\'ve nothing but this. It was for the next season\'s clay. There\'ll be clay. Take it.',
    ],
    reward: { orbs: 7, coins: 80 },
  },

  // ── 2. Stew for the Placers — fish + deliver + duel ──────────────────
  {
    id: 'potter-q-loach',
    area: 'potter',
    name: 'Stew for the Placers',
    giver: 'potter-elwin',
    offer: [
      'The placer boys on Kiln Row go twelve hours in the kilns on firing days. Twelve hours. Saggars on their heads.',
      'They get bread and water, and the water\'s warm. A loach stew\'d put the strength back in their necks.',
      'But the Slip-Reeve counts every loach out of this pond. Catch me three, quiet, for Jory and his lot?',
    ],
    accept: [
      'Cast near the jetty. Loach lie in the thick at the bottom. Slow strike — slip holds the hook.',
    ],
    stages: [
      {
        objective: { kind: 'fish', fish: FISH_LOACH, count: 3 },
        hint: 'Catch 3 clay loach in the slip pond',
      },
      {
        objective: {
          kind: 'deliver', npc: 'potter-jory', item: FISH_LOACH, count: 3,
          lines: [
            'Loach! Three! Elwin sent you? Big Tam\'s got a pot, he\'s had a pot hid in number three kiln for a year.',
            'Uh-oh. That\'s the Slip-Reeve on the lane. He\'s seen the creel. He\'s got his tally-stick out.',
          ],
        },
        hint: 'Bring the 3 loach to Jory Placer on Kiln Row',
      },
      {
        objective: {
          kind: 'duel', area: 'potter',
          foe: {
            id: 'potter-q-loach-duel',
            court: 'potter',
            name: 'Fish Are Slip',
            foeName: 'Slip-Reeve Marlow Teem',
            foeElement: 'water',
            difficulty: 3,
            hpMult: 0.9,
            gimmick: '',
            at: { x: 560, y: 1080 },
            look: { body: 0xc4a888, accent: 0x5e3e2a, hat: 'souwester', traits: ['satchel', 'book'], size: 1.1, eye: 0xdcb48e },
            challenge: [
              'Every drop of slip in this court runs from the Prince\'s pits. What lives in the Prince\'s slip is slip.',
              'Three loach unaccounted. That\'s three loach owed. Owed loach go on a household\'s tally.',
              'Shall I put them on the boys\'? Or on yours?',
            ],
            beaten: ['…Loach are not strictly slip. I may have been wrong about loach. Get out of my pond.'],
            coins: 80,
          },
        },
        hint: 'See off Slip-Reeve Marlow Teem on the pond road',
      },
    ],
    complete: [
      'Fed the lot of them, Jory says. Black faces and full bellies. That\'s a good day on Kiln Row.',
      'Here — a tench. A glazed one. I\'ve been saving it for somebody who\'d earned it.',
    ],
    reward: { orbs: 6, coins: 60, item: FISH_TENCH, itemCount: 1 },
  },

  // ── 3. Songs Under the Glaze — collect + talk + duel ─────────────────
  {
    id: 'potter-q-songs',
    area: 'potter',
    name: 'Songs Under the Glaze',
    giver: 'potter-granny',
    offer: [
      'The Regent buried the songs, dear. Took the books, took the singers. But a song is only lines.',
      'I scratch them round jars, through the slip. Under glaze, fired in, nobody can bury them. They\'re just jars.',
      'I\'ve four drying on the terraces, hid among the greenware. The Hushwarden\'s been sniffing round the racks.',
      'Fetch them before he does? Then Wren at the glaze house will know what to do.',
    ],
    accept: [
      'Dark slip, pale lines, between the racks. Don\'t read them out loud. Hum, if you must.',
    ],
    stages: [
      {
        objective: {
          kind: 'collect', area: 'potter', label: 'Scratched jar', emoji: '🏺', color: 0x5e3e2a,
          spots: [{ x: 1730, y: 360 }, { x: 2010, y: 360 }, { x: 1870, y: 480 }, { x: 2150, y: 480 }],
        },
        hint: 'Find Granny\'s 4 scratched jars among the drying racks on the terraces',
      },
      {
        objective: {
          kind: 'talk', npc: 'potter-wren',
          lines: [
            'Granny\'s jars! Look at the lines on that one. That\'s the Quarry Song. They burned the last book of it.',
            'Celadon. Thick celadon, fired in the Prince\'s own kiln — nobody searches the Prince\'s kiln.',
            'Oh no. The Hushwarden. He\'s coming down the terrace lane, and he\'s got his sack for burying things.',
          ],
        },
        hint: 'Bring the jars to Wren Saltglaze at the glaze house',
      },
      {
        objective: {
          kind: 'duel', area: 'potter',
          foe: {
            id: 'potter-q-songs-duel',
            court: 'potter',
            name: 'Hush',
            foeName: 'Hushwarden Ossory Mute',
            foeElement: 'silence',
            difficulty: 4,
            hpMult: 0.95,
            gimmick: '',
            at: { x: 1940, y: 420 },
            look: { body: 0xc8c0b4, accent: 0x463834, hat: 'hood', traits: ['satchel', 'mask'], size: 1.15, eye: 0xb8b0a8 },
            challenge: [
              'Pretty lines. Lines in rows. Rows that scan. I know a verse when I see one, scratched or sung.',
              'By order of the Regent, what is sung is buried, and what is buried is not sung.',
              'Give me the jars. I have a sack, and the Sepulchre is very deep.',
            ],
            beaten: ['…Hm-hm. Hm-hm-hm. …I didn\'t hum that. You didn\'t hear me hum that.'],
            coins: 80,
          },
        },
        hint: 'Stop Hushwarden Ossory Mute on the terrace lane',
      },
    ],
    complete: [
      'Fired. All four, under celadon, in the Prince\'s own kiln. Now they\'re only jars. Lovely jars.',
      'Take this, dear. And hum something on your way out. Something you\'re not supposed to know.',
    ],
    reward: { orbs: 8, coins: 70 },
  },

  // ── 4. Biscuit — talk + defeat ───────────────────────────────────────
  {
    id: 'potter-q-donkey',
    area: 'potter',
    name: 'Biscuit',
    giver: 'potter-tobiah',
    offer: [
      'They took my donkey. Biscuit. Turned my pug mill eleven years, never kicked, never bit, never rang false.',
      'Requisitioned, the tally said. For the Prince\'s wheel. No mill, no clay; no clay, no soldier; no soldier…',
      'You know how that ends. The Steward up at the Glost House signs for everything taken. Ask him.',
    ],
    accept: [
      'If she\'s on Wenna\'s wheel, it\'ll be Wenna you have to talk to. Wenna doesn\'t talk. Wenna throws.',
    ],
    stages: [
      {
        objective: {
          kind: 'talk', npc: 'potter-sherd',
          lines: [
            'A donkey. Grey, answers to Biscuit. Yes — I signed for her. Requisitioned for the Great Wheel.',
            'Thrower Wenna needed something to turn it faster for the season\'s soldiers. She asked for a donkey.',
            'I will not strike it out of the ledger. I cannot. But if Wenna were to give her up, I would not write it.',
          ],
        },
        hint: 'Ask Steward Aumbry Sherd at the Glost House where Biscuit went',
      },
      {
        objective: { kind: 'defeat', encounter: 'potter-wheel' },
        hint: 'Have it out with Thrower Wenna (Potter\'s Wheel) on Wheel Square',
      },
    ],
    complete: [
      'BISCUIT. She came down the west lane on her own, ears up, braying the whole way. Wenna sent her.',
      'Wenna sent bread, too. And this — said it was what she\'d have paid for a donkey, if she\'d had to.',
    ],
    reward: { orbs: 6, coins: 90 },
  },

  // ── 5. The Glost Firing — talk + visit + prince ──────────────────────
  {
    id: 'potter-q-glost',
    area: 'potter',
    name: 'The Glost Firing',
    giver: 'potter-sherd',
    requires: { courtReady: 'potter' },
    offer: [
      'All five of them. His Highness heard every one from the Glost House. He has ordered the great kiln lit.',
      'Before you go in, you should know who he is. Granny Sgraffito knew him as a boy. Ask her.',
      'And go and stand at the Ruck. Everyone in this court has stood at the Ruck once.',
    ],
    accept: [
      'Granny, then the Ruck. Then the Glost House door. Mind the step — it is mended.',
    ],
    stages: [
      {
        objective: {
          kind: 'talk', npc: 'potter-granny',
          lines: [
            'Glaze? He threw his first pot at six. A bowl. Lopsided, thick as a boot, and he was so proud of it.',
            'His father tapped it. It rang false — of course it did, it was a child\'s bowl. He threw it on the Ruck.',
            'The boy climbed the Ruck that night and dug out every piece. He mended it in gold. He still has it.',
          ],
        },
        hint: 'Ask Granny Sgraffito about the Prince as a boy',
      },
      {
        objective: { kind: 'visit', area: 'potter', at: { x: SHARD_RUCK.x - 80, y: SHARD_RUCK.y + 70 }, r: 80, label: 'The Shard Ruck' },
        hint: 'Stand at the foot of the Shard Ruck',
      },
      {
        objective: { kind: 'prince', prince: 'glaze' },
        hint: 'Face Prince Glaze at the Glost House',
      },
    ],
    complete: [
      'He has let the great kiln go out. He is sitting in the forecourt with the gold and a soldier off the Ruck.',
      'He says he will mend them all. Four thousand. He asked me for the steward\'s purse to buy the gold.',
      'He asked me to give you the rest. I have never been asked to give anything away. Here.',
    ],
    reward: { orbs: 10, coins: 160 },
  },
];
