import Phaser from 'phaser';
import { PreviewScript, PreviewCtx } from '../../../ui/AbilityPreview';
import { BaseAvatar } from '../../../elements/kits/ElementVisuals';
import { EarthFx, EARTH, EarthAvatar, StoneShield } from '../../../elements/kits/EarthVisuals';
import {
  BIOME_INFO, EarthBiome, drawBiomeFloor, drawBiomeGlyph, drawBiomeLive, drawRiteDais, drawSeedStone, drawSpike,
} from '../../../elements/kits/EarthBiomeVisuals';

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

/** The box's own four quarters, split around the caster so the stones hang where they do in play. */
function quarters(ctx: PreviewCtx): Phaser.Geom.Rectangle[] {
  const cx = ctx.cx, cy = ctx.cy - 20;
  return [
    new Phaser.Geom.Rectangle(0, 0, cx, cy),
    new Phaser.Geom.Rectangle(cx, 0, ctx.w - cx, cy),
    new Phaser.Geom.Rectangle(0, cy, cx, ctx.h - cy),
    new Phaser.Geom.Rectangle(cx, cy, ctx.w - cx, ctx.h - cy),
  ];
}

export const biomeBuilder: PreviewScript = {
  duration: 6200,
  scale: 0.72,
  caption: 'Q — untouchable at the centre; each click on a seed stone fills a quarter with its biome for 20s, repeats allowed',
  run(ctx) {
    const { fx, av } = stage(ctx);
    const cx = ctx.cx, cy = ctx.cy;
    const kinds: EarthBiome[] = ['lava', 'ice', 'jungle', 'mountain'];
    const offs: Array<[number, number]> = [[-96, -68], [96, -68], [-96, 68], [96, 68]];
    const rects = quarters(ctx);
    const floors = ctx.adopt(ctx.scene.add.graphics().setDepth(1));
    const live = ctx.adopt(ctx.scene.add.graphics().setDepth(2));
    const rite = ctx.adopt(ctx.scene.add.graphics().setDepth(10));
    const down: boolean[] = [false, false, false, false];
    const seeds = [11, 23, 37, 41];
    av.play('raise', -Math.PI / 2, 2600);
    ctx.at(300, () => {
      fx.impact(cx, cy + 6, 60, { shards: 8, dust: 3, crater: false, depth: 8 });
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        fx.pillar(cx + Math.cos(a) * 56, cy + 8 + Math.sin(a) * 22, 9, 30, 9);
      }
    });
    // Two stones are chosen; the other two crumble when the window closes.
    const slam = (i: number) => {
      down[i] = true;
      drawBiomeFloor(floors, ctx.tint, kinds[i], rects[i], seeds[i]);
      fx.impact(cx + offs[i][0], cy + offs[i][1] + 10, 52, { shards: 9, dust: 2, depth: 8, duration: 420 });
      fx.ring(cx + offs[i][0], cy + offs[i][1] + 10, 14, 120, BIOME_INFO[kinds[i]].color, 520, 6, 9);
      av.play('slam', -Math.PI / 2, 380);
    };
    ctx.at(1500, () => slam(0));
    ctx.at(2500, () => slam(3));
    ctx.at(3400, () => {
      for (const i of [1, 2]) {
        if (down[i]) continue;
        fx.debris(cx + offs[i][0], cy + offs[i][1] - 6, 7, { speed: 90, life: 520, fall: 40, depth: 9 });
      }
    });
    // Spikes grow on the mountain quarter once it lands.
    const spikes = Array.from({ length: 5 }, (_, i) => ({
      x: rects[3].x + 30 + ((i * 53) % Math.max(1, rects[3].width - 60)),
      y: rects[3].y + 36 + ((i * 29) % Math.max(1, rects[3].height - 56)), h: 30 + (i % 3) * 7,
    }));
    ctx.onFrame((_dt, elapsed) => {
      const t = elapsed / 1000;
      live.clear(); rite.clear();
      for (let i = 0; i < 4; i++) {
        if (down[i]) {
          drawBiomeLive(live, ctx.tint, kinds[i], rects[i], t + seeds[i], seeds[i], 1);
          const gx = rects[i].centerX < cx ? rects[i].x + 22 : rects[i].right - 22;
          const gy = rects[i].centerY < cy ? rects[i].y + 22 : rects[i].bottom - 22;
          live.fillStyle(ctx.tint(EARTH.crevice), 0.45);
          live.fillCircle(gx, gy, 15);
          drawBiomeGlyph(live, ctx.tint, kinds[i], gx, gy, 9, 0.9, t);
        }
      }
      if (down[3]) for (const s of spikes) drawSpike(live, ctx.tint, s.x, s.y, s.h, s.x, Phaser.Math.Clamp((elapsed - 2600) / 300, 0, 1), 1);
      const riteOn = elapsed > 300 && elapsed < 3400;
      if (!riteOn) return;
      drawRiteDais(rite, ctx.tint, cx, cy, t, Phaser.Math.Clamp((elapsed - 300) / 320, 0, 1), 1 - (elapsed - 300) / 3100, 1);
      for (let i = 0; i < 4; i++) {
        if (down[i]) continue;
        const picked = (i === 0 && elapsed > 1300) || (i === 3 && elapsed > 2300);
        drawSeedStone(rite, ctx.tint, kinds[i], cx + offs[i][0], cy + offs[i][1], t, seeds[i],
          Phaser.Math.Clamp((elapsed - 600 - i * 70) / 260, 0, 1), picked, 1);
      }
    });
  },
};

