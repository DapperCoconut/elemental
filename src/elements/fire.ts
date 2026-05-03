import { Element } from './Element';
import { Ability } from './Ability';
import { Projectile } from '../combat/Projectile';

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
    const proj = new Projectile(
      ctx.scene,
      ctx.casterX + (dx / len) * spawnDist,
      ctx.casterY + (dy / len) * spawnDist,
      'proj-fire',
      20,
      ctx.isPlayerCaster,
    );
    ctx.projectiles.add(proj);
    proj.launch((dx / len) * speed, (dy / len) * speed);
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
    const dashOriginX = ctx.casterX;
    const dashOriginY = ctx.casterY;
    ctx.dashCaster((dx / len) * 640, (dy / len) * 640);
    if (!ctx.hasPerk('alcohol')) {
      ctx.dealAoeDamage(dashOriginX, dashOriginY, 90, 18);
      const ring = ctx.scene.add.circle(dashOriginX, dashOriginY, 10, 0xff4400, 0.65);
      ctx.scene.tweens.add({
        targets: ring,
        scaleX: 9,
        scaleY: 9,
        alpha: 0,
        duration: 400,
        onComplete: () => ring.destroy(),
      });
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

    // Explosion visual at cursor
    const ring = ctx.scene.add.circle(ctx.targetX, ctx.targetY, 10, 0xff8800, 0.9);
    ctx.scene.tweens.add({
      targets: ring,
      scaleX: 10,
      scaleY: 10,
      alpha: 0,
      duration: 350,
      onComplete: () => ring.destroy(),
    });
    const core = ctx.scene.add.circle(ctx.targetX, ctx.targetY, 6, 0xffffff, 0.95);
    ctx.scene.tweens.add({
      targets: core,
      scaleX: 4,
      scaleY: 4,
      alpha: 0,
      duration: 180,
      onComplete: () => core.destroy(),
    });
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

    // Charge ring growing over 2s
    const charge = ctx.scene.add.circle(ctx.casterX, ctx.casterY, 10, 0xff2200, 0.6);
    ctx.scene.tweens.add({
      targets: charge,
      scaleX: 22,
      scaleY: 22,
      alpha: 0.15,
      duration: 2000,
      onComplete: () => charge.destroy(),
    });

    // After channel: massive explosion
    ctx.scene.time.delayedCall(2000, () => {
      ctx.dealAoeDamage(ctx.casterX, ctx.casterY, 220, 80);

      const boom = ctx.scene.add.circle(ctx.casterX, ctx.casterY, 12, 0xff4400, 0.9);
      ctx.scene.tweens.add({
        targets: boom,
        scaleX: 18,
        scaleY: 18,
        alpha: 0,
        duration: 600,
        onComplete: () => boom.destroy(),
      });
      const boomCore = ctx.scene.add.circle(ctx.casterX, ctx.casterY, 8, 0xffffff, 1);
      ctx.scene.tweens.add({
        targets: boomCore,
        scaleX: 8,
        scaleY: 8,
        alpha: 0,
        duration: 300,
        onComplete: () => boomCore.destroy(),
      });
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
