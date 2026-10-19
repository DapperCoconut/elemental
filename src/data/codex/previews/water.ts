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

/** A soap bubble, drawn the way WaterTides paints them in the arena. */
function drawBubble(g: Phaser.GameObjects.Graphics, ctx: PreviewCtx, x: number, y: number, r: number, t: number, hp = 1): void {
  g.fillStyle(ctx.tint(WATER.cyan), 0.16);
  g.fillCircle(x, y, r);
  g.lineStyle(1.6, ctx.tint(WATER.foam), 0.85);
  g.strokeCircle(x, y, r);
  g.lineStyle(1.2, ctx.tint(WATER.sky), 0.55);
  g.beginPath();
  g.arc(x, y, r * 0.72, t * 2, t * 2 + 1.4);
  g.strokePath();
  g.fillStyle(0xffffff, 0.85);
  g.fillEllipse(x - r * 0.38, y - r * 0.42, r * 0.55, r * 0.32);
  if (hp < 1) {
    g.lineStyle(2, ctx.tint(WATER.pale), 0.85);
    g.beginPath();
    g.arc(x, y, r + 3, -Math.PI / 2, -Math.PI / 2 + hp * Math.PI * 2);
    g.strokePath();
  }
}

function pop(ctx: PreviewCtx, x: number, y: number, label: string, color: string): void {
  const t = ctx.adopt(ctx.scene.add.text(x, y, label, {
    fontSize: '11px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif',
    color, stroke: '#00224d', strokeThickness: 3,
  }).setOrigin(0.5).setDepth(10));
  ctx.scene.tweens.add({ targets: t, y: y - 22, alpha: 0, duration: 900 });
}

export const bubbleBarrage: PreviewScript = {
  duration: 5600,
  caption: 'Alt Q — 20 bubbles cling to foes (4 each); a blast on a bubbled foe hits every bubble too',
  run(ctx) {
    const { fx, av } = stage(ctx);
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(7));
    type B = { x: number; y: number; vx: number; vy: number; slot: number; hp: number; dead: boolean };
    const bubbles: B[] = [];
    let worn = 0;
    ctx.at(250, () => {
      av.play('sweep', ctx.aim);
      fx.muzzleSpray(ctx.cx + 26, ctx.cy, ctx.aim, 1.4);
      for (let i = 0; i < 20; i++) {
        ctx.at(i * 28, () => {
          const a = ctx.aim + (Math.random() * 2 - 1) * 0.55;
          const sp = 240 + Math.random() * 140;
          bubbles.push({ x: ctx.cx + Math.cos(a) * 24, y: ctx.cy + Math.sin(a) * 24, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, slot: -1, hp: 1, dead: false });
        });
      }
    });
    // The payoff: one 10-damage blast on the bubbled dummy hits it and all four bubbles.
    ctx.at(3200, () => {
      fx.splash(ctx.tx, ctx.ty, 56);
      pop(ctx, ctx.tx, ctx.ty - 40, '-10 + 4×5 = -30', '#bbeeff');
      for (const b of bubbles) if (b.slot >= 0) b.hp = 0.87;
    });
    ctx.onFrame((dt, elapsed) => {
      const s = dt / 1000;
      const t = elapsed / 1000;
      g.clear();
      for (const b of bubbles) {
        if (b.dead) continue;
        if (b.slot >= 0) {
          const a = (b.slot / 4) * Math.PI * 2 + t * 0.8;
          b.x = ctx.tx + Math.cos(a) * 22;
          b.y = ctx.ty + Math.sin(a) * 19;
          g.lineStyle(1, ctx.tint(WATER.cyan), 0.35);
          g.lineBetween(ctx.tx, ctx.ty, b.x, b.y);
          drawBubble(g, ctx, b.x, b.y, 11, t, b.hp);
          continue;
        }
        const drag = Math.exp(-1.3 * s);
        b.vx *= drag; b.vy *= drag;
        b.x += b.vx * s; b.y += b.vy * s - 10 * s;
        if (Phaser.Math.Distance.Between(b.x, b.y, ctx.tx, ctx.ty) < 29) {
          if (worn < 4) { b.slot = worn++; fx.ring(b.x, b.y, 4, 18, WATER.foam, 200, 2, 7); if (worn === 4) pop(ctx, ctx.tx, ctx.ty - 46, '🫧 BUBBLED ×4', '#bbeeff'); }
          else { b.dead = true; fx.ring(b.x, b.y, 5, 27, WATER.foam, 260, 3, 7); pop(ctx, ctx.tx, ctx.ty - 34, '🫧 POP -8', '#ddf6ff'); }
          continue;
        }
        if (Math.hypot(b.vx, b.vy) < 40) { b.dead = true; fx.ring(b.x, b.y, 5, 20, WATER.foam, 200, 2, 7); continue; }
        drawBubble(g, ctx, b.x, b.y, 9, t);
      }
    });
  },
};

