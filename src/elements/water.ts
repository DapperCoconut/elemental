import { Element } from './Element';
import { Ability } from './Ability';
import { Projectile } from '../combat/Projectile';

const waterCut: Ability = {
  id: 'water-cut',
  name: 'Water Cut',
  description: 'Long-range water slash',
  displayKey: 'Click',
  cooldown: 250,
  cast(ctx) {
    const dx = ctx.targetX - ctx.casterX;
    const dy = ctx.targetY - ctx.casterY;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const speed = 620;
    const spawnDist = 32;
    const proj = new Projectile(
      ctx.scene,
      ctx.casterX + (dx / len) * spawnDist,
      ctx.casterY + (dy / len) * spawnDist,
      'proj-water',
      8,
      ctx.isPlayerCaster,
    );
    ctx.projectiles.add(proj);
    proj.launch((dx / len) * speed, (dy / len) * speed);
    proj.setRotation(Math.atan2(dy, dx));
  },
};

const splash: Ability = {
  id: 'splash',
  name: 'Splash',
  description: '2s: puddles at cursor slow + damage',
  displayKey: 'E',
  cooldown: 5000,
  cast(_ctx) {
    // ArenaScene detects this cast and sets splashActiveUntil = time + 2000
  },
};

const geyser: Ability = {
  id: 'geyser',
  name: 'Geyser',
  description: 'Speed boost zone at cursor for 5s',
  displayKey: 'R',
  cooldown: 12000,
  cast(ctx) {
    ctx.spawnGeyser(ctx.targetX, ctx.targetY);
  },
};

const pressureDagger: Ability = {
  id: 'pressure-dagger',
  name: 'Pressure Dagger',
  description: 'Hold to charge a piercing dagger (1s=1.5×, 2s=2×)',
  displayKey: 'F',
  cooldown: 4000,
  cast(ctx) {
    if (ctx.isPlayerCaster) return; // Player charges via WaterKit.handleInput
    // NPC: fire immediately at base damage (level 0, 16 dmg)
    const dx = ctx.targetX - ctx.casterX;
    const dy = ctx.targetY - ctx.casterY;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const speed = 700;
    const spawnDist = 32;
    const proj = new Projectile(
      ctx.scene,
      ctx.casterX + (dx / len) * spawnDist,
      ctx.casterY + (dy / len) * spawnDist,
      'proj-pressure-dagger',
      16,
      false,
    );
    ctx.projectiles.add(proj);
    proj.launch((dx / len) * speed, (dy / len) * speed);
    proj.setRotation(Math.atan2(dy, dx));
  },
};

const painRain: Ability = {
  id: 'pain-rain',
  name: 'Pain Rain',
  description: '200 raindrops fall across the arena',
  displayKey: 'Q',
  isUltimate: true,
  cooldown: 50000,
  cast(ctx) {
    ctx.spawnPainRain();
  },
};

export const waterElement: Element = {
  id: 'water',
  name: 'Water',
  color: 0x0088ff,
  emoji: '💧',
  abilities: [waterCut, splash, geyser, pressureDagger, painRain],
};
