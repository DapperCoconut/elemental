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
  description: 'Place a plant at cursor position (lasts 10s)',
  displayKey: 'E',
  cooldown: 5000,
  cast(ctx) {
    ctx.spawnPlant(ctx.targetX, ctx.targetY);
  },
};

const grow: Ability = {
  id: 'grow',
  name: 'Grow',
  description: 'Heal 15 HP — healing aura erupts from all your plants',
  displayKey: 'R',
  cooldown: 8000,
  cast(ctx) {
    ctx.growPlants();
    ctx.healCaster(15);
  },
};

const thorns: Ability = {
  id: 'thorns',
  name: 'Thorns',
  description: 'All plants erupt with thorns, dealing 20 damage to nearby enemies',
  displayKey: 'F',
  cooldown: 3000,
  cast(ctx) {
    ctx.thornPlants();
  },
};

const thornDrag: Ability = {
  id: 'thorn-drag',
  name: 'Thorn Drag',
  description: 'Drag the enemy for 2s — they follow your cursor and take damage',
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
