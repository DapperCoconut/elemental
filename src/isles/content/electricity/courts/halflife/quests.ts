import type { QuestDef } from '../../../../IslesTypes';
import { FISH_GAR, FISH_KOI } from './items';
import { Q_CLOCKS, Q_DOME, Q_GAR, Q_LEAD, Q_TICKET } from './npcs';

/**
 * The Halflife Court's five side quests.
 *
 * Between them they show how the town is kept: the Prince's lead and its recall (Marrow Pewter),
 * the glow in people's bones and the pond fish that draw it out (Tobern), the decay clocks that
 * count each household down (Mabel), the badges read at the pit-head and who reads them (Linnet),
 * and at last the boy who was lowered into the core (Halvard Moss). Each is somebody holding on
 * to something the town says must run out.
 */
export const HALFLIFE_QUESTS: QuestDef[] = [
  // ── 1. The Lead Off the Roof — collect + talk + duel ─────────────────
  {
    id: Q_LEAD,
    area: 'halflife',
    name: 'The Lead Off the Roof',
    giver: 'halflife-pewter',
    offer: [
      'When the recall came the Leadwarden\'s men stripped my roof to the rafters. Sheet by sheet, onto the cart.',
      'But they\'re careless, and the neighbours are not. Four sheets went missing off the back of it. Hidden.',
      'Find them for me? Behind the houses, under the steps. If I can show Gauss the lead, she can write me back.',
    ],
    accept: [
      'Bless you. Mind your fingers on the edges. Lead\'s soft but it bites.',
    ],
    stages: [
      {
        objective: {
          kind: 'collect', area: 'halflife', label: 'Hidden lead sheet', emoji: '🔲', color: 0x8a93a0,
          spots: [{ x: 300, y: 990 }, { x: 620, y: 1112 }, { x: 460, y: 1452 }, { x: 780, y: 1462 }],
        },
        hint: 'Find the 4 lead sheets the neighbours hid round Leadrow',
      },
      {
        objective: {
          kind: 'talk', npc: 'halflife-gauss',
          lines: [
            'Pewter, Number Six. Four sheets of Crown lead, returned. Hm. Returned is a generous word.',
            'I can write her back in good standing. A roof is a roof. The book only asks if there\'s lead on it.',
            'Oh. Oh no. That\'s the Leadwarden coming down the row. He counts his sheets. He counts them every night.',
          ],
        },
        hint: 'Show the sheets to Clerk Dimity Gauss at the Tally House',
      },
      {
        objective: {
          kind: 'duel', area: 'halflife',
          foe: {
            id: 'halflife-q-lead-roof-duel',
            court: 'halflife',
            name: 'Recalled',
            foeName: 'Leadwarden Ingot Harrow',
            foeElement: 'metal',
            difficulty: 4,
            hpMult: 0.95,
            gimmick: '',
            at: { x: 500, y: 1230 },
            look: { body: 0xb8b0a4, accent: 0x3a4048, hat: 'helmet', traits: ['tool', 'beard'], size: 1.25, eye: 0x8a93a0 },
            challenge: [
              'Four sheets short on the cart and four sheets on a widow\'s step. I can count, stranger.',
              'Lead is His Highness\'s. Lent, not given. Lent things come back. That\'s the meaning of lent.',
              'Put them down, or I\'ll recall you along with them.',
            ],
            beaten: ['…Four sheets. Lost off the cart. It happens. I\'ll write "weather". Get her roof on before I change my mind.'],
            coins: 105,
          },
        },
        hint: 'See off Leadwarden Ingot Harrow on Leadrow',
      },
    ],
    complete: [
      'The roof\'s on. Galena\'s boy came and nailed it for nothing and wouldn\'t look me in the eye. Bless him.',
      'Edwin kept a jar of coins under the hearthstone for a rainy day. It\'s raining. It always is. Take it.',
    ],
    reward: { orbs: 8, coins: 120 },
  },

  // ── 2. Gar Broth — fish + deliver + duel ─────────────────────────────
  {
    id: Q_GAR,
    area: 'halflife',
    name: 'Gar Broth',
    giver: 'halflife-tobern',
    offer: [
      'The Hodd boy\'s in the Glow Ward, green to the eyebrows. Fenn\'s packing him with gar to draw it out.',
      'She\'s run out. The pond\'s the Prince\'s coolant, see — fishing it\'s not allowed, strictly.',
      'Strictly. You\'re a stranger. Strangers don\'t know what\'s strict. Two glow gar for the Ward?',
    ],
    accept: [
      'Insulated rod, mind, or the water bites back. Cast where it\'s bluest. Gar come up for the warm.',
    ],
    stages: [
      {
        objective: { kind: 'fish', fish: FISH_GAR, count: 2 },
        hint: 'Catch 2 glow gar in the cooling pond (insulated rod)',
      },
      {
        objective: {
          kind: 'deliver', npc: 'halflife-fenn', item: FISH_GAR, count: 2,
          lines: [
            'Gar! Two, and lively. On the boy\'s chest, quick, while they\'re glowing — look, look, it\'s going into them.',
            'He\'s going grey. GREY. Oh — and here\'s the Coolant-Keeper at my door. He\'ll have seen the wet sack.',
          ],
        },
        hint: 'Bring the 2 gar to Nurse Ottilie Fenn at the Glow Ward',
      },
      {
        objective: {
          kind: 'duel', area: 'halflife',
          foe: {
            id: 'halflife-q-gar-broth-duel',
            court: 'halflife',
            name: 'Spent Fuel',
            foeName: 'Coolant-Keeper Brisk Hale',
            foeElement: 'ice',
            difficulty: 4,
            hpMult: 0.95,
            gimmick: '',
            at: { x: 1900, y: 990 },
            look: { body: 0xc8d8e0, accent: 0x1f8a7a, hat: 'diving', traits: ['tool', 'satchel'], size: 1.1, eye: 0x6ff0d0 },
            challenge: [
              'Every drop in that pond is the dome\'s coolant. Every fish in it has drunk the core. They\'re spent fuel.',
              'Spent fuel belongs to His Highness. On a sick child\'s chest is not a place His Highness keeps fuel.',
              'Give me the sack. It\'s cold work, keeping things cold. I\'m very good at it.',
            ],
            beaten: ['…They\'re only gar. The core doesn\'t miss them. Don\'t tell Moss I said that.'],
            coins: 105,
          },
        },
        hint: 'Beat Coolant-Keeper Brisk Hale on the pond lane',
      },
    ],
    complete: [
      'Fenn says the boy\'s grey all over and asking for bread. Grey and hungry! That\'s a well child, that is.',
      'Here — a koi I had in the bucket. Keep it. Don\'t eat it near anyone you love. It hums.',
    ],
    reward: { orbs: 8, coins: 100, item: FISH_KOI, itemCount: 1 },
  },

  // ── 3. Wind Them Back — collect + duel ───────────────────────────────
  {
    id: Q_CLOCKS,
    area: 'halflife',
    name: 'Wind Them Back',
    giver: 'halflife-mabel',
    offer: [
      'Three clocks on Leadrow and the dome lane are nearly at nought. Kettles, the Ambreys, old Juniper.',
      'When the hand gets there, the Tally sends the Leadwarden. I wind them. I could wind them the other way.',
      'Varley checks them every Bell. He\'ll know my hand. He won\'t know yours. Will you?',
    ],
    accept: [
      'Open the case, set the hand back a half, close it. Every half takes as long as the whole. Lovely, that.',
    ],
    stages: [
      {
        objective: {
          kind: 'collect', area: 'halflife', label: 'Decay clock (wind back a half)', emoji: '🕰️', color: 0xffb02a,
          spots: [{ x: 470, y: 1242 }, { x: 790, y: 1242 }, { x: 1610, y: 788 }],
        },
        hint: 'Wind back the decay clocks of three households: two on Leadrow, one on the dome lane',
      },
      {
        objective: {
          kind: 'duel', area: 'halflife',
          foe: {
            id: 'halflife-q-wind-back-duel',
            court: 'halflife',
            name: 'Borrowed Time',
            foeName: 'Clock-Clerk Tocsin Varley',
            foeElement: 'sand',
            difficulty: 5,
            hpMult: 0.9,
            gimmick: 'halflife-half-life',
            at: { x: 1150, y: 1040 },
            look: { body: 0xd8c8b0, accent: 0xffb02a, hat: 'tophat', traits: ['glasses', 'book', 'cane'], size: 1, eye: 0xffe08a },
            challenge: [
              'Kettles\' clock read a sixteenth this morning. It reads a quarter now. Clocks don\'t run backward.',
              'Unless someone runs them. Time is the Prince\'s, stranger. You\'re spending his.',
              'Step into the yard. I\'ll show you how fast things run out.',
            ],
            beaten: ['…Let the clocks read what they read. I\'ll put it down to damp. The case seals were always poor.'],
            coins: 105,
          },
        },
        hint: 'Face Clock-Clerk Tocsin Varley south of the Decay Square',
      },
    ],
    complete: [
      'Three households, a half each. Months. You bought them months. They\'ll never know who to thank.',
      'Here. Clock-winder\'s wages. I\'ve not much use for money. I\'ve got all the time in the world.',
    ],
    reward: { orbs: 9, coins: 110 },
  },

  // ── 4. The Hot Ticket — collect + defeat ─────────────────────────────
  {
    id: Q_TICKET,
    area: 'halflife',
    name: 'The Hot Ticket',
    giver: 'halflife-linnet',
    offer: [
      'Counter Click says Da reads hot. Every shift. Hot\'s short. Short twice — switched off. Once more, earthed.',
      'But Da keeps his own count. On slates, down the pit, every hod he fills. Three slates. Honest ones.',
      'If someone brought them up and held them under Click\'s nose — he\'d have to answer for them. Please?',
    ],
    accept: [
      'Round the pit rim. One by the fence, one up north past the benches, one by the tubs. Mind the edge.',
    ],
    stages: [
      {
        objective: {
          kind: 'collect', area: 'halflife', label: 'Ned Hodd\'s tally slate', emoji: '🪨', color: 0xd8d4c8,
          spots: [{ x: 200, y: 600 }, { x: 500, y: 200 }, { x: 840, y: 470 }],
        },
        hint: 'Find Ned Hodd\'s 3 tally slates round the rim of the pit',
      },
      {
        objective: { kind: 'defeat', encounter: 'halflife-geiger' },
        hint: 'Show the slates to Counter Click at the pit rim — he will not take it quietly',
      },
    ],
    complete: [
      'Gauss read the slates aloud at the Tally. Every hod. Da was never short. Not once. Not ever.',
      'Click\'s counter clicks whenever you tap it. Everybody saw. Here — Da\'s pit-money. He says it\'s yours.',
    ],
    reward: { orbs: 9, coins: 90 },
  },

  // ── 5. Down on the Chain — talk + visit + prince ─────────────────────
  {
    id: Q_DOME,
    area: 'halflife',
    name: 'Down on the Chain',
    giver: 'halflife-moss',
    requires: { courtReady: 'halflife' },
    offer: [
      'All five. His Highness has put on a second pair of gloves, which means he is going to fight you.',
      'Before you go in, you should know what he is. Ask Ottilie Fenn. She was there.',
      'Then go and stand at the old charging hatch in the forecourt. Where the chain went down.',
    ],
    accept: [
      'Fenn, then the hatch. Then the door. I will open it. Nobody else ever has.',
    ],
    stages: [
      {
        objective: {
          kind: 'talk', npc: 'halflife-fenn',
          lines: [
            'He was six. The Empress came down from the Coil with a lead chain and a harness, small, made to measure.',
            'They lowered him into the core to be charged. For the Endless Current. Ten minutes. He came up glowing.',
            'He reached for his mother and she stepped back. She was wearing lead. He has never been held since.',
          ],
        },
        hint: 'Ask Nurse Ottilie Fenn about the Prince as a boy',
      },
      {
        objective: { kind: 'visit', area: 'halflife', at: { x: 2080, y: 520 }, r: 70, label: 'The old charging hatch' },
        hint: 'Stand at the old charging hatch in the reactor forecourt',
      },
      {
        objective: { kind: 'prince', prince: 'isotope' },
        hint: 'Face Prince Isotope at the Reactor Dome',
      },
    ],
    complete: [
      'He is sitting on the forecourt with his gloves off. He took my hand. I have blistered. I am not letting go.',
      'He asked me to give you the dome\'s purse. He said half. Then he said no — all of it. It was the first whole thing.',
    ],
    reward: { orbs: 11, coins: 200 },
  },
];
