import { Element } from './Element';
import { Ability, CastContext } from './Ability';

/**
 * Justice — the element earned by putting the Devourer of Kings down.
 *
 * A two-stance element. On the ground you are a magistrate with a spear: you fence
 * off ground with the Coliseum, you burn Willpower for Sheer Will, and you close the
 * match by weighing the enemy on the scales. In the air you are a Valkyrie: you hover
 * over your own walls, tear the arena apart with a grappling chain, and put the enemy
 * in a trance.
 *
 * Willpower is the resource both stances share — Sheer Will drinks it fast, flight
 * drinks it slowly, and running dry drops you out of both.
 *
 * Like Hunt, the two stances are ten abilities in one list: indices 0–4 are the ground
 * set, 5–9 the flight set. ArenaScene builds a hidden second HUD row from the tail and
 * `JusticeKit.setHudForm` swaps which one is on screen. Every `cast` here is a one-line
 * delegate; the whole simulation lives in JusticeKit.
 */

// ── Ground stance ───────────────────────────────────────────────

const justiceStab: Ability = {
  id: 'justice-stab',
  name: 'Spear Thrust',
  description: '20 dmg stab in front of you, plus a 15 dmg spear thrown along the same line.',
  displayKey: 'Click',
  cooldown: 800,
  cast(ctx: CastContext) { ctx.justiceStab(ctx.targetX, ctx.targetY); },
};

const justiceColiseum: Ability = {
  id: 'justice-coliseum',
  name: 'Coliseum',
  description: 'Drive the spear down and raise a ring of columns for 8s. Nobody — and nothing they shoot — crosses it.',
  displayKey: 'E',
  cooldown: 14000,
  cast(ctx: CastContext) { ctx.justiceColiseum(); },
};

const justiceSheerWill: Ability = {
  id: 'justice-sheer-will',
  name: 'Sheer Will',
  description: 'Burn 10 Willpower/s for +20% speed. Whoever hits you deals 25% less for 3s and eats +33% on your next hit.',
  displayKey: 'R',
  cooldown: 1200,
  cast(ctx: CastContext) { ctx.justiceSheerWill(); },
};

const justiceFlight: Ability = {
  id: 'justice-flight',
  name: 'Flight of the Valkyrie',
  description: 'Take to the air: +33% speed, hover over hazards and your own walls, −2 Willpower/s, +20% damage taken.',
  displayKey: 'F',
  cooldown: 2500,
  cast(ctx: CastContext) { ctx.justiceFlight(); },
};

const justiceJudgementDay: Ability = {
  id: 'justice-judgement-day',
  name: 'Judgement Day',
  description: 'Weigh the enemy on the scales. The more damage they have done to you, the longer they spend in chains.',
  displayKey: 'Q',
  isUltimate: true,
  cooldown: 30000,
  cast(ctx: CastContext) { ctx.justiceJudgementDay(); },
};

// ── Flight stance ───────────────────────────────────────────────

const justiceSpearThrow: Ability = {
  id: 'justice-spear-throw',
  name: 'Spear of Heaven',
  description: 'Hurl a spear at the cursor. It bursts on landing for 20 dmg.',
  displayKey: 'Click',
  cooldown: 1500,
  cast(ctx: CastContext) { ctx.justiceSpearThrow(ctx.targetX, ctx.targetY); },
};

const justiceBind: Ability = {
  id: 'justice-bind',
  name: 'Bind',
  description: 'Throw a grappling chain — 10 dmg through anything it passes. Recast to rip that arena wall out and drive it across.',
  displayKey: 'E',
  cooldown: 5000,
  cast(ctx: CastContext) { ctx.justiceBind(ctx.targetX, ctx.targetY); },
};

const justicePillar: Ability = {
  id: 'justice-pillar',
  name: 'Pillar of Flame',
  description: 'Split the arena with a wall of fire for 8s — 12 dmg/s and a 25% slow to anything standing in it.',
  displayKey: 'R',
  cooldown: 14000,
  cast(ctx: CastContext) { ctx.justicePillar(ctx.targetX, ctx.targetY); },
};

const justiceDescend: Ability = {
  id: 'justice-descend',
  name: 'Descend',
  description: 'Put your feet back on the floor and return to the ground stance.',
  displayKey: 'F',
  cooldown: 500,
  cast(ctx: CastContext) { ctx.justiceDescend(); },
};

const justiceSeraphim: Ability = {
  id: 'justice-seraphim',
  name: "Seraphim's Gaze",
  description: 'Take the centre of the arena and open every eye. The enemy walks toward you, entranced, for 10s.',
  displayKey: 'Q',
  isUltimate: true,
  cooldown: 34000,
  cast(ctx: CastContext) { ctx.justiceSeraphim(); },
};

export const justiceElement: Element = {
  id: 'justice',
  name: 'Justice',
  color: 0xf0d68a,
  emoji: '⚖️',
  abilities: [
    justiceStab, justiceColiseum, justiceSheerWill, justiceFlight, justiceJudgementDay,
    justiceSpearThrow, justiceBind, justicePillar, justiceDescend, justiceSeraphim,
  ],
};
