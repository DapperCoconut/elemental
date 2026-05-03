import { Element } from './Element';
import { Ability } from './Ability';

const magPulse: Ability = {
  id: 'mag-pulse',
  name: 'Mag Pulse',
  description: 'Send a magnetic pulse to cursor. Nearby rods rush toward it, dealing 20 dmg + knockback to enemies in the way. Two rods colliding creates a large AoE. Also drags nailed enemies.',
  displayKey: 'Click',
  cooldown: 800,
  cast(ctx) { ctx.magnetPulse(ctx.targetX, ctx.targetY); },
};

const nailImplant: Ability = {
  id: 'nail-implant',
  name: 'Nail Implant',
  description: 'Shoot a nail forward (18 dmg on impact). Sticks into enemies for 10s. Recast to recall the nail, dealing 18 dmg again.',
  displayKey: 'E',
  cooldown: 3000,
  cast(ctx) {
    // Handled in ArenaScene — recast vs. initial shot decided there
    ctx.magnetNailShoot(ctx.targetX, ctx.targetY);
  },
};

const magnetize: Ability = {
  id: 'magnetize',
  name: 'Magnetize',
  description: 'Magnetize the enemy under your cursor for 8s. Rods nearby slowly pull toward them. Nail shots auto-aim when within range of a magnetized enemy.',
  displayKey: 'F',
  cooldown: 5000,
  cast(ctx) { ctx.magnetMagnetize(ctx.targetX, ctx.targetY); },
};

const protect: Ability = {
  id: 'protect',
  name: 'Protect',
  description: 'Surround yourself with 20 orbiting metal orbs (5 HP each). Using Mag Pulse while shielded teleports you to cursor and grants 20% speed for 3s.',
  displayKey: 'R',
  cooldown: 15000,
  cast(ctx) { ctx.magnetProtect(); },
};

const atomSmasher: Ability = {
  id: 'atom-smasher',
  name: 'Atom Smasher',
  description: 'Mark a point — it pulses red for 3s, dragging in magnetized enemies and metal rods. Then two walls slam together for massive damage. Rods caught in the blast bounce wildly for 3s.',
  displayKey: 'Q',
  isUltimate: true,
  cooldown: 20000,
  cast(ctx) { ctx.magnetAtomSmasher(ctx.targetX, ctx.targetY); },
};

export const magnetElement: Element = {
  id: 'magnet',
  name: 'Magnet',
  color: 0xcc2244,
  emoji: '🧲',
  abilities: [magPulse, nailImplant, magnetize, protect, atomSmasher],
};
