import Phaser from 'phaser';
import { PreviewCtx, PreviewScript } from '../../../ui/AbilityPreview';

const CLAY = 0x9a5c32;
const DARK = 0x57321f;
const LIGHT = 0xc38352;
const BLUE = 0x4e9cff;

function layer(ctx: PreviewCtx, depth = 8): Phaser.GameObjects.Graphics {
  return ctx.adopt(ctx.scene.add.graphics().setDepth(depth));
}

function golem(g: Phaser.GameObjects.Graphics, x: number, y: number, phase: number, scale = 1, alpha = 1): void {
  const bob = Math.sin(phase) * 2;
  g.fillStyle(DARK, 0.45 * alpha); g.fillEllipse(x, y + 30 * scale, 70 * scale, 18 * scale);
  g.fillStyle(0x704128, alpha); g.fillCircle(x, y + bob, 34 * scale);
  g.fillCircle(x - 25 * scale, y + 10 + bob, 16 * scale);
  g.fillCircle(x + 25 * scale, y + 10 + bob, 16 * scale);
  g.fillStyle(CLAY, alpha); g.fillCircle(x - 8 * scale, y - 10 + bob, 24 * scale); g.fillCircle(x + 13 * scale, y - 4 + bob, 23 * scale);
  g.fillStyle(0xf3d7ae, alpha); g.fillCircle(x - 10 * scale, y - 12 + bob, 5 * scale); g.fillCircle(x + 12 * scale, y - 10 + bob, 5 * scale);
  g.fillStyle(0x24150e, alpha); g.fillCircle(x - 9 * scale, y - 12 + bob, 2.2 * scale); g.fillCircle(x + 13 * scale, y - 10 + bob, 2.2 * scale);
}

function shard(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha = 1): void {
  const dx = Math.cos(a); const dy = Math.sin(a); const px = -dy; const py = dx;
  g.fillStyle(DARK, 0.7 * alpha);
  g.fillTriangle(x + dx * 15, y + dy * 15, x - dx * 11 + px * 6, y - dy * 11 + py * 6, x - dx * 11 - px * 6, y - dy * 11 - py * 6);
  g.fillStyle(LIGHT, alpha);
  g.fillTriangle(x + dx * 12, y + dy * 12, x - dx * 8 + px * 3, y - dy * 8 + py * 3, x - dx * 8 - px * 3, y - dy * 8 - py * 3);
}

function tag(ctx: PreviewCtx, text: string, color: string): Phaser.GameObjects.Text {
  return ctx.adopt(ctx.scene.add.text(ctx.cx, ctx.cy - 65, text, {
    fontFamily: '"Trebuchet MS", sans-serif', fontSize: '12px', color,
    stroke: '#120b08', strokeThickness: 3,
  }).setOrigin(0.5).setDepth(20));
}

export const gooeyGolem: PreviewScript = {
  duration: 4200,
  caption: 'Passive — the cursor leads an immortal, oversized projectile sponge',
  run(ctx) {
    const g = layer(ctx);
    const infinity = tag(ctx, '∞', '#e4ad7a').setAlpha(0);
    ctx.onFrame((_dt, elapsed) => {
      const gx = ctx.cx + 112 + Math.sin(elapsed / 650) * 44;
      const gy = ctx.cy - 2 + Math.cos(elapsed / 820) * 24;
      const shotT = Phaser.Math.Clamp((elapsed - 700) / 1050, 0, 1);
      const sx = Phaser.Math.Linear(ctx.w - 25, gx, shotT);
      const sy = Phaser.Math.Linear(ctx.cy - 25, gy, shotT);
      g.clear();
      g.lineStyle(2, DARK, 0.85); g.lineBetween(ctx.cx, ctx.cy, gx, gy);
      golem(g, gx, gy, elapsed / 170);
      if (shotT < 0.98) { g.fillStyle(0xff765e, 1); g.fillCircle(sx, sy, 6); }
      const hit = shotT >= 0.94 && shotT < 1;
      if (hit) { g.lineStyle(5, LIGHT, 0.8); g.strokeCircle(gx, gy, 42 + (shotT - 0.94) * 150); }
      infinity.setPosition(gx, gy - 49).setAlpha(elapsed > 1680 && elapsed < 2450 ? 1 - Math.abs(elapsed - 2050) / 380 : 0);
    });
  },
};

