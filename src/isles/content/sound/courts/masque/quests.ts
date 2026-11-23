import type { QuestDef } from '../../../../IslesTypes';
import { FISH_DORY, FISH_HAKE } from './items';

/**
 * The Masquerade Court's five side quests.
 *
 * Between them they show how a faceless court is kept: the Part painted on every brow at seven
 * (Pippo), the silence on the water that makes the gondolas crash (Bepi), the night boats that
 * carry the muted up the hill (Zanetta), the Compline fireworks that drown the Organ so no one
 * hears their own in it (Scintilla), and finally the Prince's own face, which nobody has seen in
 * twenty-two years (Ventaglio). Each is somebody wanting to be seen, or heard, as themselves.
 */
export const MASQUE_QUESTS: QuestDef[] = [
  // ── 1. A Blank Brow — collect + talk + duel ──────────────────────────
  {
    id: 'masque-q-blank-face',
    area: 'masque',
    name: 'A Blank Brow',
    giver: 'masque-pippo',
    offer: [
      'Sunday I\'m seven. The Part-Painter comes with her little brush and paints low G on my mask. Forever.',
      'But Ottavia says if I already HAD a mask, a finished one, with nothing on the brow… she could try.',
      'She needs paper for it. Old hymn-sheets. They blow down the calli and stick in the corners.',
      'I\'m not allowed in the calli. They\'re too dark. Would you get them? Four. Please?',
    ],
    accept: [
      'The calli between the mask shops! Then take them to Ottavia. Don\'t tell her I said please. She\'ll cry.',
    ],
    stages: [
      {
        objective: {
          kind: 'collect', area: 'masque', label: 'Stray hymn-sheet', emoji: '📄', color: 0xe6d2b0,
          spots: [{ x: 315, y: 960 }, { x: 625, y: 945 }, { x: 925, y: 970 }, { x: 1300, y: 1000 }],
        },
        hint: 'Gather 4 stray hymn-sheets blown into the calli between the mask shops',
      },
      {
        objective: {
          kind: 'talk', npc: 'masque-ottavia',
          lines: [
            'The Score of two winters ago. Good stiff paper — they print it heavy so it lasts the Hours.',
            'Paste, sheet, paste, sheet, over the form… gesso… and the brow left bare. There. A blank.',
            'Oh. Oh, no. That\'s Biacca at the end of the fondamenta. The Part-Painter. She smells wet gesso.',
          ],
        },
        hint: 'Bring the sheets to Ottavia Gesso at her mask shop',
      },
      {
        objective: {
          kind: 'duel', area: 'masque',
          foe: {
            id: 'masque-q-blank-face-duel',
            court: 'masque',
            name: 'The Part-Painter',
            foeName: 'Part-Painter Biacca',
            foeElement: 'chalk',
            difficulty: 5,
            hpMult: 0.95,
            gimmick: '',
            at: { x: 600, y: 1062 },
            look: { body: 0xe8dcc8, accent: 0xcfa046, hat: 'veil', traits: ['tool', 'apron', 'glasses'], size: 1.05, eye: 0xcfa046 },
            challenge: [
              'A mask with a bare brow is a face. A face in this court is noise. I paint the noise out.',
              'Seven years I\'ve painted that boy\'s G in my head. I have the brass ready. Low G. Lovely.',
              'Hold still. This won\'t hurt. It never hurts. It just never comes off.',
            ],
            beaten: ['…My brush. You\'ve broken my brush. I shall have to send up the hill for a new one. It takes weeks.'],
            coins: 125,
          },
        },
        hint: 'Stop Part-Painter Biacca before her brush reaches Pippo\'s mask',
      },
    ],
    complete: [
      'Nothing on it! Nothing on the brow! When I sing behind this, nobody knows which note is meant to come out!',
      'Mamma says to give you this. It\'s from my birthday money. I don\'t need it. I have a FACE.',
    ],
    reward: { orbs: 11, coins: 90 },
  },

  // ── 2. Mirrors for the Corners — collect + talk + duel ───────────────
  {
    id: 'masque-q-corner-mirrors',
    area: 'masque',
    name: 'Mirrors for the Corners',
    giver: 'masque-bepi',
    offer: [
      'Every blind corner on the canals, we used to call "Oe, premi!" Now calling is noise. So we crash.',
      'I had an idea, lying awake. A mirror on the corner. You look in it, you see the other boat. No calling.',
      'The Hall of Mirrors throws out its cracked off-cuts. Round the sides and back. Nobody wants a cracked mirror.',
      'Bring me three, and Nane can fix them up on his lamp brackets. Silent as you like.',
    ],
    accept: [
      'Three off-cuts from round the Hall, over the Rio. Then Nane — he\'s always somewhere on the riva.',
    ],
    stages: [
      {
        objective: {
          kind: 'collect', area: 'masque', label: 'Mirror off-cut', emoji: '🪞', color: 0xc6d4e0,
          spots: [{ x: 740, y: 1400 }, { x: 240, y: 1300 }, { x: 300, y: 1540 }],
        },
        hint: 'Pick up 3 mirror off-cuts round the Hall of Mirrors',
      },
      {
        objective: {
          kind: 'talk', npc: 'masque-nane',
          lines: [
            'Cracked glass on a lamp bracket, angled down the canal. Ha! Bepi\'s cleverer than he looks.',
            'There — and there — and the third on the Rio corner. Look: you can see the bow of a boat coming.',
            'Ah. Here comes the Canal Warden. He has seen them. He calls it "signalling". Signalling is noise.',
          ],
        },
        hint: 'Take the off-cuts to Nane Ferro the lamplighter on the riva',
      },
      {
        objective: {
          kind: 'duel', area: 'masque',
          foe: {
            id: 'masque-q-corner-mirrors-duel',
            court: 'masque',
            name: 'Signalling Is Noise',
            foeName: 'Canal Warden Sbirro',
            foeElement: 'justice',
            difficulty: 5,
            hpMult: 1,
            gimmick: 'masque-hall-of-mirrors',
            at: { x: 1380, y: 1215 },
            look: { body: 0xb8c4b0, accent: 0x1f4a4c, hat: 'tricorn', traits: ['mask', 'cane'], size: 1.15, eye: 0x3f7f78 },
            challenge: [
              'A mirror on a corner shows one boat to another. That is a message. Messages are noise.',
              'I fine the crash. Both boats. It is the cleanest little fine in the court. You\'ve ruined it.',
              'You like mirrors? Let\'s see how you like them pointed at you.',
            ],
            beaten: ['…Fine. FINE. A mirror is not a message. I shall write that down. I shall hate writing it down.'],
            coins: 125,
          },
        },
        hint: 'Beat Canal Warden Sbirro on the Rio before he takes the mirrors down',
      },
    ],
    complete: [
      'Not one crash. A whole week. The boys look in Nane\'s mirrors and wave to each other. WAVE.',
      'Here. The Warden\'s fines I\'d have paid. And a hake — they rise for me now the water\'s quiet.',
    ],
    reward: { orbs: 12, coins: 100, item: FISH_HAKE, itemCount: 2 },
  },

  // ── 3. The Night Boats — visit + collect + defeat ────────────────────
  {
    id: 'masque-q-night-boats',
    area: 'masque',
    name: 'The Night Boats',
    giver: 'masque-zanetta',
    offer: [
      'After Compline the Tuners\' boats go up the canals to the cathedral. Covered. Curtained. Full.',
      'The muted ride in them, with the white ribbon still being tied. I built every one of those boats.',
      'A gondola can\'t be rowed without its forcola — the oarlock. I carve each one to fit its boat.',
      'Pull the forcole off the night boats tonight, and nobody goes up the hill. Will you?',
    ],
    accept: [
      'Look at the slip first, so you know the shape. Then the three night boats moored round the yard.',
    ],
    stages: [
      {
        objective: { kind: 'visit', area: 'masque', at: { x: 1960, y: 1470 }, r: 60, label: 'The squero\'s slipway' },
        hint: 'Look over the half-built night boat on the squero\'s slipway',
      },
      {
        objective: {
          kind: 'collect', area: 'masque', label: 'Night boat\'s forcola', emoji: '🛶', color: 0x7a5436,
          spots: [{ x: 1875, y: 1300 }, { x: 2240, y: 1300 }, { x: 2050, y: 1215 }],
        },
        hint: 'Pull the forcole off the 3 night boats moored round the squero',
      },
      {
        objective: { kind: 'defeat', encounter: 'masque-gondola' },
        hint: 'Face Gondolier Remo (Gondola) at the squero when he finds his boats unrowable',
      },
    ],
    complete: [
      'Not one boat went up last night. Remo stood on the slip with no oarlock and sang to nobody.',
      'Take my wages for the night boats. I never wanted them. I\'ll burn the forcole in the stove.',
    ],
    reward: { orbs: 12, coins: 110 },
  },

  // ── 4. A Quiet Compline — collect + talk + duel ──────────────────────
  {
    id: 'masque-q-quiet-compline',
    area: 'masque',
    name: 'A Quiet Compline',
    giver: 'masque-scintilla',
    offer: [
      'My mother sang flat at Vespers last spring. They took her the same night. She\'s in the Organ now.',
      'At Compline you can hear them, the ones in the pipes. That\'s why we let the fireworks off. So you can\'t.',
      'I want ONE quiet Compline. One. So I can listen for her. If the slow-match goes missing, nothing lights.',
      'There\'s four coils by the rocket stands on the quay. Will you?',
    ],
    accept: [
      'Four coils. Then — I don\'t know how I\'ll find her. There must be a thousand pipes. I\'ll think.',
    ],
    stages: [
      {
        objective: {
          kind: 'collect', area: 'masque', label: 'Coil of slow-match', emoji: '🧨', color: 0xff5a4a,
          spots: [{ x: 1700, y: 400 }, { x: 1880, y: 545 }, { x: 2100, y: 380 }, { x: 2320, y: 520 }],
        },
        hint: 'Take the 4 coils of slow-match from beside the rocket stands on the fireworks quay',
      },
      {
        objective: {
          kind: 'talk', npc: 'masque-lucia',
          lines: [
            '(Lucia listens as you explain. Her hands go still. Then she signs, slowly, so you can follow.)',
            '(She writes in the dust: EVERY VOICE SINGS ITS OWN WAY. EVEN IN THE ORGAN. LISTEN FOR THE HABIT.)',
            '(She points across the canal toward the quay — someone big, with a lantern, is coming fast.)',
          ],
        },
        hint: 'Ask Lucia Merletti how to find one voice among the Organ\'s thousand',
      },
      {
        objective: {
          kind: 'duel', area: 'masque',
          foe: {
            id: 'masque-q-quiet-compline-duel',
            court: 'masque',
            name: 'The Show Goes Up',
            foeName: 'Barge-Master Razzo',
            foeElement: 'fire',
            difficulty: 5,
            hpMult: 1,
            gimmick: 'masque-fireworks-barge',
            at: { x: 1750, y: 420 },
            look: { body: 0xc8906e, accent: 0xff5a4a, hat: 'souwester', traits: ['beard', 'lantern', 'bandage'], size: 1.25, eye: 0xffb04a },
            challenge: [
              'Somebody\'s had my slow-match. No matter. I light them by hand if I have to. With THIS.',
              'The show goes up at Compline, every Compline, by order. Nobody in this court is going to listen tonight.',
              'Stand on the quay and watch, then. You\'ll see a face in every shell.',
            ],
            beaten: ['…Lantern\'s out. Fuse is wet. Show\'s off. Tell the Prince the weather did it. He\'ll believe weather.'],
            coins: 125,
          },
        },
        hint: 'Beat Barge-Master Razzo on the fireworks quay before Compline',
      },
    ],
    complete: [
      'Compline came and nothing went up. And there it was — the Organ — a thousand voices, and one of them…',
      'Skipped the third bar. Like always. A bit flat. Mamma. I heard her. Here — everything I\'ve saved. Everything.',
    ],
    reward: { orbs: 13, coins: 120 },
  },

  // ── 5. His Own Face — talk + fish + deliver + prince ─────────────────
  {
    id: 'masque-q-his-own-face',
    area: 'masque',
    name: 'His Own Face',
    giver: 'masque-ventaglio',
    requires: { courtReady: 'masque' },
    offer: [
      'You have beaten all five. His Highness will receive you. Before he does — you should know who he was.',
      'Go and ask Ottavia Gesso, the mask-maker. She knew him before the mask. She is the only one.',
      'And if she tells you of a dish, bring it to me. I will set it at his place. He eats alone, masked.',
    ],
    accept: [
      'Ottavia, on the fondamenta. I will be on the steps. I have been on these steps for nineteen years.',
    ],
    stages: [
      {
        objective: {
          kind: 'talk', npc: 'masque-ottavia',
          lines: [
            'He\'s my brother. Amadeo. He couldn\'t keep a thing off his face — every joy, every sulk, out in the open.',
            'He laughed out loud at Vespers once, at a dog. The Maestro was passing. He thought it was charming.',
            'He gave Amadeo a porcelain mask that never comes off, and made him Prince of a court with no faces.',
            'Mamma used to cook him dory in saor every Sunday. Onions, raisins, vinegar. He\'d grin like a fool.',
          ],
        },
        hint: 'Ask Ottavia Gesso who the Prince was before the mask',
      },
      {
        objective: { kind: 'fish', fish: FISH_DORY, count: 1 },
        hint: 'Catch a domino dory in the Rio dei Mascherai',
      },
      {
        objective: {
          kind: 'deliver', npc: 'masque-ventaglio', item: FISH_DORY, count: 1,
          lines: [
            'Dory. In saor, you say. I will have the kitchen do it so, and set it at his place without a word.',
            'He has seen it. He is standing at the eye window. He has put his hand to his mask. He will see you now.',
          ],
        },
        hint: 'Bring the dory to Ser Ventaglio on the steps of the Palazzo Facciata',
      },
      {
        objective: { kind: 'prince', prince: 'facade' },
        hint: 'Face Prince Facade at the Palazzo Facciata',
      },
    ],
    complete: [
      'He came down the stairs with the mask in his hand. He did not look at me. He looked at the street.',
      'Then he asked me — me — whether his face would do. I said it would do very well. Take the household purse.',
    ],
    reward: { orbs: 14, coins: 200 },
  },
];
