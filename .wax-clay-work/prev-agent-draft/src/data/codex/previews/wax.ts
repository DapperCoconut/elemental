import Phaser from 'phaser';
import { PreviewCtx, PreviewScript } from '../../../ui/AbilityPreview';

const WAX = 0xf2c85b;
const LIGHT = 0xffefad;
const HONEY = 0xd99518;
const DARK = 0x2b2115;

function layer(ctx: PreviewCtx, depth = 10): Phaser.GameObjects.Graphics {
  return ctx.adopt(ctx.scene.add.graphics().setDepth(depth));
}

function bee(
  g: Phaser.GameObjects.Graphics, x: number, y: number, flap: number, scale = 1, elite = false,
): void {
  g.fillStyle(0xf7f3df, 0.7); g.fillEllipse(x - 3 * scale, y - flap, 9 * scale, 6 * scale); g.fillEllipse(x + 3 * scale, y - flap, 9 * scale, 6 * scale);
  g.fillStyle(elite ? 0xe83f36 : HONEY, 1); g.fillEllipse(x, y, 13 * scale, 8 * scale);
  g.lineStyle(2 * scale, DARK, 0.95); g.lineBetween(x - 2 * scale, y - 4 * scale, x - 2 * scale, y + 4 * scale); g.lineBetween(x + 3 * scale, y - 3 * scale, x + 3 * scale, y + 3 * scale);
  g.fillStyle(DARK, 1); g.fillCircle(x + 6 * scale, y, 3 * scale);
}

export const stingerStrikes: PreviewScript = {
  duration: 3500,
  caption: 'Click — six varied 5-damage thrusts; land all six for a 10-damage poisonous finisher',
  run(ctx) {
    ctx.addDummy();
    const g = layer(ctx);
    ctx.onFrame((_dt, elapsed) => {
      g.clear();
      const cycle = elapsed % 2100;
      const aim = Math.atan2(ctx.ty - ctx.cy, ctx.tx - ctx.cx);
      const offsets = [-7.5, -5, -2.5, 2.5, 5, 7.5].map(Phaser.Math.DegToRad);
      offsets.forEach((off, i) => {
        const age = cycle - i * 120;
        if (age < 0 || age > 260) return;
        const p = Phaser.Math.Clamp(age / 150, 0, 1);
        const a = aim + off;
        g.lineStyle(5 - p * 2, WAX, 1 - Math.max(0, (age - 150) / 110));
        g.lineBetween(ctx.cx, ctx.cy, ctx.cx + Math.cos(a) * 205 * p, ctx.cy + Math.sin(a) * 205 * p);
      });
      const finalAge = cycle - 840;
      if (finalAge >= 0 && finalAge < 420) {
        const p = Phaser.Math.Clamp(finalAge / 170, 0, 1);
        g.lineStyle(11 - p * 5, LIGHT, 1 - Math.max(0, (finalAge - 210) / 210));
        g.lineBetween(ctx.cx, ctx.cy, ctx.cx + Math.cos(aim) * 225 * p, ctx.cy + Math.sin(aim) * 225 * p);
        g.lineStyle(3, 0x83cf42, 0.65 * (1 - finalAge / 420)); g.strokeCircle(ctx.tx, ctx.ty, 29 + p * 8);
      }
    });
  },
};

export const swarm: PreviewScript = {
  duration: 4200,
  caption: 'E — 15 bees fan out, latch for 3 seconds and add uncapped 1% vulnerability each',
  run(ctx) {
    ctx.addDummy();
    const g = layer(ctx);
    ctx.onFrame((_dt, elapsed) => {
      g.clear();
      const t = Phaser.Math.Clamp(elapsed / 1000, 0, 1);
      const base = Math.atan2(ctx.ty - ctx.cy, ctx.tx - ctx.cx);
      for (let i = 0; i < 15; i++) {
        const lane = i / 14 - 0.5;
        const a = base + lane * Phaser.Math.DegToRad(48);
        const x = t < 1 ? ctx.cx + Math.cos(a) * t * 265 : ctx.tx + Math.cos(i * 2.2) * (16 + i % 3 * 7);
        const y = t < 1 ? ctx.cy + Math.sin(a) * t * 265 : ctx.ty + Math.sin(i * 2.2) * (13 + i % 3 * 5);
        bee(g, x, y, 4 + Math.sin(elapsed / 45 + i) * 2, 0.82);
      }
      if (elapsed > 1000) { g.lineStyle(2, HONEY, 0.4); g.strokeCircle(ctx.tx, ctx.ty, 31); }
    });
  },
};

