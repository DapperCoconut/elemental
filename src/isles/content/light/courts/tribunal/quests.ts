import type { QuestDef } from '../../../../IslesTypes';
import { COURTHOUSE, SCALE } from './area';
import { FISH_BARBEL, FISH_GAR } from './items';

/**
 * The Tribunal Court's five side quests.
 *
 * The last court below the Heliostat, so between them they show how Clarity is enforced: what a
 * shade-thief's trial is (Linnet, whose grandmother slept under her cart), what bail costs and why
 * it is paid in fish (Mott), what a jury is for in a court that never acquits (Tull), what the
 * Clears need and cannot have (Orla's blanket), and finally the appeal nobody has ever been allowed
 * to make (Marrable). Each is somebody asking to be allowed one patch of dark.
 */
export const TRIBUNAL_QUESTS: QuestDef[] = [
  // ── 1. Under the Cart — talk + collect + duel ────────────────────────
  {
    id: 'tribunal-q-under-the-cart',
    area: 'tribunal',
    name: 'Under the Cart',
    giver: 'tribunal-linnet',
    offer: [
      'That\'s my gran in the mirror cage. Hesper Dimm. They caught her asleep under our vegetable cart.',
      'In the shade of it. One hour. She\'s seventy-one and she hadn\'t slept since the Dusk-house queue.',
      'Her trial\'s at noon. It\'s always noon. Will you speak to her? She won\'t tell me what she wants.',
    ],
    accept: [
      'Don\'t touch the glass. It\'s hot. She\'ll wave. She waves at everyone, she can see them all at once.',
    ],
    stages: [
      {
        objective: {
          kind: 'talk', npc: 'tribunal-hesper',
          lines: [
            'A stranger! Through all this glass, from six sides at once. You\'re very handsome from the left.',
            'I did it, dear. I crawled under the cart and I slept. I had the loveliest dream. It was dark in it.',
            'But a court wants witnesses. Three people saw the cart that day and said nothing. They left notes.',
            'Statements. Tucked where the Prosecutor won\'t look. Find them, and I\'ll have a defence. Imagine!',
          ],
        },
        hint: 'Speak to Hesper Dimm through the glass of her mirror cage',
      },
      {
        objective: {
          kind: 'collect', area: 'tribunal', label: 'A witness statement', emoji: '📝', color: 0xf2e6c4,
          spots: [{ x: 300, y: 1080 }, { x: 1000, y: 1180 }, { x: 1420, y: 1680 }],
        },
        hint: 'Find the 3 witness statements tucked round the court',
      },
      {
        objective: {
          kind: 'duel', area: 'tribunal',
          foe: {
            id: 'tribunal-q-under-the-cart-duel',
            court: 'tribunal',
            name: 'The Crown Will Show',
            foeName: 'Prosecutor Glare Absolute',
            foeElement: 'light',
            difficulty: 5,
            hpMult: 0.95,
            gimmick: 'tribunal-objection',
            at: { x: 700, y: 1290 },
            look: { body: 0xf4f0e6, accent: 0xffe680, hat: 'wig', traits: ['book', 'glasses'], size: 1.15, eye: 0xfffbe0 },
            challenge: [
              'Statements? For the defence? Under a CART? The defence is not a thing this court provides.',
              'The Crown will show that the accused lay in shade. The Crown will show that shade is guilt. QED.',
              'And the Crown will show you, stranger, what an objection costs.',
            ],
            beaten: ['…The statements will be read. Into the record. Where no one reads. But they will be READ.'],
            coins: 145,
          },
        },
        hint: 'Face Prosecutor Glare Absolute in the cage yard',
      },
    ],
    complete: [
      'They read them out! Three people saying they saw a cart and an old woman and nothing wrong. In COURT.',
      'Gran\'s trial is adjourned. Adjourned! Nobody\'s ever been adjourned. She\'s waving at all of us.',
      'This is from our cart\'s takings. Please. It\'s the first good thing that ever happened to it.',
    ],
    reward: { orbs: 12, coins: 90 },
  },

  // ── 2. Bail in Barbels — fish + deliver + duel ───────────────────────
  {
    id: 'tribunal-q-bail-in-barbels',
    area: 'tribunal',
    name: 'Bail in Barbels',
    giver: 'tribunal-mott',
    offer: [
      'My boy Tam\'s in the cells for pulling his hat down over his eyes. Over his EYES. That\'s shade, they said.',
      'Bail\'s two barbels. Don\'t laugh. Forty years back a clerk wrote "barbel" for "bail" and nobody dared fix it.',
      'Clarity says a written law is a seen law. So it\'s fish. I can\'t fish — my hands shake in this heat.',
      'Catch two bail barbels from the Fountain and take them to Pettifer, the Clerk of Bail?',
    ],
    accept: [
      'Cast off the rim. They hide under the coins at the bottom, the only dark place in the court.',
    ],
    stages: [
      {
        objective: { kind: 'fish', fish: FISH_BARBEL, count: 2 },
        hint: 'Catch 2 bail barbels in the Fountain of Testimony',
      },
      {
        objective: {
          kind: 'deliver', npc: 'tribunal-pettifer', item: FISH_BARBEL, count: 2,
          lines: [
            'Two barbels. Wet, whiskered, in order. Bail is posted for Tam Haddle. I\'ll stamp it. Ah.',
            'Ah. The Bailiff is reading over my shoulder. He says bail is revoked if the fish were caught in shade.',
            'They were caught in the Fountain. At noon. He says the bottom of the Fountain is shady. He\'s coming.',
          ],
        },
        hint: 'Bring the 2 barbels to Clerk Pettifer by the courthouse steps',
      },
      {
        objective: {
          kind: 'duel', area: 'tribunal',
          foe: {
            id: 'tribunal-q-bail-in-barbels-duel',
            court: 'tribunal',
            name: 'Bail Revoked',
            foeName: 'Bailiff Clasp Ironsworn',
            foeElement: 'metal',
            difficulty: 5,
            hpMult: 0.95,
            gimmick: 'tribunal-contempt',
            at: { x: 1470, y: 900 },
            look: { body: 0x8a8278, accent: 0x3a3634, hat: 'helmet', traits: ['brand', 'cane'], size: 1.3, eye: 0xd8dade },
            challenge: [
              'Fish taken from the shady bottom of a fountain are shade-fish. Shade-fish are not tender. Bail revoked.',
              'I have a key for every cell and a law for every key. Stand inside the bounds while I find yours.',
            ],
            beaten: ['…Bail stands. The bottom of the Fountain is, for legal purposes, bright. I shall write that down.'],
            coins: 145,
          },
        },
        hint: 'Beat Bailiff Clasp Ironsworn before he takes Tam back down',
      },
    ],
    complete: [
      'Tam\'s out! He\'s got his hat in his hand, he won\'t put it on. I told him to put it on. Put it ON, Tam.',
      'Here — the last fish I bought before my hands went. A gavel gar. I was saving it for his release.',
    ],
    reward: { orbs: 11, coins: 80, item: FISH_GAR, itemCount: 1 },
  },

  // ── 3. Juror Seven — talk + visit + defeat ───────────────────────────
  {
    id: 'tribunal-q-juror-seven',
    area: 'tribunal',
    name: 'Juror Seven',
    giver: 'tribunal-tull',
    offer: [
      'Juror Seven. Four hundred and twelve trials. Four hundred and twelve times I said guilty.',
      'I never meant to. The Foreman looks at you, and the word is in your mouth before you\'ve thought it.',
      'Just once I want to vote with my own head. Old Marrable was an advocate once. She\'ll know how.',
    ],
    accept: [
      'She sits on the plaza in the full sun. She\'s a Clear. You\'ll see the scale through her. Be kind.',
    ],
    stages: [
      {
        objective: {
          kind: 'talk', npc: 'tribunal-marrable',
          lines: [
            'Juror Seven. I defended a man in front of him, once. Before. He voted guilty and he cried doing it.',
            'Twelve is no foreman. He\'s a mind that sits where yours should. A jury only thinks if he\'s beaten.',
            'Beaten in the open, where they can see it. Go to the jurors\' door and let them see you go in.',
          ],
        },
        hint: 'Ask Defender Marrable how a juror gets his own mind back',
      },
      {
        objective: { kind: 'visit', area: 'tribunal', at: { x: COURTHOUSE.x, y: COURTHOUSE.y + 30 }, r: 80, label: 'The jurors\' door' },
        hint: 'Stand at the jurors\' door on the courthouse steps, where the box can see you',
      },
      {
        objective: { kind: 'defeat', encounter: 'tribunal-jury-box' },
        hint: 'Beat Foreman Twelve (Jury Box) below the public gallery, in front of his jurors',
      },
    ],
    complete: [
      'He lost. The Foreman lost, in front of the whole box, and it was like a window opening in my head.',
      'There\'s a trial this afternoon. I\'m going to listen. Properly. I might still say guilty. I might not!',
      'My juror\'s fee. Every coin of it, for every trial. It always felt like being paid to agree.',
    ],
    reward: { orbs: 13, coins: 60 },
  },

  // ── 4. A Blanket Over the Window — collect + duel ────────────────────
  {
    id: 'tribunal-q-blanket',
    area: 'tribunal',
    name: 'A Blanket Over the Window',
    giver: 'tribunal-orla',
    offer: [
      'I sew the white hoods the condemned wear to the Glass. Thirty years. I keep the black lining scraps.',
      'They say a Clear\'s colour comes back in the dark. There is no dark. So I\'m making some. A blanket.',
      'I\'ve hidden scraps all round the court, one at a time, so the Informers wouldn\'t see a whole one.',
      'Gather them for me? Four left. I\'ll stitch the last seam and give it to the Clears on the bench.',
    ],
    accept: [
      'By the Records, by the palace railings, by the Heliostat door, by the cages. Quick hands, quiet feet.',
    ],
    stages: [
      {
        objective: {
          kind: 'collect', area: 'tribunal', label: 'A scrap of black lining', emoji: '🧵', color: 0x1e1a24,
          spots: [{ x: 1700, y: 560 }, { x: 980, y: 680 }, { x: 1080, y: 230 }, { x: 250, y: 1640 }],
        },
        hint: 'Gather the 4 scraps of black lining Orla hid round the court',
      },
      {
        objective: {
          kind: 'duel', area: 'tribunal',
          foe: {
            id: 'tribunal-q-blanket-duel',
            court: 'tribunal',
            name: 'Contraband Dark',
            foeName: 'Informer Peep Ashlar',
            foeElement: 'subterfuge',
            difficulty: 5,
            hpMult: 0.9,
            gimmick: '',
            at: { x: 2050, y: 1250 },
            look: { body: 0xcfc6b4, accent: 0x6a7088, hat: 'hood', traits: ['glasses', 'satchel'], size: 0.9, eye: 0xb8c4d8 },
            challenge: [
              'Four scraps of black, gathered in a pocket. I counted. I always count. A pocket is a kind of shade.',
              'An Informer sees what the mirrors miss. I get a Dusk Ticket for every thief. I sleep VERY well.',
              'Turn out your pockets, stranger, and come quietly into the light.',
            ],
            beaten: ['…I didn\'t see anything. I didn\'t see anything. Please don\'t tell them I didn\'t see anything.'],
            coins: 145,
          },
        },
        hint: 'Deal with Informer Peep Ashlar on the east walk before she reports the scraps',
      },
    ],
    complete: [
      'There. The last seam. Black on one side, black on the other. The most beautiful thing I\'ve ever made.',
      'They put it over their heads on the bench, the three of them, under it together. Nobody spoke.',
      'When it came off, old Wrenna\'s cheeks were pink. PINK. Take this. I\'ve been saving it for a miracle.',
    ],
    reward: { orbs: 12, coins: 100 },
  },

  // ── 5. The Last Appeal — talk + visit + prince ───────────────────────
  {
    id: 'tribunal-q-appeal',
    area: 'tribunal',
    name: 'The Last Appeal',
    giver: 'tribunal-marrable',
    requires: { courtReady: 'tribunal' },
    offer: [
      'All five of his officers. The plaza saw every one of it through the glass. They are whispering.',
      'There is a right of appeal in the old law, from the Tribunal to the scale itself. Nobody has used it.',
      'Ask Tallis at the Heliostat door what the scale is. Then stand at it. Then go in to him.',
    ],
    accept: [
      'Tallis first. He has stood at that door twenty-two years. He has seen what goes up and comes down.',
    ],
    stages: [
      {
        objective: {
          kind: 'talk', npc: 'tribunal-tallis',
          lines: [
            'The scale? Before the Noon it weighed grain. Then Verdict had a shadow put in one pan. Just a shadow.',
            'It\'s hung low on that side ever since. He says darkness weighs more than anything. Look at it yourself.',
            'An appeal to the scale is an appeal to whatever\'s in that pan. Go on. It\'s only ever been him that stood there.',
          ],
        },
        hint: 'Ask Gatewarden Tallis at the Heliostat door what the great scale is',
      },
      {
        objective: { kind: 'visit', area: 'tribunal', at: { x: SCALE.x, y: SCALE.y + 60 }, r: 80, label: 'The great scale' },
        hint: 'Stand at the foot of the great bronze scale and make your appeal',
      },
      {
        objective: { kind: 'prince', prince: 'verdict' },
        hint: 'Face Prince Verdict in the Courthouse of Clarity',
      },
    ],
    complete: [
      'He came out onto the steps with his wig in his hands. He walked to the scale and looked in the pan.',
      'It was empty, child. It was always empty. It hung low because somebody bent the beam, years ago.',
      'He sat down in the shade of it. The only shade in the court. Nobody arrested him. Take the Bench\'s purse.',
    ],
    reward: { orbs: 15, coins: 240 },
  },
];
