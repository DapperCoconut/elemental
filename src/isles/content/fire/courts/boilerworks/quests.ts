import type { QuestDef } from '../../../../IslesTypes';
import { ENC_CONVEYOR, ENC_OVERPRESSURE } from './encounters';
import {
  NPC_AMBROSE, NPC_CRANKSHAW, NPC_DAGNY, NPC_IDA, NPC_NAN, NPC_PIP, NPC_WENDEL,
  Q_BELL, Q_BREAM, Q_GOBY, Q_GREASE, Q_WHISTLE,
} from './npcs';
import { BELL_TOWER, TOWER } from './areaArt';

/**
 * Five small stories from the Boilerworks: a bell rung an hour early, a supper caught from the
 * cooling pond, a fish that reads truer than the Prince's gauges, a grease run that is really a
 * union meeting, and the strike whistle that brings the whole works to a stop.
 */

const AREA = 'boilerworks';

export const BOILERWORKS_QUESTS: QuestDef[] = [
  {
    id: Q_BELL, area: AREA, name: 'Ring Out of Turn', giver: NPC_AMBROSE,
    offer: [
      'The Prince has the night shift woken an hour before the bell. Then they wait. In the cold. For the bell.',
      'Says it builds punctuality. I say it builds graves.',
      'If I ring an hour early, the morning shift goes off early and the night shift sleeps that hour in their bunks.',
      'But Crankshaw jammed the clapper with wedges and took the key. Help me?',
    ],
    accept: [
      'He threw the wedges down off the belfry. They\'ll be lying about near the tower. Three of them.',
    ],
    stages: [
      {
        objective: {
          kind: 'collect', area: AREA, label: 'Clapper wedge', emoji: '🔩', color: 0xd6ad4a,
          spots: [{ x: 1450, y: 690 }, { x: 1680, y: 470 }, { x: 1830, y: 640 }],
        },
        hint: 'Find 3 clapper wedges thrown off the shift-bell tower',
      },
      {
        objective: { kind: 'visit', area: AREA, at: { x: BELL_TOWER.x + 40, y: BELL_TOWER.y + 30 }, r: 70, label: 'Bell rope' },
        hint: 'Pull the shift-bell rope an hour early',
      },
      {
        objective: {
          kind: 'talk', npc: NPC_NAN,
          lines: [
            'Was that the bell? It was! An hour early! The whole night shift went straight back to their cots.',
            'Forty people asleep at once. Listen. You can hear the snoring over the boilers.',
            'But hark — that\'s Clatt\'s rattle. Crankshaw\'s knocker-up, come to drag them out again. Stop him.',
          ],
        },
        hint: 'See how the night shift took it — ask Nan Rivet at the bunkhouses',
      },
      {
        objective: {
          kind: 'duel', area: AREA,
          foe: {
            id: 'boilerworks-ring-early-duel',
            court: 'boilerworks',
            name: 'Rise and Shine',
            foeName: 'Knocker-Up Clatt',
            foeElement: 'sound',
            difficulty: 2,
            gimmick: '',
            at: { x: 1610, y: 1360 },
            look: { body: 0xb89878, accent: 0x4a3a2a, hat: 'cap', traits: ['tool', 'scarf'], size: 0.9 },
            challenge: [
              'The bell rang early, so the overseer says I knock early. Rattle on every shutter till they\'re up.',
              'Stand aside, or I\'ll rattle you awake too. Permanently.',
            ],
            beaten: ['Fine. Let them snore. My ears could use the hour as well.'],
            coins: 40,
          },
        },
        hint: 'Stop Knocker-Up Clatt from rattling the night shift awake (by the bunkhouses)',
      },
    ],
    complete: [
      'I heard it from up here. Rang clean. Rang right. And then I heard Clatt\'s rattle stop dead.',
      'Forty kept their hour. Take this — it\'s more than the Prince ever paid for one.',
    ],
    reward: { orbs: 3, coins: 40 },
  },
  {
    id: Q_BREAM, area: AREA, name: 'Supper from the Cooling Pond', giver: NPC_NAN,
    offer: [
      'The Company Store sells me boiled water and calls it soup. Forty mouths, and I\'ve got boiled water.',
      'The cooling pond\'s full of bream. Comes out cooked, even. But the overseer says the fish are company property.',
      'You\'re not company. Catch me three and nobody can say a thing.',
    ],
    accept: [
      'Dagny at the pond will show you where they bite. You\'ll need an iron rod — the steam warps wood.',
    ],
    stages: [
      {
        objective: { kind: 'fish', fish: 'fish-boiled-bream', count: 3 },
        hint: 'Catch 3 Boiled Bream in the cooling pond',
      },
      {
        objective: {
          kind: 'deliver', npc: NPC_NAN, item: 'fish-boiled-bream', count: 3,
          lines: [
            'Oh, look at them. Fat as foremen. Into the pot, the lot of you.',
            'Uh-oh. Tally from the Company Store saw you carry them in. He\'s outside, ledger out. Don\'t let him in.',
          ],
        },
        hint: 'Bring the bream to Nan Rivet at the bunkhouses',
      },
      {
        objective: {
          kind: 'duel', area: AREA,
          foe: {
            id: 'boilerworks-bream-supper-duel',
            court: 'boilerworks',
            name: 'Company Property',
            foeName: 'Storeman Tally',
            foeElement: 'fortune',
            difficulty: 2,
            gimmick: '',
            at: { x: 2000, y: 1330 },
            look: { body: 0xd0b090, accent: 0x6a5a20, hat: 'tophat', traits: ['book', 'glasses'], size: 1 },
            challenge: [
              'Three bream, company pond. That\'s three fish owed, plus pot rent, plus the salt. Plus interest.',
              'Pay it in coin or I take it out of you. The Store always collects.',
            ],
            beaten: ['Entered as... a loss. Spilled in transit. The fish are yours. Today.'],
            coins: 40,
          },
        },
        hint: 'Run Storeman Tally off before he takes the supper (outside the bunkhouses)',
      },
    ],
    complete: [
      'Tally ran back to his ledger with his hat in his hand. I watched from the window.',
      'Fish soup, real fish soup, for three bunkhouses. I may cry into it. Adds salt.',
    ],
    reward: { orbs: 3, coins: 30 },
  },
  {
    id: Q_GOBY, area: AREA, name: 'A True Reading', giver: NPC_DAGNY,
    offer: [
      'See the goby\'s spots? They shift with the pressure in the water. Old stokers used them before brass dials.',
      'Thing is, the pond\'s been reading hot for months. Hotter than any gauge on the yard says.',
      'Somebody\'s fixed the yard gauges to read low. Catch me a goby and show Wendel. He\'ll know what it means.',
    ],
    accept: ['Gobies hide under the outflow. Be patient. They\'re shy, and they\'re smarter than the Prince.'],
    stages: [
      {
        objective: { kind: 'fish', fish: 'fish-gauge-goby', count: 1 },
        hint: 'Catch a Gauge Goby in the cooling pond',
      },
      {
        objective: {
          kind: 'deliver', npc: NPC_WENDEL, item: 'fish-gauge-goby', count: 1,
          lines: [
            'Let me see... spots all bunched to the tail. That\'s past the red. Way past.',
            'Every needle on the yard reads a third low. The Prince has us running at a pressure that\'ll kill someone.',
            'And it\'s Kessel\'s boiler that takes the worst of it. Somebody has to vent that heart before it goes.',
          ],
        },
        hint: 'Show the goby to Wendel Coke by the Great Boiler',
      },
      {
        objective: { kind: 'defeat', encounter: ENC_OVERPRESSURE },
        hint: 'Vent Kessel the Boiler-Heart (Overpressure)',
      },
    ],
    complete: [
      'Pond\'s already cooling. The goby\'s spots have spread right out — that\'s a calm fish.',
      'You saved a boiler and a man inside it. Not many can say that.',
    ],
    reward: { orbs: 4, coins: 20 },
  },
  {
    id: Q_GREASE, area: AREA, name: 'Grease Run', giver: NPC_PIP,
    offer: [
      'Psst. Ida needs a message carried, and I\'ve got grease to fetch, and I can\'t do both.',
      'Can you take her this note? She\'s round the back of the end bunkhouse. Don\'t read it.',
    ],
    accept: ['Thanks! Don\'t let Crankshaw see you, nor his earwigs! They see everything! Except under the gantries.'],
    stages: [
      {
        objective: {
          kind: 'talk', npc: NPC_IDA,
          lines: [
            'A note from Pip? ...Right. Tonight, then.',
            'We\'re meeting after second shift. Forty of us. But the bunkhouse back gate screams like a kettle.',
            'Pip stashes oil cans under the gantries where the overseer never looks. Fetch four, grease the gate.',
          ],
        },
        hint: 'Take Pip\'s note to Ida Gasket behind the end bunkhouse',
      },
      {
        objective: {
          kind: 'collect', area: AREA, label: 'Oil can', emoji: '🛢️', color: 0x3a3a3a,
          spots: [{ x: 480, y: 1015 }, { x: 860, y: 990 }, { x: 1760, y: 880 }, { x: 1735, y: 1160 }],
        },
        hint: 'Collect 4 oil cans hidden under the overhead gantries',
      },
      {
        objective: { kind: 'visit', area: AREA, at: { x: 2210, y: 1360 }, r: 60, label: 'Bunkhouse back gate' },
        hint: 'Grease the bunkhouse back gate',
      },
      {
        objective: {
          kind: 'duel', area: AREA,
          foe: {
            id: 'boilerworks-grease-run-duel',
            court: 'boilerworks',
            name: 'Ears on the Gate',
            foeName: 'Earwig Tull',
            foeElement: 'shadow',
            difficulty: 2,
            gimmick: '',
            at: { x: 2150, y: 1450 },
            look: { body: 0x6a5a50, accent: 0x1c1a1e, hat: 'beanie', traits: ['mask', 'satchel'], size: 0.95 },
            challenge: [
              'A gate that\'s screamed for ten years goes quiet the same night as a note from Pip? Funny, that.',
              'Crankshaw pays a mark a name. Forty names behind this gate. Move, runner.',
            ],
            beaten: ['I heard nothing. I saw nothing. ...Crankshaw\'s not getting a single name.'],
            coins: 40,
          },
        },
        hint: 'Stop Earwig Tull before he carries the meeting to Crankshaw (behind the bunkhouses)',
      },
    ],
    complete: [
      'You greased the gate AND sat on Earwig Tull? Ida says it went quiet as a fish. Proper runner, you.',
      'Here — grease money. That\'s what we call it. Don\'t tell anyone what it\'s really for.',
    ],
    reward: { orbs: 3, coins: 30 },
  },
  {
    id: Q_WHISTLE, area: AREA, name: 'Blow the Whistle', giver: NPC_IDA,
    requires: { questDone: Q_GREASE },
    offer: [
      'Forty hands said yes. The plan\'s simple: the Great Boiler\'s whistle is the strike signal.',
      'One long blast and every belt, hammer and valve on the yard stops. All at once. He can\'t mark us all.',
      'Two things in the way. Brindle reports every name he hears. And Crankshaw has the whistle key.',
    ],
    accept: [
      'Put Brindle on his own belt so he can\'t run tattling. Then lean on Crankshaw. He\'s a coward with a book.',
    ],
    stages: [
      {
        objective: { kind: 'defeat', encounter: ENC_CONVEYOR },
        hint: 'Beat Foreman Brindle on the Conveyor Floor',
      },
      {
        objective: {
          kind: 'talk', npc: NPC_CRANKSHAW,
          lines: [
            'The whistle key? Absolutely not. It is company property and I am the company\'s eyes.',
            '...Brindle is where? On his own belt? Going backwards?',
            'Here. Take it. I was never here. I did not see you. There will be no page about this.',
          ],
        },
        hint: 'Get the whistle key from Overseer Crankshaw',
      },
      {
        objective: { kind: 'visit', area: AREA, at: { x: TOWER.x + 150, y: TOWER.y + 50 }, r: 70, label: 'Strike whistle valve' },
        hint: 'Open the strike whistle at the foot of the Great Boiler',
      },
      {
        objective: { kind: 'prince', prince: 'gauge' },
        hint: 'The yard has stopped. Face Prince Gauge at his control tower',
      },
    ],
    complete: [
      'You should have seen him come down off that tower. Red as his own gauge.',
      'The yard\'s ours now. Not the King\'s, not the Prince\'s. Ours. Thank you, stoker.',
    ],
    reward: { orbs: 6, coins: 80 },
  },
];
