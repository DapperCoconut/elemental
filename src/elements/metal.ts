import { Element } from './Element';
import { Ability } from './Ability';

const slash: Ability = {
  id: 'metal-slash',
  name: 'Slash',
  description: 'Swing a sword, dealing 25 damage and applying Aggressive Bleeding — 2 damage/s tick and a blood puddle every 3s. Stand in your own blood puddles to fill your blood bar.',
  displayKey: 'Click',
  cooldown: 600,
  cast(ctx) { ctx.metalSlash(ctx.targetX, ctx.targetY); },
};

const flailCraft: Ability = {
  id: 'metal-flail-craft',
  name: 'Flail Craft',
  description: 'Forge a flail head on a chain that trails behind you. Click again while it exists to send it swinging — speed (and damage) decays over 10s, and the head glows redder the faster it spins. Despawns after 10s if never triggered.',
  displayKey: 'E',
  cooldown: 25000,
  cast(ctx) { ctx.metalFlailCraft(); },
};

const bloodTransfusion: Ability = {
  id: 'metal-blood-transfusion',
  name: 'Blood Transfusion',
  description: 'Hold to drain your blood bar into HP at 30 blood/s (1:1). Stops early once your blood runs out.',
  displayKey: 'R',
  cooldown: 200, // internal tick rate the NPC re-casts at while held; actual drain runs per-frame
  cast(ctx) { ctx.metalBloodTransfusionTick(); },
};

const chainTether: Ability = {
  id: 'metal-chain-tether',
  name: 'Chain Tether',
  description: 'Launch a chain forward. On hit: tethers the enemy for 5s (limits movement) and applies Aggressive Bleeding.',
  displayKey: 'F',
  cooldown: 9600,
  cast(ctx) { ctx.metalChainTether(ctx.targetX, ctx.targetY); },
};

const clotArmor: Ability = {
  id: 'metal-clot-armor',
  name: 'Clot Armor',
  description: 'Consume your entire blood bar for shield HP (1.25x its value). Every 25 shield HP lost fires 5 blood shards (10 dmg each) that spawn a puddle on hit. Shield does not regenerate once broken; recasting fully replaces it.',
  displayKey: 'Q',
  isUltimate: true,
  cooldown: 40000,
  cast(ctx) { ctx.metalClotArmor(); },
};

export const metalElement: Element = {
  id: 'metal',
  name: 'Metal',
  color: 0x8899aa,
  emoji: '⚙️',
  abilities: [slash, flailCraft, bloodTransfusion, chainTether, clotArmor],
};
