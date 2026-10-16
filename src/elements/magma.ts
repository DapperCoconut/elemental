import { Element } from './Element';
import { Ability, CastContext } from './Ability';

/**
 * Magma — a melting pirate whose volcano is a pressure vessel charged by his own attacks.
 *
 * That inverts the usual question: every other element asks where the enemy is, and Magma also
 * asks where your volcano is, because a puddle that lands on it, a rock that hits it or a cone
 * fired across it is worth more than the same attack aimed at a person. The lava on the floor
 * does ordinary damage; the pressure quietly climbs toward a collapse that clears the arena.
 *
 * The other half of the kit is the pirate's. Blunder-Boil is a blunderbuss of lava whose recoil
 * throws *you*, and Molten Mutiny is a cursed pendant that skims a fifth of everything you deal
 * until it has enough to raise the ship.
 *
 * Every `cast` here is a one-line delegate; the whole simulation lives in MagmaKit.
 */

const plume: Ability = {
  id: 'magma-plume',
  name: 'Plume',
  description: 'Throw out 5 pools of magma around you. Anything standing in one burns for 34 a second. At the helm of the ship, this fires all six cannons instead.',
  displayKey: 'Click',
  cooldown: 2000,
  cast(ctx: CastContext) { ctx.magmaPlume(ctx.targetX, ctx.targetY); },
};

const volcano: Ability = {
  id: 'magma-volcano',
  name: 'Volcano',
  description: 'Raise a volcano at your cursor. Attack it to raise its pressure — the higher it climbs the more lava and rock it throws. At 100 it goes critical and collapses for 60 in a huge radius.',
  displayKey: 'E',
  cooldown: 10000,
  cast(ctx: CastContext) { ctx.magmaVolcano(ctx.targetX, ctx.targetY); },
};

const bloat: Ability = {
  id: 'magma-bloat',
  name: 'Magma Bloat',
  description: 'Swell with magma for 10s. The next hit that lands on you is blocked outright and bursts for 30 around you.',
  displayKey: 'R',
  cooldown: 8000,
  cast(ctx: CastContext) { ctx.magmaBloat(); },
};

const blunder: Ability = {
  id: 'magma-blunder',
  name: 'Blunder-Boil',
  description: 'Blast a cone of lava at your cursor for 15 to everything caught in it — and the recoil throws you a long way the other direction. Holds 2 charges, each back in 3s.',
  displayKey: 'F',
  // The real refusal is the charge count, which the kit owns; this only stops a double-press
  // emptying both charges on one frame.
  cooldown: 300,
  cast(ctx: CastContext) { ctx.magmaBlunder(ctx.targetX, ctx.targetY); },
};

const mutiny: Ability = {
  id: 'magma-mutiny',
  name: 'Molten Mutiny',
  description: 'Don a cursed red pendant that takes 20% of every point you would deal — to a body or into a volcano — and keeps it. At 50 it wakes the flaming pirate ship: 300 hull burning down 15 a second, steered by your cursor, six cannons on the click, Space to go over the side and back aboard. Q again removes the pendant.',
  displayKey: 'Q',
  isUltimate: true,
  cooldown: 8000,
  cast(ctx: CastContext) { ctx.magmaMutiny(); },
};

export const magmaElement: Element = {
  id: 'magma',
  name: 'Magma',
  color: 0xff5a1e,
  emoji: '🌋',
  abilities: [plume, volcano, bloat, blunder, mutiny],
};
