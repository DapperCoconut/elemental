import { Element } from './Element';
import { Ability, CastContext } from './Ability';

const crystalLaser: Ability = {
  id: 'crystal-laser',
  name: 'Diamond Shard',
  description: 'Launch a kite-shaped shard (15 dmg) that flies until it hits something. Bounces off placed crystals with a 30° auto-aim snap, ×1.5 damage per bounce (no limit). Passes through portals with auto-aim. Bouncing off a moving crystal sets off large AOE blasts along its flight path.',
  displayKey: 'Click',
  cooldown: 500,
  cast(ctx: CastContext) { ctx.fireCrystalLaser(ctx.targetX, ctx.targetY); },
};

const placeCrystal: Ability = {
  id: 'crystal-place',
  name: 'Place Crystal',
  description: 'Place a crystal at cursor (max 6). Reflects your laser beam and deflects enemy projectiles.',
  displayKey: 'E',
  cooldown: 2500,
  cast(ctx: CastContext) { ctx.placeCrystalNode(ctx.targetX, ctx.targetY); },
};

const crystalAtune: Ability = {
  id: 'crystal-atune',
  name: 'Atune',
  description: 'Stop every Diamond Shard on screen — while stopped they point toward your cursor, showing where they\'ll fly. After 2s they launch at your cursor. Also refreshes each shard\'s spent wall bounce (does not stack).',
  displayKey: 'R',
  cooldown: 7000,
  cast(ctx: CastContext) { ctx.activateCrystalAtune(); },
};

const crystalPortal: Ability = {
  id: 'crystal-portal',
  name: 'Crystal Portal',
  description: 'Place a portal gate (max 2). Touch either to teleport. Enemy entering a portal collapses it and is stunned 2s. Enemy projectiles redirect through portals back at them (+50% dmg).',
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
  abilities: [crystalLaser, placeCrystal, crystalAtune, crystalPortal, crystalTrick],
};
