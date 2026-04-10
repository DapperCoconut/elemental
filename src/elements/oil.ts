import { Element } from './Element';
import { Ability, CastContext } from './Ability';

const droneCommand: Ability = {
  id: 'drone-command',
  name: 'Drone Command',
  description: 'All drones fire a laser at cursor (3 dmg AoE). Does nothing without drones.',
  displayKey: 'Click',
  cooldown: 1500,
  cast(ctx: CastContext) {
    ctx.commandDrones(ctx.targetX, ctx.targetY);
  },
};

const droneSummon: Ability = {
  id: 'drone-summon',
  name: 'Drone Summon',
  description: 'Summon an attack drone (15 HP, max 6)',
  displayKey: 'E',
  cooldown: 3000,
  cast(ctx: CastContext) {
    ctx.spawnDrone();
  },
};

const droneDestroy: Ability = {
  id: 'drone-destroy',
  name: 'Drone Destroy',
  description: 'Launch a drone to cursor — explodes for its remaining HP',
  displayKey: 'R',
  cooldown: 3000,
  cast(ctx: CastContext) {
    ctx.launchDrone(ctx.targetX, ctx.targetY);
  },
};

const firewallAbility: Ability = {
  id: 'firewall',
  name: 'Firewall',
  description: 'Place an orange wall (100 HP) — blocks enemies & their shots. Drones gain shield on pass-through.',
  displayKey: 'F',
  cooldown: 15000,
  cast(ctx: CastContext) {
    ctx.placeFirewall(ctx.targetX, ctx.targetY);
  },
};

const overdrive: Ability = {
  id: 'overdrive',
  name: 'Overdrive',
  description: 'Giant rotating beam (2s per drone). Tracks cursor slowly.',
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