export const candleMount: PreviewScript = {
  duration: 5000,
  caption: 'R — a 12-second melting aura: 15% resistance and +2 seconds of bee lifetime per candle',
  run(ctx) {
    const g = layer(ctx);
    ctx.onFrame((_dt, elapsed) => {
      g.clear();
      const left = 1 - (elapsed % 5000) / 6000;
      const x = ctx.cx + 105; const y = ctx.cy + 28; const h = 18 + left * 46;
      g.fillStyle(WAX, 0.08); g.fillCircle(x, y, 125);
      g.lineStyle(2, WAX, 0.28); g.strokeCircle(x, y, 125);
      g.fillStyle(WAX, 1); g.fillRoundedRect(x - 10, y - h, 20, h, 5);
      g.fillStyle(LIGHT, 0.8); g.fillRect(x - 6, y - h + 6, 4, h - 12);
      g.lineStyle(2, DARK, 1); g.lineBetween(x, y - h, x, y - h - 6);
      g.fillStyle(0xff8b24, 1); g.fillEllipse(x, y - h - 12, 10, 18);
    });
  },
};

export const hiveHearth: PreviewScript = {
  duration: 5600,
  caption: 'F — feed five hive cells with projectiles, then redeem 25 orbiting bees and a 3-bee shield',
  run(ctx) {
    const g = layer(ctx);
    ctx.onFrame((_dt, elapsed) => {
      g.clear();
      const hx = ctx.cx + 105; const hy = ctx.cy + 20;
      const cells = Math.min(5, Math.floor(elapsed / 700));
      if (elapsed < 3900) {
        g.fillStyle(HONEY, 1); g.fillEllipse(hx, hy, 58, 51); g.fillStyle(DARK, 1); g.fillEllipse(hx, hy + 8, 16, 9);
        for (let i = 0; i < 5; i++) { g.fillStyle(i < cells ? 0xffd42a : 0x4c4127, 1); g.fillRoundedRect(hx - 31 + i * 13, hy - 43, 11, 8, 2); }
        const incoming = (elapsed % 700) / 700;
        bee(g, Phaser.Math.Linear(ctx.cx, hx, incoming), Phaser.Math.Linear(ctx.cy, hy, incoming), 5, 0.8);
      } else {
        for (let i = 0; i < 25; i++) {
          const a = elapsed / 250 + i / 25 * Math.PI * 2;
          const r = 48 + i % 3 * 13;
          bee(g, ctx.cx + Math.cos(a) * r, ctx.cy + Math.sin(a) * r * 0.6, 4 + Math.sin(elapsed / 45 + i) * 2, 0.7);
        }
      }
    });
  },
};

export const stickyBombs: PreviewScript = {
  duration: 5000,
  caption: 'Q — ten bombs stick for 20 seconds; recast for 20 each and +15% total damage per stack',
  run(ctx) {
    ctx.addDummy();
    const g = layer(ctx);
    ctx.onFrame((_dt, elapsed) => {
      g.clear();
      const fly = Phaser.Math.Clamp(elapsed / 900, 0, 1);
      for (let i = 0; i < 10; i++) {
        const a = Math.atan2(ctx.ty - ctx.cy, ctx.tx - ctx.cx) + (i / 9 - 0.5) * Phaser.Math.DegToRad(54);
        const x = fly < 1 ? ctx.cx + Math.cos(a) * fly * 270 : ctx.tx + Math.cos(i * 2.3) * (14 + i % 3 * 7);
        const y = fly < 1 ? ctx.cy + Math.sin(a) * fly * 270 : ctx.ty + Math.sin(i * 2.3) * (12 + i % 3 * 5);
        g.fillStyle(DARK, 1); g.fillCircle(x, y, 7); g.fillStyle(LIGHT, 1); g.fillCircle(x - 1, y - 1, 4);
      }
      if (elapsed > 2800) {
        const p = Phaser.Math.Clamp((elapsed - 2800) / 700, 0, 1);
        g.fillStyle(LIGHT, 0.35 * (1 - p)); g.fillCircle(ctx.tx, ctx.ty, 28 + p * 90);
        g.lineStyle(9 * (1 - p) + 1, HONEY, 1 - p); g.strokeCircle(ctx.tx, ctx.ty, 18 + p * 105);
      }
    });
  },
};

