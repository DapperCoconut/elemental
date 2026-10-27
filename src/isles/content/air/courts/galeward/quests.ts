import type { QuestDef } from '../../../../IslesTypes';
import { LEAP, TOLLEY_BOTTLE, VANES } from './area';
import { FISH_SPRAT, FOOD_BAP, RECIPE_BAP } from './items';
import { NPC, Q_CORKED, Q_HOUSE, Q_KITEMAIL, Q_LOAVES, Q_NORTH } from './npcs';

/**
 * The Galeward Court's five side quests.
 *
 * The first court on Highspire, so between them they show how the Breath Tax works: what being
 * becalmed is and where the bottles go (Wren), how even a loaf's rise is billed (Skeet and Quern),
 * the pinned vanes that keep the mills short (Corvin), the kites that carry what the bridges tax
 * (Tuck), and finally the boy who flew kites before his father gave him a meter (Aurelia and Nan).
 * Each one is somebody taking a breath they have not paid for.
 */
export const GALEWARD_QUESTS: QuestDef[] = [
  // ── 1. Corked — collect + talk + duel ────────────────────────────────
  {
    id: Q_CORKED,
    area: 'galeward',
    name: 'Corked',
    giver: NPC.wren,
    offer: [
      'Ma\'s breath is in a bottle on the rack by the bellows. TOLLEY, on a brass tag. They took it three days ago.',
      'At dusk the racks go up the cargo lift to the Lung. If her bottle goes up, she sleeps till the debt\'s paid.',
      'I\'m not tall enough to reach the third row. And the Corkwarden knows my face. He doesn\'t know yours.',
      'Would you lift it down for me? Just one bottle. It\'s only hers. It was only ever hers.',
    ],
    accept: [
      'End rack, third row. Don\'t drop it — if it breaks, the breath just goes. Into the sky. And she doesn\'t wake.',
    ],
    stages: [
      {
        objective: {
          kind: 'collect', area: 'galeward', label: 'Ma Tolley\'s bottle', emoji: '🍾', color: 0x9fe2ff,
          spots: [TOLLEY_BOTTLE],
        },
        hint: 'Lift the bottle tagged TOLLEY off the end rack by the toll-bellows',
      },
      {
        objective: {
          kind: 'talk', npc: NPC.wren,
          lines: [
            'That\'s it. That\'s her. You can see it moving in there, can\'t you? Like a little cloud.',
            'Hold it under her nose and pull the cork. Gently… gently… — she breathed. She BREATHED. Ma?',
            'Oh no. He\'s coming. The Corkwarden. He counts the rack every hour. He\'s counted one short.',
          ],
        },
        hint: 'Bring the bottle to Wren at the cots of the becalmed',
      },
      {
        objective: {
          kind: 'duel', area: 'galeward',
          foe: {
            id: 'galeward-q-corked-duel',
            court: 'galeward',
            name: 'One Short on the Rack',
            foeName: 'Corkwarden Ambrose Stopple',
            foeElement: 'metal',
            difficulty: 3,
            hpMult: 0.95,
            gimmick: '',
            at: { x: 1280, y: 1560 },
            look: { body: 0xc8b8a4, accent: 0x7e5c20, hat: 'helmet', traits: ['tool', 'satchel'], size: 1.2, eye: 0xf4d68e },
            challenge: [
              'Seventy-two on the rack. I count seventy-one. And I count an uncorked woman sitting up on a cot.',
              'A debt is a debt. A breath is a breath. Mixing them up is how a spire runs out of air.',
              'I\'ll take that one back out of you, and the bottle with it. Hold still. Corks go in easier on the still.',
            ],
            beaten: ['…Seventy-one. I\'ll write seventy-one. The lift won\'t know. The lift can\'t count.'],
            coins: 65,
          },
        },
        hint: 'Stand off Corkwarden Ambrose Stopple at the toll',
      },
    ],
    complete: [
      'She\'s sitting up. She\'s sitting up and telling the meter-man what she thinks of him. LOUD.',
      'Ma says to give you this. It\'s what was left of the tax money. She says she\'s not paying it now on principle.',
    ],
    reward: { orbs: 6, coins: 60 },
  },

  // ── 2. Bread for the Becalmed — fish + cook + deliver + duel ─────────
  {
    id: Q_LOAVES,
    area: 'galeward',
    name: 'Bread for the Becalmed',
    giver: NPC.skeet,
    offer: [
      'The families of the becalmed go hungry at the cots. Every copper they have goes on the debt.',
      'Quern bakes for them when he can. Sprat baps. But sprat\'s cloud fish, and my wrist isn\'t what it was.',
      'Cast off the edge for me, would you? Three cirrus sprat. Then take them to Quern at the Millstone.',
    ],
    accept: [
      'Out over the white, let it drop. Sprats bite near the tops. Skyline rod, mind — the cloud eats anything less.',
    ],
    stages: [
      {
        objective: { kind: 'fish', fish: FISH_SPRAT, count: 3 },
        hint: 'Catch 3 cirrus sprat off the Cloudbank',
      },
      {
        objective: { kind: 'cook', recipe: RECIPE_BAP },
        hint: 'Have Dusty Quern bake sprat baps at the Millstone',
      },
      {
        objective: {
          kind: 'deliver', npc: NPC.wren, item: FOOD_BAP, count: 2,
          lines: [
            'Baps! From Quern? Still warm! I\'ll break them up for the cot families. Everyone gets a bit.',
            'Oh — oh, don\'t look now. That\'s the Assessor. She weighs the bread. She says the rise in it is breath.',
          ],
        },
        hint: 'Take 2 sprat baps to Wren at the cots of the becalmed',
      },
      {
        objective: {
          kind: 'duel', area: 'galeward',
          foe: {
            id: 'galeward-q-loaves-duel',
            court: 'galeward',
            name: 'The Rise Is Taxable',
            foeName: 'Assessor Penny Draught',
            foeElement: 'fortune',
            difficulty: 3,
            hpMult: 0.95,
            gimmick: '',
            at: { x: 1110, y: 1380 },
            look: { body: 0xe8d4bc, accent: 0xd2a446, hat: 'tophat', traits: ['book', 'glasses'], size: 0.95, eye: 0xf4d68e },
            challenge: [
              'A loaf is flour, water, salt and AIR. The first three are yours. The fourth was drawn above the cloud line.',
              'Two baps, risen, say a lungful apiece. Given away free to debtors. That is a gift of the Crown\'s property.',
              'Hand me the crumbs and I shall assess them. Or I can assess you. Same rate.',
            ],
            beaten: ['…Flat bread is exempt. I shall rule they were flat. They looked flat. Everything looks flat from down here.'],
            coins: 65,
          },
        },
        hint: 'See off Assessor Penny Draught on Vane Street',
      },
    ],
    complete: [
      'Every cot family had a bite. Quern\'s been baking for them since, and leaving the bread to rise. On purpose.',
      'The cot families had a whip-round for you. Coppers, mostly. The first money in years they chose to spend.',
    ],
    reward: { orbs: 6, coins: 50 },
  },

  // ── 3. True North — talk + collect + duel ────────────────────────────
  {
    id: Q_NORTH,
    area: 'galeward',
    name: 'True North',
    giver: NPC.corvin,
    offer: [
      'Every vane in Galeward was made in my forge. Every one of them is lying to the millers.',
      'The Prince had them pinned. They point at the toll-house whatever the wind does. "That way to pay."',
      'A miller who can\'t read a gust coming can\'t set his sails for it. He grinds short. Short is debt.',
      'Four vanes round the square. Pull the pins out of their collars and the wind\'ll set them true again.',
    ],
    accept: [
      'Brass pins with the Prince\'s mark, at the foot of each pole. The square\'s north-west one first — it\'s worst.',
    ],
    stages: [
      {
        objective: {
          kind: 'collect', area: 'galeward', label: 'Vane pin', emoji: '📌', color: 0xd2a446,
          spots: VANES.map((v) => ({ x: v.x + 22, y: v.y + 26 })),
        },
        hint: 'Pull the brass pins from the 4 vanes round Weathercock Square',
      },
      {
        objective: {
          kind: 'talk', npc: NPC.corvin,
          lines: [
            'Look at them go! All four, swinging free — west, west, west-sou\'-west. Honest as the day I made them.',
            'Thresh\'s already setting his sails on the Grindstone. Listen to her. Hear that? That\'s flour.',
            'Ah. And that\'s the Vane-Warden coming down the east road with a pocketful of new pins. Typical.',
          ],
        },
        hint: 'Tell Corvin Brass the vanes are free',
      },
      {
        objective: {
          kind: 'duel', area: 'galeward',
          foe: {
            id: 'galeward-q-true-north-duel',
            court: 'galeward',
            name: 'Pinned to the Toll',
            foeName: 'Vane-Warden Sparrow Rodd',
            foeElement: 'electricity',
            difficulty: 3,
            gimmick: 'galeward-crosswind',
            at: { x: 1460, y: 790 },
            look: { body: 0xd4c4b0, accent: 0x3a6fb8, hat: 'goggles', traits: ['tool', 'glasses'], size: 1.05, eye: 0xcde9fb },
            challenge: [
              'A free vane is a confused town. People stand in the square licking their fingers. Nobody gets anything done.',
              'Pinned, every vane says one thing: pay. Simple. Kind, even. I\'m doing the millers a kindness.',
              'You want an honest wind? Fine. Let\'s fight in one, and see who it likes.',
            ],
            beaten: ['…It went round on me. Every time. Honest wind\'s a terrible thing to stand in. Keep your pins.'],
            coins: 65,
          },
        },
        hint: 'Beat Vane-Warden Sparrow Rodd before he re-pins the vanes',
      },
    ],
    complete: [
      'The Grindstone ran all night on the westerly. Thresh came round with a sack of flour. A WHOLE sack, untaxed.',
      'I\'ve melted the pins down. Take this — it\'s their worth in coin, and a smith\'s thanks on top.',
    ],
    reward: { orbs: 7, coins: 60 },
  },

  // ── 4. Kite Mail — collect + defeat ──────────────────────────────────
  {
    id: Q_KITEMAIL,
    area: 'galeward',
    name: 'Kite Mail',
    giver: NPC.tuck,
    offer: [
      'Crossing a gorge bridge costs a breath. So the families on the Kite Field side can\'t come and visit much.',
      'So we fly letters over. Tie it to a kite, let it out over the gorge, they reel it in. Kite Mail.',
      'Oriel cut all three lines this morning. The letters came down on the far side, in the grass by the posts.',
      'One of them\'s from the Hollins about their boy on the cots. Please. Before Oriel finds them.',
    ],
    accept: [
      'Over the bridges, by the posts. They\'re folded small and tied with red thread. Kite Mail is always red thread.',
    ],
    stages: [
      {
        objective: {
          kind: 'collect', area: 'galeward', label: 'Kite Mail letter', emoji: '✉️', color: 0xc8402e,
          spots: [{ x: 2010, y: 1150 }, { x: 2260, y: 1210 }, { x: 2030, y: 1450 }],
        },
        hint: 'Find 3 fallen Kite Mail letters on the Kite Field, over the gorge bridges',
      },
      {
        objective: { kind: 'defeat', encounter: 'galeward-kite-fight' },
        hint: 'Face Kiteflyer Oriel (Kite Fight) on the Kite Field when she comes for the letters',
      },
    ],
    complete: [
      'All three got there! The Hollins\' boy\'s going to be uncorked — his family worked the debt down a whole month!',
      'Oriel says she\'ll fly the post herself now. Here — the families sent coppers. And I sent my best kite string.',
    ],
    reward: { orbs: 5, coins: 45 },
  },

  // ── 5. The Weather House — talk + visit + prince ─────────────────────
  {
    id: Q_HOUSE,
    area: 'galeward',
    name: 'The Weather House',
    giver: NPC.aurelia,
    requires: { courtReady: 'galeward' },
    offer: [
      'All five. His Highness has asked for his flying-coat. He has not worn it since he was twelve.',
      'Before you go up, you should understand who you are going up to. Nan Brisk on the square knew him as a boy.',
      'Then go and stand on the Leap. He used to stand there for hours. He still does, when he thinks no one sees.',
    ],
    accept: [
      'Nan, then the Leap. Then the Weather House door. I shall leave it open.',
    ],
    stages: [
      {
        objective: {
          kind: 'talk', npc: NPC.nan,
          lines: [
            'Zephyr? Best kite-flyer this shoulder ever saw. Four years old and he could hold a red kite in a gale.',
            'His father came down from the Lung to watch him once. Watched for an hour. Then he cut the line.',
            'Gave him an anemometer instead. "Measure it, boy. Don\'t play in it." He\'s been measuring ever since.',
          ],
        },
        hint: 'Ask Nan Brisk on Weathercock Square about the Prince as a boy',
      },
      {
        objective: { kind: 'visit', area: 'galeward', at: LEAP, r: 90, label: 'The Leap' },
        hint: 'Stand on the Leap, at the cliff edge past the vents',
      },
      {
        objective: { kind: 'prince', prince: 'zephyr' },
        hint: 'Face Prince Zephyr at the Weather House',
      },
    ],
    complete: [
      'He has unpinned the cock on the cupola with his own hands. It is spinning. He is watching it spin.',
      'He asked me if I knew where the wind was from. I said no, Highness. He said, "Good. Neither do I."',
      'Take the steward\'s purse. He says the Weather House is to report the weather now. Nothing else.',
    ],
    reward: { orbs: 9, coins: 150 },
  },
];
