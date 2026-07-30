import { Element } from './Element';
import { Ability, CastContext } from './Ability';

/**
 * Chalk — a test element, reachable only from a cheat-mode save for now.
 *
 * Every other element in the game aims something. Chalk *draws* — four of its five abilities
 * open a timed window during which your cursor lays a line of chalk behind it, and what that
 * line then does is the only difference between them. White detonates a moment later, red
 * waits and then runs the whole length like a fuse, blue stays on the floor until you replace
 * it, and the fourth kind rips itself off the ground and orbits you as a shield.
 *
 * The consequence is that Chalk's damage is entirely a function of where you moved the mouse,
 * not where you clicked. Nothing it does is aimed at the enemy — it is aimed at the floor the
 * enemy is going to be standing on.
 *
 * Every `cast` here is a one-line delegate; the whole simulation lives in ChalkKit.
 */

const ward: Ability = {
  id: 'chalk-ward',
  name: 'Chalk Ward',
  description: 'Your cursor lays white chalk for 1s. Every mark blows 0.5s after you draw it for 10 dmg.',
  displayKey: 'Click',
  cooldown: 2000,
  cast(ctx: CastContext) { ctx.chalkWard(); },
};

const explosive: Ability = {
  id: 'chalk-explosive',
  name: 'Explosive Chalk',
  description: 'Red chalk for 2s. One second later the whole line goes up end to end, 10 dmg a blast.',
  displayKey: 'E',
  cooldown: 9000,
  cast(ctx: CastContext) { ctx.chalkExplosive(); },
};

const perma: Ability = {
  id: 'chalk-perma',
  name: 'Perma-Chalk',
  description: 'Blue chalk for 0.5s that never wears off. Burns anything standing on it. Recast to redraw it somewhere else.',
  displayKey: 'R',
  cooldown: 6000,
  cast(ctx: CastContext) { ctx.chalkPerma(); },
};

const shield: Ability = {
  id: 'chalk-shield',
  name: 'Chalk Shield',
  description: 'White chalk for 1s, but only inside the ring around you. It peels off the floor and orbits you, stopping shots, hits and bodies until its 125 HP is gone.',
  displayKey: 'F',
  cooldown: 16000,
  cast(ctx: CastContext) { ctx.chalkShield(); },
};

const masterpiece: Ability = {
  id: 'chalk-masterpiece',
  name: 'Masterpiece',
  description: 'Invincible for 8s. Hold the mouse to draw; E/R/F swap chalk — green heals you, orange burns them, teal speeds you up. The work stays for 30s.',
  displayKey: 'Q',
  isUltimate: true,
  cooldown: 48000,
  cast(ctx: CastContext) { ctx.chalkMasterpiece(); },
};

export const chalkElement: Element = {
  id: 'chalk',
  name: 'Chalk',
  color: 0xf4f1e6,
  emoji: '🖍️',
  abilities: [ward, explosive, perma, shield, masterpiece],
};
