import { Element } from './Element';
import { Ability, CastContext } from './Ability';

/**
 * Tempest — a test element, reachable only from a cheat-mode save for now.
 *
 * A storm with a second axis. On the floor every key is wind and knockback: a two-charge burst
 * that recharges by moving, a roll that resets it, conveyor fronts, and a wall that does the
 * last 12 damage of every shove. Ride a current (F) or grapple someone into the sky (Q) and the
 * same five keys become a flight kit — the burst buys elevation when it lands on you, the roll
 * is a hop, the front is something to slam onto and bounce off, and Q is a dive that leaves
 * whoever it lands on ping-ponging between the walls under the Eye of the Storm. Height is the
 * resource: every landing pays out by how fast you came down.
 *
 * Every `cast` below is a one-line delegate; the whole simulation lives in TempestKit.
 */

const galeBurst: Ability = {
  id: 'tempest-gale',
  name: 'Gale Burst',
  description: 'Throw a burst of wind that goes off when it reaches your cursor: 10 damage in a 72px blast and a hard shove to everyone in it. No cooldown — it holds 2 charges, and you earn one back for every 240px you move. Airborne, a burst that catches you lifts you; off a wall or just before you land it lifts you a lot more.',
  displayKey: 'Click',
  cooldown: 150,
  cast(ctx: CastContext) { ctx.tempestGale(ctx.targetX, ctx.targetY); },
};

const kickBlast: Ability = {
  id: 'tempest-kick',
  name: 'Kick Blast',
  description: 'Roll 440px along your aim with a 50% dodge for the roll and the second after it. Anyone you roll through takes 15 and is kicked a long way. Refills Gale Burst to 2 charges. Airborne, the roll is a hop straight up instead — and still refills the click.',
  displayKey: 'E',
  cooldown: 5000,
  cast(ctx: CastContext) { ctx.tempestKick(ctx.targetX, ctx.targetY); },
};

const summonFront: Ability = {
  id: 'tempest-front',
  name: 'Summon Front',
  description: 'Lay a 360×116 wind front from your feet along your aim: a conveyor that carries anyone standing in it — you included — at 300px/s. Two at a time; a third fades the oldest. Airborne, it instead throws you onto your nearest front and slams it for 20 damage plus height, destroys the front, and bounces you back up higher than you started.',
  displayKey: 'R',
  cooldown: 1800,
  cast(ctx: CastContext) { ctx.tempestFront(ctx.targetX, ctx.targetY); },
};

const updraft: Ability = {
  id: 'tempest-updraft',
  name: 'Updraft',
  description: 'Three currents drift around the arena at all times. Press F within 80px of one to ride it into the sky. Up there melee and floor hazards cannot touch you, you drift at half speed, and your keys change. Gravity brings you down; the landing is a shockwave that hits harder the faster you fall.',
  displayKey: 'F',
  cooldown: 1200,
  cast(ctx: CastContext) { ctx.tempestUpdraft(); },
};

const finalForecast: Ability = {
  id: 'tempest-forecast',
  name: 'Final Forecast',
  description: 'Dash 420px. Hit someone and you grapple them into the sky: they cannot move for 3 seconds while you keep every ability, and then you both crash down for 20 damage plus 0.15 per px of height, up to 70 extra. Airborne, Q is a dive instead — a dive-speed landing that leaves whoever it hits ping-ponging off three walls under the Eye of the Storm.',
  displayKey: 'Q',
  isUltimate: true,
  cooldown: 22000,
  cast(ctx: CastContext) { ctx.tempestForecast(ctx.targetX, ctx.targetY); },
};

export const tempestElement: Element = {
  id: 'tempest',
  name: 'Tempest',
  color: 0x7fb4ff,
  emoji: '🌪️',
  abilities: [galeBurst, kickBlast, summonFront, updraft, finalForecast],
};
