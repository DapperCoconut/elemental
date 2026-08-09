import Phaser from 'phaser';
import { PreviewScript, PreviewCtx } from '../../../ui/AbilityPreview';
import { BaseAvatar } from '../../../elements/kits/ElementVisuals';
import { EarthFx, EARTH, EarthAvatar, StoneShield } from '../../../elements/kits/EarthVisuals';

function stage(ctx: PreviewCtx): { fx: EarthFx; av: BaseAvatar } {
  const fx = ctx.capture(() => new EarthFx(ctx.scene, ctx.tint).setSink(ctx.sink));
  const av = ctx.useAvatar(() => new EarthAvatar(ctx.scene, ctx.tint));
  av.setFacing(ctx.aim);
  ctx.addDummy();
  return { fx, av };
}

/** The real `StoneShield` rig, held at an offset from the caster and facing the aim. */
function shield(ctx: PreviewCtx, offset: () => number, hpRatio = 1): void {
  const s = ctx.capture(() => new StoneShield(ctx.scene, ctx.tint, { depth: 7 }));
  s.setHp(hpRatio);
  ctx.onFrame((dt) => {
    const d = offset();
    s.setPose(ctx.cx + Math.cos(ctx.aim) * d, ctx.cy + Math.sin(ctx.aim) * d, ctx.aim);
    s.update(dt);
  });
}

export const bash: PreviewScript = {
  duration: 3000,
  caption: 'Click — hold to charge: 30→45 damage, and a 700ms stun at full',
  run(ctx) {
    const { fx, av } = stage(ctx);
    let dist = 34;
    shield(ctx, () => dist);
    av.setHold('brace', ctx.aim);
    // The wind-up, then the charge at its real 550→800 speed over 200→320ms.
    ctx.onFrame((_dt, elapsed) => {
      if (elapsed < 1200) dist = 34 - (elapsed / 1200) * 10;          // hauled in tight
      else if (elapsed < 1520) dist = 24 + ((elapsed - 1200) / 320) * 150;
      else if (elapsed < 2200) dist = 174;
      else dist = 174 - ((elapsed - 2200) / 800) * 140;
    });
    ctx.at(1200, () => {
      av.setHold(null);
      av.play('dash', ctx.aim);
      fx.furrow(ctx.cx, ctx.cy + 14, ctx.cx + 150, ctx.cy + 14);
      fx.grit(ctx.cx, ctx.cy + 14, 10, { speed: 180, life: 460 });
    });
    ctx.at(1520, () => {
      fx.impact(ctx.tx, ctx.ty, 46);
      fx.debris(ctx.tx, ctx.ty, 10, { speed: 220, life: 560 });
      // Full charge stuns for 700ms — shown as the dummy locked in dust.
      for (let i = 0; i < 4; i++) ctx.at(i * 175, () => fx.dust(ctx.tx, ctx.ty, 3, 26, 6));
    });
  },
};

export const bashUpgraded: PreviewScript = {
  duration: 3000,
  caption: 'Double Shield — a second 50 HP slab behind you takes over when the front breaks',
  run(ctx) {
    const { fx, av } = stage(ctx);
    let front = 34;
    let frontHp = 1;
    shield(ctx, () => front, 1);
    // The rear slab, riding on the opposite side — the whole content of this upgrade.
    const rear = ctx.capture(() => new StoneShield(ctx.scene, ctx.tint, { depth: 6, steel: true }));
    ctx.onFrame((dt, elapsed) => {
      const back = ctx.aim + Math.PI;
      // At 1.8s the front slab fails and the rear one swings round to take over.
      const swung = elapsed > 1800;
      rear.setPose(
        ctx.cx + Math.cos(swung ? ctx.aim : back) * 30,
        ctx.cy + Math.sin(swung ? ctx.aim : back) * 30,
        swung ? ctx.aim : back);
      rear.update(dt);
      front = swung ? -60 : 34;
      frontHp = Phaser.Math.Clamp(1 - elapsed / 1800, 0, 1);
      void frontHp;
    });
    ctx.at(600, () => { fx.impact(ctx.cx + 34, ctx.cy, 24); fx.shatter(ctx.cx + 34, ctx.cy, ctx.aim, EARTH.stone, 6); });
    ctx.at(1200, () => { fx.impact(ctx.cx + 34, ctx.cy, 26); fx.shatter(ctx.cx + 34, ctx.cy, ctx.aim, EARTH.stone, 8); });
    ctx.at(1800, () => {
      fx.shatter(ctx.cx + 34, ctx.cy, ctx.aim, EARTH.pale, 14);
      fx.debris(ctx.cx + 34, ctx.cy, 12, { speed: 200, life: 520 });
      av.play('flex');
    });
  },
};

