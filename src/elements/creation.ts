import { Element } from './Element';
import { Ability, CastContext } from './Ability';

const daggerSpray: Ability = {
  id: 'dagger-spray',
  name: 'Dagger Spray',
  description: 'Click & hold to fan up to 5 daggers 30° apart; release and they converge on the cursor, then fly past. Daggers pierce. 0.5s CD.',
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
  description: 'Tap E: copper bolt (5). Hold 0.5s: silver (10). Hold 1s: gold (15). Load 3 bolts into the Crucible to craft — CCC bolt spray · CCS scythe · CSS medkit · SSS heal pulses · CCG ghoul · CGG damage pulses · GSS fire pools · GGS +30% speed · GGG cross-beam + armor. 2s CD.',
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
  // id kept as 'maze-of-doom' for cooldown/color/AI wiring; this is now the Workshop.
  id: 'maze-of-doom',
  name: 'Workshop',
  description: 'Convert the arena into a wooden workshop for 30s: walk on top of your own barriers, gain +25% speed, and leave an afterimage trail. 45s CD.',
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
