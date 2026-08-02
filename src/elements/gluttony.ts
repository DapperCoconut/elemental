import { Element } from './Element';
import { Ability, CastContext } from './Ability';

/**
 * Gluttony — a test element, reachable only from a cheat-mode save for now.
 *
 * A chef in pristine whites with a knife held out in front of him, a grill burning in the middle
 * of the arena, and a prep strip along the top of the screen. Almost nothing in the kit does
 * damage on its own: Forage puts a raw ingredient in the strip, the click throws it onto the
 * grill, the grill cooks it into something worth twice as much, and eating it is a right-click.
 * The knife is the only weapon, and holding it over the coals for two seconds is what turns it
 * from a 25 into a 35.
 *
 * Then there is the other half. Special Ingredient replaces every one of those five keys, drops
 * the toque, puts blood on the whites and moves the knife behind his back. In butcher form damage
 * does not touch your health at all — it comes off a thirty-second hunger bar, and the only way
 * to put time back on it is to eat, which means the food you spent the first half of the fight
 * cooking is the only thing keeping you in the second half. The grill becomes a maw with teeth
 * while it lasts.
 *
 * Every `cast` below is a one-line delegate; the whole simulation lives in GluttonyKit.
 */

// ── Chef form ────────────────────────────────────────────────────────────────

const kitchenKnife: Ability = {
  id: 'glut-knife',
  name: 'Kitchen Knife',
  description: 'Throw the knife you are holding for 25 damage. Stand over the grill for 2 seconds first and it comes off the coals at 35 — and 50% more than that against anything Charcoal Chuck has burnt. Holding an ingredient instead throws the ingredient: land it on the grill and it starts cooking, miss and it lands on the floor for you to pick back up. Right-click eats whatever is in your hand.',
  displayKey: 'Click',
  cooldown: 1250,
  cast(ctx: CastContext) { ctx.gluttonyKnife(ctx.targetX, ctx.targetY); },
};

const forage: Ability = {
  id: 'glut-forage',
  name: 'Forage',
  description: 'Crouch and dig for 2 seconds at half speed, then come up with a mushroom, a carrot or a potato. Raw they heal 15, 10 and 20; off the grill they heal 30, 20 and 40. The strip at the top of the screen holds six, and clicking any of them puts it in your hand.',
  displayKey: 'E',
  cooldown: 6000,
  cast(ctx: CastContext) { ctx.gluttonyForage(); },
};

const charcoalChuck: Ability = {
  id: 'glut-charcoal',
  name: 'Charcoal Chuck',
  description: 'Hurl a briquette of charcoal. On a body it is 15 damage and Burnt for 8 seconds — burnt targets take 50% more from a heated knife. On the grill it is fuel: superheated for 6 seconds, which cooks everything on the grate twice as fast and heats your blade twice as fast with it.',
  displayKey: 'R',
  cooldown: 12000,
  cast(ctx: CastContext) { ctx.gluttonyCharcoal(ctx.targetX, ctx.targetY); },
};

const specialIngredient: Ability = {
  id: 'glut-butcher',
  name: 'Special Ingredient',
  description: 'Thirty seconds as the butcher. All five keys are replaced, the grill becomes a maw that spits meat at whoever you are fighting, and damage stops touching your health entirely — it comes off the hunger bar instead. Eating in this form still heals you and puts time back on the bar: 3s a carrot, 5s a mushroom, 8s a potato, 15s a cut of meat.',
  displayKey: 'F',
  cooldown: 45000,
  cast(ctx: CastContext) { ctx.gluttonyButcher(); },
};

const feast: Ability = {
  id: 'glut-feast',
  name: 'Feast!',
  description: 'Everything in the strip goes into a pot. Three seconds of swirling later it heals you — and any ally — for double what all of it was worth eaten one at a time. The pot does not care whether the ingredients were cooked, but it pays double on what they were worth, so a grill you have kept busy is worth a great deal more than one you have not.',
  displayKey: 'Q',
  isUltimate: true,
  cooldown: 30000,
  cast(ctx: CastContext) { ctx.gluttonyFeast(); },
};

// ── Butcher form ─────────────────────────────────────────────────────────────

const cleave: Ability = {
  id: 'glut-cleave',
  name: 'Cleave',
  description: 'Bring the knife round in front of you for 30 damage at melee range. No throw, no travel time, nothing to dodge except the man holding it.',
  displayKey: 'Click',
  cooldown: 1250,
  cast(ctx: CastContext) { ctx.gluttonyCleave(ctx.targetX, ctx.targetY); },
};

const poach: Ability = {
  id: 'glut-poach',
  name: 'Poach',
  description: 'Launch a cooking skewer. It deals 15 damage to the first body it passes through, takes a cut of meat out of them on the way past, and carries it to the wall. Walk over the skewer to pull the meat off it — 15 seconds on the grill turns 20 HP of it into 50, and 15 seconds of butcher form into more.',
  displayKey: 'E',
  cooldown: 8000,
  cast(ctx: CastContext) { ctx.gluttonyPoach(ctx.targetX, ctx.targetY); },
};

const cannibalize: Ability = {
  id: 'glut-cannibalize',
  name: 'Cannibalize',
  description: 'A short lunge and a bite. Connecting heals 15 of your real health, buys 3 more seconds of butcher form, and works the maw into a frenzy — 10 damage a shot instead of 5, for 6 seconds.',
  displayKey: 'R',
  cooldown: 9000,
  cast(ctx: CastContext) { ctx.gluttonyCannibalize(ctx.targetX, ctx.targetY); },
};

const returnToKitchen: Ability = {
  id: 'glut-return',
  name: 'Return',
  description: 'Put the hat back on. The whites are ruined but the knife comes back out front, the maw goes back to being a grill, and whatever is left on the hunger bar is banked against the next time you need it.',
  displayKey: 'F',
  cooldown: 1200,
  cast(ctx: CastContext) { ctx.gluttonyReturn(); },
};

const mawAwakening: Ability = {
  id: 'glut-maw',
  name: 'Maw Awakening',
  description: 'Feed the maw everything you own and let it off the floor. It hunts on its own, whips anything within reach for 15 and fires barrages of meat for 6 a shot. Three seconds base, plus 1 a carrot, 3 a mushroom, 5 a potato and 10 a cut of meat — so the ultimate is worth exactly as much as the larder you spent the fight building.',
  displayKey: 'Q',
  isUltimate: true,
  cooldown: 40000,
  cast(ctx: CastContext) { ctx.gluttonyMawAwakening(); },
};

export const gluttonyElement: Element = {
  id: 'gluttony',
  name: 'Gluttony',
  color: 0xd8452f,
  emoji: '🍖',
  abilities: [
    kitchenKnife, forage, charcoalChuck, specialIngredient, feast,
    cleave, poach, cannibalize, returnToKitchen, mawAwakening,
  ],
};