export const stingerStrikesUpgraded: PreviewScript = {
  duration: 4300,
  caption: 'Click+ — five ranged stingers; a perfect volley fires a black 12-damage rope dart and pulls the target in',
  run(ctx) {
    ctx.addDummy();
    const g = layer(ctx);
    ctx.onFrame((_dt, elapsed) => {
      g.clear();
      const cycle = elapsed % 3000;
      const aim = ctx.aim;
      for (let i = 0; i < 5; i++) {
        const age = cycle - i * 90;
        if (age < 0 || age > 850) continue;
        const a = aim + Phaser.Math.DegToRad((i - 2) * 2.5);
        const p = Phaser.Math.Clamp(age / 650, 0, 1);
        const x = Phaser.Math.Linear(ctx.cx, ctx.tx, p);
        const y = Phaser.Math.Linear(ctx.cy, ctx.ty, p) + Math.sin(a - aim) * 160 * p;
        g.lineStyle(4, DARK, 1 - Math.max(0, (age - 700) / 150));
        g.lineBetween(x - Math.cos(a) * 12, y - Math.sin(a) * 12, x + Math.cos(a) * 8, y + Math.sin(a) * 8);
      }
      const grappleAge = cycle - 1150;
      if (grappleAge >= 0 && grappleAge < 950) {
        const p = Phaser.Math.Clamp(grappleAge / 520, 0, 1);
        const x = Phaser.Math.Linear(ctx.cx, ctx.tx, p);
        g.lineStyle(3, 0x090806, 0.95); g.lineBetween(ctx.cx, ctx.cy, x, ctx.ty);
        g.fillStyle(0x090806, 1); g.fillTriangle(x + 16, ctx.ty, x - 9, ctx.ty - 10, x - 9, ctx.ty + 10);
      }
    });
  },
};

export const swarmUpgraded: PreviewScript = {
  duration: 5000,
  caption: 'E+ — three red elites deal 3 damage per second, last 5 seconds, and apply the full poison',
  run(ctx) {
    ctx.addDummy();
    const g = layer(ctx);
    ctx.onFrame((_dt, elapsed) => {
      g.clear();
      const t = Phaser.Math.Clamp(elapsed / 1000, 0, 1);
      for (let i = 0; i < 15; i++) {
        const a = ctx.aim + (i / 14 - 0.5) * Phaser.Math.DegToRad(48);
        const x = t < 1 ? ctx.cx + Math.cos(a) * t * 265 : ctx.tx + Math.cos(i * 2.2) * (16 + i % 3 * 7);
        const y = t < 1 ? ctx.cy + Math.sin(a) * t * 265 : ctx.ty + Math.sin(i * 2.2) * (13 + i % 3 * 5);
        bee(g, x, y, 4 + Math.sin(elapsed / 45 + i) * 2, 0.82, i % 5 === 2);
      }
      if (elapsed > 1000) { g.lineStyle(3, 0x83cf42, 0.55); g.strokeCircle(ctx.tx, ctx.ty, 32); }
    });
  },
};

