import Phaser from 'phaser';
import { WORLDS } from '../data/Worlds';
import { ABSTRACT_WORLDS } from '../data/AbstractWorlds';

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

  quantum: (scene, ctr, w, h) => {
    base(scene, ctr, w, h, 0x08041a, 0xaa44ff);
    const rnd = new Phaser.Math.RandomDataGenerator(['quantum-bg']);
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
