import { Element } from './Element';
import { Ability, CastContext } from './Ability';

/**
 * Illusion — a test element, reachable only from a cheat-mode save for now.
 *
 * Every other element asks where the enemy is. Illusion asks where the enemy *thinks* things
 * are, and then spends its whole kit making that answer wrong: a bullet that pays out even
 * when it misses, a pane of space that bends whatever crosses it, two different ways of not
 * being where you were a moment ago, and a projectile the person it is aimed at cannot see.
 *
 * The consequence is an element with almost no sustained pressure and enormous positional
 * control — it wins by making the opponent's aim, not their health bar, the thing that runs out.
 *
 * Every `cast` here is a one-line delegate; the whole simulation lives in IllusionKit.
 */

const crackShot: Ability = {
  id: 'illusion-crack-shot',
  name: 'Crack Shot',
  description: 'A fast red bullet for 20. Miss and it splits against the wall, sending a crack at them for 10 — so it never comes back with nothing.',
  displayKey: 'Click',
  cooldown: 900,
  cast(ctx: CastContext) { ctx.illusionCrackShot(ctx.targetX, ctx.targetY); },
};

const veil: Ability = {
  id: 'illusion-veil',
  name: 'Illusion Veil',
  description: 'Hang a pane of warped space in front of you for 6s. Any shot that crosses it — theirs or yours — comes out 30° off, left or right.',
  displayKey: 'E',
  cooldown: 9000,
  cast(ctx: CastContext) { ctx.illusionVeil(ctx.targetX, ctx.targetY); },
};

const relocate: Ability = {
  id: 'illusion-relocate',
  name: 'Relocate',
  description: 'Be in a random corner of the arena instead. No wind-up, no travel, no warning.',
  displayKey: 'R',
  cooldown: 5000,
  cast(ctx: CastContext) { ctx.illusionRelocate(); },
};

const tesseract: Ability = {
  id: 'illusion-tesseract',
  name: 'Tesseract',
  description: 'Throw a 4D cube that only you can see. 20 damage, then it folds them into a square, star or rhombus for 8s — 30% bigger, and 30% easier to hit.',
  displayKey: 'F',
  cooldown: 12000,
  cast(ctx: CastContext) { ctx.illusionTesseract(ctx.targetX, ctx.targetY); },
};

const dance: Ability = {
  id: 'illusion-dance',
  name: 'Illusion Dance',
  description: 'For 20s you jump to a random corner every 3s and projectiles pass straight through you. Blasts, beams and everything else still land.',
  displayKey: 'Q',
  isUltimate: true,
  cooldown: 45000,
  cast(ctx: CastContext) { ctx.illusionDance(); },
};

export const illusionElement: Element = {
  id: 'illusion',
  name: 'Illusion',
  color: 0xb45cff,
  emoji: '🎭',
  abilities: [crackShot, veil, relocate, tesseract, dance],
};
