import type { QuestDef } from '../../../../IslesTypes';
import { PLACES } from './layout';

/**
 * Terminus's five quests. The first is the isle's welcome in disguise: you are chalked in at the
 * Meter House on your first night and shown what forty turns short costs a family with two tags on
 * the door. The second lights a lighthouse with fish. The rest are small stories about a town that
 * cranks for its own darkness: a widow's wicks, a crew docked for what an eel ate, and finally the
 * Bell itself.
 *
 * Every quest ends in a fight with one of the Empress's servants in the port. Their elements are
 * all different: metal, technology, ice, fortune, time.
 */
export const TERMINUS_QUESTS: QuestDef[] = [
  // ── 1. Short Current ──────────────────────────────────────────────
  {
    id: 'terminus-short-current', area: 'terminus', name: 'Short Current', giver: 'terminus-dock',
    offer: [
      'You have landed an hour before the Brownout Bell. Every house in town is cranking like mad to make its Draw.',
      'Visitors owe a quarter-turn their first night. Go to the Meter House and be chalked in, or a Linesman will.',
      'And ask Imogen about the Pennicks while you are there. I heard their wheel go. You can hear a wheel go.',
    ],
    accept: [
      'The Meter House is the big one at the crossroads, with the board on its face. The Bell is beside it.',
      'Do not argue with the board. Nobody wins against chalk.',
    ],
    stages: [
      {
        objective: {
          kind: 'talk', npc: 'terminus-chalker',
          lines: [
            'Visitor, quarter-turn, chalked. — The Pennicks? Crank South. Forty turns short, and the Bell in an hour.',
            'Two red tags on that door already. A third tonight and the house is earthed. All of it. Wynn too.',
            'Linesman Cutwell has their ticket. He goes down at the Bell with the hook-pole. I only chalk.',
          ],
        },
        hint: 'Be chalked in by Imogen Slate at the Meter House, at the crossroads',
      },
      {
        objective: { kind: 'visit', area: 'terminus', at: PLACES.pennickDoor, r: 110, label: 'The Pennick house' },
        hint: 'Go to the Pennicks\' house in Crank South, west of the Cable House',
      },
      {
        objective: {
          kind: 'talk', npc: 'terminus-pennick',
          lines: [
            'The wheel cracked through on Tuesday. I am cranking the stub with a spanner. Forty turns. We cannot.',
            'Wynn is inside on the treadle with her eyes shut. She is eleven. She thinks she can make it up.',
            'And there — that is Cutwell. Pole-hook, climbing irons, the pouch of red tags. He is early.',
          ],
        },
        hint: 'Speak to Abel Pennick at his door',
      },
      {
        objective: {
          kind: 'duel', area: 'terminus',
          foe: {
            id: 'terminus-short-current-duel', court: 'terminus', name: 'The Third Tag',
            foeName: 'Linesman Corder Cutwell', foeElement: 'metal', difficulty: 3, hpMult: 0.95,
            gimmick: '', at: { x: 420, y: 1004 }, coins: 80,
            look: { body: 0x6a6e7a, accent: 0xd8443a, hat: 'helmet', traits: ['tool', 'satchel', 'mask'], size: 1.3, eye: 0x9ad4ff },
            challenge: [
              'Pennick, A., Crank South. Forty turns short. Two tags on the door. One more makes three.',
              'Three is earthed. It is not a punishment. It is arithmetic. The Coil needs hands, and you have hands.',
              'The visitor. Chalked a quarter-turn. Get off my ticket, or I will tag you and see how you add up.',
            ],
            beaten: ['My hook-pole — bent. Fine. Pennick is paid. I will write it so. Nobody checks the chalk anyway.'],
          },
        },
        hint: 'Linesman Cutwell has come to tag the Pennicks a third time — stop him',
      },
    ],
    complete: [
      'Cutwell went up the Cableway with a bent pole and a full pouch of tags! I heard him swearing from the slip.',
      'That is the Draw, then. Now you know what forty turns cost. Six princes keep it up those three roads.',
      'North up the Cableway to the Dynamo is the gentlest start. Here — landing money, for the Pennicks\' sake.',
    ],
    reward: { orbs: 7, coins: 80 },
  },

  // ── 2. Fishlight ──────────────────────────────────────────────────
  {
    id: 'terminus-fishlight', area: 'terminus', name: 'Fishlight', giver: 'terminus-keeper',
    offer: [
      'Nine years on a quarter-ration. The lamp gutters. Out past the Breakers they cannot see it at all.',
      'Last month the Meller boat came in blind and broke her back on the point. Under my window.',
      'But a volt herring glows for a night in a jar of brine. Four of them, in the lens, would show past the reef.',
    ],
    accept: [
      'Fish off the pier or the jetty — press E at the water and wait for the tug. Herring bite at anything bright.',
      'Bring them to me alive. The light goes when they die. It is a very short-lived sort of lighthouse.',
    ],
    stages: [
      {
        objective: { kind: 'fish', fish: 'fish-volt-herring', count: 4 },
        hint: 'Catch 4 Volt Herring off the landing pier or the jetty',
      },
      {
        objective: {
          kind: 'deliver', npc: 'terminus-keeper', item: 'fish-volt-herring', count: 4,
          lines: [
            'In the jars — one, two, three, four. Into the lens. Now watch. Watch the lens find them.',
            '...There. Blue and blinking and right round the horizon. That is the Breakers, lit. I can SEE them.',
            'Oh, no. A man on the point with a galvanometer, looking at my light. That is Assessor Prym.',
          ],
        },
        hint: 'Bring 4 Volt Herring to Fenna Rook at the lighthouse',
      },
      {
        objective: {
          kind: 'duel', area: 'terminus',
          foe: {
            id: 'terminus-fishlight-duel', court: 'terminus', name: 'Unmetered Light',
            foeName: 'Assessor Wattling Prym', foeElement: 'technology', difficulty: 3, hpMult: 1,
            gimmick: '', at: { x: 400, y: 1214 }, coins: 85,
            look: { body: 0x8a8e9a, accent: 0x6a8aff, hat: 'tophat', traits: ['glasses', 'tool', 'satchel'], size: 1.0, eye: 0xb8ffc8 },
            challenge: [
              'Light. Full light, from a lighthouse on a quarter-ration. My needle says it is not coming off the Grid.',
              'Unmetered light is stolen light. I do not care if it is fish. The light is the Empress\'s; the fish are, too.',
              'I will be taking the jars, keeper. And the visitor will be taking a reading. Hold still.',
            ],
            beaten: ['My galvanometer! The needle has gone right round and stuck. ...There is no form for fish. Fine.'],
          },
        },
        hint: 'Assessor Prym is on the point to confiscate the fishlight — stop him',
      },
    ],
    complete: [
      'He walked off up the quay shaking his galvanometer like a stopped watch. The lamp did not even flicker.',
      'Four herring for a light the Outer Sea can see. I will change them every night. The fishers will bring them.',
      'Take this. It is the Meller boat\'s salvage money. They would want it to go to whoever lit the Breakers.',
    ],
    reward: { orbs: 8, coins: 70 },
  },

  // ── 3. The Last Candle ────────────────────────────────────────────
  {
    id: 'terminus-last-candle', area: 'terminus', name: 'The Last Candle', giver: 'terminus-nan',
    requires: { questDone: 'terminus-short-current' },
    offer: [
      'Tonight is twelve years since they earthed my Tam. The lamplighters went first. All five, one night.',
      'He trimmed his whole round the evening before. New wicks in every head. Nobody ever lit them.',
      'They are still up there, in the cold lamps. If I had his wicks, I could make one candle. Just the one.',
    ],
    accept: [
      'His round: the Row\'s west end, the lamp by the shops, one up the Cableway, one behind the Meter House.',
      'Reach up under the hood and the wick is in the burner. Pinch it out gently. He cut them very straight.',
    ],
    stages: [
      {
        objective: {
          kind: 'collect', area: 'terminus', label: 'Tam\'s wick', emoji: '🕯️', color: 0xffc062,
          spots: [{ x: 470, y: 722 }, { x: 1650, y: 722 }, { x: 1254, y: 300 }, { x: 860, y: 326 }],
        },
        hint: 'Take 4 wicks from Tam\'s cold street lamps along the Row and up the Cableway',
      },
      {
        objective: {
          kind: 'talk', npc: 'terminus-nan',
          lines: [
            'Four. Twisted together, they make a good fat wick. A stub of tallow round it. — There. A candle.',
            'And a match. I have had this match in my sleeve for twelve years. — Look. Look at it go, Tam.',
            'And there is the smoke going up past the Grid\'s wires, and there is the Flame Watch. Of course.',
          ],
        },
        hint: 'Bring the wicks to Nan Wickersley by the Lamplighters\' Hall',
      },
      {
        objective: {
          kind: 'duel', area: 'terminus',
          foe: {
            id: 'terminus-last-candle-duel', court: 'terminus', name: 'The Flame Watch',
            foeName: 'Snuffer Hollis Damp', foeElement: 'ice', difficulty: 4, hpMult: 0.95,
            gimmick: '', at: { x: 540, y: 300 }, coins: 90,
            look: { body: 0x9aa8b8, accent: 0x2a3a5a, hat: 'hood', traits: ['lantern', 'mask', 'cane'], size: 1.1, eye: 0xd8f4ff },
            challenge: [
              'I smelled it from the Cableway. Tallow. A candle is a theft from the Grid, widow. You know the law.',
              'I carry the frost in this hood for flames. One breath and they go out. One more and so do lamplighters.',
              'Visitor, stand away from the window. Or I will snuff you, and you will not like how cold it is.',
            ],
            beaten: ['My frost — gone to water. ...Let it burn, then. One candle. I will say I could not find it.'],
          },
        },
        hint: 'Snuffer Damp of the Flame Watch has come to put out Nan\'s candle — keep it burning',
      },
    ],
    complete: [
      'He went off with frost melting down his face like tears. And the candle never once went out. Look at it.',
      'Three hours, it will burn. Tam\'s round took three hours. That is not a coincidence. He cut them to fit.',
      'Take this. The snuffer-cap off his pole. He would want it on someone who keeps a thing lit.',
    ],
    reward: { orbs: 9, coins: 60, item: 'charm-terminus-snuffer-cap' },
  },

  // ── 4. The Chewed Cable ───────────────────────────────────────────
  {
    id: 'terminus-chewed-cable', area: 'terminus', name: 'The Chewed Cable', giver: 'terminus-captain',
    requires: { questDone: 'terminus-short-current' },
    offer: [
      'The great cable faults out past the Breakers. Every week. And every week the Grid docks my crew for it.',
      '"Current spilled," says the Purser. A week\'s Draw per fault. Hobb was earthed for the last splice.',
      'But it is not our splices. It is cable eels. They nest in the armour and chew to the copper. Prove it.',
    ],
    accept: [
      'They come to the surface near the cable\'s landfall, by the jetty. Two will do. Bring them to the gangway.',
      'Mind your hands. A cable eel gives you a jolt through the line. Through the rod. Through your teeth.',
    ],
    stages: [
      {
        objective: { kind: 'fish', fish: 'fish-cable-eel', count: 2 },
        hint: 'Catch 2 Cable Eels (they feed near the great cable\'s landfall, by the jetty)',
      },
      {
        objective: {
          kind: 'deliver', npc: 'terminus-captain', item: 'fish-cable-eel', count: 2,
          lines: [
            'Open this one up — there. See? Copper in its gut. Strands of it. And this one: armour wire, bitten.',
            'Eels. Not splices. Forty weeks of docked pay and Hobb on a treadmill, for an EEL.',
            'And who should come down the gangway with his ledger but Purser Gilt. He smells a refund. Hates them.',
          ],
        },
        hint: 'Bring 2 Cable Eels to Captain Splice at the Long Patience\'s gangway',
      },
      {
        objective: {
          kind: 'duel', area: 'terminus',
          foe: {
            id: 'terminus-chewed-cable-duel', court: 'terminus', name: 'Current Spilled',
            foeName: 'Purser Aurelian Gilt', foeElement: 'fortune', difficulty: 4, hpMult: 1,
            gimmick: '', at: { x: 1820, y: 1250 }, coins: 95,
            look: { body: 0xb8a070, accent: 0xd2aa4a, hat: 'tophat', traits: ['book', 'glasses', 'satchel'], size: 1.15, eye: 0xffe08a },
            challenge: [
              'Eels. How droll. The ledger does not have a column for eels, Captain. It has a column for crews.',
              'Every amp that leaves the line is the Empress\'s amp, spilled. Somebody pays. It is never the eel.',
              'Visitor, you have been fishing on a Grid cable. That is tampering. I will dock you too.',
            ],
            beaten: ['My ledger. My column. ...Very well. "Fault: eel." Refund the crew. Release the bosun. Ugh.'],
          },
        },
        hint: 'Purser Gilt has come to dock the crew anyway — make him answer for it',
      },
    ],
    complete: [
      'He wrote "eel" in his own ledger, in his own hand! And signed for Hobb\'s release. I have it here. Look.',
      'Forty weeks of pay, back to the crew. We will put it in a jar and drink it on the Breakers.',
      'And yours. A cable crew pays its debts. Even to a fisher off the Outer Sea.',
    ],
    reward: { orbs: 9, coins: 110 },
  },

  // ── 5. The Last Bell ──────────────────────────────────────────────
  {
    id: 'terminus-last-bell', area: 'terminus', name: 'The Last Bell', giver: 'terminus-ringer',
    requires: { princesOfIsle: 'electricity', count: 2 },
    offer: [
      'Two princes down. And I have read the Draw-law, all of it, by candle. Do not tell Nan I had one.',
      'It says the Draw is drawn "at the ringing of the Brownout Bell". At it. Not after. Not instead of.',
      'No Bell, no Draw. Not tonight, not anywhere on the shore. Help me take the clapper out. Imogen has the key.',
    ],
    accept: [
      'The clapper hangs on a locked bolt — the Grid does not trust ringers. Imogen keeps the key on her chalk-belt.',
      'She will give it you or she will not. Twenty years she has chalked. I do not know which way she will go.',
    ],
    stages: [
      {
        objective: {
          kind: 'talk', npc: 'terminus-chalker',
          lines: [
            'The clapper key. ...Ambrose sent you. Of course he did. Forty years and he finally reads the law.',
            'Twenty years I have chalked the short houses. Red. Red. Copper. I never once rubbed one out.',
            'Here. Take it. Quickly, before I think about my own door-lock. Go.',
          ],
        },
        hint: 'Ask Imogen Slate at the Meter House for the clapper key',
      },
      {
        objective: { kind: 'visit', area: 'terminus', at: PLACES.bell, r: 90, label: 'The Brownout Bell' },
        hint: 'Unbolt the clapper from the Brownout Bell, beside the Cableway',
      },
      {
        objective: {
          kind: 'talk', npc: 'terminus-ringer',
          lines: [
            'You have it? Give it here. Forty years I have pulled this lump of bronze. — Over the quay wall. There.',
            'Listen. That is the sound of the Draw not being drawn. ...Hm. It sounds like rain. It is rain.',
            'And there is Bellwarden Grane, with his pocket-clock out, running. It is a minute to the hour.',
          ],
        },
        hint: 'Bring the clapper back to Ambrose Toll by the Bell',
      },
      {
        objective: {
          kind: 'duel', area: 'terminus',
          foe: {
            id: 'terminus-last-bell-duel', court: 'terminus', name: 'A Minute to the Hour',
            foeName: 'Bellwarden Tollis Grane', foeElement: 'sand', difficulty: 4, hpMult: 1.12, coins: 120,
            gimmick: '', at: { x: 1110, y: 752 },
            look: { body: 0x8a8070, accent: 0xa87a3a, hat: 'mitre', traits: ['cane', 'book', 'beard'], size: 1.25, eye: 0xffd8a0 },
            challenge: [
              'Toll. The Bell. There is no clapper in the Bell. There is a minute to the hour, and no clapper.',
              'The Draw is drawn at the Bell. If the Bell does not ring, the hour does not come. I keep the hour.',
              'I will ring it with my own head if I must. Or with yours, visitor. Stand aside. Thirty seconds.',
            ],
            beaten: ['My clock — stopped. It is... after the hour. The hour came and nothing rang. Nothing at all.'],
          },
        },
        hint: 'Bellwarden Grane is trying to ring the hour by hand — stop him before it strikes',
      },
    ],
    complete: [
      'The hour passed and nobody rang. And the lights on the shore did not dip. Not one. Look at them all.',
      'Every house cranked all day and kept it. Every turn. Terminus is sitting up with its lights on.',
      'They will cast a new clapper, I expect. Let them. Tonight is ours. — Here. My ringing fee. I am retired.',
    ],
    reward: { orbs: 11, coins: 160 },
  },
];
