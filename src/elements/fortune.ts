import { Element } from './Element';
import { Ability, CastContext } from './Ability';

/**
 * Gold — a test element, reachable only from a cheat-mode save for now. The id is still
 * `fortune` (it replaced the old shopkeeper of that name), so saves and campaign data keep it.
 *
 * An alchemist who has stopped pretending the work is about anything but gold, and built a
 * factory to prove it: a tycoon runs along the top of the screen all match, droppers feeding a
 * conveyor feeding a refiner, paying into his purse. The purse buys more factory, or Advance —
 * three stat cards over his head, ten gold a pick — and a finished factory buys a Rebirth.
 *
 * Every `cast` below is a one-line delegate; the whole simulation lives in FortuneKit.
 */

const fray: Ability = {
  id: 'fortune-fray',
  name: 'Fray',
  description: 'Throw a clump of 7 grass blades forward; your other hand turns them to gold in the air. Then they fall toward the bottom of the screen as if the arena had gravity. 2 damage a blade — small alone, a lot when the whole clump lands. Hold to keep throwing.',
  displayKey: 'Click',
  cooldown: 520,
  cast(ctx: CastContext) { ctx.fortuneFray(ctx.targetX, ctx.targetY); },
};

const advance: Ability = {
  id: 'fortune-advance',
  name: 'Advance',
  description: 'Spend 10 gold: three upgrade cards appear over your head. Click one to keep it for the rest of the match — more damage, less damage taken, speed, shorter cooldowns, max HP, more gold, more blades or regeneration. Picks stack.',
  displayKey: 'E',
  cooldown: 1500,
  cast(ctx: CastContext) { ctx.fortuneAdvance(); },
};

const billiards: Ability = {
  id: 'fortune-billiards',
  name: 'Billiards',
  description: 'Throw a handful of 5 golden pool balls onto the floor ahead and pull out your cane as a cue. Aim with the mouse, hold to draw the cue back (the longer, the harder), release to strike: the first ball in line shoots off, knocks into the others and bounces off the walls. A ball hits for 5 to 22 depending on its speed. The cane itself pokes anyone in its line for 8 to 18.',
  displayKey: 'R',
  cooldown: 12000,
  cast(ctx: CastContext) { ctx.fortuneBilliards(ctx.targetX, ctx.targetY); },
};

const heart: Ability = {
  id: 'fortune-heart',
  name: 'Heart of Gold',
  description: 'Lunge forward and stab with your golden cane for 16. Anyone hit gets a golden heart for 6 seconds: every step they take stresses it, and if they move too much they have a heart attack — 28 damage and a 1.4 second stun. Every 20 damage a gold-hearted enemy takes gives you 1 gold.',
  displayKey: 'F',
  cooldown: 10000,
  cast(ctx: CastContext) { ctx.fortuneHeart(ctx.targetX, ctx.targetY); },
};

const rebirth: Ability = {
  id: 'fortune-rebirth',
  name: 'Rebirth',
  description: 'Only when your tycoon is complete — every pad bought. You flash white and come back a little more golden, and the tycoon is reset to its first dropper. Each rebirth: +25% gold earned, +15% damage, 15% less damage taken, and 150 gold health — spent before your own, and it pays you 1 gold for every 10 an enemy cuts away. Three rebirths at most.',
  displayKey: 'Q',
  isUltimate: true,
  // Gated by the tycoon, not by time: short enough that it is never a charged ultimate.
  cooldown: 1000,
  cast(ctx: CastContext) { ctx.fortuneRebirth(); },
};

export const fortuneElement: Element = {
  id: 'fortune',
  name: 'Gold',
  color: 0xd8a531,
  emoji: '🪙',
  abilities: [fray, advance, billiards, heart, rebirth],
};
