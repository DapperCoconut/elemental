import Phaser from 'phaser';
import { PreviewScript, PreviewCtx } from '../../../ui/AbilityPreview';
import { BaseAvatar } from '../../../elements/kits/ElementVisuals';
import { WaterFx, WATER, WaterAvatar } from '../../../elements/kits/WaterVisuals';

function stage(ctx: PreviewCtx): { fx: WaterFx; av: BaseAvatar } {
  const fx = ctx.capture(() => new WaterFx(ctx.scene, ctx.tint).setSink(ctx.sink));
  const av = ctx.useAvatar(() => new WaterAvatar(ctx.scene, ctx.tint));
  av.setFacing(ctx.aim);
  ctx.addDummy();
  return { fx, av };
}

/** A pool drawn with the same `WaterFx.drawPool` the arena repaints geysers and puddles with. */
function pool(ctx: PreviewCtx, x: number, y: number, radius: number, lifeMs: number, bornAt: number): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(2));
  ctx.onFrame((_dt, elapsed) => {
    const age = elapsed - bornAt;
    g.clear();
    if (age < 0 || age > lifeMs) return;
    WaterFx.drawPool(g, ctx.tint, x, y, radius, elapsed / 600, 0.9, x * 0.01);
  });
}

export const waterCut: PreviewScript = {
  duration: 1400,
  caption: 'Click — 8 damage at 620 px/s, four shots a second',
  run(ctx) {
    const { fx, av } = stage(ctx);
    const fire = (delay: number): void => ctx.at(delay, () => {
      av.play('punch', ctx.aim);
      const sx = ctx.cx + 32;
      fx.muzzleSpray(sx, ctx.cy, ctx.aim, 0.85);
      ctx.fly({
        texture: 'proj-water', from: { x: sx, y: ctx.cy }, to: { x: ctx.tx, y: ctx.ty }, speed: 620,
        onHit: () => fx.splash(ctx.tx, ctx.ty, 22),
      });
    });
    // Four a second is the actual rate, and seeing it is the point of this preview.
    for (let i = 0; i < 4; i++) fire(150 + i * 250);
  },
};

