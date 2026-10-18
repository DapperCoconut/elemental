import { Element } from './Element';
import { Ability, CastContext } from './Ability';
import { Projectile } from '../combat/Projectile';
import { FireFx, FIRE } from './kits/FireVisuals';

/** Effects painter bound to whoever is casting (so a skin recolours their fire). */
function fx(ctx: CastContext): FireFx {
  return new FireFx(ctx.scene, ctx.fireColor);
}

/** Blaze + Melt's damage bonus (1 for everyone else). */
function dmg(ctx: CastContext, base: number): number {
  return Math.round(base * (ctx.fireDamageMult?.() ?? 1));
}

/** Rotate the aim point about the caster by the Alcohol perk's drift, if any. */
function drunkAim(ctx: CastContext): { x: number; y: number } {
  const err = ctx.fireAimJitter?.() ?? 0;
  if (err === 0) return { x: ctx.targetX, y: ctx.targetY };
  const dx = ctx.targetX - ctx.casterX, dy = ctx.targetY - ctx.casterY;
  const c = Math.cos(err), s = Math.sin(err);
  return { x: ctx.casterX + dx * c - dy * s, y: ctx.casterY + dx * s + dy * c };
}

const fireball: Ability = {
  id: 'fireball',
  name: 'Fireball',
  description: 'Launch a fireball toward the cursor',
  displayKey: 'Click',
  cooldown: 500,
  cast(ctx) {
    // Melt: no fireball at all. The player's kit never asks for one; a bot's click becomes a
    // short gout from the flamethrower instead.
    if (ctx.hasPerk('fire-melt') && ctx.fireMeltPuff) {
      ctx.fireMeltPuff(ctx.targetX, ctx.targetY);
      return;
    }
    const aim = drunkAim(ctx);
    const dx = aim.x - ctx.casterX;
    const dy = aim.y - ctx.casterY;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    // Blaze: the hold-click is traded away for a faster, meaner fireball (its on-hit side lives
    // in FireKit.onFireballHit, keyed off this flag).
    const blaze = ctx.hasPerk('fire-blaze');
    const speed = blaze ? 760 : 520;
    const spawnDist = 32;
    const sx = ctx.casterX + (dx / len) * spawnDist;
    const sy = ctx.casterY + (dy / len) * spawnDist;
    const proj = new Projectile(ctx.scene, sx, sy, 'proj-fire', 20, ctx.isPlayerCaster);
    if (blaze) (proj as Projectile & { fireBlaze?: boolean }).fireBlaze = true;
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

    if (ctx.hasPerk('fire-alcohol') && ctx.fireBoozeTrail) {
      // Alcohol: the launch burst is a splash of spirits, and the path behind is soaked.
      ctx.fireBoozeTrail(dashOriginX, dashOriginY, dashOriginX + nx * 180, dashOriginY + ny * 180);
    } else {
      ctx.dealAoeDamage(dashOriginX, dashOriginY, 90, dmg(ctx, 18));
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
  description: 'Plant a charge at the cursor — it blows 1.5s later',
  displayKey: 'R',
  cooldown: 3000,
  cast(ctx) {
    const damage = dmg(ctx, 32);
    const aim = drunkAim(ctx);
    if (ctx.fireLobPressureBomb) {
      // FireKit owns the fuse: it marks the ground red, then blows the charge (Ash's bigger,
      // self-harming blast is applied there too).
      ctx.fireLobPressureBomb(aim.x, aim.y, damage);
    } else {
      // No kit on this context (raids) — the charge goes off the moment it lands.
      ctx.dealAoeDamage(aim.x, aim.y, 100, damage);
      fx(ctx).explosion(aim.x, aim.y, 100);
      ctx.scene.cameras.main.shake(140, 0.004);
    }
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
      ctx.dealFlameNukeDamage(cx, cy, 220, dmg(ctx, 80));
      // Alcohol: the blast lights any booze it washes over.
      ctx.fireIgniteBooze?.(cx, cy, 220);

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

/**
 * Supernova — fire's alternate ultimate (swapped in for Flame Nuke through ALT_ULT_SLOT). The
 * cast only opens the beam; FireKit runs it every frame from there: the slow turn toward the
 * aim, the damage ticks, the heat bar and its self-burn, Q-to-stop, and the 6s detonation.
 */
export const supernova: Ability = {
  id: 'supernova',
  name: 'Supernova',
  description: 'Rooted beam of fire that turns slowly — Q again to stop; 6s detonates',
  displayKey: 'Q',
  isUltimate: true,
  cooldown: 30000,
  cast(ctx) {
    ctx.fireSupernova?.();
  },
};

export const fireElement: Element = {
  id: 'fire',
  name: 'Fire',
  color: 0xff4400,
  emoji: '🔥',
  abilities: [fireball, flameDash, pressureBomb, flameBody, flameNuke],
};
