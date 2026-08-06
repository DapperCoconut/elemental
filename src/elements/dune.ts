import { Element } from './Element';
import { Ability, CastContext } from './Ability';

/**
 * Sand — a test element, reachable only from a cheat-mode save for now.
 *
 * The only kit in the game whose damage lives in its *feet*. Sand replaces the Space dodge
 * with a real vertical jump, then spends the rest of its buttons on height: a short obstacle
 * course for a buff, a long one for a turret, a moving bridge between the things it has built,
 * and a race up a pyramid with lava underneath it.
 *
 * The arena is top-down, so height is drawn the only honest way a top-down game can draw it —
 * a shadow that slides *away* from you as you rise. A pillar's shadow is how tall it is; your
 * shadow is how high you are. Everything else (the rim light on a platform you are standing on,
 * the dust ring when you land) is there to make that one rule readable at a glance.
 *
 * The flintlock is the payoff. It is a slow, deliberate, reloading hitscan whose bonuses *add*:
 * 30 flat-footed, +10 for being on something you built, +5 for being in the air, so a shot
 * fired mid-jump off your own pillar is 45. A Sand player who never leaves the floor is playing
 * a worse element on purpose.
 *
 * Every `cast` below is a one-line delegate; the whole simulation lives in SandKit.
 */

const sandStriker: Ability = {
  id: 'dune-striker',
  name: 'Sand Striker',
  description: 'Fire a hitscan lance of packed sand from your flintlock for 30. Standing on a platform adds 10, and being in the air adds 5 — so a shot fired mid-jump off your own platform hits for 45. Two seconds to reload, one while the golden sand is on the barrel.',
  displayKey: 'Click',
  // Floor rather than the real reload: the kit owns the two-second (or one-second) gate itself,
  // because the golden orb has to be able to halve it without touching `cooldownMult`.
  cooldown: 900,
  cast(ctx: CastContext) { ctx.duneStriker(ctx.targetX, ctx.targetY); },
};

const sandstoneRuins: Ability = {
  id: 'dune-ruins',
  name: 'Sandstone Ruins',
  description: 'Raise a short course out of the floor: one low grey block you can reach from the ground, three or four tall sandstone pillars you can only reach from each other, and a platform with a golden orb on it. Fall off and it costs you 20. Take the orb and your flintlock reloads twice as fast for 8 seconds.',
  displayKey: 'E',
  cooldown: 15000,
  cast(ctx: CastContext) { ctx.duneRuins(); },
};

const cursedPyramid: Ability = {
  id: 'dune-pyramid',
  name: 'Cursed Pyramid',
  description: 'Raise a long, cruel course — more pillars, platforms that slide, and poison sunk into the floor across every gap between them. Step in one and it bites for 12 at once, then 9 a tick; jumping it is the only free way past. At the end sits a golden pyramid. Reach it and it wakes up: 15 seconds of lasers picking your enemies apart for 16 a shot.',
  displayKey: 'R',
  cooldown: 28000,
  cast(ctx: CastContext) { ctx.dunePyramid(); },
};

const sandwalk: Ability = {
  id: 'dune-sandwalk',
  name: 'Sandwalk',
  description: 'Lay a bridge of running sand from where you stand to the neighbouring platform nearest the cursor — neighbours only, never a shortcut across the arena. The deck carries you toward the far end, everything you do on it is 25% faster, and you cannot fall off its sides. Cast it on the floor with nothing in reach and you get the conveyor without the climb. Lasts 6 seconds.',
  displayKey: 'F',
  cooldown: 10000,
  cast(ctx: CastContext) { ctx.duneSandwalk(ctx.targetX, ctx.targetY); },
};

const finalTrail: Ability = {
  id: 'dune-final-trail',
  name: 'Final Trail',
  description: 'You and the nearest enemy are thrown onto two different parkour courses up a pyramid with lava rising underneath. A golden crown sits at the top of each. First to their crown walks away clean; the other one takes 70 — and so does anyone who falls off their course or lets the lava reach them. Only the jump and Sandwalk work up there, for either of you. You can lose this.',
  displayKey: 'Q',
  isUltimate: true,
  cooldown: 42000,
  cast(ctx: CastContext) { ctx.duneFinalTrail(); },
};

export const duneElement: Element = {
  // `sand` is already spoken for — it is Time's element id — so the desert answers to `dune`
  // in code and to "Sand" everywhere a player can read it.
  id: 'dune',
  name: 'Sand',
  color: 0xe8c87a,
  emoji: '🏜️',
  abilities: [sandStriker, sandstoneRuins, cursedPyramid, sandwalk, finalTrail],
};