export const waterCutUpgraded: PreviewScript = {
  duration: 5000,
  caption: 'Dehydration — every shot stacks 2%; each 10% is +5% damage, to +50%',
  run(ctx) {
    const { fx, av } = stage(ctx);
    // The two numbers that matter: the stack, and what it is currently worth.
    let dry = 0;
    const readout = ctx.adopt(ctx.scene.add.text(ctx.tx, ctx.ty - 44, '', {
      fontSize: '11px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif',
      color: '#ddf6ff', stroke: '#00224d', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(9));
    const bar = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
    ctx.onFrame(() => {
      // The bonus is granted in whole 10% steps, so the readout must round down, not scale.
      const bonus = Math.min(50, Math.floor(dry / 10) * 5);
      readout.setText(`DEHYDRATION ${dry}%   ·   +${bonus}% DAMAGE`);
      bar.clear();
      const w = 96, x = ctx.tx - w / 2, y = ctx.ty - 32;
      bar.fillStyle(0x00224d, 0.9);
      bar.fillRoundedRect(x, y, w, 8, 3);
      bar.fillStyle(ctx.tint(WATER.foam), 0.95);
      bar.fillRoundedRect(x + 1, y + 1, Math.max(0, (w - 2) * (dry / 100)), 6, 2);
      // The step marks: the bonus only moves when the bar crosses one of these.
      for (let i = 1; i < 10; i++) {
        bar.lineStyle(1, ctx.tint(WATER.abyss), 0.8);
        bar.lineBetween(x + (w * i) / 10, y, x + (w * i) / 10, y + 8);
      }
    });

    // Twenty shots at the real four-a-second rate: 2% each, so the bar walks to 40%.
    for (let i = 0; i < 20; i++) {
      ctx.at(150 + i * 220, () => {
        av.play('punch', ctx.aim);
        const sx = ctx.cx + 32;
        fx.muzzleSpray(sx, ctx.cy, ctx.aim, 0.85);
        ctx.fly({
          texture: 'proj-water', from: { x: sx, y: ctx.cy }, to: { x: ctx.tx, y: ctx.ty }, speed: 620,
          onHit: () => {
            const before = Math.floor(dry / 10);
            dry = Math.min(100, dry + 2);
            fx.splash(ctx.tx, ctx.ty, 22);
            // Every tenth point is a real breakpoint — mark the ones that pay.
            if (Math.floor(dry / 10) === before) return;
            fx.ring(ctx.tx, ctx.ty, 14, 46, WATER.pale, 420, 3, 6);
            fx.mist(ctx.tx, ctx.ty, 5, 26, 5);
          },
        });
      });
    }
  },
};

export const splash: PreviewScript = {
  duration: 3400,
  scale: 0.95,
  caption: 'E — 2s downpour, a 36px pool every 0.15s, 2 damage per 0.25s',
  run(ctx) {
    const { fx, av } = stage(ctx);
    ctx.at(200, () => {
      av.play('sweep', ctx.aim);
      // Thirteen pools laid along a swept cursor path — the ability is painting, not placing.
      for (let i = 0; i < 13; i++) {
        const t = i / 12;
        const px = ctx.cx + 90 + t * 150;
        const py = ctx.cy + Math.sin(t * 3.4) * 26;
        ctx.at(i * 150, () => {
          fx.crown(px, py, 36 * 0.85, 9, 3);
          fx.spray(px, py, 6, { speed: 110, size: 2.6, life: 460, fall: 36, depth: 5 });
          pool(ctx, px, py, 36, 1000, 200 + i * 150);
        });
      }
    });
  },
};

export const splashUpgraded: PreviewScript = {
  duration: 4600,
  scale: 0.95,
  caption: 'Tidal Pool — the last drop lands at 54px and sticks for 5s',
  run(ctx) {
    const { fx, av } = stage(ctx);
    ctx.at(200, () => {
      av.play('sweep', ctx.aim);
      for (let i = 0; i < 13; i++) {
        const final = i === 12;
        const t = i / 12;
        const px = ctx.cx + 90 + t * 150;
        const py = ctx.cy + Math.sin(t * 3.4) * 26;
        const r = final ? 54 : 36;
        ctx.at(i * 150, () => {
          fx.crown(px, py, r * (final ? 1.15 : 0.85), final ? 14 : 9, 3);
          fx.spray(px, py, final ? 14 : 6, { speed: final ? 180 : 110, size: final ? 3.4 : 2.6, life: 460, fall: r, depth: 5 });
          if (final) { fx.ring(px, py, 12, r * 1.9, WATER.pale, 460, 5, 4); fx.mist(px, py, 3, r * 0.8, 3); }
          pool(ctx, px, py, r, final ? 5000 : 1000, 200 + i * 150);
        });
      }
    });
  },
};

export const geyser: PreviewScript = {
  duration: 3000,
  caption: 'R — a 2-charge speed vent that stands for 5s',
  run(ctx) {
    const { fx, av } = stage(ctx);
    ctx.at(250, () => {
      av.play('raise', ctx.aim);
      const gx = ctx.cx + 150, gy = ctx.cy + 6;
      fx.waterSpout(gx, gy, 16, 96, 5);
      fx.crown(gx, gy, 62, 12, 4);
      fx.ring(gx, gy, 10, 96, WATER.pale, 460, 5, 4);
      fx.spray(gx, gy, 14, { speed: 210, size: 3.2, life: 620, fall: 90, depth: 5 });
      fx.mist(gx, gy, 3, 44, 3);
      pool(ctx, gx, gy, 40, 5000, 250);
    });
  },
};

export const geyserUpgraded: PreviewScript = {
  duration: 3600,
  caption: 'Boiling Geyser — 10 damage per second to anyone else standing in it',
  run(ctx) {
    const { fx, av } = stage(ctx);
    ctx.at(250, () => {
      av.play('raise', ctx.aim);
      const gx = ctx.tx, gy = ctx.ty + 6;
      fx.waterSpout(gx, gy, 16, 96, 5);
      fx.crown(gx, gy, 62, 12, 4);
      pool(ctx, gx, gy, 40, 5000, 250);
      // Scalding is a 1s tick, so the preview ticks at exactly 1s.
      for (let i = 1; i <= 3; i++) {
        ctx.at(i * 1000, () => { fx.flash(gx, gy - 6, 24); fx.mist(gx, gy, 4, 40, 6); });
      }
    });
  },
};

export const pressureDagger: PreviewScript = {
  duration: 3400,
  caption: 'F — hold to charge. 16 base, 1.5× at 1s, 2× at 2s, and it pierces',
  run(ctx) {
    const { fx, av } = stage(ctx);
    av.setHold('charge', ctx.aim);
    // The blade lengthening and darkening through the two pressure tiers.
    const blade = ctx.adopt(ctx.scene.add.graphics().setDepth(6));
    ctx.onFrame((_dt, elapsed) => {
      const t = Phaser.Math.Clamp(elapsed / 2000, 0, 1);
      blade.clear();
      if (elapsed > 2200) return;
      const len = 26 + t * 46;
      const tier = t >= 1 ? 2 : t >= 0.5 ? 1 : 0;
      const col = tier === 2 ? WATER.abyss : tier === 1 ? WATER.deep : WATER.blue;
      blade.fillStyle(ctx.tint(col), 0.9);
      blade.fillEllipse(ctx.cx + 30 + len / 2, ctx.cy, len, 8 + tier * 2);
      blade.fillStyle(ctx.tint(WATER.white), 0.8);
      blade.fillEllipse(ctx.cx + 30 + len * 0.8, ctx.cy, len * 0.3, 2.6);
    });
    ctx.at(2200, () => {
      blade.clear();
      av.setHold(null);
      av.play('punch', ctx.aim);
      fx.muzzleSpray(ctx.cx + 32, ctx.cy, ctx.aim, 1.1);
      // The real dagger texture, and `pierce` so it carries on through the dummy.
      ctx.fly({
        texture: 'proj-pressure-dagger', from: { x: ctx.cx + 32, y: ctx.cy },
        to: { x: ctx.tx, y: ctx.ty }, speed: 700, pierce: true,
        onHit: () => fx.splash(ctx.tx, ctx.ty, 26),
      });
    });
  },
};

export const pressureDaggerUpgraded: PreviewScript = {
  duration: 5200,
  scale: 0.9,
  caption: 'Laminar Laceration — a full 2s charge splits them into two 1.5× hitboxes for 2s',
  run(ctx) {
    const { fx, av } = stage(ctx);
    av.setHold('charge', ctx.aim);
    const blade = ctx.adopt(ctx.scene.add.graphics().setDepth(6));
    const charge = ctx.adopt(ctx.scene.add.text(ctx.cx, ctx.cy - 46, '', {
      fontSize: '10px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif',
      color: '#88ddff',
    }).setOrigin(0.5).setDepth(9));
    // The split halves, and the 1.5× hitboxes they carry.
    let splitFrom = -1;
    const halves = ctx.adopt(ctx.scene.add.graphics().setDepth(6));

    ctx.onFrame((_dt, elapsed) => {
      const t = Phaser.Math.Clamp(elapsed / 2000, 0, 1);
      blade.clear();
      charge.setVisible(elapsed <= 2200);
      if (elapsed <= 2200) {
        const len = 26 + t * 46;
        const tier = t >= 1 ? 2 : t >= 0.5 ? 1 : 0;
        const col = tier === 2 ? WATER.abyss : tier === 1 ? WATER.deep : WATER.blue;
        blade.fillStyle(ctx.tint(col), 0.9);
        blade.fillEllipse(ctx.cx + 30 + len / 2, ctx.cy, len, 8 + tier * 2);
        blade.fillStyle(ctx.tint(WATER.white), 0.8);
        blade.fillEllipse(ctx.cx + 30 + len * 0.8, ctx.cy, len * 0.3, 2.6);
        charge.setText(t >= 1 ? 'FULLY CHARGED — IT WILL SPLIT' : `${(t * 2).toFixed(1)}s / 2.0s`);
      }
      halves.clear();
      if (splitFrom < 0) return;
      const age = elapsed - splitFrom;
      if (age > 2000) { splitFrom = -1; return; }
      // Two bodies, each drawn at 1.5× the ordinary hit radius, drifting apart and back.
      const gap = 16 + Math.sin((age / 2000) * Math.PI) * 14;
      for (const s of [-1, 1]) {
        const hx = ctx.tx + s * gap;
        halves.lineStyle(1.5, ctx.tint(WATER.cyan), 0.75);
        halves.strokeCircle(hx, ctx.ty, 18 * 1.5);
        halves.fillStyle(ctx.tint(WATER.sky), 0.16);
        halves.fillCircle(hx, ctx.ty, 18 * 1.5);
      }
      halves.lineStyle(1, ctx.tint(WATER.foam), 0.35);
      halves.lineBetween(ctx.tx - gap, ctx.ty, ctx.tx + gap, ctx.ty);
    });

    ctx.at(2200, () => {
      blade.clear();
      av.setHold(null);
      av.play('punch', ctx.aim);
      fx.muzzleSpray(ctx.cx + 32, ctx.cy, ctx.aim, 1.1);
      ctx.fly({
        texture: 'proj-pressure-dagger', from: { x: ctx.cx + 32, y: ctx.cy },
        to: { x: ctx.tx, y: ctx.ty }, speed: 700, pierce: true,
        onHit: () => {
          fx.splash(ctx.tx, ctx.ty, 26);
          splitFrom = 2200 + 300;
          fx.ring(ctx.tx, ctx.ty, 10, 54, WATER.white, 380, 3, 7);
          fx.spray(ctx.tx, ctx.ty, 10, { speed: 190, size: 2.8, life: 480, depth: 6 });
        },
      });
    });
    // Two follow-up shots into the split — the whole reason the upgrade exists.
    for (const [at, side] of [[3200, -1], [4000, 1]] as const) {
      ctx.at(at, () => {
        if (splitFrom < 0) return;
        av.play('punch', ctx.aim);
        fx.muzzleSpray(ctx.cx + 32, ctx.cy, ctx.aim, 0.85);
        const hx = ctx.tx + side * 22;
        ctx.fly({
          texture: 'proj-water', from: { x: ctx.cx + 32, y: ctx.cy }, to: { x: hx, y: ctx.ty }, speed: 620,
          onHit: () => { fx.splash(hx, ctx.ty, 22); fx.flash(hx, ctx.ty, 20); },
        });
      });
    }
  },
};

export const painRain: PreviewScript = {
  duration: 4600,
  scale: 0.9,
  caption: 'Q — 200 drops across the whole arena, each one telegraphed',
  run(ctx) {
    const { fx, av } = stage(ctx);
    ctx.at(200, () => {
      av.play('raise', ctx.aim, 900);
      fx.waterSpout(ctx.cx, ctx.cy, 26, 150, 6);
      fx.crown(ctx.cx, ctx.cy, 130, 18, 5);
      fx.ring(ctx.cx, ctx.cy, 24, 300, WATER.pale, 620, 7, 5);
      ctx.at(140, () => fx.ring(ctx.cx, ctx.cy, 20, 380, WATER.cyan, 700, 5, 5));
      fx.mist(ctx.cx, ctx.cy, 8, 120, 4);
    });
    // A representative sample of the storm — the marker-then-impact rhythm is the honest part.
    ctx.at(800, () => {
      for (let i = 0; i < 46; i++) {
        const dx = 20 + ((i * 137) % Math.max(1, Math.floor(ctx.w - 40)));
        const dy = 20 + ((i * 71) % Math.max(1, Math.floor(ctx.h - 40)));
        const at = (i % 14) * 210;
        ctx.at(at, () => {
          const mk = ctx.adopt(ctx.scene.add.graphics().setDepth(3));
          WaterFx.drawRainMarker(mk, ctx.tint, dx, dy, 15);
          ctx.at(300, () => { mk.destroy(); fx.dropImpact(dx, dy, 15); });
        });
      }
    });
  },
};

export const painRainUpgraded: PreviewScript = {
  duration: 5200,
  scale: 0.9,
  caption: 'Squall Splashes — a quarter of the drops leave a 5s pool behind',
  run(ctx) {
    const { fx, av } = stage(ctx);
    ctx.at(200, () => {
      av.play('raise', ctx.aim, 900);
      fx.waterSpout(ctx.cx, ctx.cy, 26, 150, 6);
      fx.crown(ctx.cx, ctx.cy, 130, 18, 5);
    });
    ctx.at(800, () => {
      for (let i = 0; i < 40; i++) {
        const dx = 24 + ((i * 149) % Math.max(1, Math.floor(ctx.w - 48)));
        const dy = 24 + ((i * 83) % Math.max(1, Math.floor(ctx.h - 48)));
        const at = (i % 12) * 230;
        const squall = i % 4 === 0;
        ctx.at(at, () => {
          const mk = ctx.adopt(ctx.scene.add.graphics().setDepth(3));
          WaterFx.drawRainMarker(mk, ctx.tint, dx, dy, squall ? 22 : 15);
          ctx.at(300, () => {
            mk.destroy();
            fx.dropImpact(dx, dy, squall ? 22 : 15);
            if (squall) { fx.crown(dx, dy, 58, 12, 3); pool(ctx, dx, dy, 54, 5000, 800 + at + 300); }
          });
        });
      }
    });
  },
};
