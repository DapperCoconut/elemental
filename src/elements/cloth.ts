import { Element } from './Element';
import { Ability, CastContext } from './Ability';

/**
 * Cloth — a tailor who fights with pins and wears their health on their back.
 *
 * Two things make Cloth unlike anything else on the roster. The first is that it has no health
 * bar: it has a **scarf**, a long trail of wool dragging behind wherever the player has just
 * been, and that scarf is the hitbox. A shot that sails a clear foot wide of the body still
 * catches the tail and still hurts. The compensation is that the scarf *shrinks* as it is
 * chewed through, so a Cloth player on their last legs is a very small target indeed — the
 * element gets harder to kill precisely because it is nearly dead.
 *
 * The second is the **tapestry**. Q offers three artworks out of a deck of thirty-seven and the
 * player chooses one, then places it as a tetromino on a 5×5 loom. Space is finite, the pieces
 * are all different shapes, and a few of them hand over an entirely new button — a right-click
 * ability that the element does not otherwise have. No two Cloth runs are the same kit.
 *
 * Every `cast` below is a one-line delegate; the whole simulation lives in ClothKit.
 */

const pin: Ability = {
  id: 'cloth-pin',
  name: 'Pin',
  description: 'Jab a pin at whatever is in front of you. It reaches barely past your own arms and it deals almost nothing — but it fires about seven times a second, so it is the fastest attack in the game and it is always on. Every tenth pin that lands is the one that matters.',
  displayKey: 'Click',
  cooldown: 145,
  cast(ctx: CastContext) { ctx.clothPin(ctx.targetX, ctx.targetY); },
};

const longpin: Ability = {
  id: 'cloth-longpin',
  name: 'Longpin',
  description: 'Throw a pin the length of your arm. It buries itself in the first thing it touches for 15 — a body or a wall, either will hold it. Press E again and the thread pulls you to it: anybody you plough through on the way takes 10, and arriving on a pinned enemy is 10 more and throws them a long way.',
  displayKey: 'E',
  cooldown: 7000,
  cast(ctx: CastContext) { ctx.clothLongpin(ctx.targetX, ctx.targetY); },
};

const safetyLine: Ability = {
  id: 'cloth-safety-line',
  name: 'Safety Line',
  description: 'Drive an anchor into the floor where you stand. Press R again — or take 75 damage with it out — and the line snaps taut and hauls you back to it, out of whatever you had walked into. It is a bail-out you have to remember to set before you need it.',
  displayKey: 'R',
  cooldown: 9000,
  cast(ctx: CastContext) { ctx.clothSafetyLine(); },
};

const pinCushion: Ability = {
  id: 'cloth-pin-cushion',
  name: 'Pin Cushion',
  description: 'Stab yourself. 50 of your health becomes Pinned: it is spent before the rest of you, it takes 25% more from everything, and a quarter of everything it eats is thrown straight back at whoever landed the hit. The cooldown is almost nothing, so the only question is how much of yourself you want made of pins.',
  displayKey: 'F',
  cooldown: 3200,
  cast(ctx: CastContext) { ctx.clothPinCushion(); },
};

const tapestry: Ability = {
  id: 'cloth-tapestry',
  name: 'Tapestry',
  description: 'Three artworks are offered. Take one and sew it into your loom — a 5×5 grid that each artwork occupies as a differently-shaped tetromino, so what you can still fit later depends on what you have already sewn. Most are flat power. A few hand you a right-click ability you did not have, and you may only ever carry one of those.',
  displayKey: 'Q',
  isUltimate: true,
  cooldown: 21000,
  cast(ctx: CastContext) { ctx.clothTapestry(); },
};

export const clothElement: Element = {
  id: 'cloth',
  name: 'Cloth',
  color: 0xd1435c,
  emoji: '🧣',
  abilities: [pin, longpin, safetyLine, pinCushion, tapestry],
};
