import { Element } from './Element';
import { Ability, CastContext } from './Ability';

/**
 * Wax — the apiarist. A fencer with a wax foil in one hand and a hive's worth of bees in the
 * other. Everything it places on the floor (candles, hives, sticky bombs) is wax, and wax is
 * what every other piece of the kit feeds on: bees live longer under a candle, a hive turns bees
 * into more bees, and a bomb thrown at either of them cashes it in early.
 *
 * All five casts are handled in `kits/WaxKit.ts`; the `cast` here only routes.
 */

const stingerStrikes: Ability = {
  id: 'wax-stinger-strikes',
  name: 'Stinger Strikes',
  description: 'Six foil thrusts toward the cursor, 4 each. Land all six and a 12-damage stinger follows: knockback and 8s of poison',
  displayKey: 'Click',
  cooldown: 1200,
  cast(ctx: CastContext) { ctx.waxStingerStrikes(ctx.targetX, ctx.targetY); },
};

const swarm: Ability = {
  id: 'wax-swarm',
  name: 'Swarm',
  description: 'Loose 15 bees in a cone. Each latches on for 3s, biting 2 a second, and every bee attached is +1% damage taken',
  displayKey: 'E',
  cooldown: 8000,
  cast(ctx: CastContext) { ctx.waxSwarm(ctx.targetX, ctx.targetY); },
};

const candleMount: Ability = {
  id: 'wax-candle-mount',
  name: 'Candle Mount',
  description: 'Plant a candle for 12s. Inside its light you take 15% less damage and bees you loose latch 2s longer. Candles stack',
  displayKey: 'R',
  cooldown: 7000,
  cast(ctx: CastContext) { ctx.waxCandleMount(ctx.targetX, ctx.targetY); },
};

const hiveHearth: Ability = {
  id: 'wax-hive-hearth',
  name: 'Hive Hearth',
  description: 'Build a five-cell hive. Bees that fly into it are stored; press F beside it to release 5 per cell as an orbiting guard and a bee shield',
  displayKey: 'F',
  cooldown: 10000,
  cast(ctx: CastContext) { ctx.waxHiveHearth(ctx.targetX, ctx.targetY); },
};

const stickyBombs: Ability = {
  id: 'wax-sticky-bombs',
  name: 'Sticky Bombs',
  description: 'Lob 8 wax bombs in a cone that stick for 20s (+10% damage taken). Press Q again to detonate: 10 each, +10% per bomb on that enemy',
  displayKey: 'Q',
  isUltimate: true,
  cooldown: 16000,
  cast(ctx: CastContext) { ctx.waxStickyBombs(ctx.targetX, ctx.targetY); },
};

export const waxElement: Element = {
  id: 'wax',
  name: 'Wax',
  color: 0xf2c85b,
  emoji: '🕯️',
  abilities: [stingerStrikes, swarm, candleMount, hiveHearth, stickyBombs],
};
