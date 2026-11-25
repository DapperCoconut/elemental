import { Element } from './Element';
import { Ability, CastContext } from './Ability';

/**
 * Emotion — the element that replaced Conquest (2026-11-25) and kept its id, `conquest`, so every
 * save, recipe, court and campaign table that knows the old name still finds it.
 *
 * A commander with a pike and a flag, and an army that feels whatever he tells it to. He riles
 * knights up out of the floor and sends them where he likes by dragging them; he makes the enemy
 * cry; he whips his own soldiers into ecstasy by charging past them; and when the grand standard
 * comes out the whole army fights for it, then six more answer it once it is in the ground.
 *
 * Every `cast` here is a one-line delegate; the whole simulation lives in EmotionKit.
 */

const stab: Ability = {
  id: 'emotion-stab',
  name: 'Stab',
  description: 'Thrust your pike — a red flag with golden swords on it — 210px toward the cursor for 14 damage, through everything on the line. Click one of your soldiers and drag to move it or send it at an enemy.',
  displayKey: 'Click',
  cooldown: 600,
  cast(ctx: CastContext) { ctx.emotionStab(); },
};

const rile: Ability = {
  id: 'emotion-rile',
  name: 'Rile',
  description: 'Wave the flag. Three knights rise — red eyes, steel armour, swords, 30 HP each — and slash any enemy that comes near. Click and drag a soldier to move it, or drop it on an enemy to send it after them; soldiers standing together move as one squad.',
  displayKey: 'E',
  cooldown: 9400,
  cast(ctx: CastContext) { ctx.emotionRile(); },
};

const depress: Ability = {
  id: 'emotion-depress',
  name: 'Depress',
  description: 'Throw your cape forward: a 250px cone of cold for 8 damage. Enemies it catches are Depressed for 8s — crying, 25% slower, their shots give up early, and they take up to 50% more damage the healthier you are than them.',
  displayKey: 'R',
  cooldown: 10000,
  cast(ctx: CastContext) { ctx.emotionDepress(); },
};

const euphoria: Ability = {
  id: 'emotion-euphoria',
  name: 'Euphoria',
  description: 'Wind up for 1s, then charge 320px with the pike out: 38 damage to everything you go through. Your soldiers within 220px turn ecstatic for 4s — a yellow outline, +10 health over their maximum, and 80% faster feet and blades.',
  displayKey: 'F',
  cooldown: 9000,
  cast(ctx: CastContext) { ctx.emotionEuphoria(); },
};

const nationalism: Ability = {
  id: 'emotion-nationalism',
  name: 'Maximum Nationalism',
  description: 'Raise the grand standard for up to 10s: you cannot attack, but take 35% less damage and move 30% faster, and soldiers within 230px deal 50% more and take 35% less. Q again slams it down — 45 damage in 170px — and it stays, calling 3 knights, 2 archers and the Barbarian over 6s.',
  displayKey: 'Q',
  isUltimate: true,
  cooldown: 20000,
  cast(ctx: CastContext) { ctx.emotionNationalism(); },
};

export const conquestElement: Element = {
  id: 'conquest',
  name: 'Emotion',
  color: 0xc23a2e,
  emoji: '🚩',
  abilities: [stab, rile, depress, euphoria, nationalism],
};
