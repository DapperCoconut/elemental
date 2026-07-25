import { Element } from './Element';
import { Ability, CastContext } from './Ability';
import { Projectile } from '../combat/Projectile';
import { FireFx, FIRE } from './kits/FireVisuals';

/** Effects painter bound to whoever is casting (so the Burnt cosmetic recolours their fire). */
function fx(ctx: CastContext): FireFx {
  return new FireFx(ctx.scene, ctx.fireColor);
}

const fireball: Ability = {
  id: 'fireball',
  name: 'Fireball',
  description: 'Launch a fireball toward the cursor',
  displayKey: 'Click',
  cooldown: 500,
  cast(ctx) {
    const dx = ctx.targetX - ctx.casterX;
    const dy = ctx.targetY - ctx.casterY;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const speed = 520;
    const spawnDist = 32;
    const sx = ctx.casterX + (dx / len) * spawnDist;
    const sy = ctx.casterY + (dy / len) * spawnDist;
    const proj = new Projectile(ctx.scene, sx, sy, 'proj-fire', 20, ctx.isPlayerCaster);
    ctx.projectiles.add(proj);
    proj.launch((dx / len) * speed, (dy / len) * speed);

    fx(ctx).muzzleFlash(sx, sy, Math.atan2(dy, dx));
  },
};

const flameDash: Ability = {
  id: 'flame-dash',
  name: 'Flame Dash',
  description: 'Dash toward the cursor, dealing AoE fire damage',
  displayKey: 'E',
  cooldown: 1500,
  cast(ctx) {
    const dx = ctx.targetX - ctx.casterX;
    const dy = ctx.targetY - ctx.casterY;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const nx = dx / len, ny = dy / len;
    const dashOriginX = ctx.casterX;
    const dashOriginY = ctx.casterY;
    ctx.dashCaster(nx * 640, ny * 640);

    const f = fx(ctx);
    // Comet tail laid down along the path the dash carries the caster through.
    f.dashTrail(dashOriginX, dashOriginY, dashOriginX + nx * 180, dashOriginY + ny * 180);

    if (!ctx.hasPerk('alcohol')) {
      ctx.dealAoeDamage(dashOriginX, dashOriginY, 90, 18);
      // Launch burst: a flower of flame kicked out of the spot you left.
      f.bloom(dashOriginX, dashOriginY, 88, 12);
      f.scorch(dashOriginX, dashOriginY, 46);
      f.embers(dashOriginX, dashOriginY, 12, { speed: 190, size: 3.4, life: 560 });
    }
  },
};

const pressureBomb: Ability = {
  id: 'pressure-bomb',
  name: 'Pressure Bomb',
  description: 'Detonate an AoE explosion at the cursor',
  displayKey: 'R',
  cooldown: 3000,
  cast(ctx) {
    ctx.dealAoeDamage(ctx.targetX, ctx.targetY, 100, 32);
    fx(ctx).explosion(ctx.targetX, ctx.targetY, 100);
    ctx.scene.cameras.main.shake(140, 0.004);
  },
};

const flameBody: Ability = {
  id: 'flame-body',
  name: 'Flame Body',
  description: 'Toggle: 2× speed, take damage over time',
  displayKey: 'F',
  cooldown: 0,
  cast(ctx) {
    // ArenaScene handles the toggle tracking; the cast either enables or disables.
    // The enabler path calls setCasterSpeedMultiplier(2), the disabler path calls (1).
    // Actual toggle routing is in ArenaScene; this cast is never called directly —
    // the scene calls flamebody_on / flamebody_off based on flameBodyActive state.
    // So this is a no-op placeholder; real logic lives in ArenaScene.
    void ctx;
  },
};

const flameNuke: Ability = {
  id: 'flame-nuke',
  name: 'Flame Nuke',
  description: 'Channel 2s, then massive explosion',
  displayKey: 'Q',
  isUltimate: true,
  cooldown: 30000,
  cast(ctx) {
    ctx.lockCaster(2000);
    const f = fx(ctx);
    const cx = ctx.casterX, cy = ctx.casterY;

    // 2s gather: fire spirals inward while a containment ring squeezes down on the core.
    f.channelCharge(cx, cy, 200, 2000);

    ctx.scene.time.delayedCall(2000, () => {
      ctx.dealFlameNukeDamage(cx, cy, 220, 80);

      // Detonation: a wall of fire, a column punching skyward, and a long shrapnel tail.
      f.explosion(cx, cy, 220, { shards: 34, smoke: 10, duration: 720 });
      f.firePillar(cx, cy, 60, 210);
      f.ring(cx, cy, 40, 300, FIRE.white, 500, 8, 8);
      ctx.scene.time.delayedCall(120, () => f.bloom(cx, cy, 210, 16));
      ctx.scene.time.delayedCall(260, () => f.embers(cx, cy, 22, { speed: 420, size: 4.5, life: 900, rise: 90 }));
      ctx.scene.cameras.main.shake(420, 0.012);
      ctx.scene.cameras.main.flash(160, 255, 190, 120);
    });
  },
};

export const fireElement: Element = {
  id: 'fire',
  name: 'Fire',
  color: 0xff4400,
  emoji: '🔥',
  abilities: [fireball, flameDash, pressureBomb, flameBody, flameNuke],
};
