import { Element } from './Element';
import { Ability, CastContext } from './Ability';

const iceSpike: Ability = {
  id: 'ice-spike',
  name: 'Ice Spike',
  description: 'Fire a piercing ice projectile toward cursor. Applies 1 frost stack on hit.',
  displayKey: 'Click',
  cooldown: 600,
  cast(ctx: CastContext) {
    ctx.fireIceSpike(ctx.targetX, ctx.targetY);
  },
};

const frostBlast: Ability = {
  id: 'frost-blast',
  name: 'Frost Blast',
  description: 'Hitscan ice beam. Only damages if enemy has frost stacks: 7.5 dmg per stack, removes all. Against void frost, instantly detonates all remaining DOT damage instead.',
  displayKey: 'E',
  cooldown: 8000,
  cast(ctx: CastContext) {
    ctx.fireFrostBlast(ctx.targetX, ctx.targetY);
  },
};

const blockUp: Ability = {
  id: 'block-up',
  name: 'Block Up',
  description: 'Toggle: -50% move speed, -25% damage taken.',
  displayKey: 'R',
  cooldown: 200,
  cast(ctx: CastContext) {
    ctx.toggleBlockUp();
  },
};

const skate: Ability = {
  id: 'skate',
  name: 'Skate',
  description: 'Dash in movement direction, leaving an icy trail that slows enemies and inflicts frost stacks.',
  displayKey: 'F',
  cooldown: 3000,
  cast(ctx: CastContext) {
    ctx.startSkate();
  },
};

const frozenSolid: Ability = {
  id: 'frozen-solid',
  name: 'Frozen Solid',
  description: '45° cone to borders. Enemy caught is frozen 3s. Hitting a frozen enemy: unfreeze + 3 frost stacks.',
  displayKey: 'Q',
  isUltimate: true,
  cooldown: 12000,
  cast(ctx: CastContext) {
    ctx.fireFrozenSolid(ctx.targetX, ctx.targetY);
  },
};

export const iceElement: Element = {
  id: 'ice',
  name: 'Ice',
  color: 0x88ccff,
  emoji: '❄️',
  abilities: [iceSpike, frostBlast, blockUp, skate, frozenSolid],
};
