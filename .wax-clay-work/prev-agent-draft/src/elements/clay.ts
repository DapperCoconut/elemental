import { Element } from './Element';
import { Ability, CastContext } from './Ability';

const slam: Ability = {
  id: 'clay-slam',
  name: 'Slam',
  description: 'Your clay golem slams where it stands, dealing 20 damage in a large area. In fused form, you perform the slam yourself.',
  displayKey: 'Click',
  cooldown: 1100,
  cast(ctx: CastContext) { ctx.claySlam(); },
};

const rupture: Ability = {
  id: 'clay-rupture',
  name: 'Rupture',
  description: 'The golem erupts into 8 equally-spaced piercing shards. Each shard deals 25 damage, and one enemy may be struck by several.',
  displayKey: 'E',
  cooldown: 8000,
  cast(ctx: CastContext) { ctx.clayRupture(); },
};

const clot: Ability = {
  id: 'clay-clot',
  name: 'Clay Clot',
  description: 'For up to 3 seconds, drag clay inside the blue circle. Your exact drawing then orbits you and is worn away wherever projectiles strike it.',
  displayKey: 'R',
  cooldown: 12000,
  cast(ctx: CastContext) { ctx.clayClot(); },
};

const slink: Ability = {
  id: 'clay-slink',
  name: 'Slink',
  description: 'Launch to the nearest wall and race around the arena edge. Click up to 3 times to fire an 8-shard barrage; recast to leave the wall.',
  displayKey: 'F',
  cooldown: 15000,
  cast(ctx: CastContext) { ctx.claySlink(ctx.targetX, ctx.targetY); },
};

const fuse: Ability = {
  id: 'clay-fuse',
  name: 'Fuse',
  description: 'Fuse with your golem into a fast clay creature that ignores effects and survives 8 hits. Your abilities transform until you press Q to split apart.',
  displayKey: 'Q',
  isUltimate: true,
  cooldown: 48000,
  cast(ctx: CastContext) { ctx.clayFuse(); },
};

export const clayElement: Element = {
  id: 'clay',
  name: 'Clay',
  color: 0x9a5c32,
  emoji: '🏺',
  abilities: [slam, rupture, clot, slink, fuse],
};
