import { Element } from './Element';
import { Ability, CastContext } from './Ability';

const crystalLaser: Ability = {
  id: 'crystal-laser',
  name: 'Laser Beam',
  description: 'Hitscan laser. Reflects off placed crystals, doubling damage per bounce.',
  displayKey: 'Click',
  cooldown: 500,
  cast(ctx: CastContext) { ctx.fireCrystalLaser(ctx.targetX, ctx.targetY); },
};

const placeCrystal: Ability = {
  id: 'crystal-place',
  name: 'Place Crystal',
  description: 'Place a crystal at cursor (max 3). Reflects your laser beam.',
  displayKey: 'E',
  cooldown: 5000,
  cast(ctx: CastContext) { ctx.placeCrystalNode(ctx.targetX, ctx.targetY); },
};

const crystalBarrage: Ability = {
  id: 'crystal-barrage',
  name: 'Barrage',
  description: 'Launch 30 crystal shards at cursor over 3s (4 dmg each, inaccurate). Shards hitting a crystal cause a 10 dmg AOE explosion.',
  displayKey: 'R',
  cooldown: 8000,
  cast(ctx: CastContext) { ctx.startCrystalBarrage(ctx.targetX, ctx.targetY); },
};

const crystalPortal: Ability = {
  id: 'crystal-portal',
  name: 'Crystal Portal',
  description: 'Place a portal gate (max 2). Touch either to teleport to the other. Laser through a portal auto-targets the enemy.',
  displayKey: 'F',
  cooldown: 5000,
  cast(ctx: CastContext) { ctx.placeCrystalPortal(ctx.targetX, ctx.targetY); },
};

const crystalTrick: Ability = {
  id: 'crystal-trick',
  name: 'Trick of the Light',
  description: 'Summon 2 clones (50 HP, 12s) that duplicate your Laser and Barrage attacks.',
  displayKey: 'Q',
  isUltimate: true,
  cooldown: 50000,
  cast(ctx: CastContext) { ctx.activateCrystalTrick(); },
};

export const crystalElement: Element = {
  id: 'crystal',
  name: 'Crystal',
  color: 0x88ccff,
  emoji: '💎',
  abilities: [crystalLaser, placeCrystal, crystalBarrage, crystalPortal, crystalTrick],
};
