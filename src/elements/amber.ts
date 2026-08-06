import { Element } from './Element';
import { Ability, CastContext } from './Ability';

/**
 * Amber — a test element, reachable only from a cheat-mode save for now.
 *
 * A caveman with lumps of fossil resin growing out of him, and everything trapped inside that
 * resin is still alive. Four of his five abilities are animals, and none of them are his: the
 * mosquitoes go and get blood and bring it back, the raptors come for meat and leave when it is
 * gone, the triceratops runs through the arena because something startled it, and the tyrannosaur
 * turns up at the end and is not interested in taking orders.
 *
 * The sling is the only thing in the kit that is his own arm. It is also the only thing that
 * rewards patience — hold the button and physically swing the mouse in circles and it winds up
 * from a fifteen-damage pebble to a forty-damage rock, and it hurts anything that walks into it
 * on the way round.
 *
 * Every `cast` below is a one-line delegate; the whole simulation lives in AmberKit.
 */

const sling: Ability = {
  id: 'amber-sling',
  name: 'Sling',
  description: 'Tap to whip an amber rock at your cursor for 15 damage. Hold instead and the sling starts spinning — keep circling your mouse around yourself and it winds up over about 3 seconds to a 40-damage boulder, and the stone itself hits anything it passes through for 10. Swing it as long as you like.',
  displayKey: 'Click',
  cooldown: 420,
  cast(ctx: CastContext) { ctx.amberSling(ctx.targetX, ctx.targetY); },
};

const mosquitoDrones: Ability = {
  id: 'amber-mosquitoes',
  name: 'Mosquito Drones',
  description: 'Loose 3 mosquitoes with 20 HP each. They hunt the nearest enemy, lunge, and bury themselves for 3 seconds at 5 damage a second — three to a body at most — then fly home full of blood, heal you 15 and go back for more. Kill one while it is loaded and the blood drops as a puddle that heals 15 to whoever steps in it first.',
  displayKey: 'E',
  cooldown: 12000,
  cast(ctx: CastContext) { ctx.amberMosquitoes(); },
};

const beginTheHunt: Ability = {
  id: 'amber-hunt',
  name: 'Begin the Hunt',
  description: 'Throw a shank of meat at your cursor. Three seconds after it lands a pack of velociraptors falls on it, tearing out 35 damage over 3 seconds to everything at the carcass. Land the shank on an enemy who is standing perfectly still and it sticks to them — and then the pack follows them wherever they go.',
  displayKey: 'R',
  cooldown: 8000,
  cast(ctx: CastContext) { ctx.amberBeginHunt(ctx.targetX, ctx.targetY); },
};

const stampede: Ability = {
  id: 'amber-stampede',
  name: 'Stampede',
  description: 'Mark the lane you are standing in. Two seconds of dust, rumbling and shaking later a triceratops comes through it left to right, taking a quarter of the arena with it and dealing 50 damage to anything it hits. The lane is locked in when you cast, not when it arrives — so run.',
  displayKey: 'F',
  cooldown: 10000,
  cast(ctx: CastContext) { ctx.amberStampede(); },
};

const endTheHunt: Ability = {
  id: 'amber-trex',
  name: 'End the Hunt',
  description: 'A tyrannosaur arrives and stays for 12 seconds. It claws at whoever is closest, bites when it gets the chance, and every so often takes somebody in its jaws, carries them to a wall and throws them into it for heavy damage and a stun. Nothing else dares show up while it is here.',
  displayKey: 'Q',
  isUltimate: true,
  cooldown: 34000,
  cast(ctx: CastContext) { ctx.amberEndHunt(ctx.targetX, ctx.targetY); },
};

export const amberElement: Element = {
  id: 'amber',
  name: 'Amber',
  color: 0xd98b1f,
  emoji: '🟠',
  abilities: [sling, mosquitoDrones, beginTheHunt, stampede, endTheHunt],
};
