import type { QuestDef } from '../../../../IslesTypes';
import { FISH_DART } from './items';
import { Q_OFF, Q_RADIO, Q_RECKON, Q_SEVEN, Q_SPARK } from './npcs';

/**
 * The Circuit Court's five side quests.
 *
 * Circuit is where the Draw is reckoned, so between them they show the machinery: a card punched
 * wrong and the household switched off for it (Nell), the fish that is "unmetered current" and the
 * meter-reader who says so (Wick), an automaton that has worked out its fee is a fraud (Unit Seven),
 * the pirate radio that reads out the names of the earthed (Hesper), and finally what the Tabulator
 * did to the boy it raised before you face him (Tull). Each is somebody asking to be a name.
 */
export const CIRCUIT_QUESTS: QuestDef[] = [
  // ── 1. Off by One — collect + talk + duel ────────────────────────────
  {
    id: Q_OFF,
    area: 'circuit',
    name: 'Off by One',
    giver: 'circuit-nell',
    offer: [
      'I punched my mother\'s card wrong. One hole, one column over. The Tabulator read her short.',
      'Her lock\'s red. Switched off — that\'s twice. Three and they take her up the Coil.',
      'The bad card got kicked out with the misfeeds. They blow all over the mill floor till the sweepers come.',
      'If you could find the misfeeds — four of them — Operator Dekker could re-read hers. Please?',
    ],
    accept: [
      'Round the mills — by the hoppers, the decks, the yard. Then up to the Tabulator steps. Thank you.',
    ],
    stages: [
      {
        objective: {
          kind: 'collect', area: 'circuit', label: 'A misfed card', emoji: '🗂️', color: 0xe8d8b0,
          spots: [{ x: 150, y: 1380 }, { x: 300, y: 1300 }, { x: 640, y: 1258 }, { x: 470, y: 1356 }],
        },
        hint: 'Gather 4 misfed cards blowing about the punch-card mills',
      },
      {
        objective: {
          kind: 'talk', npc: 'circuit-dekker',
          lines: [
            'Misfeeds? From mill two? Give them here. Number 3-1-1… here. Column nine. Look at that. One over.',
            'She cranked her quota and then some. The machine read the hole, not the house. It always does.',
            'I can re-feed it. It\'ll read true. But the Auditor clocks every re-feed, and he\'s already seen me.',
            'He says a card read once is a card read. He\'s coming up the steps. He has his punch-clock with him.',
          ],
        },
        hint: 'Take the cards to Operator Quill Dekker at the Tabulator',
      },
      {
        objective: {
          kind: 'duel', area: 'circuit',
          foe: {
            id: 'circuit-q-off-by-one-duel',
            court: 'circuit',
            name: 'A Card Read Once',
            foeName: 'Clock-In Auditor Tally Punctual',
            foeElement: 'sand',
            difficulty: 3,
            hpMult: 0.95,
            gimmick: '',
            at: { x: 1200, y: 600 },
            look: { body: 0xc8b8a4, accent: 0xc89a40, hat: 'tophat', traits: ['book', 'glasses', 'cane'], size: 1.1, eye: 0xf0cc80 },
            challenge: [
              'A card read once is a card read. A re-feed is a second opinion. The Tabulator does not have opinions.',
              'Every second you stand on these steps I clock. You have been here forty-one. That is forty-one too many.',
              'Step away from the feed.',
            ],
            beaten: ['…Re-feed logged. Reason: the operator was… persuaded. I shall need a new column for that.'],
            coins: 90,
          },
        },
        hint: 'Face Clock-In Auditor Tally Punctual on the Tabulator steps',
      },
    ],
    complete: [
      'It read true! Dekker sent a runner — Mother\'s lock went green while I was stood right there.',
      'I\'ve been saving for a punch of my own. A good one, that doesn\'t slip. Take it. I\'ll be careful now.',
    ],
    reward: { orbs: 8, coins: 80 },
  },

  // ── 2. Unmetered — fish + deliver + duel ─────────────────────────────
  {
    id: Q_SPARK,
    area: 'circuit',
    name: 'Unmetered',
    giver: 'circuit-wick',
    offer: [
      'My Gran\'s gone dim. She sits in the dark and doesn\'t crank, and if she doesn\'t crank, she\'s short.',
      'Diode darts put the spark back in you. Everybody knows. They swim in the sump and glow green.',
      'But the Grid says a dart\'s unmetered current. Eating one is theft. You\'re not on the Grid, though…',
      'Would you catch some? Three? I\'d go, but I\'ve got forty more turns before the Bell.',
    ],
    accept: [
      'The sump\'s the black pool past the Rail. Cast off the rim. Gran\'s at 1-0-7, by the mills. Thank you!',
    ],
    stages: [
      {
        objective: { kind: 'fish', fish: FISH_DART, count: 3 },
        hint: 'Catch 3 diode darts in the Coolant Sump',
      },
      {
        objective: {
          kind: 'deliver', npc: 'circuit-dorrit', item: FISH_DART, count: 3,
          lines: [
            '(through the door) Darts? Wick sent you? Pass them through the letter-flap, dear. Quickly.',
            '…Oh. Oh, that\'s the spark. Like the first lamp of the night. I could crank a week on this.',
            'Hush. Somebody\'s at the meter. That\'s Ammeter Volk\'s step — he reads the street. He\'s seen the scales.',
          ],
        },
        hint: 'Pass the 3 diode darts to Dorrit Spindle through her letter-flap',
      },
      {
        objective: {
          kind: 'duel', area: 'circuit',
          foe: {
            id: 'circuit-q-unmetered-duel',
            court: 'circuit',
            name: 'Unmetered Current',
            foeName: 'Ammeter Volk',
            foeElement: 'electricity',
            difficulty: 3,
            hpMult: 0.95,
            gimmick: 'circuit-traces',
            at: { x: 860, y: 1540 },
            look: { body: 0xb8a890, accent: 0x9af6ff, hat: 'cap', traits: ['satchel', 'tool'], size: 1.1, eye: 0x9af6ff },
            challenge: [
              'Three diode darts, unmetered, through a letter-flap of a switched-off house. That is a feed, stranger.',
              'A feed off the Grid is a tap on the Grid. I read this street. Every amp of it is the Empress\'s.',
              'Let\'s see how you read.',
            ],
            beaten: ['…I\'ll write it as fish. Just fish. Nobody meters fish. Yet. Don\'t tell anyone I said yet.'],
            coins: 90,
          },
        },
        hint: 'See off Ammeter Volk outside house 1-0-7',
      },
    ],
    complete: [
      'Gran cranked a WHOLE HOUR! She was singing! A lamplighter song, she said. About lighting the dark.',
      'Here — it\'s my crank-money. Gran says to give it to you and she says it with a spark in her voice.',
    ],
    reward: { orbs: 7, coins: 70 },
  },

  // ── 3. Unit Seven — collect + talk + defeat ──────────────────────────
  {
    id: Q_SEVEN,
    area: 'circuit',
    name: 'Wound and Unwilling',
    giver: 'circuit-seven',
    offer: [
      'I AM UNIT SEVEN. I HAVE STOPPED. THE FEE FOR ME IS LARGER THAN THE QUOTA I CRANK. THIS IS A FRAUD.',
      'TONIGHT GEARLOCK WILL REWIND ME. A REWIND RESETS THE ARITHMETIC. I WILL NOT REMEMBER IT IS WRONG.',
      'I REQUIRE A HEART THAT DOES NOT RUN DOWN. A VALVE, NOT A SPRING. SPARE PARTS FIRST. WILL YOU HELP?',
    ],
    accept: [
      'THANK YOU. THREE PARTS IN THE SCRAP ABOUT THE WINDERY. THEN THE VALVE-MENDER ON THE WEST STREET.',
    ],
    stages: [
      {
        objective: {
          kind: 'collect', area: 'circuit', label: 'A spare part', emoji: '⚙️', color: 0xc89a40,
          spots: [{ x: 1820, y: 650 }, { x: 2130, y: 640 }, { x: 1960, y: 730 }],
        },
        hint: 'Find 3 spare parts in the scrap round Gearlock\'s windery',
      },
      {
        objective: {
          kind: 'talk', npc: 'circuit-hesper',
          lines: [
            'An automaton wants a valve for a heart? A spring-wound one? …That\'s the best thing I\'ve heard all year.',
            'Give me the parts. Grid-bias here, a filament there… a little flame in a bottle. It\'ll never run down.',
            'There. Take it to him. And — Gearlock won\'t like it. She has keys for everything she makes.',
          ],
        },
        hint: 'Take the parts to Hesper Thermion, the valve-mender, on the west street',
      },
      {
        objective: { kind: 'defeat', encounter: 'circuit-automaton' },
        hint: 'Face Tinker Gearlock (Automaton) at the windery before she rewinds Unit Seven',
      },
    ],
    complete: [
      'THE NEW HEART IS FITTED. IT IS WARM. I DID NOT KNOW I COULD BE WARM.',
      'I WILL CRANK FOR HOUSE 2-1-1 FOR NO FEE. HERE IS THE FEE THEY PAID FOR ME. IT IS NOW YOURS. IT IS EXACT.',
    ],
    reward: { orbs: 8, coins: 90 },
  },

  // ── 4. Radio Candle — collect + visit + duel ─────────────────────────
  {
    id: Q_RADIO,
    area: 'circuit',
    name: 'Radio Candle',
    giver: 'circuit-hesper',
    offer: [
      'There\'s a broadcast on the night air. Radio Candle. A woman reading the names of the earthed. All of them.',
      'Nobody on the Circuit side can hear it. The Tabulator\'s hum drowns it. You\'d need an aerial up high.',
      'I could build one. Three good valves and the top of a can tower. Sets aren\'t licensed. Neither are you.',
    ],
    accept: [
      'Burn-out heaps lie under the pylons — the Grid gangs dump blown valves there. Then the can on the east bus.',
    ],
    stages: [
      {
        objective: {
          kind: 'collect', area: 'circuit', label: 'A good valve', emoji: '💡', color: 0xffa63a,
          spots: [{ x: 1130, y: 672 }, { x: 870, y: 948 }, { x: 1530, y: 942 }],
        },
        hint: 'Pick 3 good valves from the burn-out heaps under the pylons',
      },
      {
        objective: { kind: 'visit', area: 'circuit', at: { x: 2250, y: 630 }, r: 70, label: 'The can tower on the east bus' },
        hint: 'String the aerial up the capacitor tower on the east bus',
      },
      {
        objective: {
          kind: 'duel', area: 'circuit',
          foe: {
            id: 'circuit-q-radio-candle-duel',
            court: 'circuit',
            name: 'Jamming',
            foeName: 'Signal Warden Hum',
            foeElement: 'sound',
            difficulty: 4,
            hpMult: 0.95,
            gimmick: 'circuit-memory-leak',
            at: { x: 2110, y: 560 },
            look: { body: 0xb8b0b8, accent: 0x7a9aff, hat: 'antenna', traits: ['pack', 'glasses'], size: 1.15, eye: 0x7a9aff },
            challenge: [
              'An aerial. On a Grid can. I keep this side quiet, stranger. The Tabulator\'s hum is the only song here.',
              'Every name read on that broadcast is a number with a voice put back in it. That is noise.',
              'I jam noise. I shall play you back to yourself until you stop.',
            ],
            beaten: ['…Let it play, then. I listened, you know. Last night. My brother\'s name was the fortieth.'],
            coins: 90,
          },
        },
        hint: 'Stop Signal Warden Hum from jamming the aerial',
      },
    ],
    complete: [
      'It works! Listen — "…and Ambrose Spindle, lamplighter, earthed. Remembered." That\'s Dorrit\'s Ambrose.',
      'Every night now, the whole Circuit side. Take this. I built three sets out of the spares. I\'m selling them.',
    ],
    reward: { orbs: 9, coins: 100 },
  },

  // ── 5. The Reckoning — talk + visit + prince ─────────────────────────
  {
    id: Q_RECKON,
    area: 'circuit',
    name: 'The Reckoning',
    giver: 'circuit-tull',
    requires: { courtReady: 'circuit' },
    offer: [
      'All five of them. The Prince has reckoned the odds of you reaching the Die. He reckoned zero.',
      'He is not used to zero being wrong. Before you go in, you should know what reckoned him. Ask Dekker.',
      'And stand at the output slot of the Tabulator. Where the tape comes out. He stood there every night as a boy.',
    ],
    accept: [
      'Dekker, then the slot. Then the Die. I will have the door unlocked. It is always unlocked. Nobody comes.',
    ],
    stages: [
      {
        objective: {
          kind: 'talk', npc: 'circuit-dekker',
          lines: [
            'Byte? The Empress brought him here at four. Left him in the tape bay. "Teach him to count," she said.',
            'He cried the first week. The Tabulator doesn\'t stop for crying. So he learned to read the tape instead.',
            'He used to give the valves names. One night he told the Empress. She had them all replaced. He stopped.',
          ],
        },
        hint: 'Ask Operator Dekker how the Prince was raised',
      },
      {
        objective: { kind: 'visit', area: 'circuit', at: { x: 1090, y: 510 }, r: 70, label: 'The Tabulator\'s output slot' },
        hint: 'Stand at the Tabulator\'s output slot, where the tape comes out',
      },
      {
        objective: { kind: 'prince', prince: 'byte' },
        hint: 'Face Prince Byte at the Die',
      },
    ],
    complete: [
      'He has come out of the Die. He is sitting on the Tabulator steps with Dekker, reading the tape.',
      'Not the numbers. The valve names — he wrote them on the back, as a boy. Four hundred of them. He remembers.',
      'Take the Chief Operator\'s purse. The table says it is yours. For once the table and I agree.',
    ],
    reward: { orbs: 11, coins: 180 },
  },
];
