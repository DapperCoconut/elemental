import Phaser from 'phaser';
import { PreviewScript } from '../../../ui/AbilityPreview';
import { BaseAvatar } from '../../../elements/kits/ElementVisuals';
import { FireFx, FIRE, FireAvatar, FireWreath } from '../../../elements/kits/FireVisuals';

/**
 * Fire's ability previews.
 *
 * Every one of these calls the same `FireFx` the arena calls, so retuning a blast in the kit
 * shows up here without anyone editing this file. What the script owns is the staging: where
 * the caster stands, when the gesture fires, and how long to wait before looping.
 */

/** Fx wired to the box, plus the caster rig already facing the dummy. */
function stage(ctx: Parameters<PreviewScript['run']>[0]): { fx: FireFx; av: BaseAvatar } {
  const fx = ctx.capture(() => new FireFx(ctx.scene, ctx.tint).setSink(ctx.sink));
  const av = ctx.useAvatar(() => new FireAvatar(ctx.scene, ctx.tint));
  av.setFacing(ctx.aim);
  ctx.addDummy();
  return { fx, av };
}

export const fireball: PreviewScript = {
  duration: 1600,
  scale: 1,
  caption: 'Click — 20 damage, 520 px/s, twice a second',
  run(ctx) {
    const { fx, av } = stage(ctx);
    const fire = (delay: number): void => ctx.at(delay, () => {
      av.play('punch', ctx.aim);
      const sx = ctx.cx + 32, sy = ctx.cy;
      fx.muzzleFlash(sx, sy, ctx.aim);
      // The real `proj-fire` sprite at the real 520 px/s — same texture the arena launches.
      ctx.fly({
        texture: 'proj-fire', from: { x: sx, y: sy }, to: { x: ctx.tx, y: ctx.ty }, speed: 520,
        onHit: () => { fx.flash(ctx.tx, ctx.ty, 26); fx.embers(ctx.tx, ctx.ty, 7, { speed: 150, size: 2.6, life: 420 }); },
      });
    });
    fire(220);
    fire(940);
  },
};

export const fireballUpgraded: PreviewScript = {
  duration: 2600,
  caption: 'Flameshredder — the hit leaves a 3s burn, 1 damage every 0.5s',
  run(ctx) {
    const { fx, av } = stage(ctx);
    ctx.at(220, () => {
      av.play('punch', ctx.aim);
      fx.muzzleFlash(ctx.cx + 32, ctx.cy, ctx.aim);
      ctx.fly({
        texture: 'proj-fire', from: { x: ctx.cx + 32, y: ctx.cy }, to: { x: ctx.tx, y: ctx.ty }, speed: 520,
      });
      ctx.at(300, () => {
        fx.flash(ctx.tx, ctx.ty, 26);
        // Six ticks at 0.5s — the burn as it actually resolves, not a generic glow.
        for (let i = 0; i < 6; i++) {
          ctx.at(i * 500, () => {
            fx.embers(ctx.tx, ctx.ty - 4, 4, { speed: 60, size: 2.2, life: 520, rise: 40 });
            fx.smoke(ctx.tx, ctx.ty - 8, 2, 14, 5);
          });
        }
      });
    });
  },
};

export const flameDash: PreviewScript = {
  duration: 2000,
  caption: 'E — 18 damage in 90px at the spot you LEFT, not where you land',
  run(ctx) {
    const { fx, av } = stage(ctx);
    ctx.at(300, () => {
      av.play('dash', ctx.aim);
      const ox = ctx.cx, oy = ctx.cy;
      fx.dashTrail(ox, oy, ox + 180, oy);
      // 640 velocity over 180px is a bit under 0.3s of travel. The caster genuinely crosses
      // the trail — the ability is a displacement, and a rooted character showing a lit dash
      // lane documents something the player cannot do.
      ctx.glideCaster({ to: { x: ox + 180, y: oy }, ms: 280, ease: 'out' });
      // The burst is at the origin — the whole point of the ability, so the preview
      // deliberately leaves the caster's mark behind and lights it up.
      fx.bloom(ox, oy, 88, 12);
      fx.scorch(ox, oy, 46);
      fx.embers(ox, oy, 12, { speed: 190, size: 3.4, life: 560 });
      fx.ring(ox, oy, 20, 90, FIRE.pale, 420, 4, 6);
    });
  },
};

