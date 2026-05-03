import { Element } from './Element';
import { Ability, CastContext } from './Ability';

const daggerSpray: Ability = {
  id: 'dagger-spray',
  name: 'Dagger Spray',
  description: 'Click: launch a dagger at cursor. Hold to summon up to 4 more parallel daggers; release to fire all. Daggers pierce past cursor. 0.5s CD.',
  displayKey: 'Click',
  cooldown: 500,
  cast(ctx: CastContext) {
    // NPC path: fire 3 daggers in a spread
    ctx.creationDaggerSpray(ctx.targetX, ctx.targetY, 3);
  },
};

const chargedBolt: Ability = {
  id: 'charged-bolt',
  name: 'Charged Bolt',
  description: 'Tap E: copper bolt (5 dmg). Hold 0.5s: silver bolt (10 dmg). Hold 1s: gold bolt (15 dmg). Bolts hitting the Crucible load it; 3 bolts triggers crafting. 2s CD.',
  displayKey: 'E',
  cooldown: 2000,
  cast(ctx: CastContext) {
    // NPC path: weighted random tier
    const roll = Math.random();
    const tier = roll < 0.6 ? 'copper' : roll < 0.9 ? 'silver' : 'gold';
    ctx.creationBolt(ctx.targetX, ctx.targetY, tier);
  },
};

const scytheOfDoom: Ability = {
  id: 'scythe-of-doom',
  name: 'Scythe of Doom',
  description: 'Launch a homing scythe that tracks the enemy. 75 HP — destroyable by enemy projectiles. Deals 32 damage on contact. 8s CD.',
  displayKey: 'R',
  cooldown: 8000,
  cast(ctx: CastContext) {
    ctx.creationScytheLaunch(ctx.targetX, ctx.targetY);
  },
};

const createBlock: Ability = {
  id: 'creation-block',
  name: 'Create',
  description: 'Drag to create a square barrier (max 200×200, 25 HP). Blocks all movement. Blocks enemy projectiles — yours pass through. 3s CD.',
  displayKey: 'F',
  cooldown: 3000,
  cast(ctx: CastContext) {
    // NPC path: place a small block between self and enemy
    ctx.creationBlock(ctx.casterX + (ctx.targetX - ctx.casterX) * 0.4, ctx.casterY + (ctx.targetY - ctx.casterY) * 0.4, 80, 80);
  },
};

const mazeOfDoom: Ability = {
  id: 'maze-of-doom',
  name: 'Maze of Doom',
  description: 'Fill the arena with randomized walls for 10s. Walls block enemy movement and projectiles — your movement and projectiles pass through freely. 45s CD.',
  displayKey: 'Q',
  isUltimate: true,
  cooldown: 45000,
  cast(ctx: CastContext) {
    ctx.creationMaze();
  },
};

export const creationElement: Element = {
  id: 'creation',
  name: 'Creation',
  color: 0xcc6622,
  emoji: '⚒️',
  abilities: [daggerSpray, chargedBolt, scytheOfDoom, createBlock, mazeOfDoom],
};
