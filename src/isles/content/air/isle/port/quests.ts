import type { QuestDef } from '../../../../IslesTypes';

/**
 * Windlass's five quests. The first is the isle's welcome in disguise — you are fitted with a
 * breath-meter at the Meter House and shown what a cough costs. The second sends you out on the
 * Gull Mole to fish for the men on the wheel. The rest are small stories about a town that lives
 * under the one free sky on Highspire and works under the taxed one: kites, gulls, and finally the
 * meters themselves.
 *
 * Every quest ends in a fight with one of the King's servants in the port. Their elements are all
 * different: pressure, fortune, air, hunt, time.
 */
export const WINDLASS_QUESTS: QuestDef[] = [
  // ── 1. Below the Line ─────────────────────────────────────────────
  {
    id: 'windlass-below-the-line', area: 'windlass', name: 'Below the Line', giver: 'windlass-dock',
    offer: [
      'You walk off a boat and the first thing anyone will do is strap a meter on you. Visitors too. Everyone.',
      'Down here it sleeps. Up the spire, above the cloud, it ticks for every breath, and every tick is owed.',
      'Go and be fitted before a collector fits you himself. Ada does it at the Meter House, east of the Lift Yard.',
    ],
    accept: [
      'Big brass dial over the door, bellows on the roof, puffing. The only building in town that wheezes.',
      'Stand still while she straps it. People squirm. It goes very badly for them; the buckles pinch.',
    ],
    stages: [
      {
        objective: {
          kind: 'talk', npc: 'windlass-fitter',
          lines: [
            'Arms out. — There. Snug. One visitor, fitted. It will not tick until you go up. Breathe easy down here.',
            'Not everyone is easy this morning. Saul Pellow is eleven months behind. Coughing counts, up there.',
            'Corker Brusk came down the lift at dawn with an empty crate. West along the cliff foot. I only fit them.',
          ],
        },
        hint: 'Be fitted with a breath-meter by Ada Bellweather at the Meter House',
      },
      {
        objective: { kind: 'visit', area: 'windlass', at: { x: 470, y: 470 }, r: 110, label: 'Saul Pellow\'s door' },
        hint: 'Go west along the cliff foot to Old Saul Pellow\'s rock-cut door',
      },
      {
        objective: {
          kind: 'talk', npc: 'windlass-saul',
          lines: [
            'You have come from the Meter House. Then you know. Eleven months. Thirty years on the wheel did this.',
            'My daughter is up the spire. I go up to see her, and I cough the whole way. Every cough ticks.',
            'And there — that is Brusk, with his crate and his corking-iron. He has come to bottle me.',
          ],
        },
        hint: 'Speak to Old Saul Pellow at his door',
      },
      {
        objective: {
          kind: 'duel', area: 'windlass',
          foe: {
            id: 'windlass-below-the-line-duel', court: 'windlass', name: 'The Corking',
            foeName: 'Corker Brusk', foeElement: 'pressure', difficulty: 3, hpMult: 0.95,
            gimmick: '', at: { x: 640, y: 470 }, coins: 55,
            look: { body: 0x8a7a70, accent: 0x2a5a7a, hat: 'helmet', traits: ['tool', 'apron', 'mask'], size: 1.3, eye: 0xc8ecff },
            challenge: [
              'Pellow. Eleven months in arrears. One bottle of breath, corked and sealed, by the King\'s leave.',
              'It does not hurt. You go to sleep. The breath goes up to the Lung and does some good for once.',
              'The visitor. Fitted this morning. Breathe somewhere else, or I will see how much you hold.',
            ],
            beaten: ['My corking-iron. You have — fine. The crate goes back up empty. The Lung can wait for its breath.'],
          },
        },
        hint: 'Corker Brusk has come to bottle Saul Pellow\'s breath — stop him',
      },
    ],
    complete: [
      'The crate went back up the lift EMPTY? On your first day? Ha! I heard Brusk cursing from the quay.',
      'That is the Breath Tax, then. Now you know what a cough costs. Six princes keep it, all up the spire.',
      'North up the Hundred Turns to Galeward is gentlest. Here — for the breath you did not have to pay.',
    ],
    reward: { orbs: 5, coins: 60 },
  },

  // ── 2. The Long Haul ──────────────────────────────────────────────
  {
    id: 'windlass-long-haul', area: 'windlass', name: 'The Long Haul', giver: 'windlass-foreman',
    offer: [
      'My lads have been on the wheel since before light. Twenty of them, walking inside it, hauling the cage.',
      'They have not eaten. There is a new man up there, a tally-man, and eating on shift costs extra breath.',
      'Two gull herring and a cliff cod, and Hester will make pasties. I will smuggle them up in the cage.',
    ],
    accept: [
      'Fish off the Gull Mole, east of the South Quay. Press E at the water and wait for the tug.',
      'Herring come up like washing. Cod live under the drowned ledges and pull like a sulk.',
    ],
    stages: [
      {
        objective: { kind: 'fish', fish: 'fish-gull-herring', count: 2 },
        hint: 'Catch 2 Gull Herring off the Gull Mole or the South Quay',
      },
      {
        objective: { kind: 'fish', fish: 'fish-cliff-cod', count: 1 },
        hint: 'Catch a Cliff Cod (they lurk under the drowned ledges)',
      },
      {
        objective: { kind: 'cook', recipe: 'recipe-windlass-haulers-pasty' },
        hint: 'Have the Rising Loaf bake a Haulier\'s Pasty (2 Gull Herring, 1 Cliff Cod)',
      },
      {
        objective: {
          kind: 'deliver', npc: 'windlass-foreman', item: 'meal-windlass-haulers-pasty', count: 1,
          lines: [
            'Look at that crust. Hester crimps them like a wheel-rung. The lads will eat it walking. They are good at that.',
            '...Oh no. Abacus on a chain, coming down the Turns. That is Tallyman Dole.',
            'He counts every bite. Chewing is breathing, he says. Every bite a breath. Every breath a coin.',
          ],
        },
        hint: 'Bring the Haulier\'s Pasty to Big Tam Capstan at the Lift Foot',
      },
      {
        objective: {
          kind: 'duel', area: 'windlass',
          foe: {
            id: 'windlass-long-haul-duel', court: 'windlass', name: 'Chewing Is Breathing',
            foeName: 'Tallyman Crispin Dole', foeElement: 'fortune', difficulty: 3, hpMult: 0.95,
            gimmick: '', at: { x: 1540, y: 560 }, coins: 60,
            look: { body: 0xb0a088, accent: 0xd4aa4a, hat: 'tophat', traits: ['book', 'glasses', 'satchel'], size: 0.95, eye: 0xf0e080 },
            challenge: [
              'A pasty! For the wheel! How thoughtful. That will be four bites a man. Eighty breaths. Payable now.',
              'I do not make the rates. I only add them up. I add them up very, very well.',
              'Stand aside, visitor, or I will tally you. I have a column for visitors. It is mostly debt.',
            ],
            beaten: ['My abacus — my beads! ...Fine. "Wheel lads: fasted." There. I have written it. Let them eat.'],
          },
        },
        hint: 'Tallyman Dole is on the Lift Yard to charge the hauliers for every bite — stop him',
      },
    ],
    complete: [
      'He went back up the Turns with half his beads in his pockets! The pasties went up in the cage. All of them.',
      'Fisher\'s pay, and a foreman\'s thanks. Next time you ride the cage, the lads will haul you gentle.',
    ],
    reward: { orbs: 5, coins: 55 },
  },

  // ── 3. Unlicensed Air ─────────────────────────────────────────────
  {
    id: 'windlass-unlicensed-air', area: 'windlass', name: 'Unlicensed Air', giver: 'windlass-kite',
    requires: { questDone: 'windlass-below-the-line' },
    offer: [
      'The King\'s kite warden came through the market last night with a hooked knife on a pole. Snip, snip, snip.',
      'Every line cut. "Unlicensed use of the air." A kite is the air, using itself. You cannot license that.',
      'The wind took them all up the cliff. Four of mine — Absalom\'s frames — are caught on the ledges. Please.',
    ],
    accept: [
      'Four kites. One on the cliff foot each side, one by the Gull Post, one blown down onto the quay.',
      'Mind the frames. Absalom built them. He is asleep, up the spire. He does not know they were cut.',
    ],
    stages: [
      {
        objective: {
          kind: 'collect', area: 'windlass', label: 'cut kite', emoji: '🪁', color: 0xe85a4a,
          spots: [{ x: 150, y: 470 }, { x: 2460, y: 470 }, { x: 380, y: 1010 }, { x: 1600, y: 1220 }],
        },
        hint: 'Gather 4 cut kites blown about Windlass — cliff foot, Gull Post and quay',
      },
      {
        objective: {
          kind: 'talk', npc: 'windlass-kite',
          lines: [
            'All four. And the frames are sound. Look — not a spar cracked. He builds them to fall and get up.',
            'New line, new bridle — there. Up she goes. Red, over the Hundred Turns. Where he might see it.',
            'And here comes Snipe with his pole. He saw it go up. Of course he did. It is the only thing in the sky.',
          ],
        },
        hint: 'Bring the kites back to Wren Ribbonsby at the kite market',
      },
      {
        objective: {
          kind: 'duel', area: 'windlass',
          foe: {
            id: 'windlass-unlicensed-air-duel', court: 'windlass', name: 'No Licence for the Sky',
            foeName: 'Kite Warden Snipe', foeElement: 'air', difficulty: 3, hpMult: 1,
            gimmick: '', at: { x: 960, y: 700 }, coins: 60,
            look: { body: 0xa89884, accent: 0x2a5a7a, hat: 'aviator', traits: ['tool', 'scarf', 'glasses'], size: 1.1, eye: 0xc8ecff },
            challenge: [
              'A kite. Up. Over the Turns. With no licence pinned to its tail. In my sky.',
              'The air belongs to His Majesty, all of it, from the cloud line to the stars. Kites borrow it. Unpaid.',
              'Out of the way, visitor. Or I will cut you loose and see which way you blow.',
            ],
            beaten: ['My pole — snapped. ...Let it fly, then. It will only come down. Everything does. Eventually.'],
          },
        },
        hint: 'Kite Warden Snipe has come to cut the red kite down — stop him',
      },
    ],
    complete: [
      'He went back up the Turns with half a pole and no hat! The wind took his hat. The wind has opinions.',
      'Every kite in the market is going up tonight. Every one. Let him come and cut them all.',
      'Take this — what I was saving for Absalom\'s debt. We will pay it in kites, if they want it. They will not.',
    ],
    reward: { orbs: 6, coins: 50 },
  },

  // ── 4. The Gull Post ──────────────────────────────────────────────
  {
    id: 'windlass-gull-post', area: 'windlass', name: 'The Gull Post', giver: 'windlass-gull',
    requires: { questDone: 'windlass-below-the-line' },
    offer: [
      'The Gull Post carries letters up the spire for a herring. The lift charges breath. Gulls do not.',
      'The King has sent a falconer. Kestrel Vane. Three of my gulls came home this morning without their letters.',
      'They drop them when the hawk stoops. The little tubes. One of them is to my mam. Please find them.',
    ],
    accept: [
      'Brass tubes, this long. They fall where the gulls flinch. The stair foot, the mole, the west quay.',
    ],
    stages: [
      {
        objective: {
          kind: 'collect', area: 'windlass', label: 'letter tube', emoji: '✉️', color: 0xd4aa4a,
          spots: [{ x: 1150, y: 470 }, { x: 2062, y: 1390 }, { x: 330, y: 1230 }],
        },
        hint: 'Find 3 dropped letter-tubes — the stair foot, the Gull Mole and the west quay',
      },
      {
        objective: {
          kind: 'talk', npc: 'windlass-gull',
          lines: [
            'All three! And Mam\'s. Look, the seal\'s not even broken. Barnacle, you coward, you dropped it.',
            'The nurse at the Slumber Court writes for her. "Your mother smiled in her sleep. She is counting sheep."',
            'And there — on the bollard. Hood and glove. That is Vane, and his bird is watching my roost.',
          ],
        },
        hint: 'Bring the letters back to Moll Gannet at the Gull Post',
      },
      {
        objective: {
          kind: 'duel', area: 'windlass',
          foe: {
            id: 'windlass-gull-post-duel', court: 'windlass', name: 'The Falconer\'s Stoop',
            foeName: 'Falconer Kestrel Vane', foeElement: 'hunt', difficulty: 4, hpMult: 0.95,
            gimmick: '', at: { x: 560, y: 1140 }, coins: 65,
            look: { body: 0x9a8670, accent: 0x5a3a2a, hat: 'hood', traits: ['satchel', 'mask', 'scarf'], size: 1.1, eye: 0xf0c040 },
            challenge: [
              'Gulls. Carrying words up the King\'s spire, unmetered, for a fish. Every one is breath not paid.',
              'My hawk does not hate them. She only stoops. Stooping is what she is for. Like me.',
              'Give me the child\'s letters, visitor. Or my hawk will take an interest in you.',
            ],
            beaten: ['Hooded. She is hooded. ...Fly your gulls. The hawk is tired. I am tired. Fly them.'],
          },
        },
        hint: 'Falconer Kestrel Vane is on the west quay to hunt the gulls — drive him off',
      },
    ],
    complete: [
      'He went off up the Turns with his hawk hooded and his glove in his teeth! The gulls chased him! ALL of them!',
      'I am writing to Mam tonight. I am going to tell her about you. Gulls do not charge for long letters.',
      'Take this. It is the Post\'s takings. Mostly herring. I swapped the herring for coins. Mostly.',
    ],
    reward: { orbs: 6, coins: 45 },
  },

  // ── 5. Counted Twice ──────────────────────────────────────────────
  {
    id: 'windlass-counted-twice', area: 'windlass', name: 'Counted Twice', giver: 'windlass-fitter',
    requires: { princesOfIsle: 'air', count: 2 },
    offer: [
      'Nineteen years I have fitted meters. And for six, the debts have grown faster every month. Every house.',
      'Last night I wore one myself up the Turns and counted my own breaths. Two hundred. The dial read two-fifty.',
      'When the collectors cork a debtor, they throw the old meter in the harbour. I need those. Four of them.',
    ],
    accept: [
      'They wash up all over — the cliff foot, the waterfront, the market. Brass. They glint. Bring me four.',
      'If they all read fast... then I have been strapping a lie on every chest in Windlass for six years.',
    ],
    stages: [
      {
        objective: {
          kind: 'collect', area: 'windlass', label: 'cast-off meter', emoji: '⏲️', color: 0xd4aa4a,
          spots: [{ x: 600, y: 456 }, { x: 1460, y: 1010 }, { x: 2420, y: 900 }, { x: 1880, y: 1230 }],
        },
        hint: 'Find 4 cast-off breath-meters washed up around Windlass',
      },
      {
        objective: {
          kind: 'talk', npc: 'windlass-fitter',
          lines: [
            'Open the back — there. The ratchet wheel. Count the teeth with me. ...Thirteen. A meter wheel has twelve.',
            'Every one. One tooth in thirteen counts twice. Every fourth breath, near enough, ticks double. Six years.',
            'Every house I fitted. Every cork. — And there is Master Vent, coming across the Yard to see why I stopped.',
          ],
        },
        hint: 'Bring the meters to Ada Bellweather at the Meter House',
      },
      {
        objective: {
          kind: 'duel', area: 'windlass',
          foe: {
            id: 'windlass-counted-twice-duel', court: 'windlass', name: 'The Thirteenth Tooth',
            foeName: 'Master of Meters Osric Vent', foeElement: 'sand', difficulty: 4, coins: 80,
            gimmick: '', at: { x: 2000, y: 720 },
            look: { body: 0x9a8a78, accent: 0xd4aa4a, hat: 'tophat', traits: ['glasses', 'cane', 'beard'], size: 1.25, eye: 0xf0e080 },
            challenge: [
              'Mistress Bellweather. Your bench is quiet. And there are dead men\'s meters on it, opened. Illegal.',
              'A breath is what His Majesty says a breath is. The Lung needs more. So the breath grew a tooth.',
              'That is not a lie, visitor. That is the law, ticking. Step off my Yard, or I will wind you down.',
            ],
            beaten: ['The wheel... stops. ...It was never true. I know. I cut the first one myself. I only counted.'],
          },
        },
        hint: 'Master of Meters Osric Vent is on the Lift Yard — make him answer for the false wheels',
      },
    ],
    complete: [
      'His thirteen-tooth wheels are at the bottom of the harbour, and I am re-cutting every ratchet by hand.',
      'Half of Windlass came out of debt this morning. Half. I counted the corks that did not go up.',
      'Take my mother\'s meter — twelve teeth, cut true. It never counted a breath twice. Let it count for you.',
    ],
    reward: { orbs: 8, coins: 130, item: 'charm-windlass-true-meter' },
  },
];
