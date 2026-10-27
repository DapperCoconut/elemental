import { Element } from './Element';
import { Ability, CastContext } from './Ability';

/**
 * Astra — a test element, reachable only from a cheat-mode save for now.
 *
 * A cracked shell of deep space with a dwarf star inside it, its light spilling out through the
 * cracks. Its attacks are locked to fixed directions — the click only fires left or right, the
 * flares erupt in a plus and an X, the smite strikes whoever is highest on the screen — until it
 * passes its Star Trial (Q) and becomes the star: then everything goes where it is aimed.
 *
 * Every `cast` below is a one-line delegate; the whole simulation lives in AstraKit.
 */

const starstruck: Ability = {
  id: 'astra-starstruck',
  name: 'Starstruck',
  description: 'Fire a burst of 4 solar shots, perfectly level, to the left or right — whichever side your cursor is on. Each shot is instant, runs the full width of the arena and does 4 damage. In star mode they go straight at your cursor.',
  displayKey: 'Click',
  cooldown: 750,
  cast(ctx: CastContext) { ctx.astraStarstruck(ctx.targetX, ctx.targetY); },
};

const solarFlares: Ability = {
  id: 'astra-solar-flares',
  name: 'Solar Flares',
  description: 'Two blasts of solar energy erupt from you, one after the other: first a plus, then an X. Each arm is a wide, instant beam to the edge of the arena that does 12 damage. In star mode both erupt at your cursor instead.',
  displayKey: 'E',
  cooldown: 5000,
  cast(ctx: CastContext) { ctx.astraSolarFlares(ctx.targetX, ctx.targetY); },
};

const celestialSmite: Ability = {
  id: 'astra-smite',
  name: 'Celestial Smite',
  description: 'A bolt of purple ethereal lightning strikes whoever is closest to the top of the screen — even if that is you. 18 damage and a heavy slow (65%) for 2s. In star mode it always strikes your opponent.',
  displayKey: 'R',
  cooldown: 7000,
  cast(ctx: CastContext) { ctx.astraSmite(ctx.targetX, ctx.targetY); },
};

const wormWarp: Ability = {
  id: 'astra-worm-warp',
  name: 'Worm Warp',
  description: 'Fire a celestial wormhole toward your cursor. If it hits an enemy, it does 8 damage and you swap places with them. In star mode it also steals: every ability they have ready goes on cooldown and the same one of yours comes off it, and you take 25% of their ultimate charge.',
  displayKey: 'F',
  cooldown: 9000,
  cast(ctx: CastContext) { ctx.astraWormWarp(ctx.targetX, ctx.targetY); },
};

const trueSelf: Ability = {
  id: 'astra-true-self',
  name: 'True Self',
  description: 'The star inside you flares, and you begin the 8-second Star Trial. A stability bar appears under your health: it rises as you deal damage, falls as you take it, and drains on its own. Keep it from emptying for the whole trial to become the star for 15s — an aura that burns up nearby shots and hurts enemies and their summons, and every attack goes where you aim. Q in star mode teleports you to your opponent for a colossal slap into the wall. Fail the trial and your Q is gone for the rest of the match.',
  displayKey: 'Q',
  isUltimate: true,
  cooldown: 40000,
  cast(ctx: CastContext) { ctx.astraTrueSelf(); },
};

export const astraElement: Element = {
  id: 'astra',
  name: 'Astra',
  color: 0x6a4cff,
  emoji: '🌟',
  abilities: [starstruck, solarFlares, celestialSmite, wormWarp, trueSelf],
};
