import type { QuestDef } from '../../../../IslesTypes';
import { SCALES_AT, VAULT } from './area';
import { FISH_IDE, FISH_SUNFISH } from './items';

/**
 * The Treasury Court's five side quests.
 *
 * The Treasury is where the Draw's debts are settled, so between them they show how the House
 * takes its cut: the Scales that always weigh short (Agnes), the interest that never ends (Jory
 * and Bess), the Lot Register's red marks that prove the drum is rigged (Clemency), the toll that
 * keeps bread off the Row (Dobbin), and finally what the Prince is worth before you face him
 * (Vane). Each one is somebody finding the thumb on the scale.
 */
export const TREASURY_QUESTS: QuestDef[] = [
  // ── 1. Short Weight — talk + visit + duel ────────────────────────────
  {
    id: 'treasury-q-short-weight',
    area: 'treasury',
    name: 'Short Weight',
    giver: 'treasury-agnes',
    offer: [
      'Nine weeks drawn, nine weeks short. A little short, always. My stake\'s honest. It\'s their weights.',
      'Nell Hammerly at the mint keeps the Standard — the true pound the mint\'s own scales are checked by.',
      'Put it on the Scales of Tribute against the House\'s pound. If theirs is light, the whole queue sees.',
      'I can\'t ask. I\'m drawn. They watch the drawn. Will you?',
    ],
    accept: ['Nell first. She\'s in the mint yard, by the end press. She\'ll grumble. Let her grumble.'],
    stages: [
      {
        objective: {
          kind: 'talk', npc: 'treasury-nell',
          lines: [
            'The Standard? For Agnes Groat? …Forty years I\'ve kept it in a box and never once seen it used.',
            'Here. Brass, true to the grain. Don\'t drop it, don\'t file it, don\'t let a clerk touch it.',
            'Set it in the empty pan with the House\'s pound in the other. If the beam tips our way — there\'s your proof.',
          ],
        },
        hint: 'Ask Nell Hammerly in the mint yard for the Standard pound',
      },
      {
        objective: { kind: 'visit', area: 'treasury', at: { x: SCALES_AT.x, y: SCALES_AT.y + 140 }, r: 80, label: 'The Scales of Tribute' },
        hint: 'Weigh the Standard against the House\'s pound at the Scales of Tribute',
      },
      {
        objective: {
          kind: 'duel', area: 'treasury',
          foe: {
            id: 'treasury-q-short-weight-duel',
            court: 'treasury',
            name: 'A Thumb on the Scale',
            foeName: 'Tare-Clerk Ozias Thumb',
            foeElement: 'subterfuge',
            difficulty: 4,
            hpMult: 0.95,
            gimmick: 'treasury-scales',
            at: { x: 1300, y: 990 },
            look: { body: 0xd8c4ac, accent: 0x1f5a3a, hat: 'visor', traits: ['glasses', 'book'], size: 0.95, eye: 0xd8ffb0 },
            challenge: [
              'The beam tipped, did it? A draught. The square is very draughty. I shall have the Standard confiscated.',
              'Whose pound is light is a matter of opinion. Mine is the opinion of the House.',
              'Step onto the pans, stranger. Let us weigh this properly.',
            ],
            beaten: ['…The House\'s pound may be a hair light. A HAIR. I\'ll correct the book. Nine weeks? Nine weeks.'],
            coins: 110,
          },
        },
        hint: 'Face Tare-Clerk Ozias Thumb at the Scales before he takes the Standard',
      },
    ],
    complete: [
      'The beam tipped. The whole queue saw it. Old Pell the cooper took his cap off and threw it in the air.',
      'They\'ve paid me back nine weeks of "short". In coin! Here — some of it\'s yours. Most of it\'s yours.',
    ],
    reward: { orbs: 10, coins: 90 },
  },

  // ── 2. Fool's Gold — fish + deliver + duel ───────────────────────────
  {
    id: 'treasury-q-fools-gold',
    area: 'treasury',
    name: 'Fool\'s Gold',
    giver: 'treasury-jory',
    offer: [
      'Ma owes Compound two shillings a day on the re-draw stake. She makes one. You can see the trouble.',
      'But the ingot ide in the pool eat the mint\'s spill. There\'s gold leaf in their bellies. Real gold.',
      'Two would pay a week\'s interest. I can\'t catch them — you need a fortune rod for gilded water.',
      'The Reeve says the pool\'s the Prince\'s. But the fish never signed anything.',
    ],
    accept: ['Tosswater\'s tackle shop sells the rods. Cast off the north kerb, where the coins are thickest.'],
    stages: [
      {
        objective: { kind: 'fish', fish: FISH_IDE, count: 2 },
        hint: 'Catch 2 ingot ide in the gilded pool (needs a fortune rod)',
      },
      {
        objective: {
          kind: 'deliver', npc: 'treasury-bess', item: FISH_IDE, count: 2,
          lines: [
            'Ide? From the pool? …Oh. Oh, look at that. Gold, in the belly, like he said. Like a tooth.',
            'That\'s the week paid. A whole week. — That\'s the Pool-Reeve on the corner, and he\'s seen the scales.',
          ],
        },
        hint: 'Bring the 2 ingot ide to Bess Farthing on Counting-House Row',
      },
      {
        objective: {
          kind: 'duel', area: 'treasury',
          foe: {
            id: 'treasury-q-fools-gold-duel',
            court: 'treasury',
            name: 'Everything That Glitters',
            foeName: 'Pool-Reeve Dredgewell Pike',
            foeElement: 'magnet',
            difficulty: 4,
            hpMult: 0.95,
            gimmick: '',
            at: { x: 1300, y: 1310 },
            look: { body: 0xb8b0a4, accent: 0x3a3f4a, hat: 'souwester', traits: ['tool', 'satchel'], size: 1.15, eye: 0xc4ccd8 },
            challenge: [
              'Every flake in that pool is the mint\'s spill, and the mint\'s spill is His Highness\'s. Fish included.',
              'I drag the bottom with a lodestone twice a week. It brings up everything that glitters. Even you.',
              'Hand over the bellies, and the fish they came in.',
            ],
            beaten: ['…The fish aren\'t in the spill book. Strictly. I\'ll have to write them in. Go on. Go.'],
            coins: 110,
          },
        },
        hint: 'See off Pool-Reeve Dredgewell Pike on Counting-House Row',
      },
    ],
    complete: [
      'Ma paid Compound the week, in gold leaf, and he weighed it twice and couldn\'t find a fault in it.',
      'He looked so sad. Here — I caught you a sunfish. Took me all morning. Don\'t tell the Reeve.',
    ],
    reward: { orbs: 11, coins: 60, item: FISH_SUNFISH, itemCount: 1 },
  },

  // ── 3. The Lot Register — collect + talk + duel ──────────────────────
  {
    id: 'treasury-q-lot-register',
    area: 'treasury',
    name: 'The Lot Register',
    giver: 'treasury-clemency',
    offer: [
      'I copy the Lot Register. The red marks beside some numbers — "verified", I was told. I checked.',
      'Every red-marked Lot belongs to a favourite of the House, and not one of them has ever been drawn.',
      'I tore out four pages to prove it. Warden Hasp saw me on the step, and I ran, and the pages blew away.',
      'If someone found them. Someone with no number. Someone they can\'t bust.',
    ],
    accept: ['Round the vault forecourt and down the hill road. The wind off the mint takes everything west.'],
    stages: [
      {
        objective: {
          kind: 'collect', area: 'treasury', label: 'A page of the Lot Register', emoji: '📄', color: 0x1f5a3a,
          spots: [{ x: 1380, y: 468 }, { x: 1830, y: 520 }, { x: 1200, y: 330 }, { x: 1600, y: 620 }],
        },
        hint: 'Gather the 4 torn pages of the Lot Register round the Great Vault',
      },
      {
        objective: {
          kind: 'talk', npc: 'treasury-clemency',
          lines: [
            'All four. Look — the red marks, the dates. Not one drawn in six years. Not ONE. It\'s proof.',
            'I\'ll take them to a printer in Tosswater tonight. A thousand copies. Let them paper the whole isle.',
            'Oh no. The Warden. He\'s coming down off the step, and he\'s brought the vault key. It\'s very big.',
          ],
        },
        hint: 'Bring the pages back to Clemency Sterling by the vault',
      },
      {
        objective: {
          kind: 'duel', area: 'treasury',
          foe: {
            id: 'treasury-q-lot-register-duel',
            court: 'treasury',
            name: 'Never To Be Drawn',
            foeName: 'Vault-Warden Hasp Ironside',
            foeElement: 'gravity',
            difficulty: 5,
            hpMult: 1,
            gimmick: 'treasury-coin-press',
            at: { x: 1560, y: 560 },
            look: { body: 0xa8a098, accent: 0x22252c, hat: 'helmet', traits: ['tool', 'beard'], size: 1.35, eye: 0xf0c030 },
            challenge: [
              'Those are the King\'s pages. Read by the King\'s eye. Everyone else who reads them gets heavier.',
              'I have kept that door forty years. Nothing goes out. Not gold, not paper, not clerks.',
              'Put them down, or I put you down. Under the presses, I think. They\'re good at keeping secrets.',
            ],
            beaten: ['…I never read them. Forty years and I never once read what I was keeping. Take them. Go.'],
            coins: 110,
          },
        },
        hint: 'Beat Vault-Warden Hasp Ironside before he takes the pages back',
      },
    ],
    complete: [
      'They\'re with the printer. A thousand copies by morning. The Draw on Thursday is going to be very quiet.',
      'I\'m sacked, of course. Here are my wages for the month. I won\'t be needing a clerk\'s coat any more.',
    ],
    reward: { orbs: 12, coins: 100 },
  },

  // ── 4. Free Passage — collect + defeat ───────────────────────────────
  {
    id: 'treasury-q-free-passage',
    area: 'treasury',
    name: 'Free Passage',
    giver: 'treasury-dobbin',
    offer: [
      'Grain for the Row\'s bakers, and the toll\'s too steep to cross. I had tokens. Four. Saved a year for them.',
      'Levy kicked my cart for "blocking the King\'s way", and the tokens went in the race.',
      'They wash up on the banks after the sluice — both sides. Fetch them, and I\'ll cross like a gentleman.',
    ],
    accept: ['Mind the race. It\'s deep and it\'s cold and it tastes of pennies.'],
    stages: [
      {
        objective: {
          kind: 'collect', area: 'treasury', label: 'A washed-up toll token', emoji: '🎫', color: 0xc89a3e,
          spots: [{ x: 1980, y: 640 }, { x: 1975, y: 1040 }, { x: 2150, y: 1120 }, { x: 2160, y: 560 }],
        },
        hint: 'Find Dobbin\'s 4 toll tokens washed up on the banks of the mint race',
      },
      {
        objective: { kind: 'defeat', encounter: 'treasury-toll-bridge' },
        hint: 'Face Tollman Levy (Toll Bridge) at the tollbooth when he sees the tokens',
      },
    ],
    complete: [
      'Over on a token, and Levy sat on the planks rubbing his head. The bakers have their grain. Bread tomorrow!',
      'Here — I kept one token back for you. And this. Carters\' purse. We\'ve had a whip-round.',
    ],
    reward: { orbs: 9, coins: 90 },
  },

  // ── 5. The Gold Standard — talk + visit + prince ─────────────────────
  {
    id: 'treasury-q-gold-standard',
    area: 'treasury',
    name: 'The Gold Standard',
    giver: 'treasury-vane',
    requires: { courtReady: 'treasury' },
    offer: [
      'All five of his officers. His Highness watched from the dome. He has asked for more gilt.',
      'Before you go in — Nell Hammerly at the mint knew him as a boy. Ask her about the first coin he struck.',
      'And go and stand at the vault door. Everything he is, is behind that door. You should see what it costs.',
    ],
    accept: ['Nell, then the vault. Then the Exchequer. I shall have the doors opened. I shall not have them polished.'],
    stages: [
      {
        objective: {
          kind: 'talk', npc: 'treasury-nell',
          lines: [
            'Bullion? He came down to the yard at seven, the King\'s boy. Asked to strike a coin. I let him.',
            'He looked at it — his father\'s face, the wheel — and asked what it was worth. I said: what you can buy.',
            'He said: then what am I worth? And the King was there, and laughed, and had him weighed. In gold. Daily.',
          ],
        },
        hint: 'Ask Nell Hammerly about the Prince as a boy',
      },
      {
        objective: { kind: 'visit', area: 'treasury', at: { x: VAULT.x, y: VAULT.y + 50 }, r: 90, label: 'The Great Vault door' },
        hint: 'Stand at the door of the Great Vault',
      },
      {
        objective: { kind: 'prince', prince: 'bullion' },
        hint: 'Face Prince Bullion at the Exchequer',
      },
    ],
    complete: [
      'He came out onto the steps and sat down and started chiselling the gilt off. With his own hands.',
      'He asked me what he weighed, without it. I said I didn\'t know. He said: good. Then nobody does.',
      'Take the Exchequer\'s purse. He says it was never his, so it may as well be yours.',
    ],
    reward: { orbs: 13, coins: 170 },
  },
];