export const slam: PreviewScript = {
  duration: 3400,
  caption: 'Click — the golem slams its own position for 20 damage in a 118px circle',
  run(ctx) {
    ctx.addDummy();
    const g = layer(ctx);
    const gx = ctx.tx - 62; const gy = ctx.ty;
    ctx.onFrame((_dt, elapsed) => {
      g.clear();
      const wind = Phaser.Math.Clamp((elapsed - 250) / 450, 0, 1);
      golem(g, gx, gy - Math.sin(wind * Math.PI) * 24, elapsed / 130, 1 + wind * 0.08);
      const t = Phaser.Math.Clamp((elapsed - 700) / 650, 0, 1);
      if (t > 0 && t < 1) {
        const r = Phaser.Math.Easing.Cubic.Out(t) * 118;
        g.lineStyle(10 * (1 - t) + 1, LIGHT, 0.85 * (1 - t)); g.strokeCircle(gx, gy, r);
        for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; g.fillStyle(CLAY, 1 - t); g.fillCircle(gx + Math.cos(a) * r * 0.8, gy + Math.sin(a) * r * 0.8, 5 * (1 - t)); }
      }
    });
  },
};

export const rupture: PreviewScript = {
  duration: 3600,
  caption: 'E — eight evenly spaced 25-damage shards pierce every body in their path',
  run(ctx) {
    ctx.addDummy();
    const g = layer(ctx);
    const gx = ctx.cx + 95; const gy = ctx.cy;
    ctx.onFrame((_dt, elapsed) => {
      g.clear();
      if (elapsed < 520) golem(g, gx, gy, elapsed / 150, 1 + elapsed / 520 * 0.12);
      const t = Math.max(0, elapsed - 520) / 1000;
      if (t <= 1.35) {
        for (let i = 0; i < 8; i++) {
          const a = Math.PI / 8 + i * Math.PI / 4;
          const d = Math.min(245, t * 310);
          shard(g, gx + Math.cos(a) * d, gy + Math.sin(a) * d, a, Phaser.Math.Clamp(1.5 - t, 0, 1));
        }
      }
      if (elapsed >= 520 && elapsed < 980) { const p = (elapsed - 520) / 460; g.lineStyle(7 * (1 - p), LIGHT, 1 - p); g.strokeCircle(gx, gy, p * 78); }
    });
  },
};

export const clot: PreviewScript = {
  duration: 5000,
  caption: 'R — draw the shield yourself; projectile impacts erase only the clay they touch',
  run(ctx) {
    const g = layer(ctx);
    const bar = layer(ctx, 18);
    ctx.onFrame((_dt, elapsed) => {
      g.clear(); bar.clear();
      const drawing = elapsed < 1800;
      const made = Math.floor(Phaser.Math.Clamp(elapsed / 1800, 0, 1) * 34);
      const spin = drawing ? 0 : (elapsed - 1800) / 1000 * 0.62;
      const shotT = Phaser.Math.Clamp((elapsed - 2350) / 900, 0, 1);
      const eroded = elapsed > 3150;
      if (drawing) { g.lineStyle(3, BLUE, 0.72); g.strokeCircle(ctx.cx, ctx.cy, 118); }
      for (let i = 0; i < made; i++) {
        const a = -2.5 + i / 33 * 5 + spin;
        if (eroded && Math.abs(Phaser.Math.Angle.Wrap(a - spin)) < 0.38) continue;
        const r = 94 + Math.sin(i * 0.72) * 17;
        const x = ctx.cx + Math.cos(a) * r; const y = ctx.cy + Math.sin(a) * r;
        g.fillStyle(LIGHT, 1); g.fillCircle(x, y, 6);
      }
      if (drawing) {
        const ratio = 1 - made / 34;
        bar.fillStyle(0x111827, 0.9); bar.fillRoundedRect(ctx.cx - 43, ctx.cy - 62, 86, 9, 3);
        bar.fillStyle(LIGHT, 1); bar.fillRoundedRect(ctx.cx - 41, ctx.cy - 60, 82 * ratio, 5, 2);
      }
      if (shotT > 0 && shotT < 0.98) {
        const impactX = ctx.cx + 102; const impactY = ctx.cy;
        g.fillStyle(0xff765e, 1); g.fillCircle(Phaser.Math.Linear(ctx.w - 20, impactX, shotT), impactY, 6);
      }
      if (elapsed > 3150 && elapsed < 3500) { const t = (elapsed - 3150) / 350; g.lineStyle(5 * (1 - t), LIGHT, 1 - t); g.strokeCircle(ctx.cx + 102, ctx.cy, 12 + t * 28); }
    });
  },
};

