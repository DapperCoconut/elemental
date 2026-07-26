import { Element } from './Element';
import { Ability, CastContext } from './Ability';
import { Projectile } from '../combat/Projectile';
import { LifeFx, LIFE } from './kits/LifeVisuals';

const SPREAD_ANGLES_DEG = [-15, 0, 15];

/** Effects painter bound to whoever is casting (so a skin recolours their flora). */
function fx(ctx: CastContext): LifeFx {
  return new LifeFx(ctx.scene, ctx.lifeColor);
}

const petalShotgun: Ability = {
  id: 'petal-shotgun',
  name: 'Petal Shotgun',
  description: 'Fire three petals in a spread',
  displayKey: 'Click',
  cooldown: 500,
  cast(ctx) {
    const dx = ctx.targetX - ctx.casterX;
    const dy = ctx.targetY - ctx.casterY;
    const baseAngle = Math.atan2(dy, dx);
    const speed = 480;
    const spawnDist = 32;
    const f = fx(ctx);

    for (const offsetDeg of SPREAD_ANGLES_DEG) {
      const angle = baseAngle + offsetDeg * (Math.PI / 180);
      const sx = ctx.casterX + Math.cos(angle) * spawnDist;
      const sy = ctx.casterY + Math.sin(angle) * spawnDist;
      const proj = new Projectile(ctx.scene, sx, sy, 'proj-life', 8, ctx.isPlayerCaster);
      ctx.projectiles.add(proj);
      proj.launch(Math.cos(angle) * speed, Math.sin(angle) * speed);
      // One blade per pellet, so the spread is visible as three separate throws.
      f.petalMuzzle(sx, sy, angle, 0.8);
    }
    // Leaf litter shaken loose behind the caster by the throw.
    f.petalShards(ctx.casterX, ctx.casterY, 3, 90, 340, 5);
  },
};

const plant: Ability = {
  id: 'plant',
  name: 'Plant',
  description: 'Place your selected seed at the cursor (max 5). Pick seeds from the bar up top.',
  displayKey: 'E',
  cooldown: 5000,
  cast(ctx) {
    ctx.spawnPlant(ctx.targetX, ctx.targetY);
  },
};

const grow: Ability = {
  id: 'grow',
  name: 'Fertilize',
  description: 'Yellow AOE — plants hit heal 50% and gain a 5s power boost',
  displayKey: 'R',
  cooldown: 8000,
  cast(ctx) {
    ctx.growPlants();
  },
};

const thorns: Ability = {
  id: 'thorns',
  name: 'Root Shield',
  description: 'The cursored plant takes no damage for 3s, then heals to full',
  displayKey: 'F',
  cooldown: 8000,
  cast(ctx) {
    ctx.thornPlants();
  },
};

const thornDrag: Ability = {
  id: 'thorn-drag',
  name: 'Thrive!',
  description: 'For 5s your incoming damage is split evenly across your plants instead',
  displayKey: 'Q',
  isUltimate: true,
  cooldown: 30000,
  cast(ctx) {
    ctx.startThornDrag();

    // The caster roots into the ground and the whole grove answers: a trunk of growth
    // punching up out of them, a bloom thrown outward, and pollen rolling off the front.
    const f = fx(ctx);
    f.canopy(ctx.casterX, ctx.casterY, 24, 140, 6);
    f.bloomBurst(ctx.casterX, ctx.casterY, 120, 18, 5);
    f.ring(ctx.casterX, ctx.casterY, 22, 280, LIFE.pale, 620, 6, 5);
    ctx.scene.time.delayedCall(140, () => f.ring(ctx.casterX, ctx.casterY, 18, 350, LIFE.lime, 700, 4, 5));
    f.spores(ctx.casterX, ctx.casterY, 7, 110, 4);
    ctx.scene.cameras.main.shake(300, 0.006);
  },
};

export const lifeElement: Element = {
  id: 'life',
  name: 'Life',
  color: 0x44cc44,
  emoji: '🌿',
  abilities: [petalShotgun, plant, grow, thorns, thornDrag],
};
