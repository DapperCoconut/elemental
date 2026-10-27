import type { QuestDef } from '../../../../IslesTypes';

/**
 * Five small stories from inside the fort. The garrison is quietly on the people's side — wet
 * powder, a signal nobody can read, an old gunner's stolen lanyard, a sick barrack-room and a boy
 * hiding in a crater — and each quest lets you see a little more of it.
 */
export const POWDER_QUESTS: QuestDef[] = [
  {
    id: 'powder-wet-powder',
    area: 'powder',
    name: 'Wet Powder',
    giver: 'powder-wadding',
    offer: [
      'Prince Fuse wants forty kegs by week\'s end. Dry, mind — he tests every one with a match.',
      'I make honest kegs. What goes in them is the King\'s business. But a keg can leak, can\'t it?',
      'There are oilcloth rags soaking in the gutters down the alley. Bring me five. Quietly, now.',
    ],
    accept: ['Good. Don\'t let the Quartermaster see you carrying wet rags. He counts everything, even sins.'],
    stages: [
      {
        objective: {
          kind: 'collect', area: 'powder', label: 'Soaked rag', emoji: '🧽', color: 0x6a8a9a,
          spots: [{ x: 330, y: 1300 }, { x: 470, y: 1250 }, { x: 560, y: 1340 }, { x: 740, y: 1240 }, { x: 820, y: 1330 }],
        },
        hint: 'Collect 5 soaked oilcloth rags in Keg Alley',
      },
      {
        objective: {
          kind: 'talk', npc: 'powder-dobbin',
          lines: [
            'Rags? Wet ones? I\'ve seen nothing. I count kegs, not rags.',
            '…Tell Mother Wadding the damp corner of my store is the one by the north wall. A weather report.',
            'Only — Proof-Master Cindry\'s just gone round that wall with his match. If he finds the damp, we all hang.',
          ],
        },
        hint: 'Ask Quartermaster Dobbin where the store is dampest',
      },
      {
        objective: {
          kind: 'duel', area: 'powder',
          foe: {
            id: 'powder-wet-powder-duel',
            court: 'powder',
            name: 'The Match Test',
            foeName: 'Proof-Master Cindry',
            foeElement: 'fire',
            difficulty: 2,
            gimmick: '',
            at: { x: 990, y: 500 },
            look: { body: 0xd8a070, accent: 0x8a2a1a, hat: 'tophat', traits: ['glasses', 'lantern'], size: 1.05 },
            challenge: [
              'Wet rags on your boots, and the north wall weeping. Somebody\'s been watering the King\'s powder.',
              'Every keg gets the match, stranger. You\'ll do for a start. Hold still and see if you catch.',
            ],
            beaten: ['Out. My match is out. …The north wall can keep its weather. I never came round here.'],
            coins: 40,
          },
        },
        hint: 'Stop Proof-Master Cindry from testing the damp kegs (behind the Quartermastery)',
      },
    ],
    complete: [
      'The north wall? The old goat. He\'s been wetting them himself for a year, then.',
      'And you put out Cindry\'s match? Forty kegs, and not one will catch. The Prince will blame the moat. Here.',
    ],
    reward: { orbs: 3, coins: 30 },
  },
  {
    id: 'powder-semaphore',
    area: 'powder',
    name: 'Semaphore',
    giver: 'powder-pim',
    offer: [
      'I\'ve been flying the same signal for a week. HELP. FREE. COURT. Nobody answers.',
      'Maybe they can\'t read the mast from the walls. Could you go and look from where they\'d stand?',
    ],
    accept: ['Brilliant! The gun-step by the north gate first. I\'ll run the flags up again.'],
    stages: [
      {
        objective: { kind: 'visit', area: 'powder', at: { x: 1190, y: 240 }, r: 70, label: 'North gate gun-step' },
        hint: 'Look at the signal mast from the north gate gun-step',
      },
      {
        objective: { kind: 'visit', area: 'powder', at: { x: 1640, y: 1165 }, r: 70, label: 'Range tower' },
        hint: 'Look at it again from the range tower',
      },
      {
        objective: {
          kind: 'talk', npc: 'powder-brisket',
          lines: [
            'Eh? Flags? Course I see the flags. I\'m deaf, not blind.',
            'Lad\'s flown HELP FREE COURT all week. Nobody answers because nobody here knows the code but us two.',
            'Tell him: I read him. Tell him the old gunners will stand when it\'s time.',
            'But the Prince\'s new Signal-Ensign has a glass and a codebook now. If he reads it too, the lad hangs. Stop him.',
          ],
        },
        hint: 'Ask Old Gunner Brisket what the flags say',
      },
      {
        objective: {
          kind: 'duel', area: 'powder',
          foe: {
            id: 'powder-semaphore-duel',
            court: 'powder',
            name: 'Read and Report',
            foeName: 'Signal-Ensign Glint',
            foeElement: 'light',
            difficulty: 2,
            gimmick: '',
            at: { x: 1300, y: 520 },
            look: { body: 0xe8d0b0, accent: 0x2f4f8f, hat: 'tricorn', traits: ['glasses', 'book'], size: 0.95 },
            challenge: [
              'H. E. L. P. F. R. E. E. … Cracked it. The keep will want this in writing, with the boy\'s name on top.',
              'You\'re in my light. Step aside, or I\'ll flash you a message of my own.',
            ],
            beaten: ['My glass is cracked. My codebook is in the moat. …I read nothing. Clear skies, no signal.'],
            coins: 40,
          },
        },
        hint: 'Stop Signal-Ensign Glint before he reports the flags (road to the keep)',
      },
    ],
    complete: [
      'He READ me? Brisket reads me! And the Ensign — you stopped him? He\'s been squinting at my mast all week.',
      'Then it isn\'t just me. It was never just me. Take this — a week\'s pay. Mostly paid in flags.',
    ],
    reward: { orbs: 3, coins: 40 },
  },
  {
    id: 'powder-lanyard',
    area: 'powder',
    name: 'The Old Lanyard',
    giver: 'powder-brisket',
    offer: [
      'Forty years I fired the north guns. Then Hask came and said the Prince wanted "younger ears".',
      'She took my firing lanyard. Red cord, brass toggle. Wears it off her belt like a scalp.',
      'Beat her on the ridge and custom says she hands it back. Gunner\'s custom. Older than kings.',
    ],
    accept: ['Go on, then. Mind the third gun. It pulls left.'],
    stages: [
      { objective: { kind: 'defeat', encounter: 'powder-cannon-ridge' }, hint: 'Beat Gunnery-Sergeant Hask on Cannon Ridge' },
      {
        objective: {
          kind: 'collect', area: 'powder', label: 'Lanyard piece', emoji: '🪢', color: 0xa3262a,
          spots: [{ x: 1350, y: 200 }, { x: 1590, y: 190 }, { x: 1790, y: 205 }],
        },
        hint: 'Hask cut it in three and threw it off the ridge — find the pieces',
      },
      {
        objective: {
          kind: 'duel', area: 'powder',
          foe: {
            id: 'powder-lanyard-duel',
            court: 'powder',
            name: 'Younger Ears',
            foeName: 'Gunner Larkspur',
            foeElement: 'sound',
            difficulty: 2,
            gimmick: '',
            at: { x: 1150, y: 300 },
            look: { body: 0xe0b890, accent: 0xa3262a, hat: 'helmet', traits: ['scarf', 'tool'], size: 0.95 },
            challenge: [
              'That\'s the north-gun lanyard. The Prince gave those guns to me. Younger ears, he said.',
              'The cord comes with the guns. Hand it over, or I\'ll show you how loud young ears can make it.',
            ],
            beaten: ['Ringing. Everything\'s ringing. …Keep the cord. Tell the old man the third gun still pulls left.'],
            coins: 40,
          },
        },
        hint: 'Gunner Larkspur wants the lanyard for himself — beat him by the North Gate',
      },
    ],
    complete: [
      'Cut in three. That\'s Hask\'s idea of a joke. It\'s a gunner\'s idea of a splice.',
      'And young Larkspur came for it? Then he\'s learned it\'s worth fighting for. There — keep something of mine.',
    ],
    reward: { orbs: 4, coins: 25 },
  },
  {
    id: 'powder-hardtack',
    area: 'powder',
    name: 'Hardtack and Pike',
    giver: 'powder-tamp',
    offer: [
      'Half the garrison has the gripes. Hardtack, salt pork, and powder-dust in everything.',
      'Fresh fish would set them right. The moat\'s full of flint pike, and the minnows make a broth.',
      'Would you? I\'d go myself, but somebody has to hold the basin.',
    ],
    accept: ['Bless you. Reedy Nell by the moat will tell you where they bite.'],
    stages: [
      { objective: { kind: 'fish', fish: 'fish-fuse-minnow', count: 3 }, hint: 'Catch 3 Fuse Minnows in the Powder Moat' },
      {
        objective: {
          kind: 'deliver', npc: 'powder-tamp', item: 'fish-flint-pike', count: 2,
          lines: [
            'Two pike! That\'s supper for a whole barrack-room. And the minnows for broth.',
            'Oh, no. Surgeon-Major Gall smelled the pot. He says "no rations off the books". Please — keep him off it.',
          ],
        },
        hint: 'Bring 2 Flint Pike to Sister Tamp',
      },
      {
        objective: {
          kind: 'duel', area: 'powder',
          foe: {
            id: 'powder-hardtack-duel',
            court: 'powder',
            name: 'Off the Books',
            foeName: 'Surgeon-Major Gall',
            foeElement: 'slime',
            difficulty: 2,
            gimmick: '',
            at: { x: 1860, y: 790 },
            look: { body: 0xc8b090, accent: 0x3a4a2a, hat: 'tophat', traits: ['glasses', 'satchel'], size: 1.1 },
            challenge: [
              'Fish broth? In MY barracks? The men are on a strict course of hardtack and discipline.',
              'Stand aside. That pot goes in the moat, and you go on the sick list.',
            ],
            beaten: ['…Prescribe yourself whatever you like. I\'ll be in the infirmary. Lying down.'],
            coins: 40,
          },
        },
        hint: 'Keep Surgeon-Major Gall off the broth pot (road below the barracks)',
      },
    ],
    complete: [
      'The barracks smells of fish broth, nobody is groaning, and the Surgeon-Major is lying down. That is medicine.',
      'He prescribes "discipline". I prescribe supper. Take this, with my thanks.',
    ],
    reward: { orbs: 3, coins: 35 },
  },
  {
    id: 'powder-deserter',
    area: 'powder',
    name: 'Desertion',
    giver: 'powder-ash',
    offer: [
      'Don\'t shout. I\'m not here. I\'m a crater.',
      'I ran from the Minefield Drill. Ironsides sends the new lads across first, to "find" the mines.',
      'My name\'s on the Prince\'s list now. Beat Ironsides and the drill stops. And… tell my mum I\'m alive?',
    ],
    accept: ['She\'s the cooper — Mother Wadding. Don\'t say where I am. She\'ll come and box my ears.'],
    stages: [
      { objective: { kind: 'defeat', encounter: 'powder-minefield' }, hint: 'Beat Sapper Ironsides at the Minefield Drill' },
      {
        objective: {
          kind: 'talk', npc: 'powder-wadding',
          lines: [
            'He\'s ALIVE? That daft, beautiful boy.',
            'Tell him to stay hid till the Prince falls. Then he comes home and helps me with the staves.',
          ],
        },
        hint: 'Tell Mother Wadding her son is alive',
      },
      { objective: { kind: 'prince', prince: 'fuse' }, hint: 'Bring down Prince Fuse — the list burns with him' },
    ],
    complete: [
      'The Prince is down? Then the list is just paper.',
      'I\'m going home. Mum\'s going to box my ears, and I\'m going to let her. Thank you.',
    ],
    reward: { orbs: 5, coins: 50 },
  },
];
