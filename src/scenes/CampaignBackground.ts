import Phaser from 'phaser';
import { WORLDS } from '../data/Worlds';
import { ABSTRACT_WORLDS } from '../data/AbstractWorlds';
import { CORRUPT_WORLDS } from '../data/CorruptWorlds';

type ThemeFn = (
  scene: Phaser.Scene,
  ctr: Phaser.GameObjects.Container,
  w: number,
  h: number,
) => void;

// ── Shared base: solid fill + two radial glow layers ───────────────
function base(
  scene: Phaser.Scene,
  ctr: Phaser.GameObjects.Container,
  w: number,
  h: number,
  bgColor: number,
  glowColor: number,
): void {
  const g = scene.add.graphics();
  g.fillStyle(bgColor, 1);
  g.fillRect(0, 0, w, h);
  g.fillStyle(glowColor, 0.07);
  g.fillCircle(w / 2, h / 2, Math.max(w, h) * 0.65);
  g.fillStyle(glowColor, 0.05);
  g.fillCircle(w / 2, h / 2, Math.max(w, h) * 0.4);
  ctr.add(g);
}

// ── 15 element themes ──────────────────────────────────────────────
const THEMES: Record<string, ThemeFn> = {

  fire: (scene, ctr, w, h) => {
    base(scene, ctr, w, h, 0x1a0500, 0xff4400);
    const rnd = new Phaser.Math.RandomDataGenerator(['fire-bg']);
    const g = scene.add.graphics();
    for (let i = 0; i < 45; i++) {
      g.fillStyle(rnd.pick([0xff6600, 0xff8800, 0xffaa00, 0xff3300]), rnd.realInRange(0.25, 0.55));
      g.fillCircle(rnd.integerInRange(0, w), rnd.integerInRange(0, h), rnd.realInRange(1.5, 4.5));
    }
    for (let i = 0; i < 18; i++) {
      const sx = rnd.integerInRange(0, w);
      const sy = rnd.integerInRange(h * 0.3, h);
      g.lineStyle(rnd.realInRange(0.5, 1.5), 0xff4400, 0.18);
      g.lineBetween(sx, sy, sx + rnd.integerInRange(-10, 10), sy - rnd.integerInRange(20, 60));
    }
    ctr.add(g);
    scene.tweens.add({ targets: g, alpha: { from: 0.65, to: 1 }, duration: 1700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  },

  water: (scene, ctr, w, h) => {
    base(scene, ctr, w, h, 0x001a33, 0x0088ff);
    const rnd = new Phaser.Math.RandomDataGenerator(['water-bg']);
    const g = scene.add.graphics();
    for (let i = 0; i < 10; i++) {
      const baseY = rnd.integerInRange(20, h - 20);
      g.lineStyle(rnd.realInRange(0.5, 1.5), 0x0088ff, 0.14);
      for (let x = 0; x < w; x += 40) {
        const y1 = baseY + Math.sin(x * 0.025) * 14;
        const y2 = baseY + Math.sin((x + 40) * 0.025) * 14;
        g.lineBetween(x, y1, x + 40, y2);
      }
    }
    for (let i = 0; i < 22; i++) {
      g.lineStyle(0.6, 0x44aaff, 0.2);
      g.strokeCircle(rnd.integerInRange(0, w), rnd.integerInRange(0, h), rnd.realInRange(2, 8));
    }
    ctr.add(g);
    scene.tweens.add({ targets: g, y: { from: -6, to: 6 }, duration: 3200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  },

  earth: (scene, ctr, w, h) => {
    base(scene, ctr, w, h, 0x1a1408, 0x887755);
    const rnd = new Phaser.Math.RandomDataGenerator(['earth-bg']);
    const g = scene.add.graphics();
    for (let i = 0; i < 18; i++) {
      const cx = rnd.integerInRange(30, w - 30);
      const cy = rnd.integerInRange(30, h - 30);
      const s = rnd.integerInRange(15, 38);
      g.fillStyle(rnd.pick([0x554433, 0x664422, 0x443322, 0x776655]), rnd.realInRange(0.22, 0.48));
      g.fillTriangle(
        cx + rnd.integerInRange(-s, s), cy - rnd.integerInRange(0, s),
        cx - rnd.integerInRange(0, s), cy + rnd.integerInRange(0, s),
        cx + rnd.integerInRange(0, s), cy + rnd.integerInRange(0, s),
      );
    }
    for (let i = 0; i < 35; i++) {
      g.fillStyle(0x6a5540, rnd.realInRange(0.15, 0.35));
      g.fillCircle(rnd.integerInRange(0, w), rnd.integerInRange(0, h), rnd.realInRange(1, 3));
    }
    ctr.add(g);
    scene.tweens.add({ targets: g, alpha: { from: 0.7, to: 1 }, duration: 2800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  },

  life: (scene, ctr, w, h) => {
    base(scene, ctr, w, h, 0x0d1a08, 0x44cc44);
    const rnd = new Phaser.Math.RandomDataGenerator(['life-bg']);
    const g = scene.add.graphics();
    for (let i = 0; i < 14; i++) {
      let vx = rnd.integerInRange(0, w);
      let vy = rnd.integerInRange(0, h);
      g.lineStyle(rnd.realInRange(0.5, 1.5), 0x226611, 0.28);
      for (let s = 0; s < 8; s++) {
        const nx = vx + rnd.integerInRange(-30, 30);
        const ny = vy + rnd.integerInRange(-20, 20);
        g.lineBetween(vx, vy, nx, ny);
        vx = nx; vy = ny;
      }
    }
    for (let i = 0; i < 30; i++) {
      g.fillStyle(rnd.pick([0x44cc44, 0x338833, 0x66dd44]), rnd.realInRange(0.18, 0.4));
      g.fillEllipse(rnd.integerInRange(0, w), rnd.integerInRange(0, h), rnd.realInRange(4, 12), rnd.realInRange(7, 16));
    }
    ctr.add(g);
    scene.tweens.add({ targets: g, alpha: { from: 0.58, to: 0.95 }, duration: 3600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  },

  air: (scene, ctr, w, h) => {
    base(scene, ctr, w, h, 0x0a141c, 0xaaddff);
    const rnd = new Phaser.Math.RandomDataGenerator(['air-bg']);
    const g = scene.add.graphics();
    for (let i = 0; i < 14; i++) {
      const ax = rnd.integerInRange(50, w - 50);
      const ay = rnd.integerInRange(50, h - 50);
      const r = rnd.integerInRange(30, 110);
      const start = rnd.realInRange(0, Math.PI * 2);
      g.lineStyle(rnd.realInRange(0.5, 2), 0xaaddff, 0.1);
      g.beginPath();
      g.arc(ax, ay, r, start, start + rnd.realInRange(0.4, 1.5), false);
      g.strokePath();
    }
    for (let i = 0; i < 38; i++) {
      g.fillStyle(0xccddff, rnd.realInRange(0.08, 0.26));
      g.fillCircle(rnd.integerInRange(0, w), rnd.integerInRange(0, h), rnd.realInRange(0.5, 2));
    }
    ctr.add(g);
    scene.tweens.add({ targets: g, x: { from: -18, to: 18 }, duration: 4200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  },

  oil: (scene, ctr, w, h) => {
    base(scene, ctr, w, h, 0x0a0500, 0x664400);
    const rnd = new Phaser.Math.RandomDataGenerator(['oil-bg']);
    const g = scene.add.graphics();
    for (let i = 0; i < 12; i++) {
      g.fillStyle(0x221100, rnd.realInRange(0.3, 0.55));
      g.fillEllipse(rnd.integerInRange(30, w - 30), rnd.integerInRange(30, h - 30), rnd.integerInRange(30, 80), rnd.integerInRange(14, 38));
    }
    const shineG = scene.add.graphics();
    for (let i = 0; i < 10; i++) {
      shineG.lineStyle(rnd.realInRange(0.5, 1.5), 0x886633, 0.22);
      const sx = rnd.integerInRange(20, w - 20);
      const sy = rnd.integerInRange(20, h - 20);
      shineG.lineBetween(sx, sy, sx + rnd.integerInRange(10, 45), sy + rnd.integerInRange(-4, 4));
    }
    ctr.add(g);
    ctr.add(shineG);
    scene.tweens.add({ targets: shineG, alpha: { from: 0.35, to: 0.9 }, duration: 2400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  },

  ice: (scene, ctr, w, h) => {
    base(scene, ctr, w, h, 0x08141c, 0x88ccff);
    const rnd = new Phaser.Math.RandomDataGenerator(['ice-bg']);
    const g = scene.add.graphics();
    for (let i = 0; i < 24; i++) {
      const cx = rnd.integerInRange(20, w - 20);
      const cy = rnd.integerInRange(20, h - 20);
      const len = rnd.integerInRange(7, 24);
      g.fillStyle(rnd.pick([0x88ddff, 0xaaeeff, 0x66bbdd, 0xccffff]), rnd.realInRange(0.13, 0.32));
      g.fillTriangle(cx, cy - len, cx - len * 0.35, cy + len * 0.5, cx + len * 0.35, cy + len * 0.5);
    }
    for (let i = 0; i < 30; i++) {
      g.fillStyle(0xeeffff, rnd.realInRange(0.08, 0.22));
      g.fillCircle(rnd.integerInRange(0, w), rnd.integerInRange(0, h), rnd.realInRange(0.8, 2.2));
    }
    ctr.add(g);
    scene.tweens.add({ targets: g, alpha: { from: 0.6, to: 1 }, duration: 2600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  },

  growth: (scene, ctr, w, h) => {
    base(scene, ctr, w, h, 0x0a1408, 0x88bb22);
    const rnd = new Phaser.Math.RandomDataGenerator(['growth-bg']);
    const g = scene.add.graphics();
    for (let i = 0; i < 18; i++) {
      const cx = rnd.integerInRange(20, w - 20);
      const cy = rnd.integerInRange(20, h - 20);
      const r = rnd.integerInRange(12, 35);
      g.lineStyle(rnd.realInRange(0.5, 1.5), rnd.pick([0x88bb22, 0x66aa00, 0xaace44]), 0.2);
      g.strokeCircle(cx, cy, r);
      g.lineStyle(rnd.realInRange(0.3, 0.8), 0x88bb22, 0.1);
      g.strokeCircle(cx, cy, r * 1.4);
    }
    for (let i = 0; i < 25; i++) {
      g.fillStyle(0x66aa00, rnd.realInRange(0.15, 0.35));
      g.fillCircle(rnd.integerInRange(0, w), rnd.integerInRange(0, h), rnd.realInRange(2, 6));
    }
    ctr.add(g);
    scene.tweens.add({ targets: g, alpha: { from: 0.45, to: 0.85 }, duration: 3000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  },

  crystal: (scene, ctr, w, h) => {
    base(scene, ctr, w, h, 0x100822, 0x88ccff);
    const rnd = new Phaser.Math.RandomDataGenerator(['crystal-bg']);
    const g = scene.add.graphics();
    for (let i = 0; i < 28; i++) {
      const cx = rnd.integerInRange(15, w - 15);
      const cy = rnd.integerInRange(15, h - 15);
      const len = rnd.integerInRange(6, 22);
      const col = i % 2 === 0 ? 0x88ccff : 0xcc88ff;
      g.fillStyle(col, rnd.realInRange(0.12, 0.3));
      g.fillTriangle(cx, cy - len, cx - len * 0.32, cy + len * 0.5, cx + len * 0.32, cy + len * 0.5);
      g.fillStyle(col, rnd.realInRange(0.07, 0.18));
      g.fillTriangle(cx, cy + len, cx - len * 0.32, cy - len * 0.5, cx + len * 0.32, cy - len * 0.5);
    }
    ctr.add(g);
    scene.tweens.add({ targets: g, alpha: { from: 0.55, to: 1 }, duration: 2000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  },

  hunt: (scene, ctr, w, h) => {
    base(scene, ctr, w, h, 0x1a0808, 0xcc4400);
    const rnd = new Phaser.Math.RandomDataGenerator(['hunt-bg']);
    const g = scene.add.graphics();
    for (let i = 0; i < 12; i++) {
      const cx = rnd.integerInRange(30, w - 30);
      const cy = rnd.integerInRange(30, h - 30);
      for (let c = 0; c < 3; c++) {
        const ox = (c - 1) * 5;
        g.lineStyle(rnd.realInRange(0.8, 1.5), 0xcc3300, 0.2);
        g.lineBetween(cx + ox, cy - 14, cx + ox + 8, cy + 14);
      }
    }
    for (let i = 0; i < 22; i++) {
      g.fillStyle(0xaa3300, rnd.realInRange(0.15, 0.35));
      g.fillCircle(rnd.integerInRange(0, w), rnd.integerInRange(0, h), rnd.realInRange(2, 5));
    }
    ctr.add(g);
    scene.tweens.add({ targets: g, alpha: { from: 0.55, to: 0.9 }, duration: 2200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  },

  soul: (scene, ctr, w, h) => {
    base(scene, ctr, w, h, 0x0a0814, 0xccaaff);
    const rnd = new Phaser.Math.RandomDataGenerator(['soul-bg']);
    const g = scene.add.graphics();
    for (let i = 0; i < 16; i++) {
      g.fillStyle(0xccaaff, rnd.realInRange(0.06, 0.18));
      g.fillEllipse(rnd.integerInRange(30, w - 30), rnd.integerInRange(30, h - 30), rnd.integerInRange(20, 55), rnd.integerInRange(30, 70));
    }
    for (let i = 0; i < 20; i++) {
      g.fillStyle(0x9977cc, rnd.realInRange(0.06, 0.15));
      g.fillCircle(rnd.integerInRange(0, w), rnd.integerInRange(0, h), rnd.realInRange(2, 8));
    }
    ctr.add(g);
    scene.tweens.add({ targets: g, alpha: { from: 0.3, to: 0.85 }, duration: 4000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  },

  shadow: (scene, ctr, w, h) => {
    base(scene, ctr, w, h, 0x020208, 0x330044);
    const rnd = new Phaser.Math.RandomDataGenerator(['shadow-bg']);
    const g = scene.add.graphics();
    for (let i = 0; i < 6; i++) {
      const cx = rnd.integerInRange(50, w - 50);
      const cy = rnd.integerInRange(50, h - 50);
      for (let ring = 0; ring < 4; ring++) {
        const r = 15 + ring * 18;
        const start = rnd.realInRange(0, Math.PI) + ring * 0.5;
        g.lineStyle(0.8, 0x440066, 0.18 - ring * 0.03);
        g.beginPath();
        g.arc(cx, cy, r, start, start + 1.4, false);
        g.strokePath();
      }
    }
    for (let i = 0; i < 20; i++) {
      g.fillStyle(0x220033, rnd.realInRange(0.25, 0.5));
      g.fillCircle(rnd.integerInRange(0, w), rnd.integerInRange(0, h), rnd.realInRange(2, 7));
    }
    ctr.add(g);
    scene.tweens.add({ targets: g, alpha: { from: 0.4, to: 0.8 }, duration: 3800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  },

  creation: (scene, ctr, w, h) => {
    base(scene, ctr, w, h, 0x1a0d04, 0xcc6622);
    const rnd = new Phaser.Math.RandomDataGenerator(['creation-bg']);
    const g = scene.add.graphics();
    for (let i = 0; i < 5; i++) {
      const cx = rnd.integerInRange(40, w - 40);
      const cy = rnd.integerInRange(40, h - 40);
      const r = rnd.integerInRange(20, 50);
      g.lineStyle(rnd.realInRange(0.8, 2), 0x884422, 0.2);
      g.strokeCircle(cx, cy, r);
      g.lineStyle(rnd.realInRange(0.5, 1), 0x886633, 0.12);
      g.strokeCircle(cx, cy, r * 0.6);
      g.lineStyle(0.5, 0x665533, 0.1);
      g.lineBetween(cx - r, cy, cx + r, cy);
      g.lineBetween(cx, cy - r, cx, cy + r);
    }
    const sparkG = scene.add.graphics();
    for (let i = 0; i < 28; i++) {
      sparkG.fillStyle(rnd.pick([0xffaa00, 0xffcc44, 0xff8800]), rnd.realInRange(0.2, 0.5));
      sparkG.fillCircle(rnd.integerInRange(0, w), rnd.integerInRange(0, h), rnd.realInRange(1, 3));
    }
    ctr.add(g);
    ctr.add(sparkG);
    scene.tweens.add({ targets: sparkG, alpha: { from: 0.4, to: 0.9 }, duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  },

  gravity: (scene, ctr, w, h) => {
    base(scene, ctr, w, h, 0x0d0820, 0x8844cc);
    const rnd = new Phaser.Math.RandomDataGenerator(['gravity-bg']);
    const starG = scene.add.graphics();
    for (let i = 0; i < 35; i++) {
      starG.fillStyle(0xaa88ff, rnd.realInRange(0.08, 0.28));
      starG.fillCircle(rnd.integerInRange(0, w), rnd.integerInRange(0, h), rnd.realInRange(0.5, 2));
    }
    ctr.add(starG);
    // Rotating orbital arcs centered on screen
    const orbitCtr = scene.add.container(w / 2, h / 2);
    const orbitG = scene.add.graphics();
    orbitG.fillStyle(0x050312, 0.6);
    orbitG.fillCircle(0, 0, 28);
    for (let i = 0; i < 5; i++) {
      const r = 55 + i * 62;
      const start = (i * 0.9) % (Math.PI * 2);
      orbitG.lineStyle(1.5 - i * 0.2, 0x8844cc, 0.2 - i * 0.02);
      orbitG.beginPath();
      orbitG.arc(0, 0, r, start, start + 1.1 + i * 0.25, false);
      orbitG.strokePath();
    }
    orbitCtr.add(orbitG);
    ctr.add(orbitCtr);
    scene.tweens.add({ targets: orbitCtr, angle: 360, duration: 22000, repeat: -1, ease: 'Linear' });
  },

  sand: (scene, ctr, w, h) => {
    base(scene, ctr, w, h, 0x1a1408, 0xffdd44);
    const rnd = new Phaser.Math.RandomDataGenerator(['sand-bg']);
    const g = scene.add.graphics();
    for (let i = 0; i < 30; i++) {
      const sx = rnd.integerInRange(0, w);
      const sy = rnd.integerInRange(0, h);
      const len = rnd.integerInRange(8, 28);
      g.lineStyle(rnd.realInRange(0.5, 1.5), rnd.pick([0xffdd44, 0xddbb22, 0xffcc00]), 0.2);
      g.lineBetween(sx, sy, sx + rnd.integerInRange(-3, 3), sy + len);
    }
    for (let i = 0; i < 4; i++) {
      const cx = rnd.integerInRange(80, w - 80);
      const cy = rnd.integerInRange(80, h - 80);
      const r = rnd.integerInRange(25, 55);
      g.lineStyle(0.8, 0xddbb22, 0.15);
      g.strokeCircle(cx, cy, r);
      const angle = rnd.realInRange(0, Math.PI * 2);
      g.lineStyle(1, 0xffcc44, 0.2);
      g.lineBetween(cx, cy, cx + Math.cos(angle) * r * 0.75, cy + Math.sin(angle) * r * 0.75);
    }
    ctr.add(g);
    scene.tweens.add({ targets: g, y: { from: -8, to: 8 }, duration: 2800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  },

  // ── Abstract world themes ──────────────────────────────────────────

  electricity: (scene, ctr, w, h) => {
    base(scene, ctr, w, h, 0x05080f, 0xffee00);
    const rnd = new Phaser.Math.RandomDataGenerator(['electricity-bg']);
    const g = scene.add.graphics();
    // Jagged lightning bolts
    for (let i = 0; i < 12; i++) {
      let x = rnd.integerInRange(20, w - 20);
      let y = rnd.integerInRange(0, h * 0.3);
      g.lineStyle(rnd.realInRange(0.8, 2), rnd.pick([0xffee00, 0xffffff, 0xaaccff]), 0.35);
      g.beginPath();
      g.moveTo(x, y);
      for (let s = 0; s < 6; s++) {
        x += rnd.integerInRange(-18, 18);
        y += rnd.integerInRange(18, 40);
        g.lineTo(x, y);
      }
      g.strokePath();
    }
    // Scattered sparks
    for (let i = 0; i < 40; i++) {
      g.fillStyle(rnd.pick([0xffee00, 0xffffff, 0x88ccff]), rnd.realInRange(0.15, 0.45));
      g.fillCircle(rnd.integerInRange(0, w), rnd.integerInRange(0, h), rnd.realInRange(0.5, 2));
    }
    ctr.add(g);
    scene.tweens.add({ targets: g, alpha: { from: 0.5, to: 1 }, duration: 120, yoyo: true, repeat: -1, ease: 'Stepped' });
  },

  slime: (scene, ctr, w, h) => {
    base(scene, ctr, w, h, 0x041008, 0x66cc44);
    const rnd = new Phaser.Math.RandomDataGenerator(['slime-bg']);
    const g = scene.add.graphics();
    // Blobby puddles
    for (let i = 0; i < 16; i++) {
      const cx = rnd.integerInRange(20, w - 20);
      const cy = rnd.integerInRange(20, h - 20);
      g.fillStyle(rnd.pick([0x44aa22, 0x66cc44, 0x33991a]), rnd.realInRange(0.18, 0.4));
      g.fillEllipse(cx, cy, rnd.integerInRange(20, 55), rnd.integerInRange(12, 35));
    }
    // Drip lines
    for (let i = 0; i < 10; i++) {
      const sx = rnd.integerInRange(10, w - 10);
      g.lineStyle(rnd.realInRange(1, 2.5), 0x44cc22, 0.18);
      g.lineBetween(sx, 0, sx + rnd.integerInRange(-5, 5), rnd.integerInRange(20, 60));
    }
    ctr.add(g);
    scene.tweens.add({ targets: g, y: { from: 0, to: 10 }, duration: 2200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  },

  fate: (scene, ctr, w, h) => {
    base(scene, ctr, w, h, 0x070d12, 0x88eecc);
    const rnd = new Phaser.Math.RandomDataGenerator(['fate-bg']);
    const g = scene.add.graphics();
    // Card-like rectangles scattered around
    for (let i = 0; i < 14; i++) {
      const cx = rnd.integerInRange(20, w - 20);
      const cy = rnd.integerInRange(20, h - 20);
      const cw = rnd.integerInRange(10, 22);
      const ch = rnd.integerInRange(14, 32);
      g.lineStyle(rnd.realInRange(0.5, 1.2), rnd.pick([0x88eecc, 0x44bbaa, 0xccffee]), 0.2);
      g.strokeRect(cx - cw / 2, cy - ch / 2, cw, ch);
    }
    // Star points
    for (let i = 0; i < 25; i++) {
      g.fillStyle(0x88eecc, rnd.realInRange(0.08, 0.25));
      g.fillCircle(rnd.integerInRange(0, w), rnd.integerInRange(0, h), rnd.realInRange(0.5, 2.5));
    }
    ctr.add(g);
    scene.tweens.add({ targets: g, angle: { from: -1, to: 1 }, duration: 6000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  },

  sound: (scene, ctr, w, h) => {
    base(scene, ctr, w, h, 0x12040e, 0xff66cc);
    const rnd = new Phaser.Math.RandomDataGenerator(['sound-bg']);
    const g = scene.add.graphics();
    // Concentric ripple rings from random points
    for (let i = 0; i < 8; i++) {
      const cx = rnd.integerInRange(40, w - 40);
      const cy = rnd.integerInRange(40, h - 40);
      for (let ring = 0; ring < 5; ring++) {
        const r = 12 + ring * 20;
        g.lineStyle(1.2 - ring * 0.18, rnd.pick([0xff66cc, 0xcc44aa, 0xff88ee]), 0.18 - ring * 0.02);
        g.strokeCircle(cx, cy, r);
      }
    }
    // Fine scatter dots
    for (let i = 0; i < 30; i++) {
      g.fillStyle(0xff66cc, rnd.realInRange(0.08, 0.22));
      g.fillCircle(rnd.integerInRange(0, w), rnd.integerInRange(0, h), rnd.realInRange(0.5, 2));
    }
    ctr.add(g);
    scene.tweens.add({ targets: g, alpha: { from: 0.45, to: 0.9 }, duration: 2600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  },

  light: (scene, ctr, w, h) => {
    base(scene, ctr, w, h, 0x14120a, 0xfff4a8);
    const rnd = new Phaser.Math.RandomDataGenerator(['light-bg']);
    const g = scene.add.graphics();
    // Radial rays from center
    for (let i = 0; i < 24; i++) {
      const angle = (i / 24) * Math.PI * 2;
      const len = rnd.integerInRange(40, 120);
      g.lineStyle(rnd.realInRange(0.5, 1.5), rnd.pick([0xfff4a8, 0xffeeaa, 0xffffcc]), 0.12);
      g.lineBetween(w / 2, h / 2, w / 2 + Math.cos(angle) * len, h / 2 + Math.sin(angle) * len);
    }
    // Bright motes
    for (let i = 0; i < 35; i++) {
      g.fillStyle(rnd.pick([0xffffff, 0xfff4a8, 0xffeecc]), rnd.realInRange(0.1, 0.38));
      g.fillCircle(rnd.integerInRange(0, w), rnd.integerInRange(0, h), rnd.realInRange(0.5, 2.5));
    }
    ctr.add(g);
    const rayG = scene.add.graphics();
    rayG.lineStyle(1.5, 0xffffff, 0.06);
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      rayG.lineBetween(w / 2, h / 2, w / 2 + Math.cos(angle) * w * 0.75, h / 2 + Math.sin(angle) * h * 0.75);
    }
    ctr.add(rayG);
    scene.tweens.add({ targets: g, alpha: { from: 0.55, to: 1 }, duration: 2000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    scene.tweens.add({ targets: rayG, angle: 360, duration: 18000, repeat: -1, ease: 'Linear' });
  },

  magnet: (scene, ctr, w, h) => {
    base(scene, ctr, w, h, 0x12020a, 0xcc2244);
    const rnd = new Phaser.Math.RandomDataGenerator(['magnet-bg']);
    const g = scene.add.graphics();
    // Magnetic field arcs between two poles
    const p1x = w * 0.3; const p1y = h / 2;
    const p2x = w * 0.7; const p2y = h / 2;
    for (let i = 0; i < 10; i++) {
      const bulge = (i - 4.5) * 28;
      g.lineStyle(rnd.realInRange(0.6, 1.4), rnd.pick([0xcc2244, 0xff4466, 0x881133]), 0.18);
      g.beginPath();
      g.moveTo(p1x, p1y);
      g.lineTo(p1x + (p2x - p1x) * 0.33, p1y + bulge);
      g.lineTo(p1x + (p2x - p1x) * 0.66, p1y + bulge);
      g.lineTo(p2x, p2y);
      g.strokePath();
    }
    for (let i = 0; i < 25; i++) {
      g.fillStyle(0xcc2244, rnd.realInRange(0.1, 0.3));
      g.fillCircle(rnd.integerInRange(0, w), rnd.integerInRange(0, h), rnd.realInRange(1, 4));
    }
    ctr.add(g);
    scene.tweens.add({ targets: g, alpha: { from: 0.5, to: 0.9 }, duration: 2400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  },

  metal: (scene, ctr, w, h) => {
    base(scene, ctr, w, h, 0x0a0d10, 0x8899aa);
    const rnd = new Phaser.Math.RandomDataGenerator(['metal-bg']);
    const g = scene.add.graphics();
    // Grid of cross-hatch lines (industrial)
    for (let x = 0; x < w; x += rnd.integerInRange(30, 55)) {
      g.lineStyle(rnd.realInRange(0.3, 0.8), 0x8899aa, 0.1);
      g.lineBetween(x, 0, x, h);
    }
    for (let y = 0; y < h; y += rnd.integerInRange(30, 55)) {
      g.lineStyle(rnd.realInRange(0.3, 0.8), 0x8899aa, 0.1);
      g.lineBetween(0, y, w, y);
    }
    // Rivet dots
    for (let i = 0; i < 20; i++) {
      g.fillStyle(0xaabbcc, rnd.realInRange(0.18, 0.35));
      g.fillCircle(rnd.integerInRange(0, w), rnd.integerInRange(0, h), rnd.realInRange(1.5, 3.5));
    }
    // Glint streaks
    const shineG = scene.add.graphics();
    for (let i = 0; i < 8; i++) {
      const sx = rnd.integerInRange(10, w - 10);
      const sy = rnd.integerInRange(10, h - 10);
      shineG.lineStyle(rnd.realInRange(0.5, 1.5), 0xddeeff, 0.2);
      shineG.lineBetween(sx, sy, sx + rnd.integerInRange(15, 50), sy + rnd.integerInRange(-3, 3));
    }
    ctr.add(g);
    ctr.add(shineG);
    scene.tweens.add({ targets: shineG, alpha: { from: 0.3, to: 0.85 }, duration: 3000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  },

  plasma: (scene, ctr, w, h) => {
    base(scene, ctr, w, h, 0x0a0218, 0xaa22ff);
    const rnd = new Phaser.Math.RandomDataGenerator(['plasma-bg']);
    const g = scene.add.graphics();
    // Flowing plasma wisps (curved lines)
    for (let i = 0; i < 16; i++) {
      let px = rnd.integerInRange(0, w);
      let py = rnd.integerInRange(0, h);
      g.lineStyle(rnd.realInRange(0.8, 2), rnd.pick([0xaa22ff, 0xcc55ff, 0xff44cc, 0x6600cc]), 0.22);
      g.beginPath();
      g.moveTo(px, py);
      for (let s = 0; s < 5; s++) {
        px += rnd.integerInRange(-30, 30);
        py += rnd.integerInRange(-20, 20);
        g.lineTo(px, py);
      }
      g.strokePath();
    }
    for (let i = 0; i < 28; i++) {
      g.fillStyle(rnd.pick([0xaa22ff, 0xff44cc, 0x6600cc]), rnd.realInRange(0.08, 0.3));
      g.fillCircle(rnd.integerInRange(0, w), rnd.integerInRange(0, h), rnd.realInRange(1, 4));
    }
    ctr.add(g);
    scene.tweens.add({ targets: g, alpha: { from: 0.45, to: 0.95 }, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  },

  rubber: (scene, ctr, w, h) => {
    base(scene, ctr, w, h, 0x14060a, 0xff5577);
    const rnd = new Phaser.Math.RandomDataGenerator(['rubber-bg']);
    const g = scene.add.graphics();
    // Bouncy arc trails
    for (let i = 0; i < 12; i++) {
      const sx = rnd.integerInRange(0, w);
      const sy = rnd.integerInRange(h * 0.5, h);
      g.lineStyle(rnd.realInRange(0.8, 2), rnd.pick([0xff5577, 0xff3355, 0xff88aa]), 0.22);
      g.beginPath();
      g.moveTo(sx, sy);
      const peakX = sx + rnd.integerInRange(30, 80);
      const peakY = sy - rnd.integerInRange(30, 80);
      const endX = peakX + rnd.integerInRange(30, 80);
      g.lineTo(peakX, peakY);
      g.lineTo(endX, sy + rnd.integerInRange(-15, 15));
      g.strokePath();
    }
    for (let i = 0; i < 22; i++) {
      g.fillStyle(rnd.pick([0xff5577, 0xff88aa, 0xcc2244]), rnd.realInRange(0.1, 0.3));
      g.fillCircle(rnd.integerInRange(0, w), rnd.integerInRange(0, h), rnd.realInRange(2, 6));
    }
    ctr.add(g);
    scene.tweens.add({ targets: g, y: { from: -10, to: 10 }, duration: 1600, yoyo: true, repeat: -1, ease: 'Bounce.easeOut' });
  },

  gunpowder: (scene, ctr, w, h) => {
    base(scene, ctr, w, h, 0x030008, 0x440066);
    const rnd = new Phaser.Math.RandomDataGenerator(['gunpowder-bg']);
    const g = scene.add.graphics();
    // Skull-like cross shapes
    for (let i = 0; i < 8; i++) {
      const cx = rnd.integerInRange(30, w - 30);
      const cy = rnd.integerInRange(30, h - 30);
      const s = rnd.integerInRange(6, 14);
      g.lineStyle(rnd.realInRange(0.5, 1.2), 0x550077, 0.2);
      g.lineBetween(cx - s, cy, cx + s, cy);
      g.lineBetween(cx, cy - s, cx, cy + s * 0.6);
    }
    for (let i = 0; i < 5; i++) {
      const cx = rnd.integerInRange(40, w - 40);
      const cy = rnd.integerInRange(40, h - 40);
      for (let ring = 0; ring < 3; ring++) {
        g.lineStyle(0.6, 0x330055, 0.14 - ring * 0.03);
        g.strokeCircle(cx, cy, 10 + ring * 14);
      }
    }
    for (let i = 0; i < 18; i++) {
      g.fillStyle(0x660088, rnd.realInRange(0.06, 0.18));
      g.fillCircle(rnd.integerInRange(0, w), rnd.integerInRange(0, h), rnd.realInRange(1.5, 5));
    }
    ctr.add(g);
    scene.tweens.add({ targets: g, alpha: { from: 0.35, to: 0.8 }, duration: 4500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  },

  echo: (scene, ctr, w, h) => {
    base(scene, ctr, w, h, 0x070710, 0xccccff);
    const rnd = new Phaser.Math.RandomDataGenerator(['echo-bg']);
    const g = scene.add.graphics();
    // Overlapping echo rings (offset duplicates)
    for (let i = 0; i < 10; i++) {
      const cx = rnd.integerInRange(40, w - 40);
      const cy = rnd.integerInRange(40, h - 40);
      for (let e = 0; e < 4; e++) {
        g.lineStyle(0.7, 0xaaaaff, 0.12 - e * 0.02);
        g.strokeCircle(cx + e * 6, cy + e * 4, 14 + e * 16);
      }
    }
    for (let i = 0; i < 25; i++) {
      g.fillStyle(0xccccff, rnd.realInRange(0.06, 0.2));
      g.fillCircle(rnd.integerInRange(0, w), rnd.integerInRange(0, h), rnd.realInRange(0.5, 2.5));
    }
    ctr.add(g);
    scene.tweens.add({ targets: g, x: { from: -12, to: 12 }, duration: 3400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  },

  silence: (scene, ctr, w, h) => {
    base(scene, ctr, w, h, 0x010005, 0x1a0022);
    const rnd = new Phaser.Math.RandomDataGenerator(['silence-bg']);
    const g = scene.add.graphics();
    // Almost nothing — faint void smears
    for (let i = 0; i < 8; i++) {
      g.fillStyle(0x110018, rnd.realInRange(0.1, 0.25));
      g.fillEllipse(rnd.integerInRange(20, w - 20), rnd.integerInRange(20, h - 20), rnd.integerInRange(25, 70), rnd.integerInRange(10, 30));
    }
    for (let i = 0; i < 12; i++) {
      g.fillStyle(0x220033, rnd.realInRange(0.04, 0.1));
      g.fillCircle(rnd.integerInRange(0, w), rnd.integerInRange(0, h), rnd.realInRange(1, 4));
    }
    ctr.add(g);
    scene.tweens.add({ targets: g, alpha: { from: 0.2, to: 0.6 }, duration: 6000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  },

  magic: (scene, ctr, w, h) => {
    base(scene, ctr, w, h, 0x0a0318, 0x9944ff);
    const rnd = new Phaser.Math.RandomDataGenerator(['magic-bg']);
    const g = scene.add.graphics();
    // Arcane rune-like star polygons
    for (let i = 0; i < 8; i++) {
      const cx = rnd.integerInRange(30, w - 30);
      const cy = rnd.integerInRange(30, h - 30);
      const r = rnd.integerInRange(10, 30);
      const pts = 6;
      g.lineStyle(rnd.realInRange(0.5, 1.2), rnd.pick([0x9944ff, 0xcc77ff, 0x6622cc]), 0.2);
      g.beginPath();
      for (let p = 0; p <= pts; p++) {
        const angle = (p / pts) * Math.PI * 2 - Math.PI / 2;
        const inner = p % 2 === 0 ? r : r * 0.45;
        if (p === 0) g.moveTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner);
        else g.lineTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner);
      }
      g.strokePath();
    }
    for (let i = 0; i < 30; i++) {
      g.fillStyle(rnd.pick([0x9944ff, 0xcc77ff, 0x6622cc]), rnd.realInRange(0.08, 0.28));
      g.fillCircle(rnd.integerInRange(0, w), rnd.integerInRange(0, h), rnd.realInRange(0.5, 2.5));
    }
    ctr.add(g);
    scene.tweens.add({ targets: g, alpha: { from: 0.5, to: 0.95 }, duration: 3200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  },

  technology: (scene, ctr, w, h) => {
    base(scene, ctr, w, h, 0x020d0c, 0x44ccaa);
    const rnd = new Phaser.Math.RandomDataGenerator(['technology-bg']);
    const g = scene.add.graphics();
    // Circuit board paths
    for (let i = 0; i < 14; i++) {
      let px = rnd.integerInRange(0, w);
      let py = rnd.integerInRange(0, h);
      g.lineStyle(rnd.realInRange(0.5, 1.2), rnd.pick([0x44ccaa, 0x22aa88, 0x66ddbb]), 0.2);
      g.beginPath();
      g.moveTo(px, py);
      for (let s = 0; s < 4; s++) {
        if (rnd.frac() > 0.5) { px += rnd.integerInRange(15, 50) * rnd.sign(); }
        else { py += rnd.integerInRange(15, 50) * rnd.sign(); }
        g.lineTo(px, py);
      }
      g.strokePath();
      // Node dot at end
      g.fillStyle(0x44ccaa, 0.3);
      g.fillCircle(px, py, 2.5);
    }
    for (let i = 0; i < 20; i++) {
      g.fillStyle(0x44ccaa, rnd.realInRange(0.08, 0.22));
      g.fillCircle(rnd.integerInRange(0, w), rnd.integerInRange(0, h), rnd.realInRange(0.5, 2));
    }
    ctr.add(g);
    scene.tweens.add({ targets: g, alpha: { from: 0.45, to: 0.88 }, duration: 2700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  },

  subterfuge: (scene, ctr, w, h) => {
    base(scene, ctr, w, h, 0x08041a, 0xaa44ff);
    const rnd = new Phaser.Math.RandomDataGenerator(['subterfuge-bg']);
    // Two ghost-copies of a particle cloud, slightly offset
    for (let copy = 0; copy < 2; copy++) {
      const g = scene.add.graphics();
      const ox = copy === 0 ? -18 : 18;
      const oy = copy === 0 ? -10 : 10;
      for (let i = 0; i < 22; i++) {
        g.fillStyle(rnd.pick([0xaa44ff, 0x6622cc, 0xdd88ff]), rnd.realInRange(0.08, 0.25));
        g.fillCircle(rnd.integerInRange(0, w) + ox, rnd.integerInRange(0, h) + oy, rnd.realInRange(1.5, 5));
      }
      // Orbital smears
      for (let i = 0; i < 6; i++) {
        const cx = rnd.integerInRange(40, w - 40) + ox;
        const cy = rnd.integerInRange(40, h - 40) + oy;
        const r = rnd.integerInRange(15, 45);
        const start = rnd.realInRange(0, Math.PI * 2);
        g.lineStyle(0.8, 0xaa44ff, 0.14);
        g.beginPath();
        g.arc(cx, cy, r, start, start + rnd.realInRange(0.6, 2.2), false);
        g.strokePath();
      }
      ctr.add(g);
      scene.tweens.add({ targets: g, alpha: { from: copy === 0 ? 0.3 : 0.7, to: copy === 0 ? 0.8 : 0.3 }, duration: 3000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
  },

  // ── Corrupt Realm themes — every one carries a thread of the same sickly
  // red rot (0xc4392c family), so the realm reads as one poisoned place.

  ruin: (scene, ctr, w, h) => {
    base(scene, ctr, w, h, 0x140806, 0xc4392c);
    const rnd = new Phaser.Math.RandomDataGenerator(['ruin-bg']);
    const g = scene.add.graphics();
    // Broken skyline: jagged wall stumps along the lower half.
    for (let i = 0; i < 9; i++) {
      const bx = rnd.integerInRange(0, w);
      const bw = rnd.integerInRange(30, 90);
      const bh = rnd.integerInRange(30, 120);
      g.fillStyle(rnd.pick([0x2a1410, 0x1e0f0c]), 0.8);
      g.fillRect(bx, h - bh, bw, bh);
      // A bite taken out of the top.
      g.fillStyle(0x140806, 1);
      g.fillTriangle(bx + bw * 0.3, h - bh, bx + bw * 0.7, h - bh, bx + bw * 0.5, h - bh + rnd.integerInRange(10, 26));
    }
    // Drifting mortar dust.
    for (let i = 0; i < 26; i++) {
      g.fillStyle(0xc4392c, rnd.realInRange(0.06, 0.2));
      g.fillCircle(rnd.integerInRange(0, w), rnd.integerInRange(0, h), rnd.realInRange(1, 3));
    }
    ctr.add(g);
    scene.tweens.add({ targets: g, alpha: { from: 0.7, to: 1 }, duration: 2600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  },

  death: (scene, ctr, w, h) => {
    base(scene, ctr, w, h, 0x0c0a14, 0x4a4468);
    const rnd = new Phaser.Math.RandomDataGenerator(['death-bg']);
    const g = scene.add.graphics();
    // A field of leaning headstones.
    for (let i = 0; i < 12; i++) {
      const x = rnd.integerInRange(20, w - 20);
      const y = rnd.integerInRange(h * 0.4, h - 20);
      const lean = rnd.realInRange(-0.2, 0.2);
      g.fillStyle(0x241f36, 0.85);
      g.save();
      g.translateCanvas(x, y);
      g.rotateCanvas(lean);
      g.fillRoundedRect(-8, -22, 16, 22, 5);
      g.restore();
    }
    // Wisps rising.
    for (let i = 0; i < 14; i++) {
      g.fillStyle(rnd.pick([0x7a70a8, 0x4a4468]), rnd.realInRange(0.08, 0.2));
      g.fillCircle(rnd.integerInRange(0, w), rnd.integerInRange(0, h), rnd.realInRange(2, 6));
    }
    ctr.add(g);
    scene.tweens.add({ targets: g, alpha: { from: 0.55, to: 0.95 }, duration: 3400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  },

  illusion: (scene, ctr, w, h) => {
    base(scene, ctr, w, h, 0x120820, 0xb45cff);
    const rnd = new Phaser.Math.RandomDataGenerator(['illusion-bg']);
    // Two offset ghost copies of the same diamond scatter — nothing here agrees
    // with itself about where it is.
    for (let copy = 0; copy < 2; copy++) {
      const g = scene.add.graphics();
      const ox = copy === 0 ? -14 : 14;
      for (let i = 0; i < 16; i++) {
        const x = rnd.integerInRange(20, w - 20) + ox;
        const y = rnd.integerInRange(20, h - 20);
        const r = rnd.realInRange(4, 12);
        g.lineStyle(1, copy === 0 ? 0xb45cff : 0xff5fa2, rnd.realInRange(0.12, 0.3));
        g.strokeRect(x - r / 2, y - r / 2, r, r);
      }
      ctr.add(g);
      scene.tweens.add({ targets: g, alpha: { from: copy === 0 ? 0.9 : 0.3, to: copy === 0 ? 0.3 : 0.9 }, duration: 2400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
  },

  conquest: (scene, ctr, w, h) => {
    base(scene, ctr, w, h, 0x180a08, 0xc23a2e);
    const rnd = new Phaser.Math.RandomDataGenerator(['conquest-bg']);
    const g = scene.add.graphics();
    // Battlement silhouette across the bottom.
    g.fillStyle(0x241008, 0.9);
    for (let x = 0; x < w; x += 46) {
      g.fillRect(x, h - 46, 30, 46);
      g.fillRect(x, h - 62, 14, 16);
    }
    // Planted banners.
    for (let i = 0; i < 6; i++) {
      const x = rnd.integerInRange(30, w - 30);
      const y = rnd.integerInRange(h * 0.25, h * 0.7);
      g.lineStyle(1.5, 0x3a1a12, 1);
      g.lineBetween(x, y, x, y - 34);
      g.fillStyle(rnd.pick([0xc23a2e, 0x8a2a20]), 0.7);
      g.fillTriangle(x, y - 34, x + 16, y - 29, x, y - 22);
    }
    ctr.add(g);
    scene.tweens.add({ targets: g, alpha: { from: 0.7, to: 1 }, duration: 2900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  },

  gluttony: (scene, ctr, w, h) => {
    base(scene, ctr, w, h, 0x160804, 0xd8452f);
    const rnd = new Phaser.Math.RandomDataGenerator(['gluttony-bg']);
    const g = scene.add.graphics();
    // Hanging hooks and long tables.
    for (let i = 0; i < 7; i++) {
      const x = rnd.integerInRange(30, w - 30);
      g.lineStyle(1.2, 0x4a2a1a, 0.8);
      g.lineBetween(x, 0, x, rnd.integerInRange(30, 80));
      g.lineStyle(2, 0x6a3a22, 0.9);
      g.beginPath();
      g.arc(x + 4, rnd.integerInRange(30, 80), 6, Math.PI * 0.2, Math.PI * 1.2, false);
      g.strokePath();
    }
    for (let i = 0; i < 3; i++) {
      const y = h - 30 - i * 60;
      g.fillStyle(0x2a140a, 0.7);
      g.fillRect(rnd.integerInRange(0, 80), y, rnd.integerInRange(w * 0.5, w * 0.9), 10);
    }
    // Grease motes.
    for (let i = 0; i < 20; i++) {
      g.fillStyle(0xd8452f, rnd.realInRange(0.06, 0.18));
      g.fillCircle(rnd.integerInRange(0, w), rnd.integerInRange(0, h), rnd.realInRange(1.5, 4));
    }
    ctr.add(g);
    scene.tweens.add({ targets: g, alpha: { from: 0.65, to: 1 }, duration: 2500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  },

  amber: (scene, ctr, w, h) => {
    base(scene, ctr, w, h, 0x160e02, 0xd98b1f);
    const rnd = new Phaser.Math.RandomDataGenerator(['amber-bg']);
    const g = scene.add.graphics();
    // Suspended droplets, each with a fleck caught inside.
    for (let i = 0; i < 13; i++) {
      const x = rnd.integerInRange(20, w - 20);
      const y = rnd.integerInRange(20, h - 20);
      const r = rnd.realInRange(6, 18);
      g.fillStyle(0xd98b1f, rnd.realInRange(0.1, 0.22));
      g.fillEllipse(x, y, r * 1.4, r * 1.8);
      g.fillStyle(0x241608, 0.8);
      g.fillCircle(x + rnd.realInRange(-3, 3), y + rnd.realInRange(-3, 3), r * 0.2);
    }
    ctr.add(g);
    scene.tweens.add({ targets: g, alpha: { from: 0.6, to: 0.95 }, duration: 3600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  },

  bind: (scene, ctr, w, h) => {
    base(scene, ctr, w, h, 0x100c04, 0xe0b743);
    const rnd = new Phaser.Math.RandomDataGenerator(['bind-bg']);
    const g = scene.add.graphics();
    // Chains draped in catenaries across the dark.
    for (let i = 0; i < 6; i++) {
      const x0 = rnd.integerInRange(-40, w * 0.4);
      const x1 = x0 + rnd.integerInRange(w * 0.4, w * 0.8);
      const yTop = rnd.integerInRange(10, h * 0.6);
      const sag = rnd.integerInRange(30, 80);
      g.lineStyle(1.5, 0x8a742c, 0.5);
      let px = x0;
      let py = yTop;
      for (let s = 1; s <= 12; s++) {
        const t = s / 12;
        const nx = x0 + (x1 - x0) * t;
        const ny = yTop + Math.sin(t * Math.PI) * sag;
        g.lineBetween(px, py, nx, ny);
        if (s % 2 === 0) { g.fillStyle(0xe0b743, 0.3); g.fillCircle(nx, ny, 2); }
        px = nx; py = ny;
      }
    }
    ctr.add(g);
    scene.tweens.add({ targets: g, alpha: { from: 0.55, to: 0.9 }, duration: 3000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  },

  paper: (scene, ctr, w, h) => {
    base(scene, ctr, w, h, 0x14120c, 0xf2ead6);
    const rnd = new Phaser.Math.RandomDataGenerator(['paper-bg']);
    const g = scene.add.graphics();
    // Loose pages tumbling, some with ruled lines.
    for (let i = 0; i < 11; i++) {
      const x = rnd.integerInRange(20, w - 20);
      const y = rnd.integerInRange(20, h - 20);
      const pw = rnd.integerInRange(14, 26);
      const ph = pw * 1.3;
      const rot = rnd.realInRange(-0.6, 0.6);
      g.save();
      g.translateCanvas(x, y);
      g.rotateCanvas(rot);
      g.fillStyle(0xf2ead6, rnd.realInRange(0.1, 0.25));
      g.fillRect(-pw / 2, -ph / 2, pw, ph);
      g.lineStyle(0.6, 0x8a8272, 0.4);
      for (let l = 1; l <= 3; l++) g.lineBetween(-pw / 2 + 3, -ph / 2 + (ph * l) / 4, pw / 2 - 3, -ph / 2 + (ph * l) / 4);
      g.restore();
    }
    ctr.add(g);
    scene.tweens.add({ targets: g, alpha: { from: 0.6, to: 0.95 }, duration: 2800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  },

  chalk: (scene, ctr, w, h) => {
    base(scene, ctr, w, h, 0x101410, 0xf4f1e6);
    const rnd = new Phaser.Math.RandomDataGenerator(['chalk-bg']);
    const g = scene.add.graphics();
    // A blackboard of half-erased scribbles: loops, arrows, sums.
    for (let i = 0; i < 12; i++) {
      const x = rnd.integerInRange(20, w - 40);
      const y = rnd.integerInRange(20, h - 30);
      g.lineStyle(1.2, 0xf4f1e6, rnd.realInRange(0.08, 0.22));
      const kind = rnd.integerInRange(0, 2);
      if (kind === 0) {
        g.beginPath();
        g.arc(x, y, rnd.integerInRange(8, 20), 0, Math.PI * rnd.realInRange(1.2, 2), false);
        g.strokePath();
      } else if (kind === 1) {
        g.lineBetween(x, y, x + rnd.integerInRange(16, 40), y + rnd.integerInRange(-10, 10));
        g.lineBetween(x + 36, y - 4, x + 42, y);
        g.lineBetween(x + 36, y + 4, x + 42, y);
      } else {
        g.lineBetween(x, y, x + 10, y - 12);
        g.lineBetween(x + 10, y - 12, x + 20, y);
      }
    }
    ctr.add(g);
    scene.tweens.add({ targets: g, alpha: { from: 0.5, to: 0.85 }, duration: 3200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  },

  psychic: (scene, ctr, w, h) => {
    base(scene, ctr, w, h, 0x120826, 0x9b4dff);
    const rnd = new Phaser.Math.RandomDataGenerator(['psychic-bg']);
    const g = scene.add.graphics();
    // Concentric thought-rings around several silent centres, plus one iris.
    for (let i = 0; i < 5; i++) {
      const x = rnd.integerInRange(60, w - 60);
      const y = rnd.integerInRange(60, h - 60);
      for (let r = 1; r <= 3; r++) {
        g.lineStyle(0.8, 0x9b4dff, 0.16 - r * 0.03);
        g.strokeCircle(x, y, r * rnd.integerInRange(12, 20));
      }
    }
    const ix = rnd.integerInRange(w * 0.3, w * 0.7);
    const iy = rnd.integerInRange(h * 0.3, h * 0.7);
    g.lineStyle(1.5, 0xd8b8ff, 0.3);
    g.strokeEllipse(ix, iy, 44, 20);
    g.fillStyle(0x9b4dff, 0.35);
    g.fillCircle(ix, iy, 8);
    ctr.add(g);
    scene.tweens.add({ targets: g, alpha: { from: 0.5, to: 1 }, duration: 2200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  },

  passion: (scene, ctr, w, h) => {
    base(scene, ctr, w, h, 0x1c0610, 0xff5fa2);
    const rnd = new Phaser.Math.RandomDataGenerator(['passion-bg']);
    const g = scene.add.graphics();
    // Drifting embers and a few broken hearts — two lobes with a crack.
    for (let i = 0; i < 22; i++) {
      g.fillStyle(rnd.pick([0xff5fa2, 0xff8fb8, 0xc23a5e]), rnd.realInRange(0.08, 0.24));
      g.fillCircle(rnd.integerInRange(0, w), rnd.integerInRange(0, h), rnd.realInRange(1.5, 4));
    }
    for (let i = 0; i < 4; i++) {
      const x = rnd.integerInRange(40, w - 40);
      const y = rnd.integerInRange(40, h - 40);
      const s = rnd.realInRange(6, 12);
      g.fillStyle(0xff5fa2, 0.2);
      g.fillCircle(x - s * 0.5, y, s * 0.6);
      g.fillCircle(x + s * 0.5, y, s * 0.6);
      g.fillTriangle(x - s, y + s * 0.2, x + s, y + s * 0.2, x, y + s * 1.5);
      g.lineStyle(1, 0x1c0610, 1);
      g.lineBetween(x, y - s * 0.3, x - s * 0.2, y + s * 0.6);
      g.lineBetween(x - s * 0.2, y + s * 0.6, x + s * 0.15, y + s * 1.1);
    }
    ctr.add(g);
    scene.tweens.add({ targets: g, alpha: { from: 0.6, to: 1 }, duration: 1900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  },

  dune: (scene, ctr, w, h) => {
    base(scene, ctr, w, h, 0x1a1006, 0xe8c87a);
    const rnd = new Phaser.Math.RandomDataGenerator(['dune-bg']);
    const g = scene.add.graphics();
    // Ripple lines running across the drift, and one stepped ruin rising out of it.
    for (let i = 0; i < 14; i++) {
      const y = rnd.integerInRange(20, h - 20);
      const x = rnd.integerInRange(10, w - 60);
      const len = rnd.integerInRange(24, 70);
      g.lineStyle(1, 0xe8c87a, rnd.realInRange(0.1, 0.26));
      g.beginPath();
      g.moveTo(x, y);
      for (let s = 1; s <= 4; s++) {
        g.lineTo(x + (len * s) / 4, y + Math.sin(s * 1.6 + i) * 3);
      }
      g.strokePath();
    }
    const bx = rnd.integerInRange(w * 0.35, w * 0.65);
    const by = rnd.integerInRange(h * 0.45, h * 0.7);
    for (let s = 0; s < 4; s++) {
      const bw = 30 - s * 6;
      g.fillStyle(s === 0 ? 0x8d8b86 : 0xd9ab63, 0.2 + s * 0.05);
      g.fillRect(bx - bw / 2 + s * 5, by - s * 11, bw, 9);
    }
    g.fillStyle(0xffd54a, 0.35);
    g.fillCircle(bx + 15, by - 48, 4);
    ctr.add(g);
    scene.tweens.add({ targets: g, alpha: { from: 0.55, to: 0.9 }, duration: 3100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  },

  fortune: (scene, ctr, w, h) => {
    base(scene, ctr, w, h, 0x161004, 0xd8a531);
    const rnd = new Phaser.Math.RandomDataGenerator(['fortune-bg']);
    const g = scene.add.graphics();
    // Falling coins — ellipses at random tumble angles, a few lit edges.
    for (let i = 0; i < 18; i++) {
      const x = rnd.integerInRange(15, w - 15);
      const y = rnd.integerInRange(15, h - 15);
      const r = rnd.realInRange(3, 7);
      const squash = rnd.realInRange(0.3, 1);
      g.lineStyle(1, 0xd8a531, rnd.realInRange(0.15, 0.4));
      g.strokeEllipse(x, y, r * 2, r * 2 * squash);
      if (i % 4 === 0) {
        g.fillStyle(0xf5d576, 0.3);
        g.fillEllipse(x, y, r * 2, r * 2 * squash);
      }
    }
    ctr.add(g);
    scene.tweens.add({ targets: g, alpha: { from: 0.6, to: 1 }, duration: 2300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  },

  magma: (scene, ctr, w, h) => {
    base(scene, ctr, w, h, 0x180602, 0xff5a1e);
    const rnd = new Phaser.Math.RandomDataGenerator(['magma-bg']);
    const g = scene.add.graphics();
    // Lava seams snaking up from the bottom, plus heat motes.
    for (let i = 0; i < 6; i++) {
      let x = rnd.integerInRange(20, w - 20);
      let y = h;
      g.lineStyle(rnd.realInRange(1.5, 3), rnd.pick([0xff5a1e, 0xff8a3d]), rnd.realInRange(0.25, 0.5));
      for (let s = 0; s < 6; s++) {
        const nx = x + rnd.integerInRange(-24, 24);
        const ny = y - rnd.integerInRange(20, 50);
        g.lineBetween(x, y, nx, ny);
        x = nx; y = ny;
        if (y < 40) break;
      }
    }
    for (let i = 0; i < 24; i++) {
      g.fillStyle(rnd.pick([0xff5a1e, 0xffb347]), rnd.realInRange(0.1, 0.3));
      g.fillCircle(rnd.integerInRange(0, w), rnd.integerInRange(0, h), rnd.realInRange(1, 3.5));
    }
    ctr.add(g);
    scene.tweens.add({ targets: g, alpha: { from: 0.65, to: 1 }, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  },

  radiation: (scene, ctr, w, h) => {
    base(scene, ctr, w, h, 0x0a1404, 0x7cff3d);
    const rnd = new Phaser.Math.RandomDataGenerator(['radiation-bg']);
    const g = scene.add.graphics();
    // Trefoil ghosts and a green haze of particles.
    for (let i = 0; i < 3; i++) {
      const x = rnd.integerInRange(60, w - 60);
      const y = rnd.integerInRange(60, h - 60);
      const r = rnd.integerInRange(14, 26);
      for (let k = 0; k < 3; k++) {
        const a0 = -Math.PI / 2 + (k * Math.PI * 2) / 3 - 0.5;
        g.fillStyle(0x7cff3d, 0.12);
        g.slice(x, y, r, a0, a0 + 1, false);
        g.fillPath();
      }
      g.fillStyle(0x7cff3d, 0.16);
      g.fillCircle(x, y, r * 0.25);
    }
    for (let i = 0; i < 30; i++) {
      g.fillStyle(0x7cff3d, rnd.realInRange(0.05, 0.18));
      g.fillCircle(rnd.integerInRange(0, w), rnd.integerInRange(0, h), rnd.realInRange(0.8, 2.5));
    }
    ctr.add(g);
    scene.tweens.add({ targets: g, alpha: { from: 0.5, to: 1 }, duration: 2000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  },

  depths: (scene, ctr, w, h) => {
    base(scene, ctr, w, h, 0x02101a, 0x0e8f9c);
    const rnd = new Phaser.Math.RandomDataGenerator(['depths-bg']);
    const g = scene.add.graphics();
    // Sinking light shafts and a few lure-lights in the dark.
    for (let i = 0; i < 4; i++) {
      const x = rnd.integerInRange(40, w - 40);
      g.fillStyle(0x0e8f9c, 0.05);
      g.fillTriangle(x - 8, 0, x + 8, 0, x + rnd.integerInRange(-30, 30), h * 0.7);
    }
    for (let i = 0; i < 6; i++) {
      const x = rnd.integerInRange(20, w - 20);
      const y = rnd.integerInRange(h * 0.4, h - 20);
      g.fillStyle(0xbdf3ff, rnd.realInRange(0.25, 0.5));
      g.fillCircle(x, y, 2.2);
      g.fillStyle(0x0e8f9c, 0.12);
      g.fillCircle(x, y, 8);
    }
    // Rising bubbles.
    for (let i = 0; i < 16; i++) {
      g.lineStyle(0.8, 0x9adfe8, rnd.realInRange(0.1, 0.25));
      g.strokeCircle(rnd.integerInRange(0, w), rnd.integerInRange(0, h), rnd.realInRange(1.5, 4));
    }
    ctr.add(g);
    scene.tweens.add({ targets: g, alpha: { from: 0.55, to: 0.9 }, duration: 3400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  },

  gum: (scene, ctr, w, h) => {
    base(scene, ctr, w, h, 0x081404, 0x46b93f);
    const rnd = new Phaser.Math.RandomDataGenerator(['gum-bg']);
    const g = scene.add.graphics();
    // Slime drips from the ceiling and puddles below.
    for (let i = 0; i < 8; i++) {
      const x = rnd.integerInRange(20, w - 20);
      const len = rnd.integerInRange(20, 70);
      g.fillStyle(0x46b93f, rnd.realInRange(0.15, 0.3));
      g.fillTriangle(x - 5, 0, x + 5, 0, x, len);
      g.fillCircle(x, len, 4);
    }
    for (let i = 0; i < 6; i++) {
      const x = rnd.integerInRange(30, w - 30);
      const y = rnd.integerInRange(h * 0.6, h - 12);
      g.fillStyle(0x46b93f, rnd.realInRange(0.12, 0.22));
      g.fillEllipse(x, y, rnd.integerInRange(24, 60), rnd.integerInRange(8, 14));
    }
    ctr.add(g);
    scene.tweens.add({ targets: g, alpha: { from: 0.6, to: 0.95 }, duration: 2700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  },
};

// ── Public API ─────────────────────────────────────────────────────

export function drawCampaignBackground(
  scene: Phaser.Scene,
  worldId: string,
  width: number,
  height: number,
): Phaser.GameObjects.Container {
  const container = scene.add.container(0, 0);
  const theme = THEMES[worldId] ?? THEMES['fire'];
  theme(scene, container, width, height);
  return container;
}

export function drawWorldMapBackground(
  scene: Phaser.Scene,
  width: number,
  height: number,
): Phaser.GameObjects.Container {
  const container = scene.add.container(0, 0);

  // Base fill + concentric center glow
  const g = scene.add.graphics();
  g.fillStyle(0x080812, 1);
  g.fillRect(0, 0, width, height);
  g.fillStyle(0x1a1a44, 0.08);
  g.fillCircle(width / 2, height / 2, Math.max(width, height) * 0.7);
  g.fillStyle(0x222255, 0.06);
  g.fillCircle(width / 2, height / 2, Math.max(width, height) * 0.45);
  container.add(g);

  // Scatter small motif dots near each world's map position
  const motifG = scene.add.graphics();
  for (const world of WORLDS) {
    const rnd = new Phaser.Math.RandomDataGenerator([world.id + '-map']);
    for (let i = 0; i < 3; i++) {
      const mx = Math.max(8, Math.min(width - 8, world.mapX + rnd.integerInRange(-100, 100)));
      const my = Math.max(8, Math.min(height - 8, world.mapY + rnd.integerInRange(-80, 80)));
      motifG.fillStyle(world.color, rnd.realInRange(0.05, 0.14));
      motifG.fillCircle(mx, my, rnd.realInRange(3, 10));
    }
  }
  container.add(motifG);

  scene.tweens.add({ targets: motifG, alpha: { from: 0.6, to: 1 }, duration: 5000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

  return container;
}

export function drawAbstractWorldMapBackground(
  scene: Phaser.Scene,
  width: number,
  height: number,
): Phaser.GameObjects.Container {
  const container = scene.add.container(0, 0);

  const g = scene.add.graphics();
  g.fillStyle(0x100820, 1);
  g.fillRect(0, 0, width, height);
  g.fillStyle(0x2a1a55, 0.1);
  g.fillCircle(width / 2, height / 2, Math.max(width, height) * 0.7);
  g.fillStyle(0x3a1a66, 0.07);
  g.fillCircle(width / 2, height / 2, Math.max(width, height) * 0.45);
  container.add(g);

  const motifG = scene.add.graphics();
  for (const world of ABSTRACT_WORLDS) {
    const rnd = new Phaser.Math.RandomDataGenerator([world.id + '-abstract-map']);
    for (let i = 0; i < 3; i++) {
      const mx = Math.max(8, Math.min(width - 8, world.mapX + rnd.integerInRange(-100, 100)));
      const my = Math.max(8, Math.min(height - 8, world.mapY + rnd.integerInRange(-80, 80)));
      motifG.fillStyle(world.color, rnd.realInRange(0.05, 0.14));
      motifG.fillCircle(mx, my, rnd.realInRange(3, 10));
    }
  }
  container.add(motifG);

  scene.tweens.add({ targets: motifG, alpha: { from: 0.6, to: 1 }, duration: 5000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

  return container;
}

export function drawCorruptWorldMapBackground(
  scene: Phaser.Scene,
  width: number,
  height: number,
): Phaser.GameObjects.Container {
  const container = scene.add.container(0, 0);

  // A darker, sicker sky than the other realms, with a wound of red at the centre.
  const g = scene.add.graphics();
  g.fillStyle(0x120608, 1);
  g.fillRect(0, 0, width, height);
  g.fillStyle(0x521a14, 0.12);
  g.fillCircle(width / 2, height / 2, Math.max(width, height) * 0.7);
  g.fillStyle(0x8a2a20, 0.07);
  g.fillCircle(width / 2, height / 2, Math.max(width, height) * 0.45);
  // The scar itself: a jagged tear of light running behind the world tree.
  const rnd = new Phaser.Math.RandomDataGenerator(['corrupt-map-scar']);
  g.lineStyle(2, 0xc4392c, 0.28);
  let sx = width * 0.1;
  let sy = height * 0.16;
  for (let s = 0; s < 8; s++) {
    const nx = sx + width * 0.11;
    const ny = sy + rnd.integerInRange(-26, 26);
    g.lineBetween(sx, sy, nx, ny);
    sx = nx; sy = ny;
  }
  container.add(g);

  const motifG = scene.add.graphics();
  for (const world of CORRUPT_WORLDS) {
    const wrnd = new Phaser.Math.RandomDataGenerator([world.id + '-corrupt-map']);
    for (let i = 0; i < 3; i++) {
      const mx = Math.max(8, Math.min(width - 8, world.mapX + wrnd.integerInRange(-100, 100)));
      const my = Math.max(8, Math.min(height - 8, world.mapY + wrnd.integerInRange(-80, 80)));
      motifG.fillStyle(world.color, wrnd.realInRange(0.05, 0.14));
      motifG.fillCircle(mx, my, wrnd.realInRange(3, 10));
    }
  }
  container.add(motifG);

  scene.tweens.add({ targets: motifG, alpha: { from: 0.6, to: 1 }, duration: 5000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

  return container;
}
