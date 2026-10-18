import { Element } from './Element';
import { Ability, CastContext } from './Ability';

/**
 * Illusion — a test element, reachable only from a cheat-mode save for now.
 *
 * Every other element asks where the enemy is. Illusion asks where the enemy *thinks* things
 * are, and then spends its whole kit making that answer wrong: a bullet that pays out even
 * when it misses, a pane of space that bends their shots and multiplies yours, two different ways of not
 * being where you were a moment ago, and a clone that draws the fire while you are not there at all.
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
  description: 'Hang a pane of warped space in front of you for 6s. Enemy shots that cross it come out 10° off, left or right. Your Crack Shots pass straight through — with five illusion bullets fanned around them. Illusions hurt nobody, but anything that hits one cracks it, sending a crack at the enemy for 10.',
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

const guise: Ability = {
  id: 'illusion-guise',
  name: 'Guise',
  description: 'For 3s you are 80% smaller, 35% faster and invisible, and a full-size clone follows your cursor — bots go after it automatically. It cannot die, but it remembers every hit, and when it fades 20% of that is dealt to the enemy. While it is out everything you throw is invisible too, Veils included.',
  displayKey: 'F',
  cooldown: 12000,
  cast(ctx: CastContext) { ctx.illusionGuise(ctx.targetX, ctx.targetY); },
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
  abilities: [crackShot, veil, relocate, guise, dance],
};
