import { Element } from './Element';

export const quantumElement: Element = {
  id: 'quantum',
  name: 'Quantum',
  color: 0xaa44ff,
  emoji: '⚛️',
  abilities: [
    {
      id: 'quantum-wave',
      name: 'Molecular Cutter',
      description: 'Click: hurl a dagger that plants where you aim (8 dmg). Up to 3 can be out; the next click recalls them all — a dagger that hits on the way back deals 12. Daggers take your current form\'s colour.',
      displayKey: 'Click',
      cooldown: 0,
      cast(ctx) { ctx.quantumWave(ctx.targetX, ctx.targetY); },
    },
    {
      id: 'chaos-control',
      name: 'Chaos Control',
      description: 'Entropy (red): a circle blast that enlarges the enemy and makes it take +20% damage for 3s. Order (blue): a 3s cone that slows enemies 80% and deals 8/s — enemy projectiles inside it stop and convert into Weak HP for you. Mechanic form fires both.',
      displayKey: 'E',
      cooldown: 5000,
      cast(ctx) { ctx.quantumChaosControl(ctx.targetX, ctx.targetY); },
    },
    {
      id: 'atom-vibration',
      name: 'Atom Vibration',
      description: 'Dash forward; grab and throw the enemy, inflicting Vibration for 12s. Recast to detonate: 20 dmg + 1s stun.',
      displayKey: 'R',
      cooldown: 10000,
      cast(ctx) { ctx.quantumAtomVibration(ctx.targetX, ctx.targetY); },
    },
    {
      id: 'quantum-mechanic',
      name: 'Quantum Mechanic',
      description: 'Activate both forms at once for 8s — dual passives, dual stat boosts, and both Chaos Control effects fire immediately. 1s stun on expiry.',
      displayKey: 'F',
      cooldown: 20000,
      cast(ctx) { ctx.quantumMechanic(ctx.targetX, ctx.targetY); },
    },
    {
      id: 'atom-nhilego',
      name: 'Atom-Nhilego',
      description: 'Spawn a large shadow. Stand under it when the ball falls to grow it +10%, launch 3 rocks, and repeat. Miss once — the cycle ends, healing 10 HP per success.',
      displayKey: 'Q',
      isUltimate: true,
      cooldown: 40000,
      cast(ctx) { ctx.quantumAtomNhilego(ctx.targetX, ctx.targetY); },
    },
  ],
};