export const repair: PreviewScript = {
  duration: 2600,
  caption: 'E — hauls the guard back up',
  run(ctx) {
    const { fx, av } = stage(ctx);
    let ratio = 0;
    shield(ctx, () => 34, 1);
    ctx.onFrame((_dt, elapsed) => { ratio = Phaser.Math.Clamp((elapsed - 400) / 900, 0, 1); void ratio; });
    ctx.at(400, () => {
      av.play('slam', ctx.aim);
      fx.pillar(ctx.cx + 34, ctx.cy, 22, 60);
      fx.grit(ctx.cx + 34, ctx.cy + 16, 12, { speed: 150, life: 520 });
      fx.dust(ctx.cx + 34, ctx.cy, 4, 34, 5);
    });
  },
};

export const repairUpgraded: PreviewScript = {
  duration: 3800,
  caption: 'Shield Splinter — hold 2s, then the slab bursts for a third of its own HP',
  run(ctx) {
    const { fx, av } = stage(ctx);
    shield(ctx, () => 34);
    av.setHold('brace', ctx.aim);
    // Two seconds of red throb is the telegraph, so it gets the screen time.
    const throb = ctx.adopt(ctx.scene.add.graphics().setDepth(8));
    ctx.onFrame((_dt, elapsed) => {
      const t = Phaser.Math.Clamp(elapsed / 2000, 0, 1);
      throb.clear();
      if (t >= 1) return;
      throb.fillStyle(ctx.tint(EARTH.magma), 0.18 + 0.35 * t * Math.abs(Math.sin(elapsed / (140 - 90 * t))));
      throb.fillCircle(ctx.cx + 34, ctx.cy, 26);
    });
    ctx.at(2000, () => {
      throb.clear();
      av.setHold(null);
      av.play('punch', ctx.aim);
      fx.impact(ctx.cx + 34, ctx.cy, 90, { molten: true });
      fx.shatter(ctx.cx + 34, ctx.cy, ctx.aim, EARTH.magma, 16);
      fx.debris(ctx.cx + 34, ctx.cy, 16, { speed: 300, life: 640 });
      // Plus the 20 damage forward projectile.
      const g = ctx.adopt(ctx.scene.add.graphics().setDepth(6));
      EarthFx.drawRock(g, ctx.tint, 11, 3.1, false);
      ctx.onFrame((_dt, elapsed) => {
        const t = Phaser.Math.Clamp((elapsed - 2000) / 500, 0, 1);
        g.setVisible(t > 0 && t < 1);
        g.setPosition(ctx.cx + 60 + (ctx.tx - ctx.cx) * t, ctx.cy).setRotation(t * 6);
      });
      ctx.at(500, () => fx.impact(ctx.tx, ctx.ty, 30));
    });
  },
};

export const rockDance: PreviewScript = {
  duration: 3600,
  caption: 'R — stones orbit until fired off the shield at 500 px/s',
  run(ctx) {
    const { fx, av } = stage(ctx);
    shield(ctx, () => 34);
    const orbit = ctx.adopt(ctx.scene.add.graphics().setDepth(6));
    let fired = 0;
    ctx.at(300, () => {
      av.play('raise', ctx.aim, 600);
      fx.dust(ctx.cx, ctx.cy + 14, 5, 40, 5);
      // `drawRock` paints around its own origin, so each stone is its own moved Graphics.
      const stones = Array.from({ length: 4 }, (_, i) => {
        const rg = ctx.adopt(ctx.scene.add.graphics().setDepth(6));
        EarthFx.drawRock(rg, ctx.tint, 10, i * 2.3, false);
        return rg;
      });
      void orbit;
      ctx.onFrame((_dt, elapsed) => {
        const a0 = (elapsed - 300) / 500;
        stones.forEach((rg, i) => {
          const a = a0 + (i / 4) * Math.PI * 2;
          rg.setVisible(elapsed >= 300 && i >= fired);
          rg.setPosition(ctx.cx + Math.cos(a) * 46, ctx.cy + Math.sin(a) * 46).setRotation(a);
        });
      });
    });
    for (let i = 0; i < 3; i++) {
      ctx.at(1200 + i * 650, () => {
        fired++;
        av.play('punch', ctx.aim);
        fx.muzzleRubble(ctx.cx + 40, ctx.cy, ctx.aim, 1, 8, false);
        const g = ctx.adopt(ctx.scene.add.graphics().setDepth(6));
        EarthFx.drawRock(g, ctx.tint, 11, i * 1.7, false);
        const born = 1200 + i * 650;
        ctx.onFrame((_dt, elapsed) => {
          const t = Phaser.Math.Clamp((elapsed - born) / 520, 0, 1);
          g.setVisible(t > 0 && t < 1);
          g.setPosition(ctx.cx + 40 + (ctx.tx - ctx.cx) * t, ctx.cy).setRotation(t * 9);
        });
        ctx.at(520, () => { fx.impact(ctx.tx, ctx.ty, 28); fx.debris(ctx.tx, ctx.ty, 6, { speed: 170, life: 420 }); });
      });
    }
  },
};

