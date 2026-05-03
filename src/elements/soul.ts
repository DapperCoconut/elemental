import { Element } from './Element';
import { Ability, CastContext } from './Ability';

const soulOrb: Ability = {
  id: 'soul-orb',
  name: 'Spirit Propel',
  description: 'Fire a ghostly orb (3s, 10 dmg/touch, +1 👻 per hit). Hold Click for Haunt mode (upgrade).',
  displayKey: 'Click',
  cooldown: 800,
  cast(ctx: CastContext) { ctx.fireSoulOrb(ctx.targetX, ctx.targetY); },
};

const soulSummon: Ability = {
  id: 'soul-summon',
  name: 'Summon',
  description: 'Hold E: basic (1👻), ghoul (2👻 1s), banshee (3👻 2s). E+: corpse (4👻 4s), necromancer (5👻 5s). 2s CD.',
  displayKey: 'E',
  cooldown: 2000,
  cast(ctx: CastContext) { ctx.summonGhost('basic'); },
};

const soulSacrifice: Ability = {
  id: 'soul-sacrifice',
  name: 'Sacrifice',
  description: '-10 HP self, +1 👻. 3s CD. R+: Hold to drain life for ghosts + soul explosion.',
  displayKey: 'R',
  cooldown: 3000,
  cast(ctx: CastContext) { ctx.soulSacrifice(); },
};

const soulConsume: Ability = {
  id: 'soul-consume',
  name: 'Consume',
  description: 'Kill own ghosts nearby, heal 1/2 their HP. F+: type-specific buffs on consume. 3s CD.',
  displayKey: 'F',
  cooldown: 3000,
  cast(ctx: CastContext) { ctx.soulConsume(); },
};

const undeadCharge: Ability = {
  id: 'undead-charge',
  name: 'Undead Charge',
  description: 'Spend 5 👻: summon a bouncing knight (15 dmg). Q+: summon 2 knights; collisions = AOE + speed boost.',
  displayKey: 'Q',
  isUltimate: true,
  cooldown: 500,
  cast(ctx: CastContext) { ctx.summonGhost('knight'); },
};

export const soulElement: Element = {
  id: 'soul',
  name: 'Soul',
  color: 0xccaaff,
  emoji: '👻',
  abilities: [soulOrb, soulSummon, soulSacrifice, soulConsume, undeadCharge],
};