export const candleMountUpgraded: PreviewScript = {
  duration: 5200,
  caption: 'R+ — hits harden the aura by 2% for 5 seconds and spill hot wax; the melting candle drips more every 3–4 seconds',
  run(ctx) {
    const g = layer(ctx);
    ctx.onFrame((_dt, elapsed) => {
      g.clear();
      const x = ctx.cx + 105; const y = ctx.cy + 28;
      g.fillStyle(WAX, 0.08); g.fillCircle(x, y, 125); g.lineStyle(3, WAX, 0.35); g.strokeCircle(x, y, 125);
      g.fillStyle(WAX, 1); g.fillRoundedRect(x - 10, y - 48, 20, 52, 5);
      g.fillStyle(0xff8b24, 0.36); g.fillEllipse(ctx.cx - 12, ctx.cy + 19, 86, 45);
      if (elapsed > 2600) { g.fillStyle(0xff8b24, 0.32); g.fillEllipse(x + 48, y + 14, 82, 42); }
      const stacks = Math.min(5, Math.floor(elapsed / 800));
      for (let i = 0; i < stacks; i++) { g.fillStyle(LIGHT, 0.9); g.fillCircle(ctx.cx - 30 + i * 15, ctx.cy - 41, 5); }
    });
  },
};

export const hiveHearthUpgraded: PreviewScript = {
  duration: 6000,
  caption: 'F+ — up to 50 honey heals on collection and creates one separate 10-second healing puddle per 10 honey',
  run(ctx) {
    const g = layer(ctx);
    ctx.onFrame((_dt, elapsed) => {
      g.clear();
      const hx = ctx.cx + 105; const hy = ctx.cy + 16;
      if (elapsed < 3600) {
        const honey = Phaser.Math.Clamp(elapsed / 3600, 0, 1);
        g.fillStyle(HONEY, 1); g.fillEllipse(hx, hy, 58, 51); g.fillStyle(DARK, 1); g.fillEllipse(hx, hy + 8, 16, 9);
        g.fillStyle(0x17130d, 0.95); g.fillRoundedRect(hx - 33, hy - 48, 66, 9, 3);
        g.fillStyle(0xffbd27, 1); g.fillRoundedRect(hx - 31, hy - 46, 62 * honey, 5, 2);
      } else {
        for (let i = 0; i < 5; i++) {
          const a = i / 5 * Math.PI * 2;
          const x = ctx.cx + Math.cos(a) * 78; const y = ctx.cy + Math.sin(a) * 46 + 18;
          g.fillStyle(HONEY, 0.28); g.fillEllipse(x, y, 68, 45); g.lineStyle(2, DARK, 0.55); g.strokeEllipse(x, y, 68, 45);
        }
      }
    });
  },
};

export const stickyBombsUpgraded: PreviewScript = {
  duration: 5200,
  caption: 'Q+ — hold 2 seconds to strap ten bombs on, take +25% damage, then detonate a 500-damage body-centered blast',
  run(ctx) {
    const g = layer(ctx);
    ctx.onFrame((_dt, elapsed) => {
      g.clear();
      const charge = Phaser.Math.Clamp(elapsed / 2000, 0, 1);
      if (elapsed < 3300) {
        g.lineStyle(5, WAX, 0.9); g.beginPath(); g.arc(ctx.cx, ctx.cy, 40, -Math.PI / 2, -Math.PI / 2 + charge * Math.PI * 2); g.strokePath();
        if (charge >= 1) {
          for (let i = 0; i < 10; i++) {
            const a = elapsed / 260 + i / 10 * Math.PI * 2;
            const x = ctx.cx + Math.cos(a) * (29 + i % 2 * 8); const y = ctx.cy + Math.sin(a) * (20 + i % 2 * 6);
            g.fillStyle(DARK, 1); g.fillCircle(x, y, 7); g.fillStyle(LIGHT, 1); g.fillCircle(x - 1, y - 1, 4);
          }
        }
      } else {
        const p = Phaser.Math.Clamp((elapsed - 3300) / 800, 0, 1);
        g.fillStyle(LIGHT, 0.42 * (1 - p)); g.fillCircle(ctx.cx, ctx.cy, 25 + p * 150);
        g.lineStyle(11 * (1 - p) + 1, HONEY, 1 - p); g.strokeCircle(ctx.cx, ctx.cy, 18 + p * 165);
      }
    });
  },
};

export const beeVulnerability = swarm;
