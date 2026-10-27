import { Element } from './Element';
import { Ability, CastContext } from './Ability';

/**
 * Cloth — a tailor whose one long arm is their scarf.
 *
 * The tailor does not walk. The scarf is wound round their crown and paid out to a stitched cloth
 * hand, and every inch of ground they cover is covered by gripping the floor or a wall with that
 * hand and dragging the mouse, so the scarf hauls the body the other way. The same hand punches,
 * catches shots out of the air, and carries everything else the kit puts on the field: needles
 * that drop out of the sky, and anybody the bola has tied up.
 *
 * The pincushion is the one thing it does not carry. Punch it and it fires a ring of pins; walk
 * into it and the pins go into you instead — and the next three hits you take each throw pins
 * back out at whoever landed them. Burning Man sets the whole kit on fire for six seconds.
 *
 * Every `cast` below is a one-line delegate; the whole simulation lives in ClothKit.
 */

const scarfHand: Ability = {
  id: 'cloth-scarf-hand',
  name: 'Scarf Hand',
  description: 'Hold to grip with the hand on the end of your scarf. On the floor or a wall it takes your weight — drag the mouse and the scarf hauls you the other way, which is the only way you move. On a needle, a bound enemy or an enemy shot it picks the thing up to be thrown. On an enemy it is a 20-damage punch, on your pincushion it sets the cushion off, and simply whipping the hand over someone smacks them for 14.',
  displayKey: 'Click',
  cooldown: 420,
  cast(ctx: CastContext) { ctx.clothGrab(ctx.targetX, ctx.targetY); },
};

const needleNexus: Ability = {
  id: 'cloth-needle-nexus',
  name: 'Needle Nexus',
  description: 'Three giant needles drop out of the sky in front of you and stick in the floor — anybody standing where one lands is stabbed for 8. The scarf hand pulls them out and throws them: a hit is 26. A needle that hits a wall sticks in it, and can be pulled out and thrown again.',
  displayKey: 'E',
  cooldown: 7000,
  cast(ctx: CastContext) { ctx.clothNeedles(ctx.targetX, ctx.targetY); },
};

const constrainingCloth: Ability = {
  id: 'cloth-constraining-cloth',
  name: 'Constraining Cloth',
  description: 'Throw a bola straight ahead. Whoever it catches takes 10 and is bound in cloth for 5 seconds — badly slowed, and now something your scarf hand can pick up. Thrown into a wall, a bound body takes 30 and is pinned there for 2.5 seconds.',
  displayKey: 'R',
  cooldown: 9000,
  cast(ctx: CastContext) { ctx.clothBola(ctx.targetX, ctx.targetY); },
};

const pincushion: Ability = {
  id: 'cloth-pincushion',
  name: 'Pincushion',
  description: 'Set a pincushion down with six pins in it. Punch it with the scarf hand and it fires 14 pins in every direction for 7 each, losing one pin. Walk into it yourself and three pins go into you instead, taking one from the cushion: while you are pinned, each of the next three hits you take throws a ring of pins out of you and stabs whoever landed it for 12.',
  displayKey: 'F',
  cooldown: 10000,
  cast(ctx: CastContext) { ctx.clothCushion(ctx.targetX, ctx.targetY); },
};

const burningMan: Ability = {
  id: 'cloth-burning-man',
  name: 'Burning Man',
  description: 'Your clothes catch fire for 6 seconds. The scarf burns, shedding scraps of burning cloth that hit for 6 and set people alight. Needles go red-hot for 50% more damage and ignite what they hit, anybody bound in your cloth burns, and your pincushion catches — it spits bursts of pins on its own until it is empty, and then it is gone.',
  displayKey: 'Q',
  isUltimate: true,
  cooldown: 22000,
  cast(ctx: CastContext) { ctx.clothBurningMan(); },
};

export const clothElement: Element = {
  id: 'cloth',
  name: 'Cloth',
  color: 0xd1435c,
  emoji: '🧣',
  abilities: [scarfHand, needleNexus, constrainingCloth, pincushion, burningMan],
};