export const slink: PreviewScript = {
  duration: 5000,
  caption: 'F — race around the arena wall and spend up to three eight-shard barrages',
  run(ctx) {
    ctx.addDummy();
    const g = layer(ctx);
    ctx.onFrame((_dt, elapsed) => {
      g.clear();
      let x = ctx.cx; let y = ctx.cy;
      if (elapsed < 650) { const t = Phaser.Math.Easing.Cubic.Out(elapsed / 650); y = Phaser.Math.Linear(ctx.cy, 24, t); }
      else if (elapsed < 2800) { const t = (elapsed - 650) / 2150; x = Phaser.Math.Linear(ctx.cx, ctx.w - 42, t); y = 24; }
      else { x = ctx.w - 42; y = Phaser.Math.Linear(24, ctx.h - 28, Phaser.Math.Clamp((elapsed - 2800) / 1200, 0, 1)); }
      ctx.moveCaster(x, y, { facing: Math.atan2(ctx.ty - y, ctx.tx - x) });
      g.fillStyle(CLAY, 0.3); g.fillEllipse(x, y + 10, 58, 18);
      for (const fireAt of [1250, 2050, 2850]) {
        const t = (elapsed - fireAt) / 760;
        if (t < 0 || t > 1) continue;
        const a0 = Math.atan2(ctx.ty - y, ctx.tx - x);
        for (let i = 0; i < 8; i++) { const a = a0 + (i - 3.5) * 0.065; shard(g, x + Math.cos(a) * t * 290, y + Math.sin(a) * t * 290, a, 1 - t * 0.25); }
      }
    });
  },
};

export const fuse: PreviewScript = {
  duration: 6000,
  caption: 'Q — merge into eight damage instances, then split each surviving layer into six shards',
  run(ctx) {
    ctx.addDummy();
    const g = layer(ctx);
    const pips = layer(ctx, 18);
    ctx.onFrame((_dt, elapsed) => {
      g.clear(); pips.clear();
      const merge = Phaser.Math.Clamp(elapsed / 900, 0, 1);
      const gx = Phaser.Math.Linear(ctx.cx + 145, ctx.cx, Phaser.Math.Easing.Cubic.In(merge));
      if (merge < 1) { g.lineStyle(2, DARK, 0.8); g.lineBetween(ctx.cx, ctx.cy, gx, ctx.cy); golem(g, gx, ctx.cy, elapsed / 140); }
      if (merge >= 1 && elapsed < 4750) {
        const dash = Phaser.Math.Clamp((elapsed - 2600) / 700, 0, 1);
        const x = Phaser.Math.Linear(ctx.cx, ctx.tx - 34, Phaser.Math.Easing.Cubic.Out(dash));
        ctx.moveCaster(x, ctx.cy);
        g.fillStyle(DARK, 0.75); g.fillCircle(x, ctx.cy + 2, 38); g.fillStyle(CLAY, 0.94); g.fillCircle(x, ctx.cy - 1, 33); g.fillStyle(LIGHT, 0.7); g.fillEllipse(x - 8, ctx.cy - 10, 23, 13);
        if (dash > 0 && dash < 1) for (let i = 0; i < 5; i++) { const px = Phaser.Math.Linear(ctx.cx, x, i / 4); g.fillStyle(DARK, 0.22); g.fillEllipse(px, ctx.cy + 20, 55, 22); }
        if (elapsed > 3300 && elapsed < 3900) { const t = (elapsed - 3300) / 600; g.lineStyle(8 * (1 - t), LIGHT, 1 - t); g.strokeCircle(x, ctx.cy, t * 118); }
        const left = elapsed > 2100 ? 7 : 8;
        for (let i = 0; i < 8; i++) { pips.fillStyle(i < left ? LIGHT : 0x32231d, i < left ? 1 : 0.55); pips.fillRoundedRect(x - 39 + i * 10, ctx.cy - 61, 7, 10, 2); }
      }
      if (elapsed >= 4750) {
        const t = (elapsed - 4750) / 900;
        ctx.moveCaster(ctx.tx - 34, ctx.cy);
        for (let i = 0; i < 42; i++) { const a = i / 42 * Math.PI * 2; shard(g, ctx.tx - 34 + Math.cos(a) * t * 230, ctx.cy + Math.sin(a) * t * 230, a, Phaser.Math.Clamp(1.15 - t, 0, 1)); }
      }
    });
  },
};

