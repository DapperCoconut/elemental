import { Element } from './Element';
import { Ability, CastContext } from './Ability';

const sandFlintlockAbility: Ability = {
  id: 'sand-flintlock',
  name: 'Flintlock',
  description: 'Hitscan shot (12 dmg, 2s reload). Fire early for +20 heat.',
  displayKey: 'Click',
  cooldown: 2000,
  cast(ctx: CastContext) { ctx.sandFlintlock(ctx.targetX, ctx.targetY); },
};

const sandBlindingSand: Ability = {
  id: 'sand-blinding',
  name: 'Blinding Sand',
  description: '3 large balls at shotgun range — blind target (50% less attacks, 5s)',
  displayKey: 'E',
  cooldown: 3000,
  cast(ctx: CastContext) { ctx.sandBlindingSand(ctx.targetX, ctx.targetY); },
};

const sandTornado: Ability = {
  id: 'sand-tornado',
  name: 'Tornado Force',
  description: 'Toggle: +50% speed, 50% evasion, +10 heat/s',
  displayKey: 'R',
  cooldown: 0,
  cast(ctx: CastContext) { ctx.sandToggleTornado(); },
};

const sandMirage: Ability = {
  id: 'sand-mirage',
  name: 'Mirage',
  description: 'Leave a 75 HP decoy (AI attacks it), then dash toward cursor',
  displayKey: 'F',
  cooldown: 8000,
  cast(ctx: CastContext) { ctx.sandMirage(ctx.targetX, ctx.targetY); },
};

const sandGlass: Ability = {
  id: 'sand-glass',
  name: 'Glass Meld',
  description: 'Requires 90 heat. Hold Click: rapid glass shards. Drains 5 heat/s, cancels at 30 heat.',
  displayKey: 'Q',
  cooldown: 0,
  cast(ctx: CastContext) { ctx.sandActivateGlass(); },
};

export const sandElement: Element = {
  id: 'sand',
  name: 'Sand',
  color: 0xddbb77,
  emoji: '⏳',
  abilities: [sandFlintlockAbility, sandBlindingSand, sandTornado, sandMirage, sandGlass],
};
