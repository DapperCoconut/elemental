import { Element } from './Element';
import { Ability, CastContext } from './Ability';

const timeBarrage: Ability = {
  id: 'time-barrage',
  name: 'Barrage',
  description: 'Hold click: fire accelerating projectiles that ramp up in speed over 3s.',
  displayKey: 'Click',
  cooldown: 0,
  cast(ctx: CastContext) { ctx.timeBarrage(ctx.targetX, ctx.targetY); },
};

const timeWarp: Ability = {
  id: 'time-warp',
  name: 'Time Warp',
  description: 'Fire a fast large orb. Hits teleport the enemy back 3s, leaving puddles that slow by 25% and charge Q. 3s CD.',
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
  name: 'Halt',
  description: '6s: area slows projectiles & enemy 50%. Click/E projectiles move at 2x speed while active. 12s CD.',
  displayKey: 'F',
  cooldown: 12000,
  cast(ctx: CastContext) { ctx.timeHalt(); },
};

const timeTimeless: Ability = {
  id: 'time-timeless',
  name: 'Timeless',
  description: '3s with 0 cooldowns. Charges by standing in time puddles (10s total). Cannot use while active.',
  displayKey: 'Q',
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
