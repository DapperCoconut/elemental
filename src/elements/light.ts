import { Element } from './Element';
import { Ability } from './Ability';

const lightStab: Ability = {
  id: 'light-stab',
  name: 'Light Stab',
  description: 'Tap: highlight enemy (15% more damage, 2s). Hold: summon light spear — damage scales with speed',
  displayKey: 'Click',
  cooldown: 500,
  cast(ctx) { void ctx; }, // Handled in ArenaScene
};

const photoSpark: Ability = {
  id: 'photo-spark',
  name: 'Photosynthespark',
  description: 'Slow 20% for 3s, then accelerate (15%→200% speed) for 5s. Stand still during accel to regen 8 HP/s',
  displayKey: 'E',
  cooldown: 10000,
  cast(ctx) { void ctx; }, // Handled in ArenaScene
};

const photonOrbs: Ability = {
  id: 'photon-orbs',
  name: 'Photon Orbs',
  description: 'Summon 2 orbiting photon orbs. Enemy hit = OverStim (tick damage by speed). Recast to consume orb: 200% speed 1.5s. 20s cd after last orb used',
  displayKey: 'R',
  cooldown: 20000,
  cast(ctx) { void ctx; }, // Handled in ArenaScene
};

const skewer: Ability = {
  id: 'skewer',
  name: 'Skewer',
  description: 'Activate 5s skewer mode. Hitting enemy with held spear drags them — run into wall for heavy speed-scaled damage',
  displayKey: 'F',
  cooldown: 18000,
  cast(ctx) { void ctx; }, // Handled in ArenaScene
};

const prayer: Ability = {
  id: 'prayer',
  name: 'Prayer',
  description: 'Summon guardian angel 8s: 25% speed, 25% DR, auto-highlight enemy, 8 holy blades every 3s',
  displayKey: 'Q',
  cooldown: 45000,
  cast(ctx) { void ctx; }, // Handled in ArenaScene
};

export const lightElement: Element = {
  id: 'light',
  name: 'Light',
  color: 0xfff4a8,
  emoji: '✨',
  abilities: [lightStab, photoSpark, photonOrbs, skewer, prayer],
};
