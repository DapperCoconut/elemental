import { Element } from './Element';
import { Ability, CastContext } from './Ability';

/**
 * Magma — a test element, reachable only from a cheat-mode save for now.
 *
 * Its two summons are *pressure vessels*, and they are charged by Magma's own attacks. That
 * inverts the usual question: every other element asks where the enemy is, and Magma also asks
 * where your volcano is, because a puddle that lands on it, a rock that hits it or a fist that
 * comes down on it is worth more than the same attack aimed at a person.
 *
 * The result is an element with two economies running at once — the lava on the floor doing
 * ordinary damage, and the pressure quietly climbing toward a collapse that clears the arena,
 * or toward twenty seconds of being a dragon.
 *
 * Every `cast` here is a one-line delegate; the whole simulation lives in MagmaKit.
 */

const plume: Ability = {
  id: 'magma-plume',
  name: 'Plume',
  description: 'Throw out 5 pools of magma around you. Anything standing in one burns for 34 a second. Hatched, this becomes dragon breath instead.',
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

const jet: Ability = {
  id: 'magma-jet',
  name: 'Magma Jet',
  description: 'Hold F to open a jet of molten flame at your cursor. It burns everything in the cone for 12 every 0.15s and throws you backwards away from wherever you are pointing. Up to 3s of thrust, and it charges your vessels the whole way.',
  displayKey: 'F',
  cooldown: 12000,
  cast(ctx: CastContext) { ctx.magmaJet(ctx.targetX, ctx.targetY); },
};

const dragonKin: Ability = {
  id: 'magma-dragon-kin',
  name: 'Dragon Kin',
  description: 'Lay a dragon egg holding 250 pressure. Attack it until it hatches and you become the dragon for 20s: 20% less damage taken, 20% more speed, and a click that breathes fire.',
  displayKey: 'Q',
  isUltimate: true,
  cooldown: 55000,
  cast(ctx: CastContext) { ctx.magmaDragonKin(ctx.targetX, ctx.targetY); },
};

export const magmaElement: Element = {
  id: 'magma',
  name: 'Magma',
  color: 0xff5a1e,
  emoji: '🌋',
  abilities: [plume, volcano, bloat, jet, dragonKin],
};