export const biomeBuilderUpgraded: PreviewScript = {
  duration: 5200,
  scale: 0.72,
  caption: 'Symbiosis — your own weather blesses you: Lava +20% damage, Ice −20% taken, Jungle +5/s, Ocean +20% speed, Mountain shield ×1.25',
  run(ctx) {
    const { fx, av } = stage(ctx);
    const rects = quarters(ctx);
    const kinds: EarthBiome[] = ['lava', 'ice', 'jungle', 'ocean'];
    const floors = ctx.adopt(ctx.scene.add.graphics().setDepth(1));
    const live = ctx.adopt(ctx.scene.add.graphics().setDepth(2));
    kinds.forEach((k, i) => drawBiomeFloor(floors, ctx.tint, k, rects[i], 50 + i * 9));
    const bless = (i: number) => {
      const r = rects[i];
      const at = ctx.casterAt();
      const info = BIOME_INFO[kinds[i]];
      const label = ctx.adopt(ctx.scene.add.text(at.x, at.y - 44, info.blessing.toUpperCase(), {
        fontSize: '12px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif', color: info.text, stroke: '#140d08', strokeThickness: 3,
      }).setOrigin(0.5).setDepth(14));
      ctx.scene.tweens.add({ targets: label, y: at.y - 70, alpha: 0, duration: 1000, onComplete: () => label.destroy() });
      fx.ring(r.centerX, r.centerY, 10, 60, info.color, 500, 4, 8);
    };
    // The caster walks a lap through all four quarters, blessed in each.
    const stops = rects.map((r) => ({ x: r.centerX, y: r.centerY + 10 }));
    ctx.at(200, () => { ctx.glideCaster({ to: stops[0], ms: 600, ease: 'out', onDone: () => bless(0) }); av.play('dash', Math.PI); });
    ctx.at(1400, () => { ctx.glideCaster({ to: stops[1], ms: 600, ease: 'out', onDone: () => bless(1) }); av.play('dash', 0); });
    ctx.at(2600, () => { ctx.glideCaster({ to: stops[3], ms: 600, ease: 'out', onDone: () => bless(3) }); av.play('dash', Math.PI / 2); });
    ctx.at(3800, () => { ctx.glideCaster({ to: stops[2], ms: 600, ease: 'out', onDone: () => bless(2) }); av.play('dash', Math.PI); });
    ctx.onFrame((_dt, elapsed) => {
      live.clear();
      kinds.forEach((k, i) => drawBiomeLive(live, ctx.tint, k, rects[i], elapsed / 1000 + i, 50 + i * 9, 1));
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
