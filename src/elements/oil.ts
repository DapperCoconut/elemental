import { Element } from './Element';
import { Ability, CastContext } from './Ability';

const droneCommand: Ability = {
  id: 'drone-command',
  name: 'Drone Command',
  description: 'All drones fire a laser at cursor (3 dmg each). Each shot uses 1 of a drone\'s 3 charges — drone destroyed at 0.',
  displayKey: 'Click',
  cooldown: 1500,
  cast(ctx: CastContext) {
    ctx.commandDrones(ctx.targetX, ctx.targetY);
  },
};

const droneSummon: Ability = {
  id: 'drone-summon',
  name: 'Drone Summon',
  description: 'Summon an attack drone (3 shots, max 6). Drones orbit you and do not block projectiles.',
  displayKey: 'E',
  cooldown: 3000,
  cast(ctx: CastContext) {
    ctx.spawnDrone();
  },
};

const droneDestroy: Ability = {
  id: 'drone-destroy',
  name: 'Drone Destroy',
  description: 'Launch a drone to cursor — explodes on arrival (5 dmg per shot remaining, max 15)',
  displayKey: 'R',
  cooldown: 3000,
  cast(ctx: CastContext) {
    ctx.launchDrone(ctx.targetX, ctx.targetY);
  },
};

const firewallAbility: Ability = {
  id: 'firewall',
  name: 'Firewall',
  description: 'Place a wall (100 HP) — blocks enemy shots. Long side always faces you.',
  displayKey: 'F',
  cooldown: 15000,
  cast(ctx: CastContext) {
    ctx.placeFirewall(ctx.targetX, ctx.targetY);
  },
};

const overdrive: Ability = {
  id: 'overdrive',
  name: 'Overdrive',
  description: 'Giant rotating beam (0.5s per drone). Tracks cursor slowly. Destroys all drones when it ends.',
  displayKey: 'Q',
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
  abilities: [droneCommand, droneSummon, droneDestroy, firewallAbility, overdrive],
};
