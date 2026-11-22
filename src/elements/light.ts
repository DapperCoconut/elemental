import { Element } from './Element';
import { Ability } from './Ability';

const lightLance: Ability = {
  id: 'light-lance',
  name: 'Light Lance',
  description: 'Hold to channel a lance and shrink into car-mode: steer with your cursor, accelerating on straightaways and drifting (losing speed) through hard turns. No cooldown',
  displayKey: 'Click',
  cooldown: 0,
  cast(ctx) { void ctx; }, // Handled in ArenaScene
};

const blink: Ability = {
  id: 'blink',
  name: 'Blink',
  description: 'Instantly snap your heading to the cursor without losing speed. Stores up to 2 charges (5s recharge each)',
  displayKey: 'E',
  cooldown: 5000,
  cast(ctx) { void ctx; }, // Handled in ArenaScene
};

const prismRamp: Ability = {
  id: 'prism-ramp',
  name: 'Prism Ramp',
  description: 'Drop a ramp in front of you (max 5, they never fade). Driving over one grants a huge acceleration boost and launches 3 colored lances in a cone',
  displayKey: 'R',
  cooldown: 8000,
  cast(ctx) { void ctx; }, // Handled in ArenaScene
};

const lightTrick: Ability = {
  id: 'light-trick',
  name: 'Light Trick',
  description: 'A small burst of light around you. Hits deal 5 damage and grant you a big acceleration boost',
  displayKey: 'F',
  cooldown: 1000,
  cast(ctx) { void ctx; }, // Handled in ArenaScene
};

const supernova: Ability = {
  id: 'light-supernova',
  name: 'Supernova',
  description: 'Stop on a dime and pour the speed you had into a beam that reaches the wall (45 dmg/s). Top speed buys 6s of it; the beam turns slowly after your cursor. Q again to stop early',
  displayKey: 'Q',
  isUltimate: true,
  cooldown: 30000,
  cast(ctx) { void ctx; }, // Handled in LightKit
};

export const lightElement: Element = {
  id: 'light',
  name: 'Light',
  color: 0xfff4a8,
  emoji: '✨',
  abilities: [lightLance, blink, prismRamp, lightTrick, supernova],
};
