import type { QuestDef } from '../../../../IslesTypes';
import { GALLERY, SCAFFOLD } from './area';
import { FISH_EEL } from './items';

/**
 * The Mural Court's five side quests.
 *
 * Between them they show how the Canon of Light works on the people who must obey it: a painter
 * who has never once painted a shadow (Tobiah), a miller who grinds the banned dark pigments in
 * secret (Mother Ochre), a Clear whose portrait of her daughter was taken for its shadow
 * (Ombretta), a child who chalks shadows under strangers (Wren), and finally the boy Hue was
 * before the Gallery (the Curator). Each is someone putting a little dark back.
 */
export const MURAL_QUESTS: QuestDef[] = [
  // ── 1. A Drop of Umber — fish + deliver + visit + duel ─────────────────
  {
    id: 'mural-q-umber',
    area: 'mural',
    name: 'A Drop of Umber',
    giver: 'mural-tobiah',
    offer: [
      'Forty thousand left eyes, and not one shadow. Not one. I want to paint one, stranger. Just one. A small one.',
      'Under his heel, on the Mural. Where nobody looks. But there\'s no umber in the court. Not a grain.',
      'Except in the eels. The umber eels under the bridge ink pure umber when they bite. Catch me one?',
    ],
    accept: [
      'Iron rod or better — the river gums a soft line. Below the bridge, at the bottom. Mind nobody sees.',
    ],
    stages: [
      {
        objective: { kind: 'fish', fish: FISH_EEL, count: 1 },
        hint: 'Catch an umber eel in the pigment river below the footbridge',
      },
      {
        objective: {
          kind: 'deliver', npc: 'mural-tobiah', item: FISH_EEL, count: 1,
          lines: [
            'Look at the ink on your hands. That\'s it. That\'s the colour. I\'d forgotten. I\'d actually forgotten.',
            'I\'m going up. Stand at the foot of the scaffold and whistle if a censor comes. One thumbnail. That\'s all.',
          ],
        },
        hint: 'Bring the umber eel to Tobiah Fresco at the scaffold',
      },
      {
        objective: { kind: 'visit', area: 'mural', at: { x: SCAFFOLD.x + 60, y: SCAFFOLD.y + 60 }, r: 70, label: 'Keep watch at the scaffold' },
        hint: 'Keep watch at the foot of the scaffold while Tobiah paints',
      },
      {
        objective: {
          kind: 'duel', area: 'mural',
          foe: {
            id: 'mural-q-umber-duel',
            court: 'mural',
            name: 'Under the Heel',
            foeName: 'Inspector Glaze Albescent',
            foeElement: 'light',
            difficulty: 5,
            hpMult: 0.95,
            gimmick: 'mural-whitewash',
            at: { x: 960, y: 470 },
            look: { body: 0xf4f0e4, accent: 0xe8b830, hat: 'tophat', traits: ['glasses', 'book'], size: 1.1, eye: 0xfff0a0 },
            challenge: [
              'I inspect the Mural every hour, by the light. There is a dark mark under His Radiance\'s heel.',
              'A mark that dark is a shadow. A shadow is a hiding place. Who is hiding under His heel, painter?',
              'Stand aside, stranger. The rollers are on their way.',
            ],
            beaten: ['…It is very small. Smaller than regulation. I will write it down as a scuff. Regulation scuff.'],
            coins: 120,
          },
        },
        hint: 'Stop Inspector Glaze Albescent from liming Tobiah\'s shadow',
      },
    ],
    complete: [
      'It\'s up there. A thumbnail of umber under his heel. I did it with my little finger. My hand shook.',
      'Twenty-two years of left eyes and that\'s the best thing I ever painted. Take my wages. I\'ll be up all night.',
    ],
    reward: { orbs: 13, coins: 120 },
  },

  // ── 2. Lamp-Black — collect + talk + duel ──────────────────────────────
  {
    id: 'mural-q-lampblack',
    area: 'mural',
    name: 'Lamp-Black',
    giver: 'mural-ochre',
    offer: [
      'Lamp-black, dear. Soot off a lamp chimney. The darkest thing there is. Four sacks, hid about the court.',
      'Indigo says he can dye a bolt of cloth with it. Black cloth. Enough for one curtain.',
      'One room in this court with one curtain. One hour of night that nobody licensed. Would you fetch them?',
    ],
    accept: [
      'Behind the dye works, by the ateliers, by the south houses, and one in the lane by the yard. Soot sacks.',
    ],
    stages: [
      {
        objective: {
          kind: 'collect', area: 'mural', label: 'Sack of lamp-black', emoji: '⚫', color: 0x1e1c22,
          spots: [{ x: 90, y: 600 }, { x: 2340, y: 1000 }, { x: 620, y: 1500 }, { x: 1060, y: 1400 }],
        },
        hint: 'Gather Mother Ochre\'s 4 hidden sacks of lamp-black',
      },
      {
        objective: {
          kind: 'talk', npc: 'mural-indigo',
          lines: [
            'Lamp-black. Four sacks. Ochre\'s kept these since the Noon came. They\'ve not even gone damp. Nothing does.',
            'Into the indigo vat with it, under the blue, where the censors only ever stir. A bolt by tomorrow.',
            'Oh — don\'t turn round. The Sergeant\'s at the sluice with his hose. He smells soot like a dog smells fear.',
          ],
        },
        hint: 'Take the lamp-black to Indigo Crabbe at the dye works',
      },
      {
        objective: {
          kind: 'duel', area: 'mural',
          foe: {
            id: 'mural-q-lampblack-duel',
            court: 'mural',
            name: 'Rinsed Clean',
            foeName: 'Sergeant Rinse Pumice',
            foeElement: 'water',
            difficulty: 5,
            hpMult: 0.95,
            gimmick: '',
            at: { x: 700, y: 640 },
            look: { body: 0xe8ece8, accent: 0x8ab0c0, hat: 'helmet', traits: ['tool', 'apron'], size: 1.2, eye: 0x6a8cff },
            challenge: [
              'Soot on your sleeve, stranger. Black soot. There is no lamp in this court that burns black.',
              'I hose the river sluices clean twice a day. I can hose a stranger clean once.',
              'Hold still. This won\'t take long. It never does.',
            ],
            beaten: ['…The hose is empty. My boots are full. I am going to report this as a successful rinse.'],
            coins: 120,
          },
        },
        hint: 'See off Sergeant Rinse Pumice at the dye works',
      },
    ],
    complete: [
      'Indigo\'s got it in the vat. Black under the blue. One bolt. One curtain. One room with a night in it.',
      'We\'ll draw lots for it. Everyone\'s put their name in. Here — my grinding money. I shan\'t need it now.',
    ],
    reward: { orbs: 12, coins: 110 },
  },

  // ── 3. Face to the Wall — talk + defeat ────────────────────────────────
  {
    id: 'mural-q-face-to-wall',
    area: 'mural',
    name: 'Face to the Wall',
    giver: 'mural-ombretta',
    offer: [
      'I painted my daughter Liesl at six, with her shadow on the floor beside her. They took me, and the canvas.',
      'They say confiscated work is hung face to the wall in the Gallery\'s back room. I should like it back.',
      'Not to hang. Just to see her shadow again. Would you ask the Curator? He is frightened, but he is not cruel.',
    ],
    accept: [
      'Curator Lustre, by the Gallery steps. Tell him it\'s the girl in the blue pinafore. He\'ll know.',
    ],
    stages: [
      {
        objective: {
          kind: 'talk', npc: 'mural-lustre',
          lines: [
            'The girl in the blue pinafore. Yes. I know her. She is not in the back room.',
            'She was sent to Atelier Row twenty years ago, to Likeness, to be corrected. The shadow painted out.',
            'He has never returned her. I have never asked. Ask him yourself. He will want to fight about it.',
          ],
        },
        hint: 'Ask Curator Lustre Abbot about Ombretta\'s confiscated canvas',
      },
      {
        objective: { kind: 'defeat', encounter: 'mural-still-life' },
        hint: 'Face Portraitist Likeness (Still Life) on Atelier Row for Ombretta\'s canvas',
      },
    ],
    complete: [
      'Liesl. Six years old. And her shadow — still there. He never touched it. Twenty years and he never touched it.',
      'Look — my hands. Holding her, in the shade of my own arms. A little pink. Take this. I have nothing else.',
    ],
    reward: { orbs: 14, coins: 100 },
  },

  // ── 4. Chalk Shadows — collect + duel ──────────────────────────────────
  {
    id: 'mural-q-chalk-shadows',
    area: 'mural',
    name: 'Chalk Shadows',
    giver: 'mural-wren',
    offer: [
      'The censor tipped my satchel out by the square and kicked my charcoals everywhere. Four sticks.',
      'And the bill-sticker pasted a poster of His Radiance over every shadow I drew this week. Every single one.',
      'Will you find my charcoals? Then I\'ll draw one under HIM. Under the bill-sticker. While he\'s pasting.',
    ],
    accept: [
      'Round Palette Square, they went. They\'re black — you can\'t miss black. Nothing else is.',
    ],
    stages: [
      {
        objective: {
          kind: 'collect', area: 'mural', label: 'Wren\'s charcoal', emoji: '✏️', color: 0x1e1c22,
          spots: [{ x: 1300, y: 960 }, { x: 900, y: 820 }, { x: 1470, y: 860 }, { x: 1240, y: 690 }],
        },
        hint: 'Find Wren\'s 4 kicked charcoals round Palette Square',
      },
      {
        objective: {
          kind: 'duel', area: 'mural',
          foe: {
            id: 'mural-q-chalk-shadows-duel',
            court: 'mural',
            name: 'Posted Over',
            foeName: 'Bill-Sticker Placard Prowse',
            foeElement: 'paper',
            difficulty: 5,
            hpMult: 0.9,
            gimmick: 'mural-paint-by-numbers',
            at: { x: 1290, y: 1070 },
            look: { body: 0xe0c8a8, accent: 0xf2ead8, hat: 'cap', traits: ['pack', 'tool'], size: 1.05, eye: 0x8a8478 },
            challenge: [
              'Every shadow that child draws, I paste His Radiance over. Paste, poster, brush. Paste, poster, brush.',
              'Fourteen posters this week. FOURTEEN. Do you know what paste costs? He doesn\'t pay for paste.',
              'Give me those charcoals. I\'ll paper you over too.',
            ],
            beaten: ['…Out of paste. Out of posters. Out of puff. Let her draw. I\'ll post a notice about it. Later.'],
            coins: 120,
          },
        },
        hint: 'Stop Bill-Sticker Placard Prowse papering over Wren\'s shadows',
      },
    ],
    complete: [
      'My charcoals! I drew a shadow under the bill-sticker while he was lying down. A big one. He didn\'t notice!',
      'Here. It\'s all my coins. I was saving for a Dusk Ticket. I don\'t need one. I\'ve got charcoal.',
    ],
    reward: { orbs: 11, coins: 90 },
  },

  // ── 5. The Empty Frame — talk + visit + prince ────────────────────────
  {
    id: 'mural-q-gallery',
    area: 'mural',
    name: 'The Empty Frame',
    giver: 'mural-lustre',
    requires: { courtReady: 'mural' },
    offer: [
      'All five of his painters, beaten. His Highness watched from the glass roof. He has asked for clean brushes.',
      'Before you go in — you should know who he was. Ask Signora Vell. She knew him with chalk on his knees.',
      'And look at the empty frame by my steps. He leaves it there. He has never once said what it is for.',
    ],
    accept: [
      'Signora Vell on Atelier Row. Then the frame. Then the doors. I shall have the glare turned down. I cannot.',
    ],
    stages: [
      {
        objective: {
          kind: 'talk', npc: 'mural-ombretta',
          lines: [
            'Hue. Little Hue, with chalk on his knees. He drew shadows under everything on this row. Under me.',
            'He drew Liesl\'s shadow on the flags the day I painted her, so her portrait would have a friend.',
            'Then the Gallery took him. He came back a prince and said he\'d never met me. He walked straight through me.',
          ],
        },
        hint: 'Ask Signora Vell about Prince Hue as a boy',
      },
      {
        objective: { kind: 'visit', area: 'mural', at: { x: GALLERY.x - 290, y: GALLERY.y + 110 }, r: 70, label: 'The empty frame' },
        hint: 'Stand at the empty gilt frame by the Gallery steps',
      },
      {
        objective: { kind: 'prince', prince: 'hue' },
        hint: 'Face Prince Hue in the Shadowless Gallery',
      },
    ],
    complete: [
      'He has asked me for a lamp. He is in the back room, turning the canvases round. Every one has a shadow.',
      'He put a chalk drawing in the empty frame. A shadow. Nobody\'s, just a shadow. He signed it. Take the purse.',
    ],
    reward: { orbs: 15, coins: 220 },
  },
];
