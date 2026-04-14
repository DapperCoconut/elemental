import { Element } from './Element';
import { Ability } from './Ability';

const rhythmShot: Ability = {
  id: 'rhythm-shot',
  name: 'Rhythm Range',
  description: 'Time clicks with the rhythm track to fire 25 dmg sound blasts. Missing costs 10 HP. Rare red circles deal 35 dmg.',
  displayKey: 'Click',
  cooldown: 0,
  cast(ctx) { void ctx; }, // Rhythm mechanic handled in ArenaScene
};

const flowMode: Ability = {
  id: 'flow-mode',
  name: 'Flow Mode',
  description: 'Toggle: 2× rhythm speed. Circles reaching the left edge deal 5 dmg to you.',
  displayKey: 'E',
  cooldown: 0,
  cast(ctx) { void ctx; }, // Toggle handled in ArenaScene
};

const screechBarrier: Ability = {
  id: 'screech-barrier',
  name: 'Screech Barrier',
  description: 'Place a sonic barrier at cursor (5s). Enemy takes 15 dmg on contact and can pass freely. In Flow Mode: red, 25 dmg.',
  displayKey: 'R',
  cooldown: 16000,
  cast(ctx) { void ctx; }, // Handled in ArenaScene
};

const soundGrapple: Ability = {
  id: 'sound-grapple',
  name: 'Sonic Grapple',
  description: 'Grapple to cursor, leaving 5 music note pickups. Collecting notes grants 5% dodge for 5s (up to 25%). Time with a rhythm circle for an AoE explosion at destination.',
  displayKey: 'F',
  cooldown: 12000,
  cast(ctx) { void ctx; }, // Handled in ArenaScene
};

const accelerando: Ability = {
  id: 'accelerando',
  name: 'Accelerando',
  description: 'Requires 10 consecutive hits. For 5s: 2× rhythm speed + auto-play every note.',
  displayKey: 'Q',
  cooldown: 25000,
  cast(ctx) { void ctx; }, // Handled in ArenaScene
};

export const soundElement: Element = {
  id: 'sound',
  name: 'Sound',
  color: 0xff66cc,
  emoji: '🔊',
  abilities: [rhythmShot, flowMode, screechBarrier, soundGrapple, accelerando],
};