export const flameDashUpgraded: PreviewScript = {
  duration: 3000,
  caption: 'Propulsion — the dash lays small explosions the whole way, not just at the origin',
  run(ctx) {
    const { fx, av } = stage(ctx);
    ctx.at(300, () => {
      av.play('dash', ctx.aim);
      const ox = ctx.cx, oy = ctx.cy;
      const dx = ox + 180, dy = oy;
      fx.dashTrail(ox, oy, dx, dy);
      ctx.glideCaster({ to: { x: dx, y: dy }, ms: 280, ease: 'out' });
      // The origin burst still happens — Propulsion adds to it rather than replacing it.
      fx.bloom(ox, oy, 88, 12);
      fx.scorch(ox, oy, 46);
      fx.ring(ox, oy, 20, 90, FIRE.pale, 420, 4, 6);
      // …and then the trail, going off one after another along the path just travelled.
      for (let i = 1; i <= 5; i++) {
        ctx.at(i * 120, () => {
          const k = i / 5;
          const px = ox + (dx - ox) * k, py = oy + (dy - oy) * k;
          fx.explosion(px, py, 40);
          fx.scorch(px, py, 22);
          fx.embers(px, py, 5, { speed: 140, size: 2.6, life: 440 });
        });
      }
    });
  },
};

export const pressureBomb: PreviewScript = {
  duration: 3000,
  scale: 0.9,
  caption: 'R — 1.5s marked fuse, then 32 damage in 100px',
  run(ctx) {
    const { fx, av } = stage(ctx);
    ctx.at(250, () => {
      av.play('slam', ctx.aim);
      const bx = ctx.tx, by = ctx.ty;
      // The red ground marker is the honest part of this ability, so it gets the screen time.
      const mark = ctx.adopt(ctx.scene.add.graphics().setDepth(2));
      ctx.onFrame((_dt, elapsed) => {
        const t = Phaser.Math.Clamp((elapsed - 250) / 1500, 0, 1);
        mark.clear();
        if (t >= 1) return;
        const pulse = 0.35 + 0.4 * Math.abs(Math.sin(t * 18));
        mark.fillStyle(ctx.tint(FIRE.red), 0.22 + 0.2 * t);
        mark.fillCircle(bx, by, 100);
        mark.lineStyle(2 + 2 * t, ctx.tint(FIRE.core), pulse);
        mark.strokeCircle(bx, by, 100 * (0.35 + 0.65 * t));
      });
      ctx.at(1500, () => { mark.clear(); fx.explosion(bx, by, 100); });
    });
  },
};

export const pressureBombUpgraded: PreviewScript = {
  duration: 4200,
  scale: 0.9,
  caption: 'Cluster Bomb — plus 6 bomblets at 12 damage, ~0.7s later',
  run(ctx) {
    const { fx, av } = stage(ctx);
    ctx.at(250, () => {
      av.play('slam', ctx.aim);
      const bx = ctx.tx, by = ctx.ty;
      ctx.at(1250, () => {
        fx.explosion(bx, by, 100);
        // Six charges thrown 30–85px out, 70ms apart, each on its own 700ms fuse.
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 + 0.4;
          const d = 30 + (i % 3) * 27;
          const px = bx + Math.cos(a) * d, py = by + Math.sin(a) * d;
          ctx.at(i * 70, () => fx.scorch(px, py, 20));
          ctx.at(700 + i * 70, () => { fx.explosion(px, py, 55); fx.embers(px, py, 5, { speed: 130, size: 2.4, life: 380 }); });
        }
      });
    });
  },
};

