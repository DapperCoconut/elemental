import { Element } from './Element';
import { Ability, CastContext } from './Ability';

const stingerStrikes: Ability = {
  id: 'wax-stinger-strikes',
  name: 'Stinger Strikes',
  description: 'Thrust six times toward the cursor for 5 damage each. Landing all six on one enemy follows with a 10-damage stinger that knocks back and poisons for 8 seconds.',
  displayKey: 'Click',
  cooldown: 1100,
  cast(ctx: CastContext) { ctx.waxStingerStrikes(ctx.targetX, ctx.targetY); },
};

const swarm: Ability = {
  id: 'wax-swarm',
  name: 'Swarm',
  description: 'Launch 15 bees in a cone. Each bee latches on for 3 seconds, dealing 2 damage a second and adding 1% damage vulnerability while attached.',
  displayKey: 'E',
  cooldown: 8000,
  cast(ctx: CastContext) { ctx.waxSwarm(ctx.targetX, ctx.targetY); },
};

const candleMount: Ability = {
  id: 'wax-candle-mount',
  name: 'Candle Mount',
  description: 'Place a candle for 12 seconds. Its aura grants 15% damage resistance and adds 2 seconds to the lifetime of bees you summon. Overlapping candles stack.',
  displayKey: 'R',
  cooldown: 7000,
  cast(ctx: CastContext) { ctx.waxCandleMount(ctx.targetX, ctx.targetY); },
};

const hiveHearth: Ability = {
  id: 'wax-hive-hearth',
  name: 'Hive Hearth',
  description: 'Place a five-cell hive. Shoot bees into it to fill the cells, then press F nearby to redeem it for 5–25 orbiting bees and a retaliatory bee shield.',
  displayKey: 'F',
  cooldown: 10000,
  cast(ctx: CastContext) { ctx.waxHiveHearth(ctx.targetX, ctx.targetY); },
};

const stickyBombs: Ability = {
  id: 'wax-sticky-bombs',
  name: 'Sticky Bombs',
  description: 'Launch 10 sticky bombs in a cone. Bombed enemies take 10% more damage. Recast to detonate every attached bomb for 20 damage each, amplified by 15% per bomb on that enemy.',
  displayKey: 'Q',
  isUltimate: true,
  cooldown: 12000,
  cast(ctx: CastContext) { ctx.waxStickyBombs(ctx.targetX, ctx.targetY); },
};

export const waxElement: Element = {
  id: 'wax',
  name: 'Wax',
  color: 0xf2c85b,
  emoji: '🕯️',
  abilities: [stingerStrikes, swarm, candleMount, hiveHearth, stickyBombs],
};
