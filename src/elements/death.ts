import { Element } from './Element';
import { Ability, CastContext } from './Ability';

/**
 * Death — a test element, reachable only from a cheat-mode save for now.
 *
 * A sentinel of doom clouded in darkness, holding a katana high over his head. He does not
 * need to swing it: the clock in the corner of the screen is already running, and when it
 * reaches midnight the person in front of him dies. Everything he owns is arithmetic on that
 * one minute — Styx Shot buys time by taking their legs and their bite, Disarm buys three
 * seconds of nothing happening, Riposte buys a window where their bullets are not his problem,
 * Hospice makes all of it twice as heavy, and the Deal is the only thing in the kit that moves
 * the clock itself.
 *
 * Three of the five deal no damage at all. That is the point: Death's damage is a timer.
 *
 * Every `cast` below is a one-line delegate; the whole simulation lives in DeathKit.
 */

const styxShot: Ability = {
  id: 'death-styx',
  name: 'Styx Shot',
  description: 'Throw a draught of the river forward. It deals no damage — instead it brands whoever it touches for 3 seconds: 15% slower, and 15% less damage against you. Stacks three times, to 45% of each. Passive — Midnight: a clock runs in the corner from the moment the fight starts. When it strikes midnight your enemy dies where they stand, with no catch and no save.',
  displayKey: 'Click',
  cooldown: 620,
  cast(ctx: CastContext) { ctx.deathStyxShot(ctx.targetX, ctx.targetY); },
};

const disarm: Ability = {
  id: 'death-disarm',
  name: 'Disarm',
  description: 'Bring the katana down through everything in front of you, leaving a yellow afterimage hanging in the air. Deals no damage. Anyone caught in the arc is stunned for 3 seconds — no moving, no casting — and you take a 30% speed boost for 5 seconds.',
  displayKey: 'E',
  cooldown: 6000,
  cast(ctx: CastContext) { ctx.deathDisarm(ctx.targetX, ctx.targetY); },
};

const riposte: Ability = {
  id: 'death-riposte',
  name: 'Riposte',
  description: 'Hold the katana out in front of you for 3 seconds, tracking your cursor. Any shot that reaches the blade is cut in half — the two pieces spin off to either side of you and hit nothing at all.',
  displayKey: 'R',
  cooldown: 6000,
  cast(ctx: CastContext) { ctx.deathRiposte(ctx.targetX, ctx.targetY); },
};

const hospice: Ability = {
  id: 'death-hospice',
  name: 'Hospice',
  description: 'A noose looms over your enemy for 15 seconds. Every negative effect on them counts double for as long as it hangs there: Styx Shot brands at 30% a stack instead of 15% — 90% at three — and every debuff anyone lands on them lasts twice as long.',
  displayKey: 'F',
  cooldown: 25000,
  cast(ctx: CastContext) { ctx.deathHospice(ctx.targetX, ctx.targetY); },
};

const dealWithDeath: Ability = {
  id: 'death-deal',
  name: 'Deal with Death',
  description: 'Appear beside your enemy, shake their hand, and vanish across the arena. For the next 10 seconds you move 33% faster and dodge a third of everything thrown at you — and if you get through those 10 seconds having taken less than 50 damage, the clock jumps 10 seconds closer to midnight. Take 50 and the deal is off.',
  displayKey: 'Q',
  isUltimate: true,
  cooldown: 30000,
  cast(ctx: CastContext) { ctx.deathDeal(ctx.targetX, ctx.targetY); },
};

export const deathElement: Element = {
  id: 'death',
  name: 'Death',
  color: 0x4a4468,
  emoji: '⚰️',
  abilities: [styxShot, disarm, riposte, hospice, dealWithDeath],
};