// Upgrade cards retain the base choreography; their captions and codex copy explain the added
// layer while the live arena preview supplies the fully interactive behavior.
export const slamUpgraded = slam;
export const ruptureUpgraded = rupture;
export const clotUpgraded = clot;
export const slinkUpgraded = slink;
export const fuseUpgraded = fuse;

export const bedrock: PreviewScript = {
  duration: 4400,
  caption: 'Mastery passive — black bedrock protects its nearby caster and turns fused dashes into stunning crashes',
  run(ctx) {
    const g = layer(ctx);
    ctx.onFrame((_dt, elapsed) => {
      g.clear();
      const gx = ctx.cx + 105 + Math.sin(elapsed / 600) * 24;
      g.lineStyle(2, 0x292322, 0.9); g.lineBetween(ctx.cx, ctx.cy, gx, ctx.cy);
      g.fillStyle(0x111111, 0.7); g.fillEllipse(gx, ctx.cy + 31, 76, 21);
      g.fillStyle(0x242020, 1); g.fillCircle(gx, ctx.cy, 36); g.fillCircle(gx - 27, ctx.cy + 10, 18); g.fillCircle(gx + 27, ctx.cy + 10, 18);
      g.lineStyle(4, 0x625752, 0.9); g.lineBetween(gx - 27, ctx.cy + 4, gx - 6, ctx.cy - 3); g.lineBetween(gx + 6, ctx.cy + 14, gx + 28, ctx.cy + 3);
      g.lineStyle(4, BLUE, 0.22); g.strokeCircle(gx, ctx.cy, 126 + Math.sin(elapsed / 260) * 3);
      const leap = Phaser.Math.Clamp((elapsed - 1800) / 900, 0, 1);
      if (leap > 0) {
        const x = Phaser.Math.Linear(ctx.cx, ctx.tx, leap), lift = Math.sin(leap * Math.PI) * 54;
        ctx.moveCaster(x, ctx.cy - lift);
        if (leap > 0.82) { const t = (leap - 0.82) / 0.18; g.lineStyle(10 * (1 - t), 0x302b29, 1 - t); g.strokeCircle(ctx.tx, ctx.cy, t * 118); }
      }
    });
  },
};

export const giveLife: PreviewScript = {
  duration: 5000,
  caption: 'Mastery ability — draw the creature: sharp forms hit harder, round forms move faster',
  run(ctx) {
    ctx.addDummy();
    const g = layer(ctx); const bar = layer(ctx, 18);
    const pts = Array.from({ length: 25 }, (_, i) => {
      const a = i / 24 * Math.PI * 2, r = i % 4 === 0 ? 68 : 40;
      return { x: Math.cos(a) * r, y: Math.sin(a) * r };
    });
    ctx.onFrame((_dt, elapsed) => {
      g.clear(); bar.clear();
      const drawing = elapsed < 1800, made = Math.floor(Phaser.Math.Clamp(elapsed / 1800, 0, 1) * pts.length);
      const chase = Phaser.Math.Clamp((elapsed - 1800) / 2000, 0, 1), cx = Phaser.Math.Linear(ctx.cx + 105, ctx.tx - 18, chase), cy = ctx.cy;
      if (drawing) { g.lineStyle(3, BLUE, 0.8); g.strokeCircle(ctx.cx + 105, ctx.cy, 82); }
      for (let i = 1; i < (drawing ? made : pts.length); i++) {
        g.lineStyle(12, DARK, 0.75); g.lineBetween(cx + pts[i - 1].x, cy + pts[i - 1].y, cx + pts[i].x, cy + pts[i].y);
        g.lineStyle(7, LIGHT, 0.95); g.lineBetween(cx + pts[i - 1].x, cy + pts[i - 1].y, cx + pts[i].x, cy + pts[i].y);
      }
      if (drawing) { bar.fillStyle(0x111827, 0.9); bar.fillRoundedRect(ctx.cx - 43, ctx.cy - 72, 86, 9, 3); bar.fillStyle(LIGHT, 1); bar.fillRoundedRect(ctx.cx - 41, ctx.cy - 70, 82 * (1 - made / pts.length), 5, 2); }
    });
  },
};
