import { Element } from './Element';
import { Ability, CastContext } from './Ability';

/**
 * Venom (element id `slime` — it was Acid, and Slime before that; the id never moved).
 *
 * A serpent whose long tail is part of its hitbox, and whose real weapon is toxin: stacks that
 * never fade and get worse at every tier until they kill outright at 1000. The floor is a grid of
 * acid cells, and how much of the arena it covers (the gauge across the top) feeds the whip, the
 * bite and the mastery.
 *
 * Every `cast` is a one-line delegate; the whole simulation lives in SlimeKit.
 */

const poisonWhip: Ability = {
  id: 'poison-whip',
  name: 'Poison Whip',
  description: 'A barrage of 15 acid lashes toward the cursor, 1 damage each — 20 while you stand in acid. Every lash lands 1 toxin; with half the arena acidified, 2.',
  displayKey: 'Click',
  cooldown: 400,
  cast(ctx: CastContext) { ctx.acidWhip(ctx.targetX, ctx.targetY); },
};

const vileSpray: Ability = {
  id: 'vile-spray',
  name: 'Vile Spray',
  description: 'Spray three splashes of acid onto the floor ahead of you. Fresh acid nips whoever first walks over it; standing on any of your acid burns 1 a second and lands 3 toxin a second. It never dries.',
  displayKey: 'E',
  cooldown: 6000,
  cast(ctx: CastContext) { ctx.acidSpray(ctx.targetX, ctx.targetY); },
};

const snakeBurrow: Ability = {
  id: 'snake-burrow',
  name: 'Snake Burrow',
  description: 'Only usable while standing in acid. Burrow underground: invincible, +25% speed. Press again (or leave the acid) to surface.',
  displayKey: 'R',
  cooldown: 2000,
  cast(ctx: CastContext) { ctx.acidBurrow(); },
};

const festeringBite: Ability = {
  id: 'festering-bite',
  name: 'Festering Bite',
  description: 'Bite forward: Purge strips every buff they have, then 15 damage and 12 toxin. With more of the arena acidified the bite reaches further and hits harder — 30 at 24%, 45 at 50% — and the Purge lasts 3s, 8s, then 15s.',
  displayKey: 'F',
  cooldown: 6000,
  cast(ctx: CastContext) { ctx.acidBite(ctx.targetX, ctx.targetY); },
};

const acidApocalypse: Ability = {
  id: 'acid-apocalypse',
  name: 'Acid Apocalypse',
  description: 'Acid rain pours over all of your acid for 8s: 6 damage every half-second to every enemy standing in it.',
  displayKey: 'Q',
  isUltimate: true,
  cooldown: 25000,
  cast(ctx: CastContext) { ctx.acidApocalypse(); },
};

export const slimeElement: Element = {
  id: 'slime',
  name: 'Venom',
  color: 0x66cc44,
  emoji: '🐍',
  abilities: [poisonWhip, vileSpray, snakeBurrow, festeringBite, acidApocalypse],
};
