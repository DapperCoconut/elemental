import { Element } from './Element';
import { Ability, CastContext } from './Ability';

/**
 * Slime — a test element, reachable only from a cheat-mode save for now.
 *
 * The id is `gum` rather than `slime` because `slime` already belongs to Acid, which kept the old
 * name's slot when it was reworked. Everything the player ever sees says Slime.
 *
 * This is the only element in the game that cannot walk. There are no legs under the blob; there
 * is one enormous gummy arm, and every inch of ground the player covers is covered by throwing
 * that arm at the floor, gripping, and hauling the body in after it. That single decision is what
 * the whole kit is built around: the hand is the movement, the hand is the weapon, and the hand is
 * the inventory — so anything that occupies it (carrying a slimeball, carrying a person, or having
 * been shattered by the ultimate) is also a decision to stand still.
 *
 * The abilities all feed the hand rather than replacing it. Slime Surge leaves ammunition on the
 * floor that only the hand can pick up. Gumball turns a person into ammunition. Oozorbtion is the
 * one thing the body does on its own — it swells, eats a shot out of the air and digests it into
 * health. And Solidify is the drastic one: it throws the hand away as a wall of shards, freezing
 * the player where they stand for three seconds while everything sticky on the field goes glassy.
 *
 * Every `cast` below is a one-line delegate; the whole simulation lives in GumKit.
 */

const grab: Ability = {
  id: 'gum-grab',
  name: 'Grab',
  description: 'Hold to grip. On the floor or a wall it takes your weight — drag the mouse and the arm hauls you the other way, which is the only way you move. On a slimeball, a gummed enemy or an enemy shot it picks the thing up to be thrown. On an enemy it is a 20-damage punch instead, and simply whipping the hand over someone smacks them for 15.',
  displayKey: 'Click',
  cooldown: 420,
  cast(ctx: CastContext) { ctx.gumGrab(ctx.targetX, ctx.targetY); },
};

const surge: Ability = {
  id: 'gum-surge',
  name: 'Slime Surge',
  description: 'Spit three slimeballs onto the floor in front of you. They just sit there until the hand picks one up; released at the right moment it flies, and a hit is 30 damage and a 50% slow for 3 seconds. A ball that misses lands and can be used again.',
  displayKey: 'E',
  cooldown: 7000,
  cast(ctx: CastContext) { ctx.gumSurge(ctx.targetX, ctx.targetY); },
};

const gumball: Ability = {
  id: 'gum-gumball',
  name: 'Gumball',
  description: 'A barrage of bubble gum forward. Anyone hit takes 5 a bubble and is encased for 5 seconds — badly slowed, and now something the hand can pick up. Thrown into a wall an encased body takes 30 and stays stuck to it for 5 more seconds.',
  displayKey: 'R',
  cooldown: 9000,
  cast(ctx: CastContext) { ctx.gumGumball(ctx.targetX, ctx.targetY); },
};

const oozorbtion: Ability = {
  id: 'gum-oozorbtion',
  name: 'Oozorbtion',
  description: 'Swell by 20% and open up. The next attack that reaches you is swallowed whole instead of landing — it sits in your body for 3 seconds while it digests, then heals you for exactly what it would have done. The swelling goes as soon as something is caught.',
  displayKey: 'F',
  cooldown: 12000,
  cast(ctx: CastContext) { ctx.gumOozorbtion(); },
};

const solidify: Ability = {
  id: 'gum-solidify',
  name: 'Solidify',
  description: 'Every scrap of your slime on the field goes glassy at once. Your hand bursts into shards in all directions for 8 damage each and takes 3 seconds to grow back — you cannot move at all until it does. Your slimeballs harden to 45 damage and shatter on walls, anyone you have gummed is sealed for 5 seconds longer and bursts when they are thrown, and any slime puddles you have laid set into beacons: pick one up, shake it, and it emits an aura for as long as you shook it.',
  displayKey: 'Q',
  isUltimate: true,
  cooldown: 22000,
  cast(ctx: CastContext) { ctx.gumSolidify(); },
};

export const gumElement: Element = {
  id: 'gum',
  name: 'Slime',
  color: 0x46b93f,
  emoji: '🫠',
  abilities: [grab, surge, gumball, oozorbtion, solidify],
};
