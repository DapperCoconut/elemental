import { Element } from './Element';
import { Ability } from './Ability';
import { Projectile } from '../combat/Projectile';

const SPREAD_ANGLES_DEG = [-15, 0, 15];

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

    for (const offsetDeg of SPREAD_ANGLES_DEG) {
      const angle = baseAngle + offsetDeg * (Math.PI / 180);
      const proj = new Projectile(
        ctx.scene,
        ctx.casterX + Math.cos(angle) * spawnDist,
        ctx.casterY + Math.sin(angle) * spawnDist,
        'proj-life',
        8,
        ctx.isPlayerCaster,
      );
      ctx.projectiles.add(proj);
      proj.launch(Math.cos(angle) * speed, Math.sin(angle) * speed);
    }
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
  },
};

export const lifeElement: Element = {
  id: 'life',
  name: 'Life',
  color: 0x44cc44,
  emoji: '🌿',
  abilities: [petalShotgun, plant, grow, thorns, thornDrag],
};
