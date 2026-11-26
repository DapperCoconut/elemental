import { Element } from './Element';
import { Ability, CastContext } from './Ability';
import { MAGMA_CLICK_TAP_MS } from './kits/MagmaKit';

/**
 * Magma — a pirate made of the melt, and everything he carries is loaded.
 *
 * A blunderbuss whose recoil only throws him when he fires it straight out of a dodge, a brace
 * of flintlocks, a drink that puts the pain off until later, a core he clamps to somebody and
 * then beats on until it goes off, and a galleon that comes up out of the floor across the top
 * of the arena with three guns and an anchor on a chain.
 *
 * Every `cast` here is a one-line delegate; the whole simulation lives in MagmaKit.
 */

const blunderblast: Ability = {
  id: 'magma-blunder',
  name: 'Blunderblast',
  description: 'Fire a spread of 8 molten pellets at your cursor, 4 damage each. Holds 2 charges, each back in 3s. Fired right after a dodge, the recoil throws you a long way the other direction.',
  displayKey: 'Click',
  // The real refusal is the charge count, which the kit owns; this only stops a double-press
  // emptying both charges on one frame.
  cooldown: MAGMA_CLICK_TAP_MS,
  cast(ctx: CastContext) { ctx.magmaBlunder(ctx.targetX, ctx.targetY); },
};

const hotshot: Ability = {
  id: 'magma-hotshot',
  name: 'Hotshot',
  description: 'Pull out two flaming flintlocks. Your next two clicks each fire one: an instant shot along your aim for 26 to the first enemy on the line. When both are spent you are back on the blunderbuss.',
  displayKey: 'E',
  cooldown: 9000,
  cast(ctx: CastContext) { ctx.magmaHotshot(); },
};

const drink: Ability = {
  id: 'magma-drink',
  name: 'Nice Hot Drink',
  description: 'Chug a flaming brew and go Numb for 5s: you take no damage and cannot be slowed or stunned. When it wears off, 80% of the damage you did not feel comes back at once as a burn over 4s.',
  displayKey: 'R',
  cooldown: 18000,
  cast(ctx: CastContext) { ctx.magmaDrink(); },
};

const core: Ability = {
  id: 'magma-core',
  name: 'Unstable Core',
  description: 'Clamp a molten core with 100 HP onto a very close enemy. Whatever damage they take, the core takes too. At zero it erupts for 5s — burning them for 10 a second, leaving lava where they stand and throwing rock outward — then explodes for 45.',
  displayKey: 'F',
  cooldown: 14000,
  cast(ctx: CastContext) { ctx.magmaCore(); },
};

const limoncello: Ability = {
  id: 'magma-limoncello',
  name: 'Limoncello',
  description: 'Melt into the ground and come back up on a giant molten pirate ship across the top of the arena. 200 hull, which takes your hits while you stand on it. Click a cannon you are standing by to light its fuse: each covers a different third of the arena for 36 and leaves lava. Blast the anchor to send it swinging on its chain for 24. You can walk off the ship whenever you like.',
  displayKey: 'Q',
  isUltimate: true,
  cooldown: 20000,
  cast(ctx: CastContext) { ctx.magmaLimoncello(); },
};

export const magmaElement: Element = {
  id: 'magma',
  name: 'Magma',
  color: 0xff5a1e,
  emoji: '🌋',
  abilities: [blunderblast, hotshot, drink, core, limoncello],
};
