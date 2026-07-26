import { Element } from './Element';
import { Ability, CastContext } from './Ability';
import { Projectile } from '../combat/Projectile';
import { WaterFx, WATER } from './kits/WaterVisuals';

/** Effects painter bound to whoever is casting (so a skin recolours their water). */
function fx(ctx: CastContext): WaterFx {
  return new WaterFx(ctx.scene, ctx.waterColor);
}

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
    const sx = ctx.casterX + (dx / len) * spawnDist;
    const sy = ctx.casterY + (dy / len) * spawnDist;
    const proj = new Projectile(ctx.scene, sx, sy, 'proj-water', 8, ctx.isPlayerCaster);
    ctx.projectiles.add(proj);
    proj.launch((dx / len) * speed, (dy / len) * speed);
    proj.setRotation(Math.atan2(dy, dx));

    fx(ctx).muzzleSpray(sx, sy, Math.atan2(dy, dx), 0.85);
  },
};

const splash: Ability = {
  id: 'splash',
  name: 'Splash',
  description: '2s: puddles at cursor slow + damage',
  displayKey: 'E',
  cooldown: 5000,
  cast(_ctx) {
    // WaterKit opens the 2s downpour window and rains the pools down; the NPC path is
    // opened by WaterKit.handleNpcCastId off the returned cast id.
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

    // The spring breaking through: a column punches up, the ground floods, ripples run out.
    const f = fx(ctx);
    f.waterSpout(ctx.targetX, ctx.targetY, 16, 96, 5);
    f.crown(ctx.targetX, ctx.targetY, 62, 12, 4);
    f.ring(ctx.targetX, ctx.targetY, 10, 96, WATER.pale, 460, 5, 4);
    f.spray(ctx.targetX, ctx.targetY, 14, { speed: 210, size: 3.2, life: 620, fall: 90, depth: 5 });
    f.mist(ctx.targetX, ctx.targetY, 3, 44, 3);
    ctx.scene.cameras.main.shake(150, 0.004);
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
    const sx = ctx.casterX + (dx / len) * spawnDist;
    const sy = ctx.casterY + (dy / len) * spawnDist;
    const proj = new Projectile(ctx.scene, sx, sy, 'proj-pressure-dagger', 16, false);
    ctx.projectiles.add(proj);
    proj.launch((dx / len) * speed, (dy / len) * speed);
    proj.setRotation(Math.atan2(dy, dx));

    const angle = Math.atan2(dy, dx);
    const f = fx(ctx);
    f.muzzleSpray(sx, sy, angle, 1.1);
    f.spray(sx, sy, 5, { angle: angle + Math.PI, spread: 0.9, speed: 130, size: 2.6, life: 420, fall: 46, depth: 6 });
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

    // The caster hauls the whole storm up before it comes down: a spout out of the ground,
    // a ring of water thrown outward, and mist rolling off — so the ultimate has a source.
    const f = fx(ctx);
    f.waterSpout(ctx.casterX, ctx.casterY, 26, 150, 6);
    f.crown(ctx.casterX, ctx.casterY, 130, 18, 5);
    f.ring(ctx.casterX, ctx.casterY, 24, 300, WATER.pale, 620, 7, 5);
    ctx.scene.time.delayedCall(140, () => f.ring(ctx.casterX, ctx.casterY, 20, 380, WATER.cyan, 700, 5, 5));
    f.mist(ctx.casterX, ctx.casterY, 8, 120, 4);
    ctx.scene.cameras.main.shake(320, 0.007);
  },
};

export const waterElement: Element = {
  id: 'water',
  name: 'Water',
  color: 0x0088ff,
  emoji: '💧',
  abilities: [waterCut, splash, geyser, pressureDagger, painRain],
};
