import { ElementCodex } from '../AbilityCodex';

/**
 * Math — the scholar with a stick of chalk (element id `magic`; it replaced Magic 2026-11-23).
 *
 * Verified against `src/elements/magic.ts`, `kits/MathKit.ts` and `kits/MathProblems.ts`. Every
 * number below is a constant at the top of the kit. No upgrades, perks or mastery yet.
 */
const magic: ElementCodex = {
  identity:
    'A scholar who fights with a blackboard the size of the arena. Sums typed on the number keys '
    + 'become pillars, a graph drawn across the floor is rewritten with calculus and set alight, and '
    + 'the ultimate makes the enemy sit an exam in the middle of the fight.',

  passives: [
    {
      emoji: '📈',
      name: 'The Graph',
      basics:
        'A graph is always drawn across the arena, centred on its middle. It starts as y = x and is '
        + 'harmless on its own: Integrate and Derivitize rewrite it, Rate of Pain and Derivitize make '
        + 'it dangerous. Each Math fighter has their own graph.',
      effects: [
        { tag: 'utility', label: 'The ladder', detail: 'y = 1 (flat) ⇄ x ⇄ x²/2 ⇄ x³/6 ⇄ x⁴/24. Integrate climbs a step, Derivitize drops one.' },
        { tag: 'area', label: 'The − C', detail: 'Every integration past y = x sinks the whole graph: x²/2 one notch below centre, x³/6 two, x⁴/24 three (a notch is 16% of the curve\'s reach). Derivitize lifts it back.' },
        { tag: 'area', label: 'Shape', detail: 'Odd powers run bottom-left to top-right; even powers are a bowl with its floor below the centre line. A rewrite takes 0.42s.' },
      ],
    },
  ],

  abilities: {
    'math-crunch': {
      basics:
        'A sum is always up on the slate over your head. Type the answer on the number keys and a '
        + 'pillar of math joins the ring circling your cursor. Click and every pillar stops where it '
        + 'is, then launches through the point you clicked.',
      cast: 'Number keys to answer (it submits itself the moment the answer is right); click to launch. 0.45s cooldown on the launch.',
      effects: [
        { tag: 'utility', label: 'Sums', detail: 'Single-digit +, − and ×, answers 0–36. A wrong answer wipes the slate — no penalty. Backspace deletes a digit.' },
        { tag: 'utility', label: 'Ring', detail: 'Up to 5 pillars, 46px from the cursor. At 5 the slate reads FULL until you click.' },
        { tag: 'damage', label: 'Pillar', detail: '16 damage each (80 for a full ring). Each flies 540px along its own line through the click point and hits everyone it crosses once.' },
        { tag: 'control', label: 'Knockback', detail: 'Heavy: thrown along the pillar\'s line for 0.24s.' },
      ],
      notes: [
        'The pillars start on a ring around the cursor and cross at its centre — click with the cursor on the enemy and all of them hit.',
        'While you are sitting an enemy\'s exam, the number keys answer the exam, not the slate.',
      ],
    },

    'math-integrate': {
      basics:
        'Rewrite your graph one step up the ladder: 1 → x → x²/2 → x³/6 → x⁴/24. Harmless by itself — '
        + 'it moves where Rate of Pain burns and where Derivitize\'s bombs will fall.',
      cast: 'E. 2.5s cooldown. Does nothing at x⁴/24.',
      effects: [
        { tag: 'utility', label: 'Rewrite', detail: 'One step up, and one notch lower: less ground under the graph, but Rate of Pain burns it hotter. Rate of Pain follows the curve as it moves.' },
      ],
    },

    'math-rate': {
      basics:
        'Everything between your graph and the bottom of the arena turns red for 3.5s and burns '
        + 'whoever stands in it.',
      cast: 'R. 10s cooldown.',
      effects: [
        { tag: 'damage', label: 'Burn', detail: 'Every 0.25s, by the graph it burns under: 3 on y = 1 and y = x (42 over the full 3.5s), 6 on x²/2 (84), 9 on x³/6 (126), 13 on x⁴/24 (182). Higher integrals sit lower, so they burn less of the arena. Rewriting the graph mid-burn changes the damage with it.' },
        { tag: 'area', label: 'Region', detail: 'Under the live curve. Integrate or Derivitize while it burns and the red moves with the graph.' },
      ],
      notes: ['An enemy who walks out above the line can be put back under it by rewriting the graph.'],
    },

    'math-derive': {
      basics:
        'Differentiate your graph one step down the ladder — and the old curve explodes along its '
        + 'whole length in a line of cluster bombs.',
      cast: 'F. 7s cooldown.',
      effects: [
        { tag: 'damage', label: 'Bombs', detail: '9 along the old curve, evenly spaced across the arena. 0.56s fuse, 87px blast, 24 damage each. Neighbouring blasts overlap.' },
        { tag: 'damage', label: 'Bomblets', detail: 'Every bomb throws 3 bomblets 93px out: 0.38s fuse, 54px blast, 10 damage each.' },
        { tag: 'utility', label: 'The flat line', detail: 'Differentiating y = 1 blows it up and resets the board to y = x.' },
      ],
    },

    'math-42': {
      basics:
        'Absorb every equation there is. The fight freezes for 2s; then the enemy must sit five '
        + 'problems while still fighting, climbing from easy sums to basically impossible calculus. '
        + 'Every problem answered wrong, or not answered in time, hurts — and each failure hurts more '
        + 'than the last.',
      cast: 'Q. Ultimate (charged by damage dealt and taken).',
      effects: [
        { tag: 'control', label: 'Cutscene', detail: '2s. Everyone is frozen and cannot be hurt.' },
        { tag: 'utility', label: 'The exam', detail: '5 problems, 7s each. Answers are whole numbers: type, then Enter. A wrong Enter fails the problem at once. The minus key flips the sign.' },
        { tag: 'damage', label: 'Failure', detail: '10 damage, +5 for each problem already failed: 10 / 15 / 20 / 25 / 30 (100 if all five are failed).' },
        { tag: 'utility', label: 'Bots', detail: 'Roll instead of typing: 90% / 62% / 34% / 12% / 0% to pass problems 1–5.' },
      ],
      notes: ['The problems run on their own once set — keep fighting while they sit them.'],
    },
  },
};

export default magic;
