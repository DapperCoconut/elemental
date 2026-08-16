import { Element } from './Element';
import { Ability, CastContext } from './Ability';

const timeBarrage: Ability = {
  id: 'time-barrage',
  name: 'Quick Shot',
  description: 'Fire a revolver-style shot at the cursor (250ms cadence). 6-bullet magazine; auto-reloads in 3s. Bullets shift yellow→red as they age, dealing 12→15 damage over 2s. A fully aged round homes in on the enemy and coughs out a burst of low-damage shrapnel once a second.',
  displayKey: 'Click',
  cooldown: 0,
  cast(ctx: CastContext) { ctx.timeBarrage(ctx.targetX, ctx.targetY); },
};

const timeWarp: Ability = {
  id: 'time-warp',
  name: 'Lasso',
  description: 'Throw a lasso. On hit, yank the enemy back to where they were 3s ago, dropping puddles along the rope. Puddles slow 25% and charge Q. 3s CD.',
  displayKey: 'E',
  cooldown: 3000,
  cast(ctx: CastContext) { ctx.timeWarp(ctx.targetX, ctx.targetY); },
};

const timeRemain: Ability = {
  id: 'time-remain',
  name: 'Remain',
  description: '3s yellow aura: absorb all damage. Afterwards take 80%. Every 10 absorbed damage spawns a puddle. 12s CD.',
  displayKey: 'R',
  cooldown: 12000,
  cast(ctx: CastContext) { ctx.timeRemain(); },
};

const timeHalt: Ability = {
  id: 'time-halt',
  name: 'Bounty',
  description: 'Spend accumulated bounty (+1 per 5 dmg taken): drop a slowing aura on the enemy lasting (bounty) seconds. Slows 50%, doubles cooldowns, slows projectiles 15%. 10s CD.',
  displayKey: 'F',
  cooldown: 10000,
  cast(ctx: CastContext) { ctx.timeHalt(); },
};

const timeTimeless: Ability = {
  id: 'time-timeless',
  name: 'Always Noon',
  description: 'Convert bounty to Time Energy (1 bounty = 1000ms toward 10s). If energy was already full before pressing, freeze the world for 5s; revolver becomes a 3-shot 25-dmg rifle whose beams resolve when time resumes.',
  displayKey: 'Q',
  isUltimate: true,
  cooldown: 0,
  cast(ctx: CastContext) { ctx.timeTimeless(); },
};

export const sandElement: Element = {
  id: 'sand',
  name: 'Time',
  color: 0xffdd44,
  emoji: '⏳',
  abilities: [timeBarrage, timeWarp, timeRemain, timeHalt, timeTimeless],
};
