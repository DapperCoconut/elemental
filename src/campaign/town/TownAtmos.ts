import Phaser from 'phaser';
import { TownTheme } from './TownTheme';

/**
 * Weather and colour grade for a town — screen-space, so it costs the same whatever the
 * town's size. Particles are anchored to the world by shifting them against camera motion
 * each frame, so embers drift past as you walk rather than sticking to the glass.
 */

interface P { x: number; y: number; vx: number; vy: number; life: number; size: number; ph: number }

export const Z_WEATHER = 9000;
export const Z_GRADE = 9500;

export class TownAtmos {
  private g: Phaser.GameObjects.Graphics;
  private ps: P[] = [];
  private lastX = 0;
  private lastY = 0;
  private t = 0;
  private readonly W: number;
  private readonly H: number;

  constructor(private scene: Phaser.Scene, private th: TownTheme) {
    this.W = scene.scale.width;
    this.H = scene.scale.height;
    this.g = scene.add.graphics().setScrollFactor(0).setDepth(Z_WEATHER);
    for (let i = 0; i < th.particleCount; i++) this.ps.push(this.spawn(true));
    this.lastX = scene.cameras.main.scrollX;
    this.lastY = scene.cameras.main.scrollY;

    // Colour grade + vignette, drawn once.
    const grade = scene.add.graphics().setScrollFactor(0).setDepth(Z_GRADE);
    grade.fillStyle(th.tint, th.tintAlpha);
    grade.fillRect(0, 0, this.W, this.H);
    const steps = 16;
    for (let i = 0; i < steps; i++) {
      const k = i / steps;
      grade.lineStyle(this.W * 0.03, 0x000000, th.vignette * 0.09 * (1 - k) * (1 - k));
      const inset = i * this.W * 0.014;
      grade.strokeRect(inset, inset * 0.67, this.W - inset * 2, this.H - inset * 1.34);
    }
  }

  private spawn(anywhere: boolean): P {
    const k = this.th.particle;
    const r = Math.random;
    const p: P = {
      x: r() * this.W, y: anywhere ? r() * this.H : -10,
      vx: 0, vy: 0, life: 1, size: 1 + r() * 2, ph: r() * 10,
    };
    switch (k) {
      case 'ember': case 'spark': p.vx = (r() - 0.5) * 20; p.vy = -20 - r() * 40; if (!anywhere) p.y = this.H + 10; break;
      case 'rain': p.vx = -60; p.vy = 420 + r() * 120; break;
      case 'snow': p.vx = (r() - 0.5) * 20; p.vy = 25 + r() * 30; break;
      case 'leaf': case 'petal': case 'feather': case 'paper': p.vx = 20 + r() * 25; p.vy = 18 + r() * 22; break;
      case 'spore': case 'bubble': case 'mote': case 'glyph': case 'note':
        p.vx = (r() - 0.5) * 14; p.vy = -8 - r() * 18; if (!anywhere) p.y = this.H + 10; break;
      case 'ash': case 'dust': p.vx = 25 + r() * 35; p.vy = 6 + r() * 14; break;
    }
    return p;
  }

  update(dtMs: number): void {
    const dt = dtMs / 1000;
    this.t += dt;
    const cam = this.scene.cameras.main;
    const dx = cam.scrollX - this.lastX, dy = cam.scrollY - this.lastY;
    this.lastX = cam.scrollX; this.lastY = cam.scrollY;
    const g = this.g;
    g.clear();
    const k = this.th.particle;
    const c = this.th.particleColor;
    const W = this.W, H = this.H;
    for (let i = 0; i < this.ps.length; i++) {
      const p = this.ps[i];
      p.x += p.vx * dt - dx;
      p.y += p.vy * dt - dy;
      if (k === 'leaf' || k === 'petal' || k === 'feather' || k === 'paper' || k === 'snow') p.x += Math.sin(this.t * 2 + p.ph) * 0.5;
      if (p.x < -30) p.x += W + 60; else if (p.x > W + 30) p.x -= W + 60;
      if (p.y < -30) p.y += H + 60; else if (p.y > H + 30) p.y -= H + 60;
      const tw = 0.6 + 0.4 * Math.sin(this.t * 3 + p.ph);
      switch (k) {
        case 'ember':
          g.fillStyle(c, 0.12 * tw); g.fillCircle(p.x, p.y, p.size * 3);
          g.fillStyle(0xffe070, 0.85 * tw); g.fillCircle(p.x, p.y, p.size * 0.8);
          break;
        case 'spark':
          g.fillStyle(c, 0.9 * tw); g.fillRect(p.x - p.size, p.y - 0.5, p.size * 2, 1); g.fillRect(p.x - 0.5, p.y - p.size, 1, p.size * 2);
          break;
        case 'rain':
          g.lineStyle(1, c, 0.45); g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x - 2, p.y + 12); g.strokePath();
          break;
        case 'snow':
          g.fillStyle(c, 0.85); g.fillCircle(p.x, p.y, p.size);
          break;
        case 'leaf': case 'petal': {
          const a = this.t * 2 + p.ph;
          g.fillStyle(c, 0.85);
          g.fillEllipse(p.x, p.y, 5 + Math.sin(a) * 2, 3);
          break;
        }
        case 'feather':
          g.lineStyle(1.5, c, 0.7); g.beginPath(); g.moveTo(p.x - 4, p.y + Math.sin(this.t * 2 + p.ph) * 2); g.lineTo(p.x + 4, p.y - 2); g.strokePath();
          break;
        case 'paper': {
          const sx = Math.abs(Math.sin(this.t * 2 + p.ph)) * 5 + 1;
          g.fillStyle(c, 0.85); g.fillRect(p.x - sx / 2, p.y - 3, sx, 6);
          break;
        }
        case 'spore':
          g.fillStyle(c, 0.15 * tw); g.fillCircle(p.x, p.y, p.size * 2.5);
          g.fillStyle(c, 0.7 * tw); g.fillCircle(p.x, p.y, p.size * 0.8);
          break;
        case 'bubble':
          g.lineStyle(1, c, 0.6); g.strokeCircle(p.x, p.y, p.size * 1.6);
          g.fillStyle(0xffffff, 0.5); g.fillCircle(p.x - p.size * 0.5, p.y - p.size * 0.5, 0.8);
          break;
        case 'mote':
          g.fillStyle(c, 0.12 * tw); g.fillCircle(p.x, p.y, p.size * 3.5);
          g.fillStyle(c, 0.8 * tw); g.fillCircle(p.x, p.y, p.size * 0.7);
          break;
        case 'glyph':
          g.lineStyle(1, c, 0.6 * tw);
          g.beginPath(); g.moveTo(p.x, p.y - 4); g.lineTo(p.x + 3, p.y); g.lineTo(p.x, p.y + 4); g.lineTo(p.x - 3, p.y); g.closePath(); g.strokePath();
          break;
        case 'note':
          g.fillStyle(c, 0.7 * tw); g.fillEllipse(p.x, p.y, 5, 4);
          g.lineStyle(1.2, c, 0.7 * tw); g.beginPath(); g.moveTo(p.x + 2.2, p.y); g.lineTo(p.x + 2.2, p.y - 9); g.lineTo(p.x + 6, p.y - 7); g.strokePath();
          break;
        case 'ash':
          g.fillStyle(c, 0.6); g.fillRect(p.x, p.y, p.size * 1.4, p.size);
          break;
        case 'dust':
          g.fillStyle(c, 0.35 * tw); g.fillCircle(p.x, p.y, p.size * 0.8);
          break;
      }
    }
  }
}
