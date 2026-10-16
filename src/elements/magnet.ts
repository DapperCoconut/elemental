import { Element } from './Element';
import { Ability } from './Ability';

/**
 * Magnet — a scrap-metal magician. Every key either throws the metal it has left lying around
 * the arena, or throws the magnet at it. All of the logic lives in `kits/MagnetKit.ts`; the two
 * "again" presses (ripping nails out, riding to a spike) and holding the coins never touch a
 * cooldown, so the kit handles them before these casts are reached.
 */

const coinFlip: Ability = {
  id: 'magnet-coin',
  name: 'Coin Flip',
  description: 'Flip a coin where you stand; lands 3s later. Hold to freeze them',
  displayKey: 'Click',
  cooldown: 450,
  cast(ctx) { ctx.magnetCoin(ctx.targetX, ctx.targetY); },
};

const repulse: Ability = {
  id: 'magnet-repulse',
  name: 'Repulse',
  description: 'Close cone: fires coins, spikes, nails and scrap the way you face',
  displayKey: 'E',
  cooldown: 2500,
  cast(ctx) { ctx.magnetRepulse(ctx.targetX, ctx.targetY); },
};

const nailImplant: Ability = {
  id: 'magnet-nail',
  name: 'Nail Implant',
  description: 'Nail sticks in a foe (10). Again: rip all nails out (15 each)',
  displayKey: 'R',
  cooldown: 5000,
  cast(ctx) { ctx.magnetNail(ctx.targetX, ctx.targetY); },
};

const steelSpike: Ability = {
  id: 'magnet-spike',
  name: 'Steel Spike',
  description: 'Rod follows your cursor 2s, then slams (22). Again: ride to it',
  displayKey: 'F',
  cooldown: 8000,
  cast(ctx) { ctx.magnetSpike(ctx.targetX, ctx.targetY); },
};

const mechaMassacre: Ability = {
  id: 'magnet-mecha',
  name: 'Mecha Massacre',
  description: 'Stand still 3s as scrap gathers, then pilot a giant mech for 15s',
  displayKey: 'Q',
  isUltimate: true,
  cooldown: 50000,
  cast(ctx) { ctx.magnetMecha(); },
};

export const magnetElement: Element = {
  id: 'magnet',
  name: 'Magnet',
  color: 0xcc2244,
  emoji: '🧲',
  abilities: [coinFlip, repulse, nailImplant, steelSpike, mechaMassacre],
};