export const rockDanceUpgraded: PreviewScript = {
  duration: 3600,
  caption: 'Lava Rocks — 25% faster orbit, 60 damage, and a fire pool where it lands',
  run(ctx) {
    const { fx, av } = stage(ctx);
    shield(ctx, () => 34);
    const orbit = ctx.adopt(ctx.scene.add.graphics().setDepth(6));
    let fired = 0;
    ctx.at(300, () => {
      av.play('raise', ctx.aim, 600);
      const stones = Array.from({ length: 4 }, (_, i) => {
        const rg = ctx.adopt(ctx.scene.add.graphics().setDepth(6));
        EarthFx.drawRock(rg, ctx.tint, 10, i * 2.3, true);
        return rg;
      });
      void orbit;
      ctx.onFrame((_dt, elapsed) => {
        // 25% faster, tighter radius — both parts of the upgrade, visible side by side.
        const a0 = ((elapsed - 300) / 500) * 1.25;
        stones.forEach((rg, i) => {
          const a = a0 + (i / 4) * Math.PI * 2;
          rg.setVisible(elapsed >= 300 && i >= fired);
          rg.setPosition(ctx.cx + Math.cos(a) * 38, ctx.cy + Math.sin(a) * 38).setRotation(a);
        });
      });
    });
    for (let i = 0; i < 3; i++) {
      ctx.at(1200 + i * 650, () => {
        fired++;
        av.play('punch', ctx.aim);
        fx.muzzleRubble(ctx.cx + 40, ctx.cy, ctx.aim, 1.25, 8, true);
        const g = ctx.adopt(ctx.scene.add.graphics().setDepth(6));
        EarthFx.drawRock(g, ctx.tint, 11, i * 1.7, true);
        const born = 1200 + i * 650;
        ctx.onFrame((_dt, elapsed) => {
          const t = Phaser.Math.Clamp((elapsed - born) / 520, 0, 1);
          g.setVisible(t > 0 && t < 1);
          g.setPosition(ctx.cx + 40 + (ctx.tx - ctx.cx) * t, ctx.cy).setRotation(t * 9);
        });
        ctx.at(520, () => {
          fx.impact(ctx.tx, ctx.ty, 34, { molten: true });
          fx.crater(ctx.tx, ctx.ty, 30, 1, true);
        });
      });
    }
  },
};

export const quake: PreviewScript = {
  duration: 3400,
  scale: 0.9,
  caption: 'F — a ridge of slabs at 300 px/s, running for the nearest edge',
  run(ctx) {
    const { fx, av } = stage(ctx);
    ctx.at(300, () => {
      av.play('slam', ctx.aim);
      fx.impact(ctx.cx, ctx.cy + 14, 70);
      fx.crater(ctx.cx, ctx.cy + 14, 40);
      const g = ctx.adopt(ctx.scene.add.graphics().setDepth(5));
      ctx.onFrame((_dt, elapsed) => {
        const age = elapsed - 400;
        g.clear();
        if (age < 0 || age > 3000) return;
        const x = ctx.cx + 300 * (age / 1000);
        if (x > ctx.w + 40) return;
        EarthFx.drawFaultWall(g, ctx.tint, x, ctx.cy + 14, 46, 0, age / 400, 1);
      });
    });
  },
};

