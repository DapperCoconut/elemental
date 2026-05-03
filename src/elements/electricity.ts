import { Element } from './Element';
import { Ability } from './Ability';
import { Projectile } from '../combat/Projectile';

const electroBall: Ability = {
  id: 'electro-ball',
  name: 'Electro Ball',
  description: 'Fire a ball of electricity (15 dmg). At 20+ kinetic power, shocks nearby enemies. At 50, grows larger and shocks more.',
  displayKey: 'Click',
  cooldown: 500,
  cast(ctx) {
    const dx = ctx.targetX - ctx.casterX;
    const dy = ctx.targetY - ctx.casterY;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const speed = 520;
    const spawnDist = 32;
    const proj = new Projectile(
      ctx.scene,
      ctx.casterX + (dx / len) * spawnDist,
      ctx.casterY + (dy / len) * spawnDist,
      'proj-electro',
      15,
      ctx.isPlayerCaster,
    );
    ctx.projectiles.add(proj);
    proj.launch((dx / len) * speed, (dy / len) * speed);
  },
};

const electroDash: Ability = {
  id: 'electro-dash',
  name: 'Electro Dash',
  description: 'Teleport toward cursor. Passing through enemies deals 15 dmg. Recast once costs 15 kinetic power.',
  displayKey: 'E',
  cooldown: 1500,
  cast(ctx) { void ctx; }, // Teleport handled in ArenaScene
};

const kineticDischarge: Ability = {
  id: 'kinetic-discharge',
  name: 'Kinetic Discharge',
  description: 'Explosion at cursor for ½ kinetic power in damage. Costs 20 kinetic power (min 20 to cast).',
  displayKey: 'R',
  cooldown: 4000,
  cast(ctx) { void ctx; }, // Handled in ArenaScene
};

const painBattery: Ability = {
  id: 'pain-battery',
  name: 'Pain Battery',
  description: 'Hold to take damage and charge kinetic power. Release to deal 3/4 of the self-damage dealt as AoE.',
  displayKey: 'F',
  cooldown: 0,
  cast(ctx) { void ctx; }, // Handled in ArenaScene
};

const restart: Ability = {
  id: 'restart',
  name: 'Restart',
  description: 'Become overcharged for 5s. If you die while overcharged: revive at HP equal to kinetic power, consuming all kinetic.',
  displayKey: 'Q',
  isUltimate: true,
  cooldown: 60000,
  cast(ctx) { void ctx; }, // Handled in ArenaScene
};

export const electricityElement: Element = {
  id: 'electricity',
  name: 'Electricity',
  color: 0xffee00,
  emoji: '⚡',
  abilities: [electroBall, electroDash, kineticDischarge, painBattery, restart],
};
