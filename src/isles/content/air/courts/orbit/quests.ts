import type { QuestDef } from '../../../../IslesTypes';
import { BRASS_LIT, ENAMEL } from './palette';
import { RING } from './layout';

/**
 * Five small stories in the Orbit Court. Each is about what the chains hold and who holds the
 * chains: a child's house three links from the moon, a pool of fish that know where the moon
 * really goes, clocks wound fast so every bill falls due early, a husband hung asleep on the
 * moon's flank, and the frozen ledger where every shortened link was written down.
 */
export const ORBIT_QUESTS: QuestDef[] = [
  {
    id: 'orbit-short-chain',
    area: 'orbit',
    name: 'Three Links Short',
    giver: 'orbit-agnes',
    offer: [
      'The Orbels\' chain has lost three links this winter. Three missed payments, and the house swings in.',
      'One more and their islet passes so near the moon that little Pim cannot breathe without the meter ticking.',
      'The Bailiff keeps the links he cuts. They jingle in his pocket. Talk to Pim — the child sees everything.',
    ],
    accept: ['Pim is on the Ring-Street, south side, throwing pebbles round the moon. Mind your head.'],
    stages: [
      {
        objective: {
          kind: 'talk', npc: 'orbit-pim', lines: [
            'Mister Shackle? He walks the Ring-Street every night jingling. And his pocket has a HOLE in it. I saw!',
            'One fell out by the clock, and one by the steps, and one by the bollard. I didn\'t pick them up. I was scared.',
          ],
        },
        hint: 'Ask Pim Orbel about the Bailiff, on the south side of the Ring-Street',
      },
      {
        objective: {
          kind: 'collect', area: 'orbit', label: 'Cut link', emoji: '🔗', color: BRASS_LIT,
          spots: [
            { x: RING.x - 282, y: RING.y - 68 },
            { x: RING.x + 150, y: RING.y - 173 },
            { x: RING.x + 150, y: RING.y + 173 },
          ],
        },
        hint: 'Pick up the 3 cut links Shackle dropped round the Ring-Street',
      },
      {
        objective: {
          kind: 'duel', area: 'orbit',
          foe: {
            id: 'orbit-short-chain-duel',
            court: 'orbit',
            name: 'One Link Shorter',
            foeName: 'Chain-Bailiff Garnet Shackle',
            foeElement: 'metal',
            difficulty: 4,
            gimmick: '',
            at: { x: 1010, y: 1080 },
            look: { body: 0x3b3d47, accent: 0x7a5622, hat: 'helmet', traits: ['tool', 'satchel', 'beard'], size: 1.3, eye: 0xd8423a },
            challenge: [
              'Those are Crown links in your hand, stranger. Every one of them was paid for in arrears. Hand them over.',
              'The Orbels owe a fourth. I have the cutters right here. Stand aside or I will take one off YOUR chain.',
            ],
            beaten: ['My cutters... in the gulf. They will hit the clouds by Thursday. Fine. FINE. Put the links back yourself.'],
            coins: 85,
          },
        },
        hint: 'Stop Chain-Bailiff Shackle on his way to the Orbels\' bollard (south-west of the Ring-Street)',
      },
    ],
    complete: [
      'Three links, back on the Orbels\' chain, and riveted hot. Listen — the whole islet is creaking outward.',
      'Pim says the moon looks like a marble now. Good. That is how small a moon ought to look from a house.',
    ],
    reward: { orbs: 6, coins: 70 },
  },
  {
    id: 'orbit-moonfish',
    area: 'orbit',
    name: 'Where the Moon Really Goes',
    giver: 'orbit-hobb',
    offer: [
      'Moonfish always swim to the side of the pool nearest Selene\'s little moon. Always. Like compass needles.',
      'And they point it out in places it is not supposed to be — under the windows of houses that owe the most.',
      'Land me two moonfish. Ottoline at the Almanac can chart where they point. Then we will know who steers it.',
    ],
    accept: ['Cast up into the middle of the ball, where the water is heaviest. Moonfish fight. Hold on.'],
    stages: [
      { objective: { kind: 'fish', fish: 'fish-tidal-moonfish', count: 2 }, hint: 'Land 2 tidal moonfish in the Moonpool' },
      {
        objective: {
          kind: 'deliver', npc: 'orbit-ottoline', item: 'fish-tidal-moonfish', count: 2, lines: [
            'In the bowl, please. Look at them — noses all turned the same way. Now let me lay the chart beside them.',
            'There. Every perigee for a year, against the published tables. She swings it past the debtors. Every time.',
            'Selene keeps the moon on the Ring-Street, at its foot. Someone ought to ask her about her arithmetic.',
          ],
        },
        hint: 'Bring the 2 moonfish to Ottoline at the Brass Almanac',
      },
      { objective: { kind: 'defeat', encounter: 'orbit-tidal-lock' }, hint: 'Beat Moonkeeper Selene at the moon\'s foot' },
    ],
    complete: [
      'She is steering it true now? The fish say so. They point at the plain old sky, where a moon ought to be.',
      'Keep a goby or two for luck. Fish are honest. It is the people holding the chains you watch.',
    ],
    reward: { orbs: 5, coins: 60 },
  },
  {
    id: 'orbit-fast-clocks',
    area: 'orbit',
    name: 'Ten Minutes Fast',
    giver: 'orbit-wick',
    offer: [
      'Every clock in the court runs ten minutes fast a day, and the Breath Tax falls due on clock-time.',
      'So everyone is always a little late, and late means a link. Somebody is pulling the regulator pins at night.',
      'There are four public clocks: Tether Quay, the west road, the east islet and the south street. Find the pins.',
    ],
    accept: ['They are small brass pins with a moon on the head. Whoever pulls them drops them nearby. He is careless.'],
    stages: [
      {
        objective: {
          kind: 'collect', area: 'orbit', label: 'Regulator pin', emoji: '📍', color: ENAMEL,
          spots: [{ x: 300, y: 905 }, { x: 880, y: 700 }, { x: 2090, y: 620 }, { x: 1900, y: 1400 }],
        },
        hint: 'Find the 4 regulator pins under the court\'s public clocks',
      },
      {
        objective: {
          kind: 'talk', npc: 'orbit-wick', lines: [
            'Four pins! And "V" scratched on every one. Verge. The Prince\'s timekeeper. He winds the clocks at night.',
            'He will be at the Great Orrery\'s yard, by the north houses, setting the next one. Catch him at it.',
          ],
        },
        hint: 'Bring the regulator pins to Wick Escapement',
      },
      {
        objective: {
          kind: 'duel', area: 'orbit',
          foe: {
            id: 'orbit-fast-clocks-duel',
            court: 'orbit',
            name: 'Borrowed Time',
            foeName: 'Timekeeper Verge',
            foeElement: 'sand',
            difficulty: 4,
            gimmick: 'orbit-orrery',
            at: { x: 880, y: 335 },
            look: { body: 0x2b3b6a, accent: 0xf0c766, hat: 'tophat', traits: ['cane', 'glasses'], size: 1.05, eye: 0xf0c766 },
            challenge: [
              'Ten minutes a day is nothing. A heartbeat. A breath. You will not miss it. The Crown will not miss it either.',
              'You have something of mine. Small, brass, a moon on the head. Shall we see whose clock runs out first?',
            ],
            beaten: ['Put them back, then. All four. And set the hands TRUE, mind — I could not bear to see them crooked.'],
            coins: 85,
          },
        },
        hint: 'Catch Timekeeper Verge at the clock by the Great Orrery\'s north houses',
      },
    ],
    complete: [
      'Every pin back in its clock. Hear that? They all strike together. I have never heard them all strike together.',
      'Master Tycho says I may wind the Great Orrery on my own now. Not the Ledger Arm. Never the Ledger Arm.',
    ],
    reward: { orbs: 6, coins: 65 },
  },
  {
    id: 'orbit-low-orbit',
    area: 'orbit',
    name: 'The Low Orbit',
    giver: 'orbit-hollis',
    offer: [
      'My Tobin is hung asleep on the moon\'s flank with the other becalmed, turning on a chain like a satellite.',
      'Nobody can get up there. The air is too thin and the pull too strange. Except Lofty — Lofty floats.',
      'If you can learn to float from him, you could reach the Low Orbit. Then there is only the lock.',
    ],
    accept: ['Walk to the moon\'s flank first, under the sleepers. Look up. Tell me if you can see which one is Tobin.'],
    stages: [
      {
        objective: { kind: 'visit', area: 'orbit', at: { x: 1470, y: 960 }, r: 70, label: 'Under the Low Orbit' },
        hint: 'Stand under the Low Orbit, on the Ring-Street below the moon\'s flank',
      },
      { objective: { kind: 'defeat', encounter: 'orbit-zero-g' }, hint: 'Beat Spacer Lofty in his zero-g yard and learn to drift' },
      {
        objective: {
          kind: 'duel', area: 'orbit',
          foe: {
            id: 'orbit-low-orbit-duel',
            court: 'orbit',
            name: 'Lodestone Lock',
            foeName: 'Lodewarden Ferro',
            foeElement: 'magnet',
            difficulty: 4,
            gimmick: 'orbit-tidal-lock',
            at: { x: 1530, y: 1010 },
            look: { body: 0x2a2338, accent: 0x6c707e, hat: 'helmet', traits: ['tool', 'mask'], size: 1.25, eye: 0x9d8be6 },
            challenge: [
              'Every sleeper on that flank is clamped with a lodestone lock, and every lock answers to me. Only me.',
              'You learned to float? Good. Then learn what a magnet does to something that cannot hold the ground.',
            ],
            beaten: ['The key is the lock. It always was. Turn it toward the moon... there. Take your sleeper down. Gently.'],
            coins: 85,
          },
        },
        hint: 'Face Lodewarden Ferro beside the Low Orbit and open Tobin Vane\'s lock',
      },
    ],
    complete: [
      'He is so light. Like carrying a coat. He is still asleep — his breath is in a bottle somewhere up in the Lung.',
      'But he is home, in his own bed, and I can hear him. Barely. Barely is a great deal more than nothing.',
    ],
    reward: { orbs: 7, coins: 75 },
  },
  {
    id: 'orbit-perigee-ledger',
    area: 'orbit',
    name: 'The Chain Ledger',
    giver: 'orbit-quill',
    requires: { encounter: 'orbit-event-horizon' },
    offer: [
      'You beat Null at the edge of his own hole. Then you have seen what falls. Now see who decided it should.',
      'The Chain Ledger: every link ever shortened in this court, and on whose word. It is kept frozen, in the vault.',
      'Plumbline the Assessor reads every needle that goes into it. Ask him how it is kept. He likes to explain.',
    ],
    accept: ['Plumbline paces the north road, by the Ring-Street. Do not breathe on his dial. He hates that.'],
    stages: [
      {
        objective: {
          kind: 'talk', npc: 'orbit-plumbline', lines: [
            'The ledger? Kept at aphelion — the cold end of the vault, far from the moon. Ink freezes there. Unalterable.',
            'Keeper Rime minds it. She answers to the Prince alone. While he stands, she will not open it for anybody.',
            'I only weigh, you understand. I only ever weighed. Though I suppose I knew what the weights were for.',
          ],
        },
        hint: 'Ask Assessor Plumbline how the Chain Ledger is kept',
      },
      { objective: { kind: 'prince', prince: 'perigee' }, hint: 'Defeat Prince Perigee at the Periapsis' },
      {
        objective: {
          kind: 'duel', area: 'orbit',
          foe: {
            id: 'orbit-perigee-ledger-duel',
            court: 'orbit',
            name: 'Aphelion',
            foeName: 'Keeper Rime',
            foeElement: 'ice',
            difficulty: 5,
            gimmick: 'orbit-event-horizon',
            at: { x: 1760, y: 1400 },
            look: { body: 0xcfe6f8, accent: 0x2b3b6a, hat: 'hood', traits: ['book', 'lantern', 'scarf'], eye: 0x6a96c8 },
            challenge: [
              'The Prince has fallen. The ledger has not. Ink frozen at aphelion cannot be changed — not by you, not by me.',
              'Every link in this court is written here in frost. Let it thaw and the whole town reads its own debts at once.',
            ],
            beaten: ['Thaw it, then. Let them read. ...Half the names in it are mine to answer for. I froze them myself.'],
            coins: 85,
          },
        },
        hint: 'Take the Chain Ledger from Keeper Rime at the cold end of the south street',
      },
    ],
    complete: [
      'The Chain Ledger, thawed and dripping. Every link, every name, every "by order of the Prince Perigee".',
      'We will read it out on the Ring-Street, and every family whose chain was shortened will forge one link back.',
    ],
    reward: { orbs: 9, coins: 110 },
  },
];
