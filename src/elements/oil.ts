import { Element } from './Element';
import { Ability, CastContext } from './Ability';

const droneCommand: Ability = {
  id: 'drone-command',
  name: 'Drone Command',
  description: 'Hold to spawn drones (first at 0.5s, then 1/s, max 6). Tap to command all to fire lasers (3 dmg each). Click while a barrel is rolling → barrel explodes immediately + ignites puddles.',
  displayKey: 'Click',
  cooldown: 1500,
  cast(ctx: CastContext) {
    ctx.commandDrones(ctx.targetX, ctx.targetY);
  },
};

const barrelRoll: Ability = {
  id: 'barrel-roll',
  name: 'On a Roll',
  description: 'Launch a barrel that rolls and drops oily puddles every 80px — enemies standing in one are Oily (8s slow). Shoot a puddle with Drone Command to set it alight, or hit an Oily enemy with it to burn the oil off them (5s burn). Explodes on enemy contact, wall contact, or when shot by an enemy projectile (20 dmg, 2 extra puddles).',
  displayKey: 'E',
  cooldown: 3000,
  cast(ctx: CastContext) {
    ctx.spawnDrone();
  },
};

const droneDestroy: Ability = {
  id: 'drone-destroy',
  name: 'Drone Destroy',
  description: 'Launch a drone to cursor — explodes on arrival (20 dmg).',
  displayKey: 'R',
  cooldown: 3000,
  cast(ctx: CastContext) {
    ctx.launchDrone(ctx.targetX, ctx.targetY);
  },
};

const shieldGen: Ability = {
  id: 'shield-gen',
  name: 'Shield Generator',
  description: 'Place a hexagonal generator at cursor. While charged (5s): destroys nearby enemy projectiles with a laser (8 dmg AoE at impact). Recharge by commanding drones near it.',
  displayKey: 'F',
  cooldown: 15000,
  cast(ctx: CastContext) {
    ctx.placeFirewall(ctx.targetX, ctx.targetY);
  },
};

const trainMorph: Ability = {
  id: 'train-morph',
  name: 'Train Morph',
  description: 'Become a snake train (1.5s × drone count). WASD locks to 4 directions. Head: 8 dmg (0.5s cd). Every segment: 3 dmg (each with own 0.5s cd). Drops oil puddles every 2s. Collect coal for +5% speed and +dmg per piece. Cooldown begins when train ends.',
  displayKey: 'Q',
  isUltimate: true,
  cooldown: 30000,
  cast(ctx: CastContext) {
    ctx.startOverdrive(ctx.targetX, ctx.targetY);
  },
};

export const oilElement: Element = {
  id: 'oil',
  name: 'Oil',
  color: 0x664400,
  emoji: '🛢️',
  abilities: [droneCommand, barrelRoll, droneDestroy, shieldGen, trainMorph],
};
