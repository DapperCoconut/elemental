import type { QuestDef } from '../../../../IslesTypes';
import { MOUTH } from './area';
import { FISH_CARP } from './items';

/**
 * The Cloak Court's five side quests.
 *
 * Between them they show how being *heard* works in Cloak: the Asp's Mouth and the hand that
 * writes for it (Wenna), the cistern where the Hall's own post goes astray (Thessaly), the
 * faces that let the named slip out past the Name Booth (Pim), the Pay Office and what a dose
 * is bought with (Orrin), and finally the quiet boy the whole court listens for (Penhallow).
 * Every one is somebody who has informed, or been informed on, deciding not to any more.
 */
export const CLOAK_QUESTS: QuestDef[] = [
  // ── 1. The Asp's Mouth — talk + visit + duel ─────────────────────────
  {
    id: 'cloak-q-asps-mouth',
    area: 'cloak',
    name: 'The Asp\'s Mouth',
    giver: 'cloak-wenna',
    offer: [
      'A man paid me two coppers this morning to write a letter. Sealed it himself. Pressed his thumb in the wax.',
      'He spelled the name for me. ASHBY. Green door. "Keeps a bootleg vial," he said. Tansy Rue\'s brew.',
      'I wrote it. I always write it. Then I watched him post it in the Asp\'s Mouth, and I was sick in the gutter.',
      'The Collector empties the Mouth at the dusk bell. Would you… get it back? Before then?',
    ],
    accept: [
      'Warn Mother Ashby first. Then the Mouth — reach in past the fangs. The top letter, red wax, a thumbprint.',
    ],
    stages: [
      {
        objective: {
          kind: 'talk', npc: 'cloak-ashby',
          lines: [
            'Wenna sent you? …Named. Us. Over a vial my daughter got from a woman under the mangroves.',
            'It\'s for the baby. Born with her Mark gone bad. One drop at night or she won\'t stop shaking.',
            '(very low) If they pass us over, it\'s all of us. Five Marks in this house. Please. Get it back.',
          ],
        },
        hint: 'Warn Mother Ashby at the green door by the Mask Market',
      },
      {
        objective: { kind: 'visit', area: 'cloak', at: { x: MOUTH.x, y: MOUTH.y + 50 }, r: 70, label: 'The Asp\'s Mouth' },
        hint: 'Reach into the Asp\'s Mouth in Tattle Square for the sealed letter',
      },
      {
        objective: {
          kind: 'duel', area: 'cloak',
          foe: {
            id: 'cloak-q-asps-mouth-duel',
            court: 'cloak',
            name: 'Hand in the Mouth',
            foeName: 'Collector Hasp',
            foeElement: 'bind',
            difficulty: 4,
            hpMult: 0.95,
            gimmick: 'cloak-dead-drop',
            at: { x: 1160, y: 775 },
            look: { body: 0xb0a090, accent: 0x2a2a30, hat: 'helmet', traits: ['satchel', 'tool'], size: 1.2, eye: 0xd0d0e0 },
            challenge: [
              'Hand in the Mouth. Hand in the MOUTH. Do you know what the Asp does to hands in its mouth?',
              'I hold the only key. I carry the post to the Hall on a chain, so nobody drops a letter on the way.',
              'You\'ve dropped one on the way. Give it here, and I\'ll chain you up with the rest of the post.',
            ],
            beaten: ['…The chain\'s gone slack. I\'ll say the Mouth was light tonight. It happens. It never happens.'],
            coins: 110,
          },
        },
        hint: 'Face Collector Hasp at the Asp\'s Mouth',
      },
    ],
    complete: [
      'You have it. The thumbprint and all. I\'m going to burn it in my lamp and watch every letter go.',
      'Here — what the man paid me, and what I\'ve saved besides. It\'s the cleanest money I\'ll ever earn.',
    ],
    reward: { orbs: 10, coins: 90 },
  },

  // ── 2. Fish That Read — fish + deliver + duel ────────────────────────
  {
    id: 'cloak-q-fish-that-read',
    area: 'cloak',
    name: 'Fish That Read',
    giver: 'cloak-thessaly',
    offer: [
      'YOU! YES, YOU. COME HERE. NOBODY WHISPERS ROUND ME, SO I HEAR EVERYTHING. I READ LIPS!',
      'RUNNER CAME AT DAWN. DROPPED A LETTER IN MY CISTERN FOR THE HALL\'S BOAT. "SEVEN FOR THE COLLECTOR."',
      'MY CIPHER CARP ATE IT. HA! THEY EAT ALL THE POST. CATCH TWO AND THE LETTER\'S IN ONE OF THEM.',
      'TAKE \'EM TO BROTHER COBB. HE WROTE THE CODE. HE CAN READ IT. IRON ROD, MIND!',
    ],
    accept: [
      'CAST OFF THE WEST RIM, BY THE STEPS. THE FAT ONES LIE DEEP.',
    ],
    stages: [
      {
        objective: { kind: 'fish', fish: FISH_CARP, count: 2 },
        hint: 'Catch 2 cipher carp in the Letter Cistern (an iron rod or better)',
      },
      {
        objective: {
          kind: 'deliver', npc: 'cloak-cobb', item: FISH_CARP, count: 2,
          lines: [
            'Carp. Thessaly sent you. …Ah. There. Sodden, but the wax held. My own cipher. I\'d know it in the dark.',
            'Seven names. Seven households to be passed over at the new moon. I can warn them all before the bell.',
            'And — oh. The Hall\'s inkwarden is coming down the lane. She fishes the cistern for the post. She knows.',
          ],
        },
        hint: 'Bring 2 cipher carp to Brother Cobb on the cistern lane',
      },
      {
        objective: {
          kind: 'duel', area: 'cloak',
          foe: {
            id: 'cloak-q-fish-that-read-duel',
            court: 'cloak',
            name: 'Blot and Blot',
            foeName: 'Inkwarden Sepia',
            foeElement: 'ink',
            difficulty: 5,
            hpMult: 0.95,
            gimmick: '',
            at: { x: 1600, y: 1110 },
            look: { body: 0xb8b0c0, accent: 0x15111d, hat: 'plague', traits: ['book', 'satchel'], size: 1.05, eye: 0x9a8aff },
            challenge: [
              'The cistern is the Hall\'s letterbox. The carp are the Hall\'s carp. The letter is the Hall\'s letter.',
              'I copy it out again, you know. Every one the carp take. I remember every line I\'ve ever copied.',
              'I will remember you, too. In blot and blot and blot.',
            ],
            beaten: ['…I can\'t remember the seven names. I CAN\'T. That\'s never happened. Is this what forgetting is?'],
            coins: 110,
          },
        },
        hint: 'Face Inkwarden Sepia on the cistern rim',
      },
    ],
    complete: [
      'COBB SAYS ALL SEVEN GOT TOLD! SEVEN! HA! MY CARP! MY BEAUTIFUL GREEDY CARP!',
      'TAKE THIS. AND TAKE A CARP. NO — THE BIG ONE. GO ON. I\'LL CATCH ANOTHER. I ALWAYS DO.',
    ],
    reward: { orbs: 9, coins: 70, item: FISH_CARP, itemCount: 1 },
  },

  // ── 3. Faces for the Faceless — collect + defeat ─────────────────────
  {
    id: 'cloak-q-faces',
    area: 'cloak',
    name: 'Faces for the Faceless',
    giver: 'cloak-pim',
    offer: [
      'You\'re not from here. Good. Can I trust you? No — don\'t answer. Everybody here says yes.',
      'I make faces at night. Masks nobody\'s ever seen, for people who have to walk out past the Name Booth.',
      'The watch came through the market last night and I ran. I dropped four. Four faces, four families.',
      'If somebody hands one in, the Hall will match it to the next person who tries to leave. Find them?',
    ],
    accept: [
      'About the stalls. White, gold, a moon, a little bird-beak. Don\'t let Visage see you pick them up.',
    ],
    stages: [
      {
        objective: {
          kind: 'collect', area: 'cloak', label: 'A dropped mask', emoji: '🎭', color: 0xeee8dc,
          spots: [{ x: 320, y: 1250 }, { x: 700, y: 1250 }, { x: 880, y: 1225 }, { x: 470, y: 1405 }],
        },
        hint: 'Find the 4 masks Pim dropped in the Mask Market',
      },
      {
        objective: { kind: 'defeat', encounter: 'cloak-masquerade' },
        hint: 'Face Maskmaker Visage (Masquerade) in the Mask Market — she saw you',
      },
    ],
    complete: [
      'She let you go and she hasn\'t come for me. She asked where I got the gold leaf for the bird. That\'s all.',
      'Four faces went out past the Name Booth at the dark bell. Here — I\'d only have spent it on gesso.',
    ],
    reward: { orbs: 9, coins: 80 },
  },

  // ── 4. Grey at the Fingertips — talk + collect + duel ────────────────
  {
    id: 'cloak-q-grey-fingertips',
    area: 'cloak',
    name: 'Grey at the Fingertips',
    giver: 'cloak-orrin',
    offer: [
      'I\'m named. Passed over, three moons. My wife Lise is grey to the wrist and the Draught House won\'t see us.',
      'Informers get paid in chits. A chit at that window buys a dose. They drink the chits away at the Two Cups.',
      'Drunk men drop things. I\'ve watched. I can\'t go near — the Paymaster knows my face. Yours, he doesn\'t.',
      'Talk to Lise first. She\'ll say no. Then pick up three chits and cash them at the window yourself.',
    ],
    accept: [
      'She\'s on Hush Street by our door. She\'ll tell you not to. Listen to her. Then do it anyway.',
    ],
    stages: [
      {
        objective: {
          kind: 'talk', npc: 'cloak-lise',
          lines: [
            'Orrin sent you to steal for me. Of course he did. He\'s a good man and a terrible thief.',
            '…Every chit is a name. Somebody was sold for every dose in that window. You know that? I know it.',
            '(looking at her hands a long while) The baby on the next street was named for a chit. Go. Take them back.',
          ],
        },
        hint: 'Talk to Lise Fathom on Hush Street',
      },
      {
        objective: {
          kind: 'collect', area: 'cloak', label: 'A dropped dose-chit', emoji: '🧾', color: 0xd8b050,
          spots: [{ x: 1500, y: 790 }, { x: 1660, y: 860 }, { x: 1780, y: 770 }],
        },
        hint: 'Pick up 3 dose-chits the informers dropped outside the Two Cups',
      },
      {
        objective: {
          kind: 'duel', area: 'cloak',
          foe: {
            id: 'cloak-q-grey-fingertips-duel',
            court: 'cloak',
            name: 'Paid in Draught',
            foeName: 'Paymaster Rote',
            foeElement: 'memory',
            difficulty: 5,
            gimmick: 'cloak-poisoned-cup',
            at: { x: 380, y: 610 },
            look: { body: 0xc8bca8, accent: 0x2a5a2a, hat: 'tophat', traits: ['glasses', 'book', 'apron'], size: 1.1, eye: 0xb8f070 },
            challenge: [
              'Three chits. Tattle\'s, Brisket\'s, and the Morrow boy\'s. I remember every hand that crosses my tray.',
              'Yours has never crossed it. I remember that too. A chit is a dose to the man who earned it. Not to you.',
              'Have a drink while we discuss it. I\'ve poured two.',
            ],
            beaten: ['…Three doses. Take them. I\'ll write that I paid Tattle twice. Tattle won\'t remember. Tattle never does.'],
            coins: 110,
          },
        },
        hint: 'Cash the chits at the Pay Office window — Paymaster Rote is waiting',
      },
    ],
    complete: [
      'Three doses. Lise took the first one standing up. The grey stopped at her knuckles. It STOPPED.',
      'I\'ve nothing worth giving you. I\'m giving you it anyway. And my name, if you ever need a man to say yours.',
    ],
    reward: { orbs: 11, coins: 60 },
  },

  // ── 5. The Last Letter — talk + visit + prince ───────────────────────
  {
    id: 'cloak-q-last-letter',
    area: 'cloak',
    name: 'The Last Letter',
    giver: 'cloak-penhallow',
    requires: { courtReady: 'cloak' },
    offer: [
      'All five of his listeners, beaten. He heard every one of those fights through the horns. Every blow.',
      'He has asked for you. Not summoned — asked. I did not know he knew the word.',
      'Speak to Nanny Velour on the forecourt first. Then go and stand in the middle of the gallery. Say nothing.',
    ],
    accept: [
      'Velour first. Then the gallery. Then the Hall. I will have the doors open.',
    ],
    stages: [
      {
        objective: {
          kind: 'talk', npc: 'cloak-velour',
          lines: [
            'You\'re going in to him. Good. Somebody should, who isn\'t afraid of him, or for him.',
            'In the nest his brothers fought and shrieked and his mother struck at them all. He learned to make no sound.',
            'She never once struck the quiet one. She never once looked at him either. Go gently. Then hit him hard.',
          ],
        },
        hint: 'Talk to Nanny Velour on the Hall forecourt',
      },
      {
        objective: { kind: 'visit', area: 'cloak', at: { x: 1200, y: 340 }, r: 70, label: 'The heart of the Whispering Gallery' },
        hint: 'Stand in the middle of the Whispering Gallery and listen',
      },
      {
        objective: { kind: 'prince', prince: 'whisper' },
        hint: 'Face Prince Whisper at the Hall of Letters',
      },
    ],
    complete: [
      'He is sitting at my desk with the ream of plain paper, writing. He has written "Mother" at the top.',
      'Nothing else yet. He has looked at it for an hour. Take the Hall\'s purse — the Hall is closed.',
    ],
    reward: { orbs: 12, coins: 160 },
  },
];
