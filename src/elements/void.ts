import { Element } from './Element';
import { Ability } from './Ability';

const voidFloater: Ability = {
  id: 'void-floater',
  name: 'Void Floater',
  description: 'Summon a small void ball that follows cursor. Up to 3 at once. Deals 12 dmg on contact. Q enhances floaters (25 dmg, bright purple).',
  displayKey: 'Click',
  cooldown: 800,
  cast(ctx) { ctx.voidFloater(ctx.targetX, ctx.targetY); },
};

const returnToVoid: Ability = {
  id: 'void-return',
  name: 'Return to Void',
  description: '2s cone telegraph toward cursor (40°, ~200px range). Fires: 15 dmg. Consumes enemy buffs — each buff consumed applies 5s Nothing (blocks new buffs).',
  displayKey: 'E',
  cooldown: 10000,
  cast(ctx) { ctx.voidReturnToVoid(ctx.targetX, ctx.targetY); },
};

const reLapse: Ability = {
  id: 'void-relapse',
  name: 'Re-Lapse',
  description: 'Launch a dark pulse. On hit, doubles remaining duration of all active negative effects on the enemy.',
  displayKey: 'R',
  cooldown: 8000,
  cast(ctx) { ctx.voidReLapse(ctx.targetX, ctx.targetY); },
};

const voidAsh: Ability = {
  id: 'void-ash',
  name: 'Void Ash',
  description: 'Create a black AoE at cursor that follows cursor. Lasts 2s + 2s per floater consumed. Deals 10 dmg/2s + applies Decay (3 dmg/s, +5% dmg-taken per tick).',
  displayKey: 'F',
  cooldown: 12000,
  cast(ctx) { ctx.voidAsh(ctx.targetX, ctx.targetY); },
};

const voidOfHell: Ability = {
  id: 'void-of-hell',
  name: 'Void of Hell',
  description: 'Summon 12 purple flame pillars around arena edges for 15s. Each deals 8 dmg/s and applies Decay. While enemy is inside a flame, all negative effect timers are frozen. Enhances all Void Floaters.',
  displayKey: 'Q',
  cooldown: 25000,
  cast(ctx) { ctx.voidOfHell(); },
};

export const voidElement: Element = {
  id: 'void',
  name: 'Void',
  color: 0x220033,
  emoji: '🌑',
  abilities: [voidFloater, returnToVoid, reLapse, voidAsh, voidOfHell],
};
