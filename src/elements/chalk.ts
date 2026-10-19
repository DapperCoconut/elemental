import { Element } from './Element';
import { Ability, CastContext } from './Ability';

/**
 * Paint — a messy painter with a very large brush. (The id is still `chalk`: Paint replaced the
 * Chalk element and kept its id, so saves, unlocks and its campaign world carry straight over.)
 *
 * Two of its abilities hand you a canvas. Whatever you paint on the Splotch canvas (right-click)
 * is what every Splotch you throw from then on *is* — a long line sweeps a wide lane for little
 * damage, a tight blob hits hard and narrow. Whatever you paint for Still Life is what the enemy
 * turns into, hitbox and all. The other three paint the floor under the cursor for a few
 * seconds: orange that goes off end to end, congealed paint that sets into a wall, and the
 * Masterpiece's huge brush.
 *
 * Every `cast` here is a one-line delegate; the whole simulation lives in PaintKit.
 */

const splotch: Ability = {
  id: 'paint-splotch',
  name: 'Splotch',
  description: 'Throw a splotch of paint that pierces and deals rapid contact damage. Right-click to paint a new one on a blank canvas — every splotch becomes what you drew. Bigger drawings cover more, but hit softer.',
  displayKey: 'Click',
  cooldown: 500,
  cast(ctx: CastContext) { ctx.paintSplotch(ctx.targetX, ctx.targetY); },
};

const orange: Ability = {
  id: 'paint-orange',
  name: 'Volatile Orange',
  description: 'Paint orange under your cursor for 2s. A moment later the line explodes from where you started to where you finished — 10 dmg a blast.',
  displayKey: 'E',
  cooldown: 9000,
  cast(ctx: CastContext) { ctx.paintOrange(); },
};

const congeal: Ability = {
  id: 'paint-congeal',
  name: 'Congealed Paint',
  description: 'A fine brush for 1.5s. The line sets into a wall that blocks projectiles and enemies for 6s.',
  displayKey: 'R',
  cooldown: 8000,
  cast(ctx: CastContext) { ctx.paintCongeal(); },
};

const stillLife: Ability = {
  id: 'paint-still-life',
  name: 'Still Life',
  description: 'Paint a picture on your canvas (5s). When you finish, the nearest enemy to your cursor becomes it for 7s — its hitbox is whatever you drew.',
  displayKey: 'F',
  cooldown: 16000,
  cast(ctx: CastContext) { ctx.paintStillLife(); },
};

const masterpiece: Ability = {
  id: 'paint-masterpiece',
  name: 'Masterpiece',
  description: 'Invincible for 8s while you paint on a canvas (E/R/F: red, blue, green). When you finish, it is projected onto the arena — the canvas is a map of the whole floor — red burns foes, blue speeds up you and your cooldowns, green heals you and cuts damage taken. Lasts 30s.',
  displayKey: 'Q',
  isUltimate: true,
  cooldown: 48000,
  cast(ctx: CastContext) { ctx.paintMasterpiece(); },
};

export const chalkElement: Element = {
  id: 'chalk',
  name: 'Paint',
  color: 0xe0457b,
  emoji: '🖌️',
  abilities: [splotch, orange, congeal, stillLife, masterpiece],
};
