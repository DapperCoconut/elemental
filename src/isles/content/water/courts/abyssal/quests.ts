import type { QuestDef } from '../../../../IslesTypes';

/**
 * Five small stories from the bottom of the trench: a lamplighter whose row is going dark, a
 * bone-carver who will not let Old Grey be sold, a girl writing letters to a father who is
 * asleep in the Undertow, a trench angler with a poacher problem, and the Breathwarden who has
 * counted everyone's air for eleven years and would like, finally, to stop.
 */
export const ABYSSAL_QUESTS: QuestDef[] = [
  {
    id: 'abyssal-lamps',
    area: 'abyssal',
    name: 'The Lamps Go Out',
    giver: 'abyssal-nell',
    offer: [
      'My row is going dark. The anglers in the lamps are starving — no roe has come down from the gardens in a week.',
      'Snuffer Pike fenced the roe beds. He says a house behind on its tithe has no right to a lit door.',
      'Dark doors are the ones the prince\'s lure finds at night. Bring me five clutches of glow-roe. Please.',
    ],
    accept: [
      'The beds are in the coral gardens, north-east. Roe glows blue in the clutch — you cannot miss it.',
      'And if Pike comes round with his snuffing-pole while I\'m feeding them... well. You\'ll see him.',
    ],
    stages: [
      {
        objective: {
          kind: 'collect', area: 'abyssal', label: 'Glow-roe clutch', emoji: '🫧', color: 0x6ec2ff,
          spots: [{ x: 1880, y: 500 }, { x: 2100, y: 470 }, { x: 2060, y: 640 }, { x: 1850, y: 700 }, { x: 2150, y: 660 }],
        },
        hint: 'Gather 5 clutches of glow-roe in the coral gardens (north-east)',
      },
      {
        objective: {
          kind: 'talk', npc: 'abyssal-nell',
          lines: [
            'Oh, look at them. Fat and blue. There — hear that? That little click is an angler swallowing.',
            'One by one... there. There. The whole row is lit. Mrs Dunlin\'s door, the Cobb twins\', Gilly\'s mum\'s.',
            'Here he comes. Pike. He has his pole out. Stand by my lamps, would you? Just stand there.',
          ],
        },
        hint: 'Bring the roe back to Nell on lamplighters\' row',
      },
      {
        objective: {
          kind: 'duel', area: 'abyssal',
          foe: {
            id: 'abyssal-lamps-duel',
            court: 'abyssal',
            name: 'Dark Doors',
            foeName: 'Snuffer Pike',
            foeElement: 'water',
            difficulty: 4,
            gimmick: '',
            at: { x: 1040, y: 1560 },
            look: { body: 0x4a5a66, accent: 0x1a2430, hand: 0x2e3a44, hat: 'tophat', traits: ['cane', 'book'], size: 1.15, eye: 0xbfe8ff },
            challenge: [
              'Every lamp on this row belongs to a house in arrears. A lit door is a lie. I put lies out.',
              'Stand away from the jars, diver. Or I will snuff you first and the lamps after.',
            ],
            beaten: ['Keep them lit, then. The lure will find them dark or bright. It always has.'],
            coins: 80,
          },
        },
        hint: 'Stop Snuffer Pike putting out the lamps on lamplighters\' row',
      },
    ],
    complete: [
      'Pike ran off with his pole between his legs, and every lamp still lit! I could kiss you. Roe hands, though.',
      'The row\'s whipped up a collection. It\'s mostly coins and one very nice button. Take it all.',
    ],
    reward: { orbs: 4, coins: 60 },
  },
  {
    id: 'abyssal-ribs',
    area: 'abyssal',
    name: 'Old Grey\'s Ribs',
    giver: 'abyssal-coddle',
    offer: [
      'Old Grey has held this city up for sixty years. Every arch, every post. Her bones are our bones.',
      'And the prince wants the long ribs for his throne room. Orla\'s picking them loose for him, a bit a day.',
      'Make Orla stop. Then go look at the skull, and tell me what they\'ve done to it.',
    ],
    accept: ['Mind the hagfish. They\'ve lived in Grey longer than I\'ve lived anywhere. They think she\'s theirs.'],
    stages: [
      { objective: { kind: 'defeat', encounter: 'abyssal-whale-fall' }, hint: 'Beat Bonepicker Orla at the whale fall (Whale Fall)' },
      { objective: { kind: 'visit', area: 'abyssal', at: { x: 300, y: 1320 }, r: 90, label: 'Old Grey\'s skull' }, hint: 'Look at Old Grey\'s skull at the west end of the whale fall' },
      {
        objective: {
          kind: 'duel', area: 'abyssal',
          foe: {
            id: 'abyssal-ribs-duel',
            court: 'abyssal',
            name: 'Ivory for the Crown',
            foeName: 'Scrimshander Vey',
            foeElement: 'crystal',
            difficulty: 4,
            gimmick: '',
            at: { x: 860, y: 1040 },
            look: { body: 0xc8c0b0, accent: 0x3a4a6a, hand: 0xe8e0d0, hat: 'cap', traits: ['tool', 'glasses', 'apron'], size: 0.95, eye: 0xdffaff },
            challenge: [
              'Those are my chisel marks on the skull, yes. The prince\'s throne wants a whale\'s jaw for its back.',
              'Orla only picks. I carve. And you are standing between me and a very good commission.',
            ],
            beaten: ['Fine. Grey keeps her jaw. I suppose a throne can have a plain back. Most do.'],
            coins: 80,
          },
        },
        hint: 'Scrimshander Vey is coming for the skull — stop him on the west road',
      },
    ],
    complete: [
      'Vey\'s chisels are in the trench? Good. Orla\'s gone home? Better. They\'d marked the jaw for cutting. See?',
      'I\'ll fill the marks with silver, so the prince sees where he nearly took her. Take this — from Grey and me.',
    ],
    reward: { orbs: 5, coins: 40 },
  },
  {
    id: 'abyssal-letters',
    area: 'abyssal',
    name: 'Letters Through the Wall',
    giver: 'abyssal-mira',
    offer: [
      'I push letters to my Da through the bubble wall in bottles. He\'s asleep in the Undertow. Ballast, they say.',
      'But the current brings them back. They wash up along the east wall, unopened. Four of them, this week.',
      'Quell carries the sleepers down. Maybe he\'d carry a letter. Will you gather them up and ask him?',
    ],
    accept: ['They\'re green bottles with red string round the neck. I always use red string. Da likes red.'],
    stages: [
      {
        objective: {
          kind: 'collect', area: 'abyssal', label: 'Mira\'s bottle', emoji: '🍾', color: 0x4a9a6a,
          spots: [{ x: 2250, y: 1180 }, { x: 2250, y: 1310 }, { x: 2250, y: 1450 }, { x: 2200, y: 1560 }],
        },
        hint: 'Pick up 4 of Mira\'s bottles washed up along the east wall',
      },
      {
        objective: {
          kind: 'talk', npc: 'abyssal-quell',
          lines: [
            'Letters. For a sleeper. Nobody has ever asked me that.',
            'I will carry them. I carry everything else down, I may as well carry something that is not a person.',
            'Mind Tallyhook Grell. He fishes bottles out of the current for the prince. He reads them. All of them.',
            'He will not like these leaving his water.',
          ],
        },
        hint: 'Ask Ferryman Quell at the maelstrom stair to carry the letters down',
      },
      {
        objective: {
          kind: 'duel', area: 'abyssal',
          foe: {
            id: 'abyssal-letters-duel',
            court: 'abyssal',
            name: 'Return to Sender',
            foeName: 'Tallyhook Grell',
            foeElement: 'soul',
            difficulty: 4,
            gimmick: '',
            at: { x: 1340, y: 300 },
            look: { body: 0x5a6a72, accent: 0x1e2a30, hand: 0x8aa0aa, hat: 'souwester', traits: ['rod', 'satchel', 'eyepatch'], size: 1.1, eye: 0x9fe4ff },
            challenge: [
              '"Dear Da, the lamps are on and I miss you." The prince likes to hear what the left-behind say. It is useful.',
              'Every word that goes down that stair goes through my hook first. Hand over the bottles.',
            ],
            beaten: ['Take them down, then. The sleepers cannot read. ...Can they? Nobody ever told me they could not.'],
            coins: 80,
          },
        },
        hint: 'Tallyhook Grell wants the bottles — beat him by the stair',
      },
    ],
    complete: [
      'Quell took them? All four? And Grell\'s hook got bent in HALF?',
      'I\'m writing another one tonight. A long one. Here — I saved this for when somebody helped. You helped.',
    ],
    reward: { orbs: 4, coins: 50 },
  },
  {
    id: 'abyssal-gulper',
    area: 'abyssal',
    name: 'Down on the Line',
    giver: 'abyssal-dorrit',
    offer: [
      'Trench fishing\'s not like anywhere else. Your line goes down past where the light gives up.',
      'Get yourself a whalebone rod and show me you can handle it: two lanternfish, then a gulper. A proper one.',
      'Volta\'s been setting eel-pots off my jetty, too. Wired ones. She thinks I don\'t know.',
    ],
    accept: ['Let it run when it runs. Gulpers swallow, they don\'t bite. You\'ll feel the whole weight at once.'],
    stages: [
      { objective: { kind: 'fish', fish: 'fish-lanternfish', count: 2 }, hint: 'Catch 2 Lanternfish in the trench (whalebone rod)' },
      { objective: { kind: 'fish', fish: 'fish-gulper-eel', count: 1 }, hint: 'Land a Gulper Eel in the trench' },
      {
        objective: {
          kind: 'duel', area: 'abyssal',
          foe: {
            id: 'abyssal-gulper-duel',
            court: 'abyssal',
            name: 'Live Wire',
            foeName: 'Eel-Poacher Volta',
            foeElement: 'electricity',
            difficulty: 4,
            gimmick: '',
            at: { x: 1560, y: 1000 },
            look: { body: 0x6a7a5a, accent: 0x2a3424, hand: 0xd8e858, hat: 'goggles', traits: ['tool', 'pack'], size: 1.0, eye: 0xf0ff8a },
            challenge: [
              'A gulper on a line! Do you know what the Gape\'s kitchen pays for gulper? I shock them out by the dozen.',
              'That one swam right past my pots and onto your hook. Seems only fair I take it back.',
            ],
            beaten: ['All right, all right! I\'ll pull the pots. My hair\'s going to stand up for a week.'],
            coins: 80,
          },
        },
        hint: 'Eel-Poacher Volta wants the gulper — beat her on the east road',
      },
    ],
    complete: [
      'A gulper! Look at that jaw — like an umbrella turned inside out. And Volta\'s pulled her pots? Ha!',
      'You\'ve got the wrist for the trench. Here. Fishing money. Spend it on bait and don\'t tell me if you don\'t.',
    ],
    reward: { orbs: 4, coins: 90 },
  },
  {
    id: 'abyssal-lanternjaw',
    area: 'abyssal',
    name: 'Open the Valves',
    giver: 'abyssal-ilse',
    requires: { courtReady: 'abyssal' },
    offer: [
      'You have beaten every champion in the city. Even Varn. Even the shadow.',
      'I have counted every breath in this city for eleven years. Every household. Every valve turned down.',
      'I would like to stop counting. Go into the Gape and put his lamp out. I will be at the valves.',
    ],
    accept: ['Don\'t look at the lure. Whatever he says, don\'t look at it. Then come back and watch me turn every wheel.'],
    stages: [
      { objective: { kind: 'prince', prince: 'lanternjaw' }, hint: 'Defeat Prince Lanternjaw in the Gape' },
      {
        objective: {
          kind: 'duel', area: 'abyssal',
          foe: {
            id: 'abyssal-lanternjaw-duel',
            court: 'abyssal',
            name: 'Arrears',
            foeName: 'Bellows-Master Rusk',
            foeElement: 'air',
            difficulty: 4,
            hpMult: 1.1,
            gimmick: '',
            at: { x: 1020, y: 800 },
            look: { body: 0x7a6656, accent: 0x3a2a1e, hand: 0x5a4a3e, hat: 'helmet', traits: ['tool', 'beard', 'apron'], size: 1.3, eye: 0xffc27a },
            challenge: [
              'Prince or no prince, the bellows don\'t pump for free. Forty-one houses in arrears. I have the list.',
              'Somebody has to turn the valves down. It has always been me. Step away from my Breathworks.',
            ],
            beaten: ['...It\'s just air, isn\'t it. I don\'t know why I ever thought it was mine to sell.'],
            coins: 80,
          },
        },
        hint: 'Bellows-Master Rusk is turning the valves down — stop him at the Breathworks',
      },
    ],
    complete: [
      'The lure is out and Rusk is sitting on the step with his head in his hands. Watch this.',
      'There. And there. And — listen. The whole city just breathed in. All at once. Like a sigh.',
      'There is one way left out of here, and it goes down. Quell is at the stair. I do not envy you it.',
    ],
    reward: { orbs: 7, coins: 160 },
  },
];
