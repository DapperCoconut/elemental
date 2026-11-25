import { Element } from './Element';
import { Ability } from './Ability';

// Math. The element keeps the id `magic` — it took Magic's place, and saves, recipes, courts and
// campaign tables all know the slot by that name. Everything a player sees says Math.

const crunch: Ability = {
  id: 'math-crunch',
  name: 'Crunch the Numbers',
  description: 'A sum is always up on the slate over your head. Type the answer on the number keys and a pillar of math joins the ring circling your cursor (up to 5) — a wrong answer just wipes the slate. Click and every pillar stops where it is and launches through the point you clicked: 16 dmg each, heavy knockback.',
  displayKey: 'Click',
  cooldown: 450,
  cast(ctx) { ctx.mathCrunch(ctx.targetX, ctx.targetY); },
};

const integrate: Ability = {
  id: 'math-integrate',
  name: 'Integrate',
  description: 'The graph y = x is always drawn across the arena, centred, and harmless on its own. Integrate rewrites it one step up: 1 → x → x²/2 → x³/6 → x⁴/24 — and every integration past y = x sinks the whole graph lower. (That\'s the + C.)',
  displayKey: 'E',
  cooldown: 2500,
  cast(ctx) { ctx.mathIntegrate(); },
};

const rateOfPain: Ability = {
  id: 'math-rate',
  name: 'Rate of Pain',
  description: 'The area between your graph and the bottom of the arena turns red for 3.5s and burns everyone in it every quarter second — 3 dmg on y = x, then 6, 9 and 13 as you integrate up to x⁴/24: each integral sits lower, so less ground burns, but much hotter. It follows the graph — integrate or differentiate while it burns and the red moves with the curve.',
  displayKey: 'R',
  cooldown: 10000,
  cast(ctx) { ctx.mathRate(); },
};

const derivitize: Ability = {
  id: 'math-derive',
  name: 'Derivitize',
  description: 'Differentiate the graph one step down — and the old curve explodes along its whole length in nine big cluster bombs (24 dmg each), every one throwing three bomblets (10 dmg). Differentiating the flat line y = 1 blows it up and resets the board to y = x.',
  displayKey: 'F',
  cooldown: 7000,
  cast(ctx) { ctx.mathDerive(); },
};

const fortyTwo: Ability = {
  id: 'math-42',
  name: '42',
  description: 'Absorb every equation there is: the fight freezes for 2s. Then the enemy must sit five problems while still fighting — typed answers, Enter to submit, 7s each — climbing from easy sums to basically impossible calculus. Each one answered wrong or not at all hits them for 10 dmg, +5 more for every problem already failed.',
  displayKey: 'Q',
  isUltimate: true,
  cooldown: 30000,
  cast(ctx) { ctx.mathFortyTwo(); },
};

export const magicElement: Element = {
  id: 'magic',
  name: 'Math',
  color: 0x3fd0ae,
  emoji: '🧮',
  abilities: [crunch, integrate, rateOfPain, derivitize, fortyTwo],
};
