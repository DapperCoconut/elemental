import type { QuestDef } from '../../../../IslesTypes';
import { FISH_CARP, FOOD_CORNETTO, RECIPE_CORNETTO } from './items';

/**
 * The Brass Court's five side quests.
 *
 * The first court on Choirholm, so between them they show how the Score works: the Part and
 * the reed it's stamped on (Nell), the faltering that gets a voice muted (Wheezy), what the
 * muted have left and what is fined as noise (Tilly), the drill and its punishments (Tam), and
 * finally why the Herald of the Hours plays so loud (Crook). Each is somebody keeping a note
 * of their own.
 */
export const BRASS_QUESTS: QuestDef[] = [
  // ── 1. A Reed Stamped Wrong — talk + collect + duel ─────────────────
  {
    id: 'brass-q-wrong-reed',
    area: 'brass',
    name: 'A Reed Stamped Wrong',
    giver: 'brass-nell',
    offer: [
      '(whispering) My reed says F, but my voice came in an E. A little low. It always comes out E.',
      'Tuner Sharpe wrote my name down at Matins. If he hears it again, they\'ll take my voice for the Organ.',
      'If my reed said E... I\'d be in tune. I\'d be RIGHT. Mister Ingot at the foundry stamps the reeds.',
      'Would you ask him? Please? Quietly.',
    ],
    accept: [
      'Thank you! He\'s by the foundry, by the big lathe. He\'s grumpy but he\'s kind.',
    ],
    stages: [
      {
        objective: {
          kind: 'talk', npc: 'brass-ingot',
          lines: [
            'Pennywhistle? F. I remember. A tiny thing, she was. Voice came in low, did it? It happens.',
            'Restamp it? It\'s not done. A reed is a Part, and a Part is the Maestro\'s. But...',
            'I\'ve no blanks. They\'re counted. Except the spoiled ones swept out in the yard with the shavings.',
            'Bring me three blanks off the yard floor, and I\'ll stamp her an E. And I\'ll never have done it.',
          ],
        },
        hint: 'Ask Gaffer Ingot at the Horn-Foundry about Nell\'s reed',
      },
      {
        objective: {
          kind: 'collect', area: 'brass', label: 'A spoiled reed-blank', emoji: '🪙', color: 0xd8a83a,
          spots: [{ x: 300, y: 1330 }, { x: 640, y: 1370 }, { x: 820, y: 1330 }],
        },
        hint: 'Pick 3 spoiled reed-blanks out of the shavings in the foundry yard',
      },
      {
        objective: {
          kind: 'duel', area: 'brass',
          foe: {
            id: 'brass-q-wrong-reed-duel',
            court: 'brass',
            name: 'Sharp, Not Flat',
            foeName: 'Tuner Vernier Sharpe',
            foeElement: 'metal',
            difficulty: 4,
            hpMult: 0.95,
            gimmick: 'brass-tuning-forks',
            at: { x: 1250, y: 1560 },
            look: { body: 0xd0d4dc, accent: 0x8a92a0, hat: 'tophat', traits: ['glasses', 'book'], size: 1.1, eye: 0xc8e8ff },
            challenge: [
              'A blank, out of the foundry, in a stranger\'s pocket. On its way to a child marked down as faltering.',
              'A Part is not altered to fit a voice. A voice is altered to fit the Part. Or it is taken.',
              'Hand me the blanks. And then hold still while I find out what note you are.',
            ],
            beaten: ['...She sang the E. It matched. I heard it match. I shall... cross her name out. In pencil.'],
            coins: 105,
          },
        },
        hint: 'Face Tuner Vernier Sharpe before he takes the blanks',
      },
    ],
    complete: [
      'E! It says E! Mister Ingot stamped it and pinned it on and I sang it and it MATCHED.',
      'Here — it\'s my pocket money. All of it. Mum says you can\'t refuse it or it\'s rude.',
    ],
    reward: { orbs: 11, coins: 60 },
  },

  // ── 2. Wind for Wheezy — fish + cook + deliver + duel ────────────────
  {
    id: 'brass-q-wind-for-wheezy',
    area: 'brass',
    name: 'Wind for Wheezy',
    giver: 'brass-bunce',
    offer: [
      'Old Wheezy Bellows ran short of breath at Compline. Fifty-one years on the tuba and he ran short.',
      'That\'s faltering. The Lung-Warden marked him. Once more and he\'s muted, and his voice goes up the hill.',
      'What he needs is a Carp Cornetto. Fish feeds the lungs, my mother swore by it. I\'ve no carp, love.',
      'Catch me two cornet carp off the Bandlake? Then we\'ll bake it, and you\'ll run it up to him.',
    ],
    accept: [
      'Off the lake shore, any spot. Carp love the floating stage. Then flour, fish, my oven. Quick.',
    ],
    stages: [
      {
        objective: { kind: 'fish', fish: FISH_CARP, count: 2 },
        hint: 'Catch 2 cornet carp in the Bandlake',
      },
      {
        objective: { kind: 'cook', recipe: RECIPE_CORNETTO },
        hint: 'Bake a Carp Cornetto at The Oompah Bun (a carp and a bag of Slide\'s flour)',
      },
      {
        objective: {
          kind: 'deliver', npc: 'brass-wheezy', item: FOOD_CORNETTO, count: 1,
          lines: [
            'Bertha\'s cornetto! Still warm. You blow down the end first — (pfff) — there. Tradition.',
            '(munch) Oh. Oh, that\'s the stuff. I can feel it in my chest already.',
            'Uh-oh. There\'s the Lung-Warden, on the lawn. He\'s seen you feeding me. Feeding is "aiding a falter".',
          ],
        },
        hint: 'Take the Carp Cornetto up to Wheezy at the east bandstand',
      },
      {
        objective: {
          kind: 'duel', area: 'brass',
          foe: {
            id: 'brass-q-wind-for-wheezy-duel',
            court: 'brass',
            name: 'Aiding a Falter',
            foeName: 'Lung-Warden Gale Puffington',
            foeElement: 'pressure',
            difficulty: 4,
            hpMult: 0.95,
            gimmick: 'brass-sousaphone',
            at: { x: 2300, y: 1250 },
            look: { body: 0xd8c4b0, accent: 0x5aa894, hat: 'bandmaster', traits: ['satchel', 'glasses'], size: 1.15, eye: 0xb8f0e0 },
            challenge: [
              'A bandsman\'s breath is the Maestro\'s breath, lent to him for the Score. If it runs short, it is returned.',
              'Feeding a faltering man so he lasts another Hour is aiding a falter. There is a fine for that.',
              'The fine is wind. Let\'s see how much of yours there is.',
            ],
            beaten: ['...He has wind enough for Vespers, I suppose. I shall measure him again. Next year. Perhaps.'],
            coins: 105,
          },
        },
        hint: 'See off Lung-Warden Gale Puffington on the east lawn',
      },
    ],
    complete: [
      'Wheezy played through Vespers and never ran short once! The whole band heard him!',
      'Here, dear — a bun for the road, and Wheezy\'s sent his tips from the bandstand box. Don\'t argue.',
    ],
    reward: { orbs: 12, coins: 70 },
  },

  // ── 3. His Own Tune — collect + talk + duel ──────────────────────────
  {
    id: 'brass-q-own-tune',
    area: 'brass',
    name: 'His Own Tune',
    giver: 'brass-tilly',
    offer: [
      '(She signs, slowly: her husband Ned played a cornet. One Vespers he played a tune of his own.)',
      '(She signs: the Tuners took his voice for it. She sang out when they did. They took hers too.)',
      '(She signs: she wrote his tune down from memory. The Hush tore it up for noise. It blew away.)',
      '(She signs, pointing: the pages are all along the lakeshore. Four of them. Will you find them?)',
    ],
    accept: [
      '(She signs: then take them to Hazel, his pupil, at the Great Bandstand. She touches her heart.)',
    ],
    stages: [
      {
        objective: {
          kind: 'collect', area: 'brass', label: 'A torn page of Ned\'s tune', emoji: '🎼', color: 0xf2e6c8,
          spots: [{ x: 1600, y: 1066 }, { x: 1960, y: 1066 }, { x: 2290, y: 1300 }, { x: 1700, y: 1470 }],
        },
        hint: 'Gather the 4 torn pages of Ned Tacet\'s tune along the Bandlake shore',
      },
      {
        objective: {
          kind: 'talk', npc: 'brass-hazel',
          lines: [
            'These are... Ned\'s. This is the Vespers tune. The one they took him for. Tilly wrote it out?',
            'I can play this. Soft. Very soft. Soft enough it might be a cornet warming up. Nobody can fine that.',
            'Oh no. Damper. The Hush warden on the lawn. He\'s seen the pages. He\'s coming over.',
          ],
        },
        hint: 'Bring the pages to Hazel Flugel at the Great Bandstand',
      },
      {
        objective: {
          kind: 'duel', area: 'brass',
          foe: {
            id: 'brass-q-own-tune-duel',
            court: 'brass',
            name: 'Noise Is Fined',
            foeName: 'Hush-Warden Felton Damper',
            foeElement: 'silence',
            difficulty: 5,
            hpMult: 0.95,
            gimmick: '',
            at: { x: 1000, y: 1080 },
            look: { body: 0xe0d8d0, accent: 0xc4cede, hat: 'earmuffs', traits: ['lantern', 'scarf'], size: 1.1, eye: 0xd8e4ff },
            challenge: [
              '(very quietly) Paper with notes on it that are not the Score. That is written noise. Tear it up.',
              'I tore it once already. I tore it into four. It is very rude of it to come back.',
              'Shh. Shh. I will be quick, and you will be quiet.',
            ],
            beaten: ['(barely a breath) ...Warming up. A cornet warming up. That\'s... not noise. Strictly.'],
            coins: 105,
          },
        },
        hint: 'Silence Hush-Warden Felton Damper before he takes the pages',
      },
    ],
    complete: [
      '(Hazel played it at dusk, soft as a cornet warming up. Tilly signs: thank you. Thank you. Thank you.)',
      '(She presses Ned\'s old cornet mouthpiece and a purse into your hand, and signs: for the road.)',
    ],
    reward: { orbs: 13, coins: 80 },
  },

  // ── 4. Drummed Out — collect + defeat ────────────────────────────────
  {
    id: 'brass-q-drummed-out',
    area: 'brass',
    name: 'Drummed Out',
    giver: 'brass-tam',
    offer: [
      'I rushed at Vespers. Half a beat. Drum-Major Strut slit my drumhead and threw the bits across the square.',
      'That\'s drummed out. Twice now. Three times and the Tuners come for you. I\'m nine.',
      'If I had my drum back together I could practise till I never rush again. Will you find the bits?',
      'And... would you march out of step in front of him? Somebody should. And not get drummed out.',
    ],
    accept: [
      'The hoop, the head and my sticks. Round the edges of the square. Mind the band — they don\'t stop.',
    ],
    stages: [
      {
        objective: {
          kind: 'collect', area: 'brass', label: 'A piece of Tam\'s drum', emoji: '🥁', color: 0xb8262e,
          spots: [{ x: 270, y: 662 }, { x: 860, y: 300 }, { x: 560, y: 664 }],
        },
        hint: 'Find the 3 pieces of Tam\'s drum round the edges of the drill square',
      },
      {
        objective: { kind: 'defeat', encounter: 'brass-marching-band' },
        hint: 'Break step in front of Drum-Major Strut (Marching Band) on the drill square',
      },
    ],
    complete: [
      'You broke the column! The band went round you! Strut stood there with his mace up and said "...as you were".',
      'Here — my drumming money. From the Hours. I\'m going to earn it all back by not rushing.',
    ],
    reward: { orbs: 11, coins: 55 },
  },

  // ── 5. The Bandhall Doors — talk + visit + prince ────────────────────
  {
    id: 'brass-q-bandhall',
    area: 'brass',
    name: 'The Bandhall Doors',
    giver: 'brass-crook',
    requires: { courtReady: 'brass' },
    offer: [
      'All five of them. His Highness heard every one of those fights from the Bandhall. He played louder.',
      'Before you go in — you should know why he plays so loud. Wheezy Bellows taught him. Ask Wheezy.',
      'And then stand under the Fanfare Gate at dusk. Listen up the hill. You\'ll understand him better.',
    ],
    accept: [
      'Wheezy, then the gate. Then the Bandhall doors. I\'ll have them open.',
    ],
    stages: [
      {
        objective: {
          kind: 'talk', npc: 'brass-wheezy',
          lines: [
            'Toby Blare. Second cornet, aged ten. Fine little player. His mam sang at Vespers in her own key.',
            'She just liked it better. The Tuners took her voice that night. Up the hill, into the Organ.',
            'Next Hour, he played so loud you couldn\'t hear the Organ at all. He\'s played that loud ever since.',
            'At Compline, you can hear your own in the Organ, if you listen. He has never once let himself listen.',
          ],
        },
        hint: 'Ask Wheezy Bellows about the Prince as a boy',
      },
      {
        objective: { kind: 'visit', area: 'brass', at: { x: 1200, y: 240 }, r: 80, label: 'Under the Fanfare Gate' },
        hint: 'Stand under the Fanfare Gate and listen up the hill',
      },
      {
        objective: { kind: 'prince', prince: 'fanfare' },
        hint: 'Face Prince Fanfare at the Bandhall',
      },
    ],
    complete: [
      'He\'s on the Bandhall step with the trumpet across his knees. He asked me what that sound was, up the hill.',
      'I told him it was the Organ. He said: "Which one is she?" I didn\'t know. He\'s still listening.',
      'Take the steward\'s purse. He says the Bandhall can be quiet now. It will cost us nothing at all.',
    ],
    reward: { orbs: 14, coins: 160 },
  },
];
