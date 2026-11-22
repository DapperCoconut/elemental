import type { QuestDef } from '../../../../IslesTypes';
import { LEDGER, PRESS } from './area';
import { FISH_IRONGILL, FISH_SHAD } from './items';

/**
 * The Shackle Court's five side quests.
 *
 * Between them they show how the debt works: the gang that works it off and never does (Rivet),
 * the debtors kept on half a dose (Tadge and his uncle), the Ledger that writes the babies in
 * (Hesper), the Works that makes the irons by the hundred (Wren), and at the last the Prince's own
 * page (Lanyard). Each is somebody refusing to owe.
 */
export const SHACKLE_QUESTS: QuestDef[] = [
  // ── 1. Files in the Bread — collect + talk + duel ────────────────────
  {
    id: 'shackle-q-files',
    area: 'shackle',
    name: 'Files in the Bread',
    giver: 'shackle-rivet',
    offer: [
      'The bread-wives leave the gang a loaf at the foot of the piles. Most days it\'s bread. Today, four have files.',
      'Brank does his rounds at noon and breaks every loaf he finds. He likes the crust. He likes the breaking more.',
      'I\'m chained to the file. I can\'t fetch. You can. Will you bring me the four before he does?',
    ],
    accept: [
      'Bless you. At the piles along the causeway. Feel for the heavy ones. Bread\'s not that heavy.',
    ],
    stages: [
      {
        objective: {
          kind: 'collect', area: 'shackle', label: 'A heavy loaf', emoji: '🍞', color: 0xc8a060,
          spots: [{ x: 1450, y: 943 }, { x: 1569, y: 836 }, { x: 1878, y: 896 }, { x: 2060, y: 780 }],
        },
        hint: 'Gather the 4 heavy loaves left at the causeway piles',
      },
      {
        objective: {
          kind: 'talk', npc: 'shackle-rivet',
          lines: [
            'Four! Four files, and good ones — Works steel, somebody\'s risked a hand for these. Pass them down the file.',
            'Not now, not today. We cut when we choose. Knowing we can is half the — oh. Oh, no.',
            'That\'s Brank. He\'s seen the crumbs on your coat. Stand up straight, stranger. He hates it when you do.',
          ],
        },
        hint: 'Bring the loaves to Gammer Rivet on the causeway',
      },
      {
        objective: {
          kind: 'duel', area: 'shackle',
          foe: {
            id: 'shackle-q-files-duel',
            court: 'shackle',
            name: 'The Weight of the Gang',
            foeName: 'Overseer Brank',
            foeElement: 'gravity',
            difficulty: 4,
            hpMult: 0.95,
            gimmick: 'shackle-ball-and-chain',
            at: { x: 1620, y: 884 },
            look: { body: 0xb09078, accent: 0x3a3440, hat: 'helmet', traits: ['beard', 'tool'], size: 1.35, eye: 0xd8dce4 },
            challenge: [
              'Crumbs on your coat, stranger. Crumbs and iron filings. That\'s a funny loaf you\'ve been eating.',
              'Every file on this causeway is the Prince\'s. Every ankle too. I keep them heavy. It\'s what I\'m for.',
              'Irons on. Let\'s see you drag something for once.',
            ],
            beaten: ['…Face-down in the ruts. The gang saw. They\'ll be humming about this for a year.'],
            coins: 100,
          },
        },
        hint: 'Face Overseer Brank on the causeway',
      },
    ],
    complete: [
      'Brank face-down in his own ruts! I\'ll hold that in my head for the next forty-one years if I must.',
      'Take my man\'s ring. I pawned it once and bought it back with the gang\'s pennies. It\'s yours to pawn.',
    ],
    reward: { orbs: 9, coins: 90 },
  },

  // ── 2. Shad for the Post — fish + deliver + duel ─────────────────────
  {
    id: 'shackle-q-shad',
    area: 'shackle',
    name: 'Shad for the Post',
    giver: 'shackle-tadge',
    offer: [
      'Uncle Ansel\'s on the post by the moat. They give him half a dose a moon. He\'s grey to the knuckles.',
      'Nobody can throw him a fish — the Turnkey writes it down as a loan. But if you CATCH it, and GIVE it…',
      'That\'s not lending. That\'s a present. Catch two shad for him? I\'d do it but my rod\'s a stick.',
    ],
    accept: [
      'Cast by the posts where the chains go down. Shad hang round the chains. Don\'t hook a chain!',
    ],
    stages: [
      {
        objective: { kind: 'fish', fish: FISH_SHAD, count: 2 },
        hint: 'Catch 2 shackle shad in the chain moat',
      },
      {
        objective: {
          kind: 'deliver', npc: 'shackle-ansel', item: FISH_SHAD, count: 2,
          lines: [
            'Shad? For me? Tadge sent you. Of course he did. That boy. Look, I can still close my hand round it. Just.',
            'Ah — hide them. Quick. That\'s Gall coming up the bank with his book. He\'s smelt fish on the wind.',
          ],
        },
        hint: 'Bring the 2 shad to Ansel Gray on his post at the moat',
      },
      {
        objective: {
          kind: 'duel', area: 'shackle',
          foe: {
            id: 'shackle-q-shad-duel',
            court: 'shackle',
            name: 'A Fish Lent',
            foeName: 'Turnkey Gall',
            foeElement: 'oil',
            difficulty: 4,
            hpMult: 0.9,
            gimmick: '',
            at: { x: 880, y: 1210 },
            look: { body: 0x9aa0a0, accent: 0x2a2a30, hat: 'plague', traits: ['book', 'lantern'], size: 1.1, eye: 0x9adf5a },
            challenge: [
              'Two shad to a debtor. That\'s a loan. A loan is written, and a loan bears interest. To the debtor.',
              'Unless the lender pays it. Are you the lender, stranger? Shall I open you a page?',
              'No? Then hand the fish back, and I\'ll write him down for two.',
            ],
            beaten: ['…Into the moat. In my good coat. I shall write myself down for that.'],
            coins: 100,
          },
        },
        hint: 'See off Turnkey Gall on the moat bank',
      },
    ],
    complete: [
      'You knocked the Turnkey in! He came up with a shad in his hat! I\'ll never stop laughing. Never.',
      'Uncle Ansel says to give you this. He caught it years ago, before the post. He kept it salted. For a feast.',
    ],
    reward: { orbs: 8, coins: 70, item: FISH_IRONGILL, itemCount: 1 },
  },

  // ── 3. A Blot in the Ledger — collect + visit + defeat ───────────────
  {
    id: 'shackle-q-blot',
    area: 'shackle',
    name: 'A Blot in the Ledger',
    giver: 'shackle-hesper',
    offer: [
      'The Wicks had twins. Two new pages in the Ledger. Eleven doses of their parents\' debt carried onto each.',
      'They\'ll be on the gang by twelve. Unless the page can\'t be read. A debt nobody can read is a debt nobody owes.',
      'Lampblack and mire-water makes a blot that nothing lifts. I can\'t be seen scraping lamps. Can you?',
    ],
    accept: [
      'The soot-traps on the square\'s lamps. Three will do. Then the Wick page. Arrears will be at the book.',
    ],
    stages: [
      {
        objective: {
          kind: 'collect', area: 'shackle', label: 'Lampblack', emoji: '🖤', color: 0x2a2420,
          spots: [{ x: 1000, y: 788 }, { x: 1400, y: 790 }, { x: 1020, y: 1136 }],
        },
        hint: 'Scrape lampblack from 3 of the square\'s caged lamps',
      },
      {
        objective: { kind: 'visit', area: 'shackle', at: { x: LEDGER.x, y: LEDGER.y + 50 }, r: 70, label: 'The Wick page in the Great Ledger' },
        hint: 'Tip the blot on the Wick page of the Great Ledger',
      },
      {
        objective: { kind: 'defeat', encounter: 'shackle-ledger' },
        hint: 'Clerk Arrears saw the blot — face him at the Ledger (Debtor\'s Ledger)',
      },
    ],
    complete: [
      'A blot! A perfect black blot right across both twins. Arrears is copying it from memory. Badly.',
      'Here — the under-clerk\'s purse. I was saving it for my own debt. It turns out I\'d rather spend it on yours.',
    ],
    reward: { orbs: 10, coins: 80 },
  },

  // ── 4. Jam the Press — collect + visit + duel ────────────────────────
  {
    id: 'shackle-q-press',
    area: 'shackle',
    name: 'Jam the Press',
    giver: 'shackle-wren',
    offer: [
      'Every pair of irons comes off that press out front. Four hundred a week. One pair\'s got my mum\'s number.',
      'If the press stops, the numbers stop. Three bent cotter pins in the ram and it seizes solid.',
      'Gorse counts the good pins. Nobody counts the bent ones. Will you fetch three and jam it?',
    ],
    accept: [
      'Round the yard — the cooling rack, by the slag, by the furnace wall. Then the ram. Then RUN.',
    ],
    stages: [
      {
        objective: {
          kind: 'collect', area: 'shackle', label: 'Bent cotter pin', emoji: '📌', color: 0x8a929c,
          spots: [{ x: 640, y: 1112 }, { x: 384, y: 1036 }, { x: 540, y: 960 }],
        },
        hint: 'Find 3 bent cotter pins round the Works yard',
      },
      {
        objective: { kind: 'visit', area: 'shackle', at: { x: PRESS.x, y: PRESS.y + 26 }, r: 60, label: 'The stamp press' },
        hint: 'Wedge the pins into the stamp press\'s ram',
      },
      {
        objective: {
          kind: 'duel', area: 'shackle',
          foe: {
            id: 'shackle-q-press-duel',
            court: 'shackle',
            name: 'Four Hundred Pair',
            foeName: 'Forgemaster Gorse',
            foeElement: 'magma',
            difficulty: 5,
            hpMult: 0.95,
            gimmick: 'shackle-manacle-works',
            at: { x: 650, y: 966 },
            look: { body: 0xa07860, accent: 0x5a2e18, hat: 'coif', traits: ['apron', 'beard', 'tool'], size: 1.35, eye: 0xffa860 },
            challenge: [
              'My press. My PRESS. There\'s pins in her ram. Bent pins. Do you know what a seized ram costs?',
              'Four hundred pair a week, the Prince wants. Not three hundred. Not three hundred and ninety-nine.',
              'The belt still runs. Let\'s see how you like the last of this week\'s batch.',
            ],
            beaten: ['…Three days to strip her. Three days. Four hundred pair. Get out of my yard. Thank you. Get out.'],
            coins: 100,
          },
        },
        hint: 'Face Forgemaster Gorse in the Works yard',
      },
    ],
    complete: [
      'Seized! Seized solid! Gorse is under her with a lamp swearing at the ram. Four hundred pair not made.',
      'Mum\'s number won\'t get stamped this week. Take my wages — I won\'t need them if there\'s no work. Ha!',
    ],
    reward: { orbs: 10, coins: 90 },
  },

  // ── 5. The Longest Page — talk + visit + prince ──────────────────────
  {
    id: 'shackle-q-keys',
    area: 'shackle',
    name: 'The Longest Page',
    giver: 'shackle-lanyard',
    requires: { courtReady: 'shackle' },
    offer: [
      'The Prince is counting his keys in the Fetterhold. He does it when he\'s frightened. Four hundred and twelve.',
      'Before you go in, you should know what you fight. Ask Nan Clink — she nursed him. She polishes the keys.',
      'Then go to the Ledger and read the page at the very back. The one in purple ink. His mother\'s hand.',
    ],
    accept: [
      'Nan first, then the page. Then the keep. I shall pray for you both, which is unusual for me.',
    ],
    stages: [
      {
        objective: {
          kind: 'talk', npc: 'shackle-clink',
          lines: [
            'The boy? Sit. His mother keeps a page for each of her brood — what each cost her. Egg, milk, every dose.',
            'Fetter was sickly. She spent on him. And the day he could count, she gave him the sum, and his ring of keys.',
            'He\'s paid on it every moon since. Every payment out of this court. He thinks if he stops, he dies. Maybe so.',
          ],
        },
        hint: 'Ask Nan Clink about the Prince as a boy',
      },
      {
        objective: { kind: 'visit', area: 'shackle', at: { x: LEDGER.x, y: LEDGER.y + 50 }, r: 70, label: 'The last page of the Ledger' },
        hint: 'Read the last page of the Great Ledger, in purple ink',
      },
      {
        objective: { kind: 'prince', prince: 'fetter' },
        hint: 'Face Prince Fetter at the Fetterhold',
      },
    ],
    complete: [
      'He has sent the keys down to the gang. All of them. In a basket. And he asked me a question I couldn\'t answer.',
      'Whether a debt can be forgiven by the one who owes it. I said I would think. I shall be thinking a long time.',
      'Take the chapel\'s alms. There is nobody left in the Owing House to give them to.',
    ],
    reward: { orbs: 12, coins: 160 },
  },
];
