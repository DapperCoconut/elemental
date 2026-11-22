import type { QuestDef } from '../../../../IslesTypes';
import { ADA_DOOR, BOULDERS, STONE } from './area';
import { FISH_CHAR, FISH_PIKE } from './items';

/**
 * The Lodestar Court's five side quests.
 *
 * Between them they show the crag's own wrong and the people working round it: the stone that
 * makes every meter read short (Ada), a light the Grid cannot meter (Hollin), the boulders the
 * quarry floats over Underhill to frighten it (Gaussen), the field map that is out of date and
 * the household it is used against (Nell), and finally the Prince himself, who was taught to be
 * a fixed star (Astrid). Each is somebody being drawn in or driven off, and refusing both.
 */

/** The three boulders hung over Underhill, whose keeper pins the Foreman pulled. */
const UNDERHILL = BOULDERS.filter((b) => b.y > 1300 && b.x < 900);

export const LODESTAR_QUESTS: QuestDef[] = [
  // ── 1. Reading Short — talk + visit + duel ───────────────────────────
  {
    id: 'lodestar-q-short-meter',
    area: 'lodestar',
    name: 'Reading Short',
    giver: 'lodestar-ada',
    offer: [
      'Two marks on my door, love. One more short reading and they take me up the Coil.',
      'I\'m not short. I crank my quota and more. The needle reads low, that\'s all. Every needle does, up here.',
      'Hask won\'t hear it. "The needle is the Grid\'s," he says. Could you find out what\'s wrong with it?',
    ],
    accept: [
      'Ottilie Cobalt at the compass stall on the Needle Road. If anyone knows a needle, she does.',
    ],
    stages: [
      {
        objective: {
          kind: 'talk', npc: 'lodestar-cobalt',
          lines: [
            'Ada\'s meter? It reads short because the stone is pulling on its needle. Every meter on the crag does.',
            'A tenth, a fifth, depends how near the stone you live. Hask knows. The Prince knows. Nobody fixes it.',
            'Here. A sleeve of soft iron. Fit it round the meter and the stone can\'t reach the needle. A shroud.',
            'Tampering with a meter is theft from the Grid, mind. So don\'t get caught. Or do. You look like you can.',
          ],
        },
        hint: 'Ask Ottilie Cobalt at the compass stall what\'s wrong with Ada\'s meter',
      },
      {
        objective: { kind: 'visit', area: 'lodestar', at: ADA_DOOR, r: 60, label: 'Ada\'s Draw meter' },
        hint: 'Fit the soft-iron shroud round the meter at Ada\'s door in Underhill',
      },
      {
        objective: {
          kind: 'duel', area: 'lodestar',
          foe: {
            id: 'lodestar-q-short-meter-duel',
            court: 'lodestar',
            name: 'The Needle Is the Grid\'s',
            foeName: 'Meter-Reader Hask',
            foeElement: 'ice',
            difficulty: 4,
            hpMult: 0.95,
            gimmick: '',
            at: { x: 640, y: 1310 },
            look: { body: 0xc4ccd4, accent: 0x3a6ee0, hat: 'tophat', traits: ['book', 'glasses', 'scarf'], size: 1.1, eye: 0xcfe4f0 },
            challenge: [
              'A sleeve on a meter. That is a theft from the Grid, and a lie told to a needle.',
              'I read what the needle says. I have read what it says for nineteen years. It has never once been warm.',
              'Step away from the dial. I am going to read it as it was.',
            ],
            beaten: ['…Full. It reads full. It has always read — no. I shall read what it says. That is all I ever did.'],
            coins: 100,
          },
        },
        hint: 'Stop Meter-Reader Hask stripping the shroud off Ada\'s meter',
      },
    ],
    complete: [
      'He read it full! Same cranking, same arm, same night — full! I sat down on the step and cried.',
      'Take this, love. I\'d saved it for the Coil. You go up there with a coin in your boot, they say. Not now.',
    ],
    reward: { orbs: 9, coins: 80 },
  },

  // ── 2. Cold Light — fish + deliver + duel ────────────────────────────
  {
    id: 'lodestar-q-cold-light',
    area: 'lodestar',
    name: 'Cold Light',
    giver: 'lodestar-hollin',
    requires: { questDone: 'lodestar-q-short-meter' },
    offer: [
      'Ada Lodestrom\'s been dark two winters. Switched off, then switched on, then off. No light, no heat.',
      'A char\'s oil glows a week in a jar. Cold. No flame, so it\'s no theft. No wire, so no meter can read it.',
      'Char are the Observatory\'s, though. Catch two for Ada and the Lens-Warden will want words. Will you?',
    ],
    accept: [
      'Sky-rod for this water, or your line floats off. Char come up green. Two, for her two windows.',
    ],
    stages: [
      {
        objective: { kind: 'fish', fish: FISH_CHAR, count: 2 },
        hint: 'Catch 2 aurora char in the aurora tarn (skyline rod)',
      },
      {
        objective: {
          kind: 'deliver', npc: 'lodestar-ada', item: FISH_CHAR, count: 2,
          lines: [
            'Char! Oh, they\'re glowing in the creel. Hollin sent you? He would. Put them in the jars on the sill.',
            'Look at that. Look. Green on my own wall. And not a wire anywhere near it.',
            'Oh — love. There\'s a woman on the path with a brass glass in her eye. That\'s the Lens-Warden.',
          ],
        },
        hint: 'Bring the 2 aurora char to Ada Lodestrom in Underhill',
      },
      {
        objective: {
          kind: 'duel', area: 'lodestar',
          foe: {
            id: 'lodestar-q-cold-light-duel',
            court: 'lodestar',
            name: 'The Sky in the Scales',
            foeName: 'Lens-Warden Quartzby Glint',
            foeElement: 'crystal',
            difficulty: 4,
            hpMult: 0.95,
            gimmick: 'lodestar-aurora',
            at: { x: 760, y: 1320 },
            look: { body: 0xe0e4ec, accent: 0x7fd0c0, hat: 'goggles', traits: ['glasses', 'book'], size: 1, eye: 0xcfeff0 },
            challenge: [
              'Every char in the tarn carries a map of the sky in its scales. His Highness reads them. Not windows.',
              'A char in a jar on a sill is a chart thrown away. That is waste. Waste is short.',
              'Hand me the jars. I will grind the scales to lenses and put the light where it belongs: in a book.',
            ],
            beaten: ['…Keep them, then. I have more sky than I can read. I only wanted to be the one reading it.'],
            coins: 100,
          },
        },
        hint: 'Face Lens-Warden Quartzby Glint before she takes the char',
      },
    ],
    complete: [
      'Ada\'s window\'s lit. You can see it from the tarn. Green, like a bit of the sky came down to visit.',
      'Have a pike, and my thanks. Pike\'s the fisher\'s, always was. That one\'s never been counted.',
    ],
    reward: { orbs: 8, coins: 60, item: FISH_PIKE, itemCount: 1 },
  },

  // ── 3. Keeper Chains — collect + talk + duel ─────────────────────────
  {
    id: 'lodestar-q-keeper-chains',
    area: 'lodestar',
    name: 'Keeper Chains',
    giver: 'lodestar-gaussen',
    offer: [
      'Three boulders floated over Underhill. Cut stone. Iron in it, held up by the field, held down by chains.',
      'Foreman Plumb pulled the keeper pins last night. A household down there was short, he says. A lesson.',
      'Without the pin a chain lets the stone drift. Drifting stone falls. On roofs. I can\'t leave the winch.',
    ],
    accept: [
      'Pins go through the staple at the foot of each chain. Push them home. Don\'t look up.',
    ],
    stages: [
      {
        objective: {
          kind: 'collect', area: 'lodestar', label: 'Keeper pin', emoji: '📌', color: 0x5a5e68,
          spots: UNDERHILL.map((b) => ({ x: b.x + 10, y: b.y + 6 })),
        },
        hint: 'Push home the 3 keeper pins under the boulders hanging over Underhill',
      },
      {
        objective: {
          kind: 'talk', npc: 'lodestar-gaussen',
          lines: [
            'All three? Tight? Good. GOOD. I felt them take from here — the winch-chain sang.',
            'Ah. And there\'s Plumb coming up the quarry road. He\'s seen. He\'ll pull them again unless he\'s stopped.',
          ],
        },
        hint: 'Tell Odd Gaussen at the sky-quarry winch the chains are pinned',
      },
      {
        objective: {
          kind: 'duel', area: 'lodestar',
          foe: {
            id: 'lodestar-q-keeper-chains-duel',
            court: 'lodestar',
            name: 'Near, Not Against',
            foeName: 'Quarry Foreman Plumb',
            foeElement: 'gravity',
            difficulty: 5,
            hpMult: 0.95,
            gimmick: 'lodestar-lodestone',
            at: { x: 2040, y: 1460 },
            look: { body: 0xb0a090, accent: 0x262a3a, hat: 'miner', traits: ['tool', 'beard'], size: 1.3, eye: 0x8a4228 },
            challenge: [
              'A short house wants reminding what\'s over its head. I remind it. Gently. With a rock.',
              'Pins back in, are they? Then I\'ll show you what a stone does when it\'s let go. Come on the floor.',
            ],
            beaten: ['…Fine. Pinned they stay. Gaussen can float the cut round the long way. It\'s only a walk.'],
            coins: 100,
          },
        },
        hint: 'Stop Quarry Foreman Plumb pulling the pins again',
      },
    ],
    complete: [
      'Pinned, and Plumb walking the long way round with his tail down. Best day\'s chaining this quarry\'s had.',
      'Here — a week\'s wage. Chainman\'s wage is good. It\'s the only thing about the job that is.',
    ],
    reward: { orbs: 9, coins: 90 },
  },

  // ── 4. Combed True — collect + defeat ────────────────────────────────
  {
    id: 'lodestar-q-combed-true',
    area: 'lodestar',
    name: 'Combed True',
    giver: 'lodestar-nell',
    offer: [
      'Smith Ferrite says my lines are wrong. They don\'t match the Prince\'s map. That\'s a short on Ma\'s Draw.',
      'But the map\'s forty years old! The field\'s moved. I comb them the way they go. I can feel them.',
      'If somebody else combed the four yards and got the same lines as me, he\'d have to listen. Wouldn\'t he?',
    ],
    accept: [
      'The smithy yard, the stone\'s east side, the tarn road, and the yard by the diggings. With the field, not against!',
    ],
    stages: [
      {
        objective: {
          kind: 'collect', area: 'lodestar', label: 'A yard combed true', emoji: '〰️', color: 0x6a7080,
          spots: [{ x: 700, y: 560 }, { x: 1660, y: 800 }, { x: 1560, y: 910 }, { x: 1150, y: 1110 }],
        },
        hint: 'Comb the field lines true in 4 yards round the crag',
      },
      {
        objective: { kind: 'defeat', encounter: 'lodestar-filings' },
        hint: 'Make Smith Ferrite (Iron Filings) look at the lines — in his own yard',
      },
    ],
    complete: [
      'He looked! He walked every yard with his eyeglass and he said "hm" four times. "Hm" means yes, from him.',
      'Ma\'s off the list. Here — my comb money. All of it. Don\'t argue, I\'m very good at arguing.',
    ],
    reward: { orbs: 7, coins: 70 },
  },

  // ── 5. True North — talk + visit + prince ────────────────────────────
  {
    id: 'lodestar-q-true-north',
    area: 'lodestar',
    name: 'True North',
    giver: 'lodestar-astrid',
    requires: { courtReady: 'lodestar' },
    offer: [
      'All five of them. His Highness turned the telescope round to watch you. He has never done that.',
      'Before you go in: Ottilie Cobalt made him his first compass. Ask her what he did with it.',
      'Then stand by the stone. He used to, every day, before the Empress put him at the telescope.',
    ],
    accept: [
      'Ottilie, then the stone, then the doors. I\'ll have the dome open. Bring a coat.',
    ],
    stages: [
      {
        objective: {
          kind: 'talk', npc: 'lodestar-cobalt',
          lines: [
            'His first compass? Brass, the size of a plum. He was five. He carried it everywhere, watching the needle.',
            'He asked me why it pointed at the stone and not at him. I said because the stone is bigger, dear.',
            'His mother heard. She took the compass and gave him a telescope. "Be the star," she said. "Not the stone."',
            'He\'s been trying to be something that never moves ever since. Poor lamb. Everything moves.',
          ],
        },
        hint: 'Ask Ottilie Cobalt about the Prince\'s first compass',
      },
      {
        objective: { kind: 'visit', area: 'lodestar', at: { x: STONE.x, y: STONE.y + 150 }, r: 90, label: 'The great lodestone' },
        hint: 'Stand at the foot of the great lodestone',
      },
      {
        objective: { kind: 'prince', prince: 'polar' },
        hint: 'Face Prince Polar at the Polar Observatory',
      },
    ],
    complete: [
      'He came down the steps on his own and stood by the stone a long while. Then he asked me to bring a chair.',
      'He says the telescope can point wherever it likes now. He wants to look at what\'s near. Take the purse.',
    ],
    reward: { orbs: 11, coins: 150 },
  },
];
