import { Element } from './Element';
import { Ability, CastContext } from './Ability';

/**
 * Pressure — a test element, reachable only from a cheat-mode save for now.
 *
 * A riveted steel robot with one giant gauntlet. Every key is held to build pressure (the bar
 * under the robot, 0–100 over six seconds) and let go to spend it; each ability has a 50 and a
 * 100 breakpoint on top of its plain scaling. Release (F) is the exception: it banks its pressure
 * between holds and fires on a tap. Exceed (Q) doubles every charge rate for 15 seconds and then
 * locks the boiler up for 3.
 *
 * Every `cast` below is a one-line delegate; the whole simulation lives in PressureKit.
 */

const pressurePunch: Ability = {
  id: 'pressure-punch',
  name: 'Pressure Punch',
  description: 'Hold to wind up the gauntlet — you walk slowly while it builds — and let go to punch: 8 damage, up to 40 at full pressure. At 50+ the punch carries you forward 110px and slows them 40% for 1.5s. At 100 it stuns for 1.2s instead.',
  displayKey: 'Click',
  cooldown: 450,
  cast(ctx: CastContext) { ctx.pressurePunch(ctx.targetX, ctx.targetY); },
};

const seismicSlam: Ability = {
  id: 'pressure-slam',
  name: 'Seismic Slam',
  description: 'Hold to charge and let go to slam the gauntlet down: 10 damage to everyone within 110px, up to 40 at full pressure. At 50+ the ring is 160px. At 100 everyone hit is driven into the floor for 3s — stuck in place, though they can still attack. Any other hit knocks them loose.',
  displayKey: 'E',
  cooldown: 4500,
  cast(ctx: CastContext) { ctx.pressureSlam(ctx.targetX, ctx.targetY); },
};

const pressurePoint: Ability = {
  id: 'pressure-point',
  name: 'Pressure Point',
  description: 'Hold to charge and let go to push out a slow red orb of pure pain: 6 damage, up to 20, and PainLock for 3s, up to 10s. Under PainLock every ability they use stuns them for 0.3s and costs them 5 health. At 50+ the stun is 0.5s. At 100 the orb is bigger and faster, and each ability costs them 8.',
  displayKey: 'R',
  cooldown: 7000,
  cast(ctx: CastContext) { ctx.pressurePoint(ctx.targetX, ctx.targetY); },
};

const release: Ability = {
  id: 'pressure-release',
  name: 'Release',
  description: 'Hold F to bank pressure three times slower than the others. It keeps what it has when you let go. Tap F to vent it: a jet of steam along your aim that does 4 damage a second, up to 12, for 1.5s, up to 4s. Anyone in the jet cannot use abilities, though they can still move. At 50+ the jet also slows them 15%. At 100 the jet ends in a great blast for 30 that stuns for 1s — and while a full 100 is banked, every other ability charges 20% faster.',
  displayKey: 'F',
  cooldown: 9000,
  cast(ctx: CastContext) { ctx.pressureRelease(ctx.targetX, ctx.targetY); },
};

const exceed: Ability = {
  id: 'pressure-exceed',
  name: 'Exceed',
  description: 'Run the boiler past its limit for 15 seconds: you glow red and pour steam, and every ability charges twice as fast. When it runs out, you are stunned for 3 seconds while the boiler cools.',
  displayKey: 'Q',
  isUltimate: true,
  cooldown: 30000,
  cast(ctx: CastContext) { ctx.pressureExceed(); },
};

export const pressureElement: Element = {
  id: 'pressure',
  name: 'Pressure',
  color: 0xc7462e,
  emoji: '🔩',
  abilities: [pressurePunch, seismicSlam, pressurePoint, release, exceed],
};
