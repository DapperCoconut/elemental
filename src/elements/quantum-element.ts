import { Element } from './Element';

export const quantumElement: Element = {
  id: 'quantum',
  name: 'Quantum',
  color: 0xaa44ff,
  emoji: '⚛️',
  abilities: [
    {
      id: 'quantum-wave',
      name: 'Wave Reducer',
      description: 'Click: baseline sine wave for 2s. Hold to charge — release in yellow/green zone for higher frequency and amplitude.',
      displayKey: 'Click',
      cooldown: 0,
      cast(ctx) { ctx.quantumWave(ctx.targetX, ctx.targetY); },
    },
    {
      id: 'chaos-control',
      name: 'Chaos Control',
      description: 'Entropy: circle telegraph, then AoE + 3 rock projectiles. Order: cone telegraph, then damage + slow 15% for 3s.',
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
      cooldown: 40000,
      cast(ctx) { ctx.quantumAtomNhilego(ctx.targetX, ctx.targetY); },
    },
  ],
};