export const flameBody: PreviewScript = {
  duration: 3600,
  caption: 'F — toggle: ×2 move speed, paid for at 2 HP every 0.25s',
  run(ctx) {
    const { fx, av } = stage(ctx);
    ctx.at(300, () => {
      av.play('flex');
      fx.bloom(ctx.cx, ctx.cy, 34 * 2.1, 12);
      fx.ring(ctx.cx, ctx.cy, 10, 34 * 2.4, FIRE.pale, 380, 5, 4);
      // The real wreath object, driven at the caster mark for the rest of the loop.
      const wreath = ctx.capture(() => new FireWreath(ctx.scene, ctx.tint, 34, 1, 3));
      ctx.onFrame((dt) => wreath.update(dt, ctx.cx, ctx.cy, 1));
      // The self-burn, ticking at its real 250ms rate so the cost is visible.
      for (let i = 1; i <= 10; i++) {
        ctx.at(300 + i * 250, () => fx.embers(ctx.cx, ctx.cy - 12, 2, { speed: 40, size: 1.8, life: 380, rise: 50 }));
      }
    });
  },
};

export const flameBodyUpgraded: PreviewScript = {
  duration: 3600,
  caption: 'Flame Affinity — no self-burn, but double damage both ways',
  run(ctx) {
    const { fx, av } = stage(ctx);
    ctx.at(300, () => {
      av.play('flex');
      av.setIntensity(1.35);
      fx.bloom(ctx.cx, ctx.cy, 44 * 2.1, 14);
      fx.ring(ctx.cx, ctx.cy, 10, 44 * 2.4, FIRE.white, 420, 6, 4);
      const wreath = ctx.capture(() => new FireWreath(ctx.scene, ctx.tint, 44, 1.35, 3));
      ctx.onFrame((dt) => wreath.update(dt, ctx.cx, ctx.cy, 1));
    });
  },
};

export const flameNuke: PreviewScript = {
  duration: 4200,
  scale: 0.9,
  caption: 'Q — locked for 2s, then 80 damage in 220px',
  run(ctx) {
    const { fx, av } = stage(ctx);
    ctx.at(200, () => {
      av.play('raise', ctx.aim, 2000);
      fx.channelCharge(ctx.cx, ctx.cy, 200, 2000);
      ctx.at(2000, () => {
        fx.explosion(ctx.cx, ctx.cy, 220, { shards: 34, smoke: 10, duration: 720 });
        fx.firePillar(ctx.cx, ctx.cy, 60, 210);
        fx.ring(ctx.cx, ctx.cy, 40, 300, FIRE.white, 500, 8, 8);
        ctx.at(120, () => fx.bloom(ctx.cx, ctx.cy, 210, 16));
        ctx.at(260, () => fx.embers(ctx.cx, ctx.cy, 22, { speed: 420, size: 4.5, life: 900, rise: 90 }));
      });
    });
  },
};

export const flameNukeUpgraded: PreviewScript = {
  duration: 5200,
  scale: 0.9,
  caption: 'Flame Charge — 1s to plant, 3s fuse, 80 damage that catches you too',
  run(ctx) {
    const { fx, av } = stage(ctx);
    ctx.at(200, () => {
      av.play('raise', ctx.aim, 1000);
      fx.channelCharge(ctx.cx, ctx.cy, 70, 1000);
      ctx.at(1000, () => {
        // Planted at the caster's own feet — that is the whole trade, so the mark stays put
        // while the rig walks nowhere.
        fx.channelCharge(ctx.cx, ctx.cy, 110, 3000);
        const fuse = ctx.adopt(ctx.scene.add.graphics().setDepth(7));
        ctx.onFrame((_dt, elapsed) => {
          const t = Phaser.Math.Clamp((elapsed - 1200) / 3000, 0, 1);
          fuse.clear();
          if (t >= 1) return;
          fuse.fillStyle(ctx.tint(FIRE.core), 0.5 + 0.4 * Math.abs(Math.sin(t * 26)));
          fuse.fillCircle(ctx.cx, ctx.cy, 14);
          fuse.lineStyle(3, ctx.tint(FIRE.yellow), 0.9);
          fuse.strokeCircle(ctx.cx, ctx.cy, 14);
        });
        ctx.at(3000, () => { fuse.clear(); fx.explosion(ctx.cx, ctx.cy, 140, { shards: 20, smoke: 6 }); });
      });
    });
  },
};
