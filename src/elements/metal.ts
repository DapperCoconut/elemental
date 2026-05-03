import { Element } from './Element';
import { Ability } from './Ability';

const slash: Ability = {
  id: 'metal-slash',
  name: 'Slash',
  description: 'Swing a sword, dealing 25 damage and applying Aggressive Bleeding — 2 damage/s tick and a blood puddle every 3s. Stand in your own blood puddles to heal.',
  displayKey: 'Click',
  cooldown: 600,
  cast(ctx) { ctx.metalSlash(ctx.targetX, ctx.targetY); },
};

const fireAtWill: Ability = {
  id: 'metal-fire-at-will',
  name: 'Fire at Will!',
  description: 'Unleash every gun in your arsenal at once toward your cursor.',
  displayKey: 'E',
  cooldown: 5000,
  cast(ctx) { ctx.metalFireAtWill(); },
};

const reinforce: Ability = {
  id: 'metal-reinforce',
  name: 'Reinforce!',
  description: 'Choose 1 of 3 random weapons to add to your arsenal (max 3 slots). Oldest weapon replaced when full.',
  displayKey: 'R',
  cooldown: 15000,
  cast(ctx) { ctx.metalOpenReinforcementMenu(); },
};

const chainTether: Ability = {
  id: 'metal-chain-tether',
  name: 'Chain Tether',
  description: 'Launch a chain forward. On hit: tethers the enemy for 5s (limits movement) and applies Aggressive Bleeding.',
  displayKey: 'F',
  cooldown: 8000,
  cast(ctx) { ctx.metalChainTether(ctx.targetX, ctx.targetY); },
};

const bloodClot: Ability = {
  id: 'metal-blood-clot',
  name: 'Blood Clot',
  description: 'Consume all blood puddles. Gain armor with 50 HP (+20/puddle) that absorbs damage and reflects 50% back. Lasts 8s (+2s/puddle).',
  displayKey: 'Q',
  isUltimate: true,
  cooldown: 40000,
  cast(ctx) { ctx.metalBloodClot(); },
};

export const metalElement: Element = {
  id: 'metal',
  name: 'Metal',
  color: 0x8899aa,
  emoji: '⚙️',
  abilities: [slash, fireAtWill, reinforce, chainTether, bloodClot],
};