export const perkDrippy: PreviewScript = {
  duration: 4200,
  caption: 'Perk — Drippy: a 20px slowing puddle every 46px you walk, for 2.6s',
  run(ctx) {
    const { fx } = stage(ctx);
    const y = ctx.cy + 30;
    const x0 = 30, x1 = ctx.w - 40;
    ctx.at(200, () => ctx.glideCaster({ from: { x: x0, y }, to: { x: x1, y }, ms: 2800, ease: 'linear' }));
    let last = x0;
    ctx.onFrame((_dt, elapsed) => {
      const p = ctx.casterAt();
      if (elapsed < 200 || p.x - last < 46) return;
      last = p.x;
      pool(ctx, p.x, p.y + 6, 20, 2600, elapsed);
      fx.spray(p.x, p.y + 4, 3, { speed: 60, size: 2.2, life: 320, fall: 18, depth: 4 });
    });
  },
};

export const perkSplashy: PreviewScript = {
  duration: 3000,
  caption: 'Perk — Splashy: pools 50% wider, and Water Cut splashes 4 damage within 64px',
  run(ctx) {
    const { fx, av } = stage(ctx);
    for (let i = 0; i < 3; i++) {
      ctx.at(250 + i * 600, () => {
        av.play('punch', ctx.aim);
        const sx = ctx.cx + 32;
        fx.muzzleSpray(sx, ctx.cy, ctx.aim, 0.85);
        ctx.fly({
          texture: 'proj-water', from: { x: sx, y: ctx.cy }, to: { x: ctx.tx, y: ctx.ty }, speed: 620,
          onHit: () => {
            fx.ring(ctx.tx, ctx.ty, 10, 64, WATER.foam, 300, 3, 6);
            fx.spray(ctx.tx, ctx.ty, 9, { speed: 170, size: 2.6, life: 380, fall: 30, depth: 7 });
            pop(ctx, ctx.tx, ctx.ty - 36, 'SPLASH 4', '#bbeeff');
          },
        });
      });
    }
    pool(ctx, ctx.cx + 40, ctx.cy + 60, 54, 2600, 200);
  },
};

export const perkPoseidon: PreviewScript = {
  duration: 4400,
  scale: 0.85,
  caption: "Perk — Poseidon: wave cuts shove, the dodge rides a wave, every ultimate sends a 25-damage wave",
  run(ctx) {
    const { fx, av } = stage(ctx);
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(8));
    ctx.at(200, () => {
      av.play('punch', ctx.aim);
      ctx.fly({
        texture: 'proj-water', from: { x: ctx.cx + 32, y: ctx.cy }, to: { x: ctx.tx, y: ctx.ty }, speed: 620,
        onHit: () => { fx.crown(ctx.tx, ctx.ty, 22, 7, 7); pop(ctx, ctx.tx, ctx.ty - 34, 'SHOVE', '#88ddff'); },
      });
    });
    ctx.at(1300, () => { av.play('raise', ctx.aim, 600); pop(ctx, ctx.cx, ctx.cy - 50, "🔱 POSEIDON'S WAVE", '#55ccff'); });
    let hit = false;
    ctx.onFrame((_dt, elapsed) => {
      g.clear();
      const t = elapsed - 1500;
      if (t < 0 || t > 1500) return;
      const front = -30 + (ctx.w + 90) * (t / 1100);
      const layers: Array<[number, number, number]> = [[90, WATER.deep, 0.7], [56, WATER.ocean, 0.8], [27, WATER.bright, 0.85]];
      for (const [w, c, a] of layers) {
        g.fillStyle(ctx.tint(c), a);
        g.fillRect(front - w, 0, w, ctx.h);
      }
      g.lineStyle(4, ctx.tint(WATER.white), 0.9);
      g.lineBetween(front, 0, front, ctx.h);
      if (!hit && front >= ctx.tx) {
        hit = true;
        fx.splash(ctx.tx, ctx.ty, 40);
        pop(ctx, ctx.tx, ctx.ty - 40, '-25', '#bbeeff');
      }
    });
  },
};
