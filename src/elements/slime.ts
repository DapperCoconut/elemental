import { Element } from './Element';
import { Ability } from './Ability';

const slimeShot: Ability = {
  id: 'slime-shot',
  name: 'Slime Shot',
  description: 'Launch a slime at cursor (8/12/15 dmg by level). No held slimes: recall all deployed ones.',
  displayKey: 'Click',
  cooldown: 400,
  cast(_ctx) { /* entity lifecycle handled in ArenaScene */ },
};

const slimeySplash: Ability = {
  id: 'slimey-splash',
  name: 'Slimey Splash',
  description: '3s: slimes drip puddles beneath them every 1s. Flying through puddles grants slimes 10 XP.',
  displayKey: 'E',
  cooldown: 8000,
  cast(_ctx) { /* ArenaScene sets slimeSplashActiveUntil */ },
};

const sulpherSpring: Ability = {
  id: 'sulpher-spring',
  name: 'Sulpher Spring',
  description: 'Spawn a spring at cursor (5s). Enemy or you touching it: confused 2s. Slimes gain a variant.',
  displayKey: 'R',
  cooldown: 10000,
  cast(_ctx) { /* ArenaScene spawns spring */ },
};

const slimeShield: Ability = {
  id: 'slime-shield',
  name: 'Slime Shield',
  description: 'A random slime engulfs you, absorbing damage (25/50/75 HP by level) until destroyed.',
  displayKey: 'F',
  cooldown: 0,
  cast(_ctx) { /* damageAbsorber installed by ArenaScene */ },
};

const slimeRain: Ability = {
  id: 'slime-rain',
  name: 'Slime Rain',
  description: '10 slimes rain down across the arena, dealing AoE damage on landing then recalling back.',
  displayKey: 'Q',
  cooldown: 25000,
  cast(_ctx) { /* ArenaScene handles rain phase */ },
};

export const slimeElement: Element = {
  id: 'slime',
  name: 'Slime',
  color: 0x66cc44,
  emoji: '🟢',
  abilities: [slimeShot, slimeySplash, sulpherSpring, slimeShield, slimeRain],
};