export const quakeUpgraded: PreviewScript = {
  duration: 4200,
  scale: 0.9,
  caption: 'Tectonic Quake — 25% larger, plus 2 tsunami waves at 35 damage and a push',
  run(ctx) {
    const { fx, av } = stage(ctx);
    ctx.at(300, () => {
      av.play('slam', ctx.aim);
      fx.impact(ctx.cx, ctx.cy + 14, 88);
      fx.crater(ctx.cx, ctx.cy + 14, 50);
      const g = ctx.adopt(ctx.scene.add.graphics().setDepth(5));
      ctx.onFrame((_dt, elapsed) => {
        const age = elapsed - 400;
        g.clear();
        if (age < 0 || age > 3600) return;
        const x = ctx.cx + 300 * (age / 1000);
        if (x <= ctx.w + 40) EarthFx.drawFaultWall(g, () => EARTH.chalk, x, ctx.cy + 14, 58, 0, age / 400, 1);
        // The two edge waves the upgrade adds, coming in from opposite sides.
        if (age > 700) {
          const t = (age - 700) / 2200;
          EarthFx.drawFaultWall(g, () => EARTH.chalk, ctx.w - t * ctx.w, ctx.cy - 34, 40, 0, age / 380, 1);
          EarthFx.drawFaultWall(g, () => EARTH.chalk, t * ctx.w, ctx.cy + 52, 40, 0, age / 380, 1);
        }
      });
      ctx.at(1100, () => { fx.dust(ctx.w - 30, ctx.cy - 34, 6, 40, 6); fx.dust(30, ctx.cy + 52, 6, 40, 6); });
    });
  },
};

export const golemRitual: PreviewScript = {
  duration: 3400,
  caption: 'Q — the caster becomes a golem of the same stone',
  run(ctx) {
    const { fx, av } = stage(ctx);
    ctx.at(300, () => {
      av.play('raise', ctx.aim, 900);
      fx.channelCharge(ctx.cx, ctx.cy, 90, 900);
      ctx.at(900, () => {
        fx.pillar(ctx.cx, ctx.cy, 34, 90);
        fx.impact(ctx.cx, ctx.cy, 80);
        fx.debris(ctx.cx, ctx.cy, 18, { speed: 260, life: 700 });
        fx.dust(ctx.cx, ctx.cy, 8, 70, 5);
      });
    });
  },
};

export const golemRitualUpgraded: PreviewScript = {
  duration: 5600,
  scale: 0.62,
  caption: 'Titan Form — hold 5s, then 20s untouchable with five new abilities',
  run(ctx) {
    const { fx, av } = stage(ctx);
    ctx.at(200, () => {
      av.play('raise', ctx.aim, 1600);
      fx.channelCharge(ctx.cx, ctx.cy, 150, 1600);
      ctx.at(1600, () => {
        // The head looming over the arena — the thing that makes this a different ability.
        const head = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
        ctx.onFrame((_dt, elapsed) => {
          const t = Phaser.Math.Clamp((elapsed - 1800) / 700, 0, 1);
          head.clear();
          if (t <= 0) return;
          const cy = -30 * t + ctx.h * 0.1 * (1 - t);
          head.fillStyle(ctx.tint(EARTH.umber), 0.95);
          head.fillEllipse(ctx.w / 2, cy, 250 * 2 * t, 205 * 2 * t);
          head.fillStyle(ctx.tint(EARTH.stone), 1);
          head.fillEllipse(ctx.w / 2, cy - 6, 236 * 2 * t, 190 * 2 * t);
          head.fillStyle(ctx.tint(EARTH.magma), 0.9);
          head.fillCircle(ctx.w / 2 - 70 * t, cy + 60 * t, 17 * t);
          head.fillCircle(ctx.w / 2 + 70 * t, cy + 60 * t, 17 * t);
          head.fillStyle(ctx.tint(EARTH.crevice), 1);
          head.fillEllipse(ctx.w / 2, cy + 128 * t, 120 * t, 34 * t);
        });
        fx.impact(ctx.w / 2, ctx.h * 0.3, 200);
        // Smash: every falling rock is telegraphed for a full 2s before it lands.
        for (let i = 0; i < 3; i++) {
          const rx = 60 + i * 110;
          ctx.at(900 + i * 700, () => {
            const mk = ctx.adopt(ctx.scene.add.graphics().setDepth(3));
            EarthFx.drawSmashMarker(mk, ctx.tint, rx, ctx.h * 0.8, 40, 0);
            ctx.at(800, () => { mk.destroy(); fx.impact(rx, ctx.h * 0.8, 46); fx.debris(rx, ctx.h * 0.8, 8, { speed: 220, life: 520 }); });
          });
        }
      });
    });
  },
};
