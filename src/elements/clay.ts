import { Element } from './Element';
import { Ability, CastContext } from './Ability';

/**
 * Clay — the shaper. Two bodies on one set of keys: the fighter, and an immortal clay golem
 * that lives on the cursor and does the hitting. The rest of the kit is clay worked by hand —
 * a shield you draw, a smear that runs the walls, and a fused form that counts hits instead
 * of health.
 *
 * All five casts are handled in `kits/ClayKit.ts`; the `cast` here only routes.
 */

const slam: Ability = {
  id: 'clay-slam',
  name: 'Slam',
  description: 'The golem slams where it stands: 20 damage and a shove in a wide ring. Fused, you slam instead',
  displayKey: 'Click',
  cooldown: 1100,
  cast(ctx: CastContext) { ctx.claySlam(); },
};

const rupture: Ability = {
  id: 'clay-rupture',
  name: 'Rupture',
  description: 'The golem bursts into 8 piercing shards, 25 each, flung in every direction',
  displayKey: 'E',
  cooldown: 8000,
  cast(ctx: CastContext) { ctx.clayRupture(); },
};

const clot: Ability = {
  id: 'clay-clot',
  name: 'Clay Clot',
  description: 'Drag clay inside the blue circle for 3s. Your exact stroke orbits you and is worn away only where shots strike it',
  displayKey: 'R',
  cooldown: 12000,
  cast(ctx: CastContext) { ctx.clayClot(); },
};

const slink: Ability = {
  id: 'clay-slink',
  name: 'Slink',
  description: 'Launch to the nearest wall and race the rim. Click up to 3 times for an 8-shard barrage; press F again to drop off',
  displayKey: 'F',
  cooldown: 15000,
  cast(ctx: CastContext) { ctx.claySlink(ctx.targetX, ctx.targetY); },
};

const fuse: Ability = {
  id: 'clay-fuse',
  name: 'Fuse',
  description: 'Merge with your golem: fast, immune to effects, and 8 hits of any size to live. Q again splits — 6 shards per layer left',
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
