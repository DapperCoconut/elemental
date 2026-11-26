import { Element } from './Element';
import { Ability, CastContext } from './Ability';

/**
 * Astra — a test element, reachable only from a cheat-mode save for now.
 *
 * A cracked shell of deep space with a dwarf star inside it, gathering a body of space dust round
 * itself. Mass is the whole kit: it makes Astra slow and huge and soaks most of every hit, it is
 * what Supernova throws and what Nuclear Fusion feeds — and a full bar of it collapses into the
 * Singularity, a black hole with five abilities of its own.
 *
 * Every `cast` below is a one-line delegate; the whole simulation lives in AstraKit.
 */

const antimatter: Ability = {
  id: 'astra-antimatter',
  name: 'Anti-Matter',
  description: 'Launch a blob of liquid-mercury antimatter. It passes through enemies without hurting them — but when it touches anything else physical (a shot, a summon, a held shield, a wall someone built) it annihilates in a 120px shockwave for 18 damage. The arena walls do not set it off. Every annihilation throws off 3 photons that chase your cursor for 8s and hit the first enemy they touch for 8; photons from several blasts stack, up to 15.',
  displayKey: 'Click',
  cooldown: 900,
  cast(ctx: CastContext) { ctx.astraAntimatter(ctx.targetX, ctx.targetY); },
};

const supernova: Ability = {
  id: 'astra-supernova',
  name: 'Supernova',
  description: 'Throw off a large chunk of your mass (up to 45) as a flaming shockwave round you. 12 damage plus 0.5 per point of mass thrown, and the more you throw the wider it reaches. Needs at least 10 mass.',
  displayKey: 'E',
  cooldown: 7000,
  cast(ctx: CastContext) { ctx.astraSupernova(); },
};

const fusion: Ability = {
  id: 'astra-fusion',
  name: 'Nuclear Fusion',
  description: 'For 3 seconds the inside of your hitbox is a furnace. Enemy projectiles that enter it are melted and add to your mass instead of taking from it, hits you soak feed the mass too, and enemies inside your hitbox burn for 6 every half second.',
  displayKey: 'R',
  cooldown: 12000,
  cast(ctx: CastContext) { ctx.astraFusion(); },
};

const comet: Ability = {
  id: 'astra-comet',
  name: 'Comet',
  description: 'A comet falls fast at your cursor for 14 damage and cracks the floor, and stays there. Cover it with your hitbox to catch it. Hold F to swing it round you faster and faster, and release to throw it along its orbit: 10 damage, up to 70 at full spin. Swung past halfway it catches fire, and a hot enough comet shatters on a wall or a body into 4 shards you can gather for mass.',
  displayKey: 'F',
  cooldown: 9000,
  cast(ctx: CastContext) { ctx.astraComet(ctx.targetX, ctx.targetY); },
};

const singularity: Ability = {
  id: 'astra-singularity',
  name: 'Singularity',
  description: 'Only at maximum mass. Become a black hole and take everyone in with you. Mass is gone and you are invincible, on a hovering throne, with new abilities. Click: a laser that cannot miss (hold 3s and release to end the world and kill them; press on an enemy to drag them). E: teleport behind them and punch them into the far wall. R: snap to swap health — or, snapped just before a hit, dodge it and fire three lasers. F: make them kneel for 2s. Q: let them go, healed to full — beat a bot after that for double rewards.',
  displayKey: 'Q',
  isUltimate: true,
  cooldown: 1000,
  cast(ctx: CastContext) { ctx.astraSingularity(); },
};

export const astraElement: Element = {
  id: 'astra',
  name: 'Astra',
  color: 0x6a4cff,
  emoji: '🌟',
  abilities: [antimatter, supernova, fusion, comet, singularity],
};
